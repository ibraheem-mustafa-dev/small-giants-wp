<?php
/**
 * Late start for the payment plugin's wallet-button scripts (Spec 27 FR-27-EXPRESS-DEFER): the held set is worked out from
 * `$wp_scripts` (the plugin's folder, js.stripe.com, and every dependant), nothing is held until the buy box arms the
 * switch, inline data of a held handle is held with it, and a script outside the set prints as before.
 *
 * Run with: php vendor/phpunit/phpunit/phpunit --filter ExpressDeferTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

use PHPUnit\Framework\TestCase;

final class ExpressDeferTest extends TestCase {

	private const PLUGIN = 'https://shop.test/wp-content/plugins/woo-stripe-payment/assets/build/';

	/**
	 * Run a PHP snippet against the include with minimal WordPress stubs and return the JSON it prints.
	 *
	 * @param string $code   Snippet body (after the include); it sets `$out`.
	 * @param string $extras Extra stub code placed before the include (for example a cart-page stub).
	 * @return array<string, mixed>
	 */
	private function run_php( string $code, string $extras = '' ): array {
		$root   = dirname( __DIR__, 2 ) . '/';
		$script = tempnam( sys_get_temp_dir(), 'sgsxd' );
		$stubs  = <<<'PHP'
$GLOBALS['sgs_t'] = array( 'filters' => array(), 'registered' => array(), 'enqueued' => array() );
function add_filter( $tag, $fn, $prio = 10, $args = 1 ) { $GLOBALS['sgs_t']['filters'][ $tag ][] = $fn; return true; }
function sgs_t_filter( $tag, ...$args ) { foreach ( $GLOBALS['sgs_t']['filters'][ $tag ] ?? array() as $fn ) { $args[0] = $fn( ...$args ); } return $args[0]; }
function is_admin() { return false; }
function esc_attr( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES ); }
function wp_parse_url( $url, $component = -1 ) { return parse_url( $url, $component ); }
function wp_script_is( $handle, $status = 'enqueued' ) { return 'registered' === $status ? isset( $GLOBALS['sgs_t']['registered'][ $handle ] ) : in_array( $handle, $GLOBALS['sgs_t']['enqueued'], true ); }
function wp_register_script( $handle, $src, $deps = array(), $ver = false, $args = array() ) { $GLOBALS['sgs_t']['registered'][ $handle ] = (object) array( 'src' => $src, 'deps' => $deps ); return true; }
function wp_enqueue_script( $handle ) { $GLOBALS['sgs_t']['enqueued'][] = $handle; }
class WP_Scripts { public $registered = array(); }
function wp_scripts() { static $s = null; if ( ! $s ) { $s = new WP_Scripts(); } $s->registered = $GLOBALS['sgs_t']['registered']; return $s; }
function sgs_t_reg( $handle, $src, $deps = array() ) { $GLOBALS['sgs_t']['registered'][ $handle ] = (object) array( 'src' => $src, 'deps' => $deps ); }
PHP;
		file_put_contents(
			$script,
			"<?php\ndefine( 'ABSPATH', " . var_export( $root, true ) . " );\ndefine( 'SGS_BLOCKS_PATH', ABSPATH );\ndefine( 'SGS_BLOCKS_URL', 'https://shop.test/wp-content/plugins/sgs-blocks/' );\n"
			. $stubs . "\n" . $extras . "\nrequire ABSPATH . 'includes/woocommerce/express-defer.php';\n"
			. "sgs_t_reg( 'jquery', 'https://shop.test/wp-includes/js/jquery/jquery.min.js' );\n"
			. "sgs_t_reg( 'wp-hooks', 'https://shop.test/wp-includes/js/dist/hooks.min.js' );\n"
			. "sgs_t_reg( 'wc-stripe-actions', '" . self::PLUGIN . "actions.js', array( 'wp-hooks' ) );\n"
			. "sgs_t_reg( 'wc-stripe-product', '" . self::PLUGIN . "product.js', array( 'jquery', 'wc-stripe-actions' ) );\n"
			. "sgs_t_reg( 'stripe-v3', 'https://js.stripe.com/v3/' );\n"
			. "sgs_t_reg( 'addon-needs-stripe', 'https://shop.test/wp-content/plugins/other/addon.js', array( 'wc-stripe-product' ) );\n"
			. "sgs_t_reg( 'unrelated', 'https://shop.test/wp-content/plugins/other/unrelated.js', array( 'jquery' ) );\n"
			. "function sgs_t_tag( \$handle, \$src, \$extra = '' ) { return sgs_t_filter( 'script_loader_tag', '<script' . \$extra . ' id=\"' . \$handle . '-js\" src=\"' . \$src . '\"></script>', \$handle, \$src ); }\n"
			. $code . "\necho json_encode( \$out );\n"
		);
		try {
			$raw = (string) shell_exec( escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( $script ) . ' 2>&1' );
		} finally {
			unlink( $script );
		}
		$decoded = json_decode( $raw, true );
		$this->assertIsArray( $decoded, 'the harness printed JSON, got: ' . $raw );
		return $decoded;
	}

	public function test_nothing_is_held_until_the_buy_box_arms_the_switch(): void {
		$out = $this->run_php( '$out = array( "tag" => sgs_t_tag( "wc-stripe-product", "' . self::PLUGIN . 'product.js" ), "inline" => sgs_t_filter( "wp_inline_script_attributes", array( "id" => "wc-stripe-product-js-extra" ), "x=1" ) );' );
		$this->assertStringNotContainsString( 'text/plain', $out['tag'] );
		$this->assertSame( array( 'id' => 'wc-stripe-product-js-extra' ), $out['inline'] );
	}

	public function test_the_plugins_scripts_stripe_and_every_dependant_are_held_and_others_are_not(): void {
		$out = $this->run_php(
			'\SGS\Blocks\sgs_express_defer_armed( true ); $out = array( "held" => array_keys( \SGS\Blocks\sgs_express_defer_held_handles( true ) ) );'
		);
		sort( $out['held'] );
		$this->assertSame( array( 'addon-needs-stripe', 'stripe-v3', 'wc-stripe-actions', 'wc-stripe-product' ), $out['held'], 'plugin folder + js.stripe.com + dependant; jquery, wp-hooks, unrelated stay' );
	}

	public function test_a_held_tag_prints_inert_with_its_real_type_and_an_unheld_tag_prints_as_before(): void {
		$out = $this->run_php(
			'\SGS\Blocks\sgs_express_defer_armed( true ); $out = array(
				"held"      => sgs_t_tag( "wc-stripe-product", "' . self::PLUGIN . 'product.js" ),
				"typed"     => sgs_t_tag( "stripe-v3", "https://js.stripe.com/v3/", " type=\'text/javascript\'" ),
				"module"    => sgs_t_tag( "addon-needs-stripe", "https://shop.test/x.js", " type=\"module\"" ),
				"jquery"    => sgs_t_tag( "jquery", "https://shop.test/jq.js" ),
				"unrelated" => sgs_t_tag( "unrelated", "https://shop.test/u.js" ),
			);'
		);
		$this->assertSame( '<script type="text/plain" data-sgs-defer="text/javascript" id="wc-stripe-product-js" src="' . self::PLUGIN . 'product.js"></script>', $out['held'] );
		$this->assertStringContainsString( 'type="text/plain" data-sgs-defer="text/javascript"', $out['typed'] );
		$this->assertSame( 1, substr_count( $out['typed'], 'type=' ), 'the old type attribute is replaced, not repeated' );
		$this->assertStringNotContainsString( 'text/plain', $out['module'], 'a module tag is never held' );
		$this->assertStringNotContainsString( 'text/plain', $out['jquery'] );
		$this->assertStringNotContainsString( 'text/plain', $out['unrelated'] );
	}

	public function test_inline_data_of_a_held_handle_is_held_in_place_and_other_inline_data_is_not(): void {
		$out = $this->run_php(
			'\SGS\Blocks\sgs_express_defer_armed( true ); $f = function ( $id ) { return sgs_t_filter( "wp_inline_script_attributes", array( "id" => $id ), "x" ); };
			$out = array( "extra" => $f( "wc-stripe-product-js-extra" ), "before" => $f( "wc-stripe-product-js-before" ), "after" => $f( "addon-needs-stripe-js-after" ), "translations" => $f( "wc-stripe-actions-js-translations" ), "jquery" => $f( "jquery-js-extra" ), "free" => sgs_t_filter( "wp_inline_script_attributes", array(), "x" ), "named" => $f( "wcStripeSettings" ) );'
		);
		foreach ( array( 'extra', 'before', 'after', 'translations' ) as $key ) {
			$this->assertSame( 'text/plain', $out[ $key ]['type'], $key );
			$this->assertSame( 'text/javascript', $out[ $key ]['data-sgs-defer'], $key );
		}
		$this->assertArrayNotHasKey( 'type', $out['jquery'], 'a core handle\'s data is never held' );
		$this->assertSame( array(), $out['free'] );
		$this->assertArrayNotHasKey( 'type', $out['named'], 'an inline script that is not a handle\'s is never held' );
	}

	public function test_arming_enqueues_the_loader_and_the_loader_is_not_itself_held(): void {
		$out = $this->run_php( '\SGS\Blocks\sgs_express_defer_armed( true ); $out = array( "enqueued" => $GLOBALS["sgs_t"]["enqueued"], "held" => isset( \SGS\Blocks\sgs_express_defer_held_handles( true )["sgs-express-defer"] ), "tag" => sgs_t_tag( "sgs-express-defer", "https://shop.test/wp-content/plugins/sgs-blocks/assets/js/express-defer.js" ) );' );
		$this->assertSame( array( 'sgs-express-defer' ), $out['enqueued'] );
		$this->assertFalse( $out['held'] );
		$this->assertStringNotContainsString( 'text/plain', $out['tag'] );
	}

	public function test_the_cart_and_checkout_pages_never_arm_it(): void {
		$out = $this->run_php(
			'$out = array( "armed" => \SGS\Blocks\sgs_express_defer_armed( true ), "enqueued" => $GLOBALS["sgs_t"]["enqueued"], "tag" => sgs_t_tag( "wc-stripe-product", "' . self::PLUGIN . 'product.js" ) );',
			'function is_cart() { return true; } function is_checkout() { return false; }'
		);
		$this->assertFalse( $out['armed'] );
		$this->assertSame( array(), $out['enqueued'] );
		$this->assertStringNotContainsString( 'text/plain', $out['tag'] );
	}

	public function test_the_buy_box_arms_it_only_for_the_interaction_setting(): void {
		$root   = dirname( __DIR__, 2 ) . '/';
		$extras = (string) file_get_contents( $root . 'src/blocks/buybox/extras.php' );
		$render = (string) file_get_contents( $root . 'src/blocks/buybox/render.php' );
		$this->assertStringContainsString( "'interaction' === ( \$attributes['expressLoad'] ?? 'page' )", $render, 'render.php passes the setting' );
		$this->assertMatchesRegularExpression( '/if \( \$defer_express && function_exists\( \'SGS\\\\Blocks\\\\sgs_express_defer_armed\' \) \) \{\s*\\\\SGS\\\\Blocks\\\\sgs_express_defer_armed\( true \);/', $extras, 'extras.php arms it only when the buttons print and the setting is on' );
		$json = json_decode( (string) file_get_contents( $root . 'src/blocks/buybox/block.json' ), true );
		$this->assertSame( 'page', $json['attributes']['expressLoad']['default'], 'off by default' );
		$this->assertSame( array( 'page', 'interaction' ), $json['attributes']['expressLoad']['enum'] );
	}
}
