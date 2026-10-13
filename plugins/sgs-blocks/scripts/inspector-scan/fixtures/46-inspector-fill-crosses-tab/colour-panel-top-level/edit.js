import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { SgsColourPanel, fillRow } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<SgsColourPanel
				rows={ [ fillRow( { key: 'tint', label: 'Tint', attrs: { base: 'tint' }, attributes, setAttributes } ) ] }
			/>
			<InspectorControls>
				<PanelBody title="Box">
					<TextControl label="Label" value={ attributes.tint } onChange={ ( tint ) => setAttributes( { tint } ) } />
				</PanelBody>
			</InspectorControls>
		</>
	);
}
