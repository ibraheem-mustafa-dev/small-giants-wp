<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName -- class name is intentionally un-prefixed; prefix lives in the block namespace.
/**
 * Shared navigation menu-source resolver.
 *
 * ONE source of truth for "where does the site's primary menu live". Both the
 * desktop bar (sgs/adaptive-nav) and the off-canvas drawer (sgs/mobile-nav)
 * resolve their menu through this class, so a single WordPress menu
 * (wp_navigation post) drives both — no divergent/duplicated menu content
 * (Spec 17 FR-S9-4 "one menu source"; composite-mirror R-31-9).
 *
 * Resolution order (get_menu_blocks):
 *   1. An explicit ref (wp_navigation post id) passed by the caller — used by
 *      sgs/adaptive-nav's own render.php, which stores its ref attribute.
 *   2. The active header template part → the sgs/adaptive-nav block's ref
 *      (used by the drawer, which does not know the ref itself).
 *   3. Back-compat: a core/navigation block in the header (its ref or inline
 *      innerBlocks) — so an un-migrated header still populates the drawer.
 *   4. Fallback: the most-recent published wp_navigation post.
 *   5. Empty array (caller then renders a page-list / get_pages fallback).
 *
 * All links resolved here are rendered SERVER-SIDE by the callers (crawlable +
 * AI-discoverable; no AJAX lazy-load — GPTBot/ClaudeBot/PerplexityBot do not
 * execute JS).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Resolves the site's primary navigation menu to an array of parsed blocks.
 */
class SGS_Nav_Menu_Source {

	/**
	 * The nav-holding block names searched for in the header, in priority order.
	 *
	 * Order matters: sgs/adaptive-nav is the canonical SGS nav block (it replaces
	 * core/navigation, which WooCommerce hooks its mini-cart/customer-account onto).
	 * core/navigation is kept for back-compat with headers not yet migrated.
	 *
	 * @var string[]
	 */
	private const NAV_BLOCK_NAMES = array( 'sgs/adaptive-nav', 'core/navigation' );

	/**
	 * Resolve the site's primary menu to an array of parsed nav blocks.
	 *
	 * When nothing resolves and $page_list_fallback is true, returns a synthetic
	 * core/page-list block so BOTH the bar and the drawer render the published
	 * page hierarchy identically (one-source parity). adaptive-nav passes false
	 * when its menuFallback attribute is 'none'.
	 *
	 * @param int  $ref                Optional explicit wp_navigation post id (adaptive-nav's own ref).
	 * @param bool $page_list_fallback Whether to fall back to a page-list when no menu resolves.
	 * @return array Parsed nav blocks (core/navigation-link / -submenu / page-list / mega-menu).
	 */
	public static function get_menu_blocks( int $ref = 0, bool $page_list_fallback = true ): array {
		// 1. Explicit ref wins (adaptive-nav render.php passes its own ref).
		if ( $ref > 0 ) {
			$blocks = self::blocks_from_ref( $ref );
			if ( ! empty( $blocks ) ) {
				return $blocks;
			}
		}

		// 2 + 3. Find a nav block in the active header template part.
		$header_content = self::get_header_content();
		if ( $header_content ) {
			$parsed = parse_blocks( $header_content );

			foreach ( self::NAV_BLOCK_NAMES as $nav_block_name ) {
				$nav = self::find_block_recursive( $parsed, $nav_block_name );
				if ( ! $nav ) {
					continue;
				}

				// Resolve a ref to a saved wp_navigation post.
				if ( ! empty( $nav['attrs']['ref'] ) ) {
					$blocks = self::blocks_from_ref( absint( $nav['attrs']['ref'] ) );
					if ( ! empty( $blocks ) ) {
						return $blocks;
					}
				}

				// Inline innerBlocks (e.g. a core/navigation with hand-added links).
				if ( ! empty( $nav['innerBlocks'] ) ) {
					return $nav['innerBlocks'];
				}
			}
		}

		// 4. Fallback: the most-recent published wp_navigation post.
		$latest = self::latest_menu_blocks();
		if ( ! empty( $latest ) ) {
			return $latest;
		}

		// 5. Nothing configured — a synthetic page-list so the bar AND the drawer
		// render the published page hierarchy identically (one-source parity).
		if ( $page_list_fallback ) {
			return array(
				array(
					'blockName'    => 'core/page-list',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerHTML'    => '',
					'innerContent' => array(),
				),
			);
		}

		return array();
	}

	/**
	 * Parse a wp_navigation post's content into blocks.
	 *
	 * @param int $ref wp_navigation post id.
	 * @return array Parsed blocks, or empty array when the post is missing/wrong type.
	 */
	public static function blocks_from_ref( int $ref ): array {
		$post = get_post( $ref );
		if ( $post && 'wp_navigation' === $post->post_type ) {
			return parse_blocks( $post->post_content );
		}
		return array();
	}

	/**
	 * Load the active header template part content (DB record first, then the file).
	 *
	 * @return string Header template-part content, or empty string.
	 */
	public static function get_header_content(): string {
		$header_post = get_posts(
			array(
				'post_type'      => 'wp_template_part',
				'name'           => 'header',
				'posts_per_page' => 1,
				'post_status'    => 'publish',
			)
		);

		if ( ! empty( $header_post ) ) {
			return (string) $header_post[0]->post_content;
		}

		$file = get_theme_file_path( 'parts/header.html' );
		if ( file_exists( $file ) ) {
			return (string) file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		}

		return '';
	}

	/**
	 * Query the most recent published wp_navigation post as a fallback.
	 *
	 * @return array Parsed inner blocks, or empty array if none found.
	 */
	public static function latest_menu_blocks(): array {
		$posts = get_posts(
			array(
				'post_type'      => 'wp_navigation',
				'posts_per_page' => 1,
				'post_status'    => 'publish',
				'orderby'        => 'date',
				'order'          => 'DESC',
			)
		);

		if ( empty( $posts ) ) {
			return array();
		}

		return parse_blocks( $posts[0]->post_content );
	}

	/**
	 * Depth-first search through a parsed block tree for a named block.
	 *
	 * @param array  $blocks     Parsed blocks array.
	 * @param string $block_name Fully-qualified block name, e.g. 'sgs/adaptive-nav'.
	 * @return array|null The found block array, or null.
	 */
	public static function find_block_recursive( array $blocks, string $block_name ): ?array {
		foreach ( $blocks as $block ) {
			if ( isset( $block['blockName'] ) && $block_name === $block['blockName'] ) {
				return $block;
			}
			if ( ! empty( $block['innerBlocks'] ) ) {
				$found = self::find_block_recursive( $block['innerBlocks'], $block_name );
				if ( null !== $found ) {
					return $found;
				}
			}
		}
		return null;
	}
}
