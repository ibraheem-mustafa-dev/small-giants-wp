"""outer_box — the OUTER-layer resolver (Spec 31 §3.A, layer L1).

Spec 31 §3.A routes every OUTER-layer box declaration to the block's OUTER attr via
``db.attr_for_layer_property(block, 'OUTER', css_property)`` (step 2), re-appends the
tier suffix (step 4), serialises by attr_type (step 5), token-snaps literals as
identity (step 6 — max-width is a D230 exact literal), validates (step 7) and gaps
with a reason on no destination (step 8 — never silent).

Real transfers (this resolver OWNS the OUTER layer):
  - ``max-width``          → ``maxWidth*`` (exact literal, D230/D231 — no token snap)
  - ``min-height``         → ``minHeight*``
  - ``gap``                → ``gap*`` (the OUTER flex/grid gap on a container)
  - ``padding-{side}`` longhands → ``padding{Side}*`` WHEN the block declares the
    attr (number+Unit companion as a list[Write] when the attr is numeric); else a
    tracked NO_DESTINATION gap (e.g. sgs/container has only tier-suffixed padding
    longhands, no base ``paddingTop`` — that is a faithful DB absence, gapped).
  - ``background-size``    → ``backgroundSize*`` (string; DB-resolved attr name)
  - ``background-position``→ ``backgroundPosition*`` (string; DB-resolved attr name)
  - ``background-repeat``  → ``backgroundRepeat*`` (string; DB-resolved attr name)
  - ``background-attachment``→``backgroundAttachment*`` (string; DB-resolved attr name)
  - ``box-shadow``         → block's shadow attr (DB-resolved); value TOKEN-SNAPPED to
    a shadow preset slug from ``design_tokens`` (e.g. ``0 4px 12px rgba(0,0,0,0.1)``
    → ``"md"``). On NO preset match: honest NO_DESTINATION gap (the wrapper expects a
    slug; a raw CSS value would render nothing — no-cheats rule). Preset list is read
    from DB at call-time, never hardcoded.

EXECUTION Step 12 (Phase 5, 2026-07-04) added the following to the OUTER allowlist.
Every one of these goes through the SAME generic dispatch (attr_resolve → tier_suffix
→ validate → numeric-or-string serialise) already built above — no per-property
special-casing was needed, because ``attr_resolve``/``attr_for_layer_property`` is
fully DB-driven (property_suffixes → block_attributes, name-free). The only genuine
code change was widening ``_attr_is_number`` to recognise ``attr_type='integer'`` as
well as ``'number'`` (order/z-index are unitless integers on some blocks, e.g.
``sgs/media.order``) — a universal type-family generalisation, not a per-property rule.
  - ``order`` / ``z-index``            → DB-resolved attr (e.g. ``order`` on
    sgs/media, ``zIndex`` on sgs/decorative-image); numeric, no unit companion.
  - ``overflow`` / ``overflow-x`` / ``overflow-y`` → DB-resolved string-enum attr
    (e.g. ``overflow`` on sgs/decorative-image). overflow-x/-y currently have NO
    block destination anywhere — honest NO_DESTINATION gap (property_suffixes rows
    seeded D250; no block has declared ``overflowX``/``overflowY`` yet).
  - ``object-fit``                     → DB-resolved string-enum attr (``objectFit``
    on sgs/media).
  - ``position`` / ``inset`` / ``top`` / ``right`` / ``bottom`` / ``left``  → DB-resolved
    (property_suffixes seeded D250 under role='position'). NO block currently
    declares a matching attr for any of these six — honest NO_DESTINATION gap on
    every block (the suffix rows exist for when a block adds the capability).
  - ``aspect-ratio``                   → DB-resolved string attr (``aspectRatio`` on
    sgs/card-grid / sgs/gallery / core/image / core/gallery, etc.).
  - ``opacity``                        → DB-resolved numeric attr (``opacity`` on
    sgs/media / sgs/decorative-image / core/separator).
  - ``background-image`` (GRADIENT case) → the block's ``Gradient``-suffix attr
    (property_suffixes suffix='Gradient', role='colour-gradient') WHEN one exists.
    No sgs/ block currently declares a bare ``gradient`` attr (sgs/container's own
    background-image destination is ``backgroundImage``, wired through the separate
    root-supports native-style lift — see ``root_supports.py`` — NOT this resolver);
    core/button / core/cover / core/post-featured-image do, but those are core
    blocks, not part of this vertical slice's fixtures. Honest NO_DESTINATION gap.
  - ``flex-grow`` / ``flex-shrink`` / ``flex-basis`` (flex ITEM props, NOT the
    container-level ``flex-direction``/``flex-wrap`` already lifted via
    arrangement.py — untouched) → property_suffixes seeded 2026-07-04
    (migrations/2026-07-04-property-suffixes-flex-item-props.py). NO block
    currently declares flexGrow/flexShrink/flexBasis — honest NO_DESTINATION gap.

``padding`` SHORTHAND is expanded to longhands at the pre-dispatch extraction stage
(``fold_helpers._expand_box_shorthand``); a raw ``padding`` shorthand reaching this
resolver means that stage was not wired for this path — gapped UNIMPLEMENTED_STUB
naming the seam, never silently mis-transferred.

``align_finalise`` (Spec 31 §3.A.3) is an ELEMENT-level post-pass the orchestrator
calls AFTER per-declaration conservation: when an OUTER element declares NO
``max-width`` at base and the block ``supports.align`` includes ``"full"``, it emits
a synthetic ``align:"full"`` Write (the full-bleed default). It is appended OUTSIDE
the conservation count (no source declaration).

REUSES main's shared helpers (do NOT redefine): ``styling_helpers.split_value_unit``
for number+unit parsing. NO block-slug literals (F5 gate); all destinations are
DB-resolved.

GROUND-TRUTH: spec=31 source=db evidence=attr_for_layer_property('sgs/container','OUTER',
'background-size')='backgroundSize'; ('background-position')='backgroundPosition';
('background-repeat')='backgroundRepeat'; ('background-attachment')='backgroundAttachment';
('box-shadow')='shadow' (role=color wins over BoxShadow/role=visual via rowid ordering).
Shadow presets sourced from design_tokens WHERE token_type='shadow' AND slug LIKE 'shadow-%'
(the design_tokens CHECK constraint declares 'shadow' as its own token_type — a
2026-08-24 audit found earlier framework rows mistyped as 'size' from before the
constraint carried 'shadow'; corrected via .claude/reports/2026-08-24-design-tokens-shadow-fix.sql).
Current live presets (from theme.json): shadow-subtle='0 1px 3px rgba(0,0,0,0.08)',
shadow-raised='0 4px 12px rgba(0,0,0,0.1)', shadow-floating='0 8px 30px rgba(0,0,0,0.12)',
shadow-glow='0 0 20px rgba(248,122,31,0.3)'.
Wrapper renders box-shadow:var(--wp--preset--shadow--{slug}) where slug=suffix after 'shadow-'.
"""
from __future__ import annotations

