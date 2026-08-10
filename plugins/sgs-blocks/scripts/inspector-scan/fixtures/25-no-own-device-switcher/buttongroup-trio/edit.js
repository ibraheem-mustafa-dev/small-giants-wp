import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ButtonGroup, Button } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { tier } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Spacing">
				<ButtonGroup aria-label="Device">
					<Button
						variant={ tier === 'desktop' ? 'primary' : 'secondary' }
						onClick={ () => setAttributes( { tier: 'desktop' } ) }
					>
						Desktop
					</Button>
					<Button
						variant={ tier === 'tablet' ? 'primary' : 'secondary' }
						onClick={ () => setAttributes( { tier: 'tablet' } ) }
					>
						Tablet
					</Button>
					<Button
						variant={ tier === 'mobile' ? 'primary' : 'secondary' }
						onClick={ () => setAttributes( { tier: 'mobile' } ) }
					>
						Mobile
					</Button>
				</ButtonGroup>
			</PanelBody>
		</InspectorControls>
	);
}
