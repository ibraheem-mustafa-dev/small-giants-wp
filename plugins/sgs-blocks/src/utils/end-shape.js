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

const ZERO_LENGTH = /^0+(?:\.0+)?[a-z%]*$/i;

/**
 * The layer's inset, border and border colour for one set of border declarations.
 *
 * Each side of the layer is inset outwards by that side's border width, so the layer
 * covers the box's border box and its own border sits where the box's transparent one is.
 *
 * Each shaped side's border is a 1px transparent strip and the fill stops at the padding
 * box, so no paint meets the layer's edge along the cut (Chrome draws a hairline where
 * paint meets the edge of a masked element that is rotated).
 *
 * @param {Object}   ends        `left` and `right` as `[ shape, depth ]`.
 * @param {string[]} borderDecls `border-style:…` and `border-width:t r b l`, or none.
 * @param {string}   paint       The border colour as a background-paint declaration: a flat
 *                               colour becomes `border-color`, a gradient a `border-image`;
 *                               '' leaves the border on `currentColor`.
 * @return {string} Declarations ending in a semicolon.
 */
export function endShapeBorderBoxDecls( ends, borderDecls = [], paint = '' ) {
	const shaped = activeEnds( ends ).map( ( [ side ] ) => side );
	let sides = [];
	borderDecls.forEach( ( decl ) => {
		if ( decl.startsWith( 'border-width:' ) ) {
			sides = decl.slice( 'border-width:'.length ).trim().split( /\s+/ ).filter( Boolean );
		}
	} );
	let css = 'inset:0;';
	if ( sides.length ) {
		const inset = sides.map( ( side ) => ( ZERO_LENGTH.test( side ) ? '0' : `calc(-1 * ${ side })` ) );
		css = `inset:${ inset.join( ' ' ) };${ borderDecls.join( ';' ) };`;
		if ( paint.startsWith( 'background-color:' ) ) {
			css += `border-color:${ paint.slice( 'background-color:'.length ) };`;
		} else if ( paint.startsWith( 'background-image:' ) ) {
			const imageWidths = [ 'top', 'right', 'bottom', 'left' ].map( ( side ) =>
				shaped.includes( side ) ? '0' : '1'
			);
			css += `border-image:${ paint.slice( 'background-image:'.length ) } 1;border-image-width:${ imageWidths.join( ' ' ) };`;
		}
	}
	if ( shaped.length ) {
		[ 'right', 'left' ].forEach( ( side ) => {
			if ( shaped.includes( side ) ) {
				css += `border-${ side }:1px solid transparent;`;
			}
		} );
		css += 'background-clip:padding-box;';
	}
	return css;
}

/**
 * Declarations for a shaped box's `::after` layer: the box's border on the layer, then
 * the cut mask. The caller adds the fill paint.
 *
 * @param {Object}   ends        `left` and `right` as `[ shape, depth ]`.
 * @param {string[]} borderDecls The box's border width declarations.
 * @param {string}   paint       The border colour as a background-paint declaration, or ''.
 * @return {string} Declarations ending in a semicolon, or '' when no end is shaped.
 */
export function endShapeLayerDecls( ends, borderDecls = [], paint = '' ) {
	const mask = endShapeMaskDecls( ends );
	if ( ! mask ) {
		return '';
	}
	return (
		'content:"";position:absolute;' +
		endShapeBorderBoxDecls( ends, borderDecls, paint ) +
		'z-index:-2;box-sizing:border-box;pointer-events:none;border-radius:inherit;' +
		mask
	);
}
