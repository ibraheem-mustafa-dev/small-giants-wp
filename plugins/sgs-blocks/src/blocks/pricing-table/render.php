<?php
/**
 * Server-side render for the SGS Pricing Table block.
 *
 * WS-4: outer wrapper now delegates to SGS_Container_Wrapper (kind='layout')
 * so the block mirrors sgs/container's grid/flex + widthMode + gap controls.
 *
 * Outputs responsive pricing plans with an optional monthly/yearly billing
 * toggle, per-plan icons (Lucide), per-plan ribbons, per-feature
 * included/excluded markers, and an optional savings badge for yearly billing.
 *
 * R-22-14: discriminators are EXPLICIT attributes. NEVER branch on empty($content).
 *
 * @var array    $attributes Block attributes (sanitised by block.json defaults).
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var \WP_Block $block      The WP_Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// ── Attributes ──────────────────────────────────────────────────────────────
$columns        = absint( $attributes['columns'] ?? 3 );
$plans          = (array) ( $attributes['plans'] ?? array() );
$style          = sanitize_key( $attributes['style'] ?? 'card' );
$title_colour   = $attributes['titleColour'] ?? '';
$price_colour   = $attributes['priceColour'] ?? '';
$feature_colour = $attributes['featureColour'] ?? '';
$cta_style      = sanitize_key( $attributes['ctaStyle'] ?? 'accent' );
$cta_colour     = $attributes['ctaColour'] ?? '';
$cta_background = $attributes['ctaBackground'] ?? '';
$badge_text     = sanitize_text_field( $attributes['popularBadgeText'] ?? __( 'Popular', 'sgs-blocks' ) );
$badge_colour   = $attributes['popularBadgeColour'] ?? 'white';
$badge_bg       = $attributes['popularBadgeBackground'] ?? 'accent';

// ── billingToggle — backward-compat: legacy boolean true → 'monthly-yearly', false → 'none' ──
$raw_billing_toggle = $attributes['billingToggle'] ?? 'monthly-yearly';
if ( true === $raw_billing_toggle || 'true' === $raw_billing_toggle ) {
	$raw_billing_toggle = 'monthly-yearly';
} elseif ( false === $raw_billing_toggle || 'false' === $raw_billing_toggle ) {
	$raw_billing_toggle = 'none';
}
$billing_toggle = in_array(
	$raw_billing_toggle,
	array( 'none', 'monthly-yearly', 'monthly-only', 'yearly-only' ),
	true
) ? $raw_billing_toggle : 'monthly-yearly';

// Show the toggle UI and which price variant to display by default.
$show_toggle    = ( 'monthly-yearly' === $billing_toggle );
$show_monthly   = in_array( $billing_toggle, array( 'monthly-yearly', 'monthly-only' ), true );
$show_yearly    = in_array( $billing_toggle, array( 'monthly-yearly', 'yearly-only' ), true );
$default_period = ( 'yearly-only' === $billing_toggle ) ? 'yearly' : 'monthly';

$toggle_style       = in_array( $attributes['toggleStyle'] ?? 'text', array( 'text', 'button' ), true )
	? ( $attributes['toggleStyle'] ?? 'text' )
	: 'text';
$toggle_monthly_lbl = sanitize_text_field( $attributes['billingToggleMonthlyLabel'] ?? __( 'Monthly', 'sgs-blocks' ) );
$toggle_yearly_lbl  = sanitize_text_field( $attributes['billingToggleYearlyLabel'] ?? __( 'Yearly', 'sgs-blocks' ) );

// ── Unique block ID for billing toggle radio inputs ──────────────────────────
$block_id = wp_unique_id( 'sgs-pricing-' );

// ── Helper: colour CSS value ─────────────────────────────────────────────────
$colour_val = static function ( $slug ) {
	if ( ! $slug ) {
		return '';
	}
	return 'var(--wp--preset--color--' . esc_attr( $slug ) . ')';
};

// ── Build billing toggle HTML ────────────────────────────────────────────────
$toggle_html = '';
if ( $show_toggle ) {
	$monthly_id  = esc_attr( $block_id ) . '-monthly';
	$yearly_id   = esc_attr( $block_id ) . '-yearly';
	$toggle_html = sprintf(
		'<div class="sgs-pricing-table__billing-toggle sgs-pricing-table__billing-toggle--style-%s" role="group" aria-label="%s">' .
			'<input type="radio" id="%s" name="%s" value="monthly" class="sgs-pricing-table__toggle-input" checked>' .
			'<label for="%s" class="sgs-pricing-table__toggle-label">%s</label>' .
			'<input type="radio" id="%s" name="%s" value="yearly" class="sgs-pricing-table__toggle-input">' .
			'<label for="%s" class="sgs-pricing-table__toggle-label">%s</label>' .
			'<span class="sgs-pricing-table__toggle-track" aria-hidden="true"></span>' .
		'</div>',
		esc_attr( $toggle_style ),
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
	$plan_name          = wp_strip_all_tags( $plan['name'] ?? '' );
	$plan_price         = wp_strip_all_tags( $plan['price'] ?? '' );
	$plan_price_yr      = wp_strip_all_tags( $plan['priceYearly'] ?? '' );
	$plan_period        = sanitize_key( $plan['period'] ?? 'monthly' );
	$plan_desc          = wp_strip_all_tags( $plan['description'] ?? '' );
	$plan_features_raw  = (array) ( $plan['features'] ?? array() );
	$plan_cta_text      = sanitize_text_field( $plan['ctaText'] ?? __( 'Get started', 'sgs-blocks' ) );
	$plan_cta_url       = esc_url( $plan['ctaUrl'] ?? '' );
	$plan_highlighted   = (bool) ( $plan['highlighted'] ?? false );
	$plan_icon          = sanitize_key( $plan['iconName'] ?? '' );
	$plan_ribbon_text   = sanitize_text_field( $plan['ribbonText'] ?? '' );
	$plan_ribbon_colour = sanitize_key( $plan['ribbonColour'] ?? 'accent' );
	$plan_savings_badge = sanitize_text_field( $plan['savingsBadgeText'] ?? '' );

	// ── Normalise features: legacy string → {text, included:true} ───────────
	$plan_features = array();
	foreach ( $plan_features_raw as $f ) {
		if ( is_string( $f ) ) {
			// Backward compat: plain strings are treated as included features.
			$plan_features[] = array(
				'text'     => wp_strip_all_tags( $f ),
				'included' => true,
			);
		} elseif ( is_array( $f ) ) {
			$plan_features[] = array(
				'text'     => wp_strip_all_tags( $f['text'] ?? '' ),
				'included' => isset( $f['included'] ) ? (bool) $f['included'] : true,
			);
		}
	}

	$plan_classes = implode(
		' ',
		array_filter(
			array(
				'sgs-pricing-table__plan',
				$plan_highlighted ? 'sgs-pricing-table__plan--highlighted' : '',
			)
		)
	);

	// ── Icon (Lucide) ─────────────────────────────────────────────────────────
	$icon_html = '';
	if ( $plan_icon ) {
		$svg = sgs_get_lucide_icon( $plan_icon );
		if ( $svg ) {
			$icon_html = '<div class="sgs-pricing-table__icon" aria-hidden="true">' . $svg . '</div>';
		}
	}

	// ── Popular badge (highlighted plan) ─────────────────────────────────────
	$badge_html = '';
	if ( $plan_highlighted ) {
		$badge_styles = '';
		if ( $badge_colour ) {
			$badge_styles .= 'color:' . $colour_val( $badge_colour ) . ';';
		}
		if ( $badge_bg ) {
			$badge_styles .= 'background-color:' . $colour_val( $badge_bg ) . ';';
		}
		$badge_html = sprintf(
			'<div class="sgs-pricing-table__badge"%s>%s</div>',
			$badge_styles ? ' style="' . esc_attr( $badge_styles ) . '"' : '',
			esc_html( $badge_text )
		);
	}

	// ── Per-plan ribbon ───────────────────────────────────────────────────────
	$ribbon_html = '';
	if ( $plan_ribbon_text ) {
		$ribbon_style = $plan_ribbon_colour
			? ' style="background-color:' . $colour_val( $plan_ribbon_colour ) . '"'
			: '';
		$ribbon_html  = sprintf(
			'<div class="sgs-pricing-table__ribbon"%s>%s</div>',
			$ribbon_style,
			esc_html( $plan_ribbon_text )
		);
	}

	// ── Price display ─────────────────────────────────────────────────────────
	$price_style_attr = $price_colour ? ' style="color:' . $colour_val( $price_colour ) . '"' : '';
	$period_labels    = array(
		'monthly' => __( '/mo', 'sgs-blocks' ),
		'yearly'  => __( '/yr', 'sgs-blocks' ),
		'one-off' => '',
	);
	$period_label     = $period_labels[ $plan_period ] ?? '';

	// Monthly price: show unless yearly-only mode.
	$monthly_hidden = ( 'yearly-only' === $billing_toggle ) ? ' hidden' : '';
	// Yearly price: show only when a yearly price exists AND toggle shows it.
	$yearly_price_html = '';
	if ( $show_yearly && $plan_price_yr ) {
		$yearly_hidden     = ( 'monthly-only' === $billing_toggle || 'none' === $billing_toggle ) ? ' hidden' : ( 'monthly-yearly' === $billing_toggle ? ' hidden' : '' );
		$yearly_price_html = sprintf(
			'<div class="sgs-pricing-table__price sgs-pricing-table__price--yearly"%s%s>%s</div>',
			$yearly_hidden,
			$price_style_attr,
			esc_html( $plan_price_yr )
		);
	}

	// Savings badge (shown when yearly is active).
	$savings_html = '';
	if ( $plan_savings_badge && $show_yearly ) {
		// Hidden by default; view.js shows it when yearly tab is selected.
		$savings_html = sprintf(
			'<div class="sgs-pricing-table__savings-badge" hidden>%s</div>',
			esc_html( $plan_savings_badge )
		);
	}

	$price_html = sprintf(
		'<div class="sgs-pricing-table__price-wrapper">' .
			'<div class="sgs-pricing-table__price sgs-pricing-table__price--monthly"%s%s>%s</div>' .
			'%s' .
			'%s' .
			( $period_label ? '<div class="sgs-pricing-table__period">%s</div>' : '%s' ) .
		'</div>',
		$monthly_hidden,
		$price_style_attr,
		esc_html( $plan_price ),
		$yearly_price_html,
		$savings_html,
		$period_label ? esc_html( $period_label ) : ''
	);

	// ── Feature list ──────────────────────────────────────────────────────────
	$features_html = '';
	if ( ! empty( $plan_features ) ) {
		$feature_style_attr = $feature_colour ? ' style="color:' . $colour_val( $feature_colour ) . '"' : '';
		$feature_items      = '';

		// Lucide SVG paths for check and cross icons.
		$check_svg = '<svg class="sgs-pricing-table__feature-icon sgs-pricing-table__feature-icon--check" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">'
			. '<polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
			. '</svg>';
		$cross_svg = '<svg class="sgs-pricing-table__feature-icon sgs-pricing-table__feature-icon--cross" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">'
			. '<line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>'
			. '<line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>'
			. '</svg>';

		foreach ( $plan_features as $feature ) {
			$is_included    = (bool) $feature['included'];
			$feature_text   = $feature['text'];
			$item_classes   = implode(
				' ',
				array_filter(
					array(
						'sgs-pricing-table__feature',
						$is_included ? 'sgs-pricing-table__feature--included' : 'sgs-pricing-table__feature--excluded',
					)
				)
			);
			$icon_svg       = $is_included ? $check_svg : $cross_svg;
			$feature_items .= sprintf(
				'<li class="%s"%s>%s<span>%s</span></li>',
				esc_attr( $item_classes ),
				$feature_style_attr,
				$icon_svg, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — SVG is hardcoded safe markup.
				esc_html( $feature_text )
			);
		}
		$features_html = '<ul class="sgs-pricing-table__features">' . $feature_items . '</ul>';
	}

	// ── CTA button ────────────────────────────────────────────────────────────
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

	// ── Title style ───────────────────────────────────────────────────────────
	$title_style_attr = $title_colour ? ' style="color:' . $colour_val( $title_colour ) . '"' : '';

	$plans_html .= sprintf(
		'<div class="%s">' .
			'%s' . // popular badge.
			'%s' . // ribbon.
			'%s' . // per-plan icon.
			'<div class="sgs-pricing-table__header">' .
				'<h3 class="sgs-pricing-table__name"%s>%s</h3>' .
				'%s' . // price wrapper.
				( $plan_desc ? '<p class="sgs-pricing-table__description">%s</p>' : '%s' ) .
			'</div>' .
			'%s' . // features.
			'%s' . // cta.
		'</div>',
		esc_attr( $plan_classes ),
		$badge_html,  // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — built from escaped parts above.
		$ribbon_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — built from escaped parts above.
		$icon_html,   // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — sgs_get_lucide_icon() returns safe SVG.
		$title_style_attr,
		esc_html( $plan_name ),
		$price_html,  // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — built from escaped parts above.
		$plan_desc ? esc_html( $plan_desc ) : '',
		$features_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — built from escaped parts above.
		$cta_html     // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — built from escaped parts above.
	);
}

// ── Interior HTML ─────────────────────────────────────────────────────────────
// toggle + plans grid. The helper owns the outer wrapper.
$inner_html = $toggle_html . '<div class="sgs-pricing-table__grid">' . $plans_html . '</div>';

// ── WS-4: emit via shared wrapper helper (kind='layout') ─────────────────────
// data-billing-default carried verbatim via extra_attrs (view.js reads it).
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => array_filter(
			array(
				'sgs-pricing-table',
				'sgs-pricing-table--columns-' . $columns,
				'sgs-pricing-table--' . esc_attr( $style ),
				$show_toggle ? 'sgs-pricing-table--has-toggle' : '',
			)
		),
		'extra_styles'  => array(),
		'extra_attrs'   => array(
			'data-billing-default' => $default_period,
		),
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
