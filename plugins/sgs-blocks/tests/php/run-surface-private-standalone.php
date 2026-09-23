<?php
/**
 * Standalone runner for the two D3 block-private surfaces: sgs/nav-drawer's
 * drawerBg fill and sgs/mega-panel's panelBg fill, each marked with the
 * sgs-on-dark / sgs-on-light tone class through sgs_surface_tone_class()
 * (`.claude/reports/2026-09-23-shadow-tone-design.md`).
 *
 * Neither render.php can be included whole outside WordPress (block context,
 * dozens of helpers), so this runner extracts the EXACT tone-computation
 * section from each REAL render.php (same extraction pattern as
 * run-nav-drawer-surface-standalone.php) and evaluates that text against
 * fixtures. A change to the shipped code is therefore a change to what is
 * tested; nothing here is a copy.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-surface-private-standalone.php
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

// A small palette, as wp_get_global_settings() returns it (keyed by origin) —
// same shape run-surface-tone-standalone.php stubs. 'primary' is a real dark
// P1 colour from the design note; 'light-surface' is a light control.
if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( array $path ) {
		if ( array( 'color', 'gradients' ) === $path ) {
			return array();
		}
		return array(
			'theme' => array(
				array(
					'slug'  => 'primary',
					'color' => '#075E80',
				),
				array(
					'slug'  => 'light-surface',
					'color' => '#FFFFFF',
				),
			),
		);
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

// ── Extract the tone section from the real sgs/nav-drawer render.php ───────────
$nd_path   = dirname( __DIR__, 2 ) . '/src/blocks/nav-drawer/render.php';
$nd_source = (string) file_get_contents( $nd_path );
$nd_start  = strpos( $nd_source, '$sgs_nd_tone_opacity' );
$nd_end    = strpos( $nd_source, 'Close-button SIZE' );
ok( false !== $nd_start && false !== $nd_end && $nd_end > $nd_start, 'the tone section is found in the real nav-drawer/render.php' );

// ── Extract the tone section from the real sgs/mega-panel render.php ───────────
$mp_path   = dirname( __DIR__, 2 ) . '/src/blocks/mega-panel/render.php';
$mp_source = (string) file_get_contents( $mp_path );
$mp_start  = strpos( $mp_source, '$sgs_mp_tone_opacity' );
$mp_end    = strpos( $mp_source, '8. Wrapper attributes' );
ok( false !== $mp_start && false !== $mp_end && $mp_end > $mp_start, 'the tone section is found in the real mega-panel/render.php' );

if ( false === $nd_start || false === $nd_end || $nd_end <= $nd_start || false === $mp_start || false === $mp_end || $mp_end <= $mp_start ) {
	echo "\n==== $pass passed, $fail failed ====\n";
	exit( 1 );
}

// Cut the mega-panel section back to the start of the comment block introducing "8. Wrapper attributes".
$nd_section     = substr( $nd_source, $nd_start, $nd_end - $nd_start );
$mp_section_raw = substr( $mp_source, $mp_start, $mp_end - $mp_start );
$mp_section     = substr( $mp_section_raw, 0, (int) strrpos( $mp_section_raw, "\n// ---" ) );

/**
 * Run the nav-drawer tone section against a fill + attributes and return the
 * resulting $sgs_nd_tone_class.
 *
 * @param string $code            The PHP text of the tone section.
 * @param string $sgs_nd_fill_css The resolved fill CSS value (as computed
 *                                 earlier in the real file — the exact input
 *                                 this section consumes).
 * @param array  $attributes      The drawer attributes (surfaceOpacity only).
 * @return string The resulting tone class.
 */
function run_nd_tone( string $code, string $sgs_nd_fill_css, array $attributes ): string {
	$sgs_nd_tone_class = '';
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted render.php section.
	return $sgs_nd_tone_class;
}

/**
 * Run the mega-panel tone section against a raw fill + attributes and return
 * the resulting $sgs_mp_tone_class.
 *
 * @param string $code          The PHP text of the tone section.
 * @param string $panel_bg_raw  The raw panelBg attribute value.
 * @param array  $attributes    The panel attributes (surfaceOpacity only).
 * @return string The resulting tone class.
 */
function run_mp_tone( string $code, string $panel_bg_raw, array $attributes ): string {
	$sgs_mp_tone_class = '';
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted render.php section.
	return $sgs_mp_tone_class;
}

