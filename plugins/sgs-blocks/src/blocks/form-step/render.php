<?php
/**
 * Server-side render for the SGS Form Step block.
 *
 * WS-4 composite-mirror: CONTENT kind — width/spacing layers only via
 * SGS_Container_Wrapper::render(). The step wrapper carries:
 *   - .sgs-form-step class (queried by the parent sgs/form view.js to
 *     enumerate steps and drive the multi-step progress bar)
 *   - data-step-label  (step title in the progress bar)
 *   - aria-label       (screen-reader description of the step)
 *
 * All three are carried via extra_attrs so the parent form's Interactivity
 * API store can find and show/hide steps by class query.
 *
 * R-31-14: explicit discriminators, never empty($content).
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
 * --check. The wrapper handles base padding scoped internally; color/border
 * are block-private here (mirrors sgs/container's render.php pattern
 * exactly) — the values are extracted from $attributes['style'], emitted
 * into a scoped `<style>` keyed to a content-hash uid CLASS, and the uid +
 * re-added preset has-* classes ride into the wrapper via the existing
 * `extra_classes` opt.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$label = $attributes['label'] ?? __( 'Step', 'sgs-blocks' );

// CSS-keyword sanitiser — letters + hyphen only (border-style).
// ---------------------------------------------------------------------------
// Block-private scoped color/border supports (no-inline contract §A) — mirrors
// sgs/container's render.php pattern.
// ---------------------------------------------------------------------------
$sgs_fs_style_group = is_array( $attributes['style'] ?? null ) ? $attributes['style'] : array();

$sgs_fs_supports_css     = '';
$sgs_fs_supports_classes = array( 'sgs-form-step' );

$sgs_fs_style_engine_input = array();

// SGS flat colour attrs (D635 pattern — native color.text/color.background
// supports are off; the SgsColourPanel writes here instead). Background
// (colour + gradient, resting + hover) is owned by the shared fill emitter
// below, NOT by the style engine and NOT by supports.color.gradients.
if ( ! empty( $sgs_fs_style_group['border'] ) && is_array( $sgs_fs_style_group['border'] ) ) {
	$sgs_fs_border_raw = $sgs_fs_style_group['border'];
	$sgs_fs_border     = array();
	if ( isset( $sgs_fs_border_raw['color'] ) && '' !== $sgs_fs_border_raw['color'] ) {
		$sgs_fs_border['color'] = (string) $sgs_fs_border_raw['color'];
	}
	// G5 (Bean, 2026-08-26): 'style set, no width' means no border by
	// default — never fall through to the browser's initial medium (~3px)
	// border-width.
	if ( isset( $sgs_fs_border_raw['style'] ) && '' !== $sgs_fs_border_raw['style'] && isset( $sgs_fs_border_raw['width'] ) && '' !== $sgs_fs_border_raw['width'] ) {
		$sgs_fs_border['style'] = sgs_css_keyword_sanitise( $sgs_fs_border_raw['style'] );
	}
	if ( isset( $sgs_fs_border_raw['width'] ) && '' !== $sgs_fs_border_raw['width'] ) {
		$sgs_fs_border['width'] = $sgs_fs_border_raw['width'];
	}
	if ( isset( $sgs_fs_border_raw['radius'] ) && '' !== $sgs_fs_border_raw['radius'] ) {
		$sgs_fs_border['radius'] = $sgs_fs_border_raw['radius'];
	}
	if ( ! empty( $sgs_fs_border ) ) {
		$sgs_fs_style_engine_input['border'] = $sgs_fs_border;
	}
}

// uid/selector are computed UNCONDITIONALLY — the fill emitter below needs a
// scoped selector regardless of whether the style-engine branch has anything
// to emit (background is no longer part of $sgs_fs_style_engine_input).
//
// The uid class itself is pushed onto $sgs_fs_supports_classes HERE,
// unconditionally, mirroring sgs/counter's `$wrapper_classes = array(
// 'sgs-counter', $uid )` — the reference pattern for this migration wave.
// Before this fix it was only pushed inside the colour/fill branches below,
// and this block's wrapper is rendered via SGS_Container_Wrapper::render()
// BEFORE the border section even runs (further down this file) — so a
// border-only instance (no text/background colour set) rendered a scoped
// <style> rule targeting `.{uid}.sgs-form-step` on a DOM element that never
// carried the uid class at all, regardless of ordering. Root-caused live via
// check-border-roundtrip.js (2026-08-30): observed 0px none where 4px solid
// was expected.
$sgs_fs_uid                = 'sgs-fs-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sgs_fs_sel                = '.' . $sgs_fs_uid . '.sgs-form-step';
$sgs_fs_supports_classes[] = $sgs_fs_uid;

if ( ! empty( $sgs_fs_style_engine_input ) ) {
	$sgs_fs_engine_styles = wp_style_engine_get_styles(
		$sgs_fs_style_engine_input,
		array( 'selector' => $sgs_fs_sel )
	);
	if ( ! empty( $sgs_fs_engine_styles['css'] ) ) {
		$sgs_fs_supports_css       = $sgs_fs_engine_styles['css'];
		$sgs_fs_supports_classes[] = $sgs_fs_uid;
	}
}

// Text colour — gradient-capable paint path (D636 gap-closure, sibling
// attribute shape, matches sgs/counter's labelColour/labelColourGradient).
// Emitted as its own scoped rule rather than via wp_style_engine_get_styles'
// color.text (which would write an invalid `color:` declaration for a
// gradient string) — sgs_text_colour_decl() picks flat colour vs
// background-clip:text automatically, and the fallback rule is mandatory
// alongside it (self-no-ops on a flat colour).
$sgs_fs_text_colour           = isset( $attributes['textColour'] ) ? (string) $attributes['textColour'] : '';
$sgs_fs_text_colour_gradient  = isset( $attributes['textColourGradient'] ) ? (string) $attributes['textColourGradient'] : '';
$sgs_fs_text_colour_effective = sgs_resolve_text_colour_or_gradient( $sgs_fs_text_colour, $sgs_fs_text_colour_gradient );
if ( '' !== $sgs_fs_text_colour_effective ) {
	$sgs_fs_text_colour_decl = sgs_text_colour_decl( $sgs_fs_text_colour_effective );
	if ( '' !== $sgs_fs_text_colour_decl ) {
		$sgs_fs_supports_css .= "{$sgs_fs_sel}{{$sgs_fs_text_colour_decl};}";
	}
	$sgs_fs_supports_css .= sgs_text_colour_gradient_fallback_rule( $sgs_fs_sel, $sgs_fs_text_colour_effective );
	if ( ! in_array( $sgs_fs_uid, $sgs_fs_supports_classes, true ) ) {
		$sgs_fs_supports_classes[] = $sgs_fs_uid;
	}
}

// Background (colour + gradient, resting + hover) is owned by the shared fill
// emitter, NOT by the style engine and NOT by supports.color.gradients.
//
// supports.color.gradients was `true` here, so CORE rendered its own gradient
// panel in the Styles tab, competing with the SGS colour panel — the client saw
// two and could not tell which won. Switching the flag off alone would have
// REMOVED the only gradient control this block had, because the sole gradient
// read was $sgs_fs_style_group['color']['gradient'] (core's own storage). The
// flag flip is therefore PAIRED with a block-private backgroundColourGradient
// exposed through fillRow(), so capability is moved rather than lost.
$sgs_fs_fill_css = sgs_fill_states_css(
	$sgs_fs_sel,
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
if ( '' !== $sgs_fs_fill_css ) {
	$sgs_fs_supports_css .= $sgs_fs_fill_css;
	if ( ! in_array( $sgs_fs_uid, $sgs_fs_supports_classes, true ) ) {
		$sgs_fs_supports_classes[] = $sgs_fs_uid;
	}
}

$sgs_fs_preset_text = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$sgs_fs_preset_bg   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $sgs_fs_preset_text ) {
	$sgs_fs_supports_classes[] = 'has-text-color';
	$sgs_fs_supports_classes[] = 'has-' . $sgs_fs_preset_text . '-color';
}
if ( '' !== $sgs_fs_preset_bg ) {
	$sgs_fs_supports_classes[] = 'has-background';
	$sgs_fs_supports_classes[] = 'has-' . $sgs_fs_preset_bg . '-background-color';
}

$sgs_fs_output = SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'content',
	array(
		'tag'           => 'div',
		'extra_classes' => $sgs_fs_supports_classes,
		'extra_attrs'   => array(
			'data-step-label' => esc_attr( $label ),
			'aria-label'      => esc_attr( $label ),
		),
	)
);


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
		$bwt = '' !== $border_width_top ? $border_width_top : '0';
		$bwr = '' !== $border_width_right ? $border_width_right : '0';
		$bwb = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl = '' !== $border_width_left ? $border_width_left : '0';
		$sgs_fs_supports_css .= $sgs_fs_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$sgs_fs_supports_css .= sgs_border_gradient_css( $sgs_fs_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$sgs_fs_supports_css .= $sgs_fs_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$sgs_fs_supports_css .= $sgs_fs_sel . '{border-style:none;border-width:0;}';
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
		array( 'selector' => $sgs_fs_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$sgs_fs_supports_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $sgs_fs_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$sgs_fs_supports_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $sgs_fs_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$sgs_fs_supports_css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

if ( '' !== $sgs_fs_supports_css ) {
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators intact — $sgs_fs_supports_css is entirely style-engine-
	// generated, so nothing un-sanitised survives here.
	$sgs_fs_output = '<style>' . wp_strip_all_tags( $sgs_fs_supports_css ) . '</style>' . $sgs_fs_output;
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() output is pre-sanitised; the prepended <style> is pre-sanitised above.
echo $sgs_fs_output;
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
