<?php
/**
 * Standalone test: gap colour (includes/helpers-gap-rule.php).
 *
 * Exercises the real helpers with plain PHP, no WordPress:
 *   1. a set colour paints the gaps as column/row rules, with the @supports
 *      fallback for browsers without gap decorations;
 *   2. per-device rule widths follow the gap's own tiers, split per axis;
 *   3. an empty colour paints nothing (the gaps stay transparent).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-gap-rule-standalone.php
 *
 * @package SGS\Blocks
 */

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

require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';
require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-breakpoints.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-css-safety.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-gap-rule.php';

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

$sel = '.sgs-container-abc>.sgs-container__inner';

// 1. The colour rule and its fallback.
$css = sgs_gap_rule_css( $sel, 'rgba(250,248,245,.16)' );
ok( false !== strpos( $css, $sel . '{column-rule-style:solid;row-rule-style:solid;column-rule-color:#FAF8F529;row-rule-color:#FAF8F529;}' ), 'a set colour paints solid column and row rules in that colour (rgba normalised to hex8)' );
ok( false !== strpos( $css, '@supports not (row-rule-style:solid){' . $sel . '{background-color:#FAF8F529;}}' ), 'browsers without gap decorations get the colour behind the tracks' );
ok( false === strpos( $css, 'style="' ), 'no inline style attribute (Spec 32)' );
$slug_css = sgs_gap_rule_css( $sel, 'primary' );
ok( false !== strpos( $slug_css, 'column-rule-color:var(--wp--preset--color--primary' ), 'a palette slug resolves to its preset variable' );

// 2. Per-axis widths.
ok( '1px' === sgs_gap_rule_width( '1px', 'row' ) && '1px' === sgs_gap_rule_width( '1px', 'column' ), 'one length is both axes' );
ok( '16px' === sgs_gap_rule_width( '16px 24px', 'row' ) && '24px' === sgs_gap_rule_width( '16px 24px', 'column' ), '"row column" splits per axis' );
ok( '8px' === sgs_gap_rule_width( '8', 'row' ), 'a bare number gets px' );
ok( 'var(--wp--preset--spacing--40)' === sgs_gap_rule_width( 'var(--wp--preset--spacing--40)', 'column' ), 'a function value is kept whole' );
$responsive = sgs_emit_responsive_css( $sel, sgs_gap_rule_props( array( 'desktop' => '1px', 'mobile' => '2px' ) ) );
ok( false !== strpos( $responsive, 'column-rule-width:1px' ) && false !== strpos( $responsive, 'row-rule-width:2px' ), 'rule widths follow the gap tiers' );

// 3. Empty colour paints nothing.
ok( '' === sgs_gap_rule_css( $sel, '' ) && '' === sgs_gap_rule_css( $sel, '   ' ), 'an empty colour emits nothing' );

// Negative control: a broken fallback selector is caught by the assertion above.
$broken = str_replace( '@supports not (row-rule-style:solid)', '@supports (row-rule-style:solid)', $css );
ok( false === strpos( $broken, '@supports not (row-rule-style:solid){' . $sel . '{background-color:#FAF8F529;}}' ), 'negative control: the fallback assertion fails on a mutated rule' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
