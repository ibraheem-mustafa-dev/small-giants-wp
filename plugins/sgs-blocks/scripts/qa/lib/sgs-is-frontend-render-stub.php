<?php
/**
 * Reproduces SGS\Blocks\sgs_is_frontend_render() (class-sgs-css-registry.php)
 * verbatim, for plugins/sgs-blocks/src/blocks/business-info/render.php.
 *
 * The real parent file is NOT require_once'd by the harness: it also
 * add_filter()s a render_block consolidation hook and defines CSS-cache-
 * directory/glob/unlink filesystem helpers at load time that have nothing to
 * do with a block's CSS output and would need their own filesystem stubbing
 * to load safely standalone. This single function is small and pure enough
 * to reproduce faithfully instead.
 *
 * @package SGS\Blocks\QA
 */

declare(strict_types=1);

namespace SGS\Blocks;

// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// (CLI harness stub, not shipped plugin code.)

if ( ! function_exists( __NAMESPACE__ . '\\sgs_is_frontend_render' ) ) {
	/**
	 * True only for a genuine front-end page render — NOT the block-editor's
	 * ServerSideRender / block-renderer REST preview (which has no
	 * wp_footer). Logic reproduced verbatim from the real function.
	 */
	function sgs_is_frontend_render(): bool {
		if ( \is_admin() ) {
			return false;
		}
		if ( \wp_is_serving_rest_request() ) {
			return false;
		}
		if ( \defined( 'REST_REQUEST' ) && \REST_REQUEST ) {
			return false;
		}
		return true;
	}
}
