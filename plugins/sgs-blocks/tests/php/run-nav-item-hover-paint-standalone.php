<?php
/**
 * Standalone runner for the M-21 item hover paint (itemOpacity/itemOpacityHover,
 * itemPaddingShiftHover, panelCardLift — task c6, U-1 commit 6).
 *
 * The nav blocks' emitting functions cannot be included whole outside WordPress
 * (block context + dozens of helpers), so this runner extracts the FOUR real
 * sections from the shipped files and evaluates that exact text against
 * fixtures. A change to the shipped code is therefore a change to what is
 * tested; nothing here is a hand-copied duplicate.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-nav-item-hover-paint-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable Squiz.PHP.Eval.Discouraged

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

require_once dirname( __DIR__, 2 ) . '/includes/helpers-hover-state.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-css-safety.php';

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

/**
 * Cut the text strictly between two markers (both excluded).
 *
 * @param string $source The full file text.
 * @param string $start  Marker text where the section BEGINS.
 * @param string $end    Marker text where the section ENDS.
 * @param int    $offset Search offset for $start (repeat calls advance past earlier matches).
 * @return array{0:string,1:int} [section text, offset just past $end] — the second element
 *                                lets a caller chain further extractions from the same source.
 */
function cut_between( string $source, string $start, string $end, int $offset = 0 ): array {
	$start_pos = strpos( $source, $start, $offset );
	if ( false === $start_pos ) {
		return array( '', $offset );
	}
	$end_pos = strpos( $source, $end, $start_pos );
	if ( false === $end_pos ) {
		return array( '', $offset );
	}
	return array( substr( $source, $start_pos, $end_pos - $start_pos ), $end_pos + strlen( $end ) );
}

// ══════════════════════════════════════════════════════════════════════════
// Section 1 — nav-menu-css.php's shared item-state function: itemOpacity /
// itemOpacityHover / itemPaddingShiftHover on the TOP-LEVEL item link.
// ══════════════════════════════════════════════════════════════════════════
$css_source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/nav-menu-css.php' );
list( $item_section ) = cut_between(
	$css_source,
	"\$item_opacity = \$attributes['itemOpacity']",
	'── ITEM BACKGROUND — ALL THREE fills'
);
ok( '' !== $item_section, 'the item opacity/padding-shift section is found in the real nav-menu-css.php' );
// Trim back to just before the comment block that introduces the NEXT section.
$item_section = (string) substr( $item_section, 0, (int) strrpos( $item_section, "\n\t/*" ) );

function run_item_state( string $code, array $attributes ): string {
	$css           = '';
	$link_sel      = '.uid .sgs-nav-bar-menu__link';
	$caret_svg_sel = '.uid .sgs-nav-bar-menu__caret svg';
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted nav-menu-css.php section.
	return $css;
}

ok( '' === run_item_state( $item_section, array() ), 'item: no attributes -> nothing emitted (byte-identical to a menu that never had these controls)' );
ok( '' === run_item_state( $item_section, array( 'itemOpacity' => null, 'itemOpacityHover' => null, 'itemPaddingShiftHover' => '' ) ), 'item: every new attribute unset/empty -> nothing emitted' );

$rest = run_item_state( $item_section, array( 'itemOpacity' => 1 ) );
ok( false !== strpos( $rest, '.uid .sgs-nav-bar-menu__link,.uid .sgs-nav-bar-menu__caret svg{opacity:1;}' ), 'item: resting opacity paints the link AND the paired caret glyph' );

$hover = run_item_state( $item_section, array( 'itemOpacityHover' => 0.5 ) );
ok( false !== strpos( $hover, 'opacity:0.5' ), 'item: hover opacity 0.5 is emitted' );
ok( false !== strpos( $hover, SGS_HOVER_MEDIA ) && false !== strpos( $hover, SGS_HOVER_NOT_TOUCH ), 'item: the hover opacity rule is touch-guarded (both layers), never a bare :hover' );
ok( false !== strpos( $hover, ':focus-visible{opacity:0.5}' ), 'item: the paired :focus-visible rule is unguarded' );

