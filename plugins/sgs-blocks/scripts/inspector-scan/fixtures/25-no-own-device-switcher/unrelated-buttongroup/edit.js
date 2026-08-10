import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ButtonGroup, Button } from '@wordpress/components';

// Mirrors src/blocks/media/edit.js:234-259 (read live 2026-08-10) —
// "Select media type" image/video/svg. A real ButtonGroup, but its literal
// value set shares no member with the device-tier universe, so it must NOT
// be flagged.
export default function Edit( { attributes, setAttributes } ) {
	const { mediaType } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Media Type" initialOpen={ true }>
				<ButtonGroup aria-label="Select media type">
					<Button
						variant={ mediaType === 'image' ? 'primary' : 'secondary' }
						onClick={ () => setAttributes( { mediaType: 'image' } ) }
					>
						Image
					</Button>
					<Button
						variant={ mediaType === 'video' ? 'primary' : 'secondary' }
						onClick={ () => setAttributes( { mediaType: 'video' } ) }
					>
						Video
					</Button>
					<Button
						variant={ mediaType === 'svg' ? 'primary' : 'secondary' }
						onClick={ () => setAttributes( { mediaType: 'svg' } ) }
					>
						SVG / Animation
					</Button>
				</ButtonGroup>
			</PanelBody>
		</InspectorControls>
	);
}
