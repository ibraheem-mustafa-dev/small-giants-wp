/**
 * NEGATIVE CONTROL for TRAP B. `titleFontSizeTablet` has a real, working
 * control — but its literal name is never written out. It is assembled from a
 * variable prefix and a literal PascalCase base, exactly the way
 * src/components/TypographyControls.js:144 builds `fontSizeTablet`.
 *
 * A literal-name control check would score this "no control" and flag it. That
 * false positive is the trap; the rule must not fall into it.
 */
function fixtureAttrName( prefix, base ) {
	return prefix ? prefix + base : base.charAt( 0 ).toLowerCase() + base.slice( 1 );
}

export default function Edit( { attributes, setAttributes } ) {
	const prefix = 'title';
	const key = fixtureAttrName( prefix, 'FontSizeTablet' );
	return (
		<InspectorControls>
			<PanelBody title="Typography">
				<UnitControl
					label="Font size (tablet)"
					value={ attributes[ key ] }
					onChange={ ( v ) => setAttributes( { [ key ]: v } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
