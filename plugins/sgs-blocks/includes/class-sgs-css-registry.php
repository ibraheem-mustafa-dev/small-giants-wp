<?php
/**
 * SGS per-instance scoped-CSS registry / collector (P-STYLE-TAG-CONSOLIDATION).
 *
 * Spec 32 §6.2 / FR-32-11. Every SGS block emits its per-instance scoped CSS as
 * a `<style>` tag inside its rendered HTML (§6.1(b) — the sanctioned no-inline
 * mechanism). Emitted per-instance that is ~100 scattered `<style>` tags / ~33KB
 * in the page body (measured live page 8, 2026-07-12). This collector CONSOLIDATES
 * them: a single late `render_block` filter lifts every SGS block's `<style>` tag
 * out of its rendered output into a per-request buffer, and ONE output-buffer
 * callback places the consolidated CSS in the `<head>` — as an inline `<style>`
 * ('head' mode) or a cached external `<link>` ('file' mode, the default). See
 * §6.2(b). The mode is operator-selectable (SGS → CSS Output settings).
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

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * Head-placement + output modes. Spec 32 §6.2(b).
 *
 * ONE output buffer (template_redirect) places the consolidated CSS into the
 * `<head>` on EVERY front-end render — inline `<style>` ('head' mode) or a
 * cached content-hashed external `<link>` ('file' mode, default), injected right
 * before `</head>` so it follows the block style.css handles (per-instance
 * overrides win by source order). Placing it every render makes the output
 * self-consistent under full-page caching (the cached HTML always carries the
 * matching link/style) — there is NO pointer, NO cold/warm transition, and NO
 * cache-freeze (the failure LiteSpeed's page cache caused an earlier
 * generate-then-serve design, reproduced live 2026-07-12 then removed here).
 *
 * File-mode invalidation is automatic: changed CSS → new content hash → new
 * filename → the freshly-rendered HTML links it. A global CSS epoch (prefixed on
 * the filename) is bumped on ANY save_post (pages + wp_template + wp_template_part
 * + wp_global_styles + product are all CPTs → covers content/template/global-
 * styles edits) and on plugin deploy (version+mtime signature) — each bump purges
 * the LiteSpeed full-page cache (so cached HTML re-renders) and GCs orphaned
 * files. Uploads not writable → self-contained inline fallback.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Output mode (admin-selectable via the SGS → CSS Output settings page, still
 * filterable):
 *   'file' — DEFAULT — one cached external stylesheet `<link>` in the head.
 *            Optimal WITH a CSS-optimisation plugin (LiteSpeed/Autoptimize/…)
 *            that defers/critical-splits it; browser-cacheable per page.
 *   'head' — one inline `<style>` injected into the `<head>` via our own output
 *            buffer. Fully self-contained (no plugin/cache dependency), matches
 *            the source draft's model; best when no optimisation plugin is run.
 * Filter: `sgs_css_output_mode`.
 *
 * @return string
 */
function sgs_css_output_mode(): string {
	$mode = \get_option( 'sgs_css_output_mode', 'file' );
	$mode = \apply_filters( 'sgs_css_output_mode', $mode );
	// 'inline' is a legacy alias for 'head'.
	return \in_array( $mode, array( 'head', 'inline' ), true ) ? 'head' : 'file';
}

/**
 * Open ONE output buffer for a genuine front-end page render (both 'head' and
 * 'file' modes) so the consolidated CSS — only known after the blocks render —
 * can be placed into the `<head>`. A single disciplined ob_start with one
 * matching callback: no nesting, no third-party dependency, no per-view pointer.
 * Never runs in the editor's ServerSideRender REST route (that keeps inline).
 *
 * @return void
 */
function sgs_css_start_buffer(): void {
	if ( ! sgs_is_frontend_render() ) {
		return;
	}
	\ob_start( __NAMESPACE__ . '\\sgs_css_inject' );
}
\add_action( 'template_redirect', __NAMESPACE__ . '\\sgs_css_start_buffer', 0 );

