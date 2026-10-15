/**
 * "Apply entrance to children" on the container itself (Spec 38A §8): with the stagger helper's `apply` on, the
 * container's own entrance moves onto its children, so the container no longer plays it and its movement never adds
 * to each child's. The twin of `includes/motion/class-sgs-motion-loop-inherit.php::moved_target`.
 *
 * @package
 */

import { motionParts } from './resolve-target';

const hasBase = ( element ) => {
	const base = element?.entrance?.base;
	return Boolean( base ) && typeof base === 'object' && ! Array.isArray( base );
};

/**
 * The target whose entrance the stagger moves onto the children: `root` when it has an entrance, else the first
 * wrapper part that has one; null when `apply` is off or the container has no entrance.
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
	if ( hasBase( targets.root ) ) {
		return 'root';
	}
	const wrapper = Object.entries( motionParts( elements ) ).find(
		( [ part, isWrapper ] ) => isWrapper && hasBase( targets[ part ] )
	);
	return wrapper ? wrapper[ 0 ] : null;
}
