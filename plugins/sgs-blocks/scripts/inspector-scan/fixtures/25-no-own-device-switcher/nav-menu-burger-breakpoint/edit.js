import { InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';

// Mirrors src/blocks/nav-menu/edit.js:587-625 (read live 2026-08-10) — a
// breakpoint-VALUE picker for the single scalar attribute `collapsePoint`,
// not a device-tier switcher. Value set is {always, tablet, mobile, custom}:
// missing "desktop", carrying two extra values not part of the three device
// tiers. Must NOT be flagged.
export default function Edit( { attributes, setAttributes } ) {
	const { collapsePoint } = attributes;

	function burgerScopeOf( px ) {
		if ( px === 0 ) return 'always';
		if ( px === 1024 ) return 'tablet';
		if ( px === 768 ) return 'mobile';
		return 'custom';
	}

	return (
		<InspectorControls>
			<PanelBody title="Burger Menu">
				<ToggleGroupControl
					label="Show the burger on"
					value={ burgerScopeOf( collapsePoint ) }
					isBlock
					onChange={ ( value ) => {
						setAttributes( { collapsePoint: value === 'always' ? 0 : 768 } );
					} }
				>
					<ToggleGroupControlOption value="always" label="Always" />
					<ToggleGroupControlOption value="tablet" label="Tablet" />
					<ToggleGroupControlOption value="mobile" label="Mobile" />
					<ToggleGroupControlOption value="custom" label="Custom" />
				</ToggleGroupControl>
			</PanelBody>
		</InspectorControls>
	);
}
