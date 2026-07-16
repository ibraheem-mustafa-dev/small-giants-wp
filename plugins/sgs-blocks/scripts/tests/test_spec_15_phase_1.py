"""
test_spec_15_phase_1.py
=======================
Pytest suite covering the four Phase 1 modules for the Spec 31 deterministic
draft-to-SGS converter pipeline:

  1. extract_signatures  — behavioural-analyser/extract-signatures.py
  2. assign_canonical    — behavioural-analyser/assign-canonical.py
  3. match               — value-matcher/match.py
  4. inheritance         — value-matcher/inheritance.py

UK English throughout.  No mocking of strategy code; inheritance tests only
mock the theme dict passed via the public _inherits_from_dict injection path.

Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_spec_15_phase_1.py -v
"""

from __future__ import annotations

import json
import shutil
import sqlite3
import sys
from pathlib import Path
from typing import Any

import math

import pytest

# ---------------------------------------------------------------------------
# sys.path manipulation — add script roots so imports resolve
# ---------------------------------------------------------------------------

_REPO_ROOT = Path(__file__).resolve().parents[4]          # small-giants-wp/
_SCRIPTS_ROOT = _REPO_ROOT / "plugins" / "sgs-blocks" / "scripts"
_BEHAVIOURAL_ANALYSER_DIR = _SCRIPTS_ROOT / "behavioural-analyser"
_VALUE_MATCHER_DIR = _SCRIPTS_ROOT / "value-matcher"

for _dir in (_BEHAVIOURAL_ANALYSER_DIR, _VALUE_MATCHER_DIR):
    _str = str(_dir)
    if _str not in sys.path:
        sys.path.insert(0, _str)

# ---------------------------------------------------------------------------
# Import the modules under test
# ---------------------------------------------------------------------------

import importlib

# extract-signatures has a hyphen so we use importlib.
_ext_sig_spec = importlib.util.spec_from_file_location(
    "extract_signatures",
    str(_BEHAVIOURAL_ANALYSER_DIR / "extract-signatures.py"),
)
extract_signatures_mod = importlib.util.module_from_spec(_ext_sig_spec)  # type: ignore[arg-type]
_ext_sig_spec.loader.exec_module(extract_signatures_mod)  # type: ignore[union-attr]

# assign-canonical likewise.
_assign_spec = importlib.util.spec_from_file_location(
    "assign_canonical",
    str(_BEHAVIOURAL_ANALYSER_DIR / "assign-canonical.py"),
)
assign_canonical_mod = importlib.util.module_from_spec(_assign_spec)  # type: ignore[arg-type]
_assign_spec.loader.exec_module(assign_canonical_mod)  # type: ignore[union-attr]

