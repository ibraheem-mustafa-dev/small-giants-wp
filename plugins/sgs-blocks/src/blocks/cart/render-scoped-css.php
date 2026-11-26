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
// background. The badge takes no pointer events (style.css), so its hover
// colour shows while the cart button holding it is hovered or focused.
$badge_text_hover           = (string) ( $attributes['badgeTextColourHover'] ?? '' );
$badge_text_hover_gradient  = (string) ( $attributes['badgeTextColourHoverGradient'] ?? '' );
$badge_text_hover_effective = sgs_resolve_text_colour_or_gradient( $badge_text_hover, $badge_text_hover_gradient );
if ( '' !== $badge_text_hover_effective ) {
	$badge_trigger_sel     = $sel . ' .sgs-cart__trigger';
	$badge_text_hover_decl = sgs_text_colour_decl( $badge_text_hover_effective );
	if ( '' !== $badge_text_hover_decl ) {
		$scoped_css[] = sgs_hover_state_rules( $badge_trigger_sel, $badge_text_hover_decl, ':focus-visible', ' .sgs-cart__badge' );
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $badge_trigger_sel . ':hover .sgs-cart__badge', $badge_text_hover_effective );
}

// Badge count text (size, weight) through the shared typography helper, for the
// icon trigger's overlay badge and the pill's bubble. A plain pill count inherits
// the pill label's own typography (style.css), so it is left out there.
// A mixed block applies it in the icon tiers only (a plain pill count keeps the label's typography there).
$badge_is_bubble = 'bubble' === ( $attributes['pillCountStyle'] ?? 'plain' );
if ( ( ! $trigger_mixed && ( 'pill' !== $trigger_style || $badge_is_bubble ) ) || ( $trigger_mixed && $badge_is_bubble ) ) {
	$badge_typo_css = sgs_typography_css_rule( $attributes, 'badge', $badge_sel, '', false, false, sgs_object_attr_keys( $block ) );
	if ( '' !== $badge_typo_css ) {
		$scoped_css[] = $badge_typo_css;
	}
} elseif ( $trigger_mixed ) {
	$badge_typo_css = sgs_typography_css_rule( $attributes, 'badge', $badge_sel, '', false, false, sgs_object_attr_keys( $block ) );
	if ( '' !== $badge_typo_css ) {
		foreach ( $trigger_ranges['icon'] as $icon_range ) {
			$scoped_css[] = '@media ' . $icon_range . '{' . $badge_typo_css . '}';
		}
	}
}

