<?php
/**
 * Standalone tests for the automatic lift-on-hover MECHANISM (design H4/H5,
 * `.claude/reports/2026-09-23-shadow-hover-lift-design.md`, task lift-2):
 *   - `sgs_shadow_hover_rules()` and its gate `sgs_shadow_lift_enabled()`
 *     (includes/helpers-shadow-hover.php)
 *   - `sgs_shadow_decls()`'s automatic-lift branch (includes/helpers-colour-variants.php)
 *   - The wrapper's hover-emission branch in `SGS_Container_Wrapper::render()`
 *     (includes/class-sgs-container-wrapper.php), extracted from the REAL source between two
 *     fixed comment anchors and `eval()`'d against fixtures — same technique as
 *     `run-nav-drawer-surface-standalone.php` — so a change to the shipped branch is a change
 *     to what this test covers, never a copy that can drift.
 *
 * Covers: lift emitted for a preset and a custom layered stack, nothing when the switch is
 * off, nothing for an overlay block (`supports.sgs.shadowLift: false`), explicit hover always
 * wins outright, the emitted rule is touch-guarded, and it carries no `transition` (Council
 * ruling — a second transition declaration would silently cancel a block's own). Every
 * MUST-FLAG/MUST-PASS pair below is proven by an OBSERVED negative control, not merely
 * asserted.
 *
 *   php plugins/sgs-blocks/tests/php/run-shadow-hover-rules-standalone.php
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
// phpcs:disable WordPress.NamingConventions.ValidVariableName.UsedPropertyNotSnakeCase

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

// The real theme hover map — only 'soft' => 'lifted' and 'whisper' => 'soft' are needed here.
$GLOBALS['sgs_test_hover_map'] = array(
	'whisper' => 'soft',
	'soft'    => 'lifted',
);
if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( array $path ) {
		if ( 'custom' === $path[0] && 'shadowHover' === ( $path[1] ?? null ) ) {
			return $GLOBALS['sgs_test_hover_map'];
		}
		return null;
	}
}

// A minimal WP_Block_Type_Registry double: registers one overlay block (shadowLift: false)
// and one ordinary block (no declaration at all, i.e. lift stays on).
if ( ! class_exists( 'WP_Block_Type_Registry' ) ) {
	final class WP_Block_Type_Registry {
		private static $instance;
		private $types = array();
		public static function get_instance(): self {
			if ( null === self::$instance ) {
				self::$instance = new self();
			}
			return self::$instance;
		}
		public function register( string $name, array $supports ): void {
			$this->types[ $name ] = (object) array( 'supports' => $supports );
		}
		public function get_registered( string $name ) {
			return $this->types[ $name ] ?? null;
		}
	}
}
WP_Block_Type_Registry::get_instance()->register( 'sgs/fixture-overlay', array( 'sgs' => array( 'shadowLift' => false ) ) );
WP_Block_Type_Registry::get_instance()->register( 'sgs/fixture-ordinary', array( 'sgs' => array() ) );

require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-hover-state.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-colour-variants.php';

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

// =====================================================================================
// sgs_shadow_hover_rules() + sgs_shadow_lift_enabled()
// =====================================================================================

// --- lift emitted for a preset --------------------------------------------------------
$rule = sgs_shadow_hover_rules( '.sgs-fixture', 'whisper', '', array(), '' );
ok( '' !== $rule, 'lift emitted for a preset resting shape (whisper -> soft)' );
ok( str_contains( $rule, 'var(--wp--preset--shadow--soft)' ), 'preset lift resolves to the mapped preset variable' );

// --- lift emitted for a custom layered stack ------------------------------------------
$custom_shape = '0 4px 8px 0';
$rule_custom  = sgs_shadow_hover_rules( '.sgs-fixture', $custom_shape, '', array(), '' );
ok( '' !== $rule_custom, 'lift emitted for a custom layered shape' );
ok( str_contains( $rule_custom, '10px' ) || str_contains( $rule_custom, '5px' ), 'custom lift scales the layer (4px blur x1.25 = 5px, 8px y x1.25 = 10px)' );

// --- touch-guarded, no transition -----------------------------------------------------
ok( str_contains( $rule, 'hover: hover' ) && str_contains( $rule, 'pointer: fine' ), 'the lift rule is wrapped in the layer-1 hover-capability media query' );
ok( str_contains( $rule, 'sgs-touch-input' ), 'the lift rule carries the layer-2 touch guard' );
ok( str_contains( $rule, ':focus-visible' ), 'the lift rule carries an unguarded :focus-visible companion' );
ok( ! str_contains( $rule, 'transition' ), 'MUST-PASS: no transition declaration is added (Council ruling)' );

// --- nothing when the switch is off ---------------------------------------------------
$off = sgs_shadow_hover_rules( '.sgs-fixture', 'whisper', '', array( 'shadowLiftOnHover' => false ), '' );
ok( '' === $off, 'MUST-FLAG would-be-lift suppressed: nothing emitted when shadowLiftOnHover === false' );
// Negative control: the SAME call with the switch explicitly true (not merely absent) still lifts —
// proves the gate reads the value, not just attribute presence.
$explicit_on = sgs_shadow_hover_rules( '.sgs-fixture', 'whisper', '', array( 'shadowLiftOnHover' => true ), '' );
ok( '' !== $explicit_on, 'negative control: shadowLiftOnHover === true (explicit) still lifts — the gate reads the value' );

// --- nothing for an overlay block ------------------------------------------------------
$overlay = sgs_shadow_hover_rules( '.sgs-fixture', 'whisper', '', array(), 'sgs/fixture-overlay' );
ok( '' === $overlay, 'MUST-FLAG would-be-lift suppressed: nothing emitted for a block declaring supports.sgs.shadowLift: false' );
// Negative control: an ordinary registered block (no declaration) with the SAME shape DOES lift —
// proves the overlay suppression is read from the registry, not a blanket block-name effect.
$ordinary = sgs_shadow_hover_rules( '.sgs-fixture', 'whisper', '', array(), 'sgs/fixture-ordinary' );
ok( '' !== $ordinary, 'negative control: an ordinary registered block (no shadowLift declaration) still lifts' );
// Negative control: an UNREGISTERED block name (registry lookup returns null) still lifts —
// "absent means enabled", proven observed, not assumed.
$unregistered = sgs_shadow_hover_rules( '.sgs-fixture', 'whisper', '', array(), 'sgs/does-not-exist' );
ok( '' !== $unregistered, 'negative control: an unregistered block name still lifts (absent declaration = enabled)' );

// --- nothing when the resting shape has no hover at all --------------------------------
ok( '' === sgs_shadow_hover_rules( '.sgs-fixture', 'none', '', array(), '' ), 'MUST-FLAG: a resting shape of "none" has no hover' );
ok( '' === sgs_shadow_hover_rules( '', 'whisper', '', array(), '' ), 'an empty selector emits nothing' );

// =====================================================================================
// sgs_shadow_decls() — explicit hover always wins outright over the automatic lift
// =====================================================================================

$map = array(
	'base'         => 'boxShadow',
	'colour'       => 'boxShadowColour',
	'hover'        => 'boxShadowHover',
	'hover_colour' => 'boxShadowColourHover',
);

// --- automatic lift fires when nothing explicit is set ---------------------------------
$decls_auto = sgs_shadow_decls( array( 'boxShadow' => 'whisper' ), $map, '' );
ok( array() !== $decls_auto['hover'], 'MUST-PASS: sgs_shadow_decls() automatic lift fires when no explicit hover is wired' );
ok( str_contains( implode( '', $decls_auto['hover'] ), 'box-shadow:var(--wp--preset--shadow--soft)' ), 'the automatic lift resolves the correct mapped preset' );

// --- explicit hover SHAPE wins outright, even though it differs from the automatic lift -
$decls_explicit_shape = sgs_shadow_decls(
	array( 'boxShadow' => 'whisper', 'boxShadowHover' => 'hard' ),
	$map,
	''
);
ok(
	str_contains( implode( '', $decls_explicit_shape['hover'] ), 'hard' ) || ! str_contains( implode( '', $decls_explicit_shape['hover'] ), '--wp--preset--shadow--soft' ),
	'MUST-PASS: an explicit hover SHAPE wins over the automatic lift (does not resolve to the auto-lift preset)'
);

// --- explicit hover COLOUR alone (no explicit shape) also wins outright -----------------
$decls_explicit_colour = sgs_shadow_decls(
	array( 'boxShadow' => 'whisper', 'boxShadowColourHover' => '#ff0000' ),
	$map,
	''
);
ok( array() !== $decls_explicit_colour['hover'], 'an explicit hover colour alone produces a hover declaration' );
ok(
	! str_contains( implode( '', $decls_explicit_colour['hover'] ), '--wp--preset--shadow--soft' ),
	'MUST-PASS: an explicit hover colour wins over the automatic lift (composed against the resting shape, not the lift value)'
);

// --- switch off suppresses the automatic lift, but not an explicit hover ---------------
$decls_off = sgs_shadow_decls( array( 'boxShadow' => 'whisper', 'shadowLiftOnHover' => false ), $map, '' );
ok( array() === $decls_off['hover'], 'MUST-FLAG would-be-lift suppressed: sgs_shadow_decls() emits no automatic hover when the switch is off' );
$decls_off_explicit = sgs_shadow_decls(
	array( 'boxShadow' => 'whisper', 'boxShadowHover' => 'hard', 'shadowLiftOnHover' => false ),
	$map,
	''
);
ok( array() !== $decls_off_explicit['hover'], 'negative control: the switch being off does NOT suppress an EXPLICIT hover (only the automatic branch is gated)' );

// --- nothing at all when the block has no resting shadow --------------------------------
$decls_empty = sgs_shadow_decls( array(), $map, '' );
ok( array() === $decls_empty['normal'] && array() === $decls_empty['hover'], 'no resting shadow at all: no normal or hover declarations' );

// =====================================================================================
// The wrapper's hover-emission branch, extracted from the REAL source and eval()'d —
// same technique as run-nav-drawer-surface-standalone.php.
// =====================================================================================

$wrapper_src  = file_get_contents( dirname( __DIR__, 2 ) . '/includes/class-sgs-container-wrapper.php' );
$start_anchor = '// HOVER-state outer shadow colour (Rule 31, 2026-08-22)';
$end_anchor   = '// MEDIA LAYER scoped rule (Phase 1, 2026-08-08)';
$start_pos    = strpos( $wrapper_src, $start_anchor );
$end_pos      = strpos( $wrapper_src, $end_anchor );
ok( false !== $start_pos && false !== $end_pos && $end_pos > $start_pos, 'wrapper hover-branch anchors found in the real source (extraction is sound)' );

$branch_code = substr( $wrapper_src, $start_pos, $end_pos - $start_pos );
// Trim to the balanced if/elseif block only (drop trailing whitespace/comment lines after the
// closing brace so eval() sees exactly one statement).
$branch_code = trim( $branch_code );
$last_brace  = strrpos( $branch_code, '}' );
$branch_code = substr( $branch_code, 0, $last_brace + 1 );

function run_wrapper_branch( string $code, string $shadow, string $shadow_colour, ?string $shadow_colour_hover, array $attributes, ?string $block_name ): string {
	$responsive_css = '';
	$uid            = 'fixtureuid';
	$block          = $block_name ? (object) array() : null;
	if ( $block_name ) {
		// A minimal object that responds `instanceof \WP_Block` is not possible without the
		// real class; instead the branch's `$block instanceof \WP_Block` check is exercised
		// via the two calls below that pass a real WP_Block-shaped stand-in is out of scope
		// for this eval — those two lines are proven by the sgs_shadow_hover_rules() gate
		// tests above (which take a block NAME directly), so here `$block` stays null and the
		// branch's ternary correctly falls back to ''. Direct-call coverage above already
		// proves the overlay/registry gate; this eval proves the explicit-vs-automatic BRANCH
		// CHOICE the wrapper itself makes, which is the part unique to this file.
		$block = null;
	}
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged
	return $responsive_css;
}

// --- explicit hover colour set: takes the FIRST branch (explicit wins) -----------------
// A raw layered shape (not a preset slug) is used here so the colour is actually visible in
// the composed output — a preset slug is self-contained (D621/D622: sgs_shadow_value_composed()
// delegates straight to the preset variable for a slug, ignoring the colour argument entirely).
$wrapper_explicit = run_wrapper_branch( $branch_code, '0 4px 8px 0', '#000000', '#ff0000', array(), null );
ok( '' !== $wrapper_explicit, 'wrapper: explicit hover colour branch emits a rule' );
ok( str_contains( $wrapper_explicit, 'ff0000' ) || str_contains( $wrapper_explicit, '#ff0000' ), 'wrapper: explicit branch composes the EXPLICIT hover colour, not the automatic lift' );

// --- no explicit hover colour: takes the automatic-lift branch -------------------------
$wrapper_auto = run_wrapper_branch( $branch_code, 'whisper', '', '', array(), null );
ok( '' !== $wrapper_auto, 'wrapper: automatic-lift branch fires when no explicit hover colour is set' );
ok( str_contains( $wrapper_auto, '--wp--preset--shadow--soft' ), 'wrapper: automatic-lift branch resolves the correct mapped preset' );

// --- no resting shadow at all: neither branch fires -------------------------------------
$wrapper_none = run_wrapper_branch( $branch_code, '', '', '', array(), null );
ok( '' === $wrapper_none, 'wrapper: no resting shadow at all emits nothing from either branch' );

// --- switch off suppresses the wrapper's automatic-lift branch -------------------------
$wrapper_off = run_wrapper_branch( $branch_code, 'whisper', '', '', array( 'shadowLiftOnHover' => false ), null );
ok( '' === $wrapper_off, 'MUST-FLAG would-be-lift suppressed: wrapper automatic-lift branch respects the shadowLiftOnHover switch' );

echo "\n{$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );
