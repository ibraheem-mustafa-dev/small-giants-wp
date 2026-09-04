<?php
/**
 * Server-side render for the SGS Brand Strip block.
 *
 * Two-container architecture (Ryan Mulligan pattern):
 * PHP outputs logos once inside a .sgs-brand-strip__set wrapper.
 * view.js measures actual widths at runtime and clones the set
 * the minimum number of times needed for seamless infinite scroll.
 * CSS @keyframes handles the animation on the GPU compositor thread.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
 * --check. Every WP-native styling support (color/spacing/
 * __experimentalBorder) declares `__experimentalSkipSerialization` in
 * block.json, and every value is emitted scoped into the block's OWN
 * `.{uid}` <style> tag via the stable core API `wp_style_engine_get_styles()`
 * (exactly how WP core outputs `layout` support).
 *
 * BOX-GROUP (contract §B): padding/margin/border-radius are WP-native
 * `style.spacing.*` / `style.border.radius` objects (already object-shaped) —
 * emitted scoped, not inline. Tablet/Mobile tiers are SGS custom object attrs
 * (paddingTablet/paddingMobile/marginTablet/marginMobile/borderRadiusTablet/
 * borderRadiusMobile). Border width/style/colour are WP-native `style.border`
 * values (this block declares full __experimentalBorder support, unlike
 * sgs/quote's bespoke scalar attrs) — passed wholesale to the style engine,
 * base only (no tiers, matches the DONE checklist's border-radius-only tier
 * requirement).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Security sanitiser (contract §D) — CSS-length sanitiser for box/side
// values (mirrors sgs/label + sgs/quote + sgs/media).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 2. Extract attributes with defaults.
// ---------------------------------------------------------------------------

$logos               = $attributes['logos'] ?? array();
$scrolling           = $attributes['scrolling'] ?? false;
$scroll_speed        = $attributes['scrollSpeed'] ?? 'medium';
$scroll_direction    = $attributes['scrollDirection'] ?? 'left';
$fade_edges          = $attributes['fadeEdges'] ?? false;
$fade_width          = $attributes['fadeWidth'] ?? 60;
$image_effect        = $attributes['imageEffect'] ?? 'none';
$max_height          = $attributes['maxHeight'] ?? 180;
$columns_tiers       = sgs_responsive_normalise_object( $attributes['columns'] ?? null );
$columns_desktop     = isset( $columns_tiers['desktop'] ) ? max( 1, absint( $columns_tiers['desktop'] ) ) : 8;
$columns_tablet      = isset( $columns_tiers['tablet'] ) ? max( 1, absint( $columns_tiers['tablet'] ) ) : 4;
$columns_mobile      = isset( $columns_tiers['mobile'] ) ? max( 1, absint( $columns_tiers['mobile'] ) ) : 2;
$show_names          = ! empty( $attributes['showNames'] );
$pause_on_hover      = ! isset( $attributes['pauseOnHover'] ) || (bool) $attributes['pauseOnHover'];
$name_colour          = $attributes['nameColour'] ?? '';
$name_colour_gradient = $attributes['nameColourGradient'] ?? '';
$logo_gap            = isset( $attributes['logoGap'] ) ? absint( $attributes['logoGap'] ) : 0;
$tile_padding        = isset( $attributes['tilePadding'] ) ? absint( $attributes['tilePadding'] ) : 10;
$tile_radius         = isset( $attributes['tileRadius'] ) ? absint( $attributes['tileRadius'] ) : 16;
$tile_shape_raw      = $attributes['tileShape'] ?? 'square';
$tile_shape          = in_array( $tile_shape_raw, array( 'square', 'circle', 'none' ), true ) ? $tile_shape_raw : 'square';
// logoFit (contain|cover, default contain) is no longer read here — it is
// routed through the shared media-element atom layer (SGS_Media_Element::
// style() below), bridged via STORED_AS so the pre-existing control keeps
// its stored attribute name. See includes/media/atoms/object-fit.php.
$tile_bg_colour      = $attributes['tileBackgroundColour'] ?? '';
$tile_border_width   = isset( $attributes['tileBorderWidth'] ) ? absint( $attributes['tileBorderWidth'] ) : 0;
$tile_border_colour  = $attributes['tileBorderColour'] ?? '';
// D636 border-colour gradient siblings — non-empty wins over the flat colour
// above at render time (helpers-tokens.php sgs_border_gradient_css()).
$tile_border_gradient       = sgs_css_gradient_value( $attributes['tileBorderColourGradient'] ?? '' );
$hover_border_gradient      = sgs_css_gradient_value( $attributes['itemBorderColourHoverGradient'] ?? '' );
// Raw CSS box-shadow VALUE (or theme shadow-preset slug) from the shared
// ShadowControl builder. A legacy string such as "small"/"medium" (neither a
// raw shadow nor a real theme.json shadow preset slug — those are
// sm/md/lg/glow) falls through sgs_shadow_value() to an unresolvable
// `var(--wp--preset--shadow--small)`, which the browser simply ignores
// (initial box-shadow: none) — graceful degrade, no crash, no deprecation
// needed (D270 no-deprecations policy).
$tile_shadow         = $attributes['tileShadow'] ?? '';
$tile_shadow_colour  = $attributes['tileShadowColour'] ?? '';
$tile_shadow_colour_hover = $attributes['tileShadowColourHover'] ?? '';
$hover_bg_colour           = $attributes['itemBackgroundColourHover'] ?? '';
$hover_text_colour         = $attributes['itemTextColourHover'] ?? '';
$hover_text_colour_gradient = sgs_css_gradient_value( $attributes['itemTextColourHoverGradient'] ?? '' );
$hover_border_colour       = $attributes['itemBorderColourHover'] ?? '';
// Root-element colour + gradient + hover -- paints the block's OWN
// root `<div>` (see $root_sel below), distinct from tileBackgroundColour (the
// 'tile' element) and the item*Hover attrs above (the 'item' element, the
// nested hover surface). D636 sibling-attribute shape: gradient wins over the
// flat colour when set+valid (sgs_background_paint_decl() / sgs_resolve_text_colour_or_gradient()).
$root_bg_colour            = $attributes['backgroundColour'] ?? '';
$root_bg_colour_gradient   = $attributes['backgroundColourGradient'] ?? '';
$root_bg_hover_colour      = $attributes['backgroundColourHover'] ?? '';
$root_bg_hover_gradient    = $attributes['backgroundColourHoverGradient'] ?? '';
$root_text_colour          = $attributes['textColour'] ?? '';
$root_text_colour_gradient = $attributes['textColourGradient'] ?? '';
$root_text_hover_colour    = $attributes['textColourHover'] ?? '';
$root_text_hover_gradient  = $attributes['textColourHoverGradient'] ?? '';
$hover_effect        = $attributes['effectHover'] ?? 'none';
// transitionDuration/transitionEasing are read directly by sgs_transition_vars()
// below — no local variable needed here (dead-assignment cleanup).

// Map scroll speed to CSS animation duration.
$speed_map       = array(
	'slow'   => '60s',
	'medium' => '30s',
	'fast'   => '15s',
);
$animation_speed = $speed_map[ $scroll_speed ] ?? '25s';

// Sanitise values.
$allowed_effects     = array( 'none', 'lift', 'scale', 'glow' );
$safe_hover_effect   = in_array( $hover_effect, $allowed_effects, true ) ? $hover_effect : 'none';
$safe_direction      = in_array( $scroll_direction, array( 'left', 'right' ), true ) ? $scroll_direction : 'left';
$allowed_img_effects = array( 'none', 'grayscale', 'sepia' );
$safe_image_effect   = in_array( $image_effect, $allowed_img_effects, true ) ? $image_effect : 'none';
// tileShadow sanitisation happens at emission time via sgs_shadow_value()
// (helpers-tokens.php) — it either passes a raw CSS shadow through (normalising
// any embedded functional colour to hex) or resolves a theme shadow-preset slug
// to `var(--wp--preset--shadow--{slug})`; there is no fixed enum to validate
// against any more (see ShadowControl.js).

// ---------------------------------------------------------------------------
// 3. WP-native style groups (skip-serialised in block.json → NOT auto-inlined
// by get_block_wrapper_attributes()). Padding/margin base are already
// object-shaped ({top,right,bottom,left}); border is passed wholesale (this
// block has full native width/style/color/radius support, unlike sgs/quote's
// bespoke scalar borderWidth attr).
// ---------------------------------------------------------------------------

$native_bg      = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_bg_slug = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

$base_padding_obj = array();
if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
	foreach ( $attributes['style']['spacing']['padding'] as $padding_side => $padding_value ) {
		if ( is_string( $padding_value ) && '' !== $padding_value ) {
			$base_padding_obj[ $padding_side ] = $padding_value;
		}
	}
}
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $margin_side => $margin_value ) {
		if ( is_string( $margin_value ) && '' !== $margin_value ) {
			$base_margin_obj[ $margin_side ] = $margin_value;
		}
	}
}

$native_border = ( isset( $attributes['style']['border'] ) && is_array( $attributes['style']['border'] ) ) ? $attributes['style']['border'] : array();

$padding_tablet_obj       = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj       = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj        = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj        = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();

// ---------------------------------------------------------------------------
// 4. Build wrapper classes. `has-background`/`has-{slug}-background-color`
// re-added manually (skip-serialisation suppresses WP's automatic class
// addition too, not just the inline style — matches sgs/label + sgs/quote).
// ---------------------------------------------------------------------------

$has_background = ( '' !== $native_bg || '' !== $preset_bg_slug );

$classes = array( 'sgs-brand-strip' );
$classes[] = 'sgs-brand-strip--tile-' . esc_attr( $tile_shape );
if ( 'none' !== $safe_image_effect ) {
	$classes[] = 'sgs-brand-strip--effect-' . esc_attr( $safe_image_effect );
}
if ( $scrolling ) {
	$classes[] = 'sgs-brand-strip--scrolling';
}
if ( 'right' === $safe_direction ) {
	$classes[] = 'sgs-brand-strip--reverse';
}
if ( $fade_edges ) {
	$classes[] = 'sgs-brand-strip--fade';
}
if ( 'none' !== $safe_hover_effect ) {
	$classes[] = 'sgs-brand-strip--hover-' . esc_attr( $safe_hover_effect );
}
if ( ! $pause_on_hover ) {
	$classes[] = 'sgs-brand-strip--no-pause';
}
if ( $has_background ) {
	$classes[] = 'has-background';
	if ( '' !== $preset_bg_slug ) {
		$classes[] = 'has-' . $preset_bg_slug . '-background-color';
	}
}

// ---------------------------------------------------------------------------
// 5. Build CSS custom properties (VALUES, not property declarations — allowed
// inline per contract §A). Unchanged from the pre-migration behaviour.
// ---------------------------------------------------------------------------

$css_vars = array_merge(
	sgs_transition_vars( $attributes ),
	array(
		'--sgs-scroll-speed:' . esc_attr( $animation_speed ),
		'--sgs-logo-max-height:' . absint( $max_height ) . 'px',
		// Columns-per-device: tile width = strip-width / columns (container-query
		// driven in style.css), capped at the maxHeight-derived size so tiles grow
		// with the strip up to a sensible limit then stop (no giant pixelated logos).
		'--sgs-columns-desktop:' . $columns_desktop,
		'--sgs-columns-tablet:' . $columns_tablet,
		'--sgs-columns-mobile:' . $columns_mobile,
		'--sgs-tile-padding:' . $tile_padding . 'px',
		'--sgs-tile-radius:' . $tile_radius . 'px',
		// NB: named "thickness" NOT "border-width" — an inline value containing the
		// substring "border-width" is matched by WP core's border-support selector
		// `html :where([style*="border-width"]){border-style:solid}`, which then
		// paints a phantom 3px currentColor border on this root (D-2026-07-17).
		'--sgs-tile-border-thickness:' . $tile_border_width . 'px',
	)
);
if ( $fade_edges ) {
	$css_vars[] = '--sgs-fade-width:' . absint( $fade_width ) . 'px';
}
// itemBackgroundColourHover moved OFF this custom-property mechanism
// 2026-09-04 -- .sgs-brand-strip__item:hover ALSO gained itemTextColourHover's
// gradient sibling below (a real shared-selector conflict this fix.js dispatch
// missed and centrally corrected), so the hover background needs its own
// ::after layer to keep background-clip:text from clipping it. See
// sgs_block_background_layer_css() call near $item_hover_sel below.
if ( $hover_text_colour ) {
	$css_vars[] = '--sgs-tile-hover-text:' . sgs_colour_value( $hover_text_colour );
}
if ( $hover_border_colour ) {
	$css_vars[] = '--sgs-tile-hover-border:' . sgs_colour_value( $hover_border_colour );
}
// Resting tile background (client tileBackgroundColour control) feeds the
// --sgs-tile-bg hook already consumed by style.css .sgs-brand-strip__item.
// Gradient sibling (2026-09-04): no stable selector of its own to hang a
// direct rule on (--sgs-tile-bg is reused inside the hover fallback chain
// too), so sgs_custom_property_gradient_decls() adds a sibling
// --sgs-tile-bg-gradient var instead; style.css's existing
// background-color:var(--sgs-tile-bg,...) rule gains ONE new sibling line,
// background-image:var(--sgs-tile-bg-gradient,none) — unset composites to
// nothing, so every existing flat-colour instance is byte-identical.
$css_vars = array_merge(
	$css_vars,
	sgs_custom_property_gradient_decls(
		'sgs-tile-bg',
		(string) $tile_bg_colour,
		(string) ( $attributes['tileBackgroundColourGradient'] ?? '' )
	)
);
// Emit ALWAYS (not only when > 0) so an explicit 0 is honoured — otherwise a 0
// value falls through to the CSS `var(--sgs-logo-gap, spacing|50)` default and
// the gap can never be closed (a reference strip with adjacent, border-separated
// tiles needs gap:0). block.json default stays 0 = tiles adjacent; raise logoGap
// to add space.
$css_vars[] = '--sgs-logo-gap:' . $logo_gap . 'px';

// ---------------------------------------------------------------------------
// 6. Scoped CSS assembly. uid is a CLASS (this block declares `anchor: true`,
// so an `id` may be present on the wrapper attrs — the scoped selector must
// never collide with it, contract §B3).
// ---------------------------------------------------------------------------

$uid      = 'sgs-brandstrip-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-brand-strip';

$scoped_css = array();

// Per-instance CSS custom-property VALUES → a scoped `.uid{…}` rule in the
// block's own <style> (consolidated to the stylesheet by the SGS CSS registry),
// NOT an inline `style="--var:…"` attribute on the root. Matches the
// fully-migrated blocks (quote, D294 — "everything lives in the scoped <style>")
// and Spec 32's intent that nothing renders inline except the sgsCustomCss
// residual. Declared first so the values are present for the base style.css
// rules that consume them via var(). Values are already sanitised at source
// (absint / esc_attr / sgs_colour_value); the scoped channel (wp_strip_all_tags)
// is NOT subject to safecss_filter_attr, so functional colours survive here.
if ( ! empty( $css_vars ) ) {
	$scoped_css[] = $root_sel . '{' . implode( ';', $css_vars ) . '}';
}

// --- Media-element atom layer — object-fit for the logo <img>, routed
// through the shared atom (supports.sgs.mediaElements in block.json) rather
// than the block's own --sgs-logo-fit custom property. The pre-existing
// `logoFit` control (contain|cover, default contain) stays the only UI —
// STORED_AS in helpers-media-element.php bridges the atom onto it. The
// marker classes the shared `.sgs-media-el` stylesheet rule reads are added
// to each logo <img> below, in the logos-HTML build loop. ---
if ( class_exists( 'SGS_Media_Element' ) ) {
	$sgs_bs_media_css = SGS_Media_Element::style( $attributes, '', 'sgs/brand-strip', $uid, array( 'object-fit' ) );
	if ( '' !== $sgs_bs_media_css ) {
		$scoped_css[] = $sgs_bs_media_css;
	}
}

// --- Base spacing (padding/margin) + native border (width/style/colour/
// radius) + native background colour — all skip-serialised WP supports,
// emitted scoped via the stable core style engine. ---

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

// G5 (Bean, 2026-08-26): 'style set, no width' means no border by
// default — never fall through to the browser's initial medium (~3px)
// border-width. The gate strips a lone 'style' key so this rule is
// applied identically everywhere, not per block (helpers-box.php).
if ( ! empty( $native_border ) ) {
	$base_style_engine_args['border'] = sgs_gate_native_border_style( $native_border );
}

if ( '' !== $native_bg ) {
	$base_style_engine_args['color'] = array( 'background' => $native_bg );
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

// --- Root background + text colour (client-controlled, SgsColourPanel
// 'rootBackground'/'rootText' rows). Background: gradient (via
// background-image) wins over the flat colour when set+valid
// (sgs_background_paint_decl()). Text: resolved through the same
// gradient-wins-flat rule then painted via sgs_text_colour_decl() -- a
// gradient text value uses background-clip:text, needing the accompanying
// @supports fallback rule for browsers without clip-text support. Mirrors
// sgs/heading's root typography + hover block exactly. ---
$root_decls   = array();
$root_bg_decl = sgs_background_paint_decl( $root_bg_colour, $root_bg_colour_gradient );
if ( '' !== $root_bg_decl ) {
	$root_decls[] = $root_bg_decl;
}
$root_text_effective = sgs_resolve_text_colour_or_gradient( $root_text_colour, $root_text_colour_gradient );
$root_text_decl      = sgs_text_colour_decl( $root_text_effective );
if ( '' !== $root_text_decl ) {
	$root_decls[] = $root_text_decl;
}
if ( $root_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $root_decls ) . ';}';
}
$root_text_fallback_rule = sgs_text_colour_gradient_fallback_rule( $root_sel, $root_text_effective );
if ( '' !== $root_text_fallback_rule ) {
	$scoped_css[] = $root_text_fallback_rule;
}

$root_hover_decls   = array();
$root_bg_hover_decl = sgs_background_paint_decl( $root_bg_hover_colour, $root_bg_hover_gradient );
if ( '' !== $root_bg_hover_decl ) {
	$root_hover_decls[] = $root_bg_hover_decl;
}
$root_text_hover_effective = sgs_resolve_text_colour_or_gradient( $root_text_hover_colour, $root_text_hover_gradient );
$root_text_hover_decl      = sgs_text_colour_decl( $root_text_hover_effective );
if ( '' !== $root_text_hover_decl ) {
	$root_hover_decls[] = $root_text_hover_decl;
}
if ( '' !== ( $attributes['nameColourHover'] ?? '' ) ) {
	$root_hover_decls[] = 'color:' . sgs_colour_value( $attributes['nameColourHover'] );
}
if ( $root_hover_decls ) {
	$scoped_css[] = sgs_hover_state_rules( $root_sel, implode( ';', $root_hover_decls ), ':focus-within' );
	// Focus fallback selector matches the guarded-hover-rule shape so the
	// `@supports not (background-clip:text)` fallback still targets both states.
	$root_hover_sel                = "{$root_sel}:hover,{$root_sel}:focus-within";
	$root_text_hover_fallback_rule = sgs_text_colour_gradient_fallback_rule( $root_hover_sel, $root_text_hover_effective );
	if ( '' !== $root_text_hover_fallback_rule ) {
		$scoped_css[] = $root_text_hover_fallback_rule;
	}
}

// --- Static tile border (distinct from the hover border colour system —
// `--sgs-tile-hover-border` above only applies `:hover`; this is the resting-
// state border). Width sanitised via absint on extraction; colour resolved
// through the shared sgs_colour_value() helper (handles hex/token/rgba
// normalisation and matches the pattern used for the hover colours). ---
if ( $tile_border_width > 0 || '' !== $tile_border_colour ) {
	$tile_border_decls = array();
	if ( $tile_border_width > 0 ) {
		$tile_border_decls[] = 'border-width:' . $tile_border_width . 'px';
		$tile_border_decls[] = 'border-style:solid';
	}
	if ( '' !== $tile_border_colour ) {
		$tile_border_decls[] = 'border-color:' . sgs_colour_value( $tile_border_colour );
	}
	if ( $tile_border_decls ) {
		$scoped_css[] = "{$root_sel} .sgs-brand-strip__item{" . implode( ';', $tile_border_decls ) . ';}';
	}
}

// --- Border gradient (D636 border builder) — masked ::before, replaces the
// flat border-color above (and its :hover var-driven sibling) when set. ---
if ( '' !== $tile_border_gradient ) {
	$scoped_css[] = sgs_border_gradient_css(
		"{$root_sel} .sgs-brand-strip__item",
		$tile_border_gradient,
		'' !== $hover_border_gradient ? $hover_border_gradient : sgs_colour_value( $hover_border_colour ),
		$tile_border_width > 0 ? $tile_border_width . 'px' : '1px'
	);
}

// --- Tile shadow (ShadowControl builder). `sgs_shadow_value()` accepts either a raw CSS
// box-shadow string (the builder's normal output — colour normalised to hex
// so it survives `safecss_filter_attr()`-style stripping even though this
// channel isn't subject to it) or a bare theme shadow-preset slug picked from
// the preset row (sm/md/lg/glow), and resolves it to `var(--wp--preset--
// shadow--{slug})`. Scoped, real `box-shadow` PROPERTY declaration — never
// inline (Spec 32). Applies at rest; `.sgs-brand-strip--hover-lift` already
// overrides box-shadow on hover via its own rule in style.css, unaffected. ---
if ( '' !== $tile_shadow ) {
	$safe_tile_shadow_value = sgs_shadow_value_composed( $tile_shadow, $tile_shadow_colour );
	if ( '' !== $safe_tile_shadow_value ) {
		$scoped_css[] = "{$root_sel} .sgs-brand-strip__item{box-shadow:{$safe_tile_shadow_value};}";
	}
}
// HOVER-state shadow colour (Rule 31, 2026-08-22) — reuses the resting SHAPE
// with the hover colour composed in.
if ( '' !== $tile_shadow && '' !== $tile_shadow_colour_hover ) {
	$safe_tile_shadow_hover_value = sgs_shadow_value_composed( $tile_shadow, $tile_shadow_colour_hover );
	if ( '' !== $safe_tile_shadow_hover_value ) {
		$scoped_css[] = sgs_hover_state_rules( "{$root_sel} .sgs-brand-strip__item", "box-shadow:{$safe_tile_shadow_hover_value}", ':focus-within' );
	}
}

// --- Logo-name caption typography (shared TypographyControls contract,
// prefix 'name') -- replaces the pre-existing fixed 0.8125rem style.css
// default with a client-facing, per-tier control (base/tablet/mobile size,
// weight). Emitted only when the caption is shown (an element that never
// renders should not carry emitted CSS). ---
if ( $show_names && function_exists( 'sgs_typography_css_rule' ) ) {
	$name_typography_css = sgs_typography_css_rule( $attributes, 'name', "{$root_sel} .sgs-brand-strip__name" );
	if ( '' !== $name_typography_css ) {
		$scoped_css[] = $name_typography_css;
	}
	// D636 text-colour gradient sibling — the gradient wins over the flat
	// colour when set+valid (sgs_resolve_text_colour_or_gradient()), painted
	// via sgs_text_colour_decl() (color:X for flat, background-clip:text for
	// a gradient) with the mandatory @supports fallback rule for browsers
	// without clip-text support. The caption paints no background of its own
	// (style.css .sgs-brand-strip__name), so background-clip:text is safe here.
	$name_text_effective = sgs_resolve_text_colour_or_gradient( $name_colour, $name_colour_gradient );
	$name_text_decl      = sgs_text_colour_decl( $name_text_effective );
	if ( '' !== $name_text_decl ) {
		$name_sel     = "{$root_sel} .sgs-brand-strip__name";
		$scoped_css[] = "{$name_sel}{" . $name_text_decl . ';}';
		$name_text_fallback_rule = sgs_text_colour_gradient_fallback_rule( $name_sel, $name_text_effective );
		if ( '' !== $name_text_fallback_rule ) {
			$scoped_css[] = $name_text_fallback_rule;
		}
	}
	// Caption alignment. text-align is not part of the shared typography
	// emitter's property set, so it is emitted here against the same selector.
	// Allowlist-validated (heading/render.php precedent) — never interpolated raw.
	$name_align_raw     = isset( $attributes['nameTextAlign'] ) ? sanitize_text_field( $attributes['nameTextAlign'] ) : '';
	$allowed_name_align = array( 'left', 'center', 'right', 'justify' );
	if ( in_array( $name_align_raw, $allowed_name_align, true ) ) {
		$scoped_css[] = "{$root_sel} .sgs-brand-strip__name{--sgs-name-text-align:" . $name_align_raw . ';}';
	}
}

// --- Item hover: itemTextColourHover (text) / itemBackgroundColourHover
// (fill) SHARE .sgs-brand-strip__item:hover -- CORRECTED 2026-09-04, real
// shared-selector conflict the original dispatch missed (it hand-waved "the
// item tile has no background of its own", which was wrong: style.css:407-409
// paints background-color on this exact hover selector via the pre-existing
// --sgs-tile-hover-bg custom property, itself falling back through
// --sgs-tile-bg to the theme surface-alt token -- a real 3-level default
// chain, not a simple unset case). background-clip:text only clips when the
// resolved value is ACTUALLY a gradient (a flat `color:` never touches
// background-clip), so this narrows to exactly that case rather than
// replacing the whole background mechanism: a flat itemTextColourHover is
// byte-identical to before this fix; only the gradient case neutralises the
// static background-color (transparent) and repaints the SAME resolved
// value on a hand-built ::after layer (no position:relative needed --
// .sgs-brand-strip__item is a flex child with no position rule of its own,
// but this rule only fires in the rare gradient case, so adding one here is
// safe and scoped).
$item_sel       = "{$root_sel} .sgs-brand-strip__item";
$item_hover_sel = "{$item_sel}:hover";
$item_text_hover_effective = sgs_resolve_text_colour_or_gradient( $hover_text_colour, $hover_text_colour_gradient );
$item_text_hover_decl      = sgs_text_colour_decl( $item_text_hover_effective );
if ( '' !== $item_text_hover_decl ) {
	if ( str_contains( $item_text_hover_effective, 'gradient(' ) ) {
		$item_bg_hover_fallback = $hover_bg_colour ? $hover_bg_colour : ( $tile_bg_colour ? $tile_bg_colour : 'surface-alt' );
		$item_bg_hover_paint    = sgs_background_paint_decl( $item_bg_hover_fallback, '' );
		$scoped_css[]           = "{$item_hover_sel}{background-color:transparent;position:relative;isolation:isolate;}";
		if ( '' !== $item_bg_hover_paint ) {
			$scoped_css[] = "{$item_hover_sel}::after{content:\"\";position:absolute;inset:0;z-index:-1;pointer-events:none;" . $item_bg_hover_paint . ';}';
		}
	}
	$scoped_css[] = "{$item_hover_sel}{" . $item_text_hover_decl . ';}';
	$item_text_hover_fallback_rule = sgs_text_colour_gradient_fallback_rule( $item_hover_sel, $item_text_hover_effective );
	if ( '' !== $item_text_hover_fallback_rule ) {
		$scoped_css[] = $item_text_hover_fallback_rule;
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME selector (contract §B2: tablet max-width:1023px,
// mobile max-width:767px). ---
$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );

$tablet_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_decls[] = "margin:{$margin_tab_val}";
}
if ( $tablet_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_decls ) . ';}}';
}

$mobile_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_decls[] = "margin:{$margin_mob_val}";
}
if ( $mobile_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_decls ) . ';}}';
}

// --- Border-radius tiers — SGS custom tier OBJECT attrs, routed through the
// same stable core style-engine API as the base rule above. ---

if ( ! empty( $border_radius_tablet_obj ) ) {
	$radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $radius_tab_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:1023px){' . $radius_tab_out['css'] . '}';
	}
}
if ( ! empty( $border_radius_mobile_obj ) ) {
	$radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $radius_mob_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:767px){' . $radius_mob_out['css'] . '}';
	}
}

// ---------------------------------------------------------------------------
// 7. Build the root element's classes + attributes. NO 'style' key at all — the
// per-instance custom-property VALUES are emitted as a scoped `.uid{…}` rule in
// the block's <style> above (consolidated to the stylesheet), and every native
// support (color/spacing/border) skip-serialises (block.json), so the root
// carries ZERO inline style attribute (Spec 32 intent: nothing inline).
// ---------------------------------------------------------------------------

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', array_merge( $classes, array( $uid ) ) ),
	)
);

/*
 * Build logo items HTML (single set — JS handles cloning at runtime).
 * Each logo entry is migrated to the unified media-slot shape:
 *   { media: { url, type:'image', id, alt, mime, width, height }, alt, linkUrl }
 * Legacy entries ({ image: { url, ... }, url: linkUrl }) are read inline as a
 * safety net for posts that have not yet round-tripped through the editor.
 */
$logos_html = '';
if ( ! empty( $logos ) ) {
	$logo_index = 0;
	foreach ( $logos as $bs_index => $logo ) {
		// Spec 35 Part 4 — per-item object-fit override, keyed by the item's
		// OWN stable `_key` (src/utils/generateItemKey.js), never by array
		// index/`:nth-child` (both break the moment an operator reorders/
		// adds/removes a logo). Object-fit only, no focal-point — logos are
		// not photographs (Bean-locked convention; this block's own
		// pre-existing `logoFit` attribute is already object-fit-only). Falls
		// back to the block-wide `logoFit` default (emitted separately above
		// via the SGS_Media_Element atom) whenever an item has no override.
		$bs_item_key = ! empty( $logo['_key'] ) ? (string) $logo['_key'] : 'idx-' . absint( $bs_index );
		if ( ! empty( $logo['objectFit'] ) ) {
			$bs_item_css = sgs_media_position_css(
				array(
					'objectPosition' => null,
					'objectFit'      => $logo['objectFit'],
				),
				'',
				$root_sel . ' [data-logo-key="' . esc_attr( $bs_item_key ) . '"] img'
			);
			if ( '' !== $bs_item_css ) {
				$scoped_css[] = $bs_item_css;
			}
		}

		$media = isset( $logo['media'] ) && is_array( $logo['media'] ) ? $logo['media'] : null;

		// Backward-compat: lift legacy { image: {...} } shape to media.
		if ( null === $media && isset( $logo['image'] ) && is_array( $logo['image'] ) ) {
			$legacy = $logo['image'];
			$media  = array(
				'url'    => $legacy['url'] ?? '',
				'type'   => 'image',
				'id'     => isset( $legacy['id'] ) ? absint( $legacy['id'] ) : 0,
				'alt'    => $logo['alt'] ?? ( $legacy['alt'] ?? '' ),
				'mime'   => '',
				'width'  => isset( $legacy['width'] ) ? absint( $legacy['width'] ) : 0,
				'height' => isset( $legacy['height'] ) ? absint( $legacy['height'] ) : 0,
			);
		}

		if ( null === $media || empty( $media['url'] ) ) {
			continue;
		}

		$logo_name       = isset( $logo['name'] ) ? sanitize_text_field( (string) $logo['name'] ) : '';
		$has_caption     = $show_names && '' !== $logo_name;
		$logo_decorative = ! empty( $logo['decorative'] );

		if ( $logo_decorative ) {
			// Explicit editorial choice (WCAG 2.1 AA 1.1.1) — hide this logo
			// from assistive tech entirely, regardless of caption or operator
			// alt text.
			$media['alt'] = '';
		} elseif ( $has_caption ) {
			// Caption is on-screen and carries the accessible name — the
			// image becomes decorative so screen readers announce the name
			// once, not twice.
			$media['alt'] = '';
		} elseif ( ! empty( $logo['alt'] ) ) {
			// Operator alt text overrides media alt when set.
			$media['alt'] = $logo['alt'];
		}

		$logo_html = sgs_render_media( $media, 'sgs/brand-strip' );
		if ( '' === $logo_html ) {
			continue;
		}
		// Marker classes for the shared media-element atom layer (see the
		// object-fit emission above) — every logo shares the SAME scope
		// class (unprefixed, single element per block), so the atom's
		// --sgs-media-object-fit value applies to each tile identically.
		if ( class_exists( 'SGS_Media_Element' ) ) {
			$sgs_bs_scope_class  = SGS_Media_Element::scope_class( $uid, '' );
			$sgs_bs_marker_class = implode( ' ', SGS_Media_Element::element_classes( $sgs_bs_scope_class ) );
			$logo_html           = preg_replace(
				'/(<img\b[^>]*\bclass="[^"]*)"/',
				'$1 ' . $sgs_bs_marker_class . '"',
				$logo_html,
				1
			);
		}
		if ( $logo_decorative ) {
			// Belt-and-braces alongside the empty alt above — aria-hidden
			// stops assistive tech announcing the image at all, not just
			// skipping its (already-empty) accessible name.
			$logo_html = preg_replace( '/<img\b/', '<img aria-hidden="true"', $logo_html, 1 );
		}

		$name_id = $has_caption ? $uid . '-name-' . $logo_index : '';

		// Shared SgsLinkControl object shape { url, opensInNewTab, rel } (Spec 35
		// Task 2) resolved via the shared sgs_link_attributes() render helper —
		// mirrors sgs/icon's own link handling rather than hand-rolling target/rel
		// again here. linkUrl/linkTarget/linkRel are the existing per-item storage
		// keys (unchanged), so no per-item data is stranded by the editor swap.
		$link_attrs_str = sgs_link_attributes(
			array(
				'url'           => $logo['linkUrl'] ?? '',
				'opensInNewTab' => isset( $logo['linkTarget'] ) && '_blank' === $logo['linkTarget'],
				'rel'           => $logo['linkRel'] ?? '',
			)
		);
		if ( '' !== $link_attrs_str ) {
			if ( '' !== $name_id ) {
				$link_attrs_str .= ' aria-labelledby="' . esc_attr( $name_id ) . '"';
			}
			$logo_html = '<a' . $link_attrs_str . '>' . $logo_html . '</a>';
		}

		if ( $has_caption ) {
			$logos_html .= '<div class="sgs-brand-strip__tile">';
			$logos_html .= '<div class="sgs-brand-strip__item" data-logo-key="' . esc_attr( $bs_item_key ) . '">' . $logo_html . '</div>';
			$logos_html .= '<span id="' . esc_attr( $name_id ) . '" class="sgs-brand-strip__name">' . esc_html( $logo_name ) . '</span>';
			$logos_html .= '</div>';
		} else {
			$logos_html .= '<div class="sgs-brand-strip__item" data-logo-key="' . esc_attr( $bs_item_key ) . '">';
			$logos_html .= $logo_html;
			$logos_html .= '</div>';
		}

		++$logo_index;
	}
}

// ---------------------------------------------------------------------------
// 8. Output. wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while
// leaving CSS combinators like `>` intact (contract §D). Every value reaching

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
$border_radius_obj = is_array( $attributes['borderRadius'] ?? null ) ? $attributes['borderRadius'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$scoped_css[] = $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// $scoped_css is pre-sanitised (sgs_css_length_value() / wp_style_engine_get_styles),
// so no un-sanitised value survives here. Single set inside track — view.js
// clones as needed for infinite scroll.
// ---------------------------------------------------------------------------

if ( $scoped_css ) :
	?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
	<?php
endif;

printf(
	'<div %1$s><div class="sgs-brand-strip__track"><div class="sgs-brand-strip__set">%2$s</div></div></div>',
	$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	$logos_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built entirely from sgs_render_media(), which escapes its own output.
);
