<?php
/**
 * Standalone tests for the dark variants of the theme's shadow presets:
 * includes/helpers-shadow-dark.php.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-shadow-dark-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals
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
// The presets the stub settings return. Each test group replaces this, then refreshes the memo.
$GLOBALS['sgs_test_presets'] = array();
if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( array $path ) {
		return $GLOBALS['sgs_test_presets'];
	}
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-shadow-dark.php';

$fail = 0;
function t_same( $expected, $actual ): bool {
	return $expected === $actual;
}
function t_eq( $expected, $actual, string $label ): void {
	global $fail;
	if ( ! t_same( $expected, $actual ) ) {
		++$fail;
		fwrite( STDERR, "FAIL {$label}\n  expected: " . json_encode( $expected ) . "\n  actual:   " . json_encode( $actual ) . "\n" );
	}
}

const T_SITE = 'var(--wp--custom--shadow-colour)';

/**
 * True when text carries none of the characters or sequences that could break out of a declaration.
 *
 * @param string $css Generated text.
 * @return bool
 */
function t_clean( string $css ): bool {
	return 0 === preg_match( '/[<>"\'`!\x5C]|url\(|\/\*/', $css );
}

function t_mix( string $n ): string {
	return 'color-mix(in srgb, ' . T_SITE . ' ' . $n . '%, transparent)';
}

// 1. The worked example.
t_eq(
	'0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent), 0px 1px 2px 0px color-mix(in srgb, #000000 13.2%, transparent), 0px 4px 12px 0px color-mix(in srgb, #000000 22%, transparent)',
	sgs_shadow_dark_variant( '0px 1px 2px 0px ' . t_mix( '6' ) . ', 0px 4px 12px 0px ' . t_mix( '10' ) ),
	'worked example'
);
t_eq(
	'0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent), 0px 1px 2px 0px color-mix(in srgb, #000000 11%, transparent), 0px 4px 8px -2px color-mix(in srgb, #000000 17.6%, transparent), 0px 12px 24px -6px color-mix(in srgb, #000000 26.4%, transparent)',
	sgs_shadow_dark_variant( '0px 1px 2px 0px ' . t_mix( '5' ) . ', 0px 4px 8px -2px ' . t_mix( '8' ) . ', 0px 12px 24px -6px ' . t_mix( '12' ) ),
	'Lifted preset: 26.4 keeps its decimal, 11 loses its trailing zero'
);
t_eq(
	'0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent), 0px 1px 2px 0px color-mix(in srgb, #000000 20%, transparent)',
	sgs_shadow_dark_variant( '0px 1px 2px 0px ' . t_mix( '9.1' ) ),
	'9.1 x 2.2 = 20.02 rounds to 20.0 and is written 20'
);

// 2. A 100% layer written as the bare variable.
t_eq(
	'0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent), 4px 4px 0px 0px #000000',
	sgs_shadow_dark_variant( '4px 4px 0px 0px ' . T_SITE ),
	'a 100% layer becomes plain #000000 and gets the ring'
);
t_eq(
	'0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent), 4px 4px 0px 0px #000000',
	sgs_shadow_dark_variant( '4px 4px 0px 0px ' . t_mix( '100' ) ),
	'an explicit 100% color-mix collapses to plain #000000'
);

// 3. An inset-only preset gets no ring.
t_eq(
	'inset 0px 2px 4px 0px color-mix(in srgb, #000000 30.8%, transparent)',
	sgs_shadow_dark_variant( 'inset 0px 2px 4px 0px ' . t_mix( '14' ) ),
	'inset-only preset: no ring'
);

// 4. One inset and one outer site layer: the ring is present.
t_eq(
	'0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent), inset 0px 2px 4px 0px color-mix(in srgb, #000000 30.8%, transparent), 0px 4px 8px 0px color-mix(in srgb, #000000 17.6%, transparent)',
	sgs_shadow_dark_variant( 'inset 0px 2px 4px 0px ' . t_mix( '14' ) . ', 0px 4px 8px 0px ' . t_mix( '8' ) ),
	'mixed inset and outer: ring present, order kept'
);

