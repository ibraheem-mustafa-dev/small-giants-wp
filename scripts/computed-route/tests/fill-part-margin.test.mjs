// A margin the draft states on a block's part only at some widths (lib/fill-part-margin.mjs): where the part is the only visible
// element the block draws at a width, its margin is the block's own margin there, written at the devices the draft states it at.
// The Eye Care header's phone menu: the burger button is shifted 8px left at 375 and 768 and the desktop link bar (the block's
// root element in the draft) is hidden at those widths, while at 1440 the bar shows and the burger is hidden. The generic
// resolver finds no setting that paints a margin on the burger part, and the residual pass refuses a layout property the draft
// states at some widths only. The framework DB rows are the real ones; the calibration is the block's measured paint, reduced
// to the root's margin setting. Contacts no site (tools/run-tests.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { partMarginWrites, soleWidths } from '../lib/fill-part-margin.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const W = [ 375, 768, 1440 ];
const BLOCK = 'sgs/nav-bar-menu';
const BURGER = '.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger';
const BAR = '.sgs-nav-bar-menu__bar';
const perW = ( v ) => Object.fromEntries( W.map( ( w ) => [ w, { ...v } ] ) );
const CAL = {
	block: BLOCK,
	elements: { '': perW( { display: 'block', 'margin-top': '0px', 'margin-right': '0px', 'margin-bottom': '0px', 'margin-left': '0px' } ), [ BURGER ]: perW( { 'margin-left': '0px' } ) },
	settings: { margin: { slot: '', slots: [ '' ], property: 'margin', state: null, forms: [], transform: null, reachedAt: W, effects: [] } },
	discovered: {},
};
const SNAP = { palette: [], spacing: [], fontSizes: [] };
const SHOWN = { rect: { x: 0, y: 0, w: 40, h: 40 }, inFlow: true, styles: {} };
const HIDDEN = { missing: true };

// One nav-bar-menu node (index 0) with its root, bar and burger targets, and `kids` child blocks; `at` says which of the three the draft shows per width.
function world( { burger = [ 375, 768 ], root = [ 1440 ], bar = [ 1440 ], kids = [], attrs = {} } = {} ) {
	const flat = [ { name: BLOCK, attributes: { ...attrs }, ref: 'n0' }, ...kids.map( () => ( { name: 'sgs/button', attributes: {}, ref: 'k' } ) ) ];
	const targets = [ { id: '0:', index: 0, slot: '', finder: 'r' }, { id: '0:bar', index: 0, slot: BAR, finder: 'b' }, { id: '0:burger', index: 0, slot: BURGER, finder: 'g' } ];
	const nodes = flat.map( ( n, index ) => ( { index, name: n.name, parent: index ? 0 : null, node: n, children: index ? [] : kids.map( ( _, i ) => i + 1 ), targets: index ? [ { id: `${ index }:`, index, slot: '', finder: 'k' } ] : targets } ) );
	const widths = Object.fromEntries( W.map( ( w ) => [ w, {
		'0:': root.includes( w ) ? SHOWN : HIDDEN,
		'0:bar': bar.includes( w ) ? SHOWN : HIDDEN,
		'0:burger': burger.includes( w ) ? SHOWN : HIDDEN,
		...Object.fromEntries( kids.map( ( shownAt, i ) => [ `${ i + 1 }:`, shownAt.includes( w ) ? SHOWN : HIDDEN ] ) ),
	} ] ) );
	return { flat, nodes, reads: { widths }, refOf: ( n ) => n.ref };
}
const row = ( o = {} ) => ( { node: 'n0', block: BLOCK, slot: BURGER, property: 'margin-left', value: '-8px', state: null, reason: `no-setting: no margin-left setting on ${ BLOCK } paints "${ BURGER }" (candidates: margin, itemBadgeGap)`, ...o } );
const run = ( w, rows ) => partMarginWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db, unmapped: rows, calFor: () => CAL, snapshot: SNAP } );

