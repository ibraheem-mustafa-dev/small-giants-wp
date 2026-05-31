<?php
/**
 * SGS Product content type — CPT, taxonomies, and meta registration.
 *
 * Registers the `sgs_product` CPT, the `sgs_product_cat` and `sgs_product_tag`
 * taxonomies, and all product meta fields with full Block Bindings compatibility
 * (`show_in_rest => true`, no leading-underscore keys so the `core/post-meta`
 * binding source can resolve them directly).
 *
 * Per-site opt-in (Spec 24 FR-24-1):
 *   Phase A registers unconditionally so the Mama's Munches test data can be
 *   seeded and validated without extra config. A capability-flag gating mechanism
 *   (theme_support / wp_options) is a Spec 24 Phase A follow-up task before the
 *   framework ships to non-product sites.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Product_CPT
 *
 * Registers the sgs_product content type and all associated taxonomy +
 * meta infrastructure required by Spec 24 FR-24-1.
 */
final class Product_CPT {

	/** CPT slug. */
	public const POST_TYPE = 'sgs_product';

	/** Product category taxonomy slug. */
	public const TAX_CAT = 'sgs_product_cat';

	/** Product tag taxonomy slug. */
	public const TAX_TAG = 'sgs_product_tag';

	/**
	 * Wire WordPress hooks. Called once from the plugin bootstrap.
	 */
	public static function register(): void {
		\add_action( 'init', array( __CLASS__, 'register_post_type' ), 5 );
		\add_action( 'init', array( __CLASS__, 'register_taxonomies' ), 5 );
		\add_action( 'init', array( __CLASS__, 'register_meta' ), 10 );
		\add_action( 'admin_menu', array( __CLASS__, 'register_submenu' ) );
	}

	/**
	 * Register the `sgs_product` custom post type.
	 *
	 * `show_in_rest => true` is required for Block Editor support and the
	 * `core/post-meta` Block Bindings source.
	 *
	 * `capabilities`: primitive caps only, mapped to `edit_posts` primitives so
	 * standard Editor-role users can manage products. `map_meta_cap => true` lets
	 * WordPress core derive the per-object meta-caps (`edit_post`, `delete_post`,
	 * etc.) from the registered primitives — never list meta-caps in `capabilities`
	 * (core issues a `_doing_it_wrong` notice and breaks meta-cap mapping).
	 */
	public static function register_post_type(): void {
		$labels = array(
			'name'                  => \__( 'Products', 'sgs-blocks' ),
			'singular_name'         => \__( 'Product', 'sgs-blocks' ),
			'add_new'               => \__( 'Add New', 'sgs-blocks' ),
			'add_new_item'          => \__( 'Add New Product', 'sgs-blocks' ),
			'edit_item'             => \__( 'Edit Product', 'sgs-blocks' ),
			'new_item'              => \__( 'New Product', 'sgs-blocks' ),
			'view_item'             => \__( 'View Product', 'sgs-blocks' ),
			'view_items'            => \__( 'View Products', 'sgs-blocks' ),
			'search_items'          => \__( 'Search Products', 'sgs-blocks' ),
			'not_found'             => \__( 'No products found.', 'sgs-blocks' ),
			'not_found_in_trash'    => \__( 'No products found in Trash.', 'sgs-blocks' ),
			'all_items'             => \__( 'All Products', 'sgs-blocks' ),
			'archives'              => \__( 'Product Archives', 'sgs-blocks' ),
			'attributes'            => \__( 'Product Attributes', 'sgs-blocks' ),
			'insert_into_item'      => \__( 'Insert into product', 'sgs-blocks' ),
			'uploaded_to_this_item' => \__( 'Uploaded to this product', 'sgs-blocks' ),
			'menu_name'             => \__( 'Products', 'sgs-blocks' ),
			'name_admin_bar'        => \__( 'Product', 'sgs-blocks' ),
		);

		\register_post_type(
			self::POST_TYPE,
			array(
				'labels'             => $labels,
				'description'        => \__( 'SGS product entries — used by the query-driven card system (Spec 24).', 'sgs-blocks' ),
				'public'             => true,
				'publicly_queryable' => true,
				'show_ui'            => true,
				'show_in_menu'       => false, // Surfaced via SGS admin submenu below.
				'show_in_rest'       => true,  // Required for Block Editor + Block Bindings.
				'rest_base'          => 'sgs-products',
				'supports'           => array( 'title', 'editor', 'thumbnail', 'excerpt', 'revisions' ),
				'has_archive'        => true,
				'rewrite'            => array(
					'slug'       => 'products',
					'with_front' => false,
				),
				'query_var'          => true,
				'capability_type'    => 'post', // Use built-in post primitives.
				'map_meta_cap'       => true,
				// Primitive caps only — core derives per-object meta-caps from these.
				'capabilities'       => array(
					'read'                   => 'read',
					'read_private_posts'     => 'read_private_posts',
					'edit_posts'             => 'edit_posts',
					'edit_private_posts'     => 'edit_private_posts',
					'edit_published_posts'   => 'edit_published_posts',
					'edit_others_posts'      => 'edit_others_posts',
					'publish_posts'          => 'publish_posts',
					'delete_posts'           => 'delete_posts',
					'delete_private_posts'   => 'delete_private_posts',
					'delete_published_posts' => 'delete_published_posts',
					'delete_others_posts'    => 'delete_others_posts',
					'create_posts'           => 'edit_posts',
				),
			)
		);
	}

