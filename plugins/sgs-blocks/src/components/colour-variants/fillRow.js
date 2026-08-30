import { __ } from '@wordpress/i18n';

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
 * ⚠ STATE LABELS ARE TRANSLATED HERE. The inline rows this replaces all wrap
 * 'Normal'/'Hover' in __( …, 'sgs-blocks' ). A first version of this helper hardcoded
 * them as plain strings, which would have silently dropped two translatable strings
 * per adopted row from the .pot — an i18n regression invisible to every gate, found by
 * diffing against the real JSX it replaces rather than by review. The row LABEL stays
 * the caller's responsibility (it is block-specific); only the state labels are owned
 * here, because they are identical on every row in the family.
 *
 * NON-TOP-LEVEL BINDING (get/set, added 2026-08-30, owner-approved shape). Three real
 * colour controls (`sgs/mega-panel` asideSeparator.colour, `sgs/pricing-table`
 * plans[i].ribbonColour, `sgs/trust-bar` items[i].fillColour) cannot be named by a
 * single top-level attribute string, so `attrs.base` alone cannot reach them. `get`/
 * `set` replace the `attributes[base]` read and `setAttributes({[base]:…})` write with
 * caller-supplied functions; everything else about the row is unchanged.
 *   PRECEDENCE — attrs and get/set are mutually exclusive. Both -> throws (ambiguous
 *   binding). Neither -> throws (existing attrs.base-required error). Only one of
 *   get/set -> throws (a row that reads but can't write, or vice versa, round-trips
 *   nothing and fails silently downstream — refused loudly instead).
 *   SIBLING STATES — the get/set path renders ONLY the 'normal' state; it accepts no
 *   hover/gradient/hoverGradient. A hover TAB with a get/set base and no matching
 *   hover accessor would write nowhere and look fine — worse than refusing. Per-state
 *   overrides were considered and rejected for this pass: none of the three known
 *   adopters need a hover state on the get/set path today, and a partially-general
 *   API (some state names wired, others not) is a worse contract than "single-state
 *   only, extend when a real caller needs more". Extending later is additive — a
 *   `hoverGet`/`hoverSet` pair could be added without breaking this shape.
 *   linked — unconditional on both paths; it is a property of DesignTokenPicker, not
 *   of how the value is read/written, so the get/set path carries it identically.
 *
 * @param {Object}   o
 * @param {string}   o.key            Row key, stable — used by rule 31 and by
 *                                    supports.sgs.colourExemptions lookups.
 * @param {string}   o.label          Already translated by the caller.
 * @param {Object}   [o.attrs]        The BLOCK'S OWN top-level attribute names:
 *                                    { base, hover?, gradient?, hoverGradient? }.
 *                                    Mutually exclusive with o.get/o.set — see below.
 * @param {Object}   [o.attributes]   The block's attributes object. Required when
 *                                    o.attrs is used; ignored (and not required) on
 *                                    the o.get/o.set path.
 * @param {Function} [o.setAttributes] The block's setAttributes. Required when
 *                                    o.attrs is used; ignored (and not required) on
 *                                    the o.get/o.set path.
 * @param {Function} [o.get]          NON-TOP-LEVEL BINDING (2026-08-30). Reads the
 *                                    resting value from wherever it actually lives —
 *                                    an object-attribute field (`asideSeparator.colour`)
 *                                    or a repeater item (`plans[i].ribbonColour`). Must
 *                                    be paired with o.set; supplying only one of the
 *                                    pair throws (see below) rather than silently
 *                                    rendering a row that reads or writes nowhere.
 * @param {Function} [o.set]          Companion writer for o.get. Receives the picked
 *                                    value (or `undefined` on clear — mirror the
 *                                    `val ?? ''` normalisation done on the attrs path)
 *                                    and is responsible for the whole write, however
 *                                    deep — e.g.
 *                                    `( val ) => setAttributes( { asideSeparator: { ...asideSeparator, colour: val ?? '' } } )`.
 * @return {Object} A row descriptor: { key, label, states }.
 */
export default function fillRow( { key, label, attrs, attributes, setAttributes, get, set } ) {
	// PRECEDENCE RULE (2026-08-30): attrs and get/set are MUTUALLY EXCLUSIVE, checked
	// before anything else runs. Supplying both is refused loudly — a caller who wires
	// attrs.base AND get/set almost certainly means the get/set is the real binding and
	// attrs.base is stale copy-paste (or vice versa); silently preferring one would let
	// the other rot invisibly. This mirrors the existing "attrs.base is required" error
	// style rather than inventing a new one.
	if ( ( get || set ) && attrs ) {
		throw new Error(
			`fillRow( "${ key }" ): supply EITHER attrs (top-level attribute binding) OR ` +
				'get/set (non-top-level binding) — never both. A row with two candidate ' +
				'bindings cannot tell which one is real.'
		);
	}

	if ( ( get && ! set ) || ( set && ! get ) ) {
		throw new Error(
			`fillRow( "${ key }" ): get and set must be supplied together — a row with ` +
				'only one of the pair can read or write but not round-trip, which is the ' +
				'exact silent-loss class this family exists to remove.'
		);
	}

	const usingGetSet = Boolean( get && set );

	if ( usingGetSet ) {
		// NON-TOP-LEVEL BINDING PATH. There is deliberately no hover/gradient/
		// hoverGradient parameter here — sibling states only exist via attrs (the
		// top-level path), and attrs+get/set is refused above. A caller cannot reach
		// a half-wired hover tab through this path; it can only ever produce the
		// single-state row below. See the file-header note (SIBLING STATES) for why
		// per-state overrides were not built instead.
		const normal = {
			key: 'normal',
			label: __( 'Normal', 'sgs-blocks' ),
			value: get(),
			onChange: ( val ) => set( val ?? '' ),
			// linked:true stores the PALETTE SLUG rather than a resolved hex, so a
			// client's brand token survives a theme change (D717/D740). This is NOT
			// conditional on the binding shape — it is a property of DesignTokenPicker
			// itself, so it applies identically on the get/set path.
			linked: true,
		};

		return {
			key,
			label,
			states: [ normal ],
		};
	}

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
		label: __( 'Normal', 'sgs-blocks' ),
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
		label: __( 'Hover', 'sgs-blocks' ),
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
