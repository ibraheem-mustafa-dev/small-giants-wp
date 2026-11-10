<?php
/**
 * SGS Account Extras: the runtime hooks behind sgs/account's menu count, hidden-Dashboard root, orders empty state,
 * addresses helper line and account-details extras. Every hook that changes output acts only while an sgs/account
 * block renders (`Account_Endpoints::$active`); the two save-time hooks act only on posts that carry this block's
 * own form flags, after WooCommerce's own nonce check.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Extra hooks for sgs/account. */
final class Account_Extras {

	/** Wire WordPress hooks. Called once from sgs-blocks.php. */
	public static function register(): void {
		\add_filter( 'woocommerce_account_menu_item_classes', array( __CLASS__, 'root_active_class' ), 20, 2 );
		\add_action( 'woocommerce_before_account_navigation', array( __CLASS__, 'start_menu_buffer' ), 1 );
		\add_action( 'woocommerce_after_account_navigation', array( __CLASS__, 'end_menu_buffer' ), 99 );
		\add_filter( 'wc_get_template', array( __CLASS__, 'maybe_swap_orders_template' ), 10, 5 );
		\add_filter( 'wc_get_template', array( __CLASS__, 'maybe_swap_lost_confirmation_template' ), 10, 5 );
		\add_action( 'woocommerce_account_edit-address_endpoint', array( __CLASS__, 'address_helper_line' ), 20 );
		\add_action( 'wp_loaded', array( __CLASS__, 'fill_display_name' ), 10 );
		\add_action( 'woocommerce_save_account_details_errors', array( __CLASS__, 'validate_mobile' ), 10, 1 );
		\add_action( 'woocommerce_save_account_details', array( __CLASS__, 'save_mobile' ), 10, 1 );
		\add_action( 'woocommerce_register_form_start', array( __CLASS__, 'register_first_name_field' ) );
		\add_filter( 'woocommerce_registration_errors', array( __CLASS__, 'validate_first_name' ), 10, 1 );
		\add_action( 'woocommerce_created_customer', array( __CLASS__, 'save_first_name' ), 10, 1 );
	}

	/**
	 * With the Dashboard hidden, the account root shows the first visible tab: that tab's menu link takes `is-active`.
	 *
	 * @param mixed $classes  Menu item classes.
	 * @param mixed $endpoint Endpoint key.
	 * @return mixed
	 */
	public static function root_active_class( $classes, $endpoint = '' ) {
		if ( ! is_array( $classes ) || ! is_array( Account_Endpoints::$active ) || ! is_string( $endpoint ) ) {
			return $classes;
		}
		if ( ! Account_Dashboard::dashboard_hidden() || ! function_exists( 'is_wc_endpoint_url' ) || \is_wc_endpoint_url() ) {
			return $classes;
		}
		if ( Account_Dashboard::first_visible_endpoint() === $endpoint && ! in_array( 'is-active', $classes, true ) ) {
			$classes[] = 'is-active';
		}
		return $classes;
	}

	/**
	 * Output-buffer level the menu buffer opened at; null while none is open.
	 *
	 * @var int|null
	 */
	private static $menu_buffer_level = null;

	/** Open an output buffer around the menu when the menu counts are on. */
	public static function start_menu_buffer(): void {
		if ( is_array( Account_Endpoints::$active ) && ! empty( Account_Endpoints::$active['menuOrdersCount'] ) ) {
			ob_start();
			self::$menu_buffer_level = ob_get_level();
		}
	}

	/** Close the buffer and add the count span after the Orders and Saved items labels (WooCommerce escapes menu labels, so the span is added to the finished markup). */
	public static function end_menu_buffer(): void {
		$level                   = self::$menu_buffer_level;
		self::$menu_buffer_level = null;
		// Close only the buffer this class opened: if another buffer is open above it, leave both alone.
		if ( null === $level || ob_get_level() !== $level ) {
			return;
		}
		$html   = (string) ob_get_clean();
		$counts = array(
			'orders'      => function_exists( 'wc_get_customer_order_count' ) ? (int) \wc_get_customer_order_count( get_current_user_id() ) : 0,
			'saved-items' => class_exists( Wishlist_Store::class ) ? count( Wishlist_Store::read_list( get_current_user_id() ) ) : 0,
		);
		foreach ( $counts as $endpoint => $count ) {
			if ( $count > 0 ) {
				$html = (string) preg_replace(
					'#(<li[^>]*woocommerce-MyAccount-navigation-link--' . $endpoint . '[^>]*>\s*<a\b[^>]*>)(.*?)(</a>)#s',
					'$1$2<span class="sgs-account__menu-count">' . $count . '</span>$3',
					$html,
					1
				);
			}
		}
		echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WooCommerce's own escaped navigation markup plus an integer.
	}

