/**
 * The entrance a delegating block's children play in the editor canvas (Spec 38A §6.2, §8, FR-38A-8). In a delegating
 * mode (an `sgs/card-grid` with `source` `wc-product` or `cpt-collection`) the canvas shows the server's own preview,
 * one `sgs/product-card` per result, and that preview already carries what the page has: each child root's entrance
 * marker (`data-sgs-me`) and scope style from `Sgs_Motion_Delegate::child_motion`, and, when the block stores a
 * stagger, each child root's `data-sgs-loop-i` index with the inline per-child delay rules
 * (`render-delegated.php`, `Sgs_Motion_Loop_Delays::item_array` in a REST render). The canvas therefore writes no delay
 * rules of its own here; it gives Replay a plan on the child roots, so Replay plays the children at their delays.
 *
 * A child root plays an entrance when the page hands it one (`Sgs_Motion_Delegate::child_motion`): a block part mapped
 * onto the child's root holds an entrance (Replay plays it from that part), or else, with the stagger's `apply` on, the
 * container's own entrance moves to the children (`delegatedMove`, Replay plays it from the container's target).
 *
 * @package
 */

import { sanitiseDocument } from './document-sanitise';
import { delegatedMove } from './stagger-apply';

const hasBase = ( element ) => {
	const base = element?.entrance?.base;
	return (
		Boolean( base ) && typeof base === 'object' && ! Array.isArray( base )
	);
};

/**
 * The class WordPress gives a block's root (`wp_get_block_default_classname`), for example `wp-block-sgs-product-card`.
 *
 * @param {string} blockName Block name.
 * @return {string} The class, or '' for an unusable name.
 */
export function blockRootClass( blockName ) {
	if (
		typeof blockName !== 'string' ||
		! /^[a-z0-9-]+\/[a-z0-9-]+$/.test( blockName )
	) {
		return '';
	}
	return `wp-block-${ blockName
		.replace( /^core\//, '' )
		.replace( '/', '-' ) }`;
}

/**
 * The Replay plans on a delegating block's child roots: one per target whose entrance the children play.
 *
 * @param {Object|undefined} motion             The stored motion attribute.
 * @param {Object}           options
 * @param {Object|null}      options.delegation `activeDelegation()`: `{ block, parts }`, null outside a delegating mode.
 * @param {Object}           options.elements   The block's `supports.sgs.elements`.
 * @return {Object[]} Plans (`classes` the child root class, no attributes to stamp, `entrance` true, `delegated` true).
 */
export function delegatedChildPlans( motion, { delegation, elements } ) {
	const rootClass = blockRootClass( delegation?.block );
	if ( rootClass === '' ) {
		return [];
	}
	const targets = sanitiseDocument( motion ).elements;
	if (
		! targets ||
		typeof targets !== 'object' ||
		Array.isArray( targets )
	) {
		return [];
	}
	const mapped = Object.entries( delegation.parts || {} )
		.filter(
			( [ part, to ] ) => to === 'root' && hasBase( targets[ part ] )
		)
		.map( ( [ part ] ) => part );
	const from =
		mapped.length === 0
			? delegatedMove( motion, targets, elements, delegation )
			: null;
	return ( from === null ? mapped : [ from ] ).map( ( target ) => ( {
		target,
		root: false,
		classes: [ rootClass ],
		tag: null,
		child: false,
		attrs: {},
		entrance: true,
		delegated: true,
	} ) );
}
