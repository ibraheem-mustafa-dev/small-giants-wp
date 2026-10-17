/**
 * NEGATIVE CONTROL for the extension-ownership exclusion.
 *
 * `sgsCustomCss`, `sgsHideOnMobile` and `sgsChildSizing` are all REGISTERED BY THE
 * EXTENSIONS (src/blocks/extensions/*.js), verified present in
 * includes/extension-attributes.generated.php. Their controls live in
 * `src/blocks/extensions/custom-css.js` and the other extension files, which `inspector-scan` structurally cannot
 * see — core/roster.js admits only directories containing a block.json, and an
 * extension has none. So none of the three may flag here.
 *
 * `headingText` is the in-fixture control: it is rendered AND controlled
 * below, so a correct run produces ZERO findings for this block. If it ever
 * flags, the corpus resolution broke rather than the exclusion.
 *
 * The exclusion reads the real extension registry, so these names are excluded
 * because an extension owns them, not because of their prefix.
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
