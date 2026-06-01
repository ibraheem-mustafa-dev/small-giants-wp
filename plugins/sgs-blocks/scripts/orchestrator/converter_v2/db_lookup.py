"""db_lookup.py — DB-backed canonical lookups for the converter.

Replaces the hardcoded CLASS_TO_BLOCK table in convert.py with live queries
against the Phase-1-frozen vocabularies in sgs-framework.db:

  - blocks                  : registered SGS block slugs
  - slots                   : unified slot→block mapping (element + section scope).
                               Replaces retired slot_synonyms + legacy_role_lookup.
                               D99 2026-05-29. PK: (slot_name, scope).
  - roles                   : role-name → classification catalogue (D99 2026-05-29).
                               Replaces slot_synonyms.role_classification column.
                               Fixes link-href bug: classification now lives here,
                               not on slot rows (which never had a link-href row).
  - modifier_suffixes       : Primary/Hover/Mobile/etc.
  - property_suffixes       : Padding/Margin/FontSize/etc. + kind_override column.
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


# ----------------------------------------------------------------------------
# Idempotent schema migration — `roles` table (D99 2026-05-29)
# ----------------------------------------------------------------------------
# D99 replaces slot_synonyms.role_classification with a standalone `roles`
# table. This removes the coupling between slot data and role-classification
# data, and closes the link-href bug (slot_synonyms never had a row with
# role='link-href', so the old column-based migration never seeded it).
#
# The `roles` table ships 20 rows seeded from _ROLE_CLASSIFICATION_MAP.
# INSERT OR REPLACE ensures the seed dict updates propagate on every module
# load (unlike the old INSERT OR IGNORE which froze initial values).
#
# Permitted classifications (CHECK constraint in DB schema):
#   - 'content-bearing'    — role routes content via block-equivalence
#   - 'styling-behaviour'  — role is a scalar styling/behaviour attr
#   - 'unclassified'       — role NULL or otherwise not yet classified
#
# Runtime callers query this table via _content_bearing_roles() and
# _styling_behaviour_roles() below. _ROLE_CLASSIFICATION_MAP is the seed
# source only — never a runtime lookup dict (R-22-1).
_ROLE_CLASSIFICATION_MAP: dict[str, str] = {
    # Content-bearing roles (5 total — includes link-href, previously missing)
    "text-content":         "content-bearing",
    "image-object":         "content-bearing",
    "content":              "content-bearing",
    "link-href":            "content-bearing",
    "identity":             "content-bearing",
    # Styling / behaviour roles (15 total)
    "typography":           "styling-behaviour",
    "color":                "styling-behaviour",
    "colour-gradient":      "styling-behaviour",
    "colour-text":          "styling-behaviour",
    "spacing-token":        "styling-behaviour",
    "number-css-px":        "styling-behaviour",
    "number-css-percent":   "styling-behaviour",
    "layout":               "styling-behaviour",
    "motion":               "styling-behaviour",
    "visual":               "styling-behaviour",
    "behaviour":            "styling-behaviour",
    "boolean-visibility":   "styling-behaviour",
    "select-from-enum":     "styling-behaviour",
    "enum-class-probe":     "styling-behaviour",
    "query-descriptor":     "styling-behaviour",
    # FR-22-19 composite scalar-media (2026-06-01): foreground images that a
    # composite block renders through its own scalar pipeline (art-direction,
    # srcset, object-fit, bleed, responsive show/hide authored in render.php).
    # Classification 'styling-behaviour' → equivalent_block_for() returns None →
    # the walker does NOT emit a sgs/media child; instead _route_composite_interior
    # lifts the img into the block's scalar attr (e.g. splitImage/splitImageMobile).
    # Roster (DB-audit-verified 2026-06-01): sgs/hero.splitImage,
    # sgs/hero.splitImageMobile, sgs/testimonial-slider.sideImage.
    "scalar-media":         "styling-behaviour",
}


def _migrate_roles_table() -> None:
    """Idempotent migration: create `roles` table if absent and seed from
    _ROLE_CLASSIFICATION_MAP using INSERT OR REPLACE.

    INSERT OR REPLACE (not OR IGNORE) means updates to the seed dict above
    propagate to the DB on every module load. This is intentional — the dict
    is the canonical source for the 20 entries defined at spec time; the DB
    is the authoritative runtime query target. Honours R-22-1.

    Safe to call repeatedly. Runs at module load.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS roles (
              role_name      TEXT PRIMARY KEY,
              classification TEXT NOT NULL CHECK (classification IN
                             ('content-bearing','styling-behaviour','unclassified')),
              description    TEXT,
              created_at     TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        for role_name, classification in _ROLE_CLASSIFICATION_MAP.items():
            conn.execute(
                "INSERT OR REPLACE INTO roles (role_name, classification) VALUES (?, ?)",
                (role_name, classification),
            )
        conn.commit()
    except sqlite3.OperationalError:
        # DB read-only / locked / missing — soft-fail. Callers fall back to
        # empty-frozenset / unclassified-default behaviour.
        pass
    finally:
        conn.close()


# Run migration at module load (idempotent).
_migrate_roles_table()


# ----------------------------------------------------------------------------
# Idempotent schema migration — html_tag_to_core_block
# ----------------------------------------------------------------------------
# Spec 22 §14 Appendix B / R-22-1 (2026-05-28 hardening): the bridge between
# HTML primitive tags and canonical WordPress core block slugs moves out of
# a hardcoded Python dict into a DB table. Runtime path (atomic_tag_map()
# below) queries the DB ONLY.
#
# Mapping rationale:
#   - HTML semantics are an external standard (HTML living spec). The seed
#     below encodes that standard once, at migration time, into the DB.
#   - Per-runtime callers never read this Python dict — they query
#     html_tag_to_core_block via the public atomic_tag_map() helper.
#   - This mirrors the _ROLE_CLASSIFICATION_MAP precedent above: code-level
#     dict is one-time-seed data, never runtime routing.
_HTML_TAG_TO_CORE_BLOCK_SEED: dict[str, tuple[str, str]] = {
    # html_tag: (core_block_slug, note)
    "h1": ("core/heading", "Heading level 1 — atomic walker fallback"),
    "h2": ("core/heading", "Heading level 2"),
    "h3": ("core/heading", "Heading level 3"),
    "h4": ("core/heading", "Heading level 4"),
    "h5": ("core/heading", "Heading level 5"),
    "h6": ("core/heading", "Heading level 6"),
    "p":  ("core/paragraph", "Paragraph text"),
    "img": ("core/image", "Image — atomic media leaf"),
    "hr":  ("core/separator", "Horizontal rule — divider"),
    "button": ("core/button",
               "Bare button — Bean directive 2026-05-28: walker auto-wraps in sgs/multi-button"),
    "a":   ("core/button", "Link shape — routes to same atomic leaf as button"),
    "blockquote": ("core/quote", "Quote block"),
    "ul":  ("core/list", "Unordered list — atomic leaf"),
    "ol":  ("core/list", "Ordered list — same routing as ul at atomic level"),
}


def _migrate_html_tag_to_core_block() -> None:
    """Idempotent migration: create html_tag_to_core_block table if absent
    and populate it from _HTML_TAG_TO_CORE_BLOCK_SEED.

    Safe to call repeatedly. Runs at module load. Honours R-22-1: the seed
    dict above is one-time migration data, NOT runtime lookup — atomic_tag_map()
    queries the DB table only.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS html_tag_to_core_block ("
            "  html_tag TEXT PRIMARY KEY,"
            "  core_block_slug TEXT NOT NULL,"
            "  note TEXT,"
            "  created_at TEXT DEFAULT CURRENT_TIMESTAMP"
            ")"
        )
        # INSERT OR REPLACE — propagates seed-dict updates on module re-load.
        # D99 2026-05-29 (Fix 3): changed from INSERT OR IGNORE so that when
        # _HTML_TAG_TO_CORE_BLOCK_SEED entries are updated, the DB picks up
        # the new values automatically without manual row edits.
        for html_tag, (core_slug, note) in _HTML_TAG_TO_CORE_BLOCK_SEED.items():
            conn.execute(
                "INSERT OR REPLACE INTO html_tag_to_core_block "
                "(html_tag, core_block_slug, note) VALUES (?, ?, ?)",
                (html_tag, core_slug, note),
            )
        conn.commit()
    except sqlite3.OperationalError:
        # DB read-only / locked / missing — soft-fail. atomic_tag_map() then
        # returns an empty dict; walker callers must handle the empty-map case.
        pass
    finally:
        conn.close()


# Run migration at module load (idempotent).
_migrate_html_tag_to_core_block()


# ----------------------------------------------------------------------------
# Trace emitter (debug-trace evidence chain)
# ----------------------------------------------------------------------------
# Mirrors the pattern in convert.py. set_trace() is called by convert.py's
# set_trace() so both modules emit into the same per-section trace file.
_TRACE = None  # type: ignore[assignment]
_TRACE_BOUNDARY = ""


def set_trace(tr, boundary_id: str = "") -> None:
    """Bind a per-section Trace + boundary tag. Pass tr=None to disable."""
    global _TRACE, _TRACE_BOUNDARY
    _TRACE = tr
    _TRACE_BOUNDARY = boundary_id or ""


def _trace(stage: str, **kwargs) -> None:
    """Soft-fail trace emission. No-op when no trace is bound."""
    if _TRACE is None:
        return
    try:
        kwargs.setdefault("boundary_id", _TRACE_BOUNDARY)
        _TRACE.event(stage=stage, **kwargs)
    except Exception:  # noqa: BLE001 — never break the converter
        pass


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
# Canonical slot lookup — element → canonical_slot via `slots` table
# (D99 2026-05-29: was slot_synonyms; now slots WHERE scope='element')
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=1)
def _slot_synonyms() -> dict[str, str]:
    """Return {alias_or_canonical: canonical_slot} for element-scope slots.

    D99: queries `slots WHERE scope='element'` (was slot_synonyms).
    Includes self-mappings so canonical names resolve to themselves.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT slot_name, aliases FROM slots WHERE scope='element'"
        ).fetchall()
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
def _slot_to_standalone_block() -> dict[str, str]:
    """Return {canonical_slot: standalone_block_slug} for element-scope slots.

    Source of truth for "this element-name routes to that block when the parent
    block doesn't claim the slot". D99: queries `slots WHERE scope='element'`
    (was slot_synonyms.standalone_block).
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT slot_name, standalone_block FROM slots "
            "WHERE scope='element' AND standalone_block IS NOT NULL AND standalone_block != ''"
        ).fetchall()
    finally:
        conn.close()
    return {c: b for c, b in rows}


def standalone_block_for(canonical_slot: str) -> str | None:
    """Return the standalone block slug for a canonical slot, or None.

    e.g. 'label' → 'sgs/label', 'badge' → 'sgs/label', 'card' → 'sgs/info-box'.
    """
    result = _slot_to_standalone_block().get(canonical_slot)
    if result is None and canonical_slot:
        _trace("db_lookup_miss", lookup="standalone_block_for",
               canonical_slot=canonical_slot)
    return result


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
    _trace("db_lookup_miss", lookup="canonical_slot_for", token=token)
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
    """Return None — html_semantic_tag column retired in D99 (2026-05-29).

    slot_synonyms.html_semantic_tag was low-value (only 27/89 rows populated)
    and was NOT consulted by atomic_tag_map() (see that function's docstring
    for the rationale). The column is not present in the unified `slots` table.

    Callers should route via atomic_tag_map() for html-canonical tag→block
    resolution instead of per-slot html_semantic_tag hints.
    """
    return None


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
    result = {
        name: {"attr_type": t, "role": role, "canonical_slot": cs}
        for name, t, role, cs in rows
    }
    if not result:
        _trace("db_lookup_miss", lookup="block_attrs", block_slug=block_slug)
    return result


@functools.lru_cache(maxsize=256)
def get_block_composition_role(block_slug: str) -> str | None:
    """Return composition_role from block_composition table for a block.

    XS-3 refined trigger (2026-05-31): queries block_composition to determine
    if a block is a section-root, wrapper-shell, content-block, or leaf.
    Used by the refined layout-bearing wrapper detection to check parent's role.

    Args:
        block_slug: Fully-qualified SGS slug, e.g. 'sgs/hero'.

    Returns:
        One of 'section-root', 'wrapper-shell', 'content-block', 'leaf',
        or None if the block does not exist in the table.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT composition_role FROM block_composition WHERE block_slug = ?",
            (block_slug,),
        ).fetchone()
    except sqlite3.OperationalError:
        # Table absent (pre-D108 state) — soft-fail to None
        row = None
    finally:
        conn.close()
    if row:
        _trace("db_lookup_hit", lookup="get_block_composition_role",
               block_slug=block_slug, composition_role=row[0])
        return row[0]
    _trace("db_lookup_miss", lookup="get_block_composition_role",
           block_slug=block_slug)
    return None


