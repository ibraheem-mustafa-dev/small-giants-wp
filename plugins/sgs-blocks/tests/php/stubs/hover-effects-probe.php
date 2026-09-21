<?php
/**
 * Child-process probe for ReviewsEmptyRenderTest: runs the REAL includes/hover-effects.php
 * `inject_hover_effects()` render_block filter on a given block content and prints
 * {"out": "<filtered content>"}.
 *
 * Usage: php hover-effects-probe.php <content-file>
 *
 * The block type is registered with the same `supports.sgs` hover opt-in and defaults that
 * sgs/google-reviews declares in its block.json (read from the real file, not copied), so the
 * filter behaves exactly as it does for that block. WordPress core functions come from the shared
 * QA stub set. Test scaffolding only; nothing here is shipped.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

$sgs_blocks_dir = dirname( __DIR__, 3 );
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
			if ( 'sgs/google-reviews' !== $name ) {
				return null;
			}
			$json       = json_decode( (string) file_get_contents( dirname( __DIR__, 3 ) . '/src/blocks/google-reviews/block.json' ), true );
			$type       = new WP_Block_Type();
			$type->supports = $json['supports'] ?? array();
			return $type;
		}
	}
}

require_once $sgs_blocks_dir . '/includes/hover-effects.php';

$content = (string) file_get_contents( $argv[1] );
$out     = \SGS\Blocks\inject_hover_effects( $content, array( 'blockName' => 'sgs/google-reviews', 'attrs' => array() ) );
echo json_encode( array( 'out' => $out ) );
