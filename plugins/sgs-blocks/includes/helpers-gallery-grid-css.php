<?php
/**
 * The sgs/gallery grid layout's own grid settings, painted on the gallery's image grid.
 *
 * The gallery's images sit in `.sgs-gallery__grid`, a child of the block root. The Layout panel's
 * grid settings (custom column template, row template, auto rows, align items, justify items,
 * align content) belong to that grid, so they are printed here against it. The block root is
 * handed to SGS_Container_Wrapper without `layout` or `columns`, so the wrapper never makes the
 * root a grid of its own (that turned the image grid into the first cell of a second grid).
 * JS twin for the editor canvas: src/blocks/gallery/edit.js (applyGridLayoutPreview on the grid).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-container.php';

if ( ! function_exists( 'sgs_gallery_wrapper_attributes' ) ) {
	/**
	 * The gallery's attributes as SGS_Container_Wrapper should see them.
	 *
	 * `layout` (grid / masonry / carousel), `columns` and the grid settings describe the image
	 * grid, not the wrapper's own layout mode, and `separators` are drawn on the image grid by the
	 * block.
	 *
	 * @param array $attributes Block attributes.
	 * @return array The attributes without the keys the wrapper would misread.
	 */
	function sgs_gallery_wrapper_attributes( array $attributes ): array {
		foreach ( sgs_gallery_grid_owned_keys() as $key ) {
			unset( $attributes[ $key ] );
		}
		return $attributes;
	}
}

if ( ! function_exists( 'sgs_gallery_grid_owned_keys' ) ) {
	/**
	 * The attributes that belong to the image grid, never to the wrapper.
	 *
	 * @return string[] Attribute names.
	 */
	function sgs_gallery_grid_owned_keys(): array {
		return array( 'layout', 'columns', 'separators', 'gridTemplateColumns', 'gridTemplateRows', 'gridAutoRows', 'alignItems', 'justifyItems', 'alignContent' );
	}
}

if ( ! function_exists( 'sgs_gallery_grid_layout_css' ) ) {
	/**
	 * Scoped CSS for the grid layout's grid settings, on the image grid.
	 *
	 * @param string $grid_sel   The image grid's scoped selector.
	 * @param array  $attributes Block attributes.
	 * @return string CSS, or '' when the layout is not grid or nothing is set.
	 */
	function sgs_gallery_grid_layout_css( string $grid_sel, array $attributes ): string {
		if ( 'grid' !== ( $attributes['layout'] ?? 'grid' ) ) {
			return '';
		}

		$track = static function ( $raw ) {
			return sgs_sanitize_grid_template( (string) $raw );
		};
		$specs = array();
		foreach ( array(
			'gridTemplateColumns' => 'grid-template-columns',
			'gridTemplateRows'    => 'grid-template-rows',
		) as $attr => $prop ) {
			if ( isset( $attributes[ $attr ] ) && is_array( $attributes[ $attr ] ) ) {
				$specs[] = array(
					'value'     => $attributes[ $attr ],
					'css'       => $prop,
					'transform' => $track,
				);
			}
		}
		$css = $specs ? sgs_emit_responsive_css( $grid_sel, $specs ) : '';

		$decls     = array();
		$auto_rows = sgs_sanitize_grid_template( (string) ( $attributes['gridAutoRows'] ?? '' ) );
		if ( '' !== $auto_rows ) {
			$decls[] = 'grid-auto-rows:' . $auto_rows;
		}
		foreach ( array(
			'alignItems'   => 'align-items',
			'justifyItems' => 'justify-items',
			'alignContent' => 'align-content',
		) as $attr => $prop ) {
			$value = (string) preg_replace( '/[^a-z-]/', '', strtolower( (string) ( $attributes[ $attr ] ?? '' ) ) );
			// `stretch` is the grid's own default for justify-items and align-content.
			if ( '' !== $value && ! ( 'stretch' === $value && 'align-items' !== $prop ) ) {
				$decls[] = $prop . ':' . $value;
			}
		}
		if ( $decls ) {
			$css = $grid_sel . '{' . implode( ';', $decls ) . '}' . $css;
		}
		return $css;
	}
}