import re
import sqlite3
from typing import Any

from converter.db import db_lookup
from converter.models import GAP, GapOrigin, Write
from converter.services.attr_resolve import attr_resolve
from converter.services.border_side import border_side_write
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

# NOTE: root_supports._parse_padding_shorthand (the generic 1-4-value CSS
# box-model parser D307 reuses for the box-family self-merge branch below) is
# imported LAZILY inside resolve(), not at module scope — root_supports.py
# imports converter.dispatch_spine, which imports converter.resolvers (this
# package, for REGISTRY), which imports this module — a module-level import
# here would be a circular-import cycle. The deferred import is safe: by the
# time resolve() actually runs, orchestrator/resolvers are fully loaded.

# WHICH properties this L1/OUTER resolver attempts is a DB FACT, not an in-code
# list (corrected 2026-07-04, Bean-caught): a property is liftable ⇔ it has a
# `property_suffixes` row (Spec 31 §4 — that table IS the property→attr-suffix
# map). The Step-12 in-code `_OUTER_TRANSFER_PROPS` frozenset duplicated the DB
# fact and drifted the moment the migration seeded new rows — deleted; the
# membership test is now `db_lookup.css_property_has_suffix_row(prop)` (cached).
# The transfer itself was always DB-driven (attr_resolve → property_suffixes →
# block_attributes, name-free); a rowless property gaps UNIMPLEMENTED_STUB and a
# row-bearing property with no attr on THIS block gaps NO_DESTINATION — honest
# either way (Spec 31 §3.A step 8). Layer vocabulary: this resolver is L1
# (OUTER box) in the Spec 31 §2.9 Axis-1 model (L1=OUTER / L2=CONTENT /
# L3=GRID+PER-ITEM / L4=GRID-PER-AREA).
#
# `padding` shorthand is expanded to longhands pre-dispatch; arriving raw is a
# wiring gap (UNIMPLEMENTED_STUB), never a silent drop.

