<?php
/**
 * The Floating layer's stored width, as the length shape (Spec 02 FR-2-6).
 *
 * Before: `width` held numbers per device, `widthUnit` named one unit for every device (px, % or auto = Fit the
 * content, which ignored the device widths), and `maxWidthPercent` held a fixed width's cap as a bare percentage.
 * After: `width` and `maxWidth` hold lengths per device and the other two are gone.
 *
 *   - A number becomes a length in the stored unit (200 with px is "200px", 60 with % is "60%"); a value that is
 *     already a length is kept.
 *   - Fit the content becomes `width: { desktop: "max-content" }`.
 *   - A percentage unit with no width keeps the old default number in that unit ("200%").
 *   - An explicit `maxWidthPercent` on a fixed-width layer becomes `maxWidth.desktop` ("30%") unless `maxWidth` is
 *     already set; a layer that relied on the old 20% default gets no cap (the new default). `maxWidthPercent` on a
 *     percentage or fit-the-content layer printed nothing, so it is dropped.
 *
 * Loaded by migrate-layer-width.py (prepended to the WP-CLI script it runs) and by tests/php/LayerWidthMigrationTest.php.
 *
 * @package SGS\Blocks
 */

if ( ! function_exists( 'sgs_migrate_layer_width_attrs' ) ) {
	/**
	 * The attributes with the width in the length shape; unchanged when there is nothing to move.
	 *
	 * @param array $attrs A sgs/decorative-image block's stored attributes.
	 * @return array
	 */
	function sgs_migrate_layer_width_attrs( array $attrs ): array {
		if ( ! sgs_migrate_layer_width_needed( $attrs ) ) {
			return $attrs;
		}
		$unit = in_array( $attrs['widthUnit'] ?? 'px', array( 'px', '%', 'auto' ), true ) ? ( $attrs['widthUnit'] ?? 'px' ) : 'px';
		if ( 'auto' === $unit ) {
			$attrs['width'] = array( 'desktop' => 'max-content' );
		} elseif ( is_array( $attrs['width'] ?? null ) ) {
			foreach ( $attrs['width'] as $tier => $value ) {
				if ( is_int( $value ) || is_float( $value ) || ( is_string( $value ) && is_numeric( $value ) ) ) {
					$attrs['width'][ $tier ] = ( 0 + $value ) . $unit;
				}
			}
		} elseif ( '%' === $unit ) {
			$attrs['width'] = array( 'desktop' => '200%' );
		}
		if ( 'px' === $unit && is_numeric( $attrs['maxWidthPercent'] ?? null ) && empty( $attrs['maxWidth'] ) ) {
			$attrs['maxWidth'] = array( 'desktop' => min( 100, max( 0, 0 + $attrs['maxWidthPercent'] ) ) . '%' );
		}
		unset( $attrs['widthUnit'], $attrs['maxWidthPercent'] );
		return $attrs;
	}
}

if ( ! function_exists( 'sgs_migrate_layer_width_needed' ) ) {
	/**
	 * Whether a block's stored attributes still hold the old width shape: `widthUnit`, `maxWidthPercent`, or a width
	 * held as a number.
	 *
	 * @param array $attrs A sgs/decorative-image block's stored attributes.
	 * @return bool
	 */
	function sgs_migrate_layer_width_needed( array $attrs ): bool {
		if ( array_key_exists( 'widthUnit', $attrs ) || array_key_exists( 'maxWidthPercent', $attrs ) ) {
			return true;
		}
		foreach ( is_array( $attrs['width'] ?? null ) ? $attrs['width'] : array() as $value ) {
			if ( is_int( $value ) || is_float( $value ) || ( is_string( $value ) && is_numeric( $value ) ) ) {
				return true;
			}
		}
		return false;
	}
}
