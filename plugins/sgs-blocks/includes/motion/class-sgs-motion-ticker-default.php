<?php
/**
 * The trust bar's default ticker.
 *
 * A trust bar whose `overflowMode` is `ticker` (the default) and that stores no marquee layer of its own is given the
 * layer in `data/trust-bar-default-ticker.json` on its root, as an ordinary stored-shaped layer, before the motion
 * renderer and the block's `render.php` read the block. The marquee then runs only while the items do not fit on one
 * line (`belowBreakpoint: overflow`) and sits still, in the bar's own layout, while they fit. The editor reads the same
 * file for its canvas preview (`src/blocks/trust-bar/edit.js`).
 *
 * A block that stores a marquee layer keeps it untouched, and `overflowMode` `wrap` or `drop` takes no default.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Ticker_Default
 */
final class Sgs_Motion_Ticker_Default {

	/**
	 * The block that takes the default.
	 */
	const BLOCK = 'sgs/trust-bar';

	/**
	 * The default layer, once per request.
	 *
	 * @var array<string,mixed>|null
	 */
	private static $layer = null;

	/**
	 * Hook the filter ahead of `Sgs_Motion_Renderer::open_frame` (priority 10), so the renderer reads the added layer.
	 *
	 * @return void
	 */
	public static function register(): void {
		add_filter( 'render_block_data', array( self::class, 'apply' ), 5, 1 );
	}

	/**
	 * The default layer (empty when the data file is missing or unreadable).
	 *
	 * @return array<string,mixed>
	 */
	public static function layer(): array {
		if ( null === self::$layer ) {
			self::$layer = array();
			$file        = __DIR__ . '/data/trust-bar-default-ticker.json';
			if ( is_readable( $file ) ) {
				$decoded = json_decode( (string) file_get_contents( $file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local plugin data file.
				if ( is_array( $decoded ) && 'marquee' === ( $decoded['effect'] ?? null ) ) {
					self::$layer = $decoded;
				}
			}
		}
		return self::$layer;
	}

	/**
	 * Add the default layer to a trust bar that takes it (render_block_data).
	 *
	 * @param mixed $parsed_block Parsed block.
	 * @return mixed The parsed block, with the layer added when it takes the default.
	 */
	public static function apply( $parsed_block ) {
		if ( ! is_array( $parsed_block ) || self::BLOCK !== ( $parsed_block['blockName'] ?? null ) ) {
			return $parsed_block;
		}
		$attrs = isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] ) ? $parsed_block['attrs'] : array();
		$mode  = isset( $attrs['overflowMode'] ) ? sanitize_key( (string) $attrs['overflowMode'] ) : 'ticker';
		$layer = self::layer();
		if ( 'ticker' !== $mode && 'wrap' !== $mode && 'drop' !== $mode ) {
			$mode = 'ticker';
		}
		if ( 'ticker' !== $mode || array() === $layer ) {
			return $parsed_block;
		}
		$motion = $attrs['sgsMotion'] ?? array();
		if ( ! is_array( $motion ) ) {
			return $parsed_block;
		}
		$effects = $motion['elements']['root']['effects'] ?? array();
		if ( ! is_array( $effects ) ) {
			return $parsed_block;
		}
		foreach ( $effects as $existing ) {
			if ( is_array( $existing ) && 'marquee' === ( $existing['effect'] ?? null ) ) {
				return $parsed_block;
			}
		}
		$effects[]                            = $layer;
		$motion['v']                           = $motion['v'] ?? 1;
		$motion['elements']                    = isset( $motion['elements'] ) && is_array( $motion['elements'] ) ? $motion['elements'] : array();
		$motion['elements']['root']            = isset( $motion['elements']['root'] ) && is_array( $motion['elements']['root'] ) ? $motion['elements']['root'] : array();
		$motion['elements']['root']['effects'] = $effects;
		$attrs['sgsMotion']                    = $motion;
		$parsed_block['attrs']                 = $attrs;
		return $parsed_block;
	}
}

Sgs_Motion_Ticker_Default::register();
