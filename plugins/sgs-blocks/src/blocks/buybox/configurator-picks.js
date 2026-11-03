/**
 * sgs/buybox "Pick a set" — the pure pick rules (no DOM).
 *
 * The count limits are the choice-flow ones, imported (flow-multi.js owns them): parseLimits, canAddAnswer, meetsLeast.
 * `order` is the list of picked slugs in the order they were chosen; the order survives a replacement.
 *
 * @package SGS\Blocks
 */

import { parseLimits, canAddAnswer, meetsLeast } from '../choice-flow/flow-multi.js';

export { parseLimits, canAddAnswer, meetsLeast };

/**
 * Add a pick.
 *
 * @param {string[]} order    Slugs picked so far, oldest first.
 * @param {string}   slug     The slug being picked.
 * @param {number}   most     The most allowed.
 * @param {string}   overflow `refuse` (say no) or `replace` (swap out the oldest pick).
 * @return {{order: string[], removed: string|null, refused: boolean}} `removed` is the swapped-out slug.
 */
export function applyPick( order, slug, most, overflow ) {
	if ( order.includes( slug ) ) {
		return { order: order.slice(), removed: null, refused: false };
	}
	if ( canAddAnswer( order.length, most ) ) {
		return { order: [ ...order, slug ], removed: null, refused: false };
	}
	if ( 'replace' === overflow && order.length > 0 ) {
		return { order: [ ...order.slice( 1 ), slug ], removed: order[ 0 ], refused: false };
	}
	return { order: order.slice(), removed: null, refused: true };
}

/**
 * Remove a pick. In a group whose least is 1, the last remaining pick cannot be cleared.
 *
 * @param {string[]} order Slugs picked, oldest first.
 * @param {string}   slug  The slug being cleared.
 * @param {number}   least The fewest allowed.
 * @return {{order: string[], kept: boolean}} `kept` is true when the clear was refused.
 */
export function removePick( order, slug, least ) {
	if ( ! order.includes( slug ) ) {
		return { order: order.slice(), kept: false };
	}
	if ( 1 === least && 1 === order.length ) {
		return { order: order.slice(), kept: true };
	}
	return { order: order.filter( ( s ) => s !== slug ), kept: false };
}

/**
 * Restore a swapped-out pick (Undo): the swapped-in pick goes, the removed one returns as the oldest.
 *
 * @param {string[]} order   Slugs picked now.
 * @param {string}   added   The pick the swap added.
 * @param {string}   removed The pick the swap removed.
 * @return {string[]} The order before the swap.
 */
export function undoSwap( order, added, removed ) {
	return [ removed, ...order.filter( ( s ) => s !== added && s !== removed ) ];
}

/**
 * Shopper-set counts: change one pick's count by `delta`, never past the pack total or below 1.
 *
 * @param {Object<string,number>} counts Slug to count.
 * @param {string}                slug   The pick.
 * @param {number}                delta  +1 or -1.
 * @param {number}                pack   Pack size (the counts' total).
 * @return {Object<string,number>} A new counts map.
 */
export function stepCount( counts, slug, delta, pack ) {
	const total = Object.values( counts ).reduce( ( a, b ) => a + b, 0 );
	const current = counts[ slug ] || 0;
	const next = current + delta;
	if ( next < 1 || ( delta > 0 && total >= pack ) ) {
		return { ...counts };
	}
	return { ...counts, [ slug ]: next };
}

/**
 * Counts for a newly picked option under "Shopper sets counts": 1 while the pack has room, else refused.
 *
 * @param {Object<string,number>} counts Slug to count.
 * @param {string}                slug   The pick.
 * @param {number}                pack   Pack size.
 * @return {Object<string,number>|null} New counts, or null when the pack is already full.
 */
export function addCounted( counts, slug, pack ) {
	const total = Object.values( counts ).reduce( ( a, b ) => a + b, 0 );
	return total >= pack ? null : { ...counts, [ slug ]: 1 };
}

/**
 * Whether the counts add up to the pack.
 *
 * @param {Object<string,number>} counts Slug to count.
 * @param {number}                pack   Pack size.
 * @return {boolean}
 */
export function countsComplete( counts, pack ) {
	return Object.values( counts ).reduce( ( a, b ) => a + b, 0 ) === pack;
}
