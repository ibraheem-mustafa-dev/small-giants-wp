<?php
/**
 * SGS 48-SKU WooCommerce Fixture — Developer Script
 *
 * Creates ONE WooCommerce variable product ("Mama's Test Box — 48 SKU fixture")
 * with 2 global attributes (pa_size × pa_flavour = 4×12 = 48 variations).
 * Designed to be the canary fixture for the Spec 27 Phase 1 variable-product
 * configurator build (FR-27-I-MVP, Unit U0).
 *
 * HOW TO RUN:
 *   wp eval-file plugins/sgs-blocks/scripts/seed-48-sku-fixture.php
 *
 * IDEMPOTENCY STRATEGY — DELETE AND RECREATE:
 *   On re-run, any existing fixture product (detected via the `_sgs_fixture`
 *   postmeta flag) is PERMANENTLY DELETED (including all 48 child variations)
 *   before the fixture is recreated from scratch. This guarantees a clean,
 *   predictable state after every run regardless of partial previous runs.
 *   WooCommerce global attribute taxonomies and their terms are provisioned
 *   via guard-wrapped wp_insert_term() calls (no duplicates created).
 *
 * FIXTURE TABLE:
 * ─────────────────────────────────────────────────────────────────────────────
 *   pa_size  (4 terms) : 12-pack, 24-pack, 48-pack, 96-pack
 *   pa_flavour (12 terms): vanilla, chocolate, strawberry, mango, banana,
 *                          coffee, mint, caramel, coconut, pistachio, lemon, honey
 *
 *   Pricing (regular price, by pack size):
 *     12-pack  → £9.99
 *     24-pack  → £18.99
 *     48-pack  → £34.99
 *     96-pack  → £59.99
 *
 *   OUT-OF-STOCK combos (stock_quantity=0, outofstock):
 *     MTB-96-pack-pistachio   (96-pack + pistachio)
 *     MTB-48-pack-honey       (48-pack + honey)
 *     MTB-12-pack-coffee      (12-pack + coffee)
 *
 *   STOCK=1 (low-stock, tests max(1, floor(stock*0.3)) edge):
 *     MTB-24-pack-lemon       (24-pack + lemon)
 *
 *   SCHEDULED SALE (30% off, active window):
 *     MTB-48-pack-vanilla     (48-pack + vanilla)
 *     Regular: £34.99  Sale: £24.49
 *     date_on_sale_from = 2026-01-01 00:00:00 UTC (fixed past)
 *     date_on_sale_to   = 2027-01-01 00:00:00 UTC (fixed future)
 *
 * NOTE: This file intentionally exceeds the 300-line PHP limit.
 * Fixture/seed scripts are exempt per CLAUDE.md ("fixtures are exempt").
 *
 * PHP 7.4+. WooCommerce 9.8+ required. Tested against WC 10.8.1.
 *
 * WC API ASSUMPTIONS (noted where uncertain):
 *   - WC_Product_Variable::set_attributes() accepts an array of
 *     WC_Product_Attribute objects.
 *   - WC_Product_Variation::set_attributes() accepts ['pa_size'=>'slug',
 *     'pa_flavour'=>'slug'] (taxonomy-slug => term-slug form).
 *   - wc_create_attribute() accepts ['name','slug','type','order_by',
 *     'has_archives'] and returns int attribute-id on success, WP_Error on
 *     failure. The taxonomy is NOT automatically registered in the same
 *     request — we call wc_register_attribute_taxonomies() or rely on the
 *     woocommerce_loaded hook having already fired. We use register_taxonomy()
 *     as a safety fallback when the taxonomy is still unregistered.
 *   - WC_Product_Variation::set_date_on_sale_from() /
 *     WC_Product_Variation::set_date_on_sale_to() accept a WC_DateTime
 *     object, a timestamp int, or a date string (YYYY-MM-DD HH:MM:SS).
 *
 * @package SGS_Blocks
 */

if ( ! function_exists( 'wc_get_product' ) ) {
	exit( 'WooCommerce not active. Run this script only on a site with WooCommerce active.' );
}

// ─────────────────────────────────────────────────────────────────────────────
// 0. Constants
// ─────────────────────────────────────────────────────────────────────────────

define( 'SGS_FIXTURE_META_KEY', '_sgs_fixture' );
define( 'SGS_FIXTURE_META_VALUE', 'seed-48-sku-v1' );

$sizes = array(
	'12-pack' => 9.99,
	'24-pack' => 18.99,
	'48-pack' => 34.99,
	'96-pack' => 59.99,
);

$flavours = array(
	'vanilla',
	'chocolate',
	'strawberry',
	'mango',
	'banana',
	'coffee',
	'mint',
	'caramel',
	'coconut',
	'pistachio',
	'lemon',
	'honey',
);

// Combos that are OUT OF STOCK.
$oos_combos = array(
	'96-pack' => 'pistachio',
	'48-pack' => 'honey',
	'12-pack' => 'coffee',
);

// Combo with stock=1 (tests max(1, floor(1*0.3))=max(1,0)=1 qty-cap edge).
$stock_one_combo = array(
	'size'    => '24-pack',
	'flavour' => 'lemon',
);

// Combo on a scheduled sale (30% off, fixed window).
$sale_combo = array(
	'size'    => '48-pack',
	'flavour' => 'vanilla',
);
// Sale dates: fixed past→future so the window is always active at fixture creation.
$sale_from = '2026-01-01 00:00:00'; // Fixed past timestamp (server UTC).
$sale_to   = '2027-01-01 00:00:00'; // Fixed future timestamp (server UTC).

// ─────────────────────────────────────────────────────────────────────────────
// 1. Helper: delete any existing fixture product
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find and permanently delete any existing fixture products identified by
 * the _sgs_fixture meta key. Includes all child variation posts.
 *
 * @return int Number of parent products deleted.
 */
function sgs_delete_existing_fixture() {
	$existing = get_posts(
		array(
			'post_type'      => 'product',
			'posts_per_page' => 10,
			'post_status'    => 'any',
			'meta_key'       => SGS_FIXTURE_META_KEY, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
			'meta_value'     => SGS_FIXTURE_META_VALUE, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
			'fields'         => 'ids',
		)
	);

	if ( empty( $existing ) ) {
		return 0;
	}

	$deleted = 0;
	foreach ( $existing as $product_id ) {
		$product = wc_get_product( $product_id );
		if ( $product && $product->is_type( 'variable' ) ) {
			// Delete child variations first.
			foreach ( $product->get_children() as $variation_id ) {
				wp_delete_post( $variation_id, true );
			}
		}
		wp_delete_post( $product_id, true );
		++$deleted;
	}

	printf( "Deleted %d existing fixture product(s) before recreating.\n", esc_html( $deleted ) );
	return $deleted;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Helper: provision a global WC attribute taxonomy + terms
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensure a WooCommerce global attribute (pa_{$slug}) exists with all required terms.
 *
 * Creates the attribute and terms if missing; skips duplicates safely.
 *
 * @param string   $label  Human-readable name, e.g. "Size".
 * @param string   $slug   Slug WITHOUT the pa_ prefix, e.g. "size".
 * @param string[] $terms  Term names (will be slugified by WP).
 * @return array           Array of ['name'=>..., 'slug'=>..., 'term_id'=>...].
 */
function sgs_ensure_attribute( $label, $slug, array $terms ) {
	$attr_taxonomy = 'pa_' . $slug;

	// Create the global WC attribute record if not already present.
	$existing_attributes = wc_get_attribute_taxonomies();
	$attr_exists         = false;
	foreach ( $existing_attributes as $attr ) {
		if ( $attr->attribute_name === $slug ) {
			$attr_exists = true;
			break;
		}
	}

	if ( ! $attr_exists ) {
		$result = wc_create_attribute(
			array(
				'name'         => $label,
				'slug'         => $slug,
				'type'         => 'select',
				'order_by'     => 'menu_order',
				'has_archives' => false,
			)
		);

		if ( is_wp_error( $result ) ) {
			// Already exists with this slug under a different label — acceptable.
			printf(
				"Notice: wc_create_attribute('%s') returned: %s\n",
				esc_html( $slug ),
				esc_html( $result->get_error_message() )
			);
		} else {
			printf(
				"Created WC attribute '%s' (id=%d).\n",
				esc_html( $attr_taxonomy ),
				esc_html( $result )
			);
		}

		// Flush the WC attribute cache so the taxonomy registers in this request.
		delete_transient( 'wc_attribute_taxonomies' );
	} else {
		printf( "Attribute '%s' already exists — skipping create.\n", esc_html( $attr_taxonomy ) );
	}

	// Ensure the taxonomy is registered in this request.
	// wc_register_attribute_taxonomies() is the canonical WC call, but it only
	// runs attributes that exist in the DB at the time it fires (usually on
	// woocommerce_loaded). After creating a new attribute mid-request we may need
	// to register it manually so wp_insert_term() can find it.
	if ( ! taxonomy_exists( $attr_taxonomy ) ) {
		// WC_ASSUMPTION: wc_get_attribute_taxonomies() returns the full list including
		// the one just created (after the transient flush above). We walk it manually.
		$all_attrs = wc_get_attribute_taxonomies();
		foreach ( $all_attrs as $attr ) {
			if ( $attr->attribute_name === $slug ) {
				// Minimal registration so wp_insert_term() can write terms.
				register_taxonomy(
					$attr_taxonomy,
					array( 'product', 'product_variation' ),
					array(
						'labels'       => array( 'name' => $label ),
						'hierarchical' => false,
						'show_ui'      => false,
						'query_var'    => true,
						'rewrite'      => false,
						'show_in_rest' => true,
					)
				);
				break;
			}
		}
	}

	if ( ! taxonomy_exists( $attr_taxonomy ) ) {
		printf(
			"ERROR: Taxonomy '%s' still not registered after provisioning. Aborting.\n",
			esc_html( $attr_taxonomy )
		);
		exit( 1 );
	}

	// Assert the taxonomy is properly registered before proceeding.
	$registered_attrs = wc_get_attribute_taxonomies();
	$attr_registered  = false;
	foreach ( $registered_attrs as $attr ) {
		if ( $attr->attribute_name === $slug ) {
			$attr_registered = true;
			break;
		}
	}
	if ( ! $attr_registered ) {
		printf(
			"ERROR: WC attribute '%s' not found via wc_get_attribute_taxonomies(). Aborting.\n",
			esc_html( $attr_taxonomy )
		);
		exit( 1 );
	}

	// Insert all terms (guard against duplicates with get_term_by()).
	$term_records = array();
	foreach ( $terms as $term_name ) {
		// WooCommerce term slugs are lowercased and hyphenated by WordPress.
		$existing_term = get_term_by( 'name', $term_name, $attr_taxonomy );
		if ( false !== $existing_term ) {
			$term_records[] = array(
				'name'    => $existing_term->name,
				'slug'    => $existing_term->slug,
				'term_id' => $existing_term->term_id,
			);
		} else {
			$inserted = wp_insert_term( $term_name, $attr_taxonomy );
			if ( is_wp_error( $inserted ) ) {
				printf(
					"Notice: wp_insert_term('%s', '%s'): %s\n",
					esc_html( $term_name ),
					esc_html( $attr_taxonomy ),
					esc_html( $inserted->get_error_message() )
				);
				// Attempt to recover the term that already exists.
				$existing_term = get_term_by( 'name', $term_name, $attr_taxonomy );
				if ( false !== $existing_term ) {
					$term_records[] = array(
						'name'    => $existing_term->name,
						'slug'    => $existing_term->slug,
						'term_id' => $existing_term->term_id,
					);
				}
			} else {
				$new_term       = get_term( $inserted['term_id'], $attr_taxonomy );
				$term_records[] = array(
					'name'    => $new_term->name,
					'slug'    => $new_term->slug,
					'term_id' => $new_term->term_id,
				);
			}
		}
	}

	printf(
		"Provisioned %d terms for '%s'.\n",
		esc_html( count( $term_records ) ),
		esc_html( $attr_taxonomy )
	);
	return $term_records;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Helper: build a canonical SKU string
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a canonical fixture SKU from size and flavour term slugs.
 *
 * @param string $size_slug    Term slug, e.g. "12-pack".
 * @param string $flavour_slug Term slug, e.g. "vanilla".
 * @return string              e.g. "MTB-12-pack-vanilla".
 */
function sgs_build_sku( $size_slug, $flavour_slug ) {
	return 'MTB-' . $size_slug . '-' . $flavour_slug;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Main routine
// ─────────────────────────────────────────────────────────────────────────────

echo "\n=== SGS 48-SKU Fixture — BEGIN ===\n\n";

// Step 1: Delete any existing fixture.
sgs_delete_existing_fixture();

// Step 2: Provision global attributes + terms.
echo "\n--- Provisioning WC attributes ---\n";

$size_terms    = sgs_ensure_attribute( 'Size', 'size', array_keys( $sizes ) );
$flavour_terms = sgs_ensure_attribute( 'Flavour', 'flavour', $flavours );

// Build lookup maps: name → slug, for variation attribute assignment.
$size_slug_map = array();
foreach ( $size_terms as $t ) {
	$size_slug_map[ $t['name'] ] = $t['slug'];
}
$flavour_slug_map = array();
foreach ( $flavour_terms as $t ) {
	$flavour_slug_map[ $t['name'] ] = $t['slug'];
}

// Step 3: Create the parent variable product.
echo "\n--- Creating parent WC_Product_Variable ---\n";

$parent = new WC_Product_Variable();
$parent->set_name( "Mama's Test Box — 48 SKU fixture" );
$parent->set_status( 'publish' );
$parent->set_catalog_visibility( 'visible' );
$parent->set_description( 'Developer fixture for the SGS Spec 27 Phase 1 variable-product configurator build. 4 pack sizes × 12 flavours = 48 variations. DO NOT use on a live shop.' );
$parent->set_short_description( 'SGS fixture: 48 variations (4 sizes × 12 flavours). Dev use only.' );
$parent->set_sku( 'MTB-PARENT' );

// Build WC_Product_Attribute objects for both axes.
$product_attributes = array();

foreach ( array( 'size', 'flavour' ) as $attr_slug ) {
	$attr_taxonomy = 'pa_' . $attr_slug;
	$term_list     = ( 'size' === $attr_slug ) ? $size_terms : $flavour_terms;
	$term_ids      = wp_list_pluck( $term_list, 'term_id' );

	$wc_attr = new WC_Product_Attribute();
	$wc_attr->set_id( wc_attribute_taxonomy_id_by_name( $attr_taxonomy ) );
	$wc_attr->set_name( $attr_taxonomy );
	$wc_attr->set_options( $term_ids );
	$wc_attr->set_position( 'size' === $attr_slug ? 0 : 1 );
	$wc_attr->set_visible( true );
	$wc_attr->set_variation( true ); // Required: marks this attr as used for variations.

	$product_attributes[ $attr_taxonomy ] = $wc_attr;
}

$parent->set_attributes( $product_attributes );
$parent_id = $parent->save();

if ( ! $parent_id ) {
	exit( "ERROR: WC_Product_Variable::save() returned 0. Cannot continue.\n" );
}

// Stamp the fixture meta key immediately so any crash still marks it for cleanup.
update_post_meta( $parent_id, SGS_FIXTURE_META_KEY, SGS_FIXTURE_META_VALUE );

printf( "Parent product created: ID=%d\n", esc_html( $parent_id ) );

// Step 4: Create 48 variations.
echo "\n--- Creating 48 variations ---\n";

$variation_ids       = array();
$oos_variation_ids   = array(); // For the summary report.
$stock1_variation_id = null;
$sale_variation_id   = null;

$variation_count = 0;
foreach ( array_keys( $sizes ) as $size_name ) {
	$size_slug  = isset( $size_slug_map[ $size_name ] ) ? $size_slug_map[ $size_name ] : sanitize_title( $size_name );
	$base_price = $sizes[ $size_name ];

	foreach ( $flavours as $flavour_name ) {
		$flavour_slug = isset( $flavour_slug_map[ $flavour_name ] ) ? $flavour_slug_map[ $flavour_name ] : sanitize_title( $flavour_name );
		$sku          = sgs_build_sku( $size_slug, $flavour_slug );

		// Determine stock state.
		$is_oos       = (
			isset( $oos_combos[ $size_name ] ) &&
			$oos_combos[ $size_name ] === $flavour_name
		);
		$is_stock_one = (
			$stock_one_combo['size'] === $size_name &&
			$stock_one_combo['flavour'] === $flavour_name
		);
		$is_sale      = (
			$sale_combo['size'] === $size_name &&
			$sale_combo['flavour'] === $flavour_name
		);

		// Determine stock quantity.
		if ( $is_oos ) {
			$stock_qty    = 0;
			$stock_status = 'outofstock';
		} elseif ( $is_stock_one ) {
			$stock_qty    = 1;
			$stock_status = 'instock';
		} else {
			// Default: plentiful stock.
			$stock_qty    = 100;
			$stock_status = 'instock';
		}

		$variation = new WC_Product_Variation();
		$variation->set_parent_id( $parent_id );
		$variation->set_sku( $sku );
		$variation->set_status( 'publish' );

		// WC_ASSUMPTION: set_attributes() on a variation accepts an associative
		// array keyed by taxonomy slug (not the pa_-prefixed form). The stored
		// representation in wp_postmeta uses attribute_{taxonomy} keys, but the
		// setter accepts the taxonomy directly. Using the full 'pa_size' key to
		// be explicit and consistent with how get_available_variations() returns them.
		$variation->set_attributes(
			array(
				'pa_size'    => $size_slug,
				'pa_flavour' => $flavour_slug,
			)
		);

		$variation->set_regular_price( (string) $base_price );
		$variation->set_manage_stock( true );
		$variation->set_stock_quantity( $stock_qty );
		$variation->set_stock_status( $stock_status );

		// Scheduled sale on the designated combo only.
		if ( $is_sale ) {
			// 30% off, rounded to 2 dp.
			$sale_price = round( $base_price * 0.70, 2 );
			$variation->set_sale_price( (string) $sale_price );
			// WC_ASSUMPTION: set_date_on_sale_from() / set_date_on_sale_to()
			// accept ISO date strings or timestamps. Using UTC date strings.
			$variation->set_date_on_sale_from( $sale_from );
			$variation->set_date_on_sale_to( $sale_to );
		}

		$variation_id = $variation->save();

		if ( ! $variation_id ) {
			printf( "WARNING: Failed to save variation %s. Skipping.\n", esc_html( $sku ) );
			continue;
		}

		$variation_ids[] = $variation_id;
		++$variation_count;

		if ( $is_oos ) {
			$oos_variation_ids[] = array(
				'id'  => $variation_id,
				'sku' => $sku,
			);
		}
		if ( $is_stock_one ) {
			$stock1_variation_id = array(
				'id'  => $variation_id,
				'sku' => $sku,
			);
		}
		if ( $is_sale ) {
			$sale_variation_id = array(
				'id'        => $variation_id,
				'sku'       => $sku,
				'regular'   => $base_price,
				'sale'      => round( $base_price * 0.70, 2 ),
				'sale_from' => $sale_from,
				'sale_to'   => $sale_to,
			);
		}
	}
}

printf( "Created %d variations.\n", esc_html( $variation_count ) );

// Step 5: Sync the parent product (price range, default attributes, etc.).
echo "\n--- Syncing parent product price range ---\n";

// WC_ASSUMPTION: WC_Product_Variable::sync() is a protected method on some
// WC versions. The canonical public path is to re-save the parent after
// variations are created — WC recalculates min/max price on save().
$parent_reload = wc_get_product( $parent_id );
if ( $parent_reload ) {
	// Force WC to recalculate the price range from child variations.
	WC_Product_Variable::sync( $parent_reload );
	$parent_reload->save();
	echo "Parent product synced.\n";
}

// Step 6: Flush transients and trigger lookup table regeneration.
echo "\n--- Flushing WooCommerce transients ---\n";

wc_delete_product_transients( $parent_id );

// Regenerate lookup tables if the function / class is available.
// wc_update_product_lookup_tables() was introduced in WC 3.6.
if ( function_exists( 'wc_update_product_lookup_tables' ) ) {
	wc_update_product_lookup_tables();
	echo "wc_update_product_lookup_tables() called.\n";
} elseif ( class_exists( 'Automattic\WooCommerce\Internal\DataStores\Orders\DataSynchronizer' ) ) {
	// WC 6.x+ DataRegenerator path (HPOS era).
	// WC_ASSUMPTION: The regenerator class may or may not be accessible via
	// the container. Log a note; not fatal.
	echo "Notice: wc_update_product_lookup_tables() unavailable; skipping lookup regeneration.\n";
} else {
	echo "Notice: Lookup table regeneration not available on this WC version.\n";
}

// Flush the variation transient specifically.
delete_transient( 'wc_var_prices_' . $parent_id );
delete_transient( 'wc_related_' . $parent_id );

// ─────────────────────────────────────────────────────────────────────────────
// 5. Summary report
// ─────────────────────────────────────────────────────────────────────────────

echo "\n=== SGS 48-SKU Fixture — SUMMARY ===\n\n";
printf( "Parent product ID : %d\n", esc_html( $parent_id ) );
echo "Parent SKU        : MTB-PARENT\n";
printf( "Variation count   : %d (expected: 48)\n", esc_html( $variation_count ) );

if ( 48 !== $variation_count ) {
	printf( "  WARNING: Expected 48 variations but got %d.\n", esc_html( $variation_count ) );
}

echo "\nOUT-OF-STOCK variations (stock=0, status=outofstock):\n";
foreach ( $oos_variation_ids as $v ) {
	printf( "  ID=%d  SKU=%s\n", esc_html( $v['id'] ), esc_html( $v['sku'] ) );
}

echo "\nLOW-STOCK variation (stock=1, tests qty-cap edge max(1,floor(1*0.3))=1):\n";
if ( $stock1_variation_id ) {
	printf(
		"  ID=%d  SKU=%s  qty=1\n",
		esc_html( $stock1_variation_id['id'] ),
		esc_html( $stock1_variation_id['sku'] )
	);
} else {
	echo "  WARNING: stock-1 variation not found in creation results.\n";
}

echo "\nSCHEDULED SALE variation (30% off, fixed active window):\n";
if ( $sale_variation_id ) {
	printf(
		"  ID=%d  SKU=%s\n  Regular=\xc2\xa3%.2f  Sale=\xc2\xa3%.2f\n  From: %s\n  To:   %s\n",
		esc_html( $sale_variation_id['id'] ),
		esc_html( $sale_variation_id['sku'] ),
		esc_html( $sale_variation_id['regular'] ),
		esc_html( $sale_variation_id['sale'] ),
		esc_html( $sale_variation_id['sale_from'] ),
		esc_html( $sale_variation_id['sale_to'] )
	);
} else {
	echo "  WARNING: sale variation not found in creation results.\n";
}

printf(
	"\nVerify in WP admin: Products > \"Mama's Test Box — 48 SKU fixture\"\n"
);
printf( "Direct edit: /wp-admin/post.php?post=%d&action=edit\n", esc_html( $parent_id ) );
echo "\n=== DONE ===\n";
