/**
 * OVERMATCH GUARD for the shadowAttrKeys() call-site derivation. The call
 * below passes a VARIABLE, not a literal string, as the base argument — the
 * helper's real derivation formula (base + 'Colour') is therefore genuinely
 * unknown to this static scanner, and `tileShadowColour` is declared and
 * rendered by nothing else in this fixture. If this exemption widened from
 * "the call site's own literal argument" to "any shadowAttrKeys() call
 * anywhere nearby", this fixture stops flagging incorrectly.
 */
export default function Edit( { attributes, setAttributes, shadowBase } ) {
	return (
		<InspectorControls>
			<ShadowControl
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ shadowAttrKeys( shadowBase, { hoverColour: true } ) }
			/>
		</InspectorControls>
	);
}
