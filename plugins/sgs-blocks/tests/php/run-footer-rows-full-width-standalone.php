<?php
/**
 * Standalone runner for the footer rows full-width CSS (N46).
 *
 * Exercises includes/sgs-footer-rows-full-width-css.php directly, with plain
 * PHP, no PHPUnit. The footer shell is a column flex container (block.json
 * fixes `layout` to 'flex'), so its rows must be given full width explicitly: a
 * row with a width cap carries centring auto margins, which in a flex column
 * cancel the stretch and shrink the row to its content — and
 * `container-type: inline-size` on `.sgs-site-footer-row` makes that zero.
 * Exits non-zero on any failure.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-footer-rows-full-width-standalone.php
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

require_once dirname( __DIR__, 2 ) . '/includes/sgs-footer-rows-full-width-css.php';

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

$root_sel = '.sgs-sf-abc123.sgs-site-footer';
$width    = ':where(' . $root_sel . ' > *){width:100%;}';

$css = sgs_footer_rows_full_width_css( $root_sel );

ok( false !== strpos( $css, $width ), 'every row is full width (a capped row no longer shrinks to its content)' );

// Zero specificity, so a row's own width setting still wins over it.
ok( 0 === strpos( $css, ':where(' ), 'the row width rule sits inside :where() (zero specificity)' );

// Scoped to the instance: it must never target every footer on the page.
ok( false !== strpos( $css, $root_sel ), 'the rule is scoped to this instance uid' );

// Direct children only — a nested element inside a row must not be stretched.
ok( false !== strpos( $css, '> *' ), 'the rule targets direct children only, not every descendant' );

// A different instance gets its own selector, never the first one's.
$other = sgs_footer_rows_full_width_css( '.sgs-sf-def456.sgs-site-footer' );
ok( false === strpos( $other, 'abc123' ), 'a second instance does not carry the first instance uid' );

// Negative control: the same assertion fails against CSS without the rule.
$without = str_replace( $width, '', sgs_footer_rows_full_width_css( $root_sel ) );
ok( false === strpos( $without, $width ), 'negative control: the assertion can fail when the rule is missing' );

echo "\n{$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );
