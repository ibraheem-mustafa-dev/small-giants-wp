/**
 * NEGATIVE CONTROL for typographyAttrKeys() called DIRECTLY with a literal
 * prefix (rather than via <TypographyControls>, which is already covered by
 * the general dynamic-key resolver reading that component's own source).
 * `captionFontWeight` and `captionLetterSpacing` never appear literally
 * anywhere in this file — they exist only as VALUES of the map
 * typographyAttrKeys() computes at call time from the literal prefix
 * `'caption'`.
 */
export default function Edit( { attributes, setAttributes } ) {
	const keys = typographyAttrKeys( 'caption' );
	return (
		<InspectorControls>
			<SelectControl
				label="Caption font weight"
				value={ attributes[ keys.fontWeight ] }
				onChange={ ( v ) => setAttributes( { [ keys.fontWeight ]: v } ) }
			/>
			<UnitControl
				label="Caption letter spacing"
				value={ attributes[ keys.letterSpacing ] }
				onChange={ ( v ) => setAttributes( { [ keys.letterSpacing ]: v } ) }
			/>
		</InspectorControls>
	);
}
