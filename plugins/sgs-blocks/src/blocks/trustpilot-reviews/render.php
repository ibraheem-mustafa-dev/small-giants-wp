<?php
/**
 * Trustpilot Reviews — Server-rendered output for sgs/trustpilot-reviews.
 *
 * Renders a Trustpilot-styled reviews block. Data source can be inline
 * (reviews array in block attributes), synced (read from wp_options
 * 'sgs_trustpilot_data', populated by the sync mechanism in a future
 * release), or placeholder demo content for editor previews.
 *
 * WS-4: OUTER wrapper is now rendered by SGS_Container_Wrapper (kind='layout').
 * Carries block-specific classes + styles + data-* attrs via opts.
 *
 * Helpers (score-to-label mapping, asset URLs, relative dates) live in
 * includes/trustpilot-helpers.php — kept outside the render template so
 * multiple block instances on the same page do not redeclare functions.
 *
 * @package SGS\Blocks
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Block content.
 * @var \WP_Block $block      Block instance.
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// CSS length/unit sanitiser — for free-text attrs concatenated into raw CSS
// declarations inside this block's scoped <style> tag. Mirrors sgs/hero.
// CSS-keyword sanitiser — for free-text attrs (border-style) concatenated
// into raw CSS declarations — letters + hyphen only. Mirrors sgs/hero.
// ───────────────────────────────────────────────────────────────────────────
// Attribute resolution
// ───────────────────────────────────────────────────────────────────────────

$variant            = isset( $attributes['variant'] ) ? $attributes['variant'] : 'carousel';
// Card-title heading level — an out-of-enum stored value is otherwise
// silently coerced to the block.json default (blockjson-enum-coerces-
// invalid-to-default), so it is validated here too (mirrors sgs/icon-list).
$allowed_heading_levels = array( 'h2', 'h3', 'h4', 'h5', 'h6', 'p' );
$heading_level      = in_array( $attributes['headingLevel'] ?? '', $allowed_heading_levels, true )
	? $attributes['headingLevel']
	: 'h3';
$data_source        = isset( $attributes['dataSource'] ) ? sanitize_key( $attributes['dataSource'] ) : 'synced';
$empty_state        = isset( $attributes['emptyState'] ) ? $attributes['emptyState'] : 'hide';
$business_url       = isset( $attributes['businessUnitUrl'] ) ? $attributes['businessUnitUrl'] : '';
$reviews_attr       = isset( $attributes['reviews'] ) ? $attributes['reviews'] : array();
$trust_score        = isset( $attributes['trustScore'] ) ? floatval( $attributes['trustScore'] ) : 0.0;
$trust_score_label  = isset( $attributes['trustScoreLabel'] ) ? $attributes['trustScoreLabel'] : '';
$total_reviews      = isset( $attributes['totalReviews'] ) ? intval( $attributes['totalReviews'] ) : 0;
$reviews_average    = isset( $attributes['reviewsAverage'] ) ? floatval( $attributes['reviewsAverage'] ) : 0.0;
$show_source_header = isset( $attributes['showSourceHeader'] ) ? (bool) $attributes['showSourceHeader'] : true;
$show_subtitle      = isset( $attributes['showSubtitle'] ) ? (bool) $attributes['showSubtitle'] : false;
$subtitle_text      = isset( $attributes['subtitleText'] ) ? $attributes['subtitleText'] : 'Showing our latest reviews';
$show_logo          = isset( $attributes['showTrustpilotLogo'] ) ? (bool) $attributes['showTrustpilotLogo'] : true;
$show_verified      = isset( $attributes['showVerifiedBadge'] ) ? (bool) $attributes['showVerifiedBadge'] : true;
$show_date          = isset( $attributes['showDate'] ) ? (bool) $attributes['showDate'] : true;
$show_author        = isset( $attributes['showAuthor'] ) ? (bool) $attributes['showAuthor'] : true;
$show_schema        = isset( $attributes['showSchema'] ) ? (bool) $attributes['showSchema'] : true;
// `columns` is a TIER OBJECT (Spec 35 pass 4, 2026-08-11) — read each tier via
// the normaliser, never the raw attribute (intval() on an unresolved array
// throws "Array to int conversion", the D569/D570 bug class this normaliser
// exists to prevent).
$columns_obj        = sgs_responsive_normalise_object( $attributes['columns'] ?? null );
$columns            = intval( $columns_obj['desktop'] ?? 3 );
$columns_tablet     = intval( $columns_obj['tablet'] ?? 2 );
$columns_mobile     = intval( $columns_obj['mobile'] ?? 1 );
$theme              = isset( $attributes['theme'] ) ? $attributes['theme'] : 'light';
$card_style         = isset( $attributes['cardStyle'] ) ? $attributes['cardStyle'] : 'elevated';
$autoplay           = isset( $attributes['autoplay'] ) ? (bool) $attributes['autoplay'] : false;
$autoplay_speed     = isset( $attributes['autoplaySpeed'] ) ? intval( $attributes['autoplaySpeed'] ) : 5000;
$show_dots          = isset( $attributes['showDots'] ) ? (bool) $attributes['showDots'] : false;
$show_arrows        = isset( $attributes['showArrows'] ) ? (bool) $attributes['showArrows'] : true;

// DMCC FR-30-10: whitelist the data source. Any unsanitised / invalid / REST-injected
// value must NEVER fall through to fake demo reviews — coerce it to the safe synced
// (empty-state) path, which renders genuine data or nothing, never placeholders.
if ( ! in_array( $data_source, array( 'synced', 'inline', 'placeholder' ), true ) ) {
	$data_source = 'synced';
}

// ───────────────────────────────────────────────────────────────────────────
// Data source resolution
// ───────────────────────────────────────────────────────────────────────────

// Placeholder reviews used in editor preview and when no data configured.
// These mirror Trustpilot's own demo content so previews look authentic.
$placeholder_reviews = array(
	array(
		'author'        => 'Steve',
		'rating'        => 5,
		'datePublished' => gmdate( 'c', strtotime( '-2 minutes' ) ),
		'reviewBody'    => 'Never had a better experience than with this awesome company.',
		'title'         => 'THIS WAS AWESOME!',
		'isVerified'    => true,
	),
	array(
		'author'        => 'Thomas',
		'rating'        => 4,
		'datePublished' => gmdate( 'c', strtotime( '-3 hours' ) ),
		'reviewBody'    => 'The product was so nice, easy to use, would recommend.',
		'title'         => 'Really liked it',
		'isVerified'    => true,
	),
	array(
		'author'        => 'Wendy',
		'rating'        => 5,
		'datePublished' => gmdate( 'c', strtotime( '-4 days' ) ),
		'reviewBody'    => 'Five stars all the way. Great service, fast delivery, lovely team.',
		'title'         => '',
		'isVerified'    => true,
	),
	array(
		'author'        => 'April',
		'rating'        => 5,
		'datePublished' => gmdate( 'c', strtotime( '-5 hours' ) ),
		'reviewBody'    => 'Nothing broke on the way, and it arrived on time.',
		'title'         => 'I guess it\'s fine',
		'isVerified'    => true,
	),
);

$reviews         = array();
$synced_is_empty = false; // True when dataSource=synced but no live data is available.

if ( 'synced' === $data_source ) {
	$synced = get_option( 'sgs_trustpilot_data', null );
	if ( is_array( $synced ) && ! empty( $synced['reviews'] ) ) {
		$reviews = $synced['reviews'];
		if ( 0.0 === $trust_score ) {
			$trust_score = floatval( isset( $synced['trust_score'] ) ? $synced['trust_score'] : 0 );
		}
		if ( '' === $trust_score_label ) {
			$trust_score_label = isset( $synced['trust_score_label'] ) ? $synced['trust_score_label'] : '';
		}
		if ( 0 === $total_reviews ) {
			$total_reviews = intval( isset( $synced['review_count'] ) ? $synced['review_count'] : count( $reviews ) );
		}
		if ( 0.0 === $reviews_average ) {
			$reviews_average = floatval( isset( $synced['reviews_average'] ) ? $synced['reviews_average'] : 0 );
		}
		if ( '' === $business_url ) {
			$business_url = isset( $synced['source_url'] ) ? $synced['source_url'] : '';
		}
	} else {
		// No live sync data — never render placeholder reviews on the frontend (DMCC compliance).
		$synced_is_empty = true;
	}
} elseif ( 'inline' === $data_source && ! empty( $reviews_attr ) ) {
	$reviews = $reviews_attr;
} elseif ( 'placeholder' === $data_source ) {
	// Placeholder is for editor preview / explicit operator demo only. This is the
	// ONLY path that may render demo data, and only via an explicit dataSource choice.
	$reviews = $placeholder_reviews;
} else {
	// DMCC FR-30-10: any other case (e.g. inline with no reviews) renders nothing —
	// never placeholder/fake reviews on a live frontend.
	$reviews = array();
}

// ───────────────────────────────────────────────────────────────────────────
// Empty-state handling (DMCC FR-30-10): when synced source has no live data,
// render the operator-chosen empty state and return early — never a broken gap.
// ───────────────────────────────────────────────────────────────────────────

if ( $synced_is_empty ) {
	if ( 'coming-soon' === $empty_state ) {
		$wrapper_attrs = get_block_wrapper_attributes( array( 'class' => 'sgs-trustpilot-reviews sgs-trustpilot-reviews--empty-state' ) );
		printf(
			'<div %s><p class="sgs-trustpilot-reviews__coming-soon">%s</p></div>',
			$wrapper_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes returns escaped attribute string.
			esc_html__( 'Reviews coming soon', 'sgs-blocks' )
		);
	}
	// emptyState=hide: output nothing — no gap, no layout break.
	return;
}

// Auto-derive aggregates when missing.
if ( 0 === $total_reviews ) {
	$total_reviews = count( $reviews );
}
if ( 0.0 === $reviews_average && ! empty( $reviews ) ) {
	$sum = 0.0;
	foreach ( $reviews as $r ) {
		$sum += floatval( isset( $r['rating'] ) ? $r['rating'] : 0 );
	}
	$reviews_average = $total_reviews > 0 ? round( $sum / $total_reviews, 1 ) : 0.0;
}
if ( 0.0 === $trust_score ) {
	$trust_score = $reviews_average;
}
if ( '' === $trust_score_label ) {
	$trust_score_label = sgs_trustpilot_score_label( $trust_score );
}

// ───────────────────────────────────────────────────────────────────────────
// Wrapper: own classes, styles, and data-* attrs for the shared helper.
// ───────────────────────────────────────────────────────────────────────────

// Unique ID for responsive/no-inline CSS scoping — mirrors sgs/hero (CLASS,
// not the anchor id).
$tp_uid      = 'sgs-trustpilot-reviews-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$tp_root_sel = '.' . $tp_uid . '.wp-block-sgs-trustpilot-reviews';

$tp_extra_classes = array(
	'sgs-trustpilot-reviews',
	'sgs-trustpilot-reviews--' . sanitize_html_class( $variant ),
	'sgs-trustpilot-reviews--theme-' . sanitize_html_class( $theme ),
	'sgs-trustpilot-reviews--card-' . sanitize_html_class( $card_style ),
	$tp_uid,
);

// Skip-serialised `color` support also stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add
// them manually (mirrors sgs/hero, sgs/quote) so preset palette colours
// still resolve visually.
$tp_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$tp_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $tp_preset_text_slug ) {
	$tp_extra_classes[] = 'has-text-color';
	$tp_extra_classes[] = 'has-' . $tp_preset_text_slug . '-color';
}
if ( '' !== $tp_preset_bg_slug ) {
	$tp_extra_classes[] = 'has-background';
	$tp_extra_classes[] = 'has-' . $tp_preset_bg_slug . '-background-color';
}

// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// Read the resolved values from $attributes['style'] here and emit them into
// this block's OWN scoped <style> (composite caveat: do NOT pass these as
// wrapper `extra_styles` — that path inlines). This block declares no
// spacing/typography supports, so only color + border are re-emitted here.
$tp_responsive_css = '';


// ⚠ EVERY value goes through sgs_colour_value() before the style engine
// (D684). DesignTokenPicker stores a token SLUG ('primary') when a palette
// swatch is picked with linked:true. wp_style_engine_get_styles() neither
// resolves nor rejects a bare slug — it emits the literal `color:primary;`,
// invalid CSS the browser drops, so the client's chosen text colour silently
// does nothing (proven live on the canary). sgs_colour_value() maps a slug to
// var(--wp--preset--color--…), passes a raw hex through unchanged, and
// rejects a declaration breakout. Mirrors sgs/site-header-row.
// D-pending (2026-09-03) — textColourGradient is the sibling gradient attr;
// the gradient wins when set+valid. The style engine cannot emit a
// background-clip:text declaration, so once a gradient is present this
// bypasses wp_style_engine_get_styles() entirely and emits via the shared
// text-colour-or-gradient helpers instead (mirrors sgs/counter).
$tp_text_colour          = (string) ( $attributes['textColour'] ?? '' );
$tp_text_colour_gradient = (string) ( $attributes['textColourGradient'] ?? '' );
$tp_text_colour_effective = sgs_resolve_text_colour_or_gradient( $tp_text_colour, $tp_text_colour_gradient );
if ( '' !== $tp_text_colour_effective ) {
	$tp_text_colour_decl = sgs_text_colour_decl( $tp_text_colour_effective );
	if ( '' !== $tp_text_colour_decl ) {
		$tp_responsive_css .= "{$tp_root_sel}{{$tp_text_colour_decl};}";
	}
	$tp_responsive_css .= sgs_text_colour_gradient_fallback_rule( $tp_root_sel, $tp_text_colour_effective );
}

// Background (colour + gradient, resting + hover) is owned by the shared fill
// emitter, NOT by the style engine and NOT by supports.color.gradients.
//
// supports.color.gradients was `true` here, so CORE rendered its own gradient
// panel in the Styles tab, competing with the SGS colour panel — the client saw
// two and could not tell which won. Switching the flag off alone would have
// REMOVED the only gradient control this block had, because the sole gradient
// read was $attributes['style']['color']['gradient'] (core's own storage). The
// flag flip is therefore PAIRED with a block-private backgroundColourGradient
// exposed through fillRow(), so capability is moved rather than lost.
$tp_fill_css = sgs_fill_states_css(
	$tp_root_sel,
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
if ( '' !== $tp_fill_css ) {
	$tp_responsive_css .= $tp_fill_css;
}

// (native border_args removed by the Shape-B migration -- width/style/colour
//  are block-private attrs now, emitted below)

// The native style-engine colour path is GONE, deliberately. Text colour now
// renders through sgs_resolve_text_colour_or_gradient() + sgs_text_colour_decl()
// above, because wp_style_engine_get_styles()'s color.text input cannot carry a
// gradient (background-clip:text is not a colour value). The border half was
// already removed by the Shape-B migration, so nothing was left to feed the
// engine and its guards were provably dead -- check-render-undefined-vars
// caught them as always-falsy. Do not reinstate: an empty args array emits no
// CSS, so this was dead code, not a safety net.

$tp_extra_styles = array(
	sprintf(
		'--sgs-tp-cols:%d;--sgs-tp-cols-tablet:%d;--sgs-tp-cols-mobile:%d',
		max( 1, $columns ),
		max( 1, $columns_tablet ),
		max( 1, $columns_mobile )
	),
);

// data-* attrs consumed by view.js for carousel + autoplay behaviour.
// Must be carried via extra_attrs so the vanilla-JS carousel selectors work.
$tp_extra_attrs = array(
	'data-autoplay'       => $autoplay ? 'true' : 'false',
	'data-autoplay-speed' => $autoplay_speed,
	'data-variant'        => esc_attr( $variant ),
);

$tp_wrapper_opts = array(
	'tag'           => 'div',
	'extra_classes' => $tp_extra_classes,
	'extra_styles'  => $tp_extra_styles,
	'extra_attrs'   => $tp_extra_attrs,
);

// ───────────────────────────────────────────────────────────────────────────
// Brand asset URLs
// ───────────────────────────────────────────────────────────────────────────

$logo_filename = ( 'dark' === $theme ) ? 'logo-white.svg' : 'logo-black.svg';
$logo_url      = sgs_trustpilot_asset_url( $logo_filename );
$shield_url    = sgs_trustpilot_asset_url( 'trustpilot-shield.svg' );

$is_carousel = ( 'carousel' === $variant || 'mini-carousel' === $variant );

/*
 * Draggable + Inertia roster opt-in (Spec 38 FR-38-13), mirroring sgs/gallery.
 *
 * Emitted on `.sgs-trustpilot-reviews__track` — the element that actually
 * scrolls (style.css: the `--carousel` / `--mini-carousel` track is the
 * `overflow-x: auto` + `scroll-snap-type: x mandatory` flex row), NOT the block
 * root, which never scrolls. Carousel variants only: the grid/list/mini
 * variants render the same track as a plain CSS grid with nothing to
 * drag-scroll. The shared runtime (shared/effects/gsap/fx-draggable.js)
 * structurally re-verifies the element is a genuine native horizontal scroller
 * before touching it, so this stays safe if the variant CSS ever changes.
 */
