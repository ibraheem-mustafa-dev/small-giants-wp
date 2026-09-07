<?php
/**
 * Server-side render for the SGS Testimonial Slider block.
 *
 * Slides are sgs/testimonial InnerBlocks (FR-22-6). The render iterates
 * $block->inner_blocks, renders each child via $inner_block->render(), and
 * wraps it in the existing .sgs-testimonial-slider__slide container so
 * view.js (which queries '.sgs-testimonial-slider__slide') and style.css
 * work unchanged.
 *
 * Dots and arrows are derived from count( $block->inner_blocks ) so the
 * navigation count is always in sync with the actual number of testimonials.
 *
 * Schema.org Review JSON-LD is rebuilt from each inner block's stored
 * attributes (read from $inner_block->parsed_block['attrs']) so structured
 * data is preserved without requiring the scalar testimonials array.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 * The block's own color + typography values are emitted into THIS BLOCK'S
 * OWN scoped `.{uid}` <style> (composite caveat — mirrors sgs/hero — these do
 * NOT ride through the shared wrapper's `extra_styles`, which would inline
 * them). Base spacing/border-radius/max-width remain the wrapper's own
 * scoped mechanism (unchanged). The transition + hover-colour CSS
 * custom-property VALUES ($css_vars below) are allowed inline (a `--x:y` var
 * value is not a property declaration) and continue to ride the wrapper's
 * `extra_styles`.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — we iterate inner_blocks directly).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (textTransform / fontWeight / fontStyle / border-style) —
// letters + hyphen only. Mirrors sgs/hero's proven sanitiser.
// CSS length/unit sanitiser — for free-text length values (letterSpacing,
// border width/radius) concatenated into raw CSS declarations.
// ── Attribute extraction ───────────────────────────────────────────────────
$autoplay       = $attributes['autoplay'] ?? false;
$autoplay_speed = $attributes['autoplaySpeed'] ?? 5000;
$show_dots      = $attributes['showDots'] ?? true;
$show_arrows    = $attributes['showArrows'] ?? true;
$slides_visible = $attributes['slidesVisible'] ?? 1;
// NOTE: cardStyle is no longer read here — the slide wrapper is positioning-only
// (Bean-locked card-in-a-card de-style). It flows to child sgs/testimonial blocks
// as `sgs/testimonialVariant` via block.json `providesContext`, resolved in
// sgs/testimonial's own render.php ($block->context), not by this parent.
// backgroundColourHover is read by sgs_fill_decls() directly (below) — no
// local variable needed. textColourHover is still read here: it feeds the
// gradient-resolve calc below, not the combined hover-decls array (D744
// pattern moved it out of that array — see the comment further down).
$hover_text_colour   = $attributes['textColourHover'] ?? '';
$hover_border_colour = $attributes['borderColourHover'] ?? '';
// D636 border-colour gradient rollout — non-empty wins over the flat
// $hover_border_colour above, painted via the shared masked ::before ring
// mechanism, scoped to :hover/:focus-within.
$hover_border_gradient = sgs_css_gradient_value( $attributes['borderColourHoverGradient'] ?? '' );
$hover_effect        = $attributes['effectHover'] ?? 'none';
// transitionDuration/transitionEasing are read directly by sgs_transition_vars()
// below — no local variable needed here.

/*
 * Drag momentum — BLOCK-PRIVATE, deliberately NOT the shared Tier G roster.
 * This carousel is `overflow: hidden` with a transform-based clone-loop
 * driven by `--sgs-slider-offset`, so it is never a genuine native
 * `overflow-x: auto|scroll` element — the shared runtime's
 * `isNativeHorizontalScroller()` check cannot attach to it.
 *
 * The working mechanism is this block's OWN: the pointer-drag in view.js
 * plus its private InertiaPlugin momentum layer, which imports the plugin
 * dynamically and only for an instance that opted in — so a page with the
 * toggle off still fetches zero bytes of GSAP. The marker below is
 * block-private grammar (`data-sgs-slider-momentum`), read only by this
 * block's view.js, and is invisible to the shared registry's `data-sgs-fx`
 * sniff by construction.
 */
$drag_to_scroll = (bool) ( $attributes['dragToScroll'] ?? false );

