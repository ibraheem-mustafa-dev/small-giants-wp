<?php
/**
 * SGS header/footer LIFECYCLE WP-CLI commands (FR-37-30, Spec 37).
 *
 * A reduced `wp sgs header <...>` / `wp sgs footer <...>` command set covering
 * the CPT-backed header/footer lifecycle non-interactively: set/clear the
 * active pointer, list saved layouts, seed a new layout from a starter
 * pattern. Explicitly NOT a client-facing surface — clients use the "Advanced
 * Headers"/"Advanced Footers" admin screens exclusively. It exists so Bean
 * and the cloning pipeline (FR-37-22) have a programmatic path.
 *
 * One class serves both `wp sgs header` and `wp sgs footer` — each is
 * registered as a separate instance carrying its own area token (see the
 * registration block in sgs-blocks.php), so the two command trees share
 * identical behaviour with zero duplicated logic.
 *
 * Active-pointer reads/writes ALWAYS delegate to {@see Sgs_Active_Layout} —
 * this class never touches the `sgs_active_{header,footer}_cpt_id` options
 * directly.
 *
 * Registration (in sgs-blocks.php, inside the existing WP_CLI conditional):
 *
 *   require_once SGS_BLOCKS_PATH . 'includes/class-sgs-header-footer-cli-commands.php';
 *   \WP_CLI::add_command( 'sgs header', new Sgs_Header_Footer_Cli_Commands( Sgs_Active_Layout::AREA_HEADER ) );
 *   \WP_CLI::add_command( 'sgs footer', new Sgs_Header_Footer_Cli_Commands( Sgs_Active_Layout::AREA_FOOTER ) );
 *
 * Capability gate: write commands (`set-active`, `clear-active`,
 * `seed-starter`) require `edit_theme_options` via `current_user_can()`. Pass
 * `--user=1` (or any admin user ID) on the CLI to provide a user context.
 * `list` is read-only and carries no capability gate, matching the existing
 * `header-rules list` / `footer-rules list` convention.
 *
 * @package SGS\Blocks
 * @since   1.1.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * SGS header/footer lifecycle WP-CLI commands.
 *
 * ## EXAMPLES
 *
 *     wp sgs header list
 *     wp sgs header set-active 42 --user=1
 *     wp sgs header clear-active --user=1
 *     wp sgs header seed-starter sgs/framework-header-centred --user=1
 *
 *     wp sgs footer list
 *     wp sgs footer set-active 51 --user=1
 *     wp sgs footer clear-active --user=1
 *     wp sgs footer seed-starter sgs/framework-footer-default --user=1
 */
final class Sgs_Header_Footer_Cli_Commands {

	/**
	 * Area token this instance serves — 'header' or 'footer'.
	 *
	 * @var string
	 */
	private $area;

	/**
	 * Bind this command tree to a single layout area.
	 *
	 * @param string $area {@see Sgs_Active_Layout::AREA_HEADER} or {@see Sgs_Active_Layout::AREA_FOOTER}.
	 */
	public function __construct( string $area ) {
		$this->area = $area;
	}

	// -------------------------------------------------------------------------
	// wp sgs <header|footer> set-active <post-id>
	// -------------------------------------------------------------------------

	/**
	 * Set the active layout for this area by post ID.
	 *
	 * Delegates to Sgs_Active_Layout::set_active(), which rejects a
	 * non-existent post, a post of the wrong post type, and an unpublished
	 * post.
	 *
	 * ## OPTIONS
	 *
	 * <post-id>
	 * : The post ID of the sgs_header/sgs_footer layout to activate. Must
	 *   already be published.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs header set-active 42 --user=1
	 *     wp sgs footer set-active 51 --user=1
	 *
	 * @param string[] $args       Positional arguments.
	 * @param string[] $assoc_args Named arguments (unused).
	 *
	 * @subcommand set-active
	 */
	public function set_active( array $args, array $assoc_args ): void {
		unset( $assoc_args );

		if ( ! \current_user_can( 'edit_theme_options' ) ) {
			\WP_CLI::error( 'edit_theme_options capability required — pass --user=<id> (e.g. --user=1).' );
		}

		$raw = $args[0] ?? '';
		if ( '' === $raw || ! \ctype_digit( (string) $raw ) ) {
			\WP_CLI::error( "Usage: wp sgs {$this->area} set-active <post-id>" );
		}

		$post_id = (int) $raw;
		$result  = Sgs_Active_Layout::set_active( $this->area, $post_id );

		if ( \is_wp_error( $result ) ) {
			\WP_CLI::error( $result->get_error_message() );
		}

		\WP_CLI::success( "Post #{$post_id} set as the active {$this->area}." );
	}

	// -------------------------------------------------------------------------
	// wp sgs <header|footer> clear-active
	// -------------------------------------------------------------------------

	/**
	 * Clear the active pointer for this area, restoring the immutable
	 * framework default.
	 *
	 * Delegates to Sgs_Active_Layout::clear_active(). The previously-active
	 * post is left untouched and can be re-activated later.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs header clear-active --user=1
	 *     wp sgs footer clear-active --user=1
	 *
	 * @param string[] $args       Positional arguments (unused).
	 * @param string[] $assoc_args Named arguments (unused).
	 *
	 * @subcommand clear-active
	 */
	public function clear_active( array $args, array $assoc_args ): void {
		unset( $args, $assoc_args );

		if ( ! \current_user_can( 'edit_theme_options' ) ) {
			\WP_CLI::error( 'edit_theme_options capability required — pass --user=<id> (e.g. --user=1).' );
		}

		Sgs_Active_Layout::clear_active( $this->area );

		\WP_CLI::success( "Active {$this->area} pointer cleared — the immutable framework default now serves." );
	}