	/**
	 * Swap `myaccount/orders.php` for the empty-state card when the customer has no orders and the setting is on.
	 *
	 * @param mixed $template      Located template path.
	 * @param mixed $template_name Template name.
	 * @param mixed $args          Template args.
	 * @return mixed
	 */
	public static function maybe_swap_orders_template( $template, $template_name = '', $args = array() ) {
		if ( 'myaccount/orders.php' !== $template_name || ! is_array( Account_Endpoints::$active ) || empty( Account_Endpoints::$active['ordersEmptyState'] ) ) {
			return $template;
		}
		if ( ! is_array( $args ) || ! array_key_exists( 'has_orders', $args ) || ! empty( $args['has_orders'] ) ) {
			return $template;
		}
		return __DIR__ . '/templates/orders-empty.php';
	}

	/**
	 * Swap `myaccount/lost-password-confirmation.php` for an empty one while the block's header words the confirmation.
	 *
	 * @param mixed $template      Located template path.
	 * @param mixed $template_name Template name.
	 * @return mixed
	 */
	public static function maybe_swap_lost_confirmation_template( $template, $template_name = '' ) {
		if ( 'myaccount/lost-password-confirmation.php' !== $template_name || ! is_array( Account_Endpoints::$active ) ) {
			return $template;
		}
		$words = trim( (string) ( Account_Endpoints::$active['headerLostSentTitle'] ?? '' ) . (string) ( Account_Endpoints::$active['headerLostSentIntro'] ?? '' ) );
		return '' === $words ? $template : __DIR__ . '/templates/lost-sent.php';
	}

	/**
	 * The helper line under the two address cards (the overview only, not an address form).
	 *
	 * @param mixed $value Endpoint value ('' on the overview).
	 */
	public static function address_helper_line( $value = '' ) {
		if ( ! is_array( Account_Endpoints::$active ) || '' !== (string) $value ) {
			return;
		}
		$text = trim( (string) ( Account_Endpoints::$active['addressHelperText'] ?? '' ) );
		if ( '' === $text ) {
			return;
		}
		echo '<p class="sgs-account__address-helper">' . wp_kses_post( $text ) . '</p>';
	}

	/**
	 * "Display name from first and last name": the form carries a hidden display name and a flag; on save, once the
	 * account-details nonce checks out, the display name is built from the posted first and last name before
	 * WooCommerce's own handler (priority 20) validates it.
	 */
	public static function fill_display_name(): void {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- the nonce is verified on the next lines.
		if ( ! is_user_logged_in() || empty( $_POST['sgs_display_from_names'] ) || ! isset( $_POST['action'] ) || 'save_account_details' !== $_POST['action'] ) {
			return;
		}
		$nonce = isset( $_POST['save-account-details-nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['save-account-details-nonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'save_account_details' ) ) {
			return;
		}
		$first = isset( $_POST['account_first_name'] ) ? sanitize_text_field( wp_unslash( $_POST['account_first_name'] ) ) : '';
		$last  = isset( $_POST['account_last_name'] ) ? sanitize_text_field( wp_unslash( $_POST['account_last_name'] ) ) : '';
		$name  = trim( $first . ' ' . $last );
		if ( '' !== $name ) {
			$_POST['account_display_name'] = $name;
		}
		// phpcs:enable WordPress.Security.NonceVerification.Missing
	}

