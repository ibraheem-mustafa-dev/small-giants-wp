import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Card Grid save: the grid renders on the server; only its inner blocks are saved (the one template
 * sgs/product-card a products-mode grid renders every product with).
 */
export default function Save() {
	return <InnerBlocks.Content />;
}
