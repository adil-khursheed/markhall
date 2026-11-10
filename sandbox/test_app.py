import os
import unittest

import app


def run(script, timeout=10, rules=None):
    return app.run_script(script, timeout, rules)


class MathTests(unittest.TestCase):
    def test_algebra_returns_latex_and_num(self):
        result = run(
            "x = symbols('x')\n"
            "expanded = expand((x + 2) ** 2)\n"
            "answer(expanded=expanded, at_two=expanded.subs(x, 2))"
        )
        self.assertTrue(result["ok"], result["stderr"])
        self.assertEqual(result["values"]["expanded"]["latex"], "x^{2} + 4 x + 4")
        self.assertIsNone(result["values"]["expanded"]["num"])
        self.assertEqual(result["values"]["at_two"]["num"], 16.0)

    def test_equation_roots_are_unique_and_sorted(self):
        result = run(
            "x = symbols('x')\n"
            "roots = roots_of((x - 3) * (x + 1) ** 2, x)\n"
            "print(json.dumps({'roots': [num(r) for r in roots], 'count': len(roots)}))"
        )
        self.assertTrue(result["ok"], result["stderr"])
        self.assertEqual(result["values"], {"roots": [-1, 3], "count": 2})

    def test_numerical_tolerance(self):
        result = run(
            "print(json.dumps({'close': approx(Rational(1, 3), 0.3333334, 1e-6),"
            " 'far': approx(Rational(1, 3), 0.34, 1e-6)}))"
        )
        self.assertTrue(result["ok"], result["stderr"])
        self.assertEqual(result["values"], {"close": True, "far": False})

    def test_normalise_devanagari_and_indian_grouping(self):
        result = run(
            "print(normalize('१२३४५ and 1,23,456 and Rs 12,345 and (1, 2)'))"
        )
        self.assertTrue(result["ok"], result["stderr"])
        self.assertEqual(result["stdout"].strip(), "12345 and 123456 and Rs 12345 and (1, 2)")

    def test_board_rules_set_pi_and_rounding(self):
        exact = run("print(str(PI))")
        self.assertEqual(exact["stdout"].strip(), "pi")

        boarded = run("print(str(PI))\nprint(ROUNDING)", rules={"pi": "22/7", "rounding": 3})
        self.assertEqual(boarded["stdout"].split(), ["22/7", "3"])


class IsolationTests(unittest.TestCase):
    def test_timeout_is_killed_and_reported(self):
        result = run("import time\ntime.sleep(3)", timeout=0.5)
        self.assertFalse(result["ok"])
        self.assertTrue(result["timedOut"])
        self.assertEqual(result["exitCode"], 124)

    def test_memory_allocation_is_contained(self):
        result = run("data = bytearray(900 * 1024 * 1024)\nprint('allocated')", timeout=5)
        self.assertFalse(result["ok"])
        self.assertNotIn("allocated", result["stdout"])

    def test_limits_are_applied(self):
        result = run(
            "import resource\n"
            "print(json.dumps({\n"
            "  'as': resource.getrlimit(resource.RLIMIT_AS)[0],\n"
            "  'fsize': resource.getrlimit(resource.RLIMIT_FSIZE)[0],\n"
            "  'nproc': resource.getrlimit(resource.RLIMIT_NPROC)[0],\n"
            "}))"
        )
        self.assertTrue(result["ok"], result["stderr"])
        self.assertEqual(result["values"]["as"], app.MEMORY_MB * 1024 * 1024)
        self.assertEqual(result["values"]["fsize"], 0)
        self.assertEqual(result["values"]["nproc"], 8)

    def test_filesystem_write_is_blocked(self):
        result = run("f = open('/tmp/x', 'w')\nf.write('data')\nf.flush()")
        self.assertFalse(result["ok"])

    @unittest.skipUnless(os.environ.get("SANDBOX_TEST_ISOLATED") == "1", "needs the isolated container")
    def test_network_is_blocked(self):
        result = run("import urllib.request\nurllib.request.urlopen('http://1.1.1.1', timeout=2)", timeout=5)
        self.assertFalse(result["ok"])


class ProtocolTests(unittest.TestCase):
    def test_non_json_stdout_is_reported(self):
        result = run("print('not json')")
        self.assertTrue(result["ok"])
        self.assertIsNone(result["values"])
        self.assertIn("JSON", result["error"])

    def test_empty_stdout_is_reported(self):
        result = run("x = 1")
        self.assertTrue(result["ok"])
        self.assertIsNone(result["values"])
        self.assertEqual(result["error"], "stdout is empty")

    def test_failed_process_is_not_ok(self):
        result = run("raise ValueError('boom')")
        self.assertFalse(result["ok"])
        self.assertNotEqual(result["exitCode"], 0)
        self.assertIn("ValueError", result["stderr"])


class LimitTests(unittest.TestCase):
    def test_rate_limit_counts_per_user(self):
        original = app.RATE_LIMIT
        app.RATE_LIMIT = 2
        app.rate_windows.clear()
        try:
            self.assertTrue(app.allow_rate("a"))
            self.assertTrue(app.allow_rate("a"))
            self.assertFalse(app.allow_rate("a"))
            self.assertTrue(app.allow_rate("b"))
        finally:
            app.RATE_LIMIT = original
            app.rate_windows.clear()

    def test_queue_rejects_when_full(self):
        acquired = 0
        try:
            while app.slots.acquire(blocking=False):
                acquired += 1
            self.assertEqual(acquired, app.WORKERS + app.QUEUE_LIMIT)
        finally:
            for _ in range(acquired):
                app.slots.release()


if __name__ == "__main__":
    unittest.main()
