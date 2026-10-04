"""L2 control credit the 2026-10-05 review found missing: an object built key by key and passed to
setAttributes (`next.attr = v`), a name builder with leading arguments and a concatenated tier suffix
(`mediaStoredAttrName( blockSlug, prefix, 'X' )`, `mediaAttrName( prefix, 'MediaType' ) + 'Tablet'`), and a
control component an extension imports."""
from __future__ import annotations

import json
import subprocess

import pytest

from wf_editor import EditorModel
from wf_paths import COLLECTOR_JS, PLUGIN

EDIT = """import { MediaCtl } from '../../components/MediaCtl';
export default function Edit( { attributes, setAttributes } ) {
	const pickFrames = ( ext ) => {
		const next = { frameCount: 3 };
		next.desktopFrameExt = ext;
		setAttributes( next );
	};
	return <MediaCtl prefix="split" attributes={ attributes } setAttributes={ setAttributes } onPick={ pickFrames } />;
}
"""
MEDIA_CTL = """const mediaStoredAttrName = ( slug, prefix, base ) => prefix + base;
const mediaAttrName = ( prefix, base ) => prefix + base;
export function MediaCtl( { blockSlug, prefix, setAttributes } ) {
	const hoverKey = mediaStoredAttrName( blockSlug, prefix, 'BorderColourHover' );
	const tabletKey = mediaAttrName( prefix, 'MediaType' ) + 'Tablet';
	return [ setAttributes( { [ hoverKey ]: '' } ), setAttributes( { [ tabletKey ]: '' } ) ];
}
"""
STAGGER = """export default function Stagger( { setAttributes } ) {
	return setAttributes( { sgsStagger: 1 } );
}
"""
EXT = """import { addFilter } from '@wordpress/hooks';
import Stagger from '../../components/Stagger';
addFilter( 'editor.BlockEdit', 'sgs/anim', ( Edit ) => ( props ) => <Stagger setAttributes={ props.setAttributes } /> );
"""
ATTRS = ["frameCount", "desktopFrameExt", "splitBorderColourHover", "splitMediaTypeTablet"]


@pytest.fixture(scope="module")
def facts(tmp_path_factory):
    root = tmp_path_factory.mktemp("cc")
    blk = root / "src" / "blocks" / "probe"
    blk.mkdir(parents=True)
    (blk / "edit.js").write_text(EDIT, encoding="utf-8")
    (blk / "block.json").write_text(json.dumps({"name": "sgs/probe", "attributes": {a: {"type": "string"} for a in ATTRS}}), encoding="utf-8")
    comps = root / "src" / "components"
    comps.mkdir(parents=True)
    (comps / "MediaCtl.js").write_text(MEDIA_CTL, encoding="utf-8")
    (comps / "Stagger.js").write_text(STAGGER, encoding="utf-8")
    ext = root / "src" / "blocks" / "extensions"
    ext.mkdir(parents=True)
    (ext / "anim.js").write_text(EXT, encoding="utf-8")
    out = subprocess.run(["node", str(COLLECTOR_JS), str(root), str(PLUGIN / "node_modules")], capture_output=True, text=True, check=True)
    data = json.loads(out.stdout)
    bj = {"name": "sgs/probe", "attributes": {a: {"type": "string"} for a in ATTRS}}
    return data, EditorModel(data, root).block("probe", bj, data["extensions"])


def test_must_fail_object_built_key_by_key_is_a_control(facts):
    _, model = facts
    assert "desktopFrameExt" in model.control


def test_must_fail_name_builder_with_leading_args_and_tier_suffix_is_a_control(facts):
    _, model = facts
    assert "splitBorderColourHover" in model.control
    assert "splitMediaTypeTablet" in model.control


def test_must_fail_extension_reaches_its_control_component(facts):
    data, _ = facts
    reach = data["extensionReach"]["src/blocks/extensions/anim.js"]
    assert "src/components/Stagger.js" in reach
    assert "sgsStagger" in data["files"]["src/components/Stagger.js"]["setKeys"]


def test_an_unrelated_assignment_is_not_a_control(facts):
    data, _ = facts
    assert "frameCount" in data["files"]["src/blocks/probe/edit.js"]["setKeys"]
    assert "ext" not in data["files"]["src/blocks/probe/edit.js"]["setKeys"]


def test_must_fail_script_runtime_only_setting_is_advisory_not_a_canvas_gap():
    from wf_links import ADVISORY, runtime_only
    from wf_tokens import Channel
    assert "L3-runtime" in ADVISORY
    assert runtime_only("js", Channel(data={"data-drag-momentum"}, read=True))
    # Anything a stylesheet applies keeps the blocking L3: a declaration, a custom property, a modifier class.
    assert not runtime_only("js", Channel(decl=True, read=True))
    assert not runtime_only("js", Channel(cps={"--sgs-x-speed"}, read=True))
    assert not runtime_only("js", Channel(classes={"sgs-x--loop"}, read=True))
    assert not runtime_only("css", Channel(data={"data-x"}, read=True))


def test_must_fail_a_runtime_only_setting_with_no_canvas_takes_the_runtime_link():
    from wf_editor import BlockEditor
    from wf_links import _editor_links
    be = BlockEditor()
    be.control["dragMomentum"] = "setAttributes"
    missing, details = [], {}
    _editor_links("dragMomentum", False, None, be, missing, details, runtime=True)
    assert missing == ["L3-runtime"]
    missing = []
    _editor_links("dragMomentum", False, None, be, missing, details, runtime=False)
    assert missing == ["L3"]
