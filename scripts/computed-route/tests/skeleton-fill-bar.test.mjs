// A fill bar (lib/skeleton-rules.mjs, the decoration layer rule's `fillBar`): a bare element alone in a parent that sets its own
// height, filling that height and a share of its width with a fill (a rating breakdown bar's fill, a progress meter). No block
// fits it, so it was unresolved and its fill and width were lost (an empty track in the clone). Placed at its parent's start corner
// it draws the same as a decorative image layer there: rule decorationLayer, block sgs/decorative-image, with its top and left
// edges decided at 0 (Fill writes the width and height the draft declares as percentages, lib/fill-layer-box.mjs). Real case: a
// product page's review breakdown, four `<span style="flex:1;height:6px;background:…;overflow:hidden"><span style="display:block;
// height:100%;width:{{ b.pct }};background:…"></span></span>` rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'fixture-client', repo: REPO } );

const E = ( tag, o = {}, kids = [] ) => ( { tag, o, kids } );
function inventory( root ) {
	const elements = [];
	let n = 0;
	const walk = ( node, parentKey, depth ) => {
		const id = ++n;
		const key = `Root/${ id }#0`;
		const attrs = { ...( node.o.attrs || {} ), ...( node.o.style ? { style: node.o.style } : {} ) };
		const words = node.o.words || '';
		const el = { key, parentKey, depth, tag: node.tag, template: 'Root', tpl: id, attrs, words, allText: words, membership: [], srcTag: node.tag, srcOwnText: words,
			snippet: `<${ node.tag } data-dc-tpl="${ id }">${ words }</${ node.tag }>`,
			box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, node.o.box || { x: 0, y: 0, w: 100, h: 20 } ] ) ),
			visible: { 375: true, 768: true, 1440: true }, display: node.o.display || 'block', flexDirection: 'row', screenshots: {} };
		elements.push( el );
		const texts = node.kids.map( ( k ) => walk( k, key, depth + 1 ) );
		el.allText = [ words, ...texts ].filter( Boolean ).join( ' ' );
		return el.allText;
	};
	walk( root, null, 0 );
	return { checks: {}, source: 'fixture', root: root.tag, generated: 'fixture', elements };
}
const run = ( root ) => proposeSkeleton( { inventory: inventory( root ), facts: facts(), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', built: null, motion: new Set(), db } );
const nodeOf = ( tree, key ) => {
	for ( const n of tree || [] ) {
		if ( n.draftRef?.tpl === key ) {
			return n;
		}
		const hit = nodeOf( n.innerBlocks, key );
		if ( hit ) {
			return hit;
		}
	}
	return null;
};

const TRACK = 'flex:1;height:6px;background:#EFEAE2;overflow:hidden';
const FILL = 'display:block;height:100%;width:13%;background:#9C8B78';
// section > row (label, track > fill, count). The fill is Root/5#0.
const page = ( track = TRACK, fill = FILL, extra = [] ) => E( 'section', {}, [ E( 'div', { style: 'display:flex;gap:12px;align-items:center', display: 'flex' }, [
	E( 'span', { words: '4 ★', style: 'width:32px' } ),
	E( 'span', { style: track }, [ E( 'span', { style: fill } ), ...extra ] ),
	E( 'span', { words: '5', style: 'width:30px' } ),
] ) ] );
const fillRow = ( r ) => r.proposal.rows.find( ( x ) => 'Root/5#0' === x.key );

test( 'MUST FAIL WITHOUT THE FILL BAR: a bare fill alone in a track of its own height, filling the height and a share of the width, is a decorative image at the track\'s start corner', () => {
	const r = run( page() );
	const row = fillRow( r );
	assert.deepEqual( [ row.block, row.rule, row.action ?? null ], [ 'sgs/decorative-image', 'decorationLayer', null ] );
	const node = nodeOf( r.skeleton, 'Root/5#0' );
	assert.ok( node, 'the fill is a node of its own' );
	assert.deepEqual( node.decided, { positionTop: { desktop: '0px' }, positionLeft: { desktop: '0px' } } );
	assert.ok( ! r.problems.some( ( p ) => /Root\/5#0/.test( p ) ), r.problems.join( '\n' ) );
} );

test( 'negative control: a track with no height of its own, a fill with a sibling, a fill sized in px, a fill painting nothing and a fill not as tall as its track stay as they were', () => {
	const cases = [
		[ 'flex:1;background:#EFEAE2', FILL ],
		[ TRACK, 'display:block;height:100%;width:40px;background:#9C8B78' ],
		[ TRACK, 'display:block;height:100%;width:13%' ],
		[ TRACK, 'display:block;height:3px;width:13%;background:#9C8B78' ],
	];
	for ( const [ track, fill ] of cases ) {
		const row = fillRow( run( page( track, fill ) ) );
		assert.notEqual( row?.rule, 'decorationLayer', `${ track } | ${ fill }` );
	}
	const twin = fillRow( run( page( TRACK, FILL, [ E( 'span', { style: FILL } ) ] ) ) );
	assert.notEqual( twin?.rule, 'decorationLayer', 'a fill beside another child is not alone in its track' );
	// A layer the draft places itself keeps no decided corner.
	const placed = nodeOf( run( page( 'position:relative;height:6px', 'position:absolute;top:0;left:0;height:100%;width:13%;background:#9C8B78' ) ).skeleton, 'Root/5#0' );
	assert.ok( placed, 'the placed layer is a node' );
	assert.equal( placed.decided, undefined );
} );
