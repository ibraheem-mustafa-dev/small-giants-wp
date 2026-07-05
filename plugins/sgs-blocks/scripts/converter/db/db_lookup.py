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

Moved here from ``orchestrator/converter_v2/db_lookup.py`` in EXECUTION Step 9
(Phase 3, 2026-07-04) — this IS the canonical implementation now; the old path
is a re-export shim.
"""
from __future__ import annotations

import functools
import json
import re
import sqlite3
from pathlib import Path
from typing import NamedTuple

SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
UIMAX_DB = Path.home() / ".agents" / "ui-ux-pro-max" / "scripts" / "ui-ux-pro-max.db"
if not UIMAX_DB.exists():
    UIMAX_DB = Path.home() / ".agents" / "skills" / "ui-ux-pro-max" / "scripts" / "ui-ux-pro-max.db"


def get_connection() -> sqlite3.Connection:
    """Open a fresh, caller-owned connection to the SGS DB (``check_same_thread=False``).

    FR-31-8 (2026-07-05): the sole legitimate accessor for call sites that need
    an OPEN connection object to pass across the resolver dispatch call graph
    (``Ctx.conn`` — consumed by ``build_ctx``, ``lift_root_supports_to_style``,
    ``process_element`` and downstream resolvers), as opposed to a single
    query answered by one of this module's other accessors.

    NOT cached / NOT a singleton: every call opens a new connection and the
    CALLER is responsible for closing it (mirrors the pre-existing
    ``sqlite3.connect(SGS_DB, check_same_thread=False)`` call sites this
    replaces in ``converter/services/css_pass.py`` and
    ``converter/services/fold_helpers.py`` — both open-per-call,
    close-in-``finally``). Caching the connection itself would break that
    lifecycle (a cached connection closed by one caller would break the next).
    """
    return sqlite3.connect(SGS_DB, check_same_thread=False)


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
# source only — never a runtime lookup dict (R-31-1).
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
    # FR-31-19 composite scalar-media (2026-06-01): foreground images that a
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
    is the authoritative runtime query target. Honours R-31-1.

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
# Spec 22 §14 Appendix B / R-31-1 (2026-05-28 hardening): the bridge between
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
# The bare-HTML-tag → SGS-block bridge is a version-controlled DATA FILE
# (scripts/data/atomic-tag-map.json), NOT a hardcoded dict (R-31-1). That file is
# the git-tracked SEED that (re)populates the html_tag_to_core_block DB table via
# the migration below — rebuild insurance for a from-scratch DB. The runtime path
# (atomic_tag_map()) queries the DB table ONLY, never this file. Values route each
# bare tag DIRECTLY to its SGS block — the converter never emits a core block
# (D270, 2026-07-04: repointed core/* → sgs/*; column name core_block_slug is
# retained for compat but holds the SGS target).
_ATOMIC_TAG_MAP_FILE = Path(__file__).resolve().parents[2] / "data" / "atomic-tag-map.json"


def _load_atomic_tag_seed() -> dict[str, tuple[str, str]]:
    """Load {html_tag: (target_sgs_slug, note)} from atomic-tag-map.json.

    Data-file source (R-31-1 — no hardcoded routing dict in code). Keys starting
    with ``__`` are metadata. Soft-fails to ``{}`` if the file is missing or
    unreadable, in which case the migration leaves existing DB rows untouched.
    """
    try:
        raw = json.loads(_ATOMIC_TAG_MAP_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    out: dict[str, tuple[str, str]] = {}
    for tag, val in raw.items():
        if tag.startswith("__") or not isinstance(val, list) or not val:
            continue
        out[tag] = (val[0], val[1] if len(val) > 1 else "")
    return out


def _migrate_html_tag_to_core_block() -> None:
    """Idempotent migration: create html_tag_to_core_block table if absent
    and populate it from the atomic-tag-map.json seed (_load_atomic_tag_seed).

    Safe to call repeatedly. Runs at module load. Honours R-31-1: the seed is a
    version-controlled DATA FILE, NOT a hardcoded runtime dict — atomic_tag_map()
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
        # INSERT OR REPLACE — propagates atomic-tag-map.json edits on module
        # re-load (D99 2026-05-29 Fix 3: was INSERT OR IGNORE) so an updated seed
        # value refreshes the DB row automatically without manual edits.
        for html_tag, (target_slug, note) in _load_atomic_tag_seed().items():
            conn.execute(
                "INSERT OR REPLACE INTO html_tag_to_core_block "
                "(html_tag, core_block_slug, note) VALUES (?, ?, ?)",
                (html_tag, target_slug, note),
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

    Cross-checks that the resolved slug is actually built/registered (status='built'
    in the blocks table). If the DB row points at a planned/stub slug the converter
    would emit it and WP would throw a block-validation error. In that case we
    return None and fall back to sgs/container (the converter's correct fallback
    for unbuilt blocks — see registered_block_slugs() docstring).
    """
    import sys as _sys
    result = _slot_to_standalone_block().get(canonical_slot)
    if result is None:
        if canonical_slot:
            _trace("db_lookup_miss", lookup="standalone_block_for",
                   canonical_slot=canonical_slot)
        return None
    if result not in registered_block_slugs():
        print(
            f"[db_lookup] WARNING: standalone_block_for('{canonical_slot}') resolved to "
            f"'{result}' which is NOT in registered_block_slugs() (status != 'built'). "
            "Returning None — converter will fall back to sgs/container.",
            file=_sys.stderr,
        )
        return None
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
    """Return {attr_name: {role, canonical_slot, attr_type, derived_selector}} for a block.

    `derived_selector` (added 2026-06-11 for the universal scalar-lift,
    _lift_scalar_attrs_by_selector) is the BEM class selector for the draft
    element this attr extracts from (e.g. '.sgs-testimonial__text'). NULL for
    attrs with no draft element. Consumed by FR-31-2 / FR-31-5 D1 selector-lift.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT attr_name, attr_type, role, canonical_slot, derived_selector "
            "FROM block_attributes WHERE block_slug = ?",
            (block_slug,),
        ).fetchall()
    finally:
        conn.close()
    result = {
        name: {"attr_type": t, "role": role, "canonical_slot": cs, "derived_selector": ds}
        for name, t, role, cs, ds in rows
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


@functools.lru_cache(maxsize=256)
def get_container_kind(block_slug: str) -> str | None:
    """Return block_composition.container_kind for a block, or None.

    Values: 'section' | 'layout' | 'content' (populated 2026-06-02 D152 by
    /sgs-update from block.json supports.sgs.containerKind). Used by the modular
    converter's Stage-2 recognition (services.recognise_helpers._get_container_kind)
    to label a recognised block's container KIND and to tie-break multiple registered
    BEM root classes (prefer 'section' > 'layout' > 'content', design 2026-06-23-stage2
    §1 fold-L). Pure DB read; soft-fails to None on missing table/row/column.

    Args:
        block_slug: Fully-qualified SGS slug, e.g. 'sgs/hero'.

    Returns:
        'section' | 'layout' | 'content', or None when the block has no row or the
        column is NULL.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT container_kind FROM block_composition WHERE block_slug = ?",
            (block_slug,),
        ).fetchone()
    except sqlite3.OperationalError:
        row = None
    finally:
        conn.close()
    if row and row[0]:
        _trace("db_lookup_hit", lookup="get_container_kind",
               block_slug=block_slug, container_kind=row[0])
        return row[0]
    _trace("db_lookup_miss", lookup="get_container_kind", block_slug=block_slug)
    return None


@functools.lru_cache(maxsize=1)
def container_default_slug() -> str | None:
    """Return the DB's canonical default-container slug (FR-31-4), DB-derived.

    FR-31-4 ("section base is always sgs/container"): a top-level class-section
    with no registered composite defaults to THE container block + recurses its
    children. This returns that container slug WITHOUT a block-slug literal
    (R-31-1 / the no_slug_literal contract) by deriving it from the DB as "the
    block that composites wrap" — every composite with a built-in wrapper carries
    `block_composition.wraps_block = <the container>` (the 31-block composite-mirror
    roster, FR-31-21.1). The most-wrapped `wraps_block` value IS the canonical
    container, name-free.

    Pure DB read; soft-fails to None on missing table/column (test/CI environments
    without the DB), so a caller can fall through to its own no-op — never a crash.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT wraps_block FROM block_composition "
            "WHERE wraps_block IS NOT NULL "
            "GROUP BY wraps_block ORDER BY COUNT(*) DESC LIMIT 1"
        ).fetchone()
    except sqlite3.OperationalError:
        row = None
    finally:
        conn.close()
    if row and row[0]:
        _trace("db_lookup_hit", lookup="container_default_slug", slug=row[0])
        return row[0]
    _trace("db_lookup_miss", lookup="container_default_slug")
    return None


# block_accepts_inner_blocks DELETED (post-programme QC, 2026-07-05): it read the
# block_composition.has_inner_blocks column DROPPED at Step 16 (migrations/
# 2026-07-05-drop-has-inner-blocks-column.py), so its OperationalError soft-fail
# made it permanently return True — broken for its stated purpose with zero live
# callers (STOP-48 consumer grep: only its own definition + one stale comment).
# The live block-level signal is services/has_inner.py::derive_delegates_content
# (source-derived); the per-attr signal is emit_shape_for below (FR-31-2.6).


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
# The capability-aware TIEBREAKER is RETIRED (D278 QC, Bean-directed 2026-07-05).
# _CAPABILITY_PRIORITY (~40 hand-ordered capability names) + _capability_rank were
# deleted: a trace of EVERY recorded firing across all retained pipeline runs
# showed the genuine cross-block tie NEVER occurred — all recorded "ties" were
# the SAME slug twice (a bare class + its own --modifier class both parse to the
# same block), i.e. a missing dedupe, not ambiguity. Path 1 of
# `_resolve_slug_from_bem_tuple` now DEDUPES candidates; a residual tie between
# DISTINCT blocks is a draft-authoring ambiguity that goes LOUD (trace + no
# match → the node falls to the container-default/pass-through path, content
# preserved by recursion) for manual review — matching the section-level
# 2-registered-root precedent. FR-31-15 amended accordingly (Spec 31 §13.2).


@functools.lru_cache(maxsize=256)
def capabilities_for(block_slug: str) -> frozenset[str]:
    """Return the set of capability tags for `block_slug` from the DB.

    e.g. capabilities_for('sgs/accordion') → frozenset({'expandable', 'faq',
         'schema-faq', 'question-answer'})
    e.g. capabilities_for('sgs/unknown')  → frozenset()

    Queries `block_capabilities` table in sgs-framework.db. LRU-cached per slug.
    Safe to call per-node in the walker — the cache eliminates DB round-trips on
    repeated calls for the same slug within a section.

    R-31-1 compliance: no hardcoded slug→capability mapping in code. All data
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

    R-31-1 compliance: DB-only read path.
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


# ----------------------------------------------------------------------------
# Idempotent schema migration — array_item_fields (D248, array-resolver)
# ----------------------------------------------------------------------------
# Stores per-item field schema for array-content-lift blocks. Seeded by
# sgs-update-v2.py Stage 1 from block.json supports.sgs.arrayItemSchema.
# Consumed by the array_content resolver + array_item_fields() accessor.
# Safe to call repeatedly. Runs at module load.

def _migrate_array_item_fields_schema() -> None:
    """Idempotent migration: create array_item_fields table if absent."""
    conn = sqlite3.connect(SGS_DB)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS array_item_fields (
              block_slug      TEXT NOT NULL,
              array_attr      TEXT NOT NULL,
              item_selector   TEXT NOT NULL,
              field_key       TEXT NOT NULL,
              field_selector  TEXT NOT NULL,
              role            TEXT NOT NULL,
              attr_type       TEXT NOT NULL DEFAULT 'string',
              enum_values     TEXT,
              gap_reason      TEXT,
              created_at      TEXT DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (block_slug, array_attr, field_key)
            )
            """
        )
        # Idempotent column migration for DBs created before gap_reason was added.
        cols = {row[1] for row in conn.execute(
            "PRAGMA table_info(array_item_fields)"
        ).fetchall()}
        if "gap_reason" not in cols:
            conn.execute(
                "ALTER TABLE array_item_fields ADD COLUMN gap_reason TEXT"
            )
        conn.commit()
    except sqlite3.OperationalError:
        pass
    finally:
        conn.close()


# Run migration at module load (idempotent).
_migrate_array_item_fields_schema()


@functools.lru_cache(maxsize=256)
def array_item_fields(block_slug: str, array_attr: str) -> list[dict]:
    """Return per-item field schema rows for a block's array attr.

    Queries ``array_item_fields`` (created by _migrate_array_item_fields_schema
    + seeded by sgs-update-v2.py Stage 1 from block.json
    ``supports.sgs.arrayItemSchema``). Returns an empty list when no rows
    exist (block not yet authored) — the caller gates on non-empty.

    Each dict contains:
      - ``item_selector``   — BEM class of the repeated item element in the draft
      - ``field_key``       — the render.php item dict key (e.g. ``'text'``)
      - ``field_selector``  — BEM class for this field inside the item element
      - ``role``            — 'text-content' | 'image-object' | 'number' | 'gap-pending'
      - ``attr_type``       — 'string' | 'object' | 'number'
      - ``enum_values``     — parsed list or None
      - ``gap_reason``      — str reason (when role='gap-pending') or None

    R-31-1 compliant — DB-only read path; no per-block slug literals.
    """
    import json as _json
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            """
            SELECT item_selector, field_key, field_selector, role,
                   attr_type, enum_values, gap_reason
            FROM array_item_fields
            WHERE block_slug = ? AND array_attr = ?
            ORDER BY rowid
            """,
            (block_slug, array_attr),
        ).fetchall()
    except sqlite3.OperationalError:
        # Table absent (pre-D248 state) — soft-fail to empty.
        rows = []
    finally:
        conn.close()
    result = []
    for item_selector, field_key, field_selector, role, attr_type, enum_json, gap_reason in rows:
        enum_vals = None
        if enum_json:
            try:
                enum_vals = _json.loads(enum_json)
            except (ValueError, TypeError):
                pass
        result.append({
            "item_selector": item_selector,
            "field_key": field_key,
            "field_selector": field_selector,
            "role": role,
            "attr_type": attr_type,
            "enum_values": enum_vals,
            "gap_reason": gap_reason,
        })
    return result


