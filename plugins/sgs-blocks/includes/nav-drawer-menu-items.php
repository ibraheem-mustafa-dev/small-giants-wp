<?php
/**
 * `sgs/nav-drawer-menu` — per-row markup pieces for
 * `sgs_nav_drawer_menu_render_items()` (Wave 3C U-6 + U-7, design note
 * `.claude/reports/2026-09-25-u6-u7-design.md`): the resolved row options,
 * the leading ornament, the label with its optional roll copy, the per-item
 * media, and the accordion row shared by dropdown items and mega items.
 *
 * `require_once`'d by `nav-menu-markup.php` (itself per-instance from the
 * nav blocks' render.php); every function is `function_exists`-guarded.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// Self-contained: the row pieces call the roll helpers and the icon resolver,
// so a caller that has not bootstrapped render-helpers.php (a test harness,
// a cross-block call) still gets them. Both files hold guarded declarations only.
require_once __DIR__ . '/helpers-item-effects.php';
require_once __DIR__ . '/nav-menu-treatments.php';
require_once __DIR__ . '/nav-drawer-menu-extras-css.php';
require_once __DIR__ . '/nav-drawer-menu-row-extras.php';

if ( ! function_exists( 'sgs_nav_drawer_menu_row_options' ) ) {
	/**
	 * Resolve the drawer menu's per-row options once per render.
	 *
	 * @param array $attributes Block attributes.
	 * @return array{mega_mode:string,roll:string,ornament_html:string,ornament_hover_html:string,has_ornament:bool,expander_html:string,media:bool,media_size:string,disabled_ids:string[],ornament_hidden_ids:string[],ornament_reserve:bool}
	 */
	function sgs_nav_drawer_menu_row_options( array $attributes ): array {
		$ornament      = is_array( $attributes['itemOrnament'] ?? null ) ? $attributes['itemOrnament'] : array();
		$ornament_used = array_intersect( array_values( $ornament ), array( 'index', 'icon' ) );
		$uses_icon     = in_array( 'icon', $ornament, true );
		$none          = array(
			'source' => 'lucide',
			'name'   => '',
		);

		$media_width = is_array( $attributes['itemMediaWidth'] ?? null ) ? $attributes['itemMediaWidth'] : array();
		// The icon library loads with the blocks' render.php; a caller without
		// it gets no glyphs (the same guard the expander always had).
		$icons = function_exists( 'sgs_get_lucide_icon' );

		return array(
			'mega_mode'           => 'link' === ( $attributes['megaDrawerMode'] ?? 'panel' ) ? 'link' : 'panel',
			'roll'                => sgs_label_roll_value( $attributes['labelRoll'] ?? '' ),
			'has_ornament'        => ! empty( $ornament_used ),
			'ornament_html'       => ( $uses_icon && $icons ) ? sgs_nav_shared_icon_markup(
				$attributes['itemOrnamentIcon'] ?? null,
				array(
					'source' => 'lucide',
					'name'   => 'arrow-right',
				)
			) : '',
			'ornament_hover_html' => ( $uses_icon && $icons ) ? sgs_nav_shared_icon_markup( $attributes['itemOrnamentIconHover'] ?? null, $none ) : '',
			'expander_html'       => $icons ? sgs_nav_shared_icon_markup(
				$attributes['itemExpanderIcon'] ?? null,
				array(
					'source' => 'lucide',
					'name'   => 'chevron-down',
				)
			) : '',
			'media'               => 'featured-image' === ( $attributes['itemMedia'] ?? '' ),
			'media_size'          => sgs_nav_drawer_menu_media_size( $media_width ),
			// G-7 — per-item trailing icon map (item identifier => {source,name}
			// or {source:'custom', svg}), resolved lazily per row in
			// sgs_nav_drawer_menu_trailing_icon_html() so an unused entry never
			// costs a sanitise/lookup.
			'trailing_icons'      => is_array( $attributes['itemTrailingIcons'] ?? null ) ? $attributes['itemTrailingIcons'] : array(),
			// Parity with sgs/nav-bar-menu (2026-09-28) — read by
			// sgs_nav_drawer_menu_accordion_html() for the accordion-parent
			// row's disabled treatment.
			'disabled_ids'        => is_array( $attributes['disabledItemIds'] ?? null ) ? $attributes['disabledItemIds'] : array(),
			// Per-item ornament opt-out (2026-09-28) — item identifiers (same
			// scheme as disabled_ids/featuredItemIds) that render NO ornament
			// span at all, read by sgs_nav_drawer_menu_label_inner() for both
			// leaf and accordion-parent rows.
			'ornament_hidden_ids' => is_array( $attributes['ornamentHiddenItemIds'] ?? null ) ? $attributes['ornamentHiddenItemIds'] : array(),
			'ornament_reserve'    => ! empty( $attributes['itemOrnamentReserveSpace'] ),
		);
	}
}

