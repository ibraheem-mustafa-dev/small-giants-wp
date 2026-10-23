<?php
/**
 * Gallery helpers for linked items and the item tile (render.php requires this file).
 *
 * - Linked items: a mediaItems entry with a `linkUrl` renders as an <a> and is left out of
 *   the lightbox. sgs_gallery_item_link() reads and sanitises it.
 * - The tile: the `.sgs-gallery__item` box styled block-wide (fill, border, radius, height,
 *   padding, contain fit). Every setting defaults to empty and then emits nothing, so a
 *   gallery that sets none of them renders exactly as before.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_gallery_item_link' ) ) {
	/**
	 * Read one item's link.
	 *
	 * `linkUrlSource` may point the link at a page, a Site Info link or back to top
	 * (includes/helpers-link-source.php); the typed linkUrl is the fallback.
	 *
	 * @param mixed $img One mediaItems entry.
	 * @return array{url: string, new_tab: bool, label: string, source_attrs: string}|array{} Empty when the item has no usable link.
	 */
	function sgs_gallery_item_link( $img ): array {
		$source = is_array( $img ) && is_string( $img['linkUrlSource'] ?? null ) ? $img['linkUrlSource'] : '';
		if ( ! is_array( $img ) || ( '' === $source && ! is_scalar( $img['linkUrl'] ?? null ) ) ) {
			return array();
		}
		$typed = is_scalar( $img['linkUrl'] ?? null ) ? (string) $img['linkUrl'] : '';
		$raw   = trim( sgs_link_source_href( $source, $typed ) );
		// Only web, mail and phone destinations; any other scheme (javascript:, data:) is refused outright.
		if ( preg_match( '#^[a-z][a-z0-9+.-]*:#i', $raw ) && ! preg_match( '#^(https?|mailto|tel):#i', $raw ) ) {
			return array();
		}
		$url = esc_url( $raw, array( 'http', 'https', 'mailto', 'tel' ) );
		if ( '' === $url ) {
			return array();
		}
		return array(
			'url'          => $url,
			'new_tab'      => '_blank' === ( $img['linkTarget'] ?? '' ),
			'label'        => is_scalar( $img['linkLabel'] ?? null ) ? trim( sanitize_text_field( (string) $img['linkLabel'] ) ) : '',
			'source_attrs' => sgs_link_source_attrs_html( $source ),
		);
	}
}

if ( ! function_exists( 'sgs_gallery_tile_mode' ) ) {
	/**
	 * Whether the tile takes its own height (tileMinHeight set on any device) instead of the aspect ratio.
	 *
	 * @param array $attributes Block attributes.
	 * @return bool
	 */
	function sgs_gallery_tile_mode( array $attributes ): bool {
		$tiers = $attributes['tileMinHeight'] ?? null;
		if ( ! is_array( $tiers ) ) {
			return false;
		}
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			if ( is_scalar( $tiers[ $tier ] ?? null ) && '' !== trim( (string) $tiers[ $tier ] ) ) {
				return true;
			}
		}
		return false;
	}
}

if ( ! function_exists( 'sgs_gallery_tile_css' ) ) {
	/**
	 * The scoped CSS for the item tile. Empty when no tile setting is set.
	 *
	 * Print it AFTER the per-item crop rules; the contain-fit rule is also more specific than
	 * they are, so it wins whichever order the stylesheet ends up in.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   The block root's scoped selector.
	 * @return string CSS text.
	 */
	function sgs_gallery_tile_css( array $attributes, string $root_sel ): string {
		$item = $root_sel . ' .sgs-gallery__item';
		$css  = sgs_fill_states_css(
			$item,
			$attributes,
			array(
				'base'           => 'tileColour',
				'gradient'       => 'tileColourGradient',
				'hover'          => 'tileColourHover',
				'hover_gradient' => 'tileColourHoverGradient',
			)
		);

		$border = sgs_border_element_decls(
			$attributes,
			'tile',
			$item,
			array(
				'colour' => array(
					'base'     => 'tileBorderColour',
					'gradient' => 'tileBorderColourGradient',
				),
			)
		);
		if ( $border['base'] ) {
			$css .= $item . '{' . implode( ';', $border['base'] ) . ';}';
		}
		$css .= implode( '', $border['rules'] );
		if ( $border['tablet'] ) {
			$css .= '@media(max-width:1023px){' . $item . '{' . implode( ';', $border['tablet'] ) . ';}}';
		}
		if ( $border['mobile'] ) {
			$css .= '@media(max-width:767px){' . $item . '{' . implode( ';', $border['mobile'] ) . ';}}';
		}

		$box_css = sgs_emit_responsive_css(
			$item,
			array(
				array(
					'value'        => $attributes['tileMinHeight'] ?? null,
					'css'          => 'min-height',
					'unit_default' => 'px',
				),
				// A tile height the client set overrules the linked item's 44px tap floor (ruling 11); the flag follows the height per tier.
				array(
					'value'     => $attributes['tileMinHeight'] ?? null,
					'css'       => '--sgs-gallery-tap-min',
					'transform' => static fn( $raw ): string => '' === trim( (string) $raw ) ? '' : '0px',
				),
				array(
					'value'        => $attributes['tilePadding'] ?? null,
					'css'          => 'padding',
					'box'          => true,
					'unit_default' => 'px',
				),
			)
		);
		if ( '' !== $box_css ) {
			// Padding and height count inside the tile, so the aspect ratio and the border never grow it.
			$css .= $item . '{box-sizing:border-box;}' . $box_css;
		}

		if ( ! empty( $attributes['tileFitContain'] ) ) {
			$css .= $item . ' .sgs-gallery__img-wrap img,' . $item . ' .sgs-gallery__img-wrap video{object-fit:contain;object-position:center;}';
		}

		return $css;
	}
}