	/**
	 * Register `sgs_product_cat` and `sgs_product_tag` taxonomies.
	 *
	 * Both are publicly queryable and REST-exposed so the Query Loop block
	 * and Block Bindings can filter by them.
	 */
	public static function register_taxonomies(): void {

		// --- Product Category ---------------------------------------------------
		\register_taxonomy(
			self::TAX_CAT,
			self::POST_TYPE,
			array(
				'labels'            => array(
					'name'              => \__( 'Product Categories', 'sgs-blocks' ),
					'singular_name'     => \__( 'Product Category', 'sgs-blocks' ),
					'search_items'      => \__( 'Search Product Categories', 'sgs-blocks' ),
					'all_items'         => \__( 'All Product Categories', 'sgs-blocks' ),
					'parent_item'       => \__( 'Parent Category', 'sgs-blocks' ),
					'parent_item_colon' => \__( 'Parent Category:', 'sgs-blocks' ),
					'edit_item'         => \__( 'Edit Product Category', 'sgs-blocks' ),
					'update_item'       => \__( 'Update Product Category', 'sgs-blocks' ),
					'add_new_item'      => \__( 'Add New Product Category', 'sgs-blocks' ),
					'new_item_name'     => \__( 'New Product Category Name', 'sgs-blocks' ),
					'menu_name'         => \__( 'Categories', 'sgs-blocks' ),
				),
				'hierarchical'      => true,  // Category-style (not tag-style).
				'show_in_rest'      => true,
				'show_ui'           => true,
				'show_admin_column' => true,
				'query_var'         => true,
				'rewrite'           => array( 'slug' => 'product-category' ),
			)
		);

		// --- Product Tag --------------------------------------------------------
		\register_taxonomy(
			self::TAX_TAG,
			self::POST_TYPE,
			array(
				'labels'       => array(
					'name'                       => \__( 'Product Tags', 'sgs-blocks' ),
					'singular_name'              => \__( 'Product Tag', 'sgs-blocks' ),
					'search_items'               => \__( 'Search Product Tags', 'sgs-blocks' ),
					'popular_items'              => \__( 'Popular Product Tags', 'sgs-blocks' ),
					'all_items'                  => \__( 'All Product Tags', 'sgs-blocks' ),
					'edit_item'                  => \__( 'Edit Product Tag', 'sgs-blocks' ),
					'update_item'                => \__( 'Update Product Tag', 'sgs-blocks' ),
					'add_new_item'               => \__( 'Add New Product Tag', 'sgs-blocks' ),
					'new_item_name'              => \__( 'New Product Tag Name', 'sgs-blocks' ),
					'separate_items_with_commas' => \__( 'Separate tags with commas', 'sgs-blocks' ),
					'add_or_remove_items'        => \__( 'Add or remove product tags', 'sgs-blocks' ),
					'choose_from_most_used'      => \__( 'Choose from the most used tags', 'sgs-blocks' ),
					'menu_name'                  => \__( 'Tags', 'sgs-blocks' ),
				),
				'hierarchical' => false, // Tag-style (flat).
				'show_in_rest' => true,
				'show_ui'      => true,
				'query_var'    => true,
				'rewrite'      => array( 'slug' => 'product-tag' ),
			)
		);
	}

