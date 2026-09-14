#!/usr/bin/env python3
"""sc_var_responsive_correlator.py -- joins Piece 1 identity to Piece 2 values.

Universal-pipeline upgrade, "connect the pieces" (2026-09-14). Piece 1
(`sc_var_classifier.py` + `per-section-convention-voter.py` wiring) tags a
BOUNDARY (a repeated-item section, e.g. one `sc-for`-wrapped card) with a
block-identity guess. Piece 2 (`draft-responsive-probe.js`) measures
individual RENDERED ELEMENTS for which CSS properties change across widths,
keyed by normalised tag+text. Neither file knows about the other -- this
module is the join.

TWO JOIN STRATEGIES, because ONE signal doesn't cover both boundary kinds:

  1. STRUCTURAL (sc-for boundaries): `<sc-for>` items are read by Piece 1 from
     the SOURCE parse tree, where they are still a template carrying literal
     `{{ r.title }}`-shaped placeholders -- verified live against the real
     "reasons" sc-for: its raw text is `"{{ r.no }} {{ r.title }} {{ r.body
     }}"`, which can never text-match the RENDERED content Piece 2 measures
     ("01 Fast Turnaround..."). The signal that DOES survive is structural:
     own tag + immediate-children tag skeleton, repeated N times as siblings
     -- draft-responsive-probe.js independently detects these groups in the
     rendered DOM and reports `group_signature`/`group_size` per element.
  2. TEXT CONTAINMENT (everything else -- static sections, headings, CTAs):
     these boundaries carry real authored text in the source, which DOES
     survive rendering unchanged, so containment matching (as before) is
     both simpler and available.

`<sc-for>`/`<sc-if>` themselves do not survive rendering at all (verified
live, see `draft-responsive-probe.js`'s own module docstring) -- there is no
DOM-position bridge between the two trees for either strategy; both rely
purely on a signal that happens to be preserved across the source->render
boundary.

MATCH RULE (Bean-approved, 2026-09-14): STRICT. A Piece 2 element is joined
to a Piece 1 boundary only when its normalised text is contained in EXACTLY
ONE boundary's normalised text. Zero matches or 2+ matches -> dropped,
counted as unresolved, never guessed. This mirrors the discipline already
used throughout Piece 1/2 (confidence capped, never asserted as ground
truth) -- guessing the wrong sibling in a repeated card-grid would attach a
real-looking responsive value to the wrong card.

The normalisation function below is a byte-for-byte Python port of
`draft-responsive-probe.js`'s in-page `norm()` (CAPTURE_SRC) -- containment
checks are meaningless unless both sides normalise identically.

Output is a JOINED DATA ARTEFACT only -- wiring it into the converter's
attribute-writer is separate follow-up work (see the plan doc).

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

# Exact port of draft-responsive-probe.js's `norm()` -- lowercase, strip to
# alphanumeric + space + pound sign, collapse whitespace, cap at 300 chars.
# Must match the JS regex classes character-for-character.
_STRIP_RE = re.compile(r"[^a-z0-9 £\s ​﻿]")
_WS_RE = re.compile(r"[\s ​﻿]+")


def norm(text: str | None) -> str:
    """Python port of the JS `norm()` used by draft-responsive-probe.js."""
    if not text:
        return ""
    lowered = text.lower()
    stripped = _STRIP_RE.sub("", lowered)
    collapsed = _WS_RE.sub(" ", stripped).strip()
    return collapsed[:300]


def _strip_key_suffix(key: str) -> str:
    """Piece 2 keys are `tag|text#N` (N disambiguates repeated identical
    text) -- strip the counter suffix and tag prefix to get bare text for
    containment matching against a boundary's normalised text."""
    # key shape: "<tag>|<normalised text>#<n>"
    _, _, rest = key.partition("|")
    text, _, _ = rest.rpartition("#")
    return text if text else rest


def _structural_signature(own_tag: str, child_tag_skeleton: list[str]) -> str:
    """Piece 1 side of the structural signature -- MUST match
    draft-responsive-probe.js's in-page `sig` exactly: own tag + '>' +
    comma-joined immediate-children tags."""
    return f"{own_tag}>{','.join(child_tag_skeleton)}"


def _record(boundary: dict[str, Any], el: dict[str, Any]) -> dict[str, Any]:
    return {
        "boundary_id": boundary.get("boundary_id"),
        "section_id": boundary.get("section_id"),
        "sc_var_hint": boundary["sc_var_hint"],
        "element_key": el.get("key"),
        "element_tag": el.get("tag"),
        "changed_properties": el.get("changed_properties", []),
        "values_by_width": el.get("values_by_width", {}),
    }


def correlate(
    boundaries: list[dict[str, Any]],
    probe_elements: list[dict[str, Any]],
) -> dict[str, Any]:
    """Join Piece 2 elements to Piece 1 boundaries.

    `boundaries` -- Piece 1's boundary dicts (only those carrying
    `sc_var_hint` participate; every other boundary is irrelevant to this
    join). `sc-for` boundaries join structurally; everything else joins by
    strict text containment (see module docstring for why the two diverge).
    `probe_elements` -- the `elements` list from a `draft-responsive-probe.js`
    report (each carries `key`, `tag`, `group_signature`, `group_size`,
    `changed_properties`, `values_by_width`).

    STRICT in both modes: zero or 2+ candidates on either side of a join ->
    dropped, counted as unresolved, never guessed.
    """
    hinted = [b for b in boundaries if b.get("sc_var_hint")]
    structural_candidates = [
        b for b in hinted
        if b.get("sc_var_kind") == "for"
        and b.get("sc_var_own_tag")
        and b.get("sc_var_child_tag_skeleton") is not None
        and b.get("sc_var_hint_count") is not None
    ]
    text_candidates = [
        b for b in hinted if b.get("sc_var_kind") != "for" and b.get("sc_var_text")
    ]

    # Structural side: group boundaries by (signature, expected count). A
    # collision here (2+ boundaries sharing signature+count) is itself an
    # ambiguity -- neither can be safely claimed by a probe element.
    boundaries_by_structural_sig: dict[tuple[str, int], list[dict[str, Any]]] = {}
    for b in structural_candidates:
        sig = _structural_signature(b["sc_var_own_tag"], b["sc_var_child_tag_skeleton"])
        boundaries_by_structural_sig.setdefault((sig, b["sc_var_hint_count"]), []).append(b)

    normalised_text_boundaries = [(b, norm(b["sc_var_text"])) for b in text_candidates]

    correlated: list[dict[str, Any]] = []
    unresolved_ambiguous = 0
    unresolved_no_match = 0

    for el in probe_elements:
        group_sig = el.get("group_signature")
        group_size = el.get("group_size")
        if group_sig and group_size:
            hits = boundaries_by_structural_sig.get((group_sig, group_size), [])
            if len(hits) == 0:
                unresolved_no_match += 1
                continue
            if len(hits) > 1:
                unresolved_ambiguous += 1
                continue
            correlated.append(_record(hits[0], el))
            continue

        # Fall back to text containment for elements with no structural
        # group (the overwhelming majority -- static sections/headings).
        element_text = norm(_strip_key_suffix(el.get("key", "")))
        if not element_text:
            unresolved_no_match += 1
            continue
        text_hits = [b for b, btext in normalised_text_boundaries if element_text in btext]
        if len(text_hits) == 0:
            unresolved_no_match += 1
            continue
        if len(text_hits) > 1:
            unresolved_ambiguous += 1
            continue
        correlated.append(_record(text_hits[0], el))

    return {
        "correlated": correlated,
        "correlated_count": len(correlated),
        "unresolved_ambiguous_count": unresolved_ambiguous,
        "unresolved_no_match_count": unresolved_no_match,
        "boundaries_with_sc_var_hint": len(hinted),
        "structural_boundaries": len(structural_candidates),
        "text_boundaries": len(text_candidates),
        "probe_elements_total": len(probe_elements),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Join Piece 1 sc-var identity hints to Piece 2 responsive values."
    )
    parser.add_argument("--boundary", required=True, help="Piece 1 boundaries JSON (has a 'boundaries' list)")
    parser.add_argument("--probe", required=True, help="Piece 2 draft-responsive-probe.js report JSON")
    parser.add_argument("--out", default="", help="Output path; defaults to stdout")
    args = parser.parse_args()

    boundary_data = json.loads(Path(args.boundary).read_text(encoding="utf-8"))
    probe_data = json.loads(Path(args.probe).read_text(encoding="utf-8"))

    boundaries = boundary_data.get("boundaries", [])
    probe_elements = probe_data.get("elements", [])

    result = correlate(boundaries, probe_elements)

    text = json.dumps(result, indent=2, sort_keys=True)
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
        print(f"Written: {args.out}")
    else:
        print(text)


