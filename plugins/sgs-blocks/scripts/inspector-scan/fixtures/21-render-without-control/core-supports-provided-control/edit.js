/**
 * NEGATIVE CONTROL for the WordPress-core control surface.
 *
 * All three attributes are painted by this fixture's render.php and NONE of
 * them appears in the inspector below — the exact shape the rule flags. They
 * must nevertheless produce ZERO findings, because the block.json opts into
 * `supports.anchor` and `supports.color`, and WordPress core itself registers
 * those attributes and renders their controls (the Advanced panel's HTML
 * anchor field, and the Colour panel). Core's controls live in neither this
 * edit.js nor any SGS shared component, so the rule's two corpora cannot see
 * them.
 *
 * Its POSITIVE twin is `core-supports-absent-still-flags`, which is this same
 * fixture with the `supports` block removed. That twin is in `mustFlag`, so if
 * the exclusion ever widens into "always skip these attribute names" the twin
 * goes green and the self-test fails. The pair is what stops this exclusion
 * being a rule that cannot fail (H6).
 */
export default function Edit() {
	return (
		<InspectorControls>
			<PanelBody title="Nothing here on purpose" />
		</InspectorControls>
	);
}
