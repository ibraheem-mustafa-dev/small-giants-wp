<?php // phpcs:ignore WordPress.Files.FileName.InvalidClassFileName -- class name is intentionally un-prefixed; prefix lives in the block namespace.
/**
 * Shared navigation menu-source resolver.
 *
 * ONE source of truth for "where does the site's primary menu live". The bar
 * (sgs/nav-menu) and the drawer (sgs/nav-drawer) both resolve their menu through
 * this class, so a single WordPress menu drives both — no divergent/duplicated
 * menu content (Spec 17 FR-S9-4 "one menu source"; composite-mirror R-31-9).
 *
 * TWO menu formats resolve here (Spec 36 FR-36-1). **Classic menus are PRIMARY**
 * (Appearance → Menus, `nav_menu` terms); block-based `wp_navigation` posts are
 * the Phase-3 extra. A classic menu is normalised into the same block-shaped
 * array a `wp_navigation` post parses to, so everything downstream —
 * SGS_Nav_Menu_Bar_Renderer::flatten(), the drawer, edit.js's featured mirror —
 * speaks one dialect and needs no knowledge of which format was picked.
 *
 * Resolution order (get_menu_blocks):
 *   1. An explicit ref passed by the caller (the block's own `ref` attribute) —
 *      resolved CLASSIC-FIRST, then wp_navigation (see blocks_from_ref).
 *   2. The active header template part → the nav block's ref
 *      (used by the drawer, which does not know the ref itself).
 *   3. Back-compat: a core/navigation block in the header (its ref or inline
 *      innerBlocks) — so an un-migrated header still populates the drawer.
 *   4. Fallback, in FR-36-1's stated order: (a) a registered classic theme menu
 *      location, (b) the most-recent classic menu, (c) the most-recent published
 *      wp_navigation post.
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
	 * Resolve the nav-holding block names searched for in the header, in priority order.
	 *
	 * Order matters: sgs/nav-menu is the canonical SGS nav block (Spec 36 rebuild,
	 * FR-36-1). sgs/adaptive-nav was retired (FR-37-21). core/navigation is kept for
	 * back-compat with headers not yet migrated — WooCommerce hooks its
	 * mini-cart/customer-account onto it.
	 *
	 * NOT a bare hardcoded const (R-31-1 DB-first). This was `private const
	 * NAV_BLOCK_NAMES` until Spec 36 Wave-0 flagged it as the exact anti-pattern the
	 * binding rule forbids. The seed list below is run through two DB/registry-style
	 * gates instead of being trusted as-is:
	 *   1. `apply_filters( 'sgs_nav_menu_block_names', ... )` — a future nav-holding
	 *      block (or a follow-up that declares `supports.sgs.navMenuBlock` in
	 *      block.json and derives this list from the block registry) can extend or
	 *      replace the seed without editing this class.
	 *   2. Pruned to block names actually present in WordPress's OWN
	 *      `WP_Block_Type_Registry` — a retired/renamed slug drops out on its own,
	 *      no edit needed here.
	 *
	 * Honest ceiling for this pass (documented per the build brief): sgs-framework.db
	 * already has a `navigation` capability in `block_capabilities`, but it is
	 * currently assigned to sgs/breadcrumbs and sgs/table-of-contents — neither of
	 * which is "menu-holding root block in a header row" in this class's sense.
	 * Routing off that table as-is would silently break menu resolution, so it
	 * was not used. The clean DB-first fix is a follow-up: either add the real
	 * nav-holding blocks to `block_capabilities` under a distinct capability (e.g.
	 * `nav-menu-holder`), or declare `supports.sgs.navMenuBlock` per block.json and
	 * derive this list from the registry at runtime — both are block.json changes,
	 * out of scope for this file-only pass.
	 *
	 * @return string[] Registered nav-holding block names, in priority order.
	 */
	private static function get_nav_block_names(): array {
		$names = (array) apply_filters(
			'sgs_nav_menu_block_names',
			array( 'sgs/nav-menu', 'core/navigation' )
		);

		$registry = WP_Block_Type_Registry::get_instance();

		return array_values(
			array_filter(
				$names,
				static function ( $name ) use ( $registry ) {
					return $registry->is_registered( $name );
				}
			)
		);
	}

	/**
	 * Resolve the site's primary menu to an array of parsed nav blocks.
	 *
	 * When nothing resolves and $page_list_fallback is true, returns a synthetic
	 * core/page-list block so BOTH the bar and the drawer render the published
	 * page hierarchy identically (one-source parity).
	 *
	 * @param int  $ref                Optional explicit wp_navigation post id.
	 * @param bool $page_list_fallback Whether to fall back to a page-list when no menu resolves.
	 * @return array Parsed nav blocks (core/navigation-link / -submenu / page-list).
	 */
	public static function get_menu_blocks( int $ref = 0, bool $page_list_fallback = true ): array {
		// 1. Explicit ref wins (caller's own ref attribute, e.g. sgs/nav-menu).
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

			foreach ( self::get_nav_block_names() as $nav_block_name ) {
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

				// Inline innerBlocks are the menu ONLY for core/navigation, whose
				// children ARE the menu (core/navigation-link blocks). sgs/nav-menu
				// always resolves via its `ref` attribute above, never innerBlocks.
				if ( 'core/navigation' === $nav_block_name && ! empty( $nav['innerBlocks'] ) ) {
					return $nav['innerBlocks'];
				}
			}
		}

		// 4a. FR-36-1 default: a registered classic theme menu location.
		$located = self::blocks_from_theme_location();
		if ( ! empty( $located ) ) {
			return $located;
		}

		// 4b. Then the site's most-recent CLASSIC menu (classic is primary, FR-36-1).
		$latest_classic = self::latest_classic_menu_blocks();
		if ( ! empty( $latest_classic ) ) {
			return $latest_classic;
		}

		// 4c. Then the most-recent published wp_navigation post (block menus, Phase-3 extra).
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
	 * Resolve a menu reference to blocks — CLASSIC menu first, then wp_navigation.
	 *
	 * FR-36-1: classic WordPress menus (Appearance -> Menus, `nav_menu` terms) are the
	 * PRIMARY menu source; block-based `wp_navigation` posts are the Phase-3 extra. A
	 * `nav_menu` term id and a `wp_navigation` post id are both plain integers drawn from
	 * independent sequences, so the same number can name one of each. Bean's ruling
	 * (2026-07-20): keep the single numeric `ref` and resolve CLASSIC-FIRST — which is
	 * what "classic is primary" means when the two collide. No second attribute, no
	 * reshape of the stored value (D270: no deprecations pre-production).
	 *
	 * @param int $ref nav_menu term id (classic) or wp_navigation post id (block).
	 * @return array Parsed/normalised nav blocks, or empty array when neither resolves.
	 */
	public static function blocks_from_ref( int $ref ): array {
		if ( $ref <= 0 ) {
			return array();
		}

		$classic = self::blocks_from_classic_menu( $ref );
		if ( ! empty( $classic ) ) {
			return $classic;
		}

		$post = get_post( $ref );
		if ( $post && 'wp_navigation' === $post->post_type ) {
			return parse_blocks( $post->post_content );
		}

		return array();
	}

	/**
	 * Normalise a classic menu (`nav_menu` term) into block-shaped nav items.
	 *
	 * The whole nav pipeline downstream of this class — SGS_Nav_Menu_Bar_Renderer::flatten(),
	 * the drawer, and edit.js's featured-item mirror — already speaks ONE dialect: parsed
	 * `core/navigation-link` / `core/navigation-submenu` arrays. So a classic menu is
	 * translated into that dialect HERE, once, rather than teaching three consumers about a
	 * second menu format. Nothing downstream changes.
	 *
	 * Nesting is preserved (children become the parent's innerBlocks on a
	 * `core/navigation-submenu`) even though Phase 1's flat bar collapses a submenu to its
	 * own link — the drawer's accordion (Phase 2) needs the real tree, and discarding it
	 * here would be a silent data loss of exactly the D338 class.
	 *
	 * Identifier parity: `attrs['id']` is set to the menu item's `object_id` (the target
	 * post/term id; WordPress sets it to the item's own id for custom links), which is the
	 * same value `core/navigation-link` carries. A `featuredItemIds` entry therefore matches
	 * whether the menu is classic or block-based.
	 *
	 * @param int $term_id nav_menu term id.
	 * @return array Block-shaped nav items, or empty array when not a classic menu / no items.
	 */
	public static function blocks_from_classic_menu( int $term_id ): array {
		$menu = wp_get_nav_menu_object( $term_id );
		if ( ! $menu || is_wp_error( $menu ) ) {
			return array();
		}

		$items = wp_get_nav_menu_items( $menu->term_id, array( 'update_post_term_cache' => false ) );
		if ( empty( $items ) ) {
			return array();
		}

		// Group by parent so the tree can be built without repeated passes.
		$by_parent = array();
		foreach ( $items as $item ) {
			$by_parent[ (int) $item->menu_item_parent ][] = $item;
		}

		return self::classic_items_to_blocks( $by_parent, 0 );
	}

	/**
	 * Recursively convert one level of grouped classic menu items into nav blocks.
	 *
	 * @param array $by_parent Menu items grouped by menu_item_parent.
	 * @param int   $parent_id Parent menu-item id (0 = top level).
	 * @return array Block-shaped nav items for this level.
	 */
	private static function classic_items_to_blocks( array $by_parent, int $parent_id ): array {
		$blocks = array();

		foreach ( $by_parent[ $parent_id ] ?? array() as $item ) {
			$label = (string) $item->title;
			if ( '' === $label ) {
				continue;
			}

			$children   = self::classic_items_to_blocks( $by_parent, (int) $item->ID );
			$block_name = empty( $children ) ? 'core/navigation-link' : 'core/navigation-submenu';

			$blocks[] = array(
				'blockName'    => $block_name,
				'attrs'        => array(
					'label'         => $label,
					'url'           => (string) $item->url,
					'id'            => (int) $item->object_id,
					'kind'          => self::classic_item_kind( (string) $item->type ),
					'type'          => (string) $item->object,
					'description'   => (string) $item->description,
					'title'         => (string) $item->attr_title,
					'opensInNewTab' => '_blank' === (string) $item->target,
				),
				'innerBlocks'  => $children,
				'innerHTML'    => '',
				'innerContent' => array(),
			);
		}

		return $blocks;
	}

	/**
	 * Map a classic menu item's `type` to core/navigation-link's `kind` attribute.
	 *
	 * @param string $type Classic menu item type (post_type|taxonomy|custom|post_type_archive).
	 * @return string core/navigation-link kind value.
	 */
	private static function classic_item_kind( string $type ): string {
		switch ( $type ) {
			case 'taxonomy':
				return 'taxonomy';
			case 'post_type':
			case 'post_type_archive':
				return 'post-type';
			default:
				return 'custom';
		}
	}

	/**
	 * Resolve the menu assigned to a registered classic theme menu location.
	 *
	 * FR-36-1's stated resolution default: "a registered theme menu location (classic
	 * register_nav_menus), else the site's first/most-recent menu". `get_nav_menu_locations()`
	 * is the CLASSIC mechanism and is used only for classic menus here — the spec explicitly
	 * calls out misusing it on a block menu as a prior error.
	 *
	 * @return array Block-shaped nav items, or empty array when no location has a menu.
	 */
	public static function blocks_from_theme_location(): array {
		$locations = get_nav_menu_locations();
		if ( empty( $locations ) ) {
			return array();
		}

		// Prefer a location conventionally named for the primary nav, else the first set one.
		$preferred = array( 'primary', 'main', 'header', 'sgs-primary' );
		$ordered   = array();

		foreach ( $preferred as $slug ) {
			if ( ! empty( $locations[ $slug ] ) ) {
				$ordered[] = (int) $locations[ $slug ];
			}
		}
		foreach ( $locations as $term_id ) {
			if ( (int) $term_id > 0 ) {
				$ordered[] = (int) $term_id;
			}
		}

		foreach ( array_unique( $ordered ) as $term_id ) {
			$blocks = self::blocks_from_classic_menu( $term_id );
			if ( ! empty( $blocks ) ) {
				return $blocks;
			}
		}

		return array();
	}

	/**
	 * Resolve the site's most-recently-created classic menu.
	 *
	 * The classic half of FR-36-1's "else the site's first/most-recent menu" fallback; the
	 * wp_navigation half stays in latest_menu_blocks().
	 *
	 * @return array Block-shaped nav items, or empty array when the site has no classic menu.
	 */
	public static function latest_classic_menu_blocks(): array {
		$menus = wp_get_nav_menus();
		if ( empty( $menus ) || is_wp_error( $menus ) ) {
			return array();
		}

		// wp_get_nav_menus() orders by name; most-recent = highest term id.
		usort(
			$menus,
			static function ( $a, $b ) {
				return (int) $b->term_id <=> (int) $a->term_id;
			}
		);

		foreach ( $menus as $menu ) {
			$blocks = self::blocks_from_classic_menu( (int) $menu->term_id );
			if ( ! empty( $blocks ) ) {
				return $blocks;
			}
		}

		return array();
	}

	/**
	 * Load the active header's block markup.
	 *
	 * Resolution order — active CPT, then the template-part DB record, then the
	 * theme file:
	 *
	 *   1. The active `sgs_header` CPT post (FR-37-3 clause (b), Spec 37).
	 *   2. The published `wp_template_part` post named "header".
	 *   3. `parts/header.html` on disk.
	 *
	 * The CPT branch MUST come first, and it is load-bearing rather than a
	 * convenience. This function is not only used to render — it is also how
	 * `Sgs_Header_Behaviours` discovers whether the active header wants sticky /
	 * transparent / shrink, and that class hooks `body_class`, a DIFFERENT hook
	 * from the `pre_render_block` path that renders the header. So the two read
	 * the header through two independent routes.
	 *
	 * Teach only the render route about the CPT and the page looks perfect while
	 * every behaviour flag silently resolves false: no body classes, no sticky,
	 * no error, no failing build. That is the D338 silent-failure class, and it
	 * is exactly what FR-37-6 (emptying `parts/header.html`) would trigger if
	 * this branch were absent. FR-37-6 is gated on this branch existing.
	 *
	 * ⚠ SCOPE OF THAT FIX — do not read it as broader than it is. This closes the
	 * two-routes divergence for the ACTIVE-CPT case ONLY. The advanced path
	 * (`Sgs_Header_Rules`, FR-37-20) can select a different header pattern per
	 * page type, and this function does NOT consult the rules engine — so when a
	 * rule matches and no CPT is active, the rendered header and the header these
	 * behaviour flags describe can still be two different things (e.g. body says
	 * sticky, the rendered per-page header is not). That gap PRE-DATES the CPT
	 * work and is not introduced here, but it is real and still open. Parked as
	 * `P-HEADER-RULES-INVISIBLE-TO-BEHAVIOURS`; do not assume it is handled.
	 *
	 * @return string Header block markup, or empty string.
	 */
	public static function get_header_content(): string {
		if ( class_exists( '\\SGS\\Blocks\\Sgs_Active_Layout' ) ) {
			$active = \SGS\Blocks\Sgs_Active_Layout::get_active_content(
				\SGS\Blocks\Sgs_Active_Layout::AREA_HEADER
			);
			if ( '' !== $active ) {
				return $active;
			}
		}

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
