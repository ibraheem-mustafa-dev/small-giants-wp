<?php
/**
 * Standalone runner: the devices where a part's media slot shows a kind an effect does not fit are written as `data-sgs-fx-off-<device>`, Desktop included (Spec 49 §10.1, FR-49-40).
 *
 *
 *   php plugins/sgs-blocks/tests/php/run-fx-device-scope-standalone.php
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
	require_once dirname( __DIR__, 2 ) . '/includes/helpers-media-element.php';
	require_once dirname( __DIR__, 2 ) . '/includes/media/render-sources.php';

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

	if ( ! function_exists( 'absint' ) ) {
		function absint( $v ) {
			return abs( (int) $v );
		}
	}

	use SGS\Blocks\Motion\Sgs_Motion_Device_Scope as Scope;

	$img = array( 'kind' => 'image', 'url' => 'https://example.test/a.jpg' );
	$vid = array( 'kind' => 'video', 'url' => 'https://example.test/a.mp4' );
	$kb  = array( 'id' => 'k', 'effect' => 'ken-burns' );
	$plx = array( 'id' => 'p', 'effect' => 'parallax' );

	function ds_tokens( array $attrs, string $name ): array {
		return isset( $attrs[ $name ] ) ? array_values( array_filter( explode( ' ', $attrs[ $name ] ), 'strlen' ) ) : array();
	}

	// 1. Image on the phone only: Ken Burns is off on Desktop and Tablet, the phone keeps it.
	$phone_photo = array( 'backgroundSource' => array( 'desktop' => $vid, 'mobile' => $img ) );
	lo_check( array( 'desktop', 'tablet' ) === Scope::off_devices( 'sgs/container', 'background', 'ken-burns', $phone_photo ), 'a phone-only photo turns Ken Burns off on Desktop and Tablet' );
	$out = Emitter::attrs( array( 'effects' => array( $kb ) ), 'sgs/container', 'background', $phone_photo );
	lo_check( array( 'ken-burns' ) === ds_tokens( $out, 'data-sgs-fx-off-desktop' ), 'data-sgs-fx-off-desktop names ken-burns: ' . json_encode( $out ) );
	lo_check( array( 'ken-burns' ) === ds_tokens( $out, 'data-sgs-fx-off-tablet' ) && ! isset( $out['data-sgs-fx-off-mobile'] ), 'tablet is off, mobile is not' );

	// 2. Parallax fits video, so the same slot leaves it on everywhere.
	lo_check( array() === Scope::off_devices( 'sgs/container', 'background', 'parallax', $phone_photo ), 'parallax fits a photo and a video: no device is off' );
	$out = Emitter::attrs( array( 'effects' => array( $plx ) ), 'sgs/container', 'background', $phone_photo );
	lo_check( ! isset( $out['data-sgs-fx-off-desktop'] ) && ! isset( $out['data-sgs-fx-off-tablet'] ), 'no off switch is written for parallax' );

	// 3. All photo: Ken Burns runs everywhere (negative control).
	$all_photo = array( 'backgroundSource' => array( 'desktop' => $img ) );
	lo_check( array() === Scope::off_devices( 'sgs/container', 'background', 'ken-burns', $all_photo ), 'an all-photo slot leaves Ken Burns on' );

	// 4. A layer's own off tiers join the computed ones; a part with no slot and no attributes writes nothing extra.
	$own = Emitter::attrs( array( 'effects' => array( $kb + array( 'off' => array( 'mobile' ) ) ) ), 'sgs/container', 'background', $all_photo );
	lo_check( array( 'ken-burns' ) === ds_tokens( $own, 'data-sgs-fx-off-mobile' ) && ! isset( $own['data-sgs-fx-off-desktop'] ), 'a stored mobile off still writes, and Desktop stays on' );
	lo_check( array() === Scope::off_devices( 'sgs/container', 'root', 'ken-burns', $phone_photo ), 'the root part has no media slot: nothing scoped' );
	$bare = Emitter::attrs( array( 'effects' => array( $kb ) ), 'sgs/container', 'background' );
	lo_check( array( 'data-sgs-fx' => 'ken-burns' ) === $bare, 'without block attributes the emitter writes only the effect' );

	// 5. An SVG effect fits an SVG kind only.
	lo_check( Scope::fits( 'svg-loop', 'svg' ) && ! Scope::fits( 'svg-loop', 'image' ) && Scope::fits( 'ken-burns', 'image' ) && ! Scope::fits( 'ken-burns', 'embed' ), 'fits() follows x-part-kinds and media_kinds' );

	echo "
" . ( $GLOBALS['lo_fail'] ? 'FAILED' : 'OK' ) . ': ' . ( $GLOBALS['lo_count'] - $GLOBALS['lo_fail'] ) . ' of ' . $GLOBALS['lo_count'] . " checks
";
	exit( $GLOBALS['lo_fail'] ? 1 : 0 );
}
