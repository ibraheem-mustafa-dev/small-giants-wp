"""sc_var_responsive_bridge.py -- turns a correlated classless-draft measurement
into real block attribute writes.

Follows ``recogniser/sc_var_responsive_correlator.py`` (Piece 1 identity +
Piece 2 measured responsive values, joined). That module's own docstring names
this as separate follow-up work: "wiring it into the converter's
attribute-writer is separate follow-up work (see the plan doc)." This module
is that wiring (D1061 follow-up, 2026-09-15).

WHY THIS CANNOT REUSE THE CLASSED (BEM) PATH DIRECTLY:

A classed draft's responsive typography/colour values reach block attributes
via ``resolvers/styling_content.py::lift_styling_content`` -> ``_emit_tier_value``,
which reads REAL CSS RULES extracted from the draft's ``<style>`` block. A
classless (sc-var-driven) draft has no CSS classes at all, so there is nothing
for that path to extract -- ``draft-responsive-probe.js`` MEASURES computed
styles in a headless browser instead, and ``sc_var_responsive_correlator.py``
joins those measurements to a block-identity guess. The join's output is a
flat record, not a CSS declaration walk, so it cannot reuse
``services/tier_object.py::tier_object_write`` either (that function takes a
``ctx``/``decl`` pair from the CSS-rule-walking pipeline and returns a partial
``Write`` for the orchestrator's decl-by-decl merge -- there is no decl here).

Nor can this reuse ``lift_styling_content`` itself: that resolver hard-gates
on ``role in ('color', 'typography')`` (its own capability-gate comment), so a
``role='layout'`` box-family attr like ``sgs/card-grid``'s ``cardPadding``
(the one REAL, live-verified case this bridge was built for -- D1061, a card's
measured padding changing 28px@375 -> 34px@768 on the Ward End Eye Care
draft) is invisible to it regardless of the ``scalarStylingLift`` capability.

So this module builds the final attribute VALUE directly (a flat scalar, or
the ``{desktop, tablet, mobile}`` tier-object shape ``sgs_responsive_normalise_
object()`` reads on the PHP side) rather than emitting a partial ``Write`` for
an existing merge step -- it is not part of that CSS-declaration-walk
pipeline, and the orchestrator already merges plain dicts by key elsewhere
(``services/extraction.py::run_mechanism_styling``: ``lifted = {**lifted,
**per_element}``).

DB-first (R-31-1): every property->attr resolution reads
``db_lookup.box_css_catalogue()`` (the block's real ``block_attributes`` rows)
-- never a hardcoded per-block dict. STRICT, mirroring the correlator's own
"zero or 2+ candidates -> drop" discipline (never guessed): a changed CSS
property with no exactly-one matching attr for the resolved block is DROPPED
and reported as a gap, not force-written.

UK English in comments + output.
"""
from __future__ import annotations

from typing import Any

from converter.db import db_lookup
from converter.services.tier_object import tier_object_key

# The correlator's probe widths (draft-responsive-probe.js VIEWPORTS default,
# CLAUDE.md "Responsive breakpoint discipline": mobile/tablet/desktop sample
# widths 375/768/1440) -> the converter's device-tier vocabulary. This is a
# CSS-SPEC/PROJECT-CONVENTION fact (which sample width REPRESENTS which
# tier), the same permitted-constant class as ``_FONT_WEIGHT_KEYWORDS`` in
# ``styling_content.py`` or ``SKIP_TOP_LEVEL_TAGS`` -- not a block/attr
# lookup, so it is not an R-31-1 violation.
_WIDTH_TO_TIER: dict[str, str] = {
    "375": "Mobile",
    "768": "Tablet",
    "1440": "Base",
}

# A box-family attr declared on the bare shorthand property ('padding' /
# 'margin', e.g. sgs/card-grid.cardPadding: css_property='padding') also
# answers for each of its 4 per-side longhands -- draft-responsive-probe.js
# measures padding-top/-right/-bottom/-left individually (D1061's real hit
# was ['padding-top']), never the shorthand. Mirrors
# ``converter/services/box_side.py``'s own ``_BOX_SIDE_PROPS``/``_BOX_SIDES``
# generalisation (CSS box-model vocabulary, not a slug carve-out).
_BOX_SIDES: tuple[str, ...] = ("top", "right", "bottom", "left")
_BOX_SIDE_BASE_PROPS: tuple[str, ...] = ("padding", "margin")
_SIDE_LONGHAND_TO_SIDE: dict[str, str] = {
    f"{prop}-{side}": side for prop in _BOX_SIDE_BASE_PROPS for side in _BOX_SIDES
}
# border-width's own longhand shape is ``border-{side}-width``, not
# ``border-width-{side}`` -- a different token order, so it needs its own map
# rather than the generic prop/side join above. Mirrors
# ``converter/services/border_side.py``'s identical ``border-{side}-width``
# split (e.g. sgs/card-grid.cardBorderWidth: css_property='border-width').
_SIDE_LONGHAND_TO_SIDE.update({f"border-{side}-width": side for side in _BOX_SIDES})


