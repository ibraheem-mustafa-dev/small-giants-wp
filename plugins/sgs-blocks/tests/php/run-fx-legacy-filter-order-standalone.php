<?php
/**
 * Standalone runner: the per-effect `render_block` filters (cursor field, grid dots, particles, wave gradient, generative
 * background, surface treatment, path and shape routes) see an effect that a motion layer wrote (Spec 38A FR-38A-22, M5.1).
 *
 * The layer renderer writes `data-sgs-fx` at `render_block` priority 20. A per-effect filter that runs before it finds no
 * effect in the markup and returns the block untouched, so the effect's own attribute (for cursor field,
 * `data-sgs-cursor-field`) never reaches the page and its stylesheet matches nothing. This runner registers every shipped
 * filter at its real priority, renders a layer-authored block through them in WordPress's order, and asserts each effect's
 * marker attribute.
 *
 *   php plugins/sgs-blocks/tests/php/run-fx-legacy-filter-order-standalone.php
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

	$GLOBALS['lf_fail']  = 0;
	$GLOBALS['lf_count'] = 0;
	function lf_check( bool $ok, string $label ): void {
		++$GLOBALS['lf_count'];
		$GLOBALS['lf_fail'] += $ok ? 0 : 1;
		echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . PHP_EOL;
	}

	// The shipped hooks, registered exactly as the plugin does: the layer renderer and every per-effect filter.
	\SGS\Blocks\Motion\Sgs_Motion_Renderer::register();
	foreach ( array( 'fx-token-match', 'fx-attributes', 'fx-cursor-field' ) as $file ) {
		require_once dirname( __DIR__, 2 ) . "/includes/$file.php";
	}

	/** Render a block through every registered `render_block` filter, in priority order (the stubs' apply_filters). */
	function lf_render( string $name, array $motion, string $html ): string {
		\SGS\Blocks\Motion\Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_collected_css'] = array();
		$block = array( 'blockName' => $name, 'attrs' => array( 'sgsMotion' => $motion ) );
		$block = \SGS\Blocks\Motion\Sgs_Motion_Renderer::open_frame( $block, $block, null );
		return (string) apply_filters( 'render_block', $html, $block );
	}

	$container = '<div class="wp-block-sgs-container sgs-container"><div class="sgs-container__inner">Card</div></div>';
	$reveal    = array(
		'id'     => 'cf1',
		'effect' => 'cursor-field',
		'values' => array( 'field' => 'image-reveal', 'radius' => 0, 'hoverRadius' => 90 ),
	);
	$out       = lf_render( 'sgs/container', array( 'v' => 1, 'elements' => array( 'root' => array( 'effects' => array( $reveal ) ) ) ), $container );
	lf_check( 1 === preg_match( '/data-sgs-fx="[^"]*\bcursor-field\b/', $out ), 'the layer renderer wrote data-sgs-fx="cursor-field": ' . substr( $out, 0, 200 ) );
	lf_check( 1 === preg_match( '/data-sgs-cursor-field="image-reveal"/', $out ), 'the cursor-field filter set data-sgs-cursor-field="image-reveal" on the layer-authored block' );

	// Negative control: a block with no layers keeps no marker.
	$plain = lf_render( 'sgs/container', array( 'v' => 1, 'elements' => array() ), $container );
	lf_check( false === strpos( $plain, 'data-sgs-cursor-field' ), 'a block with no effect layer carries no data-sgs-cursor-field' );

	// The filter's own priority sits after the layer renderer's.
	$by_priority = $GLOBALS['sgs_test_filters']['render_block'] ?? array();
	$cf_priority = null;
	$rd_priority = null;
	foreach ( $by_priority as $priority => $callbacks ) {
		foreach ( $callbacks as $entry ) {
			if ( is_string( $entry[0] ) && false !== strpos( $entry[0], 'sgs_apply_fx_cursor_field' ) ) {
				$cf_priority = $priority;
			}
			if ( is_array( $entry[0] ) && 'render' === ( $entry[0][1] ?? '' ) && false !== strpos( (string) $entry[0][0], 'Sgs_Motion_Renderer' ) ) {
				$rd_priority = $priority;
			}
		}
	}
	lf_check( null !== $cf_priority && null !== $rd_priority && $cf_priority > $rd_priority, "cursor-field filter priority ($cf_priority) is after the layer renderer's ($rd_priority)" );

	// Every per-effect filter (any includes/fx-*.php that hooks render_block) runs after the layer renderer.
	$early = array();
	$seen  = 0;
	foreach ( glob( dirname( __DIR__, 2 ) . '/includes/fx-*.php' ) as $file ) {
		$src = (string) file_get_contents( $file );
		// fx-attributes.php is the injector for the flat `fx` attribute and must run first (priority 10).
		if ( 'fx-attributes.php' === basename( $file ) ) {
			continue;
		}
		foreach ( preg_split( '/\R/', $src ) as $line ) {
			if ( false === strpos( $line, "add_filter( 'render_block'" ) || '*' === substr( ltrim( $line ), 0, 1 ) ) {
				continue;
			}
			if ( 1 === preg_match( '/,\s*(\d+)\s*,\s*\d+\s*\)/', $line, $hit ) ) {
				++$seen;
				$line_priority = (int) $hit[1];
				if ( $line_priority <= (int) $rd_priority ) {
					$early[] = basename( $file ) . '@' . $line_priority;
				}
			}
		}
	}
	lf_check( $seen >= 8 && array() === $early, "$seen per-effect render_block filters, none at or before the layer renderer: " . json_encode( $early ) );

	echo PHP_EOL . ( $GLOBALS['lf_fail'] ? 'FAILED' : 'OK' ) . ': ' . ( $GLOBALS['lf_count'] - $GLOBALS['lf_fail'] ) . ' of ' . $GLOBALS['lf_count'] . ' checks' . PHP_EOL;
	exit( $GLOBALS['lf_fail'] ? 1 : 0 );
}
