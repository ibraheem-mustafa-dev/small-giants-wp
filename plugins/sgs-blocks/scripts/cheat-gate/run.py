"""run.py — F5 cheat-detection gate runner.

Spec ref: Spec 31 §7a — check-converter-cheats.py (Spec 31 §12.7 F5)

Usage
-----
    python scripts/cheat-gate/run.py              # --report (default)
    python scripts/cheat-gate/run.py --report     # print all violations, exit 0
    python scripts/cheat-gate/run.py --check      # exit 1 if any NEW violation key not in baseline
    python scripts/cheat-gate/run.py --update-baseline  # write current keys to baseline, exit 0
    python scripts/cheat-gate/run.py --run-dir <path>   # pass pipeline-state run dir for checks 6+7

Baseline file
    cheat-gate-baseline.json  (alongside this file — a JSON list of key strings)
    Violation keys present in the baseline are grandfathered (treated as known legacy).
    --check only fails on NEW keys not yet in the baseline.

    STOP-14 requirement: the gate must be GREEN (--check exit 0) on the current
    repo immediately after --update-baseline.  The legacy convert.py violations
    are baselined, not removed — they vanish as the modular rebuild progresses.

7 Checks implemented
--------------------
1. slug_literal      — per-block slug literals (whole-tree + indirect forms)
2. hardcoded_dict    — hardcoded CSS-property→attr dict literals (R-22-1)
3. important_render  — !important over a faithful property in PHP/CSS render surface
4. parallel_bp       — parallel breakpoint vocabulary (_BP_SUFFIX_MAP + raw integers)
5. (delegated)       — mirror-emit / sourceMode='bound' / BEM-element className
                       → already handled by check_no_mirror.py (wired via
                       pipeline-stage-gate.py). NOT re-implemented here.
6. d2_when_d1        — D2-stranded property that has a D1 destination (run_dir-dependent)
7. sentinel          — 'unitless' parse sentinel leakage in code + emitted attrs

Plain-English failure messages
    Each violation shows: what file, what was found, why it matters, exact fix.
    A non-coder must be able to act on the output.

sys.stdout.reconfigure(encoding='utf-8')
    Applied at the top of every module (Windows emoji / emoji-in-JSON safety).
"""
from __future__ import annotations

import argparse
import hashlib
import importlib
import importlib.util
import json
import sqlite3
import sys
import types
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Package bootstrap — works both as `python run.py` (direct) and when the
# parent adds scripts/ to sys.path and imports as `cheat_gate.run`.
# ---------------------------------------------------------------------------

_SCRIPT_DIR = Path(__file__).resolve().parent   # scripts/cheat-gate/
_SCRIPTS_DIR = _SCRIPT_DIR.parent               # scripts/


def _load_sibling(name: str):
    """Load a sibling module from the cheat-gate/ directory by filename."""
    module_path = _SCRIPT_DIR / f"{name}.py"
    if not module_path.exists():
        raise ImportError(f"[cheat-gate] Cannot find sibling module: {module_path}")
    mod_id = f"cheat_gate.{name}"
    if mod_id in sys.modules:
        return sys.modules[mod_id]
    spec = importlib.util.spec_from_file_location(mod_id, str(module_path))
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    sys.modules[mod_id] = mod
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


# Register the package itself under 'cheat_gate' so relative imports work.
if "cheat_gate" not in sys.modules:
    pkg = types.ModuleType("cheat_gate")
    pkg.__path__ = [str(_SCRIPT_DIR)]  # type: ignore[assignment]
    pkg.__package__ = "cheat_gate"
    sys.modules["cheat_gate"] = pkg

# Load siblings in dependency order (models first).
_models_mod = _load_sibling("models")
_check_slug_mod = _load_sibling("check_slug_literals")
_check_dict_mod = _load_sibling("check_hardcoded_dicts")
_check_imp_mod = _load_sibling("check_important_render")
_check_bp_mod = _load_sibling("check_parallel_bp")
_check_d2_mod = _load_sibling("check_d2_when_d1")
_check_sentinel_mod = _load_sibling("check_sentinel")
_check_bound_mod = _load_sibling("check_bound_emit")

