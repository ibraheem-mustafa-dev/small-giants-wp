import { __ } from '@wordpress/i18n';

/**
 * borderRow — the BORDER member of the five-variant colour family.
 *
 * Sibling of fillRow; see that file for the family's shape, placement rules and the
 * reasons behind them. Only the differences are documented here.
 *
 * ⛔ BORDER'S PHP EMITTER TAKES BOTH STATES IN ONE CALL, unlike fill and text:
 *   sgs_border_gradient_css( $selector, $normal_paint, $hover_paint = null, $width = '2px' )
 * A border gradient is painted with a border-image/background trick that has to know
 * both states together, so the PHP side cannot be a per-state declaration list the way
 * sgs_fill_decls() is. sgs_border_states_css() therefore returns finished CSS rather
 * than declarations — the ONE variant where that is correct, and it is correct because
 * of the underlying primitive, not for convenience.
 *
 * The JS half is otherwise identical to fillRow: a plain row whose per-state gradient
 * rides on gradientValue/onGradientChange. Border does NOT use gradientCapable — that
 * flag selects GradientCapableColourControl, which exists for the background-clip:text
 * mechanism and would be the wrong control here.
 *
 * ⚠ BORDER-STYLE PASSTHROUGH (added 2026-08-22, adopt.js). SgsColourPanel forwards
 * `row.borderStyle`/`row.onBorderStyleChange` straight through to DesignTokenPicker
 * (SgsColourPanel.js:132) — the border-style icon popover some blocks (e.g.
 * sgs/heading's "Border colour" row) wire to the SAME `borderStyle` attribute the
 * compact Border panel already uses, so either entry point stays in sync. Accepting
 * them here is a pure passthrough with no new behaviour: when the caller doesn't pass
 * them, the row carries no such keys at all, exactly as before this change.
 *
 * @param {Object}    o
 * @param {string}    o.key                   Row key, stable.
 * @param {string}    o.label                 Already translated by the caller.
 * @param {Object}    o.attrs                 The BLOCK'S OWN attribute names:
 *                                            { base, hover?, gradient?, hoverGradient? }
 * @param {Object}    o.attributes            The block's attributes object.
 * @param {Function}  o.setAttributes         The block's setAttributes.
 * @param {string}    [o.borderStyle]         Optional — the block's own borderStyle value,
 *                                            forwarded verbatim to the border-style popover.
 * @param {Function}  [o.onBorderStyleChange] Optional — paired with o.borderStyle; forwarded
 *                                            verbatim. Both or neither — a row wiring only one
 *                                            of the pair is a caller bug, not something this
 *                                            helper should paper over.
 * @return {Object} A row descriptor: { key, label, states, borderStyle?, onBorderStyleChange? }.
 */
export default function borderRow( {
	key,
	label,
	attrs,
	attributes,
	setAttributes,
	borderStyle,
	onBorderStyleChange,
} ) {
	const { base, hover, gradient, hoverGradient } = attrs || {};

	if ( ! base ) {
		throw new Error(
			`borderRow( "${ key }" ): attrs.base is required — it names the block's own ` +
				'resting colour attribute. A row with no base attribute cannot round-trip.'
		);
	}

	// Literal entries, never generated (D738). describeRow() mirrors this shape.
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

	return {
		key,
		label,
		states: hover ? [ normal, hoverState ] : [ normal ],
		// Passthrough only — omitted entirely (not `undefined`-valued keys) when the
		// caller supplies neither, so a row with no border-style wiring looks exactly
		// as it did before this parameter pair existed.
		...( borderStyle !== undefined || onBorderStyleChange !== undefined
			? { borderStyle, onBorderStyleChange }
			: {} ),
	};
}
