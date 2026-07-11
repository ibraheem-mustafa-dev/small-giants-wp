"""typography — the typography resolver (Spec 31 §3.B2 / §3.A, layer-agnostic).

Typography is a PRE-LAYER sink in the dispatch table (``dispatch_table`` §A13): a
typography CSS property routes here regardless of structural layer. Spec 31 §3.B2
(the CSS-on-content route, modularised from convert.py
``_lift_typography_to_block_attrs``/``_lift_styling_attrs_by_selector``) defines the
per-property normalisation:

  - ``font-size`` / ``line-height`` / ``letter-spacing`` → a NUMBER primary attr +
    (when the value carries a CSS unit) a ``…Unit`` companion attr. ONE declaration
    → a list[Write] of BOTH (the seam decision multi-Write contract). A UNITLESS
    value (``line-height:1.15``) writes the number with NO unit companion (render.php
    Bug-2 fix) — or the ``"unitless"`` sentinel when the block declares the unit attr.
  - ``font-weight`` → numeric STRING, normalising keywords (``bold``→``700``,
    ``normal``→``400``) faithful to convert.py ``_FONT_WEIGHT_KEYWORDS`` (3897). This
    keyword→numeric normalisation is INTENTIONAL, NOT a divergence bug: it matches
    ``_lift_styling_attrs_by_selector`` (convert.py:3897) and render.php enum-guards
    the weight to the '400'..'900' set — a raw ``'bold'`` would be REJECTED at render.
    Do NOT "fix" this to pass the keyword through.
  - ``font-style`` / ``text-align`` → raw string (enum-typed attrs).
  - ``color`` / ``background-color`` → the BARE token slug or hex (Bug-1 fix —
    ``_extract_token_or_hex``, NOT ``_colour_value_to_style``; sgs_colour_value() in
    render.php expects a bare slug/hex, not ``var:preset|color|…``).

The css_property → (primary_attr, unit_attr) mapping is fully DB-driven via
``db_lookup.typography_css_to_attrs()`` (R-31-1 — no hardcoded prop→attr dict). Tier
handling re-appends the device-tier suffix to the primary attr (``fontSizeTablet``);
the unit companion is written ONLY alongside the BASE attr (convert.py:1699), never a
tier variant.

REUSES main's shared helpers (do NOT redefine): ``styling_helpers.strip_important``,
``extract_token_or_hex``, ``split_value_unit``. NO block-slug literals.
"""
from __future__ import annotations

import functools
from typing import Any

from converter.models import GAP, GapOrigin, Write
from converter.services.gap_writer import gap_writer
from converter.services.styling_helpers import (
    extract_token_or_hex,
    split_value_unit,
    strip_important,
)
from converter.services.tier_suffix import tier_suffix
from converter.services.validate import attr_is_number, validate
from converter.db.db_lookup import typography_css_to_attrs

# font-weight keyword → numeric string (faithful port of convert.py:3897).
# R-31-1 PERMITTED named-constant exception (same class as SKIP_TOP_LEVEL_TAGS):
# these are CSS-spec facts (the two keyword font-weights), NOT SGS per-block data, so
# there is no DB table to source them from. render.php enum-guards the weight to the
# '400'..'900' set, so a raw 'bold' would be REJECTED at render — this normalisation
# is REQUIRED, not a divergence. Do NOT extend this dict with other hardcoded sets.
_FONT_WEIGHT_KEYWORDS: dict[str, str] = {"normal": "400", "bold": "700"}
# Colour properties whose value is a bare slug/hex (Bug-1 path).
_COLOUR_PROPS = frozenset({"color", "background-color"})


@functools.lru_cache(maxsize=1)
def _typo_map() -> dict[str, tuple[str, str | None]]:
    """{css_prop: (primary_attr, unit_attr_or_None)} from the DB (R-31-1).

    Cached (the DB map is process-stable) so resolve() does not rebuild the dict on
    every declaration."""
    return {css: (primary, unit) for css, primary, unit in typography_css_to_attrs()}


