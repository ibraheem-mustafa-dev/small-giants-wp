<?php
/**
 * SGS Product Provisioning — REST controller for FR-27-R2: conflict-safe
 * attribute/term provisioning, Cartesian variation generation with upsert
 * dedup, and full transactional rollback.
 *
 * Routes (under the sgs/v1 namespace):
 *   POST /sgs/v1/products/{id}/provision          → provision
 *   POST /sgs/v1/products/{id}/variations/bulk    → bulk_update
 *
 * Security chain (both routes):
 *   1. permission_callback — per-object edit_post($id) (IDOR-safe)
 *      provision also requires manage_woocommerce (global taxonomy writes).
 *   2. X-WP-Nonce header — wp_verify_nonce('wp_rest') — CSRF
 *   3. Per-user fixed-window rate-limit via transients (shared with R1:
 *      60 REQUESTS / 60 s, transient key sgs_pa_rl_{user_id}; note one provision
 *      request may create up to MAX_VARIATIONS variations — the cap, not the
 *      rate-limit, bounds per-request write volume)
 *   4. Multisite guard + WooCommerce availability check
 *
 * All WC writes go through set_*() + save() — never raw postmeta for commerce
 * data. The upsert-key meta (_sgs_variation_upsert_key) is SGS bookkeeping and
 * written via update_post_meta() directly.
 *
 * Companion files (required by this class — each owns its own dependency graph):
 *   class-product-authoring-security.php  — shared security chain + lookup regen
 *   class-product-provisioning-args.php   — arg schemas, validators, cartesian, upsert key
 *   class-product-provisioning-helpers.php — taxonomy resolution, term upsert, snapshots
 *
 * @package SGS\Blocks
 * @since   1.7.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-product-authoring-security.php';
require_once __DIR__ . '/class-product-provisioning-args.php';
require_once __DIR__ . '/class-product-provisioning-helpers.php';
require_once __DIR__ . '/class-configurator-meta.php';

/**
 * Registers and handles the product-provisioning REST endpoints.
 */
final class Product_Provisioning {

	/** REST namespace — matches every other SGS endpoint. */
	const REST_NAMESPACE = 'sgs/v1';

