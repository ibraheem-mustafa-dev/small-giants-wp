import { __ } from '@wordpress/i18n';

/**
 * textRow — the TEXT member of the five-variant colour family.
 *
 * Sibling of fillRow; see that file for the family's shape, placement rules and the
 * reasons behind them. Only the differences are documented here.
 *
 * ⛔ TEXT IS NOT FILL WITH A DIFFERENT PROPERTY. A text gradient needs
 * `background-clip:text`, which is a genuinely different CSS mechanism from painting a
 * background. That difference surfaces in BOTH halves:
 *   - JS   : the row declares `gradientCapable: true`, which makes SgsColourPanel
 *            render GradientCapableColourControl instead of DesignTokenPicker
 *            (SgsColourPanel.js:123 picks the control off that flag).
 *   - PHP  : sgs_resolve_text_colour_or_gradient() + sgs_text_colour_gradient_fallback_rule(),
 *            NOT sgs_background_paint_decl(). sgs_text_colour_decl() takes a colour only
 *            and cannot carry a gradient at all.
 *
 * ⚠ `gradientCapable` is set ONLY when the caller supplies a gradient attribute. Setting
 * it unconditionally would render the gradient-capable control on a row with nowhere to
 * store a gradient — a control whose value is discarded on save, which is the exact
 * silent-loss class this family exists to remove.
 *
 * NON-TOP-LEVEL BINDING (get/set) — same contract as fillRow (see that file's header
 * for the full rationale). Precedence: attrs and get/set are mutually exclusive (both
 * -> throws); get without set or set without get -> throws. The get/set path renders
 * only the 'normal' state and is never gradientCapable (gradientCapable derives from
 * attrs.gradient/attrs.hoverGradient, which do not exist on this path) — a hover tab
 * or a gradient toggle bound to nowhere is refused rather than silently half-wired.
 * `linked` is unconditional on both paths.
 *
 * THIRD STATE (`current`, added 2026-09-11, Spec 41 FR-41-3 / FR-41-2) — identical
 * contract to fillRow's; see that file's header for the full rationale, the
 * byte-identity acceptance condition, and the `describeRow()` same-commit coupling.
 * `attrs.currentGradient` also feeds `gradientCapable`, for the same reason
 * `attrs.gradient`/`attrs.hoverGradient` already do: a stored gradient with no
 * gradient-capable control is a value nothing can author.
 *
 * @param {Object}   o
 * @param {string}   o.key            Row key, stable.
 * @param {string}   o.label          Already translated by the caller.
 * @param {Object}   [o.attrs]        The BLOCK'S OWN top-level attribute names:
 *                                    { base, hover?, current?, gradient?,
 *                                    hoverGradient?, currentGradient? }.
 *                                    Mutually exclusive with o.get/o.set.
 * @param {Object}   [o.attributes]   The block's attributes object. Required with
 *                                    o.attrs; ignored on the o.get/o.set path.
 * @param {Function} [o.setAttributes] The block's setAttributes. Required with
 *                                    o.attrs; ignored on the o.get/o.set path.
 * @param {Function} [o.get]             Non-top-level reader — see fillRow's header.
 * @param {Function} [o.set]             Non-top-level writer — companion to o.get.
 * @param {string}   [o.contrastAgainst] Opt-in WCAG contrast check (see
 *                                    `GradientCapableColourControl`'s own prop of the
 *                                    same name) — a hex colour or theme palette token
 *                                    naming the background ACTUALLY rendered behind
 *                                    this row's text. The caller is responsible for
 *                                    working that out (it depends on the block's own
 *                                    background attributes/context — there is no
 *                                    general answer this row builder can derive).
 *                                    Passed straight through onto the descriptor;
 *                                    ignored entirely when the row isn't
 *                                    `gradientCapable` (DesignTokenPicker has no
 *                                    contrast check). Omit for no behaviour change.
 * @param {string}   [o.contrastLabel]   Paired override text — see the same prop on
 *                                    `GradientCapableColourControl`.
 * @return {Object} A row descriptor: { key, label, states, gradientCapable?, contrastAgainst?, contrastLabel? }.
 */
export default function textRow( {
	key,
	label,
	attrs,
	attributes,
	setAttributes,
	get,
	set,
	contrastAgainst,
	contrastLabel,
	contrastLargeText,
	heading,
	after,
} ) {
	if ( ( get || set ) && attrs ) {
		throw new Error(
			`textRow( "${ key }" ): supply EITHER attrs (top-level attribute binding) OR ` +
				'get/set (non-top-level binding) — never both. A row with two candidate ' +
				'bindings cannot tell which one is real.'
		);
	}

	if ( ( get && ! set ) || ( set && ! get ) ) {
		throw new Error(
			`textRow( "${ key }" ): get and set must be supplied together — a row with ` +
				'only one of the pair can read or write but not round-trip, which is the ' +
				'exact silent-loss class this family exists to remove.'
		);
	}

	if ( get && set ) {
		const normalGetSet = {
			key: 'normal',
			label: __( 'Normal', 'sgs-blocks' ),
			value: get(),
			onChange: ( val ) => set( val ?? '' ),
			linked: true,
		};

		return {
			key,
			label,
			states: [ normalGetSet ],
			...( heading ? { heading } : {} ),
			...( after ? { after } : {} ),
		};
	}

	const { base, hover, current, gradient, hoverGradient, currentGradient } = attrs || {};

	if ( ! base ) {
		throw new Error(
			`textRow( "${ key }" ): attrs.base is required — it names the block's own ` +
				'resting colour attribute. A row with no base attribute cannot round-trip.'
		);
	}

	if ( current && ! hover ) {
		throw new Error(
			`textRow( "${ key }" ): attrs.current requires attrs.hover — Current is the ` +
				'THIRD state of the three-state model (Spec 41 §1.3), never a substitute ' +
				'for Hover. A row with Normal + Current and no Hover has no meaning in ' +
				'this framework and would silently score as a 2-state row.'
		);
	}

	// Literal entries, never generated — rule 31 resolves the state count STATICALLY
	// (D738). describeRow() in core/golden.js mirrors this exact shape; if the states
	// logic here changes, that must change in the same commit or the census misreports.
	const normal = {
		key: 'normal',
		label: __( 'Normal', 'sgs-blocks' ),
		value: attributes[ base ],
		onChange: ( val ) => setAttributes( { [ base ]: val ?? '' } ),
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

	// Spec 41 FR-41-3's THIRD state — a literal entry appended at ARRAY level, the
	// same D738-safe shape as `hoverState`. Mirrors fillRow exactly.
	const currentState = {
		key: 'current',
		label: __( 'Current', 'sgs-blocks' ),
		value: attributes[ current ],
		onChange: ( val ) => setAttributes( { [ current ]: val ?? '' } ),
		linked: true,
		...( currentGradient
			? {
					gradientValue: attributes[ currentGradient ],
					onGradientChange: ( val ) =>
						setAttributes( { [ currentGradient ]: val ?? '' } ),
			  }
			: {} ),
	};

	return {
		key,
		label,
		states: hover
			? current
				? [ normal, hoverState, currentState ]
				: [ normal, hoverState ]
			: [ normal ],
		...( gradient || hoverGradient || currentGradient ? { gradientCapable: true } : {} ),
		...( contrastAgainst ? { contrastAgainst } : {} ),
		...( contrastLabel ? { contrastLabel } : {} ),
		...( contrastLargeText ? { contrastLargeText } : {} ),
		// See fillRow's note on why these are helper parameters rather than a spread
		// at the call site — a spread scores the row as one state in `describeRow()`.
		...( heading ? { heading } : {} ),
		...( after ? { after } : {} ),
	};
}
