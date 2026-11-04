<?php
/**
 * Scoped CSS for the field look of sgs/account: WooCommerce's own log-in, register, lost-password, address and
 * account-details inputs, selects, textareas and labels.
 *
 * Fill, border, corner radius, shadow and the resting border colour go through the form's shared writer
 * (`SGS\Blocks\Forms\field_own_style_css`, handed this block's selector); padding, height, text and placeholder
 * colour, type and the label settings go through the same shared emitters sgs/form uses. Every attribute is
 * unset by default, so an account block that sets none prints nothing and WooCommerce's own look, with the
 * stylesheet's fixed rules, stands.
 *
 * Specificity: every rule starts with the block's root selector (class + class) and names `.sgs-account__wc form`,
 * which out-ranks the stylesheet's fixed `.sgs-account form input.input-text` rules without any `!important`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/render-helpers.php';
require_once dirname( __DIR__ ) . '/helpers-responsive.php';
require_once dirname( __DIR__ ) . '/helpers-typography.php';
require_once dirname( __DIR__ ) . '/forms/field-own-style.php';

if ( ! function_exists( 'sgs_account_field_css' ) ) {
	/**
	 * Build the field and label rules for one `sgs/account` instance.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   The block's scoped root selector (`.{uid}.wp-block-sgs-account`).
	 * @return string CSS text (may be '').
	 */
	function sgs_account_field_css( array $attributes, string $root_sel ): string {
		$tiered = sgs_object_attr_keys( 'sgs/account' );
		$css    = '';
		$scope  = $root_sel . ' .sgs-account__wc form ';
		// Plain selectors, each fully scoped: a list of the controls, and the same without the selected-country box.
		$list   = static function ( array $parts ) use ( $scope ): string {
			return $scope . implode( ',' . $scope, $parts );
		};
		$native = $list( array( 'input.input-text', 'select', 'textarea' ) );

		// The shared writer: fill, border width/style/colour, corner radius and shadow on every control, the
		// selected-country box included.
		$css .= \SGS\Blocks\Forms\field_own_style_css(
			$attributes,
			ltrim( $root_sel, '.' ),
			$list( array( 'input.input-text', 'select', 'textarea', '.select2-container .select2-selection--single' ) )
		);

		// Text colour typed into a field.
		$text = sgs_text_decls( $attributes, array( 'base' => 'fieldTextColour' ) )['normal'];
		if ( array() !== $text ) {
			$css .= $native . '{' . implode( ';', $text ) . ';}';
		}

		// Placeholder colour.
		$holder = sgs_colour_value( (string) ( $attributes['fieldPlaceholderColour'] ?? '' ) );
		if ( '' !== $holder ) {
			$css .= $list( array( 'input.input-text::placeholder', 'textarea::placeholder' ) ) . '{color:' . $holder . ';}';
		}

		// Padding and height, per device. A height the client set is the height, even under 44px.
		$height = static function ( $raw ): string {
			return is_numeric( $raw ) ? (string) (float) $raw . 'px' : sgs_css_single_length_value( $raw );
		};
		$specs  = array(
			array(
				$native,
				array(
					'value'        => $attributes['fieldPadding'] ?? null,
					'css'          => 'padding',
					'box'          => true,
					'unit_default' => 'px',
				),
			),
			array(
				$list( array( 'input.input-text', 'select', '.select2-container .select2-selection--single' ) ),
				array(
					'value'     => $attributes['fieldMinHeight'] ?? null,
					'css'       => 'min-height',
					'transform' => $height,
				),
			),
		);
		foreach ( $specs as $spec ) {
			if ( is_array( $spec[1]['value'] ) && array() !== $spec[1]['value'] ) {
				$css .= sgs_emit_responsive_css( $spec[0], array( $spec[1] ) );
			}
		}

		// Field and label type, each selector built inline so the typography governance gate can read the element.
		$css .= sgs_typography_css_rule( $attributes, 'field', $root_sel . ' .sgs-account__wc form input.input-text,' . $root_sel . ' .sgs-account__wc form select,' . $root_sel . ' .sgs-account__wc form textarea', '', false, false, $tiered );
		$css .= sgs_typography_css_rule( $attributes, 'label', $root_sel . ' .sgs-account__wc form label', '', false, false, $tiered );

		// Label colour.
		$label_text = sgs_text_decls( $attributes, array( 'base' => 'labelColour' ) )['normal'];
		if ( array() !== $label_text ) {
			$css .= $root_sel . ' .sgs-account__wc form label{' . implode( ';', $label_text ) . ';}';
		}

		// Label above: a block above the field, the gap beneath it. A checkbox label keeps its own inline row.
		if ( 'above' === ( $attributes['labelPosition'] ?? '' ) ) {
			$above = $root_sel . ' .sgs-account__wc form label:not(.woocommerce-form__label-for-checkbox)';
			$css  .= $above . '{display:block;}';
			$gap   = $attributes['labelGap'] ?? null;
			if ( is_array( $gap ) && array() !== $gap ) {
				$css .= sgs_emit_responsive_css(
					$above,
					array(
						array(
							'value'     => $gap,
							'css'       => 'margin-bottom',
							'transform' => static function ( $raw ): string {
								return sgs_css_length_value( (string) $raw );
							},
						),
					)
				);
			}
		}

		return $css;
	}
}
