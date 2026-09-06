export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody title="Settings">
				<DesignTokenPicker
					label="Icon colour"
					value={ attributes.iconColour }
					onChange={ ( v ) => setAttributes( { iconColour: v } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
