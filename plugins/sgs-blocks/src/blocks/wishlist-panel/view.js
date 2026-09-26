/**
 * SGS Wishlist Panel — frontend hydration entry point.
 *
 * `render.php` emits only a heading + a hidden, aria-busy loading skeleton
 * (the saved-item list cannot be server-rendered — see that file's own
 * docblock). The actual per-panel logic lives in `panel-controller.js`
 * (own-list flow via `normal-view.js`, or the read-only shared-list flow
 * via `shared-view.js`) — this file just finds every panel instance on the
 * page and starts the cart-page Save-for-later enhancer alongside them.
 *
 * @package
 */
import { initPanel } from './panel-controller';
import { initSaveForLater } from './save-for-later';

document.querySelectorAll( '[data-sgs-wishlist-panel]' ).forEach( initPanel );

// The cart page (theme/sgs-theme/templates/cart.html) carries this block
// alongside WooCommerce's own Cart block — start the row enhancer
// regardless of the panel's own empty/hidden state (a full basket with an
// empty wishlist still benefits from Save-for-later).
initSaveForLater();
