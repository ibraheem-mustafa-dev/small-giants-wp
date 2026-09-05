<?php
/**
 * SGS Multi-Button -- server-side render.
 *
 * Outputs a flex container wrapping one or more sgs/button children.
 * Responsive layout is scoped per-instance via a unique ID.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks (sgs/button instances).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

/**
 * `flexDirection`/`flexWrap`/`alignItems`/`justifyContent` are TIER OBJECTS
 * (Spec 35 pass, {desktop,tablet,mobile}), read via the shared normaliser so
 * an unset attr resolves to `[]` rather than reading a raw array into
 * `esc_attr()`.
 */
$direction_obj    = sgs_responsive_normalise_object( $attributes['flexDirection'] ?? null );
$direction        = esc_attr( $direction_obj['desktop'] ?? 'row' );
$direction_tablet = esc_attr( $direction_obj['tablet'] ?? $direction );
$direction_mobile = esc_attr( $direction_obj['mobile'] ?? 'column' );

// Gap: resolved via the shared helper (handles preset slugs + raw CSS lengths + back-compat).
// Falls back to "12px" matching the block.json default.
// Back-compat: pre-consolidation posts stored a numeric (int) gap value; the old render
// appended "px" via absint(). Append "px" to digit-only strings before the helper so
// sgs_container_gap_value() treats them as raw CSS lengths, not WP preset slugs.
// `gap` is a TIER OBJECT (Spec 35 pass 1, 2026-08-10). ⛔ Never cast it to string —
// it is an ARRAY, and casting emits "Array to string conversion" on every render plus
// literal `gap:Array` in the CSS. Each tier keeps the fallback it had as a flat sibling.
$gap_obj = sgs_responsive_normalise_object( $attributes['gap'] ?? null );
$gap_raw = (string) ( $gap_obj['desktop'] ?? '' );
if ( '' === $gap_raw ) {
	$gap_raw = '12px';
}
if ( preg_match( '/^\d+$/', $gap_raw ) ) {
	$gap_raw = $gap_raw . 'px';
}
$gap_css = sgs_container_gap_value( $gap_raw );
if ( '' === $gap_css ) {
	$gap_css = '12px';
}
$gap_tab_raw = (string) ( $gap_obj['tablet'] ?? '' );
if ( '' !== $gap_tab_raw ) {
	if ( preg_match( '/^\d+$/', $gap_tab_raw ) ) {
		$gap_tab_raw = $gap_tab_raw . 'px';
	}
	$gap_tab_css = sgs_container_gap_value( $gap_tab_raw );
	if ( '' === $gap_tab_css ) {
		$gap_tab_css = $gap_css;
	}
} else {
	$gap_tab_css = $gap_css;
}
$gap_mob_raw = (string) ( $gap_obj['mobile'] ?? '' );
if ( '' === $gap_mob_raw ) {
	$gap_mob_raw = '8px';
}
if ( '' !== $gap_mob_raw ) {
	if ( preg_match( '/^\d+$/', $gap_mob_raw ) ) {
		$gap_mob_raw = $gap_mob_raw . 'px';
	}
	$gap_mob_css = sgs_container_gap_value( $gap_mob_raw );
	if ( '' === $gap_mob_css ) {
		$gap_mob_css = '8px';
	}
} else {
	$gap_mob_css = '8px';
}

$justify_content_obj    = sgs_responsive_normalise_object( $attributes['justifyContent'] ?? null );
$justify_content        = esc_attr( $justify_content_obj['desktop'] ?? 'flex-start' );
$justify_content_tablet = esc_attr( $justify_content_obj['tablet'] ?? $justify_content );
$justify_content_mobile = esc_attr( $justify_content_obj['mobile'] ?? $justify_content );

// Default `nowrap` = the CSS initial value (D228: a hardcoded non-initial default
// that overrides the draft's faithfully-ABSENT flex-wrap is a cheat to remove). A
// draft button group with no `flex-wrap` (e.g. `.sgs-hero__ctas`) is `nowrap` — the
// buttons stay in a ROW (shrinking to fit) until the device-tier `flex-direction`
// switches to column at 767px.
$wrap_obj    = sgs_responsive_normalise_object( $attributes['flexWrap'] ?? null );
$wrap        = esc_attr( $wrap_obj['desktop'] ?? 'nowrap' );
$wrap_tablet = esc_attr( $wrap_obj['tablet'] ?? $wrap );
$wrap_mobile = esc_attr( $wrap_obj['mobile'] ?? 'nowrap' );

