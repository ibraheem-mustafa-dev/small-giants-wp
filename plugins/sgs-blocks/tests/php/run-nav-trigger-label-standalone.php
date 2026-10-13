<?php
/**
 * Standalone test: sgs/nav-bar-menu's trigger accessible name when the trigger label is a glyph.
 *
 * Runs the real label and aria-label sections of src/blocks/nav-bar-menu/render.php (extracted
 * between unique markers, the run-close-control-standalone.php recipe) for each trigger-mode mix.
 * A label made only of symbols (`☰`) is not a word, so it never names the button: the
 * button keeps "Open menu". sgs/nav-drawer's close button has the same rule, covered in
 * run-close-control-standalone.php.
 *
 * Negative control: a word label under every-tier text still omits aria-label (the visible word
 * is the name), so the check can tell the two apart.
 *
 *   php plugins/sgs-blocks/tests/php/run-nav-trigger-label-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable Squiz.PHP.Eval.Discouraged
// phpcs:disable WordPress.WP.AlternativeFunctions

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'esc_attr__' ) ) {
	function esc_attr__( $text, $domain = null ): string {
		return (string) $text;
	}
}
if ( ! function_exists( '__' ) ) {
	function __( $text, $domain = null ): string {
		return (string) $text;
	}
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-nav-accessible-label.php';

$pass = 0;
$fail = 0;

function ok( bool $cond, string $label ): void {
	global $pass, $fail;
	if ( $cond ) {
		++$pass;
		echo "PASS  $label\n";
	} else {
		++$fail;
		echo "FAIL  $label\n";
	}
}

function extract_between( string $source, string $start_marker, string $end_marker ): string {
	$start = strpos( $source, $start_marker );
	$end   = false === $start ? false : strpos( $source, $end_marker, $start );
	return ( false === $start || false === $end ) ? '' : substr( $source, $start, $end - $start );
}

$source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/nav-bar-menu/render.php' );
$label  = extract_between( $source, '$trigger_label = trim(', '$burger_icon =' );
$aria   = extract_between( $source, '// No tier shows a word', '/*' );
ok( '' !== $label && '' !== $aria, 'the trigger label and aria-label sections are found in the CURRENT nav-bar-menu/render.php' );
if ( '' === $label || '' === $aria ) {
	echo "\n==== $pass passed, $fail failed ====\n";
	exit( 1 );
}

/**
 * The trigger's aria-label segment for one label and one trigger-mode mix.
 *
 * @param string $code       The extracted sections.
 * @param string $raw_label  The stored triggerLabel.
 * @param bool   $every_text Every tier shows the label.
 * @param bool   $any_text   At least one tier shows the label.
 * @return string The aria-label attribute segment.
 */
function trigger_aria( string $code, string $raw_label, bool $every_text, bool $any_text ): string {
	$attributes                     = array( 'triggerLabel' => $raw_label );
	$sgs_nm_trigger_every_tier_text = $every_text;
	$sgs_nm_trigger_any_text        = $any_text;
	$burger_aria_attr               = null;
	eval( $code ); // CLI harness evaluating the extracted render.php sections; no untrusted input reaches it.
	return (string) $burger_aria_attr;
}

$code = $label . "\n" . $aria;
foreach ( array( '☰', '≡', ' ⋯ ' ) as $glyph ) {
	ok( ' aria-label="Open menu"' === trigger_aria( $code, $glyph, true, true ), 'every tier shows a glyph-only label (' . trim( $glyph ) . '): the button is named "Open menu"' );
	ok( ' aria-label="Open menu"' === trigger_aria( $code, $glyph, false, true ), 'some tiers show a glyph-only label (' . trim( $glyph ) . '): the button is named "Open menu", not the glyph' );
}
ok( '' === trigger_aria( $code, 'Menu', true, true ), 'NEGATIVE CONTROL: every tier shows a word label: no aria-label, the visible word is the name' );
ok( ' aria-label="Browse"' === trigger_aria( $code, 'Browse', false, true ), 'some tiers show a word label: aria-label is that word (Label in Name)' );
ok( ' aria-label="Open menu"' === trigger_aria( $code, 'Browse', false, false ), 'no tier shows the label: the generic name' );
ok( '' === trigger_aria( $code, '', true, true ), 'an empty label falls back to the word "Menu", which names the button' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
