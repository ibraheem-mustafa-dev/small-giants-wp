/**
 * End shapes — the JS twin of includes/helpers-end-shape.php, for editor canvases.
 *
 * Every function returns the same strings as its PHP counterpart
 * (tests/js/label-end-shape.test.js holds them equal to the literals
 * tests/php/LabelEndShapeTest.php pins). The library paths come from
 * `shape-dividers.js`, the twin of includes/shape-dividers.php.
 *
 * @package SGS\Blocks
 */

import { SHAPE_DIVIDER_PATHS } from './shape-dividers';

/** The library shapes an end may take, in menu order. */
export const END_SHAPE_ALLOWED = Object.freeze( [
	'arrow',
	'triangle',
	'slant',
	'curve',
	'wave-smooth',
	'zigzag',
] );

const SIDES = Object.freeze( [ 'left', 'right' ] );
const TILE_W = 1200;
const TILE_H = 120;

/**
 * A stored end shape, or '' (Straight) when it is not in the allowed list.
 *
 * @param {*} shape Stored value.
 * @return {string} Library key or ''.
 */
export function endShapeNormalise( shape ) {
	return 'string' === typeof shape && END_SHAPE_ALLOWED.includes( shape ) ? shape : '';
}

/**
 * A stored depth clamped to 10 through 150 (percent of the box's height); 45 when unset.
 *
 * @param {*} depth Stored value.
 * @return {number} Depth.
 */
export function endShapeDepth( depth ) {
	const n = Number( depth );
	if ( '' === depth || null === depth || undefined === depth || Number.isNaN( n ) ) {
		return 45;
	}
	return Math.max( 10, Math.min( 150, n ) );
}

/**
 * A number as the tiles print it: four decimals at most, no trailing zeros.
 *
 * @param {number} number Value (never negative; the caller writes the sign).
 * @return {string} Printed number.
 */
function num( number ) {
	return String( Math.round( number * 10000 ) / 10000 );
}

/**
 * The library path for a shape, or '' when it is not allowed.
 *
 * @param {string} shape Library key.
 * @return {string} Path data.
 */
function libraryPath( shape ) {
	return endShapeNormalise( shape ) ? SHAPE_DIVIDER_PATHS[ shape ] : '';
}

/**
 * The library path without its closing segments: the line a stroke follows.
 *
 * @param {string} shape Library key.
 * @return {string} Path data, or '' when the shape is not allowed.
 */
export function endShapeEdgePath( shape ) {
	const path = libraryPath( shape );
	if ( ! path ) {
		return '';
	}
	const segments = [];
	for ( const item of path.matchAll( /([MLQCZ])([^MLQCZ]*)/g ) ) {
		const numbers = item[ 2 ].trim().split( /[\s,]+/ ).filter( Boolean ).map( Number );
		const count = numbers.length;
		segments.push( {
			text: item[ 1 ] + item[ 2 ].trim(),
			cmd: item[ 1 ],
			x: count >= 2 ? numbers[ count - 2 ] : 0,
			y: count >= 2 ? numbers[ count - 1 ] : 0,
		} );
	}
	while ( segments.length && 'Z' === segments[ segments.length - 1 ].cmd ) {
		segments.pop();
	}
	while ( segments.length > 1 ) {
		const last = segments[ segments.length - 1 ];
		const prev = segments[ segments.length - 2 ];
		if ( 'L' !== last.cmd ) {
			break;
		}
		const onEdge =
			( last.x === prev.x && ( 0 === last.x || TILE_W === last.x ) ) ||
			( last.y === prev.y && ( 0 === last.y || TILE_H === last.y ) );
		if ( ! onEdge ) {
			break;
		}
		segments.pop();
	}
	return segments.map( ( s ) => s.text ).join( ' ' );
}

/**
 * The matrix that rotates a library tile into a depth-wide, 100-tall end tile.
 *
 * @param {string} side  'left' or 'right'.
 * @param {number} depth Depth, 10 through 150.
 * @return {string} An SVG transform value.
 */
function matrix( side, depth ) {
	const scale = num( depth / 120 );
	if ( 'left' === side ) {
		return `matrix(0 0.0833 ${ scale } 0 0 0)`;
	}
	return `matrix(0 0.0833 -${ scale } 0 ${ num( depth ) } 0)`;
}

/**
 * @param {number} depth Depth.
 * @return {string} The `<svg …>` start tag.
 */
function svgOpen( depth ) {
	const width = num( depth );
	return `<svg xmlns='http://www.w3.org/2000/svg' width='${ width }' height='100' viewBox='0 0 ${ width } 100' preserveAspectRatio='none'>`;
}

/**
 * The cut tile for one end: the tile minus the library's painted part.
 *
 * @param {string} shape Library key.
 * @param {string} side  'left' or 'right'.
 * @param {number} depth Depth, 10 through 150.
 * @return {string} Raw SVG, or '' when the shape or side is not allowed.
 */
