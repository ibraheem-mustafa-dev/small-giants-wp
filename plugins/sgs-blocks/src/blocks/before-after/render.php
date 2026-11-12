<?php
/**
 * Server-side render for sgs/before-after.
 *
 * Spec 38 FR-38-13 (Wave C, DB-verified NET-NEW). A two-image comparison
 * slider with a draggable divider.
 *
 * CONTENT-KIND, BLOCK-PRIVATE, NO-INLINE (mirrors sgs/quote / sgs/button —
 * D294): box + width only, never used the shared wrapper's grid/section
 * machinery, so it owns its own scoped `<style>` output rather than calling
 * SGS_Container_Wrapper. The root `<div>` IS the block root (single
 * composite element — a comparison slider has no simpler single-tag form).
 *
 * ZERO-JS CONTRACT (non-negotiable, Wave C brief): BOTH images are always
 * present in the markup with their own alt text, and the split position is
 * rendered as a genuine CSS `clip-path` at the configured `startPosition` —
 * not a JS-only state. A visitor with JS blocked sees a real, correctly
 * positioned before/after comparison; they simply cannot drag it. JS
 * (view.js) progressively enhances the same markup: a native
 * `<input type="range">` (always rendered, always keyboard + native-touch
 * operable) drives the CSS custom property `--sgs-before-after-position`,
 * and — when `freeDrag` is on — GSAP Draggable adds free-drag directly on
 * the image area, writing back to the same range input so there is exactly
 * one source of truth.
 *
 * KEYBOARD: arrow keys on the native range input move the divider — that is
 * a browser-native behaviour of `<input type="range">`, not something this
 * block hand-rolls, and it works whether or not Draggable initialises.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Unused (no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/wp-icons.php';
require_once __DIR__ . '/media-render.php';

// ---------------------------------------------------------------------------
// 1. Resolve each side through the shared media renderer (media-render.php).
// Soft-fail: nothing to render without content on BOTH sides.
// ---------------------------------------------------------------------------

$uid = 'sgs-before-after-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );

$before_media = sgs_before_after_render_side( $attributes, 'before', $uid, sgs_before_after_slot( $block, 'before' ) );
$after_media  = sgs_before_after_render_side( $attributes, 'after', $uid, sgs_before_after_slot( $block, 'after' ) );

if ( ! $before_media['has_content'] || ! $after_media['has_content'] ) {
	return;
}

$has_video_slot = $before_media['has_video'] || $after_media['has_video'];

// Autoplay: either side's Playback setting. The shared play and pause button and the drift correction (view.js)
// then start both videos together.
$video_autoplay = ! empty( $attributes['beforePlayback']['autoplay'] ) || ! empty( $attributes['afterPlayback']['autoplay'] );

$show_labels  = ! empty( $attributes['showLabels'] ) || ! isset( $attributes['showLabels'] );
$before_label = isset( $attributes['beforeLabel'] ) ? (string) $attributes['beforeLabel'] : '';
$after_label  = isset( $attributes['afterLabel'] ) ? (string) $attributes['afterLabel'] : '';

$orientation_raw   = $attributes['orientation'] ?? 'horizontal';
$orientation       = in_array( $orientation_raw, array( 'horizontal', 'vertical' ), true ) ? $orientation_raw : 'horizontal';
$reverse_direction = ! empty( $attributes['reverseDirection'] );

$free_drag = ! empty( $attributes['freeDrag'] ) || ! isset( $attributes['freeDrag'] );

// startPosition — clamp 0-100.
$start_position = isset( $attributes['startPosition'] ) ? (float) $attributes['startPosition'] : 50;
$start_position = max( 0, min( 100, $start_position ) );

// ---------------------------------------------------------------------------
// 2. Sanitisers (mirrors sgs/quote — box-object interface contract §D).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 3. Frame (root) attributes.
// ---------------------------------------------------------------------------

// Shape+colour composed for BOTH states via sgs_shadow_decls() (Wave A1
// ShadowControl redesign) — reads boxShadow/boxShadowColour/boxShadowHover/
// boxShadowColourHover directly from $attributes; boxShadowHover added
// 2026-09-07 so hover can lift/grow/soften, not just recolour (Bean's
// full-symmetry ruling).
$box_shadow_decls = sgs_shadow_decls(
	$attributes,
	array(
		'base'         => 'boxShadow',
		'colour'       => 'boxShadowColour',
		'hover'        => 'boxShadowHover',
		'hover_colour' => 'boxShadowColourHover',
	),
	$block->name ?? ''
);

// `maxWidth` is a TIER OBJECT (Spec 35) — ONE attr holding
// {desktop,tablet,mobile}, read through the shared normaliser.
$max_width_tiers  = sgs_responsive_normalise_object( $attributes['maxWidth'] ?? null );
$max_width        = $max_width_tiers['desktop'] ?? '';
$max_width_tablet = $max_width_tiers['tablet'] ?? '';
$max_width_mobile = $max_width_tiers['mobile'] ?? '';

// `height` is a per-device object of CSS length strings ({desktop,tablet,mobile},
// unit inside each string). A stage with no desktop height is 400px tall.
$height_tiers = sgs_responsive_normalise_object( $attributes['height'] ?? null );
if ( '' === sgs_css_length_value( $height_tiers['desktop'] ?? '' ) ) {
	$height_tiers['desktop'] = '400px';
}

$divider_colour  = $attributes['dividerColour'] ?? '';
$divider_width   = isset( $attributes['dividerWidth'] ) ? max( 1, (float) $attributes['dividerWidth'] ) : 3;
$handle_colour   = $attributes['handleColour'] ?? '';
$handle_icon_col = $attributes['handleIconColour'] ?? '';

// Handle icon — resolved via the shared Lucide/wp-icon + IconPicker mechanism
// (2026-09-05 migration off the hand-rolled two-polyline SVG). All four
// IconPicker sources are supported (2026-09-08 revert — see block.json's
// handleIconSource description); sgs_icon_gradient_css() (helpers-svg-
// gradient.php) already routes the gradient per source, so the old
// "only the two inline-SVG sources" restriction was obsolete.
$allowed_handle_icon_sources = array( 'lucide', 'wp-icon', 'dashicon', 'emoji' );
$handle_icon_source          = $attributes['handleIconSource'] ?? 'lucide';
$handle_icon_source          = in_array( $handle_icon_source, $allowed_handle_icon_sources, true ) ? $handle_icon_source : 'lucide';
$handle_icon_is_text_source  = in_array( $handle_icon_source, array( 'dashicon', 'emoji' ), true );
// IconPicker stores ONE { source, name } pair for every source — the emoji
// "name" IS the emoji glyph itself (icon-data.js), matching sgs/icon's
// iconSource/iconName + emojiChar precedent — so the emoji source must NOT be
// run through the lucide/wp-icon/dashicon slug sanitiser below, which would
// strip a genuine emoji character down to an empty string.
$handle_icon_name_raw = (string) ( $attributes['handleIconName'] ?? 'chevrons-left-right' );
if ( 'emoji' === $handle_icon_source ) {
	$handle_icon_name = wp_strip_all_tags( trim( $handle_icon_name_raw ) );
} else {
	$handle_icon_name = preg_replace( '/[^a-z0-9-]/', '', strtolower( $handle_icon_name_raw ) );
}
// Enqueue Dashicons on the frontend when this source is used (same gate as
// sgs/icon's render.php).
if ( 'dashicon' === $handle_icon_source ) {
	wp_enqueue_style( 'dashicons' );
}
$handle_icon_gradient       = (string) ( $attributes['handleIconColourGradient'] ?? '' );
$handle_icon_col_hover      = (string) ( $attributes['handleIconColourHover'] ?? '' );
$handle_icon_gradient_hover = (string) ( $attributes['handleIconColourHoverGradient'] ?? '' );

$label_colour    = $attributes['labelColour'] ?? '';
$label_bg_colour = $attributes['labelBackgroundColour'] ?? '';

// Base border-radius — WP-native style.border.radius (skip-serialised).

// WP `color`/border supports (skip-serialised → NOT auto-inlined).
$style_color_bg = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_bg_slug = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// ---------------------------------------------------------------------------
// 4. Resolve scope. Uid is a CLASS (anchor stays a free `id`).
// ---------------------------------------------------------------------------

$anchor = $attributes['anchor'] ?? '';
// $uid is computed in step 1: the sides' scope classes derive from it.
$root_sel = '.' . $uid . '.wp-block-sgs-before-after';

// ---------------------------------------------------------------------------
// 5. Build scoped CSS.
// ---------------------------------------------------------------------------

$scoped_css = array();

// --- Root box/visual declarations. ---
$wrapper_decls = array();

if ( $style_color_bg ) {
	$wrapper_decls[] = 'background-color:' . sgs_colour_value( $style_color_bg );
}
// G5 (Bean, 2026-08-26): 'style set, no width' means no border by
// default — never fall through to the browser's initial medium (~3px)
// border-width.
if ( $box_shadow_decls['normal'] ) {
	$wrapper_decls = array_merge( $wrapper_decls, $box_shadow_decls['normal'] );
}
// HOVER-state shadow (shape + colour, Rule 31 2026-08-22 / D-pending 2026-09-07
// full-symmetry ruling) — sgs_shadow_decls() falls back to the resting shape
// when only a hover colour is set, so this stays correct for pre-existing
// hover-colour-only instances.
if ( $box_shadow_decls['hover'] ) {
	$scoped_css[] = sgs_hover_state_rules( $root_sel, implode( ';', $box_shadow_decls['hover'] ), ':focus-within' );
}
if ( $max_width ) {
	$mw_safe = sgs_css_length_value( $max_width );
	if ( '' !== $mw_safe ) {
		$wrapper_decls[] = 'max-width:' . $mw_safe;
		$wrapper_decls[] = 'margin-inline:auto';
	}
}

if ( $wrapper_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $wrapper_decls ) . ';}';
}

// Base border-radius + WP colour support — via the stable core style engine.

$base_style_engine_args = array();
if ( ! empty( $base_style_engine_args ) ) {
	$base_scoped_styles = wp_style_engine_get_styles( $base_style_engine_args, array( 'selector' => $root_sel ) );
	if ( ! empty( $base_scoped_styles['css'] ) ) {
		$scoped_css[] = $base_scoped_styles['css'];
	}
}

// Max-width tiers.
$mwt_safe = $max_width_tablet ? sgs_css_length_value( $max_width_tablet ) : '';
if ( '' !== $mwt_safe ) {
	$scoped_css[] = SGS_Breakpoints::media( 'tablet' ) . '{' . "{$root_sel}{max-width:{$mwt_safe};}}";
}
$mwm_safe = $max_width_mobile ? sgs_css_length_value( $max_width_mobile ) : '';
if ( '' !== $mwm_safe ) {
	$scoped_css[] = SGS_Breakpoints::media( 'mobile' ) . '{' . "{$root_sel}{max-width:{$mwm_safe};}}";
}

// Border-radius tiers (box family).

// --- Stage height (base + tiers). ---
$stage_sel    = $root_sel . ' .wp-block-sgs-before-after__stage';
$scoped_css[] = sgs_emit_responsive_css(
	$stage_sel,
	array(
		array(
			'value'        => $height_tiers,
			'css'          => 'height',
			'unit_default' => 'px',
		),
	)
);

// --- Default split position — the CSS-only, zero-JS comparison state. ---
$scoped_css[] = "{$root_sel}{--sgs-before-after-position:" . round( $start_position, 2 ) . '%;}';

// --- Divider + handle colours/width — CUSTOM-PROPERTY VALUES, not competing
// declarations (Spec 32: "Overrides = CSS custom-property VALUES, never
// inline declarations" — the same rule applies to a scoped <style> selector
// as to an inline style attribute: a selector{property:value} rule here would
// beat style.css's var()-with-fallback declaration by source order, giving
// this one property two writers. Instead we set the VALUE of the var that
// style.css already reads (with the same literal as its CSS fallback), so an
// unset attribute renders identically and a set one flows through the one
// mechanism. ---
$root_var_decls = array();

// Divider width has its own PHP-side default (3, clamped >=1 above) and is
// the thickness for BOTH orientations (style.css reads it as width on the
// horizontal rule, height on the vertical rule) — so it is always emitted,
// not gated on an override check.
$root_var_decls[] = '--sgs-before-after-divider-width:' . round( $divider_width, 2 ) . 'px';

// Divider-line hover sibling (2026-09-06, FILL closeout) — same 5-arg call
// shape as the handle-colour block below. The divider line is
// aria-hidden/pointer-events:none with no interaction of its own, so
// style.css's new hover rule triggers off the same range-hover ancestor
// chain already proven for the handle's scale transform, not a direct
// :hover on this element.
$root_var_decls = array_merge(
	$root_var_decls,
	sgs_custom_property_gradient_decls(
		'sgs-before-after-divider-colour',
		(string) $divider_colour,
		(string) ( $attributes['dividerColourGradient'] ?? '' ),
		(string) ( $attributes['dividerColourHover'] ?? '' ),
		(string) ( $attributes['dividerColourHoverGradient'] ?? '' )
	)
);
// Gradient sibling (2026-09-04): --sgs-before-after-handle-colour has no
// stable selector of its own (a draggable handle, styled purely via the
// custom property style.css already reads), so sgs_block_background_layer_css()/
// sgs_fill_states_css() don't apply. sgs_custom_property_gradient_decls()
// adds a sibling --sgs-before-after-handle-colour-gradient var; style.css's
// existing background-color:var(--sgs-before-after-handle-colour,#fff) rule
// gains ONE new sibling line, background-image:var(--...-gradient,none),
// which composites over it — an unset gradient is fully invisible, so the
// flat colour is byte-identical to before this change.
// HOVER SIBLING (2026-09-06, FILL closeout) — the handle is genuinely
// interactive (draggable; its own SVG icon already has a :hover stroke
// override), but its background colour never had one. Same 5-arg call now
// also emits -hover/-hover-gradient vars, consumed by a new
// .wp-block-sgs-before-after__handle:hover/:focus-visible rule in style.css.
$root_var_decls = array_merge(
	$root_var_decls,
	sgs_custom_property_gradient_decls(
		'sgs-before-after-handle-colour',
		(string) $handle_colour,
		(string) ( $attributes['handleColourGradient'] ?? '' ),
		(string) ( $attributes['handleColourHover'] ?? '' ),
		(string) ( $attributes['handleColourHoverGradient'] ?? '' )
	)
);
// Handle icon gradient (2026-09-05, svg-paint-gradient end-shape; extended
// 2026-09-08 to the two text-glyph sources — see block.json's
// handleIconSource description). SVG sources (lucide/wp-icon) keep the
// original custom-property mechanism: --sgs-before-after-handle-icon-colour
// feeds a `stroke:` declaration directly (style.css), and `stroke:url(#id)`
// is a valid paint value, so a gradient sets the SAME custom property to a
// `url(#id)` reference — the $selector arg sgs_icon_gradient_css() takes is
// unused by this source family, so passing '' there stays correct.
// TEXT-glyph sources (dashicon/emoji) paint via `background-clip:text`
// (sgs_text_colour_decl()), which is a multi-declaration recipe — it cannot
// be expressed as a single custom-property value, so it needs a genuine
// scoped-CSS rule on the glyph's own selector, exactly like sgs/icon's own
// dashicon/emoji handling (icon/render.php ~247-268). This is also why the
// $selector arg matters here: sgs_icon_gradient_css()'s fallback_rule is a
// COMPLETE, already-scoped `@supports not (...)` rule built from whatever
// selector is passed in — passing '' (as before this revert) would have
// emitted a broken/unscoped rule for the two sources being newly enabled.
$handle_icon_svg_selector  = "{$root_sel} .wp-block-sgs-before-after__handle svg";
$handle_icon_text_selector = 'dashicon' === $handle_icon_source
	? "{$root_sel} .wp-block-sgs-before-after__handle-dashicon"
	: "{$root_sel} .wp-block-sgs-before-after__handle-emoji";
$handle_icon_text_suffix   = 'dashicon' === $handle_icon_source
	? ' .wp-block-sgs-before-after__handle-dashicon'
	: ' .wp-block-sgs-before-after__handle-emoji';
$handle_icon_selector      = $handle_icon_is_text_source ? $handle_icon_text_selector : $handle_icon_svg_selector;

$handle_icon_grad_id  = $uid . '-handle-icon-grad';
$sgs_handle_icon_grad = sgs_icon_gradient_css( $handle_icon_source, $handle_icon_gradient, $handle_icon_grad_id, $handle_icon_selector );
if ( $handle_icon_is_text_source ) {
	if ( '' !== $sgs_handle_icon_grad['css'] ) {
		$scoped_css[] = "{$handle_icon_selector}{" . $sgs_handle_icon_grad['css'] . ';}';
		if ( '' !== $sgs_handle_icon_grad['fallback_rule'] ) {
			$scoped_css[] = $sgs_handle_icon_grad['fallback_rule'];
		}
	} elseif ( $handle_icon_col ) {
		$root_var_decls[] = '--sgs-before-after-handle-icon-colour:' . sgs_colour_value( $handle_icon_col );
	}
} elseif ( '' !== $sgs_handle_icon_grad['defs'] ) {
	$root_var_decls[] = '--sgs-before-after-handle-icon-colour:url(#' . $handle_icon_grad_id . ')';
} elseif ( $handle_icon_col ) {
	$root_var_decls[] = '--sgs-before-after-handle-icon-colour:' . sgs_colour_value( $handle_icon_col );
}

// Handle icon hover — same split. Text-source gradient hover needs the
// hover-scoped selector (matches sgs/icon's icon/render.php hover-gradient
// selector shape) so the @supports fallback rule attaches to the right
// state; the CSS declaration itself is emitted via sgs_hover_state_rules()
// (a genuine PER-INSTANCE rule — style.css has no static hover selector for
// the text-glyph elements the way it does for the SVG `stroke:` var below).
$handle_icon_hover_selector = $handle_icon_is_text_source
	? "{$root_sel} .wp-block-sgs-before-after__handle:hover{$handle_icon_text_suffix}"
	: $handle_icon_selector;
$handle_icon_grad_hover_id  = $uid . '-handle-icon-grad-hover';
$sgs_handle_icon_grad_hover = sgs_icon_gradient_css( $handle_icon_source, $handle_icon_gradient_hover, $handle_icon_grad_hover_id, $handle_icon_hover_selector );
if ( $handle_icon_is_text_source ) {
	if ( '' !== $sgs_handle_icon_grad_hover['css'] ) {
		$scoped_css[] = sgs_hover_state_rules( "{$root_sel} .wp-block-sgs-before-after__handle", $sgs_handle_icon_grad_hover['css'], ':focus-visible', $handle_icon_text_suffix );
		if ( '' !== $sgs_handle_icon_grad_hover['fallback_rule'] ) {
			$scoped_css[] = $sgs_handle_icon_grad_hover['fallback_rule'];
		}
	} elseif ( '' !== $handle_icon_col_hover ) {
		$root_var_decls[] = '--sgs-before-after-handle-icon-colour-hover:' . sgs_colour_value( $handle_icon_col_hover );
	}
} elseif ( '' !== $sgs_handle_icon_grad_hover['css'] ) {
	$root_var_decls[] = '--sgs-before-after-handle-icon-colour-hover:url(#' . $handle_icon_grad_hover_id . ')';
} elseif ( '' !== $handle_icon_col_hover ) {
	$root_var_decls[] = '--sgs-before-after-handle-icon-colour-hover:' . sgs_colour_value( $handle_icon_col_hover );
}
// Label colour — same custom-property-value rule as the divider/handle
// above; style.css reads --sgs-before-after-label-colour with the current
// literal as fallback. labelBackgroundColour moved OFF this mechanism
// 2026-09-04 (see $label_sel below) to free the element's own
// background-image for a text gradient on labelColour — see that section
// for why.
if ( $label_colour ) {
	$root_var_decls[] = '--sgs-before-after-label-colour:' . sgs_colour_value( $label_colour );
}

$scoped_css[] = "{$root_sel}{" . implode( ';', $root_var_decls ) . ';}';

// Each side's media rules (Fit, Focal) come from the shared renderer.
foreach ( array( $before_media, $after_media ) as $sgs_ba_side ) {
	if ( '' !== $sgs_ba_side['css'] ) {
		$scoped_css[] = $sgs_ba_side['css'];
	}
}

// --- Label typography (font-weight/font-style — plain declarations; these
// have no hardcoded CSS default to compete with, so they stay as direct
// overrides). labelColour stays on the custom-property mechanism above
// (style.css's own default fallback); its gradient sibling + labelBackgroundColour
// are handled below via a direct scoped rule. ---
$label_sel = $root_sel . ' .wp-block-sgs-before-after__label';

// labelColour/labelBackgroundColour SHARE this one selector — a text gradient
// needs background-clip:text on the element, which would clip the element's
// OWN background paint to the glyph shapes, so labelBackgroundColour must
// move onto its own `::after` layer first (same precondition as
// pricing-table's ctaColour/ctaBackground split). Moved OFF the old
// --sgs-before-after-label-bg-colour custom property entirely (style.css
// updated to match) so there is exactly one background mechanism, not two
// competing ones. The unset case defaults to the SAME rgba(0,0,0,0.6) the
// old custom property's own CSS fallback used, via sgs_colour_value()'s raw-
// CSS passthrough, so an instance that never touched this control renders
// byte-identical.
$label_bg_gradient = (string) ( $attributes['labelBackgroundColourGradient'] ?? '' );
$scoped_css[]      = sgs_block_background_layer_css(
	$label_sel,
	sgs_background_paint_decl( $label_bg_colour ? (string) $label_bg_colour : 'rgba(0,0,0,0.6)', $label_bg_gradient )
);
// labelColour gradient sibling — direct scoped rule, safe now that the
// background lives on the ::after layer above. The pre-existing
// --sgs-before-after-label-colour custom property (style.css) still sets
// the flat fallback; this rule wins by source order for the gradient case,
// same pattern already proven on sgs/product-card.
$label_colour_gradient  = (string) ( $attributes['labelColourGradient'] ?? '' );
$label_colour_effective = sgs_resolve_text_colour_or_gradient( (string) $label_colour, $label_colour_gradient );
if ( '' !== $label_colour_effective ) {
	$label_colour_decl = sgs_text_colour_decl( $label_colour_effective );
	if ( '' !== $label_colour_decl ) {
		$scoped_css[] = $label_sel . '{' . $label_colour_decl . ';}';
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $label_sel, $label_colour_effective );
}

// labelColour hover state — same trio, :hover/:focus-visible variant of the
// same selector (already safe for text-gradient: the background moved onto
// its own ::after layer above, unconditionally).
$label_colour_hover           = (string) ( $attributes['labelColourHover'] ?? '' );
$label_colour_hover_gradient  = (string) ( $attributes['labelColourHoverGradient'] ?? '' );
$label_colour_effective_hover = sgs_resolve_text_colour_or_gradient( $label_colour_hover, $label_colour_hover_gradient );
if ( '' !== $label_colour_effective_hover ) {
	$label_colour_hover_decl = sgs_text_colour_decl( $label_colour_effective_hover );
	if ( '' !== $label_colour_hover_decl ) {
		$scoped_css[] = sgs_hover_state_rules( $label_sel, $label_colour_hover_decl );
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $label_sel . ':hover', $label_colour_effective_hover );
}

// Label typography — delegate to shared helper which handles the full set
// of properties from TypographyControls (font-family, font-size, font-weight,
// font-style, text-decoration, text-transform, letter-spacing, text-align,
// text-wrap, text-indent, text-columns, writing-mode).
$label_typography_css = sgs_typography_css_rule( $attributes, 'label', $label_sel, '', false, false, sgs_object_attr_keys( $block ) );
if ( '' !== $label_typography_css ) {
	$scoped_css[] = $label_typography_css;
}

// --- Reduced motion: the divider is user-driven input, so it stays live
// (Spec 38 §10) — only the decorative handle hover/scale transition is
// suppressed, matching the house pattern on every other block. ---
$scoped_css[] = '@media(prefers-reduced-motion:reduce){' . $root_sel . ' .wp-block-sgs-before-after__handle{transition:none !important;}}';

// ---------------------------------------------------------------------------
// 6. Root classes + attributes.
// ---------------------------------------------------------------------------

$root_classes = array( 'wp-block-sgs-before-after', 'sgs-focus-scope', $uid );
if ( '' !== $preset_bg_slug ) {
	$root_classes[] = 'has-background';
	$root_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

$root_attr_args = array(
	'class'               => implode( ' ', $root_classes ),
	'data-orientation'    => $orientation,
	'data-reverse'        => $reverse_direction ? '1' : '0',
	'data-free-drag'      => $free_drag ? '1' : '0',
	'data-has-video'      => $has_video_slot ? '1' : '0',
	'data-video-autoplay' => $video_autoplay ? '1' : '0',
);
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}
$wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );

// ---------------------------------------------------------------------------
// 7. Enqueue the Draggable enhancement's script modules — gated on the
// block actually rendering (proxy-enqueue, same sanctioned pattern as
// sgs/buybox's view_script_module_ids proxy). @sgs/motion-provider and
// @sgs/gsap-draggable are already REGISTERED at `init` by
// SGS_Motion_Registry::register_modules() (includes/class-sgs-motion-
// registry.php) whenever those two built files exist; this only enqueues
// them, so a page without a before/after block still ships zero GSAP bytes
// (Spec 38 §4.4). The native range input (below) needs neither module and
// keeps the divider fully keyboard + touch operable even if this enqueue is
// skipped or the built files are not yet present.
//
// `is_admin()` GATE (Spec 38 §9 — never active in wp-admin, proven 2026-07-31):
// this block's own render.php runs on every render_block() call for it,
// including the editor's server-side content generation for the iframe
// canvas — a context every OTHER Tier G enqueue path in this codebase
// excludes (SGS_Motion_Registry::sniff_block(), maybe_enqueue_smooth_scroll(),
// maybe_enqueue_page_transitions() all check is_admin()/sgs_is_frontend_render()
// first). This proxy-enqueue was the one path that did not, and it is what put
// `@sgs/gsap-draggable` on the wp-admin page's own <script type="module">
// list without a matching import-map entry — confirmed live via Chrome
// DevTools on wp-admin/post.php?action=edit: the printed import map held only
// `@wordpress/route`, `@wordpress/latex-to-mathml`, `@wordpress/interactivity`,
// `@sgs/gsap`, never the plugin modules, yet gsap-draggable.js was still
// enqueued from here. A STATIC import inside an already-enqueued module
// resolving against a map that doesn't carry it is an uncatchable module-load
// error — no try/catch or promise `.catch()` inside view.js's dynamic
// `import()` calls can intercept it, because the failure never reaches that
// code at all.
// ---------------------------------------------------------------------------

if ( $free_drag && ! is_admin() ) {
	wp_enqueue_script_module( '@sgs/motion-provider' );
	wp_enqueue_script_module( '@sgs/gsap-draggable' );
}

// ---------------------------------------------------------------------------
// 8. Render.
// ---------------------------------------------------------------------------

$range_id = $uid . '-range';

// Handle icon markup — resolved per source, mirroring sgs/icon's own
// source switch (icon/render.php ~401-446). lucide/wp-icon still resolve via
// the shared Lucide/wp-icon lookup with the gradient <defs> (if any) injected
// as the first child, falling back to the original hand-rolled two-polyline
// chevron markup if resolution fails (empty slug lookup, e.g. a stale/typo'd
// icon name) so the divider is never left with no icon at all. dashicon/
// emoji (2026-09-08 revert) render as a plain <span>, same as sgs/icon — no
// <defs> to inject (sgs_icon_gradient_css()'s text-glyph branch paints via
// the scoped-CSS rule pushed onto $scoped_css above instead).
if ( $handle_icon_is_text_source ) {
	if ( 'dashicon' === $handle_icon_source ) {
		$safe_handle_dashicon = '' !== $handle_icon_name ? $handle_icon_name : 'star-filled';
		$handle_icon_output   = sprintf(
			'<span class="wp-block-sgs-before-after__handle-dashicon dashicons dashicons-%s" aria-hidden="true"></span>',
			esc_attr( $safe_handle_dashicon )
		);
	} else {
		$safe_handle_emoji  = '' !== $handle_icon_name ? $handle_icon_name : '↔';
		$handle_icon_output = sprintf(
			'<span class="wp-block-sgs-before-after__handle-emoji" aria-hidden="true">%s</span>',
			esc_html( $safe_handle_emoji )
		);
	}
} else {
	$handle_icon_svg = 'wp-icon' === $handle_icon_source
		? sgs_get_wp_icon( $handle_icon_name )
		: sgs_get_lucide_icon( $handle_icon_name );
	if ( '' === $handle_icon_svg ) {
		$handle_icon_svg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 3 12 9 18"></polyline><polyline points="15 6 21 12 15 18"></polyline></svg>';
	}
	$handle_icon_svg    = sgs_svg_inject_defs( $handle_icon_svg, $sgs_handle_icon_grad['defs'] );
	$handle_icon_svg    = sgs_svg_inject_defs( $handle_icon_svg, $sgs_handle_icon_grad_hover['defs'] );
	$handle_icon_output = $handle_icon_svg;
}

?>
<?php
// Border (width, style, colour, gradient ring, radius at three tiers) through
// the shared assembler. The base rule prints before the tier rules so a tablet
// or mobile radius (same specificity) wins inside its media query.
$border = sgs_border_element_decls(
	$attributes,
	'',
	$root_sel,
	array(
		'colour' => array(
			'base'     => 'borderColour',
			'gradient' => 'borderColourGradient',
		),
	)
);
if ( $border['base'] ) {
	$scoped_css[] = $root_sel . '{' . implode( ';', $border['base'] ) . ';}';
}
if ( $border['tablet'] ) {
	$scoped_css[] = sgs_emit_tier_decls( $root_sel, array( 'tablet' => $border['tablet'] ) );
}
if ( $border['mobile'] ) {
	$scoped_css[] = sgs_emit_tier_decls( $root_sel, array( 'mobile' => $border['mobile'] ) );
}
$scoped_css = array_merge( $scoped_css, $border['rules'] );
?>
<?php if ( $scoped_css ) : ?>
<style>
	<?php
	echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>
</style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<div class="wp-block-sgs-before-after__stage" data-sgs-before-after-stage>
		<?php
		// Built and escaped by the shared media renderer (sgs_before_after_render_side() in media-render.php).
		echo $before_media['html']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		?>
		<div class="wp-block-sgs-before-after__after-wrap">
			<?php
			echo $after_media['html']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			?>
		</div>
		<?php if ( $show_labels && ( '' !== trim( $before_label ) || '' !== trim( $after_label ) ) ) : ?>
			<div class="wp-block-sgs-before-after__labels" aria-hidden="true">
				<?php if ( '' !== trim( $before_label ) ) : ?>
					<span class="wp-block-sgs-before-after__label wp-block-sgs-before-after__label--before"><?php echo sgs_rich_text_kses( $before_label ); ?></span>
				<?php endif; ?>
				<?php if ( '' !== trim( $after_label ) ) : ?>
					<span class="wp-block-sgs-before-after__label wp-block-sgs-before-after__label--after"><?php echo sgs_rich_text_kses( $after_label ); ?></span>
				<?php endif; ?>
			</div>
		<?php endif; ?>
		<?php if ( $has_video_slot ) : ?>
			<button
				type="button"
				class="wp-block-sgs-before-after__video-toggle sgs-focus--duotone"
				data-sgs-before-after-video-toggle
				aria-pressed="false"
				aria-label="<?php esc_attr_e( 'Play comparison videos', 'sgs-blocks' ); ?>"
			>
				<svg class="wp-block-sgs-before-after__video-toggle-icon wp-block-sgs-before-after__video-toggle-icon--play" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
					<polygon points="6 4 20 12 6 20 6 4"></polygon>
				</svg>
				<svg class="wp-block-sgs-before-after__video-toggle-icon wp-block-sgs-before-after__video-toggle-icon--pause" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
					<rect x="5" y="4" width="4" height="16"></rect>
					<rect x="15" y="4" width="4" height="16"></rect>
				</svg>
			</button>
		<?php endif; ?>
		<div class="wp-block-sgs-before-after__divider" aria-hidden="true">
			<div class="wp-block-sgs-before-after__divider-line"></div>
			<div class="wp-block-sgs-before-after__handle sgs-focus-proxy">
				<?php
				// $handle_icon_output resolved above (§8 top) — lucide/wp-icon
				// via sgs_get_lucide_icon()/sgs_get_wp_icon(), pre-sanitised
				// static lookup-table markup with the gradient <defs> (if
				// any) already injected, same trust boundary as sgs/icon's
				// identical emission; dashicon/emoji via sprintf() with
				// esc_attr()/esc_html() already applied inline, mirroring
				// sgs/icon's own dashicon/emoji output (icon/render.php
				// ~413-434).
				echo $handle_icon_output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				?>
			</div>
		</div>
		<label class="wp-block-sgs-before-after__range-label sgs-screen-reader-text" for="<?php echo esc_attr( $range_id ); ?>">
			<?php
			echo esc_html(
				sprintf(
					/* translators: %1$s: before label, %2$s: after label */
					__( 'Drag to compare %1$s and %2$s', 'sgs-blocks' ),
					'' !== trim( $before_label ) ? sgs_authored_text_plain( $before_label ) : __( 'before', 'sgs-blocks' ),
					'' !== trim( $after_label ) ? sgs_authored_text_plain( $after_label ) : __( 'after', 'sgs-blocks' )
				)
			);
			?>
		</label>
		<input
			type="range"
			id="<?php echo esc_attr( $range_id ); ?>"
			class="wp-block-sgs-before-after__range sgs-focus-source"
			min="0"
			max="100"
			step="1"
			value="<?php echo esc_attr( round( $start_position ) ); ?>"
			data-sgs-before-after-range
		/>
	</div>
</div>
