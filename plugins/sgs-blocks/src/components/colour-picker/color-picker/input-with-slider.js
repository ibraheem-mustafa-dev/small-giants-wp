/**
 * Forked from WordPress core (`@wordpress/components` `color-picker/input-with-slider.tsx`),
 * commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4).
 *
 * Deviation from source: the `NumberControlWrapper`/`RangeControl` styled()
 * wrappers from core's `./styles` (emotion) are replaced with the plain
 * `NumberControl`/`RangeControl` primitives plus classes from `./style.scss`
 * carrying the same width/margin values (`width: calc(4px * 24)` and
 * `margin-right: calc(4px * 2)` respectively — see that source file's
 * `NumberControlWrapper`/`RangeControl` declarations).
 *
 * WordPress dependencies
 */
import { RangeControl } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { HStack, NumberControl, InputControlPrefixWrapper, Text } from '../../primitives';

const ACCENT_COLOR =
	'var(--wp-components-color-accent, var(--wp-admin-theme-color, #3858e9))';

export const InputWithSlider = ( { min, max, label, abbreviation, onChange, value } ) => {
	const onNumberControlChange = ( newValue ) => {
		if ( ! newValue ) {
			onChange( 0 );
			return;
		}
		if ( typeof newValue === 'string' ) {
			onChange( parseInt( newValue, 10 ) );
			return;
		}
		onChange( newValue );
	};

	return (
		<HStack spacing={ 4 }>
			<NumberControl
				className="sgs-colour-picker__number-control"
				__next40pxDefaultSize
				min={ min }
				max={ max }
				label={ label }
				hideLabelFromVision
				value={ value }
				onChange={ onNumberControlChange }
				prefix={
					<InputControlPrefixWrapper>
						<Text color={ ACCENT_COLOR } lineHeight={ 1 }>
							{ abbreviation }
						</Text>
					</InputControlPrefixWrapper>
				}
				spinControls="none"
			/>
			<RangeControl
				className="sgs-colour-picker__range-control"
				__next40pxDefaultSize
				label={ label }
				hideLabelFromVision
				min={ min }
				max={ max }
				value={ value }
				onChange={ onChange }
				withInputField={ false }
			/>
		</HStack>
	);
};
