<?php
/**
 * The `nav-drawer` migration mapper (Spec 38A §13.1, §13.2, FR-38A-51; build unit M4.5): the U-5 drawer motion
 * attributes (`.claude/reports/2026-09-24-u5-motion-design.md`) to Entrance layers with the `open` trigger.
 *
 * A group mapper, because the old item stagger belonged to the drawer's children: the drawer stored the step and the
 * browser worked out each child's delay from its position. `map_groups()` runs over a post's whole tree first and, for
 * every `sgs/nav-drawer` holding an old attribute, returns:
 *
 * - on the drawer: the panel's `entrance.base` on `root` (`Sgs_Motion_Legacy_Nav_Drawer::panel`) and the stagger
 *   helper's last settings (`offset` 0, the old step, `order` row-first, `perRow` false, the old maximum as `cap`, and
 *   `apply` false, since each child carries its own entrance);
 * - on each `sgs/nav-drawer-menu` child: the item entrance on its `item` part plus its own `stagger` settings, which
 *   the menu's render.php turns into one stored open and close delay per menu item
 *   (`Sgs_Motion_Loop_Delays::item_array`, `closeOrder` reversed for `itemStaggerOnClose`); its items counted from 0,
 *   as the old ladder counted them;
 * - on every other direct child: the item entrance on `root` with the delay the old rule gave it. With no menu in the
 *   drawer that delay is 0; beside a menu it was the last menu item's delay, which depends on the live menu's length,
 *   so the old maximum is stored when one is set (exact once the menu is long enough to reach it) and the delay is
 *   reported otherwise;
 * - with `staggerInsideGroups`, on the children of each direct `sgs/container` child instead of the container: delays
 *   from `Sgs_Motion_Stagger::compute_delays` (the container also stores the helper settings) and, with
 *   `itemStaggerOnClose`, close delays in reverse order, `min((count - 1 - i) × step, cap)` as the old ladder did.
 *
 * Children whose delays are not the helper's positional values are marked `customised: values.delay`, so a re-run of
 * the drawer's helper skips them. A child with the ambient `sgs-drift` class never took the entrance and is skipped; a
 * child with no motion support is reported. Values with no destination are reported, never approximated
 * (`Sgs_Motion_Legacy_Nav_Drawer`). `map()` handles a drawer the group pass did not reach: the panel only, with the
 * item attributes left in place and reported.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/interface-sgs-motion-mapper.php';
require_once dirname( __DIR__ ) . '/interface-sgs-motion-group-mapper.php';
require_once dirname( __DIR__ ) . '/class-sgs-motion-legacy-nav-drawer.php';
require_once dirname( __DIR__, 2 ) . '/class-sgs-motion-stagger.php';

/**
 * Class Sgs_Motion_Map_Nav_Drawer
 */
final class Sgs_Motion_Map_Nav_Drawer implements Sgs_Motion_Mapper_Interface, Sgs_Motion_Group_Mapper_Interface {

	const DRAWER    = 'sgs/nav-drawer';
	const MENU      = 'sgs/nav-drawer-menu';
	const CONTAINER = 'sgs/container';

	/**
	 * A test's stand-in for the registered block supports: callable( string $block_name ): array.
	 *
	 * @var callable|null
	 */
	private static $supports_provider = null;

	/**
	 * Replace the source of a block's `supports.sgs` (null restores the block registry).
	 *
	 * @param callable|null $provider Callable taking the block name and returning its `supports.sgs` array.
	 */
	public static function set_supports_provider( ?callable $provider ): void {
		self::$supports_provider = $provider;
	}

	/**
	 * The mapper's family slug.
	 *
	 * @return string
	 */
	public function family(): string {
		return 'nav-drawer';
	}

