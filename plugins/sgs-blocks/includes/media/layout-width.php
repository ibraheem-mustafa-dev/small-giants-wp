<?php
/**
 * Layout width: how wide the box a media slot sits in can be at each device (Spec 49 §7.6).
 *
 * A request-scoped stack of render frames, one per block being rendered (`render_block_data` opens it, `render_block`
 * closes it, the same shape as `Sgs_Focus_Rests`). Each frame holds, per device, a width MODEL for the block's own box
 * and for the row and the cell its children sit in. A model is `{vw, off, cap}`: the width is
 * `min(cap, vw * 100vw + off)`, with `cap` null for none. `sgs_media_sizes_for_width()` turns a model into `sizes`.
 *
 * Every figure here is an upper bound: a layout fact that is unknown or not a length (a token, a percentage, a flex
 * item's own size) is left out, so the model can only be wider than the drawn box, never narrower. A file chosen from
 * it is therefore never smaller than the box.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'Sgs_Layout_Width' ) ) {
	/**
	 * The render stack and the layout arithmetic.
	 */
	final class Sgs_Layout_Width {

		/**
		 * Open frames, outermost first.
		 *
		 * @var array<int,array{name:string,own:array,row:array,cell:array,display:int}>
		 */
		private static $stack = array();

		/**
		 * Theme content and wide sizes in px, read once per request.
		 *
		 * @var array{0:float,1:float}|null
		 */
		private static $theme_sizes = null;

		/**
		 * Hook the filters.
		 *
		 * @return void
		 */
		public static function register(): void {
			add_filter( 'render_block_data', array( self::class, 'open_frame' ), 10, 1 );
			add_filter( 'render_block', array( self::class, 'close_frame' ), PHP_INT_MAX, 2 );
		}

		/**
		 * Clear the request state (tests).
		 *
		 * @return void
		 */
		public static function reset(): void {
			self::$stack       = array();
			self::$theme_sizes = null;
		}

		/**
		 * The models of the box the block now rendering sits in, per device.
		 *
		 * @return array<string,array{vw:float,off:float,cap:?float}>|null Null when no block is rendering: the layout is unknown.
		 */
		public static function own(): ?array {
			return array() === self::$stack ? null : self::$stack[ count( self::$stack ) - 1 ]['own'];
		}

		/**
		 * Open a frame for a block about to render.
		 *
		 * @param mixed $parsed_block Parsed block.
		 * @return mixed The parsed block, unchanged.
		 */
		public static function open_frame( $parsed_block ) {
			if ( ! is_array( $parsed_block ) ) {
				return $parsed_block;
			}
			$name          = is_string( $parsed_block['blockName'] ?? null ) ? $parsed_block['blockName'] : '';
			$attrs         = is_array( $parsed_block['attrs'] ?? null ) ? $parsed_block['attrs'] : array();
			self::$stack[] = self::frame( $name, $attrs, array() === self::$stack ? null : self::$stack[ count( self::$stack ) - 1 ] );
			return $parsed_block;
		}

		/**
		 * Close the frame after the block rendered: the topmost frame of this block name goes, with any leaked frame above it.
		 *
		 * @param mixed $block_content Rendered HTML.
		 * @param mixed $block         Parsed block.
		 * @return mixed The content, unchanged.
		 */
		public static function close_frame( $block_content, $block = null ) {
			$name = is_array( $block ) && is_string( $block['blockName'] ?? null ) ? $block['blockName'] : '';
			for ( $i = count( self::$stack ) - 1; $i >= 0; $i-- ) {
				if ( self::$stack[ $i ]['name'] === $name ) {
					array_splice( self::$stack, $i );
					break;
				}
			}
			return $block_content;
		}

		/**
		 * One block's frame from its parent's.
		 *
		 * @param string     $name   Block name.
		 * @param array      $attrs  Parsed attributes.
		 * @param array|null $parent The parent frame; null at the root.
		 * @return array{name:string,own:array,row:array,cell:array,display:int}
		 */
		public static function frame( string $name, array $attrs, ?array $parent ): array {
			$free = array(
				'vw'  => 1.0,
				'off' => 0.0,
				'cap' => null,
			);
			$own  = array();
			foreach ( sgs_media_devices() as $device ) {
				if ( null === $parent ) {
					$model = $free;
					if ( 'wide' === ( $attrs['align'] ?? '' ) ) {
						$model['cap'] = self::theme_sizes()[1];
					}
				} else {
					// A child that sizes itself (fill, fixed, span) is not held to one grid cell: it gets the row.
					$model = $parent[ self::child_sizing_set( $attrs ) ? 'row' : 'cell' ][ $device ];
				}
				$own[ $device ] = $model;
			}
			$display = isset( $attrs['displayLayout']['columns'] ) ? (int) $attrs['displayLayout']['columns'] : (int) ( $parent['display'] ?? 0 );
			if ( 'sgs/container' === $name ) {
				$frame = self::container_frame( $name, $attrs, $own );
			} else {
				$frame = array(
					'name' => $name,
					'own'  => $own,
					'row'  => $own,
					'cell' => $own,
				);
				// A product list's items fill a grid whose column count the collection holds (`displayLayout.columns`). Its
				// CSS drops columns on narrow screens, which makes a cell wider than 1 / columns, so only the desktop divides.
				if ( 'woocommerce/product-template' === $name && $display > 1 ) {
					$frame['cell']['desktop'] = self::divided( $own['desktop'], $display );
				}
			}
			$frame['display'] = $display;
			return $frame;
		}

		/**
		 * The frame of an `sgs/container`: its own max width, then the band cap, the padding and the grid columns.
		 *
		 * @param string $name  Block name.
		 * @param array  $attrs Parsed attributes.
		 * @param array  $own   The box's models before the container's own max width.
		 * @return array{name:string,own:array,row:array,cell:array}
		 */
		private static function container_frame( string $name, array $attrs, array $own ): array {
			$theme   = self::theme_sizes();
			$max     = sgs_media_device_values( $attrs['maxWidth'] ?? null );
			$band    = sgs_media_device_values( $attrs['contentWidth'] ?? array( 'desktop' => 'normal' ) );
			$padding = sgs_media_device_values( $attrs['padding'] ?? null );
			$gap     = sgs_media_device_values( $attrs['gap'] ?? null );
			$columns = sgs_media_device_values(
				$attrs['columns'] ?? array(
					'desktop' => 2,
					'tablet'  => 2,
					'mobile'  => 1,
				)
			);
			$is_grid = 'grid' === ( $attrs['layout'] ?? '' );
			$tracks  = sgs_media_device_values( $attrs['gridTemplateColumns'] ?? null );
			$min_col = sgs_media_device_values( $attrs['minColumnWidth'] ?? null );
			$row     = array();
			$cell    = array();
			foreach ( sgs_media_devices() as $device ) {
				$own[ $device ] = self::capped( $own[ $device ], sgs_media_sizes_px( $max[ $device ] ) );
				$model          = $own[ $device ];
				$band_cap       = null;
				if ( 'normal' === $band[ $device ] ) {
					$band_cap = $theme[0];
				} elseif ( 'wide' === $band[ $device ] ) {
					$band_cap = $theme[1];
				} elseif ( is_string( $band[ $device ] ) ) {
					$band_cap = sgs_media_sizes_px( $band[ $device ] );
				}
				$model = self::capped( $model, $band_cap );
				$box   = is_array( $padding[ $device ] ) ? $padding[ $device ] : array();
				$model = self::shifted( $model, -( (float) sgs_media_sizes_px( $box['left'] ?? null ) + (float) sgs_media_sizes_px( $box['right'] ?? null ) ) );

				$row[ $device ]  = $model;
				$cell[ $device ] = $model;
				if ( ! $is_grid || ( is_string( $min_col[ $device ] ) && '' !== $min_col[ $device ] ) ) {
					continue;
				}
				$g = $gap[ $device ];
				$g = is_array( $g ) ? ( $g['column'] ?? $g['x'] ?? null ) : $g;
				$g = (float) sgs_media_sizes_px( $g );
				if ( is_string( $tracks[ $device ] ) && '' !== $tracks[ $device ] ) {
					// Hand-set tracks: the widest track bounds any cell. Tracks that are not all `fr` leave the cell at the row.
					$frs = self::fr_tracks( $tracks[ $device ] );
					if ( $frs ) {
						$cell[ $device ] = self::scaled( self::shifted( $model, -( count( $frs ) - 1 ) * $g ), max( $frs ) / array_sum( $frs ) );
					}
					continue;
				}
				$n = (int) $columns[ $device ];
				if ( $n > 1 ) {
					$cell[ $device ] = self::divided( self::shifted( $model, -( $n - 1 ) * $g ), $n );
				}
			}
			return array(
				'name' => $name,
				'own'  => $own,
				'row'  => $row,
				'cell' => $cell,
			);
		}

		/**
		 * The `fr` weights of a grid template made only of `fr` tracks (`repeat(2, minmax(0, 1fr))`, `1fr 2fr`).
		 *
		 * @param string $template A `grid-template-columns` value.
		 * @return float[] One weight per track; empty when any track is not an `fr` track.
		 */
		public static function fr_tracks( string $template ): array {
			$expanded = (string) preg_replace_callback(
				'/repeat\(\s*(\d+)\s*,\s*(minmax\([^)]*\)|[^\s)]+)\s*\)/i',
				static fn( array $m ): string => implode( ' ', array_fill( 0, min( 24, max( 1, (int) $m[1] ) ), $m[2] ) ),
				trim( $template )
			);
			if ( ! preg_match_all( '/minmax\([^)]*\)|\S+/i', $expanded, $found ) ) {
				return array();
			}
			$weights = array();
			foreach ( $found[0] as $token ) {
				if ( preg_match( '/^minmax\(\s*[^,]+,\s*(\d+(?:\.\d+)?)fr\s*\)$/i', $token, $m ) || preg_match( '/^(\d+(?:\.\d+)?)fr$/i', $token, $m ) ) {
					$weights[] = (float) $m[1];
				} else {
					return array();
				}
			}
			return array_sum( $weights ) > 0 ? $weights : array();
		}

		/**
		 * Whether a block carries its own child sizing on any device.
		 *
		 * @param array $attrs Parsed attributes.
		 * @return bool
		 */
		private static function child_sizing_set( array $attrs ): bool {
			foreach ( (array) ( $attrs['sgsChildSizing'] ?? array() ) as $value ) {
				if ( is_string( $value ) && '' !== $value ) {
					return true;
				}
			}
			return false;
		}

		/**
		 * The theme's content and wide sizes in px (`settings.layout`, with a client snapshot's override), 1200 and 1400 when unreadable.
		 *
		 * @return array{0:float,1:float}
		 */
		private static function theme_sizes(): array {
			if ( null === self::$theme_sizes ) {
				$content = 1200.0;
				$wide    = 1400.0;
				if ( function_exists( 'wp_get_global_settings' ) ) {
					$content = sgs_media_sizes_px( wp_get_global_settings( array( 'layout', 'contentSize' ) ) ) ?? $content;
					$wide    = sgs_media_sizes_px( wp_get_global_settings( array( 'layout', 'wideSize' ) ) ) ?? $wide;
				}
				self::$theme_sizes = array( $content, max( $content, $wide ) );
			}
			return self::$theme_sizes;
		}

		/**
		 * A model held to at most `$cap` px.
		 *
		 * @param array      $model Model.
		 * @param float|null $cap   Cap in px; null for none.
		 * @return array
		 */
		public static function capped( array $model, ?float $cap ): array {
			if ( null !== $cap && $cap > 0 ) {
				$model['cap'] = null === $model['cap'] ? $cap : min( $model['cap'], $cap );
			}
			return $model;
		}

		/**
		 * A model moved by `$px` (negative to take space away), the cap with it.
		 *
		 * @param array $model Model.
		 * @param float $px    Offset in px.
		 * @return array
		 */
		public static function shifted( array $model, float $px ): array {
			$model['off'] += $px;
			if ( null !== $model['cap'] ) {
				$model['cap'] = max( 1.0, $model['cap'] + $px );
			}
			return $model;
		}

		/**
		 * A model split into `$n` equal parts.
		 *
		 * @param array $model Model.
		 * @param float $n     Divisor above 0.
		 * @return array
		 */
		public static function divided( array $model, float $n ): array {
			return self::scaled( $model, 1 / $n );
		}

		/**
		 * A model multiplied by `$factor`.
		 *
		 * @param array $model  Model.
		 * @param float $factor Factor above 0.
		 * @return array
		 */
		public static function scaled( array $model, float $factor ): array {
			$model['vw']  *= $factor;
			$model['off'] *= $factor;
			if ( null !== $model['cap'] ) {
				$model['cap'] *= $factor;
			}
			return $model;
		}

		/**
		 * A model as a `sizes` source size.
		 *
		 * @param array $model Model.
		 * @return string e.g. `100vw`, `(max-width: 1200px) 100vw, 1200px`, `min(588px, calc(50vw - 16px))`.
		 */
		public static function to_sizes( array $model ): string {
			$px   = static function ( float $v ): string {
				return rtrim( rtrim( number_format( $v, 2, '.', '' ), '0' ), '.' ) . 'px';
			};
			$vw   = static function ( float $v ): string {
				return rtrim( rtrim( number_format( $v * 100, 2, '.', '' ), '0' ), '.' ) . 'vw';
			};
			$off  = round( $model['off'], 2 );
			$flat = abs( $model['vw'] - 1 ) < 0.0001 && 0.0 === $off;
			if ( $flat ) {
				$expr = '100vw';
			} elseif ( 0.0 === $off ) {
				$expr = $vw( $model['vw'] );
			} else {
				$expr = 'calc(' . $vw( $model['vw'] ) . ( $off < 0 ? ' - ' : ' + ' ) . $px( abs( $off ) ) . ')';
			}
			if ( null === $model['cap'] ) {
				return $expr;
			}
			return $flat
				? sprintf( '(max-width: %1$s) 100vw, %1$s', $px( $model['cap'] ) )
				: 'min(' . $px( $model['cap'] ) . ', ' . $expr . ')';
		}
	}
}
