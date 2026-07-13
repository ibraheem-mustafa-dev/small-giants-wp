/**
 * SGS Adaptive Navigation — save.
 *
 * Emits the InnerBlocks marker so WordPress serialises any sgs/mega-menu
 * children into post_content. render.php receives them as $content and
 * appends them to the server-rendered menu bar. `save: () => null` would
 * drop the children on the round-trip (sgs-blocks/CLAUDE.md gotcha).
 *
 * @return {JSX.Element}
 */
import { InnerBlocks } from '@wordpress/block-editor';
export default function Save() {
	return <InnerBlocks.Content />;
}
