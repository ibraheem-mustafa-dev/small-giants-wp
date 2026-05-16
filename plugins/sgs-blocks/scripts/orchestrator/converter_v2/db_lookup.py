"""db_lookup.py — DB-backed canonical lookups for the converter.

Replaces the hardcoded CLASS_TO_BLOCK table in convert.py with live queries
against the Phase-1-frozen vocabularies in sgs-framework.db:

  - blocks                  : registered SGS block slugs
  - slot_synonyms           : canonical_slot → aliases (label, heading, media...)
  - modifier_suffixes       : Primary/Hover/Mobile/etc.
  - property_suffixes       : Padding/Margin/FontSize/etc.
  - block_attributes        : attr_name → canonical_slot mapping per block

And against uimax.naming_conventions for the SGS-BEM regex.

The architecture matches Spec 15 §3 (Convention Layer) + §4 (Mapping Layer).
"""
from __future__ import annotations

import functools
import re
import sqlite3
from pathlib import Path
from typing import NamedTuple

SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
UIMAX_DB = Path.home() / ".agents" / "ui-ux-pro-max" / "scripts" / "ui-ux-pro-max.db"
if not UIMAX_DB.exists():
    UIMAX_DB = Path.home() / ".agents" / "skills" / "ui-ux-pro-max" / "scripts" / "ui-ux-pro-max.db"


class BemParse(NamedTuple):
    """Parsed SGS-BEM class name. None fields mean the part wasn't present."""
    block: str | None       # 'featured-product', 'product-card', 'button'
    element: str | None     # 'inner', 'price-row', 'label', 'pill-group'
    modifier: str | None    # 'primary', 'trial', 'active'


# ----------------------------------------------------------------------------
# SGS-BEM parser — uses the regex stored in uimax.naming_conventions
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=1)
def _sgs_bem_regex() -> re.Pattern:
    """Fetch the canonical SGS-BEM regex from uimax.naming_conventions."""
    # Note: the validator regex in uimax allows `-` inside block/element capture
    # groups, which is greedy and eats `--modifier`. For PARSING (vs validating)
    # we need block/element groups that EXCLUDE the `--` boundary. The trick is
    # `(?:[a-z0-9]|-(?!-))*` — any single char that's not the start of `--`.
    return re.compile(
        r"^sgs-([a-z](?:[a-z0-9]|-(?!-))*)"          # block
        r"(?:__([a-z](?:[a-z0-9]|-(?!-))*))?"        # __element
        r"(?:--([a-z][a-z0-9-]*))?$"                  # --modifier (can contain hyphens)
    )


def parse_sgs_bem(class_name: str) -> BemParse | None:
    """Parse 'sgs-product-card__body--trial' → BemParse(block='product-card', element='body', modifier='trial')."""
    if not class_name.startswith("sgs-"):
        return None
    m = _sgs_bem_regex().match(class_name)
    if not m:
        return None
    return BemParse(block=m.group(1), element=m.group(2), modifier=m.group(3))


# ----------------------------------------------------------------------------
# Block registry — which SGS block slugs actually exist
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=1)
def registered_block_slugs() -> frozenset[str]:
    """Return the set of `sgs/<name>` slugs that have a working implementation.

    Important (per Sonnet QC 2026-05-14): only `status='built'` blocks are
    routable. `status='planned'` blocks are spec stubs with no PHP/JS — if
    the converter emits them, WordPress will throw "this block contains
    unexpected or invalid content" in the editor. Planned slugs fall through
    to sgs/container in the converter, which is correct."""
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute("SELECT slug FROM blocks WHERE status = 'built'").fetchall()
    finally:
        conn.close()
    return frozenset(r[0] for r in rows)


def block_exists(slug: str) -> bool:
    """Return True if `slug` (e.g. 'sgs/product-card') is a registered block."""
    return slug in registered_block_slugs()


# ----------------------------------------------------------------------------
# Canonical slot lookup — element → canonical_slot via slot_synonyms
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=1)
def _slot_synonyms() -> dict[str, str]:
    """Return {alias_or_canonical: canonical_slot}. Includes self-mappings."""
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute("SELECT canonical_slot, aliases FROM slot_synonyms").fetchall()
    finally:
        conn.close()
    out: dict[str, str] = {}
    for canonical, aliases_json in rows:
        out[canonical] = canonical
        if aliases_json:
            import json
            try:
                for alias in json.loads(aliases_json):
                    out[alias] = canonical
            except (ValueError, TypeError):
                pass
    return out