$track_momentum_attr = $drag_to_scroll ? ' data-sgs-slider-momentum="true"' : '';

// Derive total slide count from actual inner blocks.
$inner_blocks       = $block->inner_blocks ?? array();
$total_testimonials = count( $inner_blocks );

// ── Wrapper classes + CSS vars ─────────────────────────────────────────────
$classes = array(
	'sgs-testimonial-slider',
);
$allowed_effects   = array( 'none', 'lift', 'scale', 'glow' );
$safe_hover_effect = in_array( $hover_effect, $allowed_effects, true ) ? $hover_effect : 'none';
if ( 'none' !== $safe_hover_effect ) {
	$classes[] = 'sgs-testimonial-slider--hover-' . esc_attr( $safe_hover_effect );
}

// ── Scoped-style uid (NO-INLINE contract — Spec 32) ─────────────────────────
// Own uid, independent of the wrapper's internal responsive-CSS uid — used to
// scope THIS BLOCK'S color/typography <style> below (mirrors sgs/hero). This
// is a CLASS (contract §B3-style scoping) — the root also carries the WP
// `anchor` id, so the scoped hook must never collide with it.
$uid      = 'sgs-testimonial-slider-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-testimonial-slider';
$classes[] = $uid;

// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// Read the resolved values from $attributes['style'] here and emit them into
// THIS BLOCK'S OWN scoped <style> (composite caveat — do NOT pass these as
// wrapper `extra_styles`, that path inlines). Base spacing/border-radius/
// max-width is a SEPARATE mechanism the wrapper already handles scoped
// internally — not duplicated here.
$slider_scoped_css = '';

// Text colour (flat-or-gradient, base + hover) — block-private, on the SAME
// root selector as the background paint below.
//
// ⛔ NOT sgs_text_decls()/sgs_emit_state_colour_css() — that pair is
// text-decls-NAIVE: sgs_text_decls() resolves flat-vs-gradient via
// sgs_resolve_text_colour_or_gradient() but then feeds the result through
// sgs_colour_value() unconditionally, which expects a slug/hex, not a full
// gradient() function string. Verified live (2026-09-04): with a gradient
// set it emitted `color:var(--wp--preset--color--linear-gradient90degff...)`
// — garbage, not a working gradient. sgs/info-box's own D744 rollout has
// this exact same defect (verified live via the same probe method), so this
// is a real pre-existing bug in that pairing, not something specific to
// this block — the CORRECT pattern (proven live on sgs/pricing-table's
// ctaColour, sgs/modal's closeColourText, sgs/google-reviews) is
// sgs_resolve_text_colour_or_gradient() -> sgs_text_colour_decl() ->
// sgs_text_colour_gradient_fallback_rule(), used below instead.
$slider_text_normal_resolved = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['textColour'] ?? '' ),
	(string) ( $attributes['textColourGradient'] ?? '' )
);
if ( '' !== $slider_text_normal_resolved ) {
	$slider_text_normal_decl = sgs_text_colour_decl( $slider_text_normal_resolved );
	if ( '' !== $slider_text_normal_decl ) {
		$slider_scoped_css .= $root_sel . '{' . $slider_text_normal_decl . '}';
	}
	$slider_scoped_css .= sgs_text_colour_gradient_fallback_rule( $root_sel, $slider_text_normal_resolved );
}

$slider_text_hover_resolved = sgs_resolve_text_colour_or_gradient(
	$hover_text_colour,
	(string) ( $attributes['textColourHoverGradient'] ?? '' )
);
if ( '' !== $slider_text_hover_resolved ) {
	$slider_text_hover_decl = sgs_text_colour_decl( $slider_text_hover_resolved );
	if ( '' !== $slider_text_hover_decl ) {
		$slider_scoped_css .= sgs_hover_state_rules( $root_sel, $slider_text_hover_decl, ':focus-visible' );
	}
	if ( $slider_text_hover_resolved !== $slider_text_normal_resolved ) {
		$slider_scoped_css .= sgs_hover_media_wrap(
			sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $root_sel . ':hover', $slider_text_hover_resolved )
		) . sgs_text_colour_gradient_fallback_rule( $root_sel . ':focus-visible', $slider_text_hover_resolved );
	}
}

