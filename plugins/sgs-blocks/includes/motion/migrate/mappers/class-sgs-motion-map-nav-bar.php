<?php
/**
 * The `nav-bar` migration mapper (Spec 38A §13.1, §13.2, FR-38A-51; build unit M4.6): the U-5 dropdown and mega panel
 * motion attributes on `sgs/nav-bar-menu` (`.claude/reports/2026-09-24-u5-motion-design.md`) to Entrance layers with
 * the `open` trigger.
 *
 * One bar setting drove every dropdown and mega panel it shows, and the mega panels are other posts, so the whole
 * mapping lives on the bar (`Sgs_Motion_Legacy_Nav_Bar` reads the values):
 *
 * - `elements.panel.entrance.base`: the panel shape, opening time and easing, with the closing time as its close
 *   duration (no layer for `none`);
 * - with an item step: the item entrance on `subitem` (dropdown items) and on `mega-item` (mega panel columns) or, for
 *   `submenuItemStaggerScope: rows`, on `mega-row` (each column's rows), plus the stagger settings (offset 0, the old
 *   step, the old maximum as `cap`), which the bar's render turns into one stored delay per item index in each panel
 *   (`includes/helpers-nav-bar-motion-model.php`, `Sgs_Motion_Loop_Delays::item_array`); the old ladder computed
 *   `min(i × step, max)` from the item's position in its panel, and the stored delays are the same numbers.
 *
 * A bar with any value that has no exact destination is left entirely unmapped and every present attribute is
 * reported: mapping part of it would put the bar on the Entrance model and silently drop the rest. A bar whose panels
 * play nothing (`none`) and whose items have no step keeps `submenuAnimation`, reported, because without a layer the
 * bar stays on the old path, where a removed `none` would revert to the default fade; its inert timing attributes are
 * consumed.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/interface-sgs-motion-mapper.php';
require_once dirname( __DIR__ ) . '/class-sgs-motion-legacy-nav-bar.php';

/**
 * Class Sgs_Motion_Map_Nav_Bar
 */
final class Sgs_Motion_Map_Nav_Bar implements Sgs_Motion_Mapper_Interface {

	const BAR = 'sgs/nav-bar-menu';

	/**
	 * The mapper's family slug.
	 *
	 * @return string
	 */
	public function family(): string {
		return 'nav-bar';
	}

	/**
	 * Whether the block is a bar still holding an old panel motion attribute.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return bool
	 */
	public function handles( string $block_name, array $attrs ): bool {
		if ( self::BAR !== $block_name ) {
			return false;
		}
		return array() !== self::present( $attrs );
	}

	/**
	 * Map the bar's panel and item motion.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported: array<int,array<string,mixed>>}
	 */
	public function map( string $block_name, array $attrs ): array {
		$present = self::present( $attrs );
		$read    = Sgs_Motion_Legacy_Nav_Bar::read( $attrs );
		if ( ! $read['ok'] ) {
			$reported = $read['reported'];
			$named    = array_column( $reported, 'attr' );
			foreach ( $present as $key ) {
				if ( ! in_array( $key, $named, true ) ) {
					$reported[] = Sgs_Motion_Legacy_Nav_Bar::row( $key, $attrs[ $key ], 'left in place: the bar has a value with no destination, so none of its panel motion is mapped', false );
				}
			}
			return self::result( array(), array(), $reported );
		}

		$panel = Sgs_Motion_Legacy_Nav_Bar::panel_layer( $read );
		$item  = Sgs_Motion_Legacy_Nav_Bar::item_layer( $read );

		$reported = array();
		if ( null === $item ) {
			foreach ( array_diff( array_intersect( Sgs_Motion_Legacy_Nav_Bar::ITEM_ATTRS, $present ), array( 'submenuItemStagger' ) ) as $key ) {
				$reported[] = Sgs_Motion_Legacy_Nav_Bar::row( $key, $attrs[ $key ], 'inert: an item setting with no stagger step', true );
			}
		}
		if ( null === $panel && null === $item ) {
			$consumed = array_values( array_diff( $present, array( 'submenuAnimation' ) ) );
			foreach ( array_diff( array_intersect( Sgs_Motion_Legacy_Nav_Bar::PANEL_ATTRS, $present ), array( 'submenuAnimation' ) ) as $key ) {
				$reported[] = Sgs_Motion_Legacy_Nav_Bar::row( $key, $attrs[ $key ], 'inert: a panel timing with no panel motion', true );
			}
			if ( in_array( 'submenuAnimation', $present, true ) ) {
				$reported[] = Sgs_Motion_Legacy_Nav_Bar::row( 'submenuAnimation', $attrs['submenuAnimation'], 'left in place: the panels play nothing, so the bar has no layer and stays on the old path, which reads it as no motion (removed with the old attributes in M6.6)', false );
			}
			return self::result( array(), $consumed, $reported );
		}

		$elements = array();
		if ( null !== $panel ) {
			$elements['panel'] = array( 'entrance' => array( 'base' => $panel ) );
		}
		$motion = array( 'v' => 1 );
		if ( null !== $item ) {
			$mega_part              = 'rows' === $read['scope'] ? 'mega-row' : 'mega-item';
			$elements['subitem']    = array( 'entrance' => array( 'base' => $item ) );
			$elements[ $mega_part ] = array( 'entrance' => array( 'base' => $item ) );
			$motion['stagger']      = Sgs_Motion_Legacy_Nav_Bar::stagger( $read );
		}
		$motion['elements'] = $elements;
		return self::result( $motion, $present, $reported );
	}

	/**
	 * The old attributes the block stores, in catalogue order.
	 *
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @return string[]
	 */
	private static function present( array $attrs ): array {
		return array_values( array_intersect( array_merge( Sgs_Motion_Legacy_Nav_Bar::PANEL_ATTRS, Sgs_Motion_Legacy_Nav_Bar::ITEM_ATTRS ), array_keys( $attrs ) ) );
	}

	/**
	 * One result.
	 *
	 * @param array<string,mixed>            $motion   The fragment.
	 * @param string[]                       $consumed Consumed attributes.
	 * @param array<int,array<string,mixed>> $reported Reported rows.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported: array<int,array<string,mixed>>}
	 */
	private static function result( array $motion, array $consumed, array $reported ): array {
		return array(
			'motion'   => $motion,
			'consumed' => $consumed,
			'reported' => $reported,
		);
	}
}
