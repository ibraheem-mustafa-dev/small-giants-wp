<?php
/**
 * Spacing, size, border and underline settings of sgs/account that replace hand-written Custom CSS, and the type
 * targets beside them.
 *
 * Every attribute is unset by default and prints nothing. Each rule starts with the block's root selector plus the
 * `.sgs-account` class, which is the specificity the Custom CSS rules it replaces carried, so a client that sets a
 * value gets the same cascade result. Lengths go through the shared responsive emitter (a bare number is pixels).
 *
 * Kinds: len (one length per device), num (a unitless number per device), box (four sides per device), edge (a
 * one-side line: the width, solid, in the theme's border colour), frame (a four-side line, same colour; 0 prints
 * `border:0`), rule (a bottom rule in the link's own colour that also drops the underline), sel (a text-decoration
 * choice) and tog (hide the element).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/render-helpers.php';
require_once dirname( __DIR__ ) . '/helpers-responsive.php';
require_once dirname( __DIR__ ) . '/helpers-typography.php';

if ( ! function_exists( 'sgs_account_cell_rows' ) ) {
	/**
	 * The setting rows: attribute, kind, selector (`@r` = the block root with `.sgs-account`, `@root` = the block root
	 * alone), CSS properties, and an optional device edge (`desktop`) that wraps the rule in `SGS_Breakpoints::media()`.
	 *
	 * @return array[]
	 */
	function sgs_account_cell_rows(): array {
		return array(
		// Menu: frame and items.
		array( 'menuSidebarBorderWidth', 'edge', '@root.sgs-account--desktop-sidebar nav.woocommerce-MyAccount-navigation', array( 'border-left' ), 'desktop' ),
		array( 'menuTabRowBorderWidth', 'edge', '@r nav.woocommerce-MyAccount-navigation', array( 'border-bottom' ), '' ),
		array( 'menuTabRowMarginBottom', 'len', '@r nav.woocommerce-MyAccount-navigation', array( 'margin-bottom' ), '' ),
		array( 'menuItemMinHeight', 'len', '@r nav.woocommerce-MyAccount-navigation li a', array( 'min-height' ), '' ),
		array( 'menuItemPadding', 'box', '@r nav.woocommerce-MyAccount-navigation li.woocommerce-MyAccount-navigation-link > a', array( 'padding' ), '' ),
		array( 'menuItemRadius', 'len', '@r nav.woocommerce-MyAccount-navigation li.woocommerce-MyAccount-navigation-link > a', array( 'border-radius' ), '' ),
		array( 'menuItemGap', 'len', '@r nav.woocommerce-MyAccount-navigation li.woocommerce-MyAccount-navigation-link:not(.woocommerce-MyAccount-navigation-link--customer-logout) > a', array( 'gap' ), '' ),
		array( 'menuListGap', 'len', '@r nav.woocommerce-MyAccount-navigation ul', array( 'gap' ), '' ),
		array( 'menuListPadding', 'box', '@r nav.woocommerce-MyAccount-navigation ul', array( 'padding' ), '' ),
		// Page header: spacing.
		array( 'headerEyebrowMarginBottom', 'len', '@r .sgs-account__header-eyebrow', array( 'margin-bottom' ), '' ),
		array( 'headerAccountEyebrowMarginBottom', 'len', '@r .sgs-account__header--account .sgs-account__header-eyebrow', array( 'margin-bottom' ), '' ),
		array( 'headerSignInMarginBottom', 'len', '@r .sgs-account__header--signin', array( 'margin-bottom' ), '' ),
		array( 'headerResetMarginBottom', 'len', '@root:has(form.lost_reset_password) .sgs-account__header', array( 'margin-bottom' ), '' ),
		array( 'headerAccountTitleLineHeight', 'num', '@r .sgs-account__header--account .sgs-account__header-title', array( 'line-height' ), '' ),
		array( 'headerBackLineMargin', 'box', '@r .sgs-account__header-backline', array( 'margin' ), '' ),
		array( 'headerBackRuleWidth', 'rule', '@r .sgs-account__header-back', array( 'border-bottom' ), '' ),
		array( 'registerHintMarginTop', 'len', '@r .sgs-account__register-hint', array( 'margin-top' ), '' ),
		array( 'mobileHintMargin', 'box', '@r .sgs-account__mobile-hint', array( 'margin' ), '' ),
		// Sign-in and register: spacing and size.
		array( 'authPairGap', 'len', '@r .sgs-account__wc > #customer_login.u-columns.col2-set', array( 'gap' ), '' ),
		array( 'authPairBorderWidth', 'frame', '@r .sgs-account__wc > #customer_login.u-columns.col2-set', array( 'border' ), '' ),
		array( 'authPairCellPadding', 'box', '@r .sgs-account__wc > #customer_login.u-columns.col2-set > div', array( 'padding' ), '' ),
		array( 'authPairCellBorderWidth', 'frame', '@r .sgs-account__wc > #customer_login.u-columns.col2-set > div', array( 'border' ), '' ),
		array( 'authPairCellRadius', 'len', '@r .sgs-account__wc > #customer_login.u-columns.col2-set > div', array( 'border-radius' ), '' ),
		array( 'authPanelHeadingMargin', 'box', '@r #customer_login h2', array( 'margin' ), '' ),
		array( 'authFormRowGap', 'len', '@r #customer_login form', array( 'row-gap' ), '' ),
		array( 'loginFormRowGap', 'len', '@r #customer_login form.woocommerce-form-login', array( 'row-gap' ), '' ),
		array( 'loginRowMarginBottom', 'len', '@r #customer_login form.woocommerce-form-login > p.woocommerce-form-row,@r #customer_login form.woocommerce-form-login .woocommerce-form-login__rememberme,@r #customer_login form.woocommerce-form-login .lost_password', array( 'margin-bottom' ), '' ),
		array( 'loginLinkPadding', 'box', '@r .woocommerce-form-login .lost_password', array( 'padding' ), '' ),
		array( 'loginLinkRuleWidth', 'rule', '@r .woocommerce-form-login .lost_password a', array( 'border-bottom' ), '' ),
		array( 'loginRememberMinHeight', 'len', '@r .woocommerce-form-login__rememberme', array( 'min-height' ), '' ),
		array( 'loginRememberGap', 'len', '@r .woocommerce-form-login__rememberme', array( 'gap' ), '' ),
		array( 'rememberCheckboxSize', 'len', '@r .woocommerce-form-login__rememberme input[type="checkbox"]', array( 'width', 'height' ), '' ),
		array( 'privacyLinkTextDecoration', 'sel', '@r .woocommerce-privacy-policy-text a', array( 'text-decoration' ), '' ),
		// Reset view: spacing and size.
		array( 'resetFormMaxWidth', 'len', '@root:has(form.lost_reset_password.woocommerce-ResetPassword)', array( 'max-width' ), '' ),
		array( 'resetFormBorderWidth', 'frame', '@r .sgs-account__wc > form.lost_reset_password.woocommerce-ResetPassword', array( 'border' ), '' ),
		array( 'resetFormRadius', 'len', '@r .sgs-account__wc > form.lost_reset_password.woocommerce-ResetPassword', array( 'border-radius' ), '' ),
		array( 'resetFormPadding', 'box', '@r .sgs-account__wc > form.lost_reset_password.woocommerce-ResetPassword', array( 'padding' ), '' ),
		array( 'resetFormGap', 'len', '@r .sgs-account__wc > form.lost_reset_password', array( 'gap' ), '' ),
		array( 'resetHideIntro', 'tog', '@r form.lost_reset_password > p:not(.form-row):not(.sgs-account__reset-error)', array( 'display:none' ), '' ),
		array( 'resetRowMargin', 'box', '@r form.lost_reset_password .form-row', array( 'margin' ), '' ),
		array( 'resetRowPadding', 'box', '@r form.lost_reset_password .form-row', array( 'padding' ), '' ),
		array( 'resetErrorMargin', 'box', '@r .sgs-account__reset-error', array( 'margin' ), '' ),
		array( 'resetNoticeBorderWidth', 'frame', '@root:has(form.lost_reset_password) .woocommerce-error', array( 'border' ), '' ),
		array( 'resetNoticePadding', 'box', '@root:has(form.lost_reset_password) .woocommerce-error', array( 'padding' ), '' ),
		array( 'resetNoticeMargin', 'box', '@root:has(form.lost_reset_password) .woocommerce-error', array( 'margin' ), '' ),
		array( 'resetNoticeItemPadding', 'box', '@root:has(form.lost_reset_password) .woocommerce-error li', array( 'padding' ), '' ),
		// Account details: spacing.
		array( 'accountFormMaxWidth', 'len', '@r form.woocommerce-EditAccountForm', array( 'max-width' ), '' ),
		array( 'accountFieldsetBorderWidth', 'frame', '@r form.woocommerce-EditAccountForm fieldset', array( 'border' ), '' ),
		array( 'accountFieldsetMargin', 'box', '@r form.woocommerce-EditAccountForm fieldset', array( 'margin' ), '' ),
		array( 'accountFieldsetPadding', 'box', '@r form.woocommerce-EditAccountForm fieldset', array( 'padding' ), '' ),
		array( 'accountFieldsetGap', 'len', '@r form.woocommerce-EditAccountForm fieldset', array( 'gap' ), '' ),
		array( 'accountLegendPadding', 'box', '@r form.woocommerce-EditAccountForm fieldset > legend', array( 'padding' ), '' ),
		array( 'accountLegendMargin', 'box', '@r form.woocommerce-EditAccountForm fieldset > legend', array( 'margin' ), '' ),
		array( 'accountLegendRuleWidth', 'edge', '@r form.woocommerce-EditAccountForm fieldset > legend', array( 'border-top' ), '' ),
		array( 'accountFormRowMargin', 'box', '@r form.woocommerce-EditAccountForm .form-row', array( 'margin' ), '' ),
		array( 'accountFormRowPadding', 'box', '@r form.woocommerce-EditAccountForm .form-row', array( 'padding' ), '' ),
		array( 'accountPasswordHelperMargin', 'box', '@r form.woocommerce-EditAccountForm fieldset .sgs-account__password-helper', array( 'margin' ), '' ),
		// Addresses: spacing and size.
		array( 'saveAddressMinHeight', 'len', '@r .sgs-account__wc form[method="post"] button[name="save_address"]', array( 'min-height' ), '' ),
		array( 'saveAddressPadding', 'box', '@r .sgs-account__wc form[method="post"] button[name="save_address"]', array( 'padding' ), '' ),
		array( 'addressTitleRowGap', 'len', '@r .woocommerce-Address-title', array( 'gap' ), '' ),
		array( 'addressTitleRowMarginBottom', 'len', '@r .woocommerce-Address-title', array( 'margin-bottom' ), '' ),
		array( 'addressTitleRowPadding', 'box', '@r .woocommerce-Address-title', array( 'padding' ), '' ),
		array( 'addressTitleMargin', 'box', '@r .woocommerce-Address-title :is(h2,h3)', array( 'margin' ), '' ),
		array( 'addressTitlePadding', 'box', '@r .woocommerce-Address-title :is(h2,h3)', array( 'padding' ), '' ),
		array( 'addressEditRuleWidth', 'rule', '@r .woocommerce-Address-title a.edit', array( 'border-bottom' ), '' ),
		array( 'addressEditMargin', 'box', '@r .woocommerce-Address-title a.edit', array( 'margin' ), '' ),
		array( 'addressHelperMarginTop', 'len', '@r .sgs-account__address-helper', array( 'margin-top' ), '' ),
		array( 'addressActionsMarginTop', 'len', '@r .sgs-account__addr-actions', array( 'margin-top' ), '' ),
		// Order page: spacing and underline.
		array( 'orderDetailBackMinHeight', 'len', '@r .sgs-account__od-back', array( 'min-height' ), '' ),
		array( 'orderDetailBackGap', 'len', '@r .sgs-account__od-back', array( 'gap' ), '' ),
		array( 'orderDetailChatUnderline', 'sel', '@r .sgs-account__od-chat,@r .sgs-account__od-chat:hover', array( 'text-decoration' ), '' ),
		array( 'orderDetailBoxTitleMarginBottom', 'len', '@r .sgs-account__od-box-title', array( 'margin-bottom' ), '' ),
		array( 'orderDetailLastBoxTitleMarginBottom', 'len', '@r .sgs-account__od-box:last-child .sgs-account__od-box-title', array( 'margin-bottom' ), '' ),
		array( 'orderDetailTotalRowPaddingTop', 'len', '@r .sgs-account__od-row--total', array( 'padding-top' ), '' ),
		array( 'orderDetailTotalRowMarginTop', 'len', '@r .sgs-account__od-row--total', array( 'margin-top' ), '' ),
		array( 'orderDetailTotalRowRuleWidth', 'edge', '@r .sgs-account__od-row--total', array( 'border-top' ), '' ),
		array( 'orderDetailTitleMarginBottom', 'len', '@r .sgs-account__od-title', array( 'margin-bottom' ), '' ),
		array( 'orderDetailItemMetaMarginTop', 'len', '@r .sgs-account__od-item-meta', array( 'margin-top' ), '' ),
		array( 'ordersRowTextDecoration', 'sel', '@r .sgs-account__order,@r .sgs-account__order:hover,@r .sgs-account__order *', array( 'text-decoration' ), '' ),
		// Orders, tabs and signed-out width.
		array( 'ordersEmptyButtonMinHeight', 'len', '@r .sgs-account__orders-empty-actions .sgs-button', array( 'min-height' ), '' ),
		array( 'ordersEmptyButtonPadding', 'box', '@r .sgs-account__orders-empty-actions .sgs-button', array( 'padding' ), '' ),
		array( 'tabHeadingMarginBottom', 'len', '@r .sgs-account__tab-head .sgs-account__tab-heading', array( 'margin-bottom' ), '' ),
		array( 'signedOutMaxWidth', 'len', '@root:not(:has(nav.woocommerce-MyAccount-navigation))', array( 'max-width' ), '' ),
		);
	}
}

