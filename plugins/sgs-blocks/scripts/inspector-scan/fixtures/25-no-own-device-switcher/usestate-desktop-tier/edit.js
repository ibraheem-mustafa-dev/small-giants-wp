import { useState } from '@wordpress/element';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, Button } from '@wordpress/components';

export default function Edit() {
	const [ activeDevice, setActiveDevice ] = useState( 'desktop' );
	return (
		<InspectorControls>
			<PanelBody title="Spacing">
				<Button onClick={ () => setActiveDevice( 'desktop' ) }>Desktop</Button>
				<Button onClick={ () => setActiveDevice( 'tablet' ) }>Tablet</Button>
				<Button onClick={ () => setActiveDevice( 'mobile' ) }>Mobile</Button>
				<p>{ activeDevice }</p>
			</PanelBody>
		</InspectorControls>
	);
}