def attr_for_slot(block_slug: str, canonical_slot: str) -> str | None:
    """Find the attr_name on `block_slug` whose canonical_slot matches.

    e.g. attr_for_slot('sgs/cta-section', 'heading') → 'headline' (or similar).
    Returns None if the block doesn't own that slot.
    """
    for name, info in block_attrs(block_slug).items():
        if info.get("canonical_slot") == canonical_slot:
            return name
    _trace("db_lookup_miss", lookup="attr_for_slot",
           block_slug=block_slug, canonical_slot=canonical_slot)
    return None


# ----------------------------------------------------------------------------
# Block supports — wp native supports flags (color/spacing/border/typography...)
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=256)
def block_supports_for(block_slug: str) -> dict:
    """Return the parsed WordPress `supports` map for a block, keyed by support_name.

    Reads sgs-framework.db `block_supports` (block_slug, support_name, support_value).
    Each support_value is parsed as JSON when it's an object/array, otherwise the
    literal string is returned. Used by the converter to gate which `style.*`
    properties may be emitted on the block when lifting block-root CSS.

    Example return for sgs/info-box:
        {
            "color":                 {"background": True, "text": True, "link": True},
            "typography":            {"fontSize": True, "lineHeight": True, ...},
            "spacing":               {"margin": True, "padding": True},
            "shadow":                True,
            "__experimentalBorder":  {"radius": True, "width": True, "color": True, "style": True},
            ...
        }
    """
    import json
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT support_name, support_value FROM block_supports WHERE block_slug = ?",
            (block_slug,),
        ).fetchall()
    finally:
        conn.close()
    out: dict = {}
    for name, value in rows:
        if value is None:
            continue
        v = value.strip()
        # Parse JSON objects/arrays/bools/numbers — fall back to raw string
        if v.startswith(("{", "[")) or v in ("true", "false", "null") or (v and v[0].isdigit()):
            try:
                out[name] = json.loads(v)
                continue
            except (ValueError, TypeError):
                pass
        out[name] = v
    return out


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
# Block capabilities — DB-driven semantic tags per block
# ----------------------------------------------------------------------------
# Capability tags (e.g. 'icon-text', 'carousel', 'grid-layout', 'expandable')
# are stored in the `block_capabilities` table, seeded by
# `~/.claude/skills/sgs-wp-engine/scripts/populate-db.py:CAPABILITY_RULES`.
# The pipeline consumes them via two helpers:
#   - capabilities_for(slug) — return all tags for a specific block
#   - blocks_with_capability(cap) — return all slugs that carry a tag
#
# Primary current use: capability-aware tiebreaking inside
# `_resolve_slug_from_bem_tuple` Path 1 when two or more bare-block BEM classes
# both resolve to registered slugs on the same DOM node. Alphabetical-first was
# the previous tiebreaker; capability-priority lets the pipeline pick the
# semantically richer block (e.g. `sgs/testimonial-slider` over `sgs/container`
# when both BEM classes are present on a social-proof section root).
#
# Capability priority order (ascending specificity — highest specificity first):
_CAPABILITY_PRIORITY: list[str] = [
    # Highly specific structural blocks (most specific → wins tiebreak)
    "modal-popup",
    "pricing",
    "team-display",
    "tabbed-content",
    "expandable",
    "faq",
    "schema-faq",
    "question-answer",
    "carousel",
    "form-input",
    "rating",
    "social-proof",
    "icon-text",
    "grid-layout",
    "image-overlay",
    "full-width-banner",
    "call-to-action",
    "cta",
    "action-button",
    "conversion",
    "navigation",
    "countdown",
    "time-limited",
    "notification",
    "alert",
    "dismissible",
    "floating-element",
    "process-display",
    "steps",
    "certification-display",
    "logo-strip",
    "partner-logos",
    "horizontal-strip",
    "trust-indicators",
    "social-links",
    "heritage-story",
    "about-section",
    "animated-numbers",
    "decorative",
]


@functools.lru_cache(maxsize=256)
def capabilities_for(block_slug: str) -> frozenset[str]:
    """Return the set of capability tags for `block_slug` from the DB.

    e.g. capabilities_for('sgs/accordion') → frozenset({'expandable', 'faq',
         'schema-faq', 'question-answer'})
    e.g. capabilities_for('sgs/unknown')  → frozenset()

    Queries `block_capabilities` table in sgs-framework.db. LRU-cached per slug.
    Safe to call per-node in the walker — the cache eliminates DB round-trips on
    repeated calls for the same slug within a section.

    R-22-1 compliance: no hardcoded slug→capability mapping in code. All data
    lives in the DB; this function is the single read path. The CAPABILITY_RULES
    dict in populate-db.py is one-time-seed data only.

    Args:
        block_slug: Fully-qualified SGS slug, e.g. 'sgs/accordion'.

    Returns:
        frozenset of capability tag strings. Empty frozenset if the block has
        none or does not exist in the table.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT capability FROM block_capabilities WHERE block_slug = ?",
            (block_slug,),
        ).fetchall()
    except sqlite3.OperationalError:
        # Table absent (first-run before populate-db.py) — soft-fail to empty.
        rows = []
    finally:
        conn.close()
    return frozenset(r[0] for r in rows)


@functools.lru_cache(maxsize=64)
def blocks_with_capability(capability: str) -> frozenset[str]:
    """Return the set of block slugs that carry `capability`.

    e.g. blocks_with_capability('carousel') → frozenset({'sgs/testimonial-slider',
         'sgs/brand-strip'})
    e.g. blocks_with_capability('unknown') → frozenset()

    Queries `block_capabilities` table. LRU-cached per capability tag.
    Intended for pattern-generation and diagnostic tooling — not hot-path during
    section walks (use capabilities_for() for per-node lookups instead).

    R-22-1 compliance: DB-only read path.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT block_slug FROM block_capabilities WHERE capability = ?",
            (capability,),
        ).fetchall()
    except sqlite3.OperationalError:
        rows = []
    finally:
        conn.close()
    return frozenset(r[0] for r in rows)


