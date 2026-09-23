<?php
/**
 * Standalone test for sgs/post-grid's hover-shadow branch (design H4, task lift-2).
 *
 * Before this fix, `.sgs-post-grid__card--card:hover, .sgs-post-grid__card--flat:hover` lifted
 * UNCONDITIONALLY via a hardcoded literal CSS fallback, ignoring `shadowLiftOnHover` entirely —
 * flagged as a residual gap in the original task lift-2 report and hand-reviewed in the
 * detector rather than fixed. This closes it: the branch now honours the switch and uses the
 * automatic per-preset lift (`sgs_shadow_hover_value()`) unless an explicit hover is set.
 *
 * Extracted from the REAL source between two fixed anchors and `eval()`'d against fixtures —
 * same technique as `run-nav-drawer-surface-standalone.php` / `run-shadow-hover-rules-
 * standalone.php`'s wrapper section — so a change to the shipped branch is a change to what
 * this test covers, never a copy that can drift.
 *
 *   php plugins/sgs-blocks/tests/php/run-post-grid-hover-shadow-standalone.php
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
if ( ! function_exists( 'sanitize_text_field' ) ) {
	function sanitize_text_field( $text ): string {
		return trim( (string) $text );
	}
}
$GLOBALS['sgs_test_hover_map'] = array( 'whisper' => 'soft' );
if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( array $path ) {
		if ( 'custom' === $path[0] && 'shadowHover' === ( $path[1] ?? null ) ) {
			return $GLOBALS['sgs_test_hover_map'];
		}
		return null;
	}
}

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

$src          = file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/post-grid/render.php' );
$start_anchor = '// HOVER shadow (design H4, task lift-2)';
$start_pos    = strpos( $src, $start_anchor );
ok( false !== $start_pos, 'HOVER shadow anchor found in the real post-grid/render.php source (extraction is sound)' );

$assign_pos = strpos( $src, "\$hover_shadow_value = '';", $start_pos );
ok( false !== $assign_pos, 'assignment line found right after the anchor' );

// Walk the if/elseif chain by BALANCED-BRACE counting (never a fixed line count, so a change
// to the shipped branch's body length still extracts correctly) — continuing past each closing
// brace only when the next token is `elseif`, so the walk stops exactly at the chain's real end.
$if_pos = strpos( $src, 'if (', $assign_pos );
$pos    = $if_pos;
while ( true ) {
	$brace_start = strpos( $src, '{', $pos );
	$depth       = 0;
	$p           = $brace_start;
	do {
		if ( '{' === $src[ $p ] ) {
			++$depth;
		} elseif ( '}' === $src[ $p ] ) {
			--$depth;
		}
		++$p;
	} while ( $depth > 0 && $p < strlen( $src ) );
	$pos  = $p;
	$rest = ltrim( substr( $src, $pos, 20 ) );
	if ( str_starts_with( $rest, 'elseif' ) ) {
		$pos = strpos( $src, '{', $pos );
		continue;
	}
	break;
}
$branch_code = substr( $src, $assign_pos, $pos - $assign_pos );
ok( str_contains( $branch_code, 'elseif' ) && str_contains( $branch_code, 'sgs_shadow_hover_value' ), 'extracted branch carries both the explicit and automatic-lift arms' );

function run_post_grid_hover_branch( string $code, string $shadow, string $shadow_colour, string $hover_shadow, string $hover_shadow_colour, array $extra_attrs, ?string $block_name ): string {
	$attributes = array_merge(
		array(
			'shadow'            => $shadow,
			'shadowColour'      => $shadow_colour,
			'shadowHover'       => $hover_shadow,
			'shadowColourHover' => $hover_shadow_colour,
		),
		$extra_attrs
	);
	$block = $block_name ? null : null; // see note in run-shadow-hover-rules-standalone.php's wrapper eval — direct-call coverage proves the registry gate; this eval proves the BRANCH CHOICE.
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged
	return $hover_shadow_value;
}

// --- automatic lift fires when nothing explicit is set, switch on by default -----------
$auto = run_post_grid_hover_branch( $branch_code, 'whisper', '', '', '', array(), null );
ok( '' !== $auto, 'MUST-PASS: automatic lift fires when no explicit hover is set' );
ok( str_contains( $auto, '--wp--preset--shadow--soft' ), 'the automatic lift resolves the correct mapped preset (whisper -> soft)' );

// --- explicit hover wins outright, even though it differs from the automatic lift ------
$explicit = run_post_grid_hover_branch( $branch_code, 'whisper', '', 'hard', '', array(), null );
ok( '' !== $explicit && ! str_contains( $explicit, '--wp--preset--shadow--soft' ), 'MUST-PASS: an explicit hover shape wins over the automatic lift' );

// --- MUST-FLAG negative control: the switch off suppresses ONLY the automatic branch ---
$off = run_post_grid_hover_branch( $branch_code, 'whisper', '', '', '', array( 'shadowLiftOnHover' => false ), null );
ok( '' === $off, 'MUST-FLAG would-be-lift suppressed: no automatic hover-shadow value when shadowLiftOnHover === false' );

$off_explicit = run_post_grid_hover_branch( $branch_code, 'whisper', '', 'hard', '', array( 'shadowLiftOnHover' => false ), null );
ok( '' !== $off_explicit, 'negative control: the switch being off does NOT suppress an EXPLICIT hover' );

// --- no resting shadow at all: nothing emitted ------------------------------------------
$none = run_post_grid_hover_branch( $branch_code, '', '', '', '', array(), null );
ok( '' === $none, 'no resting shadow at all: no automatic hover-shadow value' );

echo "\n{$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );
