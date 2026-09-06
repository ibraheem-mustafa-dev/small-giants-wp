/**
 * NEGATIVE CONTROL for the gradientOverlayAttrKeys() call-site derivation.
 * `panelOverlayGradient` never appears literally anywhere in this file — it
 * exists ONLY as the value gradientOverlayAttrKeys() computes at call time
 * from the literal base `'panelOverlay'`. This is the exact D810 shape
 * (`mediaOverlayGradient` on sgs/hero).
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
