/**
 * NEGATIVE CONTROL for shared-component reach.
 *
 * Identical shape to shared-mount-flags, but the shared component only NAMES
 * SgsLinkControl in a docblock. A raw-text scan of the component would flag
 * this; the rule reads strippedText, so it must stay silent. Without this
 * control the positive twin could pass by matching prose rather than JSX.
 */
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelWithProseOnly attributes={ attributes } setAttributes={ setAttributes } />
		</InspectorControls>
	);
}
