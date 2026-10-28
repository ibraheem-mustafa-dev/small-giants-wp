<?php
/**
 * Gift cards and the variable-product preflight (Spec 27, FR-27-GC1).
 *
 * A gift card publishes; an ordinary variable product with no variesBy mapping is still
 * reverted to draft. Runs the real Product_Preflight in a child process
 * (tests/php/support/gift-card-preflight-harness.php).
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\TestCase;

#[Group( 'sgs_gift_card' )]
final class GiftCardPreflightTest extends TestCase {

	/** @var array<string,mixed> */
	private static array $r = array();

	/** @var array<string,mixed> */
	private static array $mutated = array();

	/**
	 * Run the harness and decode its JSON.
	 *
	 * @param string $flag Optional harness flag.
	 * @return array<string,mixed>
	 */
	private static function run_harness( string $flag = '' ): array {
		$script = __DIR__ . '/support/gift-card-preflight-harness.php';
		$out    = array();
		$code   = 0;
		exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ( '' === $flag ? '' : ' ' . $flag ) . ' 2>&1', $out, $code );
		$json = json_decode(
			implode(
				'
',
				$out
			),
			true
		);
		if ( 0 !== $code || ! is_array( $json ) ) {
			self::fail(
				'Harness failed: ' . implode(
					'
',
					$out
				)
			);
		}
		return $json;
	}

	public static function setUpBeforeClass(): void {
		self::$r       = self::run_harness();
		self::$mutated = self::run_harness( '--without-exemption' );
	}

	public function test_a_gift_card_is_ready_and_never_runs_the_variation_checks(): void {
		$this->assertTrue( self::$r['gift_ready'] );
		$this->assertSame( array( 'gift_card_exempt' ), self::$r['gift_checked'] );
	}

	public function test_a_gift_card_is_not_reverted_to_draft_on_publish(): void {
		// The harness published the gift card first: no wp_update_post call yet.
		$this->assertSame( array(), self::$r['updates_gift'] );
	}

	public function test_a_variable_product_with_no_variesby_still_fails_and_reverts(): void {
		$this->assertFalse( self::$r['variable_ready'] );
		$this->assertContains( 'no_variesby', self::$r['variable_codes'] );
		$this->assertSame(
			array(
				array(
					'ID'          => 202,
					'post_status' => 'draft',
				),
			),
			self::$r['updates_after'],
			'Only the variable product was reverted.'
		);
	}

	public function test_the_exemption_is_by_type_not_by_attributes(): void {
		// Both fake products carry the same pa_amount axis; only the type differs.
		$this->assertTrue( self::$r['gift_ready'] );
		$this->assertFalse( self::$r['variable_ready'] );
		$this->assertTrue( self::$r['gift_variable_like_ready'], 'A gift card that WooCommerce also sees as variable still passes.' );
	}

	public function test_without_the_exemption_that_gift_card_would_be_blocked_negative_control(): void {
		$this->assertFalse( self::$mutated['gift_variable_like_ready'], 'With the exemption call removed, the same gift card fails check 6.' );
		$this->assertContains( 'no_variesby', self::$mutated['variable_codes'] );
	}
}
