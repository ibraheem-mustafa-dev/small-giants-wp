<?php
/**
 * Standalone runner: sgs/decorative-image renders a host for the surface-treatment effect (Spec 38A, FR-38A-22).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-decorative-image-surface-standalone.php
 *
 * The surface-treatment effect (`src/shared/effects/fx-surface-treatment.js`) appends `canvas.sgs-webgl-surface` as a
 * child of the element that carries the layer's `data-sgs-fx="surface-treatment"` markup, so that element cannot be an
 * `<img>`. This runner renders the REAL `render.php` through the QA harness, hands the result to the real motion
 * renderer with the block's `sgsMotion` layers, and asserts:
 * - with a `surface-treatment` layer on the root, the root is a `<span class="sgs-decorative-image ...">` that carries the
 *   layer's `data-sgs-fx` markup and holds the `<img>` as a child, and the `<img>` carries no `data-sgs-fx` markup;
 * - with no such layer the root stays the bare `<img>` and no wrapper `<span>` is printed (the negative control: the
 *   host appears because of the layer, not always);
 * - a layer of another effect on the root does not produce the host (the gate reads the effect slug);
 * - no `style` attribute is printed on any of the markups.
 * Exits 1 on any failure.
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

/** The theme's `settings.custom`, as WordPress merges it (the real theme.json; no client snapshot here). */
function wp_get_global_settings( $path = array() ) {
	$theme  = json_decode( (string) file_get_contents( dirname( __DIR__, 4 ) . '/theme/sgs-theme/theme.json' ), true );
	$custom = $theme['settings']['custom'] ?? array();
	return array( 'custom' ) === $path ? $custom : array( 'custom' => $custom );
}

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-motion-registry.php';
require_once __DIR__ . '/stubs/motion-render-stubs.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-global-settings.php';

use SGS\Blocks\Motion\Sgs_Motion_Renderer;

$root     = dirname( __DIR__, 2 );
$harness  = $root . '/scripts/qa/lib/render-css-harness.php';
$prepend  = tempnam( sys_get_temp_dir(), 'sgsdip' );
$failures = 0;
$checks   = 0;
$check    = static function ( bool $ok, string $label ) use ( &$failures, &$checks ): void {
	++$checks;
	if ( ! $ok ) {
		++$failures;
		echo "FAIL: $label\n";
	}
};

// The harness stubs lack wp_specialchars_decode(), which the block's wrapper-attribute merge calls.
file_put_contents(
	$prepend,
	"<?php\nrequire_once " . var_export( __DIR__ . '/stubs/woocommerce-class-stub.php', true ) . ";\n"
	. "if ( ! function_exists( 'wp_specialchars_decode' ) ) {\n\tfunction wp_specialchars_decode( \$s, \$q = ENT_NOQUOTES ) { return htmlspecialchars_decode( (string) \$s, \$q ); }\n}\n"
);

/** Render the block's render.php through the QA harness, returning its HTML. */
$render = static function ( array $attrs ) use ( $harness, $prepend ): string {
	$attrs_file   = tempnam( sys_get_temp_dir(), 'sgsatt' );
	$context_file = tempnam( sys_get_temp_dir(), 'sgsctx' );
	file_put_contents( $attrs_file, json_encode( $attrs ) );
	file_put_contents( $context_file, json_encode( array() ) );
	$command = array( PHP_BINARY, '-d', 'auto_prepend_file=' . $prepend, $harness, '--slug', 'sgs/decorative-image', '--attrs-file', $attrs_file, '--context-file', $context_file );
	$pipes   = array();
	$proc    = proc_open( $command, array( 1 => array( 'pipe', 'w' ), 2 => array( 'pipe', 'w' ) ), $pipes );
	$out     = '';
	if ( is_resource( $proc ) ) {
		$out = (string) stream_get_contents( $pipes[1] );
		stream_get_contents( $pipes[2] );
		fclose( $pipes[1] );
		fclose( $pipes[2] );
		proc_close( $proc );
	}
	unlink( $attrs_file );
	unlink( $context_file );
	$data = json_decode( $out, true );
	return is_array( $data ) && ! empty( $data['ok'] ) ? (string) $data['html'] : 'HARNESS-ERROR ' . $out;
};

/** The render.php output after the motion renderer has stamped the block's layers. */
$through_motion = static function ( array $attrs, string $html ): string {
	Sgs_Motion_Renderer::reset();
	$GLOBALS['sgs_collected_css']        = array();
	$GLOBALS['sgs_test_is_admin']        = false;
	$GLOBALS['sgs_test_in_loop']         = false;
	$GLOBALS['sgs_test_actions']         = array();
	$GLOBALS['sgs_test_enqueued_styles'] = array();
	$GLOBALS['sgs_test_enqueued']        = array();
	return sgs_test_render_motion_block( array( 'blockName' => 'sgs/decorative-image', 'attrs' => $attrs ), $html );
};

/** The root tag: the first opening tag after any leading <style> element. */
$root_tag = static function ( string $html ): string {
	$html = (string) preg_replace( '#^\s*<style\b[^>]*>.*?</style>#s', '', $html );
	return 1 === preg_match( '/^\s*<([a-z0-9]+)\b[^>]*>/i', $html, $m ) ? $m[0] : '';
};

$base  = array( 'imageUrl' => 'https://example.com/a.jpg', 'imageAlt' => 'A leaf' );
$layer = static fn( string $effect ): array => array(
	'sgsMotion' => array(
		'v'        => 1,
		'elements' => array(
			'root' => array(
				'effects' => array(
					array(
						'id'      => $effect,
						'effect'  => $effect,
						'trigger' => 'load',
					),
				),
			),
		),
	),
);

// 1. A surface-treatment layer on the root: the root is the span host, the image sits inside it.
$attrs_treated = array_merge( $base, $layer( 'surface-treatment' ) );
$html_treated  = $render( $attrs_treated );
$check( 0 !== strpos( $html_treated, 'HARNESS-ERROR' ), 'the treated block renders: ' . substr( $html_treated, 0, 160 ) );
$out_treated = $through_motion( $attrs_treated, $html_treated );
$tag         = $root_tag( $out_treated );
$check( 0 === strpos( $tag, '<span' ) && false !== strpos( $tag, 'sgs-decorative-image' ), 'treated: the root is the span host carrying the block class: ' . $tag );
$check( false !== strpos( $tag, 'data-sgs-fx="surface-treatment"' ), 'treated: the layer\'s data-sgs-fx markup lands on the span host: ' . $tag );
$check( 1 === preg_match( '#<span\b[^>]*>\s*<img\b[^>]*>\s*</span>#', $out_treated ), 'treated: the img is a child of the host: ' . $out_treated );
$check( 1 === preg_match( '#<img\b(?![^>]*data-sgs-fx)[^>]*>#', $out_treated ), 'treated: the img itself carries no data-sgs-fx markup' );

// 2. Negative control: no layer, the root stays the bare img.
$html_plain = $render( $base );
$out_plain  = $through_motion( $base, $html_plain );
$tag_plain  = $root_tag( $out_plain );
$check( 0 === strpos( $tag_plain, '<img' ) && false === strpos( $out_plain, '<span' ), 'untreated: the root is the bare img and no span host is printed: ' . $out_plain );
$check( false === strpos( $out_plain, 'data-sgs-fx="surface-treatment"' ), 'untreated: no surface-treatment markup' );

// 3. Another effect on the root does not make the host.
$attrs_other = array_merge( $base, $layer( 'sheen' ) );
$out_other   = $through_motion( $attrs_other, $render( $attrs_other ) );
$check( 0 === strpos( $root_tag( $out_other ), '<img' ) && false === strpos( $out_other, '<span' ), 'another effect: the root stays the bare img: ' . $out_other );

// 4. Negative control: the helper reads the effect slug, not just the presence of a layer.
require_once $root . '/includes/helpers-motion-effect.php';
$check( sgs_motion_root_has_effect( $attrs_treated, 'surface-treatment' ) && ! sgs_motion_root_has_effect( $attrs_other, 'surface-treatment' ) && ! sgs_motion_root_has_effect( $base, 'surface-treatment' ), 'the gate answers true only for a root surface-treatment layer' );

// 5. No inline style anywhere.
foreach ( array( $out_treated, $out_plain, $out_other ) as $i => $markup ) {
	$check( 0 === preg_match( '/\sstyle\s*=/i', preg_replace( '#<style\b[^>]*>.*?</style>#s', '', $markup ) ), "no style attribute in markup $i" );
}

unlink( $prepend );
echo $failures ? "FAILED: $failures of $checks checks\n" : "PASS: $checks checks\n";
exit( $failures ? 1 : 0 );
