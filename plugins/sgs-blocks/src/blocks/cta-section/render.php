<?php
/**
 * Server-side render for the SGS CTA Section block.
 *
 * The content column (headline, body text, and buttons) is rendered via
 * InnerBlocks ($content) — authored as child sgs/heading + sgs/text +
 * sgs/multi-button blocks. This file does not read scalar content attrs.
 *
 * Scalar STYLING/LAYOUT attributes still consumed here (wrapper/shell level):
 *   ribbon, layout, gradientPreset, backgroundImage, backgroundMedia,
 *   backgroundImageOpacity, stats, background/text/border colourHover,
 *   transitionDuration, transitionEasing,
 *   textAlign (native typography support — targets the headline child).
 *
 * Button styling lives on the child multi-button block; textAlign is handled
 * by the single native `textAlign` support (Spec 35 Task 5).
 *
 * BOX-GROUP (contract §B, 2026-07-09): paddingTablet/paddingMobile,
 * marginTablet/marginMobile, contentBandPadding/Tablet/Mobile are box OBJECTS
 * ({top,right,bottom,left}) — no more flat per-side attrs. These are read +
 * emitted entirely by SGS_Container_Wrapper (mirrors sgs/container); this
 * file does not touch them directly.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
 * --check. Composite caveat: color/typography/spacing/shadow/
 * __experimentalBorder values are emitted into CTA-SECTION'S OWN scoped
 * `.{uid}` <style> — these do NOT ride through the shared wrapper's
 * `extra_styles`, which would inline them. Section-level WP-native
 * padding/margin remains the wrapper's own scoped mechanism (unchanged). The
 * background-image/size/position trio and the legacy string `shadow` token
 * attr are ALSO moved out of the wrapper's `extra_styles` into this file's
 * own scoped rule.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    InnerBlocks HTML (headline, body, buttons).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style / shadow token) — letters + hyphen only.
// Mirrors sgs/hero's proven sanitiser.
// CSS length/unit sanitiser — for free-text attrs (border width/radius)
// concatenated into raw CSS declarations. Mirrors sgs/hero's sanitiser.
$ribbon = isset( $attributes['ribbon'] ) ? sanitize_text_field( $attributes['ribbon'] ) : '';
// `contentLayout` (the container owns `layout` = grid/flex). No legacy fallback (R-31-14) —
// `contentLayout` declares default 'centred' in block.json, so WP always populates it.
$content_layout           = $attributes['contentLayout'] ?? 'centred';
$background_image         = $attributes['backgroundImage'] ?? null;
$background_media         = $attributes['backgroundMedia'] ?? null;
$background_image_opacity = $attributes['backgroundImageOpacity'] ?? 30;

// Resolve the active media: prefer the unified backgroundMedia slot, otherwise
// synthesise from the legacy backgroundImage object so existing posts that have
// not yet round-tripped through the editor still render the same asset.
$resolved_media = null;
if ( ! empty( $background_media ) && is_array( $background_media ) && ! empty( $background_media['url'] ) ) {
	$resolved_media = $background_media;
} elseif ( ! empty( $background_image ) && is_array( $background_image ) && ! empty( $background_image['url'] ) ) {
	$resolved_media = array(
		'url'  => $background_image['url'],
		'type' => 'image',
		'id'   => $background_image['id'] ?? 0,
		'alt'  => $background_image['alt'] ?? '',
		'mime' => 'image/jpeg',
	);
}

$has_image_bg = $resolved_media && ( $resolved_media['type'] ?? 'image' ) === 'image';
$has_video_bg = $resolved_media && ( $resolved_media['type'] ?? 'image' ) === 'video';
$stats        = $attributes['stats'] ?? array();

$hover_background_colour = $attributes['backgroundColourHover'] ?? '';
$hover_text_colour       = $attributes['textColourHover'] ?? '';
$hover_border_colour     = $attributes['borderColourHover'] ?? '';
// D636 border-colour gradient sibling — resolved here, emitted via
// sgs_border_gradient_css() masked ::before further down; border-color can
// never legally hold a gradient value, so this never feeds --sgs-hover-border
// above. gridItemBorder (a separate raw CSS shorthand attribute) is untouched.
$hover_border_gradient = sgs_css_gradient_value( $attributes['borderColourHoverGradient'] ?? '' );
// transitionDuration/transitionEasing are read directly by sgs_transition_vars()
// below — no local variable needed here (dead-assignment cleanup).

$allowed_gradient_presets = array( '', 'primary-fade', 'accent-glow', 'dark-radial', 'mesh-soft' );
$gradient_preset          = in_array( $attributes['gradientPreset'] ?? '', $allowed_gradient_presets, true )
	? sanitize_key( $attributes['gradientPreset'] ?? '' )
	: '';

// `shadow` attr — either a theme shadow preset slug (sm/md/lg/glow) or a
// raw box-shadow SHAPE string (x/y/blur/spread, no colour) built by the
// shared ShadowControl (Spec 35 T2.2); colour is a SEPARATE sibling attr
// (`shadowColour`, D621/D622 colour-panel split) composed back in by
// sgs_shadow_value_composed(). No-inline contract (§A): route the resolved box-shadow
// into cta-section's OWN scoped <style> instead of the wrapper's
// extra_styles. $cta_helper_attrs nulls `shadow` below (C3 double-emit
// guard) so the wrapper never re-emits it.
$shadow_value = sgs_shadow_value_composed( $attributes['shadow'] ?? '', $attributes['shadowColour'] ?? '' );
$shadow_value_hover = sgs_shadow_value_composed( $attributes['shadow'] ?? '', $attributes['shadowColourHover'] ?? '' );

// Generate a unique ID for responsive CSS scoping. This is a CLASS (contract
// §B3-style scoping — matches the container/hero/quote convention).
$uid      = 'sgs-cta-section-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-cta-section';

// Build wrapper styles.
$wrapper_styles = array();

// Transition custom properties — consumed by CSS vars on the block and its children.
$wrapper_styles = array_merge( $wrapper_styles, sgs_transition_vars( $attributes ) );

// Hover colour shifts — resolved into complete CSS declaration strings and

// Initialised HERE: the original init sat BELOW the border emission and wiped
// every rule it wrote -- a silent discard php -l cannot see.
$responsive_css = '';

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
		$responsive_css .= $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$responsive_css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$responsive_css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
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
		$responsive_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$responsive_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$responsive_css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// emitted via sgs_emit_state_colour_css() (below, once $root_sel/$responsive_css
// exist) rather than pushed onto $wrapper_styles as --sgs-hover-* custom
// properties. Bean-locked: no hardcoded fallback colour — unset stays unset.
$hover_decls = array();
if ( $hover_background_colour ) {
	$hover_decls[] = 'background-color:' . sgs_colour_value( $hover_background_colour );
}
// Hover text routed through the SHARED resolver so a gradient sibling WINS over the flat
// value, and the background-clip:text form comes from the same emitter sgs/hero and
// sgs/container use.
$cta_hover_text_effective = sgs_resolve_text_colour_or_gradient(
	(string) $hover_text_colour,
	(string) ( $attributes['textColourHoverGradient'] ?? '' )
);
if ( '' !== $cta_hover_text_effective ) {
	$cta_hover_text_decl = sgs_text_colour_decl( $cta_hover_text_effective );
	if ( '' !== $cta_hover_text_decl ) {
		$hover_decls[] = $cta_hover_text_decl;
	}
}
if ( $hover_border_colour ) {
	$hover_decls[] = 'border-color:' . sgs_colour_value( $hover_border_colour );
}

// ── Responsive CSS builder ──────────────────────────────────────────────────
// No-inline contract (§A): background-image/size/position (a real property
// declaration trio) is deferred to the scoped .uid rule below.
// (init hoisted above the border emission)

if ( $has_image_bg ) {
	// Image backgrounds keep using a CSS background-image so the existing
	// overlay + text layering continues to work without layout changes.
	$responsive_css .= $root_sel . '{background-image:url(' . esc_url( $resolved_media['url'] ) . ');background-size:cover;background-position:center}';
}

// --- Border gradient (D636 border builder) — masked ::before, HOVER-ONLY:
// there is no resting borderColour attribute on this block (the base border
// is governed by the native __experimentalBorder colour support, or unset),
// so the mask is scoped to a single :is(:hover, :focus-within) compound
// selector rather than the usual normal+hover pair — a comma-separated
// selector list here would attach the generated ::before to only the LAST
// listed state (a known gotcha), so :is() keeps it one compound selector. ---
if ( '' !== $hover_border_gradient ) {
	// Touch-safe: sgs_border_gradient_css() has no hover-only mode (it bails
	// when $normal_paint is empty), so the hover state is baked in as this
	// call's own "normal_paint" — this must therefore carry its own guard
	// rather than relying on the helper's $hover_paint branch. Split into two
	// single-pseudo-class calls (rather than the previous
	// :is(:hover,:focus-within) compound) so layer-1/layer-2 guards can wrap
	// the :hover call alone while :focus-within stays unguarded — each call
	// still uses a single selector, so the ::before-attaches-to-only-the-last
	// -listed-state gotcha noted above does not recur.
	$responsive_css .= sgs_hover_media_wrap(
		sgs_border_gradient_css( SGS_HOVER_NOT_TOUCH . ' ' . $root_sel . ':hover', $hover_border_gradient )
	);
	$responsive_css .= sgs_border_gradient_css( $root_sel . ':focus-within', $hover_border_gradient );
}

// Hover colour shifts (background/text/border) — per-instance scoped rule,
// no resting-state declarations (empty array — the base colours are handled
// elsewhere), :hover/:focus-visible only. No-op when no hover colour is set.
// Resting text GRADIENT only. The flat resting colour keeps its existing preset-class
// path (has-text-color + has-{slug}-color, further down); emitting the flat case here
// as well would duplicate the declaration. Same split sgs/container uses.
$cta_resting_decls         = array();
$cta_resting_text_gradient = (string) ( $attributes['textColourGradient'] ?? '' );
if ( '' !== $cta_resting_text_gradient ) {
	$cta_resting_text_effective = sgs_resolve_text_colour_or_gradient( '', $cta_resting_text_gradient );
	if ( '' !== $cta_resting_text_effective ) {
		$cta_resting_text_decl = sgs_text_colour_decl( $cta_resting_text_effective );
		if ( '' !== $cta_resting_text_decl ) {
			$cta_resting_decls[] = $cta_resting_text_decl;
		}
	}
}

if ( $hover_decls || $cta_resting_decls ) {
	$responsive_css .= sgs_emit_state_colour_css( $root_sel, $cta_resting_decls, $hover_decls );
}

// Class marker used instead of a `[style*="background"]` attribute sniff,
// since background-image does not ride on the inline style attribute.
$has_bg_image_class = $has_image_bg;

if ( $shadow_value ) {
	$responsive_css .= $root_sel . '{box-shadow:' . $shadow_value . '}';
}

// HOVER-state shadow colour (Rule 31, 2026-08-22) — reuses the resting SHAPE
// with the hover colour composed in. Only emitted when a hover colour is set,
// so no shadow attr set at all still emits no CSS.
if ( $shadow_value && $shadow_value_hover && ( $attributes['shadowColourHover'] ?? '' ) ) {
	$responsive_css .= sgs_hover_state_rules( $root_sel, 'box-shadow:' . $shadow_value_hover, ':focus-within' );
}

// Build wrapper classes.
$classes = array(
	'sgs-cta-section',
	'sgs-cta-section--' . esc_attr( $content_layout ),
	$uid,
);

if ( $gradient_preset ) {
	$classes[] = 'sgs-cta-section--gradient-' . esc_attr( $gradient_preset );
}

if ( $has_bg_image_class ) {
	$classes[] = 'sgs-cta-section--has-bg-image';
}

// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
// --check. Composite caveat: values are read from $attributes['style'] and
// emitted into CTA-SECTION'S OWN scoped <style> — do NOT pass these as
// wrapper `extra_styles` (that path inlines). Base spacing (padding/margin)
// is a SEPARATE mechanism the wrapper already handles scoped internally.

$cta_style_engine_args = array();

$color_args = array();
if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
	$color_args['text'] = (string) $attributes['style']['color']['text'];
}
if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
	$color_args['background'] = (string) $attributes['style']['color']['background'];
}
if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
	$color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
}
if ( ! empty( $color_args ) ) {
	$cta_style_engine_args['color'] = $color_args;
}

// (native border_args removed by the Shape-B migration -- width/style/colour
//  are block-private attrs now, emitted below)

if ( ! empty( $cta_style_engine_args ) ) {
	$cta_scoped_styles = wp_style_engine_get_styles(
		$cta_style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $cta_scoped_styles['css'] ) ) {
		$responsive_css .= $cta_scoped_styles['css'];
	}
}

// Typography — declared selector (block.json selectors.typography.root)
// targets .sgs-cta-section__headline.
$typography_args = array();
if ( isset( $attributes['style']['typography']['fontSize'] ) && '' !== $attributes['style']['typography']['fontSize'] ) {
	$typography_args['fontSize'] = (string) $attributes['style']['typography']['fontSize'];
}
if ( isset( $attributes['style']['typography']['lineHeight'] ) && '' !== $attributes['style']['typography']['lineHeight'] ) {
	$typography_args['lineHeight'] = (string) $attributes['style']['typography']['lineHeight'];
}
if ( isset( $attributes['style']['typography']['letterSpacing'] ) && '' !== $attributes['style']['typography']['letterSpacing'] ) {
	$typography_args['letterSpacing'] = sgs_css_length_value( $attributes['style']['typography']['letterSpacing'] );
}
if ( isset( $attributes['style']['typography']['textTransform'] ) && '' !== $attributes['style']['typography']['textTransform'] ) {
	$typography_args['textTransform'] = sgs_css_keyword_sanitise( $attributes['style']['typography']['textTransform'] );
}
if ( isset( $attributes['style']['typography']['fontWeight'] ) && '' !== $attributes['style']['typography']['fontWeight'] ) {
	$typography_args['fontWeight'] = sgs_css_keyword_sanitise( (string) $attributes['style']['typography']['fontWeight'] );
}
if ( isset( $attributes['style']['typography']['fontStyle'] ) && '' !== $attributes['style']['typography']['fontStyle'] ) {
	$typography_args['fontStyle'] = sgs_css_keyword_sanitise( $attributes['style']['typography']['fontStyle'] );
}

/*
 * Native typography emits to the block ROOT (`$root_sel`), not a child
 * selector — the headline lives in an InnerBlocks `sgs/heading` child
 * (live DOM: `.sgs-cta-section__content > h2.wp-block-sgs-heading`).
 *
 * Emitting to the block ROOT instead is what core does — core/group,
 * core/cover and core/columns all declare typography supports with NO
 * selector pointing at a child, and rely on plain CSS inheritance to reach
 * their InnerBlocks children.
 *
 * This also gives the exact semantic Bean specified: a DECLARATION always
 * beats an INHERITED value regardless of specificity, so an unset child
 * inherits this container default, while any child that sets its own
 * typography wins automatically. Container overrides the default, never the
 * child's own choice — the "LAYERED DEFAULT + OVERRIDE" the verification bar
 * calls legitimate, as opposed to a TRUE DUPLICATE.
 *
 * ⚠ MEASURED LIMIT — font-size does NOT reach a heading child, and cannot.
 * Verified live on the canary 2026-08-15: with the container at 44px, an
 * unset `sgs/heading` child still computed 33.09px, not the container's
 * 38.76px. The block is innocent — `sgs/heading` declares `fontSize
 * default={}` and emits no base font-size (D338). The winner is
 * theme.json's `styles.elements.h2.typography.fontSize`, which is a
 * DECLARATION on the h2 element, and a declaration always beats an
 * inherited value.
 *
 * So inheritance carries only the properties theme.json does NOT declare on
 * the element — text-align among them. For font-size on a heading child the
 * container would need a descendant-scoped rule or a CSS custom property
 * the child consumes, which is exactly what the Mama's Munches draft does
 * (`.sgs-featured-product .sgs-section-heading__intro{font-size:16px}`).
 * Not built here: no defect currently demands it, and adding it would put
 * the container back to out-declaring its children.
 */
