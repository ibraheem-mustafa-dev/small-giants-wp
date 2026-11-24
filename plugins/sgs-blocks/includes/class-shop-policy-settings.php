<?php
/**
 * Settings > SGS shop policies: what the shop tells Google about returns and delivery.
 *
 * Three site options, none with a default, all read by {@see Product_Offer_Policy} when the structured data prints:
 *
 * - `sgs_configurator_returns`: the shop's `MerchantReturnPolicy` as a schema.org object. The form writes the keys
 *   it shows (`returnPolicyCategory`, `applicableCountry`, `merchantReturnDays`, `returnMethod`, `returnFees`) and
 *   keeps any other key already stored (one set through WP-CLI). A choice of "no policy" stores nothing. A stored
 *   policy the form cannot show (a list of several policies, or a category outside the three it offers) is printed
 *   read-only and survives every save unless the operator picks a category, which replaces it.
 * - `sgs_shipping_from_woocommerce`: `1` when the shop publishes the shipping zones and methods WooCommerce holds
 *   ({@see Product_Shipping_Woo}).
 * - `sgs_shipping_delivery_time`: whole days for handling (baking, packing) and transit, which WooCommerce does not
 *   hold. A blank field prints nothing.
 *
 * The values are the site's to set: a policy is a promise to shoppers and a claim to Google, so the framework never
 * guesses one.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-product-shipping-woo.php';

/**
 * Class Shop_Policy_Settings
 */
final class Shop_Policy_Settings {

	/** Settings page slug. */
	const PAGE_SLUG = 'sgs-shop-policies';

	/** Settings group (the nonce and allow-list name `settings_fields()` prints). */
	const GROUP_KEY = 'sgs_shop_policies';

	/**
	 * The return policy categories Google accepts, by schema.org URL.
	 *
	 * @return array<string,string>
	 */
	private static function categories(): array {
		return array(
			'https://schema.org/MerchantReturnNotPermitted'     => \__( 'Returns are not permitted (made to order, food)', 'sgs-blocks' ),
			'https://schema.org/MerchantReturnFiniteReturnWindow' => \__( 'Returns within a number of days', 'sgs-blocks' ),
			'https://schema.org/MerchantReturnUnlimitedWindow'  => \__( 'Returns at any time', 'sgs-blocks' ),
		);
	}

	/**
	 * The return methods Google accepts.
	 *
	 * @return array<string,string>
	 */
	private static function methods(): array {
		return array(
			'https://schema.org/ReturnByMail'  => \__( 'By post', 'sgs-blocks' ),
			'https://schema.org/ReturnInStore' => \__( 'In a shop', 'sgs-blocks' ),
			'https://schema.org/ReturnAtKiosk' => \__( 'At a kiosk or drop-off point', 'sgs-blocks' ),
		);
	}

	/**
	 * The return fee choices that need no further amount.
	 *
	 * @return array<string,string>
	 */
	private static function fees(): array {
		return array(
			'https://schema.org/FreeReturn'          => \__( 'Free return', 'sgs-blocks' ),
			'https://schema.org/OriginalShippingFees' => \__( 'Customer pays the original shipping cost', 'sgs-blocks' ),
		);
	}

	/**
	 * Wire the menu page and the settings.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'admin_menu', array( __CLASS__, 'add_menu_page' ) );
		\add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
	}

	/**
	 * Add Settings > SGS shop policies (administrators only).
	 *
	 * @return void
	 */
	public static function add_menu_page(): void {
		\add_options_page(
			\__( 'SGS shop policies', 'sgs-blocks' ),
			\__( 'SGS shop policies', 'sgs-blocks' ),
			'manage_options',
			self::PAGE_SLUG,
			array( __CLASS__, 'render_page' )
		);
	}

