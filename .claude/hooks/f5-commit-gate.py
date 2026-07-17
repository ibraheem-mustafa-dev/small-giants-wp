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

# ---------------------------------------------------------------------------
# Converter-awareness fold (subsumes the retired qc-on-converter-edit.py stub,
# P3proj 2026-07-17). That stub only WARNED — and it decided whether to warn by
# looking for a `[qc:...]` marker the operator TYPED into the commit message
# (narration, not evidence → failed Enforcement-Contract rule 4). This fold
# replaces it: on a commit that STAGES a change to the cloning-pipeline
# converter/orchestrator surface (read from `git diff --cached` — machine
# evidence), the converter-specific guard scripts MUST be present so they
# actually run. A missing converter guard on a converter-touching commit is
# fail-CLOSED (deny), never a silent per-gate skip.
# ---------------------------------------------------------------------------

# Staged paths containing any of these segments = "this commit touches converter
# code" (forward-slash, repo-relative). Mirrors the old stub's watch set minus
# the two paths that no longer exist (converter_v2/convert.py deleted D276;
# sgs-update.py never created) — sgs-clone-orchestrator.py + the modular engine.
_WATCHED_CONVERTER_SEGMENTS = (
    "plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py",
    "plugins/sgs-blocks/scripts/converter/",
)

# The subset of _GATES that specifically guard converter output. On a
# converter-touching commit, EVERY one of these must be present + run.
_CONVERTER_REQUIRED_GATES = frozenset({
    "cheat-gate/run.py",
    "converter/gates/no_slug_literal.py",
    "converter/gates/import_ban.py",
    "converter/gates/check_raw_sqlite.py",
})


def _filter_converter(staged: list[str]) -> list[str]:
    """Pure predicate: which of `staged` touch the converter surface. Extracted
    so the self-test can exercise it without a live git repo."""
    return [
        p.replace("\\", "/")
        for p in staged
        if any(seg in p.replace("\\", "/") for seg in _WATCHED_CONVERTER_SEGMENTS)
    ]


def _staged_converter_paths() -> list[str]:
    """Staged files touching the converter/orchestrator surface, read from
    `git diff --cached --name-only` (machine evidence). Fail-open (empty list)
    on any git error: the base gates still run; we only skip the EXTRA
    converter-guard-present requirement rather than wedge a commit on git."""
    try:
        proc = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=str(_REPO),
        )
    except Exception:
        return []
    if proc.returncode != 0:
        return []
    staged = [ln.strip() for ln in (proc.stdout or "").splitlines() if ln.strip()]
    return _filter_converter(staged)


def _converter_guard_deny_reason(touched: list[str], missing: list[str]) -> str:
    """Legible deny message for a converter-touching commit whose guards are
    missing (Enforcement-Contract rule 5 — name the fix)."""
    return (
        "Spec-31 F5 commit gate (converter-guard, folds the retired "
        "qc-on-converter-edit stub): this commit STAGES a change to "
        "cloning-pipeline converter/orchestrator code -\n"
        + "\n".join(f"  • {p}" for p in touched)
        + "\n\n...but these converter guard scripts are MISSING, so nothing "
        "checked that change:\n"
        + "\n".join(f"  • plugins/sgs-blocks/scripts/{r}" for r in missing)
        + "\n\nRestore the guard script(s), or add `[gates-ok:<reason>]` to the "
        "commit message to bypass this deliberately."
    )


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