@functools.lru_cache(maxsize=1)
def _slot_to_html_tag() -> dict[str, str]:
    """Return {canonical_slot: html_semantic_tag}."""
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute("SELECT canonical_slot, html_semantic_tag FROM slot_synonyms").fetchall()
    finally:
        conn.close()
    return {c: t for c, t in rows if t}


@functools.lru_cache(maxsize=1)
def _slot_to_standalone_block() -> dict[str, str]:
    """Return {canonical_slot: standalone_block_slug}.

    Source of truth for "this element-name routes to that block when the parent
    block doesn't claim the slot". Replaces the previous hardcoded
    SLOT_TO_STANDALONE_BLOCK dict in convert.py — synonym vocabulary AND
    standalone-block routing now both live in sgs-framework.db.slot_synonyms.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT canonical_slot, standalone_block FROM slot_synonyms "
            "WHERE standalone_block IS NOT NULL AND standalone_block != ''"
        ).fetchall()
    finally:
        conn.close()
    return {c: b for c, b in rows}


def standalone_block_for(canonical_slot: str) -> str | None:
    """Return the standalone block slug for a canonical slot, or None.

    e.g. 'label' → 'sgs/label', 'badge' → 'sgs/label', 'card' → 'sgs/info-box'.
    """
    return _slot_to_standalone_block().get(canonical_slot)


def _normalise(token: str) -> str:
    """Strip hyphens/underscores and lowercase. So 'max-width' == 'maxWidth' == 'max_width'.
    Per Bean's note 2026-05-14: multi-word attrs should auto-handle hyphen variants."""
    return re.sub(r"[-_]", "", token).lower()


def canonical_slot_for(token: str) -> str | None:
    """Resolve 'eyebrow' → 'label', 'description' → 'text', 'pack-size' → 'packSize'.
    Hyphen-insensitive, case-insensitive."""
    if not token:
        return None
    syn = _slot_synonyms()
    if token in syn:
        return syn[token]
    if token.lower() in syn:
        return syn[token.lower()]
    # Normalised match: max-width == maxWidth
    norm_target = _normalise(token)
    for key, val in syn.items():
        if _normalise(key) == norm_target:
            return val
    return None


def attr_name_for_slot_or_alias(block_slug: str, slot_or_alias: str) -> str | None:
    """Find the attr on `block_slug` whose canonical_slot OR attr_name itself
    matches `slot_or_alias` (hyphen/case-normalised). Returns the attr_name.

    e.g. attr_name_for_slot_or_alias('sgs/product-card', 'image') → 'image'
    e.g. attr_name_for_slot_or_alias('sgs/product-card', 'pack-sizes') → 'packSizes'
    e.g. attr_name_for_slot_or_alias('sgs/product-card', 'media') → 'image' (if canonical_slot='media' set)
    """
    norm_target = _normalise(slot_or_alias)
    # First pass: exact canonical_slot match
    for name, info in block_attrs(block_slug).items():
        cs = info.get("canonical_slot")
        if cs and (_normalise(cs) == norm_target or _normalise(name) == norm_target):
            return name
    # Second pass: by attr_name only (normalised)
    for name in block_attrs(block_slug):
        if _normalise(name) == norm_target:
            return name
    # Third pass: try the canonical of the input (e.g. 'eyebrow' → 'label')
    canonical = canonical_slot_for(slot_or_alias)
    if canonical and _normalise(canonical) != norm_target:
        for name, info in block_attrs(block_slug).items():
            if info.get("canonical_slot") and _normalise(info["canonical_slot"]) == _normalise(canonical):
                return name
            if _normalise(name) == _normalise(canonical):
                return name
    return None


def html_tag_for_slot(canonical_slot: str) -> str | None:
    """e.g. 'label' → 'span', 'heading' → 'h1', 'media' → 'img'."""
    return _slot_to_html_tag().get(canonical_slot)


