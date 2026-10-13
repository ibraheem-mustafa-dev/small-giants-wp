<?php
/**
 * Tests: sgs/gallery linked items and the item tile.
 *
 * - An item with a link renders an <a>, never the lightbox button, and is left out of the lightbox list.
 * - Every new setting at its default emits nothing: a gallery that sets none of them renders byte-for-byte
 *   as it did before the settings existed.
 * - The tile settings paint (fill, border, radius, height, padding, contain fit).
 *
 * Renders the real block in a child process through the QA harness.
 *
 * Run with:
 *   vendor/bin/phpunit --filter GalleryLinkedTileTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class GalleryLinkedTileTest extends TestCase {

	use BlockHarnessRenderTrait;

	/**
	 * A four-item gallery with the lightbox on.
	 *
	 * @param array<int, array<string, mixed>> $links Per-index item fields to merge (index => fields).
	 * @param array<string, mixed>             $extra Extra block attributes.
	 * @return array<string, mixed> Block attributes.
	 */
	private function attrs( array $links = array(), array $extra = array() ): array {
		$items = array();
		foreach ( array( 'a', 'b', 'c', 'd' ) as $i => $key ) {
			$items[] = array_merge(
				array(
					'id'   => 0,
					'url'  => "https://example.com/{$key}.png",
					'alt'  => 'Image ' . strtoupper( $key ),
					'type' => 'image',
					'_key' => "k{$i}",
				),
				$links[ $i ] ?? array()
			);
		}
		return array_merge(
			array(
				'mediaItems'     => $items,
				'layout'         => 'grid',
				'columns'        => array(
					'desktop' => 4,
					'tablet'  => 2,
					'mobile'  => 1,
				),
				'enableLightbox' => true,
			),
			$extra
		);
	}

	public function test_new_settings_at_their_defaults_emit_nothing(): void {
		$base = $this->render_block( 'sgs/gallery', $this->attrs() );
		$set  = $this->render_block(
			'sgs/gallery',
			$this->attrs(
				array( 1 => array( 'linkUrl' => '', 'linkTarget' => '', 'linkLabel' => '' ) ),
				array(
					'tileColour'               => '',
					'tileColourGradient'       => '',
					'tileColourHover'          => '',
					'tileColourHoverGradient'  => '',
					'tileBorderWidth'          => array(),
					'tileBorderStyle'          => '',
					'tileBorderColour'         => '',
					'tileBorderColourGradient' => '',
					'tileBorderRadius'         => array(),
					'tileMinHeight'            => array(),
					'tilePadding'              => array(),
					'tileFitContain'           => false,
				)
			)
		);
		// The scope class is a hash of every attribute, so it differs once an attribute is passed; the rest must not.
		$norm = static fn( string $s ): string => (string) preg_replace( '/sgs-(gallery|container)-[0-9a-f]{8}/', 'sgs-$1-UID', $s );
		$this->assertSame( $norm( $base['html'] ), $norm( $set['html'] ), 'HTML identical at defaults' );
		$this->assertSame( $norm( $base['css'] ), $norm( $set['css'] ), 'CSS identical at defaults' );
		// Negative control: the comparison can fail.
		$linked = $this->render_block( 'sgs/gallery', $this->attrs( array( 1 => array( 'linkUrl' => '/x/' ) ) ) );
		$this->assertNotSame( $norm( $base['html'] ), $norm( $linked['html'] ) );
		$this->assertStringNotContainsString( 'sgs-gallery__item-link', $base['html'] );
		$this->assertStringNotContainsString( 'sgs-gallery--tile', $base['html'] );
	}

	public function test_a_linked_item_is_an_anchor_that_never_opens_the_lightbox(): void {
		$out = $this->render_block(
			'sgs/gallery',
			$this->attrs(
				array(
					0 => array( 'linkUrl' => '/brands/a/' ),
					1 => array(
						'linkUrl'    => 'https://example.com/b',
						'linkTarget' => '_blank',
						'linkLabel'  => 'Brand B range',
					),
				)
			)
		);
		$html = $out['html'];
		$this->assertStringContainsString( '<a class="sgs-gallery__item-link" href="/brands/a/">', $html );
		$this->assertMatchesRegularExpression( '#<a class="sgs-gallery__item-link" href="https://example.com/b" target="_blank" rel="noopener noreferrer" aria-label="Brand B range \(opens in a new tab\)">#', $html );
		$this->assertSame( 2, substr_count( $html, 'sgs-gallery__item--linked' ) );
		// Only the two unlinked items keep a lightbox button, numbered from 0 within the lightbox list.
		$this->assertSame( 2, substr_count( $html, 'class="sgs-gallery__item-btn"' ) );
		$this->assertStringContainsString( '{&quot;currentIndex&quot;:0}', $html );
		$this->assertStringContainsString( '{&quot;currentIndex&quot;:1}', $html );
		$this->assertStringNotContainsString( '{&quot;currentIndex&quot;:2}', $html );
		// The lightbox list holds the two unlinked images only.
		$this->assertSame( 2, substr_count( $html, '&quot;fullUrl&quot;' ) );
		$this->assertStringNotContainsString( 'a.png&quot;', $html );
	}

	public function test_a_link_with_an_unsafe_scheme_is_refused(): void {
		$out = $this->render_block(
			'sgs/gallery',
			$this->attrs( array( 0 => array( 'linkUrl' => 'javascript:alert(1)' ), 1 => array( 'linkUrl' => 'data:text/html,x' ) ) )
		);
		$this->assertStringNotContainsString( 'javascript:', $out['html'] );
		$this->assertStringNotContainsString( 'data:text', $out['html'] );
		$this->assertStringNotContainsString( 'sgs-gallery__item-link', $out['html'] );
		$this->assertSame( 4, substr_count( $out['html'], 'class="sgs-gallery__item-btn"' ) );
	}

	public function test_a_linked_item_is_an_anchor_without_the_lightbox_too(): void {
		$out = $this->render_block(
			'sgs/gallery',
			$this->attrs( array( 2 => array( 'linkUrl' => 'mailto:hello@example.com' ) ), array( 'enableLightbox' => false ) )
		);
		$this->assertStringContainsString( 'href="mailto:hello@example.com"', $out['html'] );
		$this->assertSame( 1, substr_count( $out['html'], 'sgs-gallery__item--linked' ) );
	}

	public function test_the_tile_settings_paint(): void {
		$out = $this->render_block(
			'sgs/gallery',
			$this->attrs(
				array(),
				array(
					'tileColour'       => '#FAFAF8',
					'tileColourHover'  => '#ffffff',
					'tileBorderWidth'  => array(
						'top'    => '1px',
						'right'  => '1px',
						'bottom' => '1px',
						'left'   => '1px',
					),
					'tileBorderColour' => '#1e2a3c',
					'tileBorderRadius' => array(
						'desktop' => array(
							'topLeft'     => '12px',
							'topRight'    => '12px',
							'bottomLeft'  => '12px',
							'bottomRight' => '12px',
						),
					),
					'tileMinHeight'    => array(
						'desktop' => '64px',
						'mobile'  => '56px',
					),
					'tilePadding'      => array(
						'desktop' => array(
							'top'    => '8px',
							'right'  => '12px',
							'bottom' => '8px',
							'left'   => '12px',
						),
					),
					'tileFitContain'   => true,
				)
			)
		);
		$css  = $out['css'];
		$item = '.wp-block-sgs-gallery .sgs-gallery__item';
		$this->assertStringContainsString( $item . '{background-color:#FAFAF8}', $css );
		$this->assertStringContainsString( $item . ':hover{background-color:#ffffff}', $css );
		$this->assertStringContainsString( 'border-width:1px 1px 1px 1px;border-color:#1e2a3c;border-top-left-radius:12px', $css );
		$this->assertStringContainsString( $item . '{min-height:64px;padding-top:8px;padding-right:12px;padding-bottom:8px;padding-left:12px;}', $css );
		$this->assertStringContainsString( '@media (max-width:767px){', $css );
		$this->assertStringContainsString( 'min-height:56px;', $css );
		$this->assertStringContainsString( '.sgs-gallery__img-wrap img,', $css );
		$this->assertStringContainsString( 'object-fit:contain;object-position:center;', $css );
		$this->assertStringContainsString( 'sgs-gallery--tile', $out['html'] );
		$this->assertStringNotContainsString( ' style="', $out['html'] );
	}

	public function test_padding_alone_does_not_switch_tile_mode_on(): void {
		$out = $this->render_block(
			'sgs/gallery',
			$this->attrs( array(), array( 'tilePadding' => array( 'desktop' => array( 'top' => '8px' ) ) ) )
		);
		$this->assertStringNotContainsString( 'sgs-gallery--tile', $out['html'] );
		$this->assertStringContainsString( 'padding-top:8px;', $out['css'] );
	}
}
