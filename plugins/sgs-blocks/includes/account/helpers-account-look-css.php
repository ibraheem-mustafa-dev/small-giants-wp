<?php
/**
 * Scoped CSS for the Round 9 look settings of sgs/account: the menu bar width and Orders count, the orders list,
 * the address cards, the account details form and the sign-in button, link and Remember me row.
 *
 * Every attribute is unset by default and prints nothing; the shared emitters (fill, text, border, shadow, type and
 * the responsive tiers) do the writing, so no setting has its own emitter. Each rule starts with the block's root
 * selector, which out-ranks the stylesheet's fixed rules without `!important`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/render-helpers.php';
require_once dirname( __DIR__ ) . '/helpers-responsive.php';
require_once dirname( __DIR__ ) . '/helpers-typography.php';
require_once dirname( __DIR__ ) . '/helpers-border-style.php';
require_once dirname( __DIR__ ) . '/helpers-colour-variants.php';
require_once dirname( __DIR__ ) . '/helpers-button-preset.php';
require_once __DIR__ . '/helpers-account-header.php';
require_once __DIR__ . '/helpers-account-cells-css.php';

if ( ! function_exists( 'sgs_account_box_shape_css' ) ) {
	/**
	 * Fill, border and shadow of one element. The caller runs `sgs_border_element_decls()` with a literal prefix and
	 * hands the result in, so the border gate can read which attributes the call reads.
	 *
	 * @param array  $attributes Block attributes.
	 * @param array  $border     The result of sgs_border_element_decls() for this element.
	 * @param string $selector   Fully scoped selector.
	 * @param array  $map        Names: background, shadow, shadow_colour.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_box_shape_css( array $attributes, array $border, string $selector, array $map ): string {
		$fill   = sgs_fill_decls( $attributes, array( 'base' => $map['background'] ) );
		$shadow = sgs_shadow_decls(
			$attributes,
			array(
				'base'   => $map['shadow'],
				'colour' => $map['shadow_colour'],
			),
			'sgs/account'
		);
		$base   = array_merge( $fill['normal'], $border['base'], $shadow['normal'] );
		$css    = $base ? $selector . '{' . implode( ';', $base ) . ';}' : '';
		$css   .= implode( '', $border['rules'] );
		$css   .= sgs_emit_tier_decls(
			$selector,
			array(
				'tablet' => $border['tablet'],
				'mobile' => $border['mobile'],
			)
		);
		return $css;
	}
}

if ( ! function_exists( 'sgs_account_length_transform' ) ) {
	/**
	 * Responsive-emitter transform for a single CSS length (a bare number is pixels).
	 *
	 * @param mixed $raw Stored value.
	 * @return string
	 */
	function sgs_account_length_transform( $raw ): string {
		return is_numeric( $raw ) ? (string) (float) $raw . 'px' : sgs_css_single_length_value( $raw );
	}
}

