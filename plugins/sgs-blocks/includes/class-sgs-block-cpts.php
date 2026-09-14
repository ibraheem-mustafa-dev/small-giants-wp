<?php
/**
 * SGS custom post types for advanced headers and footers (FR-S3-4, Spec 17).
 *
 * Registers `sgs_header` and `sgs_footer` CPTs. Each published post
 * auto-registers as a block pattern with `blockTypes` pointing at the
 * appropriate core template-part area so the Site Editor can surface it as a
 * header/footer swap option.
 *
 * Council M1 — REST read is gated to `edit_theme_options`:
 * All read-path capabilities (`read`, `read_private_posts`) are mapped to
 * `edit_theme_options`, which subscribers do not hold. Combined with
 * `capability_type => 'page'` + `map_meta_cap => true`, the WP REST controller
 * inherits these caps and returns 403 for any user without that capability.
 *
 * Pattern registration runs on `admin_init` (not `init`) per Seat 1 finding:
 * deferring to `admin_init` avoids a `get_posts()` query on every frontend
 * page load. CPT registration itself must remain on `init` so that permalink
 * rewriting and the REST controller are set up in both contexts.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Block_CPTs
 *
 * Registers sgs_header and sgs_footer CPTs and derives block patterns from
 * their published posts.
 */
final class Sgs_Block_CPTs {

	/** Post type slug for advanced header entries. */
	public const HEADER_CPT = 'sgs_header';

	/** Post type slug for advanced footer entries. */
	public const FOOTER_CPT = 'sgs_footer';

	/**
	 * Post type slug for menu-drawer entries (W2-a, merged Spec 36+37 Wave 2).
	 *
	 * The off-canvas panel the burger opens. Before this it existed ONLY as a
	 * `sgs/nav-drawer` block pasted as a SIBLING of `sgs/site-header` inside a
	 * header pattern (8 patterns each carry their own copy), which meant an
	 * operator had to find it inside a header layout to change it. The CPT gives
	 * it its own edit screen, exactly as headers and footers already have.
	 */
	public const DRAWER_CPT = 'sgs_drawer';

	/**
	 * Post type slug for modal content entries (Task 1, 2026-09-14).
	 *
	 * A modal's CONTENT (the InnerBlocks that appear inside the dialog panel)
	 * gets its own edit screen, same reasoning as the drawer above: on a real
	 * client draft the same size-guide modal opens from six different places
	 * (footer, product page x2, Help/FAQ, header mega-menu, mobile nav
	 * drawer), and before this CPT that content had to be pasted into all six
	 * `sgs/modal` instances separately — six copies to keep in sync by hand.
	 * A `sgs/modal` block instance now OPTIONALLY points at a published
	 * `sgs_modal` post via its `modalRef` attribute; when set, render.php
	 * resolves and renders that post's content instead of the instance's own
	 * InnerBlocks (see {@see resolve_modal()}). The block's own InnerBlocks
	 * shape stays fully available (default `modalRef` is 0) — this is an
	 * ADDITIVE capability, not a replacement, so every existing `sgs/modal`
	 * instance keeps working unchanged.
	 */
	public const MODAL_CPT = 'sgs_modal';

	/** Block pattern category slug for header patterns. */
	private const HEADER_CAT = 'sgs-headers';

	/** Block pattern category slug for footer patterns. */
	private const FOOTER_CAT = 'sgs-footers';

	/** Block pattern category slug for menu-drawer starter patterns. */
	public const DRAWER_CAT = 'sgs-drawers';

	/**
	 * Wire WordPress hooks. Call once from the plugin bootstrap, AFTER
	 * Sgs_Admin_Menu::register() so the parent menu slug exists.
	 */
	public static function register(): void {
		\add_action( 'init', array( __CLASS__, 'register_post_types' ) );
		\add_action( 'admin_init', array( __CLASS__, 'register_patterns_from_cpts' ) );
		\add_action( 'admin_menu', array( __CLASS__, 'register_submenus' ) );
	}