if ( ! function_exists( 'sgs_account_cell_line' ) ) {
	/**
	 * The border value a width setting prints.
	 *
	 * @param mixed  $raw    Stored width (a bare number is pixels).
	 * @param string $colour The line colour: a token reference, or currentColor.
	 * @param bool   $frame  True for a four-side line, where a zero width prints no border at all.
	 * @return string '' when the width is unusable.
	 */
	function sgs_account_cell_line( $raw, string $colour, bool $frame ): string {
		$width = sgs_account_length_transform( $raw );
		if ( '' === $width ) {
			return '';
		}
		if ( $frame && 1 === preg_match( '/^0+(\.0+)?[a-z%]*$/i', $width ) ) {
			return '0';
		}
		return $width . ' solid ' . $colour;
	}
}

if ( ! function_exists( 'sgs_account_cell_css' ) ) {
	/**
	 * One setting row as CSS.
	 *
	 * @param array  $row        A sgs_account_cell_rows() row.
	 * @param array  $attributes Block attributes.
	 * @param array  $ctx        Selector placeholders.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_cell_css( array $row, array $attributes, array $ctx ): string {
		list( $attr, $kind, $sel, $props, $wrap ) = $row;
		$value = $attributes[ $attr ] ?? null;
		if ( null === $value || '' === $value || array() === $value ) {
			return '';
		}
		$selector = strtr( $sel, $ctx );
		if ( 'tog' === $kind ) {
			return true === $value ? $selector . '{' . $props[0] . ';}' : '';
		}
		if ( 'sel' === $kind ) {
			return in_array( $value, array( 'none', 'underline' ), true ) ? $selector . '{' . $props[0] . ':' . $value . ';}' : '';
		}
		if ( ! is_array( $value ) ) {
			return '';
		}
		if ( '' !== $wrap && isset( $value['desktop'] ) ) {
			$value = array( 'desktop' => $value['desktop'] );
		}
		$specs  = array();
		$border = static function ( string $colour, bool $frame ) {
			return static function ( $raw ) use ( $colour, $frame ): string {
				return sgs_account_cell_line( $raw, $colour, $frame );
			};
		};
		foreach ( $props as $prop ) {
			if ( 'box' === $kind ) {
				$specs[] = array(
					'value' => $value,
					'css'   => $prop,
					'box'   => true,
				);
				continue;
			}
			$transform = 'sgs_account_length_transform';
			if ( 'num' === $kind ) {
				$transform = static function ( $raw ): string {
					return is_numeric( $raw ) ? (string) (float) $raw : '';
				};
			} elseif ( 'edge' === $kind || 'frame' === $kind ) {
				$transform = $border( 'var(--wp--preset--color--border)', 'frame' === $kind );
			} elseif ( 'rule' === $kind ) {
				$transform = $border( 'currentColor', false );
			}
			$specs[] = array(
				'value'     => $value,
				'css'       => $prop,
				'transform' => $transform,
			);
		}
		if ( 'rule' === $kind ) {
			// A link that draws its own bottom rule drops the underline.
			$specs[] = array(
				'value'     => $value,
				'css'       => 'text-decoration',
				'transform' => static function (): string {
					return 'none';
				},
			);
		}
		$css = sgs_emit_responsive_css( $selector, $specs );
		return '' !== $wrap && '' !== $css ? SGS_Breakpoints::media( $wrap ) . '{' . $css . '}' : $css;
	}
}

if ( ! function_exists( 'sgs_account_cells_css' ) ) {
	/**
	 * Every setting row and type target of this file for one sgs/account instance.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   Scoped root selector.
	 * @return string CSS text (may be '').
	 */
	function sgs_account_cells_css( array $attributes, string $root_sel ): string {
		$tiered = sgs_object_attr_keys( 'sgs/account' );
		$r      = $root_sel . '.sgs-account';
		$ctx    = array(
			'@r'    => $r,
			'@root' => $root_sel,
		);
		$css    = array();
		foreach ( sgs_account_cell_rows() as $row ) {
			$css[] = sgs_account_cell_css( $row, $attributes, $ctx );
		}
		$css[] = sgs_typography_css_rule( $attributes, 'authHeading', $r . ' #customer_login h2', '', false, false, $tiered );
		$css[] = sgs_typography_css_rule( $attributes, 'loginRememberText', $r . ' .woocommerce-form-login__rememberme', '', false, false, $tiered );
		$css[] = sgs_typography_css_rule( $attributes, 'lostPasswordRow', $r . ' .woocommerce-form-login .lost_password', '', false, false, $tiered );
		$css[] = sgs_typography_css_rule( $attributes, 'privacyText', $r . ' .woocommerce-privacy-policy-text', '', false, false, $tiered );
		$css[] = sgs_typography_css_rule( $attributes, 'resetErrorLine', $r . ' .sgs-account__reset-error', '', false, false, $tiered );
		$css[] = sgs_typography_css_rule( $attributes, 'resetNoticeText', $root_sel . ':has(form.lost_reset_password) .woocommerce-error', '', false, false, $tiered );
		$css[] = sgs_typography_css_rule( $attributes, 'addressSaveButton', $r . ' .sgs-account__wc form[method="post"] button[name="save_address"]', '', false, false, $tiered );
		$css[] = sgs_typography_css_rule( $attributes, 'addressEditLink', $r . ' .woocommerce-Address-title a.edit', '', false, false, $tiered );
		$css[] = sgs_typography_css_rule( $attributes, 'addressText', $r . ' .woocommerce-Address address', '', false, false, $tiered );
		$css[] = sgs_typography_css_rule( $attributes, 'orderDetailBackLink', $r . ' .sgs-account__od-back', '', false, false, $tiered );
		$css[] = sgs_typography_css_rule( $attributes, 'orderDetailPlacedLine', $r . ' .sgs-account__od-placed', '', false, false, $tiered );
		$css[] = sgs_typography_css_rule( $attributes, 'orderDetailChatText', $r . ' .sgs-account__od-chat-text', '', false, false, $tiered );
		$css[] = sgs_typography_css_rule( $attributes, 'orderDetailTotalValue', $r . ' .sgs-account__od-row--total > span:last-child', '', false, false, $tiered );
		$css[] = sgs_typography_css_rule( $attributes, 'orderDetailItemBrand', $r . ' .sgs-account__od-item-brand', '', false, false, $tiered );
		return implode( '', array_filter( $css ) );
	}
}
