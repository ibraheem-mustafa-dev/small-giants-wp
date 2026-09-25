/**
 * SGS wishlist store (`sgs/wishlist`) — thin re-export.
 *
 * The heart button's store used to live entirely in this file. It moved to
 * `src/shared/wishlist-store/index.js` (Wave 3C U-12 §E) so
 * `sgs/wishlist-link`, `sgs/wishlist-panel` and the `sgs/cart` flyout's
 * Save-for-later button can share the same guest/logged-in state instead of
 * each re-deriving it. The Interactivity namespace (`sgs/wishlist`) and the
 * server-rendered markup this listens to
 * (`includes/product-card-live-fill.php::sgs_product_card_wishlist_markup`)
 * are unchanged.
 *
 * `product-card/view.js` now imports the shared module directly; this file
 * is kept only so any OTHER existing `import './wishlist'` (or an import of
 * this file by path) keeps resolving to a working module.
 */
export * from '../../shared/wishlist-store';
