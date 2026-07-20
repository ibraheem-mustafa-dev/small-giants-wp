<?php
/**
 * SGS Mega Menu — `sgs_mega_menu` CPT registration + native-menu resolution
 * (FR-36-3, FR-36-5, FR-36-9a, Spec 36).
 *
 * A mega panel is a per-client, block-based post edited in its own findable
 * admin screen (mirrors `sgs_header`/`sgs_footer`, FR-36-3). It is attached
 * to a nav menu item the ordinary WordPress way — added to a classic menu in
 * Appearance -> Menus, exactly like adding a page (FR-36-5) — so no bespoke
 * map or minted ID exists anywhere in this class. WordPress stores the
 * post's real ID on the menu item as `_menu_item_object_id`.
 *
 * The CPT is NAV-ONLY (operator decision): a mega panel is never viewable
 * as a standalone web page. `public => false` / `publicly_queryable =>
 * false` mean the top-level trigger link never resolves to a permalink;
 * every nav item pointing at a mega panel must resolve via
 * {@see resolve_panel_for_menu_item()} or degrade to `#`/plain-link
 * (FR-36-9a). `show_in_nav_menus => true` still works independently of
 * `public` — the "add items" panel reads `get_post_types( array(
 * 'show_in_nav_menus' => true ) )`, so Appearance -> Menus is unaffected.
 *
 * That same `show_in_nav_menus => true` does not default the "add items"
 * panel's Screen Options checkbox to visible for a new post type. {@see
 * record_pre_seed_state()} + {@see fix_nav_menus_metabox_visibility()} fix
 * that by correcting the `metaboxhidden_nav-menus` user meta right after
 * core's own first-visit routine writes it, without touching a user who
 * has already made their own Screen Options choice.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Mega_Menu_CPT
 *
 * Registers the nav-only `sgs_mega_menu` CPT, force-publishes it on save
 * (FR-36-5), fixes its Screen Options discoverability, and exposes the
 * `object_id`-based resolution helper every mega-aware renderer must use.
 */
final class Sgs_Mega_Menu_CPT {

	/** CPT slug. */
	public const POST_TYPE = 'sgs_mega_menu';

	/** Capability required to manage mega panels, mirrored on the nav-menus screen check. */
	private const MANAGE_CAPABILITY = 'edit_theme_options';

	/**
	 * True when this request's `metaboxhidden_nav-menus` user meta was unset
	 * BEFORE `wp_initial_nav_menu_meta_boxes()` ran — i.e. this is the
	 * current user's genuine first visit to the screen. Recorded by
	 * {@see record_pre_seed_state()}, consumed by
	 * {@see fix_nav_menus_metabox_visibility()}.
	 *
	 * @var bool
	 */
	private static bool $is_first_visit = false;

	/**
	 * WordPress core's nav-menus.php metabox ID for a post-type "add items"
	 * panel. Fixed by WP core naming convention
	 * (`wp-admin/includes/nav-menu.php`, `_wp_nav_menu_meta_box_object()`)
	 * — not configurable, so it is a constant here rather than derived.
	 */
	private const NAV_MENUS_METABOX_ID = 'add-post-type-' . self::POST_TYPE;

	/**
	 * Wire WordPress hooks. Call once from the plugin bootstrap.
	 */
	public static function register(): void {
		\add_action( 'init', array( __CLASS__, 'register_post_type' ) );
		\add_action( 'admin_menu', array( __CLASS__, 'register_submenu' ) );
		\add_filter( 'wp_insert_post_data', array( __CLASS__, 'force_publish' ) );
		\add_action( 'load-nav-menus.php', array( __CLASS__, 'record_pre_seed_state' ) );
		\add_action( 'admin_head-nav-menus.php', array( __CLASS__, 'fix_nav_menus_metabox_visibility' ) );
	}

