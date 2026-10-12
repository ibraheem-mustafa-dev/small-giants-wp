/**
 * Value-level CSS emission for the motion field types (Spec 38A FR-38A-55, §6.2): number formatting, token
 * resolution and colour references. Pure functions over plain values; never reads an sgsMotion path. The PHP twin is
 * `includes/motion/field-types/class-sgs-motion-field-css.php`.
 */

// The `x-sgs-unit` values that are CSS dimension units; any other unit (`x` on scale) prints a bare number.
export const CSS_DIMENSION_UNITS = Object.freeze( [ 'ms', 'px', 'deg', '%' ] );

const TOKEN_RE = /^(-?)token:([a-z][a-z0-9-]*)\.([a-z][a-z0-9-]*)$/;
const HEX_RE = /^#[0-9a-fA-F]+$/;

/**
 * Print a number for CSS: rounded half up to four decimal places, no exponent, no trailing zeros, and `0` for zero
 * (never `-0`).
 *
 * @param {number} value A finite number.
 * @return {string} The CSS number text.
 */
export function formatCssNumber( value ) {
	const rounded = Math.round( value * 10000 ) / 10000;
	if ( rounded === 0 ) {
		return '0';
	}
	return String( rounded );
}

/**
 * Print a number with its field type's CSS unit.
 *
 * @param {number} value A finite number.
 * @param {string} unit  The type's `x-sgs-unit` (may be empty).
 * @return {string} The CSS value text.
 */
export function numberCss( value, unit ) {
	const suffix = CSS_DIMENSION_UNITS.includes( unit ) ? unit : '';
	return formatCssNumber( value ) + suffix;
}

/**
 * Resolve a token reference to its custom property: `token:<family>.<key>` to `var(--wp--custom--<family>--<key>)`,
 * and a negated `-token:<family>.<key>` to `calc(-1 * var(...))`. Only a reference whose `token:<family>.<key>` part
 * is in the schema's token list resolves.
 *
 * @param {unknown}  ref    Candidate reference.
 * @param {string[]} tokens The schema's `tokenReference` enum.
 * @return {string|null} The CSS value, or null for an unknown or malformed reference.
 */
export function tokenCss( ref, tokens ) {
	if ( typeof ref !== 'string' ) {
		return null;
	}
	const match = TOKEN_RE.exec( ref );
	if (
		! match ||
		! tokens.includes( `token:${ match[ 2 ] }.${ match[ 3 ] }` )
	) {
		return null;
	}
	const css = `var(--wp--custom--${ match[ 2 ] }--${ match[ 3 ] })`;
	return match[ 1 ] === '-' ? `calc(-1 * ${ css })` : css;
}

/**
 * Whether a string is written as a token reference (negated or not), whatever its key.
 *
 * @param {unknown} value Candidate.
 * @return {boolean} True for a `token:` or `-token:` string.
 */
export function looksLikeToken( value ) {
	return (
		typeof value === 'string' &&
		( value.startsWith( 'token:' ) || value.startsWith( '-token:' ) )
	);
}

/**
 * A colour reference's CSS: a hex colour prints as written, a palette slug as
 * `var(--wp--preset--color--<slug>, currentColor)` (the fallback `src/utils/tokens.js` gives an orphaned slug).
 *
 * @param {string} value A schema-valid colour reference.
 * @return {string} The CSS colour.
 */
export function colourCss( value ) {
	return HEX_RE.test( value )
		? value
		: `var(--wp--preset--color--${ value }, currentColor)`;
}
