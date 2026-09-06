"""grid — the GRID-layer resolver (Spec 31 §3.A, layer L3 / D207 grid engine).

A node carrying ``display:grid`` / ``grid-template-columns`` is the GRID layer
(``layer_detect`` §2.2). Spec 31 §3.A routes its grid CSS to the block's grid attrs.
Two destination families on the container:

  - ``grid-template-columns`` → ``gridTemplateColumns*`` (string template) PLUS, when
    the template is a ``repeat(N, …)`` pattern, the integer column COUNT — ONE
    declaration → a list[Write] of BOTH attrs (the seam decision's multi-Write
    contract; render.php drives column count via the integer attr while keeping
    the raw template). The count destination attr is resolved DB-FIRST via
    ``db.attr_for_grid_column_count`` (a block opts in via an explicit
    ``"css:grid-template-columns:count"`` attrMap pseudo-property entry, e.g.
    ``sgs/nav-menu``'s ``listColumns``), falling back to the ONE remaining
    hardcoded literal (``"columns"``) every pre-existing grid-bearing block
    relies on implicitly. The column-count derivation itself is the faithful
    port of convert.py ``_parse_repeat_columns`` (5494).
  - ``gap`` / ``column-gap`` → the block's ``gap*`` attr (the grid gap).
  - per-grid-ITEM box CSS (``padding``/``box-shadow``/``border-radius``/
    ``background-color``/``color``) → the ``gridItem*`` attrs via
    ``db.attr_for_layer_property(block, 'GRID', css_property)``.

Tier mapping uses the standard device-tier suffix (``tier_suffix``): Base →
unsuffixed, Tablet → ``*Tablet``, Mobile → ``*Mobile`` (Spec 31 §3.A.4; the device
system is fixed 768/1024). Non-device-tier breakpoints gap NO_DESTINATION (§3.A A4).

REUSES main's shared helpers: ``styling_helpers.strip_important``. NO block-slug
literals (F5 gate); all destinations DB-resolved via attr_for_property /
attr_for_layer_property / attr_for_grid_column_count. The ``"columns"`` string
in the count-destination fallback is the one permitted pre-existing literal
(R-31-1) — not a new hardcoded dict, and not removed by this DB-first addition.
"""
from __future__ import annotations

import re
from typing import Any

from converter.models import GAP, GapOrigin, Write
from converter.services.attr_resolve import attr_resolve
from converter.services.gap_writer import gap_writer
from converter.services.state_value_lift import resolve_state_property
from converter.services.styling_helpers import strip_important
from converter.services.tier_object import tier_object_write
from converter.services.tier_suffix import tier_state_suffix
from converter.services.token_snap import token_snap
from converter.services.validate import validate
from converter.services.value_serialise import value_serialise
from converter.db import db_lookup
from converter.db.db_lookup import attr_for_property, tier_object_base

# CSS gap properties → the single grid gap attr family.
_GAP_PROPS = frozenset({"gap", "column-gap"})
# Per-grid-item box CSS routed via the GRID (gridItem*) layer prefix.
# `padding`/`border-radius` FORK by box_family (A1 migration, 2026-07-26,
# see below) — box-shadow/background-color/color stay scalar unconditionally.
_GRID_ITEM_PROPS = frozenset({
    "padding", "box-shadow", "border-radius", "background-color", "color",
})
# Longhand border-radius corner properties → gridItemBorderRadius corner keys
# (A1 migration; only meaningful when box_family_for gates gridItemBorderRadius).
# A closed, fixed CSS-spec vocabulary (border-{top,bottom}-{left,right}-radius) —
# NOT a per-block attr lookup. The prop->corner parse itself is inlined at the
# ONE call site below (box-family-guard requires the box_family reference to
# be in the SAME enclosing scope as any side/corner-token regex — §3 of the
# box-object interface contract).
_GRID_ITEM_RADIUS_LONGHANDS = frozenset({
    "border-top-left-radius", "border-top-right-radius",
    "border-bottom-right-radius", "border-bottom-left-radius",
})


