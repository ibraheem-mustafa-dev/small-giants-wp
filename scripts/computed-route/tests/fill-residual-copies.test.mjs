// The residual Custom CSS writer on repeated copies and out-of-flow pieces (lib/fill-residual-css.mjs, Spec 48 FR-48-109):
//   - a part of a `sc-for` loop whose copies the draft draws alike is written on its class, the one decision
//     lib/fill-loop-copy.mjs::copyClassSlot makes for every writer of selector rules; copies that differ, or a part that is no
//     loop body, keep the refusal;
//   - an absolutely placed block root is written when the nearest positioned ancestor block is its containing block in the draft
//     and in the clone (lib/fill-placement-host.mjs::placementHost); one with no positioned host stays refused.
// Contacts no site (tools/run-tests.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { residualCssWrites } from '../lib/fill-residual-css.mjs';
import { placementHost } from '../lib/fill-placement-host.mjs';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const ext = ( block ) => [ 'sgsCustomCss', 'sgsCustomCssId', 'sgsCustomCssNote' ].map( ( a ) => ( { block_slug: block, attr_name: a, attr_type: 'string', source: 'sgs-ext' } ) );
const db = openDb( fixtureDb( {
	blocks: [ { slug: 'sgs/list', title: 'List', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/text', title: 'Text', category: 'sgs', type: 'dynamic' }, { slug: 'sgs/box', title: 'Box', category: 'sgs', type: 'dynamic' } ],
	block_attributes: [
		...ext( 'sgs/list' ), ...ext( 'sgs/text' ), ...ext( 'sgs/box' ),
		{ block_slug: 'sgs/list', attr_name: 'itemGap', attr_type: 'string', css_property: 'gap', css_element: 'root', role: 'layout' },
	],
} ) );

const W = [ 375, 768, 1440 ];
const ITEM = '.l__item';
const FIRST = `${ ITEM }:nth-of-type(1)`;
// The list block draws three copies of its item (its calibrated paths hold each position); the box paints position per its own
// default paint (`boxPaint`); the text block paints a static root.
const listCal = { settings: { itemGap: { slot: '', slots: [ '' ], property: 'gap', state: null, reachedAt: W, effects: [] } }, elements: Object.fromEntries( [ '', FIRST, `${ ITEM }:nth-of-type(2)`, `${ ITEM }:nth-of-type(3)` ].map( ( k ) => [ k, Object.fromEntries( W.map( ( w ) => [ w, { display: 'block', position: 'static' } ] ) ) ] ) ) };
const paintOf = ( position ) => ( { settings: {}, elements: { '': Object.fromEntries( W.map( ( w ) => [ w, { display: 'block', position } ] ) ) } } );
const snapshot = { palette: [], spacing: [], fontSizes: [], fontFamilies: [] };
const gapReason = ( b, p ) => `no-setting: ${ b } has no setting for ${ p }; equivalence: 1 spelling | 2 values | 3 inert: no | 4 effect: no setting's measured effect reaches ${ p } on this element | 5 judges: nothing written`;

const read = ( styles = {}, y = 0 ) => ( { rect: { x: 0, y, w: 300, h: 40 }, styles: { display: 'block', ...styles }, layoutDisplay: 'block' } );

// ---- loop copies ----
// The fact record as the intake keeps it: the item (Page/10) is a body of the `sc-for` Page/9; its `padding` style is a script value
// that is the same in every copy (`same`) or differs from copy to copy.
const facts = ( { same = true, loop = true } = {} ) => ( { elements: { 'Page/10': {
	template: { membership: { scFor: loop ? [ { key: 'Page/9', list: '{{ items }}', as: 't' } ] : [] }, holes: [ { id: 'style:padding#1', where: 'style:padding' } ] },
	logic: { holes: { 'style:padding#1': Object.fromEntries( W.map( ( w ) => [ w, { v: same ? [ { t: 'string', v: '0 4px' } ] : [ { t: 'string', v: '0 4px' }, { t: 'string', v: '0 9px' } ], n: 3, loop } ] ) ) } },
} } } );

function listWorld() {
	const flat = [ { name: 'sgs/list', attributes: {}, ref: 'n0' } ];
	const nodes = [ { index: 0, name: 'sgs/list', parent: null, node: flat[ 0 ], children: [], targets: [ { id: '0:', index: 0, slot: '', finder: { tpl: 'Page/8#0' } }, { id: `0:${ FIRST }`, index: 0, slot: FIRST, finder: { tpl: 'Page/10#0' } } ] } ];
	const widths = Object.fromEntries( W.map( ( w ) => [ w, { '0:': read(), [ `0:${ FIRST }` ]: read( { 'outline-style': 'solid', 'padding-left': '4px' } ) } ] ) );
	return { flat, nodes, reads: { widths, sweep: {} }, refOf: ( n ) => n.ref };
}
const listRow = ( property, value ) => ( { node: 'n0', block: 'sgs/list', slot: FIRST, state: null, property, value, reason: gapReason( 'sgs/list', property ) } );
const runList = ( w, rows, o = {} ) => residualCssWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db, unmapped: rows, calFor: () => listCal, snapshot, scope: 'footer', date: '2026-11-22', facts: facts(), rootComponent: 'Page', ...o } );
const css = ( w, i = 0 ) => w.flat[ i ].attributes.sgsCustomCss;

test( 'MUST FAIL: a property the draft gives every copy of a loop alike is one rule on the item\'s class, not refused as one copy', () => {
	const w = listWorld();
	const r = runList( w, [ listRow( 'outline-style', 'solid' ) ] );
	assert.deepEqual( r.refused, [] );
	assert.equal( css( w ), `& ${ ITEM } { outline-style: solid; }` );
	assert.equal( r.rules.length, 1 );
	assert.equal( r.rules[ 0 ].part, ITEM );
	assert.deepEqual( r.unmapped, [] );
} );

test( 'negative controls: copies that differ, a part that is no loop body, no fact record and a part the block draws once keep the refusal', () => {
	const differ = listWorld();
	const a = runList( differ, [ listRow( 'padding-left', '4px' ) ], { facts: facts( { same: false } ) } );
	assert.equal( css( differ ), undefined );
	assert.match( a.refused[ 0 ].reason, /names one copy of a repeated part/ );
	const flat = listWorld();
	assert.equal( runList( flat, [ listRow( 'outline-style', 'solid' ) ], { facts: facts( { loop: false } ) } ).refused.length, 1, 'no sc-for: the element is no loop body' );
	assert.equal( runList( listWorld(), [ listRow( 'outline-style', 'solid' ) ], { facts: null } ).refused.length, 1, 'nothing proves the loop' );
	const once = listWorld();
	const oneCopy = { ...listCal, elements: { '': listCal.elements[ '' ], [ FIRST ]: listCal.elements[ FIRST ] } };
	assert.equal( runList( once, [ listRow( 'outline-style', 'solid' ) ], { calFor: () => oneCopy } ).refused.length, 1, 'the calibration draws one position of the part' );
} );

// A fixed set of parts: three copies of the item, each read on its own draft element with its own `prop` value (`values`).
const copySlot = ( n ) => `${ ITEM }:nth-of-type(${ n })`;
function copyWorld( prop, values ) {
	const w = listWorld();
	const targets = values.map( ( _, i ) => ( { id: `0:${ copySlot( i + 1 ) }`, index: 0, slot: copySlot( i + 1 ), finder: { tpl: 'Page/10#0' } } ) );
	w.nodes[ 0 ].targets = [ w.nodes[ 0 ].targets[ 0 ], ...targets ];
	values.forEach( ( v, i ) => W.forEach( ( x ) => ( w.reads.widths[ x ][ `0:${ copySlot( i + 1 ) }` ] = read( { [ prop ]: v }, i * 50 ) ) ) );
	return { w, rows: values.map( ( v, i ) => ( { ...listRow( prop, v ), slot: copySlot( i + 1 ) } ) ) };
}

