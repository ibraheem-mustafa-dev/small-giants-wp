<?php
/**
 * sgs/card-grid render partial: native block-supports CSS.
 *
 * Builds $card_grid_native_css from $attributes['style'] (colour, shadow,
 * typography, text-align) plus the page-button typography rule, scoped to
 * $root_sel. Required by render.php once per instance; reads $attributes,
 * $block and $root_sel, writes $card_grid_native_css.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
// --check. Values are read from $attributes['style'] and emitted into THIS
// block's OWN scoped <style> (composite caveat — do NOT pass these as
// wrapper `extra_styles`, that path inlines). Base spacing (padding/margin)
// is a separate mechanism the wrapper already handles scoped internally —
// not duplicated here.
$card_grid_native_css = '';

$cg_style_engine_args = array();

$cg_color_args = array();
if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
	$cg_color_args['text'] = (string) $attributes['style']['color']['text'];
}
if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
	$cg_color_args['background'] = (string) $attributes['style']['color']['background'];
}
if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
	$cg_color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
}
if ( ! empty( $cg_color_args ) ) {
	$cg_style_engine_args['color'] = $cg_color_args;
}

$cg_border_args = array();
// G5 (Bean, 2026-08-26): 'style set, no width' means no border by
// default — never fall through to the browser's initial medium (~3px)
// border-width. Gated together via the shared helper (helpers-box.php)
// so this rule is applied identically everywhere, not per block.

if ( isset( $attributes['style']['shadow'] ) && '' !== $attributes['style']['shadow'] ) {
	$cg_style_engine_args['shadow'] = (string) $attributes['style']['shadow'];
}

if ( ! empty( $cg_style_engine_args ) ) {
	$cg_scoped_styles = wp_style_engine_get_styles(
		$cg_style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $cg_scoped_styles['css'] ) ) {
		$cg_native_css_out = $cg_scoped_styles['css'];
		// D5: the native supports.shadow value renders as box-shadow, which forced
		// colours (Windows High Contrast) removes entirely. Append the shared
		// CanvasText outline fallback to this SAME scoped rule, mirroring how
		// sgs_shadow_box_decls() joins it for the framework's own composed shadows.
		if ( isset( $cg_style_engine_args['shadow'] ) && 'none' !== $cg_style_engine_args['shadow'] && str_ends_with( $cg_native_css_out, '}' ) ) {
			$cg_native_css_out = substr( $cg_native_css_out, 0, -1 ) . sgs_shadow_forced_colours_decl() . '}';
		}
		$card_grid_native_css .= $cg_native_css_out;
	}
	// AUTOMATIC LIFT (design H4) — supports.shadow has no hover attribute of its own, so this
	// is the automatic lift ONLY (no explicit-hover branch to prefer, unlike sgs_shadow_decls()).
	if ( isset( $cg_style_engine_args['shadow'] ) && 'none' !== $cg_style_engine_args['shadow'] ) {
		$card_grid_native_css .= sgs_shadow_hover_rules(
			$root_sel,
			sgs_shadow_style_engine_shape( (string) $cg_style_engine_args['shadow'] ),
			'',
			$attributes,
			( $block instanceof \WP_Block ) ? (string) $block->name : ''
		);
	}
}

// Typography — block.json selectors.typography targets .sgs-card-grid__title,
// so scope the native typography rule there (distinct from the per-instance
// titleFontSize/subtitleFontSize custom-attr mechanism further below).
$cg_typography_args = array();
if ( isset( $attributes['style']['typography']['fontSize'] ) && '' !== $attributes['style']['typography']['fontSize'] ) {
	$cg_typography_args['fontSize'] = (string) $attributes['style']['typography']['fontSize'];
}
if ( isset( $attributes['style']['typography']['lineHeight'] ) && '' !== $attributes['style']['typography']['lineHeight'] ) {
	$cg_typography_args['lineHeight'] = (string) $attributes['style']['typography']['lineHeight'];
}
if ( isset( $attributes['style']['typography']['letterSpacing'] ) && '' !== $attributes['style']['typography']['letterSpacing'] ) {
	$cg_typography_args['letterSpacing'] = sgs_css_length_value( $attributes['style']['typography']['letterSpacing'] );
}
if ( isset( $attributes['style']['typography']['textTransform'] ) && '' !== $attributes['style']['typography']['textTransform'] ) {
	$cg_typography_args['textTransform'] = sgs_css_keyword_sanitise( $attributes['style']['typography']['textTransform'] );
}
if ( isset( $attributes['style']['typography']['fontWeight'] ) && '' !== $attributes['style']['typography']['fontWeight'] ) {
	$cg_typography_args['fontWeight'] = sgs_css_keyword_sanitise( (string) $attributes['style']['typography']['fontWeight'] );
}
if ( isset( $attributes['style']['typography']['fontStyle'] ) && '' !== $attributes['style']['typography']['fontStyle'] ) {
	$cg_typography_args['fontStyle'] = sgs_css_keyword_sanitise( $attributes['style']['typography']['fontStyle'] );
}
if ( ! empty( $cg_typography_args ) ) {
	$cg_typography_scoped = wp_style_engine_get_styles(
		array( 'typography' => $cg_typography_args ),
		array( 'selector' => $root_sel . ' .sgs-card-grid__title' )
	);
	if ( ! empty( $cg_typography_scoped['css'] ) ) {
		$card_grid_native_css .= $cg_typography_scoped['css'];
	}
}
// Pagination page buttons (built by Grid_Pagination, shared with sgs/post-grid). Only the
// cpt-collection branch paginates and it returns before the typography built further down, so
// the rule rides with the early native CSS that every branch echoes.
$card_grid_native_css .= sgs_typography_css_rule( $attributes, 'pageButton', $root_sel . ' .sgs-card-grid__page-btn' );
if ( isset( $attributes['style']['typography']['textAlign'] ) && in_array( $attributes['style']['typography']['textAlign'], array( 'left', 'center', 'right' ), true ) ) {
	$card_grid_native_css .= $root_sel . ' .sgs-card-grid__title{text-align:' . $attributes['style']['typography']['textAlign'] . '}';
	// The overlay caption is a flex column: align its items with the title, so
	// a glyph shown in the caption lines up with the title under it.
	$cg_caption_align      = array(
		'left'   => 'flex-start',
		'center' => 'center',
		'right'  => 'flex-end',
	);
	$card_grid_native_css .= $root_sel . ' .sgs-card-grid__overlay{align-items:' . $cg_caption_align[ $attributes['style']['typography']['textAlign'] ] . '}';
}
