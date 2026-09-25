<?php
/**
 * Render helpers for sgs/notice-banner's U-15 self-changing messages
 * (`.claude/reports/2026-09-26-u15-notice-message-design.md`).
 *
 * Kept out of render.php per the no-top-level-function-in-render.php rule
 * (a top-level function declaration fatals the page on the block's second
 * instance in one request).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_notice_banner_message_count' ) ) {
	/**
	 * Count the direct sgs/notice-message children of a parsed block.
	 *
	 * @param array $parsed_block The block's own $block->parsed_block.
	 * @return int Number of sgs/notice-message children.
	 */
	function sgs_notice_banner_message_count( array $parsed_block ): int {
		$inner_blocks = $parsed_block['innerBlocks'] ?? array();
		if ( ! is_array( $inner_blocks ) ) {
			return 0;
		}

		$count = 0;
		foreach ( $inner_blocks as $inner_block ) {
			if ( isset( $inner_block['blockName'] ) && 'sgs/notice-message' === $inner_block['blockName'] ) {
				++$count;
			}
		}

		return $count;
	}
}

if ( ! function_exists( 'sgs_notice_banner_resolve_message_mode' ) ) {
	/**
	 * Resolve messageMode against its allow-list, coercing any off-enum value
	 * to 'static' (never fatal on a hand-authored or stale attribute).
	 *
	 * @param mixed $raw The raw attribute value.
	 * @return string One of 'static' | 'rotate' | 'random'.
	 */
	function sgs_notice_banner_resolve_message_mode( $raw ): string {
		$allowed = array( 'static', 'rotate', 'random' );
		return in_array( $raw, $allowed, true ) ? $raw : 'static';
	}
}

if ( ! function_exists( 'sgs_notice_banner_resolve_transition' ) ) {
	/**
	 * Resolve messageTransition against its allow-list.
	 *
	 * @param mixed $raw The raw attribute value.
	 * @return string One of 'none' | 'fade' | 'slide-up' | 'slide-left'.
	 */
	function sgs_notice_banner_resolve_transition( $raw ): string {
		$allowed = array( 'none', 'fade', 'slide-up', 'slide-left' );
		return in_array( $raw, $allowed, true ) ? $raw : 'fade';
	}
}

if ( ! function_exists( 'sgs_notice_banner_clamp_interval' ) ) {
	/**
	 * Clamp rotateInterval to the design's 2-30 second range.
	 *
	 * @param mixed $raw The raw attribute value.
	 * @return int Clamped whole seconds.
	 */
	function sgs_notice_banner_clamp_interval( $raw ): int {
		$value = is_numeric( $raw ) ? (int) round( (float) $raw ) : 5;
		return max( 2, min( 30, $value ) );
	}
}

if ( ! function_exists( 'sgs_notice_banner_arrow_colour_css' ) ) {
	/**
	 * Scoped colour CSS for the previous/next rotation arrows (base + hover).
	 *
	 * @param string $root_sel The banner's own scoped root selector.
	 * @param string $colour   Flat arrow colour (raw attribute value).
	 * @param string $hover    Flat arrow hover colour (raw attribute value).
	 * @return string CSS, or '' when no colour is set.
	 */
	function sgs_notice_banner_arrow_colour_css( string $root_sel, string $colour, string $hover ): string {
		if ( '' === $colour && '' === $hover ) {
			return '';
		}

		$sel = $root_sel . ' .sgs-notice-banner__prev, ' . $root_sel . ' .sgs-notice-banner__next';
		$css = '';
		if ( '' !== $colour ) {
			$css .= $sel . '{color:' . sgs_colour_value( $colour ) . ';}';
		}
		if ( '' !== $hover ) {
			$css .= sgs_hover_state_rules( $sel, 'color:' . sgs_colour_value( $hover ) );
		}

		return $css;
	}
}
