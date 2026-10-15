<?php
/**
 * Standalone test: the legacy hover extension stands down on a block holding sgsMotion (Spec 38A plan, overlap rule).
 *
 * Runs the REAL `includes/hover-effects/hover-effects.php` `inject_hover_effects()` on an sgs/info-box, whose block.json
 * hover defaults switch the scale hover on with no stored attribute. Without sgsMotion the legacy movement classes appear
 * (the negative control: this test can fail); with sgsMotion they do not, because their `:hover` rules set `transform`,
 * `filter` and `opacity` outright and would replace the motion model's composed channels, while the non-motion outputs
 * (focus ring, block link, shadow) stay.
 *
 * Usage: php plugins/sgs-blocks/tests/php/run-hover-motion-overlap-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

$sgs_blocks_dir = dirname( __DIR__, 2 );
define( 'ABSPATH', $sgs_blocks_dir . '/' );
define( 'SGS_BLOCKS_PATH', $sgs_blocks_dir . '/' );

require_once $sgs_blocks_dir . '/scripts/qa/lib/wp-stubs.php';

if ( ! function_exists( 'add_filter' ) ) {
	function add_filter( ...$args ): bool { // phpcs:ignore
		return true;
	}
}
if ( ! function_exists( 'wp_parse_url' ) ) {
	function wp_parse_url( $url, $component = -1 ) { // phpcs:ignore
		return parse_url( (string) $url, $component );
	}
}
if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $url ): string { // phpcs:ignore
		return (string) $url;
	}
}
if ( ! function_exists( 'wp_rand' ) ) {
	function wp_rand( $min = 0, $max = 0 ): int { // phpcs:ignore
		return random_int( (int) $min, (int) $max );
	}
}
if ( ! class_exists( 'WP_Block_Type' ) ) {
	class WP_Block_Type { // phpcs:ignore
		public $supports = array();
	}
}
if ( ! class_exists( 'WP_Block_Type_Registry' ) ) {
	class WP_Block_Type_Registry { // phpcs:ignore
		private static $inst;
		public static function get_instance(): self {
			return self::$inst ??= new self();
		}
		public function get_registered( string $name ) {
			if ( 'sgs/info-box' !== $name ) {
				return null;
			}
			$json           = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/info-box/block.json' ), true );
			$type           = new WP_Block_Type();
			$type->supports = $json['supports'] ?? array();
			return $type;
		}
	}
}

require_once $sgs_blocks_dir . '/includes/hover-effects/hover-effects.php';

$content = '<div class="wp-block-sgs-info-box sgs-info-box"><p>Card</p></div>';
$motion  = array(
	'v'        => 1,
	'elements' => array(
		'root' => array(
			'hover' => array(
				'state' => array(
					'values' => array(
						'scale'         => 1.04,
						'followPointer' => true,
					),
				),
			),
		),
	),
);

$movement = array( 'sgs-has-hover-scale', 'sgs-has-hover-lift', 'sgs-has-img-zoom', 'sgs-has-hover-grayscale', 'sgs-has-tilt-3d' );
$pass     = 0;
$fail     = 0;
$check    = static function ( bool $ok, string $label ) use ( &$pass, &$fail ): void {
	$ok ? $pass++ : $fail++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
};
$classes  = static function ( string $html ): array {
	return preg_match( '/class="([^"]*)"/', $html, $m ) ? explode( ' ', $m[1] ) : array();
};

$legacy = $classes( \SGS\Blocks\inject_hover_effects( $content, array( 'blockName' => 'sgs/info-box', 'attrs' => array( 'sgsHoverTilt3D' => true ) ) ) );
$check( in_array( 'sgs-has-hover-scale', $legacy, true ), 'negative control: without sgsMotion the block defaults add sgs-has-hover-scale' );
$check( in_array( 'sgs-has-tilt-3d', $legacy, true ), 'negative control: without sgsMotion a stored sgsHoverTilt3D adds sgs-has-tilt-3d' );

$model = $classes(
	\SGS\Blocks\inject_hover_effects(
		$content,
		array(
			'blockName' => 'sgs/info-box',
			'attrs'     => array(
				'sgsHoverTilt3D' => true,
				'sgsMotion'      => $motion,
			),
		)
	)
);
$left = array_values( array_intersect( $movement, $model ) );
$check( array() === $left, 'with sgsMotion no legacy movement class is added (left: ' . implode( ', ', $left ) . ')' );
$check( in_array( 'sgs-has-focus-ring', $model, true ) === in_array( 'sgs-has-focus-ring', $legacy, true ), 'with sgsMotion the non-motion focus ring output is unchanged' );

// The stand-down is scoped to a hover on the root: a motion document holding only an entrance never touches the
// root's hover channels, so the block's own hover defaults keep painting.
$entrance_only = $classes(
	\SGS\Blocks\inject_hover_effects(
		$content,
		array(
			'blockName' => 'sgs/info-box',
			'attrs'     => array(
				'sgsMotion' => array(
					'v'        => 1,
					'elements' => array(
						'root' => array(
							'entrance' => array( 'preset' => 'fade-up' ),
						),
					),
				),
			),
		)
	)
);
$check( in_array( 'sgs-has-hover-scale', $entrance_only, true ), 'an entrance-only sgsMotion keeps the block default sgs-has-hover-scale' );

$root_effects = $classes(
	\SGS\Blocks\inject_hover_effects(
		$content,
		array(
			'blockName' => 'sgs/info-box',
			'attrs'     => array(
				'sgsMotion' => array(
					'v'        => 1,
					'elements' => array(
						'root' => array(
							'hover' => array( 'effects' => array( array( 'effect' => 'magnet' ) ) ),
						),
					),
				),
			),
		)
	)
);
$check( ! in_array( 'sgs-has-hover-scale', $root_effects, true ), 'a root hover effect layer stands the legacy scale down' );

$child_hover = $classes(
	\SGS\Blocks\inject_hover_effects(
		$content,
		array(
			'blockName' => 'sgs/info-box',
			'attrs'     => array(
				'sgsMotion' => array(
					'v'        => 1,
					'elements' => array(
						'icon' => array(
							'hover' => array( 'state' => array( 'values' => array( 'scale' => 1.1 ) ) ),
						),
					),
				),
			),
		)
	)
);
$check( in_array( 'sgs-has-hover-scale', $child_hover, true ), 'a hover on a child element only keeps the root legacy scale' );

echo "RESULT {$pass} passed, {$fail} failed\n";
exit( $fail > 0 ? 1 : 0 );
