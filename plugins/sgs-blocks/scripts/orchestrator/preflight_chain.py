#!/usr/bin/env python3
"""preflight_chain.py -- Spec 15 Phase 5e.1 + 5e.2.

Two complementary chains the orchestrator runs around the /sgs-clone
pipeline:

  5e.1 run_preflight(run_id, ...) -- BEFORE the pipeline starts
       Verifies: session timer file, mutex free, sgs-framework.db
       reachable, /visual-qa skill present, entry-precondition files
       for the run's target block list. Each check is independent;
       all results returned even if some fail.

  5e.2 run_precommit_gate(staging_dir, ...) -- BEFORE any commit
       Runs: BEM lint (Phase 4), token lint (Phase 4), canonical-slot
       drift validator (Phase 2), Phase 1 unit tests. Fails closed --
       any single check failure blocks the commit.

Both chains return structured results. The orchestrator decides whether
to abort on a failed check or surface to the operator (5e.5 autonomy
gate).

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import importlib.util as _ilu
import json
import sqlite3
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent
PROJECT_ROOT = HERE.parents[3]

# Sibling staged_output (for run_dir + mutex lock path)
_so_spec = _ilu.spec_from_file_location("staged_output", HERE / "staged_output.py")
_so = _ilu.module_from_spec(_so_spec)
sys.modules.setdefault("staged_output", _so)
_so_spec.loader.exec_module(_so)

_mutex_spec = _ilu.spec_from_file_location("mutex", HERE / "mutex.py")
_mutex = _ilu.module_from_spec(_mutex_spec)
sys.modules.setdefault("mutex", _mutex)
_mutex_spec.loader.exec_module(_mutex)


DEFAULT_SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
DEFAULT_VISUAL_QA_SKILL = Path.home() / ".claude" / "skills" / "visual-qa" / "SKILL.md"
DEFAULT_TIMER = Path(".claude/scratch/spec-15-session-start.txt")
DEFAULT_DRIFT_VALIDATOR = Path("plugins/sgs-blocks/scripts/drift-validator/validate.py")


def _check(name: str, ok: bool, detail: str = "") -> dict:
    return {"name": name, "ok": ok, "detail": detail}


# ---- 5e.1 pre-flight chain ---------------------------------------------------


def run_preflight(
    run_id: str,
    sgs_db: Path = DEFAULT_SGS_DB,
    visual_qa_skill: Path = DEFAULT_VISUAL_QA_SKILL,
    timer_path: Path = DEFAULT_TIMER,
    mutex_lock_path: Path | None = None,
    expected_files: list[Path] | None = None,
) -> dict:
    """Run every pre-flight check. Returns a structured result.

    Returns:
        {
          "run_id": ...,
          "abort":  bool,                # True if any required check failed
          "checks": [check_dict, ...],
          "summary": {"passed": N, "failed": N}
        }
    """
    checks: list[dict] = []

    # 1. Session timer present
    checks.append(_check(
        "timer-file",
        timer_path.exists(),
        f"path={timer_path}",
    ))

    # 2. Mutex free (no live or stale lock blocking us)
    lock = _mutex.BuildMutex("preflight-probe",
                             lock_path=mutex_lock_path or _mutex.DEFAULT_LOCK_PATH)
    status = lock.status()
    mutex_ok = status["state"] in ("free", "stale")
    checks.append(_check(
        "mutex-free",
        mutex_ok,
        f"state={status['state']} holder={status.get('holder', {}).get('holder', '-')}",
    ))

    # 3. sgs-framework.db reachable + has block_attributes
    db_ok = False
    db_detail = ""
    if sgs_db.exists():
        try:
            conn = sqlite3.connect(str(sgs_db), timeout=2.0)
            try:
                count = conn.execute("SELECT COUNT(*) FROM block_attributes").fetchone()[0]
            finally:
                conn.close()
            db_ok = count > 0
            db_detail = f"block_attributes rows={count}"
        except sqlite3.Error as e:
            db_detail = f"sqlite error: {e}"
    else:
        db_detail = f"db not found at {sgs_db}"
    checks.append(_check("sgs-framework-db", db_ok, db_detail))

    # 4. /visual-qa skill present
    checks.append(_check(
        "visual-qa-skill",
        visual_qa_skill.exists(),
        f"path={visual_qa_skill}",
    ))

    # 5. Entry-precondition files for the run's target block list
    if expected_files:
        for f in expected_files:
            checks.append(_check(
                f"expected-file:{f.name}",
                f.exists(),
                f"path={f}",
            ))

    failed = [c for c in checks if not c["ok"]]
    return {
        "run_id": run_id,
        "abort":  bool(failed),
        "checks": checks,
        "summary": {"passed": len(checks) - len(failed), "failed": len(failed)},
    }


# ---- 5e.2 pre-commit gate chain ---------------------------------------------


def _run_python(cmd: list[str], timeout: int = 60) -> tuple[bool, str]:
    """Run a Python subprocess; return (ok, output_excerpt)."""
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True,
                              timeout=timeout, check=False)
    except subprocess.SubprocessError as e:
        return False, f"subprocess error: {e}"
    out = (proc.stdout or "")[-600:] + (proc.stderr or "")[-200:]
    return proc.returncode == 0, out.strip()


def run_precommit_gate(
    drift_validator: Path = DEFAULT_DRIFT_VALIDATOR,
    bem_lint_cmd: list[str] | None = None,
    token_lint_cmd: list[str] | None = None,
    phase_1_tests: list[Path] | None = None,
) -> dict:
    """Run every pre-commit check. Returns a structured result.

    The chain is FAIL-CLOSED: any check failure -> abort=True. Callers
    must NOT proceed to commit when abort is True.
    """
    checks: list[dict] = []

    # 1. Drift validator (strict mode -- exits non-zero on any violation)
    if drift_validator.exists():
        ok, out = _run_python([sys.executable, str(drift_validator), "--strict"])
        checks.append(_check("drift-validator", ok, out[:200]))
    else:
        checks.append(_check("drift-validator", False,
                             f"validator missing at {drift_validator}"))

    # 2. BEM lint (Phase 4) -- caller supplies command since path varies.
    # FAIL-CLOSED per 5e.2 contract: missing command = check FAILS.
    # Tests/dev-time callers that don't need the lint can pass require_lints=False.
    if bem_lint_cmd:
        ok, out = _run_python(bem_lint_cmd)
        checks.append(_check("bem-lint", ok, out[:200]))
    else:
        checks.append(_check("bem-lint", False,
                             "fail-closed: no bem_lint_cmd supplied (5e.2 contract)"))

    # 3. Token lint (Phase 4) -- caller supplies command
    if token_lint_cmd:
        ok, out = _run_python(token_lint_cmd)
        checks.append(_check("token-lint", ok, out[:200]))
    else:
        checks.append(_check("token-lint", False,
                             "fail-closed: no token_lint_cmd supplied (5e.2 contract)"))

    # 4. Phase 1 unit tests
    if phase_1_tests:
        for test_path in phase_1_tests:
            if not test_path.exists():
                checks.append(_check(f"phase-1-test:{test_path.name}", False,
                                     f"missing at {test_path}"))
                continue
            ok, out = _run_python([sys.executable, str(test_path)])
            checks.append(_check(f"phase-1-test:{test_path.name}", ok, out[:200]))

    failed = [c for c in checks if not c["ok"]]
    return {
        "abort":  bool(failed),
        "checks": checks,
        "summary": {"passed": len(checks) - len(failed), "failed": len(failed)},
    }


# ---- CLI surface ------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_pf = sub.add_parser("preflight")
    p_pf.add_argument("--run-id", required=True)
    p_gate = sub.add_parser("precommit-gate")
    args = parser.parse_args(argv)

    if args.cmd == "preflight":
        result = run_preflight(args.run_id)
        print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
        return 1 if result["abort"] else 0
    if args.cmd == "precommit-gate":
        result = run_precommit_gate()
        print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
        return 1 if result["abort"] else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
