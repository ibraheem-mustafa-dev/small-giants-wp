/**
 * sgs/account transforms.
 *
 * `from` a `core/shortcode` block whose text contains `[woocommerce_my_account`
 * (the WooCommerce shortcode tag WordPress writes into the My Account page on
 * install, `woocommerce_create_pages()`) — lets an existing site convert its
 * account page to `sgs/account` with one editor click, instead of hand-editing
 * `post_content`.
 */
import { createBlock } from '@wordpress/blocks';

const transforms = {
	from: [
		{
			type: 'block',
			blocks: [ 'core/shortcode' ],
			isMatch: ( attributes ) =>
				typeof attributes.text === 'string' &&
				attributes.text.includes( '[woocommerce_my_account' ),
			transform: () => createBlock( 'sgs/account', {} ),
		},
	],
};

export default transforms;