def _capability_rank(block_slug: str) -> int:
    """Return a capability-priority rank for `block_slug` (lower = higher priority).

    Used as a tiebreaker sort key inside `_resolve_slug_from_bem_tuple` Path 1.
    Blocks with more semantically specific capabilities rank ahead of generic
    primitives like `sgs/container`.

    Algorithm:
      - Compute each capability's index in _CAPABILITY_PRIORITY (first-occurrence).
      - Return the MINIMUM index across all capabilities (most-specific tag wins).
      - If the block has no capabilities (empty), return len(_CAPABILITY_PRIORITY) + 1
        so it sorts AFTER all capability-bearing blocks but still deterministically.
      - Ties in capability rank fall back to alphabetical slug order (caller sorts
        by (rank, slug) to guarantee determinism).
    """
    caps = capabilities_for(block_slug)
    if not caps:
        return len(_CAPABILITY_PRIORITY) + 1
    priority_index = len(_CAPABILITY_PRIORITY)  # default: treat as unknown
    for cap in caps:
        try:
            idx = _CAPABILITY_PRIORITY.index(cap)
            priority_index = min(priority_index, idx)
        except ValueError:
            pass  # capability not in priority list — treated as generic
    return priority_index


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


# ----------------------------------------------------------------------------
# Idempotent schema migration — property_suffixes.kind_override (D99 2026-05-29)
# ----------------------------------------------------------------------------
# Fix 4: _KIND_BY_SUFFIX dict (17 entries, defined above) moves into the DB as
# a `kind_override` column on property_suffixes. Honours R-22-1 (DB-first,
# no hardcoded dicts; blub.db row 260).
#
# _KIND_BY_SUFFIX is the ONE-TIME SEED source. _kind_for() queries DB first;
# the role-based fallback covers suffixes not yet in property_suffixes.
#
# UPDATE uses `WHERE kind_override IS NULL` to preserve manual operator
# overrides — idempotent re-runs are no-ops for already-populated rows.


def _migrate_property_suffixes_kind_override() -> None:
    """Idempotent migration: add property_suffixes.kind_override column if absent
    and seed from _KIND_BY_SUFFIX.

    Safe to call repeatedly. Runs at module load.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(property_suffixes)").fetchall()}
        if "kind_override" not in cols:
            conn.execute("ALTER TABLE property_suffixes ADD COLUMN kind_override TEXT")
        # UPDATE only NULL rows — preserves manual overrides set after seeding.
        for suffix, kind in _KIND_BY_SUFFIX.items():
            conn.execute(
                "UPDATE property_suffixes SET kind_override = ? "
                "WHERE suffix = ? AND kind_override IS NULL",
                (kind, suffix),
            )
        conn.commit()
    except sqlite3.OperationalError:
        pass
    finally:
        conn.close()


# Run migration at module load (idempotent — safe to call repeatedly).
_migrate_property_suffixes_kind_override()


# ----------------------------------------------------------------------------
# Idempotent schema migration — variant detection (FR-22-20, D133 2026-06-01)
# ----------------------------------------------------------------------------
# Universal variant detection (Spec 22 §FR-22-20) needs two schema additions:
#   - blocks.variant_attr  — names the variant-selector attr per block (e.g.
#     'variant', 'variantStyle', 'layout') so the converter never guesses it.
#     Populated by /sgs-update Stage 1 from block.json supports.sgs.variantAttr.
#   - variant_slots table  — (block_slug, variant_value, unique_slot) storing
#     each variant's DISCRIMINATING slots (set-difference vs sibling variants).
#     Populated by /sgs-update Stage 1 from block.json supports.sgs.variants.
#
# This migration is pure schema (additive, no data). Population is a /sgs-update
# responsibility, so there is no seed dict here (R-22-1 dict-as-seed N/A).
#
# Safe to call repeatedly. Runs at module load.
def _migrate_variant_detection_schema() -> None:
    """Idempotent migration: add blocks.variant_attr column + create the
    variant_slots table if absent. Schema only — no data seeding.

    Safe to call repeatedly. Runs at module load.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(blocks)").fetchall()}
        if "variant_attr" not in cols:
            conn.execute("ALTER TABLE blocks ADD COLUMN variant_attr TEXT")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS variant_slots (
              block_slug    TEXT NOT NULL,
              variant_value TEXT NOT NULL,
              unique_slot   TEXT NOT NULL,
              created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (block_slug, variant_value, unique_slot)
            )
        """)
        conn.commit()
    except sqlite3.OperationalError:
        # DB read-only / locked / missing — soft-fail. Variant detection then
        # no-ops (variant_attr_for returns None → detector skips).
        pass
    finally:
        conn.close()


# Run migration at module load (idempotent — safe to call repeatedly).
_migrate_variant_detection_schema()


def _kind_for(suffix: str, role: str | None) -> str | None:
    """Infer the convert.py 'kind' for a property_suffixes row.

    Returns one of: 'colour', 'number_px', 'number_unitless', 'number_px_or_em',
    'string'. Returns None for rows that shouldn't be lifted via CSS (behaviour,
    select-from-enum, content roles — these aren't CSS-driven).

    D99 2026-05-29 (Fix 4): queries property_suffixes.kind_override FIRST
    (R-22-1 — DB-first, no hardcoded dicts). Falls through to role-based
    inference for suffixes not covered by the DB column. _KIND_BY_SUFFIX is
    retained as the seed source for _migrate_property_suffixes_kind_override()
    but is no longer the runtime lookup path.

    Wave 2 Change 3 (2026-05-22): added 'colour-gradient', 'select-from-enum',
    'spacing-token' to the lifted set. Schema evidence (blub.db 272):
      - colour-gradient: suffix='Gradient', css_property='background-image' — URL-valued
      - select-from-enum: suffix='FontStyle', css_property='font-style' — string enum
      - spacing-token: suffix='BlockGap', css_property='gap' — numeric px value
      - spacing-token: suffix='Spacing', css_property='padding/margin (preset)' — skipped
        (multi-property; no single CSS prop to match)
    """
    # DB-first (R-22-1): query kind_override column seeded from _KIND_BY_SUFFIX.
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT kind_override FROM property_suffixes WHERE suffix = ?", (suffix,)
        ).fetchone()
    except sqlite3.OperationalError:
        row = None
    finally:
        conn.close()
    if row and row[0]:
        return row[0]
    # Fall through to role-based inference for suffixes not in the DB.
    if role == "color" or any(t in suffix for t in ("Colour", "Color", "Background", "Foreground")):
        return "colour"
    if role in ("layout", "typography", "visual", "spacing", "shadow", "motion", "number-css-px"):
        return "number_px"
    if role == "number-css-percent":
        return "number_px"  # we strip the unit either way
    # Wave 2 Change 3: lift additional CSS-driven roles that previously returned None
    if role == "colour-gradient":
        return "string"  # background-image: url(...) or gradient string
    if role == "select-from-enum":
        return "string"  # e.g. font-style: italic/normal
    if role == "spacing-token" and suffix == "BlockGap":
        return "number_px"  # gap: Npx — single CSS property, safe to lift
    # spacing-token/Spacing maps to multi-property (padding + margin preset) — not CSS-lifted
    # Roles that aren't CSS-lifted (content, behaviour, etc.)
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
# D3 — Attribute gap candidate helpers
# ----------------------------------------------------------------------------

def propose_attr_name(block_slug: str, css_property: str, source_class: str) -> str:
    """Derive a sensible proposed attribute name for a CSS property that has no
    matching typed attr on ``block_slug``.

    Algorithm (DB-first per Rule 11):
      1. Look up the CSS property in ``property_suffixes`` to get the canonical
         suffix (e.g. ``letter-spacing`` → ``LetterSpacing``).
      2. Parse ``source_class`` as SGS-BEM to extract the slot/element name
         (e.g. ``.sgs-hero__label`` → element ``label``).
      3. Resolve the element through ``slot_synonyms`` to a canonical slot
         (e.g. ``label`` → ``label``).
      4. Combine: ``{slot}{Suffix}`` (e.g. ``labelLetterSpacing``).

    Fallback chain:
      - If no suffix in DB → use camelCase of the CSS property itself.
      - If no slot from BEM parse → use ``block`` (bare suffix on the block root).
      - Strip any leading ``sgs-`` and the block name portion from the slot so
        proposals use the slot short-form only (``label``, not ``hero-label``).
    """
    # Step 1: suffix from property_suffixes
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT suffix FROM property_suffixes "
            "WHERE css_property = ? AND css_property IS NOT NULL "
            "ORDER BY rowid LIMIT 1",
            (css_property,),
        ).fetchone()
    finally:
        conn.close()

    if row:
        suffix = row[0]  # e.g. "LetterSpacing", "Colour", "FontSize"
    else:
        # Fallback: camelCase the CSS property ("letter-spacing" → "LetterSpacing")
        parts = css_property.split("-")
        suffix = parts[0] + "".join(p.title() for p in parts[1:])
        # Capitalise first letter to match SGS naming convention (PascalCase suffix)
        suffix = suffix[0].upper() + suffix[1:] if suffix else css_property

    # Step 2+3: slot from BEM parse of source_class
    bem = parse_sgs_bem(source_class.lstrip("."))
    slot: str = ""
    if bem and bem.element:
        canonical = canonical_slot_for(bem.element)
        slot = canonical if canonical else bem.element
    elif bem and bem.block:
        # Source class is a block root (no element) — slot is the block itself
        slot = ""  # bare suffix on the block root: e.g. "LetterSpacing"

    # Step 4: compose the proposed attr name
    if slot:
        # camelCase the slot (it's already lowercase from DB; capitalise first letter)
        slot_camel = slot[0].lower() + slot[1:]
        return f"{slot_camel}{suffix}"
    # No slot — bare suffix form (rare: block-root styling attr)
    # Lowercase first char to get camelCase: "LetterSpacing" → "letterSpacing"
    return suffix[0].lower() + suffix[1:] if suffix else css_property


def write_attribute_gap_candidate(
    block_slug: str,
    css_property: str,
    raw_value: str,
    source_class: str,
    source_run_id: str,
    proposed_attr: str | None = None,
) -> None:
    """Insert (or ignore duplicate) row into ``attribute_gap_candidates``.

    Maps the FR6 idealised columns onto the actual table schema:
      - ``attr_name``        ← proposed attribute name (derived via propose_attr_name)
      - ``stem``             ← css_property  (repurposed: carries the CSS property)
      - ``proposed_action``  ← context string with raw_value + source_class + run_id

    UNIQUE constraint: ``(block_slug, attr_name)`` — same proposed attr on the
    same block only inserts once regardless of how many times the run encounters it.
    Different raw values or source classes for the SAME proposed attr are collapsed
    (first-writer wins). Use INSERT OR IGNORE to enforce idempotency without errors.
    """
    if not proposed_attr:
        proposed_attr = propose_attr_name(block_slug, css_property, source_class)

    proposed_action = (
        f"add attr: css={css_property} "
        f"raw={raw_value!r} "
        f"class={source_class} "
        f"run={source_run_id}"
    )

    conn = sqlite3.connect(SGS_DB)
    try:
        conn.execute(
            """
            INSERT OR IGNORE INTO attribute_gap_candidates
                (block_slug, attr_name, stem, proposed_action)
            VALUES (?, ?, ?, ?)
            """,
            (block_slug, proposed_attr, css_property, proposed_action),
        )
        conn.commit()
    finally:
        conn.close()


# ----------------------------------------------------------------------------
# Legacy role lookup — kebab-semantic class → SGS slug (DB-driven)
# D99 2026-05-29: queries `slots WHERE scope='section'` (was legacy_role_lookup).
# The legacy_role_lookup table has been retired and its 16 rows migrated to
# slots with scope='section'. Consumer API is unchanged.
# ----------------------------------------------------------------------------

# Module-level cache populated on first call. Avoids repeated DB round-trips
# across multiple sections in a single run.
_LEGACY_ROLE_CACHE: dict[str, str] | None = None


def _load_legacy_role_cache() -> dict[str, str]:
    """Query section-scope slots and return {slot_name: standalone_block}.

    D99: queries `slots WHERE scope='section'` (was legacy_role_lookup).
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT slot_name, standalone_block FROM slots WHERE scope='section'"
        ).fetchall()
    except sqlite3.OperationalError:
        # Table not yet created (pre-D99 DB). Soft-fail to empty.
        rows = []
    finally:
        conn.close()
    return {slot: block for slot, block in rows if block}