export function endShapeCutSvg( shape, side, depth ) {
	const path = libraryPath( shape );
	if ( ! path || ! SIDES.includes( side ) ) {
		return '';
	}
	const d = endShapeDepth( depth );
	return `${ svgOpen( d ) }<path fill-rule='evenodd' transform='${ matrix( side, d ) }' d='M0,0H1200V120H0Z ${ path }'/></svg>`;
}

/**
 * The stroke tile for one end: the edge line at twice the outline width.
 *
 * @param {string} shape    Library key.
 * @param {string} side     'left' or 'right'.
 * @param {number} depth    Depth, 10 through 150.
 * @param {number} strokePx Outline width in px.
 * @return {string} Raw SVG, or '' when the shape or side is not allowed.
 */
export function endShapeStrokeSvg( shape, side, depth, strokePx ) {
	const edge = endShapeEdgePath( shape );
	if ( ! edge || ! SIDES.includes( side ) ) {
		return '';
	}
	const d = endShapeDepth( depth );
	return `${ svgOpen( d ) }<path fill='none' stroke='#000' stroke-width='${ num( strokePx * 2 ) }' vector-effect='non-scaling-stroke' transform='${ matrix( side, d ) }' d='${ edge }'/></svg>`;
}

/**
 * An SVG as a CSS `url()` value: only `%`, `<`, `>`, `#` and `"` are encoded.
 *
 * @param {string} svg Raw SVG using single-quoted attributes.
 * @return {string} `url("data:image/svg+xml,…")`.
 */
function svgUrl( svg ) {
	const encoded = svg
		.replace( /%/g, '%25' )
		.replace( /</g, '%3C' )
		.replace( />/g, '%3E' )
		.replace( /#/g, '%23' )
		.replace( /"/g, '%22' );
	return `url("data:image/svg+xml,${ encoded }")`;
}

/**
 * The shaped ends of a box, right first, as `[ side, shape, depth ]`.
 *
 * @param {Object} ends `{ left: [ shape, depth ], right: [ shape, depth ] }`.
 * @return {Array} Only the ends with an allowed shape.
 */
function activeEnds( ends = {} ) {
	const out = [];
	[ 'right', 'left' ].forEach( ( side ) => {
		const end = ends[ side ] || [];
		const shape = endShapeNormalise( end[ 0 ] );
		if ( shape ) {
			out.push( [ side, shape, endShapeDepth( end[ 1 ] ?? 45 ) ] );
		}
	} );
	return out;
}

/**
 * Mask declarations that cut the shaped ends out of a box.
 *
 * @param {Object} ends `left` and `right` as `[ shape, depth ]`.
 * @return {string} Declarations ending in a semicolon, or '' when no end is shaped.
 */
export function endShapeMaskDecls( ends ) {
	const active = activeEnds( ends );
	if ( ! active.length ) {
		return '';
	}
	const images = [ 'linear-gradient(#000 0 0)' ];
	const positions = [ '0 0' ];
	const sizes = [ '100% 100%' ];
	active.forEach( ( [ side, shape, depth ] ) => {
		images.push( svgUrl( endShapeCutSvg( shape, side, depth ) ) );
		positions.push( `${ side } center` );
		sizes.push( 'auto 100%' );
	} );
	return (
		`mask-image:${ images.join( ',' ) };` +
		`mask-position:${ positions.join( ',' ) };` +
		`mask-size:${ sizes.join( ',' ) };` +
		'mask-repeat:no-repeat;' +
		`mask-composite:${ active.length > 1 ? 'subtract,add' : 'subtract' };`
	);
}

/**
 * Declarations for the outline element: the straight sides as a border-wide ring,
 * plus the stroked edge line of each shaped end when the width is in px.
 *
 * @param {Object}      ends      `left` and `right` as `[ shape, depth ]`.
 * @param {string}      widthCss  The outline width as a CSS length.
 * @param {number|null} strokePx  The width in px, or null when it is another unit.
 * @return {string} Declarations ending in a semicolon.
 */
export function endShapeRingDecls( ends, widthCss, strokePx ) {
	const images = [];
	const clips = [];
	const sizes = [];
	const positions = [];
	const composite = [];
	if ( null !== strokePx && undefined !== strokePx ) {
		activeEnds( ends ).forEach( ( [ side, shape, depth ] ) => {
			images.push( svgUrl( endShapeStrokeSvg( shape, side, depth, strokePx ) ) );
			clips.push( 'border-box' );
			sizes.push( 'auto 100%' );
			positions.push( `${ side } center` );
			composite.push( 'add' );
		} );
	}
	images.push( 'linear-gradient(#000 0 0)', 'linear-gradient(#000 0 0)' );
	clips.push( 'content-box', 'border-box' );
	sizes.push( '100% 100%', '100% 100%' );
	positions.push( '0 0', '0 0' );
	composite.push( 'exclude' );
	return (
		`padding:${ widthCss };` +
		`mask-image:${ images.join( ',' ) };` +
		`mask-clip:${ clips.join( ',' ) };` +
		`mask-size:${ sizes.join( ',' ) };` +
		`mask-position:${ positions.join( ',' ) };` +
		'mask-repeat:no-repeat;' +
		`mask-composite:${ composite.join( ',' ) };`
	);
}