$align_items_obj = sgs_responsive_normalise_object( $attributes['alignItems'] ?? null );
$align_items     = esc_attr( $align_items_obj['desktop'] ?? 'center' );
// Cross-axis alignment is responsive (D288). Mobile defaults to `stretch` — mobile
// is a flex COLUMN (directionMobile default 'column'), and `stretch` is the CSS
// column default, so the cloned/authored buttons stack FULL-WIDTH on mobile like a
// draft's default column flex. Tablet (a row by default) inherits the base value.
$align_items_tablet = esc_attr( $align_items_obj['tablet'] ?? $align_items );
$align_items_mobile = esc_attr( $align_items_obj['mobile'] ?? 'stretch' );

// Generate a unique ID so responsive CSS is scoped per block instance.
$uid      = wp_unique_id( 'sgs-mb-' );
$root_sel = '.' . $uid . '.sgs-multi-button';

// Build scoped responsive CSS using concatenation (WPCS: no variable interpolation in strings).
$css  = $root_sel . '{';
$css .= 'display:flex;';
$css .= 'flex-direction:' . $direction . ';';
$css .= 'flex-wrap:' . $wrap . ';';
$css .= 'gap:' . $gap_css . ';';
$css .= 'justify-content:' . $justify_content . ';';
$css .= 'align-items:' . $align_items . ';';
$css .= '}';

// Tablet breakpoint (768px to 1023px — device-tier standard, CLAUDE.md
// "Responsive breakpoint discipline").
$css .= '@media(max-width:1023px) and (min-width:768px){';
$css .= $root_sel . '{';
$css .= 'flex-direction:' . $direction_tablet . ';';
$css .= 'flex-wrap:' . $wrap_tablet . ';';
$css .= 'gap:' . $gap_tab_css . ';';
$css .= 'justify-content:' . $justify_content_tablet . ';';
$css .= 'align-items:' . $align_items_tablet . ';';
$css .= '}}';

// Mobile breakpoint (max 767px — device-tier standard; was 768px, see above).
$css .= '@media(max-width:767px){';
$css .= $root_sel . '{';
$css .= 'flex-direction:' . $direction_mobile . ';';
$css .= 'flex-wrap:' . $wrap_mobile . ';';
$css .= 'gap:' . $gap_mob_css . ';';
$css .= 'justify-content:' . $justify_content_mobile . ';';
$css .= 'align-items:' . $align_items_mobile . ';';
$css .= '}}';

// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// Emit them scoped to the SAME `#{uid}.sgs-multi-button` selector the flex
// CSS already targets, via the stable core style engine (mirrors sgs/label's
// pattern).

$mb_color_border = array();
// D635-pattern migration: text now reads from the flat textColour attr
// (SgsColourPanel), not native style.color.text (supports.color.text is now
// false). Background (colour + gradient, resting + hover) is owned by the
// shared fill emitter below, NOT by the style engine and NOT by
// supports.color.gradients.
//
// supports.color.gradients was `true` here, so CORE rendered its own gradient
// panel in the Styles tab, competing with the SGS colour panel — the client
// saw two and could not tell which won. Switching the flag off alone would
// have REMOVED the only gradient control this block had, because the sole
// gradient read was $attributes['style']['color']['gradient'] (core's own
// storage). The flag flip is therefore PAIRED with a block-private
// backgroundColourGradient exposed through fillRow(), so capability is moved
// rather than lost.
$mb_color_args = array();
if ( isset( $attributes['textColour'] ) && '' !== $attributes['textColour'] ) {
	$mb_color_args['text'] = (string) $attributes['textColour'];
}
if ( ! empty( $mb_color_args ) ) {
	$mb_color_border['color'] = $mb_color_args;
}
$mb_fill_css = sgs_fill_states_css(
	$root_sel,
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
if ( '' !== $mb_fill_css ) {
	$css .= $mb_fill_css;
}
// Base padding/margin are NOT read here (2026-08-27). They were, and that was a
// genuine DOUBLE EMISSION: this block calls SGS_Container_Wrapper::render() below
// with kind='content' and no `container_queries` opt, so the wrapper's own base
// spacing branch (class-sgs-container-wrapper.php:1904-1937) already read the very
// same values and painted them on ITS scoped selector — while the block re-painted
// them on `.{uid}.sgs-multi-button`. One value, two selectors.
//
// Now that base spacing lives in the block-OWNED `padding`/`margin` attrs, the
// wrapper's owned-attr-first branch picks them up automatically (it is ungated by
// slug, container_kind or any roster), so the wrapper is the SINGLE emitter and the
// fold that stood here is deleted rather than redirected.
// ⛔ Do NOT pass `container_queries => true` for this block to "fix" anything: that
// flag DISABLES the owned-attr read and silently falls it back to native spacing,
// which no longer exists here.
if ( ! empty( $mb_color_border ) ) {
	$mb_style_engine_css = wp_style_engine_get_styles(
		$mb_color_border,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $mb_style_engine_css['css'] ) ) {
		$css .= $mb_style_engine_css['css'];
	}
}

