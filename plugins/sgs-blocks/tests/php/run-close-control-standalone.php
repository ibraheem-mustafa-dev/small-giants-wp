<?php
/**
 * Standalone runner for Wave 3C U-9 + U-11 "how a menu closes"
 * (.claude/reports/2026-09-24-u9-u11-design.md), the nav-drawer/render.php side:
 * closeStyle tier object + the revised FR-36-6 predicate (§4.2), closePlacement/
 * closeOffset (§4.3), per-tier sizing (§4.1), closeRadius (§4.10) and the
 * accessible-name resolution.
 *
 * render.php cannot be included whole outside WordPress (it needs block context
 * and dozens of helpers), so this runner extracts the close-control section from
 * the REAL render.php (from `$sgs_nd_allowed_close_styles` to the "Spec 35 item 18"
 * comment) and evaluates that exact text against fixtures — a change to the
 * shipped code is a change to what is tested, nothing here is a copy.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-close-control-standalone.php
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

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( 'esc_html__' ) ) {
	function esc_html__( $text, $domain = null ): string {
		return (string) $text;
	}
}
if ( ! function_exists( 'esc_attr__' ) ) {
	function esc_attr__( $text, $domain = null ): string {
		return (string) $text;
	}
}
if ( ! function_exists( 'sgs_nav_shared_icon_markup' ) ) {
	// Stub — the real resolver (includes/nav-menu-treatments.php) needs a full
	// WP bootstrap for its wp-icon/dashicon branches; structural tests here
	// never inspect the SVG body, only where the markup lands.
	function sgs_nav_shared_icon_markup( $icon, array $fallback ): string {
		return '<svg data-icon="x"></svg>';
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/helpers-responsive.php';

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
 * Extract a named section of render.php between two unique marker strings
 * (start marker included, end marker excluded, trimmed back to the start of
 * the comment line that introduces the end marker's section) — same recipe as
 * run-nav-drawer-surface-standalone.php.
 */
function extract_section( string $source, string $start_marker, string $end_marker ): string {
	$start = strpos( $source, $start_marker );
	$end   = strpos( $source, $end_marker );
	if ( false === $start || false === $end || $end <= $start ) {
		return '';
	}
	$section = substr( $source, $start, $end - $start );
	$cut     = strrpos( $section, "\n//" );
	return false !== $cut ? substr( $section, 0, $cut ) : $section;
}

// ── Extract the real close-control sections from the CURRENT (shipped)
// render.php — TWO spans, because "$classes = array(…)" (uid class list, not
// under test) sits physically between them:
//   A: closeStyle/closePlacement/closeOffset/closeRadius resolution + CSS
//      (style tiers, the FR-36-6 predicate, per-tier sizing, placement, radius).
//   B: the close-button markup (variant spans, aria-label, $close_html).
// A change to either shipped span is a change to what is tested here.
$render_path     = dirname( __DIR__, 2 ) . '/src/blocks/nav-drawer/render.php';
$current_source  = (string) file_get_contents( $render_path );
$section_a       = extract_section(
	$current_source,
	'$sgs_nd_allowed_close_styles = array(',
	'$classes = array('
);
$section_b       = extract_section(
	$current_source,
	'$sgs_nd_close_label = trim(',
	'Spec 35 item 18 — the visually-hidden note'
);
ok( '' !== $section_a && '' !== $section_b, 'both close-control sections are found in the CURRENT nav-drawer/render.php' );
if ( '' === $section_a || '' === $section_b ) {
	echo "\n==== $pass passed, $fail failed ====\n";
	exit( 1 );
}
$section = $section_a . "\n" . $section_b;

/**
 * Run the close-control sections against one drawer's attributes + modality
 * and return the CSS/markup they produced.
 *
 * @param string $code       The PHP text of the close-control sections (A + B).
 * @param array  $attributes The drawer attributes.
 * @param string $modality   'modal' | 'non-modal'.
 * @return array{css:string,close_html:string}
 */
function run_close_section( string $code, array $attributes, string $modality = 'modal' ): array {
	$css       = '';
	$uid       = 'sgs-nav-drawer-test';
	$close_sel = '.' . $uid . '.wp-block-sgs-nav-drawer .sgs-nav-drawer__close';
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted render.php sections (structural test only; no untrusted input reaches this eval — see the module docblock).
	return array(
		'css'        => $css,
		'close_html' => $close_html ?? '',
	);
}

