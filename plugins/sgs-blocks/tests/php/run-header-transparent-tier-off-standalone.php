<?php
/**
 * Standalone runner for sgs/site-header's Transparent tier-off fallback fix
 * (headerTransparent {desktop:'on', mobile:'off'} with contrastSafe untouched
 * used to paint NO background at all on mobile — `revert` rolls the cascade
 * back past the header's OWN non-`!important` resting-fill rules, not just
 * Transparent's declaration, because both are the same author origin).
 *
 * Extracts the REAL resting-fill + tri-state-merge sections from the shipped
 * site-header/render.php (house pattern — see
 * run-nav-item-hover-paint-standalone.php) and evaluates that exact text
 * against fixtures, requiring the real includes/helpers-responsive.php,
 * includes/sgs-header-force-solid.php and includes/sgs-header-pass-through.php.
 * A change to the shipped code is therefore a change to what is tested.
 *
 * NOTE: the header's own resting fill only ever paints EITHER a (possibly
 * alpha-blended) flat colour OR a gradient on a given tier, never both —
 * render.php's own resting-fill block skips the colour path entirely once a
 * gradient is set ("Fill translucency: a plain colour only; a gradient is
 * left alone"). Cases 1 and 1b below exercise the two reuse paths
 * (colour-mix, gradient) separately for that reason, matching real production
 * configurations rather than a combination the shipped code cannot produce.
 *
 * Uses PHP's eval() to run the extracted, real shipped-code TEXT (not
 * arbitrary/untrusted input) against fixtures — the established idiom for
 * every run-*-standalone.php harness in this directory (e.g.
 * run-nav-item-hover-paint-standalone.php, run-header-gradient-fill-standalone.php).
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-header-transparent-tier-off-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable Squiz.PHP.Eval.Discouraged
// phpcs:disable WordPress.PHP.DiscouragedPHPFunctions.system_calls_shell_exec

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! function_exists( 'absint' ) ) {
	function absint( $n ) {
		return abs( (int) $n );
	}
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-breakpoints.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-css-safety.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-surface-ground.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 2 ) . '/includes/sgs-header-pass-through.php';
require_once dirname( __DIR__, 2 ) . '/includes/sgs-header-force-solid.php';

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
 * @return string The section text, or '' if either marker is missing.
 */
function cut_between( string $source, string $start, string $end ): string {
	$start_pos = strpos( $source, $start );
	if ( false === $start_pos ) {
		return '';
	}
	$end_pos = strpos( $source, $end, $start_pos );
	if ( false === $end_pos ) {
		return '';
	}
	return substr( $source, $start_pos, $end_pos - $start_pos );
}

$rel_path  = 'plugins/sgs-blocks/src/blocks/site-header/render.php';
$repo_root = dirname( __DIR__, 4 );
$current   = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/site-header/render.php' );

// Negative control source: the pre-change helper, pinned at the commit the
// coordinator named as the one that still has the bug (no `fallback` concept
// at all — every dropped property reverts, unconditionally).
$old_helper = (string) shell_exec( 'git -C ' . escapeshellarg( $repo_root ) . ' show 0ec253b35:plugins/sgs-blocks/includes/helpers-responsive.php 2>' . ( '\\' === DIRECTORY_SEPARATOR ? 'NUL' : '/dev/null' ) );
ok( '' !== $old_helper, 'negative control: the pre-change helpers-responsive.php is readable from git (0ec253b35)' );

// ══════════════════════════════════════════════════════════════════════════
// Section 1 — resting background-colour (+ surfaceOpacity alpha).
// ══════════════════════════════════════════════════════════════════════════
$resting_colour_section = cut_between(
	$current,
	"\$sh_resting_bg_color = '';",
	'// Background GRADIENT (`backgroundColourGradient`)'
);
ok( '' !== $resting_colour_section, 'the resting background-colour section is found in the real render.php' );

// ══════════════════════════════════════════════════════════════════════════
// Section 2 — resting background gradient (same marker pair
// run-header-gradient-fill-standalone.php already relies on).
// ══════════════════════════════════════════════════════════════════════════
$resting_image_section = cut_between(
	$current,
	'$sh_gradient_paint = sgs_background_paint_value(',
	"\nif ( ! empty( \$sh_color_args ) ) {"
);
ok( '' !== $resting_image_section, 'the resting background-image (gradient) section is found in the real render.php' );

