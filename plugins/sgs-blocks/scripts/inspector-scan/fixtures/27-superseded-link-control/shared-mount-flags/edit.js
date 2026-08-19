/**
 * POSITIVE CONTROL for shared-component reach.
 *
 * This edit.js contains NO <SgsLinkControl of its own — the superseded control
 * lives one level down, in components/SharedLinkPanel.js. Before 2026-08-19
 * this rule read only the block's own edit.js, so a block shaped like this
 * passed CLEAN while shipping the superseded control. The rule was a GATE at
 * openBacklog 0 at the time, so that false absence read as "finished".
 */
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<SharedLinkPanel attributes={ attributes } setAttributes={ setAttributes } />
		</InspectorControls>
	);
}
