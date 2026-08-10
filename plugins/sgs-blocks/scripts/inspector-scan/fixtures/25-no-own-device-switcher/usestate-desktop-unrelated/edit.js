import { useState } from '@wordpress/element';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, Button } from '@wordpress/components';

// Synthetic negative control proving the AND-guard on signal (C): the
// literal 'desktop' default is unrelated (an active-tab default, not a
// device tier), and the setter is only ever invoked with 'settings' /
// 'styles' — never 'tablet' or 'mobile'. Must NOT be flagged.
export default function Edit() {
	const [ activeTab, setActiveTab ] = useState( 'desktop' );
	return (
		<InspectorControls>
			<PanelBody title="Layout">
				<Button onClick={ () => setActiveTab( 'settings' ) }>Settings</Button>
				<Button onClick={ () => setActiveTab( 'styles' ) }>Styles</Button>
				<p>{ activeTab }</p>
			</PanelBody>
		</InspectorControls>
	);
}
