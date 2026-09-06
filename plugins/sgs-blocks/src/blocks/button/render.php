<?php
/**
 * Server-side render for the SGS Button block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// [D-tier-object-render-fix 2026-09-06]
// Group 1 folded padding/margin into owned tier-object attrs
// {desktop,tablet,mobile}, but this block's own scoped CSS below still
// reads the pre-migration flat shape (a plain box for the base value,
// plus four separate flat attrs for the tablet/mobile overrides --
// block.json no longer declares any of those four). Normalise once,
// into fresh locals only -- every literal reference below has been
// redirected to these instead of writing back into $attributes.
// Fixed 2026-09-06: sgs_responsive_normalise_object() lives in
// helpers-responsive.php, which this file's own render-helpers.php
// require below WOULD load -- but too late, since these two calls run
// before that require executes. A block whose render.php is the first
// SGS block PHP to run in a request (nav-menu in the site header, on
// every page) fatals with "Call to undefined function" before any
// other block's render.php has had a chance to load it. Requiring the
// defining file directly, here, removes the load-order dependency.
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
$sgs_tor_padding_tiers  = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_tor_margin_tiers   = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();
$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();


require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

// ---------------------------------------------------------------------------
// 1. Extract and sanitise attributes.
// ---------------------------------------------------------------------------

// inheritStyle no longer gates any styling (preset-as-seed model — every
// button paints entirely from its own attributes). It still records which
// preset the editor's "Style preset" dropdown last applied, surfaced as a
// data attribute for support/debugging (e.g. "which buttons are still on
// their original preset vs hand-tweaked").
$inherit_style = isset( $attributes['inheritStyle'] ) ? sanitize_text_field( $attributes['inheritStyle'] ) : 'primary';
$label         = isset( $attributes['label'] ) ? $attributes['label'] : 'Click Here';

// LINK contract (Spec 35 §2 / D609 row-opens-popover shape) — internal-link
// resolution. `linkId`/`linkKind` are written by the LinkControl popover
// (`link-popover.js`) when an operator picks an internal page/post/term from
// search results; `url` is the plain string a raw pasted URL uses, and is
// ALSO what LinkControl auto-fills as a preview when an internal result is
// picked — so `url` alone can't prove which path fired. Resolving the
// CURRENT permalink from the ID at render time (rather than trusting the
// stored url string) is what keeps the link correct after the target page's
// slug changes. `url` stays authoritative whenever there is no id, OR the id
// no longer resolves (e.g. the target was deleted) — never break an existing
// stored link.
// Named $sgs_link_id (not $link_id) — WPCS flags $link_id as a WordPress
// global override (the legacy Links Manager bookmark API used a global of
// that exact name).
$sgs_link_id  = isset( $attributes['linkId'] ) ? absint( $attributes['linkId'] ) : 0;
$link_kind    = isset( $attributes['linkKind'] ) ? sanitize_text_field( $attributes['linkKind'] ) : '';
$resolved_url = '';
if ( $sgs_link_id ) {
	if ( 'taxonomy' === $link_kind ) {
		$term_link    = get_term_link( $sgs_link_id );
		$resolved_url = is_wp_error( $term_link ) ? '' : $term_link;
	} else {
		$permalink    = get_permalink( $sgs_link_id );
		$resolved_url = $permalink ? $permalink : '';
	}
}
$stored_url    = isset( $attributes['url'] ) ? (string) $attributes['url'] : '';
$effective_url = $resolved_url ? $resolved_url : $stored_url;
$has_url       = '' !== trim( $effective_url );
$url           = $has_url ? esc_url( $effective_url ) : '#';
$link_target   = isset( $attributes['linkTarget'] ) ? esc_attr( $attributes['linkTarget'] ) : '_self';
$rel           = isset( $attributes['rel'] ) ? esc_attr( $attributes['rel'] ) : '';
$download      = ! empty( $attributes['download'] );
// The tag is auto-derived: a non-empty URL renders <a>, otherwise <button>,
// preserving link-vs-button semantics without a setting.
$tag_name   = $has_url ? 'a' : 'button';
$is_submit  = ! empty( $attributes['isSubmit'] );
$aria_label = isset( $attributes['ariaLabel'] ) && $attributes['ariaLabel'] ? esc_attr( $attributes['ariaLabel'] ) : esc_attr( $label );
// Spec 35 T3.4 / Part C — WCAG 2.1 AA 4.1.2 (Name, Role, Value). The inspector
// control's help text promises "Overrides the visible label for screen
// readers" with no icon-only qualifier, so an explicit operator override must
// render on every tag variant, not only when icon_position === 'only'. This
// fixes a chain break where the aria-label attribute was silently dropped
// whenever the button had visible text.
$has_explicit_aria = isset( $attributes['ariaLabel'] ) && '' !== trim( (string) $attributes['ariaLabel'] );

// Icon.
$icon          = isset( $attributes['icon'] ) ? sanitize_text_field( $attributes['icon'] ) : '';
$icon_position = isset( $attributes['iconPosition'] ) ? sanitize_text_field( $attributes['iconPosition'] ) : 'after';
// iconSize is a TIER OBJECT (Spec 35) — one attr holding {desktop,tablet,mobile}.
// ⛔ There are no iconSizeTablet/iconSizeMobile attrs; reading them reads nothing.
$icon_size_obj = sgs_responsive_normalise_object( $attributes['iconSize'] ?? null );
$icon_size     = null !== $icon_size_obj['desktop'] ? absint( $icon_size_obj['desktop'] ) : null;
$icon_size_tab = null !== $icon_size_obj['tablet'] ? absint( $icon_size_obj['tablet'] ) : null;
$icon_size_mob = null !== $icon_size_obj['mobile'] ? absint( $icon_size_obj['mobile'] ) : null;
$icon_colour   = isset( $attributes['iconColour'] ) ? $attributes['iconColour'] : '';
$icon_col_hov  = isset( $attributes['iconColourHover'] ) ? $attributes['iconColourHover'] : '';
$icon_title    = isset( $attributes['iconTitle'] ) ? esc_html( $attributes['iconTitle'] ) : '';

// Label collapse (responsive icon-only collapse).
$label_collapse = isset( $attributes['labelCollapse'] ) ? (string) $attributes['labelCollapse'] : 'none';

// Width.
// widthType / customWidth / customWidthUnit are TIER OBJECTS (Spec 35) — each ONE
// attr holding {desktop,tablet,mobile}. '' on tablet/mobile = inherit desktop.
// ⛔ There are no …Tablet/…Mobile sibling attrs; reading them reads nothing.
$width_type_obj        = sgs_responsive_normalise_object( $attributes['widthType'] ?? null );
$width_type            = null !== $width_type_obj['desktop'] ? sanitize_text_field( $width_type_obj['desktop'] ) : 'fit';
$custom_width_obj      = sgs_responsive_normalise_object( $attributes['customWidth'] ?? null );
$custom_width          = null !== $custom_width_obj['desktop'] ? absint( $custom_width_obj['desktop'] ) : null;
$custom_width_unit_obj = sgs_responsive_normalise_object( $attributes['customWidthUnit'] ?? null );
$custom_width_unit     = '%' === ( $custom_width_unit_obj['desktop'] ?? '' ) ? '%' : 'px';

// Per-device width tiers ('' = inherit desktop). Each tier carries its own
// widthType enum + custom value + custom unit so a button can be e.g. fit on
// desktop, full on mobile (the draft's full-width-on-mobile pattern).
$width_type_tab     = null !== $width_type_obj['tablet'] ? sanitize_text_field( $width_type_obj['tablet'] ) : '';
$width_type_mob     = null !== $width_type_obj['mobile'] ? sanitize_text_field( $width_type_obj['mobile'] ) : '';
$custom_width_tab   = null !== $custom_width_obj['tablet'] ? absint( $custom_width_obj['tablet'] ) : null;
$custom_width_mob   = null !== $custom_width_obj['mobile'] ? absint( $custom_width_obj['mobile'] ) : null;
$custom_width_tab_u = '%' === ( $custom_width_unit_obj['tablet'] ?? '' ) ? '%' : 'px';
$custom_width_mob_u = '%' === ( $custom_width_unit_obj['mobile'] ?? '' ) ? '%' : 'px';
// minHeight is a TIER OBJECT (Spec 35) — {desktop,
// tablet,mobile}; the old …Tablet/…Mobile sibling attrs are no longer
// declared by block.json. minHeightUnit/minHeightTabletUnit/minHeightMobileUnit
// are a SEPARATE, still-flat family (each tier's own unit) — untouched here,
// out of this migration's scope.
$min_height_obj = sgs_responsive_normalise_object( $attributes['minHeight'] ?? null );
$min_height     = null !== $min_height_obj['desktop'] ? absint( $min_height_obj['desktop'] ) : null;
$min_height_tab = null !== $min_height_obj['tablet'] ? absint( $min_height_obj['tablet'] ) : null;
$min_height_mob = null !== $min_height_obj['mobile'] ? absint( $min_height_obj['mobile'] ) : null;

// Box-object interface contract (.claude/plans/2026-07-09-box-object-interface-contract.md
// §1): a CSS-length sanitiser for object-attr side/corner values — strips
// everything except digits, dot, %, and unit letters so a value can never
// break out of its declaration. Mirrors sgs/container's wrapper sanitiser.
// CSS keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style / font-style / text-transform / text-decoration).
// Strips everything except letters + hyphen, so ;{}():digits can never break out
// of the declaration into a new CSS rule. A Contributor-authored malicious value
// (e.g. "solid;}body{display:none") is reduced to safe keyword chars.
$allowed_units = array( 'px', 'em', 'rem', '%' );

// Min-height units — validated after $allowed_units is declared.
$min_height_unit  = isset( $attributes['minHeightUnit'] ) ? sanitize_text_field( $attributes['minHeightUnit'] ) : 'px';
$min_height_unit  = in_array( $min_height_unit, $allowed_units, true ) ? $min_height_unit : 'px';
$min_height_tab_u = isset( $attributes['minHeightTabletUnit'] ) ? sanitize_text_field( $attributes['minHeightTabletUnit'] ) : 'px';
$min_height_tab_u = in_array( $min_height_tab_u, $allowed_units, true ) ? $min_height_tab_u : 'px';
$min_height_mob_u = isset( $attributes['minHeightMobileUnit'] ) ? sanitize_text_field( $attributes['minHeightMobileUnit'] ) : 'px';
$min_height_mob_u = in_array( $min_height_mob_u, $allowed_units, true ) ? $min_height_mob_u : 'px';

// Box-object interface contract §1/§2: padding/margin BASE reads WP-native
// style.spacing.* (skipSerialization keeps it out of the auto-inline output —
// see the scoped-rule emission in step 4); tablet/mobile tiers are the
// paddingTablet/paddingMobile + marginTablet/marginMobile OBJECT attrs
// { top, right, bottom, left } (a missing key = that side unset).
$base_spacing_padding = array();
if ( ! empty( $sgs_tor_padding_desktop ) ) {
	foreach ( $sgs_tor_padding_desktop as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_spacing_padding[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_spacing_margin = array();
if ( ! empty( $sgs_tor_margin_desktop ) ) {
	foreach ( $sgs_tor_margin_desktop as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_spacing_margin[ $spacing_side ] = $spacing_value;
		}
	}
}

$padding_tablet_obj = is_array( $sgs_tor_padding_tiers['tablet'] ?? null ) ? $sgs_tor_padding_tiers['tablet'] : array();
$padding_mobile_obj = is_array( $sgs_tor_padding_tiers['mobile'] ?? null ) ? $sgs_tor_padding_tiers['mobile'] : array();
$margin_tablet_obj  = is_array( $sgs_tor_margin_tiers['tablet'] ?? null ) ? $sgs_tor_margin_tiers['tablet'] : array();
$margin_mobile_obj  = is_array( $sgs_tor_margin_tiers['mobile'] ?? null ) ? $sgs_tor_margin_tiers['mobile'] : array();

// Base border-radius — WP-native style.border.radius (string = uniform, or an
// object with topLeft/topRight/bottomLeft/bottomRight keys). Tiers are the
// borderRadiusTablet/borderRadiusMobile OBJECT attrs (contract §2).
$radius_tiers            = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$base_border_radius       = $radius_tiers['base'];
$border_radius_tablet_obj = $radius_tiers['tablet'];
$border_radius_mobile_obj = $radius_tiers['mobile'];

// Typography (custom mode only) — D971/D972 full-replacement track: emitted
// via the shared sgs_typography_css_rule() helper (root prefix '') rather
// than hand-rolled here. See step 4 below for the actual call.

// sgs_responsive_css_rule() (used below for the icon-size rule only —
// typography no longer uses it) reads its prop_map attrs as FLAT sibling
// keys straight off an $attributes-shaped array — it has no knowledge of the
// new tier-object shape. Feed it a synthetic array that carries the
// already-normalised icon-size tier values under the OLD flat key names it
// expects, so its call site below needs no change of its own.
$tier_object_synthetic_attrs = array_merge(
	$attributes,
	array(
		'iconSize'       => $icon_size,
		'iconSizeTablet' => $icon_size_tab,
		'iconSizeMobile' => $icon_size_mob,
	)
);

// Colours (custom mode only).
$colour_text              = isset( $attributes['colourText'] ) ? $attributes['colourText'] : '';
$colour_text_hover        = isset( $attributes['colourTextHover'] ) ? $attributes['colourTextHover'] : '';
// D636-family sibling attrs — resolved further down (step 8) alongside the
// border-colour gradient, once $uid exists for the scoped selector. Read
// here purely to keep every attribute extraction in one place (step 1).
$colour_text_gradient       = isset( $attributes['colourTextGradient'] ) ? (string) $attributes['colourTextGradient'] : '';
$colour_text_hover_gradient = isset( $attributes['colourTextHoverGradient'] ) ? (string) $attributes['colourTextHoverGradient'] : '';
$colour_bg                = isset( $attributes['colourBackground'] ) ? $attributes['colourBackground'] : '';
$colour_bg_gradient       = isset( $attributes['colourBackgroundGradient'] ) ? $attributes['colourBackgroundGradient'] : '';
$colour_bg_hover          = isset( $attributes['colourBackgroundHover'] ) ? $attributes['colourBackgroundHover'] : '';
$colour_bg_hover_gradient = isset( $attributes['colourBackgroundHoverGradient'] ) ? $attributes['colourBackgroundHoverGradient'] : '';
$colour_border            = isset( $attributes['borderColour'] ) ? $attributes['borderColour'] : '';
$colour_border_hover      = isset( $attributes['borderColourHover'] ) ? $attributes['borderColourHover'] : '';
// D636 border-colour gradient siblings — resolved here, emitted as a masked
// ::before border (sgs_border_gradient_css) further down; border-color cannot
// legally hold a gradient itself, so these do NOT feed the --sgs-btn-border*
// custom properties above.
$colour_border_gradient       = isset( $attributes['borderColourGradient'] ) ? sgs_css_gradient_value( $attributes['borderColourGradient'] ) : '';
$colour_border_hover_gradient = isset( $attributes['borderColourHoverGradient'] ) ? sgs_css_gradient_value( $attributes['borderColourHoverGradient'] ) : '';

// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// $attributes['style']['color'] / textColor / backgroundColor are still
// populated by core when an operator (or a clone) sets a colour via the
// native Styles panel. Custom hex/rgb values are emitted into the block's
// own scoped <style> below (step 4); preset SLUGS get the standard
// has-text-color / has-{slug}-color / has-background /
// has-{slug}-background-color classes re-added manually in step 5 (mirrors
// sgs/label's pattern — WP suppresses its own class output once
// skipSerialization is set).
$style_colour_text = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_colour_bg   = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_text_slug  = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug    = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// Hover text-decoration ('none' | 'underline') — reproduces a draft link that
// underlines on hover. Only 'underline' emits; 'none' leaves the base decoration
// untouched on hover.
$text_decoration_hover = isset( $attributes['textDecorationHover'] ) ? sanitize_text_field( $attributes['textDecorationHover'] ) : 'none';

// Border (custom mode only). Box-object interface contract §1/§2: borderWidth
// is an SGS custom OBJECT attr { top, right, bottom, left } — no WP-native
// border-width support, no tiers (matches the pre-existing base-only contract).
$border_style     = isset( $attributes['borderStyle'] ) ? sgs_css_keyword_sanitise( $attributes['borderStyle'] ) : 'solid';
$border_width_obj = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_rgt = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bot = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_lft = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width = ( '' !== $border_width_top || '' !== $border_width_rgt || '' !== $border_width_bot || '' !== $border_width_lft );

// Box shadow — SHAPE-only string attrs (D621/D622 colour-architecture
// redesign); colour lives in the sibling boxShadowColour/boxShadowHoverColour
// attrs and is composed back in at render time via
// sgs_shadow_value_composed() (includes/helpers-tokens.php).
$box_shadow              = isset( $attributes['boxShadow'] ) ? (string) $attributes['boxShadow'] : '';
$box_shadow_colour       = isset( $attributes['boxShadowColour'] ) ? (string) $attributes['boxShadowColour'] : '';
$box_shadow_hover        = isset( $attributes['boxShadowHover'] ) ? (string) $attributes['boxShadowHover'] : '';
$box_shadow_hover_colour = isset( $attributes['boxShadowHoverColour'] ) ? (string) $attributes['boxShadowHoverColour'] : '';

// Effects.
$hover_scale         = isset( $attributes['scaleHover'] ) ? (float) $attributes['scaleHover'] : 1.0;
$transition_duration = isset( $attributes['transitionDuration'] ) ? absint( $attributes['transitionDuration'] ) : 300;
$transition_easing   = isset( $attributes['transitionEasing'] ) ? sanitize_text_field( $attributes['transitionEasing'] ) : 'ease';

$allowed_easings   = array( 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' );
$transition_easing = in_array( $transition_easing, $allowed_easings, true ) ? $transition_easing : 'ease';

// ---------------------------------------------------------------------------
// 2. Unique ID for scoped CSS.
// ---------------------------------------------------------------------------

// Content-hash uid (Pattern A pre-req, D-migration): matches heading/render.php
// — stable across fragment-cached renders (same attrs → same id on every
// request), and required for the base+tablet+mobile Pattern A rules below to
// target a fixed selector rather than wp_unique_id()'s per-request counter.
$uid = 'sgs-btn-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );

// ---------------------------------------------------------------------------
// 3. Build inline styles for the button element (custom mode only).
// ---------------------------------------------------------------------------

$inline_styles = array();

// Colour is CLASS-driven (Spec 32 FR-32-2/4): the `.sgs-button--{preset}` class
// sets the six `--sgs-btn-*` vars from the per-client tokens (WP-generated from
// the snapshot buttonPresets). A NON-EMPTY colour attr is a per-instance
// OVERRIDE, emitted as a CSS custom-property VALUE — never an inline property
// declaration — so it beats the preset var yet, being a var (not `color:`),
// still cannot break the stylesheet `:hover` rule. Empty attrs (the default) =
// no override → the class governs.
if ( $colour_text ) {
	$inline_styles[] = '--sgs-btn-color:' . sgs_colour_value( $colour_text );
}
if ( $colour_bg ) {
	$inline_styles[] = '--sgs-btn-bg:' . sgs_colour_value( $colour_bg );
}
$colour_bg_gradient_value = sgs_css_gradient_value( $colour_bg_gradient );
if ( '' !== $colour_bg_gradient_value ) {
	$inline_styles[] = '--sgs-btn-bg-image:' . $colour_bg_gradient_value;
}
if ( $colour_border ) {
	$inline_styles[] = '--sgs-btn-border:' . sgs_colour_value( $colour_border );
}
if ( $colour_text_hover ) {
	$inline_styles[] = '--sgs-btn-color-hover:' . sgs_colour_value( $colour_text_hover );
}
if ( $colour_bg_hover ) {
	$inline_styles[] = '--sgs-btn-bg-hover:' . sgs_colour_value( $colour_bg_hover );
}
$colour_bg_hover_gradient_value = sgs_css_gradient_value( $colour_bg_hover_gradient );
if ( '' !== $colour_bg_hover_gradient_value ) {
	$inline_styles[] = '--sgs-btn-bg-hover-image:' . $colour_bg_hover_gradient_value;
}
if ( $colour_border_hover ) {
	$inline_styles[] = '--sgs-btn-border-hover:' . sgs_colour_value( $colour_border_hover );
}

// Non-responsive base declarations (border-width/style, font weight/style,
// text-transform/decoration, box-shadow) go into the id-scoped <style> base rule
// in step 4 — NOT inline (Spec 32: the element's `style` attr carries only
// custom-property VALUES, never property declarations). Border-radius / font-size
// / line-height / letter-spacing / padding / min-height / width have tablet+mobile
// tiers and are emitted on the same id-scoped selector in step 4 (Pattern A).
$base_decls = array();
if ( $has_border_width ) {
	$bwt          = '' !== $border_width_top ? $border_width_top : '0';
	$bwr          = '' !== $border_width_rgt ? $border_width_rgt : '0';
	$bwb          = '' !== $border_width_bot ? $border_width_bot : '0';
	$bwl          = '' !== $border_width_lft ? $border_width_lft : '0';
	$base_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
}
// G5 (border-style-without-width): a style override only paints safely when
// a real border-width exists SOMEWHERE for it to pair with — either the
// operator's own borderWidth attr ($has_border_width), or the preset class's
// own border-width:2px (now declared per-preset in style.css, not on the
// base rule — see the 2026-08-27 defect-2 fix above). Without this gate a
// custom/preset-less button with a style override but no width would fall
// through to the browser's initial ~3px `medium`.
$border_style_has_width = $has_border_width || in_array( $inherit_style, array( 'primary', 'secondary', 'outline' ), true );
if ( $border_style && 'solid' !== $border_style && $border_style_has_width ) {
	$base_decls[] = 'border-style:' . $border_style;
}
if ( '' !== $box_shadow ) {
	$base_decls[] = 'box-shadow:' . sgs_shadow_value_composed( $box_shadow, $box_shadow_colour );
}

// ---------------------------------------------------------------------------
// 4. Build scoped CSS for hover states and responsive rules.
// ---------------------------------------------------------------------------

$scoped_css_parts = array();

// Base non-responsive declarations (border-width/style, font, box-shadow) —
// id-scoped external CSS, NOT inline on the element (Spec 32 FR-32-1).
if ( $base_decls ) {
	$scoped_css_parts[] = ".{$uid}.sgs-button{" . implode( ';', $base_decls ) . ';}';
}

// Transition — applied on the element always (preset AND custom).
$scoped_css_parts[] = ".{$uid}.sgs-button{transition:all {$transition_duration}ms {$transition_easing};}";

// Hover scale (skip if exactly 1.0 — no-op). Touch-safe: guarded via
// sgs_hover_state_rules() so a tap doesn't stick the scale on touchscreens.
if ( abs( $hover_scale - 1.0 ) > 0.001 ) {
	$scale_val          = round( $hover_scale, 3 );
	$scoped_css_parts[] = sgs_hover_state_rules( ".{$uid}.sgs-button", "transform:scale({$scale_val})" );
}

// Hover: colour hovers are CLASS-driven (Spec 32) via the --sgs-btn-*-hover vars
// — set as overrides in step 3 when customised, else from the preset class's
// `:hover` rule in style.css. Only the NON-colour hover effects are emitted here.
$hover_rules = array();

if ( 'underline' === $text_decoration_hover ) {
	$hover_rules[] = 'text-decoration:underline';
}

// Hover box shadow.
if ( '' !== $box_shadow_hover ) {
	$hover_rules[] = 'box-shadow:' . sgs_shadow_value_composed( $box_shadow_hover, $box_shadow_hover_colour );
}

if ( $hover_rules ) {
	$scoped_css_parts[] = sgs_hover_state_rules( ".{$uid}.sgs-button", implode( ';', $hover_rules ) );
}

// Icon hover colour.
if ( $icon_col_hov ) {
	$scoped_css_parts[] = sgs_hover_state_rules( ".{$uid}.sgs-button", 'color:' . sgs_colour_value( $icon_col_hov ), ':focus-visible', ' .sgs-button__icon' );
}

// Typography — base + tablet + mobile on the SAME selector (Pattern A),
// via the shared sgs_typography_css_rule() helper (D971/D972 full-replacement
// track; root prefix '' since this is a single-target block). Always
// emitted — every button is attribute-driven, there is no separate
// preset-locked mode any more.
$scoped_css_parts[] = sgs_typography_css_rule( $attributes, '', ".{$uid}.sgs-button" );

// Base padding/margin/border-radius — Box-object interface contract (b): the
// block declares __experimentalSkipSerialization on spacing + border.radius
// supports, so WP does NOT auto-inline these; $attributes['style'] is still
// populated, so emit as ONE scoped #uid rule via wp_style_engine_get_styles()
// (the stable core API WP core itself uses for `layout` support) instead of
// inline — mirrors sgs/container's wrapper pattern exactly.

$base_style_engine_args = array();
if ( ! empty( $base_spacing_padding ) || ! empty( $base_spacing_margin ) ) {
	$base_style_engine_args['spacing'] = array();
	if ( ! empty( $base_spacing_padding ) ) {
		$base_style_engine_args['spacing']['padding'] = $base_spacing_padding;
	}
	if ( ! empty( $base_spacing_margin ) ) {
		$base_style_engine_args['spacing']['margin'] = $base_spacing_margin;
	}
}
if ( null !== $base_border_radius ) {
	$base_style_engine_args['border'] = array( 'radius' => $base_border_radius );
}
if ( ! empty( $base_style_engine_args ) ) {
	$base_scoped_styles = wp_style_engine_get_styles(
		$base_style_engine_args,
		array( 'selector' => ".{$uid}.sgs-button" )
	);
	if ( ! empty( $base_scoped_styles['css'] ) ) {
		$scoped_css_parts[] = $base_scoped_styles['css'];
	}
}

// WP-native `color` support (skip-serialised) — a custom hex/rgb value set
// via the Styles panel is emitted scoped instead of auto-inlined. Preset
// slug values (textColor/backgroundColor) never reach $attributes['style'];
// those get the has-* classes in step 5 instead.
if ( '' !== $style_colour_text || '' !== $style_colour_bg ) {
	$colour_style_engine_args = array( 'color' => array() );
	if ( '' !== $style_colour_text ) {
		$colour_style_engine_args['color']['text'] = $style_colour_text;
	}
	if ( '' !== $style_colour_bg ) {
		$colour_style_engine_args['color']['background'] = $style_colour_bg;
	}
	$colour_scoped_styles = wp_style_engine_get_styles(
		$colour_style_engine_args,
		array( 'selector' => ".{$uid}.sgs-button" )
	);
	if ( ! empty( $colour_scoped_styles['css'] ) ) {
		$scoped_css_parts[] = $colour_scoped_styles['css'];
	}
}

// Responsive padding/margin/border-radius tiers — box-object attrs, hand-built
// shorthand (contract §2/§4). Tablet (≤1023px) then mobile (≤767px) on the
// SAME id-scoped selector as the base rule above, so plain source-order
// cascade (no !important needed) lets the narrower tier win.
// CSS border-radius shorthand order is top-left top-right bottom-right
// bottom-left (NOT the box-model top/right/bottom/left order).
$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );
$radius_tab_val  = sgs_corner_object_shorthand( $border_radius_tablet_obj );
$radius_mob_val  = sgs_corner_object_shorthand( $border_radius_mobile_obj );

$tablet_box_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_box_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_box_decls[] = "margin:{$margin_tab_val}";
}
if ( null !== $radius_tab_val ) {
	$tablet_box_decls[] = "border-radius:{$radius_tab_val}";
}
if ( $tablet_box_decls ) {
	$scoped_css_parts[] = '@media(max-width:1023px){' . ".{$uid}.sgs-button{" . implode( ';', $tablet_box_decls ) . ';}}';
}

$mobile_box_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_box_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_box_decls[] = "margin:{$margin_mob_val}";
}
if ( null !== $radius_mob_val ) {
	$mobile_box_decls[] = "border-radius:{$radius_mob_val}";
}
if ( $mobile_box_decls ) {
	$scoped_css_parts[] = '@media(max-width:767px){' . ".{$uid}.sgs-button{" . implode( ';', $mobile_box_decls ) . ';}}';
}

// Icon size CSS var — base + tablet + mobile on the SAME selector (Pattern A).
// Only emitted when an icon is present (matches the pre-existing contract —
// the base value is gated on $icon in the general helper via is_numeric()
// on 'icon-size'; explicitly gate the whole rule on $icon to avoid emitting
// tier-only vars with no icon to consume them).
if ( $icon ) {
	$scoped_css_parts[] = sgs_responsive_css_rule(
		$tier_object_synthetic_attrs,
		array(
			array(
				'attr'         => 'iconSize',
				'css'          => '--sgs-btn-icon-size',
				'unit_default' => 'px',
				'tablet_attr'  => 'iconSizeTablet',
				'mobile_attr'  => 'iconSizeMobile',
				'cast'         => 'int',
			),
		),
		".{$uid}.sgs-button"
	);
}

// Min-height — base + tablet + mobile on the SAME selector (Pattern A). Each
// tier has its OWN unit attribute (minHeightUnit / minHeightTabletUnit /
// minHeightMobileUnit) — the general helper assumes one shared unit per
// property family, so min-height is built by hand here rather than forced
// through it. Because the base value lives in this same-selector <style>
// rule (not inline on the element), the tier overrides do not need
// !important to win.
//
// The base tier is now ALWAYS emitted (falling back to style.css's own
// 48px default when no explicit minHeight is set) rather than only when
// $min_height was truthy. Root cause (2026-08-27, found live on the Mama's
// Munches canary clone — "Read the full story" + "Find out more" both
// computed min-height:0px): sgs/container's shrink-to-fit backstop
// (class-sgs-container-wrapper.php, `>*{min-width:0;min-height:0}` on its
// flex/grid direct children) matches at (0,2,0) specificity — TWO classes
// (.uid>.inner>*) — which beats this block's own base `.sgs-button{min-
// height:48px}` rule in style.css at (0,1,0).
//
// ⛔ CORRECTED 2026-08-27 (same day, caught by a live re-check before this
// "fix" shipped): emitting the SAME (0,2,0)-specificity selector here
// (`.{$uid}.sgs-button`) does NOT reliably resolve the tie. The claim that
// "this block's own <style> always renders after its parent container's"
// was measured FALSE live — the browser's own CSSOM confirmed the
// container's (0,2,0) rule can appear LATER than this one, so on an equal
// specificity tie the container still wins and min-height still computes
// to 0. The selector below repeats the uid class (`.{$uid}.{$uid}`) to
// reach (0,3,0) — strictly higher than the container's (0,2,0) — so this
// wins regardless of source order, not by a source-order assumption.
$min_height_base  = null !== $min_height ? $min_height : 48;
$min_height_decls = array( ".{$uid}.{$uid}.sgs-button{min-height:{$min_height_base}{$min_height_unit};}" );
if ( null !== $min_height_tab ) {
	$min_height_decls[] = "@media(max-width:1023px){.{$uid}.{$uid}.sgs-button{min-height:{$min_height_tab}{$min_height_tab_u};}}";
}
if ( null !== $min_height_mob ) {
	$min_height_decls[] = "@media(max-width:767px){.{$uid}.{$uid}.sgs-button{min-height:{$min_height_mob}{$min_height_mob_u};}}";
}
$scoped_css_parts[] = implode( '', $min_height_decls );

// Width — base + tablet + mobile on the SAME selector (Pattern A). Each tier's
// width derives from its own widthType enum: full → 100%, custom → value+unit,
// fit → auto, '' (tier only) → no override. Emitted via the scoped <style>
// (not inline) so a tier override reliably beats the base regardless of
// viewport; the base rule is declared before the @media tiers so normal
// source-order cascade lets a matched tier win. Full-width also relies on the
// wrapper's sgs-button-wrapper--full class (see step 8) to hold the line
// inside a flex-row parent (flex-basis:100%), which this id-scoped element
// width rule alone cannot guarantee.
$width_css_value = static function ( $type, $val, $unit ) {
	switch ( $type ) {
		case 'full':
			return '100%';
		case 'custom':
			return null !== $val ? $val . $unit : null;
		case 'fit':
			return 'auto';
		default:
			return null; // '' = inherit desktop / unknown = no override.
	}
};

$has_width_tier = ( '' !== $width_type_tab ) || ( '' !== $width_type_mob );
if ( $has_width_tier || 'custom' === $width_type || 'full' === $width_type ) {
	$width_decls = array();

	$base_width = $width_css_value( $width_type, $custom_width, $custom_width_unit );
	if ( null !== $base_width ) {
		$width_decls[] = ".{$uid}.sgs-button{width:{$base_width};}";
	}
	$tab_width = $width_css_value( $width_type_tab, $custom_width_tab, $custom_width_tab_u );
	if ( null !== $tab_width ) {
		$width_decls[] = "@media(max-width:1023px){.{$uid}.sgs-button{width:{$tab_width};}}";
	}
	$mob_width = $width_css_value( $width_type_mob, $custom_width_mob, $custom_width_mob_u );
	if ( null !== $mob_width ) {
		$width_decls[] = "@media(max-width:767px){.{$uid}.sgs-button{width:{$mob_width};}}";
	}

	if ( $width_decls ) {
		$scoped_css_parts[] = implode( '', $width_decls );
	}
}

// ---------------------------------------------------------------------------
// 5. Build CSS classes for the button element.
// ---------------------------------------------------------------------------

// Spec 32: the preset renders via a semantic BEM modifier class that consumes
// the per-client `--wp--custom--button-presets--{preset}--*` tokens (base +
// hover) in style.css. `inheritStyle` selects the preset; a 'custom'/unknown
// value emits NO modifier — the neutral base `.sgs-button` + any per-instance
// override vars govern (so a naked cloned link is NOT forced to a primary look).
$btn_classes = array( 'sgs-button' );
if ( in_array( $inherit_style, array( 'primary', 'secondary', 'outline' ), true ) ) {
	$btn_classes[] = 'sgs-button--' . $inherit_style;
}

// WP-native colour support (skip-serialised): re-add the standard preset
// has-* classes WP would otherwise emit itself, so a preset (as opposed to
// custom-hex) colour choice still paints via the theme's palette CSS.
if ( '' !== $preset_text_slug ) {
	$btn_classes[] = 'has-text-color';
	$btn_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$btn_classes[] = 'has-background';
	$btn_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

// Base margin is no longer built as an inline wrapper style — Box-object
// interface contract (b): it is WP-native style.spacing.margin, emitted
// scoped via wp_style_engine_get_styles() in step 4 above, never inline.

// ---------------------------------------------------------------------------
// 6. Build icon output.
// ---------------------------------------------------------------------------

// D636/D644 icon/SVG gradient siblings — non-empty wins over the flat
// iconColour/iconColourHover above at paint time (helpers-svg-gradient.php).
// Both states resolved together via sgs_icon_gradient_states_css()
// (2026-09-06 close-out) — lucide-only icon, so source is hardcoded. Hover
// trigger is the ANCESTOR (the whole button), matching $icon_col_hov's own
// flat-colour hover shape below — this replaces a hand-written
// ":hover,:focus-visible" compound selector that duplicated the ancestor
// shape without going through the touch-safe sgs_hover_state_rules() path.
$icon_colour_gradient       = isset( $attributes['iconColourGradient'] ) ? $attributes['iconColourGradient'] : '';
$icon_colour_hover_gradient = isset( $attributes['iconColourHoverGradient'] ) ? $attributes['iconColourHoverGradient'] : '';
$sgs_button_icon_grad_sel   = ".{$uid}.sgs-button .sgs-button__icon svg";
$sgs_button_stroke_grad     = sgs_icon_gradient_states_css( 'lucide', $icon_colour_gradient, $icon_colour_hover_gradient, $uid, $sgs_button_icon_grad_sel, ".{$uid}.sgs-button", ' .sgs-button__icon svg' );

$icon_html = '';
if ( $icon ) {
	$icon_svg = sgs_get_lucide_icon( $icon );
	$icon_svg = sgs_svg_inject_defs( $icon_svg, $sgs_button_stroke_grad['defs_base'] );
	$icon_svg = sgs_svg_inject_defs( $icon_svg, $sgs_button_stroke_grad['defs_hover'] );

	if ( $icon_svg ) {
		// For icon-only: inject a <title> into the SVG for screen readers.
		if ( 'only' === $icon_position && $icon_title ) {
			// Insert <title> as the first child of the SVG element.
			$icon_svg = preg_replace(
				'/(<svg[^>]*>)/i',
				'$1<title>' . $icon_title . '</title>',
				$icon_svg,
				1
			);
		}

		// Icon size + resting colour are CLIENT controls. NO-INLINE: this
		// block emits zero inline style property declarations. Contract +
		// mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
		// --check. Route them to the block's own scoped <style> (emitted at
		// step-4 below), mirroring the hover-icon-colour rule above. When no
		// explicit size is set, style.css's `.sgs-button__icon svg{width:1em}`
		// default already applies — so the size path emits nothing.
		if ( $icon_size ) {
			$scoped_css_parts[] = ".{$uid}.sgs-button .sgs-button__icon svg{width:{$icon_size}px;height:{$icon_size}px;}";
		}
		if ( $icon_colour ) {
			$scoped_css_parts[] = ".{$uid}.sgs-button .sgs-button__icon{color:" . sgs_colour_value( $icon_colour ) . ';}';
		}
		if ( $sgs_button_stroke_grad['css'] ) {
			$scoped_css_parts = array_merge( $scoped_css_parts, $sgs_button_stroke_grad['css'] );
		}

		// wp_kses with SVG allowance for the icon.
		// Deliberately narrower than the shared sgs_svg_kses_allowed_tags()
		// (includes/helpers-svg-kses.php): icons here are static Lucide glyphs
		// (path/circle/rect/line/polyline/polygon/ellipse/g/title), never gradient-
		// filled, filtered, masked, referenced (<use>/<symbol>), or animated. This
		// list excludes the shared helper's defs/use/symbol/text/tspan/textpath/
		// image/clippath/mask/marker/pattern/*gradient/stop/filter + filter-primitive
		// tags/desc/metadata/animate/a. If a future icon set needs any of those,
		// diff against sgs_svg_kses_allowed_tags() again rather than widening ad hoc.
		$allowed_svg = array(
			'svg'      => array(
				'class'           => true,
				'xmlns'           => true,
				'width'           => true,
				'height'          => true,
				'viewbox'         => true,
				'fill'            => true,
				'stroke'          => true,
				'stroke-width'    => true,
				'stroke-linecap'  => true,
				'stroke-linejoin' => true,
				'aria-hidden'     => true,
			),
			'path'     => array(
				'd'      => true,
				'fill'   => true,
				'stroke' => true,
			),
			'circle'   => array(
				'cx'     => true,
				'cy'     => true,
				'r'      => true,
				'fill'   => true,
				'stroke' => true,
			),
			'rect'     => array(
				'x'      => true,
				'y'      => true,
				'width'  => true,
				'height' => true,
				'rx'     => true,
				'ry'     => true,
				'fill'   => true,
				'stroke' => true,
			),
			'line'     => array(
				'x1'     => true,
				'y1'     => true,
				'x2'     => true,
				'y2'     => true,
				'stroke' => true,
			),
			'polyline' => array(
				'points' => true,
				'fill'   => true,
				'stroke' => true,
			),
			'polygon'  => array(
				'points' => true,
				'fill'   => true,
				'stroke' => true,
			),
			'ellipse'  => array(
				'cx'     => true,
				'cy'     => true,
				'rx'     => true,
				'ry'     => true,
				'fill'   => true,
				'stroke' => true,
			),
			'title'    => array(),
			'g'        => array(
				'fill'      => true,
				'stroke'    => true,
				'transform' => true,
			),
		);

		$icon_html = sprintf(
			'<span class="sgs-button__icon" aria-hidden="true">%s</span>',
			wp_kses( $icon_svg, $allowed_svg )
		);
	}
}

// labelCollapse clips the visible label from the chosen breakpoint down,
// keeping it in the accessibility tree. Only emit the clip rule when the
// button actually has an icon — with no icon, collapsing the label would
// leave an empty button.
if ( $icon_html && 'none' !== $label_collapse ) {
	$label_clip      = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
	$label_clip_rule = ".{$uid}.sgs-button .sgs-button__label{" . $label_clip . '}';
	if ( 'all' === $label_collapse ) {
		$scoped_css_parts[] = $label_clip_rule;
	} elseif ( 'tablet' === $label_collapse ) {
		$scoped_css_parts[] = '@media(max-width:1023px){' . $label_clip_rule . '}';
	} elseif ( 'mobile' === $label_collapse ) {
		$scoped_css_parts[] = '@media(max-width:767px){' . $label_clip_rule . '}';
	}
}

// ---------------------------------------------------------------------------
// 7. Build the button inner content.
// ---------------------------------------------------------------------------

// XS-9.2 (2026-05-30): label is rich-text. Tightened wp_kses allowlist deliberately
// EXCLUDES <a> — nested anchors inside <a>/<button> wrappers are invalid HTML
// and a phishing vector. <span class=...> is allowed for icon/styling spans.
// The label is wrapped in a `.sgs-button__label` span (rather than emitted
// bare) so the labelCollapse feature can visually clip it while keeping the
// text in the accessibility tree.
$label_html = '<span class="sgs-button__label">' . wp_kses(
	$label,
	array(
		'br'     => array(),
		'strong' => array(),
		'b'      => array(),
		'em'     => array(),
		'i'      => array(),
		'span'   => array( 'class' => true ),
		'code'   => array(),
	)
) . '</span>';

if ( $icon_html ) {
	if ( 'before' === $icon_position ) {
		$inner_html = $icon_html . $label_html;
	} elseif ( 'only' === $icon_position ) {
		$inner_html = $icon_html;
	} else {
		// 'after' (default).
		$inner_html = $label_html . $icon_html;
	}
} else {
	$inner_html = $label_html;
}

// ---------------------------------------------------------------------------
// 8. Build element attributes.
// ---------------------------------------------------------------------------

$btn_style_str = $inline_styles ? implode( ';', $inline_styles ) . ';' : '';
$btn_class_str = implode( ' ', $btn_classes );

// Whitelist to prevent arbitrary attribute-value injection.
$allowed_presets    = array( 'primary', 'secondary', 'outline' );
$safe_inherit_style = in_array( $inherit_style, $allowed_presets, true ) ? $inherit_style : 'primary';

// The <a>/<button> IS the block root (no intermediate wrapper div — D288): the
// button's own identity class + inline styles merge into the block-wrapper attrs
// so the element is the DIRECT flex child of sgs/multi-button. This lets a column
// flex `align-items:stretch` stretch the button itself (full-width mobile stack)
// instead of a dead wrapper div. Full-width is the `sgs-button--full` modifier.
$full_modifier = ( 'full' === $width_type ) ? ' sgs-button--full' : '';
$merged_class  = trim( $btn_class_str . $full_modifier );
// $merged_style carries ONLY custom-property VALUES ($inline_styles from step
// 3) — base padding/margin/border-radius/border-width are scoped <style>
// rules (step 4), never inline (Box-object interface contract (b)).
$merged_style = trim( $btn_style_str );

// D345 (Spec 32 FR-32-4 as amended 2026-07-18): the per-instance custom-property
// VALUES ($inline_styles — --sgs-btn-color/bg/border + hover variants + icon-gap)
// emit as a scoped `.{uid}.sgs-button{…}` rule in the block's <style> (consolidated
// by the CSS registry), NOT inline on the element. Inline `--var` is forbidden — it
// leaves a `style` attribute on the root AND breaks any `[style*="--var"]` gate.
// style.css's `:hover` rules consume these vars via var() on the SAME element
// regardless of where the custom properties are declared, so behaviour is identical.
if ( '' !== $merged_style ) {
	$scoped_css_parts[] = ".{$uid}.sgs-button{" . $merged_style . '}';
}

// --- Border gradient (D636 border builder) — masked ::before, replaces the
// flat --sgs-btn-border* custom-property scheme above when set (border-color
// can never legally hold a gradient value). ---
if ( '' !== $colour_border_gradient ) {
	$scoped_css_parts[] = sgs_border_gradient_css(
		".{$uid}.sgs-button",
		$colour_border_gradient,
		'' !== $colour_border_hover_gradient ? $colour_border_hover_gradient : sgs_colour_value( $colour_border_hover ),
		$has_border_width ? ( '' !== $border_width_top ? $border_width_top : '1px' ) : '1px'
	);
}

// --- Text-colour gradient (colourTextGradient/colourTextHoverGradient) —
// D636 sibling recipe: the gradient wins over the flat colourText/
// colourTextHover when set+valid. UNLIKE every other gradient on this
// block, text needs a precondition check first (CLAUDE.md "Real text
// gradient" — plugins/sgs-blocks/CLAUDE.md): `.sgs-button`'s base rule +
// all three presets (style.css) paint the button's OWN background on the
// EXACT SAME selector a text colour targets, and `background-clip:text`
// (which sgs_text_colour_decl() emits for a gradient) clips whatever
// background that selector paints to the glyph shapes — it would erase the
// button's own fill.
//
// So the background is moved onto a `.{uid}.sgs-button::after` layer, but
// ONLY for THIS INSTANCE and ONLY when a text gradient is actually valid —
// gated on sgs_css_gradient_value() returning non-empty, not merely on the
// attribute being set. Every other button on every site keeps rendering
// through the shared class-driven rules in style.css completely untouched
// (this whole block is byte-identical no-op for a flat-colour button).
//
// Hand-built rather than a call to sgs_block_background_layer_css(): that
// helper takes an already-resolved paint declaration, but sgs/button's
// background is CLASS-driven through a --sgs-btn-bg*/--sgs-btn-bg-image*
// var() chain (Spec 32 FR-32-2 — three presets + a per-instance override +
// an sgs/multi-button group default; see style.css's own file-header
// comment) that this file never resolves to a literal value. Moving that
// SAME var() chain from `.sgs-button`'s own background-* onto
// `.{uid}.sgs-button::after`'s background-* — and neutralising it on the
// element itself — reproduces the identical resolved paint through the
// exact same vars, so whichever preset/override would have won still wins.
//
// Specificity: the doubled `.{uid}.{uid}.sgs-button` selector (0,3,0) is used
// for the RESTING override rather than the usual single `.{uid}.sgs-button`
// (0,2,0) — style.css's shared `.sgs-button:hover,.sgs-button:focus-visible`
// rule is ALSO (0,2,0), so a single-uid resting rule would only beat it by
// document order, which this file's own min-height comment (step 4) records
// as measured FALSE in some bundling scenarios. The doubled selector beats
// (0,2,0) unconditionally, matching that precedent (Pattern A elsewhere in
// this file already uses the same trick for the same reason).
$text_gradient_value       = sgs_css_gradient_value( $colour_text_gradient );
$text_gradient_hover_value = sgs_css_gradient_value( $colour_text_hover_gradient );

