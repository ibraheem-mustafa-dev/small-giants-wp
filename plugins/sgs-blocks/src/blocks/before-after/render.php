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
 * and — when `fxDraggable` is on — GSAP Draggable adds free-drag directly on
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
// 1. Resolve content per slot (image / video / svg — see media-render.php).
// Soft-fail: nothing to render without content on BOTH slots.
// ---------------------------------------------------------------------------

// $uid is computed here (moved ahead of its original §4 location) because
// the media-slot scope class (Wave 5b, media-atom prefix support) is applied
// to the <img>/<video> markup INSIDE sgs_before_after_resolve_media() itself.
$uid = 'sgs-before-after-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );

$before_media = sgs_before_after_resolve_media( $attributes, 'before', $uid );
$after_media  = sgs_before_after_resolve_media( $attributes, 'after', $uid );

if ( ! $before_media['has_content'] || ! $after_media['has_content'] ) {
	return;
}

$has_video_slot = 'video' === $before_media['media_type'] || 'video' === $after_media['media_type'];

// Per-device autoplay tier (D-pending). Desktop stays the real attribute the
// no-JS/reduced-motion path already relies on; tablet/mobile overrides ride
// as data-* on the root and are resolved + applied by view.js
// (bootVideoSyncLayer), reusing the same fallback-upward shape as sgs/media's
// tiered playback attrs (null = inherit the tier above).
//
// An empty string is treated identically to null (inherit) — NOT a stored
// shape, only a REST-transport artefact. block.json's type union carries
// 'string' alongside 'boolean'/'null' solely because
// @wordpress/server-side-render's GET transport serialises an unset (null)
// attribute to '' in the REST query string (addQueryArgs cannot represent a
// real null), and the editor's own live preview would otherwise 400 on
// every load. Real post_content always stores a genuine JSON null for an
// unset tier, never ''.
$video_autoplay_tablet_raw = $attributes['videoAutoplayTablet'] ?? null;
$video_autoplay_mobile_raw = $attributes['videoAutoplayMobile'] ?? null;
if ( '' === $video_autoplay_tablet_raw ) {
	$video_autoplay_tablet_raw = null;
}
if ( '' === $video_autoplay_mobile_raw ) {
	$video_autoplay_mobile_raw = null;
}

$video_autoplay = ! empty( $attributes['videoAutoplay'] );

$video_autoplay_tablet_effective = null !== $video_autoplay_tablet_raw
	? (bool) $video_autoplay_tablet_raw
	: $video_autoplay;
$video_autoplay_mobile_effective = null !== $video_autoplay_mobile_raw
	? (bool) $video_autoplay_mobile_raw
	: $video_autoplay_tablet_effective;

$show_labels  = ! empty( $attributes['showLabels'] ) || ! isset( $attributes['showLabels'] );
$before_label = isset( $attributes['beforeLabel'] ) ? (string) $attributes['beforeLabel'] : '';
$after_label  = isset( $attributes['afterLabel'] ) ? (string) $attributes['afterLabel'] : '';

$orientation_raw   = $attributes['orientation'] ?? 'horizontal';
$orientation       = in_array( $orientation_raw, array( 'horizontal', 'vertical' ), true ) ? $orientation_raw : 'horizontal';
$reverse_direction = ! empty( $attributes['reverseDirection'] );

$fx_draggable = ! empty( $attributes['fxDraggable'] ) || ! isset( $attributes['fxDraggable'] );

// startPosition — clamp 0-100.
$start_position = isset( $attributes['startPosition'] ) ? (float) $attributes['startPosition'] : 50;
$start_position = max( 0, min( 100, $start_position ) );

// ---------------------------------------------------------------------------
// 2. Sanitisers (mirrors sgs/quote — box-object interface contract §D).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 3. Frame (root) attributes.
// ---------------------------------------------------------------------------

$box_shadow              = $attributes['boxShadow'] ?? '';
$box_shadow_colour       = $attributes['boxShadowColour'] ?? '';
$box_shadow_colour_hover = $attributes['boxShadowColourHover'] ?? '';

// `maxWidth` is a TIER OBJECT (Spec 35) — ONE attr holding
// {desktop,tablet,mobile}, read through the shared normaliser.
$max_width_tiers  = sgs_responsive_normalise_object( $attributes['maxWidth'] ?? null );
$max_width        = $max_width_tiers['desktop'] ?? '';
$max_width_tablet = $max_width_tiers['tablet'] ?? '';
$max_width_mobile = $max_width_tiers['mobile'] ?? '';

// `height` is a TIER OBJECT (Spec 35) — block.json declares no separate
// heightTablet/heightMobile keys. `heightUnit` stays a separate flat attr
// (one unit for all tiers).
$height_tiers  = sgs_responsive_normalise_object( $attributes['height'] ?? null );
$height        = isset( $height_tiers['desktop'] ) ? (float) $height_tiers['desktop'] : 400;
$height_unit   = in_array( $attributes['heightUnit'] ?? 'px', array( 'px', 'vh', 'em', 'rem', '%' ), true ) ? $attributes['heightUnit'] : 'px';
$height_tablet = $height_tiers['tablet'] ?? null;
$height_mobile = $height_tiers['mobile'] ?? null;

$divider_colour  = $attributes['dividerColour'] ?? '';
$divider_width   = isset( $attributes['dividerWidth'] ) ? max( 1, (float) $attributes['dividerWidth'] ) : 3;
$handle_colour   = $attributes['handleColour'] ?? '';
$handle_icon_col = $attributes['handleIconColour'] ?? '';

// Handle icon — resolved via the shared Lucide/wp-icon + IconPicker mechanism
// (2026-09-05 migration off the hand-rolled two-polyline SVG). Source is
// restricted to the two inline-SVG sources at the schema level (block.json
// enum) since a stroke gradient needs a real <svg> to inject <defs> into.
$handle_icon_source         = $attributes['handleIconSource'] ?? 'lucide';
$handle_icon_source         = in_array( $handle_icon_source, array( 'lucide', 'wp-icon' ), true ) ? $handle_icon_source : 'lucide';
$handle_icon_name           = preg_replace( '/[^a-z0-9-]/', '', strtolower( $attributes['handleIconName'] ?? 'chevrons-left-right' ) );
$handle_icon_gradient       = (string) ( $attributes['handleIconColourGradient'] ?? '' );
$handle_icon_col_hover      = (string) ( $attributes['handleIconColourHover'] ?? '' );
$handle_icon_gradient_hover = (string) ( $attributes['handleIconColourHoverGradient'] ?? '' );

$label_colour    = $attributes['labelColour'] ?? '';
$label_bg_colour = $attributes['labelBackgroundColour'] ?? '';

// Base border-radius — WP-native style.border.radius (skip-serialised).

// WP `color`/border supports (skip-serialised → NOT auto-inlined).
$style_color_bg = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_bg_slug = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );

// ---------------------------------------------------------------------------
// 4. Resolve scope. Uid is a CLASS (anchor stays a free `id`).
// ---------------------------------------------------------------------------

$anchor = $attributes['anchor'] ?? '';
// $uid computed earlier, ahead of the resolve_media() calls — see the
// comment there.
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
if ( $box_shadow ) {
	$wrapper_decls[] = 'box-shadow:' . sgs_shadow_value_composed( $box_shadow, $box_shadow_colour );
}
// HOVER-state shadow colour (Rule 31, 2026-08-22) — reuses the resting SHAPE
// with the hover colour composed in.
if ( $box_shadow && $box_shadow_colour_hover ) {
	$box_shadow_hover_value = sgs_shadow_value_composed( $box_shadow, $box_shadow_colour_hover );
	if ( '' !== $box_shadow_hover_value ) {
		$scoped_css[] = sgs_hover_state_rules( $root_sel, "box-shadow:{$box_shadow_hover_value}", ':focus-within' );
	}
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
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{max-width:{$mwt_safe};}}";
}
$mwm_safe = $max_width_mobile ? sgs_css_length_value( $max_width_mobile ) : '';
if ( '' !== $mwm_safe ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{max-width:{$mwm_safe};}}";
}

// Border-radius tiers (box family).

