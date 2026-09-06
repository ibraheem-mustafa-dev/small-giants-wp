<?php
/**
 * SGS Trust Bar block — server-side render.
 *
 * Typed-only: curated items[] repeater (all 3 variants).
 * sourceMode attribute removed — typed is the only mode; the attribute was redundant.
 *
 * @since 0.2.0  Merged certification-bar + auto-scroll (D95).
 * @since 0.3.0  Dual-mode per Spec 24 FR-24-10.
 * @since 0.5.0  Typed-only — bound mode purged.
 * @since 0.5.1  sourceMode attribute removed (Rule 3 de-plumb).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Unused (dynamic block, no InnerBlocks).
 * @var \WP_Block $block     Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-typography.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-media-element.php';

// --- Unique ID for scoped typography <style> ----------------------------------
$uid = wp_unique_id( 'sgs-tb-' );

// CSS-keyword sanitiser — free-text attrs (border-style etc.) concatenated into
// raw CSS declarations inside this block's scoped <style> tag. Letters + hyphen
// only. Mirrors sgs/hero's sgs_css_keyword_sanitise(no-inline migration contract §D).
// CSS length/unit sanitiser — for free-text length values (border-width etc.)
// concatenated into raw CSS declarations. Mirrors sgs/hero's sgs_css_length_value().
// --- Shared attributes --------------------------------------------------------
$badge_style           = sanitize_html_class( $attributes['badgeStyle'] ?? 'icon-circle' );
$badge_size            = sanitize_html_class( $attributes['badgeSize'] ?? 'medium' );
$block_title           = $attributes['title'] ?? '';
$title_colour          = $attributes['titleColour'] ?? 'text-muted';
$title_colour_gradient = $attributes['titleColourGradient'] ?? '';
$label_colour          = $attributes['labelColour'] ?? 'text';
$label_colour_gradient = $attributes['labelColourGradient'] ?? '';

// --- icon-circle attributes ---------------------------------------------------
$icon_circle_size = absint( $attributes['iconCircleSize'] ?? 44 );
$icon_circle_bg   = $attributes['iconCircleBackground'] ?? 'surface';
// iconCircleBackgroundGradient (2026-09-06, colour-conformance closeout) —
// gradient sibling, resolved below alongside $circle_bg_value.
$icon_circle_bg_gradient = $attributes['iconCircleBackgroundGradient'] ?? '';
// Hover-state background (colour-conformance 2026-09-06 closeout) — sibling
// gradient. Both resolved alongside the resting values below.
$icon_circle_bg_hover          = $attributes['iconCircleBackgroundHover'] ?? '';
$icon_circle_bg_gradient_hover = $attributes['iconCircleBackgroundHoverGradient'] ?? '';
$icon_colour                   = $attributes['iconColour'] ?? 'primary-dark';
// D636/D644 icon/SVG gradient sibling — non-empty wins over iconColour above,
// but only paints the outline (default) badge's `stroke` — a 'filled' badge's
// `fill` paint is out of this mechanism's scope (css:fill territory, Builder 5).
// The actual CSS/defs resolution happens further down (after $uid_scope is
// defined) via sgs_icon_gradient_states_css() — both states in one call
// (2026-09-06 close-out; hover-gradient did not exist on this block before).
$icon_colour_gradient       = $attributes['iconColourGradient'] ?? '';
$icon_colour_hover_gradient = $attributes['iconColourHoverGradient'] ?? '';
$tb_stroke_grad_defs_used   = false;
$text_colour                = $attributes['textColour'] ?? 'text';
$icon_circle_border_radius  = isset( $attributes['iconCircleBorderRadius'] ) ? (string) $attributes['iconCircleBorderRadius'] : '50%';

// --- Root-element background/text colour (+ hover), D636-style gradient siblings.
// Mirrors sgs/testimonial-slider's `slider` wrapper element exactly (css:background-color
// -> backgroundColour, css:color -> textColour, states.hover -> the Hover pair).
$root_background_colour                = $attributes['backgroundColour'] ?? '';
$root_background_colour_gradient       = $attributes['backgroundColourGradient'] ?? '';
$root_background_colour_hover          = $attributes['backgroundColourHover'] ?? '';
$root_background_colour_hover_gradient = $attributes['backgroundColourHoverGradient'] ?? '';
$root_text_colour_gradient             = $attributes['textColourGradient'] ?? '';
$root_text_colour_hover                = $attributes['textColourHover'] ?? '';
$root_text_colour_hover_gradient       = $attributes['textColourHoverGradient'] ?? '';
$icon_circle_shadow                    = isset( $attributes['iconCircleShadow'] ) ? (string) $attributes['iconCircleShadow'] : 'subtle';
$icon_circle_shadow_colour             = isset( $attributes['iconCircleShadowColour'] ) ? (string) $attributes['iconCircleShadowColour'] : '';
$icon_circle_shadow_colour_hover       = isset( $attributes['iconCircleShadowColourHover'] ) ? (string) $attributes['iconCircleShadowColourHover'] : '';

// --- image-badge attributes (mirrors icon-circle's own control set) -----------
$badge_image_border_radius       = isset( $attributes['badgeImageBorderRadius'] ) ? (string) $attributes['badgeImageBorderRadius'] : '';
$badge_image_size                = isset( $attributes['badgeImageSize'] ) ? absint( $attributes['badgeImageSize'] ) : 60;
$badge_image_shadow              = isset( $attributes['badgeImageShadow'] ) ? (string) $attributes['badgeImageShadow'] : '';
$badge_image_shadow_colour       = isset( $attributes['badgeImageShadowColour'] ) ? (string) $attributes['badgeImageShadowColour'] : '';
$badge_image_shadow_colour_hover = isset( $attributes['badgeImageShadowColourHover'] ) ? (string) $attributes['badgeImageShadowColourHover'] : '';
// badgeImageObjectFit is read directly by SGS_Media_Element::style() (the
// shared object-fit atom, rule 37-media-no-handroll) further down — no local
// sanitised copy needed here.
// Grid columns are driven by the gridTemplateColumns attr via the shared wrapper helper.
// Gap is consumed by the shared wrapper helper directly from $attributes['gap'].

// --- Auto-scroll attributes --------------------------------------------------
$auto_scroll       = ! empty( $attributes['autoScroll'] );
$auto_scroll_speed = sanitize_html_class( $attributes['autoScrollSpeed'] ?? 'medium' );
$auto_scroll_pause = isset( $attributes['autoScrollPauseOnHover'] ) ? (bool) $attributes['autoScrollPauseOnHover'] : true;

// Clamp circle size.
$icon_circle_size = max( 36, min( 64, $icon_circle_size ) );

// Clamp image-badge size.
$badge_image_size = max( 24, min( 160, $badge_image_size ) );

// --- Resolve colour values ----------------------------------------------------
$circle_bg_value          = sgs_colour_value( $icon_circle_bg );
$circle_bg_gradient_value = sgs_css_gradient_value( $icon_circle_bg_gradient );
// Hover-state values (colour-conformance 2026-09-06).
$circle_bg_hover_value          = sgs_colour_value( $icon_circle_bg_hover );
$circle_bg_gradient_hover_value = sgs_css_gradient_value( $icon_circle_bg_gradient_hover );
$icon_colour_value              = sgs_colour_value( $icon_colour );
$text_colour_value              = sgs_colour_value( $text_colour );
// D636 — sibling gradient attribute wins when set+valid (mirrors sgs/counter's
// numberColour/labelColour wiring, helpers-tokens.php:1086,1124,1166).
$title_colour_effective = sgs_resolve_text_colour_or_gradient( $title_colour, $title_colour_gradient );
$label_colour_effective = sgs_resolve_text_colour_or_gradient( $label_colour, $label_colour_gradient );

// --- Wrapper CSS custom properties --------------------------------------------
// Gap is handled by the shared wrapper helper (WS-4 mirror), which reads the
// `gap` attr and emits `gap:var(--wp--preset--spacing--N)` as an inline style
// when layout="grid".
$styles = array();

if ( 'icon-circle' === $badge_style ) {
	// Circle size: only emit when it differs from the CSS default (44px) to keep
	// the inline style lean, but size change IS what shifts layout so the opt-out
	// is safe for the default case.
	if ( 44 !== $icon_circle_size ) {
		$styles[] = '--sgs-trust-badge-circle-size: ' . $icon_circle_size . 'px';
	}
	// Circle background: always emitted (even for default 'surface') so the CSS
	// custom property is explicitly defined on the wrapper and the var() chain
	// resolves to the correct token rather than silently falling back to a value
	// that may match the section/page background (making the disc invisible).
	// Falls back to surface-alt (#F1F0EC) in CSS — visually distinct from the
	// surface (#FAF9F6) page/section background.
	$styles[] = '--sgs-trust-badge-circle-bg: ' . ( $circle_bg_value ? $circle_bg_value : 'var(--wp--preset--color--surface-alt)' );
	// iconCircleBackgroundGradient (2026-09-06) — sibling wins over the flat
	// background above at paint time via style.css's background-image line;
	// only emitted when a valid gradient is set.
	if ( $circle_bg_gradient_value ) {
		$styles[] = '--sgs-trust-badge-circle-bg-gradient: ' . $circle_bg_gradient_value;
	}
	// Icon colour: always emit so the SVG stroke reliably uses the operator value.
	$styles[] = '--sgs-trust-badge-icon-colour: ' . ( $icon_colour_value ? $icon_colour_value : 'var(--wp--preset--color--primary-dark)' );
	// Label (text) colour: emit when resolved.
	if ( $text_colour_value ) {
		$styles[] = '--sgs-trust-badge-text-colour: ' . $text_colour_value;
	}
	// Border-radius: only emit when it differs from the default (full circle).
	if ( '' !== $icon_circle_border_radius && '50%' !== $icon_circle_border_radius ) {
		$safe_radius = preg_replace( '/[^A-Za-z0-9\s%().,\-]/', '', $icon_circle_border_radius );
		$styles[]    = '--sgs-trust-badge-circle-radius: ' . esc_attr( trim( $safe_radius ) );
	}
	// Shadow: only emit when non-empty (empty string = resets to CSS default).
	// sgs_shadow_value_composed() composes the SHAPE-only attr (D621/D622
	// colour-panel split) with the separate colour attr — a preset slug
	// (sm/md/lg/glow) is self-contained and the colour is ignored; a raw
	// shape string gets the colour appended.
	$safe_icon_circle_shadow = sgs_shadow_value_composed( $icon_circle_shadow, $icon_circle_shadow_colour );
	if ( '' !== $safe_icon_circle_shadow ) {
		$styles[] = '--sgs-trust-badge-circle-shadow: ' . $safe_icon_circle_shadow;
	}
}

// --- Wrapper classes + data attributes (WS-4: passed to the shared helper) -----
// trust-bar mirrors sgs/container's wrapper (containerKind='section'); its OWN
// block classes + CSS vars + data-* attrs ride through the helper via opts.
$tb_extra_classes = array(
	'sgs-trust-bar',
	'sgs-trust-bar--' . $badge_style,
	'sgs-trust-bar--' . $badge_size,
	esc_attr( $uid ),
);

// --- Scoped uid selector (used for color/border/typography below) ------------
$uid_scope = '.' . esc_attr( $uid );
$root_sel  = $uid_scope . '.wp-block-sgs-trust-bar';

// --- No-inline contract (§A): WP-native color + border supports. -------------
// NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// Base spacing (padding/margin) is a SEPARATE mechanism the wrapper already handles scoped
// internally (reads $attributes['style']['spacing'] directly) — not duplicated
// here.
$tb_extra_scoped_css = '';

// HOVER-state shadow colours (Rule 31, 2026-08-22) — reuse the resting shadow
// SHAPE with the hover colour composed in, emitted as scoped :hover/:focus-within
// rules (a custom property can't carry pseudo-state on its own, unlike the
// resting shape above which is inline via $styles[]). Deferred to here because
// $uid_scope isn't defined at the icon-circle/$styles[] block above.
if ( 'icon-circle' === $badge_style && '' !== $icon_circle_shadow_colour_hover ) {
	$safe_icon_circle_shadow_hover = sgs_shadow_value_composed( $icon_circle_shadow, $icon_circle_shadow_colour_hover );
	if ( '' !== $safe_icon_circle_shadow_hover ) {
		$tb_extra_scoped_css .= sgs_hover_state_rules( $uid_scope . ' .sgs-trust-bar__circle', 'box-shadow:' . $safe_icon_circle_shadow_hover, ':focus-within' );
	}
}

// HOVER-state background colours (colour-conformance 2026-09-06 closeout) —
// emit custom properties scoped to .sgs-trust-bar__circle:hover/:focus-visible.
// Both flat colour and gradient are emitted when set, allowing style.css to
// layer them (gradient wins via background-image order).
if ( 'icon-circle' === $badge_style && ( '' !== $circle_bg_hover_value || '' !== $circle_bg_gradient_hover_value ) ) {
	$hover_bg_decls = array();
	if ( '' !== $circle_bg_hover_value ) {
		$hover_bg_decls[] = '--sgs-trust-badge-circle-bg-hover:' . $circle_bg_hover_value;
	}
	if ( '' !== $circle_bg_gradient_hover_value ) {
		$hover_bg_decls[] = '--sgs-trust-badge-circle-bg-gradient-hover:' . $circle_bg_gradient_hover_value;
	}
	if ( $hover_bg_decls ) {
		$tb_extra_scoped_css .= $uid_scope . ' .sgs-trust-bar__circle:hover,' . $uid_scope . ' .sgs-trust-bar__circle:focus-visible{' . implode( ';', $hover_bg_decls ) . ';}';
	}
}

$tb_style_engine_args = array();

$tb_border_args = array();
// G5 (Bean, 2026-08-26): 'style set, no width' means no border by
// default — never fall through to the browser's initial medium (~3px)
// border-width. Gated together via the shared helper (helpers-box.php)
// so this rule is applied identically everywhere, not per block.


// --- Root-element background + text colour (+ hover), no-inline contract. ----
// supports.color is ALL-FALSE (native colour UI retired in favour of the
// SgsColourPanel rows below); this block paints background/text itself via
// scoped CSS, mirroring sgs/site-header-row's colour block + sgs/text's
// gradient-capable text-colour mechanism (D636 — the sibling `{attr}Gradient`
// wins over the flat value).
$tb_root_colour_decls = array();

$tb_bg_decl = sgs_background_paint_decl( $root_background_colour, $root_background_colour_gradient );
if ( '' !== $tb_bg_decl ) {
	$tb_root_colour_decls[] = $tb_bg_decl;
}

$tb_text_colour_effective = sgs_resolve_text_colour_or_gradient( $text_colour, $root_text_colour_gradient );
if ( '' !== $tb_text_colour_effective ) {
	$tb_text_colour_decl = sgs_text_colour_decl( $tb_text_colour_effective );
	if ( '' !== $tb_text_colour_decl ) {
		$tb_root_colour_decls[] = $tb_text_colour_decl;
	}
}

$tb_root_colour_hover_decls = array();

$tb_bg_hover_decl = sgs_background_paint_decl( $root_background_colour_hover, $root_background_colour_hover_gradient );
if ( '' !== $tb_bg_hover_decl ) {
	$tb_root_colour_hover_decls[] = $tb_bg_hover_decl;
}

$tb_text_colour_hover_effective = sgs_resolve_text_colour_or_gradient( $root_text_colour_hover, $root_text_colour_hover_gradient );
if ( '' !== $tb_text_colour_hover_effective ) {
	$tb_text_colour_hover_decl = sgs_text_colour_decl( $tb_text_colour_hover_effective );
	if ( '' !== $tb_text_colour_hover_decl ) {
		$tb_root_colour_hover_decls[] = $tb_text_colour_hover_decl;
	}
}

if ( $tb_root_colour_decls || $tb_root_colour_hover_decls ) {
	if ( '' !== ( $attributes['iconColourHover'] ?? '' ) ) {
		$tb_root_colour_hover_decls[] = 'color:' . sgs_colour_value( $attributes['iconColourHover'] );
	}
	$tb_extra_scoped_css .= sgs_emit_state_colour_css( $root_sel, $tb_root_colour_decls, $tb_root_colour_hover_decls );
}

// `@supports not (background-clip: text)` fallback rules — no-op ('') for a
// flat colour, only emit real CSS when the effective value was a gradient.
$tb_extra_scoped_css .= sgs_text_colour_gradient_fallback_rule( $root_sel, $tb_text_colour_effective );
$tb_extra_scoped_css .= sgs_hover_media_wrap(
	sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $root_sel . ':hover', $tb_text_colour_hover_effective )
);
$tb_extra_scoped_css .= sgs_text_colour_gradient_fallback_rule( $root_sel . ':focus-visible', $tb_text_colour_hover_effective );

$tb_extra_attrs = array(
	'aria-label' => __( 'Trust signals', 'sgs-blocks' ),
);

// data-columns removed: grid columns are now driven by gridTemplateColumns attr
// via the universal wrapper mechanism. No CSS selector overrides needed.

if ( $auto_scroll ) {
	$tb_extra_attrs['data-auto-scroll']       = 'true';
	$tb_extra_attrs['data-auto-scroll-speed'] = $auto_scroll_speed;
	$tb_extra_attrs['data-auto-scroll-pause'] = $auto_scroll_pause ? 'true' : 'false';
}

// Landmark label override — a fixed 'Trust signals' aria-label is set above
// regardless of tag (it also names the default <section>'s region landmark).
// nav/aside only: let the client override it (main was removed from the
// tagName allowlist entirely; header/footer lose their landmark role once
// nested so need no label).
$tb_tag_name = isset( $attributes['tagName'] ) ? sanitize_key( $attributes['tagName'] ) : 'section';
if ( in_array( $tb_tag_name, array( 'nav', 'aside' ), true ) && ! empty( $attributes['ariaLabel'] ) ) {
	$tb_extra_attrs['aria-label'] = sanitize_text_field( $attributes['ariaLabel'] );
}

// Wrapper opts — the helper owns the OUTER <div> wrapper + any mirrored
// container layers (bg/width/etc. when the operator sets them);
// trust-bar keeps its own interior (title + badges) as $inner_html.
$tb_wrapper_opts = array(
	'tag'           => isset( $attributes['tagName'] ) ? sanitize_key( $attributes['tagName'] ) : 'section',
	'extra_classes' => $tb_extra_classes,
	'extra_styles'  => $styles,
	'extra_attrs'   => $tb_extra_attrs,
);

// --- Title colour (no-inline contract: scoped rule, not inline style=) -------

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
		$bwt                  = '' !== $border_width_top ? $border_width_top : '0';
		$bwr                  = '' !== $border_width_right ? $border_width_right : '0';
		$bwb                  = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl                  = '' !== $border_width_left ? $border_width_left : '0';
		$tb_extra_scoped_css .= $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$tb_extra_scoped_css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$tb_extra_scoped_css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
}

// ── Block-private border-radius (radius is no longer native -- Shape B now
// covers all four legs). Same wp_style_engine_get_styles() route already
// proven live by sgs/media + sgs/before-after's borderRadiusTablet/Mobile
// tiers; base now goes through the identical call instead of WP's native
// serialisation. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (`.=` for a string accumulator, `[] =` for an array one). ──
$radius_tiers = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$tb_extra_scoped_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$tb_extra_scoped_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$tb_extra_scoped_css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// Colour is emitted into $tb_extra_scoped_css below (keyed on $uid_scope); the
// element itself carries only its class — font-size/weight/style land via the
// existing sgs_typography_css_rule() helper further down.
$tb_title_sel = $uid_scope . ' .sgs-trust-bar__title';
if ( '' !== $title_colour_effective ) {
	$tb_title_colour_decl = sgs_text_colour_decl( $title_colour_effective );
	if ( '' !== $tb_title_colour_decl ) {
		$tb_extra_scoped_css .= "{$tb_title_sel}{{$tb_title_colour_decl};}";
	}
	$tb_extra_scoped_css .= sgs_text_colour_gradient_fallback_rule( $tb_title_sel, $title_colour_effective );
}

// D636/D644 icon/SVG gradient — one rule paints every outline (default,
// non-'filled') badge's icon stroke; a 'filled' badge's `fill` paint is
// deliberately out of scope (css:fill territory). Both states resolved
// together via sgs_icon_gradient_states_css() (2026-09-06 close-out) —
// lucide-only badge glyphs, so the icon source is hardcoded here.
$tb_icon_grad_sel = $uid_scope . ' .sgs-trust-bar__circle svg';
$tb_stroke_grad   = sgs_icon_gradient_states_css( 'lucide', $icon_colour_gradient, $icon_colour_hover_gradient, $uid, $tb_icon_grad_sel );
if ( $tb_stroke_grad['css'] ) {
	$tb_extra_scoped_css .= implode( '', $tb_stroke_grad['css'] );
}

// --- Optional title -----------------------------------------------------------
// Guard against whitespace-only or HTML-only values (e.g. an empty <br> saved
// by RichText) so an unset title never renders a visible element.
$title_html        = '';
$block_title_plain = trim( wp_strip_all_tags( $block_title ) );
if ( $block_title_plain ) {
	$title_html = sprintf(
		'<p class="sgs-trust-bar__title">%s</p>',
		wp_kses_post( $block_title )
	);
}

// =============================================================================
// TYPED MODE — curated items[] render.
// =============================================================================
$items = $attributes['items'] ?? array();

// --- Label colour (no-inline contract: scoped rule, not inline style=) -------
// Applies to the text-only / image-badge badge-label element; the icon-circle
// variant's label colour is a separate mechanism (--sgs-trust-badge-text-colour
// CSS var, emitted above). Colour lands in $tb_extra_scoped_css below (keyed on
// $uid_scope); font-size/weight/style via sgs_typography_css_rule() further down.
$tb_badge_label_sel = $uid_scope . ' .sgs-trust-bar__badge-label';
if ( '' !== $label_colour_effective ) {
	$tb_label_colour_decl = sgs_text_colour_decl( $label_colour_effective );
	if ( '' !== $tb_label_colour_decl ) {
		$tb_extra_scoped_css .= "{$tb_badge_label_sel}{{$tb_label_colour_decl};}";
	}
	$tb_extra_scoped_css .= sgs_text_colour_gradient_fallback_rule( $tb_badge_label_sel, $label_colour_effective );
}

// --- image-badge appearance (no-inline contract: scoped rule, not inline style=) -----
// Mirrors icon-circle's own control set (size/shadow/border-radius) plus an
// image-specific object-fit control. Only emitted when the variant is active.
// Media-element atom layer (rule 37-media-no-handroll) — badgeImageObjectFit
// already matches mediaAttrName('badgeImage','ObjectFit'), so it is wired
// directly onto the shared object-fit atom rather than a hand-rolled
// `object-fit:` declaration. Computed once (not per item, below) because the
// scope class/CSS are the same for every badge image in this block instance;
// only fires when the image-badge branch actually renders an <img>.
$tb_badge_img_marker_class_attr = '';
if ( 'image-badge' === $badge_style && class_exists( 'SGS_Media_Element' ) ) {
	$tb_badge_img_scope_class       = SGS_Media_Element::scope_class( $uid, 'badgeImage' );
	$tb_badge_img_marker_class_attr = ' ' . implode( ' ', SGS_Media_Element::element_classes( $tb_badge_img_scope_class ) );

	$tb_badge_img_atom_css = SGS_Media_Element::style( $attributes, 'badgeImage', 'sgs/trust-bar', $uid, array( 'object-fit' ) );
	if ( '' !== $tb_badge_img_atom_css ) {
		$tb_extra_scoped_css .= $tb_badge_img_atom_css;
	}
}

if ( 'image-badge' === $badge_style ) {
	$img_sel   = $uid_scope . ' .sgs-trust-bar__badge-img';
	$img_decls = array();

	$img_decls[] = 'width:' . $badge_image_size . 'px';
	$img_decls[] = 'height:' . $badge_image_size . 'px';

	if ( '' !== $badge_image_border_radius ) {
		$safe_img_radius = preg_replace( '/[^A-Za-z0-9\s%().,\-]/', '', $badge_image_border_radius );
		$img_decls[]     = 'border-radius:' . esc_attr( trim( $safe_img_radius ) );
	}

	// sgs_shadow_value_composed() composes the SHAPE-only attr (D621/D622
	// colour-panel split) with the separate colour attr; an empty/invalid
	// stored shape resolves to '' so no declaration is emitted.
	$safe_badge_image_shadow = sgs_shadow_value_composed( $badge_image_shadow, $badge_image_shadow_colour );
	if ( '' !== $safe_badge_image_shadow ) {
		$img_decls[] = 'box-shadow:' . $safe_badge_image_shadow;
	}

	$tb_extra_scoped_css .= $img_sel . '{' . implode( ';', $img_decls ) . '}';

	// HOVER-state shadow colour (Rule 31, 2026-08-22) — same shape as the
	// icon-circle hover rule above.
	if ( '' !== $badge_image_shadow_colour_hover ) {
		$safe_badge_image_shadow_hover = sgs_shadow_value_composed( $badge_image_shadow, $badge_image_shadow_colour_hover );
		if ( '' !== $safe_badge_image_shadow_hover ) {
			$tb_extra_scoped_css .= sgs_hover_state_rules( $img_sel, 'box-shadow:' . $safe_badge_image_shadow_hover, ':focus-within' );
		}
	}
}

// --- Build badge items HTML ---------------------------------------------------
$items_html = '';

// Spec 35 Part 4 — per-item object-fit override, image-badge variant only.
// Keyed by the item's OWN stable `_key` (src/utils/generateItemKey.js), never
// by array index/`:nth-child` (both break the moment an operator reorders/
// adds/removes a badge). `sgs_media_position_css()` already accepts an
// arbitrary attributes array + prefix; passed a per-item shim here rather
// than the block's own $attributes, with focalPoint always null (badges are
// logos/certification marks, not photographs — no crop control by design,
// mirroring sgs/testimonial's orgLogo + sgs/brand-strip's logoFit). A
// pre-existing item authored before this field existed has no `_key` yet
// (client-side backfill lands on next editor save), so the index fallback
// below is never load-bearing in practice — it only prevents an empty
// selector.
$tb_per_item_css = '';

// Sibling offset for the per-badge `:nth-child(N)` scoped rules below.
//
// `:nth-child` counts EVERY element sibling, so N is only the badge's own
// 1-based position when the badges are the sole children of their parent.
// Two compositions exist, both decided further down (see the $badges_html
// ternary and the SGS_Container_Wrapper::render() call):
// * auto-scroll ON  → badges are wrapped in `.sgs-trust-bar__track`, which
// therefore contains ONLY badges → offset 0.
// * auto-scroll OFF → badges are passed to the wrapper as
// `$title_html . $badges_html`, so a rendered title is an element sibling
// immediately before badge 1 → offset 1.
// The block's `autoScroll` default is FALSE, so the offset case is the DEFAULT
// rendering path, not an edge case.
//
// This is derived from the SAME two variables that compose the parent, so it
// cannot silently drift. ⚠ If another element is ever added as a sibling of the
// badges, extend this expression — do not add the element and leave this alone.
$tb_badge_offset = ( ! $auto_scroll && '' !== $title_html ) ? 1 : 0;

foreach ( $items as $tb_item_index => $item ) {
	$item       = is_array( $item ) ? $item : array();
	$item_label = isset( $item['label'] ) ? sanitize_text_field( (string) $item['label'] ) : '';
	$item_url   = isset( $item['url'] ) ? (string) $item['url'] : '';
	// Task 2.1) resolved via sgs_link_attributes() — url/linkTarget/linkRel are
	// the existing per-item storage keys, mapped to the shared SgsLinkControl
	// object shape { url, opensInNewTab, rel } at render time. Existing items
	// with no stored linkTarget default to opensInNewTab=true + rel="noreferrer"
	// to preserve the block's prior hardcoded target="_blank" rel="noopener
	// noreferrer" behaviour.
	$item_link_attrs = sgs_link_attributes(
		array(
			'url'           => $item_url,
			'opensInNewTab' => isset( $item['linkTarget'] ) ? '_blank' === $item['linkTarget'] : true,
			'rel'           => isset( $item['linkRel'] ) && '' !== $item['linkRel'] ? $item['linkRel'] : 'noreferrer',
		)
	);
	$item_attrs      = '';

	if ( 'icon-circle' === $badge_style ) {
		// Determine which SVG to render inside the circle.
		// IconPicker stores the raw Lucide slug directly into item['icon'].
		// Priority: Lucide slug > raw_svg fallback from the cloning icon resolver.
		$icon_slug = isset( $item['icon'] ) ? sanitize_key( (string) $item['icon'] ) : '';
		$raw_svg   = isset( $item['iconSvg'] ) ? (string) $item['iconSvg'] : '';

		if ( '' !== $icon_slug ) {
			// IconPicker stores the Lucide slug directly — resolve the sprite.
			$svg = sgs_get_lucide_icon( $icon_slug );
			if ( ! $svg ) {
				// Unknown slug — fall back to check so the badge is never blank.
				$svg = sgs_get_lucide_icon( 'check' );
			}
		} elseif ( '' !== $raw_svg ) {
			// Resolver returned a raw SVG fallback (no confident slug match).
			// Sanitise with the existing sgs_svg_kses_allowed_tags() allowlist so
			// only safe SVG drawing elements and attributes are emitted.
			$svg = wp_kses( $raw_svg, sgs_svg_kses_allowed_tags() );
		} else {
			// No icon set — show the generic check tick so the badge is never blank.
			$svg = sgs_get_lucide_icon( 'check' );
		}

		// D636/D644 icon/SVG gradient — the defs only need to exist ONCE in the
		// DOM (`url(#id)` resolves document-wide); injected into the first
		// rendered badge's SVG only, to avoid a duplicate #id across the loop.
		// Both base + hover defs share the one injection point/flag — a badge
		// icon that never renders (empty items array) means neither is needed.
		if ( ! $tb_stroke_grad_defs_used && ( '' !== $tb_stroke_grad['defs_base'] || '' !== $tb_stroke_grad['defs_hover'] ) ) {
			$svg                      = sgs_svg_inject_defs( $svg, $tb_stroke_grad['defs_base'] );
			$svg                      = sgs_svg_inject_defs( $svg, $tb_stroke_grad['defs_hover'] );
			$tb_stroke_grad_defs_used = true;
		}

		// Per-badge fill style: 'filled' paints a solid glyph (e.g. a filled star),
		// exempting it from the uniform outline default in style.css. An operator
		// can override the fill colour per badge via item.fillColour.
		$is_filled    = isset( $item['fillStyle'] ) && 'filled' === $item['fillStyle'];
		$circle_class = 'sgs-trust-bar__circle' . ( $is_filled ? ' sgs-trust-bar__circle--filled' : '' );
		if ( $is_filled && ! empty( $item['fillColour'] ) ) {
			// sgs_colour_value() resolves a token slug → CSS var (or passes a raw
			// colour) and already escapes the value. fillColour VARIES per item, so
			// (FR-32-4, D345) it cannot be a single scoped rule on the block root —
			// emitted into a `:nth-child(N)` scoped rule instead (same mechanism as
			// sgs/social-icons' per-item brand colour). Every item renders its
			// `.sgs-trust-bar__badge` wrapper unconditionally, so the badge's own
			// 1-based position is $tb_item_index + 1 — PLUS $tb_badge_offset, which
			// accounts for any non-badge element sibling sharing the badges' parent
			// (a rendered title, when auto-scroll is off). See where it is computed,
			// just above the loop.
			$fill_colour = sgs_colour_value( (string) $item['fillColour'] );
			if ( $fill_colour ) {
				$tb_extra_scoped_css .= $uid_scope . ' .sgs-trust-bar__badge:nth-child(' . ( (int) $tb_item_index + 1 + $tb_badge_offset ) . ') .' . str_replace( ' ', '.', $circle_class ) . '{--sgs-trust-badge-icon-fill:' . esc_attr( $fill_colour ) . ';}';
			}
		}

		$items_html .= sprintf(
			'<div class="sgs-trust-bar__badge"%s><span class="%s" aria-hidden="true">%s</span><span class="sgs-trust-bar__label">%s</span></div>',
			$item_attrs,
			esc_attr( $circle_class ),
			$svg,
			esc_html( $item_label )
		);

	} elseif ( 'text-only' === $badge_style ) {
		$inner_html = sprintf(
			'<span class="sgs-trust-bar__badge-label">%s</span>',
			esc_html( $item_label )
		);

		if ( $item_url ) {
			$items_html .= sprintf(
				'<a%s class="sgs-trust-bar__badge"%s>%s</a>',
				$item_link_attrs,
				$item_attrs,
				$inner_html
			);
		} else {
			$items_html .= sprintf( '<div class="sgs-trust-bar__badge"%s>%s</div>', $item_attrs, $inner_html );
		}
	} elseif ( 'image-badge' === $badge_style ) {
		$media_url = isset( $item['media']['url'] ) ? (string) $item['media']['url'] : '';
		if ( empty( $media_url ) && isset( $item['image']['url'] ) ) {
			$media_url = (string) $item['image']['url'];
		}
		$media_alt = isset( $item['media']['alt'] ) ? (string) $item['media']['alt'] : '';
		if ( empty( $media_alt ) ) {
			$media_alt = isset( $item['label'] ) ? (string) $item['label'] : '';
		}

		// Per-item object-fit override (Spec 35 Part 4) — see the
		// $tb_per_item_css declaration above the loop for the full rationale.
		$tb_item_key      = ! empty( $item['_key'] ) ? (string) $item['_key'] : 'idx-' . absint( $tb_item_index );
		$tb_item_key_attr = ' data-badge-key="' . esc_attr( $tb_item_key ) . '"';
		$tb_per_item_css .= sgs_media_position_css(
			array(
				'objectPosition' => null,
				'objectFit'      => $item['objectFit'] ?? '',
			),
			'',
			$uid_scope . ' [data-badge-key="' . esc_attr( $tb_item_key ) . '"] img'
		);

		// Decorative badge image (WCAG 2.1 AA 1.1.1) — an explicit per-badge
		// editorial choice that this image carries no information (e.g. a
		// repeating brand-mark pattern where the names already appear as
		// text elsewhere). Blank the alt AND add aria-hidden so assistive
		// tech skips it entirely rather than announcing an empty image.
		$item_decorative = ! empty( $item['decorative'] );
		if ( $item_decorative ) {
			$media_alt = '';
		}

		$item_attrs   .= $tb_item_key_attr;
		$badge_content = '';
		if ( $media_url ) {
			$badge_content .= sprintf(
				'<img src="%s" alt="%s"%s class="sgs-trust-bar__badge-img%s" loading="lazy" />',
				esc_url( $media_url ),
				esc_attr( $media_alt ),
				$item_decorative ? ' aria-hidden="true"' : '',
				esc_attr( $tb_badge_img_marker_class_attr )
			);
		}
		if ( $item_label ) {
			$badge_content .= sprintf(
				'<span class="sgs-trust-bar__badge-label">%s</span>',
				esc_html( $item_label )
			);
		}

		if ( $item_url ) {
			$items_html .= sprintf(
				'<a%s class="sgs-trust-bar__badge"%s>%s</a>',
				$item_link_attrs,
				$item_attrs,
				$badge_content
			);
		} else {
			$items_html .= sprintf( '<div class="sgs-trust-bar__badge"%s>%s</div>', $item_attrs, $badge_content );
		}
	}
}

// --- Auto-scroll track wrapper ------------------------------------------------
// view.js queries .sgs-trust-bar[data-auto-scroll="true"] then .sgs-trust-bar__track.
$badges_html = $auto_scroll
	? '<div class="sgs-trust-bar__track">' . $items_html . '</div>'
	: $items_html;

// --- Scoped typography <style> ------------------------------------------------
// Label selector covers both variants:
// .sgs-trust-bar__label      → icon-circle variant
// .sgs-trust-bar__badge-label → text-only + image-badge variants
// $uid_scope already declared above (color/border scoped-emit block).
$label_sel = $uid_scope . ' .sgs-trust-bar__label,' . $uid_scope . ' .sgs-trust-bar__badge-label';
$title_sel = $uid_scope . ' .sgs-trust-bar__title';
$typo_css  = sgs_typography_css_rule( $attributes, 'label', $label_sel );
$typo_css .= sgs_typography_css_rule( $attributes, 'title', $title_sel );
// No-inline contract: combine the color/border scoped rules ($tb_extra_scoped_css,
// built above — includes title/label colour), typography, and the per-item
// image-badge object-fit overrides ($tb_per_item_css) into ONE <style> tag.
$all_scoped_css = $tb_extra_scoped_css . $typo_css . $tb_per_item_css;
$style_block    = $all_scoped_css ? '<style>' . wp_strip_all_tags( $all_scoped_css ) . '</style>' : '';

// WS-4: outer wrapper via the shared helper; trust-bar keeps its interior.
// $style_block — built entirely from wp_style_engine_get_styles() +
// sgs_typography_css_rule() + sanitised colour/keyword/length values, then
// wp_strip_all_tags()'d (§D) — no raw user data.
// $title_html  — built with wp_kses_post + esc_attr.
// $badges_html — all user content escaped via esc_html/esc_url/esc_attr/sgs_get_lucide_icon.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
echo $style_block . SGS_Container_Wrapper::render( $attributes, $block, $title_html . $badges_html, SGS_Container_Wrapper::resolve_kind( $block, 'section' ), $tb_wrapper_opts );
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
