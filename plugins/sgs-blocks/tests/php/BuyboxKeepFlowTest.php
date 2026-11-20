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

	/** Render the standard fixture with product 52 linked to a flow. */
	private static function render( array $attr_overrides, bool $linked = true ): string {
		$fixture = json_decode( (string) file_get_contents( self::DIR . '/standard.json' ), true, 512, JSON_THROW_ON_ERROR );
		$fixture['attrs'] = array_merge( $fixture['attrs'], $attr_overrides );
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
}
