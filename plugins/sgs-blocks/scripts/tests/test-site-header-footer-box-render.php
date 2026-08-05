<?php
/**
 * Standalone render test — sgs/site-header + sgs/site-footer box-object
 * padding/margin tablet/mobile migration (2026-08-05).
 *
 * phpcs:disable -- WPCS production rules do not apply to this CLI test harness.
 *
 * Bootstraps the REAL src render.php for both blocks (which pulls in the real
 * class-sgs-container-wrapper.php + render-helpers.php chain) behind a minimal
 * WordPress-function stub set, then asserts the emitted <style> carries the
 * correct @media(max-width:1023px) / @media(max-width:767px) declarations for
 * the new paddingTablet/paddingMobile/marginTablet/marginMobile OBJECT attrs.
 *
 * This proves the controls actually WORK on a real render path (block.json ->
 * render.php -> SGS_Container_Wrapper::render()) — not just that the code
 * exists.
 *
 * Run from repo root:
 *   php plugins/sgs-blocks/scripts/tests/test-site-header-footer-box-render.php
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
// Minimal WordPress-function stubs (only what the section-KIND wrapper path
// touches for site-header / site-footer — padding/margin/colour/border).
// ---------------------------------------------------------------------------
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
}
if ( ! function_exists( 'esc_attr__' ) ) {
	function esc_attr__( $t, $d = 'default' ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
}
if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $u ) { return (string) $u; }
}
if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $t ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
}
if ( ! function_exists( 'esc_html__' ) ) {
	function esc_html__( $t, $d = 'default' ) { return htmlspecialchars( (string) $t, ENT_QUOTES, 'UTF-8' ); }
}
if ( ! function_exists( '__' ) ) {
	function __( $t, $d = 'default' ) { return $t; }
}
if ( ! function_exists( '_e' ) ) {
	function _e( $t, $d = 'default' ) { echo $t; }
}
if ( ! function_exists( 'absint' ) ) {
	function absint( $v ) { return abs( (int) $v ); }
}
if ( ! function_exists( 'sanitize_text_field' ) ) {
	function sanitize_text_field( $t ) { return trim( (string) $t ); }
}
if ( ! function_exists( 'sanitize_html_class' ) ) {
	function sanitize_html_class( $t ) { return preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $t ); }
}
if ( ! function_exists( 'tag_escape' ) ) {
	function tag_escape( $t ) { return preg_replace( '/[^a-zA-Z0-9_-]/', '', (string) $t ); }
}
if ( ! function_exists( 'wp_kses_post' ) ) {
	function wp_kses_post( $t ) { return (string) $t; }
}
if ( ! function_exists( 'wp_kses' ) ) {
	function wp_kses( $t, $a = array() ) { return (string) $t; }
}
if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	function wp_strip_all_tags( $t ) { return strip_tags( (string) $t ); }
}
if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $d, $opts = 0 ) { return json_encode( $d, $opts ); }
}
if ( ! function_exists( 'get_block_wrapper_attributes' ) ) {
	function get_block_wrapper_attributes( $extra = array() ) {
		$parts   = array();
		$base_cl = 'wp-block-sgs-site-header';
		$cls     = $base_cl . ( ! empty( $extra['class'] ) ? ' ' . $extra['class'] : '' );
		$parts[] = 'class="' . $cls . '"';
		foreach ( $extra as $key => $val ) {
			if ( in_array( $key, array( 'class', 'style' ), true ) ) {
				continue;
			}
			$parts[] = $key . '="' . esc_attr( $val ) . '"';
		}
		if ( ! empty( $extra['style'] ) ) {
			$parts[] = 'style="' . $extra['style'] . '"';
		}
		return implode( ' ', $parts );
	}
}
if ( ! function_exists( 'wp_interactivity_data_wp_context' ) ) {
	function wp_interactivity_data_wp_context( $ctx, $ns = '' ) { return ''; }
}

/**
 * Minimal functional re-implementation of wp_style_engine_get_styles() — only
 * the (spacing.padding/margin, color, border) shapes this render path uses.
 * Mirrors WP core's block-supports style-engine output format closely enough
 * to prove the scoped-CSS assembly path actually runs and emits real CSS.
 */
if ( ! function_exists( 'wp_style_engine_get_styles' ) ) {
	function wp_style_engine_get_styles( $styles, $options = array() ) {
		$selector = $options['selector'] ?? '';
		$decls    = array();

		if ( ! empty( $styles['spacing']['padding'] ) && is_array( $styles['spacing']['padding'] ) ) {
			foreach ( $styles['spacing']['padding'] as $side => $val ) {
				if ( '' !== $val ) {
					$decls[] = "padding-{$side}:{$val}";
				}
			}
		}
		if ( ! empty( $styles['spacing']['margin'] ) && is_array( $styles['spacing']['margin'] ) ) {
			foreach ( $styles['spacing']['margin'] as $side => $val ) {
				if ( '' !== $val ) {
					$decls[] = "margin-{$side}:{$val}";
				}
			}
		}
		if ( ! empty( $styles['color']['text'] ) ) {
			$decls[] = 'color:' . $styles['color']['text'];
		}
		if ( ! empty( $styles['color']['background'] ) ) {
			$decls[] = 'background-color:' . $styles['color']['background'];
		}
		if ( ! empty( $styles['border']['width'] ) ) {
			$decls[] = 'border-width:' . $styles['border']['width'];
		}

		if ( empty( $decls ) ) {
			return array( 'css' => '', 'declarations' => array() );
		}

		$css = $selector . '{' . implode( ';', $decls ) . ';}';
		return array( 'css' => $css, 'declarations' => $decls );
	}
}

