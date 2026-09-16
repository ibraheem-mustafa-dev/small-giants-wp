#!/usr/bin/env python3
"""classless_field_resolver.py -- Spec 45 field-mapping resolver, Tiers 1-3.

Spec: `.claude/specs/45-CLASSLESS-FIELD-RESOLUTION.md` (v1.6.0).

THE PROBLEM (plain English): once a classless (no-CSS-class) draft group's
block identity is known (Spec 44's job, not built yet), nothing maps its
individual JS fields onto that block's real attributes. `array_content.py`
does this for the BEM-classed path by matching draft CSS classes against
`array_item_schema`; a classless draft has no classes to match against.

BUILD STATUS (2026-09-16): standalone, fixture-driven only (Bean's decision,
D1084) -- `parent_slug` is a plain function argument here, not yet wired to
Spec 44's live output. Wiring waits on Spec 44's own build (its group-identity
resolver + its log/review surfaces).

INPUT CONTRACT: a real JS-source parser (arrow-function/function-literal
detection per §4.0) does not exist in this codebase yet -- no piece of this
pipeline parses draft `.dc.html` embedded JS object literals into an AST. A
draft field's value is therefore represented as an ordinary Python value
(str/int/float/bool/None/dict/list) for real content, or the `FUNCTION_LITERAL`
sentinel for a value that a future JS-parsing layer determined was a
function/arrow-function literal in the source. This keeps §4.0's type-based
(never name-based) contract honest and testable now, without inventing a JS
parser this build doesn't need yet.

Mirrors `sc_var_classifier.py`'s module shape: capped-low confidence, routed
through the named gap-candidate/operator-review flow once Spec 44's surfaces
exist (Spec 45 §6) -- never writes into an authoritative DB table directly,
never silently guesses. Reuses, does not fork: `array_item_schema` and
`db_lookup._content_bearing_roles()` are read, never re-derived.

UK English in comments + output.
"""
from __future__ import annotations

import functools
import json
import re
import sqlite3
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

_HERE = Path(__file__).resolve().parent
_SCRIPTS_ROOT = _HERE.parent
if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

from converter.db import db_lookup  # noqa: E402

SGS_DB = db_lookup.SGS_DB


class FunctionLiteral:
    """Sentinel: a draft field's JS value is a function/arrow-function literal.

    §4.0 excludes a field by the VALUE's own syntax, never by the field's
    NAME -- matching by name (the originally-cited `go`/`toggle`/`remove`
    examples) would be a hardcoded verb list, which R-31-1 forbids and which
    Finding 1c (`.claude/reports/2026-09-14-claude-design-draft-field-identity-schema.md`)
    explicitly names as the wrong signal.
    """

    __slots__ = ()

    def __repr__(self) -> str:  # pragma: no cover - debug aid only
        return "FUNCTION_LITERAL"


FUNCTION_LITERAL = FunctionLiteral()


@dataclass(frozen=True)
class DraftField:
    """One field on a draft's repeated-array item, keyed by its JS source key."""

    key: str
    value: Any  # str | int | float | bool | None | dict | list | FunctionLiteral


@dataclass(frozen=True)
class Tier1Placement:
    """A field placed by Tier 1 (§4.1) into a known array_item_schema slot."""

    block_slug: str
    array_attr: str
    field_key: str
    matched_by: str  # "direct-key" | "role-fallback"
    role: str | None = None


@dataclass(frozen=True)
class Tier2Placement:
    """A field placed by Tier 2 (§4.2) onto the parent block's own scalar attribute."""

    block_slug: str
    attr_name: str
    matched_by: str  # "exact-name" | "canonical-slot-fallback"


@dataclass(frozen=True)
class Tier3Candidate:
    """One member of §9.2's bounded candidate set.

    `kind` is `"array-attr"` (one of the parent's own un-matched
    `array_item_schema` array attributes) or `"block"` (a verified
    allow-listed child block). `field_names` is what §9.3 scores against:
    `array_item_schema.field_key` for the former, content-bearing
    `block_attributes.attr_name` for the latter.
    """

    kind: str
    name: str
    field_names: frozenset[str]


