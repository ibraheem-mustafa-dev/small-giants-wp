<?php
/**
 * Accordion Item — server-side render.
 *
 * WS-4 composite-mirror: CONTENT kind — width/spacing layers only via
 * SGS_Container_Wrapper::render(). The outer <details> wrapper carries
 * all toggle attrs (open / aria-expanded is on <summary> inside $inner_html).
 *
 * Works without JS; enhanced with smooth animation via the parent
 * sgs/accordion viewScriptModule.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 * The header text/background colour + the open/close icon colour — both
 * formerly inline `style="…"` attributes sourced from parent block context —
 * are now emitted as scoped rules in this item's OWN `.{uid}` <style> tag.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// CSS-slug sanitiser — design-token colour slugs travelling from parent block
// context into a `var(--wp--preset--color--{slug})` reference inside the scoped
// <style> tag. Strips everything except letters, digits, hyphen, underscore so a
// malicious slug can never break out of the declaration (contract §D).
$sgs_css_slug = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $value );
};

// CSS-keyword sanitiser — border-style free text.
// CSS-length sanitiser — border-width / radius string values.
$sgs_title                = $attributes['title'] ?? '';
$is_open                  = ! empty( $attributes['isOpen'] );
$style                    = $block->context['sgs/accordionStyle'] ?? 'bordered';
$icon_pos                 = $block->context['sgs/accordionIconPosition'] ?? 'right';
$header_col               = $block->context['sgs/accordionHeaderColour'] ?? '';
$header_bg                = $block->context['sgs/accordionHeaderBackground'] ?? '';
$header_bg_gradient       = $block->context['sgs/accordionHeaderBackgroundGradient'] ?? '';
$header_bg_hover          = $block->context['sgs/accordionHeaderBackgroundHover'] ?? '';
$header_bg_hover_gradient = $block->context['sgs/accordionHeaderBackgroundHoverGradient'] ?? '';
$icon_col                 = $block->context['sgs/accordionIconColour'] ?? '';
// D636/D644 icon/SVG gradient sibling — non-empty wins over icon_col above.
$icon_col_gradient       = $block->context['sgs/accordionIconColourGradient'] ?? '';
$icon_col_hover          = $block->context['sgs/accordionIconColourHover'] ?? '';
$icon_col_hover_gradient = $block->context['sgs/accordionIconColourHoverGradient'] ?? '';
$open_icon               = sanitize_key( $block->context['sgs/accordionOpenIcon'] ?? 'chevron-down' );
$close_icon              = sanitize_key( $block->context['sgs/accordionCloseIcon'] ?? 'chevron-up' );

// Unique scoped-CSS hook (CLASS — container/hero/quote convention).
$uid      = 'sgs-accordion-item-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-accordion-item';

$responsive_css = '';

// Header text/background colour — was inline `style="…"` on <summary>, now a
// scoped rule keyed off the item's own uid.
$header_decls = array();
if ( $header_col ) {
	$header_slug = $sgs_css_slug( $header_col );
	if ( '' !== $header_slug ) {
		$header_decls[] = 'color:var(--wp--preset--color--' . $header_slug . ')';
	}
}
// headerBackgroundGradient (colour-conformance preset-upgrade, 2026-09-06) —
// bypasses the preset-slug mechanism entirely when set (a gradient cannot be
// a swatch name). Unset behaviour (slug -> var(--wp--preset--color--{slug}))
// is completely unchanged.
$header_bg_gradient_value = function_exists( 'sgs_css_gradient_value' ) ? sgs_css_gradient_value( $header_bg_gradient ) : '';
if ( '' !== $header_bg_gradient_value ) {
	$header_decls[] = 'background-image:' . $header_bg_gradient_value;
} elseif ( $header_bg ) {
	$header_bg_slug = $sgs_css_slug( $header_bg );
	if ( '' !== $header_bg_slug ) {
		$header_decls[] = 'background-color:var(--wp--preset--color--' . $header_bg_slug . ')';
	}
}
if ( $header_decls ) {
	$responsive_css .= $root_sel . ' .sgs-accordion-item__header{' . implode( ';', $header_decls ) . '}';
}

// headerBackgroundHover/HoverGradient (colour-conformance FILL closeout,
// 2026-09-06) — the header row already has a real :hover rule in style.css
// with hardcoded theme-default colours; this scoped rule overrides it only
// when the operator sets a value, via the same touch-safe hover guard the
// icon hover below already uses.
$header_hover_decls = array();
if ( '' !== $header_bg_hover ) {
	$header_hover_slug = $sgs_css_slug( $header_bg_hover );
	if ( '' !== $header_hover_slug ) {
		$header_hover_decls[] = 'background-color:var(--wp--preset--color--' . $header_hover_slug . ')';
	}
}
$header_bg_hover_gradient_value = function_exists( 'sgs_css_gradient_value' ) ? sgs_css_gradient_value( $header_bg_hover_gradient ) : '';
if ( '' !== $header_bg_hover_gradient_value ) {
	$header_hover_decls[] = 'background-image:' . $header_bg_hover_gradient_value;
}
if ( $header_hover_decls ) {
	$responsive_css .= sgs_hover_state_rules( $root_sel . ' .sgs-accordion-item__header', implode( ';', $header_hover_decls ) );
}

// Icon colour — was inline `style="…"` on both icon spans, now a scoped rule.
if ( $icon_col ) {
	$icon_slug = $sgs_css_slug( $icon_col );
	if ( '' !== $icon_slug ) {
		$responsive_css .= $root_sel . ' .sgs-accordion-item__icon-open,' . $root_sel . ' .sgs-accordion-item__icon-close{color:var(--wp--preset--color--' . $icon_slug . ')}';
	}
}

// D636/D644 icon/SVG gradient — non-empty wins over icon_col's flat
// currentColor paint above (helpers-svg-gradient.php).
$sgs_ai_stroke_grad = sgs_icon_gradient_css( 'lucide', $icon_col_gradient, $uid . '-ig', '' );
if ( '' !== $sgs_ai_stroke_grad['css'] ) {
	$responsive_css .= $root_sel . ' .sgs-accordion-item__icon-open svg,' . $root_sel . ' .sgs-accordion-item__icon-close svg{' . $sgs_ai_stroke_grad['css'] . '}';
}

// Icon hover — via the shared sgs_icon_gradient_css() composer (2026-09-06).
// This block's icon is always Lucide (no source picker on the parent), so the
// composer always takes the SVG stroke-gradient branch. sgs_hover_state_rules()
// appends its suffix to a single target, so it's called once per icon span.
$sgs_ai_header_sel      = $root_sel . ' .sgs-accordion-item__header';
$sgs_ai_icon_hover_grad = sgs_icon_gradient_css( 'lucide', $icon_col_hover_gradient, $uid . '-igh', '' );
if ( '' !== $sgs_ai_icon_hover_grad['css'] ) {
	$responsive_css .= sgs_hover_state_rules( $sgs_ai_header_sel, $sgs_ai_icon_hover_grad['css'], ':focus-visible', ' .sgs-accordion-item__icon-open svg' );
	$responsive_css .= sgs_hover_state_rules( $sgs_ai_header_sel, $sgs_ai_icon_hover_grad['css'], ':focus-visible', ' .sgs-accordion-item__icon-close svg' );
} elseif ( '' !== $icon_col_hover ) {
	$icon_hover_slug = $sgs_css_slug( $icon_col_hover );
	if ( '' !== $icon_hover_slug ) {
		$icon_hover_decl = 'color:var(--wp--preset--color--' . $icon_hover_slug . ')';
		$responsive_css .= sgs_hover_state_rules( $sgs_ai_header_sel, $icon_hover_decl, ':focus-visible', ' .sgs-accordion-item__icon-open' );
		$responsive_css .= sgs_hover_state_rules( $sgs_ai_header_sel, $icon_hover_decl, ':focus-visible', ' .sgs-accordion-item__icon-close' );
	}
}

// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.

// D636 — sibling gradient attribute wins when set+valid.
$text_colour           = (string) ( $attributes['textColour'] ?? '' );
$text_colour_gradient  = (string) ( $attributes['textColourGradient'] ?? '' );
$text_colour_effective = sgs_resolve_text_colour_or_gradient( $text_colour, $text_colour_gradient );
if ( '' !== $text_colour_effective ) {
	$text_colour_decl = sgs_text_colour_decl( $text_colour_effective );
	if ( '' !== $text_colour_decl ) {
		$responsive_css .= "{$root_sel}{{$text_colour_decl};}";
	}
	// MANDATORY companion, not optional: a gradient reaches the browser as
	// background-clip:text, and without this @supports fallback a browser
	// lacking that support gets a bare `color:` holding a gradient string,
	// which it drops silently. No-op for a flat colour.
	$responsive_css .= sgs_text_colour_gradient_fallback_rule( $root_sel, $text_colour_effective );
}

// Background (colour + gradient, resting + hover) is owned by the shared fill
// emitter, NOT by the style engine and NOT by supports.color.gradients.
//
// supports.color.gradients was `true` here, so CORE rendered its own gradient
// panel in the Styles tab, competing with the SGS colour panel — the client saw
// two and could not tell which won. Switching the flag off alone would have
// REMOVED the only gradient control this block had, because the sole gradient
// read was $attributes['style']['color']['gradient'] (core's own storage). The
// flag flip is therefore PAIRED with a block-private backgroundColourGradient
// exposed through fillRow(), so capability is moved rather than lost.
$sgs_ai_fill_css = sgs_fill_states_css(
	$root_sel,
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
if ( '' !== $sgs_ai_fill_css ) {
	$responsive_css .= $sgs_ai_fill_css;
}

// (native border_args removed by the Shape-B migration -- width/style/colour
// are block-private attrs now, emitted below)

// Retrieve Lucide SVGs for open and close states. Fall back to inline chevrons
// if the icon name does not exist in the library (e.g. typo by the editor).
$open_icon_svg  = sgs_get_lucide_icon( $open_icon );
$close_icon_svg = sgs_get_lucide_icon( $close_icon );

if ( ! $open_icon_svg ) {
	$open_icon_svg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
if ( ! $close_icon_svg ) {
	$close_icon_svg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 15l-6-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

// D636/D644 — the gradient <defs> only needs to exist ONCE in the DOM
// (`url(#id)` resolves document-wide); both icon spans render simultaneously
// (CSS toggles which is visible), so injecting into the open-icon SVG alone
// is sufficient.
if ( '' !== $sgs_ai_stroke_grad['defs'] ) {
	$open_icon_svg = sgs_svg_inject_defs( $open_icon_svg, $sgs_ai_stroke_grad['defs'] );
}
if ( '' !== $sgs_ai_icon_hover_grad['defs'] ) {
	$open_icon_svg = sgs_svg_inject_defs( $open_icon_svg, $sgs_ai_icon_hover_grad['defs'] );
}

$icon_html = sprintf(
	'<span class="sgs-accordion-item__icon-open" aria-hidden="true">%s</span>' .
	'<span class="sgs-accordion-item__icon-close" aria-hidden="true">%s</span>',
	$open_icon_svg,
	$close_icon_svg
);

/*
 * aria-expanded on <summary> improves compatibility with legacy screen readers
 * that do not fully support the native <details>/<summary> open state.
 * The value is kept in sync by view.js on every toggle.
 */
