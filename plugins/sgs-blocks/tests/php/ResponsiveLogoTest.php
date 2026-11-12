<?php
/**
 * Tests: sgs/responsive-logo block.
 *
 * Covers:
 *   - block.json structure and attribute contracts.
 *   - sgs_svg_kses_allowed_tags() shape.
 *
 * Self-contained — no WordPress installation required. The WordPress functions the shared site-logo tests need
 * (ResponsiveLogoChainTest) are stubbed below.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

// ── WordPress function stubs ──────────────────────────────────────────────────

if ( ! function_exists( 'absint' ) ) {
	/**
	 * Stub for WP absint().
	 *
	 * @param mixed $val Value to cast.
	 * @return int
	 */
	function absint( $val ): int {
		return abs( (int) $val );
	}
}

if ( ! function_exists( 'sanitize_key' ) ) {
	/**
	 * Stub for WP sanitize_key().
	 *
	 * @param string $key Raw key.
	 * @return string
	 */
	function sanitize_key( string $key ): string {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( $key ) );
	}
}

if ( ! function_exists( 'sanitize_text_field' ) ) {
	/**
	 * Stub for WP sanitize_text_field().
	 *
	 * @param string $str Raw string.
	 * @return string
	 */
	function sanitize_text_field( string $str ): string {
		return trim( wp_strip_all_tags( $str ) );
	}
}

if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	/**
	 * Stub for WP wp_strip_all_tags().
	 *
	 * @param string $str Raw string.
	 * @return string
	 */
	function wp_strip_all_tags( string $str ): string {
		return strip_tags( $str ); // phpcs:ignore WordPress.WP.AlternativeFunctions.strip_tags_strip_tags -- stub only.
	}
}

