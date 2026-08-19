/**
 * NEGATIVE CONTROL for TRANSITIVE shared-component resolution.
 *
 * This edit.js renders <BackgroundPanel> and nothing else. Neither attribute
 * above is named in this file, nor in BackgroundPanel.js, which forwards the
 * whole `attributes` / `setAttributes` pair down to <GradientOverlayControl>
 * (BackgroundPanel.js:102). The names only ever appear TWO levels down, in
 * src/components/GradientOverlayControl.js's DEFAULT_ATTR_NAMES (:73-76).
 *
 * A resolver that expands one level lands on a file naming neither and reports
 * two false defects. That is exactly what happened on the live tree: a QC
 * council measured 20 such findings across the four blocks rendering
 * <BackgroundPanel> (container, cta-section, hero, trust-bar).
 *
 * ⛔ NARROWED 2026-08-19 (C0), and this is why — it is the whole point of the
 * fixture. It previously declared FIVE attributes, asserting GradientOverlayControl
 * owned overlayGradientAngle/From/To as well. It no longer does: the component was
 * PARAMETERISED to `attrNames = DEFAULT_ATTR_NAMES` (:81), which names exactly two
 * keys — `overlayGradient` and `backgroundOverlayColour`. The other three are named
 * nowhere in src/components/ and survive only in src/blocks/hero/. So this fixture
 * had been FAILING at HEAD, correctly, for the reason its own docblock predicted:
 * "if GradientOverlayControl stops owning these attributes, this fixture starts
 * flagging and says so." It did, and nobody read it. The assertion is UNCHANGED —
 * only the premise was corrected to the two names the component genuinely owns.
 * ⛔ Do NOT re-add the other three to make a future failure go away; that would be
 * asserting a fact about the tree that is not true.
 *
 * Shared components resolve against the REAL src/ tree, not the fixture copy
 * (see REAL_SRC in core/components.js and the same reasoning in core/selftest.js),
 * so this genuinely exercises the production component graph — and still guards
 * against the nesting being deleted.
 */export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } />
		</InspectorControls>
	);
}
