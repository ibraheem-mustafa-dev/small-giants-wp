<?php
/**
 * Standalone tests for the shadow to `filter: drop-shadow()` converter:
 * includes/helpers-shadow-filter.php.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-shadow-filter-standalone.php
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
// The theme's own settings, as wp_get_global_settings( array( 'shadow', 'presets' ) ) returns them.
if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( array $path ) {
		// The shared table's presets by origin, in the order WordPress returns them (default, theme, custom).
		$table = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/shared/shadow-output-cases.json' ), true );
		return $table['presets'];
	}
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-colour-variants.php';

$fail = 0;
function t_eq( $expected, $actual, string $label ): void {
	global $fail;
	if ( $expected !== $actual ) {
		++$fail;
		fwrite( STDERR, "FAIL {$label}\n  expected: " . json_encode( $expected ) . "\n  actual:   " . json_encode( $actual ) . "\n" );
	}
}

$layer  = sgs_shadow_layers( '0 4px 12px 0', '#000000' );
$layers = sgs_shadow_layers( '0px 1px 2px 0px, 0px 8px 24px -4px', '#00000033, #FF0000' );

t_eq( 'drop-shadow(0px 4px 12px #000000)', sgs_shadow_value_to_drop_shadow( $layer ), 'one layer: spread dropped' );
t_eq(
	'drop-shadow(0px 1px 2px #00000033) drop-shadow(0px 8px 24px #FF0000)',
	sgs_shadow_value_to_drop_shadow( $layers ),
	'two layers are chained, each with its own colour and no spread'
);
t_eq( '', sgs_shadow_value_to_drop_shadow( '' ), 'empty is empty' );
t_eq( '', sgs_shadow_value_to_drop_shadow( 'none' ), 'none draws nothing' );
t_eq(
	'drop-shadow(0px 4px 12px #000000)',
	sgs_shadow_value_to_drop_shadow( sgs_shadow_layers( '0 4px 12px 0, inset 0 2px 4px 0', '#000000' ) ),
	'an inset layer is skipped'
);
t_eq( '', sgs_shadow_value_to_drop_shadow( sgs_shadow_layers( 'inset 0 2px 4px 0', null ) ), 'inset only draws nothing' );
// D4/P3: a raw shape with no explicit colour follows the dark scope now — the site
// colour variable, never the old black literal (#0000001A).
t_eq(
	'drop-shadow(0px 4px 12px color-mix(in srgb, var(--wp--custom--shadow-colour) 10%, transparent))',
	sgs_shadow_value_to_drop_shadow( sgs_shadow_layers( '0 4px 12px 0', null ) ),
	'a colourless drop-shadow uses the site colour variable, not a black literal'
);
t_eq(
	'drop-shadow(0px 1px 2px #0000001F) drop-shadow(0px 4px 8px #00000014)',
	sgs_shadow_value_to_drop_shadow( 'var(--wp--preset--shadow--soft)' ),
	'a multi-layer preset is read from the theme and chained'
);
t_eq(
	'drop-shadow(0px 1px 2px color-mix(in srgb, var(--wp--custom--shadow-colour) 10%, transparent)) drop-shadow(0px 0px 0px color-mix(in srgb, var(--wp--custom--shadow-colour) 5%, transparent))',
	sgs_shadow_value_to_drop_shadow( 'var(--wp--preset--shadow--whisper)' ),
	'a theme preset written with color-mix is chained layer by layer'
);
t_eq( '', sgs_shadow_value_to_drop_shadow( 'var(--wp--preset--shadow--pressed)' ), 'an inset-only preset draws nothing' );
t_eq( '', sgs_shadow_value_to_drop_shadow( 'var(--wp--preset--shadow--missing)' ), 'an unknown preset draws nothing, not invalid CSS' );

// Everything that leaves the converter is built from parsed fields, so a hostile stored value cannot carry CSS out.
$hostile = sgs_shadow_value_to_drop_shadow( sgs_shadow_layers( '0px 0px 0px red) blur(9999px', null ) );
t_eq( '', $hostile, 'filter smuggle is dropped before it reaches the converter' );
t_eq( 0, preg_match( '/[;{}<>"\'`@!]/', sgs_shadow_value_to_drop_shadow( sgs_shadow_layers( '0 0 0 red;}body{x:y', null ) ) ), 'no breakout characters survive' );

// The shared output table both twins read (`src/utils/shadow-output.js` is checked against it by tests/js/shadow-output.test.js).
$table  = json_decode( (string) file_get_contents( dirname( __DIR__ ) . '/shared/shadow-output-cases.json' ), true );
$expand = static function ( array $map ) use ( $table ): array {
	foreach ( $map as $key => $value ) {
		if ( '@FORCED@' === $value ) {
			$map[ $key ] = $table['forcedColours'];
		}
	}
	return $map;
};
t_eq( $table['forcedColours'], sgs_shadow_forced_colours_decl(), 'the table carries the forced-colours fallback verbatim' );
foreach ( $table['cases'] as $case ) {
	t_eq(
		$expand( $case['expected'] ),
		sgs_shadow_decl_map( sgs_shadow_layers( $case['shape'], $case['colour'] ), (bool) $case['followShape'] ),
		'shared table: ' . $case['name']
	);
}

// sgs_shadow_decls() in follow-the-shape mode: a filter on both states, the automatic lift converted, no fallback.
$attrs = array( 'boxShadow' => '0 4px 12px 0', 'boxShadowColour' => '#000000' );
$map   = array( 'base' => 'boxShadow', 'colour' => 'boxShadowColour' );
$box   = sgs_shadow_decls( $attrs, $map );
t_eq( true, 'box-shadow:0px 4px 12px 0px #000000' === $box['normal'][0], 'box mode still prints box-shadow first' );
$follow = sgs_shadow_decls( $attrs, $map + array( 'follow_shape' => true ) );
t_eq( array( 'filter:drop-shadow(0px 4px 12px #000000)' ), $follow['normal'], 'follow mode prints one filter and no fallback' );
t_eq( true, array() === $follow['hover'] || 0 === count( array_filter( $follow['hover'], static fn( $d ) => 0 === strpos( $d, 'box-shadow' ) ) ), 'follow mode never prints a box-shadow on hover' );
$hovered = sgs_shadow_decls(
	$attrs + array( 'boxShadowColourHover' => '#FF0000' ),
	$map + array( 'hover_colour' => 'boxShadowColourHover', 'follow_shape' => true )
);
t_eq( array( 'filter:drop-shadow(0px 4px 12px #FF0000)' ), $hovered['hover'], 'follow mode hover colour is a filter too' );

echo $fail ? "Shadow filter: {$fail} failed\n" : "Shadow filter: all passed\n";
exit( $fail > 0 ? 1 : 0 );
