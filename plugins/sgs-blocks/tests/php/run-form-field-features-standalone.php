<?php
/**
 * Standalone runner for the per-field form settings (Spec 04 FR-4-3 to FR-4-8).
 *
 * Renders the REAL src/blocks/form-field-<type>/render.php through the QA harness
 * (scripts/qa/lib/render-css-harness.php, a child PHP process per render) and checks the markup each
 * setting produces: present when set, absent when empty, escaped, and limited to its allowed values.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-form-field-features-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
$failed  = 0;
$passed  = 0;

/**
 * Render a block through the harness.
 *
 * @param string $harness Harness path.
 * @param string $slug    Block slug.
 * @param array  $attrs   Attributes.
 * @return string HTML.
 */
function features_render( string $harness, string $slug, array $attrs ): string {
	$file = tempnam( sys_get_temp_dir(), 'sgsff' );
	file_put_contents( $file, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
	$ctx = tempnam( sys_get_temp_dir(), 'sgsfc' );
	file_put_contents( $ctx, '{}' );
	// The consent block calls sgs_rich_text_kses(), which the plugin bootstrap (not the harness) loads.
	$prepend = tempnam( sys_get_temp_dir(), 'sgsfp' );
	file_put_contents( $prepend, '<?php if ( ! function_exists( "sgs_rich_text_kses" ) ) { function sgs_rich_text_kses( $html ): string { return (string) $html; } }' );
	$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' -d auto_prepend_file=' . escapeshellarg( $prepend ) . ' ' . escapeshellarg( $harness ) . ' --slug ' . escapeshellarg( $slug ) . ' --attrs-file ' . escapeshellarg( $file ) . ' --context-file ' . escapeshellarg( $ctx ) . ' 2>&1' );
	unlink( $file );
	unlink( $ctx );
	unlink( $prepend );
	$decoded = json_decode( $out, true );
	if ( ! is_array( $decoded ) || empty( $decoded['ok'] ) ) {
		fwrite( STDERR, "harness failed for $slug: $out\n" );
		exit( 2 );
	}
	return (string) $decoded['html'];
}

/**
 * Record one check.
 *
 * @param string $name Check name.
 * @param bool   $ok   Result.
 */
function features_check( string $name, bool $ok ): void {
	global $failed, $passed;
	if ( $ok ) {
		++$passed;
		echo "PASS $name\n";
		return;
	}
	++$failed;
	echo "FAIL $name\n";
}

$text = static fn( array $a ): string => features_render( $harness, 'sgs/form-field-text', array_merge( array( 'fieldName' => 'who', 'label' => 'Who' ), $a ) );

// FR-4-3 validation copy.
$html = $text( array( 'msgRequired' => 'Tell us who you are', 'msgInvalid' => 'Not a name', 'msgTooLong' => 'Too long' ) );
features_check( 'FR-4-3 required copy', str_contains( $html, 'data-sgs-msg-required="Tell us who you are"' ) );
features_check( 'FR-4-3 invalid copy', str_contains( $html, 'data-sgs-msg-invalid="Not a name"' ) );
features_check( 'FR-4-3 too-long copy', str_contains( $html, 'data-sgs-msg-toolong="Too long"' ) );
features_check( 'FR-4-3 no copy, no attributes', ! str_contains( $text( array() ), 'data-sgs-msg-' ) );
$html = $text( array( 'msgRequired' => '"><script>alert(1)</script>' ) );
features_check( 'FR-4-3 copy escaped', ! str_contains( $html, '<script' ) && str_contains( $html, 'data-sgs-msg-required="&quot;&gt;' ) );
foreach ( array( 'email', 'phone', 'number', 'select', 'radio', 'checkbox', 'consent' ) as $type ) {
	$html = features_render( $harness, "sgs/form-field-$type", array( 'fieldName' => 'f', 'label' => 'F', 'msgRequired' => 'Needed', 'options' => array( 'a' ) ) );
	features_check( "FR-4-3 required copy on $type", str_contains( $html, 'data-sgs-msg-required="Needed"' ) );
}

