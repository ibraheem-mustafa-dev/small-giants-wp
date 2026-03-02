<?php
/**
 * Server-side render for the SGS Mega Menu block.
 *
 * Outputs a fully-accessible, keyboard-navigable mega-menu item
 * with configurable layout variants, open animations and close delay.
 *
 * @since 1.0.0
 * @since 1.1.0 Added layoutVariant, openAnimation, closeDelay, aria-controls.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — dynamic).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

// ── Helper: extract the first heading text from a parsed block ────────────

if ( ! function_exists( 'sgs_mm_extract_heading' ) ) {
	/**
	 * Recursively extract the first heading's plain text from a parsed block.
	 *
	 * Used by the tabbed layout to auto-label tabs from the template part content.
	 *
	 * @since 1.2.0
	 *
	 * @param array $block Parsed block array from parse_blocks().
	 * @return string Heading plain text, or empty string if none found.
	 */
	function sgs_mm_extract_heading( array $block ): string {
		if ( 'core/heading' === $block['blockName'] ) {
			return wp_strip_all_tags( implode( '', $block['innerContent'] ) );
		}
		foreach ( $block['innerBlocks'] ?? array() as $inner_block ) {
			$text = sgs_mm_extract_heading( $inner_block );
			if ( $text ) {
				return $text;
			}
		}
		return '';
	}
}

// ── Extract & sanitise attributes ────────────────────────────────────────

$label            = $attributes['label']           ?? '';
$url              = $attributes['url']             ?? '';
$opens_in_new_tab = $attributes['opensInNewTab']   ?? false;
$menu_template_part = $attributes['menuTemplatePart'] ?? '';

// Layout & behaviour.
$layout_variant   = $attributes['layoutVariant']   ?? 'full-width';
$panel_width      = $attributes['panelWidth']       ?? 'full';
$panel_max_width  = $attributes['panelMaxWidth']    ?? '1200px';
$panel_alignment  = $attributes['panelAlignment']   ?? 'left';
$open_on          = $attributes['openOn']           ?? 'hover';

// Animation.
$open_animation   = $attributes['openAnimation']   ?? 'fade';
$close_delay      = max( 0, (int) ( $attributes['closeDelay'] ?? 300 ) );

// Icon & badge.
$icon             = $attributes['icon']             ?? 'chevron-down';
$icon_position    = $attributes['iconPosition']     ?? 'after';
$highlight        = $attributes['highlight']        ?? false;
$badge            = $attributes['badge']            ?? '';
$badge_colour     = $attributes['badgeColour']      ?? 'accent';

// Featured layout attributes (variant 7).
$featured_image   = $attributes['featuredImage']  ?? array();
$featured_title   = $attributes['featuredTitle']  ?? '';
$featured_cta     = $attributes['featuredCta']    ?? '';
$featured_cta_url = $attributes['featuredCtaUrl'] ?? '';

// Promo-slot layout attributes (variant 9).
$promo_title      = $attributes['promoTitle']      ?? '';
$promo_subtitle   = $attributes['promoSubtitle']   ?? '';
$promo_cta        = $attributes['promoCta']        ?? 'Learn more';
$promo_cta_url    = $attributes['promoCtaUrl']     ?? '';
$promo_image      = $attributes['promoImage']      ?? array();
$promo_badge      = $attributes['promoBadge']      ?? '';
$promo_background = $attributes['promoBackground'] ?? 'primary';
$promo_position   = $attributes['promoPosition']   ?? 'side';

// Search-in-menu layout attributes (variant 10).
$search_placeholder = $attributes['searchPlaceholder'] ?? __( 'Search\u2026', 'sgs-blocks' );
$search_label       = $attributes['searchLabel']       ?? __( 'Search menu', 'sgs-blocks' );

// Whitelist allowed values to prevent arbitrary class injection.
$allowed_variants   = array(
	'full-width',
	'contained',
	'columns',
	'flyout',
	'card-grid',
	'tabbed',
	'featured',
	'icon-list',
	'side-tabs',
	'promo-slot',
	'search-in-menu',
);
$allowed_animations = array( 'fade', 'slide-down', 'scale' );
$allowed_alignments = array( 'left', 'centre', 'right' );
$allowed_open_on    = array( 'hover', 'click' );

$allowed_promo_positions = array( 'side', 'bottom' );

$layout_variant  = in_array( $layout_variant,   $allowed_variants,        true ) ? $layout_variant  : 'full-width';
$open_animation  = in_array( $open_animation,   $allowed_animations,      true ) ? $open_animation  : 'fade';
$panel_alignment = in_array( $panel_alignment,  $allowed_alignments,      true ) ? $panel_alignment : 'left';
$open_on         = in_array( $open_on,          $allowed_open_on,         true ) ? $open_on         : 'hover';
$promo_position  = in_array( $promo_position,   $allowed_promo_positions, true ) ? $promo_position  : 'side';

// ── Unique IDs ────────────────────────────────────────────────────────────

static $menu_counter = 0;
++$menu_counter;
$menu_id  = 'sgs-mega-menu-' . $menu_counter;
$panel_id = $menu_id . '-panel';

// ── Build CSS classes ─────────────────────────────────────────────────────

$classes = array(
	'sgs-mega-menu',
	'sgs-mega-menu--layout-' . $layout_variant,
	'sgs-mega-menu--align-' . $panel_alignment,
	'sgs-mega-menu--open-' . $open_on,
	'sgs-mega-menu--anim-' . $open_animation,
);

if ( $highlight ) {
	$classes[] = 'sgs-mega-menu--highlight';
}

// Promo-slot position modifier.
if ( 'promo-slot' === $layout_variant ) {
	$classes[] = 'sgs-mega-menu--promo-' . esc_attr( $promo_position );
}

// Legacy panel-width class kept for backward compatibility.
$classes[] = 'sgs-mega-menu--panel-' . esc_attr( $panel_width );

// ── Interactivity API context ─────────────────────────────────────────────

$context = wp_json_encode(
	array(
		'isOpen'     => false,
		'menuId'     => $menu_id,
		'openOn'     => $open_on,
		'closeDelay' => $close_delay,
		'isFlyout'   => 'flyout' === $layout_variant,
	)
);

// ── Wrapper attributes ────────────────────────────────────────────────────

$wrapper_attr = array(
	'class'                   => implode( ' ', $classes ),
	'data-wp-interactive'     => 'sgs/mega-menu',
	'data-wp-context'         => $context,
	'data-wp-class--is-open'  => 'context.isOpen',
	'role'                    => 'none',
);

if ( 'hover' === $open_on ) {
	$wrapper_attr['data-wp-on--mouseenter'] = 'actions.openOnHover';
	$wrapper_attr['data-wp-on--mouseleave'] = 'actions.closeOnHover';
}

// Inline custom property for custom-width panels (legacy support).
$wrapper_styles = array();
if ( 'custom' === $panel_width && $panel_max_width ) {
	$wrapper_styles[] = '--sgs-mega-menu-max-width:' . esc_attr( $panel_max_width );
}

// Convert wrapper attributes to an HTML attribute string.
$wrapper_attr_string = '';
foreach ( $wrapper_attr as $key => $value ) {
	$wrapper_attr_string .= ' ' . esc_attr( $key ) . '="' . esc_attr( $value ) . '"';
}
if ( $wrapper_styles ) {
	$wrapper_attr_string .= ' style="' . esc_attr( implode( ';', $wrapper_styles ) ) . '"';
}

// ── Trigger element ───────────────────────────────────────────────────────

$tag    = $url ? 'a' : 'button';
$href   = $url ? ' href="' . esc_url( $url ) . '"' : '';
$type   = $url ? '' : ' type="button"';
$target = ( $url && $opens_in_new_tab ) ? ' target="_blank" rel="noopener noreferrer"' : '';