// Background (colour + gradient, resting + hover) — painted on a `::after`
// layer, never the root itself, so the text colour/gradient above
// (background-clip:text on the SAME $root_sel) cannot clip or overwrite it
// (both use background-image). Mirrors sgs/info-box (D744). The border
// gradient's masked ring (below) owns `::before` on this same root, so
// `::after` is free.
//
// supports.color.gradients was `true` here, so CORE rendered its own gradient
// panel in the Styles tab, competing with the SGS colour panel — the client saw
// two and could not tell which won. Switching the flag off alone would have
// REMOVED the only gradient control this block had, because the sole gradient
// read was $attributes['style']['color']['gradient'] (core's own storage). The
// flag flip is therefore PAIRED with a block-private backgroundColourGradient
// exposed through fillRow(), so capability is moved rather than lost.
$slider_bg_decls = sgs_fill_decls(
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
$slider_scoped_css .= sgs_block_background_layer_css(
	$root_sel,
	$slider_bg_decls['normal'][0] ?? '',
	$slider_bg_decls['hover'][0] ?? ''
);

// (native border_args removed by the Shape-B migration -- width/style/colour
//  are block-private attrs now, emitted below)

// Typography — root prefix '', shared TypographyControls/sgs_typography_css_rule()
// mechanism (D971/D972 full-replacement track). The block itself renders no
// direct text node (the quote text belongs to the child sgs/testimonial
// InnerBlocks), so this scopes to the root element, not the stale/unused
// block.json `selectors.typography` (.sgs-testimonial-slider__quote — no
// element in this block's own markup ever carried that class). Replaces the
// old WP-native supports.typography (fontSize/lineHeight/letterSpacing/
// textTransform/fontWeight/fontStyle/textAlign) — letterSpacing/textTransform/
// textAlign are honest gaps the shared helper doesn't cover (matches
// sgs/accordion's wrapper element).
$slider_scoped_css .= sgs_typography_css_rule( $attributes, '', $root_sel );

// Skip-serialised `color` support also stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add them
// manually (mirrors sgs/hero + sgs/quote) so preset palette colours still
// resolve visually.
$slider_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$slider_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $slider_preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $slider_preset_text_slug . '-color';
}
if ( '' !== $slider_preset_bg_slug ) {
	$classes[] = 'has-background';
	$classes[] = 'has-' . $slider_preset_bg_slug . '-background-color';
}

// ── Own CSS vars — carried as extra_styles into the wrapper helper ─────────
// SGS_Container_Wrapper merges these with any container-level style declarations
// (gap, align/maxWidth/contentWidth, etc.) before calling get_block_wrapper_attributes().
$css_vars = sgs_transition_vars( $attributes );

// Hover colours emit as a scoped `.{uid}.sgs-testimonial-slider:hover{…}` rule

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
		$slider_scoped_css .= $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$slider_scoped_css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$slider_scoped_css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
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
$radius_tiers = sgs_border_radius_tiers( $attributes );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$slider_scoped_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$slider_scoped_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$slider_scoped_css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// (assembled below, appended to $slider_scoped_css), NOT as inline
// `--sgs-hover-*` VALUES. An inline `--var` (a) leaves a `style` attribute on
// the root and (b) breaks the former `[style*="--sgs-hover-*"]`
// presence-selector gate the moment the value moves scoped (Spec 32 FR-32-4 as
// amended 2026-07-18 / D345; footprint GOTCHA F). A per-instance `:hover` rule
// beats the base rule and applies only when the operator set a hover colour —
// variant-safe, so no resting-value fallback is needed (mirrors sgs/info-box).
//
// D744-pattern rollout (2026-09-04): background/text hover colours moved OUT
// of this array — they are now emitted above by
// sgs_block_background_layer_css()/sgs_emit_state_colour_css() (background on
// its own `::after` layer; text alongside its base state), so building them
// here too would duplicate the same declarations on the same selector.
$slider_hover_decls = array();
if ( $hover_border_colour ) {
	$slider_hover_decls[] = 'border-color:' . sgs_colour_value( $hover_border_colour );
}
if ( $slider_hover_decls ) {
	// Via the ONE shared hover-colour helper — also emits the `:focus-visible`
	// twin a keyboard user needs.
	$slider_scoped_css .= sgs_emit_state_colour_css( $root_sel, array(), $slider_hover_decls );
}

