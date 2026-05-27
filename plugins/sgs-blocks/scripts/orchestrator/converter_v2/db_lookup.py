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


# ----------------------------------------------------------------------------
# Idempotent schema migration — slot_synonyms.role_classification
# ----------------------------------------------------------------------------
# Spec 22 §FR-22-2.2 / D85 (qc-council Rater B 2026-05-27): role classification
# moves out of hardcoded Python frozensets into a DB column on slot_synonyms.
# Honours R-22-1 (DB-first, no hardcoded dicts; blub.db row 260).
#
# The column carries three permitted values:
#   - 'content-bearing'    — role routes content via block-equivalence
#   - 'styling-behaviour'  — role is a scalar styling/behaviour attr
#   - 'unclassified'       — role NULL or otherwise not yet classified
#
# Population mapping (per D85 brief 2026-05-27, derived from the previous
# hardcoded _CONTENT_BEARING_ROLES + _ROLE_EXCLUSION_ALLOWLIST frozensets):
_ROLE_CLASSIFICATION_MAP: dict[str, str] = {
    # Content-bearing roles
    "text-content":         "content-bearing",
    "image-object":         "content-bearing",
    "content":              "content-bearing",
    "link-href":            "content-bearing",
    "identity":             "content-bearing",
    # Styling / behaviour roles
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
}


def _migrate_role_classification() -> None:
    """Idempotent migration: add slot_synonyms.role_classification column if absent
    and populate it from _ROLE_CLASSIFICATION_MAP.

    Safe to call repeatedly. Runs at module load. Honours R-22-1: the mapping
    above is the one-time seed of the catalogue, NOT a runtime lookup dict —
    once seeded, all callers query the DB column via the public helper
    functions below.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(slot_synonyms)").fetchall()}
        if "role_classification" not in cols:
            conn.execute(
                "ALTER TABLE slot_synonyms ADD COLUMN role_classification TEXT"
            )
        # Populate any row whose classification is missing (NULL). Idempotent:
        # already-classified rows are left alone, so re-runs are no-ops.
        rows = conn.execute(
            "SELECT canonical_slot, role FROM slot_synonyms "
            "WHERE role_classification IS NULL OR role_classification = ''"
        ).fetchall()
        for canonical_slot, role in rows:
            classification = _ROLE_CLASSIFICATION_MAP.get(role, "unclassified")
            conn.execute(
                "UPDATE slot_synonyms SET role_classification = ? "
                "WHERE canonical_slot = ?",
                (classification, canonical_slot),
            )
        conn.commit()
    except sqlite3.OperationalError:
        # DB read-only / locked / missing — soft-fail. Callers fall back to
        # unclassified-default behaviour (positive-allowlist returns None).
        pass
    finally:
        conn.close()


# Run migration at module load (idempotent).
_migrate_role_classification()


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
        # INSERT OR IGNORE — idempotent; never overwrites existing rows. To
        # change a mapping, edit the row directly or DROP + recreate the table.
        for html_tag, (core_slug, note) in _HTML_TAG_TO_CORE_BLOCK_SEED.items():
            conn.execute(
                "INSERT OR IGNORE INTO html_tag_to_core_block "
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
    result = {
        name: {"attr_type": t, "role": role, "canonical_slot": cs}
        for name, t, role, cs in rows
    }
    if not result:
        _trace("db_lookup_miss", lookup="block_attrs", block_slug=block_slug)
    return result


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

    Wave 2 Change 3 (2026-05-22): added 'colour-gradient', 'select-from-enum',
    'spacing-token' to the lifted set. Schema evidence (blub.db 272):
      - colour-gradient: suffix='Gradient', css_property='background-image' — URL-valued
      - select-from-enum: suffix='FontStyle', css_property='font-style' — string enum
      - spacing-token: suffix='BlockGap', css_property='gap' — numeric px value
      - spacing-token: suffix='Spacing', css_property='padding/margin (preset)' — skipped
        (multi-property; no single CSS prop to match)
    """
    if suffix in _KIND_BY_SUFFIX:
        return _KIND_BY_SUFFIX[suffix]
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
# Replaces hardcoded LEGACY_ROLE_LOOKUP dict in per-section-convention-voter.py.
# Table: sgs-framework.db legacy_role_lookup. Seeded by:
#   plugins/sgs-blocks/scripts/uimax-tools/seed-legacy-role-lookup.py
# ----------------------------------------------------------------------------

