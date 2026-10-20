/**
 * Editor-canvas mirror of sgs/label's end shapes: the same rules render.php prints for
 * a shaped label (`endShapeLeft`, `endShapeRight`, `endDepth`, `borderWidth`,
 * `borderStyle`, `borderColour`, `borderColourGradient`), scoped to the canvas
 * element's own class and printed in an editor `<style>`, since a mask on a
 * pseudo-element cannot take an inline style.
 *
 * The fill and the real border are both painted on the `::after` layer, which the cut
 * mask removes along the cut; the root keeps its border widths with a transparent colour
 * (edit.js). The strings come from `src/utils/end-shape.js`, the twin of
 * includes/helpers-end-shape.php.
 *
 * Every value reaching a rule is checked to be a plain length, preset variable, colour or
 * gradient, so a stored value cannot carry CSS out of the declaration.
 *
 * @package SGS\Blocks
 */
import { colourVar, gapVar, isCssGradient } from '../../utils';
import { resolveBorderStyle } from '../../utils/border-style';
import { endShapeDepth, endShapeLayerDecls, endShapeNormalise } from '../../utils/end-shape';

const SAFE_LENGTH = /^-?(?:\d+|\d*\.\d+)(?:[a-z]+|%)?$/i;
const SAFE_PRESET = /^var\(--wp--preset--spacing--[a-z0-9-]+\)$/i;
const UNSAFE_CHARS = /[{};<>]/;
const SIDE_KEYS = [ 'top', 'right', 'bottom', 'left' ];

/**
 * The shaped ends of a label as `{ left: [ shape, depth ], right: [ shape, depth ] }`.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} Only the ends with an allowed shape.
 */
export function labelEndShapeEnds( attributes = {} ) {
	const depth = endShapeDepth( attributes.endDepth );
	const ends = {};
	[ [ 'left', attributes.endShapeLeft ], [ 'right', attributes.endShapeRight ] ].forEach(
		( [ side, value ] ) => {
			const shape = endShapeNormalise( value );
			if ( shape ) {
				ends[ side ] = [ shape, depth ];
			}
		}
	);
	return ends;
}

/**
 * One border side as a safe CSS length, or ''.
 *
 * @param {*} value Stored side value.
 * @return {string} Length, or '' when unset or unsafe.
 */
function sideWidth( value ) {
	const raw = 'string' === typeof value || 'number' === typeof value ? String( value ).trim() : '';
	const length = raw ? gapVar( raw ) : '';
	return SAFE_LENGTH.test( length ) || SAFE_PRESET.test( length ) ? length : '';
}

/**
 * The border width declarations render.php's assembler prints (sgs_border_box_decls):
 * none when no side has a width or the style is none; unset sides print 0.
 *
 * @param {Object} attributes Block attributes.
 * @return {string[]} `border-style:…` and `border-width:t r b l`, or none.
 */
function borderDecls( attributes ) {
	const box = attributes.borderWidth && 'object' === typeof attributes.borderWidth ? attributes.borderWidth : {};
	const sides = SIDE_KEYS.map( ( key ) => sideWidth( box[ key ] ) );
	const style = resolveBorderStyle( attributes.borderStyle );
	if ( ! sides.some( Boolean ) || 'none' === style ) {
		return [];
	}
	return [ `border-style:${ style }`, `border-width:${ sides.map( ( side ) => side || '0' ).join( ' ' ) }` ];
}

/**
 * A colour and gradient pair as a background-paint declaration: a gradient wins over the
 * flat colour; neither gives ''.
 *
 * @param {string} colour   Flat colour (slug or CSS colour).
 * @param {string} gradient Gradient.
 * @return {string} One declaration, without a trailing semicolon, or ''.
 */
function paintDecl( colour, gradient ) {
	if ( isCssGradient( gradient ) && ! UNSAFE_CHARS.test( gradient ) ) {
		return `background-image:${ gradient.trim() }`;
	}
	const flat = colourVar( colour );
	return flat && ! UNSAFE_CHARS.test( flat ) ? `background-color:${ flat }` : '';
}

/**
 * The end-shape rules for the editor canvas.
 *
 * @param {string} selector   The canvas element's own selector, e.g. `.sgs-lbl-ed-{clientId}`.
 * @param {Object} attributes Block attributes.
 * @return {string} The CSS, or '' when no end is shaped.
 */
export function labelEndShapePreviewCss( selector, attributes = {} ) {
	const ends = labelEndShapeEnds( attributes );
	if ( 0 === Object.keys( ends ).length ) {
		return '';
	}
	// The canvas element carries the block class too, so these rules outrank the stylesheet's variant fill.
	const sel = `${ selector }.wp-block-sgs-label`;
	const fill = paintDecl( attributes.backgroundColour, attributes.backgroundColourGradient );
	const layer = endShapeLayerDecls(
		ends,
		borderDecls( attributes ),
		paintDecl( attributes.borderColour, attributes.borderColourGradient )
	);
	return (
		`${ sel }{background-color:transparent;position:relative;isolation:isolate;}` +
		`${ sel }::after{${ layer }${ fill ? fill + ';' : '' }}`
	);
}
