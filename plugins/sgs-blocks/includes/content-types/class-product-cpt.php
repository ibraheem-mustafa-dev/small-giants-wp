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
		\add_action( 'enqueue_block_editor_assets', array( __CLASS__, 'enqueue_editor_assets' ) );
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
				'supports'           => array( 'title', 'editor', 'thumbnail', 'excerpt', 'revisions', 'custom-fields' ),
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
				'auth_callback'     => static function ( $allowed, $meta_key, $post_id ) {
					// Per-object check (IDOR guard): a user must be able to edit
					// THIS product, not merely hold the general edit_posts cap.
					return \current_user_can( 'edit_post', $post_id );
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
				'auth_callback'     => static function ( $allowed, $meta_key, $post_id ) {
					// Per-object check (IDOR guard): a user must be able to edit
					// THIS product, not merely hold the general edit_posts cap.
					return \current_user_can( 'edit_post', $post_id );
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
				'auth_callback'     => static function ( $allowed, $meta_key, $post_id ) {
					// Per-object check (IDOR guard): a user must be able to edit
					// THIS product, not merely hold the general edit_posts cap.
					return \current_user_can( 'edit_post', $post_id );
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
				'auth_callback'     => static function ( $allowed, $meta_key, $post_id ) {
					// Per-object check (IDOR guard): a user must be able to edit
					// THIS product, not merely hold the general edit_posts cap.
					return \current_user_can( 'edit_post', $post_id );
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
				'auth_callback'     => static function ( $allowed, $meta_key, $post_id ) {
					// Per-object check (IDOR guard): a user must be able to edit
					// THIS product, not merely hold the general edit_posts cap.
					return \current_user_can( 'edit_post', $post_id );
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
				'auth_callback'     => static function ( $allowed, $meta_key, $post_id ) {
					// Per-object check (IDOR guard): a user must be able to edit
					// THIS product, not merely hold the general edit_posts cap.
					return \current_user_can( 'edit_post', $post_id );
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
				'auth_callback'     => static function ( $allowed, $meta_key, $post_id ) {
					// Per-object check (IDOR guard): a user must be able to edit
					// THIS product, not merely hold the general edit_posts cap.
					return \current_user_can( 'edit_post', $post_id );
				},
			)
		);

		// _sgs_variation_sets — variation type definitions (FR-24-11, Spec 24).
		//
		// Each element describes one variation TYPE (e.g. pack-size, flavour).
		// Schema per item:
		// type_key        string   — machine key, e.g. "pack-size"
		// type_label      string   — human label, e.g. "Number in Pack"
		// display_as      string   — "pills" | "static-list" | "hidden" (D144.1)
		// content_impact  string[] — card slots this type changes, e.g. ["price"]
		// options         object[] — [ { key: string, label: string }, … ]
		//
		// Leading underscore makes this a private meta key — not surfaced by
		// core/post-meta Block Bindings (intentional: this is CPT config, not
		// a bindable content field). Uses show_in_rest with a full schema so the
		// REST API can read/write it for the editor panel.
		\register_meta(
			$object_type,
			'_sgs_variation_sets',
			array(
				'object_subtype'    => $object_subtype,
				'type'              => 'array',
				'description'       => \__( 'Variation type definitions for this product (FR-24-11). Each entry describes one variation type (pack-size, flavour, etc.) with its display mode and content-impact slots.', 'sgs-blocks' ),
				'single'            => true,
				'default'           => array(),
				'show_in_rest'      => array(
					'schema' => array(
						'type'  => 'array',
						'items' => array(
							'type'                 => 'object',
							'additionalProperties' => false,
							'required'             => array( 'type_key', 'type_label', 'display_as', 'content_impact', 'options' ),
							'properties'           => array(
								'type_key'       => array(
									'type'        => 'string',
									'description' => 'Machine-readable key for this variation type, e.g. "pack-size".',
								),
								'type_label'     => array(
									'type'        => 'string',
									'description' => 'Human-readable label shown to the client, e.g. "Number in Pack".',
								),
								'display_as'     => array(
									'type'        => 'string',
									'enum'        => array( 'pills', 'static-list', 'hidden' ),
									'description' => 'How this type renders on the card: interactive pills, a static sentence, or hidden (price-only mode).',
								),
								'content_impact' => array(
									'type'        => 'array',
									'description' => 'Which card slots this type changes when a different option is selected, e.g. ["price"] or ["image","description"].',
									'items'       => array( 'type' => 'string' ),
								),
								'options'        => array(
									'type'        => 'array',
									'description' => 'The selectable options for this variation type.',
									'items'       => array(
										'type'       => 'object',
										'additionalProperties' => false,
										'required'   => array( 'key', 'label' ),
										'properties' => array(
											'key'   => array(
												'type' => 'string',
												'description' => 'Machine key for this option, e.g. "8pack".',
											),
											'label' => array(
												'type' => 'string',
												'description' => 'Display label for this option, e.g. "8-pack".',
											),
										),
									),
								),
							),
						),
					),
				),
				'sanitize_callback' => array( __CLASS__, 'sanitize_variation_sets' ),
				'auth_callback'     => static function ( $allowed, $meta_key, $post_id ) {
					return \current_user_can( 'edit_post', $post_id );
				},
			)
		);

		// _sgs_sku_matrix — multi-dimension price matrix (FR-24-14, Phase 2 DEFERRED).
		//
		// Phase 1: when two variation types both list a price-affecting slot, the
		// first type wins and the editor shows a warning (D144.2). The SKU matrix
		// (per-combination pricing) is a Phase 2 concern; registering the key now
		// ensures REST-safe access when Phase 2 ships without a database migration.
		//
		// Stored as a JSON string — the per-combination schema is not finalised yet
		// and a string avoids committing to a fixed `items` shape.
		\register_meta(
			$object_type,
			'_sgs_sku_matrix',
			array(
				'object_subtype'    => $object_subtype,
				'type'              => 'string',
				'description'       => \__( 'Phase-2-deferred: JSON-encoded per-combination SKU price matrix. Empty until the SKU matrix feature ships.', 'sgs-blocks' ),
				'single'            => true,
				'default'           => '',
				'show_in_rest'      => true,
				'sanitize_callback' => static function ( $value ) {
					// Phase 2 deferred — accept only empty string or valid JSON object.
					if ( '' === $value ) {
						return '';
					}
					$decoded = \json_decode( $value, true );
					if ( \JSON_ERROR_NONE !== \json_last_error() || ! \is_array( $decoded ) ) {
						return '';
					}
					return (string) \wp_json_encode( $decoded );
				},
				'auth_callback'     => static function ( $allowed, $meta_key, $post_id ) {
					return \current_user_can( 'edit_post', $post_id );
				},
			)
		);
	}

	/**
	 * Sanitise the `_sgs_variation_sets` meta value.
	 *
	 * Validates and sanitises every field in each variation-type object.
	 * Invalid or unknown fields are stripped; invalid items are dropped
	 * entirely so the meta never stores a partially-corrupt entry.
	 *
	 * @param mixed $raw_value The incoming value before persistence.
	 * @return array Sanitised array (may be empty on total rejection).
	 */
	public static function sanitize_variation_sets( $raw_value ): array {
		if ( ! \is_array( $raw_value ) ) {
			return array();
		}

		$valid_display_as = array( 'pills', 'static-list', 'hidden' );
		$sanitised        = array();

		foreach ( $raw_value as $raw_type ) {
			if ( ! \is_array( $raw_type ) ) {
				continue;
			}

			// Required fields — skip this item if any required field is absent.
			if (
				empty( $raw_type['type_key'] ) ||
				! isset( $raw_type['type_label'] ) ||
				! isset( $raw_type['display_as'] ) ||
				! isset( $raw_type['content_impact'] ) ||
				! isset( $raw_type['options'] )
			) {
				continue;
			}

			$type_key   = \sanitize_key( $raw_type['type_key'] );
			$type_label = \sanitize_text_field( $raw_type['type_label'] );
			$display_as = \in_array( $raw_type['display_as'], $valid_display_as, true )
				? $raw_type['display_as']
				: 'pills';

			// content_impact — array of sanitised slot-name strings.
			$content_impact = array();
			if ( \is_array( $raw_type['content_impact'] ) ) {
				foreach ( $raw_type['content_impact'] as $slot ) {
					$clean = \sanitize_key( (string) $slot );
					if ( '' !== $clean ) {
						$content_impact[] = $clean;
					}
				}
			}

			// options — array of { key, label } pairs.
			$options = array();
			if ( \is_array( $raw_type['options'] ) ) {
				foreach ( $raw_type['options'] as $raw_opt ) {
					if ( ! \is_array( $raw_opt ) ) {
						continue;
					}
					$opt_key   = isset( $raw_opt['key'] ) ? \sanitize_key( $raw_opt['key'] ) : '';
					$opt_label = isset( $raw_opt['label'] ) ? \sanitize_text_field( $raw_opt['label'] ) : '';
					if ( '' === $opt_key ) {
						continue; // A key-less option is meaningless — skip.
					}
					$options[] = array(
						'key'   => $opt_key,
						'label' => $opt_label,
					);
				}
			}

			if ( '' === $type_key ) {
				continue; // Drop any item whose key sanitised to empty.
			}

			$sanitised[] = array(
				'type_key'       => $type_key,
				'type_label'     => $type_label,
				'display_as'     => $display_as,
				'content_impact' => $content_impact,
				'options'        => $options,
			);
		}

		return $sanitised;
	}

	/**
	 * Enqueue the variation-sets editor panel on the `sgs_product` edit screen.
	 *
	 * Runs on `enqueue_block_editor_assets`. The script is only enqueued when
	 * the current screen is the block editor for `sgs_product` posts — keeps
	 * the payload zero on every other editor screen.
	 *
	 * The compiled bundle lives at build/plugins/product-variation-sets/index.js
	 * (entry point: src/plugins/product-variation-sets/index.js).
	 */
	public static function enqueue_editor_assets(): void {
		// Guard: block editor for sgs_product only.
		$screen = \get_current_screen();
		if (
			! $screen ||
			'post' !== $screen->base ||
			self::POST_TYPE !== $screen->post_type
		) {
			return;
		}

		$asset_file = \SGS_BLOCKS_PATH . 'build/plugins/product-variation-sets/index.asset.php';
		if ( ! \file_exists( $asset_file ) ) {
			// Bundle not yet compiled — silent no-op so the CPT works without
			// the JS asset (e.g. on a fresh clone before `npm run build`).
			return;
		}

		$asset = require $asset_file;

		\wp_enqueue_script(
			'sgs-product-variation-sets',
			\SGS_BLOCKS_URL . 'build/plugins/product-variation-sets/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
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
