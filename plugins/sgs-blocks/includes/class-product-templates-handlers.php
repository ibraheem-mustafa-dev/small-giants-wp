<?php
/**
 * SGS Product Templates — REST handler implementations for the three POST routes.
 *
 * Extracted from class-product-templates.php to keep both files under the
 * 300-line limit (code-quality.md rule). Product_Templates requires this file
 * before registering routes; no external code should reference this class directly.
 *
 * The three handlers here are called by Product_Templates as the REST callbacks
 * for:
 *   POST /sgs/v1/product-templates
 *   POST /sgs/v1/product-templates/import
 *   POST /sgs/v1/product-templates/{id}/apply
 *
 * GET /sgs/v1/product-templates/{id}/export (thin read-only) lives in
 * Product_Templates itself because it has no WC dependency.
 *
 * @package SGS\Blocks
 * @since   1.8.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-product-templates-envelope.php';
require_once __DIR__ . '/class-product-templates-validators.php';
require_once __DIR__ . '/class-product-templates-helpers.php';
require_once __DIR__ . '/class-product-templates-apply.php';

/**
 * Handler implementations for the three mutable product-template REST routes.
 *
 * @internal Used only by Product_Templates.
 */
final class Product_Templates_Handlers {

	// ── POST /sgs/v1/product-templates ────────────────────────────────────────

