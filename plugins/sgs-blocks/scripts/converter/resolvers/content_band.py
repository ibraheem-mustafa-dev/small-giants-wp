"""content_band — the CONTENT-layer resolver (Spec 31 §3.A, layer L2).

The CONTENT band is a non-root inner element that constrains content width
(``max-width`` + margin-centring, or a ``--content-width`` custom property —
detected by ``layer_detect`` — the live MF-3 root-guard). Spec 31
§3.A.3 routes the band's ``max-width`` to the block's CONTENT-layer attr
(``contentWidth`` for sgs/container) via ``db.attr_for_layer_property(block,
'CONTENT', css_property)``; the old 3-way MaxWidth/ContentSize/WideSize widthMode
snap is RETIRED (D230/D231) — contentWidth is a token-or-literal, written verbatim
here (token-snap is identity for length literals, §3.A.6).

Real transfers (this resolver OWNS the CONTENT layer):
  - ``max-width`` → ``contentWidth*`` (the content-band cap; §3.A.3 L2)

CONTENT-band padding longhands are an HONEST DB-ROUTING GAP for sgs/container: the
block declares ``contentBandPadding{Side}*`` (NOT the ``contentPadding{Side}*`` the
layer resolver derives from the ``content`` prefix). ``attr_for_layer_property``
returns None for content padding, so those declarations gap NO_DESTINATION with a
proposed-action reason (Spec 31 §3.A.8 — never silent). Closing this is a
``property_suffixes`` seed / DB change (STOP-24 override channel), NOT a resolver
workaround.

REUSES main's shared helpers: ``fold_helpers._resolve_co_declared_var`` for a band
``max-width:var(--content-width)``; ``styling_helpers.strip_important``. NO
block-slug literals.
"""
from __future__ import annotations

from typing import Any

from converter.db import db_lookup
from converter.models import GAP, GapOrigin, Write
from converter.services.attr_resolve import attr_resolve
from converter.services.border_side import border_side_write
from converter.services.fold_helpers import _resolve_co_declared_var
from converter.services.gap_writer import gap_writer
from converter.services.styling_helpers import (
    extract_token_or_hex,
    split_value_unit,
    strip_important,
)
from converter.services.state_value_lift import resolve_state_property
from converter.services.tier_object import tier_object_write
from converter.services.tier_suffix import tier_state_suffix
from converter.services.token_snap import token_snap
from converter.services.validate import attr_is_number, validate
from converter.services.value_serialise import value_serialise

# ---------------------------------------------------------------------------
# EXECUTION Step 7 (FR-31-2.8.4, the 2e2 ONE-cascade): the retired hand-rolled
# fold ladder (fold_helpers.route_interior_css_to_parent_slot:551-571) is
# RE-EXPRESSED here as EXPLICIT per-property layer priorities — the recorded
# Step-3 semantics decision ("layer_detect-first, the old fold ladder
# re-expressed as explicit registry priorities"). A CONTENT-layer node's
# declaration tries each layer's attr on the OWNING block in this order;
# first DB hit wins (each lookup MF-4-guarded via attr_for_layer_property).
# CSS-standard layer semantics, not block knowledge — the R-31-1
# permitted-constant class (same as the ladder it replaces + _GRID_LAYOUT_PROPS).
# ---------------------------------------------------------------------------

_WIDTH_PROPS = frozenset({"max-width", "width", "--content-width"})
_GAP_MINH = frozenset({"gap", "row-gap", "column-gap", "min-height"})


def _layer_priorities(prop: str) -> tuple[str, ...]:
    """The explicit layer fallback chain for one CONTENT-layer declaration."""
    if prop in _WIDTH_PROPS:
        return ("CONTENT", "OUTER")
    if prop.startswith("padding"):
        return ("CONTENT", "OUTER", "GRID")
    if prop.startswith("margin"):
        # margin* now tries CONTENT first, mirroring padding's own chain
        # (Defect 3, qc-council-validated 2026-09-04): a sole-passthrough
        # band's margin declaration reaches this resolver via fold_band_css
        # (a wrapper WITH a sibling never reaches content_band.py at all — it
        # becomes its own sgs/container block via a completely separate
        # extraction path, so this change cannot and does not affect that
        # case). CONTENT is tried before GRID/OUTER so a block declaring a
        # merged contentBandMargin* box family (gated in
        # _content_band_box_write below) wins over the OUTER self-merge
        # fallback that previously absorbed a margin shorthand wholesale.
        return ("CONTENT", "GRID", "OUTER")
    if prop in _GAP_MINH:
        return ("GRID", "OUTER")
    return ("CONTENT", "OUTER")


