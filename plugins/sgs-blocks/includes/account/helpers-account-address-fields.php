<?php
/**
 * Address fields for sgs/account's address view (addressEditor on). The fields come from WooCommerce
 * (`WC()->countries->get_address_fields()` with the customer's saved values), so locale rules, required flags, country
 * and state selects and fields added by other plugins all hold; only the markup is SGS's.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_account_address_types' ) ) {
	/**
	 * The address types shown, in display order (delivery first), as WooCommerce's own address list decides them.
	 *
	 * @return string[] Address types: 'shipping' and/or 'billing'.
	 */
	function sgs_account_address_types(): array {
		$both  = function_exists( 'wc_shipping_enabled' ) && wc_shipping_enabled() && function_exists( 'wc_ship_to_billing_address_only' ) && ! wc_ship_to_billing_address_only();
		$types = $both ? array(
			'shipping' => '',
			'billing'  => '',
		) : array( 'billing' => '' );
		$types = apply_filters( 'woocommerce_my_account_get_addresses', $types, get_current_user_id() ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WooCommerce's own hook.
		return is_array( $types ) ? array_values( array_map( 'sanitize_key', array_keys( $types ) ) ) : array();
	}
}

if ( ! function_exists( 'sgs_account_address_title' ) ) {
	/**
	 * The card title: the block's wording for the type, else WooCommerce's own.
	 *
	 * @param string $type Address type.
	 * @return string
	 */
	function sgs_account_address_title( string $type ): string {
		if ( 'shipping' === $type ) {
			return \SGS\Blocks\Account_Strings::text( 'shippingAddress', __( 'Shipping address', 'woocommerce' ) ); // phpcs:ignore WordPress.WP.I18n.TextDomainMismatch -- WooCommerce's own text.
		}
		if ( 'billing' === $type ) {
			return \SGS\Blocks\Account_Strings::text( 'billingAddress', __( 'Billing address', 'woocommerce' ) ); // phpcs:ignore WordPress.WP.I18n.TextDomainMismatch -- WooCommerce's own text.
		}
		return ucfirst( $type );
	}
}

