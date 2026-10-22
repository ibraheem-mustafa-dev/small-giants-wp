<?php
/**
 * Standalone test: the form's saved-progress notice (Spec 04 FR-4-9) and the review block's intro and Edit settings
 * (FR-4-11) reach the rendered markup. Runs the real render.php files through the QA render harness in a child process.
 *
 * Run: php tests/php/run-form-runtime-render-standalone.php
 * Exit 0 all pass, 1 any failure.
 */

$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
$failed  = 0;

// The harness stubs the common WordPress functions; sgs/form also needs these (loaded before the harness runs).
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
 * @param string $slug  Block slug.
 * @param array  $attrs Attributes.
 * @return array{html: string, css: string}
 */
function render_block_case( string $slug, array $attrs ): array {
	global $harness, $stubs;
	$file = tempnam( sys_get_temp_dir(), 'sgsat' );
	file_put_contents( $file, json_encode( (object) $attrs ) );
	$cmd = escapeshellarg( PHP_BINARY ) . ' -d auto_prepend_file=' . escapeshellarg( $stubs ) . ' ' . escapeshellarg( $harness ) . ' --slug ' . escapeshellarg( $slug ) . ' --attrs-file ' . escapeshellarg( $file ) . ' 2>&1';
	$out = (string) shell_exec( $cmd );
	unlink( $file );
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

// --- sgs/form: saved-progress notice.
$off = render_block_case( 'sgs/form', array( 'formId' => 'f1' ) );
check( 'off: no notice', false === strpos( $off['html'], 'sgs-form__saved-notice' ) );
check( 'off: wrapper says false', false !== strpos( $off['html'], 'data-saved-progress="false"' ) );

$on = render_block_case(
	'sgs/form',
	array(
		'formId'                  => 'f1',
		'savedProgress'           => true,
		'savedProgressLabel'      => 'Saves <b>as</b> you go',
		'savedProgressSavedLabel' => 'Progress "kept"',
		'savedProgressDotColour'  => '#6EC07A',
	)
);
check( 'on: notice printed', false !== strpos( $on['html'], 'class="sgs-form__saved-notice"' ) );
check( 'on: wrapper says true', false !== strpos( $on['html'], 'data-saved-progress="true"' ) );
check( 'on: label escaped', false !== strpos( $on['html'], 'Saves &lt;b&gt;as&lt;/b&gt; you go' ) && false === strpos( $on['html'], '<b>as</b>' ) );
check( 'on: saved label in data attribute, escaped', false !== strpos( $on['html'], 'data-saved-label="Progress &quot;kept&quot;"' ) );
check( 'on: dot colour is a scoped rule', 1 === preg_match( '/\.sgs-form-[0-9a-f]{8} \.sgs-form__saved-dot\{background-color:#6EC07A;\}/i', $on['css'] ) );
check( 'on: no inline style on the notice', 1 !== preg_match( '/saved-(notice|dot|text)[^>]*style=/', $on['html'] ) );

$default = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'savedProgress' => true ) );
check( 'on, no custom wording: uses the defaults only when the attribute is empty', false !== strpos( render_block_case( 'sgs/form', array( 'formId' => 'f1', 'savedProgress' => true, 'savedProgressLabel' => '' ) )['html'], '>Saves as you go<' ) );
check( 'on, no colour: no dot rule', false === strpos( $default['css'], 'sgs-form__saved-dot' ) );

// --- sgs/form-review: intro and Edit settings.
$review = render_block_case( 'sgs/form-review', array() );
check( 'review default intro', false !== strpos( $review['html'], 'Please check your details below before submitting.' ) );
check( 'review default: edit on, label Edit', false !== strpos( $review['html'], 'data-show-edit="true"' ) && false !== strpos( $review['html'], 'data-edit-label="Edit"' ) );
check( 'review mounts the cards container', false !== strpos( $review['html'], 'class="sgs-form-review__cards"' ) );

$custom = render_block_case(
	'sgs/form-review',
	array(
		'intro'         => 'Make sure <i>everything</i> looks right.',
		'showEditLinks' => false,
		'editLabel'     => 'Change',
	)
);
check( 'review custom intro, escaped', false !== strpos( $custom['html'], 'Make sure &lt;i&gt;everything&lt;/i&gt; looks right.' ) );
check( 'review edit off', false !== strpos( $custom['html'], 'data-show-edit="false"' ) );
check( 'review custom edit label', false !== strpos( $custom['html'], 'data-edit-label="Change"' ) );

$empty = render_block_case( 'sgs/form-review', array( 'intro' => '' ) );
check( 'review empty intro prints no intro line', false === strpos( $empty['html'], 'sgs-form-review__intro' ) );

exit( $failed ? 1 : 0 );