	/**
	 * Register the `sgs_mega_menu` CPT.
	 *
	 * Nav-only by design (operator decision, final): `public => false` +
	 * `publicly_queryable => false` + `exclude_from_search => true` mean a
	 * mega panel is never a standalone page and never appears in search —
	 * it only exists attached to a nav item. `rewrite => false` +
	 * `has_archive => false` follow (no permalink structure, no archive).
	 * `show_in_nav_menus => true` still populates the "add items" panel
	 * independently of `public`; `show_in_rest => true` is kept so the
	 * block editor can edit panel content. Capability map mirrors
	 * {@see Sgs_Block_CPTs::register_post_types()} (Council M1 pattern):
	 * every primitive routes to `edit_theme_options`, PLURAL primitives
	 * only — listing a singular meta-cap here would register its value as
	 * a meta-capability in WP's reverse map and break every plain
	 * `current_user_can( 'edit_theme_options' )` check site-wide (the same
	 * failure mode documented on {@see Product_Templates_CPT}).
	 */
	public static function register_post_type(): void {
		$capabilities = array(
			'read'                   => 'edit_theme_options',
			'read_private_posts'     => 'edit_theme_options',
			'edit_posts'             => 'edit_theme_options',
			'edit_private_posts'     => 'edit_theme_options',
			'edit_published_posts'   => 'edit_theme_options',
			'edit_others_posts'      => 'edit_theme_options',
			'publish_posts'          => 'edit_theme_options',
			'delete_posts'           => 'edit_theme_options',
			'delete_private_posts'   => 'edit_theme_options',
			'delete_published_posts' => 'edit_theme_options',
			'delete_others_posts'    => 'edit_theme_options',
			'create_posts'           => 'edit_theme_options',
		);

		\register_post_type(
			self::POST_TYPE,
			array(
				'label'               => \__( 'Mega Menu Panels', 'sgs-blocks' ),
				'labels'              => array(
					'name'               => \__( 'Mega Menu Panels', 'sgs-blocks' ),
					'singular_name'      => \__( 'Mega Menu Panel', 'sgs-blocks' ),
					'add_new'            => \__( 'Add New', 'sgs-blocks' ),
					'add_new_item'       => \__( 'Add New Mega Menu Panel', 'sgs-blocks' ),
					'edit_item'          => \__( 'Edit Mega Menu Panel', 'sgs-blocks' ),
					'new_item'           => \__( 'New Mega Menu Panel', 'sgs-blocks' ),
					'view_item'          => \__( 'View Mega Menu Panel', 'sgs-blocks' ),
					'search_items'       => \__( 'Search Mega Menu Panels', 'sgs-blocks' ),
					'not_found'          => \__( 'No mega menu panels found.', 'sgs-blocks' ),
					'not_found_in_trash' => \__( 'No mega menu panels found in Trash.', 'sgs-blocks' ),
				),
				'description'         => \__( 'A rich mega-menu dropdown panel, attached to a menu item in Appearance -> Menus like a page. Not viewable as a standalone page.', 'sgs-blocks' ),
				'public'              => false,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'show_ui'             => true,
				'show_in_menu'        => false, // Own submenu added under the SGS top-level menu — see register_submenu().
				'show_in_nav_menus'   => true,
				'show_in_admin_bar'   => false,
				'show_in_rest'        => true,
				'supports'            => array( 'title', 'editor', 'custom-fields', 'revisions' ),
				'rewrite'             => false,
				'has_archive'         => false,
				'hierarchical'        => false,
				'capability_type'     => 'page',
				'map_meta_cap'        => true,
				'capabilities'        => $capabilities,
			)
		);
	}

	/**
	 * Add "Mega Menu Panels" under the SGS top-level menu. Links straight to
	 * the built-in post-type list table — no custom screen required, mirrors
	 * {@see Sgs_Block_CPTs::register_submenus()}.
	 */
	public static function register_submenu(): void {
		\add_submenu_page(
			Sgs_Admin_Menu::MENU_SLUG,
			\__( 'Mega Menu Panels', 'sgs-blocks' ),
			\__( 'Mega Menu Panels', 'sgs-blocks' ),
			'edit_theme_options',
			'edit.php?post_type=' . self::POST_TYPE,
			''
		);
	}

	/**
	 * Force-publish on save (FR-36-5): a `sgs_mega_menu` post never sits in
	 * draft/pending/future/private, so a menu item attached to it can never
	 * target an unpublished panel. Runs through `wp_insert_post_data`, which
	 * both the classic post editor AND the block-editor REST controller
	 * (`WP_REST_Posts_Controller::create_item()` -> `wp_insert_post()`) pass
	 * through, so one hook covers both save paths.
	 *
	 * `auto-draft` is intentionally left alone — that status exists for the
	 * split-second before an operator has typed anything on "Add New", and
	 * force-publishing it would publish empty panels on every editor load.
	 * `trash` is also left alone so the normal trash/restore lifecycle still
	 * works (FR-36-9a's degrade-to-plain-link handles a trashed target).
	 *
	 * @param array<string,mixed> $data Slashed post data about to be saved.
	 * @return array<string,mixed> Filtered post data.
	 */
	public static function force_publish( array $data ): array {
		if ( self::POST_TYPE !== $data['post_type'] ) {
			return $data;
		}

		if ( in_array( $data['post_status'], array( 'draft', 'pending', 'future', 'private' ), true ) ) {
			$data['post_status'] = 'publish';
		}

		return $data;
	}

