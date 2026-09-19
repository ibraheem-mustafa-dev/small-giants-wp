<?php
/**
 * Content-derived cache-busting for SGS block assets.
 *
 * WHY A CONTENT-DERIVED ?ver
 * ---------------------------
 * WordPress versions a block's style/script handle from its block.json
 * `version` field, so every SGS block asset is served at a URL like:
 *
 *     .../build/blocks/hero/style-index.css?ver=0.1.0
 *
 * That version is deliberately frozen: block versions are not bumped
 * pre-production. The file's CONTENT changes on every build; its URL would
 * never change. Hostinger fronts these sites with Cloudflare, which caches the
 * asset with `Cache-Control: public, max-age=604800` — SEVEN DAYS — keyed on
 * that URL. A URL that never changes therefore lets the CDN, LiteSpeed and
 * every returning visitor's browser keep serving a stale (or empty) copy of the
 * stylesheet for up to a week, however correct the file on disk is.
 *
 * Clearing the CDN by hand is not a fix: it is a step a human must remember on
 * every deploy, and it does nothing for a browser already holding the stale
 * copy.
 *
 * WHAT THIS DOES
 * --------------
 * Derive `?ver` from the file's modification time (`filemtime()`) for SGS
 * plugin assets only. The file changes => the URL changes => every cache
 * (browser, Cloudflare, LiteSpeed) misses and refetches. Self-enforcing: no
 * human step, no deploy-order discipline.
 *
 * This is NOT a block version bump: block.json `version` is untouched. It only
 * rewrites the query string WordPress appends when enqueuing the asset.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Rewrite `?ver` to the asset's filemtime for SGS-plugin-owned assets.
 *
 * Scoped hard to SGS_BLOCKS_URL: a foreign plugin/theme asset passing through
 * this filter is returned byte-identical, so this can never perturb another
 * component's cache-busting strategy.
 *
 * @param string $src Full asset URL as WordPress built it.
 * @return string Asset URL with a content-derived ?ver, or $src unchanged.
 */
function sgs_filemtime_asset_version( $src ) {
	if ( ! is_string( $src ) || '' === $src ) {
		return $src;
	}

	$base = SGS_BLOCKS_URL;

	// Protocol-agnostic prefix match — the enqueued URL may be https while the
	// constant resolved to http (or vice versa) behind a proxy/CDN.
	$src_rel  = preg_replace( '#^https?://#', '', $src );
	$base_rel = preg_replace( '#^https?://#', '', $base );

	if ( 0 !== strpos( $src_rel, $base_rel ) ) {
		return $src; // Not ours — leave it exactly as-is.
	}

	// Map URL -> filesystem path, dropping any existing query string.
	$relative = substr( $src_rel, strlen( $base_rel ) );
	$relative = strtok( $relative, '?' );
	$path     = SGS_BLOCKS_PATH . $relative;

	// Never let a path escape the plugin directory (a malformed/encoded src
	// must not be able to stat an arbitrary file).
	$real      = realpath( $path );
	$real_base = realpath( SGS_BLOCKS_PATH );
	if ( false === $real || false === $real_base || 0 !== strpos( $real, $real_base ) ) {
		return $src;
	}

	$mtime = @filemtime( $real ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- a missing/unreadable asset must degrade to the original URL, never warn on the frontend.
	if ( ! $mtime ) {
		return $src;
	}

	// remove_query_arg first so we replace WP's ver rather than duplicating it.
	return add_query_arg( 'ver', (string) $mtime, remove_query_arg( 'ver', $src ) );
}

add_filter( 'style_loader_src', 'sgs_filemtime_asset_version', 20 );
add_filter( 'script_loader_src', 'sgs_filemtime_asset_version', 20 );
