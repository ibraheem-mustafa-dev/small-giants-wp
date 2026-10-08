<?php
/**
 * Server-side render for the SGS Form Step block.
 *
 * WS-4 composite wrapper: CONTENT kind — width/spacing layers only via
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
$sgs_fs_supports_css     = '';
$sgs_fs_supports_classes = array( 'sgs-form-step' );

// SGS flat colour attrs (D635 pattern — native color.text/color.background
// supports are off; the SgsColourPanel writes here instead). Background
// (colour + gradient, resting + hover) is owned by the shared fill emitter
// below, NOT by the style engine and NOT by supports.color.gradients.
// uid/selector are computed unconditionally — the emitters below always need
// a scoped selector.
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

// textColour hover state (2026-09-07, colour-conformance bg-layer batch).
// $sgs_fs_sel ALSO paints a background via sgs_fill_states_css() below
// (backgroundColour/backgroundColourHover on the SAME selector), so a hover
// text-GRADIENT's background-clip:text would clip/overwrite that background.
// Only intervene when the resolved hover value is actually a gradient
// (mirrors the brand-strip itemTextColourHover fix, c785a3b7a): neutralise
// the on-element hover background and repaint the identical resolved hover
// background on its own ::after layer instead. The flat-colour case (the
// common one) emits nothing extra and relies on the fill emitter below
// exactly as before.
$sgs_fs_text_colour_hover           = isset( $attributes['textColourHover'] ) ? (string) $attributes['textColourHover'] : '';
$sgs_fs_text_colour_hover_gradient  = isset( $attributes['textColourHoverGradient'] ) ? (string) $attributes['textColourHoverGradient'] : '';
$sgs_fs_text_colour_hover_effective = sgs_resolve_text_colour_or_gradient( $sgs_fs_text_colour_hover, $sgs_fs_text_colour_hover_gradient );
if ( '' !== $sgs_fs_text_colour_hover_effective ) {
	$sgs_fs_text_colour_hover_decl = sgs_text_colour_decl( $sgs_fs_text_colour_hover_effective );
	if ( '' !== $sgs_fs_text_colour_hover_decl ) {
		if ( str_contains( $sgs_fs_text_colour_hover_effective, 'gradient(' ) ) {
			$sgs_fs_bg_hover_paint = sgs_background_paint_decl(
				isset( $attributes['backgroundColourHover'] ) ? (string) $attributes['backgroundColourHover'] : '',
				isset( $attributes['backgroundColourHoverGradient'] ) ? (string) $attributes['backgroundColourHoverGradient'] : ''
			);
			if ( '' !== $sgs_fs_bg_hover_paint ) {
				$sgs_fs_supports_css .= sgs_hover_state_rules( $sgs_fs_sel, 'position:relative;isolation:isolate;background-image:none;background-color:transparent;' );
				$sgs_fs_supports_css .= sgs_hover_state_rules( $sgs_fs_sel, 'content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;' . $sgs_fs_bg_hover_paint . ';', ':focus-visible', '::after' );
			}
		}
		$sgs_fs_supports_css .= sgs_hover_state_rules( $sgs_fs_sel, $sgs_fs_text_colour_hover_decl );
	}
	$sgs_fs_supports_css .= sgs_text_colour_gradient_fallback_rule( $sgs_fs_sel . ':hover', $sgs_fs_text_colour_hover_effective );
	if ( ! in_array( $sgs_fs_uid, $sgs_fs_supports_classes, true ) ) {
		$sgs_fs_supports_classes[] = $sgs_fs_uid;
	}
}

// Background (colour + gradient, resting + hover) is owned by the shared fill
// emitter, NOT by the style engine and NOT by supports.color.gradients.
//
// The gradient control is the block-private backgroundColourGradient exposed
// through fillRow().
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


// ── Border (width, style, colour, gradient ring, none override, radius at
// three tiers) through the shared assembler. The base rule prints before the
// tier rules so a tablet or mobile radius (same specificity) wins in its query.
$border = sgs_border_element_decls(
	$attributes,
	'',
	$sgs_fs_sel,
	array(
		'colour' => array(
			'base'     => 'borderColour',
			'gradient' => 'borderColourGradient',
		),
	)
);
if ( $border['base'] ) {
	$sgs_fs_supports_css .= $sgs_fs_sel . '{' . implode( ';', $border['base'] ) . ';}';
}
if ( $border['tablet'] ) {
	$sgs_fs_supports_css .= '@media(max-width:1023px){' . $sgs_fs_sel . '{' . implode( ';', $border['tablet'] ) . ';}}';
}
if ( $border['mobile'] ) {
	$sgs_fs_supports_css .= '@media(max-width:767px){' . $sgs_fs_sel . '{' . implode( ';', $border['mobile'] ) . ';}}';
}
$sgs_fs_supports_css .= implode( '', $border['rules'] );

if ( '' !== $sgs_fs_supports_css ) {
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators intact — $sgs_fs_supports_css is entirely style-engine-
	// generated, so nothing un-sanitised survives here.
	$sgs_fs_output = '<style>' . wp_strip_all_tags( $sgs_fs_supports_css ) . '</style>' . $sgs_fs_output;
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() output is pre-sanitised; the prepended <style> is pre-sanitised above.
echo $sgs_fs_output;
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
