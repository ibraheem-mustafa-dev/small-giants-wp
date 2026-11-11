<?php
/**
 * Gallery item media: each item's picture or video goes through the shared media renderer (Spec 49 §7, §8.3).
 *
 * An item is `{source, alt, decorative, fit, focal, caption, link*, _key}`. The renderer reads the slot's settings from
 * `item*` attributes, so each item's own fields are laid over the block's (`itemRatio`, `itemFit`, `itemRadius`,
 * `itemShape`, `itemLoading`) and the renderer prints the picture, its per-item rules under `{uid}-i{index}` and the
 * block-level rules once. The item's caption and link stay with the gallery's own tile (figure, button or link,
 * lightbox), so they are not passed to the renderer.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_gallery_media_slot' ) ) {
	/**
	 * The gallery's `item` slot: its `supports.sgs.mediaElements` entry, or the entry's defaults.
	 *
	 * @param \WP_Block|null $block The block instance.
	 * @return array{prefix:string,kinds:string[],context:string}
	 */
	function sgs_gallery_media_slot( $block ): array {
		$entries = $block instanceof \WP_Block ? (array) ( $block->block_type->supports['sgs']['mediaElements'] ?? array() ) : array();
		foreach ( $entries as $entry ) {
			if ( is_array( $entry ) && 'item' === ( $entry['prefix'] ?? '' ) && ! empty( $entry['kinds'] ) ) {
				return array(
					'prefix'  => 'item',
					'kinds'   => array_map( 'strval', (array) $entry['kinds'] ),
					'context' => (string) ( $entry['context'] ?? 'item' ),
				);
			}
		}
		return array(
			'prefix'  => 'item',
			'kinds'   => array( 'image', 'video' ),
			'context' => 'item',
		);
	}
}

if ( ! function_exists( 'sgs_gallery_device_tiers' ) ) {
	/**
	 * A responsive value's own `{desktop,tablet,mobile}` entries, empty ones left out; a plain value is the desktop one.
	 *
	 * @param mixed $raw Stored value.
	 * @return array<string,mixed>
	 */
	function sgs_gallery_device_tiers( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return null === $raw || '' === $raw ? array() : array( 'desktop' => $raw );
		}
		$out = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			if ( isset( $raw[ $device ] ) && '' !== $raw[ $device ] && array() !== $raw[ $device ] ) {
				$out[ $device ] = $raw[ $device ];
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_gallery_item_attrs' ) ) {
	/**
	 * The attributes the renderer reads for one item: the block's, with the item's own source, alt, decorative flag,
	 * focal point and fit laid over them. A device the item sets no fit for takes the gallery's.
	 *
	 * @param array $item       One `mediaItems` entry.
	 * @param array $attributes Block attributes.
	 * @return array
	 */
	function sgs_gallery_item_attrs( array $item, array $attributes ): array {
		$attrs                   = $attributes;
		$attrs['itemSource']     = $item['source'] ?? null;
		$attrs['itemAlt']        = is_string( $item['alt'] ?? null ) ? $item['alt'] : '';
		$attrs['itemDecorative'] = ! empty( $item['decorative'] );
		$attrs['itemFocal']      = $item['focal'] ?? null;
		$attrs['itemLoading']    = is_string( $attributes['itemLoading'] ?? null ) ? $attributes['itemLoading'] : '';
		$fit                     = array_merge( sgs_gallery_device_tiers( $attributes['itemFit'] ?? null ), sgs_gallery_device_tiers( $item['fit'] ?? null ) );
		if ( array() !== $fit ) {
			$attrs['itemFit'] = $fit;
		}
		foreach ( array( 'itemCaption', 'itemLinkUrl', 'itemLinkUrlSource', 'itemLinkOpensNewTab', 'itemLinkRel' ) as $own ) {
			unset( $attrs[ $own ] );
		}
		return $attrs;
	}
}

if ( ! function_exists( 'sgs_gallery_item_file' ) ) {
	/**
	 * The file an item shows on desktop, for the lightbox: its kind, attachment id and address.
	 *
	 * @param array $item One `mediaItems` entry.
	 * @return array{kind:string,id:int,url:string}
	 */
	function sgs_gallery_item_file( array $item ): array {
		$source = is_array( $item['source'] ?? null ) ? $item['source'] : array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			$entry = $source[ $device ] ?? null;
			if ( is_array( $entry ) && ( ! empty( $entry['id'] ) || ! empty( $entry['url'] ) ) ) {
				$url  = is_scalar( $entry['url'] ?? null ) ? (string) $entry['url'] : '';
				$kind = is_string( $entry['kind'] ?? null ) && '' !== $entry['kind']
					? $entry['kind']
					: ( preg_match( '/\.(mp4|webm|mov|ogv|m4v)(\?|#|$)/i', $url ) ? 'video' : 'image' );
				return array(
					'kind' => $kind,
					'id'   => absint( $entry['id'] ?? 0 ),
					'url'  => $url,
				);
			}
		}
		return array(
			'kind' => 'image',
			'id'   => 0,
			'url'  => '',
		);
	}
}

if ( ! function_exists( 'sgs_gallery_render_item_media' ) ) {
	/**
	 * Render one item's media through the shared renderer.
	 *
	 * @param array  $item        One `mediaItems` entry.
	 * @param int    $index       The item's position.
	 * @param array  $attributes  Block attributes.
	 * @param array  $slot        The item slot.
	 * @param string $scope_uid   Scope class the renderer's block-level rules use.
	 * @param array  $columns     Columns per device, for `sizes`.
	 * @param bool   $block_rules Whether this item prints the block-level rules.
	 * @return array{html:string,css:string}
	 */
	function sgs_gallery_render_item_media( array $item, int $index, array $attributes, array $slot, string $scope_uid, array $columns, bool $block_rules ): array {
		if ( ! class_exists( 'SGS_Media_Element' ) ) {
			return array(
				'html' => '',
				'css'  => '',
			);
		}
		$out = SGS_Media_Element::render(
			$slot,
			sgs_gallery_item_attrs( $item, $attributes ),
			array(
				'uid'       => $scope_uid,
				'block'     => 'sgs/gallery',
				'in_editor' => defined( 'REST_REQUEST' ) && REST_REQUEST,
				'item_set'  => array(
					'index'       => $index,
					'columns'     => $columns,
					'block_rules' => $block_rules,
				),
			)
		);
		return array(
			'html' => (string) $out['html'],
			'css'  => (string) $out['css'],
		);
	}
}