$sgs_tp_drag_to_scroll = (bool) ( $attributes['dragToScroll'] ?? false );
$sgs_tp_drag_momentum  = (bool) ( $attributes['dragMomentum'] ?? true );

// Infinite loop (Spec 38 §11 loop FR), mirroring sgs/gallery. A SEPARATE
// marker from `data-sgs-fx="draggable"` above — Bean's ruling that looping
// is an independent control, not a value of the shared `fx` grammar, and
// both can be present on the SAME element at once. `shared/effects/
// fx-carousel-loop.js` reads this; it never touches `gsap/fx-draggable.js`.
$sgs_tp_loop_carousel = (bool) ( $attributes['loopCarousel'] ?? false );

$sgs_tp_track_fx_attr = '';
if ( $is_carousel && $sgs_tp_drag_to_scroll ) {
	$sgs_tp_track_fx_attr = ' data-sgs-fx="draggable"';
	if ( ! $sgs_tp_drag_momentum ) {
		$sgs_tp_track_fx_attr .= ' data-sgs-fx-momentum="false"';
	}
}
if ( $is_carousel && $sgs_tp_loop_carousel ) {
	$sgs_tp_track_fx_attr .= ' data-sgs-loop="1"';
}

// ───────────────────────────────────────────────────────────────────────────
// Build interior HTML
// ───────────────────────────────────────────────────────────────────────────

