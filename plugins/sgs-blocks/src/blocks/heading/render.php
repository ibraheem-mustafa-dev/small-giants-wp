<?php
/**
 * Server-side render for sgs/heading.
 *
 * HeadingRole=heading    - emits the HTML tag from the level attr (h1-h6).
 * HeadingRole=subheading - emits the HTML tag from the subTag attr (p or div).
 *
 * Typography, spacing, colour and wrapper-level controls apply identically
 * for both roles. The subheading role applies CSS-fallback defaults via a
 * BEM modifier class for fontWeight (400) and textColour (text-muted) when
 * the attrs are still at their schema defaults.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
 * --check.
 *
 * BOX-GROUP (contract §B): padding / margin / border-width are box objects.
 * Base padding/margin/border-radius = WP-native style.spacing.* /
 * style.border.radius objects (emitted scoped via wp_style_engine_get_styles);
 * tiers = paddingTablet/paddingMobile/marginTablet/marginMobile object attrs
 * (scoped @media 1023/767); border-width = SGS custom object attr.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused - dynamic block).
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

// ---------------------------------------------------------------------------
// 1. Allowed units whitelist + numeric-length helper.
// ---------------------------------------------------------------------------

if ( ! function_exists( 'sgs_heading_safe_unit' ) ) {
	/**
	 * Sanitise a CSS length unit - falls back to px if the value is not allowed.
	 * Guarded by function_exists to allow multiple includes in one request.
	 *
	 * @param string $unit     User-supplied unit.
	 * @param string $fallback Fallback unit.
	 * @return string          Sanitised unit.
	 */
	function sgs_heading_safe_unit( $unit, $fallback = 'px' ) {
		static $allowed = array( 'px', 'em', 'rem', '%', 'vh', 'vw' );
		$unit           = sanitize_text_field( (string) $unit );
		return in_array( $unit, $allowed, true ) ? $unit : $fallback;
	}
}

if ( ! function_exists( 'sgs_heading_spacing_val' ) ) {
	/**
	 * Convert a raw numeric spacing value + unit string to a CSS length.
	 * Returns empty string for blank or non-numeric input.
	 *
	 * @param string $value Raw attribute value.
	 * @param string $unit  Validated CSS unit.
	 * @return string       CSS length string or empty string.
	 */
	function sgs_heading_spacing_val( $value, $unit ) {
		$trimmed = trim( (string) $value );
		if ( '' === $trimmed ) {
			return '';
		}
		if ( ! preg_match( '/^-?\d+(\.\d+)?$/', $trimmed ) ) {
			return '';
		}
		return $trimmed . $unit;
	}
}

// ---------------------------------------------------------------------------
// 2. Extract attributes with defaults.
// ---------------------------------------------------------------------------

$heading_role = $attributes['headingRole'] ?? 'heading';
$content      = isset( $attributes['content'] ) ? (string) $attributes['content'] : '';
$level        = $attributes['level'] ?? 'h2';
$sub_tag      = $attributes['subTag'] ?? 'p';
$anchor       = $attributes['anchor'] ?? '';

// Validate enums.
if ( ! in_array( $heading_role, array( 'heading', 'subheading' ), true ) ) {
	$heading_role = 'heading';
}
// Coerce a numeric level (e.g. "3" stored by the editor) to the "hN" string form
// so the in_array allowlist below matches, matching what edit.js already does.
if ( is_numeric( $level ) ) {
	$level = 'h' . absint( $level );
}
if ( ! in_array( $level, array( 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ), true ) ) {
	$level = 'h2';
}
if ( ! in_array( $sub_tag, array( 'p', 'div' ), true ) ) {
	$sub_tag = 'p';
}

// Determine the rendered HTML tag based on role.
$is_subheading = ( 'subheading' === $heading_role );
$rendered_tag  = $is_subheading ? $sub_tag : $level;

