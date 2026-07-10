<?php
/**
 * Server-side render for the SGS Star Rating block.
 *
 * NO-INLINE (per-block no-inline migration contract, 2026-07-10): the rendered
 * subtree carries ZERO inline CSS property declarations. The WP `color` and
 * `spacing` supports declare `__experimentalSkipSerialization` in block.json
 * so `get_block_wrapper_attributes()` never auto-inlines them; base padding /
 * margin / colour are instead emitted into the block's own scoped `.{uid}`
 * <style> tag (mirrors sgs/heading), and the paddingTablet/paddingMobile/
 * marginTablet/marginMobile object attrs add the responsive tiers as scoped
 * media rules (breakpoints 1023/767, contract §B2). Star fill/size/gap are
 * SVG/markup attributes (width/height/fill on <svg>), not CSS `style=`
 * declarations, so they are left untouched — content-KIND composite,
 * block-private (D294).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$rating              = (float) ( $attributes['rating'] ?? 5 );
$max_rating          = (int) ( $attributes['maxRating'] ?? 5 );
$star_size           = (int) ( $attributes['starSize'] ?? 24 );
$star_colour         = sgs_colour_value( $attributes['starColour'] ?? 'accent' );
$empty_colour        = sgs_colour_value( $attributes['emptyColour'] ?? 'border-subtle' );
$label               = $attributes['label'] ?? '';
$show_numeric        = $attributes['showNumeric'] ?? false;
$schema_enabled      = $attributes['schemaEnabled'] ?? true;
$schema_item_name    = $attributes['schemaItemName'] ?? '';
$schema_review_count = (int) ( $attributes['schemaReviewCount'] ?? 1 );

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
if ( $is_tp_flat ) {
	$star_colour = '#00B67A'; // Official Trustpilot brand green — the flat-preset fill.
}

// ---------------------------------------------------------------------------
// No-inline: box-object interface contract §1 sanitiser + box shorthand
// builder (mirrors sgs/heading + sgs/button + sgs/container).
// ---------------------------------------------------------------------------

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

$sgs_box_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$top    = $sgs_css_length( $box['top'] ?? '' );
	$right  = $sgs_css_length( $box['right'] ?? '' );
	$bottom = $sgs_css_length( $box['bottom'] ?? '' );
	$left   = $sgs_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

// Base padding/margin — WP-native style.spacing.* objects (skip-serialised).
$base_padding_obj = array();
if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
	foreach ( $attributes['style']['spacing']['padding'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_padding_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $spacing_side => $spacing_value ) {
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

// --- Base spacing + colour — skip-serialised, emitted scoped via the core
// style engine (exactly how WP core outputs `layout` support). ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
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
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the same root selector (contract §B2: tablet
// max-width:1023px, mobile max-width:767px). ---
$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );
$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );

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

for ( $i = 1; ! $is_tp_official && $i <= $max_rating; $i++ ) {
	if ( $i <= floor( $rating ) ) {
		$fill = $star_colour;
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
		$fill = $empty_colour;
	}

	$stars_html .= sprintf(
		'<svg width="%d" height="%d" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' .
		'<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="%s"/></svg>',
		$star_size,
		$star_size,
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
		wp_json_encode(
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
			),
			JSON_UNESCAPED_SLASHES
		)
	);
}

?>
<?php if ( $scoped_css ) : ?>
	<?php
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D — matches sgs/heading). Every
	// value reaching $scoped_css is pre-sanitised ($sgs_css_length / allowlists /
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
