/**
 * FlexWrapSelect - the "Wrap" choice for a block's row of items (`flexWrap`: '' | 'nowrap' | 'wrap').
 *
 * Empty keeps the stylesheet's own wrapping; the server emits `flex-wrap` only for 'nowrap' or 'wrap'
 * (`check-row-flex-wrap.py` holds every block that lays items in a row to a `css:flex-wrap` map).
 */
import { __ } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';

export default function FlexWrapSelect( { label, value, onChange } ) {
	return (
		<SelectControl
			label={ label || __( 'Wrap items', 'sgs-blocks' ) }
			help={ __( 'Default keeps the layout\'s own behaviour. One row keeps every item on a single line; Wrap onto more rows lets items that overrun drop onto a further row.', 'sgs-blocks' ) }
			value={ value || '' }
			options={ [
				{ value: '', label: __( 'Default', 'sgs-blocks' ) },
				{ value: 'nowrap', label: __( 'One row', 'sgs-blocks' ) },
				{ value: 'wrap', label: __( 'Wrap onto more rows', 'sgs-blocks' ) },
			] }
			onChange={ onChange }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);
}
