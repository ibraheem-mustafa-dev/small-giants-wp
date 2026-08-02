import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Dynamic block — render.php drives 100% of frontend output. This save only
 * emits the InnerBlocks marker so WordPress keeps the children in
 * post_content (a bare `save: () => null` would drop InnerBlocks on save).
 */
export default function save() {
	return <InnerBlocks.Content />;
}
