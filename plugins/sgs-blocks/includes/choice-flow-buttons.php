<?php
/**
 * The sgs/choice-flow buttons on the built-in button kit (Spec 43 FR-43-26, Spec 11 section 4).
 *
 * The flow's six buttons are declared in `block.json` `supports.sgs.builtinButtons`: Back, the Skip link, Continue, Add to basket,
 * Buy now (the footer) and Close (the chrome header). Each has the kit's look set under its prefix (`backStyle`,
 * `continueColourBackground`, `closeButtonPadding`, ...). Close's prefix is `closeButton`, not `close`, because the flow's
 * `closeStyle` already chooses the icon or the text variant.
 *
 * Unset, a button keeps the look `src/blocks/choice-flow/style.css` gives it (the primary preset's tokens for Continue and Buy
 * now, the secondary's for Add to basket and Back, the fixed underlined link for Skip, the fixed grey circle for Close).
 * `{prefix}Style` naming a preset prints that preset on the button as the kit's shared rule (`sgs_button_kit_classes()` puts its
 * classes on the markup), which out-ranks the stylesheet's rules for every property the preset paints and leaves the rest.
 *
 * Back's own colour and border attributes carry defaults (the neutral ink-and-paper pair). With a preset chosen, a value still
 * equal to its default is unset: the preset, not the default pair, paints Back.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_choice_flow_button_elements' ) ) {
	/**
	 * The flow's kit buttons: attribute prefix to the button's own class selector, in footer order (Back first).
	 *
	 * @return array<string,string>
	 */
	function sgs_choice_flow_button_elements(): array {
		return array(
			'back'        => '.sgs-choice-flow__nav-back',
			'skip'        => '.sgs-choice-flow__skip-button',
			'continue'    => '.sgs-choice-flow__continue',
			'addToBasket' => '.sgs-choice-flow__add-to-basket',
			'buyNow'      => '.sgs-choice-flow__buy-now',
			'closeButton' => '.sgs-choice-flow__chrome-close',
		);
	}
}

if ( ! function_exists( 'sgs_choice_flow_attribute_defaults' ) ) {
	/**
	 * The defaults the block's `block.json` declares, by attribute name.
	 *
	 * @param mixed $block The rendering `WP_Block` (or a stand-in without a block type).
	 * @return array<string,mixed>
	 */
	function sgs_choice_flow_attribute_defaults( $block ): array {
		$declared = is_object( $block ) && isset( $block->block_type->attributes ) && is_array( $block->block_type->attributes ) ? $block->block_type->attributes : array();
		$out      = array();
		foreach ( $declared as $name => $definition ) {
			if ( is_array( $definition ) && array_key_exists( 'default', $definition ) ) {
				$out[ (string) $name ] = $definition['default'];
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_choice_flow_button_attrs' ) ) {
	/**
	 * The attributes the kit reads for one button. With `{prefix}Style` naming a preset, every attribute of the prefix still equal
	 * to its declared default is dropped, so the preset paints in place of the default look.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $prefix     The button's prefix.
	 * @param array<string,mixed> $defaults   {@see sgs_choice_flow_attribute_defaults()}.
	 * @return array<string,mixed>
	 */
	function sgs_choice_flow_button_attrs( array $attributes, string $prefix, array $defaults ): array {
		require_once __DIR__ . '/helpers-button-preset.php';
		$style = $attributes[ $prefix . 'Style' ] ?? '';
		if ( ! is_string( $style ) || '' === sgs_button_preset_resolve( $style ) ) {
			return $attributes;
		}
		foreach ( $defaults as $name => $default ) {
			if ( 0 === strpos( $name, $prefix ) && array_key_exists( $name, $attributes ) && $attributes[ $name ] == $default ) { // phpcs:ignore Universal.Operators.StrictComparisons.LooseEqual -- an object default compares by content.
				unset( $attributes[ $name ] );
			}
		}
		return $attributes;
	}
}

if ( ! function_exists( 'sgs_choice_flow_button_classes' ) ) {
	/**
	 * The classes a button carries so its preset's shared rules apply, with a leading space ('' when `{prefix}Style` names no preset).
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $prefix     The button's prefix (a key of {@see sgs_choice_flow_button_elements()}).
	 * @return string
	 */
	function sgs_choice_flow_button_classes( array $attributes, string $prefix ): string {
		$elements = sgs_choice_flow_button_elements();
		if ( ! isset( $elements[ $prefix ] ) ) {
			return '';
		}
		require_once __DIR__ . '/helpers-button-style.php';
		return sgs_button_kit_classes( $attributes, $prefix, $elements[ $prefix ] );
	}
}

if ( ! function_exists( 'sgs_choice_flow_back_css' ) ) {
	/**
	 * Back's CSS. Its colours, border and desktop radius carry defaults, and its rule has always printed through
	 * `sgs_button_element_style_css()`; with no preset chosen that rule stays as it was (one base rule, the radius as the corners
	 * longhands), and the kit prints only what it adds: the other devices' radius, padding, type, min height, shadow and width.
	 * With a preset chosen the kit prints everything, the defaults dropped (`sgs_choice_flow_button_attrs()`).
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $selector   Back's scoped selector.
	 * @param array<string,mixed> $defaults   {@see sgs_choice_flow_attribute_defaults()}.
	 * @return string CSS text.
	 */
	function sgs_choice_flow_back_css( array $attributes, string $selector, array $defaults ): string {
		require_once __DIR__ . '/helpers-button-style.php';
		$opts = array( 'element' => sgs_choice_flow_button_elements()['back'] );
		$kit  = sgs_choice_flow_button_attrs( $attributes, 'back', $defaults );
		if ( $kit !== $attributes ) {
			return sgs_button_kit_css( $kit, 'back', $selector, $opts );
		}
		$legacy = array();
		foreach ( array( 'ColourBackground', 'ColourText', 'ColourBorder', 'ColourBackgroundHover', 'ColourTextHover', 'ColourBorderHover', 'BorderStyle', 'BorderWidth' ) as $base ) {
			if ( isset( $attributes[ 'back' . $base ] ) ) {
				$legacy[ 'back' . $base ] = $attributes[ 'back' . $base ];
				unset( $kit[ 'back' . $base ] );
			}
		}
		$radius = $attributes['backBorderRadius'] ?? null;
		if ( is_array( $radius ) ) {
			$legacy['backBorderRadius'] = is_array( $radius['desktop'] ?? null ) ? $radius['desktop'] : array();
			unset( $radius['desktop'] );
			$kit['backBorderRadius'] = $radius;
		}
		return sgs_button_element_style_css( $legacy, 'back', $selector ) . sgs_button_kit_css( $kit, 'back', $selector, $opts );
	}
}

if ( ! function_exists( 'sgs_choice_flow_buttons_css' ) ) {
	/**
	 * The scoped CSS of every flow button's kit settings: Back's always (its look attributes carry defaults), each other button's
	 * only when it has a setting.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $root_sel   The flow's own scoped root selector.
	 * @param array<string,mixed> $defaults   {@see sgs_choice_flow_attribute_defaults()}.
	 * @return string CSS text ('' when nothing prints).
	 */
	function sgs_choice_flow_buttons_css( array $attributes, string $root_sel, array $defaults ): string {
		require_once __DIR__ . '/helpers-button-style.php';
		$css = '';
		foreach ( sgs_choice_flow_button_elements() as $prefix => $element ) {
			if ( 'back' === $prefix ) {
				$css .= sgs_choice_flow_back_css( $attributes, $root_sel . ' ' . $element, $defaults );
				continue;
			}
			$css .= sgs_button_kit_css(
				sgs_choice_flow_button_attrs( $attributes, $prefix, $defaults ),
				$prefix,
				$root_sel . ' ' . $element,
				array( 'element' => $element )
			);
		}
		return $css;
	}
}
