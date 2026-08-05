<?php
/**
 * Standalone render test for sgs/responsive-logo — ID-wins-URL-fallback resolution.
 *
 * phpcs:disable -- WPCS production rules do not apply to this CLI test harness.
 *
 * Bootstraps the REAL src/blocks/responsive-logo/render.php behind a minimal
 * WordPress stub set (same pattern as test-media-render.php) and proves the
 * 2026-08-05 attr-shape change actually renders, rather than merely existing in
 * source.
 *
 * WHAT IS BEING PROVED, AND WHY IT MATTERS
 *   1. ID-only  — unchanged behaviour; the attachment ID still resolves and wins.
 *   2. URL-only — THE NEW PATH. A cloned block has a `<img src>` from the draft
 *                 and no media-library item, so there is no ID to resolve. Before
 *                 this change render.php returned early and the block rendered
 *                 NOTHING for that case.
 *   3. Both set — the ID must WIN, mirroring media/render.php:467 ("imageId wins;
 *                 fall back to imageUrl"). Asserted explicitly because a
 *                 precedence inversion here is invisible: both values are real
 *                 URLs, so the block still renders a logo — just the wrong one,
 *                 and a stale one after a media replacement.
 *   4. Neither  — must still early-return rather than emit a broken <img src="">.
 *
 * Run from repo root:
 *   php plugins/sgs-blocks/scripts/tests/test-responsive-logo-url-fallback.php
 *
 * Exit 0 = all pass (GREEN). Exit 1 = failures (RED).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

// ---------------------------------------------------------------------------
// Minimal WordPress-function stubs.
// wp_get_attachment_url resolves ONLY id 4242 — so an unresolvable id behaves
// like a real deleted/absent attachment rather than silently succeeding.
// ---------------------------------------------------------------------------
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
}
if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $u ) { return (string) $u; }
}
if ( ! function_exists( 'esc_url_raw' ) ) {
	function esc_url_raw( $u ) { return (string) $u; }
}
if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
}
if ( ! function_exists( '__' ) ) {
	function __( $t, $d = 'default' ) { return $t; }
}
if ( ! function_exists( 'absint' ) ) {
	function absint( $v ) { return abs( (int) $v ); }
}
if ( ! function_exists( 'sanitize_text_field' ) ) {
	function sanitize_text_field( $t ) { return trim( (string) $t ); }
}
if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( $t ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $t ) ); }
}
if ( ! function_exists( 'sanitize_html_class' ) ) {
	function sanitize_html_class( $t ) { return preg_replace( '/[^A-Za-z0-9_\-]/', '', (string) $t ); }
}
if ( ! function_exists( 'wp_kses_post' ) ) {
	function wp_kses_post( $t ) { return (string) $t; }
}
if ( ! function_exists( 'wp_kses' ) ) {
	function wp_kses( $t, $a = array() ) { return (string) $t; }
}
if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $d ) { return json_encode( $d ); }
}
if ( ! function_exists( 'wp_unique_id' ) ) {
	function wp_unique_id( $p = '' ) { static $n = 0; return $p . ( ++$n ); }
}
if ( ! function_exists( 'get_bloginfo' ) ) {
	function get_bloginfo( $k = 'name' ) { return 'Acme Ltd'; }
}
if ( ! function_exists( 'home_url' ) ) {
	function home_url( $p = '/' ) { return 'https://example.test' . $p; }
}
if ( ! function_exists( 'get_theme_mod' ) ) {
	function get_theme_mod( $k, $d = false ) { return $d; }
}
if ( ! function_exists( 'wp_get_attachment_url' ) ) {
	function wp_get_attachment_url( $id ) {
		return 4242 === (int) $id ? 'https://cdn.example.test/from-attachment-id.png' : false;
	}
}
if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	function wp_strip_all_tags( $t, $b = false ) { return strip_tags( (string) $t ); }
}
if ( ! function_exists( 'esc_attr__' ) ) {
	function esc_attr__( $t, $d = 'default' ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
}
if ( ! function_exists( 'wp_parse_args' ) ) {
	function wp_parse_args( $a, $d = array() ) { return array_merge( $d, (array) $a ); }
}
if ( ! function_exists( 'wp_rand' ) ) {
	function wp_rand( $min = 0, $max = 0 ) { return $min; }
}
if ( ! function_exists( 'get_block_wrapper_attributes' ) ) {
	function get_block_wrapper_attributes( $extra = array() ) {
		$cls = isset( $extra['class'] ) ? $extra['class'] : '';
		return 'class="' . htmlspecialchars( (string) $cls, ENT_QUOTES, 'UTF-8' ) . '"';
	}
}

$render_path = dirname( __DIR__, 2 ) . '/src/blocks/responsive-logo/render.php';
if ( ! is_file( $render_path ) ) {
	fwrite( STDERR, "FAIL: render.php not found at {$render_path}\n" );
	exit( 1 );
}

/**
 * Render the block with the given attributes and capture the markup.
 */
