<?php
/**
 * Back-in-stock notice email (plain text).
 *
 * @package SGS\Blocks
 *
 * @var string $email_heading      Email heading text.
 * @var string $additional_content Extra text from the settings screen.
 * @var string $product_name       Restocked product's name.
 * @var string $product_url        Restocked product's URL.
 * @var string $manage_url         Saved-items page URL, or '' when there is none.
 */

defined( 'ABSPATH' ) || exit;

echo '= ' . esc_html( $email_heading ) . " =\n\n";

echo esc_html__( 'Hello,', 'sgs-blocks' ) . "\n\n";

/* translators: %s: restocked product's name */
echo sprintf( esc_html__( 'You asked to be told when %s was back in stock. It is available now.', 'sgs-blocks' ), esc_html( $product_name ) ) . "\n";
echo esc_html( $product_url ) . "\n\n";

if ( $manage_url ) {
	echo esc_html__( 'Manage your saved-item alerts:', 'sgs-blocks' ) . ' ' . esc_html( $manage_url ) . "\n\n";
}

if ( $additional_content ) {
	echo wp_strip_all_tags( wptexturize( $additional_content ) ) . "\n\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- plain-text context; wp_strip_all_tags() already removes markup.
}

echo apply_filters( 'woocommerce_email_footer_text', get_option( 'woocommerce_email_footer_text' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- core WooCommerce filter, plain-text context.