@dataclass(frozen=True)
class Tier3Placement:
    """A field placed by Tier 3 (§9) -- own object attribute, array
    attribute, verified child block, or the `sgs/container` fallback."""

    block_slug: str
    field_key: str
    resolved_kind: str  # "own-object-attribute" | "array-attribute" | "child-block" | "container-fallback"
    targets: tuple[str, ...]
    matched_by: str  # "exact-name" | "canonical-slot" | "raw-hit-count" | "container-fallback"
    hits: int | None = None
    inner: tuple[Any, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class Tier3ArrayResolution:
    """§9.5 -- an array of nested objects: every item resolved independently
    against the SAME bounded candidate set, so a per-item gap stays visible
    rather than being averaged away by its siblings."""

    block_slug: str
    field_key: str
    items: tuple[Any, ...]


@dataclass(frozen=True)
class RouteToTier3:
    """§4.1.0 Step A: no exact array_attr match, value is nested -- Tier 3's job."""

    field_key: str
    reason: str = "no_exact_array_attr_match_nested_value"


@dataclass(frozen=True)
class RouteToTier2:
    """§4.1.0 Step A: no exact array_attr match, value is a plain scalar -- Tier 2's job."""

    field_key: str
    reason: str = "no_exact_array_attr_match_scalar_value"


@dataclass(frozen=True)
class Gap:
    """An honest, named unresolved outcome -- never a silent guess (§5)."""

    field_key: str
    reason: str
    detail: str = ""
    candidates: tuple[str, ...] = field(default_factory=tuple)


# ---------------------------------------------------------------------------
# §4.0 -- hard pre-filter, runs before any tier
# ---------------------------------------------------------------------------


def is_function_literal(value: Any) -> bool:
    """True only for the `FUNCTION_LITERAL` sentinel -- type check, not name check.

    A field whose NAME looks like a verb (`go`, `toggle`) but whose VALUE is
    a plain string must NOT be excluded here -- see this module's own
    self-test `test_prefilter_is_type_based_not_name_based`.
    """
    return isinstance(value, FunctionLiteral)


# ---------------------------------------------------------------------------
# §4.1.0 Step A -- identify the array field itself, exact key-name match only
# ---------------------------------------------------------------------------


def _array_attrs_for_block(parent_slug: str) -> frozenset[str]:
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT DISTINCT array_attr FROM array_item_schema WHERE block_slug = ?",
            (parent_slug,),
        ).fetchall()
    except sqlite3.OperationalError:
        return frozenset()
    finally:
        conn.close()
    return frozenset(r[0] for r in rows)


def identify_array_field(
    parent_slug: str, draft_field: DraftField
) -> str | RouteToTier2 | RouteToTier3:
    """§4.1.0 Step A -- does `draft_field.key` exactly equal a declared
    `array_attr` for `parent_slug`?

    Match -> returns the array_attr name (str), caller proceeds to Tier 1's
    per-item logic (`resolve_array_item_field`) for each of the array's items.

    No match, value nested (dict, or list of dicts) -> `RouteToTier3` (a
    misnamed-but-real array attribute and a genuine nested child block are
    the same shape of ambiguity -- Tier 3 scores both together, §9).

    No match, value a plain scalar -> `RouteToTier2` (proceeds as an
    ordinary scalar attribute, exactly as if no array attribute existed).

    Never a content-shape guess at this step -- exact key-name match only,
    to avoid mismatching the whole array against the wrong attribute before
    any of its items are examined.
    """
    if is_function_literal(draft_field.value):
        return RouteToTier2(draft_field.key, reason="function_literal_excluded")

    if draft_field.key in _array_attrs_for_block(parent_slug):
        return draft_field.key

    value = draft_field.value
    is_nested = isinstance(value, dict) or (
        isinstance(value, list) and all(isinstance(v, dict) for v in value) and value
    )
    if is_nested:
        return RouteToTier3(draft_field.key)
    return RouteToTier2(draft_field.key)


# ---------------------------------------------------------------------------
# Tier 1 Steps 1-3 -- per-item field resolution
# ---------------------------------------------------------------------------


def _array_item_schema_rows(
    parent_slug: str, array_attr: str
) -> tuple[tuple[str, str | None], ...]:
    """Return `(field_key, role)` pairs for one `(block_slug, array_attr)` pair."""
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT field_key, role FROM array_item_schema "
            "WHERE block_slug = ? AND array_attr = ? ORDER BY field_order",
            (parent_slug, array_attr),
        ).fetchall()
    except sqlite3.OperationalError:
        return ()
    finally:
        conn.close()
    return tuple((r[0], r[1]) for r in rows)


_URL_RE = re.compile(r"^(https?://|/|#|mailto:|tel:)", re.IGNORECASE)


def _is_url_shaped(value: Any) -> bool:
    return isinstance(value, str) and bool(_URL_RE.match(value.strip()))


def _is_media_reference_shaped(value: Any) -> bool:
    """A media-reference shape: `{url|id, ...}` dict, or a plain string that
    looks like an image path (has a common image extension)."""
    if isinstance(value, dict):
        return "url" in value or "id" in value
    if isinstance(value, str):
        return bool(re.search(r"\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$", value.strip(), re.IGNORECASE))
    return False


def _role_value_shape_matches(role: str, value: Any) -> bool:
    """§4.1 Step 2's value-shape check -- new code, not reuse (no such
    classifier exists elsewhere in this pipeline; three checks only)."""
    if role in ("url-href", "link-href"):
        return _is_url_shaped(value)
    if role == "image-object":
        return _is_media_reference_shaped(value)
    if role in ("text-content", "content"):
        return isinstance(value, str) and not _is_url_shaped(value) and not _is_media_reference_shaped(value)
    return False