// D636 border-colour gradient rollout — masked ::before ring, scoped to
// :hover/:focus-within only (mirrors sgs/testimonial's own borderColourHover
// gradient — same hover-only semantics, no resting-state border to override).
if ( '' !== $hover_border_gradient ) {
	// Touch-safe: sgs_border_gradient_css() has no hover-only mode (it bails
	// when $normal_paint is empty), so a hover-scoped selector is baked in as
	// its own "normal_paint" call — this must therefore carry its own guard
	// rather than relying on the helper's $hover_paint branch. Layer 1 (media)
	// wraps the whole rule via sgs_hover_media_wrap(); layer 2 (touch class) is
	// prefixed onto the selector per that function's own documented pattern
	// for opaque-rule callers. Focus-within stays outside both guards.
	$slider_scoped_css .= sgs_hover_media_wrap(
		sgs_border_gradient_css(
			SGS_HOVER_NOT_TOUCH . ' ' . $root_sel . ':hover',
			$hover_border_gradient,
			null,
			'1px'
		)
	);
	$slider_scoped_css .= sgs_border_gradient_css(
		$root_sel . ':focus-within',
		$hover_border_gradient,
		null,
		'1px'
	);
}

// ── Own extra attrs — carousel data-* + ARIA region attrs ─────────────────
// view.js queries .sgs-testimonial-slider[data-autoplay] / [data-speed] /
// [data-slides] on the OUTER wrapper. These must ride through extra_attrs so
// they are present on the element that get_block_wrapper_attributes() emits.
// role/aria-roledescription/aria-label ride the same array so the wrapper
// helper owns the tag.
$slider_extra_attrs = array(
	'data-autoplay'        => $autoplay ? 'true' : 'false',
	'data-speed'           => (string) absint( $autoplay_speed ),
	'data-slides'          => (string) absint( $slides_visible ),
	'role'                 => 'region',
	'aria-roledescription' => 'carousel',
	'aria-label'           => esc_attr__( 'Customer Testimonials', 'sgs-blocks' ),
);

// ── Track style ────────────────────────────────────────────────────────────
// Scoped rule (not an inline `style=` attr) — this block's own `<style>`
// mechanism ($slider_scoped_css / $root_sel, built above) already exists, so
// the track's --sgs-slides-visible value rides that channel instead of a
// literal `style=` attribute on the __track element.
$slider_scoped_css .= $root_sel . ' .sgs-testimonial-slider__track{--sgs-slides-visible:' . absint( $slides_visible ) . '}';
$track_style_attr   = '';

// ── Unique prefix for slide/dot IDs ────────────────────────────────────────
$slider_prefix = wp_unique_id( 'sgs-slider-' );

// ── Build slides from InnerBlocks ──────────────────────────────────────────
// Each sgs/testimonial child is rendered by its own render.php (which echoes
// its card shell + $content). We wrap it in .sgs-testimonial-slider__slide
// so view.js querySelectorAll('.sgs-testimonial-slider__slide') still finds it,
// and CSS scroll-snap / flex-sizing rules continue to apply unchanged.
$slides_html  = '';
$schema_items = array();
$slide_index  = 1;

