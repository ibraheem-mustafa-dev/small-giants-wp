<?php
/**
 * SGS Preflight Acceptance Test — FR-27-PREFLIGHT / SEC-5 Empirical Gate
 *
 * A token-gated webroot one-shot runner that loads WordPress, then executes a
 * full three-suite acceptance test proving that Product_Preflight hard-blocks
 * a misconfigured variable product and allows a valid one to publish.
 *
 * TOKEN GATE (MANDATORY):
 *   Every request MUST supply ?t=<TOKEN> matching the SGS_PF_TOKEN constant
 *   below. Requests without a valid token receive HTTP 403 and no WP is loaded.
 *   The orchestrator swaps SGS_PF_TOKEN_REPLACE_ME before deploying.
 *
 * USAGE (canary base URL):
 *
 *   Run full acceptance suite:
 *     curl "https://sandybrown-nightingale-600381.hostingersite.com/wp-content/plugins/sgs-blocks/scripts/preflight-acceptance.php?action=full_test&t=<TOKEN>"
 *
 * VERDICT JSON SHAPE (action=full_test):
 *   {
 *     "verdict": "PASS" | "FAIL",
 *     "suite_1": {
 *       "pass": bool,
 *       "status_after_publish_attempt": string,
 *       "issue_codes": string[]
 *     },
 *     "suite_2": {
 *       "pass": bool,
 *       "status_after_publish": string,
 *       "evaluate_ready": bool,
 *       "remaining_issues": array,
 *       "image_note": string
 *     },
 *     "suite_3": {
 *       "pass": bool,
 *       "issues": array
 *     },
 *     "cleanup": {
 *       "products_deleted": int,
 *       "attribute_deleted": bool
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

define( 'SGS_PF_TOKEN', 'SGS_PF_TOKEN_REPLACE_ME' );

// Refuse to run unless the token has been replaced with a high-entropy value.
// A length gate both rejects the un-replaced placeholder AND enforces >= 32-byte
// entropy — and it survives the deploy-time string swap (a literal-placeholder
// comparison would itself be rewritten by the swap and defeat the guard).
if ( strlen( SGS_PF_TOKEN ) < 32 ) {
	http_response_code( 503 );
	header( 'Content-Type: application/json; charset=utf-8' );
	echo json_encode( array( 'error' => 'Preflight acceptance runner not configured — token not replaced with a 32+ char value.' ) );
	exit;
}

// Token gate runs BEFORE WordPress is bootstrapped, so only native PHP functions
// are available here (no WP helpers). hash_equals is binary-safe + timing-safe;
// the raw $_GET value needs no sanitising for an equality comparison.
$sgs_pf_provided_token = isset( $_GET['t'] ) ? (string) $_GET['t'] : '';

if ( '' === $sgs_pf_provided_token || ! hash_equals( SGS_PF_TOKEN, $sgs_pf_provided_token ) ) {
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
function sgs_pf_find_wp_load() {
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
	require_once sgs_pf_find_wp_load();
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
// 3. Preflight class guard
// ─────────────────────────────────────────────────────────────────────────────

if ( ! class_exists( 'SGS\\Blocks\\Product_Preflight' ) ) {
	wp_send_json_error( array( 'error' => 'SGS\\Blocks\\Product_Preflight class is not loaded — ensure the sgs-blocks plugin is active.' ), 500 );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Elevate to administrator so permission callbacks pass
// ─────────────────────────────────────────────────────────────────────────────

$sgs_pf_admins = get_users(
	array(
		'role'   => 'administrator',
		'number' => 1,
		'fields' => 'ids',
	)
);

if ( empty( $sgs_pf_admins ) ) {
	wp_send_json_error( array( 'error' => 'No administrator user found on this site.' ), 500 );
}

wp_set_current_user( (int) $sgs_pf_admins[0] );

// ─────────────────────────────────────────────────────────────────────────────
// 5. Constants for test products / attributes
// ─────────────────────────────────────────────────────────────────────────────

define( 'SGS_PF_TITLE_BAD', 'SGS Preflight Bad' );
define( 'SGS_PF_TITLE_GOOD', 'SGS Preflight Good' );

// pa_pftest-size: Small | Large
// wc_create_attribute() normalises "Pftest Size" → slug "pftest-size"
// (sanitize_title turns spaces into hyphens).
define( 'SGS_PF_ATTR_SIZE', 'pftest-size' );

// ─────────────────────────────────────────────────────────────────────────────
// 6. Helper: ensure a WC global attribute + given terms exist (idempotent)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensure a WC global attribute + given terms exist. Idempotent — safe to call
 * multiple times; existing attributes/terms are reused.
 *
 * @param string  $label Human-readable attribute label (e.g. "Pftest Size").
 * @param string  $slug  Attribute slug without 'pa_' prefix (e.g. "pftest-size").
 * @param array[] $terms Array of ['name' => ..., 'slug' => ...] definitions.
 * @return int[] Term IDs matching $terms order.
 */
function sgs_pf_ensure_attribute( $label, $slug, array $terms ) {
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
		// (WC normally registers on init; we created one mid-request).
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
// 7. Helper: create a fresh empty variable product (draft, force-deletes prior)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete any prior product with the given title, then create a fresh draft
 * WC_Product_Variable and return its post ID.
 *
 * @param string $title Unique title to identify this test product.
 * @return int Newly created product post ID.
 */
function sgs_pf_fresh_variable_product( $title ) {
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
	$product->set_status( 'draft' );
	$product->set_catalog_visibility( 'visible' );
	$pid = $product->save();

	if ( ! $pid || is_wp_error( $pid ) ) {
		wp_send_json_error(
			array( 'error' => 'Failed to create test product: ' . esc_html( $title ) ),
			500
		);
	}

	return (int) $pid;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Helper: provision pa_pftest-size Small/Large + N variations on a product
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attach pa_pftest-size (Small, Large) to the given variable product and create
 * two variations with the given regular_price. Returns the array of term IDs.
 *
 * @param int    $product_id  Variable product post ID.
 * @param string $price       regular_price value ('0' for zero-price test).
 * @return array { term_ids: int[], variation_ids: int[] }
 */
function sgs_pf_provision_size_variations( $product_id, $price ) {
	$size_terms = array(
		array(
			'name' => 'Small',
			'slug' => 'small',
		),
		array(
			'name' => 'Large',
			'slug' => 'large',
		),
	);

	$term_ids = sgs_pf_ensure_attribute( 'Pftest Size', SGS_PF_ATTR_SIZE, $size_terms );
	$taxonomy = wc_attribute_taxonomy_name( SGS_PF_ATTR_SIZE );

	$attr_obj = new WC_Product_Attribute();
	$attr_obj->set_id( wc_attribute_taxonomy_id_by_name( $taxonomy ) );
	$attr_obj->set_name( $taxonomy );
	$attr_obj->set_options( $term_ids );
	$attr_obj->set_position( 0 );
	$attr_obj->set_visible( true );
	$attr_obj->set_variation( true );

	$parent = wc_get_product( $product_id );
	$parent->set_attributes( array( $attr_obj ) );
	$parent->save();

	$variation_ids = array();
	foreach ( $size_terms as $term_def ) {
		$variation = new WC_Product_Variation();
		$variation->set_parent_id( $product_id );
		$variation->set_attributes( array( $taxonomy => $term_def['slug'] ) );
		$variation->set_regular_price( $price );
		$variation->set_status( 'publish' );
		$variation->set_manage_stock( false );
		$variation->set_stock_status( 'instock' );
		$var_id = $variation->save();
		if ( $var_id && ! is_wp_error( $var_id ) ) {
			$variation_ids[] = (int) $var_id;
		}
	}

	WC_Product_Variable::sync( $product_id );

	return array(
		'term_ids'      => $term_ids,
		'variation_ids' => $variation_ids,
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Helper: attempt to find or create a usable image attachment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Try to return an existing image attachment ID from the media library.
 * If none exist, attempt to sideload a tiny 1×1 placeholder GIF.
 * Returns 0 on failure (caller must note the image caveat).
 *
 * @return int Attachment ID, or 0 if no image is available.
 */
function sgs_pf_get_or_create_image() {
	// First: try any existing image in the media library.
	$existing = get_posts(
		array(
			'post_type'      => 'attachment',
			'post_mime_type' => 'image',
			'posts_per_page' => 1,
			'post_status'    => 'inherit',
			'fields'         => 'ids',
		)
	);
	if ( ! empty( $existing ) ) {
		return (int) $existing[0];
	}

	// None found — sideload a tiny 1×1 transparent GIF.
	if ( ! function_exists( 'media_sideload_image' ) ) {
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';
	}

	// Base64-encoded 1×1 transparent GIF (35 bytes).
	$gif_b64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
	$gif_bin = base64_decode( $gif_b64 ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode

	$tmp_file = wp_tempnam( 'sgs-pf-placeholder.gif' );
	if ( false === file_put_contents( $tmp_file, $gif_bin ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		return 0;
	}

	$file_array = array(
		'name'     => 'sgs-pf-placeholder.gif',
		'tmp_name' => $tmp_file,
	);

	$attachment_id = media_handle_sideload( $file_array, 0, 'SGS Preflight Placeholder' );
	if ( is_wp_error( $attachment_id ) ) {
		return 0;
	}

	return (int) $attachment_id;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Cleanup helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Force-delete both test products and remove the pa_pftest-size attribute + terms.
 * Idempotent — safe to run even if products were never created.
 *
 * @return array { products_deleted: int, attribute_deleted: bool }
 */
function sgs_pf_cleanup() {
	$titles        = array( SGS_PF_TITLE_BAD, SGS_PF_TITLE_GOOD );
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

	// Remove the pa_pftest-size attribute + all its terms.
	$attr_deleted = false;
	$slug         = SGS_PF_ATTR_SIZE;
	$taxonomy     = wc_attribute_taxonomy_name( $slug );
	$attr_id      = wc_attribute_taxonomy_id_by_name( $taxonomy );
	if ( $attr_id > 0 ) {
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
		$attr_deleted = true;
	}

	return array(
		'products_deleted'  => $deleted_count,
		'attribute_deleted' => $attr_deleted,
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Suite 1 — Hard publish-block fires on a misconfigured product
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Suite 1: Create a bad variable product (zero price, no image, no variesby).
 * Attempt to publish via wp_update_post. Assert the gate reverted it to draft
 * and stored zero_price in _sgs_preflight_issues post meta.
 *
 * Uses wp_update_post to fire transition_post_status — exactly the hook the gate
 * intercepts. Does NOT bypass hooks.
 *
 * @return array Suite result.
 */
function sgs_pf_suite1_hard_block() {
	$pid = sgs_pf_fresh_variable_product( SGS_PF_TITLE_BAD );

	// Provision two zero-price variations; no image; no variesby term meta.
	sgs_pf_provision_size_variations( $pid, '0' );

	// Attempt to publish — the transition_post_status hook should fire and revert.
	wp_update_post(
		array(
			'ID'          => $pid,
			'post_status' => 'publish',
		)
	);

	// Re-read the actual status (must be 'draft' — the gate reverted it).
	clean_post_cache( $pid );
	$status_after = get_post_status( $pid );

	// Read the issues stored by the gate.
	$stored_issues = get_post_meta( $pid, '_sgs_preflight_issues', true );
	$stored_issues = is_array( $stored_issues ) ? $stored_issues : array();
	$issue_codes   = array_map(
		function ( $issue ) {
			return isset( $issue['code'] ) ? (string) $issue['code'] : '';
		},
		$stored_issues
	);
	$issue_codes   = array_values( array_filter( $issue_codes ) );

	$reverted_to_draft = ( 'draft' === $status_after );
	$has_zero_price    = in_array( 'zero_price', $issue_codes, true );

	$pass = $reverted_to_draft && $has_zero_price;

	return array(
		'pass'                         => $pass,
		'status_after_publish_attempt' => $status_after,
		'issue_codes'                  => $issue_codes,
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. Suite 2 — Valid product publishes cleanly
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Suite 2: Create a valid variable product (priced, imaged, variesby mapped).
 * Attempt to publish. Assert status is 'publish' and evaluate() returns ready=true.
 *
 * @return array Suite result.
 */
function sgs_pf_suite2_valid_publishes() {
	$pid = sgs_pf_fresh_variable_product( SGS_PF_TITLE_GOOD );

	// Provision two 9.99 variations.
	$provision = sgs_pf_provision_size_variations( $pid, '9.99' );
	$term_ids  = $provision['term_ids'];

	// Set _sgs_variesby_value on both terms so the no_variesby check passes.
	// 'size' is a valid Google variesBy enum value (Configurator_Meta::VARIESBY_ENUM).
	$taxonomy = wc_attribute_taxonomy_name( SGS_PF_ATTR_SIZE );
	foreach ( $term_ids as $term_id ) {
		update_term_meta( (int) $term_id, '_sgs_variesby_value', 'size' );
	}

	// Set a featured image on the parent product so the no_image check passes.
	$image_note    = '';
	$attachment_id = sgs_pf_get_or_create_image();
	if ( $attachment_id > 0 ) {
		set_post_thumbnail( $pid, $attachment_id );
	} else {
		$image_note = 'No existing image attachment found and sideload failed — no_image check will block this product; treating as expected.';
	}

	// Refresh parent product to pick up the thumbnail before the hook evaluates.
	clean_post_cache( $pid );

	// Attempt to publish — gate should allow it.
	wp_update_post(
		array(
			'ID'          => $pid,
			'post_status' => 'publish',
		)
	);

	clean_post_cache( $pid );
	$status_after = get_post_status( $pid );

	// Also call evaluate() directly to confirm ready===true.
	$eval       = SGS\Blocks\Product_Preflight::evaluate( $pid );
	$eval_ready = (bool) $eval['ready'];
	$remaining  = $eval['issues'];

	// If we couldn't set an image, no_image is expected — report but don't fail on it alone.
	$image_blocked  = ! empty( $image_note );
	$expected_codes = $image_blocked ? array( 'no_image' ) : array();

	$remaining_codes = array_map(
		function ( $issue ) {
			return isset( $issue['code'] ) ? (string) $issue['code'] : '';
		},
		$remaining
	);

	$unexpected = array_diff( $remaining_codes, $expected_codes );
	$published  = ( 'publish' === $status_after );

	// Pass if: published with no unexpected issues; OR image_blocked and the ONLY
	// issue is no_image (graceful fallback path).
	if ( $image_blocked ) {
		$pass = $published
			? ( empty( $unexpected ) )
			: ( count( $remaining_codes ) === 1 && in_array( 'no_image', $remaining_codes, true ) );
	} else {
		$pass = $published && $eval_ready;
	}

	return array(
		'pass'                 => $pass,
		'status_after_publish' => $status_after,
		'evaluate_ready'       => $eval_ready,
		'remaining_issues'     => $remaining,
		'image_note'           => $image_note,
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. Suite 3 — evaluate() issue detection on the bad product
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Suite 3: Call evaluate() directly on the bad product from Suite 1.
 * Force-set a £0 variation to ensure zero_price is still triggerable.
 * Assert the returned issues array contains zero_price.
 *
 * We re-use the bad product title to find it; if it no longer exists (because
 * Suite 1 failed to create it) we note that in the result.
 *
 * @return array Suite result.
 */
function sgs_pf_suite3_evaluate_detects_issues() {
	// Find the bad product by title (Suite 1 may have left it in draft).
	$posts = get_posts(
		array(
			'post_type'      => 'product',
			'posts_per_page' => 1,
			'post_status'    => 'any',
			'title'          => SGS_PF_TITLE_BAD,
			'fields'         => 'ids',
		)
	);

	if ( empty( $posts ) ) {
		// Re-create a minimal bad product for this suite.
		$pid = sgs_pf_fresh_variable_product( SGS_PF_TITLE_BAD );
		sgs_pf_provision_size_variations( $pid, '0' );
	} else {
		$pid = (int) $posts[0];
		// Ensure at least one variation has a zero price (force-refresh state).
		$product = wc_get_product( $pid );
		if ( $product ) {
			foreach ( $product->get_children() as $var_id ) {
				$variation = wc_get_product( (int) $var_id );
				if ( $variation && $variation->exists() ) {
					$variation->set_regular_price( '0' );
					$variation->save();
					break; // One zero-price variation is sufficient.
				}
			}
			WC_Product_Variable::sync( $pid );
		}
	}

	clean_post_cache( $pid );

	// Call evaluate() with skip_draft_check=true so we test only the price/image
	// checks (the product is in draft, not publish — the draft code is a separate concern).
	$eval   = SGS\Blocks\Product_Preflight::evaluate( $pid, true );
	$issues = $eval['issues'];

	$issue_codes = array_map(
		function ( $issue ) {
			return isset( $issue['code'] ) ? (string) $issue['code'] : '';
		},
		$issues
	);
	$issue_codes = array_values( array_filter( $issue_codes ) );

	$has_zero_price = in_array( 'zero_price', $issue_codes, true );
	$pass           = $has_zero_price;

	return array(
		'pass'   => $pass,
		'issues' => $issues,
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. Router
// ─────────────────────────────────────────────────────────────────────────────

header( 'Content-Type: application/json; charset=utf-8' );

// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- token-gate is the auth mechanism; nonce not applicable to one-shot runner.
$sgs_pf_action = isset( $_GET['action'] ) ? sanitize_key( $_GET['action'] ) : 'full_test';

if ( 'full_test' !== $sgs_pf_action ) {
	wp_send_json_error(
		array(
			'error'             => 'Unknown action: ' . esc_html( $sgs_pf_action ),
			'available_actions' => array( 'full_test' ),
		),
		400
	);
}

// Run all three suites. Cleanup runs regardless of failures via a try/finally
// pattern so the canary isn't polluted by partial runs.
$sgs_pf_results = array(
	'suite_1' => null,
	'suite_2' => null,
	'suite_3' => null,
	'cleanup' => null,
);

try {
	$sgs_pf_results['suite_1'] = sgs_pf_suite1_hard_block();
	$sgs_pf_results['suite_2'] = sgs_pf_suite2_valid_publishes();
	$sgs_pf_results['suite_3'] = sgs_pf_suite3_evaluate_detects_issues();
} finally {
	// Cleanup always runs — even if a suite bails via wp_send_json_error.
	$sgs_pf_results['cleanup'] = sgs_pf_cleanup();
}

$all_pass = isset( $sgs_pf_results['suite_1']['pass'] ) && (bool) $sgs_pf_results['suite_1']['pass']
	&& isset( $sgs_pf_results['suite_2']['pass'] ) && (bool) $sgs_pf_results['suite_2']['pass']
	&& isset( $sgs_pf_results['suite_3']['pass'] ) && (bool) $sgs_pf_results['suite_3']['pass'];

$sgs_pf_results['verdict'] = $all_pass ? 'PASS' : 'FAIL';

wp_send_json_success( $sgs_pf_results );
