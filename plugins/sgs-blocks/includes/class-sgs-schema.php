<?php
/**
 * Shared JSON-LD encoder for all SGS schema emitters (FR-30-9).
 *
 * One encoder, zero drift. Every schema emitter in this plugin (Product_Schema,
 * Org_Website_Schema, …) MUST encode via Sgs_Schema::encode_jsonld() rather than
 * calling wp_json_encode / json_encode directly. This guarantees the XSS-safe
 * HEX-flag set is applied consistently across every <script type="application/ld+json">
 * output — the structural gap that FR-30-9 council identified.
 *
 * Flag rationale (SEC-3):
 *   JSON_HEX_TAG    — escapes < and > so </script> can't break out of the tag.
 *   JSON_HEX_AMP    — escapes & (prevents HTML entity confusion in attributes).
 *   JSON_HEX_APOS   — escapes ' (belt-and-braces for injected JSON in attribute contexts).
 *   JSON_HEX_QUOT   — escapes " (same rationale).
 *   JSON_UNESCAPED_SLASHES  — keeps URLs readable and avoids double-encoding.
 *   JSON_UNESCAPED_UNICODE  — keeps UTF-8 characters (e.g. £, Arabic) intact.
 *
 * Text is decoded before encoding: WordPress stores and returns titles, term names and the
 * site name with HTML entities (an apostrophe is `&#039;`), JSON-LD is not HTML, and
 * encoding the entity as it stands prints the literal characters `&#039;` to a search
 * engine. Every string in the tree passes through {@see Sgs_Schema::decode_text()}.
 *
 * NEVER use esc_attr() / esc_html() as the JSON escape — those are for HTML contexts,
 * not JSON-LD script content, and will corrupt structured data.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Schema
 *
 * Static utility: encode an array as XSS-safe JSON-LD.
 */
final class Sgs_Schema {

	/**
	 * JSON_HEX_* flag set for safe inline <script type="application/ld+json"> output.
	 *
	 * @var int
	 */
	private const JSON_FLAGS = \JSON_HEX_TAG | \JSON_HEX_AMP | \JSON_HEX_APOS | \JSON_HEX_QUOT
		| \JSON_UNESCAPED_SLASHES | \JSON_UNESCAPED_UNICODE;

	/**
	 * Encode structured-data array as an XSS-safe JSON string for ld+json output.
	 *
	 * @param array $data Structured data array.
	 * @return string|false Encoded JSON string, or false on encoding failure.
	 */
	public static function encode_jsonld( array $data ) {
		\array_walk_recursive(
			$data,
			static function ( &$value ): void {
				if ( \is_string( $value ) ) {
					$value = self::decode_text( $value );
				}
			}
		);
		return \wp_json_encode( $data, self::JSON_FLAGS );
	}

	/**
	 * Turn HTML entities in a string back into the characters they stand for.
	 *
	 * @param string $text Text that may carry entities (`Mama&#039;s`, `A &amp; B`).
	 * @return string The plain text (`Mama's`, `A & B`).
	 */
	public static function decode_text( string $text ): string {
		return \html_entity_decode( $text, \ENT_QUOTES | \ENT_HTML5, 'UTF-8' );
	}

	/**
	 * Wrap encoded JSON-LD in a full <script> tag, or return '' on encode failure.
	 *
	 * @param array $data Structured data array.
	 * @return string The <script type="application/ld+json">…</script> tag, or ''.
	 */
	public static function script_tag( array $data ): string {
		$json = self::encode_jsonld( $data );
		if ( false === $json ) {
			return '';
		}
		return '<script type="application/ld+json">' . $json . '</script>' . "\n";
	}
}
