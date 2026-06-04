<?php
/**
 * Configurator <head> emitter — ProductGroup+hasVariant JSON-LD (E1),
 * canonical (E2), Open Graph (E3).
 *
 * WHY a wp_head hook (in includes/), not an include inside product-card/render.php:
 *  - Open Graph + canonical MUST be emitted in <head>. A block's render.php runs
 *    during `the_content`, AFTER <head> has already been sent — too late.
 *  - Keeping it here ALSO keeps schema/OG/canonical entirely OFF the shared
 *    product-card/render.php, which the Cluster-A visible units edit serially
 *    (the concurrency-safety goal from the Spec 27 Phase 2 plan).
 *  - It lives in includes/ (not src/) because it is plugin infrastructure, not a
 *    block render template — src/ is not deployed and webpack only copies render.php.
 *
 * SEC-9 detect-and-defer: when an SEO plugin (Yoast / RankMath) is active it
 * already emits product OG + canonical, so SGS does NOT duplicate those. SGS still
 * adds the per-variation ProductGroup JSON-LD (which those plugins do not produce
 * for SGS's configurator).
 *
 * STEP 0 = SCAFFOLD ONLY. This detects a bound (wc-product) configurator on the
 * current page and emits a marker comment proving the hook fires here and nowhere
 * else. FR-27-E1/E2/E3 replace the marker with real JSON-LD / canonical / OG and
 * read every commerce value from Product_Manifest::build() (SEC-1, single source
 * of truth) at the inc-VAT display price (SEC-2).
 *
 * Self-contained (its own block walker) so it carries no dependency on any other
 * include (lesson: a shared helper must require its own deps).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Collect bound (wc-product) configurator product IDs from a parsed-block tree.
 *
 * @param array $blocks Parsed blocks (parse_blocks() output).
 * @param int[] $ids    Accumulator (by reference).
 * @return void
 */
function sgs_collect_bound_configurator_ids( array $blocks, array &$ids ): void {
	foreach ( $blocks as $block ) {
		if ( 'sgs/product-card' === ( $block['blockName'] ?? '' )
			&& 'wc-product' === ( $block['attrs']['sourceMode'] ?? '' ) ) {
			$product_id = \absint( $block['attrs']['productId'] ?? 0 );
			if ( $product_id > 0 ) {
				$ids[] = $product_id;
			}
		}
		if ( ! empty( $block['innerBlocks'] ) ) {
			sgs_collect_bound_configurator_ids( $block['innerBlocks'], $ids );
		}
	}
}

/**
 * Unique bound configurator product IDs in the current singular view.
 *
 * @return int[] Empty when not singular or no bound configurator present.
 */
function sgs_get_bound_configurator_product_ids(): array {
	$queried = \get_queried_object();
	$post    = $queried instanceof \WP_Post ? $queried : null;

	if ( ! $post || ! \has_block( 'sgs/product-card', $post ) ) {
		return array();
	}

	$ids = array();
	sgs_collect_bound_configurator_ids( \parse_blocks( $post->post_content ), $ids );

	return \array_values( \array_unique( $ids ) );
}

/**
 * Whether an SEO plugin owns OG/canonical/sitemap on this site (SEC-9).
 *
 * @return bool
 */
function sgs_configurator_seo_plugin_active(): bool {
	return \defined( 'WPSEO_VERSION' )
		|| \class_exists( 'RankMath' )
		|| \defined( 'RANK_MATH_VERSION' );
}

/**
 * Emit the configurator <head> tags. Hooked at priority 11 so it runs just after
 * core/SEO-plugin <head> output.
 *
 * @return void
 */
