<?php
/**
 * Standalone test for the `surfaceTone` override in
 * includes/class-sgs-container-wrapper.php (U-13 §4.3/§4.4,
 * .claude/reports/2026-09-26-u13-header-ink-design.md): 'light'/'dark' must
 * stamp the `sgs-on-*` class directly and skip sgs_surface_tone_class()'s
 * layer walk entirely; 'auto' (and any invalid stored value) must keep the
 * automatic judgement.
 *
 * class-sgs-container-wrapper.php's render() cannot be called whole outside
 * WordPress (block context, dozens of helpers) — same constraint
 * run-surface-private-standalone.php documents. This runner extracts the
 * EXACT tone-computation section from the REAL render.php (between the
 * `$tone_layers = array();` line and the "Hover-spill-scale marker" comment)
 * and evaluates that text against fixtures, so a change to the shipped code
 * is a change to what is tested — nothing here is a hand-copied duplicate.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-surface-tone-override-standalone.php
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

// Same palette shape run-surface-tone-standalone.php / run-surface-private-standalone.php stub.
if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( array $path ) {
		if ( array( 'color', 'gradients' ) === $path ) {
			return array();
		}
		return array(
			'theme' => array(
				array(
					'slug'  => 'primary',
					'color' => '#075E80', // A real dark P1 colour from the design note.
				),
			),
		);
	}
}

if ( ! function_exists( 'absint' ) ) {
	function absint( $value ): int {
		return abs( (int) $value );
	}
}

$sgs_test_dark_enqueue_calls = 0;
if ( ! function_exists( 'sgs_shadow_dark_enqueue' ) ) {
	function sgs_shadow_dark_enqueue(): void {
		global $sgs_test_dark_enqueue_calls;
		++$sgs_test_dark_enqueue_calls;
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/helpers-colour-wcag.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-surface-tone.php';

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

// ── Extract the tone section from the real class-sgs-container-wrapper.php ──
$cw_path   = dirname( __DIR__, 2 ) . '/includes/class-sgs-container-wrapper.php';
$cw_source = (string) file_get_contents( $cw_path );
$cw_start  = strpos( $cw_source, '$tone_layers = array();' );
$cw_end    = strpos( $cw_source, 'Hover-spill-scale marker' );
ok( false !== $cw_start && false !== $cw_end && $cw_end > $cw_start, 'the tone section is found in the real class-sgs-container-wrapper.php' );

if ( false === $cw_start || false === $cw_end || $cw_end <= $cw_start ) {
	echo "\n==== {$pass} passed, {$fail} failed ====\n";
	exit( 1 );
}

// Cut back to the start of the LINE that introduces the "Hover-spill-scale
// marker" comment (whatever its exact leading whitespace is) — everything
// from $cw_start up to (not including) that line.
$cw_line_start = (int) strrpos( substr( $cw_source, 0, $cw_end ), "\n" ) + 1;
$cw_section    = substr( $cw_source, $cw_start, $cw_line_start - $cw_start );
ok( '' !== trim( $cw_section ), 'the extracted tone section is non-empty' );

/**
 * Run the extracted tone section against the given inputs and return the
 * resulting classes array (only the tone-relevant entries matter).
 *
 * @param string $code       The PHP text of the tone section.
 * @param array  $attributes Block attributes (surfaceTone + background attrs).
 * @param bool   $has_bg_image
 * @param array  $bg_image
 * @param mixed  $overlay_opacity
 * @param mixed  $overlay_colour
 * @param mixed  $overlay_gradient
 * @return array{classes: array<int,string>, tone_class: string}
 */
function run_cw_tone( string $code, array $attributes, bool $has_bg_image, array $bg_image, $overlay_opacity, $overlay_colour, $overlay_gradient ): array {
	$classes = array();
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted render.php section.
	return array(
		'classes'    => $classes,
		'tone_class' => $tone_class ?? '',
	);
}

// ---------------------------------------------------------------------------
// surfaceTone: 'dark' stamps sgs-on-dark directly, no layers at all (no
// background attributes set — under the OLD code this would give no class).
// ---------------------------------------------------------------------------
$result = run_cw_tone( $cw_section, array( 'surfaceTone' => 'dark' ), false, array(), null, '', '' );
ok( 'sgs-on-dark' === $result['tone_class'], "surfaceTone:'dark' with NO layers stamps sgs-on-dark directly" );
ok( in_array( 'sgs-on-dark', $result['classes'], true ), 'sgs-on-dark lands in the classes array' );

// ---------------------------------------------------------------------------
// surfaceTone: 'light' stamps sgs-on-light directly, even over a dark colour
// that would otherwise judge dark — proves the override WINS over the
// automatic judgement, not merely agrees with it by coincidence.
// ---------------------------------------------------------------------------
$result = run_cw_tone( $cw_section, array( 'surfaceTone' => 'light', 'backgroundColour' => '#075E80' ), false, array(), null, '', '' );
ok( 'sgs-on-light' === $result['tone_class'], "surfaceTone:'light' wins over a dark backgroundColour that would auto-judge dark" );

// Negative control for the above: WITHOUT the override (auto), the same dark
// colour correctly judges dark — proves the override test isn't vacuous
// (the colour genuinely would decide differently).
$result_auto = run_cw_tone( $cw_section, array( 'surfaceTone' => 'auto', 'backgroundColour' => '#075E80' ), false, array(), null, '', '' );
ok( 'sgs-on-dark' === $result_auto['tone_class'], 'negative control: the SAME dark backgroundColour under surfaceTone:auto judges dark (the override in the test above is doing real work)' );

// ---------------------------------------------------------------------------
// surfaceTone: 'auto' (explicit) keeps the automatic judgement — a light
// colour still judges light.
// ---------------------------------------------------------------------------
$result = run_cw_tone( $cw_section, array( 'surfaceTone' => 'auto', 'backgroundColour' => '#FFFFFF' ), false, array(), null, '', '' );
ok( 'sgs-on-light' === $result['tone_class'], "surfaceTone:'auto' with a light backgroundColour judges light (automatic path)" );

// ---------------------------------------------------------------------------
// surfaceTone unset entirely (the real-world default — WP omits an attribute
// equal to its declared default) behaves exactly like 'auto'.
// ---------------------------------------------------------------------------
$result = run_cw_tone( $cw_section, array( 'backgroundColour' => '#075E80' ), false, array(), null, '', '' );
ok( 'sgs-on-dark' === $result['tone_class'], 'surfaceTone unset (default) behaves like auto: the dark colour judges dark' );

// ---------------------------------------------------------------------------
// An invalid/garbage stored surfaceTone value falls back to auto rather than
// silently misbehaving (WP enum coercion normally prevents this, but the
// server-side allow-list must not trust the client).
// ---------------------------------------------------------------------------
$result = run_cw_tone( $cw_section, array( 'surfaceTone' => 'not-a-real-value', 'backgroundColour' => '#FFFFFF' ), false, array(), null, '', '' );
ok( 'sgs-on-light' === $result['tone_class'], 'an invalid stored surfaceTone value falls back to auto' );

echo "\n==== {$pass} passed, {$fail} failed ====\n";
exit( $fail > 0 ? 1 : 0 );