// ══════════════════════════════════════════════════════════════════════════
// Section 3 — the tri-state behaviours + the merge call itself, including the
// new Transparent `fallback` map built from the resting-fill values above.
// ══════════════════════════════════════════════════════════════════════════
$merge_section = cut_between(
	$current,
	"\$sh_sticky      = isset( \$attributes['headerSticky']",
	"\n// STACKING ORDER:"
);
ok( '' !== $merge_section, 'the tri-state merge section is found in the real render.php' );

/**
 * Run all three real sections in one PHP scope, exactly as render.php does
 * (sequential statements in the same variable scope), and return the
 * resulting $css.
 *
 * @param array $attributes Block attributes.
 * @return string The final $css after the merge call.
 */
function run_header_merge( array $attributes ): string {
	$css                  = '';
	$root_sel             = '.sgs-sh-test.sgs-site-header';
	$sh_color_args        = array();
	$sh_style_engine_args = array();
	eval( $GLOBALS['resting_colour_section'] );
	eval( $GLOBALS['resting_image_section'] );
	eval( $GLOBALS['merge_section'] );
	return $css;
}

$GLOBALS['resting_colour_section'] = $resting_colour_section;
$GLOBALS['resting_image_section']  = $resting_image_section;
$GLOBALS['merge_section']          = $merge_section;

$expected_colour_mix = 'color-mix(in srgb, #1a1a2e 50%, transparent)';
$expected_gradient   = 'linear-gradient(90deg,#ff0000,#0000ff)';

// ── Case 1: the reported defect, colour path — transparent ON desktop, OFF
// mobile, a real colour+surfaceOpacity resting fill, contrastSafe untouched
// (default, never force-solid). ───────────────────────────────────────────────
$css1 = run_header_merge(
	array(
		'headerTransparent' => array(
			'desktop' => 'on',
			'mobile'  => 'off',
		),
		'backgroundColour'  => '#1a1a2e',
		'surfaceOpacity'    => 0.5,
	)
);
ok(
	false !== strpos( $css1, '.sgs-sh-test.sgs-site-header{position:absolute !important;top:0 !important;left:0 !important;right:0 !important;background:transparent !important;}' ),
	'Case 1: the desktop base rule is unchanged — still transparent'
);
ok(
	false !== strpos( $css1, '@media (max-width:767px){.sgs-sh-test.sgs-site-header{position:revert !important;top:revert !important;left:revert !important;right:revert !important;background-color:' . $expected_colour_mix . ' !important;background-image:none !important;}}' ),
	'Case 1 (THE FIX): the mobile tier repaints the header\'s own resting colour-mix fill, !important, instead of reverting the background away'
);
ok( false === strpos( $css1, 'background:revert' ), 'Case 1: `background` is never reverted any more (position/top/left/right still legitimately revert)' );

// ── Case 1b: the reported defect, gradient path — same shape, but the
// resting fill is a gradient instead of a flat colour. ───────────────────────
$css1b = run_header_merge(
	array(
		'headerTransparent'        => array(
			'desktop' => 'on',
			'mobile'  => 'off',
		),
		'backgroundColourGradient' => $expected_gradient,
	)
);
ok(
	false !== strpos( $css1b, '@media (max-width:767px){.sgs-sh-test.sgs-site-header{position:revert !important;top:revert !important;left:revert !important;right:revert !important;background-color:transparent !important;background-image:' . $expected_gradient . ' !important;}}' ),
	'Case 1b (THE FIX, gradient path): the mobile tier repaints the header\'s own resting gradient, !important, instead of reverting the background away'
);

// ── Case 2 (positive control): transparent ON at every tier — unchanged from
// before the fix (no @media block needed at all). ────────────────────────────
$css2 = run_header_merge(
	array(
		'headerTransparent' => array(
			'desktop' => 'on',
			'tablet'  => 'inherit',
			'mobile'  => 'inherit',
		),
		'backgroundColour'  => '#1a1a2e',
		'surfaceOpacity'    => 0.5,
	)
);
ok(
	false !== strpos( $css2, 'background:transparent !important' ) && false === strpos( $css2, '@media' ),
	'Case 2 (positive control): transparent stays on at every tier -> single base rule, no @media block, unchanged by the fix'
);

