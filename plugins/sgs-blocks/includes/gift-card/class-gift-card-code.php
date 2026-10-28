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

	/** Option holding the code-hashing key (autoload off). */
	const KEY_OPTION = 'sgs_gift_card_code_key';

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
	 * The site's code-hashing key.
	 *
	 * A dedicated random key, NOT derived from the WordPress salts: salts live in wp-config.php, so a
	 * rotation (a security plugin, "log everyone out") or a database copied to a site with different
	 * salts would make every issued card unfindable. Resolution order:
	 *
	 * 1. the `SGS_GIFT_CARD_CODE_KEY` constant, when defined in wp-config.php (for sites that want the
	 *    key off the database); it wins over the option;
	 * 2. the `sgs_gift_card_code_key` option (64 hex characters, autoload off);
	 * 3. otherwise one is created now ({@see self::create_key()}). An existing key is never replaced.
	 *
	 * @return string
	 */
	public static function default_key(): string {
		if ( \defined( 'SGS_GIFT_CARD_CODE_KEY' ) && \is_string( \constant( 'SGS_GIFT_CARD_CODE_KEY' ) ) && '' !== \constant( 'SGS_GIFT_CARD_CODE_KEY' ) ) {
			return (string) \constant( 'SGS_GIFT_CARD_CODE_KEY' );
		}
		$stored = \get_option( self::KEY_OPTION, '' );
		if ( \is_string( $stored ) && '' !== $stored ) {
			return $stored;
		}
		return self::create_key();
	}

	/**
	 * Create the key if none exists, and return the key that is stored.
	 *
	 * `add_option()` only inserts when the option is absent, so a concurrent first request can never
	 * overwrite a key another request has just stored; the stored value is read back and returned.
	 *
	 * @return string
	 */
	public static function create_key(): string {
		$candidate = \bin2hex( \random_bytes( 32 ) );
		\add_option( self::KEY_OPTION, $candidate, '', false );
		$stored = \get_option( self::KEY_OPTION, '' );
		if ( ! \is_string( $stored ) || '' === $stored ) {
			// A key that was never stored would strand every card issued under it, so no code is made without one.
			throw new \RuntimeException( 'The gift card code key could not be stored.' );
		}
		return $stored;
	}
}
