<?php
/**
 * Google Reviews — wrapper classes, uid, logo/media element, button style and slider/dot/star CSS.
 *
 * Partial of render.php, included with a plain require so it shares render.php's
 * local scope (required once per block instance).
 *
 * Reads: $attributes, $block, $variant, $data_source and the review/resolved-data locals set earlier in render.php.
 * Writes: $gr_uid, $gr_root_sel, $gr_responsive_css, $gr_extra_classes and the other $gr_* wrapper locals.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// ───────────────────────────────────────────────────────────────────────────
// Wrapper: own classes, styles, and WP-Interactivity data-* attrs.
// data-wp-interactive / data-wp-context / data-wp-init consumed by store
// (sgs/google-reviews) in view.js; must ride through extra_attrs so the
// WP Interactivity runtime can find them on the element.
// ───────────────────────────────────────────────────────────────────────────

// Generate a unique ID for responsive CSS scoping. This is a CLASS (contract
// §B3-style scoping — matches the hero/container/quote convention).
$gr_uid      = 'sgs-gr-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$gr_root_sel = '.' . $gr_uid . '.wp-block-sgs-google-reviews';
// The block root itself needs THREE classes (the uid, WP's own class and the block class) so a value the
// author set beats a ready-made look, whose root rule has two: `.sgs-google-reviews.sgs-google-reviews--card-x`.
// Descendant rules (`$gr_root_sel . ' .sgs-google-reviews__el'`) already have three.
$gr_root_hi = $gr_root_sel . '.sgs-google-reviews';

// A value the author saved, or one that has moved off the block.json default, beats a ready-made look.
// A value still at its default must emit NOTHING, so the look (`cardStyle`) or the style.css default shows.
// `$block->parsed_block['attrs']` holds only what was saved, so a converter-written default still counts.
$gr_saved  = ( isset( $block->parsed_block['attrs'] ) && is_array( $block->parsed_block['attrs'] ) ) ? $block->parsed_block['attrs'] : array();
$gr_is_set = static function ( string $key, $fallback ) use ( $attributes, $gr_saved ): bool {
	return array_key_exists( $key, $gr_saved ) || ( $attributes[ $key ] ?? $fallback ) !== $fallback;
};

// -------------------------------------------------------------------------
// Media-element atom layer (rule 37-media-no-handroll fix) — reviewer avatar
// object-fit only. `class_exists()` guards a class the plugin loader always
// registers; kept for the same "never fatal if load order changes" reason
// `sgs/gallery` and `sgs/before-after` guard it. Classes are appended to
// each avatar `<img>` below (the review loop) — `.sgs-media-el` is the
// shared marker the generated assets/css/media-atoms/object-fit.css rule
// targets, `$gr_media_scope` is the per-instance scope the atom's
// custom-property value below is set on. One block-wide value applies to
// every avatar (there is no per-review styling control on this block).
$gr_media_scope   = '';
$gr_media_classes = array();
if ( class_exists( 'SGS_Media_Element' ) ) {
	$gr_media_scope   = SGS_Media_Element::scope_class( $gr_uid, '' );
	$gr_media_classes = SGS_Media_Element::element_classes( $gr_media_scope );
}

$gr_extra_classes = array(
	'sgs-google-reviews',
	$gr_uid,
	'sgs-google-reviews--' . sanitize_key( $variant ),
	'sgs-google-reviews--theme-' . sanitize_key( $theme ),
	'sgs-google-reviews--card-' . sanitize_key( $card_style ),
	'sgs-google-reviews--star-' . ( '' !== $star_colour ? sanitize_key( $star_colour ) : 'google' ),
	'sgs-google-reviews--cols-' . (int) $columns,
	'sgs-google-reviews--cols-tablet-' . (int) $columns_tablet,
	'sgs-google-reviews--cols-mobile-' . (int) $columns_mobile,
);

// Structural choices are classes (style.css owns what each one does), written only when the author made the
// choice, so a ready-made look can set them itself. They sit after the looks in style.css, so they win a tie.
$gr_logo_position = (string) ( $attributes['logoPosition'] ?? 'leading' );
if ( in_array( $gr_logo_position, array( 'leading', 'trailing' ), true ) && $gr_is_set( 'logoPosition', 'leading' ) ) {
	$gr_extra_classes[] = 'sgs-google-reviews--logo-' . sanitize_key( $gr_logo_position );
}
// The arrow placement is not a root modifier: the slider's own wrapper carries the shared navigation's
// placement classes (sgs_slider_nav_render(), below), which assets/css/slider-nav.css lays out.

// Only the inner star colour remains as a custom CSS variable
// (targets SVG fill on inner elements).
$sgs_gr_star = sgs_colour_value( $star_colour );
// Empty (the default) writes nothing, so the stars, breakdown bars and active dot stay Google's yellow.
$gr_extra_styles = '' !== $sgs_gr_star ? array( '--sgs-gr-star-colour:' . $sgs_gr_star ) : array();

// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// Read the resolved values from $attributes['style'] here and emit them into
// this block's OWN scoped <style> (do NOT pass via wrapper extra_styles —
// that inlines).
$gr_responsive_css = '';

// Media-element atom layer — object-fit only (rule 37-media-no-handroll fix).
// Emits `.{scope}{--sgs-media-object-fit:…}` which
// assets/css/media-atoms/object-fit.css's `.sgs-media-el` rule consumes. No
// value set -> no declaration -> that stylesheet's own `cover` fallback
// applies, matching the removed style.css default exactly (style.css).
if ( class_exists( 'SGS_Media_Element' ) ) {
	$gr_responsive_css .= SGS_Media_Element::style(
		$attributes,
		'',
		'sgs/google-reviews',
		$gr_uid,
		array( 'object-fit' )
	);
}

// Write-review button + slider arrow (button-shaped elements) — shared
// helper reads the prefixed attrs and emits a fully guarded base + hover/
// focus-visible rule in one call. Selectors match the elements' own BEM
// classes in style.css so this replaces (not duplicates) the hardcoded
// hover rules removed there.
require_once dirname( __DIR__, 3 ) . '/includes/helpers-button-style.php';
// bg_layer=true (D942/D956 recipe, same as sgs/modal's close button): moves
// each element's background paint onto a `::after` layer, freeing
// writeReviewColourText/arrowColourText for a gradient sibling.
// `.sgs-google-reviews__write-review` and `__see-all` have no `position` of their own in
// style.css (static) — bg_layer_positioned=false lets the helper add its
// own `position:relative`. `.sgs-google-reviews__arrow` already carries a
// `position` (absolute over the rail, relative when the arrows sit below it) —
// bg_layer_positioned=true skips the helper's own position write so it doesn't clobber that.
// The helper reads FLAT scalars for font size, weight, padding, border width/style and radius (`absint()` on
// the font size, so a `{}` tier object would print `font-size:0px`). This block stores those as typography
// families and tier objects, which the element rules further down write, so the helper is handed only the
// colour, gradient and hover attributes it can read.
$gr_btn_attrs       = static function ( string $prefix ) use ( $attributes ): array {
	$out = $attributes;
	foreach ( array( 'FontSize', 'FontWeight', 'Padding', 'BorderWidth', 'BorderStyle', 'BorderRadius', 'WidthType' ) as $suffix ) {
		unset( $out[ $prefix . $suffix ] );
	}
	// Google's hover colours (a blue border on the outlined arrows and Write a review, nothing else changing; the
	// darker blue on the filled See all) are the default. With no colour set, style.css supplies them and nothing is emitted. Once
	// the author sets a RESTING colour (a draft's colours arrive this way, and a draft has no hover colours), that
	// colour is painted by the helper on a layer that outranks any stylesheet hover rule, so the same defaults are
	// written through the helper too. A hover colour or gradient set in the inspector replaces the default for that
	// property. The tokens (--sgs-gr-*, style.css) switch for the dark theme.
	$has_resting_colour = false;
	foreach ( array( 'ColourBackground', 'ColourBackgroundGradient', 'ColourBorder', 'ColourBorderGradient', 'ColourText', 'ColourTextGradient' ) as $suffix ) {
		if ( ! empty( $out[ $prefix . $suffix ] ) ) {
			$has_resting_colour = true;
		}
	}
	if ( ! $has_resting_colour ) {
		return $out;
	}
	$hover_defaults = array(
		'arrow'       => array( 'ColourBorderHover' => 'var(--sgs-gr-blue)' ),
		'writeReview' => array( 'ColourBorderHover' => 'var(--sgs-gr-blue)' ),
		'seeAll'      => array( 'ColourBackgroundHover' => 'var(--sgs-gr-blue-dark)' ),
	);
	$gradient_of    = array(
		'ColourBackgroundHover' => 'ColourBackgroundHoverGradient',
		'ColourBorderHover'     => 'ColourBorderHoverGradient',
		'ColourTextHover'       => 'ColourTextHoverGradient',
	);
	foreach ( $hover_defaults[ $prefix ] ?? array() as $suffix => $default ) {
		if ( empty( $out[ $prefix . $suffix ] ) && empty( $out[ $prefix . $gradient_of[ $suffix ] ] ) ) {
			$out[ $prefix . $suffix ] = $default;
		}
	}
	return $out;
};
$gr_responsive_css .= sgs_button_element_style_css( $gr_btn_attrs( 'writeReview' ), 'writeReview', $gr_root_sel . ' .sgs-google-reviews__write-review', true, false );
$gr_responsive_css .= sgs_button_element_style_css( $gr_btn_attrs( 'seeAll' ), 'seeAll', $gr_root_sel . ' .sgs-google-reviews__see-all', true, false );
$gr_responsive_css .= sgs_button_element_style_css( $gr_btn_attrs( 'arrow' ), 'arrow', $gr_root_sel . ' .sgs-google-reviews__arrow', true, true );

// Lift on hover for the two header buttons: off by default (Google's own buttons stay still); a site that
// lifts its buttons sets buttonHoverLift. Touch-guarded and skipped under reduced motion.
$gr_button_lift = isset( $attributes['buttonHoverLift'] ) && is_numeric( $attributes['buttonHoverLift'] )
	? max( 0, min( 8, (float) $attributes['buttonHoverLift'] ) )
	: 0;
if ( $gr_button_lift > 0 ) {
	$gr_lift_decl       = 'transform:translateY(-' . rtrim( rtrim( number_format( $gr_button_lift, 2, '.', '' ), '0' ), '.' ) . 'px)';
	$gr_responsive_css .= '@media (prefers-reduced-motion: no-preference){'
		. sgs_hover_state_rules( $gr_root_sel . ' .sgs-google-reviews__write-review', $gr_lift_decl )
		. sgs_hover_state_rules( $gr_root_sel . ' .sgs-google-reviews__see-all', $gr_lift_decl )
		. '}';
}

// Review-dot indicator — not button-shaped (background-colour/fill only),
// uses the lighter state-colour emitter instead of the button helper.
// Fill gradient wins over the flat colour when set (same shared primitive as
// sgs_button_element_style_css()'s background-gradient handling above), via
// sgs_background_paint_decl() — returns a full declaration with no trailing
// semicolon, so append one when pushing into the decls array (this file's
// existing convention).
$gr_dot_colour                = (string) ( $attributes['dotColour'] ?? '' );
$gr_dot_colour_hover          = (string) ( $attributes['dotColourHover'] ?? '' );
$gr_dot_colour_gradient       = (string) ( $attributes['dotColourGradient'] ?? '' );
$gr_dot_colour_hover_gradient = (string) ( $attributes['dotColourHoverGradient'] ?? '' );
$gr_dot_decls_normal          = array();
$gr_dot_decls_hover           = array();
$gr_dot_bg_decl               = sgs_background_paint_decl( $gr_dot_colour, $gr_dot_colour_gradient );
if ( '' !== $gr_dot_bg_decl ) {
	$gr_dot_decls_normal[] = $gr_dot_bg_decl . ';';
}
$gr_dot_bg_hover_decl = sgs_background_paint_decl( $gr_dot_colour_hover, $gr_dot_colour_hover_gradient );
if ( '' !== $gr_dot_bg_hover_decl ) {
	$gr_dot_decls_hover[] = $gr_dot_bg_hover_decl . ';';
}
if ( 'dots' === $gr_pagination && ( $gr_dot_decls_normal || $gr_dot_decls_hover ) ) {
	$gr_responsive_css .= sgs_emit_state_colour_css( $gr_root_sel . ' .sgs-google-reviews__dot::before', $gr_dot_decls_normal, $gr_dot_decls_hover );
}

// Star fill — hover only (normal-state fill is already handled by the
// `--sgs-gr-star-colour` custom property + `sgs-google-reviews--star-{slug}`
// modifier class emitted above; this adds ONLY the hover state, same lighter
// state-colour emitter as the dot indicator immediately above).
$gr_star_colour_hover = (string) ( $attributes['starColourHover'] ?? '' );
$gr_star_decls_hover  = array();
if ( '' !== $gr_star_colour_hover ) {
	$gr_star_decls_hover[] = 'fill:' . sgs_colour_value( $gr_star_colour_hover ) . ';';
}
if ( $gr_star_decls_hover ) {
	$gr_responsive_css .= sgs_emit_state_colour_css( $gr_root_sel . ' .sgs-google-reviews__star--full', array(), $gr_star_decls_hover );
}

// Star fill gradient (D636/D644 rollout) — reuses the shared SVG
// stroke-gradient primitive, targeting `fill` instead of `stroke` since the
// star SVGs are fill-based, not stroke-based like icon glyphs. Mirrors
// icon-list's "one gradient, injected once, painted via a scoped CSS rule
// that reaches every repeated instance" pattern — the star SVG markup is
// emitted repeatedly by sgs_render_stars_svg() (aggregate rating + every
// per-review rating), so the <defs> only need to exist once in the DOM
// (`url(#id)` resolves document-wide) while the CSS rule below paints every
// `.sgs-google-reviews__star--full` instance. Scoped to the SAME element the
// flat starColour/starColourHover attrs already target (block.json star._note).
$gr_star_colour_gradient = (string) ( $attributes['starColourGradient'] ?? '' );
$gr_star_stroke_grad     = sgs_svg_stroke_gradient( $gr_star_colour_gradient, $gr_uid . '-star-grad', 'fill' );
if ( '' !== $gr_star_stroke_grad['css'] ) {
	$gr_responsive_css .= $gr_root_sel . ' .sgs-google-reviews__star--full{' . $gr_star_stroke_grad['css'] . ';}';
}