# _capability_rank DELETED (D278 QC, 2026-07-05) — see the retirement note at
# the _CAPABILITY_PRIORITY site above. Distinct-block ties in Path 1 are now
# LOUD (dedupe first; residual ambiguity → trace + no match), never silently
# ranked by an in-code ordering.


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
# a `kind_override` column on property_suffixes. Honours R-31-1 (DB-first,
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
# Idempotent schema migration — variant detection (FR-31-20, D133 2026-06-01)
# ----------------------------------------------------------------------------
# Universal variant detection (Spec 22 §FR-31-20) needs two schema additions:
#   - blocks.variant_attr  — names the variant-selector attr per block (e.g.
#     'variant', 'variantStyle', 'layout') so the converter never guesses it.
#     Populated by /sgs-update Stage 1 from block.json supports.sgs.variantAttr.
#   - variant_slots table  — (block_slug, variant_value, unique_slot) storing
#     each variant's DISCRIMINATING slots (set-difference vs sibling variants).
#     Populated by /sgs-update Stage 1 from block.json supports.sgs.variants.
#
# This migration is pure schema (additive, no data). Population is a /sgs-update
# responsibility, so there is no seed dict here (R-31-1 dict-as-seed N/A).
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


# ----------------------------------------------------------------------------
# Idempotent schema migration — block_composition.container_kind (D150 2026-06-02)
# ----------------------------------------------------------------------------
# Workstream A: adds a container_kind TEXT column (section|layout|content|NULL)
# to block_composition. Values are written by sync-container-wrapping-blocks.py
# (run separately — never by the walker). The column is informational for the
# sync diff; it is NOT read by the walker (zero walker impact). Population via
# /sgs-update (Stage 1 reads supports.sgs.containerKind from block.json).
#
# Safe to call repeatedly. Runs at module load.

def _migrate_block_composition_container_kind() -> None:
    """Idempotent migration: add block_composition.container_kind column if absent.

    Schema only — no data seeding (data written by sync-container-wrapping-blocks.py
    at --apply time, or by /sgs-update Stage 1 for the containerKind flag from
    block.json supports.sgs.containerKind). Safe to call repeatedly.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(block_composition)").fetchall()}
        if "container_kind" not in cols:
            conn.execute(
                "ALTER TABLE block_composition ADD COLUMN container_kind TEXT "
                "CHECK (container_kind IN ('section', 'layout', 'content'))"
            )
            conn.commit()
    except sqlite3.OperationalError:
        # DB read-only / locked / table absent — soft-fail silently.
        pass
    finally:
        conn.close()


# Run migration at module load (idempotent — safe to call repeatedly).
_migrate_block_composition_container_kind()


def _kind_for(suffix: str, role: str | None) -> str | None:
    """Infer the convert.py 'kind' for a property_suffixes row.

    Returns one of: 'colour', 'number_px', 'number_unitless', 'number_px_or_em',
    'string'. Returns None for rows that shouldn't be lifted via CSS (behaviour,
    select-from-enum, content roles — these aren't CSS-driven).

    D99 2026-05-29 (Fix 4): queries property_suffixes.kind_override FIRST
    (R-31-1 — DB-first, no hardcoded dicts). Falls through to role-based
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
    # DB-first (R-31-1): query kind_override column seeded from _KIND_BY_SUFFIX.
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
    if not rows:
        import sys as _sys
        print(
            "[db_lookup] WARNING: property_suffixes table empty — "
            "suffix resolution will mis-classify all CSS properties. "
            "Re-run /sgs-update to seed the table.",
            file=_sys.stderr,
        )
    out: list[tuple[str, str, str]] = []
    for suffix, css_prop, role in rows:
        kind = _kind_for(suffix, role)
        if kind is None:
            continue
        out.append((css_prop, suffix, kind))
    return out


# ----------------------------------------------------------------------------
# Typography CSS → block-attr lift map (DB-driven, replaces _TYPOGRAPHY_CSS_TO_ATTRS)
# ----------------------------------------------------------------------------
# R-31-1: no hardcoded css-property→attribute literal dict/list.
# The 8 entries formerly hardcoded in convert.py._TYPOGRAPHY_CSS_TO_ATTRS are
# now derived at runtime from property_suffixes. The DB's css_property column
# already holds the css_property→suffix direction; iteration is driven entirely
# from the DB rows (typography role + the two colour css_properties), so adding
# a new typography suffix to the DB flows through with ZERO code edits here.
#
# Disambiguation: most css_properties have exactly ONE suffix row in the DB
# (font-size→FontSize, line-height→LineHeight, etc.) — those resolve directly,
# no constant needed. Only the two colour css_properties are ambiguous:
#   - 'color'            → Colour / Color / Foreground / TextColour / TextColor (5)
#   - 'background-color' → Background / BackgroundColour / BackgroundColor / Bg (4)
# The SGS block schema uses 'textColour' and 'backgroundColour' as the canonical
# flat attr names; any other suffix (e.g. 'Colour' → 'colour') is an attr no
# block declares, so the lift would no-op. This 2-entry table is the minimal
# WP/SGS naming-convention constant (same class as SKIP_TOP_LEVEL_TAGS) needed
# to pick the right DB row for those two ambiguous properties only.
_TYPO_CSS_SUFFIX_SELECTION: dict[str, str] = {
    "color":            "TextColour",       # → textColour (not 'colour')
    "background-color": "BackgroundColour", # → backgroundColour (not 'background')
}

# The two colour css_properties whose suffix is selected via the table above.
# All other lifted typography css_properties (role='typography') resolve their
# single DB suffix directly. Order matters for setdefault semantics downstream.
_TYPO_COLOUR_CSS_PROPS: tuple[str, ...] = ("color", "background-color")

# Lift SCOPE roster (ordered): the css_properties _lift_typography_to_block_attrs
# transfers from a draft element onto a leaf SGS text block. This is the lift
# *scope* decision (which CSS properties to lift) — NOT a css→attr mapping; the
# attr name + unit companion are derived from property_suffixes per entry.
# The DB classifies more properties as role='typography' (font-family,
# text-decoration, text-transform) but those are deliberately OUT of the typed
# flat-attr lift scope here (they have separate handling / no faithful-default
# need on the cloning path). Adding one to this tuple is the single edit needed
# to bring it into scope — the suffix/attr/unit then derive from the DB row.
_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS: tuple[str, ...] = (
    "font-size", "line-height", "letter-spacing",
    "font-weight", "font-style", "text-align",
)


@functools.lru_cache(maxsize=1)
def typography_css_to_attrs() -> list[tuple[str, str, "str | None"]]:
    """Return list of (css_prop, primary_attr, unit_attr_or_None) tuples used by
    _lift_typography_to_block_attrs in convert.py.

    Fully DB-driven from property_suffixes (R-31-1). Replaces the hardcoded
    _TYPOGRAPHY_CSS_TO_ATTRS list. The css_property→suffix→attr→unit derivation
    reads the DB; only the lift SCOPE (which css_properties to lift) and the
    2-property colour disambiguation are module constants.

    Iteration order = _TYPO_LIFT_TYPOGRAPHY_CSS_PROPS (the 6 typography props)
    then _TYPO_COLOUR_CSS_PROPS (color, background-color).

    Derivation rules:
      - For each lifted css_property, gather candidate suffixes from the DB
        css_property column. Unambiguous (one candidate) → use it. Ambiguous
        (color / background-color) → pick via _TYPO_CSS_SUFFIX_SELECTION.
      - primary_attr = lower-first-char of the chosen suffix ('FontSize' → 'fontSize')
      - unit_attr    = primary_attr + 'Unit' when role='typography' AND
                       kind_override != 'string' — i.e. the property accepts a
                       numeric value that may carry a CSS unit ('px','em',etc.)
                       or the 'unitless' sentinel. Colour-role entries never get a
                       unit attr; select-from-enum entries never get a unit attr.
      - Ordering preserves the original _TYPOGRAPHY_CSS_TO_ATTRS sequence so that
        setdefault semantics in _resolve_typo_value are unchanged.

    Soft-fail: on any DB error, warns to stderr and returns the known-good
    hardcoded fallback (same values as the original list) so the converter
    never breaks on a missing/locked DB.
    """
    _FALLBACK: list[tuple[str, str, "str | None"]] = [
        ("font-size",       "fontSize",        "fontSizeUnit"),
        ("line-height",     "lineHeight",       "lineHeightUnit"),
        ("letter-spacing",  "letterSpacing",    "letterSpacingUnit"),
        ("font-weight",     "fontWeight",       None),
        ("font-style",      "fontStyle",        None),
        ("text-align",      "textAlign",        None),
        ("color",           "textColour",       None),
        ("background-color","backgroundColour", None),
    ]
    # Ordered lift scope: 6 typography props then the 2 colour props.
    lifted_css_props = list(_TYPO_LIFT_TYPOGRAPHY_CSS_PROPS) + list(_TYPO_COLOUR_CSS_PROPS)
    try:
        conn = sqlite3.connect(SGS_DB)
        try:
            # Pull every property_suffixes row whose css_property is in scope.
            # The DB's css_property column IS the css_property→suffix mapping —
            # we read it rather than re-encode it.
            placeholders = ",".join("?" for _ in lifted_css_props)
            db_rows = conn.execute(
                "SELECT css_property, suffix, role, kind_override "
                "FROM property_suffixes "
                f"WHERE css_property IN ({placeholders}) "
                "ORDER BY rowid",
                lifted_css_props,
            ).fetchall()
        finally:
            conn.close()
    except Exception as exc:  # noqa: BLE001 — DB unavailable → safe fallback
        import sys as _sys
        print(
            f"[db_lookup] WARNING: typography_css_to_attrs DB error ({exc!r}) — "
            "using hardcoded fallback. Re-run /sgs-update.",
            file=_sys.stderr,
        )
        return _FALLBACK

    # Build css_property → [(suffix, role, kind_override)] candidate map, in
    # rowid order (so the first candidate for an unambiguous prop is its only row).
    candidates: dict[str, list[tuple[str, str, "str | None"]]] = {}
    for css_property, suffix, role, kind_override in db_rows:
        candidates.setdefault(css_property, []).append((suffix, role, kind_override))

    def _resolve_one(css_prop: str) -> "tuple[str, str, str | None] | None":
        rows_for_prop = candidates.get(css_prop)
        if not rows_for_prop:
            return None
        if css_prop in _TYPO_CSS_SUFFIX_SELECTION:
            # Ambiguous colour property — pick the canonical suffix.
            wanted = _TYPO_CSS_SUFFIX_SELECTION[css_prop]
            chosen = next((r for r in rows_for_prop if r[0] == wanted), None)
            if chosen is None:
                return None
        else:
            # Unambiguous — exactly one suffix row in the DB for this css_property.
            chosen = rows_for_prop[0]
        suffix, role, kind_override = chosen
        primary_attr = suffix[0].lower() + suffix[1:]
        # unit_attr: only typography-role props that accept a CSS unit.
        # kind_override='string' → no unit (fontWeight, textAlign).
        # role='color' → no unit (textColour, backgroundColour).
        # role='select-from-enum' → no unit (fontStyle).
        if role == "typography" and kind_override != "string":
            unit_attr: "str | None" = primary_attr + "Unit"
        else:
            unit_attr = None
        return (css_prop, primary_attr, unit_attr)

    result: list[tuple[str, str, "str | None"]] = []
    for css_prop in lifted_css_props:
        resolved = _resolve_one(css_prop)
        if resolved is not None:
            result.append(resolved)
        else:
            # Couldn't resolve from DB → fall back to the hardcoded value if known.
            fb = next((t for t in _FALLBACK if t[0] == css_prop), None)
            if fb:
                result.append(fb)

    return result if result else _FALLBACK


# ----------------------------------------------------------------------------
# Commit 1b — per-declaration DB dispatch
# ----------------------------------------------------------------------------
# `attr_for_property` is the single function that decides, for a given
# (block_slug, css_property) pair, which write-path and flat attr name OWNS
# that declaration.  This removes the call-order precedence-chain from
# route_node_css (Commit 1a) and replaces it with an explicit DB-driven rule.
#
# Decision keys (per STAGE1-DESIGN.md §Commit-1b + D194):
#   1. TYPOGRAPHY scope  — css_property in _TYPO_LIFT_TYPOGRAPHY_CSS_PROPS or
#      _TYPO_COLOUR_CSS_PROPS, AND the block declares the corresponding flat attr
#      (e.g. sgs/heading.textColour for 'color').  Owner = "typography".
#      The typography writer handles unit companions correctly (fontSizeUnit etc.)
#      and applies the correct colour treatment (bare token vs hex), so it MUST
#      own the flat attr — not the wrapper-css writer.
#   2. WRAPPER-CSS scope — css_property in property_suffixes, block has a
#      matching flat attr, AND the property is NOT in the typography scope.
#      Owner = "wrapper_css".
#   3. ROOT-SUPPORTS (style.* path) — fires unconditionally in route_node_css
#      when block_supports_for allows it (always writes to style.*, a DIFFERENT
#      dest from flat attrs, so no contest with (1) or (2)).
#      NOT returned here — route_node_css handles it unconditionally.
#
# The function does NOT duplicate the root-supports path because it writes to a
# structurally different destination (style.* dict vs top-level flat attr) —
# both can legitimately fire for the same css_property (e.g. `color` on
# sgs/heading writes BOTH `textColour` AND `style.color.text`).
#
# R-31-1 compliance: all lookups via DB tables (property_suffixes,
# block_attributes).  _SUFFIX_ATTR_OVERRIDES is the ONLY constant (same
# exception class as SKIP_TOP_LEVEL_TAGS — handles `grid-template-columns`
# whose naive suffix derivation lands on the wrong attr, a WP-schema constant).
#
# Cache: LRU per (block_slug, css_property) — O(1) per declaration in the
# walker's per-node loop.
# ----------------------------------------------------------------------------

