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
require_once __DIR__ . '/google-reviews-stars.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-slider-nav.php';

// CSS length/unit sanitiser — for free-text attrs concatenated into raw CSS
// declarations inside this block's scoped <style> tag. Mirrors sgs/hero's
// proven sanitiser (strips everything except letters, digits, dot, %).
// CSS-keyword sanitiser — for free-text attrs (border-style) — letters + hyphen only.
$variant = $attributes['variant'] ?? 'slider';

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
$place_id = sgs_reviews_place_id( $attributes, (string) ( Google_Reviews_Settings::get_settings()['place_id'] ?? '' ) );
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
$show_date          = $attributes['showDate'] ?? true;
$review_request_url = $attributes['reviewRequestUrl'] ?? '';
$theme              = $attributes['theme'] ?? 'light';
$card_style         = $attributes['cardStyle'] ?? 'google-card';
$star_colour        = $attributes['starColour'] ?? '';
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
if ( 'synced' === $data_source ) {
	// A cache written before the attribution fields existed lacks the links: log it once per request.
	sgs_reviews_log_missing_attribution( $data );
}

$all_reviews = $data['reviews'] ?? array();
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

require __DIR__ . '/render-wrapper.php';
require __DIR__ . '/render-styles.php';
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

require __DIR__ . '/render-interior.php';

// ── Border (width, style, colour, gradient ring, none override, radius at
// three tiers) through the shared assembler. The base rule prints before the
// tier rules so a tablet or mobile radius (same specificity) wins in its query.
$border = sgs_border_element_decls(
	$attributes,
	'',
	$gr_root_hi,
	array(
		'colour' => array(
			'base'     => 'borderColour',
			'gradient' => 'borderColourGradient',
		),
	)
);
if ( $border['base'] ) {
	$gr_responsive_css .= $gr_root_hi . '{' . implode( ';', $border['base'] ) . ';}';
}
if ( $border['tablet'] ) {
	$gr_responsive_css .= '@media(max-width:1023px){' . $gr_root_hi . '{' . implode( ';', $border['tablet'] ) . ';}}';
}
if ( $border['mobile'] ) {
	$gr_responsive_css .= '@media(max-width:767px){' . $gr_root_hi . '{' . implode( ';', $border['mobile'] ) . ';}}';
}
$gr_responsive_css .= implode( '', $border['rules'] );

// Output responsive CSS if needed. wp_strip_all_tags (NOT esc_html) blocks a
// </style> breakout while leaving CSS combinators like `>` intact (contract
// §D — matches SGS_Container_Wrapper + sgs/hero + sgs/quote). Every value
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