// ════════════════════════════════════════════════════════════════════════════
// §4.2 — the revised FR-36-6 predicate.
// ════════════════════════════════════════════════════════════════════════════

$modal_trigger = run_close_section( $section, array( 'closeStyle' => array( 'desktop' => 'trigger' ) ), 'modal' );
ok( false === strpos( $modal_trigger['css'], 'data-sgs-nav-opener-live' ), 'modal + trigger: no opener-live hide rule at all (the × always shows in a modal drawer)' );

$nonmodal_separate = run_close_section( $section, array( 'closeStyle' => array( 'desktop' => 'separate-x' ) ), 'non-modal' );
ok( false === strpos( $nonmodal_separate['css'], 'data-sgs-nav-opener-live' ), 'non-modal + separate-x: no hide rule (only trigger is eligible)' );

// `trigger` set at desktop with NO tablet/mobile override CASCADES (tablet
// inherits desktop, mobile inherits tablet — §4.1's cascade rule), so all
// three tiers resolve to `trigger` and the hide rule appears at base scope
// AND inside both media queries.
$nonmodal_trigger_desktop = run_close_section( $section, array( 'closeStyle' => array( 'desktop' => 'trigger' ) ), 'non-modal' );
ok(
	false !== strpos( $nonmodal_trigger_desktop['css'], '.sgs-nav-drawer-test[data-sgs-nav-opener-live] .sgs-nav-drawer__close{display:none;}' ),
	'non-modal + trigger (desktop tier, no override): hide rule emitted at BASE scope'
);
ok(
	false !== strpos( $nonmodal_trigger_desktop['css'], '@media (max-width:' . SGS_Breakpoints::TABLET_MAX . 'px){.sgs-nav-drawer-test[data-sgs-nav-opener-live] .sgs-nav-drawer__close{display:none;}.sgs-nav-drawer-test[data-sgs-nav-opener-live]{--sgs-nd-close-room:clamp(16px, 6vw, 32px);}}' )
		&& false !== strpos( $nonmodal_trigger_desktop['css'], '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px){.sgs-nav-drawer-test[data-sgs-nav-opener-live] .sgs-nav-drawer__close{display:none;}.sgs-nav-drawer-test[data-sgs-nav-opener-live]{--sgs-nd-close-room:clamp(16px, 6vw, 32px);}}' ),
	'non-modal + trigger (desktop tier, no override): the cascade also hides the × at tablet AND mobile (both inherit trigger)'
);

$nonmodal_trigger_mobile = run_close_section( $section, array( 'closeStyle' => array( 'desktop' => 'separate-x', 'mobile' => 'trigger' ) ), 'non-modal' );
ok(
	false !== strpos( $nonmodal_trigger_mobile['css'], '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px){.sgs-nav-drawer-test[data-sgs-nav-opener-live] .sgs-nav-drawer__close{display:none;}.sgs-nav-drawer-test[data-sgs-nav-opener-live]{--sgs-nd-close-room:clamp(16px, 6vw, 32px);}}' ),
	'non-modal + trigger (mobile tier only): hide rule scoped inside the MOBILE media query'
);
ok(
	false === strpos( $nonmodal_trigger_mobile['css'], '@media (max-width:' . SGS_Breakpoints::TABLET_MAX . 'px){.sgs-nav-drawer-test[data-sgs-nav-opener-live]' ),
	'non-modal + trigger (mobile tier only): NO hide rule inside the TABLET media query (tablet inherited separate-x from desktop)'
);

ok(
	false !== strpos( $modal_trigger['close_html'], '<svg data-icon="x">' ) && false === strpos( $modal_trigger['close_html'], 'close-bars' ) && false === strpos( $modal_trigger['close_html'], 'close-text' ),
	'`trigger` renders the separate-x glyph (never the burger-morph bars or a text label)'
);

// ════════════════════════════════════════════════════════════════════════════
// Tier cascade + allow-list.
// ════════════════════════════════════════════════════════════════════════════

$cascade = run_close_section( $section, array( 'closeStyle' => array( 'desktop' => 'text-swap' ) ) );
ok( false !== strpos( $cascade['close_html'], 'sgs-nav-drawer__close-text' ) && false === strpos( $cascade['css'], 'close-variant' ), 'one style everywhere (desktop only set): single markup shape, no variant spans/CSS at all' );

