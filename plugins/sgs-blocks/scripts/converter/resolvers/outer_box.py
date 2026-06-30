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
Shadow presets sourced from design_tokens WHERE token_type='size' AND slug LIKE 'shadow-%':
shadow-sm='0 1px 3px rgba(0,0,0,0.08)', shadow-md='0 4px 12px rgba(0,0,0,0.1)',
shadow-lg='0 8px 30px rgba(0,0,0,0.12)', shadow-glow='0 0 20px rgba(248,122,31,0.3)'.
Wrapper renders box-shadow:var(--wp--preset--shadow--{slug}) where slug=suffix after 'shadow-'.
"""
from __future__ import annotations

import re
import sqlite3
from typing import Any

from converter.models import GAP, GapOrigin, Write
from converter.services.attr_resolve import attr_resolve
from converter.services.gap_writer import gap_writer
from converter.services.styling_helpers import split_value_unit
from converter.services.tier_suffix import tier_suffix
from converter.services.token_snap import token_snap
from converter.services.validate import validate
from converter.services.value_serialise import value_serialise

# OUTER box CSS properties this resolver transfers (Spec 31 §3.A L1). A `padding`
# shorthand is NOT here — it is expanded to longhands pre-dispatch; arriving raw is
# a wiring gap (UNIMPLEMENTED_STUB), never a silent drop.
#
# background-size/position/repeat/attachment: DB-resolved to backgroundSize* etc. attrs.
# box-shadow: DB-resolved to the block's shadow attr; token-snapped to a preset slug.
_OUTER_TRANSFER_PROPS = frozenset({
    "max-width", "min-height", "gap",
    "padding-top", "padding-right", "padding-bottom", "padding-left",
    "background-size", "background-position", "background-repeat", "background-attachment",
    "box-shadow",
})

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

    Shadow presets live in design_tokens WHERE token_type='size' AND slug LIKE 'shadow-%'.
    The default_value column holds the canonical CSS value (e.g. '0 4px 12px rgba(0,0,0,0.1)').
    The wrapper renders box-shadow:var(--wp--preset--shadow--{slug-after-shadow-prefix}).

    Never hardcodes the preset list — reads from DB at call-time (R-22-1 DB-first rule).
    """
    normalised = _normalise_shadow(raw_value)
    rows = conn.execute(
        "SELECT slug, default_value FROM design_tokens "
        "WHERE slug LIKE ? AND token_type='size'",
        (f"{_SHADOW_SLUG_PREFIX}%",),
    ).fetchall()
    for slug, default_value in rows:
        if _normalise_shadow(default_value) == normalised:
            # Strip the 'shadow-' prefix: 'shadow-md' → 'md'.
            if slug.startswith(_SHADOW_SLUG_PREFIX):
                return slug[len(_SHADOW_SLUG_PREFIX):]
            return slug  # Defensive: return as-is if prefix absent (unexpected DB row).
    return None


def _attr_is_number(ctx: Any, attr: str) -> bool:
    # The attr_type='number' predicate is done IN SQL (returns a presence row, not a
    # string to compare in Python) — mirrors validate.py's `row is None` idiom so the
    # block_slug-bearing query does not taint a local that is then string-compared
    # (the no-slug-literal carve-out gate taints any local assigned from a
    # block_slug-bearing expression).
    row = ctx.conn.execute(
        "SELECT 1 FROM block_attributes "
        "WHERE block_slug=? AND attr_name=? AND attr_type='number'",
        (ctx.block_slug, attr),
    ).fetchone()
    return row is not None


def resolve(decl: Any, ctx: Any) -> Write | list[Write] | GAP:
    prop = decl.property

    # A raw `padding` shorthand should have been expanded pre-dispatch (one decl →
    # 4 longhands). If it reaches here, the extraction stage was not wired for this
    # path — gap it honestly, naming the seam (never a half-transfer).
    if prop == "padding":
        return gap_writer(
            ctx, decl, GapOrigin.UNIMPLEMENTED_STUB,
            "padding shorthand must be expanded to longhands by the pre-dispatch "
            "extraction stage (fold_helpers._expand_box_shorthand); it reached "
            "outer_box unexpanded — wire shorthand expansion at extraction",
        )

    if prop not in _OUTER_TRANSFER_PROPS:
        return gap_writer(
            ctx, decl, GapOrigin.UNIMPLEMENTED_STUB,
            f"outer_box does not own OUTER property '{prop}' yet "
            f"(transfers: {sorted(_OUTER_TRANSFER_PROPS)})",
        )

    # A4: a non-device-tier breakpoint has no device bucket — gap it, never coerce.
    if not decl.is_device_tier:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"non-device-tier breakpoint {decl.tier!r} for {prop} (Spec 31 §3.A A4)",
        )

    # Step 2: name resolution (per-block, DB-driven — never prefix concat).
    base_attr = attr_resolve(ctx, "OUTER", prop)
    if base_attr is None:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} has no OUTER attr for {prop}",
        )

    # Step 4: re-append the tier suffix; step 7: validate the suffixed attr exists.
    attr = tier_suffix(base_attr, decl.tier, ctx.conn)
    if not validate(ctx, attr, decl.value):
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} does not declare {attr!r} (tier {decl.tier})",
        )

    # --- box-shadow: TOKEN-SNAP to a shadow preset slug (DB-sourced), never raw value.
    #
    # The shadow attr (DB-resolved above via attr_resolve) stores a PRESET SLUG, not a
    # raw CSS box-shadow value. The wrapper renders:
    #     box-shadow: var(--wp--preset--shadow--{slug})
    # A raw CSS value would NOT match any WP preset var → the wrapper renders nothing.
    # This is the no-cheats rule for box-shadow: if no preset matches, gap it honestly.
    #
    # The preset list is read from design_tokens at call-time (R-22-1 DB-first — not
    # hardcoded). Slugs carry the 'shadow-' prefix in the DB; the wrapper expects the
    # suffix only (e.g. 'md', not 'shadow-md').
    if prop == "box-shadow":
        slug = _shadow_token_snap(decl.value, ctx.conn)
        if slug is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"box-shadow value {decl.value!r} does not match any shadow preset in "
                f"design_tokens (token_type='size', slug LIKE 'shadow-%'); the shadow "
                f"attr expects a preset slug, not a raw CSS value — add a matching "
                f"preset to design_tokens or rework the draft to use a standard shadow",
            )
        # The slug itself ('sm'/'md'/'lg'/'glow') is a string, not an enum-constrained
        # attr on sgs/container (enum_values IS NULL for the shadow attr), so validate()
        # already passed above (attr existence only). Write the slug directly.
        return Write(attr=attr, value=slug, property=prop, tier=decl.tier)

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
        # Unit companion: derive from the BASE attr (not the tier-suffixed name) and
        # write ONLY alongside the Base tier — matching typography.py / grid_area.py.
        unit_attr = f"{base_attr}Unit"
        if unit and decl.tier == "Base" and validate(ctx, unit_attr, unit):
            writes.append(Write(attr=unit_attr, value=unit, property=prop, tier=decl.tier))
        return writes

    # String/length-literal attr: verbatim (D230 for max-width/min-height).
    # background-size/position/repeat/attachment: written as-is (the enum constraint,
    # if any, was already checked by validate() above — a value not in the enum failed
    # validate and would have gapped, so we never reach here with an illegal value).
    value = token_snap(prop, value_serialise("string", None, decl.value), ctx.conn)
    return Write(attr=attr, value=value, property=prop, tier=decl.tier)


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
