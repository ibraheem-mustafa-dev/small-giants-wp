<?php
/**
 * Tests: sgs/buybox `keepAddToCartWithFlow` (Spec 43 FR-43-25). A product linked to a choice flow gets the flow's opener in
 * place of Add to Cart (today's behaviour, setting off). With the setting on, Add to Cart stays exactly as without a flow
 * and the flow's opener renders beside it as a second button; the modal renders once.
 *
 * The helper logic runs in tests/php/run-buybox-keep-flow-standalone.php (child process, own stubs); the render wiring runs
 * the real render.php through the harness with a flow that resolves (tests/fixtures/buybox/flow-render-wrapper.php).
 *
 * Run with: vendor/bin/phpunit --filter BuyboxKeepFlowTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\TestCase;

final class BuyboxKeepFlowTest extends TestCase {

	private const DIR = __DIR__ . '/../fixtures/buybox';

	public function test_the_helper_checks_all_pass(): void {
		$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __DIR__ . '/run-buybox-keep-flow-standalone.php' ) . ' 2>&1' );
		$this->assertStringContainsString( ' 0 failed', $out, $out );
		$this->assertStringNotContainsString( 'FAIL', $out );
	}

	/** Render the standard fixture with product 52 linked to a flow; `$product_overrides` changes the product (a simple product: `type`). */
	private static function render( array $attr_overrides, bool $linked = true, array $product_overrides = array() ): string {
		$fixture = json_decode( (string) file_get_contents( self::DIR . '/standard.json' ), true, 512, JSON_THROW_ON_ERROR );
		$fixture['attrs']   = array_merge( $fixture['attrs'], $attr_overrides );
		$fixture['product'] = array_merge( $fixture['product'], $product_overrides );
		if ( $linked ) {
			$fixture['product']['meta'] = array( '_sgs_choice_flow' => 'lens-flow' );
		}
		$cmd   = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( self::DIR . '/flow-render-wrapper.php' ) . ' --slug sgs/buybox --motion-targets';
		$files = array();
		foreach ( array( 'attrs', 'product', 'manifest', 'context' ) as $key ) {
			$files[ $key ] = tempnam( sys_get_temp_dir(), 'sgskf' );
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
		return BuyboxSnapshotTest::norm( (string) $decoded['html'] );
	}

	public function test_off_the_flow_opener_replaces_add_to_cart(): void {
		$html = self::render( array() );
		$this->assertStringContainsString( 'data-sgs-modal-open="sgs-flow-lens-flow"', $html );
		$this->assertStringNotContainsString( 'data-wp-on--submit="actions.addToCart"', $html, 'no cart form: the opener took its place' );
		$this->assertStringNotContainsString( 'sgs-buybox__cart-actions', $html, 'no new wrapper' );
		$this->assertStringNotContainsString( 'buybox__add-to-cart--flow-opener', $html, 'no new class' );
	}

	public function test_off_is_the_same_whether_the_attribute_is_absent_or_false(): void {
		$this->assertSame( self::render( array() ), self::render( array( 'keepAddToCartWithFlow' => false ) ) );
	}

	public function test_on_keeps_add_to_cart_and_adds_the_opener_beside_it(): void {
		$html = self::render( array( 'keepAddToCartWithFlow' => true ) );
		$this->assertStringContainsString( 'data-wp-on--submit="actions.addToCart"', $html, 'Add to Cart form stays' );
		$this->assertSame( 1, substr_count( $html, 'data-sgs-modal-open="sgs-flow-lens-flow"' ), 'one opener' );
		$this->assertSame( 1, substr_count( $html, 'sgs-buybox__cart-actions--with-flow' ), 'one wrapper' );
		$form   = strpos( $html, 'data-wp-on--submit="actions.addToCart"' );
		$opener = strpos( $html, 'data-sgs-modal-open="sgs-flow-lens-flow"' );
		$close  = strpos( $html, '</div>', $opener );
		$this->assertTrue( $form < $opener, 'the opener follows Add to Cart' );
		$this->assertMatchesRegularExpression( '#sgs-buybox__cart-actions--with-flow">\s*<form.*</form>\s*<div class="buybox__cart-form buybox__cart-form--modal"[^>]*><button type="button" class="wp-element-button buybox__add-to-cart buybox__add-to-cart--secondary buybox__add-to-cart--flow-opener"[^>]*>.*?Add prescription lenses.*?</button></div></div>#s', $html );
		$this->assertStringNotContainsString( ' style="', substr( $html, (int) strpos( $html, 'sgs-buybox__cart-actions--with-flow' ), $close - (int) strpos( $html, 'sgs-buybox__cart-actions--with-flow' ) ), 'no inline style in the new markup' );
	}

	public function test_on_without_a_linked_flow_renders_as_without_the_setting(): void {
		$this->assertSame( self::render( array(), false ), self::render( array( 'keepAddToCartWithFlow' => true ), false ) );
	}

	public function test_an_explicit_popup_action_keeps_its_precedence(): void {
		$html = self::render( array( 'keepAddToCartWithFlow' => true, 'addToCartAction' => 'modal', 'addToCartModalId' => 'my-popup' ) );
		$this->assertStringContainsString( 'data-sgs-modal-open="my-popup"', $html );
		$this->assertStringNotContainsString( 'sgs-buybox__cart-actions', $html );
		$this->assertStringNotContainsString( 'sgs-flow-lens-flow', $html );
	}

	private const SIMPLE = array( 'type' => 'simple' );

	/** The pre-change render of a product/setting pair, kept in tests/fixtures/buybox/snapshots/keep-flow-<name>.html (SGS_UPDATE_SNAPSHOTS=1 writes it on purpose). */
	private function assertMatchesSnapshot( string $name, string $html ): void {
		$snap = self::DIR . "/snapshots/keep-flow-$name.html";
		if ( '1' === getenv( 'SGS_UPDATE_SNAPSHOTS' ) ) {
			file_put_contents( $snap, $html );
		}
		$this->assertFileExists( $snap );
		$this->assertSame( BuyboxSnapshotTest::norm( (string) file_get_contents( $snap ) ), $html, "$name no longer renders byte-identically" );
	}

	public function test_off_renders_exactly_as_before_for_a_simple_and_a_variable_product(): void {
		$this->assertMatchesSnapshot( 'off-simple-linked', self::render( array(), true, self::SIMPLE ) );
		$this->assertMatchesSnapshot( 'off-simple-linked-explicit-false', self::render( array( 'keepAddToCartWithFlow' => false ), true, self::SIMPLE ) );
		$this->assertMatchesSnapshot( 'off-simple-unlinked', self::render( array(), false, self::SIMPLE ) );
		$this->assertMatchesSnapshot( 'off-variable-linked', self::render( array() ) );
		$this->assertMatchesSnapshot( 'off-variable-linked-explicit-false', self::render( array( 'keepAddToCartWithFlow' => false ) ) );
		$this->assertMatchesSnapshot( 'off-variable-unlinked', self::render( array(), false ) );
	}

	public function test_a_simple_product_with_the_setting_on_keeps_its_output_byte_for_byte(): void {
		$html = self::render( array( 'keepAddToCartWithFlow' => true ), true, self::SIMPLE );
		$this->assertSame( 1, substr_count( $html, 'sgs-buybox__cart-actions--with-flow' ) );
		$this->assertSame( 1, substr_count( $html, 'data-sgs-modal-open="sgs-flow-lens-flow"' ) );
		$this->assertMatchesSnapshot( 'on-simple-in-stock', $html );
	}

	/**
	 * The flow opener's look, before the built-in button kit reads `flowOpener*`: every path that prints the opener, with none of
	 * those attributes set, renders as today. The keep path of a variable product and the empty-string form of an unset
	 * attribute are pinned here; the linked (flow replaces Add to Cart) paths of both product types and the keep path of a
	 * simple product are pinned by the `off-*` and `on-simple-in-stock` snapshots above.
	 */
	public function test_the_opener_renders_exactly_as_before_with_no_flow_opener_setting(): void {
		$keep_variable = self::render( array( 'keepAddToCartWithFlow' => true ) );
		$this->assertMatchesSnapshot( 'on-variable-linked', $keep_variable );
		$this->assertStringContainsString( 'buybox__add-to-cart buybox__add-to-cart--secondary buybox__add-to-cart--flow-opener"', $keep_variable );
		$this->assertStringNotContainsString( 'sgs-bb-fo-', $keep_variable, 'no scope class while nothing is set' );
		$this->assertSame( $keep_variable, self::render( array( 'keepAddToCartWithFlow' => true, 'flowOpenerStyle' => '' ) ), 'an empty string is unset' );
		$keep_simple = self::render( array( 'keepAddToCartWithFlow' => true ), true, self::SIMPLE );
		$this->assertSame( $keep_simple, self::render( array( 'keepAddToCartWithFlow' => true, 'flowOpenerStyle' => '' ), true, self::SIMPLE ), 'an empty string is unset, simple product' );
		$this->assertStringNotContainsString( 'sgs-bb-fo-', $keep_simple );
		$linked_simple = self::render( array(), true, self::SIMPLE );
		$this->assertSame( $linked_simple, self::render( array( 'flowOpenerStyle' => '' ), true, self::SIMPLE ) );
		$this->assertStringNotContainsString( '<style', $linked_simple, 'the simple linked path prints no style tag while nothing is set' );
	}

	public function test_a_simple_product_follows_the_variable_products_precedence_an_explicit_popup_wins(): void {
		$off = self::render( array(), true, self::SIMPLE );
		$on  = self::render( array( 'keepAddToCartWithFlow' => true, 'addToCartAction' => 'modal', 'addToCartModalId' => 'my-popup' ), true, self::SIMPLE );
		$this->assertSame( $off, $on, 'with an explicit popup the setting does nothing, as on a variable product' );
		$this->assertStringNotContainsString( 'sgs-buybox__cart-actions', $on );
	}

	public function test_a_simple_product_in_the_guided_layout_ignores_the_setting(): void {
		$off = self::render( array( 'buyboxLayout' => 'guided' ), true, self::SIMPLE );
		$on  = self::render( array( 'buyboxLayout' => 'guided', 'keepAddToCartWithFlow' => true ), true, self::SIMPLE );
		$this->assertSame( $off, $on, 'the guided layout never runs the keep setting' );
		$this->assertStringNotContainsString( 'sgs-buybox__cart-actions', $on );
	}

	public function test_a_popup_action_with_no_popup_named_still_keeps_on_a_simple_product(): void {
		$empty = self::render( array( 'keepAddToCartWithFlow' => true, 'addToCartAction' => 'modal', 'addToCartModalId' => '  ' ), true, self::SIMPLE );
		$this->assertSame( self::render( array( 'keepAddToCartWithFlow' => true ), true, self::SIMPLE ), $empty, 'no popup named falls back to cart mode, so the opener shows' );
		$this->assertStringContainsString( 'sgs-buybox__cart-actions--with-flow', $empty );
	}

	public function test_a_simple_product_that_cannot_be_bought_shows_no_opener_and_no_wrapper(): void {
		$bare = self::render( array(), false, self::SIMPLE );
		foreach ( array( array( 'in_stock' => false ), array( 'purchasable' => false ) ) as $unavailable ) {
			$html = self::render( array( 'keepAddToCartWithFlow' => true ), true, array_merge( self::SIMPLE, $unavailable ) );
			$this->assertStringNotContainsString( 'data-sgs-modal-open', $html, json_encode( $unavailable ) );
			$this->assertStringNotContainsString( 'sgs-buybox__cart-actions', $html );
			$this->assertSame( $bare, $html, 'what core does to its own button is all that shows' );
		}
	}

	public function test_the_core_fallback_markup_lives_in_one_place(): void {
		$render  = (string) file_get_contents( __DIR__ . '/../../src/blocks/buybox/render.php' );
		$include = (string) file_get_contents( __DIR__ . '/../../includes/buybox-linked-flow.php' );
		$this->assertStringNotContainsString( 'wp:woocommerce/', $render, 'render.php builds its fallback from sgs_buybox_core_fallback_parts()' );
		$this->assertSame( 1, substr_count( $include, 'wp:woocommerce/add-to-cart-with-options' ), 'the keep path and the no-flow fallback share one copy of the core Add to Cart markup' );
		$this->assertSame( 1, substr_count( $include, 'wp:woocommerce/product-image-gallery' ), 'one copy of the gallery and price markup' );
	}
}
