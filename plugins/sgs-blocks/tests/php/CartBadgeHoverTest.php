<?php
/**
 * The cart badge's text hover colour shows while the cart button is hovered or focused: the badge itself has
 * pointer-events:none (style.css), so a rule on `.sgs-cart__badge:hover` never applies for a visitor.
 *
 * The cart render needs WooCommerce, which the block harness lacks, so this runs the cart's scoped-CSS partial
 * (src/blocks/cart/render-scoped-css.php) in a child process with the shared helpers loaded.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CartBadgeHoverTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CartBadgeHoverTest extends TestCase {

	/**
	 * The scoped CSS the cart partial builds for these attributes, the block scoped to `.sgs-cart-x`.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 */
	private function cart_css( array $attributes ): string {
		$root   = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgscart' );
		$code   = '<?php define( "ABSPATH", "/" ); error_reporting( E_ERROR | E_PARSE );'
			. ' require ' . var_export( $root . '/scripts/qa/lib/wp-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/scripts/qa/lib/motion-targets-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/includes/render-helpers.php', true ) . ';'
			. ' $attributes = ' . var_export( $attributes, true ) . ';'
			. ' $sel = ".sgs-cart-x"; $uid = "sgs-cart-x"; $has_panel = false; $badge_colour = ""; $badge_text_colour = ""; $scoped_css = array();'
			. ' require ' . var_export( $root . '/src/blocks/cart/render-scoped-css.php', true ) . ';'
			. ' echo implode( "\n", array_filter( $scoped_css ) );';
		file_put_contents( $script, $code );
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
	}

	public function test_badge_text_hover_paints_while_the_trigger_is_hovered(): void {
		$css = $this->cart_css( array( 'badgeTextColourHover' => '#13579b' ) );
		$this->assertMatchesRegularExpression( '/\.sgs-cart-x \.sgs-cart__trigger:hover \.sgs-cart__badge\{color:#13579b\}/', $css, 'the hover rule hangs on the trigger' );
		$this->assertMatchesRegularExpression( '/\.sgs-cart-x \.sgs-cart__trigger:focus-visible \.sgs-cart__badge\{color:#13579b\}/', $css, 'and on its keyboard focus' );
		$this->assertStringNotContainsString( '.sgs-cart__badge:hover', $css, 'never on the badge itself, which takes no pointer events' );
	}

	public function test_no_badge_hover_colour_prints_no_hover_rule(): void {
		$css = $this->cart_css( array() );
		$this->assertStringNotContainsString( '.sgs-cart__trigger:hover .sgs-cart__badge', $css, 'control: nothing set, nothing printed' );
	}
}