	/**
	 * Register both CPTs on `init`.
	 *
	 * The `capabilities` map routes every read-path cap to `edit_theme_options`
	 * (Council M1). `capability_type => 'page'` + `map_meta_cap => true` ensures
	 * the WordPress core meta-cap mapper honours our capability overrides rather
	 * than falling back to its own derivation logic.
	 */
	public static function register_post_types(): void {

		/**
		 * Shared capability map — primitive caps only.
		 *
		 * Council M1: subscriber-level users cannot list or read entries via REST.
		 * All primitives route to `edit_theme_options`. The singular meta-caps
		 * `edit_post`, `read_post`, `delete_post` are deliberately omitted —
		 * with `map_meta_cap => true` WP core derives them from these primitives
		 * via `map_meta_cap()`. Listing meta-caps here triggers the WP 6.1+
		 * `_doing_it_wrong( 'map_meta_cap', 'check against a specific post' )`
		 * notice because core's mapper evaluates them as object-bound caps.
		 *
		 * @var array<string,string>
		 */
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

		$shared = array(
			'public'          => false,
			'show_ui'         => true,
			'show_in_menu'    => false,
			'show_in_rest'    => true,
			'supports'        => array( 'title', 'editor', 'revisions' ),
			'rewrite'         => false,
			'has_archive'     => false,
			'capability_type' => 'page',
			'map_meta_cap'    => true,
			'capabilities'    => $capabilities,
		);

		\register_post_type(
			self::HEADER_CPT,
			array_merge(
				$shared,
				array(
					'label'       => \__( 'Advanced Headers', 'sgs-blocks' ),
					'labels'      => array(
						'name'               => \__( 'Advanced Headers', 'sgs-blocks' ),
						'singular_name'      => \__( 'Advanced Header', 'sgs-blocks' ),
						'add_new'            => \__( 'Add New', 'sgs-blocks' ),
						'add_new_item'       => \__( 'Add New Header', 'sgs-blocks' ),
						'edit_item'          => \__( 'Edit Header', 'sgs-blocks' ),
						'new_item'           => \__( 'New Header', 'sgs-blocks' ),
						'view_item'          => \__( 'View Header', 'sgs-blocks' ),
						'search_items'       => \__( 'Search Headers', 'sgs-blocks' ),
						'not_found'          => \__( 'No headers found.', 'sgs-blocks' ),
						'not_found_in_trash' => \__( 'No headers found in Trash.', 'sgs-blocks' ),
					),
					'description' => \__( 'Full-editor header layouts selectable as a site header variant.', 'sgs-blocks' ),
					// FR-37-7 (2026-07-24): the registration `template` seed is REMOVED so a new
					// Advanced Header opens EMPTY, which lets WordPress's native "Choose a pattern"
					// starter modal fire (it only appears on an empty post). The modal offers the
					// sgs_header starter patterns (Block Types: core/post-content, Post Types:
					// sgs_header), and "Start from scratch" is a MINIMAL starter card (the bare
					// sgs/site-header 3-row shell) rather than this pre-seed. Was Spec 37
					// FR-37-1/D323 (formerly cited as FR-S9-11 of the deleted Spec 17):
					// `'template' => array( array( 'sgs/site-header' ) )`.
				)
			)
		);

		\register_post_type(
			self::FOOTER_CPT,
			array_merge(
				$shared,
				array(
					'label'       => \__( 'Advanced Footers', 'sgs-blocks' ),
					'labels'      => array(
						'name'               => \__( 'Advanced Footers', 'sgs-blocks' ),
						'singular_name'      => \__( 'Advanced Footer', 'sgs-blocks' ),
						'add_new'            => \__( 'Add New', 'sgs-blocks' ),
						'add_new_item'       => \__( 'Add New Footer', 'sgs-blocks' ),
						'edit_item'          => \__( 'Edit Footer', 'sgs-blocks' ),
						'new_item'           => \__( 'New Footer', 'sgs-blocks' ),
						'view_item'          => \__( 'View Footer', 'sgs-blocks' ),
						'search_items'       => \__( 'Search Footers', 'sgs-blocks' ),
						'not_found'          => \__( 'No footers found.', 'sgs-blocks' ),
						'not_found_in_trash' => \__( 'No footers found in Trash.', 'sgs-blocks' ),
					),
					'description' => \__( 'Full-editor footer layouts selectable as a site footer variant.', 'sgs-blocks' ),
					// FR-37-7 (2026-07-24): the registration `template` seed is REMOVED (mirrors
					// the sgs_header change) so a new Advanced Footer opens EMPTY and WordPress's
					// native "Choose a pattern" starter modal fires with the sgs_footer starters.
					// "Start from scratch" = the minimal footer-scratch card (the bare sgs/site-footer
					// shell). Was Spec 37 FR-37-10/D325 (formerly cited as FR-S9-3 of the deleted
					// Spec 17): `'template' => array( array( 'sgs/site-footer' ) )`.
				)
			)
		);

		\register_post_type(
			self::DRAWER_CPT,
			array_merge(
				$shared,
				array(
					'label'       => \__( 'Menu drawers', 'sgs-blocks' ),
					'labels'      => array(
						'name'               => \__( 'Menu drawers', 'sgs-blocks' ),
						'singular_name'      => \__( 'Menu drawer', 'sgs-blocks' ),
						'add_new'            => \__( 'Add New', 'sgs-blocks' ),
						'add_new_item'       => \__( 'Add New Menu Drawer', 'sgs-blocks' ),
						'edit_item'          => \__( 'Edit Menu Drawer', 'sgs-blocks' ),
						'new_item'           => \__( 'New Menu Drawer', 'sgs-blocks' ),
						'view_item'          => \__( 'View Menu Drawer', 'sgs-blocks' ),
						'search_items'       => \__( 'Search Menu Drawers', 'sgs-blocks' ),
						'not_found'          => \__( 'No menu drawers found.', 'sgs-blocks' ),
						'not_found_in_trash' => \__( 'No menu drawers found in Trash.', 'sgs-blocks' ),
					),
					'description' => \__( 'The slide-out panel a burger button opens, editable on its own screen.', 'sgs-blocks' ),
					// NO `template` arg — deliberate, same reason as both CPTs above
					// (FR-37-7, 2026-07-24). A registration template makes a new post
					// non-empty, and WordPress's native "Choose a pattern" starter modal
					// only fires on an EMPTY post. Seeding here would kill the starter
					// picker the drawer starter patterns depend on, and would re-open the
					// templateLock-reapplies-over-children class (D393).
				)
			)
		);

		\register_post_type(
			self::MODAL_CPT,
			array_merge(
				$shared,
				array(
					'label'       => \__( 'Modals', 'sgs-blocks' ),
					'labels'      => array(
						'name'               => \__( 'Modals', 'sgs-blocks' ),
						'singular_name'      => \__( 'Modal', 'sgs-blocks' ),
						'add_new'            => \__( 'Add New', 'sgs-blocks' ),
						'add_new_item'       => \__( 'Add New Modal', 'sgs-blocks' ),
						'edit_item'          => \__( 'Edit Modal', 'sgs-blocks' ),
						'new_item'           => \__( 'New Modal', 'sgs-blocks' ),
						'view_item'          => \__( 'View Modal', 'sgs-blocks' ),
						'search_items'       => \__( 'Search Modals', 'sgs-blocks' ),
						'not_found'          => \__( 'No modals found.', 'sgs-blocks' ),
						'not_found_in_trash' => \__( 'No modals found in Trash.', 'sgs-blocks' ),
					),
					'description' => \__( 'Reusable modal content, opened by a Modal block trigger from anywhere on the site — edit once, every trigger pointing at it updates together.', 'sgs-blocks' ),
					// NO `template` arg — same reason as all three CPTs above
					// (FR-37-7, 2026-07-24): a registration template makes a new
					// post non-empty and suppresses WordPress's native "Choose a
					// pattern" starter modal. A `sgs_modal` post is plain content
					// (a heading + text, a form, an image — whatever the operator
					// needs inside the dialog), so an empty start is correct here too.
				)
			)
		);
	}

