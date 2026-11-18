/**
 * Standing gate for the sgs/wishlist-panel cards layout: the saved product's card row, the card request, and where
 * keyboard focus goes when an item is removed.
 *
 * NEGATIVE CONTROL: the focus plan is re-run against a deliberately broken copy (it ignores the previous item when the
 * removed one was last) and MUST fail the same assertion the real function passes.
 *
 * Run:  node plugins/sgs-blocks/scripts/tests/test-wishlist-cards.mjs
 * Exit: 0 = green, 1 = red.
 */

import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';

const BS = String.fromCharCode( 92 );

// The source imports its sibling modules without an extension, which webpack resolves and Node does not. Resolving
// it here keeps the test reading the REAL modules.
registerHooks( {
	resolve( specifier, context, nextResolve ) {
		if ( specifier.startsWith( '.' ) && ! /\.[cm]?js$/.test( specifier ) ) {
			const from = fileURLToPath( context.parentURL );
			const guess = path.resolve( path.dirname( from ), specifier + '.js' );
			if ( existsSync( guess ) ) {
				return { url: 'file:///' + guess.split( BS ).join( '/' ), shortCircuit: true };
			}
		}
		return nextResolve( specifier, context );
	},
} );

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const P = ( process.argv[ 2 ] || path.resolve( HERE, '..', '..' ) ).split( BS ).join( '/' );
const BLOCK = 'file:///' + P + '/src/blocks/wishlist-panel';

// render-rows.js reads product names through DOMParser; Node has none. The names in these tests carry no markup.
globalThis.DOMParser = class {
	parseFromString( html ) {
		return { body: { textContent: String( html ).replace( /<[^>]*>/g, '' ) } };
	}
};

const { nextItemId, visibleIds, applyFocus } = await import( BLOCK + '/focus-after-remove.js' );
const { fetchProductCards, chunkIds } = await import( BLOCK + '/cards-api.js' );
const { wishlistRowHtml } = await import( BLOCK + '/render-rows.js' );

let failures = 0;

/**
 * @param {string}  label     Assertion description.
 * @param {boolean} condition Must be truthy to pass.
 */
function assert( label, condition ) {
	if ( condition ) {
		console.log( 'PASS: ' + label );
	} else {
		failures += 1;
		console.error( 'FAIL: ' + label );
	}
}

// ── nextItemId ────────────────────────────────────────────────────────────

assert( 'removing a middle item moves focus to the next one', 30 === nextItemId( [ 10, 20, 30 ], 20 ) );
assert( 'removing the first item moves focus to the next one', 20 === nextItemId( [ 10, 20, 30 ], 10 ) );
assert( 'removing the last item moves focus to the one before', 20 === nextItemId( [ 10, 20, 30 ], 30 ) );
assert( 'removing the only item plans the empty state (null)', null === nextItemId( [ 10 ], 10 ) );
assert( 'an id not on screen plans nothing to focus (null)', null === nextItemId( [ 10, 20 ], 99 ) );

// Negative control: a plan that forgets the previous item cannot pass the "last item" assertion.
const brokenNext = ( ids, id ) => ids[ ids.indexOf( id ) + 1 ] ?? null;
assert( 'negative control: the broken plan fails the last-item assertion', 20 !== brokenNext( [ 10, 20, 30 ], 30 ) );

// ── visibleIds and applyFocus, against a fake DOM ─────────────────────────

function fakeRow( id ) {
	const focusable = {
		focused: false,
		focus() {
			this.focused = true;
		},
	};
	return { dataset: { productId: String( id ) }, focusable, querySelector: () => focusable };
}

function fakeList( ids ) {
	const rows = ids.map( fakeRow );
	const cta = {
		focused: false,
		focus() {
			this.focused = true;
		},
	};
	return {
		rows,
		cta,
		querySelectorAll: () => rows,
		querySelector( selector ) {
			if ( selector.includes( 'empty-cta' ) ) {
				return cta;
			}
			const match = /data-product-id="(\d+)"/.exec( selector );
			return rows.find( ( row ) => match && row.dataset.productId === match[ 1 ] ) ?? null;
		},
	};
}

const list = fakeList( [ 10, 20, 30 ] );
assert( 'visibleIds reads the rows in on-screen order', '10,20,30' === visibleIds( list ).join( ',' ) );
assert(
	'applyFocus focuses the next card and reports it',
	true === applyFocus( list, 30 ) && list.rows[ 2 ].focusable.focused
);
assert(
	'applyFocus leaves the other cards alone',
	! list.rows[ 0 ].focusable.focused && ! list.rows[ 1 ].focusable.focused
);
const emptied = fakeList( [] );
assert(
	'applyFocus with no next card focuses the empty state button',
	true === applyFocus( emptied, null ) && emptied.cta.focused
);
assert( 'applyFocus reports false when the target is gone', false === applyFocus( fakeList( [ 10 ] ), 99 ) );

