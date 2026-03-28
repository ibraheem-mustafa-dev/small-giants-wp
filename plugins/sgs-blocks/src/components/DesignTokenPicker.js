/**
 * Colour picker that reads the active theme.json palette.
 *
 * Uses useSettings() so it always reflects the current style variation.
 * Blocks never need to know the actual hex values — they get the
 * palette from the theme automatically.
 */
import { useSettings } from '@wordpress/block-editor';
import { ColorPalette, BaseControl } from '@wordpress/components';

export default function DesignTokenPicker( {
	label,
	value,
	onChange,
	clearable = true,
} ) {
	const [ colours ] = useSettings( 'color.palette' );

	return (
		<BaseControl label={ label } __nextHasNoMarginBottom>
			<ColorPalette
				colors={ colours }
				value={ value }
				onChange={ onChange }
				clearable={ clearable }
				disableCustomColors={ false }
			/>
		</BaseControl>
	);
}