# The two box-shorthand CSS base properties this router folds into a merged
# CONTENT-band object attr. A recognition SET, not a property->attr map — the
# actual suffix ('BandPadding' / 'BandMargin') is derived live from
# property_suffixes below, never hardcoded (R-31-1).
_BAND_BOX_PROPS = frozenset({"padding", "margin"})


def _band_family_row_suffix(base_prop: str, conn: Any) -> str | None:
    """Read the raw per-side suffix (e.g. ``'BandPaddingTop'``) seeded in
    ``property_suffixes`` for a base CSS property's longhand top side
    (DB-first, R-31-1 — never a hardcoded property->attr dict). Returns
    ``None`` when the per-side rows aren't seeded yet (e.g. ``BandMargin*``
    before Defect 3's DB reseed lands).

    ``property_suffixes`` seeds TWO distinct rows per longhand side (e.g.
    ``PaddingTop`` for the flat OUTER family, ``BandPaddingTop`` for the
    CONTENT-band family this router owns) — both share ``css_property`` and
    ``role``, so the ``'Band'`` name prefix is the only live discriminator
    between them; filtered here rather than picking whichever row SQLite
    returns first.

    Deliberately returns the RAW row, not a side-stripped family name — the
    stripping happens in ``_content_band_box_write`` itself, in the same
    scope that re-validates the result against ``db_lookup.box_family_for``
    before it is ever used (§3/§6 box-family-guard AST gate: a side-token
    string test must sit alongside a genuine ``box_family`` DB check, not in
    an isolated helper the gate can't see that check from).
    """
    row = conn.execute(
        "SELECT suffix FROM property_suffixes WHERE css_property = ? AND suffix LIKE 'Band%'",
        (f"{base_prop}-top",),
    ).fetchone()
    return row[0] if row else None