if ( ! function_exists( 'sgs_nav_drawer_menu_media_size' ) ) {
	/**
	 * The smallest registered image size at least as wide as the widest tier's
	 * media width (px only; anything else takes `medium_large`).
	 *
	 * @param array $width_tiers `itemMediaWidth` tier object.
	 * @return string An image size name.
	 */
	function sgs_nav_drawer_menu_media_size( array $width_tiers ): string {
		$max = 0;
		foreach ( $width_tiers as $value ) {
			if ( is_string( $value ) && preg_match( '/^(\d+(?:\.\d+)?)px$/', trim( $value ), $m ) ) {
				$max = max( $max, (float) $m[1] );
			} elseif ( is_numeric( $value ) ) {
				$max = max( $max, (float) $value );
			}
		}
		if ( $max <= 0 ) {
			return 'medium_large';
		}
		$best       = 'full';
		$best_width = PHP_INT_MAX;
		foreach ( wp_get_registered_image_subsizes() as $name => $size ) {
			$w = (int) ( $size['width'] ?? 0 );
			if ( $w >= 2 * $max && $w < $best_width ) {
				$best       = $name;
				$best_width = $w;
			}
		}
		return $best;
	}
}

if ( ! function_exists( 'sgs_nav_drawer_menu_media_html' ) ) {
	/**
	 * The per-item media: the linked post's featured image, decorative.
	 *
	 * An animated image (GIF, or a WebP) is served at `full`: WordPress's
	 * resized copies of a GIF keep only the first frame, and an animated
	 * thumbnail is the point of the effect. A custom link has no post and
	 * renders nothing.
	 *
	 * @param array $item    A flattened menu item.
	 * @param array $options sgs_nav_drawer_menu_row_options().
	 * @return string HTML, or ''.
	 */
	function sgs_nav_drawer_menu_media_html( array $item, array $options ): string {
		if ( empty( $options['media'] ) ) {
			return '';
		}
		$post_id = (int) ( $item['object_id'] ?? 0 );
		if ( $post_id <= 0 || 'custom' === ( $item['type'] ?? '' ) || 'sgs_mega_menu' === ( $item['type'] ?? '' ) ) {
			return '';
		}
		$thumb_id = (int) get_post_thumbnail_id( $post_id );
		if ( $thumb_id <= 0 ) {
			return '';
		}
		$mime = (string) get_post_mime_type( $thumb_id );
		$size = in_array( $mime, array( 'image/gif', 'image/webp' ), true ) ? 'full' : (string) $options['media_size'];
		$img  = wp_get_attachment_image(
			$thumb_id,
			$size,
			false,
			array(
				'alt'      => '',
				'loading'  => 'lazy',
				'decoding' => 'async',
				'class'    => 'sgs-nav-drawer-menu__media-img',
			)
		);
		return '' === $img ? '' : '<span class="sgs-nav-drawer-menu__media" aria-hidden="true">' . $img . '</span>';
	}
}

