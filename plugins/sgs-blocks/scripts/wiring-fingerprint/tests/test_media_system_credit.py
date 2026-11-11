"""The shared media system as a source of wiring links (wf_media_system, media_system_facts.mjs), with negative controls:
a setting the panels never offer for a slot's context and kinds earns no credit, and a block that does not mount a half
of the system earns nothing for that half."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from wf_media_system import CANVAS_FILES, PANEL_DIR, MediaSystem
from wf_paths import MEDIA_FACTS_MJS, PLUGIN


def facts_for(tmp: Path, blocks: dict[str, dict]) -> dict:
    """Run media_system_facts.mjs over block.json files written for the test, against the real registry."""
    root = tmp / "blocks"
    for name, entries in blocks.items():
        folder = root / name.split("/")[1]
        folder.mkdir(parents=True)
        (folder / "block.json").write_text(json.dumps({"name": name, "supports": {"sgs": {"mediaElements": entries}}}), encoding="utf-8")
    out = subprocess.run(["node", str(MEDIA_FACTS_MJS), str(PLUGIN), str(root)], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)["blocks"]


@pytest.fixture(scope="module")
def real(tmp_path_factory):
    return facts_for(tmp_path_factory.mktemp("facts"), {
        "sgs/el": [{"prefix": "layer", "context": "element", "kinds": ["image"], "atoms": ["object-fit", "focal-point"]}],
        "sgs/bg": [{"prefix": "background", "context": "background", "kinds": ["image"], "atoms": ["object-fit", "focal-point"]}],
        "sgs/bgvideo": [{"prefix": "background", "context": "background", "kinds": ["video"], "atoms": ["object-fit"]}],
        "sgs/set": [{"prefix": "item", "context": "item", "kinds": ["image"], "atoms": ["source", "object-fit", "focal-point"]}],
    })


def test_must_fail_background_only_settings_are_not_offered_on_an_element_slot(real):
    el, bg = real["sgs/el"], real["sgs/bg"]
    for base in ("Pinned", "Repeat", "TileSize"):
        assert not el[f"layer{base}"]["offered"], base
        assert bg[f"background{base}"]["offered"], base
    assert el["layerFit"]["offered"] and el["layerFocal"]["offered"]


def test_must_fail_a_kind_the_row_does_not_allow_is_not_offered(real):
    # Tile and tile size are image-only: a background slot that takes video alone is not offered them.
    assert not real["sgs/bgvideo"]["backgroundRepeat"]["offered"]
    assert real["sgs/bgvideo"]["backgroundFit"]["offered"]


def test_must_fail_an_item_set_holds_its_per_item_values_in_the_items(real):
    s = real["sgs/set"]
    assert not s["itemSource"]["offered"] and not s["itemFocal"]["offered"]
    assert s["itemFit"]["offered"]


def test_a_setting_with_no_css_property_and_no_emitter_does_not_paint(tmp_path):
    facts = facts_for(tmp_path, {"sgs/el": [{"prefix": "", "context": "element", "kinds": ["image"], "atoms": ["source"]}]})
    assert facts["sgs/el"]["loading"]["paints"] is False


def system(tmp_path: Path, attr_facts: dict, editor: bool = True) -> tuple[MediaSystem, Path]:
    plugin = tmp_path / "plugin"
    (plugin / PANEL_DIR).mkdir(parents=True)
    for f in CANVAS_FILES:
        (plugin / f).parent.mkdir(parents=True, exist_ok=True)
        (plugin / f).write_text("", encoding="utf-8")
    bdir = plugin / "src" / "blocks" / "probe"
    bdir.mkdir(parents=True)
    (bdir / "render.php").write_text("<?php SGS_Media_Element::render( $slot, $attributes );", encoding="utf-8")
    return MediaSystem({"blocks": {"sgs/probe": attr_facts}}, plugin), bdir


FACT = {"base": "Fit", "context": "element", "offered": True, "paints": True, "reads": {"php": True, "js": True}}
FILES = [PANEL_DIR + "MediaPanels.js", CANVAS_FILES[0]]


def test_an_offered_setting_of_a_block_that_mounts_all_three_halves_gets_every_link(tmp_path):
    ms, bdir = system(tmp_path, {"layerFit": FACT})
    assert ms.credits("sgs/probe", "layerFit", FILES, bdir) == {"L2", "L3", "L3-tier", "L3-state", "L3-runtime", "L4", "L5"}


def test_must_fail_a_setting_the_panels_do_not_offer_for_the_slot_earns_nothing(tmp_path):
    ms, bdir = system(tmp_path, {"layerPinned": {**FACT, "base": "Pinned", "offered": False}})
    assert ms.credits("sgs/probe", "layerPinned", FILES, bdir) == frozenset()


def test_must_fail_an_attribute_the_system_does_not_know_earns_nothing(tmp_path):
    ms, bdir = system(tmp_path, {"layerFit": FACT})
    assert ms.credits("sgs/probe", "layerBlur", FILES, bdir) == frozenset()
    assert ms.credits("sgs/other", "layerFit", FILES, bdir) == frozenset()


def test_must_fail_a_block_that_mounts_no_panels_gets_no_control(tmp_path):
    ms, bdir = system(tmp_path, {"layerFit": FACT})
    assert "L2" not in ms.credits("sgs/probe", "layerFit", [CANVAS_FILES[0]], bdir)


def test_must_fail_a_block_with_no_canvas_preview_gets_no_canvas_link(tmp_path):
    ms, bdir = system(tmp_path, {"layerFit": FACT})
    assert "L3" not in ms.credits("sgs/probe", "layerFit", [PANEL_DIR + "MediaPanels.js"], bdir)


def test_must_fail_a_block_that_never_calls_the_renderer_gets_no_front_end_link(tmp_path):
    ms, bdir = system(tmp_path, {"layerFit": FACT})
    (bdir / "render.php").write_text("<?php echo 'x';", encoding="utf-8")
    assert not ms.credits("sgs/probe", "layerFit", FILES, bdir) & {"L4", "L5"}


def test_must_fail_a_setting_the_renderer_never_reads_gets_no_front_end_link(tmp_path):
    ms, bdir = system(tmp_path, {"layerFit": {**FACT, "reads": {"php": False, "js": True}}})
    credited = ms.credits("sgs/probe", "layerFit", FILES, bdir)
    assert "L4" not in credited and "L3" in credited


def test_must_fail_a_renamed_entry_point_fails_loudly(tmp_path):
    plugin = tmp_path / "plugin"
    (plugin / PANEL_DIR).mkdir(parents=True)
    with pytest.raises(RuntimeError, match="entry point"):
        MediaSystem({"blocks": {"sgs/probe": {"layerFit": FACT}}}, plugin)


def test_must_fail_a_media_setting_with_no_css_is_not_paint_unless_its_role_paints():
    from wf_paint import PaintClassifier

    classify = PaintClassifier([]).classify
    behaviour = {"attr_name": "loading", "role": "behaviour", "css_property": None}
    assert classify(behaviour, {"media_no_css": True, "decl_channel": True}) == ("not", "media-setting-no-css")
    assert classify(behaviour, {"media_no_css": False, "decl_channel": True}) == ("css", "decl-channel")
    layout = {"attr_name": "svgLayer", "role": "layout", "css_property": None}
    assert classify(layout, {"media_no_css": True}) == ("css", "role:layout")


def test_must_fail_a_destructure_with_an_empty_object_fallback_reads_the_attributes(tmp_path):
    from wf_paths import COLLECTOR_JS

    blk = tmp_path / "src" / "blocks" / "probe"
    blk.mkdir(parents=True)
    (blk / "edit.js").write_text(
        "export default function Edit( { attributes } ) {\n"
        "\tconst { surfaceBlur } = attributes || {};\n"
        "\treturn <div style={ { filter: surfaceBlur } } />;\n}\n",
        encoding="utf-8",
    )
    (blk / "block.json").write_text(json.dumps({"name": "sgs/probe", "attributes": {"surfaceBlur": {"type": "string"}}}), encoding="utf-8")
    out = subprocess.run(["node", str(COLLECTOR_JS), str(tmp_path), str(PLUGIN / "node_modules")], capture_output=True, text=True, check=True)
    assert "surfaceBlur" in json.loads(out.stdout)["files"]["src/blocks/probe/edit.js"]["canvasReads"]
