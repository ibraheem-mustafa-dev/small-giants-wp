<?php
/**
 * Registers the gift-card product type and its product-editor panel
 * (Spec 27, FR-27-GC1).
 *
 * Staff create a gift card the normal way: Products > Add New, product type
 * "Gift card". The Gift card tab holds the fixed amounts (comma separated, in
 * pounds) and the optional custom amount range. Saving also writes the lowest
 * amount as the product's price so shop listings and the zero-price guard see a
 * real price; the price a shopper actually pays is resolved at add-to-cart.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Product-type registration and the admin panel.
 */
final class Gift_Card_Product_Type {

	/** Product type slug (same as {@see Gift_Card_Product::TYPE}, kept here so it is readable before WooCommerce loads). */
	const TYPE = 'sgs_gift_card';

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_filter( 'product_type_selector', array( __CLASS__, 'add_to_selector' ) );
		\add_filter( 'woocommerce_product_class', array( __CLASS__, 'product_class' ), 10, 2 );
		\add_filter( 'woocommerce_product_data_tabs', array( __CLASS__, 'add_tab' ) );
		\add_action( 'woocommerce_product_data_panels', array( __CLASS__, 'render_panel' ) );
		// Priority 20: after WooCommerce's own product-data save (priority 10), so the price written here is the last word.
		\add_action( 'woocommerce_process_product_meta', array( __CLASS__, 'save' ), 20 );
	}

	/**
	 * Whether a product is a gift card.
	 *
	 * @param mixed $product A product object or id.
	 * @return bool
	 */
	public static function is_gift_card( $product ): bool {
		if ( \is_numeric( $product ) && \function_exists( 'wc_get_product' ) ) {
			$product = \wc_get_product( (int) $product );
		}
		return \is_object( $product ) && \method_exists( $product, 'get_type' ) && self::TYPE === $product->get_type();
	}

	/**
	 * Add "Gift card" to the product-type dropdown.
	 *
	 * @param array<string,string> $types Types.
	 * @return array<string,string>
	 */
	public static function add_to_selector( array $types ): array {
		$types[ self::TYPE ] = \__( 'Gift card', 'sgs-blocks' );
		return $types;
	}

	/**
	 * Map the type slug to its class (loaded here, after WooCommerce).
	 *
	 * @param string $class_name Class WooCommerce would use.
	 * @param string $type       Product type.
	 * @return string
	 */
	public static function product_class( $class_name, $type ): string {
		if ( self::TYPE !== $type ) {
			return (string) $class_name;
		}
		require_once __DIR__ . '/class-gift-card-product.php';
		return Gift_Card_Product::class;
	}

	/**
	 * Add the Gift card tab, shown only for this type.
	 *
	 * @param array<string,array<string,mixed>> $tabs Tabs.
	 * @return array<string,array<string,mixed>>
	 */
	public static function add_tab( array $tabs ): array {
		$tabs['sgs_gift_card'] = array(
			'label'    => \__( 'Gift card', 'sgs-blocks' ),
			'target'   => 'sgs_gift_card_data',
			'class'    => array( 'show_if_sgs_gift_card' ),
			'priority' => 11,
		);
		return $tabs;
	}

	/**
	 * Print the panel.
	 *
	 * @return void
	 */
	public static function render_panel(): void {
		global $post;
		$product_id = $post instanceof \WP_Post ? (int) $post->ID : 0;
		$amounts    = (array) \get_post_meta( $product_id, Gift_Card_Amounts::META_AMOUNTS, true );
		$list       = \implode( ', ', \array_map( static fn( $p ) => Gift_Card_Money::decimal( (int) $p ), $amounts ) );
		$custom_on  = 'yes' === \get_post_meta( $product_id, Gift_Card_Amounts::META_CUSTOM, true );
		$custom_min = (int) \get_post_meta( $product_id, Gift_Card_Amounts::META_CUSTOM_MIN, true );
		$custom_max = (int) \get_post_meta( $product_id, Gift_Card_Amounts::META_CUSTOM_MAX, true );
		?>
		<div id="sgs_gift_card_data" class="panel woocommerce_options_panel hidden">
			<div class="options_group">
				<p class="form-field">
					<label for="sgs_gift_card_amounts"><?php \esc_html_e( 'Fixed amounts (pounds)', 'sgs-blocks' ); ?></label>
					<input type="text" id="sgs_gift_card_amounts" name="sgs_gift_card_amounts" value="<?php echo \esc_attr( $list ); ?>" placeholder="15, 25, 40" />
					<span class="description"><?php \esc_html_e( 'Separate amounts with commas. Each amount becomes its own choice on the product page and its own item in the Google feed.', 'sgs-blocks' ); ?></span>
				</p>
				<p class="form-field">
					<label for="sgs_gift_card_custom"><?php \esc_html_e( 'Allow a custom amount', 'sgs-blocks' ); ?></label>
					<input type="checkbox" id="sgs_gift_card_custom" name="sgs_gift_card_custom" value="yes" <?php \checked( $custom_on ); ?> />
					<span class="description"><?php \esc_html_e( 'Off by default. When on, the shopper may type any amount between the minimum and maximum below.', 'sgs-blocks' ); ?></span>
				</p>
				<p class="form-field">
					<label for="sgs_gift_card_custom_min"><?php \esc_html_e( 'Custom minimum (pounds)', 'sgs-blocks' ); ?></label>
					<input type="text" id="sgs_gift_card_custom_min" name="sgs_gift_card_custom_min" value="<?php echo \esc_attr( $custom_min > 0 ? Gift_Card_Money::decimal( $custom_min ) : '' ); ?>" placeholder="10" />
				</p>
				<p class="form-field">
					<label for="sgs_gift_card_custom_max"><?php \esc_html_e( 'Custom maximum (pounds)', 'sgs-blocks' ); ?></label>
					<input type="text" id="sgs_gift_card_custom_max" name="sgs_gift_card_custom_max" value="<?php echo \esc_attr( $custom_max > 0 ? Gift_Card_Money::decimal( $custom_max ) : '' ); ?>" placeholder="100" />
				</p>
			</div>
		</div>
		<?php
	}

	/**
	 * Save the panel. WooCommerce has already verified its own product-save nonce before this action.
	 *
	 * @param int $post_id Product id.
	 * @return void
	 */
	public static function save( $post_id ): void {
		$post_id = (int) $post_id;
		if ( ! \current_user_can( 'edit_product', $post_id ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- WooCommerce registers the edit_product meta capability.
			return;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- WooCommerce verifies `woocommerce_meta_nonce` before firing woocommerce_process_product_meta.
		if ( ! isset( $_POST['product-type'] ) || self::TYPE !== \sanitize_key( \wp_unslash( $_POST['product-type'] ) ) ) {
			return;
		}

		// phpcs:disable WordPress.Security.NonceVerification.Missing -- see above.
		$amounts    = Gift_Card_Amounts::parse_list( isset( $_POST['sgs_gift_card_amounts'] ) ? \sanitize_text_field( \wp_unslash( $_POST['sgs_gift_card_amounts'] ) ) : '' );
		$custom_on  = isset( $_POST['sgs_gift_card_custom'] ) && 'yes' === \sanitize_text_field( \wp_unslash( $_POST['sgs_gift_card_custom'] ) );
		$custom_min = Gift_Card_Money::to_pence( isset( $_POST['sgs_gift_card_custom_min'] ) ? \sanitize_text_field( \wp_unslash( $_POST['sgs_gift_card_custom_min'] ) ) : '' ) ?? 0;
		$custom_max = Gift_Card_Money::to_pence( isset( $_POST['sgs_gift_card_custom_max'] ) ? \sanitize_text_field( \wp_unslash( $_POST['sgs_gift_card_custom_max'] ) ) : '' ) ?? 0;
		// phpcs:enable

		$config = Gift_Card_Amounts::config( $amounts, $custom_on, $custom_min, $custom_max );

		$product = \wc_get_product( $post_id );
		if ( ! $product ) {
			return;
		}
		$product->update_meta_data( Gift_Card_Amounts::META_AMOUNTS, $config['amounts'] );
		$product->update_meta_data( Gift_Card_Amounts::META_CUSTOM, $config['custom_enabled'] ? 'yes' : 'no' );
		$product->update_meta_data( Gift_Card_Amounts::META_CUSTOM_MIN, $config['custom_min'] );
		$product->update_meta_data( Gift_Card_Amounts::META_CUSTOM_MAX, $config['custom_max'] );

		$floor = array() !== $config['amounts'] ? \min( $config['amounts'] ) : ( $config['custom_enabled'] ? $config['custom_min'] : 0 );
		$price = $floor > 0 ? Gift_Card_Money::decimal( $floor ) : '';
		$product->set_regular_price( $price );
		$product->set_price( $price );
		$product->set_virtual( true );
		$product->set_sold_individually( true );
		$product->save();
	}
}