if ( ! function_exists( 'esc_url' ) ) {
	/**
	 * Stub for WP esc_url().
	 *
	 * @param string $url URL to escape.
	 * @return string
	 */
	function esc_url( string $url ): string {
		return htmlspecialchars( $url, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_attr' ) ) {
	/**
	 * Stub for WP esc_attr().
	 *
	 * @param string $val Value to escape.
	 * @return string
	 */
	function esc_attr( string $val ): string {
		return htmlspecialchars( $val, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'home_url' ) ) {
	/**
	 * Stub for WP home_url().
	 *
	 * @param string $path Optional path suffix.
	 * @return string
	 */
	function home_url( string $path = '' ): string {
		return 'https://example.com' . $path;
	}
}

if ( ! function_exists( 'get_bloginfo' ) ) {
	/**
	 * Stub for WP get_bloginfo().
	 *
	 * @param string $key Info key (unused in stub).
	 * @return string
	 */
	function get_bloginfo( string $key = '' ): string { // phpcs:ignore VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable
		return 'Test Site';
	}
}

if ( ! function_exists( 'wp_get_attachment_url' ) ) {
	/**
	 * Stub for WP wp_get_attachment_url(). Returns a deterministic URL by ID so
	 * tests can assert the correct URL appears in the rendered output.
	 *
	 * @param int $id Attachment ID.
	 * @return string|false
	 */
	function wp_get_attachment_url( int $id ) {
		if ( 0 === $id ) {
			return false;
		}
		return 'https://example.com/wp-content/uploads/logo-' . $id . '.png';
	}
}

if ( ! function_exists( 'get_block_wrapper_attributes' ) ) {
	/**
	 * Stub for WP get_block_wrapper_attributes(). Serialises the attribute array
	 * to an HTML attribute string, omitting keys whose value is boolean false.
	 *
	 * @param array<string, mixed> $attrs Extra attributes to merge.
	 * @return string Serialised HTML attribute string.
	 */
	function get_block_wrapper_attributes( array $attrs = array() ): string {
		$parts = array();
		foreach ( $attrs as $key => $value ) {
			if ( false === $value ) {
				continue;
			}
			$parts[] = esc_attr( $key ) . '="' . esc_attr( (string) $value ) . '"';
		}
		return implode( ' ', $parts );
	}
}

if ( ! function_exists( 'wp_kses' ) ) {
	/**
	 * Stub for WP wp_kses(). Returns content unchanged (sanitisation tested separately).
	 *
	 * @param string               $content      Raw content.
	 * @param array<string, mixed> $allowed_tags Allowed tags schema (unused in stub).
	 * @return string
	 */
	function wp_kses( string $content, array $allowed_tags = array() ): string { // phpcs:ignore VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable
		return $content;
	}
}

if ( ! function_exists( 'get_attached_file' ) ) {
	/**
	 * Stub for WP get_attached_file(). Returns false — no real filesystem in tests.
	 *
	 * @param int $id Attachment ID (unused in stub).
	 * @return false
	 */
	function get_attached_file( int $id ) { // phpcs:ignore VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable
		return false;
	}
}

if ( ! function_exists( 'get_transient' ) ) {
	/**
	 * Stub for WP get_transient(). Serves the intrinsic sizes a test registers in $GLOBALS['sgs_test_img_sizes']
	 * (URL => [w, h]); any other file reads as "size unknown" (an empty cached array).
	 *
	 * @param string $key Transient key (`sgs_imgdim_` + md5 of the URL).
	 * @return array<int, int>
	 */
	function get_transient( string $key ): array {
		foreach ( (array) ( $GLOBALS['sgs_test_img_sizes'] ?? array() ) as $url => $size ) {
			if ( 'sgs_imgdim_' . md5( $url ) === $key ) {
				return $size;
			}
		}
		return array();
	}
}

if ( ! function_exists( 'wp_json_encode' ) ) {
	/**
	 * Stub for WP wp_json_encode().
	 *
	 * @param mixed $data Data.
	 * @return string|false
	 */
	function wp_json_encode( $data ) {
		return json_encode( $data );
	}
}

if ( ! function_exists( 'add_action' ) ) {
	/**
	 * Stub for WP add_action(): hooks are not run in these tests.
	 *
	 * @return bool
	 */
	function add_action(): bool {
		return true;
	}
}

if ( ! function_exists( 'add_filter' ) ) {
	/**
	 * Stub for WP add_filter(): hooks are not run in these tests.
	 *
	 * @return bool
	 */
	function add_filter(): bool {
		return true;
	}
}

/**
 * Class ResponsiveLogoTest
 */
class ResponsiveLogoTest extends TestCase {

	// ── block.json structure ──────────────────────────────────────────────────

	/**
	 * block.json must exist in the expected location.
	 */
	public function test_block_json_exists(): void {
		$this->assertFileExists(
			SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/responsive-logo/block.json'
		);
	}

	/**
	 * block.json name field must be sgs/responsive-logo.
	 */
	public function test_block_json_name(): void {
		$data = json_decode(
			file_get_contents( SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/responsive-logo/block.json' ), // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			associative: true
		);
		$this->assertSame( 'sgs/responsive-logo', $data['name'] );
	}

	/**
	 * All eight required attributes must be declared in block.json.
	 */
	public function test_block_json_has_required_attributes(): void {
		$data  = json_decode(
			file_get_contents( SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/responsive-logo/block.json' ), // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			associative: true
		);
		$attrs = $data['attributes'];

		$this->assertArrayHasKey( 'logoSource', $attrs );
		$this->assertArrayHasKey( 'logoDarkSource', $attrs );
		$this->assertArrayHasKey( 'width', $attrs );
		$this->assertArrayHasKey( 'linkToHome', $attrs );
		$this->assertArrayHasKey( 'logoAlt', $attrs );
	}

	/**
	 * No attribute carries the draw or Lottie settings: a draw or lottie layer on the wrapper part does.
	 */
	public function test_block_json_declares_no_retired_animation_attributes(): void {
		$data = json_decode(
			file_get_contents( SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/responsive-logo/block.json' ), // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			associative: true
		);

		$this->assertSame( array(), preg_grep( '/^(svgAnimation|animationStyle|animationSubstrate|lottie)/', array_keys( $data['attributes'] ) ) );
	}

	// The render tests (switch modes, dark variant, alt, width, draw modifiers) run the real render.php through the QA
	// harness in ResponsiveLogoMediaTest.php.

	// ── PHP lint ──────────────────────────────────────────────────────────────

	/**
	 * render.php must pass PHP syntax checking (php -l).
	 */
	public function test_render_php_passes_lint(): void {
		$path = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/responsive-logo/render.php';
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.system_calls_shell_exec -- test-only, escapeshellarg used.
		$output = shell_exec( 'php -l ' . escapeshellarg( $path ) . ' 2>&1' ) ?? '';

		$this->assertStringContainsString(
			'No syntax errors',
			$output,
			"render.php has PHP syntax errors:\n{$output}"
		);
	}

	// ── sgs_svg_kses_allowed_tags ─────────────────────────────────────────────

	/**
	 * sgs_svg_kses_allowed_tags must return an array.
	 */
	public function test_svg_kses_allowed_tags_returns_array(): void {
		if ( ! function_exists( 'sgs_svg_kses_allowed_tags' ) ) {
			require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/render-helpers.php'; // phpcs:ignore WordPressVIPMinimum.Files.IncludingFile.UsingVariable
		}

		$this->assertIsArray( sgs_svg_kses_allowed_tags() );
	}

	/**
	 * The svg element must be in the allowed-tags schema.
	 */
	public function test_svg_kses_allowed_tags_includes_svg_element(): void {
		if ( ! function_exists( 'sgs_svg_kses_allowed_tags' ) ) {
			require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/render-helpers.php'; // phpcs:ignore WordPressVIPMinimum.Files.IncludingFile.UsingVariable
		}

		$this->assertArrayHasKey( 'svg', sgs_svg_kses_allowed_tags(), 'svg element must be in allowed tags.' );
	}

	/**
	 * The path element must be in the allowed-tags schema (required for draw animations).
	 */
	public function test_svg_kses_allowed_tags_includes_path_element(): void {
		if ( ! function_exists( 'sgs_svg_kses_allowed_tags' ) ) {
			require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/render-helpers.php'; // phpcs:ignore WordPressVIPMinimum.Files.IncludingFile.UsingVariable
		}

		$this->assertArrayHasKey( 'path', sgs_svg_kses_allowed_tags(), 'path element must be allowed for draw animations.' );
	}

	/**
	 * The script element must NOT be in the allowed-tags schema (XSS prevention).
	 */
	public function test_svg_kses_allowed_tags_excludes_script(): void {
		if ( ! function_exists( 'sgs_svg_kses_allowed_tags' ) ) {
			require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/render-helpers.php'; // phpcs:ignore WordPressVIPMinimum.Files.IncludingFile.UsingVariable
		}

		$this->assertArrayNotHasKey( 'script', sgs_svg_kses_allowed_tags(), 'script element must be excluded to prevent XSS.' );
	}

	/**
	 * No on* event-handler attributes may appear in the allowed-tags schema.
	 */
	public function test_svg_kses_allowed_tags_excludes_on_event_attrs(): void {
		if ( ! function_exists( 'sgs_svg_kses_allowed_tags' ) ) {
			require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/render-helpers.php'; // phpcs:ignore WordPressVIPMinimum.Files.IncludingFile.UsingVariable
		}

		$tags       = sgs_svg_kses_allowed_tags();
		$path_attrs = array_keys( $tags['path'] );

		foreach ( $path_attrs as $attr ) {
			$this->assertStringStartsNotWith(
				'on',
				$attr,
				"Event handler attribute '{$attr}' must not be in the SVG allowed tags."
			);
		}
	}
}
