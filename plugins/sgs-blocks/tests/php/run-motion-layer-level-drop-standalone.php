<?php
/**
 * Standalone runner: the renderer drops an effect layer whose target level does not fit its element (Spec 38A §5.4
 * "Targeting levels", FR-38A-23).
 *
 * The editor offers an effect only on a target of a level the schema's `x-target-level` names, but a hand-built or cloned
 * tree can store a block-level effect (draggable) on a part or a surface effect (cursor-field) on a part that paints no
 * background. `Sgs_Motion_Layer_Drops::drop_level_misfits` removes such a layer and keeps every other.
 *
 *   php plugins/sgs-blocks/tests/php/run-motion-layer-level-drop-standalone.php
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

	function wp_get_global_settings( $path = array() ) {
		$theme  = json_decode( (string) file_get_contents( dirname( __DIR__, 4 ) . '/theme/sgs-theme/theme.json' ), true );
		$custom = $theme['settings']['custom'] ?? array();
		return array( 'custom' ) === $path ? $custom : array( 'custom' => $custom );
	}

	require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-motion-registry.php';
	require_once __DIR__ . '/stubs/motion-render-stubs.php';
	require_once dirname( __DIR__, 2 ) . '/includes/helpers-global-settings.php';

	use SGS\Blocks\Motion\Sgs_Motion_Layer_Drops as Drops;

	$GLOBALS['ld_fail']  = 0;
	$GLOBALS['ld_count'] = 0;
	function ld_check( bool $ok, string $label ): void {
		++$GLOBALS['ld_count'];
		$GLOBALS['ld_fail'] += $ok ? 0 : 1;
		echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	}

	/** The effect slugs left on an element, in order. */
	function ld_slugs( array $element ): array {
		return array_map( static fn( $layer ) => (string) $layer['effect'], $element['effects'] ?? array() );
	}

	/** One element holding the given effects. */
	function ld_element( string ...$slugs ): array {
		$layers = array();
		foreach ( $slugs as $i => $slug ) {
			$layers[] = array( 'id' => 'l' . $i, 'effect' => $slug );
		}
		return array( 'effects' => $layers );
	}

	$root = Drops::ROOT_LEVELS;
	$part = array( 'part' );
	$surf = array( 'surface', 'part' );

	ld_check( $root === Drops::levels_for_target( 'sgs/container', 'root' ), 'the root offers block, surface and part' );
	ld_check( $part === Drops::levels_for_target( 'sgs/container', 'custom:1' ), 'a target the block does not declare offers part only' );

	// A block-level effect on a part is dropped (the draggable fixture mistake); on the root it stays.
	$out = Drops::drop_level_misfits( ld_element( 'draggable' ), $part );
	ld_check( array() === ld_slugs( $out['element'] ) && 1 === count( $out['dropped'] ), 'draggable on a part is dropped: ' . json_encode( $out['dropped'] ) );
	ld_check( 'target-level' === ( $out['dropped'][0]['id'] ?? '' ) && 'effects[0]' === ( $out['dropped'][0]['path'] ?? '' ), 'the drop names the target-level reason and the layer path' );
	$out = Drops::drop_level_misfits( ld_element( 'draggable' ), $root );
	ld_check( array( 'draggable' ) === ld_slugs( $out['element'] ) && array() === $out['dropped'], 'draggable on the root stays (control)' );

	// A surface effect: dropped on a plain part, kept on a part marked as a surface and on the root.
	$out = Drops::drop_level_misfits( ld_element( 'cursor-field' ), $part );
	ld_check( array() === ld_slugs( $out['element'] ), 'cursor-field on a plain part is dropped' );
	$out = Drops::drop_level_misfits( ld_element( 'cursor-field' ), $surf );
	ld_check( array( 'cursor-field' ) === ld_slugs( $out['element'] ), 'cursor-field on a surface part stays (control)' );

	// A part-level effect fits a part; the other layers survive a drop, in order, whatever their position.
	$out = Drops::drop_level_misfits( ld_element( 'scrub', 'draggable', 'ripple', 'horizontal-panel' ), $part );
	ld_check( array( 'scrub', 'ripple' ) === ld_slugs( $out['element'] ) && 2 === count( $out['dropped'] ), 'two misfits among part-level layers are dropped and the rest keep their order: ' . json_encode( ld_slugs( $out['element'] ) ) );

	// An effect that pairs two elements, an unknown effect and an empty element are left alone.
	$out = Drops::drop_level_misfits( ld_element( 'flip', 'no-such-effect' ), $part );
	ld_check( array( 'flip', 'no-such-effect' ) === ld_slugs( $out['element'] ), 'a paired effect and an unknown effect are not dropped' );
	$out = Drops::drop_level_misfits( array(), $part );
	ld_check( array() === $out['element'] && array() === $out['dropped'], 'an element with no effects is unchanged' );

	echo "\n" . ( $GLOBALS['ld_fail'] ? 'FAILED' : 'OK' ) . ': ' . ( $GLOBALS['ld_count'] - $GLOBALS['ld_fail'] ) . ' of ' . $GLOBALS['ld_count'] . " checks\n";
	exit( $GLOBALS['ld_fail'] ? 1 : 0 );
}