// Typography attrs.
// D971/D972 full-replacement track: fontFamily/fontWeight/fontStyle/
// lineHeight/letterSpacing/textTransform/textDecoration/fontSize are now
// emitted via the shared sgs_typography_css_rule() helper (step 3 below) —
// no local variables needed for them any more. textColour stays hand-rolled
// (gradient-capable, outside the shared helper's scope).
// '' = inherit (D343). NEVER default this to a colour: the scoped rule it emits
// is (0,2,0) and beats the theme's own `h1..h6 { color: … }` (0,0,1), so a
// default here silently disables the client's heading colour on every heading.
// Enforced by scripts/check-hardcoded-render-defaults.js F3b (block.json
// default-value divergence scan) — --check.
$text_colour = $attributes['textColour'] ?? '';
// D636 — sibling-attribute shape, mirrors sgs/container's shipped
// backgroundOverlayColour/overlayGradient: TWO attributes, gradient wins
// when set+valid, textColour is untouched.
$text_colour_gradient = $attributes['textColourGradient'] ?? '';

// Wrapper-level attrs. Box-object interface contract §B: padding/margin are box
// objects — base from WP-native style.spacing.* (skip-serialised, read in step
// 2b), tiers from the paddingTablet/paddingMobile/marginTablet/marginMobile
// object attrs. The flat per-side + {family}Unit attrs are removed.
$background_colour          = $attributes['backgroundColour'] ?? '';
$background_colour_gradient = $attributes['backgroundColourGradient'] ?? '';
$border_colour              = $attributes['borderColour'] ?? '';
// D636 border-colour gradient — sibling attribute, wins over $border_colour when set.
$border_colour_gradient  = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
$box_shadow              = $attributes['boxShadow'] ?? '';
$box_shadow_hover        = $attributes['boxShadowHover'] ?? '';
$box_shadow_colour       = $attributes['boxShadowColour'] ?? '';
$box_shadow_hover_colour = $attributes['boxShadowHoverColour'] ?? '';

