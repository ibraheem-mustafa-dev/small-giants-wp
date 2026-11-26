/**
 * The trust bar's Overflow control as one stored value (Spec 02, trust bar "Overflow"): the ticker IS the root's
 * marquee effect layer (`sgsMotion.elements.root.effects[effect=marquee]`), the same layer the Effects panel edits, and
 * `overflowMode` keeps only the facts a marquee cannot hold (`wrap` or `drop`, "Hide extras").
 *
 * - No marquee layer: the control offers Ticker, Wrap and Hide extras; it shows Hide extras when `overflowMode` is
 *   `drop`, else Wrap (nothing scrolls, the badges wrap).
 * - A layer with `belowBreakpoint: overflow`: the control shows Ticker. Wrap and Hide extras remove the layer.
 * - A layer limited to tablet or mobile: Wrap and Hide extras say what happens outside that range and keep the layer;
 *   Ticker is not offered (the range is the Effects panel's).
 * - A layer that runs at every width (`always`, or no range): the control is not shown; the Effects panel owns it.
 *
 * Ticker on a bar with no layer adds the default overflow layer (`includes/motion/data/trust-bar-default-ticker.json`,
 * the same layer a newly inserted bar starts with) through `addLayer` and `updateLayer`, so the schema checks it.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import DEFAULT_TICKER_LAYER from '../../../includes/motion/data/trust-bar-default-ticker.json';
import {
	addLayer,
	removeLayer,
	updateLayer,
} from '../extensions/motion/layers/use-motion-layers';

const TARGET = 'root';
const LIST = 'effects';

/**
 * The root's stored marquee layer, found by its effect (a layer's id may be anything).
 *
 * @param {Object|undefined} motion The block's `sgsMotion`.
 * @return {Object|undefined} The layer, or undefined.
 */
export function marqueeLayerOf( motion ) {
	const effects = motion?.elements?.root?.effects;
	return Array.isArray( effects )
		? effects.find( ( layer ) => layer?.effect === 'marquee' )
		: undefined;
}

/**
 * Where the stored marquee runs: `none` (no layer), `overflow`, `ranged` (tablet or mobile) or `every` (always, or no
 * range).
 *
 * @param {Object|undefined} motion The block's `sgsMotion`.
 * @return {string} The range kind.
 */
export function marqueeRangeKind( motion ) {
	const layer = marqueeLayerOf( motion );
	if ( ! layer ) {
		return 'none';
	}
	const range = layer.values?.belowBreakpoint;
	if ( 'overflow' === range ) {
		return 'overflow';
	}
	return 'tablet' === range || 'mobile' === range ? 'ranged' : 'every';
}

/**
 * The choices the control offers, or an empty list when it is not shown.
 *
 * @param {Object|undefined} motion The block's `sgsMotion`.
 * @return {string[]} Choice values, in order.
 */
export function overflowChoices( motion ) {
	const kind = marqueeRangeKind( motion );
	if ( 'every' === kind ) {
		return [];
	}
	return 'ranged' === kind
		? [ 'wrap', 'drop' ]
		: [ 'ticker', 'wrap', 'drop' ];
}

/**
 * The choice the control shows.
 *
 * @param {Object|undefined} motion       The block's `sgsMotion`.
 * @param {string|undefined} overflowMode The block's `overflowMode`.
 * @return {string} `ticker`, `wrap` or `drop`.
 */
export function overflowChoiceOf( motion, overflowMode ) {
	if ( 'overflow' === marqueeRangeKind( motion ) ) {
		return 'ticker';
	}
	return 'drop' === overflowMode ? 'drop' : 'wrap';
}

/**
 * The attributes a choice writes: `{ sgsMotion, overflowMode }`, or `{ refused, detail }` when the layer cannot be
 * stored: `refused` is a reason code (`ranged`, `full`, `refused` or `invalid`) for overflowRefusalText(), `detail` the
 * motion helpers' own words.
 *
 * @param {Object|undefined} motion The block's `sgsMotion`.
 * @param {string}           choice `ticker`, `wrap` or `drop`.
 * @return {Object} The attributes to set, or `{ refused: string, detail: string }`.
 */
export function withOverflowChoice( motion, choice ) {
	const kind = marqueeRangeKind( motion );
	if ( 'ticker' === choice ) {
		if ( 'overflow' === kind ) {
			return { sgsMotion: motion, overflowMode: 'ticker' };
		}
		if ( 'none' !== kind ) {
			return {
				refused: 'ranged',
				detail: 'the marquee has its own width range in the Effects panel',
			};
		}
		const added = addLayer( motion, TARGET, LIST, { effect: 'marquee' } );
		if ( ! added.motion ) {
			let code = 'invalid';
			if ( added.full ) {
				code = 'full';
			} else if ( added.refusal ) {
				code = 'refused';
			}
			return {
				refused: code,
				detail: added.refusal || added.invalid || '',
			};
		}
		const updated = updateLayer(
			added.motion,
			TARGET,
			LIST,
			added.layer.id,
			{
				id: added.layer.id,
				effect: 'marquee',
				values: { ...DEFAULT_TICKER_LAYER.values },
			}
		);
		if ( ! updated.motion ) {
			return {
				refused: updated.refusal ? 'refused' : 'invalid',
				detail: updated.refusal || updated.invalid || '',
			};
		}
		return { sgsMotion: updated.motion, overflowMode: 'ticker' };
	}
	const mode = 'drop' === choice ? 'drop' : 'wrap';
	const layer = marqueeLayerOf( motion );
	if ( 'overflow' === kind ) {
		// A layer saved without an id is removed by identity, so no other id-less layer goes with it.
		const removed = layer.id
			? removeLayer( motion, TARGET, LIST, layer.id )
			: {
					...motion,
					elements: {
						...motion.elements,
						root: {
							...motion.elements.root,
							effects: motion.elements.root.effects.filter(
								( other ) => other !== layer
							),
						},
					},
			  };
		return { sgsMotion: removed, overflowMode: mode };
	}
	return { sgsMotion: motion, overflowMode: mode };
}

/**
 * The translated sentence the Overflow control shows for a refusal code from withOverflowChoice().
 *
 * @param {string} code The reason code.
 * @return {string} The sentence.
 */
export function overflowRefusalText( code ) {
	if ( 'ranged' === code ) {
		return __(
			'This marquee has its own width range. Change it in the Effects panel.',
			'sgs-blocks'
		);
	}
	if ( 'full' === code ) {
		return __(
			'This block already holds as many effects as it can. Remove one in the Effects panel, then choose Ticker again.',
			'sgs-blocks'
		);
	}
	return __(
		'The ticker could not be added to this block. Check its effects in the Effects panel.',
		'sgs-blocks'
	);
}
