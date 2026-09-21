"""Hand-picked preset looks are seeded with no implied property, so the resolver never auto-selects them.

Cause, reproduced before the fix (2026-09-21): ``sgs/google-reviews`` gained the looks
``bubble``, ``google-card`` and ``wall-tile`` beside ``elevated`` and ``bordered``. The seeder
derives each value's implied property from its CSS, so ``bubble`` and ``elevated`` both implied
``box-shadow`` and ``google-card``, ``wall-tile`` and ``bordered`` all implied ``border``.
``preset_absence._pick_value`` breaks an exact tie alphabetically, so a draft whose card had a
shadow came out as ``bubble`` (``test_preset_absence.py::test_google_reviews_shadowed_review_picks_elevated``).

Fix: a block lists such values in ``supports.sgs.presetManualValues``; the seeder writes them
with no implied property, which the resolver already skips. The converter is unchanged.

Run from plugins/sgs-blocks/scripts:
  python -m pytest converter/tests/test_preset_manual_values.py -q -p no:cacheprovider
"""
from __future__ import annotations

import importlib.util
import sqlite3
from pathlib import Path

import pytest

_SCRIPT = Path(__file__).resolve().parents[2] / "sgs-update-v2.py"

_RENDER = (
    "<?php\n"
    "$card_style = $attributes['cardStyle'] ?? 'bordered';\n"
    "$cls = 'sgs-demo--card-' . esc_attr( $card_style );"
)
_CSS = """
.sgs-demo--card-elevated .sgs-demo__card { box-shadow: 0 2px 8px rgba(0,0,0,.1); }
.sgs-demo--card-bordered .sgs-demo__card { border: 1px solid #ddd; }
.sgs-demo--card-bubble .sgs-demo__card { box-shadow: 0 4px 12px rgba(0,0,0,.08); border-radius: 18px; }
.sgs-demo--card-google-card .sgs-demo__card { border: 1px solid #e8eaed; }
"""


@pytest.fixture(scope="module")
def seeder():
    spec = importlib.util.spec_from_file_location("sgs_update_v2_under_test", _SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _seed(seeder, tmp_path: Path, supports: dict) -> dict:
    # The seeder derives the class prefix from the block folder's name.
    tmp_path = tmp_path / "demo"
    tmp_path.mkdir()
    (tmp_path / "render.php").write_text(_RENDER, encoding="utf-8")
    (tmp_path / "style.css").write_text(_CSS, encoding="utf-8")
    conn = sqlite3.connect(":memory:")
    conn.execute(
        "CREATE TABLE preset_implications (block_slug TEXT, preset_attr TEXT, enum_value TEXT, "
        "implied_property TEXT, presence TEXT, is_neutral INTEGER, created_at TEXT, "
        "UNIQUE(block_slug, preset_attr, enum_value))"
    )
    seeder._populate_preset_implications(
        conn, "sgs/demo", tmp_path, supports, {"cardStyle"}
    )
    return {
        row[0]: (row[1], row[2], row[3])
        for row in conn.execute(
            "SELECT enum_value, implied_property, presence, is_neutral FROM preset_implications"
        )
    }


def test_without_the_hint_a_look_sharing_a_signal_is_seeded_with_it(seeder, tmp_path):
    """Baseline (the bug): bubble implies box-shadow exactly as elevated does."""
    rows = _seed(seeder, tmp_path, {"presetSelectors": ["cardStyle"]})
    assert rows["bubble"][0] == "box-shadow"
    assert rows["elevated"][0] == "box-shadow"
    assert rows["google-card"][0] == "border"


def test_a_declared_hand_picked_look_is_seeded_with_no_implied_property(seeder, tmp_path):
    rows = _seed(seeder, tmp_path, {
        "presetSelectors": ["cardStyle"],
        "presetManualValues": {"cardStyle": ["bubble", "google-card"]},
    })
    assert rows["bubble"] == ("", "absent", 0)
    assert rows["google-card"] == ("", "absent", 0)
    # The plain looks are untouched.
    assert rows["elevated"][0] == "box-shadow"
    assert rows["bordered"][0] == "border"


def test_a_hand_picked_look_never_becomes_the_neutral_value(seeder, tmp_path):
    """Applied after the neutral choice: with no signal-less value in the CSS the block has no
    neutral from CSS, and marking bubble manual must not promote it to neutral."""
    rows = _seed(seeder, tmp_path, {
        "presetSelectors": ["cardStyle"],
        "presetManualValues": {"cardStyle": ["bubble"]},
    })
    assert rows["bubble"][2] == 0
    neutrals = sorted(v for v, row in rows.items() if row[2])
    assert neutrals == ["flat"]


def test_the_hint_names_only_values_the_css_defines(seeder, tmp_path):
    """A stale entry (a value with no CSS rule) is ignored, never seeded as a phantom row."""
    rows = _seed(seeder, tmp_path, {
        "presetSelectors": ["cardStyle"],
        "presetManualValues": {"cardStyle": ["not-a-look"]},
    })
    assert "not-a-look" not in rows


def test_a_malformed_hint_is_ignored(seeder, tmp_path):
    rows = _seed(seeder, tmp_path, {
        "presetSelectors": ["cardStyle"],
        "presetManualValues": ["bubble"],
    })
    assert rows["bubble"][0] == "box-shadow"


def test_the_shipped_block_declares_its_hand_picked_looks():
    """Grounding: the real block.json carries the hint the seeder reads."""
    import json

    block = Path(__file__).resolve().parents[3] / "src" / "blocks" / "google-reviews" / "block.json"
    data = json.loads(block.read_text(encoding="utf-8"))
    manual = data["supports"]["sgs"]["presetManualValues"]["cardStyle"]
    assert {"google-card", "bubble", "wall-tile"} <= set(manual)
    # Negative control: the plain looks stay auto-detectable.
    assert "elevated" not in manual and "bordered" not in manual
