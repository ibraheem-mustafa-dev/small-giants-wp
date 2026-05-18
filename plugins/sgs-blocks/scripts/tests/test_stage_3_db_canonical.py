"""
test_stage_3_db_canonical.py
============================
Pytest suite for the Stage 3 DB-canonical slot-list wiring introduced per the
Wave 3b audit finding:

  "Stage 3 slot list uses attribute_role: 'auto-derived' from block.json,
   never calling DB canonical_slot_for(). Stage 3 not actually DB-driven."

Tests four scenarios:

1. Attribute with populated canonical_slot in DB → canonical_source: 'db'
2. Attribute with NULL canonical_slot (canonicalisation gap) → canonical_source:
   'auto-derived' + slot_canonicalisation_gap: True
3. Mixed block (some canonical, some not) → both paths fire; output preserves both
4. Regression — Spec 15 Phase 1's existing canonical_slot population for Mama's
   Munches hero attributes still resolves via DB (sgs/hero.heading, sgs/hero.text)

UK English throughout.
Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_stage_3_db_canonical.py -v
"""

from __future__ import annotations

import json
import sqlite3
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

# ---------------------------------------------------------------------------
# sys.path — add scripts root so orchestrator.converter_v2.db_lookup resolves
# ---------------------------------------------------------------------------

_REPO_ROOT = Path(__file__).resolve().parents[4]       # small-giants-wp/
_SCRIPTS_ROOT = _REPO_ROOT / "plugins" / "sgs-blocks" / "scripts"
_ORCHESTRATOR_DIR = _SCRIPTS_ROOT / "orchestrator"

if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

# ---------------------------------------------------------------------------
# Import the orchestrator module under test.
# The heavy dependencies (BeautifulSoup, trace module, etc.) are lazy-loaded
# inside the orchestrator, so the import itself is lightweight.
# ---------------------------------------------------------------------------

import importlib.util as _ilu

_ORCH_SPEC = _ilu.spec_from_file_location(
    "sgs_clone_orchestrator",
    _SCRIPTS_ROOT / "sgs-clone-orchestrator.py",
)
_ORCH_MOD = _ilu.module_from_spec(_ORCH_SPEC)  # type: ignore[arg-type]
_ORCH_SPEC.loader.exec_module(_ORCH_MOD)  # type: ignore[union-attr]

stage_3_slot_list = _ORCH_MOD.stage_3_slot_list
write_artefact = _ORCH_MOD.write_artefact
REPO = _ORCH_MOD.REPO


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_match_output(block_name: str, boundary_id: str = "test-boundary-1") -> dict:
    """Build a minimal Stage 2 match_output dict for a single boundary."""
    return {
        "matches": [
            {
                "boundary_id": boundary_id,
                "block_name": block_name,
                "section_id": "section-1",
            }
        ]
    }


def _slots_by_name(slot_list_entry: dict) -> dict[str, dict]:
    """Return {slot_name: slot_dict} for quick lookup in assertions."""
    return {s["slot_name"]: s for s in slot_list_entry["slots"]}


# ---------------------------------------------------------------------------
# Test 1 — attribute with populated canonical_slot in DB → canonical_source: 'db'
# ---------------------------------------------------------------------------

