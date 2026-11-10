/**
 * Checkout order summary extras: the Edit link beside the summary heading and the brand under each line's name.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const SCRIPT = fs.readFileSync(
	path.resolve( __dirname, '../../includes/woocommerce/commerce-look/summary-extras.js' ),
	'utf8'
);

const SUMMARY = `
<div class="wp-block-woocommerce-checkout">
<div class="wc-block-checkout__login-wrap"><a class="wc-block-checkout__login-prompt" href="/my-account/">Sign in</a></div>
<div class="wp-block-woocommerce-checkout-contact-information-block"><div class="wc-block-components-checkout-step__container"><input type="email"></div></div>
<div class="wp-block-woocommerce-checkout-order-summary-block">
	<div class="wc-block-components-checkout-order-summary__title"><p class="wc-block-components-checkout-order-summary__title-text">Your bag</p></div>
	<div class="wc-block-components-order-summary-item"><a class="wc-block-components-product-name" href="https://example.test/p/frame/">Frame</a></div>
	<div class="wc-block-components-order-summary-item"><a class="wc-block-components-product-name" href="https://example.test/p/other/">Other</a></div>
</div>
<div class="wp-block-woocommerce-checkout-order-summary-block checkout-order-summary-block-fill-wrapper">
	<div class="wc-block-components-checkout-step__heading"><h2 class="wc-block-components-title wc-block-components-checkout-step__title">Your bag</h2></div>
</div>
</div>`;

function run( config ) {
	document.body.innerHTML = SUMMARY;
	window.sgsCheckoutSummaryExtrasConfig = config;
	window.wp = {
		data: {
			subscribe: () => {},
			select: () => ( {
				getCartData: () => ( {
					items: [
						{ name: 'Frame', permalink: 'https://example.test/p/frame/', extensions: { sgs: { brand: 'Lindberg' } } },
						{ name: 'Other', permalink: 'https://example.test/p/other/', extensions: { sgs: { brand: '' } } },
					],
				} ),
			} ),
		},
	};
	// eslint-disable-next-line no-new-func
	new Function( SCRIPT )();
}

describe( 'checkout summary extras', () => {
	test( 'puts the Edit link inside the summary heading bar, once, on both the wide and the stacked summary', () => {
		run( { editLabel: 'Edit', editUrl: 'https://example.test/bag/', brand: false } );
		const links = document.querySelectorAll( '.sgs-checkout-summary-edit' );
		expect( links ).toHaveLength( 2 );
		expect( links[ 0 ].getAttribute( 'href' ) ).toBe( 'https://example.test/bag/' );
		expect( links[ 0 ].textContent ).toBe( 'Edit' );
		expect( links[ 0 ].parentElement.className ).toBe( 'wc-block-components-checkout-order-summary__title' );
		expect( links[ 1 ].parentElement.className ).toBe( 'wc-block-components-checkout-step__heading' );
		// eslint-disable-next-line no-new-func
		new Function( SCRIPT )();
		expect( document.querySelectorAll( '.sgs-checkout-summary-edit' ) ).toHaveLength( 2 );
		expect( document.querySelector( '.sgs-checkout-item-brand' ) ).toBeNull();
	} );

	test( 'adds the brand before the name of a line that has one', () => {
		run( { editLabel: '', editUrl: '', brand: true } );
		const brands = document.querySelectorAll( '.sgs-checkout-item-brand' );
		expect( brands ).toHaveLength( 1 );
		expect( brands[ 0 ].textContent ).toBe( 'Lindberg' );
		expect( brands[ 0 ].nextElementSibling.textContent ).toBe( 'Frame' );
		expect( document.querySelector( '.sgs-checkout-summary-edit' ) ).toBeNull();
	} );
} );

describe( 'checkout login prefix', () => {
	const PREFIX = 'Already have an account? ';

	test( 'adds the text as a span with an SGS class beside the Log in link, outside the link, without moving the link', () => {
		run( { editLabel: '', editUrl: '', brand: false, loginPrefix: PREFIX } );
		const same = document.querySelector( '.wc-block-checkout__login-prompt' );
		const span = document.querySelector( '.sgs-checkout-login-prefix' );
		expect( span.tagName ).toBe( 'SPAN' );
		expect( span.textContent ).toBe( PREFIX );
		expect( span.parentNode ).toBe( same.parentNode );
		expect( span.parentNode.className ).toBe( 'wc-block-checkout__login-wrap' );
		expect( same.contains( span ) ).toBe( false );
		expect( same.textContent ).toBe( 'Sign in' );
	} );

	test( 'the link node is the one React rendered, not a copy', () => {
		run( { editLabel: '', editUrl: '', brand: false, loginPrefix: PREFIX } );
		const link = document.querySelector( '.wc-block-checkout__login-prompt' );
		expect( link.getAttribute( 'href' ) ).toBe( '/my-account/' );
		expect( document.querySelectorAll( '.wc-block-checkout__login-prompt' ) ).toHaveLength( 1 );
	} );

	test( 'hides the span from assistive technology and names the link with the whole phrase', () => {
		run( { editLabel: '', editUrl: '', brand: false, loginPrefix: PREFIX } );
		const link = document.querySelector( '.wc-block-checkout__login-prompt' );
		expect( document.querySelector( '.sgs-checkout-login-prefix' ).getAttribute( 'aria-hidden' ) ).toBe( 'true' );
		expect( link.getAttribute( 'aria-label' ) ).toBe( 'Already have an account? Sign in' );
		expect( link.textContent ).toBe( 'Sign in' );
	} );

	test( 'a second pass keeps one span and the same label; a re-rendered link gets the label again', () => {
		run( { editLabel: '', editUrl: '', brand: false, loginPrefix: PREFIX } );
		// eslint-disable-next-line no-new-func
		new Function( SCRIPT )();
		expect( document.querySelectorAll( '.sgs-checkout-login-prefix' ) ).toHaveLength( 1 );
		const link = document.querySelector( '.wc-block-checkout__login-prompt' );
		expect( link.getAttribute( 'aria-label' ) ).toBe( 'Already have an account? Sign in' );
		const fresh = link.cloneNode( true );
		fresh.removeAttribute( 'aria-label' );
		link.replaceWith( fresh );
		// eslint-disable-next-line no-new-func
		new Function( SCRIPT )();
		expect( document.querySelector( '.wc-block-checkout__login-prompt' ).getAttribute( 'aria-label' ) ).toBe( 'Already have an account? Sign in' );
		expect( document.querySelectorAll( '.sgs-checkout-login-prefix' ) ).toHaveLength( 1 );
	} );

	test( 'with no prefix set nothing is added to the link', () => {
		run( { editLabel: '', editUrl: '', brand: false, loginPrefix: '' } );
		const link = document.querySelector( '.wc-block-checkout__login-prompt' );
		expect( link.hasAttribute( 'aria-label' ) ).toBe( false );
		expect( document.querySelector( '.sgs-checkout-login-prefix' ) ).toBeNull();
	} );

	test( 'a second render adds the text once', () => {
		run( { editLabel: '', editUrl: '', brand: false, loginPrefix: PREFIX } );
		// eslint-disable-next-line no-new-func
		new Function( SCRIPT )();
		expect( document.querySelectorAll( '.sgs-checkout-login-prefix' ) ).toHaveLength( 1 );
	} );
} );

describe( 'checkout summary extras: observing', () => {
	const originalObserver = window.MutationObserver;
	let observed;
	let frames;

	function install() {
		observed = [];
		frames = [];
		window.requestAnimationFrame = ( cb ) => {
			frames.push( cb );
			return frames.length;
		};
		window.MutationObserver = class {
			constructor( cb ) {
				this.cb = cb;
				observed.push( this );
			}
			observe( target ) {
				this.target = target;
			}
			disconnect() {
				this.target = null;
			}
		};
	}

	function load( html, config ) {
		document.body.innerHTML = html;
		window.sgsCheckoutSummaryExtrasConfig = config;
		window.wp = { data: { subscribe: () => () => {}, select: () => ( { getCartData: () => ( { items: [] } ) } ) } };
		// eslint-disable-next-line no-new-func
		new Function( SCRIPT )();
	}

	beforeEach( install );
	afterEach( () => {
		window.MutationObserver = originalObserver;
	} );

	test( 'watches the Checkout block, never the whole body, once it exists', () => {
		load( SUMMARY, { editLabel: 'Edit', editUrl: '/bag/', brand: true } );
		const targets = observed.map( ( o ) => o.target ).filter( Boolean );
		expect( targets ).toHaveLength( 1 );
		expect( targets[ 0 ].className ).toBe( 'wp-block-woocommerce-checkout' );
	} );

	test( 'before the wrapper exists it watches the body, then hands over to the wrapper and disconnects the body watch', () => {
		load( '<div id="x"></div>', { editLabel: 'Edit', editUrl: '/bag/', brand: false } );
		expect( observed[ 0 ].target ).toBe( document.body );
		document.body.innerHTML = SUMMARY;
		observed[ 0 ].cb( [] );
		expect( observed[ 0 ].target ).toBeNull();
		expect( observed.some( ( o ) => o.target && o.target.className === 'wp-block-woocommerce-checkout' ) ).toBe( true );
	} );

	test( 'a burst of mutations runs one pass per animation frame', () => {
		load( SUMMARY, { editLabel: 'Edit', editUrl: '/bag/', brand: false } );
		document.querySelectorAll( '.sgs-checkout-summary-edit' ).forEach( ( link ) => link.remove() );
		const watcher = observed.find( ( o ) => o.target );
		watcher.cb( [] );
		watcher.cb( [] );
		watcher.cb( [] );
		expect( frames ).toHaveLength( 1 );
		expect( document.querySelector( '.sgs-checkout-summary-edit' ) ).toBeNull();
		frames[ 0 ]();
		expect( document.querySelector( '.sgs-checkout-summary-edit' ) ).not.toBeNull();
	} );
} );

describe( 'checkout signed-in line', () => {
	const LINE = 'Signed in as bean@example.test. This order will be saved to your account.';

	test( 'adds the line as the last child of the Contact step, once', () => {
		run( { editLabel: '', editUrl: '', brand: false, signedInLine: LINE } );
		// eslint-disable-next-line no-new-func
		new Function( SCRIPT )();
		const lines = document.querySelectorAll( '.sgs-checkout-signed-in' );
		expect( lines ).toHaveLength( 1 );
		expect( lines[ 0 ].tagName ).toBe( 'P' );
		expect( lines[ 0 ].textContent ).toBe( LINE );
		expect( lines[ 0 ].parentElement.className ).toBe( 'wp-block-woocommerce-checkout-contact-information-block' );
		expect( lines[ 0 ].parentElement.lastElementChild ).toBe( lines[ 0 ] );
	} );

	test( 'adds nothing without the text', () => {
		run( { editLabel: 'Edit', editUrl: 'https://example.test/bag/', brand: false, signedInLine: '' } );
		expect( document.querySelector( '.sgs-checkout-signed-in' ) ).toBeNull();
	} );
} );
