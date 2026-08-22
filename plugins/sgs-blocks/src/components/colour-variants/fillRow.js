/**
 * fillRow — the FILL member of the five-variant colour family.
 *
 * WHY THIS EXISTS. Measured 2026-08-22: 3,951 lines of inline colour-row JSX across
 * 64 blocks (testimonial 195, post-grid 148, brand-strip 133…). Every one of those
 * hand-assembles the same row shape. A codemod that PATCHES that code leaves 64
 * bespoke implementations behind; a helper REPLACES them. Bean's ruling — build the
 * helper, adopt it, don't automate the repetition.
 *
 * ⛔ THIS IS A FAÇADE, NOT NEW PAINT CODE. Every primitive underneath already exists
 * and is proven: SgsColourPanel (the panel), DesignTokenPicker (the row renderer),
 * and PHP-side sgs_background_paint_decl()/sgs_emit_state_colour_css(). What was
 * missing is a uniform contract tying control to emitter, so a block wires ONE thing
 * instead of hand-assembling a row and separately hand-writing its CSS.
 *
 * PLACEMENT — fill is a ROW, inside SgsColourPanel (which is itself a PanelBody).
 * The family splits 3 rows + 2 standalone controls, NOT 4 + 1:
 *   rows      : fill, text, border      -> consumed by SgsColourPanel's `rows` prop
 *   controls  : overlay, shadow         -> mounted in their OWN / host panels
 * Overlay already lives in BOTH BackgroundPanel and ShapeDividersPanel, so a control
 * variant can never assume a single home. Do not "tidy" this into one shape.
 *
 * ATTRIBUTE NAMES ARE THE CALLER'S (Bean's ruling 2026-08-22). The tree uses
 * boxShadowColour / cardShadowColour / tileShadowColour / navBg / backgroundColour —
 * all legitimate. Standardising them would rename stored attributes for zero user
 * gain, so this helper ADAPTS to whatever the block already declares.
 *
 * @param {Object}   o
 * @param {string}   o.key            Row key, stable — used by rule 31 and by
 *                                    supports.sgs.colourExemptions lookups.
 * @param {string}   o.label          Already translated by the caller.
 * @param {Object}   o.attrs          The BLOCK'S OWN attribute names:
 *                                    { base, hover?, gradient?, hoverGradient? }
 * @param {Object}   o.attributes     The block's attributes object.
 * @param {Function} o.setAttributes  The block's setAttributes.
 * @return {Object} A row descriptor: { key, label, states }.
 */
export default function fillRow( { key, label, attrs, attributes, setAttributes } ) {
	const { base, hover, gradient, hoverGradient } = attrs || {};

	if ( ! base ) {
		throw new Error(
			`fillRow( "${ key }" ): attrs.base is required — it names the block's own ` +
				'resting colour attribute. A row with no base attribute cannot round-trip.'
		);
	}

	// ⛔ BUILT AS LITERAL ARRAY ENTRIES, DELIBERATELY — never .map()/.filter() over a
	// spec list. Rule 31 resolves the state COUNT STATICALLY and cannot evaluate a
	// runtime predicate: a computed states array renders both states correctly while
	// the detector reports "carries 1 state". That is D738 — the code improved and the
	// gate went blind, which is worse than the honest finding it replaced. The `hover`
	// entry below is appended conditionally at ARRAY level, which stays statically
	// resolvable; the entries themselves are never generated.
	const normal = {
		key: 'normal',
		label: 'Normal',
		value: attributes[ base ],
		onChange: ( val ) => setAttributes( { [ base ]: val ?? '' } ),
		// linked:true stores the PALETTE SLUG rather than a resolved hex, so a client's
		// brand token survives a theme change (D717 for the overlay, D740 for shadow —
		// both shipped as bugs where a picker silently unlinked the token on every pick).
		linked: true,
		...( gradient
			? {
					gradientValue: attributes[ gradient ],
					onGradientChange: ( val ) => setAttributes( { [ gradient ]: val ?? '' } ),
			  }
			: {} ),
	};

	const hoverState = {
		key: 'hover',
		label: 'Hover',
		value: attributes[ hover ],
		onChange: ( val ) => setAttributes( { [ hover ]: val ?? '' } ),
		linked: true,
		...( hoverGradient
			? {
					gradientValue: attributes[ hoverGradient ],
					onGradientChange: ( val ) => setAttributes( { [ hoverGradient ]: val ?? '' } ),
			  }
			: {} ),
	};

	return {
		key,
		label,
		states: hover ? [ normal, hoverState ] : [ normal ],
	};
}