class TestDbCanonicalSlotPopulated:
    """When block_attrs() returns a row with a non-NULL canonical_slot, the slot
    entry must carry canonical_source='db' and the DB canonical_slot value."""

    def test_db_row_present_uses_canonical_source_db(self, tmp_path: Path) -> None:
        """Attribute with DB canonical_slot → slot entry has canonical_source='db'."""
        db_row = {
            "attr_type": "string",
            "role": "content",
            "canonical_slot": "heading",
        }

        # Set up the fake repo structure and write block.json BEFORE patching REPO
        _make_fake_repo(tmp_path, "hero")
        _write_block_json(tmp_path, "hero", {"headline": {"type": "string", "default": ""}})

        with (
            patch.object(_ORCH_MOD, "_load_db_block_attrs", return_value={"headline": db_row}),
            patch.object(_ORCH_MOD, "REPO", new=tmp_path),
        ):
            output = stage_3_slot_list(
                _make_match_output("sgs/hero"),
                tmp_path,
            )

        slots = _slots_by_name(output["slot_lists"]["test-boundary-1"])
        assert "headline" in slots, "Expected slot 'headline' in slot list"
        slot = slots["headline"]
        assert slot["canonical_source"] == "db", (
            f"Expected canonical_source='db', got {slot['canonical_source']!r}"
        )
        assert slot["canonical_slot"] == "heading", (
            f"Expected canonical_slot='heading' from DB, got {slot['canonical_slot']!r}"
        )
        assert slot.get("slot_canonicalisation_gap") is None or slot.get("slot_canonicalisation_gap") is False, (
            "DB-canonical slot must NOT have slot_canonicalisation_gap set"
        )

    def test_db_role_propagated(self, tmp_path: Path) -> None:
        """Role from DB row must appear as attribute_role on the slot entry."""
        db_row = {"attr_type": "string", "role": "content", "canonical_slot": "heading"}

        _make_fake_repo(tmp_path, "hero")
        _write_block_json(tmp_path, "hero", {"headline": {"type": "string"}})
        with (
            patch.object(_ORCH_MOD, "_load_db_block_attrs", return_value={"headline": db_row}),
            patch.object(_ORCH_MOD, "REPO", new=tmp_path),
        ):
            output = stage_3_slot_list(_make_match_output("sgs/hero"), tmp_path)

        slot = _slots_by_name(output["slot_lists"]["test-boundary-1"])["headline"]
        assert slot["attribute_role"] == "content"


# ---------------------------------------------------------------------------
# Test 2 — attribute with NULL canonical_slot → auto-derived + gap marker
# ---------------------------------------------------------------------------

class TestAutoDeriveFallback:
    """When DB has a row but canonical_slot is NULL, OR when DB has no row at all,
    Stage 3 must fall back to auto-derived and set slot_canonicalisation_gap=True."""

    def test_null_canonical_slot_sets_gap_marker(self, tmp_path: Path) -> None:
        db_row = {"attr_type": "string", "role": None, "canonical_slot": None}

        _make_fake_repo(tmp_path, "info-box")
        _write_block_json(tmp_path, "info-box", {"ctaText": {"type": "string", "default": ""}})
        with (
            patch.object(_ORCH_MOD, "_load_db_block_attrs", return_value={"ctaText": db_row}),
            patch.object(_ORCH_MOD, "REPO", new=tmp_path),
        ):
            output = stage_3_slot_list(_make_match_output("sgs/info-box"), tmp_path)

        slot = _slots_by_name(output["slot_lists"]["test-boundary-1"])["ctaText"]
        assert slot["canonical_source"] == "auto-derived", (
            f"NULL canonical_slot must produce canonical_source='auto-derived', got {slot['canonical_source']!r}"
        )
        assert slot.get("slot_canonicalisation_gap") is True, (
            "NULL canonical_slot must set slot_canonicalisation_gap=True"
        )

    def test_missing_db_row_sets_gap_marker(self, tmp_path: Path) -> None:
        """Attribute absent from DB entirely → auto-derived + gap marker."""
        _make_fake_repo(tmp_path, "info-box")
        _write_block_json(tmp_path, "info-box", {"unknownAttr": {"type": "boolean"}})
        with (
            patch.object(_ORCH_MOD, "_load_db_block_attrs", return_value={}),
            patch.object(_ORCH_MOD, "REPO", new=tmp_path),
        ):
            output = stage_3_slot_list(_make_match_output("sgs/info-box"), tmp_path)

        slot = _slots_by_name(output["slot_lists"]["test-boundary-1"])["unknownAttr"]
        assert slot["canonical_source"] == "auto-derived"
        assert slot.get("slot_canonicalisation_gap") is True

    def test_auto_derived_slot_name_equals_attr_name(self, tmp_path: Path) -> None:
        """Auto-derived canonical_slot should equal the attr_name (identity fallback)."""
        _make_fake_repo(tmp_path, "info-box")
        _write_block_json(tmp_path, "info-box", {"myAttr": {"type": "string"}})
        with (
            patch.object(_ORCH_MOD, "_load_db_block_attrs", return_value={}),
            patch.object(_ORCH_MOD, "REPO", new=tmp_path),
        ):
            output = stage_3_slot_list(_make_match_output("sgs/info-box"), tmp_path)

        slot = _slots_by_name(output["slot_lists"]["test-boundary-1"])["myAttr"]
        assert slot["canonical_slot"] == "myAttr", (
            "Auto-derived canonical_slot must default to the attr_name itself"
        )


