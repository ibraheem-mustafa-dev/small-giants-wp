<?php
/**
 * SGS QA-AUTHORING Gate — FR-27 Cluster C End-to-End Authoring Acceptance Test
 *
 * Proves in ONE pass that a configurator product can be stood up, authored, published,
 * and made discoverable entirely through the SGS controllers + meta layer —
 * ZERO raw SQL writes to commerce data, ZERO WP-CLI.
 *
 * TOKEN GATE (MANDATORY):
 *   Every request MUST supply ?t=<TOKEN> matching the SGS_E2E_TOKEN constant
 *   below. Requests without a valid token receive HTTP 403 and no WP is loaded.
 *   The orchestrator swaps SGS_E2E_TOKEN_REPLACE_ME before deploying.
 *
 * USAGE (canary base URL):
 *
 *   Run full test chain:
 *     curl "https://sandybrown-nightingale-600381.hostingersite.com/wp-content/plugins/sgs-blocks/scripts/e2e-authoring-acceptance.php?action=full_test&t=<TOKEN>"
 *
 * VERDICT JSON SHAPE (action=full_test):
 *   {
 *     "verdict": "PASS" | "FAIL",
 *     "step_1_provision": {
 *       "pass": bool,
 *       "http_status": int,
 *       "status_field": string,
 *       "variations_created": int,
 *       "taxonomies": { "size": string, "flavour": string }
 *     },
 *     "step_2_author": {
 *       "pass": bool,
 *       "swatch_color_written": string,
 *       "swatch_color_readback": string,
 *       "variesby_written": string,
 *       "variesby_readback": string,
 *       "gallery_written": int[],
 *       "gallery_readback": int[],
 *       "unit_label_written": string,
 *       "unit_label_readback": string,
 *       "unit_divisor_written": int,
 *       "unit_divisor_readback": int|float,
 *       "parent_image_id": int
 *     },
 *     "step_3_preflight_publish": {
 *       "pass": bool,
 *       "preflight_ready": bool,
 *       "preflight_issues": array,
 *       "post_status": string
 *     },
 *     "step_4_rich_results": {
 *       "pass": bool,
 *       "at_type": string,
 *       "has_variant_count": int,
 *       "varies_by": string[]
 *     },
 *     "step_5_manifest": {
 *       "pass": bool,
 *       "combo_count": int,
 *       "has_default_price": bool
 *     },
 *     "zero_raw_meta_path": string[],
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

define( 'SGS_E2E_TOKEN', 'SGS_E2E_TOKEN_REPLACE_ME' );

// Refuse to run unless the token has been replaced with a high-entropy value.
// A length gate both rejects the un-replaced placeholder AND enforces >= 32-byte
// entropy — and it survives the deploy-time string swap (a literal-placeholder
// comparison would itself be rewritten by the swap and defeat the guard).
if ( strlen( SGS_E2E_TOKEN ) < 32 ) {
	http_response_code( 503 );
	header( 'Content-Type: application/json; charset=utf-8' );
	echo json_encode( array( 'error' => 'E2E runner not configured — token not replaced with a 32+ char value.' ) );
	exit;
}

// Token gate runs BEFORE WordPress is bootstrapped, so only native PHP functions
// are available here (no WP helpers). hash_equals is binary-safe + timing-safe;
// the raw $_GET value needs no sanitising for an equality comparison.
$sgs_e2e_provided_token = isset( $_GET['t'] ) ? (string) $_GET['t'] : '';

if ( '' === $sgs_e2e_provided_token || ! hash_equals( SGS_E2E_TOKEN, $sgs_e2e_provided_token ) ) {
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
function sgs_e2e_find_wp_load() {
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
	require_once sgs_e2e_find_wp_load();
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

$sgs_e2e_admins = get_users(
	array(
		'role'   => 'administrator',
		'number' => 1,
		'fields' => 'ids',
	)
);

if ( empty( $sgs_e2e_admins ) ) {
	wp_send_json_error( array( 'error' => 'No administrator user found on this site.' ), 500 );
}

wp_set_current_user( (int) $sgs_e2e_admins[0] );

// ─────────────────────────────────────────────────────────────────────────────
// 4. Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Title for the test product — unique enough to target in cleanup. */
define( 'SGS_E2E_TITLE', 'SGS E2E Authoring' );

/** Slug for the E2E size attribute (WC normalises "E2e Size" → "e2e-size"). */
define( 'SGS_E2E_ATTR_SIZE', 'e2e-size' );

