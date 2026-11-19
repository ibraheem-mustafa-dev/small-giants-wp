/**
 * @jest-environment jsdom
 *
 * sgs/buybox note (Spec 27 FR-27-PS8): the pure rules, the view that publishes the text and gates the add, and the product-card
 * store half (the add request's `fields` row and the express payment buttons' extra fields and inert state).
 */

import { charsLeft, isNearLimit, noteRow, noteReady } from '../../src/blocks/buybox/note-logic.js';

describe( 'note rules', () => {
	test( 'characters left counts whole characters and never goes below 0', () => {
		expect( charsLeft( 'abc', 10 ) ).toBe( 7 );
		expect( charsLeft( 'a😀b', 10 ) ).toBe( 7 );
		expect( charsLeft( 'x'.repeat( 12 ), 10 ) ).toBe( 0 );
	} );

	test( 'the count speaks only near the limit', () => {
		expect( isNearLimit( 250, 300 ) ).toBe( false );
		expect( isNearLimit( 60, 300 ) ).toBe( true );
		expect( isNearLimit( 61, 300 ) ).toBe( false );
		expect( isNearLimit( 20, 50 ) ).toBe( true );
		expect( isNearLimit( 0, 0 ) ).toBe( false );
	} );

	test( 'the fields row is labelled, trimmed, capped and flagged as a note; an empty box makes none', () => {
		expect( noteRow( 'Allergies or dietary needs?', '  vegan  ', 300 ) ).toEqual( { label: 'Allergies or dietary needs?', value: 'vegan', note: true } );
		expect( noteRow( 'L', 'abcdef', 3 ).value ).toBe( 'abc' );
		expect( noteRow( 'L', '   ', 300 ) ).toBeNull();
	} );

	test( 'only a compulsory empty note blocks the add', () => {
		expect( noteReady( true, '' ) ).toBe( false );
		expect( noteReady( true, ' ' ) ).toBe( false );
		expect( noteReady( true, 'nuts' ) ).toBe( true );
		expect( noteReady( false, '' ) ).toBe( true );
	} );
} );

const NOTE = ( required = false, max = 40 ) => `
<div class="sgs-buybox" data-wp-interactive="sgs/product-card">
  <div class="sgs-buybox__note" data-sgs-note data-max="${ max }" data-required="${ required ? 1 : 0 }" data-label="Allergies or dietary needs?" data-required-message="Please fill this in." data-left-message="%d characters left">
    <label for="n">Allergies or dietary needs?</label>
    <textarea class="sgs-buybox__note-input" id="n" maxlength="${ max }"></textarea>
    <span class="sgs-buybox__note-count" aria-hidden="true"></span>
    <span class="sgs-buybox__note-status" role="status" aria-live="polite"></span>
    <p class="sgs-buybox__note-error" role="alert" hidden></p>
  </div>
  <form class="buybox__cart-form"><button type="submit">Add</button></form>
</div>`;

async function mountView( required, max ) {
	jest.resetModules();
	document.body.innerHTML = NOTE( required, max );
	await import( '../../src/blocks/buybox/note-view.js' );
	return document.querySelector( '.sgs-buybox' );
}

const type = ( root, text ) => {
	const input = root.querySelector( 'textarea' );
	input.value = text;
	input.dispatchEvent( new Event( 'input', { bubbles: true } ) );
	return input;
};

