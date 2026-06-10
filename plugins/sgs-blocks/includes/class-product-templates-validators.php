<?php
/**
 * SGS Product Templates — pure sanitise/validation primitives.
 *
 * Extracted from class-product-templates-envelope.php to keep both files under
 * the 300-line limit (code-quality.md rule). Holds the string/slug/hex-colour
 * cleaners, the ID-smuggling detector, and the envelope sanitise pass. All
 * functions are pure PHP (the only WP call is wp_strip_all_tags / the
 * sanitize_text_field used on the variesby enum), so the standalone test
 * runner can exercise them with minimal stubs.
 *
 * @package SGS\Blocks
 * @since   1.8.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-product-templates-envelope.php';

/**
 * Pure sanitise + validation primitives for the product-template envelope.
 *
 * @internal Used by Product_Templates_Envelope, Product_Templates_Helpers and
 *           Product_Templates_Handlers.
 */
final class Product_Templates_Validators {

	// ── Sanitise ─────────────────────────────────────────────────────────────

	/**
	 * Sanitise a validated envelope in-place, returning a clean copy.
	 *
	 * Assumes Product_Templates_Envelope::validate() returned no errors. This
	 * is a separate pass so validate() and sanitise() are independently testable.
	 *
	 * @param array $envelope Decoded, validated envelope.
	 * @return array Sanitised envelope.
	 */
	public static function sanitise( array $envelope ): array {
		$clean = array(
			'version'             => Product_Templates_Envelope::VERSION,
			'generator'           => isset( $envelope['generator'] ) ? self::clean_string( (string) $envelope['generator'] ) : '',
			'attributes'          => array(),
			'presentation'        => array(),
			'varies_by'           => isset( $envelope['varies_by'] ) && is_string( $envelope['varies_by'] )
									? self::clean_string( $envelope['varies_by'] )
									: null,
			'pack_size_axis_slug' => isset( $envelope['pack_size_axis_slug'] ) && is_string( $envelope['pack_size_axis_slug'] )
									? self::clean_slug( $envelope['pack_size_axis_slug'] )
									: null,
		);

		foreach ( (array) $envelope['attributes'] as $attr ) {
			$clean_attr = array(
				'name'  => self::clean_string( (string) $attr['name'] ),
				'slug'  => self::clean_slug( (string) $attr['slug'] ),
				'terms' => array(),
			);
			foreach ( (array) $attr['terms'] as $term ) {
				$clean_attr['terms'][] = self::sanitise_term( $term );
			}
			$clean['attributes'][] = $clean_attr;
		}

		// Presentation: only allow-listed keys survive; values sanitised per type.
		$allowed = array_flip( Product_Templates_Envelope::PRODUCT_PRESENTATION_KEYS );
		foreach ( (array) ( $envelope['presentation'] ?? array() ) as $key => $value ) {
			if ( ! isset( $allowed[ $key ] ) ) {
				continue;
			}
			// Boolean meta stored as bool; numeric as number; strings sanitised.
			if ( is_bool( $value ) || is_int( $value ) || is_float( $value ) ) {
				$clean['presentation'][ $key ] = $value;
			} else {
				$clean['presentation'][ $key ] = self::clean_string( (string) $value );
			}
		}

		return $clean;
	}

