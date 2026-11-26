<?php
/**
 * Brand strip "Even visual size": every logo of the row layout gets the same visual weight.
 *
 * A row's logos are capped by height and width, so a wide, thin logo (a 10:1 wordmark) reads far smaller than a
 * squarer one at the same height. With the setting on, each logo is sized by its box AREA instead of its height:
 *
 *   width = min( slotWidth, sqrt( area x ratio ), slotHeight x ratio )         ratio = file width / file height
 *
 * (a logo's height follows from its ratio), where the slot is the box a logo may fill: `logoMaxWidth` wide (a row with
 * no width cap is taken as four times its height) and `maxHeight` tall at the device. The area is a fixed share of the
 * slot's area, SGS_BRAND_STRIP_EVEN_AREA_SHARE of it. Then the whole set scales up until the largest logo just fits the
 * slot, as `object-fit: contain` would: a set whose logos all stay under the slot grows together, and a set where one
 * logo already touches the slot keeps its sizes. Every device uses its own `maxHeight`; a logo whose file has no
 * measurable size keeps the stylesheet's own sizing.
 *
 * The sizes are scoped px widths per logo, printed under the block's root, so no inline style and no script.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! defined( 'SGS_BRAND_STRIP_EVEN_AREA_SHARE' ) ) {
	// 3600 of a 120 x 44 slot's 5280 square px: the share the first measured strip used (a 60 x 60 picture in that slot).
	define( 'SGS_BRAND_STRIP_EVEN_AREA_SHARE', 3600 / 5280 );
}

if ( ! function_exists( 'sgs_brand_strip_even_widths' ) ) {
	/**
	 * Each logo's width, in px, for one slot.
	 *
	 * @param array<string|int, float> $ratios Width over height of each logo, keyed by the caller's id; a ratio of 0 or less is skipped.
	 * @param float                    $slot_w The slot's width in px; 0 for no width cap.
	 * @param float                    $slot_h The slot's height in px.
	 * @return array<string|int, float> The widths, same keys.
	 */
	function sgs_brand_strip_even_widths( array $ratios, float $slot_w, float $slot_h ): array {
		if ( $slot_h <= 0 ) {
			return array();
		}
		$area_width = $slot_w > 0 ? $slot_w : $slot_h * 4;
		$area       = $area_width * $slot_h * (float) SGS_BRAND_STRIP_EVEN_AREA_SHARE;

		$widths = array();
		foreach ( $ratios as $key => $ratio ) {
			$ratio = (float) $ratio;
			if ( $ratio <= 0 ) {
				continue;
			}
			$width = min( sqrt( $area * $ratio ), $slot_h * $ratio );
			if ( $slot_w > 0 ) {
				$width = min( $width, $slot_w );
			}
			$widths[ $key ] = $width;
		}
		if ( ! $widths ) {
			return array();
		}

		// Scale the set up until the largest logo just fits the slot (never down: every width is already inside it).
		$scale = INF;
		foreach ( $widths as $key => $width ) {
			$height = $width / (float) $ratios[ $key ];
			$scale  = min( $scale, $slot_h / $height, $slot_w > 0 ? $slot_w / $width : INF );
		}
		if ( is_finite( $scale ) && $scale > 1 ) {
			foreach ( $widths as $key => $width ) {
				$widths[ $key ] = $width * $scale;
			}
		}

		return $widths;
	}
}

if ( ! function_exists( 'sgs_brand_strip_item_ratio' ) ) {
	/**
	 * A logo's width over height, from its file: the attachment's recorded size, else the size stored on the entry.
	 *
	 * @param array $item One `logos` entry.
	 * @return float 0 when the file has no measurable size (an SVG with no width and height).
	 */
	function sgs_brand_strip_item_ratio( array $item ): float {
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			$entry = sgs_logo_device_entry( $item['source'] ?? null, $device );
			if ( null === $entry ) {
				continue;
			}
			$id   = absint( $entry['id'] ?? 0 );
			$meta = $id > 0 ? wp_get_attachment_metadata( $id ) : array();
			$w    = is_array( $meta ) ? (float) ( $meta['width'] ?? 0 ) : 0.0;
			$h    = is_array( $meta ) ? (float) ( $meta['height'] ?? 0 ) : 0.0;
			if ( $w <= 0 || $h <= 0 ) {
				$w = (float) ( $entry['width'] ?? 0 );
				$h = (float) ( $entry['height'] ?? 0 );
			}
			return $w > 0 && $h > 0 ? $w / $h : 0.0;
		}

		return 0.0;
	}
}

