<?php
/**
 * Back-in-stock notice email (HTML).
 *
 * @package SGS\Blocks
 *
 * @var string    $email_heading      Email heading text.
 * @var string    $additional_content Extra text from the settings screen.
 * @var string    $product_name       Restocked product's name.
 * @var string    $product_url        Restocked product's URL.
 * @var string    $manage_url         Saved-items page URL, or '' when there is none.
 * @var \WC_Email $email              The email instance rendering this template.
 */

defined( 'ABSPATH' ) || exit;

do_action( 'woocommerce_email_header', $email_heading, $email );
?>
<p><?php esc_html_e( 'Hello,', 'sgs-blocks' ); ?></p>
<p>
	<?php
	printf(
		/* translators: %s: restocked product's name */
		esc_html__( 'You asked to be told when %s was back in stock. It is available now.', 'sgs-blocks' ),
		esc_html( $product_name )
	);
	?>
</p>
<p><a href="<?php echo esc_url( $product_url ); ?>"><?php echo esc_html( $product_name ); ?></a></p>
<?php if ( $manage_url ) : ?>
	<p><a href="<?php echo esc_url( $manage_url ); ?>"><?php esc_html_e( 'Manage your saved-item alerts', 'sgs-blocks' ); ?></a></p>
<?php endif; ?>
<?php if ( $additional_content ) : ?>
	<p style="font-size:13px;color:#555555;">
		<?php echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) ); ?>
	</p>
<?php endif; ?>
<?php
do_action( 'woocommerce_email_footer', $email );
