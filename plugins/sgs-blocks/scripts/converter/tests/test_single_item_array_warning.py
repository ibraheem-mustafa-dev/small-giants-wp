"""test_single_item_array_warning.py — a dropped single-item repeater must be LOUD.

THE DEFECT
    ``resolvers/array_content.py``'s ``_find_item_nodes`` requires ``len(group) >= 2``
    to call a sibling group a repeater. A draft carrying exactly ONE testimonial /
    badge / pill therefore lifts NOTHING — and the loss is SILENT: the conservation
    contract at ``array_content.py:39-40`` is ``items_seen == filled + item_gaps``,
    which is ``0 == 0 + 0`` when zero items were ever seen. It passes, no gap is
    recorded, and the operator's run log says nothing at all.

    Proven on the live DB before the fix (trust-bar, one ``__badge`` vs two):
        ONE -> <!-- wp:sgs/trust-bar {"align":"full"} /-->
        TWO -> <!-- wp:sgs/trust-bar {"align":"full","items":[…,…]} /-->

WHAT IS *NOT* CHANGED
    The ``>= 2`` threshold stays. It is false-positive protection: lowering it would
    let the converter INVENT an array from any lone BEM-classed child, and on a
    fidelity pipeline a fabricated array is worse than an omission. The fix makes the
    omission VISIBLE; it does not lift the item.

BEAN'S CARVE-OUT (the scope narrowing this file locks)
    Warn only when the block is genuinely an array-BEARING container — one that
    DECLARES it holds a repeater, i.e. carries the ``array-content-lift`` capability
    and has a populated ``array_item_field_schema``. A single ``sgs/quote`` (or any
    block that legitimately stands alone) is CORRECT and must stay silent. Derived
    from the block's declared capability + schema, never a slug list (R-31-1).

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_single_item_array_warning.py -q
"""
from __future__ import annotations

import logging

from bs4 import BeautifulSoup

from converter.recognition import recognise_section
from converter.services.extraction import build_block_markup


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


def _badge(text: str) -> str:
    return (
        f'<div class="sgs-trust-bar__badge">'
        f'<span class="sgs-trust-bar__label">{text}</span>'
        f"</div>"
    )


def _trust_bar(*badges: str) -> str:
    return (
        '<section class="sgs-trust-bar"><div class="sgs-trust-bar__inner">'
        + "".join(_badge(b) for b in badges)
        + "</div></section>"
    )


# A block that legitimately stands alone: sgs/quote declares NO array-content-lift
# capability (verified against the live DB — capabilities_for('sgs/quote') is
# {'scalar-styling-lift'}). Its lone child must never trip the warning.
_STANDALONE_HTML = (
    '<blockquote class="sgs-quote">'
    '<p class="sgs-quote__text">One voice, standing alone.</p>'
    "</blockquote>"
)


def _convert(html: str) -> str:
    node = _node(html)
    rec = recognise_section(node)
    return build_block_markup(rec, node, media_map={}, css_rules={})


def _drop_warnings(caplog) -> list[str]:
    """Every single-item-drop warning emitted on the shared [fold-gap] channel."""
    return [
        r.getMessage()
        for r in caplog.records
        if r.levelno >= logging.WARNING
        and "[fold-gap]" in r.getMessage()
        and "array_items_below_threshold" in r.getMessage()
    ]


# --- the fix: a dropped single item is reported -------------------------------


def test_single_item_array_emits_exactly_one_warning(caplog):
    """ONE ``__badge`` under an array-bearing block: zero items AND one warning."""
    with caplog.at_level(logging.WARNING):
        markup = _convert(_trust_bar("Handmade"))

    # The threshold is UNCHANGED — the item is still not invented.
    assert '"items"' not in markup, (
        "the >= 2 threshold must stand; a single child must NOT be lifted into an array"
    )

    warnings = _drop_warnings(caplog)
    assert len(warnings) == 1, f"expected exactly one drop warning, got {warnings!r}"
    # The operator must be able to act on it: which block, which array attr.
    assert "sgs/trust-bar" in warnings[0]
    assert "items" in warnings[0]


# --- negative control (a): it is not fired unconditionally ---------------------


def test_two_item_array_lifts_both_and_warns_not_at_all(caplog):
    """TWO badges: two items lift and NOTHING is warned.

    Proves the warning is conditional on the drop, not emitted on every pass through
    an array-bearing block (which would make it noise the operator learns to ignore).
    """
    with caplog.at_level(logging.WARNING):
        markup = _convert(_trust_bar("Handmade", "Fresh weekly"))

    assert '"items"' in markup, "the two-item repeater must still lift"
    assert "Handmade" in markup and "Fresh weekly" in markup
    assert _drop_warnings(caplog) == []


# --- negative control (b): Bean's standalone carve-out --------------------------


def test_single_item_under_non_array_block_is_silent(caplog):
    """A block that does NOT declare array-content-lift never warns.

    A lone ``sgs/quote`` is a CORRECT draft, not a dropped repeater. The gate is the
    block's own declared capability + item schema, so this holds for every
    stands-alone block without naming one in code.
    """
    with caplog.at_level(logging.WARNING):
        markup = _convert(_STANDALONE_HTML)

    assert "One voice, standing alone." in markup
    assert _drop_warnings(caplog) == []


# --- documented consequence of the BLOCK-level gate ---------------------------


