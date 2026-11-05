"""Canonical assignment resolves a block's icon-source family once, and Stage 1 reads the block sources side by side first."""
import importlib.util
import sys
from pathlib import Path

import pytest

SCRIPTS = Path(__file__).resolve().parents[1]

BLOCK_JSON = (
    '{"attributes": {"iconSource": {"type": "string", "enum": ["lucide", "wp-icon", "dashicon", "emoji"]}, '
    '"iconName": {"type": "string"}, "wpIconName": {"type": "string"}, "dashiconName": {"type": "string"}, '
    '"emojiChar": {"type": "string"}}}'
)
RENDER_PHP = "\n".join([
    "<?php",
    "$name = $attributes['iconName'];",
    "$wp = $attributes['wpIconName'];",
    "$dash = $attributes['dashiconName'];",
    "$emoji = $attributes['emojiChar'];",
    "$source = $attributes['iconSource'];",
    "switch ( $source ) {",
    " case 'lucide': echo $name; break;",
    " case 'wp-icon': echo $wp; break;",
    " case 'dashicon': echo $dash; break;",
    " case 'emoji': echo $emoji; break;",
    "}",
])


def _load(name: str, relative: str):
    sys.path[:0] = [str(SCRIPTS / "dbschema"), str(SCRIPTS), str(SCRIPTS / "lib"), str(SCRIPTS / "content-role-detect")]
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def d6():
    return _load("d6_under_test", "content-role-detect/detector6_native_support_and_style_emission.py")


@pytest.fixture(scope="module")
def update():
    return _load("update_prewarm_under_test", "sgs-update-v2.py")


def test_a_blocks_icon_family_is_resolved_once_however_many_attributes_ask(d6, monkeypatch):
    calls = []
    monkeypatch.setattr(d6, "_icon_family_cache", {})
    monkeypatch.setattr(d6, "_resolve_icon_source_family", lambda slug: calls.append(slug) or {"iconName": {"role": "icon-lucide", "evidence_line": 3}})
    monkeypatch.setattr(d6, "_block_dir", lambda slug: Path("nowhere") / slug.split("/")[1])
    hits = [d6.icon_source_family_evidence("sgs/demo", attr) for attr in ("iconName", "other", "iconName")]
    assert calls == ["sgs/demo"]
    assert hits[0]["role"] == "icon-lucide" and hits[1] is None and hits[0] == hits[2]


def test_two_blocks_are_resolved_separately(d6, monkeypatch):
    calls = []
    monkeypatch.setattr(d6, "_icon_family_cache", {})
    monkeypatch.setattr(d6, "_resolve_icon_source_family", lambda slug: calls.append(slug) or {})
    d6._icon_source_family("sgs/a")
    d6._icon_source_family("sgs/b")
    d6._icon_source_family("sgs/a")
    assert calls == ["sgs/a", "sgs/b"]


def test_a_block_with_an_icon_source_family_still_resolves_through_the_memo(d6, monkeypatch, tmp_path):
    block = tmp_path / "demo"
    block.mkdir()
    (block / "block.json").write_text(BLOCK_JSON, encoding="utf-8")
    (block / "render.php").write_text(RENDER_PHP, encoding="utf-8")
    monkeypatch.setattr(d6, "_icon_family_cache", {})
    monkeypatch.setattr(d6, "_block_dir", lambda slug: block)
    family = d6._icon_source_family("sgs/demo")
    assert {attr: found["role"] for attr, found in family.items()} == {
        "iconName": "icon-lucide", "wpIconName": "icon-wp-icon", "dashiconName": "icon-dashicon", "emojiChar": "icon-emoji"}
    assert d6._icon_source_family("sgs/demo") is family


def test_prewarm_reads_source_and_include_files_and_nothing_else(update, tmp_path):
    plugin = tmp_path / "plugin"
    (plugin / "src" / "blocks" / "x").mkdir(parents=True)
    (plugin / "includes").mkdir()
    (plugin / "node_modules").mkdir()
    for rel in ("src/blocks/x/block.json", "src/blocks/x/render.php", "includes/h.php", "src/blocks/x/notes.txt", "node_modules/m.js"):
        (plugin / rel).write_text("x", encoding="utf-8")
    assert update._prewarm_source_files(plugin) == 3


def test_prewarm_skips_a_file_it_cannot_read_and_a_missing_folder(update, tmp_path, monkeypatch):
    plugin = tmp_path / "plugin"
    (plugin / "src").mkdir(parents=True)
    (plugin / "src" / "a.js").write_text("x", encoding="utf-8")
    real_open = Path.open

    def refuse(self, *args, **kwargs):
        if self.name == "a.js":
            raise PermissionError("locked")
        return real_open(self, *args, **kwargs)

    monkeypatch.setattr(Path, "open", refuse)
    assert update._prewarm_source_files(plugin) == 1
