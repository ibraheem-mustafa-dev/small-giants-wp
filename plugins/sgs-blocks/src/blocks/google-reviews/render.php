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

// CSS length/unit sanitiser — for free-text attrs concatenated into raw CSS
// declarations inside this block's scoped <style> tag. Mirrors sgs/hero's
// proven sanitiser (strips everything except letters, digits, dot, %).
// CSS-keyword sanitiser — for free-text attrs (border-style) — letters + hyphen only.
$variant            = $attributes['variant'] ?? 'grid';

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
$place_id           = $attributes['placeId'] ?? Google_Reviews_Settings::get_settings()['place_id'] ?? '';
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
$card_style         = $attributes['cardStyle'] ?? 'bordered';
$star_colour        = $attributes['starColour'] ?? 'accent';
$autoplay           = $attributes['autoplay'] ?? false;
$autoplay_speed     = $attributes['autoplaySpeed'] ?? 5000;
$show_dots          = $attributes['showDots'] ?? true;
$show_arrows        = $attributes['showArrows'] ?? true;

// Placeholder reviews used when API key is not configured or API call fails.
// These demonstrate the block's styling without requiring a Google Places API key.
$dummy_reviews = array(
	array(
		'authorAttribution' => array(
			'displayName' => 'Sarah Patel',
			'photoUri'    => '',
		),
		'rating'            => 5,
		'text'              => array(
			'text' => 'Reliable supplier for over five years now. Consistent quality, excellent service, and their account team really understands our needs.',
		),
		'publishTime'       => gmdate( 'c', strtotime( '-6 months' ) ),
	),
	array(
		'authorAttribution' => array(
			'displayName' => 'James Wright',
			'photoUri'    => '',
		),
		'rating'            => 5,
		'text'              => array(
			'text' => 'Excellent product range and fast delivery times. Competitive pricing for the quality. Always our first choice for catering supplies.',
		),
		'publishTime'       => gmdate( 'c', strtotime( '-3 months' ) ),
	),
	array(
		'authorAttribution' => array(
			'displayName' => 'Aisha Khan',
			'photoUri'    => '',
		),
		'rating'            => 5,
		'text'              => array(
			'text' => 'Great trade prices and a genuinely helpful account team. They go the extra mile to support our business growth.',
		),
		'publishTime'       => gmdate( 'c', strtotime( '-1 month' ) ),
	),
);

if ( empty( $place_id ) ) {
	// No API key configured — use dummy content to showcase styling.
	$data = array(
		'reviews'         => $dummy_reviews,
		'rating'          => 4.9,
		'userRatingCount' => 47,
		'displayName'     => array( 'text' => __( 'Our Business', 'sgs-blocks' ) ),
	);
} else {
	// Fetch reviews from API.
	$data = Google_Reviews_Settings::fetch_reviews( $place_id );

	if ( is_wp_error( $data ) ) {
		// API error — fall back to dummy content.
		$data = array(
			'reviews'         => $dummy_reviews,
			'rating'          => 4.9,
			'userRatingCount' => 47,
			'displayName'     => array( 'text' => __( 'Our Business', 'sgs-blocks' ) ),
		);
	}
}

$all_reviews   = $data['reviews'] ?? array();
$rating        = $data['rating'] ?? 0;
$rating_count  = $data['userRatingCount'] ?? 0;
$business_name = $data['displayName']['text'] ?? '';

