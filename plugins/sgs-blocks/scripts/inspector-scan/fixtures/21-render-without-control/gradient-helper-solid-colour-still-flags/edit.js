/**
 * OVERMATCH GUARD for the gradientOverlayAttrKeys() call-site derivation.
 * `solid` is DELIBERATELY not derived (GradientOverlayControl.js:100-103,
 * D810): it is `<base>` twice in some overlay families and `<base>Colour`
 * once in others, never uniform. This block calls the helper with only its
 * base (`'panelOverlay'`), so `gradient` resolves — but `panelOverlayColour`
 * (the override-family solid attribute) is named nowhere in this file and
 * must still flag. If gradient-key derivation ever widened to also emit
 * `<base>Colour`, this fixture stops flagging incorrectly.
 */
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<GradientOverlayControl
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ gradientOverlayAttrKeys( 'panelOverlay' ) }
			/>
		</InspectorControls>
	);
}
