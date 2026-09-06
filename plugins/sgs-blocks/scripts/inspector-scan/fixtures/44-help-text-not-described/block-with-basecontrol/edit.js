export default function Edit() {
	return (
		<InspectorControls>
			<PanelBody title="Settings">
				<BaseControl label="Link" help={ __( 'Choose the destination.', 'sgs-blocks' ) } __nextHasNoMarginBottom>
					<Button variant="tertiary">Add link</Button>
				</BaseControl>
			</PanelBody>
		</InspectorControls>
	);
}
