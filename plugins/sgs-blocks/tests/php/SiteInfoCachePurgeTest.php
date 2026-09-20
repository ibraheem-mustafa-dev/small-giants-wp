<?php
/**
 * Tests: the Site Info store's LiteSpeed page-cache purge.
 *
 * The store feeds site-wide chrome, so an edit must clear the whole page cache;
 * and the purge must be a silent no-op on a site with no LiteSpeed listening,
 * which is what the has_action() guard buys.
 *
 * Run with: vendor/bin/phpunit --filter SiteInfoCachePurgeTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;
use SGS\Blocks\Sgs_Site_Info;
use SGS\Blocks\Sgs_Site_Info_Cache_Purge;

if ( ! function_exists( 'has_action' ) ) {
	/**
	 * Stub for WP has_action(), backed by $GLOBALS['sgs_test_listening_actions'].
	 * Nothing is listening unless a test says so — the LiteSpeed-absent case.
	 *
	 * @param string $hook Action name.
	 * @return bool
	 */
	function has_action( string $hook ): bool {
		return ! empty( $GLOBALS['sgs_test_listening_actions'][ $hook ] );
	}
}

if ( ! function_exists( 'do_action' ) ) {
	/**
	 * Stub for WP do_action(), recording each fired hook in
	 * $GLOBALS['sgs_test_fired_actions'].
	 *
	 * @param string $hook Action name.
	 * @return void
	 */
	function do_action( string $hook ): void {
		$GLOBALS['sgs_test_fired_actions'][] = $hook;
	}
}

require_once __DIR__ . '/../../includes/class-sgs-site-info-cache-purge.php';

/**
 * Class SiteInfoCachePurgeTest
 *
 * @covers \SGS\Blocks\Sgs_Site_Info_Cache_Purge
 */
class SiteInfoCachePurgeTest extends TestCase {

	protected function setUp(): void {
		$GLOBALS['sgs_test_listening_actions'] = array();
		$GLOBALS['sgs_test_fired_actions']     = array();
	}

	/**
	 * The source of the purge class, used for the registration assertions.
	 *
	 * @return string
	 */
	private function purge_source(): string {
		return (string) file_get_contents( __DIR__ . '/../../includes/class-sgs-site-info-cache-purge.php' );
	}

	/**
	 * Both option hooks are registered against the purge callback. `add_action`
	 * is a no-op stub across this suite, so registration is asserted on the
	 * source rather than on a hook registry that does not exist here.
	 */
	public function test_both_option_hooks_are_registered(): void {
		$source = $this->purge_source();

		$this->assertStringContainsString( "'update_option_' . Sgs_Site_Info::OPTION_KEY", $source );
		$this->assertStringContainsString( "'add_option_' . Sgs_Site_Info::OPTION_KEY", $source );
		$this->assertSame( 2, substr_count( $source, "array( __CLASS__, 'purge' )" ) );
		$this->assertSame( 'sgs_site_info', Sgs_Site_Info::OPTION_KEY, 'The hook names are built from this key.' );
	}

	/**
	 * register() runs without error — the callback names a real method.
	 */
	public function test_register_wires_a_callable(): void {
		Sgs_Site_Info_Cache_Purge::register();

		$this->assertTrue( is_callable( array( Sgs_Site_Info_Cache_Purge::class, 'purge' ) ) );
	}

	/**
	 * LiteSpeed absent: the guard returns before firing anything, so a site
	 * without the plugin neither fatals nor fires a stray action.
	 */
	public function test_purge_is_a_no_op_without_litespeed(): void {
		Sgs_Site_Info_Cache_Purge::purge();

		$this->assertSame( array(), $GLOBALS['sgs_test_fired_actions'] );
	}

	/**
	 * Positive control for the test above: with LiteSpeed listening, the same
	 * call does fire the purge — so the no-op is caused by the guard and not by
	 * an inert harness.
	 */
	public function test_purge_fires_when_litespeed_is_listening(): void {
		$GLOBALS['sgs_test_listening_actions'][ Sgs_Site_Info_Cache_Purge::PURGE_ACTION ] = true;

		Sgs_Site_Info_Cache_Purge::purge();

		$this->assertSame( array( Sgs_Site_Info_Cache_Purge::PURGE_ACTION ), $GLOBALS['sgs_test_fired_actions'] );
	}
}