if ( ! function_exists( 'sgs_nav_drawer_menu_label_inner' ) ) {
	/**
	 * A primary row's inner label: ornament, label text (with its roll copy)
	 * and media. The ornament is decorative (`aria-hidden`); an `index`
	 * ornament is painted by CSS as a counter on this span.
	 *
	 * An item listed in `ornamentHiddenItemIds` shows no ornament. With
	 * `itemOrnamentReserveSpace` on it keeps the ornament's space (an empty,
	 * invisible `--blank` span, so its label lines up with the other rows);
	 * otherwise it gets no span and so no gap before the label.
	 *
	 * @param array $item    A flattened menu item.
	 * @param array $options sgs_nav_drawer_menu_row_options().
	 * @return string HTML.
	 */
	function sgs_nav_drawer_menu_label_inner( array $item, array $options ): string {
		$ornament_hidden_ids = is_array( $options['ornament_hidden_ids'] ?? null ) ? $options['ornament_hidden_ids'] : array();
		$ornament_hidden     = in_array( (string) ( $item['identifier'] ?? '' ), $ornament_hidden_ids, true );

		$ornament = '';
		if ( ! $ornament_hidden && ! empty( $options['has_ornament'] ) ) {
			$hover     = (string) ( $options['ornament_hover_html'] ?? '' );
			$ornament  = '<span class="sgs-nav-drawer-menu__ornament' . ( '' !== $hover ? ' sgs-nav-drawer-menu__ornament--swap' : '' ) . '" aria-hidden="true">';
			$ornament .= '' !== (string) $options['ornament_html'] ? '<span class="sgs-nav-drawer-menu__ornament-glyph">' . $options['ornament_html'] . '</span>' : '';
			$ornament .= '' !== $hover ? '<span class="sgs-nav-drawer-menu__ornament-glyph sgs-nav-drawer-menu__ornament-glyph--hover">' . $hover . '</span>' : '';
			$ornament .= '</span>';
		} elseif ( $ornament_hidden && ! empty( $options['has_ornament'] ) && ! empty( $options['ornament_reserve'] ) ) {
			$ornament = '<span class="sgs-nav-drawer-menu__ornament sgs-nav-drawer-menu__ornament--blank" aria-hidden="true"><span class="sgs-nav-drawer-menu__ornament-glyph"></span></span>';
		}
		return $ornament
			. '<span class="sgs-nav-drawer-menu__link-text">' . sgs_label_roll_markup( (string) ( $item['label'] ?? '' ), (string) ( $options['roll'] ?? '' ) ) . '</span>'
			. sgs_nav_drawer_menu_media_html( $item, $options )
			. sgs_nav_drawer_menu_trailing_icon_html( $item, $options );
	}
}

