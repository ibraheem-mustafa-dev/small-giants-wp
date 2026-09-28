<?php
/**
 * `sgs/nav-drawer-menu` — two small row-level helpers split out of
 * `nav-drawer-menu-items.php` once that file reached the project's 300-line
 * cap (2026-09-28): I-D9's "real destination" check, and G-7's per-item
 * trailing icon.
 *
 * `require_once`'d by `nav-drawer-menu-items.php`; every function is
 * `function_exists`-guarded.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_drawer_menu_has_real_destination' ) ) {
	/**
	 * I-D9 (2026-09-28): whether a menu item's URL is a genuine, visitable
	 * destination — not just a non-empty string. Beyond the existing empty/'#'
	 * check (SGS_Nav_Menu_Source::is_destination_url()), an item can point at a
	 * real post whose POST TYPE is not publicly queryable (e.g. Indus's "About"
	 * pointing at an sgs_mega_menu post — WordPress still generates it a
	 * permalink, but publicly_queryable=>false means that permalink 404s for a
	 * visitor). Such an item has no destination of its own; its whole row
	 * should act as the accordion toggle rather than a dead link.
	 *
	 * @param string $raw_url   The item's own URL as authored.
	 * @param int    $object_id The linked post's ID (0 for a custom link).
	 * @return bool True when the item has a real, visitable destination.
	 */
	function sgs_nav_drawer_menu_has_real_destination( string $raw_url, int $object_id ): bool {
		if ( ! SGS_Nav_Menu_Source::is_destination_url( $raw_url ) ) {
			return false;
		}
		if ( $object_id <= 0 ) {
			return true;
		}
		$post_type = get_post_type( $object_id );
		if ( ! $post_type ) {
			return true;
		}
		$post_type_object = get_post_type_object( $post_type );
		return ! $post_type_object || $post_type_object->publicly_queryable;
	}
}

if ( ! function_exists( 'sgs_nav_drawer_menu_trailing_icon_html' ) ) {
	/**
	 * G-7 (2026-09-28): one item's trailing icon, resolved from the block's
	 * itemTrailingIcons map by the item's own identifier. Standard library
	 * sources (lucide/wp-icon/dashicon/emoji) go through the shared
	 * sgs_nav_shared_icon_markup() resolver; 'custom' is a client-supplied
	 * inline SVG, re-sanitised SERVER-SIDE via wp_kses() — the IconPicker's
	 * own client-side sanitiser (sanitiseSvg()) is a second enforcement
	 * layer, never the only one, since a value can reach here by direct
	 * REST/DB write.
	 *
	 * @param array $item    A flattened menu item.
	 * @param array $options sgs_nav_drawer_menu_row_options().
	 * @return string HTML, or ''.
	 */
	function sgs_nav_drawer_menu_trailing_icon_html( array $item, array $options ): string {
		$map  = is_array( $options['trailing_icons'] ?? null ) ? $options['trailing_icons'] : array();
		$icon = $map[ (string) ( $item['identifier'] ?? '' ) ] ?? null;
		if ( ! is_array( $icon ) || empty( $icon['source'] ) ) {
			return '';
		}

		if ( 'custom' === $icon['source'] ) {
			$svg = (string) ( $icon['svg'] ?? '' );
			if ( '' === trim( $svg ) || ! function_exists( 'sgs_svg_kses_allowed_tags' ) ) {
				return '';
			}
			$safe = wp_kses( $svg, sgs_svg_kses_allowed_tags() );
			return '' === trim( $safe ) ? '' : '<span class="sgs-nav-drawer-menu__trailing-icon" aria-hidden="true">' . $safe . '</span>';
		}

		if ( ! function_exists( 'sgs_get_lucide_icon' ) ) {
			return '';
		}
		$markup = sgs_nav_shared_icon_markup(
			$icon,
			array(
				'source' => 'lucide',
				'name'   => '',
			)
		);
		return '' === $markup ? '' : '<span class="sgs-nav-drawer-menu__trailing-icon" aria-hidden="true">' . $markup . '</span>';
	}
}
