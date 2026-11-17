<?php
/**
 * The free-delivery meter's server-side decision: delivery that already costs nothing makes the meter complete whatever the
 * basket total (includes/helpers-free-delivery.php::sgs_delivery_costs_nothing and sgs_free_delivery_progress).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', '/' );
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-free-delivery.php';

final class FreeDeliveryAlreadyFreeTest extends TestCase {

	private function rate( float $cost ): object {
		return new class( $cost ) {
			public function __construct( private float $cost ) {}
			public function get_cost(): string {
				return (string) $this->cost;
			}
		};
	}

	/**
	 * The meter for a 30.00 threshold, through both pure functions.
	 *
	 * @param float                    $subtotal       Basket subtotal.
	 * @param bool                     $needs_shipping Whether it needs shipping.
	 * @param array<int,mixed>         $packages       Packages.
	 * @param array<int|string,string> $chosen         Chosen rate ids.
	 * @return array{pct: float, remaining: float, complete: bool}
	 */
	private function meter( float $subtotal, bool $needs_shipping, array $packages, array $chosen ): array {
		return sgs_free_delivery_progress( $subtotal, 30.0, sgs_delivery_costs_nothing( $needs_shipping, $packages, $chosen ) );
	}

	public function test_over_the_minimum_is_complete(): void {
		$m = $this->meter( 40.0, true, array( array( 'rates' => array( 'flat:1' => $this->rate( 4.5 ) ) ) ), array( 'flat:1' ) );
		$this->assertTrue( $m['complete'] );
		$this->assertSame( 100.0, $m['pct'] );
	}

	public function test_under_the_minimum_with_a_paid_rate_is_not_complete(): void {
		$m = $this->meter( 12.0, true, array( array( 'rates' => array( 'flat:1' => $this->rate( 4.5 ) ) ) ), array( 'flat:1' ) );
		$this->assertFalse( $m['complete'] );
		$this->assertSame( 18.0, $m['remaining'] );
		$this->assertSame( 40.0, $m['pct'] );
	}

	public function test_under_the_minimum_with_a_zero_cost_chosen_rate_is_complete(): void {
		$rates = array(
			'flat:1' => $this->rate( 4.5 ),
			'flat:2' => $this->rate( 0.0 ),
		);
		$m     = $this->meter( 12.0, true, array( array( 'rates' => $rates ) ), array( 'flat:2' ) );
		$this->assertTrue( $m['complete'] );
		$this->assertSame( 0.0, $m['remaining'] );
		$this->assertSame( 100.0, $m['pct'] );
	}

	public function test_a_paid_chosen_rate_beats_an_unchosen_free_one(): void {
		$rates = array(
			'flat:1' => $this->rate( 4.5 ),
			'flat:2' => $this->rate( 0.0 ),
		);
		$this->assertFalse( sgs_delivery_costs_nothing( true, array( array( 'rates' => $rates ) ), array( 'flat:1' ) ) );
	}

	public function test_no_chosen_rate_uses_the_cheapest(): void {
		$free = array(
			'flat:1' => $this->rate( 4.5 ),
			'flat:2' => $this->rate( 0.0 ),
		);
		$paid = array(
			'flat:1' => $this->rate( 4.5 ),
			'flat:2' => $this->rate( 6.0 ),
		);
		$this->assertTrue( $this->meter( 12.0, true, array( array( 'rates' => $free ) ), array() )['complete'] );
		$this->assertFalse( $this->meter( 12.0, true, array( array( 'rates' => $paid ) ), array() )['complete'] );
	}

	public function test_no_rates_calculated_behaves_as_before(): void {
		$this->assertFalse( $this->meter( 12.0, true, array(), array() )['complete'] );
		$this->assertFalse( $this->meter( 12.0, true, array( array( 'rates' => array() ) ), array() )['complete'] );
	}

	public function test_a_basket_needing_no_shipping_behaves_as_before(): void {
		$m = $this->meter( 12.0, false, array( array( 'rates' => array( 'free:1' => $this->rate( 0.0 ) ) ) ), array( 'free:1' ) );
		$this->assertFalse( $m['complete'] );
		$this->assertSame( 18.0, $m['remaining'] );
	}

	public function test_every_package_must_be_free(): void {
		$packages = array(
			array( 'rates' => array( 'a' => $this->rate( 0.0 ) ) ),
			array( 'rates' => array( 'b' => $this->rate( 3.0 ) ) ),
		);
		$this->assertFalse( sgs_delivery_costs_nothing( true, $packages, array( 'a', 'b' ) ) );
	}
}