# The set of css_properties owned by the typography writer (R-31-1 permitted
# constant: these are the scope of _lift_typography_to_block_attrs, defined by
# the lift SCOPE decision documented in typography_css_to_attrs() above, not by
# per-block data.  Adding a new typography css_property to the DB scope is the
# single edit point).
_TYPOGRAPHY_CSS_SCOPE: frozenset[str] = frozenset(
    _TYPO_LIFT_TYPOGRAPHY_CSS_PROPS
) | frozenset(_TYPO_COLOUR_CSS_PROPS)

# Explicit attr-name overrides: mirrors the _SUFFIX_ATTR_OVERRIDES dict in
# convert.py._lift_wrapper_css_to_container_attrs so the derivation is
# consistent (R-31-1: these are WP-schema constants, not per-block data).
_ATTR_NAME_OVERRIDES: dict[tuple[str, str], str] = {
    ("grid-template-columns", "Columns"): "gridTemplateColumns",
}


@functools.lru_cache(maxsize=1024)
def css_property_has_suffix_row(css_property: str) -> bool:
    """True iff ``css_property`` has >=1 ``property_suffixes`` row — i.e. the DB
    declares it LIFTABLE (some attr-suffix destination exists somewhere).

    Spec 31 §4: property_suffixes IS the property->attr-suffix map, so "which CSS
    properties may a layer resolver attempt" is a DB FACT, never an in-code
    allowlist (R-31-1 — the Step-12 in-code `_OUTER_TRANSFER_PROPS` frozenset
    duplicated this fact and drifted the moment new rows were seeded; replaced
    by this accessor 2026-07-04, Bean-caught)."""
    if not css_property:
        return False
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT 1 FROM property_suffixes WHERE css_property = ? LIMIT 1",
            (css_property,),
        ).fetchone()
    except sqlite3.OperationalError:
        return False
    finally:
        conn.close()
    return row is not None



@functools.lru_cache(maxsize=4096)
def attr_for_property(
    block_slug: str,
    css_property: str,
) -> "tuple[str, str, str] | None":
    """Per-declaration DB dispatch: return (writer_path, attr_name, kind).

    Given (block_slug, css_property), decides which write-path OWNS the
    corresponding flat attr on the block.  Returns None when the property has
    no flat-attr destination on this block (it may still go to style.* via the
    root-supports path, which route_node_css handles unconditionally).

    Returns
    -------
    (writer_path, attr_name, kind) where:
      writer_path : "typography" | "wrapper_css"
      attr_name   : the flat block attribute name to write to
      kind        : value-conversion kind (colour / number_px / number_unitless /
                    number_px_or_em / string) from property_suffixes.kind_override
                    or role-based inference.

    Decision algorithm
    ------------------
    1. Query property_suffixes for css_property (ordered by rowid).
    2. For each (suffix, ps_role, kind_override) row:
       a. Derive candidate attr name = _ATTR_NAME_OVERRIDES.get((css_prop, suffix))
          or suffix[0].lower() + suffix[1:].
       b. Check block_attributes: does block_slug declare attr_name?
       c. If yes:
          - If css_property is in _TYPOGRAPHY_CSS_SCOPE → writer_path = "typography"
            (DB rule: typography writer owns this property's flat attr — it handles
             unit companions and colour treatment correctly).
          - Otherwise → writer_path = "wrapper_css"
          - Infer kind from kind_override → role-based fallback (mirrors _kind_for
            in this module).
          - Return immediately (first matching attr wins — same first-wins semantics
            as the existing setdefault ordering, now made explicit by DB rowid order
            rather than Python call order).
    3. If no matching flat attr found → return None.

    Performance: LRU-cached per (block_slug, css_property); cache size 4096 covers
    the typical walker's per-node-per-property call pattern across a full page.

    R-31-1: property_suffixes and block_attributes are the sole lookup sources.
    No hardcoded css_property→attr_name dict.
    """
    if not block_slug or not css_property:
        return None

    # Step 1: gather all (suffix, role, kind_override) rows for this css_property.
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT suffix, role, kind_override "
            "FROM property_suffixes "
            "WHERE css_property = ? "
            "ORDER BY rowid",
            (css_property,),
        ).fetchall()
    except sqlite3.OperationalError:
        return None
    finally:
        conn.close()

    if not rows:
        return None

    # Step 2: for each suffix, check block_attributes.
    block_attr_map = block_attrs(block_slug)
    if not block_attr_map:
        return None

    for suffix, ps_role, kind_override in rows:
        # Step 2a: derive candidate attr name.
        override_key = (css_property, suffix)
        if override_key in _ATTR_NAME_OVERRIDES:
            attr_name = _ATTR_NAME_OVERRIDES[override_key]
        elif suffix:
            attr_name = suffix[0].lower() + suffix[1:]
        else:
            continue

        # Step 2b: block_attributes membership check.
        if attr_name not in block_attr_map:
            continue

        # Step 2c: writer-path decision via DB rule.
        if css_property in _TYPOGRAPHY_CSS_SCOPE:
            writer_path = "typography"
        else:
            writer_path = "wrapper_css"

        # Infer kind (mirrors _kind_for logic; kind_override is the DB-first value).
        if kind_override:
            kind = kind_override
        elif ps_role == "color":
            kind = "colour"
        elif ps_role == "typography":
            kind = "number_px"  # safe fallback; actual conversion in the writer
        elif ps_role == "layout":
            kind = "number_px"
        elif ps_role == "visual":
            kind = "string"
        else:
            kind = "string"

        _trace("attr_for_property_dispatch",
               block_slug=block_slug, css_property=css_property,
               attr_name=attr_name, writer_path=writer_path, kind=kind)
        return (writer_path, attr_name, kind)

    # No matching flat attr on this block for this css_property.
    return None


# ----------------------------------------------------------------------------
# Breakpoint suffix vocabulary (DB-driven, replaces hardcoded _BREAKPOINT_SUFFIXES)
# ----------------------------------------------------------------------------

# Standard breakpoint marker → [suffixes to try, in priority order]. Tablet+Desktop
# both fire for min-width: 768 because most mockups have only one breakpoint and
# the converter wants to populate both responsive attrs from that single rule.
# This mapping is convention, not data — the DB has the suffix vocabulary; this
# function maps @media query breakpoints to which suffixes those queries apply to.
# R-31-1 permitted-constant exception (same class as SKIP_TOP_LEVEL_TAGS): these
# are CSS @media-query breakpoint thresholds from the W3C / web-platform standard,
# not SGS per-block data. There is no DB table for @media boundary values.
# The suffix vocabulary IS DB-driven (verified via modifier_suffixes in
# breakpoint_suffix_rules() below); only the marker→suffix PAIRING is a constant.
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
# Device-tier cascade samples (Spec 31 §3 F-fork / FR-31-5.2) — the numeric
# breakpoint model that replaces the substring-drop marker match.
# ----------------------------------------------------------------------------
#
# The SGS device system is fixed at 768/1024 (Spec 31 §3, §9 Q1). To resolve a
# draft `@media (min-width|max-width)` rule to the SGS device-tier attrs WITHOUT
# snapping or dropping, the CSS cascade is sampled at one representative interior
# width per tier: the EFFECTIVE value at each sample IS that tier's value.
#
#   Mobile  = width < 768     → sample 375
#   Tablet  = 768 <= w < 1024 → sample 800
#   Desktop = width >= 1024    → sample 1440  (Desktop is the SGS BASE/unsuffixed attr)
#
# `min-width:X` = "X and up" naturally populates every tier whose sample >= X;
# `max-width:X` = "X and down" every tier whose sample <= X — ONE symmetric
# calculation, both directions (FR-31-5.2). Order is Desktop -> Tablet -> Mobile
# so the A-collapse precedence (base = Desktop) is honoured by the caller.
#
# R-31-1 PERMITTED-CONSTANT exception (same class as SKIP_TOP_LEVEL_TAGS and the
# _BREAKPOINT_RULES marker table above): CSS @media boundary widths are a
# web-platform standard, not SGS per-block data — there is no DB table of pixel
# boundaries. The device-tier SUFFIX vocabulary (Mobile/Tablet/Desktop) remains
# DB-owned via modifier_suffixes(kind='breakpoint').
_DEVICE_TIER_SAMPLES: tuple[tuple[str, int], ...] = (
    ("Desktop", 1440),
    ("Tablet", 800),
    ("Mobile", 375),
)

# Canonical device-tier @media threshold values. A `min-width`/`max-width`
# threshold NOT in this set falls strictly inside a tier's range and creates a
# sub-tier band the 3-tier attr model cannot represent (e.g. min-width:600 = a
# 4-col band only for 600-767 of Mobile) — a D228 "arbitrary visual breakpoint"
# that must be preserved as an F-ii passthrough, NEVER snapped, NEVER dropped.
_DEVICE_TIER_THRESHOLDS: frozenset[int] = frozenset({767, 768, 1023, 1024})


def device_tier_samples() -> tuple[tuple[str, int], ...]:
    """Return the (tier_name, representative_width) samples, Desktop→Tablet→Mobile.

    Used by ``collect_css_decls_for_element`` to compute the effective CSS value
    per device tier via the cascade (Spec 31 §3 F-fork / FR-31-5.2).
    """
    return _DEVICE_TIER_SAMPLES


def device_tier_thresholds() -> frozenset[int]:
    """Return the canonical device-tier @media threshold values (767/768/1023/1024).

    A threshold outside this set is a non-device "visual" breakpoint (D228) whose
    residual sub-tier band routes to an F-ii passthrough, never a device tier.
    """
    return _DEVICE_TIER_THRESHOLDS


@functools.lru_cache(maxsize=None)
def modifier_suffixes(kind: str) -> tuple[str, ...]:
    """Return the suffix vocabulary for one ``modifier_suffixes.kind`` from the DB.

    R-31-1: the suffix grammar (side={Top,Right,Bottom,Left}, breakpoint=
    {Mobile,Tablet,Desktop}, unit={Unit}, corner={TL,TR,BL,BR}, state, variant) is
    DB-OWNED — hardcoding any of these literals in the resolvers is a violation.
    Cached per-kind (the vocabulary is process-stable). Spec 31 §4 (modifier_suffixes
    row) + §3.A step 4 (breakpoint) / Unit-companion derivation.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT suffix FROM modifier_suffixes WHERE kind = ? ORDER BY rowid",
            (kind,),
        ).fetchall()
    finally:
        conn.close()
    return tuple(s for (s,) in rows)


def unit_companion_attr(attr: str, conn: sqlite3.Connection) -> str | None:
    """Derive the ``…Unit`` companion attr name for a (possibly tier/side-suffixed)
    numeric attr — entirely from the DB suffix vocabulary (R-31-1, NO hardcoded
    suffix literals).

    A numeric box/typography attr stores its CSS unit on a shared companion attr:
    the per-area padding family (``contentPaddingTop`` / ``contentPaddingRight`` /
    ``contentPaddingTopTablet`` …) all share ONE ``contentPaddingUnit``. The
    companion is the base name with any breakpoint suffix THEN any side suffix
    stripped, with the DB ``unit`` suffix appended.

    Derivation (all suffix sets sourced from ``modifier_suffixes`` via the
    :func:`modifier_suffixes` accessor — no ``Top``/``Mobile``/etc. literals):
      1. strip a trailing breakpoint suffix (``Mobile``/``Tablet``/``Desktop``);
      2. then strip a trailing side suffix (``Top``/``Right``/``Bottom``/``Left``);
      3. append the DB ``unit`` suffix (``Unit``).

    ``conn`` is accepted for call-site symmetry with the other DB services (and to
    keep the signature stable); the suffix vocabulary itself is read via the cached
    module accessor. Returns ``None`` only if the DB has no ``unit`` suffix (a
    seeding error); the caller validates the derived name against the block schema,
    so a base that takes no unit simply fails that downstream ``validate`` check.
    """
    unit_suffixes = modifier_suffixes("unit")
    if not unit_suffixes:
        return None
    base = attr
    for kind in ("breakpoint", "side"):
        for sfx in modifier_suffixes(kind):
            if base.endswith(sfx) and len(base) > len(sfx):
                base = base[: -len(sfx)]
                break  # at most one suffix of each kind, longest-match irrelevant (disjoint)
    return f"{base}{unit_suffixes[0]}"


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
# is_class_section_block — Spec 22 §FR-31-3 exception 3 + D1 explicit flag
# ----------------------------------------------------------------------------
# Returns True iff the given block slug is registered in the `blocks` table
# with tier='class-section'. Used by the per-section convention voter to gate
# the literal-slug fast-path: only class-section blocks (sgs/hero, sgs/cta-section)
# may be returned from a section-scope SGS-BEM class signature; everything
# else falls through to gap-candidate routing (Stage 2 FR-31-4 default to
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
# scalar_media_attr_for — FR-31-19 composite scalar-media slot lookup
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
# R-31-1 compliance: no per-block slug literals.  Routing is driven entirely by
# the `block_attributes.role='scalar-media'` column and the `slots` aliases.


@functools.lru_cache(maxsize=256)
def has_scalar_media_attrs(block_slug: str) -> bool:
    """True if `block_slug` declares >=1 attr with role='scalar-media'.

    FR-31-19 gate (2026-06-01, corrected): the composite-interior router fires
    for any COMPOSITE that renders part of its interior itself as a scalar-media
    attr (sgs/hero.splitImage, sgs/testimonial-slider.sideImage) — NOT only
    class-section/section-root blocks (testimonial-slider is a composite but a
    content-block, not a section root). Gating on the PRESENCE of a scalar-media
    attr is precise: it covers every such composite AND naturally excludes blocks
    with no scalar-media attr (cta-section, info-box, product-card) so their
    interior routing is unchanged (resolves the cta-section over-fire risk).
    R-31-1: DB-driven, no slug literals; R-31-9: universal mechanism.
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
# Variant detection — FR-31-20 (D133 2026-06-01)
# ----------------------------------------------------------------------------
# A block with multiple layout variants (hero: standard/split/video/svg-animated)
# renders the correct variant ONLY when its variant-selector attr is set. The
# cloning converter populates a variant's CONTENT (e.g. the hero's split images)
# but does not set the variant attr → the block renders its DEFAULT. FR-31-20
# closes this DB-first: each variant block declares supports.sgs.variantAttr +
# variants in block.json (→ blocks.variant_attr + variant_slots via /sgs-update),
# and the converter detects the variant from what the DRAFT extracted this run.
#
#   variant_attr_for(slug)       → the selector attr name, or None.
#   detect_variant(slug, attrs)  → the variant whose discriminating slots best
#                                  match the draft's extracted attrs, or None.
#
# R-31-1 (DB-driven — no per-block dict/slug literal). R-31-9 (one mechanism, all
# variant blocks). The detector reads the draft's extracted attrs (NOT the block's
# stored attrs) → closes the stale-data hole the $is_split band-aid had.


