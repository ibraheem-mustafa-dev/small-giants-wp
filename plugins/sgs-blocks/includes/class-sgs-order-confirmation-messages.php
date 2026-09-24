<?php
/**
 * SGS Order Confirmation Messages — WooCommerce settings tab.
 *
 * Adds an "SGS Order Messages" tab under WooCommerce → Settings, letting the
 * site owner set the two lines shown on the order-confirmation ("thank you")
 * page: one for delivery orders, one for local-pickup / click-and-collect
 * orders. The correct one is chosen automatically per order by its shipping
 * method — see sgs-order-confirmation-messages.php::sgs_order_confirmation_append_message().
 *
 * Pattern: extends WC_Settings_Page, registered via woocommerce_get_settings_pages
 * filter — identical mechanism and timing guard to Pack_Pricing_Settings_Page
 * (class-pack-pricing-settings-page.php). Values are stored as a single
 * serialised option (sgs_order_confirmation_messages).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

// HARD parse-time guard: this class extends \WC_Settings_Page at file scope,
// so loading it before WooCommerce fatals the whole site. Only ever required
// lazily from sgs_order_confirmation_messages_add_settings_page() in
// sgs-order-confirmation-messages.php, which runs inside the
// woocommerce_get_settings_pages filter (WC_Settings_Page is already loaded
// by then). This guard additionally protects any direct/early require.
if ( ! \class_exists( 'WC_Settings_Page' ) ) {
	return;
}

/**
 * WooCommerce settings page: SGS Order Confirmation Messages.
 */
final class Sgs_Order_Confirmation_Messages extends \WC_Settings_Page {

	/**
	 * Option name the two messages are stored under.
	 */
	const OPTION_KEY = 'sgs_order_confirmation_messages';

	/**
	 * Constructor — sets up the tab id and label.
	 */
	public function __construct() {
		$this->id    = 'sgs_order_confirmation_messages';
		$this->label = \__( 'SGS Order Messages', 'sgs-blocks' );
		parent::__construct();
	}

	/**
	 * Return the settings fields for this tab.
	 *
	 * @return array WC settings definitions.
	 */
	public function get_settings(): array {
		$defaults = sgs_get_order_confirmation_message_defaults();

		return array(
			array(
				'title' => \__( 'SGS Order Confirmation Messages', 'sgs-blocks' ),
				'type'  => 'title',
				/* translators: Introductory description for the order-confirmation messages settings section. */
				'desc'  => \__( 'Shown on the order-confirmation ("thank you") page. The message is chosen automatically by the shipping method the customer picked at checkout. Leave a field blank to show nothing extra for that case.', 'sgs-blocks' ),
				'id'    => 'sgs_order_confirmation_messages_section',
			),
			array(
				'title'    => \__( 'Delivery message', 'sgs-blocks' ),
				/* translators: Description for the delivery message setting. */
				'desc'     => \__( 'Shown when the order is being shipped to the customer.', 'sgs-blocks' ),
				'id'       => self::OPTION_KEY . '[delivery_message]',
				'type'     => 'textarea',
				'css'      => 'width:100%;max-width:500px;height:60px;',
				'default'  => '',
				'placeholder' => $defaults['delivery_message'],
				'desc_tip' => true,
			),
			array(
				'title'    => \__( 'Collection message', 'sgs-blocks' ),
				/* translators: Description for the collection message setting. */
				'desc'     => \__( 'Shown when the order uses a local-pickup / click-and-collect shipping method.', 'sgs-blocks' ),
				'id'       => self::OPTION_KEY . '[collection_message]',
				'type'     => 'textarea',
				'css'      => 'width:100%;max-width:500px;height:60px;',
				'default'  => '',
				'placeholder' => $defaults['collection_message'],
				'desc_tip' => true,
			),
			array(
				'type' => 'sectionend',
				'id'   => 'sgs_order_confirmation_messages_section',
			),
		);
	}

	/**
	 * Save the settings — capability-gated admin-only write.
	 *
	 * WC verifies its own "woocommerce-settings" nonce before our save() runs
	 * (WC_Admin_Settings::save() calls check_admin_referer('woocommerce-settings')
	 * before dispatching to tab save() methods); the check here stands the
	 * save path alone regardless of that implicit gate, matching
	 * Pack_Pricing_Settings_Page::save().
	 *
	 * @return void
	 */
	public function save(): void {
		if ( ! \is_admin() ) {
			return;
		}

		if ( ! \current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- manage_woocommerce is a WooCommerce custom capability.
			\wp_die( \esc_html__( 'You do not have permission to manage WooCommerce settings.', 'sgs-blocks' ) );
		}

		\check_admin_referer( 'woocommerce-settings' );

		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- WC verifies its own settings nonce (checked explicitly above) before save() fires.
		$posted = isset( $_POST[ self::OPTION_KEY ] ) && \is_array( $_POST[ self::OPTION_KEY ] )
			? \wp_unslash( $_POST[ self::OPTION_KEY ] ) // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- each key sanitised individually below.
			: array();

		\update_option(
			self::OPTION_KEY,
			array(
				'delivery_message'   => \sanitize_textarea_field( (string) ( $posted['delivery_message'] ?? '' ) ),
				'collection_message' => \sanitize_textarea_field( (string) ( $posted['collection_message'] ?? '' ) ),
			)
		);
	}
}