	/**
	 * Derive block patterns from published CPT posts.
	 *
	 * Runs on `admin_init` only — keeps frontend page loads free of
	 * `get_posts()` overhead (Seat 1 finding). Draft posts are intentionally
	 * excluded: `post_status => 'publish'` ensures unfinished layouts never
	 * surface in the pattern inserter.
	 *
	 * DRAWER_CPT is deliberately NOT queried here (W2-a). A derived pattern's
	 * whole purpose is a `blockTypes` target the Site Editor can swap a
	 * template-part into — and a drawer HAS no template-part area: it is a
	 * `<dialog>` bound by the Active-drawer pointer, not inserted into a slot.
	 * Adding it to this query would also mis-file every drawer through the
	 * `else` branch below and register it as a `core/template-part/footer`
	 * pattern. Drawer STARTER patterns are ordinary theme pattern files scoped
	 * `Post Types: sgs_drawer` (see theme/sgs-theme/patterns/drawer-scratch.php),
	 * which is the mechanism the native starter-picker modal reads.
	 *
	 * MODAL_CPT is excluded for the same underlying reason as DRAWER_CPT: a
	 * `sgs_modal` post is resolved BY REFERENCE from a `sgs/modal` block's
	 * `modalRef` attribute (see {@see resolve_modal()}), not swapped into a
	 * template-part slot, so it has no `blockTypes` target for a derived
	 * pattern to point at.
	 */
	public static function register_patterns_from_cpts(): void {
		// numberposts=-1 is intentional: operators hold a tiny number of custom
		// header/footer layouts (typically 2-5). The query runs on admin_init only
		// (never frontend) and no_found_rows=true suppresses the COUNT(*) subquery.
		// phpcs:ignore WordPress.WP.PostsPerPage.posts_per_page_numberposts
		$posts = \get_posts(
			array(
				'post_type'     => array( self::HEADER_CPT, self::FOOTER_CPT ),
				'post_status'   => 'publish',
				'numberposts'   => -1,
				'no_found_rows' => true,
			)
		);

		foreach ( $posts as $post ) {
			if ( self::HEADER_CPT === $post->post_type ) {
				$slug       = 'sgs/header-' . $post->post_name;
				$block_type = 'core/template-part/header';
				$category   = self::HEADER_CAT;
			} else {
				$slug       = 'sgs/footer-' . $post->post_name;
				$block_type = 'core/template-part/footer';
				$category   = self::FOOTER_CAT;
			}

			\register_block_pattern(
				$slug,
				array(
					'title'      => $post->post_title,
					'content'    => $post->post_content,
					'blockTypes' => array( $block_type ),
					'categories' => array( $category ),
					'inserter'   => true,
				)
			);
		}
	}

