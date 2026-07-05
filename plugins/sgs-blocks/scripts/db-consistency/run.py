"""run.py — F6 DB-as-code consistency suite shared runner.

Spec ref: .claude/plans/2026-06-20-f6-db-consistency-design.md §3 + §4

Usage
-----
    python scripts/db-consistency/run.py              # --report (default)
    python scripts/db-consistency/run.py --report     # print all violations, exit 0
    python scripts/db-consistency/run.py --check      # exit 1 if any NEW violation key (not in baseline)
    python scripts/db-consistency/run.py --update-baseline  # write current keys to baseline, exit 0

Baseline file
    db-consistency-baseline.json  (alongside this file — a JSON list of key strings)
    Violation keys present in the baseline are grandfathered (treated as known).
    --check only fails on NEW keys not yet in the baseline.

Plain-English report
    Grouped by check.  Each violation shows: block, problem, exact fix command.
    A non-coder must be able to act on the output.

Note on the directory name
    The directory is named 'db-consistency' (with a hyphen) to match the spec.
    Python cannot import a hyphenated package via 'import db-consistency', so
    this runner uses importlib to load its siblings when invoked as a plain
    script.  Tests import via the 'db_consistency' alias created in __init__.py.
"""
from __future__ import annotations

import argparse
import importlib
import importlib.util
import json
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Package bootstrap — works both as `python run.py` (direct) and when the
# parent adds scripts/ to sys.path and imports as `db_consistency.run`.
# ---------------------------------------------------------------------------

_SCRIPT_DIR = Path(__file__).resolve().parent   # scripts/db-consistency/
_SCRIPTS_DIR = _SCRIPT_DIR.parent               # scripts/


def _load_sibling(name: str):
    """Load a sibling module from the db-consistency/ directory by filename."""
    module_path = _SCRIPT_DIR / f"{name}.py"
    if not module_path.exists():
        raise ImportError(f"[run.py] Cannot find sibling module: {module_path}")
    mod_id = f"db_consistency.{name}"
    if mod_id in sys.modules:
        return sys.modules[mod_id]
    spec = importlib.util.spec_from_file_location(mod_id, str(module_path))
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    sys.modules[mod_id] = mod
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


# Register the package itself under 'db_consistency' so relative imports work
# in sibling modules loaded below.
if "db_consistency" not in sys.modules:
    # Create a minimal package stub pointing at this directory.
    import types
    pkg = types.ModuleType("db_consistency")
    pkg.__path__ = [str(_SCRIPT_DIR)]  # type: ignore[assignment]
    pkg.__package__ = "db_consistency"
    sys.modules["db_consistency"] = pkg

# Load siblings (order matters — models first, then bridge, then checks).
_models_mod = _load_sibling("models")
_resolver_mod = _load_sibling("resolver_bridge")
_check_routing_mod = _load_sibling("check_routing")
_check_composition_mod = _load_sibling("check_composition")
_check_variants_mod = _load_sibling("check_variants")
_check_overrides_drift_mod = _load_sibling("check_overrides_drift")
_check_variant_reseed_mod = _load_sibling("check_variant_reseed")
_check_orphan_roles_mod = _load_sibling("check_orphan_roles")
_check_tier_composition_mod = _load_sibling("check_tier_composition")
_check_css_property_reseed_mod = _load_sibling("check_css_property_reseed")

Violation = _models_mod.Violation

_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
_BASELINE_PATH = _SCRIPT_DIR / "db-consistency-baseline.json"


# ---------------------------------------------------------------------------
# Baseline helpers
# ---------------------------------------------------------------------------

