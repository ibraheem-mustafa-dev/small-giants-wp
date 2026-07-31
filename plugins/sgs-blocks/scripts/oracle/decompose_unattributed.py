#!/usr/bin/env python3
"""Diagnostic: decompose the oracle's unattributed-cell count into named buckets.

READ-ONLY. Changes nothing, probes nothing, deploys nothing. It replicates
``attribute_cells_to_sections``'s own reject branches over the real fixture
corpus and reports WHY each declared row failed to attribute.

Why this exists (Spec 31 §5 / §7b):
    ``batch-report.json`` emits ``total_unattributed_cells`` as a bare integer
    with no denominator and no cause breakdown. A bare count can fall for three
    indistinguishable reasons — attribution genuinely improved, fewer rows were
    declared, or a fixture left the corpus. Before changing the attribution
    algorithm, the cause split has to be on record so the change can be judged
    against a prediction rather than against its own output.

Buckets (mirroring the reject branches at batch_runner.py:365-404):
    NON-SIMPLE-SELECTOR  selector is not a bare single class (combinator, id,
                         pseudo-element, attribute-qualified, at-rule, or a
                         non-selector emission like ``[inline:<path>]``)
    ZERO-SECTION-MATCH   a bare single class that matches NO discovered section's
                         root class set — the dominant case, and structural: a
                         class declared on a DESCENDANT is never in a section
                         ROOT's class list (``_section_class_sets`` reads only
                         ``soup.select_one(draft_selector)``'s own classes)
    MULTI-SECTION-MATCH  matches >1 section (ambiguous, cannot be assigned)
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
    _SIMPLE_CLASS_SELECTOR_RE,
    _relevant_declared_rows,
    _section_class_sets,
    discover_fixtures,
    discover_sections,
)
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
    fixtures = discover_fixtures(phase_f_dir, conformance_dir)
    buckets: Counter = Counter()
    sub_nonsimple: Counter = Counter()
    per_fixture: dict[str, dict] = {}
    bem_descendant = 0
    zero_match_examples: list[str] = []

    total_declared = 0
    total_attributed = 0

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
        fx_b: Counter = Counter()

        for row in rows:
            total_declared += 1
            sel = row.selector.strip()
            if not _SIMPLE_CLASS_SELECTOR_RE.match(sel):
                buckets["NON-SIMPLE-SELECTOR"] += 1
                fx_b["NON-SIMPLE-SELECTOR"] += 1
                sub_nonsimple[_classify_selector(sel)] += 1
                continue
            cls = sel[1:]
            matches = [sid for sid, classes in class_sets.items() if cls in classes]
            if len(matches) == 0:
                buckets["ZERO-SECTION-MATCH"] += 1
                fx_b["ZERO-SECTION-MATCH"] += 1
                if _BEM_DESCENDANT_RE.match(sel):
                    bem_descendant += 1
                if len(zero_match_examples) < 15:
                    zero_match_examples.append(f"{stem}: {sel} {{{row.property}}}")
                continue
            if len(matches) > 1:
                buckets["MULTI-SECTION-MATCH"] += 1
                fx_b["MULTI-SECTION-MATCH"] += 1
                continue
            try:
                CellInput(
                    property=row.property, tier=row.tier, draft_value=row.value,
                    computed_value=None, expected_default=None, written=True,
                )
            except ValueError:
                buckets["TIER-VALIDATION"] += 1
                fx_b["TIER-VALIDATION"] += 1
                continue
            total_attributed += 1

        if fx_b:
            per_fixture[stem] = dict(fx_b)

    unattributed = sum(buckets.values())
    return {
        "tool": "decompose_unattributed",
        "read_only": True,
        "total_declared_cells": total_declared,
        "total_attributed_cells": total_attributed,
        "total_unattributed_cells": unattributed,
        "attribution_rate_pct": round(total_attributed / total_declared * 100, 1) if total_declared else 0.0,
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
    print(f"  declared cells      : {r['total_declared_cells']}")
    print(f"  attributed          : {r['total_attributed_cells']}")
    print(f"  unattributed        : {r['total_unattributed_cells']}")
    print(f"  attribution rate    : {r['attribution_rate_pct']}%")
    print("\n  WHY each cell failed to attribute:")
    for k, v in r["buckets"].items():
        pct = v / r["total_unattributed_cells"] * 100 if r["total_unattributed_cells"] else 0
        print(f"    {k:22} {v:5}  ({pct:.1f}% of unattributed)")
    if r["non_simple_breakdown"]:
        print("\n  NON-SIMPLE-SELECTOR breakdown (permanently unattributable by shape):")
        for k, v in r["non_simple_breakdown"].items():
            print(f"    {k:22} {v:5}")
    print(f"\n  Of ZERO-SECTION-MATCH, BEM descendant selectors: "
          f"{r['zero_match_that_are_bem_descendants']}")
    print("  (these are the ones a descendant-aware attributor could reach)")
    if r["zero_match_examples"]:
        print("\n  Examples:")
        for e in r["zero_match_examples"][:10]:
            print(f"    {e}")
    print("\n  Top fixtures by unattributed count:")
    for stem, b in list(r["per_fixture"].items())[:8]:
        print(f"    {stem:36} {sum(b.values()):4}  {b}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
