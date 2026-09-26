<?php
/**
 * SGS Account Endpoints — the `saved-items` My Account endpoint, hidden-item
 * filtering, and the request-scoped flag `sgs/account`'s render.php sets so
 * every hook in this file only acts while that block is actually rendering
 * (Spec 30 FR-30-14).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

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
					$with_saved['saved-items'] = __( 'Saved items', 'sgs-blocks' );
				}
			}
			// 'orders' absent (a heavily customised menu) — append at the end
			// rather than silently dropping the item.
			if ( ! isset( $with_saved['saved-items'] ) ) {
				$with_saved['saved-items'] = __( 'Saved items', 'sgs-blocks' );
			}
			$items = $with_saved;
		}

		if ( is_array( self::$active ) ) {
			require_once __DIR__ . '/helpers-account-defaults.php';
			$hidden = sgs_account_sanitize_hidden_endpoints( self::$active['hiddenEndpoints'] ?? array() );
			foreach ( $hidden as $endpoint ) {
				unset( $items[ $endpoint ] );
			}
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
		return __( 'Saved items', 'sgs-blocks' );
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
		$attrs = self::resolve_wishlist_panel_attrs();
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