// 5. Brand-only returns null; a mixed preset keeps the brand layer verbatim.
$brand = 'color-mix(in srgb, var(--wp--preset--color--primary) 55%, transparent)';
t_eq( null, sgs_shadow_dark_variant( '0px 0px 16px 0px ' . $brand ), 'all-brand Glow preset has no variant' );
t_eq( null, sgs_shadow_dark_variant( '0px 0px 16px 0px var(--wp--preset--color--primary)' ), 'a bare palette variable alone has no variant' );
t_eq(
	'0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent), 0px 0px 16px 0px ' . $brand . ', 0px 4px 8px 0px color-mix(in srgb, #000000 17.6%, transparent)',
	sgs_shadow_dark_variant( '0px 0px 16px 0px ' . $brand . ', 0px 4px 8px 0px ' . t_mix( '8' ) ),
	'a brand layer is kept verbatim, only the site layer is transformed'
);

// 6. Hostile or unparseable input returns null and never emits its text.
$valid   = '0px 1px 2px 0px ' . t_mix( '6' );
$hostile = array(
	'semicolon'          => '0px 1px 2px 0px ' . T_SITE . ';',
	'closing brace'      => '0px 1px 2px 0px ' . T_SITE . '}',
	'opening brace'      => '0px 1px 2px 0px {' . T_SITE,
	'url()'              => '0px 1px 2px 0px url(https://evil.example/x.png)',
	'comment opener'     => '0px 1px 2px 0px ' . T_SITE . ' /*',
	'!important'         => '0px 1px 2px 0px ' . T_SITE . ' !important',
	'em length'          => '1em 1px 2px 0px ' . T_SITE,
	'keyword colour'     => '0px 1px 2px 0px red',
	'unknown var'        => '0px 1px 2px 0px var(--evil)',
	'mix inner red'      => '0px 1px 2px 0px color-mix(in srgb, red 10%, transparent)',
	'mix percent abc'    => '0px 1px 2px 0px color-mix(in srgb, ' . T_SITE . ' abc%, transparent)',
	'mix trailing junk'  => '0px 1px 2px 0px color-mix(in srgb, ' . T_SITE . ' 10%, transparent) red',
	'newline in colour'  => '0px 1px 2px 0px ' . T_SITE . "\nred",
	'too few lengths'    => '0px 1px 2px ' . T_SITE,
	'bare zero lengths'  => '0 1px 2px 0 ' . T_SITE,
	'empty'              => '',
	'valid plus hostile' => $valid . ', 0px 1px 2px 0px red',
	'hostile plus valid' => '0px 1px 2px 0px url(x), ' . $valid,
);
foreach ( $hostile as $name => $text ) {
	t_eq( null, sgs_shadow_dark_variant( $text ), "hostile input is rejected: {$name}" );
}
// A literal past the byte cap and one past the layer cap are refused, not truncated.
t_eq( null, sgs_shadow_dark_variant( implode( ', ', array_fill( 0, 9, $valid ) ) ), 'nine layers exceed the layer cap' );
t_eq( null, sgs_shadow_dark_variant( str_repeat( 'a', 2001 ) ), 'a literal past the byte cap is refused' );
// Case and sign edges of a layer.
$ring = '0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent)';
t_eq(
	'inset 0px 2px 4px 0px color-mix(in srgb, #000000 30.8%, transparent)',
	sgs_shadow_dark_variant( 'INSET 0px 2px 4px 0px ' . t_mix( '14' ) ),
	'INSET in capitals is accepted and written in lower case; an inset-only preset gets no ring'
);
t_eq(
	$ring . ', inset 0px 2px 4px 0px color-mix(in srgb, #000000 30.8%, transparent), 0px 4px 8px 0px color-mix(in srgb, #000000 17.6%, transparent)',
	sgs_shadow_dark_variant( 'Inset 0px 2px 4px 0px ' . t_mix( '14' ) . ', 0px 4px 8px 0px ' . t_mix( '8' ) ),
	'Inset in mixed case is accepted and still counts as an inset layer'
);
t_eq(
	$ring . ', inset 0px 0px 8px 0px color-mix(in srgb, var(--wp--preset--color--primary) 40%, transparent), 0px 1px 2px 0px #000000',
	sgs_shadow_dark_variant( 'INSET 0px 0px 8px 0px color-mix(in srgb, var(--wp--preset--color--primary) 40%, transparent), 0px 1px 2px 0px ' . T_SITE ),
	'a kept brand layer written INSET is normalised to lower case too'
);
t_eq( null, sgs_shadow_dark_variant( '0px 1px -2px 0px ' . t_mix( '6' ) ), 'a negative blur is rejected' );
t_eq(
	$ring . ', 0px 1px 2px -2px color-mix(in srgb, #000000 13.2%, transparent)',
	sgs_shadow_dark_variant( '0px 1px 2px -2px ' . t_mix( '6' ) ),
	'a negative spread (the fourth length) is legal and kept'
);
t_eq( true, t_clean( (string) sgs_shadow_dark_variant( $valid ) ), 'a valid variant carries no breakout characters' );
t_eq( false, t_clean( 'a;b !important' ), 'positive control: the breakout check can fail' );
t_eq( false, t_clean( 'url(x)' ), 'positive control: the breakout check catches url(' );