@functools.lru_cache(maxsize=256)
def variant_attr_for(block_slug: str) -> str | None:
    """Return the variant-selector attr name for `block_slug`, or None.

    Reads blocks.variant_attr (populated by /sgs-update from block.json
    supports.sgs.variantAttr). None when the block declares no variants OR the
    column/row is absent → the detector then skips the block (no behaviour change).
    """
    if not block_slug:
        return None
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT variant_attr FROM blocks WHERE slug = ? AND source = 'sgs'",
            (block_slug,),
        ).fetchone()
    except sqlite3.OperationalError:
        # Column absent (pre-FR-31-20 DB) — soft-fail to None.
        row = None
    finally:
        conn.close()
    return row[0] if row and row[0] else None


@functools.lru_cache(maxsize=256)
def _variant_slots_map(block_slug: str) -> tuple:
    """Return ((variant_value, frozenset(discriminating slots)), ...) for a block.

    Reads the variant_slots table (populated by /sgs-update via set-difference).
    Cached per slug — the data is static for a pipeline run. Returns a tuple of
    pairs (hashable, lru_cache-friendly); detect_variant consumes it.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT variant_value, unique_slot FROM variant_slots WHERE block_slug = ?",
            (block_slug,),
        ).fetchall()
    except sqlite3.OperationalError:
        rows = []
    finally:
        conn.close()
    grouped: dict = {}
    for variant_value, unique_slot in rows:
        grouped.setdefault(variant_value, set()).add(unique_slot)
    return tuple((v, frozenset(slots)) for v, slots in grouped.items())


def _slot_extracted(value: object) -> bool:
    """True if `value` represents a slot the converter actually extracted.

    The detection signal is PRESENCE-of-a-meaningful-value, not truthiness: the
    lift paths (_route_composite_interior, lift_behavioural_attrs) only insert a
    key when they extracted something for it, so a present key is a real signal.
    A plain truthiness test would wrongly drop a legitimately-extracted numeric
    0 / boolean False / '0' (e.g. a variant whose discriminator is splitGap=0),
    flipping detection (qc-council 2026-06-01, Rater B). We therefore count any
    value EXCEPT None, empty string, and empty containers (which represent 'no
    real extraction' — e.g. a src-less image lifting to {} — rather than an
    intentional value).
    """
    if value is None or value == "":
        return False
    if isinstance(value, (dict, list, tuple, set, frozenset)) and len(value) == 0:
        return False
    return True


def detect_variant(block_slug: str, populated_attrs: dict) -> str | None:
    """Detect a block's variant from the draft's extracted attrs THIS run.

    For each variant, count how many of its DISCRIMINATING slots (variant_slots)
    were EXTRACTED into `populated_attrs` this run (presence of a meaningful
    value per _slot_extracted — NOT the block's stored attrs). Return the variant
    with the strictly-highest count.

    Returns None when:
      - the block declares no variant_slots, or
      - no variant scored above zero (nothing matched), or
      - the top score is a tie between >=2 variants (ambiguous — leave the
        block's default rather than guess).

    R-31-1 (DB-driven, no slug literal).
    """
    variants = _variant_slots_map(block_slug)
    if not variants:
        return None
    scores = sorted(
        (
            (sum(1 for slot in slots if _slot_extracted(populated_attrs.get(slot))), variant_value)
            for variant_value, slots in variants
        ),
        reverse=True,
    )
    top_count, top_variant = scores[0]
    if top_count == 0:
        _trace("variant_detect_miss", block_slug=block_slug, reason="no_slots_matched")
        return None
    # Ambiguity guard: a tie at the top means we cannot disambiguate → leave default.
    if len(scores) > 1 and scores[1][0] == top_count:
        tied = ",".join(v for cnt, v in scores if cnt == top_count)
        _trace("variant_detect_tie", block_slug=block_slug, top_count=top_count, tied=tied)
        return None
    _trace("variant_detect_hit", block_slug=block_slug, variant=top_variant, count=top_count)
    return top_variant


# ----------------------------------------------------------------------------
# equivalent_block_for — Spec 22 §FR-31-2.1 two-tier derivation
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
# FR-31-2.2 role-exclusion is applied BEFORE tier matching as a positive
# allowlist: return None when the attr's role is NOT classified
# 'content-bearing' on slot_synonyms.role_classification. Prevents the
# "typography looks like heading" trap (headlineFontSizeDesktop has
# canonical_slot='heading' but role='typography' → must NOT route content
# to a heading block). Per D85 the classification lives in the DB
# (slot_synonyms.role_classification), not in hardcoded Python frozensets
# (honours R-31-1; blub.db row 260).
#
# LRU cache (maxsize=2048): walker calls this function per-node-per-attr;
# canonical_slot + derived_selector + role are static for the lifetime of a
# pipeline run, so cached lookups are safe and necessary for the ≤2ms
# cache-warm performance threshold (FR-31-8).


@functools.lru_cache(maxsize=1)
def _content_bearing_roles() -> frozenset[str]:
    """Return the set of role names classified 'content-bearing' from the
    `roles` table (D99 2026-05-29 — was slot_synonyms.role_classification).

    D99 closes the link-href bug: the old column-based approach only set
    role_classification on slot_synonyms rows that HAD a given role; since
    no slot row had role='link-href', it was never seeded. The `roles` table
    is seeded from _ROLE_CLASSIFICATION_MAP which explicitly lists the
    content-bearing roles including link-href.

    Live row count is DB-authoritative (10 as of 2026-07-05: text-content,
    image-object, content, link-href, identity, rating + the 4 icon-* roles) —
    never hardcode the set; this accessor IS the source (R-31-1).
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


@functools.lru_cache(maxsize=1)
def _slot_alias_to_default_attrs() -> dict[str, dict]:
    """Return {alias_lowercase: default_attrs_dict} from element-scope slots that
    carry `standalone_block_default_attrs` (JSON). Mirrors `_slot_alias_to_standalone`
    alias expansion. Lets a slot SET attrs on its emitted block — e.g. the
    `button-primary`/`buttonSecondary`/`button-outline` slots each resolve to
    sgs/button AND set inheritStyle to the matching theme preset, and the parked
    `subheading` → sgs/heading{headingRole:'subheading'} routing. Added 2026-06-03."""
    import json
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT slot_name, aliases, standalone_block_default_attrs FROM slots "
            "WHERE scope='element' AND standalone_block_default_attrs IS NOT NULL "
            "AND standalone_block_default_attrs != '' ORDER BY slot_name"
        ).fetchall()
    except sqlite3.OperationalError:
        return {}  # column absent on older DBs — no defaults
    finally:
        conn.close()
    out: dict[str, dict] = {}

    def _put(term: str, attrs: dict) -> None:
        key = term.lower()
        out.setdefault(key, attrs)
        nh = key.replace("-", "")
        if nh and nh != key:
            out.setdefault(nh, attrs)

    for slot_name, aliases_json, dattrs_json in rows:
        try:
            attrs = json.loads(dattrs_json)
        except (ValueError, TypeError):
            continue
        if not isinstance(attrs, dict) or not attrs:
            continue
        _put(slot_name, attrs)
        if aliases_json:
            try:
                for alias in json.loads(aliases_json):
                    _put(alias, attrs)
            except (ValueError, TypeError):
                pass
    return out


def slot_default_attrs_for(sgs_classes: list[str]) -> dict:
    """Per-slot default attrs for the first sgs BEM element resolving to a slot that
    carries defaults (mirrors resolve_slug_from_bem Path 2 element matching, incl.
    the compound-element prefix-strip). E.g. `__buttonSecondary` →
    {'inheritStyle':'secondary'}. Empty dict when none. The walker applies these via
    setdefault so any draft-extracted value wins (R-31-1 DB-driven, R-31-9 universal)."""
    dmap = _slot_alias_to_default_attrs()
    if not dmap:
        return {}
    for cls in sorted(c for c in sgs_classes if c.startswith("sgs-")):
        bem = parse_sgs_bem(cls)
        if bem is None or not bem.element:
            continue
        hit = dmap.get(bem.element.lower())
        if hit:
            return dict(hit)
        if "-" in bem.element:  # compound element → try each segment (mirror Path 2b)
            for seg in bem.element.lower().split("-"):
                hit = dmap.get(seg)
                if hit:
                    return dict(hit)
    return {}


@functools.lru_cache(maxsize=1)
def inherit_style_presets() -> frozenset:
    """The set of `inheritStyle` preset values defined by the button-preset slots
    (derived from slots.standalone_block_default_attrs — e.g. {'primary','secondary',
    'outline'}). DB-driven so a BEM modifier matching one (`.sgs-button--secondary`)
    can set inheritStyle without a hardcoded list. Added 2026-06-03."""
    vals: set[str] = set()
    for attrs in _slot_alias_to_default_attrs().values():
        v = attrs.get("inheritStyle")
        if isinstance(v, str) and v:
            vals.add(v)
    return frozenset(vals)


def inherit_style_for_modifier(mod: str, block_slug: str | None) -> str | None:
    """Resolve a BEM style ``--modifier`` that is NOT itself a preset value to an
    inheritStyle preset via the slots alias→default_attrs channel (R-31-1).

    Probes the DB-declared alias vocabulary with the modifier compounded with the
    block's identity token (``'ghost'`` on ``sgs/button`` → ``ghost-button`` /
    ``button-ghost`` / no-hyphen variants), mirroring the compound-element segment
    convention used by ``_slot_default_attrs_for_classes``. Returns the preset
    string or None. A new synonym is a slots ``aliases`` seed — never a code
    branch. (QC fix 2026-07-05: replaces the assembly.py hardcoded
    ``'ghost'→'outline'`` branch, whose own comment admitted it was shaped to
    evade cheat-gate Check #9.)
    """
    if not mod:
        return None
    dmap = _slot_alias_to_default_attrs()
    if not dmap:
        return None
    mod_l = mod.lower()
    # COMPOUND probes ONLY (reviewer M1 hardening, 2026-07-05): the alias map is
    # GLOBAL (not block-scoped), so a bare-modifier probe would let a future
    # bare alias row leak across every string-inheritStyle block. Requiring the
    # block-identity compound makes block-scoping a structural guarantee, not a
    # DB-seeding discipline.
    probes: list[str] = []
    if block_slug and "/" in block_slug:
        ident = block_slug.split("/", 1)[1].lower()
        probes = [f"{mod_l}-{ident}", f"{ident}-{mod_l}"]
    for probe in probes:
        hit = dmap.get(probe) or dmap.get(probe.replace("-", ""))
        if hit:
            v = hit.get("inheritStyle")
            if isinstance(v, str) and v:
                return v
    return None


@functools.lru_cache(maxsize=2048)
def emit_shape_for(block_slug: str, attr_name: str) -> str | None:
    """Return the nested-vs-child shape for a CONTENT attr: 'nested' | 'child' | None.

    Spec 31 §13.3 FR-31-2.6 (2026-07-04). The per-attr fork that REPLACES the
    block-level `has_inner_blocks` dispatch:
      - 'nested' → the block's own render emits this attr as its element → lift the
        draft content into the parent's scalar/array attr (processed per its IDENTITY,
        `equivalent_block_for`).
      - 'child'  → the content lives in the `$content` region → emit a child InnerBlock
        of the identity's standalone_block + recurse.
      - None     → not a content attr, or `emit_shape` not seeded (a non-content role,
        or a block the seeder flagged as a suspected parse failure). A None on a genuine
        content unit is a tracked GAP for the caller, never a silent drop (Rule 4) —
        enforced at walk.py leg 2 since D277 (2026-07-05).

    Seeding state (verified D277): every sgs/* content-role row is seeded
    (139/139 — 106 nested + 33 child). The only NULL rows are core/* blocks,
    unseeded BY DESIGN: the seeder derives from block SOURCE (render.php/
    save.js), which core blocks don't have in this repo — and no draft element
    can resolve to a core block through the walk (slots.standalone_block has
    zero core/* targets), so those rows are unreachable, not a gap.

    Source-of-truth: `block_attributes.emit_shape`, seeded from block SOURCE by
    `/sgs-update` (`_populate_emit_shape`) — read here as a plain DB fact (R-31-1),
    not a live PHP scan.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT emit_shape FROM block_attributes WHERE block_slug = ? AND attr_name = ?",
            (block_slug, attr_name),
        ).fetchone()
    finally:
        conn.close()
    return row[0] if row and row[0] in ("nested", "child") else None


@functools.lru_cache(maxsize=2048)
def equivalent_block_for(block_slug: str, attr_name: str) -> str | None:
    """Return the standalone block slug if (block_slug, attr_name) is block-equivalent,
    else None.

    Spec 22 §FR-31-2.1 two-tier derivation + §FR-31-2.2 role-exclusion.
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

    # FR-31-2.2 role-exclusion as positive-allowlist (D85 2026-05-27 — moved
    # from hardcoded frozenset to DB-driven query of slot_synonyms.role_classification
    # per Rater B finding; honours R-31-1).
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
# Commit 2 — cross-node routing helpers (FR-31-5.3, 2026-06-10)
# ----------------------------------------------------------------------------
# Three pure DB-lookup functions required by the cross-node interior box-CSS
# routing step (`_route_interior_css_to_parent_slot`) described in
# STAGE1-DESIGN.md §Commit 2.  None of these functions modify the DB or the
# converter state — they are pure read-only lookups.
#
# Background:
#   The walker encounters a child DOM node whose BEM element belongs to a slot
#   on the PARENT composite block (e.g. `.sgs-hero__content`).  Before routing
#   the child's CSS to the parent, the walker must decide:
#     (a) Is the slot CONTENT-BEARING?  If yes → the CSS belongs to a child
#         InnerBlock, not to the parent's per-slot layout attr (D1 path).
#     (b) If NOT content-bearing → which parent attr owns this CSS for the
#         given layer (OUTER / CONTENT / GRID)?
#     (c) Does the parent have a dedicated child block that resolves this
#         element token?  (parent-scoped child-block resolution, FR-31-5.3
#         clause 5.)
#
# Design decisions used here:
#   DEC-1 (D194) — `canonical_slot` is NOT the structural-CSS routing key.
#   DEC-3 (D194) — Layer prefix families: OUTER = '' (unprefixed wrapper attrs),
#                  CONTENT = 'content', GRID = 'gridItem'.
#   R-31-1        — Pure DB lookups; no hardcoded per-slug dicts.
#   R-31-9        — Universal: applies to all 29 container-mirror composites.


@functools.lru_cache(maxsize=4096)
def slot_has_equivalent_block(block_slug: str, slot_name: str) -> bool:
    """CONTENT-fork predicate: does `block_slug` have a content-bearing attr
    tagged with `canonical_slot = slot_name`?

    Purpose (Spec 22 FR-31-5.3 / STAGE1-DESIGN.md §Commit 2 step 2):
        Before routing a child element's CSS to the parent's per-slot attr group,
        the walker must confirm the slot is NOT already served by a child InnerBlock
        (the D1 content path).  This predicate fires the CONTENT fork when True —
        meaning the CSS stays with the child block, not the parent's layout attrs.

    Contract:
        SELECT 1 FROM block_attributes
        WHERE block_slug = ? AND canonical_slot = ?
          AND role IN (<content-bearing roles>)
        LIMIT 1

    The query is SLOT-KEYED (``canonical_slot``), NOT attr-keyed.  The existing
    ``equivalent_block_for(block_slug, attr_name)`` function queries
    ``WHERE block_slug=? AND attr_name=?``; passing a slot name to it returns None
    for every call because slot names are never stored in ``attr_name``.  That
    is exactly the bug class this predicate exists to avoid.

    Content-bearing role set (DB-authoritative, queried live via
    ``_content_bearing_roles()``; do NOT duplicate here — R-31-1):
        text-content, image-object, content, link-href, identity
    Evidence: ``_ROLE_CLASSIFICATION_MAP`` in this module + the ``roles`` table
    seeded by ``_migrate_roles_table()``.

    Returns False for ``role='layout'`` rows (layout is NOT content-bearing;
    e.g. ``sgs/hero.contentPaddingTop`` has ``canonical_slot='content'`` +
    ``role='layout'`` and MUST return False so the CSS is routed to the parent's
    ``contentPadding*`` attrs, not emitted as a child InnerBlock).

    Args:
        block_slug:  Fully-qualified SGS slug, e.g. ``'sgs/hero'``.
        slot_name:   Canonical slot name, e.g. ``'heading'``, ``'content'``,
                     ``'media'``.

    Returns:
        True  — at least one attr on ``block_slug`` has ``canonical_slot=slot_name``
                AND its role is content-bearing.
        False — no such attr exists, OR all matching attrs have non-content-bearing
                roles (layout / styling / behaviour / NULL).
    """
    if not block_slug or not slot_name:
        return False

    content_roles = _content_bearing_roles()
    if not content_roles:
        # Migration soft-failed — safe default: treat as non-content (layout path).
        return False

    # Build a parameterised IN clause from the frozenset.
    # SQLite supports up to 999 parameters; the role set has at most 5 entries.
    placeholders = ",".join("?" for _ in content_roles)
    params = (block_slug, slot_name, *content_roles)

    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            f"SELECT 1 FROM block_attributes "
            f"WHERE block_slug = ? AND canonical_slot = ? "
            f"AND role IN ({placeholders}) "
            f"LIMIT 1",
            params,
        ).fetchone()
    except sqlite3.OperationalError:
        return False
    finally:
        conn.close()

    result = row is not None
    _trace(
        "slot_has_equivalent_block",
        block_slug=block_slug,
        slot_name=slot_name,
        result=result,
    )
    return result