def resolve_array_item_field(
    parent_slug: str, array_attr: str, draft_field: DraftField
) -> Tier1Placement | Gap:
    """§4.1 Tier 1, Steps 1-2 for ONE item field, already inside a recognised
    array attribute (§4.1.0 Step A already matched `array_attr` by name).

    Step 1 -- direct key match: draft_field.key against `field_key` for this
    exact `(block_slug, array_attr)` pair. Always counts, regardless of the
    matched row's role (§4.1.0 point 3).

    Step 2 -- role-based fallback, only when no direct match exists AND a
    role-populated row exists for this pair, AND the field's value passes
    that role's value-shape check. Only counts when the row's role is
    genuinely content-bearing (§4.1.0 point 3) -- a NULL role never counts.
    """
    if is_function_literal(draft_field.value):
        return Gap(draft_field.key, reason="function_literal_excluded")

    rows = _array_item_schema_rows(parent_slug, array_attr)
    if not rows:
        return Gap(
            draft_field.key,
            reason="block_outside_tier1_coverage",
            detail=f"{parent_slug}.{array_attr} has no array_item_schema rows",
        )

    for field_key, _role in rows:
        if field_key == draft_field.key:
            return Tier1Placement(
                block_slug=parent_slug,
                array_attr=array_attr,
                field_key=field_key,
                matched_by="direct-key",
            )

    content_roles = db_lookup._content_bearing_roles()
    role_rows = [(fk, r) for fk, r in rows if r is not None and r in content_roles]

    # A role that appears on 2+ field_keys within this one pair is ambiguous
    # for the fallback: e.g. sgs/card-grid.items carries THREE text-content
    # rows (title/subtitle/badge). "Default-to-text" matches any plain
    # string, so without this de-dup it would silently pick the FIRST row by
    # position -- the exact wildcard bias section 9.3's round-3 fix closes
    # for Tier 3's candidate scoring, applying here to Tier 1's per-field
    # placement instead. Only a role held by EXACTLY ONE field_key in this
    # pair is safe to use as a fallback target.
    roles_seen: dict[str, list[str]] = {}
    for field_key, role in role_rows:
        roles_seen.setdefault(role, []).append(field_key)
    unambiguous_roles = {role for role, keys in roles_seen.items() if len(keys) == 1}

    for field_key, role in role_rows:
        if role not in unambiguous_roles:
            continue
        if _role_value_shape_matches(role, draft_field.value):
            return Tier1Placement(
                block_slug=parent_slug,
                array_attr=array_attr,
                field_key=field_key,
                matched_by="role-fallback",
                role=role,
            )

    return Gap(
        draft_field.key,
        reason="no_direct_or_role_match",
        detail=f"{parent_slug}.{array_attr}",
        candidates=tuple(fk for fk, _ in rows),
    )


# ---------------------------------------------------------------------------
# Tier 2 (§4.2) -- a field NOT inside any array attribute: the parent's own
# scalar attribute.
# ---------------------------------------------------------------------------


def _content_bearing_attrs_by_name(parent_slug: str, attr_name: str) -> tuple[str, ...]:
    """Step 1 -- rows on `parent_slug` whose `attr_name` exactly equals the
    draft field's key, restricted to content-bearing roles. Returns matched
    `attr_name`s (always == `attr_name` here, but kept as a tuple so the
    caller's "how many?" check is identical in shape to Step 2's)."""
    content_roles = db_lookup._content_bearing_roles()
    if not content_roles:
        return ()
    placeholders = ",".join("?" for _ in content_roles)
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT attr_name FROM block_attributes "
            f"WHERE block_slug = ? AND attr_name = ? AND role IN ({placeholders})",
            (parent_slug, attr_name, *content_roles),
        ).fetchall()
    except sqlite3.OperationalError:
        return ()
    finally:
        conn.close()
    return tuple(r[0] for r in rows)


def _content_bearing_attrs_by_canonical_slot_with_role(
    parent_slug: str, canonical_slot: str
) -> tuple[tuple[str, str], ...]:
    """Same query as `_content_bearing_attrs_by_canonical_slot`, but also
    returns each matched row's `role` -- needed by Step 2's value-shape
    check (review finding on task-2: a single canonical_slot match must
    still pass `_role_value_shape_matches` before it counts, exactly like
    Tier 1's own role-fallback at Step 2 of `resolve_array_item_field`).
    Kept as a separate query rather than threading role through the
    string-only function below, so every existing caller of that function
    (and its `candidates=` usage building a plain attr-name tuple for a
    `Gap`) stays byte-identical.
    """
    content_roles = db_lookup._content_bearing_roles()
    if not content_roles:
        return ()
    placeholders = ",".join("?" for _ in content_roles)
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT attr_name, role FROM block_attributes "
            f"WHERE block_slug = ? AND canonical_slot = ? AND role IN ({placeholders})",
            (parent_slug, canonical_slot, *content_roles),
        ).fetchall()
    except sqlite3.OperationalError:
        return ()
    finally:
        conn.close()
    return tuple((r[0], r[1]) for r in rows)


