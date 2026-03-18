<?php
/**
 * Server-side render for the SGS Mega Menu block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// Extract attributes.
$label              = $attributes['label'] ?? '';
$url                = $attributes['url'] ?? '';
$opens_in_new_tab   = $attributes['opensInNewTab'] ?? false;
$menu_template_part = $attributes['menuTemplatePart'] ?? '';
$panel_width        = $attributes['panelWidth'] ?? 'full';
$panel_max_width    = $attributes['panelMaxWidth'] ?? '1200px';
$panel_alignment    = $attributes['panelAlignment'] ?? 'left';
$open_on            = $attributes['openOn'] ?? 'hover';
$icon               = $attributes['icon'] ?? 'chevron-down';
$icon_position      = $attributes['iconPosition'] ?? 'after';
$highlight          = $attributes['highlight'] ?? false;
$badge              = $attributes['badge'] ?? '';
$badge_colour       = $attributes['badgeColour'] ?? 'accent';

// Generate unique menu ID per block instance.
// wp_unique_id() is process-safe and persists across nested do_blocks() calls,
// unlike a static counter which resets in sub-execution contexts (e.g. template
// parts loaded via do_blocks()). Prefix with 'mega-menu-' to keep IDs readable.
$menu_id = wp_unique_id( 'mega-menu-' );

// Build wrapper classes.
$classes = array(
	'sgs-mega-menu',
	'sgs-mega-menu--panel-' . esc_attr( $panel_width ),
	'sgs-mega-menu--align-' . esc_attr( $panel_alignment ),
	'sgs-mega-menu--open-' . esc_attr( $open_on ),
);
if ( $highlight ) {
	$classes[] = 'sgs-mega-menu--highlight';
}

// Build context for Interactivity API.
$context = wp_json_encode(
	array(
		'isOpen'  => false,
		'menuId'  => $menu_id,
		'openOn'  => $open_on,
	)
);

// Build wrapper attributes.
// No role on the <li> — it keeps its native listitem semantics, satisfying the
// ARIA list structure requirement. The trigger inside uses role="button" (not
// role="menuitem") because this is a hybrid navigation where some items are
// plain links and some are panel triggers. Using role="menuitem" on only some
// items in the list would require the parent <ul> to have role="menubar", which
// in turn would break all the non-menuitem siblings. role="button" + aria-expanded
// + aria-controls is the correct accessible pattern for a disclosure widget.
$wrapper_attr = array(
	'class'                  => implode( ' ', $classes ),
	'data-wp-interactive'    => 'sgs/mega-menu',
	'data-wp-context'        => $context,
	'data-wp-class--is-open' => 'context.isOpen',
	'data-wp-watch'          => 'callbacks.watchOpenState',
);

if ( 'hover' === $open_on ) {
	$wrapper_attr['data-wp-on--mouseenter'] = 'actions.openOnHover';
	$wrapper_attr['data-wp-on--mouseleave'] = 'actions.closeOnHover';
}

// Add custom styles for panel width if needed.
$wrapper_styles = array();
if ( 'custom' === $panel_width && $panel_max_width ) {
	$wrapper_styles[] = '--sgs-mega-menu-max-width:' . esc_attr( $panel_max_width );
}

// Convert wrapper attributes to HTML string.
$wrapper_attr_string = '';
foreach ( $wrapper_attr as $key => $value ) {
	$wrapper_attr_string .= sprintf( ' %s="%s"', esc_attr( $key ), esc_attr( $value ) );
}
if ( $wrapper_styles ) {
	$wrapper_attr_string .= ' style="' . implode( ';', $wrapper_styles ) . '"';
}

// Build link/button element.
$tag   = $url ? 'a' : 'button';
$href  = $url ? sprintf( ' href="%s"', esc_url( $url ) ) : '';
$type  = $url ? '' : ' type="button"';
$target = ( $url && $opens_in_new_tab ) ? ' target="_blank" rel="noopener noreferrer"' : '';

// Load Lucide icon.
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
$icon_svg = sgs_get_lucide_icon( $icon );

// Build icon HTML.
$icon_html = sprintf(
	'<span class="sgs-mega-menu__icon sgs-mega-menu__icon--%s" aria-hidden="true">%s</span>',
	esc_attr( $icon_position ),
	$icon_svg
);

// Build badge HTML.
$badge_html = '';
if ( $badge ) {
	$badge_html = sprintf(
		'<span class="sgs-mega-menu__badge" data-sgs-badge-colour="%s">%s</span>',
		esc_attr( $badge_colour ),
		esc_html( $badge )
	);
}

// Build trigger element.
// role="button" is used instead of role="menuitem" because this is a disclosure
// widget in a mixed navigation — not every item in the list is a menu item, so
// setting role="menubar" on the <ul> would break the non-trigger list items.
// aria-expanded signals open/closed state; aria-controls points to the panel.
// aria-haspopup="true" (equivalent to "listbox") signals that activation reveals
// more content. Keyboard users see this as a standard expandable button.
$trigger_html = sprintf(
	'<%1$s%2$s%3$s%4$s class="sgs-mega-menu__trigger" role="button" aria-haspopup="true" aria-expanded="false" aria-controls="%9$s-panel" data-wp-bind--aria-expanded="context.isOpen" data-wp-on--click="actions.toggle" data-wp-on--keydown="actions.handleTriggerKeydown">%5$s<span class="sgs-mega-menu__label">%6$s</span>%7$s%8$s</%1$s>',
	$tag,
	$href,
	$type,
	$target,
	'before' === $icon_position ? $icon_html : '',
	wp_kses_post( $label ),
	'after' === $icon_position ? $icon_html : '',
	$badge_html,
	esc_attr( $menu_id )
);

// Render template part content.
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

// Build panel HTML.
$panel_html = sprintf(
	'<div id="%s-panel" class="sgs-mega-menu__panel" role="menu" data-wp-bind--hidden="!context.isOpen" data-wp-on--keydown="actions.handlePanelKeydown">%s</div>',
	esc_attr( $menu_id ),
	$panel_content
);

// Output.
printf(
	'<li%s>%s%s</li>',
	$wrapper_attr_string,
	$trigger_html,
	$panel_html
);
