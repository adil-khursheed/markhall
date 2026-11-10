import json
import math
import os
import resource
import signal
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
RUNNER = os.path.join(HERE, "runner.py")

DEFAULT_TIMEOUT = float(os.environ.get("SANDBOX_DEFAULT_TIMEOUT", "10"))
MAX_TIMEOUT = float(os.environ.get("SANDBOX_MAX_TIMEOUT", "30"))
WORKERS = int(os.environ.get("SANDBOX_WORKERS", "2"))
QUEUE_LIMIT = int(os.environ.get("SANDBOX_QUEUE_LIMIT", "8"))
MEMORY_MB = int(os.environ.get("SANDBOX_MEMORY_MB", "192"))
RATE_LIMIT = int(os.environ.get("SANDBOX_RATE_LIMIT", "60"))
MAX_SCRIPT_BYTES = 64 * 1024
MAX_OUTPUT_BYTES = 64 * 1024

pool = ThreadPoolExecutor(max_workers=WORKERS)
slots = threading.BoundedSemaphore(WORKERS + QUEUE_LIMIT)

rate_lock = threading.Lock()
rate_windows = {}


def allow_rate(user):
    now = time.monotonic()
    with rate_lock:
        if len(rate_windows) > 10_000:
            for key, (start, _) in list(rate_windows.items()):
                if now - start >= 60:
                    del rate_windows[key]
        start, count = rate_windows.get(user, (now, 0))
        if now - start >= 60:
            start, count = now, 0
        rate_windows[user] = (start, count + 1)
        return count < RATE_LIMIT


def _limits(cpu_seconds):
    # Applied in the forked child before exec, so the untrusted script inherits them.
    memory = MEMORY_MB * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds + 1))
    resource.setrlimit(resource.RLIMIT_AS, (memory, memory))
    resource.setrlimit(resource.RLIMIT_FSIZE, (0, 0))
    resource.setrlimit(resource.RLIMIT_NPROC, (8, 8))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(resource.RLIMIT_NOFILE, (32, 32))


def parse_values(stdout):
    for line in reversed(stdout.strip().splitlines()):
        line = line.strip()
        if not line:
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError:
            return None, "stdout does not end with a JSON object"
        return (value, None) if isinstance(value, dict) else (None, "output is not a JSON object")
    return None, "stdout is empty"


def run_script(script, timeout=DEFAULT_TIMEOUT, rules=None):
    cpu_seconds = max(1, math.ceil(timeout))
    process = subprocess.Popen(
        [sys.executable, '-E', '-s', RUNNER, json.dumps(rules or {})],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env={
            "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"),
            "PYTHONDONTWRITEBYTECODE": "1",
            "PYTHONUNBUFFERED": "1",
        },
        cwd="/tmp",
        start_new_session=True,
        preexec_fn=lambda: _limits(cpu_seconds),
    )

    timed_out = False
    try:
        stdout, stderr = process.communicate(script.encode(), timeout=timeout)
    except subprocess.TimeoutExpired:
        timed_out = True
        os.killpg(process.pid, signal.SIGKILL)
        stdout, stderr = process.communicate()

    code = process.returncode
    if timed_out:
        code = 124
    elif code < 0:
        code = 128 - code

    out = stdout[:MAX_OUTPUT_BYTES].decode(errors="replace")
    err = stderr[:MAX_OUTPUT_BYTES].decode(errors="replace")
    if timed_out:
        err = f"Timed out after {timeout:g}s"

    values, output_error = parse_values(out) if code == 0 else (None, None)
    return {
        "ok": code == 0,
        "stdout": out,
        "stderr": err,
        "exitCode": code,
        "timedOut": timed_out,
        "values": values,
        "error": output_error,
    }


def read_body(handler):
    length = int(handler.headers.get("content-length", "0"))
    if length <= 0:
        return None
    return handler.rfile.read(length)


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self.reply(200, {"ok": True})
            return
        self.reply(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        if self.path != "/runPython":
            self.reply(404, {"ok": False, "error": "not found"})
            return

        raw = read_body(self)
        if raw is None:
            self.reply(400, {"ok": False, "error": "missing body"})
            return
        if len(raw) > MAX_SCRIPT_BYTES + 1024:
            self.reply(413, {"ok": False, "error": "script too large"})
            return

        try:
            request = json.loads(raw)
            script = request["script"]
            if not isinstance(script, str) or not script.strip():
                raise ValueError
        except (ValueError, KeyError, TypeError):
            self.reply(400, {"ok": False, "error": "script must be a non-empty string"})
            return

        timeout = request.get("timeout", DEFAULT_TIMEOUT)
        if not isinstance(timeout, (int, float)) or timeout <= 0:
            self.reply(400, {"ok": False, "error": "timeout must be a positive number of seconds"})
            return
        timeout = min(float(timeout), MAX_TIMEOUT)

        rules = request.get("rules") or {}
        if not isinstance(rules, dict):
            self.reply(400, {"ok": False, "error": "rules must be an object"})
            return

        user = request.get("user") or self.headers.get("x-user-id") or self.client_address[0]
        if not allow_rate(str(user)):
            self.reply(429, {"ok": False, "error": "rate limit exceeded"})
            return
        if not slots.acquire(blocking=False):
            self.reply(429, {"ok": False, "error": "sandbox queue is full"})
            return

        try:
            result = pool.submit(run_script, script, timeout, rules).result()
        except Exception as error:  # pragma: no cover - defensive
            self.reply(500, {"ok": False, "error": str(error)})
            return
        finally:
            slots.release()

        self.reply(200, result)

    def log_message(self, *args):
        pass


class Server(ThreadingHTTPServer):
    daemon_threads = True
    # The listen backlog must absorb the queue limit so bursts get a fast 429
    # instead of a connection reset before the handler runs.
    request_queue_size = 64


def main():
    Server(("0.0.0.0", 8000), Handler).serve_forever()


if __name__ == "__main__":
    main()