if __name__ == "__main__":
    import sys

    if "--self-test" in sys.argv:
        # Self-test, matching this pipeline's existing flat-script convention.
        assert norm("Hello, WORLD!  ") == "hello world"
        assert norm("£5 off—today") == "£5 offtoday"
        assert _strip_key_suffix("div|book now#1") == "book now"
        assert _strip_key_suffix("div|book now") == "book now"

        # Unambiguous match: element text contained in exactly one boundary.
        boundaries = [
            {
                "boundary_id": "b1",
                "section_id": "s1",
                "sc_var_hint": {"block": "card-grid", "confidence": 0.31},
                "sc_var_text": "Reason one Fast turnaround and friendly staff",
            },
            {
                "boundary_id": "b2",
                "section_id": "s2",
                "sc_var_hint": {"block": "card-grid", "confidence": 0.31},
                "sc_var_text": "Reason two Free parking on site",
            },
        ]
        probe_elements = [
            {
                "key": "p|fast turnaround and friendly staff#1",
                "tag": "p",
                "changed_properties": ["padding-top"],
                "values_by_width": {"375": {"padding-top": "8px"}, "1440": {"padding-top": "16px"}},
            },
        ]
        result = correlate(boundaries, probe_elements)
        assert result["correlated_count"] == 1, result
        assert result["correlated"][0]["boundary_id"] == "b1", result
        assert result["correlated"][0]["sc_var_hint"]["block"] == "card-grid"
        assert result["unresolved_ambiguous_count"] == 0
        assert result["unresolved_no_match_count"] == 0

        # Negative control: text contained in BOTH boundaries -> strict mode
        # drops it as ambiguous, never guesses.
        ambiguous_boundaries = [
            {
                "boundary_id": "b1",
                "section_id": "s1",
                "sc_var_hint": {"block": "card-grid", "confidence": 0.31},
                "sc_var_text": "Book now with us today",
            },
            {
                "boundary_id": "b2",
                "section_id": "s2",
                "sc_var_hint": {"block": "card-grid", "confidence": 0.31},
                "sc_var_text": "Book now with our team",
            },
        ]
        ambiguous_elements = [
            {"key": "a|book now#1", "tag": "a", "changed_properties": ["font-size"], "values_by_width": {}},
        ]
        result2 = correlate(ambiguous_boundaries, ambiguous_elements)
        assert result2["correlated_count"] == 0, result2
        assert result2["unresolved_ambiguous_count"] == 1, result2

        # No-match case: element text absent from every boundary.
        result3 = correlate(boundaries, [{"key": "p|completely unrelated text#1", "tag": "p", "changed_properties": [], "values_by_width": {}}])
        assert result3["correlated_count"] == 0
        assert result3["unresolved_no_match_count"] == 1

        # A boundary with no sc_var_hint (the overwhelming majority) never
        # participates -- confirms the `candidates` filter, not just that it
        # happens not to match.
        no_hint_boundaries = [{"boundary_id": "b3", "sc_var_text": "Fast turnaround and friendly staff"}]
        result4 = correlate(no_hint_boundaries, probe_elements)
        assert result4["boundaries_with_sc_var_hint"] == 0
        assert result4["correlated_count"] == 0
        assert result4["unresolved_no_match_count"] == 1

        # Structural join: an sc-for boundary whose source text is the literal
        # `{{ }}` placeholder (never matches rendered text) must still join
        # via own-tag + child-skeleton + hint-placeholder-count.
        sc_for_boundary = [
            {
                "boundary_id": "b5",
                "section_id": "s5",
                "sc_var_kind": "for",
                "sc_var_hint": {"block": "card-grid", "confidence": 0.37},
                "sc_var_text": "{{ r.no }} {{ r.title }} {{ r.body }}",
                "sc_var_own_tag": "div",
                "sc_var_child_tag_skeleton": ["div", "h3", "p"],
                "sc_var_hint_count": 4,
            }
        ]
        structural_elements = [
            {
                "key": "div|1 fast turnaround same-day appointments#1",
                "tag": "div",
                "group_signature": "div>div,h3,p",
                "group_size": 4,
                "changed_properties": ["padding-top"],
                "values_by_width": {"375": {"padding-top": "8px"}, "1440": {"padding-top": "16px"}},
            },
            {
                "key": "div|2 free parking convenient on-site#1",
                "tag": "div",
                "group_signature": "div>div,h3,p",
                "group_size": 4,
                "changed_properties": ["padding-top"],
                "values_by_width": {"375": {"padding-top": "8px"}, "1440": {"padding-top": "16px"}},
            },
        ]
        result5 = correlate(sc_for_boundary, structural_elements)
        assert result5["correlated_count"] == 2, result5
        assert all(c["boundary_id"] == "b5" for c in result5["correlated"]), result5
        assert result5["structural_boundaries"] == 1

        # Structural negative control: two DIFFERENT sc-for boundaries share
        # the exact same signature+count (e.g. two separate 4-item card
        # grids using identical markup shape) -> strict mode can't tell which
        # owns a matching probe element, so it must drop, not guess.
        colliding_boundaries = [
            {**sc_for_boundary[0], "boundary_id": "b5"},
            {**sc_for_boundary[0], "boundary_id": "b6", "section_id": "s6"},
        ]
        result6 = correlate(colliding_boundaries, structural_elements)
        assert result6["correlated_count"] == 0, result6
        assert result6["unresolved_ambiguous_count"] == 2, result6

        # Structural no-match: group_size doesn't match hint_count (only 3
        # rendered vs 4 expected) -> unresolved, not a loose guess.
        result7 = correlate(sc_for_boundary, [{**structural_elements[0], "group_size": 3}])
        assert result7["correlated_count"] == 0
        assert result7["unresolved_no_match_count"] == 1

        print("sc_var_responsive_correlator.py self-test: PASS")
    else:
        main()