function sgs_configurator_emit_head(): void {
	$product_ids = sgs_get_bound_configurator_product_ids();
	if ( empty( $product_ids ) ) {
		return;
	}

	// Debug marker (kept): proves the hook fired here and shows the SEO-plugin
	// ownership state. FR-27-E2 adds the canonical; FR-27-E3 adds OG — those defer
	// to an active SEO plugin (SEC-9). The ProductGroup JSON-LD below does NOT
	// defer: variant-level schema is the thing SGS uniquely adds that Yoast /
	// RankMath do not produce for the configurator.
	\printf(
		"\n<!-- sgs-configurator-head: %s (%d bound product%s) -->\n",
		\esc_html( sgs_configurator_seo_plugin_active() ? 'seo-plugin-active' : 'sgs-owned' ),
		\count( $product_ids ),
		1 === \count( $product_ids ) ? '' : 's'
	);

	// FR-27-E1 — ProductGroup + hasVariant JSON-LD, one per bound product. The
	// returned string is already wp_json_encode'd with HEX flags + size-capped
	// (SEC-3); echo it verbatim. Reads commerce data only from the manifest (SEC-1)
	// at the inc-VAT price (SEC-2). NOT guarded by SEC-9: the ProductGroup schema
	// is the thing Yoast / RankMath do NOT produce for the configurator, so SGS
	// always emits it.
	require_once __DIR__ . '/class-product-schema.php';
	foreach ( $product_ids as $product_id ) {
		echo Product_Schema::build_script( $product_id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-encoded ld+json (wp_json_encode HEX flags), not HTML.
	}

	// FR-27-E3 — Open Graph product meta tags.
	// SEC-9 detect-and-defer: an active Yoast / RankMath already emits product OG;
	// duplicating it causes validation warnings and confuses crawlers. Emit OG ONLY
	// when no SEO plugin is active. The JSON-LD block above is intentionally OUTSIDE
	// this guard — that is the thing the SEO plugins do not produce.
	if ( ! sgs_configurator_seo_plugin_active() ) {
		// Manifest class carries its own require_once; safe to call here.
		require_once __DIR__ . '/class-product-manifest.php';

		foreach ( $product_ids as $product_id ) {
			sgs_emit_og_tags( $product_id );
		}
	}
}

/**
 * Emit Open Graph meta tags for a single bound product (FR-27-E3 / SEC-9).
 *
 * Price values come exclusively from Product_Manifest::build() (SEC-1/SEC-2).
 * Product name / description / permalink are read via wc_get_product() — the
 * manifest does not cache those, and they are not commerce values.
 *
 * Called only when ! sgs_configurator_seo_plugin_active() (SEC-9 guard applied
 * by the caller, sgs_configurator_emit_head()).
 *
 * @param int $product_id WC variable product ID.
 * @return void
 */
function sgs_emit_og_tags( int $product_id ): void {
	if ( ! \function_exists( 'wc_get_product' ) ) {
		return;
	}

	// SEC-1: all commerce values (price/stock/image) come from the manifest.
	// wc_get_product() is used below for name/description/permalink ONLY.
	$manifest = Product_Manifest::build( $product_id );
	if ( null === $manifest || empty( $manifest['combos'] ) || '' === $manifest['defaultKey'] ) {
		return;
	}

	$default_key = $manifest['defaultKey'];
	if ( ! isset( $manifest['combos'][ $default_key ] ) ) {
		return;
	}
	$combo = $manifest['combos'][ $default_key ];

	// Safety: combo must carry a usable incMinor (numeric) for the price tag.
	if ( ! isset( $combo['incMinor'] ) || ! \is_numeric( $combo['incMinor'] ) ) {
		return;
	}

	// Parent product — name / description / permalink only (NOT price; SEC-1).
	$product = \wc_get_product( $product_id );
	if ( ! $product ) {
		return;
	}

	$decimals = (int) $manifest['decimals'];

	// SEC-2: inc-VAT price from the manifest's incMinor field — never
	// wc_get_price_to_display / wc_get_price_including_tax / get_children.
	$price_string = \number_format(
		(int) $combo['incMinor'] / ( 10 ** $decimals ),
		$decimals,
		'.',
		''
	);

	$currency  = \get_woocommerce_currency();
	$permalink = (string) \get_permalink( $product_id );
	$site_name = \get_bloginfo( 'name' );

	// og:type — always 'product' for a WC variable product.
	\printf( "<meta property=\"og:type\" content=\"%s\" />\n", \esc_attr( 'product' ) );

	// og:title — product name.
	\printf(
		"<meta property=\"og:title\" content=\"%s\" />\n",
		\esc_attr( \wp_strip_all_tags( $product->get_name() ) )
	);

	// og:description — short description → skip if empty.
	$description = \trim( \wp_strip_all_tags( $product->get_short_description() ) );
	if ( '' !== $description ) {
		\printf(
			"<meta property=\"og:description\" content=\"%s\" />\n",
			\esc_attr( $description )
		);
	}

	// og:url — product permalink.
	\printf(
		"<meta property=\"og:url\" content=\"%s\" />\n",
		\esc_url( $permalink )
	);

	// og:image — default combo imageUrl from manifest (SEC-1); skip if empty.
	$image_url = (string) ( $combo['imageUrl'] ?? '' );
	if ( '' !== $image_url ) {
		\printf(
			"<meta property=\"og:image\" content=\"%s\" />\n",
			\esc_url( $image_url )
		);
	}

	// og:site_name — blog name.
	\printf(
		"<meta property=\"og:site_name\" content=\"%s\" />\n",
		\esc_attr( $site_name )
	);

	// product:price:amount — inc-VAT display price (SEC-2).
	\printf(
		"<meta property=\"product:price:amount\" content=\"%s\" />\n",
		\esc_attr( $price_string )
	);

	// product:price:currency — WooCommerce store currency.
	\printf(
		"<meta property=\"product:price:currency\" content=\"%s\" />\n",
		\esc_attr( $currency )
	);

	// product:availability — instock / outofstock from manifest combo (SEC-1).
	$availability = ! empty( $combo['inStock'] ) ? 'instock' : 'outofstock';
	\printf(
		"<meta property=\"product:availability\" content=\"%s\" />\n",
		\esc_attr( $availability )
	);
}

\add_action( 'wp_head', __NAMESPACE__ . '\\sgs_configurator_emit_head', 11 );
