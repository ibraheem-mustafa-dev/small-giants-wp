<?php
/**
 * Product FAQ Schema JSON-LD — footer emitter.
 *
 * The sgs/product-faq render.php collects Question/Answer pairs into the
 * global $sgs_faq_jsonld_items array during block rendering. This file
 * defines the wp_footer callback that emits exactly ONE FAQPage JSON-LD
 * script tag per page — satisfying the spec requirement that:
 *   - one FAQPage maximum per page
 *   - all Q&A pairs are in a single mainEntity array
 *   - the script tag is a sibling of (never nested inside) any Product JSON-LD
 *
 * The callback is registered conditionally from render.php only when a
 * product-faq block is actually present on the page, so this function fires
 * on zero non-FAQ pages.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_emit_faq_page_jsonld' ) ) {
	/**
	 * Emit the merged FAQPage JSON-LD in wp_footer.
	 *
	 * Reads $sgs_faq_jsonld_items — a page-scoped global populated by every
	 * sgs/product-faq block instance during render — and outputs a single
	 * <script type="application/ld+json"> tag.
	 *
	 * Hooked at priority 90 so it runs after most theme/plugin footer output
	 * but before wp_print_footer_scripts (priority 20) has finished — the
	 * ordering keeps the script in the <body> footer area, not in <head>,
	 * which is where Google recommends placing JSON-LD for page-specific markup.
	 *
	 * @return void
	 */
	function sgs_emit_faq_page_jsonld(): void {
		global $sgs_faq_jsonld_items;

		if ( empty( $sgs_faq_jsonld_items ) || ! is_array( $sgs_faq_jsonld_items ) ) {
			return;
		}

		// array_values() re-indexes after the dedup-by-md5-key pass in render.php.
		$schema = array(
			'@context'   => 'https://schema.org',
			'@type'      => 'FAQPage',
			'mainEntity' => array_values( $sgs_faq_jsonld_items ),
		);

		// HEX flags match class-product-schema.php: without JSON_HEX_TAG a literal
		// </script> inside a value would close the inline script tag (stored XSS
		// if the upstream strip_tags ever moves — defence-in-depth, red-team F2).
		$json_ld = wp_json_encode(
			$schema,
			JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
			| JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
		);
		if ( ! $json_ld ) {
			return;
		}

		printf(
			'<script type="application/ld+json">%s</script>' . "\n",
			$json_ld // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_json_encode output is safe; JSON encoding is the escape mechanism for JSON-LD.
		);
	}
}
