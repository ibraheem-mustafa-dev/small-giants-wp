import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Save — Floating layer.
 *
 * Persists the inner blocks to post_content so render.php receives them as `$content`. A layer with no inner blocks
 * serialises as an empty string, which is also what the old self-closing instances serialise as.
 *
 * @return {JSX.Element} InnerBlocks content placeholder.
 */
export default function save() {
	return <InnerBlocks.Content />;
}
