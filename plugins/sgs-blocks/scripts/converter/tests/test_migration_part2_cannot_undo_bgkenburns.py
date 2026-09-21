"""test_migration_part2_cannot_undo_bgkenburns.py -- the 2026-08-13 role-remediation migration must never
re-route ``bgKenBurns`` to a CSS property.

``migrations/2026-08-13-role-remediation-part2-overrides.py`` once classified ``bgKenBurns`` as
``css-gate`` + ``css_property='animation'`` on six blocks. That routed a draft's raw ``animation`` value
(a marquee, a pulse) to a boolean toggle, which wrote ``bgKenBurns:"none"`` (PHP reads it as true). The
overrides file was corrected (boolean-visibility, no css_property) but the migration still listed the rows,
and its live-DB UPDATE runs for every listed row even when the overrides file already has the key, so a
re-run would have silently undone the fix. The rows are removed; this test fails if any comes back.

Run from plugins/sgs-blocks/scripts:
    python -m pytest converter/tests/test_migration_part2_cannot_undo_bgkenburns.py -q -p no:cacheprovider
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest

SCRIPTS = Path(__file__).resolve().parents[2]
MIGRATION = SCRIPTS / "migrations" / "2026-08-13-role-remediation-part2-overrides.py"
OVERRIDES = SCRIPTS / "attr-classification-overrides.json"


def _entries() -> list[tuple]:
    spec = importlib.util.spec_from_file_location("role_remediation_part2", MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # defines ENTRIES; touches no DB and writes nothing until main() runs
    return list(module.ENTRIES)


def _undoing_rows(entries: list[tuple]) -> list[tuple]:
    """Rows that would re-route bgKenBurns to a CSS property (any role, any css_property)."""
    return [e for e in entries if e[1] == "bgKenBurns" and e[3] is not None]


def test_the_migration_lists_no_bgkenburns_row_that_carries_a_css_property():
    assert _undoing_rows(_entries()) == []


def test_the_migration_lists_no_bgkenburns_row_at_all_so_the_db_update_cannot_touch_it():
    assert [e for e in _entries() if e[1] == "bgKenBurns"] == []


def test_the_check_can_fail_negative_control():
    planted = [("sgs/container", "bgKenBurns", "css-gate", "animation")]
    assert _undoing_rows(_entries() + planted) == planted


def test_the_overrides_file_keeps_bgkenburns_a_plain_toggle():
    entries = json.loads(OVERRIDES.read_text(encoding="utf-8"))["entries"]
    kb = [e for e in entries if e["attr"] == "bgKenBurns"]
    assert kb, "the overrides file must still classify bgKenBurns"
    for e in kb:
        assert e["fields"].get("role") == "boolean-visibility", e
        assert "css_property" not in e["fields"], e


@pytest.mark.parametrize("row", [
    ("sgs/container", "bgKenBurns", "css-gate", "animation"),
    ("sgs/hero", "bgKenBurns", "css-gate", "animation"),
])
def test_a_reintroduced_row_is_caught(row):
    assert _undoing_rows([row]) == [row]
