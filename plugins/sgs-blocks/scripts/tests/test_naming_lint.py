"""
test_naming_lint.py
===================
Smoke tests for scripts/lint-naming-conventions.py.

Uses temporary fixture files containing known-good and known-bad content to
verify each rule fires correctly and produces zero false positives on clean
content.

Run from repo root:
    python -m pytest plugins/sgs-blocks/scripts/tests/test_naming_lint.py -v

UK English throughout.
"""

from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path

import pytest

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Load the linter module without executing main()
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parents[4]
LINTER_PATH = REPO_ROOT / "scripts" / "lint-naming-conventions.py"


def _load_linter() -> types.ModuleType:
    spec = importlib.util.spec_from_file_location("lint_naming", LINTER_PATH)
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


LINT = _load_linter()


# ---------------------------------------------------------------------------
# Fixture helpers
# ---------------------------------------------------------------------------

def _php_file(tmp_path: Path, name: str, content: str) -> Path:
    p = tmp_path / name
    p.write_text(content, encoding="utf-8")
    return p


def _json_file(tmp_path: Path, name: str, content: str) -> Path:
    p = tmp_path / name
    p.write_text(content, encoding="utf-8")
    return p


def _css_file(tmp_path: Path, name: str, content: str) -> Path:
    p = tmp_path / name
    p.write_text(content, encoding="utf-8")
    return p


# ---------------------------------------------------------------------------
# Rule 1 — Pattern slug namespace
# ---------------------------------------------------------------------------

class TestRule1PatternSlugs:
    """Pattern Slug: header must use sgs/ not sgs-theme/."""

    def test_violation_detected(self, tmp_path):
        """A Slug: header using sgs-theme/ must produce a violation."""
        patterns_dir = tmp_path / "patterns"
        patterns_dir.mkdir()
        bad = _php_file(
            patterns_dir,
            "header-bad.php",
            "<?php\n/**\n * Title: Bad Header\n * Slug: sgs-theme/header-bad\n */\n",
        )
        violations = LINT.check_pattern_slugs([bad])
        assert len(violations) == 1, f"Expected 1 violation, got {violations}"
        assert "sgs-theme/" in violations[0][2]

    def test_clean_passes(self, tmp_path):
        """A Slug: header using sgs/ must produce no violations."""
        patterns_dir = tmp_path / "patterns"
        patterns_dir.mkdir()
        good = _php_file(
            patterns_dir,
            "header-good.php",
            "<?php\n/**\n * Title: Good Header\n * Slug: sgs/indus-foods-header\n */\n",
        )
        violations = LINT.check_pattern_slugs([good])
        assert violations == [], f"Expected no violations, got {violations}"

    def test_non_pattern_file_ignored(self, tmp_path):
        """PHP files not in a patterns/ directory are not checked for Slug: headers."""
        bad = _php_file(
            tmp_path,
            "some-class.php",
            "<?php\n/**\n * Slug: sgs-theme/header-bad\n */\n",
        )
        violations = LINT.check_pattern_slugs([bad])
        assert violations == []


# ---------------------------------------------------------------------------
# Rule 2 — Block slug in block.json
# ---------------------------------------------------------------------------

class TestRule2BlockSlugs:
    def test_violation_non_kebab(self, tmp_path):
        """A block.json 'name' with camelCase must produce a violation."""
        bad = _json_file(
            tmp_path,
            "block.json",
            '{"name": "sgs/CardGrid", "title": "Card Grid"}',
        )
        violations = LINT.check_block_slugs([bad])
        assert len(violations) == 1
        assert "CardGrid" in violations[0][2]

    def test_violation_underscore(self, tmp_path):
        bad = _json_file(
            tmp_path,
            "block.json",
            '{"name": "sgs/card_grid", "title": "Card Grid"}',
        )
        violations = LINT.check_block_slugs([bad])
        assert len(violations) == 1

    def test_clean_passes(self, tmp_path):
        good = _json_file(
            tmp_path,
            "block.json",
            '{"name": "sgs/card-grid", "title": "Card Grid"}',
        )
        violations = LINT.check_block_slugs([good])
        assert violations == []

    def test_core_block_ignored(self, tmp_path):
        """core/paragraph in a block.json must not trigger a violation."""
        good = _json_file(
            tmp_path,
            "block.json",
            '{"name": "core/paragraph", "title": "Paragraph"}',
        )
        violations = LINT.check_block_slugs([good])
        assert violations == []


# ---------------------------------------------------------------------------
# Rule 3 — BEM CSS class names
# ---------------------------------------------------------------------------

class TestRule3BemClasses:
    def test_violation_underscore_in_segment(self, tmp_path):
        """A BEM class with an underscore inside a segment must be flagged."""
        bad = _css_file(
            tmp_path,
            "style.css",
            ".sgs-hero__head_line { color: red; }\n",
        )
        violations = LINT.check_bem_classes([bad])
        assert len(violations) >= 1
        assert "underscore" in violations[0][2]

    def test_clean_passes(self, tmp_path):
        good = _css_file(
            tmp_path,
            "style.css",
            ".sgs-hero__headline--large { color: red; }\n",
        )
        violations = LINT.check_bem_classes([good])
        assert violations == []

    def test_non_sgs_class_ignored(self, tmp_path):
        """Classes not starting with sgs- must not be checked."""
        other = _css_file(
            tmp_path,
            "style.css",
            ".wp-block__inner_content { color: red; }\n",
        )
        violations = LINT.check_bem_classes([other])
        assert violations == []