if ( ! function_exists( 'sgs_account_address_fields' ) ) {
	/**
	 * One type's fields with the customer's saved value on each, built as WooCommerce's own edit-address screen builds them.
	 *
	 * @param string $type Address type.
	 * @return array<string,array<string,mixed>> Field key => field definition (with 'value').
	 */
	function sgs_account_address_fields( string $type ): array {
		$user_id   = get_current_user_id();
		$countries = WC()->countries;
		$country   = (string) get_user_meta( $user_id, $type . '_country', true );
		if ( '' === $country ) {
			$country = (string) $countries->get_base_country();
		}
		$allowed = 'shipping' === $type ? $countries->get_shipping_countries() : $countries->get_allowed_countries();
		if ( is_array( $allowed ) && array() !== $allowed && ! array_key_exists( $country, $allowed ) ) {
			$country = (string) key( $allowed );
		}
		$fields = $countries->get_address_fields( $country, $type . '_' );
		foreach ( $fields as $key => $field ) {
			$value = get_user_meta( $user_id, $key, true );
			if ( ! $value && ( 'billing_email' === $key || 'shipping_email' === $key ) ) {
				$value = wp_get_current_user()->user_email;
			}
			$fields[ $key ]['value'] = apply_filters( 'woocommerce_my_account_edit_address_field_value', $value, $key, $type ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WooCommerce's own hook.
		}
		return $fields;
	}
}

if ( ! function_exists( 'sgs_account_address_list_attr' ) ) {
	/**
	 * A comma-separated field list setting as clean field-name suffixes (for example city, postcode).
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $name       Attribute name.
	 * @return string[]
	 */
	function sgs_account_address_list_attr( array $attributes, string $name ): array {
		$out = array();
		foreach ( explode( ',', (string) ( $attributes[ $name ] ?? '' ) ) as $part ) {
			$part = sanitize_key( trim( $part ) );
			if ( '' !== $part ) {
				$out[] = $part;
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_account_address_options_html' ) ) {
	/**
	 * Option tags for a select.
	 *
	 * @param array  $options  Value => label.
	 * @param string $selected Selected value.
	 * @param string $blank    Label of a leading empty option, '' for none.
	 * @return string
	 */
	function sgs_account_address_options_html( array $options, string $selected, string $blank = '' ): string {
		$html = '' === $blank ? '' : '<option value="">' . esc_html( $blank ) . '</option>';
		foreach ( $options as $value => $label ) {
			$html .= '<option value="' . esc_attr( (string) $value ) . '"' . ( (string) $value === $selected ? ' selected' : '' ) . '>' . esc_html( (string) $label ) . '</option>';
		}
		return $html;
	}
}

if ( ! function_exists( 'sgs_account_address_field_html' ) ) {
	/**
	 * One field's row: a visually hidden label and the control, whose placeholder reads as the label. A field the
	 * `addressHideFields` setting names, a required one included, prints as a hidden input that keeps its saved value
	 * (the account email for the billing email), so saving neither clears it nor fails WooCommerce's required check. A single-country site's country prints the same way.
	 *
	 * @param string $type       Address type.
	 * @param string $key        Field key (for example shipping_city).
	 * @param array  $field      WooCommerce's field definition, 'value' included.
	 * @param array  $attributes Block attributes.
	 * @param string $country    The country the form is showing.
	 * @return string
	 */
	function sgs_account_address_field_html( string $type, string $key, array $field, array $attributes, string $country ): string {
		$suffix   = substr( $key, strlen( $type ) + 1 );
		$value    = (string) wc_get_post_data_by_key( $key, (string) ( $field['value'] ?? '' ) );
		$kind     = (string) ( $field['type'] ?? 'text' );
		$label    = wp_strip_all_tags( (string) ( $field['label'] ?? '' ) );
		$required = ! empty( $field['required'] );
		$hold     = 'address_2' === $suffix ? trim( (string) ( $attributes['addressLine2Label'] ?? '' ) ) : '';
		$hold     = '' !== $hold ? $hold : $label;
		$id       = esc_attr( $key );
		$hidden   = '<input type="hidden" name="' . $id . '" id="' . $id . '" value="' . esc_attr( $value ) . '" />';

		if ( in_array( $suffix, sgs_account_address_list_attr( $attributes, 'addressHideFields' ), true ) ) {
			return $hidden;
		}

		if ( 'country' === $kind ) {
			$countries = 'shipping' === $type ? WC()->countries->get_shipping_countries() : WC()->countries->get_allowed_countries();
			$countries = is_array( $countries ) ? $countries : array();
			if ( count( $countries ) <= 1 ) {
				return '<input type="hidden" name="' . $id . '" id="' . $id . '" value="' . esc_attr( '' !== $value ? $value : (string) key( $countries ) ) . '" />';
			}
			$control = '<select name="' . $id . '" id="' . $id . '" class="country_to_state country_select" autocomplete="' . esc_attr( (string) ( $field['autocomplete'] ?? 'country' ) ) . '" required>'
				. sgs_account_address_options_html( $countries, $value, $label ) . '</select>';
		} elseif ( 'state' === $kind ) {
			$states  = WC()->countries->get_states( $country );
			$control = is_array( $states ) && array() !== $states
				? '<select name="' . $id . '" id="' . $id . '" class="state_select" autocomplete="address-level1">' . sgs_account_address_options_html( $states, $value, $label ) . '</select>'
				: '<input type="text" class="input-text" name="' . $id . '" id="' . $id . '" value="' . esc_attr( $value ) . '" placeholder="' . esc_attr( $hold ) . '" autocomplete="address-level1" />';
		} elseif ( 'select' === $kind ) {
			$control = '<select name="' . $id . '" id="' . $id . '"' . ( $required ? ' required' : '' ) . '>' . sgs_account_address_options_html( (array) ( $field['options'] ?? array() ), $value ) . '</select>';
		} elseif ( 'textarea' === $kind ) {
			$control = '<textarea name="' . $id . '" id="' . $id . '" class="input-text" rows="3" placeholder="' . esc_attr( $hold ) . '"' . ( $required ? ' required' : '' ) . '>' . esc_textarea( $value ) . '</textarea>';
		} elseif ( 'checkbox' === $kind ) {
			return '<p class="form-row sgs-account__addr-row sgs-account__addr-row--full" id="' . $id . '_field"><label class="sgs-account__addr-check"><input type="checkbox" name="' . $id . '" id="' . $id . '" value="1"' . ( '' !== $value && '0' !== $value ? ' checked' : '' ) . ' /> ' . esc_html( $label ) . '</label></p>';
		} else {
			$type_attr = in_array( $kind, array( 'tel', 'email', 'number', 'url' ), true ) ? $kind : 'text';
			$control   = '<input type="' . esc_attr( $type_attr ) . '" class="input-text" name="' . $id . '" id="' . $id . '" value="' . esc_attr( $value ) . '" placeholder="' . esc_attr( $hold ) . '"'
				. ( '' !== (string) ( $field['autocomplete'] ?? '' ) ? ' autocomplete="' . esc_attr( (string) $field['autocomplete'] ) . '"' : '' )
				. ( $required ? ' required' : '' ) . ' />';
		}

		$half = in_array( $suffix, sgs_account_address_list_attr( $attributes, 'addressPairs' ), true )
			|| array() !== array_intersect( (array) ( $field['class'] ?? array() ), array( 'form-row-first', 'form-row-last' ) );
		return '<p class="form-row sgs-account__addr-row sgs-account__addr-row--' . ( $half ? 'half' : 'full' ) . '" id="' . $id . '_field">'
			. '<label for="' . $id . '" class="sgs-account__sr">' . esc_html( $hold ) . '</label>' . $control . '</p>';
	}
}