ob_start();

if ( $show_source_header ) :
	?>
	<div class="sgs-trustpilot-reviews__header">
		<?php if ( '' !== $trust_score_label ) : ?>
			<span class="sgs-trustpilot-reviews__label"><?php echo esc_html( $trust_score_label ); ?></span>
		<?php endif; ?>

		<img
			class="sgs-trustpilot-reviews__header-stars"
			src="<?php echo esc_url( sgs_trustpilot_stars_url( $trust_score ) ); ?>"
			alt="
			<?php
			/* translators: %s = trust score, e.g. "4.0 out of 5 stars" */
			echo esc_attr( sprintf( __( '%s out of 5 stars', 'sgs-blocks' ), number_format( $trust_score, 1 ) ) );
			?>
			"
			width="125"
			height="24"
			loading="eager"
		/>

		<span class="sgs-trustpilot-reviews__aggregate">
			<?php
			/* translators: %s = trust score, e.g. "4.0" */
			printf( esc_html__( 'Rated %s / 5 based on ', 'sgs-blocks' ), esc_html( number_format( $trust_score, 1 ) ) );

			if ( '' !== $business_url ) {
				printf(
					'<a class="sgs-trustpilot-reviews__count-link" href="%s" target="_blank" rel="noopener nofollow">%s</a>',
					esc_url( $business_url ),
					/* translators: %d = number of reviews */
					esc_html( sprintf( _n( '%d review', '%d reviews', $total_reviews, 'sgs-blocks' ), $total_reviews ) )
				);
			} else {
				/* translators: %d = number of reviews */
				echo esc_html( sprintf( _n( '%d review', '%d reviews', $total_reviews, 'sgs-blocks' ), $total_reviews ) );
			}

			if ( $show_logo ) :
				?>
				<span class="sgs-trustpilot-reviews__on"><?php esc_html_e( ' on ', 'sgs-blocks' ); ?></span>
				<?php if ( '' !== $business_url ) : ?>
					<a class="sgs-trustpilot-reviews__header-logo-link" href="<?php echo esc_url( $business_url ); ?>" target="_blank" rel="noopener nofollow" aria-label="<?php esc_attr_e( 'Read reviews on Trustpilot (opens in new tab)', 'sgs-blocks' ); ?>">
						<img
							class="sgs-trustpilot-reviews__header-logo"
							src="<?php echo esc_url( $logo_url ); ?>"
							alt="Trustpilot"
							width="93"
							height="22"
							loading="eager"
						/>
					</a>
				<?php else : ?>
					<img
						class="sgs-trustpilot-reviews__header-logo"
						src="<?php echo esc_url( $logo_url ); ?>"
						alt="Trustpilot"
						width="93"
						height="22"
						loading="eager"
					/>
				<?php endif; ?>
				<?php
			endif;
			?>
		</span>
	</div>
	<?php