if ( ! function_exists( 'sgs_nav_drawer_menu_accordion_html' ) ) {
	/**
	 * One accordion row: the parent's link (or plain label when it has no URL
	 * of its own, FR-36-6's split parent-link from expander), the `<summary>`
	 * expander and the `<details>` body. Shared by a dropdown item (its child
	 * links) and a mega item (its panel in one `li.__mega-body`); both keep
	 * `ul.sgs-nav-drawer-menu__submenu`, which nav-drilldown.js requires.
	 *
	 * I-D9 (2026-09-28): when the item has NO real destination of its own
	 * (`$item['has_url']` false — see sgs_nav_drawer_menu_has_real_destination()),
	 * the label moves INSIDE the `<summary>` alongside the caret, so the whole
	 * row is one toggle — not a dead link sitting beside a small caret-only
	 * touch target. A `<summary>` already exposes the correct implicit
	 * role/expanded state to assistive tech from the `<details>` `open`
	 * attribute; no extra `aria-expanded` bookkeeping is needed.
	 *
	 * @param array  $item      A flattened menu item.
	 * @param string $li_class  The row's classes.
	 * @param string $uid       Instance uid (accordion name and ids).
	 * @param bool   $exclusive Emit the shared `name=` (one open at a time).
	 * @param string $body_html The `<li>` elements inside the submenu list (already safe).
	 * @param array  $options   sgs_nav_drawer_menu_row_options().
	 * @param string $modifier  Extra `<li>` class, e.g. ' sgs-nav-drawer-menu__item--mega'.
	 * @return string HTML.
	 */
	function sgs_nav_drawer_menu_accordion_html( array $item, string $li_class, string $uid, bool $exclusive, string $body_html, array $options, string $modifier = '' ): string {
		$inner = sgs_nav_drawer_menu_label_inner( $item, $options )
			. sgs_nav_shared_badge_html( (string) ( $item['badge'] ?? '' ), 'sgs-nav-drawer-menu' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_nav_shared_badge_html() esc_attr/esc_html's internally.

		$disabled_ids = is_array( $options['disabled_ids'] ?? null ) ? $options['disabled_ids'] : array();
		$is_disabled  = in_array( (string) ( $item['identifier'] ?? '' ), $disabled_ids, true );
		$has_url      = ! empty( $item['has_url'] );
		$row_toggle   = ! $has_url; // I-D9 — no real destination, whole row is the toggle.

		$label_html    = '';
		$summary_label = '';
		if ( $row_toggle ) {
			$summary_label = $inner;
		} elseif ( $is_disabled ) {
			// `aria-disabled` names what this span is: link-styled, no href.
			$label_html = '<span class="sgs-nav-drawer-menu__link sgs-nav-drawer-menu__link--label" aria-disabled="true">' . $inner . '</span>';
		} else {
			$label_html = sprintf(
				'<a class="sgs-nav-drawer-menu__link" href="%1$s" data-sgs-nav-path="%2$s">%3$s</a>',
				esc_url( $item['url'] ),
				esc_attr( wp_parse_url( $item['url'], PHP_URL_PATH ) ?? '' ),
				$inner
			);
		}

		$details_id    = $uid . '-drill-' . substr( md5( (string) $item['identifier'] ), 0, 8 );
		$name_attr     = $exclusive ? ' name="sgs-nav-drawer-menu-accordion-' . esc_attr( $uid ) . '"' : '';
		$label         = (string) ( $item['label'] ?? '' );
		$summary_class = 'sgs-nav-drawer-menu__accordion-summary' . ( $row_toggle ? ' sgs-nav-drawer-menu__accordion-summary--row' : '' );
		$expander      = (string) $options['expander_html'];
		$caret_html    = '<span class="sgs-nav-drawer-menu__caret" aria-hidden="true">' . $expander . '</span>';

		// Built by concatenation, never folded into the outer sprintf()'s
		// FORMAT string below: $summary_label carries operator label text and
		// icon markup that may itself contain a literal '%' — passed as a
		// sprintf ARGUMENT (%7$s) it is inert; concatenated into the format
		// string it would be re-parsed for placeholders.
		if ( $row_toggle ) {
			$summary_html = '<summary class="' . esc_attr( $summary_class ) . '">' . $summary_label . $caret_html . '</summary>';
		} else {
			/* translators: %s is the parent menu item's label. */
			$aria_label   = esc_attr( sprintf( __( 'Show submenu for %s', 'sgs-blocks' ), $label ) );
			$summary_html = '<summary class="' . esc_attr( $summary_class ) . '" aria-label="' . $aria_label . '">' . $caret_html . '</summary>';
		}

		return sprintf(
			'<li class="%1$s sgs-nav-drawer-menu__item--has-submenu%9$s">'
			. '<div class="sgs-nav-drawer-menu__accordion-row">%2$s'
			. '<details class="sgs-nav-drawer-menu__accordion"%3$s id="%4$s" data-sgs-nav-parent-label="%5$s" data-sgs-nav-back-label="%6$s">'
			. '%7$s'
			. '<ul class="sgs-nav-drawer-menu__submenu" data-sgs-drill-panel>%8$s</ul>'
			. '</details></div></li>',
			esc_attr( $li_class ),
			$label_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_url/esc_attr/esc_html parts and trusted icon markup.
			$name_attr, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed literal + esc_attr( $uid ), or ''.
			esc_attr( $details_id ),
			esc_attr( $label ),
			/* translators: %s is the parent menu item's label — the drill-down mode's Back button text. */
			esc_attr( sprintf( __( 'Back to %s', 'sgs-blocks' ), $label ) ),
			$summary_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_attr parts + trusted icon/label markup above.
			$body_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the caller's already-safe list items.
			esc_attr( $modifier )
		);
	}
}
