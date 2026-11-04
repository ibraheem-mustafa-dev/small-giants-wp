import { registerBlockType } from '@wordpress/blocks';
// eslint-disable-next-line import/no-unresolved -- WooCommerce provides this module as the wc.blocksCheckout global (see webpack.config.js).
import { registerCheckoutBlock } from '@woocommerce/blocks-checkout';
import metadata from './block.json';
import Edit from './edit';
import './style.css';

// Registering with WooCommerce lets the editor offer the block inside the Cart
// and Checkout areas it names as parents. On the front end the server markup is
// kept as it is, so there is no front-end script.
registerCheckoutBlock( { metadata, component: () => null } );

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null,
} );
