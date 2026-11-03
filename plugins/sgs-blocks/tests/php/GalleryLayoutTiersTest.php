<?php
/**
 * sgs/gallery: the layout per device (grid, masonry, swipe row, carousel).
 *
 * Positive controls: a tier that differs prints its own full declarations as @media (Mobile also as @container under 480px), a swipe row is a
 * focusable named region and takes its card width and edge padding, a mixed carousel is rewritten to a swipe row before
 * anything reads it. Negative controls: a uniform layout prints no override, an old scalar `layout` is not read (it
 * renders the grid default), and `sgs_emit_tier_rules_map` without the container option prints `@media` only.
 *
 * Run with: vendor/bin/phpunit --filter GalleryLayoutTiersTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-gallery-grid-css.php';

final class GalleryLayoutTiersTest extends TestCase {

	use BlockHarnessRenderTrait;

	private function gallery( array $layout, array $extra = array() ): array {
		return $this->render_block(
			'sgs/gallery',
			array_merge(
				array(
					'layout'     => $layout,
					'mediaItems' => array(
						array( 'id' => 1, 'url' => 'https://example.test/a.jpg', 'alt' => 'A' ),
						array( 'id' => 2, 'url' => 'https://example.test/b.jpg', 'alt' => 'B' ),
					),
				),
				$extra
			)
		);
	}

	/**
	 * The three tier layouts of a stored value.
	 *
	 * @param array $layout Stored layout object.
	 * @return string[]
	 */
	private function tiers_of( array $layout ): array {
		return array_values( array_slice( sgs_gallery_layout_tiers( array( 'layout' => $layout ) ), 0, 3 ) );
	}

	public function test_tiers_inherit_and_an_empty_object_is_a_grid(): void {
		$this->assertSame( array( 'grid', 'grid', 'grid' ), $this->tiers_of( array() ) );
		$this->assertSame( array( 'masonry', 'masonry', 'scroll' ), $this->tiers_of( array( 'desktop' => 'masonry', 'mobile' => 'scroll' ) ), 'tablet inherits desktop' );
		$this->assertSame( array( 'grid', 'grid', 'grid' ), $this->tiers_of( array( 'desktop' => 'sideways' ) ), 'an unknown value is a grid' );
	}

	public function test_a_carousel_is_honoured_only_when_every_tier_is_one(): void {
		$all   = sgs_gallery_layout_tiers( array( 'layout' => array( 'desktop' => 'carousel', 'tablet' => 'carousel', 'mobile' => 'carousel' ) ) );
		$mixed = sgs_gallery_layout_tiers( array( 'layout' => array( 'desktop' => 'grid', 'mobile' => 'carousel' ) ) );
		$this->assertTrue( $all['carousel'] );
		$this->assertFalse( $mixed['carousel'] );
		$this->assertSame( 'scroll', $mixed['mobile'], 'a carousel tier in a mixed set is rewritten to a swipe row' );
		$this->assertTrue( $mixed['rewritten'] );

		$out = $this->gallery( array( 'desktop' => 'grid', 'mobile' => 'carousel' ), array( 'carouselShowArrows' => true ) );
		$this->assertStringNotContainsString( 'sgs-gallery__carousel-prev', $out['html'], 'no arrows for a rewritten carousel' );
		$this->assertStringNotContainsString( 'data-autoplay', $out['html'] );
		$uniform = $this->gallery( array( 'desktop' => 'carousel', 'tablet' => 'carousel', 'mobile' => 'carousel' ), array( 'carouselShowArrows' => true ) );
		$this->assertStringContainsString( 'sgs-gallery__carousel-prev', $uniform['html'], 'positive control: a uniform carousel keeps its arrows' );
		$this->assertStringContainsString( 'data-autoplay', $uniform['html'] );
	}

	public function test_a_narrower_tier_prints_its_own_declarations_as_media_and_container(): void {
		$out = $this->gallery( array( 'desktop' => 'grid', 'mobile' => 'scroll' ), array( 'scrollItemWidth' => array( 'mobile' => '78%' ), 'scrollInset' => array( 'mobile' => '20px' ) ) );
		$css = $out['css'];

		$this->assertMatchesRegularExpression( '/@media \(max-width:767px\)\{[^{]*\.sgs-gallery__grid\{display:grid;grid-template-columns:none;grid-auto-flow:column;/', $css );
		$this->assertMatchesRegularExpression( '/@container \(max-width:479px\)\{[^{]*\.sgs-gallery__grid\{display:grid;grid-template-columns:none;grid-auto-flow:column;/', $css );
		$this->assertStringContainsString( '--sgs-scroll-item-width:78%;', $css );
		$this->assertStringContainsString( 'padding-inline:20px;scroll-padding-inline:20px;', $css );
		$this->assertSame( 0, preg_match( '/max-width:1023px\)\{[^{]*\.sgs-gallery__grid\{display:/', $css ), 'the tablet tier inherits desktop: no tablet layout rule' );
		$this->assertStringContainsString( 'data-sgs-scroll-region="Gallery, swipe row"', $out['html'], 'view.js makes it a focusable region while it scrolls' );
		$this->assertStringNotContainsString( 'tabindex=', $out['html'], 'no static tab stop on a grid that does not scroll at every width' );
	}

	public function test_a_return_to_grid_resets_what_masonry_set(): void {
		$css = $this->gallery( array( 'desktop' => 'masonry', 'mobile' => 'grid' ) )['css'];
		$this->assertMatchesRegularExpression( '/max-width:767px\)\{[^{]*\.sgs-gallery__grid\{display:grid;grid-template-columns:repeat\(var\(--sgs-columns-mobile,1\),1fr\);grid-auto-flow:row;[^}]*column-count:auto;column-gap:var\(--sgs-gap\);/', $css );
		$this->assertStringContainsString( 'break-inside:auto;margin-bottom:0;', $css, 'the items lose the masonry margin and break rule' );
	}

	public function test_a_tier_override_reads_that_tiers_own_column_count(): void {
		$css = $this->gallery( array( 'desktop' => 'grid', 'tablet' => 'scroll', 'mobile' => 'masonry' ) )['css'];
		$this->assertStringContainsString( 'grid-auto-columns:var(--sgs-scroll-item-width,calc((100% - (var(--sgs-columns-tablet,2) - 1) * var(--sgs-gap)) / var(--sgs-columns-tablet,2)))', $css );
		$this->assertStringContainsString( 'column-count:var(--sgs-columns-mobile,1);', $css );
		$this->assertStringNotContainsString( 'var(--sgs-columns)', $css, 'the desktop count never reaches a narrower tier' );
	}

	public function test_the_edge_padding_reaches_only_the_swipe_row_tiers(): void {
		$css = $this->gallery( array( 'desktop' => 'scroll', 'tablet' => 'grid', 'mobile' => 'scroll' ), array( 'scrollInset' => array( 'desktop' => '20px' ) ) )['css'];

		$this->assertMatchesRegularExpression( '/\.sgs-gallery__grid\{padding-inline:20px;scroll-padding-inline:20px;\}/', $css, 'desktop swipe row has its inset' );
		$this->assertMatchesRegularExpression( '/max-width:1023px\)\{[^{]*\.sgs-gallery__grid\{padding-inline:0px;scroll-padding-inline:0px;\}/', $css, 'the tablet grid is flush' );
		$this->assertMatchesRegularExpression( '/max-width:767px\)\{[^{]*\.sgs-gallery__grid\{padding-inline:20px;scroll-padding-inline:20px;\}/', $css, 'the mobile swipe row has it back' );

		$grid_only = $this->gallery( array( 'desktop' => 'grid', 'mobile' => 'scroll' ), array( 'scrollInset' => array( 'mobile' => '20px' ) ) )['css'];
		$this->assertDoesNotMatchRegularExpression( '/padding-inline:0px/', $grid_only, 'nothing to undo when no wider tier carries a value' );
	}

	public function test_a_uniform_layout_prints_no_override_and_no_region(): void {
		foreach ( array( array(), array( 'desktop' => 'masonry' ), array( 'desktop' => 'scroll', 'tablet' => 'scroll', 'mobile' => 'scroll' ) ) as $layout ) {
			$out = $this->gallery( $layout );
			$this->assertStringNotContainsString( 'grid-auto-flow:row;grid-auto-columns:auto;overflow-x:visible', $out['css'], wp_json_encode( $layout ) );
			$this->assertSame( 0, preg_match( '/@(media|container) \(max-width:\d+px\)\{[^{]*\.sgs-gallery__grid\{display:/', $out['css'] ), wp_json_encode( $layout ) );
		}
		$this->assertStringNotContainsString( 'data-sgs-scroll-region', $this->gallery( array( 'desktop' => 'masonry' ) )['html'] );
	}

	public function test_an_old_scalar_layout_is_not_read(): void {
		$old = $this->render_block( 'sgs/gallery', array( 'layout' => 'carousel', 'mediaItems' => array() ) ); // scalar-tier-allow: the old shape on purpose.
		$this->assertStringContainsString( 'sgs-gallery--grid', $old['html'], 'FP-14: no scalar fallback, an old shape renders the default until re-saved' );
		$this->assertStringNotContainsString( 'sgs-gallery__carousel-prev', $old['html'] );
	}

	public function test_the_tier_rules_map_is_media_only_unless_asked(): void {
		$value = array( 'desktop' => 'a', 'tablet' => 'b', 'mobile' => 'c' );
		$map   = array( 'a' => 'x:1;', 'b' => 'x:2;', 'c' => 'x:3;' );

		$this->assertSame(
			'.s{x:1;}@media (max-width:1023px){.s{x:2;}}@media (max-width:767px){.s{x:3;}}',
			sgs_emit_tier_rules_map( '.s', $value, $map ),
			'option off: the original output, byte for byte'
		);
		$this->assertSame(
			'.s{x:1;}@media (max-width:1023px){.s{x:2;}}@media (max-width:767px){.s{x:3;}}@container (max-width:479px){.s{x:3;}}',
			sgs_emit_tier_rules_map( '.s', $value, $map, '', 'off', array( 'container' => true ) )
		);
	}
}
