"""
test_block_source_reader.py
===========================
Pytest suite for the seeder's block-source readers (scripts/dbschema/block_source.py: an editor option list read as code,
a PHP allow-list read with the tokenizer, an array setting's item fields) and for how Stage 1 merges them with block.json.

Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_block_source_reader.py -v
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS / "dbschema"))

import block_source  # noqa: E402

_SPEC = importlib.util.spec_from_file_location("sgs_update_v2_block_source", SCRIPTS / "sgs-update-v2.py")
_SEED = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_SEED)


def test_reader_self_test_passes():
    assert block_source._self_test() == 0


def test_real_blocks_state_their_values():
    source = block_source.BlockSource.read()
    assert source.choices("icon-list", "markerType", {"type": "string", "default": "icon"})[0] == ["icon", "emoji", "bullet", "numbered", "none"]
    assert source.choices("card-grid", "variant", {"type": "string", "default": "card"})[0] == ["card", "overlay"]
    assert source.item_fields("timeline", "entries", {"type": "array", "default": [{"date": "", "title": "", "description": "", "icon": "", "image": ""}]})[:5] == ["date", "title", "description", "icon", "image"]


def test_merge_keeps_block_json_and_names_gaps():
    source = block_source.BlockSource.read()
    gaps: list = []
    attrs = {
        "variant": {"type": "string", "default": "card", "enum": ["only"]},
        "markerType": {"type": "string", "default": "icon"},
        "transitionEasing": {"type": "string", "default": "ease"},
    }
    merged = _SEED._with_source_declarations(attrs, "icon-list", "sgs/icon-list", source, gaps)
    assert merged["variant"]["enum"] == ["only"], "block.json wins"
    assert merged["markerType"]["enum"][-1] == "none"
    assert "enum" not in merged["transitionEasing"] and not gaps, "a setting the block never lists is neither"
    gaps.clear()
    _SEED._with_source_declarations({"transitionEasing": {"type": "string", "default": "ease"}}, "gallery", "sgs/gallery", source, gaps)
    assert gaps and gaps[0][:3] == ("sgs/gallery", "transitionEasing", "enum"), "a list built at run time is a named gap"


def test_real_tier_objects_state_the_choices_of_one_tier():
    """FW-F: a per-breakpoint object has no enum in block.json, so the seeder takes the choices of one tier from the source."""
    source = block_source.BlockSource.read()
    gaps: list = []
    attrs = {
        "alignItems": {"type": "object", "default": {"desktop": "stretch"}},  # feature-grid: AlignItemsTierControl options
        "textAlign": {"type": "object", "default": {}},  # feature-grid reads no text alignment: neither
    }
    merged = _SEED._with_source_declarations(attrs, "feature-grid", "sgs/feature-grid", source, gaps)
    assert merged["alignItems"]["enum"] == ["stretch", "start", "center", "end"]
    assert "enum" not in merged["textAlign"] and not gaps
    # Text alignment through the shared TypographyControls row (a target with showTextAlign) states the row's own list.
    typo = _SEED._with_source_declarations({"textAlign": {"type": "object", "default": {}}}, "text", "sgs/text", source, gaps)
    assert typo["textAlign"]["enum"] == ["left", "center", "right", "justify"]
    # Negative control: a record object (not a tier object) never takes choices, and a declared enum still wins.
    kept = _SEED._with_source_declarations({"orgLogo": {"type": "object", "default": {"id": 0}}}, "feature-grid", "sgs/feature-grid", source, gaps)
    assert "enum" not in kept["orgLogo"]
    assert block_source.is_tier_object({"type": "object", "default": {"mobile": "x"}}) and not block_source.is_tier_object({"type": "object", "default": {"id": 1}})
