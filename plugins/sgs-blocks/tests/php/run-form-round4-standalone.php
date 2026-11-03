<?php
/**
 * Standalone test: the round-4 form settings. The step name beside the counter, the progress track, the stepper
 * colours, the per-device note and step-name hiding and the counter row's wrap and gap on sgs/form, and the character
 * counter's placement, size and colour on sgs/form-field-textarea. Each setting has a negative control (unset prints
 * nothing new) and a positive case. Runs the real render.php files through the QA render harness in a child process.
 *
 * Run: php tests/php/run-form-round4-standalone.php
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
$ta  = '\.sgs-ta-[0-9a-f]{8}';

// --- Negative control: an untouched multi-step form with the counter on prints none of the new markup or CSS.
$base = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'stepCounter' => true, 'savedProgress' => true, 'actionsNote' => 'Hi' ), '', true );
foreach ( array( 'step-counter-name', 'stepNames', 'stepCounterNameLabel' ) as $needle ) {
	check( "unset: no $needle in the HTML", false === strpos( $base['html'], $needle ) );
}
foreach ( array( 'step-counter-name', 'border-radius:999px', 'progress-bar{height', 'progress-step:not', 'progress-step--active .sgs-form__progress-step-label', 'status-row', 'actions-note{display' ) as $needle ) {
	check( "unset: no $needle in the CSS", false === strpos( $base['css'], $needle ) );
}
check( 'unset: the counter keeps its single span', false !== strpos( $base['html'], '<span class="sgs-form__step-counter" data-wp-text="state.stepCounterText">Step 1 of 2</span>' ) );

// --- Step name beside the counter.
$named = render_block_case(
	'sgs/form',
	array( 'formId' => 'f1', 'stepCounter' => true, 'stepCounterNameSuffix' => ' · %3$s', 'stepCounterNameHidden' => array( 'desktop' => true, 'mobile' => false ) ),
	'',
	true
);
check( 'name: counter and name travel in one span', false !== strpos( $named['html'], '<span class="sgs-form__step-counter"><span data-wp-text="state.stepCounterText">Step 1 of 2</span><span class="sgs-form__step-counter-name" data-wp-text="state.stepCounterNameText"> · About you</span></span>' ) );
check( 'name: wording and names ride in the context', false !== strpos( $named['html'], 'stepCounterNameLabel' ) && false !== strpos( $named['html'], 'stepNames' ) && false !== strpos( $named['html'], 'About you' ) );
check( 'name: hidden on desktop, shown again on mobile', 1 === preg_match( '/' . $uid . ' \.sgs-form__step-counter-name\{display:none;\}/', $named['css'] ) && 1 === preg_match( '/@media[^{]*\{' . $uid . ' \.sgs-form__step-counter-name\{display:revert;\}\}/', $named['css'] ) );
$no_ph = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'stepCounter' => true, 'stepCounterNameSuffix' => ' · name' ), '', true );
check( 'name: a suffix without %3$s prints nothing', false === strpos( $no_ph['html'], 'step-counter-name' ) );

// --- Progress track.
$track = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'progressTrackColour' => '#EEF2F5', 'progressTrackHeight' => array( 'desktop' => 6 ) ), '', true );
check( 'track: colour and pill clip', 1 === preg_match( '/' . $uid . ' \.sgs-form__progress\{background-color:#EEF2F5;border-radius:999px;overflow:hidden;\}/i', $track['css'] ) );
check( 'track: height and a fill that follows it', 1 === preg_match( '/' . $uid . ' \.sgs-form__progress\{height:6px;\}/', $track['css'] ) && false !== strpos( $track['css'], '.sgs-form__progress-bar{height:100%;}' ) );
$slug = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'progressTrackColour' => 'surface' ), '', true );
check( 'track: a slug becomes a var(), no height rule without a height', false !== strpos( $slug['css'], 'background-color:var(--wp--preset--color--surface' ) && false === strpos( $slug['css'], 'height' ) );

// --- Stepper colours.
$steps = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'stepLabelColourActive' => '#2C3E50', 'stepLabelColour' => '#8793A0', 'stepNumberInactiveBackground' => '#FFFFFF' ), '', true );
check( 'stepper: active label colour', 1 === preg_match( '/' . $uid . ' \.sgs-form__progress-step--active \.sgs-form__progress-step-label\{color:#2C3E50;\}/i', $steps['css'] ) );
check( 'stepper: inactive label colour', 1 === preg_match( '/' . $uid . ' \.sgs-form__progress-step:not\(\.sgs-form__progress-step--active\) \.sgs-form__progress-step-label\{color:#8793A0;\}/i', $steps['css'] ) );
check( 'stepper: inactive number background', 1 === preg_match( '/' . $uid . ' \.sgs-form__progress-step:not\(\.sgs-form__progress-step--active\):not\(\.sgs-form__progress-step--completed\) \.sgs-form__progress-step-number\{background-color:#FFFFFF;\}/i', $steps['css'] ) );

// --- Note hidden per device.
$hide = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'actionsNote' => 'Hi', 'actionsNoteHidden' => array( 'desktop' => false, 'mobile' => true ) ), '', true );
check( 'note: shown on desktop and tablet, hidden on mobile', 1 === preg_match( '/' . $uid . ' \.sgs-form__actions-note\{display:revert;\}/', $hide['css'] ) && 1 === preg_match( '/@media[^{]*\{' . $uid . ' \.sgs-form__actions-note\{display:none;\}\}/', $hide['css'] ) );

// --- Counter row wrap and gap.
$row = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'stepCounter' => true, 'statusRowWrap' => 'wrap', 'statusRowGap' => array( 'desktop' => 12 ) ), '', true );
check( 'row: wrap', 1 === preg_match( '/' . $uid . ' \.sgs-form__status-row\{flex-wrap:wrap;\}/', $row['css'] ) );
check( 'row: gap', 1 === preg_match( '/' . $uid . ' \.sgs-form__status-row\{row-gap:12px;\}/', $row['css'] ) );

// --- Textarea counter.
$plain = render_block_case( 'sgs/form-field-textarea', array( 'fieldName' => 'msg', 'label' => 'Message', 'maxLength' => 800 ) );
check( 'textarea unset: counter follows the box, no wrapper, no style', false !== strpos( $plain['html'], '</textarea><span class="sgs-form-field__counter"' ) && false === strpos( $plain['html'], 'sgs-form-field__control' ) && false === strpos( $plain['html'], 'counter-inside' ) && '' === $plain['css'] );
$below = render_block_case( 'sgs/form-field-textarea', array( 'fieldName' => 'msg', 'label' => 'Message', 'maxLength' => 800, 'counterPlacement' => 'below' ) );
check( 'textarea below: same as unset', false === strpos( $below['html'], 'sgs-form-field__control' ) );
$inside = render_block_case(
	'sgs/form-field-textarea',
	array( 'fieldName' => 'msg', 'label' => 'Message', 'maxLength' => 800, 'counterPlacement' => 'inside', 'counterFontSize' => array( 'desktop' => 14 ), 'counterColour' => '#8793A0' )
);
check( 'textarea inside: wrapper holds box and counter', false !== strpos( $inside['html'], '<div class="sgs-form-field__control"><textarea' ) && 1 === preg_match( '#</textarea><span class="sgs-form-field__counter"[^>]*>0 / 800</span></div>#', $inside['html'] ) );
check( 'textarea inside: modifier and uid class on the field', 1 === preg_match( '/class="[^"]*sgs-form-field--counter-inside[^"]*"/', $inside['html'] ) && 1 === preg_match( '/class="[^"]*\bsgs-ta-[0-9a-f]{8}\b/', $inside['html'] ) );
check( 'textarea inside: colour and size rules', 1 === preg_match( '/' . $ta . ' \.sgs-form-field__counter\{color:#8793A0;\}/i', $inside['css'] ) && 1 === preg_match( '/' . $ta . ' \.sgs-form-field__counter\{font-size:14px;\}/', $inside['css'] ) );
$no_max = render_block_case( 'sgs/form-field-textarea', array( 'fieldName' => 'msg', 'counterPlacement' => 'inside', 'counterColour' => '#8793A0' ) );
check( 'textarea without a maximum: no counter, no wrapper, no rule', false === strpos( $no_max['html'], 'sgs-form-field__control' ) && '' === $no_max['css'] );

exit( $failed ? 1 : 0 );
