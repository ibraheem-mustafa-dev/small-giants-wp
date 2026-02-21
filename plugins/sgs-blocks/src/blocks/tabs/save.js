import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Dynamic block — render.php handles frontend output.
 * Save stores only the inner blocks content so render.php
 * can access the sgs/tab child blocks via $block->inner_blocks.
 */
export default function Save() {
	return <InnerBlocks.Content />;
}
