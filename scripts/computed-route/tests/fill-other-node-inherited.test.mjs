// Spec 48 R-47-5 and part pairing ("the draft side is the node's own subtree, stopping at the elements of other nodes"):
// an inherited value (font, size, case, tracking, colour) read on a part slot whose draft element is another node's own
// element is that node's look, never the block's. The case: Eye Care's Help page, whose root container was paired with its
// kicker's element (`sgs/label`) and took the kicker's uppercase, which every descendant then inherited. Run through
// fillTree on the real framework DB with a calibration shaped like sgs/container's (text settings on the wrapper, reaching
// the fixture's inner paragraphs by inheritance).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const THREE = [ 375, 768, 1440 ];
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const INNER = '.sgs-container__inner';
const P1 = `${ INNER } > p:nth-of-type(1)`;
const BASE = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'text-transform': 'none', 'background-color': 'rgba(0, 0, 0, 0)' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const reach = ( property ) => ( { slot: '', slots: [ '' ], reaches: [ '', INNER, P1 ], property, state: null, forms: [], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ] } );
const CAL = {
	block: 'sgs/container',
	elements: { '': tiers( BASE ), [ INNER ]: tiers( BASE ), [ P1 ]: tiers( BASE ) },
	settings: { textTransform: reach( 'text-transform' ) },
	discovered: {},
};

// A container (root element `rootStyles`) with one part slot at P1 read from `slotFinder`, holding a label built from the
// element { tpl: 'K' }.
function fill( { rootStyles = {}, slotStyles = { 'text-transform': 'uppercase' }, slotFinder = { tpl: 'K' } } = {} ) {
	const skeleton = [ { name: 'sgs/container', draftRef: { tpl: 'A' }, draftSlots: { [ P1 ]: slotFinder }, attributes: {}, innerBlocks: [ { name: 'sgs/label', draftRef: { tpl: 'K' }, attributes: {} } ] } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'on' );
	const snap = ( styles ) => ( { styles: { ...BASE, ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: 'Help', href: null } );
	const at = { '0:': snap( rootStyles ), [ `0:${ P1 }` ]: snap( slotStyles ), '1:': snap( { 'text-transform': 'uppercase' } ) };
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, at ] ) );
	const reads = { widths, declared: Object.fromEntries( FIVE.map( ( w ) => [ w, {} ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => ( 'sgs/container' === b ? CAL : null ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { tree, ...out };
}

test( 'MUST FAIL: a kicker\'s uppercase read on the slot paired with the kicker\'s own element is never written on the container', () => {
	const r = fill();
	assert.equal( r.tree[ 0 ].attributes.textTransform, undefined, JSON.stringify( r.writes ) );
	const row = [ ...( r.settled || [] ), ...r.alreadyHeld, ...r.unmapped ].find( ( u ) => 'text-transform' === u.property && P1 === u.slot );
	assert.ok( row, 'the read is answered by a row' );
	assert.equal( row.reason, 'other-node' );
} );

test( 'negative control: the container\'s own element in uppercase still writes its setting', () => {
	const r = fill( { rootStyles: { 'text-transform': 'uppercase' }, slotStyles: { 'text-transform': 'uppercase' } } );
	assert.equal( r.tree[ 0 ].attributes.textTransform, 'uppercase', JSON.stringify( r.unmapped.filter( ( u ) => 'text-transform' === u.property ) ) );
} );

test( 'negative control: a slot whose draft element no other node owns keeps the inherited read', () => {
	const r = fill( { slotFinder: { tpl: 'Z' } } );
	assert.notEqual( [ ...( r.settled || [] ), ...r.alreadyHeld, ...r.unmapped ].find( ( u ) => 'text-transform' === u.property && P1 === u.slot )?.reason, 'other-node' );
	assert.equal( r.tree[ 0 ].attributes.textTransform, 'uppercase' );
} );

test( 'negative control: a property that is not inherited, read on the same slot, is not settled as another node\'s', () => {
	const r = fill( { slotStyles: { 'background-color': 'rgb(200, 0, 0)' } } );
	const row = [ ...( r.settled || [] ), ...r.alreadyHeld, ...r.unmapped ].find( ( u ) => 'background-color' === u.property && P1 === u.slot );
	assert.ok( row, 'the background read is still resolved' );
	assert.notEqual( row.reason, 'other-node' );
} );
