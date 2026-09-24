#!/usr/bin/env python
"""PreToolUse(Bash) — every project commit gate in ONE process.

Each hook used to be its own Python start-up (~135 ms) on EVERY Bash call. This
runner is the only registered entry: it exits at once unless the command is a
`git commit`, then runs each gate's own `main()` in-process against the same
payload. The first gate that denies wins; stderr warnings pass through.

The gates stay separate files with their own `--self-test`s:
  - git-path-scope-guard.py   — a commit must be path-scoped (shared worktree)
  - truncation-commit-gate.py — a commit must not gut a file
  - f5-commit-gate.py         — cloning-pipeline gates, only when pipeline code is staged

`--self-test` proves the runner itself: a plain command runs no gate, an
unscoped commit is denied through the runner, a scoped one is not.
FAIL-OPEN on the runner's own errors, like every gate it wraps.
"""
import importlib.util
import io
import json
import sys
from contextlib import redirect_stdout
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_GATES = ("git-path-scope-guard.py", "truncation-commit-gate.py", "f5-commit-gate.py")


def _load(filename):
    spec = importlib.util.spec_from_file_location(filename[:-3].replace("-", "_"), _HERE / filename)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _run_gate(mod, raw):
    """Run one gate's main() on the payload; return its stdout (a deny JSON or '')."""
    buf = io.StringIO()
    old_stdin = sys.stdin
    sys.stdin = io.StringIO(raw)
    try:
        with redirect_stdout(buf):
            mod.main()
    except SystemExit:
        pass  # a gate that exits after printing keeps what it printed
    except Exception:
        return ""  # a gate's own crash is fail-open, as when it ran alone
    finally:
        sys.stdin = old_stdin
    return buf.getvalue().strip()


def run(raw):
    """The runner's whole decision. Returns the deny JSON string, or '' to allow."""
    try:
        data = json.loads(raw) if raw.strip() else {}
    except Exception:
        return ""
    if data.get("tool_name") != "Bash":
        return ""
    cmd = (data.get("tool_input") or {}).get("command", "")
    f5 = _load("f5-commit-gate.py")
    if not isinstance(cmd, str) or not f5._GIT_COMMIT.search(cmd):
        return ""
    for filename in _GATES:
        mod = f5 if filename == "f5-commit-gate.py" else _load(filename)
        out = _run_gate(mod, raw)
        if '"deny"' in out:
            return out
    return ""


def main():
    out = run(sys.stdin.read())
    if out:
        print(out)
    return 0


def _self_test():
    def payload(cmd):
        return json.dumps({"tool_name": "Bash", "tool_input": {"command": cmd}})

    cases = [
        ("plain command runs no gate", payload("ls -la"), False),
        ("unscoped commit is denied", payload('git commit -m "x"'), True),
        ("unscoped `git -C` commit is denied", payload('git -C . commit -m "x"'), True),
        ("path-scoped commit with nothing staged passes", payload('git commit -m "x" -- nothing.txt'), False),
        ("non-Bash tool is ignored", json.dumps({"tool_name": "Edit", "tool_input": {}}), False),
    ]
    failed = 0
    for name, raw, want_deny in cases:
        got = bool(run(raw))
        ok = got == want_deny
        failed += not ok
        print(f"  {'ok  ' if ok else 'FAIL'} {name}")
    print("SELF-TEST " + ("PASSED" if not failed else f"FAILED ({failed})"))
    return 1 if failed else 0


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(_self_test())
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)
