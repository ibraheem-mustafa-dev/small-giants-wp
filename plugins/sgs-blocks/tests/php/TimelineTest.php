<?php
/**
 * Tests: sgs/timeline block contracts.
 *
 * Validates render.php structure, WCAG semantic markup, scroll-reveal
 * behaviour, and block.json attribute schema.
 *
 * Self-contained - no WordPress installation required.
 * PHP lint coverage is provided by RenderOutputTest (data-provider covers all blocks).
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

/**
 * Class TimelineTest
 */
class TimelineTest extends TestCase {

	/**
	 * Absolute path to the timeline block directory.
	 *
	 * @return string
	 */
	private function block_dir(): string {
		return SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/timeline';
	}

	/**
	 * Read a local JSON file and decode it.
	 *
	 * @param string $path Absolute file path.
	 * @return array
	 */
	private function read_json( string $path ): array {
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		return json_decode( file_get_contents( $path ), associative: true ) ?? array();
	}

	/**
	 * Build a minimal entry array for test convenience.
	 *
	 * @param string $date  Date string (YYYY-MM-DD or human-readable).
	 * @param string $title Entry title.
	 * @return array
	 */
	private function make_entry( string $date, string $title ): array {
		return array(
			'date'        => $date,
			'title'       => $title,
			'description' => '',
			'icon'        => '',
			'image'       => 0,
		);
	}

	/**
	 * Render render.php in a minimal sandbox providing just enough WP stubs.
	 *
	 * @param array $attributes Block attributes to pass.
	 * @return string Rendered HTML output.
	 */
	private function render( array $attributes ): string {
		if ( ! function_exists( 'get_block_wrapper_attributes' ) ) {
			/**
			 * Stub: get_block_wrapper_attributes.
			 *
			 * @param array $args HTML attribute key-value pairs.
			 * @return string
			 */
			function get_block_wrapper_attributes( array $args = array() ): string {
				$parts = array();
				foreach ( $args as $key => $value ) {
					$parts[] = htmlspecialchars( $key, ENT_QUOTES, 'UTF-8' )
						. '="' . htmlspecialchars( $value, ENT_QUOTES, 'UTF-8' ) . '"';
				}
				return implode( ' ', $parts );
			}
		}

		if ( ! function_exists( 'esc_attr' ) ) {
			/**
			 * Stub: esc_attr.
			 *
			 * @param mixed $text Value to escape.
			 * @return string
			 */
			function esc_attr( $text ): string {
				return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
			}
		}

		if ( ! function_exists( 'esc_html' ) ) {
			/**
			 * Stub: esc_html.
			 *
			 * @param mixed $text Value to escape.
			 * @return string
			 */
			function esc_html( $text ): string {
				return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
			}
		}

		if ( ! function_exists( 'esc_url' ) ) {
			/**
			 * Stub: esc_url.
			 *
			 * @param mixed $url URL to escape.
			 * @return string
			 */
			function esc_url( $url ): string {
				return htmlspecialchars( (string) $url, ENT_QUOTES, 'UTF-8' );
			}
		}

		if ( ! function_exists( 'wp_kses_post' ) ) {
			/**
			 * Stub: wp_kses_post.
			 *
			 * @param mixed $content HTML content.
			 * @return string
			 */
			function wp_kses_post( $content ): string {
				return strip_tags( (string) $content, '<p><strong><em><a><ul><ol><li><br><span>' );
			}
		}

		if ( ! function_exists( 'absint' ) ) {
			/**
			 * Stub: absint.
			 *
			 * @param mixed $value Value to convert.
			 * @return int
			 */
			function absint( $value ): int {
				return abs( (int) $value );
			}
		}

		if ( ! function_exists( 'wp_get_attachment_image_url' ) ) {
			/**
			 * Stub: wp_get_attachment_image_url.
			 *
			 * @param int    $id   Attachment ID.
			 * @param string $size Image size slug.
			 * @return string
			 */
			function wp_get_attachment_image_url( int $id, string $size = 'thumbnail' ): string {
				return '';
			}
		}

		if ( ! function_exists( 'get_post_meta' ) ) {
			/**
			 * Stub: get_post_meta.
			 *
			 * @param int    $id     Post ID.
			 * @param string $key    Meta key.
			 * @param bool   $single Whether to return a single value.
			 * @return mixed
			 */
			function get_post_meta( int $id, string $key = '', bool $single = false ) {
				return $single ? '' : array();
			}
		}

		// sgs_colour_value is provided by render-helpers.php which render.php loads via require_once.
		// No stub needed here — the real implementation will already be present.

		ob_start();
		$content = ''; // phpcs:ignore VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable
		$block   = null; // phpcs:ignore VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable
		include $this->block_dir() . '/render.php';
		return ob_get_clean();
	}

	// =========================================================================
	// File existence
	// =========================================================================

	/**
	 * Render.php must exist.
	 */
	public function test_render_php_exists(): void {
		$this->assertFileExists( $this->block_dir() . '/render.php' );
	}

	/**
	 * Block.json must exist and declare a render callback.
	 */
	public function test_block_json_exists_and_declares_render(): void {
		$path = $this->block_dir() . '/block.json';
		$this->assertFileExists( $path );
		$data = $this->read_json( $path );
		$this->assertArrayHasKey( 'render', $data );
		$this->assertStringStartsWith( 'file:', $data['render'] );
	}