// FR-4-4 floating label toggle.
features_check( 'FR-4-4 floating by default', ! str_contains( $text( array() ), 'sgs-form-field--static-label' ) );
features_check( 'FR-4-4 floating true', ! str_contains( $text( array( 'floatingLabel' => true ) ), 'sgs-form-field--static-label' ) );
features_check( 'FR-4-4 floating off adds the static modifier', str_contains( $text( array( 'floatingLabel' => false ) ), 'sgs-form-field--static-label' ) );

// FR-4-5 maxlength and counter.
$ta   = static fn( array $a ): string => features_render( $harness, 'sgs/form-field-textarea', array_merge( array( 'fieldName' => 'msg', 'label' => 'Message' ), $a ) );
$html = $ta( array( 'maxLength' => 800 ) );
features_check( 'FR-4-5 maxlength on the textarea', 1 === preg_match( '#<textarea[^>]* maxlength="800"#', $html ) );
features_check( 'FR-4-5 counter span', str_contains( $html, 'class="sgs-form-field__counter" data-sgs-counter-for=' ) && str_contains( $html, '>0 / 800</span>' ) );
features_check( 'FR-4-5 counter points at the textarea', 1 === preg_match( '#<textarea[^>]* id="(sgs-field-msg)"#', $html ) && str_contains( $html, 'data-sgs-counter-for="sgs-field-msg"' ) );
features_check( 'FR-4-5 counter off', ! str_contains( $ta( array( 'maxLength' => 800, 'showCounter' => false ) ), 'sgs-form-field__counter' ) );
features_check( 'FR-4-5 no max, no counter, no maxlength', ! str_contains( $ta( array() ), 'sgs-form-field__counter' ) && ! str_contains( $ta( array() ), 'maxlength' ) );
features_check( 'FR-4-5 counter starts at the default length', str_contains( $ta( array( 'maxLength' => 800, 'defaultValue' => 'hello' ) ), '>5 / 800</span>' ) );

// FR-4-6 autocomplete.
features_check( 'FR-4-6 token', str_contains( $text( array( 'autocomplete' => 'given-name' ) ), ' autocomplete="given-name"' ) );
features_check( 'FR-4-6 custom value', str_contains( $text( array( 'autocomplete' => 'section-billing postal-code' ) ), ' autocomplete="section-billing postal-code"' ) );
features_check( 'FR-4-6 bad value dropped', ! str_contains( $text( array( 'autocomplete' => 'x" onfocus="alert(1)' ) ), 'autocomplete=' ) );
features_check( 'FR-4-6 empty prints nothing', ! str_contains( $text( array() ), 'autocomplete=' ) );

// FR-4-7 inputmode.
features_check( 'FR-4-7 numeric', str_contains( $text( array( 'inputmode' => 'numeric' ) ), ' inputmode="numeric"' ) );
features_check( 'FR-4-7 value outside the list prints nothing', ! str_contains( $text( array( 'inputmode' => 'banana' ) ), 'inputmode=' ) );
features_check( 'FR-4-7 empty prints nothing', ! str_contains( $text( array( 'inputmode' => '' ) ), 'inputmode=' ) );

