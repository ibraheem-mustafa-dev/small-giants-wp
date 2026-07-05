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
    ("content-gap visibility (stage-3 §4)", "ledger/content_gap_check.py"),
    # ledger/content_coverage_check.py REMOVED from this list (D277 QC, 2026-07-05):
    # its bare `--check` has no --draft/--markup target and fail-safes GREEN, so at
    # commit time it was a no-op green light (STOP-6 — worse than no light). The
    # REAL content-conservation check runs on EVERY clone (draft vs the LIVE page
    # source) and re-baselines there; that is the enforcement point.
    ("DB-as-code consistency (§12.4)", "db-consistency/run.py"),
    # Modular-rebuild scaffold anti-cheat gates (design §4.1 / A7, D242).
    ("converter carve-out (no-slug-literal §4.1)", "converter/gates/no_slug_literal.py"),
    ("converter frozen-engine import-ban (§4.1)", "converter/gates/import_ban.py"),
    ("converter raw-sqlite accessor-layer ban (FR-31-8, D278)", "converter/gates/check_raw_sqlite.py"),
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


# Match `git commit` even with global flags between `git` and `commit`
# (e.g. `git -C <path> commit`, `git --no-pager commit`, `git -c k=v commit`).
# A bare `\bgit\s+commit\b` missed all of those, letting a commit slip ungated.
_GIT_COMMIT = re.compile(
    r"\bgit\b(?:\s+(?:-C\s+\S+|--git-dir(?:=\S+|\s+\S+)|--work-tree(?:=\S+|\s+\S+)"
    r"|-c\s+\S+|--no-pager|--paginate|--no-replace-objects|--literal-pathspecs))*"
    r"\s+commit\b"
)


def _is_gated_commit(cmd: str) -> bool:
    """True iff this Bash command is a `git commit` the gate should run on."""
    if not _GIT_COMMIT.search(cmd):
        return False
    # `--amend` is a distinct, usually-intentional op — don't gate it (avoid friction).
    if re.search(r"--amend\b", cmd):
        return False
    # Conscious bypass — REQUIRES a non-empty reason: `[gates-ok:<reason>]`.
    # A bare `[gates-ok` is rejected (no free pass without a recorded reason).
    if re.search(r"\[gates-ok:[^\]]+\]", cmd):
        return False
    return True


def _run_gates() -> tuple[list[str], int]:
    """Run each present gate's --check.

    Returns (failures, present_count) where present_count is how many gate scripts
    actually existed and were attempted. present_count lets main() distinguish a
    TOTAL harness failure (every present gate crashed — suspicious, fail-closed) from
    an individual gate hiccup (fail-open with a visible warning).
    """
    failures: list[str] = []
    present_count = 0
    for label, rel in _GATES:
        script = _SCRIPTS / rel
        if not script.exists():
            # Gate not present (e.g. a fresh checkout missing a module) → skip,
            # don't wedge the commit on a missing optional gate.
            continue
        present_count += 1
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
    return failures, present_count


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

    failures, present_count = _run_gates()
    real_blocks = [f for f in failures if "could not run" not in f]
    could_not_run = [f for f in failures if "could not run" in f]

    # 1. A gate reported an actual NEW violation (returncode != 0) → DENY.
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

    # 2. Harness-canary: if gates EXIST but EVERY one of them failed to run, that is
    #    a broken harness (python missing, all modules crash, DB lock), not a clean
    #    pass — fail CLOSED so a silently-disabled gate can't wave commits through.
    if present_count > 0 and len(could_not_run) == present_count:
        return _deny(
            "Spec-31 F5 commit gate: the gate HARNESS is broken — every gate failed to "
            "run, so nothing was actually checked. A clean pass cannot be distinguished "
            "from a disabled gate, so the commit is blocked.\n\n"
            + "\n".join(could_not_run)
            + "\n\nFix the harness (run `cd plugins/sgs-blocks/scripts && python cheat-gate/run.py "
            "--check` to see the error), or add `[gates-ok:<reason>]` to bypass deliberately."
        )

    # 3. SOME gates couldn't run (partial) → allow, but make it VISIBLE on stderr so a
    #    degraded gate is never silent (PreToolUse stderr surfaces to the session).
    if could_not_run:
        print(
            "[f5-commit-gate] WARNING: some F5 gates could not run this commit "
            "(allowed, but re-run them manually):\n" + "\n".join(could_not_run),
            file=sys.stderr,
        )

    return 0  # all present gates green (or only partial fail-open skips) → allow


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)  # fail-open
