<?php
/**
 * Standalone test: POST /sgs/v1/wishlist-cards, the saved-items panel's product cards.
 *
 * Exercises the REAL `Wishlist_Cards_Rest` and `Card_Grid_Template` (required directly) against fake WordPress
 * functions. Covers:
 *   - the route's registration (public by design, the three required arguments, the ids cap);
 *   - `validate_ids` refusing more than MAX_IDS and non-numeric values; `normalise_ids` dropping duplicates and zeros,
 *     keeping order and capping;
 *   - the signature: a signed template verifies, a changed template or signature does not;
 *   - `handle`: a draft, a private, a hidden and a password-protected product are never rendered, an unknown ID is
 *     skipped, the answer keeps the order asked, each card is rendered through `render_block` as `sgs/product-card`
 *     with the template's settings, the product's ID and the settings the panel owns (heart off) over them;
 *   - a bad signature is refused with 403 and renders nothing;
 *   - the panel registers with `skip_inner_blocks`.
 *
 * NEGATIVE CONTROL: a copy of the class with the published-status guard removed from `is_listable()` runs in a child
 * process; the "a draft is never rendered" assertion must go red there, and the parent fails if it does not.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-wishlist-cards-standalone.php
 * Exit 0 all pass, 1 any failure.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ . '/' );

$GLOBALS['routes']   = array();
$GLOBALS['filters']  = array();
$GLOBALS['rendered'] = array();

function add_action( $hook, $cb ) {}
function add_filter( $hook, $cb ) { $GLOBALS['filters'][ $hook ][] = $cb; }
function register_rest_route( $ns, $route, $args ) { $GLOBALS['routes'][ $ns . $route ] = $args; }
function __( $t ) { return $t; }
function absint( $v ) { return abs( (int) $v ); }
function wp_json_encode( $v ) { return json_encode( $v ); }
function wp_salt( $s = 'auth' ) { return 'test-salt-' . $s; }
function sanitize_text_field( $v ) { return trim( (string) $v ); }
function get_post_status( $id ) { return $GLOBALS['posts'][ (int) $id ]['status'] ?? false; }
function get_post_field( $f, $id ) { return $GLOBALS['posts'][ (int) $id ][ $f ] ?? ''; }
function wc_get_product( $id ) { return isset( $GLOBALS['posts'][ (int) $id ] ) ? new Fake_Product( $GLOBALS['posts'][ (int) $id ]['visible'] ) : false; }
function render_block( array $block ) {
	$GLOBALS['rendered'][] = $block;
	return '<div class="sgs-card-' . (int) $block['attrs']['productId'] . '"></div>';
}
class Fake_Product { function __construct( private bool $v ) {} function is_visible() { return $this->v; } }
class WP_Error { function __construct( public $code = '', public $message = '', public $data = array() ) {} }
class WP_REST_Response { function __construct( public $data = null, public $status = 200 ) {} }
class WP_REST_Server { const CREATABLE = 'POST'; }
class WP_REST_Request { function __construct( private array $p ) {} function get_param( $k ) { return $this->p[ $k ] ?? null; } }

$GLOBALS['posts'] = array(
	11 => array( 'status' => 'publish', 'visible' => true, 'post_password' => '' ),
	12 => array( 'status' => 'draft', 'visible' => true, 'post_password' => '' ),
	13 => array( 'status' => 'publish', 'visible' => false, 'post_password' => '' ),
	14 => array( 'status' => 'publish', 'visible' => true, 'post_password' => 'secret' ),
	15 => array( 'status' => 'publish', 'visible' => true, 'post_password' => '' ),
	16 => array( 'status' => 'private', 'visible' => true, 'post_password' => '' ),
);

$negative   = in_array( '--negative-control', $argv, true );
$includes   = str_replace( '\\', '/', dirname( __DIR__, 2 ) ) . '/includes';
$class_file = $includes . '/wishlist/class-wishlist-cards-rest.php';
if ( $negative ) {
	$src = file_get_contents( $class_file );
	$cut = "'publish' !== \\get_post_status( \$product_id ) || ";
	if ( false === strpos( $src, $cut ) ) {
		echo "FAIL  negative control: the guard text was not found, the control is stale\n";
		exit( 0 );
	}
	$src = str_replace( $cut, '', $src );
	$src = str_replace( "dirname( __DIR__ ) . '/class-card-grid-template.php'", "'" . $includes . "/class-card-grid-template.php'", $src );
	$tmp = sys_get_temp_dir() . '/wishlist-cards-negative.php';
	file_put_contents( $tmp, $src );
	require $tmp;
} else {
	require $class_file;
}

$failures = 0;
function ok( bool $cond, string $label, string $detail = '' ): void {
	global $failures;
	if ( ! $cond ) { ++$failures; }
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . ( ! $cond && '' !== $detail ? "  => {$detail}" : '' ) . "\n";
}

$template = array( 'variantStyle' => 'standard', 'showPickers' => false, 'productId' => 999, 'sourceMode' => 'typed', 'anchor' => 'x' );
$signed   = SGS\Blocks\Wishlist_Cards_Rest::sign_template( $template );
function ask( array $params ) {
	$GLOBALS['rendered'] = array();
	return SGS\Blocks\Wishlist_Cards_Rest::handle( new WP_REST_Request( $params ) );
}
$good = array( 'template' => $signed['template'], 'sig' => $signed['sig'] );

if ( $negative ) {
	ask( $good + array( 'ids' => array( 12 ) ) );
	ok( 0 === count( $GLOBALS['rendered'] ), 'a draft product is never rendered' );
	exit( $failures ? 1 : 0 );
}

$R = 'SGS\\Blocks\\Wishlist_Cards_Rest';

// Registration.
$R::register_route();
$route = $GLOBALS['routes']['sgs/v1/wishlist-cards'] ?? null;
ok( null !== $route, 'the route is registered' );
ok( 'POST' === ( $route['methods'] ?? '' ), 'the route takes POST' );
ok( '__return_true' === ( $route['permission_callback'] ?? '' ), 'the route is public by design (the handler guards)' );
ok( $R::MAX_IDS === ( $route['args']['ids']['maxItems'] ?? 0 ), 'the ids argument declares the cap' );
ok( ! empty( $route['args']['ids']['required'] ) && ! empty( $route['args']['template']['required'] ) && ! empty( $route['args']['sig']['required'] ), 'ids, template and sig are required' );

// The panel registers with skip_inner_blocks.
$settings = $R::metadata_settings( array(), array( 'name' => 'sgs/wishlist-panel' ) );
ok( true === ( $settings['skip_inner_blocks'] ?? false ), 'the panel registers with skip_inner_blocks' );
ok( ! isset( $R::metadata_settings( array(), array( 'name' => 'sgs/cart' ) )['skip_inner_blocks'] ), 'another block does not' );

// ids.
ok( $R::validate_ids( array( 1, '2', 3 ) ), 'validate_ids accepts integers and digit strings' );
ok( ! $R::validate_ids( array( 1, 'x' ) ), 'validate_ids refuses a non-numeric value' );
ok( ! $R::validate_ids( array( -1 ) ), 'validate_ids refuses a negative number' );
ok( ! $R::validate_ids( range( 1, $R::MAX_IDS + 1 ) ), 'validate_ids refuses more than MAX_IDS ids' );
ok( $R::validate_ids( range( 1, $R::MAX_IDS ) ), 'validate_ids accepts exactly MAX_IDS ids' );
ok( array( 5, 3, 9 ) === $R::normalise_ids( array( 5, '3', 0, 5, 9, 3 ) ), 'normalise_ids drops zeros and duplicates and keeps order' );
ok( $R::MAX_IDS === count( $R::normalise_ids( range( 1, 100 ) ) ), 'normalise_ids caps the list' );

// Signature.
ok( $R::verify_template( $signed['template'], $signed['sig'] ), 'a signed template verifies' );
ok( ! $R::verify_template( $signed['template'] . ' ', $signed['sig'] ), 'a changed template does not verify' );
ok( ! $R::verify_template( $signed['template'], 'deadbeef' ), 'a wrong signature does not verify' );
ok( ! $R::verify_template( $signed['template'], '' ), 'an empty signature does not verify' );

// Handler: refusal.
$bad = ask( array( 'ids' => array( 11 ), 'template' => '{"showPickers":true}', 'sig' => $signed['sig'] ) );
ok( $bad instanceof WP_Error && 403 === ( $bad->data['status'] ?? 0 ), 'a template that does not match its signature is refused with 403' );
ok( 0 === count( $GLOBALS['rendered'] ), 'a refused request renders nothing' );

// Handler: filtering and order.
$res = ask( $good + array( 'ids' => array( 15, 12, 11, 13, 14, 16, 404 ) ) );
$ids = array_column( $res->data['items'], 'id' );
$all = json_encode( $res->data );
ok( array( 15, 11 ) === $ids, 'only published, visible, unprotected products are rendered, in the order asked', json_encode( $ids ) );
ok( 2 === count( $GLOBALS['rendered'] ), 'render_block ran once per listed product' );
ok( false === strpos( $all, 'sgs-card-12' ), 'a draft product never reaches the answer' );
ok( false === strpos( $all, 'sgs-card-14' ), 'a password-protected product never reaches the answer' );
ok( false === strpos( $all, 'sgs-card-13' ), 'a product hidden from the catalogue never reaches the answer' );
ok( false === strpos( $all, 'sgs-card-16' ), 'a private product never reaches the answer' );

// Handler: the card's attributes.
$first = $GLOBALS['rendered'][0] ?? array();
ok( 'sgs/product-card' === ( $first['blockName'] ?? '' ), 'each card is rendered as sgs/product-card' );
ok( 15 === ( $first['attrs']['productId'] ?? 0 ), "the product's ID wins over the template's" );
ok( 'wc-product' === ( $first['attrs']['sourceMode'] ?? '' ), "the card renders as a live WooCommerce product, not the template's mode" );
ok( 'standard' === ( $first['attrs']['variantStyle'] ?? '' ) && false === ( $first['attrs']['showPickers'] ?? null ), "the template's own settings carry through" );
ok( false === ( $first['attrs']['showWishlist'] ?? null ), 'the heart is off: the panel draws its own remove control' );
ok( ! isset( $first['attrs']['anchor'] ), "the template's HTML anchor never reaches a card" );

// Empty list.
$empty = ask( $good + array( 'ids' => array() ) );
ok( array() === $empty->data['items'], 'no ids gives no items' );

echo $failures ? "\n{$failures} failure(s)\n" : "\nAll passed\n";

// The negative control, in a child process, must go red.
$cmd = escapeshellarg( PHP_BINARY ) . ' ' . escapeshellarg( __FILE__ ) . ' --negative-control';
exec( $cmd, $out, $code );
$negative_red = 0 !== $code;
echo ( $negative_red ? 'PASS  ' : 'FAIL  ' ) . "negative control: without the status guard a draft is rendered and the check goes red\n";
exit( ( $failures || ! $negative_red ) ? 1 : 0 );
