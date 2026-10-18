/**
 * Whether the Hover panel's target may carry its perspective on its parent (Spec 38A FR-38A-41): the root of a block
 * placed directly inside another SGS block, the twin of `Sgs_Motion_Renderer::parent_owned()`. The hook returns a
 * boolean, so the panel re-renders only when the answer changes.
 *
 * @package
 */

import { useSelect } from '@wordpress/data';
import { ROOT_TARGET } from '../../../../components/motion/TargetPicker';

/**
 * @param {string} clientId The block's client id.
 * @param {string} target   The panel's target.
 * @return {boolean} True when the target's perspective may sit on its parent.
 */
export default function useParentOwned( clientId, target ) {
	return useSelect(
		( select ) => {
			if ( target !== ROOT_TARGET ) {
				return false;
			}
			const store = select( 'core/block-editor' );
			const parentId = store?.getBlockRootClientId?.( clientId );
			return Boolean( parentId ) && String( store.getBlockName( parentId ) ).startsWith( 'sgs/' );
		},
		[ clientId, target ]
	);
}