def _content_bearing_attrs_by_canonical_slot(
    parent_slug: str, canonical_slot: str
) -> tuple[str, ...]:
    """Step 2 -- same-block canonical_slot fallback (§4.2 point 3). Treats
    the draft field's key AS a candidate `canonical_slot` value and queries
    rows already filtered to `parent_slug`, so this can never reach into a
    different block's attributes -- the exact same-family guarantee the
    spec's D279 citation requires.

    DECISION SURFACED: exact string equality against `canonical_slot`, same
    as Step 1's exact-name match -- no case-folding or fuzzy matching. Every
    other exact-match idiom in this module (Tier 1's direct-key match,
    Step 1 above) is a plain `=` comparison; introducing normalisation only
    here would be an unrequested, undocumented divergence from that pattern
    for a case the spec text never asks for.
    """
    return tuple(
        attr_name
        for attr_name, _role in _content_bearing_attrs_by_canonical_slot_with_role(
            parent_slug, canonical_slot
        )
    )


def resolve_scalar_attribute(
    parent_slug: str, draft_field: DraftField
) -> Tier2Placement | Gap:
    """§4.2 Tier 2 -- a field that is NOT inside any repeated array attribute:
    a plain scalar attribute directly on `parent_slug`.

    Step 1 -- exact attribute-name match, restricted to content-bearing
    roles. Exactly one match -> place it.

    Step 2 -- only when Step 1 found nothing: canonical_slot fallback,
    same block only (never cross-family -- see the DECISION SURFACED note
    on `_content_bearing_attrs_by_canonical_slot`). A single candidate only
    counts when its role's value-shape check passes (reuses
    `_role_value_shape_matches`, the same check Tier 1's own role-fallback
    applies at `resolve_array_item_field` Step 2) -- crossing role families
    (e.g. placing a plain string onto a link-href attribute) is a WRONG
    placement, not a gap, and Tier 2 gets no exemption from the discipline
    Tier 1 already enforces. A single candidate that fails the shape check
    falls through to the same "no match" Gap below as zero candidates --
    it is not a fresh guess at some other candidate, there isn't one.

    Ambiguity gate -- 2+ candidates at EITHER step is never guessed at; it
    is reported as a Gap, mirroring `resolve_array_item_field`'s own
    ambiguity discipline (never pick the first by row order).
    """
    if is_function_literal(draft_field.value):
        return Gap(draft_field.key, reason="function_literal_excluded")

    exact_matches = _content_bearing_attrs_by_name(parent_slug, draft_field.key)
    if len(exact_matches) == 1:
        return Tier2Placement(
            block_slug=parent_slug,
            attr_name=exact_matches[0],
            matched_by="exact-name",
        )
    if len(exact_matches) >= 2:
        return Gap(
            draft_field.key,
            reason="ambiguous_exact_name_match",
            detail=parent_slug,
            candidates=exact_matches,
        )

    slot_matches_with_role = _content_bearing_attrs_by_canonical_slot_with_role(
        parent_slug, draft_field.key
    )
    slot_matches = tuple(attr_name for attr_name, _role in slot_matches_with_role)
    if len(slot_matches) == 1:
        candidate_attr, candidate_role = slot_matches_with_role[0]
        if _role_value_shape_matches(candidate_role, draft_field.value):
            return Tier2Placement(
                block_slug=parent_slug,
                attr_name=candidate_attr,
                matched_by="canonical-slot-fallback",
            )
        # Shape check failed -- this candidate doesn't count. Fall through
        # to the same "no match" Gap below as zero candidates (§4.2 point
        # 2a); never treated as ambiguity (there is still only one row) and
        # never silently placed anyway.
    if len(slot_matches) >= 2:
        return Gap(
            draft_field.key,
            reason="ambiguous_canonical_slot_match",
            detail=parent_slug,
            candidates=slot_matches,
        )

    return Gap(
        draft_field.key,
        reason="no_scalar_attribute_match",
        detail=parent_slug,
    )


# ---------------------------------------------------------------------------
# Tier 3 (§9) -- a nested value: the parent's own object attribute, one of its
# own un-matched array attributes, a verified allow-listed child block, or the
# sgs/container fallback.
# ---------------------------------------------------------------------------

_BLOCKS_SRC = _HERE.parent.parent / "src" / "blocks"
CONTAINER_FALLBACK_SLUG = "sgs/container"
DEFAULT_MAX_DEPTH = 25

