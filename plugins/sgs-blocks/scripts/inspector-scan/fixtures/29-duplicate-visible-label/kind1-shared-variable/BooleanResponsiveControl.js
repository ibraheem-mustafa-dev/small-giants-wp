import { ToggleControl } from '@wordpress/components';
import ResponsiveControl from '../../../../src/components/ResponsiveControl';

// Mirrors the live pattern at blocks/media/BooleanResponsiveControl.js and
// blocks/before-after/BooleanResponsiveControl.js: the SAME `label` variable
// (not two separate __() literals) is passed to both the wrapper and the
// desktop-tier control, with no hideLabelFromVision on the inner control.
export default function BooleanResponsiveControl( { label, attrBase, attributes, setAttributes } ) {
	const base = !! attributes[ attrBase ];
	return (
		<ResponsiveControl label={ label }>
			{ ( breakpoint ) => (
				<ToggleControl
					label={ label }
					checked={ base }
					onChange={ ( value ) => setAttributes( { [ attrBase ]: value } ) }
				/>
			) }
		</ResponsiveControl>
	);
}
