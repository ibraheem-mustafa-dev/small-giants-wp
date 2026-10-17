/**
 * The form Focus state for the editor-canvas emitter (Spec 38A §5.1; build plan M3.4): the twin of
 * `includes/motion/class-sgs-motion-focus-state.php`. A `hover.focus` layer on the `sgs/form` root styles that form's
 * field controls: one `transition` list on the state's one timing, the focus look (border colour and background
 * colour) on `:focus-visible` for a field that is not invalid, per device, and an instant flip under reduced motion.
 * Neither `outline` nor `box-shadow` is written: the focus system stays the accessible indicator. A layer anywhere else
 * is refused (`focus-not-form`).
 *
 * @package
 */

import { fields, rules, TIERS, tokenOr, valueCss } from './motion-schema';

/** The one block that owns the Focus state. */
export const FOCUS_BLOCK = 'sgs/form';

/** The element key the state lives on. */
export const FOCUS_TARGET = 'root';

/** The refusal id reported for a Focus state anywhere else. */
export const FOCUS_REFUSAL = 'focus-not-form';

const DEF = 'FocusStateValues';
const FIELD_SELECTOR = '.sgs-form-field__input';
const FOCUS_SUFFIX =
	':focus-visible:not(:is([aria-invalid="true"],:user-invalid))';
const PAINT = [ 'border-color', 'background-color' ];
const REDUCED = '@media (prefers-reduced-motion: reduce)';

const plain = ( v ) =>
	v && typeof v === 'object' && ! Array.isArray( v ) ? v : {};

/**
 * Whether a block's element may hold the Focus state.
 *
 * @param {string} blockName Block name.
 * @param {string} target    Element key.
 * @return {boolean} True for the `sgs/form` root only.
 */
export function focusAllowed( blockName, target ) {
	return blockName === FOCUS_BLOCK && target === FOCUS_TARGET;
}

/**
 * The Focus state's CSS, or '' when the layer sets no look value. The caller refuses a layer `focusAllowed` rejects.
 *
 * @param {Object} layer    The `hover.focus` layer.
 * @param {string} selector The target's scoped selector.
 * @return {string} CSS.
 */
export function emitFocus( layer, selector ) {
	const f = fields( DEF );
	const tiers = {
		desktop: plain( layer?.values ),
		tablet: plain( layer?.devices?.tablet ),
		mobile: plain( layer?.devices?.mobile ),
	};
	const timing = {
		'transition-duration': tokenOr( 'token:duration.fast', '200ms' ),
		'transition-delay': '0ms',
		'transition-timing-function': tokenOr(
			'token:easing.ease-out',
			'ease-out'
		),
	};
	const base = { desktop: {}, tablet: {}, mobile: {} };
	const focus = { desktop: {}, tablet: {}, mobile: {} };
	let look = false;
	TIERS.forEach( ( tier ) => {
		let timingChanged = tier === 'desktop';
		Object.entries( tiers[ tier ] ).forEach( ( [ key, value ] ) => {
			const css = valueCss( DEF, key, value );
			if ( css === null || ! f[ key ] ) {
				return;
			}
			const prop = f[ key ].css;
			if (
				prop !== null &&
				Object.prototype.hasOwnProperty.call( timing, prop )
			) {
				timing[ prop ] = css;
				timingChanged = true;
			} else if ( prop !== null ) {
				focus[ tier ][ prop ] = css;
				look = true;
			}
		} );
		if ( timingChanged ) {
			base[ tier ].transition = PAINT.map(
				( prop ) =>
					`${ prop } ${ timing[ 'transition-duration' ] } ${ timing[ 'transition-timing-function' ] } ${ timing[ 'transition-delay' ] }`
			).join( ', ' );
		}
	} );
	if ( ! look ) {
		return '';
	}
	const field = `${ selector } ${ FIELD_SELECTOR }`;
	return (
		rules( field, base ) +
		rules( field + FOCUS_SUFFIX, focus ) +
		`${ REDUCED }{${ field }{transition-duration:var(--wp--custom--duration--instant, 0ms);transition-delay:initial;}}`
	);
}
