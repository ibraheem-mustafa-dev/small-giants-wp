"""run.py — F5 excluded-literal tripwire gate for the SGS cloning pipeline.

Spec ref : .claude/plans/2026-06-18-f4-excluded-properties-design.md §3
           .claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md §12.2.4 (MF-4)

WHAT THIS IS
============
A lightweight TRIPWIRE that detects in-code CSS-property exclusion literals
across the entire orchestrator/ tree and cross-references them against the
``excluded_properties`` DB table (Spec 31 §12.2.4 / F4).

If a CSS property is excluded inline — via ``if prop == "x": continue``,
``if prop in (...): continue``, a named frozenset, or ``prop.startswith("--")``
— it MUST have a reasoned row in ``excluded_properties``.  Any in-code
exclusion without a DB row → gate FAILS.

WHAT THIS IS NOT (DELEGATED — honesty requirement from the council §3)
=====================================================================
This gate is a NARROW TRIPWIRE.  It does NOT guarantee the full no-drop
property.  The classes it CANNOT catch are explicitly delegated:

  • Value-transform drops (a lift returning "" / None) → F3 render-diff oracle.
  • DB-lookup-None / no property_suffixes row → F2 draft-ledger (UNACCOUNTED).
  • Broad-except fail-silent swallowing of declarations → separate bare-except lint.

The real structural no-silent-drop guarantee rests on:
  F2 (draft-declaration ledger) + F3 (render-diff oracle) +
  the coverage-conservation invariant (count-in == count-routed) +
  F5's pipeline-close ledger checker (UNACCOUNTED = draft − (transferred ∪
  excluded-with-reason ∪ gap) == 0).

Usage
-----
    python scripts/excluded-gate/run.py              # --report (default)
    python scripts/excluded-gate/run.py --report     # print all sigs + delegation note, exit 0
    python scripts/excluded-gate/run.py --check      # exit 1 on any NEW violation not in baseline
    python scripts/excluded-gate/run.py --update-baseline  # write current state to baseline, exit 0

Baseline file
    excluded-gate-baseline.json  (alongside this file)
    The baseline stores a dict:
      {
        "hash": "<sha256 of sorted signature keys>",
        "signatures": ["key1", "key2", ...]
      }
    --check recomputes the current signature set + hash and compares:
      - Growth (new key not in baseline) → FAIL with "needs migration + reason".
      - Shrinkage (baseline key absent from code) → PASS, noted in report.
      - Same set → PASS.
    A hand-edit that adds a key to the JSON without a corresponding literal in
    code is harmless (the key will simply appear as a "baseline entry no longer
    in code" note).  A hand-edit that REMOVES a key is self-blessing protection:
    that key was previously passing; removing it means a new literal would pass
    unchecked — caught by the hash mismatch on the next --check run.

Self-blessing protection
    The baseline JSON stores both the list of keys AND a SHA-256 of the sorted
    key list.  Any hand-edit that changes the list WITHOUT recomputing the hash
    is immediately caught by hash mismatch → --check treats the baseline as
    tampered and exits 1 with a clear message.  The ONLY legitimate way to grow
    the baseline is via ``--update-baseline``, which recomputes both list and hash.

STOP-14 (gate-arm needs precondition check + baseline)
    The baseline was seeded from the CURRENT codebase on first run.  --check is
    green immediately after seeding; it fails only on NEW signatures added after
    that point.
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
# Package bootstrap — works both as `python run.py` (direct) and when
# imported as excluded_gate.run via importlib.
# ---------------------------------------------------------------------------

_SCRIPT_DIR = Path(__file__).resolve().parent   # scripts/excluded-gate/
_SCRIPTS_DIR = _SCRIPT_DIR.parent               # scripts/


def _load_sibling(name: str):
    """Load a sibling module from the excluded-gate/ directory by filename."""
    module_path = _SCRIPT_DIR / f"{name}.py"
    if not module_path.exists():
        raise ImportError(f"[excluded-gate] Cannot find sibling module: {module_path}")
    mod_id = f"excluded_gate.{name}"
    if mod_id in sys.modules:
        return sys.modules[mod_id]
    spec = importlib.util.spec_from_file_location(mod_id, str(module_path))
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    sys.modules[mod_id] = mod
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


# Register the package itself under 'excluded_gate' so relative imports work.
if "excluded_gate" not in sys.modules:
    pkg = types.ModuleType("excluded_gate")
    pkg.__path__ = [str(_SCRIPT_DIR)]  # type: ignore[assignment]
    pkg.__package__ = "excluded_gate"
    sys.modules["excluded_gate"] = pkg

_models_mod = _load_sibling("models")
_scanner_mod = _load_sibling("scanner")
_db_check_mod = _load_sibling("db_check")

ExclusionSignature = _models_mod.ExclusionSignature
GateViolation = _models_mod.GateViolation

_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
_BASELINE_PATH = _SCRIPT_DIR / "excluded-gate-baseline.json"

# ---------------------------------------------------------------------------
# Baseline helpers
# ---------------------------------------------------------------------------

def _compute_hash(keys: list[str]) -> str:
    """SHA-256 of the sorted, newline-joined key list."""
    payload = "\n".join(sorted(keys)).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _load_baseline() -> tuple[set[str], str | None]:
    """Return (baseline_keys, stored_hash).

    stored_hash is None if the baseline file does not exist or is malformed.
    """
    if not _BASELINE_PATH.exists():
        return set(), None
    try:
        data = json.loads(_BASELINE_PATH.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            keys = set(data.get("signatures", []))
            stored_hash = data.get("hash")
            return keys, stored_hash
        # Legacy list format (F6 style) — treat as no hash.
        if isinstance(data, list):
            return set(data), None
    except Exception:  # noqa: BLE001
        pass
    return set(), None


def _save_baseline(keys: list[str]) -> None:
    data = {
        "hash": _compute_hash(keys),
        "signatures": sorted(keys),
    }
    _BASELINE_PATH.write_text(
        json.dumps(data, indent=2),
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Report formatting
# ---------------------------------------------------------------------------

_DELEGATION_NOTE = """\
DELEGATED CLASSES (what this gate does NOT cover — by design)
--------------------------------------------------------------
  1. Value-transform drops (lift returning "" / None)   → F3 render-diff oracle.
  2. DB-lookup-None / no property_suffixes row           → F2 draft-ledger (UNACCOUNTED).
  3. Broad-except fail-silent swallowing declarations    → separate bare-except lint.

