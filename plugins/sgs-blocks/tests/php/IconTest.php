<?php
/**
 * Tests: sgs/icon block — render.php contracts and WCAG semantics.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

class IconTest extends TestCase {

	private string $block_dir;

	protected function setUp(): void {
		$this->block_dir = SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/icon';
	}

	private function render_block( array $attributes ): string {
		static $helpers_loaded = false;
		if ( ! $helpers_loaded ) {
			require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/render-helpers.php';
			require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/lucide-icons.php';
			$helpers_loaded = true;
		}
		$block             = new stdClass();
		$block->attributes = $attributes;
		$content           = '';
		ob_start();
		try {
			include $this->block_dir . '/render.php';
			return ob_get_clean() ?: '';
		} catch ( \Throwable $e ) {
			ob_end_clean();
			throw $e;
		}
	}

	public function test_render_php_passes_lint(): void {
		$out = shell_exec( PHP_BINARY . ' -l ' . escapeshellarg( $this->block_dir . '/render.php' ) . ' 2>&1' ) ?? '';
		$this->assertStringContainsString( 'No syntax errors', $out );
	}

	public function test_block_json_is_valid(): void {
		$data  = json_decode( file_get_contents( $this->block_dir . '/block.json' ), associative: true );
		$attrs = $data['attributes'] ?? array();
		$this->assertSame( 'sgs/icon', $data['name'] ?? '' );
		$this->assertArrayHasKey( 'iconName', $attrs );
		$this->assertArrayHasKey( 'iconSize', $attrs );
		$this->assertArrayHasKey( 'linkUrl', $attrs );
		$this->assertArrayHasKey( 'linkTarget', $attrs );
		$this->assertArrayHasKey( 'ariaLabel', $attrs );
	}

	public function test_star_icon_renders_svg(): void {
		$output = $this->render_block( array( 'iconName' => 'star' ) );
		$this->assertNotEmpty( $output );
		$this->assertStringContainsString( '<svg', $output );
		$this->assertStringContainsString( 'sgs-icon__svg', $output );
	}

	public function test_linked_icon_blank_target_gets_rel_and_aria_label(): void {
		$output = $this->render_block(
			array(
				'iconName'   => 'arrow-right',
				'linkUrl'    => 'https://example.com',
				'linkTarget' => '_blank',
				'ariaLabel'  => 'Go to example',
			)
		);
		$this->assertStringContainsString( 'rel="noopener noreferrer"', $output );
		$this->assertStringContainsString( 'aria-label="Go to example"', $output );
		$this->assertStringContainsString( 'sgs-icon__link', $output );
	}

	public function test_informative_icon_has_role_img(): void {
		$output = $this->render_block(
			array(
				'iconName'  => 'check',
				'ariaLabel' => 'Task complete',
			)
		);
		$this->assertStringContainsString( 'role="img"', $output );
		$this->assertStringContainsString( 'aria-label="Task complete"', $output );
		$this->assertStringContainsString( 'aria-hidden="true"', $output );
	}

	public function test_decorative_icon_is_aria_hidden(): void {
		$output = $this->render_block(
			array(
				'iconName'  => 'heart',
				'ariaLabel' => '',
			)
		);
		$this->assertStringContainsString( 'aria-hidden="true"', $output );
		$this->assertStringNotContainsString( 'role="img"', $output );
	}

	public function test_self_target_no_noopener(): void {
		$output = $this->render_block(
			array(
				'iconName'   => 'home',
				'linkUrl'    => 'https://example.com',
				'linkTarget' => '_self',
			)
		);
		$this->assertStringNotContainsString( 'noopener', $output );
	}

	public function test_linked_icon_falls_back_to_icon_name_for_aria_label(): void {
		$output = $this->render_block(
			array(
				'iconName'   => 'phone',
				'linkUrl'    => 'tel:+441234567890',
				'linkTarget' => '_self',
				'ariaLabel'  => '',
			)
		);
		$this->assertStringContainsString( 'aria-label="phone"', $output );
	}

	// ── Multi-source: iconSource attribute ─────────────────────────────────────

	/**
	 * Block JSON includes all four new attributes from Branch H.
	 */
	public function test_block_json_has_multi_source_attributes(): void {
		$data  = json_decode( file_get_contents( $this->block_dir . '/block.json' ), associative: true );
		$attrs = $data['attributes'] ?? array();
		$this->assertArrayHasKey( 'iconSource', $attrs, 'block.json must declare iconSource attribute.' );
		$this->assertArrayHasKey( 'emojiChar', $attrs, 'block.json must declare emojiChar attribute.' );
		$this->assertArrayHasKey( 'dashiconName', $attrs, 'block.json must declare dashiconName attribute.' );
		$this->assertArrayHasKey( 'wpIconName', $attrs, 'block.json must declare wpIconName attribute.' );
		$this->assertSame( 'lucide', $attrs['iconSource']['default'], 'iconSource must default to lucide.' );
	}

	/**
	 * Missing iconSource defaults to lucide (backward compatibility).
	 */
	public function test_missing_icon_source_defaults_to_lucide(): void {
		$output = $this->render_block( array( 'iconName' => 'star' ) );
		$this->assertStringContainsString(
			'sgs-icon--source-lucide',
			$output,
			'Omitting iconSource should default to lucide source modifier.'
		);
		$this->assertStringContainsString( '<svg', $output );
	}

	/**
	 * Lucide source adds BEM source modifier class.
	 */
	public function test_lucide_source_adds_bem_modifier_class(): void {
		$output = $this->render_block(
			array(
				'iconSource' => 'lucide',
				'iconName'   => 'heart',
			)
		);
		$this->assertStringContainsString( 'sgs-icon--source-lucide', $output );
	}

	// ── Emoji source ──────────────────────────────────────────────────────────

	/**
	 * Emoji source renders .sgs-icon__emoji with role="img" and aria-label.
	 */
	public function test_emoji_source_renders_semantic_span(): void {
		$output = $this->render_block(
			array(
				'iconSource' => 'emoji',
				'emojiChar'  => '🎉',
			)
		);
		$this->assertStringContainsString(
			'sgs-icon__emoji',
			$output,
			'Emoji source should render .sgs-icon__emoji span.'
		);
		$this->assertStringContainsString(
			'role="img"',
			$output,
			'Emoji span must have role="img".'
		);
		$this->assertStringContainsString(
			'aria-label=',
			$output,
			'Emoji span must have an aria-label.'
		);
		$this->assertStringContainsString(
			'🎉',
			$output,
			'Emoji character should appear in the output.'
		);
	}

	/**
	 * Emoji source adds BEM modifier class.
	 */
	public function test_emoji_source_adds_bem_modifier(): void {
		$output = $this->render_block(
			array(
				'iconSource' => 'emoji',
				'emojiChar'  => '⭐',
			)
		);
		$this->assertStringContainsString( 'sgs-icon--source-emoji', $output );
	}

	/**
	 * Emoji without explicit ariaLabel falls back to aria-label="icon".
	 */
	public function test_emoji_without_aria_label_falls_back_to_icon(): void {
		$output = $this->render_block(
			array(
				'iconSource' => 'emoji',
				'emojiChar'  => '🔥',
				'ariaLabel'  => '',
			)
		);
		$this->assertStringContainsString(
			'aria-label="icon"',
			$output,
			'Emoji with no ariaLabel must fall back to aria-label="icon".'
		);
	}

	/**
	 * Emoji with explicit ariaLabel uses that label.
	 */
	public function test_emoji_with_explicit_aria_label(): void {
		$output = $this->render_block(
			array(
				'iconSource' => 'emoji',
				'emojiChar'  => '⭐',
				'ariaLabel'  => 'Five stars',
			)
		);
		$this->assertStringContainsString( 'aria-label="Five stars"', $output );
	}

	/**
	 * HTML in emojiChar is stripped (XSS protection).
	 */
	public function test_emoji_html_injection_is_stripped(): void {
		$output = $this->render_block(
			array(
				'iconSource' => 'emoji',
				'emojiChar'  => '<script>alert(1)</script>🎉',
			)
		);
		$this->assertStringNotContainsString(
			'<script>',
			$output,
			'HTML injection in emojiChar must be stripped.'
		);
		$this->assertStringContainsString(
			'🎉',
			$output,
			'Safe emoji characters should survive stripping.'
		);
	}

	// ── Dashicon source ───────────────────────────────────────────────────────

	/**
	 * Dashicon source renders span.dashicons with the correct slug.
	 */
	public function test_dashicon_source_renders_dashicons_span(): void {
		$output = $this->render_block(
			array(
				'iconSource'   => 'dashicon',
				'dashiconName' => 'star-filled',
			)
		);
		$this->assertStringContainsString(
			'dashicons',
			$output,
			'Dashicon source should output a span with dashicons class.'
		);
		$this->assertStringContainsString(
			'dashicons-star-filled',
			$output,
			'Dashicon source should include the icon slug as a CSS class.'
		);
		$this->assertStringContainsString(
			'aria-hidden="true"',
			$output,
			'Dashicon span should be aria-hidden.'
		);
	}

	/**
	 * Dashicon source adds BEM modifier class.
	 */
	public function test_dashicon_source_adds_bem_modifier(): void {
		$output = $this->render_block(
			array(
				'iconSource'   => 'dashicon',
				'dashiconName' => 'heart',
			)
		);
		$this->assertStringContainsString( 'sgs-icon--source-dashicon', $output );
	}

	// ── WordPress icons source ────────────────────────────────────────────────

	/**
	 * WP icon source renders inline SVG inside .sgs-icon__svg.
	 */
	public function test_wp_icon_source_renders_svg(): void {
		$output = $this->render_block(
			array(
				'iconSource' => 'wp-icon',
				'wpIconName' => 'check',
			)
		);
		$this->assertStringContainsString(
			'sgs-icon__svg',
			$output,
			'WP icon source should render .sgs-icon__svg wrapper.'
		);
		$this->assertStringContainsString(
			'<svg',
			$output,
			'WP icon source should output inline SVG.'
		);
	}

	/**
	 * WP icon source adds BEM modifier class.
	 */
	public function test_wp_icon_source_adds_bem_modifier(): void {
		$output = $this->render_block(
			array(
				'iconSource' => 'wp-icon',
				'wpIconName' => 'plus',
			)
		);
		$this->assertStringContainsString( 'sgs-icon--source-wp-icon', $output );
	}

	/**
	 * Unknown wp-icon name renders the fallback SVG (not blank output).
	 */
	public function test_wp_icon_unknown_name_renders_fallback_svg(): void {
		$output = $this->render_block(
			array(
				'iconSource' => 'wp-icon',
				'wpIconName' => 'definitely-not-a-real-icon-xyz',
			)
		);
		$this->assertStringContainsString(
			'<svg',
			$output,
			'Unknown wp-icon name should render a fallback SVG, not blank.'
		);
	}

	/**
	 * Invalid iconSource value falls back to lucide.
	 */
	public function test_invalid_icon_source_falls_back_to_lucide(): void {
		$output = $this->render_block(
			array(
				'iconSource' => 'definitely-invalid',
				'iconName'   => 'star',
			)
		);
		$this->assertStringContainsString(
			'sgs-icon--source-lucide',
			$output,
			'Invalid iconSource should fall back to lucide.'
		);
	}
}