if ( ! empty( $typography_args ) ) {
	$typography_scoped = wp_style_engine_get_styles(
		array( 'typography' => $typography_args ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $typography_scoped['css'] ) ) {
		$responsive_css .= $typography_scoped['css'];
	}
}

/*
 * Text alignment reaches this block by TWO routes.
 *
 * 1. NATIVE CONTROL — block.json declares `supports.typography.textAlign`,
 *    so WordPress renders the "Align text" toolbar button. Verified live on
 *    the canary: clicking it writes `style.typography.textAlign`. Because the
 *    same supports block sets `__experimentalSkipSerialization`, WP does NOT
 *    emit the CSS itself — this file has to.
 *
 * 2. CLONING CONVERTER — the DB carries a real routing row for this block
 *    (`block_attributes`: textAlign → css_property `text-align`, css_element
 *    `headline`), so the converter writes the TOP-LEVEL `textAlign` attribute
 *    on cloned content. That read is therefore load-bearing and must stay:
 *    swapping the key over to the native one — the obvious "match the
 *    sibling" fix — would silently break every cloned CTA.
 *
 * The client's own editor action wins over a cloned default, so the native
 * key is checked first and the converter key is the fallback.
 */
$cta_text_align = '';
if ( isset( $attributes['style']['typography']['textAlign'] ) ) {
	$cta_text_align = $attributes['style']['typography']['textAlign'];
} elseif ( isset( $attributes['textAlign'] ) ) {
	$cta_text_align = $attributes['textAlign'];
}
if ( in_array( $cta_text_align, array( 'left', 'center', 'right' ), true ) ) {
	$responsive_css .= $root_sel . '{text-align:' . esc_attr( $cta_text_align ) . '}';
}

