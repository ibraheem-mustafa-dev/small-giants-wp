<?php
/**
 * A real-shaped `WP_Block` (name and block type) so `SGS_Container_Wrapper::render`'s `instanceof \WP_Block` guard
 * passes. Loaded only inside a test running in its own process, so no other test sees the class.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable

if ( ! class_exists( 'WP_Block' ) ) {
	final class WP_Block {
		/** @var string */
		public $name = '';
		/** @var object|null */
		public $block_type;
		/** @var array */
		public $context = array();
		/** @var array */
		public $parsed_block = array();
	}
}

if ( ! function_exists( 'sanitize_html_class' ) ) {
	/**
	 * Core's sanitize_html_class(): strip percent-encoded octets, then anything outside A-Z, a-z, 0-9, `_` and `-`.
	 *
	 * @param string $classname Class name.
	 * @param string $fallback  Fallback when the result is empty.
	 * @return string
	 */
	function sanitize_html_class( $classname, $fallback = '' ) {
		$sanitized = preg_replace( '/[^A-Za-z0-9_-]/', '', (string) preg_replace( '|%[a-fA-F0-9][a-fA-F0-9]|', '', (string) $classname ) );
		return '' === $sanitized && '' !== $fallback ? sanitize_html_class( $fallback ) : (string) $sanitized;
	}
}

/**
 * A block of the given name whose type declares no supports.
 *
 * @param string $name Block name.
 * @return WP_Block
 */
function sgs_test_band_block( string $name ): WP_Block {
	$block             = new WP_Block();
	$block->name       = $name;
	$block->block_type = (object) array( 'supports' => array() );
	return $block;
}
