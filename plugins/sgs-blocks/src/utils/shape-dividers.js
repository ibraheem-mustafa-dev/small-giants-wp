/**
 * Shape dividers — the JS twin of includes/shape-dividers.php, for editor
 * canvases. The paths are the same 1200x120-viewBox shapes
 * sgs_get_shape_dividers() returns (tests/js/shape-dividers.test.js holds the
 * two lists equal); the geometry mirrors sgs_render_shape_divider(),
 * sgs_shape_divider_axis(), sgs_shape_divider_decls() and
 * sgs_render_shape_divider_gradient_defs().
 *
 * @package SGS\Blocks
 */

import { parseSvgGradient } from './svg-gradient-preview';

export const SHAPE_DIVIDER_PATHS = Object.freeze( {
	'wave': 'M0,40 C200,120 400,0 600,60 C800,120 1000,0 1200,40 L1200,120 L0,120 Z',
	'wave-smooth': 'M0,60 Q300,120 600,60 Q900,0 1200,60 L1200,120 L0,120 Z',
	'triangle': 'M0,120 L600,0 L1200,120 Z',
	'triangle-asymmetric': 'M0,120 L800,0 L1200,120 Z',
	'curve': 'M0,120 Q600,0 1200,120 Z',
	'curve-asymmetric': 'M0,120 C300,120 600,0 1200,80 L1200,120 Z',
	'zigzag': 'M0,60 L100,20 L200,60 L300,20 L400,60 L500,20 L600,60 L700,20 L800,60 L900,20 L1000,60 L1100,20 L1200,60 L1200,120 L0,120 Z',
	'cloud': 'M0,80 C50,40 100,60 150,40 C200,20 250,50 300,30 C350,10 400,50 450,30 C500,10 550,40 600,20 C650,0 700,40 750,20 C800,0 850,30 900,20 C950,10 1000,40 1050,30 C1100,20 1150,50 1200,40 L1200,120 L0,120 Z',
	'slant': 'M0,120 L1200,0 L1200,120 Z',
	'slant-gentle': 'M0,120 L1200,60 L1200,120 Z',
	'mountains': 'M0,120 L200,40 L400,90 L600,20 L800,70 L1000,30 L1200,80 L1200,120 Z',
	'drops': 'M0,80 C100,40 150,80 200,80 C250,80 300,40 400,80 C500,120 550,40 600,80 C650,120 700,40 800,80 C900,120 950,40 1000,80 C1050,120 1100,40 1200,80 L1200,120 L0,120 Z',
	'tilt': 'M0,120 L1200,0 L1200,120 Z',
	'arrow': 'M0,0 L600,120 L1200,0 L1200,120 L0,120 Z',
	'split': 'M0,0 L600,80 L1200,0 L1200,120 L0,120 Z',
} );

export const SHAPE_DIVIDER_VIEWBOX_W = 1200;
export const SHAPE_DIVIDER_VIEWBOX_H = 120;
const SCALE_MIN = 10;
const SCALE_MAX = 400;

/**
 * One axis of a `{ x, y }` divider scale, clamped to the control's range;
 * 100 (natural size) when unset or non-numeric.
 *
 * @param {*}      scale Stored `{ x, y }` scale.
 * @param {string} axis  'x' | 'y'.
 * @return {number} Percentage.
 */
export function shapeDividerAxis( scale, axis ) {
	const raw = scale && 'object' === typeof scale ? scale[ axis ] : undefined;
	const n = Number( raw );
	if ( undefined === raw || null === raw || '' === raw || Number.isNaN( n ) ) {
		return 100;
	}
	return Math.max( SCALE_MIN, Math.min( SCALE_MAX, Math.round( n ) ) );
}

/**
 * Pattern-tile geometry for an X scale, or null at the natural 100% width.
 *
 * @param {number} scaleX X-axis percentage.
 * @return {?{tileW: number, originX: number, tileScale: number}} Tile geometry.
 */
export function shapeDividerTile( scaleX ) {
	const tileW = Math.max( 1, Math.round( ( SHAPE_DIVIDER_VIEWBOX_W * scaleX ) / 100 ) );
	if ( SHAPE_DIVIDER_VIEWBOX_W === tileW ) {
		return null;
	}
	return {
		tileW,
		originX: Math.round( ( SHAPE_DIVIDER_VIEWBOX_W - tileW ) / 2 ),
		tileScale: tileW / SHAPE_DIVIDER_VIEWBOX_W,
	};
}

/**
 * The divider's height in px for a Y scale.
 *
 * @param {number} scaleY Y-axis percentage.
 * @return {number} Height in px.
 */
export function shapeDividerHeight( scaleY ) {
	return Math.round( ( SHAPE_DIVIDER_VIEWBOX_H * scaleY ) / 100 );
}

/**
 * SVG gradient-def data for a divider gradient, with the geometry
 * sgs_render_shape_divider_gradient_defs() uses (linear: the angle's line
 * through the centre to the box edge midpoints; radial: centred, r 75%).
 *
 * @param {string} gradient CSS gradient string.
 * @return {?Object} Def data, null when the value is not a usable gradient.
 */
export function shapeDividerGradient( gradient ) {
	const parsed = parseSvgGradient( gradient );
	if ( ! parsed ) {
		return null;
	}
	if ( 'radial' === parsed.type ) {
		return { type: 'radial', cx: 50, cy: 50, r: 75, stops: parsed.stops };
	}
	const match = String( gradient ).match( /linear-gradient\(\s*(-?[\d.]+)deg/i );
	const rad = ( ( match ? parseFloat( match[ 1 ] ) : 180 ) * Math.PI ) / 180;
	const x2 = 0.5 + Math.sin( rad ) * 0.5;
	const y2 = 0.5 - Math.cos( rad ) * 0.5;
	return { type: 'linear', x1: 1 - x2, y1: 1 - y2, x2, y2, stops: parsed.stops };
}