if ( ! function_exists( 'sgs_brand_strip_even_size' ) ) {
	/**
	 * The scoped CSS that sizes the logos evenly, and the widest width it prints (for the image's `sizes` hint).
	 *
	 * @param array  $logos      The `logos` attribute.
	 * @param array  $attributes Block attributes (`maxHeight`, `maxHeightTablet`, `maxHeightMobile`, `logoMaxWidth`).
	 * @param string $root_sel   The block's scoped root selector.
	 * @return array{css:string,cap:int} `css` is '' when no logo has a measurable size; `cap` is 0 then.
	 */
	function sgs_brand_strip_even_size( array $logos, array $attributes, string $root_sel ): array {
		$ratios = array();
		foreach ( $logos as $index => $logo ) {
			$logo = (array) $logo;
			$key  = sgs_brand_strip_item_key( $logo, $index );
			$rate = sgs_brand_strip_item_ratio( $logo );
			if ( $rate > 0 ) {
				$ratios[ $key ] = $rate;
			}
		}
		if ( ! $ratios ) {
			return array(
				'css' => '',
				'cap' => 0,
			);
		}

		$slot_w = (float) absint( $attributes['logoMaxWidth'] ?? 0 );
		$height = array( 'desktop' => (float) absint( $attributes['maxHeight'] ?? 180 ) );
		foreach ( array(
			'tablet' => 'maxHeightTablet',
			'mobile' => 'maxHeightMobile',
		) as $device => $attr ) {
			$stored            = isset( $attributes[ $attr ] ) && is_numeric( $attributes[ $attr ] ) ? (float) $attributes[ $attr ] : 0.0;
			$height[ $device ] = $stored > 0 ? $stored : ( 'mobile' === $device ? $height['tablet'] : $height['desktop'] );
		}

		// With no width cap the slot is as wide as a column: the strip's width less the gaps, over the device's column count.
		$columns = sgs_responsive_normalise_object( $attributes['columns'] ?? null );
		$count   = array(
			'desktop' => max( 1, (int) ( $columns['desktop'] ?? 8 ) ),
			'tablet'  => max( 1, (int) ( $columns['tablet'] ?? 4 ) ),
			'mobile'  => max( 1, (int) ( $columns['mobile'] ?? 2 ) ),
		);

		$css   = '';
		$cap   = 0.0;
		$prev  = null;
		$media = array(
			'desktop' => '',
			'tablet'  => SGS_Breakpoints::media( 'tablet' ),
			'mobile'  => SGS_Breakpoints::media( 'mobile' ),
		);
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			$widths = sgs_brand_strip_even_widths( $ratios, $slot_w, $height[ $device ] );
			$rules  = '';
			foreach ( $widths as $key => $width ) {
				$cap  = max( $cap, $width );
				$px   = rtrim( rtrim( number_format( $width, 1, '.', '' ), '0' ), '.' ) . 'px';
				$size = $slot_w > 0 ? $px : 'min(' . $px . ',calc((100cqw - ' . ( $count[ $device ] - 1 ) . ' * var(--sgs-logo-gap, 10px)) / ' . $count[ $device ] . '))';
				$rules .= $root_sel . ' .sgs-brand-strip__item[data-logo-key="' . $key . '"]{max-width:100%;}'
					. $root_sel . ' .sgs-brand-strip__item[data-logo-key="' . $key . '"] .sgs-media-el{width:' . $size . ';height:auto;max-width:100%;max-height:none;}';
			}
			if ( $rules === $prev ) {
				continue;
			}
			$prev = $rules;
			$css .= '' === $media[ $device ] ? $rules : $media[ $device ] . '{' . $rules . '}';
		}

		return array(
			'css' => $css,
			'cap' => (int) ceil( $cap ),
		);
	}
}
