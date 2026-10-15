/**
 * Whether the Hover panel's target element has a shadow set, so the hover ring is not offered there (Spec 38A
 * FR-38A-42's ring clause). The decision is `emit-ring.js::ringRefused` over the block's own attributes; the hook
 * returns a boolean, so the panel re-renders only when the answer changes, not on every attribute edit.
 *
 * @package
 */

import { useSelect } from '@wordpress/data';
import { ringRefused } from '../canvas/emit-ring';

/**
 * @param {string}      clientId The block's client id.
 * @param {Object|null} elements The block's `supports.sgs.elements`.
 * @param {string}      target   The panel's target.
 * @return {boolean} True when the ring is refused for the target.
 */
export default function useRingRefused( clientId, elements, target ) {
	return useSelect(
		( select ) =>
			ringRefused(
				elements,
				target,
				select( 'core/block-editor' )?.getBlockAttributes?.( clientId )
			),
		[ clientId, elements, target ]
	);
}
