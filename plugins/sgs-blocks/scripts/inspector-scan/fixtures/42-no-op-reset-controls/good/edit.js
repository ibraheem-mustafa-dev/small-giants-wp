export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<ToolsPanel label="Settings">
				<ToolsPanelItem
					label="Icon colour"
					hasValue={ () => !! attributes.iconColour }
					onDeselect={ () => setAttributes( { iconColour: undefined } ) }
				>
					<DesignTokenPicker
						label="Icon colour"
						value={ attributes.iconColour }
						onChange={ ( v ) => setAttributes( { iconColour: v } ) }
					/>
				</ToolsPanelItem>
			</ToolsPanel>
		</InspectorControls>
	);
}
