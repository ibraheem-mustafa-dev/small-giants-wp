<?php
/**
 * The holder a background Lottie layer plays in (Spec 38A FR-38A-52).
 *
 * A `lottie` effect layer on a background block's `background` part needs an element that can hold the player's
 * `<svg>`. The part's selector is `.sgs-container__image-bg`, which is the background `<img>` when there is no
 * Lottie, and an `<img>` cannot hold children. So when the part holds a `lottie` layer, `SGS_Container_Wrapper` prints
 * a holder `<div>` carrying that class (and `sgs-container__lottie-bg`, the old holder's class, so the same
 * `fx-lottie.css` rule fills the section behind its content) with the background image inside as the poster. The
 * poster takes `sgs-container__lottie-poster` instead of the part class, so the motion renderer stamps the layer on the
 * holder alone; it inherits the holder's object-fit and object-position, so the block's focal point still applies.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Background_Lottie
 */
final class Sgs_Motion_Background_Lottie {

	/** The part the layer sits on. */
	const PART = 'background';

	/** The poster image's class inside the holder. */
	const POSTER_CLASS = 'sgs-container__lottie-poster';

	/**
	 * Whether the block's stored motion holds a `lottie` layer on the background part.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @return bool
	 */
	public static function has_layer( array $attributes ): bool {
		$effects = $attributes['sgsMotion']['elements'][ self::PART ]['effects'] ?? null;
		if ( ! is_array( $effects ) ) {
			return false;
		}
		foreach ( $effects as $layer ) {
			if ( is_array( $layer ) && 'lottie' === ( $layer['effect'] ?? '' ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * The holder, with the poster image (already escaped markup, or '') inside.
	 *
	 * @param string $poster_html The background image built with `POSTER_CLASS`, or ''.
	 * @return string
	 */
	public static function holder( string $poster_html ): string {
		return '<div class="sgs-container__image-bg sgs-container__lottie-bg" aria-hidden="true">' . $poster_html . '</div>';
	}
}
