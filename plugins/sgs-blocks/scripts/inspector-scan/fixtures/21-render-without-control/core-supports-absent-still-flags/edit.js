/**
 * POSITIVE CONTROL for the WordPress-core control surface exclusion.
 *
 * Byte-for-byte the same defect shape as `core-supports-provided-control` —
 * same three attribute names, same empty inspector, same render surface — with
 * ONE difference: this block.json declares no `supports` at all. Nothing core
 * registers these attributes here, so nothing renders a control for them and
 * all three must FLAG.
 *
 * Without this twin the exclusion would be untestable: a rule that skipped
 * `anchor`/`backgroundColor`/`textColor` unconditionally would pass the
 * negative control just as happily as the correct per-block reading does.
 */
export default function Edit() {
	return (
		<InspectorControls>
			<PanelBody title="Nothing here on purpose" />
		</InspectorControls>
	);
}
