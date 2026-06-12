<?php
/**
 * ProductGroup + hasVariant JSON-LD emitter (FR-27-E1).
 *
 * Reads commerce data EXCLUSIVELY from Product_Manifest::build() (SEC-1 single
 * source of truth); the schema price is ALWAYS the VAT-inclusive incMinor (SEC-2)
 * so it can never mismatch the cart and trip a Google Merchant suspension.
 *
 * <!-- CI_GREP_ASSERT: product_schema_never_reads_wc_price_or_children -->
 * This file MUST NOT call wc_get_price_to_display / wc_get_price_including_tax /
 * wc_get_price_excluding_tax / get_children — all commerce values come from the
 * manifest. Only the PARENT product's name/description/image/brand/rating are read
 * directly via wc_get_product().
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

// Own-deps (this runs in wp_head, where render.php has not yet required the
// manifest): require_once its dependencies. require_once is idempotent.
require_once __DIR__ . '/class-sgs-schema.php';
require_once __DIR__ . '/class-product-manifest.php';
require_once __DIR__ . '/class-configurator-meta.php';

/**
 * Class Product_Schema
 *
 * Builds the ProductGroup + hasVariant JSON-LD script tag for a WC variable product.
 */
final class Product_Schema {

	/**
	 * Allowed GTIN lengths and their corresponding schema property name.
	 *
	 * @var array<int,string>
	 */
	private const GTIN_LENGTHS = array(
		8  => 'gtin8',
		12 => 'gtin12',
		13 => 'gtin13',
		14 => 'gtin14',
	);

