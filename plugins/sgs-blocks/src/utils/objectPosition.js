/**
 * CSS object-position <-> FocalPointPicker {x,y} conversion.
 *
 * Shared so every block upgrading a free-text "center 20%" style control to
 * a crosshair uses identical maths — same rounding contract as the PHP
 * companion in includes/helpers-media-position.php (clamp 0-1, x100, round
 * 2dp), so a value set via the crosshair and one inherited from legacy
 * free text never drift when read back.
 *
 * @package SGS\Blocks
 */

const KEYWORD_X = { left: 0, center: 0.5, right: 1 };
const KEYWORD_Y = { top: 0, center: 0.5, bottom: 1 };

/**
 * Parse one position token ("30%", "20px" ignored as 0.5, "left", "center").
 * Percent is the only unit this control round-trips; anything else falls
 * back to 0.5 (centre) rather than guessing.
 *
 * @param {string}                     token    Raw token.
 * @param {Object<string,number>}      keywords Keyword lookup for this axis.
 * @return {number} 0-1.
 */
function parseToken( token, keywords ) {
	if ( ! token ) {
		return 0.5;
	}
	if ( token in keywords ) {
		return keywords[ token ];
	}
	const pct = token.match( /^(-?[0-9.]+)%$/ );
	if ( pct ) {
		return Math.max( 0, Math.min( 1, parseFloat( pct[ 1 ] ) / 100 ) );
	}
	return 0.5;
}

/**
 * "center 20%" / "left top" / "30% 70%" -> { x, y }.
 *
 * @param {string} value CSS object-position value.
 * @return {{x: number, y: number}}
 */
export function objectPositionToFocalPoint( value ) {
	const tokens = ( value || '' ).trim().split( /\s+/ ).filter( Boolean );
	const [ xToken, yToken ] = tokens;
	return {
		x: parseToken( xToken, KEYWORD_X ),
		y: parseToken( yToken ?? xToken, KEYWORD_Y ),
	};
}

/**
 * { x, y } -> "X% Y%", clamped 0-1 and rounded to 2dp — identical contract
 * to the PHP helper so a crosshair-set value and a server-normalised one
 * are always byte-identical.
 *
 * @param {{x: number, y: number}} point FocalPointPicker value.
 * @return {string} CSS object-position value.
 */
export function focalPointToObjectPosition( point ) {
	const x = Math.max( 0, Math.min( 1, point?.x ?? 0.5 ) );
	const y = Math.max( 0, Math.min( 1, point?.y ?? 0.5 ) );
	return `${ Math.round( x * 100 * 100 ) / 100 }% ${ Math.round( y * 100 * 100 ) / 100 }%`;
}