# Length-literal properties written verbatim (D230 — no token snap, no truncation).
_LITERAL_PROPS = frozenset({"max-width", "min-height"})

# The shadow preset slug prefix that must be stripped before storing (e.g. "shadow-sm" → "sm").
# This is the structural prefix defined by the WP preset naming convention: the design_tokens
# slug carries it; the wrapper renders box-shadow:var(--wp--preset--shadow--{slug-without-prefix}).
# Named here as a convention constant (not a hardcoded preset list — the preset list comes from DB).
_SHADOW_SLUG_PREFIX = "shadow-"


def _normalise_shadow(value: str) -> str:
    """Collapse multiple whitespace runs to single spaces for shadow comparison.

    Draft CSS often has `0  4px  12px rgba(0,0,0,0.1)` (extra spaces); DB default_value
    stores the canonical form. Normalise both sides before comparing.
    """
    return re.sub(r"\s+", " ", value).strip()


def _shadow_token_snap(raw_value: str, conn: sqlite3.Connection) -> str | None:
    """Return the WP preset slug (without the 'shadow-' prefix) if the draft box-shadow
    value exactly matches (after whitespace normalisation) a design_tokens shadow preset.
    Returns None if no preset matches — the caller must emit an honest gap.

    Shadow presets live in design_tokens WHERE token_type='shadow' AND slug LIKE 'shadow-%'
    (the CHECK constraint on design_tokens.token_type declares 'shadow' as its own type;
    see .claude/reports/2026-08-24-design-tokens-shadow-fix.sql for the 2026-08-24 correction
    of framework rows that predated the constraint's 'shadow' member and were mistyped 'size').
    The default_value column holds the canonical CSS value (e.g. '0 4px 12px rgba(0,0,0,0.1)').
    The wrapper renders box-shadow:var(--wp--preset--shadow--{slug-after-shadow-prefix}).

    Never hardcodes the preset list — reads from DB at call-time (R-31-1 DB-first rule).
    """
    normalised = _normalise_shadow(raw_value)
    rows = conn.execute(
        "SELECT slug, default_value FROM design_tokens "
        "WHERE slug LIKE ? AND token_type='shadow'",
        (f"{_SHADOW_SLUG_PREFIX}%",),
    ).fetchall()
    for slug, default_value in rows:
        if _normalise_shadow(default_value) == normalised:
            # Strip the 'shadow-' prefix: 'shadow-md' → 'md'.
            if slug.startswith(_SHADOW_SLUG_PREFIX):
                return slug[len(_SHADOW_SLUG_PREFIX):]
            return slug  # Defensive: return as-is if prefix absent (unexpected DB row).
    return None


