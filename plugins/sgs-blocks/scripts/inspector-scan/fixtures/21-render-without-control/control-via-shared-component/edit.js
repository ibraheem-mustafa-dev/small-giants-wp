/**
 * NEGATIVE CONTROL for the shared-component surface. This block's own edit.js
 * never mentions `titleFontSizeMobile` in any form. The control comes entirely
 * from the REAL src/components/TypographyControls.js, which builds the key at
 * :145 as `typographyAttrName( prefix, 'FontSizeMobile' )`.
 *
 * This is the same indirection that made rule 18 blind to brand-strip and
 * team-member until component resolution was added. Resolved here the same way:
 * the JSX renders `<TypographyControls`, and that component's OWN source is
 * read to see which attribute keys it builds — never by matching an import path.
 */
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<TypographyControls
				prefix="title"
				attributes={ attributes }
				setAttributes={ setAttributes }
			/>
		</InspectorControls>
	);
}