// 7. The alpha clamp: min( 100, 60 x 2.2 = 132 ) is 100, so the colour is plain #000000.
t_eq(
	'0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent), 0px 8px 24px 0px #000000',
	sgs_shadow_dark_variant( '0px 8px 24px 0px ' . t_mix( '60' ) ),
	'60% clamps to 100 and collapses to plain #000000'
);
t_eq(
	'0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent), 0px 8px 24px 0px color-mix(in srgb, #000000 44%, transparent)',
	sgs_shadow_dark_variant( '0px 8px 24px 0px ' . t_mix( '20' ) ),
	'20% x 2.2 = 44 stays a color-mix'
);

// 8. CSS assembly.
$GLOBALS['sgs_test_presets'] = array(
	'theme' => array(
		array(
			'slug'   => 'soft',
			'shadow' => '0px 1px 2px 0px ' . t_mix( '6' ),
		),
		array(
			'slug'   => 'pressed',
			'shadow' => 'inset 0px 2px 4px 0px ' . t_mix( '14' ),
		),
		array(
			'slug'   => 'glow',
			'shadow' => '0px 0px 16px 0px ' . $brand,
		),
		array(
			'slug'   => 'Bad Slug',
			'shadow' => '0px 1px 2px 0px ' . t_mix( '6' ),
		),
		array(
			'slug'   => 'x;y',
			'shadow' => '0px 1px 2px 0px ' . t_mix( '6' ),
		),
		array(
			'slug'   => 'not-a-string',
			'shadow' => array( 'x' ),
		),
	),
);
$decls                       = '--wp--preset--shadow--soft:0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent), 0px 1px 2px 0px color-mix(in srgb, #000000 13.2%, transparent);'
	. '--wp--preset--shadow--pressed:inset 0px 2px 4px 0px color-mix(in srgb, #000000 30.8%, transparent);';
t_eq(
	':root[data-theme="dark"]{' . $decls . '}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]):not([data-theme="dark"]){' . $decls . '}}',
	sgs_shadow_dark_preset_css( 'root', true ),
	'root scope: exact two-rule string; glow, Bad Slug, x;y and a non-string shadow are skipped'
);
t_eq(
	'.sgs-on-dark>*{--wp--custom--shadow-colour:#E8E8E8;' . $decls . '}',
	sgs_shadow_dark_preset_css( 'section' ),
	'section scope: exact rule targeting the children of a dark container'
);
t_eq( '', sgs_shadow_dark_preset_css( 'page' ), 'unknown scope returns an empty string' );
t_eq( '', sgs_shadow_dark_preset_css( '' ), 'empty scope returns an empty string' );

// The light scope resets a nested light container: original literals, black shadow colour, only presets that have a variant.
$light = '.sgs-on-light>*{--wp--custom--shadow-colour:#000000;'
	. '--wp--preset--shadow--soft:0px 1px 2px 0px ' . t_mix( '6' ) . ';'
	. '--wp--preset--shadow--pressed:inset 0px 2px 4px 0px ' . t_mix( '14' ) . ';}';
t_eq( $light, sgs_shadow_dark_preset_css( 'light' ), 'light scope: exact reset rule with the original literals' );
t_eq( false, str_contains( sgs_shadow_dark_preset_css( 'light' ), 'shadow--glow' ), 'light scope: an all-brand preset (no dark variant) is absent' );
t_eq( false, str_contains( sgs_shadow_dark_preset_css( 'light' ), 'Bad Slug' ) || str_contains( sgs_shadow_dark_preset_css( 'light' ), 'x;y' ), 'light scope: an invalid slug is skipped' );
t_eq( false, str_contains( sgs_shadow_dark_preset_css( 'light' ), 'color-mix(in srgb, #000000' ), 'light scope: carries no dark variant value' );
t_eq( false, str_contains( sgs_shadow_dark_preset_css( 'root' ), '.sgs-on-light' ) || str_contains( sgs_shadow_dark_preset_css( 'section' ), '.sgs-on-light' ), 'root and section scopes never include the light rule' );

