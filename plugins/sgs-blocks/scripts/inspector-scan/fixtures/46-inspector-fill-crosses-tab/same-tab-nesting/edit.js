import { InspectorControls } from '@wordpress/block-editor';
import { SgsColourPanel, fillRow } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls group="color">
			<SgsColourPanel
				rows={ [ fillRow( { key: 'tint', label: 'Tint', attrs: { base: 'tint' }, attributes, setAttributes } ) ] }
			/>
		</InspectorControls>
	);
}
