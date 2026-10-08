<?php
/**
 * Server-side render for the SGS Google Rating Badge block.
 *
 * One link (or a plain span when there is no https URL) holding, in fixed order: the Google "G",
 * the score, the stars and the caption. The score always sits between the G and the stars.
 *
 * NO-INLINE: this block emits zero inline style declarations (Spec 32). Every per-instance value
 * goes into the scoped <style> built below. This file defines no functions: the helpers are in
 * google-rating-badge-helpers.php (a second render would fatal on a redeclared function).
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Inner block content (unused).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-reviews-inline.php';
require_once dirname( __DIR__ ) . '/google-reviews/google-reviews-stars.php';
require_once __DIR__ . '/google-rating-badge-helpers.php';

$grb_data = sgs_grb_resolve( $attributes );
if ( null === $grb_data ) {
	// Nothing real to show: no figures are ever invented.
	return;
}

$grb_preset = (string) ( $attributes['badgeStyle'] ?? 'pill' );
if ( ! in_array( $grb_preset, array( 'pill', 'card', 'stacked' ), true ) ) {
	$grb_preset = 'pill';
}
$grb_synced   = 'synced' === $grb_data['source'];
$grb_rating   = $grb_data['rating'];
$grb_count    = $grb_data['count'];
$grb_url      = $grb_data['url'];
$grb_position = 'floating' === ( $attributes['position'] ?? 'static' ) ? 'floating' : 'static';
$grb_corner   = (string) ( $attributes['floatingCorner'] ?? 'bottom-right' );
if ( ! in_array( $grb_corner, array( 'bottom-right', 'bottom-left', 'top-right', 'top-left' ), true ) ) {
	$grb_corner = 'bottom-right';
}
$grb_align = (string) ( $attributes['alignment'] ?? 'start' );
if ( ! in_array( $grb_align, array( 'start', 'center', 'end' ), true ) ) {
	$grb_align = 'start';
}

// ---------------------------------------------------------------------------
// Caption: "15 reviews" and the source. Live Google data must carry the text
// "Google Maps" (Places API policy): that source text is always shown and is
// not hidden by compact mode. For written data the preset decides the default.
// ---------------------------------------------------------------------------
$grb_show_count = ! empty( $attributes['showCount'] ) && $grb_count > 0;
if ( $grb_synced ) {
	$grb_show_source = true;
} elseif ( isset( $attributes['showSource'] ) ) {
	$grb_show_source = (bool) $attributes['showSource'];
} else {
	$grb_show_source = 'pill' !== $grb_preset;
}

$grb_caption_html = '';
if ( $grb_show_count ) {
	$grb_caption_html .= '<span class="sgs-google-rating-badge__count">' . esc_html( sgs_grb_count_label( $grb_count ) ) . '</span>';
}
if ( $grb_show_source ) {
	$grb_source_text   = $grb_synced ? __( ' on Google Maps', 'sgs-blocks' ) : __( ' on Google', 'sgs-blocks' );
	$grb_caption_html .= '<span class="sgs-google-rating-badge__source">' . esc_html( $grb_source_text ) . '</span>';
}

// ---------------------------------------------------------------------------
// Accessible name: the visible pieces are aria-hidden and one visually hidden
// phrase carries the name, so it is read once.
// ---------------------------------------------------------------------------
$grb_name = trim( (string) ( $attributes['linkLabel'] ?? '' ) );
if ( '' === $grb_name ) {
	$grb_where = $grb_synced ? __( 'Google Maps', 'sgs-blocks' ) : __( 'Google', 'sgs-blocks' );
	if ( $grb_count > 0 ) {
		/* translators: 1: rating such as 4.7, 2: where it was rated (Google), 3: review count label such as "15 reviews". */
		$grb_name = sprintf( __( 'Rated %1$s out of 5 on %2$s from %3$s', 'sgs-blocks' ), number_format( $grb_rating, 1 ), $grb_where, sgs_grb_count_label( $grb_count ) );
	} else {
		/* translators: 1: rating such as 4.7, 2: where it was rated (Google). */
		$grb_name = sprintf( __( 'Rated %1$s out of 5 on %2$s', 'sgs-blocks' ), number_format( $grb_rating, 1 ), $grb_where );
	}
}

// ---------------------------------------------------------------------------
// Scoped CSS. The root selector is a CLASS so the wrapper's id stays free for
// the block's anchor support.
// ---------------------------------------------------------------------------
$grb_uid      = 'sgs-grb-' . substr( md5( (string) wp_json_encode( $attributes ) ), 0, 8 );
$grb_root_sel = '.' . $grb_uid . '.wp-block-sgs-google-rating-badge';
$grb_link_sel = $grb_root_sel . ' .sgs-google-rating-badge__link';
$grb_css      = array();

// Link frame: fill, border (width, style, colour, hover, radius at three tiers), shadow, size.
$grb_fill   = sgs_fill_decls(
	$attributes,
	array(
		'base'  => 'backgroundColour',
		'hover' => 'backgroundColourHover',
	)
);
$grb_border = sgs_border_element_decls(
	$attributes,
	'',
	$grb_link_sel,
	array(
		'colour' => array(
			'base'  => 'borderColour',
			'hover' => 'borderColourHover',
		),
	)
);

