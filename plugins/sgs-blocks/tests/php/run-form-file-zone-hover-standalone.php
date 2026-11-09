<?php
/**
 * Standalone test: the upload-zone hover on sgs/form. The file input covers its label, so the label's own :hover never
 * fires; the label hover colours print on the zone's :hover (the native zone, which has no label, keeps its own rule).
 *
 * Run: php tests/php/run-form-file-zone-hover-standalone.php
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
$zone = ' \.sgs-form-field__file-zone:not\(\.sgs-form-field__file-zone--native\):hover \.sgs-form-field__file-label';

$set = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'fileLabelBorderColourHover' => '#112233', 'fileLabelBackgroundColourHover' => '#445566' ) );
check( 'border hover keys on the zone', 1 === preg_match( '/' . $uid . $zone . '[^{]*\{[^}]*#112233/', $set['css'] ) );
check( 'fill hover keys on the zone', 1 === preg_match( '/' . $uid . $zone . '[^{]*\{[^}]*#445566/', $set['css'] ) );
check( 'no hover rule on the label alone', 1 !== preg_match( '/' . $uid . ' \.sgs-form-field__file-label:hover/', $set['css'] ) );

$unset = render_block_case( 'sgs/form', array( 'formId' => 'f1' ) );
check( 'unset prints no zone hover rule', false === strpos( $unset['css'], 'file-zone:not(.sgs-form-field__file-zone--native):hover' ) );

echo $failed ? "
$failed FAILED
" : "
all passed
";
exit( $failed ? 1 : 0 );
