/**
 * Only a success toast plays the full life (rise, hold, drift out, fade). An error toast has no auto-close, so it only
 * fades in and then stays readable until it is closed.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const css = fs.readFileSync( path.resolve( __dirname, '../../assets/toast/toast.css' ), 'utf8' ).replace( /\r/g, '' );

describe( 'toast motion by variant', () => {
	test( 'the life keyframes are scoped to the success variant', () => {
		expect( css ).not.toMatch( /(^|\n)\.sgs-toast--animated\.sgs-toast--visible\s*\{\s*animation-name:\s*sgs-toast-life/ );
		expect( css ).toMatch( /\.sgs-toast--success\.sgs-toast--animated\.sgs-toast--visible\s*\{\s*animation-name:\s*sgs-toast-life/ );
	} );

	test( 'an error toast fades in and ends fully visible', () => {
		const rule = css.match( /\.sgs-toast--error\.sgs-toast--animated\.sgs-toast--visible\s*\{([^}]*)\}/ );
		expect( rule ).not.toBeNull();
		expect( rule[ 1 ] ).toContain( 'animation-name: sgs-toast-in' );
		const keyframes = css.match( /@keyframes sgs-toast-in\s*\{([\s\S]*?)\n\}/ );
		expect( keyframes ).not.toBeNull();
		expect( keyframes[ 1 ] ).toMatch( /100%\s*\{\s*opacity:\s*1;/ );
	} );
} );