# Layer prefix map (DEC-3, D194).  These are the ONLY three permitted layer
# names for ``attr_for_layer_property``.  The values are the camelCase prefix
# that the block's attr names carry for that layer.
# R-31-1 permitted-constant: these are CSS-architecture constants (the 3-layer
# model from Spec 22 FR-31-21), not per-block data.  There is no DB table for
# layer prefixes.
_LAYER_PREFIXES: dict[str, str] = {
    "OUTER":   "",          # unprefixed wrapper attrs: maxWidth, gap, padding*
    "CONTENT": "content",   # content-area attrs:       contentWidth, contentPadding*
    "GRID":    "gridItem",  # per-grid-item attrs:      gridItemPadding, gridItemShadow
}


def layer_attr_prefix(layer: str) -> str | None:
    """Return the camelCase attr prefix for a structural layer (OUTER/CONTENT/GRID).

    The single public accessor for ``_LAYER_PREFIXES`` (GRID -> 'gridItem') so callers
    identify a layer's attr family WITHOUT hardcoding the prefix literal (R-31-1). Used
    by build_block_markup to apply setdefault (CSS-pass-wins) semantics to the uniform
    grid-item fold, mirroring the frozen ``_lift_uniform_grid_item_css`` setdefault
    contract (convert.py:2888). Returns None for an unknown layer.
    """
    return _LAYER_PREFIXES.get(layer)

# CSS property equivalence for the CONTENT layer: max-width on a content-area
# element is semantically the content-width constraint, equivalent to ``width``
# for attr-matching purposes.  This mirrors the existing converter logic at
# convert.py line 3800 where ``max-width`` is lifted directly into
# ``contentWidth``.  (R-31-1 permitted-constant: CSS standard knowledge.)
_CONTENT_LAYER_MAX_WIDTH_EQUIV: frozenset[str] = frozenset({"max-width", "width"})


class AmbiguousLayerAttrError(RuntimeError):
    """MF-4 (Spec 31 §3 step 3 / FR-31-2.8.4): a (block, layer, css_property)
    lookup matched ≥2 registered attrs. A silent rowid-first pick between them
    is insert-order-fragile and misroutes CSS — fail loud instead (raise, never
    assert, STOP-27). Resolution: a ``block_selectors.element`` disambiguator
    or removing the duplicate attr registration."""


@functools.lru_cache(maxsize=2048)
def attr_for_layer_property(
    block_slug: str,
    layer: str,
    css_property: str,
) -> "str | None":
    """Per-block layer → attr resolver for structural box CSS.

    Given ``(block_slug, layer, css_property)``, returns the block's ACTUAL
    ``attr_name`` from its registered attrs for that CSS property at that layer.

    Purpose (Spec 22 FR-31-5.3 / STAGE1-DESIGN.md §Commit 2 step 2, DEC-1/DEC-3):
        When the CONTENT fork is False (the slot is NOT content-bearing), the
        cross-node step lifts the child element's structural box CSS onto the
        parent composite's layer-specific attr.  This function resolves WHICH
        attr receives the value.

    Mechanism (name-free, per DEC-1 D194):
        The destination attr is found by layer-prefix + ``property_suffixes``
        membership — never by matching ``canonical_slot``.  This avoids the
        ``canonical_slot``-as-routing-key trap (see WRAPPER-CSS-ROUTING-DESIGN-
        GATE.md).

    Layer → attr prefix map (DEC-3, D194):
        OUTER    → '' (unprefixed)  e.g. ``maxWidth``, ``gap``, ``paddingTop``
        CONTENT  → 'content'        e.g. ``contentWidth``, ``contentPaddingTop``
        GRID     → 'gridItem'       e.g. ``gridItemPadding``, ``gridItemShadow``

    Algorithm (per-block lookup, NOT prefix concatenation):
        1. Resolve the layer prefix from ``_LAYER_PREFIXES``.
        2. Collect ALL ``property_suffixes`` rows for ``css_property`` (ordered
           by rowid for determinism, matching ``attr_for_property``).
           For the CONTENT layer and ``max-width``, ALSO include ``property_suffixes``
           rows for ``width`` — ``max-width`` on a content-area element is
           semantically the content-width constraint and maps to ``contentWidth``
           (mirrors convert.py line 3800; ``_CONTENT_LAYER_MAX_WIDTH_EQUIV``).
        3. For each (suffix, role) row, derive the camelCase attr candidate:
             • CONTENT/GRID layers: prefix + suffix[0].lower() + suffix[1:]
               e.g. (CONTENT, 'Width') → 'contentWidth'
             • OUTER layer: suffix[0].lower() + suffix[1:]
               e.g. (OUTER, 'MaxWidth') → 'maxWidth'
        4. Check whether ``block_slug`` has that attr in its ``block_attributes``.
           First match wins (preserves ``property_suffixes`` rowid ordering).
        5. Return the matched ``attr_name``, or None when the block has no matching
           attr for this layer/property combination.
           Callers log a gap-candidate on None (flag-not-drop, FR-31-21 step 6).

    Rationale for per-block lookup (NOT string concat):
        Attr names vary per block.  Hero historically used ``contentMaxWidth*``
        where other blocks use ``contentWidth``; a ``{prefix}+{suffix}`` concat
        cannot generate both from a single ``max-width`` signal without knowing
        which suffix the block registered its attr under.  The per-block lookup
        lets the DB tell us the actual attr name.  As of commit e49ff126 (2026-06-09)
        hero's ``contentMaxWidth*`` was deduped to ``contentWidth``, but the per-
        block lookup is retained for robustness against any future variance.

    Args:
        block_slug:    Fully-qualified SGS slug, e.g. ``'sgs/hero'``.
        layer:         One of ``'OUTER'``, ``'CONTENT'``, ``'GRID'``.
        css_property:  CSS property name, e.g. ``'max-width'``, ``'padding-top'``.

    Returns:
        The block's ``attr_name`` that owns ``css_property`` at ``layer``, or None.

    Examples:
        attr_for_layer_property('sgs/hero', 'CONTENT', 'max-width')   → 'contentWidth'
        attr_for_layer_property('sgs/container', 'OUTER', 'max-width') → 'maxWidth'
        attr_for_layer_property('sgs/hero', 'OUTER', 'padding-top')   → None
            (sgs/hero's paddingTop is NOT an OUTER-layer attr — hero exposes padding
            via contentPadding*, not unprefixed paddingTop)
        attr_for_layer_property('sgs/banana', 'CONTENT', 'gap')        → None
            (block does not exist)
    """
    if not block_slug or not css_property:
        return None

    prefix = _LAYER_PREFIXES.get(layer)
    if prefix is None:
        # Unknown layer name — caller error; soft-fail.
        _trace(
            "attr_for_layer_property_unknown_layer",
            block_slug=block_slug,
            layer=layer,
            css_property=css_property,
        )
        return None

    # Collect property_suffixes rows for the given css_property.
    # For CONTENT layer + max-width, also include 'width' rows so that
    # max-width on a content element maps to contentWidth (mirrors convert.py:3800).
    css_properties_to_try: list[str] = [css_property]
    if layer == "CONTENT" and css_property in _CONTENT_LAYER_MAX_WIDTH_EQUIV:
        # Add the complementary property so both 'max-width' and 'width' are
        # tried (deduplication via seen-set in the loop below).
        for equiv in _CONTENT_LAYER_MAX_WIDTH_EQUIV:
            if equiv != css_property:
                css_properties_to_try.append(equiv)

    conn = sqlite3.connect(SGS_DB)
    try:
        # Fetch suffix rows for each css_property candidate, preserving
        # original property rowid order (primary css_property first, then equiv).
        all_suffix_rows: list[tuple[str, str]] = []
        seen_suffixes: set[str] = set()
        for cp in css_properties_to_try:
            rows = conn.execute(
                "SELECT suffix, role FROM property_suffixes "
                "WHERE css_property = ? ORDER BY rowid",
                (cp,),
            ).fetchall()
            for suffix, role in rows:
                if suffix and suffix not in seen_suffixes:
                    seen_suffixes.add(suffix)
                    all_suffix_rows.append((suffix, role))
    except sqlite3.OperationalError:
        return None
    finally:
        conn.close()

    if not all_suffix_rows:
        return None

    # Load this block's attr map (cached by block_attrs).
    block_attr_map = block_attrs(block_slug)
    if not block_attr_map:
        return None

    # Derive candidate attr names and collect EVERY match (MF-4, Spec 31 §3
    # step 3 / FR-31-2.8.4: when ≥2 candidate attrs exist for one (block,
    # layer, property), FAIL LOUD — never silently rowid-pick the first).
    matches: list[str] = []
    for suffix, _role in all_suffix_rows:
        # Build camelCase suffix (PascalCase suffix → camelCase).
        camel_suffix = suffix[0].lower() + suffix[1:]

        if prefix:
            # CONTENT or GRID layer: prefix the suffix.
            candidate = prefix + suffix[0].upper() + suffix[1:]
        else:
            # OUTER layer: suffix IS the full attr name (camelCase).
            candidate = camel_suffix

        if candidate in block_attr_map and candidate not in matches:
            matches.append(candidate)

    if len(matches) > 1:
        # MF-4 hard guard: an insert-order rowid-pick between two registered
        # attrs would be a silent misroute. Empirically ZERO (block, layer,
        # property) combos are ambiguous on the live DB (enumerated
        # 2026-07-04), so this raise is behaviour-identical today; it fires
        # only if a future block registers both attrs of an ambiguous pair —
        # the fix is a block_selectors.element disambiguator, not a pick.
        raise AmbiguousLayerAttrError(
            f"MF-4: ({block_slug}, {layer}, {css_property}) resolves to "
            f"{len(matches)} candidate attrs {matches} — refusing to "
            f"rowid-pick. Add a block_selectors.element disambiguator or "
            f"remove the duplicate attr registration."
        )

    if matches:
        _trace(
            "attr_for_layer_property_hit",
            block_slug=block_slug,
            layer=layer,
            css_property=css_property,
            attr_name=matches[0],
        )
        return matches[0]

    _trace(
        "attr_for_layer_property_miss",
        block_slug=block_slug,
        layer=layer,
        css_property=css_property,
    )
    return None