// Badge size per breakpoint: the icon overlay badge (badgeSize) and the pill's count bubble (pillBadgeSize) each feed their
// own custom property, which style.css reads with the old fixed size as the fallback. Unset prints nothing.
foreach ( array(
	'badgeSize'     => '--sgs-cart-badge-size',
	'pillBadgeSize' => '--sgs-cart-pill-badge-size',
) as $sgs_cart_badge_size_attr => $sgs_cart_badge_size_prop ) {
	if ( is_array( $attributes[ $sgs_cart_badge_size_attr ] ?? null ) && ! empty( $attributes[ $sgs_cart_badge_size_attr ] ) ) {
		$sgs_cart_badge_size_css = sgs_emit_responsive_css(
			$sel,
			array(
				array(
					'value'        => $attributes[ $sgs_cart_badge_size_attr ],
					'css'          => $sgs_cart_badge_size_prop,
					'unit_default' => 'px',
				),
			)
		);
		if ( '' !== $sgs_cart_badge_size_css ) {
			$scoped_css[] = $sgs_cart_badge_size_css;
		}
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
	// An unset fill, or a palette colour the site does not define, paints the page's surface (never currentColor, the
	// shared colour helper's fallback, which painted the panel in its own text colour): sgs_cart_panel_bg_paint().
	$panel_bg_paint    = sgs_cart_panel_bg_paint( $panel_bg_slug, $panel_bg_gradient );
	$scoped_css[]      = $panel_sel . '::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;' . $panel_bg_paint . ';}';
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

// Trigger pill (Wave B, U-1): the pill's own background, text, border and shadow. The background is the HAND-BUILT ::after layer
// of the badge and panel above (`.sgs-cart__trigger` is already `position:relative` in style.css). pillTextColour styles the LABEL
// only — the count beside it keeps reading badgeTextColour/badgeTextColourGradient (same badge element, restyled for the pill by
// style.css). Border-colour is flat-only (no gradient sibling). The trigger's radius, size and padding are shared with the icon
// button and print below; the icon button keeps its own background (iconBg*), because a colour is not per device.
if ( $trigger_has_pill ) {
	// Every pill rule below is collected, then wrapped in the pill tiers' media ranges when the styles are mixed.
	$pill_rules_start = count( $scoped_css );
	$pill_sel       = $sel . ' .sgs-cart__trigger';
	$pill_label_sel = $sel . ' .sgs-cart__pill-label';

	$pill_bg_gradient = (string) ( $attributes['pillBgColourGradient'] ?? '' );
	$pill_bg_paint    = sgs_background_paint_decl( (string) ( $attributes['pillBgColour'] ?? '' ), $pill_bg_gradient );
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
	// assembler. Printed before the typography rule below.
	// The corner radius is the trigger's own, shared with the icon button (below), so the pill's border call leaves it out.
	$pill_border = sgs_border_element_decls(
		$attributes,
		'pill',
		$pill_sel,
		array(
			'colour' => array(
				'base' => 'pillBorderColour',
			),
			'radius' => false,
		)
	);
	if ( $pill_border['base'] ) {
		$scoped_css[] = $pill_sel . '{' . implode( ';', $pill_border['base'] ) . ';}';
	}
	if ( $pill_border['tablet'] ) {
		$scoped_css[] = sgs_emit_tier_decls( $pill_sel, array( 'tablet' => $pill_border['tablet'] ) );
	}
	if ( $pill_border['mobile'] ) {
		$scoped_css[] = sgs_emit_tier_decls( $pill_sel, array( 'mobile' => $pill_border['mobile'] ) );
	}
	$scoped_css = array_merge( $scoped_css, $pill_border['rules'] );

	// Pill text (size, weight, letter spacing, capitals) through the shared
	// typography helper; unset keeps style.css's defaults.
	$pill_typo_css = sgs_typography_css_rule( $attributes, 'pill', $pill_sel, '', false, false, sgs_object_attr_keys( $block ) );
	if ( '' !== $pill_typo_css ) {
		$scoped_css[] = $pill_typo_css;
	}

	// Hover and keyboard focus: the fill on the same ::after layer as the resting fill (created here when only a hover fill is
	// set), and the label colour. Touch-safe through sgs_hover_state_rules().
	$pill_bg_hover_paint = sgs_background_paint_decl(
		(string) ( $attributes['pillBgColourHover'] ?? '' ),
		(string) ( $attributes['pillBgColourHoverGradient'] ?? '' )
	);
	if ( '' !== $pill_bg_hover_paint ) {
		if ( '' === $pill_bg_paint ) {
			$scoped_css[] = $pill_sel . '::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;}';
		}
		$scoped_css[] = $pill_sel . '::after{transition:background-color var(--wp--custom--duration--fast, .25s) var(--wp--custom--easing--ease, ease);}';
		$scoped_css[] = sgs_hover_state_rules( $pill_sel, $pill_bg_hover_paint, ':focus-visible', '::after' );
	}
	$pill_text_hover = sgs_resolve_text_colour_or_gradient(
		(string) ( $attributes['pillTextColourHover'] ?? '' ),
		(string) ( $attributes['pillTextColourHoverGradient'] ?? '' )
	);
	if ( '' !== $pill_text_hover ) {
		$pill_text_hover_decl = sgs_text_colour_decl( $pill_text_hover );
		if ( '' !== $pill_text_hover_decl ) {
			$scoped_css[] = $pill_label_sel . '{transition:color var(--wp--custom--duration--fast, .25s) var(--wp--custom--easing--ease, ease);}';
			$scoped_css[] = sgs_hover_state_rules( $pill_sel, $pill_text_hover_decl, ':focus-visible', ' .sgs-cart__pill-label' );
		}
	}

	// Pill shadow (rest and hover) through the shared shadow composer; the focus system gets each shadow as
	// --sgs-focus-under. Printed only here, in the pill tiers, so an icon tier's focus ring never reads it.
	$pill_shadow        = sgs_shadow_decls(
		$attributes,
		array(
			'base'         => 'pillShadow',
			'colour'       => 'pillShadowColour',
			'hover'        => 'pillShadowHover',
			'hover_colour' => 'pillShadowColourHover',
		),
		'sgs/cart'
	);
	$pill_shadow_normal = sgs_focus_under_decls( $pill_shadow['normal'] );
	if ( $pill_shadow_normal ) {
		$scoped_css[] = $pill_sel . '{' . implode( ';', $pill_shadow_normal ) . ';}';
	}
	$pill_shadow_hover = sgs_focus_under_decls( $pill_shadow['hover'] );
	if ( $pill_shadow_hover ) {
		$scoped_css[] = sgs_hover_state_rules( $pill_sel, implode( ';', $pill_shadow_hover ) );
	}

	if ( $trigger_mixed ) {
		$pill_rules = array_splice( $scoped_css, $pill_rules_start );
		foreach ( $trigger_ranges['pill'] as $pill_range ) {
			$scoped_css[] = '@media ' . $pill_range . '{' . implode( '', $pill_rules ) . '}';
		}
	}
}

// The trigger's shared look: corner radius, padding and size. The icon button and the text pill are one element and each device
// shows one of them, so these print once for whichever style a device shows. The backgrounds stay separate: the pill's prints in
// the pill block above, the icon button's below, each only in its own style's devices.
$trigger_sel = $sel . ' .sgs-cart__trigger';

$trigger_radius = sgs_css_length_value( (string) ( $attributes['triggerBorderRadius'] ?? '' ) );
if ( '' !== $trigger_radius ) {
	$scoped_css[] = $trigger_sel . '{border-radius:' . $trigger_radius . ';}';
}

// Padding per breakpoint (box with presets); unset keeps style.css's own padding for the style the device shows.
$trigger_padding_tiers = sgs_responsive_normalise_object( $attributes['triggerPadding'] ?? null, true );
foreach ( $sgs_cart_tier_keys as $sgs_cart_pad_tier ) {
	$trigger_padding_decls = sgs_box_object_longhands( $trigger_padding_tiers[ $sgs_cart_pad_tier ] ?? null, 'padding' );
	if ( null === $trigger_padding_decls ) {
		continue;
	}
	$trigger_padding_rule = $trigger_sel . '{' . $trigger_padding_decls . ';}';
	$scoped_css[]         = '' === $sgs_cart_tier_media[ $sgs_cart_pad_tier ] ? $trigger_padding_rule : $sgs_cart_tier_media[ $sgs_cart_pad_tier ] . '{' . $trigger_padding_rule . '}';
}

// Size per breakpoint, in lengths or spacing presets, printed as saved (no floor: a swept pill height of 20px or 0 must render as it
// did before the sweep, and a control's size fits its own shape). An icon device takes the width and the height; a text pill's width
// follows its label, so a pill device takes the height only.
$trigger_size_tiers = sgs_responsive_normalise_object( $attributes['triggerSize'] ?? null );
$trigger_size_own   = array();
foreach ( $sgs_cart_tier_keys as $sgs_cart_tier_key ) {
	$trigger_size_box = is_array( $trigger_size_tiers[ $sgs_cart_tier_key ] ?? null ) ? $trigger_size_tiers[ $sgs_cart_tier_key ] : array();
	foreach ( array( 'width', 'height' ) as $trigger_size_side ) {
		$trigger_size_len = sgs_icon_length_value( $trigger_size_box[ $trigger_size_side ] ?? '', 640 );
		if ( '' !== $trigger_size_len ) {
			$trigger_size_own[ $sgs_cart_tier_key ][ $trigger_size_side ] = $trigger_size_len;
		}
	}
}
$trigger_size_decls = static function ( array $size, string $style ): string {
	$decls = '';
	if ( 'pill' !== $style && isset( $size['width'] ) ) {
		$decls .= 'min-width:' . $size['width'] . ';';
	}
	if ( isset( $size['height'] ) ) {
		$decls .= 'min-height:' . $size['height'] . ';';
	}
	return $decls;
};
if ( $trigger_mixed ) {
	// Each breakpoint takes its own size, or the one inherited from the breakpoint above, in the style it shows.
	$trigger_size_seen = array();
	foreach ( array(
		'desktop' => 'lg',
		'tablet'  => 'md',
		'mobile'  => 'sm',
	) as $sgs_cart_tier_key => $sgs_cart_tier_lg ) {
		$trigger_size_seen = array_merge( $trigger_size_seen, $trigger_size_own[ $sgs_cart_tier_key ] ?? array() );
		$trigger_size_css  = $trigger_size_decls( $trigger_size_seen, $trigger_tiers[ $sgs_cart_tier_lg ] );
		if ( '' !== $trigger_size_css ) {
			$scoped_css[] = '@media ' . $sgs_cart_tier_ranges[ $sgs_cart_tier_key ] . '{' . $trigger_sel . '{' . $trigger_size_css . '}}';
		}
	}
} else {
	foreach ( $trigger_size_own as $sgs_cart_tier_key => $trigger_size_box ) {
		$trigger_size_css = $trigger_size_decls( $trigger_size_box, $trigger_style );
		if ( '' === $trigger_size_css ) {
			continue;
		}
		$trigger_size_rule = $trigger_sel . '{' . $trigger_size_css . '}';
		$scoped_css[]      = '' === $sgs_cart_tier_media[ $sgs_cart_tier_key ] ? $trigger_size_rule : $sgs_cart_tier_media[ $sgs_cart_tier_key ] . '{' . $trigger_size_rule . '}';
	}
}

// Icon button background (normal and hover) on the trigger's own ::after layer, the pill's and badge's pattern, so a stroke gradient
// on the glyph never meets background-clip:text. Printed bare in a block with one icon trigger style, and inside each icon media
// range in a mixed block, so a device showing the pill never paints it (the pill's fill is pillBgColour). The trigger is its own
// stacking context so the layer sits behind the glyph, not the page.
if ( in_array( 'icon', $trigger_tiers, true ) ) {
	$icon_bg_fill = sgs_fill_decls(
		$attributes,
		array(
			'base'           => 'iconBg',
			'gradient'       => 'iconBgGradient',
			'hover'          => 'iconBgHover',
			'hover_gradient' => 'iconBgHoverGradient',
		)
	);
	if ( $icon_bg_fill['normal'] || $icon_bg_fill['hover'] ) {
		$icon_bg_rules   = array();
		$icon_bg_rules[] = $trigger_sel . '{isolation:isolate;}';
		$icon_bg_rules[] = $trigger_sel . '::after{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;' . implode( ';', $icon_bg_fill['normal'] ) . ';}';
		if ( $icon_bg_fill['hover'] ) {
			$icon_bg_rules[] = $trigger_sel . '::after{transition:background-color var(--wp--custom--duration--fast, .25s) var(--wp--custom--easing--ease, ease);}';
			$icon_bg_rules[] = sgs_hover_state_rules( $trigger_sel, implode( ';', $icon_bg_fill['hover'] ), ':focus-visible', '::after' );
		}
		if ( $trigger_mixed ) {
			foreach ( $trigger_ranges['icon'] as $icon_bg_range ) {
				$scoped_css[] = '@media ' . $icon_bg_range . '{' . implode( '', $icon_bg_rules ) . '}';
			}
		} else {
			$scoped_css = array_merge( $scoped_css, $icon_bg_rules );
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

// A close size set at a tier overrules the close button's 44px tap floor at that tier: the button wraps the glyph
// panelCloseSize sizes (ruling 11). The flag prints in the same tier rule shape as the size it follows.
if ( $has_panel ) {
	$sgs_cart_close_tiers = sgs_responsive_normalise_object( $attributes['panelCloseSize'] ?? null, false );
	foreach ( array(
		'desktop' => '',
		'tablet'  => SGS_Breakpoints::media( 'tablet' ),
		'mobile'  => SGS_Breakpoints::media( 'mobile' ),
	) as $sgs_cart_close_tier => $sgs_cart_close_media ) {
		$sgs_cart_close_size = $sgs_cart_close_tiers[ $sgs_cart_close_tier ] ?? null;
		if ( null === $sgs_cart_close_size || '' === $sgs_cart_close_size || '' === sgs_css_length_value( is_numeric( $sgs_cart_close_size ) ? $sgs_cart_close_size . 'px' : (string) $sgs_cart_close_size ) ) {
			continue;
		}
		$sgs_cart_close_rule = '.' . $uid . '.sgs-cart__panel{--sgs-cart-close-tap-min:0px;}';
		$scoped_css[]        = $sgs_cart_close_media ? $sgs_cart_close_media . '{' . $sgs_cart_close_rule . '}' : $sgs_cart_close_rule;
	}
}

// The panel's own design settings (heading, rows, footer, buttons, motion),
// scoped to the panel element for the same reason as the colours above.
if ( $has_panel ) {
	foreach ( sgs_cart_panel_css( $attributes, $uid, 'drawer' === $effective_mode ) as $sgs_cart_panel_rule ) {
		$scoped_css[] = $sgs_cart_panel_rule;
	}
}

// ── Item-thumbnail Fit (Spec 49 §10.4: a small fixed thumbnail keeps its own attributes). The thumbnail <img> is added
// to the DOM later by panel-render.js/item-row-template.js (Store API hydration), never by this file, so the rule is
// scoped to the PHP-rendered wrapper ($uid is already a class on it, see $wrapper_classes above) and matches the
// thumbnail whenever it is inserted.
require_once dirname( __DIR__, 3 ) . '/includes/media/fixed-thumb-fit.php';
if ( $has_panel ) {
	$sgs_cart_media_css = sgs_fixed_thumb_fit_css( $attributes, 'sgs/cart', '.' . $uid . ' .sgs-cart__item-thumb' );
	if ( '' !== $sgs_cart_media_css ) {
		$scoped_css[] = $sgs_cart_media_css;
	}
}