// Preset colour/gradient SLUGS (e.g. backgroundColor:"primary") don't carry a raw
// value for the style engine above — WP paints them via the standard has-* classes
// instead. Re-add those classes onto the wrapper (mirrors sgs/label's step 5).
$mb_preset_classes       = array();
$mb_preset_bg_slug       = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
$mb_preset_text_slug     = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$mb_preset_gradient_slug = isset( $attributes['gradient'] ) ? sanitize_html_class( $attributes['gradient'] ) : '';
if ( '' !== $mb_preset_bg_slug ) {
	$mb_preset_classes[] = 'has-background';
	$mb_preset_classes[] = 'has-' . $mb_preset_bg_slug . '-background-color';
}
if ( '' !== $mb_preset_text_slug ) {
	$mb_preset_classes[] = 'has-text-color';
	$mb_preset_classes[] = 'has-' . $mb_preset_text_slug . '-color';
}
if ( '' !== $mb_preset_gradient_slug ) {
	$mb_preset_classes[] = 'has-background';
	$mb_preset_classes[] = 'has-' . $mb_preset_gradient_slug . '-gradient-background';
}

// A2 (D638 §4/§5) — child-button GROUP DEFAULTS, a CSS custom-property
// fallback chain, NOT the Block Context API and NOT editor-time copy-on-
// insert (both rejected, see decisions.md D638 §4). Emitted here as
// `--sgs-mb-btn-<prop>-default` custom properties on THIS block's own
// wrapper element; button/style.css consumes each one as the SECOND
// fallback tier of its own `--sgs-btn-*` var (colour props) or as the FIRST
// var() wrapped around a value (radius/font-size/font-weight — sgs/button
// has no per-instance custom property for those, it wins on selector
// specificity instead, see button/style.css's docblock addition). Custom
// properties are explicitly allowed inline (Spec 32 no-inline contract only
// bans REAL property declarations), so these route through SGS_Container_Wrapper's
// `extra_styles` opt exactly like any other --sgs-* var elsewhere in this
// codebase.
//
// Sanitisation: colours reuse the shared sgs_colour_value() token-or-literal
// resolver (defined in includes/helpers-tokens.php, already loaded via
// render-helpers.php above). Radius/font-size are free-form CSS length
// strings from a TextControl — strip anything that isn't a digit/letter/dot/
// percent so a value can never break out of the custom-property declaration.
// Font-weight is a SelectControl-constrained numeric string (100-900); cast
// through absint() so only a bare number can ever reach the declaration.
$mb_child_defaults = array();
$mb_css_length     = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};
if ( isset( $attributes['childBtnBackground'] ) && '' !== $attributes['childBtnBackground'] ) {
	$mb_child_defaults[] = '--sgs-mb-btn-bg-default:' . sgs_colour_value( (string) $attributes['childBtnBackground'] );
}
if ( isset( $attributes['childBtnTextColour'] ) && '' !== $attributes['childBtnTextColour'] ) {
	$mb_child_defaults[] = '--sgs-mb-btn-color-default:' . sgs_colour_value( (string) $attributes['childBtnTextColour'] );
}
if ( isset( $attributes['childBtnBorderColour'] ) && '' !== $attributes['childBtnBorderColour'] ) {
	$mb_child_defaults[] = '--sgs-mb-btn-border-default:' . sgs_colour_value( (string) $attributes['childBtnBorderColour'] );
}
// 2026-08-30 owner decision (Residual 1, scoped-to-multi-button option). Consumed
// by a `:where(.sgs-multi-button) .sgs-button` rule in button/style.css -- zero
// specificity ancestor, so it never outranks a preset's own border and never
// matches a standalone button (see that rule's comment for the full reasoning).
$mb_child_border_width           = is_array( $attributes['childBtnBorderWidth'] ?? null ) ? $attributes['childBtnBorderWidth'] : array();
$mb_child_border_width_shorthand = sgs_box_object_shorthand( $mb_child_border_width );
if ( null !== $mb_child_border_width_shorthand ) {
	$mb_child_defaults[] = '--sgs-mb-btn-border-width-default:' . $mb_child_border_width_shorthand;
}
if ( isset( $attributes['childBtnBorderStyle'] ) && '' !== $attributes['childBtnBorderStyle'] ) {
	$mb_child_defaults[] = '--sgs-mb-btn-border-style-default:' . sgs_css_keyword_sanitise( (string) $attributes['childBtnBorderStyle'] );
}
if ( isset( $attributes['childBtnBorderRadius'] ) && '' !== $attributes['childBtnBorderRadius'] ) {
	$mb_child_defaults[] = '--sgs-mb-btn-radius-default:' . $mb_css_length( $attributes['childBtnBorderRadius'] );
}
if ( isset( $attributes['childBtnFontSize'] ) && '' !== $attributes['childBtnFontSize'] ) {
	$mb_child_defaults[] = '--sgs-mb-btn-font-size-default:' . $mb_css_length( $attributes['childBtnFontSize'] );
}
if ( isset( $attributes['childBtnFontWeight'] ) && '' !== $attributes['childBtnFontWeight'] ) {
	$mb_child_defaults[] = '--sgs-mb-btn-font-weight-default:' . absint( $attributes['childBtnFontWeight'] );
}

