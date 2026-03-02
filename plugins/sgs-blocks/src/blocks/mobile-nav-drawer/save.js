/**
 * SGS Mobile Nav Drawer — save component.
 *
 * Returns InnerBlocks.Content so inner blocks (e.g. core/navigation) are serialised.
 *
 * @since 1.0.0
 * @package SGS\Blocks
 */

import { InnerBlocks } from '@wordpress/block-editor';

export default function save() {
	return <InnerBlocks.Content />;
}
