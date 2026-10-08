"""Per-device evidence in a render partial counts for the block.

sgs/google-reviews prints its box rules from render-styles.php, a file render.php requires from the
block's own folder. The seeder once read render.php alone, so a split marked 14 of its attributes
box_only and wp-build-page.js would then refuse a per-device value for them.
"""

import importlib.util
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(SCRIPTS / "orchestrator"))

_spec = importlib.util.spec_from_file_location("sgs_update_v2", SCRIPTS / "sgs-update-v2.py")
sgs_update_v2 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sgs_update_v2)

EVIDENCE = "<?php\n$obj = sgs_responsive_normalise_object( $attributes['cardPadding'] ?? null );\n"


def _block(tmp_path: Path) -> Path:
    block = tmp_path / "blocks" / "x"
    block.mkdir(parents=True)
    (block / "render.php").write_text("<?php\nrequire __DIR__ . '/render-styles.php';\n", encoding="utf-8")
    return block


def test_evidence_in_a_sibling_partial_counts(tmp_path):
    block = _block(tmp_path)
    (block / "render-styles.php").write_text(EVIDENCE, encoding="utf-8")
    assert "cardPadding" in sgs_update_v2._render_tier_attrs_for_block(block / "render.php")


def test_negative_control_evidence_outside_the_block_folder_does_not(tmp_path):
    block = _block(tmp_path)
    (tmp_path / "blocks" / "render-styles.php").write_text(EVIDENCE, encoding="utf-8")
    assert "cardPadding" not in sgs_update_v2._render_tier_attrs_for_block(block / "render.php")


def test_block_render_text_reads_render_php_first_then_partials(tmp_path):
    block = _block(tmp_path)
    (block / "render-styles.php").write_text(EVIDENCE, encoding="utf-8")
    text = sgs_update_v2._block_render_text(block)
    assert text.index("require __DIR__") < text.index("cardPadding")
