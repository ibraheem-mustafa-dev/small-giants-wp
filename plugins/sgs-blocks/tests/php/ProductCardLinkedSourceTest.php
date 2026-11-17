<?php
/**
 * sgs/product-card "linked product" source: on a product page the card shows the Nth upsell, cross-sell or related
 * product of the product being viewed.
 *
 * Run with: vendor/bin/phpunit --filter ProductCardLinkedSourceTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunInSeparateProcess;
use PHPUnit\Framework\TestCase;

final class ProductCardLinkedSourceTest extends TestCase {

	/** @return array<int,array<string,mixed>> The catalogue: viewed product 10, its upsells 11 to 14, related 15 to 16. */
	private static function catalogue( array $over = array() ): array {
		$base = array(
			10 => array( 'name' => 'Viewed bag', 'upsell_ids' => array( 10, 11, 12, 13, 14 ), 'cross_sell_ids' => array( 16 ), 'related_ids' => array( 10, 15, 16 ) ),
			11 => array( 'name' => 'Upsell one' ),
			12 => array( 'name' => 'Upsell two' ),
			13 => array( 'name' => 'Upsell three', 'status' => 'draft' ),
			14 => array( 'name' => 'Upsell four', 'visible' => false ),
			15 => array( 'name' => 'Related one' ),
			16 => array( 'name' => 'Related two' ),
			52 => array( 'name' => 'Fixed oak table' ),
		);
		$out = array();
		foreach ( array_replace( $base, array_map( static fn ( $row, $id ) => array_merge( $base[ $id ], $row ), $over, array_keys( $over ) ) ? array_combine( array_keys( $over ), array_map( static fn ( $row, $id ) => array_merge( $base[ $id ], $row ), $over, array_keys( $over ) ) ) : array() ) as $id => $row ) {
			$out[] = array_merge( array( 'id' => $id, 'price_html' => '<span>£1</span>', 'price' => '1', 'type' => 'simple', 'in_stock' => true ), $row );
		}
		return $out;
	}

	/** The real card's HTML ('' when it prints nothing), rendered by the QA harness in a child process. */
	private function card( array $attrs, array $catalogue, ?int $viewed ): string {
		$harness = dirname( __DIR__, 2 ) . '/scripts/qa/lib/render-css-harness.php';
		$files   = array();
		$trees   = array( 'attrs' => $attrs, 'product' => $catalogue );
		if ( null !== $viewed ) {
			$trees['queried'] = array( 'id' => $viewed, 'post_type' => 'product' );
		}
		foreach ( $trees as $key => $tree ) {
			$files[ $key ] = tempnam( sys_get_temp_dir(), 'sgslk' );
			file_put_contents( $files[ $key ], json_encode( $tree, JSON_THROW_ON_ERROR ) );
		}
		try {
			$cmd = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $harness )
				. ' --slug sgs/product-card --attrs-file ' . escapeshellarg( $files['attrs'] )
				. ' --product-file ' . escapeshellarg( $files['product'] )
				. ( isset( $files['queried'] ) ? ' --queried-file ' . escapeshellarg( $files['queried'] ) : '' ) . ' 2>&1';
			$out = (string) shell_exec( $cmd );
		} finally {
			foreach ( $files as $file ) {
				@unlink( $file );
			}
		}
		$decoded = json_decode( $out, true );
		$this->assertIsArray( $decoded, 'harness did not return JSON: ' . $out );
		$this->assertTrue( $decoded['ok'] ?? false, 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		return trim( (string) $decoded['html'] );
	}

	private static function linked( string $kind, int $position, int $sample = 52 ): array {
		return array( 'sourceMode' => 'wc-product', 'productId' => $sample, 'linkedProductKind' => $kind, 'linkedProductPosition' => $position );
	}

	public function test_it_shows_the_nth_upsell_of_the_viewed_product(): void {
		$html = $this->card( self::linked( 'upsells', 2 ), self::catalogue(), 10 );
		$this->assertStringContainsString( 'Upsell two', $html );
		$this->assertStringNotContainsString( 'Fixed oak table', $html, 'the sample product is only for the editor' );
	}

	public function test_it_never_shows_the_viewed_product_itself(): void {
		$html = $this->card( self::linked( 'upsells', 1 ), self::catalogue(), 10 );
		$this->assertStringContainsString( 'Upsell one', $html, 'the viewed product sits first in its own list and is skipped' );
		$this->assertStringNotContainsString( 'Viewed bag', $html );
	}

	public function test_it_skips_unpublished_and_hidden_products(): void {
		// Upsells 13 (draft) and 14 (hidden) are skipped, so position 3 has nothing and falls back to related.
		$html = $this->card( self::linked( 'upsells', 3 ), self::catalogue(), 10 );
		$this->assertStringNotContainsString( 'Upsell three', $html );
		$this->assertStringNotContainsString( 'Upsell four', $html );
		$this->assertStringContainsString( 'Related one', $html );
	}

	public function test_it_reads_cross_sells_and_related_products(): void {
		$this->assertStringContainsString( 'Related two', $this->card( self::linked( 'cross-sells', 1 ), self::catalogue(), 10 ) );
		$this->assertStringContainsString( 'Related one', $this->card( self::linked( 'related', 1 ), self::catalogue(), 10 ), 'the viewed product is dropped from related too' );
	}

	public function test_it_prints_nothing_when_no_product_is_left(): void {
		$bare = self::catalogue( array( 10 => array( 'upsell_ids' => array(), 'related_ids' => array() ) ) );
		$this->assertSame( '', $this->card( self::linked( 'upsells', 1 ), $bare, 10 ) );
	}

	public function test_it_prints_nothing_outside_a_product_page(): void {
		$this->assertSame( '', $this->card( self::linked( 'upsells', 1 ), self::catalogue(), null ) );
	}

	public function test_a_fixed_product_card_is_unchanged(): void {
		$fixed  = array( 'sourceMode' => 'wc-product', 'productId' => 52 );
		$plain  = $this->card( $fixed, self::catalogue(), 10 );
		$withAt = $this->card( $fixed + array( 'linkedProductKind' => '', 'linkedProductPosition' => 1 ), self::catalogue(), 10 );
		$norm   = static fn ( string $h ): string => preg_replace( '/sgs-pc-[a-z0-9]+/', 'sgs-pc-X', $h );
		$this->assertStringContainsString( 'Fixed oak table', $plain );
		$this->assertSame( $norm( $plain ), $norm( $withAt ), 'the new attributes at their defaults change nothing' );
		$this->assertSame( $norm( $plain ), $norm( $this->card( $fixed, self::catalogue(), null ) ), 'a fixed card ignores the page' );
	}

	#[RunInSeparateProcess]
	#[PreserveGlobalState( false )]
	public function test_a_sibling_card_never_repeats_a_product_and_the_lookup_runs_once(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ );
		}
		$GLOBALS['sgs_qa_products'] = self::catalogue( array( 10 => array( 'upsell_ids' => array( 11 ), 'related_ids' => array( 11, 15, 16 ) ) ) );
		if ( ! function_exists( 'absint' ) ) {
			function absint( $n ) { return abs( (int) $n ); }
		}
		require_once dirname( __DIR__, 2 ) . '/scripts/qa/lib/wc-product-stub.php';
		require_once dirname( __DIR__, 2 ) . '/includes/product-card-linked-source.php';

		$this->assertSame( 11, sgs_product_card_linked_resolve( 10, 'upsells', 1 ) );
		$this->assertSame( 15, sgs_product_card_linked_resolve( 10, 'upsells', 2 ), 'only one upsell: related fills in, minus the viewed product and the one a sibling shows' );
		$this->assertSame( 16, sgs_product_card_linked_resolve( 10, 'upsells', 3 ) );
		$this->assertSame( 0, sgs_product_card_linked_resolve( 10, 'upsells', 4 ), 'nothing left: the card prints nothing' );
		$this->assertSame( 0, sgs_product_card_linked_resolve( 0, 'upsells', 1 ), 'not on a product page' );

		$GLOBALS['sgs_qa_products'] = array();
		$this->assertSame( array( 11 ), sgs_product_card_linked_candidates( 10, 'upsells' ), 'cached: the second ask does not read the catalogue again' );
	}
}
