<?php
/**
 * Tests: the measured fold count (Spec 38A §9), `Sgs_Fold_Scan` and its REST route `sgs/v1/fold-scan/<id>`.
 *
 * Run with:
 *   vendor/bin/phpunit --filter FoldScanTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Motion\Sgs_Fold_Scan;
use SGS\Blocks\Motion\Sgs_Fold_Scan_Rest;
use SGS\Blocks\Motion\Sgs_Motion_Fold;

final class FoldScanTest extends TestCase {

	protected function setUp(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		$GLOBALS['fs_meta']    = array();
		$GLOBALS['fs_can']     = true;
		$GLOBALS['fs_nonce_ok'] = true;
		$GLOBALS['fs_purged']  = array();
		$GLOBALS['fs_has_hook'] = true;
		$GLOBALS['fs_status'] = 'publish';
		require_once __DIR__ . '/stubs/fold-scan-stubs.php';
		require_once dirname( __DIR__, 2 ) . '/includes/motion/class-sgs-fold-scan.php';
		require_once dirname( __DIR__, 2 ) . '/includes/motion/class-sgs-fold-scan-rest.php';
	}

	private static function request( $value, int $id = 7 ): WP_REST_Request {
		$request = new WP_REST_Request( array( 'id' => $id, 'sections' => $value ) );
		return $request;
	}

	public function test_accessor_returns_the_constant_when_nothing_is_stored(): void {
		$this->assertSame( Sgs_Motion_Fold::FOLD_SECTIONS, Sgs_Fold_Scan::section_count( 7 ) );
	}

	public function test_accessor_returns_the_stored_value(): void {
		$GLOBALS['fs_meta'][7]['_sgs_fold_sections'] = '4';
		$this->assertSame( 4, Sgs_Fold_Scan::section_count( 7 ) );
	}

	public function test_accessor_ignores_a_stored_value_out_of_range(): void {
		$GLOBALS['fs_meta'][7]['_sgs_fold_sections'] = '0';
		$this->assertSame( Sgs_Motion_Fold::FOLD_SECTIONS, Sgs_Fold_Scan::section_count( 7 ) );
		$GLOBALS['fs_meta'][7]['_sgs_fold_sections'] = '99';
		$this->assertSame( Sgs_Motion_Fold::FOLD_SECTIONS, Sgs_Fold_Scan::section_count( 7 ) );
	}

	public function test_permission_refuses_a_missing_nonce(): void {
		$GLOBALS['fs_nonce_ok'] = false;
		$this->assertFalse( true === Sgs_Fold_Scan_Rest::permission( self::request( 3 ) ) );
	}

	public function test_permission_refuses_a_user_without_edit_post(): void {
		$GLOBALS['fs_can'] = false;
		$this->assertFalse( true === Sgs_Fold_Scan_Rest::permission( self::request( 3 ) ) );
	}

	public function test_permission_refuses_an_unpublished_post(): void {
		$GLOBALS['fs_status'] = 'draft';
		$this->assertFalse( true === Sgs_Fold_Scan_Rest::permission( self::request( 3 ) ) );
	}

	public function test_permission_allows_a_nonce_and_edit_post(): void {
		$this->assertTrue( Sgs_Fold_Scan_Rest::permission( self::request( 3 ) ) );
	}

	public function test_values_outside_one_to_twenty_are_refused(): void {
		foreach ( array( 0, 21, -3, 'abc', 2.5 ) as $bad ) {
			$this->assertFalse( Sgs_Fold_Scan_Rest::valid_sections( $bad ), (string) $bad );
		}
		foreach ( array( 1, 20, '5' ) as $good ) {
			$this->assertTrue( Sgs_Fold_Scan_Rest::valid_sections( $good ), (string) $good );
		}
	}

	public function test_handle_stores_the_meta_and_purges_the_page_cache(): void {
		$response = Sgs_Fold_Scan_Rest::handle( self::request( '6' ) );
		$this->assertSame( 6, $GLOBALS['fs_meta'][7]['_sgs_fold_sections'] );
		$this->assertSame( array( 7 ), $GLOBALS['fs_purged'] );
		$this->assertSame( 6, $response->data['sections'] );
	}

	public function test_handle_skips_the_purge_when_the_hook_does_not_exist(): void {
		$GLOBALS['fs_has_hook'] = false;
		Sgs_Fold_Scan_Rest::handle( self::request( 3 ) );
		$this->assertSame( array(), $GLOBALS['fs_purged'] );
		$this->assertSame( 3, $GLOBALS['fs_meta'][7]['_sgs_fold_sections'] );
	}

	public function test_meta_is_registered_private_and_not_in_rest(): void {
		Sgs_Fold_Scan::register_meta();
		$args = $GLOBALS['fs_registered_meta']['_sgs_fold_sections'];
		$this->assertFalse( $args['show_in_rest'] );
		$this->assertSame( 'absint', $args['sanitize_callback'] );
		$this->assertSame( 'integer', $args['type'] );
	}
}
