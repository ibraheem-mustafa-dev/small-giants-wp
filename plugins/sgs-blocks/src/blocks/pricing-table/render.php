<?php
/**
 * Server-side render for the SGS Pricing Table block.
 *
 * Outputs responsive pricing plans with an optional monthly/yearly billing
 * toggle. The toggle is driven by a small vanilla-JS view module (view.js).
 *
 * @var array    $attributes Block attributes (sanitised by block.json defaults).
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var WP_Block $block      The WP_Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ── Attributes ──────────────────────────────────────────────────────────────
$columns            = absint( $attributes['columns'] ?? 3 );
$billing_toggle     = (bool) ( $attributes['billingToggle'] ?? false );
$toggle_monthly_lbl = sanitize_text_field( $attributes['billingToggleMonthlyLabel'] ?? __( 'Monthly', 'sgs-blocks' ) );
$toggle_yearly_lbl  = sanitize_text_field( $attributes['billingToggleYearlyLabel'] ?? __( 'Yearly', 'sgs-blocks' ) );
$plans              = (array) ( $attributes['plans'] ?? array() );
$style              = sanitize_key( $attributes['style'] ?? 'card' );
$title_colour       = $attributes['titleColour'] ?? '';
$price_colour       = $attributes['priceColour'] ?? '';
$feature_colour     = $attributes['featureColour'] ?? '';
$cta_style          = sanitize_key( $attributes['ctaStyle'] ?? 'accent' );
$cta_colour         = $attributes['ctaColour'] ?? '';
$cta_background     = $attributes['ctaBackground'] ?? '';
$badge_text         = sanitize_text_field( $attributes['popularBadgeText'] ?? __( 'Popular', 'sgs-blocks' ) );
$badge_colour       = $attributes['popularBadgeColour'] ?? 'white';
$badge_background   = $attributes['popularBadgeBackground'] ?? 'accent';

// ── Unique block ID for billing toggle radio inputs ──────────────────────────
$block_id = wp_unique_id( 'sgs-pricing-' );

// ── Wrapper ──────────────────────────────────────────────────────────────────
$classes = implode(
	' ',
	array_filter(
		array(
			'sgs-pricing-table',
			'sgs-pricing-table--columns-' . $columns,
			'sgs-pricing-table--' . esc_attr( $style ),
			$billing_toggle ? 'sgs-pricing-table--has-toggle' : '',
		)
	)
);

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class' => $classes,
	)
);

// ── Helper: colour CSS value ─────────────────────────────────────────────────
$colour_val = function ( $slug ) {
	if ( ! $slug ) {
		return '';
	}
	return 'var(--wp--preset--color--' . esc_attr( $slug ) . ')';
};

// ── Build billing toggle HTML ────────────────────────────────────────────────
$toggle_html = '';
if ( $billing_toggle ) {
	$monthly_id  = esc_attr( $block_id ) . '-monthly';
	$yearly_id   = esc_attr( $block_id ) . '-yearly';
	$toggle_html = sprintf(
		'<div class="sgs-pricing-table__toggle" role="group" aria-label="%s">' .
			'<input type="radio" id="%s" name="%s" value="monthly" class="sgs-pricing-table__toggle-input" checked>' .
			'<label for="%s" class="sgs-pricing-table__toggle-label">%s</label>' .
			'<input type="radio" id="%s" name="%s" value="yearly" class="sgs-pricing-table__toggle-input">' .
			'<label for="%s" class="sgs-pricing-table__toggle-label">%s</label>' .
			'<span class="sgs-pricing-table__toggle-track" aria-hidden="true"></span>' .
		'</div>',
		esc_attr__( 'Billing period', 'sgs-blocks' ),
		esc_attr( $monthly_id ),
		esc_attr( $block_id ),
		esc_attr( $monthly_id ),
		esc_html( $toggle_monthly_lbl ),
		esc_attr( $yearly_id ),
		esc_attr( $block_id ),
		esc_attr( $yearly_id ),
		esc_html( $toggle_yearly_lbl )
	);
}

// ── Build plan cards HTML ────────────────────────────────────────────────────
$plans_html = '';
foreach ( $plans as $plan ) {
	$plan_name        = wp_strip_all_tags( $plan['name'] ?? '' );
	$plan_price       = wp_strip_all_tags( $plan['price'] ?? '' );
	$plan_price_yr    = wp_strip_all_tags( $plan['priceYearly'] ?? '' );
	$plan_period      = sanitize_key( $plan['period'] ?? 'monthly' );
	$plan_desc        = wp_strip_all_tags( $plan['description'] ?? '' );
	$plan_features    = array_map( 'wp_strip_all_tags', (array) ( $plan['features'] ?? array() ) );
	$plan_cta_text    = sanitize_text_field( $plan['ctaText'] ?? __( 'Get started', 'sgs-blocks' ) );
	$plan_cta_url     = esc_url( $plan['ctaUrl'] ?? '' );
	$plan_highlighted = (bool) ( $plan['highlighted'] ?? false );

	$plan_classes = implode(
		' ',
		array_filter(
			array(
				'sgs-pricing-table__plan',
				$plan_highlighted ? 'sgs-pricing-table__plan--highlighted' : '',
			)
		)
	);

	// Badge.
	$badge_html = '';
	if ( $plan_highlighted ) {
		$badge_styles = '';
		if ( $badge_colour ) {
			$badge_styles .= 'color:' . $colour_val( $badge_colour ) . ';';
		}
		if ( $badge_background ) {
			$badge_styles .= 'background-color:' . $colour_val( $badge_background ) . ';';
		}
		$badge_html = sprintf(
			'<div class="sgs-pricing-table__badge"%s>%s</div>',
			$badge_styles ? ' style="' . esc_attr( $badge_styles ) . '"' : '',
			esc_html( $badge_text )
		);
	}

	// Price display — monthly and yearly spans, shown/hidden by JS toggle.
	$price_style_attr = $price_colour ? ' style="color:' . $colour_val( $price_colour ) . '"' : '';
	$period_labels    = array(
		'monthly' => __( '/mo', 'sgs-blocks' ),
		'yearly'  => __( '/yr', 'sgs-blocks' ),
		'one-off' => '',
	);
	$period_label     = $period_labels[ $plan_period ] ?? '';

	$price_html = sprintf(
		'<div class="sgs-pricing-table__price-wrapper">' .
			'<div class="sgs-pricing-table__price sgs-pricing-table__price--monthly"%s>%s</div>' .
			( $billing_toggle && $plan_price_yr
				? '<div class="sgs-pricing-table__price sgs-pricing-table__price--yearly" hidden%s>%s</div>'
				: ''
			) .
			( $period_label ? '<div class="sgs-pricing-table__period">%s</div>' : '%s' ) .
		'</div>',
		$price_style_attr,
		esc_html( $plan_price ),
		$price_style_attr,
		esc_html( $plan_price_yr ),
		$period_label ? esc_html( $period_label ) : ''
	);

	// Feature list.
	$features_html = '';
	if ( ! empty( $plan_features ) ) {
		$feature_style_attr = $feature_colour ? ' style="color:' . $colour_val( $feature_colour ) . '"' : '';
		$feature_items      = '';
		foreach ( $plan_features as $feature ) {
			$feature_items .= sprintf(
				'<li class="sgs-pricing-table__feature"%s>' .
					'<svg class="sgs-pricing-table__feature-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">' .
						'<polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' .
					'</svg>' .
					'<span>%s</span>' .
				'</li>',
				$feature_style_attr,
				esc_html( $feature )
			);
		}
		$features_html = '<ul class="sgs-pricing-table__features">' . $feature_items . '</ul>';
	}

	// CTA button.
	$cta_html   = '';
	$cta_styles = '';
	if ( $cta_colour ) {
		$cta_styles .= 'color:' . $colour_val( $cta_colour ) . ';';
	}
	if ( $cta_background ) {
		$cta_styles .= 'background-color:' . $colour_val( $cta_background ) . ';';
	}
	$cta_style_attr = $cta_styles ? ' style="' . esc_attr( $cta_styles ) . '"' : '';
	$cta_class      = 'sgs-pricing-table__cta sgs-pricing-table__cta--' . esc_attr( $cta_style );

	if ( $plan_cta_text ) {
		if ( $plan_cta_url ) {
			$cta_html = sprintf(
				'<a href="%s" class="%s"%s>%s</a>',
				esc_url( $plan_cta_url ),
				esc_attr( $cta_class ),
				$cta_style_attr,
				esc_html( $plan_cta_text )
			);
		} else {
			$cta_html = sprintf(
				'<button type="button" class="%s"%s>%s</button>',
				esc_attr( $cta_class ),
				$cta_style_attr,
				esc_html( $plan_cta_text )
			);
		}
	}

	// Title style.
	$title_style_attr = $title_colour ? ' style="color:' . $colour_val( $title_colour ) . '"' : '';

	$plans_html .= sprintf(
		'<div class="%s">' .
			'%s' .
			'<div class="sgs-pricing-table__header">' .
				'<h3 class="sgs-pricing-table__title"%s>%s</h3>' .
				'%s' .
				( $plan_desc ? '<p class="sgs-pricing-table__description">%s</p>' : '%s' ) .
			'</div>' .
			'%s' .
			'%s' .
		'</div>',
		esc_attr( $plan_classes ),
		$badge_html,
		$title_style_attr,
		esc_html( $plan_name ),
		$price_html,
		$plan_desc ? esc_html( $plan_desc ) : '',
		$features_html,
		$cta_html
	);
}

// ── Output ───────────────────────────────────────────────────────────────────
?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is safe. ?>>
	<?php
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $toggle_html built from escaped parts above.
	echo $toggle_html;
	?>
	<div class="sgs-pricing-table__grid">
		<?php
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $plans_html built from escaped parts above.
		echo $plans_html;
		?>
	</div>
</div>
