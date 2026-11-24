"""An ordinal variant suffix (`One`) is peeled like Primary / Secondary, so `summaryTextOne` takes `summaryText`'s role.

`summaryText` is `text-content` because its `Text` suffix is a property suffix (data/property-suffixes.json). `summaryTextOne`
(the summary shown while exactly one option is picked) ended in `One`, which no vocabulary peeled, so no suffix matched and the
only evidence left was the render's `esc_attr` into a `data-summary-one` attribute, which files a row `technical`. The classifier
reads the SAME vocabulary files the seeder loads into the DB (data/modifier-suffixes.json, data/property-suffixes.json), so this
test needs no database.

Run with: python -m pytest plugins/sgs-blocks/scripts/tests/test_attr_name_ordinal_modifier.py
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
DATA = SCRIPTS / "data"

_spec = importlib.util.spec_from_file_location("assign_canonical", str(SCRIPTS / "behavioural-analyser" / "assign-canonical.py"))
assign_canonical = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(assign_canonical)


def _vocabulary() -> tuple[dict[str, dict], dict[str, str]]:
    properties = {
        row[0]: {"role": row[1], "css_property": row[2] if len(row) > 2 else None}
        for row in json.loads((DATA / "property-suffixes.json").read_text(encoding="utf-8"))["rows"]
    }
    modifiers = {entry[0]: entry[1] for entry in json.loads((DATA / "modifier-suffixes.json").read_text(encoding="utf-8"))["suffixes"]}
    return properties, modifiers


def _decompose(name: str):
    properties, modifiers = _vocabulary()
    return assign_canonical.decompose_attr_name(name, properties, modifiers)


def test_summary_text_one_takes_the_role_of_summary_text():
    stem, suffix, info, mods = _decompose("summaryText")
    assert (stem, suffix, info["role"], mods) == ("summary", "Text", "text-content", [])
    stem_one, suffix_one, info_one, mods_one = _decompose("summaryTextOne")
    assert (stem_one, suffix_one, info_one["role"]) == ("summary", "Text", "text-content")
    assert mods_one == [("One", "variant")]


def test_a_word_that_only_ends_in_the_letters_one_is_not_peeled():
    for name in ("linkPhone", "toneColour", "ordersRowItemCount"):
        assert _decompose(name)[3] == [], name


def test_the_ordinal_comes_off_before_the_property_suffix_and_leaves_other_names_alone():
    assert _decompose("ordersRowItemCountOne")[0] == "ordersRowItemCount"
    assert _decompose("buttonPrimary")[3] == [("Primary", "variant")]
