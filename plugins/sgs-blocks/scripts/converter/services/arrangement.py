"""arrangement.py — Spec 31 §2.3/§2.4/§2.5 arrangement-layer helpers.

The ARRANGEMENT layer (§2.3) is the level that lays out its DIRECT children as
grid/flex items. This module provides two name-free, DB-driven helpers used by the
container-default recursive descent (``extraction._descend_container_children``):

  * ``carries_arrangement(node, css_rules)`` — §2.3 CSS-signature detection: is this
    node the ARRANGEMENT layer (``display:grid``|``display:flex`` OR a
    ``grid-template-columns`` track list)?  Detected by CSS SIGNATURE, never a class
    name (R-31-2 / D85).
  * ``lift_uniform_grid_item_css(...)`` — §2.5 per-property uniform fold: a box-CSS
    property whose value is IDENTICAL on EVERY grid item folds to the container's
    ``gridItem*`` default attr; a property that differs on even one item stays on
    the child.  The eligible-property list is DERIVED from what the items actually
    declare and resolved per-property via ``db_lookup.attr_for_layer_property(slug,
    'GRID', prop)`` — there is deliberately NO hardcoded property probe-list (the
    frozen ``_GRID_ITEM_BOX_PROPS`` tuple is exactly the R-31-1 literal this avoids).

No block or slot string literals (scanned by gates/no_slug_literal).
"""
from __future__ import annotations

from typing import Any

from bs4 import Tag

from converter.context import ScalarLift
from converter.services.styling_helpers import collect_css_decls_for_element, strip_important
from converter.db import db_lookup


def _decls_arrange(decls: dict[str, str]) -> bool:
    """A declaration block IS the arrangement layer when it lays out direct children."""
    disp = (decls.get("display", "") or "").strip().lower()
    if disp in ("grid", "flex"):
        return True
    # A grid track list makes the node a grid container even without an explicit
    # display:grid in the same rule (some drafts declare only grid-template-columns).
    return "grid-template-columns" in decls


def carries_arrangement(node: Any, css_rules: dict | None) -> bool:
    """§2.3 — True when ``node``'s OWN CSS makes it the ARRANGEMENT layer.

    Tier-invariant: the grid-item test holds at every breakpoint (a section that is
    1-col on mobile and 2-col on desktop is STILL a grid at both tiers), so a match
    in the base decls OR any @media tier counts. Detected by CSS signature, never a
    class name (R-31-2). Returns False for a bare content/flow node.
    """
    if not isinstance(node, Tag):
        return False
    base, bp = collect_css_decls_for_element(node, css_rules or {})
    if _decls_arrange(base):
        return True
    for tier_decls in (bp or {}).values():
        if isinstance(tier_decls, dict) and _decls_arrange(tier_decls):
            return True
    return False


def layout_attrs(node: Any, css_rules: dict | None, block_slug: "str | None" = None) -> dict:
    """§2.3 ARRANGEMENT -> the container's layout trigger attrs.

    A container-equivalent block renders ``display:grid``/``display:flex`` ONLY when its
    ``layout`` attr is set (class-sgs-container-wrapper.php gates on ``'grid'===$layout``
    / ``'flex'===$layout``). ``gridTemplateColumns`` alone is INERT without it — the
    nested-grid stacking bug (ingredients / products / gift / social-proof all stacked
    because the grid value emitted but the container stayed display:block).

    Returns ``{'layout':'grid'}`` for a grid container, ``{'layout':'flex',
    'flexDirection':<dir>}`` for a flex container (flexDirection only when the draft
    declares a valid one), or ``{}`` when the node is not an arrangement layer. Detected
    by CSS signature (R-31-2), tier-aware (a grid that only appears at a breakpoint still
    makes the container a grid). Universal (R-31-9); the caller DB-gates emission on the
    block actually declaring a ``layout`` attr, so a non-container block never gets a dead
    attr.

    ``block_slug`` (Spec 35 tier shape, D802-class fix extended to this dict-merge
    path): when given, and the resolved block's ``flexDirection`` is a migrated
    tier-object attr (``db_lookup.tier_object_base``), the value is wrapped as
    ``{"desktop": <dir>}`` instead of the bare string — measured live on
    sgs/multi-button, whose ``flexDirection`` emitted a flat ``"row"`` scalar
    (check_flat_tier_regression.py). This function has no per-declaration tier
    context of its own (it reads whichever tier's CSS first matches, base-first)
    so every value it derives here is treated as the DESKTOP/base tier — the
    same "Base" convention every other resolver uses for the un-suffixed value.
    ``None`` (the default) preserves the flat, pre-fix behaviour for every
    existing caller that has not been updated to pass a slug — a defensive,
    backward-safe default rather than a required-argument break.
    """
    if not isinstance(node, Tag):
        return {}

    def _pick(decls: dict[str, str]) -> dict:
        disp = (decls.get("display", "") or "").strip().lower()
        if disp == "grid" or "grid-template-columns" in decls:
            return {"layout": "grid"}
        if disp == "flex":
            out: dict = {"layout": "flex"}
            fd = (decls.get("flex-direction", "") or "").strip().lower()
            if fd in ("row", "row-reverse", "column", "column-reverse"):
                out["flexDirection"] = fd
            return out
        return {}

    base, bp = collect_css_decls_for_element(node, css_rules or {})
    picked = _pick(base)
    if not picked:
        for tier_decls in (bp or {}).values():
            if isinstance(tier_decls, dict):
                picked = _pick(tier_decls)
                if picked:
                    break
    if not picked:
        return {}

    if (
        block_slug is not None
        and "flexDirection" in picked
        and db_lookup.tier_object_base(block_slug, "flexDirection")
    ):
        picked = dict(picked)
        picked["flexDirection"] = {"desktop": picked["flexDirection"]}
    return picked


