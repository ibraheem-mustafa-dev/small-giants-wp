#!/usr/bin/env python3
"""Diagnostic: decompose the oracle's unattributed-cell count into named buckets.

READ-ONLY. Changes nothing, probes nothing, deploys nothing. It CALLS the real
``attribute_cells_to_sections`` over the fixture corpus and explains its answer.

It used to re-implement that function's reject branches instead. That made it
describe a COPY of the algorithm, so when attribution changed the numbers here
stayed frozen — a tool that would have reported "393 unattributed, unchanged"
after a fix that took it to 2. It now derives every figure from the attributor
itself; the classification below only explains a rejection the attributor made.

Why this exists (Spec 31 §5 / §7b):
    ``batch-report.json`` emits ``total_unattributed_cells`` as a bare integer
    with no denominator and no cause breakdown. A bare count can fall for three
    indistinguishable reasons — attribution genuinely improved, fewer rows were
    declared, or a fixture left the corpus. The cause split has to be on record
    so a change is judged against a prediction, not against its own output.

Buckets:
    ATTRIBUTED-NO-PROBE-TARGET
                         attributed to the right section, but the draft's
                         element token is not one the DB records this block as
                         rendering, so there is no clone element to read the
                         value on. These cells are marked unmeasurable and
                         resolve UNVERIFIED — they can never be LANDED. This is
                         the honest residue, and each is a §5 GAP candidate.
                         Watch ``measurable_rate_pct``, not ``attribution_rate_pct``:
                         attributing a cell you cannot measure is not progress.
    NON-SIMPLE-SELECTOR  the selector resolved to nothing in the draft DOM and
                         is not a bare single class (id, at-rule,
                         attribute-qualified, or a non-selector emission like
                         ``[inline:<path>]``) — a dead rule, sub-classified by
                         shape so the residue is not one opaque lump
    ZERO-SECTION-MATCH   resolved, but to no node inside any discovered section
    MULTI-SECTION-MATCH  resolved into >1 section (ambiguous, cannot be assigned)
    TIER-VALIDATION      CellInput rejected the row's tier vocabulary

Usage:
    python scripts/oracle/decompose_unattributed.py            # human report
    python scripts/oracle/decompose_unattributed.py --json     # machine output
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_SCRIPTS = _HERE.parent
for _p in (str(_SCRIPTS), str(_HERE)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from oracle.batch_runner import (  # noqa: E402
    _owning_section_id,
    _relevant_declared_rows,
    _resolve_section_nodes,
    _section_class_sets,
    attribute_cells_to_sections,
    discover_fixtures,
    discover_sections,
)
from oracle.element_probe import split_pseudo  # noqa: E402
from oracle.models import CellInput  # noqa: E402

_DEFAULT_PHASE_F = _SCRIPTS / "tests" / "fixtures" / "phase-f"
_DEFAULT_CONFORMANCE = _SCRIPTS / "tests" / "fixtures" / "conformance"

# A BEM element/modifier class — the shape that cannot attribute today because
# it is declared on a descendant, not on a section root.
_BEM_DESCENDANT_RE = re.compile(r"^\.[A-Za-z0-9-]+(__|--)")


def _classify_selector(selector: str) -> str:
    """Sub-classify a non-simple selector so the residue is not one opaque lump."""
    s = selector.strip()
    if s.startswith("[inline:"):
        return "inline-style-emission"
    if s.startswith("@"):
        return "at-rule"
    if "::" in s:
        return "pseudo-element"
    if ":" in s:
        return "pseudo-class"
    if "[" in s:
        return "attribute-qualified"
    if any(c in s for c in (" ", ">", "+", "~")):
        return "combinator"
    if s.startswith("#"):
        return "id"
    return "other"


def decompose(phase_f_dir: Path, conformance_dir: Path) -> dict:
    from bs4 import BeautifulSoup

    fixtures = discover_fixtures(phase_f_dir, conformance_dir)
    buckets: Counter = Counter()
    sub_nonsimple: Counter = Counter()
    per_fixture: dict[str, dict] = {}
    bem_descendant = 0
    zero_match_examples: list[str] = []

    total_declared = 0
    total_attributed = 0
    total_unmeasurable = 0

    for stem, draft_path in fixtures:
        try:
            draft_html = draft_path.read_text(encoding="utf-8")
        except OSError:
            continue

        sections = discover_sections(draft_html)
        try:
            rows = _relevant_declared_rows(draft_html)
        except Exception:
            continue

        class_sets = _section_class_sets(draft_html, sections)
        soup = BeautifulSoup(draft_html, "html.parser")
        section_nodes, _collisions = _resolve_section_nodes(soup, sections)
        fx_b: Counter = Counter()

        # Ask the REAL attributor, then explain its answer. Re-deriving the
        # verdict here would make this tool describe a copy of the algorithm
        # rather than the algorithm — so a change to attribution would leave
        # these numbers frozen and read as "the fix did nothing".
        by_section, _unattr = attribute_cells_to_sections(draft_html, sections, rows)
        attributed_keys: Counter = Counter()
        unmeasurable_keys: Counter = Counter()
        for cells in by_section.values():
            for c in cells:
                key = (c.property, c.tier, str(c.draft_value))
                attributed_keys[key] += 1
                if not c.written:
                    unmeasurable_keys[key] += 1

        seen: Counter = Counter()
        for row in rows:
            total_declared += 1
            sel = row.selector.strip()
            key = (row.property, row.tier, str(row.value))
            seen[key] += 1
            is_attributed = seen[key] <= attributed_keys.get(key, 0)

            if is_attributed:
                total_attributed += 1
                # An attributed cell still splits two ways, and the difference
                # matters more than the headline: MEASURABLE cells can reach a
                # verdict, UNMEASURABLE ones are attributed to the right section
                # but have no clone element to read, so they resolve UNVERIFIED
                # and can never be LANDED (Spec 31 §7b). Reporting only the
                # attribution rate would hide that second group entirely.
                if seen[key] <= unmeasurable_keys.get(key, 0):
                    buckets["ATTRIBUTED-NO-PROBE-TARGET"] += 1
                    fx_b["ATTRIBUTED-NO-PROBE-TARGET"] += 1
                    total_unmeasurable += 1
                continue

            # Not attributed — say WHY.
            #
            # OWNERSHIP is checked BEFORE selector shape. Checking shape first
            # was wrong once the attributor started resolving combinators: a
            # combinator selector rejected for spanning TWO sections would be
            # filed as "NON-SIMPLE-SELECTOR / combinator", blaming its shape for
            # a rejection that was actually about ambiguous ownership. The
            # bucket would lie about the cause while the total stayed right.
            try:
                tier_ok = True
                CellInput(
                    property=row.property, tier=row.tier, draft_value=row.value,
                    computed_value=None, expected_default=None, written=True,
                )
            except ValueError:
                tier_ok = False
            if not tier_ok:
                buckets["TIER-VALIDATION"] += 1
                fx_b["TIER-VALIDATION"] += 1
                continue

            base_sel, _ps = split_pseudo(sel)
            try:
                matched_nodes = soup.select(sel)
            except Exception:
                matched_nodes = []
            if not matched_nodes and base_sel != sel:
                try:
                    matched_nodes = soup.select(base_sel)
                except Exception:
                    matched_nodes = []
            owners = {oid for n in matched_nodes
                      if (oid := _owning_section_id(n, section_nodes)) is not None}

            if len(owners) > 1:
                buckets["MULTI-SECTION-MATCH"] += 1
                fx_b["MULTI-SECTION-MATCH"] += 1
                continue
            if matched_nodes:
                # Resolved to real nodes, but none inside a discovered section.
                buckets["ZERO-SECTION-MATCH"] += 1
                fx_b["ZERO-SECTION-MATCH"] += 1
                if _BEM_DESCENDANT_RE.match(sel):
                    bem_descendant += 1
                if len(zero_match_examples) < 15:
                    zero_match_examples.append(f"{stem}: {sel} {{{row.property}}}")
                continue
            # Resolved to nothing at all — a dead rule. Sub-classify by shape so
            # the residue is not one opaque lump.
            buckets["NON-SIMPLE-SELECTOR"] += 1
            fx_b["NON-SIMPLE-SELECTOR"] += 1
            sub_nonsimple[_classify_selector(sel)] += 1

        if fx_b:
            per_fixture[stem] = dict(fx_b)

    # ATTRIBUTED-NO-PROBE-TARGET cells ARE attributed — they are counted in a
    # bucket for visibility, so they must not also inflate the unattributed
    # total. Deriving the total from the declared/attributed difference keeps
    # the two figures reconcilable by arithmetic.
    unattributed = total_declared - total_attributed
    return {
        "tool": "decompose_unattributed",
        "read_only": True,
        "derived_from": "oracle.batch_runner.attribute_cells_to_sections (the real "
                        "attributor, not a re-implementation of its reject branches)",
        "total_declared_cells": total_declared,
        "total_attributed_cells": total_attributed,
        "total_unattributed_cells": unattributed,
        "attributed_but_unmeasurable_cells": total_unmeasurable,
        "measurable_cells": total_attributed - total_unmeasurable,
        "attribution_rate_pct": round(total_attributed / total_declared * 100, 1) if total_declared else 0.0,
        "measurable_rate_pct": (
            round((total_attributed - total_unmeasurable) / total_declared * 100, 1)
            if total_declared else 0.0
        ),
        "buckets": dict(buckets.most_common()),
        "non_simple_breakdown": dict(sub_nonsimple.most_common()),
        "zero_match_that_are_bem_descendants": bem_descendant,
        "zero_match_examples": zero_match_examples,
        "per_fixture": dict(sorted(per_fixture.items(), key=lambda kv: -sum(kv[1].values()))),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    ap.add_argument("--fixtures-dir", type=Path, default=_DEFAULT_PHASE_F)
    ap.add_argument("--conformance-dir", type=Path, default=_DEFAULT_CONFORMANCE)
    args = ap.parse_args()

    r = decompose(args.fixtures_dir, args.conformance_dir)

    if args.json:
        print(json.dumps(r, indent=2))
        return 0

    print("=" * 68)
    print("  Unattributed-cell decomposition (read-only diagnostic)")
    print("=" * 68)
    declared = r["total_declared_cells"] or 1
    print(f"  declared cells          : {r['total_declared_cells']}")
    print(f"  attributed              : {r['total_attributed_cells']}"
          f"  ({r['attribution_rate_pct']}%)")
    print(f"  unattributed            : {r['total_unattributed_cells']}")
    print(f"  -> MEASURABLE           : {r['measurable_cells']}"
          f"  ({r['measurable_rate_pct']}%)   <- the figure that matters")
    print(f"  -> attributed, no probe : {r['attributed_but_unmeasurable_cells']}"
          "   (resolve UNVERIFIED; each is a Spec 31 §5 GAP candidate)")
    # Every bucket is shown as a share of DECLARED cells. Showing them as a
    # share of "unattributed" produced 13300% once ATTRIBUTED-NO-PROBE-TARGET
    # arrived, because that bucket is not part of the unattributed total.
    print("\n  Bucket breakdown (share of DECLARED cells):")
    for k, v in r["buckets"].items():
        print(f"    {k:28} {v:5}  ({v / declared * 100:.1f}%)")
    if r["non_simple_breakdown"]:
        print("\n  Dead-rule breakdown (selector resolved to nothing in the draft):")
        for k, v in r["non_simple_breakdown"].items():
            print(f"    {k:28} {v:5}")
    if r["zero_match_that_are_bem_descendants"]:
        print(f"\n  Of ZERO-SECTION-MATCH, BEM descendant selectors: "
              f"{r['zero_match_that_are_bem_descendants']}")
    if r["zero_match_examples"]:
        print("\n  Examples:")
        for e in r["zero_match_examples"][:10]:
            print(f"    {e}")
    print("\n  Top fixtures by unresolved cells:")
    for stem, b in list(r["per_fixture"].items())[:8]:
        print(f"    {stem:36} {sum(b.values()):4}  {b}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
