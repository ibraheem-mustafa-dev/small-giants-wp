<?php
/**
 * Scoped colour rules for sgs/choice-flow's text and border controls.
 *
 * Each rule is written by the shared composers (`sgs_text_states_css()`,
 * `sgs_border_states_css()`) at the element's own selector under the flow's
 * root, so the colour is a real declaration rather than a custom property the
 * stylesheet has to read. The three fills (stage, help-note icon, help-note
 * hover) and the progress bar fill stay custom properties because several
 * stylesheet rules, in two blocks, paint from them
 * (`choice-flow-showcase.php::sgs_choice_flow_showcase_css()`,
 * `choice-flow-chrome.php::sgs_choice_flow_chrome_progress_colour_css()`).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_choice_flow_colour_rules_css' ) ) {
	/**
	 * The flow's text and border colour rules, one scoped rule per control.
	 *
	 * Specificity notes: every selector sits one class above the stylesheet's
	 * own rule for the same element, so the chosen colour wins without a
	 * source-order tie. The step indicator's resting rule excludes the current
	 * and complete items (which have their own control), and the '?' toggle's
	 * rule excludes its hover and focus state (the stylesheet inverts the toggle
	 * there, so a fixed glyph colour would vanish on the dark fill).
	 *
	 * @param array  $attributes Root block attributes.
	 * @param string $root_sel   The instance's scoped root selector.
	 * @return string Scoped rules, or '' when none of the controls is set.
	 */
	function sgs_choice_flow_colour_rules_css( array $attributes, string $root_sel ): string {
		if ( ! function_exists( 'sgs_text_states_css' ) || ! function_exists( 'sgs_border_states_css' ) ) {
			return '';
		}

		$showcase = $root_sel . '.sgs-choice-flow--layout-showcase';
		$step     = $root_sel . ' .sgs-choice-flow__stepper-item';
		$rest     = $step . ':not(.is-current):not(.is-complete)';

		$css  = sgs_text_states_css(
			$root_sel . ' .sgs-choice-flow__summary-note,' . $showcase . ' .sgs-choice-flow__summary-note-sub',
			$attributes,
			array( 'base' => 'summaryNoteColour' )
		);
		$css .= sgs_text_states_css(
			$showcase . ' .sgs-choice-flow__chrome-eyebrow',
			$attributes,
			array( 'base' => 'headerEyebrowColour' )
		);
		$css .= sgs_text_states_css(
			$showcase . ' .sgs-info-toggle:not(:hover):not(:focus-visible)',
			$attributes,
			array( 'base' => 'infoToggleColour' )
		);
		$css .= sgs_text_states_css(
			$rest . ' .sgs-choice-flow__stepper-circle,' . $rest . ' .sgs-choice-flow__stepper-label',
			$attributes,
			array( 'base' => 'stepperColour' )
		);
		$css .= sgs_text_states_css(
			$step . '.is-current .sgs-choice-flow__stepper-circle,' . $step . '.is-complete .sgs-choice-flow__stepper-circle,' . $step . '.is-current .sgs-choice-flow__stepper-label,' . $step . '.is-complete .sgs-choice-flow__stepper-label',
			$attributes,
			array( 'base' => 'stepperActiveColour' )
		);
		$css .= sgs_text_states_css(
			$root_sel . ' .sgs-choice-flow__progress-badge',
			$attributes,
			array( 'base' => 'progressBadgeColour' )
		);
		$css .= sgs_border_states_css(
			$showcase . ' .sgs-choice-flow__summary-note',
			$attributes,
			array( 'base' => 'stageNoteBorderColour' )
		);
		$css .= sgs_border_states_css(
			$showcase . ' .sgs-info-toggle',
			$attributes,
			array( 'base' => 'infoToggleBorderColour' )
		);

		// The step indicator's active ring follows the active colour too.
		$css .= sgs_border_states_css(
			$step . '.is-current .sgs-choice-flow__stepper-circle,' . $step . '.is-complete .sgs-choice-flow__stepper-circle',
			$attributes,
			array( 'base' => 'stepperActiveColour' )
		);

		return $css;
	}
}
