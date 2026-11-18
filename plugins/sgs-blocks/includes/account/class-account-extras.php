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
		\add_filter( 'wc_get_template', array( __CLASS__, 'maybe_swap_view_order_template' ), 10, 5 );
		\add_filter( 'wc_get_template', array( __CLASS__, 'maybe_swap_reset_password_template' ), 10, 5 );
		\add_filter( 'wc_get_template', array( __CLASS__, 'maybe_swap_address_template' ), 10, 5 );
		\add_filter( 'woocommerce_billing_fields', array( __CLASS__, 'add_address_2' ), 20 );
		\add_filter( 'woocommerce_shipping_fields', array( __CLASS__, 'add_address_2' ), 20 );
		\add_filter( 'woocommerce_account_orders_columns', array( __CLASS__, 'add_summary_column' ) );
		\add_action( 'woocommerce_my_account_my_orders_column_order-summary', array( __CLASS__, 'summary_cell' ) );
		\add_action( 'woocommerce_account_edit-address_endpoint', array( __CLASS__, 'address_helper_line' ), 20 );
		\add_action( 'wp_loaded', array( __CLASS__, 'fill_display_name' ), 10 );
		\add_action( 'woocommerce_save_account_details_errors', array( __CLASS__, 'validate_mobile' ), 10, 1 );
		\add_action( 'woocommerce_save_account_details', array( __CLASS__, 'save_mobile' ), 10, 1 );
		\add_action( 'woocommerce_edit_account_form', array( __CLASS__, 'account_marketing_opt_in_field' ), 20 );
		\add_action( 'woocommerce_save_account_details', array( __CLASS__, 'save_account_marketing_opt_in' ), 20, 1 );
		\add_action( 'woocommerce_register_form_start', array( __CLASS__, 'register_first_name_field' ) );
		\add_filter( 'woocommerce_registration_errors', array( __CLASS__, 'validate_first_name' ), 10, 1 );
		\add_action( 'woocommerce_created_customer', array( __CLASS__, 'save_first_name' ), 10, 1 );
		\add_action( 'woocommerce_register_form_start', array( __CLASS__, 'register_last_name_field' ), 11 );
		\add_filter( 'woocommerce_registration_errors', array( __CLASS__, 'validate_last_name' ), 10, 1 );
		\add_action( 'woocommerce_created_customer', array( __CLASS__, 'save_last_name' ), 10, 1 );
		\add_action( 'woocommerce_register_form', array( __CLASS__, 'register_marketing_opt_in_field' ), 20 );
		\add_action( 'woocommerce_created_customer', array( __CLASS__, 'save_marketing_opt_in' ), 20, 1 );
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
		if ( 'myaccount/orders.php' !== $template_name || ! is_array( Account_Endpoints::$active ) ) {
			return $template;
		}
		if ( ! is_array( $args ) || ! array_key_exists( 'has_orders', $args ) ) {
			return $template;
		}
		if ( ! empty( $args['has_orders'] ) ) {
			return ! empty( Account_Endpoints::$active['ordersRowList'] ) ? __DIR__ . '/templates/orders-list.php' : $template;
		}
		return ! empty( Account_Endpoints::$active['ordersEmptyState'] ) ? __DIR__ . '/templates/orders-empty.php' : $template;
	}

	/**
	 * Swap `myaccount/view-order.php` for the block's own order detail while `orderDetailLook` is on.
	 *
	 * @param mixed $template      Located template path.
	 * @param mixed $template_name Template name.
	 * @return mixed
	 */
	public static function maybe_swap_view_order_template( $template, $template_name = '' ) {
		if ( 'myaccount/view-order.php' !== $template_name || ! is_array( Account_Endpoints::$active ) || empty( Account_Endpoints::$active['orderDetailLook'] ) ) {
			return $template;
		}
		return __DIR__ . '/templates/order-detail.php';
	}

	/**
	 * Print the gift note after WooCommerce's own order table (its `woocommerce_view_order` action). The block's own order
	 * detail (`orderDetailLook`) prints the note itself, so this stands down then.
	 *
	 * @param mixed $order_id The order being viewed.
	 * @return void
	 */
	public static function view_order_gift_note( $order_id ): void {
		if ( ! is_array( Account_Endpoints::$active ) || ! empty( Account_Endpoints::$active['orderDetailLook'] ) || ! function_exists( 'wc_get_order' ) ) {
			return;
		}
		$order = \wc_get_order( (int) $order_id );
		if ( $order ) {
			echo sgs_account_gift_note_html( $order, Account_Endpoints::$active ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in the helper.
		}
	}

	/**
	 * Swap `myaccount/form-reset-password.php` for the block's own while `resetErrorsInline` is on: its validation
	 * errors print as red text under the fields instead of a boxed notice above the form.
	 *
	 * @param mixed $template      Located template path.
	 * @param mixed $template_name Template name.
	 * @return mixed
	 */
	public static function maybe_swap_reset_password_template( $template, $template_name = '' ) {
		if ( 'myaccount/form-reset-password.php' !== $template_name || ! is_array( Account_Endpoints::$active ) || empty( Account_Endpoints::$active['resetErrorsInline'] ) ) {
			return $template;
		}
		return __DIR__ . '/templates/form-reset-password.php';
	}

	/**
	 * Swap WooCommerce's address list and address form for the block's own address view while `addressEditor` is on.
	 *
	 * @param mixed $template      Located template path.
	 * @param mixed $template_name Template name.
	 * @return mixed
	 */
	public static function maybe_swap_address_template( $template, $template_name = '' ) {
		if ( ! is_array( Account_Endpoints::$active ) || empty( Account_Endpoints::$active['addressEditor'] ) ) {
			return $template;
		}
		if ( 'myaccount/my-address.php' === $template_name ) {
			return __DIR__ . '/templates/my-address.php';
		}
		if ( 'myaccount/form-edit-address.php' === $template_name ) {
			return __DIR__ . '/templates/form-edit-address.php';
		}
		return $template;
	}

	/**
	 * The sgs/account block's attributes from the My Account page's content, for the request that saves an address
	 * (WooCommerce saves on `wp_loaded`, before any block renders). Null when the page has no such block.
	 *
	 * @return array|null
	 */
	private static function page_attributes() {
		static $found = false;
		if ( false !== $found ) {
			return $found;
		}
		$found = null;
		$page  = function_exists( 'wc_get_page_id' ) ? \get_post( (int) \wc_get_page_id( 'myaccount' ) ) : null;
		if ( $page && \has_block( 'sgs/account', $page ) ) {
			$stack = \parse_blocks( (string) $page->post_content );
			while ( $stack ) {
				$block = array_shift( $stack );
				if ( 'sgs/account' === ( $block['blockName'] ?? '' ) ) {
					$found = (array) ( $block['attrs'] ?? array() );
					break;
				}
				$stack = array_merge( (array) ( $block['innerBlocks'] ?? array() ), $stack );
			}
		}
		return $found;
	}

	/**
	 * Add the optional second address line to the fields WooCommerce builds, on the account address screens only and
	 * only while `addressEditor` is on: while the block renders, and on the edit-address endpoint (so WooCommerce's
	 * save handler, which stores only the fields it builds, keeps the line). Checkout is untouched.
	 *
	 * @param mixed $fields Address fields keyed `billing_*` or `shipping_*`.
	 * @return mixed
	 */
	public static function add_address_2( $fields ) {
		if ( ! is_array( $fields ) ) {
			return $fields;
		}
		$attrs = is_array( Account_Endpoints::$active ) ? Account_Endpoints::$active : null;
		if ( null === $attrs && function_exists( 'is_wc_endpoint_url' ) && \is_wc_endpoint_url( 'edit-address' ) ) {
			$attrs = self::page_attributes();
		}
		if ( ! is_array( $attrs ) || empty( $attrs['addressEditor'] ) ) {
			return $fields;
		}
		foreach ( array( 'billing_', 'shipping_' ) as $prefix ) {
			if ( isset( $fields[ $prefix . 'address_1' ] ) && ! isset( $fields[ $prefix . 'address_2' ] ) ) {
				$label   = trim( (string) ( $attrs['addressLine2Label'] ?? '' ) );
				$section = rtrim( $prefix, '_' );

				$fields[ $prefix . 'address_2' ] = array(
					'label'        => '' !== $label ? $label : \__( 'Apartment, suite, unit, etc.', 'sgs-blocks' ),
					'required'     => false,
					'class'        => array( 'form-row-wide', 'address-field' ),
					'autocomplete' => 'section-' . $section . ' ' . $section . ' address-line2',
					'priority'     => (int) ( $fields[ $prefix . 'address_1' ]['priority'] ?? 50 ) + 10,
				);
			}
		}
		return $fields;
	}

	/**
	 * Add the items summary column to the orders table while `ordersSummary` is on.
	 *
	 * @param mixed $columns Column key => label.
	 * @return mixed
	 */
	public static function add_summary_column( $columns ) {
		if ( ! is_array( $columns ) || ! is_array( Account_Endpoints::$active ) || empty( Account_Endpoints::$active['ordersSummary'] ) ) {
			return $columns;
		}
		$out = array();
		foreach ( $columns as $key => $label ) {
			$out[ $key ] = $label;
			if ( 'order-date' === $key ) {
				$out['order-summary'] = __( 'Items', 'sgs-blocks' );
			}
		}
		return $out;
	}

	/**
	 * The summary cell: the order's product names on one line.
	 *
	 * @param mixed $order The order.
	 */
	public static function summary_cell( $order ) {
		if ( is_object( $order ) && method_exists( $order, 'get_items' ) && function_exists( 'sgs_account_order_item_names' ) ) {
			echo esc_html( sgs_account_order_item_names( $order ) );
		}
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

	/** The Last name field under First name on the register form, while an sgs/account block with the setting on renders. */
	public static function register_last_name_field(): void {
		if ( ! is_array( Account_Endpoints::$active ) || empty( Account_Endpoints::$active['registerShowLastName'] ) ) {
			return;
		}
		$label = trim( (string) ( Account_Endpoints::$active['registerLastNameLabel'] ?? '' ) );
		$label = '' !== $label ? $label : __( 'Last name', 'sgs-blocks' );
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- redisplays the visitor's own typed value only.
		$value = isset( $_POST['last_name'] ) ? sanitize_text_field( wp_unslash( $_POST['last_name'] ) ) : '';
		echo '<p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">'
			. '<label for="reg_last_name">' . esc_html( $label ) . '&nbsp;<span class="required" aria-hidden="true">*</span><span class="screen-reader-text">' . esc_html__( 'Required', 'sgs-blocks' ) . '</span></label>'
			. '<input type="text" class="woocommerce-Input woocommerce-Input--text input-text" name="last_name" id="reg_last_name" autocomplete="family-name" value="' . esc_attr( $value ) . '" required aria-required="true" />'
			. '<input type="hidden" name="sgs_register_last_name" value="1" /></p>';
	}

	/**
	 * Last name is required when the form carried the field (runs inside WooCommerce's registration, after its
	 * register nonce check).
	 *
	 * @param mixed $errors WP_Error collecting the registration's errors.
	 * @return mixed
	 */
	public static function validate_last_name( $errors ) {
		$name = self::posted_last_name();
		if ( null !== $name && '' === $name && $errors instanceof \WP_Error ) {
			$errors->add( 'registration-error-missing-last-name', __( 'Please enter your last name.', 'sgs-blocks' ) );
		}
		return $errors;
	}

	/**
	 * Store the last name on the new customer (runs after WooCommerce has created the account).
	 *
	 * @param mixed $customer_id New customer id.
	 */
	public static function save_last_name( $customer_id ) {
		$name = self::posted_last_name();
		if ( null === $name || '' === $name || ! is_numeric( $customer_id ) ) {
			return;
		}
		update_user_meta( (int) $customer_id, 'last_name', $name );
		update_user_meta( (int) $customer_id, 'billing_last_name', $name );
	}

	/**
	 * The posted last name, or null when the register form did not carry the field.
	 *
	 * @return string|null
	 */
	private static function posted_last_name() {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- only called from WooCommerce's registration hooks, after its nonce check.
		if ( empty( $_POST['sgs_register_last_name'] ) ) {
			return null;
		}
		return isset( $_POST['last_name'] ) ? sanitize_text_field( wp_unslash( $_POST['last_name'] ) ) : '';
		// phpcs:enable WordPress.Security.NonceVerification.Missing
	}

	/** The optional "email me" tick before the register button, unticked, while an sgs/account block with the setting on renders. */
	public static function register_marketing_opt_in_field(): void {
		if ( ! is_array( Account_Endpoints::$active ) || empty( Account_Endpoints::$active['registerShowMarketingOptIn'] ) ) {
			return;
		}
		$label = trim( (string) ( Account_Endpoints::$active['registerMarketingOptInLabel'] ?? '' ) );
		$label = '' !== $label ? $label : __( 'Email me news and offers', 'sgs-blocks' );
		echo '<p class="woocommerce-form-row form-row sgs-account__marketing-opt-in">'
			. '<label class="woocommerce-form__label woocommerce-form__label-for-checkbox checkbox" for="reg_sgs_marketing_opt_in">'
			. '<input type="checkbox" class="woocommerce-form__input woocommerce-form__input-checkbox input-checkbox" name="sgs_marketing_opt_in" id="reg_sgs_marketing_opt_in" value="1" /> '
			. '<span>' . esc_html( $label ) . '</span></label>'
			. '<input type="hidden" name="sgs_register_marketing" value="1" /></p>';
	}

	/**
	 * Record the visitor's consent on the new customer: a flag and the GMT time, only when the tick was posted.
	 * Unticked records nothing. Checks the register form's own nonce itself, because the choice is a consent record.
	 *
	 * @param mixed $customer_id New customer id.
	 */
	public static function save_marketing_opt_in( $customer_id ) {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- the nonce is verified on the next lines.
		if ( ! is_numeric( $customer_id ) || empty( $_POST['sgs_register_marketing'] ) || empty( $_POST['sgs_marketing_opt_in'] ) ) {
			return;
		}
		$nonce = isset( $_POST['woocommerce-register-nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['woocommerce-register-nonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'woocommerce-register' ) ) {
			return;
		}
		update_user_meta( (int) $customer_id, 'sgs_marketing_opt_in', '1' );
		update_user_meta( (int) $customer_id, 'sgs_marketing_opt_in_at', gmdate( 'Y-m-d H:i:s' ) );
		// phpcs:enable WordPress.Security.NonceVerification.Missing
	}

	/** The "email me" tick on the account-details form, ticked from the customer's saved choice, while the setting is on. */
	public static function account_marketing_opt_in_field(): void {
		if ( ! is_array( Account_Endpoints::$active ) || empty( Account_Endpoints::$active['accountShowMarketingOptIn'] ) ) {
			return;
		}
		$label = trim( (string) ( Account_Endpoints::$active['accountMarketingOptInLabel'] ?? '' ) );
		$label = '' !== $label ? $label : __( 'Email me news and offers', 'sgs-blocks' );
		$on    = '1' === (string) get_user_meta( get_current_user_id(), 'sgs_marketing_opt_in', true );
		echo '<p class="woocommerce-form-row form-row sgs-account__marketing-opt-in">'
			. '<label class="woocommerce-form__label woocommerce-form__label-for-checkbox checkbox" for="account_sgs_marketing_opt_in">'
			. '<input type="checkbox" class="woocommerce-form__input woocommerce-form__input-checkbox input-checkbox" name="sgs_marketing_opt_in" id="account_sgs_marketing_opt_in" value="1"' . ( $on ? ' checked' : '' ) . ' /> '
			. '<span>' . esc_html( $label ) . '</span></label>'
			. '<input type="hidden" name="sgs_account_marketing" value="1" /></p>';
	}

	/**
	 * Save the tick (runs on WooCommerce's `woocommerce_save_account_details`, after its own nonce and validation).
	 * Only a form that carried the tick changes anything. Turning it on records the flag and the GMT time once; turning
	 * it off removes both, so no consent record outlives the choice.
	 *
	 * @param mixed $user_id The customer being saved.
	 */
	public static function save_account_marketing_opt_in( $user_id ) {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- WooCommerce verifies the account-details nonce before this action fires.
		if ( ! is_numeric( $user_id ) || empty( $_POST['sgs_account_marketing'] ) ) {
			return;
		}
		$user_id = (int) $user_id;
		if ( ! empty( $_POST['sgs_marketing_opt_in'] ) ) {
			if ( '1' !== (string) get_user_meta( $user_id, 'sgs_marketing_opt_in', true ) ) {
				update_user_meta( $user_id, 'sgs_marketing_opt_in', '1' );
				update_user_meta( $user_id, 'sgs_marketing_opt_in_at', gmdate( 'Y-m-d H:i:s' ) );
			}
			return;
		}
		delete_user_meta( $user_id, 'sgs_marketing_opt_in' );
		delete_user_meta( $user_id, 'sgs_marketing_opt_in_at' );
		// phpcs:enable WordPress.Security.NonceVerification.Missing
	}
}
