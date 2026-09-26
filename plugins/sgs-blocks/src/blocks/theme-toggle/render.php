<?php
/**
 * Server-side render for sgs/theme-toggle.
 *
 * Design: .claude/reports/2026-09-26-u12-furniture-design.md §D.5.
 *
 * Renders NOTHING on the frontend (only an editor-facing HTML comment) when the site
 * has no derived dark palette (`settings.custom.dark` empty — see
 * scripts/derive-dark-palette.py and functions.php::dark_mode_mapping_css()). A toggle
 * with nothing to toggle would be a dead control.
 *
 * `toggleStyle:"switch"` renders a single `<button class="sgs-theme-toggle
 * sgs-dark-mode-toggle" aria-pressed="false">` — theme/sgs-theme/assets/js/dark-mode.js
 * flips light/dark on click and keeps `aria-pressed` in sync on every copy on the page.
 *
 * `toggleStyle:"segmented"` renders `<div role="radiogroup"><button role="radio"
 * data-sgs-theme-choice="light|dark|auto">…</button>×3</div>` — the same script wires
 * clicks and `aria-checked`.
 *
 * NO-INLINE (Spec 32): every declaration is emitted into the block's own scoped
 * `.{uid}` <style> tag.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML (unused — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/wp-icons.php';

// -----------------------------------------------------------------------------
// 0. Site-level gate — a site with no derived dark palette has nothing to toggle.
// -----------------------------------------------------------------------------

$sgs_tt_dark_custom = wp_get_global_settings( array( 'custom', 'dark' ) );
$sgs_tt_has_dark    = is_array( $sgs_tt_dark_custom ) && ! empty( $sgs_tt_dark_custom );

if ( ! $sgs_tt_has_dark ) {
	if ( is_admin() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		// Editor/REST context (block preview, autosave, etc.) — a comment only, so the
		// block stays selectable/editable while making clear why nothing paints.
		echo '<!-- sgs/theme-toggle: no derived dark palette for this site (settings.custom.dark is empty) — nothing rendered on the frontend. -->';
	}
	return;
}

// -----------------------------------------------------------------------------
// 1. Read + sanitise attributes.
// -----------------------------------------------------------------------------

$toggle_style = $attributes['toggleStyle'] ?? 'switch';
if ( ! in_array( $toggle_style, array( 'switch', 'segmented' ), true ) ) {
	// Negative-control path: an off-enum value falls back to 'switch' (D.5).
	$toggle_style = 'switch';
}

$label_text = isset( $attributes['label'] ) ? (string) $attributes['label'] : __( 'Dark mode', 'sgs-blocks' );
if ( '' === trim( $label_text ) ) {
	$label_text = __( 'Dark mode', 'sgs-blocks' );
}

// iconOnly — per-tier resolution uses the framework's null-means-inherit chain
// (Desktop concrete boolean, Tablet/Mobile override; see BooleanResponsiveControl
// and sgs/audio's toggleShowLabel for the same shape).
$icon_only_base = ! empty( $attributes['iconOnly'] );

$icon_only_tablet_raw = $attributes['iconOnlyTablet'] ?? null;
$icon_only_mobile_raw = $attributes['iconOnlyMobile'] ?? null;
// '' is the REST GET null-serialisation shim (addQueryArgs can't represent a
// real null) — treat identically to a real null (inherit the tier above).
$icon_only_tablet_inherits = ( null === $icon_only_tablet_raw || '' === $icon_only_tablet_raw );
$icon_only_mobile_inherits = ( null === $icon_only_mobile_raw || '' === $icon_only_mobile_raw );

$icon_only_tablet_effective = $icon_only_tablet_inherits ? $icon_only_base : (bool) $icon_only_tablet_raw;
$icon_only_mobile_effective = $icon_only_mobile_inherits ? $icon_only_tablet_effective : (bool) $icon_only_mobile_raw;

// -----------------------------------------------------------------------------
// 2. Icons (Light/Dark) — resolved server-side, same icon maps notice-banner uses.
// -----------------------------------------------------------------------------

/**
 * Resolve an {source,name} icon attribute to SVG/markup, matching notice-banner's
 * resolution switch. Inline here (no top-level function — this file is a block
 * render.php and a second require would fatal on a second block instance).
 */