endif;

if ( $show_subtitle && '' !== $subtitle_text ) :
	?>
	<p class="sgs-trustpilot-reviews__subtitle"><?php echo esc_html( $subtitle_text ); ?></p>
	<?php
endif;
?>

<div class="sgs-trustpilot-reviews__viewport">

	<?php if ( $is_carousel && $show_arrows ) : ?>
		<button class="sgs-trustpilot-reviews__arrow sgs-trustpilot-reviews__arrow--prev" type="button" aria-label="<?php esc_attr_e( 'Previous review', 'sgs-blocks' ); ?>">
			<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4-4.6-4.6z"/></svg>
		</button>
	<?php endif; ?>

	<div
		class="sgs-trustpilot-reviews__track"
		tabindex="0"
		role="group"
		aria-label="<?php esc_attr_e( 'Customer reviews', 'sgs-blocks' ); ?>"
		<?php echo $sgs_tp_track_fx_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built entirely from literal strings, no dynamic value. ?>
	>
		<?php
		foreach ( $reviews as $idx => $r ) :
			$rating       = floatval( isset( $r['rating'] ) ? $r['rating'] : 0 );
			$author       = isset( $r['author'] ) ? $r['author'] : '';
			$date         = isset( $r['datePublished'] ) ? $r['datePublished'] : '';
			$body         = isset( $r['reviewBody'] ) ? $r['reviewBody'] : '';
			$review_title = isset( $r['title'] ) ? $r['title'] : '';
			$is_verified  = isset( $r['isVerified'] ) ? (bool) $r['isVerified'] : true;
			?>
			<article class="sgs-trustpilot-reviews__card" data-index="<?php echo esc_attr( $idx ); ?>">

				<header class="sgs-trustpilot-reviews__card-header">
					<img
						class="sgs-trustpilot-reviews__card-stars"
						src="<?php echo esc_url( sgs_trustpilot_stars_url( $rating ) ); ?>"
						alt="
						<?php
						/* translators: %d = star rating 1-5 */
						echo esc_attr( sprintf( __( '%d out of 5 stars', 'sgs-blocks' ), (int) $rating ) );
						?>
						"
						width="125"
						height="24"
						loading="lazy"
					/>

					<?php if ( $show_verified && $is_verified ) : ?>
						<span class="sgs-trustpilot-reviews__verified">
							<img
								class="sgs-trustpilot-reviews__verified-icon"
								src="<?php echo esc_url( $shield_url ); ?>"
								alt=""
								width="16"
								height="16"
								loading="lazy"
							/>
							<span class="sgs-trustpilot-reviews__verified-text"><?php esc_html_e( 'Verified', 'sgs-blocks' ); ?></span>
						</span>
					<?php endif; ?>
				</header>

				<?php if ( '' !== $review_title ) : ?>
					<<?php echo esc_attr( $heading_level ); ?> class="sgs-trustpilot-reviews__card-title"><?php echo esc_html( $review_title ); ?></<?php echo esc_attr( $heading_level ); ?>>
				<?php endif; ?>

				<div class="sgs-trustpilot-reviews__card-body"><?php echo wp_kses_post( wpautop( $body ) ); ?></div>

				<?php if ( $show_author || $show_date ) : ?>
					<footer class="sgs-trustpilot-reviews__card-meta">
						<?php if ( $show_author && '' !== $author ) : ?>
							<span class="sgs-trustpilot-reviews__card-author"><?php echo esc_html( $author ); ?></span>
						<?php endif; ?>

						<?php if ( $show_date && '' !== $date ) : ?>
							<?php if ( $show_author && '' !== $author ) : ?>
								<span class="sgs-trustpilot-reviews__card-sep">, </span>
							<?php endif; ?>
							<time class="sgs-trustpilot-reviews__card-date" datetime="<?php echo esc_attr( $date ); ?>">
								<?php echo esc_html( sgs_trustpilot_relative_date( $date ) ); ?>
							</time>
						<?php endif; ?>
					</footer>
				<?php endif; ?>
			</article>
			<?php
		endforeach;
		?>
	</div>

	<?php if ( $is_carousel && $show_arrows ) : ?>
		<button class="sgs-trustpilot-reviews__arrow sgs-trustpilot-reviews__arrow--next" type="button" aria-label="<?php esc_attr_e( 'Next review', 'sgs-blocks' ); ?>">
			<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M8.6 7.4 10 6l6 6-6 6-1.4-1.4 4.6-4.6z"/></svg>
		</button>
	<?php endif; ?>

