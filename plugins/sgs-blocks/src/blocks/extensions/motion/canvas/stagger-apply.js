/**
 * "Apply entrance to children" in the editor canvas (Spec 38A §8): with the stagger helper's `apply` on, the container's
 * own entrance moves onto its children, so the container no longer plays it and its movement never adds to each
 * child's. It moves only when something takes it, as on the page (`Sgs_Motion_Renderer::render`):
 * - a block holding inner blocks: the editor wrote it on each child (`stagger-write.js`), so it moves whenever the
 *   container has an entrance (`movedEntranceTarget`, the twin of `Sgs_Motion_Loop_Inherit::moved_target`);
 * - a delegating block in a delegating mode: when the child block's root takes it (`delegatedMove`, the twin of
 *   `Sgs_Motion_Delegate::hands_entrance`);
 * - a block that prints its items itself: when its declared item part (`supports.sgs.motionItems`) has no entrance of
 *   its own (`inheritedItem`, the twin of `Sgs_Motion_Loop_Inherit::inherited_layer`); the emitter then plays it on the
 *   items, and a canvas with no items keeps it on the container.
 *
 * @package
 */

import { motionParts } from './resolve-target';

const hasBase = ( element ) => {
	const base = element?.entrance?.base;
	return Boolean( base ) && typeof base === 'object' && ! Array.isArray( base );
};

const copy = ( value ) => JSON.parse( JSON.stringify( value ) );

/**
 * The target holding the container's own entrance: `root` when it has one, else the first wrapper part that has one.
 *
 * @param {Object} targets  The sanitised document's `elements`.
 * @param {Object} elements The block's `supports.sgs.elements`.
 * @return {string|null} The target key.
 */
function containerTarget( targets, elements ) {
	if ( hasBase( targets.root ) ) {
		return 'root';
	}
	const wrapper = Object.entries( motionParts( elements ) ).find(
		( [ part, isWrapper ] ) => isWrapper && hasBase( targets[ part ] )
	);
	return wrapper ? wrapper[ 0 ] : null;
}

/**
 * The target whose entrance a container holding inner blocks moves onto its children: `root` when it has an entrance,
 * else the first wrapper part that has one; null when `apply` is off or the container has no entrance.
 *
 * @param {Object|undefined} motion   The stored motion attribute (its `stagger.apply` is read).
 * @param {Object|undefined} targets  The sanitised document's `elements`.
 * @param {Object|undefined} elements The block's `supports.sgs.elements`.
 * @return {string|null} The target key.
 */
export function movedEntranceTarget( motion, targets, elements ) {
	if ( motion?.stagger?.apply !== true || ! targets || typeof targets !== 'object' ) {
		return null;
	}
	return containerTarget( targets, elements );
}

/**
 * The part a block declares as its printed items, when it is a declared part that is not a wrapper.
 *
 * @param {Object|undefined} elements    The block's `supports.sgs.elements`.
 * @param {*}                motionItems The block's `supports.sgs.motionItems`.
 * @return {string|null} The part key.
 */
export function declaredItemPart( elements, motionItems ) {
	const parts = motionParts( elements );
	return typeof motionItems === 'string' &&
		Object.prototype.hasOwnProperty.call( parts, motionItems ) &&
		! parts[ motionItems ]
		? motionItems
		: null;
}

/**
 * An entrance layer with every delay and close delay removed (the twin of
 * `Sgs_Motion_Loop_Inherit::without_delays`).
 *
 * @param {Object} base Entrance layer.
 * @return {Object} A copy without delays.
 */
export function withoutDelays( base ) {
	const out = copy( base );
	delete out.values?.delay;
	delete out.close?.closeDelay;
	Object.values( out.devices || {} ).forEach( ( set ) => {
		if ( set && typeof set === 'object' ) {
			delete set.delay;
			delete set.close?.closeDelay;
		}
	} );
	if ( Array.isArray( out.customised ) ) {
		out.customised = out.customised.filter(
			( path ) => typeof path !== 'string' || ! /(?:^|\.)(?:delay|closeDelay)$/.test( path )
		);
	}
	return out;
}

/**
 * What the declared item part inherits, before emission: `{ part, from, base }`, or null when `apply` is off, no item
 * part is declared, the item part has its own entrance or the container has none.
 *
 * @param {Object|undefined} motion      The stored motion attribute.
 * @param {Object|undefined} targets     The sanitised document's `elements`.
 * @param {Object|undefined} elements    The block's `supports.sgs.elements`.
 * @param {*}                motionItems The block's `supports.sgs.motionItems`.
 * @return {{part:string,from:string,base:Object}|null} The inherited layer.
 */
export function inheritedItem( motion, targets, elements, motionItems ) {
	const part = declaredItemPart( elements, motionItems );
	const from = movedEntranceTarget( motion, targets, elements );
	if ( part === null || from === null || hasBase( targets[ part ] ) ) {
		return null;
	}
	return { part, from, base: withoutDelays( targets[ from ].entrance.base ) };
}

/**
 * The container target whose entrance the child block's root takes in a delegating mode, or null when `apply` is off,
 * the container has no entrance, or a part mapped onto the child's root carries an entrance.
 *
 * @param {Object|undefined} motion     The stored motion attribute.
 * @param {Object|undefined} targets    The sanitised document's `elements`.
 * @param {Object|undefined} elements   The block's `supports.sgs.elements`.
 * @param {Object}           delegation `activeDelegation()`: `{ block, parts }`.
 * @return {string|null} The target key.
 */
export function delegatedMove( motion, targets, elements, delegation ) {
	const from = movedEntranceTarget( motion, targets, elements );
	if ( from === null ) {
		return null;
	}
	const kept = Object.entries( delegation?.parts || {} ).some(
		( [ part, to ] ) => to === 'root' && hasBase( targets[ part ] )
	);
	return kept ? null : from;
}