# Matched against edit.js with comments stripped first. A bare text match on
# the word "InnerBlocks" false-positives on sgs/product-card, whose own comment
# says it has none -- the exact row §9.2's gate 2 exists to catch.
_JS_LINE_COMMENT_RE = re.compile(r"(?<![:\\])//")
_INNER_BLOCKS_RE = re.compile(r"<InnerBlocks\b|\buseInnerBlocksProps\s*\(")


def _strip_js_comments(source: str) -> str:
    """Line-bounded comment strip. Deliberately NOT a `/\\*.*?\\*/` DOTALL
    regex: `hero/edit.js` carries a `//` comment reading "the *Tablet/*Mobile
    siblings", whose stray `/*` made that regex swallow 470 real lines
    including the block's only `useInnerBlocksProps(` call -- gate 2 then
    reported a genuine InnerBlocks parent as having none. A silent
    under-detection is the worst failure this gate can have, so the scan is
    stateful per line and a line comment is removed BEFORE a block comment can
    open on the same line.
    """
    out: list[str] = []
    in_block = False
    for line in source.splitlines():
        if in_block:
            close = line.find("*/")
            if close == -1:
                continue
            line = line[close + 2 :]
            in_block = False
        comment = _JS_LINE_COMMENT_RE.search(line)
        if comment:
            line = line[: comment.start()]
        while True:
            start = line.find("/*")
            if start == -1:
                break
            end = line.find("*/", start + 2)
            if end == -1:
                line = line[:start]
                in_block = True
                break
            line = line[:start] + line[end + 2 :]
        out.append(line)
    return "\n".join(out)


def is_nested_value(value: Any) -> bool:
    """§9's condition: a nested object, or a non-empty array of nested objects."""
    if isinstance(value, dict):
        return True
    return bool(value) and isinstance(value, list) and all(isinstance(v, dict) for v in value)


def _representative_fields(value: Any) -> frozenset[str] | None:
    """§9.3's counting-domain rule -- ONE representative unit: the object's own
    field list, or an array's FIRST item's field list, never summed across
    items (an array candidate is never credited once per repetition)."""
    if isinstance(value, dict):
        source = value
    elif is_nested_value(value):
        source = value[0]
    else:
        return None
    return frozenset(k for k, v in source.items() if not is_function_literal(v))


# --- §9.1 Step 0 -- is this really the parent's own object-typed attribute? ---


def _object_content_attrs_by_name(parent_slug: str, attr_name: str) -> tuple[str, ...]:
    """Same query idiom as Tier 2's `_content_bearing_attrs_by_name`, filtered
    additionally to `attr_type = 'object'`. The role filter is mandatory, not
    optional: most object-typed attrs in the DB carry no content-bearing role
    (they are layout/visual/typography box attrs like `gap`, `columns`,
    `padding`), so without it a draft field literally named `gap` carrying real
    content would silently write into a styling attribute."""
    content_roles = db_lookup._content_bearing_roles()
    if not content_roles:
        return ()
    placeholders = ",".join("?" for _ in content_roles)
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT attr_name FROM block_attributes "
            "WHERE block_slug = ? AND attr_name = ? AND attr_type = 'object' "
            f"AND role IN ({placeholders})",
            (parent_slug, attr_name, *content_roles),
        ).fetchall()
    except sqlite3.OperationalError:
        return ()
    finally:
        conn.close()
    return tuple(r[0] for r in rows)


def _object_content_attrs_by_canonical_slot(
    parent_slug: str, canonical_slot: str
) -> tuple[str, ...]:
    """§9.1's v1.6.0 widening -- `canonical_slot` already groups several
    attributes under one named element slot (`sgs/team-member`'s `image` slot
    carries photo/photoTablet/photoMobile). Still an exact-name check against a
    DB-seeded value: it widens WHAT counts as a name, not HOW the check is
    performed."""
    content_roles = db_lookup._content_bearing_roles()
    if not content_roles:
        return ()
    placeholders = ",".join("?" for _ in content_roles)
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT attr_name FROM block_attributes "
            "WHERE block_slug = ? AND canonical_slot = ? AND attr_type = 'object' "
            f"AND role IN ({placeholders}) ORDER BY attr_name",
            (parent_slug, canonical_slot, *content_roles),
        ).fetchall()
    except sqlite3.OperationalError:
        return ()
    finally:
        conn.close()
    return tuple(r[0] for r in rows)


