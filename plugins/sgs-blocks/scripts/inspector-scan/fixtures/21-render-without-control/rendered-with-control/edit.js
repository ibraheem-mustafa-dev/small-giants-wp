/**
 * NEGATIVE CONTROL: the same attribute name as the planted defect, but here it
 * has a real control. Proves the rule is keyed on reachability, not on the
 * attribute's name.
 */
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody title="Hover">
				<TextControl
					label="Hover shadow"
					value={ attributes.shadowHover }
					onChange={ ( v ) => setAttributes( { shadowHover: v } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