def _load_baseline() -> set[str]:
    if not _BASELINE_PATH.exists():
        return set()
    try:
        data = json.loads(_BASELINE_PATH.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return set(data)
    except Exception:  # noqa: BLE001
        pass
    return set()


def _save_baseline(keys: set[str]) -> None:
    _BASELINE_PATH.write_text(
        json.dumps(sorted(keys), indent=2),
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Report formatting
# ---------------------------------------------------------------------------

_CHECK_LABELS = {
    "routing": "Check #1 — Routing Determinism",
    "composition": "Check #2 — has_inner_blocks Sync",
    "variants": "Check #3 — Variant Discriminator Collision",
    "overrides_drift": "Check #4 — Override-Dict Drift",
    "variant_reseed": "Check #5 — variant_slots ↔ block.json Determinism",
    "orphan_roles": "Check #6 — Role Referential Integrity",
    "tier_composition": "Check #7 — tier ↔ composition_role/container_kind",
}

# Display order for the grouped report.
_CHECK_ORDER = (
    "routing", "composition", "variants",
    "overrides_drift", "variant_reseed", "orphan_roles", "tier_composition",
)


def _print_report(violations: list, baseline: set[str]) -> None:
    if not violations:
        print("[F6] All checks passed — 0 violations.")
        return

    # Group by check.
    groups: dict[str, list] = {}
    for v in violations:
        groups.setdefault(v.check, []).append(v)

    new_count = sum(1 for v in violations if v.key not in baseline)
    base_count = sum(1 for v in violations if v.key in baseline)

    print(f"[F6] {len(violations)} violation(s) total — {new_count} NEW, {base_count} baselined")
    print()

    for check_name in _CHECK_ORDER:
        group = groups.get(check_name, [])
        if not group:
            continue
        label = _CHECK_LABELS.get(check_name, check_name)
        print(f"{'='*60}")
        print(f"  {label}  ({len(group)} finding(s))")
        print(f"{'='*60}")
        for v in group:
            is_new = v.key not in baseline
            tag = "[NEW]" if is_new else "[baselined]"
            print(f"\n  {tag} Block: {v.block}")
            print(f"  Problem: {v.detail}")
            print(f"  Fix:     {v.fix}")
            print(f"  Key:     {v.key}")
        print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="F6 DB-as-code consistency suite for the SGS cloning pipeline."
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--report",
        action="store_true",
        default=False,
        help="Print all violations and exit 0 (default when no flag given).",
    )
    mode.add_argument(
        "--check",
        action="store_true",
        default=False,
        help="Exit 1 if any violation key is NOT in the baseline file.",
    )
    mode.add_argument(
        "--update-baseline",
        action="store_true",
        default=False,
        help="Write current violation keys to the baseline file and exit 0.",
    )
    args = parser.parse_args()

    # Default mode is --report.
    if not args.check and not args.update_baseline:
        args.report = True

    # DB availability.
    if not _DB_PATH.exists():
        msg = (
            f"[F6] DB not found: {_DB_PATH}\n"
            "  Ensure the SGS framework DB exists before running this suite.\n"
            "  Run: python plugins/sgs-blocks/scripts/sgs-update-v2.py"
        )
        print(msg)
        return 1 if args.check else 0

    conn = sqlite3.connect(str(_DB_PATH))
    try:
        violations: list = []
        violations.extend(_check_routing_mod.run(conn))
        violations.extend(_check_composition_mod.run(conn))
        violations.extend(_check_variants_mod.run(conn))
        violations.extend(_check_overrides_drift_mod.run(conn))
        violations.extend(_check_variant_reseed_mod.run(conn))
        violations.extend(_check_orphan_roles_mod.run(conn))
        violations.extend(_check_tier_composition_mod.run(conn))
        violations.extend(_check_css_property_reseed_mod.run(conn))
    finally:
        conn.close()

    baseline = _load_baseline()

    if args.update_baseline:
        new_baseline = {v.key for v in violations}
        _save_baseline(new_baseline)
        print(f"[F6] Baseline updated — {len(new_baseline)} key(s) written to {_BASELINE_PATH}")
        return 0

    _print_report(violations, baseline)

    if args.check:
        new_violations = [v for v in violations if v.key not in baseline]
        if new_violations:
            print(
                f"\n[F6] GATE FAILED — {len(new_violations)} new violation(s) not in baseline.\n"
                "  Fix the problems above or run --update-baseline to accept them as known.\n"
                "  Do NOT blindly baseline without understanding each finding."
            )
            return 1
        if violations:
            print(
                f"[F6] Gate passed — all {len(violations)} violation(s) are baselined."
            )
        return 0

    # --report: always exit 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
