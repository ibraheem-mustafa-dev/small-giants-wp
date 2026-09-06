"""Regression test for the `sgs/testimonial.reviewerName` slot-vocabulary gap
(D497 Gap A, 2026-08-05).

Root cause: `reviewerName` had no entry anywhere in `slots.aliases`, so
`resolve_canonical_slot()` could never derive a `canonical_slot` for it —
the row's classification depended entirely on the hand-authored
`attr-classification-overrides.json` entry (role + a compound
derived_selector). Fix: added `"reviewer-name"` to the `heading` slot's
alias list in `scripts/data/slots.json` — the SAME "prominent short text"
bucket that already holds `name` (used by `sgs/team-member.name`),
`productName`, `title`, etc.

This test drives the REAL production functions
(`load_slot_aliases` + `resolve_canonical_slot` from
`behavioural-analyser/assign-canonical.py`) against a synthetic `slots`
table built from the live `data/slots.json` content — not the shared
sgs-framework.db (no DB writes here; a reseed is a separate, human-run step).

Proven able to fail: `test_planted_break_removing_the_alias_fails` re-derives
the same assertion against the alias-list with the fix reverted and asserts
resolution goes back to None — i.e. this file is not vacuously green.
"""
from __future__ import annotations

import importlib.util
import json
import sqlite3
from pathlib import Path

import pytest

_AC_PATH = (
    Path(__file__).resolve().parents[2]
    / "behavioural-analyser"
    / "assign-canonical.py"
)
_SLOTS_JSON_PATH = (
    Path(__file__).resolve().parents[2] / "data" / "slots.json"
)


def _load_ac():
    spec = importlib.util.spec_from_file_location("assign_canonical_mod_gapA", _AC_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _make_slots_db(rows: list[tuple]) -> sqlite3.Connection:
    """rows: list of (slot_name, scope, aliases_json, standalone_block)."""
    conn = sqlite3.connect(":memory:")
    conn.execute(
        "CREATE TABLE slots (slot_name TEXT, scope TEXT, aliases TEXT, "
        "standalone_block TEXT, notes TEXT, standalone_block_default_attrs TEXT)"
    )
    for slot_name, scope, aliases_json, standalone in rows:
        conn.execute(
            "INSERT INTO slots (slot_name, scope, aliases, standalone_block) "
            "VALUES (?,?,?,?)",
            (slot_name, scope, aliases_json, standalone),
        )
    conn.commit()
    return conn


def _rows_from_live_slots_json() -> list[tuple]:
    """Load the actual seed file so this test tracks the real data, not a copy.

    Reads only the first 4 columns positionally and ignores the rest by name
    lookup against `__columns` — so a WIDENING of slots.json's row shape
    (e.g. `resolves_whole_instance` added 2026-09-06, Check#12 Build 3) never
    breaks this unpack again; only slot_name/scope/aliases/standalone_block
    are load-bearing for the alias-resolution behaviour this file tests.
    """
    data = json.loads(_SLOTS_JSON_PATH.read_text(encoding="utf-8"))
    cols = list(data["__columns"])
    idx = {name: cols.index(name) for name in
           ("slot_name", "scope", "aliases", "standalone_block")}
    out = []
    for row in data["rows"]:
        out.append((
            row[idx["slot_name"]], row[idx["scope"]],
            row[idx["aliases"]], row[idx["standalone_block"]],
        ))
    return out


def test_reviewer_name_resolves_via_heading_alias():
    """The live slots.json (post-fix) must let 'reviewerName' resolve to
    canonical_slot='heading' via Tier 0 full-attr-name match — the SAME path
    that already resolves the bare 'name' attr for sgs/team-member."""
    ac = _load_ac()
    conn = _make_slots_db(_rows_from_live_slots_json())
    slot_map = ac.load_slot_aliases(conn)

    canonical_slot, _role = ac.resolve_canonical_slot("reviewerName", slot_map)
    assert canonical_slot == "heading", (
        "reviewerName should resolve to the 'heading' slot via the "
        "'reviewer-name' alias added to data/slots.json — got "
        f"{canonical_slot!r}. If this fails, check the 'heading' row's "
        "aliases array still contains 'reviewer-name'."
    )

    # Sanity: the existing 'name' alias (team-member precedent) still works —
    # proves the fix didn't clobber the pre-existing entry.
    name_slot, _ = ac.resolve_canonical_slot("name", slot_map)
    assert name_slot == "heading"


def test_planted_break_removing_the_alias_fails():
    """Negative control: with 'reviewer-name' stripped back out of the
    heading row's aliases (simulating the pre-fix state), resolution must
    go back to None. Proves the positive test above is not vacuous."""
    ac = _load_ac()
    rows = _rows_from_live_slots_json()
    broken_rows = []
    for slot_name, scope, aliases_json, standalone in rows:
        if slot_name == "heading":
            aliases = json.loads(aliases_json)
            aliases = [a for a in aliases if a != "reviewer-name"]
            aliases_json = json.dumps(aliases)
        broken_rows.append((slot_name, scope, aliases_json, standalone))

    conn = _make_slots_db(broken_rows)
    slot_map = ac.load_slot_aliases(conn)

    canonical_slot, _role = ac.resolve_canonical_slot("reviewerName", slot_map)
    assert canonical_slot is None, (
        "Planted-break control failed to reproduce the pre-fix gap — "
        "the alias removal didn't take effect, so the positive test above "
        "cannot be trusted as proof."
    )


if __name__ == "__main__":
    import sys
    sys.exit(pytest.main([__file__, "-q"]))
