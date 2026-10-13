<?php
/**
 * Standalone runner for the Floating UI reading-progress gradient option.
 *
 * Loads the real customiser, renderer and shared gradient sanitiser
 * (includes/helpers-tokens.php::sgs_css_gradient_value) behind a thin set of
 * WordPress stubs and proves:
 *   1. default (no gradient) output carries no gradient declaration and the
 *      scoped style block matches the pre-gradient output;
 *   2. a valid gradient prints into the scoped style, escaped;
 *   3. malicious values are rejected by the sanitiser and print nothing;
 *   4. the Customiser validate callback flags a rejected value.
 *
 * Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-floating-ui-rp-gradient-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
define( 'SGS_BLOCKS_VERSION', '0.0.0-test' );

$GLOBALS['opts'] = array();

function add_action(): void {}
function __( string $t, string $d = '' ): string { return $t; }
function esc_attr( $t ): string { return htmlspecialchars( (string) $t, ENT_QUOTES ); }
function esc_attr_e( string $t, string $d = '' ): void { echo htmlspecialchars( $t, ENT_QUOTES ); }
function absint( $v ): int { return abs( (int) $v ); }
function sanitize_hex_color( string $c ): ?string {
	return 1 === preg_match( '/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/', $c ) ? $c : null;
}
function plugins_url( string $p = '', string $q = '' ): string { return 'https://example.test/' . ltrim( $p, '/' ); }
function wp_enqueue_style(): void {}
function wp_enqueue_script(): void {}
function get_option( string $k, $d = false ) { return $GLOBALS['opts'][ $k ] ?? $d; }

class WP_Error {
	public array $codes = array();
	public function add( string $code, string $msg ): void { $this->codes[ $code ] = $msg; }
}

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-floating-ui-customiser.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-floating-ui-renderer.php';

use SGS\Blocks\Sgs_Floating_UI_Customiser as C;
use SGS\Blocks\Sgs_Floating_UI_Renderer as R;

$pass = 0;
$fail = 0;
function ok( bool $cond, string $label ): void {
	global $pass, $fail;
	if ( $cond ) {
		++$pass;
		echo "PASS  $label\n";
	} else {
		++$fail;
		echo "FAIL  $label\n";
	}
}

function render_html(): string {
	ob_start();
	R::render();
	return (string) ob_get_clean();
}

function style_block( string $html ): string {
	preg_match( '#<style>(.*?)</style>#s', $html, $m );
	return trim( (string) preg_replace( '/\s+/', ' ', $m[1] ?? '' ) );
}

$draft = 'linear-gradient(90deg,#EBDD78 0%,#E7D768 24%,#D8CA50 46%,#2EADE2 76%,#0A7EA8 100%)';

// -- 1. Default output, identical to the pre-gradient output ----------------
$GLOBALS['opts'] = array( C::OPT_RP_ENABLED => true );
$default_html    = render_html();
ok( ! str_contains( $default_html, 'rp-gradient' ), 'default: no --rp-gradient anywhere in the output' );
ok(
	'.sgs-floating-ui { --btt-bg: #0F7E80; --btt-icon: #FFFFFF; --btt-pos: right; --rp-colour: #0F7E80; --rp-height: 4px; }' === style_block( $default_html ),
	'default: the scoped style block is exactly the pre-gradient declarations'
);

// -- 2. Valid gradient prints, escaped, in the scoped style -----------------
$GLOBALS['opts'] = array(
	C::OPT_RP_ENABLED  => true,
	C::OPT_RP_GRADIENT => $draft,
);
$html = render_html();
ok( str_contains( style_block( $html ), '--rp-gradient: ' . $draft . ';' ), 'valid gradient (the draft one) prints into the scoped style' );
ok( str_contains( style_block( $html ), '--rp-colour: #0F7E80;' ), 'the flat colour is still printed (the CSS lets the gradient win)' );
ok( 1 === substr_count( $html, '<style>' ), 'still exactly one scoped style block' );
ok( ! preg_match( '/<[^>]+\sstyle="/', $html ), 'no inline style="" attribute on any element' );

$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/assets/floating-ui/floating-ui.css' );
ok( str_contains( $css, 'background-image: var(--rp-gradient, none);' ), 'stylesheet paints the bar from --rp-gradient, none when unset' );

// -- 3. Malicious values rejected --------------------------------------------
$bad = array(
	'breakout'        => 'linear-gradient(red,blue);}</style><script>alert(1)</script>',
	'closing-style'   => 'linear-gradient(90deg,#fff 0%,#000 100%)</style><script>x</script>',
	'url-javascript'  => 'linear-gradient(url(javascript:alert(1)),#000)',
	'url-image'       => 'linear-gradient(90deg,url(https://evil.test/a.png) 0%,#000 100%)',
	'declaration'     => 'linear-gradient(red,blue); background:url(x)',
	'import'          => '@import url(x)',
	'not-a-gradient'  => 'red',
	'expression'      => 'linear-gradient(expression(alert(1)),#000)',
);
foreach ( $bad as $name => $value ) {
	ok( '' === C::sanitise_gradient( $value ), "sanitiser rejects: $name" );
	$GLOBALS['opts'] = array(
		C::OPT_RP_ENABLED  => true,
		C::OPT_RP_GRADIENT => $value,
	);
	$out = render_html();
	ok( ! str_contains( $out, 'rp-gradient' ) && ! str_contains( $out, '<script' ) && ! str_contains( $out, 'javascript' ), "renderer prints nothing for: $name" );
	ok( style_block( $out ) === style_block( $default_html ), "renderer output equals the default for: $name" );
}

// -- 4. Customiser validation flags a rejected value --------------------------
$err = C::validate_gradient( new WP_Error(), $bad['url-javascript'] );
ok( isset( $err->codes['invalid_gradient'] ), 'validate_gradient reports a rejected non-empty value' );
$err = C::validate_gradient( new WP_Error(), $draft );
ok( array() === $err->codes, 'validate_gradient accepts the draft gradient' );
$err = C::validate_gradient( new WP_Error(), '' );
ok( array() === $err->codes, 'validate_gradient accepts an empty value (clears the gradient)' );
ok( $draft === C::sanitise_gradient( $draft ), 'sanitise_gradient passes the draft gradient through unchanged' );
ok( '' === C::sanitise_gradient( array( 'x' ) ), 'sanitise_gradient returns empty for a non-string' );

echo "\n$pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );
