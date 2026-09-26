<?php
/**
 * Showcase layout helpers for sgs/choice-flow (Spec 43 FR-43-24, v1.8.0).
 *
 * Holds markup that `choice-flow-question/render.php` needs but can't build
 * inline — that file sits at this codebase's 300-line-per-file cap, and the
 * build contract routes any new markup there through an `includes/` helper
 * instead. `function_exists()` guards match every other render helper in
 * this plugin (safe against the file loading more than once per request).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_choice_flow_question_intro_html' ) ) {
	/**
	 * The question's optional intro paragraph, shown under the title in both
	 * the `compact` and `showcase` layouts (style.css caps its width only in
	 * `showcase`). Empty attribute renders nothing — no empty `<p>`.
	 *
	 * @param array $attributes This block's own attributes.
	 * @return string Escaped HTML, or '' when unset.
	 */
	function sgs_choice_flow_question_intro_html( array $attributes ): string {
		$intro = isset( $attributes['intro'] ) ? trim( (string) $attributes['intro'] ) : '';
		if ( '' === $intro ) {
			return '';
		}
		return '<p class="sgs-choice-flow-question__intro">' . esc_html( $intro ) . '</p>';
	}
}