# The attr_type predicate moved to the SHARED converter.services.validate.
# attr_is_number (CG-4 fix, 2026-07-05) so content_band + outer_box use ONE
# implementation (R-31-9). History it carries: SQL-side predicate (no-slug-literal
# taint avoidance) + the Step-12 'integer' widening (order/z-index attrs).
_attr_is_number = attr_is_number


def resolve(decl: Any, ctx: Any) -> Write | list[Write] | GAP:
    prop = decl.property

    # A raw `padding` shorthand should have been expanded pre-dispatch (one decl →
    # 4 longhands). If it reaches here, the extraction stage was not wired for this
    # path — gap it honestly, naming the seam (never a half-transfer).
    #
    # Box-family self-merge EXCEPTION (2026-07-24, FR-31-22 cardPadding fix): a
    # bare `padding` shorthand on the block's OWN root, destined for a MERGED
    # box-object attr (``db_lookup.box_family_for(block, attr) == attr`` — the
    # SAME self-merge shape the box-family branch further below already handles
    # for other properties, e.g. sgs/text's borderWidth), is parsed HERE instead
    # of gapped. The pre-dispatch expansion this stub-gate assumes
    # (``fold_helpers._expand_box_shorthand``) runs ONLY inside the AREA/cross-
    # node fold (``route_area_css_to_block_attrs`` — ctaPadding/tagPadding's
    # path); it never runs for a block's OWN root CSS dispatched through THIS
    # resolver. A block with NO native ``supports.spacing.padding`` (so
    # ``root_supports.lift_root_supports_to_style`` never expands it either —
    # e.g. sgs/product-card, which routes root padding to a custom box-object
    # attr instead) therefore had NO reachable destination at all for a root
    # `padding` shorthand — proven live: sgs/product-card's draft root
    # `padding:16px` silently dropped despite `cardPadding` being correctly
    # DB-resolved via ``attr_for_layer_property(slug,'OUTER','padding')``.
    # Gated purely on ``box_family_for`` (R-31-1/R-31-9 — no slug literal, no
    # per-block branch); falls through to the unconditional stub-gap below for
    # every other block/attr shape (unchanged behaviour).
    if prop == "padding":
        _pad_attr = attr_resolve(ctx, "OUTER", prop)
        if _pad_attr is not None and db_lookup.box_family_for(ctx.block_slug, _pad_attr) == _pad_attr:
            _pad_tgt = tier_state_suffix(_pad_attr, decl, ctx.conn, ctx.block_slug)
            if validate(ctx, _pad_tgt, decl.value):
                from converter.services.root_supports import (
                    _parse_padding_shorthand as _parse_box_shorthand_value,
                )
                _pad_sides = _parse_box_shorthand_value(strip_important(decl.value))
                if _pad_sides is not None:
                    return Write(attr=_pad_tgt, value=_pad_sides, property=prop, tier=decl.tier)
        return gap_writer(
            ctx, decl, GapOrigin.UNIMPLEMENTED_STUB,
            "padding shorthand must be expanded to longhands by the pre-dispatch "
            "extraction stage (fold_helpers._expand_box_shorthand); it reached "
            "outer_box unexpanded — wire shorthand expansion at extraction",
        )

    # Step 1c: direct (block, css_property, css_state) lift for a hover-ONLY
    # destination attr with no un-suffixed base sibling (scaleHover/grayscale
    # Hover/imageZoomHover — Spec 31 §3.A step 4a extension, 2026-07-22 coupled
    # UN-EXCLUDE + HOVER-LIFT). Tried BEFORE the property_suffixes-liftability
    # gate below: `transform`/`filter` have NO property_suffixes row (they are
    # NOT suffix-derived properties — their only destinations are these direct
    # css_property+css_state attrs), so the ordinary gate would stub-gap them
    # before ever reaching a chain that could route them. None -> no
    # direct-state row -> fall through to the ordinary liftability gate +
    # attr_resolve + tier_state_suffix chain, unchanged.
    state_write = resolve_state_property(decl, ctx)
    if state_write is not None:
        return state_write

    if not db_lookup.css_property_has_suffix_row(prop):
        # Liftability is the DB fact (Spec 31 §4): no property_suffixes row ⇒
        # no attr-suffix destination exists anywhere ⇒ honest stub gap. Seeding
        # a row (migration / block.json channel, STOP-24) makes the property
        # flow through the generic chain below with ZERO code change here.
        return gap_writer(
            ctx, decl, GapOrigin.UNIMPLEMENTED_STUB,
            f"'{prop}' has no property_suffixes row — not yet a liftable "
            f"property (seed via the STOP-24 migration channel, Spec 31 §5)",
        )

    # A4: a non-device-tier breakpoint has no device bucket — gap it, never coerce.
    if not decl.is_device_tier:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"non-device-tier breakpoint {decl.tier!r} for {prop} (Spec 31 §3.A A4)",
        )

    # Per-side border longhand → merged borderWidth box-object (box-object interface
    # contract §3/§4). A `border-{side}-width` decl accumulates ONE side into the
    # block's borderWidth object via the SHARED accumulator seam (same as the
    # padding-side path). Runs BEFORE the property_suffixes chain: border-{side}-width
    # HAS a property_suffixes row (BorderTopWidth…) that routes to a per-side attr NO
    # block declares, so the ordinary chain would NO_DESTINATION-gap it. Returns None
    # (fall through) for any non-border-side prop / non-box-family block. Gated on
    # box_family, never a name regex (§13.4 FR-31-22.2 AST gate).
    border_side = border_side_write(decl, ctx)
    if border_side is not None:
        return border_side

    # Step 2: name resolution (per-block, DB-driven — never prefix concat).
    base_attr = attr_resolve(ctx, "OUTER", prop)
    if base_attr is None:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} has no OUTER attr for {prop}",
        )

    # --- TIER-OBJECT destination (Spec 35 tier shape, D802-class fix extended
    # from typography to OUTER, this fix). A migrated tier-object attr
    # (maxWidth/minHeight on container-family blocks; height/maxHeight/
    # maxWidth/order on sgs/media) stores its per-device values INSIDE one
    # object as {desktop,tablet,mobile} — the flat maxWidthTablet/Mobile
    # siblings this resolver would otherwise target no longer exist on a
    # migrated block. Re-appending a tier suffix there produces an attr the
    # block does not declare, so `validate` gaps it NO_DESTINATION and the
    # tier value is discarded SILENTLY.
    #
    # Measured via check_flat_tier_regression.py against a real clone run:
    # sgs/container.maxWidth, sgs/hero.minHeight and sgs/media.{height,
    # maxHeight,maxWidth,order} all emitted a bare scalar instead of
    # {"desktop": ...} — the OUTER-resolver half of the same defect class
    # D802 fixed for typography's fontSize.
    #
    # Gated on `tier_object_base` (a DB predicate, never a name test — R-31-1)
    # and skipped when an interaction STATE is present, mirroring
    # typography.py's identical gate: a state destination is its own attr
    # (`maxWidthHover`) resolved independently, and v1 hover is base-tier
    # only, so the flat path below remains correct for it.
    if not decl.state and db_lookup.tier_object_base(ctx.block_slug, base_attr):
        return _outer_tier_object_write(decl, ctx, prop, base_attr)

    # Step 4 + 4a: re-append the tier suffix THEN the interaction-state suffix
    # (universal shared helper — §3.A). A :hover/:focus/:active decl routes to the
    # block's `{base}{Tier}{State}` companion (validated below) else an honest gap.
    attr = tier_state_suffix(base_attr, decl, ctx.conn, ctx.block_slug)
    if not validate(ctx, attr, decl.value):
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} does not declare {attr!r} "
            f"(tier {decl.tier}{', state ' + decl.state if decl.state else ''})",
        )

    # --- box-shadow: TOKEN-SNAP to a shadow preset slug (DB-sourced), never raw value.
    #
    # The shadow attr (DB-resolved above via attr_resolve) stores a PRESET SLUG, not a
    # raw CSS box-shadow value. The wrapper renders:
    #     box-shadow: var(--wp--preset--shadow--{slug})
    # A raw CSS value would NOT match any WP preset var → the wrapper renders nothing.
    # This is the no-cheats rule for box-shadow: if no preset matches, gap it honestly.
    #
    # The preset list is read from design_tokens at call-time (R-31-1 DB-first — not
    # hardcoded). Slugs carry the 'shadow-' prefix in the DB; the wrapper expects the
    # suffix only (e.g. 'md', not 'shadow-md').
    #
    # MUST run BEFORE the box-family/colour-role branches below: the shadow attr's
    # OWN DB role is 'color' (GROUND-TRUTH in this module's header — role=color wins
    # over role=visual via rowid ordering when attr_for_layer_property resolves
    # 'box-shadow'), so a colour-role check ahead of this would intercept a raw
    # box-shadow value and mis-serialise it via extract_token_or_hex instead of the
    # preset-slug snap.
    if prop == "box-shadow":
        slug = _shadow_token_snap(decl.value, ctx.conn)
        if slug is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"box-shadow value {decl.value!r} does not match any shadow preset in "
                f"design_tokens (token_type='shadow', slug LIKE 'shadow-%'); the shadow "
                f"attr expects a preset slug, not a raw CSS value — add a matching "
                f"preset to design_tokens or rework the draft to use a standard shadow",
            )
        # The slug itself ('sm'/'md'/'lg'/'glow') is a string, not an enum-constrained
        # attr on sgs/container (enum_values IS NULL for the shadow attr), so validate()
        # already passed above (attr existence only). Write the slug directly.
        return Write(attr=attr, value=slug, property=prop, tier=decl.tier)

    # --- box-family SELF-MERGE: a single flat declaration destined for a MERGED
    # per-side object attr (attr_type='object', e.g. sgs/text's borderWidth =
    # {top,right,bottom,left}) must expand to all four sides in ONE Write, never
    # a scalar (render.php's is_array() guard silently drops a bare string —
    # D307). Gated on db_lookup.box_family_for(block, attr) == attr ITSELF (the
    # attr IS its own family base — distinct from the padding-per-side merge
    # case where 4 SEPARATE declarations each contribute one key and the
    # ElementResult.attrs() per-key merge assembles them, §box-object interface
    # contract §3/§4). Reuses root_supports' generic 1-4-value CSS box-model
    # parser (the SAME rule padding/margin already use) rather than a second
    # hand-rolled parser (R-31-9).
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
    # that must NOT be routed through the box-shorthand parser. Mirrors
    # content_band.py's identical widening EXACTLY (ONE mechanism, R-31-9).
    _box_family = db_lookup.box_family_for(ctx.block_slug, attr)
    _is_box_family_base = _box_family == attr or ctx.conn.execute(
        "SELECT 1 FROM block_attributes WHERE block_slug=? AND box_family=?",
        (ctx.block_slug, attr),
    ).fetchone() is not None
    if _is_box_family_base:
        from converter.services.root_supports import (
            _parse_padding_shorthand as _parse_box_shorthand_value,
        )
        sides = _parse_box_shorthand_value(strip_important(decl.value))
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
        # mirroring sgs/container (R-31-9). Mirrors content_band.py's D307
        # branch EXACTLY (ONE mechanism, R-31-9).
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

    # --- colour-role attrs: SAME value-resolution the typography resolver uses
    # (extract_token_or_hex — bare token slug / hex / rgb() literal / named-
    # colour-to-hex, D307) for any OUTER-resolved attr the DB classifies
    # role='color' (e.g. border-color -> borderColour). Gated on
    # db_lookup.attr_is_colour_role (a proper DB accessor, not a Python
    # literal-comparison in resolver body — keeps the role check inside
    # db_lookup.py's SQL, out of gates/no_slug_literal.py's scan scope,
    # mirroring how services/validate.py's attr_is_number does its type
    # check inside SQL rather than a Python == in a resolver). background-
    # color never reaches here (it is a pre-layer typography sink,
    # dispatch_table.py), so this exists for border-color and any future
    # OUTER colour attr.
    if db_lookup.attr_is_colour_role(ctx.block_slug, attr):
        v = extract_token_or_hex(strip_important(decl.value))
        if v is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{prop} value {decl.value!r} is neither a token slug, hex, "
                f"nor rgb/hsl colour literal",
            )
        return Write(attr=attr, value=v, property=prop, tier=decl.tier)

    # Step 5: serialise by attr type. A numeric OUTER attr (e.g. a numeric gap)
    # stores the number + a Unit companion (Spec 31 §3.A.5) — a list[Write] for the
    # one declaration. A length-literal/string attr stores the verbatim value.
    if _attr_is_number(ctx, attr):
        num, unit = split_value_unit(decl.value)
        if num is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{prop} value {decl.value!r} is not a parseable number for "
                f"numeric attr {attr!r}",
            )
        num_out: int | float = int(num) if float(num).is_integer() else num
        writes: list[Write] = [Write(attr=attr, value=num_out, property=prop, tier=decl.tier)]
        # Unit companion: the tier-suffixed name first (a block may declare
        # e.g. minHeightTabletUnit — button render.php reads it), else the
        # Base-tier base-name companion. A NON-px unit with no Unit destination
        # is an HONEST GAP — a bare number renders through the px default
        # (3rem → 3px, a WRONG value, worse than the loss). Mirrors
        # content_band's branch exactly (ONE mechanism, R-31-9; CG-4 rater
        # Finding 1, 2026-07-05).
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

    # String/length-literal attr: verbatim (D230 for max-width/min-height).
    # background-size/position/repeat/attachment: written as-is (the enum constraint,
    # if any, was already checked by validate() above — a value not in the enum failed
    # validate and would have gapped, so we never reach here with an illegal value).
    value = token_snap(prop, value_serialise("string", None, decl.value), ctx.conn)
    return Write(attr=attr, value=value, property=prop, tier=decl.tier)