def _expand_border_radius_corners(raw: str) -> dict[str, str]:
    """Expand a ``border-radius`` shorthand value (1-4 space-separated tokens,
    ignoring any ``/`` elliptical-radius second half) into the 4 CSS corners,
    per the CSS border-radius shorthand rule:
        1 value  -> all 4 corners
        2 values -> (TL+BR), (TR+BL)
        3 values -> TL, (TR+BL), BR
        4 values -> TL TR BR BL
    Returns {} for an unparseable (0 or >4 token) value.
    """
    # Only the first (horizontal-radius) half matters for this box-object
    # migration — elliptical `/` vertical-radius half is out of scope (no
    # attr shape for it), matching the existing scalar behaviour which
    # also only ever stored the single shorthand string verbatim.
    first_half = raw.split("/")[0].strip()
    tokens = first_half.split()
    if not 1 <= len(tokens) <= 4:
        return {}
    if len(tokens) == 1:
        tl = tr = br = bl = tokens[0]
    elif len(tokens) == 2:
        tl, br = tokens[0], tokens[0]
        tr, bl = tokens[1], tokens[1]
    elif len(tokens) == 3:
        tl, br = tokens[0], tokens[2]
        tr = bl = tokens[1]
    else:
        tl, tr, br, bl = tokens
    return {"topLeft": tl, "topRight": tr, "bottomRight": br, "bottomLeft": bl}


def _parse_repeat_columns(cols_str: str) -> int | None:
    """Extract N from ``repeat(N, …)``; None for explicit track lists (faithful
    port of convert.py:5494 ``_parse_repeat_columns``)."""
    if not cols_str:
        return None
    m = re.match(r"repeat\(\s*(\d+)\s*,", cols_str.strip(), re.IGNORECASE)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            return None
    return None


def _parse_grid_template_areas_order(raw: str) -> list[str] | None:
    """Flatten a ``grid-template-areas`` shorthand into its area tokens in
    reading order (row-major, first occurrence wins), e.g.::

        '"media" "content"'   -> ["media", "content"]   (2 rows, 1 column)
        '"content media"'     -> ["content", "media"]    (1 row, 2 columns)

    Any run of ``.`` (the CSS null-cell token, e.g. ``.``/``..``/``...``) is
    dropped. Returns None for a value with no quoted rows (unparseable)."""
    rows = re.findall(r'"([^"]*)"', raw)
    if not rows:
        return None
    order: list[str] = []
    seen: set[str] = set()
    for row in rows:
        for token in row.split():
            if token and set(token) == {"."}:
                continue
            if token in seen:
                continue
            seen.add(token)
            order.append(token)
    return order or None