# The attr_type predicate moved to the SHARED converter.services.validate.
# attr_is_number (CG-4 rater Finding 2, 2026-07-05) — this local copy was
# number-only and MISSED the Step-12 'integer' widening; ONE implementation
# now serves all four resolvers (R-31-9).
_attr_is_number = attr_is_number


def resolve(decl: Any, ctx: Any) -> Write | list[Write] | GAP:
    prop = decl.property
    typo_map = _typo_map()
    entry = typo_map.get(prop)
    if entry is None:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"typography resolver has no DB mapping for {prop}",
        )
    primary_attr, unit_attr = entry

    if not decl.is_device_tier:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"non-device-tier breakpoint {decl.tier!r} for {prop} (§3.A A4)",
        )

    raw = strip_important(decl.value).strip()
    if not raw:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"empty value for {prop}",
        )

    # Tier-suffixed primary destination (fontSize / fontSizeTablet / fontSizeMobile).
    tgt = tier_suffix(primary_attr, decl.tier, ctx.conn)

    # Interaction-state suffix AFTER the tier suffix (D309, universal hover): a
    # draft `:hover` declaration lands on the block's `{attr}Hover` companion
    # (v1 hover is base-tier only, so tgt == primary_attr here). The subsequent
    # validate(ctx, tgt, ...) gates on the block actually declaring that state
    # attr — a block without it emits an honest gap, never a wrong write.
    state = getattr(decl, "state", None)
    if state:
        tgt = f"{tgt}{state}"

    # --- colour properties: bare slug / hex (Bug-1) ------------------------------
    if prop in _COLOUR_PROPS:
        if not validate(ctx, tgt, raw):
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} does not declare {tgt!r} (tier {decl.tier})",
            )
        v = extract_token_or_hex(raw)
        if v is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{prop} value {raw!r} is neither a token slug nor a hex colour",
            )
        return Write(attr=tgt, value=v, property=prop, tier=decl.tier)

    # --- font-weight: keyword → numeric string -----------------------------------
    if prop == "font-weight":
        if not validate(ctx, tgt, raw):
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} does not declare {tgt!r} (tier {decl.tier})",
            )
        lc = raw.lower()
        out = _FONT_WEIGHT_KEYWORDS.get(lc, raw)
        return Write(attr=tgt, value=out, property=prop, tier=decl.tier)

    # --- numeric typography (font-size / line-height / letter-spacing) -----------
    if _attr_is_number(ctx, primary_attr):
        if not validate(ctx, tgt, raw):
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{ctx.block_slug} does not declare {tgt!r} (tier {decl.tier})",
            )
        # default_unit="" so a unitless value (line-height:1.15) returns unit=""
        # and the unit companion is NOT written (render.php Bug-2).
        num, unit = split_value_unit(raw, default_unit="")
        if num is None:
            return gap_writer(
                ctx, decl, GapOrigin.NO_DESTINATION,
                f"{prop} value {raw!r} is not a parseable number",
            )
        num_out: int | float = int(num) if float(num).is_integer() else num
        writes: list[Write] = [Write(attr=tgt, value=num_out, property=prop, tier=decl.tier)]
        # Unit companion: only alongside the BASE attr (convert.py:1699), and only
        # when the block declares the unit attr. Unitless → the "unitless" sentinel
        # when a unit attr exists (round-trips, stripped at render).
        if unit_attr is not None and decl.tier == "Base":
            effective_unit = unit if unit else "unitless"
            if effective_unit and validate(ctx, unit_attr, effective_unit):
                writes.append(
                    Write(attr=unit_attr, value=effective_unit, property=prop, tier=decl.tier)
                )
        return writes

    # --- remaining string-typed typography (font-style / text-align) -------------
    if not validate(ctx, tgt, raw):
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} does not declare {tgt!r} (tier {decl.tier})",
        )
    return Write(attr=tgt, value=raw, property=prop, tier=decl.tier)
