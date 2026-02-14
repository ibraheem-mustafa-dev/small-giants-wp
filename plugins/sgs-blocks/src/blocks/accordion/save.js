import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Dynamic block — render.php handles frontend output.
 * Save stores only the inner blocks content.
 */
export default function Save() {
	return <InnerBlocks.Content />;
}
