<?php
/**
 * Cart line summary — WooCommerce cart, order and email integration.
 *
 * Where each surface gets its summary:
 *   - bag drawer / cart / checkout rows  `woocommerce_get_item_data` at 30
 *   - the purchased line                 `woocommerce_checkout_create_order_line_item` at 30
 *   - order emails, order-received,
 *     My Account, PayPal descriptions    `woocommerce_display_item_meta`
 *   - WooCommerce's OWN variation rows   `woocommerce_attribute_label` +
 *                                        `woocommerce_variation_option_name`
 *
 * The last pair is the cheapest half of this feature and the reason the cart
 * and checkout read correctly without touching WooCommerce's markup: rather
 * than add a summary and then fight to remove the raw rows, the raw rows are
 * fixed AT SOURCE. Both filters fire site-wide, so each scopes itself to the
 * one configured band axis and returns its input untouched for everything
 * else.
 *
 * Priority 30 on `woocommerce_get_item_data` runs after the add-on list (10)
 * and the flow fields (20), so this class can remove their rows rather than
 * either of them needing to know the summary exists. It IDENTIFIES AND
 * REMOVES only the row families this framework produces and never returns a
 * bare array — replacing the accumulation would silently discard a
 * third-party row the day a client installs gift-wrap or subscriptions.
 *
 * Registered only when WooCommerce is active (see load.php).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Cart_Line_Summary_Cart
 */
final class Cart_Line_Summary_Cart {

	/** Wire WooCommerce hooks. */
	public static function register(): void {
		\add_filter( 'woocommerce_get_item_data', array( __CLASS__, 'get_item_data' ), 30, 2 );
		\add_action( 'woocommerce_checkout_create_order_line_item', array( __CLASS__, 'copy_to_order_line_item' ), 30, 4 );
		\add_filter( 'woocommerce_display_item_meta', array( __CLASS__, 'display_item_meta' ), 10, 3 );
		\add_filter( 'woocommerce_attribute_label', array( __CLASS__, 'attribute_label' ), 10, 2 );
		\add_filter( 'woocommerce_variation_option_name', array( __CLASS__, 'variation_option_name' ), 10, 4 );
	}

	/**
	 * Replace this framework's own display rows with the one-line summary.
	 *
	 * Early-returns the array UNTOUCHED when the line has no summary, so a
	 * plain product on a site with no wording set behaves exactly as before.
	 *
	 * The summary's lines go through as rows with an EMPTY label. Both `key`
	 * and `name` are emitted because the two consumers disagree:
	 * wc_get_formatted_cart_item_data() reads `key` (falling back to `name`),
	 * and the bag drawer's detailsHtml() reads `attribute ?? name ?? key`.
	 * `display` is deliberately NOT set, so nothing here is ever treated as
	 * raw HTML.
	 *
	 * @param array $item_data Existing display rows.
	 * @param array $cart_item The cart item.
	 * @return array
	 */
	public static function get_item_data( array $item_data, array $cart_item ): array {
		$lines = sgs_cart_line_summary_for_cart_item( $cart_item );
		if ( empty( $lines ) ) {
			return $item_data;
		}

		$kept = array();
		foreach ( $item_data as $row ) {
			if ( ! \is_array( $row ) || ! self::row_is_ours( $row, $cart_item ) ) {
				$kept[] = $row;
			}
		}

		$summary_rows = array();
		foreach ( $lines as $line ) {
			$summary_rows[] = array(
				'key'   => '',
				'name'  => '',
				'value' => $line,
			);
		}

		return \array_merge( $summary_rows, $kept );
	}

