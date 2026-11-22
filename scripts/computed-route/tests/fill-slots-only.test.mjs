// A node that reads its parts and not its root (`draftSlotsOnly`, lib/fill-skeleton.mjs): the far half of a header menu reads the
// group element's bar gap and its first link's look, while the group's own container reads that group's root. The node's
// targets are its slots only; Fill reads them and writes their settings, and reads nothing at the root. A node with draftSlots
// and neither a draftRef nor the mark is still refused. Contacts no site (tools/run-tests.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, skeletonProblems, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];
const DEFAULT = { display: 'flex', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'font-weight': '400', 'line-height': '24px', 'letter-spacing': 'normal', 'text-transform': 'none', 'background-color': 'rgba(0, 0, 0, 0)', gap: '0px', 'row-gap': '0px', 'column-gap': '0px', 'flex-direction': 'row' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ], ...extra } );
const BAR = '.sgs-container__inner';
const CAL = { block: 'sgs/container', elements: { '': tiers( DEFAULT ), [ BAR ]: tiers( DEFAULT ) }, settings: { gap: setting( 'gap', { slot: BAR, slots: [ BAR ], reaches: [ BAR ] } ) }, discovered: {} };
const snap = ( styles ) => ( { styles: { ...DEFAULT, ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: '', href: null } );
const reads = ( spec ) => ( { widths: Object.fromEntries( FIVE.map( ( w ) => [ w, Object.fromEntries( Object.entries( spec ).map( ( [ id, s ] ) => [ id, s ? snap( s ) : { missing: true } ] ) ) ] ) ), declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' } );

// A group container reading the group element (Root/6#0) as its root and a second container reading the same element's bar only.
const skeleton = ( { only = true, marked = only } = {} ) => [ { name: 'sgs/container', draftRef: { tpl: 'Root/1#0' }, attributes: {}, innerBlocks: [
	{ name: 'sgs/container', draftRef: { tpl: 'Root/6#0' }, attributes: {}, innerBlocks: [] },
	{ name: 'sgs/container', ...( marked ? { draftSlotsOnly: true } : {} ), ...( only ? {} : { draftRef: { tpl: 'Root/6#0' } } ), draftSlots: { [ BAR ]: { tpl: 'Root/6#0' } }, attributes: {}, innerBlocks: [] },
] } ];
const run = ( sk, spec ) => {
	const tree = cleanTree( sk );
	addRefs( tree, 'fx' );
	const out = fillTree( { tree, nodes: skeletonNodes( sk ), reads: reads( spec ), db, snapshot, calFor: ( b ) => ( 'sgs/container' === b ? CAL : null ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { tree, ...out };
};
const LOOK = { gap: '24px', 'row-gap': '24px', 'column-gap': '24px' };

test( 'MUST FAIL: a slots-only node has its slots as targets, no root, and Fill writes the parts it reads', () => {
	const sk = skeleton();
	const nodes = skeletonNodes( sk );
	assert.deepEqual( nodes[ 2 ].targets.map( ( t ) => [ t.id, t.slot, t.scoped ] ), [ [ `2:${ BAR }`, BAR, true ] ], 'no root target' );
	assert.deepEqual( skeletonProblems( sk ), [] );
	const r = run( sk, { '0:': LOOK, '1:': LOOK, [ `2:${ BAR }` ]: LOOK } );
	assert.ok( r.writes.some( ( w ) => 2 === w.index && 'gap' === w.attr ), JSON.stringify( r.writes.map( ( w ) => [ w.index, w.attr, w.slot ] ) ) );
	assert.ok( r.writes.every( ( w ) => 2 !== w.index || BAR === w.slot ), 'nothing is written from the half\'s root' );
	assert.equal( r.tree[ 0 ].innerBlocks[ 1 ].draftSlotsOnly, undefined, 'the filled tree carries no draft key' );
} );

test( 'negative control: the half reads nothing at the root: a read at its root id is ignored, and the group container keeps the root', () => {
	const r = run( skeleton(), { '0:': {}, '1:': LOOK, [ `2:${ BAR }` ]: {}, '2:': { gap: '40px', 'row-gap': '40px', 'column-gap': '40px' } } );
	assert.ok( r.writes.some( ( w ) => 1 === w.index && 'gap' === w.attr ), 'the container that owns the element still writes its look' );
	assert.ok( ! r.writes.some( ( w ) => 2 === w.index ), 'the half writes nothing from a root read' );
} );

test( 'negative controls: draftSlots with neither a draftRef nor the mark, the mark with a draftRef, with no slots or with a selector slot are named', () => {
	assert.deepEqual( skeletonProblems( skeleton( { only: true, marked: false } ) ).filter( ( p ) => /draftSlots but no draftRef/.test( p ) ).length, 1 );
	assert.equal( skeletonProblems( skeleton( { only: false, marked: true } ) ).filter( ( p ) => /takes no draftRef/.test( p ) ).length, 1 );
	const bare = skeleton();
	bare[ 0 ].innerBlocks[ 1 ].draftSlots = {};
	assert.equal( skeletonProblems( bare ).filter( ( p ) => /needs draftSlots/.test( p ) ).length, 1 );
	const sel = skeleton();
	sel[ 0 ].innerBlocks[ 1 ].draftSlots = { [ BAR ]: '.group' };
	assert.equal( skeletonProblems( sel ).filter( ( p ) => /must be an exact tpl finder/.test( p ) ).length, 1 );
	const odd = skeleton();
	odd[ 0 ].innerBlocks[ 1 ].draftSlotsOnly = 'yes';
	assert.equal( skeletonProblems( odd ).filter( ( p ) => /must be true/.test( p ) ).length, 1 );
} );

// A parent whose middle child reads its slots only: the gap is not the distance between the two neighbours with the child's box between them.
test( 'MUST FAIL: a slots-only child is no measured box, so the gap of its parent is not the span between the neighbours it sits between', () => {
	const sk = [ { name: 'sgs/container', draftRef: { tpl: 'Root/1#0' }, attributes: {}, innerBlocks: [
		{ name: 'sgs/container', draftRef: { tpl: 'Root/2#0' }, attributes: {}, innerBlocks: [] },
		{ name: 'sgs/container', draftSlotsOnly: true, draftSlots: { [ BAR ]: { tpl: 'Root/3#0' } }, attributes: {}, innerBlocks: [] },
		{ name: 'sgs/container', draftRef: { tpl: 'Root/4#0' }, attributes: {}, innerBlocks: [] },
	] } ];
	const nodes = skeletonNodes( sk );
	const at = ( x ) => ( { ...snap( { display: 'flex' } ), rect: { x, y: 0, w: 100, h: 40 } } );
	const rd = reads( { '0:': {}, '1:': {}, '3:': {}, [ `2:${ BAR }` ]: {} } );
	for ( const w of FIVE ) {
		rd.widths[ w ][ '0:' ] = { ...snap( { display: 'flex', gap: '8px', 'column-gap': '8px', 'row-gap': '8px' } ), rect: { x: 0, y: 0, w: 600, h: 40 } };
		rd.widths[ w ][ '1:' ] = at( 0 );
		rd.widths[ w ][ '3:' ] = at( 500 );
	}
	const tree = cleanTree( sk );
	addRefs( tree, 'fx' );
	const out = fillTree( { tree, nodes, reads: rd, db, snapshot, calFor: ( b ) => ( 'sgs/container' === b ? CAL : null ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	assert.deepEqual( out.spacing.filter( ( x ) => 0 === x.index && x.decisions.length ), [], 'no gap is decided from the positions of the two neighbours' );
	assert.ok( ! out.writes.some( ( x ) => 0 === x.index && 'gap' === x.prop && /^(3\d\d|[4-9]\d\d)/.test( String( Object.values( x.after || {} )[ 0 ] ?? x.after ) ) ), 'the gap is not the 400px between them' );
} );
