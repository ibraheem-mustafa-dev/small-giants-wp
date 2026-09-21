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
		return array(
			'theme' => array(
				array(
					'slug'   => 'soft',
					'shadow' => '0 1px 2px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08)',
				),
				array(
					'slug'   => 'pressed',
					'shadow' => 'inset 0 2px 4px rgba(0,0,0,0.2)',
				),
			),
		);
	}
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';

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
t_eq(
	'drop-shadow(0px 1px 2px #0000001F) drop-shadow(0px 4px 8px #00000014)',
	sgs_shadow_value_to_drop_shadow( 'var(--wp--preset--shadow--soft)' ),
	'a multi-layer preset is read from the theme and chained'
);
t_eq( '', sgs_shadow_value_to_drop_shadow( 'var(--wp--preset--shadow--pressed)' ), 'an inset-only preset draws nothing' );
t_eq( '', sgs_shadow_value_to_drop_shadow( 'var(--wp--preset--shadow--missing)' ), 'an unknown preset draws nothing, not invalid CSS' );

// Everything that leaves the converter is built from parsed fields, so a hostile stored value cannot carry CSS out.
$hostile = sgs_shadow_value_to_drop_shadow( sgs_shadow_layers( '0px 0px 0px red) blur(9999px', null ) );
t_eq( '', $hostile, 'filter smuggle is dropped before it reaches the converter' );
t_eq( 0, preg_match( '/[;{}<>"\'`@!]/', sgs_shadow_value_to_drop_shadow( sgs_shadow_layers( '0 0 0 red;}body{x:y', null ) ) ), 'no breakout characters survive' );

echo $fail ? "Shadow filter: {$fail} failed\n" : "Shadow filter: all passed\n";
exit( $fail > 0 ? 1 : 0 );
