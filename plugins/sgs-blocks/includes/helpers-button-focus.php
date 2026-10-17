<?php
/**
 * The keyboard focus style of an sgs/button (`focusStyle`): Default, Contrast or Signature.
 *
 * The focus system (theme/sgs-theme/assets/css/focus.css, Spec 32 §14.5) draws every button's ring. `focusStyle`
 * picks a variant for one button: `""` keeps the site's look, `"duotone"` adds `sgs-focus--duotone` (the dark-and-light
 * ring), `"signature"` adds `sgs-focus--signature` (a slowly turning border drawn on the button's `::before`).
 *
 * Signature is refused (no class, no host-border rule) when something else already owns the button's `::before`: a
 * gradient border (`sgs_border_gradient_css`) or a motion layer on the button root whose effect claims the `::before`
 * paint slot in the motion schema (`x-sgs-effects.<effect>.slots`, FR-38A-49: cursor-field, wave-gradient). The editor
 * twin is src/blocks/button/focus-style.js, which disables the option with the same reason.
 *
 * A signature button with a border also sets `--sgs-focus-host-border` to that border's width, so focus.css anchors
 * the band outside the ring rather than over it. A preset-less button with no border of its own takes the border of its
 * sgs/multi-button group default (`childBtnBorderWidth` / `childBtnBorderStyle`, provided as block context), which
 * style.css paints through `:where(.sgs-multi-button) .sgs-button`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/motion/class-sgs-motion-field-types.php';
require_once __DIR__ . '/motion/class-sgs-motion-layers.php';
require_once __DIR__ . '/motion/class-sgs-motion-targets.php';

const SGS_BUTTON_FOCUS_CLASSES = array(
	'duotone'   => 'sgs-focus--duotone',
	'signature' => 'sgs-focus--signature',
);

/** The presets whose stylesheet rule gives the button a border (style.css `.sgs-button--<preset>`). */
const SGS_BUTTON_FOCUS_BORDERED_PRESETS = array( 'primary', 'secondary', 'outline' );

if ( ! function_exists( 'sgs_button_focus_style' ) ) {
	/**
	 * The stored focus style, validated: `''`, `'duotone'` or `'signature'`.
	 *
	 * @param array $attributes Block attributes.
	 * @return string
	 */
	function sgs_button_focus_style( array $attributes ): string {
		$style = isset( $attributes['focusStyle'] ) && is_string( $attributes['focusStyle'] ) ? $attributes['focusStyle'] : '';
		return array_key_exists( $style, SGS_BUTTON_FOCUS_CLASSES ) ? $style : '';
	}
}

if ( ! function_exists( 'sgs_button_focus_before_owner' ) ) {
	/**
	 * The label of the motion effect on the button root that claims the `::before` paint slot, or `''`.
	 *
	 * The root is the `root` element of the motion document and any declared part marked `isWrapper` (both resolve to
	 * the button itself in `Sgs_Motion_Targets::resolve`).
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $block_name Block name.
	 * @return string
	 */
	function sgs_button_focus_before_owner( array $attributes, string $block_name = 'sgs/button' ): string {
		$elements = $attributes['sgsMotion']['elements'] ?? null;
		if ( ! is_array( $elements ) ) {
			return '';
		}
		$roots = array( 'root' );
		foreach ( \SGS\Blocks\Motion\Sgs_Motion_Targets::parts( $block_name ) as $part => $is_wrapper ) {
			if ( $is_wrapper ) {
				$roots[] = (string) $part;
			}
		}
		foreach ( $elements as $key => $element ) {
			if ( ! is_array( $element ) || ! in_array( (string) $key, $roots, true ) ) {
				continue;
			}
			foreach ( \SGS\Blocks\Motion\Sgs_Motion_Layers::element_layers( $element ) as $entry ) {
				foreach ( \SGS\Blocks\Motion\Sgs_Motion_Layers::slot_claims( $entry ) as $slot ) {
					if ( '::before' === ( $slot['slot'] ?? '' ) ) {
						return (string) ( $slot['label'] ?? $entry['effect'] );
					}
				}
			}
		}
		return '';
	}
}

