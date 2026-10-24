<?php
/**
 * The `transition` entries a block's own stylesheet holds on a motion part, which the emitter's scoped `transition`
 * would otherwise replace.
 *
 * A hover state writes one scoped `transition` list (the movement owners and the paint properties). A declaration on
 * the part's id selector beats the block stylesheet's own `transition`, so every entry the stylesheet listed that the
 * emitter does not (`transform`, `translate`, `opacity` on a button) stops easing and the lift or press snaps. The
 * emitter appends these entries to its list (`Sgs_Motion_Emitter::emit`), so the stylesheet's timing keeps applying to
 * them while the emitter's paint entries keep the hover timing the client chose.
 *
 * The table is generated from the stylesheets (`scripts/generate-motion-base-transitions.py --write` writes
 * `includes/motion/data/base-transitions.json`; the `--check` gate fails while the file differs), so a block's part is
 * covered the moment its style.css transitions `transform`, `translate` or `opacity` on it.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Base_Transitions
 */
final class Sgs_Motion_Base_Transitions {

	/** The generated data file. */
	const DATA_FILE = __DIR__ . '/data/base-transitions.json';

	/**
	 * Block name => motion part key => the `property duration easing` entries the stylesheet holds on that part.
	 *
	 * @return array<string,array<string,array<int,string>>>
	 */
	private static function table(): array {
		static $table = null;
		if ( null === $table ) {
			$decoded = json_decode( (string) file_get_contents( self::DATA_FILE ), true );
			$table   = is_array( $decoded ) ? $decoded : array();
		}
		return $table;
	}

	/**
	 * The entries the stylesheet holds on one part of a block.
	 *
	 * A property the element already writes through a motion channel (`translate`, `opacity`: composed from owner custom
	 * properties the emitter transitions) is left out, since a second transition on the composed property would ease
	 * the same movement twice.
	 *
	 * @param string            $block    Block name.
	 * @param string            $target   Motion part key.
	 * @param array<int,string> $channels The channels the element's motion writes.
	 * @return array<int,string> `property duration easing` entries, empty when the block has no row for the part.
	 */
	public static function entries( string $block, string $target, array $channels = array() ): array {
		$entries = self::table()[ $block ][ $target ] ?? array();
		return array_values(
			array_filter(
				array_map( 'strval', $entries ),
				static function ( string $entry ) use ( $channels ): bool {
					return ! in_array( strtok( $entry, ' ' ), $channels, true );
				}
			)
		);
	}

	/**
	 * Put the hover state's own movement timing on the kept entries.
	 *
	 * An entry is `property duration easing`; the emitter's movement owners take the state's duration and easing, so the
	 * stylesheet's entries on the same element take them too, or one lift would run at two speeds. A timing the state
	 * does not set stays the stylesheet's own.
	 *
	 * @param array<int,string>     $entries `property duration easing` entries from `entries()`.
	 * @param array<string,string> $set     The state's own `duration` and/or `easing` CSS values.
	 * @return array<int,string>
	 */
	public static function retime( array $entries, array $set ): array {
		if ( array() === $set ) {
			return $entries;
		}
		return array_map(
			static function ( string $entry ) use ( $set ): string {
				$parts = self::split( $entry );
				if ( count( $parts ) < 3 ) {
					return $entry;
				}
				$parts[1] = $set['duration'] ?? $parts[1];
				$parts[2] = $set['easing'] ?? $parts[2];
				return implode( ' ', $parts );
			},
			$entries
		);
	}

	/**
	 * Split an entry on whitespace outside parentheses, so a `var( --x )` or `cubic-bezier()` stays one token.
	 *
	 * @param string $entry A transition entry.
	 * @return array<int,string>
	 */
	private static function split( string $entry ): array {
		$parts = array();
		$depth = 0;
		$token = '';
		foreach ( str_split( trim( $entry ) ) as $char ) {
			if ( '(' === $char ) {
				++$depth;
			} elseif ( ')' === $char ) {
				--$depth;
			}
			if ( 0 === $depth && ( ' ' === $char || "	" === $char ) ) {
				if ( '' !== $token ) {
					$parts[] = $token;
					$token   = '';
				}
				continue;
			}
			$token .= $char;
		}
		if ( '' !== $token ) {
			$parts[] = $token;
		}
		return $parts;
	}
}