@functools.lru_cache(maxsize=512)
def attr_for_area_property(
    block_slug: str,
    area: str,
    css_property: str,
) -> "str | None":
    """Per-block GRID-PER-AREA → attr resolver (the `<areaName>+<suffix>` layer).

    Bean design steer 2026-06-11 (next-session-prompt Task 3 / FR-31-21 per-area
    grid layer candidate): a composite that renders named grid areas itself
    (hero: "content" / "media") exposes per-AREA styling attrs whose names are
    DERIVABLE as ``areaName + PropertySuffix`` — ``content``+``PaddingTop`` →
    ``contentPaddingTop``; ``media``+``PaddingTop`` → ``mediaPaddingTop``.
    NOTE the deliberate distinction from the CONTENT layer: the hero's
    ``contentPadding*`` is padding on the grid COLUMN whose area name is
    "content" — NOT the container-mirror's content-width band (name collision;
    Bean caught it 2026-06-11).

    Same name-free mechanism as ``attr_for_layer_property`` (D194): the suffix
    comes from ``property_suffixes`` for the css_property; the candidate is
    checked against the block's REAL registered attrs; first match wins; None
    on miss (caller logs a gap-candidate — flag-not-drop). Universal: works for
    any block + any area name with zero per-block intelligence.
    """
    if not block_slug or not area or not css_property:
        return None

    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT suffix FROM property_suffixes "
            "WHERE css_property = ? ORDER BY rowid",
            (css_property,),
        ).fetchall()
    except sqlite3.OperationalError:
        return None
    finally:
        conn.close()

    if not rows:
        return None

    block_attr_map = block_attrs(block_slug)
    if not block_attr_map:
        return None

    area_prefix = area[0].lower() + area[1:]
    for (suffix,) in rows:
        if not suffix:
            continue
        candidate = area_prefix + suffix[0].upper() + suffix[1:]
        if candidate in block_attr_map:
            _trace(
                "attr_for_area_property_hit",
                block_slug=block_slug,
                area=area,
                css_property=css_property,
                attr_name=candidate,
            )
            return candidate

    _trace(
        "attr_for_area_property_miss",
        block_slug=block_slug,
        area=area,
        css_property=css_property,
    )
    return None


@functools.lru_cache(maxsize=256)
def child_block_for_parent_token(
    parent_block: str,
    element_token: str,
) -> "str | None":
    """Parent-scoped child-block resolver (FR-31-5.3 clause 5).

    Given ``(parent_block, element_token)``, returns the child block slug whose
    DB-derived token matches ``element_token`` within ``parent_block``'s roster,
    or None when no match exists.

    Purpose (STAGE1-DESIGN.md §Commit 2 build contract, parent-scoped resolution):
        The global ``slots`` alias table mis-resolves child-item tokens when the
        parent has a dedicated child block.  Two confirmed collisions:

          • ``sgs/accordion`` + ``item``  → global alias ``card.item`` → ``sgs/info-box``
            (wrong); correct → ``sgs/accordion-item``.
          • ``sgs/form`` + ``step``       → step alias → ``sgs/process-steps``
            (wrong); correct → ``sgs/form-step``.

        A parent-scoped pre-check that beats the global alias resolves both
        without a per-slug Python branch (R-31-1 / R-31-9).

    Mechanism — pure DB lookup via ``blocks.parent_block`` (18 rows as of 2026-06-10):
        For each child registered under ``parent_block``, a token is derived
        from the child slug:
          • If the child's name portion (after ``sgs/``) starts with the parent's
            name portion followed by ``-``, the token is the REMAINDER after that
            prefix.  e.g. ``sgs/accordion-item`` under ``sgs/accordion`` →
            token = ``'item'``; ``sgs/form-step`` under ``sgs/form`` →
            token = ``'step'``; ``sgs/form-field-text`` under ``sgs/form`` →
            token = ``'field-text'``.
          • Otherwise the token is the child's full name after ``sgs/``.
            e.g. ``sgs/tab`` under ``sgs/tabs`` → token = ``'tab'``
            (``'tabs-tab'`` does not exist; the child simply has a shorter name).

        This derivation is performed in SQL via:
          ``CASE WHEN substr(slug, 5) LIKE substr(parent_block, 5) || '-%'
               THEN substr(slug, length(parent_block) + 2)
               ELSE substr(slug, 5)
           END``

        The SQL derivation is verified against all 18 ``blocks.parent_block`` rows
        at implementation time — every pair resolves correctly (audit below).

        Precedence (STAGE1-DESIGN.md §Commit 2):
            Parent-scoped row beats global alias.  The walker calls this function
            as a PRE-CHECK before consulting the global ``slots`` table.

        Cache key: (parent_block, element_token).  NOT threaded into the LRU-
        cached ``_resolve_slug_from_bem_tuple`` core (which is keyed on the class
        tuple only — parent-aware resolution is a separate walker pre-check per
        the build contract).

    DB parent_block audit (all 18 rows, verified 2026-06-10):
        parent=sgs/accordion    token=item           → sgs/accordion-item   ✓
        parent=sgs/form         token=field-address  → sgs/form-field-address ✓
        parent=sgs/form         token=field-checkbox → sgs/form-field-checkbox ✓
        parent=sgs/form         token=field-consent  → sgs/form-field-consent ✓
        parent=sgs/form         token=field-date     → sgs/form-field-date  ✓
        parent=sgs/form         token=field-email    → sgs/form-field-email ✓
        parent=sgs/form         token=field-file     → sgs/form-field-file  ✓
        parent=sgs/form         token=field-hidden   → sgs/form-field-hidden ✓
        parent=sgs/form         token=field-number   → sgs/form-field-number ✓
        parent=sgs/form         token=field-phone    → sgs/form-field-phone ✓
        parent=sgs/form         token=field-radio    → sgs/form-field-radio ✓
        parent=sgs/form         token=field-select   → sgs/form-field-select ✓
        parent=sgs/form         token=field-text     → sgs/form-field-text  ✓
        parent=sgs/form         token=field-textarea → sgs/form-field-textarea ✓
        parent=sgs/form         token=field-tiles    → sgs/form-field-tiles ✓
        parent=sgs/form         token=review         → sgs/form-review      ✓
        parent=sgs/form         token=step           → sgs/form-step        ✓
        parent=sgs/tabs         token=tab            → sgs/tab              ✓

    Args:
        parent_block:   Fully-qualified slug of the resolved ancestor, e.g.
                        ``'sgs/accordion'``.
        element_token:  BEM element name extracted from the child class, e.g.
                        ``'item'``, ``'step'``, ``'tab'``.

    Returns:
        The child block slug (e.g. ``'sgs/accordion-item'``), or None when the
        parent has no child block matching ``element_token``.
    """
    if not parent_block or not element_token:
        return None

    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            """
            WITH child_tokens AS (
                SELECT slug,
                    CASE
                        WHEN substr(slug, 5) LIKE substr(parent_block, 5) || '-%'
                        THEN substr(slug, length(parent_block) + 2)
                        ELSE substr(slug, 5)
                    END AS derived_token
                FROM blocks
                WHERE parent_block = ?
            )
            SELECT slug FROM child_tokens WHERE derived_token = ?
            LIMIT 1
            """,
            (parent_block, element_token),
        ).fetchone()
    except sqlite3.OperationalError:
        # parent_block column absent (pre-D108 DB) — soft-fail.
        return None
    finally:
        conn.close()

    if row is None:
        _trace(
            "child_block_for_parent_token_miss",
            parent_block=parent_block,
            element_token=element_token,
        )
        return None

    child_slug = row[0]
    _trace(
        "child_block_for_parent_token_hit",
        parent_block=parent_block,
        element_token=element_token,
        child_slug=child_slug,
    )
    return child_slug


# ----------------------------------------------------------------------------
# atomic_tag_map — Spec 22 §14 Appendix B / Commit 1.2
# ----------------------------------------------------------------------------
# DB-driven replacement for the legacy hardcoded ATOMIC_TAG_MAP dict in
# _retired/convert_pre_spec22.py (9-entry dict, violated R-31-1).
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
# R-31-1 compliance (2026-05-28 hardening):
#   No hardcoded SGS routing dict in code. The html-tag→SGS-block bridge data
#   lives in the html_tag_to_core_block DB table, seeded at module load from the
#   version-controlled data file scripts/data/atomic-tag-map.json. Runtime path
#   queries the DB only.


@functools.lru_cache(maxsize=1)
def _blocks_replaces_reverse() -> dict[str, str]:
    """Return {core_block_slug: sgs_block_slug} from blocks.replaces (status='built').

    blocks.replaces stores a COMMA-SEPARATED list of core slugs per row — one SGS
    block may replace several core blocks (many-core→one-sgs, e.g. sgs/media replaces
    'core/image,core/video,core/audio'); the legacy 6 store a single slug. A core
    block resolves to exactly one SGS block; if two SGS blocks claim the same core
    slug the first alphabetically wins (ORDER BY slug ASC) for determinism.
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
    for replaces_raw, sgs_slug in rows:
        for core_slug in (t.strip() for t in (replaces_raw or "").split(",")):
            # First writer wins (ORDER BY slug ASC gives determinism).
            if core_slug and core_slug not in out:
                out[core_slug] = sgs_slug
    return out


@functools.lru_cache(maxsize=1)
def atomic_tag_map() -> dict[str, str]:
    """Return {html_tag: block_slug} for all HTML tags the universal walker may encounter.

    Fully DB-driven (R-31-1 compliance, 2026-05-28 hardening). Reads
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
# array_item_slot_for — Spec 22 §FR-31-2.5 / Commit 1.3
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
#     signature for the slot (per FR-31-2.5 §4). This helper returns None
#     for that case — the walker handles the BEM-fallback path itself.
#
# Replaces hardcoded ARRAY_LIFT_PATTERNS dict at _retired/convert_pre_spec22.py:1008-1031
# (R-31-1 compliance).

@functools.lru_cache(maxsize=2048)
def array_item_slot_for(block_slug: str, attr_name: str) -> str | None:
    """Return the canonical_slot for the items of an array-typed attribute.

    Returns:
        - The canonical_slot string when populated (Tier A — walker emits
          one child block per item via equivalent_block_for + standalone_block).
        - None when canonical_slot is NULL on a true array attr (Tier B —
          walker falls back to children's BEM signature per FR-31-2.5 §4).
        - None when the attribute does not exist OR is not array-typed
          (caller should not have invoked this helper for non-array attrs).

    The role gate is INCLUSIVE here (unlike equivalent_block_for): array
    attrs whose role is None but canonical_slot is populated still resolve.
    This matches the FR-31-2.5 §1 statement: "If the parent block's attr
    has canonical_slot populated → that's the array slot's content type".

    Caller (the walker) is responsible for then resolving canonical_slot via
    equivalent_block_for or standalone_block_for to get the emitted block slug.

    Examples:
        array_item_slot_for('sgs/product-card', 'packSizes') -> None
            (Tier B — canonical_slot=NULL; packSizes is OUT of array-resolver
            scope: render.php reads it 0×, not a per-item content repeater.
            Council MF-4, 2026-06-28. Previous docstring incorrectly showed
            -> 'button'; the live DB has canonical_slot=NULL.)
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


def array_item_field_names(block_slug: str, attr_name: str) -> tuple[str, ...]:
    """The item field NAMES for an array attr, in declared order.

    The block's own data model — seeded from block.json
    ``attributes.<attr>.items.properties`` into ``array_item_schema`` by
    sgs-update-v2.py (2026-07-02). The DB-recognition array field-lift
    (``converter/resolvers/array_content.py``) reads these + derives each field's
    slot/role from the DB. Returns () when the table/rows are absent (pre-reseed
    safe — the resolver then no-ops for that attr, never errors).
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT field_key FROM array_item_schema "
            "WHERE block_slug = ? AND array_attr = ? ORDER BY field_order",
            (block_slug, attr_name),
        ).fetchall()
    except sqlite3.OperationalError:
        return ()  # table not created yet (no reseed) — safe no-op
    finally:
        conn.close()
    return tuple(r[0] for r in rows)