$sgs_tt_resolve_icon = static function ( $icon ) {
	$source = is_array( $icon ) ? ( $icon['source'] ?? '' ) : '';
	$name   = is_array( $icon ) ? ( $icon['name'] ?? '' ) : '';
	if ( '' === $source || '' === $name ) {
		return '';
	}
	switch ( $source ) {
		case 'emoji':
			return esc_html( $name );
		case 'dashicon':
			$slug = preg_replace( '/[^a-z0-9-]/', '', strtolower( $name ) );
			wp_enqueue_style( 'dashicons' );
			return '<span class="dashicons dashicons-' . esc_attr( $slug ) . '"></span>';
		case 'wp-icon':
			return sgs_get_wp_icon( preg_replace( '/[^a-z0-9-]/', '', strtolower( $name ) ) );
		case 'lucide':
		default:
			return sgs_get_lucide_icon( preg_replace( '/[^a-z0-9-]/', '', strtolower( $name ) ) );
	}
};

$sgs_tt_icon_light_html = $sgs_tt_resolve_icon(
	$attributes['lightIcon'] ?? array(
		'source' => 'lucide',
		'name'   => 'sun',
	)
);
$sgs_tt_icon_dark_html  = $sgs_tt_resolve_icon(
	$attributes['darkIcon'] ?? array(
		'source' => 'lucide',
		'name'   => 'moon',
	)
);

// -----------------------------------------------------------------------------
// 3. Scoped CSS.
// -----------------------------------------------------------------------------

$uid       = wp_unique_id( 'sgs-theme-toggle-' );
$root_sel  = '.' . $uid . '.sgs-theme-toggle';
$label_sel = $root_sel . ' .sgs-theme-toggle__label';
$icon_sel  = $root_sel . ' .sgs-theme-toggle__icon';

$scoped_css = array();

// Label colour — base/hover/pressed ("current" = the toggle's own true/checked state).
$scoped_css[] = sgs_text_states_css(
	$label_sel,
	$attributes,
	array(
		'base'  => 'textColour',
		'hover' => 'textColourHover',
	)
);
$text_pressed = (string) ( $attributes['textColourPressed'] ?? '' );
if ( '' !== $text_pressed ) {
	// aria-pressed="true" / aria-checked="true" — sets the pressed/checked colour
	// without waiting on :hover/:focus.
	$scoped_css[] = $root_sel . '[aria-pressed="true"] .sgs-theme-toggle__label,'
		. $root_sel . '[aria-checked="true"] {color:' . sgs_colour_value( $text_pressed ) . ';}';
}

// Icon colour — base/hover. Painted via `color` (the icon markup's SVGs use
// stroke/fill:currentColor), so this is sgs_text_states_css() (a plain `color:`
// emitter), NOT sgs_fill_states_css() (which emits `background-color:`).
$scoped_css[] = sgs_text_states_css(
	$icon_sel,
	$attributes,
	array(
		'base'  => 'iconColour',
		'hover' => 'iconColourHover',
	)
);

// Background (button fill) — base/hover.
$scoped_css[] = sgs_fill_states_css(
	$root_sel,
	$attributes,
	array(
		'base'  => 'backgroundColour',
		'hover' => 'backgroundColourHover',
	)
);

// Typography (label element).
$scoped_css[] = sgs_typography_css_rule( $attributes, 'label', $label_sel );

// Padding — tier object {desktop,tablet,mobile}, base unconditional, tablet/mobile
// media-wrapped (mirrors notice-banner's own tier-object handling).
$sgs_padding_tiers   = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_padding_desktop = is_array( $sgs_padding_tiers['desktop'] ?? null ) ? $sgs_padding_tiers['desktop'] : array();
$sgs_padding_tablet  = is_array( $sgs_padding_tiers['tablet'] ?? null ) ? $sgs_padding_tiers['tablet'] : array();
$sgs_padding_mobile  = is_array( $sgs_padding_tiers['mobile'] ?? null ) ? $sgs_padding_tiers['mobile'] : array();

$sgs_padding_desktop_val = sgs_box_object_shorthand( $sgs_padding_desktop );
if ( null !== $sgs_padding_desktop_val ) {
	$scoped_css[] = $root_sel . '{padding:' . $sgs_padding_desktop_val . ';}';
}
$sgs_padding_tablet_val = sgs_box_object_shorthand( $sgs_padding_tablet );
if ( null !== $sgs_padding_tablet_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . $root_sel . '{padding:' . $sgs_padding_tablet_val . ';}}';
}
$sgs_padding_mobile_val = sgs_box_object_shorthand( $sgs_padding_mobile );
if ( null !== $sgs_padding_mobile_val ) {
	$scoped_css[] = '@media(max-width:767px){' . $root_sel . '{padding:' . $sgs_padding_mobile_val . ';}}';
}

