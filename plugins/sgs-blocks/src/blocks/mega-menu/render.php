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

// Whitelist allowed values to prevent arbitrary class injection.
$allowed_variants   = array( 'full-width', 'contained', 'columns', 'flyout', 'card-grid', 'tabbed', 'featured' );
$allowed_animations = array( 'fade', 'slide-down', 'scale' );
$allowed_alignments = array( 'left', 'centre', 'right' );
$allowed_open_on    = array( 'hover', 'click' );

$layout_variant  = in_array( $layout_variant,   $allowed_variants,   true ) ? $layout_variant  : 'full-width';
$open_animation  = in_array( $open_animation,   $allowed_animations, true ) ? $open_animation  : 'fade';
$panel_alignment = in_array( $panel_alignment,  $allowed_alignments, true ) ? $panel_alignment : 'left';
$open_on         = in_array( $open_on,          $allowed_open_on,    true ) ? $open_on         : 'hover';

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

if ( 'tabbed' === $layout_variant && $template_part && ! empty( $template_part->content ) ) {
	// ── Tabbed variant: parse top-level blocks into individual tab panels.
	//
	// Each non-empty top-level block becomes one tab. The first heading found
	// within the block (recursively) is used as the tab label; if none is
	// found a generic "Tab N" label is used.
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
			$tab_label = sprintf( _x( 'Tab %d', 'mega menu tab label fallback', 'sgs-blocks' ), count( $tab_items ) + 1 );
		}

		$tab_items[] = array(
			'label'   => $tab_label,
			'content' => render_block( $raw_block ),
		);
	}

	if ( $tab_items ) {
		// Build the accessible tab list.
		$tab_list = '<div class="sgs-mega-menu__tab-list" role="tablist" aria-label="'
			. esc_attr__( 'Panel tabs', 'sgs-blocks' )
			. '" data-wp-on--keydown="actions.handleTabListKeydown">';

		foreach ( $tab_items as $i => $tab ) {
			$tab_list .= sprintf(
				'<button class="sgs-mega-menu__tab%s" role="tab" aria-selected="%s" tabindex="%s" data-wp-on--click="actions.switchTab">%s</button>',
				0 === $i ? ' is-active' : '',
				0 === $i ? 'true' : 'false',
				0 === $i ? '0' : '-1',
				esc_html( $tab['label'] )
			);
		}

		$tab_list .= '</div>';

		// Build the tab content panels.
		$tab_panels = '<div class="sgs-mega-menu__tab-content">';

		foreach ( $tab_items as $i => $tab ) {
			$tab_panels .= sprintf(
				'<div class="sgs-mega-menu__tab-panel"%s role="tabpanel">%s</div>',
				0 === $i ? '' : ' hidden',
				$tab['content']
			);
		}

		$tab_panels .= '</div>';

		$panel_content = $tab_list . $tab_panels;
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
