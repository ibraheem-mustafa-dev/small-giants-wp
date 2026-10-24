<?php
/**
 * Standalone runner for `sgsFocusRests` ("Keyboard focus keeps the resting look").
 *
 *   php plugins/sgs-blocks/tests/php/run-focus-rests-standalone.php
 *
 * Asserts: (1) with the flag off `sgs_hover_state_rules()` returns the guarded hover rule and the focus rule (the bytes
 * it printed before the setting); on, the hover rule only; (2) the render stack: a nested block without the setting
 * gets both rules again and the parent's flag returns after the child closes; a core block never takes the flag;
 * (3) a real sgs/button with a hover shadow rendered with `sgsFocusRests` true prints no `:focus-visible` hover rule in
 * its per-instance CSS and wears `sgs-focus-rests`, and with it off prints the rule and no class; (4) the motion
 * renderer stamps `data-sgs-focus-rests` on the marked elements of a block with the setting and on none without it,
 * and `assets/css/motion.css` leaves that stamp out of every focus arm of the hover-state trigger.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-focus-rests.php';

use SGS\Blocks\Motion\Sgs_Motion_Renderer;
use SGS\Blocks\Sgs_Focus_Rests;

$failures = 0;
$checks   = 0;
$check    = static function ( bool $ok, string $label ) use ( &$failures, &$checks ): void {
	++$checks;
	if ( ! $ok ) {
		++$failures;
		echo "FAIL: $label\n";
	}
};
$has = static function ( string $haystack, string $needle ): bool {
	return false !== strpos( $haystack, $needle );
};

// 1. sgs_hover_state_rules().
Sgs_Focus_Rests::reset();
$guard   = '@media (hover: hover) and (pointer: fine){:where(:root:not(.sgs-touch-input)) .x:hover{color:red}}';
$focus   = '.x:focus-visible{color:red}';
$flag_off = sgs_hover_state_rules( '.x', 'color:red' );
$check( $guard . $focus === $flag_off, '1. flag off: the hover rule then the focus rule, byte for byte: ' . $flag_off );
Sgs_Focus_Rests::open_frame( array( 'blockName' => 'sgs/button', 'attrs' => array( 'sgsFocusRests' => true ) ) );
$flag_on = sgs_hover_state_rules( '.x', 'color:red' );
$check( $guard === $flag_on, '1. flag on: the guarded hover rule only: ' . $flag_on );
$check( ! $has( sgs_hover_state_rules( '.x', 'color:red', ':focus-within', '::after' ), ':focus-within' ), '1. flag on: no :focus-within twin either' );

// 2. The stack.
Sgs_Focus_Rests::open_frame( array( 'blockName' => 'sgs/icon', 'attrs' => array() ) );
$check( $guard . $focus === sgs_hover_state_rules( '.x', 'color:red' ), '2. a nested block without the setting gets both rules again' );
Sgs_Focus_Rests::open_frame( array( 'blockName' => 'core/group', 'attrs' => array( 'sgsFocusRests' => true ) ) );
$check( $guard . $focus === sgs_hover_state_rules( '.x', 'color:red' ), '2. a core block never takes the flag' );
Sgs_Focus_Rests::close_frame( '<div></div>' );
Sgs_Focus_Rests::close_frame( '<div></div>' );
$check( $guard === sgs_hover_state_rules( '.x', 'color:red' ), '2. the parent\'s flag returns after the child closes' );
$closed = Sgs_Focus_Rests::close_frame( '<a class="a">x</a>' );
$check( $guard . $focus === sgs_hover_state_rules( '.x', 'color:red' ), '2. the flag is off once the outermost block closes' );
$check( $has( (string) $closed, 'sgs-focus-rests' ), '2. a closing block with the setting wears sgs-focus-rests: ' . $closed );

// 3. A real block through the real render.php.
function focus_rests_render( array $attrs ): array {
	$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
	$file    = tempnam( sys_get_temp_dir(), 'sgsfr' );
	file_put_contents( $file, json_encode( (object) $attrs ) );
	$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' --slug sgs/button --attrs-file ' . escapeshellarg( $file ) . ' 2>&1' );
	unlink( $file );
	$decoded = json_decode( $out, true );
	if ( ! is_array( $decoded ) || empty( $decoded['ok'] ) ) {
		echo 'FAIL: harness did not render sgs/button: ' . substr( $out, 0, 300 ) . "\n";
		exit( 1 );
	}
	return array( (string) $decoded['html'], (string) $decoded['css'] );
}
$button = array(
	'boxShadow'            => '0 4px 14px -6px',
	'boxShadowColour'      => '#0a7ea880',
	'boxShadowColourHover' => '#0a7ea8cc',
);
list( $html_off, $css_off ) = focus_rests_render( $button );
list( $html_on, $css_on )   = focus_rests_render( $button + array( 'sgsFocusRests' => true ) );
$check( 1 === preg_match( '/\.sgs-button:focus-visible\{box-shadow:/', $css_off ), '3. control: without the setting the button prints its :focus-visible hover shadow' );
$check( 1 === preg_match( '/:hover\{box-shadow:0px 4px 14px -6px #0a7ea8cc/', $css_on ), '3. with the setting the hover shadow still prints on :hover' );
$check( ! $has( $css_on, ':focus-visible{' ), '3. with the setting the per-instance CSS has no :focus-visible hover rule: ' . $css_on );
$check( $has( $html_on, 'sgs-focus-rests' ) && ! $has( $html_off, 'sgs-focus-rests' ), '3. the root wears sgs-focus-rests only with the setting' );

// 4. Motion: the stamp and the trigger CSS.
$render_motion = static function ( array $attrs ): string {
	Sgs_Motion_Renderer::reset();
	$GLOBALS['sgs_collected_css'] = array();
	$GLOBALS['sgs_test_is_admin'] = false;
	$GLOBALS['sgs_test_in_loop']  = false;
	$GLOBALS['sgs_test_actions']  = array();
	return sgs_test_render_motion_block(
		array(
			'blockName' => 'sgs/hero',
			'attrs'     => $attrs + array( 'sgsMotion' => array( 'v' => 1, 'elements' => array( 'root' => array( 'hover' => array( 'state' => array( 'values' => array( 'translateY' => -4 ) ) ) ) ) ) ),
		),
		'<div class="wp-block-sgs-hero">Hi</div>'
	);
};
$motion_on  = $render_motion( array( 'sgsFocusRests' => true ) );
$motion_off = $render_motion( array() );
$check( $has( $motion_off, 'data-sgs-mh="self"' ), '4. control: the hover state marks its element: ' . $motion_off );
$check( ! $has( $motion_off, 'data-sgs-focus-rests' ), '4. without the setting no element carries data-sgs-focus-rests' );
$check( $has( $motion_on, 'data-sgs-mh="self"' ) && $has( $motion_on, 'data-sgs-focus-rests' ), '4. with the setting the hover element carries data-sgs-focus-rests: ' . $motion_on );
$motion_css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/assets/css/motion.css' );
$focus_arms = array();
preg_match_all( '/^\[[^\n{]*:focus-(?:visible|within)[^\n{]*\{/m', $motion_css, $focus_arms );
$check( 4 === count( $focus_arms[0] ), '4. motion.css has four focus arms: ' . count( $focus_arms[0] ) );
foreach ( $focus_arms[0] as $arm ) {
	$check( $has( $arm, ':not([data-sgs-focus-rests])' ), '4. the focus arm leaves the stamp out: ' . $arm );
}

echo $failures ? "\n$failures of $checks checks FAILED\n" : "OK: all $checks checks passed\n";
exit( $failures ? 1 : 0 );
