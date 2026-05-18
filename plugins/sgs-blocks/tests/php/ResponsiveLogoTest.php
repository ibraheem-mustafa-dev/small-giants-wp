<?php
/**
 * Tests: sgs/responsive-logo block.
 *
 * Covers:
 *   - block.json structure and attribute contracts.
 *   - render.php output for all attribute combinations.
 *   - sgs_svg_kses_allowed_tags() shape.
 *
 * Self-contained — no WordPress installation required. WordPress functions
 * are stubbed below so the render logic can execute without a full WP bootstrap.
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

// ── Test helper ───────────────────────────────────────────────────────────────

/**
 * Execute render.php with the given attributes and return the captured output.
 *
 * Loads render-helpers.php (which provides sgs_svg_kses_allowed_tags) if it
 * has not already been loaded, then includes render.php in a clean scope with
 * only the $attributes variable set.
 *
 * @param array<string, mixed> $attributes Block attributes.
 * @return string Rendered HTML.
 */
function render_responsive_logo( array $attributes ): string {
	$helpers_path = SGS_BLOCKS_PLUGIN_DIR . '/includes/render-helpers.php';
	if ( file_exists( $helpers_path ) && ! function_exists( 'sgs_svg_kses_allowed_tags' ) ) {
		require_once $helpers_path; // phpcs:ignore WordPressVIPMinimum.Files.IncludingFile.UsingVariable -- test helper.
	}

	$render_path = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/responsive-logo/render.php';

	ob_start();
	include $render_path; // phpcs:ignore WordPressVIPMinimum.Files.IncludingFile.UsingVariable -- test helper.
	return ob_get_clean();
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

		$this->assertArrayHasKey( 'desktopLogoId', $attrs );
		$this->assertArrayHasKey( 'tabletLogoId', $attrs );
		$this->assertArrayHasKey( 'mobileLogoId', $attrs );
		$this->assertArrayHasKey( 'svgAnimationSource', $attrs );
		$this->assertArrayHasKey( 'animationStyle', $attrs );
		$this->assertArrayHasKey( 'width', $attrs );
		$this->assertArrayHasKey( 'linkToHome', $attrs );
		$this->assertArrayHasKey( 'alt', $attrs );
	}

	/**
	 * animationStyle must declare all four valid enum values.
	 */
	public function test_block_json_animation_style_has_enum(): void {
		$data = json_decode(
			file_get_contents( SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/responsive-logo/block.json' ), // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			associative: true
		);
		$enum = $data['attributes']['animationStyle']['enum'];

		$this->assertContains( 'none', $enum );
		$this->assertContains( 'draw-on-load', $enum );
		$this->assertContains( 'hover-redraw', $enum );
		$this->assertContains( 'scroll-trigger', $enum );
	}

	/**
	 * supports.sgs.imageControls must be true (image-controls discipline).
	 */
	public function test_block_json_declares_image_controls_support(): void {
		$data = json_decode(
			file_get_contents( SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/responsive-logo/block.json' ), // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			associative: true
		);
		$this->assertSame( true, $data['supports']['sgs']['imageControls'] );
	}

	// ── render.php: desktop-only slot ────────────────────────────────────────

	/**
	 * Render with desktop logo only: must output exactly two source elements.
	 */
	public function test_render_desktop_only_has_two_sources(): void {
		$html = render_responsive_logo( array( 'desktopLogoId' => 10 ) );

		$this->assertSame(
			2,
			substr_count( $html, '<source ' ),
			'render.php must output two <source> elements.'
		);
	}

	/**
	 * Render with desktop logo only: both source srcsets must point to desktop URL.
	 */
	public function test_render_desktop_only_sources_both_point_to_desktop(): void {
		$html        = render_responsive_logo( array( 'desktopLogoId' => 10 ) );
		$desktop_url = 'https://example.com/wp-content/uploads/logo-10.png';

		preg_match_all( '/srcset="([^"]+)"/', $html, $matches );
		foreach ( $matches[1] as $srcset ) {
			$this->assertSame(
				$desktop_url,
				$srcset,
				'When only desktop logo is set, both <source> srcsets must use the desktop URL.'
			);
		}
	}

	// ── render.php: all three slots ───────────────────────────────────────────

	/**
	 * Render with all three logo IDs: each breakpoint source must use the correct URL.
	 */
	public function test_render_all_three_slots_uses_correct_urls(): void {
		$html        = render_responsive_logo(
			array(
				'desktopLogoId' => 10,
				'tabletLogoId'  => 20,
				'mobileLogoId'  => 30,
			)
		);
		$desktop_url = 'https://example.com/wp-content/uploads/logo-10.png';
		$tablet_url  = 'https://example.com/wp-content/uploads/logo-20.png';
		$mobile_url  = 'https://example.com/wp-content/uploads/logo-30.png';

		$this->assertMatchesRegularExpression(
			'#<source media="\(max-width: 600px\)" srcset="' . preg_quote( $mobile_url, '#' ) . '">#',
			$html,
			'Mobile source must use mobileLogoId URL.'
		);

		$this->assertMatchesRegularExpression(
			'#<source media="\(max-width: 1024px\)" srcset="' . preg_quote( $tablet_url, '#' ) . '">#',
			$html,
			'Tablet source must use tabletLogoId URL.'
		);

		$this->assertStringContainsString(
			'src="' . $desktop_url . '"',
			$html,
			'img src must use desktopLogoId URL.'
		);
	}

	// ── render.php: linkToHome ────────────────────────────────────────────────

	/**
	 * linkToHome=true must wrap the logo in an anchor with rel="home".
	 */
	public function test_render_link_to_home_true_wraps_in_anchor(): void {
		$html = render_responsive_logo(
			array(
				'desktopLogoId' => 10,
				'linkToHome'    => true,
			)
		);

		$this->assertStringContainsString( '<a class="sgs-responsive-logo__link"', $html );
		$this->assertStringContainsString( 'href="https://example.com/"', $html );
		$this->assertStringContainsString( 'rel="home"', $html );
	}

	/**
	 * linkToHome=false must not output any anchor element.
	 */
	public function test_render_link_to_home_false_has_no_anchor(): void {
		$html = render_responsive_logo(
			array(
				'desktopLogoId' => 10,
				'linkToHome'    => false,
			)
		);

		$this->assertStringNotContainsString( '<a ', $html );
	}

	// ── render.php: SVG animation attributes ─────────────────────────────────

	/**
	 * When animationStyle is set, the root element must carry data-animation.
	 */
	public function test_render_svg_animation_adds_data_animation_attribute(): void {
		$html = render_responsive_logo(
			array(
				'desktopLogoId'      => 10,
				'animationStyle'     => 'draw-on-load',
				'svgAnimationSource' => 99,
			)
		);

		$this->assertStringContainsString( 'data-animation="draw-on-load"', $html );
	}

	/**
	 * When animationStyle is none, the root element must NOT carry data-animation.
	 */
	public function test_render_no_animation_omits_data_animation_attribute(): void {
		$html = render_responsive_logo(
			array(
				'desktopLogoId'  => 10,
				'animationStyle' => 'none',
			)
		);

		$this->assertStringNotContainsString( 'data-animation', $html );
	}

	/**
	 * draw-on-load style must add the --animate-draw BEM modifier class.
	 */
	public function test_render_animation_modifier_class_draw(): void {
		$html = render_responsive_logo(
			array(
				'desktopLogoId'  => 10,
				'animationStyle' => 'draw-on-load',
			)
		);

		$this->assertStringContainsString( 'sgs-responsive-logo--animate-draw', $html );
	}

	/**
	 * hover-redraw style must add the --animate-hover BEM modifier class.
	 */
	public function test_render_animation_modifier_class_hover(): void {
		$html = render_responsive_logo(
			array(
				'desktopLogoId'  => 10,
				'animationStyle' => 'hover-redraw',
			)
		);

		$this->assertStringContainsString( 'sgs-responsive-logo--animate-hover', $html );
	}

	/**
	 * scroll-trigger style must add the --animate-scroll BEM modifier class.
	 */
	public function test_render_animation_modifier_class_scroll(): void {
		$html = render_responsive_logo(
			array(
				'desktopLogoId'  => 10,
				'animationStyle' => 'scroll-trigger',
			)
		);

		$this->assertStringContainsString( 'sgs-responsive-logo--animate-scroll', $html );
	}

	// ── render.php: empty state ───────────────────────────────────────────────

	/**
	 * Render with no desktopLogoId must return empty string (early exit).
	 */
	public function test_render_without_desktop_logo_returns_empty(): void {
		$html = render_responsive_logo( array() );
		$this->assertSame( '', $html );
	}

	// ── render.php: BEM class contracts ──────────────────────────────────────

	/**
	 * Root wrapper must carry the sgs-responsive-logo class.
	 */
	public function test_render_root_has_bem_class(): void {
		$html = render_responsive_logo( array( 'desktopLogoId' => 10 ) );
		$this->assertStringContainsString( 'sgs-responsive-logo', $html );
	}

	/**
	 * picture element must carry sgs-responsive-logo__picture class.
	 */
	public function test_render_picture_has_bem_class(): void {
		$html = render_responsive_logo( array( 'desktopLogoId' => 10 ) );
		$this->assertStringContainsString( 'sgs-responsive-logo__picture', $html );
	}

	/**
	 * img element must carry sgs-responsive-logo__image--desktop class.
	 */
	public function test_render_img_has_bem_class(): void {
		$html = render_responsive_logo( array( 'desktopLogoId' => 10 ) );
		$this->assertStringContainsString( 'sgs-responsive-logo__image--desktop', $html );
	}

	// ── render.php: width CSS custom property ─────────────────────────────────

	/**
	 * Width attribute must be emitted as a --logo-width CSS custom property.
	 */
	public function test_render_sets_logo_width_custom_property(): void {
		$html = render_responsive_logo(
			array(
				'desktopLogoId' => 10,
				'width'         => 320,
			)
		);

		$this->assertStringContainsString( '--logo-width:320px', $html );
	}

	// ── render.php: alt text ──────────────────────────────────────────────────

	/**
	 * Empty alt must fall back to the site name (get_bloginfo stub returns 'Test Site').
	 */
	public function test_render_alt_text_uses_site_name_when_empty(): void {
		$html = render_responsive_logo( array( 'desktopLogoId' => 10 ) );
		$this->assertStringContainsString( 'alt="Test Site"', $html );
	}

	/**
	 * Provided alt text must appear in the rendered img tag.
	 */
	public function test_render_alt_text_uses_provided_value(): void {
		$html = render_responsive_logo(
			array(
				'desktopLogoId' => 10,
				'alt'           => 'Acme Corp logo',
			)
		);

		$this->assertStringContainsString( 'alt="Acme Corp logo"', $html );
	}

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