	// =========================================================================
	// block.json schema
	// =========================================================================

	/**
	 * Block.json must declare supports.sgs.imageControls = true.
	 */
	public function test_block_json_declares_image_controls(): void {
		$data = $this->read_json( $this->block_dir() . '/block.json' );
		$this->assertTrue(
			isset( $data['supports']['sgs']['imageControls'] )
			&& true === $data['supports']['sgs']['imageControls'],
			'block.json must declare supports.sgs.imageControls = true.'
		);
	}

	/**
	 * Block.json entries attribute must have an array default to prevent .map() errors.
	 */
	public function test_block_json_entries_has_array_default(): void {
		$data = $this->read_json( $this->block_dir() . '/block.json' );
		$this->assertSame( 'array', $data['attributes']['entries']['type'] );
		$this->assertIsArray( $data['attributes']['entries']['default'] );
	}

	// =========================================================================
	// Render output
	// =========================================================================

	/**
	 * Three entries produce exactly three list items.
	 */
	public function test_render_three_entries_produces_three_list_items(): void {
		$html = $this->render(
			array(
				'entries' => array(
					$this->make_entry( '2020-01-01', 'Alpha' ),
					$this->make_entry( '2021-06-15', 'Beta' ),
					$this->make_entry( '2022-12-01', 'Gamma' ),
				),
			)
		);

		$count = substr_count( $html, '<li ' );
		$this->assertSame( 3, $count, "Expected 3 <li> elements, got {$count}." );
	}

	/**
	 * Root element must be an ordered list for WCAG semantics.
	 */
	public function test_render_uses_ordered_list_element(): void {
		$html = $this->render(
			array(
				'entries' => array( $this->make_entry( '2020-01-01', 'A' ) ),
			)
		);
		$this->assertStringContainsString( '<ol ', $html, 'Root element must be <ol>.' );
	}

	/**
	 * Orientation=horizontal adds the horizontal modifier class to root.
	 */
	public function test_horizontal_orientation_adds_modifier_class(): void {
		$html = $this->render(
			array(
				'orientation' => 'horizontal',
				'entries'     => array( $this->make_entry( '2020-01-01', 'A' ) ),
			)
		);
		$this->assertStringContainsString( 'sgs-timeline--horizontal', $html );
	}

	/**
	 * RevealOnScroll=false bakes is-revealed into every entry and omits the data attribute.
	 */
	public function test_reveal_disabled_pre_reveals_all_entries(): void {
		$html = $this->render(
			array(
				'revealOnScroll' => false,
				'entries'        => array(
					$this->make_entry( '2020-01-01', 'A' ),
					$this->make_entry( '2021-01-01', 'B' ),
				),
			)
		);

		$li_count       = substr_count( $html, '<li ' );
		$revealed_count = substr_count( $html, 'is-revealed' );

		$this->assertSame(
			$li_count,
			$revealed_count,
			'Every entry must have is-revealed when revealOnScroll is false.'
		);
		$this->assertStringNotContainsString( 'data-reveal-on-scroll', $html );
	}

	/**
	 * RevealOnScroll=true adds data-reveal-on-scroll and does not pre-reveal entries.
	 */
	public function test_reveal_enabled_adds_data_attribute(): void {
		$html = $this->render(
			array(
				'revealOnScroll' => true,
				'entries'        => array( $this->make_entry( '2020-01-01', 'A' ) ),
			)
		);

		$this->assertStringContainsString( 'data-reveal-on-scroll', $html );
		$this->assertStringNotContainsString( 'is-revealed', $html );
	}

	/**
	 * An ISO date string produces a matching datetime attribute on the time element.
	 */
	public function test_date_string_produces_time_datetime_attribute(): void {
		$html = $this->render(
			array(
				'entries' => array( $this->make_entry( '2026-05-20', 'Launch' ) ),
			)
		);
		$this->assertStringContainsString( 'datetime="2026-05-20"', $html );
	}

	/**
	 * Each entry must contain a time element for WCAG date annotation.
	 */
	public function test_render_uses_time_element(): void {
		$html = $this->render(
			array(
				'entries' => array( $this->make_entry( '2020-01-01', 'A' ) ),
			)
		);
		$this->assertStringContainsString( '<time ', $html );
	}

	/**
	 * An empty entries array produces a valid empty list without PHP errors.
	 */
	public function test_empty_entries_produces_valid_output(): void {
		$html = $this->render( array( 'entries' => array() ) );
		$this->assertStringContainsString( '<ol ', $html );
		$this->assertStringNotContainsString( '<li ', $html );
	}

	/**
	 * An invalid orientation value falls back to vertical, not injecting arbitrary classes.
	 */
	public function test_invalid_orientation_falls_back_to_vertical(): void {
		$html = $this->render(
			array(
				'orientation' => 'diagonal',
				'entries'     => array( $this->make_entry( '2020-01-01', 'A' ) ),
			)
		);
		$this->assertStringContainsString( 'sgs-timeline--vertical', $html );
		$this->assertStringNotContainsString( 'sgs-timeline--diagonal', $html );
	}
}