# ----------------------------------------------------------------------------
# Modifier handling
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=1)
def _canonical_modifiers() -> dict[str, str]:
    """Return {modifier_lowercase: kind}. e.g. 'primary' → 'variant', 'hover' → 'state'."""
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute("SELECT suffix, kind FROM modifier_suffixes").fetchall()
    finally:
        conn.close()
    return {s.lower(): k for s, k in rows}


def modifier_kind(modifier: str) -> str | None:
    """e.g. 'primary' → 'variant', 'hover' → 'state', 'trial' → None (not canonical)."""
    return _canonical_modifiers().get(modifier.lower())


# ----------------------------------------------------------------------------
# Block attribute introspection — which attrs does a block have, and which slots?
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=256)
def block_attrs(block_slug: str) -> dict[str, dict]:
    """Return {attr_name: {role, canonical_slot, attr_type}} for a block."""
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT attr_name, attr_type, role, canonical_slot FROM block_attributes WHERE block_slug = ?",
            (block_slug,),
        ).fetchall()
    finally:
        conn.close()
    return {
        name: {"attr_type": t, "role": role, "canonical_slot": cs}
        for name, t, role, cs in rows
    }


def attr_for_slot(block_slug: str, canonical_slot: str) -> str | None:
    """Find the attr_name on `block_slug` whose canonical_slot matches.

    e.g. attr_for_slot('sgs/cta-section', 'heading') → 'headline' (or similar).
    Returns None if the block doesn't own that slot.
    """
    for name, info in block_attrs(block_slug).items():
        if info.get("canonical_slot") == canonical_slot:
            return name
    return None


# ----------------------------------------------------------------------------
# Block parent/child relationship — for InnerBlocks containers
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=256)
def parent_block_for(child_slug: str) -> str | None:
    """If `child_slug` has a registered parent, return it. e.g. sgs/button
    might have parent sgs/multi-button. Currently rows have parent_block=None
    for all — InnerBlocks relationships live in block.json."""
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT parent_block FROM blocks WHERE slug = ?", (child_slug,)
        ).fetchone()
    finally:
        conn.close()
    return row[0] if row and row[0] else None


# ----------------------------------------------------------------------------
# CSS property → SGS attr suffix mapping (DB-driven, replaces hardcoded dict)
# ----------------------------------------------------------------------------

# Suffix → kind override for cases where the suffix name carries kind semantics
# the role column doesn't distinguish. Empty → fall through to role-based inference.
_KIND_BY_SUFFIX: dict[str, str] = {
    "LineHeight":    "number_unitless",
    "LetterSpacing": "number_px_or_em",
    # String-typed enums/keywords (defeat the role-based "number_px" default)
    "FontFamily":      "string",
    "FontWeight":      "string",
    "TextTransform":   "string",
    "TextAlign":       "string",
    "TextDecoration":  "string",
    "ObjectFit":       "string",
    "ObjectPosition":  "string",
    "BorderStyle":     "string",
    "BoxShadow":       "string",   # composite value or token ref
    "Easing":          "string",   # transition-timing-function: cubic-bezier(...) / ease
    "Columns":         "string",   # grid-template-columns: '1fr 1fr' etc.
    "AspectRatio":     "string",   # '16/9' syntax
    "Style":           "string",
    "Variant":         "string",
    "Alignment":       "string",
}


def _kind_for(suffix: str, role: str | None) -> str | None:
    """Infer the convert.py 'kind' for a property_suffixes row.

    Returns one of: 'colour', 'number_px', 'number_unitless', 'number_px_or_em',
    'string'. Returns None for rows that shouldn't be lifted via CSS (behaviour,
    select-from-enum, content roles — these aren't CSS-driven).
    """
    if suffix in _KIND_BY_SUFFIX:
        return _KIND_BY_SUFFIX[suffix]
    if role == "color" or any(t in suffix for t in ("Colour", "Color", "Background", "Foreground")):
        return "colour"
    if role in ("layout", "typography", "visual", "spacing", "shadow", "motion", "number-css-px"):
        return "number_px"
    if role == "number-css-percent":
        return "number_px"  # we strip the unit either way
    # Roles that aren't CSS-lifted (content, behaviour, enum-class-probe, etc.)
    return None


