<?php
/**
 * The Attributes-tab panel for the buy box "Pick a set" mode, in the owner's own words.
 *
 * One block under each attribute row on the product screen. A variation attribute gets one plain line (shoppers pick
 * exactly one); a non-variation attribute gets the pick-several controls. Both blocks are in the row and a small script
 * shows the one that matches the "Used for variations" box. The flags are stored on the product only
 * (`_sgs_attribute_flags`, Configurator_Groups::FLAGS_META) and written when the product is updated.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Configurator_Picks_Admin
 */
final class Configurator_Picks_Admin {

	/** Posted field holding the per-row flags. */
	const FIELD = 'sgs_attr_flags';

	/** Wire the hooks. */
	public static function register(): void {
		add_action( 'woocommerce_after_product_attribute_settings', array( __CLASS__, 'render_row' ), 10, 2 );
		add_action( 'woocommerce_admin_process_product_object', array( __CLASS__, 'save' ), 20 );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
	}

	/**
	 * Load the show-and-hide script on the product edit screen.
	 *
	 * @param string $hook Admin page hook.
	 */
	public static function enqueue( $hook ): void {
		if ( ! \in_array( $hook, array( 'post.php', 'post-new.php' ), true ) || 'product' !== \get_post_type() ) {
			return;
		}
		$file = SGS_BLOCKS_PATH . 'assets/admin/configurator-attribute-flags.js';
		if ( ! \is_readable( $file ) ) {
			return;
		}
		$css = SGS_BLOCKS_PATH . 'assets/admin/configurator-attribute-flags.css';
		if ( \is_readable( $css ) ) {
			\wp_enqueue_style( 'sgs-configurator-attribute-flags', SGS_BLOCKS_URL . 'assets/admin/configurator-attribute-flags.css', array(), (string) \filemtime( $css ) );
		}
		\wp_enqueue_script( 'sgs-configurator-attribute-flags', SGS_BLOCKS_URL . 'assets/admin/configurator-attribute-flags.js', array(), (string) \filemtime( $file ), true );
	}

