<?php
/**
 * Tests: sgs/card-grid prints each card's picture through the shared media renderer (Spec 49 §8.3, Appendix A).
 *
 * - One group per card, scoped `{uid}-media-i{index}` and `{uid}-media`; no old `sgs-card-grid__media` class.
 * - The grid's fit applies to every card; a card's own fit and focal point override it under its own scope.
 * - The block-level rules print once (with the first card that has a picture), not once per card.
 * - The image frame's ratio is a per-device custom property (16 / 9 when the grid sets none) and a fixed height replaces it.
 * - A decorative card prints an empty alt; a card with no picture prints none.
 *
 * Run with:
 *   vendor/bin/phpunit --no-configuration --bootstrap tests/php/bootstrap.php tests/php/CardGridItemMediaTest.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class CardGridItemMediaTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * @param array<string,mixed> $item Card fields laid over a plain photo card.
	 * @param string              $key  The card's stable key.
	 * @return array<string,mixed>
	 */
	private function item( array $item, string $key ): array {
		return array_merge(
			array(
				'_key'   => $key,
				'title'  => "Card $key",
				'alt'    => "Photo $key",
				'source' => array(
					'desktop' => array(
						'kind'   => 'image',
						'url'    => "https://example.com/$key.jpg",
						'width'  => 800,
						'height' => 600,
					),
				),
			),
			$item
		);
	}

	/**
	 * @param array<int,array<string,mixed>> $items Cards.
	 * @param array<string,mixed>            $extra Block attributes.
	 * @return array{html:string,css:string}
	 */
	private function render( array $items, array $extra = array() ): array {
		return $this->render_block(
			'sgs/card-grid',
			array_merge(
				array(
					'items'   => $items,
					'columns' => array( 'desktop' => 3, 'tablet' => 2, 'mobile' => 1 ),
				),
				$extra
			),
			array(),
			array(),
			'',
			true
		);
	}

	public function test_each_card_is_one_group_and_the_old_media_class_is_gone(): void {
		$out = $this->render( array( $this->item( array(), 'a' ), $this->item( array(), 'b' ) ) );
		$this->assertSame( 2, substr_count( $out['html'], 'sgs-media-group' ) );
		$this->assertMatchesRegularExpression( '/sgs-cg-[0-9a-f]{8}-media-i0 sgs-cg-[0-9a-f]{8}-media/', $out['html'] );
		$this->assertMatchesRegularExpression( '/-media-i1 /', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-card-grid__media', $out['html'] );
		$this->assertStringNotContainsString( ' style="', $out['html'] );
	}

	public function test_card_fit_and_focal_override_the_grid_fit_under_the_cards_own_scope(): void {
		$out = $this->render(
			array(
				$this->item( array(), 'a' ),
				$this->item(
					array(
						'fit'   => array( 'desktop' => 'contain' ),
						'focal' => array( 'desktop' => array( 'x' => 0.2, 'y' => 0.8 ) ),
					),
					'b'
				),
			),
			array( 'imageFit' => array( 'desktop' => 'cover' ) )
		);
		$this->assertMatchesRegularExpression( '/-media-i0 \.sgs-media-el\{[^}]*object-fit:cover/', $out['css'] );
		$this->assertMatchesRegularExpression( '/-media-i1 \.sgs-media-el\{[^}]*object-fit:contain/', $out['css'] );
		$this->assertMatchesRegularExpression( '/-media-i1 \.sgs-media-el\{[^}]*object-position:20% 80%/', $out['css'] );
		$this->assertDoesNotMatchRegularExpression( '/-media-i0 \.sgs-media-el\{[^}]*object-position/', $out['css'] );
	}

	public function test_a_cards_own_fit_carries_down_to_the_devices_it_sets_none_for(): void {
		$out = $this->render(
			array( $this->item( array( 'fit' => array( 'desktop' => 'contain' ) ), 'a' ), $this->item( array(), 'b' ) ),
			array( 'imageFit' => array( 'desktop' => 'cover', 'mobile' => 'cover' ) )
		);
		$this->assertMatchesRegularExpression( '/-media-i0 \.sgs-media-el\{[^}]*object-fit:contain/', $out['css'] );
		$this->assertDoesNotMatchRegularExpression( '/-media-i0 \.sgs-media-el\{[^}]*object-fit:cover/', $out['css'], 'a grid mobile fit does not override the card own fit' );
		$this->assertMatchesRegularExpression( '/-media-i1 \.sgs-media-el\{[^}]*object-fit:cover/', $out['css'] );
	}

	public function test_block_level_rules_print_once(): void {
		$out = $this->render(
			array( $this->item( array(), 'a' ), $this->item( array(), 'b' ), $this->item( array(), 'c' ) ),
			array( 'imageRadius' => array( 'desktop' => array( 'topLeft' => '12px', 'topRight' => '12px', 'bottomRight' => '12px', 'bottomLeft' => '12px' ) ) )
		);
		$this->assertSame( 1, substr_count( $out['css'], 'border-top-left-radius:12px' ), 'the radius rule is printed once, under the block scope' );
	}

	public function test_the_frame_ratio_defaults_to_16_9_and_a_set_ratio_wins_per_device(): void {
		$default = $this->render( array( $this->item( array(), 'a' ) ) );
		$this->assertMatchesRegularExpression( '/\.sgs-cg-[0-9a-f]{8} \.sgs-card-grid__image-wrap\{--sgs-card-grid-aspect:16 \/ 9;?\}/', $default['css'] );
		$set = $this->render( array( $this->item( array(), 'a' ) ), array( 'imageRatio' => array( 'desktop' => '4 / 3', 'mobile' => '1 / 1' ) ) );
		$this->assertStringContainsString( '--sgs-card-grid-aspect:4 / 3', $set['css'] );
		$this->assertStringContainsString( '--sgs-card-grid-aspect:1 / 1', $set['css'] );
		$this->assertStringNotContainsString( '--sgs-card-grid-aspect:16 / 9', $set['css'] );
	}

	public function test_a_fixed_height_replaces_the_ratio(): void {
		$out = $this->render( array( $this->item( array(), 'a' ) ), array( 'imageHeight' => array( 'desktop' => '260px' ) ) );
		$this->assertMatchesRegularExpression( '/\.sgs-card-grid__image-wrap\{[^}]*height:260px/', $out['css'] );
		$this->assertMatchesRegularExpression( '/\.sgs-card-grid__image-wrap\{[^}]*aspect-ratio:auto/', $out['css'] );
	}

	public function test_decorative_prints_an_empty_alt_and_a_card_with_no_picture_prints_none(): void {
		$out = $this->render( array( $this->item( array( 'decorative' => true ), 'a' ), array( '_key' => 'none', 'title' => 'No photo' ) ) );
		$this->assertStringContainsString( 'alt=""', $out['html'] );
		$this->assertStringNotContainsString( 'alt="Photo a"', $out['html'] );
		$this->assertSame( 1, substr_count( $out['html'], '<img' ) );
	}
}
