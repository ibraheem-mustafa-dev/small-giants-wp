<?php
/**
 * The sgs/choice-flow footer bar's markup (Spec 43 FR-43-1, FR-43-5,
 * FR-43-24).
 *
 * Back on the left; an optional skip link ("Frame only? Skip the lenses")
 * beside it; Continue, Add to basket and Buy now on the right.
 * `flow-steps.js::updateFooterActions()` decides which right-hand buttons
 * show for the current step, and shows the skip link on the first question
 * only when the flow has a "no add-ons" option to route through
 * (`flow-skip.js`).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_choice_flow_footer_html' ) ) {
	/**
	 * The footer bar: Back, the optional skip link, then the step actions.
	 *
	 * @param array $attributes Root block attributes.
	 * @return string Escaped markup.
	 */
	function sgs_choice_flow_footer_html( array $attributes ): string {
		$continue_label = isset( $attributes['continueLabel'] ) && '' !== trim( (string) $attributes['continueLabel'] )
			? (string) $attributes['continueLabel']
			: __( 'Continue', 'sgs-blocks' );
		$skip_label     = isset( $attributes['skipLabel'] ) ? trim( (string) $attributes['skipLabel'] ) : '';
		$skip_prompt    = isset( $attributes['skipPrompt'] ) ? trim( (string) $attributes['skipPrompt'] ) : '';

		$skip_html = '';
		if ( '' !== $skip_label ) {
			$skip_html = '<p class="sgs-choice-flow__skip" hidden>'
				. ( '' !== $skip_prompt ? esc_html( $skip_prompt ) . ' ' : '' )
				. '<button type="button" class="sgs-choice-flow__skip-button">' . esc_html( $skip_label ) . '</button></p>';
		}

		return '<div class="sgs-choice-flow__footer"><div class="sgs-choice-flow__footer-row">'
			. '<button type="button" class="sgs-choice-flow__nav-back" hidden aria-label="' . esc_attr__( 'Back', 'sgs-blocks' ) . '">'
			. '<span aria-hidden="true">&larr;</span> ' . esc_html__( 'Back', 'sgs-blocks' ) . '</button>'
			. $skip_html
			. '<div class="sgs-choice-flow__footer-actions">'
			. '<button type="button" class="sgs-choice-flow__continue is-muted" hidden aria-disabled="true">' . esc_html( $continue_label ) . '</button>'
			. '<button type="button" class="sgs-choice-flow__add-to-basket" hidden></button>'
			. '<button type="button" class="sgs-choice-flow__buy-now" hidden></button>'
			. '</div></div>'
			. '<p class="sgs-choice-flow__continue-hint" role="status" aria-live="polite" data-message="' . esc_attr__( 'Choose an option to continue', 'sgs-blocks' ) . '"></p>'
			. '</div>';
	}
}
