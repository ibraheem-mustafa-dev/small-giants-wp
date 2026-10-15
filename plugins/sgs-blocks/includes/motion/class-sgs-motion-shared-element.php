<?php
/**
 * Two motion targets on one element (Spec 38A §6.2, §6.5).
 *
 * Two parts can resolve to the same element: a breadcrumb item that is also the current item carries both the `item`
 * and the `current` part classes, and the root and an `isWrapper` part are both the root. One element has one hover
 * state and one entrance, so the target declared EARLIER keeps them: `root` first, then the parts in their
 * `supports.sgs.elements` order, then the cloning-only `custom:<n>` targets in stored order. A later target that shares
 * any element with an earlier one loses its hover state (`hover.state`) and its entrance (`entrance.base`), each drop
 * reported through `sgs_motion_layer_dropped` with the refusal id `shared-element`, and it writes no `transition`, so the
 * element keeps one consistent transition list. Its effect layers stay: their `data-sgs-fx` tokens, channels and
 * injected layers join the element's (`Sgs_Motion_Markup::write`).
 *
 * The editor-canvas twin is `src/blocks/extensions/motion/canvas/shared-element.js`.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Shared_Element
 */
final class Sgs_Motion_Shared_Element {

	/** The refusal id a shared-element drop is reported with. */
	const REFUSAL = 'shared-element';

	/** The layers a later target on a shared element gives up. */
	const LAYERS = array( 'hover.state', 'entrance.base' );

	/**
	 * A target's place in declaration order: root first, then the declared parts, then custom targets.
	 *
	 * @param string             $target Target key.
	 * @param array<string,bool> $parts  The block's motion parts, in declaration order (`Sgs_Motion_Targets::parts`).
	 * @return int
	 */
	public static function rank( string $target, array $parts ): int {
		if ( 'root' === $target ) {
			return -1;
		}
		$at = array_search( $target, array_keys( $parts ), true );
		return false === $at ? 100000 : (int) $at;
	}

	/**
	 * The targets that share an element with an earlier-declared target: target => the earlier target it yields to.
	 *
	 * @param string              $html     Block HTML.
	 * @param string              $name     Block name.
	 * @param string              $scope    Scope class.
	 * @param array<string,mixed> $elements The sanitised document's elements.
	 * @return array<string,string>
	 */
	public static function losers( string $html, string $name, string $scope, array $elements ): array {
		$parts   = Sgs_Motion_Targets::parts( $name );
		$matches = array();
		foreach ( $elements as $target => $element ) {
			$resolved = Sgs_Motion_Targets::resolve( $name, $scope, (string) $target, (array) $element );
			if ( null !== $resolved ) {
				$matches[ (string) $target ] = $resolved['match'];
			}
		}
		if ( count( $matches ) < 2 ) {
			return array();
		}
		$order = array_keys( $matches );
		$index = array_flip( $order );
		usort(
			$order,
			static function ( string $a, string $b ) use ( $parts, $index ): int {
				return array( self::rank( $a, $parts ), $index[ $a ] ) <=> array( self::rank( $b, $parts ), $index[ $b ] );
			}
		);
		$sorted = array();
		foreach ( $order as $target ) {
			$sorted[ $target ] = $matches[ $target ];
		}
		$out = array();
		foreach ( Sgs_Motion_Markup::element_hits( $html, $sorted ) as $hits ) {
			foreach ( array_slice( $hits, 1 ) as $later ) {
				if ( ! isset( $out[ $later ] ) ) {
					$out[ $later ] = $hits[0];
				}
			}
		}
		return $out;
	}

	/**
	 * A later target's element without its hover state and entrance, each drop reported.
	 *
	 * @param array<string,mixed> $element The element.
	 * @param string              $name    Block name.
	 * @param string              $target  Target key.
	 * @param string              $keeper  The earlier target that keeps the element's hover state and entrance.
	 * @return array<string,mixed>
	 */
	public static function strip( array $element, string $name, string $target, string $keeper ): array {
		foreach ( self::LAYERS as $path ) {
			list( $panel, $key ) = explode( '.', $path );
			if ( ! isset( $element[ $panel ][ $key ] ) ) {
				continue;
			}
			unset( $element[ $panel ][ $key ] );
			if ( array() === $element[ $panel ] ) {
				unset( $element[ $panel ] );
			}
			do_action(
				'sgs_motion_layer_dropped',
				$name,
				$target,
				array(
					'id'    => self::REFUSAL,
					'layer' => $path,
					'text'  => $target . ' shares its element with ' . $keeper . ', which is declared earlier and keeps the element\'s ' . $path . '.',
				)
			);
		}
		return $element;
	}
}