Violation = _models_mod.Violation

_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
_BASELINE_PATH = _SCRIPT_DIR / "cheat-gate-baseline.json"


# ---------------------------------------------------------------------------
# Baseline helpers — self-blessing protection (mirrors excluded-gate pattern)
# ---------------------------------------------------------------------------

def _compute_hash(keys: list[str]) -> str:
    """SHA-256 of the sorted, newline-joined key list."""
    payload = "\n".join(sorted(keys)).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _load_baseline() -> tuple[set[str], str | None]:
    """Return (baseline_keys, stored_hash).

    stored_hash is None when the file is absent or in the legacy list format.
    A missing hash means self-blessing protection cannot fire — the gate logs a
    warning but does NOT fail outright (backwards-compatible with existing
    baseline files).  Run --update-baseline once to seed the hash.
    """
    if not _BASELINE_PATH.exists():
        return set(), None
    try:
        data = json.loads(_BASELINE_PATH.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            keys = set(data.get("keys", []))
            stored_hash = data.get("hash")
            return keys, stored_hash
        # Legacy plain-list format — treat as no hash.
        if isinstance(data, list):
            return set(data), None
    except Exception:  # noqa: BLE001
        pass
    return set(), None


def _save_baseline(keys: set[str]) -> None:
    sorted_keys = sorted(keys)
    data = {
        "hash": _compute_hash(sorted_keys),
        "keys": sorted_keys,
    }
    _BASELINE_PATH.write_text(
        json.dumps(data, indent=2),
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Report formatting
# ---------------------------------------------------------------------------

_CHECK_LABELS = {
    "slug_literal":      "Check #1 — Per-block slug literals (whole-tree)",
    "hardcoded_dict":    "Check #2 — Hardcoded property→attr dicts (R-22-1)",
    "important_render":  "Check #3 — !important in render surface",
    "parallel_bp":       "Check #4 — Parallel breakpoint vocabulary",
    # Check #5 is delegated to check_no_mirror.py — documented, not re-run here.
    "d2_when_d1":        "Check #6 — D2-stranded property with D1 destination",
    "sentinel":          "Check #7 — 'unitless' sentinel leakage",
    "bound_emit":        "Check #8 — static sourceMode='bound' emit in source (commit-time mirror tripwire)",
}

_CHECK_ORDER = (
    "slug_literal", "hardcoded_dict", "important_render",
    "parallel_bp", "d2_when_d1", "sentinel", "bound_emit",
)


def _print_report(violations: list, baseline: set[str]) -> None:
    if not violations:
        print("[cheat-gate] All checks passed — 0 violations.")
        print()
        print("  Note: Check #5 (mirror-emit / sourceMode='bound' / BEM-element className)")
        print("  is delegated to check_no_mirror.py, wired via pipeline-stage-gate.py.")
        return

    groups: dict[str, list] = {}
    for v in violations:
        groups.setdefault(v.check, []).append(v)

    new_count = sum(1 for v in violations if v.key not in baseline)
    base_count = sum(1 for v in violations if v.key in baseline)

    print(f"[cheat-gate] {len(violations)} violation(s) total — {new_count} NEW, {base_count} baselined")
    print()
    print("  Note: Check #5 (mirror-emit / sourceMode='bound' / BEM-element className)")
    print("  is delegated to check_no_mirror.py, wired via pipeline-stage-gate.py.")
    print()

    for check_name in _CHECK_ORDER:
        group = groups.get(check_name, [])
        if not group:
            continue
        label = _CHECK_LABELS.get(check_name, check_name)
        print(f"{'='*72}")
        print(f"  {label}  ({len(group)} finding(s))")
        print(f"{'='*72}")
        for v in group:
            is_new = v.key not in baseline
            tag = "[NEW]" if is_new else "[baselined]"
            print(f"\n  {tag}")
            print(f"  File:    {v.file}")
            print(f"  Problem: {v.detail}")
            print(f"  Fix:     {v.fix}")
            print(f"  Key:     {v.key}")
        print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "F5 cheat-detection gate for the SGS cloning pipeline (Spec 31 §7a).\n"
            "Checks 1-4, 6-7 implemented here. Check 5 is in check_no_mirror.py."
        )
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
    parser.add_argument(
        "--run-dir",
        metavar="PATH",
        default=None,
        dest="run_dir",
        help=(
            "Path to a pipeline-state/<run> directory. "
            "Enables checks 6 and 7 (run-dir-dependent). "
            "Defaults to the most recent pipeline-state run if omitted."
        ),
    )
    args = parser.parse_args()

    # Default mode is --report.
    if not args.check and not args.update_baseline:
        args.report = True

    # Resolve optional run_dir
    run_dir: Path | None = None
    if args.run_dir:
        run_dir = Path(args.run_dir)
        if not run_dir.is_dir():
            print(f"[cheat-gate] WARNING: --run-dir not found: {run_dir} — checks 6+7 will be limited.")
            run_dir = None

    # Open DB connection (optional; checks degrade gracefully if DB absent)
    conn: sqlite3.Connection | None = None
    if _DB_PATH.exists():
        conn = sqlite3.connect(str(_DB_PATH))

    try:
        violations: list = []

        # Check #1 — per-block slug literals (whole orchestrator tree)
        violations.extend(_check_slug_mod.run())

        # Check #2 — hardcoded CSS-property→attr dicts
        violations.extend(_check_dict_mod.run())

        # Check #3 — !important in render surface (PHP + CSS)
        violations.extend(_check_imp_mod.run(conn))

        # Check #4 — parallel breakpoint vocabulary
        violations.extend(_check_bp_mod.run())

        # Check #5 — DELEGATED to check_no_mirror.py (see module docstring)

        # Check #6 — D2-when-D1-exists (run_dir-dependent, graceful skip)
        violations.extend(_check_d2_mod.run(run_dir=run_dir, conn=conn))

        # Check #7 — sentinel leakage
        violations.extend(_check_sentinel_mod.run(run_dir=run_dir))

        # Check #8 — static sourceMode='bound' emit (commit-time mirror tripwire)
        violations.extend(_check_bound_mod.run())

    finally:
        if conn is not None:
            conn.close()

    baseline, stored_hash = _load_baseline()

    if args.update_baseline:
        new_baseline = {v.key for v in violations}
        _save_baseline(new_baseline)
        print(
            f"[cheat-gate] Baseline updated — {len(new_baseline)} key(s) written to {_BASELINE_PATH}"
        )
        return 0

    _print_report(violations, baseline)

    if args.check:
        # --- self-blessing protection: verify hash integrity ---
        if baseline and stored_hash is not None:
            expected_hash = _compute_hash(list(baseline))
            if expected_hash != stored_hash:
                print(
                    "\n[cheat-gate] GATE FAILED — baseline file has been TAMPERED.\n"
                    f"  Stored hash:   {stored_hash}\n"
                    f"  Expected hash: {expected_hash}\n"
                    "  The baseline 'keys' list was modified without recomputing the hash.\n"
                    "  This is the self-blessing protection.  Run --update-baseline to\n"
                    "  produce a legitimate baseline from the current codebase.\n"
                    "  Do NOT hand-edit the baseline JSON."
                )
                return 1
        elif baseline and stored_hash is None:
            # Legacy plain-list format — warn but don't fail.
            print(
                "[cheat-gate] WARNING: baseline is in the legacy list format (no hash). "
                "Run --update-baseline to upgrade to the hashed format and enable "
                "self-blessing protection."
            )

        new_violations = [v for v in violations if v.key not in baseline]
        if new_violations:
            print(
                f"\n[cheat-gate] GATE FAILED — {len(new_violations)} new violation(s) not in baseline.\n"
                "  Fix the problems above, or run --update-baseline to accept them as known.\n"
                "  Do NOT blindly baseline without understanding each finding.\n"
                "  Refer to Spec 31 §7a for the rationale behind each check."
            )
            return 1
        if violations:
            print(
                f"[cheat-gate] Gate passed — all {len(violations)} violation(s) are baselined."
            )
        return 0

    # --report: always exit 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