/**
 * Output-buffer callback: place the consolidated CSS into the `<head>` (right
 * before `</head>`, so it follows the block style.css handles WP already printed
 * and per-instance overrides win by source order). In 'head' mode an inline
 * `<style>`; in 'file' mode a `<link>` to a cached content-hashed external file
 * (inline `<style>` fallback if the file cannot be written).
 *
 * Because the CSS is placed on EVERY render, the output is self-consistent even
 * under a full-page cache (the cached HTML always carries the matching
 * link/style, and its content-hashed file still exists) — so there is no pointer,
 * no cold/warm transition, and no cache-freeze (the failure LiteSpeed's page
 * cache caused the earlier generate-then-serve design). Invalidation is
 * automatic: changed CSS → new hash → new filename → the freshly-rendered HTML
 * links it; the epoch bump + LiteSpeed purge refresh any cached HTML.
 *
 * @param string $html Full buffered page HTML.
 * @return string
 */
function sgs_css_inject( string $html ): string {
	if ( empty( $GLOBALS['sgs_collected_css'] ) ) {
		return $html;
	}
	// Insertion order = document order (D303 residual-last per block). Do NOT sort.
	$css = \wp_strip_all_tags( \implode( '', $GLOBALS['sgs_collected_css'] ) );
	if ( '' === \trim( $css ) ) {
		return $html;
	}

	$markup = '';
	if ( 'file' === sgs_css_output_mode() && sgs_css_is_writable() ) {
		$url = sgs_css_write_file( 'sgs-' . sgs_css_epoch() . '-' . \md5( $css ), $css );
		if ( null !== $url ) {
			// phpcs:ignore WordPress.WP.EnqueuedResources.NonEnqueuedStylesheet -- injected into the already-printed <head> via the output buffer; wp_enqueue_style cannot place it here (the buffer runs after wp_head).
			$markup = '<link rel="stylesheet" id="sgs-blocks-collected-css" href="' . \esc_url( $url ) . '" media="all" />';
		}
	}
	if ( '' === $markup ) {
		// 'head' mode, or a file-mode write failure → self-contained inline fallback.
		$markup = '<style id="sgs-blocks-collected">' . $css . '</style>'; // CSS pre-sanitised at source + wp_strip_all_tags above.
	}

	$pos = \stripos( $html, '</head>' );
	if ( false === $pos ) {
		return $html . $markup;
	}
	return \substr( $html, 0, $pos ) . $markup . \substr( $html, $pos );
}

/**
 * The uploads sub-directory (path + url) for consolidated CSS files.
 *
 * @return array{path:string,url:string}
 */
function sgs_css_dir(): array {
	$up = \wp_upload_dir();
	return array(
		'path' => \trailingslashit( $up['basedir'] ) . 'sgs-css',
		'url'  => \trailingslashit( $up['baseurl'] ) . 'sgs-css',
	);
}

/**
 * Current global CSS epoch. Baked into every filename + pointer so a bump makes
 * every stored pointer stale by construction.
 *
 * @return int
 */
function sgs_css_epoch(): int {
	return (int) \get_option( 'sgs_css_epoch', 1 );
}

/**
 * Bump the epoch (invalidate all pointers), purge the LiteSpeed full-page cache,
 * and GC now-orphaned files.
 *
 * @return void
 */
function sgs_css_bump_epoch(): void {
	\update_option( 'sgs_css_epoch', sgs_css_epoch() + 1, false );
	if ( \has_action( 'litespeed_purge_all' ) ) {
		\do_action( 'litespeed_purge_all' );
	}
	sgs_css_gc();
}

/**
 * Save action: any content / template / template-part / global-styles / product
 * save bumps the epoch (all are CPTs, so a single save_post covers them all).
 *
 * @param int $post_id Saved post ID.
 * @return void
 */
function sgs_css_on_save( $post_id ): void {
	if ( \wp_is_post_autosave( $post_id ) || \wp_is_post_revision( $post_id ) ) {
		return;
	}
	sgs_css_bump_epoch();
}
\add_action( 'save_post', __NAMESPACE__ . '\\sgs_css_on_save' );