$transition_duration_raw = isset( $attributes['transitionDuration'] ) ? absint( $attributes['transitionDuration'] ) : 300;
$transition_duration     = $transition_duration_raw > 0 ? $transition_duration_raw : 300;
$transition_easing_raw   = $attributes['transitionEasing'] ?? 'ease';
$allowed_easings         = array( 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' );
$transition_easing       = in_array( $transition_easing_raw, $allowed_easings, true ) ? $transition_easing_raw : 'ease';

$hover_scale  = isset( $attributes['scaleHover'] ) && null !== $attributes['scaleHover'] ? (float) $attributes['scaleHover'] : null;
$hover_colour = $attributes['textColourHover'] ?? '';
// D636 — sibling-attribute shape, see $text_colour_gradient above.
$hover_colour_gradient     = $attributes['textColourHoverGradient'] ?? '';
$hover_background          = $attributes['backgroundColourHover'] ?? '';
$hover_background_gradient = $attributes['backgroundColourHoverGradient'] ?? '';

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

$custom_width      = $attributes['customWidth'] ?? '';
$custom_width_unit = sgs_heading_safe_unit( $attributes['customWidthUnit'] ?? 'px' );
$inherit_style     = ! empty( $attributes['inheritStyle'] );

// Text alignment — validated against allowlist; emitted scoped on the wrapper.
$text_align_raw      = isset( $attributes['textAlign'] ) ? sanitize_text_field( $attributes['textAlign'] ) : '';
$allowed_text_aligns = array( 'left', 'center', 'right', 'justify', 'start', 'end' );
$text_align          = in_array( $text_align_raw, $allowed_text_aligns, true ) ? $text_align_raw : '';

// ---------------------------------------------------------------------------
// 2b. Box-object interface contract §1 + security §D sanitisers, plus the box
// objects (border-width / border-radius), base spacing objects, tier objects,
// and the skip-serialised WP colour-support values.
// ---------------------------------------------------------------------------

// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so an object-attr side/corner value can never break out of its
// declaration. Mirrors sgs/button + sgs/container.
// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// (border-style / text-transform). Strips everything except letters + hyphen so
// ;{}():digits can never break out of the declaration (contract §D).
// Border-width — SGS custom OBJECT attr { top, right, bottom, left }, base only
// (no tiers). No WP-native border-width support; colour/style stay scalar attrs.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

// Border-radius — WP-native style.border.radius (string = uniform, or an object
// with topLeft/topRight/bottomLeft/bottomRight keys), base only. Skip-serialised
// in block.json → emit scoped via the style engine in step 5.
$radius_tiers            = sgs_border_radius_tiers( $attributes );
$base_border_radius       = $radius_tiers['base'];
$border_radius_tablet_obj = $radius_tiers['tablet'];
$border_radius_mobile_obj = $radius_tiers['mobile'];

// Base padding/margin — WP-native style.spacing.* objects (skip-serialised).
// Kept as-is (string values incl. preset "var:preset|spacing|N" refs) and passed
// straight to the style engine, which formats + sanitises them (contract §B / the
// button reference does exactly this).
$base_padding_obj = array();
if ( ! empty( $sgs_tor_padding_desktop ) ) {
	foreach ( $sgs_tor_padding_desktop as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_padding_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_margin_obj = array();
if ( ! empty( $sgs_tor_margin_desktop ) ) {
	foreach ( $sgs_tor_margin_desktop as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_margin_obj[ $spacing_side ] = $spacing_value;
		}
	}
}

// Responsive spacing tiers — SGS object attrs { top, right, bottom, left }.
$padding_tablet_obj = is_array( $sgs_tor_padding_tiers['tablet'] ?? null ) ? $sgs_tor_padding_tiers['tablet'] : array();
$padding_mobile_obj = is_array( $sgs_tor_padding_tiers['mobile'] ?? null ) ? $sgs_tor_padding_tiers['mobile'] : array();
$margin_tablet_obj  = is_array( $sgs_tor_margin_tiers['tablet'] ?? null ) ? $sgs_tor_margin_tiers['tablet'] : array();
$margin_mobile_obj  = is_array( $sgs_tor_margin_tiers['mobile'] ?? null ) ? $sgs_tor_margin_tiers['mobile'] : array();

// WP `color` support values (skip-serialised in block.json → NOT auto-inlined).
// Custom hex/rgb → emitted scoped via the style engine; preset SLUGS → the
// standard has-* classes re-added manually in step 6.
$style_color_text     = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg       = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$style_color_gradient = isset( $attributes['style']['color']['gradient'] ) ? (string) $attributes['style']['color']['gradient'] : '';
$preset_text_slug     = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
// `color.background` support is declared FALSE in block.json, so WP never
// registers/writes a `backgroundColor` attr through the editor — but PHP
// does not drop an undeclared attr written by hand-authored pattern/theme
// content (D338). Fold a hand-authored preset slug into the SAME background-
// paint path as the custom backgroundColour attr (below) rather than adding
// WP's native `has-{slug}-background-color` class: that class paints
// `!important` directly on the root element, which is exactly the conflict
// the `::after` background layer exists to avoid (a text gradient's
// `background-clip:text` would clip it to the glyph shapes same as before).
$preset_bg_slug = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' === $background_colour && '' === $background_colour_gradient && '' !== $preset_bg_slug ) {
	$background_colour = $preset_bg_slug;
}

// ---------------------------------------------------------------------------
// 3. Build the text element's typography declarations (scoped, NOT inline).
// ---------------------------------------------------------------------------

// font-size (has tablet/mobile tiers) is emitted separately via the responsive
// helper in step 5. The remaining base-only typography goes here — all onto the
// id-scoped text selector, never inline (contract §A).
$text_decls = array();

// D636 — sibling gradient attribute wins when set+valid; the gradient path
// paints through the glyphs via background-clip:text.
$text_colour_effective = sgs_resolve_text_colour_or_gradient( $text_colour, $text_colour_gradient );
if ( '' !== $text_colour_effective ) {
	$text_colour_decl = sgs_text_colour_decl( $text_colour_effective );
	if ( '' !== $text_colour_decl ) {
		$text_decls[] = $text_colour_decl;
	}
}
// text-wrap (D305): the theme applies `text-wrap: balance` to all headings
// (core-blocks-critical.css `h1..h6`, a deliberate enhancement for AUTHORED
// content). A CLONED heading must instead render the DRAFT's effective wrap —
// drafts declare no `text-wrap`, so the effective value is the CSS-initial
// `wrap` (greedy). The converter sets `textWrap` on cloned headings.
// Authored headings leave it EMPTY → inherit balance.
//
// ⛔ NOT emitted here any more (2026-09-06). The local block-private emitter
// that used to sit at this spot moved verbatim — same allowlist, same value
// set — into the SHARED sgs_typography_css_rule() helper, so that any block
// declaring `{prefix}TextWrap` gains the property rather than sgs/heading
// being the only block able to render it. The helper is called below at
// `$root_sel` (`.uid.wp-block-sgs-heading`, 0,2,0), the SAME selector this
// block's own $text_decls rule uses, so the specificity argument that made
// this beat the theme's `h1..h6` (0,0,1) is unchanged.
//
// ⚠ Do NOT re-add a local emitter here: it would double-declare `text-wrap`
// on one selector, and a future divergence between the two allowlists would
// then be invisible (the later rule silently wins).

// ---------------------------------------------------------------------------
// 4. Build the wrapper's box/visual declarations (scoped, NOT inline).
// ---------------------------------------------------------------------------

// Contract §A: background / border-style / border-color / box-shadow / width /
// text-align / border-width all move OFF the wrapper `style` attr and into the
// scoped .{uid} rule below. Gated by !inherit_style (inheritStyle suppresses
// block-level wrapper styling and inherits from the parent).
$wrapper_decls = array();

if ( ! $inherit_style ) {
	// Block-background paint moved OFF this decl list onto a `::after`
	// pseudo-element layer (step 5) — a text gradient painted on THIS SAME
	// element via `sgs_text_colour_decl()` uses `background-clip:text`,
	// which silently overwrites (same `background-image` property) or clips
	// (same box) a background painted directly on the root. See
	// `sgs_block_background_layer_css()` in helpers-tokens.php.
	// $border_style is allowlist-validated above (stronger than the keyword regex).
	// G5 (Bean, 2026-08-26): 'style set, no width' means no border by default —
	// never fall through to the browser's initial medium (~3px) border-width.
	if ( $border_style && 'none' !== $border_style && $has_border_width ) {
		$wrapper_decls[] = 'border-style:' . $border_style;
	}
	if ( $border_colour ) {
		$wrapper_decls[] = 'border-color:' . sgs_colour_value( $border_colour );
	}
	if ( $box_shadow ) {
		$wrapper_decls[] = 'box-shadow:' . sgs_shadow_value_composed( $box_shadow, $box_shadow_colour );
	}
	if ( '' !== $custom_width ) {
		$cw_val = sgs_heading_spacing_val( $custom_width, $custom_width_unit );
		if ( $cw_val ) {
			$wrapper_decls[] = 'width:' . $cw_val;
		}
	}
	// $text_align is allowlist-validated above.
	if ( '' !== $text_align ) {
		$wrapper_decls[] = 'text-align:' . $text_align;
	}
	// Border-width — SGS custom object attr, base only, hand-built shorthand.
	if ( $has_border_width ) {
		$bwt             = '' !== $border_width_top ? $border_width_top : '0';
		$bwr             = '' !== $border_width_right ? $border_width_right : '0';
		$bwb             = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl             = '' !== $border_width_left ? $border_width_left : '0';
		$wrapper_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
	}
}

// ---------------------------------------------------------------------------
// 5. Scoped CSS assembly.
//
// Contract §B3: the heading has NO wrapper <div> — the semantic <h{level}>/<p>
// element IS the block root, carrying both the box/background/border AND the
// typography. Because the root element also carries the anchor `id` (ToC), the
// scoped uid is a CLASS (`.sgs-hdg-{md5}`, container-style), never an `id` —
// so every scoped rule targets the root selector `.{uid}.wp-block-sgs-heading`.
// ---------------------------------------------------------------------------

$uid      = 'sgs-hdg-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-heading';

$scoped_css = array();

// --- Hover states ---
$hover_rules = array();
// D636 — sibling gradient attribute wins when set+valid.
$hover_colour_effective = sgs_resolve_text_colour_or_gradient( $hover_colour, $hover_colour_gradient );
if ( '' !== $hover_colour_effective ) {
	$hover_colour_decl = sgs_text_colour_decl( $hover_colour_effective );
	if ( '' !== $hover_colour_decl ) {
		$hover_rules[] = $hover_colour_decl;
	}
}
// Hover background paint is NOT joined into $hover_rules (which targets the
// root element) — it is emitted on the `::after` background layer instead,
// alongside the resting-state background, in step 5b below.
if ( $box_shadow_hover ) {
	$hover_rules[] = 'box-shadow:' . sgs_shadow_value_composed( $box_shadow_hover, $box_shadow_hover_colour );
}
$has_scale = null !== $hover_scale && abs( $hover_scale - 1.0 ) > 0.001;
if ( $has_scale ) {
	$hover_rules[] = 'transform:scale(' . round( $hover_scale, 3 ) . ')';
}

if ( $hover_rules || $has_scale ) {
	$scoped_css[] = "{$root_sel}{transition:all {$transition_duration}ms {$transition_easing};}";
	$scoped_css[] = "@media(prefers-reduced-motion:reduce){{$root_sel}{transition:none !important;transform:none !important;}}";
	if ( $hover_rules ) {
		$scoped_css[]         = sgs_hover_state_rules( $root_sel, implode( ';', $hover_rules ), ':focus-within' );
		$hover_fallback_rule  = sgs_hover_media_wrap(
			sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $root_sel . ':hover', $hover_colour_effective )
		) . sgs_text_colour_gradient_fallback_rule( $root_sel . ':focus-within', $hover_colour_effective );
		if ( '' !== $hover_fallback_rule ) {
			$scoped_css[] = $hover_fallback_rule;
		}
	}
}

