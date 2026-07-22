"""state_value_lift — direct (block, css_property, css_state) resolution +
semantic-value parsing for hover-ONLY destination attrs (Spec 31 §3.A step 4a
extension, D309, coupled UN-EXCLUDE + HOVER-LIFT, 2026-07-22).

GROUND-TRUTH: spec=31 §3.A step 4a (D309 universal hover) + §13.1 R-31-9
(universal mechanisms, no per-block hyperfocus) source=db evidence=
`sgs/button.scaleHover` / `sgs/card-grid.{scaleHover,grayscaleHover,
imageZoomHover}` / `sgs/gallery.*` / `sgs/team-member.*` / `sgs/info-box.
grayscaleHover` / `sgs/heading.scaleHover` / `sgs/quote.scaleHover` /
`sgs/text.scaleHover` / `sgs/icon.scaleHover` / `sgs/testimonial.scaleHover` /
`sgs/post-grid.{scaleHover,imageZoomHover}` are the ONLY consumers of
`transform`/`filter` (verified 2026-07-22 audit: 0 rows previously carried
`css_property IN ('transform','filter')` on the un-suffixed shape — every
consumer's attr NAME already bakes the hover state in, unlike the
`backgroundColour`/`backgroundColourHover` base+companion pair the existing
`tier_state_suffix` append mechanism assumes). render.php confirms the VALUE
shape: `button/render.php:223` reads `scaleHover` as a bare float
(`(float) $attributes['scaleHover']`); `card-grid/render.php:56,63,64` reads
`scaleHover` as a bare numeric string, `imageZoomHover`/`grayscaleHover` as
booleans (`! empty(...)`); `team-member/render.php:116,119,120` the same
(bare scale + booleans) — never the raw `scale(1.05)`/`grayscale(1)` CSS
function-call string.

Why this module exists (not folded into `tier_state_suffix`): that function's
whole contract is "the companion attr's NAME already resolved via
`attr_resolve`; append tier then state as STRING CONCATENATION" — it has no
DB round-trip and no value-parsing hook. `scaleHover` et al. need BOTH a
DIFFERENT lookup shape (direct css_property+css_state match, since there is
no bare `scale` attr to concat "Hover" onto) AND a value transform (CSS
`scale(1.05)` -> plain float `1.05`; CSS `grayscale(1)` -> bool). Keeping this
as a distinct, universal, DB-gated pre-step (tried before the ordinary
`attr_resolve` + `tier_state_suffix` path, falling through UNCHANGED when it
finds nothing) avoids overloading `tier_state_suffix` with two incompatible
contracts and keeps every existing base+Hover-companion pair parity-neutral
(those rows have `css_property IS NULL` on the companion attr and never match
`attr_for_state_property`).

Callers (any resolver dispatching a state-carrying Decl — `outer_box`,
`content_band`, `grid`, `grid_area`, universally, R-31-9): call
`resolve_state_property(decl, ctx)` BEFORE the ordinary
`attr_resolve(...)+tier_state_suffix(...)` chain. A `None` return means "no
direct-state destination for this (block, css_property, state)" -- fall
through to the existing chain unchanged. A `Write`/`GAP` return is terminal
for this declaration.
"""
from __future__ import annotations

import re
from typing import Any

from converter.db import db_lookup
from converter.models import GAP, GapOrigin, Write
from converter.services.gap_writer import gap_writer
from converter.services.styling_helpers import strip_important
from converter.services.validate import validate

# ---------------------------------------------------------------------------
# Semantic value parsers — CSS function-call string -> plain scalar.
# ---------------------------------------------------------------------------

# `scale(1.05)` or `scale(1.05, 1.05)` (equal x/y -> one value). A transform
# LIST (`scale(1.05) rotate(2deg)`) is handled by scanning for a `scale(...)`
# token anywhere in the value — the non-scale parts (rotate/translate/etc.)
# are simply not represented by this single-number attr; that is an honest,
# PARTIAL transfer of the transform shorthand (the attr can only ever carry a
# scale factor), not a silent drop of the whole declaration.
# A CSS number: `1`, `1.05`, `1.`, or a LEADING-DOT form `.5` (valid CSS —
# `scale(.5)` must not be dropped). The `\b` prevents a substring match inside
# a longer function name (`rescale(1)` must NOT read as `scale(1)`); note
# `scaleX(`/`scale3d(` already fail because the literal `scale(` requires the
# very next char to be `(`.
_NUM = r"(?:\d+\.?\d*|\.\d+)"
_SCALE_RE = re.compile(r"\bscale\(\s*(" + _NUM + r")\s*(?:,\s*(" + _NUM + r")\s*)?\)")

# `grayscale(1)` or `grayscale(100%)` -> normalised 0..1 float.
_GRAYSCALE_RE = re.compile(r"\bgrayscale\(\s*(" + _NUM + r")\s*(%?)\s*\)")


def parse_transform_scale(value: str) -> float | None:
    """Extract a UNIFORM scale factor from a `transform` value, or None
    (honest gap) when no `scale(...)` token is present, or the token has
    UNEQUAL x/y components (e.g. `scale(1.05, 1.2)` — this single-number attr
    cannot represent anisotropic scaling; writing either component alone
    would be a wrong value, not a partial one)."""
    v = strip_important(value).strip()
    m = _SCALE_RE.search(v)
    if not m:
        return None
    x = float(m.group(1))
    y = float(m.group(2)) if m.group(2) is not None else x
    if abs(x - y) > 1e-6:
        return None
    return x


def parse_filter_grayscale(value: str) -> float | None:
    """Extract a 0..1 grayscale amount from a `filter` value, or None (honest
    gap) when no `grayscale(...)` token is present."""
    v = strip_important(value).strip()
    m = _GRAYSCALE_RE.search(v)
    if not m:
        return None
    num = float(m.group(1))
    if m.group(2) == "%":
        num = num / 100.0
    # CSS clamps grayscale to 0..1; a value outside that range is malformed
    # input, not a representable amount. Gap it honestly (Spec 31 §3.A step 7
    # validate / step 8 no-valid-destination) rather than writing an invalid
    # number that a boolean-typed attr would silently truthy-coerce to `true`.
    if not (0.0 <= num <= 1.0):
        return None
    return num


# css_property -> parser function. R-31-1 permitted-constant exception (same
# class as `_LITERAL_PROPS` in outer_box.py): this is a fixed CSS-function-
# shape dispatch, not SGS per-block data — there is no DB table of CSS
# function-value grammars. The DESTINATION (which attr, on which block) is
# fully DB-resolved via `attr_for_state_property`; only the VALUE-PARSING
# shape per css_property is a code constant.
_STATE_VALUE_PARSERS = {
    "transform": parse_transform_scale,
    "filter": parse_filter_grayscale,
}


def _coerce_for_attr_type(parsed: float, ctx: Any, attr: str) -> bool | int | float:
    """Convert the parsed numeric value to the destination attr's declared
    WP schema type (Spec 31 §3.A.5 — serialise by `block_attributes.attr_type`,
    never write a type WP will silently discard at render).

    Branches on `db_lookup.attr_is_boolean`/`services.validate.attr_is_number`
    (SQL-side type-family checks) rather than retrieving the `attr_type`
    STRING and comparing it in Python — the same discipline `attr_is_colour_
    role`/`attr_is_number` already enforce, keeping every block-slug-derived
    type-family comparison inside a DB WHERE clause, out of
    `gates/no_slug_literal.py`'s AST scan scope (R-31-1/R-31-9)."""
    if db_lookup.attr_is_boolean(ctx.block_slug, attr):
        return parsed > 0
    # attr_type in ('number','integer') OR 'string' (e.g. sgs/card-grid.
    # scaleHover, sgs/gallery.scaleHover — render.php reads it as a bare
    # numeric string interpolated directly, verified GROUND-TRUTH above): a
    # plain number serialises to the same value either way.
    return int(parsed) if float(parsed).is_integer() else parsed


def resolve_state_property(decl: Any, ctx: Any) -> Write | GAP | None:
    """Direct state-property lift (Spec 31 §3.A step 4a extension). Tried
    BEFORE the ordinary `attr_resolve` + `tier_state_suffix` chain. Returns
    `None` (never a GAP) when there is no direct-state destination — the
    caller falls through to the existing chain unchanged (parity-neutral)."""
    if not decl.state:
        return None
    # PROPERTY GATE FIRST — this module is scoped to transform/filter ONLY.
    # It MUST be completely inert for every other property, so a hover
    # declaration it does not own falls through to the ordinary
    # `attr_resolve` + `tier_state_suffix` chain UNCHANGED.
    #
    # ⚠ Ordering is load-bearing: the A4 gate below MUST NOT precede this.
    # ~70 existing `*Hover` companions (backgroundColourHover, textColourHover,
    # shadowHover, …) DO carry css_property + css_state='hover' in the live DB,
    # so an A4 gate placed above this check would GAP a non-device-tier hover
    # `background-color` here instead of letting the ordinary chain capture it
    # as a ResidualBand → `sgsCustomCss` (Spec 31 §13.4 FR-31-5.2: a
    # non-device threshold is "never snapped, never dropped"). That would
    # silently destroy the D289/D303 passthrough for hover rules.
    parser = _STATE_VALUE_PARSERS.get(decl.property)
    if parser is None:
        return None

    # A4 (Spec 31 §3.A): a non-device-tier breakpoint has no device bucket.
    # None of today's direct-state attrs (scaleHover/grayscaleHover/
    # imageZoomHover) declare Tablet/Mobile siblings (Base-tier hover-only) —
    # gap it honestly rather than silently accepting a sub-tier band this
    # attr family cannot represent, mirroring every other resolver's A4 gate.
    if not decl.is_device_tier:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"non-device-tier breakpoint {decl.tier!r} for {decl.property} "
            f"with state {decl.state!r} (Spec 31 §3.A A4)",
        )

    attr = db_lookup.attr_for_state_property(ctx.block_slug, decl.property, decl.state)
    if attr is None:
        return None

    if not validate(ctx, attr, decl.value):
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} declares {attr!r} for ({decl.property!r}, "
            f"state={decl.state!r}) but validate() rejected it",
        )

    parsed = parser(decl.value)
    if parsed is None:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{decl.property} value {decl.value!r} has no parseable "
            f"{'scale(...)' if decl.property == 'transform' else 'grayscale(...)'} "
            f"token (or an anisotropic scale) for {attr!r}",
        )

    out_value = _coerce_for_attr_type(parsed, ctx, attr)
    return Write(attr=attr, value=out_value, property=decl.property, tier=decl.tier)