	/**
	 * Record, before core's first-visit routine runs, whether this user
	 * has never saved a Screen Options choice for the nav-menus screen.
	 * Consumed by {@see fix_nav_menus_metabox_visibility()}.
	 *
	 * Hooked to `load-nav-menus.php`, fired by `wp-admin/admin.php` via
	 * `do_action( "load-{$pagenow}" )` BEFORE it requires `nav-menus.php`
	 * (confirmed on the canary over SSH); `nav-menus.php` calls
	 * `wp_initial_nav_menu_meta_boxes()` at line 692, so this runs first.
	 */
	public static function record_pre_seed_state(): void {
		self::$is_first_visit = false === \get_user_option( 'metaboxhidden_nav-menus' );
	}

	/**
	 * Correct the nav-menus.php "Mega Menu Panels" metabox visibility after
	 * WordPress core's own first-visit routine has run, on a genuine first
	 * visit only.
	 *
	 * `default_hidden_meta_boxes` (this method's previous implementation)
	 * is NOT the mechanism nav-menus.php uses — verified by reading core
	 * directly on the live canary. `wp_initial_nav_menu_meta_boxes()`
	 * (`wp-admin/includes/nav-menu.php`) hardcodes its own initial-visible
	 * allow-list, marks every OTHER metabox — including ours — hidden, and
	 * writes the result straight via `update_user_meta()`; it never calls
	 * `apply_filters()`/`get_hidden_meta_boxes()` (the sole call site of
	 * `default_hidden_meta_boxes` is inside THAT other function, in
	 * `wp-admin/includes/screen.php`, never invoked by nav-menus) — so the
	 * old filter-based approach here was inert.
	 *
	 * It also only ever runs ONCE PER USER (early-returns once the user
	 * meta is set), and cannot be pre-empted by seeding that meta earlier
	 * — the metaboxes it reads are registered by `wp_nav_menu_setup()` on
	 * the immediately preceding line of `nav-menus.php` (line 692), with
	 * no hook between the two calls. The fix is to let core run once,
	 * then correct its output: hooked to `admin_head-nav-menus.php`,
	 * confirmed on the canary to fire (via `wp-admin/admin-header.php`,
	 * required at line 780) after that line-692 call.
	 *
	 * Only acts when {@see record_pre_seed_state()} recorded a genuine
	 * first visit — a user with the meta already set (their own Screen
	 * Options choice) is left alone, and this only runs for a user who
	 * can edit menus.
	 */
	public static function fix_nav_menus_metabox_visibility(): void {
		if ( ! self::$is_first_visit ) {
			return;
		}

		if ( ! \current_user_can( self::MANAGE_CAPABILITY ) ) {
			return;
		}

		$user   = \wp_get_current_user();
		$hidden = \get_user_meta( $user->ID, 'metaboxhidden_nav-menus', true );

		if ( ! \is_array( $hidden ) || ! \in_array( self::NAV_MENUS_METABOX_ID, $hidden, true ) ) {
			return;
		}

		$hidden = \array_values( \array_diff( $hidden, array( self::NAV_MENUS_METABOX_ID ) ) );
		\update_user_meta( $user->ID, 'metaboxhidden_nav-menus', $hidden );
	}

	/**
	 * Resolve a nav menu item's mega panel (FR-36-5 click-target resolution
	 * + FR-36-9a referential integrity).
	 *
	 * MUST be called with the item's `object_id`, NEVER `$item->url` — the
	 * spec is explicit that URL-based resolution is the wrong mechanism.
	 * Returns null (never a fatal, never an empty-panel render) when the
	 * target is trashed, missing, or not actually a `sgs_mega_menu` post —
	 * callers degrade to a plain link in that case (FR-36-9a point 1).
	 *
	 * @param \WP_Post|\stdClass $item A `nav_menu_item` post/object, as returned by `wp_get_nav_menu_items()`.
	 * @return \WP_Post|null The published mega panel post, or null when there is no valid target.
	 */
	public static function resolve_panel_for_menu_item( $item ): ?\WP_Post {
		if ( ! isset( $item->object, $item->object_id ) || self::POST_TYPE !== $item->object ) {
			return null;
		}

		$post_id = \absint( $item->object_id );
		if ( 0 === $post_id ) {
			return null;
		}

		$panel = \get_post( $post_id );

		if ( ! $panel instanceof \WP_Post ) {
			return null;
		}

		if ( self::POST_TYPE !== $panel->post_type ) {
			return null;
		}

		if ( 'publish' !== $panel->post_status ) {
			return null;
		}

		return $panel;
	}
}
