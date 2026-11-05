<?php
/**
 * Sgs/buybox: the sticker printed over the main photo.
 *
 * A short phrase ("baked with love") on a corner of the main photo. It prints inside the photo box
 * (`.product-card__media`) in the gallery column, so it stays on the photo while the pinned gallery
 * column scrolls with the page. Off until galleryStickerText is set. One markup builder and one
 * scoped-CSS builder; the look comes from the block's own settings through the shared emitters
 * (colours, border, padding, typography), with the stylesheet holding only layout defaults.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_buybox_gallery_sticker_text' ) ) {
	/**
	 * The sticker's text, '' when the sticker is off.
	 *
	 * @param array $attributes Block attributes.
	 * @return string Plain text.
	 */
	function sgs_buybox_gallery_sticker_text( array $attributes ): string {
		return sanitize_text_field( (string) ( $attributes['galleryStickerText'] ?? '' ) );
	}
}

if ( ! function_exists( 'sgs_buybox_gallery_sticker_position' ) ) {
	/**
	 * The corner the sticker sits on.
	 *
	 * @param array $attributes Block attributes.
	 * @return string One of top-left, top-right, bottom-left, bottom-right.
	 */
	function sgs_buybox_gallery_sticker_position( array $attributes ): string {
		$position = (string) ( $attributes['galleryStickerPosition'] ?? 'bottom-right' );
		return in_array( $position, array( 'top-left', 'top-right', 'bottom-left', 'bottom-right' ), true ) ? $position : 'bottom-right';
	}
}

if ( ! function_exists( 'sgs_buybox_gallery_sticker_html' ) ) {
	/**
	 * The sticker's markup, '' when the sticker is off. Decorative by default (hidden from assistive technology);
	 * galleryStickerDecorative off lets a screen reader read the text.
	 *
	 * @param array $attributes Block attributes.
	 * @return string HTML.
	 */
	function sgs_buybox_gallery_sticker_html( array $attributes ): string {
		$text = sgs_buybox_gallery_sticker_text( $attributes );
		if ( '' === $text ) {
			return '';
		}
		$classes = 'sgs-buybox__gallery-sticker sgs-buybox__gallery-sticker--' . sgs_buybox_gallery_sticker_position( $attributes );
		$hidden  = ( $attributes['galleryStickerDecorative'] ?? true ) ? ' aria-hidden="true"' : '';
		return '<span class="' . esc_attr( $classes ) . '"' . $hidden . '>' . esc_html( $text ) . '</span>';
	}
}

if ( ! function_exists( 'sgs_buybox_gallery_sticker_css' ) ) {
	/**
	 * The sticker's scoped CSS: fill, text colour, border, corner shape, rotation, offsets, padding and typography.
	 * Empty when the sticker is off, and every unset setting prints nothing (the stylesheet's defaults stand).
	 *
	 * @param array    $attributes  Block attributes.
	 * @param string   $root_sel    The block's scoped root selector.
	 * @param string[] $object_keys Object-typed attribute keys of the block (sgs_object_attr_keys()).
	 * @return string CSS rules.
	 */
	function sgs_buybox_gallery_sticker_css( array $attributes, string $root_sel, array $object_keys ): string {
		if ( '' === sgs_buybox_gallery_sticker_text( $attributes ) ) {
			return '';
		}
		$sel   = $root_sel . ' .sgs-buybox__gallery-sticker';
		$decls = array();

		$fill = sgs_colour_value( (string) ( $attributes['galleryStickerBackgroundColour'] ?? '' ) );
		if ( '' !== $fill ) {
			$decls[] = 'background:' . $fill;
		}
		$ink = sgs_colour_value( (string) ( $attributes['galleryStickerTextColour'] ?? '' ) );
		if ( '' !== $ink ) {
			$decls[] = 'color:' . $ink;
		}

		$shape = (string) ( $attributes['galleryStickerShape'] ?? 'rounded' );
		if ( 'pill' === $shape ) {
			$decls[] = 'border-radius:999px';
		} elseif ( 'tag' === $shape ) {
			$decls[] = 'clip-path:polygon(0 0,100% 0,88% 50%,100% 100%,0 100%)';
		} else {
			$radius = sgs_css_length_value( (string) ( $attributes['galleryStickerRadius'] ?? '' ) );
			if ( '' !== $radius ) {
				$decls[] = 'border-radius:' . $radius;
			}
		}

		$rotation = (float) ( $attributes['galleryStickerRotation'] ?? 0 );
		if ( 0.0 !== $rotation ) {
			$rotation = max( -180.0, min( 180.0, $rotation ) );
			$decls[]  = 'transform:rotate(' . rtrim( rtrim( number_format( $rotation, 2, '.', '' ), '0' ), '.' ) . 'deg)';
		}

		$position = sgs_buybox_gallery_sticker_position( $attributes );
		$offset_y = sgs_css_length_value( (string) ( $attributes['galleryStickerOffsetY'] ?? '' ) );
		$offset_x = sgs_css_length_value( (string) ( $attributes['galleryStickerOffsetX'] ?? '' ) );
		if ( '' !== $offset_y ) {
			$decls[] = ( str_starts_with( $position, 'top' ) ? 'top:' : 'bottom:' ) . $offset_y;
		}
		if ( '' !== $offset_x ) {
			$decls[] = ( str_ends_with( $position, 'left' ) ? 'left:' : 'right:' ) . $offset_x;
		}

		$border = sgs_border_element_decls(
			$attributes,
			'gallerySticker',
			$sel,
			array(
				'colour' => array( 'base' => 'galleryStickerBorderColour' ),
				'radius' => false,
			)
		);
		$decls  = array_merge( $border['base'], $decls );
		$css    = '';
		if ( ! empty( $decls ) ) {
			$css .= $sel . '{' . implode( ';', $decls ) . ';}';
		}
		$css .= implode( '', $border['rules'] );
		if ( $border['tablet'] ) {
			$css .= sgs_emit_tier_decls( $sel, array( 'tablet' => $border['tablet'] ) );
		}
		if ( $border['mobile'] ) {
			$css .= sgs_emit_tier_decls( $sel, array( 'mobile' => $border['mobile'] ) );
		}
		$css .= sgs_label_box_css_rule(
			array( 'padding' => is_array( $attributes['galleryStickerPadding'] ?? null ) ? $attributes['galleryStickerPadding'] : array() ),
			$sel
		);
		$css .= sgs_typography_css_rule( $attributes, 'gallerySticker', $sel, '', false, false, $object_keys );
		return $css;
	}
}