$icon_svg  = sgs_get_lucide_icon( $icon );
$icon_html = sprintf(
	'<span class="sgs-mega-menu__icon sgs-mega-menu__icon--%s" aria-hidden="true">%s</span>',
	esc_attr( $icon_position ),
	$icon_svg  // Already sanitised by sgs_get_lucide_icon().
);

$badge_html = '';
if ( $badge ) {
	$badge_style = 'background-color:' . sgs_colour_value( $badge_colour );
	$badge_html  = sprintf(
		'<span class="sgs-mega-menu__badge" style="%s">%s</span>',
		esc_attr( $badge_style ),
		esc_html( $badge )
	);
}

// Build the trigger element with full ARIA attributes.
$trigger_html = sprintf(
	/* translators: %1$s tag, %2$s href, %3$s type, %4$s target, %5$s icon-before, %6$s label, %7$s icon-after, %8$s badge, %9$s panel-id */
	'<%1$s%2$s%3$s%4$s'
	. ' class="sgs-mega-menu__trigger"'
	. ' role="menuitem"'
	. ' aria-haspopup="true"'
	. ' aria-controls="%9$s"'
	. ' data-wp-bind--aria-expanded="context.isOpen"'
	. ' data-wp-on--click="actions.toggle"'
	. ' data-wp-on--keydown="actions.handleTriggerKeydown"'
	. '>%5$s<span class="sgs-mega-menu__label">%6$s</span>%7$s%8$s</%1$s>',
	$tag,
	$href,
	$type,
	$target,
	'before' === $icon_position ? $icon_html : '',
	wp_kses_post( $label ),
	'after' === $icon_position ? $icon_html : '',
	$badge_html,
	esc_attr( $panel_id )
);

// ── Panel content (rendered from template part) ────────────────────────────

$panel_content = '';
$template_part = null;

if ( $menu_template_part ) {
	$template_part = get_block_template(
		get_stylesheet() . '//' . $menu_template_part,
		'wp_template_part'
	);
}

