<?php
/**
 * Cart render partial: scoped-CSS assembly (badge, badge typography, panel,
 * trigger pill, free-delivery, panel design, item-thumbnail media layer).
 *
 * Required by render.php with plain `require` (never require_once) at the point
 * the code used to sit, so it shares render.php's locals.
 * Reads: $attributes, $sel, $uid, $has_panel and the other locals render.php builds above.
 * Writes: $scoped_css (appends) and the section-local variables.
 */

defined( 'ABSPATH' ) || exit;

// Badge: badgeColour (fill) / badgeTextColour (text) share .sgs-cart__badge.
// HAND-BUILT ::after, NOT sgs_block_background_layer_css() — the badge is
// already `position:absolute` (style.css, positions it top:2px/right:2px on
// the icon), and that helper hardcodes `position:relative` on the same
// selector, which would silently break the badge's own positioning (the
// exact trap sgs/pricing-table's popularBadgeBackground already documents).
$badge_sel             = $sel . ' .sgs-cart__badge';
$badge_colour_gradient = (string) ( $attributes['badgeColourGradient'] ?? '' );
$badge_bg_paint        = sgs_background_paint_decl( $badge_colour, $badge_colour_gradient );
if ( '' !== $badge_bg_paint ) {
	$scoped_css[] = $badge_sel . '::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;' . $badge_bg_paint . ';}';
}
$badge_text_gradient  = (string) ( $attributes['badgeTextColourGradient'] ?? '' );
$badge_text_effective = sgs_resolve_text_colour_or_gradient( $badge_text_colour, $badge_text_gradient );
if ( '' !== $badge_text_effective ) {
	$badge_text_decl = sgs_text_colour_decl( $badge_text_effective );
	if ( '' !== $badge_text_decl ) {
		$scoped_css[] = $badge_sel . '{' . $badge_text_decl . ';}';
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $badge_sel, $badge_text_effective );
}
// Hover — safe to paint directly (no precondition swap needed): the badge's
// own background always lives on its ::after layer above, never on
// $badge_sel itself, so background-clip:text here can never clip a
// background.
$badge_text_hover           = (string) ( $attributes['badgeTextColourHover'] ?? '' );
$badge_text_hover_gradient  = (string) ( $attributes['badgeTextColourHoverGradient'] ?? '' );
$badge_text_hover_effective = sgs_resolve_text_colour_or_gradient( $badge_text_hover, $badge_text_hover_gradient );
if ( '' !== $badge_text_hover_effective ) {
	$badge_text_hover_decl = sgs_text_colour_decl( $badge_text_hover_effective );
	if ( '' !== $badge_text_hover_decl ) {
		$scoped_css[] = sgs_hover_state_rules( $badge_sel, $badge_text_hover_decl );
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $badge_sel . ':hover', $badge_text_hover_effective );
}

// Badge count text (size, weight) through the shared typography helper, for the
// icon trigger's overlay badge and the pill's bubble. A plain pill count inherits
// the pill label's own typography (style.css), so it is left out there.
if ( 'pill' !== $trigger_style || 'bubble' === ( $attributes['pillCountStyle'] ?? 'plain' ) ) {
	$badge_typo_css = sgs_typography_css_rule( $attributes, 'badge', $badge_sel );
	if ( '' !== $badge_typo_css ) {
		$scoped_css[] = $badge_typo_css;
	}
}

// Panel: panelBg (fill) / panelTextColour (text) share .sgs-cart__panel —
// same split, only rendered when $has_panel (flyout|drawer displayMode).
// Also HAND-BUILT: the panel's own `--flyout`/`--drawer` modifier classes
// declare `position:absolute`/`position:fixed` respectively, at the SAME
// (0,2,0) specificity as a uid-scoped rule here would carry — relying on
// sgs_block_background_layer_css()'s `position:relative` to win on source
// order is exactly the kind of silent, unprovable win/loss this file's own
// discipline avoids. The panel is always positioned by one of those two
// modifiers whenever it renders, so `::after` has a positioning context
// without this code adding one.
if ( $has_panel ) {
	// The panel element carries the uid class itself: the nav store moves the
	// drawer dialog to <body> when it opens, so a rule scoped through the block
	// wrapper ($sel) would stop matching the moment the drawer is on screen.
	$panel_sel         = '.' . $uid . '.sgs-cart__panel';
	$panel_bg_gradient = (string) ( $attributes['panelBgGradient'] ?? '' );
	$panel_bg_paint    = sgs_background_paint_decl( $panel_bg_slug, $panel_bg_gradient );
	if ( '' !== $panel_bg_paint ) {
		$scoped_css[] = $panel_sel . '::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;' . $panel_bg_paint . ';}';
	}
	$panel_text_gradient  = (string) ( $attributes['panelTextColourGradient'] ?? '' );
	$panel_text_effective = sgs_resolve_text_colour_or_gradient( $panel_text_slug, $panel_text_gradient );
	if ( '' !== $panel_text_effective ) {
		$panel_text_decl = sgs_text_colour_decl( $panel_text_effective );
		if ( '' !== $panel_text_decl ) {
			$scoped_css[] = $panel_sel . '{' . $panel_text_decl . ';}';
		}
		$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $panel_sel, $panel_text_effective );
	}
	// Hover — safe to paint directly (no precondition swap needed): the
	// panel's own background always lives on its ::after layer above, never
	// on $panel_sel itself, so background-clip:text here can never clip a
	// background.
	$panel_text_hover           = (string) ( $attributes['panelTextColourHover'] ?? '' );
	$panel_text_hover_gradient  = (string) ( $attributes['panelTextColourHoverGradient'] ?? '' );
	$panel_text_hover_effective = sgs_resolve_text_colour_or_gradient( $panel_text_hover, $panel_text_hover_gradient );
	if ( '' !== $panel_text_hover_effective ) {
		$panel_text_hover_decl = sgs_text_colour_decl( $panel_text_hover_effective );
		if ( '' !== $panel_text_hover_decl ) {
			$scoped_css[] = sgs_hover_state_rules( $panel_sel, $panel_text_hover_decl );
		}
		$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $panel_sel . ':hover', $panel_text_hover_effective );
	}
}

