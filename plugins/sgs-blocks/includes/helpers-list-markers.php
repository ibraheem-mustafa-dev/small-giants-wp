<?php
/**
 * Shared list-marker renderer — ONE helper for every block that renders a
 * marked list (Spec 36 FR-36-26c). Decides (a) which HTML tag the list root
 * uses and (b) how each `<li>`'s marker is produced, from a single
 * `markerType` value: icon | emoji | bullet | numbered | none.
 *
 * `numbered` MUST change the ELEMENT to a real `<ol>` — CSS counters on a
 * `<ul>` reach neither assistive tech nor crawlers (FR-36-26/FR-36-26c).
 * All other marker types stay on `<ul>`.
 *
 * Lives under `includes/` (never inside a block folder) because
 * `--webpack-copy-php` only copies paths named in `block.json`; a sibling
 * file inside the block would 500 in production (learned on the mini-cart,
 * 2026-07-23). Aggregated by `render-helpers.php` alongside its siblings.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_list_marker_types' ) ) {
	/**
	 * The allowed `markerType` values (no JSON `enum` on the attribute —
	 * blockjson-enum-coerces-invalid-to-default — so callers validate here).
	 *
	 * @return array<int,string>
	 */
	function sgs_list_marker_types() {
		return array( 'icon', 'emoji', 'bullet', 'numbered', 'none' );
	}
}

if ( ! function_exists( 'sgs_list_marker_sanitise_type' ) ) {
	/**
	 * Validate a stored `markerType` value, falling back to a safe default.
	 *
	 * @param mixed  $raw           Stored attribute value.
	 * @param string $fallback_type Fallback when invalid/unknown. Default 'icon'.
	 * @return string One of sgs_list_marker_types().
	 */
	function sgs_list_marker_sanitise_type( $raw, $fallback_type = 'icon' ) {
		return in_array( $raw, sgs_list_marker_types(), true ) ? $raw : $fallback_type;
	}
}

if ( ! function_exists( 'sgs_list_marker_element_tag' ) ) {
	/**
	 * The list ROOT tag for a given marker type. `numbered` renders a real
	 * `<ol>` so order is conveyed to assistive tech and crawlers; every other
	 * marker type renders `<ul>`.
	 *
	 * @param string $marker_type One of sgs_list_marker_types().
	 * @return string 'ol'|'ul'.
	 */
	function sgs_list_marker_element_tag( $marker_type ) {
		return 'numbered' === $marker_type ? 'ol' : 'ul';
	}
}

if ( ! function_exists( 'sgs_list_marker_render' ) ) {
	/**
	 * Build the per-item marker markup for one `<li>`.
	 *
	 * - `icon` / `emoji` — wraps the caller's already-resolved icon markup
	 *   (built by the block's own icon/emoji source resolver) in the
	 *   decorative `.sgs-icon-list__icon` span.
	 * - `bullet` — no custom span; the list's `list-style` (CSS) supplies a
	 *   native `::marker` bullet.
	 * - `numbered` — no custom span; the `<ol>` element supplies native
	 *   numbering (assistive tech + crawlers read this, unlike CSS counters).
	 * - `none` — no marker of any kind.
	 *
	 * @param string $marker_type One of sgs_list_marker_types().
	 * @param string $icon_html   Pre-rendered, already-escaped icon/emoji
	 *                            inner markup (only used for icon/emoji).
	 * @return string Marker markup to place before the item's text, or ''.
	 */
	function sgs_list_marker_render( $marker_type, $icon_html ) {
		switch ( $marker_type ) {
			case 'icon':
			case 'emoji':
				return '<span class="sgs-icon-list__icon" aria-hidden="true">' . $icon_html . '</span>';
			case 'bullet':
			case 'numbered':
			case 'none':
			default:
				return '';
		}
	}
}

if ( ! function_exists( 'sgs_icon_list_flatten_menu_blocks' ) ) {
	/**
	 * Flatten resolved nav blocks (from SGS_Nav_Menu_Source::blocks_from_ref())
	 * into `{ text, url }` pairs shaped like an `sgs/icon-list` typed item, so a
	 * menu-bound list renders through the SAME per-item loop as typed items.
	 *
	 * Top-level items only — a submenu collapses to its own parent link,
	 * matching sgs/nav-menu's Phase-1 bar behaviour. The menu RESOLUTION
	 * (classic-menu lookup, term -> items) stays in SGS_Nav_Menu_Source; only
	 * the flatten step is here.
	 *
	 * MUST live in this shared include, NOT in a block's render.php: render.php
	 * is re-included once per block instance, so a top-level function declared
	 * there fatals ("Cannot redeclare") the moment a page holds two of the same
	 * block. (Caught live 2026-07-23 — a 5-instance test page 500'd.)
	 *
	 * @param array $blocks Parsed nav blocks.
	 * @return array<int, array{text:string, url:string}>
	 */
	function sgs_icon_list_flatten_menu_blocks( array $blocks ) {
		$flat = array();
		foreach ( $blocks as $block ) {
			$name = $block['blockName'] ?? '';
			switch ( $name ) {
				case 'core/navigation-link':
				case 'core/navigation-submenu': // Parent's own link only — no nested children this phase.
					$label = (string) ( $block['attrs']['label'] ?? '' );
					if ( '' === $label ) {
						break;
					}
					$flat[] = array(
						'text' => $label,
						'url'  => (string) ( $block['attrs']['url'] ?? '#' ),
					);
					break;
				case 'core/home-link':
					$flat[] = array(
						'text' => __( 'Home', 'sgs-blocks' ),
						'url'  => home_url( '/' ),
					);
					break;
				case 'core/page-list':
					$pages = get_pages(
						array(
							'parent'      => (int) ( $block['attrs']['parentPageID'] ?? 0 ),
							'sort_column' => 'menu_order,post_title',
							'post_status' => 'publish',
						)
					);
					foreach ( $pages as $page ) {
						$flat[] = array(
							'text' => (string) $page->post_title,
							'url'  => (string) get_permalink( $page->ID ),
						);
					}
					break;
				default:
					// Whitespace / unknown block — skip.
					break;
			}
		}
		return $flat;
	}
}
