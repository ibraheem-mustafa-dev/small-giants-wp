import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Dynamic block — render.php handles frontend output.
 * Save returns <InnerBlocks.Content /> so WordPress persists the
 * sgs/multi-button + sgs/button InnerBlocks slot to post_content.
 */
export default function Save() {
	return <InnerBlocks.Content />;
}
