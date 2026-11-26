/**
 * Functional colours as hex: `functionalColourToHex()` turns one `rgb()`, `rgba()`, `hsl()` or `hsla()` colour into `#RRGGBB`
 * (`#RRGGBBAA` when the alpha is below 1) and leaves anything else unchanged; `functionalColoursToHex()` does the same for every
 * such colour inside a longer value, such as a composed shadow. Twin of `sgs_functional_colour_to_hex()`, so the editor prints a
 * colour the way the server does; channel maths rounds half up, as PHP's `round()` does for the non-negative values here.
 *
 * @package SGS\Blocks
 */

const channel = ( token ) => {
	const t = token.trim();
	const n = t.endsWith( '%' ) ? parseFloat( t ) * 2.55 : parseFloat( t );
	return Math.max( 0, Math.min( 255, phpRound( n ) ) );
};
const alphaByte = ( token ) => {
	const t = token.trim();
	const a = t.endsWith( '%' ) ? parseFloat( t ) / 100 : parseFloat( t );
	return Math.max( 0, Math.min( 255, phpRound( a * 255 ) ) );
};
// PHP round() takes .5 away from zero; the values here are never negative.
const phpRound = ( n ) => Math.round( n );
const hex2 = ( n ) => n.toString( 16 ).toUpperCase().padStart( 2, '0' );

function hslToRgb( hue, sat, light ) {
	const h = ( ( hue % 360 ) + ( hue % 360 < 0 ? 360 : 0 ) ) / 360;
	const s = Math.max( 0, Math.min( 100, sat ) ) / 100;
	const l = Math.max( 0, Math.min( 100, light ) ) / 100;
	if ( 0 === s ) {
		const v = phpRound( l * 255 );
		return [ v, v, v ];
	}
	const q = l < 0.5 ? l * ( 1 + s ) : l + s - l * s;
	const p = 2 * l - q;
	const toRgb = ( t0 ) => {
		let t = t0;
		if ( t < 0 ) {
			t++;
		}
		if ( t > 1 ) {
			t--;
		}
		if ( t < 1 / 6 ) {
			return p + ( q - p ) * 6 * t;
		}
		if ( t < 1 / 2 ) {
			return q;
		}
		if ( t < 2 / 3 ) {
			return p + ( q - p ) * ( 2 / 3 - t ) * 6;
		}
		return p;
	};
	return [
		phpRound( toRgb( h + 1 / 3 ) * 255 ),
		phpRound( toRgb( h ) * 255 ),
		phpRound( toRgb( h - 1 / 3 ) * 255 ),
	];
}

/**
 * Twin of `sgs_functional_colour_to_hex()` for rgb(), rgba(), hsl() and hsla(): the colour as hex, `#RRGGBBAA` when the
 * alpha is below 1. Anything else comes back unchanged.
 *
 * @param {string} value A colour.
 * @return {string} Hex, or the value.
 */
export function functionalColourToHex( value ) {
	const v = value.trim();
	let m =
		/^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i.exec(
			v
		);
	let rgb = null;
	if ( m ) {
		rgb = [ channel( m[ 1 ] ), channel( m[ 2 ] ), channel( m[ 3 ] ) ];
	} else {
		m =
			/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i.exec(
				v
			);
		if ( m ) {
			rgb = hslToRgb(
				parseFloat( m[ 1 ] ),
				parseFloat( m[ 2 ] ),
				parseFloat( m[ 3 ] )
			);
		}
	}
	if ( ! rgb ) {
		return v;
	}
	let hex = `#${ rgb.map( hex2 ).join( '' ) }`;
	if ( m[ 4 ] ) {
		const a = alphaByte( m[ 4 ] );
		if ( a < 255 ) {
			hex += hex2( a );
		}
	}
	return hex;
}

/**
 * @param {string} value Text that may hold `rgb()`, `rgba()`, `hsl()` or `hsla()` colours, such as a composed shadow.
 * @return {string} The same text with each such colour as hex, as `sgs_colour_value()` prints them.
 */
export function functionalColoursToHex( value ) {
	return value.replace( /(?:rgba?|hsla?)\([^()]*\)/gi, ( token ) =>
		functionalColourToHex( token )
	);
}