# Module-level cache populated on first call. Avoids repeated DB round-trips
# across multiple sections in a single run.
_LEGACY_ROLE_CACHE: dict[str, str] | None = None


def _load_legacy_role_cache() -> dict[str, str]:
    """Query legacy_role_lookup table and return {kebab_role: sgs_slug}."""
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute("SELECT kebab_role, sgs_slug FROM legacy_role_lookup").fetchall()
    except sqlite3.OperationalError:
        # Table not yet created — seed script hasn't been run. Soft-fail to empty.
        rows = []
    finally:
        conn.close()
    return {kebab: slug for kebab, slug in rows}


def legacy_role_lookup_for(kebab_role: str) -> str | None:
    """Return the SGS block slug for a legacy kebab-semantic role, or None.

    Queries sgs-framework.db legacy_role_lookup (seeded by
    plugins/sgs-blocks/scripts/uimax-tools/seed-legacy-role-lookup.py).
    Results cached in-module after the first call (warmup pattern).

    Examples:
        legacy_role_lookup_for('hero')           -> 'sgs/hero'
        legacy_role_lookup_for('trust-bar')      -> 'sgs/trust-bar'
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
    """Return the set of role names classified 'content-bearing' on
    slot_synonyms.role_classification (DB-driven; D85 2026-05-27).

    Replaces the previous hardcoded _CONTENT_BEARING_ROLES frozenset.
    Cached at module-load price; the column is static for the lifetime
    of a pipeline run.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT DISTINCT role FROM slot_synonyms "
            "WHERE role_classification = 'content-bearing' "
            "  AND role IS NOT NULL AND role != ''"
        ).fetchall()
    except sqlite3.OperationalError:
        # Column missing (migration soft-failed). Return empty — positive
        # allowlist closes by default, which is the safe direction.
        return frozenset()
    finally:
        conn.close()
    return frozenset(r[0] for r in rows)


@functools.lru_cache(maxsize=1)
def _styling_behaviour_roles() -> frozenset[str]:
    """Return the set of role names classified 'styling-behaviour' on
    slot_synonyms.role_classification (DB-driven; D85 2026-05-27).

    Diagnostic helper — not consulted by the gate in equivalent_block_for()
    (the gate is a positive allowlist on _content_bearing_roles()). Provided
    for downstream tooling that needs to enumerate styling-behaviour roles
    explicitly.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT DISTINCT role FROM slot_synonyms "
            "WHERE role_classification = 'styling-behaviour' "
            "  AND role IS NOT NULL AND role != ''"
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


@functools.lru_cache(maxsize=1)
def _slot_alias_to_standalone() -> dict[str, str]:
    """Return {alias_lowercase: standalone_block} from slot_synonyms.

    Walks every row's canonical_slot + aliases JSON; maps each term (lowercased)
    to the row's standalone_block. Used by Tier B BEM-element matching.
    Excludes rows where standalone_block is NULL/empty.
    """
    import json
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT canonical_slot, aliases, standalone_block FROM slot_synonyms "
            "WHERE standalone_block IS NOT NULL AND standalone_block != ''"
        ).fetchall()
    finally:
        conn.close()
    out: dict[str, str] = {}
    for canonical, aliases_json, standalone in rows:
        out[canonical.lower()] = standalone
        if aliases_json:
            try:
                for alias in json.loads(aliases_json):
                    out[alias.lower()] = standalone
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

    # Tier B — BEM-element from derived_selector → slot_synonyms.aliases match
    if derived_selector:
        m = _BEM_ELEMENT_RE.search(derived_selector)
        if m:
            element = m.group(1).lower()
            standalone = _slot_alias_to_standalone().get(element)
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