<?php
/**
 * Server-side render for the SGS Pricing Table block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// Extract attributes with defaults.
$columns                  = $attributes['columns'] ?? 3;
$plans                    = $attributes['plans'] ?? array();
$highlighted_plan         = $attributes['highlightedPlan'] ?? 1;
$card_style               = $attributes['cardStyle'] ?? 'elevated';
$title_colour             = $attributes['titleColour'] ?? '';
$price_colour             = $attributes['priceColour'] ?? '';
$feature_colour           = $attributes['featureColour'] ?? '';
$cta_style                = $attributes['ctaStyle'] ?? 'accent';
$cta_colour               = $attributes['ctaColour'] ?? '';
$cta_background           = $attributes['ctaBackground'] ?? '';
$popular_badge_text       = $attributes['popularBadgeText'] ?? __( 'Popular', 'sgs-blocks' );
$popular_badge_colour     = $attributes['popularBadgeColour'] ?? 'white';
$popular_badge_background = $attributes['popularBadgeBackground'] ?? 'accent';

// Build wrapper classes.
$classes = array(
	'sgs-pricing-table',
	'sgs-pricing-table--columns-' . esc_attr( $columns ),
	'sgs-pricing-table--' . esc_attr( $card_style ),
);

$wrapper_attributes = get_block_wrapper_attributes( array(
	'class' => implode( ' ', $classes ),
) );

// Period labels.
$period_labels = array(
	'monthly' => __( '/month', 'sgs-blocks' ),
	'yearly'  => __( '/year', 'sgs-blocks' ),
	'one-off' => '',
);

// Output.
echo '<div ' . $wrapper_attributes . '>';
echo '<div class="sgs-pricing-table__grid">';

foreach ( $plans as $index => $plan ) {
	$title      = $plan['title'] ?? '';
	$price      = $plan['price'] ?? '';
	$period     = $plan['period'] ?? 'monthly';
	$features   = $plan['features'] ?? array();
	$cta_text   = $plan['ctaText'] ?? __( 'Get Started', 'sgs-blocks' );
	$cta_url    = $plan['ctaUrl'] ?? '';
	$is_popular = ! empty( $plan['isPopular'] );

	$is_highlighted = $index === $highlighted_plan;

	$plan_classes = array(
		'sgs-pricing-table__plan',
	);
	if ( $is_highlighted ) {
		$plan_classes[] = 'sgs-pricing-table__plan--highlighted';
	}
	if ( $is_popular ) {
		$plan_classes[] = 'sgs-pricing-table__plan--popular';
	}

	echo '<div class="' . esc_attr( implode( ' ', $plan_classes ) ) . '">';

	// Popular badge.
	if ( $is_popular ) {
		$badge_styles = array();
		if ( $popular_badge_colour ) {
			$badge_styles[] = 'color:' . sgs_colour_value( $popular_badge_colour );
		}
		if ( $popular_badge_background ) {
			$badge_styles[] = 'background-color:' . sgs_colour_value( $popular_badge_background );
		}
		$badge_style_attr = $badge_styles ? ' style="' . implode( ';', $badge_styles ) . '"' : '';

		printf(
			'<div class="sgs-pricing-table__badge"%s>%s</div>',
			$badge_style_attr,
			esc_html( $popular_badge_text )
		);
	}

	// Header (title + price).
	echo '<div class="sgs-pricing-table__header">';

	$title_style_attr = '';
	if ( $title_colour ) {
		$title_style_attr = ' style="color:' . sgs_colour_value( $title_colour ) . '"';
	}
	printf(
		'<h3 class="sgs-pricing-table__title"%s>%s</h3>',
		$title_style_attr,
		wp_kses_post( $title )
	);

	echo '<div class="sgs-pricing-table__price-wrapper">';

	$price_style_attr = '';
	if ( $price_colour ) {
		$price_style_attr = ' style="color:' . sgs_colour_value( $price_colour ) . '"';
	}
	printf(
		'<div class="sgs-pricing-table__price"%s>%s</div>',
		$price_style_attr,
		wp_kses_post( $price )
	);

	$period_label = $period_labels[ $period ] ?? '';
	if ( $period_label ) {
		echo '<div class="sgs-pricing-table__period">' . esc_html( $period_label ) . '</div>';
	}

	echo '</div>'; // .sgs-pricing-table__price-wrapper
	echo '</div>'; // .sgs-pricing-table__header

	// Features list.
	if ( ! empty( $features ) ) {
		echo '<ul class="sgs-pricing-table__features">';
		foreach ( $features as $feature ) {
			$feature_style_attr = '';
			if ( $feature_colour ) {
				$feature_style_attr = ' style="color:' . sgs_colour_value( $feature_colour ) . '"';
			}
			printf(
				'<li class="sgs-pricing-table__feature"%s>%s</li>',
				$feature_style_attr,
				wp_kses_post( $feature )
			);
		}
		echo '</ul>';
	}

	// CTA button.
	if ( $cta_text ) {
		$cta_classes = array(
			'sgs-pricing-table__cta',
			'sgs-pricing-table__cta--' . esc_attr( $cta_style ),
		);

		$cta_styles = array();
		if ( $cta_colour ) {
			$cta_styles[] = 'color:' . sgs_colour_value( $cta_colour );
		}
		if ( $cta_background ) {
			$cta_styles[] = 'background-color:' . sgs_colour_value( $cta_background );
		}
		$cta_style_attr = $cta_styles ? ' style="' . implode( ';', $cta_styles ) . '"' : '';

		if ( $cta_url ) {
			printf(
				'<a href="%s" class="%s"%s>%s</a>',
				esc_url( $cta_url ),
				esc_attr( implode( ' ', $cta_classes ) ),
				$cta_style_attr,
				esc_html( $cta_text )
			);
		} else {
			printf(
				'<span class="%s"%s>%s</span>',
				esc_attr( implode( ' ', $cta_classes ) ),
				$cta_style_attr,
				esc_html( $cta_text )
			);
		}
	}

	echo '</div>'; // .sgs-pricing-table__plan
}

echo '</div>'; // .sgs-pricing-table__grid
echo '</div>'; // wrapper
