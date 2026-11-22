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

	/** Transient holding whether the shop sells a downloadable product ('1' or '0'). */
	const SELLS_DOWNLOADS_CACHE = 'sgs_account_shop_sells_downloads';

	/** Seconds the downloadable-product answer is kept when no product is saved in between. */
	const SELLS_DOWNLOADS_TTL = 86400;

	/**
	 * Wire WordPress hooks. Called once from sgs-blocks.php.
	 */
	public static function register(): void {
		\add_filter( 'woocommerce_get_query_vars', array( __CLASS__, 'add_query_var' ) );
		\add_action( 'init', array( __CLASS__, 'maybe_flush_rewrite_rules' ), 20 );
		\add_filter( 'woocommerce_account_menu_items', array( __CLASS__, 'filter_menu_items' ), 20 );
		// A product or variation saved, trashed, restored or deleted can change whether the shop sells a download.
		foreach ( array( 'save_post_product', 'save_post_product_variation', 'trashed_post', 'untrashed_post', 'deleted_post' ) as $hook ) {
			\add_action( $hook, array( __CLASS__, 'forget_sells_downloads' ) );
		}
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
		self::print_tab_heading( self::heading_text( 'ordersTabHeading', Account_Strings::text( 'orders', __( 'Orders', 'sgs-blocks' ) ) ) );
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
		self::print_tab_heading( self::heading_text( 'addressesTabHeading', Account_Strings::text( 'addresses', __( 'Addresses', 'sgs-blocks' ) ) ) );
	}

	/**
	 * Tab heading on the Account details endpoint.
	 *
	 * @param mixed $value The endpoint's query var value (unused).
	 */
	public static function render_account_details_heading( $value = '' ) {
		self::print_tab_heading( self::heading_text( 'accountDetailsTabHeading', Account_Strings::text( 'accountDetails', __( 'Account details', 'sgs-blocks' ) ) ) );
	}

	/**
	 * The heading text for a tab: the block's own heading setting when set, else the tab's menu label.
	 *
	 * @param string $attr  Heading attribute name (`ordersTabHeading`, ...).
	 * @param string $label The tab's menu label.
	 * @return string Plain text.
	 */
	public static function heading_text( string $attr, string $label ): string {
		$own = is_array( self::$active ) ? trim( (string) ( self::$active[ $attr ] ?? '' ) ) : '';
		return '' !== $own ? $own : $label;
	}

	/**
	 * Print the H2 when the active block has `tabHeadings` on; a non-empty `$aside` (the Wishlist tab's count) shares a
	 * row with it.
	 *
	 * @param string $label Menu label of the endpoint.
	 * @param string $aside Plain text printed beside the heading, '' for none.
	 */
	public static function print_tab_heading( string $label, string $aside = '' ): void {
		if ( ! is_array( self::$active ) || empty( self::$active['tabHeadings'] ) ) {
			return;
		}
		$heading = '<h2 class="sgs-account__heading sgs-account__tab-heading">' . \esc_html( $label ) . '</h2>';
		if ( '' === $aside ) {
			echo $heading; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
			return;
		}
		echo '<div class="sgs-account__tab-head">' . $heading . '<span class="sgs-account__tab-count">' . \esc_html( $aside ) . '</span></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
	}

	/**
	 * The count beside a tab heading from the block's wording: `{count}` is replaced; the singular wording is used for
	 * one when set. '' while no wording is set.
	 *
	 * @param int   $count Number of items.
	 * @param array $attrs Block attributes.
	 * @return string
	 */
	public static function count_text( int $count, array $attrs ): string {
		$many = trim( (string) ( $attrs['wishlistCountText'] ?? '' ) );
		if ( '' === $many ) {
			return '';
		}
		$one      = trim( (string) ( $attrs['wishlistCountOneText'] ?? '' ) );
		$template = 1 === $count && '' !== $one ? $one : $many;
		return str_replace( '{count}', (string) $count, $template );
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
			if ( ! empty( self::$active['hideUnofferedTabs'] ) ) {
				$items = self::drop_unoffered_tabs( $items );
			}
			$items = self::apply_menu_order( $items, self::$active['menuOrder'] ?? array() );
		}

		return $items;
	}

	/**
	 * Leave out the tabs a shop does not offer (the `hideUnofferedTabs` setting): Downloads when no product sells a
	 * download and the signed-in customer holds none. Only the menu item goes: the endpoint's own URL keeps
	 * WooCommerce's behaviour. Payment methods is not touched here: WooCommerce's `wc_get_account_menu_items()`
	 * already leaves it out unless an available payment gateway supports `add_payment_method` or `tokenization`.
	 *
	 * @param array $items Endpoint => label.
	 * @return array
	 */
	private static function drop_unoffered_tabs( array $items ): array {
		if ( isset( $items['downloads'] ) && ! self::shop_sells_downloads() && ! self::customer_has_downloads() ) {
			unset( $items['downloads'] );
		}
		return $items;
	}

	/**
	 * Whether any published or private product, or variation, is downloadable. One indexed lookup, kept in a transient
	 * until a product changes (`forget_sells_downloads`) or a day passes. True when the database is unavailable, so a
	 * failed lookup keeps the tab.
	 *
	 * @return bool
	 */
	public static function shop_sells_downloads(): bool {
		$cached = \get_transient( self::SELLS_DOWNLOADS_CACHE );
		if ( false !== $cached ) {
			return '1' === (string) $cached;
		}
		global $wpdb;
		if ( ! is_object( $wpdb ) ) {
			return true;
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- a cached existence check on core tables; WooCommerce has no query for a downloadable variation.
		$found = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT p.ID FROM {$wpdb->posts} p INNER JOIN {$wpdb->postmeta} m ON m.post_id = p.ID WHERE m.meta_key = %s AND m.meta_value = %s AND p.post_type IN ( 'product', 'product_variation' ) AND p.post_status IN ( 'publish', 'private' ) LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- core table names.
				'_downloadable',
				'yes'
			)
		);
		$sells = null !== $found && '' !== (string) $found;
		\set_transient( self::SELLS_DOWNLOADS_CACHE, $sells ? '1' : '0', self::SELLS_DOWNLOADS_TTL );
		return $sells;
	}

	/**
	 * Forget the stored downloadable-product answer. Hooked to every product save, trash, restore and delete; takes
	 * whatever argument the hook passes.
	 */
	public static function forget_sells_downloads(): void {
		\delete_transient( self::SELLS_DOWNLOADS_CACHE );
	}

	/**
	 * Whether the signed-in customer already holds a download (a purchase of a product since changed or removed), so
	 * the tab that reaches it stays.
	 *
	 * @return bool
	 */
	private static function customer_has_downloads(): bool {
		$user_id = (int) \get_current_user_id();
		if ( $user_id <= 0 || ! function_exists( 'wc_get_customer_available_downloads' ) ) {
			return false;
		}
		$downloads = \wc_get_customer_available_downloads( $user_id );
		return is_array( $downloads ) && array() !== $downloads;
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
		$saved = class_exists( Wishlist_Store::class ) ? count( Wishlist_Store::read_list( \get_current_user_id() ) ) : 0;
		self::print_tab_heading( self::heading_text( 'savedItemsTabHeading', Account_Strings::text( 'savedItems', __( 'Saved items', 'sgs-blocks' ) ) ), self::count_text( $saved, is_array( self::$active ) ? self::$active : array() ) );
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
		if ( is_array( self::$active ) && 'product-cards' === ( self::$active['wishlistLayout'] ?? '' ) ) {
			// The site's own product card for each saved product: a three-column grid (two on a phone).
			$attrs = array_merge(
				$attrs,
				array(
					'layout'    => 'product-cards',
					'columns'   => array(
						'desktop' => 3,
						'tablet'  => 3,
						'mobile'  => 2,
					),
					'showSort'  => false,
					'showCount' => false,
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
		return \sgs_account_empty_card_html( $heading, $text, $label, $url, $attrs );
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
