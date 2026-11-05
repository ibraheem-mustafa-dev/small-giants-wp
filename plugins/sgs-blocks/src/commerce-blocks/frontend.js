/**
 * Cart and Checkout inner blocks: front-end registration (Spec 27, FR-30-21).
 *
 * `sgs/gift-order` is registered with WooCommerce's `registerCheckoutBlock`, which
 * swaps the server markup (`data-block-name="sgs/gift-order"`) for the React
 * component when the Cart or Checkout block mounts. `sgs/commerce-note` is plain
 * server markup and needs no script.
 *
 * Plain classic script: `wc.blocksCheckout` is a global, not a module.
 *
 * @package
 */
// eslint-disable-next-line import/no-unresolved -- WooCommerce provides this module as the wc.blocksCheckout global (see webpack.config.js).
import { registerCheckoutBlock } from '@woocommerce/blocks-checkout';
import giftMetadata from '../blocks/gift-order/block.json';
import GiftOrder from './gift/component';
import { GIFT_ORDER_PARENTS } from './gift/parents';
import { flagStoreApiRequests } from './api';

flagStoreApiRequests();
registerCheckoutBlock( {
	metadata: { ...giftMetadata, parent: GIFT_ORDER_PARENTS },
	component: GiftOrder,
} );
