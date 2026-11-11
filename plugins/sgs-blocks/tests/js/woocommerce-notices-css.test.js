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

	test( 'the action link is a plain text link in the text colour, underlined, never a grey button', () => {
		const start = css.indexOf( '/* The action link reads as a text link' );
		expect( start ).toBeGreaterThan( -1 );
		const rule = css.slice( start, css.indexOf( '}', start ) );
		expect( rule ).toContain( 'color: var(--wp--preset--color--text' );
		expect( rule ).toContain( 'text-decoration-line: underline' );
		expect( rule ).toContain( 'background: none' );
		expect( rule ).toContain( 'text-transform: none' );
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

	// WooCommerce's wc-blocks.css paints each variant at two classes (`.wc-block-components-notice-banner.is-info`), so a
	// one-class rule loses to it whatever the order; the theme paints at two classes too, and loads after.
	describe( 'block notices win against wc-blocks.css by painting at two classes', () => {
		const rule = ( selector ) =>
			css
				.replace( /\/\*[\s\S]*?\*\//g, '' )
				.split( '}' )
				.filter( ( block ) => block.includes( '{' ) && block.split( '{' )[ 0 ].split( ',' ).map( ( x ) => x.trim() ).includes( selector ) )
				.map( ( block ) => block.split( '{' )[ 1 ] )
				.join( ';' );

		test.each( [ 'is-info', 'is-success', 'is-warning', 'is-error' ] )( '.%s paints its background and edge from the notice tokens', ( variant ) => {
			const body = rule( `.wc-block-components-notice-banner.${ variant }` );
			expect( body ).toContain( 'background-color: var(--_notice-bg)' );
			expect( body ).toContain( 'border-color: var(--_notice-border)' );
		} );
		test.each( [ 'is-info', 'is-success', 'is-warning', 'is-error' ] )( '.%s icon takes no background fill of its own', ( variant ) => {
			expect( rule( `.wc-block-components-notice-banner.${ variant } > svg` ) ).toContain( 'background: none' );
		} );

		test( 'the action link takes the text colour against the three-class .wc-forward colour rule in wc-blocks.css', () => {
			const body = rule( '.wc-block-components-notice-banner > .wc-block-components-notice-banner__content .wc-forward' );
			expect( body ).toContain( 'color: var(--wp--preset--color--text' );
			expect( body ).toContain( '!important' ); // wc-blocks.css sets that colour with !important.
		} );

		test( 'the info icon is painted in the text colour for every variant, never the pale edge colour', () => {
			const body = rule( '.wc-block-components-notice-banner > svg' );
			expect( body ).toContain( 'fill: var(--wp--preset--color--text' );
			expect( body ).toContain( 'color: var(--wp--preset--color--text' );
			expect( css ).not.toContain( 'fill: var(--_notice-border)' );
		} );
	} );
	// A classic notice can be a `ul` of `li` errors or hold inline <strong> and <a> in its text, so it is never a flex row:
	// the errors stack and the inline text flows. Only the block banner (an icon, then its content) lays out as flex.
	describe( 'a classic notice flows as a block; only the block banner is a flex row', () => {
		const stripped = css.replace( /\/\*[\s\S]*?\*\//g, '' );
		const bodies = ( selector ) =>
			stripped
				.split( '}' )
				.filter( ( block ) => block.includes( '{' ) && block.split( '{' )[ 0 ].split( ',' ).map( ( x ) => x.trim() ).includes( selector ) )
				.map( ( block ) => block.split( '{' )[ 1 ] );

		test.each( [ '.woocommerce-info', '.woocommerce-message', '.woocommerce-error' ] )( '%s is never display:flex', ( selector ) => {
			for ( const body of bodies( selector ) ) {
				expect( body ).not.toMatch( /display:\s*flex/ );
				expect( body ).not.toMatch( /align-items/ );
			}
		} );

		test( 'the block banner keeps its flex row with the icon centred', () => {
			const all = bodies( '.wc-block-components-notice-banner' ).join( ';' );
			expect( all ).toMatch( /display:\s*flex/ );
			expect( all ).toMatch( /align-items:\s*center/ );
		} );

		test( 'a classic notice contains its floated children and keeps the button beside the text', () => {
			expect( bodies( '.woocommerce-error' ).join( ';' ) ).toMatch( /display:\s*flow-root/ );
			expect( bodies( '.woocommerce-info .button' ).join( ';' ) ).toMatch( /display:\s*inline-block/ );
		} );
	} );
} );