// Border — width/style/colour (Shape B, matches notice-banner's own block-private pattern).
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

if ( 'none' !== $border_style && $has_border_width ) {
	$bwt          = '' !== $border_width_top ? $border_width_top : '0';
	$bwr          = '' !== $border_width_right ? $border_width_right : '0';
	$bwb          = '' !== $border_width_bottom ? $border_width_bottom : '0';
	$bwl          = '' !== $border_width_left ? $border_width_left : '0';
	$scoped_css[] = $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';

	$border_colour = (string) ( $attributes['borderColour'] ?? '' );
	if ( '' !== $border_colour ) {
		$scoped_css[] = $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
}

// Border radius — tier object.
$radius_tiers      = sgs_border_radius_tiers( $attributes );
$border_radius_obj = is_array( $radius_tiers['base'] ?? null ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$out = wp_style_engine_get_styles( array( 'border' => array( 'radius' => $border_radius_obj ) ), array( 'selector' => $root_sel ) );
	if ( ! empty( $out['css'] ) ) {
		$scoped_css[] = $out['css'];
	}
}

// -----------------------------------------------------------------------------
// 4. Wrapper classes — icon-only per tier (static classes, dark-mode.css owns the rules).
// -----------------------------------------------------------------------------

$wrapper_classes = array( 'sgs-theme-toggle', $uid );
if ( 'segmented' === $toggle_style ) {
	$wrapper_classes[] = 'sgs-theme-toggle--segmented';
}
if ( 'switch' === $toggle_style ) {
	$wrapper_classes[] = 'sgs-dark-mode-toggle';
	if ( $icon_only_base ) {
		$wrapper_classes[] = 'sgs-theme-toggle--icon-only';
	}
	if ( $icon_only_tablet_effective ) {
		$wrapper_classes[] = 'sgs-theme-toggle--icon-only-tablet';
	}
	if ( $icon_only_mobile_effective ) {
		$wrapper_classes[] = 'sgs-theme-toggle--icon-only-mobile';
	}
}

// -----------------------------------------------------------------------------
// 5. Markup.
// -----------------------------------------------------------------------------

$sgs_tt_label_html = sgs_label_roll_markup( $label_text, (string) ( $attributes['labelRoll'] ?? '' ) );

if ( 'switch' === $toggle_style ) {
	$inner  = '<span class="sgs-theme-toggle__icon sgs-icon-sun" aria-hidden="true">' . $sgs_tt_icon_light_html . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG from first-party icon maps; dashicon/emoji escaped above.
	$inner .= '<span class="sgs-theme-toggle__icon sgs-icon-moon" aria-hidden="true">' . $sgs_tt_icon_dark_html . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	$inner .= '<span class="sgs-theme-toggle__label">' . $sgs_tt_label_html . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_label_roll_markup() escapes its own text.

	$wrapper_attrs = get_block_wrapper_attributes(
		array(
			'class'        => implode( ' ', $wrapper_classes ),
			'type'         => 'button',
			'aria-pressed' => 'false',
		)
	);
	$output        = '<button ' . $wrapper_attrs . '>' . $inner . '</button>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
} else {
	$choices = array(
		'light' => __( 'Light', 'sgs-blocks' ),
		'dark'  => __( 'Dark', 'sgs-blocks' ),
		'auto'  => __( 'Auto', 'sgs-blocks' ),
	);
	$radios  = '';
	foreach ( $choices as $value => $choice_label ) {
		$radios .= '<button type="button" role="radio" aria-checked="false" data-sgs-theme-choice="' . esc_attr( $value ) . '">' . esc_html( $choice_label ) . '</button>';
	}

	$wrapper_attrs = get_block_wrapper_attributes(
		array(
			'class'      => implode( ' ', $wrapper_classes ),
			'role'       => 'radiogroup',
			'aria-label' => __( 'Colour scheme', 'sgs-blocks' ),
		)
	);
	$output        = '<div ' . $wrapper_attrs . '>' . $radios . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr()/esc_html() above.
}

$scoped_css = array_filter( $scoped_css, static fn( $css ) => '' !== $css );

if ( $scoped_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised by the shared emitters; wp_strip_all_tags guards </style>.
	echo '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';
}

echo $output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-sanitised HTML; other parts built from escaped/first-party pieces.
