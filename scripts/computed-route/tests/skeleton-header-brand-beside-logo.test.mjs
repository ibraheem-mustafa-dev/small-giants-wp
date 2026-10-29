// rules.logoElement / the typed brand name (Spec 48 §3.4 rule 6, register row C3, ruling S14): a brand name typed in spans
// beside a logo IMAGE is not a second logo block. The image is the logo; the typed words are dropped (the accepted difference
// N2C: the site's logo is an image). A typed brand name with no logo image beside it is still the logo block. Synthetic
// inventories in the reader's shape (lib/skeleton-inventory.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = ( siteName = 'Acme Optics' ) => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName } );
const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const boxes = ( y, h = 20, w = 100, x = 0 ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || boxes( 100 ), visible: { 375: true, 768: true, 1440: true }, display: x.display || 'block', flexDirection: 'row', screenshots: {} } );
const inv = ( elements ) => ( { generated: 'fixture', source: 'fixture', root: 'header', checks: { rootKey: 'Root/1#0' }, elements } );
const run = ( inventory, f = facts() ) => proposeSkeleton( { inventory, facts: f, surface: 'header', surfaceKind: 'header', surfaceName: 'Header', db } );
const flat = ( list ) => list.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );
const logos = ( r ) => flat( r.skeleton ).filter( ( n ) => 'sgs/responsive-logo' === n.name );
const rowOf = ( r, key ) => r.proposal.rows.find( ( x ) => x.key === key );

// A brand block holding the logo image and the brand name typed in two parts beside it.
const brand = ( { image = true, parts = [ 'ACME', 'OPTICS' ] } = {} ) => [
	el( 'Root/1#0', null, 'header', '', { depth: 0, box: boxes( 90, 60 ) } ),
	el( 'Root/2#0', 'Root/1#0', 'div', '', { depth: 1, display: 'flex' } ),
	el( 'Root/3#0', 'Root/2#0', 'div', '', { depth: 2, display: 'flex' } ),
	...( image ? [ el( 'Root/4#0', 'Root/3#0', 'img', '', { depth: 3, attrs: { alt: 'Acme Optics', srcBasename: 'ec-logo.png' } } ) ] : [] ),
	...parts.map( ( words, i ) => el( `Root/${ 5 + i }#0`, 'Root/3#0', 'div', words, { depth: 3 } ) ),
];

test( 'MUST FAIL: a brand name typed beside a logo image adds no second logo block; the image is the one logo', () => {
	const r = run( inv( brand() ) );
	assert.equal( logos( r ).length, 1, 'one logo block' );
	assert.equal( logos( r )[ 0 ].draftRef?.tpl, 'Root/4#0', 'it is the image' );
	assert.equal( rowOf( r, 'Root/5#0' ).action, 'remove', 'the typed words are dropped' );
	assert.equal( rowOf( r, 'Root/6#0' ).action, 'remove' );
	assert.match( rowOf( r, 'Root/5#0' ).reason, /logo image/ );
} );

test( 'negative control: a typed brand name with no logo image beside it is still the logo block', () => {
	const r = run( inv( brand( { image: false } ) ) );
	assert.equal( logos( r ).length, 1 );
	assert.equal( logos( r )[ 0 ].draftRef?.tpl, 'Root/5#0' );
	assert.notEqual( rowOf( r, 'Root/5#0' ).action, 'remove' );
} );

test( 'negative control: an image that is not a logo (no logo word in its file name, alt or class, alt not the site name) keeps the typed name as the logo block', () => {
	const inventory = inv( brand() );
	inventory.elements.find( ( e ) => 'Root/4#0' === e.key ).attrs = { alt: 'A smiling optician', srcBasename: 'team.jpg' };
	const r = run( inventory );
	assert.ok( logos( r ).some( ( n ) => 'Root/5#0' === n.draftRef?.tpl ), 'the typed name is a logo block' );
} );

test( 'a typed name that is not the site name beside a logo image is not this rule\'s: it stays a text block', () => {
	const r = run( inv( brand( { parts: [ 'Opticians since 1990' ] } ) ) );
	assert.equal( logos( r ).length, 1 );
	assert.notEqual( rowOf( r, 'Root/5#0' ).action, 'remove' );
} );

test( 'an image is a logo by its file name alone, or by its alt text (the site name) alone', () => {
	for ( const attrs of [ { alt: '', srcBasename: 'brandmark.png' }, { alt: 'Acme Optics', srcBasename: 'photo.jpg' } ] ) {
		const inventory = inv( brand() );
		inventory.elements.find( ( e ) => 'Root/4#0' === e.key ).attrs = attrs;
		const r = run( inventory );
		assert.equal( rowOf( r, 'Root/5#0' ).action, 'remove', JSON.stringify( attrs ) );
		assert.equal( logos( r ).length, 1 );
	}
} );

test( 'negative control: only an image counts as the logo beside the typed name, not another element carrying the same alt text', () => {
	const inventory = inv( brand() );
	const logo = inventory.elements.find( ( e ) => 'Root/4#0' === e.key );
	logo.tag = 'div';
	logo.attrs = { alt: 'Acme Optics' };
	const r = run( inventory );
	assert.notEqual( rowOf( r, 'Root/5#0' ).action, 'remove' );
} );