// ── chunkIds and fetchProductCards ────────────────────────────────────────

assert(
	'chunkIds splits by size',
	'3|3|1' === chunkIds( [ 1, 2, 3, 4, 5, 6, 7 ], 3 ).map( ( c ) => c.length ).join( '|' )
);

const labels = {
	cardsUrl: 'https://example.test/wp-json/sgs/v1/wishlist-cards',
	cardTemplate: '{"a":1}',
	cardSig: 'sig',
	cardsChunk: 2,
};
const calls = [];
const send = async ( url, init ) => {
	const body = JSON.parse( init.body );
	calls.push( { url, init, body } );
	return {
		ok: true,
		json: async () => ( {
			items: body.ids.filter( ( id ) => 4 !== id ).map( ( id ) => ( { id, html: `<div class="card-${ id }"></div>` } ) ),
		} ),
	};
};
const cards = await fetchProductCards( labels, [ 1, 2, 3, 4, 5 ], send );
assert(
	'fetchProductCards sends three chunks of at most two ids',
	3 === calls.length && calls.every( ( c ) => c.body.ids.length <= 2 )
);
assert(
	'fetchProductCards posts the template and signature with every chunk',
	calls.every( ( c ) => '{"a":1}' === c.body.template && 'sig' === c.body.sig && 'POST' === c.init.method )
);
assert( 'fetchProductCards maps each returned card by product id', '<div class="card-3"></div>' === cards.get( 3 ) );
assert( 'a product the route leaves out is absent from the map', ! cards.has( 4 ) && 4 === cards.size );

const failing = await fetchProductCards( labels, [ 1, 2 ], async () => ( { ok: false, json: async () => ( {} ) } ) );
assert( 'a refused request leaves the map empty (plain rows)', 0 === failing.size );
const thrown = await fetchProductCards( labels, [ 1, 2 ], async () => {
	throw new Error( 'offline' );
} );
assert( 'a failed request leaves the map empty', 0 === thrown.size );
const noUrl = await fetchProductCards( { ...labels, cardsUrl: '' }, [ 1 ], send );
assert( 'a panel with no cards URL asks for nothing', 0 === noUrl.size );

// ── wishlistRowHtml on a card ─────────────────────────────────────────────

const rowLabels = {
	removeLabel: 'Remove',
	notifyLabel: 'Notify me',
	outOfStockLabel: 'Out of stock',
	moveLabel: 'Move to basket',
	addToMineLabel: 'Save to my list',
};
const product = { id: 7, name: 'Chocolate Hazelnut', permalink: '/p/7', is_in_stock: true, prices: { price: 500 } };
const base = { showPrice: true, showStock: true, labels: rowLabels, shared: false };
const cardRow = wishlistRowHtml( product, { ...base, cardHtml: '<article class="product-card">CARD</article>' } );
assert( 'a card row holds the server-rendered card', cardRow.includes( '<article class="product-card">CARD</article>' ) );
assert(
	'a card row carries the product id for sort, remove and focus',
	cardRow.includes( 'data-product-id="7"' ) && cardRow.includes( 'sgs-wishlist-panel__row' )
);
const removeMatch =
	/<button type="button" class="sgs-wishlist-panel__remove"[^>]*aria-label="([^"]*)"[^>]*>([^<]*)<\/button>/.exec( cardRow );
assert( 'the remove control is a real button', null !== removeMatch );
assert( 'the remove button is named with the product', removeMatch && 'Remove Chocolate Hazelnut' === removeMatch[ 1 ] );
assert( 'the remove button shows the panel label', removeMatch && 'Remove' === removeMatch[ 2 ] );
assert( 'an in-stock card has no notify button', ! cardRow.includes( 'notify-toggle' ) );
const soldOut = wishlistRowHtml( { ...product, is_in_stock: false }, { ...base, cardHtml: '<article>CARD</article>' } );
assert( 'a sold-out card row offers Notify me and the stock chip', soldOut.includes( 'notify-toggle' ) && soldOut.includes( 'Out of stock' ) );
const noCard = wishlistRowHtml( product, base );
assert(
	'a product with no card draws the plain row',
	! noCard.includes( 'sgs-wishlist-panel__item' ) && noCard.includes( 'sgs-wishlist-panel__row-name' )
);
const sharedRow = wishlistRowHtml( product, { ...base, shared: true, cardHtml: '<article>CARD</article>' } );
assert( 'a read-only shared row stays the plain row', ! sharedRow.includes( 'sgs-wishlist-panel__item' ) );

