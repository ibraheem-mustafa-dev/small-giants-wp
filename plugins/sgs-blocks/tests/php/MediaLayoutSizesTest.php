<?php
/**
 * `sizes` follows the layout the slot sits in (includes/media/layout-width.php::Sgs_Layout_Width,
 * includes/media/render-sources.php::sgs_media_sizes_for_width), Spec 49 section 7.6.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

#[\PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses]
class MediaLayoutSizesTest extends TestCase {

	protected function setUp(): void {
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/class-sgs-breakpoints.php';
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/media/render-sources.php';
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/media/layout-width.php';
		Sgs_Layout_Width::reset();
	}

	/** Open the frames for a chain of blocks, outermost first, as render_block_data does. */
	private function open( array ...$blocks ): void {
		foreach ( $blocks as $block ) {
			Sgs_Layout_Width::open_frame( $block );
		}
	}

	private function container( array $attrs ): array {
		return array(
			'blockName' => 'sgs/container',
			'attrs'     => $attrs,
		);
	}

	private function leaf( array $attrs = array(), string $name = 'sgs/image' ): array {
		return array(
			'blockName' => $name,
			'attrs'     => $attrs,
		);
	}

	private function sizes( string $device, $width = null, int $columns = 0, bool $lazy = false ): string {
		$own = Sgs_Layout_Width::own();
		return sgs_media_sizes_for_width( $width, $lazy, $columns, null, $own[ $device ] ?? null );
	}

	public function test_unknown_layout_keeps_todays_output(): void {
		$this->assertNull( Sgs_Layout_Width::own() );
		$this->assertSame( '100vw', $this->sizes( 'desktop' ) );
		$this->assertSame( 'auto, 100vw', $this->sizes( 'desktop', null, 0, true ) );
		$this->assertSame( 'calc(100vw / 3)', sgs_media_sizes_for_width( null, false, 3 ) );
	}

	public function test_a_full_width_section_is_the_viewport(): void {
		$this->open( $this->container( array( 'contentWidth' => array( 'desktop' => 'full' ) ) ), $this->leaf() );
		$this->assertSame( '100vw', $this->sizes( 'desktop' ) );
		$this->assertSame( '100vw', $this->sizes( 'mobile' ) );
	}

	public function test_a_normal_band_caps_at_the_theme_content_size(): void {
		$this->open( $this->container( array() ), $this->leaf() );
		$this->assertSame( '(max-width: 1200px) 100vw, 1200px', $this->sizes( 'desktop' ) );
	}

	public function test_padding_comes_off_the_band(): void {
		$this->open(
			$this->container(
				array(
					'contentWidth' => array( 'desktop' => 'full' ),
					'padding'      => array(
						'desktop' => array(
							'left'  => '2rem',
							'right' => '2rem',
						),
					),
				)
			),
			$this->leaf()
		);
		$this->assertSame( 'calc(100vw - 64px)', $this->sizes( 'desktop' ) );
	}

	public function test_two_and_four_column_grids_divide_the_band_less_the_gaps(): void {
		$grid = static fn( int $n ): array => array(
			'layout'       => 'grid',
			'columns'      => array(
				'desktop' => $n,
				'tablet'  => 2,
				'mobile'  => 1,
			),
			'gap'          => array( 'desktop' => '32px' ),
			'contentWidth' => array( 'desktop' => '1200px' ),
		);
		$this->open( $this->container( $grid( 2 ) ), $this->leaf() );
		$this->assertSame( 'min(584px, calc(50vw - 16px))', $this->sizes( 'desktop' ) );
		$this->assertSame( 'min(584px, calc(50vw - 16px))', $this->sizes( 'tablet' ) );
		$this->assertSame( '(max-width: 1200px) 100vw, 1200px', $this->sizes( 'mobile' ) );

		Sgs_Layout_Width::reset();
		$this->open( $this->container( $grid( 4 ) ), $this->leaf() );
		$this->assertSame( 'min(276px, calc(25vw - 24px))', $this->sizes( 'desktop' ) );
	}

	public function test_a_child_that_spans_takes_the_row_not_one_cell(): void {
		$this->open(
			$this->container(
				array(
					'layout'       => 'grid',
					'columns'      => array( 'desktop' => 4 ),
					'contentWidth' => array( 'desktop' => '1200px' ),
				)
			),
			$this->leaf( array( 'sgsChildSizing' => array( 'desktop' => 'span' ) ) )
		);
		$this->assertSame( '(max-width: 1200px) 100vw, 1200px', $this->sizes( 'desktop' ) );
	}

	public function test_hand_set_tracks_leave_the_cell_at_the_row(): void {
		$this->open(
			$this->container(
				array(
					'layout'         => 'grid',
					'columns'        => array( 'desktop' => 4 ),
					'minColumnWidth' => array( 'desktop' => '240px' ),
					'contentWidth'   => array( 'desktop' => '1200px' ),
				)
			),
			$this->leaf()
		);
		$this->assertSame( '(max-width: 1200px) 100vw, 1200px', $this->sizes( 'desktop' ) );
	}

	public function test_fr_tracks_bound_a_cell_by_the_widest_track(): void {
		$this->open(
			$this->container(
				array(
					'layout'              => 'grid',
					'gridTemplateColumns' => array(
						'desktop' => 'minmax(0, 1fr) minmax(0, 1.18fr)',
						'mobile'  => 'repeat(1, minmax(0, 1fr))',
					),
					'gap'                 => array( 'desktop' => '20px' ),
					'contentWidth'        => array( 'desktop' => '1200px' ),
				)
			),
			$this->leaf()
		);
		$this->assertSame( 'min(638.72px, calc(54.13vw - 10.83px))', $this->sizes( 'desktop' ) );
		$this->assertSame( '(max-width: 1200px) 100vw, 1200px', $this->sizes( 'mobile' ) );
		$this->assertSame( array( 1.0, 2.0 ), Sgs_Layout_Width::fr_tracks( '1fr 2fr' ) );
		$this->assertSame( array(), Sgs_Layout_Width::fr_tracks( '200px 1fr' ) );
		$this->assertSame( array(), Sgs_Layout_Width::fr_tracks( 'repeat(auto-fit, minmax(240px, 1fr))' ) );
	}

	public function test_a_product_list_divides_by_the_collection_columns_on_desktop_only(): void {
		$this->open(
			$this->container( array( 'contentWidth' => array( 'desktop' => '1200px' ) ) ),
			$this->leaf( array( 'displayLayout' => array( 'columns' => 4 ) ), 'woocommerce/product-collection' ),
			$this->leaf( array(), 'woocommerce/product-template' ),
			$this->leaf( array(), 'sgs/product-card' )
		);
		$this->assertSame( 'min(300px, 25vw)', $this->sizes( 'desktop' ) );
		$this->assertSame( '(max-width: 1200px) 100vw, 1200px', $this->sizes( 'mobile' ) );
	}

	public function test_an_item_set_divides_its_box_by_its_columns(): void {
		$this->open( $this->container( array( 'contentWidth' => array( 'desktop' => '1200px' ) ) ), $this->leaf( array(), 'sgs/card-grid' ) );
		$this->assertSame( 'min(400px, 33.33vw)', $this->sizes( 'desktop', null, 3 ) );
		$this->assertSame( 'auto, min(400px, 33.33vw)', $this->sizes( 'desktop', null, 3, true ) );
	}

	public function test_own_width_and_percent_cap_the_box(): void {
		$this->open( $this->container( array( 'contentWidth' => array( 'desktop' => 'full' ) ) ), $this->leaf() );
		$this->assertSame( '(max-width: 260px) 100vw, 260px', $this->sizes( 'desktop', '260px' ) );
		$this->assertSame( '50vw', $this->sizes( 'desktop', '50%' ) );
		$this->assertSame( '100vw', $this->sizes( 'desktop', '100%' ) );
	}

	public function test_a_shared_element_sizes_every_device_it_serves(): void {
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/media/render-picture.php';
		$this->assertSame( 'min(300px, 25vw)', sgs_media_combine_sizes( array( 'desktop' => 'min(300px, 25vw)', 'tablet' => 'min(300px, 25vw)' ) ) );
		$this->assertSame(
			'auto, (max-width:767.98px) min(500px, 100vw), (max-width:1023.98px) min(300px, 25vw), min(300px, 25vw)',
			sgs_media_combine_sizes(
				array(
					'desktop' => 'auto, min(300px, 25vw)',
					'tablet'  => 'auto, min(300px, 25vw)',
					'mobile'  => 'auto, (max-width: 500px) 100vw, 500px',
				)
			)
		);
	}

	public function test_frames_close_with_their_block(): void {
		$outer = $this->container( array() );
		$this->open( $outer, $this->leaf() );
		Sgs_Layout_Width::close_frame( '', $this->leaf() );
		Sgs_Layout_Width::close_frame( '', $outer );
		$this->assertNull( Sgs_Layout_Width::own() );
	}

	public function test_px_tracks_bound_a_cell_by_the_widest_track(): void {
		$this->open(
			$this->container(
				array(
					'layout'              => 'grid',
					'gridTemplateColumns' => array( 'desktop' => '574px 522px', 'mobile' => 'minmax(0, 1fr)' ),
					'contentWidth'        => array( 'desktop' => 'full' ),
				)
			),
			$this->leaf()
		);
		$this->assertSame( '(max-width: 574px) 100vw, 574px', $this->sizes( 'desktop' ) );
		$this->assertSame( 574.0, Sgs_Layout_Width::px_tracks( 'repeat(1, minmax(0, 341px)) 574px' ) );
		$this->assertSame( 341.0, Sgs_Layout_Width::px_tracks( 'minmax(0, 341px) minmax(0, 324px)' ) );
		$this->assertNull( Sgs_Layout_Width::px_tracks( '200px 1fr' ) );
		$this->assertNull( Sgs_Layout_Width::px_tracks( 'repeat(auto-fit, minmax(240px, 300px))' ) );
	}

	public function test_a_sideways_scroll_row_sizes_its_items_by_the_item_width(): void {
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/helpers-responsive.php';
		$attrs = array(
			'scrollSideways'  => array( 'mobile' => 'on' ),
			'scrollItemWidth' => array( 'mobile' => '147px' ),
			'contentWidth'    => array( 'desktop' => 'full' ),
		);
		$this->open( $this->container( $attrs ), $this->leaf() );
		$this->assertSame( '(max-width: 147px) 100vw, 147px', $this->sizes( 'mobile' ) );
		$this->assertSame( '100vw', $this->sizes( 'desktop' ), 'a device that does not scroll keeps the row' );
		Sgs_Layout_Width::reset();
		unset( $attrs['scrollItemWidth'] );
		$this->open( $this->container( $attrs ), $this->leaf() );
		$this->assertSame( '80vw', $this->sizes( 'mobile' ), 'no item width: 80% of the row' );
	}

	public function test_a_fixed_item_width_replaces_the_column_division(): void {
		$this->open( $this->container( array( 'contentWidth' => array( 'desktop' => 'full' ) ) ), $this->leaf() );
		$own = Sgs_Layout_Width::own();
		// Six columns would divide the row to ~16.7vw, below a 300px card: the fixed width is the figure.
		$this->assertSame( '(max-width: 300px) 100vw, 300px', sgs_media_sizes_for_width( null, false, 6, null, $own['mobile'], '300px' ) );
		$this->assertSame( '16.67vw', sgs_media_sizes_for_width( null, false, 6, null, $own['mobile'], null ) );
		$this->assertSame( '16.67vw', sgs_media_sizes_for_width( null, false, 6, null, $own['mobile'], '50%' ), 'a non-px card width is ignored' );
	}

	public function test_a_layer_with_a_px_width_holds_everything_inside_it(): void {
		$this->open(
			$this->container( array( 'contentWidth' => array( 'desktop' => 'full' ) ) ),
			$this->leaf( array( 'layerWidth' => array( 'desktop' => '303px', 'tablet' => '188px', 'mobile' => 'max-content' ) ), 'sgs/decorative-image' ),
			$this->leaf()
		);
		$this->assertSame( '(max-width: 303px) 100vw, 303px', $this->sizes( 'desktop' ) );
		$this->assertSame( '(max-width: 188px) 100vw, 188px', $this->sizes( 'tablet' ) );
		$this->assertSame( '100vw', $this->sizes( 'mobile' ), 'a width that is not px leaves the box at the row' );
	}
}