from match import snap_color, snap_spacing  # noqa: E402  (added to sys.path above)
from inheritance import inherits_global_default, _inherits_from_dict  # noqa: E402

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_DB_SOURCE = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
_THEME_JSON_PATH = _REPO_ROOT / "theme" / "sgs-theme" / "theme.json"
_BLOCKS_DIR = _REPO_ROOT / "plugins" / "sgs-blocks" / "src" / "blocks"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def tmp_db(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """
    Copy the live sgs-framework.db to a temp path for the test session.
    Tests must NOT mutate the live DB; all reads go through this copy.
    Deleted automatically by pytest after the module completes.
    """
    tmp_dir: Path = tmp_path_factory.mktemp("db")
    dest: Path = tmp_dir / "sgs-framework.db"
    shutil.copy2(str(_DB_SOURCE), str(dest))
    return dest


@pytest.fixture(scope="module")
def theme_data() -> dict[str, Any]:
    """Return the parsed theme.json dict (real file, read-only)."""
    with _THEME_JSON_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


@pytest.fixture(scope="module")
def palette(theme_data: dict[str, Any]) -> list[dict[str, Any]]:
    return theme_data["settings"]["color"]["palette"]


@pytest.fixture(scope="module")
def spacing_scale(theme_data: dict[str, Any]) -> list[dict[str, Any]]:
    return theme_data["settings"]["spacing"]["spacingSizes"]


# ---------------------------------------------------------------------------
# Helper: run PHP-analysis on a real block's render.php
# ---------------------------------------------------------------------------

def _extract_sig_for_attr(block_short_slug: str, attr_name: str) -> dict | None:
    """
    Run the extract-signatures logic against the actual block source files.
    Returns the merged signature dict or None if not found.
    Uses the module-level functions directly (no DB writes).
    """
    block_dir = _BLOCKS_DIR / block_short_slug
    render_php_path = block_dir / "render.php"
    save_js_path = block_dir / "save.js"
    index_js_path = block_dir / "index.js"

    php_src: str | None = None
    js_src: str | None = None

    if render_php_path.exists():
        php_src = render_php_path.read_text(encoding="utf-8", errors="replace")

    if save_js_path.exists():
        js_src = save_js_path.read_text(encoding="utf-8", errors="replace")
    elif index_js_path.exists():
        idx_src = index_js_path.read_text(encoding="utf-8", errors="replace")
        import re as _re
        if _re.search(
            r'\bfunction\s+Save\b|\bexport\s+default\s+function\s+Save\b|Save\s*=\s*function',
            idx_src,
            _re.IGNORECASE,
        ):
            js_src = idx_src

    var_to_attr = extract_signatures_mod._build_var_map(php_src) if php_src else {}
    php_lines = php_src.splitlines() if php_src else []
    js_lines = js_src.splitlines() if js_src else []

    php_sig = (
        extract_signatures_mod._analyse_attr_in_php(php_lines, attr_name, var_to_attr, f"sgs/{block_short_slug}")
        if php_lines
        else None
    )
    js_sig = (
        extract_signatures_mod._analyse_attr_in_js(js_lines, attr_name, f"sgs/{block_short_slug}")
        if js_lines
        else None
    )

    return extract_signatures_mod._merge_signatures(php_sig, js_sig)


def _count_sigs_for_block(block_short_slug: str, tmp_db_path: Path) -> int:
    """
    Count how many attributes would receive signatures for a block.
    Reads attr names from the temp DB; analyses real source files.
    """
    conn = sqlite3.connect(str(tmp_db_path))
    cur = conn.cursor()
    cur.execute(
        "SELECT attr_name FROM block_attributes WHERE block_slug = ? ORDER BY attr_name",
        (f"sgs/{block_short_slug}",),
    )
    attr_names = [row[0] for row in cur.fetchall()]
    conn.close()

    count = 0
    for attr_name in attr_names:
        sig = _extract_sig_for_attr(block_short_slug, attr_name)
        if sig is not None:
            count += 1
    return count


# ---------------------------------------------------------------------------
# 1. extract_signatures tests
# ---------------------------------------------------------------------------

class TestExtractSignatures:
    """Tests for the PHP/JS behavioural signature extractor."""

    def test_hero_headline_has_wp_kses_post_on_h1(self) -> None:
        """
        Happy path: sgs/hero 'headline' attribute should produce a signature
        with output_function='wp_kses_post' and output_element='h1'.

        The render.php assigns $headline = $attributes['headline'] and later
        echoes it inside <h1 ...>wp_kses_post($headline)</h1>.
        """
        sig = _extract_sig_for_attr("hero", "headline")

        assert sig is not None, (
            "Expected a signature for sgs/hero 'headline' — got None. "
            "Check that render.php contains wp_kses_post($headline) near an <h1 tag."
        )
        assert sig.get("output_function") == "wp_kses_post", (
            f"Expected output_function='wp_kses_post', got {sig.get('output_function')!r}. "
            "The headline var is escaped with wp_kses_post() in render.php."
        )
        assert sig.get("output_element") == "h1", (
            f"Expected output_element='h1', got {sig.get('output_element')!r}. "
            "render.php emits the headline inside an <h1> tag."
        )

    def test_back_to_top_is_deprecated_stub_returns_zero_signatures(
        self, tmp_db: Path
    ) -> None:
        """
        Edge case: sgs/back-to-top render.php is a deprecated stub that returns
        empty immediately.  The extractor should produce 0 signatures for all its
        attributes — confirming the anomaly-block path fires correctly.
        """
        count = _count_sigs_for_block("back-to-top", tmp_db)
        assert count == 0, (
            f"Expected 0 signatures for the deprecated back-to-top block, got {count}. "
            "The render.php stub returns '' with no attribute references."
        )

    def test_tab_save_returns_null_no_crash(self) -> None:
        """
        Edge case: sgs/tab uses save: () => null (InnerBlocks dynamic block).
        The JS analyser must handle this gracefully — no AttributeError or crash —
        and either return None (no attrs found) or a partial/empty signature.
        The test verifies only that the call completes without raising.
        """
        block_dir = _BLOCKS_DIR / "tab"
        assert block_dir.exists(), "sgs/tab source directory must exist"

        # tab/block.json has a single 'label' attribute; analyse it.
        try:
            sig = _extract_sig_for_attr("tab", "label")
        except Exception as exc:  # noqa: BLE001
            pytest.fail(
                f"_extract_sig_for_attr raised an exception for sgs/tab 'label': {exc!r}. "
                "The analyser must not crash on save: () => null."
            )
        # sig may be None (no references found in the stub) or a valid dict.
        # Either is acceptable — the key requirement is no crash.
        assert sig is None or isinstance(sig, dict), (
            f"Expected None or dict from analyser for sgs/tab 'label', got {type(sig)!r}."
        )


# ---------------------------------------------------------------------------
# 2. assign_canonical tests
# ---------------------------------------------------------------------------

class TestAssignCanonical:
    """
    Tests for the decomposition + slot-resolution engine in assign-canonical.py.
    All tests operate on in-memory dicts, not the live DB.
    """

    @pytest.fixture(scope="class")
    def vocabularies(self, tmp_db: Path) -> dict:
        """Load slot_synonyms, property_suffixes, and modifier_suffixes from the temp DB."""
        conn = sqlite3.connect(str(tmp_db))
        slot_map = assign_canonical_mod.load_slot_synonyms(conn)
        property_suffixes = assign_canonical_mod.load_property_suffixes(conn)
        modifier_map = assign_canonical_mod.load_modifier_suffixes(conn)
        conn.close()
        return {
            "slot_map": slot_map,
            "property_suffixes": property_suffixes,
            "modifier_map": modifier_map,
        }

    def test_headline_resolves_to_heading_slot(self, vocabularies: dict) -> None:
        """
        sgs/hero + 'headline' → canonical_slot should be 'heading'.
        'headline' is an alias for the 'heading' canonical slot.
        """
        slot_map = vocabularies["slot_map"]
        property_suffixes = vocabularies["property_suffixes"]
        modifier_map = vocabularies["modifier_map"]

        stem, _, _, _ = assign_canonical_mod.decompose_attr_name(
            "headline", property_suffixes, modifier_map
        )
        canonical_slot, _ = assign_canonical_mod.resolve_canonical_slot(stem, slot_map)

        assert canonical_slot == "heading", (
            f"Expected canonical_slot='heading' for attr 'headline', got {canonical_slot!r}. "
            "'headline' should be listed as an alias in slot_synonyms for 'heading'."
        )

    def test_description_resolves_to_text_slot(self, vocabularies: dict) -> None:
        """
        Any block + 'description' → canonical_slot should be 'text'.
        'description' is an alias for the 'text' canonical slot.
        """
        slot_map = vocabularies["slot_map"]
        property_suffixes = vocabularies["property_suffixes"]
        modifier_map = vocabularies["modifier_map"]

        stem, _, _, _ = assign_canonical_mod.decompose_attr_name(
            "description", property_suffixes, modifier_map
        )
        canonical_slot, _ = assign_canonical_mod.resolve_canonical_slot(stem, slot_map)

        assert canonical_slot == "text", (
            f"Expected canonical_slot='text' for attr 'description', got {canonical_slot!r}. "
            "'description' should be an alias for the 'text' slot."
        )

    def test_background_colour_attr_gets_color_role(self, vocabularies: dict) -> None:
        """
        'backgroundColor' → property suffix 'Color' peeled → stem 'background'.
        The property_suffix entry for 'Color'/'Colour' has role='color'.
        Role must be 'color' (from property suffix); slot may resolve to
        'backgroundMedia' or NULL — both are acceptable outcomes.
        """
        _ = vocabularies["slot_map"]  # not needed for role-only check
        property_suffixes = vocabularies["property_suffixes"]
        modifier_map = vocabularies["modifier_map"]

        _, prop_suffix, prop_info, _ = assign_canonical_mod.decompose_attr_name(
            "backgroundColor", property_suffixes, modifier_map
        )

        assert prop_suffix is not None, (
            "Expected a property suffix to be peeled from 'backgroundColor' — got None. "
            "Check that 'Color' or 'Colour' is in property_suffixes."
        )
        assert prop_info is not None and prop_info.get("role") == "color", (
            f"Expected property suffix role='color' for 'backgroundColor', "
            f"got prop_info={prop_info!r}."
        )

    def test_border_radius_tl_corner_decomposes_and_gets_visual_role(
        self, vocabularies: dict
    ) -> None:
        """
        'borderRadiusTL':
          - Modifier 'TL' (corner) peels first → after_modifiers = 'borderRadius'
          - Property suffix 'BorderRadius' should peel → role='visual'
          - Residual stem should not match any slot → canonical_slot stays NULL

        Regression guard for the case-sensitive endswith bug fixed in
        Phase 1 QC: peel_property_suffix() now does a case-insensitive
        comparison and handles the empty-prefix edge case (whole stem ==
        property suffix), so role gets assigned for camelCase attrs like
        borderRadiusTL.
        """
        slot_map = vocabularies["slot_map"]
        property_suffixes = vocabularies["property_suffixes"]
        modifier_map = vocabularies["modifier_map"]

        stem, _, prop_info, modifiers = assign_canonical_mod.decompose_attr_name(
            "borderRadiusTL", property_suffixes, modifier_map
        )

        # At least the corner modifier 'TL' must be peeled.
        modifier_kinds = [kind for _, kind in modifiers]
        assert "corner" in modifier_kinds, (
            f"Expected 'corner' modifier to be peeled from 'borderRadiusTL'. "
            f"Got modifiers: {modifiers!r}."
        )

        # Role should be 'visual' — from BorderRadius property suffix.
        # Build role the same way assign_canonical.run() does it:
        canonical_slot, slot_role = assign_canonical_mod.resolve_canonical_slot(stem, slot_map)
        if prop_info and prop_info.get("role"):
            role = prop_info["role"]
        elif slot_role:
            role = slot_role
        else:
            role = None

        assert role == "visual", (
            f"Expected role='visual' for 'borderRadiusTL' (from BorderRadius suffix), "
            f"got role={role!r}. Check property_suffixes for 'BorderRadius' entry."
        )

        # Canonical slot should be None — residual stem after peeling shouldn't match.
        assert canonical_slot is None, (
            f"Expected canonical_slot=None for residual stem {stem!r} after peeling "
            f"'borderRadiusTL', got {canonical_slot!r}."
        )


# ---------------------------------------------------------------------------
# 3. match tests (snap_color / snap_spacing)
# ---------------------------------------------------------------------------

class TestSnapColor:
    """Tests for the snap_color() function in value-matcher/match.py."""

    def test_exact_palette_match_returns_conf_1(self, palette: list) -> None:
        """
        The exact hex of the 'primary' token (#1F7A7A) must snap to 'primary'
        with confidence 1.0 (ΔE2000 = 0, well within the ≤2.0 tier).
        """
        primary_hex = "#1F7A7A"
        slug, conf = snap_color(primary_hex, palette)

        assert slug == "primary", (
            f"Expected slug='primary' for {primary_hex!r}, got {slug!r}."
        )
        assert math.isclose(conf, 1.0), (
            f"Expected confidence=1.0 for exact match, got {conf}."
        )

    def test_near_match_within_delta_e_5_returns_conf_085(self, palette: list) -> None:
        """
        #1E7878 is close to primary (#1F7A7A) but not identical.
        ΔE2000 should be < 5.0, giving confidence 0.85 or 1.0 (both acceptable).
        """
        slug, conf = snap_color("#1E7878", palette)

        assert slug == "primary", (
            f"Expected slug='primary' for near-match #1E7878, got {slug!r}."
        )
        assert conf >= 0.85, (
            f"Expected confidence >= 0.85 for a colour close to primary, got {conf}."
        )

    def test_gap_colour_returns_raw_value_conf_0(self, palette: list) -> None:
        """
        #FF00FF (magenta) is not in the SGS palette.
        ΔE2000 against all tokens should exceed 10.0, returning (raw, 0.0).
        """
        slug, conf = snap_color("#FF00FF", palette)

        assert math.isclose(conf, 0.0, abs_tol=1e-9), (
            f"Expected confidence=0.0 for gap colour #FF00FF, got {conf}."
        )
        assert slug == "#FF00FF", (
            f"Expected raw value '#FF00FF' returned for gap candidate, got {slug!r}."
        )


class TestSnapSpacing:
    """Tests for the snap_spacing() function in value-matcher/match.py."""

    def test_exact_rem_match_returns_conf_1(self, spacing_scale: list) -> None:
        """
        '1.5rem' = 24px exactly matches slug '40' (size '1.5rem').
        Confidence must be 1.0.
        """
        slug, conf = snap_spacing("1.5rem", spacing_scale)

        assert slug == "40", (
            f"Expected slug='40' for '1.5rem', got {slug!r}."
        )
        assert math.isclose(conf, 1.0), (
            f"Expected confidence=1.0 for exact rem match, got {conf}."
        )

    def test_within_5_percent_returns_conf_1(self, spacing_scale: list) -> None:
        """
        24.5px is ~2.1% above slug '40' (24px).
        Percent deviation ≤ 5 % → confidence 1.0.
        """
        slug, conf = snap_spacing("24.5px", spacing_scale)

        assert slug == "40", (
            f"Expected slug='40' for 24.5px (closest to 24px/1.5rem), got {slug!r}."
        )
        assert math.isclose(conf, 1.0), (
            f"Expected confidence=1.0 for ≤5% deviation, got {conf}."
        )

    def test_gap_spacing_returns_raw_value_conf_0(self, spacing_scale: list) -> None:
        """
        500px is far beyond the largest spacing token (8rem = 128px).
        Deviation exceeds 15 %, so (raw, 0.0) is returned.
        """
        slug, conf = snap_spacing("500px", spacing_scale)

        assert math.isclose(conf, 0.0, abs_tol=1e-9), (
            f"Expected confidence=0.0 for gap spacing 500px, got {conf}."
        )
        assert slug == "500px", (
            f"Expected raw value '500px' returned for gap candidate, got {slug!r}."
        )


# ---------------------------------------------------------------------------
# 4. inheritance tests
# ---------------------------------------------------------------------------

class TestInheritsGlobalDefault:
    """
    Tests for inherits_global_default() / _inherits_from_dict() in inheritance.py.
    All four tests inject mock theme dicts; no filesystem reads needed.
    """

    def test_block_level_beats_element_level(self) -> None:
        """
        When both styles.blocks[slug][slot] and styles.elements[h1] define a
        colour, the block-level default must win.
        Supplying the block-level value → INHERIT.
        """
        mock_theme: dict = {
            "styles": {
                "blocks": {
                    "sgs/hero": {
                        "heading": {
                            "color": "#FF0000",
                        }
                    }
                },
                "elements": {
                    "h1": {
                        "color": "#00FF00",
                    }
                },
            }
        }
        result = _inherits_from_dict(
            block_slug="sgs/hero",
            slot="heading",
            property_path="color",
            value="#FF0000",
            theme=mock_theme,
        )
        assert result == "INHERIT", (
            f"Expected INHERIT when value matches block-level default, got {result!r}."
        )

    def test_element_level_applies_when_no_block_override(self) -> None:
        """
        When no block-level entry exists, the element-level default (h1) applies.
        Supplying the element-level value → INHERIT.
        """
        mock_theme: dict = {
            "styles": {
                "elements": {
                    "h1": {
                        "color": "#00FF00",
                    }
                }
            }
        }
        result = _inherits_from_dict(
            block_slug="sgs/hero",
            slot="heading",
            property_path="color",
            value="#00FF00",
            theme=mock_theme,
        )
        assert result == "INHERIT", (
            f"Expected INHERIT when value matches element-level default, got {result!r}."
        )

    def test_root_fallback_when_neither_block_nor_element(self) -> None:
        """
        When neither block nor element styles are defined, root styles.<prop>
        is the fallback.  Supplying that root value → INHERIT.
        """
        mock_theme: dict = {
            "styles": {
                "color": "#0000FF",
            }
        }
        result = _inherits_from_dict(
            block_slug="sgs/hero",
            slot="text",         # maps to <p> — no elements.p entry in mock
            property_path="color",
            value="#0000FF",
            theme=mock_theme,
        )
        assert result == "INHERIT", (
            f"Expected INHERIT when value matches root-level default, got {result!r}."
        )

    def test_override_when_value_differs_from_element_default(self) -> None:
        """
        When the supplied value does NOT match the element-level default, the
        result must be OVERRIDE.
        """
        mock_theme: dict = {
            "styles": {
                "elements": {
                    "h1": {
                        "color": "#00FF00",
                    }
                }
            }
        }
        result = _inherits_from_dict(
            block_slug="sgs/hero",
            slot="heading",
            property_path="color",
            value="#FF0000",     # differs from #00FF00
            theme=mock_theme,
        )
        assert result == "OVERRIDE", (
            f"Expected OVERRIDE when value differs from element-level default, got {result!r}."
        )
