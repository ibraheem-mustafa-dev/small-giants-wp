import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Dynamic block — render.php handles frontend output.
 * Save stores only the inner blocks content so render.php receives
 * a non-empty $content string.
 */
export default function Save() {
	return <InnerBlocks.Content />;
}
