/**
 * SGS Social Icons — save.js
 *
 * Dynamic block: render.php wraps the children. Saving the InnerBlocks content keeps the sgs/icon children in
 * post_content (save() returning null would drop them on the next save).
 *
 * @return {JSX.Element} The children.
 */
import { InnerBlocks } from '@wordpress/block-editor';

export default function Save() {
	return <InnerBlocks.Content />;
}
