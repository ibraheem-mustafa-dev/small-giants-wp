#!/usr/bin/env python
"""PreToolUse(Bash) gate — run lint-spec-drift.py --check on `git commit`.

Why this hook exists (P3proj 2026-07-17, setup-simplification plan §3.6 +
sign-off decision 4):
lint-spec-drift.py checks that the specs describe things that actually EXIST
(for a non-coder owner the specs ARE the system; a claim in a doc is a
hypothesis — R-31-6/R-31-11 — and this gate applies that rule to the specs).
Today it runs ONLY at build time (`package.json` postbuild, `--ghost-only`). A
docs/spec edit that ships without an `npm build` never triggers it — the exact
"a gate that only runs when a build runs protects nothing" gap that f5 was
built to close for the converter. This hook closes it for spec drift: on a
`git commit`, it runs the FULL `--check` and DENIES the commit if lint-spec-
drift reports NEW gating drift (a spec citing a deleted `src/blocks/<x>/`, a
missing `Sgs_<Class>`, or a ghost `build/blocks/<x>/`).

Baseline is CLEAN (measured 2026-07-17: `--check` exit 0, 0 gating findings),
so an absolute check == "new-violations-only" BY CONSTRUCTION — a non-zero exit
IS a regression. Gating drift must be FIXED, never baselined (unlike CSS), so
zero-tolerance is correct here. BLOCK-SLUG findings are advisory and already
excluded from `--check`'s exit code by the tool, so they never block.

Bypass: add `[gates-ok:<reason>]` to the commit message (mirrors f5).
FAIL-OPEN on any wrapper error (python/script missing, gate crash) — a commit
gate must never wedge the session on its OWN bug. A genuine drift finding (the
tool's own exit 1) is FAIL-CLOSED (deny) — that is the whole point.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

# Repo root = .claude/hooks/spec-drift-commit-gate.py -> parents[2]
_REPO = Path(__file__).resolve().parents[2]
_LINT = _REPO / "plugins" / "sgs-blocks" / "scripts" / "lints" / "lint-spec-drift.py"

# Match `git commit` even with global flags between `git` and `commit`
# (identical to f5-commit-gate.py so the two gates recognise commits the same way).
_GIT_COMMIT = re.compile(
    r"\bgit\b(?:\s+(?:-C\s+\S+|--git-dir(?:=\S+|\s+\S+)|--work-tree(?:=\S+|\s+\S+)"
    r"|-c\s+\S+|--no-pager|--paginate|--no-replace-objects|--literal-pathspecs))*"
    r"\s+commit\b"
)


def _is_gated_commit(cmd: str) -> bool:
    """True iff this Bash command is a `git commit` the gate should run on."""
    if not _GIT_COMMIT.search(cmd):
        return False
    if re.search(r"--amend\b", cmd):
        return False
    if re.search(r"\[gates-ok:[^\]]+\]", cmd):
        return False
    return True


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


def _run_lint() -> tuple[int, str]:
    """Run lint-spec-drift.py --check. Returns (returncode, stdout_tail).
    returncode -1 signals a WRAPPER failure (fail-open), distinct from the tool's
    own 0 (clean) / 1 (drift)."""
    if not _LINT.exists():
        return -1, "lint-spec-drift.py not found"
    try:
        proc = subprocess.run(
            [sys.executable, str(_LINT), "--check"],
            capture_output=True,
            text=True,
            timeout=45,
            cwd=str(_REPO),
        )
    except Exception as exc:
        return -1, f"lint-spec-drift could not run: {exc}"
    return proc.returncode, (proc.stdout or "")


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
    if not _is_gated_commit(cmd):
        return 0

    rc, out = _run_lint()

    # Wrapper failure (tool missing / crash) -> FAIL-OPEN, but make it visible.
    if rc < 0:
        print(
            "[spec-drift-commit-gate] WARNING: could not run lint-spec-drift "
            "(allowed, but re-run manually): " + out,
            file=sys.stderr,
        )
        return 0

    # Genuine NEW gating drift -> FAIL-CLOSED.
    if rc != 0:
        # Surface the gating findings (the tool prints them; keep the tail legible).
        lines = [ln for ln in out.splitlines() if ln.strip()]
        tail = "\n".join(lines[-15:]) if lines else "(run `python plugins/sgs-blocks/scripts/lints/lint-spec-drift.py --check` for detail)"
        return _deny(
            "Spec-drift commit gate: the specs describe something that no longer "
            "EXISTS (a spec citing a deleted src/blocks/<x>/, a missing Sgs_<Class>, "
            "or a ghost build/blocks/<x>/). For a non-coder owner the specs ARE the "
            "system, so a drifted spec is a real defect. The baseline is clean, so "
            "this is a NEW regression, not legacy debt.\n\n"
            + tail
            + "\n\nFix the spec (or the code it describes), OR add `[gates-ok:<reason>]` "
            "to the commit message to bypass deliberately. Full detail: "
            "`python plugins/sgs-blocks/scripts/lints/lint-spec-drift.py --check`."
        )

    return 0  # clean -> allow


def _self_test() -> int:
    """Enforcement-Contract self-test. Exits 0 on all pass, 1 with reasons."""
    failures: list[str] = []

    # T1: git-commit recognition; --amend + [gates-ok:] honoured.
    if (_is_gated_commit("git commit -m 'x'")
            and not _is_gated_commit("git commit --amend")
            and not _is_gated_commit("git commit -m '[gates-ok:x]'")
            and not _is_gated_commit("git status")):
        print("T1 PASS: git-commit recognised; --amend + [gates-ok:] + non-commit honoured")
    else:
        failures.append("T1 FAIL: _is_gated_commit recognition wrong")

    # T2: the wrapped tool exists where expected (detectable-when-broken).
    if _LINT.exists():
        print(f"T2 PASS: lint-spec-drift.py present at {_LINT.name}")
    else:
        failures.append(f"T2 FAIL: lint-spec-drift.py missing at {_LINT}")

    # T3: on the CURRENT tree the tool runs and the gate would ALLOW (clean baseline).
    rc, _out = _run_lint()
    if rc == 0:
        print("T3 PASS: current tree is clean -> gate allows (no false-positive block)")
    elif rc < 0:
        failures.append("T3 FAIL: lint-spec-drift could not run (wrapper error)")
    else:
        # Not a self-test failure of THIS gate, but surface it: the tree has drift.
        print("T3 NOTE: current tree has gating drift (gate would DENY a commit) - "
              "this gate is working; fix the drift.")

    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    print("\nAll spec-drift-commit-gate self-tests passed.")
    return 0


if __name__ == "__main__" and "--self-test" in sys.argv:
    sys.exit(_self_test())
elif __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)  # fail-open
