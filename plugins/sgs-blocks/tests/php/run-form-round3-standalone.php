<?php
/**
 * Standalone test: the form's step layout, step counter, required-mark and label colours, saved-notice typography,
 * step-button icon, buttons-row note and space-between alignment, plus the file field's native look. Each setting has
 * a negative control (unset prints nothing new) and a positive case. Runs the real render.php files through the QA
 * render harness in a child process.
 *
 * Run: php tests/php/run-form-round3-standalone.php
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

// --- Negative control: an untouched multi-step form prints none of the new markup or CSS.
$base = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'savedProgress' => true ), '', true );
foreach ( array( 'sgs-form--stepper-inline', 'sgs-form__step-counter', 'sgs-form__status-row', 'sgs-form__actions-note', 'sgs-form__button--has-icon', 'sgs-form__button-icon', 'stepCounterLabel' ) as $needle ) {
	check( "unset: no $needle in the HTML", false === strpos( $base['html'], $needle ) );
}
foreach ( array( 'sgs-form-field__required', 'sgs-form-field__label', 'sgs-form__step-counter', 'sgs-form__saved-notice', 'button-icon', 'has-icon', 'actions-note' ) as $needle ) {
	check( "unset: no $needle in the CSS", false === strpos( $base['css'], $needle ) );
}
check( 'unset: the saved notice sits alone, not in a row', 1 === preg_match( '/<p class="sgs-form__saved-notice">/', $base['html'] ) );

// --- stepLayout.
$inline = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'stepLayout' => 'inline' ), '', true );
check( 'stepLayout inline: root class', 1 === preg_match( '/class="[^"]*\bsgs-form--stepper-inline\b/', $inline['html'] ) );
$stacked = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'stepLayout' => 'stacked' ), '', true );
check( 'stepLayout stacked: no class', false === strpos( $stacked['html'], 'sgs-form--stepper-inline' ) );

// --- stepCounter.
$counter = render_block_case(
	'sgs/form',
	array(
		'formId'                     => 'f1',
		'stepCounter'                => true,
		'stepCounterLabel'           => 'Step %1$d of %2$d',
		'stepCounterColour'          => '#0A7EA8',
		'stepCounterFontSize'        => array( 'desktop' => 13 ),
		'stepCounterFontWeight'      => '700',
		'stepCounterTextTransform'   => 'uppercase',
		'stepCounterLetterSpacing'   => array( 'desktop' => 0.12 ),
		'savedProgress'              => true,
		'savedNoticeFontSize'        => array( 'desktop' => 15 ),
	),
	'',
	true
);
check( 'counter on: span with the Interactivity text binding and the first-step text', false !== strpos( $counter['html'], '<span class="sgs-form__step-counter" data-wp-text="state.stepCounterText">Step 1 of 2</span>' ) );
check( 'counter on: one row holds the counter then the saved notice', 1 === preg_match( '/<div class="sgs-form__status-row"><span class="sgs-form__step-counter"[^>]*>[^<]*<\/span><p class="sgs-form__saved-notice">.*?<\/p>\s*<\/div>/s', $counter['html'] ) );
check( 'counter on: the wording rides in the context', false !== strpos( $counter['html'], 'stepCounterLabel' ) );
check( 'counter on: colour rule', 1 === preg_match( '/' . $uid . ' \.sgs-form__step-counter\{color:#0A7EA8;\}/i', $counter['css'] ) );
check(
	'counter on: typography rules',
	false !== strpos( $counter['css'], '.sgs-form__step-counter{font-weight:700;text-transform:uppercase;}' )
	&& 1 === preg_match( '/' . $uid . ' \.sgs-form__step-counter\{font-size:13px;letter-spacing:0\.12em;\}/', $counter['css'] )
);
check( 'saved notice typography rule', 1 === preg_match( '/' . $uid . ' \.sgs-form__saved-notice\{[^}]*font-size:15px/', $counter['css'] ) );
$custom = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'stepCounter' => true, 'stepCounterLabel' => 'Page %1$d / %2$d' ), '', true );
check( 'counter wording is the author\'s', false !== strpos( $custom['html'], '>Page 1 / 2</span>' ) );
$single = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'stepCounter' => true ) );
check( 'counter on a single-step form prints nothing', false === strpos( $single['html'], 'sgs-form__step-counter' ) );

// --- requiredMarkColour and labelColour.
$colours = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'requiredMarkColour' => '#C8412B', 'labelColour' => 'ink' ) );
check( 'required mark colour rule', 1 === preg_match( '/' . $uid . ' \.sgs-form-field__required\{color:#C8412B;\}/i', $colours['css'] ) );
check( 'label colour rule resolves a slug to a var()', 1 === preg_match( '/' . $uid . ' \.sgs-form-field__label\{color:var\(--wp--preset--color--ink, currentColor\);\}/', $colours['css'] ) );
$brand = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'requiredMarkColour' => 'brand-blue' ) );
check( 'required mark slug becomes a var()', false !== strpos( $brand['css'], '.sgs-form-field__required{color:var(--wp--preset--color--brand-blue, currentColor);}' ) );

// --- navIcon.
$icon = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'navIcon' => 'arrow-right', 'navIconSize' => 20, 'navIconGap' => 12 ), '', true );
check( 'navIcon: submit prints the icon after the label', 1 === preg_match( '/sgs-form__button--submit[^"]*sgs-form__button--has-icon".*?>\s*Submit<span class="sgs-form__button-icon" aria-hidden="true">(?:<!--.*?-->)?<svg/s', $icon['html'] ) );
check( 'navIcon: next prints the icon after the label', 1 === preg_match( '/sgs-form__button--next sgs-form__button--has-icon".*?>\s*Next<span class="sgs-form__button-icon"/s', $icon['html'] ) );
check( 'navIcon: previous prints the icon before the label', 1 === preg_match( '/sgs-form__button--prev sgs-form__button--has-icon".*?>\s*<span class="sgs-form__button-icon" aria-hidden="true">(?:<!--.*?-->)?<svg.*?<\/svg><\/span>Previous/s', $icon['html'] ) );
check( 'navIcon: size and gap rules', false !== strpos( $icon['css'], '.sgs-form__button-icon{width:20px;height:20px;}' ) && false !== strpos( $icon['css'], '.sgs-form__button--has-icon{gap:12px;}' ) );
$unknown = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'navIcon' => 'no-such-icon' ), '', true );
check( 'navIcon: an unknown slug prints nothing', false === strpos( $unknown['html'], 'has-icon' ) && false === strpos( $unknown['css'], 'button-icon' ) );

// --- actionsNote and submitAlign space-between.
$note = render_block_case(
	'sgs/form',
	array( 'formId' => 'f1', 'actionsNote' => 'Takes about <b>5 minutes</b> · Your progress saves automatically', 'submitAlign' => 'space-between', 'helpTextFontSize' => array( 'desktop' => 14 ) ),
	'',
	true
);
check( 'note: first inside the actions row, hidden after step one', false !== strpos( $note['html'], '<div class="sgs-form__actions"><span class="sgs-form__actions-note" data-wp-bind--hidden="!state.isFirstStep">Takes about <b>5 minutes</b> · Your progress saves automatically</span>' ) );
check( 'note: space-between row', false !== strpos( $note['css'], '.sgs-form__actions{justify-content:space-between;}' ) );
check( 'note: shares the help-text typography', 1 === preg_match( '/\.sgs-form-field__help, \.sgs-form-[0-9a-f]{8} \.sgs-form-field__file-hint, \.sgs-form-[0-9a-f]{8} \.sgs-form__actions-note\{[^}]*font-size:14px/', $note['css'] ) );
$every = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'actionsNote' => 'Hello', 'actionsNoteFirstStepOnly' => false ), '', true );
check( 'note on every step: no hidden binding', false !== strpos( $every['html'], '<span class="sgs-form__actions-note">Hello</span>' ) );
$no_note = render_block_case( 'sgs/form', array( 'formId' => 'f1', 'helpTextFontSize' => array( 'desktop' => 14 ) ), '', true );
check( 'no note: help-text rule is unchanged', false === strpos( $no_note['css'], 'actions-note' ) );

// --- File field native look.
$dashed = render_block_case( 'sgs/form-field-file', array( 'fieldName' => 'cv', 'label' => 'CV' ) );
check( 'file default: drag-drop label, focus-source class, no native class', false !== strpos( $dashed['html'], 'sgs-form-field__file-label' ) && false !== strpos( $dashed['html'], 'sgs-focus-source' ) && false === strpos( $dashed['html'], '--native' ) && false === strpos( $dashed['html'], 'sgs-form-field__input' ) );
$native = render_block_case( 'sgs/form-field-file', array( 'fieldName' => 'cv', 'label' => 'CV', 'zoneStyle' => 'native' ) );
check( 'file native: zone class', false !== strpos( $native['html'], 'class="sgs-form-field__file-zone sgs-form-field__file-zone--native"' ) );
check( 'file native: input takes the field class and its own focus ring', false !== strpos( $native['html'], 'class="sgs-form-field__file-input sgs-form-field__input"' ) && false === strpos( $native['html'], 'sgs-focus-source' ) );
check( 'file native: no drag-drop label', false === strpos( $native['html'], 'sgs-form-field__file-label' ) && false === strpos( $native['html'], 'Drag a file here' ) );

// --- Form: the file-label colours also paint a native file input; other forms are unchanged.
$native_content = '<div class="sgs-form-field__file-zone sgs-form-field__file-zone--native"><input type="file" class="sgs-form-field__file-input sgs-form-field__input"></div>';
$file_attrs     = array( 'formId' => 'f1', 'fileLabelBorderColour' => '#0A7EA866', 'fileLabelBackgroundColour' => '#F4F9FB' );
$with_native    = render_block_case( 'sgs/form', $file_attrs, $native_content );
$without        = render_block_case( 'sgs/form', $file_attrs );
check( 'native file: border and background colours reach the input', 1 === preg_match( '/' . $uid . ' \.sgs-form-field__file-zone--native \.sgs-form-field__file-input\{border-color:#0A7EA866;\}/i', $with_native['css'] ) && 1 === preg_match( '/' . $uid . ' \.sgs-form-field__file-zone--native \.sgs-form-field__file-input\{background-color:#F4F9FB\}/i', $with_native['css'] ) );
check( 'no native file: the label selectors only', false === strpos( $without['css'], 'file-zone--native' ) && false !== strpos( $without['css'], '.sgs-form-field__file-label{' ) );

exit( $failed ? 1 : 0 );
