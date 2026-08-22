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
 * @param {Object}   o
 * @param {string}   o.key            Row key, stable.
 * @param {string}   o.label          Already translated by the caller.
 * @param {Object}   o.attrs          The BLOCK'S OWN attribute names:
 *                                    { base, hover?, gradient?, hoverGradient? }
 * @param {Object}   o.attributes     The block's attributes object.
 * @param {Function} o.setAttributes  The block's setAttributes.
 * @return {Object} A row descriptor: { key, label, states }.
 */
export default function borderRow( { key, label, attrs, attributes, setAttributes } ) {
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
	};
}