// The memo is per request: changed settings are not seen until it is refreshed.
$GLOBALS['sgs_test_presets'] = array();
t_eq( true, '' !== sgs_shadow_dark_preset_css( 'root' ), 'the memo keeps the first result until refreshed' );
t_eq( '', sgs_shadow_dark_preset_css( 'root', true ), 'refresh recomputes: no presets gives an empty string' );

// No preset yields a variant.
$GLOBALS['sgs_test_presets'] = array(
	'theme' => array(
		array(
			'slug'   => 'glow',
			'shadow' => '0px 0px 16px 0px ' . $brand,
		),
	),
);
t_eq( '', sgs_shadow_dark_preset_css( 'root', true ), 'root: empty when no preset has a variant' );
t_eq( '', sgs_shadow_dark_preset_css( 'section' ), 'section: empty when no preset has a variant' );
t_eq( '', sgs_shadow_dark_preset_css( 'light' ), 'light: empty when no preset has a variant' );

// The REAL theme presets: nothing else binds the generator to what the theme ships, so a literal
// the grammar cannot read would silently lose its dark variant with every other test still green.
$theme_path = dirname( __DIR__, 4 ) . '/theme/sgs-theme/theme.json';
t_eq( true, is_readable( $theme_path ), 'the real theme.json is found at ' . $theme_path );
$theme_json    = json_decode( (string) file_get_contents( $theme_path ), true );
$real_presets  = $theme_json['settings']['shadow']['presets'] ?? array();
t_eq( true, count( $real_presets ) > 1, 'the real theme.json declares shadow presets (' . count( $real_presets ) . ')' );
$GLOBALS['sgs_test_presets'] = $real_presets;
$with_variant                = 0;
foreach ( $real_presets as $preset ) {
	$variant = sgs_shadow_dark_variant( $preset['shadow'] );
	if ( 'glow' === $preset['slug'] ) {
		t_eq( null, $variant, 'real preset glow (all brand colour) has no variant' );
	} else {
		t_eq( true, null !== $variant, 'real preset ' . $preset['slug'] . ' has a dark variant' );
	}
	if ( null !== $variant ) {
		++$with_variant;
	}
}
t_eq( count( $real_presets ) - 1, $with_variant, 'every real preset except glow has a variant (' . $with_variant . ' of ' . count( $real_presets ) . ')' );
$real_decls = sgs_shadow_dark_declarations( true );
t_eq( $with_variant, substr_count( $real_decls['dark'], '--wp--preset--shadow--' ), 'the real dark declarations carry one entry per variant' );
t_eq( $with_variant, substr_count( $real_decls['light'], '--wp--preset--shadow--' ), 'the real light declarations carry one entry per variant' );
t_eq( true, t_clean( $real_decls['dark'] ), 'the real dark declarations carry no breakout characters' );
t_eq( true, t_clean( $real_decls['light'] ), 'the real light declarations carry no breakout characters' );
foreach ( array( 'root', 'section', 'light' ) as $scope ) {
	t_eq( 0, preg_match( '/[<!]|url\(|\/\*/', sgs_shadow_dark_preset_css( $scope ) ), "the real {$scope} stylesheet has no markup, !important, url() or comment text" );
}

// A flat list is read the same as an origin-keyed array.
$GLOBALS['sgs_test_presets'] = array(
	array(
		'slug'   => 'soft',
		'shadow' => '0px 1px 2px 0px ' . t_mix( '6' ),
	),
);
t_eq(
	'.sgs-on-dark>*{--wp--custom--shadow-colour:#E8E8E8;--wp--preset--shadow--soft:0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent), 0px 1px 2px 0px color-mix(in srgb, #000000 13.2%, transparent);}',
	sgs_shadow_dark_preset_css( 'section', true ),
	'a flat preset list is understood'
);

// Origin precedence: custom, then theme, then default; the first entry per slug wins, even when it has no variant.
$GLOBALS['sgs_test_presets'] = array(
	'default' => array(
		array(
			'slug'   => 'soft',
			'shadow' => '0px 1px 2px 0px ' . t_mix( '30' ),
		),
	),
	'theme'   => array(
		array(
			'slug'   => 'soft',
			'shadow' => '0px 1px 2px 0px ' . t_mix( '6' ),
		),
		array(
			'slug'   => 'tinted',
			'shadow' => '0px 1px 2px 0px ' . t_mix( '5' ),
		),
	),
	'custom'  => array(
		array(
			'slug'   => 'tinted',
			'shadow' => '0px 0px 16px 0px ' . $brand,
		),
	),
);
t_eq(
	'.sgs-on-dark>*{--wp--custom--shadow-colour:#E8E8E8;--wp--preset--shadow--soft:0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent), 0px 1px 2px 0px color-mix(in srgb, #000000 13.2%, transparent);}',
	sgs_shadow_dark_preset_css( 'section', true ),
	'theme beats default; a custom preset with no variant still shadows the theme preset of the same slug'
);

