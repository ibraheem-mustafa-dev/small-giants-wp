<?php
/**
 * SGS Product Templates — pure envelope build/validate/apply-mapping helpers.
 *
 * Kept WP-free where possible so the functions are unit-testable via the
 * standalone runner without bootstrapping WordPress or WooCommerce.
 *
 * Envelope schema (version 1): { version, generator, attributes: [ { name,
 * slug, terms: [ { name, slug, swatch_color, variesby, unit_label,
 * unit_divisor } ] } ], presentation: { _sgs_* allow-list }, varies_by,
 * pack_size_axis_slug }. Sanitise pass + pure string/slug/hex primitives live
 * in Product_Templates_Validators (class-product-templates-validators.php).
 *
 * Slugs and names only — never integer IDs. Attribute slugs use the WC
 * convention (wc_sanitize_taxonomy_name from the name) with the pa_ prefix
 * stripped; the apply layer re-adds the prefix when resolving.
 *
 * @package SGS\Blocks
 * @since   1.8.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-product-templates-validators.php';

/**
 * Pure envelope helpers — build, validate, and map a product-template envelope.
 *
 * No direct WP/WC calls: every WP/WC-bound operation is isolated into the
 * Product_Templates class so this one can be exercised with plain PHP.
 */
final class Product_Templates_Envelope {

	/** Current envelope schema version. */
	const VERSION = 1;

	/** Maximum attribute count accepted in an import envelope. */
	const MAX_ATTRIBUTES = 10;

	/** Maximum term count per attribute in an import envelope. */
	const MAX_TERMS_PER_ATTRIBUTE = 50;

	/** Maximum accepted import payload in bytes (256 KB). */
	const MAX_PAYLOAD_BYTES = 262144;

	/**
	 * Meta keys that are HARD-EXCLUDED from every template envelope — never
	 * exported, never imported, never applied. Replicated attestations = fabricated
	 * UK consumer-law legal records; per-shop prices and image IDs are
	 * install-local and carry no meaning on the target site.
	 *
	 * Checked at import time: any envelope that carries one of these keys
	 * is rejected with a validation error (envelope poisoning guard).
	 *
	 * @var string[]
	 */
	const META_DENY_LIST = array(
		'_sgs_base_price_pence',          // Per-shop legal price record.
		'_sgs_base_price_pounds',         // UI entry field — never stored persistently; excluded for safety.
		'_sgs_base_price_attested',       // DMCC Act 2024 attestation — fabricating this is illegal.
		'_sgs_base_price_audit',          // DMCC audit trail — fabricating this is illegal.
		'_sgs_pack_k',                    // Shop-local pricing curve exponent.
		'_sgs_pack_sizes',                // Shop-local pack-size pricing config.
		'_sgs_pack_manual_overrides',     // Per-shop price overrides.
		'_sgs_pack_size_axis',            // Carried ONLY via the top-level pack_size_axis_slug field (single path, H2).
		'_sgs_swatch_image_id',           // Attachment ID — install-local (listed in apply report as "not carried: images").
		'_sgs_variation_gallery',         // Attachment IDs — install-local.
		'_sgs_variation_upsert_key',      // Internal dedup key — meaningless on target site.
	);

	/**
	 * Product-level SGS presentation meta keys exported into the envelope.
	 *
	 * Hard-excluded (see META_DENY_LIST):
	 *   _sgs_base_price_* — UK consumer-law legal records.
	 *   _sgs_pack_k / _sgs_pack_sizes / _sgs_pack_manual_overrides — shop-local pricing.
	 *   _sgs_swatch_image_id / _sgs_variation_gallery — install-local attachment IDs.
	 *   _sgs_pack_size_axis — carried solely via top-level pack_size_axis_slug (H2).
	 *
	 * @var string[]
	 */
	const PRODUCT_PRESENTATION_KEYS = array(
		'_sgs_decoy_enabled',
		'_sgs_discount_label',
		'_sgs_unit_label',
		'_sgs_unit_divisor',
	);

	// ── Build ─────────────────────────────────────────────────────────────────