def lift_uniform_grid_item_css(
    grid_item_nodes: list[Any],
    css_rules: dict | None,
    container_slug: str,
) -> list[ScalarLift]:
    """§2.5 — uniform per-item box-CSS folds to the container's ``gridItem*`` attrs.

    A property folds ONLY when (a) it is declared on EVERY item and (b) its value is
    IDENTICAL across all of them; otherwise it stays on the individual child block.
    N < 2 items → no-op (nothing to compare). The destination attr is resolved
    per-property via ``db_lookup.attr_for_layer_property(container_slug, 'GRID',
    prop)`` (DB-driven, R-31-1 — no hardcoded property list). A property with no
    ``gridItem*`` destination is NOT folded here (the child keeps its own CSS; a real
    gap surfaces on the child's own CSS pass), never silently dropped from the clone.

    Returns a list of ``ScalarLift`` (attr → uniform value) that ``build_block_markup``
    merges onto the container's attrs. Base tier only — per-item responsive CSS
    belongs to the item block's own attrs, not a uniform container override (matches
    the frozen ``_lift_uniform_grid_item_css`` contract, convert.py:2808).
    """
    items = [n for n in grid_item_nodes if isinstance(n, Tag)]
    if len(items) < 2:
        return []

    per_item: list[dict[str, str]] = [
        collect_css_decls_for_element(n, css_rules or {})[0] for n in items
    ]

    # Candidate = a property declared on EVERY item (uniform-presence necessary).
    common: set[str] = set(per_item[0])
    for decls in per_item[1:]:
        common &= set(decls)

    lifts: list[ScalarLift] = []
    for prop in sorted(common):
        values = {strip_important(decls[prop]).strip() for decls in per_item}
        if len(values) != 1:
            continue  # differs on at least one item → stays on the child (§2.5)
        try:
            attr = db_lookup.attr_for_layer_property(container_slug, "GRID", prop)
        except Exception:  # noqa: BLE001 — DB unavailable in test env → no-op
            attr = None
        if attr is None:
            continue  # no gridItem* destination → child keeps its own CSS
        try:
            box_family = db_lookup.box_family_for(container_slug, attr)
        except Exception:  # noqa: BLE001 — DB unavailable in test env → no-op
            box_family = None
        if box_family is not None:
            # A1 migration (2026-07-26): gridItemPadding/gridItemBorderRadius are
            # box-object attrs — a flat ScalarLift into a dict-typed attr would
            # collide at the extraction.py merge. The per-declaration grid.py
            # resolver path (padding/border-radius fork) already handles these
            # via per-side/per-corner Writes on the CHILD's own CSS pass, so
            # skip the uniform-fold here rather than decompose the comparison
            # per-side — the child path is correct and this is a pure no-op for
            # box-family attrs (never a name regex; box_family_for-gated).
            continue
        lifts.append(ScalarLift(attr=attr, value=values.pop()))
    return lifts