	/**
	 * Whether the block is a drawer still holding an old motion attribute.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return bool
	 */
	public function handles( string $block_name, array $attrs ): bool {
		if ( self::DRAWER !== $block_name ) {
			return false;
		}
		foreach ( array_merge( Sgs_Motion_Legacy_Nav_Drawer::PANEL_ATTRS, Sgs_Motion_Legacy_Nav_Drawer::ITEM_ATTRS ) as $key ) {
			if ( array_key_exists( $key, $attrs ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * A drawer the group pass did not reach: the panel only.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported: array<int,array<string,mixed>>}
	 */
	public function map( string $block_name, array $attrs ): array {
		$panel    = Sgs_Motion_Legacy_Nav_Drawer::panel( $attrs );
		$reported = $panel['reported'];
		foreach ( Sgs_Motion_Legacy_Nav_Drawer::ITEM_ATTRS as $key ) {
			if ( array_key_exists( $key, $attrs ) ) {
				$reported[] = Sgs_Motion_Legacy_Nav_Drawer::row( $key, $attrs[ $key ], 'left in place: the item delays need the drawer\'s child blocks (the group pass)', false );
			}
		}
		return array(
			'motion'   => self::panel_motion( $panel['layer'], null ),
			'consumed' => $panel['consumed'],
			'reported' => $reported,
		);
	}

	/**
	 * Map every drawer in one post's block tree, with its children.
	 *
	 * @param array<int,array<string,mixed>> $blocks The post's `parse_blocks()` result.
	 * @return array<string,array{motion:array<string,mixed>,consumed:string[],reported:array<int,array<string,mixed>>}> Patches by block path.
	 */
	public function map_groups( array $blocks ): array {
		$patches = array();
		$this->walk( $blocks, '', $patches );
		return $patches;
	}

	/**
	 * Find the drawers in one level of the tree and below.
	 *
	 * @param array<int,array<string,mixed>> $blocks  Blocks of one level.
	 * @param string                         $path    Path prefix.
	 * @param array<string,array>            $patches Patches so far (appended to).
	 */
	private function walk( array $blocks, string $path, array &$patches ): void {
		foreach ( $blocks as $i => $block ) {
			$here  = '' === $path ? (string) $i : $path . '/' . $i;
			$name  = self::name( $block );
			$attrs = self::attrs( $block );
			$inner = isset( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ? $block['innerBlocks'] : array();
			if ( '' !== $name && $this->handles( $name, $attrs ) ) {
				$this->drawer( $here, $attrs, $inner, $patches );
			}
			$this->walk( $inner, $here, $patches );
		}
	}

	/**
	 * One drawer's patches.
	 *
	 * @param string                         $path     The drawer's path.
	 * @param array<string,mixed>            $attrs    The drawer's attributes.
	 * @param array<int,array<string,mixed>> $children The drawer's inner blocks.
	 * @param array<string,array>            $patches  Patches (appended to).
	 */
	private function drawer( string $path, array $attrs, array $children, array &$patches ): void {
		$panel    = Sgs_Motion_Legacy_Nav_Drawer::panel( $attrs );
		$items    = Sgs_Motion_Legacy_Nav_Drawer::items( $attrs );
		$reported = array_merge( $panel['reported'], $items['reported'] );
		$settings = null;
		if ( null !== $items['layer'] ) {
			$settings = self::helper_settings( $items );
			$this->children( $path, $children, $items, $patches, $reported );
		}
		$patches[ $path ] = array(
			'motion'   => self::panel_motion( $panel['layer'], $settings ),
			'consumed' => array_values( array_unique( array_merge( $panel['consumed'], $items['consumed'] ) ) ),
			'reported' => $reported,
		);
	}

	/**
	 * The drawer's motion fragment: the panel entrance and the helper settings.
	 *
	 * @param array<string,mixed>|null $layer    The panel layer.
	 * @param array<string,mixed>|null $settings The helper settings.
	 * @return array<string,mixed>
	 */
	private static function panel_motion( ?array $layer, ?array $settings ): array {
		if ( null === $layer && null === $settings ) {
			return array();
		}
		$motion = array( 'v' => 1 );
		if ( null !== $layer ) {
			$motion['elements'] = array( 'root' => array( 'entrance' => array( 'base' => $layer ) ) );
		}
		if ( null !== $settings ) {
			$motion['stagger'] = $settings;
		}
		return $motion;
	}

	/**
	 * The stagger helper's settings for the old step and maximum (no cap when the old maximum was 0).
	 *
	 * @param array<string,mixed> $items The `items()` result.
	 * @return array<string,mixed>
	 */
	private static function helper_settings( array $items ): array {
		$settings = array(
			'apply'  => false,
			'offset' => 0,
			'step'   => $items['step'],
			'order'  => 'row-first',
			'perRow' => false,
		);
		if ( $items['cap'] > 0 ) {
			$settings['cap'] = $items['cap'];
		}
		if ( $items['reversed'] ) {
			$settings['closeOrder'] = 'reversed';
		}
		return $settings;
	}

	/**
	 * Place the item entrance on the drawer's children.
	 *
	 * @param string                         $path     The drawer's path.
	 * @param array<int,array<string,mixed>> $children The drawer's inner blocks.
	 * @param array<string,mixed>            $items    The `items()` result.
	 * @param array<string,array>            $patches  Patches (appended to).
	 * @param array<int,array<string,mixed>> $reported The drawer's reported rows (appended to).
	 */
	private function children( string $path, array $children, array $items, array &$patches, array &$reported ): void {
		$has_menu = false;
		foreach ( $children as $child ) {
			$has_menu = $has_menu || self::MENU === self::name( $child );
		}
		$cap      = $items['cap'];
		$beside   = 0;
		$unplaced = 0;
		foreach ( $children as $k => $child ) {
			$name = self::name( $child );
			$here = $path . '/' . $k;
			if ( '' === $name || self::drifts( $child ) ) {
				continue;
			}
			if ( self::MENU === $name ) {
				// The menu's render writes each item's open and close delay from these settings (closeOrder included).
				$layer = Sgs_Motion_Legacy_Nav_Drawer::item_layer( $items, 0, $items['reversed'] ? 0 : null, false );
				unset( $layer['values']['delay'], $layer['close']['closeDelay'] );
				$patches[ $here ] = self::patch( array( 'item' => $layer ), self::helper_settings( $items ) );
				continue;
			}
			if ( $items['groups'] && self::CONTAINER === $name ) {
				$this->group( $here, $child, $items, $has_menu, $patches, $reported, $beside, $unplaced );
				continue;
			}
			if ( ! self::supports_motion( $name ) ) {
				$reported[] = Sgs_Motion_Legacy_Nav_Drawer::row( 'itemStagger', $items['step'], 'no destination for the ' . $name . ' child at ' . $here . ': the block has no motion support', true );
				continue;
			}
			if ( $has_menu && 0 === $cap ) {
				++$unplaced;
				continue;
			}
			$beside          += $has_menu ? 1 : 0;
			$patches[ $here ] = self::patch( array( 'root' => Sgs_Motion_Legacy_Nav_Drawer::item_layer( $items, $has_menu ? $cap : 0, null, true ) ), null );
		}
		if ( $beside > 0 ) {
			$reported[] = Sgs_Motion_Legacy_Nav_Drawer::row( 'itemStagger', $items['step'], 'changed: ' . $beside . ' block(s) beside the menu arrived with the last menu item, which depends on the live menu\'s length; each stores the maximum, ' . $cap . 'ms (exact once the menu reaches it)', true );
		}
		if ( $unplaced > 0 ) {
			$reported[] = Sgs_Motion_Legacy_Nav_Drawer::row( 'itemStagger', $items['step'], 'no destination for ' . $unplaced . ' block(s) beside the menu: they arrived with the last menu item, which depends on the live menu\'s length, and no maximum is set; they keep no entrance', true );
		}
	}

	/**
	 * `staggerInsideGroups`: the container's own children take the entrance, the container none.
	 *
	 * @param string              $path      The container's path.
	 * @param array<string,mixed> $container The container block.
	 * @param array<string,mixed> $items     The `items()` result.
	 * @param bool                $has_menu  Whether the drawer holds a menu.
	 * @param array<string,array> $patches   Patches (appended to).
	 * @param array               $reported  The drawer's reported rows (appended to).
	 * @param int                 $beside    Children stored at the cap (incremented).
	 * @param int                 $unplaced  Children with no destination (incremented).
	 */
	private function group( string $path, array $container, array $items, bool $has_menu, array &$patches, array &$reported, int &$beside, int &$unplaced ): void {
		$inner = isset( $container['innerBlocks'] ) && is_array( $container['innerBlocks'] ) ? $container['innerBlocks'] : array();
		$named = array();
		foreach ( $inner as $j => $child ) {
			if ( '' !== self::name( $child ) ) {
				$named[ $j ] = $child;
			}
		}
		$count = count( $named );
		if ( 0 === $count ) {
			return;
		}
		$cap      = $items['cap'];
		$settings = self::helper_settings( $items );
		$delays   = Sgs_Motion_Stagger::compute_delays( array_merge( $settings, array( 'count' => $count ) ) );
		$mirror   = Sgs_Motion_Stagger::compute_close_delays( $delays, 'reversed' );
		if ( ! $has_menu ) {
			$patches[ $path ] = self::patch( array(), $settings );
		}
		$position = 0;
		foreach ( $named as $j => $child ) {
			$here  = $path . '/' . $j;
			$index = $position++;
			$name  = self::name( $child );
			if ( self::drifts( $child ) ) {
				continue;
			}
			if ( ! self::supports_motion( $name ) ) {
				$reported[] = Sgs_Motion_Legacy_Nav_Drawer::row( 'staggerInsideGroups', true, 'no destination for the ' . $name . ' child at ' . $here . ': the block has no motion support', true );
				continue;
			}
			if ( $has_menu && 0 === $cap ) {
				++$unplaced;
				continue;
			}
			$close = null;
			if ( $items['reversed'] ) {
				$close = ( $count - 1 - $index ) * $items['step'];
				$close = $cap > 0 ? min( $close, $cap ) : $close;
			}
			$beside += $has_menu ? 1 : 0;
			$layer   = Sgs_Motion_Legacy_Nav_Drawer::item_layer( $items, $has_menu ? $cap : $delays[ $index ], $close, $has_menu );
			// The helper mirrors the open delays for a reversed close; the old ladder counted from the end before its
			// cap, so where the two differ the stored close delay is marked customised and a helper re-run keeps it.
			if ( null !== $close && $close !== $mirror[ $index ] && ! in_array( 'close.closeDelay', $layer['customised'] ?? array(), true ) ) {
				$layer['customised'] = array_merge( $layer['customised'] ?? array(), array( 'close.closeDelay' ) );
			}
			$patches[ $here ] = self::patch( array( 'root' => $layer ), null );
		}
	}

	/**
	 * One patch.
	 *
	 * @param array<string,array<string,mixed>> $layers   Entrance layer by element key.
	 * @param array<string,mixed>|null          $settings Helper settings, or null.
	 * @return array{motion:array<string,mixed>,consumed:string[],reported:array<int,array<string,mixed>>}
	 */
	private static function patch( array $layers, ?array $settings ): array {
		$motion = array( 'v' => 1 );
		foreach ( $layers as $key => $layer ) {
			$motion['elements'][ $key ] = array( 'entrance' => array( 'base' => $layer ) );
		}
		if ( null !== $settings ) {
			$motion['stagger'] = $settings;
		}
		return array(
			'motion'   => $motion,
			'consumed' => array(),
			'reported' => array(),
		);
	}

	/**
	 * Whether a block carries the ambient drift class, which kept it out of the old entrance.
	 *
	 * @param array<string,mixed> $block Parsed block.
	 * @return bool
	 */
	private static function drifts( array $block ): bool {
		$class = self::attrs( $block )['className'] ?? '';
		return is_string( $class ) && in_array( 'sgs-drift', preg_split( '/\s+/', $class ), true );
	}

	/**
	 * Whether a block type declares the motion support.
	 *
	 * @param string $block_name Block name.
	 * @return bool
	 */
	private static function supports_motion( string $block_name ): bool {
		if ( null !== self::$supports_provider ) {
			$found = call_user_func( self::$supports_provider, $block_name );
			return is_array( $found ) && ! empty( $found['motion'] );
		}
		if ( ! class_exists( '\WP_Block_Type_Registry' ) ) {
			return false;
		}
		$type = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
		return $type && ! empty( $type->supports['sgs']['motion'] );
	}

	/**
	 * A parsed block's name.
	 *
	 * @param mixed $block Parsed block.
	 * @return string
	 */
	private static function name( $block ): string {
		return is_array( $block ) && isset( $block['blockName'] ) && is_string( $block['blockName'] ) ? $block['blockName'] : '';
	}

	/**
	 * A parsed block's attributes.
	 *
	 * @param mixed $block Parsed block.
	 * @return array<string,mixed>
	 */
	private static function attrs( $block ): array {
		return is_array( $block ) && isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
	}
}
