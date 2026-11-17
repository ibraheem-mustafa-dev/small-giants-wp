<?php
/**
 * The mini-cart panel's optional additions (quantity stepper, and the rest listed in each test's docblock) print nothing
 * while they are left at their defaults, and print their markup and scoped CSS when chosen.
 *
 * The panel body and its CSS are pure builders (includes/helpers-cart-panel.php, helpers-cart-panel-css.php), so this runs
 * them in a child process with the shared helpers loaded, as CartBadgeHoverTest does for the badge.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CartPanelOptionsTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CartPanelOptionsTest extends TestCase {

	private const P = '.sgs-cart-x.sgs-cart__panel';

	/**
	 * The panel's scoped CSS (joined) and body markup for these attributes and builder arguments.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param array<string, mixed> $args       Extra arguments for sgs_cart_panel_body_html().
	 * @return array{css: string, body: string}
	 */
	private function panel( array $attributes, array $args = array() ): array {
		$root   = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgspanel' );
		$code   = '<?php define( "ABSPATH", "/" ); error_reporting( E_ERROR | E_PARSE );'
			. ' require ' . var_export( $root . '/scripts/qa/lib/wp-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/scripts/qa/lib/motion-targets-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/includes/render-helpers.php', true ) . ';'
			. ' $attributes = ' . var_export( $attributes, true ) . ';'
			. ' $args = array_merge( array( "uid" => "sgs-cart-x", "panel_id" => "p1", "drawer_id" => "d1", "panel_heading" => "Basket", "empty_cart_message" => "Empty",'
			. ' "empty_cart_cta" => "Shop", "shop_url" => "/shop", "cart_url" => "/cart", "checkout_url" => "/checkout", "view_cart_label" => "View cart",'
			. ' "checkout_label" => "Checkout", "tax_note" => "Tax", "instalments_note" => "", "close_html" => "" ), ' . var_export( $args, true ) . ' );'
			. ' echo json_encode( array( "css" => implode( "\n", sgs_cart_panel_css( $attributes, "sgs-cart-x", true ) ), "body" => sgs_cart_panel_body_html( $args ) ) );';
		file_put_contents( $script, $code );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$decoded = json_decode( substr( $out, (int) strpos( $out, '{"css"' ) ), true );
		$this->assertIsArray( $decoded, 'the child process did not return JSON: ' . $out );
		return $decoded;
	}

	public function test_the_defaults_print_no_stepper_markup_or_css(): void {
		$panel = $this->panel( array() );
		$this->assertStringNotContainsString( 'data-qty-style', $panel['body'] );
		$this->assertStringNotContainsString( 'sgs-cart__item-stepper', $panel['css'] );
		$this->assertStringNotContainsString( '--sgs-cart-qty-height', $panel['css'] );
		// Choosing the number box by name is the default too.
		$this->assertSame( $panel, $this->panel( array( 'itemQtyStyle' => 'input', 'itemQtyBg' => '#abcdef' ), array( 'qty_style' => 'input' ) ), 'a stepper colour does nothing while the style is the number box' );
	}

	public function test_the_stepper_style_marks_the_item_list_for_the_view_script(): void {
		$panel = $this->panel( array(), array( 'qty_style' => 'stepper' ) );
		$this->assertStringContainsString( ' data-qty-style="stepper"', $panel['body'] );
	}

	public function test_the_stepper_prints_its_colours_border_height_and_corners(): void {
		$attrs = array(
			'itemQtyStyle'       => 'stepper',
			'itemQtyBg'          => '#fffaf0',
			'itemQtyColour'      => '#3a2a22',
			'itemQtyBorderColour' => '#d9c7a6',
			'itemQtyBorderWidth' => array( 'desktop' => array( 'top' => '1px', 'right' => '1px', 'bottom' => '1px', 'left' => '1px' ) ),
			'itemQtyBorderStyle' => 'solid',
			'itemQtyRadius'      => '12px',
			'itemQtyHeight'      => array( 'desktop' => '40px', 'mobile' => '36px' ),
			'itemQtyFontSize'    => array( 'desktop' => 15 ),
			'itemQtyFontWeight'  => '700',
		);
		$css = $this->panel( $attrs )['css'];
		$s   = self::P . ' .sgs-cart__item-stepper';
		$this->assertStringContainsString( $s . '{color:#3a2a22', $css );
		$this->assertStringContainsString( $s . '{background-color:#fffaf0', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( $s, '/' ) . '\{[^}]*border-color:#d9c7a6/', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( $s, '/' ) . '\{[^}]*border-width:1px/', $css );
		$this->assertStringContainsString( $s . '{border-radius:12px;}', $css );
		$this->assertStringContainsString( $s . '{--sgs-cart-qty-height:40px;}', $css );
		$this->assertMatchesRegularExpression( '/@media\(max-width:767px\)\{[^}]*--sgs-cart-qty-height:36px/', $css );
		$this->assertStringContainsString( $s . '{font-size:15px;}', $css );
		$this->assertStringContainsString( $s . '{font-weight:700;}', $css );
	}

	public function test_stepper_colours_print_nothing_in_the_number_box_style(): void {
		$css = $this->panel( array( 'itemQtyStyle' => 'input', 'itemQtyColour' => '#111111', 'itemQtyBg' => '#222222' ) )['css'];
		$this->assertStringNotContainsString( '#111111', $css );
		$this->assertStringNotContainsString( '#222222', $css );
	}
}