if ( ! function_exists( 'sgs_button_focus_signature_refused' ) ) {
	/**
	 * Whether Signature is refused: a gradient border or a `::before`-owning motion effect is on the button.
	 *
	 * @param array $attributes Block attributes.
	 * @return bool
	 */
	function sgs_button_focus_signature_refused( array $attributes ): bool {
		$gradient = isset( $attributes['borderColourGradient'] ) ? sgs_css_gradient_value( (string) $attributes['borderColourGradient'] ) : '';
		return '' !== $gradient || '' !== sgs_button_focus_before_owner( $attributes );
	}
}

if ( ! function_exists( 'sgs_button_focus_class' ) ) {
	/**
	 * The focus-system class the button root carries, or `''` (Default, or a refused Signature).
	 *
	 * @param array $attributes Block attributes.
	 * @return string
	 */
	function sgs_button_focus_class( array $attributes ): string {
		$style = sgs_button_focus_style( $attributes );
		if ( '' === $style || ( 'signature' === $style && sgs_button_focus_signature_refused( $attributes ) ) ) {
			return '';
		}
		return SGS_BUTTON_FOCUS_CLASSES[ $style ];
	}
}

if ( ! function_exists( 'sgs_button_focus_host_border' ) ) {
	/**
	 * The `--sgs-focus-host-border` value of a signature button: its own border width (the widest side when the sides
	 * differ), else its preset's border width token; `''` when the button draws no border.
	 *
	 * @param string[] $widths       Resolved side widths, top/right/bottom/left (`''` = unset), from sgs_css_length_value().
	 * @param string   $border_style Resolved border style keyword (sgs_border_style_keyword()).
	 * @param string   $preset       The button's style preset (`inheritStyle`).
	 * @return string
	 */
	function sgs_button_focus_host_border( array $widths, string $border_style, string $preset ): string {
		if ( in_array( $border_style, array( 'none', 'hidden' ), true ) ) {
			return '';
		}
		$set = array_filter(
			$widths,
			static function ( $width ) {
				return '' !== $width;
			}
		);
		if ( array() !== $set ) {
			$sides = array();
			foreach ( $widths as $width ) {
				$sides[] = ( '' === $width || 1 === preg_match( '/^0+(?:\.0+)?(?:[a-z%]+)?$/', $width ) ) ? '0px' : $width;
			}
			$distinct = array_values( array_unique( $sides ) );
			if ( array( '0px' ) === $distinct ) {
				return '';
			}
			return 1 === count( $distinct ) ? $distinct[0] : 'max(' . implode( ',', $sides ) . ')';
		}
		if ( in_array( $preset, SGS_BUTTON_FOCUS_BORDERED_PRESETS, true ) ) {
			return "var(--wp--custom--button-presets--{$preset}--border-width,2px)";
		}
		return '';
	}
}

if ( ! function_exists( 'sgs_button_focus_group_host_border' ) ) {
	/**
	 * The `--sgs-focus-host-border` value a preset-less button takes from its sgs/multi-button group default border.
	 *
	 * The group's width box is a four-value shorthand in CSS, which `calc()` cannot use, so the width is resolved here
	 * from the block context the group provides (`sgs/childBtnBorderWidth`, `sgs/childBtnBorderStyle`), through the same
	 * resolver as a button's own border. `''` when there is no context, no group border or the group style is none/hidden.
	 *
	 * @param array $context Block context of the button.
	 * @return string
	 */
	function sgs_button_focus_group_host_border( array $context ): string {
		$box = $context['sgs/childBtnBorderWidth'] ?? null;
		if ( ! is_array( $box ) ) {
			return '';
		}
		$widths = array();
		foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
			$widths[] = is_scalar( $box[ $side ] ?? null ) ? sgs_css_length_value( $box[ $side ] ) : '';
		}
		return sgs_button_focus_host_border( $widths, sgs_border_style_keyword( $context['sgs/childBtnBorderStyle'] ?? '' ), '' );
	}
}
