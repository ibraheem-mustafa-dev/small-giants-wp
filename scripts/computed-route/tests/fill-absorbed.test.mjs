// A wrapper the block absorbed (lib/skeleton-absorb-wrapper.mjs) pads inside the block's own element in the draft, and the
// block has one padding setting, painted at the part the wrapper stands for: the part's padding is the two summed per side
// (lib/fill-absorbed.mjs::sumAbsorbedPadding; Bean, 2026-11-21). A section of `padding: 38px 0` holding only a wrapper of
// `padding: 0 40px` is one container with 38px above and below and 40px at the sides; where both pad a side, the values add.
// Fill runs on the block's real calibration (cache/container.json, read for indus-test, gitignored): a worktree without it skips
// these tests and says why. No site, no browser.
// Mutation list: tests/fill-absorbed.mutations.json.
import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { loadCalibration } from '../lib/cache.mjs';
import { sumAbsorbedPadding, absorbedParts } from '../lib/fill-absorbed.mjs';

const db = openDb();
const INNER = '.sgs-container__inner';
const CAL = { 'sgs/container': loadCalibration( new URL( '../cache', import.meta.url ).pathname.replace( /^\/([A-Za-z]:)/, '$1' ), 'sgs/container', 'indus-test' ) };
const NO_CAL = ! CAL[ 'sgs/container' ] ? 'no sgs/container slot map in cache/' : CAL[ 'sgs/container' ].paintMissing ?? null;
const test = NO_CAL ? ( name, fn ) => nodeTest( name, { skip: `needs the indus-test calibration of sgs/container in cache/ (gitignored; run calibrate.mjs): ${ NO_CAL }` }, fn ) : nodeTest;
const WIDTHS = [ 375, 768, 1440, 1024, 1920 ];
const BOX = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'line-height': '24px' };
const style = ( p ) => ( { ...BOX, 'padding-top': `${ p[ 0 ] }px`, 'padding-right': `${ p[ 1 ] }px`, 'padding-bottom': `${ p[ 2 ] }px`, 'padding-left': `${ p[ 3 ] }px` } );
const el = ( styles, rect = { x: 0, y: 0, w: 1000, h: 100 } ) => ( { styles, pseudo: {}, rect, inFlow: true, words: '', href: null } );

