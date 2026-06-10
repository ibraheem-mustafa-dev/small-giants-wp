<?php
/**
 * SGS Product Templates — apply-side helpers (R2 dispatch + meta writes).
 *
 * Extracted from class-product-templates-helpers.php to keep both files under
 * the 300-line limit (code-quality.md rule). Holds everything the APPLY flow
 * touches: the R2 provisioning dispatch, the product-level presentation-meta
 * write, and the term-level swatch/variesby write.
 *
 * @package SGS\Blocks
 * @since   1.8.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-product-templates-envelope.php';
require_once __DIR__ . '/class-product-templates-validators.php';

/**
 * Apply-side helpers: delegate to R2, write presentation/term meta.
 *
 * @internal Used only by Product_Templates_Handlers.
 */
final class Product_Templates_Apply {

	/**
	 * Operator-facing "not carried" notes — shared by the dry-run summary and
	 * the live-apply response so both always state the same exclusions.
	 *
	 * Plain English only — no meta keys or internal system names. For
	 * developers, the underlying exclusions are:
	 *   - Swatch images = _sgs_swatch_image_id (attachment IDs are install-local).
	 *   - Pack pricing settings = _sgs_pack_k + _sgs_pack_sizes (shop-local
	 *     pricing config; the site-level Pack Pricing cascade provides defaults).
	 *
	 * @var string[]
	 */
	const NOT_CARRIED_NOTES = array(
		'Swatch images are not carried over — re-upload them on this site.',
		'Pack pricing settings are not carried over — configure pricing for this shop after applying.',
	);

	// ── Delegate to R2 ────────────────────────────────────────────────────────

	/**
	 * Delegate attribute/term provisioning to R2 via rest_do_request().
	 *
	 * Using rest_do_request() rather than calling provisioning code directly
	 * ensures R2's rollback ledger, upsert-dedup logic, and rate-limit
	 * accounting are inherited automatically — no parallel write path exists.
	 *
	 * @param int              $product_id     Target variable product ID.
	 * @param array            $attrs          Envelope attributes array.
	 * @param \WP_REST_Request $orig_request   Original request (forwards the nonce header).
	 * @param string           $starting_price Optional regular price for all new variations.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function call_provision(
		int $product_id,
		array $attrs,
		\WP_REST_Request $orig_request,
		string $starting_price = ''
	) {
		// Build R2's expected payload: { name, taxonomy (pa_-prefixed), terms: [string] }.
		$provision_attrs = array();
		foreach ( $attrs as $attr ) {
			$provision_attrs[] = array(
				'name'     => $attr['name'],
				'taxonomy' => 'pa_' . $attr['slug'], // R2 resolver needs the pa_ prefix.
				'terms'    => array_column( $attr['terms'], 'name' ),
			);
		}

		$inner = new \WP_REST_Request( 'POST', '/sgs/v1/products/' . $product_id . '/provision' );
		$inner->set_param( 'id', $product_id );
		$inner->set_param( 'attributes', $provision_attrs );

		// Forward starting_price as R2's defaults.regular_price when supplied.
		if ( '' !== $starting_price && is_numeric( $starting_price ) && (float) $starting_price > 0 ) {
			$inner->set_param( 'defaults', array( 'regular_price' => $starting_price ) );
		}

		// rest_do_request() does NOT reproduce the HTTP cookie-auth CSRF filter
		// (rest_cookie_check_errors never re-runs for an internal dispatch); the
		// forwarded header satisfies security_chain's OWN wp_verify_nonce('wp_rest')
		// check inside R2's handler.
		$inner->set_header( 'X-WP-Nonce', (string) $orig_request->get_header( 'X-WP-Nonce' ) );

		$response = \rest_do_request( $inner );

		if ( \is_wp_error( $response ) ) {
			return $response;
		}
		if ( $response->is_error() ) {
			return $response->as_error();
		}

		return $response;
	}

	// ── Presentation meta ─────────────────────────────────────────────────────

	/**
	 * Write product-level presentation meta from the envelope to the target product.
	 *
	 * Only allow-listed _sgs_* keys are written (PRODUCT_PRESENTATION_KEYS).
	 * Commerce and legal keys are never touched here.
	 * Pack-size axis slug has its pa_ prefix re-added before storage.
	 *
	 * @param int   $product_id Target product ID.
	 * @param array $envelope   Sanitised envelope.
	 * @return string[] List of meta keys written.
	 */
	public static function apply_presentation_meta( int $product_id, array $envelope ): array {
		$applied = array();

		$presentation = isset( $envelope['presentation'] ) && is_array( $envelope['presentation'] )
			? $envelope['presentation']
			: array();

		$allowed = array_flip( Product_Templates_Envelope::PRODUCT_PRESENTATION_KEYS );
		foreach ( $presentation as $key => $value ) {
			if ( ! isset( $allowed[ $key ] ) ) {
				continue;
			}
			\update_post_meta( $product_id, $key, $value );
			$applied[] = $key;
		}

		// Pack-size axis: written ONLY here (single path, H2) — the key is on the
		// META_DENY_LIST so it can never arrive via envelope.presentation. Re-add
		// the pa_ prefix when storing on the target site.
		if ( isset( $envelope['pack_size_axis_slug'] )
			&& '' !== (string) $envelope['pack_size_axis_slug'] ) {
			$axis = 'pa_' . Product_Templates_Validators::clean_slug( (string) $envelope['pack_size_axis_slug'] );
			\update_post_meta( $product_id, '_sgs_pack_size_axis', $axis );
			$applied[] = '_sgs_pack_size_axis';
		}

		return $applied;
	}

