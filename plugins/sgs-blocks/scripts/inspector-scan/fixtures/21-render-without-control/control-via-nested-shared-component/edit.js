/**
 * NEGATIVE CONTROL for TRANSITIVE shared-component resolution.
 *
 * This edit.js renders <BackgroundPanel> and nothing else. None of the five
 * attributes above is named anywhere in this file — nor in BackgroundPanel's
 * own file, which forwards the whole `attributes` / `setAttributes` pair down
 * to <GradientOverlayControl> (ContainerWrapperControls.js:935). The names only
 * ever appear TWO levels down, in src/components/GradientOverlayControl.js.
 *
 * A resolver that expands one level lands on a file mentioning none of them and
 * reports five false defects. That is exactly what happened on the live tree:
 * a QC council measured 20 such findings across the four blocks that render
 * <BackgroundPanel> (container, cta-section, hero, trust-bar).
 *
 * Shared components resolve against the REAL src/ tree, not the fixture copy
 * (see REAL_SRC in the rule and the same reasoning in core/selftest.js), so
 * this fixture genuinely exercises the production component graph. It therefore
 * ALSO guards against someone deleting the nesting: if GradientOverlayControl
 * stops owning these attributes, this fixture starts flagging and says so.
 */
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } />
		</InspectorControls>
	);
}