$aria_expanded = $is_open ? 'true' : 'false';

// ---------------------------------------------------------------------------
// Build the interior HTML: <summary> header + content panel + $content.
// This entire blob becomes $inner_html for SGS_Container_Wrapper::render().
// The <details> open attribute travels via extra_attrs on the OUTER wrapper.
// ---------------------------------------------------------------------------
$summary_open  = sprintf(
	'<summary class="sgs-accordion-item__header" aria-expanded="%s">',
	esc_attr( $aria_expanded )
);
$summary_left  = 'left' === $icon_pos ? $icon_html : '';
$summary_title = sprintf( '<span class="sgs-accordion-item__title">%s</span>', wp_kses_post( $sgs_title ) );
$summary_right = 'right' === $icon_pos ? $icon_html : '';
$summary_close = '</summary>';
$content_panel = sprintf(
	'<div class="sgs-accordion-item__content">%s</div>',
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Inner blocks are already escaped.
);

$inner_html = $summary_open
	. $summary_left
	. $summary_title
	. $summary_right
	. $summary_close
	. $content_panel;

// ---------------------------------------------------------------------------
// Extra wrapper classes (BEM style + variant modifier).
// ---------------------------------------------------------------------------
$extra_classes = array(
	'sgs-accordion-item',
	'sgs-accordion-item--' . esc_attr( $style ),
	$uid,
);

