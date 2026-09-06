"""tier_suffix — re-append the device-tier breakpoint suffix to a base attr.

Design §3.1: ALWAYS called AFTER attr_resolve (fixed service-call order). The
caller MUST have gapped a non-device tier first (A4) — a non-device tier here is
a programming error, raised loudly rather than coerced.

    Base    -> maxWidth
    Mobile  -> maxWidthMobile
    Tablet  -> maxWidthTablet
    Desktop -> maxWidthDesktop

Whether the suffixed attr actually EXISTS on the block is validated downstream by
services.validate (a non-existent tier attr → gap, never a silent write).

R-31-1 (D249): the Mobile/Tablet/Desktop breakpoint suffix vocabulary is DB-OWNED —
read from ``db_lookup.modifier_suffixes('breakpoint')``, NEVER a hardcoded dict (the
former ``_TIER_SUFFIX`` literal was the live R-31-1 violation, same class as the
grid_area side-suffix regex Bean caught). For a device tier the suffix IS the tier
name (``Mobile`` → ``'Mobile'``).
"""
from __future__ import annotations

import sqlite3

from converter.db.db_lookup import box_family_is_tier_shaped, modifier_suffixes

# "Base" is the UNSUFFIXED device tier (SGS desktop) — a structural pipeline convention,
# NOT a row in the DB suffix vocabulary. This single named constant is the permitted
# R-31-1 exception (same class as SKIP_TOP_LEVEL_TAGS): an empty BASE suffix has no DB
# row to source. The Mobile/Tablet/Desktop suffixes themselves come from the DB below.
_BASE_TIER = "Base"


def tier_suffix(base_attr: str, tier: str, conn: sqlite3.Connection, block_slug: str | None = None) -> str:
    # ``conn`` is retained for call-site signature stability (every resolver passes
    # ctx.conn); the DB suffix vocabulary is sourced via the cached modifier_suffixes.
    if tier == _BASE_TIER:
        return base_attr
    # Phase 2 tier-object migration (2026-09-06): a box-family attr that has been
    # folded into the TIER-of-BOXES shape ({desktop,tablet,mobile}, one attribute)
    # no longer HAS a suffixed sibling to write to — `paddingTablet` on a migrated
    # block simply doesn't exist. Every tier writes to the SAME base attr name;
    # `dispatch_spine.attrs()` is what nests each write under its tier key. Gated
    # on `block_slug` being available (every real call site has it via ctx) —
    # `None` preserves the old suffixing behaviour for any caller that hasn't been
    # updated to pass it, rather than silently changing behaviour underneath it.
    if block_slug is not None and box_family_is_tier_shaped(block_slug, base_attr):
        return base_attr
    # The breakpoint suffix vocabulary is DB-owned (R-31-1). Validate the tier against
    # the DB set so a non-device tier fails loud rather than appending a bogus suffix.
    if tier not in modifier_suffixes("breakpoint"):
        raise ValueError(
            f"tier_suffix received non-device tier {tier!r}; the caller must route "
            f"non-device-tier breakpoints to gap(NO_DESTINATION) first (design §10 A4)."
        )
    return f"{base_attr}{tier}"


def tier_state_suffix(base_attr: str, decl, conn: sqlite3.Connection, block_slug: str | None = None) -> str:
    """Re-append the device-tier suffix (step 4) THEN the interaction-state suffix
    (step 4a, D309) to a base attr, universally — Spec 31 §3.A.

    This is the ONE shared re-append every box resolver (outer_box / content_band /
    grid) must call after ``attr_resolve`` so a ``:hover``/``:focus``/
    ``:active`` declaration on ANY route (a grid's border, a per-area background, an
    outer box colour) routes to the block's ``{base}{Tier}{State}`` companion instead
    of silently writing the base attr (the colourBorder double-write conservation
    collision, 2026-07-22). Order is tier-then-state per §3.A step 4a ("AFTER any tier
    suffix"). ``decl.state`` is None for a resting declaration → tier-only, unchanged.

    ``block_slug`` (Phase 2, 2026-09-06): pass ``ctx.block_slug`` so a box-family
    destination already folded into the TIER-of-BOXES shape resolves to the bare
    base attr for every tier, instead of a suffixed sibling that no longer exists.

    Whether the suffixed attr EXISTS on the block is validated downstream by
    ``services.validate`` — a state a block does not declare becomes an honest gap,
    never a wrong write (R-31-9 universal, DB-gated). ``decl`` carries ``.tier`` and
    ``.state`` (the StateSuffix, e.g. ``'Hover'``, set by css_pass step 3b)."""
    attr = tier_suffix(base_attr, decl.tier, conn, block_slug)
    state = getattr(decl, "state", None)
    if state:
        attr = f"{attr}{state}"
    return attr