// Skip-serialised `color` support also stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add them
// manually (mirrors sgs/hero / sgs/quote) so preset palette colours still
// resolve visually.
$cta_preset_text_slug = isset( $attributes['textColour'] ) ? sanitize_html_class( $attributes['textColour'] ) : '';
$cta_preset_bg_slug   = isset( $attributes['backgroundColour'] ) ? sanitize_html_class( $attributes['backgroundColour'] ) : '';
if ( '' !== $cta_preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $cta_preset_text_slug . '-color';
}
if ( '' !== $cta_preset_bg_slug ) {
	$classes[] = 'has-background';
	$classes[] = 'has-' . $cta_preset_bg_slug . '-background-color';
}

// WS-4: the OUTER wrapper is now the shared sgs/container element (rendered by
// SGS_Container_Wrapper::render() at the foot of this file). cta-section's own
// classes + CSS vars + bespoke cover-image background ride through via opts.
//
// D643: `no_overlay` is NOT passed to the wrapper here — that flag would suppress
// the WRAPPER's `.sgs-container__overlay` span, the only place
// `backgroundOverlayColour`/`overlayGradient` (exposed via `<BackgroundPanel>` in
// edit.js) are read and painted.
// This is NOT the same overlay as cta-section's own `.sgs-cta-section__overlay`
// span below, which only darkens a background IMAGE/VIDEO via
// `--sgs-cta-overlay-opacity` (a single fixed `primary-dark` tint tied to
// `backgroundImageOpacity`) — a narrower, distinct feature. The two spans do
// not double-emit the same thing: style.css already excludes
// `.sgs-cta-section__overlay` from the wrapper's generic child-positioning
// reset (`container/style.css:63`), proving the framework already expects
// both to coexist. So `no_overlay` is no longer passed — the wrapper's
// colour/gradient overlay now paints underneath cta-section's own
// image-darkening overlay when both are set (predictable stacking, not a
// conflict).

