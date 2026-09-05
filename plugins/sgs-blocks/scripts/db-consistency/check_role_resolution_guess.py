"""check_role_resolution_guess.py — Check #12: order-dependent role resolution.

Spec ref: universal-variant-detection-audit plan (2026-09-05), Part C — the
structural guard the plan required for the defect class Part A fixed.

WHY THIS EXISTS
----------------------------------------------------------------------------
Part A of that plan root-caused a real, silent content-drop:
``converter/resolvers/array_content.py::_slot_extraction_role()`` derives the
extraction role for a slot as ``slot -> standalone block -> that block's
content-bearing attr role``. When the target block is POLYMORPHIC (more than
one content-bearing attribute), "the first content-bearing role found" is
whatever the DB returns first — i.e. **row-insertion order**. For
``sgs/trust-bar``'s ``media`` field that returned ``sgs/media.videoUrl``'s
role ``'content'`` (rich text) instead of ``imageUrl``'s ``'image-object'``,
so the draft's ``<img>`` was routed to a text extractor, found no text, and
was dropped — with no error anywhere.

Part A added an exact-match preference: a candidate whose own
``canonical_slot`` equals the slot being resolved wins. That fixed
``media``/``image``. It did NOT fix the general case, and the function's own
docstring says so: many slots still fall through to the unchecked
``candidates[0][0]`` guess because no candidate's ``canonical_slot`` matches.
The named residual is ``avatar`` / ``background-image`` / ``background-video``
-> ``sgs/media`` -> role ``'svg'`` — the same wrong-role-guess shape as the
bug Part A closed.

This check makes that residual, and any FUTURE regression of the same shape,
fail loudly instead of silently dropping content.

THE RULE
----------------------------------------------------------------------------
For every slot that ``_slot_extraction_role()`` can be asked to resolve, the
returned role must NOT depend on DB row order.

A slot is inspected when it is reachable by either of the function's two real
call sites in ``array_content.py``:

  (1) ``_item_field_schema()`` — an ``array_item_schema`` row with
      ``role IS NULL`` (the block declares no explicit role in its block.json
      ``items.properties.<field>.role``), whose ``field_key`` resolves to a
      canonical slot.
  (2) ``_lift_item()`` — ANY element-scope slot in the ``slots`` table with a
      ``standalone_block``, because a draft child's BEM token resolves to one
      of those and its role is derived the same way.

For each such slot, resolution is classified:

  CONFIRMED   — at least one content-bearing candidate on the target block has
                ``canonical_slot == slot``. The exact-match branch fires; the
                answer is anchored in data, not row order. PASS.
  DETERMINATE — the fallback fires (no candidate matches the slot) but every
                content-bearing candidate carries the SAME role. There is
                nothing to choose between; ``candidates[0][0]`` is the only
                possible answer whatever the row order. PASS — and this is
                deliberate, not laxity: the function's docstring documents this
                exact case as legitimate (the ``label`` slot resolves to
                ``sgs/label``, whose only content attr is ``text`` with
                ``canonical_slot='text'``). Flagging it would make the check
                fire on correct code and be baselined into meaninglessness.
                If a second, DIFFERENTLY-roled content attr is ever added to
                such a block, the slot moves to the class below and the check
                fires — which is precisely the regression to catch.
  GUESS       — the fallback fires AND the candidates carry two or more
                DIFFERENT roles. The returned role is decided by which row the
                DB happened to return first. **VIOLATION.**

WHY "TWO OR MORE DIFFERENT ROLES" IS THE LINE
----------------------------------------------------------------------------
The defect is not "a fallback ran". The defect is "the answer could silently
change without anybody editing the resolution logic" — a reseed, a new
attribute on a shared target block, or a different insertion order flips the
extraction role and content stops being lifted. That is exactly how the
trust-bar bug arrived, and it is invisible to every other gate: the emitted
markup is well-formed, just missing a field.

DRIFT GUARD
----------------------------------------------------------------------------
This check calls the REAL ``_slot_extraction_role()`` (never a second copy of
its decision logic) and asserts the role it returns is one of the candidate
roles this check enumerated. If the real function is refactored into a shape
this check no longer models, that mismatch is itself reported as a violation
rather than the check silently classifying everything as PASS — the "a check
that stopped detecting looks identical to a clean tree" failure mode.

FIX for a violation — two routes, both real, neither a workaround:
  (a) The array-item route (Part A's own convention): declare an explicit
      ``role`` on the field in the block's ``block.json``
      ``items.properties.<field>.role`` and reseed. A declared role is read
      straight from ``array_item_schema.role`` and never reaches this
      derivation at all.
  (b) The slot route: give the owning attribute on the target block a
      ``canonical_slot`` equal to the slot (so the exact-match branch
      confirms it), or point the slot at a target block that is not
      polymorphic.
"""
from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from .models import Violation, role_resolution_guess_key

