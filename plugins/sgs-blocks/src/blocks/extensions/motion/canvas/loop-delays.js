/**
 * Stagger delays for a block that prints its items itself (`supports.sgs.motionItems`), in the editor canvas (Spec 38A
 * §8, FR-38A-26): the twin of `Sgs_Motion_Loop_Delays::item_array` and its `rules()`. With the container's `stagger`
 * settings stored, each item gets one scoped rule found by its `data-sgs-loop-i` index: its delay (`--sgs-me-delay`)
 * and the inheriting carrier the entrances inside the item read (`--sgs-me-loop-delay`), and, when an entrance of the
 * block plays on the `open` trigger, its close delay and that carrier. Tablet and Mobile get a rule only where a value
 * differs from the tier above. The arithmetic is the stagger helper's (`computeStaggerDelays`, `computeCloseDelays`);
 * Replay gives each item its index while it plays (`replay.js`).
 *
 * @package
 */

import {
	computeCloseDelays,
	computeStaggerDelays,
} from '../../../../components/motion/stagger-delays';
import { effectiveStagger } from '../../../../components/motion/StaggerHelper';
import { rules, TIERS } from './motion-schema';

/** Most items one block is given rules for (`Sgs_Motion_Loop_Delays::MAX_ITEMS`). */
export const MAX_ITEMS = 200;

/** The attribute that carries an item's index (`Sgs_Motion_Loop_Delays::ITEM_ATTR`). */
export const ITEM_ATTR = 'data-sgs-loop-i';

const isSettings = ( value ) =>
	Boolean( value ) &&
	typeof value === 'object' &&
	! Array.isArray( value ) &&
	Object.keys( value ).length > 0;

// Whether any of the block's entrances plays on the `open` trigger (`Sgs_Motion_Loop_Delays::close_delays`).
function opens( motion ) {
	const elements = motion?.elements;
	return Object.values(
		elements && typeof elements === 'object' ? elements : {}
	).some( ( element ) => element?.entrance?.base?.trigger === 'open' );
}

/**
 * The per-item delay rules.
 *
 * @param {Object|undefined} motion                The stored motion attribute (its `stagger` and entrance triggers).
 * @param {Object}           options
 * @param {string}           options.itemSelector  The scoped selector of one item (`<root> .sgs-card-grid__item`).
 * @param {number}           options.count         Items the canvas shows.
 * @param {Object}           options.columnsByTier The block's grid columns per tier (`entrance-facts.js::columnsAt`).
 * @return {string} CSS, empty when the block stores no stagger settings or every delay is 0.
 */
export function loopDelayCss(
	motion,
	{ itemSelector, count, columnsByTier = {} }
) {
	if (
		! isSettings( motion?.stagger ) ||
		typeof itemSelector !== 'string' ||
		itemSelector === '' ||
		! ( count > 0 )
	) {
		return '';
	}
	const stagger = effectiveStagger( motion.stagger );
	const total = Math.min( count, MAX_ITEMS );
	const delays = Object.fromEntries(
		TIERS.map( ( tier ) => [
			tier,
			computeStaggerDelays( {
				...stagger,
				count: total,
				columns: columnsByTier[ tier ],
			} ),
		] )
	);
	if (
		! TIERS.some( ( tier ) =>
			delays[ tier ].some( ( delay ) => delay !== 0 )
		)
	) {
		return '';
	}
	const props = { '--sgs-me-delay': delays, '--sgs-me-loop-delay': delays };
	if ( opens( motion ) ) {
		const order = [ 'reversed', 'together' ].includes( stagger.closeOrder )
			? stagger.closeOrder
			: 'same';
		const close = Object.fromEntries(
			TIERS.map( ( tier ) => [
				tier,
				computeCloseDelays( delays[ tier ], order ),
			] )
		);
		props[ '--sgs-me-close-delay' ] = close;
		props[ '--sgs-me-loop-close-delay' ] = close;
	}
	let css = '';
	for ( let i = 0; i < total; i++ ) {
		const decls = { desktop: {}, tablet: {}, mobile: {} };
		Object.entries( props ).forEach( ( [ prop, byTier ] ) => {
			let effect = byTier.desktop[ i ];
			decls.desktop[ prop ] = `${ effect }ms`;
			[ 'tablet', 'mobile' ].forEach( ( tier ) => {
				const value = byTier[ tier ][ i ] ?? effect;
				if ( value !== effect ) {
					decls[ tier ][ prop ] = `${ value }ms`;
					effect = value;
				}
			} );
		} );
		css += rules( `${ itemSelector }[${ ITEM_ATTR }="${ i }"]`, decls );
	}
	return css;
}
