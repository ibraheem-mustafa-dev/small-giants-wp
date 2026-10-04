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