if ( ! function_exists( 'sgs_gallery_media_html' ) ) {
	/**
	 * The item's image or video markup, shared by the linked, lightbox and plain branches.
	 *
	 * @param array  $img            The mediaItems entry.
	 * @param int    $index          Position in the gallery (the first four load eagerly).
	 * @param string $image_size     Registered image size.
	 * @param string $img_class      Class list for the attachment <img>.
	 * @param bool   $decorative     Whether the image is hidden from assistive tech.
	 * @param string $fallback_html  Pre-rendered markup for video items and images without an attachment.
	 * @return string Markup from WordPress core and sgs_render_media(), already escaped.
	 */
	function sgs_gallery_media_html( array $img, int $index, string $image_size, string $img_class, bool $decorative, string $fallback_html ): string {
		$img_id   = absint( $img['id'] ?? 0 );
		$img_type = isset( $img['type'] ) ? sanitize_key( $img['type'] ) : 'image';
		if ( 'image' !== $img_type || ! $img_id ) {
			return $fallback_html;
		}
		return (string) wp_get_attachment_image(
			$img_id,
			$image_size,
			false,
			array_merge(
				array(
					'class'   => $img_class,
					'loading' => $index < 4 ? 'eager' : 'lazy',
				),
				$decorative ? array(
					'alt'         => '',
					'aria-hidden' => 'true',
				) : array()
			)
		);
	}
}

if ( ! function_exists( 'sgs_gallery_linked_item_html' ) ) {
	/**
	 * One linked item: a figure whose image sits inside an <a>. It has no lightbox button.
	 *
	 * @param array  $link       The item's link from sgs_gallery_item_link() (url, new_tab, label).
	 * @param string $item_key   The item's stable key.
	 * @param string $media_html Escaped image markup.
	 * @param string $img_alt    Escaped alt text, the link's name when it has no label.
	 * @param string $caption    Escaped caption text, or ''.
	 * @return string Markup; every dynamic part is escaped before it arrives or here.
	 */
	function sgs_gallery_linked_item_html( array $link, string $item_key, string $media_html, string $img_alt, string $caption ): string {
		// The link's accessible name: its label, else the image's alt text, else the caption, else the
		// destination's host, so a decorative (hidden) image never leaves the link unnamed.
		$alt_name = wp_strip_all_tags( html_entity_decode( $img_alt, ENT_QUOTES ) );
		$name     = '' !== $link['label'] ? $link['label'] : $alt_name;
		if ( '' === $name ) {
			$name = trim( wp_strip_all_tags( html_entity_decode( $caption, ENT_QUOTES ) ) );
		}
		if ( '' === $name ) {
			$name = (string) wp_parse_url( html_entity_decode( $link['url'], ENT_QUOTES ), PHP_URL_HOST );
		}
		if ( $link['new_tab'] && '' !== $name ) {
			/* translators: %s: the link's accessible name */
			$name = sprintf( __( '%s (opens in a new tab)', 'sgs-blocks' ), $name );
		}
		$attrs = ' href="' . $link['url'] . '"' . ( $link['source_attrs'] ?? '' );
		if ( $link['new_tab'] ) {
			$attrs .= ' target="_blank" rel="noopener noreferrer"';
		}
		if ( '' !== $name && ( '' !== $link['label'] || $link['new_tab'] || '' === $alt_name ) ) {
			$attrs .= ' aria-label="' . esc_attr( $name ) . '"';
		}

		$html  = '<figure class="sgs-gallery__item sgs-gallery__item--linked" data-gallery-item-key="' . esc_attr( $item_key ) . '">';
		$html .= '<a class="sgs-gallery__item-link sgs-focus--inset"' . $attrs . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- href is esc_url(), label is esc_attr().
		$html .= '<div class="sgs-gallery__img-wrap">' . $media_html . '</div>';
		$html .= '</a>';
		if ( '' !== $caption ) {
			$html .= '<figcaption class="sgs-gallery__caption">' . $caption . '</figcaption>';
		}
		return $html . '</figure>';
	}
}