def own_object_attribute_outcome(
    parent_slug: str,
    field_key: str,
    exact_matches: tuple[str, ...],
    slot_matches: tuple[str, ...],
) -> Tier3Placement | Gap | None:
    """§9.1's decision, as a pure function of the two DB lookups above.

    Kept pure so the collision tiebreak is testable: `(block_slug, attr_name)`
    is not uniquely constrained on its own (the real unique index also includes
    `source`), and zero such collisions exist in the DB today -- so the only
    honest way to prove that branch works is to hand it a synthetic 2-tuple.
    """
    if len(exact_matches) >= 2:
        return Gap(
            field_key,
            reason="tier3_ambiguous_own_object_attribute",
            detail=parent_slug,
            candidates=exact_matches,
        )
    if len(exact_matches) == 1:
        return Tier3Placement(
            block_slug=parent_slug,
            field_key=field_key,
            resolved_kind="own-object-attribute",
            targets=exact_matches,
            matched_by="exact-name",
        )
    if slot_matches:
        return Tier3Placement(
            block_slug=parent_slug,
            field_key=field_key,
            resolved_kind="own-object-attribute",
            targets=slot_matches,
            matched_by="canonical-slot",
        )
    return None


def resolve_own_object_attribute(
    parent_slug: str, draft_field: DraftField
) -> Tier3Placement | Gap | None:
    """§9.1 Step 0. `None` means no match -- proceed to §9.2."""
    return own_object_attribute_outcome(
        parent_slug,
        draft_field.key,
        _object_content_attrs_by_name(parent_slug, draft_field.key),
        _object_content_attrs_by_canonical_slot(parent_slug, draft_field.key),
    )


# --- §9.2 Step 1 -- the bounded candidate set, plus its two verification gates ---


@functools.lru_cache(maxsize=None)
def _blocks_row_exists(slug: str) -> bool:
    """Verification gate 1. `block_composition` carries orphaned rows for
    deleted blocks (`blocks.is_stale` is 0 on every row, so it cannot serve as
    this signal). The real column on `blocks` is `slug`, not `block_slug`."""
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute("SELECT 1 FROM blocks WHERE slug = ?", (slug,)).fetchone()
    except sqlite3.OperationalError:
        return False
    finally:
        conn.close()
    return row is not None


@functools.lru_cache(maxsize=None)
def block_renders_inner_blocks(slug: str) -> bool:
    """Verification gate 2. `accepts_allowed_blocks` is seeded wrong for
    `sgs/product-card` and `sgs/team-member` -- both carry a non-empty list
    while their own code states they have no InnerBlocks slot at all. Comments
    are stripped before matching precisely because product-card's only
    "InnerBlocks" occurrence is inside one."""
    if "/" not in slug:
        return False
    edit_js = _BLOCKS_SRC / slug.split("/", 1)[1] / "edit.js"
    try:
        source = edit_js.read_text(encoding="utf-8")
    except OSError:
        return False
    return bool(_INNER_BLOCKS_RE.search(_strip_js_comments(source)))


def _accepts_allowed_blocks(parent_slug: str) -> tuple[str, ...] | None:
    """`None` == genuinely NULL (unrestricted, the only state §9.2's third
    source accepts). An empty tuple == an empty list, which still means "no
    children, gap" -- a different condition.

    DECISION SURFACED: a parent with NO `block_composition` row at all is
    returned as an empty tuple, not `None`. A missing row is not "genuinely
    NULL"; treating it as unrestricted would hand the container fallback to any
    typo'd slug. Every real block in the DB has a row today, so this branch is
    reachable only via a slug that does not exist.
    """
    conn = sqlite3.connect(SGS_DB)
    try:
        row = conn.execute(
            "SELECT accepts_allowed_blocks FROM block_composition WHERE block_slug = ?",
            (parent_slug,),
        ).fetchone()
    except sqlite3.OperationalError:
        return ()
    finally:
        conn.close()
    if row is None:
        return ()
    if row[0] is None:
        return None
    try:
        parsed = json.loads(row[0])
    except (TypeError, ValueError):
        return ()
    return tuple(str(s) for s in parsed) if isinstance(parsed, list) else ()


def _content_bearing_attr_names(block_slug: str) -> frozenset[str]:
    """§9.3's scoring surface for a BLOCK candidate: exact `attr_name`s,
    restricted to content-bearing roles, never `canonical_slot`/role."""
    content_roles = db_lookup._content_bearing_roles()
    if not content_roles:
        return frozenset()
    placeholders = ",".join("?" for _ in content_roles)
    conn = sqlite3.connect(SGS_DB)
    try:
        rows = conn.execute(
            "SELECT DISTINCT attr_name FROM block_attributes "
            f"WHERE block_slug = ? AND role IN ({placeholders})",
            (block_slug, *content_roles),
        ).fetchall()
    except sqlite3.OperationalError:
        return frozenset()
    finally:
        conn.close()
    return frozenset(r[0] for r in rows)