def array_item_field_schema(block_slug: str, attr_name: str) -> tuple[tuple[str, "str | None"], ...]:
    """(field_key, declared_role) pairs for an array attr, in declared order.

    ``role`` is the extraction role DECLARED in ``block.json``
    ``items.properties.<field>.role`` (FR-31-2.1a — read from the block's data
    model, never name-parsed) and seeded into ``array_item_schema.role`` by
    sgs-update-v2.py. It is NULL when the field declares no role — the resolver
    then falls back to its DB name→slot→role derivation for that field. Returns
    () when the table/column is absent (pre-reseed safe — no-op, never errors).
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT field_key, role FROM array_item_schema "
            "WHERE block_slug = ? AND array_attr = ? ORDER BY field_order",
            (block_slug, attr_name),
        ).fetchall()
    except sqlite3.OperationalError:
        return ()  # table/column absent (no reseed) — safe no-op
    finally:
        conn.close()
    return tuple((r[0], r[1]) for r in rows)


# ============================================================================
# Phase 1.4 Pass 1 — Universal walker helper functions
# ============================================================================
# These three helpers are consumed by the universal walker (Pass 2).
# They encode the three core walker operations without any per-block branches:
#   1. resolve_slug_from_bem  — FR-31-1 BEM→slug resolution
#   2. lift_behavioural_attrs — FR-31-2 scalar attr lifting
#   3. emit_sgs_container_wrapping — FR-31-3 exception 3 + FR-31-4
#
# R-31-1 compliance: no hardcoded SGS routing dicts; every routing decision
# queries the DB or delegates to existing helpers. No `if slug == 'sgs/X'`
# conditionals anywhere in this section.
# ============================================================================


# ----------------------------------------------------------------------------
# Helper 1 — resolve_slug_from_bem
# Spec 22 §FR-31-1 multi-class BEM→slug resolution
# ----------------------------------------------------------------------------

@functools.lru_cache(maxsize=4096)
def _resolve_slug_from_bem_tuple(classes_tuple: tuple[str, ...]) -> str | None:
    """Core resolution logic — operates on a frozen sorted tuple for caching.

    Multi-class disambiguation rule (FR-31-1 + FR-31-15):
      Path 1 — bare block class (no __element suffix) present:
        Each class whose BemParse.element is None is a block-root candidate.
        Filter to those where `sgs/<block>` is a registered built slug, then
        DEDUPE (a bare class + its own --modifier class parse to the same
        block — not ambiguity).
        If exactly one distinct slug → return it.
        If multiple DISTINCT slugs → LOUD no-match (FR-31-15 as AMENDED D278):
          trace `bem_resolve_ambiguous_loud` + return None so the node falls
          to the container-default/pass-through path for manual review. The
          old capability-rank silent pick is retired (never fired on distinct
          blocks in recorded history).
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
        # FR-31-15 (AMENDED D278, Bean-directed 2026-07-05): DEDUPE first —
        # a bare class and its own --modifier class both parse to the same
        # block, so same-slug duplicates are NOT ambiguity (every historically
        # recorded "tie" was this shape). A residual tie between DISTINCT
        # blocks is a draft-authoring ambiguity: go LOUD and return no match —
        # the node falls to the container-default/pass-through path (content
        # preserved by recursion) and the trace flags it for manual review.
        # The capability-rank silent pick is RETIRED (never fired on distinct
        # blocks in recorded history; silently guessing was wrong anyway).
        distinct = list(dict.fromkeys(bare_block_slugs))  # order-preserving
        if len(distinct) > 1:
            _trace("bem_resolve_ambiguous_loud",
                   classes=list(classes_tuple),
                   candidates=distinct,
                   chosen=None,
                   resolution="LOUD_NO_MATCH_manual_review")
            return None
        return distinct[0]

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

    # ---- Path 2b: compound-element prefix strip (e.g. card-tag → tag) ----
    # A BEM element is frequently a `<head>-<tail>` compound where `head` names
    # the containing context (a card/panel slot) and `tail` is the real element
    # slot — e.g. `card-tag`, `card-description`, `card-price`. The literal
    # compound misses the slot vocabulary (Path 2 above), so the element's text
    # falls through to a slug-None container as raw inner content → WP editor
    # "unexpected/invalid content".
    #
    # Resolution = prefix/suffix decomposition against the SAME DB slot vocabulary
    # (no new table, no per-class Python literals — R-31-1; universal across every
    # `<slot>-<slot>` compound — R-31-9). Split on the FIRST hyphen and route the
    # tail ONLY when BOTH head and tail are themselves routable slots. Gating on
    # `head in slot_alias_map` is the safety boundary: it fires for container
    # prefixes (`card-`, `panel-`) but NEVER for non-slot prefixes (`skip-link`,
    # `cart-badge`, `trustpilot-logo`) which must stay structural wrappers.
    # `card-inner` is also correctly skipped (tail `inner` has no standalone_block
    # → not in the map → stays a passthrough wrapper). Verified zero collateral
    # across all 86 BEM classes in the Mama's Munches mockup (2026-06-03).
    #
    # PRECEDENCE: Path 2b is a FALLBACK — it runs only after Path 2's literal
    # element/block alias lookup misses. So an explicit alias (e.g. `card-body`
    # → sgs/info-box via the `card` row's aliases) always wins over the peel;
    # Path 2b only fills genuine vocabulary gaps. Multi-segment tails resolve fine
    # when the tail is itself a hyphenated alias (`x-split-image` → `split-image`
    # → sgs/media). For any compound that is actually a WRAPPER (sgs-classed
    # element children), the walker's leaf-misresolution guard (convert.py walk(),
    # ~line 1961) is the backstop: a peeled leaf slug with sgs-classed children is
    # re-treated as a slug-None container, so no wrapper is ever flattened to a leaf.
    for cls, bem in sorted(parsed, key=lambda x: x[0]):
        if bem.element is None or "-" not in bem.element:
            continue
        head, _, tail = bem.element.lower().partition("-")
        if head in slot_alias_map and tail in slot_alias_map:
            standalone = slot_alias_map[tail]
            _trace("bem_resolve_prefix_strip",
                   class_=cls,
                   head=head,
                   tail=tail,
                   slug=standalone)
            return standalone

    return None


def block_for_slot_token(token: str) -> str | None:
    """Return the standalone block a single BEM token resolves to, or None.

    Thin public accessor over the element-scope slot/alias map (the same map
    `resolve_slug_from_bem` uses). Used by the walker's text-leaf routing
    (Spec 22 §FR-31-4.1 content-leaf step) to resolve a compound element's
    individual hyphen-segments (e.g. `price` → sgs/text, `stars` →
    sgs/star-rating) so a content leaf can pick its correct content block.
    Hyphen/case-insensitive via the map's no-hyphen variant keys.
    """
    if not token:
        return None
    return _slot_alias_to_standalone().get(token.lower())


def resolve_slug_from_bem(sgs_classes: list[str]) -> str | None:
    """Return the canonical SGS block slug for a list of sgs-* BEM classes, or None.

    Spec 31 §FR-31-1 + §FR-31-15 (as AMENDED D278) — multi-class disambiguation:
      - Path 1: a class whose BEM block segment maps to a registered built
        slug (no __element suffix). Duplicates DEDUPED (bare + --modifier of
        the same block); a residual DISTINCT-block tie is LOUD no-match for
        manual review (the D96 capability-rank silent pick is retired).
      - Path 2: all classes carry __element (inner element). Walk slot_synonyms
        aliases; return the first canonical_slot whose standalone_block is set.
      - Neither → None.

    Non-sgs-* classes are silently filtered out. Safe to call with a node's
    full class list — the walker should pre-filter but this helper is defensive.
    """
    return _resolve_slug_from_bem_tuple(tuple(sorted(sgs_classes)))


# ----------------------------------------------------------------------------
# Helper 2 — lift_behavioural_attrs
# Spec 22 §FR-31-2 — scalar attr lifting (NULL equivalent_block only)
# ----------------------------------------------------------------------------

def lift_behavioural_attrs(node: object, slug: str) -> dict:
    """Return a dict of scalar block attrs inferred from node's DOM attributes and classes.

    # TODO: FR-31-2 scalar lift — refine in Pass 2 as walker discovers attrs that
    # need lifting beyond the simple cases handled here. Current implementation
    # covers: (a) explicit data-sgs-X="Y" attributes, and (b) sgs-block--modifier
    # class patterns that map to known property_suffixes / modifier_suffixes rows.
    # Array attrs (FR-31-2.5) and equivalent_block-routed attrs (FR-31-2.1) are
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
# Spec 22 §FR-31-3 exception 3 + §FR-31-4 (top-level section container wrap)
# ----------------------------------------------------------------------------

def _emit_wp_block_markup(slug: str, attrs: dict, children: list[str]) -> str:
    """Private helper — emit a single WP block markup string.

    Mirrors emit_wp_block() shape from _retired/convert_pre_spec22.py:964.
    Strips private underscore-prefixed keys from attrs (routing hints).

    Emit shape follows WP save() contract:
    - No children → self-closing (`/-->`).
      This handles dynamic blocks (save=null) emitted inside sgs/container.
      WP block validation rejects open+close form when the block's save() is
      null (save=null means self-closing is the ONLY valid serialisation).
    - Children present → open+close (`--> ... <!-- /wp:slug -->`).
      Section containers (sgs/container, sgs/hero etc.) always have children
      so they remain in open+close form.

    The original comment "never self-closing — section containers always have
    children" was correct for sgs/container callers but wrong when this function
    is invoked by emit_sgs_container_wrapping for a non-container inner block
    such as sgs/star-rating (2026-06-02 fix).
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
    if not inner_str:
        # Self-close when no inner content — matches WP save()=null contract.
        return f"<!-- wp:{slug}{attr_json} /-->"
    return f"<!-- wp:{slug}{attr_json} -->\n{inner_str}\n<!-- /wp:{slug} -->"