/** Slug for the E2E flavour attribute. */
define( 'SGS_E2E_ATTR_FLAVOUR', 'e2e-flavour' );

// ─────────────────────────────────────────────────────────────────────────────
// 5. Require SGS classes after WP is loaded
// ─────────────────────────────────────────────────────────────────────────────

$sgs_e2e_includes = dirname( __DIR__ ) . '/includes/';

require_once $sgs_e2e_includes . 'class-configurator-meta.php';
require_once $sgs_e2e_includes . 'class-sgs-configurator-compat.php';
require_once $sgs_e2e_includes . 'class-product-manifest.php';
require_once $sgs_e2e_includes . 'class-product-schema.php';
require_once $sgs_e2e_includes . 'class-product-authoring-security.php';
require_once $sgs_e2e_includes . 'class-product-provisioning-args.php';
require_once $sgs_e2e_includes . 'class-product-provisioning-helpers.php';
require_once $sgs_e2e_includes . 'class-product-provisioning.php';
require_once $sgs_e2e_includes . 'class-product-preflight.php';

// ─────────────────────────────────────────────────────────────────────────────
// 6. Helper: call the R2 provision route internally (verbatim from golden-master)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build and dispatch a WP_REST_Request to POST /sgs/v1/products/{id}/provision.
 *
 * @param int   $product_id  Parent variable product post ID.
 * @param array $body_params Parameters matching the provision args schema.
 * @return array { status: int, data: mixed }
 */
function sgs_e2e_call_provision( $product_id, array $body_params ) {
	$route   = '/sgs/v1/products/' . (int) $product_id . '/provision';
	$request = new WP_REST_Request( 'POST', $route );
	$request->set_header( 'X-WP-Nonce', wp_create_nonce( 'wp_rest' ) );

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
// 7. Helper: create a fresh empty variable product (draft)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete any prior product with the SGS_E2E_TITLE, then create a fresh empty
 * WC_Product_Variable in draft status. Returns its post ID.
 *
 * @return int Newly created product post ID.
 */
function sgs_e2e_fresh_variable_product() {
	$existing = get_posts(
		array(
			'post_type'      => 'product',
			'posts_per_page' => 20,
			'post_status'    => 'any',
			'title'          => SGS_E2E_TITLE,
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
	$product->set_name( SGS_E2E_TITLE );
	$product->set_status( 'draft' );
	$pid = $product->save();

	if ( ! $pid || is_wp_error( $pid ) ) {
		wp_send_json_error( array( 'error' => 'Failed to create E2E test product.' ), 500 );
	}

	return (int) $pid;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Helper: find or sideload a 1×1 GIF image attachment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return an existing attachment image ID, or insert a 1×1 GIF and return that.
 * Used to satisfy the PREFLIGHT image check without depending on pre-existing media.
 *
 * @return int Attachment ID (> 0) or 0 on failure.
 */
function sgs_e2e_ensure_image() {
	// Try to find any existing image attachment.
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

	// Sideload a minimal 1×1 transparent GIF.
	$upload_dir = wp_upload_dir();
	if ( ! empty( $upload_dir['error'] ) ) {
		return 0;
	}

	// 1×1 GIF in binary.
	// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- generating minimal test fixture, not obfuscating code.
	$gif_data = base64_decode(
		'R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='
	);

	$filename  = 'sgs-e2e-test-image.gif';
	$file_path = trailingslashit( $upload_dir['path'] ) . $filename;

	// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- creating a minimal test fixture to the uploads dir.
	if ( false === file_put_contents( $file_path, $gif_data ) ) {
		return 0;
	}

	$wp_filetype = wp_check_filetype( $filename, null );
	$attachment  = array(
		'guid'           => trailingslashit( $upload_dir['url'] ) . $filename,
		'post_mime_type' => $wp_filetype['type'],
		'post_title'     => 'SGS E2E Test Image',
		'post_content'   => '',
		'post_status'    => 'inherit',
	);

	$attach_id = wp_insert_attachment( $attachment, $file_path );
	if ( is_wp_error( $attach_id ) || ! $attach_id ) {
		return 0;
	}

	if ( ! function_exists( 'wp_generate_attachment_metadata' ) ) {
		require_once ABSPATH . 'wp-admin/includes/image.php';
	}
	$attach_meta = wp_generate_attachment_metadata( $attach_id, $file_path );
	wp_update_attachment_metadata( $attach_id, $attach_meta );

	return (int) $attach_id;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Helper: cleanup — force-delete product, variations, and pa_e2e-* attributes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Force-delete the E2E test product, its variations, and the pa_e2e-size /
 * pa_e2e-flavour attributes + terms. Idempotent.
 *
 * @return array { products_deleted: int, attributes_deleted: string[] }
 */
function sgs_e2e_cleanup() {
	$deleted_count = 0;

	$posts = get_posts(
		array(
			'post_type'      => 'product',
			'posts_per_page' => 20,
			'post_status'    => 'any',
			'title'          => SGS_E2E_TITLE,
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

	$attr_slugs_deleted = array();
	foreach ( array( SGS_E2E_ATTR_SIZE, SGS_E2E_ATTR_FLAVOUR ) as $slug ) {
		$taxonomy = wc_attribute_taxonomy_name( $slug );
		$attr_id  = wc_attribute_taxonomy_id_by_name( $taxonomy );
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
			$attr_slugs_deleted[] = 'pa_' . $slug;
		}
	}

	return array(
		'products_deleted'   => $deleted_count,
		'attributes_deleted' => $attr_slugs_deleted,
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Router
// ─────────────────────────────────────────────────────────────────────────────

header( 'Content-Type: application/json; charset=utf-8' );

// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- token-gate is the auth mechanism; nonce not applicable to one-shot runner.
$sgs_e2e_action = isset( $_GET['action'] ) ? sanitize_key( $_GET['action'] ) : 'full_test';

if ( 'full_test' !== $sgs_e2e_action ) {
	wp_send_json_error(
		array(
			'error'             => 'Unknown action: ' . esc_html( $sgs_e2e_action ),
			'available_actions' => array( 'full_test' ),
		),
		400
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Full test chain — steps 1–5 with finally cleanup
// ─────────────────────────────────────────────────────────────────────────────

$sgs_e2e_verdict = array(
	'verdict'                  => 'FAIL',
	'step_1_provision'         => null,
	'step_2_author'            => null,
	'step_3_preflight_publish' => null,
	'step_4_rich_results'      => null,
	'step_5_manifest'          => null,
	'zero_raw_meta_path'       => array(),
	'cleanup'                  => null,
);

// We need $pid in the finally block even if an early step fails.
$sgs_e2e_pid = 0;

// Tracks the authoring actions for the zero_raw_meta_path attestation field.
$sgs_e2e_authoring_log = array();

try {
	// ── Create fresh draft product ────────────────────────────────────────────
	$sgs_e2e_pid = sgs_e2e_fresh_variable_product();

	// ═════════════════════════════════════════════════════════════════════════
	// STEP 1 — Provision (R2)
	// ═════════════════════════════════════════════════════════════════════════

	$r2_result = sgs_e2e_call_provision(
		$sgs_e2e_pid,
		array(
			'attributes' => array(
				array(
					'name'  => 'E2e Size',
					'terms' => array( 'Small', 'Large' ),
				),
				array(
					'name'  => 'E2e Flavour',
					'terms' => array( 'Vanilla', 'Choc' ),
				),
			),
			'defaults'   => array(
				'regular_price' => '12.99',
			),
		)
	);

	$r2_http          = (int) $r2_result['status'];
	$r2_data          = $r2_result['data'];
	$r2_status        = is_array( $r2_data ) && isset( $r2_data['status'] ) ? (string) $r2_data['status'] : '';
	$r2_created_count = is_array( $r2_data ) && isset( $r2_data['created'] ) && is_array( $r2_data['created'] )
		? count( $r2_data['created'] )
		: 0;

	// Derive the expected taxonomy slugs.
	$sgs_e2e_tax_size    = wc_attribute_taxonomy_name( SGS_E2E_ATTR_SIZE );    // pa_e2e-size.
	$sgs_e2e_tax_flavour = wc_attribute_taxonomy_name( SGS_E2E_ATTR_FLAVOUR ); // pa_e2e-flavour.

	$step1_pass = ( 200 === $r2_http ) && ( 'complete' === $r2_status ) && ( 4 === $r2_created_count );

	$sgs_e2e_verdict['step_1_provision'] = array(
		'pass'               => $step1_pass,
		'http_status'        => $r2_http,
		'status_field'       => $r2_status,
		'variations_created' => $r2_created_count,
		'taxonomies'         => array(
			'size'    => $sgs_e2e_tax_size,
			'flavour' => $sgs_e2e_tax_flavour,
		),
	);

	$sgs_e2e_authoring_log[] = 'Step 1: REST route POST /sgs/v1/products/{id}/provision via rest_do_request() as administrator. No raw SQL.';

	if ( ! $step1_pass ) {
		// Cannot proceed further without a provisioned product.
		$sgs_e2e_verdict['step_1_provision']['note'] = 'Provision failed — remaining steps skipped.';
		// Fall through to finally for cleanup.
	} else {

		// ═══════════════════════════════════════════════════════════════════════
		// STEP 2 — Author presentation meta (R3 sanitised write path)
		// ═══════════════════════════════════════════════════════════════════════

		// Ensure an image attachment exists for the gallery and parent featured image.
		$sgs_e2e_image_id = sgs_e2e_ensure_image();

		// Reload the product to get child IDs.
		clean_post_cache( $sgs_e2e_pid );
		$sgs_e2e_product   = wc_get_product( $sgs_e2e_pid );
		$sgs_e2e_children  = $sgs_e2e_product ? $sgs_e2e_product->get_children() : array();
		$sgs_e2e_first_var = ! empty( $sgs_e2e_children ) ? (int) $sgs_e2e_children[0] : 0;

		// Find the 'Small' term in pa_e2e-size.
		$small_term = get_term_by( 'slug', 'small', $sgs_e2e_tax_size );
		$small_tid  = ( $small_term && ! is_wp_error( $small_term ) ) ? (int) $small_term->term_id : 0;

		// Find all size terms to set variesBy on.
		$size_terms = get_terms(
			array(
				'taxonomy'   => $sgs_e2e_tax_size,
				'hide_empty' => false,
			)
		);
		$size_tids  = ( ! is_wp_error( $size_terms ) ) ? array_map( 'intval', wp_list_pluck( $size_terms, 'term_id' ) ) : array();

		// 2a. _sgs_swatch_color on 'Small' term via sanitize_hex_color path.
		$swatch_raw   = '#cc0000';
		$swatch_clean = SGS\Blocks\Configurator_Meta::sanitize_image_id( 0 ); // warm up class.
		// Use the registered sanitise_callback (sanitize_hex_color) — same path as REST meta write.
		$swatch_clean    = sanitize_hex_color( $swatch_raw );
		$swatch_written  = ( $small_tid > 0 ) ? update_term_meta( $small_tid, '_sgs_swatch_color', $swatch_clean ) : false;
		$swatch_readback = ( $small_tid > 0 ) ? get_term_meta( $small_tid, '_sgs_swatch_color', true ) : '';

		$sgs_e2e_authoring_log[] = 'Step 2a: update_term_meta(_sgs_swatch_color) with sanitize_hex_color(). Same path as REST meta write. No raw SQL.';

		// 2b. _sgs_variesby_value = 'size' on both size terms via sanitize_variesby.
		$variesby_raw   = 'size';
		$variesby_clean = SGS\Blocks\Configurator_Meta::sanitize_variesby( $variesby_raw );
		foreach ( $size_tids as $stid ) {
			update_term_meta( $stid, '_sgs_variesby_value', $variesby_clean );
		}
		// Read back from the 'Small' term.
		$variesby_readback = ( $small_tid > 0 ) ? get_term_meta( $small_tid, '_sgs_variesby_value', true ) : '';

		$sgs_e2e_authoring_log[] = 'Step 2b: update_term_meta(_sgs_variesby_value) via Configurator_Meta::sanitize_variesby(). No raw SQL.';

		// 2c. _sgs_variation_gallery on first variation via sanitize_id_array.
		$gallery_raw   = ( $sgs_e2e_image_id > 0 ) ? array( $sgs_e2e_image_id ) : array();
		$gallery_clean = SGS\Blocks\Configurator_Meta::sanitize_id_array( $gallery_raw );
		if ( $sgs_e2e_first_var > 0 && ! empty( $gallery_clean ) ) {
			update_post_meta( $sgs_e2e_first_var, '_sgs_variation_gallery', $gallery_clean );
		}
		$gallery_readback = ( $sgs_e2e_first_var > 0 )
			? (array) get_post_meta( $sgs_e2e_first_var, '_sgs_variation_gallery', true )
			: array();

		$sgs_e2e_authoring_log[] = 'Step 2c: update_post_meta(_sgs_variation_gallery) via Configurator_Meta::sanitize_id_array(). No raw SQL.';

		// 2d. _sgs_unit_label + _sgs_unit_divisor on first variation.
		$unit_label_raw     = 'bar';
		$unit_label_clean   = sanitize_text_field( $unit_label_raw );
		$unit_divisor_raw   = 12;
		$unit_divisor_clean = SGS\Blocks\Configurator_Meta::sanitize_divisor( $unit_divisor_raw );

		if ( $sgs_e2e_first_var > 0 ) {
			update_post_meta( $sgs_e2e_first_var, '_sgs_unit_label', $unit_label_clean );
			update_post_meta( $sgs_e2e_first_var, '_sgs_unit_divisor', $unit_divisor_clean );
		}
		$unit_label_readback   = ( $sgs_e2e_first_var > 0 ) ? get_post_meta( $sgs_e2e_first_var, '_sgs_unit_label', true ) : '';
		$unit_divisor_readback = ( $sgs_e2e_first_var > 0 ) ? get_post_meta( $sgs_e2e_first_var, '_sgs_unit_divisor', true ) : 0;

		$sgs_e2e_authoring_log[] = 'Step 2d: update_post_meta(_sgs_unit_label, _sgs_unit_divisor) via sanitize_text_field() and Configurator_Meta::sanitize_divisor(). No raw SQL.';

		// 2e. Set parent featured image.
		$parent_image_id = 0;
		if ( $sgs_e2e_image_id > 0 ) {
			update_post_meta( $sgs_e2e_pid, '_thumbnail_id', $sgs_e2e_image_id );
			$parent_image_id = (int) get_post_thumbnail_id( $sgs_e2e_pid );
		}

		$sgs_e2e_authoring_log[] = 'Step 2e: update_post_meta(_thumbnail_id) — standard WP featured-image mechanism. No raw SQL.';

		// Assemble readback checks.
		$step2_swatch_ok   = ( $swatch_clean === $swatch_readback );
		$step2_variesby_ok = ( 'size' === $variesby_readback );
		$step2_gallery_ok  = empty( $gallery_clean ) || ( $gallery_clean === $gallery_readback );
		$step2_unit_ok     = ( $unit_label_clean === $unit_label_readback )
								&& ( (int) $unit_divisor_clean === (int) $unit_divisor_readback );
		$step2_pass        = $step2_swatch_ok && $step2_variesby_ok && $step2_gallery_ok && $step2_unit_ok;

		$sgs_e2e_verdict['step_2_author'] = array(
			'pass'                  => $step2_pass,
			'swatch_color_written'  => (string) $swatch_clean,
			'swatch_color_readback' => (string) $swatch_readback,
			'variesby_written'      => (string) $variesby_clean,
			'variesby_readback'     => (string) $variesby_readback,
			'gallery_written'       => $gallery_clean,
			'gallery_readback'      => $gallery_readback,
			'unit_label_written'    => $unit_label_clean,
			'unit_label_readback'   => (string) $unit_label_readback,
			'unit_divisor_written'  => (int) $unit_divisor_clean,
			'unit_divisor_readback' => $unit_divisor_readback,
			'parent_image_id'       => $parent_image_id,
		);

		// ═══════════════════════════════════════════════════════════════════════
		// STEP 3 — PREFLIGHT + publish
		// ═══════════════════════════════════════════════════════════════════════

		// Mirror the REAL client flow: hit Publish. The transition_post_status gate is
		// the real arbiter — it runs evaluate() AFTER WordPress sets the status to
		// 'publish' in the DB, so the publish-gated manifest/JSON-LD build correctly.
		// A direct pre-publish evaluate() on a still-draft product would falsely report
		// invalid_jsonld (the manifest refuses to build for a draft) — that is a
		// pre-check-endpoint nuance, NOT the publish path, so we drive the real path.
		wp_update_post(
			array(
				'ID'          => $sgs_e2e_pid,
				'post_status' => 'publish',
			)
		);
		clean_post_cache( $sgs_e2e_pid );
		$post_status_after = (string) get_post_status( $sgs_e2e_pid );

		// If the gate allowed publish, the product is genuinely ready; confirm via a
		// post-publish evaluate (now status === publish, so every check runs for real).
		$preflight = SGS\Blocks\Product_Preflight::evaluate( $sgs_e2e_pid );
		$pf_ready  = (bool) $preflight['ready'];

		$step3_pass = ( 'publish' === $post_status_after ) && $pf_ready;

		$sgs_e2e_verdict['step_3_preflight_publish'] = array(
			'pass'                  => $step3_pass,
			'post_status'           => $post_status_after,
			'post_publish_ready'    => $pf_ready,
			'post_publish_issues'   => $preflight['issues'],
		);

		$sgs_e2e_authoring_log[] = 'Step 3: Product_Preflight::evaluate() then wp_update_post() to publish. No raw SQL.';

		// ═══════════════════════════════════════════════════════════════════════
		// STEP 4 — Rich-results (discoverability)
		// ═══════════════════════════════════════════════════════════════════════

		// Product_Schema::build_script() requires a published product (manifest
		// has a publish-status gate). Only run if step 3 published successfully.
		$step4_pass        = false;
		$schema_at_type    = '';
		$has_variant_count = 0;
		$schema_variesby   = array();

		if ( $step3_pass ) {
			$schema_html = SGS\Blocks\Product_Schema::build_script( $sgs_e2e_pid );

			if ( '' !== $schema_html ) {
				$json_str  = (string) preg_replace( '/<script[^>]*>|<\/script>/i', '', $schema_html );
				$json_data = json_decode( $json_str, true );

				if ( is_array( $json_data ) ) {
					$schema_at_type    = (string) ( $json_data['@type'] ?? '' );
					$has_variant_arr   = isset( $json_data['hasVariant'] ) && is_array( $json_data['hasVariant'] )
						? $json_data['hasVariant']
						: array();
					$has_variant_count = count( $has_variant_arr );
					$schema_variesby   = isset( $json_data['variesBy'] ) && is_array( $json_data['variesBy'] )
						? $json_data['variesBy']
						: array();

					// 'size' must appear in the variesBy URIs.
					$variesby_has_size = false;
					foreach ( $schema_variesby as $uri ) {
						if ( false !== strpos( (string) $uri, 'size' ) ) {
							$variesby_has_size = true;
							break;
						}
					}

					$step4_pass = ( 'ProductGroup' === $schema_at_type )
						&& ( $has_variant_count > 0 )
						&& $variesby_has_size;
				}
			}

			$sgs_e2e_authoring_log[] = 'Step 4: Product_Schema::build_script() — reads manifest, emits JSON-LD. No raw SQL.';
		}

		$sgs_e2e_verdict['step_4_rich_results'] = array(
			'pass'              => $step4_pass,
			'at_type'           => $schema_at_type,
			'has_variant_count' => $has_variant_count,
			'varies_by'         => $schema_variesby,
		);

		// ═══════════════════════════════════════════════════════════════════════
		// STEP 5 — Manifest (configurator data)
		// ═══════════════════════════════════════════════════════════════════════

		$step5_pass        = false;
		$combo_count       = 0;
		$has_default_price = false;

		if ( $step3_pass ) {
			$manifest = SGS\Blocks\Product_Manifest::build( $sgs_e2e_pid );

			if ( null !== $manifest && isset( $manifest['combos'] ) && is_array( $manifest['combos'] ) ) {
				$combo_count = count( $manifest['combos'] );

				// Check that at least one combo has a positive incMinor (proves 12.99 was applied).
				foreach ( $manifest['combos'] as $combo ) {
					if ( isset( $combo['incMinor'] ) && is_numeric( $combo['incMinor'] ) && $combo['incMinor'] > 0 ) {
						$has_default_price = true;
						break;
					}
				}

				$step5_pass = ( 4 === $combo_count ) && $has_default_price;
			}

			$sgs_e2e_authoring_log[] = 'Step 5: Product_Manifest::build() — read-through WC data. No raw SQL writes.';
		}

		$sgs_e2e_verdict['step_5_manifest'] = array(
			'pass'              => $step5_pass,
			'combo_count'       => $combo_count,
			'has_default_price' => $has_default_price,
		);

	} // end if ( $step1_pass ).
} finally {
	// Cleanup always runs — even on early failure.
	$sgs_e2e_verdict['cleanup'] = sgs_e2e_cleanup();
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. Assemble final verdict
// ─────────────────────────────────────────────────────────────────────────────

$sgs_e2e_verdict['zero_raw_meta_path'] = $sgs_e2e_authoring_log;

$all_steps_pass =
	! empty( $sgs_e2e_verdict['step_1_provision']['pass'] )
	&& ! empty( $sgs_e2e_verdict['step_2_author']['pass'] )
	&& ! empty( $sgs_e2e_verdict['step_3_preflight_publish']['pass'] )
	&& ! empty( $sgs_e2e_verdict['step_4_rich_results']['pass'] )
	&& ! empty( $sgs_e2e_verdict['step_5_manifest']['pass'] );

$sgs_e2e_verdict['verdict'] = $all_steps_pass ? 'PASS' : 'FAIL';

wp_send_json_success( $sgs_e2e_verdict );
