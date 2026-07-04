"""
ledger.content_coverage_check — F5 CONTENT coverage-conservation gate (Step 11/A2).

Spec ref: .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md §12.2.1 (ledger keystone,
extended to the CONTENT routing-unit stream alongside the existing CSS stream).

WHAT THIS MODULE DOES (the CONTENT UNACCOUNTED leg)
----------------------------------------------------
Computes the CONTENT-side sibling of ledger.coverage_check's CSS invariant:

    UNACCOUNTED = declared_content_units − (present_in_emitted_markup
                                              ∪ present_in_content_gaps
                                              ∪ excluded_chrome)

where:
  • declared_content_units = every content_text / content_media InputDecl row
    produced by ledger.declare_input.declare_content() for the draft HTML.
  • present_in_emitted_markup = the unit's normalised value is found as a
    substring of the run's emitted page markup (text units: normalised
    visible-text substring match; media units: src basename match).
  • present_in_content_gaps = the unit's value is named by a record in the
    run's content-gaps.json (F5 ContentGap channel — ledger.content_gap_check).
  • excluded_chrome = the unit is nested under a top-level <header>/<footer>/
    <nav> in the draft (FR-31-3 walker exception 2 — chrome-skip). These are
    EXCLUDED-WITH-REASON, never silently dropped: they are reported, just not
    counted as UNACCOUNTED (declare_content() already marks them via
    InputDecl.excluded_candidate).

UNACCOUNTED > 0 means a piece of draft content was never transferred anywhere
this gate can see — the gate FAILS on any NEW unaccounted key not already in
the committed baseline (STOP-14 baseline-before-arming, mirrors coverage_check
and content_gap_check exactly).

FAIL-SAFE (mirrors content_gap_check.py)
-----------------------------------------
If the run's emitted-markup artefact is absent (no pipeline run has produced
one, or --markup was not passed), the gate exits 0 with a note — it does NOT
fail merely because no run happened yet. content-gaps.json being absent is
treated as zero gaps (a normal state, not a skip condition) since most runs
legitimately have none.

BASELINE (STOP-14 / STOP-17)
------------------------------
Key = (fixture, unit_kind, selector, value) identity tuple — NEVER a line
number. SHA-256 self-blessing mirrors coverage_check.py / content_gap_check.py:
a hand-edit to the baseline that alters 'keys' without recomputing the hash is
detected and rejected.

Usage (run from plugins/sgs-blocks/scripts/):
    python ledger/content_coverage_check.py --draft <path> --markup <path> \
        [--gaps <path>] --report
    python ledger/content_coverage_check.py --draft <path> --markup <path> --check
    python ledger/content_coverage_check.py --draft <path> --markup <path> \
        --update-baseline

Importable API:
    from ledger.content_coverage_check import check
    exit_code, violations = check(draft_path, markup_path, gaps_path, baseline_path)

Baseline file: ledger/content-coverage-baseline.json  (alongside this file)
"""
from __future__ import annotations

import argparse
import hashlib
import html as _html_mod
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Path constants
# ---------------------------------------------------------------------------

_HERE = Path(__file__).resolve().parent              # scripts/ledger/
_SCRIPTS_DIR = _HERE.parent                          # scripts/
_DEFAULT_GAPS_PATH = _SCRIPTS_DIR / "content-gaps.json"
_BASELINE_PATH = _HERE / "content-coverage-baseline.json"


# ---------------------------------------------------------------------------
# Lazy import (keep declare_content independent until runtime — mirrors
# coverage_check.py's _import_declare_input pattern)
# ---------------------------------------------------------------------------

def _import_declare_content():
    if str(_SCRIPTS_DIR) not in sys.path:
        sys.path.insert(0, str(_SCRIPTS_DIR))
    from ledger.declare_input import declare_content
    from ledger.models import DeclKind
    return declare_content, DeclKind


# ---------------------------------------------------------------------------
# Markup text normalisation (for the emitted-markup join)
# ---------------------------------------------------------------------------

_TAG_RE = re.compile(r"<[^>]+>")
_SCRIPT_STYLE_RE = re.compile(r"<(script|style|template)\b[^>]*>.*?</\1>", re.DOTALL | re.IGNORECASE)

