"""Regression test for the property_suffixes 'Min'/'Max' role over-broad match
(2026-08-15).

Root cause: assign-canonical.py's peel_property_suffix() / decompose_attr_name()
match a property suffix purely on the NAME ENDING (case-insensitive `endswith`),
with zero check against whether the attribute actually emits CSS. The
property_suffixes 'Max' AND 'Min' rows were both seeded with role='layout'
(Spec 15 P3 §3.8 gap remediation), so ANY attribute ending in 'Max'/'Min'
silently inherited a styling role regardless of what it actually does.

Verified against the ENTIRE population of both suffixes in block_attributes
(2026-08-15 audit) -- 0 of 3 real occurrences are CSS:
  - sgs/testimonial.ratingScaleMax -- a content-bearing rating-scale
    denominator (render.php:125,473,654: feeds display text + Schema.org
    bestRating, never CSS). Correct role: 'rating' (matches its sibling
    ratingStars, which already carries role='rating').
  - sgs/form-field-number.max -- an HTML <input max="..."> validation
    constraint (render.php:20,29-30), never CSS. Correct role: 'technical'.
  - sgs/form-field-number.min -- same shape as .max, the sibling HTML
    <input min="..."> constraint (render.php:19,25-26). Correct role:
    'technical'.

Fix shape (see plugins/sgs-blocks/scripts/data/property-suffixes.json and
plugins/sgs-blocks/scripts/attr-classification-overrides.json for the full
rationale):
  1. property-suffixes.json's 'Min' and 'Max' rows REMOVED entirely (not
     re-roled to null -- `property_suffixes.role` is NOT NULL per
     dbschema/schema.sql, proven live: setting role=null crashed
     db-consistency/run.py with `sqlite3.IntegrityError: NOT NULL constraint
     failed: property_suffixes.role`). Removing the row is the only
     schema-legal way to stop the suffix peel matching at all, so the two
     attrs fall through to their normal (evidence-based) classification path.
  2. attr-classification-overrides.json carries the three per-attr corrected
     final roles (the override layer, applied AFTER canonical assignment, so
     it is the final writer -- see sgs-update-v2.py
     _apply_attr_classification_overrides's own docstring for the layering
     contract).

This test proves (1) at the peel level using the REAL production function
(peel_property_suffix), not a reimplementation, with a NEGATIVE CONTROL
proving the sibling 'Width' suffix (which IS a genuine CSS property word) is
untouched by this fix.
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

_AC_PATH = (
    Path(__file__).resolve().parents[2]
    / "behavioural-analyser"
    / "assign-canonical.py"
)
_SUFFIXES_JSON_PATH = (
    Path(__file__).resolve().parents[2] / "data" / "property-suffixes.json"
)
_OVERRIDES_JSON_PATH = (
    Path(__file__).resolve().parents[2] / "attr-classification-overrides.json"
)


def _load_ac():
    spec = importlib.util.spec_from_file_location("assign_canonical_mod_maxfix", _AC_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _load_current_property_suffixes() -> dict[str, dict]:
    """Reads the LIVE seed file (not a hand-typed copy) into the exact shape
    assign-canonical.load_property_suffixes() returns from the DB, so the test
    exercises the real current data, not a fixture that can drift from it."""
    data = json.loads(_SUFFIXES_JSON_PATH.read_text(encoding="utf-8"))
    out = {}
    for row in data["rows"]:
        suffix, role, css_property = row[0], row[1], row[2]
        out[suffix] = {"role": role, "css_property": css_property}
    return out


def _load_current_overrides() -> dict[tuple[str, str], dict]:
    data = json.loads(_OVERRIDES_JSON_PATH.read_text(encoding="utf-8"))
    out = {}
    for entry in data["entries"]:
        out[(entry["slug"], entry["attr"])] = entry["fields"]
    return out


def test_min_max_suffix_rows_are_gone_from_the_seed():
    """POSITIVE CONTROL (proves the fix, seed level): the current
    property-suffixes.json must carry NEITHER a 'Min' NOR a 'Max' row any
    more -- both were removed as too ambiguous to imply any single role
    (property_suffixes.role is NOT NULL, so 'no reliable role' can only be
    expressed by absence, not by role=null)."""
    suffixes = _load_current_property_suffixes()
    assert "Max" not in suffixes, (
        "'Max' suffix row still present -- it should have been removed "
        "2026-08-15 (0 of its 2 real occurrences are CSS)."
    )
    assert "Min" not in suffixes, (
        "'Min' suffix row still present -- it should have been removed "
        "2026-08-15 (its only real occurrence is not CSS)."
    )


def test_max_and_min_suffix_no_longer_assign_layout_role():
    """POSITIVE CONTROL (proves the fix, peel level): with the CURRENT (fixed)
    property_suffixes data, peeling 'ratingScaleMax', 'max' and 'min' must
    find NO property-suffix match at all any more -- the exact bug shape
    (a bare 'Max'/'Min' ending silently inheriting role='layout')."""
    ac = _load_ac()
    suffixes = _load_current_property_suffixes()

    _, suffix, info = ac.peel_property_suffix("ratingScaleMax", suffixes)
    assert suffix is None and info is None, (
        f"ratingScaleMax matched suffix {suffix!r} with info {info!r} -- expected no "
        "match at all now that the 'Max' row is gone."
    )

    _, suffix2, info2 = ac.peel_property_suffix("max", suffixes)
    assert suffix2 is None and info2 is None, (
        f"'max' matched suffix {suffix2!r} with info {info2!r} -- expected no match, "
        "second real occurrence of the removed 'Max' row."
    )

    _, suffix3, info3 = ac.peel_property_suffix("min", suffixes)
    assert suffix3 is None and info3 is None, (
        f"'min' matched suffix {suffix3!r} with info {info3!r} -- expected no match, "
        "the removed 'Min' row's only real occurrence."
    )


def test_max_suffix_fix_reverts_the_original_bug():
    """NEGATIVE CONTROL run against the OLD (buggy) data shape: proves this
    test actually detects the bug it claims to guard, by reconstructing the
    pre-fix suffix table (role='layout') and confirming the SAME peel call
    DOES produce role='layout' against it. If this assertion ever failed, the
    positive-control tests above would be vacuous (unable to distinguish
    fixed from broken)."""
    ac = _load_ac()
    buggy_suffixes = _load_current_property_suffixes()
    buggy_suffixes["Max"] = {"role": "layout", "css_property": None}  # pre-2026-08-15 shape
    buggy_suffixes["Min"] = {"role": "layout", "css_property": None}  # pre-2026-08-15 shape

    _, _, info = ac.peel_property_suffix("ratingScaleMax", buggy_suffixes)
    assert info["role"] == "layout", (
        "sanity check failed: the pre-fix data shape no longer reproduces the "
        "original bug, so the fix-detection above is not meaningful."
    )
    _, _, info_min = ac.peel_property_suffix("min", buggy_suffixes)
    assert info_min["role"] == "layout", (
        "sanity check failed for 'min': the pre-fix data shape no longer "
        "reproduces the original bug."
    )


def test_width_suffix_is_untouched_by_the_min_max_fix():
    """NEGATIVE CONTROL (scope check): 'Width' is a genuine CSS-property word
    and must keep resolving role='layout' + css_property='width' exactly as
    before. This proves the Min/Max-suffix removal has zero blast radius on
    the sibling Width family (dividerWidth, customWidth, fadeWidth, etc. --
    the ~20 real 'layout'+'width' rows verified live 2026-08-15)."""
    ac = _load_ac()
    suffixes = _load_current_property_suffixes()

    _, suffix, info = ac.peel_property_suffix("dividerWidth", suffixes)
    assert suffix == "Width"
    assert info["role"] == "layout"
    assert info["css_property"] == "width"


def test_overrides_carry_the_correct_final_roles():
    """Confirms the override layer (the final writer, per
    _apply_attr_classification_overrides's documented layering contract) has
    the three per-attr corrected roles, matching real ground truth in each
    block's own render.php (see module docstring)."""
    overrides = _load_current_overrides()

    assert overrides[("sgs/testimonial", "ratingScaleMax")]["role"] == "rating", (
        "sgs/testimonial.ratingScaleMax override missing or wrong -- should match its "
        "sibling ratingStars (role='rating'), the established content-bearing rating "
        "vocabulary entry."
    )
    assert overrides[("sgs/form-field-number", "max")]["role"] == "technical", (
        "sgs/form-field-number.max override missing or wrong -- it renders as an HTML "
        "input validation attribute (render.php:29-30), matching roles.json's own "
        "'technical' definition (a machine-facing, non-content, non-CSS value)."
    )
    assert overrides[("sgs/form-field-number", "min")]["role"] == "technical", (
        "sgs/form-field-number.min override missing or wrong -- same shape as its "
        "sibling 'max' attr (render.php:25-26)."
    )