def _index_by_property(catalogue: dict[str, dict]) -> dict[str, list[tuple[str, dict]]]:
    """Reverse-index a block's ``box_css_catalogue()`` by CSS property name.

    A literal multi-side ``css_property`` (e.g. ``contentBandPadding``'s
    ``"padding-bottom,padding-left,padding-right,padding-top"``) indexes
    under each listed side directly. A bare box-family shorthand (e.g.
    ``cardPadding``'s ``"padding"``) ALSO indexes under its 4 per-side
    longhands, so a measured ``padding-top`` can resolve to it.
    """
    by_property: dict[str, list[tuple[str, dict]]] = {}
    for attr_name, info in catalogue.items():
        css_property = info.get("css_property")
        if not css_property:
            continue
        props = [p.strip() for p in str(css_property).split(",") if p.strip()]
        for prop in props:
            by_property.setdefault(prop, []).append((attr_name, info))
        if info.get("box_family") and len(props) == 1:
            if props[0] in _BOX_SIDE_BASE_PROPS:
                base_prop = props[0]
                for side in _BOX_SIDES:
                    by_property.setdefault(f"{base_prop}-{side}", []).append((attr_name, info))
            elif props[0] == "border-width":
                for side in _BOX_SIDES:
                    by_property.setdefault(f"border-{side}-width", []).append((attr_name, info))
    return by_property