/**
 * Init: bump the epoch once after a plugin deploy (version + main-file mtime
 * signature change) — catches render-logic changes that fire no save_post.
 *
 * @return void
 */
function sgs_css_check_deploy(): void {
	$sig    = \SGS_BLOCKS_VERSION . '|' . (string) @\filemtime( \SGS_BLOCKS_PATH . 'sgs-blocks.php' ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- filemtime may warn on a race; the null path is handled.
	$stored = \get_option( 'sgs_css_plugin_sig' );
	if ( $stored === $sig ) {
		return;
	}
	\update_option( 'sgs_css_plugin_sig', $sig, false );
	if ( false !== $stored ) { // Not the first-ever install.
		sgs_css_bump_epoch();
	}
}
\add_action( 'init', __NAMESPACE__ . '\\sgs_css_check_deploy' );

/**
 * Whether the uploads CSS dir is writable (cached per request).
 *
 * @return bool
 */
function sgs_css_is_writable(): bool {
	static $writable = null;
	if ( null !== $writable ) {
		return $writable;
	}
	$dir      = sgs_css_dir()['path'];
	$writable = \wp_mkdir_p( $dir ) && \wp_is_writable( $dir );
	return $writable;
}

/**
 * Write the immutable-cache .htaccess once (content-hashed filenames are safe to
 * cache forever).
 *
 * @param string $dir CSS dir path.
 * @return void
 */
function sgs_css_write_htaccess( string $dir ): void {
	$ht = $dir . '/.htaccess';
	if ( \file_exists( $ht ) ) {
		return;
	}
	$rules  = "<IfModule mod_headers.c>\n";
	$rules .= "<FilesMatch \"\\.css$\">\n";
	$rules .= "Header set Cache-Control \"public, max-age=31536000, immutable\"\n";
	$rules .= "</FilesMatch>\n</IfModule>\n";
	@\file_put_contents( $ht, $rules ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents, WordPress.PHP.NoSilencedErrors.Discouraged -- one-time best-effort header rule; inline fallback covers a write failure.
}

/**
 * Atomically write the consolidated CSS to a content-hashed file (tmp + rename).
 *
 * @param string $name Epoch-and-hash basename (no extension).
 * @param string $css  Consolidated CSS.
 * @return string|null Public URL, or null on failure (caller stays inline).
 */
function sgs_css_write_file( string $name, string $css ): ?string {
	if ( ! sgs_css_is_writable() ) {
		return null;
	}
	$d = sgs_css_dir();
	sgs_css_write_htaccess( $d['path'] );
	$file = $d['path'] . '/' . $name . '.css';
	$url  = $d['url'] . '/' . $name . '.css';
	if ( \file_exists( $file ) ) {
		return $url;
	}
	$tmp = $file . '.' . \wp_generate_password( 8, false ) . '.tmp';
	// phpcs:disable WordPress.WP.AlternativeFunctions, WordPress.PHP.NoSilencedErrors.Discouraged -- atomic tmp+rename needs native fs ops; failure falls back to inline.
	if ( false === \file_put_contents( $tmp, $css ) ) {
		return null;
	}
	if ( ! @\rename( $tmp, $file ) ) {
		@\unlink( $tmp );
		return \file_exists( $file ) ? $url : null;
	}
	// phpcs:enable WordPress.WP.AlternativeFunctions, WordPress.PHP.NoSilencedErrors.Discouraged
	return $url;
}

/**
 * Delete consolidated CSS files that do not belong to the current epoch.
 *
 * @return void
 */
function sgs_css_gc(): void {
	$prefix = 'sgs-' . sgs_css_epoch() . '-';
	foreach ( (array) \glob( sgs_css_dir()['path'] . '/sgs-*.css' ) as $f ) {
		if ( 0 !== \strpos( \basename( (string) $f ), $prefix ) ) {
			@\unlink( $f ); // phpcs:ignore WordPress.WP.AlternativeFunctions.unlink_unlink, WordPress.PHP.NoSilencedErrors.Discouraged -- best-effort orphan GC.
		}
	}
}