	/**
	 * Build a portable envelope from pre-collected product data.
	 *
	 * This function is WP-free: callers pass in the already-resolved values so
	 * the function can be tested in isolation.
	 *
	 * @param string      $generator      Value for the "generator" field (e.g. "sgs-blocks/0.1.2").
	 * @param array       $attributes     Array of attribute descriptors, each shaped:
	 *                                    { name: string, slug: string,
	 *                                      terms: [ { name: string, slug: string, swatch_color: string|null } ] }.
	 * @param array       $presentation   Associative array of product-level presentation meta
	 *                                    (keys from PRODUCT_PRESENTATION_KEYS, values already sanitised).
	 * @param string|null $varies_by      variesBy value for the primary axis, or null.
	 * @param string|null $pack_size_slug Bare pack-size attribute slug (without pa_ prefix), or null.
	 * @return array The envelope as a PHP array (json_encode to serialise).
	 */
	public static function build(
		string $generator,
		array $attributes,
		array $presentation,
		?string $varies_by,
		?string $pack_size_slug
	): array {
		return array(
			'version'             => self::VERSION,
			'generator'           => $generator,
			'attributes'          => $attributes,
			'presentation'        => $presentation,
			'varies_by'           => $varies_by,
			'pack_size_axis_slug' => $pack_size_slug,
		);
	}

	// ── Validate ─────────────────────────────────────────────────────────────

