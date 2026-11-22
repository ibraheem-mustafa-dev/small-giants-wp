"""The render cache's code hash: per block, so another block's files do not throw a block's renders away."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import render as RN  # noqa: E402


def make_plugin(root: Path) -> Path:
    for rel, text in {
        'src/blocks/button/block.json': '{"name": "sgs/button"}', 'src/blocks/button/render.php': '<?php echo 1;',
        'src/blocks/button/style.css': '.sgs-button{}', 'src/blocks/cart/block.json': '{"name": "sgs/cart"}',
        'src/blocks/cart/style.css': '.sgs-cart{}', 'src/blocks/cart/render.php': '<?php echo 2;', 'includes/helpers.php': '<?php',
    }.items():
        f = root / rel
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(text, encoding='utf-8')
    return root


def test_must_fail_another_blocks_files_leave_the_hash_alone(tmp_path):
    # Breaks if the hash covered every block's folder: one stylesheet edit anywhere would re-render every block.
    plugin = make_plugin(tmp_path)
    before = RN.code_hash(plugin, (), {'button'})
    (plugin / 'src/blocks/cart/style.css').write_text('.sgs-cart{color:red}', encoding='utf-8')
    (plugin / 'src/blocks/cart/render.php').write_text('<?php echo 3;', encoding='utf-8')
    assert RN.code_hash(plugin, (), {'button'}) == before


def test_own_files_shared_php_and_any_block_json_change_the_hash(tmp_path):
    plugin = make_plugin(tmp_path)
    for rel, text in (('src/blocks/button/render.php', '<?php echo 3;'), ('includes/helpers.php', '<?php //'), ('src/blocks/cart/block.json', '{"name": "sgs/cart", "x": 1}')):
        before = RN.code_hash(plugin, (), {'button'})
        (plugin / rel).write_text(text, encoding='utf-8')
        assert RN.code_hash(plugin, (), {'button'}) != before, rel
