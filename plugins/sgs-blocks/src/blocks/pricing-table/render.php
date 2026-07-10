<?php
/**
 * Server-side render for the SGS Pricing Table block.
 *
 * WS-4: outer wrapper now delegates to SGS_Container_Wrapper (kind='layout')
 * so the block mirrors sgs/container's grid/flex + align/maxWidth + gap controls.
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

// CSS-keyword/slug sanitiser — for free-text attrs (border-style, colour
// slugs) concatenated into raw CSS declarations inside this block's scoped
// <style> tag. Letters, digits, hyphen only (preset colour slugs can contain
// digits, e.g. "neutral-200"). Mirrors sgs/hero's $sgs_css_keyword, widened
// for slug use per contract §D.
$sgs_pt_css_slug = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9-]/', '', (string) $value );
};

// CSS-length sanitiser — letters, digits, dot, percent only.
$sgs_pt_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

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

// ── Helper: colour CSS value (slug sanitised for safe <style>-tag concatenation) ──
$colour_val = static function ( $slug ) use ( $sgs_pt_css_slug ) {
	if ( ! $slug ) {
		return '';
	}
	return 'var(--wp--preset--color--' . $sgs_pt_css_slug( $slug ) . ')';
};

// ── Scoping hook — no-inline contract (§A). A CLASS (contract §B3-style
// scoping — matches container/hero/quote convention): the root element also
// carries the WP `anchor` id, so the scoped hook must never collide with it.
$uid      = 'sgs-pricing-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-pricing-table';

// Responsive/scoped CSS accumulator — populated below (WP-native color/
// border/typography supports + the 5 block-level per-element colour rules)
// and flushed into a single <style id="uid"> tag before the wrapper echo.
$responsive_css = '';

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
	// Colour/background are BLOCK-LEVEL (popularBadgeColour/Background — same
	// for every highlighted plan), so they are NOT inlined here: emitted once
	// as a scoped `.sgs-pricing-table__badge` rule below (no-inline contract §A).
	$badge_html = '';
	if ( $plan_highlighted ) {
		$badge_html = sprintf(
			'<div class="sgs-pricing-table__badge">%s</div>',
			esc_html( $badge_text )
		);
	}

	// ── Per-plan ribbon ───────────────────────────────────────────────────────
	// ribbonColour VARIES per plan (plan-array data), so it cannot be a single
	// scoped rule. Contract §A allows a `--custom-property: value` VALUE
	// inline (not a property declaration) — write the resolved colour as a CSS
	// var; style.css/the scoped rule below reads `background-color:var(--sgs-pt-ribbon-bg)`.
	$ribbon_html = '';
	if ( $plan_ribbon_text ) {
		$ribbon_style = $plan_ribbon_colour
			? ' style="--sgs-pt-ribbon-bg:' . $colour_val( $plan_ribbon_colour ) . '"'
			: '';
		$ribbon_html  = sprintf(
			'<div class="sgs-pricing-table__ribbon"%s>%s</div>',
			$ribbon_style,
			esc_html( $plan_ribbon_text )
		);
	}

	// ── Price display ─────────────────────────────────────────────────────────
	// priceColour is BLOCK-LEVEL — emitted once as a scoped rule below.
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
			'<div class="sgs-pricing-table__price sgs-pricing-table__price--yearly"%s>%s</div>',
			$yearly_hidden,
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
			'<div class="sgs-pricing-table__price sgs-pricing-table__price--monthly"%s>%s</div>' .
			'%s' .
			'%s' .
			( $period_label ? '<div class="sgs-pricing-table__period">%s</div>' : '%s' ) .
		'</div>',
		$monthly_hidden,
		esc_html( $plan_price ),
		$yearly_price_html,
		$savings_html,
		$period_label ? esc_html( $period_label ) : ''
	);

	// ── Feature list ──────────────────────────────────────────────────────────
	// featureColour is BLOCK-LEVEL — emitted once as a scoped rule below.
	$features_html = '';
	if ( ! empty( $plan_features ) ) {
		$feature_items = '';

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
				'<li class="%s">%s<span>%s</span></li>',
				esc_attr( $item_classes ),
				$icon_svg, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — SVG is hardcoded safe markup.
				esc_html( $feature_text )
			);
		}
		$features_html = '<ul class="sgs-pricing-table__features">' . $feature_items . '</ul>';
	}

	// ── CTA button ────────────────────────────────────────────────────────────
	// ctaColour/ctaBackground are BLOCK-LEVEL — emitted once as a scoped rule
	// below (no-inline contract §A).
	$cta_html  = '';
	$cta_class = 'sgs-pricing-table__cta sgs-pricing-table__cta--' . esc_attr( $cta_style );

	if ( $plan_cta_text ) {
		if ( $plan_cta_url ) {
			$cta_html = sprintf(
				'<a href="%s" class="%s">%s</a>',
				esc_url( $plan_cta_url ),
				esc_attr( $cta_class ),
				esc_html( $plan_cta_text )
			);
		} else {
			$cta_html = sprintf(
				'<button type="button" class="%s">%s</button>',
				esc_attr( $cta_class ),
				esc_html( $plan_cta_text )
			);
		}
	}

	// ── Title ─────────────────────────────────────────────────────────────────
	// titleColour is BLOCK-LEVEL — emitted once as a scoped rule below.

	$plans_html .= sprintf(
		'<div class="%s">' .
			'%s' . // popular badge.
			'%s' . // ribbon.
			'%s' . // per-plan icon.
			'<div class="sgs-pricing-table__header">' .
				'<h3 class="sgs-pricing-table__name">%s</h3>' .
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
		esc_html( $plan_name ),
		$price_html,  // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — built from escaped parts above.
		$plan_desc ? esc_html( $plan_desc ) : '',
		$features_html, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — built from escaped parts above.
		$cta_html     // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — built from escaped parts above.
	);
}

// ── WP-native color / border / typography supports — no-inline contract (§A). ──
// block.json declares color/typography/spacing/__experimentalBorder ALL with
// __experimentalSkipSerialization:true, so get_block_wrapper_attributes()
// (called inside SGS_Container_Wrapper::render() below) never auto-inlines
// them. Read the resolved values from $attributes['style'] here and emit
// them into THIS BLOCK'S OWN scoped <style> (composite caveat, mirrors
// sgs/hero: do NOT pass these as wrapper `extra_styles` — that path
// inlines). Base spacing (padding/margin) is a SEPARATE mechanism the
// wrapper already handles scoped internally — not duplicated here.
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$pt_style_engine_args = array();

	$pt_color_args = array();
	if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
		$pt_color_args['text'] = (string) $attributes['style']['color']['text'];
	}
	if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
		$pt_color_args['background'] = (string) $attributes['style']['color']['background'];
	}
	if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
		$pt_color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
	}
	if ( ! empty( $pt_color_args ) ) {
		$pt_style_engine_args['color'] = $pt_color_args;
	}

	$pt_border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		$pt_border_args['color'] = (string) $attributes['style']['border']['color'];
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$pt_border_args['style'] = preg_replace( '/[^a-zA-Z-]/', '', (string) $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$pt_border_args['width'] = $sgs_pt_css_length( $attributes['style']['border']['width'] );
	}
	if ( isset( $attributes['style']['border']['radius'] ) ) {
		$pt_radius_raw = $attributes['style']['border']['radius'];
		if ( is_string( $pt_radius_raw ) && '' !== $pt_radius_raw ) {
			$pt_border_args['radius'] = $sgs_pt_css_length( $pt_radius_raw );
		} elseif ( is_array( $pt_radius_raw ) ) {
			$pt_radius_clean = array();
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $pt_corner ) {
				if ( ! empty( $pt_radius_raw[ $pt_corner ] ) ) {
					$pt_radius_clean[ $pt_corner ] = $sgs_pt_css_length( $pt_radius_raw[ $pt_corner ] );
				}
			}
			if ( ! empty( $pt_radius_clean ) ) {
				$pt_border_args['radius'] = $pt_radius_clean;
			}
		}
	}
	if ( ! empty( $pt_border_args ) ) {
		$pt_style_engine_args['border'] = $pt_border_args;
	}

	if ( ! empty( $pt_style_engine_args ) ) {
		$pt_scoped_styles = wp_style_engine_get_styles(
			$pt_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $pt_scoped_styles['css'] ) ) {
			$responsive_css .= $pt_scoped_styles['css'];
		}
	}

	// Typography — declared selector (block.json selectors.typography) is
	// ".sgs-pricing-table__title"; the rendered element uses the canonical
	// __name class (style.css keeps __title as a back-compat alias), so both
	// are targeted here to match that existing dual-selector convention.
	$pt_typography_args = array();
	if ( isset( $attributes['style']['typography']['fontSize'] ) && '' !== $attributes['style']['typography']['fontSize'] ) {
		$pt_typography_args['fontSize'] = (string) $attributes['style']['typography']['fontSize'];
	}
	if ( isset( $attributes['style']['typography']['lineHeight'] ) && '' !== $attributes['style']['typography']['lineHeight'] ) {
		$pt_typography_args['lineHeight'] = (string) $attributes['style']['typography']['lineHeight'];
	}
	if ( ! empty( $pt_typography_args ) ) {
		$pt_typography_scoped = wp_style_engine_get_styles(
			array( 'typography' => $pt_typography_args ),
			array( 'selector' => $root_sel . ' .sgs-pricing-table__name, ' . $root_sel . ' .sgs-pricing-table__title' )
		);
		if ( ! empty( $pt_typography_scoped['css'] ) ) {
			$responsive_css .= $pt_typography_scoped['css'];
		}
	}
}

// Skip-serialised `color` support also stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add
// them manually (mirrors sgs/hero + sgs/quote) so preset palette colours
// still resolve visually.
$pt_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$pt_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
$pt_preset_classes   = array();
if ( '' !== $pt_preset_text_slug ) {
	$pt_preset_classes[] = 'has-text-color';
	$pt_preset_classes[] = 'has-' . $pt_preset_text_slug . '-color';
}
if ( '' !== $pt_preset_bg_slug ) {
	$pt_preset_classes[] = 'has-background';
	$pt_preset_classes[] = 'has-' . $pt_preset_bg_slug . '-background-color';
}

// ── Block-level per-element colour rules (§A) ─────────────────────────────────
// badge/price/feature/cta/title colours are BLOCK-LEVEL attrs (identical for
// every plan card), so each is emitted ONCE as a scoped rule here rather than
// per-plan inline — only ribbonColour genuinely varies per plan (handled via
// the --sgs-pt-ribbon-bg CSS var written inline above).
if ( $badge_colour || $badge_bg ) {
	$pt_badge_decls = array();
	if ( $badge_colour ) {
		$pt_badge_decls[] = 'color:' . $colour_val( $badge_colour );
	}
	if ( $badge_bg ) {
		$pt_badge_decls[] = 'background-color:' . $colour_val( $badge_bg );
	}
	$responsive_css .= $root_sel . ' .sgs-pricing-table__badge{' . implode( ';', $pt_badge_decls ) . '}';
}
if ( $price_colour ) {
	$responsive_css .= $root_sel . ' .sgs-pricing-table__price{color:' . $colour_val( $price_colour ) . '}';
}
if ( $feature_colour ) {
	$responsive_css .= $root_sel . ' .sgs-pricing-table__feature{color:' . $colour_val( $feature_colour ) . '}';
}
if ( $cta_colour || $cta_background ) {
	$pt_cta_decls = array();
	if ( $cta_colour ) {
		$pt_cta_decls[] = 'color:' . $colour_val( $cta_colour );
	}
	if ( $cta_background ) {
		$pt_cta_decls[] = 'background-color:' . $colour_val( $cta_background );
	}
	$responsive_css .= $root_sel . ' .sgs-pricing-table__cta{' . implode( ';', $pt_cta_decls ) . '}';
}
if ( $title_colour ) {
	$responsive_css .= $root_sel . ' .sgs-pricing-table__name,' . $root_sel . ' .sgs-pricing-table__title{color:' . $colour_val( $title_colour ) . '}';
}

// Ribbon: the --sgs-pt-ribbon-bg var (written inline per-plan above) needs a
// scoped rule to consume it — background-color reads the var, falling back
// to the same accent default style.css already used. Static rule, harmless
// to emit unconditionally (only matches if a .sgs-pricing-table__ribbon
// element exists in the rendered markup).
$responsive_css .= $root_sel . ' .sgs-pricing-table__ribbon{background-color:var(--sgs-pt-ribbon-bg, var(--wp--preset--color--accent, #d4a843))}';

// ── Interior HTML ─────────────────────────────────────────────────────────────
// toggle + plans grid. The helper owns the outer wrapper.
$inner_html = $toggle_html . '<div class="sgs-pricing-table__grid">' . $plans_html . '</div>';

// Output scoped CSS. wp_strip_all_tags (NOT esc_html) blocks a </style>
// breakout while leaving CSS combinators like `>`/`,` intact (contract §D —
// matches SGS_Container_Wrapper + sgs/hero + sgs/quote + sgs/button). Every
// value reaching $responsive_css is pre-sanitised ($sgs_pt_css_slug /
// $sgs_pt_css_length / wp_style_engine_get_styles), so no un-sanitised value
// survives to here.
if ( $responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below; $responsive_css built from pre-sanitised values only.
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), wp_strip_all_tags( $responsive_css ) );
}

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
		'extra_classes' => array_merge(
			array_filter(
				array(
					'sgs-pricing-table',
					'sgs-pricing-table--columns-' . $columns,
					'sgs-pricing-table--' . esc_attr( $style ),
					$show_toggle ? 'sgs-pricing-table--has-toggle' : '',
					$uid,
				)
			),
			$pt_preset_classes
		),
		'extra_styles'  => array(),
		'extra_attrs'   => array(
			'data-billing-default' => $default_period,
		),
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
