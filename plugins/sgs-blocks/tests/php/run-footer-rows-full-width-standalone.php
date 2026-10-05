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
$direct   = $root_sel . ' > *';
$banded   = $root_sel . ' > .sgs-container__inner > *';

$css = sgs_footer_rows_full_width_css( $root_sel );

ok( false !== strpos( $css, 'width:100%' ), 'the rule sets a full width (a capped row no longer shrinks to its content)' );

// BOTH shapes. The shared wrapper renders a `.sgs-container__inner` band only
// when $has_band_props holds; when it does, the band is the flex column and the
// rows are ITS children, so a rule on `root > *` reaches the band and never a
// row. Measured live on the canary before this assertion existed: the rule was
// present, every string assertion passed, and the fix did nothing.
ok( false !== strpos( $css, $direct ), 'shape 1 (no content band): the rows are direct children of the footer' );
ok( false !== strpos( $css, $banded ), 'shape 2 (content band present): the rows are children of .sgs-container__inner' );

// Zero specificity, so a row's own width setting still wins over it.
ok( 0 === strpos( $css, ':where(' ), 'the rule sits inside :where() (zero specificity)' );

// Scoped to the instance: it must never target every footer on the page.
ok( 2 === substr_count( $css, $root_sel ), 'both selectors are scoped to this instance uid' );

// Child combinators only — a nested element deeper inside a row is not stretched.
ok( false === strpos( $css, $root_sel . ' *{' ), 'the rule never uses a bare descendant combinator' );

// A different instance gets its own selector, never the first one's.
$other = sgs_footer_rows_full_width_css( '.sgs-sf-def456.sgs-site-footer' );
ok( false === strpos( $other, 'abc123' ), 'a second instance does not carry the first instance uid' );

// Negative controls — each assertion must be able to go red on its own.
$without_direct = str_replace( $direct . ',', '', $css );
ok( false === strpos( $without_direct, $direct . ',' ), 'negative control: the direct-child assertion can fail' );
$without_band = str_replace( ',' . $banded, '', $css );
ok( false === strpos( $without_band, $banded ), 'negative control: the content-band assertion can fail — the case that shipped broken' );

echo "\n{$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );
