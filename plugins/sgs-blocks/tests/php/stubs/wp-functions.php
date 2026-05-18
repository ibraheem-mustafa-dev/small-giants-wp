<?php
/**
 * Minimal WordPress function stubs for unit tests that include render.php directly.
 *
 * These stubs are intentionally thin -- just enough for render.php to execute
 * without a live WordPress installation. They are loaded once from bootstrap.php.
 *
 * @package SGS\Blocks\Tests
 */

if ( ! function_exists( 'absint' ) ) {
	/**
	 * Stub: absint().
	 *
	 * @param mixed $val Value.
	 * @return int
	 */
	function absint( $val ): int {
		return abs( (int) $val );
	}
}

if ( ! function_exists( 'sanitize_key' ) ) {
	/**
	 * Stub: sanitize_key().
	 *
	 * @param mixed $val Value.
	 * @return string
	 */
	function sanitize_key( $val ): string {
		return strtolower( preg_replace( '/[^a-z0-9_-]/i', '', (string) $val ) );
	}
}

if ( ! function_exists( 'sanitize_text_field' ) ) {
	/**
	 * Stub: sanitize_text_field().
	 *
	 * @param mixed $val Value.
	 * @return string
	 */
	function sanitize_text_field( $val ): string {
		return strip_tags( trim( (string) $val ) );
	}
}

if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	/**
	 * Stub: wp_strip_all_tags().
	 *
	 * @param mixed $val Value.
	 * @return string
	 */
	function wp_strip_all_tags( $val ): string {
		return strip_tags( (string) $val );
	}
}

if ( ! function_exists( 'esc_attr' ) ) {
	/**
	 * Stub: esc_attr().
	 *
	 * @param mixed $val Value.
	 * @return string
	 */
	function esc_attr( $val ): string {
		return htmlspecialchars( (string) $val, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_html' ) ) {
	/**
	 * Stub: esc_html().
	 *
	 * @param mixed $val Value.
	 * @return string
	 */
	function esc_html( $val ): string {
		return htmlspecialchars( (string) $val, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_url' ) ) {
	/**
	 * Stub: esc_url().
	 *
	 * @param mixed $val Value.
	 * @return string
	 */
	function esc_url( $val ): string {
		$url = filter_var( (string) $val, FILTER_SANITIZE_URL );
		return $url ?: '';
	}
}

if ( ! function_exists( 'esc_attr__' ) ) {
	/**
	 * Stub: esc_attr__().
	 *
	 * @param string $text   Text.
	 * @param string $domain Domain.
	 * @return string
	 */
	function esc_attr__( string $text, string $domain = 'default' ): string {
		return esc_attr( $text );
	}
}

if ( ! function_exists( '__' ) ) {
	/**
	 * Stub: __().
	 *
	 * @param string $text   Text.
	 * @param string $domain Domain.
	 * @return string
	 */
	function __( string $text, string $domain = 'default' ): string {
		return $text;
	}
}

if ( ! function_exists( 'wp_unique_id' ) ) {
	/**
	 * Stub: wp_unique_id().
	 *
	 * @param string $prefix Prefix.
	 * @return string
	 */
	function wp_unique_id( string $prefix = '' ): string {
		static $counter = 0;
		return $prefix . ( ++$counter );
	}
}

if ( ! function_exists( 'get_block_wrapper_attributes' ) ) {
	/**
	 * Stub: get_block_wrapper_attributes().
	 *
	 * Returns a minimal attribute string from the extra array.
	 *
	 * @param array $extra Extra attributes.
	 * @return string
	 */
	function get_block_wrapper_attributes( array $extra = array() ): string {
		$parts = array();
		foreach ( $extra as $key => $value ) {
			$parts[] = esc_attr( $key ) . '="' . esc_attr( $value ) . '"';
		}
		return implode( ' ', $parts );
	}
}
