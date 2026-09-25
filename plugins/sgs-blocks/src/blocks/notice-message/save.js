import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Dynamic block (render.php drives all frontend output). Save only emits the
 * InnerBlocks content so WordPress serialises the children into post_content
 * — mirrors sgs/notice-banner's own save.js (FR-22-6 pattern).
 */
export default function Save() {
	return <InnerBlocks.Content />;
}
