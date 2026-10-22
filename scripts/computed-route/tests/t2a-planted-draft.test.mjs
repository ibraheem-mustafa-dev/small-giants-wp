// Spec 48 §3.4 rules.headerSlots, read from a real page: a planted draft with a strip drawn above the header (and a fixed chat
// button and the page's own content beside it) is read by the real inventory reader in a browser
// (lib/skeleton-inventory.mjs::readInventory with `strips`), then proposed by the real proposal. The strip is the header's top
// row with the rule's slot attribute, and is raised again as a problem when only that write reference (the rule's
// `slotAttribute`) is removed. The page's content and the fixed button are never read as strips, and without the exclusion
// of the page root the content would be (the negative control).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { readInventory } from '../lib/skeleton-inventory.mjs';
import { stripOptions } from '../lib/intake-skeletons.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );

// The runtime's bridges the reader needs: the stamped template per host (none here) and the root host's name.
const HTML = `<!doctype html><html><head><style>body{margin:0}</style></head><body>
<div class="sc-host" data-sc-name="Root" data-dc-tpl="">
	<div data-dc-tpl="1">
		<div data-dc-tpl="2" style="position:relative;height:30px">Free delivery over 50 pounds</div>
		<div data-dc-tpl="3" style="position:fixed;right:0;bottom:0;width:40px;height:40px">Chat</div>
		<header data-dc-tpl="4" style="height:60px"><div data-dc-tpl="5" style="display:flex"><nav data-dc-tpl="6"><a data-dc-tpl="7" href="/shop">Shop</a> <a data-dc-tpl="8" href="/help">Help</a></nav></div></header>
		<main data-dc-tpl="9" style="height:300px"><h1 data-dc-tpl="10">Page</h1></main>
	</div>
</div></body></html>`;

let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( async () => {
	await browser?.close();
} );

// The surfaces of the planted export: the header, the page (its root is the main), and the strip as a global surface.
const SURFACES = [ { id: 'S-1', kind: 'global', component: 'Root', rootTpl: '2' }, { id: 'S-2', kind: 'header', component: 'Root', rootTpl: '4' }, { id: 'S-3', kind: 'page', component: 'Root', rootTpl: '9' } ];
const header = SURFACES[ 1 ];

async function read( strips, html = HTML ) {
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	await page.setContent( html );
	await page.evaluate( () => {
		window.__dcAnnotatedTemplate = () => '';
		window.__dcRootName = () => 'Root';
	} );
	try {
		return await readInventory( { page, root: 'header', settle: async () => {}, strips } );
	} finally {
		await page.close();
	}
}
const propose = ( inventory, f = facts() ) => proposeSkeleton( { inventory, facts: f, surface: 'header', surfaceKind: 'header', surfaceName: 'Header', db } );
const rowSlots = ( r ) => r.skeleton[ 0 ].innerBlocks.map( ( n ) => [ n.attributes.rowSlot, n.draftRef?.tpl ?? null ] );

test( 'the reader finds the strip beside the header and not the fixed button or the page content (the page root is excluded)', async () => {
	const strips = stripOptions( header, SURFACES );
	assert.deepEqual( strips, { exclude: [ [ 'Root', '9' ] ] }, 'only the roots of surfaces that are not global (the header itself apart)' );
	const inv = await read( strips );
	assert.deepEqual( inv.beside.map( ( b ) => [ b.key, b.side, b.position, b.renders, b.holdsOtherRoot ] ), [ [ 'Root/3#0', 'before', 'fixed', true, false ], [ 'Root/9#0', 'after', 'static', true, true ], [ 'Root/2#0', 'before', 'relative', true, false ] ], 'nearest the header first' );
	const roots = inv.elements.filter( ( e ) => e.strip );
	assert.deepEqual( roots.map( ( e ) => [ e.key, e.parentKey, e.strip.side ] ), [ [ 'Root/2#0', null, 'before' ] ] );
	assert.ok( ! inv.elements.some( ( e ) => [ 'Root/3#0', 'Root/9#0', 'Root/10#0' ].includes( e.key ) ), 'the chat button and the page are not in the header\'s inventory' );
	assert.equal( inv.elements[ 0 ].key, 'Root/4#0', 'the header root stays first' );
} );