if ( '' !== $text_gradient_value || '' !== $text_gradient_hover_value ) {
	$btn_sel        = ".{$uid}.sgs-button";
	$btn_sel_strong = ".{$uid}.{$uid}.sgs-button";

	// Neutralise the element's own background (it now paints on ::after) and
	// establish the stacking context the negative z-index layer needs.
	$scoped_css_parts[] = "{$btn_sel_strong}{position:relative;isolation:isolate;background-color:transparent;background-image:none;}";
	$scoped_css_parts[] = "{$btn_sel}::after{content:\"\";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;background-color:var(--sgs-btn-bg, var(--sgs-mb-btn-bg-default, transparent));background-image:var(--sgs-btn-bg-image, none);}";
	// Hover/focus repaint the ::after layer with the SAME hover var chain the
	// shared stylesheet would otherwise have applied to the element itself.
	$scoped_css_parts[] = sgs_hover_state_rules(
		$btn_sel,
		'background-color:var(--sgs-btn-bg-hover, var(--sgs-btn-bg, var(--sgs-mb-btn-bg-default, transparent)));background-image:var(--sgs-btn-bg-hover-image, var(--sgs-btn-bg-image, none))',
		':focus-visible',
		'::after'
	);

	if ( '' !== $text_gradient_value ) {
		$text_gradient_decl = sgs_text_colour_decl( $text_gradient_value );
		if ( '' !== $text_gradient_decl ) {
			$scoped_css_parts[] = "{$btn_sel_strong}{{$text_gradient_decl};}";
		}
		// MANDATORY companion (helpers-tokens.php docblock) — old-browser
		// fallback for a gradient text colour; targets the exact same
		// selector the decl above was emitted onto.
		$scoped_css_parts[] = sgs_text_colour_gradient_fallback_rule( $btn_sel_strong, $text_gradient_value );
	}

	if ( '' !== $text_gradient_hover_value ) {
		$text_gradient_hover_decl = sgs_text_colour_decl( $text_gradient_hover_value );
		if ( '' !== $text_gradient_hover_decl ) {
			$scoped_css_parts[] = sgs_hover_state_rules( $btn_sel, $text_gradient_hover_decl . ';', ':focus-visible' );
		}
		// Hover-state fallback — same touch-safe wrapping as sgs/heading's own
		// hover-gradient fallback (D636 precedent): the guarded :hover branch
		// goes through sgs_hover_media_wrap() + SGS_HOVER_NOT_TOUCH (the
		// @supports rule can't be injected into by sgs_hover_guarded_rule()
		// itself, since it isn't a plain selector/decl pair), and the
		// keyboard-reachable :focus-visible branch is unguarded.
		$text_gradient_hover_fallback = sgs_hover_media_wrap(
			sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $btn_sel . ':hover', $text_gradient_hover_value )
		) . sgs_text_colour_gradient_fallback_rule( $btn_sel . ':focus-visible', $text_gradient_hover_value );
		if ( '' !== $text_gradient_hover_fallback ) {
			$scoped_css_parts[] = $text_gradient_hover_fallback;
		}
	}
}

