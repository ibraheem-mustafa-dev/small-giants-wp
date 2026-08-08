/**
 * BOUNDARY NEGATIVE CONTROL. `orphanAttr` has no control AND no render
 * consumption — it is fully dead. That is check-dead-controls.js CHECK 4's
 * shape, NOT this rule's. Rule 21 must stay silent so the two gates do not
 * double-report the same attribute under two different fix instructions.
 */
export default function Edit() {
	return (
		<InspectorControls>
			<PanelBody title="Settings" />
		</InspectorControls>
	);
}