// Trigger pill (Wave B, U-1): background via the same HAND-BUILT ::after
// reasoning as badge/panel above (`.sgs-cart__trigger` is already
// `position:relative` in style.css, so the ::after has a positioning context
// without this code adding one). pillTextColour styles the LABEL only — the
// count beside it keeps reading badgeTextColour/badgeTextColourGradient
// (same badge element, restyled for the pill by style.css). Border-colour is
// flat-only (no gradient sibling); border-radius always emits so an operator
// starts from the draft's fully-rounded default without a manual set.
if ( 'pill' === $trigger_style ) {
	$pill_sel       = $sel . ' .sgs-cart__trigger';
	$pill_label_sel = $sel . ' .sgs-cart__pill-label';

	$pill_bg_gradient = (string) ( $attributes['pillBgColourGradient'] ?? '' );
	$pill_bg_paint    = sgs_background_paint_decl( $pill_bg_colour, $pill_bg_gradient );
	if ( '' !== $pill_bg_paint ) {
		$scoped_css[] = $pill_sel . '::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;' . $pill_bg_paint . ';}';
	}

	$pill_text_gradient  = (string) ( $attributes['pillTextColourGradient'] ?? '' );
	$pill_text_effective = sgs_resolve_text_colour_or_gradient( $pill_text_colour, $pill_text_gradient );
	if ( '' !== $pill_text_effective ) {
		$pill_text_decl = sgs_text_colour_decl( $pill_text_effective );
		if ( '' !== $pill_text_decl ) {
			$scoped_css[] = $pill_label_sel . '{' . $pill_text_decl . ';}';
		}
		$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $pill_label_sel, $pill_text_effective );
	}

	// Border (width, style, colour, radius at three tiers) through the shared
	// assembler. Printed before the typography and min-height rules below.
	$pill_border = sgs_border_element_decls(
		$attributes,
		'pill',
		$pill_sel,
		array(
			'colour' => array(
				'base' => 'pillBorderColour',
			),
		)
	);
	if ( $pill_border['base'] ) {
		$scoped_css[] = $pill_sel . '{' . implode( ';', $pill_border['base'] ) . ';}';
	}
	if ( $pill_border['tablet'] ) {
		$scoped_css[] = '@media(max-width:1023px){' . $pill_sel . '{' . implode( ';', $pill_border['tablet'] ) . ';}}';
	}
	if ( $pill_border['mobile'] ) {
		$scoped_css[] = '@media(max-width:767px){' . $pill_sel . '{' . implode( ';', $pill_border['mobile'] ) . ';}}';
	}
	$scoped_css = array_merge( $scoped_css, $pill_border['rules'] );

	// Scalar length (Spec 32 S7): sgs_css_length_value() sanitises and passes
	// the value through with its own unit; empty leaves style.css's own
	// border-radius:999px default in place (no override emitted).
	// Pill text (size, weight, letter spacing, capitals) through the shared
	// typography helper; unset keeps style.css's defaults.
	$pill_typo_css = sgs_typography_css_rule( $attributes, 'pill', $pill_sel );
	if ( '' !== $pill_typo_css ) {
		$scoped_css[] = $pill_typo_css;
	}

	// Height floor per device (pillMinHeight). Unset keeps the 44px
	// touch-target default in style.css; a design may set a slimmer pill.
	if ( is_array( $attributes['pillMinHeight'] ?? null ) && ! empty( $attributes['pillMinHeight'] ) ) {
		$pill_min_height_css = sgs_emit_responsive_css(
			$pill_sel,
			array(
				array(
					'value'        => $attributes['pillMinHeight'],
					'css'          => 'min-height',
					'unit_default' => 'px',
				),
			)
		);
		if ( '' !== $pill_min_height_css ) {
			$scoped_css[] = $pill_min_height_css;
		}
	}

	// Hover and keyboard focus: the fill on the same ::after layer as the
	// resting fill (created here when only a hover fill is set), and the label
	// colour. Touch-safe through sgs_hover_state_rules().
	$pill_bg_hover_paint = sgs_background_paint_decl(
		(string) ( $attributes['pillBgColourHover'] ?? '' ),
		(string) ( $attributes['pillBgColourHoverGradient'] ?? '' )
	);
	if ( '' !== $pill_bg_hover_paint ) {
		if ( '' === $pill_bg_paint ) {
			$scoped_css[] = $pill_sel . '::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;}';
		}
		$scoped_css[] = $pill_sel . '::after{transition:background-color .25s ease;}';
		$scoped_css[] = sgs_hover_state_rules( $pill_sel, $pill_bg_hover_paint, ':focus-visible', '::after' );
	}
	$pill_text_hover = sgs_resolve_text_colour_or_gradient(
		(string) ( $attributes['pillTextColourHover'] ?? '' ),
		(string) ( $attributes['pillTextColourHoverGradient'] ?? '' )
	);
	if ( '' !== $pill_text_hover ) {
		$pill_text_hover_decl = sgs_text_colour_decl( $pill_text_hover );
		if ( '' !== $pill_text_hover_decl ) {
			$scoped_css[] = $pill_label_sel . '{transition:color .25s ease;}';
			$scoped_css[] = sgs_hover_state_rules( $pill_sel, $pill_text_hover_decl, ':focus-visible', ' .sgs-cart__pill-label' );
		}
	}
}

