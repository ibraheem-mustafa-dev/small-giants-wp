<?php
/**
 * SGS header/footer/drawer LIFECYCLE WP-CLI commands (FR-37-30, Spec 37).
 *
 * The `wp sgs header <...>`, `wp sgs footer <...>` and `wp sgs drawer <...>`
 * command sets cover the CPT-backed lifecycle non-interactively: set/clear the
 * active pointer, list saved layouts, seed a new layout from a starter
 * pattern. Explicitly NOT a client-facing surface — clients use the "Advanced
 * Headers"/"Advanced Footers"/"Menu drawers" admin screens exclusively. It
 * gives the cloning pipeline (FR-37-22) and developers a programmatic path.
 *
 * One class serves `wp sgs header`, `wp sgs footer` and `wp sgs drawer` — each
 * is registered as a separate instance carrying its own area token (see the
 * registration block in sgs-blocks.php), so the command trees share
 * identical behaviour with zero duplicated logic.
 *
 * Active-pointer reads/writes ALWAYS delegate to {@see Sgs_Active_Layout} —
 * this class never touches the `sgs_active_{header,footer,drawer}_cpt_id`
 * options directly.
 *
 * Registration (in sgs-blocks.php, inside the existing WP_CLI conditional):
 *
 *   require_once SGS_BLOCKS_PATH . 'includes/class-sgs-header-footer-cli-commands.php';
 *   \WP_CLI::add_command( 'sgs header', new Sgs_Header_Footer_Cli_Commands( Sgs_Active_Layout::AREA_HEADER ) );
 *   \WP_CLI::add_command( 'sgs footer', new Sgs_Header_Footer_Cli_Commands( Sgs_Active_Layout::AREA_FOOTER ) );
 *   \WP_CLI::add_command( 'sgs drawer', new Sgs_Header_Footer_Cli_Commands( Sgs_Active_Layout::AREA_DRAWER ) );
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
 * SGS header/footer/drawer lifecycle WP-CLI commands.
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
 *
 *     wp sgs drawer list
 *     wp sgs drawer set-active 63 --user=1
 *     wp sgs drawer clear-active --user=1
 *     wp sgs drawer seed-starter --all --user=1
 */
final class Sgs_Header_Footer_Cli_Commands {

	/**
	 * Area token this instance serves — 'header', 'footer' or 'drawer'.
	 *
	 * @var string
	 */
	private $area;

	/**
	 * Bind this command tree to a single layout area.
	 *
	 * @param string $area {@see Sgs_Active_Layout::AREA_HEADER}, {@see Sgs_Active_Layout::AREA_FOOTER} or {@see Sgs_Active_Layout::AREA_DRAWER}.
	 */
	public function __construct( string $area ) {
		$this->area = $area;
	}

	// -------------------------------------------------------------------------
	// wp sgs <header|footer|drawer> set-active <post-id>
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
	 * : The post ID of the sgs_header/sgs_footer/sgs_drawer layout to activate. Must
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
	// wp sgs <header|footer|drawer> clear-active
	// -------------------------------------------------------------------------

	/**
	 * Clear the active pointer for this area, restoring the immutable
	 * framework default.
	 *
	 * Delegates to Sgs_Active_Layout::clear_active(). The active
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
	// wp sgs <header|footer|drawer> list
	// -------------------------------------------------------------------------

	/**
	 * List saved header/footer/drawer layouts with an Active indicator.
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
	// wp sgs <header|footer|drawer> seed-starter <slug> | --all
	// -------------------------------------------------------------------------

	/**
	 * Create sgs_header/sgs_footer/sgs_drawer posts seeded from starter block
	 * patterns.
	 *
	 * With a slug, creates one new post from that registered block pattern
	 * (theme patterns under theme/sgs-theme/patterns/ scoped `Block Types:
	 * core/post-content` + `Post Types: sgs_header`/`sgs_footer`/`sgs_drawer`
	 * register automatically). The new post is a DRAFT — it is not made active
	 * by this command; run `set-active` afterwards once it has been reviewed and
	 * published.
	 *
	 * With `--all`, creates every framework look of the area that has no post
	 * yet, as PUBLISHED posts that are NOT made active. Looks already seeded
	 * (any status, trash included) are skipped, so re-running never duplicates
	 * or overwrites a client's edited copy. Only areas with a starter library
	 * support `--all` (currently `drawer`).
	 *
	 * ## OPTIONS
	 *
	 * [<pattern-slug>]
	 * : Registered block pattern slug to seed from, e.g.
	 *   sgs/framework-header-centred. Omit when using --all.
	 *
	 * [--all]
	 * : Seed every missing framework look for the area instead of one slug.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs header seed-starter sgs/framework-header-centred --user=1
	 *     wp sgs footer seed-starter sgs/framework-footer-default --user=1
	 *     wp sgs drawer seed-starter --all --user=1
	 *
	 * @param string[]            $args       Positional arguments.
	 * @param array<string,mixed> $assoc_args Named arguments.
	 *
	 * @subcommand seed-starter
	 */
	public function seed_starter( array $args, array $assoc_args ): void {
		Sgs_Starter_Cli_Seeder::run( $this->area, $args, $assoc_args );
	}
}