// ── Case 3 (negative control): transparent OFF everywhere, no fill configured
// — the merge must contribute nothing at all, so no fallback is ever
// consulted (proves the harness is not vacuously matching). ──────────────────
$css3 = run_header_merge(
	array(
		'headerTransparent' => array(
			'desktop' => 'off',
			'tablet'  => 'inherit',
			'mobile'  => 'inherit',
		),
	)
);
ok( '' === $css3, 'Case 3 (negative control): transparent off everywhere, no fill -> the merge emits nothing at all' );

// ── Case 4 (regression guard): Sticky on everywhere + Transparent
// desktop-only — mobile must KEEP `position:sticky` (Sticky re-declares
// itself at every tier it's active, independent of Transparent dropping
// out), not revert, while `background` still gets the resting-fill fallback. ─
$css4 = run_header_merge(
	array(
		'headerTransparent' => array(
			'desktop' => 'on',
			'mobile'  => 'off',
		),
		'headerSticky'      => array(
			'desktop' => 'on',
			'tablet'  => 'inherit',
			'mobile'  => 'inherit',
		),
		'backgroundColour'  => '#1a1a2e',
		'surfaceOpacity'    => 0.5,
	)
);
ok(
	false !== strpos( $css4, '@media (max-width:767px){.sgs-sh-test.sgs-site-header{position:sticky !important;top:0 !important;left:revert !important;right:revert !important;background-color:' . $expected_colour_mix . ' !important;background-image:none !important;}}' ),
	'Case 4 (regression guard): Sticky on everywhere keeps `position:sticky` (never reverted) at mobile while Transparent\'s background still gets the resting-fill fallback'
);
ok( false === strpos( $css4, 'position:revert' ), 'Case 4: position is never reverted once Sticky is on at that tier' );

// ── Case 5: a header with NO fill at all — the fallback must reproduce
// today's genuinely-transparent resting state, not invent a solid colour. ────
$css5 = run_header_merge(
	array(
		'headerTransparent' => array(
			'desktop' => 'on',
			'mobile'  => 'off',
		),
	)
);
ok(
	false !== strpos( $css5, '@media (max-width:767px){.sgs-sh-test.sgs-site-header{position:revert !important;top:revert !important;left:revert !important;right:revert !important;background-color:transparent !important;background-image:none !important;}}' ),
	'Case 5: a header with no colour/gradient at all falls back to background-color:transparent;background-image:none — identical to today\'s genuine resting state'
);

// ══════════════════════════════════════════════════════════════════════════
// Negative control on the FUNCTION ITSELF: the pre-change
// sgs_merge_tri_state_declarations() (git 0ec253b35) must FAIL Case 1's
// mobile-fill assertion — it has no `fallback` concept and always reverts.
// ══════════════════════════════════════════════════════════════════════════
$old_fn_block = cut_between(
	$old_helper,
	"if ( ! function_exists( 'sgs_merge_tri_state_declarations' ) ) {",
	"\n\t\treturn \$css;\n\t}\n}"
) . "\n\t\treturn \$css;\n\t}\n}";
ok( '' !== $old_fn_block && strlen( $old_fn_block ) > 100, 'negative control: the pre-change sgs_merge_tri_state_declarations() body is found in git 0ec253b35' );

// Rename the function (and its function_exists guard) so the pre-change
// version can be loaded ALONGSIDE the real, fixed one already required above.
$old_fn_block_renamed = str_replace(
	'sgs_merge_tri_state_declarations',
	'sgs_merge_tri_state_declarations_old',
	$old_fn_block
);
eval( $old_fn_block_renamed );

$old_css1 = sgs_merge_tri_state_declarations_old(
	'.sgs-sh-test.sgs-site-header',
	array(
		array(
			'raw'   => array(
				'desktop' => 'on',
				'mobile'  => 'off',
			),
			'props' => array(
				'position'   => 'absolute',
				'top'        => '0',
				'left'       => '0',
				'right'      => '0',
				'background' => 'transparent',
			),
		),
	),
	'off'
);
ok(
	false !== strpos( $old_css1, 'background:revert !important' ),
	'NEGATIVE CONTROL: the pre-change helper (0ec253b35) reverts the background at the mobile tier instead of repainting the resting fill'
);
ok(
	false === strpos( $old_css1, $expected_colour_mix ) && false === strpos( $old_css1, 'background-color' ),
	'NEGATIVE CONTROL: the pre-change helper never emits any concrete replacement background — confirms it FAILS the mobile-fill assertion Case 1 requires'
);

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