if (
	in_array( $layout_variant, array( 'tabbed', 'side-tabs' ), true )
	&& $template_part
	&& ! empty( $template_part->content )
) {
	// ── Tabbed / Side-tabs variants: parse top-level blocks into tab items.
	//
	// Each non-empty top-level block becomes one tab. The first heading found
	// within the block (recursively) is used as the tab label; if none is
	// found a generic "Tab N" label is used.
	//
	// Tabbed:    horizontal tab bar across the top, content panels below.
	// Side-tabs: vertical tab list on the left, content fills the right.
	//
	// Template-part authors should use separate wp:group blocks per tab,
	// each starting with a wp:heading that names the tab.

	$raw_blocks = parse_blocks( $template_part->content );
	$tab_items  = array();

	foreach ( $raw_blocks as $raw_block ) {
		// Skip freeform / whitespace-only pseudo-blocks.
		if ( empty( $raw_block['blockName'] ) ) {
			continue;
		}

		$tab_label = sgs_mm_extract_heading( $raw_block );
		if ( ! $tab_label ) {
			/* translators: %d: tab position number */
			$tab_label = sprintf(
				_x( 'Tab %d', 'mega menu tab label fallback', 'sgs-blocks' ),
				count( $tab_items ) + 1
			);
		}

		$tab_items[] = array(
			'label'   => $tab_label,
			'content' => render_block( $raw_block ),
		);
	}

	if ( $tab_items ) {
		// Build shared content panels (same structure for both variants).
		$tab_panels_html = '<div class="sgs-mega-menu__tab-content">';

		foreach ( $tab_items as $i => $tab ) {
			$tab_panels_html .= sprintf(
				'<div class="sgs-mega-menu__tab-panel"%s role="tabpanel">%s</div>',
				0 === $i ? '' : ' hidden',
				$tab['content']
			);
		}

		$tab_panels_html .= '</div>';

		if ( 'tabbed' === $layout_variant ) {
			// Horizontal tab list.
			$tab_list_html = '<div class="sgs-mega-menu__tab-list" role="tablist" aria-label="'
				. esc_attr__( 'Panel tabs', 'sgs-blocks' )
				. '" data-wp-on--keydown="actions.handleTabListKeydown">';

			foreach ( $tab_items as $i => $tab ) {
				$tab_list_html .= sprintf(
					'<button class="sgs-mega-menu__tab%s" role="tab" aria-selected="%s" tabindex="%s" data-wp-on--click="actions.switchTab">%s</button>',
					0 === $i ? ' is-active' : '',
					0 === $i ? 'true' : 'false',
					0 === $i ? '0' : '-1',
					esc_html( $tab['label'] )
				);
			}

			$tab_list_html .= '</div>';
			$panel_content  = $tab_list_html . $tab_panels_html;
		} else {
			// Vertical (side) tab list.
			$side_list_html = '<div class="sgs-mega-menu__side-tab-list" role="tablist" aria-label="'
				. esc_attr__( 'Panel tabs', 'sgs-blocks' )
				. '" data-wp-on--keydown="actions.handleSideTabListKeydown">';

			foreach ( $tab_items as $i => $tab ) {
				$side_list_html .= sprintf(
					'<button class="sgs-mega-menu__side-tab%s" role="tab" aria-selected="%s" tabindex="%s" data-wp-on--click="actions.switchTab">%s</button>',
					0 === $i ? ' is-active' : '',
					0 === $i ? 'true' : 'false',
					0 === $i ? '0' : '-1',
					esc_html( $tab['label'] )
				);
			}

			$side_list_html .= '</div>';
			$panel_content   = '<div class="sgs-mega-menu__side-tabs">'
				. $side_list_html
				. $tab_panels_html
				. '</div>';
		}
	}
} elseif ( $template_part && ! empty( $template_part->content ) ) {
	// All other variants: render template part content normally.
	$panel_content = do_blocks( $template_part->content );
}

// ── Featured variant: wrap content in a two-column hero layout ─────────────

if ( 'featured' === $layout_variant ) {
	$img_url = esc_url( $featured_image['url'] ?? '' );
	$img_alt = esc_attr( $featured_image['alt'] ?? '' );

	if ( $img_url ) {
		$image_html = sprintf(
			'<img src="%s" alt="%s" class="sgs-mega-menu__featured-image" loading="lazy" decoding="async" />',
			$img_url,
			$img_alt
		);
	} else {
		$image_html = '<div class="sgs-mega-menu__featured-image sgs-mega-menu__featured-image--placeholder" aria-hidden="true"></div>';
	}

	$overlay_parts = array();

	if ( $featured_title ) {
		$overlay_parts[] = '<p class="sgs-mega-menu__featured-overlay-title">' . esc_html( $featured_title ) . '</p>';
	}

	if ( $featured_cta && $featured_cta_url ) {
		$overlay_parts[] = sprintf(
			'<a href="%s" class="wp-block-button__link wp-element-button sgs-mega-menu__featured-cta">%s</a>',
			esc_url( $featured_cta_url ),
			esc_html( $featured_cta )
		);
	}

	$overlay_html = $overlay_parts
		? '<div class="sgs-mega-menu__featured-overlay">' . implode( '', $overlay_parts ) . '</div>'
		: '';

	$panel_content = sprintf(
		'<div class="sgs-mega-menu__featured-side">%s%s</div><div class="sgs-mega-menu__featured-content">%s</div>',
		$image_html,
		$overlay_html,
		$panel_content
	);
}

// ── Promo-slot variant: configurable promotional section ─────────────────────
//
// Wraps the template-part content in a "main" div and appends a fully
// attribute-driven promo slot (image, badge, title, subtitle, CTA).
// The promo slot position (side | bottom) is driven by a wrapper class.