$junk_style = run_close_section( $section, array( 'closeStyle' => array( 'desktop' => 'literally-anything-else' ) ) );
ok( false !== strpos( $junk_style['close_html'], '<svg data-icon="x">' ), 'an invalid closeStyle value coerces to the separate-x fallback, never fatals' );

// edit.js allow-list parity — the same 5 values, in the same set, on both sides.
$edit_js_path = dirname( __DIR__, 2 ) . '/src/blocks/nav-drawer/edit.js';
$edit_js      = (string) file_get_contents( $edit_js_path );
// Simpler, robust extraction: pull every ToggleGroupControlOption value inside
// the "Show as" block. Spec 35 §12 audit item 3 (2026-09-24) moved this
// control from `<ResponsiveControl>` to `<ResponsiveOverride>` (closeStyle is
// a `"type":"object"` tier attr with no Tablet/Mobile siblings — THE PAIRING
// IS BINDING routes it to the object-cascade primitive) — the closing tag
// this extraction hunts for moved with it.
$show_as_start = strpos( $edit_js, "label={ __( 'Show as', 'sgs-blocks' ) }" );
$show_as_end   = strpos( $edit_js, "</ResponsiveOverride>", $show_as_start );
$show_as_block = substr( $edit_js, $show_as_start, $show_as_end - $show_as_start );
preg_match_all( '/ToggleGroupControlOption value="([a-z-]+)"/', $show_as_block, $matches );
$edit_js_values = $matches[1] ?? array();
sort( $edit_js_values );
$php_values = array( 'burger-morph', 'icon-and-text', 'separate-x', 'text-swap', 'trigger' );
ok( $edit_js_values === $php_values, 'edit.js\'s closeStyle option values are IDENTICAL to render.php\'s $sgs_nd_allowed_close_styles (found: ' . implode( ',', $edit_js_values ) . ')' );

// closePlacement allow-list parity — Spec 35 audit SHOULD 11 (the design §4.1
// equality-test obligation). Same recipe as closeStyle above: the block.json
// enum is GONE for a tier-object attr (Spec 35 §12), so this hand-written
// parity assertion is the only remaining guard against edit.js and
// render.php's `$sgs_nd_allowed_placements` drifting apart.
// Search STARTS AFTER the "Show as" control's own close tag — "Position" as a
// label string is not unique in this file (the background-image SelectControl
// earlier in the same panel is also labelled "Position"); anchoring the search
// to resume where "Show as" ends skips that unrelated earlier match.
$position_start = strpos( $edit_js, "label={ __( 'Position', 'sgs-blocks' ) }", $show_as_end );
$position_end   = strpos( $edit_js, '</ResponsiveOverride>', $position_start );
$position_block = substr( $edit_js, $position_start, $position_end - $position_start );
preg_match_all( '/ToggleGroupControlOption value="([a-z-]+)"/', $position_block, $position_matches );
$edit_js_placement_values = $position_matches[1] ?? array();
sort( $edit_js_placement_values );
$php_placement_values = array( 'same-slot', 'top-row-end', 'top-row-start' );
ok(
	$edit_js_placement_values === $php_placement_values,
	'edit.js\'s closePlacement option values are IDENTICAL to render.php\'s $sgs_nd_allowed_placements (found: ' . implode( ',', $edit_js_placement_values ) . ')'
);

// ════════════════════════════════════════════════════════════════════════════
// §4.1 — variant spans + per-tier sizing.
// ════════════════════════════════════════════════════════════════════════════