	/**
	 * Whether one display row is a row this framework produced, and is
	 * therefore now said by the summary instead.
	 *
	 * Three families, each matched on BOTH its label and its value so a
	 * coincidentally similar third-party row survives:
	 *   - the add-on list's single "options" row (Addon_Price_List_Cart);
	 *   - one row per unpriced flow answer (Flow_Fields_Cart);
	 *   - WooCommerce's own variation rows, which only the CLASSIC path
	 *     pre-fills (the Store API passes an empty array into this filter),
	 *     and whose content the summary now carries.
	 *
	 * @param array $row       One display row.
	 * @param array $cart_item The cart item.
	 * @return bool
	 */
	private static function row_is_ours( array $row, array $cart_item ): bool {
		$label = \trim( (string) ( $row['key'] ?? $row['name'] ?? '' ) );
		$value = \trim( (string) ( $row['value'] ?? '' ) );

		// (1) The add-on list's one row.
		if ( sgs_cart_line_summary_has_addons( $cart_item ) ) {
			$addon_label = (string) \apply_filters( 'sgs_addon_cart_label', \__( 'Options', 'sgs-blocks' ) );
			$addon_value = sgs_addon_summary( (array) $cart_item[ Addon_Price_List_Cart::LINES_KEY ] );
			if ( \trim( $addon_label ) === $label && \trim( $addon_value ) === $value ) {
				return true;
			}
		}

		// (2) One row per flow answer.
		$flow_key = Flow_Fields_Cart::KEY;
		if ( ! empty( $cart_item[ $flow_key ] ) && \is_array( $cart_item[ $flow_key ] ) ) {
			foreach ( $cart_item[ $flow_key ] as $entry ) {
				if ( ! \is_array( $entry ) ) {
					continue;
				}
				if ( \trim( (string) ( $entry['label'] ?? '' ) ) === $label
					&& \trim( (string) ( $entry['value'] ?? '' ) ) === $value ) {
					return true;
				}
			}
		}

		// (3) WooCommerce's own variation rows (classic path only).
		foreach ( self::variation_row_labels( $cart_item ) as $variation_label ) {
			if ( '' !== $variation_label && $label === $variation_label ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * The shopper-facing labels WooCommerce would print for this line's own
	 * variation attributes — the labels to match a classic variation row on.
	 *
	 * @param array $cart_item The cart item.
	 * @return array<int,string>
	 */
	private static function variation_row_labels( array $cart_item ): array {
		$variation = isset( $cart_item['variation'] ) && \is_array( $cart_item['variation'] )
			? $cart_item['variation']
			: array();

		$labels = array();
		foreach ( \array_keys( $variation ) as $name ) {
			$taxonomy = \str_replace( 'attribute_', '', \urldecode( (string) $name ) );
			$labels[] = \trim( (string) \wc_attribute_label( $taxonomy ) );
		}
		return $labels;
	}

	/**
	 * Freeze the summary onto the purchased line as hidden meta.
	 *
	 * Hidden (a leading underscore), because the customer-facing renderer
	 * below prints it and the staff order screen keeps showing the add-on
	 * list's own priced per-group rows, which it still writes unchanged.
	 *
	 * @param \WC_Order_Item_Product $item          Order line item.
	 * @param string                 $cart_item_key Cart item key.
	 * @param array                  $values        Cart item values.
	 * @param \WC_Order              $order         The order.
	 */
	public static function copy_to_order_line_item( \WC_Order_Item_Product $item, string $cart_item_key, array $values, \WC_Order $order ): void {
		unset( $cart_item_key, $order );

		$lines = sgs_cart_line_summary_for_cart_item( $values );
		if ( empty( $lines ) ) {
			return;
		}

		$item->add_meta_data( SGS_CART_LINE_SUMMARY_META, $lines, true );
		$item->add_meta_data( SGS_CART_LINE_SUMMARY_KEYS_META, self::subsumed_display_keys( $values ), true );
	}

	/**
	 * The display keys this line's summary stands in for.
	 *
	 * Frozen at purchase because the cart item still has the add-on lines, the
	 * flow answers and the variation map; an order line only has the rendered
	 * result. The renderer removes exactly these rows and keeps every other
	 * one, so a third-party row survives on a summarised line.
	 *
	 * Matched on the DISPLAY key, which is what `get_formatted_meta_data()`
	 * returns and what the customer sees. For a variation row that is
	 * `wc_attribute_label()`, i.e. already through `self::attribute_label`, so
	 * a client-renamed axis ("Size" for `pa_frame-size`) matches on the same
	 * string the row will print.
	 *
	 * @param array $values Cart item values.
	 * @return array<int, string> Display keys, de-duplicated, never empty strings.
	 */
	private static function subsumed_display_keys( array $values ): array {
		$keys = self::variation_row_labels( $values );

		if ( sgs_cart_line_summary_has_addons( $values ) ) {
			// The add-on list's single "Options" row...
			$keys[] = (string) \apply_filters( 'sgs_addon_cart_label', \__( 'Options', 'sgs-blocks' ) );
			// ...and its one priced row per group, which the staff order screen
			// keeps (it reads the order line's own meta, not this filter).
			foreach ( (array) $values[ Addon_Price_List_Cart::LINES_KEY ] as $line ) {
				if ( \is_array( $line ) ) {
					$keys[] = (string) ( $line['group_label'] ?? '' );
				}
			}
		}

		$flow_key = Flow_Fields_Cart::KEY;
		if ( ! empty( $values[ $flow_key ] ) && \is_array( $values[ $flow_key ] ) ) {
			foreach ( $values[ $flow_key ] as $entry ) {
				if ( \is_array( $entry ) ) {
					$keys[] = (string) ( $entry['label'] ?? '' );
				}
			}
		}

		$keys = \array_filter( \array_map( 'trim', $keys ), static fn( $key ) => '' !== $key );

		return \array_values( \array_unique( $keys ) );
	}

	/**
	 * Customer-facing line detail: the frozen summary instead of the raw meta
	 * list.
	 *
	 * Replaces the whole rendered block for a line that carries a summary,
	 * and returns `$html` untouched for every other line — including every
	 * line of every order placed before this feature existed.
	 *
	 * The output is built from the CALLER'S OWN `$args`, never hardcoded
	 * markup, because the five callers want five different shapes: the HTML
	 * email wants `<br>`-separated rows, the plain-text email wants
	 * "\n- " rows, and PayPal wants a comma-separated single line. The
	 * label wrappers (`label_before`/`label_after`) are deliberately NOT
	 * used: a summary line has no label, which is exactly how the stray
	 * leading colon disappears.
	 *
	 * @param string         $html The rendered meta list.
	 * @param \WC_Order_Item $item The order line item.
	 * @param array          $args Rendering args (before/after/separator/...).
	 * @return string
	 */
	public static function display_item_meta( $html, $item, $args ) {
		$lines = sgs_cart_line_summary_for_order_item( $item );
		if ( empty( $lines ) ) {
			return $html;
		}

		$args         = \is_array( $args ) ? $args : array();
		$before       = (string) ( $args['before'] ?? '' );
		$after        = (string) ( $args['after'] ?? '' );
		$separator    = (string) ( $args['separator'] ?? '' );
		$label_before = (string) ( $args['label_before'] ?? '' );
		$label_after  = (string) ( $args['label_after'] ?? '' );

		$rows = array();
		foreach ( $lines as $line ) {
			// A summary line has no label, which is exactly how the stray
			// leading colon disappears.
			$rows[] = \esc_html( $line );
		}

		// A surviving third-party row is rendered exactly as WooCommerce would
		// have drawn it. Verified against the INSTALLED source rather than
		// trunk: `wc-template-functions.php::wc_display_item_meta` wraps the
		// key in the caller's label args and passes the value through
		// `wp_kses_post( make_clickable( trim( … ) ) )`, or plain
		// `wp_kses_post()` when the caller asked for `autop`.
		$autop = ! empty( $args['autop'] );
		foreach ( self::foreign_meta_rows( $item ) as $row ) {
			$value  = $autop
				? \wp_kses_post( $row['value'] )
				: \wp_kses_post( \make_clickable( \trim( $row['value'] ) ) );
			$rows[] = $label_before . \wp_kses_post( $row['key'] ) . $label_after . $value;
		}

		return $before . \implode( $separator, $rows ) . $after;
	}

	/**
	 * The rows on this line that are NOT ours, in WooCommerce's own order.
	 *
	 * `woocommerce_display_item_meta` hands over already-rendered HTML for the
	 * whole meta block, so returning only the summary silently destroyed every
	 * other row — a third-party gift-wrap or subscription row vanished from the
	 * customer's email on a summarised line. Rebuilding from
	 * `get_formatted_meta_data()` and dropping only the keys the summary
	 * subsumes keeps those rows.
	 *
	 * `$include_all` is deliberately left false: the default `$hideprefix` of
	 * '_' is what hides this feature's own `_sgs_line_summary` meta, and
	 * passing true would print the raw summary array back out.
	 *
	 * A line purchased before the keys meta existed returns an empty list, so
	 * its email keeps the shape it had when it was sent.
	 *
	 * @param \WC_Order_Item $item The order line item.
	 * @return array<int, array{key: string, value: string}>
	 */
	private static function foreign_meta_rows( $item ): array {
		if ( ! \is_object( $item ) || ! \method_exists( $item, 'get_formatted_meta_data' ) ) {
			return array();
		}

		$ours = $item->get_meta( SGS_CART_LINE_SUMMARY_KEYS_META, true );
		if ( ! \is_array( $ours ) || empty( $ours ) ) {
			return array();
		}
		$ours = \array_map( static fn( $key ) => \trim( (string) $key ), $ours );

		$rows = array();
		foreach ( (array) $item->get_formatted_meta_data() as $meta ) {
			$display_key = \trim( \wp_strip_all_tags( (string) ( $meta->display_key ?? '' ) ) );
			if ( '' === $display_key || \in_array( $display_key, $ours, true ) ) {
				continue;
			}
			$rows[] = array(
				'key'   => (string) ( $meta->display_key ?? '' ),
				'value' => (string) ( $meta->display_value ?? '' ),
			);
		}

		return $rows;
	}

	/**
	 * Shorter shopper-facing wording for the client's chosen attributes.
	 *
	 * Fires site-wide (product page, shop filters, cart, checkout, emails,
	 * admin), so it returns `$label` untouched for every attribute the client
	 * has not named. Overriding the label here rather than renaming the
	 * attribute itself keeps the product-page picker label and the shop
	 * filter heading as they are.
	 *
	 * @param string $label The attribute's current label.
	 * @param string $name  The attribute name, e.g. 'pa_frame-size'.
	 * @return string
	 */
	public static function attribute_label( $label, $name ) {
		$overrides = sgs_cart_line_summary_wording()['attributeLabels'];
		$key       = \sanitize_key( (string) $name );

		return isset( $overrides[ $key ] ) && '' !== $overrides[ $key ]
			? $overrides[ $key ]
			: $label;
	}

	/**
	 * The band letter instead of a raw numeric term name, on the one
	 * configured axis.
	 *
	 * This is what stops WooCommerce's own cart and checkout rows showing a
	 * measurement where the shopper chose a size letter. Scoped hard: any
	 * other taxonomy, an unset band axis, or a term this product's own scale
	 * cannot place, all return `$value` untouched.
	 *
	 * @param string           $value    The term's current display name.
	 * @param \WP_Term|null    $term     The term object, or null on the custom-attribute path.
	 * @param string           $taxonomy The attribute taxonomy.
	 * @param \WC_Product|null $product  The product being displayed.
	 * @return string
	 */
	public static function variation_option_name( $value, $term, $taxonomy, $product ) {
		$band = sgs_cart_line_summary_size_band();
		if ( '' === $band['axis'] || '' === $band['scale'] || $band['axis'] !== $taxonomy ) {
			return $value;
		}
		if ( ! \is_object( $product ) || ! \method_exists( $product, 'get_id' ) ) {
			return $value;
		}

		// The band map is keyed on term SLUG, and is always the parent
		// product's full term list — a variation's own id would see one term.
		$parent_id = \method_exists( $product, 'get_parent_id' ) && $product->get_parent_id() > 0
			? (int) $product->get_parent_id()
			: (int) $product->get_id();

		$slug = ( \is_object( $term ) && isset( $term->slug ) ) ? (string) $term->slug : '';
		if ( '' === $slug ) {
			// The custom-attribute path passes the raw stored value, which for
			// a taxonomy attribute is its slug.
			$slug = (string) $value;
		}

		$map = sgs_cart_line_summary_band_map( $parent_id, $band['axis'], $band['scale'] );

		return ( isset( $map[ $slug ] ) && '' !== $map[ $slug ] ) ? $map[ $slug ] : $value;
	}
}