def build_candidate_set(
    parent_slug: str, matched_array_attrs: tuple[str, ...] = ()
) -> tuple[tuple[Tier3Candidate, ...], bool]:
    """§9.2 -- the bounded candidate set, plus whether the `sgs/container`
    fallback is eligible. Never a roster-wide search.

    Returns `(candidates, fallback_eligible)`. `fallback_eligible` is only ever
    True when the candidate set is empty AND the parent's
    `accepts_allowed_blocks` is genuinely NULL.
    """
    candidates: list[Tier3Candidate] = []

    for array_attr in sorted(_array_attrs_for_block(parent_slug)):
        if array_attr in matched_array_attrs:
            continue
        field_keys = frozenset(
            fk for fk, _role in _array_item_schema_rows(parent_slug, array_attr)
        )
        candidates.append(
            Tier3Candidate(kind="array-attr", name=array_attr, field_names=field_keys)
        )

    allowed = _accepts_allowed_blocks(parent_slug)
    if allowed and block_renders_inner_blocks(parent_slug):
        for slug in allowed:
            if not _blocks_row_exists(slug):
                continue  # gate 1: orphan, dropped silently -- never scored as if real
            candidates.append(
                Tier3Candidate(
                    kind="block", name=slug, field_names=_content_bearing_attr_names(slug)
                )
            )

    fallback_eligible = not candidates and allowed is None
    return tuple(candidates), fallback_eligible


# --- §9.3 Step 2 -- raw exact-name hit counts, never a percentage ---


def score_candidates(
    candidates: tuple[Tier3Candidate, ...], item_fields: frozenset[str]
) -> tuple[tuple[Tier3Candidate, int], ...]:
    """`hits(candidate)` = how many of the nested value's fields exactly match
    one of the candidate's own field names. Never a role or value-shape match:
    a role match is a wildcard a candidate can inflate merely by declaring a
    generic content-bearing role, which is the defect that broke this section
    twice."""
    return tuple((c, len(c.field_names & item_fields)) for c in candidates)


def _describe(scored: tuple[tuple[Tier3Candidate, int], ...]) -> str:
    return ", ".join(f"{c.name}={h}" for c, h in scored)


def select_candidate(
    field_key: str,
    parent_slug: str,
    candidates: tuple[Tier3Candidate, ...],
    item_fields: frozenset[str],
) -> tuple[Tier3Candidate, int] | Gap:
    """§9.3's selection rule: highest `hits()`, but only when it clears the
    absolute floor of 2 AND no other candidate ties that count. A tie is never
    broken by row order or list position."""
    scored = score_candidates(candidates, item_fields)
    best = max(h for _, h in scored)
    top = [c for c, h in scored if h == best]
    if best < 2:
        return Gap(
            field_key,
            reason="tier3_no_candidate_meets_evidence_floor",
            detail=f"{parent_slug}: highest raw hits {best} < 2 ({_describe(scored)})",
            candidates=tuple(c.name for c, _ in scored),
        )
    if len(top) > 1:
        return Gap(
            field_key,
            reason="tier3_ambiguous_candidate_tie",
            detail=(
                f"{parent_slug}: {len(top)} candidates tie at {best} raw hits "
                f"({_describe(scored)})"
            ),
            candidates=tuple(c.name for c in top),
        )
    return top[0], best


# --- §9.4 / §9.5 -- recursion with an explicit depth cap and visited-set ---


def _resolve_one_object(
    parent_slug: str,
    field_key: str,
    obj: dict[str, Any],
    candidates: tuple[Tier3Candidate, ...],
    *,
    max_depth: int,
    depth: int,
    visited: dict[int, Any],
) -> Tier3Placement | Gap:
    item_fields = _representative_fields(obj) or frozenset()
    selected = select_candidate(field_key, parent_slug, candidates, item_fields)
    if isinstance(selected, Gap):
        return selected
    candidate, hits = selected

    if candidate.kind == "array-attr":
        # The "new parent" here is the same block with the array attribute now
        # known, so the per-field work is Tier 1's own logic, not a descent into
        # a different block.
        inner = tuple(
            resolve_array_item_field(
                parent_slug, candidate.name, DraftField(key=k, value=v)
            )
            for k, v in obj.items()
        )
        return Tier3Placement(
            block_slug=parent_slug,
            field_key=field_key,
            resolved_kind="array-attribute",
            targets=(candidate.name,),
            matched_by="raw-hit-count",
            hits=hits,
            inner=inner,
        )

    inner = resolve_fields(
        candidate.name,
        tuple(DraftField(key=k, value=v) for k, v in obj.items()),
        max_depth=max_depth,
        _depth=depth,
        _visited=visited,
    )
    return Tier3Placement(
        block_slug=parent_slug,
        field_key=field_key,
        resolved_kind="child-block",
        targets=(candidate.name,),
        matched_by="raw-hit-count",
        hits=hits,
        inner=inner,
    )


