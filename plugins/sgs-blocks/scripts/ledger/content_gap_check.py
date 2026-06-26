"""
ledger.content_gap_check — F5 ContentGap visibility gate (the content-dropping channel).

Spec ref:
  plans/2026-06-26-stage3-child-shape-fork-design.md §4 (the content-gap channel)
  plans/2026-06-26-stage3-child-shape-fork-design.md §6 (baseline-before-arming, STOP-14)

WHAT THIS MODULE DOES
---------------------
Makes a dropped or un-transferred content child VISIBLE and commit-blocking.

The Stage-3 content extractor writes a per-run file `content-gaps.json` — a list of
ContentGap records produced during extraction. Each record identifies a block/fixture
combination where content could not be transferred (no derived_selector, no DB slot
mapping, a wrapper-shell over-capture, etc.).

Without this gate, ContentGaps were invisible to the F5 commit gate (R-10 from the
round-2 council, verified TRUE against coverage_check.py which does NOT read the gap
table). This gate closes that channel: a NEW ContentGap (one whose identity key is
not in the committed baseline) is a commit-blocking event.

FAIL-SAFE
---------
If `content-gaps.json` does not exist (no pipeline run has happened in this session),
the gate exits 0 — it does NOT fail merely because no extraction has run. A present
file with NEW gaps that are not in the baseline DOES fail.

BASELINE APPROACH (STOP-14 / STOP-17)
--------------------------------------
Key = (block, attr_or_slot, fixture) identity tuple — NEVER a line number (STOP-17).
On first run (--update-baseline), whatever gaps are present today (the DB data limits
— avatarMedia having no role/derived_selector, slots without standalone_block, etc.)
are baselined. --check is GREEN immediately after baselining and fails only on NEW
gaps introduced by a subsequent change.

SHA-256 self-blessing mirrors coverage_check.py: any hand-edit to the baseline that
alters the 'keys' list without recomputing the hash is detected and rejected.

Usage (run from plugins/sgs-blocks/scripts/):
    python ledger/content_gap_check.py --check           # exit 1 on NEW gap (not in baseline)
    python ledger/content_gap_check.py --update-baseline # write baseline from current run, exit 0
    python ledger/content_gap_check.py --report          # print all findings, exit 0

Importable API:
    from ledger.content_gap_check import check
    exit_code, violations = check(gaps_path, baseline_path)
    # exit_code: 0 = clean (all gaps baselined or no file), 1 = NEW gap(s) found
    # violations: list[str] — plain-English descriptions of each NEW gap

Baseline file: ledger/content-gap-baseline.json  (alongside this file)
Gaps file:     content-gaps.json  (written by extraction; path configurable via --gaps)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Path constants
# ---------------------------------------------------------------------------

_HERE = Path(__file__).resolve().parent              # scripts/ledger/
_SCRIPTS_DIR = _HERE.parent                          # scripts/
_DEFAULT_GAPS_PATH = _SCRIPTS_DIR / "content-gaps.json"
_BASELINE_PATH = _HERE / "content-gap-baseline.json"


# ---------------------------------------------------------------------------
# Identity key — stable, deterministic, NOT line-keyed (STOP-17)
# ---------------------------------------------------------------------------

def _gap_key(block: str, attr_or_slot: str, fixture: str) -> str:
    """Build a stable identity key for a single ContentGap record.

    Format: '<block>|<attr_or_slot>|<fixture>'

    Keyed on (block, attr_or_slot, fixture) identity — never on line number,
    run index, or detail text (those change without the underlying gap changing).
    Matches STOP-17: line-independent baseline keys.
    """
    return f"{block}|{attr_or_slot}|{fixture}"


# ---------------------------------------------------------------------------
# SHA-256 self-blessing (mirrors coverage_check.py _compute_hash)
# ---------------------------------------------------------------------------

def _compute_hash(keys: list[str]) -> str:
    """SHA-256 of the sorted, newline-joined key list.

    Any hand-edit to the baseline JSON that alters the 'keys' list without
    recomputing this hash is caught on --check (self-blessing protection).
    Mirrors coverage_check.py _compute_hash exactly.
    """
    payload = "\n".join(sorted(keys)).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


# ---------------------------------------------------------------------------
# Baseline I/O
# ---------------------------------------------------------------------------

def _load_baseline(baseline_path: Path) -> tuple[set[str], str | None]:
    """Return (baseline_keys, stored_hash).

    stored_hash is None if the file does not exist or is malformed.
    A missing baseline is not an error — it means the gate has never been
    armed and all current gaps would be NEW (expected before first baseline).
    """
    if not baseline_path.exists():
        return set(), None
    try:
        data = json.loads(baseline_path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            keys = set(data.get("keys", []))
            stored_hash: str | None = data.get("hash")
            return keys, stored_hash
        # Graceful: a plain list (legacy / hand-constructed) → no hash.
        if isinstance(data, list):
            return set(data), None
    except Exception:
        pass
    return set(), None


def _save_baseline(keys: set[str], baseline_path: Path) -> None:
    """Write the baseline in the hashed format.

    Format: {"hash": "<sha256>", "keys": [...sorted...]}
    The ONLY legitimate way to update the baseline is via --update-baseline.
    Any hand-edit that changes 'keys' without recomputing 'hash' is caught
    on the next --check run.
    """
    sorted_keys = sorted(keys)
    data = {
        "hash": _compute_hash(sorted_keys),
        "keys": sorted_keys,
    }
    baseline_path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Gap record loading
# ---------------------------------------------------------------------------

def _load_gaps(gaps_path: Path) -> list[dict] | None:
    """Load ContentGap records from the per-run file.

    Returns None if the file does not exist (fail-safe — absent file = no run
    = no gaps to complain about). Returns the parsed list (may be empty) if
    the file exists. Raises ValueError on parse failure (malformed JSON).
    """
    if not gaps_path.exists():
        return None
    try:
        data = json.loads(gaps_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"content-gaps.json is not valid JSON: {exc}. "
            "The extraction pipeline may have written a partial file."
        ) from exc
    if not isinstance(data, list):
        raise ValueError(
            f"content-gaps.json must be a JSON list; got {type(data).__name__}. "
            "Expected: [{\"block\":..., \"attr_or_slot\":..., \"fixture\":..., \"detail\":...}, ...]"
        )
    return data


# ---------------------------------------------------------------------------
# Core check logic — importable API
# ---------------------------------------------------------------------------

def check(
    gaps_path: Path | str,
    baseline_path: Path | str,
) -> tuple[int, list[str]]:
    """Check whether the current run produced any NEW ContentGaps not in the baseline.

    This is the importable API so tests can call it directly without subprocess.

    Args:
        gaps_path:     Path to content-gaps.json (the per-run ContentGap list).
        baseline_path: Path to content-gap-baseline.json (the committed baseline).

    Returns:
        (exit_code, violations) where:
          exit_code = 0 → clean (all gaps baselined, or no run file present)
          exit_code = 1 → NEW gap(s) found (commit-blocking)
          violations = list of plain-English strings describing each NEW gap.
    """
    gaps_path = Path(gaps_path)
    baseline_path = Path(baseline_path)

    # --- Load gaps (fail-safe: absent file = zero gaps = clean) ---
    try:
        gaps = _load_gaps(gaps_path)
    except ValueError as exc:
        # Malformed file is a hard fail: something wrote a broken gaps file.
        return 1, [
            f"CONTENT-GAP GATE ERROR — {gaps_path.name} is malformed: {exc}",
        ]

    if gaps is None:
        # File absent → no run → treat as zero gaps → clean.
        return 0, []

    # --- Build gap keys ---
    current_keys: set[str] = set()
    malformed_records: list[int] = []
    for i, record in enumerate(gaps):
        block = record.get("block", "")
        attr_or_slot = record.get("attr_or_slot", "")
        fixture = record.get("fixture", "")
        if not block or not attr_or_slot:
            malformed_records.append(i)
            continue
        current_keys.add(_gap_key(block, attr_or_slot, fixture))

    # --- Load baseline ---
    baseline_keys, stored_hash = _load_baseline(baseline_path)

    # --- SHA integrity check (self-blessing protection) ---
    if baseline_keys and stored_hash is not None:
        expected_hash = _compute_hash(sorted(baseline_keys))
        if expected_hash != stored_hash:
            return 1, [
                "CONTENT-GAP GATE FAILED — the baseline file has been TAMPERED.\n"
                f"  Stored hash:   {stored_hash}\n"
                f"  Expected hash: {expected_hash}\n"
                "  The 'keys' list was modified without recomputing the hash.\n"
                "  Run --update-baseline to produce a legitimate baseline.\n"
                "  Do NOT hand-edit the baseline JSON.",
            ]

    # --- Find NEW gaps (not in baseline) ---
    new_keys = current_keys - baseline_keys
    violations: list[str] = []

    # Malformed records are a structural violation — exit 1.
    # A record missing 'block' or 'attr_or_slot' cannot be keyed against the baseline,
    # which means it could silently suppress a real gap.  Treat it as a hard fail.
    for i in malformed_records:
        violations.append(
            f"  MALFORMED RECORD: record #{i} in {gaps_path.name} is missing 'block' or "
            f"'attr_or_slot' — could not be keyed. Record: {gaps[i]!r}"
        )

    if malformed_records:
        # Malformed records force exit 1 regardless of whether there are new keys.
        # Include any new-gap violations below before returning.
        pass

    if not new_keys and not malformed_records:
        return 0, violations  # all gaps baselined (no malformed records)

    # Build a lookup for richer reporting.
    key_to_detail: dict[str, str] = {}
    for record in gaps:
        block = record.get("block", "")
        attr_or_slot = record.get("attr_or_slot", "")
        fixture = record.get("fixture", "")
        detail = record.get("detail", "")
        if block and attr_or_slot:
            k = _gap_key(block, attr_or_slot, fixture)
            if k not in key_to_detail:
                key_to_detail[k] = detail

    for key in sorted(new_keys):
        detail = key_to_detail.get(key, "")
        parts = key.split("|", 2)
        block_name = parts[0] if len(parts) > 0 else "?"
        slot_name = parts[1] if len(parts) > 1 else "?"
        fixture_name = parts[2] if len(parts) > 2 else "(no fixture)"

        plain_msg = (
            f"  NEW ContentGap: block={block_name!r}, slot/attr={slot_name!r}, "
            f"fixture={fixture_name!r}"
        )
        if detail:
            plain_msg += f"\n    Detail: {detail}"
        plain_msg += (
            "\n    What to do: this content stopped transferring — flag to developer "
            "or add the slot mapping to the database."
        )
        violations.append(plain_msg)

    return 1, violations


# ---------------------------------------------------------------------------
# Report formatting
# ---------------------------------------------------------------------------

def _print_report(gaps: list[dict] | None, baseline_keys: set[str]) -> None:
    """Print a plain-English report of all ContentGaps (--report mode)."""
    print("=" * 70)
    print("  F5 ContentGap Visibility Gate")
    print("  plans/2026-06-26-stage3-child-shape-fork-design.md §4 + §6")
    print("=" * 70)
    print()

    if gaps is None:
        print("  content-gaps.json absent — no pipeline run has produced gaps yet.")
        print("  GATE: GREEN (fail-safe: absent file = no run = zero gaps).")
        print()
        return

    if not gaps:
        print("  content-gaps.json present but empty — zero ContentGaps this run.")
        print("  GATE: GREEN.")
        print()
        return

    new_gaps: list[dict] = []
    baselined_gaps: list[dict] = []

    for record in gaps:
        block = record.get("block", "")
        attr_or_slot = record.get("attr_or_slot", "")
        fixture = record.get("fixture", "")
        if not block or not attr_or_slot:
            continue
        k = _gap_key(block, attr_or_slot, fixture)
        if k in baseline_keys:
            baselined_gaps.append(record)
        else:
            new_gaps.append(record)

    print(f"  Total gaps this run:   {len(gaps)}")
    print(f"    — NEW (not baselined): {len(new_gaps)}")
    print(f"    — Baselined (known):   {len(baselined_gaps)}")
    print()

    for record in new_gaps:
        print(
            f"  [NEW]       block={record.get('block','?')!r}  "
            f"slot/attr={record.get('attr_or_slot','?')!r}  "
            f"fixture={record.get('fixture','')!r}"
        )
        if record.get("detail"):
            print(f"    {record['detail']}")

    for record in baselined_gaps:
        print(
            f"  [baselined] block={record.get('block','?')!r}  "
            f"slot/attr={record.get('attr_or_slot','?')!r}  "
            f"fixture={record.get('fixture','')!r}"
        )

    print()
    if new_gaps:
        print(
            f"  GATE: {len(new_gaps)} NEW gap(s) — these content items stopped transferring "
            "and are NOT in the baseline."
        )
    else:
        n = len(baselined_gaps)
        if n > 0:
            print(
                f"  GATE: GREEN — all {n} gap(s) are baselined (known DB data limits). "
                "Shrink the baseline by adding role/derived_selector to the DB."
            )
        else:
            print("  GATE: GREEN — 0 ContentGaps.")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "F5 ContentGap Visibility Gate. "
            "Reads content-gaps.json (per-run ContentGap list from Stage-3 extraction) "
            "and fails on any NEW gap not in the committed baseline."
        )
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--report",
        action="store_true",
        default=False,
        help="Print all findings and exit 0.",
    )
    mode.add_argument(
        "--check",
        action="store_true",
        default=False,
        help=(
            "Exit 1 if any ContentGap is NOT in the baseline file. "
            "Exits 0 if all gaps are baselined or if content-gaps.json is absent."
        ),
    )
    mode.add_argument(
        "--update-baseline",
        action="store_true",
        default=False,
        help=(
            "Write all current ContentGap keys to the baseline file and exit 0. "
            "Run this after the extraction is built (arming sequence from §6). "
            "Do NOT blindly baseline without understanding each finding."
        ),
    )
    parser.add_argument(
        "--gaps",
        type=Path,
        default=None,
        help=f"Path to content-gaps.json (default: {_DEFAULT_GAPS_PATH}).",
    )
    parser.add_argument(
        "--baseline",
        type=Path,
        default=None,
        help=f"Path to content-gap-baseline.json (default: {_BASELINE_PATH}).",
    )
    args = parser.parse_args(argv)

    # Default mode is --report.
    if not args.check and not args.update_baseline:
        args.report = True

    gaps_path = args.gaps or _DEFAULT_GAPS_PATH
    baseline_path = args.baseline or _BASELINE_PATH

    # --- Load gaps ---
    try:
        gaps = _load_gaps(gaps_path)
    except ValueError as exc:
        print(f"[content-gap-check] ERROR — {exc}", file=sys.stderr)
        return 1

    # --- Update baseline ---
    if args.update_baseline:
        if gaps is None:
            _save_baseline(set(), baseline_path)
            print(
                f"[content-gap-check] Baseline updated — 0 key(s) written to {baseline_path} "
                "(content-gaps.json absent; empty baseline)."
            )
            return 0
        keys: set[str] = set()
        for record in gaps:
            block = record.get("block", "")
            attr_or_slot = record.get("attr_or_slot", "")
            fixture = record.get("fixture", "")
            if block and attr_or_slot:
                keys.add(_gap_key(block, attr_or_slot, fixture))
        _save_baseline(keys, baseline_path)
        print(
            f"[content-gap-check] Baseline updated — {len(keys)} key(s) written to {baseline_path}."
        )
        return 0

    # --- Load baseline (for report + check) ---
    baseline_keys, stored_hash = _load_baseline(baseline_path)

    if args.report:
        _print_report(gaps, baseline_keys)
        return 0

    # --- --check ---
    exit_code, violations = check(gaps_path, baseline_path)

    # Print a summary (the violations list has all detail).
    if not violations and exit_code == 0:
        if gaps is None:
            print(
                "[content-gap-check] Gate passed — content-gaps.json absent "
                "(no run, fail-safe)."
            )
        elif not gaps:
            print("[content-gap-check] Gate passed — 0 ContentGaps this run.")
        else:
            print(
                f"[content-gap-check] Gate passed — all {len(gaps)} gap(s) are baselined."
            )
        return 0

    for msg in violations:
        print(msg)

    if exit_code != 0:
        # Check if it was a tamper or new-gaps failure.
        has_tamper = any("TAMPERED" in m for m in violations)
        new_count = sum(1 for m in violations if "NEW ContentGap" in m)
        if has_tamper:
            print(
                "\n[content-gap-check] GATE FAILED — baseline tampered (see above)."
            )
        else:
            print(
                f"\n[content-gap-check] GATE FAILED — {new_count} NEW ContentGap(s) not in baseline.\n"
                "  Each NEW gap means content that was previously transferring has stopped, "
                "OR this is the first run after adding new content extraction.\n"
                "  Options:\n"
                "    1. Fix the pipeline so the content transfers again (preferred).\n"
                "    2. Run --update-baseline to accept the current gaps as known "
                "(only after understanding each one)."
            )

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
