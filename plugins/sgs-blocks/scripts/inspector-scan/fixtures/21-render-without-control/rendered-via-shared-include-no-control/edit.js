/**
 * PLANTED DEFECT (TRAP A): `titleLineHeightTablet` is painted — but only via
 * the shared include's dynamically-assembled key, so its literal name appears
 * in NO file. There is no control for it here. Rule 21 must still flag it.
 */
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody title="Content">
				<TextControl
					label="Title"
					value={ attributes.titleText }
					onChange={ ( v ) => setAttributes( { titleText: v } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
