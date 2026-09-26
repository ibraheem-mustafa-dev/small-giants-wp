<?php
/**
 * Saved-items alert email (HTML).
 *
 * @package SGS\Blocks
 *
 * @var string      $email_heading      Email heading text.
 * @var string      $additional_content Extra text from the settings screen.
 * @var string      $first_name         Shopper's first name, or '' when unknown.
 * @var array       $items              Changed-item view models.
 * @var string      $manage_url         Saved-items page URL, or '' when there is none.
 * @var \WC_Email   $email              The email instance rendering this template.
 */

defined( 'ABSPATH' ) || exit;

do_action( 'woocommerce_email_header', $email_heading, $email );

$greeting_name = '' !== $first_name ? $first_name : __( 'there', 'sgs-blocks' );
$item_count    = count( $items );
?>
<p>
	<?php
	printf(
		/* translators: %s: shopper's first name, or 'there' when unknown */
		esc_html__( 'Hi %s,', 'sgs-blocks' ),
		esc_html( $greeting_name )
	);
	?>
</p>
<p>
	<?php
	if ( 1 === $item_count ) {
		esc_html_e( 'An item you saved has changed:', 'sgs-blocks' );
	} else {
		printf(
			/* translators: %d: number of changed items */
			esc_html( _n( '%d item you saved has changed:', '%d items you saved have changed:', $item_count, 'sgs-blocks' ) ),
			(int) $item_count
		);
	}
	?>
</p>
<ul style="padding-left:20px;margin:0 0 16px;">
	<?php foreach ( $items as $item ) : ?>
		<li style="margin-bottom:12px;">
			<a href="<?php echo esc_url( $item['url'] ); ?>"><?php echo esc_html( $item['name'] ); ?></a><br>
			<?php if ( 'price_drop' === $item['type'] ) : ?>
				<?php
				printf(
					/* translators: 1: new price, 2: price when the shopper saved the item */
					esc_html__( 'Price drop: now %1$s (%2$s when you saved it)', 'sgs-blocks' ),
					esc_html( $item['price_now'] ),
					esc_html( $item['price_saved'] )
				);
				?>
			<?php else : ?>
				<?php esc_html_e( 'Back in stock', 'sgs-blocks' ); ?>
			<?php endif; ?>
		</li>
	<?php endforeach; ?>
</ul>
<?php if ( $manage_url ) : ?>
	<p><a href="<?php echo esc_url( $manage_url ); ?>"><?php esc_html_e( 'View or manage your saved items', 'sgs-blocks' ); ?></a></p>
<?php endif; ?>
<?php if ( $additional_content ) : ?>
	<p style="font-size:13px;color:#555555;">
		<?php echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) ); ?>
	</p>
<?php endif; ?>
<?php
do_action( 'woocommerce_email_footer', $email );
