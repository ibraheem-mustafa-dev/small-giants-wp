import { InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { tier } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Spacing">
				<ToggleGroupControl
					label="Device"
					value={ tier || 'desktop' }
					isBlock
					onChange={ ( value ) => setAttributes( { tier: value } ) }
				>
					<ToggleGroupControlOption value="desktop" label="Desktop" />
					<ToggleGroupControlOption value="tablet" label="Tablet" />
					<ToggleGroupControlOption value="mobile" label="Mobile" />
				</ToggleGroupControl>
			</PanelBody>
		</InspectorControls>
	);
}