</div>

<?php if ( $is_carousel && $show_dots && count( $reviews ) > 1 ) : ?>
	<div class="sgs-trustpilot-reviews__dots" role="tablist" aria-label="<?php esc_attr_e( 'Review pagination', 'sgs-blocks' ); ?>">
		<?php foreach ( $reviews as $idx => $r ) : ?>
			<button
				class="sgs-trustpilot-reviews__dot<?php echo 0 === $idx ? ' is-active' : ''; ?>"
				type="button"
				role="tab"
				aria-selected="<?php echo 0 === $idx ? 'true' : 'false'; ?>"
				data-index="<?php echo esc_attr( $idx ); ?>"
				aria-label="
				<?php
				/* translators: %d = review index */
				echo esc_attr( sprintf( __( 'Go to review %d', 'sgs-blocks' ), $idx + 1 ) );
				?>
				"
			></button>
		<?php endforeach; ?>
	</div>
	<?php
endif;

$inner_html = ob_get_clean();

// ───────────────────────────────────────────────────────────────────────────
// Schema.org JSON-LD (appended after the wrapper)
// ───────────────────────────────────────────────────────────────────────────

$schema_html = '';
if ( $show_schema && ! empty( $reviews ) ) {
	$schema_reviews = array();
	foreach ( $reviews as $r ) {
		$schema_reviews[] = array(
			'@type'         => 'Review',
			'author'        => array(
				'@type' => 'Person',
				'name'  => isset( $r['author'] ) ? $r['author'] : '',
			),
			'datePublished' => isset( $r['datePublished'] ) ? $r['datePublished'] : '',
			'reviewRating'  => array(
				'@type'       => 'Rating',
				'ratingValue' => floatval( isset( $r['rating'] ) ? $r['rating'] : 0 ),
				'bestRating'  => 5,
				'worstRating' => 1,
			),
			'reviewBody'    => isset( $r['reviewBody'] ) ? $r['reviewBody'] : '',
		);
	}

	$schema = array(
		'@context'        => 'https://schema.org',
		'@type'           => 'Organization',
		'name'            => get_bloginfo( 'name' ),
		'aggregateRating' => array(
			'@type'       => 'AggregateRating',
			'ratingValue' => $reviews_average > 0 ? $reviews_average : $trust_score,
			'reviewCount' => $total_reviews,
			'bestRating'  => 5,
			'worstRating' => 1,
		),
		'review'          => $schema_reviews,
	);

	// One shared encoder (FR-30-9): JSON_UNESCAPED_SLASHES disabled PHP's default
	// `\/` guard with no JSON_HEX_TAG to replace it, so a `</script>` in a synced
	// review body or author name could close this tag — and these values arrive from
	// a THIRD-PARTY feed (Trustpilot), not an operator field. Sgs_Schema adds
	// JSON_HEX_TAG. script_tag() also returns '' on encode failure.
	$schema_html = \SGS\Blocks\Sgs_Schema::script_tag( $schema );
}

