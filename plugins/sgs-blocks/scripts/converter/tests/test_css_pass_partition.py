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
from converter.services import styling_helpers as sh


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

    # Configure colour resolution the way the live pipeline does (converter.entry
    # .convert_section) so the draft `var(--text-muted)` snaps to the real theme
    # palette slug. D307 (code-review): a bare draft var is emitted as a slug ONLY
    # when it validates against a configured theme palette — otherwise it would be
    # an undefined var(--wp--preset--color--text-muted) at render (D306 bug class).
    # This test exercises the PARTITION routing (color → textColour, not the
    # blanket strip), so it must feed the same validated-colour context production
    # does, not rely on the old unvalidated inert passthrough.
    sh.reset_colour_resolution()
    sh.configure_colour_resolution(
        {"text-muted": "#6b5c50"}, {"#6b5c50": "text-muted"}
    )
    try:
        css_rules = {".sgs-section-heading__intro": {"color": "var(--text-muted)"}}
        markup = build_block_markup(rec, node, css_rules=css_rules, is_root=True)
    finally:
        sh.reset_colour_resolution()

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
# Test 2 — sgs/container `gap` reaches its FUNCTIONAL destination: the `gap`
# attr (via the grid resolver / attr_for_property), NOT a dead
# style.spacing.blockGap leaf. UPDATED for the QC #1 fix (2026-07-06): sgs/
# container declares spacing supports {padding, margin} — NO blockGap — so the
# native-supports lift must NOT consume `gap` (it did, via the same-leaf gate
# shortcut, into an inert style.spacing.blockGap the wrapper never reads —
# proven live: container grids rendered flush). Post-fix the gap flows through
# to the grid resolver's `gap` attr, which SGS_Container_Wrapper actually renders.
# ---------------------------------------------------------------------------

def test_container_gap_reaches_destination_attr():
    """A `gap` decl on a nested sgs/container (display:grid) must reach the
    FUNCTIONAL `gap` attr — never a dead style.spacing.blockGap leaf the block
    has no support for and the wrapper never reads (QC #1)."""
    node = _node('<div class="sgs-container"><h2 class="sgs-heading">Hi</h2></div>')
    rec = recognise(node)
    assert rec.slug == "sgs/container"

    css_rules = {".sgs-container": {"display": "grid", "gap": "24px"}}
    markup = build_block_markup(rec, node, css_rules=css_rules, is_root=False)

    assert '"gap":"24px"' in markup, (
        f"gap must land in the `gap` attr (the wrapper-rendered destination) for a "
        f"container with no blockGap support, got: {markup}"
    )
    assert '"blockGap"' not in markup, (
        f"gap must NOT land in a dead style.spacing.blockGap leaf (container has no "
        f"blockGap support; wrapper reads `gap`), got: {markup}"
    )


# ---------------------------------------------------------------------------
# Test 3 — gap flows through to the grid resolver at EVERY tier for a container
# without blockGap support. UPDATED for the QC #1 fix (2026-07-06): before the
# fix the native lift's same-leaf gate shortcut wrongly consumed the BASE gap
# into a dead style.spacing.blockGap leaf while the Mobile tier flowed through
# (because the per-device candidate name `blockgap{Suffix}` never matched the
# real `gap{Suffix}` schema attr) — an inconsistent split that left base grids
# flush live. Post-fix the native gate checks `spacing.blockGap` SPECIFICALLY,
# rejects it for a {padding,margin}-only container at every tier, so BOTH base
# and Mobile gaps flow through to the grid resolver's real `gap`/`gapMobile` attrs.
# ---------------------------------------------------------------------------

def test_bp_tier_not_consumed_by_native_lift_flows_through():
    """A container without blockGap support: BOTH the base gap and the Mobile
    tier's gap must flow through to the grid resolver's real attrs (`gap` /
    `gapMobile`), not a dead style.spacing.blockGap leaf (QC #1)."""
    node = _node('<div class="sgs-container"><h2 class="sgs-heading">Hi</h2></div>')
    rec = recognise(node)
    assert rec.slug == "sgs/container"

    css_rules = {
        ".sgs-container": {"display": "grid", "gap": "24px"},
        "max-width: 767 :: .sgs-container": {"gap": "32px"},
    }
    markup = build_block_markup(rec, node, css_rules=css_rules, is_root=False)

    # Base tier: NOT natively consumed (no blockGap support) → real `gap` attr.
    assert '"gap":"24px"' in markup, (
        f"base-tier gap must flow through to the `gap` attr, got: {markup}"
    )
    assert '"blockGap"' not in markup, (
        f"gap must NOT land in a dead style.spacing.blockGap leaf, got: {markup}"
    )
    # Mobile tier → the grid resolver derives the correct `gapMobile` attr.
    assert '"gapMobile":"32px"' in markup, (
        f"the Mobile-tier gap must flow through to process_element and land as "
        f"gapMobile, got: {markup}"
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
