import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { SgsColourPanel, fillRow } from '../../components';

function renderTint( attributes, setAttributes ) {
	return (
			<SgsColourPanel
				rows={ [ fillRow( { key: 'tint', label: 'Tint', attrs: { base: 'tint' }, attributes, setAttributes } ) ] }
			/>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody title="Box">{ renderTint( attributes, setAttributes ) }</PanelBody>
		</InspectorControls>
	);
}
