<?php
/**
 * Tests: an item's Fit and the block-level Fit merge by one rule in every item-set block (Spec 49 §8.3).
 *
 * The item's own Fit wins at every device its cascade reaches (a device it sets and the narrower devices that inherit
 * from it); elsewhere the block's Fit answers, then the block's default.
 *
 * Run with:
 *   vendor/bin/phpunit --no-configuration --bootstrap tests/php/bootstrap.php tests/php/ItemFitMergeTest.php
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class ItemFitMergeTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function source( string $key ): array {
		return array(
			'desktop' => array(
				'kind'   => 'image',
				'url'    => "https://example.com/$key.jpg",
				'width'  => 800,
				'height' => 600,
			),
		);
	}

	/** @return array<int,array<string,mixed>> */
	private function items( array $fit ): array {
		return array(
			array(
				'_key'   => 'a',
				'title'  => 'A',
				'label'  => 'A',
				'alt'    => 'Photo A',
				'source' => $this->source( 'a' ),
				'fit'    => $fit,
			),
		);
	}

	/** The item's resolved object-fit at each device, read from the rendered CSS. */
	private function fits( string $css ): array {
		$out = array();
		foreach ( array( 'desktop' => '', 'tablet' => '@media(max-width:1023px){', 'mobile' => '@media(max-width:767px){' ) as $device => $open ) {
			$pattern = '' === $open ? '/(?:^|[}\s])\.[\w-]+-i0 \.sgs-media-el\{[^}]*object-fit:(\w+)/' : '/' . preg_quote( $open, '/' ) . '\.[\w-]+-i0 \.sgs-media-el\{[^}]*object-fit:(\w+)/';
			if ( preg_match( $pattern, $css, $m ) ) {
				$out[ $device ] = $m[1];
			}
		}
		return $out;
	}

	private function resolved( array $fits ): array {
		$last = null;
		$out  = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			$last           = $fits[ $device ] ?? $last;
			$out[ $device ] = $last;
		}
		return $out;
	}

	public function test_the_shared_rule(): void {
		require_once dirname( __DIR__, 2 ) . '/includes/media/render-sources.php';
		require_once dirname( __DIR__, 2 ) . '/includes/media/render-item-slot.php';
		$this->assertSame( array( 'desktop' => 'cover' ), sgs_media_item_fit( array( 'mobile' => 'contain' ), array( 'desktop' => 'cover' ) ), 'the item cascade reaches mobile, so it beats the block mobile fit' );
		$this->assertSame( array( 'desktop' => 'cover', 'mobile' => 'fill' ), sgs_media_item_fit( array( 'desktop' => 'contain' ), array( 'desktop' => 'cover', 'mobile' => 'fill' ) ) );
		$this->assertSame( array( 'desktop' => 'contain', 'mobile' => 'cover' ), sgs_media_item_fit( array( 'desktop' => 'contain', 'mobile' => 'cover' ), array() ), 'no item fit: the block fit as set' );
		$this->assertSame( array( 'desktop' => 'contain', 'tablet' => 'fill' ), sgs_media_item_fit( array( 'desktop' => 'contain' ), array( 'tablet' => 'fill' ) ), 'an item that sets only tablet leaves desktop to the block' );
		$this->assertSame( array( 'desktop' => 'contain' ), sgs_media_item_fit( null, null, 'contain' ), 'the default fills what neither sets' );
		$this->assertSame( array(), sgs_media_item_fit( null, null ) );
	}

	public function test_card_grid_and_trust_bar_resolve_the_same_fit_from_the_same_data(): void {
		$cases = array(
			'block mobile, item desktop' => array( array( 'mobile' => 'contain' ), array( 'desktop' => 'cover' ), array( 'desktop' => 'cover', 'tablet' => 'cover', 'mobile' => 'cover' ) ),
			'block desktop, item mobile' => array( array( 'desktop' => 'cover' ), array( 'mobile' => 'fill' ), array( 'desktop' => 'cover', 'tablet' => 'cover', 'mobile' => 'fill' ) ),
			'block only'                 => array( array( 'desktop' => 'cover', 'tablet' => 'contain' ), array(), array( 'desktop' => 'cover', 'tablet' => 'contain', 'mobile' => 'contain' ) ),
		);
		foreach ( $cases as $name => list( $block_fit, $item_fit, $expected ) ) {
			$card = $this->render_block(
				'sgs/card-grid',
				array(
					'items'    => $this->items( $item_fit ),
					'imageFit' => $block_fit,
					'columns'  => array( 'desktop' => 3 ),
				),
				array(),
				array(),
				'',
				true
			);
			$bar  = $this->render_block(
				'sgs/trust-bar',
				array(
					'badgeStyle' => 'image-badge',
					'items'      => $this->items( $item_fit ),
					'badgeFit'   => $block_fit,
				),
				array(),
				array(),
				'',
				true
			);
			$this->assertSame( $expected, $this->resolved( $this->fits( $card['css'] ) ), "card grid: $name" );
			$this->assertSame( $expected, $this->resolved( $this->fits( $bar['css'] ) ), "trust bar: $name" );
		}
	}
}
