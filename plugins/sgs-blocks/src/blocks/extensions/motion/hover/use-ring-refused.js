/**
 * Whether the Hover panel's target element has a shadow set, so the hover ring is not offered there (Spec 38A
 * FR-38A-42's ring clause). The decision is `emit-ring.js::ringRefused` over the block's own declarations and
 * attributes (and, in a delegating mode, the child block it prints); the hook returns a boolean, so the panel
 * re-renders only when the answer changes, not on every attribute edit.
 *
 * @package
 */

import { useSelect } from '@wordpress/data';
import { getBlockType } from '@wordpress/blocks';
import { activeDelegation } from '../delegate-parts';
import { ringDelegate, ringRefused } from '../canvas/emit-ring';

/**
 * The child block's elements and attribute defaults, as `ringDelegate` reads them.
 *
 * @param {string} name Block name.
 * @return {{elements:Object,attributes:Object}} The child.
 */
export function childOf( name ) {
	const type = getBlockType( name );
	const attributes = {};
	Object.entries( type?.attributes || {} ).forEach( ( [ key, def ] ) => {
		if ( def?.default !== undefined ) {
			attributes[ key ] = def.default;
		}
	} );
	return { elements: type?.supports?.sgs?.elements || {}, attributes };
}

/**
 * @param {string}      clientId  The block's client id.
 * @param {string}      blockName The block's name.
 * @param {Object|null} elements  The block's `supports.sgs.elements`.
 * @param {string}      target    The panel's target.
 * @return {boolean} True when the ring is refused for the target.
 */
export default function useRingRefused( clientId, blockName, elements, target ) {
	return useSelect(
		( select ) => {
			const attributes = select( 'core/block-editor' )?.getBlockAttributes?.( clientId );
			return ringRefused(
				elements,
				target,
				attributes,
				ringDelegate(
					activeDelegation( getBlockType( blockName )?.supports?.sgs, attributes ),
					childOf
				)
			);
		},
		[ clientId, blockName, elements, target ]
	);
}
