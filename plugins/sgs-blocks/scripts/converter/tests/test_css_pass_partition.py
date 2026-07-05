"""test_css_pass_partition.py — STOP-43 council fix regression tests.

Proves the per-tier consumed-set partition in ``css_pass._build_css_attrs``
(backed by ``root_supports.lift_root_supports_to_style``'s ``consumed`` return
value) replaced the old blanket ``_LIFT_CSS_PROPS`` membership strip, which
silently dropped a CSS property whenever it was lift-ELIGIBLE but the block's
supports/schema gate REJECTED it — never a Write, never a GAP (bug found by
/qc-council on ``services/css_pass.py:104-140`` + ``services/root_supports.py:
86-88``, 2026-07-05).

All four tests run through the REAL, DB-backed engine (``converter.recognition
.recognise`` + ``converter.services.extraction.build_block_markup``), matching
the house style of ``test_metamorphic_universality.py`` — no monkeypatching of
DB lookups, so the fix is proven against the live ``sgs-framework.db`` schema,
not a hand-picked fake supports dict.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_css_pass_partition.py -q --import-mode=importlib
"""
from __future__ import annotations

from bs4 import BeautifulSoup

from converter.recognition import recognise
from converter.services.extraction import build_block_markup


def _node(html: str):
    return BeautifulSoup(html, "html.parser").find(True)


# ---------------------------------------------------------------------------
# Test 1 — sgs/text has NO native color support (block_supports_for shows
# color: False) but DOES have its own textColour attr. A `color` decl must
# flow through to the typography resolver, NOT be silently dropped by a
# blanket _LIFT_CSS_PROPS strip.
# ---------------------------------------------------------------------------

def test_text_color_flows_to_textcolour_attr_not_dropped():
    """A `color` decl on sgs/text (no native color support) must land as the
    block's own `textColour` custom attr — never vanish."""
    node = _node('<p class="sgs-section-heading__intro">Some muted copy here.</p>')
    rec = recognise(node)
    assert rec.slug == "sgs/text", f"fixture must recognise as sgs/text, got {rec.slug}"

    css_rules = {".sgs-section-heading__intro": {"color": "var(--text-muted)"}}
    markup = build_block_markup(rec, node, css_rules=css_rules, is_root=True)

    assert '"textColour":"text-muted"' in markup, (
        f"color decl must land as textColour on a block with no native color "
        f"support, got: {markup}"
    )
    # The old bug's failure signature: no native style.color.text AND no
    # textColour either (the decl vanished). Guard against regressing back.
    assert '"style":{"color"' not in markup, (
        f"sgs/text has no native color support — must never emit style.color.*: {markup}"
    )


# ---------------------------------------------------------------------------
# Test 2 — sgs/container `gap` reaches its destination (grid/outer_box via
# attr_for_property), whether via the native style.spacing.blockGap lift or
# (per the per-tier trap, test 3 below) the process_element dispatch.
# ---------------------------------------------------------------------------

def test_container_gap_reaches_destination_attr():
    """A `gap` decl on a nested sgs/container (display:grid) must reach a real
    destination — never be dropped from both the native lift AND the decl
    stream simultaneously."""
    node = _node('<div class="sgs-container"><h2 class="sgs-heading">Hi</h2></div>')
    rec = recognise(node)
    assert rec.slug == "sgs/container"

    css_rules = {".sgs-container": {"display": "grid", "gap": "24px"}}
    markup = build_block_markup(rec, node, css_rules=css_rules, is_root=False)

    assert '"blockGap":"24px"' in markup, (
        f"gap must land in style.spacing.blockGap for a nested grid container, "
        f"got: {markup}"
    )


# ---------------------------------------------------------------------------
# Test 3 — THE PER-TIER TRAP: a property consumed by the native lift at the
# BASE tier must NOT suppress a DIFFERENT bp tier's decl when that tier's
# candidate attr was rejected/unwritten by the native lift. Ground truth
# (verified against root_supports.py:376-383): the native lift's per-device
# candidate-name derivation for `gap` builds `blockgap{Suffix}` (capitalize()
# lower-cases the rest of "blockGap"), which never matches the real schema
# attr `gap{Suffix}` — so the Mobile-tier gap is NEVER written by the native
# lift, even though the Base-tier gap succeeds (the `_support_allows` gate's
# same-leaf shortcut passes on `spacing.margin`/`spacing.padding` alone). Pre-
# STOP-43, the OLD blanket strip removed `gap` from bp_decls["Mobile"]
# regardless, so the value was dropped everywhere. Post-fix, the Mobile decl
# flows through to process_element's grid resolver (attr_for_property), which
# derives the CORRECT `gapMobile` attr name.
# ---------------------------------------------------------------------------

def test_bp_tier_not_consumed_by_native_lift_flows_through():
    """Base-tier gap is natively consumed (style.spacing.blockGap); the Mobile
    tier's gap — NOT written by the native lift's per-device candidate-name
    derivation — must still reach its real destination via process_element,
    not be dropped by a blanket per-property (rather than per-tier) strip."""
    node = _node('<div class="sgs-container"><h2 class="sgs-heading">Hi</h2></div>')
    rec = recognise(node)
    assert rec.slug == "sgs/container"

    css_rules = {
        ".sgs-container": {"display": "grid", "gap": "24px"},
        "max-width: 767 :: .sgs-container": {"gap": "32px"},
    }
    markup = build_block_markup(rec, node, css_rules=css_rules, is_root=False)

    # Base tier: natively consumed → style.spacing.blockGap.
    assert '"blockGap":"24px"' in markup, (
        f"base-tier gap must still land natively, got: {markup}"
    )
    # Mobile tier: native lift's candidate-name derivation MISSES this (proven
    # via root_supports.lift_root_supports_to_style directly — see module
    # docstring) → must flow through to process_element and land as gapMobile.
    assert '"gapMobile":"32px"' in markup, (
        f"a bp tier NOT consumed by the native lift must flow through to "
        f"process_element instead of being dropped, got: {markup}"
    )


# ---------------------------------------------------------------------------
# Test 4 — a natively-consumed property must NOT double-emit (once via
# style.* from the native lift, once via a process_element resolver write for
# the SAME source declaration).
# ---------------------------------------------------------------------------

def test_natively_consumed_property_does_not_double_emit():
    """background-color IS natively supported on sgs/container (color.background
    = True) — it must land in style.color.background exactly once, and must
    NOT also reach process_element (which would either raise a collision/
    unrouted ConservationError or silently produce a second destination)."""
    node = _node('<div class="sgs-container"><h2 class="sgs-heading">Hi</h2></div>')
    rec = recognise(node)
    assert rec.slug == "sgs/container"

    css_rules = {
        ".sgs-container": {"background-color": "#ff5733", "padding-top": "60px"},
    }
    # Must not raise (a double-route would surface as a ConservationError from
    # process_element — COLLISION or an unnecessary UNROUTED for a property
    # that should have been fully absorbed by the native lift).
    markup = build_block_markup(rec, node, css_rules=css_rules, is_root=False)

    assert markup.count("ff5733") == 1, (
        f"a natively-consumed colour must appear exactly once (style.color."
        f"background only), got {markup.count('ff5733')} occurrences: {markup}"
    )
    assert '"style":{"color":{"background":"#ff5733"}' in markup, (
        f"background-color must land in style.color.background, got: {markup}"
    )
    assert '"spacing":{"padding":{"top":"60px"}}' in markup, (
        f"padding-top must land in style.spacing.padding.top, got: {markup}"
    )