// Free-delivery progress bar (Wave B, U-2) — track/fill are flat colours
// only (no gradient sibling, mirrors pillBorderColour's simplification
// above); the element these target is inserted by panel-render.js, so the
// selector only ever matches once the operator has opened the panel.
// Track colour is fed as the --sgs-cart-free-delivery-track custom property
// (set on the panel element below) that style.css::.sgs-cart__free-delivery-track
// consumes via var(--sgs-cart-free-delivery-track, <default>) — the sanctioned
// overridable-default pattern (check-hardcoded-render-defaults.js F3).
if ( $has_panel && '' !== $free_delivery_fill_colour ) {
	$scoped_css[] = '.' . $uid . '.sgs-cart__panel .sgs-cart__free-delivery-fill{background-color:' . sgs_colour_value( $free_delivery_fill_colour ) . ';}';
}
if ( $has_panel ) {
	$sgs_cart_fd_easings  = array(
		'smooth'      => 'cubic-bezier(.2,.7,.2,1)',
		'ease'        => 'ease',
		'ease-in-out' => 'ease-in-out',
		'linear'      => 'linear',
	);
	$sgs_cart_fd_easing   = $sgs_cart_fd_easings[ $attributes['freeDeliveryFillEasing'] ?? 'smooth' ] ?? $sgs_cart_fd_easings['smooth'];
	$sgs_cart_fd_duration = is_numeric( $attributes['freeDeliveryFillDuration'] ?? null ) ? max( 0.0, min( 3.0, (float) $attributes['freeDeliveryFillDuration'] ) ) : 0.6;
	$scoped_css[]         = '.' . $uid . '.sgs-cart__panel{--sgs-cart-free-delivery-duration:' . $sgs_cart_fd_duration . 's;--sgs-cart-free-delivery-easing:' . $sgs_cart_fd_easing . ';}';
}
if ( $has_panel && '' !== $free_delivery_track_colour ) {
	$scoped_css[] = '.' . $uid . '.sgs-cart__panel{--sgs-cart-free-delivery-track:' . sgs_colour_value( $free_delivery_track_colour ) . ';}';
}

// The panel's own design settings (heading, rows, footer, buttons, motion),
// scoped to the panel element for the same reason as the colours above.
if ( $has_panel ) {
	foreach ( sgs_cart_panel_css( $attributes, $uid, 'drawer' === $effective_mode ) as $sgs_cart_panel_rule ) {
		$scoped_css[] = $sgs_cart_panel_rule;
	}
}

// ── Media-element atom layer (rule 37-media-no-handroll fix) — item-thumbnail
// object-fit only. The thumbnail <img> itself is added to the DOM later by
// panel-render.js/item-row-template.js (Store API hydration), never by this
// file — but the CSS custom property is set here, on the PHP-rendered wrapper
// ($uid is already a class on it, see $wrapper_classes above), and inherits
// down to the .sgs-media-el marker item-row-template.js appends regardless of
// when that element is inserted. `class_exists()` guards a class the plugin
// loader always registers; kept for the same "never fatal if load order
// changes" reason sgs/gallery/sgs/hero guard it.
if ( $has_panel && class_exists( 'SGS_Media_Element' ) ) {
	$sgs_cart_media_css = SGS_Media_Element::style(
		$attributes,
		'',
		'sgs/cart',
		$uid,
		array( 'object-fit' )
	);
	if ( '' !== $sgs_cart_media_css ) {
		$scoped_css[] = $sgs_cart_media_css;
	}
}