# WordPress's wptexturize() rewrites plain ASCII punctuation to typographic
# equivalents on render (straight quotes -> curly, "--"/"-" -> en/em dash,
# "..." -> ellipsis). That is an EXPECTED, legitimate WP-native transform of
# content that DID transfer — not a drop. Without folding both sides to a
# common form, a real-run join would report false UNACCOUNTED noise on nearly
# every apostrophe-bearing sentence (verified against the 2026-07-04 Mama's
# Munches run: 6 of 23 raw hits were pure punctuation-fold false positives on
# otherwise-present paragraphs). Fold BOTH the draft value and the markup text
# before matching; the RAW declared value in the ledger artefact is untouched.
_PUNCT_FOLD = {
    "‘": "'", "’": "'", "‚": "'", "‛": "'",
    "“": '"', "”": '"', "„": '"', "‟": '"',
    "–": "-", "—": "-", "−": "-",
    "…": "...",
}
_PUNCT_FOLD_RE = re.compile("|".join(re.escape(k) for k in _PUNCT_FOLD))


def _fold_punctuation(text: str) -> str:
    """Fold typographic punctuation to plain ASCII equivalents for join matching."""
    return _PUNCT_FOLD_RE.sub(lambda m: _PUNCT_FOLD[m.group(0)], text)


def _extract_visible_text(markup_html: str) -> str:
    """Strip script/style/template blocks + all tags, unescape entities, collapse whitespace.

    Used for the content_text join: a declared unit's normalised value is
    checked as a substring of this stripped text.
    """
    no_script_style = _SCRIPT_STYLE_RE.sub(" ", markup_html)
    no_tags = _TAG_RE.sub(" ", no_script_style)
    unescaped = _html_mod.unescape(no_tags)
    collapsed = re.sub(r"\s+", " ", unescaped).strip()
    return _fold_punctuation(collapsed)


def _media_basename(src_or_tag: str) -> str:
    """Extract a comparable basename from a media src (strip query/fragment, take last path segment).

    Falls back to the raw value (e.g. a bare tag-name fallback like 'img' when
    the draft element had no src/data-src) when no path separator is present.
    """
    stripped = src_or_tag.split("?", 1)[0].split("#", 1)[0]
    stripped = stripped.rstrip("/")
    if "/" in stripped:
        return stripped.rsplit("/", 1)[-1]
    return stripped


# ---------------------------------------------------------------------------
# Identity key — stable, deterministic, NOT line-keyed (STOP-17)
# ---------------------------------------------------------------------------

def _content_key(fixture: str, unit_kind: str, selector: str, value: str) -> str:
    """Build a stable identity key for a single declared content unit.

    Format: '<fixture>|<unit_kind>|<selector>|<value>'
    """
    return f"{fixture}|{unit_kind}|{selector}|{value}"


# ---------------------------------------------------------------------------
# SHA-256 self-blessing (mirrors coverage_check.py / content_gap_check.py)
# ---------------------------------------------------------------------------

def _compute_hash(keys: list[str]) -> str:
    payload = "\n".join(sorted(keys)).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _load_baseline(baseline_path: Path) -> tuple[set[str], str | None]:
    if not baseline_path.exists():
        return set(), None
    try:
        data = json.loads(baseline_path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            keys = set(data.get("keys", []))
            stored_hash: str | None = data.get("hash")
            return keys, stored_hash
        if isinstance(data, list):
            return set(data), None
    except Exception:
        pass
    return set(), None


def _save_baseline(keys: set[str], baseline_path: Path) -> None:
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
# content-gaps.json loading (mirrors content_gap_check.py._load_gaps)
# ---------------------------------------------------------------------------

def _load_gaps(gaps_path: Path) -> list[dict] | None:
    """Return None if absent (fail-safe: no gaps recorded, not zero-list)."""
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
            f"content-gaps.json must be a JSON list; got {type(data).__name__}."
        )
    return data


def _gap_covers(gaps: list[dict], value: str) -> bool:
    """True if any ContentGap record names this declared value.

    A gap record documents content that stopped transferring — its presence
    means the DROP is already visible via the F5 ContentGap channel, so the
    content-coverage gate should not ALSO flag it as unaccounted (that would
    be double-bookkeeping the same drop through two channels). Match is a
    generous substring test across the record's stringified fields, since gap
    records don't carry the exact normalised text/media value.
    """
    if not value:
        return False
    needle = value.lower()
    for record in gaps:
        haystack = " ".join(
            str(record.get(k, "")) for k in ("block", "attr_or_slot", "fixture", "detail")
        ).lower()
        if needle in haystack or (len(needle) > 12 and haystack and needle[:40] in haystack):
            return True
    return False


