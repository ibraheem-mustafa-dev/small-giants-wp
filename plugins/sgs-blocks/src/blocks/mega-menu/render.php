<?php
/**
 * Server-side render for the SGS Mega Menu block.
 *
 * NO-INLINE (LOCKED per-block no-inline migration contract §A, 2026-07-10;
 * AMENDED 2026-07-18 / D345 — inline `--var:value` custom-property VALUES are
 * now ALSO forbidden, not just property declarations): the rendered `<li>`
 * root and every descendant carry ZERO inline `style="…"` of any kind. The
 * `--sgs-mm-*` colour vars (panel background / link colour / link hover /
 * link hover background) and `--sgs-mega-menu-max-width` are emitted into
 * this instance's own scoped `<style>` tag, keyed to the block ROOT selector
 * (`.{uid}.sgs-mega-menu`), instead of an inline `style` attribute on the
 * `<li>`. The one other genuine property-declaration block (the full-width
 * panel's `position:fixed`
 * safety-net, previously an inline `style=` attribute) is now emitted into
 * this instance's OWN scoped `<style>` tag instead — this is *more* robust
 * against the original LiteSpeed CSS Combine problem than a raw inline
 * attribute, because a per-instance `<style>` tag is literal page HTML, not
 * part of a combinable/cacheable external stylesheet, so LiteSpeed's
 * stylesheet-combine pass never touches it (see memory:
 * feedback_litespeed_gotchas.md).
 *
 * The `color` (background/text) WP support declares
 * `__experimentalSkipSerialization` in block.json; this render reads
 * `$attributes['style']['color']` itself and emits it scoped to the block
 * root via `wp_style_engine_get_styles` (this block never calls
 * `get_block_wrapper_attributes()`, so WP was never auto-inlining this
 * support in the first place — the control was previously a no-op; this is
 * now wired up for real).
 *
 * F3 DRAIN (contract §E2): the panel's `max-width` literal
 * `min(900px, calc(100vw - 2rem))` in style.css is now the CSS var
 * *fallback default* for `--sgs-mega-menu-max-width`, which the
 * `panelMaxWidth` attr now drives for BOTH `content` and `custom` width
 * modes (previously the attr only applied to `custom`, so the same control
 * did nothing in `content` mode).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 0. Security sanitisers (contract §D) — a permissive-but-safe CSS-value
// sanitiser for the free-text `panelMaxWidth` attr (must allow `calc()`/
// `min()` expressions with spaces, parens, commas, %, so the plain
// css-length sanitiser used elsewhere — digits/letters/%/. only — is too
// strict here). Blocks the CSS-breakout characters (`;`, `{`, `}`, `<`,
// `>`, quotes, `/`, `:`) that `esc_attr()` alone does not.
// ---------------------------------------------------------------------------

$sgs_css_value = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%()\-,\s]/', '', (string) $value );
};

// Extract attributes.
$label               = $attributes['label'] ?? '';
$url                 = $attributes['url'] ?? '';
$opens_in_new_tab    = $attributes['opensInNewTab'] ?? false;
$menu_template_part  = $attributes['menuTemplatePart'] ?? '';
$panel_width         = $attributes['panelWidth'] ?? 'full';
$panel_max_width     = $attributes['panelMaxWidth'] ?? '1200px';
$panel_alignment     = $attributes['panelAlignment'] ?? 'left';
$open_on             = $attributes['openOn'] ?? 'hover';
$icon                = $attributes['icon'] ?? 'chevron-down';
$icon_position       = $attributes['iconPosition'] ?? 'after';
$highlight           = $attributes['highlight'] ?? false;
$badge               = $attributes['badge'] ?? '';
$badge_colour        = $attributes['badgeColour'] ?? 'accent';
$panel_bg_colour     = $attributes['panelBgColour'] ?? 'surface';
$link_colour         = $attributes['linkColour'] ?? 'text';
$link_bg_colour      = $attributes['linkBgColour'] ?? '';
$link_hover_colour   = $attributes['linkHoverColour'] ?? 'primary';
$link_hover_bg       = $attributes['linkHoverBgColour'] ?? 'surface-alt';

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
// D303: add the per-instance id ALSO as a class so scoped CSS can target this
// instance at CLASS level (`.{menu_id}.sgs-mega-menu` = 0,2,0), never an ID — so the
// sgsCustomCss residual (0,2,0, appended last) can override it by source order. The
// id="…" attribute is kept (aria-controls / JS targeting).
$classes[] = $menu_id;

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

// Build CSS custom-property VALUES for this instance.
// Colour vars drive trigger text, hover states, and panel background so
// style.css never needs hardcoded palette values. Per D345 (2026-07-18)
// these are NO LONGER emitted as an inline `style` attribute — they are
// pushed into this instance's scoped `<style>` tag below, keyed to the
// block root selector ($root_sel), so descendants still inherit them via
// normal CSS custom-property cascade.
$wrapper_styles = array(
	'--sgs-mm-panel-bg:'        . sgs_colour_value( $panel_bg_colour ),
	'--sgs-mm-link-colour:'     . sgs_colour_value( $link_colour ),
	'--sgs-mm-link-hover:'      . sgs_colour_value( $link_hover_colour ),
	'--sgs-mm-link-hover-bg:'   . sgs_colour_value( $link_hover_bg ),
);
// Spec 35 FR-35-5 STATE_WITHOUT_BASE fix — resting-state background for the
// trigger link/button. NO default in block.json (Bean-locked Option A: an
// unset control must render byte-identical to today), so this var is emitted
// ONLY when a client has actually chosen a value; style.css's own fallback
// `var(--sgs-mm-link-bg, transparent)` supplies today's hardcoded transparent
// when it is absent — nothing changes for an unconfigured instance.
$link_bg_value = sgs_colour_value( $link_bg_colour );
if ( $link_bg_value ) {
	$wrapper_styles[] = '--sgs-mm-link-bg:' . $link_bg_value;
}
// F3 DRAIN — panelMaxWidth now drives BOTH `content` and `custom` width
// modes (previously `custom` only, so the control did nothing in `content`
// mode). style.css's base `.sgs-mega-menu__panel` rule consumes this var
// with `min(900px, calc(100vw - 2rem))` as its fallback default.
if ( in_array( $panel_width, array( 'custom', 'content' ), true ) && $panel_max_width ) {
	$wrapper_styles[] = '--sgs-mega-menu-max-width:' . $sgs_css_value( $panel_max_width );
}

// Unique scoped-CSS id for this instance — reuses $menu_id (already unique
// via wp_unique_id(), alphanumeric + hyphen, safe as a raw CSS id selector).
// This block declares `"anchor": false`, so an ID selector is safe (no
// collision risk with an operator-set anchor).
$uid      = $menu_id;
$root_sel = '.' . $uid . '.sgs-mega-menu';

// WP-native `color` support (background/text) — skip-serialised in
// block.json so WordPress never auto-inlines it (this render never calls
// get_block_wrapper_attributes() anyway, so it was previously a dead
// control). Emitted scoped to the block root via the stable core style
// engine, matching sgs/label + sgs/quote.
$style_color_text = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg   = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

$scoped_css = array();

// D345 — the --sgs-mm-* / --sgs-mega-menu-max-width VALUES built above are
// no longer inlined; push them as a scoped rule on the block root selector
// so descendants (.sgs-mega-menu__trigger, .sgs-mega-menu__panel, etc.,
// which already consume them via var(--sgs-mm-*, fallback) in style.css)
// still inherit the resolved values through normal CSS custom-property
// cascade.
if ( $wrapper_styles ) {
	$scoped_css[] = $root_sel . '{' . implode( ';', $wrapper_styles ) . '}';
}

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$color_args = array();
	if ( '' !== $style_color_text ) {
		$color_args['text'] = $style_color_text;
	}
	if ( '' !== $style_color_bg ) {
		$color_args['background'] = $style_color_bg;
	}
	if ( ! empty( $color_args ) ) {
		$color_scoped_styles = wp_style_engine_get_styles(
			array( 'color' => $color_args ),
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $color_scoped_styles['css'] ) ) {
			$scoped_css[] = $color_scoped_styles['css'];
		}
	}
}

if ( '' !== $preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$classes[] = 'has-background';
	$classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

// Re-derive the class list string now the has-*-color classes may have
// been appended above.
$wrapper_attr['class'] = implode( ' ', $classes );
$wrapper_attr['id']    = $uid;

// Convert wrapper attributes to HTML string. NO 'style' key of any kind is
// added — per D345 the --sgs-mm-* custom-property values are emitted into
// the scoped <style> tag above ($scoped_css), not inlined on the element.
$wrapper_attr_string = '';
foreach ( $wrapper_attr as $key => $value ) {
	$wrapper_attr_string .= sprintf( ' %s="%s"', esc_attr( $key ), esc_attr( $value ) );
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
// Full-width panels need guaranteed position:fixed because LiteSpeed CSS
// Combine can merge the full-width rule with the align-centre rule in the
// external style.css bundle, dropping position:fixed; Cloudflare then caches
// the broken combined CSS for up to 30 days. Previously this was solved with
// a raw inline `style=` attribute; it is now emitted into THIS instance's
// own scoped `<style>` tag below instead (a per-render `<style>` tag is
// literal page HTML, never part of the combinable external stylesheet, so
// it is immune to the LiteSpeed Combine merge — a strictly more robust fix
// than the inline attribute it replaces).
$panel_sel = '.' . $uid . '.sgs-mega-menu .sgs-mega-menu__panel';
if ( 'full' === $panel_width ) {
	// top uses CSS var set by JS repositionPanel(); default 0 = flush below header.
	$scoped_css[] = $panel_sel . '{position:fixed;top:var(--sgs-mm-fixed-top,0);left:0;width:100vw;max-width:100vw;--sgs-mm-tx:0px;--sgs-mm-open-tx:0px;}';
}
$panel_html = sprintf(
	'<div id="%s-panel" class="sgs-mega-menu__panel" role="menu" data-wp-bind--hidden="!context.isOpen" data-wp-on--keydown="actions.handlePanelKeydown">%s</div>',
	esc_attr( $menu_id ),
	$panel_content
);

// Output. The scoped <style> tag is nested INSIDE the <li> (as its first
// child) rather than as a preceding sibling — the parent <ul> (core/
// navigation's container) only permits <li> + script-supporting elements as
// DIRECT children per the HTML list content model (the exact ARIA-list-
// structure concern the original wrapper-attr comment above already flags),
// whereas a <li>'s own content model is unrestricted flow content, so a
// <style> tag nested inside it is fully conforming. wp_strip_all_tags (NOT
// esc_html) blocks a </style> breakout while leaving CSS combinators intact
// (contract §D); every value reaching $scoped_css is pre-sanitised
// (wp_style_engine_get_styles / hand-built literals with no user input
// beyond the uid, which is process-generated).
$style_html = '';
if ( $scoped_css ) {
	$style_html = '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';
}
printf(
	'<li%s>%s%s%s</li>',
	$wrapper_attr_string,
	$style_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised via wp_strip_all_tags above.
	$trigger_html,
	$panel_html
);
