"""Editor mechanisms (blind spots 11-18): computed setAttributes keys, extension
and variation controls, control-panel reads, conditional ServerSideRender,
barrel re-exports, the L7 real-property exemption and device-tier reads."""
from __future__ import annotations

import json
import subprocess

import pytest

from wf_editor import EditorModel, tier_only
from wf_paths import COLLECTOR_JS, PLUGIN

EDIT = """import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import { previewPadding, typoPreview, TypoControls } from '../../utils';
import { shadowAttrKeys } from '../../components/ShadowControl';
import { COLOUR_ROWS } from './rows';

const TEXT_TARGETS = [
	[ 'panelTitle', 'Heading' ],
	[ 'itemName', 'Item name' ],
].map( ( [ prefix, label ] ) => ( { key: prefix, prefix, label } ) );

export default function Edit( { attributes, setAttributes } ) {
	const { mode, accent, contrastBg, chipBg, glyph } = attributes;
	const isLive = 'live' === mode;
	const forContrast = contrastBg;
	const glyphValue = glyph || undefined;
	const keys = shadowAttrKeys( 'cardShadow', { hoverColour: true } );
	const closeAttrs = attributes.closeCase ? attributes : { ...attributes, closeCase: 'upper' };
	const closeStyle = typoPreview( closeAttrs, 'close' );
	const cols = attributes.columns || {};
	const oneColumn = 1 === Number( cols.mobile );
	const isGrid = 'grid' === attributes.layoutMode;
	const pick = ( v ) => {
		const next = { iconSource: v, iconName: '' };
		setAttributes( next );
	};
	return (
		<>
			<InspectorControls>
				<PanelBody>
					<SgsColourPanel colours={ [ { value: accent, onChange: ( v ) => setAttributes( { accent: v } ) } ] } contrastAgainst={ forContrast } />
					<TypoControls targets={ TEXT_TARGETS } />
					{ isLive && <ToggleControl checked={ attributes.liveOnly } onChange={ ( v ) => setAttributes( { liveOnly: v } ) } /> }
				</PanelBody>
			</InspectorControls>
			<SgsChipPanel value={ chipBg } />
			<span className={ ( oneColumn ? 'one' : '' ) + ( isGrid ? ' grid' : '' ) } style={ closeStyle } />
			{ isLive ? (
				<ServerSideRender block="sgs/probe" attributes={ attributes } />
			) : (
				<div { ...useBlockProps( { style: { padding: previewPadding( attributes ), color: glyphValue, margin: attributes.margin?.desktop } } ) }>{ attributes.title }</div>
			) }
		</>
	);
}
"""
ROWS = """export const COLOUR_ROWS = [ 'rowColour', 'rowColourHover' ];
export function Rows( { setAttributes } ) {
	return COLOUR_ROWS.map( ( attr ) => setAttributes( { [ attr ]: '' } ) );
}
"""
UTILS_INDEX = "export * from './padding';\nexport * from './typo';\n"
UTILS_TYPO = ("export function typoPreview( attributes, prefix ) { return { letterSpacing: attributes[ `${ prefix }LetterSpacing` ] }; }\n"
              "export function TypoControls( { targets } ) { return targets.map( ( { prefix } ) => `${ prefix }FontSize` ); }\n")
UTILS_PADDING = "export function previewPadding( attributes ) { return attributes.boxPadding; }\n"
SHADOW = "export function shadowAttrKeys( base, opts ) { return { base, colour: base + 'Colour' }; }\n"
EXT = """import { addFilter } from '@wordpress/hooks';
addFilter( 'editor.BlockEdit', 'sgs/probe-ext', ( Edit ) => ( props ) => {
	const { setAttributes } = props;
	return <ToggleControl onChange={ ( v ) => setAttributes( { sgsReveal: v } ) } />;
} );
"""
ATTRS = ["mode", "accent", "contrastBg", "chipBg", "glyph", "liveOnly", "iconSource", "iconName", "cardShadow",
         "cardShadowColour", "cardShadowColourHover", "rowColour", "rowColourHover", "boxPadding", "margin", "title",
         "sgsReveal", "inheritStyle", "closeCase", "closeLetterSpacing", "panelTitleFontSize", "itemNameFontSize",
         "columns", "layoutMode"]


@pytest.fixture(scope="module")
def model(tmp_path_factory):
    root = tmp_path_factory.mktemp("ef")
    blk = root / "src" / "blocks" / "probe"
    blk.mkdir(parents=True)
    (blk / "edit.js").write_text(EDIT, encoding="utf-8")
    (blk / "rows.js").write_text(ROWS, encoding="utf-8")
    bj = {"name": "sgs/probe", "attributes": {a: {"type": "string"} for a in ATTRS},
          "variations": [{"name": "v", "attributes": {"inheritStyle": True}}]}
    (blk / "block.json").write_text(json.dumps(bj), encoding="utf-8")
    (root / "src" / "utils").mkdir(parents=True)
    (root / "src" / "utils" / "index.js").write_text(UTILS_INDEX, encoding="utf-8")
    (root / "src" / "utils" / "padding.js").write_text(UTILS_PADDING, encoding="utf-8")
    (root / "src" / "utils" / "typo.js").write_text(UTILS_TYPO, encoding="utf-8")
    (root / "src" / "components").mkdir(parents=True)
    (root / "src" / "components" / "ShadowControl.js").write_text(SHADOW, encoding="utf-8")
    (root / "src" / "blocks" / "extensions").mkdir(parents=True)
    (root / "src" / "blocks" / "extensions" / "reveal.js").write_text(EXT, encoding="utf-8")
    out = subprocess.run(["node", str(COLLECTOR_JS), str(root), str(PLUGIN / "node_modules")], capture_output=True, text=True, check=True)
    facts = json.loads(out.stdout)
    return EditorModel(facts, root).block("probe", bj, facts["extensions"])


def test_computed_and_descriptor_keys_are_controls(model):
    for attr in ("iconSource", "iconName", "rowColour", "rowColourHover", "cardShadow", "cardShadowColourHover"):
        assert attr in model.control, attr


def test_extension_and_variation_controls(model):
    assert model.control["sgsReveal"].startswith("extension:")
    assert model.control["inheritStyle"] == "variation"


def test_control_panel_props_are_not_canvas_reads(model):
    for attr in ("accent", "contrastBg", "chipBg"):
        assert attr not in model.canvas, attr


def test_conditional_ssr_credits_only_its_branch(model):
    assert model.ssr == "partial"
    assert {"mode", "liveOnly"} <= model.ssr_credit
    assert "accent" not in model.ssr_credit


def test_barrel_re_export_helper_is_a_canvas_read(model):
    assert "boxPadding" in model.canvas


def test_real_property_through_a_local_is_the_l7_exemption(model):
    assert "glyph" in model.real_prop


def test_single_device_tier_read(model):
    assert tier_only(model.canvas["margin"])
    assert not tier_only(model.canvas["title"])


def test_tuple_table_mapped_into_prefixed_controls_credits_each_prefix(model):
    assert {"panelTitleFontSize", "itemNameFontSize"} <= set(model.control)


def test_attributes_derived_through_spread_and_ternary_reach_the_preview_helper(model):
    assert "closeLetterSpacing" in model.canvas


def test_a_value_only_compared_is_a_flag_not_a_canvas_read(model):
    from wf_links import canvas_mode

    assert model.canvas["columns"]["flag"]
    assert not model.canvas["layoutMode"]["flag"]
    assert canvas_mode(model, "columns", False, layout=True) is None
    assert canvas_mode(model, "layoutMode", False, layout=True) == "direct"
