<?php
/**
 * SGS Product Templates — sgs_product_template CPT registration.
 *
 * Extracted from class-product-templates.php to keep both files under the
 * 300-line limit (code-quality.md rule). Product_Templates requires this file
 * and hooks register_post_type() onto init; no external code should reference
 * this class directly.
 *
 * @package SGS\Blocks
 * @since   1.8.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the sgs_product_template custom post type.
 *
 * @internal Used only by Product_Templates.
 */
final class Product_Templates_CPT {

	/** CPT slug — canonical definition (Product_Templates::POST_TYPE aliases it). */
	const POST_TYPE = 'sgs_product_template';

	/**
	 * Register the sgs_product_template CPT.
	 *
	 * Not public, no front-end, show_ui => false (REST-managed agency tool).
	 * supports => ['title', 'custom-fields'] — 'custom-fields' is required when
	 * any meta is registered with show_in_rest (known project rule). The template
	 * payload lives in post_content (single source; no parallel meta).
	 *
	 * Capability map: only manage_woocommerce users can create/edit/delete.
	 * map_meta_cap => true lets WP core derive per-object meta-caps from the
	 * primitives. PLURAL PRIMITIVES ONLY — listing a singular meta-cap
	 * (edit_post/read_post/delete_post) here registers its VALUE
	 * ('manage_woocommerce') as a meta-capability in WP's reverse map, which
	 * makes every plain current_user_can('manage_woocommerce') on the site
	 * return false + log a map_meta_cap _doing_it_wrong notice. Caught live
	 * 2026-06-10: the original map broke manage_woocommerce site-wide.
	 *
	 * @return void
	 */
	public static function register_post_type(): void {
		$caps = array(
			'edit_posts'             => 'manage_woocommerce',
			'edit_others_posts'      => 'manage_woocommerce',
			'edit_private_posts'     => 'manage_woocommerce',
			'edit_published_posts'   => 'manage_woocommerce',
			'publish_posts'          => 'manage_woocommerce',
			'read_private_posts'     => 'manage_woocommerce',
			'delete_posts'           => 'manage_woocommerce',
			'delete_others_posts'    => 'manage_woocommerce',
			'delete_private_posts'   => 'manage_woocommerce',
			'delete_published_posts' => 'manage_woocommerce',
			'create_posts'           => 'manage_woocommerce',
		);

		\register_post_type(
			self::POST_TYPE,
			array(
				'label'              => \__( 'Product Templates', 'sgs-blocks' ),
				'public'             => false,
				'publicly_queryable' => false,
				'show_ui'            => false,
				'show_in_menu'       => false,
				'show_in_nav_menus'  => false,
				'show_in_admin_bar'  => false,
				'show_in_rest'       => false, // REST access via our own routes only.
				'rewrite'            => false,
				'query_var'          => false,
				'delete_with_user'   => false,
				'has_archive'        => false,
				'hierarchical'       => false,
				'supports'           => array( 'title', 'custom-fields' ),
				'capability_type'    => 'post',
				'capabilities'       => $caps,
				'map_meta_cap'       => true,
			)
		);
	}
}