	/**
	 * Register all product meta fields.
	 *
	 * Keys use the public `sgs_*` prefix (no leading underscore) so the
	 * `core/post-meta` Block Bindings source can surface them without a custom
	 * binding source (Spec 24 FR-24-1 note).
	 *
	 * Fields registered here:
	 *
	 * | Key                | Type    | Notes                                          |
	 * |--------------------|---------|------------------------------------------------|
	 * | sgs_price          | number  | Base price (lowest pack, or single price)      |
	 * | sgs_price_note     | string  | Label shown next to price, e.g. "from"         |
	 * | sgs_featured       | boolean | Drives FR-24-5 "Featured/Starred" preset       |
	 * | sgs_badge          | string  | Short badge label, e.g. "Best value"           |
	 * | sgs_description    | string  | Marketing description (plain text or HTML)     |
	 * | sgs_pack_options   | string  | JSON-encoded array of pack option objects      |
	 * | sgs_views          | number  | View counter (FR-24-7, off by default)         |
	 *
	 * sgs_pack_options is stored as a JSON string rather than a native WP
	 * array/object meta because `register_meta` with `type => 'array'` requires
	 * a fixed `items` schema, and pack options vary per product. The Block
	 * Bindings layer (Phase A+) will decode this via a custom `get_value_callback`
	 * binding source.
	 */
	public static function register_meta(): void {

		$object_type    = 'post';
		$object_subtype = self::POST_TYPE;

		// sgs_price — base price (number).
		\register_meta(
			$object_type,
			'sgs_price',
			array(
				'object_subtype'    => $object_subtype,
				'type'              => 'number',
				'description'       => \__( 'Base product price.', 'sgs-blocks' ),
				'single'            => true,
				'default'           => 0.0,
				'show_in_rest'      => true,
				'sanitize_callback' => static function ( $value ) {
					return (float) $value;
				},
				'auth_callback'     => static function () {
					return \current_user_can( 'edit_posts' );
				},
			)
		);

		// sgs_price_note — descriptive price label (string).
		\register_meta(
			$object_type,
			'sgs_price_note',
			array(
				'object_subtype'    => $object_subtype,
				'type'              => 'string',
				'description'       => \__( 'Label shown alongside the price, e.g. "from" or "each".', 'sgs-blocks' ),
				'single'            => true,
				'default'           => '',
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => static function () {
					return \current_user_can( 'edit_posts' );
				},
			)
		);

		// sgs_featured — boolean featured flag.
		\register_meta(
			$object_type,
			'sgs_featured',
			array(
				'object_subtype'    => $object_subtype,
				'type'              => 'boolean',
				'description'       => \__( 'Mark this product as featured (surfaces in Featured preset).', 'sgs-blocks' ),
				'single'            => true,
				'default'           => false,
				'show_in_rest'      => true,
				'sanitize_callback' => static function ( $value ) {
					return (bool) $value;
				},
				'auth_callback'     => static function () {
					return \current_user_can( 'edit_posts' );
				},
			)
		);

		// sgs_badge — short badge label (string).
		\register_meta(
			$object_type,
			'sgs_badge',
			array(
				'object_subtype'    => $object_subtype,
				'type'              => 'string',
				'description'       => \__( 'Short badge label displayed on the product card, e.g. "Best value".', 'sgs-blocks' ),
				'single'            => true,
				'default'           => '',
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => static function () {
					return \current_user_can( 'edit_posts' );
				},
			)
		);

		// sgs_description — marketing description (string, may contain basic HTML).
		\register_meta(
			$object_type,
			'sgs_description',
			array(
				'object_subtype'    => $object_subtype,
				'type'              => 'string',
				'description'       => \__( 'Marketing description shown on the product card.', 'sgs-blocks' ),
				'single'            => true,
				'default'           => '',
				'show_in_rest'      => true,
				'sanitize_callback' => static function ( $value ) {
					// Allow only the inline HTML that a product blurb might need.
					return \wp_kses(
						$value,
						array(
							'strong' => array(),
							'em'     => array(),
							'br'     => array(),
						)
					);
				},
				'auth_callback'     => static function () {
					return \current_user_can( 'edit_posts' );
				},
			)
		);

		// sgs_pack_options — JSON-encoded array of pack option objects.
		// Each option: { "label": "8-pack", "qty": 8, "price": 10.00, "default": true }
		// Stored as a JSON string because register_meta 'type' => 'array' requires a
		// fixed items schema. Phase B binding source will decode this on render.
		\register_meta(
			$object_type,
			'sgs_pack_options',
			array(
				'object_subtype'    => $object_subtype,
				'type'              => 'string',
				'description'       => \__( 'JSON-encoded array of pack size options. Each: {"label","qty","price","default"}.', 'sgs-blocks' ),
				'single'            => true,
				'default'           => '',
				'show_in_rest'      => true,
				'sanitize_callback' => static function ( $value ) {
					// Accept only valid JSON; reject everything else.
					if ( '' === $value ) {
						return '';
					}
					$decoded = json_decode( $value, true );
					if ( null === $decoded || ! is_array( $decoded ) ) {
						return '';
					}
					// Re-encode to strip any unexpected whitespace / injection.
					return (string) wp_json_encode( $decoded );
				},
				'auth_callback'     => static function () {
					return \current_user_can( 'edit_posts' );
				},
			)
		);

		// sgs_views — view counter for FR-24-7 "Most-popular" preset.
		// Off by default; the view-counter write path is a Phase D addition.
		\register_meta(
			$object_type,
			'sgs_views',
			array(
				'object_subtype'    => $object_subtype,
				'type'              => 'number',
				'description'       => \__( 'View counter (FR-24-7). Incremented by the optional popularity module.', 'sgs-blocks' ),
				'single'            => true,
				'default'           => 0,
				'show_in_rest'      => true,
				'sanitize_callback' => 'absint',
				'auth_callback'     => static function () {
					return \current_user_can( 'edit_posts' );
				},
			)
		);
	}

	/**
	 * Add "Products" submenu under the SGS top-level admin menu.
	 */
	public static function register_submenu(): void {
		\add_submenu_page(
			Sgs_Admin_Menu::MENU_SLUG,
			\__( 'Products', 'sgs-blocks' ),
			\__( 'Products', 'sgs-blocks' ),
			'edit_posts',
			'edit.php?post_type=' . self::POST_TYPE,
			''
		);
	}
}
