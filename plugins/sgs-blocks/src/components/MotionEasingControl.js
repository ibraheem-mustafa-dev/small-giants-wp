/**
 * MotionEasingControl: the shared named-easing picker for nav motion (Wave 3C
 * U-5). One list read by the burger morph, the drawer entry and exit, and the
 * dropdown and mega panels. The render-side twin is
 * `includes/helpers-motion-easing.php::sgs_motion_easing_css()`; the custom-curve
 * validator below matches `sgs_motion_valid_cubic_bezier()` exactly, so a value
 * the editor accepts is never refused server-side.
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import { SelectControl, TextControl } from '@wordpress/components';

/**
 * Named easing options. Values mirror `sgs_motion_easing_values()`.
 */
export const MOTION_EASING_OPTIONS = [
	{ label: __( 'Standard', 'sgs-blocks' ), value: 'ease' },
	{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out-css' },
	{ label: __( 'Ease in and out', 'sgs-blocks' ), value: 'ease-in-out' },
	{ label: __( 'Smooth', 'sgs-blocks' ), value: 'default' },
	{ label: __( 'Expo out', 'sgs-blocks' ), value: 'ease-out' },
	{ label: __( 'Quart out', 'sgs-blocks' ), value: 'quart-out' },
	{ label: __( 'Material standard', 'sgs-blocks' ), value: 'standard' },
	{ label: __( 'Soft settle', 'sgs-blocks' ), value: 'drafts' },
	{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
	{ label: __( 'Spring', 'sgs-blocks' ), value: 'spring' },
	{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
	{ label: __( 'Custom curve…', 'sgs-blocks' ), value: 'custom' },
];

/**
 * Whether a string is a real, in-range `cubic-bezier(x1, y1, x2, y2)` curve.
 * Anchored, four numbers, no exponent; x1 and x2 between 0 and 1.
 *
 * @param {string} value The candidate curve.
 * @return {boolean} True when valid.
 */
export function isValidCubicBezier( value ) {
	const match =
		/^cubic-bezier\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)$/.exec(
			( value || '' ).trim()
		);
	if ( ! match ) {
		return false;
	}
	const x1 = parseFloat( match[ 1 ] );
	const x2 = parseFloat( match[ 3 ] );
	return x1 >= 0 && x1 <= 1 && x2 >= 0 && x2 <= 1;
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
	const current = value || fallback;
	const invalid = 'custom' === current && '' !== ( custom || '' ) && ! isValidCubicBezier( custom );
	const fallbackLabel =
		MOTION_EASING_OPTIONS.find( ( option ) => option.value === fallback )?.label || fallback;

	return (
		<>
			<SelectControl
				label={ label }
				value={ current }
				options={ MOTION_EASING_OPTIONS }
				onChange={ ( val ) => onChange( val || fallback ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ 'custom' === current && (
				<TextControl
					label={ __( 'Custom curve', 'sgs-blocks' ) }
					value={ custom || '' }
					onChange={ onCustomChange }
					placeholder="cubic-bezier(0.165, 0.84, 0.44, 1)"
					help={
						invalid
							? sprintf(
									/* translators: %s: the fallback easing name. */
									__(
										'Not a valid curve. Use cubic-bezier(x1, y1, x2, y2) with x1 and x2 between 0 and 1. Using %s until this is fixed.',
										'sgs-blocks'
									),
									fallbackLabel
							  )
							: __(
									'cubic-bezier(x1, y1, x2, y2). x1 and x2 must be between 0 and 1.',
									'sgs-blocks'
							  )
					}
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</>
	);
}

