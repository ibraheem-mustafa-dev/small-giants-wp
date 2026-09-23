<?php
/**
 * Standalone test: sgs/site-header `surfaceFadeEdge` (U-1 4d).
 *
 * Extracts the edge-fade section from the REAL render.php and runs it, so the shipped text is
 * what is tested. Run: php plugins/sgs-blocks/tests/php/run-header-fade-edge-standalone.php
 *
 * @package SGS\Blocks
 */

$render = file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/site-header/render.php' );
$start  = strpos( $render, '// Edge fade (`surfaceFadeEdge`)' );
$end    = strpos( $render, "if ( isset( \$attributes['backgroundColourGradient'] )", (int) $start );
if ( false === $start || false === $end ) {
	fwrite( STDERR, "FAIL could not find the edge-fade section in render.php\n" );
	exit( 1 );
}
$section = substr( $render, $start, $end - $start );

$pass = 0;
$fail = 0;
function ok( bool $cond, string $label ): void {
	global $pass, $fail;
	if ( $cond ) {
		++$pass;
		echo "PASS  {$label}\n";
	} else {
		++$fail;
		echo "FAIL  {$label}\n";
	}
}

/**
 * Run a copy of the section with the given attributes and return the CSS it appended.
 *
 * @param string $code       Section text.
 * @param array  $attributes Block attributes.
 * @return string
 */
function run_fade( string $code, array $attributes ): string {
	$css      = '';
	$root_sel = '.u1.sgs-site-header';
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- test harness runs the shipped render text.
	return $css;
}

ok( '' === run_fade( $section, array() ), 'unset emits nothing' );
ok( '' === run_fade( $section, array( 'surfaceFadeEdge' => 'none' ) ), 'none emits nothing' );
$bottom = run_fade( $section, array( 'surfaceFadeEdge' => 'bottom' ) );
ok( '.u1.sgs-site-header{-webkit-mask-image:linear-gradient(to top, transparent, #000);mask-image:linear-gradient(to top, transparent, #000);}' === $bottom, 'bottom fades the bottom edge (the fantasy reference, 0deg transparent to #000)' );
$top = run_fade( $section, array( 'surfaceFadeEdge' => 'top' ) );
ok( false !== strpos( $top, 'mask-image:linear-gradient(to bottom, transparent, #000)' ), 'top fades the top edge' );
ok( '' === run_fade( $section, array( 'surfaceFadeEdge' => 'x;}body{display:none' ) ), 'a hostile value emits nothing' );
ok( '' === run_fade( $section, array( 'surfaceFadeEdge' => array( 'bottom' ) ) ), 'a non-string value emits nothing' );
ok( false === strpos( $section, 'style="' ), 'no inline style attribute in the section' );

// Negative control: with the lookup bypassed, a hostile value IS emitted, so the refusal test can fail.
$bypass = str_replace( '$sh_fade_masks[ $sh_fade_edge ] . \';mask-image:\' . $sh_fade_masks[ $sh_fade_edge ]', '$sh_fade_edge . \';mask-image:\' . $sh_fade_edge', $section );
$bypass = str_replace( 'if ( isset( $sh_fade_masks[ $sh_fade_edge ] ) ) {', 'if ( \'none\' !== $sh_fade_edge ) {', $bypass );
ok( $bypass !== $section, 'negative control: the bypass was applied to the extracted text' );
ok( false !== strpos( run_fade( $bypass, array( 'surfaceFadeEdge' => 'x;}body{display:none' ) ), 'body{display:none' ), 'negative control: with the lookup bypassed, a hostile value IS emitted' );

echo "\n==== {$pass} passed, {$fail} failed ====\n";
exit( $fail > 0 ? 1 : 0 );