// main > section (its own padding `sec`) > text; the section's content band read at the absorbed wrapper (its padding `wrap`).
function setup( { sec, wrap, absorbed = true } ) {
	const section = { name: 'sgs/container', draftRef: '.sec', draftSlots: { [ INNER ]: '.wrap' }, ...( absorbed ? { draftAbsorbed: [ INNER ] } : {} ), attributes: { tagName: 'section' }, innerBlocks: [ { name: 'sgs/text', draftRef: '.p', attributes: { content: 'x' }, innerBlocks: [] } ] };
	const sk = [ { name: 'sgs/container', draftRef: '.main', attributes: { tagName: 'main', contentWidth: { desktop: 'full' } }, innerBlocks: [ section ] } ];
	const widths = Object.fromEntries( WIDTHS.map( ( w ) => [ w, { '0:': el( style( [ 0, 0, 0, 0 ] ) ), '1:': el( style( sec ) ), [ `1:${ INNER }` ]: el( style( wrap ) ), '2:': el( style( [ 0, 0, 0, 0 ] ), { x: 40, y: 38, w: 920, h: 24 } ) } ] ) );
	return { sk, nodes: skeletonNodes( sk ), reads: { widths, declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' } };
}
function fill( o ) {
	const { sk, nodes, reads } = setup( o );
	const lines = sumAbsorbedPadding( reads, nodes );
	const tree = cleanTree( sk );
	addRefs( tree, 'fx' );
	const out = fillTree( { tree, nodes, reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: { settings: { custom: {} } }, calFor: ( b ) => CAL[ b ] ?? null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	const padding = tree[ 0 ].innerBlocks[ 0 ].attributes.padding;
	const asked = out.unmapped.filter( ( x ) => /^padding/.test( x.property ?? '' ) && x.node.endsWith( '-1' ) ).map( ( x ) => x.property ).sort();
	return { padding, asked, lines, reads };
}
// The padding a written setting holds on one side, at the tier that carries it (one value for every tier sits on desktop).
const side = ( padding, s ) => padding?.desktop?.[ s ] ?? padding?.[ s ];

test( 'MUST FAIL: the section\'s own padding and the absorbed wrapper\'s are written as one padding setting holding both', () => {
	const { padding, asked, lines } = fill( { sec: [ 38, 0, 38, 0 ], wrap: [ 0, 40, 0, 40 ] } );
	assert.deepEqual( [ 'top', 'right', 'bottom', 'left' ].map( ( s ) => side( padding, s ) ), [ '38px', '40px', '38px', '40px' ] );
	assert.deepEqual( asked, [], 'no padding row is left to ask of another setting (nothing writes a side twice)' );
	assert.equal( lines.length, 4 );
} );

test( 'MUST FAIL: where both pad the same side the values add, as the draft renders them nested', () => {
	const { padding, asked } = fill( { sec: [ 38, 10, 38, 10 ], wrap: [ 12, 40, 0, 40 ] } );
	assert.deepEqual( [ 'top', 'right', 'bottom', 'left' ].map( ( s ) => side( padding, s ) ), [ '50px', '50px', '38px', '50px' ] );
	assert.deepEqual( asked, [] );
} );

test( 'negative control: a part read at an element that is not an absorbed wrapper is read as before (the root\'s padding is its own)', () => {
	const { padding, asked, lines } = fill( { sec: [ 38, 0, 38, 0 ], wrap: [ 0, 40, 0, 40 ], absorbed: false } );
	assert.deepEqual( lines, [] );
	assert.equal( side( padding, 'top' ), undefined, 'the root\'s top is not moved onto the band' );
	assert.deepEqual( asked, [ 'padding-bottom', 'padding-top' ] );
} );

test( 'negative control: a side neither pads stays as the root reads it (the gutter judges a section\'s zero there)', () => {
	const { reads, nodes } = setup( { sec: [ 0, 0, 0, 0 ], wrap: [ 20, 0, 20, 0 ] } );
	const got = sumAbsorbedPadding( reads, nodes );
	assert.deepEqual( got.map( ( l ) => /padding-\w+/.exec( l )[ 0 ] ), [ 'padding-top', 'padding-bottom' ] );
	assert.equal( reads.widths[ 1440 ][ '1:' ].styles[ 'padding-left' ], '0px', 'the root keeps its zero side' );
	assert.equal( reads.widths[ 1440 ][ '1:' ].styles[ 'padding-top' ], undefined, 'the summed side leaves the root' );
	assert.equal( reads.widths[ 1440 ][ `1:${ INNER }` ].styles[ 'padding-top' ], '20px' );
} );

nodeTest( 'sumAbsorbedPadding sums the sweep, drops a declared form of a summed side, and reads only a node that lists the part', () => {
	const nodes = [ { index: 0, node: { draftAbsorbed: [ '.in' ] }, targets: [ { slot: '' }, { slot: '.in' } ] }, { index: 1, node: { draftAbsorbed: [ '.gone' ] }, targets: [ { slot: '' } ] } ];
	assert.deepEqual( absorbedParts( nodes ), [ { index: 0, rootId: '0:', partId: '0:.in', slot: '.in' } ], 'a part with no target is no part' );
	const reads = {
		widths: { 375: { '0:': { styles: { 'padding-left': '10px' } }, '0:.in': { styles: { 'padding-left': '16px' } } }, 1440: { '0:': { styles: { 'padding-left': '20px' } }, '0:.in': { styles: { 'padding-left': '40px' } } } },
		declared: { 375: { '0:': { 'padding-left': '10px', padding: '0 10px' }, '0:.in': { 'padding-left': 'clamp(16px, 3vw, 40px)' } }, 1440: { '0:': { 'padding-left': '20px' }, '0:.in': { 'padding-left': 'clamp(16px, 3vw, 40px)' } } },
		sweep: { '0:': { 'padding-left': [ { width: 320, value: '10px' }, { width: 1440, value: '20px' } ] }, '0:.in': { 'padding-left': [ { width: 320, value: '16px' }, { width: 1440, value: '40px' } ] } },
	};
	sumAbsorbedPadding( reads, nodes );
	assert.equal( reads.widths[ 375 ][ '0:.in' ].styles[ 'padding-left' ], '26px' );
	assert.equal( reads.widths[ 1440 ][ '0:.in' ].styles[ 'padding-left' ], '60px' );
	assert.equal( reads.widths[ 1440 ][ '0:' ].styles[ 'padding-left' ], undefined );
	assert.deepEqual( reads.sweep[ '0:.in' ][ 'padding-left' ].map( ( s ) => s.value ), [ '26px', '60px' ] );
	assert.equal( reads.sweep[ '0:' ][ 'padding-left' ], undefined );
	assert.equal( reads.declared[ 375 ][ '0:.in' ][ 'padding-left' ], undefined, 'the sum is no value the code declares' );
	assert.equal( reads.declared[ 375 ][ '0:' ].padding, undefined );
	assert.equal( reads.declared[ 375 ][ '0:' ][ 'padding-left' ], undefined );
} );
