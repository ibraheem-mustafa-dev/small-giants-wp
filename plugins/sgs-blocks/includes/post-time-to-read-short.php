<?php
/**
 * Core Post Time to Read: the "Short format" setting (`sgsShortFormat`).
 *
 * On, the block's text reads "2 min read" (a range reads "2–3 min read") instead of core's
 * "2 minutes" / "2–3 minutes". The figures core computed are kept; only the wording changes, and
 * the block's wrapper markup is untouched. Words mode (`displayMode` = `words`) is left as core
 * prints it. Off (the default) changes nothing.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block_core/post-time-to-read', __NAMESPACE__ . '\sgs_post_time_to_read_short', 10, 2 );

/**
 * Rewrites the block's text node to the short form when `sgsShortFormat` is on.
 *
 * @param mixed $block_content Rendered block HTML.
 * @param mixed $block         Parsed block.
 * @return mixed
 */
function sgs_post_time_to_read_short( $block_content, $block ) {
	if ( ! is_string( $block_content ) || '' === trim( $block_content ) || ! is_array( $block ) ) {
		return $block_content;
	}
	$attrs = $block['attrs'] ?? array();
	if ( ! is_array( $attrs ) || empty( $attrs['sgsShortFormat'] ) || 'words' === ( $attrs['displayMode'] ?? '' ) ) {
		return $block_content;
	}

	return preg_replace_callback(
		'/>([^<>]*\d[^<>]*)</u',
		static function ( array $match ): string {
			if ( ! preg_match_all( '/\d+/', $match[1], $numbers ) ) {
				return $match[0];
			}
			$figures = $numbers[0];
			if ( count( $figures ) >= 2 ) {
				/* translators: 1: shortest reading time in minutes, 2: longest reading time in minutes. */
				$text = sprintf( __( '%1$s–%2$s min read', 'sgs-blocks' ), $figures[0], $figures[1] );
			} else {
				/* translators: %s: reading time in minutes. */
				$text = sprintf( __( '%s min read', 'sgs-blocks' ), $figures[0] );
			}
			return '>' . esc_html( $text ) . '<';
		},
		$block_content,
		1
	);
}
