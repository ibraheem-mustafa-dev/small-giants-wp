<?php
/**
 * Tests: sgs/buybox renders a simple product through its own markup and settings (Spec 27 FR-30-2, Spec 11 §3), so the
 * built-in button kit reaches every product page (Bean's ruling, 2026-11-21: the kit applies theme-wide, with no gaps).
 * A simple product gets a one-choice manifest (`Product_Manifest::build_simple()`): the `.sgs-buybox` wrapper, its gallery
 * column, the price row, stock line and its own `.buybox__add-to-cart` posting the product itself, and a linked flow's
 * opener exactly as a variable product prints it. Only a product type other than simple and variable (grouped, external)
 * and a simple product WooCommerce shows no price for keep WooCommerce's own blocks.
 *
 * Renders the real render.php through tests/fixtures/buybox/flow-render-wrapper.php (the harness plus WooCommerce's price
 * functions), with the standard fixture's product turned simple.
 *
 * Run with: vendor/bin/phpunit --filter BuyboxSimpleProductTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class BuyboxSimpleProductTest extends TestCase {

	private const DIR = __DIR__ . '/../fixtures/buybox';

	private const SIMPLE = array( 'type' => 'simple', 'price' => '9', 'sku' => 'LC-1' );

	/** Render the standard fixture with `$product` merged into its product; `$linked` links product 52 to a choice flow. */
	private static function render( array $attrs, array $product = self::SIMPLE, bool $linked = false ): string {
		$fixture            = json_decode( (string) file_get_contents( self::DIR . '/standard.json' ), true, 512, JSON_THROW_ON_ERROR );
		$fixture['attrs']   = array_merge( $fixture['attrs'], $attrs );
		$fixture['product'] = array_merge( $fixture['product'], $product );
		if ( $linked ) {
			$fixture['product']['meta'] = array( '_sgs_choice_flow' => 'lens-flow' );
		}
		$cmd   = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( self::DIR . '/flow-render-wrapper.php' ) . ' --slug sgs/buybox --motion-targets';
		$files = array();
		foreach ( array( 'attrs', 'product', 'manifest', 'context' ) as $key ) {
			$files[ $key ] = tempnam( sys_get_temp_dir(), 'sgssp' );
			file_put_contents( $files[ $key ], json_encode( $fixture[ $key ], JSON_THROW_ON_ERROR ) );
			$cmd .= ' --' . $key . '-file ' . escapeshellarg( $files[ $key ] );
		}
		try {
			$out = (string) shell_exec( $cmd . ' 2>&1' );
		} finally {
			array_map( 'unlink', $files );
		}
		$start   = strpos( $out, '{"ok"' );
		$decoded = false === $start ? null : json_decode( substr( $out, $start ), true );
		if ( ! is_array( $decoded ) || ! ( $decoded['ok'] ?? false ) ) {
			throw new RuntimeException( 'render.php failed: ' . ( $decoded['error'] ?? $out ) );
		}
		return (string) $decoded['html'];
	}

	/** The CSS rules (the `<style>` text) in a render. */
	private static function css( string $html ): string {
		preg_match_all( '#<style[^>]*>(.*?)</style>#s', $html, $m );
		return implode( '', $m[1] );
	}

	/** The seeded Interactivity context of the buy box root. */
	private static function context( string $html ): array {
		if ( 1 !== preg_match( "#data-wp-context='([^']*)'#", $html, $m ) ) {
			return array();
		}
		return (array) json_decode( html_entity_decode( $m[1], ENT_QUOTES ), true );
	}

	public function test_a_simple_product_renders_the_buy_boxs_own_wrapper_and_add_to_cart(): void {
		$html = self::render( array( 'addToCartStyle' => 'primary', 'addToCartShowPrice' => true, 'addToCartHoverLift' => true, 'addToCartShowIcon' => false, 'addToCartLabel' => 'Add to basket' ) );
		$this->assertMatchesRegularExpression( '#<div class="sgs-buybox sgs-bb-[0-9a-f]{8}"#', $html, 'MUST FAIL: the buy box wrapper with its scope class' );
		$this->assertStringContainsString( '<div class="sgs-buybox__gallery-col">', $html, 'the gallery column' );
		$this->assertStringContainsString( 'class="buybox__price buybox__price--current"', $html, 'the price row' );
		$this->assertMatchesRegularExpression( '#<form\s+class="buybox__cart-form"[^>]*data-wp-on--submit="actions\.addToCart"#s', $html, 'MUST FAIL: the buy box\'s own add form' );
		$this->assertStringContainsString( 'class="wp-element-button buybox__add-to-cart buybox__add-to-cart--primary buybox__add-to-cart--show-price buybox__add-to-cart--hover-lift"', $html, 'MUST FAIL: the preset, show-price and hover-lift settings on the button' );
		$this->assertStringContainsString( '<span class="buybox__cart-label">Add to basket</span>', $html, 'the label setting' );
		$this->assertStringContainsString( '<span class="buybox__cart-price" data-wp-text="context.priceDisplay">', $html, 'the price inside the button' );
		$this->assertStringNotContainsString( 'buybox__cart-icon', $html, 'addToCartShowIcon off: no cart icon' );
		$this->assertStringNotContainsString( 'sgs/option-picker', $html, 'a simple product has no pickers (the harness marks each picker render_block call)' );
		$this->assertStringNotContainsString( 'wp:woocommerce/', $html );
		$ctx = self::context( $html );
		$this->assertSame( 52, $ctx['addToCartId'] ?? null, 'the store posts the product itself' );
		$this->assertSame( 0, $ctx['selectedVariationId'] ?? null, 'no variation' );
		$this->assertSame( array(), $ctx['axes'] ?? null );
		$this->assertTrue( $ctx['inStock'] ?? null );
		$this->assertStringNotContainsString( ' style="', $html, 'no inline style' );
	}

	public function test_the_cart_icon_shows_by_default(): void {
		$this->assertMatchesRegularExpression( '#<button\s+type="submit"\s+class="wp-element-button buybox__add-to-cart"[^>]*>\s*<svg class="buybox__cart-icon"#s', self::render( array() ), 'MUST FAIL: addToCartShowIcon defaults on, as on a variable product' );
	}

	public function test_the_add_to_cart_kit_css_reaches_a_simple_products_button(): void {
		$html = self::render( array( 'addToCartColourBackground' => 'accent', 'addToCartContentAlign' => array( 'desktop' => 'center' ), 'addToCartHoverLiftDistance' => 4 ) );
		preg_match( '#<div class="sgs-buybox (sgs-bb-[0-9a-f]{8})"#', $html, $m );
		$this->assertNotEmpty( $m, 'MUST FAIL: the buy box wrapper' );
		$sel = '.' . $m[1] . '.wp-block-sgs-buybox .buybox__add-to-cart';
		$css = self::css( $html );
		$this->assertStringContainsString( $sel . '{background-color:var(--wp--preset--color--accent', $css, 'the colour setting' );
		$this->assertStringContainsString( $sel . '{justify-content:center;}', $css, 'the content alignment setting' );
		$this->assertStringContainsString( $sel . ':not([disabled]):hover{translate:0 -4px}', $css, 'the hover lift distance setting' );
	}

	public function test_keep_both_prints_the_opener_and_add_to_cart_in_the_order_openerBeforeAddToCart_sets(): void {
		$after  = self::render( array( 'keepAddToCartWithFlow' => true ), self::SIMPLE, true );
		$before = self::render( array( 'keepAddToCartWithFlow' => true, 'openerBeforeAddToCart' => true ), self::SIMPLE, true );
		$opener = '<div class="buybox__cart-form buybox__cart-form--modal"[^>]*><button type="button" class="wp-element-button buybox__add-to-cart buybox__add-to-cart--secondary buybox__add-to-cart--flow-opener"[^>]*>.*?Add prescription lenses.*?</button></div>';
		$this->assertMatchesRegularExpression( '#<div class="sgs-buybox sgs-bb-[0-9a-f]{8}".*sgs-buybox__cart-actions--with-flow">\s*<form\s+class="buybox__cart-form".*</form>\s*' . $opener . '</div>#s', $after, 'MUST FAIL: inside the buy box, Add to Cart then the opener' );
		$this->assertMatchesRegularExpression( '#<div class="sgs-buybox sgs-bb-[0-9a-f]{8}".*sgs-buybox__cart-actions--with-flow">\s*' . $opener . '\s*<form\s+class="buybox__cart-form".*</form>\s*</div>#s', $before, 'MUST FAIL: with openerBeforeAddToCart, the opener first' );
		foreach ( array( $after, $before ) as $html ) {
			$this->assertSame( 1, substr_count( $html, 'data-sgs-modal-open="sgs-flow-lens-flow"' ), 'one opener' );
			$this->assertSame( 1, substr_count( $html, 'data-wp-on--submit="actions.addToCart"' ), 'one Add to Cart' );
		}
	}

	public function test_the_opener_and_its_note_colour_take_the_buy_boxs_own_scope(): void {
		$html = self::render( array( 'keepAddToCartWithFlow' => true, 'openerNoteColour' => '#b8b0a4', 'flowOpenerColourBackground' => 'accent' ), self::SIMPLE, true );
		preg_match( '#<div class="sgs-buybox (sgs-bb-[0-9a-f]{8})"#', $html, $m );
		$this->assertNotEmpty( $m, 'MUST FAIL: the buy box wrapper' );
		$root = '.' . $m[1] . '.wp-block-sgs-buybox';
		$css  = self::css( $html );
		$this->assertStringContainsString( $root . ' .buybox__add-to-cart-note{color:#b8b0a4;}', $css, 'the note colour on the buy box scope' );
		$this->assertMatchesRegularExpression( '#' . preg_quote( $root . ' .buybox__add-to-cart:where(.buybox__add-to-cart--flow-opener){', '#' ) . '(?:[^}]*;)?background-color:var\(--wp--preset--color--accent,#', $css, 'the opener\'s own colour on the buy box scope' );
		$this->assertStringNotContainsString( 'sgs-bb-fo-', $html, 'no separate opener scope class any more' );
	}

	public function test_without_the_keep_setting_the_flow_opener_replaces_add_to_cart(): void {
		$html = self::render( array( 'addToCartStyle' => 'outline' ), self::SIMPLE, true );
		$this->assertMatchesRegularExpression( '#<div class="sgs-buybox sgs-bb-[0-9a-f]{8}"#', $html, 'MUST FAIL: inside the buy box' );
		$this->assertMatchesRegularExpression( '#<button type="button" class="wp-element-button buybox__add-to-cart buybox__add-to-cart--outline"[^>]*data-sgs-modal-open="sgs-flow-lens-flow"#', $html, 'MUST FAIL: Add to Cart itself opens the flow, wearing its own preset' );
		$this->assertStringNotContainsString( 'data-wp-on--submit="actions.addToCart"', $html, 'no add form' );
		$this->assertStringNotContainsString( 'sgs-buybox__cart-actions', $html );
	}

	public function test_an_out_of_stock_simple_product_hides_its_add_form_and_offers_the_notify_form(): void {
		$html = self::render( array(), array_merge( self::SIMPLE, array( 'in_stock' => false ) ) );
		$this->assertFalse( self::context( $html )['inStock'] ?? null, 'MUST FAIL: the seeded stock flag the form\'s hidden binding reads' );
		$this->assertMatchesRegularExpression( '#<form\s+class="buybox__cart-form"\s+data-wp-bind--hidden="!context\.inStock"#', $html, 'the add form is hidden while out of stock' );
		$this->assertStringContainsString( 'class="sgs-buybox__notify"', $html, 'the back-in-stock form' );
		$this->assertStringContainsString( '>Out of stock</p>', $html, 'the stock line' );
	}

	public function test_a_simple_product_woocommerce_will_not_sell_shows_no_add_to_cart_and_no_flow(): void {
		foreach ( array( false, true ) as $linked ) {
			$html = self::render( array( 'keepAddToCartWithFlow' => true, 'stickyBar' => array( 'mobile' => 'after-button' ) ), array_merge( self::SIMPLE, array( 'purchasable' => false ) ), $linked );
			$this->assertMatchesRegularExpression( '#<div class="sgs-buybox sgs-bb-[0-9a-f]{8}"#', $html, 'MUST FAIL: the buy box still shows the product' );
			$this->assertStringNotContainsString( 'buybox__cart-form', $html, 'no add form' );
			$this->assertStringNotContainsString( 'buybox__add-to-cart', $html, 'no Add to Cart, no opener' );
			$this->assertStringNotContainsString( 'data-sgs-modal-open', $html );
			$this->assertStringNotContainsString( 'sgs-modal', $html, 'no flow modal' );
			$this->assertStringNotContainsString( 'sgs-buybox__bar', $html, 'no add-to-basket bar' );
		}
	}

	/** Negative controls: what still falls back to WooCommerce's own blocks (the harness's do_blocks drops their comments, so the fallback prints nothing here). */
	public function test_grouped_external_and_priceless_products_keep_the_core_fallback(): void {
		foreach ( array( array( 'type' => 'grouped' ), array( 'type' => 'external' ), array( 'type' => 'simple', 'price' => '' ) ) as $product ) {
			$html = self::render( array(), $product );
			$this->assertStringNotContainsString( 'sgs-buybox', $html, json_encode( $product ) );
			$this->assertStringNotContainsString( 'buybox__add-to-cart', $html, json_encode( $product ) );
			$this->assertSame( '', trim( $html ), json_encode( $product ) . ': only the core fallback' );
		}
	}

	/** A grouped or external product is not bought through the buy box, so a flow linked to one prints no opener: the plain core fallback. */
	public function test_a_grouped_or_external_product_linked_to_a_flow_gets_the_plain_core_fallback(): void {
		foreach ( array( array( 'type' => 'grouped' ), array( 'type' => 'external' ) ) as $product ) {
			$this->assertSame( '', trim( self::render( array(), $product, true ) ), json_encode( $product ) . ' MUST FAIL: no flow opener on a product the buy box cannot sell' );
		}
	}

	public function test_a_variable_product_still_renders_its_pickers_and_variation_seed(): void {
		$html = self::render( array(), array() );
		$this->assertSame( 2, substr_count( $html, 'block=sgs/option-picker' ), 'one picker an axis (the harness marks each render_block call)' );
		$ctx = self::context( $html );
		$this->assertGreaterThan( 0, $ctx['selectedVariationId'] ?? 0 );
		$this->assertNotSame( array(), $ctx['axes'] ?? array() );
	}
}
