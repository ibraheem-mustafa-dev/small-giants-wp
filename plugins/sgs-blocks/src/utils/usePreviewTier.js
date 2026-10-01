/**
 * The device tier the editor canvas is previewing, from the same source the
 * inspector's global device toggle writes (`core/editor` getDeviceType).
 *
 * @package SGS\Blocks
 */

import { useSelect } from '@wordpress/data';

/**
 * @return {string} 'desktop' | 'tablet' | 'mobile'.
 */
export function usePreviewTier() {
	return useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		const device = ed && typeof ed.getDeviceType === 'function' ? ed.getDeviceType() : null;
		return { Tablet: 'tablet', Mobile: 'mobile' }[ device ] || 'desktop';
	}, [] );
}
