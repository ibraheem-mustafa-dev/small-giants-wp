// rules.footerSlots (Spec 48 §3.4), wave review: the footer root's width-only children (an sc-if on a width, shown at some
// widths only) are built into the row of the sibling they follow instead of vanishing with no row, and a floating element read
// beside the footer sits inside the bottom row, not beside the footer as a sibling. Synthetic inventories in the reader's shape.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w, h ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: x.attrs || {}, words, allText: words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100, 400, 100 ), visible: x.visible || { 375: true, 768: true, 1440: true }, display: x.display || 'block', flexDirection: 'row', screenshots: {}, ...( x.position ? { position: x.position } : {} ), ...( x.strip ? { strip: x.strip } : {} ) } );
const column = ( n, parent, box, label ) => [ el( `Root/${ n }#0`, parent, 'div', '', { depth: 2, box } ), el( `Root/${ n + 1 }#0`, `Root/${ n }#0`, 'h4', label, { depth: 3, box } ), el( `Root/${ n + 2 }#0`, `Root/${ n }#0`, 'a', `${ label } link`, { depth: 3, box, attrs: { href: `/${ label }` } } ) ];
const root = () => el( 'Root/1#0', null, 'footer', '', { depth: 0, box: place( 0, 100, 400, 300 ) } );
const grid = () => [ el( 'Root/2#0', 'Root/1#0', 'div', '', { box: place( 0, 100, 400, 100 ), display: 'grid' } ), ...column( 3, 'Root/2#0', place( 0, 100, 100, 100 ), 'Shop' ), ...column( 6, 'Root/2#0', place( 150, 100, 100, 100 ), 'Help' ) ];
const strip = ( n, y, words ) => [ el( `Root/${ n }#0`, 'Root/1#0', 'div', '', { box: place( 0, y, 400, 30 ) } ), el( `Root/${ n + 1 }#0`, `Root/${ n }#0`, 'span', words, { depth: 2, box: place( 0, y, 400, 30 ) } ) ];
// A child of the footer root drawn at 375 only (the width alternative of the strip before it).
const phoneOnly = ( n, y, words ) => el( `Root/${ n }#0`, 'Root/1#0', 'div', words, { box: { 375: { x: 0, y, w: 400, h: 30 }, 768: null, 1440: null }, visible: { 375: true, 768: false, 1440: false } } );
const stripRoot = ( key ) => el( key, null, 'div', '', { strip: { side: 'after', distance: 1 }, box: place( 340, 340, 40, 40 ), position: { 375: 'fixed', 768: 'fixed', 1440: 'fixed' } } );
const inv = ( elements, beside = [] ) => ( { generated: 'fixture', source: 'fixture', root: 'footer', checks: { rootKey: 'Root/1#0' }, elements, ...( beside.length ? { beside } : {} ) } );
const run = ( inventory ) => proposeSkeleton( { inventory, facts: facts(), surface: 'footer', surfaceKind: 'footer', surfaceName: 'Footer', db } );
const rows = ( r ) => r.skeleton[ 0 ].innerBlocks;
const flat = ( list ) => list.flatMap( ( n ) => [ n, ...flat( n.innerBlocks || [] ) ] );
const rowHolding = ( r, tpl ) => rows( r ).find( ( n ) => n.draftRef?.tpl === tpl || flat( n.innerBlocks ).some( ( c ) => c.draftRef?.tpl === tpl ) )?.attributes.rowSlot ?? null;

test( 'MUST FAIL: a width-only child of the footer root is built into the row of the sibling it follows (top, columns and bottom)', () => {
	const r = run( inv( [ root(), ...strip( 10, 60, 'Join our newsletter' ), phoneOnly( 12, 60, 'Join' ), ...grid(), phoneOnly( 14, 200, 'Shop' ), ...strip( 20, 300, 'Registered charity 12345' ), phoneOnly( 22, 300, 'Charity 12345' ) ] ) );
	assert.deepEqual( [ 12, 14, 22 ].map( ( n ) => rowHolding( r, `Root/${ n }#0` ) ), [ 'top', 'columns', 'bottom' ] );
	assert.equal( rows( r ).length, 3 );
	assert.deepEqual( r.problems, [] );
} );

test( 'MUST FAIL: a width-only child follows the columns row it comes after, and with no column grid it is built (into the first row that has content), not dropped', () => {
	const r = run( inv( [ root(), ...grid(), phoneOnly( 14, 200, 'Shop' ) ] ) );
	assert.equal( rowHolding( r, 'Root/14#0' ), 'columns' );
	const none = run( inv( [ root(), ...strip( 10, 60, 'Join our newsletter' ), phoneOnly( 12, 60, 'Join' ) ] ) );
	assert.notEqual( rowHolding( none, 'Root/12#0' ), null, 'built, not dropped' );
} );

test( 'a floating element read beside the footer is inside the bottom row of the footer, not a sibling of it', () => {
	const beside = [ stripRoot( 'Root/50#0' ), el( 'Root/51#0', 'Root/50#0', 'a', 'Back to top', { depth: 2, attrs: { href: '#top' } } ) ];
	const r = run( inv( [ root(), ...grid(), ...beside ], [ { key: 'Root/50#0', side: 'after', distance: 1, position: 'fixed', renders: true, holdsOtherRoot: false } ] ) );
	assert.equal( r.skeleton.length, 1, 'one root: nothing beside the footer' );
	assert.equal( rowHolding( r, 'Root/50#0' ), 'bottom' );
	assert.deepEqual( r.proposal.stripRoots, [ 'Root/50#0' ] );
} );
