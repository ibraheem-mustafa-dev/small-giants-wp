<?php
/**
 * Server-side render for sgs/label.
 *
 * Converts the block from static to dynamic so the converter pipeline's
 * self-closing block comments (`<!-- wp:sgs/label {attrs} /-->`) produce the
 * expected DOM. Without this file the static save.js HTML never gets
 * rendered for cv2-emitted instances, so the `sgs-section-heading__label`
 * className (and the label text) never reach the deployed page.
 *
 * Render is a faithful PHP port of save.js. Existing static instances on
 * already-published posts continue to round-trip via their stored save
 * HTML; only new (cv2-emitted) instances flow through this renderer.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 *
 * BOX-GROUP (contract §B): `padding` is a SGS custom object attr (this block
 * has no WP-native `spacing.padding` support — padding is pill-gated, so it
 * cannot be a plain WP style.spacing.padding value). Tiers = paddingTablet /
 * paddingMobile object attrs (scoped @media 1023/767), pill-gated identically
 * to the base. `margin` IS a WP-native style.spacing.margin object (skip-
 * serialised, scoped via wp_style_engine_get_styles); marginTablet/
 * marginMobile tiers are SGS custom object attrs, NOT pill-gated.
 * `borderRadius` stays a single scalar number (one uniform value, not a
 * 4-corner family — Spec 32 §6.1(c)) but is rendered scoped, never inline.
 *
 * @since 2026-05-16  P-PHASE8-2 render.php audit
 * @since 2026-07-10  No-inline migration (padding object + scoped output).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Security sanitisers (contract §D) — a CSS-keyword sanitiser for free-text
// properties (mirrors sgs/heading + sgs/container). Box/side CSS-length values
// are sanitised inside the shared sgs_label_box_css_rule() helper
// (sgs_css_length_sanitise), so no local length closure is needed here.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 2. Extract attributes with defaults.
// ---------------------------------------------------------------------------

$text = $attributes['text'] ?? '';
// sgs/label always renders a <span> — there is no HTML-tag chooser; the
// converter never emits one.
$tag_name          = 'span';
$text_colour       = $attributes['textColour'] ?? '';
// D636 shape — sibling gradient attribute, wins over $text_colour when set+
// valid (mirrors sgs/heading/sgs/text; added here 2026-08-22 alongside the
// text/background pseudo-element split).
$text_colour_gradient = $attributes['textColourGradient'] ?? '';
$background_colour    = $attributes['backgroundColour'] ?? '';
// fontSize/fontWeight/fontStyle/lineHeight/letterSpacing/textTransform/
// textDecoration/fontFamily/textAlign are all emitted via the shared
// sgs_typography_css_rule() helper below (step 4, D971/D972 full-replacement
// track) — no local variables needed for them any more.
$border_radius = $attributes['borderRadius'] ?? '';

// Style-variant detection. Padding / background / radius paint on VALUE-
// PRESENCE: the pill block-styles are one-click convenience presets that SET
// those values, not a gate on whether they render. The only thing still keyed
// on a variant is the DISPLAY model — when an is-style-* class is present the
// variant's own CSS owns display, so render.php emits none.
$extra_classes     = isset( $attributes['className'] ) ? $attributes['className'] : '';
$has_style_variant = ( false !== strpos( $extra_classes, 'is-style-' ) );
$full_width        = ! empty( $attributes['fullWidth'] );

// Padding — SGS custom TIER-OF-BOXES object attr {desktop,tablet,mobile}, each
// tier a { top, right, bottom, left } box (Spec 35 box-tier migration,
// 2026-08-11 — the paddingTablet/paddingMobile sibling attrs no longer exist
// in this block's schema). sgs_responsive_normalise_object() is the canonical
// reader (helpers-responsive.php:273), box=true so an unset/legacy value never
// mis-resolves as a flat side (D328 defence). Ungated 2026-07-12
// (value-presence): padding paints whenever a value is set, emitted via the
// shared sgs_label_box_css_rule() helper below.
$padding_tiers      = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$padding_obj        = is_array( $padding_tiers['desktop'] ) ? $padding_tiers['desktop'] : array();
$padding_tablet_obj = is_array( $padding_tiers['tablet'] ) ? $padding_tiers['tablet'] : array();
$padding_mobile_obj = is_array( $padding_tiers['mobile'] ) ? $padding_tiers['mobile'] : array();

// Margin — WP-native style.spacing.margin object (skip-serialised → emitted
// scoped via the style engine below), NOT pill-gated. Tiers are SGS custom
// object attrs, also not pill-gated.
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $margin_side => $margin_value ) {
		if ( is_string( $margin_value ) && '' !== $margin_value ) {
			$base_margin_obj[ $margin_side ] = $margin_value;
		}
	}
}
$margin_tablet_obj = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// WP `color` support values (skip-serialised in block.json → NOT auto-inlined).
$style_color_text = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg   = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
// `color.background` support is declared FALSE in block.json, so WP never
// registers/writes a `backgroundColor` attr through the editor — but PHP
// does not drop an undeclared attr written by hand-authored pattern/theme
// content (D338). Fold a hand-authored preset slug into the SAME
// background-paint path as the custom backgroundColour attr (used by the
// `::after` background layer below) rather than adding WP's native
// `has-{slug}-background-color` class: that class paints `!important`
// directly on the root, which is exactly the text-gradient clip conflict
// this file's `::after` background layer exists to avoid.
$preset_bg_slug = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' === $background_colour && '' !== $preset_bg_slug ) {
	$background_colour = $preset_bg_slug;
}

// ---------------------------------------------------------------------------
// 3. Build the root element's declarations (scoped, NOT inline).
// ---------------------------------------------------------------------------

$root_decls = array();

// D636 shape — sibling gradient attribute wins when set+valid; the gradient
// path paints through the glyphs via background-clip:text (sgs_text_colour_
// decl()), which is why the block's own background paint (below) is moved
// off this same root element onto a `::after` layer instead.
$text_colour_effective = sgs_resolve_text_colour_or_gradient( $text_colour, $text_colour_gradient );
if ( '' !== $text_colour_effective ) {
	$text_colour_decl = sgs_text_colour_decl( $text_colour_effective );
	if ( '' !== $text_colour_decl ) {
		$root_decls[] = $text_colour_decl;
	}
}
// Background, border-radius, padding + the display model are BOX properties.
// Border-radius/padding/display are emitted below via the shared
// sgs_label_box_css_rule() helper (the SAME renderer the product-card trial
// tag uses); background paint is NOT passed into that helper any more — it
// is emitted on a `::after` pseudo-element layer instead (step 4b), so the
// text-gradient clip above cannot reach it.
// fontWeight/lineHeight/letterSpacing/textTransform/textDecoration/
// fontFamily/fontStyle/textAlign now emitted via sgs_typography_css_rule()
// below (step 4, D971/D972 full-replacement track) — not here.

// ---------------------------------------------------------------------------
// 4. Scoped CSS assembly. uid is a CLASS (this block has no anchor support,
// but the class pattern mirrors sgs/heading/sgs/container so every scoped
// rule targets `.{uid}.wp-block-sgs-label`).
// ---------------------------------------------------------------------------

$uid      = 'sgs-lbl-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-label';

$scoped_css = array();

if ( $root_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $root_decls ) . ';}';
}
// D636 — old-browser fallback for a gradient textColour; a no-op (returns
// '') when $text_colour was a flat colour.
$text_colour_fallback_rule = sgs_text_colour_gradient_fallback_rule( $root_sel, $text_colour_effective );
if ( '' !== $text_colour_fallback_rule ) {
	$scoped_css[] = $text_colour_fallback_rule;
}

// Typography — root prefix '', shared TypographyControls/sgs_typography_css_rule()
// mechanism (D971/D972 full-replacement track). Covers fontSize (base +
// tablet + mobile tiers, same cascade-order Pattern A as before) plus
// fontWeight/fontStyle/lineHeight/letterSpacing/textTransform/textDecoration/
// fontFamily/textAlign (moved here from step 3's $root_decls above).
// ⚠ Previously cast fontSize to 'int' — the shared helper's tiered path
// defaults to 'float' (the objectively correct CSS behaviour: a client's
// decimal UnitControl input is no longer silently rounded). This is a
// deliberate, reasoned change, not a byte-identical swap — see D971/D972
// helper-widening follow-up for the analysis.
$font_size_css = sgs_typography_css_rule( $attributes, '', $root_sel );
if ( '' !== $font_size_css ) {
	$scoped_css[] = $font_size_css;
}

// --- Base margin (WP-native style.spacing.margin, skip-serialised) emitted
// scoped via the stable core style engine. ---
if ( ! empty( $base_margin_obj ) ) {
	$base_scoped_styles = wp_style_engine_get_styles(
		array( 'spacing' => array( 'margin' => $base_margin_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $base_scoped_styles['css'] ) ) {
		$scoped_css[] = $base_scoped_styles['css'];
	}
}

// --- BOX (padding base + tiers, radius, background) + DISPLAY model — emitted
// through the shared sgs_label_box_css_rule() helper: the SAME renderer the
// product-card trial tag uses, so label + product-card produce byte-identical
// box CSS (Bean's composite-mirror requirement, R-31-9). Padding + background +
// radius paint on VALUE-PRESENCE (ungated 2026-07-12). ---
$base_padding_shorthand = sgs_box_object_shorthand( $padding_obj );

// A meaningful (non-zero, present) border-radius. A stored 0 is treated as
// "no rounding" and not emitted — keeps a bare eyebrow free of a pointless
// `border-radius:0px` (regression guard: bare eyebrows stay box-free).
//
// floatval, NOT intval (2026-08-13): borderRadius is now a CSS-length STRING,
// and intval('0.5rem') is 0 — which would silently DROP every sub-1 rem/em
// radius. floatval('0.5rem') is 0.5, while floatval('0px') is still 0.0, so the
// zero-is-absent guard above keeps working for both the legacy bare number and
// an explicit zero length.
$has_radius   = ( '' !== (string) $border_radius && 0.0 !== floatval( $border_radius ) );
$radius_value = $has_radius ? $border_radius : '';

// Box-present = either background channel (native style.color.background OR the
// custom backgroundColour attr), a non-empty base padding, or a meaningful
// border-radius. Drives the display model.
$box_present = ( '' !== $style_color_bg )
	|| ( '' !== $background_colour )
	|| ( null !== $base_padding_shorthand )
	|| $has_radius;

// Display model (contract §C): a bare eyebrow renders display:block (so its
// margin-bottom paints); a boxed label hugs at inline-block; a full-width label
// spans the row (block + width:100%). Suppressed entirely when an is-style-*
// variant class is present — that variant's own CSS owns display.
$label_display   = '';
$label_fullwidth = false;
if ( ! $has_style_variant ) {
	if ( $full_width ) {
		$label_fullwidth = true;
	} elseif ( $box_present ) {
		$label_display = 'inline-block';
	} else {
		$label_display = 'block';
	}
}

// NOTE: 'background' is deliberately NOT passed to this shared helper any
// more — sgs_label_box_css_rule() paints it onto $root_sel directly, which
// the text-gradient clip above (background-clip:text) would overwrite/clip.
// Background paint is emitted separately below on a `::after` layer instead.
$box_css = sgs_label_box_css_rule(
	array(
		'padding'       => $padding_obj,
		'paddingTablet' => $padding_tablet_obj,
		'paddingMobile' => $padding_mobile_obj,
		'radius'        => $radius_value,
		'display'       => $label_display,
		'fullWidth'     => $label_fullwidth,
	),
	$root_sel
);
if ( '' !== $box_css ) {
	$scoped_css[] = $box_css;
}

// --- Block background — painted on a `::after` layer, never the root
// itself (this block has no gradient background attribute, only a flat
// colour, and no hover state). See sgs_block_background_layer_css(). ---
$background_layer_css = sgs_block_background_layer_css(
	$root_sel,
	sgs_background_paint_decl( $background_colour, '' )
);
if ( '' !== $background_layer_css ) {
	$scoped_css[] = $background_layer_css;
}

// --- Responsive MARGIN tiers — box objects, scoped @media on the SAME selector
// (contract §B2: tablet max-width:1023px, mobile max-width:767px). Margin tiers
// are never gated. (Padding tiers are handled inside the box helper above.) ---
$margin_tab_val = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val = sgs_box_object_shorthand( $margin_mobile_obj );
if ( null !== $margin_tab_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{margin:{$margin_tab_val};}}";
}
if ( null !== $margin_mob_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{margin:{$margin_mob_val};}}";
}

// --- WP colour support (skip-serialised) — custom hex/rgb emitted scoped via
// the style engine; preset SLUGS get the standard has-* classes re-added
// manually in step 5. ---

$color_args = array();
if ( '' !== $style_color_text ) {
	$color_args['text'] = $style_color_text;
}
if ( '' !== $style_color_bg ) {
	$color_args['background'] = $style_color_bg;
}
if ( ! empty( $color_args ) ) {
	$color_scoped_styles = wp_style_engine_get_styles(
		array( 'color' => $color_args ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $color_scoped_styles['css'] ) ) {
		$scoped_css[] = $color_scoped_styles['css'];
	}
}

// ---------------------------------------------------------------------------
// 5. Build the root element's classes + attributes.
//
// uid is a CLASS (not an id) — matches the sgs/heading/sgs/container scoped
// pattern. is-style-* / align* classes are merged in automatically by
// get_block_wrapper_attributes() via the block's className attribute. NO
// 'style' key is passed — the root carries ZERO inline property declarations
// (contract §A); every declaration lives in the scoped <style> above.
// ---------------------------------------------------------------------------

$root_classes = array( 'wp-block-sgs-label', $uid );

// Preset TEXT colour slug re-adds the standard has-* class (it sets colour
// from the theme palette). The background preset slug does NOT get its
// native class here — it was folded into $background_colour above and
// paints through the `::after` background layer instead (see that fold's
// comment).
if ( '' !== $preset_text_slug ) {
	$root_classes[] = 'has-text-color';
	$root_classes[] = 'has-' . $preset_text_slug . '-color';
}

$wrapper_attrs = get_block_wrapper_attributes(
	array( 'class' => implode( ' ', $root_classes ) )
);

if ( $scoped_css ) :
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D). Every value reaching
	// $scoped_css is pre-sanitised (the box helper's length/keyword sanitisers / sgs_css_keyword_sanitise() /
	// allowlists / floatval / wp_style_engine_get_styles / sgs_colour_value),
	// so no un-sanitised value survives here.
	?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
<?php endif; ?>
<?php
printf(
	'<%1$s %2$s>%3$s</%1$s>',
	tag_escape( $tag_name ),
	$wrapper_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	wp_kses_post( $text )
);
