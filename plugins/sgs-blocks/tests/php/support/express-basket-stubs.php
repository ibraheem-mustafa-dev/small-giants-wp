<?php
/**
 * Stand-ins for the Express basket isolation tests: WordPress hooks, a REST request and response, and a WooCommerce
 * session and basket that follow the real contract (get_cart_for_session, get_cart_from_session, empty_cart).
 * Required from setUpBeforeClass of a test that runs in a separate process.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable

namespace {
	if ( ! defined( 'ABSPATH' ) ) {
		define( 'ABSPATH', __DIR__ . '/' );
	}
	$GLOBALS['sgs_t_actions'] = array();
	$GLOBALS['sgs_t_filters'] = array();

	if ( ! function_exists( 'add_action' ) ) {
		function add_action( $tag, $cb, $priority = 10, $args = 1 ) {
			$GLOBALS['sgs_t_actions'][ $tag ][] = $cb;
			return true;
		}
	}
	if ( ! function_exists( 'add_filter' ) ) {
		function add_filter( $tag, $cb, $priority = 10, $args = 1 ) {
			$GLOBALS['sgs_t_filters'][ $tag ][] = $cb;
			return true;
		}
	}
	if ( ! function_exists( 'is_wp_error' ) ) {
		function is_wp_error( $v ) {
			return $v instanceof WP_Error;
		}
	}
	if ( ! class_exists( 'WP_Error' ) ) {
		class WP_Error {}
	}
	if ( ! function_exists( 'is_checkout' ) ) {
		function is_checkout() {
			return ! empty( $GLOBALS['sgs_t_is_checkout'] );
		}
	}

	class WP_REST_Request {
		public function __construct( private string $method, private string $route, private array $params = array() ) {}
		public function get_method() {
			return $this->method;
		}
		public function get_route() {
			return $this->route;
		}
		public function get_param( $k ) {
			return $this->params[ $k ] ?? null;
		}
	}
	class WP_REST_Response {
		public function __construct( public $data = null, public int $status = 200 ) {}
		public function is_error() {
			return $this->status >= 400;
		}
	}
	class WP_REST_Server {}

	class Sgs_T_Session {
		public array $data = array();
		public function get( $k, $default = null ) {
			return $this->data[ $k ] ?? $default;
		}
		public function set( $k, $v ) {
			if ( null === $v ) {
				unset( $this->data[ $k ] );
			} else {
				$this->data[ $k ] = $v;
			}
		}
	}

	/** Lines are kept in the session format (what WooCommerce stores): key => line array. */
	class Sgs_T_Cart {
		public array $lines   = array();
		public array $coupons = array();
		public function __construct( private Sgs_T_Session $session ) {}
		public function get_cart_for_session() {
			return $this->lines;
		}
		public function get_applied_coupons() {
			return $this->coupons;
		}
		public function empty_cart( $clear_persistent = true ) {
			$this->lines   = array();
			$this->coupons = array();
			$this->session->set( 'cart', null );
			$this->session->set( 'applied_coupons', null );
		}
		public function get_cart_from_session() {
			$this->lines   = $this->session->get( 'cart', array() );
			$this->coupons = $this->session->get( 'applied_coupons', array() );
		}
		public function calculate_totals() {}
		public function set_session() {
			$this->session->set( 'cart', $this->lines );
			$this->session->set( 'applied_coupons', $this->coupons );
		}
	}

	if ( ! function_exists( 'sgs_t_wc_reset' ) ) {
		function sgs_t_wc_reset() {
			$session                      = new Sgs_T_Session();
			$GLOBALS['sgs_t_wc']          = (object) array( 'session' => $session, 'cart' => new Sgs_T_Cart( $session ) );
			$GLOBALS['sgs_t_actions']     = array();
			$GLOBALS['sgs_t_filters']     = array();
			$GLOBALS['sgs_t_is_checkout'] = false;
		}
	}
	sgs_t_wc_reset();

	if ( ! function_exists( 'WC' ) ) {
		function WC() {
			return $GLOBALS['sgs_t_wc'];
		}
	}
}
