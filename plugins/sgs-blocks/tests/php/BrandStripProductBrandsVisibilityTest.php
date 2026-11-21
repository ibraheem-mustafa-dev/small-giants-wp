<?php
/**
 * The sgs/brand-strip block with source "product-brands": with "hide empty brands" on, a brand is listed only when the shop lists
 * at least one product carrying it (WooCommerce's own rule: not `exclude-from-catalog`, and not `outofstock` when
 * `woocommerce_hide_out_of_stock_items` is `yes`), and `brandMaxItems` caps the list after that filter.
 *
 * The real src/blocks/brand-strip/product-brands-source.php runs in a child PHP process against an in-memory model
 * of WordPress's term and product queries (tests/php/support/brand-strip-product-brands-harness.php; the model
 * counts a term the way core does, blind to catalogue visibility).
 *
 * Run with: vendor/bin/phpunit --filter BrandStripProductBrandsVisibilityTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

/**
 * Brand strip brands listed by catalogue visibility.
 */
final class BrandStripProductBrandsVisibilityTest extends TestCase {

	private const HIDDEN = array( 'exclude-from-catalog' );

	/**
	 * Run the source against a scenario.
	 *
	 * @param array<string,mixed> $scenario Brands, products, options and block attributes.
	 * @return array{keys: string[], product_queries: int, term_queries: array<int,array<string,mixed>>}
	 */
	private function run_source( array $scenario ): array {
		$harness       = __DIR__ . '/support/brand-strip-product-brands-harness.php';
		$source        = dirname( __DIR__, 2 ) . '/src/blocks/brand-strip/product-brands-source.php';
		$scenario_file = tempnam( sys_get_temp_dir(), 'sgsbs' );
		file_put_contents( $scenario_file, json_encode( $scenario, JSON_THROW_ON_ERROR ) );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness ) . ' ' . escapeshellarg( $source ) . ' ' . escapeshellarg( $scenario_file ) . ' 2>&1' );
		} finally {
			@unlink( $scenario_file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		return $decoded;
	}

	/**
	 * One product.
	 *
	 * @param int      $id      Product id.
	 * @param int[]    $brands  Brand term ids.
	 * @param string[] $hidden  Product visibility terms it carries.
	 * @param string   $status  Post status.
	 * @return array<string,mixed>
	 */
	private function product( int $id, array $brands, array $hidden = array(), string $status = 'publish' ): array {
		return array(
			'id'     => $id,
			'status' => $status,
			'hidden' => $hidden,
			'brands' => $brands,
		);
	}

	/**
	 * Three brands named so name order is Acme (1), Bolt (2), Crest (3).
	 *
	 * @param array<int,array<string,mixed>> $products Products.
	 * @param array<string,mixed>            $attributes Block attributes.
	 * @param array<string,string>           $options Site options.
	 * @return array<string,mixed> Scenario.
	 */
	private function scenario( array $products, array $attributes, array $options = array() ): array {
		return array(
			'brands'     => array(
				array(
					'id'    => 1,
					'name'  => 'Acme',
					'order' => 30,
				),
				array(
					'id'    => 2,
					'name'  => 'Bolt',
					'order' => 10,
				),
				array(
					'id'    => 3,
					'name'  => 'Crest',
					'order' => 20,
				),
			),
			'products'   => $products,
			'options'    => $options,
			'attributes' => $attributes,
		);
	}

	/**
	 * MUST FAIL on the old code: a brand whose only product is catalogue-hidden is dropped with hide empty on.
	 */
	public function test_a_brand_whose_only_product_is_catalogue_hidden_is_dropped(): void {
		$r = $this->run_source(
			$this->scenario(
				array(
					$this->product( 10, array( 1 ), self::HIDDEN ),
					$this->product( 11, array( 2 ) ),
				),
				array( 'brandHideEmpty' => true )
			)
		);

		$this->assertSame( array( 'pb-2' ), $r['keys'] );
	}

	/**
	 * Negative control: the same brand is listed with hide empty off (nothing changes there, and no product query runs).
	 */
	public function test_negative_control_hide_empty_off_lists_the_hidden_only_brand(): void {
		$r = $this->run_source(
			$this->scenario(
				array(
					$this->product( 10, array( 1 ), self::HIDDEN ),
					$this->product( 11, array( 2 ) ),
				),
				array( 'brandHideEmpty' => false )
			)
		);

		$this->assertSame( array( 'pb-1', 'pb-2', 'pb-3' ), $r['keys'] );
		$this->assertSame( 0, $r['product_queries'] );
		$this->assertSame( 20, $r['term_queries'][0]['number'], 'with hide empty off the maximum (default 20) still goes to the term query' );
	}

	/**
	 * Negative control: a brand with one visible and one hidden product stays.
	 */
	public function test_negative_control_a_brand_with_a_visible_and_a_hidden_product_stays(): void {
		$r = $this->run_source(
			$this->scenario(
				array(
					$this->product( 10, array( 1 ), self::HIDDEN ),
					$this->product( 12, array( 1 ) ),
				),
				array( 'brandHideEmpty' => true )
			)
		);

		$this->assertSame( array( 'pb-1' ), $r['keys'] );
	}

	/**
	 * Negative control: a brand with no product at all, and one whose only product is a draft, stay dropped.
	 */
	public function test_negative_control_unpublished_and_absent_brands_stay_dropped(): void {
		$r = $this->run_source(
			$this->scenario(
				array(
					$this->product( 10, array( 1 ), array(), 'draft' ),
					$this->product( 11, array( 2 ) ),
				),
				array( 'brandHideEmpty' => true )
			)
		);

		$this->assertSame( array( 'pb-2' ), $r['keys'] );
	}

	/**
	 * MUST FAIL on the old code: brandMaxItems still yields the maximum when a hidden-only brand sits inside the first N.
	 */
	public function test_the_maximum_is_applied_after_the_visibility_filter(): void {
		$r = $this->run_source(
			$this->scenario(
				array(
					$this->product( 10, array( 1 ), self::HIDDEN ),
					$this->product( 11, array( 2 ) ),
					$this->product( 12, array( 3 ) ),
				),
				array(
					'brandHideEmpty' => true,
					'brandMaxItems'  => 2,
				)
			)
		);

		// Name order is Acme, Bolt, Crest: the first two are Acme (hidden only) and Bolt, so the old code listed one brand.
		$this->assertSame( array( 'pb-2', 'pb-3' ), $r['keys'] );
	}

	/**
	 * Negative control: the maximum still caps a list of all visible brands.
	 */
	public function test_negative_control_the_maximum_still_caps_visible_brands(): void {
		$r = $this->run_source(
			$this->scenario(
				array(
					$this->product( 10, array( 1 ) ),
					$this->product( 11, array( 2 ) ),
					$this->product( 12, array( 3 ) ),
				),
				array(
					'brandHideEmpty' => true,
					'brandMaxItems'  => 2,
				)
			)
		);

		$this->assertSame( array( 'pb-1', 'pb-2' ), $r['keys'] );
	}

	/**
	 * One product query and one object-terms query serve the whole list.
	 */
	public function test_the_visibility_check_is_one_product_query(): void {
		$r = $this->run_source(
			$this->scenario(
				array(
					$this->product( 10, array( 1 ), self::HIDDEN ),
					$this->product( 11, array( 2 ) ),
					$this->product( 12, array( 3 ) ),
				),
				array( 'brandHideEmpty' => true )
			)
		);

		$this->assertSame( 1, $r['product_queries'] );
		$this->assertCount( 1, $r['term_queries'] );
		$this->assertSame( 0, $r['term_queries'][0]['number'], 'the term query asks for every candidate; the maximum is applied after the filter' );
	}

	/**
	 * Ordering is unchanged: taxonomy order (the stored position, lowest first) with a hidden-only brand dropped, and the
	 * kept brands in the same order as with hide empty off.
	 */
	public function test_term_order_ordering_is_unchanged(): void {
		$products = array(
			$this->product( 10, array( 2 ), self::HIDDEN ),
			$this->product( 11, array( 1 ) ),
			$this->product( 12, array( 3 ) ),
		);
		$on       = $this->run_source(
			$this->scenario(
				$products,
				array(
					'brandHideEmpty' => true,
					'brandOrder'     => 'term_order',
				)
			)
		);
		$off      = $this->run_source(
			$this->scenario(
				$products,
				array(
					'brandHideEmpty' => false,
					'brandOrder'     => 'term_order',
				)
			)
		);

		// Stored positions: Bolt 10, Crest 20, Acme 30.
		$this->assertSame( array( 'pb-2', 'pb-3', 'pb-1' ), $off['keys'] );
		$this->assertSame( array( 'pb-3', 'pb-1' ), $on['keys'] );
		$this->assertSame( 'brand_order', $on['term_queries'][0]['orderby'] );
	}

	/**
	 * Ordering is unchanged: by count, most products first (the plain count, as today).
	 */
	public function test_count_ordering_is_unchanged(): void {
		$r = $this->run_source(
			$this->scenario(
				array(
					$this->product( 10, array( 1 ) ),
					$this->product( 11, array( 3 ) ),
					$this->product( 12, array( 3 ) ),
					$this->product( 13, array( 3 ), self::HIDDEN ),
				),
				array(
					'brandHideEmpty' => true,
					'brandOrder'     => 'count',
				)
			)
		);

		$this->assertSame( array( 'pb-3', 'pb-1' ), $r['keys'] );
	}

	/**
	 * MUST FAIL on the old code: with the shop hiding out-of-stock products, a brand whose only product is out of stock is dropped.
	 */
	public function test_an_out_of_stock_only_brand_is_dropped_when_the_shop_hides_out_of_stock(): void {
		$r = $this->run_source(
			$this->scenario(
				array(
					$this->product( 10, array( 1 ), array( 'outofstock' ) ),
					$this->product( 11, array( 2 ) ),
				),
				array( 'brandHideEmpty' => true ),
				array( 'woocommerce_hide_out_of_stock_items' => 'yes' )
			)
		);

		$this->assertSame( array( 'pb-2' ), $r['keys'] );
	}

	/**
	 * Negative control: with the shop showing out-of-stock products, that brand stays.
	 */
	public function test_negative_control_an_out_of_stock_only_brand_stays_when_the_shop_shows_out_of_stock(): void {
		$r = $this->run_source(
			$this->scenario(
				array(
					$this->product( 10, array( 1 ), array( 'outofstock' ) ),
					$this->product( 11, array( 2 ) ),
				),
				array( 'brandHideEmpty' => true ),
				array( 'woocommerce_hide_out_of_stock_items' => 'no' )
			)
		);

		$this->assertSame( array( 'pb-1', 'pb-2' ), $r['keys'] );
	}
}
