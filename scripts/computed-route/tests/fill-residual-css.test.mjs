// The residual Custom CSS writer (lib/fill-residual-css.mjs, Spec 48 FR-48-109): what all five equivalence layers failed and
// no setting paints on that part is written as one scoped rule per block instance, part, state and width range in the
// block's Additional CSS, listed with its reason, and each distinct block, part and property is a gap row; what a setting
// holds, what paints nothing and what is not a style never reaches it. Contacts no site (tools/run-tests.mjs).
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

test( 'MUST FAIL WITHOUT THE WRITER: the planted pair: the declaration no setting holds is Custom CSS and listed; the one a setting holds is the setting', () => {
	const w = world();
	// Both declarations go through the generic resolver first, as Fill sends them.
	const ctx = { db, calibration: cal, snapshot: { palette: [], spacing: [], fontSizes: [], fontFamilies: [] }, log: [] };
	const colour = resolve( { block: 'sgs/field', prop: 'color', slot: '.f__input', perWidth: perW( 'rgb(200, 0, 0)' ) }, ctx );
	const size = resolve( { block: 'sgs/field', prop: 'font-size', slot: '.f__input', perWidth: perW( '17px' ) }, ctx );
	assert.ok( colour.writes?.some( ( x ) => 'fieldColour' === x.attr ), 'the colour is the setting\'s' );
	assert.equal( size.gap, 'no-setting', 'no setting holds the font size' );
	assert.equal( size.equivalence?.verdict, 'gap', 'all five layers failed' );
	w.flat[ 0 ].attributes.fieldColour = colour.writes[ 0 ].value;
	const r = run( w, [ row( { property: 'font-size', value: '17px', reason: `no-setting: ${ size.detail }` } ) ] );
	assert.equal( css( w ), '& .f__input { font-size: 17px; }' );
	assert.equal( r.rules.length, 1 );
	assert.deepEqual( r.rules[ 0 ].declarations, [ 'font-size: 17px' ] );
	assert.match( r.rules[ 0 ].reason, /no setting of the block paints it/ );
	assert.deepEqual( r.backlog.map( ( g ) => [ g.block, g.part, g.property, g.class ] ), [ [ 'sgs/field', '.f__input', 'font-size', 'F-setting' ] ] );
	assert.equal( r.unmapped.length, 0 );
	assert.equal( r.answered.length, 1 );
	assert.doesNotMatch( css( w ), /color/, 'the colour a setting holds is never CSS' );
	assert.ok( w.flat[ 0 ].attributes.sgsCustomCssId, 'the rule is scoped to the instance' );
} );

test( 'MUST FAIL WITHOUT THE SLOT-MAP RAIL: a no-setting row whose property a setting paints on that part is a route fault, never CSS', () => {
	const w = world();
	const r = run( w, [ row( { property: 'color', value: 'rgb(200, 0, 0)' } ) ] );
	assert.equal( css( w ), undefined );
	assert.equal( r.classes.route, 1 );
	assert.match( classifyRow( row( { property: 'color', value: 'x' } ), { calFor, db } ).cause, /^equal-judging: fieldColour/ );
	assert.equal( r.unmapped.length, 1, 'the row stays UNMAPPED' );
} );

test( 'MUST FAIL WITHOUT THE SAME-BOX RAIL: a setting that paints the property on a part calibration measured as the same box is a route fault (pairing)', () => {
	const w = world();
	const r = run( w, [ row( { property: 'padding-left', value: '52px' } ) ] );
	assert.equal( css( w ), undefined );
	assert.match( classifyRow( row( { property: 'padding-left', value: '52px' } ), { calFor, db } ).cause, /^pairing: boxPadLeft/ );
	assert.equal( r.classes.route, 1 );
	assert.equal( classifyRow( { ...row( { property: 'padding-left', value: '52px' } ), slot: '' }, { calFor, db } ).cls, 'residual', 'the root is not the same box as .f__box' );
} );

test( 'negative control: held, inert-zero, initial-value, timing and non-style rows never reach the writer', () => {
	const w = world();
	const rows = [
		row( { property: 'padding-left', value: '16px', code: 'held:default' } ),
		row( { property: 'box-shadow', value: 'rgb(58, 42, 34) 0px 0px 0px 0px' } ),
		row( { property: 'transform', value: 'none' } ),
		row( { property: 'transition-duration', value: '0.2s' } ),
		row( { property: 'aria-label', value: 'Search', reason: 'no setting of the block holds the aria-label' } ),
		row( { property: 'border-top-style', value: 'solid', reason: 'shape: borderStyle holds one value for every side' } ),
	];
	const r = run( w, rows );
	assert.equal( css( w ), undefined );
	assert.deepEqual( r.classes, { residual: 0, route: 1, unneeded: 3, outside: 2 } );
	assert.equal( r.unmapped.length, rows.length );
} );

test( 'MUST FAIL WITHOUT THE INHERITED RULE: an inherited property\'s initial value is no proof of nothing to paint (the parent passes its own)', () => {
	assert.equal( classifyRow( row( { property: 'line-height', value: 'normal' } ), { calFor, db } ).cls, 'residual' );
	assert.equal( classifyRow( row( { property: 'transform', value: 'none' } ), { calFor, db } ).cls, 'unneeded', 'not inherited: the initial value with nothing measured' );
} );