test( 'MUST FAIL: a fixed set of parts is written one rule per copy where every copy differs; a copy sharing its value with another stays with the loop, not written', () => {
	const all = copyWorld( 'outline-style', [ 'solid', 'dashed', 'dotted' ] );
	const a = runList( all.w, all.rows, { facts: null } );
	assert.deepEqual( a.refused, [] );
	assert.deepEqual( a.rules.map( ( r ) => r.part ), [ 1, 2, 3 ].map( copySlot ) );
	const shared = copyWorld( 'outline-style', [ 'solid', 'solid', 'dashed' ] );
	const b = runList( shared.w, shared.rows, { facts: null } );
	assert.deepEqual( b.rules.map( ( r ) => r.part ), [ copySlot( 3 ) ], 'only the copy with a value of its own is written' );
	assert.equal( b.refused.length, 2 );
	assert.match( b.refused[ 0 ].reason, /names one copy of a repeated part/ );
} );

test( 'MUST FAIL: a body of a sc-for loop is never a fixed set, whatever its copies read', () => {
	const loop = copyWorld( 'padding-left', [ '4px', '9px', '14px' ] );
	const r = runList( loop.w, loop.rows, { facts: facts( { same: false } ) } );
	assert.equal( css( loop.w ), undefined );
	assert.equal( r.refused.length, 3 );
	assert.match( r.refused[ 0 ].reason, /names one copy of a repeated part/ );
	const fixed = copyWorld( 'padding-left', [ '4px', '9px', '14px' ] );
	assert.equal( runList( fixed.w, fixed.rows, { facts: facts( { loop: false } ) } ).rules.length, 3, 'no sc-for: the same copies are a fixed set' );
} );

// ---- out-of-flow pieces ----
// A box (the host) holding a text block whose root is absolutely placed: `hostPosition` is the box's draft position,
// `boxPosition` the position the clone's box paints by default; `between` adds an unpositioned block in the middle.
function placedWorld( { hostPosition = 'relative', boxPosition = 'relative', rootPosition = 'absolute', between = false, middle = 'sgs/text' } = {} ) {
	const flat = [ { name: 'sgs/box', attributes: {}, ref: 'n0' } ];
	const nodes = [ { index: 0, name: 'sgs/box', parent: null, node: flat[ 0 ], children: [ 1 ], targets: [ { id: '0:', index: 0, slot: '', finder: 'a' } ] } ];
	let parent = 0;
	if ( between ) {
		flat.push( { name: middle, attributes: {}, ref: 'nm' } );
		nodes.push( { index: 1, name: middle, parent: 0, node: flat[ 1 ], children: [ 2 ], targets: [ { id: '1:', index: 1, slot: '', finder: 'm' } ] } );
		nodes[ 0 ].children = [ 1 ];
		parent = 1;
	}
	const at = nodes.length;
	flat.push( { name: 'sgs/text', attributes: {}, ref: 'nt' } );
	nodes.push( { index: at, name: 'sgs/text', parent, node: flat[ at ], children: [], targets: [ { id: `${ at }:`, index: at, slot: '', finder: 't' } ] } );
	const widths = Object.fromEntries( W.map( ( w ) => [ w, {
		'0:': read( { position: hostPosition } ),
		...( between ? { '1:': read( { position: 'static' } ) } : {} ),
		[ `${ at }:` ]: read( { position: rootPosition, left: '0px', right: '0px', bottom: '4px' }, 10 ),
	} ] ) );
	const declared = Object.fromEntries( W.map( ( w ) => [ w, { [ `${ at }:` ]: { position: rootPosition, left: '0px', right: '0px', bottom: '4px', top: 'auto' } } ] ) );
	return { flat, nodes, at, reads: { widths, declared, sweep: {} }, refOf: ( n ) => n.ref, boxPosition };
}
const placedRows = ( w, rootPosition = 'absolute' ) => [
	[ 'position', rootPosition ], [ 'left', '0px' ], [ 'right', '0px' ], [ 'bottom', '4px' ],
].map( ( [ property, value ] ) => ( { node: 'nt', block: 'sgs/text', slot: '', state: null, property, value, reason: gapReason( 'sgs/text', property ) } ) );
const runPlaced = ( w ) => residualCssWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db, unmapped: placedRows( w ), calFor: ( b ) => ( 'sgs/box' === b ? paintOf( w.boxPosition ) : paintOf( 'static' ) ), snapshot, scope: 'home', date: '2026-11-22' } );