$clamped = run_item_state( $item_section, array( 'itemOpacity' => 4, 'itemOpacityHover' => -2 ) );
ok( false !== strpos( $clamped, 'opacity:1;' ), 'item: an out-of-range resting opacity (4) is clamped to 1' );
ok( false !== strpos( $clamped, 'opacity:0' ) && false === strpos( $clamped, 'opacity:-2' ), 'item: an out-of-range hover opacity (-2) is clamped to 0, never emitted raw' );

$hostile_opacity = run_item_state( $item_section, array( 'itemOpacity' => 'red;}body{background:red', 'itemOpacityHover' => array( 'x' ) ) );
ok( '' === $hostile_opacity, 'item: a non-numeric (hostile) opacity value emits nothing' );

$shift = run_item_state( $item_section, array( 'itemPaddingShiftHover' => '8px' ) );
ok( false !== strpos( $shift, 'padding-inline-start:calc(12px + 8px)' ), 'item: padding shift adds onto the resting 12px literal' );
ok( false !== strpos( $shift, SGS_HOVER_MEDIA ), 'item: the padding-shift rule is touch-guarded' );

ok( '' === run_item_state( $item_section, array( 'itemPaddingShiftHover' => 'red;}body{x' ) ), 'item: a hostile padding-shift value emits nothing' );
ok( '' === run_item_state( $item_section, array( 'itemPaddingShiftHover' => '8px 4px' ) ), 'item: a two-value (shorthand) padding-shift is refused by the single-length validator' );

// Negative control: bypass the clamp — prove the clamp test above can fail.
$bypass_clamp = str_replace(
	'max( 0, min( 1, (float) $item_opacity_hover ) )',
	'(float) $item_opacity_hover',
	$item_section
);
ok( $bypass_clamp !== $item_section, 'negative control A: the clamp bypass was applied to the extracted text' );
ok( false !== strpos( run_item_state( $bypass_clamp, array( 'itemOpacityHover' => -2 ) ), 'opacity:-2' ), 'negative control A: with the clamp bypassed, -2 IS emitted raw (so the clamp test above can fail)' );

// Negative control: bypass the single-length validator on the padding shift.
$bypass_shift = str_replace(
	"sgs_css_single_length_value( \$attributes['itemPaddingShiftHover'] ?? '' )",
	"(string) ( \$attributes['itemPaddingShiftHover'] ?? '' )",
	$item_section
);
ok( $bypass_shift !== $item_section, 'negative control B: the validator bypass was applied to the extracted text' );
ok( false !== strpos( run_item_state( $bypass_shift, array( 'itemPaddingShiftHover' => 'red;}body{x' ) ), 'red;}body{x' ), 'negative control B: with the validator bypassed, the hostile value IS emitted (so the refusal test above can fail)' );

// ══════════════════════════════════════════════════════════════════════════
// Section 2 — nav-menu-submenu-css.php's sublink opacity + padding shift
// (dropdown / mega submenu link + the drawer's accordion submenu link — same
// emitter). submenuOpacity/submenuOpacityHover are the sublink's OWN pair,
// genuinely separate from the item element's itemOpacity/itemOpacityHover
// (nav-menu-css.php, Section 1 above) — fantasy needs the two elements to
// move in opposite directions.
// ══════════════════════════════════════════════════════════════════════════
$submenu_source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/nav-menu-submenu-css.php' );
list( $sublink_section ) = cut_between(
	$submenu_source,
	"\$submenu_opacity = \$attributes['submenuOpacity']",
	'EXCEPT in the drawer'
);
// Trim back to just before the comment block that introduces that next
// (unrelated) section — the end marker above is inside its docblock.
$sublink_section = (string) substr( $sublink_section, 0, (int) strrpos( $sublink_section, "\n\n\t\t/*" ) );
ok( '' !== $sublink_section, 'the sublink opacity/padding-shift section is found in the real nav-menu-submenu-css.php' );

