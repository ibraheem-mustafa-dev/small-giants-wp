import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';

// Deliberately NOT the real DesignTokenPicker/SgsLinkControl — a locally
// declared component whose NAME merely contains a banned tag name as a
// substring ("ColorPalette" inside "MyColorPaletteButton", "LinkControl"
// inside "CustomLinkControlBox"). A `.includes()`/regex-substring matcher
// would false-flag these; the rule's exact-name Set lookup must not.
function MyColorPaletteButton( { onClick } ) {
	return <button onClick={ onClick }>Pick a colour</button>;
}

function CustomLinkControlBox( { value } ) {
	return <div>{ value }</div>;
}

export default function Edit( { attributes, setAttributes } ) {
	const { colour, url } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Custom">
				<MyColorPaletteButton onClick={ () => setAttributes( { colour: '#000000' } ) } />
				<CustomLinkControlBox value={ url } />
			</PanelBody>
		</InspectorControls>
	);
}