// FR-4-8 default value.
features_check( 'FR-4-8 text default', str_contains( $text( array( 'defaultValue' => 'Bean' ) ), ' value="Bean"' ) );
features_check( 'FR-4-8 text default escaped', ! str_contains( $text( array( 'defaultValue' => '" autofocus x="' ) ), '" autofocus' ) );
features_check( 'FR-4-8 no default, no value', ! str_contains( $text( array() ), ' value=' ) );
features_check( 'FR-4-8 textarea default in content', str_contains( $ta( array( 'defaultValue' => "Tom & Jerry
line two" ) ), ">Tom &amp; Jerry
line two</textarea>" ) );

$sel = static fn( array $a ): string => features_render( $harness, 'sgs/form-field-select', array_merge( array( 'fieldName' => 'team', 'label' => 'Team', 'options' => array( array( 'value' => 'ops', 'label' => 'Operations' ), array( 'value' => 'hr', 'label' => 'People' ) ) ), $a ) );
features_check( 'FR-4-8 select default selects its option', 1 === preg_match( '#<option value="hr" selected>People#', $sel( array( 'defaultValue' => 'hr' ) ) ) );
features_check( 'FR-4-8 select default outside the options selects nothing', ! str_contains( $sel( array( 'defaultValue' => 'zzz' ) ), ' selected' ) );
features_check( 'FR-4-8 select without a default selects nothing', ! str_contains( $sel( array() ), ' selected' ) );

$con = static fn( array $a ): string => features_render( $harness, 'sgs/form-field-consent', array_merge( array( 'fieldName' => 'ok', 'consentText' => 'I agree' ), $a ) );
features_check( 'FR-4-8 consent ticked by default', 1 === preg_match( '#<input type="checkbox"[^>]* checked#', $con( array( 'defaultChecked' => true ) ) ) );
features_check( 'FR-4-8 consent unticked otherwise', ! str_contains( $con( array() ), ' checked' ) );
$cb = features_render( $harness, 'sgs/form-field-checkbox', array( 'fieldName' => 'p', 'label' => 'P', 'options' => array( array( 'value' => 'a', 'label' => 'A', 'checked' => true ), array( 'value' => 'b', 'label' => 'B' ) ) ) );
features_check( 'FR-4-8 checkbox option ticked by default', 1 === substr_count( $cb, ' checked' ) && 1 === preg_match( '#value="a"[^>]* checked#', $cb ) && 0 === preg_match( '#value="b"[^>]* checked#', $cb ) );

// valueFromParam.
features_check( 'param on text', str_contains( $text( array( 'valueFromParam' => 'role' ) ), 'data-sgs-value-param="role"' ) );
features_check( 'param name cleaned', str_contains( $text( array( 'valueFromParam' => 'ro le"<x>' ) ), 'data-sgs-value-param="rolex"' ) );
features_check( 'param absent when empty', ! str_contains( $text( array() ), 'data-sgs-value-param' ) );
features_check( 'param on select', str_contains( $sel( array( 'valueFromParam' => 'team' ) ), '<select class="sgs-form-field__input"' ) && str_contains( $sel( array( 'valueFromParam' => 'team' ) ), 'data-sgs-value-param="team"' ) );
$rad = features_render( $harness, 'sgs/form-field-radio', array( 'fieldName' => 'r', 'label' => 'R', 'valueFromParam' => 'pick', 'options' => array( 'a', 'b' ) ) );
features_check( 'param on the radio group', str_contains( $rad, '<fieldset class="sgs-form-field__group" data-sgs-value-param="pick">' ) );

// Each message and link-parameter attribute prints once on a select (it was appended twice).
$html = features_render( $harness, 'sgs/form-field-select', array( 'fieldName' => 'f', 'label' => 'F', 'options' => array( 'a' ), 'msgRequired' => 'Needed', 'valueFromParam' => 'team' ) );
features_check( 'select prints data-sgs-msg-required once', 1 === substr_count( $html, 'data-sgs-msg-required=' ) );
features_check( 'select prints data-sgs-value-param once', 1 === substr_count( $html, 'data-sgs-value-param=' ) );
foreach ( array( 'radio', 'checkbox', 'consent' ) as $type ) {
	$html = features_render( $harness, "sgs/form-field-$type", array( 'fieldName' => 'f', 'label' => 'F', 'options' => array( 'a' ), 'msgRequired' => 'Needed' ) );
	features_check( "$type prints data-sgs-msg-required once per control", substr_count( $html, 'data-sgs-msg-required=' ) === substr_count( $html, '<input' ) );
}
// The live counter is not an aria-live region: it would read the count after every keystroke.
$html = features_render( $harness, 'sgs/form-field-textarea', array( 'fieldName' => 'f', 'label' => 'F', 'maxLength' => 800 ) );
features_check( 'counter prints and is not aria-live', str_contains( $html, 'sgs-form-field__counter' ) && ! preg_match( '#sgs-form-field__counter"[^>]*aria-live#', $html ) );

echo "\n$passed passed, $failed failed\n";
exit( $failed > 0 ? 1 : 0 );