function run_sublink_shift( string $code, array $attributes ): string {
	$css         = '';
	$sublink_sel = '.uid .sgs-nav-bar-menu__sublink';
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted nav-menu-submenu-css.php section.
	return $css;
}

ok( '' === run_sublink_shift( $sublink_section, array() ), 'sublink: no attribute -> nothing emitted (opacity + padding-shift both silent)' );
ok( '' === run_sublink_shift( $sublink_section, array( 'submenuOpacity' => null, 'submenuOpacityHover' => null ) ), 'sublink: opacity attributes unset -> nothing emitted' );

$sub_rest = run_sublink_shift( $sublink_section, array( 'submenuOpacity' => 0.6 ) );
ok( false !== strpos( $sub_rest, '.uid .sgs-nav-bar-menu__sublink{opacity:0.6;}' ), 'sublink: resting opacity 0.6 (fantasy reference) is emitted' );

$sub_hover = run_sublink_shift( $sublink_section, array( 'submenuOpacityHover' => 1 ) );
ok( false !== strpos( $sub_hover, 'opacity:1' ), 'sublink: hover opacity 1 (fantasy reference: brightens from 0.6 to 1, the OPPOSITE direction from the item pair) is emitted' );
ok( false !== strpos( $sub_hover, SGS_HOVER_MEDIA ) && false !== strpos( $sub_hover, SGS_HOVER_NOT_TOUCH ), 'sublink: the hover opacity rule is touch-guarded (both layers)' );
ok( false !== strpos( $sub_hover, ':focus-visible{opacity:1}' ), 'sublink: the paired :focus-visible rule is unguarded' );

$sub_clamped = run_sublink_shift( $sublink_section, array( 'submenuOpacity' => 4, 'submenuOpacityHover' => -2 ) );
ok( false !== strpos( $sub_clamped, 'opacity:1;' ), 'sublink: an out-of-range resting opacity (4) is clamped to 1' );
ok( false !== strpos( $sub_clamped, 'opacity:0' ) && false === strpos( $sub_clamped, 'opacity:-2' ), 'sublink: an out-of-range hover opacity (-2) is clamped to 0, never emitted raw' );

ok( '' === run_sublink_shift( $sublink_section, array( 'submenuOpacity' => 'red;}body{background:red', 'submenuOpacityHover' => array( 'x' ) ) ), 'sublink: a non-numeric (hostile) opacity value emits nothing' );

// Negative control: bypass the sublink opacity clamp.
$bypass_sub_clamp = str_replace(
	'max( 0, min( 1, (float) $submenu_opacity_hover ) )',
	'(float) $submenu_opacity_hover',
	$sublink_section
);
ok( $bypass_sub_clamp !== $sublink_section, 'negative control F: the sublink opacity clamp bypass was applied to the extracted text' );
ok( false !== strpos( run_sublink_shift( $bypass_sub_clamp, array( 'submenuOpacityHover' => -2 ) ), 'opacity:-2' ), 'negative control F: with the clamp bypassed, -2 IS emitted raw (so the clamp test above can fail)' );

ok( '' === run_sublink_shift( $sublink_section, array() ), 'sublink: no attribute -> nothing emitted' );
ok( '' === run_sublink_shift( $sublink_section, array( 'itemPaddingShiftHover' => '' ) ), 'sublink: empty attribute -> nothing emitted' );
$sub_shift = run_sublink_shift( $sublink_section, array( 'itemPaddingShiftHover' => '6px' ) );
ok( false !== strpos( $sub_shift, 'padding-inline-start:calc(16px + 6px)' ), 'sublink: padding shift adds onto the resting 16px literal (indus-foods dropdown 6 to 12/... reference shape)' );
ok( false !== strpos( $sub_shift, SGS_HOVER_MEDIA ), 'sublink: the padding-shift rule is touch-guarded' );
ok( '' === run_sublink_shift( $sublink_section, array( 'itemPaddingShiftHover' => 'url(javascript:alert(1))' ) ), 'sublink: a hostile padding-shift value emits nothing' );

