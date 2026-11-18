<?php
/**
 * SGS Account Redirect: sends a signed-in visitor away from a page whose sgs/account block has
 * `signedInRedirectUrl` set (the block's "when the visitor is signed in, send them to" setting).
 *
 * A mirror serves the signed-out visitor: on a page whose card-view sgs/account block has a sign-in address
 * (`signedOutSignInUrl`), a signed-out visitor is sent to that sign-in page, carrying `redirect_to` back to the page.
 *
 * Three hooks use one decision:
 * - `template_redirect`: a signed-in visitor who requests such a page is redirected before any output.
 * - `woocommerce_registration_redirect` and `woocommerce_login_redirect`: when WooCommerce would return the visitor to
 *   the page they came from and that page holds the setting, they go to the destination in one hop.
 *
 * Limit: only the block markup of the page itself is searched, plus synced patterns (`core/block`) it embeds up to
 * three levels deep. A block placed in a template part or the page template is not found.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/helpers-link-source.php';

/** Signed-in redirect for sgs/account. */
final class Account_Redirect {

	/**
	 * The account endpoints a signed-out visitor is sent to the sign-in page from (orders, addresses and account details only
	 * show a signed-in customer's own data). Lost-password, reset-password, view-order and every other endpoint stay as
	 * WooCommerce shows them.
	 */
	private const SIGNED_OUT_REDIRECT_ENDPOINTS = array( 'orders', 'edit-address', 'edit-account' );

	/** Wire WordPress hooks. Called once from sgs-blocks.php. */
	public static function register(): void {
		\add_action( 'template_redirect', array( __CLASS__, 'maybe_redirect' ), 5 );
		\add_filter( 'woocommerce_registration_redirect', array( __CLASS__, 'after_auth' ), 20, 1 );
		\add_filter( 'woocommerce_login_redirect', array( __CLASS__, 'after_auth' ), 20, 1 );
	}

	/**
	 * Path (and query, only when the address carries one) of an address, for comparing two addresses on this site.
	 *
	 * @param string $url Absolute or site-relative address.
	 * @return string Lower-cased path without trailing slash, plus `?query` when present.
	 */
	public static function normalise( string $url ): string {
		$path  = (string) \wp_parse_url( $url, PHP_URL_PATH );
		$query = (string) \wp_parse_url( $url, PHP_URL_QUERY );
		$path  = strtolower( '/' . trim( $path, '/' ) );
		return '' !== $query ? $path . '?' . $query : $path;
	}

	/**
	 * Whether two addresses are the same page. A destination without a query matches the page with any query.
	 *
	 * @param string $request     The address that was requested or came from.
	 * @param string $destination The address it is compared with.
	 * @return bool
	 */
	public static function same_page( string $request, string $destination ): bool {
		$a = self::normalise( $request );
		$b = self::normalise( $destination );
		if ( false === strpos( $b, '?' ) ) {
			$a = (string) strtok( $a, '?' );
		}
		return $a === $b;
	}

	/**
	 * The decision, as a pure function: the address to redirect to, or null for no redirect.
	 *
	 * Keys of `$c`: logged_in, method, request_url, destination (the block's resolved address), is_rest, is_ajax,
	 * is_cron, is_admin, is_preview (preview or customiser), has_endpoint (a WooCommerce account endpoint or a
	 * reset-password key link is requested).
	 *
	 * @param array $c Request facts.
	 * @return string|null
	 */
	public static function decide( array $c ): ?string {
		$destination = trim( (string) ( $c['destination'] ?? '' ) );
		if ( '' === $destination || empty( $c['logged_in'] ) ) {
			return null;
		}
		if ( ! in_array( strtoupper( (string) ( $c['method'] ?? 'GET' ) ), array( 'GET', 'HEAD' ), true ) ) {
			return null;
		}
		foreach ( array( 'is_rest', 'is_ajax', 'is_cron', 'is_admin', 'is_preview', 'has_endpoint' ) as $flag ) {
			if ( ! empty( $c[ $flag ] ) ) {
				return null;
			}
		}
		if ( self::same_page( (string) ( $c['request_url'] ?? '' ), $destination ) ) {
			return null;
		}
		return $destination;
	}

	/**
	 * The signed-out decision, as a pure function: the sign-in page address carrying `redirect_to`, or null.
	 *
	 * Keys of `$c`: logged_in, method, request_url, sign_in_url (the block's resolved sign-in page), is_rest, is_ajax,
	 * is_cron, is_admin, is_preview, has_endpoint (a WooCommerce account endpoint is being shown), endpoint (its name, for example
	 * `orders` or `lost-password`; only the names in SIGNED_OUT_REDIRECT_ENDPOINTS still redirect) and has_key (an
	 * email-verification or reset key in the address, which always stops the redirect).
	 *
	 * @param array $c Request facts.
	 * @return string|null
	 */
	public static function decide_signed_out( array $c ): ?string {
		$sign_in = trim( (string) ( $c['sign_in_url'] ?? '' ) );
		if ( '' === $sign_in || ! empty( $c['logged_in'] ) ) {
			return null;
		}
		if ( ! in_array( strtoupper( (string) ( $c['method'] ?? 'GET' ) ), array( 'GET', 'HEAD' ), true ) ) {
			return null;
		}
		foreach ( array( 'is_rest', 'is_ajax', 'is_cron', 'is_admin', 'is_preview', 'has_key' ) as $flag ) {
			if ( ! empty( $c[ $flag ] ) ) {
				return null;
			}
		}
		// An endpoint page stays as WooCommerce shows it (lost password, reset, verification) unless it is one of the
		// signed-in-only pages named in SIGNED_OUT_REDIRECT_ENDPOINTS.
		if ( ! empty( $c['has_endpoint'] ) && ! in_array( (string) ( $c['endpoint'] ?? '' ), self::SIGNED_OUT_REDIRECT_ENDPOINTS, true ) ) {
			return null;
		}
		$request = (string) ( $c['request_url'] ?? '' );
		if ( self::same_page( $request, $sign_in ) ) {
			return null;
		}
		$back = $request;
		if ( 0 === strpos( $request, '/' ) && 0 !== strpos( $request, '//' ) ) {
			// The request path starts at the host's root, so it already holds the folder of a site installed in a
			// subdirectory: it joins the site's origin, where home_url() would repeat the folder.
			$home   = (array) \wp_parse_url( \home_url() );
			$origin = ( $home['scheme'] ?? 'https' ) . '://' . ( $home['host'] ?? '' ) . ( isset( $home['port'] ) ? ':' . $home['port'] : '' );
			$back   = $origin . $request;
		}
		return $sign_in . ( false === strpos( $sign_in, '?' ) ? '?' : '&' ) . 'redirect_to=' . rawurlencode( $back );
	}

	/**
	 * The redirect after registration or login, as a pure function: WooCommerce's own `$redirect` unless it is the
	 * page the visitor came from and that page holds the setting.
	 *
	 * @param string $redirect    WooCommerce's chosen address.
	 * @param string $referer     The page the form was posted from.
	 * @param string $destination The referring page's setting, resolved ('' when it holds none).
	 * @return string
	 */
	public static function after_auth_target( string $redirect, string $referer, string $destination ): string {
		$destination = trim( $destination );
		if ( '' === $destination || '' === $referer || ! self::same_page( $redirect, $referer ) || self::same_page( $referer, $destination ) ) {
			return $redirect;
		}
		return $destination;
	}

	/**
	 * The resolved destination of the first sgs/account block with the setting in a parsed block tree.
	 *
	 * @param array $blocks Parsed blocks.
	 * @param int   $depth  Levels of synced patterns still to follow.
	 * @return string '' when none.
	 */
	public static function destination_in_blocks( array $blocks, int $depth = 3 ): string {
		return self::find_in_blocks( $blocks, array( __CLASS__, 'resolve' ), $depth );
	}

	/**
	 * The resolved sign-in page address of the first card-view sgs/account block that has one, in a parsed block tree.
	 *
	 * @param array $blocks Parsed blocks.
	 * @param int   $depth  Levels of synced patterns still to follow.
	 * @return string '' when none.
	 */
	public static function sign_in_url_in_blocks( array $blocks, int $depth = 3 ): string {
		return self::find_in_blocks( $blocks, array( __CLASS__, 'resolve_sign_in' ), $depth );
	}

	/**
	 * The first non-empty value of one attribute over the sgs/account blocks of a parsed tree (a request that is not
	 * the account page itself reads the account page's saved settings this way).
	 *
	 * @param array  $blocks Parsed blocks.
	 * @param string $attr   Attribute name.
	 * @return string '' when no account block sets it.
	 */
	public static function attr_in_blocks( array $blocks, string $attr ): string {
		return self::find_in_blocks(
			$blocks,
			static function ( array $attrs ) use ( $attr ): string {
				return is_scalar( $attrs[ $attr ] ?? null ) ? (string) $attrs[ $attr ] : '';
			},
			3
		);
	}

	/**
	 * The first non-empty result of `$resolver` over the sgs/account blocks of a parsed tree.
	 *
	 * @param array    $blocks   Parsed blocks.
	 * @param callable $resolver Takes a block's attributes, returns an address or ''.
	 * @param int      $depth    Levels of synced patterns still to follow.
	 * @return string '' when none.
	 */
	private static function find_in_blocks( array $blocks, callable $resolver, int $depth ): string {
		foreach ( $blocks as $block ) {
			if ( ! is_array( $block ) ) {
				continue;
			}
			$name  = (string) ( $block['blockName'] ?? '' );
			$attrs = (array) ( $block['attrs'] ?? array() );
			if ( 'sgs/account' === $name ) {
				$url = (string) $resolver( $attrs );
				if ( '' !== $url ) {
					return $url;
				}
			} elseif ( 'core/block' === $name && $depth > 0 && ! empty( $attrs['ref'] ) && function_exists( 'get_post' ) ) {
				$pattern = \get_post( (int) $attrs['ref'] );
				if ( $pattern && 'wp_block' === $pattern->post_type && 'publish' === $pattern->post_status ) {
					$url = self::find_in_blocks( \parse_blocks( (string) $pattern->post_content ), $resolver, $depth - 1 );
					if ( '' !== $url ) {
						return $url;
					}
				}
			}
			$url = self::find_in_blocks( (array) ( $block['innerBlocks'] ?? array() ), $resolver, $depth );
			if ( '' !== $url ) {
				return $url;
			}
		}
		return '';
	}

	/**
	 * One block's sign-in page address: set only for the card view (the in-between view that links on to sign in).
	 *
	 * @param array $attrs Block attributes.
	 * @return string '' when the block is not the card view or has no address.
	 */
	public static function resolve_sign_in( array $attrs ): string {
		if ( 'card' !== (string) ( $attrs['signedOutView'] ?? '' ) ) {
			return '';
		}
		$url = trim( sgs_link_source_href( (string) ( $attrs['signedOutSignInUrlSource'] ?? '' ), trim( (string) ( $attrs['signedOutSignInUrl'] ?? '' ) ) ) );
		if ( '' !== $url && '/' === $url[0] && 0 !== strpos( $url, '//' ) ) {
			$url = \home_url( $url );
		}
		return $url;
	}

	/**
	 * One block's destination from its attributes.
	 *
	 * @param array $attrs Block attributes.
	 * @return string '' when the setting is empty.
	 */
	public static function resolve( array $attrs ): string {
		$typed  = trim( (string) ( $attrs['signedInRedirectUrl'] ?? '' ) );
		$source = (string) ( $attrs['signedInRedirectUrlSource'] ?? '' );
		if ( '' === $typed && 'account' !== $source ) {
			return '';
		}
		$url = trim( sgs_link_source_href( $source, $typed ) );
		if ( '' !== $url && '/' === $url[0] && 0 !== strpos( $url, '//' ) ) {
			$url = \home_url( $url );
		}
		return $url;
	}

	/**
	 * The setting on one post's content.
	 *
	 * @param int $post_id Post id.
	 * @return string
	 */
	private static function destination_for_post( int $post_id ): string {
		$post = $post_id > 0 ? \get_post( $post_id ) : null;
		if ( ! $post ) {
			return '';
		}
		$content = (string) $post->post_content;
		if ( false === strpos( $content, 'wp:sgs/account' ) && false === strpos( $content, 'wp:block' ) ) {
			return '';
		}
		return self::destination_in_blocks( \parse_blocks( $content ) );
	}

	/**
	 * The card-view sign-in page address on one post's content.
	 *
	 * @param int $post_id Post id.
	 * @return string
	 */
	private static function sign_in_url_for_post( int $post_id ): string {
		$post = $post_id > 0 ? \get_post( $post_id ) : null;
		if ( ! $post ) {
			return '';
		}
		$content = (string) $post->post_content;
		if ( false === strpos( $content, 'wp:sgs/account' ) && false === strpos( $content, 'wp:block' ) ) {
			return '';
		}
		return self::sign_in_url_in_blocks( \parse_blocks( $content ) );
	}

	/**
	 * Request facts shared by both decisions.
	 *
	 * @return array
	 */
	private static function request_facts(): array {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- reads request facts only; nothing is saved.
		$endpoint = ( function_exists( 'is_wc_endpoint_url' ) && \is_wc_endpoint_url() ) || isset( $_GET['key'], $_GET['id'] ) || isset( $_GET['show-reset-form'] );
		$has_key  = isset( $_GET['key'] ) || isset( $_GET['id'] ) || isset( $_GET['show-reset-form'] ) || isset( $_GET['verify'] ) || isset( $_GET['verify_email'] ) || isset( $_GET['token'] );
		$preview  = \is_preview() || \is_customize_preview() || isset( $_GET['preview'] );
		// phpcs:enable WordPress.Security.NonceVerification.Recommended
		$current = function_exists( 'WC' ) && \WC()->query ? (string) \WC()->query->get_current_endpoint() : '';
		return array(
			'endpoint'     => $current,
			'method'       => isset( $_SERVER['REQUEST_METHOD'] ) ? \sanitize_text_field( \wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) : 'GET',
			'request_url'  => isset( $_SERVER['REQUEST_URI'] ) ? \esc_url_raw( \wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '',
			'is_rest'      => defined( 'REST_REQUEST' ) && REST_REQUEST,
			'is_ajax'      => \wp_doing_ajax(),
			'is_cron'      => \wp_doing_cron(),
			'is_admin'     => \is_admin(),
			'is_preview'   => $preview,
			'has_endpoint' => $endpoint,
			'has_key'      => $has_key,
		);
	}

	/** `template_redirect`: a signed-in visitor on a page that holds the setting goes to its destination; a signed-out visitor on the card-view account page goes to the sign-in page. */
	public static function maybe_redirect(): void {
		if ( ! \is_singular() ) {
			return;
		}
		$post = \get_queried_object();
		if ( ! $post instanceof \WP_Post ) {
			return;
		}
		$signed_in = \is_user_logged_in();
		if ( $signed_in ) {
			$address = self::destination_for_post( (int) $post->ID );
			$key     = 'destination';
		} else {
			$address = self::sign_in_url_for_post( (int) $post->ID );
			$key     = 'sign_in_url';
		}
		if ( '' === $address ) {
			return;
		}
		$facts  = self::request_facts() + array(
			'logged_in' => $signed_in,
			$key        => $address,
		);
		$target = $signed_in ? self::decide( $facts ) : self::decide_signed_out( $facts );
		if ( null !== $target ) {
			\wp_safe_redirect( $target, 302 );
			exit;
		}
	}

	/**
	 * `woocommerce_registration_redirect` / `woocommerce_login_redirect`: the destination in one hop when WooCommerce
	 * would return the visitor to a referring page that holds the setting.
	 *
	 * @param mixed $redirect WooCommerce's chosen address.
	 * @return mixed
	 */
	public static function after_auth( $redirect ) {
		if ( ! is_string( $redirect ) ) {
			return $redirect;
		}
		$referer = (string) \wp_get_referer();
		if ( '' === $referer ) {
			return $redirect;
		}
		$post_id = (int) \url_to_postid( $referer );
		return self::after_auth_target( $redirect, $referer, self::destination_for_post( $post_id ) );
	}
}
