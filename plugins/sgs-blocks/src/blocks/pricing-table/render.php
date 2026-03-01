<?php
/**
 * Server-side render for the SGS Pricing Table block.
 *
 * @since 1.0.0
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$columns                 = (int) ( $attributes['columns'] ?? 3 );
$plans                   = $attributes['plans'] ?? array();
$style                   = $attributes['style'] ?? 'card';
$title_colour            = $attributes['titleColour'] ?? '';
$price_colour            = $attributes['priceColour'] ?? '';
$feature_colour          = $attributes['featureColour'] ?? '';
$cta_style               = $attributes['ctaStyle'] ?? 'accent';
$cta_colour              = $attributes['ctaColour'] ?? '';
$cta_background          = $attributes['ctaBackground'] ?? '';
$badge_text              = $attributes['popularBadgeText'] ?? __( 'Popular', 'sgs-blocks' );
$badge_colour            = $attributes['popularBadgeColour'] ?? 'white';
$badge_background        = $attributes['popularBadgeBackground'] ?? 'accent';

$classes = array(
	'sgs-pricing-table',
	'sgs-pricing-table--columns-' . $columns,
	'sgs-pricing-table--' . esc_attr( $style ),
);

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
	)
);

// Period labels — localised for UK English.
$period_labels = array(
	'monthly' => __( '/month', 'sgs-blocks' ),
	'yearly'  => __( '/year', 'sgs-blocks' ),
	'one-off' => '',
);

// Pre-build colour style strings.
$title_style   = $title_colour ? ' style="color:' . sgs_colour_value( $title_colour ) . '"' : '';
$price_style   = $price_colour ? ' style="color:' . sgs_colour_value( $price_colour ) . '"' : '';
$feature_style = $feature_colour ? ' style="color:' . sgs_colour_value( $feature_colour ) . '"' : '';

$badge_styles = array();
if ( $badge_colour ) {
	$badge_styles[] = 'color:' . sgs_colour_value( $badge_colour );
}
if ( $badge_background ) {
	$badge_styles[] = 'background-color:' . sgs_colour_value( $badge_background );
}
$badge_style_attr = $badge_styles ? ' style="' . implode( ';', $badge_styles ) . '"' : '';

$cta_inline_styles = array();
if ( $cta_colour ) {
	$cta_inline_styles[] = 'color:' . sgs_colour_value( $cta_colour );
}
if ( $cta_background ) {
	$cta_inline_styles[] = 'background-color:' . sgs_colour_value( $cta_background );
}
$cta_style_attr = $cta_inline_styles ? ' style="' . implode( ';', $cta_inline_styles ) . '"' : '';

// Build each pricing plan.
$plans_html = '';
foreach ( $plans as $plan ) {
	$name        = $plan['name'] ?? '';
	$price       = $plan['price'] ?? '';
	$period      = $plan['period'] ?? 'monthly';
	$features    = $plan['features'] ?? array();
	$cta_text    = $plan['ctaText'] ?? __( 'Get Started', 'sgs-blocks' );
	$cta_url     = $plan['ctaUrl'] ?? '';
	$highlighted = ! empty( $plan['highlighted'] );

	$plan_classes = array( 'sgs-pricing-table__plan' );
	if ( $highlighted ) {
		$plan_classes[] = 'sgs-pricing-table__plan--highlighted';
	}

	$plan_html = '<div class="' . implode( ' ', $plan_classes ) . '">';

	// Popular badge.
	if ( $highlighted ) {
		$plan_html .= sprintf(
			'<div class="sgs-pricing-table__badge"%s>%s</div>',
			$badge_style_attr,
			esc_html( $badge_text )
		);
	}

	// Plan header: name and price.
	$period_label = $period_labels[ $period ] ?? '';
	$plan_html   .= '<div class="sgs-pricing-table__header">';
	$plan_html   .= sprintf(
		'<h3 class="sgs-pricing-table__title"%s>%s</h3>',
		$title_style,
		esc_html( $name )
	);
	$plan_html .= '<div class="sgs-pricing-table__price-wrapper">';
	$plan_html .= sprintf(
		'<div class="sgs-pricing-table__price"%s>%s</div>',
		$price_style,
		esc_html( $price )
	);
	if ( $period_label ) {
		$plan_html .= sprintf(
			'<div class="sgs-pricing-table__period">%s</div>',
			esc_html( $period_label )
		);
	}
	$plan_html .= '</div>'; // .sgs-pricing-table__price-wrapper
	$plan_html .= '</div>'; // .sgs-pricing-table__header

	// Feature list.
	if ( ! empty( $features ) ) {
		$plan_html .= '<ul class="sgs-pricing-table__features">';
		foreach ( $features as $feature ) {
			$plan_html .= sprintf(
				'<li class="sgs-pricing-table__feature"%s>%s</li>',
				$feature_style,
				esc_html( $feature )
			);
		}
		$plan_html .= '</ul>';
	}

	// CTA button or link.
	if ( $cta_text ) {
		$cta_class = 'sgs-pricing-table__cta sgs-pricing-table__cta--' . esc_attr( $cta_style );
		if ( $cta_url ) {
			$plan_html .= sprintf(
				'<a href="%s" class="%s"%s>%s</a>',
				esc_url( $cta_url ),
				$cta_class,
				$cta_style_attr,
				esc_html( $cta_text )
			);
		} else {
			$plan_html .= sprintf(
				'<span class="%s"%s>%s</span>',
				$cta_class,
				$cta_style_attr,
				esc_html( $cta_text )
			);
		}
	}

	$plan_html  .= '</div>'; // .sgs-pricing-table__plan
	$plans_html .= $plan_html;
}

printf(
	'<div %s><div class="sgs-pricing-table__grid">%s</div></div>',
	$wrapper_attributes,
	$plans_html
);