# ---------------------------------------------------------------------------
# Core accounting — importable API
# ---------------------------------------------------------------------------

def analyse(
    draft_html: str,
    fixture_stem: str,
    markup_html: str | None,
    gaps: list[dict] | None,
) -> dict:
    """Run the CONTENT UNACCOUNTED analysis for one fixture/draft.

    Returns a summary dict:
        {
          'declared_count': int,
          'excluded_chrome_count': int,
          'accounted_markup_count': int,
          'accounted_gap_count': int,
          'unaccounted': [ {key, fixture, unit_kind, selector, value, reason}, ... ],
          'excluded': [ {key, fixture, unit_kind, selector, value}, ... ],
        }

    markup_html=None means no emitted-markup artefact was available — every
    non-chrome unit is treated as UNACCOUNTED (nothing to prove it landed) but
    callers (main()/check()) apply the FAIL-SAFE at a higher level: an absent
    markup artefact means "no run happened", not "everything regressed".
    """
    declare_content, DeclKind_cls = _import_declare_content()
    rows = declare_content(draft_html, fixture_stem)

    visible_text = _extract_visible_text(markup_html) if markup_html is not None else ""
    visible_text_lower = visible_text.lower()
    raw_markup_lower = (markup_html or "").lower()
    gaps_list = gaps or []

    unaccounted: list[dict] = []
    excluded: list[dict] = []
    accounted_markup = 0
    accounted_gap = 0

    for row in rows:
        unit_kind = row.kind.value
        key = _content_key(fixture_stem, unit_kind, row.selector, row.value)

        if row.excluded_candidate:
            excluded.append({
                "key": key,
                "fixture": fixture_stem,
                "unit_kind": unit_kind,
                "selector": row.selector,
                "value": row.value,
                "reason": "chrome-skip (top-level header/footer/nav, FR-31-3 exception 2)",
            })
            continue

        if not row.value:
            # An empty value (e.g. a media element with neither src/data-src
            # nor a resolvable tag fallback) cannot be joined — skip silently;
            # declare_content() always supplies a non-empty fallback today, so
            # this is a defensive no-op, not an expected path.
            continue

        in_markup = False
        if markup_html is not None:
            if row.kind == DeclKind_cls.content_media:
                basename = _media_basename(row.value)
                in_markup = bool(basename) and basename.lower() in raw_markup_lower
            else:
                needle = _fold_punctuation(row.value).lower()
                in_markup = needle in visible_text_lower

        in_gaps = _gap_covers(gaps_list, row.value)

        if in_markup:
            accounted_markup += 1
            continue
        if in_gaps:
            accounted_gap += 1
            continue

        unaccounted.append({
            "key": key,
            "fixture": fixture_stem,
            "unit_kind": unit_kind,
            "selector": row.selector,
            "value": row.value,
        })

    return {
        "declared_count": len(rows),
        "excluded_chrome_count": len(excluded),
        "accounted_markup_count": accounted_markup,
        "accounted_gap_count": accounted_gap,
        "unaccounted": unaccounted,
        "excluded": excluded,
    }