@functools.lru_cache(maxsize=1)
def css_property_suffixes() -> list[tuple[str, str, str]]:
    """Return list of (css_property, suffix, kind) tuples from property_suffixes
    table, filtered to rows where:
      - css_property IS NOT NULL (skip 'Style'/'Variant' etc. with no CSS prop)
      - kind can be inferred (skip behaviour/select-from-enum rows that aren't CSS-driven)

    Replaces the hardcoded _CSS_PROP_TO_SUFFIX dict in convert.py. The DB is
    canonical; this function is the single read path.

    The same CSS property may map to multiple suffixes (e.g. color → both
    'Colour' and 'Color'). Caller iterates the full list and tries each suffix
    in turn — _try_set() drops rows where the suffix doesn't exist in the
    target block's schema.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT suffix, css_property, role FROM property_suffixes "
            "WHERE css_property IS NOT NULL AND css_property != ''"
        ).fetchall()
    finally:
        conn.close()
    out: list[tuple[str, str, str]] = []
    for suffix, css_prop, role in rows:
        kind = _kind_for(suffix, role)
        if kind is None:
            continue
        out.append((css_prop, suffix, kind))
    return out


# ----------------------------------------------------------------------------
# Breakpoint suffix vocabulary (DB-driven, replaces hardcoded _BREAKPOINT_SUFFIXES)
# ----------------------------------------------------------------------------

# Standard breakpoint marker → [suffixes to try, in priority order]. Tablet+Desktop
# both fire for min-width: 768 because most mockups have only one breakpoint and
# the converter wants to populate both responsive attrs from that single rule.
# This mapping is convention, not data — the DB has the suffix vocabulary; this
# function maps @media query breakpoints to which suffixes those queries apply to.
_BREAKPOINT_RULES: list[tuple[str, list[str]]] = [
    ("min-width: 768",  ["Tablet", "Desktop"]),
    ("min-width: 1024", ["Desktop"]),
    ("min-width: 1280", ["Desktop"]),
    ("max-width: 767",  ["Mobile"]),
    ("max-width: 640",  ["Mobile"]),
]


@functools.lru_cache(maxsize=1)
def breakpoint_suffix_rules() -> list[tuple[str, list[str]]]:
    """Return the breakpoint marker → suffix-list mapping for CSS @media parsing.

    The suffix vocabulary is DB-canonical via modifier_suffixes (kind='breakpoint');
    this function pairs each breakpoint marker with the suffixes from that vocabulary
    that should be populated when the marker matches. Verifies at module load
    that every suffix referenced here exists in the DB's modifier_suffixes table.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        db_suffixes = {
            s for (s,) in conn.execute(
                "SELECT suffix FROM modifier_suffixes WHERE kind = 'breakpoint'"
            ).fetchall()
        }
    finally:
        conn.close()
    # Verify the convention rules only reference suffixes that exist in the DB
    for marker, suffixes in _BREAKPOINT_RULES:
        for sfx in suffixes:
            if sfx not in db_suffixes:
                raise RuntimeError(
                    f"breakpoint_suffix_rules: marker {marker!r} references "
                    f"suffix {sfx!r} not in modifier_suffixes (kind='breakpoint'). "
                    f"DB has {sorted(db_suffixes)}. Run /sgs-update to refresh."
                )
    return _BREAKPOINT_RULES


# ----------------------------------------------------------------------------
# Smoke test
# ----------------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    print("== block_exists ==")
    for s in ["sgs/container", "sgs/product-card", "sgs/button", "sgs/multi-button",
              "sgs/featured-product", "sgs/banana"]:
        print(f"  {s:30} -> {block_exists(s)}")
    print("\n== parse_sgs_bem ==")
    for c in ["sgs-featured-product", "sgs-product-card__body",
              "sgs-button--primary", "sgs-gift-section__card--trial",
              "sgs-section-heading__label"]:
        print(f"  {c:40} -> {parse_sgs_bem(c)}")
    print("\n== canonical_slot_for ==")
    for t in ["eyebrow", "label", "headline", "description", "pill",
              "subHeadline", "cta", "trial"]:
        print(f"  {t:20} -> {canonical_slot_for(t)}")
    print("\n== modifier_kind ==")
    for m in ["primary", "hover", "tablet", "trial", "active"]:
        print(f"  {m:15} -> {modifier_kind(m)}")
    print("\n== block_attrs(sgs/container) sample ==")
    for a, info in list(block_attrs("sgs/container").items())[:5]:
        print(f"  {a:25} -> {info}")