	/**
	 * Sanitise a single term descriptor (name/slug/swatch/variesby/unit fields).
	 *
	 * @param array $term Raw term descriptor from the envelope.
	 * @return array Clean term descriptor.
	 */
	private static function sanitise_term( array $term ): array {
		// swatch_color: valid hex or null.
		$swatch = null;
		if ( isset( $term['swatch_color'] ) && is_string( $term['swatch_color'] ) && '' !== $term['swatch_color'] ) {
			$swatch = self::is_valid_hex_color( $term['swatch_color'] ) ? strtolower( $term['swatch_color'] ) : null;
		}

		// variesby: validate against closed Google enum (SEC-8 mirror); invalid = null.
		$variesby_enum = array( 'color', 'size', 'material', 'pattern', 'suggestedAge', 'suggestedGender' );
		$variesby      = null;
		if ( isset( $term['variesby'] ) && is_string( $term['variesby'] ) && '' !== $term['variesby'] ) {
			$vb_raw   = self::clean_string( $term['variesby'] );
			$variesby = in_array( $vb_raw, $variesby_enum, true ) ? $vb_raw : null;
		}

		// unit_label: plain text, sanitised.
		$unit_label = null;
		if ( isset( $term['unit_label'] ) && is_string( $term['unit_label'] ) && '' !== $term['unit_label'] ) {
			$unit_label = self::clean_string( $term['unit_label'] );
		}

		// unit_divisor: positive numeric.
		$unit_divisor = null;
		if ( isset( $term['unit_divisor'] ) && is_numeric( $term['unit_divisor'] )
			&& (float) $term['unit_divisor'] > 0 ) {
			$unit_divisor = (float) $term['unit_divisor'];
		}

		return array(
			'name'         => self::clean_string( (string) $term['name'] ),
			'slug'         => self::clean_slug( (string) $term['slug'] ),
			'swatch_color' => $swatch,
			'variesby'     => $variesby,
			'unit_label'   => $unit_label,
			'unit_divisor' => $unit_divisor,
		);
	}

	// ── Pure helpers ──────────────────────────────────────────────────────────

	/**
	 * Sanitise a plain text string: strip tags, trim, collapse inner whitespace.
	 *
	 * @param string $value Raw string.
	 * @return string
	 */
	public static function clean_string( string $value ): string {
		$value = \wp_strip_all_tags( $value );
		$value = preg_replace( '/\s+/', ' ', $value );
		return trim( $value );
	}

	/**
	 * Sanitise a slug: lowercase, strip non-alphanumeric/hyphen/underscore chars.
	 *
	 * @param string $value Raw slug.
	 * @return string
	 */
	public static function clean_slug( string $value ): string {
		$value = strtolower( trim( $value ) );
		// Allow letters, digits, hyphens, underscores only (WC taxonomy naming).
		return preg_replace( '/[^a-z0-9\-_]/', '', $value );
	}

	/**
	 * Validate a hex colour string (#rgb or #rrggbb).
	 *
	 * @param string $value Colour string.
	 * @return bool
	 */
	public static function is_valid_hex_color( string $value ): bool {
		return (bool) preg_match( '/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $value );
	}

	/**
	 * Assert that an envelope contains no integer IDs in attribute/term slugs
	 * or names (the primary ID-smuggling gate).
	 *
	 * Returns an array of violation descriptions; empty = clean.
	 *
	 * @param array $envelope Decoded envelope.
	 * @return string[]
	 */
	public static function find_smuggled_ids( array $envelope ): array {
		$violations = array();
		foreach ( (array) ( $envelope['attributes'] ?? array() ) as $ai => $attr ) {
			if ( isset( $attr['slug'] ) && is_numeric( $attr['slug'] ) ) {
				$violations[] = "attributes[$ai].slug is numeric: {$attr['slug']}";
			}
			if ( isset( $attr['name'] ) && is_numeric( $attr['name'] ) ) {
				$violations[] = "attributes[$ai].name is numeric: {$attr['name']}";
			}
			foreach ( (array) ( $attr['terms'] ?? array() ) as $ti => $term ) {
				if ( isset( $term['slug'] ) && is_numeric( $term['slug'] ) ) {
					$violations[] = "attributes[$ai].terms[$ti].slug is numeric: {$term['slug']}";
				}
				if ( isset( $term['name'] ) && is_numeric( $term['name'] ) ) {
					$violations[] = "attributes[$ai].terms[$ti].name is numeric: {$term['name']}";
				}
			}
		}
		return $violations;
	}
}
