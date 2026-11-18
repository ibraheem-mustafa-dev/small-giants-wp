<?php
/**
 * POST /sgs/v1/wishlist-cards: the saved-items panel's product cards.
 *
 * The cards layout of `sgs/wishlist-panel` shows every saved product as the site's own `sgs/product-card`, drawn from
 * the card the page author placed inside the panel (the template). A visitor's list lives in their browser (guest) or
 * their account, so the page cannot print the cards: the panel's script sends the saved product IDs here and gets back
 * each card's markup, rendered by the block's own render path with the template's settings, the product's identity over
 * them (`Card_Grid_Template::card_attrs`, the same merge a products-mode `sgs/card-grid` uses).
 *
 * The template's settings arrive from the browser, so they travel signed: the panel's render prints the template as a
 * JSON string with an HMAC of it (`sign_template`), and this route refuses any template whose HMAC does not match, so
 * a visitor can only render the cards the page's own author configured.
 *
 * Public by design: the answer is the same published, visible-product cards any shop page shows. The route renders no
 * draft, private, password-protected or hidden product, whatever ID it is sent, and takes at most MAX_IDS IDs a request.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/class-card-grid-template.php';

/**
 * The route, the template signature and the product filter.
 */
final class Wishlist_Cards_Rest {

	/** REST namespace. */
	public const REST_NAMESPACE = 'sgs/v1';

	/** REST route (without leading slash). */
	public const REST_ROUTE = 'wishlist-cards';

	/** The most product IDs one request may carry. The panel asks in chunks of this size. */
	public const MAX_IDS = 24;

	/** The longest template JSON the route reads (bytes): a card with a long custom stylesheet is a few KB. */
	public const MAX_TEMPLATE_BYTES = 65536;

	/** Card settings the panel owns: the saved-items panel draws its own remove control, so the card's heart is off. */
	public const FORCED_ATTRS = array(
		'sourceMode'   => 'wc-product',
		'showWishlist' => false,
	);

	/**
	 * Wire the route and the panel's `skip_inner_blocks` registration.
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_route' ) );
		\add_filter( 'block_type_metadata_settings', array( __CLASS__, 'metadata_settings' ), 10, 2 );
	}

	/**
	 * `block_type_metadata_settings` filter: registers the panel with `skip_inner_blocks` (as `sgs/card-grid` does), so
	 * WordPress never renders the template card on the page; the panel's render reads its settings instead.
	 *
	 * @param array $settings Block type settings.
	 * @param array $metadata The block.json metadata.
	 * @return array
	 */
	public static function metadata_settings( $settings, $metadata ) {
		if ( \is_array( $settings ) && \is_array( $metadata ) && 'sgs/wishlist-panel' === ( $metadata['name'] ?? '' ) ) {
			$settings['skip_inner_blocks'] = true;
		}
		return $settings;
	}

	/**
	 * Register POST /sgs/v1/wishlist-cards.
	 */
	public static function register_route(): void {
		\register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_ROUTE,
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'handle' ),
				// Public by design: see the file header. The handler checks the template's signature and renders
				// only published, visible products.
				'permission_callback' => '__return_true',
				'args'                => array(
					'ids'      => array(
						'required'          => true,
						'type'              => 'array',
						'items'             => array( 'type' => 'integer' ),
						'maxItems'          => self::MAX_IDS,
						'validate_callback' => array( __CLASS__, 'validate_ids' ),
						'sanitize_callback' => array( __CLASS__, 'normalise_ids' ),
						'description'       => \__( 'The saved product IDs to draw cards for.', 'sgs-blocks' ),
					),
					'template' => array(
						'required'          => true,
						'type'              => 'string',
						'validate_callback' => static function ( $value ): bool {
							return \is_string( $value ) && '' !== $value && \strlen( $value ) <= self::MAX_TEMPLATE_BYTES;
						},
						'description'       => \__( 'The panel template card, as the panel printed it.', 'sgs-blocks' ),
					),
					'sig'      => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'description'       => \__( 'The signature the panel printed with the template.', 'sgs-blocks' ),
					),
				),
			)
		);
	}

	/**
	 * Validate_callback for `ids`: a list of at most MAX_IDS numeric values.
	 *
	 * @param mixed $value Raw request value.
	 * @return bool
	 */
	public static function validate_ids( $value ): bool {
		if ( ! \is_array( $value ) || \count( $value ) > self::MAX_IDS ) {
			return false;
		}
		foreach ( $value as $id ) {
			if ( ! ( \is_int( $id ) && $id > 0 ) && ! ( \is_string( $id ) && \ctype_digit( $id ) ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Sanitize_callback for `ids`: positive integers, duplicates dropped, order kept, at most MAX_IDS.
	 *
	 * @param mixed $value Raw request value.
	 * @return int[]
	 */
	public static function normalise_ids( $value ): array {
		$ids = array();
		foreach ( \is_array( $value ) ? $value : array() as $raw ) {
			$id = \is_numeric( $raw ) ? (int) $raw : 0;
			if ( $id > 0 && ! \in_array( $id, $ids, true ) ) {
				$ids[] = $id;
			}
			if ( \count( $ids ) >= self::MAX_IDS ) {
				break;
			}
		}
		return $ids;
	}

	/**
	 * The template as the panel prints it: JSON, and the HMAC the route checks.
	 *
	 * @param array<string,mixed> $template The template card's attributes (`Card_Grid_Template::template_attrs`).
	 * @return array{template:string,sig:string}
	 */
	public static function sign_template( array $template ): array {
		$json = (string) \wp_json_encode( (object) $template );
		return array(
			'template' => $json,
			'sig'      => self::signature( $json ),
		);
	}

	/**
	 * Whether a template string carries the signature the panel printed for it.
	 *
	 * @param string $json Template JSON.
	 * @param string $sig  Signature.
	 * @return bool
	 */
	public static function verify_template( string $json, string $sig ): bool {
		return '' !== $sig && \hash_equals( self::signature( $json ), $sig );
	}

	/**
	 * The HMAC of a template string, keyed to this site.
	 *
	 * @param string $json Template JSON.
	 * @return string
	 */
	private static function signature( string $json ): string {
		return \hash_hmac( 'sha256', $json, \wp_salt( 'auth' ) . '|sgs-wishlist-cards' );
	}

	/**
	 * Whether a product may be drawn for any visitor: published, visible in the catalogue, not password protected.
	 *
	 * @param int $product_id Product ID.
	 * @return bool
	 */
	public static function is_listable( int $product_id ): bool {
		if ( $product_id <= 0 || 'publish' !== \get_post_status( $product_id ) || ! \function_exists( 'wc_get_product' ) ) {
			return false;
		}
		$product = \wc_get_product( $product_id );
		if ( ! $product || ! $product->is_visible() ) {
			return false;
		}
		return '' === (string) \get_post_field( 'post_password', $product_id );
	}

	/**
	 * One product's card attributes: the template, then the product's identity and the settings the panel owns.
	 *
	 * @param array<string,mixed> $template   The template card's attributes.
	 * @param int                 $product_id Product ID.
	 * @return array<string,mixed>
	 */
	public static function card_attrs( array $template, int $product_id ): array {
		return Card_Grid_Template::card_attrs( $template, array( 'productId' => $product_id ) + self::FORCED_ATTRS );
	}

	/**
	 * POST /wishlist-cards: the card markup for each listable product, in the order asked.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function handle( \WP_REST_Request $request ) {
		$json = (string) $request->get_param( 'template' );
		if ( ! self::verify_template( $json, (string) $request->get_param( 'sig' ) ) ) {
			return new \WP_Error( 'sgs_wishlist_cards_bad_template', \__( 'That card template was not recognised.', 'sgs-blocks' ), array( 'status' => 403 ) );
		}
		$template = \json_decode( $json, true );
		if ( ! \is_array( $template ) ) {
			return new \WP_Error( 'sgs_wishlist_cards_bad_template', \__( 'That card template was not recognised.', 'sgs-blocks' ), array( 'status' => 400 ) );
		}

		$items = array();
		foreach ( self::normalise_ids( $request->get_param( 'ids' ) ) as $product_id ) {
			if ( ! self::is_listable( $product_id ) ) {
				continue;
			}
			$items[] = array(
				'id'   => $product_id,
				'html' => (string) \render_block(
					array(
						'blockName'    => 'sgs/product-card',
						'attrs'        => self::card_attrs( $template, $product_id ),
						'innerBlocks'  => array(),
						'innerHTML'    => '',
						'innerContent' => array(),
					)
				),
			);
		}

		return new \WP_REST_Response( array( 'items' => $items ), 200 );
	}
}
