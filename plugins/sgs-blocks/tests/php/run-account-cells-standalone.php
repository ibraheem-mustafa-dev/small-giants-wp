<?php
/**
 * Standalone test: the account block's spacing, size, border and underline settings (and the type targets beside
 * them) print the declarations of the Custom CSS rules they replace, on the same selectors, and print nothing while
 * unset.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-cells-standalone.php [path to a plugin copy]
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
$base = rtrim( $argv[1] ?? dirname( __DIR__, 2 ), '/\\' );
define( 'ABSPATH', $base . '/' );
define( 'SGS_BLOCKS_PATH', ABSPATH );

$GLOBALS['sgs_qa_global_settings'] = array( 'spacing' => array( 'spacingSizes' => array( array( 'slug' => '20' ), array( 'slug' => '30' ), array( 'slug' => '40' ) ) ) );
require $base . '/scripts/qa/lib/wp-stubs.php';
require $base . '/includes/render-helpers.php';
foreach ( array( 'account/helpers-account-look-css.php', 'account/helpers-account-header.php', 'account/helpers-account-cells-css.php' ) as $f ) {
	require_once $base . '/includes/' . $f;
}

$failures = 0;
function ok( bool $c, string $label ): void {
	global $failures;
	echo ( $c ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	if ( ! $c ) {
		++$failures;
	}
}

/** True when some rule on exactly this selector holds the declaration. */
function has_decl( string $css, string $selector, string $decl ): bool {
	if ( preg_match_all( '/(?<![^{}])' . preg_quote( $selector, '/' ) . '\{([^{}]*)\}/', $css, $m ) ) {
		foreach ( $m[1] as $body ) {
			if ( false !== strpos( $body, $decl ) ) {
				return true;
			}
		}
	}
	return false;
}

