<?php
/**
 * The SVG allowlist must be reachable by the names wp_kses looks up: it lowercases an attribute's name first, so a
 * camelCase key without a lowercase twin (pathLength) strips the attribute from every inline and uploaded SVG. An
 * uploaded line-draw drawing (pathLength="1" with stroke-dasharray: 1) then paints 1px dashes instead of its line.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

/**
 * Every SVG allowlist key is reachable by kses's lowercased lookup; draw and filter attributes survive.
 */
class SvgKsesCaseTest extends TestCase {

	/**
	 * The allowlist under test.
	 *
	 * @return array<string, array<string, bool>>
	 */
	private static function allowed(): array {
		if ( ! function_exists( 'sgs_svg_kses_allowed_tags' ) ) {
			require_once dirname( __DIR__, 2 ) . '/includes/helpers-svg-kses.php';
		}
		return sgs_svg_kses_allowed_tags();
	}

	/**
	 * No camelCase key lacks its lowercase twin.
	 */
	public function test_every_attribute_key_is_reachable_in_lowercase(): void {
		$unreachable = array();
		foreach ( self::allowed() as $tag => $attrs ) {
			foreach ( array_keys( $attrs ) as $attr ) {
				if ( strtolower( $attr ) !== $attr && ! isset( $attrs[ strtolower( $attr ) ] ) ) {
					$unreachable[] = "{$tag}.{$attr}";
				}
			}
		}
		$this->assertSame( array(), $unreachable, 'wp_kses looks attributes up lowercased; add the lowercase key' );
	}

	/**
	 * Every shape keeps pathLength and a filter keeps its colour space.
	 */
	public function test_draw_and_filter_attributes_are_allowed(): void {
		$allowed = self::allowed();
		foreach ( array( 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse' ) as $shape ) {
			$this->assertArrayHasKey( 'pathlength', $allowed[ $shape ], "{$shape} keeps pathLength" );
		}
		$this->assertArrayHasKey( 'color-interpolation-filters', $allowed['filter'] );
	}

	/**
	 * With a real wp_kses (SGS_WP_INCLUDES_DIR names a wp-includes directory), pathLength and
	 * color-interpolation-filters survive and a script still does not.
	 */
	public function test_real_kses_keeps_path_length_and_filter_colour_space(): void {
		$wp = getenv( 'SGS_WP_INCLUDES_DIR' );
		if ( ! $wp || ! is_file( rtrim( $wp, '/\\' ) . '/kses.php' ) ) {
			$this->markTestSkipped( 'Set SGS_WP_INCLUDES_DIR to a WordPress wp-includes directory to run the real-kses proof.' );
		}
		$plugin = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgssvgcase' );
		file_put_contents(
			$script,
			'<?php define( "ABSPATH", "x/" );'
			. '$core = ' . var_export( rtrim( $wp, '/\\' ) . '/', true ) . ';'
			. 'function apply_filters( $h, $v ) { return $v; } function add_filter() { return true; } function has_filter() { return false; }'
			. 'function do_action() {} function get_option( $k, $d = false ) { return "blog_charset" === $k ? "UTF-8" : $d; }'
			. 'function wp_allowed_protocols() { return array( "http", "https" ); }'
			. 'function _doing_it_wrong() {} function get_bloginfo() { return "UTF-8"; } function __( $s ) { return $s; }'
			. 'function is_utf8_charset() { return true; } function wp_get_wp_version() { return "6.9"; }'
			. 'require $core . "formatting.php"; require $core . "kses.php";'
			. 'require ' . var_export( $plugin . '/includes/helpers-svg-kses.php', true ) . ';'
			. 'echo wp_kses( "<svg><filter id=\"g\" color-interpolation-filters=\"sRGB\"></filter><path pathLength=\"1\" d=\"M0 0L9 9\"/><circle pathLength=\"1\" r=\"2\"/><script>x</script></svg>", sgs_svg_kses_allowed_tags() );'
		);
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$this->assertStringContainsString( 'color-interpolation-filters="sRGB"', $out, $out );
		$this->assertSame( 2, substr_count( strtolower( $out ), 'pathlength="1"' ), $out );
		$this->assertStringNotContainsString( '<script', $out );
	}
}
