<?php
/**
 * Buy box optional free-text note (Spec 27 FR-27-PS8).
 *
 * A shop that needs one answer from the shopper before the add ("Allergies or dietary needs?") turns the note on. The
 * block prints a label, an optional hint and a textarea before "Add to basket"; `note-view.js` keeps the text on the
 * card root, the cart proxy takes it as one `fields` row (`note: true`, Spec 43 FR-43-21) and the order line carries it.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/flow-fields/functions.php';

if ( ! function_exists( 'sgs_buybox_note_config' ) ) {
	/**
	 * The note's settings from the block attributes, cleaned. `on` is false unless the author turned the note on.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @return array{on:bool,label:string,hint:string,required:bool,max:int}
	 */
	function sgs_buybox_note_config( array $attributes ): array {
		$label = trim( sgs_authored_text_plain( (string) ( $attributes['noteLabel'] ?? '' ) ) );
		$max   = (int) ( $attributes['noteMaxLength'] ?? 300 );
		$max   = $max > 0 ? $max : 300;
		return array(
			'on'       => true === ( $attributes['noteField'] ?? false ),
			'label'    => '' !== $label ? $label : __( 'Allergies or dietary needs?', 'sgs-blocks' ),
			'hint'     => trim( sgs_authored_text_plain( (string) ( $attributes['noteHint'] ?? '' ) ) ),
			'required' => true === ( $attributes['noteRequired'] ?? false ),
			'max'      => min( $max, \SGS\Blocks\sgs_buybox_note_max_length() ),
		);
	}
}

if ( ! function_exists( 'sgs_buybox_note_html' ) ) {
	/**
	 * The note field's markup, or '' when the note is off. It hides with the Add to basket form while the chosen option
	 * is out of stock (the same `inStock` context read).
	 *
	 * @param array{on:bool,label:string,hint:string,required:bool,max:int} $note       From sgs_buybox_note_config().
	 * @param int                                                           $product_id The product the buy box shows (makes the ids unique).
	 * @return string Escaped markup.
	 */
	function sgs_buybox_note_html( array $note, int $product_id ): string {
		if ( ! $note['on'] ) {
			return '';
		}
		$id      = 'sgs-buybox-note-' . max( 0, $product_id );
		$hint_id = $id . '-hint';
		$err_id  = $id . '-error';
		/* translators: %d: how many characters the shopper has left in the note box. */
		$left_message = __( '%d characters left', 'sgs-blocks' );
		$html         = '<div class="sgs-buybox__note" data-wp-bind--hidden="!context.inStock" data-sgs-note data-max="' . esc_attr( (string) $note['max'] ) . '" data-required="' . ( $note['required'] ? '1' : '0' ) . '" data-label="' . esc_attr( $note['label'] ) . '" data-required-message="' . esc_attr( __( 'Please fill this in before adding to your basket.', 'sgs-blocks' ) ) . '" data-left-message="' . esc_attr( $left_message ) . '">';
		$html        .= '<label class="sgs-buybox__note-label" for="' . esc_attr( $id ) . '">' . esc_html( $note['label'] );
		if ( $note['required'] ) {
			$html .= ' <span class="sgs-buybox__note-required" aria-hidden="true">*</span>';
		}
		$html .= '</label>';
		if ( '' !== $note['hint'] ) {
			$html .= '<p class="sgs-buybox__note-hint" id="' . esc_attr( $hint_id ) . '">' . esc_html( $note['hint'] ) . '</p>';
		}
		$described = ( '' !== $note['hint'] ? $hint_id . ' ' : '' ) . $err_id;
		$html     .= '<textarea class="sgs-buybox__note-input" id="' . esc_attr( $id ) . '" rows="3" maxlength="' . esc_attr( (string) $note['max'] ) . '" autocomplete="off"' . ( $note['required'] ? ' required aria-required="true"' : '' ) . ' aria-describedby="' . esc_attr( $described ) . '"></textarea>';
		$html     .= '<span class="sgs-buybox__note-count" aria-hidden="true">0 / ' . esc_html( (string) $note['max'] ) . '</span>';
		$html     .= '<span class="sgs-buybox__note-status sgs-sr-only" role="status" aria-live="polite"></span>';
		$html     .= '<p class="sgs-buybox__note-error" id="' . esc_attr( $err_id ) . '" role="alert" hidden></p>';
		$html     .= '</div>';
		return $html;
	}
}
