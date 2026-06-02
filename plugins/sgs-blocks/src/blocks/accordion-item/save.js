import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Save — accordion-item.
 *
 * Persists InnerBlocks content to post_content so render.php receives a
 * non-empty $content string. Dynamic blocks with InnerBlocks MUST return
 * <InnerBlocks.Content /> here; returning null drops child blocks from the
 * serialised markup and render.php gets empty $content on every re-save.
 *
 * @return {JSX.Element} InnerBlocks content placeholder.
 */
export default function save() {
	return <InnerBlocks.Content />;
}
