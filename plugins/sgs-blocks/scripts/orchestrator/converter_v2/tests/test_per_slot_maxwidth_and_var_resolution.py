"""test_per_slot_maxwidth_and_var_resolution.py — Lock-in tests proving the two
converter fixes from 2026-06-13 actually FIRE on the real converter path (not
just "no regression").

FIX A — H-C1 (per-slot max-width routing):
    A leaf/area element's OWN max-width (e.g. `.sgs-hero__subHeadline { max-width:420px }`)
    must route to the owning block's per-slot max-width attr (`subHeadlineMaxWidth`,
    consumed by hero/render.php:341 as `absint($v) . 'px'`), NOT to the shared
    `contentWidth` band. The fix routes max-width BEFORE the `_area_excluded`
    exclusion (which still guards the OUTER/section widthMode path).

    NOTE: `subHeadlineMaxWidth` is a NUMBER-typed attr with no `*Unit` companion
    registered, so the faithful emit is the integer `420` — render.php appends the
    `px` unit itself (render.php:341). Asserting `420` (not the string '420px') is
    the HONEST end-of-path value; render produces `420px`.

FIX B — IN-B (general co-declared var() resolution):
    Bean's draft convention co-declares `max-width:var(--content-width); --content-width:960px`
    on the SAME element. The lift at `_emit_wrapper_container` must store the
    RESOLVED literal (`960px`), never the raw `var(--content-width)` string.

Both tests drive the REAL converter functions (`_route_area_css_to_block_attrs`
and `_emit_wrapper_container`) — they would fail if the fixes were reverted.

Mirrors the path setup + import pattern of test_gf_b2_css_scope.py /
test_g1_leaf_lift.py.
"""
from __future__ import annotations

import sys
import os

sys.stdout.reconfigure(encoding="utf-8")

_SCRIPTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from bs4 import BeautifulSoup  # noqa: E402
from orchestrator.converter_v2 import convert  # noqa: E402
from orchestrator.converter_v2 import db_lookup as db  # noqa: E402


# ---------------------------------------------------------------------------
# FIX A — H-C1: per-slot max-width routing
# ---------------------------------------------------------------------------

def test_hc1_per_slot_max_width_routes_to_owning_attr_not_contentwidth():
    """A hero sub-headline's own max-width must land on `subHeadlineMaxWidth`
    (the per-slot attr render.php consumes), NEVER on the shared `contentWidth`.

    Drives the real `_route_area_css_to_block_attrs`. If the H-C1 fix is reverted
    (max-width skipped by `_area_excluded` before per-slot routing), the attr is
    never set and this assertion fails.
    """
    # Precondition: the DB lookup the fix depends on must resolve, else the fix
    # cannot fire. Report it explicitly rather than asserting downstream blind.
    resolved_attr = db.attr_for_area_property("sgs/hero", "subHeadline", "max-width")
    assert resolved_attr == "subHeadlineMaxWidth", (
        "PRECONDITION FAILED: attr_for_area_property('sgs/hero','subHeadline','max-width') "
        f"returned {resolved_attr!r}, not 'subHeadlineMaxWidth'. The H-C1 fix cannot fire "
        "without this DB mapping — the per-slot attr does not exist for this area."
    )

    html = '<div class="sgs-hero__subHeadline">Made fresh daily</div>'
    node = BeautifulSoup(html, "html.parser").find("div")
    css_rules = {".sgs-hero__subHeadline": {"max-width": "420px"}}
    parent_attrs: dict = {}

    convert._route_area_css_to_block_attrs(
        child_node=node,
        area="subHeadline",
        owning_block="sgs/hero",
        parent_attrs=parent_attrs,
        css_rules=css_rules,
    )

    # subHeadlineMaxWidth is number-typed (no *Unit companion) → faithful value is
    # the integer 420; hero/render.php:341 appends the 'px' unit.
    assert parent_attrs.get("subHeadlineMaxWidth") == 420, (
        "H-C1 regression: the sub-headline's max-width did NOT route to the "
        f"per-slot attr `subHeadlineMaxWidth`. Got parent_attrs={parent_attrs!r}. "
        "If empty, max-width is being skipped by _area_excluded before per-slot routing."
    )
    assert "contentWidth" not in parent_attrs, (
        "H-C1 regression: the per-slot max-width leaked to the SHARED `contentWidth` "
        f"band instead of the owning per-slot attr. parent_attrs={parent_attrs!r}"
    )


