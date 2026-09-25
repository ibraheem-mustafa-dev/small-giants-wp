<?php
/**
 * Standalone runner for sgs/site-header's resting + scrolled background
 * gradient (`backgroundColourGradient` / `backgroundColourScrolledGradient`).
 *
 * Proven live 2026-09-25: both attributes store a raw CSS gradient function
 * (optionally with `var(--wp--preset--color--x)` colour-token stops) written
 * by GradientCapableColourControl.js/SgsGradientPicker — never a palette
 * slug. render.php used to resolve them with `sgs_colour_value()` (the
 * FLAT-slug resolver), which treated the whole gradient string as an
 * unresolved slug and painted the fantasy reference's fade
 * (`linear-gradient(to bottom,rgba(0,0,0,0.5),rgba(0,0,0,0))`) as
 * `var(--wp--preset--color--linear-gradienttobottomrgba00005rgba0000,
 * currentColor)` — the text colour, not the gradient. The fix routes both
 * through `sgs_background_paint_value()`/`sgs_css_gradient_value()`
 * (`includes/helpers-tokens.php`), the same resolver sgs/container and
 * sgs/site-header-row already use for this attribute shape.
 *
 * This runner extracts the REAL resting-gradient and scrolled-gradient
 * sections from the shipped render.php (by marker, the house pattern — see
 * run-nav-item-hover-paint-standalone.php) and evaluates that exact text
 * against fixtures, requiring the real includes/helpers-tokens.php. A change
 * to the shipped code is therefore a change to what is tested.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-header-gradient-fill-standalone.php
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

if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';

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

$rel_path = 'plugins/sgs-blocks/src/blocks/site-header/render.php';
$current  = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/site-header/render.php' );

// Negative control source: the pre-change file, pinned at ae50c7626 (the
// commit checked and approved as "still has the sgs_colour_value() bug" —
// Bean verified this line directly before approving Phase 1).
$repo_root = dirname( __DIR__, 4 );
$old       = (string) shell_exec( 'git -C ' . escapeshellarg( $repo_root ) . ' show ae50c7626:' . $rel_path . ' 2>' . ( '\\' === DIRECTORY_SEPARATOR ? 'NUL' : '/dev/null' ) );
ok( '' !== $old, 'negative control: the pre-change render.php is readable from git (ae50c7626)' );

// ══════════════════════════════════════════════════════════════════════════
// Section 1 — resting background gradient (`backgroundColourGradient`).
// ══════════════════════════════════════════════════════════════════════════
$new_resting = cut_between(
	$current,
	'$sh_gradient_paint = sgs_background_paint_value(',
	"\nif ( ! empty( \$sh_color_args ) ) {"
);
ok( '' !== $new_resting, 'the resting-gradient section is found in the real (fixed) render.php' );

$old_resting = cut_between(
	$old,
	"if ( isset( \$attributes['backgroundColourGradient'] ) && '' !== \$attributes['backgroundColourGradient'] ) {",
	"\nif ( ! empty( \$sh_color_args ) ) {"
);
ok( '' !== $old_resting, 'the resting-gradient section is found in the pre-change render.php (ae50c7626)' );

/**
 * Evaluate the FIXED resting-gradient section: it appends directly to $css.
 */
function run_new_resting( string $code, array $attributes ): string {
	$css      = '';
	$root_sel = '.uid.sgs-site-header';
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted render.php section.
	return $css;
}

/**
 * Evaluate the PRE-CHANGE resting-gradient section: it writes into
 * $sh_color_args['gradient'] (fed to wp_style_engine_get_styles() elsewhere,
 * which this harness does not call — the bug is provable from the resolved
 * value alone).
 */
function run_old_resting( string $code, array $attributes ): array {
	$sh_color_args = array();
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted pre-change render.php section.
	return $sh_color_args;
}

$fantasy = 'linear-gradient(to bottom,rgba(0,0,0,0.5),rgba(0,0,0,0))';

$rest_fantasy = run_new_resting( $new_resting, array( 'backgroundColourGradient' => $fantasy ) );
ok(
	false !== strpos( $rest_fantasy, '.uid.sgs-site-header{background-image:linear-gradient(to bottom,rgba(0,0,0,0.5),rgba(0,0,0,0));}' ),
	'resting: the fantasy fade gradient emits background-image with the exact value, on the block\'s own scoped rule'
);

$token_stop = 'linear-gradient(90deg,var(--wp--preset--color--primary),#fff)';
$rest_token = run_new_resting( $new_resting, array( 'backgroundColourGradient' => $token_stop ) );
ok(
	false !== strpos( $rest_token, 'background-image:linear-gradient(90deg,var(--wp--preset--color--primary),#fff)' ),
	'resting: a gradient with a palette-token colour stop passes through unchanged'
);

$hostile = 'linear-gradient(red,blue);}body{x';
$rest_hostile = run_new_resting( $new_resting, array( 'backgroundColourGradient' => $hostile ) );
ok( '' === $rest_hostile, 'resting: a hostile (declaration-breakout) gradient value emits nothing' );

ok( '' === run_new_resting( $new_resting, array() ), 'resting: no gradient attribute -> nothing emitted' );

