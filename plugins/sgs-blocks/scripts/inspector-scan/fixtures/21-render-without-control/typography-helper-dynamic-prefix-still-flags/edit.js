/**
 * OVERMATCH GUARD for the direct typographyAttrKeys() call-site derivation.
 * The call below passes a VARIABLE, not a literal string, as the prefix
 * argument — the derivation formula (prefix + 'FontWeight') is therefore
 * genuinely unknown to this static scanner, and `labelFontWeight` is
 * declared and rendered by nothing else in this fixture. If this exemption
 * widened from "the call site's own literal prefix" to "any
 * typographyAttrKeys() call anywhere nearby", this fixture stops flagging
 * incorrectly.
 */
export default function Edit( { attributes, setAttributes, elementPrefix } ) {
	const keys = typographyAttrKeys( elementPrefix );
	return (
		<InspectorControls>
			<SelectControl
				label="Font weight"
				value={ attributes[ keys.fontWeight ] }
				onChange={ ( v ) => setAttributes( { [ keys.fontWeight ]: v } ) }
			/>
		</InspectorControls>
	);
}
