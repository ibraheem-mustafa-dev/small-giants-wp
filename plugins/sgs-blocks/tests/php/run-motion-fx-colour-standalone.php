<?php
/**
 * Standalone runner for effect-layer colour emission (Spec 38A): every colour field an effect prints as a data attribute
 * reaches the page as a colour value the runtimes (a CSS var() or a canvas fillStyle) can use, never as a bare palette slug.
 *
 * Detector: walks every effect's colourReference fields with a dataAttr through the real grammar, plants the palette slug
 * `primary` at each, and asserts the printed attribute is the active palette's hex. Controls: a hex (alpha kept) stays
 * as written; a slug the palette lacks is not written.
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-fx-colour-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

namespace {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
	define( 'SGS_BLOCKS_PATH', dirname( __DIR__, 2 ) . '/' );
	define( 'SGS_BLOCKS_URL', 'https://example.test/wp-content/plugins/sgs-blocks/' );
	define( 'SGS_BLOCKS_VERSION', 'test' );

	/** The real theme.json's custom settings and palette, as WordPress merges them (no client snapshot here). */
	function wp_get_global_settings( $path = array() ) {
		$theme = json_decode( (string) file_get_contents( dirname( __DIR__, 4 ) . '/theme/sgs-theme/theme.json' ), true );
		if ( array( 'color', 'palette' ) === $path ) {
			return array( 'theme' => $theme['settings']['color']['palette'] ?? array() );
		}
		$custom = $theme['settings']['custom'] ?? array();
		return array( 'custom' ) === $path ? $custom : array( 'custom' => $custom );
	}

	require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-motion-registry.php';
	require_once __DIR__ . '/stubs/motion-render-stubs.php';
	require_once dirname( __DIR__, 2 ) . '/includes/helpers-global-settings.php';
	require_once dirname( __DIR__, 2 ) . '/includes/helpers-colour-wcag.php';

	use SGS\Blocks\Motion\Sgs_Motion_Field_Types as Types;
	use SGS\Blocks\Motion\Sgs_Motion_Fx_Emitter as Emitter;
	use SGS\Blocks\Motion\Sgs_Motion_Fx_Grammar as Grammar;

	$fail  = 0;
	$count = 0;
	$check = static function ( bool $ok, string $label ) use ( &$fail, &$count ): void {
		++$count;
		$fail += $ok ? 0 : 1;
		echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . PHP_EOL;
	};
	$plant = static function ( array $path, $value ): array {
		$out = array();
		$ref = &$out;
		foreach ( $path as $step ) {
			$ref[ $step ] = array();
			$ref          = &$ref[ $step ];
		}
		$ref = $value;
		return $out;
	};

	$palette = wp_get_global_settings( array( 'color', 'palette' ) )['theme'];
	$primary = '';
	foreach ( $palette as $entry ) {
		if ( 'primary' === $entry['slug'] ) {
			$primary = $entry['color'];
		}
	}
	$check( 1 === preg_match( '/^#[0-9a-fA-F]{6}$/', $primary ), 'the fixture palette has a primary hex (' . $primary . ')' );

	$seen = 0;
	foreach ( array_keys( Types::schema()['x-sgs-effects'] ?? array() ) as $effect ) {
		foreach ( Grammar::fields( $effect ) as $field ) {
			if ( 'colourReference' !== $field['type'] || '' === $field['attr'] || $field['list'] ) {
				continue;
			}
			++$seen;
			$name  = $effect . ' ' . implode( '.', $field['path'] ) . ' -> ' . $field['attr'];
			$layer = fn( $v ) => array( 'effect' => $effect, 'values' => $plant( $field['path'], $v ) );
			$got   = Emitter::layer_attrs( $layer( 'primary' ) )[ $field['attr'] ] ?? null;
			$check( $primary === $got, $name . ': a palette slug prints the palette hex (got ' . var_export( $got, true ) . ')' );
			$got = Emitter::layer_attrs( $layer( '#aabbcc80' ) )[ $field['attr'] ] ?? null;
			$check( '#aabbcc80' === $got, $name . ': a hex (with alpha) prints as written' );
			$got = Emitter::layer_attrs( $layer( 'no-such-slug' ) )[ $field['attr'] ] ?? null;
			$check( null === $got, $name . ': a slug the palette lacks is not written (got ' . var_export( $got, true ) . ')' );
			foreach ( array( 'white', 'black', 'transparent', 'currentcolor', 'rebeccapurple' ) as $keyword ) {
				$got = Emitter::layer_attrs( $layer( $keyword ) )[ $field['attr'] ] ?? null;
				$check( $keyword === $got, $name . ': the CSS colour keyword ' . $keyword . ' prints as written (got ' . var_export( $got, true ) . ')' );
			}
			$got = Emitter::layer_attrs( $layer( 'not-a-colour' ) )[ $field['attr'] ] ?? null;
			$check( null === $got, $name . ': a non-colour token is not written (got ' . var_export( $got, true ) . ')' );
		}
	}
	// The guard names the function the method calls (a guard on another helper lets a missing one fatal).
	$source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/motion/class-sgs-motion-fx-emitter.php' );
	$check( 1 === preg_match( "/function_exists\( 'sgs_colour_resolve_hex_alpha' \)/", $source ), 'palette_colour guards on sgs_colour_resolve_hex_alpha, the function it calls' );
	$check( $seen >= 20, "the detector found $seen colour fields with a data attribute" );

	echo PHP_EOL . ( $count - $fail ) . "/$count passed" . PHP_EOL;
	exit( $fail > 0 ? 1 : 0 );
}
