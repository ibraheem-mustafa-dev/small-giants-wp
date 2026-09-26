<?php
/**
 * Saved-items alert email (plain text).
 *
 * @package SGS\Blocks
 *
 * @var string $email_heading      Email heading text.
 * @var string $additional_content Extra text from the settings screen.
 * @var string $first_name         Shopper's first name, or '' when unknown.
 * @var array  $items              Changed-item view models.
 * @var string $manage_url         Saved-items page URL, or '' when there is none.
 */

defined( 'ABSPATH' ) || exit;

$greeting_name = '' !== $first_name ? $first_name : __( 'there', 'sgs-blocks' );
$item_count    = count( $items );

echo '= ' . esc_html( $email_heading ) . " =\n\n";

/* translators: %s: shopper's first name, or 'there' when unknown */
echo sprintf( esc_html__( 'Hi %s,', 'sgs-blocks' ), esc_html( $greeting_name ) ) . "\n\n";

if ( 1 === $item_count ) {
	echo esc_html__( 'An item you saved has changed:', 'sgs-blocks' ) . "\n\n";
} else {
	/* translators: %d: number of changed items */
	echo sprintf( esc_html( _n( '%d item you saved has changed:', '%d items you saved have changed:', $item_count, 'sgs-blocks' ) ), (int) $item_count ) . "\n\n";
}

foreach ( $items as $item ) {
	echo '- ' . esc_html( $item['name'] ) . "\n";
	if ( 'price_drop' === $item['type'] ) {
		/* translators: 1: new price, 2: price when the shopper saved the item */
		echo sprintf( esc_html__( '  Price drop: now %1$s (%2$s when you saved it)', 'sgs-blocks' ), esc_html( $item['price_now'] ), esc_html( $item['price_saved'] ) ) . "\n";
	} else {
		echo '  ' . esc_html__( 'Back in stock', 'sgs-blocks' ) . "\n";
	}
	echo '  ' . esc_html( $item['url'] ) . "\n\n";
}

if ( $manage_url ) {
	echo esc_html__( 'View or manage your saved items:', 'sgs-blocks' ) . ' ' . esc_html( $manage_url ) . "\n\n";
}

if ( $additional_content ) {
	echo wp_strip_all_tags( wptexturize( $additional_content ) ) . "\n\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- plain-text context; wp_strip_all_tags() already removes markup.
}

echo apply_filters( 'woocommerce_email_footer_text', get_option( 'woocommerce_email_footer_text' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- core WooCommerce filter, plain-text context.
