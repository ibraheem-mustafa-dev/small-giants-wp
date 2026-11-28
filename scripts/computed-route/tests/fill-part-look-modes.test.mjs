// The part-look mode rules in Fill's output (RF7, lib/fill-part-look-modes.mjs): Fill runs part-look's offline draft read for the
// part-look surfaces of its page template and writes their mode values (a card's wishlist heart, brand overlay, saving badge, the buy
// box's button words) onto every node of the block; the related products' loop cards on a product page take the card's rules read
// on that page. Tests marked MUST FAIL fail without the code they name. A stand-in for part-look's read; no browser, no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { modeWrites, partLookModeWrites, partLookSurfacesFor, readLocators, settingDeclared } from '../lib/fill-part-look-modes.mjs';
import { openDb } from '../lib/db.mjs';
import { cleanTree } from '../lib/fill-skeleton.mjs';

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

// A page (no WooCommerce template) whose row of product tiles the skeleton placed tile by tile (rules.productTile: `loopItem`).
const TILES = () => [ rec( 0, 'sgs/container' ), rec( 1, 'sgs/product-card', { loopItem: true } ), rec( 2, 'sgs/product-card', { loopItem: true } ), rec( 3, 'sgs/product-card' ) ];

test( 'MUST FAIL: a page\'s product tiles take the card rules read on that page, so a tile shows no pickers the draft does not draw', async () => {
	assert.deepEqual( wanted( TILES(), null ), [ { surface: 'shop', block: 'sgs/product-card', cross: true } ], 'a page with no template' );
	assert.deepEqual( wanted( TILES(), 'page' ), [ { surface: 'shop', block: 'sgs/product-card', cross: true } ] );
	const nodes = TILES();
	const flat = flatOf( nodes );
	const results = { shop: { block: 'sgs/product-card', build: { writes: [ mode( 'showPickers', false ), mode( 'showLadder', false ), mode( 'cardContentSource', 'product' ) ], gaps: [] } } };
	const out = modeWrites( { results, wanted: wanted( nodes, null ), nodes, flat, refOf: refOf( flat ), attrExists: () => true } );
	assert.deepEqual( out.writes.map( ( w ) => `${ w.node } ${ w.attr }=${ JSON.stringify( w.after ) }` ), [
		'cr-ref-1 showPickers=false', 'cr-ref-1 showLadder=false', 'cr-ref-1 cardContentSource="product"',
		'cr-ref-2 showPickers=false', 'cr-ref-2 showLadder=false', 'cr-ref-2 cardContentSource="product"',
	], 'the lone card (cr-ref-3) is no tile of the loop' );
	// Fill reads the card rules on the page's own draft entry.
	let asked = null;
	const entry = { draftDir: 'sites/x/handoff', draftIndex: 'Gifts.dc.html', target: { postId: 9 } };
	const run = async ( args ) => {
		asked = args;
		return { report: { surfaces: results, refusals: [], failures: [], notes: [] } };
	};
	const f2 = flatOf( nodes );
	const got = await partLookModeWrites( { client: 'x', repo: 'R', entry, nodes, flat: f2, refOf: refOf( f2 ), attrExists: () => true, out: 'O', run } );
	assert.deepEqual( [ asked.surfaces, asked.entries ], [ [ 'shop' ], { shop: entry } ] );
	assert.equal( got.writes.length, 6 );
	// Negative controls: a page whose cards are all lone cards reads nothing, and the marker never reaches the built tree.
	assert.deepEqual( wanted( [ rec( 0, 'sgs/product-card' ), rec( 1, 'sgs/product-card' ) ], null ), [] );
	assert.equal( 'loopItem' in cleanTree( [ { name: 'sgs/product-card', attributes: {}, loopItem: true, innerBlocks: [] } ] )[ 0 ], false );
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

test( 'MUST FAIL: a write to one key of an object setting (the account’s tab words) is merged into that setting', () => {
	const nodes = [ { index: 0, name: 'sgs/account', node: {} } ];
	const flat = flatOf( nodes, { 0: { strings: { orders: 'Orders' } } } );
	const results = { 'my-account-in': { block: 'sgs/account', build: { writes: [ mode( 'strings.addresses', 'Addresses' ), mode( 'strings.orders', 'Orders' ), mode( 'strings.savedItems', 'Wishlist' ) ], gaps: [] } } };
	const wanted = [ { surface: 'my-account-in', block: 'sgs/account', cross: false } ];
	const out = modeWrites( { results, wanted, nodes, flat, refOf: refOf( flat ), attrExists: ( b, a ) => 'strings' === a } );
	assert.deepEqual( flat[ 0 ].attributes.strings, { orders: 'Orders', addresses: 'Addresses', savedItems: 'Wishlist' } );
	assert.deepEqual( out.writes.map( ( w ) => w.attr ), [ 'strings', 'strings' ], 'the equal key is not written again' );
	assert.deepEqual( out.unmapped, [] );
	// Negative controls: a key that differs is a conflict; a setting that is no object, and a block with no such setting, are rows.
	const held = flatOf( nodes, { 0: { strings: { orders: 'My orders' } } } );
	assert.match( modeWrites( { results, wanted, nodes, flat: held, refOf: refOf( held ), attrExists: () => true } ).unmapped[ 0 ].reason, /^conflict: strings.orders already holds "My orders"/ );
	const flatText = flatOf( nodes, { 0: { strings: 'x' } } );
	assert.match( modeWrites( { results, wanted, nodes, flat: flatText, refOf: refOf( flatText ), attrExists: () => true } ).unmapped[ 0 ].reason, /not an object to set addresses in/ );
	const none = flatOf( nodes );
	assert.match( modeWrites( { results, wanted, nodes, flat: none, refOf: refOf( none ), attrExists: () => false } ).unmapped[ 0 ].reason, /has no strings setting/ );
} );

test( 'MUST FAIL: a setting is checked in the framework database, so WooCommerce blocks’ extension settings are written', async () => {
	const db = openDb();
	const has = settingDeclared( db );
	assert.deepEqual( [ has( 'woocommerce/product-filter-chips', 'sgsChipCountPill' ), has( 'woocommerce/cart', 'sgsFieldLabelPosition' ), has( 'sgs/account', 'strings' ), has( 'woocommerce/product-filter-chips', 'noSuchSetting' ) ], [ true, true, true, false ] );
	const nodes = [ { index: 0, name: 'woocommerce/product-filter-chips', node: {} } ];
	const flat = flatOf( nodes );
	const report = { surfaces: { 'shop-chips': { block: 'woocommerce/product-filter-chips', build: { writes: [ mode( 'sgsChipCountPill', true ), mode( 'sgsChipSingle', true ), mode( 'noSuchSetting', 1 ) ], gaps: [] } } }, refusals: [], failures: [], notes: [] };
	const out = await partLookModeWrites( { client: 'x', repo: 'R', entry: { target: { template: 'archive-product' } }, nodes, flat, refOf: refOf( flat ), db, out: 'O', run: async () => ( { report } ) } );
	assert.deepEqual( out.writes.map( ( w ) => w.attr ), [ 'sgsChipCountPill', 'sgsChipSingle' ] );
	assert.match( out.unmapped[ 0 ].reason, /has no noSuchSetting setting/ );
} );
