import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import TintControls from './TintControls';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls group="styles">
			<PanelBody title="Box">
				<TintControls attributes={ attributes } setAttributes={ setAttributes } />
			</PanelBody>
		</InspectorControls>
	);
}