def _content_band_box_write(decl: Any, ctx: Any) -> Write | list[Write] | GAP | None:
    """Route a ``padding``/``margin`` CONTENT-layer declaration — longhand
    per-side (``padding-top`` etc) OR shorthand (``padding: 10px 20px``) — into
    the merged ``contentBandPadding{Tier}``/``contentBandMargin{Tier}``
    box-object attr (box-object interface contract §3/§4,
    ``.claude/plans/2026-07-09-box-object-interface-contract.md``), when the
    owning block declares that ``box_family`` — closing (a) the
    previously-HONEST content-band-padding routing gap documented in this
    module's header (container declares ``contentBandPadding*`` as a merged
    OBJECT attr, never the flat ``contentPadding{Side}*`` the ordinary
    layer-priority chain derives), and (b) the shorthand-misroute defect: a
    bare ``padding: 20px`` used to fail the longhand-only ``padding-`` guard
    and fall through to the OUTER-layer ``padding`` self-merge, silently
    landing on the block-ROOT attr instead of the CONTENT-band one — a real
    collision risk with a genuine OUTER ``padding`` on the same node
    (qc-council-validated Defect 2, 2026-09-04).

    Returns ``None`` (never a GAP) when the box-object path doesn't apply at
    all — the caller falls through to the unchanged layer-priority chain.
    Once the box-object destination IS the gate match, an unparseable
    shorthand value returns an honest GAP rather than silently falling
    through to the wrong layer. Gated on ``db_lookup.box_family_for``, NEVER
    an attr-name regex (§3/§6 AST gate).
    """
    # Local import: root_supports -> dispatch_spine -> converter.resolvers
    # (this package's own __init__) is a real circular-import chain at module
    # level (proven — a top-level import here breaks the whole resolvers
    # package on load), exactly why the OUTER self-merge branch below already
    # imports this same function locally, aliased.
    from converter.services.root_supports import _parse_padding_shorthand

    prop = decl.property
    base_prop: str | None = None
    side: str | None = None
    for candidate in _BAND_BOX_PROPS:
        if prop == candidate:
            base_prop = candidate
            break
        if prop.startswith(f"{candidate}-"):
            maybe_side = prop[len(candidate) + 1:]
            if maybe_side in ("top", "right", "bottom", "left"):
                base_prop = candidate
                side = maybe_side
            break
    if base_prop is None:
        return None

    # Side-token strip on a value already READ from property_suffixes (a DB
    # read, not a name-guessed grouping) -- but never trusted alone: `family`
    # is only used below once `box_family` (the real DB classification) has
    # confirmed it, so a wrongly-derived suffix fails closed rather than
    # silently grouping the wrong attrs (§3/§6 box-family-guard AST gate).
    raw_suffix = _band_family_row_suffix(base_prop, ctx.conn)
    if raw_suffix is None or not raw_suffix.endswith("Top"):
        return None
    band_suffix = raw_suffix[: -len("Top")]

    prefix = db_lookup.layer_attr_prefix("CONTENT") or ""
    family = f"{prefix}{band_suffix}"
    object_attr = tier_state_suffix(family, decl, ctx.conn, ctx.block_slug)
    box_family = db_lookup.box_family_for(ctx.block_slug, object_attr)
    if box_family != family:
        return None

    raw = strip_important(decl.value).strip()

    if side is not None:
        resolved = _resolve_co_declared_var(raw, {})
        value = token_snap(prop, value_serialise("string", None, resolved), ctx.conn)
        return Write(attr=object_attr, value={side: value}, property=prop, tier=decl.tier)

    # Shorthand form (`padding: 10px 20px 30px 40px`, CSS top/right/bottom/left
    # order) — parse into the same 4 sides the longhand path accumulates one
    # at a time, token-snapping each side independently so a per-side token
    # slug or var() resolves identically to the longhand path.
    sides = _parse_padding_shorthand(raw)
    if sides is None:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{prop} value {decl.value!r} is not a parseable 1-4-value CSS "
            f"box shorthand for merged CONTENT-band object attr {object_attr!r}",
        )
    # Horizontal auto-centring idiom (`margin: 0 auto`) is EXCLUDED, not
    # lifted -- same rule as the OUTER self-merge branch below (search
    # "Horizontal auto-centring idiom" for the full rationale): the
    # band-rule emitter already reproduces this centring via
    # `margin-inline:auto`, so lifting it here too would be the wrong layer
    # and a duplicate. This CONTENT-band path runs BEFORE that OUTER branch
    # ever sees the declaration (line ~251 short-circuits it), so the check
    # must be duplicated here rather than assumed to fire downstream.
    if base_prop == "margin" and sides["left"] == sides["right"] == "auto":
        return gap_writer(
            ctx, decl, GapOrigin.EXCLUDED,
            f"{prop} left/right are both 'auto' — horizontal centring is "
            f"already reproduced by the band's contentWidth rule "
            f"(class-sgs-container-wrapper.php margin-inline:auto), so "
            f"lifting it onto the CONTENT-band {object_attr!r} attr would be "
            f"the wrong layer and a duplicate.",
        )
    value = {
        s: token_snap(prop, value_serialise("string", None, _resolve_co_declared_var(v, {})), ctx.conn)
        for s, v in sides.items()
    }
    return Write(attr=object_attr, value=value, property=prop, tier=decl.tier)


