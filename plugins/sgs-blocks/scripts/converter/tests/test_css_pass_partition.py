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

import pytest

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

    # sgs/container.gap is a MIGRATED tier-object attr (Spec 35 / D802-class
    # fix extended to GRID, this fix) — the Base value lands in the object's
    # 'desktop' key, not a bare scalar.
    assert '"gap":{"desktop":"24px"}' in markup, (
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

@pytest.mark.xfail(strict=True, reason=(
    "D554 ruling C: the converter deliberately STAYS FLAT until the Spec 39 rework; a temporary shim was rejected by name. This test asserts the pre-migration flat tier-suffixed shape for a property whose block.json is now a tier OBJECT, so it cannot pass until Spec 39 lands. strict=True so it FAILS LOUD the moment the converter starts emitting tier objects - i.e. this is a live Spec 39 checklist, not a silenced test. See .claude/plans/archive/2026-08-12-converter-db-drift.md."
))
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
    """A natively-consumed property must land in `style.*` exactly once and must
    NOT also reach process_element (a double-route would raise a collision /
    unrouted ConservationError, or silently produce a second destination).

    ⛔ REWRITTEN 2026-08-12. This test used to assert the SAME property twice
    over — its premise was "background-color IS natively supported on
    sgs/container (color.background = True)". **D581 (2026-08-11) deliberately
    REMOVED `supports.color` background/gradients from container/hero/
    cta-section/trust-bar** ("it was live and silently winning a conflict with"
    the redesigned Background/overlay panel), so that premise is dead: container
    now declares only `text`/`link`/`heading`, and `root_supports.py:100` can no
    longer route `background-color` natively.

    ⛔ Do NOT "fix" this by restoring `"background": true` — that reinstates the
    exact conflict D581 removed.

    ⛔ CORRECTED 2026-08-22. The 2026-08-12 rewrite above picked `padding-top` on
    the stated premise that it "is still genuinely native-consumed
    (`supports.spacing.padding`)". That premise was ALREADY FALSE when written:
    `supports.spacing` was removed from container/block.json at `7422698e`
    (D555 box-object migration), which predates the rewrite. The test passed
    anyway because the shared DB still carried a stale `spacing.padding` row
    that happened to agree with the wrong premise — `root_supports.py` gates the
    native lift on the DB (`db_lookup.block_supports_for`), not on block.json.
    The 2026-08-22 `/sgs-update` reseed purged that stale row and the false
    premise became visible. The DB is correct; this docstring was not.

    MEASURED 2026-08-22 on sgs/container: `padding-top:60px` -> emitted ONCE as
    `contentBandPadding`; `font-size` and `letter-spacing` -> emitted ZERO times.
    There is no longer ANY property on this block that lands in `style.*` via the
    native lift, so the original "native leaf" form of this test has no valid
    subject here.

    What the test still guards, and what it now asserts: the NO-DOUBLE-EMIT
    invariant — a routed property appears EXACTLY ONCE, never once natively and
    again through process_element. That is the collision/unrouted guard this file
    exists for, and it is destination-agnostic.

    ⚠ Separately worth someone's attention (NOT fixed here, out of this change's
    scope): container declares typography fontSize/letterSpacing as supported, yet
    both transfer ZERO times through this path. That is either a real gap or a
    deliberate skip-serialisation consequence; it has not been diagnosed.
    """
    node = _node('<div class="sgs-container"><h2 class="sgs-heading">Hi</h2></div>')
    rec = recognise(node)
    assert rec.slug == "sgs/container"

    css_rules = {
        ".sgs-container": {"padding-top": "60px"},
    }
    # Must not raise (a double-route would surface as a ConservationError from
    # process_element — COLLISION or an unnecessary UNROUTED for a property
    # that should have been fully absorbed by the native lift).
    markup = build_block_markup(rec, node, css_rules=css_rules, is_root=False)

    assert markup.count("60px") == 1, (
        f"a natively-consumed length must appear exactly once (style.spacing."
        f"padding only), got {markup.count('60px')} occurrences: {markup}"
    )
    # ⚠ CORRECTED 2026-09-06 (Phase 2 tier-object migration). The prior
    # expectation here — `{"top":"60px"}` with no `desktop` wrapper — was
    # itself a latent bug this fix uncovered: `contentBandPadding` IS a
    # TIER-of-BOXES attr ({desktop,tablet,mobile}), and the converter's own
    # merge logic (`dispatch_spine.attrs()`) could not tell that apart from a
    # genuinely flat box family, so it merged the Base-tier write directly
    # onto the attr with no tier nesting at all — exactly the same defect
    # this session found and fixed for `padding`/`margin`/`borderRadius`,
    # just never caught for `contentBandPadding` because no test exercised
    # its Base-tier-only shape this precisely. `box_family_is_tier_shaped()`
    # (converter/db/db_lookup.py) is the fix; this assertion reflects the
    # now-correct output.
    assert '"contentBandPadding":{"desktop":{"top":"60px"}}' in markup, (
        f"padding-top must land in contentBandPadding.desktop.top — container "
        f"has no supports.spacing since 7422698e, so there is no native "
        f"style.spacing leaf for it to take. Got: {markup}"
    )
    # Post-D581 guard: container no longer declares supports.color.background,
    # so nothing may emit a native background leaf for it. This is the assertion
    # that would fail if someone "fixed" the removed support by restoring it.
    assert '"color":{"background"' not in markup, (
        f"container declares no color.background support since D581 — nothing "
        f"may emit a native background leaf, got: {markup}"
    )