if ( 'promo-slot' === $layout_variant ) {
	$promo_img_url = esc_url( $promo_image['url'] ?? '' );
	$promo_img_alt = esc_attr( $promo_image['alt'] ?? '' );
	$promo_bg      = sgs_colour_value( $promo_background );

	// Decorative background image (low opacity).
	$promo_img_html = $promo_img_url
		? sprintf(
			'<img src="%s" alt="%s" class="sgs-mega-menu__promo-image" aria-hidden="true" />',
			$promo_img_url,
			$promo_img_alt
		)
		: '';

	$promo_badge_html = $promo_badge
		? '<span class="sgs-mega-menu__promo-badge">' . esc_html( $promo_badge ) . '</span>'
		: '';

	$promo_title_html = $promo_title
		? '<p class="sgs-mega-menu__promo-title">' . esc_html( $promo_title ) . '</p>'
		: '';

	$promo_subtitle_html = $promo_subtitle
		? '<p class="sgs-mega-menu__promo-subtitle">' . esc_html( $promo_subtitle ) . '</p>'
		: '';

	$promo_cta_html = ( $promo_cta && $promo_cta_url )
		? sprintf(
			'<a href="%s" class="sgs-mega-menu__promo-cta">%s</a>',
			esc_url( $promo_cta_url ),
			esc_html( $promo_cta )
		)
		: '';

	$promo_slot = sprintf(
		'<div class="sgs-mega-menu__promo-slot" style="background-color:%s">%s%s%s%s%s</div>',
		esc_attr( $promo_bg ),
		$promo_img_html,
		$promo_badge_html,
		$promo_title_html,
		$promo_subtitle_html,
		$promo_cta_html
	);

	$panel_content = '<div class="sgs-mega-menu__promo-main">' . $panel_content . '</div>'
		. $promo_slot;
}

// ── Search-in-menu variant: live-filtering search input ───────────────────
//
// Prepends a labelled search input to the panel. The Interactivity API
// action `actions.filterSearch` handles real-time client-side filtering.
// Items are searched by text content; non-matching items get the
// `sgs-mega-menu__search-item--hidden` class applied.

if ( 'search-in-menu' === $layout_variant ) {
	$search_uid  = esc_attr( $menu_id . '-search' );
	$search_html = sprintf(
		'<div class="sgs-mega-menu__search-wrap">'
		. '<label for="%1$s" class="screen-reader-text">%2$s</label>'
		. '<input id="%1$s" type="search" class="sgs-mega-menu__search-input"'
		. ' placeholder="%3$s" autocomplete="off" spellcheck="false"'
		. ' data-wp-on--input="actions.filterSearch" />'
		. '</div>',
		$search_uid,
		esc_html( $search_label ),
		esc_attr( $search_placeholder )
	);

	$empty_html    = '<p class="sgs-mega-menu__search-empty" aria-live="polite">'
		. esc_html__( 'No results found.', 'sgs-blocks' )
		. '</p>';

	$panel_content = $search_html
		. '<div class="sgs-mega-menu__search-content">' . $panel_content . '</div>'
		. $empty_html;
}

// ── Panel element ─────────────────────────────────────────────────────────

// Flyout gets an additional overlay/backdrop sibling (handled by JS/CSS).
$panel_html = sprintf(
	'<div id="%s" class="sgs-mega-menu__panel" role="menu" data-wp-bind--hidden="!context.isOpen" data-wp-on--keydown="actions.handlePanelKeydown">%s</div>',
	esc_attr( $panel_id ),
	$panel_content
);

// Flyout variant includes a backdrop overlay for dismissal.
$flyout_backdrop = '';
if ( 'flyout' === $layout_variant ) {
	$flyout_backdrop = '<div class="sgs-mega-menu__flyout-backdrop" data-wp-on--click="actions.toggle" aria-hidden="true"></div>';
}

// ── Final output ──────────────────────────────────────────────────────────

printf(
	'<li%s>%s%s%s</li>',
	$wrapper_attr_string,
	$trigger_html,
	$flyout_backdrop,
	$panel_html
);
