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
<div class="wp-block-woocommerce-checkout-order-summary-block">
	<div class="wc-block-components-checkout-order-summary__title"><p class="wc-block-components-checkout-order-summary__title-text">Your bag</p></div>
	<div class="wc-block-components-order-summary-item"><a class="wc-block-components-product-name" href="https://example.test/p/frame/">Frame</a></div>
	<div class="wc-block-components-order-summary-item"><a class="wc-block-components-product-name" href="https://example.test/p/other/">Other</a></div>
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
	test( 'adds the Edit link after the summary heading, once', () => {
		run( { editLabel: 'Edit', editUrl: 'https://example.test/bag/', brand: false } );
		const links = document.querySelectorAll( '.sgs-checkout-summary-edit' );
		expect( links ).toHaveLength( 1 );
		expect( links[ 0 ].getAttribute( 'href' ) ).toBe( 'https://example.test/bag/' );
		expect( links[ 0 ].textContent ).toBe( 'Edit' );
		expect( links[ 0 ].previousElementSibling.className ).toBe( 'wc-block-components-checkout-order-summary__title' );
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

	test( 'watches the order summary wrapper, never the whole body, once it exists', () => {
		load( SUMMARY, { editLabel: 'Edit', editUrl: '/bag/', brand: true } );
		const targets = observed.map( ( o ) => o.target ).filter( Boolean );
		expect( targets ).toHaveLength( 1 );
		expect( targets[ 0 ].className ).toBe( 'wp-block-woocommerce-checkout-order-summary-block' );
	} );

	test( 'before the wrapper exists it watches the body, then hands over to the wrapper and disconnects the body watch', () => {
		load( '<div id="x"></div>', { editLabel: 'Edit', editUrl: '/bag/', brand: false } );
		expect( observed[ 0 ].target ).toBe( document.body );
		document.body.innerHTML = SUMMARY;
		observed[ 0 ].cb( [] );
		expect( observed[ 0 ].target ).toBeNull();
		expect( observed.some( ( o ) => o.target && o.target.className === 'wp-block-woocommerce-checkout-order-summary-block' ) ).toBe( true );
	} );

	test( 'a burst of mutations runs one pass per animation frame', () => {
		load( SUMMARY, { editLabel: 'Edit', editUrl: '/bag/', brand: false } );
		document.querySelector( '.sgs-checkout-summary-edit' ).remove();
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
