// Template shells and the order confirmation (Spec 48 FR-48-56, FR-48-87, Bean S1 and S4): pages whose wrappers differ only by
// their own ref class share a shell, so a derived template is not left with an empty one; a `template` row (the order
// confirmation) is matched to the draft's page or result record that plays it, so its copy is built from the draft's layout
// around WooCommerce's order-confirmation blocks; and that region is found from the order summary. Tests marked MUST FAIL
// fail on the code before these rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { commerceOf } from '../lib/skeleton-commerce-region.mjs';
import { WHOLE_TREE, commonChain, contentUnder, copySource, splitShell } from '../lib/template-copies.mjs';
import { buildManifest, matchRecord } from '../lib/manifest-build.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );

// Two pages whose single wrapper carries its own Fill ref class.
const wrapper = ( ref, extra = {} ) => ( { name: 'sgs/container', attributes: { tagName: 'div', backgroundColour: 'cream', className: `${ ref } sgs-page`, ...extra }, innerBlocks: [ { name: 'sgs/heading', attributes: { content: ref } } ] } );
const PAGE_A = [ wrapper( 'cr-ref-aaaa1111' ) ];
const PAGE_B = [ wrapper( 'cr-ref-bbbb2222' ) ];

test( 'MUST FAIL: wrappers that differ only by their own cr-ref class are the same shell, and a page\'s content is found under it', () => {
	const chain = commonChain( [ splitShell( PAGE_A ).chain, splitShell( PAGE_B ).chain ] );
	assert.equal( chain.length, 1, 'the common shell is the one wrapper both pages have' );
	assert.equal( chain[ 0 ].attributes.backgroundColour, 'cream' );
	assert.equal( contentUnder( PAGE_B, chain )[ 0 ].attributes.content, 'cr-ref-bbbb2222', 'the second page sits under the shell the first one gave' );
	const alone = commonChain( [ splitShell( PAGE_A ).chain ] );
	assert.equal( alone.length, 1 );
} );

test( 'negative control: a different background, a different class or a different tag is no shared shell', () => {
	assert.deepEqual( commonChain( [ splitShell( PAGE_A ).chain, splitShell( [ wrapper( 'cr-ref-bbbb2222', { backgroundColour: 'white' } ) ] ).chain ] ), [] );
	assert.deepEqual( commonChain( [ splitShell( PAGE_A ).chain, splitShell( [ wrapper( 'cr-ref-bbbb2222', { className: 'cr-ref-bbbb2222 other' } ) ] ).chain ] ), [], 'a class that is not a ref still counts' );
	assert.deepEqual( commonChain( [ splitShell( PAGE_A ).chain, splitShell( [ wrapper( 'cr-ref-bbbb2222', { tagName: 'main' } ) ] ).chain ] ), [] );
	assert.throws( () => contentUnder( [ wrapper( 'cr-ref-cccc3333', { backgroundColour: 'white' } ) ], commonChain( [ splitShell( PAGE_A ).chain ] ) ), /does not start with the template's shell/ );
} );

const row = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...o } );
const OC = row( { slug: 'order-confirmation', title: 'Order confirmed', route: 'Confirmation.dc.html', template: 'order-confirmation', postType: 'template' } );
const rec = ( id, kind, page_key ) => ( { id, kind, name: id, page_key, route: page_key, states: [ { name: 'Default', keys: {} } ], dc: 'Site' } );
const HOME = row( { slug: 'home', route: 'Home.dc.html', template: 'front-page', id: 5 } );

test( 'MUST FAIL: a template row is matched to the result record that plays it, a page record before a result of the same page', () => {
	const result = rec( 'S-32', 'result', 'Confirmation' );
	assert.equal( matchRecord( OC, [ rec( 'S-1', 'page', 'Home' ), result ] ).record?.id, 'S-32' );
	const page = rec( 'S-33', 'page', 'Confirmation' );
	assert.equal( matchRecord( OC, [ result, page ] ).record?.id, 'S-33', 'the page record is the surface when both exist' );
	assert.equal( matchRecord( { ...OC, draftId: 'surfaces.json S-32' }, [ page, result ] ).record?.id, 'S-32', 'a row naming its record by id still takes it' );
} );

test( 'negative control: an ordinary page row never takes a result record, and a template row needs its own page key', () => {
	const result = rec( 'S-32', 'result', 'Confirmation' );
	assert.match( matchRecord( row( { slug: 'confirmation', route: 'Confirmation.dc.html' } ), [ result ] ).reason, /no page record matches/ );
	assert.match( matchRecord( OC, [ rec( 'S-40', 'result', 'Other' ) ] ).reason, /no page record matches/ );
	assert.match( matchRecord( OC, [ rec( 'S-41', 'form', 'Confirmation' ) ] ).reason, /no page record matches/ );
} );

