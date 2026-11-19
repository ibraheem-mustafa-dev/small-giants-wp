// A plain wrapper's own words are kept (lib/skeleton-propose.mjs::buildNode, rules.wrappedWords' text block). A wrapper-shell
// block (the plain container) has no setting for words, so a draft element whose words sit beside a child that is not inline
// phrasing content (`<div><div class="dot"></div>Premium rice</div>`; phrasing children make the element one rich-text block,
// rules structural.inlineText) was proposed as a container holding its children and nothing else: the words were dropped with no
// warning. The words are now one text child with no draft element of its own, before the first child when the draft's source
// opens with them and after the last child otherwise; where no text block can hold them the proposal's problems name the element.
// Offline, over fixture slices.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = ( ...off ) => {
	const f = loadFacts( { db, client: 'fixture-client', repo: REPO } );
	f.decisions = structuredClone( f.decisions );
	off.forEach( ( id ) => delete f.decisions.rules[ id ] );
	return f;
};

// A fixture tree: E( tag, { words, snippet, display }, children ) -> an inventory (the shape lib/skeleton-inventory.mjs reads).
const E = ( tag, o = {}, kids = [] ) => ( { tag, o, kids } );
function inventory( root ) {
	const elements = [];
	let n = 0;
	const walk = ( node, parentKey, depth ) => {
		const id = ++n;
		const key = `Root/${ id }#0`;
		const words = node.o.words || '';
		const el = { key, parentKey, depth, tag: node.tag, template: 'Root', tpl: id, attrs: {}, words, allText: words, membership: [], srcTag: node.tag, srcOwnText: words,
			snippet: node.o.snippet || `<${ node.tag } data-dc-tpl="${ id }">${ words }</${ node.tag }>`,
			box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: node.o.y ?? 0, w: 100, h: 20 } ] ) ),
			visible: { 375: true, 768: true, 1440: true }, display: node.o.display || 'block', flexDirection: 'row', screenshots: {} };
		elements.push( el );
		const texts = node.kids.map( ( k ) => walk( k, key, depth + 1 ) );
		el.allText = [ words, ...texts ].filter( Boolean ).join( ' ' );
		return el.allText;
	};
	walk( root, null, 0 );
	return { checks: {}, source: 'fixture', root: root.tag, generated: 'fixture', elements };
}
const run = ( root, o = {} ) => proposeSkeleton( { inventory: inventory( root ), facts: o.facts || facts(), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', built: null, motion: new Set(), db } );
const nodes = ( list ) => list.flatMap( ( n ) => [ n, ...nodes( n.innerBlocks || [] ) ] );
const section = ( kids ) => E( 'section', { display: 'block' }, kids );
const dot = () => E( 'div', { words: 'Tag', y: 2 } );
const WORDS = 'Premium rice';
// The list row: a flex div holding a dot and its own words; `lead` puts the words before the dot in the draft's source.
const row = ( lead ) => E( 'div', { display: 'flex', words: WORDS, snippet: lead ? `<div data-dc-tpl="2">${ WORDS }<div data-dc-tpl="3"></div></div>` : `<div data-dc-tpl="2"><div data-dc-tpl="3"></div>${ WORDS }</div>` }, [ dot() ] );
const rowNode = ( r ) => nodes( r.skeleton ).find( ( n ) => 'Root/2#0' === n.draftRef?.tpl );

test( 'MUST FAIL: a container holding a dot and its own words keeps the words as a text child after the dot', () => {
	const r = run( section( [ row( false ) ] ) );
	const node = rowNode( r );
	assert.equal( node.name, 'sgs/container' );
	assert.deepEqual( node.innerBlocks.map( ( n ) => [ n.name, n.attributes.text ] ), [ [ 'sgs/text', 'Tag' ], [ 'sgs/text', WORDS ] ] );
	assert.equal( node.innerBlocks[ 0 ].draftRef?.tpl, 'Root/3#0' );
	assert.equal( node.innerBlocks[ 1 ].draftRef, undefined, 'the text child reads no draft element: the wrapper reads the look' );
	assert.deepEqual( r.problems, [] );
	assert.match( r.proposal.rows.find( ( x ) => 'Root/2#0' === x.key ).rowNote, /its own words are one sgs\/text inside it/ );
} );

test( 'MUST FAIL: words that open the draft element come before its first child', () => {
	const node = rowNode( run( section( [ row( true ) ] ) ) );
	assert.deepEqual( node.innerBlocks.map( ( n ) => n.attributes.text ), [ WORDS, 'Tag' ] );
	assert.equal( node.innerBlocks[ 0 ].draftRef, undefined );
} );

test( 'MUST FAIL: without the text block the proposal names the element in its problems', () => {
	const r = run( section( [ row( false ) ] ), { facts: facts( 'wrappedWords' ) } );
	assert.deepEqual( rowNode( r ).innerBlocks.map( ( n ) => n.attributes.text ), [ 'Tag' ], 'the child stays, the words are not held' );
	assert.equal( r.problems.filter( ( p ) => /^Root\/2#0: sgs\/container carries the words "Premium rice" of its own/.test( p ) ).length, 1, r.problems.join( '\n' ) );
} );

test( 'negative control: a wordless wrapper and a heading keep their writing, with no text child added', () => {
	const r = run( section( [ E( 'div', { display: 'flex' }, [ dot(), dot() ] ), E( 'h2', { words: 'What people say' } ) ] ) );
	assert.deepEqual( r.problems, [] );
	const wrapper = r.skeleton[ 0 ].innerBlocks.find( ( n ) => 'sgs/container' === n.name );
	assert.deepEqual( wrapper.innerBlocks.map( ( n ) => n.attributes.text ), [ 'Tag', 'Tag' ], 'no text child is added to a wordless wrapper' );
	const heading = nodes( r.skeleton ).find( ( n ) => 'sgs/heading' === n.name );
	assert.deepEqual( [ heading.attributes.content, heading.innerBlocks.length ], [ 'What people say', 0 ] );
} );
