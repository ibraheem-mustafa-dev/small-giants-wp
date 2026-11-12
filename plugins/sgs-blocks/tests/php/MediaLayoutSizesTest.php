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
		// Four columns with WooCommerce's 20px gap between them: (1200 - 3 * 20) / 4.
		$this->assertSame( 'min(285px, calc(25vw - 15px))', $this->sizes( 'desktop' ) );
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

	private function grid( array $over = array() ): array {
		return $this->container(
			array_merge(
				array(
					'layout'              => 'grid',
					'contentWidth'        => array( 'desktop' => 'full' ),
					'gap'                 => array( 'desktop' => '16px' ),
					'gridTemplateColumns' => array( 'desktop' => 'repeat(auto-fill, minmax(170px, 1fr))' ),
				),
				$over
			)
		);
	}

	public function test_auto_fill_tracks_print_one_exact_cell_per_column_count(): void {
		$this->open( $this->grid(), $this->leaf() );
		$segs = Sgs_Layout_Width::grid_segments( Sgs_Layout_Width::own()['desktop'] );
		// 170px tracks with a 16px gap: n columns from an (n * 186 - 16)px row, which is the viewport width itself.
		$this->assertSame( array( 1472, 1286, 1100, 914, 728, 542, 356, null ), array_column( $segs, 0 ) );
		$sizes = $this->sizes( 'desktop' );
		$this->assertStringStartsWith( '(min-width:1472px) calc(12.5vw - 14px), ', $sizes );
		$this->assertStringContainsString( '(min-width:728px) calc(25vw - 12px), ', $sizes );
		$this->assertStringEndsWith( '(min-width:356px) calc(50vw - 8px), 100vw', $sizes );
	}

	public function test_an_auto_fill_cell_inside_a_padded_card_keeps_the_card_padding_after_the_division(): void {
		$card = $this->container(
			array(
				'padding'      => array( 'desktop' => array( 'left' => '12px', 'right' => '12px' ) ),
				'contentWidth' => array( 'desktop' => 'full' ),
			)
		);
		$this->open( $this->grid(), $card, $this->leaf() );
		$this->assertStringContainsString( '(min-width:356px) calc(50vw - 32px), calc(100vw - 24px)', $this->sizes( 'desktop' ) );
	}

	public function test_a_capped_auto_fill_row_stops_at_the_columns_that_fit_under_the_cap(): void {
		$this->open( $this->grid( array( 'maxWidth' => array( 'desktop' => '1056px' ) ) ), $this->leaf() );
		$sizes = $this->sizes( 'desktop' );
		// Five columns need a 914px row; six need 1100px, more than the cap: the widest entry is five columns.
		$this->assertStringStartsWith( '(min-width:914px) min(198.4px, calc(20vw - 12.8px)), ', $sizes );
	}

	public function test_a_gap_of_unknown_size_keeps_the_cell_at_the_row(): void {
		$this->open( $this->grid( array( 'gap' => array( 'desktop' => 'var:preset|spacing|missing' ) ) ), $this->leaf() );
		$this->assertSame( '100vw', $this->sizes( 'desktop' ) );
	}

	public function test_a_gap_token_resolves_to_the_theme_spacing_size(): void {
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- WP stub.
		function wp_get_global_settings( $path = array() ) {
			return array( 'spacing', 'spacingSizes' ) === $path
				? array(
					'default' => array( array( 'slug' => '30', 'size' => '9px' ) ),
					'theme'   => array( array( 'slug' => '30', 'size' => '0.5rem' ), array( 'slug' => '40', 'size' => 'clamp(1rem, 2vw, 2rem)' ) ),
				)
				: null;
		}
		$this->assertSame( array( 8.0, 8.0 ), Sgs_Layout_Width::length_bounds( 'var:preset|spacing|30' ), 'the theme size overrides the default' );
		$this->assertSame( array( 16.0, 32.0 ), Sgs_Layout_Width::length_bounds( 'var(--wp--preset--spacing--40)' ) );
		$this->assertSame( array( 16.0, 16.0 ), Sgs_Layout_Width::length_bounds( '1rem' ) );
		$this->assertSame( array( 0.0, null ), Sgs_Layout_Width::length_bounds( 'var:preset|spacing|99' ) );
		$this->assertSame( array( 0.0, null ), Sgs_Layout_Width::length_bounds( 'calc(1rem + 2vw)' ) );
		// A clamp() gap: the cell uses the smallest gap, the column count the largest.
		$this->open( $this->grid( array( 'gap' => array( 'desktop' => 'var:preset|spacing|40' ) ) ), $this->leaf() );
		$grid = Sgs_Layout_Width::own()['desktop']['grid'];
		$this->assertSame( array( 16.0, 32.0 ), array( $grid['glo'], $grid['ghi'] ) );
	}

	public function test_auto_fit_counts_columns_only_up_to_the_item_count(): void {
		$attrs = array(
			'layout'              => 'grid',
			'contentWidth'        => array( 'desktop' => 'full' ),
			'gap'                 => array( 'desktop' => '16px' ),
			'gridTemplateColumns' => array( 'desktop' => 'repeat(auto-fit, minmax(170px, 1fr))' ),
		);
		$two   = array(
			array( 'blockName' => 'sgs/media', 'attrs' => array() ),
			array( 'blockName' => 'sgs/media', 'attrs' => array() ),
		);
		$frame = Sgs_Layout_Width::frame( 'sgs/container', $attrs, null, $two );
		$this->assertSame( 2, $frame['cell']['desktop']['grid']['max_n'] );
		$this->assertCount( 2, Sgs_Layout_Width::grid_segments( $frame['cell']['desktop'] ), 'one and two columns only' );
		$core = Sgs_Layout_Width::frame( 'sgs/container', $attrs, null, array( array( 'blockName' => 'core/paragraph', 'attrs' => array() ) ) );
		$this->assertArrayNotHasKey( 'grid', $core['cell']['desktop'], 'an item count that is not known leaves the cell at the row' );
	}

	public function test_a_grid_cell_in_a_single_expression_is_bounded_by_two_tracks_and_a_gap(): void {
		$this->open( $this->grid(), $this->leaf() );
		$this->assertSame( 'min(356px, 100vw)', Sgs_Layout_Width::to_sizes( Sgs_Layout_Width::own()['desktop'], true ) );
	}

	public function test_combined_devices_keep_each_column_count_under_its_own_device_range(): void {
		require_once SGS_BLOCKS_PLUGIN_DIR . '/includes/media/render-picture.php';
		$this->open(
			$this->grid(
				array(
					'gridTemplateColumns' => array(
						'mobile'  => 'repeat(auto-fill, minmax(140px, 1fr))',
						'tablet'  => 'repeat(auto-fill, minmax(170px, 1fr))',
						'desktop' => 'repeat(auto-fill, minmax(170px, 1fr))',
					),
				)
			),
			$this->leaf()
		);
		$by_device = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			$by_device[ $device ] = $this->sizes( $device );
		}
		$combined = sgs_media_combine_sizes( $by_device );
		// Mobile, 140px tracks: four columns from 608px, six from 920px (past the mobile range, so not printed).
		$this->assertStringContainsString( '(max-width:767.98px) and (min-width:608px) calc(25vw - 12px), ', $combined );
		$this->assertStringNotContainsString( '(min-width:920px)', $combined );
		$this->assertStringContainsString( '(max-width:767.98px) 100vw, ', $combined );
		// Tablet: five columns from 914px; four start under the tablet's 768px, so that count has no start.
		$this->assertStringContainsString( '(max-width:1023.98px) and (min-width:914px) calc(20vw - 12.8px), (max-width:1023.98px) calc(25vw - 12px), ', $combined );
		// Desktop ends the list with no device condition, and its five columns start under 1024px.
		$this->assertStringEndsWith( ', (min-width:1100px) calc(16.67vw - 13.33px), calc(20vw - 12.8px)', $combined );
	}

	public function test_a_product_list_takes_woocommerces_gap_off_each_cell(): void {
		$template = array(
			'blockName' => 'woocommerce/product-template',
			'attrs'     => array( 'displayLayout' => array( 'columns' => 4 ) ),
		);
		$row      = array( 'contentWidth' => array( 'desktop' => 'full' ), 'maxWidth' => array( 'desktop' => '1240px' ) );
		$this->open( $this->container( $row ), $template, $this->leaf() );
		$this->assertSame( 'min(295px, calc(25vw - 15px))', $this->sizes( 'desktop' ) );
		Sgs_Layout_Width::reset();
		$this->open( $this->container( $row + array( 'className' => 'sgs-shop-layout' ) ), $template, $this->leaf() );
		$this->assertSame( 'min(310px, 25vw)', $this->sizes( 'desktop' ), 'the shop layout sets its own gap, so none is assumed' );
	}

	public function test_a_container_with_a_ratio_gives_its_only_child_the_box_shape(): void {
		$parent = $this->container( array( 'boxAspectRatio' => '4 / 3.2', 'contentWidth' => array( 'desktop' => 'full' ) ) );
		Sgs_Layout_Width::open_frame( $parent + array( 'innerBlocks' => array( $this->leaf() ) ) );
		Sgs_Layout_Width::open_frame( $this->leaf() );
		$this->assertEqualsWithDelta( 1.25, Sgs_Layout_Width::box()['ratio'], 0.0001 );
		$this->assertTrue( Sgs_Layout_Width::box()['roomy'] );
		Sgs_Layout_Width::reset();
		Sgs_Layout_Width::open_frame( $parent + array( 'innerBlocks' => array( $this->leaf(), $this->leaf() ) ) );
		Sgs_Layout_Width::open_frame( $this->leaf() );
		$this->assertNull( Sgs_Layout_Width::box(), 'a second child can make the parent taller than its ratio says' );
	}

	public function test_a_ratio_box_in_a_centred_stack_is_as_wide_as_its_min_height_makes_it(): void {
		$stack  = $this->container( array( 'layout' => 'stack', 'alignItems' => array( 'desktop' => 'center' ) ) );
		$circle = $this->container(
			array(
				'boxAspectRatio' => '1 / 1',
				'minHeight'      => array( 'mobile' => '150px', 'desktop' => '140px' ),
				'borderWidth'    => array( 'left' => '5px', 'right' => '5px', 'top' => '5px', 'bottom' => '5px' ),
			)
		);
		Sgs_Layout_Width::open_frame( $stack );
		Sgs_Layout_Width::open_frame( $circle + array( 'innerBlocks' => array( $this->leaf() ) ) );
		Sgs_Layout_Width::open_frame( $this->leaf() );
		$width = Sgs_Layout_Width::box()['width'];
		$this->assertSame( array( 'desktop' => 130.0, 'tablet' => 130.0, 'mobile' => 140.0 ), $width );
		Sgs_Layout_Width::reset();
		// A stack that stretches its children (no alignItems) leaves the width to the row: no figure.
		Sgs_Layout_Width::open_frame( $this->container( array( 'layout' => 'stack' ) ) );
		Sgs_Layout_Width::open_frame( $circle + array( 'innerBlocks' => array( $this->leaf() ) ) );
		Sgs_Layout_Width::open_frame( $this->leaf() );
		$this->assertSame( array(), Sgs_Layout_Width::box()['width'] );
	}

	public function test_a_layout_with_no_parent_box_gives_none(): void {
		$this->open( $this->container( array( 'boxAspectRatio' => '1 / 1' ) ), $this->leaf() );
		$this->assertNull( Sgs_Layout_Width::box(), 'the container had no inner blocks listed' );
	}

	public function test_a_blocks_max_width_holds_everything_inside_it(): void {
		$logo = $this->leaf( array( 'maxWidth' => array( 'desktop' => 190, 'tablet' => '150px', 'mobile' => 'none' ) ), 'sgs/responsive-logo' );
		$this->open( $this->container( array( 'contentWidth' => array( 'desktop' => 'full' ) ) ), $logo, $this->leaf() );
		$this->assertSame( '(max-width: 190px) 100vw, 190px', $this->sizes( 'desktop' ), 'a bare number is px' );
		$this->assertSame( '(max-width: 150px) 100vw, 150px', $this->sizes( 'tablet' ) );
		$this->assertSame( '100vw', $this->sizes( 'mobile' ), 'none removes the cap at that device' );
	}
}
