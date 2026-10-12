/**
 * NamedEasing: the named-curve select plus the separate custom-curve field the nav, cart, icon and header attributes
 * use (a named value in one attribute, a hand-typed curve in another). It is the named-mode body of `EasingAtom`.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { SelectControl, TextControl } from '@wordpress/components';
import { isValidCubicBezier } from './field-types';

/**
 * A named-curve select plus the separate custom-curve field shown for `custom`: the shape of the nav, cart, icon and
 * header attributes. Only a valid `cubic-bezier()` (or empty) leaves the custom field.
 *
 * @param {Object}   props
 * @param {Array}    props.options        The `{ label, value }` view of the vocabulary (`easingView( 'nav' )`).
 * @param {string}   props.label          Select label.
 * @param {string}   props.value          The named curve.
 * @param {string}   props.custom         The custom curve.
 * @param {string}   props.fallback       The named value an invalid curve falls back to.
 * @param {Function} props.onChange       Receives the named curve.
 * @param {Function} props.onCustomChange Receives a valid custom curve, or an empty string.
 * @return {Element} The controls.
 */
export default function NamedEasing( {
	options,
	label,
	value,
	custom,
	fallback,
	onChange,
	onCustomChange,
} ) {
	const current = value || fallback;
	const [ typed, setTyped ] = useState( custom || '' );
	const [ lastCustom, setLastCustom ] = useState( custom || '' );
	// A custom curve that arrives from outside (a preset, a reset) replaces the text; one this field emitted keeps it.
	if ( ( custom || '' ) !== lastCustom ) {
		setLastCustom( custom || '' );
		setTyped( custom || '' );
	}
	const invalid = '' !== typed.trim() && ! isValidCubicBezier( typed.trim() );
	const fallbackLabel =
		options.find( ( option ) => option.value === fallback )?.label ||
		fallback;

	const edit = ( raw ) => {
		setTyped( raw );
		const curve = String( raw ).trim();
		if ( curve === '' || isValidCubicBezier( curve ) ) {
			setLastCustom( curve );
			onCustomChange( curve );
		}
	};

	return (
		<>
			<SelectControl
				label={ label }
				value={ current }
				options={ options }
				onChange={ ( next ) => onChange( next || fallback ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ 'custom' === current && (
				<TextControl
					label={ __( 'Custom curve', 'sgs-blocks' ) }
					value={ typed }
					onChange={ edit }
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
