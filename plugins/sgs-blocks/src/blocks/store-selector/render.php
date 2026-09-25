<?php
/**
 * Server-side render for sgs/store-selector.
 *
 * A trigger button (`[triggerPrefix] [flag] [current store label]`) plus a
 * disclosure list of every configured store. No-JS default: the list is
 * VISIBLE (no `hidden` attribute) so a visitor without JS still sees every
 * store link — view.js hides it behind the button and wires the toggle,
 * Escape-to-close-and-return-focus and outside-click-to-close.
 *
 * Current-store detection: the store whose URL host equals the request host
 * and whose path is the longest prefix of the request path, else the first
 * store — sgs_store_selector_match() in this block's own helpers.php (kept
 * WordPress-free so it is directly unit-testable).
 *
 * NO-INLINE: this block emits zero inline style property declarations
 * (Spec 32). Every declaration goes into the block's own scoped `<style>`
 * tag, built the same way as every other SGS block (contract §A/§B).
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML (unused — no InnerBlocks slot).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once __DIR__ . '/helpers.php';

// ---------------------------------------------------------------------------
// 1. Read + sanitise attributes.
// ---------------------------------------------------------------------------

$trigger_prefix = isset( $attributes['triggerPrefix'] ) ? (string) $attributes['triggerPrefix'] : '';
$stores_raw     = is_array( $attributes['stores'] ?? null ) ? $attributes['stores'] : array();
$panel_align    = ( isset( $attributes['panelAlign'] ) && 'end' === $attributes['panelAlign'] ) ? 'end' : 'start';

// Sanitise each store row (repeater — operator-entered, could carry anything).
$stores = array();
foreach ( $stores_raw as $row ) {
	if ( ! is_array( $row ) ) {
		continue;
	}
	$url = isset( $row['url'] ) ? esc_url_raw( (string) $row['url'] ) : '';
	if ( '' === $url ) {
		continue;
	}
	$stores[] = array(
		'label'   => isset( $row['label'] ) ? sanitize_text_field( (string) $row['label'] ) : '',
		'url'     => $url,
		'flagId'  => isset( $row['flagId'] ) ? absint( $row['flagId'] ) : 0,
		'flagUrl' => isset( $row['flagUrl'] ) ? esc_url_raw( (string) $row['flagUrl'] ) : '',
	);
}

// Nothing to render without at least one valid store link.
if ( empty( $stores ) ) {
	return;
}

// ---------------------------------------------------------------------------
// 2. Current-store detection (helpers.php::sgs_store_selector_match()).
// ---------------------------------------------------------------------------

$request_host = '';
if ( ! empty( $_SERVER['HTTP_HOST'] ) ) {
	$request_host = sanitize_text_field( wp_unslash( (string) $_SERVER['HTTP_HOST'] ) );
}
if ( '' === $request_host ) {
	$request_host = (string) wp_parse_url( home_url(), PHP_URL_HOST );
}
// Strip a port suffix (":8080") before comparing — store URLs are compared
// on host only, never host:port.
$request_host = strtolower( (string) preg_replace( '/:\d+$/', '', $request_host ) );

$request_path = '/';
if ( ! empty( $_SERVER['REQUEST_URI'] ) ) {
	$raw_uri      = sanitize_text_field( wp_unslash( (string) $_SERVER['REQUEST_URI'] ) );
	$parsed_path  = wp_parse_url( $raw_uri, PHP_URL_PATH );
	$request_path = ( null !== $parsed_path && '' !== $parsed_path ) ? $parsed_path : '/';
}

$current_store = sgs_store_selector_match( $stores, $request_host, $request_path );
if ( null === $current_store ) {
	$current_store = $stores[0];
}

// ---------------------------------------------------------------------------
// 3. Scoping + scoped CSS assembly.
// ---------------------------------------------------------------------------

$uid      = wp_unique_id( 'sgs-store-selector-' );
$root_sel = '.' . $uid . '.sgs-store-selector';

$trigger_sel = $root_sel . ' .sgs-store-selector__trigger';
$list_sel    = $root_sel . ' .sgs-store-selector__list';
$item_sel    = $root_sel . ' .sgs-store-selector__item';

$scoped_css = array();

// --- Typography (trigger + items share one scoped rule — the design note
// gives this block one typography row, not per-element). ---
$typography_css = sgs_typography_css_rule( $attributes, '', $root_sel );
if ( '' !== $typography_css ) {
	$scoped_css[] = $typography_css;
}

// --- Trigger text colour (base + hover). ---
$trigger_colour_css = sgs_text_states_css(
	$trigger_sel,
	$attributes,
	array(
		'base'  => 'triggerColour',
		'hover' => 'triggerColourHover',
	)
);
if ( '' !== $trigger_colour_css ) {
	$scoped_css[] = $trigger_colour_css;
}

// --- Item text colour (base + hover). ---
$item_colour_css = sgs_text_states_css(
	$item_sel,
	$attributes,
	array(
		'base'  => 'itemColour',
		'hover' => 'itemColourHover',
	)
);
if ( '' !== $item_colour_css ) {
	$scoped_css[] = $item_colour_css;
}

// --- Panel background. ---
$panel_fill_css = sgs_fill_states_css(
	$list_sel,
	$attributes,
	array( 'base' => 'panelBackground' )
);
if ( '' !== $panel_fill_css ) {
	$scoped_css[] = $panel_fill_css;
}

// --- Panel padding (tiered box, same pattern as every other SGS block). ---
$panel_padding_tiers   = sgs_responsive_normalise_object( $attributes['panelPadding'] ?? null, true );
$panel_padding_desktop = is_array( $panel_padding_tiers['desktop'] ?? null ) ? $panel_padding_tiers['desktop'] : array();
if ( ! empty( $panel_padding_desktop ) ) {
	$panel_padding_scoped = wp_style_engine_get_styles(
		array( 'spacing' => array( 'padding' => $panel_padding_desktop ) ),
		array( 'selector' => $list_sel )
	);
	if ( ! empty( $panel_padding_scoped['css'] ) ) {
		$scoped_css[] = $panel_padding_scoped['css'];
	}
}
$panel_padding_tab_val = sgs_box_object_shorthand( is_array( $panel_padding_tiers['tablet'] ?? null ) ? $panel_padding_tiers['tablet'] : array() );
$panel_padding_mob_val = sgs_box_object_shorthand( is_array( $panel_padding_tiers['mobile'] ?? null ) ? $panel_padding_tiers['mobile'] : array() );
if ( null !== $panel_padding_tab_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$list_sel}{padding:{$panel_padding_tab_val};}}";
}
if ( null !== $panel_padding_mob_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$list_sel}{padding:{$panel_padding_mob_val};}}";
}

// --- Gap (tiered scalar — items and the trigger's own internal gap). ---
$gap_tiers       = sgs_responsive_normalise_object( $attributes['gap'] ?? null, false );
$gap_desktop_val = sgs_css_length_value( is_scalar( $gap_tiers['desktop'] ?? null ) ? (string) $gap_tiers['desktop'] : '' );
if ( '' !== $gap_desktop_val ) {
	$scoped_css[] = "{$list_sel}{gap:{$gap_desktop_val};}{$trigger_sel}{gap:{$gap_desktop_val};}";
}
$gap_tab_val = sgs_css_length_value( is_scalar( $gap_tiers['tablet'] ?? null ) ? (string) $gap_tiers['tablet'] : '' );
$gap_mob_val = sgs_css_length_value( is_scalar( $gap_tiers['mobile'] ?? null ) ? (string) $gap_tiers['mobile'] : '' );
if ( '' !== $gap_tab_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$list_sel}{gap:{$gap_tab_val};}{$trigger_sel}{gap:{$gap_tab_val};}}";
}
if ( '' !== $gap_mob_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$list_sel}{gap:{$gap_mob_val};}{$trigger_sel}{gap:{$gap_mob_val};}}";
}

// --- Border (width/style on the panel, colour via the shared state
// emitter, radius via the style engine + hand-built tier shorthand — the
// same pattern sgs/social-icons uses for its wrapper border). ---
$border_style_raw = isset( $attributes['borderStyle'] ) ? sgs_css_keyword_sanitise( $attributes['borderStyle'] ) : 'solid';
$border_width_obj = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_rgt = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bot = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_lft = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width = ( '' !== $border_width_top || '' !== $border_width_rgt || '' !== $border_width_bot || '' !== $border_width_lft );

if ( 'none' !== $border_style_raw ) {
	$border_base_decls = array();
	if ( $has_border_width ) {
		$bwt                 = '' !== $border_width_top ? $border_width_top : '0';
		$bwr                 = '' !== $border_width_rgt ? $border_width_rgt : '0';
		$bwb                 = '' !== $border_width_bot ? $border_width_bot : '0';
		$bwl                 = '' !== $border_width_lft ? $border_width_lft : '0';
		$border_base_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
		if ( $border_style_raw && 'solid' !== $border_style_raw ) {
			$border_base_decls[] = 'border-style:' . $border_style_raw;
		}
	}
	if ( $border_base_decls ) {
		$scoped_css[] = "{$list_sel}{" . implode( ';', $border_base_decls ) . ';}';
	}

	$border_colour_css = sgs_border_states_css(
		$list_sel,
		$attributes,
		array(
			'base'           => 'borderColour',
			'hover'          => 'borderColourHover',
			'gradient'       => 'borderColourGradient',
			'hover_gradient' => 'borderColourHoverGradient',
			'width'          => $has_border_width && '' !== $border_width_top ? $border_width_top : '1px',
		)
	);
	if ( '' !== $border_colour_css ) {
		$scoped_css[] = $border_colour_css;
	}
}

$border_radius_tiers      = sgs_border_radius_tiers( $attributes );
$border_radius_base       = $border_radius_tiers['base'];
$border_radius_tablet_obj = $border_radius_tiers['tablet'];
$border_radius_mobile_obj = $border_radius_tiers['mobile'];
if ( null !== $border_radius_base ) {
	$border_radius_scoped = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_base ) ),
		array( 'selector' => $list_sel )
	);
	if ( ! empty( $border_radius_scoped['css'] ) ) {
		$scoped_css[] = $border_radius_scoped['css'];
	}
}
$border_radius_tab_val = sgs_corner_object_shorthand( $border_radius_tablet_obj );
$border_radius_mob_val = sgs_corner_object_shorthand( $border_radius_mobile_obj );
if ( null !== $border_radius_tab_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$list_sel}{border-radius:{$border_radius_tab_val};}}";
}
if ( null !== $border_radius_mob_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$list_sel}{border-radius:{$border_radius_mob_val};}}";
}

// --- Flag size (tiered {w,h}, helpers.php::sgs_store_selector_flag_size()). ---
$flag_size_tiers = sgs_responsive_normalise_object( $attributes['flagSize'] ?? null, true );
$flag_desktop    = sgs_store_selector_flag_size( $flag_size_tiers, 'desktop' );
$flag_tablet     = sgs_store_selector_flag_size( $flag_size_tiers, 'tablet' );
$flag_mobile     = sgs_store_selector_flag_size( $flag_size_tiers, 'mobile' );

$flag_img_sel = $root_sel . ' .sgs-store-selector__flag';
$scoped_css[] = "{$flag_img_sel}{width:{$flag_desktop['w']}px;height:{$flag_desktop['h']}px;}";
if ( $flag_tablet !== $flag_desktop ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$flag_img_sel}{width:{$flag_tablet['w']}px;height:{$flag_tablet['h']}px;}}";
}
if ( $flag_mobile !== $flag_tablet ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$flag_img_sel}{width:{$flag_mobile['w']}px;height:{$flag_mobile['h']}px;}}";
}

// ---------------------------------------------------------------------------
// 4. Markup.
// ---------------------------------------------------------------------------

$list_id = esc_attr( $uid . '-list' );

$wrapper_classes = array( 'sgs-store-selector', 'sgs-store-selector--panel-' . $panel_align, $uid );

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'id'    => $uid,
		'class' => implode( ' ', $wrapper_classes ),
	)
);

$output = '';

if ( $scoped_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised (style engine + sgs_css_length_value()/sgs_css_keyword_sanitise()); wp_strip_all_tags guards </style>.
	$output .= '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';
}

$output .= '<div ' . $wrapper_attrs . '>';

// Trigger button.
$output .= '<button type="button" class="sgs-store-selector__trigger" aria-expanded="false" aria-controls="' . $list_id . '">';
if ( '' !== $trigger_prefix ) {
	$output .= '<span class="sgs-store-selector__prefix">' . esc_html( $trigger_prefix ) . '</span>';
}
if ( '' !== $current_store['flagUrl'] ) {
	$output .= '<img class="sgs-store-selector__flag" src="' . esc_url( $current_store['flagUrl'] ) . '" alt="" width="' . esc_attr( (string) $flag_desktop['w'] ) . '" height="' . esc_attr( (string) $flag_desktop['h'] ) . '" loading="lazy" decoding="async">';
}
$output .= '<span class="sgs-store-selector__current">' . esc_html( $current_store['label'] ) . '</span>';
$output .= '</button>';

// Store list — VISIBLE by default (no `hidden`), so a no-JS visitor sees
// every store link. view.js hides it and wires the disclosure behaviour.
$output .= '<ul class="sgs-store-selector__list" id="' . $list_id . '">';
foreach ( $stores as $store ) {
	$is_current   = ( $store['url'] === $current_store['url'] );
	$item_classes = 'sgs-store-selector__item';
	$output      .= '<li class="' . esc_attr( $item_classes ) . '">';
	$output      .= '<a href="' . esc_url( $store['url'] ) . '"' . ( $is_current ? ' aria-current="true"' : '' ) . '>';
	if ( '' !== $store['flagUrl'] ) {
		$output .= '<img class="sgs-store-selector__flag" src="' . esc_url( $store['flagUrl'] ) . '" alt="" width="' . esc_attr( (string) $flag_desktop['w'] ) . '" height="' . esc_attr( (string) $flag_desktop['h'] ) . '" loading="lazy" decoding="async">';
	}
	$output .= '<span>' . esc_html( $store['label'] ) . '</span>';
	$output .= '</a>';
	$output .= '</li>';
}
$output .= '</ul>';

$output .= '</div>';

echo $output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from get_block_wrapper_attributes(), esc_html()/esc_url()/esc_attr(), and first-party CSS.
