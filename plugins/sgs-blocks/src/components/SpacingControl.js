/**
 * Spacing control that reads theme.json spacing presets.
 *
 * Presents a dropdown of the theme's spacing scale (XXS through XXXL)
 * so blocks use consistent spacing tokens rather than arbitrary values.
 */
import { useSettings } from '@wordpress/block-editor';
import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function SpacingControl( { label, value, onChange } ) {
	const [ spacingSizes ] = useSettings( 'spacing.spacingSizes' );

	const options = [
		{ label: __( 'None', 'sgs-blocks' ), value: '' },
		...spacingSizes.map( ( size ) => ( {
			label: `${ size.name } (${ size.size })`,
			value: size.slug,
		} ) ),
	];

	return (
		<SelectControl
			label={ label }
			value={ value || '' }
			options={ options }
			onChange={ onChange }
			__nextHasNoMarginBottom
		/>
	);
}
