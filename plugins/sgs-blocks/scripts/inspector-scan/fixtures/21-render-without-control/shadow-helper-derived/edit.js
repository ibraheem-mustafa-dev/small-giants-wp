/**
 * NEGATIVE CONTROL for the shadowAttrKeys() call-site derivation
 * (helperDerivedAttrs() in the rule file). None of `panelShadowColour`,
 * `panelShadowHover` or `panelShadowColourHover` appears literally anywhere
 * in this file — they exist ONLY as the values `shadowAttrKeys()` computes at
 * call time from the literal base `'panelShadow'`, exactly the D810 shape
 * that blinded the rule on sgs/hero (`mediaOverlayGradient` /
 * `mediaBackgroundGradient`).
 */
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<ShadowControl
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ shadowAttrKeys( 'panelShadow', { hover: true, hoverColour: true } ) }
			/>
		</InspectorControls>
	);
}