def resolve(decl: Any, ctx: Any) -> Write | list[Write] | GAP:
    prop = decl.property

    # Device-tier gate first (§3.A A4): a non-device-tier breakpoint gaps for
    # the accurate reason and avoids wasted DB queries.
    if not decl.is_device_tier:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"non-device-tier breakpoint {decl.tier!r} for {prop} (§3.A A4)",
        )

    # Direct (block, css_property, css_state) lift for a hover-ONLY destination
    # attr with no un-suffixed base sibling (Spec 31 §3.A step 4a extension,
    # 2026-07-22). None -> fall through to the ordinary chain, unchanged.
    state_write = resolve_state_property(decl, ctx)
    if state_write is not None:
        return state_write

    # FILL-width is not a content-width CAP (2026-07-25, surfaced by the modal
    # `__panel` dissolve). The standard centred-box idiom is `max-width:Npx;
    # width:100%` — `max-width` caps, `width:100%` just fills the available space.
    # Both `width` and `max-width` route to `contentWidth` (`_WIDTH_PROPS`), so a
    # fill `width` collides with the real `max-width` cap (orchestrator COLLISION:
    # two writes to `contentWidth`). Absorb a percentage/auto `width` as an
    # EXCLUDED gap (never silent — TOTALITY) so `max-width` alone owns the cap. An
    # explicit LENGTH `width` (e.g. `width:720px`, no max-width) still caps —
    # unchanged.
    if prop == "width":
        _wv = strip_important(decl.value).strip().lower()
        if _wv == "auto" or _wv.endswith("%"):
            return gap_writer(
                ctx, decl, GapOrigin.EXCLUDED,
                f"width {decl.value!r} is a fill default, not a content-width cap "
                f"(max-width owns the cap; §3.A CONTENT band)",
            )

    # Box-object contract (§3/§4): a padding-side decl accumulates into the
    # owner's merged contentBandPadding{Tier} object attr when box_family
    # gates it, BEFORE the legacy flat-attr layer-priority chain runs.
    box_write = _content_band_box_write(decl, ctx)
    if box_write is not None:
        return box_write

    # Per-side border longhand → merged borderWidth box-object (SHARED accumulator
    # seam, same as the padding-side path above). A `border-{side}-width` decl on a
    # CONTENT leaf (e.g. sgs/text's disclaimer — D307 routes border here via the
    # CONTENT→OUTER fallback) accumulates ONE side into the block's borderWidth
    # object. Runs before the layer-priority chain: border-{side}-width HAS a
    # property_suffixes row routing to a per-side attr NO block declares, so the
    # chain would NO_DESTINATION-gap it. None → fall through unchanged. Gated on
    # box_family, never a name regex (§13.4 FR-31-22.2 AST gate).
    border_side = border_side_write(decl, ctx)
    if border_side is not None:
        return border_side

    # Explicit layer-priority chain (the re-expressed fold ladder): first
    # layer whose attr the OWNING block actually declares wins.
    base_attr = None
    for layer in _layer_priorities(prop):
        base_attr = attr_resolve(ctx, layer, prop)
        if base_attr is not None:
            break
    if base_attr is None:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} has no CONTENT/GRID/OUTER attr for {prop} "
            f"(proposed_action: add attr or seed property_suffixes)",
        )

    # --- TIER-OBJECT destination (Spec 35 tier shape, D802-class fix extended
    # from typography to CONTENT — mirrors outer_box.py/grid.py's identical
    # gate). ``contentWidth`` is the worked example: sgs/container, sgs/hero,
    # sgs/trust-bar, sgs/feature-grid and sgs/testimonial-slider all migrated
    # it to ``{desktop,tablet,mobile}``; re-appending a tier suffix here (the
    # flat path below) produced a bare scalar — measured live via
    # check_flat_tier_regression.py: sgs/trust-bar.contentWidth emitted
    # "1100px" instead of {"desktop": ...}, discarded SILENTLY by `validate`
    # gapping the now-nonexistent suffixed sibling. Gated on
    # ``tier_object_base`` (R-31-1) and skipped when a STATE is present
    # (its own attr, resolved independently), mirroring typography.py.
    if not decl.state and db_lookup.tier_object_base(ctx.block_slug, base_attr):
        return _content_band_tier_object_write(decl, ctx, prop, base_attr)

    # Step 4 + 4a: tier suffix THEN interaction-state suffix (universal shared helper,
    # §3.A). A :hover/:focus/:active decl routes to `{base}{Tier}{State}` (validated
    # below) else an honest gap.
    attr = tier_state_suffix(base_attr, decl, ctx.conn, ctx.block_slug)
    if not validate(ctx, attr, decl.value):
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} does not declare {attr!r} "
            f"(tier {decl.tier}{', state ' + decl.state if decl.state else ''})",
        )

    # Resolve a co-declared var() (max-width:var(--content-width)); identity
    # unless the value is a self-contained var with a fallback.
    resolved = _resolve_co_declared_var(strip_important(decl.value).strip(), {})

    # --- box-family SELF-MERGE + colour-role: mirrors outer_box.resolve's D307
    # branches EXACTLY (ONE mechanism, R-31-9) for a declaration that fell
    # through the CONTENT/GRID layers to the OUTER fallback in the priority
    # chain above (e.g. sgs/text's border-width/-color at CONTENT layer —
    # `_layer_priorities` tries CONTENT then OUTER; OUTER resolves via
    # attr_resolve's D307 fallback to borderWidth/borderColour, but this
    # resolver's OWN serialisation must match outer_box's, not fall through
    # to the generic string-verbatim branch below, which would write a bare
    # "1px" into an attr_type='object' destination (render.php's is_array()
    # guard drops it) or leave a raw "var(--border)" un-tokenised).
    # Self-merge gate: two DB shapes both mean "attr is a box-family base",
    # and only ONE of them is `box_family_for(attr) == attr` (the
    # self-referencing shape, e.g. sgs/button.borderWidth). VERIFIED
    # 2026-08-22 that `sgs/container.margin`/`padding` use the OTHER shape —
    # box_family IS NULL on the base row itself, and only the Tablet/Mobile
    # siblings carry `box_family='margin'`/`'padding'` POINTING BACK at the
    # base. Querying "does any OTHER row for this block declare
    # box_family=<attr>?" catches both shapes uniformly and is a strictly
    # NARROWER, DB-driven, no-slug-literal check (R-31-1) than gating on
    # attr_type='object' alone — that column is shared by many non-box
    # tier/config objects (contentWidth, gap, columns, gridTemplateColumns)
    # that must NOT be routed through the box-shorthand parser.
    _box_family = db_lookup.box_family_for(ctx.block_slug, attr)
    _is_box_family_base = _box_family == attr or ctx.conn.execute(
        "SELECT 1 FROM block_attributes WHERE block_slug=? AND box_family=?",
        (ctx.block_slug, attr),
    ).fetchone() is not None
    if _is_box_family_base:
        from converter.services.root_supports import (
            _parse_padding_shorthand as _parse_box_shorthand_value,
        )
        sides = _parse_box_shorthand_value(resolved)
        if sides is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{prop} value {decl.value!r} is not a parseable 1-4-value CSS "
                f"box shorthand for merged object attr {attr!r}",
            )
        # Horizontal auto-centring idiom (`margin: 0 auto`) is EXCLUDED, not
        # lifted: the band-rule emitter (class-sgs-container-wrapper.php
        # ~2721-2726) already writes `margin-inline:auto` on the `__inner`
        # band whenever a band max-width/contentWidth tier resolves, so this
        # centring is reproduced by construction at the CORRECT layer. Lifting
        # it onto the OUTER margin attr as well would be (a) the wrong layer
        # and (b) a duplicate; `auto` is also not a real box-object side value
        # for this attr (lengths only) even where it would be spuriously
        # well-formed. Gated on the CSS SHAPE (left==right=="auto"), never on
        # owning_slug/block name — true for every band on every composite
        # mirroring sgs/container (R-31-9).
        if sides["left"] == sides["right"] == "auto":
            return gap_writer(
                ctx, decl, GapOrigin.EXCLUDED,
                f"{prop} left/right are both 'auto' — horizontal centring is "
                f"already reproduced by the band's contentWidth rule "
                f"(class-sgs-container-wrapper.php margin-inline:auto), so "
                f"lifting it onto the OUTER {attr!r} attr would be the wrong "
                f"layer and a duplicate.",
            )
        return Write(attr=attr, value=sides, property=prop, tier=decl.tier)

    if db_lookup.attr_is_colour_role(ctx.block_slug, attr):
        v = extract_token_or_hex(resolved)
        if v is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{prop} value {decl.value!r} is neither a token slug, hex, "
                f"nor rgb/hsl colour literal",
            )
        return Write(attr=attr, value=v, property=prop, tier=decl.tier)

    # Spec 31 §3.A.5: serialise by block_attributes.attr_type. A numeric attr
    # (sgs/text.maxWidth, button paddings/minHeight) stores the bare number +
    # a Base-tier Unit companion — a px-STRING here is silently DISCARDED by
    # WP's schema validation at render (the CG-4 bug: hero-sub 420px /
    # ingredients-intro 540px / disclaimer 620px all stretched full-width).
    # Mirrors outer_box.resolve's number path exactly (ONE mechanism, R-31-9).
    if attr_is_number(ctx, attr):
        num, unit = split_value_unit(resolved)
        if num is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{prop} value {decl.value!r} is not a parseable number for "
                f"numeric attr {attr!r}",
            )
        num_out: int | float = int(num) if float(num).is_integer() else num
        writes: list[Write] = [Write(attr=attr, value=num_out, property=prop, tier=decl.tier)]
        # Unit companion: the tier-suffixed name first (a block may declare
        # e.g. minHeightTabletUnit), else the Base-tier base-name companion.
        # A NON-px unit with no Unit destination is an HONEST GAP — a bare
        # number renders through the px default (3rem → 3px, a WRONG value,
        # worse than the loss). px needs no companion (the schema default).
        tier_unit_attr = f"{attr}Unit"
        base_unit_attr = f"{base_attr}Unit"
        if unit and attr != base_attr and validate(ctx, tier_unit_attr, unit):
            writes.append(Write(attr=tier_unit_attr, value=unit, property=prop, tier=decl.tier))
        elif unit and decl.tier == "Base" and validate(ctx, base_unit_attr, unit):
            writes.append(Write(attr=base_unit_attr, value=unit, property=prop, tier=decl.tier))
        elif unit and unit != "px":
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{prop} value {decl.value!r} carries non-px unit {unit!r} but "
                f"{ctx.block_slug} declares no Unit companion for {attr!r} — a bare "
                f"number would render via the px default (wrong value)",
            )
        return writes

    # String/length-literal attr: verbatim serialise (D230 — contentWidth is
    # token-or-literal; token-snap is identity for a length literal, §3.A.6).
    value = token_snap(prop, value_serialise("string", None, resolved), ctx.conn)
    return Write(attr=attr, value=value, property=prop, tier=decl.tier)


