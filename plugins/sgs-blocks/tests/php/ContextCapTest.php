<?php
/**
 * The builder context cap: 24,576 bytes by default, raised per product through a filter, held between 8 KB and 128 KB.
 *
 * Each test runs in its own process, so the apply_filters stand-in it loads never reaches another test file.
 *
 * @package SGS\Blocks\Tests
 */

use PHPUnit\Framework\TestCase;

/**
 * Class ContextCapTest
 *
 * @runTestsInSeparateProcesses
 * @preserveGlobalState disabled
 */
class ContextCapTest extends TestCase {

	/**
	 * Loads the stand-in and the cap function in this test's own process.
	 */
	protected function setUp(): void {
		require_once __DIR__ . '/fixtures/apply-filters-override-stub.php';
		require_once dirname( __DIR__, 2 ) . '/includes/configurator-seed.php';
		unset( $GLOBALS['sgs_test_filters'] );
	}

	/**
	 * With no filter the cap is 24,576 bytes.
	 */
	public function test_default_is_24576(): void {
		$this->assertSame( 24576, sgs_configurator_context_cap_bytes( 257 ) );
	}

	/**
	 * A filter raises the cap for the product it names and leaves the others at the default.
	 */
	public function test_a_site_raises_it_for_one_product_only(): void {
		$GLOBALS['sgs_test_filters']['sgs_configurator_context_cap_bytes'] = static function ( $cap, $product_id ) {
			return 257 === $product_id ? 40960 : $cap;
		};
		$this->assertSame( 40960, sgs_configurator_context_cap_bytes( 257 ) );
		$this->assertSame( 24576, sgs_configurator_context_cap_bytes( 282 ) );
	}

	/**
	 * A filtered value below 8 KB or above 128 KB is held at the bound.
	 */
	public function test_a_filtered_value_is_held_between_8_and_128_kb(): void {
		$GLOBALS['sgs_test_filters']['sgs_configurator_context_cap_bytes'] = static function () {
			return 10;
		};
		$this->assertSame( 8192, sgs_configurator_context_cap_bytes( 1 ) );
		$GLOBALS['sgs_test_filters']['sgs_configurator_context_cap_bytes'] = static function () {
			return 10 * 1024 * 1024;
		};
		$this->assertSame( 131072, sgs_configurator_context_cap_bytes( 1 ) );
	}
}