// --- Root typography (scoped) — the h-tag IS the text element now. ---
if ( $text_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $text_decls ) . ';}';
}
// D636 — old-browser fallback for a gradient textColour; a no-op (returns
// '') when the flat colour (no gradient sibling set) applies.
$text_colour_fallback_rule = sgs_text_colour_gradient_fallback_rule( $root_sel, $text_colour_effective );
if ( '' !== $text_colour_fallback_rule ) {
	$scoped_css[] = $text_colour_fallback_rule;
}

// Typography — root prefix '', shared TypographyControls/sgs_typography_css_rule()
// mechanism (D971/D972 full-replacement track). Covers fontSize (numeric
// tiered OR a theme preset-slug string in the desktop tier — the helper's
// font-size transform resolves a slug via sgs_font_size_value() exactly as
// the old hand-rolled preset-slug branch here did, closing the D574 bug
// class the same way) plus fontWeight/fontStyle/lineHeight/letterSpacing/
// textTransform/textDecoration/fontFamily.
$scoped_css[] = sgs_typography_css_rule( $attributes, '', $root_sel );

// --- Root box/visual declarations (scoped) ---
if ( $wrapper_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $wrapper_decls ) . ';}';
}

// --- Block background — painted on a `::after` layer, never the root itself.
// A text gradient on this same element (sgs_text_colour_decl()) uses
// background-clip:text, which would overwrite/clip a background painted
// directly on the root — see sgs_block_background_layer_css(). ---
if ( ! $inherit_style ) {
	$background_layer_css = sgs_block_background_layer_css(
		$root_sel,
		sgs_background_paint_decl( $background_colour, $background_colour_gradient ),
		sgs_background_paint_decl( $hover_background, $hover_background_gradient )
	);
	if ( '' !== $background_layer_css ) {
		$scoped_css[] = $background_layer_css;
		// Keep the ::after layer's own background transition in step with the
		// root's hover transition above (only relevant when a hover state exists).
		if ( $hover_rules || $has_scale ) {
			$scoped_css[] = "{$root_sel}::after{transition:background-color {$transition_duration}ms {$transition_easing},background-image {$transition_duration}ms {$transition_easing};}";
		}
	}
}

