<?php
/**
 * Standalone test: separators (includes/helpers-separators*.php).
 *
 * Exercises the real helpers with plain PHP, no WordPress:
 *   1. the stored object is sanitised (style, per-device width, colour) and an axis
 *      with no width, or style `none`, draws nothing;
 *   2. what a block opts in to (`axes`, `edges`, `hover`, `sweep`) gates the result;
 *   3. a single row or column of items draws one centred line per gap, on the item's
 *      own pseudo-element, with edges, hover (own item and the item before) and sweep;
 *   4. a wrapping or auto-fit list gets native gap decorations plus the overlay
 *      stylesheet that only applies where decorations are unsupported;
 *   5. per-device widths and per-axis gaps become custom properties;
 *   6. negative controls: a mutated rule fails the assertion that guards it.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-separators-standalone.php
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
require_once dirname( __DIR__, 2 ) . '/includes/helpers-hover-state.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-separators-css.php';

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

function has( string $haystack, string $needle ): bool {
	return false !== strpos( $haystack, $needle );
}

$tiers = array( 'desktop' => '1px' );
$col   = array(
	'column' => array(
		'style'       => 'solid',
		'width'       => $tiers,
		'colour'      => 'primary',
		'colourHover' => 'accent',
	),
);
$caps  = array( 'hover' => true, 'sweep' => true, 'edges' => true );

// 1. Normalisation.
ok( ! sgs_separators_active( sgs_separators_normalise( array() ) ), 'an empty setting draws nothing' );
ok( ! sgs_separators_active( sgs_separators_normalise( array( 'column' => array( 'style' => 'solid' ) ) ) ), 'an axis with no width draws nothing' );
ok( ! sgs_separators_active( sgs_separators_normalise( array( 'column' => array( 'style' => 'none', 'width' => $tiers ) ) ) ), 'style none draws nothing' );
$n = sgs_separators_normalise( $col, $caps );
ok( null !== $n['column'] && null === $n['row'], 'only the axis with a width is active' );
ok( 'solid' === $n['column']['style'], 'a stored solid style is kept' );
ok( 'solid' === sgs_separators_style( '' ) && 'solid' === sgs_separators_style( 'wavy' ), 'an empty or unknown style paints solid' );
ok( has( $n['column']['colour'], 'var(--wp--preset--color--primary' ), 'a palette slug resolves to its preset variable' );
$no_colour = sgs_separators_normalise( array( 'column' => array( 'width' => $tiers ) ) );
ok( 'currentColor' === $no_colour['column']['colour'], 'no colour inherits the text colour' );
$bad_width = sgs_separators_normalise( array( 'column' => array( 'width' => array( 'desktop' => 'url(javascript:alert(1))' ) ) ) );
ok( ! sgs_separators_active( $bad_width ), 'an unsafe width is rejected, leaving nothing' );

// 2. Opt-in gating.
$only_row = sgs_separators_normalise( array_merge( $col, array( 'row' => $col['column'] ) ), array( 'axes' => array( 'row' ) ) );
ok( null === $only_row['column'] && null !== $only_row['row'], 'a block limited to the row axis ignores a stored column axis' );
ok( 'between' === sgs_separators_normalise( array_merge( $col, array( 'edges' => 'all' ) ), array() )['edges'], 'edges are ignored unless the block opts in' );
ok( 'all' === sgs_separators_normalise( array_merge( $col, array( 'edges' => 'all' ) ), array( 'edges' => true ) )['edges'], 'edges are kept when the block opts in' );
ok( 'swap' === sgs_separators_normalise( array_merge( $col, array( 'hoverTreatment' => 'sweep' ) ), array( 'hover' => true ) )['treatment'], 'sweep falls back to swap unless the block opts in to sweep' );
ok( 'none' === sgs_separators_normalise( $col, array() )['treatment'], 'no hover opt-in means no hover treatment' );

// 3. Line mode: items side by side (vertical lines on the column axis).
$list = array(
	'list'      => '.u',
	'layout'    => 'line',
	'item'      => '.u .bar > .item',
	'direction' => 'row',
	'gap_expr'  => array( 'column' => 'var(--gap, 8px)' ),
);
$css = sgs_separators_css( $col, $list, $caps );
ok( has( $css, '.u .bar > .item:not(:first-child)::before{content:"";position:absolute;pointer-events:none;top:0;bottom:0;inset-inline-start:calc((var(--sgs-sep-g-column,0px) + var(--sgs-sep-w-column)) / -2);border-inline-start:var(--sgs-sep-w-column) solid ' ), 'a row of items draws a centred vertical line on every item except the first' );
ok( has( $css, '--sgs-sep-g-column:var(--gap, 8px)' ) && has( $css, '--sgs-sep-w-column:1px' ), 'the gap and thickness reach the rule as custom properties' );
ok( ! has( $css, 'style="' ), 'no inline style attribute (Spec 32)' );
ok( has( $css, '.u .bar > .item:hover + .u .bar > .item::before' ) || has( $css, '.u .bar > .item:hover + .u .bar > .item' ), 'hovering the item BEFORE a line repaints it (adjacent-sibling reach)' );
ok( has( $css, 'border-inline-start-color:' ) && has( $css, SGS_HOVER_MEDIA . '{' . SGS_HOVER_NOT_TOUCH ), 'the hover colour swap is touch-guarded' );

$stacked = sgs_separators_css( array( 'row' => $col['column'] ), array_merge( $list, array( 'direction' => 'column', 'gap_expr' => array( 'row' => '12px' ) ) ), $caps );
ok( has( $stacked, 'inset-block-start:calc(' ) && has( $stacked, 'border-block-start:var(--sgs-sep-w-row)' ) && has( $stacked, 'inset-inline:0;' ), 'stacked items draw a horizontal line on the block-start edge' );

$edged_all = sgs_separators_css( array_merge( $col, array( 'edges' => 'all' ) ), $list, $caps );
ok( has( $edged_all, ':first-child::before{' ) && has( $edged_all, ':last-child::after{' ), 'edges "all" draw both outer lines' );
$edged_end = sgs_separators_css( array_merge( $col, array( 'edges' => 'end' ) ), $list, $caps );
ok( ! has( $edged_end, ':first-child::before{' ) && has( $edged_end, ':last-child::after{' ), 'edges "end" draw only the trailing outer line' );
ok( has( $edged_all, 'border-inline-end:' ), 'the trailing edge line sits on the inline-end edge' );

$heads = sgs_separators_css( $col, array_merge( $list, array( 'heads' => array( ' > .link', ' > .row > .summary' ) ) ), $caps );
ok( has( $heads, ':has( > .link:hover)::before' ) && has( $heads, ':has( > .row > .summary:focus-visible)' ), 'a row with named heads repaints from each head, one selector part per head' );

$sweep_col = $col;
$sweep_col['column']['colourHover'] = 'accent';
$sweep_css = sgs_separators_css( array_merge( $sweep_col, array( 'hoverTreatment' => 'sweep', 'sweepAngle' => 180 ) ), $list, $caps );
ok( has( $sweep_css, 'background-image:linear-gradient(' ) && has( $sweep_css, 'width:var(--sgs-sep-w-column);' ), 'a solid line with sweep draws a gradient band as a real box' );
$dashed = $sweep_col;
$dashed['column']['style'] = 'dashed';
$dashed_css = sgs_separators_css( array_merge( $dashed, array( 'hoverTreatment' => 'sweep' ) ), $list, $caps );
ok( ! has( $dashed_css, 'background-image:linear-gradient(' ) && has( $dashed_css, 'dashed' ), 'a dashed line cannot sweep, so it swaps colour' );

// 4. Flow mode.
$flow = sgs_separators_css(
	array(
		'row'    => $col['column'],
		'column' => $col['column'],
	),
	array( 'list' => '.g', 'layout' => 'flow', 'gap' => array( 'desktop' => '16px 24px' ) )
);
ok( has( $flow, '.g{column-rule:var(--sgs-sep-w-column) var(--sgs-sep-s-column) var(--sgs-sep-c-column);row-rule:var(--sgs-sep-w-row) var(--sgs-sep-s-row) var(--sgs-sep-c-row);rule-visibility-items:between;}' ), 'a flow list gets native gap decorations that skip empty cells' );
ok( has( $flow, '--sgs-sep-g-row:16px' ) && has( $flow, '--sgs-sep-g-column:24px' ), 'a "row column" gap splits per axis' );
ok( has( $flow, '@supports not (row-rule-style:solid){' ) && has( $flow, '.g>.sgs-sep-overlay>.sgs-sep-line--column{border-left:' ), 'the overlay is styled only where gap decorations are unsupported' );
ok( ! has( $flow, ':nth-child' ) && ! has( $flow, ':first-child' ), 'a flow list never selects items by position' );
$flow_one = sgs_separators_css( array( 'column' => $col['column'] ), array( 'list' => '.g', 'layout' => 'flow' ) );
ok( ! has( $flow_one, 'row-rule:' ), 'only the active axis gets a rule' );

// 5. Per-device widths.
$responsive = sgs_separators_css(
	array( 'column' => array( 'width' => array( 'desktop' => '2px', 'mobile' => '1px' ) ) ),
	array( 'list' => '.g', 'layout' => 'flow' )
);
ok( has( $responsive, '--sgs-sep-w-column:2px' ) && has( $responsive, '(max-width:767px)' ) && has( $responsive, '--sgs-sep-w-column:1px' ), 'thickness follows the device tiers' );

// 6. Root attributes.
$root = sgs_separators_root_attrs( '> .sgs-container__inner' );
ok( 'sgs-has-separators' === $root['class'] && has( $root['attr'], 'data-sgs-sep-list="&gt; .sgs-container__inner"' ), 'a flow list root carries the marker class and its list selector' );
ok( ! has( sgs_separators_root_attrs( '"><script>' )['attr'], '<' ), 'the list selector cannot break out of the attribute' );

// Negative controls: each guarded assertion fails on a mutated rule.
$mutated = str_replace( ':not(:first-child)::before', '::before', $css );
ok( ! has( $mutated, '.u .bar > .item:not(:first-child)::before{' ), 'negative control: a line on the first item too is caught' );
$mutated_flow = str_replace( 'rule-visibility-items:between;', '', $flow );
ok( ! has( $mutated_flow, 'rule-visibility-items:between;}' ), 'negative control: a flow list without the empty-cell guard is caught' );
ok( '' === sgs_separators_css( array(), $list, $caps ) && '' === sgs_separators_css( $col, array_merge( $list, array( 'list' => '' ) ), $caps ), 'negative control: nothing set, or no list selector, emits nothing' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
