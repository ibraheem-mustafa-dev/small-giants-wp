// The reading-order guard (lib/skeleton-reading-order.mjs): the blocks a header row holds follow the order the draft draws their
// elements in at each width they show at. Mama's header put the navigation after the icons at 1440 and after the compact icons at
// 375 once a merge of two width alternatives dropped the moved block to the tail of the row (2026-11-24). Pure: an inventory
// model and a skeleton tree. Mutation list: tests/skeleton-reading-order.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readingOrderProblems, before } from '../lib/skeleton-reading-order.mjs';
import { inventoryModel } from '../lib/skeleton-model.mjs';

const ROW = 'sgs/site-header-row';
const el = ( key, parentKey, shown ) => ( {
	key, parentKey, depth: parentKey ? 1 : 0, tag: 'div', words: '',
	visible: { 375: shown.includes( 375 ), 768: shown.includes( 768 ), 1440: shown.includes( 1440 ) },
	box: Object.fromEntries( Object.entries( shown.box || {} ).map( ( [ w, b ] ) => [ w, b ] ) ),
} );
// A header bar drawn as two alternatives, each child at its own x on one row: the compact bar (burger, logo, icons) at 375 and
// 768, the desktop bar (logo, nav, icons) at 1440.
function world() {
	const at = ( key, parent, widths, x ) => {
		const e = el( key, parent, widths );
		e.box = Object.fromEntries( widths.map( ( w ) => [ w, { x, y: 40, w: 100, h: 48 } ] ) );
		return e;
	};
	const els = [
		el( 'root', null, [ 375, 768, 1440 ] ),
		at( 'burger', 'root', [ 375, 768 ], 0 ), at( 'logoM', 'root', [ 375, 768 ], 120 ), at( 'iconsM', 'root', [ 375, 768 ], 240 ),
		at( 'logoD', 'root', [ 1440 ], 0 ), at( 'nav', 'root', [ 1440 ], 200 ), at( 'iconsD', 'root', [ 1440 ], 600 ),
	];
	// A stale box at a width the element is hidden at must never count.
	els.find( ( e ) => 'logoD' === e.key ).box[ 375 ] = { x: 500, y: 40, w: 100, h: 48 };
	return inventoryModel( { elements: els } );
}
const node = ( key, innerBlocks = [] ) => ( { name: 'sgs/container', draftRef: { tpl: key }, attributes: {}, innerBlocks } );
const tree = ( kids ) => [ { name: 'sgs/site-header', attributes: {}, innerBlocks: [ { name: ROW, attributes: { rowSlot: 'middle' }, innerBlocks: kids } ] } ];

test( 'MUST FAIL: a block that follows one the draft draws after it, at a width both show at, is a problem naming both', () => {
	const m = world();
	// The menu (drawn as the burger at 375 and 768 and the nav at 1440) at the tail: after the desktop and compact icons.
	const tail = readingOrderProblems( { skeleton: tree( [ node( 'logoD' ), node( 'iconsD' ), node( 'logoM' ), node( 'iconsM' ), node( 'nav' ) ] ), m, rows: [ ROW ] } );
	assert.equal( tail.length, 1, tail.join( ' | ' ) );
	assert.match( tail[ 0 ], /reading order at 1440px in sgs\/site-header-row: nav follows iconsD/ );
	const ordered = readingOrderProblems( { skeleton: tree( [ node( 'logoD' ), node( 'nav' ), node( 'iconsD' ), node( 'burger' ), node( 'logoM' ), node( 'iconsM' ) ] ), m, rows: [ ROW ] } );
	assert.deepEqual( ordered, [], 'logo, nav, icons at 1440 and burger, logo, icons at 375 and 768' );
} );

test( 'a compact bar listed ahead of the desktop bar is wrong at its own widths only', () => {
	const m = world();
	const r = readingOrderProblems( { skeleton: tree( [ node( 'logoM' ), node( 'burger' ), node( 'iconsM' ), node( 'logoD' ), node( 'nav' ), node( 'iconsD' ) ] ), m, rows: [ ROW ] } );
	assert.deepEqual( r.map( ( p ) => /at (\d+)px/.exec( p )[ 1 ] ), [ '375', '768' ], 'the compact order is wrong, the desktop order is right' );
} );

test( 'negative control: a list that is not a header row, a block with no draft element and a block hidden at the width are not checked', () => {
	const m = world();
	const wrong = [ node( 'iconsD' ), node( 'nav' ), node( 'logoD' ) ];
	assert.deepEqual( readingOrderProblems( { skeleton: tree( wrong ), m, rows: [] } ), [], 'no row block named: nothing is checked' );
	assert.deepEqual( readingOrderProblems( { skeleton: tree( [ { name: 'sgs/text', attributes: {}, innerBlocks: [] }, node( 'nav' ), node( 'logoD' ) ] ), m, rows: [ ROW ] } ).length, 1, 'a block with no draft element is skipped, the other two are checked' );
	assert.deepEqual( readingOrderProblems( { skeleton: tree( [ node( 'iconsD' ), node( 'logoM' ) ] ), m, rows: [ ROW ] } ), [], 'the two are never shown at one width' );
} );

test( 'before: above, or left of on one row; overlapping boxes claim no order', () => {
	const box = ( x, y, w = 50, h = 20 ) => ( { x, y, w, h } );
	assert.equal( before( box( 0, 0 ), box( 0, 100 ) ), true );
	assert.equal( before( box( 0, 100 ), box( 0, 0 ) ), false );
	assert.equal( before( box( 0, 0 ), box( 100, 5 ) ), true );
	assert.equal( before( box( 100, 5 ), box( 0, 0 ) ), false );
	assert.equal( before( box( 0, 0 ), box( 10, 5 ) ), null );
} );
