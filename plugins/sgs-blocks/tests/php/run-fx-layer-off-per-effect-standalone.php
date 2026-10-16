<?php
/**
 * Standalone runner: a layer's per-device `off` list switches off that layer's effect only (Spec 38A FR-38A-22, FR-38A-23).
 *
 * `Sgs_Motion_Fx_Emitter` writes each layer's `off` tiers as a per-tier token list, `data-sgs-fx-off-tablet` /
 * `data-sgs-fx-off-mobile`, naming the effect slugs (the `data-sgs-fx` vocabulary) whose own layer set that tier off.
 * The element-wide switches `data-sgs-fx-disable-tablet` / `-mobile` belong to the legacy flat `fxDisableTablet` /
 * `fxDisableMobile` attributes only, so one layer's `off` never disables a sibling effect on the same element.
 *
 *   php plugins/sgs-blocks/tests/php/run-fx-layer-off-per-effect-standalone.php
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

	use SGS\Blocks\Motion\Sgs_Motion_Fx_Emitter as Emitter;

	$GLOBALS['lo_fail']  = 0;
	$GLOBALS['lo_count'] = 0;
	function lo_check( bool $ok, string $label ): void {
		++$GLOBALS['lo_count'];
		$GLOBALS['lo_fail'] += $ok ? 0 : 1;
		echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	}

	/** The tokens of a space-separated attribute value, or an empty list when the attribute is absent. */
	function lo_tokens( array $attrs, string $name ): array {
		return isset( $attrs[ $name ] ) ? array_values( array_filter( explode( ' ', $attrs[ $name ] ), 'strlen' ) ) : array();
	}

	// 1. Two layers on one element, only the first switched off on mobile.
	$scrub = array(
		'id'     => 'a',
		'effect' => 'scrub',
		'off'    => array( 'mobile' ),
	);
	$split = array(
		'id'     => 'b',
		'effect' => 'split-reveal',
	);
	$out   = Emitter::attrs( array( 'effects' => array( $scrub, $split ) ), 'sgs/heading', 'root' );
	lo_check( array( 'scrub', 'split-reveal' ) === lo_tokens( $out, 'data-sgs-fx' ), 'both effects are listed in data-sgs-fx: ' . json_encode( $out ) );
	lo_check( array( 'scrub' ) === lo_tokens( $out, 'data-sgs-fx-off-mobile' ), 'data-sgs-fx-off-mobile names only the first effect: ' . json_encode( $out['data-sgs-fx-off-mobile'] ?? null ) );
	lo_check( ! in_array( 'split-reveal', lo_tokens( $out, 'data-sgs-fx-off-mobile' ), true ), 'data-sgs-fx-off-mobile does not name the second effect' );
	lo_check( ! array_key_exists( 'data-sgs-fx-disable-mobile', $out ), 'no element-wide data-sgs-fx-disable-mobile is written' );
	lo_check( ! array_key_exists( 'data-sgs-fx-off-tablet', $out ) && ! array_key_exists( 'data-sgs-fx-disable-tablet', $out ), 'no tablet switch is written when no layer is off on tablet' );

	// 2. The lists join across layers per tier, in paint order, without duplicates.
	$split_off = $split + array( 'off' => array( 'tablet', 'mobile' ) );
	$both      = Emitter::attrs( array( 'effects' => array( $scrub, $split_off ) ), 'sgs/heading', 'root' );
	lo_check( array( 'scrub', 'split-reveal' ) === lo_tokens( $both, 'data-sgs-fx-off-mobile' ), 'mobile lists both effects when both layers are off on mobile: ' . json_encode( $both['data-sgs-fx-off-mobile'] ?? null ) );
	lo_check( array( 'split-reveal' ) === lo_tokens( $both, 'data-sgs-fx-off-tablet' ), 'tablet lists only the effect whose layer is off on tablet: ' . json_encode( $both['data-sgs-fx-off-tablet'] ?? null ) );

	// 3. A single layer writes its own token list.
	$single = Emitter::layer_attrs( $scrub );
	lo_check( 'scrub' === ( $single['data-sgs-fx-off-mobile'] ?? null ) && ! array_key_exists( 'data-sgs-fx-disable-mobile', $single ), 'layer_attrs writes data-sgs-fx-off-mobile="scrub": ' . json_encode( $single ) );

	// Negative control: a layer with no off list writes no tier switch.
	$plain = Emitter::layer_attrs( $split );
	lo_check( array( 'data-sgs-fx' => 'split-reveal' ) === $plain, 'a layer with no off list writes only its effect: ' . json_encode( $plain ) );

	echo "\n" . ( $GLOBALS['lo_fail'] ? 'FAILED' : 'OK' ) . ': ' . ( $GLOBALS['lo_count'] - $GLOBALS['lo_fail'] ) . ' of ' . $GLOBALS['lo_count'] . " checks\n";
	exit( $GLOBALS['lo_fail'] ? 1 : 0 );
}
