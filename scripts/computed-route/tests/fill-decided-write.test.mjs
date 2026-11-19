// A setting a skeleton rule decided (the node's `decided`) that paints a CSS property cannot be a skeleton attribute (R-47-10,
// lint.mjs::lintSkeleton), so lib/fill-resolve.mjs::fillContent writes it onto the node: a hero whose content block the draft
// anchors to its bottom edge gets verticalAlignment bottom (Eye Care Home, 2026-11-19: the skeleton carrying it as an attribute
// failed the whole Fill). A decided value the node already holds is not written again, and a node with none gets none.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const THREE = [ 375, 768, 1440 ];
const DEFAULT = { display: 'flex', 'flex-direction': 'column', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'line-height': '24px' };
const CAL = { 'sgs/hero': { block: 'sgs/hero', elements: { '': Object.fromEntries( THREE.map( ( w ) => [ w, { ...DEFAULT } ] ) ) }, settings: {}, discovered: {} } };

function run( extra ) {
	const skeleton = [ { name: 'sgs/hero', draftRef: '.a', attributes: {}, ...extra } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const widths = Object.fromEntries( THREE.map( ( w ) => [ w, { '0:': { styles: { ...DEFAULT }, layoutDisplay: 'flex', pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: 'A', href: null } } ] ) );
	return { out: fillTree( { tree, nodes: skeletonNodes( skeleton ), reads: { widths, declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => CAL[ b ] ?? null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } ), tree };
}
const verticalWrites = ( o ) => o.out.writes.filter( ( w ) => 'verticalAlignment' === w.attr );

test( 'MUST FAIL: a decided style setting is written onto the node, as a decided write', () => {
	const r = run( { decided: { verticalAlignment: 'bottom' } } );
	assert.equal( verticalWrites( r ).length, 1 );
	assert.equal( verticalWrites( r )[ 0 ].how, 'decided' );
	assert.equal( JSON.stringify( r.tree ).includes( '"verticalAlignment":"bottom"' ), true, 'the filled tree holds it' );
} );

test( 'negative controls: no decided setting writes nothing, and a value the node already holds is not written again', () => {
	assert.deepEqual( verticalWrites( run( {} ) ), [] );
	const held = run( { attributes: { verticalAlignment: 'bottom' }, decided: { verticalAlignment: 'bottom' } } );
	assert.deepEqual( verticalWrites( held ).filter( ( w ) => 'decided' === w.how ), [] );
} );
