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
    """An array-bearing block whose draft simply has NO items warns as well.

    Not an accident — the direct consequence of gating at the BLOCK level
    (capability + item schema), which is the discriminator Bean specified. sgs/hero
    declares ``array-content-lift`` and a ``badges`` array, so a hero draft with no
    badges at all reports its empty ``badges`` array.

    ⚠ MEASURED, FLAGGED, NOT SILENTLY ENGINEERED AROUND. This is a real noise
    source: every hero clone emits it. An attempt to suppress it per-candidate was
    built and then REVERTED, because no honest per-candidate signal exists — see
    ``_warn_items_below_threshold``'s docstring for the measurement (a lone
    ``__badge``, its ``__inner`` wrapper and its ``__label`` child are
    indistinguishable under the item schema). Narrowing this further is a design
    decision for Bean, not something to guess at; the test exists so the behaviour
    is reviewable rather than a surprise in a run log.
    """
    with caplog.at_level(logging.WARNING):
        _convert(
            '<section class="sgs-hero">'
            '<div class="sgs-hero__content"><h1 class="sgs-hero__heading">Big</h1></div>'
            "</section>"
        )

    warnings = _drop_warnings(caplog)
    assert len(warnings) == 1
    assert "sgs/hero" in warnings[0] and "badges" in warnings[0]