# ---------------------------------------------------------------------------
# TIER-OBJECT emission (Spec 35 tier shape) — the CONTENT-resolver counterpart
# to typography.py's `_tier_object_writes` (D802) and outer_box.py's
# `_outer_tier_object_write` (this fix). Mirrors resolve()'s own
# value-normalisation branches (colour-role / numeric+unit / string verbatim)
# EXACTLY — only the destination differs. Box-family self-merge is
# deliberately NOT mirrored here: BOX and TIER are independent, mutually
# exclusive axes (a box_family-carrying attr always fails tier_object_base by
# construction), so a tier-object CONTENT attr can never also be a box family.
# ---------------------------------------------------------------------------

def _content_band_tier_object_write(
    decl: Any, ctx: Any, prop: str, base_attr: str
) -> "Write | list[Write] | GAP":
    resolved = _resolve_co_declared_var(strip_important(decl.value).strip(), {})

    if db_lookup.attr_is_colour_role(ctx.block_slug, base_attr):
        v = extract_token_or_hex(resolved)
        if v is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{prop} value {decl.value!r} is neither a token slug, hex, "
                f"nor rgb/hsl colour literal",
            )
        return tier_object_write(ctx, decl, prop, base_attr, v, validate_raw=v)

    if attr_is_number(ctx, base_attr):
        num, unit = split_value_unit(resolved)
        if num is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{prop} value {decl.value!r} is not a parseable number for "
                f"numeric attr {base_attr!r}",
            )
        num_out: int | float = int(num) if float(num).is_integer() else num
        write = tier_object_write(ctx, decl, prop, base_attr, num_out, validate_raw=str(num_out))
        if isinstance(write, GAP):
            return write
        if unit and decl.tier == "Base":
            base_unit_attr = f"{base_attr}Unit"
            if validate(ctx, base_unit_attr, unit):
                return [
                    write,
                    Write(attr=base_unit_attr, value=unit, property=prop, tier=decl.tier),
                ]
        return write

    # String/length-literal attr (D230 — contentWidth is token-or-literal).
    value = token_snap(prop, value_serialise("string", None, resolved), ctx.conn)
    return tier_object_write(ctx, decl, prop, base_attr, value, validate_raw=str(value))
