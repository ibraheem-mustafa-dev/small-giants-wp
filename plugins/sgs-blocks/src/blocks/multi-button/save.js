import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Multi-Button block — save.
 *
 * Emits <InnerBlocks.Content /> so WordPress serialises the sgs/button
 * children into post_content. render.php receives them as $content and
 * wraps them in the responsive flex container.
 *
 * IMPORTANT: returning null here would cause WordPress to DROP InnerBlocks
 * from post_content on re-save, leaving render.php with an empty $content.
 * The null shape is preserved in deprecated.js (v2) for existing posts.
 *
 * @return {JSX.Element}
 */
export default function Save() {
	return <InnerBlocks.Content />;
}
