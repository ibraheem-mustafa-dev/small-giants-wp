/**
 * sgs/measured-diagram — save.
 *
 * Dynamic block: render.php draws the figure. The children must still be
 * serialised, so save returns the inner blocks (a null save would drop them
 * from post_content).
 *
 * @package SGS\Blocks
 */
import { InnerBlocks } from '@wordpress/block-editor';

export default function Save() {
	return <InnerBlocks.Content />;
}