def test_array_bearing_block_with_no_repeater_also_warns(caplog):
    """An array-bearing block whose draft has a SCHEMA-RELEVANT single child
    (one the ``items`` array's own field schema declares) warns as well.

    Not an accident — the direct consequence of gating at the BLOCK level
    (capability + item schema), which is the discriminator Bean specified.

    RE-POINTED 2026-08-07. This test used to assert that ``sgs/hero`` warned about
    its ``badges`` array, and documented that as accepted noise on every hero
    clone. Bean's answer was better than narrowing the gate: ``badges`` was
    VESTIGIAL — replaced by nesting ``sgs/label`` children — so it was removed
    outright, along with hero's now-untrue ``array-content-lift`` support. The
    noise is gone at source rather than suppressed.

    RE-POINTED AGAIN 2026-09-04 (/qc-council-validated fix). This test used a
    ``__title`` child, which trust-bar's ``items`` schema has NO field for —
    under the ORIGINAL (block-level-only) gate that didn't matter, but the
    approved fix additionally scopes the report to candidates that are
    actually SHAPE-relevant to the triggering array attr's own schema (see
    ``_candidate_relevant_to_schema`` in ``array_content.py`` — the fix for
    the measured defect where an unrelated CTA showed up in a product-card's
    ``packSizes`` drop report). A bare ``__title`` is correctly SILENT under
    the fixed code, so this fixture now uses ``__label`` — a field the
    ``items`` schema genuinely declares — to keep testing the behaviour this
    test names: a real single relevant candidate still warns.
    """
    with caplog.at_level(logging.WARNING):
        _convert(
            '<section class="sgs-trust-bar">'
            '<div class="sgs-trust-bar__inner"><span class="sgs-trust-bar__label">Trusted</span></div>'
            "</section>"
        )

    warnings = _drop_warnings(caplog)
    assert len(warnings) == 1, f"expected exactly one drop warning, got {warnings}"
    assert "sgs/trust-bar" in warnings[0] and "items" in warnings[0]


# --- the approved smaller fix (2026-09-04 /qc-council): scope to the       ---
# --- TRIGGERING array attr's own schema, not every lone BEM-classed child  ---


def test_unrelated_single_element_not_reported_in_wrong_arrays_gap(caplog):
    """A product-card CTA that a DIFFERENT leg lifts correctly must never show
    up in an unrelated array attr's own below-threshold report.

    THE MEASURED DEFECT (validated by /qc-council): ``packSizes``' candidate
    scan re-walks the WHOLE subtree with zero awareness of what another
    content-routing leg already lifted. A real product-card repro — media +
    heading + a correctly-lifted CTA, nothing resembling a pack-size repeater
    — reported ``candidate_elements=['cta', 'heading', 'media']`` on
    ``packSizes``' drop warning, none of which ``packSizes`` has any field
    for at all.

    THE FIX scopes ``_warn_items_below_threshold``'s candidate list to only
    the BEM-classed children that the TRIGGERING array attr's OWN item schema
    could plausibly own (``_candidate_relevant_to_schema``, matching by
    canonical-slot identity / BEM-token ownership / tag-shape identity — the
    same tiers ``_match_child`` uses to bind a real item, minus the
    role-fallback tier, which is too permissive for an isolated candidate).
    Here NONE of media/heading/cta match anything ``packSizes`` declares
    (``label``/``selected``), so the fixed code reports NO warning at all —
    correct, because nothing pack-size-shaped was actually lost.
    """
    from converter.resolvers import array_content as ac

    node = _node(
        '<div class="sgs-product-card">'
        '<img class="sgs-product-card__media" src="/cookies.jpg">'
        '<h3 class="sgs-product-card__heading">Zookies</h3>'
        '<a class="sgs-product-card__cta" href="/buy">Buy now</a>'
        "</div>"
    )

    with caplog.at_level(logging.WARNING):
        attrs, gaps = ac.lift_array_content(node, "sgs/product-card", {})

    assert attrs == {}
    assert gaps == []
    warnings = _drop_warnings(caplog)
    for w in warnings:
        assert "'cta'" not in w and "'heading'" not in w and "'media'" not in w, (
            f"an element irrelevant to packSizes' own schema leaked into a drop report: {w!r}"
        )


def test_schema_relevant_single_candidate_still_warns_for_its_own_array(caplog):
    """Negative control: the fix narrows scope, it does not silence the
    channel. A lone element that DOES match a declared field of the
    triggering array attr (product-card's ``packSizes`` declares a ``label``
    field, canonical slot ``label``) must still trigger the warning — proving
    ``_candidate_relevant_to_schema`` is a real filter, not a blanket mute.
    """
    from converter.resolvers import array_content as ac

    node = _node(
        '<div class="sgs-product-card">'
        '<img class="sgs-product-card__media" src="/cookies.jpg">'
        '<span class="sgs-product-card__label">8-pack</span>'
        "</div>"
    )

    with caplog.at_level(logging.WARNING):
        attrs, gaps = ac.lift_array_content(node, "sgs/product-card", {})

    assert attrs == {}
    assert gaps == []
    warnings = _drop_warnings(caplog)
    assert len(warnings) == 1, f"expected exactly one drop warning, got {warnings!r}"
    assert "sgs/product-card" in warnings[0] and "packSizes" in warnings[0]
    assert "'label'" in warnings[0]
    assert "'cta'" not in warnings[0] and "'media'" not in warnings[0]
