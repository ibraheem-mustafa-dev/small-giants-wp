<?php
/**
 * Option description styling for sgs/choice-flow-question (Spec 04 FR-4-2).
 *
 * The description line under each option's label takes its typography (`optionDescription*`) and colour
 * (`optionDescriptionColour`) from the block's panel. The rule is scoped to the block's uid class plus the block
 * class, a third class that beats the showcase layout's 14px
 * (`.sgs-choice-flow--layout-showcase .sgs-choice-flow-question__option-description`). It is printed once per block
 * for both render paths (typed options and the generated product-attribute options), because both print the same
 * description span. Nothing set prints nothing, so today's look is unchanged.
 *
 * render.php is at its line cap, so it makes one call to this helper and holds no other logic for it.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

if ( ! function_exists( 'sgs_choice_flow_question_description_css' ) ) {
	/**
	 * The scoped `<style>` element for the option description line.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param string               $uid        The block's uid class (without the dot).
	 * @return string The `<style>` element, or '' when no description typography or colour is set.
	 */
	function sgs_choice_flow_question_description_css( array $attributes, string $uid ): string {
		$css = sgs_typography_css_rule( $attributes, 'optionDescription', '.' . $uid . '.sgs-choice-flow-question .sgs-choice-flow-question__option-description' );

		$colour = sgs_colour_value( (string) ( $attributes['optionDescriptionColour'] ?? '' ) );
		if ( '' !== $colour ) {
			$css .= '.' . $uid . '.sgs-choice-flow-question .sgs-choice-flow-question__option-description{color:' . $colour . ';}';
		}

		if ( '' === $css ) {
			return '';
		}
		// wp_strip_all_tags blocks a </style> breakout while leaving CSS combinators intact.
		return '<style>' . wp_strip_all_tags( $css ) . '</style>';
	}
}
