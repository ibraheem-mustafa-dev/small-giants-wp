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

	/**
	 * Post type slug for form definition entries (Phase 1, Spec 42).
	 *
	 * A `sgs_form` post stores a form's field definitions + settings, edited on
	 * its own screen rather than inline inside a page. Unlike the four CPTs
	 * above, this one carries its OWN dedicated capability (`edit_sgs_forms`)
	 * rather than the inherited `edit_theme_options` — form-building is an
	 * everyday content-editing task, not a theme-structure change, so it should
	 * be assignable to a role that manages content without also handing over
	 * header/footer/drawer/modal editing rights.
	 */
	public const FORM_CPT = 'sgs_form';

	/**
	 * Post type slug for branching-quiz definition entries (Phase 2, Spec 43).
	 *
	 * A `sgs_choice_flow` post stores a branching quiz's question/answer graph,
	 * edited on its own screen rather than inline inside a page — same reasoning
	 * as `sgs_form` above. Per Spec 43 FR-43-8 ("same literal values, not a
	 * parallel decision"), this CPT is governed by the EXACT SAME capability
	 * (`edit_sgs_forms`) as `sgs_form`, not a second `edit_sgs_choice_flows`
	 * capability — one capability governs both CPTs.
	 */
	public const CHOICE_FLOW_CPT = 'sgs_choice_flow';

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
		\add_filter( 'wp_insert_post_data', array( __CLASS__, 'guard_form_slug_rename' ), 10, 2 );
		\add_filter( 'wp_revisions_to_keep', array( __CLASS__, 'limit_form_revisions' ), 10, 2 );
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

		/**
		 * Capability map for `sgs_form` — deliberately its OWN map, not the
		 * shared `$capabilities` above (Phase 1, Spec 42).
		 *
		 * Every primitive routes to `edit_sgs_forms` instead of
		 * `edit_theme_options`, so form-building can be assigned to a role
		 * that manages everyday content without also granting header/footer/
		 * drawer/modal theme-structure access. Same 12-primitive shape as
		 * `$capabilities`, same `map_meta_cap => true` reasoning: the
		 * singular meta-caps (`edit_post`, `read_post`, `delete_post`) are
		 * deliberately omitted so WP core derives them from these primitives.
		 *
		 * @var array<string,string>
		 */
		$form_capabilities = array(
			'read'                   => 'edit_sgs_forms',
			'read_private_posts'     => 'edit_sgs_forms',
			'edit_posts'             => 'edit_sgs_forms',
			'edit_private_posts'     => 'edit_sgs_forms',
			'edit_published_posts'   => 'edit_sgs_forms',
			'edit_others_posts'      => 'edit_sgs_forms',
			'publish_posts'          => 'edit_sgs_forms',
			'delete_posts'           => 'edit_sgs_forms',
			'delete_private_posts'   => 'edit_sgs_forms',
			'delete_published_posts' => 'edit_sgs_forms',
			'delete_others_posts'    => 'edit_sgs_forms',
			'create_posts'           => 'edit_sgs_forms',
		);

		/**
		 * Args for `sgs_form` — mirrors `$shared`'s shape but swaps in the
		 * form-specific capability map and drops `custom-fields` support
		 * (out of scope for Phase 1; no post-meta is stored on this CPT yet).
		 *
		 * @var array<string,mixed>
		 */
		$form_shared = array(
			'public'          => false,
			'show_ui'         => true,
			'show_in_menu'    => false,
			'show_in_rest'    => true,
			'supports'        => array( 'title', 'editor', 'revisions' ),
			'rewrite'         => false,
			'has_archive'     => false,
			'capability_type' => 'page',
			'map_meta_cap'    => true,
			'capabilities'    => $form_capabilities,
		);

		\register_post_type(
			self::FORM_CPT,
			array_merge(
				$form_shared,
				array(
					'label'       => \__( 'Forms', 'sgs-blocks' ),
					'labels'      => array(
						'name'               => \__( 'Forms', 'sgs-blocks' ),
						'singular_name'      => \__( 'Form', 'sgs-blocks' ),
						'add_new'            => \__( 'Add New', 'sgs-blocks' ),
						'add_new_item'       => \__( 'Add New Form', 'sgs-blocks' ),
						'edit_item'          => \__( 'Edit Form', 'sgs-blocks' ),
						'new_item'           => \__( 'New Form', 'sgs-blocks' ),
						'view_item'          => \__( 'View Form', 'sgs-blocks' ),
						'search_items'       => \__( 'Search Forms', 'sgs-blocks' ),
						'not_found'          => \__( 'No forms found.', 'sgs-blocks' ),
						'not_found_in_trash' => \__( 'No forms found in Trash.', 'sgs-blocks' ),
					),
					'description' => \__( 'Form definitions, edited on their own screen and rendered by a Form block wherever they are needed.', 'sgs-blocks' ),
					// NO `template` arg — same reason as all CPTs above (FR-37-7,
					// 2026-07-24): a registration template makes a new post
					// non-empty and suppresses WordPress's native "Choose a
					// pattern" starter modal.
				)
			)
		);

		/**
		 * Args for `sgs_choice_flow` — mirrors `$form_shared`'s shape
		 * exactly, reusing the SAME `$form_capabilities` map (Phase 2,
		 * Spec 43 FR-43-8: "same literal values, not a parallel decision" —
		 * one capability governs both CPTs). No `custom-fields` support,
		 * same reasoning as `sgs_form`.
		 *
		 * @var array<string,mixed>
		 */
		$choice_flow_shared = array(
			'public'          => false,
			'show_ui'         => true,
			'show_in_menu'    => false,
			'show_in_rest'    => true,
			'supports'        => array( 'title', 'editor', 'revisions' ),
			'rewrite'         => false,
			'has_archive'     => false,
			'capability_type' => 'page',
			'map_meta_cap'    => true,
			'capabilities'    => $form_capabilities,
		);

		\register_post_type(
			self::CHOICE_FLOW_CPT,
			array_merge(
				$choice_flow_shared,
				array(
					'label'       => \__( 'Choice Flows', 'sgs-blocks' ),
					'labels'      => array(
						'name'               => \__( 'Choice Flows', 'sgs-blocks' ),
						'singular_name'      => \__( 'Choice Flow', 'sgs-blocks' ),
						'add_new'            => \__( 'Add New', 'sgs-blocks' ),
						'add_new_item'       => \__( 'Add New Choice Flow', 'sgs-blocks' ),
						'edit_item'          => \__( 'Edit Choice Flow', 'sgs-blocks' ),
						'new_item'           => \__( 'New Choice Flow', 'sgs-blocks' ),
						'view_item'          => \__( 'View Choice Flow', 'sgs-blocks' ),
						'search_items'       => \__( 'Search Choice Flows', 'sgs-blocks' ),
						'not_found'          => \__( 'No choice flows found.', 'sgs-blocks' ),
						'not_found_in_trash' => \__( 'No choice flows found in Trash.', 'sgs-blocks' ),
					),
					'description' => \__( 'Branching quiz definitions, edited on their own screen and rendered by a Choice Flow block wherever they are needed.', 'sgs-blocks' ),
					// NO `template` arg — same reason as all CPTs above (FR-37-7,
					// 2026-07-24): a registration template makes a new post
					// non-empty and suppresses WordPress's native "Choose a
					// pattern" starter modal.
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

		// `sgs_form` uses its OWN capability ('edit_sgs_forms'), not
		// 'edit_theme_options' — a user who only holds the new cap must still
		// see this submenu entry (Phase 1, Spec 42 FR-42-1).
		\add_submenu_page(
			Sgs_Admin_Menu::MENU_SLUG,
			\__( 'Forms', 'sgs-blocks' ),
			\__( 'Forms', 'sgs-blocks' ),
			'edit_sgs_forms',
			'edit.php?post_type=' . self::FORM_CPT,
			''
		);

		// `sgs_choice_flow` shares the SAME capability as `sgs_form`
		// ('edit_sgs_forms') — Phase 2, Spec 43 FR-43-8: one capability
		// governs both CPTs, not a parallel decision.
		\add_submenu_page(
			Sgs_Admin_Menu::MENU_SLUG,
			\__( 'Choice Flows', 'sgs-blocks' ),
			\__( 'Choice Flows', 'sgs-blocks' ),
			'edit_sgs_forms',
			'edit.php?post_type=' . self::CHOICE_FLOW_CPT,
			''
		);
	}

	/**
	 * Cap `sgs_form` AND `sgs_choice_flow` revisions at 10; leave every other
	 * post type's revision count untouched (Phase 1, Spec 42 — decided literal
	 * value, FR-42-3; extended Phase 2, Spec 43 FR-43-8 to cover
	 * `sgs_choice_flow` with the SAME literal value, not a second function).
	 *
	 * @param int          $num  The number of revisions WP would otherwise keep.
	 * @param \WP_Post|int $post The post (or post ID) being checked.
	 * @return int
	 */
	public static function limit_form_revisions( int $num, $post ): int {
		$post_type = \get_post_type( $post );

		if ( self::FORM_CPT !== $post_type && self::CHOICE_FLOW_CPT !== $post_type ) {
			return $num;
		}

		return 10;
	}

	/**
	 * Block a `sgs_form` post's slug from changing once it has at least one
	 * row in the submissions table (Phase 1, Spec 42 — decided slug-rename
	 * policy). A silent no-op (keep the old slug) reads better to a non-coder
	 * client than a save failure with no visible reason.
	 *
	 * @param array<string,mixed> $data    Slashed post data about to be saved.
	 * @param array<string,mixed> $postarr Raw, unslashed $_POST data.
	 * @return array<string,mixed>
	 */
	public static function guard_form_slug_rename( array $data, array $postarr ): array {
		if ( self::FORM_CPT !== ( $data['post_type'] ?? '' ) ) {
			return $data;
		}

		$post_id = (int) ( $postarr['ID'] ?? 0 );

		if ( $post_id <= 0 ) {
			return $data;
		}

		$existing = \get_post( $post_id );

		if ( ! $existing instanceof \WP_Post || $existing->post_name === $data['post_name'] ) {
			return $data;
		}

		global $wpdb;

		$submission_count = (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*) FROM {$wpdb->prefix}sgs_form_submissions WHERE form_id = %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- table name, not user input.
				$existing->post_name
			)
		);

		if ( $submission_count > 0 ) {
			$data['post_name'] = $existing->post_name;
		}

		return $data;
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

	/**
	 * Resolve a `sgs/form` block's `formId` attribute (a slug, not a post ID —
	 * unlike {@see self::resolve_modal()}) to the published `sgs_form` post it
	 * names, or null when there is no valid target.
	 *
	 * Same fail-closed shape as `resolve_modal()` (never a fatal, degrade to
	 * null), but a DIFFERENT lookup mechanism: `sgs_form` is resolved by SLUG
	 * (Spec 42 §2), because a form's embed attribute carries a human-readable
	 * slug, not a numeric post ID. Do not copy `resolve_modal()`'s `get_post()`
	 * body here.
	 *
	 * @param string $slug The `formId` attribute value (a `sgs_form` post slug, or '' for "not linked").
	 * @return \WP_Post|null The published form-definition post, or null.
	 */
	public static function resolve_form( string $slug ): ?\WP_Post {
		if ( '' === $slug ) {
			return null;
		}

		$post = \get_page_by_path( $slug, OBJECT, self::FORM_CPT );

		if ( ! $post instanceof \WP_Post ) {
			return null;
		}

		if ( 'publish' !== $post->post_status ) {
			return null;
		}

		return $post;
	}

	/**
	 * Resolve a `sgs/choice-flow` block's `flowId` attribute (a slug, not a
	 * post ID — same shape as {@see self::resolve_form()}) to the published
	 * `sgs_choice_flow` post it names, or null when there is no valid target.
	 *
	 * Same fail-closed shape as `resolve_form()` (never a fatal, degrade to
	 * null), same by-slug lookup mechanism (Phase 2, Spec 43 — mirrors Phase 1
	 * exactly, per FR-43-8).
	 *
	 * @param string $slug The `flowId` attribute value (a `sgs_choice_flow` post slug, or '' for "not linked").
	 * @return \WP_Post|null The published choice-flow-definition post, or null.
	 */
	public static function resolve_choice_flow( string $slug ): ?\WP_Post {
		if ( '' === $slug ) {
			return null;
		}

		$post = \get_page_by_path( $slug, OBJECT, self::CHOICE_FLOW_CPT );

		if ( ! $post instanceof \WP_Post ) {
			return null;
		}

		if ( 'publish' !== $post->post_status ) {
			return null;
		}

		return $post;
	}
}