test( 'MUST FAIL: the order confirmation is built from the draft\'s result surface, not from the page copy\'s shell around the theme\'s content', () => {
	const target = { envFile: 'e.env', envKey: 'K' };
	const out = buildManifest( { client: 'c', site: 's', rows: [ HOME, OC ], records: [ rec( 'S-1', 'page', 'Home' ), rec( 'S-32', 'result', 'Confirmation' ) ], target, entryFile: 'Site.dc.html', vocab: [ { state: 'hover' } ] } ).entries;
	assert.deepEqual( out[ 'template-order-confirmation' ].copy, { from: 'fill', row: 'template:order-confirmation' } );
	const none = buildManifest( { client: 'c', site: 's', rows: [ HOME, OC ], records: [ rec( 'S-1', 'page', 'Home' ) ], target, entryFile: 'Site.dc.html', vocab: [ { state: 'hover' } ] } ).entries;
	assert.deepEqual( none[ 'template-order-confirmation' ].copy, { from: 'page', unplayed: 'template:order-confirmation' }, 'with no record the copy stays the page shell around the theme\'s content' );
	assert.ok( WHOLE_TREE.includes( 'order-confirmation' ) );
	assert.equal( copySource( [ OC ], 'order-confirmation' ), 'whole', 'the copy is the whole Filled tree with WooCommerce\'s blocks placed in it' );
} );

// The order confirmation's commerce region: the order summary, a card holding the order lines loop and the amount paid.
const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w = 300, h = 100 ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: 'Root', tpl: num( key ), attrs: {}, words, allText: x.all ?? words, membership: x.loop ? [ { kind: 'sc-for', list: '{{ items }}', as: 'it', tpl: String( x.loop ) } ] : [], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: place( 0, 100 ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} } );
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
const run = ( elements, commerce ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'test', commerce, db } );
const find = ( tree, name ) => {
	for ( const n of tree ) {
		if ( n.name === name ) {
			return n;
		}
		const inner = find( n.innerBlocks || [], name );
		if ( inner ) {
			return inner;
		}
	}
	return null;
};
const CONFIRMATION = [
	el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
	el( 'Root/2#0', 'Root/1#0', 'h1', 'Your order is in' ),
	el( 'Root/3#0', 'Root/1#0', 'div', '', { depth: 1 } ),
	el( 'Root/4#0', 'Root/3#0', 'div', '', { depth: 2 } ),
	el( 'Root/5#0', 'Root/4#0', 'div', '', { depth: 3, loop: 5, all: 'Zookies £12.00' } ),
	el( 'Root/6#0', 'Root/5#0', 'span', '£12.00', { depth: 4, loop: 5 } ),
	el( 'Root/5#1', 'Root/4#0', 'div', '', { depth: 3, loop: 5, all: 'Gift box £18.00' } ),
	el( 'Root/6#1', 'Root/5#1', 'span', '£18.00', { depth: 4, loop: 5 } ),
	el( 'Root/7#0', 'Root/3#0', 'div', 'Paid £30.00', { depth: 2 } ),
	el( 'Root/8#0', 'Root/1#0', 'p', 'We have emailed your receipt', { depth: 1 } ),
];

test( 'MUST FAIL: the order confirmation\'s summary (the lines and the amount paid) is WooCommerce\'s totals; the draft\'s heading and notes stay', () => {
	assert.equal( commerceOf( { target: { template: 'order-confirmation' } }, [] ).role, 'confirmation' );
	const { skeleton, proposal, problems } = run( CONFIRMATION, { role: 'confirmation', checkout: null } );
	assert.deepEqual( problems, [] );
	assert.equal( proposal.commerceRegion.key, 'Root/3#0', 'the smallest element holding the lines loop and the amount paid beside it' );
	const wrapperNode = find( skeleton, 'woocommerce/order-confirmation-totals-wrapper' );
	assert.ok( wrapperNode, 'WooCommerce\'s order summary stands where the draft\'s is' );
	assert.equal( wrapperNode.draftRef, undefined, 'WooCommerce draws the order: Fill reads nothing into it' );
	assert.equal( wrapperNode.innerBlocks[ 0 ].name, 'woocommerce/order-confirmation-totals' );
	assert.ok( find( skeleton, 'sgs/heading' ), 'the draft heading stays' );
	assert.ok( find( skeleton, 'sgs/text' ), 'the draft note stays' );
	assert.ok( proposal.rows.filter( ( r ) => 'absorbed' === r.action && 'commerceRegion' === r.rule ).some( ( r ) => 'Root/7#0' === r.key ), 'the amount paid is drawn by WooCommerce' );
} );

test( 'negative control: no order lines loop, no amount outside it, or a page that is not the confirmation place no region', () => {
	const noLoop = CONFIRMATION.filter( ( e ) => ! [ 'Root/5#0', 'Root/6#0', 'Root/5#1', 'Root/6#1' ].includes( e.key ) );
	assert.equal( run( noLoop, { role: 'confirmation', checkout: null } ).proposal.commerceRegion, undefined );
	const noTotal = [ ...CONFIRMATION.filter( ( e ) => 'Root/7#0' !== e.key ), el( 'Root/9#0', 'Root/3#0', 'div', 'Your order', { depth: 2 } ) ];
	assert.equal( run( noTotal, { role: 'confirmation', checkout: null } ).proposal.commerceRegion, undefined, 'lines with no amount beside them are no order summary' );
	assert.equal( find( run( CONFIRMATION, null ).skeleton, 'woocommerce/order-confirmation-totals-wrapper' ), null, 'an ordinary page is untouched' );
	assert.equal( find( run( CONFIRMATION, { role: 'cart', checkout: 'Checkout.dc.html' } ).skeleton, 'woocommerce/order-confirmation-totals-wrapper' ), null );
} );
