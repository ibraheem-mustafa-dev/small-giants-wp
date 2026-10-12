/**
 * MotionEasingControl: the shared named-easing picker for nav motion (Wave 3C U-5), now a wrapper over the Easing
 * atom (`./motion/EasingAtom`). One list read by the burger morph, the drawer entry and exit, and the dropdown and mega
 * panels; the list is the atom's `nav` view of the one master easing list. The render-side twin is
 * `includes/helpers-motion-easing.php::sgs_motion_easing_css()`; the custom-curve validator is `isValidCubicBezier`
 * from `./motion/field-types`, the editor twin of `Sgs_Motion_Field_Types::is_valid_cubic_bezier()`, so a value the
 * editor accepts is never refused server-side.
 *
 * @package
 */

import EasingAtom, { easingCssFor } from './motion/EasingAtom';
import { isValidCubicBezier } from './motion/field-types';

// The named options the importers read: the Easing atom's nav view.
export { NAV_EASING_OPTIONS as MOTION_EASING_OPTIONS } from './motion/EasingAtom';

// The custom-curve validator is the easing field type's: one definition, shared with the PHP renderer.
export { isValidCubicBezier };

/**
 * The CSS timing function for a named easing, the JS twin of `sgs_motion_easing_css()`
 * (includes/helpers-motion-easing.php), for editor canvas previews.
 *
 * @param {string} value    The named easing.
 * @param {string} custom   The custom curve, read when value is `custom`.
 * @param {string} fallback CSS used for an unknown value or an invalid curve.
 * @return {string} A CSS timing function.
 */
export function motionEasingCss( value, custom = '', fallback = 'ease' ) {
	const named = easingCssFor( 'nav', value );
	if ( named ) {
		return named;
	}
	if ( 'custom' === value && isValidCubicBezier( ( custom || '' ).trim() ) ) {
		return custom.trim();
	}
	return fallback;
}

/**
 * A named-easing select plus the custom-curve field shown for `custom`.
 *
 * @param {Object}   props                The props.
 * @param {string}   props.label          Select label.
 * @param {string}   props.value          The named easing.
 * @param {string}   props.custom         The custom curve.
 * @param {string}   props.fallback       The named value an invalid curve falls back to.
 * @param {Function} props.onChange       Called with the new named easing.
 * @param {Function} props.onCustomChange Called with the new custom curve.
 * @return {Element} The controls.
 */
export default function MotionEasingControl( {
	label,
	value,
	custom,
	fallback = 'ease',
	onChange,
	onCustomChange,
} ) {
	return (
		<EasingAtom
			vocab="nav"
			label={ label }
			value={ value }
			custom={ custom }
			fallback={ fallback }
			onChange={ onChange }
			onCustomChange={ onCustomChange }
		/>
	);
}
