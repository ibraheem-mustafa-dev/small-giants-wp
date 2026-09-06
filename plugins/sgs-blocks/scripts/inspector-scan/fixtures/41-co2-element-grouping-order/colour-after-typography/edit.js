import { InspectorControls } from '@wordpress/block-editor';
import { TypographyControls } from '../../../../src/components';
import { SgsColourPanel } from '../../../../src/components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<TypographyControls attributes={ attributes } setAttributes={ setAttributes } prefix="body" />
			<SgsColourPanel rows={ [] } />
		</InspectorControls>
	);
}