def resolve_nested_field(
    parent_slug: str,
    draft_field: DraftField | RouteToTier3,
    nested_value: Any = None,
    *,
    matched_array_attrs: tuple[str, ...] = (),
    max_depth: int = DEFAULT_MAX_DEPTH,
    _depth: int = 0,
    _visited: dict[int, Any] | None = None,
) -> Tier3Placement | Tier3ArrayResolution | Gap:
    """Tier 3's entry point (§9). Takes either a `DraftField` or the
    `RouteToTier3` that `identify_array_field` returns for exactly this case
    (with the nested value supplied alongside it, since `RouteToTier3` carries
    only the key)."""
    if isinstance(draft_field, RouteToTier3):
        field_key, value = draft_field.field_key, nested_value
    else:
        field_key, value = draft_field.key, draft_field.value

    if is_function_literal(value):
        return Gap(field_key, reason="function_literal_excluded")
    if not is_nested_value(value):
        return Gap(
            field_key,
            reason="tier3_not_a_nested_value",
            detail=f"{parent_slug}: {type(value).__name__}",
        )

    visited = {} if _visited is None else _visited
    if id(value) in visited:
        return Gap(
            field_key,
            reason="tier3_cycle_detected",
            detail=f"{parent_slug}: value already visited at depth {_depth}",
        )
    if _depth >= max_depth:
        return Gap(
            field_key,
            reason="tier3_max_depth_exceeded",
            detail=f"{parent_slug}: depth {_depth} reached cap {max_depth}",
        )
    visited[id(value)] = value
    depth = _depth + 1

    own = resolve_own_object_attribute(parent_slug, DraftField(key=field_key, value=value))
    if own is not None:
        return own

    candidates, fallback_eligible = build_candidate_set(parent_slug, matched_array_attrs)

    if fallback_eligible:
        # Reuses the classed (BEM) path's proven default-container behaviour: an
        # unresolved child under a genuinely unrestricted parent recurses as
        # sgs/container rather than gapping. Placed directly -- §9.3's floor and
        # margin never apply to it, there being nothing to score it against.
        fields = value if isinstance(value, dict) else value[0]
        inner = resolve_fields(
            CONTAINER_FALLBACK_SLUG,
            tuple(DraftField(key=k, value=v) for k, v in fields.items()),
            max_depth=max_depth,
            _depth=depth,
            _visited=visited,
        )
        return Tier3Placement(
            block_slug=parent_slug,
            field_key=field_key,
            resolved_kind="container-fallback",
            targets=(CONTAINER_FALLBACK_SLUG,),
            matched_by="container-fallback",
            inner=inner,
        )

    if not candidates:
        return Gap(
            field_key,
            reason="tier3_empty_candidate_set",
            detail=(
                f"{parent_slug}: no un-matched array attribute, no verified "
                "allow-list, not eligible for the sgs/container fallback"
            ),
        )

    if isinstance(value, dict):
        return _resolve_one_object(
            parent_slug,
            field_key,
            value,
            candidates,
            max_depth=max_depth,
            depth=depth,
            visited=visited,
        )

    return Tier3ArrayResolution(
        block_slug=parent_slug,
        field_key=field_key,
        items=tuple(
            _resolve_one_object(
                parent_slug,
                field_key,
                item,
                candidates,
                max_depth=max_depth,
                depth=depth,
                visited=visited,
            )
            for item in value
        ),
    )


def resolve_fields(
    parent_slug: str,
    draft_fields: tuple[DraftField, ...],
    *,
    max_depth: int = DEFAULT_MAX_DEPTH,
    _depth: int = 0,
    _visited: dict[int, Any] | None = None,
) -> tuple[Any, ...]:
    """§9.4's "recurse the WHOLE resolver" -- the normative order of §4.1.0
    Step A, then Tier 1 / Tier 2 / Tier 3 per the resulting shape. Genuinely the
    same resolver, not a copy: this is what Tier 3's recursion re-enters with
    the selected candidate as the new parent.

    Tier 4 is not built (Spec 45 §10), so a field reaching this function always
    has a resolved parent by construction.
    """
    results: list[Any] = []
    for draft_field in draft_fields:
        routed = identify_array_field(parent_slug, draft_field)
        if isinstance(routed, str):
            value = draft_field.value
            items = value if isinstance(value, list) else [value]
            for item in items:
                if isinstance(item, dict):
                    results.extend(
                        resolve_array_item_field(
                            parent_slug, routed, DraftField(key=k, value=v)
                        )
                        for k, v in item.items()
                    )
                else:
                    results.append(
                        resolve_array_item_field(parent_slug, routed, draft_field)
                    )
        elif isinstance(routed, RouteToTier3):
            results.append(
                resolve_nested_field(
                    parent_slug,
                    routed,
                    draft_field.value,
                    max_depth=max_depth,
                    _depth=_depth,
                    _visited=_visited,
                )
            )
        else:
            results.append(resolve_scalar_attribute(parent_slug, draft_field))
    return tuple(results)