test( 'MUST FAIL: the burger the draft shifts 8px left at 375 and 768, alone in its block there, is the block\'s own margin at the phone and tablet devices', () => {
	const w = world();
	const r = run( w, [ row() ] );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( r.writes.map( ( x ) => [ x.attr, x.how ] ), [ [ 'margin', 'part-margin' ] ] );
	const m = w.flat[ 0 ].attributes.margin;
	assert.equal( m.tablet?.left, '-8px', 'the tablet value covers the phone: an empty mobile tier shows the tablet value' );
	assert.equal( m.mobile, undefined );
	assert.equal( m.desktop?.left, undefined, 'the desktop, where the burger is hidden, takes no margin' );
	assert.deepEqual( r.answered.map( ( a ) => [ a.property, a.widths ] ), [ [ 'margin-left', [ 375, 768 ] ] ] );
} );

test( 'negative control: a margin the draft states at every read width is left for the residual pass', () => {
	const w = world( { burger: [ 375, 768, 1440 ], root: [], bar: [] } );
	const r = run( w, [ row() ] );
	assert.equal( r.unmapped.length, 1 );
	assert.deepEqual( r.writes, [] );
	assert.equal( w.flat[ 0 ].attributes.margin, undefined );
} );

test( 'negative control: a part beside another visible element of the block, or a visible child block, is not the block\'s only element, so its margin is not the block\'s', () => {
	const beside = world( { bar: [ 375, 1440 ] } );
	assert.deepEqual( soleWidths( beside, beside.nodes[ 0 ], beside.nodes[ 0 ].targets[ 2 ] ), [ 768 ] );
	assert.equal( run( beside, [ row() ] ).unmapped.length, 1 );
	assert.match( run( beside, [ row() ] ).unmapped[ 0 ].reason, /part-margin: the part is not the block's only visible element at 375/ );
	assert.equal( beside.flat[ 0 ].attributes.margin, undefined );
	const child = world( { kids: [ [ 768 ] ] } );
	assert.deepEqual( soleWidths( child, child.nodes[ 0 ], child.nodes[ 0 ].targets[ 2 ] ), [ 375 ] );
	assert.equal( run( child, [ row() ] ).unmapped.length, 1 );
} );

test( 'negative controls: a state row, a root row and a property other than a side margin are not this pass\'s', () => {
	const w = world();
	const rows = [ row( { state: 'hover' } ), row( { slot: '' } ), row( { property: 'padding-left' } ), row( { reason: 'shape: x' } ) ];
	const r = run( w, rows );
	assert.equal( r.unmapped.length, 4 );
	assert.deepEqual( r.writes, [] );
} );

test( 'a block with no margin setting of its own leaves the row, saying why', () => {
	const w = world();
	const r = partMarginWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db, unmapped: [ row() ], calFor: () => ( { ...CAL, settings: {} } ), snapshot: SNAP } );
	assert.equal( r.unmapped.length, 1 );
	assert.match( r.unmapped[ 0 ].reason, /part-margin: the part is the block's only visible element at 375, 768/ );
	assert.deepEqual( r.writes, [] );
} );

// In the draft the block's root element (a nav) holds the burger and hides its links on the phone: it is shown, and is exactly the
// burger's margin box (the burger sits 8px left of it by its -8px margin). A root that shows more than the burger is not.
test( 'MUST FAIL: a root element that is exactly the margin box of the part is the same box, not another visible element, so the burger inside it is still alone', () => {
	const w = world( { root: [ 375, 768 ], bar: [ 375, 768 ] } );
	W.slice( 0, 2 ).forEach( ( x ) => {
		w.reads.widths[ x ][ '0:burger' ] = { ...SHOWN, rect: { x: 8, y: 20, w: 63, h: 44 } };
		w.reads.widths[ x ][ '0:' ] = { ...SHOWN, rect: { x: 16, y: 20, w: 55, h: 44 } };
		w.reads.widths[ x ][ '0:bar' ] = { ...SHOWN, rect: { x: 16, y: 20, w: 55, h: 44 } };
	} );
	assert.deepEqual( soleWidths( w, w.nodes[ 0 ], w.nodes[ 0 ].targets[ 2 ], { side: 'margin-left', px: { 375: -8, 768: -8, 1440: 0 } } ), [ 375, 768 ] );
	const r = run( w, [ row() ] );
	assert.deepEqual( r.unmapped, [] );
	assert.equal( w.flat[ 0 ].attributes.margin.tablet.left, '-8px' );
} );