test( 'MUST FAIL: an absolutely placed root inside the positioned block it is placed against gets its position and insets', () => {
	const w = placedWorld();
	const r = runPlaced( w );
	assert.deepEqual( r.refused, [] );
	assert.match( css( w, w.at ), /position: absolute/ );
	assert.match( css( w, w.at ), /bottom: 4px/ );
	assert.match( css( w, w.at ), /left: 0px/ );
	assert.match( css( w, w.at ), /right: 0px/ );
} );

test( 'MUST FAIL: the host may be positioned by a rule the writer wrote on it earlier in the same pass', () => {
	const w = placedWorld( { boxPosition: 'static' } );
	w.flat[ 0 ].attributes.sgsCustomCss = '& { position: relative; }';
	const r = runPlaced( w );
	assert.deepEqual( r.refused, [] );
	assert.match( css( w, w.at ), /position: absolute/ );
} );

test( 'negative controls: no positioned block above, a host the clone does not position, a positioned block in between and sticky stay refused', () => {
	const cases = {
		'the draft has no positioned block above': placedWorld( { hostPosition: 'static', boxPosition: 'static' } ),
		'the draft positions the host and the clone does not': placedWorld( { boxPosition: 'static' } ),
		'the clone positions a host the draft leaves static': placedWorld( { hostPosition: 'static', boxPosition: 'relative' } ),
	};
	for ( const [ why, w ] of Object.entries( cases ) ) {
		const r = runPlaced( w );
		assert.equal( css( w, w.at ), undefined, why );
		assert.deepEqual( r.refused.map( ( x ) => x.property ).sort(), [ 'bottom', 'left', 'position', 'right' ], why );
	}
	const mid = placedWorld( { between: true } );
	const rm = runPlaced( mid );
	assert.match( css( mid, mid.at ) ?? '', /position: absolute/, 'a static block in between, in the draft and the clone, is no obstacle' );
	assert.deepEqual( rm.refused, [] );
	const clonePositioned = placedWorld( { between: true, middle: 'sgs/box' } );
	assert.equal( runPlaced( clonePositioned ).refused.length, 4, 'a block in between that only the clone positions takes the element out of its draft containing block' );
	assert.equal( css( clonePositioned, clonePositioned.at ), undefined );
	const sticky = placedWorld( { rootPosition: 'sticky' } );
	const rs = residualCssWrites( { nodes: sticky.nodes, flat: sticky.flat, refOf: sticky.refOf, reads: sticky.reads, db, unmapped: placedRows( sticky, 'sticky' ), calFor: ( b ) => ( 'sgs/box' === b ? paintOf( 'relative' ) : paintOf( 'static' ) ), snapshot, scope: 'home', date: '2026-11-22' } );
	assert.equal( css( sticky, sticky.at ), undefined );
	assert.equal( rs.refused.length, 4 );
} );

test( 'negative controls: an offset the draft declares that this rule does not write, or declared values that are not read, keep the position refused', () => {
	const held = placedWorld();
	const rows = placedRows( held ).filter( ( x ) => 'right' !== x.property );
	const r = residualCssWrites( { nodes: held.nodes, flat: held.flat, refOf: held.refOf, reads: held.reads, db, unmapped: rows, calFor: ( b ) => ( 'sgs/box' === b ? paintOf( 'relative' ) : paintOf( 'static' ) ), snapshot, scope: 'home', date: '2026-11-22' } );
	assert.equal( css( held, held.at ), undefined );
	assert.match( r.refused.find( ( x ) => 'position' === x.property ).reason, /its right is declared and not written by this rule/ );
	const unread = placedWorld();
	delete unread.reads.declared;
	const ru = runPlaced( unread );
	assert.equal( css( unread, unread.at ), undefined );
	assert.match( ru.refused.find( ( x ) => 'position' === x.property ).reason, /\(not read\)/ );
	const inset = placedWorld();
	W.forEach( ( w ) => ( inset.reads.declared[ w ][ `${ inset.at }:` ] = { inset: '0px' } ) );
	const ri = runPlaced( inset );
	assert.match( ri.refused.find( ( x ) => 'position' === x.property ).reason, /its top is declared and not written/ );
} );