	/**
	 * Register the three options with their sanitisers.
	 *
	 * @return void
	 */
	public static function register_settings(): void {
		\register_setting(
			self::GROUP_KEY,
			'sgs_configurator_returns',
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitise_returns' ),
			)
		);
		\register_setting(
			self::GROUP_KEY,
			'sgs_shipping_from_woocommerce',
			array(
				'type'              => 'string',
				'sanitize_callback' => array( __CLASS__, 'sanitise_flag' ),
			)
		);
		\register_setting(
			self::GROUP_KEY,
			'sgs_shipping_delivery_time',
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitise_delivery_time' ),
			)
		);
	}

	/**
	 * Turn the submitted return fields into the stored `MerchantReturnPolicy` object.
	 *
	 * Returns an empty array for "no policy". A policy missing what Google requires (the country, and the days for a
	 * finite window) is refused with a message and the stored value is kept.
	 *
	 * @param mixed $value Submitted fields, or a stored object being saved again.
	 * @return array<string,mixed>
	 */
	public static function sanitise_returns( $value ): array {
		$value    = \is_array( $value ) ? $value : array();
		$stored   = \get_option( 'sgs_configurator_returns', array() );
		$stored   = \is_array( $stored ) ? $stored : array();
		$category = (string) ( $value['returnPolicyCategory'] ?? '' );
		if ( ! isset( self::categories()[ $category ] ) ) {
			// A policy the form cannot show was never offered for editing, so a save that picks nothing keeps it.
			return self::form_can_show( $stored ) ? array() : $stored;
		}

		$country = \strtoupper( \trim( (string) ( $value['applicableCountry'] ?? '' ) ) );
		if ( ! \preg_match( '/^[A-Z]{2}$/', $country ) ) {
			\add_settings_error( 'sgs_configurator_returns', 'sgs_returns_country', \__( 'Returns policy not saved: add the two-letter country it applies to, for example GB.', 'sgs-blocks' ) );
			return $stored;
		}

		$policy = array(
			'@type'                => 'MerchantReturnPolicy',
			'applicableCountry'    => $country,
			'returnPolicyCategory' => $category,
		);
		if ( 'https://schema.org/MerchantReturnFiniteReturnWindow' === $category ) {
			$days = (int) ( $value['merchantReturnDays'] ?? 0 );
			if ( $days < 1 ) {
				\add_settings_error( 'sgs_configurator_returns', 'sgs_returns_days', \__( 'Returns policy not saved: add the number of days shoppers have to return an order.', 'sgs-blocks' ) );
				return $stored;
			}
			$policy['merchantReturnDays'] = $days;
		}
		if ( 'https://schema.org/MerchantReturnNotPermitted' !== $category ) {
			$method = (string) ( $value['returnMethod'] ?? '' );
			if ( isset( self::methods()[ $method ] ) ) {
				$policy['returnMethod'] = $method;
			}
			$fees = (string) ( $value['returnFees'] ?? '' );
			if ( isset( self::fees()[ $fees ] ) ) {
				$policy['returnFees'] = $fees;
			}
		}

		// A key the form does not show (set by WP-CLI) stays as stored; a submitted key the form does not show is dropped.
		$shown = array( '@type', 'applicableCountry', 'returnPolicyCategory', 'merchantReturnDays', 'returnMethod', 'returnFees' );
		// A list's numeric keys are policies, not keys of this one, so they are never copied in.
		$extra = \array_filter( \array_diff_key( $stored, \array_flip( $shown ) ), 'is_string', ARRAY_FILTER_USE_KEY );
		unset( $extra['returnPolicyCountry'] );
		return $policy + $extra;
	}

	/**
	 * Whether the Returns fields can display and re-save the stored policy: none stored, or one policy whose category is
	 * one of the three the form offers. A list of several policies, or a category outside the three, cannot be shown.
	 *
	 * @param array<mixed> $stored The stored `sgs_configurator_returns`.
	 * @return bool
	 */
	private static function form_can_show( array $stored ): bool {
		if ( empty( $stored ) ) {
			return true;
		}
		foreach ( \array_keys( $stored ) as $key ) {
			if ( \is_int( $key ) ) {
				return false;
			}
		}
		return isset( self::categories()[ (string) ( $stored['returnPolicyCategory'] ?? '' ) ] );
	}

	/**
	 * Whole days for handling and transit; a blank or non-numeric field is dropped, a reversed range is turned round.
	 *
	 * @param mixed $value Submitted `handlingMin`, `handlingMax`, `transitMin` and `transitMax`.
	 * @return array<string,int>
	 */
	public static function sanitise_delivery_time( $value ): array {
		$value = \is_array( $value ) ? $value : array();
		$out   = array();
		foreach ( array( 'handling', 'transit' ) as $kind ) {
			$pair = array();
			foreach ( array( 'Min', 'Max' ) as $end ) {
				$raw = $value[ $kind . $end ] ?? '';
				if ( ( \is_int( $raw ) || \is_string( $raw ) ) && \preg_match( '/^\d{1,3}$/', \trim( (string) $raw ) ) ) {
					$pair[ $end ] = (int) $raw;
				}
			}
			if ( isset( $pair['Min'], $pair['Max'] ) && $pair['Min'] > $pair['Max'] ) {
				$pair = array(
					'Min' => $pair['Max'],
					'Max' => $pair['Min'],
				);
			}
			foreach ( $pair as $end => $days ) {
				$out[ $kind . $end ] = $days;
			}
		}
		return $out;
	}

	/**
	 * A checkbox as `1` or nothing.
	 *
	 * @param mixed $value Submitted value.
	 * @return string
	 */
	public static function sanitise_flag( $value ): string {
		return ( \is_scalar( $value ) && ! \in_array( \strtolower( (string) $value ), array( '', '0', 'false', 'no' ), true ) ) ? '1' : '';
	}

	/**
	 * Print the settings page.
	 *
	 * @return void
	 */
	public static function render_page(): void {
		if ( ! \current_user_can( 'manage_options' ) ) {
			return;
		}
		$returns = \get_option( 'sgs_configurator_returns', array() );
		$returns = \is_array( $returns ) ? $returns : array();
		$times   = \get_option( 'sgs_shipping_delivery_time', array() );
		$times   = \is_array( $times ) ? $times : array();

		echo '<div class="wrap"><h1>' . \esc_html__( 'SGS shop policies', 'sgs-blocks' ) . '</h1>';
		echo '<p>' . \esc_html__( 'What this shop tells Google about returns and delivery, printed with each product so it can show them in search. Only fill in what is true for your shop: nothing is published for a field you leave empty.', 'sgs-blocks' ) . '</p>';
		echo '<form method="post" action="options.php">';
		\settings_fields( self::GROUP_KEY );

		echo '<h2>' . \esc_html__( 'Returns', 'sgs-blocks' ) . '</h2><table class="form-table" role="presentation">';
		$can_show = self::form_can_show( $returns );
		echo '<tr><th scope="row"><label for="sgs-returns-category">' . \esc_html__( 'Returns policy', 'sgs-blocks' ) . '</label></th><td>';
		if ( ! $can_show ) {
			echo '<div class="sgs-returns-readonly"><p>' . \esc_html__( 'A returns policy was set outside this screen (more than one policy, or a type this form does not offer). It is published as it is. Saving keeps it unless you choose a policy below, which replaces it.', 'sgs-blocks' ) . '</p>';
			echo '<pre>' . \esc_html( (string) \wp_json_encode( $returns, JSON_PRETTY_PRINT | JSON_HEX_TAG | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) ) . '</pre></div>';
		}
		echo '<select id="sgs-returns-category" name="sgs_configurator_returns[returnPolicyCategory]">';
		$none = $can_show ? \__( 'No policy published', 'sgs-blocks' ) : \__( 'Keep the policy shown above', 'sgs-blocks' );
		self::options( array( '' => $none ) + self::categories(), $can_show ? (string) ( $returns['returnPolicyCategory'] ?? '' ) : '' );
		echo '</select></td></tr>';
		self::text_row( 'sgs-returns-country', 'sgs_configurator_returns[applicableCountry]', \__( 'Country it applies to', 'sgs-blocks' ), (string) ( $returns['applicableCountry'] ?? '' ), \__( 'Two letters, for example GB. Required with a policy.', 'sgs-blocks' ), 'text', 2 );
		self::text_row( 'sgs-returns-days', 'sgs_configurator_returns[merchantReturnDays]', \__( 'Days to return', 'sgs-blocks' ), isset( $returns['merchantReturnDays'] ) ? (string) $returns['merchantReturnDays'] : '', \__( 'Only for "within a number of days".', 'sgs-blocks' ), 'number', 3 );
		echo '<tr><th scope="row"><label for="sgs-returns-method">' . \esc_html__( 'How shoppers return', 'sgs-blocks' ) . '</label></th><td><select id="sgs-returns-method" name="sgs_configurator_returns[returnMethod]">';
		self::options( array( '' => \__( 'Not stated', 'sgs-blocks' ) ) + self::methods(), (string) ( $returns['returnMethod'] ?? '' ) );
		echo '</select></td></tr>';
		echo '<tr><th scope="row"><label for="sgs-returns-fees">' . \esc_html__( 'Return cost', 'sgs-blocks' ) . '</label></th><td><select id="sgs-returns-fees" name="sgs_configurator_returns[returnFees]">';
		self::options( array( '' => \__( 'Not stated', 'sgs-blocks' ) ) + self::fees(), (string) ( $returns['returnFees'] ?? '' ) );
		echo '</select></td></tr></table>';

		echo '<h2>' . \esc_html__( 'Delivery', 'sgs-blocks' ) . '</h2><table class="form-table" role="presentation">';
		echo '<tr><th scope="row">' . \esc_html__( 'Shipping costs', 'sgs-blocks' ) . '</th><td><label><input type="checkbox" name="sgs_shipping_from_woocommerce" value="1"' . ( Product_Shipping_Woo::enabled() ? ' checked' : '' ) . '> ' . \esc_html__( 'Publish the delivery methods and prices set in WooCommerce > Settings > Shipping', 'sgs-blocks' ) . '</label>';
		echo '<p class="description">' . \esc_html__( 'Flat rates with a plain price (including the extra cost of a shipping class) and free shipping (always, or over a minimum order) are published, for zones with a country, state or continent. Other methods are left out.', 'sgs-blocks' ) . '</p>';
		self::preview();
		echo '</td></tr>';
		foreach ( array(
			'handling' => \__( 'Preparation time (days)', 'sgs-blocks' ),
			'transit'  => \__( 'Delivery time after posting (days)', 'sgs-blocks' ),
		) as $kind => $label ) {
			echo '<tr><th scope="row">' . \esc_html( $label ) . '</th><td>';
			foreach ( array( 'Min', 'Max' ) as $end ) {
				$id = 'sgs-delivery-' . $kind . '-' . \strtolower( $end );
				echo '<label for="' . \esc_attr( $id ) . '">' . \esc_html( 'Min' === $end ? \__( 'From', 'sgs-blocks' ) : \__( 'to', 'sgs-blocks' ) ) . '</label> ';
				echo '<input type="number" min="0" max="365" class="small-text" id="' . \esc_attr( $id ) . '" name="sgs_shipping_delivery_time[' . \esc_attr( $kind . $end ) . ']" value="' . \esc_attr( (string) ( $times[ $kind . $end ] ?? '' ) ) . '"> ';
			}
			echo '<p class="description">' . \esc_html__( 'Leave both empty to publish no time. Used with the WooCommerce shipping above.', 'sgs-blocks' ) . '</p></td></tr>';
		}
		echo '</table>';
		\submit_button();
		echo '</form></div>';
	}

	/**
	 * What WooCommerce's settings would publish today, so the shop sees it before it ticks the box.
	 *
	 * @return void
	 */
	private static function preview(): void {
		$services = Product_Shipping_Woo::services();
		if ( empty( $services ) ) {
			echo '<p class="description">' . \esc_html__( 'WooCommerce holds no delivery method this can publish yet.', 'sgs-blocks' ) . '</p>';
			return;
		}
		echo '<ul>';
		foreach ( $services as $service ) {
			$conditions = (array) $service['shippingConditions'];
			$rate       = (string) ( $conditions['shippingRate']['value'] ?? '' ) . ' ' . (string) ( $conditions['shippingRate']['currency'] ?? '' );
			$minimum    = isset( $conditions['orderValue']['minValue'] ) ? ' / ' . \sprintf( /* translators: %s: minimum order amount. */ \__( 'orders from %s', 'sgs-blocks' ), (string) $conditions['orderValue']['minValue'] ) : '';
			echo '<li>' . \esc_html( (string) $service['name'] . ': ' . $rate . $minimum ) . '</li>';
		}
		echo '</ul>';
		$classes = Product_Shipping_Woo::class_differences();
		if ( ! empty( $classes ) ) {
			echo '<p class="description">' . \esc_html__( 'These prices are for products with no shipping class. A product in a shipping class below is published with the prices of its own class:', 'sgs-blocks' ) . '</p><ul>';
			foreach ( $classes as $name => $prices ) {
				echo '<li>' . \esc_html( (string) $name . ': ' . $prices ) . '</li>';
			}
			echo '</ul>';
		}
	}

	/**
	 * Print `<option>` elements with one selected.
	 *
	 * @param array<string,string> $choices  Value to label.
	 * @param string               $selected The selected value.
	 * @return void
	 */
	private static function options( array $choices, string $selected ): void {
		foreach ( $choices as $value => $label ) {
			echo '<option value="' . \esc_attr( (string) $value ) . '"' . ( (string) $value === $selected ? ' selected' : '' ) . '>' . \esc_html( $label ) . '</option>';
		}
	}

	/**
	 * Print one text or number row.
	 *
	 * @param string $id          Input id.
	 * @param string $name        Input name.
	 * @param string $label       Row label.
	 * @param string $value       Current value.
	 * @param string $description Help text.
	 * @param string $type        Input type.
	 * @param int    $length      Maximum characters.
	 * @return void
	 */
	private static function text_row( string $id, string $name, string $label, string $value, string $description, string $type, int $length ): void {
		echo '<tr><th scope="row"><label for="' . \esc_attr( $id ) . '">' . \esc_html( $label ) . '</label></th><td>';
		echo '<input type="' . \esc_attr( $type ) . '" class="small-text" id="' . \esc_attr( $id ) . '" name="' . \esc_attr( $name ) . '" value="' . \esc_attr( $value ) . '" maxlength="' . (int) $length . '">';
		echo '<p class="description">' . \esc_html( $description ) . '</p></td></tr>';
	}
}