def emit_sgs_container_wrapping(
    slug: str | None,
    attrs: dict,
    children_markup: list[str],
    css: str,
) -> str:
    """Wrap a resolved block in a sgs/container parent (FR-31-3 exception 3 + FR-31-4).

    Called by the walker when: is_top_level=True AND resolved slug != 'sgs/container'.
    Every top-level section's base is sgs/container (FR-31-4); non-container
    top-level sections are wrapped rather than emitted bare.

    When slug is None (top-level node had no BEM-resolved block slug per FR-31-11),
    no inner block is emitted — the walked children become direct InnerBlocks of
    the sgs/container wrapper. This preserves FR-31-4's invariant ("every top-level
    section is based on sgs/container") for sections whose root class is unknown
    to the slot_synonyms table, while keeping FR-31-11 pass-through semantics for
    non-top-level slug-None nodes (which never reach this function).

    Args:
        slug: Resolved block slug for the inner block (e.g. 'sgs/hero'), or None
              when the top-level section had no BEM-resolved block (children
              become direct container InnerBlocks).
        attrs: Block attrs dict to set on the inner block (ignored when slug=None)
        children_markup: List of child block markup strings (inner blocks)
        css: Section-scoped CSS string; appended as <style> inside the container
             div when non-empty (Spec 22 §FR-31-5 routing)

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
    # When slug is None (top-level FR-31-11 pass-through): children become direct
    # InnerBlocks of the container (no synthetic inner block emitted).
    container_children: list[str] = []
    if slug is not None:
        inner_markup = _emit_wp_block_markup(slug, attrs, children_markup)
        container_children.append(inner_markup)
    else:
        container_children.extend(c for c in children_markup if c)

    # Emit sgs/container with its children DIRECTLY between the block comments — NO static
    # <div class="wp-block-sgs-container"> wrapper and NO inline <style>. This mirrors
    # _emit_section_container (the slug-None path) which is already correct.
    #   * sgs/container's save() is <InnerBlocks.Content/> (no wrapper div). A static div in
    #     the saved markup fails WP block validation → "This block contains unexpected or
    #     invalid content" on EVERY cloned container in the editor (Bean 2026-06-02), AND
    #     adds an extra nesting level that breaks grid-on-section (the grid's items stop
    #     being its direct children).
    #   * The section's scoped CSS is already collected into variation_buf by the caller
    #     (walk: collect_css_for_classes → variation_buf.append) and deployed at Stage 10,
    #     so embedding an inline <style> here would only duplicate it.
    # FR-31-4: every top-level section is full-width (widthMode='full') so its background
    # fills the viewport; content is constrained by the inner block's own content-width
    # logic. The className post-process (guarantee_section_className) MERGES the section BEM
    # class on top, so widthMode is preserved.
    return _emit_wp_block_markup("sgs/container", {"widthMode": "full"}, container_children)


# ----------------------------------------------------------------------------
# content_attrs_with_selector / content_role_for_slot — Stage 3 helpers
# ----------------------------------------------------------------------------
# Two read-only DB accessors for Stage 3 recognition: which content-bearing
# attrs on a block carry a derived_selector (for CSS-to-attr routing), and
# what content role does a given canonical_slot carry on a block?
#
# Both use _content_bearing_roles() live (R-31-1 — no hardcoded role lists).
# Both use the same lru_cache + sqlite3.connect(SGS_DB) idiom as neighbours.
# ----------------------------------------------------------------------------


class AttrInfo(NamedTuple):
    """A content-bearing attr on a block that has a derived_selector."""
    attr_name: str
    role: str
    derived_selector: str
    attr_type: str


@functools.lru_cache(maxsize=256)
def content_attrs_with_selector(block_slug: str) -> tuple[AttrInfo, ...]:
    """Return content-bearing attrs for `block_slug` that have a derived_selector.

    Queries block_attributes for rows where:
      - block_slug = the given slug
      - derived_selector IS NOT NULL
      - role is in the live content-bearing role set (_content_bearing_roles())

    Returns a tuple of AttrInfo(attr_name, role, derived_selector). Empty tuple
    if none exist or the block is unknown. LRU-cached per slug.

    R-31-1: roles queried live from DB via _content_bearing_roles(); never
    hardcoded here. Used by Stage 3 content-extraction step to route draft CSS
    selectors to the correct block attr without per-block branches.

    Args:
        block_slug: Fully-qualified SGS slug, e.g. 'sgs/testimonial'.

    Returns:
        Tuple of AttrInfo named tuples; empty tuple when none found.
    """
    content_roles = _content_bearing_roles()
    if not content_roles:
        _trace("db_lookup_miss", lookup="content_attrs_with_selector",
               block_slug=block_slug, reason="no_content_roles")
        return ()

    placeholders = ",".join("?" for _ in content_roles)
    params = (block_slug, *content_roles)

    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            f"SELECT attr_name, role, derived_selector, attr_type FROM block_attributes "
            f"WHERE block_slug = ? AND derived_selector IS NOT NULL "
            f"AND role IN ({placeholders})",
            params,
        ).fetchall()
    except sqlite3.OperationalError:
        _trace("db_lookup_miss", lookup="content_attrs_with_selector",
               block_slug=block_slug, reason="operational_error")
        return ()
    finally:
        conn.close()

    result = tuple(
        AttrInfo(attr_name=r[0], role=r[1], derived_selector=r[2], attr_type=r[3] or "")
        for r in rows
    )
    if result:
        _trace("db_lookup_hit", lookup="content_attrs_with_selector",
               block_slug=block_slug, count=len(result))
    else:
        _trace("db_lookup_miss", lookup="content_attrs_with_selector",
               block_slug=block_slug)
    return result


@functools.lru_cache(maxsize=2048)
def content_role_for_slot(block_slug: str, slot: str) -> str | None:
    """Return the content-bearing role of the attr on `block_slug` for `slot`.

    Queries block_attributes for a row where:
      - block_slug = the given slug
      - canonical_slot = the given slot
      - role is in the live content-bearing role set (_content_bearing_roles())

    Returns the role string (e.g. 'text-content') or None when no such attr
    exists or its role is not content-bearing. LRU-cached per (slug, slot).

    R-31-1: roles queried live from DB via _content_bearing_roles(); never
    hardcoded here. Slot-keyed (canonical_slot), NOT attr-keyed — mirrors the
    existing slot_has_content_equivalent predicate pattern. Used by Stage 3 to
    determine how to extract a slot's content from the draft DOM.

    Args:
        block_slug: Fully-qualified SGS slug, e.g. 'sgs/testimonial'.
        slot:       Canonical slot name, e.g. 'quote', 'heading', 'media'.

    Returns:
        Role string or None.
    """
    if not block_slug or not slot:
        return None

    content_roles = _content_bearing_roles()
    if not content_roles:
        _trace("db_lookup_miss", lookup="content_role_for_slot",
               block_slug=block_slug, slot=slot, reason="no_content_roles")
        return None

    placeholders = ",".join("?" for _ in content_roles)
    params = (block_slug, slot, *content_roles)

    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            f"SELECT role FROM block_attributes "
            f"WHERE block_slug = ? AND canonical_slot = ? "
            f"AND role IN ({placeholders}) LIMIT 1",
            params,
        ).fetchone()
    except sqlite3.OperationalError:
        _trace("db_lookup_miss", lookup="content_role_for_slot",
               block_slug=block_slug, slot=slot, reason="operational_error")
        return None
    finally:
        conn.close()

    if row:
        _trace("db_lookup_hit", lookup="content_role_for_slot",
               block_slug=block_slug, slot=slot, role=row[0])
        return row[0]
    _trace("db_lookup_miss", lookup="content_role_for_slot",
           block_slug=block_slug, slot=slot)
    return None


def accepts_allowed_blocks(block_slug: str) -> list[str] | None:
    """Return the parent's allowed child-block list, or None for "no restriction".

    Spec 31 §3.B3(3) / Axis-3 child-routing: the VALIDATION gate for child-block
    CONTENT resolution. A resolved child block MUST be in this list, else the child
    is a flagged GAP (never silently dropped, never a per-block carve-out, R-31-9).

    Three-state contract (the G3 NULL case the design names explicitly):
      - ``None``  — ``block_composition.accepts_allowed_blocks`` is NULL/absent:
                    the parent declares NO restriction → caller emits the child
                    UNCONDITIONALLY (skip validation, do NOT fail). NULL != [].
      - ``[]``    — an explicit empty list: NO children allowed.
      - ``[...]`` — the allow-list (e.g. ``["sgs/accordion-item"]``); membership
                    is required.

    The column stores a JSON string. A malformed value traces + returns None
    (lenient — the validation step skips rather than crashing a clone; mirrors the
    existing accessors' fail-soft-with-trace pattern).

    R-31-1: pure DB read, no per-slug branch. Used by the interior walker (Stage 4f).
    """
    if not block_slug:
        return None
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT accepts_allowed_blocks FROM block_composition "
            "WHERE block_slug = ? LIMIT 1",
            (block_slug,),
        ).fetchone()
    except sqlite3.OperationalError:
        _trace("db_lookup_miss", lookup="accepts_allowed_blocks",
               block_slug=block_slug, reason="operational_error")
        return None
    finally:
        conn.close()

    if not row or row[0] is None or str(row[0]).strip() == "":
        _trace("db_lookup_miss", lookup="accepts_allowed_blocks",
               block_slug=block_slug, reason="null_no_restriction")
        return None  # NULL = no restriction (distinct from [] = allow nothing)
    try:
        parsed = json.loads(row[0])
    except (ValueError, TypeError):
        _trace("db_lookup_miss", lookup="accepts_allowed_blocks",
               block_slug=block_slug, reason="malformed_json")
        return None
    if not isinstance(parsed, list):
        _trace("db_lookup_miss", lookup="accepts_allowed_blocks",
               block_slug=block_slug, reason="not_a_list")
        return None
    result = [str(x) for x in parsed]
    _trace("db_lookup_hit", lookup="accepts_allowed_blocks",
           block_slug=block_slug, count=len(result))
    return result


@functools.lru_cache(maxsize=256)
def primary_content_attr(block_slug: str) -> str | None:
    """Return the primary TEXT content attr name for `block_slug`, or None.

    Queries block_attributes for rows where:
      - block_slug = the given slug
      - role IN ('content', 'text-content')  — DB-authoritative text-content signal
      - attr_type = 'string'                 — scalar text, not object/array

    Resolution:
      - Exactly one row → return it.
      - More than one → prefer by name order: 'content', 'text', 'label', 'body',
        'title' (SGS/WP primary-text convention); return the first match, else None
        (ambiguous — caller should fall back to inner HTML).
      - Zero rows → None.

    LRU-cached per slug. Used by Stage 3 build_block_markup to emit child-block
    text into the child's typed attr (not as bare inner HTML) so dynamic render.php
    blocks (e.g. sgs/heading) read the correct attr and don't render blank.

    R-31-1: DB-only read path. No hardcoded slug→attr dicts.

    Args:
        block_slug: Fully-qualified SGS slug, e.g. 'sgs/heading'.

    Returns:
        Attr name string (e.g. 'content') or None.
    """
    if not block_slug:
        return None

    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT attr_name FROM block_attributes "
            "WHERE block_slug = ? AND role IN ('content', 'text-content') "
            "AND attr_type = 'string'",
            (block_slug,),
        ).fetchall()
    except sqlite3.OperationalError:
        _trace("db_lookup_miss", lookup="primary_content_attr",
               block_slug=block_slug, reason="operational_error")
        return None
    finally:
        conn.close()

    if not rows:
        _trace("db_lookup_miss", lookup="primary_content_attr",
               block_slug=block_slug, reason="no_rows")
        return None

    names = [r[0] for r in rows]

    if len(names) == 1:
        _trace("db_lookup_hit", lookup="primary_content_attr",
               block_slug=block_slug, attr_name=names[0])
        return names[0]

    # More than one row — prefer by SGS/WP primary-text convention name order.
    _PREFERRED = ("content", "text", "label", "body", "title")
    for preferred in _PREFERRED:
        if preferred in names:
            _trace("db_lookup_hit", lookup="primary_content_attr",
                   block_slug=block_slug, attr_name=preferred, via="preference")
            return preferred

    # Ambiguous (multiple rows, none matching preferred names) — caller falls back.
    _trace("db_lookup_miss", lookup="primary_content_attr",
           block_slug=block_slug, reason="ambiguous", candidates=names)
    return None


def content_attr_for_element(
    block_slug: str, bem_element: str
) -> tuple[str, str | None, str | None, str | None] | None:
    """Resolve a draft BEM __element token to `block_slug`'s content attr.

    Spec 31 §13.3 FR-31-2.6: the per-attr content walk resolves each draft
    element to the composite's own typed attr by MATCH STRENGTH, not DB row
    order. Ranking (lower tier wins; first DB row breaks a same-tier tie):

      Tier 0 (direct/exact): the attr's `canonical_slot` == element token, OR
              the attr's own `attr_name` == element token.
      Tier 1 (alias): the element token appears in the alias list of the
              element-scope `slots` row named by the attr's `canonical_slot`.

    Only content-bearing roles enter (FR-31-2.2 positive allowlist:
    'text-content', 'identity', 'image-object', 'content', 'rating') — styling
    and behaviour attrs never resolve as a content destination.

    NOT lru-cached: tests (and future callers) monkeypatch `SGS_DB`; a cache
    keyed on the args would leak rows across DB swaps.

    R-31-1: DB-only read path. No hardcoded slug→attr dicts.

    Args:
        block_slug:  Fully-qualified SGS slug, e.g. 'sgs/product-card'.
        bem_element: The draft BEM element token, e.g. 'name' from
                     '.sgs-product-card__name'.

    Returns:
        (attr_name, emit_shape, role, attr_type) for the best match, or None.
    """
    if not block_slug or not bem_element:
        return None

    # FR-31-2.2 content-role allowlist — sourced from roles.classification like
    # every other call site (equivalent_block_for, array_content). QC fix
    # 2026-07-05: the previous in-code 5-tuple here had DRIFTED from the DB
    # fact (missing link-href + the 4 icon-* roles) — the exact R-31-1 duplicate
    # pattern; the roles table is the single source.
    _content_roles = tuple(sorted(_content_bearing_roles()))
    if not _content_roles:
        return None  # positive allowlist closes by default (safe direction)

    conn = sqlite3.connect(SGS_DB)
    try:
        _placeholders = ", ".join("?" for _ in _content_roles)
        attr_rows = conn.execute(
            "SELECT attr_name, canonical_slot, emit_shape, role, attr_type "
            "FROM block_attributes "
            f"WHERE block_slug = ? AND role IN ({_placeholders}) "
            "ORDER BY rowid",
            (block_slug, *_content_roles),
        ).fetchall()
        slot_rows = conn.execute(
            "SELECT slot_name, aliases FROM slots WHERE scope = 'element'"
        ).fetchall()
    except sqlite3.OperationalError:
        _trace("db_lookup_miss", lookup="content_attr_for_element",
               block_slug=block_slug, element=bem_element,
               reason="operational_error")
        return None
    finally:
        conn.close()

    if not attr_rows:
        _trace("db_lookup_miss", lookup="content_attr_for_element",
               block_slug=block_slug, element=bem_element, reason="no_rows")
        return None

    # slot_name → set of alias tokens (malformed alias JSON = no aliases).
    slot_aliases: dict[str, set[str]] = {}
    for slot_name, aliases_json in slot_rows:
        try:
            parsed = json.loads(aliases_json) if aliases_json else []
        except (ValueError, TypeError):
            parsed = []
        if isinstance(parsed, list):
            slot_aliases[slot_name] = {str(a) for a in parsed}

    # Kebab≡camel normalisation for the attr-name tier-0 compare: a draft BEM
    # element token is kebab-case ('price-note') while attrs are camelCase
    # ('priceNote') — the SAME identifier in the two grammars. Normalising
    # (lowercase, hyphens stripped) is a spelling-convention bridge, not a
    # name-heuristic (FR-31-2.1a: no semantic parsing; both sides compared
    # whole). Added 2026-07-04 (Gate A — the card's __price-note element).
    _norm_el = bem_element.replace("-", "").lower()

    best: tuple[str, str | None, str | None, str | None] | None = None
    best_tier: int | None = None
    for attr_name, canonical_slot, emit_shape, role, attr_type in attr_rows:
        if (canonical_slot == bem_element or attr_name == bem_element
                or attr_name.replace("-", "").lower() == _norm_el):
            tier = 0
        elif bem_element in slot_aliases.get(canonical_slot or "", ()):
            tier = 1
        else:
            continue
        if best_tier is None or tier < best_tier:
            best = (attr_name, emit_shape, role, attr_type)
            best_tier = tier
        if best_tier == 0:
            break  # rows are rowid-ordered; the first tier-0 hit is final.

    if best is None:
        _trace("db_lookup_miss", lookup="content_attr_for_element",
               block_slug=block_slug, element=bem_element, reason="no_match")
        return None

    _trace("db_lookup_hit", lookup="content_attr_for_element",
           block_slug=block_slug, element=bem_element,
           attr_name=best[0], tier=best_tier)
    return best


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
    # equivalent_block_for — Spec 22 §FR-31-2.1 unit tests
    # -----------------------------------------------------------------
    print("\n== equivalent_block_for (Spec 22 §FR-31-2.1) ==")
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
        # producing the FR-31-2.2 "typography looks like heading" misroute. Positive-
        # allowlist closes the hole because role=None is not in _CONTENT_BEARING_ROLES.
        ("sgs/cta-section", "textTransform", None,
         "FR-31-2.2 adversarial (Rater A 2026-05-27): canonical_slot='text' matches "
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