$bypass_sublink = str_replace(
	"sgs_css_single_length_value( \$attributes['itemPaddingShiftHover'] ?? '' )",
	"(string) ( \$attributes['itemPaddingShiftHover'] ?? '' )",
	$sublink_section
);
ok( $bypass_sublink !== $sublink_section, 'negative control C: the sublink validator bypass was applied to the extracted text' );
ok( false !== strpos( run_sublink_shift( $bypass_sublink, array( 'itemPaddingShiftHover' => 'red;}body{x' ) ), 'red;}body{x' ), 'negative control C: with the validator bypassed, the hostile value IS emitted' );

// ══════════════════════════════════════════════════════════════════════════
// Section 3 — mega-panel/render.php: itemPaddingShiftHover across all THREE
// group styles (each reads its own resting literal: columns 12px / cards
// 0px / minimal 14px).
// ══════════════════════════════════════════════════════════════════════════
$mega_source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/mega-panel/render.php' );

list( $shift_calc, $off ) = cut_between(
	$mega_source,
	"\$item_padding_shift = sgs_css_single_length_value",
	";\n"
);
$shift_calc .= ';';
ok( '' !== $shift_calc, 'the mega-panel itemPaddingShiftHover computation is found in the real render.php' );

$mega_blocks   = array();
$search_offset = $off;
for ( $i = 0; $i < 3; $i++ ) {
	list( $block, $search_offset ) = cut_between(
		$mega_source,
		"if ( '' !== \$item_padding_shift ) {",
		"\n}\n",
		$search_offset
	);
	ok( '' !== $block, "mega-panel: padding-shift block #{$i} (0-indexed) is found in the real render.php" );
	$mega_blocks[] = $block . "\n}\n";
}
ok( 3 === count( array_filter( $mega_blocks ) ), 'mega-panel: all three per-style padding-shift blocks (columns/cards/minimal) were extracted' );
$mega_shift_section = $shift_calc . "\n" . implode( "\n", $mega_blocks );

function run_mega_shift( string $code, array $attributes ): string {
	$css        = '';
	$style_col  = '.wp-block-sgs-mega-panel[data-mega-style="columns"]';
	$style_crd  = '.wp-block-sgs-mega-panel[data-mega-style="cards"]';
	$style_min  = '.wp-block-sgs-mega-panel[data-mega-style="minimal"]';
	$rel_item   = ' .sgs-mega-group .sgs-icon-list__item';
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted mega-panel/render.php sections.
	return $css;
}

ok( '' === run_mega_shift( $mega_shift_section, array() ), 'mega-panel: no attribute -> nothing emitted on any of the three styles' );
$mega_shift = run_mega_shift( $mega_shift_section, array( 'itemPaddingShiftHover' => '8px' ) );
ok( false !== strpos( $mega_shift, 'calc(12px + 8px)' ), 'mega-panel: columns style shifts from its own 12px resting literal' );
ok( false !== strpos( $mega_shift, 'calc(0px + 8px)' ), 'mega-panel: cards style shifts from its own 0px resting literal' );
ok( false !== strpos( $mega_shift, 'calc(14px + 8px)' ), 'mega-panel: minimal style shifts from its own 14px resting literal (halcyon reference: 14 to 22)' );
ok( substr_count( $mega_shift, SGS_HOVER_MEDIA ) >= 3, 'mega-panel: all three per-style rules are touch-guarded' );
ok( '' === run_mega_shift( $mega_shift_section, array( 'itemPaddingShiftHover' => 'x;}body{background:red;}' ) ), 'mega-panel: a hostile padding-shift value emits nothing on any style' );