def _run_gates() -> tuple[list[str], int, list[str]]:
    """Run each present gate's --check.

    Returns (failures, present_count, missing) where present_count is how many gate
    scripts actually existed and were attempted, and missing is the rel-paths of gate
    scripts that did NOT exist. present_count lets main() distinguish a TOTAL harness
    failure (every present gate crashed — suspicious, fail-closed) from an individual
    gate hiccup (fail-open with a visible warning); missing lets main() fail-closed
    when a CONVERTER-required guard is absent on a converter-touching commit.
    """
    failures: list[str] = []
    present_count = 0
    missing: list[str] = []
    for label, rel in _GATES:
        script = _SCRIPTS / rel
        if not script.exists():
            # Gate not present (e.g. a fresh checkout missing a module) → skip,
            # don't wedge the commit on a missing optional gate. (A converter-
            # REQUIRED gate missing on a converter-touching commit is handled
            # separately in main() and fails closed.)
            missing.append(rel)
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
    return failures, present_count, missing


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

    failures, present_count, missing = _run_gates()
    real_blocks = [f for f in failures if "could not run" not in f]
    could_not_run = [f for f in failures if "could not run" in f]

    # 0. Converter-guard (folds the retired qc-on-converter-edit stub): if this
    #    commit stages a change to converter/orchestrator code but a converter-
    #    REQUIRED guard is missing, fail CLOSED — the change would ship unchecked.
    #    Read from `git diff --cached` (machine evidence), NOT a typed marker.
    touched = _staged_converter_paths()
    if touched:
        missing_converter = [r for r in missing if r in _CONVERTER_REQUIRED_GATES]
        if missing_converter:
            return _deny(_converter_guard_deny_reason(touched, missing_converter))

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


def _self_test() -> int:
    """Enforcement-Contract self-test for the converter-guard fold.
    Exits 0 on all pass, 1 with reasons on failure. Prints the real legible deny
    message so 'fails legibly (names the fix)' is observable."""
    failures: list[str] = []

    # T1: a staged orchestrator/converter change is detected as converter-touching.
    t1 = _filter_converter([
        "plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py",
        "plugins/sgs-blocks/scripts/converter/gates/import_ban.py",
        "README.md",
    ])
    if len(t1) == 2:
        print("T1 PASS: converter-touching staged files detected (orchestrator + engine)")
    else:
        failures.append(f"T1 FAIL: expected 2 converter paths, got {t1}")

    # T2: a non-converter staged change is NOT flagged (no false positive).
    t2 = _filter_converter(["theme/sgs-theme/style.css", ".claude/LEDGER.md"])
    if t2 == []:
        print("T2 PASS: non-converter staged files correctly ignored")
    else:
        failures.append(f"T2 FAIL: expected no converter paths, got {t2}")

    # T3: commit recognition — gated for a plain commit, skipped for --amend / bypass.
    if (_is_gated_commit("git commit -m 'x'")
            and not _is_gated_commit("git commit --amend")
            and not _is_gated_commit("git commit -m '[gates-ok:deliberate]'")):
        print("T3 PASS: git-commit recognised; --amend + [gates-ok:] bypass honoured")
    else:
        failures.append("T3 FAIL: _is_gated_commit recognition wrong")

    # T4: integrity — every converter-required gate is a real _GATES entry (guards
    #     against a typo silently disabling the requirement → detectable-when-broken).
    gate_rels = {rel for _, rel in _GATES}
    orphan = _CONVERTER_REQUIRED_GATES - gate_rels
    if not orphan:
        print("T4 PASS: all converter-required guards are live _GATES entries")
    else:
        failures.append(f"T4 FAIL: converter-required gate(s) not in _GATES: {orphan}")

    # T5: the deny path builds a legible, fix-naming message. Show it.
    reason = _converter_guard_deny_reason(
        ["plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py"],
        ["cheat-gate/run.py"],
    )
    if "Restore the guard script" in reason and "sgs-clone-orchestrator.py" in reason:
        print("T5 PASS: converter-guard deny message is legible + names the fix. It reads:\n")
        print("    " + reason.replace("\n", "\n    "))
    else:
        failures.append("T5 FAIL: deny message missing fix guidance")

    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    print("\nAll converter-guard self-tests passed.")
    return 0


if __name__ == "__main__" and "--self-test" in sys.argv:
    sys.exit(_self_test())
elif __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)  # fail-open
