/**
 * MUST FLAG — detection 2 via `props.setAttributes(...)`.
 *
 * REGRESSION GUARD, added 2026-08-10 after the rule's first live run.
 *
 * The original matcher accepted only a bare `setAttributes(...)` Identifier
 * callee. Every panel in ContainerWrapperControls.js uses the MEMBER form
 * (`props.setAttributes({ minHeight: val })`, :1492) — so the rule was blind to
 * the single shape it was written to catch, while `--self-test` reported PASS
 * because the first fixture happened to use the destructured form.
 *
 * It surfaced only because the live count (9) was reconciled against the
 * hand-derived expected population (4) instead of being accepted. Without that
 * reconciliation the rule would have shipped green and unable to fire on its
 * own headline target. `a-test-can-pass-the-defect-it-was-written-to-catch`.
 */
export default function SiblingTriplePropsSetAttributes( props ) {
	return (
		<PanelBody title="Section (outer)">
			<SelectControl
				label="Min height"
				value={ props.attributes.minHeight || '' }
				onChange={ ( val ) => props.setAttributes( { minHeight: val } ) }
			/>
			<SelectControl
				label="Min height (tablet)"
				value={ props.attributes.minHeightTablet || '' }
				onChange={ ( val ) => props.setAttributes( { minHeightTablet: val } ) }
			/>
			<SelectControl
				label="Min height (mobile)"
				value={ props.attributes.minHeightMobile || '' }
				onChange={ ( val ) => props.setAttributes( { minHeightMobile: val } ) }
			/>
		</PanelBody>
	);
}