test( 'placementHost names why: unread position, mixed widths and no host', () => {
	const w = placedWorld();
	const args = ( o = {} ) => ( { rec: w.nodes[ w.at ], nodes: w.nodes, flat: w.flat, reads: w.reads, calFor: () => paintOf( 'relative' ), widths: W, ...o } );
	assert.equal( placementHost( args() ).host.index, 0 );
	const unread = placementHost( args( { reads: { widths: Object.fromEntries( W.map( ( x ) => [ x, { '0:': { styles: {} } } ] ) ) } } ) );
	assert.match( unread.why, /not read for its position at every width/ );
	assert.match( placementHost( args( { rec: w.nodes[ 0 ] } ) ).why, /no block above it is positioned/ );
} );

// A position rule on one of the host's parts is not the host root being positioned (lib/fill-placement-host.mjs::cssPositions).
test( 'MUST FAIL: a position rule on a part of the host does not position the host root', () => {
	const w = placedWorld( { boxPosition: 'static' } );
	const args = () => ( { rec: w.nodes[ w.at ], nodes: w.nodes, flat: w.flat, reads: w.reads, calFor: () => paintOf( 'static' ), widths: W } );
	w.flat[ 0 ].attributes.sgsCustomCss = '.sgs-box__media { position: relative; }';
	assert.match( placementHost( args() ).why, /does not position it/, 'a part rule leaves the root static in the clone' );
	w.flat[ 0 ].attributes.sgsCustomCss = '& .sgs-box__media { position: relative; } &:hover { position: relative; }';
	assert.match( placementHost( args() ).why, /does not position it/ );
} );

test( 'negative controls: a root rule, a bare declaration and a grouped selector holding the root still position it; one inside @media does not', () => {
	const w = placedWorld( { boxPosition: 'static' } );
	const args = () => ( { rec: w.nodes[ w.at ], nodes: w.nodes, flat: w.flat, reads: w.reads, calFor: () => paintOf( 'static' ), widths: W } );
	for ( const css of [ '& { position: relative; }', '& { color: red; position: relative; } .x { top: 0; }', '.x { top: 0; } &, .y { position: relative; }', 'position: relative;' ] ) {
		w.flat[ 0 ].attributes.sgsCustomCss = css;
		assert.equal( placementHost( args() ).host?.index, 0, css );
	}
	w.flat[ 0 ].attributes.sgsCustomCss = '@media (min-width: 900px) { & { position: relative; } }';
	assert.ok( placementHost( args() ).why );
} );

// A block between the element and its host that has no read of its own is still checked against the clone's position
// (lib/fill-placement-host.mjs::placementHost).
test( 'MUST FAIL: a block between the element and its host with no read of its own that the clone positions is no obstacle-free host', () => {
	const w = placedWorld( { between: true, middle: 'sgs/box' } );
	w.nodes[ 1 ].targets = [];
	const args = ( calFor ) => ( { rec: w.nodes[ w.at ], nodes: w.nodes, flat: w.flat, reads: w.reads, calFor, widths: W } );
	assert.match( placementHost( args( () => paintOf( 'relative' ) ) ).why, /no read of its own and the clone positions it/ );
	w.flat[ 1 ].attributes.sgsCustomCss = '& { position: relative; }';
	assert.match( placementHost( args( ( b ) => paintOf( 'sgs/box' === b ? 'static' : 'relative' ) ) ).why, /no read of its own/, 'its own root rule positions it too' );
} );

test( 'negative control: a block with no read of its own that the clone leaves static does not stop the host above it', () => {
	const w = placedWorld( { between: true, middle: 'sgs/text' } );
	w.nodes[ 1 ].targets = [];
	const calFor = ( b ) => paintOf( 'sgs/box' === b ? 'relative' : 'static' );
	assert.equal( placementHost( { rec: w.nodes[ w.at ], nodes: w.nodes, flat: w.flat, reads: w.reads, calFor, widths: W } ).host?.index, 0 );
} );
