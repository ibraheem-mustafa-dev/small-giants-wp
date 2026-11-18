<?php
/**
 * Sgs/wishlist-panel — the cards layout's data (the site's own product cards).
 *
 * The panel holds one `sgs/product-card` as its template (the design every saved product's card renders with). The
 * template is never rendered on the page (`Wishlist_Cards_Rest::metadata_settings` registers the panel with
 * `skip_inner_blocks`); this prints its settings, signed, onto the root so the view script can ask
 * `POST /sgs/v1/wishlist-cards` for each saved product's card, and loads the card's own stylesheet and view module,
 * which WordPress would otherwise load only for a card it renders.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_wishlist_panel_cards_data' ) ) {
	/**
	 * The data-* attributes of the cards layout, and the card block's assets.
	 *
	 * @param \WP_Block|null $block The panel's WP_Block (its parsed inner blocks hold the template card).
	 * @return array<string,string> Attribute name (without `data-`) => value.
	 */
	function sgs_wishlist_panel_cards_data( $block ): array {
		$signed   = \SGS\Blocks\Wishlist_Cards_Rest::sign_template( \SGS\Blocks\Card_Grid_Template::template_attrs( $block ) );
		$registry = \WP_Block_Type_Registry::get_instance();
		$type     = $registry->get_registered( 'sgs/product-card' );
		if ( $type ) {
			foreach ( (array) $type->style_handles as $handle ) {
				wp_enqueue_style( $handle );
			}
			foreach ( (array) $type->view_script_module_ids as $module_id ) {
				wp_enqueue_script_module( $module_id );
			}
		}
		wp_enqueue_style( 'sgs-button-style' );
		return array(
			'cards-url'     => rest_url( \SGS\Blocks\Wishlist_Cards_Rest::REST_NAMESPACE . '/' . \SGS\Blocks\Wishlist_Cards_Rest::REST_ROUTE ),
			'card-template' => $signed['template'],
			'card-sig'      => $signed['sig'],
			'cards-chunk'   => (string) \SGS\Blocks\Wishlist_Cards_Rest::MAX_IDS,
		);
	}
}