test( 'MUST FAIL WITHOUT THE PER-WIDTH RANGES: a value that changes by width is one @media rule per range; hover is its own rule', () => {
	const w = world();
	const r = run( w, [ row( { property: 'font-size', value: '{"375":"15px","768":"17px","1440":"17px"}' } ), row( { property: 'letter-spacing', value: '0.5px', state: 'hover' } ) ] );
	assert.equal( css( w ), '& .f__input:hover { letter-spacing: 0.5px; } @media (max-width: 767px) { & .f__input { font-size: 15px; } } @media (min-width: 768px) { & .f__input { font-size: 17px; } }' );
	assert.equal( r.rules.length, 3 );
	assert.equal( r.backlog.length, 2 );
} );

test( 'MUST FAIL WITHOUT TOKEN REFERENCES: a palette colour and a spacing preset are written as their references', () => {
	const w = world();
	run( w, [ row( { property: 'outline-color', value: 'rgb(58, 42, 34)' } ), row( { property: 'padding-right', value: '20px' } ) ] );
	assert.equal( css( w ), '& .f__input { outline-color: var(--wp--preset--color--ink); padding-right: var(--wp--preset--spacing--50); }' );
	assert.equal( tokenised( 'box-shadow', 'rgb(58, 42, 34) 4px 4px 0px 0px', snapshot ).value, 'var(--wp--preset--color--ink) 4px 4px 0px 0px' );
	assert.equal( tokenised( 'font-family', '"Young Serif", Georgia, serif', snapshot ).value, 'var(--wp--preset--font-family--display)' );
	assert.equal( tokenised( 'font-size', '13px', snapshot ).value, '13px', 'a value the snapshot lacks stays literal' );
} );

test( 'MUST FAIL WITHOUT THE SAME-ELEMENT RULE: two parts reading one draft element take the property once, on the part the block paints its look on', () => {
	const w = world( { same: true } );
	w.reads.widths[ 375 ][ '0:' ].rect.h = 62;
	[ 768, 1440 ].forEach( ( x ) => ( w.reads.widths[ x ][ '0:' ].rect.h = 62 ) );
	const r = run( w, [ row( { property: 'font-size', value: '17px', slot: '' } ), row( { property: 'font-size', value: '17px' } ) ] );
	assert.equal( css( w ), '& .f__input { font-size: 17px; }' );
	assert.equal( r.answered.length, 2, 'the root row is settled as written on the input' );
	assert.equal( r.unmapped.length, 0 );
} );

test( 'MUST FAIL WITHOUT THE REFUSALS: display, an out-of-flow position with its offsets, a layout property read at one width, a container property on a different layout, a block with no Custom CSS', () => {
	const w = world( { styles: { display: 'grid' } } );
	const r = run( w, [
		row( { property: 'display', value: 'grid' } ),
		row( { property: 'position', value: 'absolute', slot: '' } ),
		row( { property: 'left', value: '20px', slot: '' } ),
		row( { property: 'transform', value: 'matrix(1, 0, 0, 1, 0, -12)', slot: '' } ),
		row( { property: 'justify-content', value: 'space-between' } ),
	] );
	assert.equal( css( w ), undefined );
	assert.deepEqual( r.refused.map( ( x ) => x.property ), [ 'display', 'position', 'left', 'transform', 'justify-content' ] );
	assert.match( r.refused[ 4 ].reason, /lays them out differently/ );
	const one = world( { missing: [ 375, 768 ] } );
	const r2 = run( one, [ row( { property: 'width', value: '100%' } ) ] );
	assert.match( r2.refused[ 0 ].reason, /layout property and the draft states it only at 1440/ );
	const core = world( { block: 'core/group' } );
	const r3 = run( core, [ { ...row( { property: 'font-size', value: '17px' } ), block: 'core/group' } ], { calFor: () => cal } );
	assert.match( r3.refused[ 0 ].reason, /has no Custom CSS setting/ );
	assert.equal( css( core ), undefined );
} );

test( 'negative control: a container property on the same layout is written; a visibility toggle is no home for a shown display', () => {
	const w = world();
	run( w, [ row( { property: 'column-gap', value: '8px' } ) ] );
	assert.equal( css( w ), '& .f__input { column-gap: 8px; }' );
	assert.equal( classifyRow( row( { property: 'display', value: 'inline', slot: '' } ), { calFor, db } ).cls, 'residual' );
	assert.equal( classifyRow( row( { property: 'display', value: 'none', slot: '' } ), { calFor, db } ).cls, 'route' );
} );