// The card and stacked presets rest on a subtle theme shadow; the shadow control overrides it, 'none' removes it.
$grb_shadow_attrs = $attributes;
if ( '' === (string) ( $grb_shadow_attrs['shadow'] ?? '' ) && 'pill' !== $grb_preset ) {
	$grb_shadow_attrs['shadow'] = 'whisper';
}
$grb_shadow = sgs_shadow_decls(
	$grb_shadow_attrs,
	array(
		'base'         => 'shadow',
		'colour'       => 'shadowColour',
		'hover_colour' => 'shadowColourHover',
	),
	'sgs/google-rating-badge'
);

$grb_min_height = (float) ( $attributes['minHeight'] ?? 0 );
$grb_padding    = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$grb_gap        = sgs_responsive_normalise_object( $attributes['gap'] ?? null, false );

$grb_normal = array_merge( $grb_fill['normal'], $grb_border['base'], $grb_shadow['normal'] );
if ( $grb_min_height > 0 ) {
	$grb_normal[] = 'min-height:' . rtrim( rtrim( number_format( $grb_min_height, 2, '.', '' ), '0' ), '.' ) . 'px';
}
$grb_padding_desktop = is_array( $grb_padding['desktop'] ?? null ) ? sgs_box_object_longhands( $grb_padding['desktop'], 'padding' ) : null;
if ( null !== $grb_padding_desktop ) {
	$grb_normal[] = $grb_padding_desktop;
}
$grb_gap_desktop = sgs_css_length_value( is_scalar( $grb_gap['desktop'] ?? null ) ? $grb_gap['desktop'] : '' );
if ( '' !== $grb_gap_desktop ) {
	$grb_normal[] = 'gap:' . $grb_gap_desktop;
}
$grb_hover = array_merge( $grb_fill['hover'], $grb_border['hover'], $grb_shadow['hover'] );

$grb_css[] = sgs_emit_state_colour_css( $grb_link_sel, $grb_normal, $grb_hover );
$grb_css   = array_merge( $grb_css, $grb_border['rules'] );

// Card: the 3px accent stripe on the leading edge is the link's ::before, painted as a fill (flat or gradient).
if ( 'card' === $grb_preset ) {
	$grb_stripe = sgs_fill_decls(
		$attributes,
		array(
			'base'     => 'accentStripeColour',
			'gradient' => 'accentStripeColourGradient',
		)
	);
	$grb_css[]  = sgs_emit_state_colour_css( $grb_link_sel . '::before', $grb_stripe['normal'], array() );
}

// Tablet (max 1023px) and mobile (max 767px) tiers: radius, padding, gap.
foreach ( array(
	'tablet' => '1023px',
	'mobile' => '767px',
) as $grb_tier => $grb_max ) {
	$grb_tier_decls = $grb_border[ $grb_tier ];
	$grb_pad        = is_array( $grb_padding[ $grb_tier ] ?? null ) ? sgs_box_object_longhands( $grb_padding[ $grb_tier ], 'padding' ) : null;
	if ( null !== $grb_pad ) {
		$grb_tier_decls[] = $grb_pad;
	}
	$grb_tier_gap = sgs_css_length_value( is_scalar( $grb_gap[ $grb_tier ] ?? null ) ? $grb_gap[ $grb_tier ] : '' );
	if ( '' !== $grb_tier_gap ) {
		$grb_tier_decls[] = 'gap:' . $grb_tier_gap;
	}
	if ( $grb_tier_decls ) {
		$grb_css[] = '@media(max-width:' . $grb_max . '){' . $grb_link_sel . '{' . implode( ';', $grb_tier_decls ) . ';}}';
	}
}

// Root custom properties: the star fill and, when floating, the offset from the corner at three tiers.
$grb_root_decls = array();
$grb_star       = sgs_colour_value( (string) ( $attributes['starColour'] ?? '' ) );
if ( '' !== $grb_star ) {
	$grb_root_decls[] = '--sgs-grb-star:' . $grb_star;
}

