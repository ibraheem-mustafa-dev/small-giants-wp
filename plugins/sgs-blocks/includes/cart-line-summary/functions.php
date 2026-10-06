<?php
/**
 * Cart line summary — the one builder every surface reads.
 *
 * ONE summary per line, built on the server, shown identically on the bag
 * drawer, the cart page, the checkout and the order email. Three layers, so
 * each surface reaches the same strings exactly once:
 *
 *   Layer A  sgs_cart_line_summary_lines()            pure string shaping
 *   Layer B  sgs_cart_line_summary_for_cart_item()    a live cart line
 *   Layer C  sgs_cart_line_summary_for_order_item()   a purchased line
 *
 * Layer A touches no WooCommerce function, does no lookup, and contains no
 * word of any trade's vocabulary — its `lead` arrives as a parameter. That is
 * what keeps client wording in the client's own option (wording.php) and out
 * of framework code.
 *
 * Layer C never rebuilds. An order is a historical record: the summary is
 * frozen into hidden line meta at purchase, so shortening a label next month
 * cannot rewrite what a customer already bought or what a re-sent email says.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Hidden order-line meta holding the frozen summary lines. */
const SGS_CART_LINE_SUMMARY_META = '_sgs_line_summary';

/**
 * Hidden order-line meta holding the display keys the frozen summary subsumes.
 *
 * Frozen at purchase alongside the summary itself, for the same reason: the
 * customer-facing renderer removes exactly these rows and keeps every other
 * one, so a third-party row (gift wrap, a subscription term) survives on a
 * summarised line. Computed from the cart item, where the add-on, flow and
 * variation labels are all still available, rather than guessed back from the
 * order line later.
 *
 * A line purchased before this existed has no such meta, and the renderer
 * keeps its original behaviour for that line — a past order's email must not
 * change shape.
 */
const SGS_CART_LINE_SUMMARY_KEYS_META = '_sgs_line_summary_keys';

/** The separator between parts of a summary line (U+00B7 MIDDLE DOT). */
const SGS_CART_LINE_SUMMARY_SEPARATOR = ' · ';

