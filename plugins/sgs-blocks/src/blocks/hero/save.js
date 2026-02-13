import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Dynamic block — render.php handles frontend output.
 */
export default function Save() {
	return <InnerBlocks.Content />;
}
