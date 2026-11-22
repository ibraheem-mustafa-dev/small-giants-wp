// A coming-soon entry among a menu's links (rules.navigation.briefOnlyEntry; Bean, 2026-10-09: "there's no point of putting a
// coming soon item in a link list"): an element with no link, holding none, whose own words or chip words say it is coming soon is
// removed from the proposal (a brief-only line, listed for removal) instead of being absorbed into the menu block, and the menu
// block is no longer asked to draw it as a disabled item. Synthetic header inventory in the reader's shape
// (lib/skeleton-inventory.mjs), the nav holding two links and the entry under test.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts, decisionsProblems } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { isSoonEntry, soonEntrySpec } from '../lib/menu-soon-entry.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const boxes = ( y, h = 20, w = 100, x = 0 ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || boxes( 100 ), visible: { 375: true, 768: true, 1440: true }, display: x.display || 'block', flexDirection: 'row', screenshots: {} } );
const link = ( n, words ) => el( `Root/${ n }#0`, 'Root/3#0', 'a', words, { depth: 3, attrs: { href: `/${ words.toLowerCase() }` } } );
// The header (Root/1) with its bar (Root/2) holding a nav (Root/3) of two links, then the extra elements.
const header = ( extra ) => ( { generated: 'fixture', source: 'fixture', root: 'header', checks: { rootKey: 'Root/1#0' }, elements: [ el( 'Root/1#0', null, 'header', '', { depth: 0, box: boxes( 90, 60 ) } ), el( 'Root/2#0', 'Root/1#0', 'div', '', { depth: 1, display: 'flex' } ), el( 'Root/3#0', 'Root/2#0', 'nav', '', { depth: 2 } ), link( 4, 'Shop' ), link( 5, 'Help' ), ...extra ] } );
const run = ( extra ) => proposeSkeleton( { inventory: header( extra ), facts: facts(), surface: 'header', surfaceKind: 'header', surfaceName: 'Header', db } );
const row = ( r, key ) => r.proposal.rows.find( ( x ) => x.key === key );
const entry = ( n, label, chip ) => [ el( `Root/${ n }#0`, 'Root/3#0', 'span', label, { depth: 3 } ), ...( chip ? [ el( `Root/${ n + 1 }#0`, `Root/${ n }#0`, 'span', chip, { depth: 4 } ) ] : [] ) ];

test( 'the decisions entry compiles, and the meaning test reads a lone soon word, never a client name', () => {
	assert.deepEqual( decisionsProblems( facts() ), [] );
	assert.ok( soonEntrySpec().id );
	for ( const badge of [ 'SOON', 'Soon!', 'coming soon', 'Opening soon' ] ) {
		assert.equal( isSoonEntry( { label: 'Glasses', badge } ), true, badge );
	}
	for ( const badge of [ 'NEW', 'Sooner', 'Sale soon over', '' ] ) {
		assert.equal( isSoonEntry( { label: 'Glasses', badge } ), false, badge );
	}
	assert.equal( isSoonEntry( { label: 'Coming soon', badge: '' } ), true, 'a label that says it is coming soon' );
} );

test( 'MUST FAIL: an unlinked entry with a lone SOON badge among the links is removed and listed, not absorbed into the menu', () => {
	const r = run( entry( 6, 'Glasses', 'SOON' ) );
	const glasses = row( r, 'Root/6#0' );
	assert.deepEqual( [ glasses.action, glasses.source ], [ 'remove', 'decisions coming-soon-entry' ] );
	assert.match( glasses.reason, /^brief-only menu entry \(coming-soon-entry\)/ );
	assert.deepEqual( [ row( r, 'Root/7#0' ).action, row( r, 'Root/7#0' ).reason ], [ 'remove', 'inside a removed element (Root/6#0)' ], 'its chip goes with it' );
	assert.deepEqual( [ row( r, 'Root/4#0' ).action, row( r, 'Root/5#0' ).action ], [ 'absorbed', 'absorbed' ], 'the links stay the menu\'s' );
	assert.ok( ! JSON.stringify( r.skeleton ).includes( 'disabledItemIds' ), 'no disabled item is asked of the menu block' );
	assert.equal( run( entry( 6, 'Coming soon', '' ) ).proposal.rows.find( ( x ) => 'Root/6#0' === x.key ).action, 'remove', 'a label that says it is coming soon, with no chip' );
} );

test( 'NEGATIVE: an unlinked parent item that opens a submenu, a label with another chip and a link that says soon all stay absorbed', () => {
	const submenu = [ el( 'Root/6#0', 'Root/3#0', 'span', 'More', { depth: 3 } ), el( 'Root/7#0', 'Root/6#0', 'span', 'SOON', { depth: 4 } ), el( 'Root/8#0', 'Root/6#0', 'a', 'Sunglasses', { depth: 4, attrs: { href: '/sunglasses' } } ) ];
	const r = run( submenu );
	assert.equal( row( r, 'Root/6#0' ).action, 'absorbed', 'an item holding a link opens a submenu: it is no coming-soon entry whatever its chip says' );
	assert.equal( row( run( entry( 6, 'Gift cards', 'NEW' ) ), 'Root/6#0' ).action, 'absorbed', 'another chip' );
	const linked = run( [ el( 'Root/6#0', 'Root/3#0', 'a', 'Soon', { depth: 3, attrs: { href: '/soon' } } ) ] );
	assert.equal( row( linked, 'Root/6#0' ).action, 'absorbed', 'a link is never dropped' );
	const alone = run( entry( 6, 'Glasses', 'SOON' ).map( ( e ) => ( { ...e, parentKey: 'Root/2#0' } ) ) );
	assert.notEqual( row( alone, 'Root/6#0' )?.source, 'decisions coming-soon-entry', 'an entry outside the nav is no menu entry' );
} );