def resolve(decl: Any, ctx: Any) -> Write | list[Write] | GAP:
    prop = decl.property

    if not decl.is_device_tier:
        # F-ii (Spec 31 FR-31-5.2.3 / EXECUTION Step 13): the sub-tier band a
        # non-device threshold creates has no 3-tier attr representation — it
        # PAINTS via css_router's D2 passthrough (Stage 0.7 routes the whole
        # non-device @media rule to the scoped channel). Recorded EXCLUDED,
        # never a suspected-drop.
        return gap_writer(
            ctx, decl, GapOrigin.EXCLUDED,
            f"non-device-tier breakpoint {decl.tier!r} for {prop} — painted "
            f"via the D2 F-ii passthrough channel (§3.A A4 / FR-31-5.2.3)",
        )

    # Direct (block, css_property, css_state) lift for a hover-ONLY destination
    # attr with no un-suffixed base sibling (Spec 31 §3.A step 4a extension,
    # 2026-07-22). None -> fall through to the ordinary per-property chains below.
    state_write = resolve_state_property(decl, ctx)
    if state_write is not None:
        return state_write

    # --- grid-template-areas → splitContentOrder* (media/content order swap) ---
    # A 2-region split composite (hero-shaped) reorders its grid-template-areas
    # between device tiers (mobile: media above content; desktop: content
    # beside media). This is NOT a track-template concern (that's the
    # grid-template-columns branch below) — it stores WHICH region reads
    # first. Destination + eligibility are both DB-derived
    # (db_lookup.content_order_attr_for, R-31-1): no per-block name literal.
    if prop == "grid-template-areas":
        base_attr = db_lookup.content_order_attr_for(ctx.block_slug)
        if base_attr is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} has no media/content order attr for {prop}",
            )
        raw = strip_important(decl.value).strip()
        order = _parse_grid_template_areas_order(raw)
        if order is None or "media" not in order or "content" not in order:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} grid-template-areas value {raw!r} does not "
                "resolve a media/content order",
            )
        # The literal enum member, NEVER '' — '' means INHERIT on this attr
        # (render.php: tablet '' inherits desktop; mobile '' is never equal to
        # 'content-first' so a blank mobile override silently fails to fire
        # and mobile stays media-first). A content-first draft tier must
        # write the explicit 'content-first' string or the render collapses
        # it back to inherit/media-first depending on tier.
        order_value = (
            "media-first" if order.index("media") < order.index("content")
            else "content-first"
        )
        if tier_object_base(ctx.block_slug, base_attr):
            # validate_raw is the derived enum member, NOT the raw CSS
            # shorthand — validate() enum-checks whatever is passed here
            # against the attr's enum_values (currently NULL for
            # splitContentOrder, so this is a no-op today, but the raw CSS
            # string would fail that check the moment an enum is seeded).
            return tier_object_write(
                ctx, decl, prop, base_attr, order_value, validate_raw=order_value
            )
        attr = tier_state_suffix(base_attr, decl, ctx.conn, ctx.block_slug)
        if not validate(ctx, attr, order_value):
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} does not declare {attr!r} (tier {decl.tier})",
            )
        return Write(attr=attr, value=order_value, property=prop, tier=decl.tier)

    # --- grid-template-columns → gridTemplateColumns* (+ columns* count) ---------
    if prop == "grid-template-columns":
        raw = strip_important(decl.value).strip()
        resolved = attr_for_property(ctx.block_slug, prop)
        writes: list[Write] = []

        # The TRACK-LIST (template string) Write — only when the block
        # declares a flat-template destination at all. A block that owns
        # ONLY a count destination (e.g. sgs/nav-menu's `listColumns` —
        # no `gridTemplateColumns` attr exists on that block) skips this
        # whole arm and falls straight to the count Write below; it is NOT
        # an early NO_DESTINATION exit any more (that was the bug this
        # decoupling fixes — see db.attr_for_grid_column_count's docstring).
        if resolved is not None:
            _wp, base_template_attr, _kind = resolved
            template_value = value_serialise("string", None, raw)

            # Spec 35 tier shape (D802-class fix, extended from typography to GRID):
            # a migrated tier-object attr stores its per-device values INSIDE one
            # object ({desktop,tablet,mobile}); the flat gridTemplateColumnsTablet/
            # Mobile siblings this resolver would otherwise target no longer exist
            # on a migrated block. Re-appending a tier suffix there makes
            # `validate` gap the write as NO_DESTINATION and the tier value is
            # discarded SILENTLY — measured live: sgs/container/hero/trust-bar/
            # feature-grid/testimonial-slider all emitted a bare scalar
            # ('1fr 1fr' / 'repeat(4, 1fr)') instead of {"desktop": ...}. Gated on
            # `tier_object_base` (a DB predicate, never a name test — R-31-1).
            if tier_object_base(ctx.block_slug, base_template_attr):
                template_write = tier_object_write(
                    ctx, decl, prop, base_template_attr, template_value, validate_raw=raw
                )
                if isinstance(template_write, GAP):
                    return template_write
                writes.append(template_write)
            else:
                template_attr = tier_state_suffix(base_template_attr, decl, ctx.conn, ctx.block_slug)
                if not validate(ctx, template_attr, decl.value):
                    return gap_writer(
                        ctx, decl, GapOrigin.NO_DESTINATION,
                        f"{ctx.block_slug} does not declare {template_attr!r} (tier {decl.tier})",
                    )
                writes.append(
                    Write(attr=template_attr, value=template_value, property=prop, tier=decl.tier)
                )

        # Second Write of the list (or, when the block owns no template
        # destination at all, the FIRST and ONLY Write): the integer column
        # count from repeat(N, …). Resolved DB-FIRST via
        # db.attr_for_grid_column_count — a block opts in via an explicit
        # "css:grid-template-columns:count" attrMap pseudo-property entry
        # (e.g. sgs/nav-menu's `listColumns`) — falling back to the ONE
        # remaining hardcoded literal ("columns") that every pre-existing
        # grid-bearing block relies on implicitly. `columns` is a SEPARATE
        # attr from gridTemplateColumns and is checked independently against
        # tier_object_base — same mechanism, same reasoning.
        n = _parse_repeat_columns(raw)
        if n is not None:
            base_count_attr = db_lookup.attr_for_grid_column_count(ctx.block_slug) or "columns"
            if tier_object_base(ctx.block_slug, base_count_attr):
                count_write = tier_object_write(
                    ctx, decl, prop, base_count_attr, n, validate_raw=str(n)
                )
                if not isinstance(count_write, GAP):
                    writes.append(count_write)
            else:
                count_attr = tier_state_suffix(base_count_attr, decl, ctx.conn, ctx.block_slug)
                if validate(ctx, count_attr, str(n)):
                    writes.append(
                        Write(attr=count_attr, value=n, property=prop, tier=decl.tier)
                    )

        if not writes:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} has no attr for {prop} (template or count)",
            )
        return writes

    # --- gap / column-gap → gap* -------------------------------------------------
    if prop in _GAP_PROPS:
        # Resolve via the block's actual gap attr (attr_for_property handles 'gap';
        # 'column-gap' shares the same destination family — resolve through 'gap').
        resolved = attr_for_property(ctx.block_slug, "gap")
        if resolved is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} has no gap attr for {prop}",
            )
        _wp, base_gap_attr, _kind = resolved
        value = token_snap(
            "gap", value_serialise("string", None, strip_important(decl.value).strip()),
            ctx.conn,
        )
        # Spec 35 tier shape (D802-class fix): the migrated gap attr stores its
        # per-device values INSIDE one object — see the grid-template-columns
        # branch above for the full rationale (identical mechanism).
        if tier_object_base(ctx.block_slug, base_gap_attr):
            return tier_object_write(ctx, decl, prop, base_gap_attr, value, validate_raw=decl.value)
        gap_attr = tier_state_suffix(base_gap_attr, decl, ctx.conn, ctx.block_slug)
        if not validate(ctx, gap_attr, decl.value):
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} does not declare {gap_attr!r} (tier {decl.tier})",
            )
        return Write(attr=gap_attr, value=value, property=prop, tier=decl.tier)

    # --- padding/border-radius FORK by box_family (A1 migration, 2026-07-26) ----
    # gridItemPadding/gridItemBorderRadius are now box-object attrs on the 4
    # composite-mirror blocks (container/cta-section/hero/trust-bar). When
    # box_family_for gates the resolved attr, expand the shorthand into
    # sides/corners and emit ONE Write per side/corner — the orchestrator's
    # accumulator (ElementResult.attrs, box_family_for-generic) folds them
    # into a single merged object attr, no per-block code. box-shadow/
    # background-color/color (and a block still on the flat scalar shape)
    # fall through unchanged to the scalar path below. NEVER a name regex —
    # gated exclusively on db_lookup.box_family_for (§3.A step-3b AST gate).
    if prop == "padding":
        base_attr = attr_resolve(ctx, "GRID", prop)
        if base_attr is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} has no GRID (gridItem*) attr for {prop}",
            )
        attr = tier_state_suffix(base_attr, decl, ctx.conn, ctx.block_slug)
        if db_lookup.box_family_for(ctx.block_slug, attr) is not None:
            # Lazy import — root_supports imports converter.dispatch_spine, which
            # imports converter.resolvers (this package); a top-level import here
            # would be circular (mirrors outer_box.py's identical lazy-import of
            # the same helper for the same reason).
            from converter.services.root_supports import _parse_padding_shorthand
            raw = strip_important(decl.value).strip()
            parsed = _parse_padding_shorthand(raw)
            if parsed is None:
                return gap_writer(
                    ctx, decl, GapOrigin.NO_DESTINATION,
                    f"{ctx.block_slug} padding value {raw!r} not parseable as a box shorthand",
                )
            writes: list[Write] = [
                Write(
                    attr=attr,
                    value={side: value_serialise("string", None, val.strip())},
                    property=prop,
                    tier=decl.tier,
                )
                for side, val in parsed.items()
            ]
            return writes
        # box_family_for is None (block still flat, or attr not seeded) —
        # fall through to the scalar path below unchanged.

    if prop == "border-radius":
        base_attr = attr_resolve(ctx, "GRID", prop)
        if base_attr is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} has no GRID (gridItem*) attr for {prop}",
            )
        attr = tier_state_suffix(base_attr, decl, ctx.conn, ctx.block_slug)
        if db_lookup.box_family_for(ctx.block_slug, attr) is not None:
            raw = strip_important(decl.value).strip()
            corners = _expand_border_radius_corners(raw)
            writes = []
            for corner, corner_val in corners.items():
                value = value_serialise("string", None, corner_val.strip())
                writes.append(
                    Write(attr=attr, value={corner: value}, property=prop, tier=decl.tier)
                )
            if not writes:
                return gap_writer(
                    ctx, decl, GapOrigin.NO_DESTINATION,
                    f"{ctx.block_slug} border-radius value {raw!r} not parseable as a "
                    "1-4-value shorthand",
                )
            return writes
        # box_family_for is None — fall through to the scalar path below unchanged.

    # --- longhand border-radius corners (border-top-left-radius etc.) → the
    # SAME gridItemBorderRadius box-object attr, ONE corner per Write. Only
    # meaningful when gridItemBorderRadius is box-family-gated for this
    # block — a block still flat has no per-corner destination, so this
    # longhand set is an honest NO_DESTINATION gap there (a flat scalar
    # attr cannot represent a single corner without clobbering the others).
    if prop in _GRID_ITEM_RADIUS_LONGHANDS:
        base_attr = attr_resolve(ctx, "GRID", "border-radius")
        if base_attr is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} has no GRID (gridItem*) attr for border-radius "
                f"(longhand {prop})",
            )
        attr = tier_state_suffix(base_attr, decl, ctx.conn, ctx.block_slug)
        box_family = db_lookup.box_family_for(ctx.block_slug, attr)
        if box_family is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug}'s gridItemBorderRadius is not a box-object attr — "
                f"{prop} longhand has no per-corner destination",
            )
        # box_family confirmed non-None above — safe to parse the longhand's
        # corner token from its CSS-spec-fixed vocabulary.
        _corner_match = re.match(r"^border-(top|bottom)-(left|right)-radius$", prop)
        corner = _corner_match.group(1) + _corner_match.group(2).capitalize()
        value = value_serialise("string", None, strip_important(decl.value).strip())
        return Write(attr=attr, value={corner: value}, property=prop, tier=decl.tier)

    # --- per-grid-item box CSS → gridItem* (scalar path — box-shadow/
    # background-color/color always; padding/border-radius only reach here
    # when box_family_for returned None above, i.e. a block still flat) ----
    if prop in _GRID_ITEM_PROPS:
        base_attr = attr_resolve(ctx, "GRID", prop)
        if base_attr is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} has no GRID (gridItem*) attr for {prop}",
            )
        attr = tier_state_suffix(base_attr, decl, ctx.conn, ctx.block_slug)
        if not validate(ctx, attr, decl.value):
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} does not declare {attr!r} (tier {decl.tier})",
            )
        value = value_serialise("string", None, strip_important(decl.value).strip())
        return Write(attr=attr, value=value, property=prop, tier=decl.tier)

    # align-items is NOT a GRID-resolver destination by DESIGN (D172): for
    # container-wrapper blocks align-items routes via the OUTER VerticalAlign path
    # (the wrapper renders `verticalAlign`, memory `converter-attr-must-match-the-
    # attr-render-reads`), NOT the grid layer. Emit an explicit NO_DESTINATION gap
    # naming that routing decision — a documented routing choice, never a silent stub.
    if prop == "align-items":
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            "align-items routes via the OUTER VerticalAlign path (D172 — wrapper "
            "blocks render verticalAlign), not the GRID resolver; this is a "
            "documented routing decision, not an unbuilt grid destination",
        )

    # A GRID-layer property this resolver does not yet own — honest tracked stub.
    return gap_writer(
        ctx, decl, GapOrigin.UNIMPLEMENTED_STUB,
        f"grid resolver does not own GRID property '{prop}' yet",
    )
