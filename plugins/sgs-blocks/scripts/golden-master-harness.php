<?php
/**
 * SGS Golden-Master Harness — Spec 27 FR-27-R2 Acceptance Gate
 *
 * A token-gated webroot one-shot runner that loads WordPress, then exposes
 * three actions for diffing and provisioning reference WooCommerce variable
 * products. Its purpose is to prove byte-identical canonical structure between
 * a product built by the R2 REST controller and the same product built via
 * WooCommerce's native data-store path.
 *
 * TOKEN GATE (MANDATORY):
 *   Every request MUST supply ?t=<TOKEN> matching the SGS_GM_TOKEN constant
 *   below. Requests without a valid token receive HTTP 403 and no WP is loaded.
 *   The orchestrator swaps SGS_GM_TOKEN_REPLACE_ME before deploying.
 *
 * USAGE (three curl commands — canary base URL):
 *
 *   1. Dump an existing variable product (pid = WP post ID):
 *      curl "https://sandybrown-nightingale-600381.hostingersite.com/wp-content/plugins/sgs-blocks/scripts/golden-master-harness.php?t=<TOKEN>&action=dump&pid=123"
 *
 *   2. Build a fresh deterministic reference product and return its dump:
 *      curl "https://sandybrown-nightingale-600381.hostingersite.com/wp-content/plugins/sgs-blocks/scripts/golden-master-harness.php?t=<TOKEN>&action=build_reference"
 *
 *   3. Diff two products (a and b = WP post IDs):
 *      curl "https://sandybrown-nightingale-600381.hostingersite.com/wp-content/plugins/sgs-blocks/scripts/golden-master-harness.php?t=<TOKEN>&action=diff&a=123&b=456"
 *
 * DEPLOYMENT DISCIPLINE:
 *   Deploy to the webroot, run the required action, then REMOVE immediately.
 *   This file should never live on the server beyond a single test session.
 *
 * NOTE: this is a standalone runner — not a plugin file. It loads WP itself.
 *   `defined('ABSPATH')` guards are NOT used (ABSPATH is not yet defined here).
 *   Token gate IS the protection layer.
 *
 * Fixture/seed scripts are exempt from the 300-line PHP limit (CLAUDE.md).
 *
 * @package SGS_Blocks
 */

// ─────────────────────────────────────────────────────────────────────────────
// 0. Token gate — evaluated BEFORE loading WordPress
// ─────────────────────────────────────────────────────────────────────────────
//
// This whole block runs before wp-load.php, so WP helpers (wp_json_encode,
// wp_unslash, sanitize_text_field) do not exist yet — native PHP only. The token
// itself IS the auth mechanism (no cookie/nonce context pre-bootstrap), and the
// raw $_GET['t'] is consumed only by hash_equals (binary-safe), never echoed or
// stored. The WPCS sniffs below do not apply in a pre-bootstrap one-shot runner.
// phpcs:disable WordPress.Security.NonceVerification.Recommended, WordPress.Security.ValidatedSanitizedInput, WordPress.WP.AlternativeFunctions.json_encode_json_encode

define( 'SGS_GM_TOKEN', 'SGS_GM_TOKEN_REPLACE_ME' );

// Refuse to run unless the token has been replaced with a high-entropy value.
// The shipped placeholder is short (< 32 chars), so a length gate both rejects
// the un-replaced file AND enforces the >= 32-byte entropy requirement — and it
// is robust to the deploy-time string swap (which would otherwise rewrite a
// literal placeholder comparison and defeat the guard).
if ( strlen( SGS_GM_TOKEN ) < 32 ) {
	http_response_code( 503 );
	header( 'Content-Type: application/json; charset=utf-8' );
	echo json_encode( array( 'error' => 'Harness not configured — token not replaced with a 32+ char value.' ) );
	exit;
}

// Token gate runs BEFORE WordPress is bootstrapped, so only native PHP functions
// are available here (no WP helpers). hash_equals is binary-safe + timing-safe;
// the raw $_GET value needs no sanitising for an equality comparison.
$provided_token = isset( $_GET['t'] ) ? (string) $_GET['t'] : '';

if ( '' === $provided_token || ! hash_equals( SGS_GM_TOKEN, $provided_token ) ) {
	http_response_code( 403 );
	header( 'Content-Type: application/json; charset=utf-8' );
	echo json_encode( array( 'error' => 'Forbidden — invalid or missing token.' ) );
	exit;
}
// phpcs:enable WordPress.Security.NonceVerification.Recommended, WordPress.Security.ValidatedSanitizedInput, WordPress.WP.AlternativeFunctions.json_encode_json_encode

// ─────────────────────────────────────────────────────────────────────────────
// 1. Bootstrap WordPress
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the path to wp-load.php by walking up from this file's directory.
 * Standard SGS location: scripts → sgs-blocks → plugins → wp-content → public_html.
 * Falls back to a tree-walk if the standard path does not resolve.
 *
 * @return string Absolute path to wp-load.php.
 * @throws RuntimeException If wp-load.php cannot be located.
 */
function sgs_gm_find_wp_load() {
	// Standard depth from scripts/ (5 levels up to public_html).
	$standard = dirname( __DIR__, 4 ) . '/wp-load.php';
	if ( file_exists( $standard ) ) {
		return $standard;
	}

	// Fallback: walk up from __DIR__ until we find wp-load.php (max 10 levels).
	$dir = __DIR__;
	for ( $i = 0; $i < 10; $i++ ) {
		$candidate = $dir . '/wp-load.php';
		if ( file_exists( $candidate ) ) {
			return $candidate;
		}
		$parent = dirname( $dir );
		if ( $parent === $dir ) {
			break; // Reached filesystem root.
		}
		$dir = $parent;
	}

	throw new RuntimeException( 'Cannot locate wp-load.php — aborting.' );
}

try {
	require_once sgs_gm_find_wp_load();
} catch ( RuntimeException $e ) {
	http_response_code( 500 );
	header( 'Content-Type: application/json; charset=utf-8' );
	echo wp_json_encode( array( 'error' => $e->getMessage() ) );
	exit;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. WooCommerce guard
// ─────────────────────────────────────────────────────────────────────────────

if ( ! function_exists( 'wc_get_product' ) ) {
	wp_send_json_error( array( 'error' => 'WooCommerce is not active on this site.' ), 500 );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Constants for the reference product
// ─────────────────────────────────────────────────────────────────────────────

define( 'SGS_GM_REFERENCE_TITLE', 'SGS Golden Master Reference' );
define( 'SGS_GM_ATTR_SIZE', 'gmtest_size' );     // → pa_gmtest_size.
define( 'SGS_GM_ATTR_FLAVOUR', 'gmtest_flavour' );  // → pa_gmtest_flavour.

/** Shape: 2 sizes × 2 flavours = 4 variations. */
$sgs_gm_shape = array(
	'sizes'    => array(
		array(
			'name' => 'Small',
			'slug' => 'small',
		),
		array(
			'name' => 'Large',
			'slug' => 'large',
		),
	),
	'flavours' => array(
		array(
			'name' => 'Vanilla',
			'slug' => 'vanilla',
		),
		array(
			'name' => 'Chocolate',
			'slug' => 'choc',
		),
	),
	'prices'   => array(
		'small|vanilla' => '9.99',
		'small|choc'    => '10.99',
		'large|vanilla' => '11.99',
		'large|choc'    => '12.99',
	),
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Helper: replace term IDs with term slugs in an array recursively
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given any array that may contain term IDs keyed by taxonomy, replace the IDs
 * with term slugs (deterministic, ID-agnostic).
 *
 * @param array  $data     Arbitrary associative array.
 * @param string $taxonomy WC taxonomy name (e.g. pa_size) — used for term lookup.
 * @return array
 */
function sgs_gm_term_ids_to_slugs( array $data, $taxonomy ) {
	$result = array();
	foreach ( $data as $key => $value ) {
		if ( is_array( $value ) ) {
			$result[ $key ] = sgs_gm_term_ids_to_slugs( $value, $taxonomy );
		} elseif ( is_int( $value ) || ( is_string( $value ) && ctype_digit( (string) $value ) ) ) {
			$term           = get_term( (int) $value, $taxonomy );
			$result[ $key ] = ( $term && ! is_wp_error( $term ) ) ? $term->slug : (int) $value;
		} else {
			$result[ $key ] = $value;
		}
	}
	return $result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Helper: normalise the _product_attributes postmeta
// Replaces term IDs with slugs; sorts by key; strips volatile fields.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise the unserialized `_product_attributes` value so IDs are replaced
 * by slugs and the array is sorted deterministically.
 *
 * @param array $raw Raw unserialized _product_attributes value.
 * @return array Normalised structure.
 */
function sgs_gm_normalise_product_attributes( array $raw ) {
	$normalised = array();
	foreach ( $raw as $taxonomy => $attr_data ) {
		$entry = array(
			'name'         => isset( $attr_data['name'] ) ? (string) $attr_data['name'] : $taxonomy,
			'is_visible'   => isset( $attr_data['is_visible'] ) ? (int) $attr_data['is_visible'] : 0,
			'is_variation' => isset( $attr_data['is_variation'] ) ? (int) $attr_data['is_variation'] : 0,
			'is_taxonomy'  => isset( $attr_data['is_taxonomy'] ) ? (int) $attr_data['is_taxonomy'] : 0,
		);

		if ( ! empty( $attr_data['value'] ) ) {
			// Pipe-separated string of term slugs (already slug form for global attributes).
			$entry['value'] = (string) $attr_data['value'];
		}

		ksort( $entry );
		$normalised[ $taxonomy ] = $entry;
	}
	ksort( $normalised );
	return $normalised;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Action: dump — canonical normalised dump of an existing variable product
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build and return the canonical, normalised dump of a variable product.
 *
 * Volatile fields normalised out: post IDs, GUIDs, dates, absolute menu_order.
 * Term IDs replaced with term slugs everywhere.
 *
 * @global wpdb $wpdb WordPress database abstraction object.
 * @param  int $product_id Parent variable product post ID.
 * @return array Normalised dump structure.
 */
function sgs_gm_dump( $product_id ) {
	global $wpdb;

	$parent = wc_get_product( (int) $product_id );
	if ( ! $parent || ! $parent->is_type( 'variable' ) ) {
		wp_send_json_error(
			array( 'error' => 'Product ' . (int) $product_id . ' is not a variable product.' ),
			400
		);
	}

	// ── Parent data ──────────────────────────────────────────────────────────

	$raw_product_attributes = get_post_meta( $product_id, '_product_attributes', true );
	$raw_product_attributes = is_array( $raw_product_attributes ) ? $raw_product_attributes : array();
	$product_attributes     = sgs_gm_normalise_product_attributes( $raw_product_attributes );

	$raw_defaults = get_post_meta( $product_id, '_default_attributes', true );
	$raw_defaults = is_array( $raw_defaults ) ? $raw_defaults : array();
	ksort( $raw_defaults );

	$product_type_terms = get_the_terms( $product_id, 'product_type' );
	$product_type_slugs = array();
	if ( ! empty( $product_type_terms ) && ! is_wp_error( $product_type_terms ) ) {
		foreach ( $product_type_terms as $term ) {
			$product_type_slugs[] = $term->slug;
		}
		sort( $product_type_slugs );
	}

	$parent_dump = array(
		'post_type'          => get_post_type( $product_id ),
		'post_status'        => get_post_status( $product_id ),
		'product_type'       => $product_type_slugs,
		'catalog_visibility' => $parent->get_catalog_visibility(),
		'product_attributes' => $product_attributes,
		'default_attributes' => $raw_defaults,
	);
	ksort( $parent_dump );

	// ── Variations ───────────────────────────────────────────────────────────

	$variation_ids = $parent->get_children();
	$variations    = array();

	foreach ( $variation_ids as $variation_id ) {
		$variation = wc_get_product( (int) $variation_id );
		if ( ! $variation ) {
			continue;
		}

		// Collect all attribute_* postmeta (the combo).
		$all_meta        = get_post_meta( (int) $variation_id );
		$attribute_combo = array();
		foreach ( $all_meta as $meta_key => $meta_values ) {
			if ( 0 === strpos( $meta_key, 'attribute_' ) ) {
				// Value is the term slug.
				$attribute_combo[ $meta_key ] = isset( $meta_values[0] ) ? (string) $meta_values[0] : '';
			}
		}
		ksort( $attribute_combo );

		// Build a canonical key: sorted "taxonomy=termslug" pairs joined by "|".
		$canonical_key_parts = array();
		foreach ( $attribute_combo as $meta_key => $term_slug ) {
			// meta key is attribute_pa_size → taxonomy is pa_size.
			$taxonomy              = substr( $meta_key, strlen( 'attribute_' ) );
			$canonical_key_parts[] = $taxonomy . '=' . $term_slug;
		}
		sort( $canonical_key_parts );
		$canonical_key = implode( '|', $canonical_key_parts );

		$var_dump = array(
			'canonical_key'            => $canonical_key,
			'attribute_combo'          => $attribute_combo,
			'regular_price'            => $variation->get_regular_price(),
			'sale_price'               => $variation->get_sale_price(),
			'sku'                      => $variation->get_sku(),
			'manage_stock'             => $variation->get_manage_stock(),
			'stock_quantity'           => $variation->get_stock_quantity(),
			'stock_status'             => $variation->get_stock_status(),
			'sgs_variation_upsert_key' => get_post_meta( (int) $variation_id, '_sgs_variation_upsert_key', true ),
		);
		ksort( $var_dump );

		$variations[ $canonical_key ] = $var_dump;
	}

	// Sort variations deterministically by canonical_key.
	ksort( $variations );

	// Strip volatile menu_order absolute values; replace with relative rank.
	$ranked_variations = array();
	$rank              = 0;
	foreach ( $variations as $canonical_key => $var_dump ) {
		$var_dump['menu_order_rank']         = $rank++;
		$ranked_variations[ $canonical_key ] = $var_dump;
	}

	// ── Lookup table ─────────────────────────────────────────────────────────

	// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
	$lookup_rows = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT taxonomy, term_id, is_variation_attribute, in_stock
			 FROM {$wpdb->prefix}wc_product_attributes_lookup
			 WHERE product_id = %d
			 ORDER BY taxonomy ASC, term_id ASC",
			(int) $product_id
		),
		ARRAY_A
	);

	// Replace term_id with term_slug for determinism.
	$normalised_lookup = array();
	foreach ( $lookup_rows as $row ) {
		$term      = get_term( (int) $row['term_id'], $row['taxonomy'] );
		$term_slug = ( $term && ! is_wp_error( $term ) ) ? $term->slug : 'unknown-' . (int) $row['term_id'];
		$entry     = array(
			'taxonomy'               => (string) $row['taxonomy'],
			'term_slug'              => $term_slug,
			'is_variation_attribute' => (int) $row['is_variation_attribute'],
			'in_stock'               => (int) $row['in_stock'],
		);
		ksort( $entry );
		$normalised_lookup[] = $entry;
	}

	// Sort lookup table deterministically.
	usort(
		$normalised_lookup,
		function ( $a, $b ) {
			$cmp = strcmp( $a['taxonomy'], $b['taxonomy'] );
			if ( 0 !== $cmp ) {
				return $cmp;
			}
			return strcmp( $a['term_slug'], $b['term_slug'] );
		}
	);

	// ── Assemble final dump ──────────────────────────────────────────────────

	$dump = array(
		'parent'           => $parent_dump,
		'variations'       => $ranked_variations,
		'attribute_lookup' => $normalised_lookup,
	);

	return $dump;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Action: build_reference — provision and dump a fresh reference product
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Provision a WooCommerce global attribute (pa_{$slug}) + terms idempotently.
 *
 * @param string  $label Human-readable attribute name.
 * @param string  $slug  Slug without 'pa_' prefix.
 * @param array[] $terms Array of ['name' => ..., 'slug' => ...] maps.
 * @return int[] Indexed array of term IDs (matching $terms order).
 */
function sgs_gm_ensure_attribute( $label, $slug, array $terms ) {
	$taxonomy = wc_attribute_taxonomy_name( $slug ); // Returns 'pa_<slug>'.

	// Provision the global attribute record if absent.
	$existing_attrs = wc_get_attribute_taxonomies();
	$attr_exists    = false;
	foreach ( $existing_attrs as $attr ) {
		if ( $attr->attribute_name === $slug ) {
			$attr_exists = true;
			break;
		}
	}
	if ( ! $attr_exists ) {
		$attr_id = wc_create_attribute(
			array(
				'name'         => $label,
				'slug'         => $slug,
				'type'         => 'select',
				'order_by'     => 'menu_order',
				'has_archives' => false,
			)
		);
		if ( is_wp_error( $attr_id ) ) {
			wp_send_json_error(
				array( 'error' => 'Failed to create attribute: ' . $attr_id->get_error_message() ),
				500
			);
		}

		// Register the taxonomy for this request (WC normally registers on init).
		if ( ! taxonomy_exists( $taxonomy ) ) {
			wc_register_attribute_taxonomies();
		}
		// If still not registered, use a minimal fallback.
		if ( ! taxonomy_exists( $taxonomy ) ) {
			register_taxonomy( $taxonomy, array( 'product', 'product_variation' ) );
		}
	}

	// Provision terms idempotently; collect term IDs.
	$term_ids = array();
	foreach ( $terms as $term_def ) {
		$existing = get_term_by( 'slug', $term_def['slug'], $taxonomy );
		if ( $existing ) {
			$term_ids[] = (int) $existing->term_id;
		} else {
			$inserted = wp_insert_term( $term_def['name'], $taxonomy, array( 'slug' => $term_def['slug'] ) );
			if ( is_wp_error( $inserted ) ) {
				wp_send_json_error(
					array( 'error' => 'Failed to insert term: ' . $inserted->get_error_message() ),
					500
				);
			}
			$term_ids[] = (int) $inserted['term_id'];
		}
	}

	return $term_ids;
}

/**
 * Build a fresh reference variable product via the WC data-store path.
 *
 * Deletes any pre-existing product titled "SGS Golden Master Reference" for a
 * clean slate, provisions pa_gmtest_size + pa_gmtest_flavour attributes and
 * terms, creates the parent product, then creates all 4 variations.
 *
 * @global array $sgs_gm_shape Variation shape definition.
 * @return array { product_id: int, dump: array }
 */
function sgs_gm_build_reference() {
	global $sgs_gm_shape;

	// ── Clean slate: delete any existing reference product ───────────────────

	$existing = get_posts(
		array(
			'post_type'      => 'product',
			'posts_per_page' => 10,
			'post_status'    => 'any',
			'title'          => SGS_GM_REFERENCE_TITLE,
			'fields'         => 'ids',
		)
	);

	foreach ( $existing as $existing_id ) {
		$existing_product = wc_get_product( (int) $existing_id );
		if ( $existing_product && $existing_product->is_type( 'variable' ) ) {
			foreach ( $existing_product->get_children() as $var_id ) {
				wp_delete_post( (int) $var_id, true );
			}
		}
		wp_delete_post( (int) $existing_id, true );
	}

	// ── Provision global attributes + terms ──────────────────────────────────

	$size_term_ids    = sgs_gm_ensure_attribute(
		'Golden Master Size',
		SGS_GM_ATTR_SIZE,
		$sgs_gm_shape['sizes']
	);
	$flavour_term_ids = sgs_gm_ensure_attribute(
		'Golden Master Flavour',
		SGS_GM_ATTR_FLAVOUR,
		$sgs_gm_shape['flavours']
	);

	$size_taxonomy    = wc_attribute_taxonomy_name( SGS_GM_ATTR_SIZE );    // pa_gmtest_size.
	$flavour_taxonomy = wc_attribute_taxonomy_name( SGS_GM_ATTR_FLAVOUR ); // pa_gmtest_flavour.

	// ── Build WC_Product_Attribute objects ───────────────────────────────────

	$attr_size = new WC_Product_Attribute();
	$attr_size->set_id( wc_attribute_taxonomy_id_by_name( SGS_GM_ATTR_SIZE ) );
	$attr_size->set_name( $size_taxonomy );
	$attr_size->set_options( $size_term_ids );
	$attr_size->set_position( 0 );
	$attr_size->set_visible( true );
	$attr_size->set_variation( true );

	$attr_flavour = new WC_Product_Attribute();
	$attr_flavour->set_id( wc_attribute_taxonomy_id_by_name( SGS_GM_ATTR_FLAVOUR ) );
	$attr_flavour->set_name( $flavour_taxonomy );
	$attr_flavour->set_options( $flavour_term_ids );
	$attr_flavour->set_position( 1 );
	$attr_flavour->set_visible( true );
	$attr_flavour->set_variation( true );

	// ── Create parent product ─────────────────────────────────────────────────

	$parent = new WC_Product_Variable();
	$parent->set_name( SGS_GM_REFERENCE_TITLE );
	$parent->set_status( 'publish' );
	$parent->set_catalog_visibility( 'visible' );
	$parent->set_attributes( array( $attr_size, $attr_flavour ) );
	$parent_id = $parent->save();

	if ( ! $parent_id || is_wp_error( $parent_id ) ) {
		wp_send_json_error( array( 'error' => 'Failed to create reference product parent.' ), 500 );
	}

	// ── Create variations — full cartesian grid ───────────────────────────────

	$menu_order = 0;
	foreach ( $sgs_gm_shape['sizes'] as $size_def ) {
		foreach ( $sgs_gm_shape['flavours'] as $flavour_def ) {
			$combo_key = $size_def['slug'] . '|' . $flavour_def['slug'];
			$price     = isset( $sgs_gm_shape['prices'][ $combo_key ] )
				? $sgs_gm_shape['prices'][ $combo_key ]
				: '9.99';

			$variation = new WC_Product_Variation();
			$variation->set_parent_id( $parent_id );
			$variation->set_attributes(
				array(
					$size_taxonomy    => $size_def['slug'],
					$flavour_taxonomy => $flavour_def['slug'],
				)
			);
			$variation->set_regular_price( $price );
			$variation->set_status( 'publish' );
			$variation->set_menu_order( $menu_order++ );
			$variation->set_sku( 'SGS-GM-' . strtoupper( $size_def['slug'] ) . '-' . strtoupper( $flavour_def['slug'] ) );
			$variation->set_manage_stock( false );
			$variation->set_stock_status( 'instock' );
			$variation->save();
		}
	}

	// ── Sync variation lookup table ───────────────────────────────────────────

	WC_Product_Variable::sync( $parent_id );

	return array(
		'product_id' => $parent_id,
		'dump'       => sgs_gm_dump( $parent_id ),
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Action: diff — deep-compare two normalised dumps
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recursively compare two values; return an array of human-readable difference
 * descriptions at the given dot-notation path.
 *
 * @param mixed  $a    First value.
 * @param mixed  $b    Second value.
 * @param string $path Dot-notation path prefix for readable output.
 * @return string[] List of difference strings.
 */
function sgs_gm_deep_diff( $a, $b, $path = '' ) {
	$diffs = array();

	if ( gettype( $a ) !== gettype( $b ) ) {
		$diffs[] = sprintf(
			'%s: type mismatch — %s vs %s.',
			$path,
			gettype( $a ),
			gettype( $b )
		);
		return $diffs;
	}

	if ( is_array( $a ) && is_array( $b ) ) {
		$all_keys = array_unique( array_merge( array_keys( $a ), array_keys( $b ) ) );
		sort( $all_keys );
		foreach ( $all_keys as $key ) {
			$child_path = '' !== $path ? $path . '.' . $key : (string) $key;
			if ( ! array_key_exists( $key, $a ) ) {
				$diffs[] = $child_path . ': missing in A.';
			} elseif ( ! array_key_exists( $key, $b ) ) {
				$diffs[] = $child_path . ': missing in B.';
			} else {
				$child_diffs = sgs_gm_deep_diff( $a[ $key ], $b[ $key ], $child_path );
				$diffs       = array_merge( $diffs, $child_diffs );
			}
		}
		return $diffs;
	}

	if ( $a !== $b ) {
		$diffs[] = sprintf(
			'%s: %s ≠ %s.',
			$path,
			wp_json_encode( $a ),
			wp_json_encode( $b )
		);
	}

	return $diffs;
}

/**
 * Diff two variable products and return an identical flag + difference list.
 *
 * @param int $id_a Post ID of first product.
 * @param int $id_b Post ID of second product.
 * @return array { identical: bool, differences: string[] }
 */
function sgs_gm_diff( $id_a, $id_b ) {
	$dump_a = sgs_gm_dump( (int) $id_a );
	$dump_b = sgs_gm_dump( (int) $id_b );

	$differences = sgs_gm_deep_diff( $dump_a, $dump_b );
	$identical   = empty( $differences );

	return array(
		'identical'   => $identical,
		'differences' => $differences,
		'dump_a'      => $dump_a,
		'dump_b'      => $dump_b,
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Router — dispatch to the requested action
// ─────────────────────────────────────────────────────────────────────────────

header( 'Content-Type: application/json; charset=utf-8' );

// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- token-gate is the auth mechanism; nonce not applicable to one-shot runner.
$sgs_gm_action = isset( $_GET['action'] ) ? sanitize_key( $_GET['action'] ) : 'dump';

switch ( $sgs_gm_action ) {

	case 'dump':
		$pid = isset( $_GET['pid'] ) ? absint( $_GET['pid'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- token-gate is the auth mechanism.
		if ( ! $pid ) {
			wp_send_json_error( array( 'error' => 'Missing or invalid ?pid parameter.' ), 400 );
		}
		wp_send_json_success( sgs_gm_dump( $pid ) );
		break;

	case 'build_reference':
		wp_send_json_success( sgs_gm_build_reference() );
		break;

	case 'diff':
		$id_a = isset( $_GET['a'] ) ? absint( $_GET['a'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- token-gate is the auth mechanism.
		$id_b = isset( $_GET['b'] ) ? absint( $_GET['b'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- token-gate is the auth mechanism.
		if ( ! $id_a || ! $id_b ) {
			wp_send_json_error( array( 'error' => 'Missing or invalid ?a and ?b parameters.' ), 400 );
		}
		wp_send_json_success( sgs_gm_diff( $id_a, $id_b ) );
		break;

	default:
		wp_send_json_error(
			array(
				'error'             => 'Unknown action: ' . esc_html( $sgs_gm_action ),
				'available_actions' => array( 'dump', 'build_reference', 'diff' ),
			),
			400
		);
		break;
}