$root  = '.x.wp-block-sgs-account';
$ctx   = array( '@r' => $root . '.sgs-account', '@root' => $root );
$plan  = array( 'menuSidebarBorderWidth' => array( 'desktop' => '1px' ), 'menuTabRowBorderWidth' => array( 'tablet' => '1px' ), 'menuTabRowMarginBottom' => array( 'tablet' => '24px' ), 'menuItemMinHeight' => array( 'desktop' => '48px' ), 'menuItemPadding' => array( 'desktop' => array( 'top' => '12px', 'right' => '18px', 'bottom' => '12px', 'left' => '18px' ), 'tablet' => array( 'top' => '12px', 'right' => '14px', 'bottom' => '12px', 'left' => '14px' ) ), 'menuItemRadius' => array( 'desktop' => '0px' ), 'menuItemGap' => array( 'desktop' => '12px' ), 'menuListGap' => array( 'desktop' => '0px' ), 'menuListPadding' => array( 'tablet' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'headerEyebrowMarginBottom' => array( 'desktop' => '10px' ), 'headerAccountEyebrowMarginBottom' => array( 'desktop' => '8px' ), 'headerSignInMarginBottom' => array( 'desktop' => '32px' ), 'headerResetMarginBottom' => array( 'desktop' => '24px' ), 'headerAccountTitleLineHeight' => array( 'desktop' => 1 ), 'headerBackLineMargin' => array( 'desktop' => array( 'top' => '18px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'headerBackRuleWidth' => array( 'desktop' => '1px' ), 'registerHintMarginTop' => array( 'desktop' => '6px' ), 'mobileHintMargin' => array( 'desktop' => array( 'top' => '6px', 'bottom' => '0px' ) ), 'authPairGap' => array( 'desktop' => '1px' ), 'authPairBorderWidth' => array( 'desktop' => '1px' ), 'authPairCellPadding' => array( 'desktop' => array( 'top' => '40px', 'right' => '44px', 'bottom' => '40px', 'left' => '44px' ), 'tablet' => array( 'top' => '40px', 'right' => '44px', 'bottom' => '40px', 'left' => '44px' ), 'mobile' => array( 'top' => '28px', 'right' => '22px', 'bottom' => '28px', 'left' => '22px' ) ), 'authPairCellBorderWidth' => array( 'desktop' => '0px' ), 'authPairCellRadius' => array( 'desktop' => '0px' ), 'authPanelHeadingMargin' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '18px', 'left' => '0px' ) ), 'authFormRowGap' => array( 'desktop' => '14px' ), 'loginFormRowGap' => array( 'desktop' => '0px' ), 'loginRowMarginBottom' => array( 'desktop' => '14px' ), 'loginLinkPadding' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'loginLinkRuleWidth' => array( 'desktop' => '1px' ), 'loginRememberMinHeight' => array( 'desktop' => '44px' ), 'loginRememberGap' => array( 'desktop' => '10px' ), 'rememberCheckboxSize' => array( 'desktop' => '16px' ), 'privacyLinkTextDecoration' => 'underline', 'resetFormMaxWidth' => array( 'desktop' => '480px' ), 'resetFormBorderWidth' => array( 'desktop' => '0px' ), 'resetFormRadius' => array( 'desktop' => '0px' ), 'resetFormPadding' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'resetFormGap' => array( 'desktop' => '14px' ), 'resetHideIntro' => true, 'resetRowMargin' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'resetRowPadding' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'resetErrorMargin' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'resetNoticeBorderWidth' => array( 'desktop' => '0px' ), 'resetNoticePadding' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'resetNoticeMargin' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '14px', 'left' => '0px' ) ), 'resetNoticeItemPadding' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'accountFormMaxWidth' => array( 'desktop' => '640px' ), 'accountFieldsetBorderWidth' => array( 'desktop' => '0px' ), 'accountFieldsetMargin' => array( 'desktop' => array( 'top' => '16px', 'right' => '0px', 'bottom' => '16px', 'left' => '0px' ) ), 'accountFieldsetPadding' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'accountFieldsetGap' => array( 'desktop' => '12px' ), 'accountLegendPadding' => array( 'desktop' => array( 'top' => '24px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'accountLegendMargin' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '12px', 'left' => '0px' ) ), 'accountLegendRuleWidth' => array( 'desktop' => '1px' ), 'accountFormRowMargin' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'accountFormRowPadding' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'accountPasswordHelperMargin' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'saveAddressMinHeight' => array( 'desktop' => '44px' ), 'saveAddressPadding' => array( 'desktop' => array( 'top' => '0px', 'right' => '20px', 'bottom' => '0px', 'left' => '20px' ) ), 'addressTitleRowGap' => array( 'desktop' => '12px' ), 'addressTitleRowMarginBottom' => array( 'desktop' => '12px' ), 'addressTitleRowPadding' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'addressTitleMargin' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'addressTitlePadding' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'addressEditRuleWidth' => array( 'desktop' => '1px' ), 'addressEditMargin' => array( 'desktop' => array( 'top' => '0px', 'right' => '0px', 'bottom' => '0px', 'left' => '0px' ) ), 'addressHelperMarginTop' => array( 'desktop' => '16px' ), 'addressActionsMarginTop' => array( 'desktop' => '14px' ), 'orderDetailBackMinHeight' => array( 'desktop' => '44px' ), 'orderDetailBackGap' => array( 'desktop' => '8px' ), 'orderDetailChatUnderline' => 'none', 'orderDetailBoxTitleMarginBottom' => array( 'desktop' => '10px' ), 'orderDetailLastBoxTitleMarginBottom' => array( 'desktop' => '4px' ), 'orderDetailTotalRowPaddingTop' => array( 'desktop' => '6px' ), 'orderDetailTotalRowMarginTop' => array( 'desktop' => '2px' ), 'orderDetailTotalRowRuleWidth' => array( 'desktop' => '1px' ), 'orderDetailTitleMarginBottom' => array( 'desktop' => '6px' ), 'orderDetailItemMetaMarginTop' => array( 'desktop' => '2px' ), 'ordersRowTextDecoration' => 'none', 'ordersEmptyButtonMinHeight' => array( 'desktop' => '52px' ), 'ordersEmptyButtonPadding' => array( 'desktop' => array( 'left' => '26px', 'right' => '26px' ) ), 'tabHeadingMarginBottom' => array( 'desktop' => '0px' ), 'signedOutMaxWidth' => array( 'desktop' => '996px' ), 'authHeadingFontSize' => array( 'desktop' => 28 ), 'authHeadingFontSizeUnit' => 'px', 'authHeadingFontWeight' => '500', 'authHeadingLineHeight' => array( 'desktop' => 1.1 ), 'loginRememberTextFontSize' => array( 'desktop' => 14 ), 'loginRememberTextFontSizeUnit' => 'px', 'lostPasswordRowFontSize' => array( 'desktop' => 13.5 ), 'lostPasswordRowFontSizeUnit' => 'px', 'privacyTextFontSize' => array( 'desktop' => 12.5 ), 'privacyTextFontSizeUnit' => 'px', 'resetErrorLineFontSize' => array( 'desktop' => 14 ), 'resetErrorLineFontSizeUnit' => 'px', 'resetNoticeTextFontSize' => array( 'desktop' => 14 ), 'resetNoticeTextFontSizeUnit' => 'px', 'addressSaveButtonFontSize' => array( 'desktop' => 12.5 ), 'addressSaveButtonFontSizeUnit' => 'px', 'addressEditLinkFontSize' => array( 'desktop' => 13.5 ), 'addressEditLinkFontSizeUnit' => 'px', 'addressTextFontSize' => array( 'desktop' => 15 ), 'addressTextFontSizeUnit' => 'px', 'addressTextFontStyle' => 'normal', 'addressTextLineHeight' => array( 'desktop' => 1.6 ), 'orderDetailBackLinkFontSize' => array( 'desktop' => 12.5 ), 'orderDetailBackLinkFontSizeUnit' => 'px', 'orderDetailBackLinkTextTransform' => 'uppercase', 'orderDetailBackLinkLetterSpacing' => array( 'desktop' => 0.1 ), 'orderDetailBackLinkLetterSpacingUnit' => 'em', 'orderDetailBackLinkTextDecoration' => 'none', 'orderDetailPlacedLineFontSize' => array( 'desktop' => 14 ), 'orderDetailPlacedLineFontSizeUnit' => 'px', 'orderDetailChatTextFontSize' => array( 'desktop' => 14.5 ), 'orderDetailChatTextFontSizeUnit' => 'px', 'orderDetailTotalValueFontSize' => array( 'desktop' => 22 ), 'orderDetailTotalValueFontSizeUnit' => 'px', 'orderDetailTotalValueFontFamily' => 'heading', 'orderDetailTotalValueFontWeight' => '500', 'orderDetailItemBrandFontSize' => array( 'desktop' => 11 ), 'orderDetailItemBrandFontSizeUnit' => 'px', 'orderDetailItemBrandTextTransform' => 'uppercase', 'orderDetailItemBrandLetterSpacing' => array( 'desktop' => 0.16 ), 'orderDetailItemBrandLetterSpacingUnit' => 'em' );
$cases = array(
	array( 'menuSidebarBorderWidth', '@root.sgs-account--desktop-sidebar nav.woocommerce-MyAccount-navigation', array( 'border-left:1px solid var(--wp--preset--color--border);' ) ),
	array( 'menuTabRowBorderWidth', '@r nav.woocommerce-MyAccount-navigation', array( 'border-bottom:1px solid var(--wp--preset--color--border);' ) ),
	array( 'menuTabRowMarginBottom', '@r nav.woocommerce-MyAccount-navigation', array( 'margin-bottom:24px;' ) ),
	array( 'menuItemMinHeight', '@r nav.woocommerce-MyAccount-navigation li a', array( 'min-height:48px;' ) ),
	array( 'menuItemPadding', '@r nav.woocommerce-MyAccount-navigation li.woocommerce-MyAccount-navigation-link > a', array( 'padding-top:12px;', 'padding-right:18px;', 'padding-bottom:12px;', 'padding-left:18px;', 'padding-top:12px;', 'padding-right:14px;', 'padding-bottom:12px;', 'padding-left:14px;' ) ),
	array( 'menuItemRadius', '@r nav.woocommerce-MyAccount-navigation li.woocommerce-MyAccount-navigation-link > a', array( 'border-radius:0px;' ) ),
	array( 'menuItemGap', '@r nav.woocommerce-MyAccount-navigation li.woocommerce-MyAccount-navigation-link:not(.woocommerce-MyAccount-navigation-link--customer-logout) > a', array( 'gap:12px;' ) ),
	array( 'menuListGap', '@r nav.woocommerce-MyAccount-navigation ul', array( 'gap:0px;' ) ),
	array( 'menuListPadding', '@r nav.woocommerce-MyAccount-navigation ul', array( 'padding-top:0px;', 'padding-right:0px;', 'padding-bottom:0px;', 'padding-left:0px;' ) ),
	array( 'headerEyebrowMarginBottom', '@r .sgs-account__header-eyebrow', array( 'margin-bottom:10px;' ) ),
	array( 'headerAccountEyebrowMarginBottom', '@r .sgs-account__header--account .sgs-account__header-eyebrow', array( 'margin-bottom:8px;' ) ),
	array( 'headerSignInMarginBottom', '@r .sgs-account__header--signin', array( 'margin-bottom:32px;' ) ),
	array( 'headerResetMarginBottom', '@root:has(form.lost_reset_password) .sgs-account__header', array( 'margin-bottom:24px;' ) ),
	array( 'headerAccountTitleLineHeight', '@r .sgs-account__header--account .sgs-account__header-title', array( 'line-height:1;' ) ),
	array( 'headerBackLineMargin', '@r .sgs-account__header-backline', array( 'margin-top:18px;', 'margin-right:0px;', 'margin-bottom:0px;', 'margin-left:0px;' ) ),
	array( 'headerBackRuleWidth', '@r .sgs-account__header-back', array( 'border-bottom:1px solid currentColor;', 'text-decoration:none;' ) ),
	array( 'registerHintMarginTop', '@r .sgs-account__register-hint', array( 'margin-top:6px;' ) ),
	array( 'mobileHintMargin', '@r .sgs-account__mobile-hint', array( 'margin-top:6px;', 'margin-bottom:0px;' ) ),
	array( 'authPairGap', '@r .sgs-account__wc > #customer_login.u-columns.col2-set', array( 'gap:1px;' ) ),
	array( 'authPairBorderWidth', '@r .sgs-account__wc > #customer_login.u-columns.col2-set', array( 'border:1px solid var(--wp--preset--color--border);' ) ),
	array( 'authPairCellPadding', '@r .sgs-account__wc > #customer_login.u-columns.col2-set > div', array( 'padding-top:40px;', 'padding-right:44px;', 'padding-bottom:40px;', 'padding-left:44px;', 'padding-top:40px;', 'padding-right:44px;', 'padding-bottom:40px;', 'padding-left:44px;', 'padding-top:28px;', 'padding-right:22px;', 'padding-bottom:28px;', 'padding-left:22px;' ) ),
	array( 'authPairCellBorderWidth', '@r .sgs-account__wc > #customer_login.u-columns.col2-set > div', array( 'border:0;' ) ),
	array( 'authPairCellRadius', '@r .sgs-account__wc > #customer_login.u-columns.col2-set > div', array( 'border-radius:0px;' ) ),
	array( 'authPanelHeadingMargin', '@r #customer_login h2', array( 'margin-top:0px;', 'margin-right:0px;', 'margin-bottom:18px;', 'margin-left:0px;' ) ),
	array( 'authFormRowGap', '@r #customer_login form', array( 'row-gap:14px;' ) ),
	array( 'loginFormRowGap', '@r #customer_login form.woocommerce-form-login', array( 'row-gap:0px;' ) ),
	array( 'loginRowMarginBottom', '@r #customer_login form.woocommerce-form-login > p.woocommerce-form-row,@r #customer_login form.woocommerce-form-login .woocommerce-form-login__rememberme,@r #customer_login form.woocommerce-form-login .lost_password', array( 'margin-bottom:14px;' ) ),
	array( 'loginLinkPadding', '@r .woocommerce-form-login .lost_password', array( 'padding-top:0px;', 'padding-right:0px;', 'padding-bottom:0px;', 'padding-left:0px;' ) ),
	array( 'loginLinkRuleWidth', '@r .woocommerce-form-login .lost_password a', array( 'border-bottom:1px solid currentColor;', 'text-decoration:none;' ) ),
	array( 'loginRememberMinHeight', '@r .woocommerce-form-login__rememberme', array( 'min-height:44px;' ) ),
	array( 'loginRememberGap', '@r .woocommerce-form-login__rememberme', array( 'gap:10px;' ) ),
	array( 'rememberCheckboxSize', '@r .woocommerce-form-login__rememberme input[type="checkbox"]', array( 'width:16px;', 'height:16px;' ) ),
	array( 'privacyLinkTextDecoration', '@r .woocommerce-privacy-policy-text a', array( 'text-decoration:underline;' ) ),
	array( 'resetFormMaxWidth', '@root:has(form.lost_reset_password.woocommerce-ResetPassword)', array( 'max-width:480px;' ) ),
	array( 'resetFormBorderWidth', '@r .sgs-account__wc > form.lost_reset_password.woocommerce-ResetPassword', array( 'border:0;' ) ),
	array( 'resetFormRadius', '@r .sgs-account__wc > form.lost_reset_password.woocommerce-ResetPassword', array( 'border-radius:0px;' ) ),
	array( 'resetFormPadding', '@r .sgs-account__wc > form.lost_reset_password.woocommerce-ResetPassword', array( 'padding-top:0px;', 'padding-right:0px;', 'padding-bottom:0px;', 'padding-left:0px;' ) ),
	array( 'resetFormGap', '@r .sgs-account__wc > form.lost_reset_password', array( 'gap:14px;' ) ),
	array( 'resetHideIntro', '@r form.lost_reset_password > p:not(.form-row):not(.sgs-account__reset-error)', array( 'display:none;' ) ),
	array( 'resetRowMargin', '@r form.lost_reset_password .form-row', array( 'margin-top:0px;', 'margin-right:0px;', 'margin-bottom:0px;', 'margin-left:0px;' ) ),
	array( 'resetRowPadding', '@r form.lost_reset_password .form-row', array( 'padding-top:0px;', 'padding-right:0px;', 'padding-bottom:0px;', 'padding-left:0px;' ) ),
	array( 'resetErrorMargin', '@r .sgs-account__reset-error', array( 'margin-top:0px;', 'margin-right:0px;', 'margin-bottom:0px;', 'margin-left:0px;' ) ),
	array( 'resetNoticeBorderWidth', '@root:has(form.lost_reset_password) .woocommerce-error', array( 'border:0;' ) ),
	array( 'resetNoticePadding', '@root:has(form.lost_reset_password) .woocommerce-error', array( 'padding-top:0px;', 'padding-right:0px;', 'padding-bottom:0px;', 'padding-left:0px;' ) ),
	array( 'resetNoticeMargin', '@root:has(form.lost_reset_password) .woocommerce-error', array( 'margin-top:0px;', 'margin-right:0px;', 'margin-bottom:14px;', 'margin-left:0px;' ) ),
	array( 'resetNoticeItemPadding', '@root:has(form.lost_reset_password) .woocommerce-error li', array( 'padding-top:0px;', 'padding-right:0px;', 'padding-bottom:0px;', 'padding-left:0px;' ) ),
	array( 'accountFormMaxWidth', '@r form.woocommerce-EditAccountForm', array( 'max-width:640px;' ) ),
	array( 'accountFieldsetBorderWidth', '@r form.woocommerce-EditAccountForm fieldset', array( 'border:0;' ) ),
	array( 'accountFieldsetMargin', '@r form.woocommerce-EditAccountForm fieldset', array( 'margin-top:16px;', 'margin-right:0px;', 'margin-bottom:16px;', 'margin-left:0px;' ) ),
	array( 'accountFieldsetPadding', '@r form.woocommerce-EditAccountForm fieldset', array( 'padding-top:0px;', 'padding-right:0px;', 'padding-bottom:0px;', 'padding-left:0px;' ) ),
	array( 'accountFieldsetGap', '@r form.woocommerce-EditAccountForm fieldset', array( 'gap:12px;' ) ),
	array( 'accountLegendPadding', '@r form.woocommerce-EditAccountForm fieldset > legend', array( 'padding-top:24px;', 'padding-right:0px;', 'padding-bottom:0px;', 'padding-left:0px;' ) ),
	array( 'accountLegendMargin', '@r form.woocommerce-EditAccountForm fieldset > legend', array( 'margin-top:0px;', 'margin-right:0px;', 'margin-bottom:12px;', 'margin-left:0px;' ) ),
	array( 'accountLegendRuleWidth', '@r form.woocommerce-EditAccountForm fieldset > legend', array( 'border-top:1px solid var(--wp--preset--color--border);' ) ),
	array( 'accountFormRowMargin', '@r form.woocommerce-EditAccountForm .form-row', array( 'margin-top:0px;', 'margin-right:0px;', 'margin-bottom:0px;', 'margin-left:0px;' ) ),
	array( 'accountFormRowPadding', '@r form.woocommerce-EditAccountForm .form-row', array( 'padding-top:0px;', 'padding-right:0px;', 'padding-bottom:0px;', 'padding-left:0px;' ) ),
	array( 'accountPasswordHelperMargin', '@r form.woocommerce-EditAccountForm fieldset .sgs-account__password-helper', array( 'margin-top:0px;', 'margin-right:0px;', 'margin-bottom:0px;', 'margin-left:0px;' ) ),
	array( 'saveAddressMinHeight', '@r .sgs-account__wc form[method="post"] button[name="save_address"]', array( 'min-height:44px;' ) ),
	array( 'saveAddressPadding', '@r .sgs-account__wc form[method="post"] button[name="save_address"]', array( 'padding-top:0px;', 'padding-right:20px;', 'padding-bottom:0px;', 'padding-left:20px;' ) ),
	array( 'addressTitleRowGap', '@r .woocommerce-Address-title', array( 'gap:12px;' ) ),
	array( 'addressTitleRowMarginBottom', '@r .woocommerce-Address-title', array( 'margin-bottom:12px;' ) ),
	array( 'addressTitleRowPadding', '@r .woocommerce-Address-title', array( 'padding-top:0px;', 'padding-right:0px;', 'padding-bottom:0px;', 'padding-left:0px;' ) ),
	array( 'addressTitleMargin', '@r .woocommerce-Address-title :is(h2,h3)', array( 'margin-top:0px;', 'margin-right:0px;', 'margin-bottom:0px;', 'margin-left:0px;' ) ),
	array( 'addressTitlePadding', '@r .woocommerce-Address-title :is(h2,h3)', array( 'padding-top:0px;', 'padding-right:0px;', 'padding-bottom:0px;', 'padding-left:0px;' ) ),
	array( 'addressEditRuleWidth', '@r .woocommerce-Address-title a.edit', array( 'border-bottom:1px solid currentColor;', 'text-decoration:none;' ) ),
	array( 'addressEditMargin', '@r .woocommerce-Address-title a.edit', array( 'margin-top:0px;', 'margin-right:0px;', 'margin-bottom:0px;', 'margin-left:0px;' ) ),
	array( 'addressHelperMarginTop', '@r .sgs-account__address-helper', array( 'margin-top:16px;' ) ),
	array( 'addressActionsMarginTop', '@r .sgs-account__addr-actions', array( 'margin-top:14px;' ) ),
	array( 'orderDetailBackMinHeight', '@r .sgs-account__od-back', array( 'min-height:44px;' ) ),
	array( 'orderDetailBackGap', '@r .sgs-account__od-back', array( 'gap:8px;' ) ),
	array( 'orderDetailChatUnderline', '@r .sgs-account__od-chat,@r .sgs-account__od-chat:hover', array( 'text-decoration:none;' ) ),
	array( 'orderDetailBoxTitleMarginBottom', '@r .sgs-account__od-box-title', array( 'margin-bottom:10px;' ) ),
	array( 'orderDetailLastBoxTitleMarginBottom', '@r .sgs-account__od-box:last-child .sgs-account__od-box-title', array( 'margin-bottom:4px;' ) ),
	array( 'orderDetailTotalRowPaddingTop', '@r .sgs-account__od-row--total', array( 'padding-top:6px;' ) ),
	array( 'orderDetailTotalRowMarginTop', '@r .sgs-account__od-row--total', array( 'margin-top:2px;' ) ),
	array( 'orderDetailTotalRowRuleWidth', '@r .sgs-account__od-row--total', array( 'border-top:1px solid var(--wp--preset--color--border);' ) ),
	array( 'orderDetailTitleMarginBottom', '@r .sgs-account__od-title', array( 'margin-bottom:6px;' ) ),
	array( 'orderDetailItemMetaMarginTop', '@r .sgs-account__od-item-meta', array( 'margin-top:2px;' ) ),
	array( 'ordersRowTextDecoration', '@r .sgs-account__order,@r .sgs-account__order:hover,@r .sgs-account__order *', array( 'text-decoration:none;' ) ),
	array( 'ordersEmptyButtonMinHeight', '@r .sgs-account__orders-empty-actions .sgs-button', array( 'min-height:52px;' ) ),
	array( 'ordersEmptyButtonPadding', '@r .sgs-account__orders-empty-actions .sgs-button', array( 'padding-right:26px;', 'padding-left:26px;' ) ),
	array( 'tabHeadingMarginBottom', '@r .sgs-account__tab-head .sgs-account__tab-heading', array( 'margin-bottom:0px;' ) ),
	array( 'signedOutMaxWidth', '@root:not(:has(nav.woocommerce-MyAccount-navigation))', array( 'max-width:996px;' ) ),
);
$typos = array(
	array( 'authHeading', '@r #customer_login h2' ),
	array( 'loginRememberText', '@r .woocommerce-form-login__rememberme' ),
	array( 'lostPasswordRow', '@r .woocommerce-form-login .lost_password' ),
	array( 'privacyText', '@r .woocommerce-privacy-policy-text' ),
	array( 'resetErrorLine', '@r .sgs-account__reset-error' ),
	array( 'resetNoticeText', '@root:has(form.lost_reset_password) .woocommerce-error' ),
	array( 'addressSaveButton', '@r .sgs-account__wc form[method="post"] button[name="save_address"]' ),
	array( 'addressEditLink', '@r .woocommerce-Address-title a.edit' ),
	array( 'addressText', '@r .woocommerce-Address address' ),
	array( 'orderDetailBackLink', '@r .sgs-account__od-back' ),
	array( 'orderDetailPlacedLine', '@r .sgs-account__od-placed' ),
	array( 'orderDetailChatText', '@r .sgs-account__od-chat-text' ),
	array( 'orderDetailTotalValue', '@r .sgs-account__od-row--total > span:last-child' ),
	array( 'orderDetailItemBrand', '@r .sgs-account__od-item-brand' ),
);

// 1) Unset prints nothing.
ok( '' === sgs_account_cells_css( array(), $root ), 'no setting set: nothing printed' );

// 2) Every setting prints its declarations on its own selector.
$css = sgs_account_cells_css( $plan, $root );
foreach ( $cases as $case ) {
	list( $attr, $sel, $needles ) = $case;
	$selector = strtr( $sel, $ctx );
	$alone    = sgs_account_cells_css( array( $attr => $plan[ $attr ] ), $root );
	$bad      = array();
	foreach ( $needles as $n ) {
		if ( ! has_decl( $css, $selector, $n ) || ! has_decl( $alone, $selector, $n ) ) {
			$bad[] = $n;
		}
	}
	ok( array() === $bad, $attr . ' prints ' . implode( ' ', $needles ) . ( $bad ? ' (missing: ' . implode( ' ', $bad ) . ')' : '' ) );
}

// 3) Every type target prints font-size on its selector.
foreach ( $typos as $typo ) {
	list( $prefix, $sel ) = $typo;
	$selector = strtr( $sel, $ctx );
	$size     = $plan[ $prefix . 'FontSize' ]['desktop'];
	ok( has_decl( $css, $selector, 'font-size:' . $size . 'px;' ), $prefix . ' prints font-size:' . $size . 'px on ' . $selector );
}

// 4) A tier-only value stays in its tier, a wrapped row reads the desktop value only.
$tab = sgs_account_cells_css( array( 'menuTabRowMarginBottom' => array( 'tablet' => '24px' ) ), $root );
ok( false !== strpos( $tab, '@media(max-width:1023px){' . $root . '.sgs-account nav.woocommerce-MyAccount-navigation{margin-bottom:24px;}}' ) && 0 === strpos( $tab, '@media' ), 'a tablet-only value prints only inside the tablet query' );
$side = sgs_account_cells_css( array( 'menuSidebarBorderWidth' => array( 'desktop' => '1px', 'tablet' => '5px' ) ), $root );
ok( 0 === strpos( $side, '@media(min-width:1024px){' ) && false === strpos( $side, '5px' ), 'the desktop sidebar line prints only inside the 1024px query, desktop value only' );

// 5) Bad values print nothing.
ok( '' === sgs_account_cells_css( array( 'menuItemMinHeight' => array( 'desktop' => 'url(x)' ) ), $root ), 'a non-length is refused' );
ok( '' === sgs_account_cells_css( array( 'ordersRowTextDecoration' => 'blink' ), $root ), 'an unknown text-decoration is refused' );
ok( '' === sgs_account_cells_css( array( 'resetHideIntro' => false ), $root ), 'an off toggle prints nothing' );

// 6) A length picked from the spacing scale is stored as its bare slug and prints the preset variable; a typed length keeps its unit; a bare typed number is pixels.
$gap = static function ( $v ) use ( $root ) { return sgs_account_cells_css( array( 'menuItemGap' => array( 'desktop' => $v ) ), $root ); };
ok( false !== strpos( $gap( '30' ), 'gap:var(--wp--preset--spacing--30);' ), 'a spacing preset slug prints the preset variable' );
ok( false !== strpos( $gap( '25px' ), 'gap:25px;' ), 'a typed length keeps its unit' );
ok( false !== strpos( $gap( 25 ), 'gap:25px;' ) && false !== strpos( $gap( '12.5' ), 'gap:12.5px;' ), 'a bare typed number is pixels' );
$rule = sgs_account_cells_css( array( 'addressEditRuleWidth' => array( 'desktop' => '30' ) ), $root );
ok( false !== strpos( $rule, 'border-bottom:var(--wp--preset--spacing--30) solid currentColor;' ), 'a line width picked from the scale prints the preset variable' );

// 7) Only a literal zero length drops a four-side border; a computed width keeps its border.
$frame = static function ( $v ) use ( $root ) { return sgs_account_cells_css( array( 'authPairBorderWidth' => array( 'desktop' => $v ) ), $root ); };
ok( false !== strpos( $frame( '0px' ), 'border:0;' ) && false !== strpos( $frame( '0' ), 'border:0;' ) && false !== strpos( $frame( '0rem' ), 'border:0;' ), 'a literal zero width prints border:0' );
foreach ( array( 'calc(1px + 1px)', 'clamp(1px, 2vw, 4px)', 'var(--x)', 'min(2px, 1vw)' ) as $w ) {
	ok( false !== strpos( $frame( $w ), 'border:' . $w . ' solid var(--wp--preset--color--border);' ), $w . ' keeps its border' );
}

// 8) The sidebar line is a desktop-only control, so the editor cannot store tablet or mobile values that print nothing.
$panels = (string) file_get_contents( $base . '/src/blocks/account/CellPanels.js' );
ok( 1 === preg_match( "/'menuSidebarBorderWidth',\s*'desktop'/", $panels ), 'the sidebar line width row is a desktop-only control' );

echo $failures ? "\n$failures FAILED\n" : "\nALL PASSED\n";
exit( $failures ? 1 : 0 );
