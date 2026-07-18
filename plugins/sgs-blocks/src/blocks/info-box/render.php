<?php
/**
 * Server-side render for the SGS Info Box block.
 *
 * FR-22-6 migration: renders the wrapper shell (card-style / hover / media-position
 * driven classes + CSS custom property vars for hover colours, scale, shadow) and
 * echoes $content (InnerBlocks) for all card content — icon/media, heading,
 * subtitle, text body, and button.
 *
 * NO-INLINE, BLOCK-PRIVATE, NO-SGS-CONTAINER-WRAPPER (LOCKED per-block no-inline
 * migration contract §A/§B/§B3, 2026-07-10; matches the D294 content-KIND
 * composite pattern proven on sgs/quote): sgs/info-box is CONTENT-kind (box +
 * width only) — it never used the shared wrapper's grid/section/background/
 * overlay/SVG/shape machinery (its own card background/border/shadow ride on
 * the static `sgs-info-box--{cardStyle}` BEM classes in style.css, and its
 * content is InnerBlocks-only), so `SGS_Container_Wrapper::render()` was
 * dropped. The block's OWN root `<div>` is built directly via
 * `get_block_wrapper_attributes()`; ALL styling support declarations
 * (color/typography/spacing/__experimentalBorder/shadow) now carry
 * `__experimentalSkipSerialization: true` and are emitted into the block's OWN
 * scoped `.{uid}` <style> tag via `wp_style_engine_get_styles()` (the exact
 * wholesale-passthrough pattern already proven on sgs/container's no-inline
 * residual + sgs/process-steps + sgs/timeline) — nothing lands in the rendered
 * root's `style="…"` attribute except `--var:value` custom-property VALUES
 * (hover colours + transition timing, contract §A allows these).
 *
 * BOX-GROUP (contract §B): base padding/margin = WP-native style.spacing.*
 * objects (skip-serialised, emitted scoped); tiers = paddingTablet/
 * paddingMobile/marginTablet/marginMobile object attrs (scoped @media
 * 1023/767). Border radius/width/colour/style stay WP-native
 * `style.border.*` (skip-serialised, wholesale-passed to the style engine —
 * matches sgs/container's no-inline residual; this block never had a
 * per-side custom-attr border model). contentWidth/maxWidth are kept-scalar
 * single-value families (contract §C), base only — matches the pre-existing
 * contract (no tablet/mobile tiers were ever declared for this block).
 *
 * Scalar CONTENT attributes (heading, subtitle, description, icon, mediaType,
 * image, boxMedia, mediaEmoji) are no longer read here. They are retained in
 * block.json for deprecated.js back-compat only. Rendering from those scalars
 * was removed in the FR-22-6 migration. R-22-14: NO legacy fallback hack.
 *
 * Scalar STYLING/LAYOUT attributes consumed here (wrapper-level only):
 *   cardStyle, effectHover, iconPosition, backgroundColourHover, textColourHover,
 *   borderColourHover, scaleHover, shadowHover, grayscaleHover,
 *   transitionDuration, transitionEasing, blockLink, blockLinkTarget,
 *   sgsAnimation, sgsAnimationDuration, sgsAnimationEasing, staggerDelay.
 *
 * @since 2026-05-05  FR-22-6 migration — InnerBlocks content model.
 * @since 2026-06-08  HC2 cleanup — dead per-element responsive data-attrs removed.
 * @since 2026-07-10  100% no-inline + box-group migration (D297 rollout):
 *                    dropped SGS_Container_Wrapper (content-KIND, block-private,
 *                    matches sgs/quote D294); all styling supports skip-serialised;
 *                    padding/margin tiers → object attrs; border/colour/typography/
 *                    shadow → scoped <style> via wp_style_engine_get_styles.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    InnerBlocks HTML (all card content).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Box-object interface contract §1 + security §D sanitisers (mirrors
// sgs/quote + sgs/process-steps + sgs/container).
// ---------------------------------------------------------------------------

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// ---------------------------------------------------------------------------
// 2. Extract LAYOUT/STYLING scalar attributes with defaults.
// ---------------------------------------------------------------------------
$sgs_card_style     = isset( $attributes['cardStyle'] ) ? $attributes['cardStyle'] : 'elevated';
$sgs_hover_effect   = isset( $attributes['effectHover'] ) ? $attributes['effectHover'] : 'lift';
$sgs_icon_position  = isset( $attributes['iconPosition'] ) ? $attributes['iconPosition'] : 'top';
$sgs_hover_bg       = isset( $attributes['backgroundColourHover'] ) ? $attributes['backgroundColourHover'] : '';
$sgs_hover_text     = isset( $attributes['textColourHover'] ) ? $attributes['textColourHover'] : '';
$sgs_hover_border   = isset( $attributes['borderColourHover'] ) ? $attributes['borderColourHover'] : '';
$sgs_hover_scale    = isset( $attributes['scaleHover'] ) ? $attributes['scaleHover'] : '';
$sgs_hover_shadow   = isset( $attributes['shadowHover'] ) ? $attributes['shadowHover'] : '';
$sgs_hover_gray     = isset( $attributes['grayscaleHover'] ) ? (bool) $attributes['grayscaleHover'] : false;
$sgs_block_link     = isset( $attributes['blockLink'] ) ? $attributes['blockLink'] : '';
$sgs_block_link_tgt = isset( $attributes['blockLinkTarget'] ) ? (bool) $attributes['blockLinkTarget'] : false;

// Width — SGS custom scalars (kept-scalar single-value families, contract §C).
// Base only — this block never declared maxWidthTablet/contentWidthTablet.
$sgs_content_width = isset( $attributes['contentWidth'] ) ? $attributes['contentWidth'] : '';
$sgs_max_width     = isset( $attributes['maxWidth'] ) ? $attributes['maxWidth'] : '';

// ---------------------------------------------------------------------------
// 3. Base padding/margin — WP-native style.spacing.* objects (skip-serialised
// in block.json → NOT auto-inlined); tiers — SGS object attrs.
// ---------------------------------------------------------------------------

$base_padding_obj = array();
if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
	foreach ( $attributes['style']['spacing']['padding'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_padding_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_margin_obj[ $spacing_side ] = $spacing_value;
		}
	}
}

$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// ---------------------------------------------------------------------------
// 4. WP `color` / `typography` / `border` / `shadow` support values
// (skip-serialised in block.json → NOT auto-inlined). Passed WHOLESALE to the
// style engine below — the engine safely ignores any sub-key it doesn't
// recognise + resolves preset "var:preset|…" references itself. Mirrors
// sgs/container's no-inline residual (proven D292) + sgs/process-steps.
// ---------------------------------------------------------------------------

$style_group      = is_array( $attributes['style'] ?? null ) ? $attributes['style'] : array();
$style_color_args = ! empty( $style_group['color'] ) && is_array( $style_group['color'] ) ? $style_group['color'] : array();
$style_border_args = ! empty( $style_group['border'] ) && is_array( $style_group['border'] ) ? $style_group['border'] : array();
$style_typography_args = ! empty( $style_group['typography'] ) && is_array( $style_group['typography'] ) ? $style_group['typography'] : array();
$style_shadow      = isset( $style_group['shadow'] ) ? (string) $style_group['shadow'] : '';

// Link colour (Elements API — supports.color.link:true stores it here, NOT
// under style.color). Resolved via a second scoped style-engine call below
// (reuses the engine's own preset-var resolution, matches WP core's own
// link-colour serialisation mechanism).
$style_link_colour = isset( $style_group['elements']['link']['color']['text'] )
	? (string) $style_group['elements']['link']['color']['text']
	: '';

// Preset colour/gradient/font-size slugs — skip-serialisation drops WP's
// automatic has-* classes, so re-add them manually (mirrors sgs/container).
$preset_text_slug     = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug       = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
$preset_gradient_slug = isset( $attributes['gradient'] ) ? sanitize_html_class( $attributes['gradient'] ) : '';
$preset_fontsize_slug = isset( $attributes['fontSize'] ) ? sanitize_html_class( $attributes['fontSize'] ) : '';

// ---------------------------------------------------------------------------
// 5. Wrapper CSS custom-property VALUES (hover colours + transition timing).
// A `--var: value` is a value, not a declaration (contract §A) — stays inline.
// ---------------------------------------------------------------------------
$sgs_wrapper_styles = array();
$sgs_wrapper_styles = array_merge( $sgs_wrapper_styles, sgs_transition_vars( $attributes ) );

// Hover colours emit as a scoped `.{uid}.sgs-info-box:hover{…}` rule (assembled
// in §9 below), NOT as inline `--sgs-hover-*` VALUES. An inline `--var` (a) leaves
// a `style` attribute on the root and (b) breaks the former
// `[style*="--sgs-hover-*"]` presence-selector gate the moment the value moves
// scoped (Spec 32 FR-32-4 as amended 2026-07-18 / D345; footprint GOTCHA F). A
// per-instance `:hover` rule (specificity 0,3,0) beats the variant base (0,2,0)
// and applies ONLY when the operator set a hover colour — variant-safe, so no
// resting-value fallback is needed for the per-variant background.
$sgs_hover_decls = array();
if ( $sgs_hover_bg ) {
	$sgs_hover_decls[] = 'background-color:' . sgs_colour_value( $sgs_hover_bg );
}
if ( $sgs_hover_text ) {
	$sgs_hover_decls[] = 'color:' . sgs_colour_value( $sgs_hover_text );
}
if ( $sgs_hover_border ) {
	$sgs_hover_decls[] = 'border-color:' . sgs_colour_value( $sgs_hover_border );
}

$sgs_allowed_scales  = array( '1.02', '1.05', '1.1' );
$sgs_allowed_shadows = array( 'sm', 'md', 'lg', 'glow' );

// ---------------------------------------------------------------------------
// 6. uid + root selector. uid is a CLASS (contract §B3 — this block declares
// `supports.anchor`, so the root `id` must stay free for the anchor).
// ---------------------------------------------------------------------------

$anchor   = $attributes['anchor'] ?? '';
$uid      = 'sgs-info-box-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.sgs-info-box';

// ---------------------------------------------------------------------------
// 7. Wrapper classes (parity with the pre-existing BEM scheme).
// ---------------------------------------------------------------------------
$sgs_classes = array(
	'wp-block-sgs-info-box',
	'sgs-info-box',
	$uid,
	'sgs-info-box--' . esc_attr( $sgs_card_style ),
	'sgs-info-box--hover-' . esc_attr( $sgs_hover_effect ),
	'sgs-info-box--media-' . esc_attr( $sgs_icon_position ),
);

if ( $sgs_hover_scale && in_array( $sgs_hover_scale, $sgs_allowed_scales, true ) ) {
	$sgs_wrapper_styles[] = '--sgs-hover-scale:' . esc_attr( $sgs_hover_scale );
	$sgs_classes[]        = 'sgs-has-hover-scale';
}
if ( $sgs_hover_shadow && in_array( $sgs_hover_shadow, $sgs_allowed_shadows, true ) ) {
	$sgs_wrapper_styles[] = '--sgs-hover-shadow:var(--wp--preset--shadow--' . esc_attr( $sgs_hover_shadow ) . ')';
	$sgs_classes[]        = 'sgs-has-hover';
}
if ( $sgs_hover_gray ) {
	$sgs_classes[] = 'sgs-has-grayscale';
}

if ( '' !== $preset_text_slug ) {
	$sgs_classes[] = 'has-text-color';
	$sgs_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$sgs_classes[] = 'has-background';
	$sgs_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}
if ( '' !== $preset_gradient_slug ) {
	$sgs_classes[] = 'has-background';
	$sgs_classes[] = 'has-' . $preset_gradient_slug . '-gradient-background';
}
if ( '' !== $preset_fontsize_slug ) {
	$sgs_classes[] = 'has-' . $preset_fontsize_slug . '-font-size';
}

// ---------------------------------------------------------------------------
// 8. Scoped CSS assembly — box/border/colour/typography/shadow/width +
// responsive tiers. Nothing here lands inline (contract §A).
// ---------------------------------------------------------------------------

$scoped_css = array();

// --- Base spacing (padding/margin), colour, border (incl. radius/width/
// style), typography, shadow — skip-serialised, emitted scoped via the
// stable core style engine (exactly how WP core outputs these supports). ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$base_style_engine_args = array();

	$base_spacing = array();
	if ( ! empty( $base_padding_obj ) ) {
		$base_spacing['padding'] = $base_padding_obj;
	}
	if ( ! empty( $base_margin_obj ) ) {
		$base_spacing['margin'] = $base_margin_obj;
	}
	if ( ! empty( $base_spacing ) ) {
		$base_style_engine_args['spacing'] = $base_spacing;
	}

	if ( ! empty( $style_color_args ) ) {
		$base_style_engine_args['color'] = $style_color_args;
	}

	if ( ! empty( $style_border_args ) ) {
		$base_style_engine_args['border'] = $style_border_args;
	}

	if ( ! empty( $style_typography_args ) ) {
		$base_style_engine_args['typography'] = $style_typography_args;
	}

	if ( '' !== $style_shadow ) {
		$base_style_engine_args['shadow'] = $style_shadow;
	}

	if ( ! empty( $base_style_engine_args ) ) {
		$base_scoped_styles = wp_style_engine_get_styles(
			$base_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $base_scoped_styles['css'] ) ) {
			$scoped_css[] = $base_scoped_styles['css'];
		}
	}

	// Link colour (Elements API) — scoped to descendant links, reuses the
	// engine's own 'color' compiler (resolves preset var refs identically).
	if ( '' !== $style_link_colour ) {
		$link_sel     = $root_sel . ' a:where(:not(.wp-element-button))';
		$link_styles  = wp_style_engine_get_styles(
			array( 'color' => array( 'text' => $style_link_colour ) ),
			array( 'selector' => $link_sel )
		);
		if ( ! empty( $link_styles['css'] ) ) {
			$scoped_css[] = $link_styles['css'];
		}
	}
}

// --- Width (kept-scalar, base only) ---
if ( $sgs_content_width ) {
	$cw_safe = $sgs_css_length( $sgs_content_width );
	if ( '' !== $cw_safe ) {
		$scoped_css[] = "{$root_sel}{width:{$cw_safe};}";
	}
}
if ( $sgs_max_width ) {
	$mw_safe = $sgs_css_length( $sgs_max_width );
	if ( '' !== $mw_safe ) {
		$scoped_css[] = "{$root_sel}{max-width:{$mw_safe};margin-inline:auto;}";
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME root selector (contract §B/§B2: tablet
// max-width:1023px, mobile max-width:767px). ---
$sgs_box_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$top    = $sgs_css_length( $box['top'] ?? '' );
	$right  = $sgs_css_length( $box['right'] ?? '' );
	$bottom = $sgs_css_length( $box['bottom'] ?? '' );
	$left   = $sgs_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );
$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );

$tablet_box_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_box_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_box_decls[] = "margin:{$margin_tab_val}";
}
if ( $tablet_box_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_box_decls ) . ';}}';
}

$mobile_box_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_box_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_box_decls[] = "margin:{$margin_mob_val}";
}
if ( $mobile_box_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_box_decls ) . ';}}';
}

// ---------------------------------------------------------------------------
// 9. Build the root element's classes + attributes. NO 'style' key carries a
// real CSS property — only `--var:value` custom-property VALUES (contract §A).
// ---------------------------------------------------------------------------

// Per-instance custom-property VALUES (transition timing, hover scale/shadow)
// → a scoped `.{uid}.sgs-info-box{…}` rule in the block's <style> (consolidated
// by the SGS CSS registry), NOT an inline `style="--var:…"` attribute. Spec 32
// FR-32-4 (as amended D345): nothing renders inline. Values pre-sanitised at
// source (sgs_colour_value / esc_attr / allowlists); the scoped channel is
// wp_strip_all_tags-guarded, not safecss-filtered.
if ( $sgs_wrapper_styles ) {
	$scoped_css[] = $root_sel . '{' . implode( ';', $sgs_wrapper_styles ) . '}';
}
if ( $sgs_hover_decls ) {
	$scoped_css[] = $root_sel . ':hover{' . implode( ';', $sgs_hover_decls ) . '}';
}

$root_attr_args = array(
	'class' => implode( ' ', $sgs_classes ),
);
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}

$sgs_wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $content is WP core InnerBlocks output.
$sgs_card_html = '';
if ( $scoped_css ) {
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D — matches SGS_Container_Wrapper
	// + sgs/quote + sgs/process-steps). Every value reaching $scoped_css is
	// pre-sanitised ($sgs_css_length / allowlists / wp_style_engine_get_styles /
	// sgs_colour_value), so no un-sanitised value survives to here.
	$sgs_card_html .= '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';
}
$sgs_card_html .= '<div ' . $sgs_wrapper_attrs . '>' . $content . '</div>';

// ---------------------------------------------------------------------------
// 10. Render. WS-4: CONTENT kind — width/spacing layers only (no bg/overlay/
// grid — the card's own background/border/shadow ride on the static
// sgs-info-box--{cardStyle} BEM classes in style.css). The block-link
// wrapper, if present, wraps the full card output so the anchor encloses the
// block wrapper (including the WP anchor attr).
// ---------------------------------------------------------------------------

if ( $sgs_block_link ) {
	$sgs_block_target = $sgs_block_link_tgt ? ' target="_blank" rel="noopener noreferrer"' : '';
	// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $sgs_block_target is a hardcoded safe string; $sgs_card_html is built entirely from pre-sanitised/escaped parts above.
	echo '<a href="' . esc_url( $sgs_block_link ) . '" class="sgs-block-link-wrapper"' . $sgs_block_target . '>'
		. $sgs_card_html
		. '</a>';
	// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
} else {
	echo $sgs_card_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built entirely from pre-sanitised/escaped parts above.
}
