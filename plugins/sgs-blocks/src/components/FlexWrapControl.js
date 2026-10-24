/**
 * FlexWrapControl - the "Wrap" choice for a block's row of items (`flexWrap`: '' | 'nowrap' | 'wrap').
 *
 * Empty keeps the stylesheet's own wrapping; the server emits `flex-wrap` only for 'nowrap' or 'wrap'
 * (`check-row-flex-wrap.py` holds every block that lays items in a row to a `css:flex-wrap` map). Three short
 * options, so a ToggleGroupControl (the enum-control-shape table). `help` replaces the default help text when a
 * block's row needs a caveat of its own.
 */
import { __ } from '@wordpress/i18n';
import { ToggleGroupControl, ToggleGroupControlOption } from './primitives';

export default function FlexWrapControl( { label, value, onChange, help } ) {
	return (
		<ToggleGroupControl
			label={ label || __( 'Wrap items', 'sgs-blocks' ) }
			help={ help || __( 'Default keeps the layout\'s own behaviour. One row keeps every item on a single line; Wrap lets items that overrun drop onto a further row.', 'sgs-blocks' ) }
			value={ value || '' }
			onChange={ ( next ) => onChange( next || '' ) }
			isBlock
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		>
			<ToggleGroupControlOption value="" label={ __( 'Default', 'sgs-blocks' ) } />
			<ToggleGroupControlOption value="nowrap" label={ __( 'One row', 'sgs-blocks' ) } />
			<ToggleGroupControlOption value="wrap" label={ __( 'Wrap', 'sgs-blocks' ) } />
		</ToggleGroupControl>
	);
}
