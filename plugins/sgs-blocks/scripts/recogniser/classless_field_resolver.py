#!/usr/bin/env python3
"""classless_field_resolver.py -- Spec 45 field-mapping resolver, Tier 1.

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
