/**
 * The count badge paints its circle on a z-index:-1 ::after layer, as does the icon trigger's hover fill. The badge needs
 * its own stacking context, or the trigger's later layer paints over the circle.
 */
const fs = require( 'fs' );
const path = require( 'path' );

test( 'the cart count badge isolates its circle from the trigger hover fill', () => {
	const css = fs.readFileSync( path.resolve( __dirname, '..', '..', 'src/blocks/cart/style.css' ), 'utf8' );
	const rule = css.match( /(?:^|\n)\.sgs-cart__badge \{[^}]*\}/ )[ 0 ];
	expect( rule ).toMatch( /isolation:\s*isolate/ );
} );
