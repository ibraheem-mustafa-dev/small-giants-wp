/**
 * NEGATIVE CONTROL for the extension-ownership exclusion.
 *
 * `fx`, `fxGridDotColour` and `sgsHoverScale` are all REGISTERED BY THE
 * EXTENSIONS (src/blocks/extensions/*.js), verified present in
 * includes/extension-attributes.generated.php. Their controls live in
 * `src/blocks/extensions/fx.js`, which `inspector-scan` structurally cannot
 * see — core/roster.js admits only directories containing a block.json, and an
 * extension has none. So none of the three may flag here.
 *
 * `headingText` is the in-fixture control: it is rendered AND controlled
 * below, so a correct run produces ZERO findings for this block. If it ever
 * flags, the corpus resolution broke rather than the exclusion.
 *
 * ⛔ Note `fx` and `fxGridDotColour` do NOT match the old `/^sgs[A-Z_]/`
 * exclusion at all — that is the bug this fixture exists to lock closed. The
 * whole motion family was invisible to the escape hatch meant to cover it,
 * which put every declaring block in a catch-22 between this rule and
 * check-undeclared-attrs.py.
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
