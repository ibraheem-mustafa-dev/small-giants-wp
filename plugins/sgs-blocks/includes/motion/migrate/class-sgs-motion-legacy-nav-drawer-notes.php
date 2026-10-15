<?php
/**
 * Reported rows for the drawer differences the motion model plays on purpose (Spec 38A §13.2, FR-38A-51): the values
 * are mapped, and these rows say where the swept drawer will move differently, so the sweep's report surfaces them.
 *
 * - The menu's reversed close: the old ladder was `min((n - 1 - i) × step, cap)`, counted from the last item before
 *   the cap; the menu's render mirrors the open delays (`Sgs_Motion_Stagger::compute_close_delays` `reversed`,
 *   high + low - delay). The two agree with no cap or when the cap is at least `(n - 1) × step`; `n` is the live
 *   menu's length, unknown at migration time, so every capped reversed menu is reported.
 * - The panel's transform origin: the old path took it from the RESOLVED shape at each tier
 *   (`sgs_nav_drawer_motion_keyframes( $shape, $anchor )['origin']`), the model path from the `auto` shape for the
 *   anchor (`helpers-nav-drawer-motion-model.php::sgs_nav_drawer_motion_origin_css`). A tier whose mapped panel scales
 *   (the only channel the origin moves) and whose two origins differ is reported; `corner-scale`, reachable only as the
 *   `auto` shape of a trigger anchor, takes `top right` on both paths and so is reported only if that ever changes.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-motion-legacy-nav-drawer.php';

/**
 * Class Sgs_Motion_Legacy_Nav_Drawer_Notes
 */
final class Sgs_Motion_Legacy_Nav_Drawer_Notes {

	/**
	 * The row for a capped reverse-on-close menu.
	 *
	 * @param array<string,mixed> $items The `Sgs_Motion_Legacy_Nav_Drawer_Items::items()` result.
	 * @return array<string,mixed>|null The row, or null when the two close ladders always agree.
	 */
	public static function menu_close_row( array $items ): ?array {
		if ( empty( $items['reversed'] ) || (int) $items['cap'] <= 0 ) {
			return null;
		}
		$step = (int) $items['step'];
		$cap  = (int) $items['cap'];
		return Sgs_Motion_Legacy_Nav_Drawer::row(
			'itemStaggerOnClose',
			true,
			'changed: the menu closes on a mirror of its open delays (highest open delay + lowest - each item\'s open delay); the old close counted from the last item, min((items - 1 - position) x ' . $step . 'ms, ' . $cap . 'ms). They differ when the menu holds more than ' . ( intdiv( $cap, max( 1, $step ) ) + 1 ) . ' items (the cap of ' . $cap . 'ms is below (items - 1) x ' . $step . 'ms): the last items then close together at 0ms where the first items used to close together at the cap. The live menu\'s length is not known at migration time, so every capped reversed menu is reported',
			true
		);
	}

	/**
	 * The row for a scaling panel whose transform origin moves on the model path.
	 *
	 * @param array<string,mixed> $attrs    Stored drawer attributes.
	 * @param string[]            $consumed The panel's consumed attributes (the row applies only to a mapped panel).
	 * @return array<string,mixed>|null The row, or null when every tier keeps its origin.
	 */
	public static function origin_row( array $attrs, array $consumed ): ?array {
		if ( ! in_array( 'entryAnimation', $consumed, true ) ) {
			return null;
		}
		$shapes = sgs_nav_drawer_motion_shapes();
		$fade   = ! array_key_exists( 'entryFade', $attrs ) || ! empty( $attrs['entryFade'] );
		$moved  = array();
		foreach ( Sgs_Motion_Legacy_Nav_Drawer::TIERS as $tier ) {
			$anchor = (string) Sgs_Motion_Legacy_Nav_Drawer::tier( $attrs['anchor'] ?? array(), $tier, 'full-screen' );
			$shape  = (string) Sgs_Motion_Legacy_Nav_Drawer::tier( $attrs['entryAnimation'] ?? array(), $tier, 'auto' );
			$shape  = in_array( $shape, $shapes, true ) ? $shape : 'auto';
			$shape  = 'auto' === $shape ? sgs_nav_drawer_motion_auto_shape( $anchor ) : $shape;
			$moves  = Sgs_Motion_Legacy_Nav_Drawer::panel_channels( $shape, $fade );
			if ( null === $moves || ( ! isset( $moves['scale'] ) && ! isset( $moves['scaleY'] ) ) ) {
				continue;
			}
			$old = sgs_nav_drawer_motion_keyframes( $shape, $anchor )['origin'];
			$new = sgs_nav_drawer_motion_keyframes( 'auto', $anchor )['origin'];
			if ( $old !== $new ) {
				$moved[] = $tier . ' (' . $shape . ' on a ' . $anchor . ' anchor: ' . $old . ', now ' . $new . ')';
			}
		}
		if ( array() === $moved ) {
			return null;
		}
		return Sgs_Motion_Legacy_Nav_Drawer::row(
			'entryAnimation',
			$attrs['entryAnimation'] ?? 'auto',
			'changed: the panel scales from a different transform origin, because the model takes the origin from the anchor\'s automatic shape and the old path took it from the chosen shape, at ' . implode( '; ', $moved ),
			true
		);
	}
}
