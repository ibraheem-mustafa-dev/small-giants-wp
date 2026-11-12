<?php
/**
 * Brand strip logos through the shared media renderer (Spec 49 §8.3, §10.4).
 *
 * An item is `{source, alt, decorative, fit, focal, name, link*, _key}`. The `logo` slot reads its settings from `logo*`
 * attributes, so each item's own fields are laid over the block's (`logoFit` and the rest) and the renderer prints the
 * picture, its per-item rules under `{uid}-i{index}` and the block-level rules once, with the first item. The block's
 * Shape is the tile's shape (circle, none or square), not a mask on the picture, so it is read here and never handed on.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/media/render-item-slot.php';

if ( ! function_exists( 'sgs_brand_strip_item_file' ) ) {
	/**
	 * The file an item shows first (desktop, else tablet, else mobile): `{url}`, or null when it has none.
	 *
	 * @param array $item One `logos` entry.
	 * @return array{url:string}|null
	 */
	function sgs_brand_strip_item_file( array $item ): ?array {
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $device ) {
			$entry = sgs_logo_device_entry( $item['source'] ?? null, $device );
			if ( null !== $entry ) {
				return array( 'url' => sgs_logo_entry_url( $entry ) );
			}
		}
		return null;
	}
}

if ( ! function_exists( 'sgs_brand_strip_item_attrs' ) ) {
	/**
	 * The attributes the renderer reads for one item: the block's, with the item's own source, alt, decorative flag, focal
	 * point and fit laid over them (`sgs_media_item_fit()`; a logo with no fit anywhere is contained, never cropped). The block's Shape is the tile's, so it stays out.
	 *
	 * @param array $item       One `logos` entry.
	 * @param array $attributes Block attributes.
	 * @param bool  $decorative Whether the picture is hidden from assistive technology (decorative, or named by a caption).
	 * @return array
	 */
	function sgs_brand_strip_item_attrs( array $item, array $attributes, bool $decorative ): array {
		$attrs                   = sgs_media_item_slot_attrs( 'logo', $item, $attributes, 'contain' );
		$attrs['logoDecorative'] = $decorative;
		unset( $attrs['logoShape'] );
		return $attrs;
	}
}

if ( ! function_exists( 'sgs_brand_strip_render_logo' ) ) {
	/**
	 * Render one logo through the shared renderer.
	 *
	 * @param array  $item        One `logos` entry.
	 * @param int    $index       The item's position among the printed logos.
	 * @param array  $attributes  Block attributes.
	 * @param array  $slot        The `logo` slot.
	 * @param string $uid         Scope class the renderer's block-level rules use.
	 * @param bool   $decorative  Whether the picture is hidden from assistive technology.
	 * @return array{html:string,css:string}
	 */
	function sgs_brand_strip_render_logo( array $item, int $index, array $attributes, array $slot, string $uid, bool $decorative, array $columns = array(), int $max_height = 0 ): array {
		if ( ! class_exists( 'SGS_Media_Element' ) ) {
			return array(
				'html' => '',
				'css'  => '',
			);
		}
		$out = SGS_Media_Element::render(
			$slot,
			sgs_brand_strip_item_attrs( $item, $attributes, $decorative ),
			array(
				'uid'       => $uid,
				'block'     => 'sgs/brand-strip',
				'role'      => 'brand-strip',
				'in_editor' => defined( 'REST_REQUEST' ) && REST_REQUEST,
				'item_set'  => array(
					'index'       => $index,
					'columns'     => array() === $columns ? 0 : $columns,
					'item_cap'    => $max_height,
					'block_rules' => 0 === $index,
				),
			)
		);
		return array(
			'html' => (string) $out['html'],
			'css'  => (string) $out['css'],
		);
	}
}

if ( ! function_exists( 'sgs_brand_strip_tile_shapes' ) ) {
	/**
	 * The tile's shape per device: `circle`, `none` (no card) or `square` (the rounded card). The block's Shape setting
	 * says it; a device with no value of its own takes the wider device's, and no value at all is `square`.
	 *
	 * @param array $attributes Block attributes.
	 * @return array<string,string>
	 */
	function sgs_brand_strip_tile_shapes( array $attributes ): array {
		$out = array();
		foreach ( sgs_media_device_values( $attributes['logoShape'] ?? null ) as $device => $value ) {
			$shape          = is_array( $value ) ? (string) ( $value['shape'] ?? '' ) : (string) $value;
			$out[ $device ] = in_array( $shape, array( 'circle', 'none' ), true ) ? $shape : 'square';
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_brand_strip_tile_shape_css' ) ) {
	/**
	 * The tile shape's rules for the tablet and mobile devices where it differs from the wider device (desktop's is the
	 * root modifier class `sgs-brand-strip--tile-{shape}`).
	 *
	 * @param array  $shapes   From sgs_brand_strip_tile_shapes().
	 * @param string $root_sel The block's scoped root selector.
	 * @return string
	 */
	function sgs_brand_strip_tile_shape_css( array $shapes, string $root_sel ): string {
		$decls = array(
			'circle' => 'border-radius:50%',
			'none'   => 'background-color:transparent;border-color:transparent;border-radius:0',
			'square' => 'border-radius:var(--sgs-tile-radius,16px)',
		);
		$css   = '';
		$prev  = $shapes['desktop'] ?? 'square';
		foreach ( array( 'tablet', 'mobile' ) as $device ) {
			$now = $shapes[ $device ] ?? $prev;
			if ( $now !== $prev ) {
				$css .= sgs_emit_tier_decls( $root_sel . ' .sgs-brand-strip__item', array( $device => array( $decls[ $now ] ) ) );
			}
			$prev = $now;
		}
		return $css;
	}
}
