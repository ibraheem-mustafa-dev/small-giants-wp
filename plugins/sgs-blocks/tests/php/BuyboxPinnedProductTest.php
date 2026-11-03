<?php
/**
 * Tests: sgs/buybox's `buyboxProductId` (Pick a set plan, Phase 1). Setting it renders that product's buy box wherever
 * the block sits (a Home page with no product of its own); 0 keeps the queried product. Access is checked once, right
 * after context resolution: an unpublished or password-protected product renders nothing for a visitor. The buy box
 * never prints Product JSON-LD, so a pinned product on another page's URL adds none.
 *
 * Run with: vendor/bin/phpunit --filter BuyboxPinnedProductTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BuyboxSnapshotTest.php';

final class BuyboxPinnedProductTest extends TestCase {

	private static function norm( string $html ): string {
		return BuyboxSnapshotTest::norm( $html );
	}

	private static function snapshot( string $name ): string {
		return self::norm( (string) file_get_contents( __DIR__ . "/../fixtures/buybox/snapshots/$name.html" ) );
	}

	/** A Home page (id 99, no product of its own) hosting a buy box pinned to product 52. */
	private static function home_html( array $attrs, array $product_overrides = array() ): string {
		return BuyboxSnapshotTest::render_fixture( 'standard', array_merge( array( 'buyboxProductId' => 52 ), $attrs ), array( 'postId' => 99 ), $product_overrides );
	}

	public function test_a_pinned_buy_box_on_a_page_with_no_product_renders_the_pinned_product(): void {
		$this->assertSame( self::snapshot( 'standard' ), self::norm( self::home_html( array() ) ), 'pinned on page 99 = the product page render, byte for byte' );
	}

	public function test_the_pinned_render_posts_the_pinned_product_to_the_cart(): void {
		$html = self::home_html( array() );
		$this->assertStringContainsString( 'productId&quot;:&quot;52&quot;', str_replace( array( '"productId":"52"', 'productId":"52"' ), 'productId&quot;:&quot;52&quot;', $html ), 'the interactivity context names product 52' );
		$this->assertStringContainsString( '"addToCartId":52', html_entity_decode( $html ), 'the add-to-cart id is the pinned product, not page 99' );
		$this->assertStringNotContainsString( '"productId":"99"', html_entity_decode( $html ) );
	}

	public function test_without_the_pin_the_same_page_renders_no_buy_box(): void {
		$html = BuyboxSnapshotTest::render_fixture( 'standard', array(), array( 'postId' => 99 ) );
		$this->assertStringNotContainsString( 'sgs-buybox__bar', $html );
		$this->assertStringNotContainsString( 'data-wp-context', $html, 'no product 99 exists, so the core fallback prints, not the buy box' );
	}

	public function test_zero_keeps_the_queried_product(): void {
		$this->assertSame( self::snapshot( 'standard' ), self::norm( BuyboxSnapshotTest::render_fixture( 'standard', array( 'buyboxProductId' => 0 ) ) ) );
	}

	public function test_an_unpublished_product_renders_nothing_for_a_visitor(): void {
		$this->assertSame( '', self::home_html( array(), array( 'status' => 'draft' ) ) );
	}

	public function test_a_password_protected_product_renders_nothing(): void {
		$this->assertSame( '', self::home_html( array(), array( 'password' => 'secret' ) ) );
	}

	public function test_a_pin_to_a_missing_product_renders_nothing(): void {
		$this->assertSame( '', self::home_html( array( 'buyboxProductId' => 777 ) ) );
	}

	public function test_the_pinned_render_prints_no_product_json_ld(): void {
		$this->assertStringNotContainsString( 'application/ld+json', self::home_html( array() ) );
	}
}
