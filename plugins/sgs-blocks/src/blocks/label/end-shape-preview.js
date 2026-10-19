/**
 * Editor-canvas mirror of sgs/label's end shapes: the same rules render.php prints for
 * a shaped label (`endShapeLeft`, `endShapeRight`, `endDepth`, `borderWidth`,
 * `borderStyle`, `borderColour`, `borderColourGradient`), scoped to the canvas
 * element's own class and printed in an editor `<style>`, since a mask on a
 * pseudo-element cannot take an inline style.
 *
 * The fill is the `::after` layer cut by a mask; the outline is the first-child
 * `.sgs-label__edge` element (`labelHasEndOutline()` says when the canvas renders it).
 * The strings come from `src/utils/end-shape.js`, the twin of includes/helpers-end-shape.php.
 *
 * Every value reaching a rule is checked to be a plain length, preset variable, colour or
 * gradient, so a stored value cannot carry CSS out of the declaration.
 *
 * @package SGS\Blocks
 */
import { colourVar, gapVar, isCssGradient } from '../../utils';
import { resolveBorderStyle } from '../../utils/border-style';
import {
	endShapeDepth,
	endShapeMaskDecls,
	endShapeNormalise,
	endShapeRingDecls,
} from '../../utils/end-shape';

const SAFE_LENGTH = /^-?(?:\d+|\d*\.\d+)(?:[a-z]+|%)?$/i;
const SAFE_PRESET = /^var\(--wp--preset--spacing--[a-z0-9-]+\)$/i;
const ZERO_LENGTH = /^0+(?:\.0+)?[a-z%]*$/i;
const PX_LENGTH = /^(\d+(?:\.\d+)?)px$/;
const UNSAFE_CHARS = /[{};<>]/;

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
 * The top border width as a safe CSS length, or ''.
 *
 * @param {Object} attributes Block attributes.
 * @return {string} Length, or '' when none is set.
 */
function borderTopWidth( attributes ) {
	const box = attributes.borderWidth && 'object' === typeof attributes.borderWidth ? attributes.borderWidth : {};
	const raw = 'string' === typeof box.top || 'number' === typeof box.top ? String( box.top ).trim() : '';
	const length = raw ? gapVar( raw ) : '';
	return SAFE_LENGTH.test( length ) || SAFE_PRESET.test( length ) ? length : '';
}

/**
 * Whether the label has an end shape and an outline to draw: a width above zero and a style other than none.
 *
 * @param {Object} attributes Block attributes.
 * @return {boolean} True when the canvas renders the outline element.
 */
export function labelHasEndOutline( attributes = {} ) {
	const width = borderTopWidth( attributes );
	return (
		Object.keys( labelEndShapeEnds( attributes ) ).length > 0 &&
		'' !== width &&
		! ZERO_LENGTH.test( width ) &&
		'none' !== resolveBorderStyle( attributes.borderStyle )
	);
}

/**
 * The fill's paint declaration: a gradient wins over the flat colour; neither leaves the
 * variant's stylesheet fill in charge.
 *
 * @param {Object} attributes Block attributes.
 * @return {string} One declaration, without a trailing semicolon, or ''.
 */
function fillPaint( attributes ) {
	const gradient = attributes.backgroundColourGradient;
	if ( isCssGradient( gradient ) && ! UNSAFE_CHARS.test( gradient ) ) {
		return `background-image:${ gradient.trim() }`;
	}
	const flat = colourVar( attributes.backgroundColour );
	return flat && ! UNSAFE_CHARS.test( flat ) ? `background-color:${ flat }` : '';
}

/**
 * The outline's paint declaration; the border colour follows the text colour when unset.
 *
 * @param {Object} attributes Block attributes.
 * @return {string} One declaration, without a trailing semicolon.
 */
function outlinePaint( attributes ) {
	const gradient = attributes.borderColourGradient;
	if ( isCssGradient( gradient ) && ! UNSAFE_CHARS.test( gradient ) ) {
		return `background-image:${ gradient.trim() }`;
	}
	const flat = colourVar( attributes.borderColour );
	return flat && ! UNSAFE_CHARS.test( flat ) ? `background-color:${ flat }` : 'background-color:currentColor';
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
	const width = borderTopWidth( attributes );
	const hasWidth = '' !== width && ! ZERO_LENGTH.test( width );
	const inset = hasWidth ? `calc(-1 * ${ width })` : '0';
	const paint = fillPaint( attributes );
	const rules = [
		`${ sel }{background-color:transparent;position:relative;isolation:isolate;}`,
		`${ sel }::after{content:"";position:absolute;inset:${ inset };z-index:-2;border-radius:inherit;pointer-events:none;${ paint ? paint + ';' : '' }${ endShapeMaskDecls( ends ) }}`,
	];
	if ( labelHasEndOutline( attributes ) ) {
		const px = PX_LENGTH.exec( width );
		const stroke = px ? parseFloat( px[ 1 ] ) : null;
		rules.push(
			`${ sel } .sgs-label__edge{position:absolute;inset:${ inset };z-index:-1;pointer-events:none;border-radius:inherit;${ endShapeMaskDecls( ends ) }}`,
			`${ sel } .sgs-label__edge-line{position:absolute;inset:0;border-radius:inherit;${ outlinePaint( attributes ) };${ endShapeRingDecls( ends, width, stroke ) }}`
		);
	}
	return rules.join( '' );
}