# ---------------------------------------------------------------------------
# Test 3 — mixed block (some canonical, some not)
# ---------------------------------------------------------------------------

class TestMixedBlock:
    """A block with a mix of canonicalised and non-canonicalised attributes must
    produce a slot list where each entry correctly reflects its source."""

    def test_mixed_attrs_both_paths_fire(self, tmp_path: Path) -> None:
        db_attrs = {
            "heading": {"attr_type": "string", "role": "content", "canonical_slot": "heading"},
            "text":    {"attr_type": "string", "role": "content", "canonical_slot": "text"},
            "bgColour": {"attr_type": "string", "role": "color", "canonical_slot": None},  # gap
            # "newAttr" is absent from DB entirely — also a gap
        }

        _make_fake_repo(tmp_path, "hero")
        _write_block_json(tmp_path, "hero", {
            "heading":  {"type": "string"},
            "text":     {"type": "string"},
            "bgColour": {"type": "string"},
            "newAttr":  {"type": "boolean"},
        })
        with (
            patch.object(_ORCH_MOD, "_load_db_block_attrs", return_value=db_attrs),
            patch.object(_ORCH_MOD, "REPO", new=tmp_path),
        ):
            output = stage_3_slot_list(_make_match_output("sgs/hero"), tmp_path)

        slots = _slots_by_name(output["slot_lists"]["test-boundary-1"])

        # DB-canonical attrs
        assert slots["heading"]["canonical_source"] == "db"
        assert slots["heading"].get("slot_canonicalisation_gap") is None or \
               slots["heading"].get("slot_canonicalisation_gap") is False
        assert slots["text"]["canonical_source"] == "db"

        # Auto-derived (gap) attrs
        assert slots["bgColour"]["canonical_source"] == "auto-derived"
        assert slots["bgColour"].get("slot_canonicalisation_gap") is True

        assert slots["newAttr"]["canonical_source"] == "auto-derived"
        assert slots["newAttr"].get("slot_canonicalisation_gap") is True

    def test_mixed_total_slot_count_preserved(self, tmp_path: Path) -> None:
        """Total slot count must equal total attribute count — no silent skipping."""
        db_attrs = {
            "heading": {"attr_type": "string", "role": "content", "canonical_slot": "heading"},
        }
        attr_count = 4

        _make_fake_repo(tmp_path, "hero")
        _write_block_json(tmp_path, "hero", {
            "heading":  {"type": "string"},
            "text":     {"type": "string"},
            "bgColour": {"type": "string"},
            "newAttr":  {"type": "boolean"},
        })
        with (
            patch.object(_ORCH_MOD, "_load_db_block_attrs", return_value=db_attrs),
            patch.object(_ORCH_MOD, "REPO", new=tmp_path),
        ):
            output = stage_3_slot_list(_make_match_output("sgs/hero"), tmp_path)

        actual_count = len(output["slot_lists"]["test-boundary-1"]["slots"])
        assert actual_count == attr_count, (
            f"Expected {attr_count} slots (one per attr), got {actual_count}. "
            "Universal-extraction principle: never silently skip an attribute."
        )


# ---------------------------------------------------------------------------
# Test 4 — regression: Mama's Munches hero attrs resolve via DB
# ---------------------------------------------------------------------------