if ( ! function_exists( __NAMESPACE__ . '\\sgs_cart_line_summary_lines' ) ) {
	/**
	 * LAYER A — shape a set of parts into 0, 1 or 2 display lines.
	 *
	 * Pure: no WooCommerce, no options, no lookups, no trade vocabulary.
	 *
	 * The two shapes, and why they differ:
	 *   - No add-ons: ONE combined line, lead then every attribute, e.g.
	 *     "Frame only · Size: M · Colour: Gold". A plain item has little to
	 *     say, so splitting it would waste a line.
	 *   - With add-ons: TWO lines — the lead and the chosen add-ons first
	 *     ("Prescription · Distance · Thin · Light-reactive"), the item's own
	 *     attributes second ("Size: M · Colour: Gold"). What the shopper
	 *     configured is the interesting half and earns its own line.
	 *
	 * An attribute with an empty label prints its value bare, so a value that
	 * already reads as a sentence needs no invented label.
	 *
	 * @param array{lead?:string,addons?:array<int,string>,attributes?:array<int,array{label?:string,value?:string}>} $parts Summary parts.
	 * @return array<int,string> 0, 1 or 2 non-empty lines.
	 */
	function sgs_cart_line_summary_lines( array $parts ): array {
		$sep  = SGS_CART_LINE_SUMMARY_SEPARATOR;
		$lead = isset( $parts['lead'] ) ? \trim( (string) $parts['lead'] ) : '';

		$addons = array();
		foreach ( (array) ( $parts['addons'] ?? array() ) as $addon ) {
			if ( ! \is_scalar( $addon ) ) {
				continue;
			}
			$addon = \trim( (string) $addon );
			if ( '' !== $addon ) {
				$addons[] = $addon;
			}
		}

		$attribute_segments = array();
		foreach ( (array) ( $parts['attributes'] ?? array() ) as $attribute ) {
			if ( ! \is_array( $attribute ) ) {
				continue;
			}
			$value = isset( $attribute['value'] ) && \is_scalar( $attribute['value'] )
				? \trim( (string) $attribute['value'] )
				: '';
			if ( '' === $value ) {
				continue;
			}
			$label                = isset( $attribute['label'] ) && \is_scalar( $attribute['label'] )
				? \trim( (string) $attribute['label'] )
				: '';
			$attribute_segments[] = '' !== $label ? $label . ': ' . $value : $value;
		}
		$attribute_line = \implode( $sep, $attribute_segments );

		if ( ! empty( $addons ) ) {
			$first = \implode( $sep, \array_filter( \array_merge( array( $lead ), $addons ), 'strlen' ) );
			$lines = array();
			if ( '' !== $first ) {
				$lines[] = $first;
			}
			if ( '' !== $attribute_line ) {
				$lines[] = $attribute_line;
			}
			return $lines;
		}

		$only = \implode( $sep, \array_filter( array( $lead, $attribute_line ), 'strlen' ) );
		return '' !== $only ? array( $only ) : array();
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_cart_line_summary_has_addons' ) ) {
	/**
	 * Whether a cart line carries resolved, priced add-ons.
	 *
	 * The established signal, shared with the add-on price list rather than
	 * re-derived: Addon_Price_List_Cart::LINES_KEY holding a non-empty array.
	 *
	 * @param array $cart_item A WooCommerce cart item (or order `$values`).
	 * @return bool
	 */
	function sgs_cart_line_summary_has_addons( array $cart_item ): bool {
		$key = Addon_Price_List_Cart::LINES_KEY;
		return ! empty( $cart_item[ $key ] ) && \is_array( $cart_item[ $key ] );
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_cart_line_summary_attributes' ) ) {
	/**
	 * The shopper-facing label/value pairs for one cart line's own variation.
	 *
	 * Reads the cart item's `variation` map (`attribute_pa_colour` => slug).
	 * Labels come from wc_attribute_label(), so the client's
	 * `attributeLabels` override applies here exactly as it does to
	 * WooCommerce's own rows — one source, no chance of disagreement.
	 *
	 * The configured size-band axis has its numeric term name replaced by the
	 * band letter from includes/buybox-picker-band.php, fed the parent's full
	 * term list so the letter matches the product-page tile the shopper
	 * clicked. A term that cannot be banded keeps its own name.
	 *
	 * @param array $cart_item A WooCommerce cart item.
	 * @return array<int,array{label:string,value:string}>
	 */
	function sgs_cart_line_summary_attributes( array $cart_item ): array {
		$variation = isset( $cart_item['variation'] ) && \is_array( $cart_item['variation'] )
			? $cart_item['variation']
			: array();
		if ( empty( $variation ) ) {
			return array();
		}

		$band       = sgs_cart_line_summary_size_band();
		$band_map   = array();
		$product_id = \absint( $cart_item['product_id'] ?? 0 );
		if ( '' !== $band['axis'] && '' !== $band['scale'] && $product_id > 0 ) {
			$band_map = sgs_cart_line_summary_band_map( $product_id, $band['axis'], $band['scale'] );
		}

		$attributes = array();
		foreach ( $variation as $name => $value ) {
			if ( ! \is_scalar( $value ) ) {
				continue;
			}
			$value = \trim( (string) $value );
			if ( '' === $value ) {
				// An "any" variation attribute: nothing was chosen, so there
				// is nothing to tell the shopper.
				continue;
			}

			$taxonomy = \str_replace( 'attribute_', '', \urldecode( (string) $name ) );
			if ( ! \taxonomy_exists( $taxonomy ) ) {
				// A custom (non-taxonomy) attribute: WooCommerce stores the
				// shopper-facing value directly, and its label is the bare
				// attribute name.
				$attributes[] = array(
					'label' => \wc_attribute_label( $taxonomy ),
					'value' => $value,
				);
				continue;
			}

			$slug  = $value;
			$term  = \get_term_by( 'slug', $slug, $taxonomy );
			$shown = ( $term && ! \is_wp_error( $term ) && '' !== $term->name ) ? $term->name : $slug;

			if ( $taxonomy === $band['axis'] && isset( $band_map[ $slug ] ) && '' !== $band_map[ $slug ] ) {
				$shown = $band_map[ $slug ];
			}

			$attributes[] = array(
				'label' => \wc_attribute_label( $taxonomy ),
				'value' => $shown,
			);
		}

		return $attributes;
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_cart_line_summary_band_map' ) ) {
	/**
	 * Term slug => band letter for one product's own terms on one axis.
	 *
	 * The term list comes from Product_Manifest's cached `axes` — the SAME
	 * list the product page's size tiles are built from, and a cached read
	 * rather than a fresh term query on every cart render. A non-variable or
	 * unpublished product has no manifest, so there is no band map and each
	 * term keeps its own name.
	 *
	 * Memoised per request, and guarded against re-entry. Both matter because
	 * the callers are PER-ROW filters: a bag of six lines would otherwise
	 * rebuild the same product's manifest once per line, and if anything
	 * inside the manifest build were ever to render a variation option name,
	 * the guard is what stops that becoming infinite recursion instead of a
	 * fatal.
	 *
	 * @param int    $product_id Parent product ID.
	 * @param string $axis       Axis taxonomy, e.g. 'pa_frame-size'.
	 * @param string $scale      Band scale in the pickerBandScale mini-syntax.
	 * @return array<string,string>
	 */
	function sgs_cart_line_summary_band_map( int $product_id, string $axis, string $scale ): array {
		static $memo     = array();
		static $building = false;

		if ( ! \class_exists( __NAMESPACE__ . '\\Product_Manifest' ) || ! \function_exists( 'sgs_buybox_band_labels' ) ) {
			return array();
		}

		$cache_key = $product_id . '|' . $axis . '|' . $scale;
		if ( isset( $memo[ $cache_key ] ) ) {
			return $memo[ $cache_key ];
		}
		if ( $building ) {
			return array();
		}

		$building = true;
		$map      = sgs_cart_line_summary_build_band_map( $product_id, $axis, $scale );
		$building = false;

		$memo[ $cache_key ] = $map;
		return $map;
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_cart_line_summary_build_band_map' ) ) {
	/**
	 * Build one band map, uncached. Only sgs_cart_line_summary_band_map()
	 * should call this — it owns the memo and the re-entry guard.
	 *
	 * @param int    $product_id Parent product ID.
	 * @param string $axis       Axis taxonomy.
	 * @param string $scale      Band scale.
	 * @return array<string,string>
	 */
	function sgs_cart_line_summary_build_band_map( int $product_id, string $axis, string $scale ): array {
		$manifest = Product_Manifest::build( $product_id );
		if ( ! \is_array( $manifest ) || empty( $manifest['axes'] ) || ! \is_array( $manifest['axes'] ) ) {
			return array();
		}

		$bands = \sgs_buybox_parse_band_scale( $scale );
		if ( empty( $bands ) ) {
			return array();
		}

		foreach ( $manifest['axes'] as $manifest_axis ) {
			if ( ! \is_array( $manifest_axis ) || ( $manifest_axis['taxonomy'] ?? '' ) !== $axis ) {
				continue;
			}
			$terms = isset( $manifest_axis['terms'] ) && \is_array( $manifest_axis['terms'] )
				? $manifest_axis['terms']
				: array();
			return \sgs_buybox_band_labels( $terms, $bands );
		}

		return array();
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_cart_line_summary_for_cart_item' ) ) {
	/**
	 * LAYER B — the summary lines for one LIVE cart line.
	 *
	 * @param array $cart_item A WooCommerce cart item.
	 * @return array<int,string> 0, 1 or 2 lines.
	 */
	function sgs_cart_line_summary_for_cart_item( array $cart_item ): array {
		$wording     = sgs_cart_line_summary_wording();
		$has_addons  = sgs_cart_line_summary_has_addons( $cart_item );
		$addon_lines = $has_addons ? (array) $cart_item[ Addon_Price_List_Cart::LINES_KEY ] : array();
		$attributes  = sgs_cart_line_summary_attributes( $cart_item );

		/*
		 * The "without add-ons" lead names something the shopper DECLINED, so
		 * it only belongs on a line where there was something to decline.
		 *
		 * The add-on price list is site-wide and carries no product scoping, so
		 * "this product could have taken add-ons" is not a fact the data model
		 * holds. What it does hold is whether the shopper configured anything
		 * at all: a line with variation attributes came from a product that
		 * asked them questions, and a line with none did not. Without that
		 * test, a client whose lead reads "Frame only" printed it on a lens
		 * cloth and a spectacle case too — every line, whatever it was.
		 *
		 * A line with add-ons keeps its lead either way, so a SIMPLE product
		 * that genuinely takes add-ons (an engraved gift box, say) is
		 * unaffected. A simple line with neither ends up with no summary at
		 * all, which is correct: there is nothing to say, and the renderer
		 * then leaves WooCommerce's own rows exactly as they were.
		 */
		$lead = '';
		if ( $has_addons ) {
			$lead = $wording['leadWithAddons'];
		} elseif ( ! empty( $attributes ) ) {
			$lead = $wording['leadWithoutAddons'];
		}

		return sgs_cart_line_summary_lines(
			array(
				'lead'       => $lead,
				'addons'     => $has_addons ? sgs_addon_short_labels( $addon_lines ) : array(),
				'attributes' => $attributes,
			)
		);
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_cart_line_summary_for_order_item' ) ) {
	/**
	 * LAYER C — the summary lines frozen onto one PURCHASED line.
	 *
	 * Reads the hidden meta written at checkout and NEVER rebuilds: the point
	 * of freezing it is that an order says what was bought, not what the
	 * current price list would call it.
	 *
	 * @param \WC_Order_Item $item An order line item.
	 * @return array<int,string> The frozen lines, or [] when the line has none.
	 */
	function sgs_cart_line_summary_for_order_item( $item ): array {
		if ( ! \is_object( $item ) || ! \method_exists( $item, 'get_meta' ) ) {
			return array();
		}

		$stored = $item->get_meta( SGS_CART_LINE_SUMMARY_META, true );
		if ( ! \is_array( $stored ) ) {
			return array();
		}

		$lines = array();
		foreach ( $stored as $line ) {
			if ( ! \is_scalar( $line ) ) {
				continue;
			}
			$line = \trim( (string) $line );
			if ( '' !== $line ) {
				$lines[] = $line;
			}
		}

		return $lines;
	}
}
