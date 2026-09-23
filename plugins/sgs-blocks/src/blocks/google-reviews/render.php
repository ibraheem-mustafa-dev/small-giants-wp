<?php
/**
 * Google Reviews — Server Render
 *
 * WS-4: OUTER wrapper is now rendered by SGS_Container_Wrapper (kind='layout').
 * Carries block-specific classes + styles + WP-Interactivity data-* attrs via opts.
 *
 * @package SGS\Blocks
 *
 * @param array    $attributes Block attributes.
 * @param string   $content    Block content.
 * @param \WP_Block $block      Block instance.
 */

use SGS\Blocks\Google_Reviews_Settings;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-slider-nav.php';

// CSS length/unit sanitiser — for free-text attrs concatenated into raw CSS
// declarations inside this block's scoped <style> tag. Mirrors sgs/hero's
// proven sanitiser (strips everything except letters, digits, dot, %).
// CSS-keyword sanitiser — for free-text attrs (border-style) — letters + hyphen only.
$variant            = $attributes['variant'] ?? 'slider';

/*
 * Draggable + Inertia roster opt-in (Spec 38 FR-38-13), mirroring sgs/gallery.
 *
 * Emitted on `.sgs-google-reviews__list` — the element that actually scrolls
 * (style.css: `.sgs-google-reviews--slider .sgs-google-reviews__list` is the
 * `overflow-x: auto` + `scroll-snap-type: x mandatory` flex row), NOT the block
 * root, which never scrolls. Slider variant only: every other variant renders
 * that same list element as a plain grid with nothing to drag-scroll. The
 * shared runtime (shared/effects/gsap/fx-draggable.js) structurally re-verifies
 * the element is a genuine native horizontal scroller before touching it, so
 * this stays safe if the variant CSS ever changes.
 */
$sgs_gr_drag_to_scroll = (bool) ( $attributes['dragToScroll'] ?? false );
$sgs_gr_drag_momentum  = (bool) ( $attributes['dragMomentum'] ?? true );

$sgs_gr_list_fx_attr = '';
if ( 'slider' === $variant && $sgs_gr_drag_to_scroll ) {
	$sgs_gr_list_fx_attr = ' data-sgs-fx="draggable"';
	if ( ! $sgs_gr_drag_momentum ) {
		$sgs_gr_list_fx_attr .= ' data-sgs-fx-momentum="false"';
	}
}

/*
 * Infinite loop (Spec 38 §11 loop FR), mirroring sgs/gallery. A SEPARATE
 * marker from `data-sgs-fx="draggable"` above — Bean's ruling that looping
 * is an independent control, not a value of the shared `fx` grammar, and
 * both can be present on the SAME element at once. `shared/effects/
 * fx-carousel-loop.js` reads this; it never touches `gsap/fx-draggable.js`.
 */
$sgs_gr_loop_carousel = (bool) ( $attributes['loopCarousel'] ?? false );
if ( 'slider' === $variant && $sgs_gr_loop_carousel ) {
	$sgs_gr_list_fx_attr .= ' data-sgs-loop="1"';
}
$place_id           = sgs_reviews_place_id( $attributes, (string) ( Google_Reviews_Settings::get_settings()['place_id'] ?? '' ) );
// `columns` is a TIER OBJECT (Spec 35 pass 4, 2026-08-11) — read each tier via
// the normaliser, never the raw attribute (a cast on an unresolved array
// throws "Array to int/string conversion", the D569/D570 bug class this
// normaliser exists to prevent).
$columns_obj        = sgs_responsive_normalise_object( $attributes['columns'] ?? null );
$columns            = $columns_obj['desktop'] ?? 3;
$columns_tablet     = $columns_obj['tablet'] ?? 2;
$columns_mobile     = $columns_obj['mobile'] ?? 1;
$max_reviews        = $attributes['maxReviews'] ?? 10;
$min_rating         = $attributes['minRating'] ?? 1;
$text_only          = $attributes['textOnly'] ?? false;
$exclude_keywords   = $attributes['excludeKeywords'] ?? '';
$sort_by            = $attributes['sortBy'] ?? 'newest';
$show_aggregate     = $attributes['showAggregate'] ?? true;
$show_breakdown     = $attributes['showBreakdown'] ?? false;
$show_avatar        = $attributes['showAvatar'] ?? true;
$show_date          = $attributes['showDate'] ?? true;
$show_google_logo   = $attributes['showGoogleLogo'] ?? true;
$review_request_url = $attributes['reviewRequestUrl'] ?? '';
$theme              = $attributes['theme'] ?? 'light';
$card_style         = $attributes['cardStyle'] ?? 'google-card';
$star_colour        = $attributes['starColour'] ?? 'accent';
$autoplay           = $attributes['autoplay'] ?? false;
$autoplay_speed     = $attributes['autoplaySpeed'] ?? 5000;
$show_arrows        = $attributes['showArrows'] ?? true;
// Shared slider navigation (includes/helpers-slider-nav.php): where the arrows sit and how progress shows.
$gr_nav_position = sgs_slider_nav_normalise( $attributes['navPosition'] ?? 'below-end', sgs_slider_nav_placements() );
$gr_pagination   = sgs_slider_nav_normalise( $attributes['pagination'] ?? 'scrollbar', sgs_slider_nav_paginations() );