	/**
	 * Snapshot an existing variable product into a new template CPT post.
	 *
	 * @param \WP_REST_Request $request    Incoming REST request.
	 * @param \WP_Error|null   $nonce_error WP_Error if nonce check already failed; null otherwise.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function create_from_product( \WP_REST_Request $request, $nonce_error ) {
		if ( null !== $nonce_error ) {
			return $nonce_error;
		}

		if ( ! \function_exists( 'wc_get_product' ) ) {
			return new \WP_Error( 'sgs_wc_unavailable', \__( 'WooCommerce is not active.', 'sgs-blocks' ), array( 'status' => 503 ) );
		}

		$product_id = (int) $request['product_id'];
		$product    = \wc_get_product( $product_id );
		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return new \WP_Error( 'sgs_invalid_product', \__( 'Variable product not found.', 'sgs-blocks' ), array( 'status' => 404 ) );
		}

		$envelope = Product_Templates_Helpers::snapshot_product( $product );
		if ( \is_wp_error( $envelope ) ) {
			return $envelope;
		}

		$title       = \sanitize_text_field( (string) $request['title'] );
		$template_id = Product_Templates_Helpers::save_template( $title, $envelope );
		if ( \is_wp_error( $template_id ) ) {
			return $template_id;
		}

		return new \WP_REST_Response( array( 'template_id' => $template_id ), 201 );
	}

	// ── POST /sgs/v1/product-templates/import ─────────────────────────────────

	/**
	 * Validate an envelope from another site and store it as a new template post.
	 *
	 * @param \WP_REST_Request $request    Incoming REST request.
	 * @param \WP_Error|null   $nonce_error WP_Error if nonce check already failed; null otherwise.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function import_template( \WP_REST_Request $request, $nonce_error ) {
		if ( null !== $nonce_error ) {
			return $nonce_error;
		}

		// The REST framework decodes JSON bodies automatically.
		// 'envelope' is declared type=>object in the route args, so WP gives us an array.
		$raw_envelope = $request['envelope'];
		if ( ! is_array( $raw_envelope ) ) {
			return new \WP_Error( 'sgs_invalid_envelope', \__( 'Envelope must be a JSON object.', 'sgs-blocks' ), array( 'status' => 400 ) );
		}

		// Pass the raw body so the MAX_PAYLOAD_BYTES (256 KB) size guard fires.
		$envelope_errors = Product_Templates_Envelope::validate( $raw_envelope, (string) $request->get_body() );
		if ( ! empty( $envelope_errors ) ) {
			return new \WP_Error(
				'sgs_envelope_invalid',
				\__( 'Envelope validation failed.', 'sgs-blocks' ),
				array(
					'status' => 400,
					'errors' => $envelope_errors,
				)
			);
		}

		$envelope = Product_Templates_Validators::sanitise( $raw_envelope );

		$title = \sanitize_text_field( (string) $request['title'] );
		if ( '' === $title ) {
			// Fall back to generator string, then a generic label.
			$title = isset( $envelope['generator'] ) && '' !== $envelope['generator']
				? \__( 'Imported from ', 'sgs-blocks' ) . $envelope['generator']
				: \__( 'Imported Template', 'sgs-blocks' );
		}

		$template_id = Product_Templates_Helpers::save_template( $title, $envelope );
		if ( \is_wp_error( $template_id ) ) {
			return $template_id;
		}

		return new \WP_REST_Response( array( 'template_id' => $template_id ), 201 );
	}

	// ── POST /sgs/v1/product-templates/{id}/apply ─────────────────────────────

	/**
	 * Apply a stored template to a target variable product on this site.
	 *
	 * Two-phase flow controlled by the `confirm` request param:
	 *   confirm=false (default) — dry-run: plain-English summary of what WOULD be
	 *     created + what is NOT carried (images). No writes occur.
	 *   confirm=true — performs the apply: provisions via R2's code path (rollback
	 *     ledger + upsert-dedup inherited), then writes presentation meta.
	 *
	 * `starting_price` (optional decimal string): forwarded to R2 defaults so
	 * every new variation gets a price. Without it, variations are created
	 * priceless and PREFLIGHT will hold the product unpublished (correct behaviour
	 * — stated in the response message).
	 *
	 * @param \WP_REST_Request $request      Incoming REST request.
	 * @param \WP_Error|null   $nonce_error  WP_Error if nonce check already failed; null otherwise.
	 * @param string           $post_type    CPT slug for ownership check.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function apply_template( \WP_REST_Request $request, $nonce_error, string $post_type ) {
		if ( null !== $nonce_error ) {
			return $nonce_error;
		}

		if ( ! \function_exists( 'wc_get_product' ) ) {
			return new \WP_Error( 'sgs_wc_unavailable', \__( 'WooCommerce is not active.', 'sgs-blocks' ), array( 'status' => 503 ) );
		}

		// Load + validate the template.
		$template_id = (int) $request['id'];
		$post        = \get_post( $template_id );
		if ( ! $post || $post_type !== $post->post_type ) {
			return new \WP_Error( 'sgs_template_not_found', \__( 'Template not found.', 'sgs-blocks' ), array( 'status' => 404 ) );
		}

		$envelope = \json_decode( $post->post_content, true );
		if ( ! is_array( $envelope ) ) {
			return new \WP_Error( 'sgs_template_corrupt', \__( 'Template envelope is corrupt.', 'sgs-blocks' ), array( 'status' => 500 ) );
		}

		$stored_errors = Product_Templates_Envelope::validate( $envelope );
		if ( ! empty( $stored_errors ) ) {
			return new \WP_Error(
				'sgs_template_corrupt',
				\__( 'Stored template envelope is invalid.', 'sgs-blocks' ),
				array(
					'status' => 500,
					'errors' => $stored_errors,
				)
			);
		}

		$envelope = Product_Templates_Validators::sanitise( $envelope );

		// Validate the target product.
		$product_id = (int) $request['product_id'];
		$product    = \wc_get_product( $product_id );
		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return new \WP_Error( 'sgs_invalid_product', \__( 'Target variable product not found.', 'sgs-blocks' ), array( 'status' => 404 ) );
		}

		$confirm = (bool) ( isset( $request['confirm'] ) ? $request['confirm'] : false );

		// Normalise an explicit JSON null to '' — a bare (string) cast would
		// otherwise risk producing the literal string 'null'.
		$starting_price_raw = $request['starting_price'] ?? '';
		$starting_price     = \sanitize_text_field(
			null === $starting_price_raw ? '' : (string) $starting_price_raw
		);

		// ── Dry-run (confirm=false): return summary, no writes ─────────────────
		if ( ! $confirm ) {
			return new \WP_REST_Response( self::dry_run_summary( $envelope, $product_id, $starting_price ), 200 );
		}

		// ── Live apply (confirm=true) ──────────────────────────────────────────

		// Step 1: Provision attributes + terms via R2.
		$provision_response = Product_Templates_Apply::call_provision(
			$product_id,
			$envelope['attributes'],
			$request,
			$starting_price
		);
		if ( \is_wp_error( $provision_response ) ) {
			return $provision_response;
		}
		$provision_data = $provision_response->get_data();

		// Step 2: Apply product-level presentation meta (allow-listed _sgs_* only).
		$presentation_applied = Product_Templates_Apply::apply_presentation_meta( $product_id, $envelope );

		// Step 3: Apply term-level swatch colours + variesby.
		$term_meta_result = Product_Templates_Apply::apply_term_swatches( $envelope['attributes'] );

		$message = '' !== $starting_price
			? \__( 'Template applied. Variations created with the supplied starting price.', 'sgs-blocks' )
			: \__( 'Template applied. No starting price supplied — variations will be created without prices, and the product will stay unpublished until prices are set (see the Variations tab).', 'sgs-blocks' );

		// Pricing-policy settings never travel in a template (META_DENY_LIST:
		// _sgs_pack_k + _sgs_pack_sizes — shop-local pricing config).
		$message .= ' ' . \__( 'Note: pack pricing settings are not carried over — configure pricing for this shop after applying.', 'sgs-blocks' );

		// card_link is ADVISORY — no automatic page write occurs; the operator
		// sets sourceMode/productId on the page's product-card block themselves.
		return new \WP_REST_Response(
			array(
				'product_id'           => $product_id,
				'provisioned'          => $provision_data,
				'presentation_applied' => $presentation_applied,
				'term_meta_applied'    => $term_meta_result,
				'slug_remapped'        => $term_meta_result['slug_remapped'],
				'not_carried'          => $term_meta_result['not_carried'],
				'card_link'            => array(
					'sourceMode' => 'wc-product',
					'productId'  => $product_id,
				),
				'message'              => $message,
			),
			200
		);
	}

	// ── Dry-run ───────────────────────────────────────────────────────────────

	/**
	 * Build a plain-English-ready dry-run summary. No writes.
	 *
	 * @param array  $envelope       Sanitised envelope.
	 * @param int    $product_id     Target product ID.
	 * @param string $starting_price Optional starting price string.
	 * @return array
	 */
	private static function dry_run_summary( array $envelope, int $product_id, string $starting_price ): array {
		$attr_summary = array();
		foreach ( $envelope['attributes'] as $attr ) {
			$attr_summary[] = array(
				'attribute'  => $attr['name'],
				'slug'       => $attr['slug'],
				'term_count' => count( $attr['terms'] ),
				'term_names' => \array_column( $attr['terms'], 'name' ),
			);
		}
		$presentation_keys = \array_keys( (array) ( $envelope['presentation'] ?? array() ) );

		return array(
			'status'              => 'dry_run',
			'product_id'          => $product_id,
			'would_provision'     => $attr_summary,
			'presentation_fields' => $presentation_keys,
			'starting_price'      => '' !== $starting_price ? $starting_price : null,
			'starting_price_note' => '' === $starting_price
				? \__( 'No starting price supplied — variations will be created without prices, and the product will stay unpublished until prices are set (see the Variations tab).', 'sgs-blocks' )
				: null,
			'not_carried'         => Product_Templates_Apply::NOT_CARRIED_NOTES,
			'message'             => \__( 'Dry run complete. Pass confirm=true to perform this apply.', 'sgs-blocks' ),
		);
	}
}