// A star gradient is an SVG <defs> gradient the filled star paths point at (fill: url(#id)).
$grb_star_gradient = (string) ( $attributes['starColourGradient'] ?? '' );
$grb_star_fill     = sgs_svg_stroke_gradient( $grb_star_gradient, $grb_uid . '-star-grad', 'fill' );
if ( '' !== $grb_star_fill['css'] ) {
	$grb_css[] = $grb_root_sel . ' .sgs-google-reviews__star--full path,' . $grb_root_sel . ' .sgs-google-reviews__star-fill{' . $grb_star_fill['css'] . ';}';
}
if ( 'floating' === $grb_position ) {
	$grb_offset         = sgs_responsive_normalise_object( $attributes['floatingOffset'] ?? null, false );
	$grb_offset_desktop = sgs_css_length_value( is_scalar( $grb_offset['desktop'] ?? null ) ? $grb_offset['desktop'] : '' );
	if ( '' !== $grb_offset_desktop ) {
		$grb_root_decls[] = '--sgs-grb-offset:' . $grb_offset_desktop;
	}
	foreach ( array(
		'tablet' => '1023px',
		'mobile' => '767px',
	) as $grb_tier => $grb_max ) {
		$grb_tier_offset = sgs_css_length_value( is_scalar( $grb_offset[ $grb_tier ] ?? null ) ? $grb_offset[ $grb_tier ] : '' );
		if ( '' !== $grb_tier_offset ) {
			$grb_css[] = '@media(max-width:' . $grb_max . '){' . $grb_root_sel . '{--sgs-grb-offset:' . $grb_tier_offset . ';}}';
		}
	}
}
if ( $grb_root_decls ) {
	$grb_css[] = $grb_root_sel . '{' . implode( ';', $grb_root_decls ) . ';}';
}

// Text colours and typography.
$grb_score_colour   = sgs_text_decls( $attributes, array( 'base' => 'scoreColour' ) );
$grb_caption_colour = sgs_text_decls( $attributes, array( 'base' => 'captionColour' ) );
$grb_css[]          = sgs_emit_state_colour_css( $grb_root_sel . ' .sgs-google-rating-badge__score', $grb_score_colour['normal'], array() );
$grb_css[]          = sgs_emit_state_colour_css( $grb_root_sel . ' .sgs-google-rating-badge__caption', $grb_caption_colour['normal'], array() );
$grb_css[]          = sgs_typography_css_rule( $attributes, 'score', $grb_root_sel . ' .sgs-google-rating-badge__score' );
$grb_css[]          = sgs_typography_css_rule( $attributes, 'caption', $grb_root_sel . ' .sgs-google-rating-badge__caption' );

// Compact mode below the chosen viewport width.
$grb_css[] = sgs_grb_compact_css( $grb_root_sel, (int) ( $attributes['compactBelow'] ?? 0 ), $grb_synced );

$grb_css = array_filter( $grb_css, 'strlen' );

// ---------------------------------------------------------------------------
// Markup.
// ---------------------------------------------------------------------------
$grb_root_classes = array(
	'sgs-google-rating-badge',
	'sgs-google-rating-badge--' . $grb_preset,
	'sgs-google-rating-badge--align-' . $grb_align,
	$grb_uid,
);
if ( ! empty( $attributes['fullWidth'] ) ) {
	$grb_root_classes[] = 'sgs-google-rating-badge--full-width';
}
if ( 'floating' === $grb_position ) {
	$grb_root_classes[] = 'sgs-google-rating-badge--floating';
	$grb_root_classes[] = 'sgs-google-rating-badge--corner-' . $grb_corner;
}
$grb_wrapper_attributes = get_block_wrapper_attributes( array( 'class' => implode( ' ', $grb_root_classes ) ) );

$grb_new_tab = '' !== $grb_url && ! empty( $attributes['openInNewTab'] );
$grb_tag     = '' !== $grb_url ? 'a' : 'span';
$grb_link    = '<' . $grb_tag . ' class="sgs-google-rating-badge__link"';
if ( '' !== $grb_url ) {
	$grb_link .= ' href="' . esc_url( $grb_url ) . '"';
	if ( $grb_new_tab ) {
		$grb_link .= ' target="_blank" rel="noopener noreferrer"';
	}
}
$grb_link .= '>';

$grb_logo_url = plugins_url( 'assets/google-logo.svg', SGS_BLOCKS_PATH . 'sgs-blocks.php' );

$grb_inner  = '<img class="sgs-google-rating-badge__logo" src="' . esc_url( $grb_logo_url ) . '" alt="" aria-hidden="true" width="24" height="24" decoding="async" />';
$grb_inner .= '<span class="sgs-google-rating-badge__score" aria-hidden="true">' . esc_html( number_format( $grb_rating, 1 ) ) . '</span>';
$grb_inner .= '<span class="sgs-google-rating-badge__stars" aria-hidden="true">' . sgs_render_stars_svg( $grb_rating, $grb_star_fill['defs'] ) . '</span>';
if ( '' !== $grb_caption_html ) {
	$grb_inner .= '<span class="sgs-google-rating-badge__caption" aria-hidden="true">' . $grb_caption_html . '</span>';
}
$grb_inner .= '<span class="sgs-sr-only">' . esc_html( $grb_name ) . '</span>';
if ( $grb_new_tab ) {
	$grb_inner .= '<span class="sgs-sr-only">' . esc_html__( ' (opens in a new tab)', 'sgs-blocks' ) . '</span>';
}

if ( $grb_css ) {
	// wp_strip_all_tags blocks a </style> breakout while leaving CSS combinators intact; every value above is pre-sanitised.
	echo '<style>' . wp_strip_all_tags( implode( '', $grb_css ) ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}
echo '<div ' . $grb_wrapper_attributes . '>' . $grb_link . $grb_inner . '</' . $grb_tag . '></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every part is escaped where built.