def bridge_record(record: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Resolve one ``sc_var_responsive_correlator.correlate()`` record to real
    block-attribute writes.

    Returns ``(writes, gaps)``:
      ``writes`` -- ``{attr_name: value}`` ready to merge into a boundary's
                    lifted attrs (a flat scalar, a flat ``{side: value}`` box,
                    or a ``{"desktop": ..., "tablet": ..., "mobile": ...}``
                    tier-object -- whichever shape the resolved attr's DB row
                    declares).
      ``gaps``   -- one entry per ``changed_properties`` item this bridge
                    could NOT place (no block-identity, no catalogue, no
                    match, or an ambiguous match) -- reported, never guessed,
                    same discipline the correlator itself uses.
    """
    block_slug = (record.get("sc_var_hint") or {}).get("block")
    if not block_slug:
        return {}, [{"reason": "no_block_slug", "record": record}]

    catalogue = db_lookup.box_css_catalogue(block_slug)
    if not catalogue:
        return {}, [{
            "reason": "no_catalogue", "block": block_slug,
            "element_key": record.get("element_key"),
        }]

    by_property = _index_by_property(catalogue)
    values_by_width = record.get("values_by_width", {})

    writes: dict[str, Any] = {}
    gaps: list[dict[str, Any]] = []

    for css_property in record.get("changed_properties", []):
        candidates = by_property.get(css_property, [])
        if len(candidates) != 1:
            gaps.append({
                "reason": "no_match" if not candidates else "ambiguous",
                "block": block_slug,
                "css_property": css_property,
                "candidate_count": len(candidates),
                "element_key": record.get("element_key"),
            })
            continue

        attr_name, info = candidates[0]
        is_tier_obj = info.get("tier_shape") == "tier_object"
        box_family = info.get("box_family")
        if box_family:
            side = _SIDE_LONGHAND_TO_SIDE.get(css_property)
            if side is None:
                # A box-family attr matched, but the measured property isn't
                # one of the per-side longhands this bridge knows how to
                # place (e.g. a shorthand measurement). Writing the raw value
                # in as a flat scalar would corrupt the {top,right,bottom,
                # left} shape the PHP side expects -- gap it, never guess.
                gaps.append({
                    "reason": "unresolved_box_side", "block": block_slug,
                    "css_property": css_property, "attr_name": attr_name,
                    "element_key": record.get("element_key"),
                })
                continue
        else:
            side = None

        for width, decls in values_by_width.items():
            tier = _WIDTH_TO_TIER.get(str(width))
            if tier is None:
                continue
            raw = decls.get(css_property)
            if not raw:
                continue

            if is_tier_obj:
                tier_key = tier_object_key(tier)
                if tier_key is None:
                    continue
                bucket = writes.setdefault(attr_name, {})
                if side:
                    bucket.setdefault(tier_key, {})[side] = raw
                else:
                    bucket[tier_key] = raw
            else:
                # No tier-object base declared for this attr -- Base tier
                # only (no {attr}Tablet/{attr}Mobile companion resolution
                # here; a flat-sibling migration is out of scope for this
                # bridge, matching the correlator's own "route only what is
                # proven" discipline).
                if tier != "Base":
                    continue
                if side:
                    writes.setdefault(attr_name, {})[side] = raw
                else:
                    writes[attr_name] = raw

    return writes, gaps


if __name__ == "__main__":
    import sys

    if "--self-test" in sys.argv:
        # Pure-function self-test (this pipeline's convention) -- no DB
        # connection, catalogue passed in directly via monkeypatched
        # db_lookup.box_css_catalogue rather than a real sgs-framework.db
        # read, so this is stable in any environment.
        _FAKE_CATALOGUE = {
            "card-grid": {
                "cardPadding": {
                    "css_property": "padding", "css_element": "body",
                    "box_family": "cardPadding", "tier_shape": "tier_object",
                },
                "cardBorderWidth": {
                    "css_property": "border-width", "css_element": "item",
                    "box_family": "cardBorderWidth", "tier_shape": None,
                },
            },
        }
        db_lookup.box_css_catalogue = lambda slug: _FAKE_CATALOGUE.get(slug, {})  # type: ignore[assignment]

        # Real D1061 shape: card-grid padding-top measured 28px@375, 34px@768.
        record = {
            "boundary_id": "b1",
            "sc_var_hint": {"block": "card-grid", "confidence": 0.37},
            "element_key": "div|01 fast turnaround same-day appointments#1",
            "changed_properties": ["padding-top"],
            "values_by_width": {
                "375": {"padding-top": "28px"},
                "768": {"padding-top": "34px"},
            },
        }
        writes, gaps = bridge_record(record)
        assert writes == {"cardPadding": {"mobile": {"top": "28px"}, "tablet": {"top": "34px"}}}, writes
        assert gaps == [], gaps

        # No sc_var_hint at all -> reported, never guessed.
        writes2, gaps2 = bridge_record({"changed_properties": ["padding-top"], "values_by_width": {}})
        assert writes2 == {}
        assert gaps2 == [{"reason": "no_block_slug", "record": {"changed_properties": ["padding-top"], "values_by_width": {}}}]

        # Unknown block -> no catalogue -> reported, never guessed.
        writes3, gaps3 = bridge_record({
            "sc_var_hint": {"block": "does-not-exist"},
            "element_key": "k",
            "changed_properties": ["padding-top"],
            "values_by_width": {"375": {"padding-top": "10px"}},
        })
        assert writes3 == {}
        assert gaps3[0]["reason"] == "no_catalogue", gaps3

        # NEGATIVE CONTROL: a changed property with NO matching attr for this
        # block -> dropped and reported as a gap, never guessed at.
        record4 = {
            "sc_var_hint": {"block": "card-grid"},
            "element_key": "k",
            "changed_properties": ["font-size"],
            "values_by_width": {"375": {"font-size": "14px"}},
        }
        writes4, gaps4 = bridge_record(record4)
        assert writes4 == {}, writes4
        assert gaps4 == [{
            "reason": "no_match", "block": "card-grid", "css_property": "font-size",
            "candidate_count": 0, "element_key": "k",
        }], gaps4

        # A flat (non-tier-object) box attr, real per-side longhand
        # (border-top-width, not the shorthand) -- Base tier only, the
        # correlator's Base-width measurement lands as {top: ...}; the
        # Mobile measurement is dropped for a flat (base-only) attr, not
        # guessed into a tier shape the block never declared.
        record5 = {
            "sc_var_hint": {"block": "card-grid"},
            "element_key": "k",
            "changed_properties": ["border-top-width"],
            "values_by_width": {"1440": {"border-top-width": "2px"}, "375": {"border-top-width": "1px"}},
        }
        writes5, gaps5 = bridge_record(record5)
        assert writes5 == {"cardBorderWidth": {"top": "2px"}}, writes5
        assert gaps5 == [], gaps5

        # NEGATIVE CONTROL: a box-family attr matches, but the measured
        # property is the bare SHORTHAND ('border-width'), which this bridge
        # cannot place into a {top,right,bottom,left} shape safely -- gapped,
        # never written in as a corrupting flat scalar.
        record6 = {
            "sc_var_hint": {"block": "card-grid"},
            "element_key": "k",
            "changed_properties": ["border-width"],
            "values_by_width": {"1440": {"border-width": "2px"}},
        }
        writes6, gaps6 = bridge_record(record6)
        assert writes6 == {}, writes6
        assert gaps6 == [{
            "reason": "unresolved_box_side", "block": "card-grid",
            "css_property": "border-width", "attr_name": "cardBorderWidth",
            "element_key": "k",
        }], gaps6

        print("sc_var_responsive_bridge.py self-test: PASS")
    else:
        print(__doc__)
