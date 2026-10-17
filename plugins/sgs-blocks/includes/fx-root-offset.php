<?php
/**
 * Root-tag locator for the `data-sgs-fx` render filters.
 *
 * Several blocks print a scoped `<style id="…">…</style>` or a `<script>` before their real wrapper, and
 * `WP_HTML_Tag_Processor::next_tag()` matches ANY tag, so calling it on the raw content would land an attribute on the
 * style tag. The p99 CSS lift later strips that tag wholesale, so the effect would never fire and nothing would report
 * an error. Every fx filter therefore skips the leading `<style>` and `<script>` blocks first and works on the rest.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

if ( ! \function_exists( __NAMESPACE__ . '\sgs_fx_root_offset' ) ) {
	/**
	 * Byte offset of a rendered block's real root tag, past any leading `<style>` / `<script>` blocks.
	 *
	 * @param string $block_content Rendered block HTML.
	 * @return int Byte offset of the real root tag.
	 */
	function sgs_fx_root_offset( string $block_content ): int {
		$offset = 0;
		while ( \preg_match( '/^\s*<(style|script)\b[^>]*>/i', \substr( $block_content, $offset ), $m ) ) {
			$close     = '</' . \strtolower( $m[1] ) . '>';
			$close_pos = \stripos( $block_content, $close, $offset );
			if ( false === $close_pos ) {
				break; // Malformed markup: treat the whole string as-is.
			}
			$offset = $close_pos + \strlen( $close );
		}
		return $offset;
	}
}
