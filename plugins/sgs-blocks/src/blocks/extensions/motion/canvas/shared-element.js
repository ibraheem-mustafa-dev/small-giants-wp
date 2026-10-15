/**
 * Two motion targets on one element, in the canvas: the twin of
 * `includes/motion/class-sgs-motion-shared-element.php` (Spec 38A §6.2, §6.5). The target declared earlier (`root`,
 * then the parts in `supports.sgs.elements` order, then custom targets in stored order) keeps the element's hover state
 * and entrance; a later target that shares any element with it loses its `hover.state` and `entrance.base` and writes no
 * `transition`. Its effect layers stay.
 *
 * @package SGS\Blocks
 */

import { motionParts } from './resolve-target';

const LAYERS = Object.freeze( [ 'hover.state', 'entrance.base' ] );

/**
 * A target's place in declaration order.
 *
 * @param {string} target   Target key.
 * @param {Object} elements `supports.sgs.elements`.
 * @return {number} Rank (lower is earlier).
 */
export function targetRank( target, elements ) {
	if ( target === 'root' ) {
		return -1;
	}
	const at = Object.keys( motionParts( elements ) ).indexOf( target );
	return at === -1 ? 100000 : at;
}

/**
 * The targets that share an element with an earlier-declared target: target => the earlier target it yields to.
 *
 * @param {Array<{target:string}>}    plans    Plans in stored order.
 * @param {Object}                    elements `supports.sgs.elements`.
 * @param {(plan:Object)=>Element[]} elementsOf Each plan's elements.
 * @return {Object<string,string>} Losers.
 */
export function sharedLosers( plans, elements, elementsOf ) {
	if ( plans.length < 2 ) {
		return {};
	}
	const order = plans
		.map( ( plan, index ) => ( { plan, index } ) )
		.sort( ( a, b ) => {
			const ra = targetRank( a.plan.target, elements );
			const rb = targetRank( b.plan.target, elements );
			return ra === rb ? a.index - b.index : ra - rb;
		} )
		.map( ( { plan } ) => plan );
	const keeper = new Map();
	const out = {};
	order.forEach( ( plan ) => {
		elementsOf( plan ).forEach( ( el ) => {
			if ( ! keeper.has( el ) ) {
				keeper.set( el, plan.target );
			} else if ( keeper.get( el ) !== plan.target && ! out[ plan.target ] ) {
				out[ plan.target ] = keeper.get( el );
			}
		} );
	} );
	return out;
}

/**
 * An element without its hover state and entrance.
 *
 * @param {Object} element The stored element.
 * @return {Object} A new element.
 */
export function stripShared( element ) {
	const out = { ...element };
	LAYERS.forEach( ( path ) => {
		const [ panel, key ] = path.split( '.' );
		if ( out[ panel ] && typeof out[ panel ] === 'object' && key in out[ panel ] ) {
			const rest = { ...out[ panel ] };
			delete rest[ key ];
			if ( Object.keys( rest ).length === 0 ) {
				delete out[ panel ];
			} else {
				out[ panel ] = rest;
			}
		}
	} );
	return out;
}
