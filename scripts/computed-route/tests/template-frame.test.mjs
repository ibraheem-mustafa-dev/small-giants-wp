// The frame of a WooCommerce page's template copy (Spec 48 FR-48-56, FR-48-87; lib/template-frame.mjs,
// lib/template-piece-frame.mjs, lib/template-copies.mjs::framed): the copy takes the shared header and footer parts only where
// the draft page mounts them; a page drawing its own top bar gets that bar as the template's own part, read with the page
// (inventoryRootFor) and built as a wp_template_part (partsOf, writePart). Planted pages first, then Mama's and Eye Care's
// real fact record extracts and handoff records. Tests marked MUST FAIL fail without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handoffRecords, inventoryRootFor, pageFrame, partsOf, writePart } from '../lib/template-frame.mjs';
import { place } from '../lib/template-piece-frame.mjs';
import { copyTree, framed } from '../lib/template-copies.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const REPO = path.resolve( HERE, '..', '..', '..' );
const FIX = path.join( HERE, 'fixtures', 'template-shell' );
const json = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );

const RECORDS = [ { kind: 'header', dc: 'SiteHeader', route: '*' }, { kind: 'footer', dc: 'SiteFooter', route: '*' }, { kind: 'page', dc: 'Pay', route: 'Pay.dc.html' } ];
// A planted page component: a wrapper (1) holding its own bar (2) and its main (4), or the shared header and footer mounted.
function facts( { mounts = [], bar = true } = {} ) {
	const el = ( n, parent, tag, attrs = {} ) => [ `Pay/${ n }`, { template: { key: `Pay/${ n }`, component: 'Pay', n: String( n ), tag, attrs, parent: parent ? `Pay/${ parent }` : null, parentChain: parent ? [ `Pay/${ parent }` ] : [] } } ];
	return { elements: Object.fromEntries( [
		el( 1, null, 'div' ),
		...( bar ? [ el( 2, 1, 'header' ) ] : [] ),
		...mounts.map( ( name, i ) => el( 10 + i, 1, 'dc-import', { name } ) ),
		el( 4, 1, 'main' ),
	] ) };
}
const TREE = () => [ { name: 'sgs/container', attributes: { tagName: 'div' }, draftRef: { tpl: 'Root/1#0' }, innerBlocks: [
	{ name: 'sgs/container', attributes: { tagName: 'header' }, draftRef: { tpl: 'Root/2#0' }, innerBlocks: [ { name: 'sgs/text', attributes: { text: 'Back' }, draftRef: { tpl: 'Root/3#0' } } ] },
	{ name: 'sgs/container', attributes: { tagName: 'main' }, draftRef: { tpl: 'Root/4#0' }, innerBlocks: [ { name: 'core/post-content', attributes: {} } ] },
] } ];
const INVENTORY = { elements: [ { key: 'Root/1#0', parentKey: null, tag: 'div' }, { key: 'Root/2#0', parentKey: 'Root/1#0', tag: 'header' }, { key: 'Root/3#0', parentKey: 'Root/2#0', tag: 'a' }, { key: 'Root/4#0', parentKey: 'Root/1#0', tag: 'main' } ] };
const PIECE = { id: 'frame', block: 'core/template-part', required: false, once: false, kind: 'frame' };
const ctxOf = ( extra = {} ) => ( { key: 'checkout', tree: TREE(), inventory: INVENTORY, factRecord: facts(), rootComponent: 'Pay', records: RECORDS, ...extra } );

test( 'MUST FAIL: a page that mounts neither shared part, with one element before its <main>, draws its own top bar', () => {
	assert.deepEqual( pageFrame( { facts: facts(), records: RECORDS, component: 'Pay', mainKey: 'Pay/4' } ), { header: 'own', footer: 'none', bar: 'Pay/2', root: 'Pay/1', main: 'Pay/4', reasons: [ 'Pay does not mount the shared header (SiteHeader)', 'Pay does not mount the shared footer (SiteFooter)', 'its own top bar is Pay/2 (<header>), beside its <main> and before it' ] } );
} );

