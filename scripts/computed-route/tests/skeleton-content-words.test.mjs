// The words a draft element carries reach the skeleton (Spec 48 §3.4, FR-48-6 element map, FR-48-38 and ruling S7: list
// content is never dropped): a container's own text is a text child in DOM order, a link or button holding a label and an
// icon is one button, a blockquote's body is the quote's text and its cite the attribution, a heading keeps its level,
// a wordless control keeps no default label. Each case is a fixture slice in the inventory's shape, with a MUST FAIL case and
// a negative control.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { askHoles, planHoles } from '../lib/read-logic.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'fixture-client', repo: REPO } );
const E = ( tag, o = {}, kids = [] ) => ( { tag, o, kids } );
function inventory( root ) {
	const elements = [];
	let n = 0;
	const walk = ( node, parentKey, depth ) => {
		const id = ++n;
		const words = node.o.words || '';
		const el = { key: `Root/${ id }#0`, parentKey, depth, tag: node.tag, template: 'Root', tpl: id, attrs: node.o.attrs || {}, words, allText: words, membership: [], srcTag: node.tag, srcOwnText: words,
			snippet: node.o.snippet || `<${ node.tag } data-dc-tpl="${ id }">${ words }</${ node.tag }>`,
			box: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { x: 0, y: node.o.y ?? 0, w: node.o.w ?? 100, h: node.o.h ?? 20 } ] ) ),
			visible: { 375: true, 768: true, 1440: true }, display: node.o.display || 'block', flexDirection: 'row', screenshots: {} };
		elements.push( el );
		el.allText = [ words, ...node.kids.map( ( k ) => walk( k, el.key, depth + 1 ) ) ].filter( Boolean ).join( ' ' );
		return el.allText;
	};
	walk( root, null, 0 );
	return { checks: {}, source: 'fixture', root: root.tag, generated: 'fixture', elements };
}
const propose = ( root, extra = {} ) => proposeSkeleton( { inventory: inventory( root ), facts: facts(), surface: 'fixture', surfaceKind: 'page', surfaceName: 'Fixture', db, factRecord: null, ...extra } );
const flat = ( nodes, out = [] ) => {
	nodes.forEach( ( n ) => {
		out.push( n );
		flat( n.innerBlocks || [], out );
	} );
	return out;
};
const section = ( kids ) => E( 'section', {}, kids );
// The words of a node's text-bearing settings, depth-first in document order.
const textsOf = ( r ) => flat( r.skeleton ).map( ( n ) => n.attributes?.text ?? n.attributes?.content ?? n.attributes?.label ).filter( Boolean );

test( 'MUST FAIL: a container\'s own words become a text child in DOM order, before its children when the text opens the element and after them when it closes it', () => {
	const lead = section( [ E( 'div', { words: 'Opening words', snippet: '<div data-dc-tpl="3">Opening words<p data-dc-tpl="4">Body copy</p></div>' }, [ E( 'p', { words: 'Body copy' } ) ] ) ] );
	assert.deepEqual( textsOf( propose( lead ) ), [ 'Opening words', 'Body copy' ] );
	const trail = section( [ E( 'div', { words: 'Closing words', snippet: '<div data-dc-tpl="3"><p data-dc-tpl="4">Body copy</p>Closing words</div>' }, [ E( 'p', { words: 'Body copy' } ) ] ) ] );
	assert.deepEqual( textsOf( propose( trail ) ), [ 'Body copy', 'Closing words' ] );
} );

test( 'a container with no words of its own gains no text child (negative control)', () => {
	const r = propose( section( [ E( 'div', {}, [ E( 'p', { words: 'Body copy' } ) ] ) ] ) );
	assert.deepEqual( textsOf( r ), [ 'Body copy' ] );
	assert.equal( flat( r.skeleton ).filter( ( n ) => 'sgs/text' === n.name ).length, 1 );
} );

test( 'MUST FAIL: a blockquote body is the quote inner text and its cite the attribution, never the body in the attribution', () => {
	const bare = propose( section( [ E( 'blockquote', { words: 'Lovely service from start to finish' } ) ] ) );
	const quote = flat( bare.skeleton ).find( ( n ) => 'sgs/quote' === n.name );
	assert.equal( quote.attributes.attribution, undefined, 'the body is not the attribution' );
	assert.deepEqual( textsOf( bare ), [ 'Lovely service from start to finish' ] );
	assert.equal( quote.innerBlocks[ 0 ].name, 'sgs/text' );
	const cited = propose( section( [ E( 'blockquote', { words: 'Great', snippet: '<blockquote data-dc-tpl="3">Great<cite data-dc-tpl="4">A. Patient</cite></blockquote>' }, [ E( 'cite', { words: 'A. Patient' } ) ] ) ] ) );
	const q2 = flat( cited.skeleton ).find( ( n ) => 'sgs/quote' === n.name );
	assert.equal( q2.attributes.attribution, 'A. Patient' );
	assert.deepEqual( q2.innerBlocks.map( ( n ) => n.attributes.text ), [ 'Great' ], 'the cite is the attribution only, not a second text' );
	assert.equal( cited.proposal.rows.find( ( r ) => 'sgs/quote' === r.block ).parts.length, 1, 'the cite is a part of the quote' );
} );