$mixed = run_close_section( $section, array( 'closeStyle' => array( 'desktop' => 'text-swap', 'mobile' => 'separate-x' ) ) );
ok( false !== strpos( $mixed['close_html'], 'sgs-nav-drawer__close-variant--text-swap' ) && false !== strpos( $mixed['close_html'], 'sgs-nav-drawer__close-variant--separate-x' ), 'desktop text-swap + mobile separate-x: BOTH variant spans render' );
ok( false !== strpos( $mixed['css'], '.sgs-nav-drawer__close-variant--text-swap{display:inline-flex' ), 'the desktop variant shows at base scope (no media query)' );
ok(
	false !== strpos( $mixed['css'], '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px){.sgs-nav-drawer-test.wp-block-sgs-nav-drawer .sgs-nav-drawer__close .sgs-nav-drawer__close-variant{display:none;}.sgs-nav-drawer-test.wp-block-sgs-nav-drawer .sgs-nav-drawer__close .sgs-nav-drawer__close-variant--separate-x{display:inline-flex' ),
	'the mobile tier hides every variant then shows only separate-x'
);
// §4.1 — "desktop text-swap + mobile separate-x gives a mobile computed width
// of at least 44px": the mobile-tier width override forces the icon-only
// square back, undoing desktop's width:auto.
ok(
	false !== strpos( $mixed['css'], '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px){.sgs-nav-drawer-test.wp-block-sgs-nav-drawer .sgs-nav-drawer__close{width:44px;height:44px;min-width:44px;min-height:44px;padding:0;}}' ),
	'mobile tier (separate-x) forces width back to the 44px square — never leaks desktop\'s width:auto'
);

$same_everywhere = run_close_section( $section, array( 'closeStyle' => array( 'desktop' => 'separate-x' ) ) );
ok( false === strpos( $same_everywhere['css'], '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px){.sgs-nav-drawer-test.wp-block-sgs-nav-drawer .sgs-nav-drawer__close{width' ), 'one style everywhere: no redundant per-tier width override emitted' );

// ════════════════════════════════════════════════════════════════════════════
// Accessible name — checked across all three tiers.
// ════════════════════════════════════════════════════════════════════════════

$aria_mobile_text = run_close_section( $section, array( 'closeStyle' => array( 'desktop' => 'separate-x', 'mobile' => 'text-swap' ), 'closeLabel' => 'Dismiss' ) );
ok( false !== strpos( $aria_mobile_text['close_html'], 'aria-label="Dismiss"' ), 'a text-bearing tier ANYWHERE (mobile only here) drives the aria-label, even though desktop is icon-only' );

$aria_glyph_only = run_close_section( $section, array( 'closeStyle' => array( 'desktop' => 'separate-x' ), 'closeLabel' => 'Dismiss' ) );
ok( false !== strpos( $aria_glyph_only['close_html'], 'aria-label="Close menu"' ), 'no tier is text-bearing: the generic name is kept, the operator\'s label is ignored' );

$aria_empty_label = run_close_section( $section, array( 'closeStyle' => array( 'desktop' => 'text-swap' ), 'closeLabel' => '' ) );
ok( false !== strpos( $aria_empty_label['close_html'], 'aria-label="Close menu"' ) && false === strpos( $aria_empty_label['close_html'], 'aria-label=""' ), 'an empty operator label falls back to the generic name, never an empty aria-label' );

// ════════════════════════════════════════════════════════════════════════════
// §4.3 — closePlacement / closeOffset.
// ════════════════════════════════════════════════════════════════════════════

$same_slot_modal = run_close_section( $section, array( 'closePlacement' => array( 'desktop' => 'same-slot' ) ), 'modal' );
ok( false !== strpos( $same_slot_modal['css'], 'top:var(--sgs-nav-close-y, 34px);left:var(--sgs-nav-close-x, calc(100% - 34px))' ), 'same-slot under modal: the var()-driven position is emitted' );

$same_slot_nonmodal = run_close_section( $section, array( 'closePlacement' => array( 'desktop' => 'same-slot' ) ), 'non-modal' );
ok( false === strpos( $same_slot_nonmodal['css'], '--sgs-nav-close-x' ), 'same-slot under NON-MODAL resolves to top-row-end (falls back, no var() position emitted)' );

$offset_clamped = run_close_section( $section, array( 'closeOffset' => array( 'desktop' => array( 'x' => 999, 'y' => -999 ) ) ) );
ok( false !== strpos( $offset_clamped['css'], 'translate(40px,-40px)' ), 'closeOffset is clamped to -40..40 (999 -> 40, -999 -> -40)' );

$offset_start = run_close_section( $section, array( 'closePlacement' => array( 'desktop' => 'top-row-start' ), 'closeOffset' => array( 'desktop' => array( 'x' => 5, 'y' => 2 ) ) ) );
ok( false !== strpos( $offset_start['css'], 'inset-inline-start:12px' ) && false !== strpos( $offset_start['css'], 'translate(5px,2px)' ), 'top-row-start carries its own offset translate' );

