/**
 * RowWrapPanel - one "Row wrapping" panel holding a block's FlexWrapControl rows, for a block with several rows of
 * items (thumbnails, price, actions), so the wrap choices sit together instead of crowding each feature's panel.
 *
 * Each row passes its own value and onChange (a literal setAttributes call at the caller), so the inspector gates read
 * which control writes which attribute.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import FlexWrapControl from './FlexWrapControl';

export default function RowWrapPanel( { rows } ) {
	const shown = ( rows || [] ).filter( Boolean );
	if ( ! shown.length ) {
		return null;
	}
	return (
		<PanelBody title={ __( 'Row wrapping', 'sgs-blocks' ) } initialOpen={ false }>
			{ shown.map( ( row ) => (
				<FlexWrapControl key={ row.label } label={ row.label } value={ row.value } onChange={ row.onChange } />
			) ) }
		</PanelBody>
	);
}
