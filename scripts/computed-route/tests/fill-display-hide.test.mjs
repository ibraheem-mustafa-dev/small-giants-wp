// A declared hide (display:none) stays on the element's own slot: a layout setting calibration discovered on the inner
// element that gives display:none would hide the wrong element, so the discovered layout slots join only for a display
// other than none.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const THREE = [ 375, 768, 1440 ];
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const BASE = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'background-color': 'rgba(0, 0, 0, 0)' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const INNER = '.sgs-container__inner';
const same = ( v ) => Object.fromEntries( THREE.map( ( w ) => [ w, v ] ) );

// A row with no hide toggle at its root and a layout enum, discovered on the inner element, one of whose values paints none.
const cal = () => ( {
	block: 'sgs/site-header-row',
	elements: { '': tiers( BASE ), [ INNER ]: tiers( { ...BASE, display: 'flex' } ) },
	settings: {},
	discovered: { layout: { display: { slots: [ INNER ], state: null, tier: 'flat', values: { grid: same( 'grid' ), hidden: same( 'none' ) } } } },
} );

function fillDisplay( display ) {
	const block = 'sgs/site-header-row';
	const skeleton = [ { name: block, draftRef: 'main', attributes: {} } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'hd' );
	const snap = { styles: { ...BASE, display }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 80 }, inFlow: true, words: '', href: null };
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': snap } ] ) );
	const reads = { widths, declared: Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': { display } } ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => ( b === block ? cal() : null ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { tree, writes: out.writes.filter( ( w ) => 'display' === w.prop ), unmapped: out.unmapped.filter( ( u ) => 'display' === u.property ) };
}

test( 'MUST FAIL: a hide is never written to a layout setting on the inner element', () => {
	const r = fillDisplay( 'none' );
	assert.deepEqual( r.writes, [], JSON.stringify( r.writes ) );
	assert.equal( r.tree[ 0 ].attributes.layout, undefined );
} );

test( 'display:grid still reaches the discovered layout slot', () => {
	const r = fillDisplay( 'grid' );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.slot ] ), [ [ 'layout', INNER ] ] );
} );
