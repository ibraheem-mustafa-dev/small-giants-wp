<?php
/**
 * Server-side render for the SGS Star Rating block.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
 * --check. Star fill/size/gap are SVG/markup attributes (width/height/fill
 * on <svg>), not CSS `style=` declarations, so they are left untouched —
 * content-KIND composite, block-private (D294).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$rating                = (float) ( $attributes['rating'] ?? 5 );
$max_rating            = (int) ( $attributes['maxRating'] ?? 5 );
$star_size             = (int) ( $attributes['starSize'] ?? 24 );
$star_colour_slug      = (string) ( $attributes['starColour'] ?? 'accent' );
$star_colour           = sgs_colour_value( $star_colour_slug );
$empty_colour          = sgs_colour_value( $attributes['emptyColour'] ?? 'border' );
$star_colour_gradient  = (string) ( $attributes['starColourGradient'] ?? '' );
$empty_colour_gradient = (string) ( $attributes['emptyColourGradient'] ?? '' );
$label                 = $attributes['label'] ?? '';
$show_numeric          = $attributes['showNumeric'] ?? false;
$schema_enabled        = $attributes['schemaEnabled'] ?? true;
$schema_item_name      = $attributes['schemaItemName'] ?? '';
$schema_review_count   = (int) ( $attributes['schemaReviewCount'] ?? 1 );

// displayMode: stars-only | stars-with-value | stars-with-value-and-count
$allowed_display_modes = array( 'stars-only', 'stars-with-value', 'stars-with-value-and-count' );
$display_mode          = in_array( $attributes['displayMode'] ?? 'stars-only', $allowed_display_modes, true )
	? $attributes['displayMode']
	: 'stars-only';

/*
 * Block-style presets (2026-06-03). Exact-match the is-style-* class so
 * 'trustpilot' is not a false substring of 'trustpilot-official'.
 *   is-style-trustpilot-official : Trustpilot's own tile-star SVG badge.
 *   is-style-trustpilot          : inline SVG stars forced to Trustpilot green.
 *   default / any other style    : inline SVG stars in the configured starColour.
 */
$style_classes  = preg_split( '/\s+/', (string) ( $attributes['className'] ?? '' ), -1, PREG_SPLIT_NO_EMPTY );
$is_tp_official = in_array( 'is-style-trustpilot-official', $style_classes, true );
$is_tp_flat     = in_array( 'is-style-trustpilot', $style_classes, true ) && ! $is_tp_official;
if ( $is_tp_flat && 'accent' === $star_colour_slug ) {
	// Trustpilot brand green is the flat preset's DEFAULT, not an override. Before
	// this guard the assignment was unconditional and silently discarded the client's
	// choice: the control existed, they picked a colour, and nothing happened — the
	// dead-control defect (D751). A hardcoded value that overrides a faithfully-set
	// attribute is a cheat to gate, not a constant to preserve (CLAUDE.md 2026-06-16).
	//
	// Gated on the DECLARED DEFAULT, not on isset(): WP_Block_Type::
	// prepare_attributes_for_render() populates every missing attribute from its
	// block.json default BEFORE render_callback runs, so isset() is ALWAYS true here
	// and an isset() guard would silently disable the preset entirely. Verified
	// against the WordPress reference, not assumed.
	//
	// KNOWN LIMIT, stated rather than hidden: a client who explicitly re-picks
	// 'accent' on this style still gets green. WordPress does not record whether a
	// value was chosen or defaulted, so the two are indistinguishable by construction.
	$star_colour = '#00B67A';
}

// ---------------------------------------------------------------------------
// No-inline: box-object interface contract §1 sanitiser + box shorthand
// builder (mirrors sgs/heading + sgs/button + sgs/container).
// ---------------------------------------------------------------------------

