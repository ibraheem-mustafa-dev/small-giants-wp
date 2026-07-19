import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Dynamic block — render.php handles frontend output.
 * Save returns <InnerBlocks.Content /> so WordPress persists
 * the drawer content (child blocks) to post_content.
 */
export default function Save() {
	return <InnerBlocks.Content />;
}
