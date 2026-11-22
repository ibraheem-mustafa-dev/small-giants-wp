<?php
/**
 * Tests: sgs/account's `hideUnofferedTabs` setting (the Downloads tab is left out while the shop sells no download and the
 * customer holds none; off changes nothing) and the setting's registration in block.json and the inspector.
 *
 * The behaviour cases live in run-account-hide-unoffered-tabs-standalone.php, which prints one PASS or FAIL line each.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter AccountHideUnofferedTabsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class AccountHideUnofferedTabsTest extends TestCase {

	public function test_every_menu_case_passes(): void {
		$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/run-account-hide-unoffered-tabs-standalone.php' ) . ' 2>&1' );
		$this->assertStringNotContainsString( 'FAIL', $out, $out );
		$this->assertStringContainsString( 'ALL PASSED', $out, $out );
	}

	public function test_the_setting_is_an_off_by_default_boolean(): void {
		$block = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/account/block.json' ), true, 512, JSON_THROW_ON_ERROR );
		$attr  = $block['attributes']['hideUnofferedTabs'] ?? null;
		$this->assertIsArray( $attr );
		$this->assertSame( 'boolean', $attr['type'] );
		$this->assertFalse( $attr['default'] );
	}

	public function test_the_menu_panel_has_the_control(): void {
		$panel = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/account/MenuPanel.js' );
		$this->assertStringContainsString( 'name="hideUnofferedTabs"', $panel );
	}
}