$bypass_mega_shift = str_replace(
	"sgs_css_single_length_value( \$attributes['itemPaddingShiftHover'] ?? '' )",
	"(string) ( \$attributes['itemPaddingShiftHover'] ?? '' )",
	$mega_shift_section
);
ok( $bypass_mega_shift !== $mega_shift_section, 'negative control D: the mega-panel validator bypass was applied to the extracted text' );
ok( '' !== run_mega_shift( $bypass_mega_shift, array( 'itemPaddingShiftHover' => 'x;}body{background:red;}' ) ), 'negative control D: with the validator bypassed, the hostile value IS emitted' );

// ══════════════════════════════════════════════════════════════════════════
// Section 4 — mega-panel/render.php: panelCardLift on the `cards` style's
// group tile (replaces the previously-hardcoded translateY(-3px)).
// ══════════════════════════════════════════════════════════════════════════
list( $lift_section ) = cut_between(
	$mega_source,
	"\$panel_card_lift = sgs_css_single_length_value",
	"@media (prefers-reduced-motion: reduce){'"
);
ok( '' !== $lift_section, 'the panelCardLift section is found in the real render.php' );
// Trim back to just before the reduced-motion rule that follows the lift.
$lift_section = (string) substr( $lift_section, 0, (int) strrpos( $lift_section, "\n\$css" ) );

function run_lift( string $code, array $attributes ): string {
	$css        = '';
	$style_crd  = '.wp-block-sgs-mega-panel[data-mega-style="cards"]';
	$rel_group  = ' .sgs-mega-group';
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted mega-panel/render.php panelCardLift section.
	return $css;
}

$default_lift = run_lift( $lift_section, array( 'panelCardLift' => '3px' ) );
ok( false !== strpos( $default_lift, 'transform:translateY(calc(-1 * 3px));border-color:var(--sgs-mm-accent-border)' ), 'panelCardLift: the block.json default (3px) reproduces today\'s -3px lift via calc(-1 * 3px)' );

// Empty/hostile/malformed panelCardLift means NO transform at all — but the
// border-colour hover pair on the SAME rule still emits unconditionally (it
// costs nothing when the lift is switched off; see render.php's own comment).
$empty_lift = run_lift( $lift_section, array( 'panelCardLift' => '' ) );
ok( false === strpos( $empty_lift, 'transform:' ) && false !== strpos( $empty_lift, 'border-color:var(--sgs-mm-accent-border)' ), 'panelCardLift: empty -> no transform declaration, but the border-colour hover pair still emits' );

$custom_lift = run_lift( $lift_section, array( 'panelCardLift' => '6px' ) );
ok( false !== strpos( $custom_lift, 'calc(-1 * 6px)' ), 'panelCardLift: a custom value (indus-foods reference: 6px) is emitted' );
ok( false !== strpos( $custom_lift, SGS_HOVER_MEDIA ), 'panelCardLift: the lift rule is touch-guarded' );

$hostile_lift = run_lift( $lift_section, array( 'panelCardLift' => 'red;}body{x' ) );
ok( false === strpos( $hostile_lift, 'transform:' ) && false === strpos( $hostile_lift, 'red;}body{x' ), 'panelCardLift: a hostile value is rejected (no transform, no injection)' );

$two_value_lift = run_lift( $lift_section, array( 'panelCardLift' => '10px 5px' ) );
ok( false === strpos( $two_value_lift, 'transform:' ), 'panelCardLift: a two-value length is refused by the single-length validator (no transform)' );

$bypass_lift = str_replace(
	"sgs_css_single_length_value( \$attributes['panelCardLift'] ?? '' )",
	"(string) ( \$attributes['panelCardLift'] ?? '' )",
	$lift_section
);
ok( $bypass_lift !== $lift_section, 'negative control E: the panelCardLift validator bypass was applied to the extracted text' );
ok( false !== strpos( run_lift( $bypass_lift, array( 'panelCardLift' => 'red;}body{x' ) ), 'red;}body{x' ), 'negative control E: with the validator bypassed, the hostile value IS emitted (so the refusal test above can fail)' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
