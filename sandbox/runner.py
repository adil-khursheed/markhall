"""Execute one untrusted script with the Markhall helpers in scope."""

import json
import sys

import helpers

rules = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
script = sys.stdin.read()
exec(compile(script, "<script>", "exec"), helpers.namespace(rules))