// Build background media (video) + overlay.
$media_html = '';
if ( $has_video_bg ) {
	$video_attrs = array_merge(
		$resolved_media,
		array(
			'video_options' => array(
				'autoplay'    => true,
				'loop'        => true,
				'muted'       => true,
				'playsinline' => true,
				'controls'    => false,
			),
		)
	);
	// sgs_render_media() emits a <video class="sgs-media sgs-media--video sgs-media--sgs-cta-section">.
	// Wrap so the video sits behind the content + overlay without affecting layout.
	$rendered_video = sgs_render_media( $video_attrs, 'sgs/cta-section' );
	if ( '' !== $rendered_video ) {
		$media_html = '<div class="sgs-cta-section__bg-media" aria-hidden="true">' . $rendered_video . '</div>';
	}
}

// No-inline contract (FR-32-1 / FR-32-4 as amended 2026-07-18, D345): `opacity`
// is a real CSS property, so it is not set via inline style="opacity:…" — AND
// the custom-property VALUE may not ride inline either.
//
// The overlay is a SINGLETON per block instance (one <span>, one value), so it
// takes the plain root-scoped shape — not the `:nth-child(N)` per-item shape.
// $responsive_css is printed into this block's own scoped <style> below.
$overlay_html = '';
if ( $resolved_media ) {
	$responsive_css .= $root_sel . ' .sgs-cta-section__overlay{--sgs-cta-overlay-opacity:' . esc_attr( $background_image_opacity / 100 ) . ';}';
	$overlay_html    = '<span class="sgs-cta-section__overlay" aria-hidden="true"></span>';
}

