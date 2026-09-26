<?php
/**
 * Tests: sgs/responsive-logo — "the logo responds to its ground" (U-13 §4.5).
 *
 * Covers the render.php side of the ground-response feature only (the
 * ancestor-class CSS in style.scss is covered separately, by
 * scripts/tests/test-responsive-logo-ground-response.mjs):
 *   - colourTreatment accepts 'auto' and still refuses an unknown value.
 *   - colourTreatment 'auto' emits the sgs-responsive-logo--colour-auto
 *     marker class render.php hands to style.scss's ground rules.
 *   - darkLogoId set emits the sgs-responsive-logo--has-dark-logo marker
 *     class that gates the ground-response display-swap rules.
 *
 * Self-contained — no WordPress installation required. Reuses the same
 * WordPress function stubs as ResponsiveLogoTest.php, each guarded with
 * function_exists() so loading both test files in one PHPUnit run does not
 * redeclare anything.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

// ── WordPress function stubs (shared shape with ResponsiveLogoTest.php) ──────

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

if ( ! function_exists( 'render_responsive_logo' ) ) {
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
}

/**
 * Class ResponsiveLogoGroundResponseTest
 */
class ResponsiveLogoGroundResponseTest extends TestCase {

	// ── block.json: colourTreatment enum ─────────────────────────────────────

	/**
	 * Block.json colourTreatment enum must include 'auto' alongside the
	 * existing '' and 'white' values.
	 */
	public function test_block_json_colour_treatment_enum_includes_auto(): void {
		$data = json_decode(
			file_get_contents( SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/responsive-logo/block.json' ), // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			associative: true
		);
		$enum = $data['attributes']['colourTreatment']['enum'];

		$this->assertContains( '', $enum );
		$this->assertContains( 'white', $enum );
		$this->assertContains( 'auto', $enum );
	}

	// ── render.php: colourTreatment 'auto' emits the ground-response marker ──

	/**
	 * The colourTreatment value 'auto' must emit the
	 * sgs-responsive-logo--colour-auto marker class — style.scss's ground
	 * rules key off this class, not off an inline filter, because whether
	 * the filter should apply depends on ancestor classes render.php cannot
	 * see.
	 */
	public function test_render_colour_treatment_auto_emits_marker_class(): void {
		$html = render_responsive_logo(
			array(
				'logoId'          => 10,
				'colourTreatment' => 'auto',
			)
		);

		$this->assertStringContainsString( 'sgs-responsive-logo--colour-auto', $html );
	}

	/**
	 * The colourTreatment value 'auto' must NOT also emit the unconditional
	 * 'white' inline filter — that filter is the always-on operator choice
	 * for the DISTINCT 'white' value, and running both would defeat 'auto'
	 * being ground-conditional.
	 */
	public function test_render_colour_treatment_auto_emits_no_inline_filter(): void {
		$html = render_responsive_logo(
			array(
				'logoId'          => 10,
				'colourTreatment' => 'auto',
			)
		);

		$this->assertStringNotContainsString( 'filter:brightness(0) invert(1)', $html );
	}

	/**
	 * The colourTreatment value 'white' (the pre-existing value) must still
	 * emit its unconditional inline filter and must NOT carry the 'auto'
	 * marker class — negative control proving the two values stay distinct
	 * after 'auto' was added.
	 */
	public function test_render_colour_treatment_white_still_emits_inline_filter(): void {
		$html = render_responsive_logo(
			array(
				'logoId'          => 10,
				'colourTreatment' => 'white',
			)
		);

		$this->assertStringContainsString( 'filter:brightness(0) invert(1)', $html );
		$this->assertStringNotContainsString( 'sgs-responsive-logo--colour-auto', $html );
	}

	/**
	 * Default colourTreatment ('') must emit neither the inline filter nor
	 * the 'auto' marker class — negative control for the two tests above.
	 */
	public function test_render_colour_treatment_default_emits_nothing(): void {
		$html = render_responsive_logo( array( 'logoId' => 10 ) );

		$this->assertStringNotContainsString( 'filter:brightness(0) invert(1)', $html );
		$this->assertStringNotContainsString( 'sgs-responsive-logo--colour-auto', $html );
	}

	/**
	 * An unknown colourTreatment value must be refused and fall back to the
	 * default ('') behaviour — no inline filter, no marker class. Proves the
	 * allow-list (not just the enum in block.json, which the editor UI
	 * enforces but a hand-authored pattern/template can bypass) actually
	 * gates render.php.
	 */
	public function test_render_colour_treatment_unknown_value_is_refused(): void {
		$html = render_responsive_logo(
			array(
				'logoId'          => 10,
				'colourTreatment' => 'sepia',
			)
		);

		$this->assertStringNotContainsString( 'filter:brightness(0) invert(1)', $html );
		$this->assertStringNotContainsString( 'sgs-responsive-logo--colour-auto', $html );
	}

	// ── render.php: darkLogoId emits the has-dark-logo marker ────────────────

	/**
	 * Setting darkLogoId must emit the sgs-responsive-logo--has-dark-logo
	 * marker class — style.scss's ground-response display-swap rules are
	 * scoped to this class so an instance with no dark variant set never
	 * swaps to a variant that does not exist ("leave empty to use the same
	 * logo everywhere").
	 */
	public function test_render_dark_logo_id_emits_has_dark_logo_marker_class(): void {
		$html = render_responsive_logo(
			array(
				'logoId'     => 10,
				'darkLogoId' => 20,
			)
		);

		$this->assertStringContainsString( 'sgs-responsive-logo--has-dark-logo', $html );
		$this->assertStringContainsString( 'sgs-responsive-logo__dark', $html );
	}

	/**
	 * Negative control: no darkLogoId set must NOT emit the has-dark-logo
	 * marker class, and must not render a dark-variant <img> at all.
	 */
	public function test_render_without_dark_logo_id_omits_has_dark_logo_marker_class(): void {
		$html = render_responsive_logo( array( 'logoId' => 10 ) );

		$this->assertStringNotContainsString( 'sgs-responsive-logo--has-dark-logo', $html );
		$this->assertStringNotContainsString( 'sgs-responsive-logo__dark', $html );
	}
}
