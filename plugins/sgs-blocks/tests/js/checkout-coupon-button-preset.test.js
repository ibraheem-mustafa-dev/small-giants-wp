/**
 * The coupon Apply button in the order summary takes the primary button preset like the place-order button (WooCommerce
 * buttons take the SGS button preset), sized to its own row rather than the full width.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const css = fs
	.readFileSync( path.resolve( __dirname, '../../../../theme/sgs-theme/assets/css/woocommerce.css' ), 'utf8' )
	.replace( /\r/g, '' );

const COUPON = '.wc-block-components-totals-coupon__button.wc-block-components-button';

function ruleFor( selector, afterNeedle ) {
	const from = afterNeedle ? css.indexOf( afterNeedle ) : 0;
	const at = css.indexOf( selector, from );
	if ( at < 0 ) {
		return null;
	}
	return css.slice( css.lastIndexOf( '}', at ) + 1, css.indexOf( '}', at ) );
}

describe( 'coupon button preset', () => {
	test( 'the resting rule that paints the place-order button also lists the coupon button', () => {
		const rule = ruleFor( COUPON );
		expect( rule ).not.toBeNull();
		expect( rule ).toContain( '.wc-block-components-checkout-place-order-button.wc-block-components-button' );
		expect( rule ).toContain( 'background-color: var(--wp--preset--color--primary)' );
	} );

	test( 'the hover rule lists it too', () => {
		const rule = ruleFor( COUPON + ':hover' );
		expect( rule ).not.toBeNull();
		expect( rule ).toContain( 'button-presets--primary--hover-background' );
	} );

	test( 'the coupon button is not stretched to the full width', () => {
		const rule = ruleFor( COUPON + ' {', '.wp-block-woocommerce-checkout-actions-block .wp-element-button:hover' );
		expect( rule ).not.toBeNull();
		expect( rule ).toContain( 'width: auto' );
	} );
} );
