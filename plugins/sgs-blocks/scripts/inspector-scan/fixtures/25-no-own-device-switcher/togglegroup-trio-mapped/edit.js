/**
 * REGRESSION FIXTURE for the false NEGATIVE found by the 2026-08-10 QC council.
 *
 * The literals live in a top-level array, NOT inside the JSX subtree, so the
 * rule's original `elPath.traverse()` over StringLiterals never saw them and
 * this shape passed clean. It is the exact idiom the global toggle itself uses
 * (`DEVICES.map(...)` in responsive-device-toggle.js), so a rule blind to it
 * could not catch the very anti-pattern it exists to prevent.
 */
import { InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';

const DEVICE_TIERS = [
	{ value: 'Desktop', label: 'Desktop' },
	{ value: 'Tablet', label: 'Tablet' },
	{ value: 'Mobile', label: 'Mobile' },
];

export default function Edit( { attributes, setAttributes } ) {
	const { tier } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Layout">
				<ToggleGroupControl
					label="Device"
					value={ tier || 'Desktop' }
					isBlock
					onChange={ ( value ) => setAttributes( { tier: value } ) }
				>
					{ DEVICE_TIERS.map( ( t ) => (
						<ToggleGroupControlOption key={ t.value } value={ t.value } label={ t.label } />
					) ) }
				</ToggleGroupControl>
			</PanelBody>
		</InspectorControls>
	);
}