// --- Border gradient (D636 border builder) — masked ::before, wins over the flat
// border-color decl above (emitted after it so the cascade favours the mask). ---
if ( ! $inherit_style && '' !== $border_colour_gradient ) {
	$scoped_css[] = sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, $has_border_width ? $bwt : '1px' );
}

// --- Base spacing (padding/margin), border-radius, and WP colour support —
// skip-serialised in block.json, emitted scoped via the stable core style
// engine (exactly how WP core outputs `layout` support). ---
if ( ! $inherit_style ) {
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

	if ( null !== $base_border_radius ) {
		$base_style_engine_args['border'] = array( 'radius' => $base_border_radius );
	}

	$color_args = array();
	if ( '' !== $style_color_text ) {
		$color_args['text'] = $style_color_text;
	}
	if ( '' !== $style_color_bg ) {
		$color_args['background'] = $style_color_bg;
	}
	if ( '' !== $style_color_gradient ) {
		$color_args['gradient'] = $style_color_gradient;
	}
	if ( ! empty( $color_args ) ) {
		$base_style_engine_args['color'] = $color_args;
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
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME wrapper selector (contract §B / §B2: tablet
// max-width:1023px, mobile max-width:767px). ---
if ( ! $inherit_style ) {
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
		$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_box_decls ) . ';}}';
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
		$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_box_decls ) . ';}}';
	}
}

