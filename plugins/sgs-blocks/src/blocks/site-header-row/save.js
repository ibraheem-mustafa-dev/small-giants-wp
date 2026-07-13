/**
 * SGS Header Row — save.
 *
 * Emits the InnerBlocks marker so WordPress serialises the row's child blocks
 * into post_content. render.php receives them as $content and drives 100% of
 * frontend output. `save: () => null` would drop the children on the round-trip
 * (sgs-blocks/CLAUDE.md gotcha).
 *
 * @return {JSX.Element}
 */
import { InnerBlocks } from '@wordpress/block-editor';
export default function Save() {
	return <InnerBlocks.Content />;
}
