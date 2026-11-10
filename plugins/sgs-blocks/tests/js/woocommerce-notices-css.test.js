/**
 * WooCommerce notices read the same tokens as sgs/notice-banner and put the action link on its own line on narrow screens.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const root = path.resolve( __dirname, '../../../../theme/sgs-theme' );
const css = fs.readFileSync( path.join( root, 'assets/css/woocommerce-notices.css' ), 'utf8' ).replace( /\r/g, '' );
const fn = fs.readFileSync( path.join( root, 'functions.php' ), 'utf8' );

describe( 'woocommerce notices', () => {
	test.each( [
		[ 'info-light', 'info' ],
		[ 'success-light', 'success' ],
		[ 'accent-light', 'accent-text' ],
		[ 'error-light', 'error' ],
	] )( 'variant uses the %s and %s tokens', ( bg, border ) => {
		expect( css ).toContain( `--wp--preset--color--${ bg }` );
		expect( css ).toContain( `--wp--preset--color--${ border }` );
	} );

	test( 'covers blocks and classic notices', () => {
		for ( const s of [ '.is-success', '.is-error', '.is-warning', '.woocommerce-info', '.woocommerce-message', '.woocommerce-error' ] ) {
			expect( css ).toContain( s );
		}
	} );

	test( 'radius matches the notice banner and the link stacks when narrow', () => {
		expect( css ).toContain( '--wp--custom--border-radius--medium' );
		expect( css ).toMatch( /@media \(max-width: 767px\)[\s\S]*column-reverse/ );
	} );

	test( 'is enqueued after woocommerce.css', () => {
		expect( fn ).toMatch( /'sgs-woocommerce-notices'[\s\S]*?array\( 'sgs-woocommerce' \)/ );
	} );
} );