	/**
	 * Reject an invalid mobile number (runs inside WooCommerce's save, after its nonce check).
	 *
	 * @param mixed $errors WP_Error collecting the save's errors.
	 */
	public static function validate_mobile( $errors ) {
		$phone = self::posted_mobile();
		if ( null === $phone || '' === $phone || ! ( $errors instanceof \WP_Error ) ) {
			return;
		}
		if ( class_exists( 'WC_Validation' ) && ! \WC_Validation::is_phone( $phone ) ) {
			$errors->add( 'account_mobile_error', __( 'Please enter a valid mobile number.', 'sgs-blocks' ) );
		}
	}

	/**
	 * Save the mobile number to the customer's billing phone (runs after WooCommerce's own validated save).
	 *
	 * @param mixed $user_id Saved user id.
	 */
	public static function save_mobile( $user_id ) {
		$phone = self::posted_mobile();
		if ( null === $phone || ! is_numeric( $user_id ) || get_current_user_id() !== (int) $user_id ) {
			return;
		}
		update_user_meta( (int) $user_id, 'billing_phone', function_exists( 'wc_sanitize_phone_number' ) ? \wc_sanitize_phone_number( $phone ) : $phone );
	}

	/**
	 * The posted mobile number, or null when this form did not carry the field.
	 *
	 * @return string|null
	 */
	private static function posted_mobile() {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- only called from WooCommerce's save hooks, after its nonce check.
		if ( empty( $_POST['sgs_account_mobile'] ) ) {
			return null;
		}
		return isset( $_POST['account_mobile'] ) ? sanitize_text_field( wp_unslash( $_POST['account_mobile'] ) ) : '';
		// phpcs:enable WordPress.Security.NonceVerification.Missing
	}

	/** The First name field at the top of the register form, while an sgs/account block with the setting on renders. */
	public static function register_first_name_field(): void {
		if ( ! is_array( Account_Endpoints::$active ) || empty( Account_Endpoints::$active['registerShowFirstName'] ) ) {
			return;
		}
		$label = trim( (string) ( Account_Endpoints::$active['registerFirstNameLabel'] ?? '' ) );
		$label = '' !== $label ? $label : __( 'First name', 'sgs-blocks' );
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- redisplays the visitor's own typed value only.
		$value = isset( $_POST['first_name'] ) ? sanitize_text_field( wp_unslash( $_POST['first_name'] ) ) : '';
		echo '<p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">'
			. '<label for="reg_first_name">' . esc_html( $label ) . '&nbsp;<span class="required" aria-hidden="true">*</span><span class="screen-reader-text">' . esc_html__( 'Required', 'sgs-blocks' ) . '</span></label>'
			. '<input type="text" class="woocommerce-Input woocommerce-Input--text input-text" name="first_name" id="reg_first_name" autocomplete="given-name" value="' . esc_attr( $value ) . '" required aria-required="true" />'
			. '<input type="hidden" name="sgs_register_first_name" value="1" /></p>';
	}

	/**
	 * First name is required when the form carried the field (runs inside WooCommerce's registration, after its
	 * register nonce check).
	 *
	 * @param mixed $errors WP_Error collecting the registration's errors.
	 * @return mixed
	 */
	public static function validate_first_name( $errors ) {
		$name = self::posted_first_name();
		if ( null !== $name && '' === $name && $errors instanceof \WP_Error ) {
			$errors->add( 'registration-error-missing-first-name', __( 'Please enter your first name.', 'sgs-blocks' ) );
		}
		return $errors;
	}

	/**
	 * Store the first name on the new customer (runs after WooCommerce has created the account).
	 *
	 * @param mixed $customer_id New customer id.
	 */
	public static function save_first_name( $customer_id ) {
		$name = self::posted_first_name();
		if ( null === $name || '' === $name || ! is_numeric( $customer_id ) ) {
			return;
		}
		update_user_meta( (int) $customer_id, 'first_name', $name );
		update_user_meta( (int) $customer_id, 'billing_first_name', $name );
	}

	/**
	 * The posted first name, or null when the register form did not carry the field.
	 *
	 * @return string|null
	 */
	private static function posted_first_name() {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- only called from WooCommerce's registration hooks, after its nonce check.
		if ( empty( $_POST['sgs_register_first_name'] ) ) {
			return null;
		}
		return isset( $_POST['first_name'] ) ? sanitize_text_field( wp_unslash( $_POST['first_name'] ) ) : '';
		// phpcs:enable WordPress.Security.NonceVerification.Missing
	}
}