def legacy_role_lookup_for(kebab_role: str) -> str | None:
    """Return the SGS block slug for a legacy kebab-semantic role, or None.

    D99: queries `slots WHERE scope='section'` (was legacy_role_lookup table).
    Results cached in-module after the first call (warmup pattern).

    Examples:
        legacy_role_lookup_for('hero')           -> 'sgs/hero'
        legacy_role_lookup_for('trust-bar')      -> None  (not in section-scope slots)
        legacy_role_lookup_for('unknown-role')   -> None
    """
    global _LEGACY_ROLE_CACHE
    if _LEGACY_ROLE_CACHE is None:
        _LEGACY_ROLE_CACHE = _load_legacy_role_cache()
    result = _LEGACY_ROLE_CACHE.get(kebab_role)
    if result is None and kebab_role:
        _trace("db_lookup_miss", lookup="legacy_role_lookup_for", kebab_role=kebab_role)
    return result


# ----------------------------------------------------------------------------
# is_class_section_block — Spec 22 §FR-22-3 exception 3 + D1 explicit flag
# ----------------------------------------------------------------------------
# Returns True iff the given block slug is registered in the `blocks` table
# with tier='class-section'. Used by the per-section convention voter to gate
# the literal-slug fast-path: only class-section blocks (sgs/hero, sgs/cta-section)
# may be returned from a section-scope SGS-BEM class signature; everything
# else falls through to gap-candidate routing (Stage 2 FR-22-4 default to
# sgs/container).
#
# Cached after first call — `tier` is static for the lifetime of a pipeline run.

_CLASS_SECTION_CACHE: set[str] | None = None


def _load_class_section_cache() -> set[str]:
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT slug FROM blocks WHERE tier = 'class-section'"
        ).fetchall()
        return {r[0] for r in rows}
    except sqlite3.OperationalError:
        # tier column not present yet (pre-XS-2). Soft-fail to empty set so
        # the voter degrades to "no class-section blocks", which preserves
        # historical fast-path-disabled behaviour rather than crashing.
        return set()
    finally:
        conn.close()


def is_class_section_block(slug: str) -> bool:
    """Return True iff `slug` is a registered SGS block with tier='class-section'."""
    global _CLASS_SECTION_CACHE
    if _CLASS_SECTION_CACHE is None:
        _CLASS_SECTION_CACHE = _load_class_section_cache()
    return slug in _CLASS_SECTION_CACHE


# ----------------------------------------------------------------------------
# scalar_media_attr_for — FR-22-19 composite scalar-media slot lookup
# ----------------------------------------------------------------------------
# Returns the attr_name of the 'scalar-media' attr on `block_slug` whose slot
# matches `bem_element`.  Used by _route_composite_interior in convert.py to
# decide whether a composite interior column should be lifted into a scalar attr
# (the media column) or folded as bare InnerBlocks (the content column).
#
# The DB query is intentionally cheap: it reads block_attributes once per
# (block_slug, bem_element) pair and caches the result with functools.lru_cache.
# The caller (_route_composite_interior) iterates per direct child, but the
# number of composites × their child columns is small (≤4 per section) so even
# cache-cold hits never cause measurable latency.
#
# R-22-1 compliance: no per-block slug literals.  Routing is driven entirely by
# the `block_attributes.role='scalar-media'` column and the `slots` aliases.


@functools.lru_cache(maxsize=256)
def has_scalar_media_attrs(block_slug: str) -> bool:
    """True if `block_slug` declares >=1 attr with role='scalar-media'.

    FR-22-19 gate (2026-06-01, corrected): the composite-interior router fires
    for any COMPOSITE that renders part of its interior itself as a scalar-media
    attr (sgs/hero.splitImage, sgs/testimonial-slider.sideImage) — NOT only
    class-section/section-root blocks (testimonial-slider is a composite but a
    content-block, not a section root). Gating on the PRESENCE of a scalar-media
    attr is precise: it covers every such composite AND naturally excludes blocks
    with no scalar-media attr (cta-section, info-box, product-card) so their
    interior routing is unchanged (resolves the cta-section over-fire risk).
    R-22-1: DB-driven, no slug literals; R-22-9: universal mechanism.
    """
    if not block_slug:
        return False
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT 1 FROM block_attributes WHERE block_slug = ? "
            "AND role = 'scalar-media' LIMIT 1",
            (block_slug,),
        ).fetchone()
    finally:
        conn.close()
    return row is not None


def scalar_media_attr_for(block_slug: str, bem_element: str) -> str | None:
    """Return the attr_name of the scalar-media attr on `block_slug` for `bem_element`.

    A 'scalar-media' attr is one where:
      - block_attributes.role = 'scalar-media'  (classification='styling-behaviour'
        → equivalent_block_for returns None → walker lifts to scalar not child block)
      - Its canonical_slot aliases include `bem_element` (or canonical_slot itself
        equals `bem_element` after normalisation).

    The Mobile/Desktop distinction is the CALLER's job: this function returns the
    **base** attr_name (e.g. 'splitImage', 'sideImage') — never the '+Mobile'
    sibling.  The caller appends 'Mobile' when the BEM modifier is '--mobile'.

    Returns:
        attr_name string (e.g. 'splitImage') on a match, or None when the
        composite has no scalar-media attr at the given slot.

    Args:
        block_slug:  Fully-qualified block slug, e.g. 'sgs/hero'.
        bem_element: BEM element segment from the child's sgs- class, e.g.
                     'split-image', 'media', 'side-image'.

    Caching: LRU-cached per (block_slug, bem_element) pair.  Safe for repeated
    calls across a section walk.  Cache is module-level (shared across sections);
    values are static for the lifetime of a pipeline run.
    """
    return _scalar_media_attr_for_cached(block_slug, bem_element)


