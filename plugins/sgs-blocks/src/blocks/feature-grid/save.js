/**
 * Feature Grid block — save.
 *
 * Emits the InnerBlocks marker so WordPress serialises child block HTML
 * into post_content on save. render.php receives it as $content and drives
 * 100% of frontend output. Without this, WP drops InnerBlocks children on
 * the save round-trip and $content arrives empty.
 *
 * @return {JSX.Element}
 */
import { InnerBlocks } from '@wordpress/block-editor';
export default function Save() {
	return <InnerBlocks.Content />;
}