// Base padding/margin — WP-native style.spacing.* objects (skip-serialised).
$base_padding_obj = array();
if ( isset( $attributes['padding'] ) && is_array( $attributes['padding'] ) ) {
	foreach ( $attributes['padding'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_padding_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_margin_obj = array();
if ( isset( $attributes['margin'] ) && is_array( $attributes['margin'] ) ) {
	foreach ( $attributes['margin'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_margin_obj[ $spacing_side ] = $spacing_value;
		}
	}
}

// Responsive spacing tiers — SGS object attrs { top, right, bottom, left }.
$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// WP `color` support values (skip-serialised in block.json → NOT auto-inlined).
// Custom hex/rgb → emitted scoped via the style engine; preset SLUGS → the
// standard has-* classes re-added manually below.
$style_color_text = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg   = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// ---------------------------------------------------------------------------
// Scoped CSS assembly. Root selector uses a CLASS (not the wrapper's `id`,
// which stays free for the block's `anchor` support / ToC targets).
// ---------------------------------------------------------------------------

$uid      = 'sgs-str-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-star-rating';

$scoped_css = array();

// --- Star/empty-star fill gradient (D636/D644 rollout) — reuses the shared
// SVG stroke-gradient primitive, targeting `fill` since these are fill-based
// SVG shapes, not stroke-based icon glyphs. Each full/empty star is its own
// separate <svg> (no shared class from the browser's point of view until we
// add one below), so a gradient painted via `fill:url(#id)` CSS needs (a) a
// `<defs>` present ONCE anywhere in the document — `url(#id)` resolves
// document-wide — and (b) a CSS class on the fill-carrying <path> for the
// rule to target, since the flat `fill="…"` presentation attribute has no
// class to select otherwise. Presentation attribute stays as the no-JS/
// invalid-gradient fallback; CSS `fill:` always wins over it regardless of
// specificity (SVG2 cascade rule), same mechanism sgs_svg_stroke_gradient()
// already documents for stroke-based icons. ---
$star_fill_grad  = sgs_svg_stroke_gradient( $star_colour_gradient, $uid . '-star-grad', 'fill' );
$empty_fill_grad = sgs_svg_stroke_gradient( $empty_colour_gradient, $uid . '-empty-grad', 'fill' );

if ( '' !== $star_fill_grad['css'] ) {
	$scoped_css[] = "{$root_sel} .sgs-star-rating__star--full{" . $star_fill_grad['css'] . ';}';
}
if ( '' !== $empty_fill_grad['css'] ) {
	$scoped_css[] = "{$root_sel} .sgs-star-rating__star--empty{" . $empty_fill_grad['css'] . ';}';
}

// --- Base spacing + colour — skip-serialised, emitted scoped via the core
// style engine (exactly how WP core outputs `layout` support). ---

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

$color_args = array();
if ( '' !== $style_color_text ) {
	$color_args['text'] = $style_color_text;
}
if ( '' !== $style_color_bg ) {
	$color_args['background'] = $style_color_bg;
}
if ( ! empty( $color_args ) ) {
	$base_style_engine_args['color'] = $color_args;
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

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the same root selector (contract §B2: tablet
// max-width:1023px, mobile max-width:767px). ---
$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );

$tablet_box_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_box_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_box_decls[] = "margin:{$margin_tab_val}";
}
if ( $tablet_box_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_box_decls ) . ';}}';
}

$mobile_box_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_box_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_box_decls[] = "margin:{$margin_mob_val}";
}
if ( $mobile_box_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_box_decls ) . ';}}';
}

// ---------------------------------------------------------------------------
// Root element classes + attributes. NO 'style' key is passed — the root
// carries ZERO inline property declarations; everything above is in the
// scoped <style> tag emitted below.
// ---------------------------------------------------------------------------

$root_classes = array( 'sgs-star-rating', 'sgs-star-rating--' . esc_attr( $display_mode ), $uid );

if ( '' !== $preset_text_slug ) {
	$root_classes[] = 'has-text-color';
	$root_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$root_classes[] = 'has-background';
	$root_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $root_classes ),
	)
);

// Build the stars markup.
$stars_html = '';
$unique_id  = wp_unique_id( 'sgs-star-' );

if ( $is_tp_official ) {
	// Official Trustpilot badge: their own tile-star SVG for the (rounded) rating.
	require_once dirname( __DIR__, 3 ) . '/includes/trustpilot-helpers.php';
	$stars_html = sprintf(
		'<img class="sgs-star-rating__tp-badge" src="%s" alt="" width="125" height="24" loading="lazy" decoding="async" />',
		esc_url( sgs_trustpilot_stars_url( $rating ) )
	);
}

// Tracks whether each gradient's <defs> has already been injected into an
// earlier star this loop — only needs to exist once in the DOM (see the note
// above the $star_fill_grad/$empty_fill_grad computation).
$star_fill_defs_injected  = false;
$empty_fill_defs_injected = false;

