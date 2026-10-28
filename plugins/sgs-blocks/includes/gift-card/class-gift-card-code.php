<?php
/**
 * Gift card codes (Spec 27, FR-27-GC3).
 *
 * A code is 16 symbols of Crockford base32 (5 bits each) drawn from
 * `random_bytes()`: exactly 80 bits of randomness, shown as XXXX-XXXX-XXXX-XXXX.
 * Only a keyed hash (HMAC-SHA256) and the last four symbols are ever stored; the
 * plain code exists in the issuing email and nowhere else.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Generation, normalisation and hashing of gift-card codes.
 */
final class Gift_Card_Code {

	/** Crockford base32: no I, L, O or U. */
	const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

	/** Symbols in a code. */
	const LENGTH = 16;

	/** Bits of randomness in a code (LENGTH x 5). */
	const ENTROPY_BITS = 80;

	/**
	 * Generate a new code, formatted for display.
	 *
	 * @param callable|null $random Optional `fn( int $bytes ): string` for tests; defaults to random_bytes().
	 * @return string e.g. 7K2M-9QXA-0BD4-VNE6
	 * @throws \InvalidArgumentException When the supplied randomness is not exactly 10 bytes.
	 */
	public static function generate( ?callable $random = null ): string {
		$bytes = null === $random ? \random_bytes( 10 ) : (string) $random( 10 );
		if ( 10 !== \strlen( $bytes ) ) {
			throw new \InvalidArgumentException( 'A gift card code needs exactly 10 random bytes.' );
		}

		$bits = '';
		for ( $i = 0; $i < 10; $i++ ) {
			$bits .= \str_pad( \decbin( \ord( $bytes[ $i ] ) ), 8, '0', STR_PAD_LEFT );
		}

		$code = '';
		for ( $i = 0; $i < self::LENGTH; $i++ ) {
			$code .= self::ALPHABET[ (int) \bindec( \substr( $bits, $i * 5, 5 ) ) ];
		}

		return self::format( $code );
	}

	/**
	 * Normalise typed input to the canonical 16 symbols, or '' when it cannot be a code.
	 *
	 * Case and separators are ignored; Crockford look-alikes (I, L to 1; O to 0) are folded.
	 *
	 * @param string $input What the customer typed.
	 * @return string 16 symbols, or ''.
	 */
	public static function normalise( string $input ): string {
		$clean = \strtoupper( \preg_replace( '/[\s\-_]+/', '', $input ) ?? '' );
		$clean = \strtr(
			$clean,
			array(
				'I' => '1',
				'L' => '1',
				'O' => '0',
			)
		);
		if ( self::LENGTH !== \strlen( $clean ) ) {
			return '';
		}
		if ( 1 !== \preg_match( '/^[' . self::ALPHABET . ']+$/', $clean ) ) {
			return '';
		}
		return $clean;
	}

	/**
	 * Display form: four groups of four.
	 *
	 * @param string $normalised 16 canonical symbols.
	 * @return string
	 */
	public static function format( string $normalised ): string {
		return \implode( '-', \str_split( $normalised, 4 ) );
	}

	/**
	 * The keyed hash stored for lookup.
	 *
	 * @param string $normalised 16 canonical symbols.
	 * @param string $key        Secret key (see {@see self::default_key()}).
	 * @return string 64 hex characters.
	 */
	public static function hash( string $normalised, string $key ): string {
		return \hash_hmac( 'sha256', $normalised, $key );
	}

	/**
	 * The last four symbols, stored and shown so staff can recognise a card.
	 *
	 * @param string $normalised 16 canonical symbols.
	 * @return string
	 */
	public static function last4( string $normalised ): string {
		return \substr( $normalised, -4 );
	}

	/**
	 * The site's hashing key, derived from WordPress' own secret salts.
	 *
	 * @return string
	 */
	public static function default_key(): string {
		return \hash_hmac( 'sha256', 'sgs-gift-card-code-v1', \wp_salt( 'secure_auth' ) );
	}
}