# ---------------------------------------------------------------------------
# TIER-OBJECT emission (Spec 35 tier shape) — the OUTER-resolver counterpart
# to typography.py's `_tier_object_writes` (D802). Mirrors that function's
# value-normalisation branches (box-shadow preset snap / colour-role token-or
# -hex / numeric+unit / string verbatim) EXACTLY as `resolve()` itself uses
# them below — only the DESTINATION differs (the base attr's tier-object key,
# not a suffixed sibling).
# ---------------------------------------------------------------------------

def _outer_tier_object_write(
    decl: Any, ctx: Any, prop: str, base_attr: str
) -> "Write | list[Write] | GAP":
    """Emit ONE partial tier-object Write (or Write+Unit-companion pair) for a
    migrated OUTER attr. See the call site's comment for the full rationale.
    """
    if prop == "box-shadow":
        slug = _shadow_token_snap(decl.value, ctx.conn)
        if slug is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"box-shadow value {decl.value!r} does not match any shadow preset in "
                f"design_tokens (token_type='shadow', slug LIKE 'shadow-%'); the shadow "
                f"attr expects a preset slug, not a raw CSS value",
            )
        return tier_object_write(ctx, decl, prop, base_attr, slug, validate_raw=slug)

    if db_lookup.attr_is_colour_role(ctx.block_slug, base_attr):
        v = extract_token_or_hex(strip_important(decl.value))
        if v is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{prop} value {decl.value!r} is neither a token slug, hex, "
                f"nor rgb/hsl colour literal",
            )
        return tier_object_write(ctx, decl, prop, base_attr, v, validate_raw=v)

    if _attr_is_number(ctx, base_attr):
        num, unit = split_value_unit(decl.value)
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
        # Unit companion: still a FLAT scalar attr, still written only
        # alongside the BASE tier (convert.py:1699) — shared by all three
        # tiers by design, mirroring typography's tier-object unit companion.
        if unit and decl.tier == "Base":
            base_unit_attr = f"{base_attr}Unit"
            if validate(ctx, base_unit_attr, unit):
                return [
                    write,
                    Write(attr=base_unit_attr, value=unit, property=prop, tier=decl.tier),
                ]
        return write

    # String/length-literal attr (D230 — max-width/min-height/height/maxHeight
    # etc. are exact literals; token_snap is identity for a length literal).
    value = token_snap(prop, value_serialise("string", None, decl.value), ctx.conn)
    return tier_object_write(ctx, decl, prop, base_attr, value, validate_raw=str(value))


