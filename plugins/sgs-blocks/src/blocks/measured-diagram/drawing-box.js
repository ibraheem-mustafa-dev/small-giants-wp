/**
 * Measured diagram — editor-side value helpers shared by the parent and the
 * sgs/diagram-dimension child. Twins of the value functions in
 * includes/helpers-measured-diagram.php; the line geometry itself is
 * geometry.js::dimensionPaths().
 *
 * @package SGS\Blocks
 */
import { fmt } from '../../utils/diagram-geometry';

/** Stand-in drawing size before a drawing is chosen: the 16:9 box style.css also falls back to. */
const FALLBACK_BOX = [ 1600, 900 ];

/**
 * The drawing's width and height (twin of sgs_measured_diagram_box()).
 *
 * @param {*} width  Intrinsic width.
 * @param {*} height Intrinsic height.
 * @return {number[]} [ width, height ], both > 0.
 */
export function drawingBox( width, height ) {
	const w = Number( width );
	const h = Number( height );
	if ( w > 0 && h > 0 ) {
		return [ w, h ];
	}
	return FALLBACK_BOX;
}

/**
 * A % of the drawing box, clamped to 0–100 (twin of sgs_measured_diagram_pct()).
 *
 * @param {*}      value    Raw value.
 * @param {number} fallback Used for junk or absent input.
 * @return {number} Clamped value.
 */
export function clampPct( value, fallback ) {
	const num = Number( value );
	if ( value === null || value === undefined || value === '' || ! Number.isFinite( num ) ) {
		return fallback;
	}
	return Math.min( 100, Math.max( 0, num ) );
}

/**
 * Dot-end radius in viewBox units: half the tick length, with the geometry
 * twin's 0–20 clamp and 1.76 fallback (twin of sgs_measured_diagram_dot_radius()).
 *
 * @param {*}      tickLength Tick length, % of drawing width.
 * @param {number} width      Drawing (viewBox) width.
 * @return {string} Formatted radius.
 */
export function dotRadius( tickLength, width ) {
	const num = Number( tickLength );
	const tick =
		tickLength === null || tickLength === undefined || tickLength === '' || ! Number.isFinite( num )
			? 1.76
			: Math.min( 20, Math.max( 0, num ) );
	return fmt( ( tick * width ) / 100 / 2 );
}

/**
 * Apply the orientation lock the way render.php does: a horizontal line keeps
 * its end on the start's y, a vertical one on the start's x.
 *
 * @param {Object} attrs Child attributes (startX/startY/endX/endY/orientation).
 * @return {{sx: number, sy: number, ex: number, ey: number}} Locked endpoints.
 */
export function lockedEndpoints( attrs ) {
	const sx = clampPct( attrs.startX, 20 );
	const sy = clampPct( attrs.startY, 50 );
	let ex = clampPct( attrs.endX, 80 );
	let ey = clampPct( attrs.endY, 50 );
	if ( 'horizontal' === attrs.orientation ) {
		ey = sy;
	} else if ( 'vertical' === attrs.orientation ) {
		ex = sx;
	}
	return { sx, sy, ex, ey };
}
