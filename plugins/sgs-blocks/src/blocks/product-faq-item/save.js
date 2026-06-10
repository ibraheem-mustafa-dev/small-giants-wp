import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Save — product-faq-item.
 *
 * Persists InnerBlocks content (the answer) to post_content so render.php
 * receives a non-empty $content string. Dynamic blocks with InnerBlocks MUST
 * return <InnerBlocks.Content /> here; returning null drops child blocks
 * from the serialised markup.
 *
 * @return {JSX.Element} InnerBlocks content placeholder.
 */
export default function save() {
	return <InnerBlocks.Content />;
}
