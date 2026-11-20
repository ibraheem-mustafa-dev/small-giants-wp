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
if ( ! empty( $attributes['entryHeight'] ) && is_array( $attributes['entryHeight'] ) ) {
	$cd_media_height = sgs_emit_responsive_css(
		$media_sel,
		array(
			array(
				'value'        => $attributes['entryHeight'],
				'css'          => 'height',
				'unit_default' => 'px',
			),
			array(
				'value'     => $attributes['entryHeight'],
				'css'       => 'aspect-ratio',
				'transform' => static function ( $raw ) {
					return '' === trim( (string) $raw ) ? '' : 'auto';
				},
			),
		)
	);
	if ( '' !== $cd_media_height ) {
		$scoped_css[] = $cd_media_height;
		$scoped_css[] = $media_sel . ' :is(.sgs-timeline__media,.sgs-media-group,.sgs-media-stack,img,video){height:100%;}';
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

// Space between rows of cards per device (`cardRowGap`): the row gap of the card row. A row of cards has one row, so it
// shows where the cards stack (767px and below, where the list becomes a column).
if ( ! empty( $attributes['cardRowGap'] ) && is_array( $attributes['cardRowGap'] ) ) {
	$scoped_css[] = sgs_emit_responsive_css(
		$root_sel . ' .sgs-timeline__list',
		array(
			array(
				'value'        => $attributes['cardRowGap'],
				'css'          => 'row-gap',
				'unit_default' => 'px',
			),
		)
	);
}

// Entry alignment per device (`cardAlign`, 'start' or 'center'): the text alignment of the entry's date, title and
// description at every width; the entry's own cross-axis alignment (where the date and the ring sit) from 768px up,
// through `--sgs-tl-entry-align`, which the stylesheet's entry rule reads; and the text margins that centre a text part
// (`--sgs-text-ms` and `--sgs-text-me`, `auto` centres, `0` starts). The Text beside image layout is always left-aligned.
if ( 'same-side' !== $content_layout && ! empty( $attributes['cardAlign'] ) && is_array( $attributes['cardAlign'] ) ) {
	$cd_align_to = static function ( $map ) {
		return static function ( $raw ) use ( $map ) {
			return $map[ strtolower( trim( (string) $raw ) ) ] ?? '';
		};
	};
	$cd_text_sel = implode(
		',',
		array(
			$entry_sel,
			$root_sel . ' .sgs-timeline__date',
			$root_sel . ' .sgs-timeline__content',
			$root_sel . ' .sgs-timeline__description',
		)
	);
	$cd_align_css = sgs_emit_responsive_css(
		$cd_text_sel,
		array(
			array(
				'value'     => $attributes['cardAlign'],
				'css'       => 'text-align',
				'transform' => $cd_align_to(
					array(
						'start'  => 'start',
						'center' => 'center',
					)
				),
			),
		)
	);
	$cd_align_css .= sgs_emit_responsive_css(
		$entry_sel,
		array(
			array(
				'value'     => $attributes['cardAlign'],
				'css'       => '--sgs-tl-entry-align',
				'transform' => $cd_align_to(
					array(
						'start'  => 'flex-start',
						'center' => 'center',
					)
				),
			),
		)
	);
	foreach ( array( '--sgs-text-ms', '--sgs-text-me' ) as $cd_prop ) {
		$cd_align_css .= sgs_emit_responsive_css(
			$entry_sel . ',' . $root_sel . ' .sgs-timeline__content',
			array(
				array(
					'value'     => $attributes['cardAlign'],
					'css'       => $cd_prop,
					'transform' => $cd_align_to(
						array(
							'start'  => '0',
							'center' => 'auto',
						)
					),
				),
			)
		);
	}
	$scoped_css[] = $cd_align_css;
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
