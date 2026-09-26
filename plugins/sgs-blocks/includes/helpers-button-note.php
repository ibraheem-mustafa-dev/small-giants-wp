<?php
/**
 * The sgs/button note: a short muted line beside the label, e.g. a price
 * hint ("from +£59") on a buy button. Plain text, never uppercased; when a
 * note is present the button spreads the label and note to its two ends
 * (src/blocks/button/style.css, `.sgs-button__note`).
 *
 * Kept out of button/render.php, which is over this codebase's size cap.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_button_note_html' ) ) {
	/**
	 * The note's markup.
	 *
	 * @param array $attributes The button's attributes (`note`).
	 * @return string Escaped HTML, or '' when the note is empty.
	 */
	function sgs_button_note_html( array $attributes ): string {
		$note = isset( $attributes['note'] ) ? trim( (string) $attributes['note'] ) : '';
		return '' === $note ? '' : '<span class="sgs-button__note">' . esc_html( $note ) . '</span>';
	}
}