	// ── Term swatch colours + variesby ────────────────────────────────────────

	/**
	 * Write swatch colours and portable term-meta from the envelope to matching
	 * WC terms on this site.
	 *
	 * Term lookup is slug-first. SLUG ROUND-TRIP CAVEAT: R2 derives a created
	 * term's slug from its NAME (sanitize_title at term insert), so a
	 * hand-edited source slug may not exist on the target site. When the slug
	 * lookup misses, we fall back to a NAME lookup (R4-side fix — R2 untouched)
	 * and record the remap in the returned `slug_remapped` list so the operator
	 * knows the target slug differs from the source envelope.
	 *
	 * Applied per-term (when present in the envelope and non-null):
	 *   _sgs_swatch_color   — hex colour
	 *   _sgs_variesby_value — Google Merchant variesBy enum value
	 *
	 * NOT applied (_sgs_swatch_image_id): attachment IDs are site-local.
	 * See NOT_CARRIED_NOTES for the operator-facing wording.
	 *
	 * @param array $attrs Envelope attributes array.
	 * @return array { swatches: int, variesby: int, slug_remapped: array[], not_carried: string[] }
	 */
	public static function apply_term_swatches( array $attrs ): array {
		$swatches_applied = 0;
		$variesby_applied = 0;
		$slug_remapped    = array();

		foreach ( $attrs as $attr ) {
			// Defensive shape guard — a malformed attribute descriptor must not fatal.
			if ( ! isset( $attr['slug'], $attr['terms'] ) ) {
				continue;
			}
			$taxonomy = 'pa_' . $attr['slug'];
			if ( ! \taxonomy_exists( $taxonomy ) ) {
				continue;
			}
			foreach ( (array) ( $attr['terms'] ?? array() ) as $term_def ) {
				// Slug-first lookup; name fallback for the R2 slug-derivation gap.
				$term     = \get_term_by( 'slug', $term_def['slug'], $taxonomy );
				$remapped = false;
				if ( ( ! $term || \is_wp_error( $term ) )
					&& isset( $term_def['name'] ) && '' !== $term_def['name'] ) {
					$term     = \get_term_by( 'name', $term_def['name'], $taxonomy );
					$remapped = true;
				}
				if ( ! $term || \is_wp_error( $term ) ) {
					continue;
				}
				if ( $remapped ) {
					$slug_remapped[] = array(
						'taxonomy'    => $taxonomy,
						'source_slug' => $term_def['slug'],
						'target_slug' => $term->slug,
					);
				}

				// swatch_color: write only when the target term has no existing value
				// (H1 — the operator's local brand colours are never silently
				// overwritten; same operator-intent-wins guard as variesby below).
				if ( isset( $term_def['swatch_color'] ) && null !== $term_def['swatch_color']
					&& '' !== $term_def['swatch_color'] ) {
					$hex         = Product_Templates_Validators::is_valid_hex_color( $term_def['swatch_color'] )
						? strtolower( $term_def['swatch_color'] )
						: '';
					$existing_sw = \get_term_meta( $term->term_id, '_sgs_swatch_color', true );
					if ( '' !== $hex && ( '' === $existing_sw || false === $existing_sw ) ) {
						\update_term_meta( $term->term_id, '_sgs_swatch_color', $hex );
						++$swatches_applied;
					}
				}

				// variesby: write only when envelope has a non-null value AND term has no
				// existing value (operator intent on the target site wins).
				if ( isset( $term_def['variesby'] ) && null !== $term_def['variesby']
					&& '' !== $term_def['variesby'] ) {
					$existing_vb = \get_term_meta( $term->term_id, '_sgs_variesby_value', true );
					if ( '' === $existing_vb || false === $existing_vb ) {
						\update_term_meta( $term->term_id, '_sgs_variesby_value', (string) $term_def['variesby'] );
						++$variesby_applied;
					}
				}
			}
		}

		return array(
			'swatches'      => $swatches_applied,
			'variesby'      => $variesby_applied,
			'slug_remapped' => $slug_remapped,
			'not_carried'   => self::NOT_CARRIED_NOTES,
		);
	}
}