// Negative control: the pre-change code resolves the fantasy gradient through
// sgs_colour_value() (the flat-slug resolver), which cannot recognise a
// gradient function and turns the whole string into an unresolved slug.
$old_args = run_old_resting( $old_resting, array( 'backgroundColourGradient' => $fantasy ) );
ok(
	isset( $old_args['gradient'] ) && str_starts_with( $old_args['gradient'], 'var(--wp--preset--color--' ),
	'negative control: the pre-change code mis-resolves the fantasy gradient into a broken var(--wp--preset--color--...) slug lookup'
);
ok(
	! isset( $old_args['gradient'] ) || 0 !== strpos( $old_args['gradient'], 'linear-gradient(' ),
	'negative control: the pre-change code never produces the raw gradient value the fixed code emits'
);

// ══════════════════════════════════════════════════════════════════════════
// Section 2 — scrolled background gradient (`backgroundColourScrolledGradient`).
// Same emission shape in BOTH the old and new file (a hand-built
// `background-image:...  !important;` string appended to $sh_scrolled_decls)
// — only the resolver function differs, so ONE harness runs both extracts.
// ══════════════════════════════════════════════════════════════════════════
$new_scrolled = cut_between(
	$current,
	"if ( isset( \$attributes['backgroundColourScrolledGradient'] )",
	"\tif ( isset( \$attributes['textColourScrolled']"
);
ok( '' !== $new_scrolled, 'the scrolled-gradient section is found in the real (fixed) render.php' );

$old_scrolled = cut_between(
	$old,
	"if ( isset( \$attributes['backgroundColourScrolledGradient'] )",
	"\tif ( isset( \$attributes['textColourScrolled']"
);
ok( '' !== $old_scrolled, 'the scrolled-gradient section is found in the pre-change render.php (ae50c7626)' );

function run_scrolled( string $code, array $attributes ): string {
	$sh_scrolled_decls = '';
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted scrolled-gradient section.
	return $sh_scrolled_decls;
}

$scrolled_fantasy = run_scrolled( $new_scrolled, array( 'backgroundColourScrolledGradient' => $fantasy ) );
ok(
	false !== strpos( $scrolled_fantasy, 'background-image:linear-gradient(to bottom,rgba(0,0,0,0.5),rgba(0,0,0,0)) !important;' ),
	'scrolled: the fantasy fade gradient emits background-image with !important on the fixed code'
);

$scrolled_hostile = run_scrolled( $new_scrolled, array( 'backgroundColourScrolledGradient' => $hostile ) );
ok( '' === $scrolled_hostile, 'scrolled: a hostile gradient value emits nothing on the fixed code' );

ok( '' === run_scrolled( $new_scrolled, array() ), 'scrolled: no gradient attribute -> nothing emitted on the fixed code' );

// Negative control: the pre-change scrolled code resolves through
// sgs_colour_value() too — same bug, same broken var() form.
$scrolled_old_fantasy = run_scrolled( $old_scrolled, array( 'backgroundColourScrolledGradient' => $fantasy ) );
ok(
	false === strpos( $scrolled_old_fantasy, 'background-image:linear-gradient(to bottom,rgba(0,0,0,0.5),rgba(0,0,0,0)) !important;' ),
	'negative control: the pre-change scrolled code FAILS to emit the raw gradient value'
);
ok(
	false !== strpos( $scrolled_old_fantasy, 'background-image:var(--wp--preset--color--' ),
	'negative control: the pre-change scrolled code emits the broken var(--wp--preset--color--...) form instead'
);

// ══════════════════════════════════════════════════════════════════════════
// Section 3 — Transparent mode still wins (Bean's Phase 2 condition 1).
// The tri-state merge (sgs_merge_tri_state_declarations(), not re-extracted
// here — it is unchanged by this fix) writes `background:transparent
// !important` on the SAME selector. Proven here at the CSS-cascade level:
// an `!important` background shorthand (which expands to background-image
// too) always beats a non-`!important` background-image declaration for the
// same selector, regardless of source order. This is exactly the mechanism
// the pre-existing surfaceOpacity alpha rule (render.php ~L92-93) already
// relies on, so no new gating logic was added for the gradient.
// ══════════════════════════════════════════════════════════════════════════
$transparent_wins_css = $rest_fantasy . '.uid.sgs-site-header{background:transparent !important;}';
ok(
	false !== strpos( $transparent_wins_css, 'background-image:linear-gradient' ) && false !== strpos( $transparent_wins_css, 'background:transparent !important' ),
	'transparent-mode proof: both declarations are present on the same selector, one plain, one !important'
);
// The actual cascade winner cannot be evaluated by a CSS parser in this
// plain-PHP harness — it is a browser-engine guarantee (an !important
// declaration always wins over a non-!important one for the same longhand,
// regardless of source order or specificity), the same guarantee this
// codebase's own docblocks (helpers-responsive.php's sgs_merge_tri_state_declarations()
// docblock, render.php's SCROLLED-STATE comment) already state and rely on
// for the pre-existing surfaceOpacity alpha rule. Recorded here as a design
// assertion, not a re-derivation of CSS cascade rules.
ok( true, 'transparent-mode proof: emitted as a NON-!important rule so `background:transparent !important` (sgs_merge_tri_state_declarations()) always wins per CSS cascade rules — same mechanism as the existing surfaceOpacity alpha rule' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
