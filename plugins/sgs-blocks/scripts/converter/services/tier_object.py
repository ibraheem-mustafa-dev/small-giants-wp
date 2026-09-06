"""tier_object — shared TIER-OBJECT accumulation mechanics (Spec 35 tier shape).

Extracted from ``resolvers/typography.py``'s ``_tier_object_key`` /
``_tier_object_writes`` (2026-08-25, D802 — the typography fix for this defect
class) so every resolver family that accumulates a tier-shaped object attr
(``{desktop, tablet, mobile}``) shares ONE mechanism (R-31-9) instead of
reimplementing the tier-key derivation + base-attr validation + Write
construction per resolver. Property-specific VALUE normalisation (numeric
split + unit companion, colour token-snap, font-weight keyword mapping,
string verbatim, etc.) stays in each resolver — this module owns only the
tier-object PLUMBING:

  1. ``tier_object_key(tier)`` — map a device tier ('Base'/'Tablet'/'Mobile')
     to its key inside a ``{desktop, tablet, mobile}`` object. DB-driven
     (R-31-1) via ``modifier_suffixes('breakpoint')`` — never a hardcoded
     ``{"Base": "desktop", ...}`` dict (an earlier revision of this helper
     hardcoded exactly that and the anti-cheat suffix-vocab-dict gate
     correctly refused the commit).
  2. ``tier_object_write(ctx, decl, prop, base_attr, value, validate_raw=...)``
     — validate the BASE (unsuffixed) attr, resolve the tier key, and return
     ONE partial ``Write(attr=base_attr, value={tier_key: value}, ...)``. The
     orchestrator (``ElementResult.attrs()``) merges partial dict writes for
     the same attr per key — the same mechanism it already uses for BOX
     partial writes — so three declarations at three tiers accumulate into
     ONE ``{desktop, tablet, mobile}`` object rather than three separate
     attrs or a silently-gapped suffix.

Gated exclusively on ``db_lookup.tier_object_base(block_slug, attr_name)`` —
never on the attr NAME or the CSS property (R-31-1). Every resolver that
re-appends a device-tier suffix via ``tier_suffix``/``tier_state_suffix``
MUST check this predicate on the UNSUFFIXED base attr FIRST: a migrated
block no longer declares the suffixed sibling (`gapTablet` etc.), so
re-appending one makes ``services.validate`` gap the write as
NO_DESTINATION and the tier value is discarded SILENTLY — the exact defect
D802 fixed for typography (fontSize) and this module's callers fix for the
GRID/LAYOUT/OUTER resolver family (gap, gridTemplateColumns, columns,
contentWidth, minHeight, maxWidth, height, maxHeight, order, flexDirection
across sgs/container, sgs/hero, sgs/button, sgs/multi-button,
sgs/trust-bar, sgs/feature-grid, sgs/testimonial-slider, sgs/media).

Used by: resolvers/typography.py (refactored to delegate here, D802's own
mechanism unchanged), resolvers/grid.py, resolvers/outer_box.py,
resolvers/content_band.py, services/arrangement.py.
"""
from __future__ import annotations

from typing import Any

from converter.db.db_lookup import modifier_suffixes
from converter.models import GAP, GapOrigin, Write
from converter.services.gap_writer import gap_writer
from converter.services.validate import validate

# "Base" is the UNSUFFIXED device tier (SGS desktop) — a structural pipeline
# convention, NOT a row in the DB suffix vocabulary. This single named
# constant is the permitted R-31-1 exception (same class as
# SKIP_TOP_LEVEL_TAGS / tier_suffix.py's own `_BASE_TIER`): an empty BASE
# suffix has no DB row to source. The Mobile/Tablet/Desktop suffixes
# themselves come from the DB below.
_BASE_TIER = "Base"
_BASE_TIER_KEY_SOURCE = "Desktop"


def tier_object_key(tier: str) -> "str | None":
    """Map a device tier to its key inside a {desktop,tablet,mobile} object.

    ⛔ The breakpoint suffix grammar is DB-OWNED (R-31-1 / Spec 31 §7a.4) — the
    vocabulary comes from ``modifier_suffixes('breakpoint')``, never a literal
    dict. The object key IS the suffix lower-cased — that is the contract
    ``sgs_responsive_normalise_object()`` reads on the PHP side — so the
    mapping is derived, not enumerated. A tier outside the DB vocabulary
    returns None and the caller gaps it honestly rather than inventing a key.
    """
    vocab = modifier_suffixes("breakpoint")
    resolved = _BASE_TIER_KEY_SOURCE if tier == _BASE_TIER else tier
    if resolved not in vocab:
        return None
    return resolved.lower()


def tier_object_write(
    ctx: Any,
    decl: Any,
    prop: str,
    base_attr: str,
    value: Any,
    *,
    validate_raw: "str | None" = None,
) -> "Write | GAP":
    """Emit ONE partial tier-object Write (``{tier_key: value}``) for ``base_attr``.

    ``value`` is the ALREADY property-normalised value for this declaration's
    tier (a number, a bare colour token/hex, a raw string template, an
    integer count, …) — whatever the calling resolver's own value
    serialisation would otherwise have written into the flat suffixed attr.
    This helper does not re-derive it; it only decides WHERE it lands.

    ``validate_raw`` is the string passed to ``services.validate`` for
    attr-existence / enum-membership checking (defaults to ``str(value)``
    for a plain scalar). ``validate()`` is called on the BASE attr
    (unsuffixed) — that is the whole point of the tier-object shape: the
    suffixed sibling (e.g. ``gapTablet``) no longer exists on a migrated
    block, so re-appending a tier suffix would make ``validate()`` gap the
    write as NO_DESTINATION and silently discard the value.
    """
    tier_key = tier_object_key(decl.tier)
    if tier_key is None:
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"tier {decl.tier!r} has no tier-object key for {base_attr}",
        )
    raw_for_validate = validate_raw if validate_raw is not None else str(value)
    if not validate(ctx, base_attr, raw_for_validate):
        return gap_writer(
            ctx, decl, GapOrigin.NO_DESTINATION,
            f"{ctx.block_slug} does not declare tier-object base {base_attr!r}",
        )
    return Write(attr=base_attr, value={tier_key: value}, property=prop, tier=decl.tier)
