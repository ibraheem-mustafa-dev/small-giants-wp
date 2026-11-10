<?php
/**
 * SGS Account Endpoints — the `saved-items` My Account endpoint, hidden-item
 * filtering, and the request-scoped flag `sgs/account`'s render.php sets so
 * every hook in this file only acts while that block is actually rendering
 * (Spec 27 Part 3 FR-30-14).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-account-strings.php';

/** Registers the saved-items endpoint + menu filtering. */
final class Account_Endpoints {

	/**
	 * The `sgs/account` block's own attributes while its render.php is
	 * executing WooCommerce's shortcode output, else null. Read (never
	 * written) by every other hook in this file, and by Account_Dashboard.
	 * Set/cleared ONLY by src/blocks/account/render.php.
	 *
	 * @var array|null
	 */
	public static $active = null;

	/** Transient key guarding the self-healing rewrite flush against a loop. */
	const REWRITE_FLUSH_GUARD = 'sgs_account_rewrite_flushed';

	/**
	 * Wire WordPress hooks. Called once from sgs-blocks.php.
	 */
	public static function register(): void {
		\add_filter( 'woocommerce_get_query_vars', array( __CLASS__, 'add_query_var' ) );
		\add_action( 'init', array( __CLASS__, 'maybe_flush_rewrite_rules' ), 20 );
		\add_filter( 'woocommerce_account_menu_items', array( __CLASS__, 'filter_menu_items' ), 20 );
		\add_filter( 'woocommerce_endpoint_saved-items_title', array( __CLASS__, 'saved_items_title' ) );
		\add_action( 'woocommerce_account_saved-items_endpoint', array( __CLASS__, 'render_saved_items_endpoint' ) );
		\add_action( 'woocommerce_account_orders_endpoint', array( __CLASS__, 'render_orders_heading' ), 1 );
		\add_action( 'woocommerce_account_edit-address_endpoint', array( __CLASS__, 'render_addresses_heading' ), 1 );
		\add_action( 'woocommerce_account_edit-account_endpoint', array( __CLASS__, 'render_account_details_heading' ), 1 );
	}

	/**
	 * Tab heading on the Orders endpoint (WooCommerce prints none). Prints only while `sgs/account` renders with
	 * `tabHeadings` on.
	 *
	 * @param mixed $value The endpoint's query var value (unused).
	 */
	public static function render_orders_heading( $value = '' ) {
		self::print_tab_heading( Account_Strings::text( 'orders', __( 'Orders', 'sgs-blocks' ) ) );
	}

	/**
	 * Tab heading on the Addresses endpoint's list view; a single-address form (billing, shipping) keeps its own title.
	 *
	 * @param mixed $value The endpoint's query var value: '' for the list, 'billing' or 'shipping' for a form.
	 */
	public static function render_addresses_heading( $value = '' ) {
		if ( is_string( $value ) && '' !== $value ) {
			return;
		}
		self::print_tab_heading( Account_Strings::text( 'addresses', __( 'Addresses', 'sgs-blocks' ) ) );
	}

	/**
	 * Tab heading on the Account details endpoint.
	 *
	 * @param mixed $value The endpoint's query var value (unused).
	 */
	public static function render_account_details_heading( $value = '' ) {
		self::print_tab_heading( Account_Strings::text( 'accountDetails', __( 'Account details', 'sgs-blocks' ) ) );
	}

	/**
	 * Print the H2 when the active block has `tabHeadings` on.
	 *
	 * @param string $label Menu label of the endpoint.
	 */
	private static function print_tab_heading( string $label ): void {
		if ( ! is_array( self::$active ) || empty( self::$active['tabHeadings'] ) ) {
			return;
		}
		echo '<h2 class="sgs-account__heading sgs-account__tab-heading">' . \esc_html( $label ) . '</h2>';
	}

	/**
	 * Reorder the menu to the `menuOrder` list: listed endpoints first in that order, the rest after in their own
	 * order, Log out always last. An unknown or duplicate key is ignored.
	 *
	 * @param array $items Endpoint => label.
	 * @param mixed $order The `menuOrder` attribute.
	 * @return array
	 */
	private static function apply_menu_order( array $items, $order ): array {
		if ( ! is_array( $order ) || array() === $order ) {
			return $items;
		}
		$ordered = array();
		foreach ( $order as $endpoint ) {
			$endpoint = is_string( $endpoint ) ? \sanitize_key( $endpoint ) : '';
			if ( '' !== $endpoint && 'customer-logout' !== $endpoint && isset( $items[ $endpoint ] ) ) {
				$ordered[ $endpoint ] = $items[ $endpoint ];
			}
		}
		foreach ( $items as $endpoint => $label ) {
			if ( 'customer-logout' !== $endpoint && ! isset( $ordered[ $endpoint ] ) ) {
				$ordered[ $endpoint ] = $label;
			}
		}
		if ( isset( $items['customer-logout'] ) ) {
			$ordered['customer-logout'] = $items['customer-logout'];
		}
		return $ordered;
	}

