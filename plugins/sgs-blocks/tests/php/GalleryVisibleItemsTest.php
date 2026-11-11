<?php
/**
 * Tests: sgs/gallery `visibleItems`, the per-device count of items shown.
 *
 * - Unset (or 0) emits nothing: the render is byte-identical to a gallery without the setting.
 * - A count hides the items after it inside that device's own range only, with no inline style.
 * - An unset tier inherits the wider one; 0 on a tier shows every item there.
 *
 * Run with:
 *   vendor/bin/phpunit --filter GalleryVisibleItemsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class GalleryVisibleItemsTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function attrs( array $extra = array() ): array {
		$items = array();
		foreach ( range( 0, 9 ) as $i ) {
			$items[] = array( 'source' => array( 'desktop' => array( 'kind' => 'image', 'url' => "https://example.com/$i.png", 'width' => 800, 'height' => 600 ) ), 'alt' => "Image $i", '_key' => "k$i" );
		}
		return array_merge( array( 'mediaItems' => $items, 'layout' => array(), 'columns' => array( 'desktop' => 5, 'tablet' => 3, 'mobile' => 2 ) ), $extra );
	}

	private function css( array $extra ): string {
		return $this->render_block( 'sgs/gallery', $this->attrs( $extra ) )['css'];
	}

	public function test_unset_and_zero_emit_nothing(): void {
		$norm  = static fn( string $s ): string => (string) preg_replace( '/sgs-(gallery|container)-[0-9a-f]{8}/', 'sgs-$1-UID', $s );
		$base  = $this->render_block( 'sgs/gallery', $this->attrs() );
		$empty = $this->render_block( 'sgs/gallery', $this->attrs( array( 'visibleItems' => array() ) ) );
		$zero  = $this->render_block( 'sgs/gallery', $this->attrs( array( 'visibleItems' => array( 'desktop' => 0, 'tablet' => '', 'mobile' => '' ) ) ) );
		$this->assertSame( $norm( $base['css'] ), $norm( $empty['css'] ) );
		$this->assertSame( $norm( $base['css'] ), $norm( $zero['css'] ) );
		$this->assertSame( $norm( $base['html'] ), $norm( $zero['html'] ) );
		$this->assertStringNotContainsString( 'nth-child(n+', $base['css'] );
	}

	public function test_a_count_hides_the_rest_inside_that_device_range(): void {
		$css = $this->css( array( 'visibleItems' => array( 'desktop' => 8, 'tablet' => 6, 'mobile' => 4 ) ) );
		$this->assertMatchesRegularExpression( '/@media\(min-width:1024px\)\{[^{}]*\.sgs-gallery__item:nth-child\(n\+9\)\{display:none;\}\}/', $css );
		$this->assertMatchesRegularExpression( '/@media\(min-width:768px\) and \(max-width:1023px\)\{[^{}]*\.sgs-gallery__item:nth-child\(n\+7\)\{display:none;\}\}/', $css );
		$this->assertMatchesRegularExpression( '/@media\(max-width:767px\)\{[^{}]*\.sgs-gallery__item:nth-child\(n\+5\)\{display:none;\}\}/', $css );
		$with = $this->render_block( 'sgs/gallery', $this->attrs( array( 'visibleItems' => array( 'desktop' => 8 ) ) ) )['html'];
		$none = $this->render_block( 'sgs/gallery', $this->attrs() )['html'];
		$this->assertSame( substr_count( $none, ' style="' ), substr_count( $with, ' style="' ), 'no inline style is added: hiding is a stylesheet rule' );
	}

	public function test_an_unset_tier_inherits_and_zero_shows_everything(): void {
		$css = $this->css( array( 'visibleItems' => array( 'desktop' => 9 ) ) );
		$this->assertSame( 3, substr_count( $css, 'nth-child(n+10)' ), 'tablet and mobile inherit desktop' );
		$css = $this->css( array( 'visibleItems' => array( 'desktop' => 9, 'tablet' => 0 ) ) );
		$this->assertSame( 1, substr_count( $css, 'nth-child(n+10)' ), 'desktop only; tablet 0 shows all, and mobile inherits 0' );
	}
}