for ( $i = 1; ! $is_tp_official && $i <= $max_rating; $i++ ) {
	if ( $i <= floor( $rating ) ) {
		$fill       = $star_colour;
		$star_class = 'sgs-star-rating__star--full';
		$fill_defs  = '';
		if ( ! $star_fill_defs_injected && '' !== $star_fill_grad['defs'] ) {
			$fill_defs               = $star_fill_grad['defs'];
			$star_fill_defs_injected = true;
		}
	} elseif ( $i === ceil( $rating ) && fmod( $rating, 1 ) >= 0.25 ) {
		$grad_id     = $unique_id . '-half-' . $i;
		$fill        = "url(#$grad_id)";
		$stars_html .= sprintf(
			'<svg width="%d" height="%d" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' .
			'<defs><linearGradient id="%s"><stop offset="50%%" stop-color="%s"/><stop offset="50%%" stop-color="%s"/></linearGradient></defs>' .
			'<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="%s"/></svg>',
			$star_size,
			$star_size,
			esc_attr( $grad_id ),
			$star_colour,
			$empty_colour,
			$fill
		);
		continue;
	} else {
		$fill       = $empty_colour;
		$star_class = 'sgs-star-rating__star--empty';
		$fill_defs  = '';
		if ( ! $empty_fill_defs_injected && '' !== $empty_fill_grad['defs'] ) {
			$fill_defs                = $empty_fill_grad['defs'];
			$empty_fill_defs_injected = true;
		}
	}

	$stars_html .= sprintf(
		'<svg width="%d" height="%d" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">%s' .
		'<path class="%s" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="%s"/></svg>',
		$star_size,
		$star_size,
		$fill_defs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_attr()'d fragments by sgs_svg_stroke_gradient().
		esc_attr( $star_class ),
		$fill
	);
}

$aria_label = sprintf(
	/* translators: 1: rating value, 2: maximum rating */
	__( '%1$s out of %2$s stars', 'sgs-blocks' ),
	$rating,
	$max_rating
);

// Build the numeric value string for display modes that show it.
$numeric_html = '';
if ( 'stars-with-value' === $display_mode || 'stars-with-value-and-count' === $display_mode ) {
	$numeric_html = sprintf(
		'<span class="sgs-star-rating__value" aria-hidden="true">%s</span>',
		esc_html( number_format( $rating, 1 ) )
	);
}

// Build the review count string for the full display mode.
$count_html = '';
if ( 'stars-with-value-and-count' === $display_mode && $schema_review_count > 0 ) {
	$count_html = sprintf(
		'<span class="sgs-star-rating__count" aria-hidden="true">(%s)</span>',
		esc_html(
			/* translators: %s: number of reviews */
			sprintf( _n( '%s review', '%s reviews', $schema_review_count, 'sgs-blocks' ), number_format_i18n( $schema_review_count ) )
		)
	);
}

// Schema markup.
$schema_html = '';
if ( $schema_enabled && $schema_item_name ) {
	$schema_html = sprintf(
		'<script type="application/ld+json">%s</script>',
		// One shared encoder (FR-30-9): was JSON_UNESCAPED_SLASHES with no
		// JSON_HEX_TAG, so unescaped slashes removed PHP's default `\/` guard and a
		// `</script>` in $schema_item_name could close this tag. Sgs_Schema adds
		// JSON_HEX_TAG.
		\SGS\Blocks\Sgs_Schema::encode_jsonld(
			array(
				'@context'        => 'https://schema.org',
				'@type'           => 'Product',
				'name'            => $schema_item_name,
				'aggregateRating' => array(
					'@type'       => 'AggregateRating',
					'ratingValue' => $rating,
					'bestRating'  => $max_rating,
					'worstRating' => 1,
					'reviewCount' => $schema_review_count,
				),
			)
		)
	);
}

?>
<?php if ( $scoped_css ) : ?>
	<?php
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D — matches sgs/heading). Every
	// value reaching $scoped_css is pre-sanitised (sgs_css_length_value() / allowlists /
	// wp_style_engine_get_styles / sanitize_html_class), so no un-sanitised
	// value survives here.
	?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
<?php endif; ?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is safe. ?>>
	<div class="sgs-star-rating__stars" role="img" aria-label="<?php echo esc_attr( $aria_label ); ?>">
		<?php echo $stars_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from controlled SVG templates above. ?>
	</div>
	<?php if ( $numeric_html ) : ?>
		<?php echo $numeric_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above. ?>
	<?php endif; ?>
	<?php if ( $count_html ) : ?>
		<?php echo $count_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above. ?>
	<?php endif; ?>
	<?php if ( $show_numeric ) : ?>
		<span class="sgs-star-rating__numeric"><?php echo esc_html( $rating . '/' . $max_rating ); ?></span>
	<?php endif; ?>
	<?php if ( $label ) : ?>
		<span class="sgs-star-rating__label"><?php echo esc_html( $label ); ?></span>
	<?php endif; ?>
	<?php echo $schema_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_json_encode output in script tag. ?>
</div>