describe( 'note view', () => {
	test( 'typing keeps the labelled row on the root and the count visible; leaving the box tells the store to look again', async () => {
		const root = await mountView( false, 40 );
		const seen = jest.fn();
		root.addEventListener( 'sgs:picks-changed', seen );
		const input = type( root, 'vegan, egg-free' );
		expect( JSON.parse( root.dataset.extraNote ) ).toEqual( { label: 'Allergies or dietary needs?', value: 'vegan, egg-free', note: true } );
		expect( root.querySelector( '.sgs-buybox__note-count' ).textContent ).toBe( '15 / 40' );
		expect( seen ).not.toHaveBeenCalled();
		input.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		expect( seen ).toHaveBeenCalledTimes( 1 );
		type( root, '' );
		expect( root.dataset.extraNote ).toBeUndefined();
	} );

	test( 'the polite count speaks only near the limit and only when it changes', async () => {
		const root = await mountView( false, 100 );
		const status = root.querySelector( '.sgs-buybox__note-status' );
		type( root, 'x'.repeat( 50 ) );
		expect( status.textContent ).toBe( '' );
		type( root, 'x'.repeat( 85 ) );
		expect( status.textContent ).toBe( '15 characters left' );
		type( root, 'x'.repeat( 100 ) );
		expect( status.textContent ).toBe( '0 characters left' );
		type( root, 'x'.repeat( 10 ) );
		expect( status.textContent ).toBe( '' );
	} );

	test( 'a compulsory empty note is not ready, refuses the add before the store sees it, then clears once written', async () => {
		const root = await mountView( true, 40 );
		expect( root.dataset.sgsNoteReady ).toBe( '0' );
		const reachedStore = jest.fn();
		root.querySelector( 'form' ).addEventListener( 'submit', reachedStore );
		const submit = new Event( 'submit', { bubbles: true, cancelable: true } );
		root.querySelector( 'form' ).dispatchEvent( submit );
		expect( submit.defaultPrevented ).toBe( true );
		expect( reachedStore ).not.toHaveBeenCalled();
		const error = root.querySelector( '.sgs-buybox__note-error' );
		expect( error.hidden ).toBe( false );
		expect( error.textContent ).toBe( 'Please fill this in.' );
		expect( root.querySelector( 'textarea' ).getAttribute( 'aria-invalid' ) ).toBe( 'true' );
		expect( document.activeElement ).toBe( root.querySelector( 'textarea' ) );

		const seen = jest.fn();
		root.addEventListener( 'sgs:picks-changed', seen );
		type( root, 'nuts' );
		expect( root.dataset.sgsNoteReady ).toBe( '1' );
		expect( seen ).toHaveBeenCalledTimes( 1 );
		expect( error.hidden ).toBe( true );
		const ok = new Event( 'submit', { bubbles: true, cancelable: true } );
		root.querySelector( 'form' ).dispatchEvent( ok );
		expect( ok.defaultPrevented ).toBe( false );
		expect( reachedStore ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'an optional empty note never blocks the add', async () => {
		const root = await mountView( false, 40 );
		const ok = new Event( 'submit', { bubbles: true, cancelable: true } );
		root.querySelector( 'form' ).dispatchEvent( ok );
		expect( ok.defaultPrevented ).toBe( false );
		expect( root.dataset.sgsNoteReady ).toBe( '1' );
	} );
} );

describe( 'product-card store half', () => {
	let storeConfig;
	let filters;
	let fetchCalls;
	let ctx;
	let ref;

	async function mountStore( noteRaw, extra = {} ) {
		jest.resetModules();
		filters = {};
		fetchCalls = [];
		storeConfig = null;
		document.body.innerHTML = '<div class="sgs-buybox" data-wp-interactive="sgs/product-card"><span id="marker"></span><div class="sgs-buybox__express" inert><button class="wallet">Pay</button></div><p class="sgs-buybox__express-note"></p><button class="buybox__add-to-cart"></button></div>';
		ref = document.querySelector( '.sgs-buybox' );
		if ( noteRaw ) {
			ref.dataset.extraNote = noteRaw;
		}
		Object.assign( ref.dataset, extra );
		ctx = { addToCartId: 42, selectedVariationId: 0, inStock: true, pending: false, combos: {}, axes: [], selectedAxes: {}, restNonce: 'n' };
		window.wcStripe = {
			actions: {
				addFilter: ( name, fn ) => {
					filters[ name ] = fn;
				},
				applyFilters: ( name, value ) => ( filters[ name ] ? filters[ name ]( value ) : value ),
				doAction: jest.fn(),
			},
			product: {},
			cart: { cartCalculation: jest.fn() },
		};
		jest.doMock( '@wordpress/interactivity', () => ( {
			store: ( name, config ) => {
				if ( 'sgs/product-card' === name ) {
					storeConfig = config;
				}
				return config;
			},
			getContext: () => ctx,
			getElement: () => ( { ref: document.getElementById( 'marker' ) } ),
		} ), { virtual: true } );
		jest.doMock( '../../src/shared/wishlist-store', () => ( {} ) );
		jest.doMock( '../../src/shared/toast/store.js', () => ( { toastActions: { showAdded: jest.fn(), showError: jest.fn() } } ) );
		jest.doMock( '../../src/blocks/product-card/thumb-strip', () => ( { renderThumbStrip: jest.fn() } ) );
		jest.doMock( '../../src/blocks/product-card/photo-source', () => ( { applyPhoto: jest.fn() } ) );
		jest.doMock( '../../src/shared/motion-state-publish', () => ( { pulseState: jest.fn() } ) );
		jest.doMock( '../../src/shared/rest-nonce', () => ( {
			fetchWithNonce: ( url, init ) => {
				fetchCalls.push( { url, body: JSON.parse( init.body ) } );
				return Promise.resolve( { ok: true, json: () => Promise.resolve( { items_count: 1 } ) } );
			},
		} ) );
		await import( '../../src/blocks/product-card/view.js' );
		storeConfig.callbacks.initExpress();
	}

	async function runAdd() {
		const run = storeConfig.actions.addToCart( { preventDefault() {} } );
		let step = run.next();
		while ( ! step.done ) {
			step = run.next( await step.value );
		}
	}

	const row = JSON.stringify( { label: 'Allergies or dietary needs?', value: 'Egg-free', note: true } );

	test( 'the add request carries the note as one fields row', async () => {
		await mountStore( row );
		await runAdd();
		expect( fetchCalls[ 0 ].body.fields ).toEqual( [ { label: 'Allergies or dietary needs?', value: 'Egg-free', note: true } ] );
	} );

	test( 'the note joins guided answers already in fields, and an add with no note has no fields', async () => {
		await mountStore( row, { extraFields: JSON.stringify( [ { label: 'Topping', value: 'Sprinkles' } ] ) } );
		await runAdd();
		expect( fetchCalls[ 0 ].body.fields.map( ( r ) => r.label ) ).toEqual( [ 'Topping', 'Allergies or dietary needs?' ] );

		await mountStore( '' );
		await runAdd();
		expect( fetchCalls[ 0 ].body.fields ).toBeUndefined();
	} );

	test( 'the express payment buttons carry the note, the same way as the picks', async () => {
		await mountStore( row );
		expect( filters.add_to_cart_data ).toBeDefined();
		expect( filters.add_to_cart_data( { product_id: 42 } ) ).toEqual( { product_id: 42, sgs_note: 'Egg-free', sgs_note_label: 'Allergies or dietary needs?' } );
		expect( filters.cart_calculation_data( {} ).sgs_note ).toBe( 'Egg-free' );
		expect( document.querySelector( '.sgs-buybox__express' ).hasAttribute( 'inert' ) ).toBe( false );
	} );

	test( 'with no note the express request has no note fields', async () => {
		await mountStore( '' );
		expect( filters.add_to_cart_data( { product_id: 42 } ) ).toEqual( { product_id: 42 } );
	} );

	test( 'a compulsory empty note keeps the wallet buttons inert, and writing it frees them', async () => {
		await mountStore( '', { sgsNoteReady: '0' } );
		const box = document.querySelector( '.sgs-buybox__express' );
		expect( box.hasAttribute( 'inert' ) ).toBe( true );
		expect( box.dataset.state ).toBe( 'unavailable' );
		ref.dataset.sgsNoteReady = '1';
		ref.dataset.extraNote = row;
		ref.dispatchEvent( new CustomEvent( 'sgs:picks-changed' ) );
		expect( box.hasAttribute( 'inert' ) ).toBe( false );
		expect( box.dataset.state ).toBe( 'ready' );
	} );
} );