// The same nav is a grid item in the draft (1fr auto 1fr): its track is wider than the burger's margin box (73px at 375, 272px at
// 768, from the real draft read), but it starts where the margin box starts, so nothing precedes the burger and the nav's own
// margin shifts the burger and all that follows exactly as the burger's does.
test( 'MUST FAIL: a root element stretched wider than the part’s margin box (a grid track) that starts where the margin box starts is the same box, so the burger is still alone', () => {
	const w = world( { root: [ 375, 768 ], bar: [ 375, 768 ] } );
	const real = { 375: { burger: { x: 16, y: 50.8, w: 38, h: 44 }, root: { x: 24, y: 50.8, w: 73, h: 44 } }, 768: { burger: { x: 16, y: 50.8, w: 83.5, h: 44 }, root: { x: 24, y: 50.8, w: 272, h: 44 } } };
	W.slice( 0, 2 ).forEach( ( x ) => {
		w.reads.widths[ x ][ '0:burger' ] = { ...SHOWN, rect: real[ x ].burger };
		w.reads.widths[ x ][ '0:' ] = { ...SHOWN, rect: real[ x ].root };
		w.reads.widths[ x ][ '0:bar' ] = { ...SHOWN, rect: real[ x ].root };
	} );
	const margin = { side: 'margin-left', px: { 375: -8, 768: -8, 1440: 0 } };
	assert.deepEqual( soleWidths( w, w.nodes[ 0 ], w.nodes[ 0 ].targets[ 2 ], margin ), [ 375, 768 ] );
	const r = run( w, [ row() ] );
	assert.deepEqual( r.unmapped, [] );
	assert.equal( w.flat[ 0 ].attributes.margin.tablet.left, '-8px' );
} );

test( 'negative controls: a root that does not start where the part’s margin box starts (something precedes the part), does not hold it, or is shifted across it keeps the row', () => {
	const make = ( root ) => {
		const w = world( { root: [ 375, 768 ], bar: [ 375, 768 ] } );
		W.slice( 0, 2 ).forEach( ( x ) => {
			w.reads.widths[ x ][ '0:burger' ] = { ...SHOWN, rect: { x: 8, y: 20, w: 63, h: 44 } };
			w.reads.widths[ x ][ '0:' ] = { ...SHOWN, rect: root };
			w.reads.widths[ x ][ '0:bar' ] = { ...SHOWN, rect: root };
		} );
		return w;
	};
	const margin = { side: 'margin-left', px: { 375: -8, 768: -8, 1440: 0 } };
	// The margin box is x 16 to 71 (the burger's x 8 less its -8px margin to its right edge 71).
	for ( const [ why, root ] of [ [ 'starts before the margin box: another element precedes the part', { x: 0, y: 20, w: 300, h: 44 } ], [ 'ends inside the part', { x: 16, y: 20, w: 30, h: 44 } ], [ 'sits above the part', { x: 16, y: 0, w: 300, h: 10 } ] ] ) {
		const w = make( root );
		assert.deepEqual( soleWidths( w, w.nodes[ 0 ], w.nodes[ 0 ].targets[ 2 ], margin ), [], why );
		assert.equal( run( w, [ row() ] ).unmapped.length, 1, why );
	}
	// A margin on the trailing side is held by a root that ends where the margin box ends, not by one that starts there.
	const w = make( { x: 16, y: 20, w: 300, h: 44 } );
	assert.deepEqual( soleWidths( w, w.nodes[ 0 ], w.nodes[ 0 ].targets[ 2 ], { side: 'margin-right', px: { 375: -8, 768: -8, 1440: 0 } } ), [], 'a leading-edge root does not hold a trailing margin' );
} );