	// -------------------------------------------------------------------------
	// wp sgs <header|footer> list
	// -------------------------------------------------------------------------

	/**
	 * List saved header/footer layouts with an Active indicator.
	 *
	 * The Active column is derived from Sgs_Active_Layout::get_stored_id(),
	 * the UNVALIDATED pointer — so a row is still marked Active even if that
	 * post has since been trashed, matching the admin list-table behaviour
	 * (an operator needs to see why their layout stopped rendering).
	 *
	 * ## OPTIONS
	 *
	 * [--format=<format>]
	 * : Output format. table, csv, json, yaml, or count.
	 * ---
	 * default: table
	 * options:
	 *   - table
	 *   - csv
	 *   - json
	 *   - yaml
	 *   - count
	 * ---
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs header list
	 *     wp sgs footer list --format=json
	 *
	 * @param string[] $args       Positional arguments (unused).
	 * @param string[] $assoc_args Named arguments.
	 */
	public function list( array $args, array $assoc_args ): void {
		unset( $args );

		$post_type = Sgs_Active_Layout::post_type( $this->area );
		$active_id = Sgs_Active_Layout::get_stored_id( $this->area );

		// phpcs:ignore WordPress.WP.PostsPerPage.posts_per_page_numberposts
		$posts = \get_posts(
			array(
				'post_type'     => $post_type,
				'post_status'   => 'any',
				'numberposts'   => -1,
				'no_found_rows' => true,
				'orderby'       => 'title',
				'order'         => 'ASC',
			)
		);

		$items = array();
		foreach ( $posts as $post ) {
			$items[] = array(
				'ID'     => $post->ID,
				'Title'  => $post->post_title,
				'Status' => $post->post_status,
				'Active' => ( $active_id === $post->ID ) ? 'yes' : '',
			);
		}

		$format = isset( $assoc_args['format'] ) ? (string) $assoc_args['format'] : 'table';

		\WP_CLI\Utils\format_items( $format, $items, array( 'ID', 'Title', 'Status', 'Active' ) );
	}

	// -------------------------------------------------------------------------
	// wp sgs <header|footer> seed-starter <slug>
	// -------------------------------------------------------------------------

	/**
	 * Create a new sgs_header/sgs_footer post seeded from a named starter
	 * block pattern.
	 *
	 * The starter must already be a registered block pattern (theme patterns
	 * under theme/sgs-theme/patterns/ scoped `Block Types: core/post-content`
	 * + `Post Types: sgs_header`/`sgs_footer` register automatically). The new
	 * post is created as a DRAFT — it is not made active by this command; run
	 * `set-active` afterwards once it has been reviewed and published.
	 *
	 * ## OPTIONS
	 *
	 * <pattern-slug>
	 * : Registered block pattern slug to seed from, e.g.
	 *   sgs/framework-header-centred.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs header seed-starter sgs/framework-header-centred --user=1
	 *     wp sgs footer seed-starter sgs/framework-footer-default --user=1
	 *
	 * @param string[] $args       Positional arguments.
	 * @param string[] $assoc_args Named arguments (unused).
	 *
	 * @subcommand seed-starter
	 */
	public function seed_starter( array $args, array $assoc_args ): void {
		unset( $assoc_args );

		if ( ! \current_user_can( 'edit_theme_options' ) ) {
			\WP_CLI::error( 'edit_theme_options capability required — pass --user=<id> (e.g. --user=1).' );
		}

		$slug = $args[0] ?? '';
		if ( '' === $slug ) {
			\WP_CLI::error( "Usage: wp sgs {$this->area} seed-starter <pattern-slug>" );
		}

		if ( ! \class_exists( '\\WP_Block_Patterns_Registry' ) ) {
			\WP_CLI::error( 'WP_Block_Patterns_Registry unavailable in this CLI context.' );
		}

		$registry = \WP_Block_Patterns_Registry::get_instance();
		if ( ! $registry || ! $registry->is_registered( $slug ) ) {
			\WP_CLI::error( "Pattern '{$slug}' is not registered in this CLI context — check the slug and that the theme is active." );
		}

		$pattern = $registry->get_registered( $slug );
		$content = ( \is_array( $pattern ) && isset( $pattern['content'] ) && \is_string( $pattern['content'] ) ) ? $pattern['content'] : '';

		if ( '' === $content ) {
			\WP_CLI::error( "Pattern '{$slug}' has no content." );
		}

		$post_type     = Sgs_Active_Layout::post_type( $this->area );
		$pattern_title = ( \is_array( $pattern ) && isset( $pattern['title'] ) && \is_string( $pattern['title'] ) ) ? $pattern['title'] : $slug;

		$post_id = \wp_insert_post(
			array(
				'post_type'    => $post_type,
				'post_status'  => 'draft',
				'post_title'   => \sanitize_text_field( $pattern_title ),
				'post_content' => $content,
			),
			true
		);

		if ( \is_wp_error( $post_id ) ) {
			\WP_CLI::error( $post_id->get_error_message() );
		}

		\WP_CLI::success( "Draft {$this->area} #{$post_id} ('{$pattern_title}') seeded from '{$slug}'. Publish and run set-active to activate it." );
	}
}
