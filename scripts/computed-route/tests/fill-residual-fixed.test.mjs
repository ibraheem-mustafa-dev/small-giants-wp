// A viewport-anchored position is written (lib/fill-residual-css.mjs::OUT_OF_FLOW): `position: fixed` has no ancestor to share
// (its offsets are the screen's), so a floating button's `position: fixed; bottom: 22px; right: 22px; z-index: 140` is one
// scoped rule on its block, where it had been refused with the other out-of-flow positions, and an Indus footer's chat
// button was built as a static pill over the page's last row (2026-11-19). Absolute and sticky stay refused (an ancestor the
// clone does not share places them). Contacts no site (tools/run-tests.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { residualCssWrites, classifyRow, tokenised, zeroShadow, PAGE_CAP_BYTES } from '../lib/fill-residual-css.mjs';
import { resolve } from '../lib/resolve.mjs';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const ext = ( block ) => [ 'sgsCustomCss', 'sgsCustomCssId', 'sgsCustomCssNote' ].map( ( a ) => ( { block_slug: block, attr_name: a, attr_type: 'string', source: 'sgs-ext' } ) );
const db = openDb( fixtureDb( {
	blocks: [ { slug: 'sgs/field', title: 'Field', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/card', title: 'Card', category: 'sgs', type: 'dynamic' }, { slug: 'core/group', title: 'Group', category: 'design', type: 'static', source: 'core' } ],
	block_attributes: [
		...ext( 'sgs/field' ),
		{ block_slug: 'sgs/field', attr_name: 'fieldColour', attr_type: 'string', css_property: 'color', role: 'colour' },
		{ block_slug: 'sgs/field', attr_name: 'boxPadLeft', attr_type: 'string', css_property: 'padding-left', role: 'spacing' },
		{ block_slug: 'sgs/field', attr_name: 'boxJustify', attr_type: 'string', css_property: 'justify-content', role: 'layout' },
		{ block_slug: 'sgs/field', attr_name: 'fieldGap', attr_type: 'string', css_property: 'gap', role: 'layout' },
		{ block_slug: 'sgs/field', attr_name: 'sgsHideOnMobile', attr_type: 'boolean', css_property: 'display', role: 'layout', source: 'sgs-ext' },
		{ block_slug: 'core/group', attr_name: 'tagName', attr_type: 'string', role: 'layout', source: 'core' },
		...ext( 'sgs/card' ),
	],
	motion_targets: [ { block_slug: 'sgs/card', target: 'root', css_element: 'root', kind: 'root' } ],
	motion_fields: [
		{ def_name: 'HoverStateValues', field: 'restOrigin', panel: 'hover', layer: 'hover.state', field_path: 'elements.<target>.hover.state.values.restOrigin', field_type: 'choice', css_property: 'transform-origin', state: 'rest', per_device: 1 },
		{ def_name: 'HoverStateValues', field: 'restRotate', panel: 'hover', layer: 'hover.state', field_path: 'elements.<target>.hover.state.values.restRotate', field_type: 'angle', css_property: '--sgs-rot-rest', state: 'rest', per_device: 1 },
	],
} ) );

const W = [ 375, 768, 1440 ];
const perW = ( v ) => Object.fromEntries( W.map( ( w ) => [ w, v ] ) );
// The block's calibration: fieldColour paints color on the input; the root and the input are measured at every width.
const paint = { '': perW( { display: 'block', 'font-size': '16px', color: 'rgb(0, 0, 0)', 'box-shadow': 'none' } ), '.f__input': perW( { display: 'flex', 'flex-direction': 'row', 'font-size': '14px', color: 'rgb(0, 0, 0)', 'padding-left': '16px', 'box-shadow': 'none', width: '300px', height: '62px', _tag: 'input' } ), '.f__box': perW( { width: '300px', height: '62px' } ) };
const cal = {
	settings: {
		fieldColour: { slot: '.f__input', slots: [ '.f__input' ], property: 'color', state: null, reachedAt: W, effects: [] },
		boxPadLeft: { slot: '.f__box', slots: [ '.f__box' ], property: 'padding-left', state: null, reachedAt: W, effects: [] },
		fieldGap: { slot: '', slots: [ '' ], property: 'gap', state: null, reachedAt: W, effects: [] },
		sgsHideOnMobile: { slot: '', slots: [ '' ], property: 'display', state: null, reachedAt: [ 375 ], effects: [] },
	},
	elements: paint,
};
const calFor = ( b ) => ( [ 'sgs/field', 'sgs/card' ].includes( b ) ? cal : null );
const snapshot = { palette: [ { slug: 'ink', colour: { r: 58, g: 42, b: 34, a: 1 } } ], spacing: [ { slug: '50', px: 20 } ], fontSizes: [], fontFamilies: [ { slug: 'display', family: 'young serif' } ] };

// One node of `block` with a root and an input part, both read on draft elements; `same` reads one element for both.
function world( { block = 'sgs/field', styles = {}, same = false, missing = [] } = {} ) {
	const flat = [ { name: block, attributes: {}, ref: 'n0' } ];
	const nodes = [ { index: 0, name: block, parent: null, node: flat[ 0 ], children: [], targets: [ { id: '0:', index: 0, slot: '', finder: 'a' }, { id: '0:.f__input', index: 0, slot: '.f__input', finder: 'b' } ] } ];
	const widths = Object.fromEntries( W.map( ( w ) => [ w, {
		'0:': missing.includes( w ) ? { missing: true } : { rect: { x: 0, y: 0, w: 300, h: same ? 62 : 80 }, styles: { ...styles, display: 'block' }, layoutDisplay: 'block' },
		'0:.f__input': missing.includes( w ) ? { missing: true } : { rect: { x: 0, y: 0, w: 300, h: 62 }, styles: { display: 'flex', 'flex-direction': 'row', ...styles }, layoutDisplay: styles.display ?? 'flex' },
	} ] ) );
	return { flat, nodes, reads: { widths, sweep: {} }, refOf: ( n ) => n.ref };
}
const gapReason = ( p ) => `no-setting: sgs/field has no setting for ${ p }; equivalence: 1 spelling | 2 values | 3 inert: no | 4 effect: no setting's measured effect reaches ${ p } on this element | 5 judges: nothing written`;
const row = ( o ) => ( { node: 'n0', block: 'sgs/field', slot: '.f__input', state: null, reason: gapReason( o.property ), ...o } );
const run = ( w, rows, o = {} ) => residualCssWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db, unmapped: rows, calFor, snapshot, scope: 'help', date: '2026-11-19', ...o } );
const css = ( w ) => w.flat[ 0 ].attributes.sgsCustomCss;


test( 'MUST FAIL: a fixed position, its offsets and its z-index are one scoped rule on the block', () => {
	const w = world();
	const r = run( w, [
		row( { property: 'position', value: 'fixed', slot: '' } ),
		row( { property: 'bottom', value: '22px', slot: '' } ),
		row( { property: 'right', value: '22px', slot: '' } ),
		row( { property: 'z-index', value: '140', slot: '' } ),
	] );
	assert.deepEqual( r.refused.map( ( x ) => `${ x.property }: ${ x.reason }` ), [] );
	assert.match( css( w ), /position: fixed/ );
	assert.match( css( w ), /bottom: 22px/ );
	assert.match( css( w ), /right: 22px/ );
	assert.match( css( w ), /z-index: 140/ );
} );

test( 'negative control: absolute and sticky positions, with their offsets, are still refused', () => {
	for ( const kind of [ 'absolute', 'sticky' ] ) {
		const w = world();
		const r = run( w, [ row( { property: 'position', value: kind, slot: '' } ), row( { property: 'top', value: '10px', slot: '' } ) ] );
		assert.equal( css( w ), undefined, kind );
		assert.deepEqual( r.refused.map( ( x ) => x.property ), [ 'position', 'top' ], kind );
	}
} );
