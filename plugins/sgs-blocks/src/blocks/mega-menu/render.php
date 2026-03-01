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

// Whitelist allowed values to prevent arbitrary class injection.
$allowed_variants   = array( 'full-width', 'contained', 'columns', 'flyout' );
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
if ( $menu_template_part ) {
	$template_part = get_block_template(
		get_stylesheet() . '//' . $menu_template_part,
		'wp_template_part'
	);

	if ( $template_part && ! empty( $template_part->content ) ) {
		$panel_content = do_blocks( $template_part->content );
	}
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
