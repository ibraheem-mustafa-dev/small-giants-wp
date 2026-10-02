<?php
/**
 * Standalone runner for the header rows alignment CSS (D-1).
 *
 * Exercises includes/sgs-header-rows-align-css.php directly, with plain PHP,
 * no PHPUnit. The header outer is a column flex container, so its rows must
 * be given full width explicitly: a row with a width cap carries centring auto
 * margins, which in a flex column cancel the stretch and shrink the row to its
 * content. Exits non-zero on any failure.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-header-rows-align-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code): global accumulators and direct echo are
// the established run-*-standalone.php idiom.
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ) {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'absint' ) ) {
	function absint( $value ) {
		return abs( (int) $value );
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-breakpoints.php';
require_once dirname( __DIR__, 2 ) . '/includes/sgs-header-rows-align-css.php';

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

$root_sel = '.sgs-sh-abc123.sgs-site-header';
$width    = ':where(' . $root_sel . ' > *){width:100%;}';

// Default (rowsAlign untouched): the outer is a centred column flex container, and its rows are full width.
$css = sgs_header_rows_align_css( $root_sel, array() );
ok( false !== strpos( $css, 'display:flex;flex-direction:column;justify-content:center;' ), 'default: the header outer is a centred column flex container' );
ok( false !== strpos( $css, $width ), 'default: every row is full width (a capped row no longer shrinks to its content)' );

// The width rule is zero-specificity, so a row's own width setting wins over it.
ok( 0 === strpos( substr( $css, strpos( $css, $width ) ), ':where(' ), 'the row width rule sits inside :where() (zero specificity)' );

// Every alignment keeps the rows full width, stretch included.
foreach ( array( 'start', 'end', 'stretch' ) as $align ) {
	$css = sgs_header_rows_align_css( $root_sel, array( 'rowsAlign' => array( 'desktop' => $align ) ) );
	ok( false !== strpos( $css, $width ), "rowsAlign {$align}: rows stay full width" );
}

// Negative control: the same assertion fails against CSS without the rule.
$without = str_replace( $width, '', sgs_header_rows_align_css( $root_sel, array() ) );
ok( false === strpos( $without, $width ), 'negative control: the assertion can fail when the rule is missing' );

echo "\n{$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );
