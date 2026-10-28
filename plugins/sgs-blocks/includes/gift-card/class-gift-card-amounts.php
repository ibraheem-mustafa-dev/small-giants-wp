<?php
/**
 * Gift card amounts for one product (Spec 27, FR-27-GC1).
 *
 * A gift-card product carries a list of fixed amounts (Mama's: 15, 25, 40
 * pounds) and an optional custom amount between a minimum and a maximum, off by
 * default. The price a customer pays is always resolved here, server-side, from
 * the product's own configuration: a posted price is never trusted.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Parse and resolve gift-card amounts.
 */
final class Gift_Card_Amounts {

	/** Most fixed amounts one product can list. */
	const MAX_FIXED = 20;

	/** Product meta: fixed amounts in pence. */
	const META_AMOUNTS = '_sgs_gift_card_amounts';

	/** Product meta: custom amount switch (yes or no). */
	const META_CUSTOM = '_sgs_gift_card_custom';

	/** Product meta: smallest custom amount in pence. */
	const META_CUSTOM_MIN = '_sgs_gift_card_custom_min';

	/** Product meta: largest custom amount in pence. */
	const META_CUSTOM_MAX = '_sgs_gift_card_custom_max';

	/**
	 * Parse an admin-typed list ("15, 25, 40" or "£15; £25") into sorted unique pence.
	 *
	 * @param string $input Comma, semicolon or newline separated pounds.
	 * @return array<int,int>
	 */
	public static function parse_list( string $input ): array {
		$out = array();
		foreach ( (array) \preg_split( '/[,;\n]+/', $input ) as $part ) {
			$pence = Gift_Card_Money::to_pence( (string) $part );
			if ( null !== $pence ) {
				$out[ $pence ] = $pence;
			}
		}
		\sort( $out );
		return \array_slice( \array_values( $out ), 0, self::MAX_FIXED );
	}

	/**
	 * Build a normalised product configuration.
	 *
	 * @param array<int,mixed> $fixed          Fixed amounts in pence.
	 * @param bool             $custom_enabled Whether a custom amount is allowed.
	 * @param int              $custom_min     Smallest custom amount (pence).
	 * @param int              $custom_max     Largest custom amount (pence).
	 * @return array{amounts:array<int,int>,custom_enabled:bool,custom_min:int,custom_max:int}
	 */
	public static function config( array $fixed, bool $custom_enabled, int $custom_min, int $custom_max ): array {
		$amounts = array();
		foreach ( $fixed as $value ) {
			$pence = Gift_Card_Money::to_pence( (int) $value, true );
			if ( null !== $pence ) {
				$amounts[ $pence ] = $pence;
			}
		}
		\sort( $amounts );

		$min = \max( 100, $custom_min );
		$max = \min( Gift_Card_Money::MAX_PENCE, \max( $min, $custom_max ) );

		return array(
			'amounts'        => \array_slice( \array_values( $amounts ), 0, self::MAX_FIXED ),
			'custom_enabled' => $custom_enabled,
			'custom_min'     => $min,
			'custom_max'     => $max,
		);
	}

	/**
	 * Resolve what the shopper chose to the price in pence, or null when it is not allowed.
	 *
	 * @param array<string,mixed> $config {@see self::config()}.
	 * @param string              $choice A fixed amount in pence as digits, or the word "custom".
	 * @param string              $custom The custom amount in pounds (used only when $choice is "custom").
	 * @return int|null
	 */
	public static function resolve( array $config, string $choice, string $custom = '' ): ?int {
		if ( 'custom' === $choice ) {
			if ( empty( $config['custom_enabled'] ) ) {
				return null;
			}
			$pence = Gift_Card_Money::to_pence( $custom );
			if ( null === $pence || $pence < (int) $config['custom_min'] || $pence > (int) $config['custom_max'] ) {
				return null;
			}
			return $pence;
		}

		if ( 1 !== \preg_match( '/^\d{1,8}$/', $choice ) ) {
			return null;
		}
		$pence = (int) $choice;
		return \in_array( $pence, $config['amounts'], true ) ? $pence : null;
	}
}
