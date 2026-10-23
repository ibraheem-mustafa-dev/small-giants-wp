<?php
/**
 * Ruling 11 on the render side: a size the client set lifts the 44px tap floor in the tiers where it is set, and a block
 * with no size prints no flag. Covers sgs/cart (a set iconSize, 24 included; read from source), sgs/store-selector and sgs/theme-toggle
 * (the flag follows the tier the size is set in) and sgs/whatsapp-cta (the minHeight that survives its length sanitiser).
 *
 * Renders the real render.php through the shared harness (BlockHarnessRenderTrait). The Playwright half is
 * tests/playwright/tap-area-cases/tapFix.mjs.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/BlockHarnessRenderTrait.php';

final class TapFloorsRenderTest extends TestCase {

	use BlockHarnessRenderTrait;

	private const STORES = array( 'stores' => array( array( 'label' => 'UK', 'url' => 'https://example.test/uk' ), array( 'label' => 'US', 'url' => 'https://example.test/us' ) ) );
	private const DARK    = array( 'custom' => array( 'dark' => array( 'colour' => array( 'base' => '#111111' ) ) ) );

	/**
	 * The cart's render.php bails out without the WooCommerce class (the harness has none), so its flag logic is read from source:
	 * the flag follows "iconSize present", never "iconSize differs from 24".
	 */
	public function test_cart_flag_follows_a_set_icon_size_not_a_value(): void {
		$render = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/cart/render.php' );
		$this->assertStringContainsString( "\$icon_size_set         = isset( \$attributes['iconSize'] ) && is_numeric( \$attributes['iconSize'] );", $render );
		$this->assertStringContainsString( "\$icon_size             = \$icon_size_set ? absint( \$attributes['iconSize'] ) : 24;", $render );
		$this->assertStringContainsString( "if ( \$icon_size_set && 'icon' === \$trigger_style ) {", $render );
		$this->assertStringNotContainsString( '24 !== $icon_size', $render );
		$edit = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/cart/edit.js' );
		$this->assertStringContainsString( "undefined !== iconSizeSet && ! hasPill ? '0px'", $edit );
	}

	public function test_cart_block_json_declares_no_icon_size_default(): void {
		$block = json_decode( (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/blocks/cart/block.json' ), true );
		$this->assertArrayNotHasKey( 'default', $block['attributes']['iconSize'] );
	}

	public function test_store_selector_prints_the_flag_only_in_the_tier_the_size_is_set(): void {
		$mobile = $this->render_block( 'sgs/store-selector', self::STORES + array( 'flagSize' => array( 'mobile' => array( 'w' => 20, 'h' => 14 ) ) ) )['css'];
		$this->assertSame( 1, substr_count( $mobile, '--sgs-ss-tap-min:0px' ) );
		$this->assertMatchesRegularExpression( '/@media\(max-width:767px\)\{[^{]*\{--sgs-ss-tap-min:0px;\}\}/', $mobile, 'a mobile-only size lifts the floor at mobile only' );

		$desktop = $this->render_block( 'sgs/store-selector', self::STORES + array( 'flagSize' => array( 'desktop' => array( 'w' => 20, 'h' => 14 ) ) ) )['css'];
		$this->assertMatchesRegularExpression( '/(^|\})\.[^{]*\{--sgs-ss-tap-min:0px;\}/', $desktop, 'a desktop size prints the flag outside any media query' );

		$none = $this->render_block( 'sgs/store-selector', self::STORES )['css'];
		$this->assertStringNotContainsString( '--sgs-ss-tap-min', $none );
	}

	public function test_theme_toggle_prints_the_flag_only_in_the_tier_the_size_is_set(): void {
		$mobile = $this->render_block( 'sgs/theme-toggle', array( 'iconSize' => array( 'mobile' => 20 ) ), array(), self::DARK )['css'];
		$this->assertSame( 1, substr_count( $mobile, '--sgs-tt-tap-min:0px' ) );
		$this->assertMatchesRegularExpression( '/@media[^{]*max-width:767px[^{]*\{[^{]*\{--sgs-tt-tap-min:0px;\}\}/', $mobile );
		$this->assertStringNotContainsString( '--sgs-tt-tap-min', $this->render_block( 'sgs/theme-toggle', array(), array(), self::DARK )['css'] );
	}

	public function test_whatsapp_prints_min_height_only_when_the_length_survives_sanitising(): void {
		$set = $this->render_block( 'sgs/whatsapp-cta', array( 'phoneNumber' => '447700900123', 'minHeight' => '30px' ) )['css'];
		$this->assertStringContainsString( 'min-height:30px', $set );
		$this->assertStringContainsString( '--sgs-wa-min-height:30px', $set );

		$bad = $this->render_block( 'sgs/whatsapp-cta', array( 'phoneNumber' => '447700900123', 'minHeight' => '40px;}body{color:red' ) )['css'];
		$this->assertStringNotContainsString( 'min-height:;', $bad );
		$this->assertStringNotContainsString( '--sgs-wa-min-height', $bad, 'a rejected length prints nothing, so the floor stays' );
	}
}
