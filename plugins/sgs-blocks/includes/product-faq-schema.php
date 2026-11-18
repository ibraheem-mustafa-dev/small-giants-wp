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

		// The one shared encoder: HEX flags (a literal </script> in a value cannot
		// close the inline script tag) and entity decoding.
		require_once __DIR__ . '/class-sgs-schema.php';
		$json_ld = \SGS\Blocks\Sgs_Schema::encode_jsonld( $schema );
		if ( ! $json_ld ) {
			return;
		}

		printf(
			'<script type="application/ld+json">%s</script>' . "\n",
			$json_ld // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_json_encode output is safe; JSON encoding is the escape mechanism for JSON-LD.
		);
	}
}
