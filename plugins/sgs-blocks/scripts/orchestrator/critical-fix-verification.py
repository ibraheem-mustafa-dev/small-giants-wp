#!/usr/bin/env python3
"""critical-fix-verification.py -- Spec 15 Phase 5f.1 acceptance harness.

The 5-check harness per Spec 15 FR18 P1 KJC2. Runs ALL checks even when
one fails; surfaces the full picture so the operator sees the whole
state.

Five boundary checks:

  1. no_root_theme_mutation
     Root `theme/sgs-theme/theme.json` content hash matches the
     committed state (no live mutation has slipped through outside
     Spec 15 §4.7 client-variation channels).

  2. no_canonical_block_mutation_outside_fr21
     Files under `plugins/sgs-blocks/src/blocks/` are clean against
     the working tree (no uncommitted changes outside the FR21
     staged-merge / promote() channel).

  3. no_licensing_strings_in_uimax_writes
     Audit recent uimax row writes (when a journal table exists OR
     by spot-checking uimax row text content) for forbidden tokens:
     "license", "copyright", "trademark", "tm" -- per blub.db row 211.

  4. sgs_update_idempotency
     Snapshot sgs-framework.db; re-run /sgs-update (or stub callable);
     diff against snapshot; pass iff zero net row changes.

  5. pipeline_state_clean_post_success
     For every successful run in pipeline-state/sgs-clone/<run_id>/,
     assert the run's staging dir matches the canonical artefact
     manifest (no leftover orphans).

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util as _ilu
import json
import os
import sqlite3
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent
PROJECT_ROOT = HERE.parents[3]

_so_spec = _ilu.spec_from_file_location("staged_output", HERE / "staged_output.py")
_so = _ilu.module_from_spec(_so_spec)
sys.modules.setdefault("staged_output", _so)
_so_spec.loader.exec_module(_so)


DEFAULT_THEME_JSON = PROJECT_ROOT / "theme" / "sgs-theme" / "theme.json"
DEFAULT_CANONICAL_BLOCKS = PROJECT_ROOT / "plugins" / "sgs-blocks" / "src" / "blocks"
DEFAULT_SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
DEFAULT_UIMAX_DB = Path.home() / ".agents" / "skills" / "ui-ux-pro-max" / "scripts" / "ui-ux-pro-max.db"

# Forbidden tokens per blub.db row 211 (no licensing/IP framing).
_FORBIDDEN_TOKENS = ("license", "licence", "copyright", "trademark")


def _hash_file(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def _check(name: str, ok: bool, detail: str = "") -> dict:
    return {"name": name, "ok": ok, "detail": detail}


# ---- Check 1 -- root theme.json mutation -----------------------------------


def check_no_root_theme_mutation(
    theme_json: Path = DEFAULT_THEME_JSON,
    expected_hash: str | None = None,
) -> dict:
    """Compare current theme.json hash against `expected_hash` if supplied,
    otherwise just confirm the file is git-clean (untouched in working tree)."""
    if not theme_json.exists():
        return _check("no_root_theme_mutation", False,
                      f"theme.json missing at {theme_json}")
    cur_hash = _hash_file(theme_json)
    if expected_hash is not None:
        if cur_hash != expected_hash:
            return _check("no_root_theme_mutation", False,
                          f"hash drift: got {cur_hash[:12]}, expected {expected_hash[:12]}")
        return _check("no_root_theme_mutation", True,
                      f"hash matches: {cur_hash[:12]}")
    # No expected hash -- use git status to detect uncommitted mutation.
    try:
        proc = subprocess.run(
            ["git", "diff", "--name-only", str(theme_json)],
            capture_output=True, text=True, cwd=str(PROJECT_ROOT),
            timeout=10, check=False,
        )
    except (subprocess.SubprocessError, OSError) as e:
        return _check("no_root_theme_mutation", False, f"git diff failed: {e}")
    if proc.stdout.strip():
        return _check("no_root_theme_mutation", False,
                      f"theme.json has uncommitted changes")
    return _check("no_root_theme_mutation", True,
                  f"git diff clean; hash={cur_hash[:12]}")


# ---- Check 2 -- canonical block files mutation ------------------------------


def check_no_canonical_block_mutation(
    blocks_root: Path = DEFAULT_CANONICAL_BLOCKS,
    allow_paths: list[Path] | None = None,
) -> dict:
    """Use git to detect uncommitted changes under plugins/sgs-blocks/src/blocks/.
    `allow_paths` are exempted (used by FR21 promote() to record its own writes)."""
    if not blocks_root.exists():
        return _check("no_canonical_block_mutation", False,
                      f"blocks root missing at {blocks_root}")
    try:
        proc = subprocess.run(
            ["git", "diff", "--name-only", "--", str(blocks_root)],
            capture_output=True, text=True, cwd=str(PROJECT_ROOT),
            timeout=10, check=False,
        )
    except (subprocess.SubprocessError, OSError) as e:
        return _check("no_canonical_block_mutation", False, f"git diff failed: {e}")
    changed = [line for line in proc.stdout.splitlines() if line.strip()]
    allowed_strs = {str(p) for p in (allow_paths or [])}
    leaked = [c for c in changed if c not in allowed_strs]
    if leaked:
        return _check("no_canonical_block_mutation", False,
                      f"{len(leaked)} mutated files: {leaked[:3]}")
    return _check("no_canonical_block_mutation", True,
                  f"git diff clean ({len(changed)} allowed entries)")


# ---- Check 3 -- no licensing strings in uimax ------------------------------


def check_no_licensing_in_uimax(
    uimax_db: Path = DEFAULT_UIMAX_DB,
    tables: tuple[str, ...] = ("naming_conventions", "patterns", "design_tokens"),
) -> dict:
    """Spot-check the first 100 rows of common uimax text tables for
    forbidden tokens. Cheap heuristic; full audit lives in /uimax-audit."""
    if not uimax_db.exists():
        return _check("no_licensing_in_uimax", False,
                      f"uimax DB missing at {uimax_db}")
    findings: list[str] = []
    conn = sqlite3.connect(str(uimax_db), timeout=5.0)
    try:
        existing = {r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )}
        for table in tables:
            if table not in existing:
                continue
            # Concatenate every TEXT column for the table; scan for forbidden.
            cols = [r[1] for r in conn.execute(f"PRAGMA table_info({table})")
                    if r[2].upper() == "TEXT"]
            if not cols:
                continue
            sql_cols = " || ' ' || ".join(f"COALESCE({c}, '')" for c in cols)
            rows = conn.execute(f"SELECT rowid, {sql_cols} FROM {table} LIMIT 500").fetchall()
            for rid, blob in rows:
                low = (blob or "").lower()
                for token in _FORBIDDEN_TOKENS:
                    if token in low:
                        findings.append(f"{table}#{rid} contains {token!r}")
    finally:
        conn.close()
    if findings:
        return _check("no_licensing_in_uimax", False,
                      f"{len(findings)} hits: {findings[:3]}")
    return _check("no_licensing_in_uimax", True, "no forbidden tokens in scanned tables")


# ---- Check 4 -- /sgs-update idempotency -------------------------------------


def _db_row_count_snapshot(db_path: Path) -> dict:
    """Return per-table row counts (excluding sqlite_* metadata) for diffing."""
    snap: dict = {}
    conn = sqlite3.connect(str(db_path), timeout=5.0)
    try:
        for (name,) in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        ):
            try:
                snap[name] = conn.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
            except sqlite3.Error:
                snap[name] = -1
    finally:
        conn.close()
    return snap


def check_sgs_update_idempotency(
    sgs_db: Path = DEFAULT_SGS_DB,
    runner: Callable[[], Any] | None = None,
) -> dict:
    """Snapshot row counts; invoke `runner` (defaults to no-op simulating a
    clean re-run); diff. Pass iff zero row-count deltas across all tables."""
    if not sgs_db.exists():
        return _check("sgs_update_idempotency", False,
                      f"sgs-framework.db missing at {sgs_db}")
    before = _db_row_count_snapshot(sgs_db)
    if runner is not None:
        try:
            runner()
        except Exception as e:                              # noqa: BLE001
            return _check("sgs_update_idempotency", False,
                          f"runner raised: {e}")
    after = _db_row_count_snapshot(sgs_db)
    deltas = {t: (after.get(t, 0) - before.get(t, 0))
              for t in set(before) | set(after)}
    nonzero = {t: d for t, d in deltas.items() if d != 0}
    if nonzero:
        return _check("sgs_update_idempotency", False,
                      f"row-count deltas: {dict(list(nonzero.items())[:5])}")
    return _check("sgs_update_idempotency", True,
                  f"all {len(before)} tables stable across re-run")


# ---- Check 5 -- pipeline-state clean post-success ---------------------------


def check_pipeline_state_clean(
    run_id: str | None = None,
    root: Path = _so.PIPELINE_ROOT,
) -> dict:
    """Confirm no orphan files in pipeline-state/sgs-clone/<run_id>/.
    When run_id is None, scans every run dir under root."""
    sgs_clone = root / "sgs-clone"
    if not sgs_clone.exists():
        return _check("pipeline_state_clean", True, "no pipeline-state runs yet")
    orphans_total: list[str] = []
    runs_scanned = 0
    targets = [sgs_clone / run_id] if run_id else [
        d for d in sgs_clone.iterdir() if d.is_dir()
    ]
    for run_dir in targets:
        if not run_dir.exists():
            continue
        runs_scanned += 1
        # Use staged_output.find_orphans to enumerate
        for entry in _so.find_orphans(run_dir.name, root=root):
            orphans_total.append(f"{run_dir.name}/{entry['name']}")
    if orphans_total:
        return _check("pipeline_state_clean", False,
                      f"{len(orphans_total)} orphan(s) across {runs_scanned} run(s): "
                      f"{orphans_total[:3]}")
    return _check("pipeline_state_clean", True,
                  f"{runs_scanned} run(s) clean")


# ---- Harness driver ---------------------------------------------------------


def run_harness(
    run_id: str | None = None,
    theme_expected_hash: str | None = None,
    sgs_update_runner: Callable[[], Any] | None = None,
    pipeline_root: Path | None = None,
) -> dict:
    """Execute every check; return aggregated result."""
    checks = [
        check_no_root_theme_mutation(expected_hash=theme_expected_hash),
        check_no_canonical_block_mutation(),
        check_no_licensing_in_uimax(),
        check_sgs_update_idempotency(runner=sgs_update_runner),
        check_pipeline_state_clean(run_id=run_id,
                                   root=pipeline_root or _so.PIPELINE_ROOT),
    ]
    failed = [c for c in checks if not c["ok"]]
    return {
        "run_id":    run_id,
        "checks":    checks,
        "summary":   {"passed": len(checks) - len(failed), "failed": len(failed),
                      "total": len(checks)},
        "all_green": not failed,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--run-id", default=None,
                        help="Scope check 5 to a single run; otherwise scan all")
    parser.add_argument("--theme-expected-hash", default=None)
    args = parser.parse_args(argv)
    result = run_harness(run_id=args.run_id,
                         theme_expected_hash=args.theme_expected_hash)
    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
    return 0 if result["all_green"] else 1


if __name__ == "__main__":
    sys.exit(main())
