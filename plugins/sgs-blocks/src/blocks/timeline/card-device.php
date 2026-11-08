<?php
/**
 * Timeline partial: the per-device look of a horizontal timeline's card strip (card layout, space between cards, card
 * shadow per device, a carousel card's own border, the image band height).
 *
 * Required by render.php, runs in its scope. Reads `$attributes`, `$orientation`, `$content_layout`, `$entry_sel`,
 * `$media_sel`, `$root_sel`; appends to `$scoped_css` and to `$wrapper_args['class']`. Nothing here prints unless one of
 * these settings is set.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// The image band height is a plain per-device length and applies to any entry image.
if ( ! empty( $attributes['mediaHeight'] ) && is_array( $attributes['mediaHeight'] ) ) {
	$cd_media_height = sgs_emit_responsive_css(
		$media_sel,
		array(
			array(
				'value'        => $attributes['mediaHeight'],
				'css'          => 'height',
				'unit_default' => 'px',
			),
			array(
				'value'     => $attributes['mediaHeight'],
				'css'       => 'aspect-ratio',
				'transform' => static function ( $raw ) {
					return '' === trim( (string) $raw ) ? '' : 'auto';
				},
			),
		)
	);
	if ( '' !== $cd_media_height ) {
		$scoped_css[] = $cd_media_height;
		$scoped_css[] = $media_sel . ' .sgs-timeline__media{height:100%;}';
		$scoped_css[] = $media_sel . '{overflow:hidden;}';
	}
}

if ( 'horizontal' !== $orientation ) {
	return;
}

// Card layout per device: 'stacked' puts the image on top and the date and text below it. The value of each device
// reads the nearest set value at or above it; 'side' (text beside the image) is the stylesheet's own layout and prints
// nothing. Only the Text beside image content layout has a card with an image side to stack.
if ( 'same-side' === $content_layout && ! empty( $attributes['cardLayout'] ) && is_array( $attributes['cardLayout'] ) ) {
	$cd_layout_tiers = sgs_responsive_normalise_object( $attributes['cardLayout'], false );
	$cd_ranges       = array(
		'desktop' => 'desktop',
		'tablet'  => 'tablet-only',
		'mobile'  => 'mobile',
	);
	$cd_effective    = 'side';
	foreach ( $cd_ranges as $cd_tier => $cd_range ) {
		$cd_raw = $cd_layout_tiers[ $cd_tier ] ?? null;
		if ( in_array( $cd_raw, array( 'side', 'stacked' ), true ) ) {
			$cd_effective = $cd_raw;
		}
		if ( 'stacked' !== $cd_effective ) {
			continue;
		}
		$cd_decls     = array(
			'display:grid',
			'grid-template-columns:minmax(0,1fr)',
			"grid-template-areas:'media' 'date' 'content'",
			// the date's own margins space the rows; the list layout's entry gap is for its date-beside-text row
			'row-gap:0',
			'--sgs-tl-card-display:grid',
			'--sgs-tl-card-cols:minmax(0,1fr)',
			"--sgs-tl-card-areas:'media' 'date' 'content'",
		);
		$scoped_css[] = SGS_Breakpoints::media( $cd_range ) . '{' . $entry_sel . '{' . implode( ';', $cd_decls ) . ';}}';
	}
}

// Space between cards per device: the real column gap of the card row and the custom property the swipeable layout's
// own gap reads.
if ( ! empty( $attributes['cardGap'] ) && is_array( $attributes['cardGap'] ) ) {
	$scoped_css[] = sgs_emit_responsive_css(
		$root_sel . ' .sgs-timeline__list',
		array(
			array(
				'value'        => $attributes['cardGap'],
				'css'          => 'column-gap',
				'unit_default' => 'px',
			),
			array(
				'value'        => $attributes['cardGap'],
				'css'          => '--sgs-tl-card-gap',
				'unit_default' => 'px',
			),
		)
	);
}

// Card shadow for tablet and mobile: the same shape and colour pair as `cardShadow`, printed at the tablet (1023px and
// below) and mobile (767px and below) widths; an unset mobile pair keeps the tablet one.
$cd_shadow_tiers = array();
foreach (
	array(
		'tablet' => array( 'cardShadowTablet', 'cardShadowTabletColour' ),
		'mobile' => array( 'cardShadowMobile', 'cardShadowMobileColour' ),
	) as $cd_tier => $cd_names
) {
	$cd_shadow = sgs_shadow_decls(
		$attributes,
		array(
			'base'   => $cd_names[0],
			'colour' => $cd_names[1],
		),
		''
	);
	if ( $cd_shadow['normal'] ) {
		$cd_shadow_tiers[ $cd_tier ] = $cd_shadow['normal'];
	}
}
if ( $cd_shadow_tiers ) {
	$scoped_css[] = sgs_emit_tier_decls( $entry_sel, $cd_shadow_tiers );
}

// A card that sets its own border: the swipeable layout's connector top stripe gives way to it (style.scss).
$cd_border_width = $attributes['cardBorderWidth'] ?? null;
if (
	( is_array( $cd_border_width ) && array_filter( $cd_border_width, static fn( $v ) => '' !== $v && null !== $v ) )
	|| ! empty( $attributes['cardBorderColour'] )
	|| ! empty( $attributes['cardBorderColourGradient'] )
) {
	$wrapper_args['class'] .= ' sgs-timeline--card-bordered';
}