// WS-4: the outer wrapper is now the shared sgs/container element. multi-button keeps
// its own scoped flex CSS (#uid.sgs-multi-button) + the id via extra_attrs; the buttons
// ($content) become the interior. The mirror adds the container width capability.

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
		$css .= $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
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
		$css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// wp_strip_all_tags (NOT esc_html) blocks a `</style>` breakout while leaving CSS
// combinators intact (contract §D) — every value reaching $css is either hand-built
// from sanitised scalars above or the output of wp_style_engine_get_styles().
$mb_style = '<style>' . wp_strip_all_tags( $css ) . '</style>';

// ⛔ kind MUST stay 'content'. Do NOT set kind='layout' here (STOP-43).
// 'layout' makes SGS_Container_Wrapper emit its own display:flex / flex-wrap /
// align-items / flex-direction as an INLINE style on this same element, built from
// the separate non-responsive $attributes['flexDirection']. An inline style always
// beats the #uid.sgs-multi-button <style> rule above regardless of specificity or
// @media, so ANY non-empty flexDirection (the cloning converter always sets one)
// pins flex-direction at every viewport and permanently disables this block's own
// direction/directionTablet/directionMobile responsive system.
// 'content' is correct because multi-button already owns display/flex-wrap/gap/
// justify-content/align-items/flex-direction responsively above and needs only the
// width/contentWidth mirror (align/maxWidth/contentWidth + padding/spacing) — the
// same pattern as sgs/quote, sgs/testimonial and sgs/product-card.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $mb_style CSS is wp_strip_all_tags()'d; SGS_Container_Wrapper::render() escapes its output internally; $content is WP-rendered inner blocks.
echo $mb_style . SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'content',
	array(
		'tag'           => 'div',
		'extra_classes' => array_merge( array( 'sgs-multi-button', $uid ), $mb_preset_classes ),
		'extra_attrs'   => array( 'id' => esc_attr( $uid ) ),
		'extra_styles'  => $mb_child_defaults,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
