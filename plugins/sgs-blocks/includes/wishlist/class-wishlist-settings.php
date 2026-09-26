<?php
/**
 * SGS Wishlist — site-wide feature switches (Spec 30 P5 FR-30-14/15).
 *
 * Registers `sgs_wishlist_features` (price alerts / stock alerts / sharing,
 * all off by default) via `register_setting()` with a strict object schema
 * so `useEntityProp( 'root', 'site', 'sgs_wishlist_features' )` can edit it
 * from the block-editor inspector. Also resolves the WooCommerce "Saved
 * items" page (`woocommerce_saved_items_page_id`) and builds its shared-list
 * URL.
 *
 * @package SGS\Blocks
 * @since   1.29.0 (Wave 3C account-area build, FR-30-14/15)
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** The wishlist site-wide feature switches option. */
final class Wishlist_Settings {

	/** The `sgs_wishlist_features` option key. */
	const OPTION_KEY = 'sgs_wishlist_features';

	/** WooCommerce's own page-id option for the Saved items page. */
	const SAVED_ITEMS_PAGE_OPTION = 'woocommerce_saved_items_page_id';

	/**
	 * Wire the registration hook. `register_setting()` must run on BOTH
	 * `init` (so `get_option()`/`update_option()` see the default and
	 * sanitiser on every request) AND `rest_api_init` (so the Settings
	 * REST controller — which the block-editor inspector calls through
	 * `useEntityProp` — exposes the option's `show_in_rest` schema).
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'init', array( __CLASS__, 'register_setting' ) );
		\add_action( 'rest_api_init', array( __CLASS__, 'register_setting' ) );
	}

	/**
	 * Register `sgs_wishlist_features` with a strict object schema.
	 *
	 * @return void
	 */
	public static function register_setting(): void {
		\register_setting(
			'sgs_wishlist',
			self::OPTION_KEY,
			array(
				'type'              => 'object',
				'show_in_rest'      => array(
					'schema' => array(
						'type'                 => 'object',
						'properties'           => array(
							'priceAlerts' => array( 'type' => 'boolean' ),
							'stockAlerts' => array( 'type' => 'boolean' ),
							'sharing'     => array( 'type' => 'boolean' ),
						),
						'additionalProperties' => false,
					),
				),
				'default'           => array(
					'priceAlerts' => false,
					'stockAlerts' => false,
					'sharing'     => false,
				),
				'sanitize_callback' => array( __CLASS__, 'sanitise' ),
			)
		);
	}

	/**
	 * Coerce the three known keys to booleans and drop anything else.
	 *
	 * @param mixed $value Raw submitted value.
	 * @return array{priceAlerts:bool,stockAlerts:bool,sharing:bool}
	 */
	public static function sanitise( $value ): array {
		$value = \is_array( $value ) ? $value : array();
		return array(
			'priceAlerts' => ! empty( $value['priceAlerts'] ),
			'stockAlerts' => ! empty( $value['stockAlerts'] ),
			'sharing'     => ! empty( $value['sharing'] ),
		);
	}

	/**
	 * The current site-wide feature switches.
	 *
	 * @return array{priceAlerts:bool,stockAlerts:bool,sharing:bool}
	 */
	public static function features(): array {
		return self::sanitise( \get_option( self::OPTION_KEY, array() ) );
	}

	/**
	 * The published "Saved items" page's permalink, or '' when the page
	 * option is unset or the page is not published.
	 *
	 * @return string
	 */
	public static function saved_items_page_url(): string {
		$page_id = \absint( \get_option( self::SAVED_ITEMS_PAGE_OPTION, 0 ) );
		if ( $page_id <= 0 || 'publish' !== \get_post_status( $page_id ) ) {
			return '';
		}
		$permalink = \get_permalink( $page_id );
		return \is_string( $permalink ) ? $permalink : '';
	}

	/**
	 * Build a shared-list URL for a share token: the Saved items page
	 * permalink plus `?sgs-list={token}`.
	 *
	 * @param string $token 32-hex-char share token.
	 * @return string '' when there is no Saved items page.
	 */
	public static function shared_list_url( string $token ): string {
		$base = self::saved_items_page_url();
		if ( '' === $base ) {
			return '';
		}
		return \add_query_arg( 'sgs-list', $token, $base );
	}
}
