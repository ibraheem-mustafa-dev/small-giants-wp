<?php
/**
 * Tests: sgs/buybox `keepAddToCartWithFlow` (Spec 43 FR-43-25). A product linked to a choice flow gets the flow's opener in
 * place of Add to Cart (today's behaviour, setting off). With the setting on, Add to Cart stays exactly as without a flow
 * and the flow's opener renders beside it as a second button; the modal renders once. A simple product renders through the same
 * buy box markup (a one-choice manifest), so these paths are the same markup on both product types; BuyboxSimpleProductTest
 * covers the simple product's own render.
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

	public function test_opener_first_puts_the_opener_before_add_to_cart_in_the_markup_on_a_variable_product(): void {
		$html   = self::render( array( 'keepAddToCartWithFlow' => true, 'openerBeforeAddToCart' => true ) );
		$form   = strpos( $html, 'data-wp-on--submit="actions.addToCart"' );
		$opener = strpos( $html, 'data-sgs-modal-open="sgs-flow-lens-flow"' );
		$this->assertNotFalse( $form );
		$this->assertTrue( $opener < $form, 'the opener comes first, so keyboard and reading order match what is seen' );
		$this->assertSame( 1, substr_count( $html, 'data-sgs-modal-open="sgs-flow-lens-flow"' ), 'one opener' );
		$this->assertMatchesRegularExpression( '#sgs-buybox__cart-actions--with-flow">\s*<div class="buybox__cart-form buybox__cart-form--modal"[^>]*><button type="button" class="wp-element-button buybox__add-to-cart buybox__add-to-cart--secondary buybox__add-to-cart--flow-opener"[^>]*>.*?</button></div>\s*<form.*</form>\s*</div>#s', $html );
	}

	public function test_opener_first_does_nothing_without_the_keep_setting_and_off_is_byte_identical(): void {
		$this->assertSame( self::render( array() ), self::render( array( 'openerBeforeAddToCart' => true ) ), 'no kept Add to Cart: nothing to order' );
		$this->assertSame( self::render( array( 'keepAddToCartWithFlow' => true ) ), self::render( array( 'keepAddToCartWithFlow' => true, 'openerBeforeAddToCart' => false ) ) );
		$this->assertSame( self::render( array( 'keepAddToCartWithFlow' => true ), true, self::SIMPLE ), self::render( array( 'keepAddToCartWithFlow' => true, 'openerBeforeAddToCart' => false ), true, self::SIMPLE ) );
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

	public function test_off_renders_exactly_as_before_for_a_variable_product(): void {
		$this->assertMatchesSnapshot( 'off-variable-linked', self::render( array() ) );
		$this->assertMatchesSnapshot( 'off-variable-linked-explicit-false', self::render( array( 'keepAddToCartWithFlow' => false ) ) );
		$this->assertMatchesSnapshot( 'off-variable-unlinked', self::render( array(), false ) );
	}

	public function test_a_simple_product_with_the_setting_on_keeps_add_to_cart_and_one_opener(): void {
		$html = self::render( array( 'keepAddToCartWithFlow' => true ), true, self::SIMPLE );
		$this->assertSame( 1, substr_count( $html, 'sgs-buybox__cart-actions--with-flow' ) );
		$this->assertSame( 1, substr_count( $html, 'data-sgs-modal-open="sgs-flow-lens-flow"' ) );
		$this->assertSame( 1, substr_count( $html, 'data-wp-on--submit="actions.addToCart"' ), 'the buy box\'s own Add to Cart' );
	}

	/**
	 * The flow opener's look, before the built-in button kit reads `flowOpener*`: every path that prints the opener, with none of
	 * those attributes set, renders as today. The keep path of a variable product and the empty-string form of an unset
	 * attribute are pinned here; the linked (flow replaces Add to Cart) path of a variable product is pinned by the `off-*`
	 * snapshots above. A simple product prints the same opener markup through the same render.
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
		$this->assertStringNotContainsString( 'flow-opener', $linked_simple, 'the button the flow replaces carries no opener class while nothing is set' );
	}

	/** The opener button's class attribute and the CSS rules (the `<style>` text) in a render. */
	private static function opener_class( string $html ): string {
		preg_match( '#<button type="button" class="([^"]*buybox__add-to-cart--flow-opener[^"]*)"#', $html, $m );
		return $m[1] ?? '';
	}

	private static function css( string $html ): string {
		preg_match_all( '#<style[^>]*>(.*?)</style>#s', $html, $m );
		return implode( '', $m[1] );
	}

	public function test_a_named_opener_preset_drops_the_secondary_modifier_and_prints_that_preset_on_the_openers_selector(): void {
		$html  = self::render( array( 'keepAddToCartWithFlow' => true, 'addToCartStyle' => 'outline', 'flowOpenerStyle' => 'primary' ) );
		$class = self::opener_class( $html );
		$this->assertNotSame( '', $class, 'the opener still prints' );
		$this->assertStringNotContainsString( 'buybox__add-to-cart--secondary', $class, 'the "secondary unless" modifier is gone once the opener names a preset' );
		$this->assertMatchesRegularExpression( '#sgs-btn-kit-[0-9a-f]{8}#', $class, 'the opener carries the preset\'s shared class' );
		preg_match( '#sgs-btn-kit-[0-9a-f]{8}#', $class, $kit );
		$this->assertMatchesRegularExpression( '#\.' . $kit[0] . '\.' . $kit[0] . '\.buybox__add-to-cart\{background:var\(--wp--custom--button-presets--primary--background\)[^}]*\}#', self::css( $html ), 'the primary preset prints as the shared rule on the opener\'s own class' );
		$this->assertStringContainsString( 'buybox__add-to-cart--outline', $html, 'Add to Cart keeps its own preset' );
	}

	public function test_a_colour_set_on_the_opener_prints_on_its_own_selector_after_add_to_carts(): void {
		$html = self::render( array( 'keepAddToCartWithFlow' => true, 'addToCartColourBackground' => 'surface', 'flowOpenerColourBackground' => 'accent' ) );
		$css  = self::css( $html );
		$sel  = '.buybox__add-to-cart:where(.buybox__add-to-cart--flow-opener){';
		$this->assertMatchesRegularExpression( '#\.wp-block-sgs-buybox ' . preg_quote( $sel, '#' ) . '(?:[^}]*;)?background-color:var\(--wp--preset--color--accent,#', $css );
		$this->assertGreaterThan( (int) strrpos( $css, '.buybox__add-to-cart{background-color:var(--wp--preset--color--surface)' ), (int) strrpos( $css, $sel ), 'printed after Add to Cart\'s colour so a tie in weight goes to the opener' );
		$this->assertStringContainsString( 'buybox__add-to-cart--secondary', self::opener_class( $html ), 'no preset named: the secondary modifier stays' );
	}

	public function test_a_simple_products_opener_gets_its_kit_css_on_the_buy_boxs_own_scope(): void {
		foreach ( array( true, false ) as $keep ) {
			$html  = self::render( array( 'keepAddToCartWithFlow' => $keep, 'flowOpenerColourBackground' => 'accent', 'flowOpenerStyle' => 'primary' ), true, self::SIMPLE );
			$label = $keep ? 'keep path' : 'linked path';
			preg_match( '#<button type="button" class="([^"]*)"[^>]*data-sgs-modal-open#', $html, $m );
			$this->assertStringContainsString( 'buybox__add-to-cart--flow-opener', $m[1] ?? '', "$label: the opener class the kit's selector names" );
			$this->assertStringNotContainsString( 'sgs-bb-fo-', $html, "$label: no scope class of its own" );
			$css = self::css( $html );
			$this->assertMatchesRegularExpression( '#\.wp-block-sgs-buybox \.buybox__add-to-cart:where\(\.buybox__add-to-cart--flow-opener\)\{(?:[^}]*;)?background-color:var\(--wp--preset--color--accent,#', $css, "$label: the colour prints on the buy box's own scope" );
			$this->assertMatchesRegularExpression( '#sgs-btn-kit-[0-9a-f]{8}#', $m[1], "$label: the preset's shared class rides on the button" );
			$this->assertStringNotContainsString( 'buybox__add-to-cart--secondary', $m[1], "$label: a named preset drops the secondary modifier" );
			$this->assertStringNotContainsString( ' style="', $html, "$label: no inline style" );
		}
	}

	/** Finding 8: the opener's settings apply to every opener the flow prints, the variable product's Add to Cart included. */
	public function test_the_opener_settings_apply_where_the_flow_replaces_add_to_cart_on_a_variable_product(): void {
		$html = self::render( array( 'flowOpenerColourBackground' => 'accent', 'flowOpenerStyle' => 'primary' ) );
		preg_match( '#<button type="button" class="([^"]*)"[^>]*data-sgs-modal-open#', $html, $m );
		$this->assertStringContainsString( 'buybox__add-to-cart--flow-opener', $m[1] ?? '', 'MUST FAIL: the button that opens the flow carries the opener class when a setting prints' );
		$this->assertMatchesRegularExpression( '#sgs-btn-kit-[0-9a-f]{8}#', $m[1] ?? '', 'and the preset\'s shared class' );
		$css = self::css( $html );
		$this->assertMatchesRegularExpression( '#\.wp-block-sgs-buybox \.buybox__add-to-cart:where\(\.buybox__add-to-cart--flow-opener\)\{(?:[^}]*;)?background-color:var\(--wp--preset--color--accent,#', $css, 'MUST FAIL: the colour prints on that button' );

		// A button with the flow in place of Add to Cart and none of the settings set is the pinned `off-variable-linked` render.
		$this->assertStringNotContainsString( 'buybox__add-to-cart--flow-opener', self::render( array() ), 'no setting, no opener class' );
		// A variable product with no linked flow has no opener at all.
		$unlinked = self::render( array( 'flowOpenerColourBackground' => 'accent' ), false );
		$this->assertStringNotContainsString( 'flow-opener', $unlinked );
		$this->assertStringNotContainsString( 'sgs-btn-kit-', $unlinked );
	}

	/** Nit: a value that prints nothing is not a setting, so it adds no class and no style. */
	public function test_a_value_that_prints_nothing_adds_no_scope_class(): void {
		$baseline = self::render( array( 'keepAddToCartWithFlow' => true ), true, self::SIMPLE );
		foreach ( array( array( 'flowOpenerPadding' => array( 'desktop' => array() ) ), array( 'flowOpenerBorderRadius' => array( 'desktop' => array(), 'tablet' => array() ) ), array( 'flowOpenerStyle' => 'no-such-preset' ), array( 'flowOpenerMinHeight' => array( 'desktop' => '' ) ) ) as $unset ) {
			$html = self::render( array( 'keepAddToCartWithFlow' => true ) + $unset, true, self::SIMPLE );
			$this->assertStringNotContainsString( 'sgs-bb-fo-', $html, json_encode( $unset ) . ' prints nothing' );
			$this->assertSame( $baseline, $html, json_encode( $unset ) . ' leaves the render byte for byte' );
		}
		$fit = self::render( array( 'keepAddToCartWithFlow' => true, 'flowOpenerWidthType' => 'fit' ), true, self::SIMPLE );
		$this->assertStringContainsString( 'width:fit-content', self::css( $fit ), '"Fit to the text" prints, so it does count' );
	}

	public function test_a_simple_product_follows_the_variable_products_precedence_an_explicit_popup_wins(): void {
		$on = self::render( array( 'keepAddToCartWithFlow' => true, 'addToCartAction' => 'modal', 'addToCartModalId' => 'my-popup' ), true, self::SIMPLE );
		$this->assertStringContainsString( 'data-sgs-modal-open="my-popup"', $on, 'the explicit popup wins, as on a variable product' );
		$this->assertStringNotContainsString( 'sgs-buybox__cart-actions', $on );
		$this->assertStringNotContainsString( 'sgs-flow-lens-flow', $on );
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

	public function test_a_simple_product_that_cannot_be_bought_shows_no_working_opener(): void {
		// Not purchasable: no opener and no wrapper at all, the same render as with no flow linked.
		$unbuyable = array_merge( self::SIMPLE, array( 'purchasable' => false ) );
		$html      = self::render( array( 'keepAddToCartWithFlow' => true ), true, $unbuyable );
		$this->assertStringNotContainsString( 'data-sgs-modal-open', $html );
		$this->assertStringNotContainsString( 'sgs-buybox__cart-actions', $html );
		$this->assertSame( self::render( array( 'keepAddToCartWithFlow' => true ), false, $unbuyable ), $html );
		// Out of stock: as on a variable product, the form and the opener are both bound hidden while the seeded stock flag is false.
		$sold_out = self::render( array( 'keepAddToCartWithFlow' => true ), true, array_merge( self::SIMPLE, array( 'in_stock' => false ) ) );
		$this->assertStringContainsString( '"inStock":false', $sold_out );
		$this->assertMatchesRegularExpression( '#<div class="buybox__cart-form buybox__cart-form--modal" data-wp-bind--hidden="!context\.inStock"><button type="button"[^>]*data-sgs-modal-open#', $sold_out );
		$this->assertMatchesRegularExpression( '#<form\s+class="buybox__cart-form"\s+data-wp-bind--hidden="!context\.inStock"#', $sold_out );
	}

	public function test_the_core_fallback_markup_lives_in_one_place(): void {
		$render  = (string) file_get_contents( __DIR__ . '/../../src/blocks/buybox/render.php' );
		$include = (string) file_get_contents( __DIR__ . '/../../includes/buybox-linked-flow.php' );
		$this->assertStringNotContainsString( 'wp:woocommerce/', $render, 'render.php builds its fallback from sgs_buybox_core_fallback_parts()' );
		$this->assertSame( 1, substr_count( $include, 'wp:woocommerce/add-to-cart-with-options' ), 'one copy of the core Add to Cart markup' );
		$this->assertSame( 1, substr_count( $include, 'wp:woocommerce/product-image-gallery' ), 'one copy of the gallery and price markup' );
	}
}