// --- Stage height (base + tiers). ---
$stage_sel    = $root_sel . ' .wp-block-sgs-before-after__stage';
$scoped_css[] = "{$stage_sel}{height:" . round( $height, 2 ) . $height_unit . ';}';
if ( null !== $height_tablet && '' !== $height_tablet ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$stage_sel}{height:" . round( (float) $height_tablet, 2 ) . $height_unit . ';}}';
}
if ( null !== $height_mobile && '' !== $height_mobile ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$stage_sel}{height:" . round( (float) $height_mobile, 2 ) . $height_unit . ';}}';
}

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
// Handle icon stroke gradient (2026-09-05, svg-paint-gradient end-shape — the
// ONLY row of this shape in the framework). Unlike the background-image
// custom-property-gradient pattern used elsewhere on this block,
// --sgs-before-after-handle-icon-colour feeds a `stroke:` declaration
// directly (style.css:266), and `stroke:url(#id)` — same as `stroke` taking
// any other paint value — is valid, so a gradient sets the SAME custom
// property to a `url(#id)` reference rather than needing a second sibling
// var. sgs_svg_stroke_gradient() fails soft (empty defs/css) on an
// empty/invalid gradient, so this is always safe to compute.
$handle_icon_grad_id  = $uid . '-handle-icon-grad';
$sgs_handle_icon_grad = sgs_icon_gradient_css( $handle_icon_source, $handle_icon_gradient, $handle_icon_grad_id, '' );
if ( '' !== $sgs_handle_icon_grad['defs'] ) {
	$root_var_decls[] = '--sgs-before-after-handle-icon-colour:url(#' . $handle_icon_grad_id . ')';
} elseif ( $handle_icon_col ) {
	$root_var_decls[] = '--sgs-before-after-handle-icon-colour:' . sgs_colour_value( $handle_icon_col );
}

