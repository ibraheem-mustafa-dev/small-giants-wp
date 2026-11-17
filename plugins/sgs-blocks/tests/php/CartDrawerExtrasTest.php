<?php
/**
 * The mini-cart drawer's two optional additions: the gift box and the empty state (picture, body line, one-tap product button, text link).
 *
 * Both are pure builders (includes/helpers-cart-panel-extras.php) reached through sgs_cart_panel_body_html(), so this runs them in a
 * child process with the shared helpers loaded, as CartPanelOptionsTest does. Nothing here prints at the defaults.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter CartDrawerExtrasTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class CartDrawerExtrasTest extends TestCase {

	/**
	 * Run PHP in a child process with the cart helpers loaded and return its JSON.
	 *
	 * @param string $body PHP statements ending in `echo json_encode( ... );`.
	 * @return mixed
	 */
	private function run_php( string $body ) {
		$root   = dirname( __DIR__, 2 );
		$script = tempnam( sys_get_temp_dir(), 'sgsextras' );
		$code   = '<?php define( "ABSPATH", "/" ); error_reporting( E_ERROR | E_PARSE );'
			. ' require ' . var_export( $root . '/scripts/qa/lib/wp-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/scripts/qa/lib/motion-targets-stubs.php', true ) . ';'
			. ' require ' . var_export( $root . '/includes/render-helpers.php', true ) . ';'
			. ' ' . $body;
		file_put_contents( $script, $code );
		try {
			$out = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			@unlink( $script ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged -- temp file.
		}
		$start   = (int) strpos( $out, '#JSON#' );
		$decoded = json_decode( substr( $out, $start + 6 ), true );
		$this->assertNotNull( $decoded, 'the child process did not return JSON: ' . $out );
		return $decoded;
	}

	/**
	 * The panel body markup for these builder arguments.
	 *
	 * @param array<string, mixed> $args Extra arguments for sgs_cart_panel_body_html().
	 */
	private function body( array $args = array() ): string {
		return $this->run_php(
			'$args = array_merge( array( "uid" => "sgs-cart-x", "panel_id" => "p1", "drawer_id" => "d1", "panel_heading" => "Basket", "empty_cart_message" => "Empty",'
			. ' "empty_cart_cta" => "Shop", "shop_url" => "/shop", "cart_url" => "/cart", "checkout_url" => "/checkout", "view_cart_label" => "View cart",'
			. ' "checkout_label" => "Checkout", "tax_note" => "Tax", "instalments_note" => "", "close_html" => "" ), ' . var_export( $args, true ) . ' );'
			. ' echo "#JSON#" . json_encode( sgs_cart_panel_body_html( $args ) );'
		);
	}

	/**
	 * The empty state for these arguments.
	 *
	 * @param array<string, mixed> $args Arguments for sgs_cart_empty_state_html().
	 */
	private function empty_state( array $args ): string {
		return $this->run_php( 'echo "#JSON#" . json_encode( sgs_cart_empty_state_html( ' . var_export( $args, true ) . ' ) );' );
	}

	public function test_the_defaults_print_no_gift_box_and_no_empty_state_template(): void {
		$body = $this->body();
		$this->assertStringNotContainsString( 'data-sgs-cart-gift', $body );
		$this->assertStringNotContainsString( 'data-sgs-cart-empty-template', $body );
		$this->assertStringNotContainsString( '<template', $body );
	}

	public function test_the_gift_box_is_a_real_checkbox_with_a_label_and_starts_hidden(): void {
		$body = $this->body(
			array(
				'gift_html' => $this->run_php(
					'echo "#JSON#" . json_encode( sgs_cart_gift_box_html( array( "id" => "p1", "label" => "This is a gift", "help" => "We leave the price off.", "to_label" => "Who is it for?",'
					. ' "message_label" => "Gift note", "rest_url" => "/wp-json/sgs/v1/cart/gift", "nonce" => "abc123", "to_max" => 100, "message_max" => 500 ) ) );'
				),
			)
		);
		$this->assertStringContainsString( 'data-sgs-cart-gift', $body );
		$this->assertMatchesRegularExpression( '/<input id="p1-gift" class="sgs-cart__panel-gift-checkbox" type="checkbox"/', $body );
		$this->assertMatchesRegularExpression( '/<label class="sgs-cart__panel-gift-switch" for="p1-gift">/', $body );
		$this->assertStringContainsString( 'This is a gift', $body );
		$this->assertStringContainsString( 'We leave the price off.', $body );
		$this->assertMatchesRegularExpression( '/<label[^>]*for="p1-gift-to"[^>]*>Who is it for\?<\/label>/', $body );
		$this->assertMatchesRegularExpression( '/<label[^>]*for="p1-gift-message"[^>]*>Gift note<\/label>/', $body );
		$this->assertStringContainsString( 'maxlength="100"', $body );
		$this->assertStringContainsString( 'maxlength="500"', $body );
		$this->assertStringContainsString( 'data-rest-url="/wp-json/sgs/v1/cart/gift"', $body );
		$this->assertStringContainsString( 'data-nonce="abc123"', $body );
		$this->assertMatchesRegularExpression( '/<div class="sgs-cart__panel-gift" data-sgs-cart-gift[^>]* hidden>/', $body, 'hidden until the cart has an item' );
		$this->assertMatchesRegularExpression( '/<div class="sgs-cart__panel-gift-fields" hidden>/', $body, 'the name and note appear once the box is ticked' );
		$this->assertDoesNotMatchRegularExpression( '/\sstyle=/', $body, 'no inline style declarations' );
		$this->assertLessThan( strpos( $body, 'data-sgs-cart-footer' ), strpos( $body, 'data-sgs-cart-gift' ), 'the gift box sits above the footer' );
	}

	public function test_a_gift_box_with_no_help_prints_no_help_line_and_escapes_its_words(): void {
		$html = $this->run_php(
			'echo "#JSON#" . json_encode( sgs_cart_gift_box_html( array( "id" => "p1", "label" => "<b>Gift</b> \" onclick=\"x", "help" => "", "to_label" => "To", "message_label" => "Note",'
			. ' "rest_url" => "/r", "nonce" => "n", "to_max" => 10, "message_max" => 20 ) ) );'
		);
		$this->assertStringNotContainsString( 'sgs-cart__panel-gift-help', $html );
		$this->assertStringNotContainsString( '<b>', $html );
		$this->assertStringNotContainsString( 'onclick="x', $html );
	}

	public function test_nothing_set_gives_no_empty_state(): void {
		$this->assertSame( '', $this->empty_state( array( 'heading' => 'Empty', 'shop_url' => '/shop', 'link_label' => 'Shop' ) ) );
	}

	public function test_a_body_line_alone_turns_the_rich_empty_state_on_with_an_h3_heading_and_a_text_link(): void {
		$html = $this->empty_state(
			array(
				'heading'    => 'Your basket is empty',
				'body'       => 'New here? Start with a taster.',
				'shop_url'   => '/shop',
				'link_label' => 'Browse the shop',
			)
		);
		$this->assertStringContainsString( '<div class="sgs-cart__panel-empty sgs-cart__panel-empty--rich">', $html );
		$this->assertStringContainsString( '<h3 class="sgs-cart__panel-empty-message">Your basket is empty</h3>', $html );
		$this->assertStringContainsString( '<p class="sgs-cart__panel-empty-body">New here? Start with a taster.</p>', $html );
		$this->assertStringContainsString( '<a class="sgs-cart__panel-empty-link" href="/shop">Browse the shop</a>', $html );
		$this->assertStringNotContainsString( 'sgs-cart__panel-empty-add', $html );
		$this->assertStringNotContainsString( 'style=', $html );
	}

	public function test_a_blank_link_label_prints_no_link_and_a_set_url_replaces_the_shop_address(): void {
		$none = $this->empty_state( array( 'heading' => 'Empty', 'body' => 'x', 'shop_url' => '/shop', 'link_label' => '' ) );
		$this->assertStringNotContainsString( 'sgs-cart__panel-empty-link', $none );
		$set = $this->empty_state( array( 'heading' => 'Empty', 'body' => 'x', 'shop_url' => '/shop', 'link_label' => 'Browse', 'link_url' => '/cookies/' ) );
		$this->assertStringContainsString( 'href="/cookies/"', $set );
		$this->assertStringNotContainsString( 'href="/shop"', $set );
	}

	public function test_the_picture_prints_above_the_heading(): void {
		$html = $this->empty_state( array( 'heading' => 'Empty', 'image_html' => '<img src="/logo.png" alt="">', 'shop_url' => '/shop', 'link_label' => '' ) );
		$this->assertStringContainsString( '<div class="sgs-cart__panel-empty-media"><img src="/logo.png" alt=""></div>', $html );
		$this->assertLessThan( strpos( $html, 'sgs-cart__panel-empty-message' ), strpos( $html, 'sgs-cart__panel-empty-media' ) );
	}

	public function test_a_purchasable_product_gives_a_button_that_adds_it_with_the_price_filled_in(): void {
		$html = $this->empty_state(
			array(
				'heading'      => 'Empty',
				'shop_url'     => '/shop',
				'link_label'   => '',
				'product'      => array( 'id' => 12, 'add_id' => 12, 'url' => '/product/trio/', 'price_text' => '£5.00' ),
				'button_label' => 'Add a Taster Trio · {price}',
			)
		);
		$this->assertMatchesRegularExpression( '/<button type="button" class="sgs-cart__panel-empty-cta sgs-cart__panel-empty-add" data-sgs-cart-empty-add="12">Add a Taster Trio · £5\.00<\/button>/', $html );
		$this->assertStringNotContainsString( 'href="/product/trio/"', $html );
	}

	public function test_a_product_that_cannot_be_added_in_one_tap_gives_a_link_to_its_page(): void {
		$html = $this->empty_state(
			array(
				'heading'      => 'Empty',
				'shop_url'     => '/shop',
				'link_label'   => '',
				'product'      => array( 'id' => 12, 'add_id' => 0, 'url' => '/product/trio/', 'price_text' => '£5.00' ),
				'button_label' => 'Add · {price}',
			)
		);
		$this->assertStringContainsString( '<a class="sgs-cart__panel-empty-cta sgs-cart__panel-empty-add" href="/product/trio/">Add · £5.00</a>', $html );
		$this->assertStringNotContainsString( '<button', $html );
	}

	public function test_a_blank_button_label_falls_back_to_a_plain_one_and_the_label_is_escaped(): void {
		$html = $this->empty_state(
			array(
				'heading'      => 'Empty',
				'shop_url'     => '/shop',
				'link_label'   => '',
				'product'      => array( 'id' => 12, 'add_id' => 12, 'url' => '/p/', 'price_text' => '£5.00' ),
				'button_label' => '',
			)
		);
		$this->assertStringContainsString( '>Add to basket</button>', $html );
		$bad = $this->empty_state(
			array(
				'heading'      => 'Empty',
				'shop_url'     => '/shop',
				'link_label'   => '',
				'product'      => array( 'id' => 12, 'add_id' => 12, 'url' => '/p/', 'price_text' => '£5.00' ),
				'button_label' => '<script>x()</script>{price}',
			)
		);
		$this->assertStringNotContainsString( '<script>', $bad );
	}

	public function test_the_empty_state_goes_in_a_template_the_view_script_copies_when_the_basket_is_empty(): void {
		$body = $this->body( array( 'empty_state_html' => '<div class="sgs-cart__panel-empty sgs-cart__panel-empty--rich"></div>' ) );
		$this->assertStringContainsString( '<template data-sgs-cart-empty-template><div class="sgs-cart__panel-empty sgs-cart__panel-empty--rich"></div></template>', $body );
	}

	/**
	 * What sgs_cart_empty_product() makes of a product with these traits.
	 *
	 * @param array<string, mixed> $traits Product traits (type, purchasable, in_stock, price, defaults, variation_attributes) and the matching variation (id, purchasable, in_stock, price) or null.
	 * @return array<string, mixed>
	 */
	private function product( array $traits, ?array $variation ): array {
		$code = 'class FakeProduct { public function __construct( private array $t ) {}'
			. ' public function get_id() { return $this->t["id"]; } public function get_type() { return $this->t["type"]; }'
			. ' public function is_purchasable() { return $this->t["purchasable"]; } public function is_in_stock() { return $this->t["in_stock"]; }'
			. ' public function get_price() { return $this->t["price"]; } public function get_permalink() { return "/product/" . $this->t["id"] . "/"; }'
			. ' public function get_default_attributes() { return $this->t["defaults"] ?? array(); }'
			. ' public function get_variation_attributes() { return $this->t["variation_attributes"] ?? array(); } }'
			. ' $traits = ' . var_export( $traits, true ) . '; $variation = ' . var_export( $variation, true ) . ';'
			. ' $find = static function ( $product, array $attributes ) use ( $variation ) { $GLOBALS["asked"] = $attributes; return $variation ? $variation["id"] : 0; };'
			. ' $get = static function ( int $id ) use ( $variation ) { return $variation && $id === $variation["id"] ? new FakeProduct( array( "id" => $id, "type" => "variation", "purchasable" => $variation["purchasable"], "in_stock" => $variation["in_stock"], "price" => $variation["price"] ) ) : null; };'
			. ' $out = sgs_cart_empty_product( new FakeProduct( $traits ), $find, $get ); $out["asked"] = $GLOBALS["asked"] ?? null; echo "#JSON#" . json_encode( $out );';
		return $this->run_php( $code );
	}

	public function test_a_simple_purchasable_in_stock_product_adds_by_its_own_id(): void {
		$p = $this->product( array( 'id' => 12, 'type' => 'simple', 'purchasable' => true, 'in_stock' => true, 'price' => '5.00' ), null );
		$this->assertSame( 12, $p['add_id'] );
		$this->assertSame( '5.00', $p['price'] );
		$this->assertSame( '/product/12/', $p['url'] );
	}

	public function test_a_simple_product_out_of_stock_or_not_purchasable_links_to_its_page(): void {
		$this->assertSame( 0, $this->product( array( 'id' => 12, 'type' => 'simple', 'purchasable' => true, 'in_stock' => false, 'price' => '5' ), null )['add_id'] );
		$this->assertSame( 0, $this->product( array( 'id' => 12, 'type' => 'simple', 'purchasable' => false, 'in_stock' => true, 'price' => '5' ), null )['add_id'] );
	}

	public function test_a_variable_product_whose_default_options_resolve_adds_that_variation(): void {
		$p = $this->product(
			array( 'id' => 20, 'type' => 'variable', 'purchasable' => true, 'in_stock' => true, 'price' => '4.00', 'defaults' => array( 'size' => 'small', 'pa_flavour' => 'oat' ), 'variation_attributes' => array( 'Size' => array( 'small', 'large' ), 'pa_flavour' => array( 'oat', 'fruit' ) ) ),
			array( 'id' => 21, 'purchasable' => true, 'in_stock' => true, 'price' => '5.00' )
		);
		$this->assertSame( 21, $p['add_id'] );
		$this->assertSame( '5.00', $p['price'], 'the price is the chosen variation\'s' );
		$this->assertSame( array( 'attribute_size' => 'small', 'attribute_pa_flavour' => 'oat' ), $p['asked'] );
	}

	public function test_a_variable_product_with_no_complete_defaults_or_no_buyable_match_links_to_its_page(): void {
		$base = array( 'id' => 20, 'type' => 'variable', 'purchasable' => true, 'in_stock' => true, 'price' => '4.00', 'variation_attributes' => array( 'size' => array( 'small', 'large' ) ) );
		$none = $this->product( $base + array( 'defaults' => array() ), array( 'id' => 21, 'purchasable' => true, 'in_stock' => true, 'price' => '5' ) );
		$this->assertSame( 0, $none['add_id'] );
		$this->assertSame( '4.00', $none['price'], 'the product\'s own price when no variation is chosen' );
		$this->assertSame( 0, $this->product( $base + array( 'defaults' => array( 'size' => 'small' ) ), null )['add_id'] );
		$this->assertSame( 0, $this->product( $base + array( 'defaults' => array( 'size' => 'small' ) ), array( 'id' => 21, 'purchasable' => true, 'in_stock' => false, 'price' => '5' ) )['add_id'] );
	}

	public function test_any_other_product_type_links_to_its_page(): void {
		$this->assertSame( 0, $this->product( array( 'id' => 30, 'type' => 'grouped', 'purchasable' => true, 'in_stock' => true, 'price' => '' ), null )['add_id'] );
		$this->assertSame( 0, $this->product( array( 'id' => 31, 'type' => 'external', 'purchasable' => true, 'in_stock' => true, 'price' => '9' ), null )['add_id'] );
	}
}