	/**
	 * The product being edited (also during WooCommerce's add-attribute AJAX call).
	 *
	 * @return int
	 */
	private static function current_product_id(): int {
		if ( isset( $GLOBALS['post']->ID ) ) {
			return (int) $GLOBALS['post']->ID;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- read-only, only picks which product the panel describes.
		return isset( $_POST['post_id'] ) ? absint( wp_unslash( $_POST['post_id'] ) ) : 0;
	}

	/**
	 * Render the panel under one attribute row.
	 *
	 * @param \WC_Product_Attribute $attribute The attribute.
	 * @param int                   $i         Row index.
	 */
	public static function render_row( $attribute, $i ): void {
		if ( ! $attribute instanceof \WC_Product_Attribute ) {
			return;
		}
		$name       = (string) $attribute->get_name();
		$key        = Configurator_Groups::attribute_key( $name );
		$product_id = self::current_product_id();
		$stored     = $product_id > 0 ? Configurator_Groups::flags_for_product( $product_id ) : array();
		$flags      = $stored[ $key ] ?? array();
		$field      = self::FIELD . '[' . (int) $i . ']';
		$options    = self::option_choices( $attribute );
		$is_pack    = $product_id > 0 && sanitize_key( (string) get_post_meta( $product_id, '_sgs_pack_size_axis', true ) ) === $key;

		echo '<div class="sgs-attr-flags" data-sgs-attr-flags>';

		// Variation attribute: one plain line.
		echo '<div class="sgs-attr-flags__priced" data-sgs-attr-flags-priced' . ( $attribute->get_variation() ? '' : ' hidden' ) . '>';
		echo '<p class="description">' . esc_html__( "This attribute makes variations, so shoppers pick exactly one. To allow several, untick 'Used for variations'.", 'sgs-blocks' ) . '</p>';
		if ( $is_pack ) {
			echo '<p class="description">' . esc_html( self::pack_readback( $product_id ) ) . '</p>';
		}
		echo '</div>';

		// Non-variation attribute: the pick-several controls.
		echo '<div class="sgs-attr-flags__answer" data-sgs-attr-flags-answer' . ( $attribute->get_variation() ? ' hidden' : '' ) . '>';
		echo '<p><label><input type="checkbox" name="' . \esc_attr( $field ) . '[multi]" value="1"' . \checked( ! empty( $flags['multi'] ), true, false ) . ' /> ' . esc_html__( 'Shopper can pick more than one', 'sgs-blocks' ) . '</label></p>';
		echo '<p><label>' . esc_html__( 'At least', 'sgs-blocks' ) . ' <input type="number" min="1" max="12" step="1" class="sgs-attr-flags__count" name="' . \esc_attr( $field ) . '[least]" value="' . \esc_attr( (string) ( $flags['least'] ?? 1 ) ) . '" /></label> ';
		echo '<label>' . esc_html__( 'No more than', 'sgs-blocks' ) . ' <input type="number" min="2" max="12" step="1" class="sgs-attr-flags__count" name="' . \esc_attr( $field ) . '[most]" value="' . \esc_attr( (string) ( $flags['most'] ?? 3 ) ) . '" /></label></p>';
		echo '<p><label>' . esc_html__( 'If they pick one too many', 'sgs-blocks' ) . ' <select name="' . \esc_attr( $field ) . '[overflow]">';
		echo '<option value="refuse"' . \selected( $flags['overflow'] ?? 'refuse', 'refuse', false ) . '>' . esc_html__( 'Tell them', 'sgs-blocks' ) . '</option>';
		echo '<option value="replace"' . \selected( $flags['overflow'] ?? '', 'replace', false ) . '>' . esc_html__( 'Swap out the oldest pick', 'sgs-blocks' ) . '</option>';
		echo '</select></label></p>';
		echo '<p><label>' . esc_html__( 'Start with', 'sgs-blocks' ) . ' <select name="' . \esc_attr( $field ) . '[startWith]"><option value="">' . esc_html__( 'Nothing picked', 'sgs-blocks' ) . '</option>';
		foreach ( $options as $slug => $label ) {
			echo '<option value="' . \esc_attr( $slug ) . '"' . \selected( $flags['startWith'] ?? '', $slug, false ) . '>' . esc_html( $label ) . '</option>';
		}
		echo '</select></label></p>';
		$share = sgs_picks_share_mode( $flags['share'] ?? 'none' );
		echo '<p><label>' . esc_html__( 'Share the pack between these', 'sgs-blocks' ) . ' <select name="' . \esc_attr( $field ) . '[share]">';
		echo '<option value="none"' . \selected( $share, 'none', false ) . '>' . esc_html__( "Don't", 'sgs-blocks' ) . '</option>';
		echo '<option value="equal"' . \selected( $share, 'equal', false ) . '>' . esc_html__( 'Equally', 'sgs-blocks' ) . '</option>';
		echo '<option value="counts"' . \selected( $share, 'counts', false ) . '>' . esc_html__( 'Shopper sets counts', 'sgs-blocks' ) . '</option>';
		echo '</select></label></p>';
		echo '<p class="description">' . esc_html__( 'Groups show on the product page in the order you drag the attributes into. Each option is not counted in stock, so an option can be oversold. Click Update to save these choices.', 'sgs-blocks' ) . '</p>';
		echo '</div>';
		echo '</div>';
	}

	/**
	 * The options an attribute offers, slug => label.
	 *
	 * @param \WC_Product_Attribute $attribute The attribute.
	 * @return array<string,string>
	 */
	private static function option_choices( \WC_Product_Attribute $attribute ): array {
		$out = array();
		foreach ( (array) $attribute->get_options() as $option ) {
			if ( $attribute->is_taxonomy() ) {
				$term = \get_term( (int) $option, (string) $attribute->get_name() );
				if ( $term instanceof \WP_Term ) {
					$out[ $term->slug ] = $term->name;
				}
				continue;
			}
			$text = \trim( (string) $option );
			if ( '' !== $text ) {
				$out[ sanitize_title( $text ) ] = $text;
			}
		}
		return $out;
	}

	/**
	 * The live read-back under the pack attribute.
	 *
	 * @param int $product_id Product ID.
	 * @return string
	 */
	private static function pack_readback( int $product_id ): string {
		$pack = Configurator_Groups::pack( $product_id, Configurator_Groups::for_product( $product_id ) );
		if ( array() !== $pack['unparseable'] ) {
			/* translators: %s: the option name that has no number in it. */
			return \sprintf( \__( "Could not read a number from '%s'. Put the number in the name, or set 'Pieces in this pack' on the option.", 'sgs-blocks' ), $pack['unparseable'][0] );
		}
		/* translators: %s: pack sizes, e.g. 8, 20, 40. */
		return \sprintf( \__( 'Pack sizes found: %s', 'sgs-blocks' ), \implode( ', ', $pack['units'] ) );
	}

	/**
	 * Flags from the posted rows: a row ticked "Used for variations" carries none.
	 *
	 * @param mixed $rows      Posted `sgs_attr_flags` (row index => fields), already unslashed.
	 * @param mixed $names     Posted `attribute_names` (row index => attribute name).
	 * @param mixed $variation Posted `attribute_variation` (row index => 1 when used for variations).
	 * @return array<string,array<string,mixed>> Sanitised flags map keyed by attribute key.
	 */
	public static function flags_from_request( $rows, $names, $variation ): array {
		if ( ! \is_array( $rows ) || ! \is_array( $names ) ) {
			return array();
		}
		$variation = \is_array( $variation ) ? $variation : array();
		$map       = array();
		foreach ( $rows as $i => $fields ) {
			$name = isset( $names[ $i ] ) ? wc_clean( (string) $names[ $i ] ) : '';
			if ( '' === $name || ! \is_array( $fields ) || ! empty( $variation[ $i ] ) ) {
				continue;
			}
			$map[ Configurator_Groups::attribute_key( $name ) ] = $fields;
		}
		return sgs_picks_sanitise_flags( $map );
	}

	/**
	 * Save the flags with the product (WooCommerce has verified the product nonce before this hook fires).
	 *
	 * @param \WC_Product $product The product being saved.
	 */
	public static function save( $product ): void {
		if ( ! $product instanceof \WC_Product || ! \current_user_can( 'edit_product', $product->get_id() ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- WooCommerce meta capability.
			return;
		}
		// phpcs:disable WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- WC verifies the product nonce; sanitised in flags_from_request().
		if ( ! isset( $_POST[ self::FIELD ] ) ) {
			return; // A save that did not come from the product screen (quick edit, REST, import) leaves the flags alone.
		}
		$flags = self::flags_from_request(
			wp_unslash( $_POST[ self::FIELD ] ),
			wp_unslash( $_POST['attribute_names'] ?? array() ),
			wp_unslash( $_POST['attribute_variation'] ?? array() )
		);
		// phpcs:enable
		if ( array() === $flags ) {
			$product->delete_meta_data( Configurator_Groups::FLAGS_META );
		} else {
			$product->update_meta_data( Configurator_Groups::FLAGS_META, $flags );
		}
	}
}
