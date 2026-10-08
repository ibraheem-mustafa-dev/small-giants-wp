"""A block split across files reads as one block: a panel that writes through the
curried `set( 'key' )` helper is a control, and a render partial required by
render.php is read in render.php's own scope."""
from __future__ import annotations

import json
import subprocess

from wf_editor import EditorModel
from wf_frontend import _inline_partials
from wf_paths import COLLECTOR_JS, PLUGIN
from wf_php import PhpText

EDIT = """import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import QueryPanel from './QueryPanel';

export default function Edit( { attributes, setAttributes } ) {
	const set = ( key ) => ( value ) => setAttributes( { [ key ]: value } );
	return (
		<div { ...useBlockProps() }>
			<InspectorControls>
				<QueryPanel attributes={ attributes } set={ set } />
			</InspectorControls>
		</div>
	);
}
"""

PANEL = """import { SelectControl } from '@wordpress/components';

export default function QueryPanel( { attributes, set } ) {
	const seen = new Map();
	seen.set( 'ghost', 1 );
	return <SelectControl value={ attributes.order } onChange={ set( 'order' ) } />;
}
"""


def test_a_panel_writing_through_the_curried_set_helper_is_a_control(tmp_path):
	root = tmp_path / "plugin"
	blk = root / "src" / "blocks" / "probe"
	blk.mkdir(parents=True)
	(blk / "edit.js").write_text(EDIT, encoding="utf-8")
	(blk / "QueryPanel.js").write_text(PANEL, encoding="utf-8")
	bj = {"name": "sgs/probe", "attributes": {"order": {"type": "string"}, "ghost": {"type": "string"}}}
	(blk / "block.json").write_text(json.dumps(bj), encoding="utf-8")
	out = subprocess.run(["node", str(COLLECTOR_JS), str(root), str(PLUGIN / "node_modules")], capture_output=True, text=True, check=True)
	facts = json.loads(out.stdout)
	model = EditorModel(facts, root).block("probe", bj, facts["extensions"])
	assert "order" in model.control
	# Negative control: a Map's own .set( 'ghost', … ) writes no attribute.
	assert "ghost" not in model.control


def test_a_required_partial_is_inlined_where_render_php_requires_it():
	key = "blocks/x"
	own = {
		key + "/render.php": PhpText("<?php\n$bg = $attributes['badgeColour'];\nrequire __DIR__ . '/render-css.php';\nrequire_once __DIR__ . '/fns.php';\n"),
		key + "/render-css.php": PhpText("<?php\n$css[] = '.x{background:' . $bg . '}';\n"),
		key + "/fns.php": PhpText("<?php\nfunction x_fn() {}\n"),
	}
	inlined: set[str] = set()
	merged = _inline_partials(own[key + "/render.php"].src, key, own, inlined)
	assert inlined == {key + "/render-css.php"}
	assert merged.index("$bg = $attributes") < merged.index("'.x{background:'")
	# Negative control: a require_once function file stays its own text.
	assert "function x_fn" not in merged