# ---------------------------------------------------------------------------
# Import the REAL _slot_extraction_role — never a hand-rolled second copy of
# its decision logic (R-22-1 reuse; same doctrine as
# check_dead_composition_signal.py importing the real derive_delegates_content).
#
# array_content.py is a package module with real intra-package imports
# (converter.context, converter.services.*), so it CANNOT be loaded by bare
# file path the way has_inner.py is — scripts/ must be on sys.path and it must
# be imported under its normal dotted name. That also keeps db_lookup a SINGLE
# module instance, so a test can repoint db_lookup.SGS_DB at a fixture DB and
# have the real function read the fixture.
# ---------------------------------------------------------------------------

_SCRIPTS_DIR = Path(__file__).resolve().parents[1]  # plugins/sgs-blocks/scripts/

if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

try:
    from converter.resolvers.array_content import _slot_extraction_role  # noqa: E402
    from converter.db import db_lookup  # noqa: E402
except Exception as exc:  # noqa: BLE001
    raise ImportError(
        f"[check_role_resolution_guess] Failed to import the real "
        f"_slot_extraction_role from converter/resolvers/array_content.py: {exc}\n"
        "This check requires the live function — it must never re-implement "
        "the resolution logic it exists to guard."
    ) from exc


# ---------------------------------------------------------------------------
# DB reads — from the CALLER's connection, so a planted fixture is authoritative
# and no lru_cache can serve a stale answer mid-run.
# ---------------------------------------------------------------------------

def _content_bearing_roles(conn: sqlite3.Connection) -> frozenset[str]:
    """Role names classified 'content-bearing' (the positive allowlist)."""
    try:
        rows = conn.execute(
            "SELECT role_name FROM roles WHERE classification = 'content-bearing'"
        ).fetchall()
    except sqlite3.OperationalError:
        return frozenset()
    return frozenset(r[0] for r in rows)


def _element_slots(conn: sqlite3.Connection) -> list[tuple[str, str]]:
    """(slot_name, standalone_block) for every element-scope slot with a target.

    Mirrors db_lookup._slot_to_standalone_block()'s own query — this is the
    domain call site (2) can reach.
    """
    try:
        return conn.execute(
            "SELECT slot_name, standalone_block FROM slots "
            "WHERE scope = 'element' AND standalone_block IS NOT NULL "
            "AND standalone_block != '' ORDER BY slot_name"
        ).fetchall()
    except sqlite3.OperationalError:
        return []


def _undeclared_array_fields(conn: sqlite3.Connection) -> list[tuple[str, str, str]]:
    """(block_slug, array_attr, field_key) for array-item fields with NO declared
    role — the rows that fall through to _slot_extraction_role() at call site (1).
    """
    try:
        return conn.execute(
            "SELECT block_slug, array_attr, field_key FROM array_item_schema "
            "WHERE role IS NULL ORDER BY block_slug, array_attr, field_order"
        ).fetchall()
    except sqlite3.OperationalError:
        return []


def _container_marker_slots(conn: sqlite3.Connection) -> frozenset[str]:
    """Slots whose `resolves_whole_instance` column is 'true' (Check#12 Build 3,
    2026-09-06). Mirrors db_lookup.is_container_marker_slot()'s own query on the
    CALLER's connection so a planted fixture is authoritative here too. These
    slots' target block is a whole nested composite to insert as-is (like the
    pre-existing `step`/`badge` shapes) — never a scalar field to guess a role
    for, so they are excluded from the guess/determinate/confirmed classification
    entirely rather than being expected to resolve to a role at all.
    """
    try:
        rows = conn.execute(
            "SELECT slot_name FROM slots "
            "WHERE scope = 'element' AND resolves_whole_instance = 'true'"
        ).fetchall()
    except sqlite3.OperationalError:
        return frozenset()
    return frozenset(r[0] for r in rows)