	/**
	 * Wire the REST init hook. Called once from sgs-blocks.php.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	// ── Route registration ────────────────────────────────────────────────────

	/**
	 * Register both provisioning routes.
	 *
	 * @return void
	 */
	public static function register_routes(): void {
		// Attribute + term provisioning + Cartesian variation generation.
		\register_rest_route(
			self::REST_NAMESPACE,
			'/products/(?P<id>\d+)/provision',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'provision' ),
				'permission_callback' => array( __CLASS__, 'can_provision' ),
				'args'                => Product_Provisioning_Args::provision_args(),
			)
		);

		// Bulk-edit existing variations (field updates only; no taxonomy writes).
		\register_rest_route(
			self::REST_NAMESPACE,
			'/products/(?P<id>\d+)/variations/bulk',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'bulk_update' ),
				'permission_callback' => array( __CLASS__, 'can_edit_product' ),
				'args'                => Product_Provisioning_Args::bulk_args(),
			)
		);
	}

	// ── Permission callbacks ──────────────────────────────────────────────────

	/**
	 * Provision requires BOTH per-object edit_post AND manage_woocommerce
	 * (creating global pa_* taxonomies is shop-level configuration).
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return bool|\WP_Error
	 */
	public static function can_provision( \WP_REST_Request $request ) {
		if ( ! \current_user_can( 'edit_post', (int) $request['id'] ) ) {
			return new \WP_Error(
				'rest_forbidden',
				\__( 'You do not have permission to edit this product.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}
		if ( ! \current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- manage_woocommerce is a registered WooCommerce capability.
			return new \WP_Error(
				'rest_forbidden',
				\__( 'You need the manage_woocommerce capability to provision attributes.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}
		return true;
	}

	/**
	 * Bulk-update requires only per-object edit_post (no taxonomy writes).
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return bool|\WP_Error
	 */
	public static function can_edit_product( \WP_REST_Request $request ) {
		return Product_Authoring_Security::can_edit_product( $request );
	}

	// ── provision handler ─────────────────────────────────────────────────────

	/**
	 * POST /sgs/v1/products/{id}/provision
	 *
	 * Provisions attributes + terms, generates the Cartesian variation set with
	 * upsert dedup, and wraps everything in a transactional rollback ledger.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function provision( \WP_REST_Request $request ) {
		$product_id = (int) $request['id'];

		// Upper-bound the variation-units this call may create from the raw request
		// input (product of per-attribute term counts), capped at MAX_VARIATIONS so
		// the rate-limit budget is charged per-variation, not per-request. This
		// mirrors the projected-combo pre-gate in run_provision(); the cap matches
		// the hard combo ceiling enforced there before any writes occur.
		$projected_units = 1;
		foreach ( (array) $request['attributes'] as $attr_data ) {
			$tcount           = ( isset( $attr_data['terms'] ) && \is_array( $attr_data['terms'] ) )
				? \count( $attr_data['terms'] )
				: 0;
			$projected_units *= \max( 1, $tcount );
		}
		$projected_units = \min( $projected_units, Product_Provisioning_Args::MAX_VARIATIONS );

		$error = Product_Authoring_Security::security_chain( $request, $product_id, $projected_units );
		if ( null !== $error ) {
			return $error;
		}

		$product = \wc_get_product( $product_id );
		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return new \WP_Error(
				'sgs_invalid_product',
				\__( 'Variable product not found.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}

		$incoming_attrs = (array) $request['attributes'];
		$defaults       = \is_array( $request['defaults'] ) ? $request['defaults'] : array();
		$overrides      = \is_array( $request['overrides'] ) ? $request['overrides'] : array();
		$dry_run        = (bool) ( isset( $request['dry_run'] ) ? $request['dry_run'] : false );

		// ── Dry-run: compute plan without writing ────────────────────────────
		if ( $dry_run ) {
			return self::dry_run_response( $product, $incoming_attrs );
		}

		// ── Transactional orchestration ──────────────────────────────────────
		$ledger          = array(
			'attributes' => array(), // Attribute IDs created this request.
			'terms'      => array(), // Term entries created this request.
			'variations' => array(), // Variation IDs created this request.
		);
		$parent_snapshot = Product_Provisioning_Helpers::capture_parent_snapshot( $product );

		try {
			$result = self::run_provision(
				$product,
				$product_id,
				$incoming_attrs,
				$defaults,
				$overrides,
				$ledger,
				$request
			);
		} catch ( \Throwable $e ) {
			$failed_deletes = self::rollback( $ledger, $parent_snapshot, $product );

			$message = \sprintf(
				/* translators: %s: internal error message. */
				\__( 'Provisioning failed and was rolled back. Reason: %s', 'sgs-blocks' ),
				$e->getMessage()
			);

			$error_data = array(
				'status'                 => 500,
				'created'                => \count( $ledger['variations'] ),
				'rolled_back_variations' => $ledger['variations'],
			);

			// A failed delete leaves an orphan variation — do NOT report a clean
			// rollback. Surface the affected IDs so an operator can clean up.
			if ( ! empty( $failed_deletes ) ) {
				$error_data['rollback_incomplete']    = true;
				$error_data['orphaned_variations']    = $failed_deletes;
				$error_data['rolled_back_variations'] = \array_values(
					\array_diff( $ledger['variations'], $failed_deletes )
				);

				$message .= ' ' . \sprintf(
					/* translators: %s: comma-separated list of variation IDs. */
					\__( 'Rollback incomplete — manual cleanup required: variation IDs %s.', 'sgs-blocks' ),
					\implode( ', ', $failed_deletes )
				);
			}

			return new \WP_Error(
				'sgs_provision_rolled_back',
				$message,
				$error_data
			);
		}

		return new \WP_REST_Response( $result, 200 );
	}

	// ── Core provisioning logic ───────────────────────────────────────────────

	/**
	 * Resolve attributes/terms, generate Cartesian combos, upsert variations.
	 * Mutates $ledger in-place for rollback tracking.
	 *
	 * @param \WC_Product_Variable $product        Parent product.
	 * @param int                  $product_id     Parent product ID.
	 * @param array                $incoming_attrs Caller-supplied attribute defs.
	 * @param array                $defaults       Default commerce fields.
	 * @param array                $overrides      Per-combo field overrides.
	 * @param array                &$ledger        Rollback ledger (mutated).
	 * @param \WP_REST_Request     $request        Full request (for test-fail hook).
	 * @return array Response data array.
	 * @throws \RuntimeException On any unrecoverable failure — caller must rollback.
	 */
	private static function run_provision(
		\WC_Product_Variable $product,
		int $product_id,
		array $incoming_attrs,
		array $defaults,
		array $overrides,
		array &$ledger,
		\WP_REST_Request $request
	): array {
		$wc_attr_map            = array();
		$cartesian_groups       = array();
		$attributes_provisioned = array();
		$terms_created          = array();

		// ── 0. Pre-gate combo count from the RAW input, BEFORE any writes ────
		// (FR-27-R2: the cap must reject an over-large request before a single
		// taxonomy or term is created. The post-resolution cartesian at step 2
		// re-checks against the actual de-duplicated slugs.)
		$projected = 1;
		foreach ( $incoming_attrs as $attr_data ) {
			$tcount     = ( isset( $attr_data['terms'] ) && \is_array( $attr_data['terms'] ) )
				? \count( $attr_data['terms'] )
				: 0;
			$projected *= \max( 1, $tcount );
		}
		if ( $projected > Product_Provisioning_Args::MAX_VARIATIONS ) {
			// phpcs:disable WordPress.Security.EscapeOutput.ExceptionNotEscaped -- message goes to catch block, never to output.
			throw new \RuntimeException(
				\sprintf(
					/* translators: 1: projected combo count, 2: max. */
					\__( 'Requested combinations (%1$d) exceed the maximum of %2$d.', 'sgs-blocks' ),
					$projected,
					Product_Provisioning_Args::MAX_VARIATIONS
				)
			);
			// phpcs:enable WordPress.Security.EscapeOutput.ExceptionNotEscaped
		}

		// ── 1. Resolve taxonomy + terms for each requested attribute ─────────
		foreach ( $incoming_attrs as $attr_data ) {
			$name            = \sanitize_text_field( (string) $attr_data['name'] );
			$explicit_tax    = isset( $attr_data['taxonomy'] )
				? \sanitize_text_field( (string) $attr_data['taxonomy'] )
				: null;
			$requested_terms = \is_array( $attr_data['terms'] ) ? $attr_data['terms'] : array();

			$tax_result = Product_Provisioning_Helpers::resolve_taxonomy( $name, $explicit_tax );
			if ( \is_wp_error( $tax_result ) ) {
				// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- message goes to catch block, never to output.
				throw new \RuntimeException( $tax_result->get_error_message() );
			}

			$taxonomy = $tax_result['taxonomy'];
			if ( null !== $tax_result['created_attr_id'] ) {
				$ledger['attributes'][]   = $tax_result['created_attr_id'];
				$attributes_provisioned[] = $taxonomy;
			}

			// Compute the Google variesBy mapping once per axis. $name carries the
			// caller-supplied attribute name (e.g. 'Size', 'Colour') and $taxonomy
			// the resolved pa_* slug — map_axis_to_variesby() tries both so a raw
			// name like 'Colour' and a slug like 'pa_colour' both resolve to 'color'.
			$variesby_mapped = self::map_axis_to_variesby( $name );
			if ( '' === $variesby_mapped ) {
				$variesby_mapped = self::map_axis_to_variesby( $taxonomy );
			}

			$term_ids   = array();
			$term_slugs = array();
			foreach ( $requested_terms as $term_name ) {
				$term_name   = \sanitize_text_field( (string) $term_name );
				$term_result = Product_Provisioning_Helpers::ensure_term( $term_name, $taxonomy );
				if ( \is_wp_error( $term_result ) ) {
					// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- message goes to catch block, never to output.
					throw new \RuntimeException( $term_result->get_error_message() );
				}
				$term_id    = $term_result['term_id'];
				$term_ids[] = $term_id;
				if ( $term_result['created'] ) {
					$ledger['terms'][] = array(
						'term_id'  => $term_id,
						'taxonomy' => $taxonomy,
					);
					$terms_created[]   = $term_name;
				}

				// Auto-set variesBy on this term when the axis maps to a Google enum
				// value AND the term has no existing _sgs_variesby_value. Applied to
				// both freshly-created terms and pre-existing terms with an empty value
				// so a freshly-provisioned product passes the PREFLIGHT no_variesby
				// check without an operator having to set each term manually.
				// NEVER overwrites an existing non-empty value (operator intent wins).
				// Note: _sgs_variesby_value is term-meta on the GLOBAL pa_* taxonomy
				// term, so the value applies wherever that term is used across products.
				// That is correct: variesBy describes the ATTRIBUTE (a "Size" term varies
				// by 'size' for every product), so a shared, consistent value is desired.
				if ( '' !== $variesby_mapped ) {
					$existing_variesby = \get_term_meta( $term_id, '_sgs_variesby_value', true );
					if ( '' === $existing_variesby || false === $existing_variesby ) {
						\update_term_meta(
							$term_id,
							'_sgs_variesby_value',
							Configurator_Meta::sanitize_variesby( $variesby_mapped )
						);
					}
				}

				$term = \get_term( $term_id, $taxonomy );
				if ( $term && ! \is_wp_error( $term ) ) {
					$term_slugs[] = $term->slug;
				}
			}

			// Build the WC_Product_Attribute for this taxonomy.
			$wc_attr = new \WC_Product_Attribute();
			$wc_attr->set_id( \wc_attribute_taxonomy_id_by_name( $taxonomy ) );
			$wc_attr->set_name( $taxonomy );
			$wc_attr->set_options( $term_ids );
			$wc_attr->set_position( \count( $wc_attr_map ) );
			$wc_attr->set_visible( true );
			$wc_attr->set_variation( true );
			$wc_attr_map[ $taxonomy ] = $wc_attr;

			$cartesian_groups[] = array(
				'taxonomy' => $taxonomy,
				'slugs'    => $term_slugs,
			);
		}

		// ── 2. Combo count gate (before any writes) ──────────────────────────
		$combos = Product_Provisioning_Args::cartesian( $cartesian_groups );
		if ( \count( $combos ) > Product_Provisioning_Args::MAX_VARIATIONS ) {
			// phpcs:disable WordPress.Security.EscapeOutput.ExceptionNotEscaped -- message goes to catch block, never to output.
			throw new \RuntimeException(
				\sprintf(
					/* translators: 1: combo count, 2: max. */
					\__( 'Cartesian product yields %1$d combinations; maximum is %2$d.', 'sgs-blocks' ),
					\count( $combos ),
					Product_Provisioning_Args::MAX_VARIATIONS
				)
			);
			// phpcs:enable WordPress.Security.EscapeOutput.ExceptionNotEscaped
		}

		// ── 3. Build existing-key set for dedup ──────────────────────────────
		$existing_keys = array();
		foreach ( $product->get_children() as $child_id ) {
			$child_id  = (int) $child_id;
			$saved_key = \get_post_meta( $child_id, '_sgs_variation_upsert_key', true );
			if ( '' !== $saved_key ) {
				$existing_keys[ $saved_key ] = $child_id;
			} else {
				// Legacy variation — compute key from its attributes and treat as existing.
				$child = \wc_get_product( $child_id );
				if ( $child && $child->is_type( 'variation' ) ) {
					$computed_key = Product_Provisioning_Args::upsert_key( $child->get_attributes() );
					if ( '' !== $computed_key ) {
						$existing_keys[ $computed_key ] = $child_id;
						// Backfill the meta so next time we hit the fast path.
						\update_post_meta( $child_id, '_sgs_variation_upsert_key', $computed_key );
					}
				}
			}
		}

		// ── 4. Create new variations + injected-failure test hook ────────────
		$created          = array();
		$skipped_existing = 0;
		$test_fail_after  = self::test_fail_threshold( $request );
		$write_count      = 0;

		foreach ( $combos as $combo ) {
			$upsert_key = Product_Provisioning_Args::upsert_key( $combo );
			if ( isset( $existing_keys[ $upsert_key ] ) ) {
				++$skipped_existing;
				continue;
			}

			$variation = new \WC_Product_Variation();
			$variation->set_parent_id( $product_id );
			$variation->set_attributes( $combo );

			$field_error = self::apply_defaults_and_overrides( $variation, $defaults, $overrides, $upsert_key );
			if ( null !== $field_error ) {
				// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- message goes to catch block, never to output.
				throw new \RuntimeException( $field_error->get_error_message() ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
			}

			$variation->save();
			$vid = $variation->get_id();
			\update_post_meta( $vid, '_sgs_variation_upsert_key', $upsert_key );
			$ledger['variations'][] = $vid;
			$created[]              = $vid;
			++$write_count;

			// Injected test-failure hook (only when explicitly enabled by a filter).
			if ( $test_fail_after > 0 && $write_count >= $test_fail_after ) {
				throw new \RuntimeException( 'injected test failure' );
			}
		}

		// ── 5. Save parent attributes + cache busting ────────────────────────
		// MERGE with the product's existing attribute set rather than replacing
		// it: a re-run that supplies a SUBSET of attributes must never drop an
		// attribute the product already had (that would orphan its variations).
		// For an attribute present in both, UNION the term options — never
		// silently remove a term that may already back a variation.
		$merged_attrs = $product->get_attributes( 'edit' );
		foreach ( $wc_attr_map as $tax => $incoming_attr ) {
			if ( isset( $merged_attrs[ $tax ] ) ) {
				$union_opts = \array_values(
					\array_unique(
						\array_merge(
							(array) $merged_attrs[ $tax ]->get_options(),
							$incoming_attr->get_options()
						)
					)
				);
				$merged_attrs[ $tax ]->set_options( $union_opts );
				$merged_attrs[ $tax ]->set_variation( true );
				$merged_attrs[ $tax ]->set_visible( true );
			} else {
				$merged_attrs[ $tax ] = $incoming_attr;
			}
		}
		$product->set_attributes( $merged_attrs );
		$product->save();
		\wc_delete_product_transients( $product_id );
		Product_Authoring_Security::trigger_lookup_regen( $product );

		return array(
			'status'                 => 'complete',
			'total_combos'           => \count( $combos ),
			'created'                => $created,
			'skipped_existing'       => $skipped_existing,
			'attributes_provisioned' => $attributes_provisioned,
			'terms_created'          => $terms_created,
			'failed'                 => array(),
			'message'                => \sprintf(
				/* translators: 1: created count, 2: skipped count. */
				\__( 'Provisioning complete. %1$d variation(s) created, %2$d already existed.', 'sgs-blocks' ),
				\count( $created ),
				$skipped_existing
			),
		);
	}

	/**
	 * Apply defaults then per-combo overrides to a new variation via WC setters.
	 * Returns a WP_Error for domain-rule violations (sale >= regular), null on success.
	 *
	 * @param \WC_Product_Variation $variation  The unsaved variation.
	 * @param array                 $defaults   Default field map.
	 * @param array                 $overrides  Per-upsert-key override map.
	 * @param string                $upsert_key The combo's upsert key.
	 * @return \WP_Error|null
	 */
	private static function apply_defaults_and_overrides(
		\WC_Product_Variation $variation,
		array $defaults,
		array $overrides,
		string $upsert_key
	) {
		// Merge defaults with any per-combo overrides (overrides win).
		$combo_override = isset( $overrides[ $upsert_key ] ) && \is_array( $overrides[ $upsert_key ] )
			? $overrides[ $upsert_key ]
			: array();
		$fields         = \array_merge( $defaults, $combo_override );

		if ( ! empty( $fields['regular_price'] ) ) {
			$variation->set_regular_price( \wc_format_decimal( $fields['regular_price'] ) );
		}

		if ( isset( $fields['sale_price'] ) && '' !== $fields['sale_price'] ) {
			$sale_num = (float) \wc_format_decimal( $fields['sale_price'] );
			if ( $sale_num > 0 ) {
				$reg_num = (float) \wc_format_decimal(
					! empty( $fields['regular_price'] )
						? $fields['regular_price']
						: $variation->get_regular_price()
				);
				if ( $reg_num > 0 && $sale_num >= $reg_num ) {
					return new \WP_Error(
						'sgs_invalid_price',
						\__( 'Sale price must be lower than the regular price.', 'sgs-blocks' ),
						array( 'status' => 400 )
					);
				}
			}
			$variation->set_sale_price( \wc_format_decimal( $fields['sale_price'] ) );
		}

		if ( isset( $fields['manage_stock'] ) ) {
			$variation->set_manage_stock( (bool) $fields['manage_stock'] );
		}
		if ( ! empty( $fields['stock_status'] ) ) {
			$variation->set_stock_status( \sanitize_text_field( (string) $fields['stock_status'] ) );
		}

		return null;
	}

	/**
	 * Build a dry-run response (plan only, no writes).
	 *
	 * @param \WC_Product_Variable $product        Parent product.
	 * @param array                $incoming_attrs Caller-supplied attribute defs.
	 * @return \WP_REST_Response
	 */
	private static function dry_run_response(
		\WC_Product_Variable $product,
		array $incoming_attrs
	): \WP_REST_Response {
		$groups = array();
		foreach ( $incoming_attrs as $attr_data ) {
			$name         = \sanitize_text_field( (string) $attr_data['name'] );
			$explicit_tax = isset( $attr_data['taxonomy'] )
				? \sanitize_text_field( (string) $attr_data['taxonomy'] )
				: null;
			$slug         = null !== $explicit_tax && '' !== $explicit_tax
				? $explicit_tax
				: \wc_attribute_taxonomy_name( \wc_sanitize_taxonomy_name( $name ) );
			$term_slugs   = array();
			foreach ( (array) $attr_data['terms'] as $t ) {
				$term_slugs[] = \sanitize_title( (string) $t );
			}
			$groups[] = array(
				'taxonomy' => $slug,
				'slugs'    => $term_slugs,
			);
		}

		$combos           = Product_Provisioning_Args::cartesian( $groups );
		$total_combos     = \count( $combos );
		$skipped_existing = 0;
		$would_create     = array();
		$existing_keys    = array();

		foreach ( $product->get_children() as $child_id ) {
			$saved = \get_post_meta( (int) $child_id, '_sgs_variation_upsert_key', true );
			if ( '' !== $saved ) {
				$existing_keys[ $saved ] = true;
			}
		}
		foreach ( $combos as $combo ) {
			$k = Product_Provisioning_Args::upsert_key( $combo );
			if ( isset( $existing_keys[ $k ] ) ) {
				++$skipped_existing;
			} else {
				$would_create[] = $k;
			}
		}

		return new \WP_REST_Response(
			array(
				'status'           => 'dry_run',
				'total_combos'     => $total_combos,
				'would_create'     => $would_create,
				'skipped_existing' => $skipped_existing,
				'message'          => \sprintf(
					/* translators: 1: would-create count, 2: skipped count. */
					\__( 'Dry run: %1$d variation(s) would be created, %2$d already exist.', 'sgs-blocks' ),
					\count( $would_create ),
					$skipped_existing
				),
			),
			200
		);
	}

	// ── bulk_update handler ───────────────────────────────────────────────────

	/**
	 * POST /sgs/v1/products/{id}/variations/bulk
	 *
	 * Applies field updates to multiple existing variations. The entire batch is
	 * covered by a rollback ledger: on failure, every touched variation is
	 * restored to its pre-request state.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function bulk_update( \WP_REST_Request $request ) {
		$product_id = (int) $request['id'];

		// One variation-unit per item: each bulk item writes exactly one existing
		// variation, so the rate-limit is charged the item count (the validator
		// guarantees a non-empty array; the count is the true write volume).
		$bulk_units = \count( (array) $request['items'] );

		$error = Product_Authoring_Security::security_chain( $request, $product_id, \max( 1, $bulk_units ) );
		if ( null !== $error ) {
			return $error;
		}

		$product = \wc_get_product( $product_id );
		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return new \WP_Error(
				'sgs_invalid_product',
				\__( 'Variable product not found.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}

		$items   = (array) $request['items'];
		$created = array();
		$failed  = array();
		// Snapshot: variation_id => prior field values for rollback.
		$snapshots = array();

		try {
			foreach ( $items as $item ) {
				$vid       = (int) $item['variation_id'];
				$variation = \wc_get_product( $vid );

				if ( ! $variation || ! $variation->is_type( 'variation' )
					|| $variation->get_parent_id() !== $product_id ) {
					$failed[] = array(
						'variation_id' => $vid,
						'error'        => \__( 'Variation not found or does not belong to this product.', 'sgs-blocks' ),
					);
					continue;
				}

				// Capture pre-write snapshot for rollback.
				$snapshots[ $vid ] = array(
					'regular_price'  => $variation->get_regular_price( 'edit' ),
					'sale_price'     => $variation->get_sale_price( 'edit' ),
					'sku'            => $variation->get_sku( 'edit' ),
					'manage_stock'   => $variation->get_manage_stock( 'edit' ),
					'stock_quantity' => $variation->get_stock_quantity( 'edit' ),
					'stock_status'   => $variation->get_stock_status( 'edit' ),
					'description'    => $variation->get_description( 'edit' ),
				);

				$field_error = self::apply_bulk_item( $item, $variation );
				if ( null !== $field_error ) {
					$failed[] = array(
						'variation_id' => $vid,
						'error'        => $field_error->get_error_message(),
					);
					continue;
				}

				$variation->save();
				$created[] = $vid;
			}

			$product->save();
		} catch ( \Throwable $e ) {
			// Restore every touched variation to its pre-request state.
			self::rollback_bulk( $snapshots );
			return new \WP_Error(
				'sgs_bulk_rolled_back',
				\sprintf(
					/* translators: %s: internal error message. */
					\__( 'Bulk update failed and was rolled back. Reason: %s', 'sgs-blocks' ),
					$e->getMessage()
				),
				array( 'status' => 500 )
			);
		}

		\wc_delete_product_transients( $product_id );
		Product_Authoring_Security::trigger_lookup_regen( $product );

		return new \WP_REST_Response(
			array(
				'status'  => 'complete',
				'updated' => $created,
				'failed'  => $failed,
				'message' => \sprintf(
					/* translators: 1: updated count, 2: failed count. */
					\__( 'Bulk update complete. %1$d updated, %2$d failed.', 'sgs-blocks' ),
					\count( $created ),
					\count( $failed )
				),
			),
			200
		);
	}

	/**
	 * Apply fields from a single bulk-item onto a variation via WC setters.
	 * Mirrors R1's apply_variation_fields semantics (sale<regular guard,
	 * duplicate-SKU catch, wc_format_decimal). Returns WP_Error or null.
	 *
	 * @param array                 $item      The bulk item array from request.
	 * @param \WC_Product_Variation $variation Loaded variation.
	 * @return \WP_Error|null
	 */
	private static function apply_bulk_item( array $item, \WC_Product_Variation $variation ) {
		if ( isset( $item['regular_price'] ) && '' !== $item['regular_price'] ) {
			$variation->set_regular_price( \wc_format_decimal( $item['regular_price'] ) );
		}
		if ( isset( $item['sale_price'] ) && '' !== $item['sale_price'] ) {
			$sale_num = (float) \wc_format_decimal( $item['sale_price'] );
			if ( $sale_num > 0 ) {
				$reg_num = (float) \wc_format_decimal(
					isset( $item['regular_price'] ) && '' !== $item['regular_price']
						? $item['regular_price']
						: $variation->get_regular_price()
				);
				if ( $reg_num > 0 && $sale_num >= $reg_num ) {
					return new \WP_Error(
						'sgs_invalid_price',
						\__( 'Sale price must be lower than the regular price.', 'sgs-blocks' ),
						array( 'status' => 400 )
					);
				}
			}
			$variation->set_sale_price( \wc_format_decimal( $item['sale_price'] ) );
		}
		if ( isset( $item['sku'] ) ) {
			try {
				$variation->set_sku( \sanitize_text_field( (string) $item['sku'] ) );
			} catch ( \WC_Data_Exception $e ) {
				return new \WP_Error(
					'sgs_duplicate_sku',
					$e->getMessage(),
					array( 'status' => 400 )
				);
			}
		}
		if ( isset( $item['manage_stock'] ) ) {
			$variation->set_manage_stock( (bool) $item['manage_stock'] );
		}
		if ( isset( $item['stock_quantity'] ) ) {
			$variation->set_stock_quantity( \absint( $item['stock_quantity'] ) );
		}
		if ( isset( $item['stock_status'] ) ) {
			$variation->set_stock_status( \sanitize_text_field( (string) $item['stock_status'] ) );
		}
		if ( isset( $item['description'] ) ) {
			$variation->set_description( \wp_kses_post( (string) $item['description'] ) );
		}
		return null;
	}

	// ── Rollback ──────────────────────────────────────────────────────────────

	/**
	 * Roll back a failed provision() call.
	 *
	 * Conservative: only deletes/removes entries that were created THIS request.
	 * Never touches pre-existing terms, attributes, or variations.
	 *
	 * @param array                $ledger          Provision ledger.
	 * @param array                $parent_snapshot From capture_parent_snapshot().
	 * @param \WC_Product_Variable $product         Parent product.
	 * @return int[] Variation IDs that FAILED to delete (empty array = clean rollback).
	 */
	private static function rollback(
		array $ledger,
		array $parent_snapshot,
		\WC_Product_Variable $product
	): array {
		// 1. Delete created variations. wp_delete_post() returns the deleted post
		// object on success, or false/null on failure — capture each so a failed
		// delete is surfaced rather than silently reported as a clean rollback.
		$failed_deletes = array();
		foreach ( $ledger['variations'] as $vid ) {
			$vid     = (int) $vid;
			$deleted = \wp_delete_post( $vid, true );
			if ( ! $deleted ) {
				$failed_deletes[] = $vid;
			}
		}

		// 2. Restore parent attributes.
		Product_Provisioning_Helpers::restore_parent_snapshot( $parent_snapshot, $product );

		// 3. Delete created terms (only if they now have 0 object relationships).
		foreach ( \array_reverse( $ledger['terms'] ) as $entry ) {
			$term_id  = (int) $entry['term_id'];
			$taxonomy = (string) $entry['taxonomy'];
			$objects  = \get_objects_in_term( $term_id, $taxonomy );
			if ( \is_array( $objects ) && empty( $objects ) ) {
				\wp_delete_term( $term_id, $taxonomy );
			}
		}

		// 4. Delete created attribute taxonomies (only if they now have 0 terms).
		foreach ( \array_reverse( $ledger['attributes'] ) as $attr_id ) {
			if ( \function_exists( 'wc_delete_attribute' ) ) {
				$attr = \wc_get_attribute( (int) $attr_id );
				if ( $attr && \taxonomy_exists( $attr->slug ) ) {
					$terms = \get_terms(
						array(
							'taxonomy'   => $attr->slug,
							'hide_empty' => false,
							'fields'     => 'ids',
						)
					);
					if ( \is_array( $terms ) && empty( $terms ) ) {
						\wc_delete_attribute( (int) $attr_id );
					}
				}
			}
		}

		// 5. Cache busting after rollback.
		\wc_delete_product_transients( $product->get_id() );
		Product_Authoring_Security::trigger_lookup_regen( $product );

		return $failed_deletes;
	}

	/**
	 * Roll back a failed bulk_update() call by restoring each touched variation.
	 *
	 * @param array $snapshots Map of variation_id => prior field values.
	 * @return void
	 */
	private static function rollback_bulk( array $snapshots ): void {
		foreach ( $snapshots as $vid => $prior ) {
			$variation = \wc_get_product( (int) $vid );
			if ( ! $variation || ! $variation->is_type( 'variation' ) ) {
				continue;
			}
			try {
				$variation->set_regular_price( $prior['regular_price'] );
				$variation->set_sale_price( $prior['sale_price'] );
				$variation->set_sku( $prior['sku'] );
				$variation->set_manage_stock( $prior['manage_stock'] );
				$variation->set_stock_quantity( $prior['stock_quantity'] );
				$variation->set_stock_status( $prior['stock_status'] );
				$variation->set_description( $prior['description'] );
				$variation->save();
			} catch ( \Throwable $e ) {
				\wc_get_logger()->error(
					'SGS Product_Provisioning bulk rollback: variation ' . $vid . ' restore failed — ' . $e->getMessage(),
					array( 'source' => 'sgs-product-provisioning' )
				);
			}
		}
	}

	// ── Google variesBy auto-mapping ─────────────────────────────────────────

	/**
	 * Map a WooCommerce attribute name to a Google Merchant variesBy enum value.
	 *
	 * The mapping is a small, fixed in-method constant because Google's variesBy
	 * enum is a CLOSED, Google-defined set (six values) — not client data. It will
	 * only change if Google changes their spec, making a hardcoded map correct here
	 * (unlike DB-first lookups used for open-ended client taxonomies per R-22-1).
	 *
	 * Matching rules (applied to the normalised token):
	 *   - Strip a leading pa_ prefix (WC global taxonomy convention).
	 *   - Lowercase the result.
	 *   - Match the full normalised token against the table below.
	 *   - No confident match → return '' (axis treated as additionalProperty by the
	 *     JSON-LD emitter; SEC-8 guard in Configurator_Meta::sanitize_variesby() would
	 *     reject an invalid enum anyway).
	 *
	 * @param string $attribute_name Raw attribute name as supplied by the caller
	 *                               (e.g. 'Size', 'pa_colour', 'Gender').
	 * @return string A valid Configurator_Meta::VARIESBY_ENUM value, or ''.
	 */
	private static function map_axis_to_variesby( string $attribute_name ): string {
		// Strip optional pa_ prefix, lowercase.
		$token = \strtolower( \preg_replace( '/^pa_/', '', $attribute_name ) );

		// Fixed map against Google's variesBy closed enum. Dual entries for
		// colour/colour handle the UK and US spelling of the same taxonomy.
		$map = array(
			'size'     => 'size',
			'colour'   => 'color',
			'color'    => 'color',
			'material' => 'material',
			'pattern'  => 'pattern',
			'age'      => 'suggestedAge',
			'gender'   => 'suggestedGender',
			'sex'      => 'suggestedGender',
		);

		return isset( $map[ $token ] ) ? $map[ $token ] : '';
	}

	// ── Test-failure hook (un-abusable in production) ─────────────────────────

	/**
	 * Return the injected-failure threshold when BOTH guard conditions are met:
	 *  - current user has manage_options
	 *  - the sgs_pa_allow_test_fail filter returns true (default: false)
	 *
	 * Returns 0 (disabled) in all other cases, making this dead code in production.
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return int  Number of variations to create before throwing; 0 = disabled.
	 */
	private static function test_fail_threshold( \WP_REST_Request $request ): int {
		$raw = isset( $request['_sgs_test_fail_after'] ) ? (int) $request['_sgs_test_fail_after'] : 0;
		if ( $raw <= 0 ) {
			return 0;
		}
		if ( ! \current_user_can( 'manage_options' ) ) {
			return 0;
		}
		if ( true !== \apply_filters( 'sgs_pa_allow_test_fail', false ) ) {
			return 0;
		}
		return $raw;
	}
}
