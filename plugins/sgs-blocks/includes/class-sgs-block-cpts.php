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

	/** Block pattern category slug for header patterns. */
	private const HEADER_CAT = 'sgs-headers';

	/** Block pattern category slug for footer patterns. */
	private const FOOTER_CAT = 'sgs-footers';

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
	 * Add "Advanced Headers" and "Advanced Footers" submenus under the SGS
	 * top-level menu. Both link to the built-in post-type list table —
	 * no custom screen required.
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
	}
}