	/**
	 * Register the `saved-items` query var so WooCommerce's `WC_Query`
	 * recognises it as a My Account endpoint (it registers every entry in
	 * this filter's return value as a rewrite endpoint on `init`).
	 *
	 * @param array $vars Existing query vars (endpoint => query var).
	 * @return array
	 */
	public static function add_query_var( $vars ) {
		$vars['saved-items'] = 'saved-items';
		return $vars;
	}

	/**
	 * Self-healing rewrite flush: WooCommerce derives the endpoint's rewrite
	 * rule from the query var above, but a rule set baked before this file
	 * existed (or a stale object cache) never contains it. Rather than a
	 * one-off activation-hook flush (which never fires for an existing
	 * install updated by a plain file overwrite — the same gap
	 * `Sgs_Starter_Library_Migration` exists for), check on every `init` and
	 * flush once, guarded by a short transient so a flood of requests before
	 * WordPress persists the new rule set cannot flush on every single one.
	 */
	public static function maybe_flush_rewrite_rules(): void {
		if ( \get_transient( self::REWRITE_FLUSH_GUARD ) ) {
			return;
		}
		$rules = \get_option( 'rewrite_rules' );
		if ( ! is_array( $rules ) ) {
			return;
		}
		foreach ( array_keys( $rules ) as $rule ) {
			if ( false !== strpos( $rule, 'saved-items' ) ) {
				return;
			}
		}
		\flush_rewrite_rules( false );
		\set_transient( self::REWRITE_FLUSH_GUARD, 1, 60 );
	}

	/**
	 * Insert "Saved items" right after "Orders", then apply the active
	 * `sgs/account` instance's hidden-items list (never dashboard/logout —
	 * `sgs_account_sanitize_hidden_endpoints()` already refuses those).
	 *
	 * @param array $items Endpoint => label.
	 * @return array
	 */
	public static function filter_menu_items( $items ) {
		if ( ! is_array( $items ) ) {
			return $items;
		}
		if ( ! isset( $items['saved-items'] ) ) {
			$with_saved = array();
			foreach ( $items as $endpoint => $label ) {
				$with_saved[ $endpoint ] = $label;
				if ( 'orders' === $endpoint ) {
					$with_saved['saved-items'] = Account_Strings::text( 'savedItems', __( 'Saved items', 'sgs-blocks' ) );
				}
			}
			// 'orders' absent (a heavily customised menu) — append at the end
			// rather than silently dropping the item.
			if ( ! isset( $with_saved['saved-items'] ) ) {
				$with_saved['saved-items'] = Account_Strings::text( 'savedItems', __( 'Saved items', 'sgs-blocks' ) );
			}
			$items = $with_saved;
		}

		if ( is_array( self::$active ) ) {
			require_once __DIR__ . '/helpers-account-defaults.php';
			$hidden = sgs_account_sanitize_hidden_endpoints( self::$active['hiddenEndpoints'] ?? array() );
			foreach ( $hidden as $endpoint ) {
				unset( $items[ $endpoint ] );
			}
			$items = self::apply_menu_order( $items, self::$active['menuOrder'] ?? array() );
		}

		return $items;
	}

	/**
	 * `woocommerce_endpoint_saved-items_title` — the page-title WooCommerce
	 * shows on the endpoint (breadcrumbs, `<title>`).
	 *
	 * @param string $title Default title.
	 * @return string
	 */
	public static function saved_items_title( $title ) {
		return Account_Strings::text( 'savedItems', __( 'Saved items', 'sgs-blocks' ) );
	}

