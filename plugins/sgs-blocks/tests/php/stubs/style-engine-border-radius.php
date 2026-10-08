<?php
/**
 * Stub of wp_style_engine_get_styles() for the border-radius path, in
 * WordPress's own return shape (`declarations` as `property => value`).
 *
 * Loaded only by run-border-element-radius.php, a plain child process, so it
 * never replaces another test's stub.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

if ( ! function_exists( 'wp_style_engine_get_styles' ) ) {
	/**
	 * Border-radius declarations for a uniform string or a corner object.
	 *
	 * @param array $styles  Style-engine style tree.
	 * @param array $options Unused.
	 * @return array{css: string, declarations: array<string, string>}
	 */
	function wp_style_engine_get_styles( array $styles, array $options = array() ): array { // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound, Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed -- stands in for the core function.
		$radius = $styles['border']['radius'] ?? null;
		$decls  = array();
		if ( is_string( $radius ) && '' !== $radius ) {
			$decls['border-radius'] = $radius;
		} elseif ( is_array( $radius ) ) {
			$corners = array(
				'topLeft'     => 'border-top-left-radius',
				'topRight'    => 'border-top-right-radius',
				'bottomLeft'  => 'border-bottom-left-radius',
				'bottomRight' => 'border-bottom-right-radius',
			);
			foreach ( $corners as $key => $property ) {
				if ( isset( $radius[ $key ] ) && '' !== $radius[ $key ] ) {
					$decls[ $property ] = $radius[ $key ];
				}
			}
		}
		return array(
			'css'          => '',
			'declarations' => $decls,
		);
	}
}
