// The part-look mode rules in Fill's output (RF7, lib/fill-part-look-modes.mjs): Fill runs part-look's offline draft read for the
// part-look surfaces of its page template and writes their mode values (a card's wishlist heart, brand overlay, saving badge, the buy
// box's button words) onto every node of the block; the related products' loop cards on a product page take the card's rules read
// on that page. Tests marked MUST FAIL fail without the code they name. A stand-in for part-look's read; no browser, no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { modeWrites, partLookModeWrites, partLookSurfacesFor, readLocators } from '../lib/fill-part-look-modes.mjs';

const LOCATORS = readLocators();
const rec = ( index, name, node = {} ) => ( { index, name, node } );
const PRODUCT = () => [ rec( 0, 'sgs/buybox' ), rec( 1, 'sgs/product-card', { itemTemplate: true } ) ];
const SHOP = () => [ rec( 0, 'sgs/container' ), rec( 1, 'sgs/product-card', { itemTemplate: true } ), rec( 2, 'sgs/product-card', { itemTemplate: true } ) ];
const flatOf = ( nodes, attrs = {} ) => nodes.map( ( n ) => ( { name: n.name, attributes: { ...( attrs[ n.index ] || {} ) } } ) );
const refOf = ( flat ) => ( n ) => `cr-ref-${ flat.indexOf( n ) }`;
const mode = ( attr, value, extra = {} ) => ( { attr, value, part: null, property: '(content)', mode: true, evidence: `the draft draws ${ attr }`, draft: { 1440: value }, ...extra } );
const RESULTS = () => ( {
	product: { block: 'sgs/buybox', build: { writes: [ mode( 'addToCartLabel', 'Add to basket' ), { attr: 'addToCartBackground', value: '#fff', property: 'background-color' }, mode( 'addToCartStyle', 'secondary', { preset: true } ) ], gaps: [ { block: 'sgs/buybox', setting: 'showStockStatus', what: 'the stock line holds a number', evidence: '3 left' }, { setting: 'priceColour', what: 'a look gap' } ] } },
	shop: { block: 'sgs/product-card', build: { writes: [ mode( 'showWishlist', true ), mode( 'showBrandOverlay', false ), mode( 'showSavingBadge', true ) ], gaps: [] } },
} );
const wanted = ( nodes, template ) => partLookSurfacesFor( { locators: LOCATORS, template, nodes } );

test( 'MUST FAIL: the part-look surfaces a Fill surface reads: its own template\'s, and the card rules for a loop card drawn on another', () => {
	assert.deepEqual( wanted( PRODUCT(), 'single-product' ), [ { surface: 'product', block: 'sgs/buybox', cross: false }, { surface: 'shop', block: 'sgs/product-card', cross: true } ] );
	assert.deepEqual( wanted( SHOP(), 'archive-product' ), [ { surface: 'shop', block: 'sgs/product-card', cross: false } ] );
	// Negative controls: one card (no loop) on a product page, a page with no shop block, the header's drawer (no page template) and the
	// signed-in account views are not read here.
	assert.deepEqual( wanted( [ rec( 0, 'sgs/buybox' ), rec( 1, 'sgs/product-card' ) ], 'single-product' ).map( ( w ) => w.surface ), [ 'product' ] );
	assert.deepEqual( wanted( [ rec( 0, 'sgs/container' ) ], 'archive-product' ), [] );
	assert.deepEqual( wanted( [ rec( 0, 'sgs/cart' ), rec( 1, 'sgs/account' ) ], null ), [] );
	assert.deepEqual( wanted( [ rec( 0, 'sgs/account' ) ], 'page' ), [] );
	assert.deepEqual( wanted( [ rec( 0, 'sgs/cart', { itemTemplate: true } ), rec( 1, 'sgs/account', { itemTemplate: true } ) ], 'single-product' ), [], 'not even as a loop card' );
} );