// Build stats HTML.
$stats_html = '';
if ( ! empty( $stats ) ) {
	$stats_html .= '<div class="sgs-cta-section__stats">';
	foreach ( $stats as $stat ) {
		$stat_text = $stat['text'] ?? '';
		if ( ! $stat_text ) {
			continue;
		}
		$stats_html .= sprintf(
			'<span class="sgs-cta-section__stat">%s</span>',
			esc_html( $stat_text )
		);
	}
	$stats_html .= '</div>';
}

// $content is the full InnerBlocks output (sgs/heading + sgs/text +
// sgs/multi-button children). Wrap in __content to preserve CSS layout.
// Stats remain scalar — they are a shell-level data primitive (not plain text
// that a child block replicates), kept per FR-22-19 discriminator.

// Build ribbon HTML — content escaped with esc_html() at construction time.
$ribbon_html = '';
if ( $ribbon ) {
	$ribbon_html = '<span class="sgs-cta-section__ribbon" aria-hidden="true">' . esc_html( $ribbon ) . '</span>';
}

// WS-4: build cta-section's unique interior (bg-video + overlay + ribbon + the
// __content column with its InnerBlocks + stats), then wrap it in the shared
// sgs/container element. $content is WP core InnerBlocks output (trusted); all
// other parts are pre-escaped at construction time.
$cta_inner_html = $media_html . $overlay_html . $ribbon_html
	. '<div class="sgs-cta-section__content">' . $content . $stats_html . '</div>';

