<?php
/**
 * Standalone test: the floated-label settings on sgs/form (labelFloatedColour, labelFloatedOffset). Unset prints
 * nothing (negative control); a colour prints on the focused state alone; an offset prints `top` on the floated state
 * (focused or filled); an unsafe length prints nothing.
 *
 * Run: php tests/php/run-form-floated-label-standalone.php
 * Exit 0 all pass, 1 any failure.
 */
$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
$failed  = 0;

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
 * Render a block through the harness.
 *
 * @param string $slug    Block slug.
 * @param array  $attrs   Attributes.
 * @param string $content Rendered InnerBlocks HTML.
 * @param bool   $steps   Give the block two sgs/form-step inner blocks (a multi-step form).
 * @return array{html: string, css: string}
 */
function render_block_case( string $slug, array $attrs, string $content = '', bool $steps = false ): array {
	global $harness, $stubs;
	$file  = tempnam( sys_get_temp_dir(), 'sgsat' );
	$inner = tempnam( sys_get_temp_dir(), 'sgsib' );
	file_put_contents( $file, json_encode( (object) $attrs ) );
	file_put_contents(
		$inner,
		json_encode(
			$steps
				? array(
					array( 'name' => 'sgs/form-step', 'attributes' => array( 'label' => 'About you' ), 'html' => '' ),
					array( 'name' => 'sgs/form-step', 'attributes' => array( 'label' => 'Review' ), 'html' => '' ),
				)
				: array()
		)
	);
	$cmd = escapeshellarg( PHP_BINARY ) . ' -d auto_prepend_file=' . escapeshellarg( $stubs ) . ' ' . escapeshellarg( $harness )
		. ' --slug ' . escapeshellarg( $slug ) . ' --attrs-file ' . escapeshellarg( $file )
		. ' --inner-blocks-file ' . escapeshellarg( $inner )
		. ( '' !== $content ? ' --content ' . escapeshellarg( $content ) : '' ) . ' 2>&1';
	$out = (string) shell_exec( $cmd );
	unlink( $file );
	unlink( $inner );
	$decoded = json_decode( $out, true );
	if ( ! is_array( $decoded ) || empty( $decoded['ok'] ) ) {
		fwrite( STDERR, "harness failed for $slug: $out\n" );
		exit( 1 );
	}
	return array(
		'html' => (string) $decoded['html'],
		'css'  => (string) $decoded['css'],
	);
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

$uid = '\.sgs-form-[0-9a-f]{8}';

$base = render_block_case( 'sgs/form', array( 'formId' => 'f1' ) );
check( 'unset: no floated colour or top rule', false === strpos( $base['css'], '--sgs-form-label-floated-top' ) && false === strpos( $base['css'], ':focus) .sgs-form-field__label{color' ) && false === strpos( $base['css'], '.sgs-form-field__input:focus) .sgs-form-field__label' ) );

$colour = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'labelFloatedColour' => '#0A7EA8' ) );
check( 'colour: prints on the focused state alone', 1 === preg_match( '/' . $uid . ' :is\([^{]*\):where\(:not\(\.sgs-form-field--static-label\)\):has\(\.sgs-form-field__input:focus\) \.sgs-form-field__label\{color:#0A7EA8;\}/i', $colour['css'] ) );
check( 'colour: no top rule', false === strpos( $colour['css'], '{top:' ) );

$offset = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'labelFloatedOffset' => '9px' ) );
check( 'offset: the form prints the floated top for every floating variant', 1 === preg_match( '/' . $uid . '\{--sgs-form-label-floated-top:9px;\}/', $offset['css'] ) );
check( 'offset: no colour rule', false === strpos( $offset['css'], '{color:' ) || false === strpos( $offset['css'], 'sgs-form-field__label{color:' ) );

$bad = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'labelFloatedOffset' => '9px;} body{display:none' ) );
check( 'offset: an unsafe length prints nothing', false === strpos( $bad['css'], 'display:none' ) && false === strpos( $bad['css'], '{top:' ) );

echo $failed ? "
$failed FAILED
" : "
all passed
";
exit( $failed ? 1 : 0 );