	/**
	 * Build the ProductGroup JSON-LD <script> tag for a product, or '' if none.
	 *
	 * @param int $product_id WC variable product ID.
	 * @return string The full <script type="application/ld+json">…</script>, or ''.
	 */
	public static function build_script( int $product_id ): string {
		$manifest = Product_Manifest::build( $product_id );
		if ( null === $manifest || empty( $manifest['combos'] ) ) {
			return '';
		}

		// Defensive: keep only well-formed combos carrying a numeric inc-VAT price.
		// This runs in wp_head on EVERY product page, so a malformed combo (transient
		// corruption, a future partial build) must NOT reach min()/max() — those
		// throw a ValueError on an empty array in PHP 8 and would white-screen the
		// page. Filtering once here also guarantees every downstream Offer has a
		// real price (no silent "0.00"). If nothing survives, emit nothing.
		$combos = \array_filter(
			$manifest['combos'],
			static fn( $c ) => \is_array( $c ) && isset( $c['incMinor'] ) && \is_numeric( $c['incMinor'] )
		);
		if ( empty( $combos ) ) {
			return '';
		}

		// Parent product — name/description/image/brand/rating only (SEC-1).
		if ( ! \function_exists( 'wc_get_product' ) ) {
			return '';
		}
		$parent = \wc_get_product( $product_id );
		if ( ! $parent ) {
			return '';
		}

		$permalink = \esc_url_raw( (string) \get_permalink( $product_id ) );
		$currency  = \get_woocommerce_currency();
		$decimals  = (int) $manifest['decimals'];

		// ── ProductGroup node ─────────────────────────────────────────────────
		$data = array(
			'@context'       => 'https://schema.org',
			'@type'          => 'ProductGroup',
			'@id'            => $permalink . '#product',
			'productGroupID' => self::product_group_id( $parent, $product_id ),
			'name'           => self::sanitise_text( $parent->get_name() ),
			'url'            => $permalink,
		);

		// Description: short description → excerpt → omit.
		$description = self::sanitise_text( $parent->get_short_description() );
		if ( '' === $description ) {
			$description = self::sanitise_text( $parent->get_description() );
		}
		if ( '' !== $description ) {
			$data['description'] = $description;
		}

		// Parent image (>=250 px — try 'woocommerce_single' then 'large' then 'full').
		$parent_image = self::parent_image_url( $parent );
		if ( '' !== $parent_image ) {
			$data['image'] = $parent_image;
		}

		// Brand (first-hit resolution; never fabricated).
		$brand = self::resolve_brand( $parent );
		if ( '' !== $brand ) {
			$data['brand'] = array(
				'@type' => 'Brand',
				'name'  => $brand,
			);
		}

		// variesBy: one entry per axis with a non-empty Google enum.
		$varies_by = self::build_varies_by( $manifest['axes'] );
		if ( ! empty( $varies_by ) ) {
			$data['variesBy'] = $varies_by;
		}

		// aggregateRating — only when reviews exist.
		$aggregate_rating = self::build_aggregate_rating( $parent );
		if ( null !== $aggregate_rating ) {
			$data['aggregateRating'] = $aggregate_rating;
		}

		// AggregateOffer (price-from / price-to rich result).
		$data['offers'] = self::build_aggregate_offer( $combos, $decimals, $currency );

		// hasVariant nodes (max 50, selection rule applied).
		$data['hasVariant'] = self::build_has_variant(
			$combos,
			$manifest['axes'],
			$parent,
			$parent_image,
			$permalink,
			$decimals,
			$currency
		);

		// shippingDetails / hasMerchantReturnPolicy — attach verbatim if stored.
		$shipping = \get_option( 'sgs_configurator_shipping' );
		$returns  = \get_option( 'sgs_configurator_returns' );
		if ( ! empty( $shipping ) ) {
			$data['shippingDetails'] = $shipping;
		}
		if ( \is_array( $returns ) && ! empty( $returns ) ) {
			// F1 (FR-30-9): inject returnPolicyCountry from WooCommerce store setting.
			// OMIT the key entirely when the store country is absent or malformed —
			// never emit returnPolicyCountry:"" (council: unanimous must-fix).
			$raw_cc = (string) \get_option( 'woocommerce_default_country', '' );
			$cc     = \strtoupper( \strtok( $raw_cc, ':' ) ); // 'GB:ENG' -> 'GB'; '' -> ''.
			if ( \preg_match( '/^[A-Z]{2}$/', $cc ) ) {
				$returns['returnPolicyCountry'] = $cc; // runtime-only; never written back.
			}
			$data['hasMerchantReturnPolicy'] = $returns;
		}

		// Encode and size-cap (SEC-3). build_has_variant() puts the low- and
		// high-price anchor nodes FIRST, so when a large product (e.g. the 48-SKU
		// fixture) would overflow the 16 KB cap we drop filler nodes from the END
		// until it fits — the AggregateOffer still carries the TRUE offerCount, so
		// trimming the hasVariant SAMPLE keeps the price-range rich result intact
		// rather than suppressing the whole block. (Spec FR-27-E1: "hasVariant ≤50 =
		// low+high+sample; offerCount = true total".) Only a product whose envelope
		// + the two anchors alone still exceed the cap emits nothing.
		$json       = self::encode( $data );
		$node_count = \count( $data['hasVariant'] );
		while ( false !== $json && \mb_strlen( $json ) >= 16384 && $node_count > 2 ) {
			\array_pop( $data['hasVariant'] );
			--$node_count;
			$json = self::encode( $data );
		}
		if ( false === $json || \mb_strlen( $json ) >= 16384 ) {
			return '';
		}

		return '<script type="application/ld+json">' . $json . '</script>' . "\n";
	}

	/**
	 * JSON-encode with the XSS-safe HEX flags for inline <script> output (SEC-3).
	 *
	 * Delegates to Sgs_Schema::encode_jsonld() — one encoder, zero drift (FR-30-9).
	 *
	 * @param array $data Data to encode.
	 * @return string|false Encoded JSON, or false on failure.
	 */
	private static function encode( array $data ) {
		return Sgs_Schema::encode_jsonld( $data );
	}

	// ── Private helpers ───────────────────────────────────────────────────────

	/**
	 * Sanitise free text for JSON-LD: strip tags, trim whitespace.
	 *
	 * @param string $text Raw text.
	 * @return string
	 */
	private static function sanitise_text( string $text ): string {
		return \trim( \sanitize_text_field( \wp_strip_all_tags( $text ) ) );
	}

	/**
	 * Format a price minor int as a decimal string (e.g. 2449 → "24.49").
	 *
	 * @param int $minor_int Minor-unit integer (inc-VAT).
	 * @param int $decimals  Number of decimal places.
	 * @return string
	 */
	private static function format_price( int $minor_int, int $decimals ): string {
		return \number_format( $minor_int / ( 10 ** $decimals ), $decimals, '.', '' );
	}

	/**
	 * Resolve productGroupID: parent SKU if non-empty, else (string) product_id.
	 *
	 * Public because the Merchant feed (Product_Feed) MUST emit a byte-identical
	 * g:item_group_id — one call site, no duplicated rule (duplicated-calculation
	 * drift is a known failure class in this codebase).
	 *
	 * @param \WC_Product $wc_product Parent product object.
	 * @param int         $product_id Product ID fallback.
	 * @return string
	 */
	public static function product_group_id( \WC_Product $wc_product, int $product_id ): string {
		$sku = self::sanitise_text( $wc_product->get_sku() );
		return '' !== $sku ? $sku : (string) $product_id;
	}

	/**
	 * Retrieve the parent product's main image URL at a usable size (>=250 px).
	 *
	 * @param \WC_Product $wc_product Parent product object.
	 * @return string URL or ''.
	 */
	private static function parent_image_url( \WC_Product $wc_product ): string {
		$image_id = $wc_product->get_image_id();
		if ( ! $image_id ) {
			return '';
		}
		foreach ( array( 'woocommerce_single', 'large', 'full' ) as $size ) {
			$url = \wp_get_attachment_image_url( $image_id, $size );
			if ( $url ) {
				return \esc_url_raw( (string) $url );
			}
		}
		return '';
	}

	/**
	 * Resolve brand name — first hit wins, empty string when none found.
	 *
	 * 1. product_brand taxonomy → first term name.
	 * 2. product attribute 'brand' → first value.
	 *
	 * @param \WC_Product $wc_product Parent product object.
	 * @return string Brand name or ''.
	 */
	private static function resolve_brand( \WC_Product $wc_product ): string {
		// 1. product_brand taxonomy.
		if ( \taxonomy_exists( 'product_brand' ) ) {
			$terms = \get_the_terms( $wc_product->get_id(), 'product_brand' );
			if ( $terms && ! \is_wp_error( $terms ) && ! empty( $terms ) ) {
				return self::sanitise_text( $terms[0]->name );
			}
		}
		// 2. product attribute.
		$attr = $wc_product->get_attribute( 'brand' );
		if ( '' !== (string) $attr ) {
			$parts = \explode( ',', (string) $attr );
			$first = self::sanitise_text( $parts[0] );
			if ( '' !== $first ) {
				return $first;
			}
		}
		return '';
	}

	/**
	 * Build the variesBy array from manifest axes.
	 *
	 * @param array $axes Manifest axes array.
	 * @return string[] e.g. ['https://schema.org/size', 'https://schema.org/color'].
	 */
	private static function build_varies_by( array $axes ): array {
		$varies_by = array();
		foreach ( $axes as $axis ) {
			$enum = (string) ( $axis['variesBy'] ?? '' );
			if ( '' !== $enum ) {
				$varies_by[] = 'https://schema.org/' . $enum;
			}
		}
		return $varies_by;
	}

	/**
	 * Build aggregateRating node, or null when no reviews exist.
	 *
	 * @param \WC_Product $wc_product Parent product object.
	 * @return array|null
	 */
	private static function build_aggregate_rating( \WC_Product $wc_product ): ?array {
		$count = (int) $wc_product->get_review_count();
		if ( $count < 1 ) {
			return null;
		}
		return array(
			'@type'       => 'AggregateRating',
			'ratingValue' => $wc_product->get_average_rating(),
			'reviewCount' => $count,
			'bestRating'  => 5,
			'worstRating' => 1,
		);
	}

	/**
	 * Build AggregateOffer node (price-from / price-to, true total combo count).
	 *
	 * @param array  $combos   All combos from manifest.
	 * @param int    $decimals Price decimal places.
	 * @param string $currency Currency code.
	 * @return array
	 */
	private static function build_aggregate_offer( array $combos, int $decimals, string $currency ): array {
		$prices = \array_column( $combos, 'incMinor' );
		$low    = (int) \min( $prices );
		$high   = (int) \max( $prices );

		// Aggregate availability: InStock when at least one variant is purchasable,
		// else OutOfStock. Clears the Rich Results "missing recommended field"
		// warning on the AggregateOffer; the per-variant Offers carry the precise
		// per-combo availability.
		$any_in_stock = false;
		foreach ( $combos as $combo ) {
			if ( ! empty( $combo['inStock'] ) ) {
				$any_in_stock = true;
				break;
			}
		}

		return array(
			'@type'         => 'AggregateOffer',
			'priceCurrency' => $currency,
			'lowPrice'      => self::format_price( $low, $decimals ),
			'highPrice'     => self::format_price( $high, $decimals ),
			'offerCount'    => \count( $combos ),
			'availability'  => $any_in_stock
				? 'https://schema.org/InStock'
				: 'https://schema.org/OutOfStock',
		);
	}

	/**
	 * Build the hasVariant array (max 50 nodes, with selection rule applied).
	 *
	 * Selection rule when combos > 50:
	 *   – The combo with the lowest incMinor.
	 *   – The combo with the highest incMinor.
	 *   – Fill remaining slots in natural order, skipping those two, up to 50 total.
	 *
	 * offers.offerCount in the AggregateOffer (built separately) always reflects the
	 * true total, so the hasVariant count need not match it.
	 *
	 * @param array       $combos       All combos from manifest.
	 * @param array       $axes         Manifest axes (for label + variesBy resolution).
	 * @param \WC_Product $wc_product   Parent product (for name + fallback image).
	 * @param string      $parent_image Parent image URL (pre-resolved).
	 * @param string      $permalink    Product permalink.
	 * @param int         $decimals     Price decimal places.
	 * @param string      $currency     Currency code.
	 * @return array[]
	 */
	private static function build_has_variant(
		array $combos,
		array $axes,
		\WC_Product $wc_product,
		string $parent_image,
		string $permalink,
		int $decimals,
		string $currency
	): array {
		// ALWAYS pin the low- and high-price anchor combos FIRST — regardless of
		// total count — then fill the rest in natural order up to 50 nodes. This
		// ordering is load-bearing for the size-cap trim in build_script(), which
		// pops nodes from the END: keeping low+high at the front guarantees the
		// emitted hasVariant SAMPLE always spans the same price range the
		// AggregateOffer advertises (Google cross-checks lowPrice/highPrice against
		// the variant offers; a sample missing the high anchor is a mismatch).
		$low_key  = '';
		$high_key = '';
		$min_val  = null;
		$max_val  = null;
		foreach ( $combos as $key => $combo ) {
			$price = (int) $combo['incMinor'];
			if ( null === $min_val || $price < $min_val ) {
				$min_val = $price;
				$low_key = $key;
			}
			if ( null === $max_val || $price > $max_val ) {
				$max_val  = $price;
				$high_key = $key;
			}
		}
		$selected_keys = array( $low_key );
		if ( $high_key !== $low_key ) {
			$selected_keys[] = $high_key;
		}
		$reserved   = \array_flip( $selected_keys );
		$selected_n = \count( $selected_keys );
		foreach ( $combos as $key => $combo ) {
			if ( $selected_n >= 50 ) {
				break;
			}
			if ( ! isset( $reserved[ $key ] ) ) {
				$selected_keys[] = $key;
				++$selected_n;
			}
		}

		// Pre-build a lookup: taxonomy → axis entry (for variesBy + labels).
		$axis_by_tax = array();
		foreach ( $axes as $axis ) {
			$axis_by_tax[ $axis['taxonomy'] ] = $axis;
		}
		// Pre-build term-label lookup: taxonomy → slug → label.
		$term_labels = array();
		foreach ( $axes as $axis ) {
			$tax = $axis['taxonomy'];
			foreach ( $axis['terms'] as $term ) {
				$term_labels[ $tax ][ $term['slug'] ] = $term['label'];
			}
		}

		$parent_name = self::sanitise_text( $wc_product->get_name() );
		$nodes       = array();

		foreach ( $selected_keys as $combo_key ) {
			if ( ! isset( $combos[ $combo_key ] ) ) {
				continue;
			}
			$nodes[] = self::variant_node(
				$combo_key,
				$combos[ $combo_key ],
				$axis_by_tax,
				$term_labels,
				$parent_name,
				$parent_image,
				$permalink,
				$decimals,
				$currency
			);
		}

		return $nodes;
	}

	/**
	 * Build a single hasVariant Product node for one combo.
	 *
	 * @param string $combo_key    Combo key (e.g. 'pa_flavour:vanilla|pa_size:48-pack').
	 * @param array  $combo        Combo data from manifest.
	 * @param array  $axis_by_tax  Axis entries keyed by taxonomy slug.
	 * @param array  $term_labels  Term labels keyed by taxonomy → slug.
	 * @param string $parent_name  Parent product name (sanitised).
	 * @param string $parent_image Parent image URL (pre-resolved, may be '').
	 * @param string $permalink    Product permalink.
	 * @param int    $decimals     Price decimal places.
	 * @param string $currency     Currency code.
	 * @return array
	 */
	private static function variant_node(
		string $combo_key,
		array $combo,
		array $axis_by_tax,
		array $term_labels,
		string $parent_name,
		string $parent_image,
		string $permalink,
		int $decimals,
		string $currency
	): array {
		$variation_id = (int) $combo['variationId'];

		// Parse the combo key into taxonomy:slug pairs.
		$pairs = array();
		foreach ( \explode( '|', $combo_key ) as $part ) {
			$colon = \strpos( $part, ':' );
			if ( false !== $colon ) {
				$pairs[ \substr( $part, 0, $colon ) ] = \substr( $part, $colon + 1 );
			}
		}

		// Name: parent name + ' – ' + comma-joined term labels.
		$label_parts = array();
		foreach ( $pairs as $tax => $slug ) {
			$label_parts[] = isset( $term_labels[ $tax ][ $slug ] )
				? $term_labels[ $tax ][ $slug ]
				: self::sanitise_text( $slug );
		}
		$variant_name = $parent_name . ' – ' . \implode( ', ', $label_parts );

		// Image: combo imageUrl → parent image → omit.
		$image_url = (string) ( $combo['imageUrl'] ?? '' );
		if ( '' === $image_url ) {
			$image_url = $parent_image;
		}

		$node = array(
			'@type' => 'Product',
			'@id'   => $permalink . '#variant-' . $variation_id,
			'name'  => $variant_name,
		);

		// SKU.
		$sku = (string) ( $combo['sku'] ?? '' );
		if ( '' !== $sku ) {
			$node['sku'] = $sku;
		}

		// GTIN identifier.
		$gtin = (string) ( $combo['gtin'] ?? '' );
		if ( '' !== $gtin ) {
			$gtin_len = \strlen( $gtin );
			if ( isset( self::GTIN_LENGTHS[ $gtin_len ] ) ) {
				$node[ self::GTIN_LENGTHS[ $gtin_len ] ] = $gtin;
			} elseif ( '' !== $sku ) {
				$node['mpn'] = $sku;
			} else {
				$node['identifier_exists'] = false;
			}
		} elseif ( '' !== $sku ) {
			$node['mpn'] = $sku;
		} else {
			$node['identifier_exists'] = false;
		}

		// Image.
		if ( '' !== $image_url ) {
			$node['image'] = $image_url;
		}

		// Per-axis properties: mapped enum → top-level; unmapped → additionalProperty.
		$additional = array();
		foreach ( $pairs as $tax => $slug ) {
			$axis       = $axis_by_tax[ $tax ] ?? null;
			$term_label = isset( $term_labels[ $tax ][ $slug ] )
				? $term_labels[ $tax ][ $slug ]
				: self::sanitise_text( $slug );

			if ( $axis && '' !== (string) $axis['variesBy'] ) {
				$node[ $axis['variesBy'] ] = $term_label;
			} else {
				$axis_label   = $axis ? self::sanitise_text( $axis['label'] ) : self::sanitise_text( $tax );
				$additional[] = array(
					'@type' => 'PropertyValue',
					'name'  => $axis_label,
					'value' => $term_label,
				);
			}
		}
		if ( ! empty( $additional ) ) {
			$node['additionalProperty'] = $additional;
		}

		$node['isVariantOf'] = array( '@id' => $permalink . '#product' );

		// Offer.
		$offer = array(
			'@type'         => 'Offer',
			'price'         => self::format_price( (int) $combo['incMinor'], $decimals ),
			'priceCurrency' => $currency,
			'availability'  => ! empty( $combo['inStock'] )
				? 'https://schema.org/InStock'
				: 'https://schema.org/OutOfStock',
			'url'           => $permalink,
			'itemCondition' => 'https://schema.org/NewCondition',
		);

		// priceValidUntil — only when a scheduled sale end date is stored (never fabricated).
		$sale_end = (string) ( $combo['saleEndDate'] ?? '' );
		if ( '' !== $sale_end ) {
			$offer['priceValidUntil'] = $sale_end;
		}

		$node['offers'] = $offer;

		return $node;
	}
}