@functools.lru_cache(maxsize=512)
def _scalar_media_attr_for_cached(block_slug: str, bem_element: str) -> str | None:
    """LRU-cached implementation of scalar_media_attr_for."""
    import json as _json

    if not block_slug or not bem_element:
        return None

    # Normalise the element token once for matching (strip hyphens, lowercase).
    norm_elem = _normalise(bem_element)

    # Fetch all scalar-media attrs for this block from block_attributes.
    # Join to slots (scope='element') to read their canonical slot name + aliases.
    # We do NOT rely on canonical_slot being populated — Tier B (derived_selector
    # BEM element) would work too, but querying slot aliases is more robust and
    # consistent with the existing equivalent_block_for Tier A pattern.
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT ba.attr_name, ba.canonical_slot "
            "FROM block_attributes ba "
            "WHERE ba.block_slug = ? AND ba.role = 'scalar-media'",
            (block_slug,),
        ).fetchall()
    finally:
        conn.close()

    if not rows:
        _trace("db_lookup_miss", lookup="scalar_media_attr_for",
               block_slug=block_slug, bem_element=bem_element)
        return None

    # For each scalar-media attr, check whether the bem_element resolves to its slot.
    for attr_name, canonical_slot in rows:
        # Skip the '+Mobile' sibling attrs (attr_name ends with 'Mobile').
        # scalar_media_attr_for always returns the BASE attr; the caller appends 'Mobile'.
        if attr_name.endswith("Mobile"):
            continue

        # Check 1: direct canonical_slot name match (normalised).
        if canonical_slot and _normalise(canonical_slot) == norm_elem:
            _trace("db_lookup_hit", lookup="scalar_media_attr_for",
                   block_slug=block_slug, bem_element=bem_element,
                   attr_name=attr_name, match_via="canonical_slot_name")
            return attr_name

        # Check 2: look up the slot's aliases in the slots table.
        if canonical_slot:
            conn2 = sqlite3.connect(SGS_DB)
            try:
                slot_row = conn2.execute(
                    "SELECT aliases FROM slots WHERE slot_name = ? AND scope = 'element'",
                    (canonical_slot,),
                ).fetchone()
            finally:
                conn2.close()

            if slot_row and slot_row[0]:
                try:
                    aliases = _json.loads(slot_row[0])
                except (ValueError, TypeError):
                    aliases = []
                for alias in aliases:
                    if _normalise(str(alias)) == norm_elem:
                        _trace("db_lookup_hit", lookup="scalar_media_attr_for",
                               block_slug=block_slug, bem_element=bem_element,
                               attr_name=attr_name, match_via="slot_alias",
                               matched_alias=alias)
                        return attr_name

        # Check 3: fall back to normalised attr_name match (e.g. 'splitImage' → 'splitimage'
        # vs bem_element 'split-image' → 'splitimage').
        if _normalise(attr_name) == norm_elem:
            _trace("db_lookup_hit", lookup="scalar_media_attr_for",
                   block_slug=block_slug, bem_element=bem_element,
                   attr_name=attr_name, match_via="attr_name_normalised")
            return attr_name

    _trace("db_lookup_miss", lookup="scalar_media_attr_for",
           block_slug=block_slug, bem_element=bem_element)
    return None


# ----------------------------------------------------------------------------
# equivalent_block_for — Spec 22 §FR-22-2.1 two-tier derivation
# ----------------------------------------------------------------------------
# Canonical implementation of the universal walker's block-equivalence question:
# "Given (block_slug, attr_name), is the attr block-equivalent — and if so,
#  which standalone block is its content emitted as?"
#
# Two tiers, in order (Tier C deleted 2026-05-27 per D85 / qc-council Rater B
# — see Spec 22 §15 F-AP-2 / F-SC-11 RESOLVED via deletion; will be re-added
# when role detection generates real Tier C inputs per parking entry
# P-SGS-UPDATE-ROLE-DETECTION-IMPROVE):
#   A. Direct join: block_attributes.canonical_slot IS NOT NULL → join
#      slot_synonyms.canonical_slot → return standalone_block.
#   B. BEM-element extraction: when canonical_slot IS NULL but derived_selector
#      is set (e.g. '.sgs-product-card__image'), extract the BEM element
#      (regex __([a-z0-9-]+)) → match against slot_synonyms.aliases
#      (JSON-decoded) → return standalone_block.
#
# FR-22-2.2 role-exclusion is applied BEFORE tier matching as a positive
# allowlist: return None when the attr's role is NOT classified
# 'content-bearing' on slot_synonyms.role_classification. Prevents the
# "typography looks like heading" trap (headlineFontSizeDesktop has
# canonical_slot='heading' but role='typography' → must NOT route content
# to a heading block). Per D85 the classification lives in the DB
# (slot_synonyms.role_classification), not in hardcoded Python frozensets
# (honours R-22-1; blub.db row 260).
#
# LRU cache (maxsize=2048): walker calls this function per-node-per-attr;
# canonical_slot + derived_selector + role are static for the lifetime of a
# pipeline run, so cached lookups are safe and necessary for the ≤2ms
# cache-warm performance threshold (FR-22-8).


@functools.lru_cache(maxsize=1)
def _content_bearing_roles() -> frozenset[str]:
    """Return the set of role names classified 'content-bearing' from the
    `roles` table (D99 2026-05-29 — was slot_synonyms.role_classification).

    D99 closes the link-href bug: the old column-based approach only set
    role_classification on slot_synonyms rows that HAD a given role; since
    no slot row had role='link-href', it was never seeded. The `roles` table
    is seeded from _ROLE_CLASSIFICATION_MAP which explicitly lists all 5
    content-bearing roles including link-href.

    Returns 5 roles: text-content, image-object, content, link-href, identity.
    Cached at module-load price; the rows are static for a pipeline run.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT role_name FROM roles WHERE classification = 'content-bearing'"
        ).fetchall()
    except sqlite3.OperationalError:
        # Table missing (migration soft-failed). Return empty — positive
        # allowlist closes by default, which is the safe direction.
        return frozenset()
    finally:
        conn.close()
    return frozenset(r[0] for r in rows)


@functools.lru_cache(maxsize=1)
def _styling_behaviour_roles() -> frozenset[str]:
    """Return the set of role names classified 'styling-behaviour' from the
    `roles` table (D99 2026-05-29 — was slot_synonyms.role_classification).

    Diagnostic helper — not consulted by the gate in equivalent_block_for()
    (the gate is a positive allowlist on _content_bearing_roles()). Provided
    for downstream tooling that needs to enumerate styling-behaviour roles.

    Returns 15 roles.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT role_name FROM roles WHERE classification = 'styling-behaviour'"
        ).fetchall()
    except sqlite3.OperationalError:
        return frozenset()
    finally:
        conn.close()
    return frozenset(r[0] for r in rows)

# BEM element extractor: matches the FIRST __element segment in a selector.
# e.g. '.sgs-product-card__image' → 'image'; '.sgs-icon__glyph, [data-icon]'
# → 'glyph'; 'audio' / 'figure > a' / 'h1,h2,h3' → no match (core/* shapes).
_BEM_ELEMENT_RE = re.compile(r"__([a-z0-9-]+)")


def _extract_bem_element(selector: str) -> str | None:
    """Return the first BEM `__element` token across compound selectors.

    Extended 2026-05-30 per P-XS-4-TIER-B-FINGERPRINT-CHAIN to handle
    fingerprint-override fallback chains like
    `.sgs-hero__headline, h1, h2`. The base regex search already finds the
    first `__element` anywhere in the string, but this helper:
      1. Makes the comma-split + per-fragment intent explicit
      2. Skips fragments that have no BEM token (bare tags like `h1`, `audio`)
      3. Returns the first BEM token encountered (left-to-right priority)
    """
    if not selector:
        return None
    for fragment in selector.split(","):
        m = _BEM_ELEMENT_RE.search(fragment)
        if m:
            return m.group(1).lower()
    return None


@functools.lru_cache(maxsize=1)
def _slot_alias_to_standalone() -> dict[str, str]:
    """Return {alias_lowercase: standalone_block} from element-scope slots.

    D99: queries `slots WHERE scope='element'` (was slot_synonyms).
    Walks every row's slot_name + aliases JSON; maps each term (lowercased)
    to the row's standalone_block. Used by Tier B BEM-element matching.
    Excludes rows where standalone_block is NULL/empty.
    """
    import json
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT slot_name, aliases, standalone_block FROM slots "
            "WHERE scope='element' AND standalone_block IS NOT NULL AND standalone_block != ''"
        ).fetchall()
    finally:
        conn.close()
    out: dict[str, str] = {}

    def _put(term: str, standalone: str) -> None:
        """Register `term` plus its no-hyphen variant. First writer wins so
        canonical slot names never get clobbered by hyphen-stripped aliases.

        Extended 2026-05-30 (P-XS-4-SLOT-VOCAB-GAPS) so camelCase attr names
        like `splitImage` (lowered to `splitimage`) resolve against
        kebab-case aliases like `split-image` automatically.
        """
        key = term.lower()
        if key not in out:
            out[key] = standalone
        nh = key.replace("-", "")
        if nh and nh != key and nh not in out:
            out[nh] = standalone

    for slot_name, aliases_json, standalone in rows:
        _put(slot_name, standalone)
        if aliases_json:
            try:
                for alias in json.loads(aliases_json):
                    _put(alias, standalone)
            except (ValueError, TypeError):
                pass
    return out


