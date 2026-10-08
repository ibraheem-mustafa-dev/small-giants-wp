<?php
/**
 * Google Reviews — element styling, card border, arrow step, scrollbar and style-engine colours; builds the wrapper opts.
 *
 * Partial of render.php, included with a plain require so it shares render.php's
 * local scope (required once per block instance).
 *
 * Reads: $attributes, $block, $variant and the $gr_* locals from render-wrapper.php.
 * Writes: $gr_responsive_css, $gr_wrapper_opts and the other $gr_* style locals.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// ───────────────────────────────────────────────────────────────────────────
// Element styling driven by attributes. Every value is a rule in this block's
// scoped <style> at three classes (Spec 32), never an inline declaration, and an
// attribute left at its default emits NOTHING, so style.css (or the chosen
// `cardStyle` look, which has two classes) supplies the value.
// ───────────────────────────────────────────────────────────────────────────
$gr_sides   = array( 'top', 'right', 'bottom', 'left' );
$gr_corners = array( 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' );

// One length rule per property, per device tier (`{desktop,tablet,mobile}` objects, bare numbers read as px).
$gr_len_rule = static function ( string $selector, $raw, array $props ): string {
	$specs = array();
	foreach ( $props as $prop ) {
		$specs[] = array(
			'value'        => $raw,
			'css'          => $prop,
			'unit_default' => 'px',
		);
	}
	return sgs_emit_responsive_css( $selector, $specs );
};

// A four-sided box value (padding, border width, radius corners) per device tier.
//
// Border width prints one shorthand per tier: a tier inherits the tier above it side by side and writes a rule
// only when its shorthand differs, exactly like the shared tier engine, and an unset side of a set box is 0, as
// in sgs_box_object_shorthand(). A width stays on the shorthand because its border-style is written for all four
// sides, so a width longhand would leave the other sides at the browser's `medium`.
//
// Padding and radius corners print longhands for the sides or corners a tier ITSELF sets, so an unset one keeps
// the stylesheet's value and a narrower tier setting one no longer wipes the wider tier's others. The cascade does the inheriting
// (the desktop rule, then the tablet and mobile @media rules, narrowest last); a side is skipped when its
// resolved value already equals what the tier above gives it. The whole declaration is built here, so no caller
// can join a property name to a longhand block.
$gr_box_rule = static function ( string $selector, $raw, string $prop, array $keys ): string {
	$obj      = sgs_responsive_normalise_object( $raw, true );
	$chains   = array(
		'desktop' => array( 'desktop' ),
		'tablet'  => array( 'tablet', 'desktop' ),
		'mobile'  => array( 'mobile', 'tablet', 'desktop' ),
	);
	$longhand = in_array( $prop, array( 'padding', 'border-radius' ), true );
	// The longhand property per key: padding-top, or border-top-left-radius for a corner.
	$longhand_name = static function ( string $key ) use ( $prop ): string {
		return 'border-radius' === $prop
			? 'border-' . strtolower( preg_replace( '/([A-Z])/', '-$1', $key ) ) . '-radius'
			: $prop . '-' . $key;
	};
	$rules         = array();
	$prev          = '';
	$prev_eff      = array();
	foreach ( $chains as $tier => $sources ) {
		$vals = array();
		$any  = false;
		$eff  = array();
		$own  = array();
		foreach ( $keys as $key ) {
			$val       = null;
			$own_value = null;
			foreach ( $sources as $source ) {
				if ( is_array( $obj[ $source ] ) && isset( $obj[ $source ][ $key ] ) ) {
					$val = sgs_responsive_format_atom_value( $obj[ $source ][ $key ], 'px', 'float', null );
					if ( null !== $val ) {
						if ( $source === $tier ) {
							$own_value = $val;
						}
						break;
					}
				}
			}
			$any         = $any || null !== $val;
			$vals[]      = $val ?? '0';
			$eff[ $key ] = $val;
			$own[ $key ] = $own_value;
		}
		if ( $longhand ) {
			$decls = '';
			foreach ( $keys as $key ) {
				if ( null !== $own[ $key ] && ( $prev_eff[ $key ] ?? null ) !== $own[ $key ] ) {
					$decls .= $longhand_name( $key ) . ':' . $own[ $key ] . ';';
				}
			}
			if ( '' !== $decls ) {
				$rules[ $tier ] = $decls;
			}
			$prev_eff = $eff;
			continue;
		}
		$decl = $any ? $prop . ':' . implode( ' ', $vals ) . ';' : '';
		if ( '' !== $decl && $decl !== $prev ) {
			$rules[ $tier ] = $decl;
		}
		if ( '' !== $decl ) {
			$prev = $decl;
		}
	}
	$css = isset( $rules['desktop'] ) ? $selector . '{' . $rules['desktop'] . '}' : '';
	foreach ( array(
		'tablet' => SGS_Breakpoints::TABLET_MAX,
		'mobile' => SGS_Breakpoints::MOBILE_MAX,
	) as $tier => $max ) {
		if ( isset( $rules[ $tier ] ) ) {
			foreach ( SGS_Breakpoints::tier_at_rules( $max, false ) as $open ) {
				$css .= $open . $selector . '{' . $rules[ $tier ] . '}}';
			}
		}
	}
	return $css;
};

// One colour declaration (palette slug or raw colour), '' when unset.
$gr_colour_rule = static function ( string $selector, string $prop, $value ): string {
	$colour = sgs_colour_value( is_string( $value ) ? $value : '' );
	return '' === $colour ? '' : $selector . '{' . $prop . ':' . $colour . ';}';
};

// A border style that is written only alongside a width (G5: a style with no width is no border).
$gr_border_style = static function ( string $selector, string $prefix, string $width_css ) use ( $attributes, $gr_is_set ): string {
	$style = sgs_border_style_keyword( $attributes[ $prefix . 'BorderStyle' ] ?? '' );
	if ( 'none' === $style && $gr_is_set( $prefix . 'BorderStyle', 'solid' ) ) {
		return $selector . '{border-style:none;}';
	}
	return ( '' !== $width_css && 'none' !== $style ) ? $selector . '{border-style:' . $style . ';}' : '';
};

// A button-shaped element (write-review, see-all, arrow): padding, border, radius, height and width.
// `$size` is the element's own size attribute where it has one (only the arrow does), read literally by the caller.
$gr_button_box = static function ( string $selector, string $prefix, $size = null ) use ( $attributes, $gr_box_rule, $gr_len_rule, $gr_border_style, $gr_sides, $gr_corners ): string {
	$width = $gr_box_rule( $selector, $attributes[ $prefix . 'BorderWidth' ] ?? null, 'border-width', $gr_sides );
	$css   = $gr_box_rule( $selector, $attributes[ $prefix . 'Padding' ] ?? null, 'padding', $gr_sides );
	$css  .= $width . $gr_border_style( $selector, $prefix, $width );
	$css  .= $gr_box_rule( $selector, $attributes[ $prefix . 'BorderRadius' ] ?? null, 'border-radius', $gr_corners );
	$css  .= $gr_len_rule( $selector, $size, array( 'width', 'height' ) );
	return $css;
};

// ── The block root: background, padding and the block's own type. ──
$gr_bg_decl = sgs_background_paint_decl( (string) ( $attributes['backgroundColour'] ?? '' ), (string) ( $attributes['backgroundColourGradient'] ?? '' ) );
if ( '' !== $gr_bg_decl ) {
	$gr_responsive_css .= $gr_root_hi . '{' . $gr_bg_decl . ';}';
}
$gr_responsive_css .= $gr_box_rule( $gr_root_hi, $attributes['padding'] ?? null, 'padding', $gr_sides );
$gr_responsive_css .= sgs_typography_css_rule( $attributes, '', $gr_root_hi );

// ── Header row: gap, padding and the divider under it. ──
$gr_header_sel      = $gr_root_sel . ' .sgs-google-reviews__aggregate';
$gr_responsive_css .= $gr_len_rule( $gr_header_sel, $attributes['headerGap'] ?? null, array( 'gap' ) );
$gr_responsive_css .= $gr_box_rule( $gr_header_sel, $attributes['headerPadding'] ?? null, 'padding', $gr_sides );
$gr_responsive_css .= $gr_colour_rule( $gr_header_sel, 'border-bottom-color', $attributes['headerDividerColour'] ?? '' );
$gr_divider_width   = sgs_responsive_format_atom_value( $attributes['headerDividerWidth'] ?? '', 'px', 'float', null );
if ( null !== $gr_divider_width ) {
	$gr_responsive_css .= $gr_header_sel . '{border-bottom-width:' . $gr_divider_width . ';}';
}


// ── Source caption, rating figure, review count, header stars. ──
$gr_responsive_css .= $gr_colour_rule( $gr_root_sel . ' .sgs-google-reviews__source-label', 'color', $attributes['sourceLabelColour'] ?? '' );
$gr_responsive_css .= $gr_colour_rule( $gr_root_sel . ' .sgs-google-reviews__score', 'color', $attributes['scoreColour'] ?? '' );
$gr_responsive_css .= $gr_colour_rule( $gr_root_sel . ' .sgs-google-reviews__count', 'color', $attributes['countColour'] ?? '' );

// Star size is a custom property the stylesheet reads (`--sgs-gr-star-size`), so the header stars and the card
// stars can differ under one look: the header rule is written after the general one and wins.
$gr_responsive_css  .= $gr_len_rule( $gr_root_sel . ' .sgs-google-reviews__stars', $attributes['starSize'] ?? null, array( '--sgs-gr-star-size' ) );
$gr_responsive_css  .= $gr_len_rule( $gr_root_sel . ' .sgs-google-reviews__aggregate-stars', $attributes['aggregateStarSize'] ?? null, array( '--sgs-gr-star-size' ) );
$gr_star_full_colour = (string) ( $attributes['starColour'] ?? '' );
// A gradient set on the stars (above) wins over the flat colour.
if ( '' === $gr_star_colour_gradient && $gr_is_set( 'starColour', '' ) && '' !== sgs_colour_value( $gr_star_full_colour ) ) {
	$gr_responsive_css .= $gr_root_sel . ' .sgs-google-reviews__star--full,' . $gr_root_sel . ' .sgs-google-reviews__star--half .sgs-google-reviews__star-fill{fill:' . sgs_colour_value( $gr_star_full_colour ) . ';}';
}
$gr_star_empty = sgs_colour_value( (string) ( $attributes['starEmptyColour'] ?? '' ) );
if ( '' !== $gr_star_empty ) {
	$gr_responsive_css .= $gr_root_sel . ' .sgs-google-reviews__star--empty,' . $gr_root_sel . ' .sgs-google-reviews__star--half .sgs-google-reviews__star-outline{fill:' . $gr_star_empty . ';}';
}

// ── Review card. ──
$gr_card_sel        = $gr_root_sel . ' .sgs-google-reviews__review';
$gr_responsive_css .= $gr_box_rule( $gr_card_sel, $attributes['cardPadding'] ?? null, 'padding', $gr_sides );
// Card border (width, style, colour, gradient ring, none override, radius at
// three tiers) through the shared assembler.
$gr_card_border = sgs_border_element_decls(
	$attributes,
	'card',
	$gr_card_sel,
	array(
		'colour' => array(
			'base'     => 'cardBorderColour',
			'gradient' => 'cardBorderColourGradient',
		),
	)
);
if ( $gr_card_border['base'] ) {
	$gr_responsive_css .= $gr_card_sel . '{' . implode( ';', $gr_card_border['base'] ) . ';}';
}
if ( $gr_card_border['tablet'] ) {
	$gr_responsive_css .= '@media (max-width:1023px){' . $gr_card_sel . '{' . implode( ';', $gr_card_border['tablet'] ) . ';}}';
}
if ( $gr_card_border['mobile'] ) {
	$gr_responsive_css .= '@media (max-width:767px){' . $gr_card_sel . '{' . implode( ';', $gr_card_border['mobile'] ) . ';}}';
}
$gr_responsive_css .= implode( '', $gr_card_border['rules'] );
$gr_responsive_css .= $gr_colour_rule( $gr_card_sel, 'background-color', $attributes['cardBackground'] ?? '' );
$gr_responsive_css .= $gr_len_rule( $gr_card_sel, $attributes['cardGap'] ?? null, array( 'gap' ) );
// The card width is the slider's flex basis; the other variants size the card by its own width.
$gr_responsive_css .= $gr_len_rule( $gr_card_sel, $attributes['cardWidth'] ?? null, 'slider' === $variant ? array( 'flex-basis' ) : array( 'width' ) );

// ── Avatar. ──
$gr_avatar_sel      = $gr_root_sel . ' .sgs-google-reviews__avatar';
$gr_responsive_css .= $gr_len_rule( $gr_avatar_sel, $attributes['avatarSize'] ?? null, array( 'width', 'height' ) );
$gr_responsive_css .= $gr_box_rule( $gr_avatar_sel, $attributes['avatarBorderRadius'] ?? null, 'border-radius', $gr_corners );
$gr_responsive_css .= $gr_colour_rule( $gr_root_sel . ' .sgs-google-reviews__avatar-initials', 'color', $attributes['avatarTextColour'] ?? '' );

// ── Reviewer lines, review text, card logo, read-more link, footnote. ──
foreach ( array(
	'author'      => 'authorColour',
	'meta'        => 'metaColour',
	'date'        => 'dateColour',
	'text'        => 'textColour',
	'review-link' => 'reviewLinkColour',
	'footnote'    => 'footnoteColour',
) as $gr_el => $gr_colour_attr ) {
	$gr_responsive_css .= $gr_colour_rule( $gr_root_sel . ' .sgs-google-reviews__' . $gr_el, 'color', $attributes[ $gr_colour_attr ] ?? '' );
}
// Google's two block-wide colours are custom properties the stylesheet reads (--sgs-gr-ink-muted for every muted
// line, --sgs-gr-blue for links, the focus outline and the blue fills). Writing them on the block's own scoped rule
// (0,2,0) out-ranks both the stylesheet default and its dark-mode counterpart; empty writes nothing, so Google's
// own palette stays the default. A per-element colour above still wins on its own element.
$gr_responsive_css .= $gr_colour_rule( $gr_root_sel, '--sgs-gr-ink-muted', $attributes['mutedTextColour'] ?? '' );
$gr_responsive_css .= $gr_colour_rule( $gr_root_sel, '--sgs-gr-blue', $attributes['accentColour'] ?? '' );
// An accent replaces Google's blue everywhere it shows, so its hover, pressed and on-accent shades are
// derived from it on the same root rule instead of keeping Google's. Mixing towards the ink darkens it on
// the light theme and lightens it on the dark one (Google's own direction); the tints mix into the surface.
$gr_accent = sgs_colour_value( is_string( $attributes['accentColour'] ?? null ) ? $attributes['accentColour'] : '' );
if ( '' !== $gr_accent ) {
	$gr_accent_decls = '--sgs-gr-blue-dark:color-mix(in srgb,var(--sgs-gr-blue) 85%,var(--sgs-gr-ink));'
		. '--sgs-gr-blue-tint:color-mix(in srgb,var(--sgs-gr-blue) 10%,var(--sgs-gr-surface));'
		. '--sgs-gr-blue-tint-strong:color-mix(in srgb,var(--sgs-gr-blue) 20%,var(--sgs-gr-surface));';
	$gr_accent_hex   = sgs_colour_hex_for_contrast( (string) $attributes['accentColour'] );
	if ( '' !== $gr_accent_hex ) {
		$gr_accent_decls .= '--sgs-gr-on-blue:' . sgs_wcag_text_colour_for_bg( $gr_accent_hex ) . ';';
	}
	$gr_responsive_css .= $gr_root_sel . '{' . $gr_accent_decls . '}';
}
$gr_responsive_css .= $gr_len_rule( $gr_root_sel . ' .sgs-google-reviews__card-logo', $attributes['cardLogoSize'] ?? null, array( 'width', 'height' ) );

// Text clamp: lines are written only once the author moved them off the default, and switching the clamp off
// releases the box completely.
$gr_text_sel = $gr_root_sel . ' .sgs-google-reviews__text';
if ( false === ( $attributes['textClamp'] ?? true ) ) {
	$gr_responsive_css .= $gr_text_sel . '{display:block;-webkit-line-clamp:unset;overflow:visible;}';
} elseif ( $gr_is_set( 'textClampLines', 8 ) && is_numeric( $attributes['textClampLines'] ?? null ) ) {
	$gr_responsive_css .= $gr_text_sel . '{-webkit-line-clamp:' . max( 1, min( 20, (int) $attributes['textClampLines'] ) ) . ';}';
}

// ── Rail: padding, gap, scrollbar. ──
$gr_list_sel        = $gr_root_sel . ' .sgs-google-reviews__list';
$gr_responsive_css .= $gr_box_rule( $gr_list_sel, $attributes['railPadding'] ?? null, 'padding', $gr_sides );
$gr_responsive_css .= $gr_len_rule( $gr_list_sel, $attributes['gap'] ?? null, array( 'gap' ) );
// The scrollbar is styled only while it is the progress indicator. Dots or none hide it through the shared
// navigation's pagination class (assets/css/slider-nav.css), so nothing is written here for them.
if ( 'scrollbar' === $gr_pagination ) {
	$gr_scrollbar_style = sgs_slider_nav_normalise( $attributes['scrollbarStyle'] ?? 'thin', array( 'thin', 'standard' ) );
	if ( $gr_is_set( 'scrollbarStyle', 'thin' ) ) {
		$gr_responsive_css .= $gr_list_sel . '{scrollbar-width:' . ( 'thin' === $gr_scrollbar_style ? 'thin' : 'auto' ) . ';}';
	}
	$gr_responsive_css .= $gr_colour_rule( $gr_list_sel, '--sgs-gr-scrollbar-colour', $attributes['scrollbarColour'] ?? '' );
}

// ── Buttons and arrows: box, border, radius, height, width. Type and colour come from the families above. ──
$gr_responsive_css .= $gr_button_box( $gr_root_sel . ' .sgs-google-reviews__write-review', 'writeReview' );
$gr_responsive_css .= $gr_len_rule( $gr_root_sel . ' .sgs-google-reviews__write-review', $attributes['writeReviewMinHeight'] ?? null, array( 'min-height' ) );
$gr_responsive_css .= $gr_button_box( $gr_root_sel . ' .sgs-google-reviews__see-all', 'seeAll' );
$gr_responsive_css .= $gr_len_rule( $gr_root_sel . ' .sgs-google-reviews__see-all', $attributes['seeAllMinHeight'] ?? null, array( 'min-height' ) );
$gr_responsive_css .= $gr_button_box( $gr_root_sel . ' .sgs-google-reviews__arrow', 'arrow', $attributes['arrowSize'] ?? null );
// The same size feeds the shared navigation's custom property, so the overlay-inset gutter always equals the button.
$gr_responsive_css .= $gr_len_rule( $gr_root_sel . ' .sgs-google-reviews__slider', $attributes['arrowSize'] ?? null, array( '--sgs-slider-nav-arrow-size' ) );

// ── One type rule per text element, each read from its own prefix by the shared typography helper. ──
// Each call names its prefix as a literal so the attribute census can see which typography families are consumed.
$gr_responsive_css .= sgs_typography_css_rule( $attributes, 'sourceLabel', $gr_root_sel . ' .sgs-google-reviews__source-label' );
$gr_responsive_css .= sgs_typography_css_rule( $attributes, 'score', $gr_root_sel . ' .sgs-google-reviews__score' );
$gr_responsive_css .= sgs_typography_css_rule( $attributes, 'count', $gr_root_sel . ' .sgs-google-reviews__count' );
$gr_responsive_css .= sgs_typography_css_rule( $attributes, 'author', $gr_root_sel . ' .sgs-google-reviews__author' );
$gr_responsive_css .= sgs_typography_css_rule( $attributes, 'meta', $gr_root_sel . ' .sgs-google-reviews__meta' );
$gr_responsive_css .= sgs_typography_css_rule( $attributes, 'date', $gr_root_sel . ' .sgs-google-reviews__date' );
$gr_responsive_css .= sgs_typography_css_rule( $attributes, 'text', $gr_root_sel . ' .sgs-google-reviews__text' );
$gr_responsive_css .= sgs_typography_css_rule( $attributes, 'avatar', $gr_root_sel . ' .sgs-google-reviews__avatar-initials' );
$gr_responsive_css .= sgs_typography_css_rule( $attributes, 'footnote', $gr_root_sel . ' .sgs-google-reviews__footnote' );
$gr_responsive_css .= sgs_typography_css_rule( $attributes, 'reviewLink', $gr_root_sel . ' .sgs-google-reviews__review-link' );
$gr_responsive_css .= sgs_typography_css_rule( $attributes, 'writeReview', $gr_root_sel . ' .sgs-google-reviews__write-review' );
$gr_responsive_css .= sgs_typography_css_rule( $attributes, 'seeAll', $gr_root_sel . ' .sgs-google-reviews__see-all' );
$gr_responsive_css .= sgs_typography_css_rule( $attributes, 'mapsLink', $gr_root_sel . ' .sgs-google-reviews__maps-link' );
$gr_responsive_css .= sgs_typography_css_rule( $attributes, 'breakdownRow', $gr_root_sel . ' .sgs-google-reviews__breakdown-row' );

$gr_style_engine_args = array();

$gr_color_args = array();
if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
	$gr_color_args['text'] = (string) $attributes['style']['color']['text'];
}
if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
	$gr_color_args['background'] = (string) $attributes['style']['color']['background'];
}
if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
	$gr_color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
}
if ( ! empty( $gr_color_args ) ) {
	$gr_style_engine_args['color'] = $gr_color_args;
}

if ( ! empty( $gr_style_engine_args ) ) {
	$gr_scoped_styles = wp_style_engine_get_styles(
		$gr_style_engine_args,
		array( 'selector' => $gr_root_sel )
	);
	if ( ! empty( $gr_scoped_styles['css'] ) ) {
		$gr_responsive_css .= $gr_scoped_styles['css'];
	}
}

// Skip-serialised `color` support also stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add them
// manually (mirrors sgs/hero + sgs/quote) so preset palette colours still resolve visually.
$gr_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$gr_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $gr_preset_text_slug ) {
	$gr_extra_classes[] = 'has-text-color';
	$gr_extra_classes[] = 'has-' . $gr_preset_text_slug . '-color';
}
if ( '' !== $gr_preset_bg_slug ) {
	$gr_extra_classes[] = 'has-background';
	$gr_extra_classes[] = 'has-' . $gr_preset_bg_slug . '-background-color';
}

// Cards per arrow click (arrowStep, a {desktop,tablet,mobile} tier object of whole
// numbers). Each tier inherits the one above it, as every tier value does; the
// script picks the tier for the viewport at click time with the framework's own
// breakpoints, passed here so the two never drift apart. 1 = one card (the default).
$gr_arrow_step_raw = sgs_responsive_normalise_object( $attributes['arrowStep'] ?? null );
$gr_arrow_step     = array();
$gr_arrow_prev     = 1;
foreach ( array( 'desktop', 'tablet', 'mobile' ) as $gr_tier ) {
	$gr_tier_val               = $gr_arrow_step_raw[ $gr_tier ] ?? null;
	$gr_arrow_prev             = is_numeric( $gr_tier_val ) ? max( 1, min( 6, (int) $gr_tier_val ) ) : $gr_arrow_prev;
	$gr_arrow_step[ $gr_tier ] = $gr_arrow_prev;
}
$gr_arrow_step['tabletMax'] = SGS_Breakpoints::TABLET_MAX;
$gr_arrow_step['mobileMax'] = SGS_Breakpoints::MOBILE_MAX;

// WP Interactivity attrs — carried verbatim so the store binds correctly.
$gr_extra_attrs = array(
	'data-wp-interactive' => 'sgs/google-reviews',
	'data-wp-context'     => wp_json_encode(
		array(
			'autoplay'      => $autoplay,
			'autoplaySpeed' => $autoplay_speed,
			'currentSlide'  => 0,
			'arrowStep'     => $gr_arrow_step,
		)
	),
	'data-wp-init'        => 'callbacks.init',
);

$gr_wrapper_opts = array(
	'tag'           => 'div',
	'extra_classes' => $gr_extra_classes,
	'extra_styles'  => $gr_extra_styles,
	'extra_attrs'   => $gr_extra_attrs,
);