foreach ( $inner_blocks as $inner_block ) {
	// Render the child block — this calls sgs/testimonial's render.php.
	$child_html = $inner_block->render();

	// WCAG 2.2: role="group" + aria-roledescription="slide" + aria-label="N of Total"
	// gives carousel slides a clear semantic identity for screen readers.
	/* translators: 1: current slide number, 2: total number of slides */
	$slide_label = esc_attr( sprintf( __( '%1$d of %2$d', 'sgs-blocks' ), $slide_index, $total_testimonials ) );
	$slide_id    = esc_attr( $slider_prefix ) . '-slide-' . $slide_index;

	$slides_html .= sprintf(
		'<div id="%s" class="sgs-testimonial-slider__slide" role="group" aria-roledescription="slide" aria-label="%s">%s</div>',
		$slide_id,
		$slide_label,
		$child_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered by WP block API.
	);

	// ── Collect Schema.org data from inner block attrs ─────────────────────
	// $inner_block->parsed_block['attrs'] holds the stored block comment JSON.
	// These attrs are present on both old posts and new converter-generated posts.
	$child_attrs  = $inner_block->parsed_block['attrs'] ?? array();
	$child_name   = wp_strip_all_tags( $child_attrs['name'] ?? '' );
	$child_quote  = wp_strip_all_tags( $child_attrs['quote'] ?? '' );
	$child_rating = isset( $child_attrs['ratingStars'] ) ? (float) $child_attrs['ratingStars'] : 0;

	if ( '' !== trim( $child_name ) && '' !== trim( $child_quote ) ) {
		$review = array(
			'@type'      => 'Review',
			'reviewBody' => trim( $child_quote ),
			'author'     => array(
				'@type' => 'Person',
				'name'  => trim( $child_name ),
			),
		);
		if ( $child_rating > 0 ) {
			$review['reviewRating'] = array(
				'@type'       => 'Rating',
				'ratingValue' => $child_rating,
				'bestRating'  => 5,
			);
		}
		$schema_items[] = $review;
	}

	++$slide_index;
}

// ── Arrows — always rendered when showArrows is enabled, regardless of count
// (nav must show and rotate even when total === slidesVisible, e.g. 4 cards,
// 3 visible).
$arrow_prev_html = '';
$arrow_next_html = '';
if ( $show_arrows && $total_testimonials > 0 ) {
	// Chevron SVGs from the shared Lucide icon library (same mechanism used by
	// sgs/accordion-item + sgs/nav-menu). The SVG is trusted static markup
	// from sgs_get_lucide_icon() (mirrors the escaping pattern used elsewhere
	// in this codebase for the same helper).
	$arrow_prev_icon = function_exists( 'sgs_get_lucide_icon' ) ? sgs_get_lucide_icon( 'chevron-left' ) : '';
	$arrow_next_icon = function_exists( 'sgs_get_lucide_icon' ) ? sgs_get_lucide_icon( 'chevron-right' ) : '';

	$arrow_prev_html = '<button class="sgs-testimonial-slider__arrow sgs-testimonial-slider__arrow--prev" aria-label="' . esc_attr__( 'Previous testimonial', 'sgs-blocks' ) . '" type="button"><span class="sgs-testimonial-slider__arrow-icon" aria-hidden="true">' . $arrow_prev_icon . '</span></button>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted static SVG from sgs_get_lucide_icon().
	$arrow_next_html = '<button class="sgs-testimonial-slider__arrow sgs-testimonial-slider__arrow--next" aria-label="' . esc_attr__( 'Next testimonial', 'sgs-blocks' ) . '" type="button"><span class="sgs-testimonial-slider__arrow-icon" aria-hidden="true">' . $arrow_next_icon . '</span></button>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted static SVG from sgs_get_lucide_icon().
}

// ── Dots — always rendered when showDots is enabled, regardless of count.
$dots_html = '';
if ( $show_dots && $total_testimonials > 0 ) {
	$dots_html = '<div class="sgs-testimonial-slider__dots" role="group" aria-label="' . esc_attr__( 'Testimonial navigation', 'sgs-blocks' ) . '">';
	for ( $d = 1; $d <= $total_testimonials; $d++ ) {
		$is_first    = ( 1 === $d );
		$this_dot_id = esc_attr( $slider_prefix ) . '-dot-' . $d;
		$controls_id = esc_attr( $slider_prefix ) . '-slide-' . $d;
		$dots_html  .= sprintf(
			'<button id="%s" class="sgs-testimonial-slider__dot%s" aria-current="%s" aria-controls="%s" aria-label="%s" type="button"></button>',
			$this_dot_id,
			$is_first ? ' sgs-testimonial-slider__dot--active' : '',
			$is_first ? 'true' : 'false',
			$controls_id,
			/* translators: %d = slide number */
			esc_attr( sprintf( __( 'Go to testimonial %d', 'sgs-blocks' ), $d ) )
		);
	}
	$dots_html .= '</div>';
}

