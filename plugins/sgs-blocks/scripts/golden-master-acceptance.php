<?php
/**
 * SGS Golden-Master Acceptance Test — Spec 27 FR-27-R2 Empirical Acceptance Gate
 *
 * A token-gated webroot one-shot runner that loads WordPress, then executes a
 * full three-suite acceptance test against the R2 REST controller
 * (SGS\Blocks\Product_Provisioning → POST /sgs/v1/products/{id}/provision).
 *
 * TOKEN GATE (MANDATORY):
 *   Every request MUST supply ?t=<TOKEN> matching the SGS_ACC_TOKEN constant
 *   below. Requests without a valid token receive HTTP 403 and no WP is loaded.
 *   The orchestrator swaps SGS_ACC_TOKEN_REPLACE_ME before deploying.
 *
 * USAGE (canary base URL):
 *
 *   Run full acceptance suite:
 *     curl "https://sandybrown-nightingale-600381.hostingersite.com/wp-content/plugins/sgs-blocks/scripts/golden-master-acceptance.php?action=full_test&t=<TOKEN>"
 *
 * VERDICT JSON SHAPE (action=full_test):
 *   {
 *     "verdict": "PASS" | "FAIL",
 *     "suite_1_golden_master_diff": {
 *       "pass": bool,
 *       "identical": bool,
 *       "differences": string[],
 *       "note": string
 *     },
 *     "suite_2_rollback": {
 *       "pass": bool,
 *       "http_status": int,
 *       "error_code": string|null,
 *       "rolled_back": bool,
 *       "orphan_variations": int,
 *       "parent_restored": bool
 *     },
 *     "suite_3_sibling_safety": {
 *       "pass": bool,
 *       "sibling_unchanged": bool,
 *       "differences": string[]
 *     },
 *     "cleanup": {
 *       "products_deleted": int,
 *       "attributes_deleted": string[]
 *     }
 *   }
 *
 * DEPLOYMENT DISCIPLINE:
 *   Deploy to the webroot, run the required action, then REMOVE immediately.
 *   This file should never live on the server beyond a single test session.
 *
 * NOTE: this is a standalone runner — not a plugin file. It loads WP itself.
 *   `defined('ABSPATH')` guards are NOT used (ABSPATH is not yet defined here).
 *   Token gate IS the protection layer.
 *
 * Fixture/test scripts are exempt from the 300-line PHP limit (CLAUDE.md).
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

define( 'SGS_ACC_TOKEN', 'SGS_ACC_TOKEN_REPLACE_ME' );

// Refuse to run unless the token has been replaced with a high-entropy value.
// A length gate both rejects the un-replaced placeholder AND enforces >= 32-byte
// entropy — and it survives the deploy-time string swap (a literal-placeholder
// comparison would itself be rewritten by the swap and defeat the guard).
if ( strlen( SGS_ACC_TOKEN ) < 32 ) {
	http_response_code( 503 );
	header( 'Content-Type: application/json; charset=utf-8' );
	echo json_encode( array( 'error' => 'Acceptance runner not configured — token not replaced with a 32+ char value.' ) );
	exit;
}

// Token gate runs BEFORE WordPress is bootstrapped, so only native PHP functions
// are available here (no WP helpers). hash_equals is binary-safe + timing-safe;
// the raw $_GET value needs no sanitising for an equality comparison.
$sgs_acc_provided_token = isset( $_GET['t'] ) ? (string) $_GET['t'] : '';

if ( '' === $sgs_acc_provided_token || ! hash_equals( SGS_ACC_TOKEN, $sgs_acc_provided_token ) ) {
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
function sgs_acc_find_wp_load() {
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
	require_once sgs_acc_find_wp_load();
} catch ( RuntimeException $e ) {
	http_response_code( 500 );
	header( 'Content-Type: application/json; charset=utf-8' );
	// phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- wp_json_encode not yet available.
	echo json_encode( array( 'error' => $e->getMessage() ) );
	exit;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. WooCommerce guard
// ─────────────────────────────────────────────────────────────────────────────

if ( ! function_exists( 'wc_get_product' ) ) {
	wp_send_json_error( array( 'error' => 'WooCommerce is not active on this site.' ), 500 );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Elevate to administrator so the REST permission_callback passes
// ─────────────────────────────────────────────────────────────────────────────

$sgs_acc_admins = get_users(
	array(
		'role'   => 'administrator',
		'number' => 1,
		'fields' => 'ids',
	)
);

if ( empty( $sgs_acc_admins ) ) {
	wp_send_json_error( array( 'error' => 'No administrator user found on this site.' ), 500 );
}

wp_set_current_user( (int) $sgs_acc_admins[0] );

// Enable the injected test-fail hook for the rollback suite (guard: manage_options).
add_filter( 'sgs_pa_allow_test_fail', '__return_true' );

// ─────────────────────────────────────────────────────────────────────────────
// 4. Constants for test products / attributes
// ─────────────────────────────────────────────────────────────────────────────

define( 'SGS_ACC_TITLE_NATIVE', 'SGS Acceptance Native' );
define( 'SGS_ACC_TITLE_R2', 'SGS Acceptance R2' );
define( 'SGS_ACC_TITLE_ROLLBACK', 'SGS Acceptance Rollback' );
define( 'SGS_ACC_TITLE_SIBLING', 'SGS Acceptance Sibling' );
define( 'SGS_ACC_TITLE_NEW', 'SGS Acceptance New' );

// pa_acctest_size: Small | Large. pa_acctest_flavour: Vanilla | Choc.
// NB: hyphen form — WC's wc_create_attribute() + wc_sanitize_taxonomy_name()
// normalise an attribute name like "Acctest Size" to the slug "acctest-size"
// (sanitize_title turns spaces into hyphens). The native reference MUST use the
// same slug WC actually registers, which is also what R2 derives from the name,
// so the golden-master compares like with like.
define( 'SGS_ACC_ATTR_SIZE', 'acctest-size' );
define( 'SGS_ACC_ATTR_FLAVOUR', 'acctest-flavour' );
define( 'SGS_ACC_FLAT_PRICE', '9.99' );

// ─────────────────────────────────────────────────────────────────────────────
// 5. Core helper: call the REST provision route internally
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build and dispatch a WP_REST_Request to POST /sgs/v1/products/{id}/provision.
 *
 * Exercises the full route including permission_callback and security chain.
 *
 * @param int   $product_id  Parent variable product post ID.
 * @param array $body_params Parameters matching the provision args schema.
 * @return array { status: int, data: mixed }
 */
function sgs_acc_call_provision( $product_id, array $body_params ) {
	$route   = '/sgs/v1/products/' . (int) $product_id . '/provision';
	$request = new WP_REST_Request( 'POST', $route );
	$request->set_header( 'X-WP-Nonce', wp_create_nonce( 'wp_rest' ) );

	// Set body params both ways to satisfy WP_REST_Request consumers.
	$request->set_body_params( $body_params );
	foreach ( $body_params as $key => $value ) {
		$request->set_param( $key, $value );
	}

	$response = rest_do_request( $request );

	return array(
		'status' => $response->get_status(),
		'data'   => $response->get_data(),
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Core helper: create a fresh empty variable product
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete any prior product with the given title (force-delete children too),
 * then create a fresh empty WC_Product_Variable and return its post ID.
 *
 * @param string $title Unique title to identify this test product.
 * @return int Newly created product post ID.
 */
function sgs_acc_fresh_variable_product( $title ) {
	// Clean slate: remove any product with this exact title.
	$existing = get_posts(
		array(
			'post_type'      => 'product',
			'posts_per_page' => 20,
			'post_status'    => 'any',
			'title'          => $title,
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

	$product = new WC_Product_Variable();
	$product->set_name( $title );
	$product->set_status( 'publish' );
	$product->set_catalog_visibility( 'visible' );
	$pid = $product->save();

	if ( ! $pid || is_wp_error( $pid ) ) {
		wp_send_json_error( array( 'error' => 'Failed to create test product: ' . esc_html( $title ) ), 500 );
	}

	return (int) $pid;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Core helper: provision attributes + terms idempotently (for native builds)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensure a WC global attribute + given terms exist. Mirrors sgs_gm_ensure_attribute
 * from the harness without pulling in that file's router.
 *
 * @param string  $label    Human-readable attribute label.
 * @param string  $slug     Attribute slug without 'pa_' prefix.
 * @param array[] $terms    Array of ['name' => ..., 'slug' => ...] definitions.
 * @return int[] Term IDs matching $terms order.
 */
function sgs_acc_ensure_attribute( $label, $slug, array $terms ) {
	$taxonomy       = wc_attribute_taxonomy_name( $slug ); // Returns 'pa_<slug>'.
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
		// Register the freshly-created taxonomy for the remainder of this request
		// so wp_insert_term() can use it (WC normally registers attribute
		// taxonomies on init; we created one mid-request). Mirrors R2's helper.
		delete_transient( 'wc_attribute_taxonomies' );
		if ( ! taxonomy_exists( $taxonomy ) ) {
			register_taxonomy( $taxonomy, array( 'product', 'product_variation' ) );
		}
	}

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

// ─────────────────────────────────────────────────────────────────────────────
// 8. Core helper: build a variable product via raw WC setters (native path)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Provision pa_acctest_size + pa_acctest_flavour via raw WC setters and create
 * all 4 variations with a flat price. This is the reference "native editor" path
 * used in Suite 1 as the golden master.
 *
 * @param int $product_id Empty variable product post ID.
 * @return void
 */
function sgs_acc_build_native( $product_id ) {
	$size_terms    = array(
		array(
			'name' => 'Small',
			'slug' => 'small',
		),
		array(
			'name' => 'Large',
			'slug' => 'large',
		),
	);
	$flavour_terms = array(
		array(
			'name' => 'Vanilla',
			'slug' => 'vanilla',
		),
		array(
			'name' => 'Choc',
			'slug' => 'choc',
		),
	);

	$size_term_ids    = sgs_acc_ensure_attribute( 'Acctest Size', SGS_ACC_ATTR_SIZE, $size_terms );
	$flavour_term_ids = sgs_acc_ensure_attribute( 'Acctest Flavour', SGS_ACC_ATTR_FLAVOUR, $flavour_terms );

	$size_taxonomy    = wc_attribute_taxonomy_name( SGS_ACC_ATTR_SIZE );
	$flavour_taxonomy = wc_attribute_taxonomy_name( SGS_ACC_ATTR_FLAVOUR );

	$attr_size = new WC_Product_Attribute();
	$attr_size->set_id( wc_attribute_taxonomy_id_by_name( $size_taxonomy ) );
	$attr_size->set_name( $size_taxonomy );
	$attr_size->set_options( $size_term_ids );
	$attr_size->set_position( 0 );
	$attr_size->set_visible( true );
	$attr_size->set_variation( true );

	$attr_flavour = new WC_Product_Attribute();
	$attr_flavour->set_id( wc_attribute_taxonomy_id_by_name( $flavour_taxonomy ) );
	$attr_flavour->set_name( $flavour_taxonomy );
	$attr_flavour->set_options( $flavour_term_ids );
	$attr_flavour->set_position( 1 );
	$attr_flavour->set_visible( true );
	$attr_flavour->set_variation( true );

	$parent = wc_get_product( $product_id );
	$parent->set_attributes( array( $attr_size, $attr_flavour ) );
	$parent->save();

	// Create all 4 variations with flat price for structural comparison.
	$menu_order = 0;
	foreach ( $size_terms as $size_def ) {
		foreach ( $flavour_terms as $flavour_def ) {
			$variation = new WC_Product_Variation();
			$variation->set_parent_id( $product_id );
			$variation->set_attributes(
				array(
					$size_taxonomy    => $size_def['slug'],
					$flavour_taxonomy => $flavour_def['slug'],
				)
			);
			$variation->set_regular_price( SGS_ACC_FLAT_PRICE );
			$variation->set_status( 'publish' );
			$variation->set_menu_order( $menu_order++ );
			$variation->set_manage_stock( false );
			$variation->set_stock_status( 'instock' );
			$variation->save();
		}
	}

	WC_Product_Variable::sync( $product_id );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Core helper: normalised canonical dump (mirrors sgs_gm_dump from harness)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise the unserialized _product_attributes postmeta value.
 *
 * @param array $raw Raw unserialized _product_attributes value.
 * @return array Normalised, ksorted structure.
 */
function sgs_acc_normalise_product_attributes( array $raw ) {
	$normalised = array();
	foreach ( $raw as $taxonomy => $attr_data ) {
		$entry = array(
			'is_taxonomy'  => isset( $attr_data['is_taxonomy'] ) ? (int) $attr_data['is_taxonomy'] : 0,
			'is_variation' => isset( $attr_data['is_variation'] ) ? (int) $attr_data['is_variation'] : 0,
			'is_visible'   => isset( $attr_data['is_visible'] ) ? (int) $attr_data['is_visible'] : 0,
			'name'         => isset( $attr_data['name'] ) ? (string) $attr_data['name'] : $taxonomy,
		);
		if ( ! empty( $attr_data['value'] ) ) {
			$entry['value'] = (string) $attr_data['value'];
		}
		ksort( $entry );
		$normalised[ $taxonomy ] = $entry;
	}
	ksort( $normalised );
	return $normalised;
}

/**
 * Build and return a canonical, normalised dump of a variable product.
 *
 * Mirrors the sgs_gm_dump() shape from golden-master-harness.php exactly so
 * deep-diff comparisons are apples-to-apples. Volatile fields stripped: post IDs,
 * GUIDs, dates, absolute menu_order. Term IDs replaced with term slugs.
 *
 * @global wpdb $wpdb WordPress database abstraction object.
 * @param int $product_id Parent variable product post ID.
 * @return array Normalised dump structure.
 */
function sgs_acc_dump( $product_id ) {
	global $wpdb;

	$parent = wc_get_product( (int) $product_id );
	if ( ! $parent || ! $parent->is_type( 'variable' ) ) {
		wp_send_json_error(
			array( 'error' => 'Product ' . (int) $product_id . ' is not a variable product.' ),
			400
		);
	}

	// ── Parent data ───────────────────────────────────────────────────────────

	$raw_product_attributes = get_post_meta( $product_id, '_product_attributes', true );
	$raw_product_attributes = is_array( $raw_product_attributes ) ? $raw_product_attributes : array();
	$product_attributes     = sgs_acc_normalise_product_attributes( $raw_product_attributes );

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
		'catalog_visibility' => $parent->get_catalog_visibility(),
		'default_attributes' => $raw_defaults,
		'post_status'        => get_post_status( $product_id ),
		'post_type'          => get_post_type( $product_id ),
		'product_attributes' => $product_attributes,
		'product_type'       => $product_type_slugs,
	);
	ksort( $parent_dump );

	// ── Variations ────────────────────────────────────────────────────────────

	$variation_ids = $parent->get_children();
	$variations    = array();

	foreach ( $variation_ids as $variation_id ) {
		$variation = wc_get_product( (int) $variation_id );
		if ( ! $variation ) {
			continue;
		}

		$all_meta        = get_post_meta( (int) $variation_id );
		$attribute_combo = array();
		foreach ( $all_meta as $meta_key => $meta_values ) {
			if ( 0 === strpos( $meta_key, 'attribute_' ) ) {
				$attribute_combo[ $meta_key ] = isset( $meta_values[0] ) ? (string) $meta_values[0] : '';
			}
		}
		ksort( $attribute_combo );

		$canonical_key_parts = array();
		foreach ( $attribute_combo as $meta_key => $term_slug ) {
			$taxonomy              = substr( $meta_key, strlen( 'attribute_' ) );
			$canonical_key_parts[] = $taxonomy . '=' . $term_slug;
		}
		sort( $canonical_key_parts );
		$canonical_key = implode( '|', $canonical_key_parts );

		$var_dump = array(
			'attribute_combo'          => $attribute_combo,
			'canonical_key'            => $canonical_key,
			'manage_stock'             => $variation->get_manage_stock(),
			'regular_price'            => $variation->get_regular_price(),
			'sale_price'               => $variation->get_sale_price(),
			'sgs_variation_upsert_key' => get_post_meta( (int) $variation_id, '_sgs_variation_upsert_key', true ),
			'sku'                      => $variation->get_sku(),
			'stock_quantity'           => $variation->get_stock_quantity(),
			'stock_status'             => $variation->get_stock_status(),
		);
		ksort( $var_dump );

		$variations[ $canonical_key ] = $var_dump;
	}

	ksort( $variations );

	// Replace absolute menu_order with relative rank.
	$ranked_variations = array();
	$rank              = 0;
	foreach ( $variations as $canonical_key => $var_dump ) {
		$var_dump['menu_order_rank']         = $rank++;
		$ranked_variations[ $canonical_key ] = $var_dump;
	}

	// ── Lookup table ──────────────────────────────────────────────────────────

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

	$normalised_lookup = array();
	foreach ( $lookup_rows as $row ) {
		$term      = get_term( (int) $row['term_id'], $row['taxonomy'] );
		$term_slug = ( $term && ! is_wp_error( $term ) ) ? $term->slug : 'unknown-' . (int) $row['term_id'];
		$entry     = array(
			'in_stock'               => (int) $row['in_stock'],
			'is_variation_attribute' => (int) $row['is_variation_attribute'],
			'taxonomy'               => (string) $row['taxonomy'],
			'term_slug'              => $term_slug,
		);
		ksort( $entry );
		$normalised_lookup[] = $entry;
	}

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

	// ── Assemble ──────────────────────────────────────────────────────────────

	return array(
		'attribute_lookup' => $normalised_lookup,
		'parent'           => $parent_dump,
		'variations'       => $ranked_variations,
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Core helper: recursive deep-diff (mirrors sgs_gm_deep_diff from harness)
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
function sgs_acc_deep_diff( $a, $b, $path = '' ) {
	$diffs = array();

	if ( gettype( $a ) !== gettype( $b ) ) {
		$diffs[] = sprintf( '%s: type mismatch — %s vs %s.', $path, gettype( $a ), gettype( $b ) );
		return $diffs;
	}

	if ( is_array( $a ) && is_array( $b ) ) {
		$all_keys = array_unique( array_merge( array_keys( $a ), array_keys( $b ) ) );
		sort( $all_keys );
		foreach ( $all_keys as $key ) {
			$child_path = '' !== $path ? $path . '.' . $key : (string) $key;
			if ( ! array_key_exists( $key, $a ) ) {
				$diffs[] = $child_path . ': missing in A (native).';
			} elseif ( ! array_key_exists( $key, $b ) ) {
				$diffs[] = $child_path . ': missing in B (R2).';
			} else {
				$child_diffs = sgs_acc_deep_diff( $a[ $key ], $b[ $key ], $child_path );
				$diffs       = array_merge( $diffs, $child_diffs );
			}
		}
		return $diffs;
	}

	if ( $a !== $b ) {
		$diffs[] = sprintf( '%s: %s ≠ %s.', $path, wp_json_encode( $a ), wp_json_encode( $b ) );
	}

	return $diffs;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Cleanup helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Force-delete all test products by title and remove the pa_acctest_* attributes.
 *
 * @return array { products_deleted: int, attributes_deleted: string[] }
 */
function sgs_acc_cleanup() {
	$titles = array(
		SGS_ACC_TITLE_NATIVE,
		SGS_ACC_TITLE_R2,
		SGS_ACC_TITLE_ROLLBACK,
		SGS_ACC_TITLE_SIBLING,
		SGS_ACC_TITLE_NEW,
	);

	$deleted_count = 0;
	foreach ( $titles as $title ) {
		$posts = get_posts(
			array(
				'post_type'      => 'product',
				'posts_per_page' => 20,
				'post_status'    => 'any',
				'title'          => $title,
				'fields'         => 'ids',
			)
		);
		foreach ( $posts as $post_id ) {
			$product = wc_get_product( (int) $post_id );
			if ( $product && $product->is_type( 'variable' ) ) {
				foreach ( $product->get_children() as $var_id ) {
					wp_delete_post( (int) $var_id, true );
				}
			}
			wp_delete_post( (int) $post_id, true );
			++$deleted_count;
		}
	}

	// Remove the pa_acctest_* attributes + their terms.
	$attr_slugs_deleted = array();
	foreach ( array( SGS_ACC_ATTR_SIZE, SGS_ACC_ATTR_FLAVOUR ) as $slug ) {
		$taxonomy = wc_attribute_taxonomy_name( $slug );
		$attr_id  = wc_attribute_taxonomy_id_by_name( $taxonomy );
		if ( $attr_id > 0 ) {
			// Delete all terms first.
			if ( taxonomy_exists( $taxonomy ) ) {
				$all_terms = get_terms(
					array(
						'taxonomy'   => $taxonomy,
						'hide_empty' => false,
					)
				);
				if ( ! is_wp_error( $all_terms ) ) {
					foreach ( $all_terms as $term ) {
						wp_delete_term( (int) $term->term_id, $taxonomy );
					}
				}
			}
			wc_delete_attribute( (int) $attr_id );
			$attr_slugs_deleted[] = 'pa_' . $slug;
		}
	}

	// Also clean up pa_acctest_size's 'medium' term if it was added by Suite 3.
	$size_taxonomy = wc_attribute_taxonomy_name( SGS_ACC_ATTR_SIZE );
	if ( taxonomy_exists( $size_taxonomy ) ) {
		$medium = get_term_by( 'slug', 'medium', $size_taxonomy );
		if ( $medium ) {
			wp_delete_term( (int) $medium->term_id, $size_taxonomy );
		}
	}

	return array(
		'products_deleted'   => $deleted_count,
		'attributes_deleted' => $attr_slugs_deleted,
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. Suite 1 — Golden-master structural diff (native vs R2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Suite 1: Build the same 2×2 product via native WC setters (reference) and via
 * the R2 REST controller, dump both canonically, deep-diff.
 *
 * Both products use a flat 9.99 price so the diff is purely structural
 * (attributes, combos, lookup rows) rather than a commerce-field comparison.
 *
 * @return array Suite result with pass/identical/differences keys.
 */
function sgs_acc_suite1_golden_master_diff() {
	// ── Build NATIVE reference ────────────────────────────────────────────────
	$pid_native = sgs_acc_fresh_variable_product( SGS_ACC_TITLE_NATIVE );
	sgs_acc_build_native( $pid_native );

	// ── Build R2 product ──────────────────────────────────────────────────────
	$pid_r2    = sgs_acc_fresh_variable_product( SGS_ACC_TITLE_R2 );
	$r2_result = sgs_acc_call_provision(
		$pid_r2,
		array(
			'attributes' => array(
				array(
					'name'  => 'Acctest Size',
					'terms' => array( 'Small', 'Large' ),
				),
				array(
					'name'  => 'Acctest Flavour',
					'terms' => array( 'Vanilla', 'Choc' ),
				),
			),
			'defaults'   => array(
				'regular_price' => SGS_ACC_FLAT_PRICE,
			),
		)
	);

	if ( 200 !== (int) $r2_result['status'] ) {
		return array(
			'pass'        => false,
			'identical'   => false,
			'differences' => array( 'R2 provision call failed with HTTP ' . (int) $r2_result['status'] . ' — ' . wp_json_encode( $r2_result['data'] ) ),
			'note'        => 'R2 provision failed; structural diff not possible.',
		);
	}

	// ── Canonical dumps ───────────────────────────────────────────────────────
	$dump_native = sgs_acc_dump( $pid_native );
	$dump_r2     = sgs_acc_dump( $pid_r2 );

	// ── Normalise away the sgs_variation_upsert_key (native doesn't set it) ──
	// Strip _sgs_variation_upsert_key from both dumps before comparing: native
	// has no upsert-key meta; R2 does. This is expected bookkeeping, not a
	// structural commerce difference.
	foreach ( $dump_native['variations'] as $key => $var ) {
		unset( $dump_native['variations'][ $key ]['sgs_variation_upsert_key'] );
	}
	foreach ( $dump_r2['variations'] as $key => $var ) {
		unset( $dump_r2['variations'][ $key ]['sgs_variation_upsert_key'] );
	}

	$differences = sgs_acc_deep_diff( $dump_native, $dump_r2 );
	$identical   = empty( $differences );

	return array(
		'pass'        => $identical,
		'identical'   => $identical,
		'differences' => $differences,
		'note'        => 'sgs_variation_upsert_key excluded from diff (expected R2-only bookkeeping).',
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. Suite 2 — Rollback: 0 orphan variations after injected failure
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Suite 2: Provision with _sgs_test_fail_after:2, assert HTTP 500 + rolled_back
 * code, assert 0 child variations remain, assert parent attributes were restored.
 *
 * @return array Suite result with pass/http_status/error_code/rolled_back/orphan_variations/parent_restored.
 */
function sgs_acc_suite2_rollback() {
	$pid = sgs_acc_fresh_variable_product( SGS_ACC_TITLE_ROLLBACK );

	// Snapshot parent attributes BEFORE the failed provision (should stay empty).
	$product_before = wc_get_product( $pid );
	$attrs_before   = $product_before->get_attributes( 'edit' );

	$result = sgs_acc_call_provision(
		$pid,
		array(
			'attributes'           => array(
				array(
					'name'  => 'Acctest Size',
					'terms' => array( 'Small', 'Large' ),
				),
				array(
					'name'  => 'Acctest Flavour',
					'terms' => array( 'Vanilla', 'Choc' ),
				),
			),
			'defaults'             => array(
				'regular_price' => SGS_ACC_FLAT_PRICE,
			),
			'_sgs_test_fail_after' => 2,
		)
	);

	$http_status = (int) $result['status'];
	$data        = $result['data'];

	// Extract WP_Error code from the response data.
	$error_code = null;
	if ( is_array( $data ) ) {
		if ( isset( $data['code'] ) ) {
			$error_code = (string) $data['code'];
		} elseif ( isset( $data['data']['code'] ) ) {
			$error_code = (string) $data['data']['code'];
		}
	}

	$rolled_back = ( 500 === $http_status && 'sgs_provision_rolled_back' === $error_code );

	// Re-load the product to check post-rollback state.
	clean_post_cache( $pid );
	$product_after  = wc_get_product( $pid );
	$children_after = $product_after ? $product_after->get_children() : array( 'could not load product' );
	$orphan_count   = is_array( $children_after ) ? count( $children_after ) : -1;
	$attrs_after    = $product_after ? $product_after->get_attributes( 'edit' ) : null;

	// Parent-restored: attributes after rollback should be empty (same as before
	// provision, since the product started empty).
	$parent_restored = ( is_array( $attrs_after ) && count( $attrs_after ) === count( $attrs_before ) );

	$pass = $rolled_back && ( 0 === $orphan_count ) && $parent_restored;

	return array(
		'pass'              => $pass,
		'http_status'       => $http_status,
		'error_code'        => $error_code,
		'rolled_back'       => $rolled_back,
		'orphan_variations' => $orphan_count,
		'parent_restored'   => $parent_restored,
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. Suite 3 — Shared-taxonomy sibling safety
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Suite 3: Provision SIBLING with pa_acctest_size=[Small,Large]. Capture dump.
 * Then provision NEW with the SAME pa_acctest_size but terms [Small,Medium]
 * (adds a new term to the shared taxonomy). Re-dump SIBLING. Assert identical.
 *
 * @return array Suite result with pass/sibling_unchanged/differences.
 */
function sgs_acc_suite3_sibling_safety() {
	// ── Provision SIBLING with Small + Large ─────────────────────────────────
	$pid_sibling    = sgs_acc_fresh_variable_product( SGS_ACC_TITLE_SIBLING );
	$sibling_result = sgs_acc_call_provision(
		$pid_sibling,
		array(
			'attributes' => array(
				array(
					'name'  => 'Acctest Size',
					'terms' => array( 'Small', 'Large' ),
				),
			),
			'defaults'   => array(
				'regular_price' => SGS_ACC_FLAT_PRICE,
			),
		)
	);

	if ( 200 !== (int) $sibling_result['status'] ) {
		return array(
			'pass'              => false,
			'sibling_unchanged' => false,
			'differences'       => array( 'SIBLING provision failed with HTTP ' . (int) $sibling_result['status'] ),
		);
	}

	$dump_sibling_before = sgs_acc_dump( $pid_sibling );

	// ── Provision NEW with Small + Medium (adds Medium to shared taxonomy) ────
	$pid_new    = sgs_acc_fresh_variable_product( SGS_ACC_TITLE_NEW );
	$new_result = sgs_acc_call_provision(
		$pid_new,
		array(
			'attributes' => array(
				array(
					'name'  => 'Acctest Size',
					'terms' => array( 'Small', 'Medium' ),
				),
			),
			'defaults'   => array(
				'regular_price' => SGS_ACC_FLAT_PRICE,
			),
		)
	);

	if ( 200 !== (int) $new_result['status'] ) {
		return array(
			'pass'              => false,
			'sibling_unchanged' => false,
			'differences'       => array( 'NEW provision failed with HTTP ' . (int) $new_result['status'] ),
		);
	}

	// ── Re-dump SIBLING; its variations and attribute options must be unchanged ─
	clean_post_cache( $pid_sibling );
	$dump_sibling_after = sgs_acc_dump( $pid_sibling );

	$differences       = sgs_acc_deep_diff( $dump_sibling_before, $dump_sibling_after );
	$sibling_unchanged = empty( $differences );

	return array(
		'pass'              => $sibling_unchanged,
		'sibling_unchanged' => $sibling_unchanged,
		'differences'       => $differences,
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 15. Router
// ─────────────────────────────────────────────────────────────────────────────

header( 'Content-Type: application/json; charset=utf-8' );

// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- token-gate is the auth mechanism; nonce not applicable to one-shot runner.
$sgs_acc_action = isset( $_GET['action'] ) ? sanitize_key( $_GET['action'] ) : 'full_test';

if ( 'full_test' !== $sgs_acc_action ) {
	wp_send_json_error(
		array(
			'error'             => 'Unknown action: ' . esc_html( $sgs_acc_action ),
			'available_actions' => array( 'full_test' ),
		),
		400
	);
}

// Run all three suites. Cleanup runs regardless of failures via a try/finally
// pattern so the canary isn't polluted by partial runs.
$sgs_acc_results = array(
	'suite_1_golden_master_diff' => null,
	'suite_2_rollback'           => null,
	'suite_3_sibling_safety'     => null,
	'cleanup'                    => null,
);

try {
	$sgs_acc_results['suite_1_golden_master_diff'] = sgs_acc_suite1_golden_master_diff();
	$sgs_acc_results['suite_2_rollback']           = sgs_acc_suite2_rollback();
	$sgs_acc_results['suite_3_sibling_safety']     = sgs_acc_suite3_sibling_safety();
} finally {
	// Cleanup always runs — even if a suite bails via wp_send_json_error.
	$sgs_acc_results['cleanup'] = sgs_acc_cleanup();
}

$all_pass = isset( $sgs_acc_results['suite_1_golden_master_diff']['pass'] )
	&& (bool) $sgs_acc_results['suite_1_golden_master_diff']['pass']
	&& isset( $sgs_acc_results['suite_2_rollback']['pass'] )
	&& (bool) $sgs_acc_results['suite_2_rollback']['pass']
	&& isset( $sgs_acc_results['suite_3_sibling_safety']['pass'] )
	&& (bool) $sgs_acc_results['suite_3_sibling_safety']['pass'];

$sgs_acc_results['verdict'] = $all_pass ? 'PASS' : 'FAIL';

wp_send_json_success( $sgs_acc_results );