def _block_supports_full_align(ctx: Any) -> bool:
    """True iff the block's ``align`` support includes ``"full"`` (Spec 31 §3.A.7
    gate — full-bleed only when the block declares it). DB-driven, no slug literal.

    The ``full`` membership is done IN SQL (LIKE) so the block_slug-bearing query
    does not taint a local that is then string-compared (no-slug-literal gate)."""
    row = ctx.conn.execute(
        "SELECT 1 FROM block_supports "
        "WHERE block_slug=? AND support_name='align' "
        "AND support_value LIKE '%full%'",
        (ctx.block_slug,),
    ).fetchone()
    return row is not None


def align_finalise(decls: list[Any], writes: list[Write], ctx: Any) -> Write | None:
    """Element-level post-pass: emit ``align:"full"`` on max-width ABSENCE (§3.A.3).

    Spec 31 §3.A.3: ``max-width`` → OUTER ``maxWidth`` (literal) WHEN PRESENT, **else
    align:"full"**. The full-bleed default is a property of the element's CSS as a
    WHOLE (the ABSENCE of a base-tier max-width), not of any one declaration — so it
    cannot be a per-decl resolver output. The orchestrator calls this after per-decl
    conservation and appends the synthetic Write OUTSIDE the conservation count.

    Fires ONLY when:
      • NO ``max-width`` declaration exists for the element at ANY tier (a tablet- or
        mobile-only ``max-width`` still suppresses full-bleed — the element is NOT
        full at every viewport, so emitting ``align:"full"`` would be wrong), AND
      • no max-width Write was produced at ANY tier (``maxWidth``/``maxWidthTablet``/
        ``maxWidthMobile`` — defensive, keyed on the source property), AND
      • this is an OUTER element (``ctx.base_layer == 'OUTER'``), AND
      • the block ``supports.align`` includes ``"full"`` (§3.A.7 gate — this IS the
        destination; ``align`` is a WP-NATIVE supports attribute serialised straight
        into the block markup as ``"align":"full"``, NOT a custom block_attributes
        row, so the §3.A.7 block_supports check is the complete §3.A.8 gate).

    The synthetic Write carries the sentinel ``property="__align_finalise__"`` (NOT
    ``"max-width"``): it has no source declaration, so keying it on a real CSS
    property mis-joins the F5 coverage/conservation ledger (D240). The sentinel keeps
    the ledger join honest.
    Returns the synthetic Write, or None.
    """
    if getattr(ctx, "base_layer", None) != "OUTER":
        return None
    # Tier-blind: a max-width at ANY tier means the element is capped somewhere, so it
    # is not an unconditional full-bleed — suppress the synthetic align:"full".
    has_max_width = any(d.property == "max-width" for d in decls)
    if has_max_width:
        return None
    # Defensive (same condition, by Write): any maxWidth* Write came from a max-width
    # declaration — key on the source property so maxWidthTablet/Mobile also count.
    if any(w.property == "max-width" for w in writes):
        return None
    if not _block_supports_full_align(ctx):
        return None
    return Write(attr="align", value="full", property="__align_finalise__", tier="Base")
