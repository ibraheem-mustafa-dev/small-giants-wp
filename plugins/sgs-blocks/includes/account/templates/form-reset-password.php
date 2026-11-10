<?php
/**
 * SGS Account reset-password form: replaces WooCommerce's `myaccount/form-reset-password.php` while `resetErrorsInline`
 * is on. The fields, hidden key and login, action field and nonce are WooCommerce's own, so
 * `WC_Form_Handler::process_reset_password` keeps the key check, the validation and the save. The error notices that
 * handler queued (passwords do not match, empty password, a plugin's own) print as red text under the fields instead
 * of a boxed notice above the form; every other notice type still prints through WooCommerce's own hook.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// phpcs:disable WordPress.WP.I18n.TextDomainMismatch, WordPress.NamingConventions.PrefixAllGlobals -- WooCommerce's own texts and hooks.

$sgs_all    = wc_get_notices();
$sgs_errors = isset( $sgs_all['error'] ) && is_array( $sgs_all['error'] ) ? $sgs_all['error'] : array();
unset( $sgs_all['error'] );
wc_clear_notices();
foreach ( $sgs_all as $sgs_type => $sgs_items ) {
	foreach ( (array) $sgs_items as $sgs_item ) {
		wc_add_notice( (string) ( $sgs_item['notice'] ?? '' ), (string) $sgs_type, (array) ( $sgs_item['data'] ?? array() ) );
	}
}

do_action( 'woocommerce_before_reset_password_form' );

$sgs_mismatch = __( 'Passwords do not match.', 'woocommerce' );
$sgs_lines    = '';
foreach ( $sgs_errors as $sgs_error ) {
	$sgs_text = wp_strip_all_tags( (string) ( $sgs_error['notice'] ?? '' ) );
	if ( $sgs_text === $sgs_mismatch ) {
		$sgs_text = \SGS\Blocks\Account_Strings::text( 'passwordMismatch', $sgs_text );
	}
	$sgs_lines .= '<p class="sgs-account__reset-error" role="alert">' . esc_html( $sgs_text ) . '</p>';
}
?>

<form method="post" class="woocommerce-ResetPassword lost_reset_password">

	<p><?php echo apply_filters( 'woocommerce_reset_password_message', esc_html__( 'Enter a new password below.', 'woocommerce' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WooCommerce's own filter, escaped text. ?></p>

	<p class="woocommerce-form-row woocommerce-form-row--first form-row form-row-first">
		<label for="password_1"><?php esc_html_e( 'New password', 'woocommerce' ); ?>&nbsp;<span class="required" aria-hidden="true">*</span><span class="screen-reader-text"><?php esc_html_e( 'Required', 'woocommerce' ); ?></span></label>
		<input type="password" class="woocommerce-Input woocommerce-Input--text input-text" name="password_1" id="password_1" autocomplete="new-password" required aria-required="true" />
	</p>
	<p class="woocommerce-form-row woocommerce-form-row--last form-row form-row-last">
		<label for="password_2"><?php esc_html_e( 'Re-enter new password', 'woocommerce' ); ?>&nbsp;<span class="required" aria-hidden="true">*</span><span class="screen-reader-text"><?php esc_html_e( 'Required', 'woocommerce' ); ?></span></label>
		<input type="password" class="woocommerce-Input woocommerce-Input--text input-text" name="password_2" id="password_2" autocomplete="new-password" required aria-required="true" />
	</p>

	<input type="hidden" name="reset_key" value="<?php echo esc_attr( $args['key'] ); ?>" />
	<input type="hidden" name="reset_login" value="<?php echo esc_attr( $args['login'] ); ?>" />

	<div class="clear"></div>

	<?php echo $sgs_lines; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above. ?>

	<?php do_action( 'woocommerce_resetpassword_form' ); ?>

	<p class="woocommerce-form-row form-row">
		<input type="hidden" name="wc_reset_password" value="true" />
		<button type="submit" class="woocommerce-Button button<?php echo esc_attr( wc_wp_theme_get_element_class_name( 'button' ) ? ' ' . wc_wp_theme_get_element_class_name( 'button' ) : '' ); ?>" value="<?php esc_attr_e( 'Save', 'woocommerce' ); ?>"><?php esc_html_e( 'Save', 'woocommerce' ); ?></button>
	</p>

	<?php wp_nonce_field( 'reset_password', 'woocommerce-reset-password-nonce' ); ?>

</form>
<?php
do_action( 'woocommerce_after_reset_password_form' );