// 9. Negative control: the hostile cases must be able to fail. A stub that returns its input unchanged
// is what an unguarded implementation looks like; count the hostile cases it would be caught by.
/**
 * Unguarded stand-in for sgs_shadow_dark_variant(): returns its input unchanged.
 *
 * @param string $literal Preset literal.
 * @return string|null The same text.
 */
function sgs_shadow_dark_variant_passthrough( string $literal ): ?string {
	return $literal;
}
$caught = 0;
foreach ( $hostile as $text ) {
	if ( null !== sgs_shadow_dark_variant_passthrough( $text ) ) {
		++$caught;
	}
}
t_eq( true, $caught >= 5, "negative control: the passthrough stub is caught by {$caught} hostile cases (need at least 5)" );

// Second control, on the VALID half: the passthrough stub above only proves the hostile cases can fail, and a
// stub that returned null for everything would pass all of them. Here a stub that is right except that it drops
// the ring must be caught by the valid cases, so a regression in the ring cannot hide.
/**
 * Stand-in for sgs_shadow_dark_variant() that is right except it never adds the ring.
 *
 * @param string $literal Preset literal.
 * @return string|null Real result minus the ring layer.
 */
function sgs_shadow_dark_variant_no_ring( string $literal ): ?string {
	$real = sgs_shadow_dark_variant( $literal );
	if ( null === $real ) {
		return null;
	}
	$layers = sgs_shadow_split_top( $real, ',' );
	if ( str_starts_with( $layers[0], '0px 0px 0px 1px color-mix(in srgb, #E8E8E8' ) ) {
		array_shift( $layers );
	}
	return implode( ', ', $layers );
}
$valid_cases = array(
	'0px 1px 2px 0px ' . t_mix( '6' ) . ', 0px 4px 12px 0px ' . t_mix( '10' ) => '0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent), 0px 1px 2px 0px color-mix(in srgb, #000000 13.2%, transparent), 0px 4px 12px 0px color-mix(in srgb, #000000 22%, transparent)',
	'0px 1px 2px 0px ' . t_mix( '9.1' )        => '0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent), 0px 1px 2px 0px color-mix(in srgb, #000000 20%, transparent)',
	'4px 4px 0px 0px ' . T_SITE                => '0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent), 4px 4px 0px 0px #000000',
	'0px 8px 24px 0px ' . t_mix( '20' )        => '0px 0px 0px 1px color-mix(in srgb, #E8E8E8 12%, transparent), 0px 8px 24px 0px color-mix(in srgb, #000000 44%, transparent)',
	'inset 0px 2px 4px 0px ' . t_mix( '14' )   => 'inset 0px 2px 4px 0px color-mix(in srgb, #000000 30.8%, transparent)',
);
$real_ok     = 0;
$no_ring_bad = 0;
foreach ( $valid_cases as $input => $expected ) {
	if ( sgs_shadow_dark_variant( (string) $input ) === $expected ) {
		++$real_ok;
	}
	if ( sgs_shadow_dark_variant_no_ring( (string) $input ) !== $expected ) {
		++$no_ring_bad;
	}
}
t_eq( count( $valid_cases ), $real_ok, 'the real generator satisfies every valid control case' );
t_eq( true, $no_ring_bad >= 3, "negative control: a stub that drops the ring is caught by {$no_ring_bad} valid cases (need at least 3)" );

// And the comparison helper itself must be able to report a mismatch.
t_eq( false, t_same( 'a', 'b' ), 'negative control: t_same reports a mismatch' );
t_eq( true, t_same( 'a', 'a' ), 'positive control: t_same reports a match' );

echo "Negative control: passthrough stub caught by {$caught} of " . count( $hostile ) . " hostile cases\n";
echo $fail ? "Shadow dark: {$fail} failed\n" : "Shadow dark: all passed\n";
exit( $fail > 0 ? 1 : 0 );
