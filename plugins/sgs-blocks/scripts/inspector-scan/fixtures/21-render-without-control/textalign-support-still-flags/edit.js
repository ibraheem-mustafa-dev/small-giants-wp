/**
 * REGRESSION GUARD for the one mapping that was WRONG.
 *
 * `supports.typography.textAlign` IS a real WordPress support key — but unlike
 * fontSize and fontFamily, core does NOT register a named `textAlign`
 * attribute for it. It reads the value from
 * `$block_attributes['style']['typography']['textAlign']`
 * (wp-includes/block-supports/typography.php:184,246-247, read on WP 7.0.3).
 *
 * So a block declaring its OWN top-level `textAlign` attribute holds something
 * core's control never writes, and it must still FLAG. This fixture pins that:
 * `fontSize` (a genuine named-attribute support, declared alongside) must be
 * excluded, while `textAlign` must be reported — one fixture proving both the
 * inclusion and the exclusion side of the same `typography` branch.
 *
 * The live case this came from is sgs/cta-section, whose render.php:278-279
 * paints $attributes['textAlign'] with no control anywhere.
 */
export default function Edit() {
	return (
		<InspectorControls>
			<PanelBody title="Nothing here on purpose" />
		</InspectorControls>
	);
}
