import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { alignment } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Layout">
				<SelectControl
					label="Alignment"
					value={ alignment }
					options={ [
						{ label: 'Left', value: 'left' },
						{ label: 'Centre', value: 'centre' },
					] }
					onChange={ ( value ) => setAttributes( { alignment: value } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