# ---------------------------------------------------------------------------
# Rule 4 — PHP function prefixes
# ---------------------------------------------------------------------------

class TestRule4FunctionPrefixes:
    def test_violation_unprefixed(self, tmp_path):
        bad = _php_file(
            tmp_path,
            "helpers.php",
            "<?php\nfunction get_site_information() {\n    return true;\n}\n",
        )
        violations = LINT.check_php_function_prefixes([bad])
        assert len(violations) == 1
        assert "get_site_information" in violations[0][2]

    def test_clean_passes(self, tmp_path):
        good = _php_file(
            tmp_path,
            "helpers.php",
            "<?php\nfunction sgs_get_site_information() {\n    return true;\n}\n",
        )
        violations = LINT.check_php_function_prefixes([good])
        assert violations == []

    def test_indented_method_ignored(self, tmp_path):
        """Class methods (indented) must not be flagged as top-level functions."""
        cls = _php_file(
            tmp_path,
            "class-thing.php",
            "<?php\nclass Foo {\n\tpublic function bar() {}\n}\n",
        )
        violations = LINT.check_php_function_prefixes([cls])
        assert violations == []


# ---------------------------------------------------------------------------
# Rule 5 — Hook prefixes
# ---------------------------------------------------------------------------

class TestRule5HookPrefixes:
    def test_violation_custom_hook_no_prefix(self, tmp_path):
        bad = _php_file(
            tmp_path,
            "hooks.php",
            "<?php\nadd_action( 'my_custom_event', 'sgs_handler' );\n",
        )
        violations = LINT.check_hook_prefixes([bad])
        assert len(violations) == 1
        assert "my_custom_event" in violations[0][2]

    def test_clean_sgs_hook_passes(self, tmp_path):
        good = _php_file(
            tmp_path,
            "hooks.php",
            "<?php\nadd_action( 'sgs_site_info_saved', 'sgs_handler' );\n",
        )
        violations = LINT.check_hook_prefixes([good])
        assert violations == []

    def test_core_wp_hook_ignored(self, tmp_path):
        """Core WP hooks like init, wp_enqueue_scripts must not be flagged."""
        core = _php_file(
            tmp_path,
            "hooks.php",
            "<?php\nadd_action( 'init', 'sgs_setup' );\nadd_action( 'wp_enqueue_scripts', 'sgs_enqueue' );\n",
        )
        violations = LINT.check_hook_prefixes([core])
        assert violations == []


# ---------------------------------------------------------------------------
# Rule 6 — wp_options keys
# ---------------------------------------------------------------------------

class TestRule6OptionKeys:
    def test_violation_unprefixed_key(self, tmp_path):
        bad = _php_file(
            tmp_path,
            "settings.php",
            "<?php\n$val = get_option( 'my_plugin_setting' );\n",
        )
        violations = LINT.check_option_keys([bad])
        assert len(violations) == 1
        assert "my_plugin_setting" in violations[0][2]

    def test_clean_passes(self, tmp_path):
        good = _php_file(
            tmp_path,
            "settings.php",
            "<?php\n$val = get_option( 'sgs_site_info' );\n",
        )
        violations = LINT.check_option_keys([good])
        assert violations == []

    def test_core_option_ignored(self, tmp_path):
        """Core WP options like blogname must be ignored."""
        core = _php_file(
            tmp_path,
            "settings.php",
            "<?php\n$name = get_option( 'blogname' );\n",
        )
        violations = LINT.check_option_keys([core])
        assert violations == []


# ---------------------------------------------------------------------------
# Rule 7 — Post-meta keys
# ---------------------------------------------------------------------------

class TestRule7PostMetaKeys:
    def test_violation_double_underscore(self, tmp_path):
        bad = _php_file(
            tmp_path,
            "meta.php",
            "<?php\nget_post_meta( $id, 'sgs__bad_key', true );\n",
        )
        violations = LINT.check_post_meta_keys([bad])
        assert len(violations) == 1
        assert "double underscore" in violations[0][2]

    def test_private_meta_clean(self, tmp_path):
        good = _php_file(
            tmp_path,
            "meta.php",
            "<?php\nget_post_meta( $id, '_sgs_cloned_from_pattern_slug', true );\n",
        )
        violations = LINT.check_post_meta_keys([good])
        assert violations == []

    def test_public_meta_clean(self, tmp_path):
        good = _php_file(
            tmp_path,
            "meta.php",
            "<?php\nget_post_meta( $id, 'sgs_header_mode', true );\n",
        )
        violations = LINT.check_post_meta_keys([good])
        assert violations == []

    def test_non_sgs_meta_ignored(self, tmp_path):
        """Post-meta keys not starting with sgs must be ignored entirely."""
        other = _php_file(
            tmp_path,
            "meta.php",
            "<?php\nget_post_meta( $id, '_wp_page_template', true );\n",
        )
        violations = LINT.check_post_meta_keys([other])
        assert violations == []
