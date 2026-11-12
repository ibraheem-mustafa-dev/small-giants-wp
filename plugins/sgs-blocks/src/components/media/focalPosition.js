/**
 * A focal point {x,y} (floats 0 to 1) as a CSS `object-position` value, "X% Y%", clamped and rounded to 2 places: the
 * same value the PHP focal-point atom prints, for editor canvases that draw an item's photo themselves.
 *
 * @param {{x: number, y: number}} point The focal point.
 * @return {string} The CSS position.
 */
export function focalToObjectPosition( point ) {
	const x = Math.max( 0, Math.min( 1, point?.x ?? 0.5 ) );
	const y = Math.max( 0, Math.min( 1, point?.y ?? 0.5 ) );
	return `${ Math.round( x * 100 * 100 ) / 100 }% ${ Math.round( y * 100 * 100 ) / 100 }%`;
}