// -- The frame-cards layout is unchanged --------------------------------------------------------------------------------
// Fixtures captured once from main's render-rows.js (git show main:plugins/sgs-blocks/src/blocks/wishlist-panel/render-rows.js)
// for the product below: the markup a site that saves layout "cards" (or grid) already prints.
const MAIN_FIXTURE = {
	"cards": "<div class=\"sgs-wishlist-panel__row sgs-wishlist-panel__card\" data-product-id=\"7\"><a class=\"sgs-wishlist-panel__card-media\" href=\"/p/7\" tabindex=\"-1\" aria-hidden=\"true\"><img class=\"sgs-wishlist-panel__card-img sgs-media-el\" src=\"/img/7.jpg\" alt=\"\" loading=\"lazy\" decoding=\"async\" /></a><span class=\"sgs-wishlist-panel__card-brand\">Zainab</span><button type=\"button\" class=\"sgs-wishlist-panel__remove sgs-wishlist-panel__card-heart\" data-product-id=\"7\" aria-label=\"Remove Chocolate Hazelnut\"><svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" aria-hidden=\"true\" fill=\"currentColor\"><path d=\"M12 21s-7-4.6-9.3-9A5.4 5.4 0 0 1 12 6.6 5.4 5.4 0 0 1 21.3 12C19 16.4 12 21 12 21z\"/></svg></button><div class=\"sgs-wishlist-panel__card-body\"><a class=\"sgs-wishlist-panel__row-name\" href=\"/p/7\">Chocolate Hazelnut</a><div class=\"sgs-wishlist-panel__card-prices\"><span class=\"sgs-wishlist-panel__row-price\">\u00a35.00</span><span class=\"sgs-wishlist-panel__card-rrp\">\u00a36.50</span></div></div></div>",
	"cardsShared": "<div class=\"sgs-wishlist-panel__row\" data-product-id=\"7\"><a class=\"sgs-wishlist-panel__row-link\" href=\"/p/7\" tabindex=\"-1\" aria-hidden=\"true\"><img class=\"sgs-wishlist-panel__row-thumb sgs-media-el\" src=\"/img/7-t.jpg\" alt=\"\" width=\"64\" height=\"64\" loading=\"lazy\" decoding=\"async\" /></a><div class=\"sgs-wishlist-panel__row-info\"><a class=\"sgs-wishlist-panel__row-name\" href=\"/p/7\">Chocolate Hazelnut</a><span class=\"sgs-wishlist-panel__row-price\">\u00a35.00</span></div><div class=\"sgs-wishlist-panel__row-actions\"><button type=\"button\" class=\"sgs-wishlist-panel__move-to-basket wp-element-button\" data-product-id=\"7\">Move to basket</button><button type=\"button\" class=\"sgs-wishlist-panel__add-to-mine\" data-product-id=\"7\">Save to my list</button></div></div>",
	"grid": "<div class=\"sgs-wishlist-panel__row\" data-product-id=\"7\"><a class=\"sgs-wishlist-panel__row-link\" href=\"/p/7\" tabindex=\"-1\" aria-hidden=\"true\"><img class=\"sgs-wishlist-panel__row-thumb sgs-media-el\" src=\"/img/7-t.jpg\" alt=\"\" width=\"64\" height=\"64\" loading=\"lazy\" decoding=\"async\" /></a><div class=\"sgs-wishlist-panel__row-info\"><a class=\"sgs-wishlist-panel__row-name\" href=\"/p/7\">Chocolate Hazelnut</a><span class=\"sgs-wishlist-panel__row-price\">\u00a35.00</span></div><div class=\"sgs-wishlist-panel__row-actions\"><button type=\"button\" class=\"sgs-wishlist-panel__move-to-basket wp-element-button\" data-product-id=\"7\">Move to basket</button><button type=\"button\" class=\"sgs-wishlist-panel__remove\" data-product-id=\"7\" aria-label=\"Remove Chocolate Hazelnut\">Remove</button></div></div>"
};
const fixtureProduct = {
	id: 7,
	name: 'Chocolate Hazelnut',
	permalink: '/p/7',
	is_in_stock: true,
	images: [ { src: '/img/7.jpg', thumbnail: '/img/7-t.jpg' } ],
	brands: [ { name: 'Zainab' } ],
	prices: { price: 500, regular_price: 650, currency_minor_unit: 2, currency_prefix: '\u00a3', currency_suffix: '' },
};
assert(
	'the cards layout prints the same frame card as main',
	MAIN_FIXTURE.cards === wishlistRowHtml( fixtureProduct, { showPrice: true, layout: 'cards', shared: false, labels: rowLabels } )
);
assert(
	'a shared cards row prints the same plain row as main',
	MAIN_FIXTURE.cardsShared === wishlistRowHtml( fixtureProduct, { showPrice: true, showStock: true, layout: 'cards', shared: true, labels: rowLabels } )
);
assert(
	'the grid layout prints the same row as main',
	MAIN_FIXTURE.grid === wishlistRowHtml( fixtureProduct, { showPrice: true, showStock: true, layout: 'grid', shared: false, labels: rowLabels } )
);

if ( failures > 0 ) {
	console.error( `\n${ failures } assertion(s) failed.` );
	process.exit( 1 );
}
console.log( '\nAll wishlist-cards assertions passed.' );