// ---------------------------------------------------------------------------
// Render helper — invoke a block's real render.php in isolation.
// ---------------------------------------------------------------------------
function sgs_test_render( string $render_php, array $attributes ): string {
	$content = '';
	$block   = new class {
		public $parsed_block = array( 'attrs' => array() );
	};
	ob_start();
	require $render_php;
	return ob_get_clean();
}

$repo_root = dirname( __DIR__, 2 );

// ---------------------------------------------------------------------------
// site-header — asymmetric tablet + mobile padding/margin object attrs.
// ---------------------------------------------------------------------------
$header_attrs = array(
	'paddingTablet' => array( 'top' => '24px', 'right' => '18px', 'bottom' => '24px', 'left' => '18px' ),
	'paddingMobile' => array( 'top' => '12px', 'right' => '8px', 'bottom' => '12px', 'left' => '8px' ),
	'marginTablet'  => array( 'top' => '4px', 'right' => '0px', 'bottom' => '4px', 'left' => '0px' ),
	'marginMobile'  => array( 'top' => '2px', 'right' => '0px', 'bottom' => '2px', 'left' => '0px' ),
);
$header_html = sgs_test_render( $repo_root . '/src/blocks/site-header/render.php', $header_attrs );

$footer_attrs = array(
	'paddingTablet' => array( 'top' => '32px', 'right' => '20px', 'bottom' => '32px', 'left' => '20px' ),
	'paddingMobile' => array( 'top' => '16px', 'right' => '10px', 'bottom' => '16px', 'left' => '10px' ),
	'marginTablet'  => array( 'top' => '6px', 'right' => '0px', 'bottom' => '6px', 'left' => '0px' ),
	'marginMobile'  => array( 'top' => '3px', 'right' => '0px', 'bottom' => '3px', 'left' => '0px' ),
);
$footer_html = sgs_test_render( $repo_root . '/src/blocks/site-footer/render.php', $footer_attrs );

// ---------------------------------------------------------------------------
// Assertions.
// ---------------------------------------------------------------------------
$checks = array(
	'header: @media (max-width:1023px) present'   => ( false !== strpos( $header_html, '@media (max-width:1023px)' ) ),
	'header: tablet padding-top:24px present'      => ( false !== strpos( $header_html, 'padding-top:24px' ) ),
	'header: tablet padding-right:18px present'    => ( false !== strpos( $header_html, 'padding-right:18px' ) ),
	'header: @media (max-width:767px) present'    => ( false !== strpos( $header_html, '@media (max-width:767px)' ) ),
	'header: mobile padding-top:12px present'      => ( false !== strpos( $header_html, 'padding-top:12px' ) ),
	'header: mobile margin-top:2px present'        => ( false !== strpos( $header_html, 'margin-top:2px' ) ),
	'header: tablet margin-top:4px present'        => ( false !== strpos( $header_html, 'margin-top:4px' ) ),
	'header: zero inline style= on root'           => ( false === strpos( $header_html, ' style="' ) ),
	'footer: @media (max-width:1023px) present'   => ( false !== strpos( $footer_html, '@media (max-width:1023px)' ) ),
	'footer: tablet padding-top:32px present'      => ( false !== strpos( $footer_html, 'padding-top:32px' ) ),
	'footer: @media (max-width:767px) present'    => ( false !== strpos( $footer_html, '@media (max-width:767px)' ) ),
	'footer: mobile padding-top:16px present'      => ( false !== strpos( $footer_html, 'padding-top:16px' ) ),
	'footer: mobile margin-top:3px present'        => ( false !== strpos( $footer_html, 'margin-top:3px' ) ),
	'footer: zero inline style= on root'           => ( false === strpos( $footer_html, ' style="' ) ),
);

$fail = 0;
echo "---- site-header rendered <style> tag(s) ----\n";
if ( preg_match_all( '/<style[^>]*>(.*?)<\/style>/s', $header_html, $m ) ) {
	foreach ( $m[1] as $i => $block ) {
		echo "[style #{$i}] {$block}\n";
	}
} else {
	echo "(no <style> tag found)\n";
}
echo "---- site-footer rendered <style> tag(s) ----\n";
if ( preg_match_all( '/<style[^>]*>(.*?)<\/style>/s', $footer_html, $m ) ) {
	foreach ( $m[1] as $i => $block ) {
		echo "[style #{$i}] {$block}\n";
	}
} else {
	echo "(no <style> tag found)\n";
}
echo "-------------------------\n";
foreach ( $checks as $label => $ok ) {
	echo ( $ok ? '[PASS] ' : '[FAIL] ' ) . $label . "\n";
	if ( ! $ok ) {
		$fail++;
	}
}
echo "\n" . ( 0 === $fail ? 'ALL PASS' : $fail . ' FAILURE(S)' ) . "\n";
exit( 0 === $fail ? 0 : 1 );
