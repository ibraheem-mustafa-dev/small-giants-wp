/**
 * `variantPreset` has NO inspector control here, and that is deliberate.
 * It is reachable through the native block-toolbar variation switcher — see
 * this fixture's variations.js. The rule must NOT flag it.
 *
 * `headingText` is controlled normally, so a correct run yields ZERO findings
 * for this block.
 */
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody title="Content">
				<TextControl
					label="Heading"
					value={ attributes.headingText }
					onChange={ ( v ) => setAttributes( { headingText: v } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