	/**
	 * Add "Advanced Headers", "Advanced Footers", "Menu drawers" and "Modals"
	 * submenus under the SGS top-level menu. All link to the built-in
	 * post-type list table — no custom screen required.
	 */
	public static function register_submenus(): void {
		\add_submenu_page(
			Sgs_Admin_Menu::MENU_SLUG,
			\__( 'Advanced Headers', 'sgs-blocks' ),
			\__( 'Advanced Headers', 'sgs-blocks' ),
			'edit_theme_options',
			'edit.php?post_type=' . self::HEADER_CPT,
			'' // No callback — redirect to built-in list table.
		);

		\add_submenu_page(
			Sgs_Admin_Menu::MENU_SLUG,
			\__( 'Advanced Footers', 'sgs-blocks' ),
			\__( 'Advanced Footers', 'sgs-blocks' ),
			'edit_theme_options',
			'edit.php?post_type=' . self::FOOTER_CPT,
			''
		);

		\add_submenu_page(
			Sgs_Admin_Menu::MENU_SLUG,
			\__( 'Menu drawers', 'sgs-blocks' ),
			\__( 'Menu drawers', 'sgs-blocks' ),
			'edit_theme_options',
			'edit.php?post_type=' . self::DRAWER_CPT,
			''
		);

		\add_submenu_page(
			Sgs_Admin_Menu::MENU_SLUG,
			\__( 'Modals', 'sgs-blocks' ),
			\__( 'Modals', 'sgs-blocks' ),
			'edit_theme_options',
			'edit.php?post_type=' . self::MODAL_CPT,
			''
		);
	}

	/**
	 * Resolve a `sgs/modal` block's `modalRef` attribute to the published
	 * `sgs_modal` post it names, or null when there is no valid target.
	 *
	 * Mirrors {@see Sgs_Mega_Menu_CPT::resolve_panel_for_menu_item()} — same
	 * fail-closed shape (never a fatal, never an empty-panel render): a
	 * trashed, missing, or wrong-post-type reference degrades to null and the
	 * caller (`sgs/modal`'s render.php) falls back to the block instance's
	 * own InnerBlocks content instead.
	 *
	 * @param int $modal_ref The `modalRef` attribute value (a `sgs_modal` post ID, or 0 for "no reference").
	 * @return \WP_Post|null The published modal-content post, or null.
	 */
	public static function resolve_modal( int $modal_ref ): ?\WP_Post {
		if ( $modal_ref <= 0 ) {
			return null;
		}

		$post = \get_post( $modal_ref );

		if ( ! $post instanceof \WP_Post ) {
			return null;
		}

		if ( self::MODAL_CPT !== $post->post_type ) {
			return null;
		}

		if ( 'publish' !== $post->post_status ) {
			return null;
		}

		return $post;
	}
}