class TestMamasMunchesHeroRegression:
    """Regression guard for Spec 15 Phase 1 canonical_slot population.

    sgs/hero is the canonical Phase 1 block. The DB should have populated
    canonical_slot for at least the two core content attrs (heading, text).
    If it does, Stage 3 must return canonical_source='db' for those slots.

    Uses the LIVE sgs-framework.db (no mocking) so this test validates the
    actual DB state matches the spec's Phase 1 contract.
    """

    def test_hero_heading_resolves_via_live_db(self, tmp_path: Path) -> None:
        """Live DB: sgs/hero 'heading' attr should have canonical_slot populated."""
        # Import the real block_attrs function to test live DB state
        try:
            if str(_SCRIPTS_ROOT) not in sys.path:
                sys.path.insert(0, str(_SCRIPTS_ROOT))
            from orchestrator.converter_v2.db_lookup import block_attrs  # type: ignore[import]
        except ImportError as exc:
            pytest.skip(f"db_lookup not importable in this environment: {exc}")

        hero_attrs = block_attrs("sgs/hero")

        if not hero_attrs:
            pytest.skip(
                "sgs/hero has no rows in block_attributes — run /sgs-update to populate. "
                "Test is a regression guard for post-/sgs-update state."
            )

        # At minimum the 'heading' attribute should be in the DB
        if "heading" not in hero_attrs:
            pytest.skip(
                "'heading' attr not in block_attributes for sgs/hero — "
                "run assign-canonical.py to backfill canonical_slot values."
            )

        canonical = hero_attrs["heading"].get("canonical_slot")
        assert canonical is not None, (
            "sgs/hero.heading should have canonical_slot set after /sgs-update Phase 1. "
            f"Got None. Current row: {hero_attrs['heading']}"
        )

    def test_stage_3_uses_live_db_for_hero(self, tmp_path: Path) -> None:
        """End-to-end: Stage 3 on sgs/hero uses the live DB for known canonical attrs.

        Only runs if the live DB has sgs/hero.heading canonicalised.
        """
        try:
            if str(_SCRIPTS_ROOT) not in sys.path:
                sys.path.insert(0, str(_SCRIPTS_ROOT))
            from orchestrator.converter_v2.db_lookup import block_attrs  # type: ignore[import]
        except ImportError as exc:
            pytest.skip(f"db_lookup not importable: {exc}")

        hero_attrs = block_attrs("sgs/hero")
        if not hero_attrs or not hero_attrs.get("heading", {}).get("canonical_slot"):
            pytest.skip("sgs/hero.heading not canonicalised in live DB — run /sgs-update first.")

        # Use the real sgs/hero block.json from the repo (it must exist for Stage 3 to load attrs)
        hero_block_json_path = (
            REPO / "plugins" / "sgs-blocks" / "src" / "blocks" / "hero" / "block.json"
        )
        if not hero_block_json_path.exists():
            pytest.skip("sgs/hero block.json not found in repo — cannot run end-to-end test.")

        # Run Stage 3 for real (no mocking) against the live DB
        output = stage_3_slot_list(_make_match_output("sgs/hero"), tmp_path)

        slots = _slots_by_name(output["slot_lists"]["test-boundary-1"])
        assert "heading" in slots, "sgs/hero must have a 'heading' slot in Stage 3 output"
        assert slots["heading"]["canonical_source"] == "db", (
            f"sgs/hero.heading expected canonical_source='db', got {slots['heading']['canonical_source']!r}"
        )


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

def _make_fake_repo(tmp_path: Path, block_slug: str) -> Path:
    """Create a fake repo structure containing a block.json stub for block_slug.

    Returns a Path that mimics REPO so stage_3_slot_list can find
    plugins/sgs-blocks/src/blocks/<slug>/block.json.

    The actual block.json content is written separately via _write_block_json()
    to allow tests to customise attributes.
    """
    block_dir = (
        tmp_path / "plugins" / "sgs-blocks" / "src" / "blocks" / block_slug
    )
    block_dir.mkdir(parents=True, exist_ok=True)
    # Write a minimal placeholder; tests that need specific attrs overwrite it.
    (block_dir / "block.json").write_text(
        json.dumps({"attributes": {}}), encoding="utf-8"
    )
    return tmp_path


def _write_block_json(tmp_path: Path, block_slug: str, attributes: dict) -> None:
    """Overwrite the block.json for block_slug inside the fake repo at tmp_path."""
    block_json_path = (
        tmp_path / "plugins" / "sgs-blocks" / "src" / "blocks" / block_slug / "block.json"
    )
    block_json_path.parent.mkdir(parents=True, exist_ok=True)
    block_json_path.write_text(
        json.dumps({"attributes": attributes}), encoding="utf-8"
    )