// ════════════════════════════════════════════════════════════════════════════
// §4.10 — closeRadius.
// ════════════════════════════════════════════════════════════════════════════

$radius = run_close_section( $section, array( 'closeRadius' => array( 'desktop' => '12px' ) ) );
ok( false !== strpos( $radius['css'], 'border-radius:12px' ), 'closeRadius emits border-radius on the close selector' );

$no_radius = run_close_section( $section, array() );
ok( false === strpos( $no_radius['css'], 'border-radius' ), 'default (empty) closeRadius emits nothing — style.css\'s existing 4px keeps applying' );

// ── Spec 32: no inline style attribute is written by this section ───────────────
ok( false === strpos( $section, 'style="' ), 'the section writes no inline style attribute (Spec 32)' );

// ════════════════════════════════════════════════════════════════════════════
// NEGATIVE CONTROLS — the OLD (pre-Wave-3C-U-9/U-11) render.php must FAIL the
// predicate/tier assertions above, proving they test genuinely NEW behaviour.
// ════════════════════════════════════════════════════════════════════════════

$git_head_source = shell_exec( 'git show c36105939~1:plugins/sgs-blocks/src/blocks/nav-drawer/render.php 2>&1' );
$old_section      = is_string( $git_head_source )
	? extract_section( $git_head_source, "\$sgs_nd_allowed_close_styles = array(", '$classes = array(' )
	: '';

