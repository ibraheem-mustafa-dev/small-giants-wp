<?php
/**
 * Prints the buy box note's real server markup for the browser check (buybox-note.check.mjs).
 *
 * Usage: php buybox-note-markup.php '<attributes json>'
 */

define( 'ABSPATH', __DIR__ . '/' );
function __( $text ) { // phpcs:ignore
	return $text;
}
function apply_filters( $tag, $value ) { // phpcs:ignore
	return $value;
}
function esc_attr( $text ) { // phpcs:ignore
	return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
}
function esc_html( $text ) { // phpcs:ignore
	return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
}
function wp_strip_all_tags( $text ) { // phpcs:ignore
	return strip_tags( (string) $text );
}

require dirname( __DIR__, 3 ) . '/includes/helpers-inline-formats.php';
require dirname( __DIR__, 3 ) . '/includes/buybox-note.php';

$attributes = json_decode( $argv[1] ?? '{}', true );
echo sgs_buybox_note_html( sgs_buybox_note_config( is_array( $attributes ) ? $attributes : array() ), 42 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside.
