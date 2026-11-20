// A flex-only property (flex-wrap, flex-direction) on a box the calibrated default paint lays out as a block is judged against the
// value the block paints once its layout is flex: the painting setting's own default (lib/fill-resolve-state.mjs::baselineFn).
// The default paint of sgs/container is a block whose flex-wrap computes `nowrap` as the inert initial value; the block's
// flexWrap default is `wrap`, which its flex layout paints. A draft flex row that does not wrap (Eye Care's header right group:
// account icon and bag) read as equal to the inert `nowrap` and nothing was written, so the clone wrapped and stacked the two
// controls at 375px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { baselineFn } from '../lib/fill-resolve-state.mjs';

const db = openDb();
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];
const INNER = '.sgs-container__inner';
const PAINT = { display: 'block', 'flex-wrap': 'nowrap', 'flex-direction': 'row', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'line-height': '24px' };
const calFor = ( paint = PAINT ) => ( {
	block: 'sgs/container',
	elements: { '': Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) ), [ INNER ]: Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) ) },
	settings: {
		flexWrap: { slot: INNER, slots: [ INNER ], property: 'flex-wrap', state: null, reachedAt: THREE, effects: [] },
		flexDirection: { slot: INNER, slots: [ INNER ], property: 'flex-direction', state: null, reachedAt: THREE, effects: [] },
	},
	discovered: {},
} );

function run( styles, cal = calFor() ) {
	const skeleton = [ { name: 'sgs/container', draftRef: '.a', attributes: { layout: 'flex' } } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const draft = { ...PAINT, display: 'flex', ...styles };
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': { styles: draft, layoutDisplay: 'flex', pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: 'A', href: null } } ] ) );
	return fillTree( { tree, nodes: skeletonNodes( skeleton ), reads: { widths, declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: () => cal, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
}
const valueOf = ( out, attr ) => out.writes.find( ( w ) => w.attr === attr );

test( 'MUST FAIL: a draft flex row that does not wrap writes flexWrap nowrap (the block default wraps)', () => {
	const out = run( { 'flex-wrap': 'nowrap' } );
	assert.ok( out.writes.some( ( w ) => 'flexWrap' === w.attr ), 'flexWrap is written' );
	assert.match( JSON.stringify( valueOf( out, 'flexWrap' ) ), /nowrap/ );
} );

test( 'negative control: a draft flex row that wraps matches the block default and writes nothing', () => {
	const out = run( { 'flex-wrap': 'wrap' } );
	assert.ok( ! out.writes.some( ( w ) => 'flexWrap' === w.attr ) );
} );

test( 'negative control: the default paint that already lays out as flex keeps its measured flex-wrap', () => {
	const cal = calFor( { ...PAINT, display: 'flex', 'flex-wrap': 'nowrap' } );
	const st = { page: () => ( { own: () => false, value: () => undefined } ), flat: [ { attributes: {} } ], nodes: [ { index: 0, parent: null, name: 'sgs/container' } ], db, fixtures: null };
	assert.equal( baselineFn( st, st.nodes[ 0 ], cal, 'flex-wrap' )( '', 1440 ), 'nowrap' );
	assert.equal( baselineFn( st, st.nodes[ 0 ], calFor(), 'flex-wrap' )( '', 1440 ), 'wrap', 'a block default paint: the setting\'s default' );
	assert.equal( baselineFn( st, st.nodes[ 0 ], calFor(), 'flex-direction' )( '', 1440 ), 'row' );
	assert.equal( baselineFn( st, st.nodes[ 0 ], calFor(), 'color' )( '', 1440 ), 'rgb(20, 20, 20)', 'another property keeps the calibrated paint' );
} );

test( 'a tier object default is read at the width\'s tier, and an element with no calibrated display keeps the calibrated paint', () => {
	const st = { page: () => ( { own: () => false, value: () => undefined } ), flat: [ { attributes: {} } ], nodes: [ { index: 0, parent: null, name: 'sgs/multi-button' } ], db, fixtures: null };
	const cal = { elements: { '': Object.fromEntries( THREE.map( ( w ) => [ w, { ...PAINT } ] ) ) }, settings: {} };
	const at = ( w ) => baselineFn( st, st.nodes[ 0 ], cal, 'flex-direction' )( '', w );
	assert.equal( at( 375 ), 'column', 'mobile tier' );
	assert.equal( at( 1440 ), 'row', 'desktop tier' );
	assert.equal( at( 768 ), 'row', 'a tier the default leaves out follows desktop' );
	const bare = { elements: { '': Object.fromEntries( THREE.map( ( w ) => [ w, { 'flex-direction': 'row' } ] ) ) }, settings: {} };
	assert.equal( baselineFn( st, st.nodes[ 0 ], bare, 'flex-direction' )( '', 375 ), 'row', 'no display measured: the calibrated value stands' );
} );
