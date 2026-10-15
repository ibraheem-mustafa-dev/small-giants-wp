<?php
/**
 * Standalone test: the flat `fx` injector stands down on a block whose sgsMotion holds an effect layer (Spec 38A plan,
 * overlap rule).
 *
 * Runs the REAL `includes/fx-attributes.php::sgs_inject_fx_attributes()`. With flat `fx` and an sgsMotion effect layer
 * on the same block, the flat injector (render_block priority 10) and `Sgs_Motion_Fx_Emitter` (via the renderer at
 * priority 20) would both write `data-sgs-fx*` on the root and their parameters would mix, so the flat path writes
 * nothing and clears any flat `data-sgs-fx*` a static save left on the root. A block whose sgsMotion holds no effect
 * layer (an entrance only) keeps its flat fx: that is the negative control, so this test can fail.
 *
 * Usage: php plugins/sgs-blocks/tests/php/run-fx-motion-overlap-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
define( 'SGS_BLOCKS_PATH', dirname( __DIR__, 2 ) . '/' );
define( 'SGS_BLOCKS_URL', 'https://example.test/wp-content/plugins/sgs-blocks/' );
define( 'SGS_BLOCKS_VERSION', 'test' );

require_once __DIR__ . '/stubs/motion-render-stubs.php';
require_once dirname( __DIR__, 2 ) . '/includes/fx-attributes.php';

$pass  = 0;
$fail  = 0;
$check = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
	$ok ? $pass++ : $fail++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
};
$fx_on_root = static function ( string $html ): array {
	preg_match( '/<[a-z0-9]+[^>]*>/i', $html, $tag );
	preg_match_all( '/\s(data-sgs-fx[a-z0-9-]*)="([^"]*)"/', $tag[0] ?? '', $m, PREG_SET_ORDER );
	$out = array();
	foreach ( $m as $hit ) {
		$out[ $hit[1] ] = $hit[2];
	}
	return $out;
};

$flat    = array(
	'fx'      => 'parallax',
	'fxStart' => 'top 90%',
	'fxScrub' => 1,
);
$content = '<div class="wp-block-sgs-container sgs-container"><p>Panel</p></div>';
$layer   = array(
	'v'        => 1,
	'elements' => array(
		'root' => array(
			'effects' => array( array( 'effect' => 'parallax' ) ),
		),
	),
);

$entrance_only = array(
	'v'        => 1,
	'elements' => array(
		'root' => array( 'entrance' => array( 'preset' => 'fade-up' ) ),
	),
);
$kept = $fx_on_root( \SGS\Blocks\sgs_inject_fx_attributes( $content, array( 'attrs' => $flat + array( 'sgsMotion' => $entrance_only ) ) ) );
$check( 'parallax' === ( $kept['data-sgs-fx'] ?? '' ) && isset( $kept['data-sgs-fx-start'] ), 'negative control: flat fx + entrance-only sgsMotion keeps the flat data-sgs-fx*' );

$none = $fx_on_root( \SGS\Blocks\sgs_inject_fx_attributes( $content, array( 'attrs' => $flat + array( 'sgsMotion' => $layer ) ) ) );
$check( array() === $none, 'flat fx + an sgsMotion effect layer: the flat path writes no data-sgs-fx* (wrote: ' . implode( ', ', array_keys( $none ) ) . ')' );

$hover_layer = array(
	'v'        => 1,
	'elements' => array(
		'icon' => array( 'hover' => array( 'effects' => array( array( 'effect' => 'magnet' ) ) ) ),
	),
);
$none = $fx_on_root( \SGS\Blocks\sgs_inject_fx_attributes( $content, array( 'attrs' => $flat + array( 'sgsMotion' => $hover_layer ) ) ) );
$check( array() === $none, 'flat fx + a hover effect layer on a child: the flat path writes no data-sgs-fx*' );

$text_layer = array(
	'v'        => 1,
	'elements' => array(
		'heading' => array( 'entrance' => array( 'text' => array( 'effect' => 'split-reveal' ) ) ),
	),
);
$none = $fx_on_root( \SGS\Blocks\sgs_inject_fx_attributes( $content, array( 'attrs' => $flat + array( 'sgsMotion' => $text_layer ) ) ) );
$check( array() === $none, 'flat fx + an entrance text layer: the flat path writes no data-sgs-fx*' );

$static_saved = '<div class="wp-block-sgs-info-box" data-sgs-fx="parallax" data-sgs-fx-start="top 90%" data-sgs-fx-scrub="1" data-sgs-fx-disable-mobile="1"><p>Card</p></div>';
$cleared      = $fx_on_root( \SGS\Blocks\sgs_inject_fx_attributes( $static_saved, array( 'attrs' => $flat + array( 'sgsMotion' => $layer ) ) ) );
$check( array() === $cleared, 'flat fx a static save left on the root is cleared when an effect layer owns the root (left: ' . implode( ', ', array_keys( $cleared ) ) . ')' );

echo "RESULT {$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );
