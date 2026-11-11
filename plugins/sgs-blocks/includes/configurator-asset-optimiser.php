<?php
/**
 * Configurator asset optimiser — conditional WooCommerce-frontend dequeue.
 *
 * On a page that contains a BOUND (WooCommerce) `sgs/product-card` configurator,
 * the WooCommerce jQuery frontend stack is redundant:
 *
 *   - The configurator's add-to-cart goes through the SGS REST proxy
 *     (`/sgs/v1/cart/add-item`) via vanilla `fetch` in product-card/view.js.
 *   - The cart badge (`sgs/cart`) reads the Store API (`/wc/store/v1/cart`),
 *     also vanilla fetch. `wc-cart-fragments` is already dequeued
 *     (see wc-cart-fragments.php).
 *
 * Neither needs `jquery`, `woocommerce.min`, `jquery-blockui`, or the legacy
 * `wc-add-to-cart`. Removing them is the only way to meet the FR-27-H1 ≤150 KB
 * page-JS budget (the configurator itself is ~20 KB; the overage is
 * WooCommerce-core jQuery). Order attribution is kept everywhere.
 *
 * On a page that is not a WooCommerce surface at all, the same function also drops
 * the WooCommerce stack and stylesheets (see `sgs_page_needs_wc_frontend()`).
 *
 * Safety:
 *   1. Fires ONLY when a bound configurator card is detected in post content
 *      (never on arbitrary WooCommerce pages — mini-cart widgets / WC blocks on
 *      other pages keep their scripts).
 *   2. jQuery itself is dequeued ONLY when no *other* enqueued script still
 *      declares a jQuery dependency (defensive — errs toward keeping jQuery).
 *   3. Every step is filterable so a site can opt out without a redeploy.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Flatten a parsed-block tree into a single list (depth-first).
 *
 * @param array $blocks Result of parse_blocks().
 * @return array Flat list of block arrays.
 */
function sgs_flatten_blocks_for_optimiser( array $blocks ): array {
	$out = array();
	foreach ( $blocks as $block ) {
		$out[] = $block;
		if ( ! empty( $block['innerBlocks'] ) ) {
			$out = array_merge( $out, sgs_flatten_blocks_for_optimiser( $block['innerBlocks'] ) );
		}
	}
	return $out;
}

/**
 * Whether the current singular view contains a bound (wc-product) configurator card.
 *
 * Uses the queried post's content. FSE template-part contexts without a post
 * return false (we never want to strip jQuery off a page we cannot inspect).
 *
 * @return bool
 */