// Handle icon hover — same custom-property mechanism, via the shared
// sgs_icon_gradient_css() composer (2026-09-06). style.css's static
// :hover/:focus-visible rule (build-time touch-guarded, per this project's
// hover-guard convention for compiled stylesheets — not sgs_hover_state_rules(),
// which is for PER-INSTANCE scoped <style> output) reads this var with a
// fallback to the resting colour above.
$handle_icon_grad_hover_id  = $uid . '-handle-icon-grad-hover';
$sgs_handle_icon_grad_hover = sgs_icon_gradient_css( $handle_icon_source, $handle_icon_gradient_hover, $handle_icon_grad_hover_id, '' );
if ( '' !== $sgs_handle_icon_grad_hover['css'] ) {
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

// --- Media-element atom layer (Wave 5b) — object-fit + focal-point, ---
// --- INDEPENDENTLY scoped per slot (before/after), replacing the old ---
// --- shared supports.sgs.imageControls sgsObjectFit/sgsObjectPosition ---
// --- pair that set BOTH images identically. Each slot's <img>/<video> ---
// --- carries its own `sgs_media_element_scope_class( $uid, $prefix )` ---
// --- class (added in media-render.php) plus the universal `.sgs-media-el` ---
// --- marker, so the shared `assets/css/media-element.css` stylesheet ---
// --- (already enqueued globally by the plugin) paints each slot from ---
// --- its OWN custom-property values — no per-block CSS needed here. ---
// --- Legacy sgsObjectFit/sgsObjectPosition fallback (fix, 2026-09-01) ---
// Wave 5b (125e79ad3) removed supports.sgs.imageControls/imageControlsExplicit
// from block.json in favour of the per-slot mediaElements atoms above, but
// block.json no longer declares `sgsObjectFit`/`sgsObjectPosition` anywhere.
// WP drops an attribute a block's schema doesn't declare — but only on the
// EDITOR/JS surface (see plugins/sgs-blocks/CLAUDE.md); this PHP render
// still receives whatever value is sitting in the block's saved
// post_content. Any instance saved BEFORE this migration therefore still
// carries its old shared crop/position under the legacy keys, while the new
// beforeObjectFit/afterObjectFit/beforeObjectPosition/afterObjectPosition
// default empty ('inherit') — so without this fallback the page would
// silently revert to the browser-default crop the next time it renders.
// Read-time-only: this does NOT re-declare sgsObjectFit/sgsObjectPosition in
// block.json (that would resurrect the exact "one shared value for two
// independent slots" bug 125e79ad3 fixed on purpose) and only fills a slot
// value when that slot's OWN new attribute is genuinely unset, so a page
// already migrated to independent per-slot values is never touched.
$sgs_bap_legacy_fit     = $attributes['sgsObjectFit'] ?? '';
$sgs_bap_legacy_pos     = $attributes['sgsObjectPosition'] ?? null;
$sgs_bap_has_legacy_fit = is_string( $sgs_bap_legacy_fit ) && '' !== $sgs_bap_legacy_fit;
$sgs_bap_has_legacy_pos = is_array( $sgs_bap_legacy_pos ) && isset( $sgs_bap_legacy_pos['x'], $sgs_bap_legacy_pos['y'] );

if ( class_exists( 'SGS_Media_Element' ) ) {
	foreach ( array( 'before', 'after' ) as $sgs_bap_slot ) {
		$sgs_bap_attrs = $attributes;

		$sgs_bap_fit_key = $sgs_bap_slot . 'ObjectFit';
		if ( $sgs_bap_has_legacy_fit && empty( $sgs_bap_attrs[ $sgs_bap_fit_key ] ) ) {
			$sgs_bap_attrs[ $sgs_bap_fit_key ] = $sgs_bap_legacy_fit;
		}
		$sgs_bap_pos_key = $sgs_bap_slot . 'ObjectPosition';
		if ( $sgs_bap_has_legacy_pos && empty( $sgs_bap_attrs[ $sgs_bap_pos_key ] ) ) {
			$sgs_bap_attrs[ $sgs_bap_pos_key ] = $sgs_bap_legacy_pos;
		}

		// $uid here is the RAW block uid, not yet scope-suffixed — `style()`
		// applies `scope_class( $uid, $prefix )` internally, matching the
		// SAME class media-render.php puts on the slot's <img>/<video>.
		$sgs_bap_css = SGS_Media_Element::style(
			$sgs_bap_attrs,
			$sgs_bap_slot,
			'sgs/before-after',
			$uid,
			array( 'object-fit', 'focal-point' )
		);
		if ( '' !== $sgs_bap_css ) {
			$scoped_css[] = $sgs_bap_css;
		}
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

$label_decls = array();
if ( $attributes['labelFontWeight'] ?? '' ) {
	$fw_safe = sgs_css_keyword_sanitise( $attributes['labelFontWeight'] );
	if ( '' !== $fw_safe ) {
		$label_decls[] = 'font-weight:' . $fw_safe;
	}
}
if ( $attributes['labelFontStyle'] ?? '' ) {
	$fs_safe = sgs_css_keyword_sanitise( $attributes['labelFontStyle'] );
	if ( '' !== $fs_safe ) {
		$label_decls[] = 'font-style:' . $fs_safe;
	}
}
if ( $label_decls ) {
	$scoped_css[] = $label_sel . '{' . implode( ';', $label_decls ) . ';}';
}

$label_font_size_unit   = $attributes['labelFontSizeUnit'] ?? 'px';
$label_line_height_unit = $attributes['labelLineHeightUnit'] ?? '';

// labelFontSize is a TIER OBJECT (Spec 35) — sgs_responsive_css_rule() reads
// flat sibling keys, so feed it a synthetic array carrying the normalised
// tier values under the flat key names — same pattern as
// button/render.php's $tier_object_synthetic_attrs. labelLineHeight stays
// genuinely flat (no Tablet/Mobile siblings).
$label_font_size_obj = sgs_responsive_normalise_object( $attributes['labelFontSize'] ?? null );
$css_label_tiers     = sgs_responsive_css_rule(
	array_merge(
		$attributes,
		array(
			'labelFontSize'       => $label_font_size_obj['desktop'],
			'labelFontSizeTablet' => $label_font_size_obj['tablet'],
			'labelFontSizeMobile' => $label_font_size_obj['mobile'],
		)
	),
	array(
		array(
			'attr'         => 'labelFontSize',
			'css'          => 'font-size',
			'unit_default' => $label_font_size_unit,
			'tablet_attr'  => 'labelFontSizeTablet',
			'mobile_attr'  => 'labelFontSizeMobile',
		),
		array(
			'attr'         => 'labelLineHeight',
			'css'          => 'line-height',
			'unit_default' => $label_line_height_unit,
		),
	),
	$label_sel
);
if ( $css_label_tiers ) {
	$scoped_css[] = $css_label_tiers;
}

// --- Reduced motion: the divider is user-driven input, so it stays live
// (Spec 38 §10) — only the decorative handle hover/scale transition is
// suppressed, matching the house pattern on every other block. ---
$scoped_css[] = '@media(prefers-reduced-motion:reduce){' . $root_sel . ' .wp-block-sgs-before-after__handle{transition:none !important;}}';

// ---------------------------------------------------------------------------
// 6. Root classes + attributes.
// ---------------------------------------------------------------------------

$root_classes = array( 'wp-block-sgs-before-after', $uid );
if ( '' !== $preset_bg_slug ) {
	$root_classes[] = 'has-background';
	$root_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

$root_attr_args = array(
	'class'               => implode( ' ', $root_classes ),
	'data-orientation'    => $orientation,
	'data-reverse'        => $reverse_direction ? '1' : '0',
	'data-fx-draggable'   => $fx_draggable ? '1' : '0',
	'data-has-video'      => $has_video_slot ? '1' : '0',
	'data-video-autoplay' => $video_autoplay ? '1' : '0',
);
// Tier overrides — only present when a tier's effective value diverges from
// the tier above it (view.js resolves + applies these on load and resize;
// mirrors sgs/media's sgs_media_tier_data_attrs() shape).
if ( $video_autoplay_tablet_effective !== $video_autoplay ) {
	$root_attr_args['data-video-autoplay-tablet'] = $video_autoplay_tablet_effective ? '1' : '0';
}
if ( $video_autoplay_mobile_effective !== $video_autoplay_tablet_effective ) {
	$root_attr_args['data-video-autoplay-mobile'] = $video_autoplay_mobile_effective ? '1' : '0';
}
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}
$wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );

// ---------------------------------------------------------------------------
// 6b. ART-DIRECTION TIER TOGGLES (2026-08-07) — the IMAGE pair.
//
// The resolver emitted the tier siblings and reported which tiers it actually
// produced; scoping their breakpoint toggles has to happen HERE because $uid
// exists only in this file. An unscoped `.wp-block-sgs-before-after__img--…`
// rule would hide images in every other instance on the page.
//
// ⛔ Selectors descend from $root_sel — a single compound token
// (`.{uid}.wp-block-sgs-before-after`), never a multi-member selector LIST: a
// descendant appended to a list binds to its last member only, which on
// sgs/media hid every image at every width before it was caught live.
// ---------------------------------------------------------------------------
foreach ( array(
	'before' => $before_media,
	'after'  => $after_media,
) as $sgs_slot => $sgs_slot_media ) {
	$sgs_slot_tiers = $sgs_slot_media['tiers'] ?? array();
	if ( empty( $sgs_slot_tiers ) ) {
		continue;
	}
	$sgs_ba_tier_sel = static function ( $tier ) use ( $root_sel, $sgs_slot ) {
		return $root_sel . ' .wp-block-sgs-before-after__img--' . $sgs_slot . '-' . $tier;
	};
	if ( in_array( 'mobile', $sgs_slot_tiers, true ) ) {
		$scoped_css[] = '@media(max-width:767px){' . $sgs_ba_tier_sel( 'desktop' ) . '{display:none}}';
		$scoped_css[] = '@media(min-width:768px){' . $sgs_ba_tier_sel( 'mobile' ) . '{display:none}}';
	}
	if ( in_array( 'tablet', $sgs_slot_tiers, true ) ) {
		$scoped_css[] = '@media(min-width:768px) and (max-width:1023px){' . $sgs_ba_tier_sel( 'desktop' ) . '{display:none}}';
		$scoped_css[] = '@media(max-width:767px){' . $sgs_ba_tier_sel( 'tablet' ) . '{display:none}}';
		$scoped_css[] = '@media(min-width:1024px){' . $sgs_ba_tier_sel( 'tablet' ) . '{display:none}}';
	}
}

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

if ( $fx_draggable && ! is_admin() ) {
	wp_enqueue_script_module( '@sgs/motion-provider' );
	wp_enqueue_script_module( '@sgs/gsap-draggable' );
}

// ---------------------------------------------------------------------------
// 8. Render.
// ---------------------------------------------------------------------------

$range_id = $uid . '-range';

// Handle icon SVG — resolved via the shared Lucide/wp-icon lookup, with the
// gradient <defs> (if any) injected as the first child. Falls back to the
// original hand-rolled two-polyline chevron markup if resolution fails
// (empty slug lookup, e.g. a stale/typo'd icon name) so the divider is never
// left with no icon at all.
$handle_icon_svg = 'wp-icon' === $handle_icon_source
	? sgs_get_wp_icon( $handle_icon_name )
	: sgs_get_lucide_icon( $handle_icon_name );
if ( '' === $handle_icon_svg ) {
	$handle_icon_svg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 3 12 9 18"></polyline><polyline points="15 6 21 12 15 18"></polyline></svg>';
}
$handle_icon_svg = sgs_svg_inject_defs( $handle_icon_svg, $sgs_handle_icon_grad['defs'] );
$handle_icon_svg = sgs_svg_inject_defs( $handle_icon_svg, $sgs_handle_icon_grad_hover['defs'] );

?>
<?php
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
		$bwt          = '' !== $border_width_top ? $border_width_top : '0';
		$bwr          = '' !== $border_width_right ? $border_width_right : '0';
		$bwb          = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl          = '' !== $border_width_left ? $border_width_left : '0';
		$scoped_css[] = $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$scoped_css[] = sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$scoped_css[] = $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
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
$radius_tiers      = sgs_border_radius_tiers( $attributes );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$scoped_css[] = $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}
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
		// Escaped by the resolver (sgs_before_after_resolve_media() in
		// media-render.php — every branch either escapes each part itself or
		// runs the content through wp_kses()/wp_get_attachment_image()).
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
					<span class="wp-block-sgs-before-after__label wp-block-sgs-before-after__label--before"><?php echo esc_html( $before_label ); ?></span>
				<?php endif; ?>
				<?php if ( '' !== trim( $after_label ) ) : ?>
					<span class="wp-block-sgs-before-after__label wp-block-sgs-before-after__label--after"><?php echo esc_html( $after_label ); ?></span>
				<?php endif; ?>
			</div>
		<?php endif; ?>
		<?php if ( $has_video_slot ) : ?>
			<button
				type="button"
				class="wp-block-sgs-before-after__video-toggle"
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
			<div class="wp-block-sgs-before-after__handle">
				<?php
				// $handle_icon_svg resolved above (§8 top) via
				// sgs_get_lucide_icon()/sgs_get_wp_icon(), pre-sanitised
				// static lookup-table markup with the gradient <defs> (if
				// any) already injected — same trust boundary as sgs/icon's
				// identical emission.
				echo $handle_icon_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				?>
			</div>
		</div>
		<label class="wp-block-sgs-before-after__range-label sgs-screen-reader-text" for="<?php echo esc_attr( $range_id ); ?>">
			<?php
			echo esc_html(
				sprintf(
					/* translators: %1$s: before label, %2$s: after label */
					__( 'Drag to compare %1$s and %2$s', 'sgs-blocks' ),
					'' !== trim( $before_label ) ? $before_label : __( 'before', 'sgs-blocks' ),
					'' !== trim( $after_label ) ? $after_label : __( 'after', 'sgs-blocks' )
				)
			);
			?>
		</label>
		<input
			type="range"
			id="<?php echo esc_attr( $range_id ); ?>"
			class="wp-block-sgs-before-after__range"
			min="0"
			max="100"
			step="1"
			value="<?php echo esc_attr( round( $start_position ) ); ?>"
			data-sgs-before-after-range
		/>
	</div>
</div>
