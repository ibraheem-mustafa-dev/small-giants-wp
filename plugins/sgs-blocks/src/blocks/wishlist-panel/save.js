import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Dynamic block: the markup comes from render.php. Only the inner blocks are saved: the one template `sgs/product-card`
 * the cards layout draws every saved product with.
 *
 * @return {JSX.Element} The inner blocks' saved content.
 */
export default function Save() {
	return <InnerBlocks.Content />;
}