@functools.lru_cache(maxsize=2048)
def equivalent_block_for(block_slug: str, attr_name: str) -> str | None:
    """Return the standalone block slug if (block_slug, attr_name) is block-equivalent,
    else None.

    Spec 22 §FR-22-2.1 two-tier derivation + §FR-22-2.2 role-exclusion.
    (Tier C deleted 2026-05-27 per D85 / qc-council Rater B — see module
    docstring above. Re-introduction gated on
    P-SGS-UPDATE-ROLE-DETECTION-IMPROVE generating real Tier C inputs.)

    Performance: cached per (block_slug, attr_name); cache size 2048 sized for the
    walker's per-node-per-attr call pattern across a full body-section run.

    Examples:
        equivalent_block_for('sgs/product-card', 'description')   -> 'sgs/text'
        equivalent_block_for('sgs/hero', 'headlineFontSizeDesktop') -> None
            (Tier A matches canonical_slot='heading' but role='typography' → excluded)
        equivalent_block_for('sgs/back-to-top', 'position')       -> None
            (triple-NULL; no tier matches)
        equivalent_block_for('sgs/icon', 'iconSource')            -> 'sgs/icon'
            (Tier B: derived_selector='.sgs-icon__glyph...', elem='glyph' →
             slot_synonyms.icon.aliases contains 'glyph' → standalone='sgs/icon')
    """
    if not block_slug or not attr_name:
        return None

    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT canonical_slot, derived_selector, role "
            "FROM block_attributes "
            "WHERE block_slug = ? AND attr_name = ?",
            (block_slug, attr_name),
        ).fetchone()
    finally:
        conn.close()

    if row is None:
        return None

    canonical_slot, derived_selector, role = row

    # FR-22-2.2 role-exclusion as positive-allowlist (D85 2026-05-27 — moved
    # from hardcoded frozenset to DB-driven query of slot_synonyms.role_classification
    # per Rater B finding; honours R-22-1).
    #
    # The original negative-blocklist `if role and role in _ROLE_EXCLUSION_ALLOWLIST`
    # short-circuited on falsy role (NULL/empty), letting 171 rows with
    # canonical_slot set + role NULL through to tier resolution. The 3 confirmed
    # misroutes were sgs/cta-section.textTransform / sgs/hero.textTransform /
    # sgs/info-box.textTransform — all returned 'sgs/text' because
    # canonical_slot='text' matched slot_synonyms.aliases but role-NULL
    # bypassed the exclusion check.
    #
    # Positive-allowlist closes the hole: a row's content is routed via
    # block-equivalence ONLY when role is explicitly content-bearing per the
    # DB-driven classification. Role-NULL → return None. Role in
    # styling/behaviour set → return None. Role unknown to either set → return
    # None (defensive — new roles must be classified before routing).
    if role not in _content_bearing_roles():
        return None

    # Tier A — direct join: canonical_slot → slot_synonyms.standalone_block
    if canonical_slot:
        standalone = _slot_alias_to_standalone().get(canonical_slot.lower())
        if standalone:
            return standalone
        # canonical_slot set but no standalone_block on slot_synonyms row
        # → falls through to next tier (defensive; should be rare).

    # Tier B — BEM-element from derived_selector → slot.aliases match.
    # Compound selectors split + per-fragment scan via _extract_bem_element
    # (P-XS-4-TIER-B-FINGERPRINT-CHAIN, 2026-05-30).
    if derived_selector:
        element = _extract_bem_element(derived_selector)
        if element:
            standalone = _slot_alias_to_standalone().get(element)
            if standalone:
                return standalone

    # Tier B2 (2026-05-30 P-XS-4-SLOT-VOCAB-GAPS) — attr-name fallback alias
    # lookup. Resolves cases where Tier A's canonical_slot points to a
    # layout-only slot with no standalone_block (e.g. `splitImage` resolves
    # to canonical_slot=`split` via property-suffix peel; `split` has no
    # standalone_block; but the camelCase attr-name `splitimage` matches the
    # `media.splitimage` alias and routes to sgs/media). Also covers attrs
    # where property-suffix peel produced an empty stem (e.g. attr_name
    # `image` peels to empty + role=`image-object`; full name `image` matches
    # `media.image` alias).
    alias_lookup = _slot_alias_to_standalone()
    nh_attr = attr_name.lower().replace("-", "")
    for key in (attr_name.lower(), nh_attr):
        standalone = alias_lookup.get(key)
        if standalone:
            return standalone

    return None


# ----------------------------------------------------------------------------
# atomic_tag_map — Spec 22 §14 Appendix B / Commit 1.2
# ----------------------------------------------------------------------------
# DB-driven replacement for the legacy hardcoded ATOMIC_TAG_MAP dict in
# _retired/convert_pre_spec22.py (9-entry dict, violated R-22-1).
#
# The atomic_tag_map operates at the walker's NO-BEM-CLASS fallback level —
# when a DOM node carries no `sgs-*` BEM classification, the walker uses this
# map to route the bare HTML tag to its html-canonical SGS block (Spec 22 §13
# walker pseudocode line 642).
#
# Resolution algorithm (two-tier html-canonical resolution, fully DB-driven):
#   Tier A — DB join: html_tag_to_core_block → blocks.replaces reverse-walk
#             For each row in html_tag_to_core_block, find the SGS block
#             whose `blocks.replaces` value matches the canonical core slug.
#   Tier B — fallback to core block slug
#             If no SGS block replaces the tag's canonical core slug, return
#             the core/* slug directly from html_tag_to_core_block.
#
# WHY slot_synonyms.html_semantic_tag is NOT consulted here (2026-05-28):
#   slot_synonyms.html_semantic_tag captures SLOT-CONTEXTUAL rendering
#   ("in slot X context, this slot is rendered as tag Y"). It is NOT a global
#   html-canonical tag→block routing table. Using it for atomic resolution
#   produced slot-contextual routing where html-canonical routing is needed.
#   slot_synonyms data stays unchanged; atomic_tag_map simply does not query it.
#
# R-22-1 compliance (2026-05-28 hardening):
#   No hardcoded SGS routing dict in code. The html-tag→core-block bridge data
#   lives in the html_tag_to_core_block DB table, seeded once at module load
#   from _HTML_TAG_TO_CORE_BLOCK_SEED. Runtime path queries DB only.


