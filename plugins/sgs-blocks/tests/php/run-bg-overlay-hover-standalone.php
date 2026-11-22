<?php
/**
 * Standalone runner: the background overlay's hover paint hangs off the block root's hover
 * (`includes/media/background-css.php::sgs_bg_overlay_css`, through `sgs_emit_state_colour_css`'s hover suffix).
 *
 * MUST FAIL ON THE OLD CODE: the hover rule was `.uid > .sgs-bg-overlay:hover`, and `assets/css/media-bg.css` gives
 * `.sgs-bg-overlay` `pointer-events:none`, so the overlay was never the hovered element and the hover paint never showed.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-bg-overlay-hover-standalone.php
 *
 * @package SGS\Blocks
 */

define( 'ABSPATH', __DIR__ );
$GLOBALS['sgs_stub_filters'] = array();
function add_filter( ...$args ) {
	return true;
}
function apply_filters( $tag, $value, ...$args ) {
	return $value;
}
function esc_attr( $s ) {
	return htmlspecialchars( (string) $s, ENT_QUOTES );
}
function sgs_bg_media_capability(): array {
	return array( 'overlay_class' => 'sgs-bg-overlay' );
}
$inc = dirname( __DIR__, 2 ) . '/includes/';
require_once $inc . 'class-sgs-breakpoints.php';
require_once $inc . 'helpers-hover-state.php';
require_once $inc . 'helpers-tokens.php';
require_once $inc . 'helpers-responsive.php';
require_once $inc . 'media/background-css.php';

$pass  = 0;
$fail  = 0;
$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
	$ok ? $pass++ : $fail++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
};

$decls = 'background-color:#000;';
$css   = sgs_bg_overlay_css( 'u1', $decls, array( 'backgroundOverlayColourHover' => '#ff0000' ) );
$check( false !== strpos( $css, '.u1 > .sgs-bg-overlay{' . $decls . '}' ), 'the resting paint stays on the overlay' );
$check( false !== strpos( $css, '.u1:hover > .sgs-bg-overlay{' ), "MUST FAIL ON OLD CODE: the hover paint hangs off the root's hover (got: $css)" );
$check( false === strpos( $css, '.sgs-bg-overlay:hover' ), 'MUST FAIL ON OLD CODE: no hover rule on the overlay itself, which takes no pointer events' );
$check( 1 === preg_match( '/background-color:#f00|background-color:#ff0000|#ff0000/i', $css ), 'the hover colour is painted' );

$none = sgs_bg_overlay_css( 'u1', $decls, array() );
$check( false === strpos( $none, ':hover' ), 'negative control: no hover setting prints no hover rule' );
$check( '' === sgs_bg_overlay_css( 'u1', '', array( 'backgroundOverlayColourHover' => '#ff0000' ) ), 'negative control: no overlay prints nothing' );

// The shared state emitter keeps its default: no suffix, the state on the selector itself.
$plain = sgs_emit_state_colour_css( '.x', array(), array( 'color:red' ) );
$check( false !== strpos( $plain, '.x:hover{color:red}' ) || false !== strpos( $plain, '.x:hover{color:red;}' ) || false !== strpos( $plain, '.x:hover' ), 'negative control: the emitter without a suffix still hovers the selector (got: ' . $plain . ')' );
$check( false === strpos( $plain, '>' ), 'negative control: no suffix adds no combinator' );

echo "RESULT $pass passed, $fail failed\n";
exit( $fail > 0 ? 1 : 0 );
