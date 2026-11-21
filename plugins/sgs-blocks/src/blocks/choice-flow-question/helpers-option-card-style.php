<?php
/**
 * The option card's own look and its parts for sgs/choice-flow-question (Spec 02 FR-2-33).
 *
 * Every setting is unset by default and prints nothing, so a question with none set renders exactly as the stylesheet
 * paints it. The rules are scoped to the block's doubled uid class plus the options list
 * (`.{uid}.{uid}.sgs-choice-flow-question .sgs-choice-flow-question__options`), which out-ranks the stylesheet's
 * showcase-layout card rules (up to four classes) without !important.
 *
 * - The card (`optionCard*`): border width, style and corners on every card through the shared
 *   `includes/helpers-button-style.php::sgs_button_element_style_css` (the flow's Back button's helper); padding per
 *   device, also printed as `--sgs-cfq-card-pad-{side}` so the showcase layout's picture band still runs to the card's
 *   edges; the fill, border colour and shadow at rest and on hover on every card that is not chosen, so a chosen card
 *   keeps its own look (`optionCardSelected*`, or the stylesheet's chosen look when those are unset).
 * - The chosen card (`optionCardSelected*`, named as sgs/form-field-tiles' `tileSelected*`): fill, border colour and
 *   shadow on `.sgs-choice-flow-question__option-button--selected` (set by sgs/choice-flow's view script). A fill also
 *   clears the stage gradient the showcase layout lays over a chosen card, so the colour shows.
 * - The badge box (`optionBadgeBorder` per device, `optionBadgeRadius`, `optionBadgePadding` per device), as
 *   sgs/nav-drawer-menu's `badgeBorder` and sgs/nav-bar-menu's `itemBadgePadding` and `itemBadgeBorderRadius`.
 *
 * render.php is past its line cap, so it makes one call to each function here.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-tiered-border.php';

if ( ! function_exists( 'sgs_choice_flow_question_option_card_css' ) ) {
	/**
	 * The scoped `<style>` element for the option card and its parts.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 * @param string               $uid        The block's uid class (without the dot).
	 * @return string The `<style>` element, or '' when nothing is set.
	 */
	function sgs_choice_flow_question_option_card_css( array $attributes, string $uid ): string {
		$scope = '.' . $uid . '.' . $uid . '.sgs-choice-flow-question .sgs-choice-flow-question__options ';
		$card  = $scope . '.sgs-choice-flow-question__option-button';
		$rest  = $card . ':not(.sgs-choice-flow-question__option-button--selected)';
		$css   = '';

		$pick = static function ( array $names ) use ( $attributes ): array {
			return array_intersect_key( $attributes, array_flip( $names ) );
		};

		// Border width, style and corners on every card, chosen or not.
		$css .= sgs_button_element_style_css( $pick( array( 'optionCardBorderWidth', 'optionCardBorderStyle', 'optionCardBorderRadius' ) ), 'optionCard', $card );
		$css .= sgs_emit_responsive_css(
			$card,
			array(
				array(
					'value'        => $attributes['optionCardPadding'] ?? null,
					'css'          => 'padding',
					'box'          => true,
					'unit_default' => 'px',
				),
				// The same sides as custom properties, which the showcase layout's picture band reads to reach the card's edges.
				array(
					'value'        => $attributes['optionCardPadding'] ?? null,
					'css'          => '--sgs-cfq-card-pad',
					'box'          => true,
					'unit_default' => 'px',
				),
			)
		);

		// The fill and border colour at rest and on hover, on the cards that are not chosen.
		$css .= sgs_button_element_style_css( $pick( array( 'optionCardColourBackground', 'optionCardColourBackgroundHover', 'optionCardColourBorder', 'optionCardColourBorderHover' ) ), 'optionCard', $rest );

		$shadow = sgs_shadow_decls(
			$attributes,
			array(
				'base'         => 'optionCardShadow',
				'colour'       => 'optionCardShadowColour',
				'hover'        => 'optionCardHoverShadow',
				'hover_colour' => 'optionCardHoverShadowColour',
			),
			'sgs/choice-flow-question'
		);
		if ( array() !== $shadow['normal'] ) {
			$css .= $rest . '{' . implode( ';', sgs_choice_flow_question_focus_under( $shadow['normal'] ) ) . ';}';
		}
		if ( array() !== $shadow['hover'] ) {
			$css .= sgs_hover_state_rules( $rest, implode( ';', $shadow['hover'] ) . ';' );
		}

		// The chosen card.
		$selected       = array();
		$selected_fill  = sgs_colour_value( (string) ( $attributes['optionCardSelectedBackgroundColour'] ?? '' ) );
		$selected_edge  = sgs_colour_value( (string) ( $attributes['optionCardSelectedBorderColour'] ?? '' ) );
		$selected_glow  = sgs_shadow_decls(
			$attributes,
			array(
				'base'   => 'optionCardSelectedShadow',
				'colour' => 'optionCardSelectedShadowColour',
			),
			'sgs/choice-flow-question'
		);
		if ( '' !== $selected_fill ) {
			$selected[] = 'background-color:' . $selected_fill;
			$selected[] = 'background-image:none';
		}
		if ( '' !== $selected_edge ) {
			$selected[] = 'border-color:' . $selected_edge;
		}
		$selected = array_merge( $selected, sgs_choice_flow_question_focus_under( $selected_glow['normal'] ) );
		if ( array() !== $selected ) {
			$css .= $card . '.sgs-choice-flow-question__option-button--selected{' . implode( ';', $selected ) . ';}';
		}

		// The badge box.
		$badge = $scope . '.sgs-choice-flow-question__option-badge';
		$css  .= sgs_emit_responsive_css( $badge, sgs_tiered_border_specs( $attributes['optionBadgeBorder'] ?? array() ) );
		$css  .= sgs_emit_responsive_css(
			$badge,
			array(
				array(
					'value'        => $attributes['optionBadgePadding'] ?? null,
					'css'          => 'padding',
					'box'          => true,
					'unit_default' => 'px',
				),
			)
		);
		$badge_radius = sgs_css_length_value( (string) ( $attributes['optionBadgeRadius'] ?? '' ) );
		if ( '' !== $badge_radius ) {
			$css .= $badge . '{border-radius:' . $badge_radius . ';}';
		}

		if ( '' === $css ) {
			return '';
		}
		// wp_strip_all_tags blocks a </style> breakout while leaving CSS combinators intact.
		return '<style>' . wp_strip_all_tags( $css ) . '</style>';
	}
}

if ( ! function_exists( 'sgs_choice_flow_question_focus_under' ) ) {
	/**
	 * Hand a card's own shadow to the focus system too: the keyboard focus ring replaces `box-shadow` and draws
	 * `--sgs-focus-under` beneath itself, as the stylesheet's chosen-card rule does for its ring.
	 *
	 * @param string[] $decls The declarations from sgs_shadow_decls() for one state.
	 * @return string[] The same declarations, with `--sgs-focus-under` after the shadow when one is drawn.
	 */
	function sgs_choice_flow_question_focus_under( array $decls ): array {
		$out = array();
		foreach ( $decls as $decl ) {
			$out[] = $decl;
			if ( str_starts_with( $decl, 'box-shadow:' ) ) {
				$out[] = '--sgs-focus-under:' . substr( $decl, strlen( 'box-shadow:' ) );
			}
		}
		return $out;
	}
}