test( 'a page that imports the shared header and footer mounts both; one in the same component as the header mounts it', () => {
	const shared = pageFrame( { facts: facts( { mounts: [ 'SiteHeader', 'SiteFooter' ] } ), records: RECORDS, component: 'Pay', mainKey: 'Pay/4' } );
	assert.deepEqual( [ shared.header, shared.footer, shared.bar ], [ 'shared', 'shared', null ] );
	const same = pageFrame( { facts: facts(), records: [ { kind: 'header', dc: 'Pay', route: '*' }, { kind: 'footer', dc: 'Pay', route: '*' } ], component: 'Pay', mainKey: 'Pay/4' } );
	assert.deepEqual( [ same.header, same.footer ], [ 'shared', 'shared' ] );
	const header = pageFrame( { facts: facts( { mounts: [ 'SiteHeader' ] } ), records: RECORDS, component: 'Pay', mainKey: 'Pay/4' } );
	assert.deepEqual( [ header.header, header.footer ], [ 'shared', 'none' ] );
	const none = pageFrame( { facts: facts( { bar: false } ), records: RECORDS, component: 'Pay', mainKey: 'Pay/4' } );
	assert.deepEqual( [ none.header, none.bar ], [ 'none', null ] );
	const noRecords = pageFrame( { facts: facts(), records: [], component: 'Pay', mainKey: 'Pay/4' } );
	assert.deepEqual( [ noRecords.header, noRecords.footer ], [ 'shared', 'shared' ] );
} );

test( 'MUST FAIL: the frame piece marks the bar as the template\'s own part and the main with its frame, dropping the page wrapper', () => {
	const got = place( ctxOf(), PIECE );
	assert.deepEqual( got.tree.map( ( n ) => [ n.draftRef.tpl, n.templatePart ?? null, n.templateFrame ?? null ] ), [ [ 'Root/2#0', 'checkout-header', null ], [ 'Root/4#0', null, { header: 'checkout-header', footer: null } ] ] );
	assert.deepEqual( got.placed, [ { id: 'frame', block: 'core/template-part', at: 'Root/2#0' } ] );
} );

test( 'a page that does mount the shared header and footer keeps its tree, so the copy keeps both shared parts', () => {
	const got = place( ctxOf( { factRecord: facts( { mounts: [ 'SiteHeader', 'SiteFooter' ] } ) } ), PIECE );
	assert.deepEqual( got.tree, TREE() );
	assert.deepEqual( framed( got.tree ).map( ( n ) => [ n.name, n.attributes?.slug ?? n.attributes?.tagName ] ), [ [ 'core/template-part', 'header' ], [ 'sgs/container', 'main' ], [ 'core/template-part', 'footer' ] ] );
} );

test( 'a tree read from <main> alone, where the page draws its own bar, is left with the shared frame and a note', () => {
	const main = TREE()[ 0 ].innerBlocks[ 1 ];
	const got = place( ctxOf( { tree: [ main ], inventory: { elements: [ { key: 'Root/4#0', parentKey: 'Root/1#0', tag: 'main' } ] } } ), PIECE );
	assert.deepEqual( got.tree, [ main ] );
	assert.match( got.notes[ 0 ], /holds no node for its top bar Root\/2#0/ );
} );

test( 'MUST FAIL: the copy of a marked tree is the page\'s own part, the main and no footer; the part is the bar with the marks taken off', () => {
	const marked = place( ctxOf(), PIECE ).tree;
	const copy = copyTree( { slug: 'checkout', whole: marked } );
	assert.deepEqual( copy.map( ( n ) => [ n.name, n.attributes ] ), [ [ 'core/template-part', { slug: 'checkout-header', tagName: 'div' } ], [ 'sgs/container', { tagName: 'main' } ] ] );
	assert.equal( JSON.stringify( copy ).includes( 'templateFrame' ), false );
	const parts = partsOf( marked );
	assert.deepEqual( parts.map( ( p ) => p.slug ), [ 'checkout-header' ] );
	assert.deepEqual( parts[ 0 ].tree, [ TREE()[ 0 ].innerBlocks[ 0 ] ] );
	// A bar that is no header element gets a header part, the banner landmark; a page with no header part gets none.
	const plainBar = marked.map( ( n ) => ( n.templatePart ? { ...n, attributes: { tagName: 'div' } } : n ) );
	assert.deepEqual( framed( plainBar )[ 0 ].attributes, { slug: 'checkout-header', tagName: 'header' } );
	const noHeader = [ { ...marked[ 1 ], templateFrame: { header: null, footer: 'footer' } } ];
	assert.deepEqual( framed( noHeader ).map( ( n ) => n.attributes?.slug ?? n.attributes?.tagName ), [ 'main', 'footer' ] );
} );

test( 'the part tree is written where the site run builds it from', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'tr-shell-' ) );
	const file = writePart( dir, { slug: 'checkout-header', tree: [ { name: 'sgs/text' } ] } );
	assert.equal( file, path.join( dir, 'trees', 'template-part', 'checkout-header.json' ) );
	assert.deepEqual( json( file ), [ { name: 'sgs/text' } ] );
	fs.rmSync( dir, { recursive: true, force: true } );
} );

