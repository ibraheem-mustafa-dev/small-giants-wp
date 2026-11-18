<?php
/**
 * Email call-to-action button, used in place of WooCommerce's `emails/email-button.php`
 * while the site's styles are switched on for emails ({@see \SGS\Blocks\Mail\Sgs_Email_Site_Styles}).
 *
 * The markup and WooCommerce's inline fallback style are the same; the anchor also carries the
 * `sgs-email-button` class, which the site's button rule targets (an email CSS inliner cannot
 * match on the style attribute).
 *
 * @package SGS\Blocks\Mail
 *
 * @var string $url   Link address.
 * @var string $label Link text.
 */

defined( 'ABSPATH' ) || exit;

$sgs_button_bg   = get_option( 'woocommerce_email_base_color', '#7f54b3' );
$sgs_button_bg   = $sgs_button_bg ? $sgs_button_bg : '#7f54b3';
$sgs_button_text = wc_hex_is_light( $sgs_button_bg ) ? '#000000' : '#ffffff';
?>
<p style="margin: 24px 0;">
	<a class="sgs-email-button" href="<?php echo esc_url( $url ); ?>" style="display:inline-block;padding:16px 32px;background-color:<?php echo esc_attr( $sgs_button_bg ); ?>;color:<?php echo esc_attr( $sgs_button_text ); ?>;border-radius:4px;font-weight:bold;font-size:15px;text-decoration:none;">
		<?php echo esc_html( $label ); ?>
	</a>
</p>
