/**
 * SGS Site Header — save.
 *
 * Emits the InnerBlocks marker so WordPress serialises the row blocks into
 * post_content; render.php drives 100% of frontend output. `save: () => null`
 * would drop the rows on the round-trip (sgs-blocks/CLAUDE.md gotcha).
 *
 * @return {JSX.Element}
 */
import { InnerBlocks } from '@wordpress/block-editor';
export default function Save() {
	return <InnerBlocks.Content />;
}
