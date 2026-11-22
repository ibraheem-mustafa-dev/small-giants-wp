<?php
/**
 * The per-request CSS buffer for the render harness, loaded only by `--render-block-filters`: a front-end render hands its
 * finished CSS to SGS\Blocks\sgs_collect_css() (includes/class-sgs-css-registry.php), which prints it in the page head.
 *
 * WHAT IT IS: sgs_collect_css() as the registry defines it (trimmed, deduplicated by content hash, insertion order kept)
 * over the same `$GLOBALS['sgs_collected_css']` buffer; the harness appends the buffer to the result's `css` after the
 * render, as the head carries it on a site. The registry file itself is not loaded here: it also hooks a render_block
 * lift and defines cache-folder filesystem helpers that have nothing to do with a block's CSS. A render that reaches
 * sgs_collect_css() without this flag (the motion renderer's own rules, a loop's stagger rules) stops at the missing
 * function, as it always has.
 *
 * Test scaffolding only; nothing here is shipped.
 *
 * @package SGS\Blocks\QA
 */

declare(strict_types=1);

namespace SGS\Blocks;

// phpcs:disable

if ( ! isset( $GLOBALS['sgs_collected_css'] ) ) {
	$GLOBALS['sgs_collected_css'] = array();
}

if ( ! function_exists( __NAMESPACE__ . '\sgs_collect_css' ) ) {
	function sgs_collect_css( string $css ): void {
		$css = \trim( $css );
		if ( '' === $css ) {
			return;
		}
		$key = \md5( $css );
		if ( ! isset( $GLOBALS['sgs_collected_css'][ $key ] ) ) {
			$GLOBALS['sgs_collected_css'][ $key ] = $css;
		}
	}
}
