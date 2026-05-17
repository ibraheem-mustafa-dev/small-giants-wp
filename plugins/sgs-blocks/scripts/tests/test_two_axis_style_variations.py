"""
Tests for the two-axis style-variation split (Spec 17 §S8 / FR-S8-1).

Verifies that:
  - Every top-level bundled variation has a matching colours/ split
  - Every top-level bundled variation has a matching typography/ split
  - Colour files contain palette data and no fontFamilies
  - Typography files contain fontFamilies and no palette data
  - Top-level bundled files still parse as valid theme.json v3
  - Key presence assertions cover the "no visual regression from bundled" contract

Run with:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_two_axis_style_variations.py -v
"""

import json
import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Resolve paths relative to the repo root, however the test is invoked
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[4]  # small-giants-wp/
STYLES_DIR = REPO_ROOT / "theme" / "sgs-theme" / "styles"
COLOURS_DIR = STYLES_DIR / "colours"
TYPOGRAPHY_DIR = STYLES_DIR / "typography"

# All top-level bundled variation file names (excluding subdirectories and CSS)
EXPECTED_VARIATIONS = [
    "eye-care-ward-end",
    "helping-doctors",
    "indus-foods",
    "mamas-munches",
    "sgs-construction",
    "sgs-healthcare",
    "sgs-mosque",
    "sgs-professional",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_json(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def bundled_path(slug: str) -> Path:
    return STYLES_DIR / f"{slug}.json"


def colour_path(slug: str) -> Path:
    return COLOURS_DIR / f"{slug}.json"


def typography_path(slug: str) -> Path:
    return TYPOGRAPHY_DIR / f"{slug}.json"


# ---------------------------------------------------------------------------
# Structural directory tests
# ---------------------------------------------------------------------------

def test_colours_directory_exists():
    assert COLOURS_DIR.is_dir(), f"Expected {COLOURS_DIR} to exist"


def test_typography_directory_exists():
    assert TYPOGRAPHY_DIR.is_dir(), f"Expected {TYPOGRAPHY_DIR} to exist"


# ---------------------------------------------------------------------------
# Per-variation: colour axis
# ---------------------------------------------------------------------------

class TestColourFiles:
    """Each variation must have a valid colour-axis file."""

    def _data(self, slug: str) -> dict:
        path = colour_path(slug)
        assert path.exists(), f"Missing colour file: {path}"
        return load_json(path)

    def _assert_slug(self, slug: str):
        data = self._data(slug)
        # Must declare schema and version 3
        assert data.get("$schema"), f"{slug} colours: missing $schema"
        assert data.get("version") == 3, f"{slug} colours: version must be 3"
        # Must have a title
        assert data.get("title"), f"{slug} colours: missing title"
        # Must contain colour palette
        palette = (
            data.get("settings", {})
                .get("color", {})
                .get("palette", [])
        )
        assert len(palette) > 0, f"{slug} colours: palette is empty"
        # Must NOT contain fontFamilies (typography belongs in the other axis)
        font_families = (
            data.get("settings", {})
                .get("typography", {})
                .get("fontFamilies", [])
        )
        assert font_families == [], (
            f"{slug} colours: fontFamilies should be absent from colour file, "
            f"found {font_families}"
        )

    def test_eye_care_ward_end(self): self._assert_slug("eye-care-ward-end")
    def test_helping_doctors(self): self._assert_slug("helping-doctors")
    def test_indus_foods(self): self._assert_slug("indus-foods")
    def test_mamas_munches(self): self._assert_slug("mamas-munches")
    def test_sgs_construction(self): self._assert_slug("sgs-construction")
    def test_sgs_healthcare(self): self._assert_slug("sgs-healthcare")
    def test_sgs_mosque(self): self._assert_slug("sgs-mosque")
    def test_sgs_professional(self): self._assert_slug("sgs-professional")


# ---------------------------------------------------------------------------
# Per-variation: typography axis
# ---------------------------------------------------------------------------

class TestTypographyFiles:
    """Each variation must have a valid typography-axis file."""

    def _data(self, slug: str) -> dict:
        path = typography_path(slug)
        assert path.exists(), f"Missing typography file: {path}"
        return load_json(path)

    def _assert_slug(self, slug: str):
        data = self._data(slug)
        # Must declare schema and version 3
        assert data.get("$schema"), f"{slug} typography: missing $schema"
        assert data.get("version") == 3, f"{slug} typography: version must be 3"
        # Must have a title
        assert data.get("title"), f"{slug} typography: missing title"
        # Must contain fontFamilies
        font_families = (
            data.get("settings", {})
                .get("typography", {})
                .get("fontFamilies", [])
        )
        assert len(font_families) > 0, f"{slug} typography: fontFamilies is empty"
        # Must NOT contain colour palette
        palette = (
            data.get("settings", {})
                .get("color", {})
                .get("palette", [])
        )
        assert palette == [], (
            f"{slug} typography: palette should be absent from typography file, "
            f"found {palette}"
        )

    def test_eye_care_ward_end(self): self._assert_slug("eye-care-ward-end")
    def test_helping_doctors(self): self._assert_slug("helping-doctors")
    def test_indus_foods(self): self._assert_slug("indus-foods")
    def test_mamas_munches(self): self._assert_slug("mamas-munches")
    def test_sgs_construction(self): self._assert_slug("sgs-construction")
    def test_sgs_healthcare(self): self._assert_slug("sgs-healthcare")
    def test_sgs_mosque(self): self._assert_slug("sgs-mosque")
    def test_sgs_professional(self): self._assert_slug("sgs-professional")


# ---------------------------------------------------------------------------
# Bundled top-level files — remain valid, colour AND typography present
# ---------------------------------------------------------------------------

class TestBundledFiles:
    """Original top-level files must still parse as valid theme.json v3."""

    def _data(self, slug: str) -> dict:
        path = bundled_path(slug)
        assert path.exists(), f"Missing bundled file: {path}"
        return load_json(path)

    def _assert_slug(self, slug: str):
        data = self._data(slug)
        assert data.get("$schema"), f"{slug} bundled: missing $schema"
        assert data.get("version") == 3, f"{slug} bundled: version must be 3"
        assert data.get("title"), f"{slug} bundled: missing title"
        # Bundled file must carry both colour palette AND fontFamilies so that
        # sites running the bundled preset see zero change
        palette = (
            data.get("settings", {})
                .get("color", {})
                .get("palette", [])
        )
        font_families = (
            data.get("settings", {})
                .get("typography", {})
                .get("fontFamilies", [])
        )
        assert len(palette) > 0, f"{slug} bundled: palette is missing — bundled preset broken"
        assert len(font_families) > 0, f"{slug} bundled: fontFamilies is missing — bundled preset broken"
        # Must carry the description marker
        description = data.get("description", "")
        assert "Bundled preset" in description, (
            f"{slug} bundled: description must contain 'Bundled preset', got: {description!r}"
        )

    def test_eye_care_ward_end(self): self._assert_slug("eye-care-ward-end")
    def test_helping_doctors(self): self._assert_slug("helping-doctors")
    def test_indus_foods(self): self._assert_slug("indus-foods")
    def test_mamas_munches(self): self._assert_slug("mamas-munches")
    def test_sgs_construction(self): self._assert_slug("sgs-construction")
    def test_sgs_healthcare(self): self._assert_slug("sgs-healthcare")
    def test_sgs_mosque(self): self._assert_slug("sgs-mosque")
    def test_sgs_professional(self): self._assert_slug("sgs-professional")


# ---------------------------------------------------------------------------
# Cross-axis: colour axis palette slugs match bundled palette slugs
# ---------------------------------------------------------------------------

class TestColourAxisMatchesBundled:
    """Colour-axis palette slugs must be a superset of the bundled palette slugs."""

    def _check(self, slug: str):
        bundled = load_json(bundled_path(slug))
        colour = load_json(colour_path(slug))
        bundled_slugs = {
            s["slug"]
            for s in bundled.get("settings", {}).get("color", {}).get("palette", [])
        }
        colour_slugs = {
            s["slug"]
            for s in colour.get("settings", {}).get("color", {}).get("palette", [])
        }
        missing = bundled_slugs - colour_slugs
        assert not missing, (
            f"{slug}: colour-axis file is missing palette slugs that exist in "
            f"the bundled file: {missing}"
        )

    def test_eye_care_ward_end(self): self._check("eye-care-ward-end")
    def test_helping_doctors(self): self._check("helping-doctors")
    def test_indus_foods(self): self._check("indus-foods")
    def test_mamas_munches(self): self._check("mamas-munches")
    def test_sgs_construction(self): self._check("sgs-construction")
    def test_sgs_healthcare(self): self._check("sgs-healthcare")
    def test_sgs_mosque(self): self._check("sgs-mosque")
    def test_sgs_professional(self): self._check("sgs-professional")


# ---------------------------------------------------------------------------
# Cross-axis: typography axis fontFamily slugs match bundled slugs
# ---------------------------------------------------------------------------

class TestTypographyAxisMatchesBundled:
    """Typography-axis fontFamily slugs must match the bundled fontFamily slugs."""

    def _check(self, slug: str):
        bundled = load_json(bundled_path(slug))
        typo = load_json(typography_path(slug))
        bundled_slugs = {
            f["slug"]
            for f in bundled.get("settings", {})
                              .get("typography", {})
                              .get("fontFamilies", [])
        }
        typo_slugs = {
            f["slug"]
            for f in typo.get("settings", {})
                          .get("typography", {})
                          .get("fontFamilies", [])
        }
        missing = bundled_slugs - typo_slugs
        assert not missing, (
            f"{slug}: typography-axis file is missing fontFamily slugs that exist "
            f"in the bundled file: {missing}"
        )

    def test_eye_care_ward_end(self): self._check("eye-care-ward-end")
    def test_helping_doctors(self): self._check("helping-doctors")
    def test_indus_foods(self): self._check("indus-foods")
    def test_mamas_munches(self): self._check("mamas-munches")
    def test_sgs_construction(self): self._check("sgs-construction")
    def test_sgs_healthcare(self): self._check("sgs-healthcare")
    def test_sgs_mosque(self): self._check("sgs-mosque")
    def test_sgs_professional(self): self._check("sgs-professional")


# ---------------------------------------------------------------------------
# File size guard — each JSON ≤ 500 lines
# ---------------------------------------------------------------------------

class TestFileSizeLimit:
    """Every axis file must be ≤ 500 lines."""

    MAX_LINES = 500

    def _check(self, path: Path):
        with open(path, encoding="utf-8") as f:
            lines = f.readlines()
        assert len(lines) <= self.MAX_LINES, (
            f"{path.name}: {len(lines)} lines exceeds {self.MAX_LINES}-line limit"
        )

    def test_all_colour_files(self):
        for slug in EXPECTED_VARIATIONS:
            self._check(colour_path(slug))

    def test_all_typography_files(self):
        for slug in EXPECTED_VARIATIONS:
            self._check(typography_path(slug))