$wrapper_attr = get_block_wrapper_attributes(
	array(
		'id'          => $uid,
		// D303: $uid is ALSO a class so the class-scoped per-instance rules
		// (`.{$uid}.sgs-button` = 0,2,0, never `#uid`) match this element and can be
		// overridden by the appended sgsCustomCss residual by source order.
		'class'       => trim( $merged_class . ' ' . $uid ),
		'data-preset' => $safe_inherit_style,
	)
);

// ---------------------------------------------------------------------------
// 9. Render.
// ---------------------------------------------------------------------------

// Scoped CSS block.
$allowed_css_tags = array(
	'style' => array(),
);
if ( $scoped_css_parts ) {
	// Class-level compound selector (`.{$uid}.sgs-button`), matching the seven other
	// scoped rules in this file. The uid and the class sit on the SAME element, so an
	// ID selector (`#{$uid} .sgs-button`) would be a descendant combinator and match
	// zero elements. Class level is also required by Spec 32 §6.1(b)/D303, so the
	// client's sgsCustomCss residual can win.
	$raw_css = implode( '', $scoped_css_parts )
		. "@media(prefers-reduced-motion:reduce){.{$uid}.sgs-button{transition:none !important;transform:none !important;}}";
	// wp_strip_all_tags (not esc_html) matches the proven SGS_Container_Wrapper
	// pattern: it blocks a </style> breakout while leaving CSS combinators like
	// `>` intact (esc_html would turn `>` into &gt; and break any descendant rule).
	// Every value reaching $raw_css is pre-sanitised (sgs_css_length_value() / sgs_css_keyword_sanitise()
	// / wp_style_engine_get_styles), so no un-sanitised value survives to here.
	echo '<style>' . wp_strip_all_tags( $raw_css ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style>
}

// Allowed tags for icon SVG + label output.
// The SVG portion below is a second, independent local allowlist — same deliberate
// narrowing rationale as $allowed_svg above (static Lucide icons only), not a
// duplicate to be merged away. Keep both in sync if the icon set's needs change.
$allowed_inner = array_merge(
	wp_kses_allowed_html( 'post' ),
	array(
		'svg'      => array(
			'xmlns'           => true,
			'width'           => true,
			'height'          => true,
			'viewbox'         => true,
			'fill'            => true,
			'stroke'          => true,
			'stroke-width'    => true,
			'stroke-linecap'  => true,
			'stroke-linejoin' => true,
			'class'           => true,
			'aria-hidden'     => true,
			'focusable'       => true,
			'role'            => true,
		),
		'path'     => array(
			'd'      => true,
			'fill'   => true,
			'stroke' => true,
		),
		'circle'   => array(
			'cx'     => true,
			'cy'     => true,
			'r'      => true,
			'fill'   => true,
			'stroke' => true,
		),
		'line'     => array(
			'x1' => true,
			'y1' => true,
			'x2' => true,
			'y2' => true,
		),
		'polyline' => array( 'points' => true ),
		'polygon'  => array( 'points' => true ),
		'rect'     => array(
			'x'      => true,
			'y'      => true,
			'width'  => true,
			'height' => true,
			'rx'     => true,
			'ry'     => true,
		),
		'title'    => array(),
		'span'     => array(
			'class' => true,
			'style' => true,
		),
	)
);

// Build the element.
if ( 'button' === $tag_name ) {
	$type_attr = $is_submit ? 'submit' : 'button';
	$aria_str  = ( $has_explicit_aria || 'only' === $icon_position ) ? ' aria-label="' . esc_attr( $aria_label ) . '"' : '';

	echo '<button type="' . esc_attr( $type_attr ) . '"' . $aria_str . ' ' . $wrapper_attr . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $aria_str built with esc_attr(); get_block_wrapper_attributes() is trusted WP output
	echo wp_kses( $inner_html, $allowed_inner );
	echo '</button>';
} else {
	// <a> element.
	if ( $rel ) {
		$rel_attr = ' rel="' . esc_attr( $rel ) . '"';
	} elseif ( '_blank' === $link_target ) {
		$rel_attr = ' rel="noopener noreferrer"';
	} else {
		$rel_attr = '';
	}

	$target_attr   = ( $link_target && '_self' !== $link_target ) ? ' target="' . esc_attr( $link_target ) . '"' : '';
	$download_attr = $download ? ' download' : '';
	$aria_str      = ( $has_explicit_aria || 'only' === $icon_position ) ? ' aria-label="' . esc_attr( $aria_label ) . '"' : '';

	echo '<a href="' . esc_url( $url ) . '"' . $target_attr . $rel_attr . $download_attr . $aria_str . ' ' . $wrapper_attr . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $target_attr/$rel_attr/$download_attr/$aria_str all built with esc_attr(); get_block_wrapper_attributes() is trusted WP output
	echo wp_kses( $inner_html, $allowed_inner );
	echo '</a>';
}