function sgs_rl_render( array $attrs ): string {
	global $render_path;
	$attributes = $attrs;
	$block      = null;
	$content    = '';
	ob_start();
	include $render_path;
	return (string) ob_get_clean();
}

$failures = array();

// --- 1. ID only — unchanged behaviour, the ID resolves. --------------------
$out = sgs_rl_render( array( 'logoId' => 4242, 'alt' => 'Acme' ) );
if ( false === strpos( $out, 'from-attachment-id.png' ) ) {
	$failures[] = "ID-only: expected the attachment-resolved URL in the markup. Got:\n" . substr( $out, 0, 400 );
}

// --- 2. URL only — THE NEW PATH (a cloned block, no library item). ---------
$out = sgs_rl_render( array( 'logoUrl' => 'https://cdn.example.test/from-url-attr.png', 'alt' => 'Acme' ) );
if ( false === strpos( $out, 'from-url-attr.png' ) ) {
	$failures[] = "URL-only: the stored URL did NOT render. This is the exact case a clone "
		. "produces (draft <img src>, no attachment). Before 2026-08-05 render.php "
		. "early-returned here and emitted nothing. Got:\n" . substr( $out, 0, 400 );
}

// --- 3. Both set — the ID must WIN. ---------------------------------------
$out = sgs_rl_render( array(
	'logoId'  => 4242,
	'logoUrl' => 'https://cdn.example.test/from-url-attr.png',
	'alt'     => 'Acme',
) );
if ( false === strpos( $out, 'from-attachment-id.png' ) ) {
	$failures[] = 'Both-set: the attachment ID must win over the stored URL '
		. '(mirrors media/render.php:467). It did not.';
}
if ( false !== strpos( $out, 'from-url-attr.png' ) ) {
	$failures[] = 'Both-set: the URL fallback rendered even though a resolvable ID was '
		. 'present — precedence is inverted. This is invisible in normal use (both are '
		. 'real URLs, a logo still appears) but serves a STALE image after a media '
		. 'replacement, which is the whole reason the ID is authoritative.';
}

// --- 4. Neither — must early-return, never a broken <img src="">. ----------
$out = sgs_rl_render( array( 'alt' => 'Acme' ) );
if ( '' !== trim( $out ) ) {
	$failures[] = "No-source: expected an empty render. Got:\n" . substr( $out, 0, 400 );
}

// --- 5. Vacuity guard — the harness must be capable of failing. -----------
// If the render path emitted nothing for EVERY case, checks 1-3 would each be
// comparing against an empty string and 4 would pass trivially: a green run
// proving only that the file exists.
$probe = sgs_rl_render( array( 'logoId' => 4242, 'alt' => 'Acme' ) );
if ( '' === trim( $probe ) ) {
	$failures[] = 'VACUOUS: the block rendered nothing even with a resolvable ID, so every '
		. 'assertion above is checking an empty world. Fix the harness before reading any '
		. 'other result.';
}

if ( $failures ) {
	echo "RESPONSIVE-LOGO URL-FALLBACK: FAILED (" . count( $failures ) . " of 5 checks)\n";
	foreach ( $failures as $f ) {
		echo "  - {$f}\n";
	}
	exit( 1 );
}

echo "RESPONSIVE-LOGO URL-FALLBACK: PASSED — 5 checks green.\n";
echo "  ID-only resolves, URL-only renders (the clone path), ID wins when both are set,\n";
echo "  no-source early-returns, and the harness is proven non-vacuous.\n";
exit( 0 );
