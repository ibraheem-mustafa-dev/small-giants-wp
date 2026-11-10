<?php
/**
 * Address view for sgs/account (addressEditor on): one card per address type, each holding its read view and, in the
 * same card, its edit form (hidden until Edit is pressed). Saving stays WooCommerce's own handler
 * (`WC_Form_Handler::save_address`): each form posts to the type's edit-address URL with WooCommerce's action field and
 * nonce, so validation, the saved-address hooks and WooCommerce's notices all run unchanged. The fields themselves
 * come from `helpers-account-address-fields.php`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-account-address-fields.php';

if ( ! function_exists( 'sgs_account_address_read_html' ) ) {
	/**
	 * The card's read view: the saved address, or the empty-card line (the block's wording, else WooCommerce's own;
	 * an empty billing card says "same as delivery" while a delivery address is saved).
	 *
	 * @param string $type       Address type.
	 * @param string $saved      WooCommerce's formatted saved address ('' when none).
	 * @param array  $attributes Block attributes.
	 * @return string Inner HTML of the address element.
	 */
	function sgs_account_address_read_html( string $type, string $saved, array $attributes ): string {
		if ( '' !== trim( $saved ) ) {
			return wp_kses_post( $saved );
		}
		$line = trim( (string) ( $attributes['addressEmptyText'] ?? '' ) );
		$same = trim( (string) ( $attributes['addressSameText'] ?? '' ) );
		if ( '' !== $same && 'billing' === $type && '' !== trim( (string) get_user_meta( get_current_user_id(), 'shipping_address_1', true ) ) ) {
			return esc_html( $same );
		}
		if ( '' === $line ) {
			return esc_html__( 'You have not set up this type of address yet.', 'woocommerce' ); // phpcs:ignore WordPress.WP.I18n.TextDomainMismatch -- WooCommerce's own text.
		}
		$name = strtolower( trim( (string) preg_replace( '/\s+address$/i', '', sgs_account_address_title( $type ) ) ) );
		return esc_html( str_replace( '{type}', $name, $line ) );
	}
}

if ( ! function_exists( 'sgs_account_address_card_html' ) ) {
	/**
	 * One address card.
	 *
	 * @param string $type       Address type.
	 * @param array  $attributes Block attributes.
	 * @param bool   $open       Whether the form starts open (the edit URL, or a save that failed validation).
	 * @param array  $fields     The type's fields with values; empty to build them from WooCommerce.
	 * @return string
	 */
	function sgs_account_address_card_html( string $type, array $attributes, bool $open, array $fields = array() ): string {
		$title    = sgs_account_address_title( $type );
		$saved    = (string) wc_get_account_formatted_address( $type );
		$text     = static function ( string $key, string $fallback ) use ( $attributes ): string {
			$value = trim( (string) ( $attributes[ $key ] ?? '' ) );
			return '' !== $value ? $value : $fallback;
		};
		$edit_url = wc_get_endpoint_url( 'edit-address', $type );
		$list_url = wc_get_endpoint_url( 'edit-address' );
		$edit     = '' !== trim( $saved )
			? $text( 'addressEditLabel', sprintf( \SGS\Blocks\Account_Strings::text( 'editAddressLink', 'Edit %s' ), $title ) )
			: $text( 'addressAddLabel', sprintf( \SGS\Blocks\Account_Strings::text( 'addAddressLink', 'Add %s' ), $title ) );
		$form_id  = 'sgs-addr-form-' . $type;
		$fields   = array() !== $fields ? $fields : sgs_account_address_fields( $type );
		$country  = (string) wc_get_post_data_by_key( $type . '_country', (string) ( $fields[ $type . '_country' ]['value'] ?? WC()->countries->get_base_country() ) );

		$rows = '';
		foreach ( $fields as $key => $field ) {
			$rows .= sgs_account_address_field_html( $type, (string) $key, (array) $field, $attributes, $country );
		}
		if ( false !== strpos( $rows, 'country_to_state' ) ) {
			wp_enqueue_script( 'wc-country-select' );
			wp_enqueue_script( 'wc-address-i18n' );
		}

		ob_start();
		do_action( "woocommerce_before_edit_address_form_{$type}" ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound,WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WooCommerce's own hook.
		$before = (string) ob_get_clean();
		ob_start();
		do_action( "woocommerce_after_edit_address_form_{$type}" ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound,WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WooCommerce's own hook.
		$after = (string) ob_get_clean();
		ob_start();
		do_action( 'woocommerce_my_account_after_my_address', $type ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WooCommerce's own hook.
		$extra = (string) ob_get_clean();

		return '<div class="woocommerce-Address sgs-account__addr" data-sgs-addr="' . esc_attr( $type ) . '">'
			. '<header class="woocommerce-Address-title title"><h2>' . esc_html( $title ) . '</h2>'
			. '<a class="edit sgs-account__addr-edit" href="' . esc_url( $edit_url ) . '" data-sgs-addr-edit aria-controls="' . esc_attr( $form_id ) . '" aria-expanded="' . ( $open ? 'true' : 'false' ) . '"' . ( $open ? ' hidden' : '' ) . '>' . esc_html( $edit ) . '</a></header>'
			. '<address class="sgs-account__addr-read" data-sgs-addr-read' . ( $open ? ' hidden' : '' ) . '>' . sgs_account_address_read_html( $type, $saved, $attributes ) . $extra . '</address>'
			. '<form class="sgs-account__addr-form" id="' . esc_attr( $form_id ) . '" method="post" action="' . esc_url( $edit_url ) . '" data-sgs-addr-form' . ( $open ? '' : ' hidden' ) . '>'
			. '<div class="woocommerce-address-fields"><div class="woocommerce-address-fields__field-wrapper sgs-account__addr-fields">' . $before . $rows . $after . '</div>'
			. '<div class="sgs-account__addr-actions">'
			. '<button type="submit" class="button sgs-account__addr-save" name="save_address" value="' . esc_attr( $text( 'addressSaveLabel', __( 'Save address', 'woocommerce' ) ) ) . '">' . esc_html( $text( 'addressSaveLabel', __( 'Save address', 'woocommerce' ) ) ) . '</button>' // phpcs:ignore WordPress.WP.I18n.TextDomainMismatch -- WooCommerce's own text.
			. '<a class="sgs-account__addr-cancel" href="' . esc_url( $list_url ) . '" data-sgs-addr-cancel>' . esc_html( $text( 'addressCancelLabel', __( 'Cancel', 'sgs-blocks' ) ) ) . '</a>'
			. '</div>'
			. '<input type="hidden" name="woocommerce-edit-address-nonce" value="' . esc_attr( wp_create_nonce( 'woocommerce-edit_address' ) ) . '" />'
			. '<input type="hidden" name="action" value="edit_address" />'
			. '</div></form></div>';
	}
}

if ( ! function_exists( 'sgs_account_addresses_html' ) ) {
	/**
	 * The whole Addresses view: a card per address type, in WooCommerce's own list order with delivery first.
	 *
	 * @param array  $attributes  Block attributes.
	 * @param string $open        The type whose form starts open ('' for none).
	 * @param array  $open_fields WooCommerce's fields for the open type (with values), or empty to build them.
	 * @return string
	 */
	function sgs_account_addresses_html( array $attributes, string $open = '', array $open_fields = array() ): string {
		$cards = '';
		foreach ( sgs_account_address_types() as $type ) {
			$cards .= sgs_account_address_card_html( $type, $attributes, $type === $open, $type === $open ? $open_fields : array() );
		}
		return '<div class="sgs-account__addresses">' . $cards . '</div>';
	}
}