test( 'MUST FAIL: a link holding words and a small icon image is one button with the words as its label (negative control: a photo beside the words is not an icon)', () => {
	const link = ( kid ) => section( [ E( 'a', { words: 'Message me', attrs: { href: 'https://example.org/chat' }, snippet: '<a href="https://example.org/chat" data-dc-tpl="3">Message me<img data-dc-tpl="4"></a>' }, [ kid ] ) ] );
	const r = propose( link( E( 'img', { attrs: { alt: '' }, w: 19, h: 19 } ) ) );
	const buttons = flat( r.skeleton ).filter( ( n ) => 'sgs/button' === n.name );
	assert.equal( buttons.length, 1 );
	assert.deepEqual( [ buttons[ 0 ].attributes.label, buttons[ 0 ].attributes.url ], [ 'Message me', 'https://example.org/chat' ] );
	assert.equal( flat( r.skeleton ).filter( ( n ) => 'sgs/container' === n.name ).length, 1, 'only the section: the link is no wrapper shell' );
	const photo = propose( link( E( 'img', { attrs: { alt: 'The shop front' }, w: 600, h: 400 } ) ) );
	assert.equal( flat( photo.skeleton ).filter( ( n ) => 'sgs/button' === n.name ).length, 0, 'a photo beside words keeps the link a wrapper' );
} );

// A list the draft holds in its logic is read whole (ruling S7): the recorder keeps every copy's distinct value up to the loop
// cap, and a list it cannot read in full is a visible hand-over row, never a silent loss.
const flavours = Array.from( { length: 11 }, ( _, i ) => ( { label: `Flavour ${ i + 1 }` } ) );
async function recordedValues( list ) {
	const logic = { props: {}, renderVals: () => ( { flavs: list } ) };
	globalThis.document = { querySelector: () => ( { __reactFiber$x: { stateNode: { logic, __name: 'Home' } } } ) };
	globalThis.CSS = { escape: ( s ) => s };
	try {
		const template = { order: [ 'Home/1' ], elements: { 'Home/1': { component: 'Home', n: '1', holes: [ { id: 'text#0', expr: 'o.label' } ], membership: { scFor: [ { list: '{{ flavs }}', as: 'o' } ] } } } };
		const got = await askHoles( { evaluate: async ( fn, arg ) => fn( arg ) }, planHoles( template ) );
		return got.Home.holes[ '1|text#0' ];
	} finally {
		delete globalThis.document;
		delete globalThis.CSS;
	}
}

test( 'MUST FAIL: a loop of eleven labels is recorded with all eleven, not the first eight (negative control: two labels stay two)', async () => {
	const all = await recordedValues( flavours );
	assert.equal( all.v.length, 11 );
	assert.equal( all.more, undefined, 'nothing is left unrecorded' );
	assert.deepEqual( ( await recordedValues( flavours.slice( 0, 2 ) ) ).v.map( ( x ) => x.v ), [ 'Flavour 1', 'Flavour 2' ] );
} );

test( 'MUST FAIL: a heading keeps the level of its draft tag (FR-48-6), and an element that is not a heading writes none', () => {
	const r = propose( section( [ E( 'h1', { words: 'Welcome', y: 0 } ), E( 'h3', { words: 'Third level', y: 30 } ), E( 'h2', { words: 'Second level', y: 60 } ), E( 'p', { words: 'Plain copy', y: 90 } ) ] ) );
	const heading = ( words ) => flat( r.skeleton ).find( ( n ) => words === n.attributes?.content );
	assert.equal( heading( 'Welcome' ).attributes.level, 'h1' );
	assert.equal( heading( 'Third level' ).attributes.level, 'h3' );
	assert.equal( heading( 'Second level' ).attributes.level, 'h2', 'a level equal to the block default is still written from the draft tag' );
	assert.equal( flat( r.skeleton ).find( ( n ) => 'Plain copy' === n.attributes?.text ).attributes.level, undefined );
} );

test( 'MUST FAIL: a wordless control (a swatch, a dot) writes an empty label and its aria-label, never the block default "Click Here" (negative control: a labelled button keeps its words)', () => {
	const r = propose( section( [ E( 'button', { attrs: { 'aria-label': 'Pick red' }, y: 0 } ), E( 'button', { words: 'Buy now', y: 30 } ) ] ) );
	const buttons = flat( r.skeleton ).filter( ( n ) => 'sgs/button' === n.name );
	assert.equal( buttons.length, 2 );
	assert.equal( buttons[ 0 ].attributes.label, '' );
	assert.equal( buttons[ 0 ].attributes.ariaLabel, 'Pick red' );
	assert.equal( buttons[ 1 ].attributes.label, 'Buy now' );
	assert.equal( buttons[ 1 ].attributes.ariaLabel, undefined );
} );
