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
	 * What sgs_cart_empty_product() makes of a product, with the buy box's sources replaced by these fixtures.
	 *
	 * @param array<string, mixed> $traits   Product traits: id, type, purchasable, in_stock, price.
	 * @param array<string, mixed> $fixtures `manifest` (the configurator manifest or null), `groups` (the option groups), `pack` (default pack size or null), `variation` (the default variation's id, purchasable, in_stock, price).
	 * @return array<string, mixed>
	 */
	private function product( array $traits, array $fixtures = array() ): array {
		$root = dirname( __DIR__, 2 );
		$code = ' require ' . var_export( $root . '/includes/flow-fields/functions.php', true ) . '; require ' . var_export( $root . '/includes/configurator-picks/functions.php', true ) . ';'
			. ' class FakeProduct { public function __construct( private array $t ) {}'
			. ' public function get_id() { return $this->t["id"]; } public function get_type() { return $this->t["type"]; }'
			. ' public function is_purchasable() { return $this->t["purchasable"]; } public function is_in_stock() { return $this->t["in_stock"]; }'
			. ' public function get_price() { return $this->t["price"]; } public function get_permalink() { return "/product/" . $this->t["id"] . "/"; } }'
			. ' $traits = ' . var_export( $traits, true ) . '; $fx = ' . var_export( $fixtures, true ) . ';'
			. ' $deps = array( "manifest" => static fn( $id ) => $fx["manifest"] ?? null, "groups" => static fn( $id ) => $fx["groups"] ?? array(), "pack" => static fn( $id, $v, $a, $g ) => $fx["pack"] ?? null,'
			. ' "get_product" => static function ( $id ) use ( $fx ) { $v = $fx["variation"] ?? null; return $v && $id === $v["id"] ? new FakeProduct( array( "id" => $id, "type" => "variation", "purchasable" => $v["purchasable"], "in_stock" => $v["in_stock"], "price" => $v["price"] ) ) : null; } );'
			. ' echo "#JSON#" . json_encode( sgs_cart_empty_product( new FakeProduct( $traits ), $deps ) );';
		return $this->run_php( $code );
	}

	private const SIMPLE = array( 'id' => 12, 'type' => 'simple', 'purchasable' => true, 'in_stock' => true, 'price' => '5.00' );

	private const VARIABLE = array( 'id' => 20, 'type' => 'variable', 'purchasable' => true, 'in_stock' => true, 'price' => '4.00' );

	/**
	 * A manifest whose default combination is pack-of-3 and a buyable variation 21 for it.
	 *
	 * @param array<string, mixed> $over Overrides for the fixtures.
	 * @return array<string, mixed>
	 */
	private function variable_fixtures( array $over = array() ): array {
		return array_merge(
			array(
				'manifest'  => array(
					'defaultKey'  => 'pa_pack:pack-of-3',
					'defaultAxes' => array( 'pa_pack' => 'pack-of-3' ),
					'combos'      => array( 'pa_pack:pack-of-3' => array( 'variationId' => 21, 'inStock' => true ) ),
				),
				'variation' => array( 'id' => 21, 'purchasable' => true, 'in_stock' => true, 'price' => '5.00' ),
			),
			$over
		);
	}

	/**
	 * A pick group (Flavour) the buy box starts with the given option.
	 *
	 * @param string               $start Start-with slug ('' for none).
	 * @param array<string, mixed> $flags Flag overrides.
	 * @return array<int, array<string, mixed>>
	 */
	private function flavour_groups( string $start, array $flags = array() ): array {
		return array(
			array(
				'key'   => 'flavour',
				'label' => 'Flavour',
				'role'  => 'answer',
				'terms' => array( array( 'id' => 1, 'slug' => 'vanilla', 'label' => 'Vanilla' ), array( 'id' => 2, 'slug' => 'mango', 'label' => 'Mango' ) ),
				'flags' => array_merge( array( 'multi' => true, 'least' => 1, 'most' => 3, 'overflow' => 'refuse', 'startWith' => $start, 'share' => 'none' ), $flags ),
			),
		);
	}

	public function test_a_simple_buyable_product_adds_by_its_own_id_through_the_store_api(): void {
		$p = $this->product( self::SIMPLE );
		$this->assertSame( 12, $p['add_id'] );
		$this->assertSame( '5.00', $p['price'] );
		$this->assertSame( '/product/12/', $p['url'] );
		$this->assertNull( $p['body'], 'no variation and no picks: the Store API path' );
	}

	public function test_a_simple_product_out_of_stock_or_not_purchasable_links_to_its_page(): void {
		$this->assertSame( 0, $this->product( array_merge( self::SIMPLE, array( 'in_stock' => false ) ) )['add_id'] );
		$this->assertSame( 0, $this->product( array_merge( self::SIMPLE, array( 'purchasable' => false ) ) )['add_id'] );
	}

	public function test_a_variable_product_adds_the_manifests_default_variation_with_its_axes_and_price(): void {
		$p = $this->product( self::VARIABLE, $this->variable_fixtures() );
		$this->assertSame( 21, $p['add_id'] );
		$this->assertSame( '5.00', $p['price'], 'the default variation price' );
		$this->assertSame(
			array( 'id' => 21, 'quantity' => 1, 'variation' => array( array( 'attribute' => 'pa_pack', 'value' => 'pack-of-3' ) ), 'picks' => array() ),
			$p['body'],
			'the body the buy box would post to the cart proxy'
		);
	}

	public function test_a_variable_product_with_no_default_combination_or_no_buyable_variation_links_to_its_page(): void {
		$this->assertSame( 0, $this->product( self::VARIABLE, array( 'manifest' => null ) )['add_id'] );
		$this->assertSame( 0, $this->product( self::VARIABLE, $this->variable_fixtures( array( 'variation' => array( 'id' => 21, 'purchasable' => true, 'in_stock' => false, 'price' => '5' ) ) ) )['add_id'] );
		$sold_out = $this->variable_fixtures();
		$sold_out['manifest']['combos']['pa_pack:pack-of-3']['inStock'] = false;
		$this->assertSame( 0, $this->product( self::VARIABLE, $sold_out )['add_id'] );
		$this->assertSame( '4.00', $this->product( self::VARIABLE, array( 'manifest' => null ) )['price'], 'the product own price when no variation is chosen' );
	}

	public function test_a_pick_group_with_a_start_with_option_adds_that_pick(): void {
		$p = $this->product( self::VARIABLE, $this->variable_fixtures( array( 'groups' => $this->flavour_groups( 'vanilla' ) ) ) );
		$this->assertSame( 21, $p['add_id'] );
		$this->assertSame( array( 'flavour' => array( array( 'slug' => 'vanilla', 'count' => 0 ) ) ), $p['body']['picks'] );
	}

	public function test_a_pick_group_with_no_start_with_option_has_no_complete_default_and_links_to_the_page(): void {
		$p = $this->product( self::VARIABLE, $this->variable_fixtures( array( 'groups' => $this->flavour_groups( '' ) ) ) );
		$this->assertSame( 0, $p['add_id'] );
		$this->assertNull( $p['body'] );
		$bad = $this->product( self::VARIABLE, $this->variable_fixtures( array( 'groups' => $this->flavour_groups( 'gone' ) ) ) );
		$this->assertSame( 0, $bad['add_id'], 'a start-with option the group no longer has' );
	}

	public function test_a_default_that_the_servers_own_pick_check_refuses_links_to_the_page(): void {
		$needs_two = $this->product( self::VARIABLE, $this->variable_fixtures( array( 'groups' => $this->flavour_groups( 'vanilla', array( 'least' => 2 ) ) ) ) );
		$this->assertSame( 0, $needs_two['add_id'], 'one starting option cannot meet a minimum of two' );
	}

	public function test_a_counted_share_group_puts_the_whole_pack_on_the_starting_option(): void {
		$p = $this->product( self::VARIABLE, $this->variable_fixtures( array( 'groups' => $this->flavour_groups( 'mango', array( 'share' => 'counts' ) ), 'pack' => 3 ) ) );
		$this->assertSame( 21, $p['add_id'] );
		$this->assertSame( array( 'flavour' => array( array( 'slug' => 'mango', 'count' => 3 ) ) ), $p['body']['picks'] );
	}

	public function test_a_simple_product_with_a_pick_group_is_added_through_the_proxy_with_its_picks(): void {
		$p = $this->product( self::SIMPLE, array( 'groups' => $this->flavour_groups( 'vanilla' ) ) );
		$this->assertSame( 12, $p['add_id'] );
		$this->assertSame( array( 'id' => 12, 'quantity' => 1, 'variation' => array(), 'picks' => array( 'flavour' => array( array( 'slug' => 'vanilla', 'count' => 0 ) ) ) ), $p['body'] );
	}

	public function test_any_other_product_type_links_to_its_page(): void {
		$this->assertSame( 0, $this->product( array( 'id' => 30, 'type' => 'grouped', 'purchasable' => true, 'in_stock' => true, 'price' => '' ) )['add_id'] );
		$this->assertSame( 0, $this->product( array( 'id' => 31, 'type' => 'external', 'purchasable' => true, 'in_stock' => true, 'price' => '9' ) )['add_id'] );
	}

	public function test_a_button_for_a_product_with_a_body_carries_it_with_the_proxy_address_and_nonce(): void {
		$body = array( 'id' => 21, 'quantity' => 1, 'variation' => array( array( 'attribute' => 'pa_pack', 'value' => 'pack-of-3' ) ), 'picks' => array() );
		$html = $this->empty_state(
			array(
				'heading'      => 'Empty',
				'shop_url'     => '/shop',
				'link_label'   => '',
				'product'      => array( 'id' => 20, 'add_id' => 21, 'url' => '/p/', 'price_text' => '£5.00', 'body' => $body, 'rest_url' => '/wp-json/sgs/v1/cart/add-item', 'nonce' => 'n9' ),
				'button_label' => 'Add',
			)
		);
		$this->assertStringContainsString( 'data-sgs-cart-empty-add="21"', $html );
		$this->assertStringContainsString( 'data-rest-url="/wp-json/sgs/v1/cart/add-item"', $html );
		$this->assertStringContainsString( 'data-nonce="n9"', $html );
		$this->assertMatchesRegularExpression( '/data-add-body="[^"]*pa_pack[^"]*pack-of-3/', $html );
		$plain = $this->empty_state( array( 'heading' => 'Empty', 'shop_url' => '/shop', 'link_label' => '', 'product' => array( 'id' => 12, 'add_id' => 12, 'url' => '/p/', 'price_text' => '£5', 'body' => null ), 'button_label' => 'Add' ) );
		$this->assertStringNotContainsString( 'data-add-body', $plain );
	}
}
