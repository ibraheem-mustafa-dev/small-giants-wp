import { InnerBlocks } from '@wordpress/block-editor';

/**
 * FR-22-6 migration: the notice-banner's text content slot is now an InnerBlocks
 * child (sgs/text). Save emits <InnerBlocks.Content /> so WordPress serialises
 * the child block into post_content. render.php still drives all frontend output.
 *
 * Previous null-save shape is NOT preserved (deprecations deleted at D271), so existing posts
 * recover cleanly via the migrate() function there.
 */
export default function Save() {
	return <InnerBlocks.Content />;
}
