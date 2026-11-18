<?php
/**
 * Tests: the `sgs_rest_nonce` admin-ajax action (includes/class-rest-nonce-refresh.php).
 *
 * Run with: vendor/bin/phpunit --filter RestNonceRefreshTest
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// PHPUnit test, not shipped code.
// phpcs:disable

use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
use PHPUnit\Framework\TestCase;
use SGS\Blocks\Rest_Nonce_Refresh;

#[RunTestsInSeparateProcesses]
#[PreserveGlobalState( false )]
final class RestNonceRefreshTest extends TestCase {

	public static function setUpBeforeClass(): void {
		if ( ! defined( 'ABSPATH' ) ) {
			define( 'ABSPATH', __DIR__ . '/' );
		}
		$GLOBALS['rn_hooks']  = array();
		$GLOBALS['rn_events'] = array();
		$GLOBALS['rn_sent']   = null;
		$GLOBALS['rn_user']   = 7;
		if ( ! function_exists( 'add_action' ) ) {
			function add_action( $hook, $callback ) {
				$GLOBALS['rn_hooks'][ $hook ] = $callback;
			}
		}
		if ( ! function_exists( 'nocache_headers' ) ) {
			function nocache_headers() {
				$GLOBALS['rn_events'][] = 'nocache_headers';
			}
		}
		if ( ! function_exists( 'wp_create_nonce' ) ) {
			function wp_create_nonce( $action ) {
				$GLOBALS['rn_events'][] = 'nonce:' . $action . ':user' . $GLOBALS['rn_user'];
				return substr( md5( $action . '|' . $GLOBALS['rn_user'] ), 0, 10 );
			}
		}
		if ( ! function_exists( 'wp_send_json' ) ) {
			function wp_send_json( $data ) {
				$GLOBALS['rn_events'][] = 'send_json';
				$GLOBALS['rn_sent']     = $data;
			}
		}
		if ( ! function_exists( 'admin_url' ) ) {
			function admin_url( $path ) {
				return 'https://shop.test/wp-admin/' . $path;
			}
		}
		if ( ! function_exists( 'add_query_arg' ) ) {
			function add_query_arg( $key, $value, $url ) {
				return $url . '?' . $key . '=' . $value;
			}
		}
		require_once dirname( __DIR__, 2 ) . '/includes/class-rest-nonce-refresh.php';
	}

	public function test_the_action_is_registered_for_signed_in_and_signed_out_visitors(): void {
		Rest_Nonce_Refresh::register();
		$this->assertSame( array( Rest_Nonce_Refresh::class, 'handle' ), $GLOBALS['rn_hooks']['wp_ajax_sgs_rest_nonce'] );
		$this->assertSame( array( Rest_Nonce_Refresh::class, 'handle' ), $GLOBALS['rn_hooks']['wp_ajax_nopriv_sgs_rest_nonce'] );
	}

	public function test_it_is_an_ajax_action_not_a_rest_route(): void {
		Rest_Nonce_Refresh::register();
		$this->assertSame( 'https://shop.test/wp-admin/admin-ajax.php?action=sgs_rest_nonce', Rest_Nonce_Refresh::url() );
		$this->assertArrayNotHasKey( 'rest_api_init', $GLOBALS['rn_hooks'] );
	}

	public function test_the_reply_is_uncached_and_holds_a_wp_rest_nonce_for_the_current_user(): void {
		Rest_Nonce_Refresh::handle();
		$this->assertSame( 'nocache_headers', $GLOBALS['rn_events'][0], 'no-cache headers go out before the body' );
		$this->assertContains( 'nonce:wp_rest:user7', $GLOBALS['rn_events'] );
		$this->assertSame( array( 'nonce' => substr( md5( 'wp_rest|7' ), 0, 10 ) ), $GLOBALS['rn_sent'] );
	}

	public function test_the_meta_tag_carries_the_action_url(): void {
		ob_start();
		Rest_Nonce_Refresh::print_url_meta();
		$html = ob_get_clean();
		$this->assertStringContainsString( 'name="sgs-rest-nonce-url"', $html );
		$this->assertStringContainsString( 'admin-ajax.php?action=sgs_rest_nonce', $html );
	}
}
