#!/usr/bin/env python
"""PreToolUse(Bash) gate — run the Spec-31 Phase-F (F5) cheat/coverage gates on `git commit`.

Why this hook exists (Spec 31 §12.2.5 MF-5 + the F4 design §3 hand-off, STOP-6):
the F5 gates guard CSS-ROUTING code, which is pure Python and needs no `npm build`
— so the `package.json prebuild`/`prestart` gates NEVER fire for a Python-only
change, and there is no CI here. A gate that exists but isn't wired to something
that runs protects nothing. This hook closes that bypass: on a `git commit`, it
runs each F5 gate in `--check` (baseline-aware) mode and DENIES the commit if any
reports a NEW violation not in its committed baseline. Baselined legacy violations
pass — only a regression blocks.

Gates run (all fast, static, ~2s combined; no pytest/oracle here — those stay in
prebuild):
  - cheat-gate/run.py            (Spec 31 §7a — converter cheats)
  - excluded-gate/run.py         (F4 §3 — in-code CSS-property drops)
  - ledger/coverage_check.py     (Spec 31 §12.2.1 — UNACCOUNTED coverage join)
  - db-consistency/run.py        (Spec 31 §12.4 — DB-as-code consistency)

Bypass: add a `[gates-ok:<reason>]` token to the commit message for a deliberate
override (mirrors the path-scope guard's `[batch-ok:...]` convention). Use sparingly.

FAIL-OPEN on any wrapper error (missing python, unreadable payload, gate crash):
a commit gate must never wedge the session on its OWN bug. A genuine gate failure
(exit code from the gate itself) is FAIL-CLOSED (deny) — that is the whole point.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

# Repo root = .claude/hooks/f5-commit-gate.py → parents[2]
_REPO = Path(__file__).resolve().parents[2]
_SCRIPTS = _REPO / "plugins" / "sgs-blocks" / "scripts"

# (label, path-relative-to-scripts) — order = report order.
_GATES = [
    ("anti-cheat (Spec 31 §7a)", "cheat-gate/run.py"),
    ("excluded-property drops (F4 §3)", "excluded-gate/run.py"),
    ("coverage / no-silent-drop (§12.2.1)", "ledger/coverage_check.py"),
    ("DB-as-code consistency (§12.4)", "db-consistency/run.py"),
]


def _deny(reason: str) -> int:
    out = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }
    print(json.dumps(out))
    return 0


def main() -> int:
    try:
        raw = sys.stdin.read()
        data = json.loads(raw) if raw.strip() else {}
    except Exception:
        return 0  # fail-open

    if data.get("tool_name") != "Bash":
        return 0
    cmd = (data.get("tool_input") or {}).get("command", "")
    if not isinstance(cmd, str) or not cmd:
        return 0

    # Only an actual `git commit` (not commit-tree / log / etc.).
    if not re.search(r"\bgit\s+commit\b", cmd):
        return 0
    # `--amend` is a distinct, usually-intentional op — don't gate it (avoid friction).
    if re.search(r"\bgit\s+commit\b[^\n]*--amend\b", cmd):
        return 0
    # Conscious bypass.
    if "[gates-ok" in cmd:
        return 0

    # Run each gate's --check. Collect failures (non-zero = NEW violation).
    failures: list[str] = []
    for label, rel in _GATES:
        script = _SCRIPTS / rel
        if not script.exists():
            # Gate not present (e.g. a fresh checkout missing a module) → skip,
            # don't wedge the commit on a missing optional gate.
            continue
        try:
            proc = subprocess.run(
                [sys.executable, str(script), "--check"],
                capture_output=True,
                text=True,
                timeout=90,
                cwd=str(_SCRIPTS),
            )
        except Exception:
            # Gate crashed/timed out → fail-open for THIS gate (wrapper safety),
            # but note it so the reason is honest.
            failures.append(f"  • {label}: gate could not run (skipped — re-run manually)")
            continue
        if proc.returncode != 0:
            tail = (proc.stdout or "").strip().splitlines()
            snippet = tail[-1] if tail else "(see `python plugins/sgs-blocks/scripts/" + rel + " --report`)"
            failures.append(f"  • {label}: NEW violation — {snippet}")

    # Only DENY when a gate reported an actual NEW violation (returncode != 0).
    real_blocks = [f for f in failures if "could not run" not in f]
    if real_blocks:
        reason = (
            "Spec-31 F5 commit gate: a CSS-transfer quality gate found a NEW violation "
            "not in its baseline. The cloning pipeline guards (cheats / silent CSS drops / "
            "DB consistency) are pure-Python, so `npm build` never runs them — this commit-time "
            "gate is the only thing that catches a regression.\n\n"
            + "\n".join(failures)
            + "\n\nFix the violation (run the named gate with `--report` for detail), OR if it is "
            "genuinely intended, run that gate's `--update-baseline` after understanding each finding. "
            "To bypass this gate for a deliberate commit, add a `[gates-ok:<reason>]` token to the "
            "commit message."
        )
        return _deny(reason)

    return 0  # all gates green (or only fail-open skips) → allow


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)  # fail-open