	/**
	 * `woocommerce_account_saved-items_endpoint` — render the endpoint's
	 * content: the site's `sgs/wishlist-panel` block, with the attributes of
	 * the first instance found on the configured Saved items page, else a
	 * sensible default.
	 *
	 * @param mixed $value The query var's value (unused — WooCommerce passes
	 *                      it to every `_endpoint` action; no type hint, per
	 *                      the framework's WordPress-hook-callback rule).
	 */
	public static function render_saved_items_endpoint( $value ) {
		// The tab heading (when the block prints one) names the tab, so the panel
		// drops its own heading here.
		self::print_tab_heading( Account_Strings::text( 'savedItems', __( 'Saved items', 'sgs-blocks' ) ) );
		$empty = self::saved_items_empty_card();
		if ( '' !== $empty ) {
			echo $empty; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in sgs_account_empty_card_html().
			return;
		}
		$attrs            = self::resolve_wishlist_panel_attrs();
		$attrs['heading'] = '';
		if ( is_array( self::$active ) && 'cards' === ( self::$active['wishlistLayout'] ?? '' ) ) {
			// Frame cards: a photo grid with a heart on each, no sort, dates, drop lines or stock lines.
			$attrs = array_merge(
				$attrs,
				array(
					'layout'        => 'cards',
					'columns'       => array(
						'desktop' => 3,
						'tablet'  => 3,
						'mobile'  => 2,
					),
					'showSort'      => false,
					'showDateSaved' => false,
					'showPriceDrop' => false,
					'showStock'     => false,
					'showCount'     => false,
				)
			);
		}
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_block() output is already escaped by the block's own render.php.
		echo \render_block(
			array(
				'blockName'    => 'sgs/wishlist-panel',
				'attrs'        => $attrs,
				'innerBlocks'  => array(),
				'innerHTML'    => '',
				'innerContent' => array(),
			)
		);
	}

	/**
	 * The empty-state card for a customer whose saved list holds nothing, from the block's `wishlistEmpty*` settings;
	 * '' while all three texts are unset or the list has items (the wishlist panel then draws the tab).
	 *
	 * @return string Escaped HTML.
	 */
	private static function saved_items_empty_card(): string {
		$attrs   = is_array( self::$active ) ? self::$active : array();
		$heading = trim( (string) ( $attrs['wishlistEmptyHeading'] ?? '' ) );
		$text    = trim( (string) ( $attrs['wishlistEmptyText'] ?? '' ) );
		$label   = trim( (string) ( $attrs['wishlistEmptyButtonLabel'] ?? '' ) );
		if ( '' === $heading . $text . $label || ! function_exists( 'sgs_account_empty_card_html' ) || ! class_exists( Wishlist_Store::class ) ) {
			return '';
		}
		if ( array() !== Wishlist_Store::read_list( \get_current_user_id() ) ) {
			return '';
		}
		$url = trim( (string) ( $attrs['wishlistEmptyButtonUrl'] ?? '' ) );
		if ( '' === $url && function_exists( 'wc_get_page_permalink' ) ) {
			$url = (string) \wc_get_page_permalink( 'shop' );
		}
		return \sgs_account_empty_card_html( $heading, $text, $label, $url );
	}

	/**
	 * Read the configured Saved items page and return the attributes of its
	 * first `sgs/wishlist-panel` block (searched recursively through
	 * innerBlocks), else the documented fallback.
	 *
	 * @return array Block attributes for `sgs/wishlist-panel`.
	 */
	private static function resolve_wishlist_panel_attrs(): array {
		$fallback = array(
			'layout'        => 'grid',
			'showWhenEmpty' => true,
		);

		$page_id = absint( \get_option( 'woocommerce_saved_items_page_id' ) );
		if ( $page_id <= 0 ) {
			return $fallback;
		}
		$post = \get_post( $page_id );
		if ( ! $post || ! function_exists( 'parse_blocks' ) ) {
			return $fallback;
		}
		$found = self::find_wishlist_panel_attrs( \parse_blocks( $post->post_content ) );
		return null !== $found ? $found : $fallback;
	}

	/**
	 * Recursively walk a parsed block tree looking for the first
	 * `sgs/wishlist-panel` block.
	 *
	 * @param array $blocks Parsed blocks (from `parse_blocks()`).
	 * @return array|null Attributes array, or null if not found.
	 */
	private static function find_wishlist_panel_attrs( array $blocks ) {
		foreach ( $blocks as $block ) {
			if ( isset( $block['blockName'] ) && 'sgs/wishlist-panel' === $block['blockName'] ) {
				return is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array();
			}
			if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				$found = self::find_wishlist_panel_attrs( $block['innerBlocks'] );
				if ( null !== $found ) {
					return $found;
				}
			}
		}
		return null;
	}
}