// Redesign attributes (element content and presence). Each is read with the literal
// `$attributes['name']` form so the seeder (`render_reads_attr`) marks the content ones nested.
$gr_source_label     = trim( (string) ( $attributes['sourceLabel'] ?? '' ) );
$gr_footnote         = trim( (string) ( $attributes['footnote'] ?? '' ) );
$gr_see_all_url      = trim( (string) ( $attributes['seeAllUrl'] ?? '' ) );
$gr_see_all_label    = trim( (string) ( $attributes['seeAllLabel'] ?? '' ) );
$gr_write_label      = trim( (string) ( $attributes['writeReviewLabel'] ?? '' ) );
$gr_show_card_logo   = (bool) ( $attributes['showCardLogo'] ?? true );
$gr_show_review_link = (bool) ( $attributes['showReviewLink'] ?? false );
$gr_review_link_text = trim( (string) ( $attributes['reviewLinkLabel'] ?? '' ) );

// What may be shown (includes/helpers-reviews-inline.php::sgs_reviews_resolve): written reviews, live
// Google data, the sample set (only when the author picked `placeholder`), or nothing. `auto` (the
// default) is written when the block holds any, otherwise Google. No real data means no output at all:
// invented reviews are never shown to a visitor, and no wrapper or schema is printed for an empty block.
$sgs_gr_resolved = sgs_reviews_resolve( $attributes, $place_id );
if ( null === $sgs_gr_resolved ) {
	return;
}
$data_source = $sgs_gr_resolved['source'];
$data        = $sgs_gr_resolved['data'];

$all_reviews   = $data['reviews'] ?? array();
/*
 * The score and the count are only printed when there is a real one to print. A rating of 0 means
 * "no rating", never "0.0 out of 5" over five empty stars. Where the figure comes from:
 *   1. `averageRating` when the author set it (> 0), or the live Google rating;
 *   2. otherwise the mean of the written reviews that carry a numeric rating, rounded to one decimal.
 *      That is derived from the reviews the visitor can see (sgs_reviews_inline_data), not invented,
 *      and it never feeds schema (sgs_reviews_may_emit_schema allows live Google data only);
 *   3. otherwise no figure and no stars at all. The count still shows when there is one
 *      (`reviewCount`, else how many written reviews there are).
 */
$rating        = (float) ( $data['rating'] ?? 0 );
$rating_count  = (int) ( $data['userRatingCount'] ?? 0 );
$has_rating    = $rating > 0;
$has_count     = $rating_count > 0;
$business_name = $data['displayName']['text'] ?? '';

// Filter reviews.
$filtered_reviews = array_filter(
	$all_reviews,
	function ( $review ) use ( $min_rating, $text_only, $exclude_keywords ) {
		// A written review may carry no rating: it has nothing to fall below the minimum.
		$review_rating = $review['rating'] ?? null;

		if ( null !== $review_rating && $review_rating < $min_rating ) {
			return false;
		}

		if ( $text_only && empty( $review['text']['text'] ) ) {
			return false;
		}

		if ( ! empty( $exclude_keywords ) ) {
			$keywords = array_map( 'trim', explode( ',', $exclude_keywords ) );
			$text     = strtolower( $review['text']['text'] ?? '' );
			foreach ( $keywords as $keyword ) {
				if ( ! empty( $keyword ) && str_contains( $text, strtolower( $keyword ) ) ) {
					return false;
				}
			}
		}

		return true;
	}
);

// Sort reviews. Written reviews keep the order the client put them in (the editor has Move up / Move down).
usort(
	$filtered_reviews,
	function ( $a, $b ) use ( $sort_by, $data_source ) {
		if ( 'inline' === $data_source ) {
			return 0;
		}

		if ( 'highest' === $sort_by ) {
			return ( $b['rating'] ?? 0 ) <=> ( $a['rating'] ?? 0 );
		}

		if ( 'lowest' === $sort_by ) {
			return ( $a['rating'] ?? 0 ) <=> ( $b['rating'] ?? 0 );
		}

		// Default: newest.
		$time_a = strtotime( $a['publishTime'] ?? '' );
		$time_b = strtotime( $b['publishTime'] ?? '' );
		return $time_b <=> $time_a;
	}
);

// Limit reviews.
// Written reviews are never capped: the client chose how many to write, and a silent cut would drop
// reviews they typed. The cap is for the Google feed, where it limits what the API returned.
$reviews = 'inline' === $data_source ? array_values( $filtered_reviews ) : array_slice( $filtered_reviews, 0, $max_reviews );

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
	'sgs-google-reviews--star-' . sanitize_key( $star_colour ),
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
$sgs_gr_star     = sgs_colour_value( $star_colour );
$gr_extra_styles = array(
	'--sgs-gr-star-colour:' . $sgs_gr_star,
);

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
$gr_btn_attrs = static function ( string $prefix ) use ( $attributes ): array {
	$out = $attributes;
	foreach ( array( 'FontSize', 'FontWeight', 'Padding', 'BorderWidth', 'BorderStyle', 'BorderRadius', 'WidthType' ) as $suffix ) {
		unset( $out[ $prefix . $suffix ] );
	}
	return $out;
};
$gr_responsive_css .= sgs_button_element_style_css( $gr_btn_attrs( 'writeReview' ), 'writeReview', $gr_root_sel . ' .sgs-google-reviews__write-review', true, false );
$gr_responsive_css .= sgs_button_element_style_css( $gr_btn_attrs( 'seeAll' ), 'seeAll', $gr_root_sel . ' .sgs-google-reviews__see-all', true, false );
$gr_responsive_css .= sgs_button_element_style_css( $gr_btn_attrs( 'arrow' ), 'arrow', $gr_root_sel . ' .sgs-google-reviews__arrow', true, true );

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