function sgs_page_has_bound_configurator(): bool {
	$queried = get_queried_object();
	$post    = $queried instanceof \WP_Post ? $queried : null;

	if ( ! $post || ! has_block( 'sgs/product-card', $post ) ) {
		return false;
	}

	foreach ( sgs_flatten_blocks_for_optimiser( parse_blocks( $post->post_content ) ) as $block ) {
		if ( 'sgs/product-card' === ( $block['blockName'] ?? '' )
			&& 'wc-product' === ( $block['attrs']['sourceMode'] ?? '' ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Whether any *other* enqueued script still depends on jQuery after the given
 * handles are removed. Defensive: anything we are unsure about keeps jQuery.
 *
 * @param array $removed Handles already being dequeued this request.
 * @return bool True if jQuery must stay.
 */
function sgs_jquery_still_needed( array $removed ): bool {
	$scripts = wp_scripts();
	$skip    = array_merge( $removed, array( 'jquery', 'jquery-core', 'jquery-migrate' ) );

	foreach ( (array) $scripts->queue as $handle ) {
		if ( in_array( $handle, $skip, true ) ) {
			continue;
		}
		$registered = $scripts->registered[ $handle ] ?? null;
		if ( $registered && ! empty( $registered->deps )
			&& ( in_array( 'jquery', $registered->deps, true )
				|| in_array( 'jquery-core', $registered->deps, true ) ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Record that a `woocommerce/*` block rendered on this request.
 *
 * A block theme renders the whole template (header and footer parts included) before
 * `wp_head`, so by `wp_enqueue_scripts` this flag covers blocks that the post content
 * check below cannot see, such as a WooCommerce mini cart or account link in a header
 * part, or a store-notices block in a page template.
 *
 * @param string $block_content Rendered block HTML (returned unchanged).
 * @param array  $block         Parsed block.
 * @return string
 */
function sgs_note_wc_block_render( $block_content, $block ) {
	$name = (string) ( $block['blockName'] ?? '' );
	if ( 0 === strpos( $name, 'woocommerce/' ) ) {
		sgs_wc_block_rendered( true );
		if ( sgs_wc_block_needs_classic_scripts( $name, (string) $block_content ) ) {
			sgs_wc_classic_markup_rendered( true );
		}
	}

	return $block_content;
}

/**
 * Whether a rendered WooCommerce block relies on WooCommerce's classic jQuery scripts.
 *
 * A classic template or shortcode block prints classic markup throughout. Otherwise the
 * one thing `wc-add-to-cart` drives is a classic Ajax add-to-cart link: WooCommerce binds
 * `.add_to_cart_button:not(.wc-interactive)`, and its own Interactivity API buttons carry
 * `wc-interactive`. Scripts that declare jQuery as a dependency (the classic product
 * gallery, the variations form) keep it through `sgs_jquery_still_needed()` and need no
 * entry here. The sort dropdown is handled by the catalog-sorting block's own script.
 *
 * @param string $name          Block name.
 * @param string $block_content Rendered HTML.
 * @return bool
 */
function sgs_wc_block_needs_classic_scripts( string $name, string $block_content ): bool {
	$classic_blocks = apply_filters(
		'sgs_wc_blocks_needing_classic_scripts',
		array( 'woocommerce/legacy-template', 'woocommerce/classic-shortcode' )
	);
	if ( in_array( $name, $classic_blocks, true ) ) {
		return true;
	}

	return (bool) preg_match( '/class="(?![^"]*\bwc-interactive\b)[^"]*\badd_to_cart_button\b/', $block_content );
}

/**
 * Whether markup driven by WooCommerce's classic scripts rendered on this request.
 *
 * @param bool $mark Pass true to record it.
 * @return bool
 */
function sgs_wc_classic_markup_rendered( bool $mark = false ): bool {
	static $rendered = false;
	if ( $mark ) {
		$rendered = true;
	}

	return $rendered;
}

/**
 * Whether this WooCommerce shop or product page runs without WooCommerce's classic jQuery scripts.
 *
 * True on a shop archive, product taxonomy archive or single product built from blocks
 * (a block theme template) that rendered no classic markup. Cart, checkout and account
 * pages keep the full stack: their forms use the classic password and field helpers.
 * Measured 2026-11-11 on the canary at 375 and 1440 px with `jquery`, `jquery-migrate`,
 * `jquery-blockui`, `woocommerce`, `wc-add-to-cart` and `js-cookie` blocked in the
 * browser: the shop's sort and filters, a simple product's add to cart, the buybox
 * choice flow's add to bag, the cart drawer and checkout all still work. That stack is
 * about 42 KB of transferred JavaScript and most of the shop's main-thread blocking.
 *
 * @return bool
 */
function sgs_wc_page_runs_without_classic_scripts(): bool {
	if ( ! function_exists( 'is_woocommerce' ) || ! wp_is_block_theme() ) {
		return false;
	}
	if ( ! is_woocommerce() || is_cart() || is_checkout() || is_account_page() ) {
		return false;
	}

	// The site-wide store notice's dismiss link is driven by `woocommerce` and `js-cookie`.
	if ( function_exists( 'is_store_notice_showing' ) && is_store_notice_showing() ) {
		return false;
	}

	// Nothing rendered from blocks means a classic PHP template printed the page.
	return sgs_wc_block_rendered() && ! sgs_wc_classic_markup_rendered();
}
add_filter( 'render_block', __NAMESPACE__ . '\\sgs_note_wc_block_render', 10, 2 );

/**
 * Whether a `woocommerce/*` block has rendered on this request.
 *
 * @param bool $mark Pass true to record a render.
 * @return bool
 */
function sgs_wc_block_rendered( bool $mark = false ): bool {
	static $rendered = false;
	if ( $mark ) {
		$rendered = true;
	}

	return $rendered;
}

/**
 * Whether this request genuinely needs WooCommerce's jQuery frontend stack.
 *
 * Added 2026-08-23 (Phase 3 design benchmark, finding X-2). WooCommerce enqueues
 * `jquery` + `jquery-migrate` + `jquery-blockui` + `wc-add-to-cart` + `js-cookie` +
 * `woocommerce` + the order-attribution pair on EVERY front-end request, including
 * pages that have nothing to do with the shop.
 *
 * Measured on the canary, gzipped, as the browser receives it: the 404 page — no
 * content, no interactivity beyond a search box — shipped 89.7 KB of JavaScript
 * across 22 files, of which jQuery alone was 30.2 KB. The framework's own stated
 * non-negotiable is "No jQuery — vanilla JS only frontend", and no SGS front-end
 * code declares a jQuery dependency: the whole stack is WooCommerce's, applied
 * site-wide. The per-page JS budget is 50 KB; the simplest pages were at 1.8x it.
 *
 * This is deliberately CONSERVATIVE. It answers "is this a WooCommerce surface?",
 * not "could this page get away without the scripts?". Any genuine shop view keeps
 * the full stack, so cart, checkout, account and the classic add-to-cart form are
 * untouched. Only pages that are not WooCommerce surfaces at all lose it.
 *
 * Fails SAFE in four places: WooCommerce inactive means there is nothing to strip;
 * a `woocommerce/*` block rendered anywhere in the template keeps everything; a
 * request with no inspectable queried object keeps the scripts; and any
 * `woocommerce/*` block or shop shortcode embedded in the content keeps them too.
 *
 * @return bool True when the WooCommerce frontend stack must stay.
 */
function sgs_page_needs_wc_frontend(): bool {
	// WooCommerce inactive: its conditional tags do not exist and nothing enqueued its stack.
	if ( ! function_exists( 'is_woocommerce' ) ) {
		return false;
	}

	// Any genuine WooCommerce surface keeps the full stack, no questions asked.
	if ( is_woocommerce() || is_cart() || is_checkout() || is_account_page() ) {
		return true;
	}

	// A WooCommerce block rendered somewhere in the template (a header part, a page template).
	if ( sgs_wc_block_rendered() ) {
		return true;
	}

	$queried = get_queried_object();
	$post    = $queried instanceof \WP_Post ? $queried : null;

	/*
	 * No inspectable post. MEASURED 2026-08-23: this branch used to `return true`
	 * ("err toward keeping the scripts"), which was too blunt and silently defeated the
	 * whole point of the gate.
	 *
	 * `get_queried_object()` returns null on a 404 and on a search, and a WP_Term on a
	 * taxonomy archive — so all three took that early exit and kept the full jQuery +
	 * WooCommerce stack. Live proof: after deploy, jQuery was GONE on a single post and
	 * on a page, and still PRESENT on the 404, the front page, the blog archive and the
	 * search results. The 404 was the very page used as the headline example of the
	 * saving, and the original comment on this branch literally named "404s with no
	 * object" as a keep-case. The fix could never have applied where it was advertised.
	 *
	 * These view types are safe to strip on, and it is worth being explicit about WHY
	 * rather than flipping the return:
	 *   - `is_woocommerce()` / cart / checkout / account have ALREADY returned true
	 *     above, so any genuine shop surface — including product taxonomy archives — is
	 *     long since handled and never reaches here.
	 *   - What remains has no `post_content` of its own that could embed a WooCommerce
	 *     block. A 404 has no post at all; a search or archive renders excerpts from the
	 *     loop, not a single post's full content.
	 *   - `sgs_jquery_still_needed()` below is the real safety net: jQuery survives if
	 *     ANY other enqueued script declares it as a dependency.
	 *
	 * Anything NOT in this list keeps the stack, so an unforeseen view type still fails
	 * safe.
	 */
	if ( ! $post ) {
		$strippable = is_404() || is_search() || is_archive() || is_home() || is_front_page();

		return ! $strippable;
	}

	// A non-shop page that embeds WooCommerce blocks or the classic shortcodes still
	// needs the stack — e.g. a landing page with a product grid or an [add_to_cart] form.
	foreach ( sgs_flatten_blocks_for_optimiser( parse_blocks( $post->post_content ) ) as $block ) {
		if ( 0 === strpos( (string) ( $block['blockName'] ?? '' ), 'woocommerce/' ) ) {
			return true;
		}
	}

	foreach ( sgs_wc_shortcode_tags() as $shortcode ) {
		if ( has_shortcode( $post->post_content, $shortcode ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Every shortcode WooCommerce has registered on this request (`[products]`, `[product_category]`,
 * `[woocommerce_cart]` and the rest), read from the shortcode registry rather than a fixed list,
 * so a shortcode WooCommerce adds later is covered too.
 *
 * @return string[]
 */
function sgs_wc_shortcode_tags(): array {
	global $shortcode_tags;

	$tags = array();
	foreach ( (array) $shortcode_tags as $tag => $callback ) {
		$owner = is_array( $callback ) ? $callback[0] : $callback;
		$owner = is_object( $owner ) ? get_class( $owner ) : (string) $owner;
		if ( 0 === strpos( ltrim( $owner, '\\' ), 'WC_Shortcodes' ) ) {
			$tags[] = (string) $tag;
		}
	}

	return $tags;
}

/**
 * Dequeue WooCommerce's stylesheets, and the theme's WooCommerce stylesheet, on a page
 * that is not a WooCommerce surface and rendered no `woocommerce/*` block.
 *
 * Measured 2026-11-11 on the canary home and blog and on a client's home and about
 * pages at 375 and 1440 px: the only rules in these sheets that match anything there
 * are `:root` custom properties read only by WooCommerce surfaces and
 * `.screen-reader-text`, and screenshots of each page and of the open `sgs/cart`
 * drawer are unchanged with all of them disabled. That is about 60 KB of transferred
 * CSS per page. The theme's sheet also styles the shop archive, product page, cart,
 * checkout and WooCommerce's own mini cart, all of which keep it.
 *
 * @return void
 */
function sgs_dequeue_wc_styles_off_wc_pages(): void {
	$style_handles = apply_filters(
		'sgs_dequeue_wc_styles_off_wc_pages',
		array(
			'woocommerce-general',
			'woocommerce-layout',
			'woocommerce-smallscreen',
			'woocommerce-blocktheme',
			'wc-blocks-style',
			'sgs-woocommerce',
			'sgs-woocommerce-notices',
		)
	);

	foreach ( $style_handles as $handle ) {
		wp_dequeue_style( $handle );
	}
}

/**
 * Dequeue the redundant WooCommerce frontend scripts.
 *
 * Fires on three independent paths:
 *   1. A page carrying a BOUND configurator — the original D-numbered behaviour. Such a
 *      page IS a WooCommerce surface, so path 2 would never reach it; the configurator
 *      talks to the SGS REST proxy and the Store API by vanilla fetch, so the jQuery
 *      stack is redundant there specifically.
 *   2. A page that is not a WooCommerce surface at all (X-2, 2026-08-23) — the 404,
 *      search, blog archive, single post, ordinary pages and the front page. This
 *      path also drops WooCommerce's stylesheets (`sgs_dequeue_wc_styles_off_wc_pages()`).
 *   3. A shop archive or single product built from blocks with no classic markup
 *      (`sgs_wc_page_runs_without_classic_scripts()`, 2026-11-11). Its stylesheets stay.
 *
 * Hooked at priority 99 so it runs after WooCommerce (and everything else)
 * has enqueued on `wp_enqueue_scripts`.
 *
 * @return void
 */
function sgs_configurator_optimise_assets(): void {
	if ( false === apply_filters( 'sgs_configurator_optimise_assets', true ) ) {
		return;
	}

	$has_configurator = sgs_page_has_bound_configurator();

	/**
	 * Filter the non-WooCommerce dequeue path independently of the configurator path,
	 * so a site can keep one and disable the other without a redeploy.
	 *
	 * @param bool $enabled Whether to strip the WC stack from non-WooCommerce pages.
	 */
	$strip_off_wc_pages = (bool) apply_filters( 'sgs_optimise_assets_off_wc_pages', true )
		&& ! sgs_page_needs_wc_frontend();

	/**
	 * Filter the block-built shop and product page path independently of the other two.
	 *
	 * @param bool $enabled Whether to strip the classic WC scripts from block-built shop and product pages.
	 */
	$strip_on_block_shop = (bool) apply_filters( 'sgs_optimise_assets_on_block_shop_pages', true )
		&& sgs_wc_page_runs_without_classic_scripts();

	if ( ! $has_configurator && ! $strip_off_wc_pages && ! $strip_on_block_shop ) {
		return;
	}

	// WooCommerce frontend scripts the configurator does not use. Order attribution
	// (`sourcebuster-js`, `wc-order-attribution`) is never in this list: it must run on
	// the page a visitor lands on to record where they came from, and every order's
	// "origin" depends on it (Bean, 2026-11-03).
	$wc_handles = apply_filters(
		'sgs_configurator_dequeue_wc_handles',
		array(
			'woocommerce',
			'wc-add-to-cart',
			'jquery-blockui',
			'js-cookie',
		)
	);

	// Only a block theme has rendered the whole template by now, so only there can the
	// `woocommerce/*` render flag vouch for header and footer parts.
	if ( $strip_off_wc_pages && wp_is_block_theme() ) {
		sgs_dequeue_wc_styles_off_wc_pages();
	}

	if ( $strip_on_block_shop && ! $has_configurator && ! $strip_off_wc_pages ) {
		add_action( 'wp_footer', __NAMESPACE__ . '\\sgs_restore_jquery_for_queued_wc_js', 1 );
	}

	foreach ( $wc_handles as $handle ) {
		wp_dequeue_script( $handle );
	}

	// jQuery (and migrate) only when nothing else still needs it.
	if ( apply_filters( 'sgs_configurator_dequeue_jquery', true )
		&& ! sgs_jquery_still_needed( $wc_handles ) ) {
		wp_dequeue_script( 'jquery' );
		wp_dequeue_script( 'jquery-core' );
		wp_dequeue_script( 'jquery-migrate' );
	}
}

add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\sgs_configurator_optimise_assets', 99 );

/**
 * Bring jQuery back in the footer when code queued inline WooCommerce JavaScript.
 *
 * `wc_enqueue_js()` snippets print as `jQuery( function( $ ) { … } )` after the footer
 * scripts, with no declared dependency, so `sgs_jquery_still_needed()` cannot see them.
 * Hooked at `wp_footer` priority 1 on block-built shop and product pages only, before the
 * footer scripts print at priority 20.
 *
 * @return void
 */
function sgs_restore_jquery_for_queued_wc_js(): void {
	global $wc_queued_js;

	if ( ! empty( $wc_queued_js ) ) {
		wp_enqueue_script( 'jquery' );
	}
}

/**
 * Drop `wp-polyfill` as a dependency of front-end scripts.
 *
 * `wp-polyfill` is a core-js bundle that fills in language features for browsers older
 * than any WordPress supports; every current browser has them natively. On the front end
 * it arrives only as a declared dependency (on a WooCommerce shop page through
 * `wc-settings` and `wc-types`, about 10.5 KB transferred, measured 2026-11-11), so
 * removing the dependency removes the file while every script that listed it still loads.
 * A script that enqueues `wp-polyfill` directly keeps it. The block editor and wp-admin
 * are untouched.
 *
 * @return void
 */
function sgs_drop_polyfill_dependency(): void {
	if ( is_admin() || ! apply_filters( 'sgs_drop_polyfill_dependency', true ) ) {
		return;
	}

	foreach ( wp_scripts()->registered as $script ) {
		if ( in_array( 'wp-polyfill', $script->deps, true ) ) {
			$script->deps = array_values( array_diff( $script->deps, array( 'wp-polyfill' ) ) );
		}
	}
}

add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\sgs_drop_polyfill_dependency', 100 );