	/**
	 * Validate a decoded envelope array.
	 *
	 * Enforces: version=1 (unknown rejected); attribute/term caps; no integer
	 * IDs anywhere (inline checks + an independent find_smuggled_ids() sweep —
	 * defence in depth); swatch_color valid hex or null; presentation keys on
	 * the allow-list AND not on the deny-list; payload ≤ MAX_PAYLOAD_BYTES.
	 *
	 * Returns an array of error message strings; empty array = valid.
	 *
	 * @param mixed  $envelope      Decoded PHP value (from json_decode(..., true)).
	 * @param string $raw_json_body Optional: the raw JSON string, used for byte-size check.
	 * @return string[] Validation error messages; empty = valid.
	 */
	public static function validate( $envelope, string $raw_json_body = '' ): array {
		$errors = array();

		// ── Payload size guard ───────────────────────────────────────────────
		if ( '' !== $raw_json_body && strlen( $raw_json_body ) > self::MAX_PAYLOAD_BYTES ) {
			$errors[] = sprintf(
				'Payload too large: %d bytes; maximum is %d bytes.',
				strlen( $raw_json_body ),
				self::MAX_PAYLOAD_BYTES
			);
			return $errors; // No point validating a giant payload.
		}

		if ( ! is_array( $envelope ) ) {
			$errors[] = 'Envelope must be a JSON object.';
			return $errors;
		}

		// ── Version ──────────────────────────────────────────────────────────
		if ( ! isset( $envelope['version'] ) || self::VERSION !== (int) $envelope['version'] ) {
			$errors[] = sprintf(
				'Unsupported envelope version: expected %d, got %s.',
				self::VERSION,
				isset( $envelope['version'] ) ? (string) $envelope['version'] : 'missing'
			);
			return $errors; // Cannot safely continue with unknown schema.
		}

		// ── Attributes ───────────────────────────────────────────────────────
		if ( ! isset( $envelope['attributes'] ) || ! is_array( $envelope['attributes'] ) ) {
			$errors[] = 'Field "attributes" must be an array.';
			return $errors;
		}

		$attr_count = count( $envelope['attributes'] );
		if ( $attr_count > self::MAX_ATTRIBUTES ) {
			$errors[] = sprintf(
				'Too many attributes: %d supplied, maximum is %d.',
				$attr_count,
				self::MAX_ATTRIBUTES
			);
		}

		foreach ( $envelope['attributes'] as $attr_index => $attr ) {
			if ( ! is_array( $attr ) ) {
				$errors[] = sprintf( 'Attribute %d is not an object.', $attr_index );
				continue;
			}

			// Name must be a non-empty string, never an integer ID.
			if ( ! isset( $attr['name'] ) || ! is_string( $attr['name'] ) || '' === trim( $attr['name'] ) ) {
				$errors[] = sprintf( 'Attribute %d: "name" must be a non-empty string.', $attr_index );
			} elseif ( is_numeric( $attr['name'] ) ) {
				$errors[] = sprintf( 'Attribute %d: "name" looks like an integer ID — slugs only.', $attr_index );
			}

			// Slug: non-empty string, never a numeric ID.
			if ( ! isset( $attr['slug'] ) || ! is_string( $attr['slug'] ) || '' === trim( $attr['slug'] ) ) {
				$errors[] = sprintf( 'Attribute %d: "slug" must be a non-empty string.', $attr_index );
			} elseif ( is_numeric( $attr['slug'] ) ) {
				$errors[] = sprintf( 'Attribute %d: "slug" looks like an integer ID — slugs only.', $attr_index );
			}

			// Terms array.
			if ( ! isset( $attr['terms'] ) || ! is_array( $attr['terms'] ) ) {
				$errors[] = sprintf( 'Attribute %d: "terms" must be an array.', $attr_index );
				continue;
			}

			$term_count = count( $attr['terms'] );
			if ( $term_count > self::MAX_TERMS_PER_ATTRIBUTE ) {
				$errors[] = sprintf(
					'Attribute %d: too many terms (%d); maximum is %d.',
					$attr_index,
					$term_count,
					self::MAX_TERMS_PER_ATTRIBUTE
				);
			}

			foreach ( $attr['terms'] as $term_index => $term ) {
				if ( ! is_array( $term ) ) {
					$errors[] = sprintf( 'Attribute %d term %d is not an object.', $attr_index, $term_index );
					continue;
				}

				if ( ! isset( $term['name'] ) || ! is_string( $term['name'] ) || '' === trim( $term['name'] ) ) {
					$errors[] = sprintf( 'Attribute %d term %d: "name" must be a non-empty string.', $attr_index, $term_index );
				} elseif ( is_numeric( $term['name'] ) ) {
					$errors[] = sprintf( 'Attribute %d term %d: "name" looks like an integer ID — slugs only.', $attr_index, $term_index );
				}

				if ( ! isset( $term['slug'] ) || ! is_string( $term['slug'] ) || '' === trim( $term['slug'] ) ) {
					$errors[] = sprintf( 'Attribute %d term %d: "slug" must be a non-empty string.', $attr_index, $term_index );
				} elseif ( is_numeric( $term['slug'] ) ) {
					$errors[] = sprintf( 'Attribute %d term %d: "slug" looks like an integer ID — slugs only.', $attr_index, $term_index );
				}

				// swatch_color must be a valid hex colour string or null.
				if ( isset( $term['swatch_color'] ) && null !== $term['swatch_color'] ) {
					if ( ! is_string( $term['swatch_color'] ) || ! Product_Templates_Validators::is_valid_hex_color( $term['swatch_color'] ) ) {
						$errors[] = sprintf(
							'Attribute %d term %d: "swatch_color" must be a valid hex colour or null (got: %s).',
							$attr_index,
							$term_index,
							is_string( $term['swatch_color'] ) ? $term['swatch_color'] : gettype( $term['swatch_color'] )
						);
					}
				}

				// variesby must be a valid Google enum value or null (SEC-8 mirror).
				if ( isset( $term['variesby'] ) && null !== $term['variesby'] ) {
					if ( ! is_string( $term['variesby'] ) ) {
						$errors[] = sprintf( 'Attribute %d term %d: "variesby" must be a string or null.', $attr_index, $term_index );
					}
					// Actual enum validation happens in sanitise() via sanitize_variesby().
				}

				// unit_label must be a string or null.
				if ( isset( $term['unit_label'] ) && null !== $term['unit_label'] ) {
					if ( ! is_string( $term['unit_label'] ) ) {
						$errors[] = sprintf( 'Attribute %d term %d: "unit_label" must be a string or null.', $attr_index, $term_index );
					}
				}

				// unit_divisor must be a positive number or null.
				if ( isset( $term['unit_divisor'] ) && null !== $term['unit_divisor'] ) {
					if ( ! is_numeric( $term['unit_divisor'] ) || (float) $term['unit_divisor'] <= 0 ) {
						$errors[] = sprintf( 'Attribute %d term %d: "unit_divisor" must be a positive number or null.', $attr_index, $term_index );
					}
				}
			}
		}

		// ── ID-smuggling sweep (defence in depth, independent of the inline checks) ──
		foreach ( Product_Templates_Validators::find_smuggled_ids( $envelope ) as $violation ) {
			$errors[] = 'Smuggled ID: ' . $violation;
		}

		// ── Presentation ─────────────────────────────────────────────────────
		if ( isset( $envelope['presentation'] ) ) {
			if ( ! is_array( $envelope['presentation'] ) ) {
				$errors[] = 'Field "presentation" must be an object.';
			} else {
				$allowed_keys = array_flip( self::PRODUCT_PRESENTATION_KEYS );
				$deny_keys    = array_flip( self::META_DENY_LIST );
				foreach ( array_keys( $envelope['presentation'] ) as $key ) {
					if ( isset( $deny_keys[ $key ] ) ) {
						$errors[] = sprintf( 'Presentation key "%s" is on the deny-list and cannot be imported.', $key );
					} elseif ( ! isset( $allowed_keys[ $key ] ) ) {
						$errors[] = sprintf( 'Presentation key "%s" is not on the allow-list.', $key );
					}
				}
			}
		}

		return $errors;
	}
}
