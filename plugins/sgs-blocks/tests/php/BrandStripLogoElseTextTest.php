<?php
/**
 * The sgs/brand-strip `logo-else-text` display: a brand whose logo the shared media renderer refuses still shows its name.
 *
 * Run with: vendor/bin/phpunit --filter BrandStripLogoElseTextTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

/**
 * Brand-strip fallback to the brand name.
 */
final class BrandStripLogoElseTextTest extends TestCase {

	use BlockHarnessRenderTrait;

	/** A file URL with no attachment id and no width or height: the renderer prints nothing for it (FR-49-16). */
	private const UNSIZED = array(
		'kind' => 'image',
		'url'  => 'https://example.test/wp-content/uploads/logo.png',
	);

	/**
	 * Render one brand item.
	 *
	 * @param string $display brandDisplay.
	 * @param array  $source  The item's Source for desktop.
	 * @return string Rendered HTML.
	 */
	private function render_one( string $display, array $source ): string {
		$attrs = array(
			'brandDisplay' => $display,
			'logos'        => array(
				array(
					'_key'   => 'k1',
					'name'   => 'Acme',
					'source' => array( 'desktop' => $source ),
				),
			),
		);
		return $this->render_block( 'sgs/brand-strip', $attrs, array(), array(), '', true )['html'];
	}

	/**
	 * In logo-else-text a refused logo becomes the name tile.
	 */
	public function test_a_refused_logo_falls_back_to_the_name_in_logo_else_text(): void {
		$html = $this->render_one( 'logo-else-text', self::UNSIZED );

		$this->assertStringContainsString( '<span class="sgs-brand-strip__brand-text">Acme</span>', $html );
		$this->assertStringContainsString( 'sgs-brand-strip__item--text', $html );
	}

	/**
	 * Negative control: the logos display still skips it.
	 */
	public function test_negative_control_logos_mode_still_skips_a_refused_logo(): void {
		$html = $this->render_one( 'logos', self::UNSIZED );

		$this->assertStringNotContainsString( 'Acme', $html );
	}

	/**
	 * A logo the renderer accepts still prints as an image.
	 */
	public function test_a_sized_logo_still_prints_the_image(): void {
		$sized = array_merge(
			self::UNSIZED,
			array(
				'width'  => 200,
				'height' => 80,
			)
		);
		$html  = $this->render_one( 'logo-else-text', $sized );

		$this->assertStringContainsString( 'logo.png', $html );
		$this->assertStringNotContainsString( '<span class="sgs-brand-strip__brand-text">', $html );
	}
}