// Output responsive CSS if needed. wp_strip_all_tags (NOT esc_html) blocks a
// </style> breakout while leaving CSS combinators like `>` intact (contract
// §D — matches SGS_Container_Wrapper + sgs/hero + sgs/quote). Every value
// reaching $responsive_css is pre-sanitised (sgs_css_length_value() / sgs_css_keyword_sanitise()
// / esc_url / esc_attr / wp_style_engine_get_styles), so no un-sanitised value
// survives to here.
if ( $responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below; $responsive_css built from pre-sanitised values only.
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), wp_strip_all_tags( $responsive_css ) );
}

// cta-section keeps its bespoke cover-image background ($wrapper_styles -> extra_styles)
// and its own opacity overlay (in the interior, image/video darkening only). Null the
// helper's backgroundImage so it does NOT also emit a CSS background (C3 double-emit
// guard — this one IS a real duplicate: both would paint the same image). `shadow` is
// ALSO nulled — cta-section now emits box-shadow itself (scoped, above) so the wrapper
// must not re-emit it via extra_styles (which would inline it). The full container attr
// surface is still mirrored for editor controls.
//
// `no_overlay` is deliberately NOT passed (D643) — that flag suppresses the wrapper's
// `backgroundOverlayColour`/`overlayGradient` emission, a distinct feature from
// cta-section's own image-darkening overlay above. See the comment above the WS-4
// note for the full rationale.
$cta_helper_attrs                    = $attributes;
$cta_helper_attrs['backgroundImage'] = null;
$cta_helper_attrs['shadow']          = null;

$cta_wrapper_opts = array(
	'tag'           => isset( $attributes['tagName'] ) ? sanitize_key( $attributes['tagName'] ) : 'section',
	'extra_classes' => $classes,
	'extra_styles'  => $wrapper_styles,
);

// Landmark label (nav/aside only — main was removed from the tagName allowlist
// entirely; header/footer lose their landmark role once nested so need no label).
if ( in_array( $cta_wrapper_opts['tag'], array( 'nav', 'aside' ), true ) && ! empty( $attributes['ariaLabel'] ) ) {
	$cta_wrapper_opts['extra_attrs'] = array(
		'aria-label' => sanitize_text_field( $attributes['ariaLabel'] ),
	);
}

// Spec 35 item 18 — the background image itself never becomes a frontend
// <img> (it paints as a CSS background, always invisible to assistive tech
// with no alt of its own — the only literal <img> is the operator-only
// MediaPicker preview thumbnail in the editor). `backgroundImageDecorative`
// defaults true to match that reality. The rare operator who explicitly
// marks it non-decorative and supplies alt text on the picked image gets
// the standard WCAG technique for an informative CSS background: role="img"
// + aria-label on the painting element (G196/C9), applied here ONLY when no
// landmark aria-label has already claimed the slot (mutually exclusive —
// never overwrite a real landmark name).
if (
	empty( $cta_wrapper_opts['extra_attrs']['aria-label'] )
	&& $has_image_bg
	&& ! ( $attributes['backgroundImageDecorative'] ?? true )
	&& ! empty( $resolved_media['alt'] )
) {
	$cta_wrapper_opts['extra_attrs']               = $cta_wrapper_opts['extra_attrs'] ?? array();
	$cta_wrapper_opts['extra_attrs']['role']       = 'img';
	$cta_wrapper_opts['extra_attrs']['aria-label'] = sanitize_text_field( $resolved_media['alt'] );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
echo SGS_Container_Wrapper::render(
	$cta_helper_attrs,
	$block,
	$cta_inner_html,
	SGS_Container_Wrapper::resolve_kind( $block, 'section' ),
	$cta_wrapper_opts
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
