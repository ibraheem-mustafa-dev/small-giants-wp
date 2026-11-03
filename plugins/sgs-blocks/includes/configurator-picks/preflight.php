<?php
/**
 * Product_Preflight check for the buy box "Pick a set" mode: setup faults that would make a product's pick groups
 * unusable. Called from Product_Preflight::evaluate() (FR-27-PREFLIGHT).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( __NAMESPACE__ . '\\sgs_picks_preflight_issues' ) ) {
	/**
	 * Setup faults of a "Pick a set" product, as Product_Preflight issues: a pick-several group with fewer than two
	 * options, a pack option with no readable number, or a `most` above the smallest pack. A product with no
	 * pick-several group has none.
	 *
	 * @param array<int,array<string,mixed>>                                 $groups Resolver output.
	 * @param array{key:string,units:array<string,int>,unparseable:string[]} $pack   Configurator_Groups::pack() output.
	 * @return array<int,array{code:string,message:string,severity:string}>
	 */
	function sgs_picks_preflight_issues( array $groups, array $pack ): array {
		$issues = array();
		$multi  = false;
		foreach ( $groups as $group ) {
			if ( 'answer' !== ( $group['role'] ?? '' ) || empty( $group['flags']['multi'] ) ) {
				continue;
			}
			$multi = true;
			$label = wp_strip_all_tags( (string) $group['label'] );
			if ( count( $group['terms'] ?? array() ) < 2 ) {
				$issues[] = array(
					'code'     => 'picks_too_few_options',
					/* translators: %s: option group name, e.g. Flavour. */
					'message'  => sprintf( __( "'%s' lets shoppers pick several, but it has fewer than two options.", 'sgs-blocks' ), $label ),
					'severity' => 'blocker',
				);
			}
			if ( ! empty( $group['flags']['share'] ) && array() !== $pack['units'] && (int) $group['flags']['most'] > min( $pack['units'] ) ) {
				$issues[] = array(
					'code'     => 'picks_most_above_pack',
					/* translators: 1: option group name, 2: smallest pack size. */
					'message'  => sprintf( __( "'%1\$s' allows more picks than the smallest pack (%2\$d) holds.", 'sgs-blocks' ), $label, min( $pack['units'] ) ),
					'severity' => 'blocker',
				);
			}
		}
		if ( $multi ) {
			foreach ( $pack['unparseable'] as $term_label ) {
				$issues[] = array(
					'code'     => 'picks_pack_unreadable',
					/* translators: %s: pack option name. */
					'message'  => sprintf( __( "Could not read a number from the pack option '%s'. Put the number in the name or set 'Pieces in this pack'.", 'sgs-blocks' ), wp_strip_all_tags( $term_label ) ),
					'severity' => 'blocker',
				);
			}
		}
		return $issues;
	}
}
