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