// Filter reviews.
$filtered_reviews = array_filter(
	$all_reviews,
	function ( $review ) use ( $min_rating, $text_only, $exclude_keywords ) {
		$review_rating = $review['rating'] ?? 0;

		if ( $review_rating < $min_rating ) {
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

// Sort reviews.
usort(
	$filtered_reviews,
	function ( $a, $b ) use ( $sort_by ) {
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
$reviews = array_slice( $filtered_reviews, 0, $max_reviews );

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
// `.sgs-google-reviews__write-review` has no `position` of its own in
// style.css (static) — bg_layer_positioned=false lets the helper add its
// own `position:relative`. `.sgs-google-reviews__arrow` already carries
// `position:absolute` (style.css:490) — bg_layer_positioned=true skips the
// helper's own position write so it doesn't clobber that.
$gr_responsive_css .= sgs_button_element_style_css( $attributes, 'writeReview', $gr_root_sel . ' .sgs-google-reviews__write-review', true, false );
$gr_responsive_css .= sgs_button_element_style_css( $attributes, 'arrow', $gr_root_sel . ' .sgs-google-reviews__arrow', true, true );

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
if ( $gr_dot_decls_normal || $gr_dot_decls_hover ) {
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
	 * @param float $star_rating Rating value (0-5).
	 * @return string HTML for star rating.
	 */
	function sgs_render_stars_svg( float $star_rating ): string {
		$full_stars  = (int) floor( $star_rating );
		$half_star   = ( $star_rating - $full_stars ) >= 0.5 ? 1 : 0;
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

		$html = '<div class="sgs-google-reviews__stars" role="img" aria-label="' . $label . '">';
		$uid  = wp_unique_id( 'star-half-' );

		for ( $i = 0; $i < $full_stars; $i++ ) {
			$html .= '<svg class="sgs-google-reviews__star sgs-google-reviews__star--full" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="' . $star_path . '"/></svg>';
		}

		if ( $half_star ) {
			// Half star: left half filled, right half outline, achieved via clipPath.
			$html .= '<svg class="sgs-google-reviews__star sgs-google-reviews__star--half" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">';
			$html .= '<defs><clipPath id="' . esc_attr( $uid ) . '"><rect x="0" y="0" width="12" height="24"/></clipPath></defs>';
			$html .= '<path class="sgs-google-reviews__star-outline" d="' . $star_path . '"/>';
			$html .= '<path class="sgs-google-reviews__star-fill" d="' . $star_path . '" clip-path="url(#' . esc_attr( $uid ) . ')"/>';
			$html .= '</svg>';
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

// ───────────────────────────────────────────────────────────────────────────
// Build interior HTML
// ───────────────────────────────────────────────────────────────────────────

ob_start();

if ( $show_aggregate && ! in_array( $variant, array( 'badge', 'floating-badge' ), true ) ) :
	?>
	<div class="sgs-google-reviews__aggregate">
		<?php echo sgs_render_stars_svg( $rating ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		<div class="sgs-google-reviews__aggregate-text">
			<strong><?php echo esc_html( number_format( $rating, 1 ) ); ?></strong>
			<?php
			echo '<span class="sgs-google-reviews__count">' . esc_html( number_format( $rating_count ) ) . ' ' . esc_html__( 'reviews', 'sgs-blocks' ) . '</span>';
			?>
		</div>
		<?php if ( $show_google_logo ) : ?>
			<img
				src="<?php echo esc_url( plugins_url( 'assets/google-logo.svg', SGS_BLOCKS_PATH . 'sgs-blocks.php' ) ); ?>"
				alt="Google"
				class="sgs-google-reviews__google-logo"
				width="16"
				height="16"
			/>
		<?php endif; ?>
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
		<?php echo sgs_render_stars_svg( $rating ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		<div class="sgs-google-reviews__badge-text">
			<strong><?php echo esc_html( number_format( $rating, 1 ) ); ?></strong>
			<span><?php echo esc_html( number_format( $rating_count ) ) . ' ' . esc_html__( 'reviews', 'sgs-blocks' ); ?></span>
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
	 * Slider navigation (dots + arrows) is only meaningful for the slider
	 * variant with more than one review — anything else has nothing to
	 * navigate between. $gr_nav_enabled is the single gate the arrow
	 * wrapper, the scroll-sync attr, and the dots block below all key off,
	 * so toggling showDots/showArrows off REMOVES the markup rather than
	 * hiding it (no dead controls). Before this, the slider had no
	 * single-pointer alternative to dragging (WCAG 2.5.7).
	 */
	$gr_nav_enabled = ( 'slider' === $variant && count( $reviews ) > 1 );
	?>
	<?php if ( $gr_nav_enabled ) : ?>
	<div class="sgs-google-reviews__slider">
	<?php endif; ?>

	<?php if ( $gr_nav_enabled && $show_arrows ) : ?>
	<button
		class="sgs-google-reviews__arrow sgs-google-reviews__arrow--prev"
		type="button"
		data-wp-on--click="actions.prevSlide"
		aria-label="<?php esc_attr_e( 'Previous review', 'sgs-blocks' ); ?>"
	>
		<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4-4.6-4.6z"/></svg>
	</button>
	<?php endif; ?>

	<div
		class="sgs-google-reviews__list"
		<?php echo $sgs_gr_list_fx_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built entirely from literal strings, no dynamic value. ?>
		<?php echo $gr_nav_enabled ? 'data-wp-on--scroll="actions.syncActiveDot"' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal string, no dynamic value. ?>
	>
		<?php foreach ( $reviews as $review ) : ?>
			<?php
			$author        = $review['authorAttribution']['displayName'] ?? __( 'Anonymous', 'sgs-blocks' );
			$author_photo  = $review['authorAttribution']['photoUri'] ?? '';
			$text          = $review['text']['text'] ?? '';
			$review_rating = $review['rating'] ?? 0;
			$publish_time  = isset( $review['publishTime'] ) ? strtotime( $review['publishTime'] ) : 0;
			?>
			<article class="sgs-google-reviews__review">
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

				<div class="sgs-google-reviews__review-content">
					<div class="sgs-google-reviews__review-header">
						<strong class="sgs-google-reviews__author"><?php echo esc_html( $author ); ?></strong>
						<?php if ( $show_date && $publish_time ) : ?>
							<time class="sgs-google-reviews__date" datetime="<?php echo esc_attr( gmdate( 'Y-m-d', $publish_time ) ); ?>">
								<?php echo esc_html( human_time_diff( $publish_time, time() ) . ' ago' ); ?>
							</time>
						<?php endif; ?>
					</div>

					<?php echo sgs_render_stars_svg( $review_rating ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>

					<?php if ( ! empty( $text ) ) : ?>
						<p class="sgs-google-reviews__text"><?php echo esc_html( $text ); ?></p>
					<?php endif; ?>
				</div>
			</article>
		<?php endforeach; ?>
	</div>

	<?php if ( $gr_nav_enabled && $show_arrows ) : ?>
	<button
		class="sgs-google-reviews__arrow sgs-google-reviews__arrow--next"
		type="button"
		data-wp-on--click="actions.nextSlide"
		aria-label="<?php esc_attr_e( 'Next review', 'sgs-blocks' ); ?>"
	>
		<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8.6 7.4 10 6l6 6-6 6-1.4-1.4 4.6-4.6z"/></svg>
	</button>
	<?php endif; ?>

	<?php if ( $gr_nav_enabled ) : ?>
	</div>
	<?php endif; ?>

	<?php if ( $gr_nav_enabled && $show_dots ) : ?>
	<div class="sgs-google-reviews__dots" role="tablist" aria-label="<?php esc_attr_e( 'Review pagination', 'sgs-blocks' ); ?>">
		<?php foreach ( $reviews as $gr_dot_idx => $gr_dot_review ) : ?>
			<button
				class="sgs-google-reviews__dot<?php echo 0 === $gr_dot_idx ? ' is-active' : ''; ?>"
				type="button"
				role="tab"
				<?php echo 0 === $gr_dot_idx ? 'aria-current="true"' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- literal string, no dynamic value. ?>
				aria-selected="<?php echo 0 === $gr_dot_idx ? 'true' : 'false'; ?>"
				data-sgs-index="<?php echo esc_attr( $gr_dot_idx ); ?>"
				data-wp-on--click="actions.goToSlide"
				aria-label="
				<?php
				/* translators: %d: review number (1-indexed). */
				echo esc_attr( sprintf( __( 'Go to review %d', 'sgs-blocks' ), $gr_dot_idx + 1 ) );
				?>
				"
			></button>
		<?php endforeach; ?>
	</div>
	<?php endif; ?>

	<?php if ( ! empty( $review_request_url ) ) : ?>
		<div class="sgs-google-reviews__cta">
			<a href="<?php echo esc_url( $review_request_url ); ?>" class="sgs-google-reviews__write-review" target="_blank" rel="noopener">
				<?php esc_html_e( 'Write a Review', 'sgs-blocks' ); ?>
			</a>
		</div>
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
		$gr_responsive_css .= $gr_root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$gr_responsive_css .= sgs_border_gradient_css( $gr_root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$gr_responsive_css .= $gr_root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$gr_responsive_css .= $gr_root_sel . '{border-style:none;border-width:0;}';
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
		array( 'selector' => $gr_root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$gr_responsive_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $gr_root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$gr_responsive_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $gr_root_sel )
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