test( 'MUST FAIL: the inventory of a page drawing its own bar is read from the wrapper holding the bar and the main', () => {
	const skel = { root: { tag: 'main' }, inventory: { checks: { rootName: 'Pay', rootKey: 'Pay/4#0' } } };
	const entry = { target: { template: 'checkout' }, draftDir: 'nowhere' };
	const handoff = fs.mkdtempSync( path.join( os.tmpdir(), 'tr-shell-' ) );
	fs.writeFileSync( path.join( handoff, 'surfaces.json' ), JSON.stringify( { records: RECORDS } ) );
	const at = { ...entry, draftDir: handoff };
	assert.equal( inventoryRootFor( { repo: REPO, client: 'x', entry: at, skel, facts: facts() } ), '[data-dc-tpl="1"]:has(> [data-dc-tpl="4"])' );
	assert.equal( inventoryRootFor( { repo: REPO, client: 'x', entry: at, skel, facts: facts( { mounts: [ 'SiteHeader', 'SiteFooter' ] } ) } ), null );
	assert.equal( inventoryRootFor( { repo: REPO, client: 'x', entry: { ...at, target: { template: 'single-product' } }, skel, facts: facts() } ), null );
	assert.equal( inventoryRootFor( { repo: REPO, client: 'x', entry: at, skel: { ...skel, root: { tag: 'div' } }, facts: facts() } ), null );
	fs.rmSync( handoff, { recursive: true, force: true } );
} );

// The real inputs: the handoff records are committed, the fact record elements are fixtures (facts.json is gitignored).
test( 'Mama\'s checkout draws its own bar beside its main and mounts no footer; its basket mounts both; Eye Care\'s checkout mounts both', () => {
	const mamas = json( path.join( FIX, 'mamas-facts.json' ) );
	const records = handoffRecords( path.join( REPO, 'sites', 'mamas-munches-redesign', 'handoff' ) );
	const checkout = pageFrame( { facts: mamas, records, component: 'Checkout', mainKey: 'Checkout/16' } );
	assert.deepEqual( [ checkout.header, checkout.footer, checkout.bar, checkout.root ], [ 'own', 'none', 'Checkout/7', 'Checkout/6' ] );
	const basket = pageFrame( { facts: mamas, records, component: 'Basket', mainKey: 'Basket/8' } );
	assert.deepEqual( [ basket.header, basket.footer ], [ 'shared', 'shared' ] );
	const skel = { root: { tag: 'main' }, inventory: { checks: { rootName: 'Checkout', rootKey: 'Checkout/16#0' } } };
	const entry = { target: { template: 'checkout' }, draftDir: 'sites/mamas-munches-redesign/handoff' };
	assert.equal( inventoryRootFor( { repo: REPO, client: 'mamas-munches-redesign', entry, skel, facts: mamas } ), '[data-dc-tpl="6"]:has(> [data-dc-tpl="16"])' );
	assert.equal( inventoryRootFor( { repo: REPO, client: 'mamas-munches-redesign', entry: { ...entry, target: { template: 'cart' } }, skel: { root: { tag: 'main' }, inventory: { checks: { rootName: 'Basket', rootKey: 'Basket/8#0' } } }, facts: mamas } ), null );
	const eye = pageFrame( { facts: json( path.join( FIX, 'eye-care-facts.json' ) ), records: handoffRecords( path.join( REPO, 'sites', 'eye-care-ward-end', 'handoff' ) ), component: 'Eye Care Birmingham', mainKey: 'Eye Care Birmingham/737' } );
	assert.deepEqual( [ eye.header, eye.footer ], [ 'shared', 'shared' ] );
} );
