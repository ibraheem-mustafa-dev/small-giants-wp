export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<ToolsPanel label="Settings">
				<ToolsPanelItem
					label="Border colour"
					hasValue={ () => !! attributes.borderColour }
					onDeselect={ () => {} }
				>
					<DesignTokenPicker
						label="Border colour"
						value={ attributes.borderColour }
						onChange={ ( v ) => setAttributes( { borderColour: v } ) }
					/>
				</ToolsPanelItem>
			</ToolsPanel>
		</InspectorControls>
	);
}
