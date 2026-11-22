<?php
/**
 * The drawer's extra look settings (F-62): the text Remove link's type, decoration and padding, the stepper number's width,
 * the free-delivery line height, the empty basket's line of text, link and vertical place, the close button's tap area,
 * the gift box's look and placement, and the upsell row. Each prints nothing at its default and its scoped CSS or markup
 * when set.
 *
 * Runs the pure builders (includes/helpers-cart-panel-css.php, helpers-cart-panel-extras.php) in a child process with the
 * shared helpers loaded, as CartPanelOptionsTest does.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CartDrawerLookTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CartDrawerLookTest extends TestCase {

	private const P = '.sgs-cart-x.sgs-cart__panel';

	/**
	 * A box value with the same length on every side.
	 *
	 * @param string $v CSS length.
	 * @return array<string, string>
	 */
	private static function box( string $v ): array {
		return array_fill_keys( array( 'top', 'right', 'bottom', 'left' ), $v );
	}

	/**
	 * Run PHP after the shared helpers load and return what it echoes.
	 *
	 * @param string $php The code to run.
	 */
	private function run_php( string $php ): string {
		$root   = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgslook' );
		$code   = '<?php define( "ABSPATH", "/" ); error_reporting( E_ERROR | E_PARSE );'
			. ' require ' . var_export( $root . '/scripts/qa/lib/wp-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/scripts/qa/lib/motion-targets-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/includes/render-helpers.php', true ) . ';'
			. ' require_once ' . var_export( $root . '/includes/helpers-cart-panel-extras.php', true ) . ';'
			. $php;
		file_put_contents( $script, $code );
		try {
			return (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
	}

	/**
	 * The panel's scoped CSS for these attributes.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 */
	private function css( array $attributes ): string {
		return $this->run_php( ' echo implode( "\n", sgs_cart_panel_css( ' . var_export( $attributes, true ) . ', "sgs-cart-x", true ) );' );
	}

	public function test_the_defaults_print_none_of_the_new_looks(): void {
		$css = $this->css( array() );
		foreach ( array( 'sgs-cart__item-remove--text', 'sgs-cart__item-qty-input', 'sgs-cart__panel-empty-body', 'sgs-cart__panel-empty-link', 'sgs-cart__panel-gift', 'sgs-cart__panel-upsell', 'margin-top:auto', 'sgs-cart__panel-close' ) as $needle ) {
			$this->assertStringNotContainsString( $needle, $css, $needle . ' prints nothing at its default' );
		}
	}

	public function test_the_remove_link_takes_type_decoration_and_padding(): void {
		$css = $this->css(
			array(
				'itemRemoveFontSize'       => array( 'desktop' => 14 ),
				'itemRemoveLineHeight'     => array( 'desktop' => '17px' ),
				'itemRemoveLineHeightUnit' => 'px',
				'itemRemoveTextDecoration' => 'underline',
				'itemRemovePadding'        => array( 'desktop' => self::box( '10px' ) ),
			)
		);
		$s   = self::P . ' .sgs-cart__item-remove--text';
		$this->assertMatchesRegularExpression( '/' . preg_quote( $s, '/' ) . '\{[^}]*font-size:14px/', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( $s, '/' ) . '\{[^}]*line-height:17px/', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( $s, '/' ) . '\{[^}]*text-decoration:underline/', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( $s, '/' ) . '\{[^}]*padding[^}]*10px/', $css );
		$this->assertStringContainsString( self::P . ' .sgs-cart__item-remove.sgs-cart__item-remove--text{border-bottom-width:0;}', $css, 'the decoration replaces the drawn line' );
	}

	public function test_stepper_number_width_free_delivery_line_height_and_close_tap_area(): void {
		$css = $this->css(
			array(
				'itemQtyNumberWidth'         => array( 'desktop' => '22px' ),
				'freeDeliveryTextLineHeight' => array( 'desktop' => 1.2 ),
				'panelCloseTapSize'          => array( 'desktop' => '48px' ),
			)
		);
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::P . ' .sgs-cart__item-stepper .sgs-cart__item-qty-input', '/' ) . '\{[^}]*width:22px[^}]*min-width:22px/', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::P . ' .sgs-cart__free-delivery-text', '/' ) . '\{[^}]*line-height:1.2/', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::P . ' .sgs-cart__panel-close', '/' ) . '\{[^}]*min-width:48px[^}]*min-height:48px/', $css );
	}

	/**
	 * MUST FAIL: the stepper's weight reaches its number. style.css paints the number bold itself (font-weight: 700 after
	 * font: inherit), so the weight printed on the stepper alone reached only the minus and plus buttons.
	 */
	public function test_the_stepper_weight_reaches_its_number(): void {
		$css = $this->css( array( 'itemQtyFontWeight' => '400' ) );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::P . ' .sgs-cart__item-stepper .sgs-cart__item-qty-input', '/' ) . '\{[^}]*font-weight:400/', $css, 'the number takes the stepper weight' );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::P . ' .sgs-cart__item-stepper', '/' ) . '\{[^}]*font-weight:400/', $css, 'negative control: the stepper (its buttons) keeps the weight' );
		$this->assertStringNotContainsString( 'sgs-cart__item-qty-input{font-weight', $this->css( array() ), 'negative control: no weight set prints no rule, so the number stays bold' );
		$this->assertStringNotContainsString( 'font-weight:4;', $this->css( array( 'itemQtyFontWeight' => '400;color:red' ) ), 'an unsafe value prints nothing' );
		$this->assertStringNotContainsString( 'color:red', $this->css( array( 'itemQtyFontWeight' => '400;color:red' ) ), 'an unsafe value prints nothing' );
	}

	public function test_the_empty_basket_text_link_and_centring(): void {
		$css = $this->css(
			array(
				'panelEmptyPlacement' => 'center',
				'emptyBodyFontSize'       => array( 'desktop' => 16 ),
				'emptyBodyColour'         => '#5e4a3d',
				'emptyBodyMaxWidth'       => array( 'desktop' => '300px' ),
				'emptyLinkFontWeight'     => '700',
				'emptyLinkPadding'        => array( 'desktop' => self::box( '10px' ) ),
			)
		);
		$this->assertStringContainsString( self::P . ' .sgs-cart__panel-empty{margin-top:auto;margin-bottom:auto;}', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::P . ' .sgs-cart__panel-empty-body', '/' ) . '\{[^}]*font-size:16px/', $css );
		$this->assertStringContainsString( self::P . ' .sgs-cart__panel-empty-body{color:#5e4a3d;}', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::P . ' .sgs-cart__panel-empty-body', '/' ) . '\{[^}]*max-width:300px/', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::P . ' .sgs-cart__panel-empty-link', '/' ) . '\{[^}]*font-weight:700/', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::P . ' .sgs-cart__panel-empty-link', '/' ) . '\{[^}]*padding[^}]*10px/', $css );
	}

	public function test_the_gift_box_and_fields_take_their_look(): void {
		$css = $this->css(
			array(
				'giftBoxBg'             => '#fffaf0',
				'giftBoxBorderWidth'    => array( 'desktop' => self::box( '1.5px' ) ),
				'giftBoxBorderStyle'    => 'dashed',
				'giftBoxBorderColour'   => '#e3afaf',
				'giftBoxRadius'         => '18px',
				'giftLabelFontWeight'   => '700',
				'giftHelpColour'        => '#6b5646',
				'giftFieldBg'           => '#ffffff',
				'giftFieldRadius'       => '12px',
				'giftMessageFontSize'   => array( 'desktop' => 22 ),
				'giftMessageFontFamily' => 'caveat',
			)
		);
		$box = self::P . ' .sgs-cart__panel-gift';
		$this->assertStringContainsString( $box . '{background-color:#fffaf0;}', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( $box, '/' ) . '\{[^}]*border[^}]*dashed/', $css );
		$this->assertStringContainsString( $box . '{border-radius:18px;}', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::P . ' .sgs-cart__panel-gift-label', '/' ) . '\{[^}]*font-weight:700/', $css );
		$this->assertStringContainsString( self::P . ' .sgs-cart__panel-gift-help{color:#6b5646;opacity:1;}', $css );
		$this->assertStringContainsString( self::P . ' .sgs-cart__panel-gift-to,' . self::P . ' .sgs-cart__panel-gift-message{background-color:#ffffff;}', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::P . ' .sgs-cart__panel-gift-message', '/' ) . '\{[^}]*font-size:22px/', $css );
	}

	public function test_the_upsell_row_takes_its_look_and_hover(): void {
		$css = $this->css(
			array(
				'upsellBg'                => '#fcebbe',
				'upsellRadius'            => '18px',
				'upsellImageSize'         => array( 'desktop' => '56px' ),
				'upsellTitleFontSize'     => array( 'desktop' => 15 ),
				'upsellButtonBgHover'     => '#3a2a22',
				'upsellButtonColourHover' => '#fffaf0',
				'upsellButtonRadius'      => '999px',
			)
		);
		$this->assertStringContainsString( self::P . ' .sgs-cart__panel-upsell{background-color:#fcebbe;}', $css );
		$this->assertStringContainsString( self::P . ' .sgs-cart__panel-upsell{border-radius:18px;}', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::P . ' .sgs-cart__panel-upsell-image', '/' ) . '\{[^}]*width:56px[^}]*height:56px/', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::P . ' .sgs-cart__panel-upsell-title', '/' ) . '\{[^}]*font-size:15px/', $css );
		$this->assertMatchesRegularExpression( '/' . preg_quote( self::P . ' .sgs-cart__panel-upsell-add', '/' ) . ':hover[^{]*\{[^}]*background-color:#3a2a22/', $css );
		$this->assertStringContainsString( self::P . ' .sgs-cart__panel-upsell-add{border-radius:999px;}', $css );
	}

	public function test_the_gift_box_placement_marks_the_box_for_the_list(): void {
		$footer = $this->run_php( ' echo sgs_cart_gift_box_html( array( "id" => "p1", "label" => "Gift" ) );' );
		$after  = $this->run_php( ' echo sgs_cart_gift_box_html( array( "id" => "p1", "label" => "Gift", "placement" => "after-items" ) );' );
		$this->assertStringNotContainsString( 'data-sgs-cart-after-rows', $footer, 'the default stays above the footer' );
		$this->assertStringContainsString( 'class="sgs-cart__panel-gift sgs-cart__panel-gift--after-items" data-sgs-cart-gift data-sgs-cart-after-rows', $after );
	}

	public function test_the_upsell_row_markup(): void {
		$product = array(
			'id'         => 30,
			'add_id'     => 30,
			'url'        => '/p/trio',
			'price'      => '5',
			'body'       => null,
			'price_text' => '£5.00',
			'name'       => 'Taster Trio',
		);
		$html    = $this->run_php( ' echo sgs_cart_upsell_html( array( "product" => ' . var_export( $product, true ) . ', "text" => "3 Classic Zookies · {price}", "image_html" => "" ) );' );
		$this->assertStringContainsString( '<div class="sgs-cart__panel-upsell" data-sgs-cart-upsell="30" data-sgs-cart-after-rows hidden>', $html );
		$this->assertStringContainsString( '<p class="sgs-cart__panel-upsell-title">Taster Trio</p>', $html, 'an empty heading uses the product name' );
		$this->assertStringContainsString( '<p class="sgs-cart__panel-upsell-body">3 Classic Zookies · £5.00</p>', $html );
		$this->assertStringContainsString( '<button type="button" class="sgs-cart__panel-upsell-add" data-sgs-cart-empty-add="30">Add</button>', $html );

		$product['add_id'] = 0;
		$link              = $this->run_php( ' echo sgs_cart_upsell_html( array( "product" => ' . var_export( $product, true ) . ', "button_label" => "Add for {price}" ) );' );
		$this->assertStringContainsString( '<a class="sgs-cart__panel-upsell-add" href="/p/trio">Add for £5.00</a>', $link, 'no one-tap add: a link to the product' );
		$this->assertSame( '', trim( $this->run_php( ' echo sgs_cart_upsell_html( array( "product" => null ) );' ) ), 'no product: no row' );
	}
}
