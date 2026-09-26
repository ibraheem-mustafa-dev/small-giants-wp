<?php
/**
 * SGS Account Pages — makes `woocommerce_create_pages()` create the My
 * Account page with `sgs/account` instead of the bare shortcode, creates the
 * Saved items page alongside it, and adds "Saved items page" to WooCommerce's
 * own Settings > Advanced > Page setup screen (Spec 30 FR-30-14 §4a/§4b).
 *
 * Verified against the installed WooCommerce 11.1 source on sandybrown
 * (2026-09-26): `WC_Install::create_pages()` builds its `$pages` array with
 * keys `shop`/`cart`/`checkout`/`myaccount`/`refund_returns`, then for each
 * key calls `wc_create_page( $name, 'woocommerce_' . $key . '_page_id',
 * $title, $content, … )` — so a new `saved_items` key creates the option
 * `woocommerce_saved_items_page_id`, exactly the name this plan's contract
 * and `Account_Endpoints::resolve_wishlist_panel_attrs()` already expect.
 * The Page setup fields on Settings > Advanced use `type =>
 * 'single_select_page_with_search'` (confirmed in
 * `includes/admin/settings/class-wc-settings-advanced.php`), not the plain
 * `single_select_page` — this file matches that type exactly.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Registers the `woocommerce_create_pages` + Page setup filters. */
final class Account_Pages {

	/**
	 * Wire WordPress hooks. Called once from sgs-blocks.php.
	 */
	public static function register(): void {
		\add_filter( 'woocommerce_create_pages', array( __CLASS__, 'add_pages' ) );
		\add_filter( 'woocommerce_settings_pages', array( __CLASS__, 'add_page_setting' ) );
	}

	/**
	 * Set the My Account page's content to `sgs/account`, and add a Saved
	 * items page (created the same way WooCommerce creates Cart/Checkout).
	 *
	 * @param array $pages The pages WooCommerce is about to create.
	 * @return array
	 */
	public static function add_pages( $pages ) {
		if ( ! is_array( $pages ) ) {
			return $pages;
		}
		if ( isset( $pages['myaccount'] ) ) {
			$pages['myaccount']['content'] = '<!-- wp:sgs/account /-->';
		}
		if ( ! isset( $pages['saved_items'] ) ) {
			$pages['saved_items'] = array(
				'name'    => _x( 'saved-items', 'Page slug', 'sgs-blocks' ),
				'title'   => _x( 'Saved items', 'Page title', 'sgs-blocks' ),
				'content' => '<!-- wp:sgs/wishlist-panel {"layout":"grid","showWhenEmpty":true} /-->',
			);
		}
		return $pages;
	}

	/**
	 * Add a "Saved items page" field to WooCommerce's own Settings >
	 * Advanced > Page setup, inserted right after the Checkout page field.
	 *
	 * @param array $settings WooCommerce Advanced settings fields.
	 * @return array
	 */
	public static function add_page_setting( $settings ) {
		if ( ! is_array( $settings ) ) {
			return $settings;
		}
		$field = array(
			'title'    => __( 'Saved items page', 'sgs-blocks' ),
			'desc'     => __( 'Page where shoppers view everything they have saved for later', 'sgs-blocks' ),
			'id'       => 'woocommerce_saved_items_page_id',
			'type'     => 'single_select_page_with_search',
			'default'  => '',
			'class'    => 'wc-page-search',
			'css'      => 'min-width:300px;',
			'desc_tip' => true,
			'autoload' => false,
		);

		$with_field = array();
		$inserted   = false;
		foreach ( $settings as $setting ) {
			$with_field[] = $setting;
			if ( is_array( $setting ) && ( 'woocommerce_checkout_page_id' === ( $setting['id'] ?? '' ) ) ) {
				$with_field[] = $field;
				$inserted     = true;
			}
		}
		if ( ! $inserted ) {
			// The Checkout field wasn't found (a plugin removed/reordered
			// it) — append at the end rather than silently dropping the
			// setting entirely.
			$with_field[] = $field;
		}
		return $with_field;
	}
}