The real no-silent-drop guarantee is:
  F2 + F3 + coverage-conservation invariant + F5 pipeline-close ledger.
This gate is a secondary TRIPWIRE, not the primary guarantee.
"""


def _print_report(
    signatures: list[ExclusionSignature],
    violations: list[GateViolation],
    baseline_keys: set[str],
    excluded_props: set[str],
) -> None:
    """Print the full report to stdout."""
    print("=" * 70)
    print("[F5-EXCLUDED-GATE] Exclusion Literal Scan Report")
    print("=" * 70)
    print()

    # Delegation disclaimer — always shown.
    print(_DELEGATION_NOTE)

    if not signatures:
        print("[F5] No exclusion literals detected in orchestrator/.")
        print()
    else:
        # Group signatures by form.
        forms: dict[str, list[ExclusionSignature]] = {}
        for sig in signatures:
            forms.setdefault(sig.form, []).append(sig)

        print(f"[F5] Detected {len(signatures)} exclusion signature(s):\n")
        form_labels = {
            "inline_equality": "Form 1 — Inline equality drop",
            "membership": "Form 2/3 — Membership drop",
            "startswith_dashdash": "Form 4 — .startswith('--') guard",
            "named_set": "Form 5 — Named denylist set",
        }
        for form_key in ("inline_equality", "membership", "startswith_dashdash", "named_set"):
            group = forms.get(form_key, [])
            if not group:
                continue
            print(f"  {form_labels.get(form_key, form_key)} ({len(group)} signature(s))")
            for sig in group:
                in_db = sig.prop in excluded_props or sig.prop.startswith("--") or sig.form == "startswith_dashdash"
                status = "[DB-ok]" if in_db else "[NOT-IN-DB]"
                in_baseline = sig.key in baseline_keys
                bstatus = "[baselined]" if in_baseline else "[new]"
                print(f"    {status} {bstatus} {sig.file}:{sig.line}  prop={sig.prop!r}")
                print(f"      {sig.snippet}")
        print()

    # Violations section.
    if not violations:
        print("[F5] 0 gate violations — all detected exclusions are either in the DB "
              "or are the .startswith('--') guard (custom properties, out of scope).")
    else:
        new_violations = [v for v in violations if v.sig.key not in baseline_keys]
        old_violations = [v for v in violations if v.sig.key in baseline_keys]
        print(f"[F5] {len(violations)} violation(s) — "
              f"{len(new_violations)} NEW, {len(old_violations)} baselined")
        print()
        for v in violations:
            is_new = v.sig.key not in baseline_keys
            tag = "[NEW]" if is_new else "[baselined]"
            print(f"  {tag}  {v.sig.file}:{v.sig.line}")
            print(f"  Problem: {v.detail}")
            print(f"  Fix:     {v.fix}")
            print(f"  Key:     {v.key}")
            print()

    # Baseline shrinkage note.
    if baseline_keys:
        all_sig_keys = {s.key for s in signatures}
        gone_from_code = baseline_keys - all_sig_keys
        if gone_from_code:
            print(f"[F5] Note: {len(gone_from_code)} baselined key(s) no longer found in code "
                  f"(literal was removed — baseline will shrink on next --update-baseline):")
            for k in sorted(gone_from_code):
                print(f"  {k}")
            print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "F5 excluded-literal tripwire gate for the SGS cloning pipeline.\n"
            "Detects in-code CSS property exclusion literals and cross-references\n"
            "them against the excluded_properties DB table.\n\n"
            "DELEGATION NOTE: this gate does NOT cover value-transform drops,\n"
            "DB-lookup-None (F2 ledger), or broad-except fail-silent (bare-except lint)."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--report",
        action="store_true",
        default=False,
        help="Print all signatures and the delegation disclaimer. Exit 0 always (default).",
    )
    mode.add_argument(
        "--check",
        action="store_true",
        default=False,
        help=(
            "Exit 1 if any NEW violation key is not in the baseline, OR if the "
            "baseline has been tampered (hash mismatch)."
        ),
    )
    mode.add_argument(
        "--update-baseline",
        action="store_true",
        default=False,
        help=(
            "Write the current violation keys and hash to the baseline file. "
            "Exit 0.  This is the ONLY sanctioned way to grow the baseline."
        ),
    )
    args = parser.parse_args()

    # Default mode is --report.
    if not args.check and not args.update_baseline:
        args.report = True

    # DB availability.
    if not _DB_PATH.exists():
        msg = (
            f"[F5] DB not found: {_DB_PATH}\n"
            "  Ensure the SGS framework DB exists before running this gate.\n"
            "  Run: python plugins/sgs-blocks/scripts/migrations/"
            "2026-06-18-create-excluded-properties.py"
        )
        print(msg)
        return 1 if args.check else 0

    # Load DB excluded_properties set.
    conn = sqlite3.connect(str(_DB_PATH))
    try:
        excluded_props = _db_check_mod.load_excluded_properties(conn)
    finally:
        conn.close()

    # Scan the orchestrator tree.
    signatures = _scanner_mod.scan_orchestrator()

    # Cross-reference against DB.
    violations = _db_check_mod.check_signatures(signatures, excluded_props)

    # Load baseline.
    baseline_keys, stored_hash = _load_baseline()

    if args.update_baseline:
        # Write the CURRENT violation keys (not all signatures — only violations
        # need baselining; non-violations are already DB-backed).
        violation_keys = [v.key for v in violations]
        _save_baseline(violation_keys)
        print(
            f"[F5] Baseline updated — {len(violation_keys)} violation key(s) written to "
            f"{_BASELINE_PATH}\n"
            "  These are LEGACY violations being grandfathered.  They will continue to "
            "appear in --report as [baselined].  --check will only fail on NEW violations."
        )
        return 0

    # --report or --check: print the report.
    _print_report(signatures, violations, baseline_keys, excluded_props)

    if args.check:
        # Hash integrity check first.
        if baseline_keys and stored_hash is not None:
            expected_hash = _compute_hash(list(baseline_keys))
            if expected_hash != stored_hash:
                print(
                    "\n[F5] GATE FAILED — baseline file has been TAMPERED.\n"
                    f"  Stored hash:   {stored_hash}\n"
                    f"  Expected hash: {expected_hash}\n"
                    "  The baseline list was modified without recomputing the hash.\n"
                    "  This is the self-blessing protection.  Run --update-baseline\n"
                    "  to produce a legitimate baseline from the current codebase.\n"
                    "  Do NOT hand-edit the baseline JSON."
                )
                return 1

        new_violations = [v for v in violations if v.key not in baseline_keys]
        if new_violations:
            print(
                f"\n[F5] GATE FAILED — {len(new_violations)} NEW violation(s) not in baseline.\n"
                "  Each in-code exclusion of a CSS property must have a reasoned row in\n"
                "  the excluded_properties DB table (added via a dated migration).\n"
                "  Fix the violations above, OR run --update-baseline to grandfather them\n"
                "  (but add a DB row first — do not blindly baseline without a migration)."
            )
            return 1

        if violations:
            print(
                f"[F5] Gate passed — all {len(violations)} violation(s) are baselined "
                f"(legacy, grandfathered)."
            )
        else:
            print("[F5] Gate passed — 0 violations.")
        return 0

    # --report: always exit 0.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