def _canonical_slot_aliases(raw: str | None) -> tuple[str, ...]:
    """Parse a `canonical_slot_aliases` TEXT column (Check#12 Build 2,
    2026-09-06) into a tuple. Soft-fails to () on a missing/malformed value."""
    if not raw:
        return ()
    try:
        parsed = json.loads(raw)
    except (ValueError, TypeError):
        return ()
    if not isinstance(parsed, list):
        return ()
    return tuple(a for a in parsed if isinstance(a, str))


def _candidates(
    conn: sqlite3.Connection, block: str, content_roles: frozenset[str]
) -> list[tuple[str, str, str | None, tuple[str, ...]]]:
    """(attr_name, role, canonical_slot, canonical_slot_aliases) content-bearing
    candidates on a block. `canonical_slot_aliases` (Check#12 Build 2) lists
    EXTRA slot names the attr also answers to beyond its primary
    `canonical_slot` (e.g. sgs/button.label answers to canonical_slot='button'
    plus the 3 other button style-variant slots) — an exact match against
    either is CONFIRMED, not a guess. Column may not exist on an unmigrated DB.
    """
    try:
        cols = {r[1] for r in conn.execute("PRAGMA table_info(block_attributes)").fetchall()}
        has_aliases_col = "canonical_slot_aliases" in cols
        select_cols = "attr_name, role, canonical_slot" + (
            ", canonical_slot_aliases" if has_aliases_col else ""
        )
        rows = conn.execute(
            f"SELECT {select_cols} FROM block_attributes WHERE block_slug = ?",  # noqa: S608
            (block,),
        ).fetchall()
    except sqlite3.OperationalError:
        return []
    out = []
    for row in rows:
        a, r, cs = row[:3]
        aliases_raw = row[3] if has_aliases_col else None
        if r in content_roles:
            out.append((a, r, cs, _canonical_slot_aliases(aliases_raw)))
    return out


# ---------------------------------------------------------------------------
# Check
# ---------------------------------------------------------------------------