// ── Controls bar (dots + pause button slot) — always rendered when there are
// slides, so view.js can always inject the pause button into __controls, even
// when dots are hidden.
$controls_html = '';
if ( $total_testimonials > 0 ) {
	$controls_html = '<div class="sgs-testimonial-slider__controls">' . $dots_html . '</div>';
}


// ── Schema.org Review JSON-LD ──────────────────────────────────────────────
// Rebuilt from inner block attrs above. If $total_testimonials is 0
// (block has no inner blocks yet — e.g. freshly inserted), no schema emitted.
$schema_html = '';
if ( ! empty( $schema_items ) ) {
	$schema_html = sprintf(
		'<script type="application/ld+json">%s</script>',
		// One shared encoder (FR-30-9): JSON_UNESCAPED_SLASHES disabled PHP's default
		// `\/` guard with no JSON_HEX_TAG to replace it, so a `</script>` in any
		// testimonial quote or attribution could close this tag. Sgs_Schema adds
		// JSON_HEX_TAG.
		\SGS\Blocks\Sgs_Schema::encode_jsonld( $schema_items )
	);
}

/*
 * ── Output ─────────────────────────────────────────────────────────────────
 * WCAG 2.2 AA — carousel pattern (ARIA 1.2):
 * - Outer wrapper: role="region" + aria-roledescription="carousel" + aria-label
 * - Track: aria-live="polite" announces slide changes to screen readers
 * - Slides: role="group" + aria-label="N of Total" (view.js updates on transition)
 *
 * Layout structure (non-split):
 *   .sgs-testimonial-slider  (outer wrapper)
 *     .sgs-testimonial-slider__stage  (flex row: [prev] [track] [next])
 *       .sgs-testimonial-slider__arrow--prev
 *       .sgs-testimonial-slider__track
 *       .sgs-testimonial-slider__arrow--next
 *     .sgs-testimonial-slider__controls  (below row: dots + injected pause btn)
 *       .sgs-testimonial-slider__dots
 *
 * Arrows flank the track as flex siblings — they never overlap card content.
 * Controls bar sits beneath the full-width card row, centred.
 */
$slider_inner = sprintf(
	'<div class="sgs-testimonial-slider__stage">%s<div class="sgs-testimonial-slider__track" aria-live="polite" tabindex="0"%s%s>%s</div>%s</div>%s',
	$arrow_prev_html,
	$track_style_attr,
	$track_momentum_attr,
	$slides_html,
	$arrow_next_html,
	$controls_html
);

// ── Build $inner_html for the wrapper helper ───────────────────────────────
// The slider inner IS the interior. $schema_html is appended outside the region
// tag (same as before) — it is a <script type="application/ld+json"> which must
// not be inside a landmark.
$carousel_inner = $slider_inner;

// ── Own scoped <style> (no-inline contract §A) ──────────────────────────────
// $slider_scoped_css holds this block's color/typography/border output (built
// above via wp_style_engine_get_styles, all pre-sanitised). wp_strip_all_tags
// (NOT esc_html) blocks a Contributor CSS-injection payload from smuggling a
// closing </style> while leaving `>` combinators intact — mirrors sgs/hero.
$slider_style_tag = '';
if ( $slider_scoped_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below; $slider_scoped_css built from pre-sanitised values only.
	$slider_style_tag = sprintf( '<style id="%s">%s</style>', esc_attr( $uid ), wp_strip_all_tags( $slider_scoped_css ) );
}

// ── WS-4 wrapper via SGS_Container_Wrapper ─────────────────────────────────
// tag='div' — WCAG carousel region is a <div>; the __stage/__track structure
// is preserved in $carousel_inner. CSS vars (transition, hover) ride in
// extra_styles (custom-property VALUES only — allowed inline per §A). Carousel
// data-* + ARIA region attributes ride in extra_attrs. $schema_html is appended
// after the wrapper element (outside the landmark).
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- HTML built with esc_* helpers throughout; $schema_html uses wp_json_encode; $slider_style_tag pre-sanitised above.
echo $slider_style_tag . SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$carousel_inner,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => $classes,
		'extra_styles'  => $css_vars,
		'extra_attrs'   => $slider_extra_attrs,
	)
) . $schema_html;
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
