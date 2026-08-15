/**
 * Forked from WordPress core (`@wordpress/components`
 * `circular-option-picker/utils.tsx`),
 * commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4).
 *
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Computes the common props for the CircularOptionPicker.
 */
export function getComputeCircularOptionPickerCommonProps(
	asButtons,
	loop,
	ariaLabel,
	ariaLabelledby
) {
	const metaProps = asButtons
		? { asButtons: true }
		: { asButtons: false, loop };

	const labelProps = {
		'aria-labelledby': ariaLabelledby,
		'aria-label': ariaLabelledby
			? undefined
			: ariaLabel || __( 'Custom color picker' ),
	};

	return { metaProps, labelProps };
}
