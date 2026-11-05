import { registerBlockType } from '@wordpress/blocks';
// eslint-disable-next-line import/no-unresolved -- WooCommerce provides this module as the wc.blocksCheckout global (see webpack.config.js).
import { registerCheckoutBlock } from '@woocommerce/blocks-checkout';
import metadata from './block.json';
import Edit from './edit';
import { GIFT_ORDER_PARENTS } from '../../commerce-blocks/gift/parents';
import './style.css';
import './editor.css';

// Registering with WooCommerce lets the editor offer the block inside the
// Cart items and Checkout fields areas; the front end draws it from
// src/commerce-blocks/frontend.js.
registerCheckoutBlock( {
	metadata: { ...metadata, parent: GIFT_ORDER_PARENTS },
	component: () => null,
} );

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null,
} );