// A four-sided box value (padding, border width, radius corners) as one shorthand per device tier. A tier
// inherits the tier above it side by side and writes a rule only when its shorthand differs, exactly like the
// shared tier engine. An unset side of a set box is 0, as in sgs_box_object_shorthand().
$gr_box_rule = static function ( string $selector, $raw, string $prop, array $keys ): string {
	$obj    = sgs_responsive_normalise_object( $raw, true );
	$chains = array(
		'desktop' => array( 'desktop' ),
		'tablet'  => array( 'tablet', 'desktop' ),
		'mobile'  => array( 'mobile', 'tablet', 'desktop' ),
	);
	$rules  = array();
	$prev   = '';
	foreach ( $chains as $tier => $sources ) {
		$vals = array();
		$any  = false;
		foreach ( $keys as $key ) {
			$val = null;
			foreach ( $sources as $source ) {
				if ( is_array( $obj[ $source ] ) && isset( $obj[ $source ][ $key ] ) ) {
					$val = sgs_responsive_format_atom_value( $obj[ $source ][ $key ], 'px', 'float', null );
					if ( null !== $val ) {
						break;
					}
				}
			}
			$any    = $any || null !== $val;
			$vals[] = $val ?? '0';
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
	$allowed = array( 'solid', 'dashed', 'dotted', 'none' );
	$style   = (string) ( $attributes[ $prefix . 'BorderStyle' ] ?? 'solid' );
	$style   = in_array( $style, $allowed, true ) ? $style : 'solid';
	if ( 'none' === $style && $gr_is_set( $prefix . 'BorderStyle', 'solid' ) ) {
		return $selector . '{border-style:none;}';
	}
	return ( '' !== $width_css && 'none' !== $style ) ? $selector . '{border-style:' . $style . ';}' : '';
};

// A button-shaped element (write-review, see-all, arrow): padding, border, radius, height and width.
// `$size` is the element's own size attribute where it has one (only the arrow does), read literally by the caller.
$gr_button_box = static function ( string $selector, string $prefix, $size = null, $min_height = null ) use ( $attributes, $gr_box_rule, $gr_len_rule, $gr_border_style, $gr_sides, $gr_corners ): string {
	$width = $gr_box_rule( $selector, $attributes[ $prefix . 'BorderWidth' ] ?? null, 'border-width', $gr_sides );
	$css   = $gr_box_rule( $selector, $attributes[ $prefix . 'Padding' ] ?? null, 'padding', $gr_sides );
	$css  .= $width . $gr_border_style( $selector, $prefix, $width );
	$css  .= $gr_box_rule( $selector, $attributes[ $prefix . 'BorderRadius' ] ?? null, 'border-radius', $gr_corners );
	$css  .= $gr_len_rule( $selector, $min_height, array( 'min-height' ) );
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

// ── Google logo: size and opacity. Opacity is written only once the author moved it off the default. ──
$gr_logo_sel        = $gr_root_sel . ' .sgs-google-reviews__google-logo';
$gr_responsive_css .= $gr_len_rule( $gr_logo_sel, $attributes['logoSize'] ?? null, array( 'width', 'height' ) );
if ( $gr_is_set( 'logoOpacity', 1 ) && is_numeric( $attributes['logoOpacity'] ?? null ) ) {
	$gr_responsive_css .= $gr_logo_sel . '{opacity:' . max( 0, min( 1, (float) $attributes['logoOpacity'] ) ) . ';}';
}

// ── Source caption, rating figure, review count, header stars. ──
$gr_responsive_css .= $gr_colour_rule( $gr_root_sel . ' .sgs-google-reviews__source-label', 'color', $attributes['sourceLabelColour'] ?? '' );
$gr_responsive_css .= $gr_colour_rule( $gr_root_sel . ' .sgs-google-reviews__score', 'color', $attributes['scoreColour'] ?? '' );
$gr_responsive_css .= $gr_colour_rule( $gr_root_sel . ' .sgs-google-reviews__count', 'color', $attributes['countColour'] ?? '' );

// Star size is a custom property the stylesheet reads (`--sgs-gr-star-size`), so the header stars and the card
// stars can differ under one look: the header rule is written after the general one and wins.
$gr_responsive_css  .= $gr_len_rule( $gr_root_sel . ' .sgs-google-reviews__stars', $attributes['starSize'] ?? null, array( '--sgs-gr-star-size' ) );
$gr_responsive_css  .= $gr_len_rule( $gr_root_sel . ' .sgs-google-reviews__aggregate-stars', $attributes['aggregateStarSize'] ?? null, array( '--sgs-gr-star-size' ) );
$gr_star_full_colour = (string) ( $attributes['starColour'] ?? 'accent' );
// A gradient set on the stars (above) wins over the flat colour.
if ( '' === $gr_star_colour_gradient && $gr_is_set( 'starColour', 'accent' ) && '' !== sgs_colour_value( $gr_star_full_colour ) ) {
	$gr_responsive_css .= $gr_root_sel . ' .sgs-google-reviews__star--full,' . $gr_root_sel . ' .sgs-google-reviews__star--half .sgs-google-reviews__star-fill{fill:' . sgs_colour_value( $gr_star_full_colour ) . ';}';
}
$gr_star_empty = sgs_colour_value( (string) ( $attributes['starEmptyColour'] ?? '' ) );
if ( '' !== $gr_star_empty ) {
	$gr_responsive_css .= $gr_root_sel . ' .sgs-google-reviews__star--empty,' . $gr_root_sel . ' .sgs-google-reviews__star--half .sgs-google-reviews__star-outline{fill:' . $gr_star_empty . ';}';
}

// ── Review card. ──
$gr_card_sel             = $gr_root_sel . ' .sgs-google-reviews__review';
$gr_card_width           = $gr_box_rule( $gr_card_sel, $attributes['cardBorderWidth'] ?? null, 'border-width', $gr_sides );
$gr_responsive_css      .= $gr_box_rule( $gr_card_sel, $attributes['cardPadding'] ?? null, 'padding', $gr_sides );
$gr_responsive_css      .= $gr_card_width . $gr_border_style( $gr_card_sel, 'card', $gr_card_width );
$gr_responsive_css      .= $gr_colour_rule( $gr_card_sel, 'border-color', $attributes['cardBorderColour'] ?? '' );
$gr_card_border_gradient = sgs_css_gradient_value( $attributes['cardBorderColourGradient'] ?? '' );
if ( '' !== $gr_card_border_gradient ) {
	$gr_responsive_css .= sgs_border_gradient_css( $gr_card_sel, $gr_card_border_gradient, null, '1px' );
}
$gr_responsive_css .= $gr_box_rule( $gr_card_sel, $attributes['cardBorderRadius'] ?? null, 'border-radius', $gr_corners );
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
	$gr_scrollbar_colour = sgs_colour_value( (string) ( $attributes['scrollbarColour'] ?? '' ) );
	if ( '' !== $gr_scrollbar_colour ) {
		$gr_responsive_css .= $gr_list_sel . '{scrollbar-color:' . $gr_scrollbar_colour . ' transparent;}';
	}
}

// ── Buttons and arrows: box, border, radius, height, width. Type and colour come from the families above. ──
$gr_responsive_css .= $gr_button_box( $gr_root_sel . ' .sgs-google-reviews__write-review', 'writeReview', null, $attributes['writeReviewMinHeight'] ?? null );
$gr_responsive_css .= $gr_button_box( $gr_root_sel . ' .sgs-google-reviews__see-all', 'seeAll', null, $attributes['seeAllMinHeight'] ?? null );
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

// (native border_args removed by the Shape-B migration -- width/style/colour
//  are block-private attrs now, emitted below)

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

// WP Interactivity attrs — carried verbatim so the store binds correctly.
$gr_extra_attrs = array(
	'data-wp-interactive' => 'sgs/google-reviews',
	'data-wp-context'     => wp_json_encode(
		array(
			'autoplay'      => $autoplay,
			'autoplaySpeed' => $autoplay_speed,
			'currentSlide'  => 0,
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

// ───────────────────────────────────────────────────────────────────────────
// Star rendering helper (inline — shared helper not yet shipped).
// ───────────────────────────────────────────────────────────────────────────

if ( ! function_exists( 'sgs_render_stars_svg' ) ) {
	/**
	 * Render SVG star rating.
	 *
	 * TODO: Replace with sgs_render_stars() from includes/render-helpers.php
	 * once Agent P ships the shared helper — this inline version can then be removed.
	 *
	 * Uses Lucide-compatible 5-point star SVG paths.
	 * Full stars are solid; half stars use a clip-path split; empty stars are outline only.
	 *
	 * @param float  $star_rating        Rating value (0-5).
	 * @param string $fill_gradient_defs Optional `<defs>…</defs>` markup for a
	 *                                    star-fill gradient (D636/D644 rollout,
	 *                                    from sgs_svg_stroke_gradient(...,'fill')).
	 *                                    Injected into the FIRST rendered star
	 *                                    SVG only (per call, and only once per
	 *                                    unique defs string across all calls in
	 *                                    this request) — `url(#id)` resolves
	 *                                    document-wide, so a single `<defs>`
	 *                                    paints every repeated star instance via
	 *                                    the block's own scoped CSS rule; a
	 *                                    duplicate `id` per block instance is
	 *                                    avoided by tracking already-injected
	 *                                    defs strings in a static map that
	 *                                    persists across every call this
	 *                                    function makes on the page.
	 * @param string $extra_class        Optional extra class on the star run (the header run passes
	 *                                    `sgs-google-reviews__aggregate-stars`).
	 * @return string HTML for star rating.
	 */
	function sgs_render_stars_svg( float $star_rating, string $fill_gradient_defs = '', string $extra_class = '' ): string {
		static $gradient_defs_emitted = array();

		$star_rating = max( 0.0, min( 5.0, $star_rating ) );
		$full_stars  = (int) floor( $star_rating );
		// The partial star is filled to the exact fraction (4.7 fills the fifth star to 70%), as Google draws it;
		// a sliver under 5% is not drawn.
		$fraction    = round( $star_rating - $full_stars, 2 );
		$half_star   = $fraction >= 0.05 ? 1 : 0;
		$empty_stars = 5 - $full_stars - $half_star;

		// SVG star path — standard 5-point polygon, 24×24 viewBox.
		$star_path = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

		$label = esc_attr(
			sprintf(
				/* translators: %s: rating number */
				__( '%s out of 5 stars', 'sgs-blocks' ),
				number_format( $star_rating, 1 )
			)
		);

		$html = '<div class="sgs-google-reviews__stars' . ( '' !== $extra_class ? ' ' . esc_attr( $extra_class ) : '' ) . '" role="img" aria-label="' . $label . '">';
		$uid  = wp_unique_id( 'star-half-' );

		// Consume the gradient defs on the first full/half star this call
		// renders, but only once EVER per unique defs string (guards against
		// a duplicate `id` when this function is called repeatedly — once for
		// the aggregate rating, once per individual review).
		$defs_to_inject = '';
		if ( '' !== $fill_gradient_defs && ! isset( $gradient_defs_emitted[ $fill_gradient_defs ] ) ) {
			$defs_to_inject                               = $fill_gradient_defs;
			$gradient_defs_emitted[ $fill_gradient_defs ] = true;
		}

		for ( $i = 0; $i < $full_stars; $i++ ) {
			$star_svg = '<svg class="sgs-google-reviews__star sgs-google-reviews__star--full" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="' . $star_path . '"/></svg>';
			if ( '' !== $defs_to_inject ) {
				$star_svg       = sgs_svg_inject_defs( $star_svg, $defs_to_inject );
				$defs_to_inject = '';
			}
			$html .= $star_svg;
		}

		if ( $half_star ) {
			// Partial star: the filled part is clipped to the fraction's share of the 24-unit width.
			$fill_width = (string) round( 24 * $fraction, 2 );
			$half_svg   = '<svg class="sgs-google-reviews__star sgs-google-reviews__star--half" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">';
			$half_svg  .= '<defs><clipPath id="' . esc_attr( $uid ) . '"><rect x="0" y="0" width="' . esc_attr( $fill_width ) . '" height="24"/></clipPath></defs>';
			$half_svg .= '<path class="sgs-google-reviews__star-outline" d="' . $star_path . '"/>';
			$half_svg .= '<path class="sgs-google-reviews__star-fill" d="' . $star_path . '" clip-path="url(#' . esc_attr( $uid ) . ')"/>';
			$half_svg .= '</svg>';
			if ( '' !== $defs_to_inject ) {
				$half_svg       = sgs_svg_inject_defs( $half_svg, $defs_to_inject );
				$defs_to_inject = '';
			}
			$html .= $half_svg;
		}

		for ( $i = 0; $i < $empty_stars; $i++ ) {
			$html .= '<svg class="sgs-google-reviews__star sgs-google-reviews__star--empty" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="' . $star_path . '"/></svg>';
		}

		$html .= '</div>';

		return $html;
	}
}

// ───────────────────────────────────────────────────────────────────────────
// Schema.org JSON-LD (emitted before the wrapper element).
// ───────────────────────────────────────────────────────────────────────────

// Schema only for real Google data (sgs_reviews_may_emit_schema). Written reviews emit NO review
// schema: Google's review-snippet guidance makes reviews that the reviewed business controls about
// itself ineligible, and there is no switch to force it on. The sample set is invented, so never.
if ( sgs_reviews_may_emit_schema( $data_source, $data ) ) {
	$schema = array(
		'@context'        => 'https://schema.org',
		'@type'           => 'LocalBusiness',
		'name'            => $business_name,
		'aggregateRating' => array(
			'@type'       => 'AggregateRating',
			'ratingValue' => $rating,
			'reviewCount' => $rating_count,
		),
	);

	// One shared encoder (FR-30-9), using JSON_HEX_TAG: without it, an unescaped
	// `</script>` in any schema value could close this tag prematurely.
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-encoded ld+json via Sgs_Schema HEX flags, not HTML.
	echo \SGS\Blocks\Sgs_Schema::script_tag( $schema );
}

// ───────────────────────────────────────────────────────────────────────────
// Build interior HTML
// ───────────────────────────────────────────────────────────────────────────

ob_start();

// "N review(s)" for the aggregate and the badge; only called when the count is above zero.
$gr_count_label = static function ( int $count ): string {
	// Plain __() rather than _n(): the shared QA render harness stubs __() but not _n().
	/* translators: %s: number of reviews. */
	$label = 1 === $count ? __( '%s review', 'sgs-blocks' ) : __( '%s reviews', 'sgs-blocks' );
	return sprintf( $label, number_format( $count ) );
};

// The two header buttons ("See all reviews", "Write a review"). They sit at the end of the header row while
// that row is drawn, otherwise below the reviews as before. Each is drawn only when it has a link.
$gr_actions_html = '';
if ( '' !== $gr_see_all_url || ! empty( $review_request_url ) ) {
	$gr_actions_html = '<div class="sgs-google-reviews__cta">';
	if ( '' !== $gr_see_all_url ) {
		$gr_actions_html .= '<a href="' . esc_url( $gr_see_all_url ) . '" class="sgs-google-reviews__see-all" target="_blank" rel="noopener">'
			. esc_html( '' !== $gr_see_all_label ? $gr_see_all_label : __( 'See all reviews', 'sgs-blocks' ) ) . '</a>';
	}
	if ( ! empty( $review_request_url ) ) {
		$gr_actions_html .= '<a href="' . esc_url( $review_request_url ) . '" class="sgs-google-reviews__write-review" target="_blank" rel="noopener">'
			. esc_html( '' !== $gr_write_label ? $gr_write_label : __( 'Write a review', 'sgs-blocks' ) ) . '</a>';
	}
	$gr_actions_html .= '</div>';
}

$gr_google_logo_url = plugins_url( 'assets/google-logo.svg', SGS_BLOCKS_PATH . 'sgs-blocks.php' );
$gr_header_shown    = $show_aggregate && ! in_array( $variant, array( 'badge', 'floating-badge' ), true ) && ( $has_rating || $has_count );

if ( $gr_header_shown ) :
	?>
	<div class="sgs-google-reviews__aggregate">
		<div class="sgs-google-reviews__aggregate-text">
			<?php if ( '' !== $gr_source_label ) : ?>
				<span class="sgs-google-reviews__source-label"><?php echo esc_html( $gr_source_label ); ?></span>
			<?php endif; ?>
			<?php if ( $has_rating ) : ?>
				<strong class="sgs-google-reviews__score"><?php echo esc_html( number_format( $rating, 1 ) ); ?></strong>
			<?php endif; ?>
			<?php
			if ( $has_rating ) {
				echo sgs_render_stars_svg( $rating, $gr_star_stroke_grad['defs'], 'sgs-google-reviews__aggregate-stars' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			}
			if ( $has_count ) {
				echo '<span class="sgs-google-reviews__count">' . esc_html( $gr_count_label( $rating_count ) ) . '</span>';
			}
			?>
		</div>
		<?php if ( $show_google_logo ) : ?>
			<img
				src="<?php echo esc_url( $gr_google_logo_url ); ?>"
				alt="Google"
				class="sgs-google-reviews__google-logo"
				width="16"
				height="16"
			/>
		<?php endif; ?>
		<?php echo $gr_actions_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from esc_url() / esc_html() only. ?>
	</div>
	<?php
endif;

// ───────────────────────────────────────────────────────────────────────────
// Ratings breakdown — per-star distribution bars (5★ … 1★).
// Counts are derived from the available reviews ($all_reviews); the Google
// Places API returns no histogram, so the sample of returned reviews is the
// best available source. WCAG: each row carries a visible numeric star label
// + the count + an aria-label — meaning is NOT conveyed by the bar colour alone.
// Hidden for badge variants (no room) and when there are no reviews to count.
// ───────────────────────────────────────────────────────────────────────────
if ( $show_breakdown && ! in_array( $variant, array( 'badge', 'floating-badge' ), true ) && ! empty( $all_reviews ) ) :
	$gr_star_counts = array(
		5 => 0,
		4 => 0,
		3 => 0,
		2 => 0,
		1 => 0,
	);
	foreach ( $all_reviews as $gr_review ) {
		$gr_r = (int) round( (float) ( $gr_review['rating'] ?? 0 ) );
		if ( $gr_r >= 1 && $gr_r <= 5 ) {
			++$gr_star_counts[ $gr_r ];
		}
	}
	$gr_total = array_sum( $gr_star_counts );
	if ( $gr_total > 0 ) :
		?>
		<?php $gr_star_position = 0; ?>
		<div class="sgs-google-reviews__breakdown" role="table" aria-label="<?php echo esc_attr__( 'Rating breakdown by number of stars', 'sgs-blocks' ); ?>">
			<?php foreach ( $gr_star_counts as $gr_stars => $gr_count ) : ?>
				<?php
				$gr_pct = $gr_total > 0 ? round( ( $gr_count / $gr_total ) * 100 ) : 0;
				++$gr_star_position;
				// gr_pct VARIES per star row (FR-32-4, D345), so it cannot be a
				// single scoped rule on the block root; emitted into a
				// `:nth-child(N)` scoped rule instead (same mechanism as
				// sgs/social-icons' / sgs/pricing-table's per-item values) — every
				// row renders `.sgs-google-reviews__breakdown-row` unconditionally
				// (all 5 star tiers), so position is stable.
				$gr_responsive_css .= $gr_root_sel . ' .sgs-google-reviews__breakdown-row:nth-child(' . $gr_star_position . ') .sgs-google-reviews__breakdown-fill{--sgs-gr-pct:' . sgs_css_length_sanitise( $gr_pct ) . '%;}';
				?>
				<div class="sgs-google-reviews__breakdown-row" role="row">
					<span class="sgs-google-reviews__breakdown-label" role="cell">
						<?php
						/* translators: %d: number of stars (1-5). */
						echo esc_html( sprintf( _n( '%d star', '%d stars', $gr_stars, 'sgs-blocks' ), $gr_stars ) );
						?>
					</span>
					<span class="sgs-google-reviews__breakdown-bar" role="cell" aria-hidden="true">
						<span class="sgs-google-reviews__breakdown-fill"></span>
					</span>
					<span class="sgs-google-reviews__breakdown-count" role="cell">
						<?php
						/* translators: %1$d: number of reviews; %2$d: percentage. */
						echo esc_html( sprintf( _n( '%1$d review (%2$d%%)', '%1$d reviews (%2$d%%)', $gr_count, 'sgs-blocks' ), $gr_count, $gr_pct ) );
						?>
					</span>
				</div>
			<?php endforeach; ?>
		</div>
		<?php
	endif;
endif;

if ( in_array( $variant, array( 'badge', 'floating-badge' ), true ) ) :
	?>
	<div class="sgs-google-reviews__badge">
		<?php
		if ( $has_rating ) {
			echo sgs_render_stars_svg( $rating, $gr_star_stroke_grad['defs'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
		?>
		<div class="sgs-google-reviews__badge-text">
			<?php if ( $has_rating ) : ?>
				<strong><?php echo esc_html( number_format( $rating, 1 ) ); ?></strong>
			<?php endif; ?>
			<?php if ( $has_count ) : ?>
				<span><?php echo esc_html( $gr_count_label( $rating_count ) ); ?></span>
			<?php endif; ?>
		</div>
		<?php if ( $show_google_logo ) : ?>
			<img
				src="<?php echo esc_url( plugins_url( 'assets/google-logo.svg', SGS_BLOCKS_PATH . 'sgs-blocks.php' ) ); ?>"
				alt="Google"
				width="16"
				height="16"
			/>
		<?php endif; ?>
	</div>
	<?php
else :
	/*
	 * Slider navigation is only meaningful for the slider variant with more than one review: anything
	 * else has nothing to navigate between. $gr_nav_enabled is the single gate for the shared navigation
	 * (includes/helpers-slider-nav.php: arrows, dots, the footnote's slot and the placement classes), the
	 * rail class it lays out, and the scroll-sync directive, so switching arrows off or choosing a
	 * pagination without dots REMOVES that markup rather than hiding it (no dead controls). The arrows
	 * are the slider's single-pointer alternative to dragging (WCAG 2.5.7).
	 */
	$gr_nav_enabled = ( 'slider' === $variant && count( $reviews ) > 1 );
	// The footnote takes the navigation's leading slot when there is one, so it shares the arrows' row.
	$gr_footnote_html = '' !== $gr_footnote
		? '<p class="' . esc_attr( 'sgs-google-reviews__footnote' . ( $gr_nav_enabled ? ' sgs-slider-nav__lead' : '' ) ) . '">' . esc_html( $gr_footnote ) . '</p>'
		: '';
	$gr_list_class    = 'sgs-google-reviews__list' . ( $gr_nav_enabled ? ' sgs-slider-nav__rail' : '' );
	// The active dot is re-measured on scroll only when there are dots to keep in step.
	$gr_list_sync_attr = ( $gr_nav_enabled && 'dots' === $gr_pagination ) ? ' data-wp-on--scroll="actions.syncActiveDot"' : '';
	ob_start();
	?>
	<div
		class="<?php echo esc_attr( $gr_list_class ); ?>"
		<?php echo $sgs_gr_list_fx_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built entirely from literal strings, no dynamic value. ?>
		<?php echo $gr_list_sync_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal string, no dynamic value. ?>
	>
		<?php $gr_card_n = 0; ?>
		<?php foreach ( $reviews as $review ) : ?>
			<?php
			++$gr_card_n;
			$author        = ( $review['authorAttribution']['displayName'] ?? '' ) ?: __( 'Anonymous', 'sgs-blocks' );
			$author_photo  = $review['authorAttribution']['photoUri'] ?? '';
			$text          = $review['text']['text'] ?? '';
			// Absent for a written review with no rating: no stars are drawn for it.
			$review_rating = $review['rating'] ?? null;
			$publish_time  = ! empty( $review['publishTime'] ) ? strtotime( $review['publishTime'] ) : 0;
			// Written reviews only: the date as typed, the reviewer detail line and the initials colour.
			$date_label    = (string) ( $review['dateLabel'] ?? '' );
			$review_meta   = (string) ( $review['meta'] ?? '' );
			$review_url    = (string) ( $review['reviewUrl'] ?? '' );
			if ( ! empty( $review['avatarColour'] ) ) {
				// One scoped rule per card (the registry's nth-child pattern), never an inline style.
				$gr_responsive_css .= $gr_root_sel . ' .sgs-google-reviews__list > .sgs-google-reviews__review:nth-child(' . $gr_card_n . ') .sgs-google-reviews__avatar-initials{background:' . sgs_colour_value( (string) $review['avatarColour'] ) . ';}';
			}
			?>
			<article class="sgs-google-reviews__review">
				<div class="sgs-google-reviews__review-header">
					<?php if ( $show_avatar ) : ?>
						<div class="sgs-google-reviews__avatar">
							<?php if ( ! empty( $author_photo ) ) : ?>
								<img
									src="<?php echo esc_url( $author_photo ); ?>"
									alt=""
									loading="lazy"
									width="48"
									height="48"
									<?php echo $gr_media_classes ? 'class="' . esc_attr( implode( ' ', $gr_media_classes ) ) . '"' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped via esc_attr() above. ?>
								/>
							<?php else : ?>
								<div class="sgs-google-reviews__avatar-initials">
									<?php echo esc_html( strtoupper( substr( $author, 0, 1 ) ) ); ?>
								</div>
							<?php endif; ?>
						</div>
					<?php endif; ?>

					<strong class="sgs-google-reviews__author"><?php echo esc_html( $author ); ?></strong>

					<?php if ( '' !== $review_meta ) : ?>
						<span class="sgs-google-reviews__meta"><?php echo esc_html( $review_meta ); ?></span>
					<?php endif; ?>

					<?php if ( $gr_show_card_logo ) : ?>
						<img
							src="<?php echo esc_url( $gr_google_logo_url ); ?>"
							alt=""
							class="sgs-google-reviews__card-logo"
							width="17"
							height="17"
							aria-hidden="true"
						/>
					<?php endif; ?>
				</div>

				<div class="sgs-google-reviews__review-content">
					<?php if ( null !== $review_rating ) : ?>
						<?php echo sgs_render_stars_svg( $review_rating, $gr_star_stroke_grad['defs'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					<?php endif; ?>

					<?php if ( $show_date && ( $publish_time || '' !== $date_label ) ) : ?>
						<time class="sgs-google-reviews__date"<?php echo $publish_time ? ' datetime="' . esc_attr( gmdate( 'Y-m-d', $publish_time ) ) . '"' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the datetime value is escaped above, the rest is literal. ?>>
							<?php echo esc_html( '' !== $date_label ? $date_label : human_time_diff( $publish_time, time() ) . ' ago' ); ?>
						</time>
					<?php endif; ?>

					<?php if ( ! empty( $text ) ) : ?>
						<p class="sgs-google-reviews__text"><?php echo esc_html( $text ); ?></p>
					<?php endif; ?>

					<?php if ( $gr_show_review_link && '' !== $review_url ) : ?>
						<a href="<?php echo esc_url( $review_url ); ?>" class="sgs-google-reviews__review-link" target="_blank" rel="noopener"><?php echo esc_html( '' !== $gr_review_link_text ? $gr_review_link_text : __( 'Read the full review', 'sgs-blocks' ) ); ?></a>
					<?php endif; ?>
				</div>
			</article>
		<?php endforeach; ?>
	</div>
	<?php
	$gr_rail_html = (string) ob_get_clean();

	if ( $gr_nav_enabled ) {
		sgs_slider_nav_enqueue_style();
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every part is escaped inside sgs_slider_nav_render() or above (rail, footnote).
		echo sgs_slider_nav_render(
			array(
				'block'           => 'sgs-google-reviews',
				'placement'       => $gr_nav_position,
				'pagination'      => $gr_pagination,
				'show_arrows'     => (bool) $show_arrows,
				'rail_html'       => $gr_rail_html,
				'lead_html'       => $gr_footnote_html,
				'count'           => count( $reviews ),
				'labels'          => array(
					'prev' => __( 'Previous review', 'sgs-blocks' ),
					'next' => __( 'Next review', 'sgs-blocks' ),
					'dots' => __( 'Review pagination', 'sgs-blocks' ),
					/* translators: %d: review number (1-indexed). */
					'dot'  => __( 'Go to review %d', 'sgs-blocks' ),
				),
				'prev_directives' => array( 'data-wp-on--click' => 'actions.prevSlide' ),
				'next_directives' => array( 'data-wp-on--click' => 'actions.nextSlide' ),
				'dot_directives'  => array( 'data-wp-on--click' => 'actions.goToSlide' ),
			)
		);
	} else {
		echo $gr_rail_html . $gr_footnote_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the rail is escaped where it is built, the footnote above.
	}
	?>

	<?php if ( ! $gr_header_shown ) : ?>
		<?php echo $gr_actions_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from esc_url() / esc_html() only. ?>
	<?php endif; ?>
	<?php
endif;

$inner_html = ob_get_clean();

// Output responsive CSS if needed. wp_strip_all_tags (NOT esc_html) blocks a
// </style> breakout while leaving CSS combinators like `>` intact (contract
// §D — matches SGS_Container_Wrapper + sgs/hero + sgs/quote). Every value

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
		$gr_responsive_css .= $gr_root_hi . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$gr_responsive_css .= sgs_border_gradient_css( $gr_root_hi, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$gr_responsive_css .= $gr_root_hi . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$gr_responsive_css .= $gr_root_hi . '{border-style:none;border-width:0;}';
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
		array( 'selector' => $gr_root_hi )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$gr_responsive_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $gr_root_hi )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$gr_responsive_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $gr_root_hi )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$gr_responsive_css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// reaching $gr_responsive_css is pre-sanitised (sgs_css_length_value() / sgs_css_keyword_sanitise()
// / wp_style_engine_get_styles), so no un-sanitised value survives to here.
if ( $gr_responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below; $gr_responsive_css built from pre-sanitised values only.
	printf( '<style id="%s">%s</style>', esc_attr( $gr_uid ), wp_strip_all_tags( $gr_responsive_css ) );
}

// ───────────────────────────────────────────────────────────────────────────
// Output via shared wrapper helper.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// ───────────────────────────────────────────────────────────────────────────
echo SGS_Container_Wrapper::render( $attributes, $block, $inner_html, 'layout', $gr_wrapper_opts );
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
