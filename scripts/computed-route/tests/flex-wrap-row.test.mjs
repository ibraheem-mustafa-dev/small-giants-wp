// A row's flex-wrap (Track F decision 3: flexWrap on sgs/social-icons, css_property flex-wrap on its wrapper) goes
// through the framework DB like any setting once calibration measures it: the draft's `nowrap` over a block that wraps
// is written, a draft that wraps as the block does writes nothing, and neither is a no-setting row.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb, attrRow } from '../lib/db.mjs';

const db = openDb();
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];
const BASE = { display: 'flex', 'flex-direction': 'row', 'flex-wrap': 'wrap', 'align-items': 'center', 'column-gap': '8px', 'row-gap': '8px', gap: '8px' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const setting = ( property ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ] } );
const snap = ( styles ) => ( { styles: { ...BASE, ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 160, h: 36 }, inFlow: true, words: '', href: null, layoutDisplay: 'flex' } );
const run = ( wrap, settings = { flexWrap: setting( 'flex-wrap' ) } ) => {
	const skeleton = [ { name: 'sgs/social-icons', draftRef: '.s', attributes: {} } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const reads = { widths: Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': snap( { 'flex-wrap': wrap } ) } ] ) ), declared: Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': { 'flex-wrap': wrap } } ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' };
	const cal = { block: 'sgs/social-icons', elements: { '': tiers( BASE ) }, settings, discovered: {} };
	const r = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: { settings: { custom: {} } }, calFor: () => cal, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { attrs: tree[ 0 ].attributes, rows: r.unmapped.filter( ( u ) => 'flex-wrap' === u.property ) };
};

test( 'MUST FAIL: the draft\'s nowrap over a block that wraps is written to flexWrap, with no row left', () => {
	assert.equal( attrRow( db, 'sgs/social-icons', 'flexWrap' )?.css_property, 'flex-wrap', 'the framework DB routes flex-wrap on sgs/social-icons' );
	const r = run( 'nowrap' );
	assert.equal( r.attrs.flexWrap, 'nowrap' );
	assert.deepEqual( r.rows, [] );
} );

test( 'a draft that wraps as the block does writes nothing; before calibration measures flexWrap the row is a no-setting row naming it', () => {
	const same = run( 'wrap' );
	assert.equal( same.attrs.flexWrap, undefined );
	assert.deepEqual( same.rows, [] );
	const unmeasured = run( 'nowrap', {} );
	assert.equal( unmeasured.attrs.flexWrap, undefined );
	assert.match( unmeasured.rows[ 0 ]?.reason ?? '', /^no-setting: .*candidates: flexWrap/ );
} );
