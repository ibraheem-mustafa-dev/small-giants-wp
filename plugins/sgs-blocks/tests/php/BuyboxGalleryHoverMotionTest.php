<?php
/**
 * Tests: the hover movement stored for sgs/buybox's gallery thumbnails and add-to-cart button paints on them.
 *
 * Run with:
 *   vendor/bin/phpunit --filter BuyboxGalleryHoverMotionTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
final class BuyboxGalleryHoverMotionTest extends TestCase {

	private const MARKUP = '<div class="sgs-buybox wp-block-sgs-buybox"><div class="sgs-buybox__gallery-col"><div class="product-card__thumbs" role="list"><div role="listitem"><button type="button" class="product-card__thumb sgs-buybox__gallery-thumb"><img src="a.jpg" alt="" /></button></div></div></div><button class="wp-element-button buybox__add-to-cart">Add</button></div>';

	protected function setUp(): void {
		require_once __DIR__ . '/stubs/motion-render-stubs.php';
		SGS\Blocks\Motion\Sgs_Motion_Renderer::reset();
		$GLOBALS['sgs_collected_css'] = array();
		$GLOBALS['sgs_test_is_admin'] = false;
		$GLOBALS['sgs_test_actions']  = array();
	}

	private string $html = '';

	private function render( array $elements ): string {
		$this->html = sgs_test_render_motion_block(
			array(
				'blockName' => 'sgs/buybox',
				'attrs'     => array( 'sgsMotion' => array( 'v' => 1, 'elements' => $elements ) ),
			),
			self::MARKUP
		);
		return implode( '', $GLOBALS['sgs_collected_css'] );
	}

	private function hover( array $values ): array {
		return array( 'hover' => array( 'state' => array( 'source' => 'self', 'values' => $values ) ) );
	}

	public function test_a_thumbnail_hover_move_paints_on_the_thumbnail(): void {
		$css = $this->render( array( 'gallery-thumb' => $this->hover( array( 'translateX' => -2, 'translateY' => -2 ) ) ) );
		$this->assertMatchesRegularExpression( '/\.sgs-buybox__gallery-thumb\{[^}]*--sgs-mh-to-tx:-2px/', $css );
		$this->assertMatchesRegularExpression( '/\.sgs-buybox__gallery-thumb\{[^}]*--sgs-mh-to-ty:-2px/', $css );
		$this->assertMatchesRegularExpression( '/<button[^>]*sgs-buybox__gallery-thumb[^>]*data-sgs-mh=|<button[^>]*data-sgs-mh=[^>]*sgs-buybox__gallery-thumb/', $this->html, 'the thumbnail button carries the hover marker' );
	}

	public function test_an_add_to_cart_hover_move_takes_x_and_y(): void {
		$css = $this->render( array( 'add-to-cart' => $this->hover( array( 'translateX' => -3, 'translateY' => -3 ) ) ) );
		$this->assertMatchesRegularExpression( '/\.buybox__add-to-cart\{[^}]*--sgs-mh-to-tx:-3px/', $css );
		$this->assertMatchesRegularExpression( '/\.buybox__add-to-cart\{[^}]*--sgs-mh-to-ty:-3px/', $css );
	}

	public function test_negative_control_nothing_stored_prints_no_thumbnail_rule(): void {
		$css = $this->render( array() );
		$this->assertStringNotContainsString( 'sgs-buybox__gallery-thumb', $css );
	}
}
