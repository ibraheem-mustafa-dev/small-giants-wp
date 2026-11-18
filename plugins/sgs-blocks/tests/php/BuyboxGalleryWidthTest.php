<?php
/**
 * The buy box's main photo declares the width of its gallery column, not the whole row
 * (src/blocks/buybox/gallery-width.php::sgs_buybox_gallery_avail).
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
class BuyboxGalleryWidthTest extends TestCase {

	protected function setUp(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/class-sgs-breakpoints.php';
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/media/render-sources.php';
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/media/layout-width.php';
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/helpers-css-safety.php';
		require_once SGS_BLOCKS_PLUGIN_DIR . '/src/blocks/buybox/gallery-width.php';
		Sgs_Layout_Width::reset();
		Sgs_Layout_Width::open_frame(
			array(
				'blockName' => 'sgs/buybox',
				'attrs'     => array(),
			)
		);
	}

	/** The `sizes` of the gallery column at one device for the given buy box attributes. */
	private function sizes( array $attrs, string $device ): string {
		$avail = sgs_buybox_gallery_avail( $attrs, Sgs_Layout_Width::own() );
		return Sgs_Layout_Width::to_sizes( $avail[ $device ] );
	}

	public function test_unknown_layout_prints_no_column_model(): void {
		$this->assertNull( sgs_buybox_gallery_avail( array(), null ) );
	}

	public function test_stacked_phone_keeps_the_whole_row(): void {
		$this->assertSame( '100vw', $this->sizes( array(), 'mobile' ) );
	}

	public function test_default_split_takes_its_share_of_the_row_less_the_smallest_gap(): void {
		// 1.15 / 2.15 of (100vw - 24px): the stylesheet's gap is clamp(1.5rem, 4vw, 3rem), 24px at its least.
		$this->assertSame( 'calc(53.49vw - 12.84px)', $this->sizes( array(), 'desktop' ) );
		$this->assertSame( 'calc(53.49vw - 12.84px)', $this->sizes( array(), 'tablet' ) );
	}

	public function test_a_ratio_setting_changes_the_share(): void {
		$this->assertSame( 'calc(60vw - 14.4px)', $this->sizes( array( 'galleryColumnRatio' => 1.5 ), 'desktop' ) );
	}

	public function test_a_px_gap_setting_replaces_the_stylesheet_gap(): void {
		$this->assertSame( 'calc(53.49vw - 21.4px)', $this->sizes( array( 'galleryColumnGap' => '40px' ), 'desktop' ) );
	}

	public function test_a_per_device_gap_applies_per_device(): void {
		$attrs = array(
			'galleryColumnGap' => array(
				'desktop' => 60,
				'tablet'  => 10,
			),
		);
		$this->assertSame( 'calc(53.49vw - 32.09px)', $this->sizes( $attrs, 'desktop' ) );
		$this->assertSame( 'calc(53.49vw - 5.35px)', $this->sizes( $attrs, 'tablet' ) );
	}

	public function test_stack_below_tablet_keeps_the_whole_row_on_tablet_only(): void {
		$attrs = array( 'stackBelow' => 'tablet' );
		$this->assertSame( '100vw', $this->sizes( $attrs, 'tablet' ) );
		$this->assertSame( 'calc(53.49vw - 12.84px)', $this->sizes( $attrs, 'desktop' ) );
	}

	public function test_a_capped_row_caps_the_column(): void {
		Sgs_Layout_Width::reset();
		Sgs_Layout_Width::open_frame(
			array(
				'blockName' => 'sgs/buybox',
				'attrs'     => array( 'maxWidth' => array( 'desktop' => 1000 ) ),
			)
		);
		// (1000 - 24) x 1.15 / 2.15 = 522.05.
		$this->assertSame( 'min(522.05px, calc(53.49vw - 12.84px))', $this->sizes( array(), 'desktop' ) );
	}
}