def check(
    draft_path: Path | str,
    markup_path: Path | str | None,
    gaps_path: Path | str,
    baseline_path: Path | str,
) -> tuple[int, list[str]]:
    """Check whether the current run produced any NEW unaccounted content unit.

    Returns:
        (exit_code, violations) where:
          exit_code = 0 → clean (all unaccounted baselined, or no markup artefact present)
          exit_code = 1 → NEW unaccounted unit(s) found, or tampered baseline
          violations = list of plain-English strings.
    """
    draft_path = Path(draft_path)
    baseline_path = Path(baseline_path)
    gaps_path = Path(gaps_path)

    if not draft_path.exists():
        return 1, [f"CONTENT-COVERAGE GATE ERROR — draft not found: {draft_path}"]

    # FAIL-SAFE: no emitted-markup artefact = no run happened yet = clean.
    markup_html: str | None = None
    if markup_path is not None:
        markup_path = Path(markup_path)
        if markup_path.exists():
            markup_html = markup_path.read_text(encoding="utf-8")
    if markup_html is None:
        return 0, []

    draft_html = draft_path.read_text(encoding="utf-8")
    fixture_stem = draft_path.stem
    if fixture_stem.endswith(".draft"):
        fixture_stem = fixture_stem[: -len(".draft")]

    try:
        gaps = _load_gaps(gaps_path)
    except ValueError as exc:
        return 1, [f"CONTENT-COVERAGE GATE ERROR — {gaps_path.name} is malformed: {exc}"]

    summary = analyse(draft_html, fixture_stem, markup_html, gaps)

    baseline_keys, stored_hash = _load_baseline(baseline_path)

    if baseline_keys and stored_hash is not None:
        expected_hash = _compute_hash(sorted(baseline_keys))
        if expected_hash != stored_hash:
            return 1, [
                "CONTENT-COVERAGE GATE FAILED — the baseline file has been TAMPERED.\n"
                f"  Stored hash:   {stored_hash}\n"
                f"  Expected hash: {expected_hash}\n"
                "  The 'keys' list was modified without recomputing the hash.\n"
                "  Run --update-baseline to produce a legitimate baseline.\n"
                "  Do NOT hand-edit the baseline JSON.",
            ]

    current_keys = {e["key"] for e in summary["unaccounted"]}
    new_keys = current_keys - baseline_keys
    if not new_keys:
        return 0, []

    key_to_entry = {e["key"]: e for e in summary["unaccounted"]}
    violations: list[str] = []
    for key in sorted(new_keys):
        entry = key_to_entry[key]
        violations.append(
            f"  NEW UNACCOUNTED content unit: fixture={entry['fixture']!r}, "
            f"kind={entry['unit_kind']!r}, selector={entry['selector']!r}, "
            f"value={entry['value']!r}\n"
            "    What to do: this content unit is not present in the emitted markup, "
            "not named in content-gaps.json, and not chrome-excluded. Either fix the "
            "pipeline so it transfers, or run --update-baseline to accept it as a "
            "known/tracked residual."
        )
    return 1, violations


# ---------------------------------------------------------------------------
# Report formatting
# ---------------------------------------------------------------------------