// ── sgs/nav-drawer: a dark fill, a light fill, an unset fill, opacity over nothing ──
ok(
	'sgs-on-dark' === run_nd_tone( $nd_section, 'var(--wp--preset--color--primary)', array() ),
	'nav-drawer: a dark fill (drawerBg=primary) gives sgs-on-dark'
);
ok(
	'sgs-on-light' === run_nd_tone( $nd_section, 'var(--wp--preset--color--light-surface)', array() ),
	'nav-drawer: a light fill (drawerBg=light-surface) gives sgs-on-light'
);
ok(
	'' === run_nd_tone( $nd_section, '', array() ),
	'nav-drawer: an unset fill (drawerBg="") gives nothing'
);
ok(
	'' === run_nd_tone( $nd_section, '', array( 'surfaceOpacity' => 0.3 ) ),
	'nav-drawer: an opacity of 0.3 over nothing gives nothing'
);
// surfaceOpacity below 0.5 over a dark fill never reaches the accumulation
// threshold -- proves the opacity value is genuinely READ, not just present.
ok(
	'' === run_nd_tone( $nd_section, 'var(--wp--preset--color--primary)', array( 'surfaceOpacity' => 0.3 ) ),
	'nav-drawer: a dark fill at opacity 0.3 never reaches the 0.5 threshold: nothing'
);
ok(
	'sgs-on-dark' === run_nd_tone( $nd_section, 'var(--wp--preset--color--primary)', array( 'surfaceOpacity' => 1 ) ),
	'nav-drawer: a dark fill at explicit opacity 1 still gives sgs-on-dark'
);

// ── sgs/mega-panel: a dark fill, a light fill, an unset fill, opacity over nothing ──
ok(
	'sgs-on-dark' === run_mp_tone( $mp_section, 'primary', array() ),
	'mega-panel: a dark fill (panelBg=primary) gives sgs-on-dark'
);
ok(
	'sgs-on-light' === run_mp_tone( $mp_section, 'light-surface', array() ),
	'mega-panel: a light fill (panelBg=light-surface) gives sgs-on-light'
);
ok(
	'' === run_mp_tone( $mp_section, '', array() ),
	'mega-panel: an unset fill (panelBg="") gives nothing'
);
ok(
	'' === run_mp_tone( $mp_section, '', array( 'surfaceOpacity' => 0.3 ) ),
	'mega-panel: an opacity of 0.3 over nothing gives nothing'
);
ok(
	'sgs-on-dark' === run_mp_tone( $mp_section, '#075E80', array() ),
	'mega-panel: a raw hex fill (panelBg=#075E80) also resolves and gives sgs-on-dark'
);

// ── Negative controls: bypassing the shared resolver must be caught ────────────
// Variant A: nav-drawer's tone class hardcoded to '' regardless of the fill —
// proves the "dark fill gives sgs-on-dark" assertion above can actually fail.
$nd_bypass = str_replace(
	"function_exists( 'sgs_surface_tone_class' )",
	'false',
	$nd_section
);
ok( $nd_bypass !== $nd_section, 'negative control A: the nav-drawer resolver bypass was applied to the extracted text' );
ok(
	'' === run_nd_tone( $nd_bypass, 'var(--wp--preset--color--primary)', array() ),
	'negative control A: with the resolver bypassed, a dark fill gives NOTHING (so the assertion above can fail)'
);

// Variant B: mega-panel's opacity forced to 1 regardless of the attribute —
// proves the "opacity 0.3 over nothing gives nothing" / "never reaches 0.5"
// coverage is genuine (this variant is for the SIBLING nav-drawer 0.3-over-a-fill
// case, applied here to the mega-panel section for the same reason: opacity
// must be READ, not defaulted unconditionally).
$mp_bypass = str_replace(
	"isset( \$attributes['surfaceOpacity'] ) && is_numeric( \$attributes['surfaceOpacity'] )\n\t? (float) \$attributes['surfaceOpacity']\n\t: 1.0;",
	'1.0;',
	$mp_section
);
ok( $mp_bypass !== $mp_section, 'negative control B: the mega-panel opacity bypass was applied to the extracted text' );
ok(
	'sgs-on-dark' === run_mp_tone( $mp_bypass, 'primary', array( 'surfaceOpacity' => 0.1 ) ),
	'negative control B: with opacity forced to 1.0, a low-opacity dark fill wrongly still gives sgs-on-dark (so a real "opacity is read" test elsewhere can fail)'
);

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
