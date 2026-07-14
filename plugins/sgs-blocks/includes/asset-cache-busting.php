<?php
/**
 * Content-derived cache-busting for SGS block assets.
 *
 * THE PROBLEM (proven live on two client sites, D338, 2026-07-14)
 * ---------------------------------------------------------------
 * WordPress versions a block's style/script handle from its block.json
 * `version` field, so every SGS block asset is served at a URL like:
 *
 *     .../build/blocks/adaptive-nav/style-index.css?ver=0.1.0
 *
 * That version is deliberately frozen — the project forbids block version
 * bumps pre-production (D293/D270). The file's CONTENT changes on every build;
 * its URL never does. Hostinger fronts these sites with Cloudflare, which
 * caches the asset with `Cache-Control: public, max-age=604800` — SEVEN DAYS —
 * keyed on that never-changing URL.
 *
 * Consequences observed, not theorised:
 *  - Cloudflare held a 0-byte copy of adaptive-nav's stylesheet for a week. The
 *    `<link>` loaded, parsed to ZERO rules, and the <dialog> drawer fell back to
 *    UA styling — the "white drawer" that cost a full session and a rollback.
 *  - With the drawer unstyled, a latent `display:flex`-without-[open] bug stayed
 *    invisible. Clearing the CDN delivered the real CSS and broke BOTH sites at
 *    once — a fix and a landmine landing together.
 *  - A subsequent a11y fix (WCAG 1.4.3) could not be delivered at all: the file
 *    on disk was correct, the origin served it correctly, and Cloudflare still
 *    returned `Cf-Cache-Status: HIT` with the old bytes.
 *
 * Clearing the CDN by hand is not a fix: it is a step a human must remember on
 * every deploy, it does nothing for a returning visitor already holding the
 * poisoned copy for up to 7 days, and it silently reverts any CSS change that
 * ships without it.
 *
 * THE FIX
 * -------
 * Derive `?ver` from the file's modification time for SGS plugin assets only.
 * Content changes => URL changes => every cache (browser, Cloudflare, LiteSpeed)
 * misses and refetches. Self-enforcing: no human step, no deploy-order
 * discipline, nothing to forget.
 *
 * Explicitly NOT a block version bump — block.json `version` is untouched, so
 * D293/D270 hold. This only rewrites the query string WordPress appends when
 * enqueuing the asset.
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