test( 'MUST FAIL WITHOUT THE COPY RULE: a part path naming one copy of a repeated element is refused; one property is declared once per rule', () => {
	const w = world();
	w.nodes[ 0 ].targets.push( { id: '0:.f__item:nth-of-type(2) > .f__head', index: 0, slot: '.f__item:nth-of-type(2) > .f__head', finder: 'c' } );
	W.forEach( ( x ) => ( w.reads.widths[ x ][ '0:.f__item:nth-of-type(2) > .f__head' ] = { rect: { x: 0, y: 100, w: 300, h: 68 }, styles: {} } ) );
	const r = run( w, [ row( { property: 'min-height', value: '68px', slot: '.f__item:nth-of-type(2) > .f__head' } ), row( { property: 'outline-style', value: 'solid' } ), { ...row( { property: 'outline-style', value: 'solid' } ), reason: `${ gapReason( 'outline-style' ) } (again)` } ] );
	assert.match( r.refused[ 0 ].reason, /names one copy of a repeated part/ );
	assert.equal( css( w ), '& .f__input { outline-style: solid; }' );
} );

test( 'MUST FAIL WITHOUT THE LEAK RULE: an inherited property is refused where a block inside renders another value, written where every one renders it', () => {
	const make = ( kidValue ) => {
		const w = world();
		w.flat.push( { name: 'sgs/field', attributes: {}, ref: 'n1' } );
		w.nodes[ 0 ].children = [ 1 ];
		w.nodes.push( { index: 1, name: 'sgs/field', parent: 0, node: w.flat[ 1 ], children: [], targets: [ { id: '1:', index: 1, slot: '', finder: 'k' } ] } );
		W.forEach( ( x ) => ( w.reads.widths[ x ][ '1:' ] = { rect: { x: 0, y: 200, w: 300, h: 40 }, styles: { 'line-height': kidValue } } ) );
		return w;
	};
	const leak = make( '24px' );
	const r = run( leak, [ row( { property: 'line-height', value: 'normal', slot: '' } ) ] );
	assert.match( r.refused[ 0 ].reason, /inherited and would pass to the blocks inside/ );
	assert.equal( css( leak ), undefined );
	const same = make( 'normal' );
	run( same, [ row( { property: 'line-height', value: 'normal', slot: '' } ) ] );
	assert.equal( css( same ), '& { line-height: normal; }' );
} );

test( 'MUST FAIL WITHOUT THE MOTION AND EFFECT RULES: a resting transform or origin on a block with motion targets is a pose the motion layer holds; an alignment equal in effect to the paint needs nothing', () => {
	const card = ( o ) => ( { ...row( o ), block: 'sgs/card', slot: '' } );
	assert.match( classifyRow( card( { property: 'transform', value: 'matrix(0.999, -0.035, 0.035, 0.999, 0, 0)' } ), { calFor, db } ).cause, /^motion-rest/ );
	assert.match( classifyRow( card( { property: 'transform-origin', value: '0px 15px' } ), { calFor, db } ).cause, /^motion-rest/ );
	assert.equal( classifyRow( card( { property: 'transform', value: 'none', state: 'hover' } ), { calFor, db } ).cls === 'route' && /motion-rest/.test( classifyRow( card( { property: 'transform', value: 'none', state: 'hover' } ), { calFor, db } ).cause ), false, 'a hover look is not the resting pose' );
	assert.equal( classifyRow( row( { property: 'transform', value: 'matrix(0.999, -0.035, 0.035, 0.999, 0, 0)', slot: '' } ), { calFor, db } ).cls, 'residual', 'no motion targets: residual' );
	paint[ '.f__input' ][ 1440 ][ 'justify-content' ] = 'flex-start';
	paint[ '.f__input' ][ 768 ][ 'justify-content' ] = 'flex-start';
	paint[ '.f__input' ][ 375 ][ 'justify-content' ] = 'flex-start';
	assert.match( classifyRow( row( { property: 'justify-content', value: 'normal' } ), { calFor, db } ).cause, /equal in effect/ );
	assert.equal( classifyRow( row( { property: 'justify-content', value: 'center' } ), { calFor, db } ).cls, 'residual' );
	[ 375, 768, 1440 ].forEach( ( x ) => delete paint[ '.f__input' ][ x ][ 'justify-content' ] );
} );

test( 'MUST FAIL WITHOUT THE CAP: past the page cap a rule is refused and listed, and the bytes are counted', () => {
	const w = world();
	const r = run( w, [ row( { property: 'font-size', value: '17px' } ) ], { cap: 10 } );
	assert.equal( css( w ), undefined );
	assert.match( r.refused[ 0 ].reason, /cap of 10 bytes/ );
	const ok = run( world(), [ row( { property: 'font-size', value: '17px' } ) ] );
	assert.equal( ok.bytes, Buffer.byteLength( '& .f__input { font-size: 17px; }' ) );
	assert.ok( PAGE_CAP_BYTES <= 100 * 1024 / 5 );
} );

test( 'zero shadows paint nothing; any non-zero length paints', () => {
	assert.equal( zeroShadow( 'rgb(58, 42, 34) 0px 0px 0px 0px' ), true );
	assert.equal( zeroShadow( 'rgb(58, 42, 34) 4px 4px 0px 0px' ), false );
	assert.equal( zeroShadow( 'none' ), false );
	assert.equal( zeroShadow( 'rgb(0, 0, 0) 0px 0px 0px 0px, rgb(1, 1, 1) 0px 2px 0px 0px' ), false );
} );
