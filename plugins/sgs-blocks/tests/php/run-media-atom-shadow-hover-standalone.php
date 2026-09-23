<?php
/**
 * Standalone tests for the `shadow` media atom's AUTOMATIC LIFT
 * (`includes/media/atoms/shadow.php::sgs_media_atom_shadow_css()`, design H4/H5, task lift-2).
 *
 * Prior to this fix, `sgs/media`'s `boxShadow` looked dead by a shallow read of render.php
 * (it never appears there) — a deeper read found it IS painted, through the L4 shared
 * stylesheet `assets/css/media-atoms/shadow.css`, which already reads
 * `--sgs-media-box-shadow`/`--sgs-media-box-shadow-hover` on `.sgs-media-el`. The only real
 * gap was the automatic lift: the hover custom property was only ever filled when an EXPLICIT
 * hover colour was set. This test proves the automatic branch now fills it too, without
 * touching the resting property, the explicit branch, or the shared stylesheet at all.
 *
 *   php plugins/sgs-blocks/tests/php/run-media-atom-shadow-hover-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
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
require_once dirname( __DIR__, 2 ) . '/includes/media/atoms/shadow.php';

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

function decls_to_map( array $decls ): array {
	$out = array();
	foreach ( $decls as $d ) {
		[ $prop, $value ] = array_map( 'trim', explode( ':', $d, 2 ) );
		$out[ $prop ] = $value;
	}
	return $out;
}

// --- resting shadow alone: no hover at all ---------------------------------------------
$resting_only = decls_to_map( sgs_media_atom_shadow_css( array( 'boxShadow' => 'whisper' ), '', 'sgs/media' ) );
ok( isset( $resting_only['--sgs-media-box-shadow'] ), 'resting shadow custom property emitted' );

// --- MUST-PASS: automatic lift fills the hover custom property with no explicit hover --
ok( isset( $resting_only['--sgs-media-box-shadow-hover'] ), 'MUST-PASS: automatic lift fills --sgs-media-box-shadow-hover when nothing explicit is set' );
ok( 'var(--wp--preset--shadow--soft)' === $resting_only['--sgs-media-box-shadow-hover'], 'the automatic lift resolves the correct mapped preset (whisper -> soft)' );

// --- explicit hover colour wins outright over the automatic lift ------------------------
$explicit = decls_to_map(
	sgs_media_atom_shadow_css( array( 'boxShadow' => 'whisper', 'boxShadowColourHover' => '#ff0000' ), '', 'sgs/media' )
);
ok( isset( $explicit['--sgs-media-box-shadow-hover'] ), 'explicit hover colour produces a hover declaration' );
ok(
	'var(--wp--preset--shadow--soft)' !== $explicit['--sgs-media-box-shadow-hover'],
	'MUST-PASS: an explicit hover colour wins over the automatic lift (does not resolve to the auto-lift preset)'
);

// --- MUST-FLAG negative control: the switch off suppresses the automatic lift -----------
$off = decls_to_map(
	sgs_media_atom_shadow_css( array( 'boxShadow' => 'whisper', 'shadowLiftOnHover' => false ), '', 'sgs/media' )
);
ok( ! isset( $off['--sgs-media-box-shadow-hover'] ), 'MUST-FLAG would-be-lift suppressed: no automatic hover when shadowLiftOnHover === false' );
ok( isset( $off['--sgs-media-box-shadow'] ), 'the resting shadow is UNAFFECTED by the switch (only the hover branch is gated)' );

// --- negative control: switch off does NOT suppress an EXPLICIT hover -------------------
$off_explicit = decls_to_map(
	sgs_media_atom_shadow_css(
		array( 'boxShadow' => 'whisper', 'boxShadowColourHover' => '#ff0000', 'shadowLiftOnHover' => false ),
		'',
		'sgs/media'
	)
);
ok( isset( $off_explicit['--sgs-media-box-shadow-hover'] ), 'negative control: the switch being off does NOT suppress an EXPLICIT hover colour' );

// --- no resting shape at all: nothing emitted -------------------------------------------
ok( array() === sgs_media_atom_shadow_css( array(), '', 'sgs/media' ), 'no boxShadow attribute at all: nothing emitted' );

echo "\n{$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );
