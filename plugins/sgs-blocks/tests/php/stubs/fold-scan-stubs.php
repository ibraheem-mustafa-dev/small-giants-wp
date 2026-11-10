<?php
/**
 * WordPress stand-ins for FoldScanTest. Test support, not shipped code.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable

if ( ! class_exists( 'WP_REST_Request' ) ) {
	class WP_REST_Request {
		private array $params;
		public function __construct( array $params = array() ) {
			$this->params = $params;
		}
		public function get_param( string $key ) {
			return $this->params[ $key ] ?? null;
		}
		public function get_header( string $key ) {
			return 'nonce';
		}
	}
	class WP_REST_Response {
		public $data;
		public function __construct( $data = null ) {
			$this->data = $data;
		}
	}
	class WP_REST_Server {
		const CREATABLE = 'POST';
	}
}
if ( ! function_exists( 'absint' ) ) {
	function absint( $v ) {
		return abs( (int) $v );
	}
	function current_user_can( $cap, ...$args ) {
		return (bool) $GLOBALS['fs_can'];
	}
	function wp_verify_nonce( $nonce, $action ) {
		return $GLOBALS['fs_nonce_ok'] ? 1 : false;
	}
	function get_post_status( $id ) {
		return $GLOBALS['fs_status'];
	}
	function get_post_meta( $id, $key, $single = false ) {
		return $GLOBALS['fs_meta'][ $id ][ $key ] ?? '';
	}
	function update_post_meta( $id, $key, $value ) {
		$GLOBALS['fs_meta'][ $id ][ $key ] = $value;
		return true;
	}
	function has_action( $hook ) {
		return $GLOBALS['fs_has_hook'];
	}
	function do_action( $hook, ...$args ) {
		if ( 'litespeed_purge_post' === $hook ) {
			$GLOBALS['fs_purged'][] = $args[0];
		}
	}
	function register_post_meta( $type, $key, $args ) {
		$GLOBALS['fs_registered_meta'][ $key ] = $args;
		return true;
	}
	function add_action( ...$a ) {}
	function register_rest_route( ...$a ) {}
	function rest_ensure_response( $d ) {
		return $d instanceof WP_REST_Response ? $d : new WP_REST_Response( $d );
	}
}