if ( '' === $old_section ) {
	ok( false, 'negative control setup: could not extract the OLD close-style section via `git show c36105939~1:...` (the commit before U-9+U-11 landed; git unavailable) — negative controls skipped, review manually' );
} else {
	ok( false === strpos( $old_section, "'trigger'" ), 'negative control baseline: the OLD render.php genuinely has no `trigger` value (proves the fixture is really the pre-change file)' );

	// Old code cannot express a tier object at all: closeStyle is scalar,
	// `in_array( $attributes['closeStyle'] ?? 'separate-x', ... )` against an
	// ARRAY value never matches, so it silently falls to 'separate-x' and
	// NO opener-live hide rule is EVER emitted, in ANY modality.
	// ⚠ The OLD section's bare variable names ($css/$uid/$close_sel/$attributes)
	// are the SAME ones the current section uses -- matched exactly so the
	// eval'd code actually writes into them (an "$old_*"-prefixed set here
	// would leave these untouched and the assertion below vacuous).
	$css        = '';
	$uid        = 'sgs-nav-drawer-test';
	$close_sel  = '.' . $uid . '.wp-block-sgs-nav-drawer .sgs-nav-drawer__close';
	$attributes = array( 'closeStyle' => array( 'desktop' => 'trigger' ) );
	eval( $old_section ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the OLD extracted render.php section.
	ok(
		false === strpos( $css, 'data-sgs-nav-opener-live' ),
		'NEGATIVE CONTROL: the OLD render.php emits NO opener-live hide rule even when handed a non-modal `trigger` tier object — proving the §4.2 predicate test above is watching genuinely new code, not something the old file already did'
	);
}


// ════════════════════════════════════════════════════════════════════════════
// Bean feedback 2026-09-24: (a) a hidden × hands its reserved top row back;
// (b) popover anchors (trigger, centred) paint above the header, panels that
// cover or meet the header's area (full-screen, header) stay one below it.
// ════════════════════════════════════════════════════════════════════════════
ok(
	false !== strpos( $nonmodal_trigger_desktop['css'], '.sgs-nav-drawer-test[data-sgs-nav-opener-live]{--sgs-nd-close-room:clamp(16px, 6vw, 32px);}' ),
	'non-modal + trigger: the hidden × also releases its top row (--sgs-nd-close-room shrinks to the normal body padding)'
);
ok(
	false === strpos( $nonmodal_separate['css'], '--sgs-nd-close-room' ) && false === strpos( $modal_trigger['css'], '--sgs-nd-close-room' ),
	'the × row is released ONLY where the × can hide (never for separate-x, never for a modal drawer)'
);
$drawer_css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/nav-drawer/style.css' );
ok( false !== strpos( $drawer_css, 'padding-top: var(--sgs-nd-close-room, 64px);' ), 'style.css reads the × room from --sgs-nd-close-room, default 64px' );

$geom_section = extract_section( $current_source, '$sgs_nd_z_under_header = ', '$anchor_attr_raw ' );
ok( '' !== $geom_section, 'the anchor geometry section is found in the CURRENT render.php' );
$sgs_nd_geometry_for_anchor = null;
eval( $geom_section ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted render.php geometry closure.
$z_popover = 'z-index:calc(var(--sgs-header-z, 100) + 1);';
$z_under   = 'z-index:min(90, max(2, calc(var(--sgs-header-z, 100) - 1)));';
ok( is_callable( $sgs_nd_geometry_for_anchor ), 'the geometry closure is defined by the extracted section' );
if ( is_callable( $sgs_nd_geometry_for_anchor ) ) {
	ok( false !== strpos( $sgs_nd_geometry_for_anchor( 'trigger', '' ), $z_popover ), 'trigger anchor paints ABOVE the header' );
	ok( false !== strpos( $sgs_nd_geometry_for_anchor( 'centred', '' ), $z_popover ), 'centred anchor paints ABOVE the header' );
	ok( false !== strpos( $sgs_nd_geometry_for_anchor( 'full-screen', '' ), $z_under ), 'full-screen anchor stays one BELOW the header (its burger must stay live on top)' );
	ok( false !== strpos( $sgs_nd_geometry_for_anchor( 'header', '' ), $z_under ), 'header anchor stays one below the header' );
	ok( false === strpos( $sgs_nd_geometry_for_anchor( 'full-screen', '' ), $z_popover ), 'NEGATIVE CONTROL: the full-screen string does not carry the popover z-index (the checks above can tell the two apart)' );
}
ok( false !== strpos( $drawer_css, 'z-index: min(90, max(2, calc(var(--sgs-header-z, 100) - 1)));' ), 'style.css base z-index equals the under-header value the full-screen tier emits (a mixed-tier reset lands on the same number)' );
// ════════════════════════════════════════════════════════════════════════════
// Full-screen non-modal (Bean, 2026-09-24, option 1): paints ABOVE the header
// and starts at the bottom of the burger's own header row, like the trigger
// panel; a modal full-screen drawer keeps the plain full-viewport geometry.
// ════════════════════════════════════════════════════════════════════════════
if ( is_callable( $sgs_nd_geometry_for_anchor ) ) {
	$fs_nonmodal = $sgs_nd_geometry_for_anchor( 'full-screen', '', 'non-modal' );
	$fs_modal    = $sgs_nd_geometry_for_anchor( 'full-screen', '', 'modal' );
	ok( false !== strpos( $fs_nonmodal, 'top:var(--sgs-drawer-opener-row-bottom, 0px);' ) && false !== strpos( $fs_nonmodal, 'height:calc(100dvh - var(--sgs-drawer-opener-row-bottom, 0px));' ), 'non-modal full-screen starts at the bottom edge of the burger row and fills the rest of the viewport' );
	ok( false !== strpos( $fs_nonmodal, $z_popover ), 'non-modal full-screen paints ABOVE the header (lower header rows are covered)' );
	ok( false !== strpos( $fs_modal, 'inset:0' ) && false !== strpos( $fs_modal, $z_under ) && false === strpos( $fs_modal, 'opener-row-bottom' ), 'NEGATIVE CONTROL: modal full-screen keeps the full-viewport geometry (the checks above can tell the two apart)' );
	ok( $sgs_nd_geometry_for_anchor( 'trigger', '', 'non-modal' ) === $sgs_nd_geometry_for_anchor( 'trigger', '', 'modal' ) && false !== strpos( $sgs_nd_geometry_for_anchor( 'trigger', '', 'modal' ), 'var(--sgs-drawer-trigger-top' ), 'modality does not change the trigger panel' );
}
ok( false !== strpos( $current_source, "|| 'non-modal' === \$modality ) {" ), 'a non-modal drawer emits geometry even with no anchor attribute set (its default differs from style.css)' );
$store_js = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/shared/nav-interactivity/store.js' );
ok( false !== strpos( $store_js, "trigger.closest( '.sgs-site-header-row' ) || trigger" ) && false !== strpos( $store_js, "'--sgs-drawer-opener-row-bottom'," ), 'store.js measures the own header row of the burger (falling back to the burger) and writes --sgs-drawer-opener-row-bottom' );
ok( false === strpos( $drawer_css, 'sgs-nd-header-clear' ) && false === strpos( $current_source, 'sgs-nd-header-clear' ), 'the superseded header-clearance padding is gone from style.css and render.php' );

// ════════════════════════════════════════════════════════════════════════════
// Default edge (Bean, 2026-09-24): drawers that paint above the header get the
// theme `floating` shadow by default (cards also 20px corners); a modal
// full-screen drawer gets nothing; an operator shadow replaces the default.
// ════════════════════════════════════════════════════════════════════════════
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', '/' );
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-shadow-layers.php';
$edge_start   = strpos( $current_source, '// ── Default edge (Bean, 2026-09-24).' );
$edge_end     = strpos( $current_source, '// ── Background image media layer' );
$edge_section = ( false !== $edge_start && false !== $edge_end && $edge_end > $edge_start ) ? substr( $current_source, $edge_start, $edge_end - $edge_start ) : '';
ok( '' !== $edge_section, 'the default-edge section is found in the CURRENT render.php' );
$run_edge = function ( array $attributes, string $modality ) use ( $edge_section ): string {
	$css                    = '';
	$root_sel               = '.t.wp-block-sgs-nav-drawer';
	$sgs_nd_allowed_anchors = array( 'full-screen', 'header', 'side-start', 'side-end', 'container', 'trigger', 'centred' );
	$sgs_nd_shadow_raw      = isset( $attributes['shadow'] ) ? (string) $attributes['shadow'] : '';
	eval( $edge_section ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted render.php section.
	return $css;
};
$edge_trigger = $run_edge( array( 'anchor' => array( 'desktop' => 'trigger' ) ), 'non-modal' );
ok( 0 === strpos( $edge_trigger, '.t.wp-block-sgs-nav-drawer{box-shadow:var(--wp--preset--shadow--floating);' ) && false !== strpos( $edge_trigger, 'border-radius:20px;' ), 'trigger card: floating shadow and 20px corners by default' );
ok( false !== strpos( $edge_trigger, 'forced-colors:active' ), 'the default shadow keeps its forced-colours outline' );
$edge_fs_nonmodal = $run_edge( array(), 'non-modal' );
ok( false !== strpos( $edge_fs_nonmodal, 'box-shadow:var(--wp--preset--shadow--floating)' ) && false !== strpos( $edge_fs_nonmodal, 'border-radius:0;' ), 'non-modal full-screen: floating shadow (the line under the burger row), square corners' );
ok( '' === $run_edge( array(), 'modal' ), 'NEGATIVE CONTROL: modal full-screen gets no default edge at all' );
$edge_operator = $run_edge( array( 'anchor' => array( 'desktop' => 'trigger' ), 'shadow' => 'soft' ), 'non-modal' );
ok( false === strpos( $edge_operator, 'box-shadow' ) && false !== strpos( $edge_operator, 'border-radius:20px;' ), 'an operator shadow replaces the default shadow (the default emits none), corners still default' );
$edge_mixed = $run_edge( array( 'anchor' => array( 'desktop' => 'trigger', 'mobile' => 'full-screen' ) ), 'modal' );
ok( false !== strpos( $edge_mixed, '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px){.t.wp-block-sgs-nav-drawer{box-shadow:none;border-radius:0;border:0;box-sizing:border-box;}}' ), 'mixed tiers: a modal full-screen mobile tier resets the card edge' );
$radius_pos = strpos( $current_source, '$radius_tiers      = sgs_border_radius_tiers( $attributes );' );
ok( false !== $radius_pos && $edge_start < $radius_pos, 'the default edge is emitted BEFORE the operator radius rule, so an operator radius wins by source order' );

ok( false !== strpos( $edge_trigger, 'border:1px solid var(--wp--preset--color--primary);' ), 'trigger card: 1px primary border all round by default' );
ok( false !== strpos( $edge_fs_nonmodal, 'border:0;border-top:1px solid var(--wp--preset--color--primary);' ), 'non-modal full-screen: a 1px primary line along the top only' );
$border_pos = strpos( $current_source, '// ── Block-private border: width / style / colour (Shape B).' );
ok( false !== $border_pos && $edge_start < $border_pos, 'the default border is emitted BEFORE the operator border rules, so an operator border wins by source order' );
echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