// ───────────────────────────────────────────────────────────────────────────
// Output: schema JSON-LD, then this block's own scoped <style> (no-inline
// contract §A/§D — wp_strip_all_tags, NOT esc_html, blocks a </style>
// breakout while leaving CSS combinators intact; every value reaching

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
		$tp_responsive_css .= $tp_root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$tp_responsive_css .= sgs_border_gradient_css( $tp_root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$tp_responsive_css .= $tp_root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$tp_responsive_css .= $tp_root_sel . '{border-style:none;border-width:0;}';
}

// ── Block-private border-radius (radius is no longer native -- Shape B now
// covers all four legs). Same wp_style_engine_get_styles() route already
// proven live by sgs/media + sgs/before-after's borderRadiusTablet/Mobile
// tiers; base now goes through the identical call instead of WP's native
// serialisation. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (`.=` for a string accumulator, `[] =` for an array one). ──
$radius_tiers = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $tp_root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$tp_responsive_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $tp_root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$tp_responsive_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $tp_root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$tp_responsive_css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// $tp_responsive_css is pre-sanitised via sgs_css_length_value() / sgs_css_keyword_sanitise()
// / wp_style_engine_get_styles), then the outer wrapper via the shared helper.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// ───────────────────────────────────────────────────────────────────────────
echo $schema_html;
if ( $tp_responsive_css ) {
	printf( '<style id="%s">%s</style>', esc_attr( $tp_uid ), wp_strip_all_tags( $tp_responsive_css ) );
}
echo SGS_Container_Wrapper::render( $attributes, $block, $inner_html, 'layout', $tp_wrapper_opts );
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
