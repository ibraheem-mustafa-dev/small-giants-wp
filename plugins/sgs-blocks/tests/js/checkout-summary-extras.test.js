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