def test_hc1_area_without_per_slot_attr_does_not_set_contentwidth():
    """An area with NO registered per-slot max-width attr (e.g. hero `content`)
    must NOT have its max-width routed anywhere by the per-area router — the
    section/OUTER widthMode path stays untouched (max-width remains in
    `_area_excluded` for that area)."""
    # Precondition: confirm `content` area has no per-slot max-width attr.
    assert db.attr_for_area_property("sgs/hero", "content", "max-width") is None, (
        "Test fixture assumption broken: hero `content` now HAS a per-slot "
        "max-width attr; pick another area with none."
    )

    html = '<div class="sgs-hero__content">Body</div>'
    node = BeautifulSoup(html, "html.parser").find("div")
    css_rules = {".sgs-hero__content": {"max-width": "700px"}}
    parent_attrs: dict = {}

    convert._route_area_css_to_block_attrs(
        child_node=node,
        area="content",
        owning_block="sgs/hero",
        parent_attrs=parent_attrs,
        css_rules=css_rules,
    )

    # No per-slot attr → max-width must be left alone (widthMode path untouched).
    assert "contentWidth" not in parent_attrs, (
        "H-C1 over-reach: an area without a per-slot max-width attr leaked to "
        f"`contentWidth`. parent_attrs={parent_attrs!r}"
    )
    assert "contentMaxWidth" not in parent_attrs, (
        f"H-C1 over-reach: unexpected width attr set. parent_attrs={parent_attrs!r}"
    )


# ---------------------------------------------------------------------------
# FIX B — IN-B: co-declared var() resolution
# ---------------------------------------------------------------------------

def test_inb_co_declared_var_resolves_to_literal_in_emitted_block():
    """A wrapper folding `max-width:var(--content-width)` with co-declared
    `--content-width:960px` must emit `contentWidth:"960px"` (resolved literal),
    never the raw `var(--content-width)` string.

    Drives the real `_emit_wrapper_container` (the actual lift site). If the IN-B
    fix is reverted, the emit contains the raw var() string and this fails.
    """
    html = (
        '<div class="sgs-promo">'
        '  <div class="sgs-promo__inner">'
        '    <p class="sgs-text">Hello</p>'
        '  </div>'
        '</div>'
    )
    soup = BeautifulSoup(html, "html.parser")
    node = soup.find("div", class_="sgs-promo")
    css_rules = {
        ".sgs-promo__inner": {
            "max-width": "var(--content-width)",
            "--content-width": "960px",
            "margin": "0 auto",
        },
    }
    classes = node.get("class", []) or []
    sgs_classes = [c for c in classes if c.startswith("sgs-")]

    out = convert._emit_wrapper_container(
        node=node,
        classes=classes,
        sgs_classes=sgs_classes,
        css_rules=css_rules,
        depth=0,
        variation_buf=[],
        parent_block=None,
    )

    assert '"contentWidth":"960px"' in out, (
        "IN-B regression: the co-declared var() did NOT resolve to its literal. "
        f"Expected contentWidth:\"960px\" in the emitted block, got:\n{out}"
    )
    assert "var(--content-width)" not in out, (
        "IN-B regression: the RAW var() string leaked into the emitted block "
        f"(should have been resolved to 960px):\n{out}"
    )


def test_inb_resolver_flags_unresolvable_var_not_silent_drop():
    """The resolver must return the ORIGINAL value (flag-not-drop, FR-22-21 step 6)
    when the custom prop is absent and no fallback is given — never silently lose it."""
    out = convert._resolve_co_declared_var("var(--missing)", {})
    assert out == "var(--missing)", (
        f"IN-B: unresolvable var() must be returned unchanged (flag-not-drop), got {out!r}"
    )
    # Fallback is honoured when present.
    out2 = convert._resolve_co_declared_var("var(--missing, 800px)", {})
    assert out2 == "800px", f"IN-B: fallback not honoured, got {out2!r}"
