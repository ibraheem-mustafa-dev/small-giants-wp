/**
 * Forked from WordPress core (`@wordpress/components` `color-picker/hex-input.tsx`),
 * commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4).
 *
 * Deviation from source: `COLORS.theme.accent` (core's private design-token
 * object, `../utils/colors-values`) is inlined as its literal CSS custom
 * property value — verified against the same commit's
 * `packages/components/src/utils/colors-values.js`:
 * `var(--wp-components-color-accent, var(--wp-admin-theme-color, #3858e9))`.
 *
 * External dependencies
 */
import { colord } from 'colord';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { InputControl, InputControlPrefixWrapper, Text } from '../../primitives';

const ACCENT_COLOR =
	'var(--wp-components-color-accent, var(--wp-admin-theme-color, #3858e9))';

export const HexInput = ( { color, onChange, enableAlpha } ) => {
	const handleChange = ( nextValue ) => {
		if ( ! nextValue ) {
			return;
		}
		const hexValue = nextValue.startsWith( '#' )
			? nextValue
			: '#' + nextValue;

		onChange( colord( hexValue ) );
	};

	const stateReducer = ( state, action ) => {
		const nativeEvent = action.payload?.event?.nativeEvent;

		if ( 'insertFromPaste' !== nativeEvent?.inputType ) {
			return { ...state };
		}

		const value = state.value?.startsWith( '#' )
			? state.value.slice( 1 ).toUpperCase()
			: state.value?.toUpperCase();

		return { ...state, value };
	};

	return (
		<InputControl
			prefix={
				<InputControlPrefixWrapper>
					<Text color={ ACCENT_COLOR } lineHeight={ 1 }>
						#
					</Text>
				</InputControlPrefixWrapper>
			}
			value={ color.toHex().slice( 1 ).toUpperCase() }
			onChange={ handleChange }
			maxLength={ enableAlpha ? 9 : 7 }
			label={ __( 'Hex color' ) }
			hideLabelFromVision
			size="__unstable-large"
			__unstableStateReducer={ stateReducer }
			__unstableInputWidth="9em"
		/>
	);
};