def _print_report(summary: dict | None, baseline_keys: set[str], markup_present: bool) -> None:
    print("=" * 70)
    print("  F5 CONTENT Coverage-Conservation Gate — UNACCOUNTED leg")
    print("  Spec 31 §12.2.1 (extended to the CONTENT routing-unit stream)")
    print("=" * 70)
    print()

    if not markup_present or summary is None:
        print("  No emitted-markup artefact available — no pipeline run to account against.")
        print("  GATE: GREEN (fail-safe: absent artefact = no run = nothing to check).")
        print()
        return

    unaccounted = summary["unaccounted"]
    new_entries = [e for e in unaccounted if e["key"] not in baseline_keys]
    baselined_entries = [e for e in unaccounted if e["key"] in baseline_keys]

    print(f"  Declared content units:       {summary['declared_count']}")
    print(f"  Chrome-excluded (header/footer/nav): {summary['excluded_chrome_count']}")
    print(f"  Accounted via emitted markup: {summary['accounted_markup_count']}")
    print(f"  Accounted via content-gaps:   {summary['accounted_gap_count']}")
    print(f"  Total UNACCOUNTED:            {len(unaccounted)}")
    print(f"    — NEW (not in baseline):    {len(new_entries)}")
    print(f"    — Baselined (known):        {len(baselined_entries)}")
    print()

    for e in new_entries:
        print(f"  [NEW]       kind={e['unit_kind']!r}  selector={e['selector']!r}  value={e['value']!r}")
    for e in baselined_entries:
        print(f"  [baselined] kind={e['unit_kind']!r}  selector={e['selector']!r}  value={e['value']!r}")

    print()
    if new_entries:
        print(
            f"  GATE: {len(new_entries)} NEW unaccounted content unit(s) — dropped content "
            "not visible via markup, content-gaps, or chrome-exclusion."
        )
    else:
        n = len(baselined_entries)
        print(f"  GATE: GREEN — {'0 unaccounted content units.' if n == 0 else f'all {n} unaccounted unit(s) are baselined.'}")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "F5 CONTENT Coverage-Conservation Gate. Computes UNACCOUNTED = "
            "declared_content_units - (in_markup ∪ in_content_gaps ∪ chrome_excluded)."
        )
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--report", action="store_true", default=False)
    mode.add_argument("--check", action="store_true", default=False)
    mode.add_argument("--update-baseline", action="store_true", default=False)
    parser.add_argument(
        "--draft", type=Path, default=None,
        help=(
            "Path to the draft HTML (the input the pipeline cloned from). "
            "Omitted (e.g. the commit-gate's bare --check with no per-fixture target "
            "configured) → fail-safe GREEN, same rationale as an absent --markup: "
            "no target means nothing to account against, not a violation."
        ),
    )
    parser.add_argument(
        "--markup", type=Path, default=None,
        help=(
            "Path to the run's emitted page markup (e.g. a saved live page-source "
            "capture). Absent/omitted → fail-safe GREEN (no run to check against)."
        ),
    )
    parser.add_argument(
        "--gaps", type=Path, default=None,
        help=f"Path to content-gaps.json (default: {_DEFAULT_GAPS_PATH}).",
    )
    parser.add_argument(
        "--baseline", type=Path, default=None,
        help=f"Path to content-coverage-baseline.json (default: {_BASELINE_PATH}).",
    )
    args = parser.parse_args(argv)

    if not args.check and not args.update_baseline:
        args.report = True

    gaps_path = args.gaps or _DEFAULT_GAPS_PATH
    baseline_path = args.baseline or _BASELINE_PATH

    if args.draft is None:
        # Fail-safe (mirrors an absent --markup): no per-fixture target was
        # configured for this invocation (e.g. the commit-gate's bare
        # `--check` with no run-specific args) — nothing to account against.
        if args.update_baseline:
            print("[content-coverage-check] No --draft given — nothing to baseline.")
            return 0
        print(
            "[content-coverage-check] No --draft given — no target configured, "
            "nothing to check (fail-safe GREEN)."
        )
        return 0

    if not args.draft.exists():
        print(f"[content-coverage-check] ERROR — draft not found: {args.draft}", file=sys.stderr)
        return 1

    draft_html = args.draft.read_text(encoding="utf-8")
    fixture_stem = args.draft.stem
    if fixture_stem.endswith(".draft"):
        fixture_stem = fixture_stem[: -len(".draft")]

    markup_html: str | None = None
    if args.markup is not None and args.markup.exists():
        markup_html = args.markup.read_text(encoding="utf-8")

    try:
        gaps = _load_gaps(gaps_path)
    except ValueError as exc:
        print(f"[content-coverage-check] ERROR — {exc}", file=sys.stderr)
        return 1

    if args.update_baseline:
        if markup_html is None:
            print(
                "[content-coverage-check] No emitted-markup artefact — nothing to baseline "
                "(baseline left unchanged)."
            )
            return 0
        summary = analyse(draft_html, fixture_stem, markup_html, gaps)
        keys = {e["key"] for e in summary["unaccounted"]}
        _save_baseline(keys, baseline_path)
        print(
            f"[content-coverage-check] Baseline updated — {len(keys)} key(s) written to {baseline_path}."
        )
        return 0

    baseline_keys, stored_hash = _load_baseline(baseline_path)

    if args.report:
        summary = None
        if markup_html is not None:
            summary = analyse(draft_html, fixture_stem, markup_html, gaps)
        _print_report(summary, baseline_keys, markup_present=markup_html is not None)
        return 0

    # --check
    exit_code, violations = check(args.draft, args.markup, gaps_path, baseline_path)

    if exit_code == 0 and not violations:
        if markup_html is None:
            print(
                "[content-coverage-check] Gate passed — no emitted-markup artefact "
                "(no run, fail-safe)."
            )
        else:
            print("[content-coverage-check] Gate passed — all unaccounted units are baselined.")
        return 0

    for msg in violations:
        print(msg)

    if exit_code != 0:
        has_tamper = any("TAMPERED" in m for m in violations)
        new_count = sum(1 for m in violations if "NEW UNACCOUNTED" in m)
        if has_tamper:
            print("\n[content-coverage-check] GATE FAILED — baseline tampered (see above).")
        else:
            print(
                f"\n[content-coverage-check] GATE FAILED — {new_count} NEW unaccounted content "
                "unit(s) not in baseline.\n"
                "  Options:\n"
                "    1. Fix the pipeline so the content transfers again (preferred).\n"
                "    2. Run --update-baseline to accept the current residuals as known "
                "(only after understanding each one)."
            )

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
