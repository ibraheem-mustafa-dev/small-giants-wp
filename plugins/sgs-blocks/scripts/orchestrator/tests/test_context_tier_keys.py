"""A child block that unpacks a provider's block-context value per tier is tier evidence for the provider's attribute.

sgs/accordion hands headerPadding to sgs/accordion-item through providesContext; only the item's render.php
unpacks it per device. Without this evidence the seeder classifies the attribute box_only / is_responsive 0 and
wp-build-page.js refuses a tiered value for it.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from object_attr_shape import context_tier_keys_from_php  # noqa: E402

REPO_BLOCKS = Path(__file__).resolve().parents[3] / "src" / "blocks"


def _php(tmp_path: Path, body: str) -> Path:
    path = tmp_path / "render.php"
    path.write_text("<?php\n" + body, encoding="utf-8")
    return path


def test_closure_dispatch_counts(tmp_path):
    path = _php(
        tmp_path,
        "$pad = $block->context['sgs/xPadding'] ?? array();\n"
        "$tier = static function ( $raw ) { return sgs_responsive_normalise_object( $raw, true ); };\n"
        "$tier( $pad );\n",
    )
    assert context_tier_keys_from_php(path) == {"sgs/xPadding"}


def test_direct_call_counts(tmp_path):
    path = _php(
        tmp_path,
        "$pad = $block->context['sgs/xPadding'];\nsgs_responsive_normalise_object( $pad, true );\n",
    )
    assert context_tier_keys_from_php(path) == {"sgs/xPadding"}


def test_negative_control_flat_read_is_not_evidence(tmp_path):
    """A context value read and printed flat, or one whose name only starts like a tiered variable, must not count."""
    path = _php(
        tmp_path,
        "$colour = $block->context['sgs/xColour'] ?? '';\n"
        "$pad = $block->context['sgs/xPad'] ?? array();\n"
        "$padding = $block->context['sgs/xPadding'] ?? array();\n"
        "sgs_responsive_normalise_object( $padding, true );\n"
        "echo $colour;\n",
    )
    assert context_tier_keys_from_php(path) == {"sgs/xPadding"}


def test_missing_file_is_empty(tmp_path):
    assert context_tier_keys_from_php(tmp_path / "absent.php") == set()


def test_accordion_item_reads_its_padding_per_tier():
    keys = context_tier_keys_from_php(REPO_BLOCKS / "accordion-item" / "render.php")
    assert {"sgs/accordionHeaderPadding", "sgs/accordionContentPadding"} <= keys
    assert "sgs/accordionHeaderColour" not in keys