test( 'MUST FAIL: the planted strip is the header\'s top row, and is raised as a problem again with the slot attribute removed', async () => {
	const inv = await read( stripOptions( header, SURFACES ) );
	const r = propose( inv );
	assert.deepEqual( rowSlots( r ), [ [ 'top', 'Root/2#0' ], [ 'middle', 'Root/5#0' ], [ 'bottom', null ] ] );
	assert.deepEqual( r.problems, [] );
	const f = facts();
	const nulled = { ...f, decisions: { ...f.decisions, rules: { ...f.decisions.rules, headerSlots: { ...f.decisions.rules.headerSlots, slotAttribute: null } } } };
	const raised = propose( inv, nulled );
	assert.ok( raised.problems.some( ( p ) => p.startsWith( 'Root/2#0' ) && /no row/.test( p ) ), `the strip is raised again: ${ JSON.stringify( raised.problems ) }` );
	assert.ok( raised.skeleton[ 0 ].innerBlocks.every( ( n ) => undefined === n.attributes.rowSlot ), 'nothing was assigned a slot' );
} );

test( 'negative control: without the other surfaces\' roots excluded, the page content beside the header is read as a bottom strip', async () => {
	const inv = await read( { exclude: [] } );
	assert.deepEqual( inv.beside.find( ( b ) => 'Root/9#0' === b.key ).holdsOtherRoot, false );
	const r = propose( inv );
	assert.deepEqual( rowSlots( r ).map( ( x ) => x[ 0 ] ), [ 'top', 'middle', 'bottom' ] );
	assert.equal( rowSlots( r )[ 2 ][ 1 ], 'Root/9#0', 'the exclusion of the page root is what keeps the page out of the header' );
} );

test( 'a surface that is not a header reads no siblings', async () => {
	assert.equal( stripOptions( SURFACES[ 2 ], SURFACES ), null );
	const inv = await read( null );
	assert.equal( inv.beside, undefined );
	assert.ok( ! inv.elements.some( ( e ) => e.strip ) );
} );

// A header with one sibling after it, whose own markup is given; the sibling's tpl is 11.
const withAfter = ( markup ) => `<!doctype html><html><head><style>body{margin:0}</style></head><body><div class="sc-host" data-sc-name="Root" data-dc-tpl="">
	<div data-dc-tpl="1"><header data-dc-tpl="4" style="height:60px"><div data-dc-tpl="5" style="display:flex"><nav data-dc-tpl="6"><a data-dc-tpl="7" href="/shop">Shop</a></nav></div></header>${ markup }</div></div></body></html>`;
const surfacesWithPageAt = ( tpl ) => [ header, { id: 'S-3', kind: 'page', component: 'Root', rootTpl: tpl } ];

test( 'MUST FAIL: a page root that is a plain section inside a wrapper sibling makes that sibling hold another surface\'s root, with no <main> anywhere', async () => {
	const inv = await read( stripOptions( header, surfacesWithPageAt( '12' ) ), withAfter( '<div data-dc-tpl="11" style="height:300px"><section data-dc-tpl="12"><h1 data-dc-tpl="13">Page</h1></section></div>' ) );
	assert.deepEqual( inv.beside.map( ( b ) => [ b.key, b.holdsOtherRoot ] ), [ [ 'Root/11#0', true ] ] );
	assert.deepEqual( rowSlots( propose( inv ) ).map( ( x ) => x[ 1 ] ), [ null, 'Root/5#0', null ], 'the page is not the bottom row' );
} );

test( 'MUST FAIL: a <main> that is no surface\'s root is not "page content" by its tag: with no surface in it the in-flow stacked block is a strip, listed for review', async () => {
	const inv = await read( stripOptions( header, surfacesWithPageAt( '99' ) ), withAfter( '<main data-dc-tpl="11" style="height:300px"><h1 data-dc-tpl="12">Notes</h1></main>' ) );
	assert.deepEqual( inv.beside.map( ( b ) => [ b.key, b.holdsOtherRoot ] ), [ [ 'Root/11#0', false ] ], 'the tag does not decide' );
	assert.deepEqual( rowSlots( propose( inv ) ).map( ( x ) => x[ 1 ] ), [ null, 'Root/5#0', 'Root/11#0' ] );
} );