@functools.lru_cache(maxsize=1)
def _blocks_replaces_reverse() -> dict[str, str]:
    """Return {core_block_slug: sgs_block_slug} from blocks.replaces (status='built').

    blocks.replaces stores a single plain core slug per row (e.g. 'core/paragraph').
    When multiple sgs blocks replace the same core slug, the first slug alphabetically
    wins (ORDER BY slug ASC) for deterministic output.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT replaces, slug FROM blocks "
            "WHERE replaces IS NOT NULL AND replaces != '' AND status = 'built' "
            "ORDER BY slug ASC"
        ).fetchall()
    finally:
        conn.close()
    out: dict[str, str] = {}
    for core_slug, sgs_slug in rows:
        # First writer wins (ORDER BY slug ASC gives determinism).
        if core_slug not in out:
            out[core_slug] = sgs_slug
    return out


@functools.lru_cache(maxsize=1)
def atomic_tag_map() -> dict[str, str]:
    """Return {html_tag: block_slug} for all HTML tags the universal walker may encounter.

    Fully DB-driven (R-22-1 compliance, 2026-05-28 hardening). Reads
    html_tag_to_core_block at runtime and joins against blocks.replaces.
    No hardcoded routing dict in code.

    Resolution is html-canonical (NOT slot-contextual):
      Tier A: html_tag_to_core_block → blocks.replaces reverse-walk
      Tier B: fallback to core/* slug from html_tag_to_core_block

    See the module-level comment block above for why slot_synonyms.html_semantic_tag
    is intentionally NOT consulted here.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT html_tag, core_block_slug FROM html_tag_to_core_block"
        ).fetchall()
    finally:
        conn.close()

    replaces_reverse = _blocks_replaces_reverse()
    out: dict[str, str] = {}
    for html_tag, core_slug in rows:
        # Tier A: reverse-walk blocks.replaces — find SGS block that replaces this core slug
        sgs_slug = replaces_reverse.get(core_slug)
        # Tier B: fallback to the core slug itself
        out[html_tag] = sgs_slug if sgs_slug else core_slug
    return out


# ----------------------------------------------------------------------------
# array_item_slot_for — Spec 22 §FR-22-2.5 / Commit 1.3
# ----------------------------------------------------------------------------
# DB-driven resolution for array-typed attrs. When the walker encounters an
# array attr (block_attributes.attr_type='array') on a block, it asks this
# helper: "what's the per-item content slot?" The answer drives one of two
# emission paths in the universal walker (Commit 1.4):
#
#   Tier A (DB-populated canonical_slot — preferred):
#     equivalent_block_for(block_slug, attr_name) resolves canonical_slot to
#     a standalone_block; the walker emits one child block per array item.
#     e.g. sgs/product-card.packSizes (canonical_slot='button') → walker emits
#     one sgs/button child per pack-size item.
#
#   Tier B (NULL canonical_slot — walker falls back to children's BEM):
#     If canonical_slot is NULL, the walker queries the children's BEM
#     signature for the slot (per FR-22-2.5 §4). This helper returns None
#     for that case — the walker handles the BEM-fallback path itself.
#
# Replaces hardcoded ARRAY_LIFT_PATTERNS dict at _retired/convert_pre_spec22.py:1008-1031
# (R-22-1 compliance).

@functools.lru_cache(maxsize=2048)
def array_item_slot_for(block_slug: str, attr_name: str) -> str | None:
    """Return the canonical_slot for the items of an array-typed attribute.

    Returns:
        - The canonical_slot string when populated (Tier A — walker emits
          one child block per item via equivalent_block_for + standalone_block).
        - None when canonical_slot is NULL on a true array attr (Tier B —
          walker falls back to children's BEM signature per FR-22-2.5 §4).
        - None when the attribute does not exist OR is not array-typed
          (caller should not have invoked this helper for non-array attrs).

    The role gate is INCLUSIVE here (unlike equivalent_block_for): array
    attrs whose role is None but canonical_slot is populated still resolve.
    This matches the FR-22-2.5 §1 statement: "If the parent block's attr
    has canonical_slot populated → that's the array slot's content type".

    Caller (the walker) is responsible for then resolving canonical_slot via
    equivalent_block_for or standalone_block_for to get the emitted block slug.

    Examples:
        array_item_slot_for('sgs/product-card', 'packSizes') -> 'button'
        array_item_slot_for('sgs/gallery', 'mediaItems')     -> 'media'
        array_item_slot_for('sgs/form-field-tiles', 'tiles') -> 'options'
        array_item_slot_for('sgs/info-box', 'elementOrder')  -> None
            (config array, role='layout', canonical_slot NULL — walker skips)
        array_item_slot_for('sgs/hero', 'headlineFontSize')  -> None
            (not an array attr — caller misuse)
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT canonical_slot, attr_type FROM block_attributes "
            "WHERE block_slug = ? AND attr_name = ?",
            (block_slug, attr_name),
        ).fetchone()
    finally:
        conn.close()

    if row is None:
        return None  # Attribute does not exist
    canonical_slot, attr_type = row
    if attr_type != "array":
        return None  # Caller misuse — non-array attr passed
    return canonical_slot  # May be None (Tier B fallback) or populated (Tier A)


# ============================================================================
# Phase 1.4 Pass 1 — Universal walker helper functions
# ============================================================================
# These three helpers are consumed by the universal walker (Pass 2).
# They encode the three core walker operations without any per-block branches:
#   1. resolve_slug_from_bem  — FR-22-1 BEM→slug resolution
#   2. lift_behavioural_attrs — FR-22-2 scalar attr lifting
#   3. emit_sgs_container_wrapping — FR-22-3 exception 3 + FR-22-4
#
# R-22-1 compliance: no hardcoded SGS routing dicts; every routing decision
# queries the DB or delegates to existing helpers. No `if slug == 'sgs/X'`
# conditionals anywhere in this section.
# ============================================================================


# ----------------------------------------------------------------------------
# Helper 1 — resolve_slug_from_bem
# Spec 22 §FR-22-1 multi-class BEM→slug resolution
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=4096)
def _resolve_slug_from_bem_tuple(classes_tuple: tuple[str, ...]) -> str | None:
    """Core resolution logic — operates on a frozen sorted tuple for caching.

    Multi-class disambiguation rule (FR-22-1 + FR-22-15):
      Path 1 — bare block class (no __element suffix) present:
        Each class whose BemParse.element is None is a block-root candidate.
        Filter to those where `sgs/<block>` is a registered built slug.
        If exactly one → return it.
        If multiple → capability-aware tiebreaker (FR-22-15, D96 2026-05-29):
          Sort by (_capability_rank, slug) ascending so the most semantically
          specific block wins. Alphabetical is the final tiebreaker when two
          slugs share the same capability rank. Emits trace with all candidates
          + chosen slug for diagnostic visibility.
      Path 2 — all classes are __element-suffixed (inner element of a parent):
        Walk each class's BemParse.block + every known slot synonym alias.
        Find the first canonical_slot whose standalone_block is non-NULL.
        Return that standalone_block slug.
      Neither path resolves → return None.
    """
    if not classes_tuple:
        return None

    registered = registered_block_slugs()
    slot_alias_map = _slot_alias_to_standalone()

    # Parse all sgs- classes via BEM
    parsed: list[tuple[str, BemParse]] = []  # (original_class, parse)
    for cls in classes_tuple:
        if not cls.startswith("sgs-"):
            continue
        bem = parse_sgs_bem(cls)
        if bem is not None:
            parsed.append((cls, bem))

    if not parsed:
        return None

    # ---- Path 1: bare block classes (no __element suffix) ----
    bare_block_slugs: list[str] = []
    for _cls, bem in parsed:
        if bem.element is None and bem.block is not None:
            candidate = f"sgs/{bem.block}"
            if candidate in registered:
                bare_block_slugs.append(candidate)

    if bare_block_slugs:
        if len(bare_block_slugs) > 1:
            # FR-22-15 (D96 2026-05-29): capability-aware tiebreaker.
            # Sort by (_capability_rank, slug) so the block with the most
            # semantically specific capability tag ranks first. Alphabetical
            # slug is the final tiebreaker for equal-rank candidates.
            bare_block_slugs.sort(key=lambda s: (_capability_rank(s), s))
            _trace("bem_resolve_ambiguous",
                   classes=list(classes_tuple),
                   candidates=bare_block_slugs,
                   chosen=bare_block_slugs[0],
                   tiebreaker="capability_rank")
        return bare_block_slugs[0]

    # ---- Path 2: element-only classes — slot fallback ----
    # Walk in sorted order (deterministic) through parsed classes and try to
    # resolve each BEM element/block segment against slot_synonyms.
    for cls, bem in sorted(parsed, key=lambda x: x[0]):
        # Try the element name first (most specific)
        if bem.element is not None:
            standalone = slot_alias_map.get(bem.element.lower())
            if standalone:
                _trace("bem_resolve_slot_fallback",
                       class_=cls,
                       slot=bem.element,
                       slug=standalone)
                return standalone
        # Try the block segment (e.g. sgs-product-card__badge → 'product-card'
        # is block, 'badge' is element — already tried above; but the block
        # itself might also be a known slot alias in edge cases)
        if bem.block is not None:
            standalone = slot_alias_map.get(bem.block.lower())
            if standalone:
                _trace("bem_resolve_slot_fallback",
                       class_=cls,
                       slot=bem.block,
                       slug=standalone)
                return standalone

    return None


def resolve_slug_from_bem(sgs_classes: list[str]) -> str | None:
    """Return the canonical SGS block slug for a list of sgs-* BEM classes, or None.

    Spec 22 §FR-22-1 + §FR-22-15 — multi-class disambiguation:
      - Path 1: a class whose BEM block segment maps to a registered built
        slug (no __element suffix). Multiple matches → capability-aware
        tiebreaker (_capability_rank) + alphabetical final tiebreaker (D96).
        Previously was alphabetical-first only.
      - Path 2: all classes carry __element (inner element). Walk slot_synonyms
        aliases; return the first canonical_slot whose standalone_block is set.
      - Neither → None.

    Non-sgs-* classes are silently filtered out. Safe to call with a node's
    full class list — the walker should pre-filter but this helper is defensive.
    """
    return _resolve_slug_from_bem_tuple(tuple(sorted(sgs_classes)))


# ----------------------------------------------------------------------------
# Helper 2 — lift_behavioural_attrs
# Spec 22 §FR-22-2 — scalar attr lifting (NULL equivalent_block only)
# ----------------------------------------------------------------------------

def lift_behavioural_attrs(node: object, slug: str) -> dict:
    """Return a dict of scalar block attrs inferred from node's DOM attributes and classes.

    # TODO: FR-22-2 scalar lift — refine in Pass 2 as walker discovers attrs that
    # need lifting beyond the simple cases handled here. Current implementation
    # covers: (a) explicit data-sgs-X="Y" attributes, and (b) sgs-block--modifier
    # class patterns that map to known property_suffixes / modifier_suffixes rows.
    # Array attrs (FR-22-2.5) and equivalent_block-routed attrs (FR-22-2.1) are
    # walker concerns — this helper does NOT lift those.

    Args:
        node: BeautifulSoup Tag (or any object with .get() and .get('class') interface)
        slug: Resolved SGS block slug (e.g. 'sgs/hero')

    Returns:
        dict of attr_name → value for scalar behavioural attrs that can be
        inferred from the node without requiring content extraction.
        Empty dict when no scalar attrs are found.
    """
    result: dict = {}

    # ---- (a) Explicit data-sgs-X="Y" attributes ----
    # Mockup authors (or the pipeline's Stage 4 Playwright pass) may annotate
    # nodes with `data-sgs-<attrName>="<value>"` for unambiguous attr injection.
    # These override any derived value. We check ALL attrs on the node for the
    # data-sgs- prefix and lift any that have a matching attr on this block slug.
    attrs = block_attrs(slug)
    # Access node's HTML attributes — BeautifulSoup Tag.attrs is a dict.
    # We accept any object with a .get(key) interface as a duck-type contract.
    try:
        node_attrs: dict = node.attrs if hasattr(node, "attrs") else {}
    except Exception:
        node_attrs = {}

    for html_attr, value in node_attrs.items():
        if not isinstance(html_attr, str):
            continue
        if html_attr.startswith("data-sgs-"):
            attr_name = html_attr[len("data-sgs-"):]
            # Only lift if the attr exists on this block AND is scalar (not array)
            if attr_name in attrs and attrs[attr_name].get("attr_type") != "array":
                # Only lift if equivalent_block_for returns None (scalar, not block-equiv)
                if equivalent_block_for(slug, attr_name) is None:
                    # Value may be a list when BS4 parses multi-value attrs; take first
                    lifted_val = value[0] if isinstance(value, list) else value
                    result[attr_name] = lifted_val
                    _trace("scalar_lift", slug=slug, attr=attr_name,
                           source="data-sgs-attr", value=lifted_val)

    # ---- (b) sgs-block--modifier class patterns ----
    # A modifier class like `sgs-cta-section--large` carries potential attr info.
    # We parse the modifier, look it up in modifier_suffixes (kind=variant/state)
    # and also probe property_suffixes for block-level CSS class probes.
    # The block_attributes table's derived_selector column can carry
    # `--modifier` patterns — we scan for matches.
    try:
        css_classes: list[str] = node.get("class") or []
        if isinstance(css_classes, str):
            css_classes = css_classes.split()
    except Exception:
        css_classes = []

    # Check each sgs- class for a modifier segment
    canonical_modifiers = _canonical_modifiers()
    for cls in css_classes:
        if not cls.startswith("sgs-"):
            continue
        bem = parse_sgs_bem(cls)
        if bem is None or bem.modifier is None:
            continue
        modifier = bem.modifier.lower()
        # Check if the modifier maps to a known modifier_suffixes kind
        mod_kind = canonical_modifiers.get(modifier)
        if mod_kind not in ("variant", "state"):
            continue
        # Now look for a block_attribute on this slug whose derived_selector
        # ends with `--<modifier>` OR whose attr_name encodes the modifier.
        # We scan attrs looking for a match; this is the "enum-class-probe" pattern.
        for attr_name, attr_info in attrs.items():
            role = attr_info.get("role")
            if role not in ("select-from-enum", "enum-class-probe", "behaviour"):
                continue
            derived = attr_info.get("canonical_slot") or ""
            # Heuristic: the modifier matches if the attr_name normalised == modifier
            # or if derived_selector-like naming carries the modifier.
            norm_mod = _normalise(modifier)
            norm_attr = _normalise(attr_name)
            if norm_attr == norm_mod or norm_attr.endswith(norm_mod):
                if equivalent_block_for(slug, attr_name) is None:
                    result[attr_name] = modifier
                    _trace("scalar_lift", slug=slug, attr=attr_name,
                           source="modifier-class", value=modifier)
                    break

    return result


# ----------------------------------------------------------------------------
# Helper 3 — emit_sgs_container_wrapping
# Spec 22 §FR-22-3 exception 3 + §FR-22-4 (top-level section container wrap)
# ----------------------------------------------------------------------------

def _emit_wp_block_markup(slug: str, attrs: dict, children: list[str]) -> str:
    """Private helper — emit a single WP block markup string.

    Mirrors emit_wp_block() shape from _retired/convert_pre_spec22.py:964.
    Strips private underscore-prefixed keys from attrs (routing hints).
    Produces open+close form; never self-closing (section containers always
    have children or empty inner content).
    """
    import json as _json
    clean = {
        k: v for k, v in attrs.items()
        if v not in (None, "", [], {}) and not k.startswith("_")
    }
    attr_json = ""
    if clean:
        attr_json = " " + _json.dumps(clean, separators=(",", ":"), ensure_ascii=False)
    inner_str = "\n".join(children) if children else ""
    return f"<!-- wp:{slug}{attr_json} -->\n{inner_str}\n<!-- /wp:{slug} -->"


def emit_sgs_container_wrapping(
    slug: str | None,
    attrs: dict,
    children_markup: list[str],
    css: str,
) -> str:
    """Wrap a resolved block in a sgs/container parent (FR-22-3 exception 3 + FR-22-4).

    Called by the walker when: is_top_level=True AND resolved slug != 'sgs/container'.
    Every top-level section's base is sgs/container (FR-22-4); non-container
    top-level sections are wrapped rather than emitted bare.

    When slug is None (top-level node had no BEM-resolved block slug per FR-22-11),
    no inner block is emitted — the walked children become direct InnerBlocks of
    the sgs/container wrapper. This preserves FR-22-4's invariant ("every top-level
    section is based on sgs/container") for sections whose root class is unknown
    to the slot_synonyms table, while keeping FR-22-11 pass-through semantics for
    non-top-level slug-None nodes (which never reach this function).

    Args:
        slug: Resolved block slug for the inner block (e.g. 'sgs/hero'), or None
              when the top-level section had no BEM-resolved block (children
              become direct container InnerBlocks).
        attrs: Block attrs dict to set on the inner block (ignored when slug=None)
        children_markup: List of child block markup strings (inner blocks)
        css: Section-scoped CSS string; appended as <style> inside the container
             div when non-empty (Spec 22 §FR-22-5 routing)

    Returns:
        WP block serialisation string with sgs/container as the outer wrapper.

    Example output shape:
        <!-- wp:sgs/container {} -->
        <div class="wp-block-sgs-container">
        <!-- wp:sgs/hero {"level":"h1"} -->
        <p>x</p>
        <!-- /wp:sgs/hero -->
        <style>a{color:red}</style>
        </div>
        <!-- /wp:sgs/container -->
    """
    import json as _json

    _trace("section_wrap", slug=slug, children_count=len(children_markup))

    # Build the container's inner HTML.
    # When slug is not None: emit inner resolved block (+ its attrs + children),
    # then optional CSS.
    # When slug is None (top-level FR-22-11 pass-through): children become direct
    # InnerBlocks of the container (no synthetic inner block emitted).
    container_parts: list[str] = []
    if slug is not None:
        inner_markup = _emit_wp_block_markup(slug, attrs, children_markup)
        container_parts.append(inner_markup)
    else:
        container_parts.extend(c for c in children_markup if c)
    if css and css.strip():
        container_parts.append(f"<style>{css.strip()}</style>")
    container_inner = "\n".join(container_parts)

    # Wrap in sgs/container (FR-22-4: always an empty attrs dict — styling
    # lives on the inner block; the container is a structural wrapper only)
    wrapper_div = (
        f'<div class="wp-block-sgs-container">\n'
        f"{container_inner}\n"
        f"</div>"
    )
    return f"<!-- wp:sgs/container {{}} -->\n{wrapper_div}\n<!-- /wp:sgs/container -->"


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

    # -----------------------------------------------------------------
    # equivalent_block_for — Spec 22 §FR-22-2.1 unit tests
    # -----------------------------------------------------------------
    print("\n== equivalent_block_for (Spec 22 §FR-22-2.1) ==")
    cases: list[tuple[str, str, str | None, str]] = [
        # (block_slug, attr_name, expected, label)
        ("sgs/product-card", "description", "sgs/text",
         "Tier A: role=text-content (in content allowlist) + canonical_slot='text' → sgs/text"),
        ("sgs/hero", "headlineFontSizeDesktop", None,
         "Positive-allowlist: role=typography NOT in content set → None"),
        ("sgs/back-to-top", "position", None,
         "Triple-NULL row: role=None → None (positive-allowlist closes by default)"),
        ("sgs/icon", "iconSource", "sgs/icon",
         "Tier A: role='image-object' (content-bearing per slot_synonyms.role_classification) "
         "+ canonical_slot='icon' → sgs/icon. Expectation updated 2026-05-27 (D85) — prior "
         "expectation of None assumed role=None, but DB has role='image-object' (verified)."),
        # Rater A adversarial test (2026-05-27 /qc-council finding): textTransform is a
        # styling attr whose canonical_slot was set to 'text' in the DB; original
        # negative-blocklist short-circuited on role=NULL and returned 'sgs/text',
        # producing the FR-22-2.2 "typography looks like heading" misroute. Positive-
        # allowlist closes the hole because role=None is not in _CONTENT_BEARING_ROLES.
        ("sgs/cta-section", "textTransform", None,
         "FR-22-2.2 adversarial (Rater A 2026-05-27): canonical_slot='text' matches "
         "Tier A but role=None bypasses content allowlist → None (was 'sgs/text' pre-fix)"),
    ]
    failures: list[str] = []
    for block_slug, attr_name, expected, label in cases:
        actual = equivalent_block_for(block_slug, attr_name)
        ok = actual == expected
        status = "PASS" if ok else "FAIL"
        print(f"  [{status}] {block_slug}.{attr_name}")
        print(f"         expected={expected!r}  actual={actual!r}")
        print(f"         {label}")
        if not ok:
            failures.append(f"{block_slug}.{attr_name}: expected {expected!r} got {actual!r}")
    print()
    if failures:
        print(f"FAILURES: {len(failures)}")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("All equivalent_block_for tests PASS.")