<?php
/**
 * Standalone test: a form holding its own submit button (an sgs/button set as a submit button, at any depth) renders
 * no built-in submit button and no empty actions row; a form without one keeps the built-in button; a multi-step form
 * keeps its Previous and Next buttons either way (Spec 04, sgs/form). Runs the real render.php through the QA render
 * harness in a child process, and the helper directly.
 *
 * Run: php tests/php/run-form-own-submit-standalone.php
 * Exit 0 all pass, 1 any failure.
 */

$root    = dirname( __DIR__, 2 );
$harness = $root . '/scripts/qa/lib/render-css-harness.php';
$failed  = 0;

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', $root . '/' );
}
require_once $root . '/includes/helpers-form-own-submit.php';

$stubs = tempnam( sys_get_temp_dir(), 'sgsst' );
file_put_contents(
	$stubs,
	'<?php
if ( ! defined( "DAY_IN_SECONDS" ) ) { define( "DAY_IN_SECONDS", 86400 ); }
if ( ! function_exists( "set_transient" ) ) { function set_transient( $k, $v, $e = 0 ) { return true; } }
if ( ! function_exists( "wp_interactivity_state" ) ) { function wp_interactivity_state( $ns = "", $s = array() ) { return array(); } }
if ( ! function_exists( "rest_url" ) ) { function rest_url( $p = "" ) { return "https://example.test/wp-json/" . $p; } }
if ( ! function_exists( "wp_create_nonce" ) ) { function wp_create_nonce( $a = -1 ) { return "nonce"; } }
'
);
register_shutdown_function( static function () use ( $stubs ) { @unlink( $stubs ); } ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged

/**
 * Render sgs/form through the harness with the given inner blocks.
 *
 * @param array $attrs Form attributes.
 * @param array $inner Inner blocks, each { name, attributes, html }.
 * @return string The rendered HTML.
 */
function render_form_case( array $attrs, array $inner ): string {
	global $harness, $stubs;
	$attrs_file = tempnam( sys_get_temp_dir(), 'sgsat' );
	$inner_file = tempnam( sys_get_temp_dir(), 'sgsib' );
	file_put_contents( $attrs_file, json_encode( (object) $attrs ) );
	file_put_contents( $inner_file, json_encode( $inner ) );
	$cmd = escapeshellarg( PHP_BINARY ) . ' -d auto_prepend_file=' . escapeshellarg( $stubs ) . ' ' . escapeshellarg( $harness ) . ' --slug sgs/form --attrs-file ' . escapeshellarg( $attrs_file ) . ' --inner-blocks-file ' . escapeshellarg( $inner_file ) . ' --content ' . escapeshellarg( implode( '', array_column( $inner, 'html' ) ) ) . ' 2>&1';
	$out = (string) shell_exec( $cmd );
	unlink( $attrs_file );
	unlink( $inner_file );
	$decoded = json_decode( $out, true );
	if ( ! is_array( $decoded ) || empty( $decoded['ok'] ) ) {
		fwrite( STDERR, "harness failed: $out\n" );
		exit( 1 );
	}
	return (string) $decoded['html'];
}

/**
 * Record one assertion.
 *
 * @param string $label Case name.
 * @param bool   $ok    Result.
 */
function check( string $label, bool $ok ): void {
	global $failed;
	echo ( $ok ? 'ok   ' : 'FAIL ' ) . $label . "\n";
	if ( ! $ok ) {
		++$failed;
	}
}

$field  = array( 'name' => 'sgs/form-field-text', 'attributes' => array( 'label' => 'Name' ), 'html' => '<div class="sgs-form-field">Name</div>' );
$own    = array( 'name' => 'sgs/button', 'attributes' => array( 'label' => 'Send message', 'isSubmit' => true ), 'html' => '<button type="submit" class="sgs-button">Send message</button>' );
$plain  = array( 'name' => 'sgs/button', 'attributes' => array( 'label' => 'Call us' ), 'html' => '<a class="sgs-button" href="#">Call us</a>' );
$step   = static function ( string $label ): array {
	return array( 'name' => 'sgs/form-step', 'attributes' => array( 'label' => $label ), 'html' => '<div class="sgs-form-step"></div>' );
};
$builtin = 'sgs-form__button--submit';

// The helper, at any depth.
check( 'helper: a submit button at the top level', true === sgs_form_has_own_submit( array( array( 'blockName' => 'sgs/button', 'attrs' => array( 'isSubmit' => true ) ) ) ) );
check( 'helper: a submit button two containers down', true === sgs_form_has_own_submit( array( array( 'blockName' => 'sgs/container', 'attrs' => array(), 'innerBlocks' => array( array( 'blockName' => 'sgs/container', 'attrs' => array(), 'innerBlocks' => array( array( 'blockName' => 'sgs/button', 'attrs' => array( 'isSubmit' => true ) ) ) ) ) ) ) ) );
check( 'helper: a plain button is not a submit button', false === sgs_form_has_own_submit( array( array( 'blockName' => 'sgs/button', 'attrs' => array( 'isSubmit' => false ) ), array( 'blockName' => 'sgs/button', 'attrs' => array() ) ) ) );
check( 'helper: isSubmit on another block is not a submit button', false === sgs_form_has_own_submit( array( array( 'blockName' => 'sgs/heading', 'attrs' => array( 'isSubmit' => true ) ) ) ) );
check( 'helper: no blocks', false === sgs_form_has_own_submit( array() ) );

// The render.
$with = render_form_case( array( 'formId' => 'f1' ), array( $field, $own ) );
check( 'own submit: the draft button renders', false !== strpos( $with, 'Send message' ) );
check( 'own submit: no built-in submit button', false === strpos( $with, $builtin ) );
check( 'own submit: no empty actions row', false === strpos( $with, 'sgs-form__actions' ) );

$without = render_form_case( array( 'formId' => 'f1' ), array( $field, $plain ) );
check( 'no own submit (a plain button only): the built-in submit button renders', false !== strpos( $without, $builtin ) && false !== strpos( $without, 'sgs-form__actions' ) );

$steps_own = render_form_case( array( 'formId' => 'f1' ), array( $step( 'One' ), $step( 'Two' ), $own ) );
check( 'multi-step with own submit: Previous and Next stay, the built-in submit goes', false !== strpos( $steps_own, 'sgs-form__button--prev' ) && false !== strpos( $steps_own, 'sgs-form__button--next' ) && false === strpos( $steps_own, $builtin ) );

$steps_none = render_form_case( array( 'formId' => 'f1' ), array( $step( 'One' ), $step( 'Two' ) ) );
check( 'multi-step without own submit: the built-in submit renders', false !== strpos( $steps_none, $builtin ) );

exit( $failed ? 1 : 0 );
