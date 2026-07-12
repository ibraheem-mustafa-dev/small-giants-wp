<?php
/**
 * SGS per-instance scoped-CSS registry / collector (P-STYLE-TAG-CONSOLIDATION).
 *
 * Spec 32 §6.2 / FR-32-11. Every SGS block emits its per-instance scoped CSS as
 * a `<style>` tag inside its rendered HTML (§6.1(b) — the sanctioned no-inline
 * mechanism). Emitted per-instance that is ~100 scattered `<style>` tags / ~33KB
 * in the page body (measured live page 8, 2026-07-12). This collector CONSOLIDATES
 * them: a single late `render_block` filter lifts every SGS block's `<style>`
 * tag out of its rendered output into a per-request buffer, and one `wp_footer`
 * flush prints them consolidated (Phase 1 = one inline footer `<style>`; Phase 2
 * = a cached external file, see §6.2(b)).
 *
 * WHY a render_block chokepoint, not ~60 per-block emit-site edits: the /qc-council
 * (2026-07-12) found SGS emits its scoped `<style>` via 6 structurally-distinct
 * shapes across ~60 render.php + the container wrapper + custom-css.php. All 6
 * shapes produce a `<style>` tag IN THE BLOCK'S RENDERED HTML, so a single filter
 * that lifts `<style>` tags from each sgs/* block's output captures all of them
 * universally (R-31-9) — no per-shape audit, no risk of missing a block, and the
 * container wrapper (prepended tag) + custom-css residual (appended tag) are both
 * caught without touching either file.
 *
 * D303 residual precedence (Spec 31 FR-31-5.2): custom-css.php APPENDS its
 * `sgsCustomCss` residual `<style>` after the block's own output (priority 10).
 * This filter runs LATER (priority 99), so for each block the tags appear in
 * document order [block-own … residual] and are buffered in that order —
 * source-order precedence is preserved intact. Nested blocks: a child's
 * render_block fires (and its `<style>` is lifted) before its parent's, so a
 * parent never double-counts a child's CSS.
 *
 * EDITOR PARITY (/qc-council CRITICAL): ServerSideRender / the block-renderer
 * REST route has no `wp_footer`, so the editor MUST keep the block's `<style>`
 * inline. The predicate is `! is_admin() && ! wp_is_serving_rest_request()` — the
 * naive `! is_admin()` is WRONG (is_admin() is false during REST), which would
 * route the editor preview into a buffer that never flushes → unstyled canvas.
 *
 * @package SGS\Blocks
 * @since   1.17.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Per-request buffer of consolidated scoped CSS, keyed by a content hash so
 * identical block instances (deterministic md5-of-attributes uids) collapse to
 * one rule. Insertion order is preserved (PHP arrays iterate insertion-ordered;
 * overwriting a key does NOT move it) — do NOT sort/regroup this on flush.
 *
 * @var array<string,string>
 */
$GLOBALS['sgs_collected_css'] = array();

/**
 * True only for a genuine front-end page render — NOT the block-editor's
 * ServerSideRender / block-renderer REST preview (which has no wp_footer).
 *
 * @return bool
 */
function sgs_is_frontend_render(): bool {
	if ( \is_admin() ) {
		return false;
	}
	// WP 6.5+ native (site floor is 6.9–7.0); REST_REQUEST constant is the
	// belt-and-braces fallback for the block-renderer REST route.
	if ( \function_exists( 'wp_is_serving_rest_request' ) && \wp_is_serving_rest_request() ) {
		return false;
	}
	if ( \defined( 'REST_REQUEST' ) && \REST_REQUEST ) {
		return false;
	}
	return true;
}

/**
 * Register a finished scoped-CSS string into the per-request buffer. Deduped by
 * content hash; insertion order preserved for D303 residual precedence.
 *
 * @param string $css Already-sanitised CSS text (no `<style>` wrapper).
 * @return void
 */
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

/**
 * Lift filter (render_block): on the front end, pull every `<style>` tag out of
 * an sgs/* block's rendered HTML into the buffer and return the HTML without them.
 * In the editor (REST) the block's `<style>` is left inline, unchanged.
 *
 * Scoped to sgs/* blocks so a core/html block (or any non-SGS block) that
 * legitimately contains a `<style>` is never touched.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Parsed block (blockName, attrs, …).
 * @return string
 */
function sgs_lift_block_css( string $block_content, array $block ): string {
	if ( '' === $block_content ) {
		return $block_content;
	}
	$name = $block['blockName'] ?? '';
	if ( 0 !== \strpos( (string) $name, 'sgs/' ) ) {
		return $block_content;
	}
	if ( false === \strpos( $block_content, '<style' ) ) {
		return $block_content;
	}
	// Editor preview (REST) has no wp_footer flush — keep the CSS inline.
	if ( ! sgs_is_frontend_render() ) {
		return $block_content;
	}

	// Lift every `<style …>…</style>` in document order. SGS CSS is
	// wp_strip_all_tags()'d at source, so no nested `</style>` can occur.
	return (string) \preg_replace_callback(
		'#<style\b[^>]*>(.*?)</style>#is',
		static function ( $m ) {
			sgs_collect_css( $m[1] );
			return '';
		},
		$block_content
	);
}
\add_filter( 'render_block', __NAMESPACE__ . '\\sgs_lift_block_css', 99, 2 );

/**
 * Flush action (wp_footer): print the consolidated buffer as ONE `<style>`
 * (Phase 1 inline mode). Phase 2 branches to a cached external file (§6.2(b)).
 *
 * @return void
 */
function sgs_flush_collected_css(): void {
	if ( \is_admin() || empty( $GLOBALS['sgs_collected_css'] ) ) {
		return;
	}
	// Insertion order = document order (D303 residual-last per block). Do NOT sort.
	$css = \implode( '', $GLOBALS['sgs_collected_css'] );
	if ( '' === \trim( $css ) ) {
		return;
	}
	echo '<style id="sgs-blocks-collected">' . \wp_strip_all_tags( $css ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised at source + wp_strip_all_tags here; esc_html would corrupt combinators (`>`).
}
\add_action( 'wp_footer', __NAMESPACE__ . '\\sgs_flush_collected_css', 99 );