def run(conn: sqlite3.Connection) -> list[Violation]:
    """Run check #12 (order-dependent role resolution) against a DB.

    Parameters
    ----------
    conn : open sqlite3.Connection to sgs-framework.db

    Returns
    -------
    list[Violation] — one per SLOT whose extraction role is decided by DB row
    order. Keyed per slot (not per block, not per field): the slot IS the unit
    of the defect, and three array fields routing through one ambiguous slot
    are one problem with one fix, not three.
    """
    violations: list[Violation] = []

    content_roles = _content_bearing_roles(conn)
    container_marker_slots = _container_marker_slots(conn)
    if not content_roles:
        # No roles table / no content-bearing classification: the resolver
        # itself returns None for everything, so there is nothing to guess at.
        return violations

    # Which array-item fields route through each slot — carried into the
    # violation detail so the report names the concrete affected fields, not
    # just an abstract slot.
    fields_by_slot: dict[str, list[str]] = {}
    for block_slug, array_attr, field_key in _undeclared_array_fields(conn):
        slot = db_lookup.canonical_slot_for(field_key)
        if slot:
            fields_by_slot.setdefault(slot, []).append(
                f"{block_slug}.{array_attr}.{field_key}"
            )

    # Domain = every element-scope slot with a target block (call site 2),
    # UNION every slot an undeclared array field resolves to (call site 1).
    domain: dict[str, str | None] = {}
    for slot_name, _standalone in _element_slots(conn):
        domain[slot_name] = None
    for slot_name in fields_by_slot:
        domain.setdefault(slot_name, None)

    for slot in sorted(domain):
        if slot in container_marker_slots:
            # Check#12 Build 3 (2026-09-06): this slot's target block is a
            # whole nested composite to insert as-is (the same shape `step`/
            # `badge` already have by construction — zero content-bearing
            # candidates on their own target block). Forcing a canonical_slot
            # onto one of the target block's content attrs would misroute
            # real content, so this is not a role question at all. PASS.
            continue

        # Resolve the target block through the REAL accessor, so the
        # 'status=built' cross-check the resolver applies is applied here too.
        block = db_lookup.standalone_block_for(slot)
        if not block:
            continue  # resolver returns None — no role, nothing to guess

        candidates = _candidates(conn, block, content_roles)
        if not candidates:
            continue  # resolver returns None

        resolved = _slot_extraction_role(slot)
        candidate_roles = sorted({r for _a, r, _cs, _al in candidates})

        # --- drift guard -------------------------------------------------
        # The real function must return one of the candidate roles this check
        # enumerated. If it does not, this check no longer models the function
        # it guards and must say so LOUDLY rather than pass everything.
        if resolved is not None and resolved not in candidate_roles:
            violations.append(Violation(
                check="role_resolution_guess",
                block=block,
                detail=(
                    f"CHECK DRIFT: _slot_extraction_role('{slot}') returned "
                    f"'{resolved}', which is not one of the content-bearing "
                    f"candidate roles this check enumerated on {block} "
                    f"({candidate_roles}). The real resolver's shape has "
                    f"changed and check_role_resolution_guess.py no longer "
                    f"models it — every slot it inspects may now be "
                    f"misclassified as passing."
                ),
                fix=(
                    "Read converter/resolvers/array_content.py::"
                    "_slot_extraction_role() and update "
                    "plugins/sgs-blocks/scripts/db-consistency/"
                    "check_role_resolution_guess.py to match its current "
                    "resolution shape, in the SAME commit that changed it."
                ),
                key=role_resolution_guess_key(f"drift:{slot}"),
            ))
            continue

        if any(cs == slot or slot in al for _a, _r, cs, al in candidates):
            # CONFIRMED — the exact-match branch anchors the answer, either
            # via canonical_slot itself or a canonical_slot_aliases entry
            # (Check#12 Build 2, 2026-09-06).
            continue

        if len(candidate_roles) < 2:
            continue  # DETERMINATE — one possible answer whatever the row order

        # GUESS — the returned role is decided by DB row order.
        owning = sorted(
            f"{a} (role={r}, canonical_slot={cs!r})" for a, r, cs, _al in candidates
        )
        affected = fields_by_slot.get(slot, [])
        affected_txt = (
            " Affected array-item field(s) with no declared role: "
            + ", ".join(sorted(affected)) + "."
            if affected else
            " No array-item field routes through this slot today; it is still "
            "reachable from a draft child's BEM token via _lift_item()."
        )
        violations.append(Violation(
            check="role_resolution_guess",
            block=block,
            detail=(
                f"slot '{slot}' -> {block}: _slot_extraction_role() resolved it "
                f"to role '{resolved}' by UNCHECKED FALLBACK — no content-bearing "
                f"attribute on {block} has canonical_slot='{slot}', and {block} "
                f"carries {len(candidates)} content-bearing attributes across "
                f"{len(candidate_roles)} DIFFERENT roles ({candidate_roles}), so "
                f"the answer is whichever row the DB returns first (insertion "
                f"order), not a fact about the slot. A reseed, a re-order, or a "
                f"new content-bearing attribute on {block} silently changes the "
                f"extraction role and the draft's value is dropped with no error "
                f"— the exact shape of the sgs/trust-bar image-badge bug. "
                f"Candidates: {owning}.{affected_txt}"
            ),
            fix=(
                f"Either (a) declare an explicit extraction role on each affected "
                f"array-item field in its block's block.json "
                f"(items.properties.<field>.role — a declared role is read from "
                f"array_item_schema.role and never reaches this derivation), then "
                f"run: python plugins/sgs-blocks/scripts/sgs-update-v2.py "
                f"--stage 1 ; or (b) set canonical_slot='{slot}' on the "
                f"attribute of {block} that genuinely owns this slot (declare it "
                f"in that block's block.json and reseed) so the exact-match "
                f"branch of _slot_extraction_role() confirms the role instead of "
                f"guessing."
            ),
            key=role_resolution_guess_key(slot),
        ))

    return violations