test( 'MUST FAIL: the rules\' values are written on every node of the block; looks, presets and other blocks\' gaps are not', () => {
	const nodes = [ ...PRODUCT(), rec( 2, 'sgs/product-card' ) ];
	const flat = flatOf( nodes );
	const out = modeWrites( { results: RESULTS(), wanted: wanted( nodes, 'single-product' ), nodes, flat, refOf: refOf( flat ), attrExists: () => true } );
	assert.deepEqual( out.writes.map( ( w ) => `${ w.node } ${ w.attr }=${ JSON.stringify( w.after ) } ${ w.how }` ), [
		'cr-ref-0 addToCartLabel="Add to basket" part-look-mode',
		'cr-ref-1 showWishlist=true part-look-mode', 'cr-ref-1 showBrandOverlay=false part-look-mode', 'cr-ref-1 showSavingBadge=true part-look-mode',
	], 'the single card (cr-ref-2) is no loop card, so the shop rules read on this page are not its' );
	assert.equal( flat[ 1 ].attributes.showSavingBadge, true );
	assert.deepEqual( out.unmapped.map( ( u ) => `${ u.node } ${ u.property }` ), [ 'cr-ref-0 (mode) showStockStatus' ], 'only a mode rule\'s gap is a row' );
} );

test( 'MUST FAIL: a missing setting and a value held differently are rows; an equal value is not written again', () => {
	const nodes = SHOP();
	const flat = flatOf( nodes, { 1: { showWishlist: false }, 2: { showWishlist: true } } );
	const out = modeWrites( { results: RESULTS(), wanted: wanted( nodes, 'archive-product' ), nodes, flat, refOf: refOf( flat ), attrExists: ( b, a ) => 'showSavingBadge' !== a } );
	assert.equal( flat[ 1 ].attributes.showWishlist, false, 'a value another writer put on the node stays' );
	assert.deepEqual( out.unmapped.map( ( u ) => `${ u.node } ${ u.reason.split( ':' )[ 0 ] }` ), [ 'cr-ref-1 conflict', 'cr-ref-1 part-look shop', 'cr-ref-2 part-look shop' ] );
	assert.match( out.unmapped[ 1 ].reason, /has no showSavingBadge setting/ );
	assert.deepEqual( out.writes.map( ( w ) => `${ w.node } ${ w.attr }` ), [ 'cr-ref-1 showBrandOverlay', 'cr-ref-2 showBrandOverlay' ] );
} );

test( 'MUST FAIL: part-look reads the Fill surface\'s own draft entry, and a refused or failed read writes nothing', async () => {
	const nodes = PRODUCT();
	const entry = { draftDir: 'sites/x/handoff', draftIndex: 'Product.dc.html', target: { template: 'single-product' } };
	let asked = null;
	const fake = ( report ) => async ( args ) => {
		asked = args;
		return { report };
	};
	const run = async ( report, over = {} ) => {
		const flat = flatOf( nodes );
		return { flat, out: await partLookModeWrites( { client: 'x', repo: 'R', entry, nodes, flat, refOf: refOf( flat ), attrExists: () => true, out: 'O', run: fake( report ), ...over } ) };
	};
	const ok = await run( { surfaces: RESULTS(), refusals: [], failures: [], notes: [ 'product: a note' ] } );
	assert.deepEqual( asked.surfaces, [ 'product', 'shop' ] );
	assert.deepEqual( asked.entries, { product: entry, shop: entry }, 'the card rules are read on this page\'s own draft, not the shop page' );
	assert.deepEqual( [ asked.repo, asked.client, asked.out, asked.shots ], [ 'R', 'x', 'O', false ] );
	assert.equal( ok.out.writes.length, 4 );
	assert.ok( ok.out.notes.includes( 'part-look product: a note' ) );
	const refused = await run( { surfaces: RESULTS(), refusals: [ 'shop: the draft\'s wrapper was not located at any width' ], failures: [], notes: [] } );
	assert.deepEqual( refused.out.writes.map( ( w ) => w.attr ), [ 'addToCartLabel' ], 'the refused surface\'s rules are not written' );
	assert.match( refused.out.notes[ 0 ], /^part-look refused shop: / );
	const thrown = await run( null, { run: async () => {
		throw new Error( 'no browser' );
	} } );
	assert.deepEqual( thrown.out.writes, [] );
	assert.match( thrown.out.notes[ 0 ], /the draft read failed, so no mode setting is written: no browser/ );
	asked = null;
	assert.deepEqual( ( await run( { surfaces: RESULTS() }, { entry: { ...entry, noDraft: 'woo page' } } ) ).out.writes, [] );
	assert.equal( asked, null, 'a surface with no draft page is not read' );
} );
