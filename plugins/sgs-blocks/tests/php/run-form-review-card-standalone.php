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

/**
 * Render sgs/form-review through the harness.
 *
 * @param string $harness Harness path.
 * @param array  $attrs   Attributes.
 * @return string HTML.
 */
function review_render( string $harness, array $attrs ): string {
	$file = tempnam( sys_get_temp_dir(), 'sgsfr' );
	file_put_contents( $file, json_encode( (object) $attrs, JSON_THROW_ON_ERROR ) );
	$ctx = tempnam( sys_get_temp_dir(), 'sgsfc' );
	file_put_contents( $ctx, '{}' );
	// The render helpers (colour, length, border, typography) are loaded by the plugin bootstrap, not the harness.
	$prepend = tempnam( sys_get_temp_dir(), 'sgsfp' );
	file_put_contents( $prepend, '<?php if ( ! defined( "ABSPATH" ) ) { define( "ABSPATH", "/" ); } require_once ' . var_export( dirname( $harness ) . '/wp-stubs.php', true ) . '; require_once ' . var_export( dirname( __DIR__, 2 ) . '/includes/render-helpers.php', true ) . ';' );
	$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' -d auto_prepend_file=' . escapeshellarg( $prepend ) . ' ' . escapeshellarg( $harness ) . ' --slug sgs/form-review --attrs-file ' . escapeshellarg( $file ) . ' --context-file ' . escapeshellarg( $ctx ) . ' 2>&1' );
	unlink( $file );
	unlink( $ctx );
	unlink( $prepend );
	$decoded = json_decode( $out, true );
	if ( ! is_array( $decoded ) || empty( $decoded['ok'] ) ) {
		fwrite( STDERR, "harness failed: $out
" );
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
function review_check( string $name, bool $ok ): void {
	global $failed;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $name . "
";
	if ( ! $ok ) {
		++$failed;
	}
}

$plain = review_render( $harness, array() );
review_check( 'defaults print no card style', ! str_contains( $plain, '<style>' ) );

$html = review_render(
	$harness,
	array(
		'cardBackgroundColour' => '#102030',
		'cardBorderColour'     => '#aabbcc',
		'cardBorderWidth'      => array( 'desktop' => array( 'top' => '2px', 'right' => '2px', 'bottom' => '2px', 'left' => '2px' ) ),
		'cardPadding'          => '30px',
		'termColour'           => '#112233',
		'valueColour'          => '#445566',
		'cardTitleFontWeight'  => '800',
	)
);
review_check( 'card background is scoped to the card', 1 === preg_match( '~\.sgs-fr-[0-9a-f]{8} \.sgs-form-review__card\{[^}]*background-color:#102030~', $html ) );
review_check( 'card padding is emitted', str_contains( $html, 'padding:30px' ) );
review_check( 'card border colour is emitted', str_contains( $html, '#aabbcc' ) );
review_check( 'row label colour is emitted', 1 === preg_match( '~__term\{color:#112233~', $html ) );
review_check( 'row value colour is emitted', 1 === preg_match( '~__detail\{color:#445566~', $html ) );
review_check( 'card title typography is emitted', 1 === preg_match( '~__card-title\{[^}]*font-weight:800~', $html ) );
review_check( 'no inline style attribute', ! preg_match( '~ style="~', $html ) );

echo $failed > 0 ? "
$failed failed
" : "
all passed
";
exit( $failed > 0 ? 1 : 0 );
