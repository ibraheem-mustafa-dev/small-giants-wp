<?php
/**
 * SGS Account lost-password confirmation: the page header carries the "check your email" title and text (the
 * `headerLostSentTitle` and `headerLostSentIntro` settings), so WooCommerce's notice and paragraph are left out. Swapped
 * in by `Account_Extras::maybe_swap_lost_confirmation_template()` only while an sgs/account block renders with either
 * setting filled.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// WooCommerce's own confirmation template fires these around its message; extensions hook them.
do_action( 'woocommerce_before_lost_password_confirmation_message' );
do_action( 'woocommerce_after_lost_password_confirmation_message' );
