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
	// at the inc-VAT price (SEC-2).
	require_once __DIR__ . '/class-product-schema.php';
	foreach ( $product_ids as $product_id ) {
		echo Product_Schema::build_script( $product_id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-encoded ld+json (wp_json_encode HEX flags), not HTML.
	}
}

\add_action( 'wp_head', __NAMESPACE__ . '\\sgs_configurator_emit_head', 11 );