if ( ! function_exists( 'sgs_account_menu_look_css' ) ) {
	/**
	 * Menu: the active bar's width per device, and the Orders count's type and colour.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   Scoped root selector.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_menu_look_css( array $attributes, string $root_sel ): string {
		$tiered = sgs_object_attr_keys( 'sgs/account' );
		$css    = array();
		$bar    = $root_sel . ' nav.woocommerce-MyAccount-navigation .woocommerce-MyAccount-navigation-link.is-active > a::after';
		if ( ! empty( $attributes['menuActiveIndicatorWidth'] ) && is_array( $attributes['menuActiveIndicatorWidth'] ) ) {
			$css[] = sgs_emit_responsive_css(
				$bar,
				array(
					array(
						'value'     => $attributes['menuActiveIndicatorWidth'],
						'css'       => 'width',
						'transform' => 'sgs_account_length_transform',
					),
				)
			);
		}
		if ( 'line' === ( $attributes['menuActiveIndicatorStyle'] ?? '' ) ) {
			$link   = $root_sel . ' nav.woocommerce-MyAccount-navigation .woocommerce-MyAccount-navigation-link.is-active > a';
			$colour = sgs_colour_value( (string) ( $attributes['menuActiveIndicatorColour'] ?? '' ) );
			$colour = '' !== $colour ? $colour : 'currentColor';
			$width  = is_array( $attributes['menuActiveIndicatorWidth'] ?? null ) ? (string) ( $attributes['menuActiveIndicatorWidth']['desktop'] ?? '' ) : '';
			$width  = '' !== $width ? sgs_account_length_transform( $width ) : '3px';
			// The focus ring replaces box-shadow, so the line is also handed to it as --sgs-focus-under.
			$side   = 'inset ' . $width . ' 0 0 0 ' . $colour;
			$under  = 'inset 0 -' . $width . ' 0 0 ' . $colour;
			$css[]  = SGS_Breakpoints::media( 'desktop' ) . '{' . $link . '{box-shadow:' . $side . ';--sgs-focus-under:' . $side . ';}}';
			$css[]  = SGS_Breakpoints::media( 'tablet' ) . '{' . $link . '{background:transparent;box-shadow:' . $under . ';--sgs-focus-under:' . $under . ';}}';
			// Forced colours drop box-shadow, so the current item keeps a system-colour line there.
			$css[]  = '@media (forced-colors:active){' . $link . '{border-inline-start:' . $width . ' solid CanvasText;}}';
			$css[]  = $link . '::after{content:none;}';
		}
		$css[] = sgs_typography_css_rule( $attributes, 'menuCount', $root_sel . ' .sgs-account__menu-count', '', false, false, $tiered );
		$css[] = sgs_text_states_css( $root_sel . ' .sgs-account__menu-count', $attributes, array( 'base' => 'menuCountColour' ) );
		return implode( '', array_filter( $css ) );
	}
}

if ( ! function_exists( 'sgs_account_orders_look_css' ) ) {
	/**
	 * Orders list: row fill, hairlines, hover, padding, the cell type and colours, the status pills, and the empty state card.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   Scoped root selector.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_orders_look_css( array $attributes, string $root_sel ): string {
		$tiered = sgs_object_attr_keys( 'sgs/account' );
		$css    = array();

		$row_list = ! empty( $attributes['ordersRowList'] );
		if ( ! empty( $attributes['ordersLook'] ) || $row_list ) {
			$table = $row_list ? $root_sel . ' .sgs-account__orders-list' : $root_sel . '.sgs-account--orders-rows table.woocommerce-orders-table';
			$row   = $row_list ? $table . ' .sgs-account__order' : $table . ' .woocommerce-orders-table__row';
			$line  = sgs_colour_value( (string) ( $attributes['ordersRowBorderColour'] ?? '' ) );
			if ( '' !== $line ) {
				$css[] = ( $row_list ? $table : $table . ' tbody' ) . '{background-color:' . $line . ';border-color:' . $line . ';}';
			}
			$css[] = sgs_fill_states_css(
				$row,
				$attributes,
				array(
					'base'  => 'ordersRowBackground',
					'hover' => 'ordersRowBackgroundHover',
				)
			);
			$css[] = sgs_emit_responsive_css(
				$row,
				array(
					array(
						'value' => $attributes['ordersRowPadding'] ?? array(),
						'css'   => 'padding',
						'box'   => true,
					),
				)
			);
			$cells = array(
				'ordersNumber' => array( $row_list ? '.sgs-account__order-number' : '.woocommerce-orders-table__cell-order-number', 'ordersNumberColour' ),
				'ordersDate'   => array( $row_list ? '.sgs-account__order-date' : '.woocommerce-orders-table__cell-order-date', 'ordersDateColour' ),
				'ordersTotal'  => array( $row_list ? '.sgs-account__order-total' : '.woocommerce-orders-table__cell-order-total', 'ordersTotalColour' ),
			);
			foreach ( $cells as $prefix => $cell ) {
				$css[] = sgs_typography_css_rule( $attributes, $prefix, $row . ' ' . $cell[0], '', false, false, $tiered );
				$css[] = sgs_text_states_css( $row . ' ' . $cell[0], $attributes, array( 'base' => $cell[1] ) );
			}
			$css[] = sgs_typography_css_rule( $attributes, 'ordersSummary', $row . ' ' . ( $row_list ? '.sgs-account__order-summary' : '.woocommerce-orders-table__cell-order-summary' ), '', false, false, $tiered );
			$pill  = $row . ( $row_list ? ' .sgs-account__order-status' : ' .woocommerce-orders-table__cell-order-status' );
			$css[] = sgs_typography_css_rule( $attributes, 'ordersPill', $pill, '', false, false, $tiered );
			$css[] = sgs_fill_states_css( $pill, $attributes, array( 'base' => 'ordersPillBackground' ) );
			$css[] = sgs_text_states_css( $pill, $attributes, array( 'base' => 'ordersPillText' ) );
			$css[] = sgs_emit_responsive_css(
				$pill,
				array(
					array(
						'value' => $attributes['ordersPillPadding'] ?? array(),
						'css'   => 'padding',
						'box'   => true,
					),
				)
			);
			// status slug => background attribute, text attribute.
			$stats = array(
				'pending'    => array( 'ordersPillPendingBackground', 'ordersPillPendingText' ),
				'processing' => array( 'ordersPillProcessingBackground', 'ordersPillProcessingText' ),
				'on-hold'    => array( 'ordersPillOnHoldBackground', 'ordersPillOnHoldText' ),
				'completed'  => array( 'ordersPillCompletedBackground', 'ordersPillCompletedText' ),
				'cancelled'  => array( 'ordersPillCancelledBackground', 'ordersPillCancelledText' ),
				'refunded'   => array( 'ordersPillRefundedBackground', 'ordersPillRefundedText' ),
				'failed'     => array( 'ordersPillFailedBackground', 'ordersPillFailedText' ),
			);
			foreach ( $stats as $slug => $pair ) {
				$status_pill = $row_list
					? $table . ' .sgs-account__order--status-' . $slug . ' .sgs-account__order-status'
					: $table . ' .woocommerce-orders-table__row--status-' . $slug . ' .woocommerce-orders-table__cell-order-status';
				$css[]       = sgs_fill_states_css( $status_pill, $attributes, array( 'base' => $pair[0] ) );
				$css[]       = sgs_text_states_css( $status_pill, $attributes, array( 'base' => $pair[1] ) );
			}
		}

		if ( ! empty( $attributes['ordersEmptyState'] ) ) {
			$card  = $root_sel . ' .sgs-account__orders-empty';
			$css[] = sgs_fill_states_css( $card, $attributes, array( 'base' => 'ordersEmptyBackground' ) );
			$css[] = sgs_border_states_css( $card, $attributes, array( 'base' => 'ordersEmptyBorderColour' ) );
			$css[] = sgs_emit_responsive_css(
				$card,
				array(
					array(
						'value' => $attributes['ordersEmptyPadding'] ?? array(),
						'css'   => 'padding',
						'box'   => true,
					),
				)
			);
			$css[] = sgs_typography_css_rule( $attributes, 'ordersEmptyTitle', $root_sel . ' .sgs-account__orders-empty-title', '', false, false, $tiered );
			$css[] = sgs_text_states_css( $root_sel . ' .sgs-account__orders-empty-title', $attributes, array( 'base' => 'ordersEmptyTitleColour' ) );
			$css[] = sgs_typography_css_rule( $attributes, 'ordersEmptyTextType', $root_sel . ' .sgs-account__orders-empty-text', '', false, false, $tiered );
			$css[] = sgs_text_states_css( $root_sel . ' .sgs-account__orders-empty-text', $attributes, array( 'base' => 'ordersEmptyTextColour' ) );
		}
		return implode( '', array_filter( $css ) );
	}
}

if ( ! function_exists( 'sgs_account_address_look_css' ) ) {
	/**
	 * Address cards, their small-capitals titles and the helper line.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   Scoped root selector.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_address_look_css( array $attributes, string $root_sel ): string {
		$tiered = sgs_object_attr_keys( 'sgs/account' );
		$card   = $root_sel . ' .woocommerce-Address';
		$css    = array();
		$border = sgs_border_element_decls(
			$attributes,
			'addressCard',
			$card,
			array(
				'colour' => array( 'base' => 'addressCardBorderColour' ),
				'radius' => 'addressCardBorderRadius',
			)
		);
		$css[]  = sgs_account_box_shape_css(
			$attributes,
			$border,
			$card,
			array(
				'background'    => 'addressCardBackgroundColour',
				'shadow'        => 'addressCardShadow',
				'shadow_colour' => 'addressCardShadowColour',
			)
		);
		$css[]  = sgs_emit_responsive_css(
			$card,
			array(
				array(
					'value' => $attributes['addressCardPadding'] ?? array(),
					'css'   => 'padding',
					'box'   => true,
				),
			)
		);
		$css[]  = sgs_typography_css_rule( $attributes, 'addressTitle', $root_sel . ' .woocommerce-Address-title :is(h2,h3)', '', false, false, $tiered );
		$css[]  = sgs_text_states_css( $root_sel . ' .woocommerce-Address-title :is(h2,h3)', $attributes, array( 'base' => 'addressTitleColour' ) );
		$css[]  = sgs_typography_css_rule( $attributes, 'addressHelper', $root_sel . ' .sgs-account__address-helper', '', false, false, $tiered );
		$css[]  = sgs_text_states_css( $root_sel . ' .sgs-account__address-helper', $attributes, array( 'base' => 'addressHelperColour' ) );
		return implode( '', array_filter( $css ) );
	}
}

if ( ! function_exists( 'sgs_account_details_look_css' ) ) {
	/**
	 * Account details form: one or two columns, the gap, the Change password heading and rule, helper text and Save button width.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   Scoped root selector.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_details_look_css( array $attributes, string $root_sel ): string {
		$tiered = sgs_object_attr_keys( 'sgs/account' );
		$form   = $root_sel . ' .woocommerce-EditAccountForm';
		$css    = array();

		$cols = (string) ( $attributes['accountFormColumns'] ?? '' );
		if ( in_array( $cols, array( '1', '2' ), true ) ) {
			// Each field takes one cell; WooCommerce's floats and 47% widths are neutralised, and the password section,
			// the clearing node and the Save row span the form.
			$cell  = $form . ' > p{float:none;width:auto;margin:0;}';
			$span  = $form . ' > fieldset,' . $form . ' > .clear,' . $form . ' > p:has(> button[type="submit"]){grid-column:1/-1;}';
			$one   = $form . '{display:grid;grid-template-columns:minmax(0,1fr);}';
			$two   = '@container sgs-account (min-width:640px){' . $form . '{grid-template-columns:repeat(2,minmax(0,1fr));}}';
			$css[] = $one . $cell . $span . ( '2' === $cols ? $two : '' );
		}
		$css[] = sgs_emit_responsive_css(
			$form,
			array(
				array(
					'value'     => $attributes['accountFormGap'] ?? array(),
					'css'       => 'gap',
					'transform' => static function ( $raw ): string {
						return sgs_css_length_value( (string) $raw );
					},
				),
			)
		);
		$css[] = sgs_typography_css_rule( $attributes, 'accountSection', $form . ' fieldset > legend', '', false, false, $tiered );
		$css[] = sgs_text_states_css( $form . ' fieldset > legend', $attributes, array( 'base' => 'accountSectionColour' ) );
		$rule  = sgs_colour_value( (string) ( $attributes['accountSectionRuleColour'] ?? '' ) );
		if ( '' !== $rule ) {
			$css[] = $form . ' fieldset{border-width:1px 0 0;border-style:solid;border-color:' . $rule . ';padding-inline:0;}';
		}
		$css[] = sgs_typography_css_rule( $attributes, 'accountPasswordHelperType', $root_sel . ' .sgs-account__password-helper', '', false, false, $tiered );
		$css[] = sgs_text_states_css( $root_sel . ' .sgs-account__password-helper', $attributes, array( 'base' => 'accountPasswordHelperColour' ) );
		if ( ! empty( $attributes['accountSaveFullWidth'] ) ) {
			$css[] = $form . ' button[type="submit"]{width:100%;}';
		}
		return implode( '', array_filter( $css ) );
	}
}

if ( ! function_exists( 'sgs_account_login_look_css' ) ) {
	/**
	 * The sign-in button (and with the all-forms scope the other form buttons and the buttons inside the account content), the lost-password link, its
	 * placement and the Remember me row.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   Scoped root selector.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_login_look_css( array $attributes, string $root_sel ): string {
		$tiered = sgs_object_attr_keys( 'sgs/account' );
		$css    = array();
		$form   = $root_sel . ' .sgs-account__wc form';

		$buttons = array( $form . ' .woocommerce-form-login__submit' );
		if ( 'all-forms' === ( $attributes['loginButtonScope'] ?? '' ) ) {
			$buttons[] = $form . ' .woocommerce-form-register__submit';
			$buttons[] = $form . '.lost_reset_password button[type="submit"]';
			$buttons[] = $form . '.woocommerce-EditAccountForm button[type="submit"]';
			$buttons[] = $form . ' button[name="save_address"]';
		}
		// The buttons WooCommerce and the wishlist panel print inside the account content (the saved-items empty
		// link, Select options, an order's Pay or Cancel, Browse products) are not form buttons, so the theme paints
		// them in its own button colour; with the all-forms scope they take the same preset, at their natural width.
		// A block notice's action link (Confirm email, View cart) is a text link in the notice look, so it is left out.
		$extra = array();
		if ( 'all-forms' === ( $attributes['loginButtonScope'] ?? '' ) ) {
			$content = $root_sel . ' .woocommerce-MyAccount-content';
			$extra   = array(
				$root_sel . ' .sgs-wishlist-panel__empty-cta',
				$root_sel . ' .sgs-wishlist-panel__choose-options',
				$content . ' a.button:not(.view):not(.wc-block-components-notice-banner__content *)',
				$content . ' a.woocommerce-button:not(.view):not(.wc-block-components-notice-banner__content *)',
				$content . ' button.button:not([type="submit"])',
				$content . ' button.woocommerce-button:not([type="submit"])',
			);
			$buttons = array_merge( $buttons, $extra );
		}
		$preset   = (string) ( $attributes['loginButtonPreset'] ?? '' );
		$reg_pre  = (string) ( $attributes['registerButtonPreset'] ?? '' );
		$register = $form . ' .woocommerce-form-register__submit';
		foreach ( $buttons as $btn ) {
			$css[] = sgs_button_preset_css( $btn, $btn === $register && '' !== $reg_pre ? $reg_pre : $preset );
		}
		if ( ! in_array( $register, $buttons, true ) ) {
			// Create account takes its own preset even when the login scope stops at the sign-in button.
			$css[] = sgs_button_preset_css( $register, $reg_pre );
		}
		$height = $attributes['loginButtonMinHeight'] ?? array();
		foreach ( $buttons as $btn ) {
			$border = sgs_border_element_decls(
				$attributes,
				'loginButton',
				$btn,
				array(
					'colour' => array( 'base' => 'loginButtonBorderColour' ),
					'radius' => 'loginButtonBorderRadius',
				)
			);
			$css[]  = sgs_account_box_shape_css(
				$attributes,
				$border,
				$btn,
				array(
					'background'    => '',
					'shadow'        => 'loginButtonShadow',
					'shadow_colour' => 'loginButtonShadowColour',
				)
			);
			$css[]  = sgs_text_states_css(
				$btn,
				$attributes,
				array(
					'base'  => 'loginButtonText',
					'hover' => 'loginButtonTextHover',
				)
			);
			$css[]  = sgs_fill_states_css(
				$btn,
				$attributes,
				array(
					'base'  => 'loginButtonBackground',
					'hover' => 'loginButtonBackgroundHover',
				)
			);
			$css[]  = sgs_typography_css_rule( $attributes, 'loginButton', $btn, '', false, false, $tiered );
			$css[]  = sgs_emit_responsive_css(
				$btn,
				array(
					array(
						'value' => $attributes['loginButtonPadding'] ?? array(),
						'css'   => 'padding',
						'box'   => true,
					),
				)
			);
			if ( is_array( $height ) && array() !== $height ) {
				$css[] = sgs_emit_responsive_css(
					$btn,
					array(
						array(
							'value'     => $height,
							'css'       => 'min-height',
							'transform' => 'sgs_account_length_transform',
						),
					)
				);
			}
			if ( ! empty( $attributes['loginButtonFullWidth'] ) && ! in_array( $btn, $extra, true ) ) {
				$css[] = $btn . '{width:100%;}';
			}
		}

		$link  = $form . ' .lost_password a';
		$css[] = sgs_typography_css_rule( $attributes, 'loginLink', $link, '', false, false, $tiered );
		if ( '' !== (string) ( $attributes['loginLinkTextDecoration'] ?? '' ) ) {
			// The block's own decoration wins over the global hover underline sweep (extensions.css).
			$css[] = $link . '::after{content:none;}' . $form . ' .woocommerce-privacy-policy-text a::after{content:none;}';
		}
		$css[] = sgs_text_states_css(
			$link,
			$attributes,
			array(
				'base'  => 'loginLinkColour',
				'hover' => 'loginLinkColourHover',
			)
		);

		$login  = $form . '.woocommerce-form-login';
		$place  = (string) ( $attributes['loginLinkPlacement'] ?? '' );
		$remind = $login . ' .woocommerce-form-login__rememberme';
		$lost   = $login . ' .lost_password';
		$submit = $login . ' .woocommerce-form-login__submit';
		if ( 'remember-row' === $place ) {
			// The row holding the checkbox and the button dissolves into the form grid: the checkbox and the link share
			// the row above the full-width button.
			$css[] = $login . '{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:1rem;}'
				. $login . ' > *{grid-column:1/-1;}'
				. $login . ' > .form-row:has(.woocommerce-form-login__submit){display:contents;}'
				. $remind . '{grid-column:1;grid-row:3;}' . $lost . '{grid-column:2;grid-row:3;margin:0;}'
				. $submit . '{grid-column:1/-1;grid-row:4;}';
		} elseif ( 'beside-button' === $place ) {
			$css[] = $login . '{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;column-gap:1.5rem;}'
				. $login . ' > *{grid-column:1/-1;}'
				. $login . ' > .form-row:has(.woocommerce-form-login__submit){display:contents;}'
				. $remind . '{grid-column:1/-1;grid-row:3;}' . $submit . '{grid-column:1;grid-row:4;}' . $lost . '{grid-column:2;grid-row:4;margin:0;}';
		}
		if ( ! empty( $attributes['hideRememberMe'] ) ) {
			$css[] = $remind . '{display:none;}';
		}
		return implode( '', array_filter( $css ) );
	}
}

if ( ! function_exists( 'sgs_account_order_detail_look_css' ) ) {
	/**
	 * Order page: the type of the address and payment text.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   Scoped root selector.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_order_detail_look_css( array $attributes, string $root_sel ): string {
		return sgs_typography_css_rule( $attributes, 'orderDetailText', $root_sel . ' .sgs-account__od-text', '', false, false, sgs_object_attr_keys( 'sgs/account' ) );
	}
}

if ( ! function_exists( 'sgs_account_look_css' ) ) {
	/**
	 * All Round 9 look rules for one sgs/account instance.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   Scoped root selector.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_look_css( array $attributes, string $root_sel ): string {
		return sgs_account_menu_look_css( $attributes, $root_sel )
			. sgs_account_orders_look_css( $attributes, $root_sel )
			. sgs_account_order_detail_look_css( $attributes, $root_sel )
			. sgs_account_address_look_css( $attributes, $root_sel )
			. sgs_account_details_look_css( $attributes, $root_sel )
			. sgs_account_login_look_css( $attributes, $root_sel )
			. sgs_account_header_css( $attributes, $root_sel )
			. sgs_account_cells_css( $attributes, $root_sel );
	}
}
