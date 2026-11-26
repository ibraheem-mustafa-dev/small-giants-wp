// A setting a skeleton rule decided (the node's `decided`) that paints a CSS property cannot be a skeleton attribute (R-47-10,
// lint.mjs::lintSkeleton), so lib/fill-resolve.mjs::fillContent writes it onto the node: a hero whose content block the draft
// anchors to its bottom edge gets verticalAlignment bottom (Eye Care Home, 2026-11-19: the skeleton carrying it as an attribute
// failed the whole Fill). A decided value the node already holds is not written again, and a node with none gets none.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree, skeletonProblems } from '../lib/fill-skeleton.mjs';
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

// A node Fill cannot read still carries what its skeleton rule decided, hands over what its skeleton declared, and lists the settings
// its skeleton could not read as UNMAPPED rows: the basket count row has no draft element, so no read targets it, and a numbered-steps
// block the draft hides at every width or has no calibration is never read. fillTree writes `decided` and carries `handover` and
// `unmapped` for every node, read or not.
function runTree( skeleton, widths = {} ) {
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const out = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads: { widths, declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => CAL[ b ] ?? null, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { out, tree };
}
const flatTree = ( t ) => ( t || [] ).flatMap( ( n ) => [ n, ...flatTree( n.innerBlocks ) ] );
const READ = Object.fromEntries( THREE.map( ( w ) => [ w, { '0:': { styles: { ...DEFAULT }, layoutDisplay: 'flex', pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: 'A', href: null } } ] ) );

test( 'MUST FAIL: a node with no draft element of its own (the basket count row) is written its decided gap and alignment', () => {
	const row = { name: 'sgs/container', attributes: { tagName: 'div', layout: 'flex' }, decided: { gap: { desktop: '17px', tablet: '13.5px' }, alignItems: { desktop: 'center' } }, innerBlocks: [ { name: 'sgs/hero', draftRef: '.a', attributes: {} } ] };
	const r = runTree( [ row ], READ );
	const filled = flatTree( r.tree ).find( ( n ) => 'sgs/container' === n.name );
	assert.deepEqual( filled.attributes.gap, { desktop: '17px', tablet: '13.5px' } );
	assert.deepEqual( filled.attributes.alignItems, { desktop: 'center' } );
	assert.deepEqual( r.out.writes.filter( ( w ) => 'decided' === w.how ).map( ( w ) => w.attr ).sort(), [ 'alignItems', 'gap' ] );
} );

test( 'MUST FAIL: a numbered-steps node Fill cannot read (hidden at every width) keeps the steps and heading level its rule decided', () => {
	const steps = [ { number: '01', title: 'Order', description: 'Pick it' } ];
	const node = { name: 'sgs/process-steps', draftRef: '.gone', attributes: { layout: 'list' }, decided: { steps, headingLevel: 'h3' }, innerBlocks: [] };
	const r = runTree( [ node ], {} );
	const filled = r.tree[ 0 ];
	assert.deepEqual( filled.attributes.steps, steps );
	assert.equal( filled.attributes.headingLevel, 'h3' );
	assert.ok( r.out.unmapped.some( ( u ) => /no visible element|no calibration/.test( u.reason ) ), 'the unread node is still reported as unread' );
} );

test( 'MUST FAIL: the handover an unread node declares is carried, with its detail as the reason', () => {
	const row = { name: 'sgs/container', attributes: {}, handover: [ { owner: 'content-page', kind: 'presence', detail: 'the count sits in the heading line: set the row gap' } ], innerBlocks: [] };
	const r = runTree( [ row ], {} );
	assert.equal( r.out.handover.length, 1 );
	assert.equal( r.out.handover[ 0 ].owner, 'content-page' );
	assert.equal( r.out.handover[ 0 ].reason, 'the count sits in the heading line: set the row gap' );
} );

test( 'negative control: a read node\'s declared handover is carried once, not twice', () => {
	const node = { name: 'sgs/hero', draftRef: '.a', attributes: {}, handover: [ { owner: 'content-page', kind: 'presence', detail: 'x' } ] };
	assert.equal( runTree( [ node ], READ ).out.handover.length, 1 );
} );

test( 'MUST FAIL: the unmapped rows an unread node\'s skeleton declares are listed as UNMAPPED rows on that node, and a malformed list is a skeleton problem', () => {
	const row = { name: 'sgs/container', attributes: {}, unmapped: [ { property: 'gap', reason: 'the heading size was not read' } ], innerBlocks: [] };
	const r = runTree( [ row ], {} );
	assert.deepEqual( r.out.unmapped.map( ( u ) => [ u.block, u.property, u.reason ] ), [ [ 'sgs/container', 'gap', 'the heading size was not read' ] ] );
	assert.equal( r.out.handover.length, 0 );
	assert.equal( r.tree[ 0 ].unmapped, undefined, 'the tree Fill writes does not carry the key' );
	assert.deepEqual( skeletonProblems( [ row ] ), [] );
	assert.match( skeletonProblems( [ { ...row, unmapped: [ { property: 'gap' } ] } ] ).join( '\n' ), /unmapped must be a list of \{ property, reason \}/ );
	const read = runTree( [ { name: 'sgs/hero', draftRef: '.a', attributes: {}, unmapped: [ { property: 'align-items', reason: 'x' } ] } ], READ );
	assert.equal( read.out.unmapped.filter( ( u ) => 'align-items' === u.property ).length, 1, 'a read node lists them once too' );
} );
