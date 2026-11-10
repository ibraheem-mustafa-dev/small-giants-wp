<?php
/**
 * Standalone test: the account address view (addressEditor) swaps WooCommerce's two address templates only while the
 * setting is on; its form fields come from WooCommerce's get_address_fields (a field added by another plugin appears);
 * every value is escaped; each form posts to the type's edit-address URL with WooCommerce's action and nonce.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-address-editor-standalone.php [path to a plugin copy]
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
$base = rtrim( $argv[1] ?? dirname( __DIR__, 2 ), '/\\' );
define( 'ABSPATH', $base . '/' );
define( 'SGS_BLOCKS_PATH', ABSPATH );

function is_user_logged_in() { return true; }
require $base . '/scripts/qa/lib/wp-stubs.php';
if ( ! function_exists( 'esc_url' ) ) { function esc_url( $u ) { return (string) $u; } }
if ( ! function_exists( 'esc_attr' ) ) { function esc_attr( $u ) { return htmlspecialchars( (string) $u, ENT_QUOTES ); } }
if ( ! function_exists( 'esc_textarea' ) ) { function esc_textarea( $u ) { return htmlspecialchars( (string) $u, ENT_QUOTES ); } }
if ( ! function_exists( 'wp_strip_all_tags' ) ) { function wp_strip_all_tags( $t ) { return trim( strip_tags( (string) $t ) ); } }
if ( ! function_exists( 'add_filter' ) ) { function add_filter() {} }
if ( ! function_exists( 'add_action' ) ) { function add_action() {} }
if ( ! function_exists( 'remove_filter' ) ) { function remove_filter() {} }
if ( ! function_exists( 'get_current_user_id' ) ) { function get_current_user_id() { return 7; } }
if ( ! function_exists( 'wp_create_nonce' ) ) { function wp_create_nonce( $a ) { return 'nonce-for-' . $a; } }
if ( ! function_exists( 'wp_enqueue_script' ) ) { function wp_enqueue_script( $h ) { $GLOBALS['enqueued'][] = $h; } }
if ( ! function_exists( 'wp_get_current_user' ) ) { function wp_get_current_user() { return (object) array( 'user_email' => 'a@example.test' ); } }
if ( ! function_exists( 'wc_shipping_enabled' ) ) { function wc_shipping_enabled() { return true; } }
if ( ! function_exists( 'wc_ship_to_billing_address_only' ) ) { function wc_ship_to_billing_address_only() { return false; } }
if ( ! function_exists( 'wc_get_endpoint_url' ) ) { function wc_get_endpoint_url( $e, $v = '', $p = '' ) { return 'https://example.test/my-account/' . $e . '/' . ( '' === $v ? '' : $v . '/' ); } }
if ( ! function_exists( 'wc_get_post_data_by_key' ) ) { function wc_get_post_data_by_key( $k, $d = '' ) { return $GLOBALS['posted'][ $k ] ?? $d; } }
if ( ! function_exists( 'wc_get_account_formatted_address' ) ) { function wc_get_account_formatted_address( $t ) { return $GLOBALS['saved'][ $t ] ?? ''; } }
if ( ! function_exists( 'get_user_meta' ) ) { function get_user_meta( $u, $k, $s = false ) { return $GLOBALS['meta'][ $k ] ?? ''; } }
if ( ! function_exists( 'is_wc_endpoint_url' ) ) { function is_wc_endpoint_url( $e = '' ) { return ! empty( $GLOBALS['on_endpoint'] ); } }
if ( ! function_exists( 'wc_wp_theme_get_element_class_name' ) ) { function wc_wp_theme_get_element_class_name( $e ) { return ''; } }

class Fake_Countries {
	public $asked = array();
	function get_base_country() { return 'GB'; }
	function get_allowed_countries() { return $GLOBALS['countries'] ?? array( 'GB' => 'United Kingdom' ); }
	function get_shipping_countries() { return $this->get_allowed_countries(); }
	function get_states( $c ) { return 'US' === $c ? array( 'NY' => 'New York' ) : array(); }
	function get_address_fields( $country, $prefix ) {
		$this->asked[] = $prefix;
		$f = array(
			$prefix . 'first_name' => array( 'label' => 'First name', 'required' => true, 'class' => array( 'form-row-first' ), 'autocomplete' => 'given-name' ),
			$prefix . 'last_name'  => array( 'label' => 'Last name', 'required' => true, 'class' => array( 'form-row-last' ), 'autocomplete' => 'family-name' ),
			$prefix . 'company'    => array( 'label' => 'Company name', 'required' => false, 'class' => array( 'form-row-wide' ) ),
			$prefix . 'country'    => array( 'type' => 'country', 'label' => 'Country / Region', 'required' => true, 'class' => array( 'form-row-wide' ) ),
			$prefix . 'address_1'  => array( 'label' => 'Street address', 'required' => true, 'class' => array( 'form-row-wide' ) ),
			$prefix . 'address_2'  => array( 'label' => 'Apartment, suite, unit', 'required' => false, 'class' => array( 'form-row-wide' ) ),
			$prefix . 'city'       => array( 'label' => 'Town / City', 'required' => true, 'class' => array( 'form-row-wide' ) ),
			$prefix . 'state'      => array( 'type' => 'state', 'label' => 'County', 'required' => false, 'class' => array( 'form-row-wide' ) ),
			$prefix . 'postcode'   => array( 'label' => 'Postcode', 'required' => true, 'class' => array( 'form-row-wide' ) ),
		);
		if ( 'billing_' === $prefix ) {
			$f['billing_email'] = array( 'type' => 'email', 'label' => 'Email address', 'required' => true, 'class' => array( 'form-row-wide' ) );
		}
		if ( ! empty( $GLOBALS['extra_field'] ) ) {
			$f[ $prefix . 'vat' ] = array( 'label' => 'VAT number', 'required' => false, 'class' => array( 'form-row-wide' ) );
		}
		return $f;
	}
}
class Fake_WC { public $countries; function __construct() { $this->countries = new Fake_Countries(); } }
function WC() { static $wc; return $wc ??= new Fake_WC(); }

require_once $base . '/includes/account/helpers-account-defaults.php';
require_once $base . '/includes/account/helpers-account-signed-out.php';
require_once $base . '/includes/account/class-account-strings.php';
require_once $base . '/includes/account/class-account-endpoints.php';
require_once $base . '/includes/account/class-account-extras.php';
foreach ( array( 'helpers-account-address-fields.php', 'helpers-account-address-editor.php' ) as $f ) {
	if ( is_file( $base . '/includes/account/' . $f ) ) {
		require_once $base . '/includes/account/' . $f;
	}
}

$failures = 0;
function ok( bool $c, string $label ): void {
	global $failures;
	echo ( $c ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	if ( ! $c ) {
		++$failures;
	}
}

// -- the swap -------------------------------------------------------------
use SGS\Blocks\Account_Endpoints;
use SGS\Blocks\Account_Extras;
$swap = method_exists( 'SGS\Blocks\Account_Extras', 'maybe_swap_address_template' );
Account_Endpoints::$active = array();
ok( $swap && '/wc/my-address.php' === Account_Extras::maybe_swap_address_template( '/wc/my-address.php', 'myaccount/my-address.php' ), 'with addressEditor off WooCommerce keeps its address list' );
ok( $swap && '/wc/form.php' === Account_Extras::maybe_swap_address_template( '/wc/form.php', 'myaccount/form-edit-address.php' ), 'and its address form' );
Account_Endpoints::$active = array( 'addressEditor' => true );
ok( $swap && str_ends_with( (string) Account_Extras::maybe_swap_address_template( '/wc/my-address.php', 'myaccount/my-address.php' ), 'templates/my-address.php' ), 'with it on the block address list replaces the list' );
ok( $swap && str_ends_with( (string) Account_Extras::maybe_swap_address_template( '/wc/form.php', 'myaccount/form-edit-address.php' ), 'templates/form-edit-address.php' ), 'and replaces the form page' );
ok( $swap && '/wc/cart.php' === Account_Extras::maybe_swap_address_template( '/wc/cart.php', 'cart/cart.php' ), 'no other template is touched' );

// -- the view ---------------------------------------------------------------
$attrs = array( 'addressEditor' => true, 'addressLine2Label' => 'Flat / building', 'addressPairs' => 'city,postcode', 'addressEditLabel' => 'Edit', 'addressAddLabel' => 'Add', 'addressSaveLabel' => 'Save address', 'addressCancelLabel' => 'Cancel' );
$GLOBALS['saved'] = array( 'shipping' => '14 Larch Grove<br/>Leeds' );
$GLOBALS['meta']  = array( 'shipping_address_1' => '14 Larch Grove', 'shipping_first_name' => 'Aisha"><script>x</script>', 'shipping_city' => 'Leeds' );
$GLOBALS['extra_field'] = true;
$has  = function_exists( 'sgs_account_addresses_html' );
$html = $has ? sgs_account_addresses_html( $attrs ) : '';

ok( $has && 2 === substr_count( $html, 'data-sgs-addr="' ), 'one card per address type' );
ok( $has && strpos( $html, 'data-sgs-addr="shipping"' ) < strpos( $html, 'data-sgs-addr="billing"' ), 'delivery comes first' );
ok( false !== strpos( $html, 'name="shipping_vat"' ) && false !== strpos( $html, 'name="billing_vat"' ), 'a field another plugin adds through get_address_fields appears on both forms' );
ok( in_array( 'shipping_', WC()->countries->asked, true ) && in_array( 'billing_', WC()->countries->asked, true ), 'the fields were asked of WooCommerce with each type prefix' );
ok( false !== strpos( $html, 'placeholder="Flat / building"' ) && false !== strpos( $html, '>Flat / building</label>' ), 'address line 2 takes its wording setting as label and placeholder' );
ok( false === strpos( $html, '<script>x' ) && false !== strpos( $html, 'Aisha&quot;&gt;&lt;script&gt;' ), 'a saved value is escaped' );
ok( false !== strpos( $html, 'action="https://example.test/my-account/edit-address/shipping/"' ) && false !== strpos( $html, 'action="https://example.test/my-account/edit-address/billing/"' ), 'each form posts to its type edit-address URL' );
ok( 2 === substr_count( $html, 'name="action" value="edit_address"' ) && 2 === substr_count( $html, 'name="woocommerce-edit-address-nonce" value="' . wp_create_nonce( 'woocommerce-edit_address' ) . '"' ), 'WooCommerce action field and nonce are on both forms' );
ok( 2 === substr_count( $html, 'name="save_address"' ), 'a Save button on each form' );
ok( 2 === substr_count( $html, 'data-sgs-addr-cancel' ), 'a Cancel on each form' );
ok( 2 === substr_count( $html, 'data-sgs-addr-form hidden>' ), 'both forms are hidden until Edit' );
ok( false !== strpos( $html, 'data-sgs-addr-edit' ) && false !== strpos( $html, 'href="https://example.test/my-account/edit-address/shipping/"' ) && false !== strpos( $html, 'aria-expanded="false"' ), 'Edit is a link to the edit URL with aria-expanded' );
ok( false !== strpos( $html, '14 Larch Grove<br/>Leeds' ), 'the read view shows the saved address' );
ok( false !== strpos( $html, 'sgs-account__addr-row--half" id="shipping_city_field"' ) && false !== strpos( $html, 'sgs-account__addr-row--half" id="shipping_postcode_field"' ) && false !== strpos( $html, 'sgs-account__addr-row--full" id="shipping_address_1_field"' ), 'first/last and the paired fields are half width, the rest full' );
ok( false === strpos( $html, 'name="shipping_country"' ) || false !== strpos( $html, 'type="hidden" name="shipping_country"' ), 'a single-country site keeps the country as a hidden value' );

// open card (the edit URL, or a failed save)
$open = sgs_account_addresses_html( $attrs, 'billing' );
ok( 1 === preg_match( '#data-sgs-addr="billing".*?data-sgs-addr-edit[^>]*aria-expanded="true"[^>]* hidden#s', $open ) && 1 === preg_match( '#<form[^>]*data-sgs-addr-form(?! hidden)[^>]*>#', $open ), 'the open type prints its form open and Edit expanded' );
$GLOBALS['posted'] = array( 'billing_city' => 'Posted"city' );
ok( false !== strpos( sgs_account_addresses_html( $attrs, 'billing' ), 'value="Posted&quot;city"' ), 'a failed save shows the posted value, escaped' );
$GLOBALS['posted'] = array();

// wording and empty cards
$GLOBALS['saved'] = array();
$empty = sgs_account_addresses_html( array( 'addressEditor' => true, 'addressEmptyText' => 'No {type} address saved yet.', 'addressSameText' => 'Same as delivery address', 'addressAddLabel' => 'Add' ) );
ok( false !== strpos( $empty, '>Add<' ), 'an empty card offers the Add label' );
$GLOBALS['meta'] = array( 'shipping_address_1' => '14 Larch Grove' );
$same = sgs_account_addresses_html( array( 'addressEditor' => true, 'addressEmptyText' => 'No {type} address saved yet.', 'addressSameText' => 'Same as delivery address' ) );
ok( false !== strpos( $same, 'Same as delivery address' ), 'an empty billing card says same as delivery while a delivery address is saved' );
$GLOBALS['meta'] = array();
$none = sgs_account_addresses_html( array( 'addressEditor' => true, 'addressEmptyText' => 'No {type} address saved yet.' ) );
ok( false !== strpos( $none, 'No billing address saved yet.' ) || false !== strpos( $none, 'No shipping address saved yet.' ), 'the empty line fills its type token' );

// a selectable country keeps the select WooCommerce's scripts drive
$GLOBALS['countries'] = array( 'GB' => 'United Kingdom', 'US' => 'United States' );
$multi = sgs_account_addresses_html( $attrs );
ok( false !== strpos( $multi, 'class="country_to_state country_select"' ) && in_array( 'wc-country-select', $GLOBALS['enqueued'] ?? array(), true ), 'with several countries the country select and WooCommerce country script print' );

// hidden fields keep their saved value, a required one included (printed as a hidden input, never dropped)
$GLOBALS['meta'] = array( 'billing_city' => 'Leeds' );
$hide = sgs_account_addresses_html( array( 'addressEditor' => true, 'addressHideFields' => 'company,city,email' ) );
ok( false !== strpos( $hide, 'type="hidden" name="shipping_company"' ) || false === strpos( $hide, 'name="shipping_company"' ), 'a hidden optional field becomes a hidden input' );
ok( false !== strpos( $hide, 'type="hidden" name="shipping_city"' ) && false !== strpos( $hide, 'type="hidden" name="billing_city" id="billing_city" value="Leeds"' ), 'a hidden required field is kept as a hidden input with its saved value' );
ok( false !== strpos( $hide, 'type="hidden" name="billing_email" id="billing_email" value="a@example.test"' ) && false === strpos( $hide, 'id="billing_email_field"' ), 'billing email falls back to the account email and is not shown' );
ok( false === strpos( $hide, 'id="billing_city_field"' ), 'the hidden required field has no visible row' );

// Flat / building: added to the account edit-address screen only
$add = method_exists( 'SGS\Blocks\Account_Extras', 'add_address_2' );
$base = array( 'shipping_address_1' => array( 'label' => 'Street address', 'priority' => 50 ) );
Account_Endpoints::$active = null;
$GLOBALS['on_endpoint'] = false;
ok( $add && ! isset( Account_Extras::add_address_2( $base )['shipping_address_2'] ), 'checkout and every other screen keep the fields WooCommerce builds' );
$GLOBALS['on_endpoint'] = true;
ok( $add && ! isset( Account_Extras::add_address_2( $base )['shipping_address_2'] ), 'the edit-address endpoint without the editor on gets nothing added' );
Account_Endpoints::$active = array( 'addressEditor' => true, 'addressLine2Label' => 'Flat / building' );
$out = $add ? Account_Extras::add_address_2( $base ) : array();
ok( $add && isset( $out['shipping_address_2'] ) && false === $out['shipping_address_2']['required'] && 'Flat / building' === $out['shipping_address_2']['label'], 'with the editor on the optional second line is added with the wording label' );
ok( $add && isset( Account_Extras::add_address_2( array( 'billing_address_1' => array() ) )['billing_address_2'] ), 'and gets the billing prefix on the billing fields' );
$GLOBALS['on_endpoint'] = false;
ok( $add && isset( Account_Extras::add_address_2( $base )['shipping_address_2'] ), 'while the block renders the form shows it wherever it sits' );
Account_Endpoints::$active = array( 'addressEditor' => true );
$keep = $add ? Account_Extras::add_address_2( array( 'shipping_address_2' => array( 'label' => 'Own', 'required' => true ) ) ) : array();
ok( $add && 'Own' === $keep['shipping_address_2']['label'], 'a second line WooCommerce already builds is left alone' );
Account_Endpoints::$active = null;

echo $failures ? "\n$failures FAILED\n" : "\nALL PASSED\n";
exit( $failures ? 1 : 0 );
