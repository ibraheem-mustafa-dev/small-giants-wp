<?php
/**
 * SGS Add-on price list — storage + public read/resolve API (Spec 43 FR-43-17/18).
 *
 * One site-wide list of add-on groups (e.g. an optician's lens type, thickness
 * and finish; a print shop's finishes; a bakery's add-ons), kept in a single
 * option. The block side (sgs/choice-flow priced add-on step) reads prices
 * ONLY through these functions — never from a value typed into the block —
 * so a price change on the settings page changes every flow and every cart
 * line from the next recalculation (FR-43-17).
 *
 * Storage shape (option `sgs_addon_price_list`, autoload off):
 *   [
 *     { "key": "lens-use", "label": "Lens type", "options": [
 *       { "key": "distance", "label": "Distance", "price": "59.00" }, ...
 *     ] }, ...
 *   ]
 *
 * @package SGS\Blocks
 * @since   1.5.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** The option name the add-on price list is stored under. */
const SGS_ADDON_PRICE_LIST_OPTION = 'sgs_addon_price_list';

if ( ! function_exists( __NAMESPACE__ . '\\sgs_addon_price_list' ) ) {
	/**
	 * Read the full site-wide add-on price list.
	 *
	 * @return array<int,array{key:string,label:string,options:array<int,array{key:string,label:string,price:float}>}>
	 */
	function sgs_addon_price_list(): array {
		$raw = \get_option( SGS_ADDON_PRICE_LIST_OPTION, array() );
		return sgs_addon_price_list_normalise( \is_array( $raw ) ? $raw : array() );
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_addon_group' ) ) {
	/**
	 * Look up one group by key.
	 *
	 * @param string $key Group key.
	 * @return array{key:string,label:string,options:array<int,array{key:string,label:string,price:float}>}|null
	 */
	function sgs_addon_group( string $key ): ?array {
		$key = \sanitize_key( $key );
		foreach ( sgs_addon_price_list() as $group ) {
			if ( $group['key'] === $key ) {
				return $group;
			}
		}
		return null;
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_addon_resolve' ) ) {
	/**
	 * Resolve client-sent {group, key} pairs against the CURRENT price list.
	 *
	 * The browser sends only {group, key} pairs (FR-43-18) — never a price or
	 * a label. This is the ONLY function that turns those pairs into priced,
	 * labelled lines; every caller (cart proxy, Store API filter, cart totals
	 * recalculation) MUST route through it rather than trusting client input.
	 *
	 * @param array<int,array{group?:mixed,key?:mixed}> $pairs Client-sent pairs.
	 * @return \WP_Error|array{lines:array<int,array{group:string,group_label:string,key:string,label:string,price:float}>,total:float}
	 */
	function sgs_addon_resolve( array $pairs ) {
		$lines      = array();
		$total      = 0.0;
		$seen_group = array();

		foreach ( $pairs as $pair ) {
			if ( ! \is_array( $pair ) || ! isset( $pair['group'], $pair['key'] )
				|| ! \is_scalar( $pair['group'] ) || ! \is_scalar( $pair['key'] ) ) {
				return new \WP_Error(
					'sgs_addon_invalid_input',
					\__( 'Add-on selection is malformed.', 'sgs-blocks' )
				);
			}

			$group_key  = \sanitize_key( (string) $pair['group'] );
			$option_key = \sanitize_key( (string) $pair['key'] );

			if ( '' === $group_key || '' === $option_key ) {
				return new \WP_Error(
					'sgs_addon_invalid_input',
					\__( 'Add-on selection is malformed.', 'sgs-blocks' )
				);
			}

			if ( isset( $seen_group[ $group_key ] ) ) {
				return new \WP_Error(
					'sgs_addon_duplicate_group',
					\sprintf(
						/* translators: %s: the add-on group key. */
						\__( 'More than one option was chosen for the "%s" add-on group.', 'sgs-blocks' ),
						$group_key
					)
				);
			}
			$seen_group[ $group_key ] = true;

			$group = sgs_addon_group( $group_key );
			if ( null === $group ) {
				return new \WP_Error(
					'sgs_addon_unknown_group',
					\sprintf(
						/* translators: %s: the add-on group key. */
						\__( 'Unknown add-on group: %s', 'sgs-blocks' ),
						$group_key
					)
				);
			}

			$option = null;
			foreach ( $group['options'] as $candidate ) {
				if ( $candidate['key'] === $option_key ) {
					$option = $candidate;
					break;
				}
			}
			if ( null === $option ) {
				return new \WP_Error(
					'sgs_addon_unknown_option',
					\sprintf(
						/* translators: 1: the add-on option key, 2: the add-on group key. */
						\__( 'Unknown add-on option "%1$s" in group "%2$s".', 'sgs-blocks' ),
						$option_key,
						$group_key
					)
				);
			}

			$lines[] = array(
				'group'       => $group_key,
				'group_label' => $group['label'],
				'key'         => $option_key,
				'label'       => $option['label'],
				'price'       => $option['price'],
			);
			$total  += $option['price'];
		}

		return array(
			'lines' => $lines,
			'total' => \round( $total, 2 ),
		);
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_addon_summary' ) ) {
	/**
	 * Build the display line for a set of resolved add-on lines, e.g.
	 * "Single vision · Thin 1.67 · Polarised grey".
	 *
	 * @param array<int,array{label:string}> $lines Resolved lines (see sgs_addon_resolve()).
	 * @return string
	 */
	function sgs_addon_summary( array $lines ): string {
		$labels = array();
		foreach ( $lines as $line ) {
			if ( isset( $line['label'] ) && '' !== (string) $line['label'] ) {
				$labels[] = (string) $line['label'];
			}
		}
		return \implode( ' · ', $labels );
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_addon_price_list_normalise' ) ) {
	/**
	 * Normalise/sanitise a raw add-on price list (from the option, an admin
	 * form submission, or a CLI seed file) into the canonical shape. Used on
	 * every read AND every write, so a malformed value already sitting in the
	 * option (e.g. hand-edited) can never leak an un-sanitised price/label.
	 *
	 * Keys are unique within a group (a duplicate key is dropped, first wins);
	 * empty rows (no key or no label) are ignored; price is clamped to a
	 * non-negative 2dp decimal.
	 *
	 * @param array<int,mixed> $raw Raw list.
	 * @return array<int,array{key:string,label:string,options:array<int,array{key:string,label:string,price:float}>}>
	 */
	function sgs_addon_price_list_normalise( array $raw ): array {
		$groups     = array();
		$seen_group = array();

		foreach ( $raw as $group ) {
			if ( ! \is_array( $group ) ) {
				continue;
			}
			$group_key = isset( $group['key'] ) ? \sanitize_key( (string) $group['key'] ) : '';
			$label     = isset( $group['label'] ) ? \sanitize_text_field( (string) $group['label'] ) : '';
			if ( '' === $group_key || '' === $label || isset( $seen_group[ $group_key ] ) ) {
				continue;
			}
			$seen_group[ $group_key ] = true;

			$options     = array();
			$seen_option = array();
			$raw_options = isset( $group['options'] ) && \is_array( $group['options'] ) ? $group['options'] : array();

			foreach ( $raw_options as $option ) {
				if ( ! \is_array( $option ) ) {
					continue;
				}
				$option_key   = isset( $option['key'] ) ? \sanitize_key( (string) $option['key'] ) : '';
				$option_label = isset( $option['label'] ) ? \sanitize_text_field( (string) $option['label'] ) : '';
				if ( '' === $option_key || '' === $option_label || isset( $seen_option[ $option_key ] ) ) {
					continue;
				}
				$seen_option[ $option_key ] = true;

				$price_raw = isset( $option['price'] ) ? $option['price'] : 0;
				$price     = \function_exists( 'wc_format_decimal' )
					? (float) \wc_format_decimal( $price_raw, 2 )
					: \round( (float) $price_raw, 2 );
				$price     = \max( 0.0, $price );

				$options[] = array(
					'key'   => $option_key,
					'label' => $option_label,
					'price' => $price,
				);
			}

			$groups[] = array(
				'key'     => $group_key,
				'label'   => $label,
				'options' => $options,
			);
		}

		return $groups;
	}
}
