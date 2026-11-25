// rules.listHeading: the first piece of text of a footer column, directly above a run of text links, is that list's own
// heading (sgs/icon-list holds heading and headingLevel). Synthetic inventories in the reader's shape
// (lib/skeleton-inventory.mjs). Tests marked MUST FAIL fail on the skeleton writer before the rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const el = ( key, parentKey, tag, words = '', x = {} ) => {
	const b = x.box || { x: 0, y: 100, w: 200, h: 24 };
	return { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: { 375: b, 768: b, 1440: b }, visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} };
};
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const link = ( key, parent, words, y ) => el( key, parent, 'a', words, { depth: 4, attrs: { href: `https://example.com/${ words.toLowerCase() }/` }, box: { x: 0, y, w: 120, h: 24 } } );

// A column (Root/3#0) holding a heading text `head` (tag `tag`) above the links in `links`, then another column of text.
const page = ( { head = 'Shop', tag = 'div', links = [ 'Sunglasses', 'Brands', 'Lenses' ], after = [] } = {} ) => [
	el( 'Root/1#0', null, 'footer', '', { depth: 0 } ),
	el( 'Root/2#0', 'Root/1#0', 'div', '', { depth: 1 } ),
	el( 'Root/3#0', 'Root/2#0', 'div', '', { depth: 2, box: { x: 0, y: 100, w: 200, h: 140 } } ),
	el( 'Root/4#0', 'Root/3#0', tag, head, { depth: 3, box: { x: 0, y: 100, w: 200, h: 24 } } ),
	...links.map( ( w, i ) => link( `Root/${ 5 + i }#0`, 'Root/3#0', w, 130 + i * 30 ) ),
	...after,
	el( 'Root/30#0', 'Root/1#0', 'div', 'Visit us in store', { depth: 1 } ),
];
const run = ( elements, surfaceKind = 'footer' ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'test', surfaceKind, db } );
const all = ( tree, name, out = [] ) => {
	for ( const n of tree ) {
		n.name === name && out.push( n );
		all( n.innerBlocks || [], name, out );
	}
	return out;
};

test( 'MUST FAIL: a footer column\'s text above a run of links is the list\'s own heading, with no heading block', () => {
	const { skeleton, proposal } = run( page() );
	const lists = all( skeleton, 'sgs/icon-list' );
	assert.equal( lists.length, 1 );
	assert.equal( lists[ 0 ].attributes.heading, 'Shop' );
	assert.equal( lists[ 0 ].attributes.headingLevel, 'p', 'a draft heading that is no h tag is the list\'s paragraph level' );
	assert.equal( lists[ 0 ].attributes.items.length, 3 );
	assert.equal( all( skeleton, 'sgs/heading' ).length, 0 );
	const row = proposal.rows.find( ( r ) => 'Root/4#0' === r.key );
	assert.equal( row.action, 'absorbed' );
	assert.equal( row.rule, 'listHeading' );
	assert.equal( lists[ 0 ].draftRef.tpl, 'Root/3#0', 'the column is the list (rule listWrapper)' );
} );

test( 'MUST FAIL: the absorbed heading is paired to the list block heading part, so its look is read there', () => {
	const row = run( page() ).proposal.rows.find( ( x ) => 'Root/4#0' === x.key );
	assert.deepEqual( [ row.action, row.pairedPart ], [ 'absorbed', 'heading' ] );
} );

test( 'MUST FAIL: an h4 heading is the list\'s h4 level, an h1 the nearest level the list holds', () => {
	assert.equal( all( run( page( { tag: 'h4' } ) ).skeleton, 'sgs/icon-list' )[ 0 ].attributes.headingLevel, 'h4' );
	assert.equal( all( run( page( { tag: 'h1' } ) ).skeleton, 'sgs/icon-list' )[ 0 ].attributes.headingLevel, 'h2' );
} );

test( 'MUST FAIL: other content in the column stays beside the list, which still holds the heading', () => {
	const { skeleton } = run( page( { after: [ el( 'Root/12#0', 'Root/3#0', 'span', 'Mon to Sat 9 to 5', { depth: 3 } ) ] } ) );
	const [ list ] = all( skeleton, 'sgs/icon-list' );
	assert.equal( list.attributes.heading, 'Shop' );
	assert.equal( all( skeleton, 'sgs/heading' ).length, 0 );
} );

test( 'negative control: a page body keeps a heading block above its list', () => {
	const { skeleton } = run( page(), null );
	assert.equal( all( skeleton, 'sgs/icon-list' )[ 0 ]?.attributes.heading, undefined );
	assert.equal( all( skeleton, 'sgs/heading' ).length, 1 );
} );

test( 'negative control: a long line above the links is not a heading of the list', () => {
	const { skeleton } = run( page( { head: 'Find the right pair of frames for you today' } ) );
	assert.equal( all( skeleton, 'sgs/icon-list' )[ 0 ]?.attributes.heading, undefined );
} );

test( 'negative control: text above a single link makes no list heading', () => {
	const { skeleton } = run( page( { links: [ 'Sunglasses' ] } ) );
	assert.equal( all( skeleton, 'sgs/icon-list' ).length, 0 );
} );
