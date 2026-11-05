import { registerBlockType } from '@wordpress/blocks';
// eslint-disable-next-line import/no-unresolved -- WooCommerce provides this module as the wc.blocksCheckout global (see webpack.config.js).
import { registerCheckoutBlock } from '@woocommerce/blocks-checkout';
import metadata from './block.json';
import Edit from './edit';
import Save from './save';
import './style.css';
import './editor.css';

// WooCommerce's Cart block accepts only the inner blocks registered for its areas. The registration below names the
// items column as the bar's area, so the editor offers the bar there; the block itself keeps no `parent`, so it stays
// available everywhere else. On the front end the server markup is kept as it is and view.js keeps the card current,
// so no front-end registration is needed.
registerCheckoutBlock( {
	metadata: { ...metadata, parent: [ 'woocommerce/cart-items-block' ] },
	component: () => null,
} );

registerBlockType( metadata.name, {
	edit: Edit,
	save: Save,
} );
