import { registerBlockType } from '@wordpress/blocks';
// eslint-disable-next-line import/no-unresolved -- WooCommerce provides this module as the wc.blocksCheckout global (see webpack.config.js).
import { registerCheckoutBlock } from '@woocommerce/blocks-checkout';
import metadata from './block.json';
import Edit from './edit';
import './style.css';

// Registering with WooCommerce lets the editor offer the block inside the Cart and
// Checkout areas it names as parents. The front-end component is registered by
// src/commerce-blocks/frontend.js.
registerCheckoutBlock( { metadata, component: () => null } );

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null,
} );