// ---------------------------------------------------------------------------
// 6. Build the root element's classes + attributes.
//
// Contract §B3: NO wrapper <div>. The <h{level}>/<p> IS the block root. It
// carries get_block_wrapper_attributes(), the block class `wp-block-sgs-heading`,
// the scoped uid CLASS (`sgs-hdg-{md5}`), and the anchor `id` (ToC). There is no
// separate `__text` child element any more.
// ---------------------------------------------------------------------------

$root_classes = array( 'wp-block-sgs-heading', $uid );

if ( $is_subheading ) {
	$root_classes[] = 'wp-block-sgs-heading--subheading';
}

// Preset TEXT colour slug — the `color` support is skip-serialised, so
// re-add the standard has-* class manually (it sets the colour from the
// theme palette). The background preset slug does NOT get its native class
// here — it was folded into $background_colour above and paints through the
// `::after` background layer instead (see that fold's comment).
if ( ! $inherit_style ) {
	if ( '' !== $preset_text_slug ) {
		$root_classes[] = 'has-text-color';
		$root_classes[] = 'has-' . $preset_text_slug . '-color';
	}
}

// The uid is a CLASS (§B3) so the element's single `id` is free for the anchor
// (ToC target). is-style-* / align* classes are merged in automatically by
// get_block_wrapper_attributes() via the block's className attribute. NO 'style'
// key is passed — the root carries ZERO inline property declarations (contract
// §A); everything is in the scoped <style> above.
$root_attr_args = array(
	'class' => implode( ' ', $root_classes ),
);
if ( $anchor ) {
	$root_attr_args['id'] = $anchor;
}
$wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );

$rendered_tag_escaped = tag_escape( $rendered_tag );
?>
<?php if ( $scoped_css ) : ?>
	<?php
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D — matches SGS_Container_Wrapper).
	// Every value reaching $scoped_css is pre-sanitised (sgs_css_length_value() /
	// sgs_css_keyword_sanitise() / allowlists / floatval / wp_style_engine_get_styles /
	// sgs_colour_value / sgs_shadow_value), so no un-sanitised value survives here.
	?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
<?php endif; ?>
<<?php echo $rendered_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php echo wp_kses_post( $content ); ?>
</<?php echo $rendered_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
