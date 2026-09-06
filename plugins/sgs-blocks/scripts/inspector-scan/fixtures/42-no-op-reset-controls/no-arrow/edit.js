function hasIconColour( attributes ) {
	return !! attributes.iconColour;
}

function clearIconColour( setAttributes ) {
	setAttributes( { iconColour: undefined } );
}

export default function Edit( { attributes, setAttributes } ) {
	const hasValueFn = () => hasIconColour( attributes );
	const onDeselectFn = () => clearIconColour( setAttributes );
	return (
		<InspectorControls>
			<ToolsPanel label="Settings">
				<ToolsPanelItem
					label="Icon colour"
					hasValue={ hasValueFn }
					onDeselect={ onDeselectFn }
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