// Skip-serialised `color` support also stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add them
// manually (mirrors sgs/hero + sgs/quote) so preset palette colours resolve.
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $preset_text_slug ) {
	$extra_classes[] = 'has-text-color';
	$extra_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$extra_classes[] = 'has-background';
	$extra_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

// ---------------------------------------------------------------------------
// Toggle attrs: `open` is an HTML boolean attribute on <details>.
// Pass as extra_attrs so SGS_Container_Wrapper merges it into get_block_wrapper_attributes().
// R-31-14: explicit $is_open discriminator — never empty($content).
// ---------------------------------------------------------------------------
$extra_attrs = array();
if ( $is_open ) {
	$extra_attrs['open'] = '';
}

// Own scoped <style> (composite caveat — printed BEFORE the wrapper call, which
// emits its own separate <style id="{uid}"> for the layers it owns: base
// spacing/max-width/contentWidth/band — same uid, two tags, matches hero).

// ── Block-private border: width / style / colour (Shape B). ──
// Migrated from WP-native supports by scripts/migrate-border-shape-b.js.
// Oracle: sgs/accordion, live-verified with scripts/qa/check-border-roundtrip.js.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

if ( 'none' !== $border_style ) {
	// G5 (Bean, 2026-08-26): a style with no width means NO border -- never fall
	// through to the browser's initial `medium` (~3px).
	if ( $has_border_width ) {
		$bwt             = '' !== $border_width_top ? $border_width_top : '0';
		$bwr             = '' !== $border_width_right ? $border_width_right : '0';
		$bwb             = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl             = '' !== $border_width_left ? $border_width_left : '0';
		$responsive_css .= $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$responsive_css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$responsive_css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$scoped_css[] = $root_sel . '{border-style:none;border-width:0;}';
}

// ── Block-private border-radius (radius is no longer native -- Shape B now
// covers all four legs). Same wp_style_engine_get_styles() route already
// proven live by sgs/media + sgs/before-after's borderRadiusTablet/Mobile
// tiers; base now goes through the identical call instead of WP's native
// serialisation. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (`.=` for a string accumulator, `[] =` for an array one). ──
$radius_tiers      = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$responsive_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$responsive_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$responsive_css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

if ( $responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below; $responsive_css built from pre-sanitised values only.
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), wp_strip_all_tags( $responsive_css ) );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() output is pre-sanitised; $block is WP_Block object; arrays are caller-built with esc_attr().
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'content',
	array(
		'tag'           => 'details',
		'extra_classes' => $extra_classes,
		'extra_attrs'   => $extra_attrs,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
