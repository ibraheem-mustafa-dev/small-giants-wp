<?php
/**
 * Layout width: how wide the box a media slot sits in can be at each device (Spec 49 §7.6).
 *
 * A request-scoped stack of render frames, one per block being rendered (`render_block_data` opens it, `render_block`
 * closes it, the same shape as `Sgs_Focus_Rests`). Each frame holds, per device, a width MODEL for the block's own box
 * and for the row and the cell its children sit in. A model is `{vw, off, cap}`: the width is
 * `min(cap, vw * 100vw + off)`, with `cap` null for none. `sgs_media_sizes_for_width()` turns a model into `sizes`.
 *
 * A grid of auto-fill tracks (`repeat(auto-fill, minmax(Mpx, 1fr))`) has a column count that depends on the viewport,
 * so its cell model carries a `grid` entry (`m`, `glo`, `ghi`, `max_n`, and the `k`, `koff`, `kcap` that later scaling,
 * shifting and capping apply to the cell). `to_sizes()` prints it as one `(min-width: Npx)` entry per column count, each
 * entry an exact calc() for that count, so no browser needs `round()` or typed arithmetic inside `sizes`.
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
		 * The gap in px WooCommerce's stylesheet puts between the items of a product list (`1.25rem`).
		 */
		private const WC_TEMPLATE_GAP = 20.0;

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
		 * Spacing preset sizes by slug, read once per request.
		 *
		 * @var array<string,string>|null
		 */
		private static $spacing_sizes = null;

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
			self::$theme_sizes   = null;
			self::$spacing_sizes = null;
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
		 * The fill floor of the block now rendering: the content height its parent container's px min-height leaves per device,
		 * when the block is that container's only inner block (empty otherwise). A fill slot is at least that tall; with no floor
		 * it takes media-base.css's 12rem.
		 *
		 * @return array<string,float> Device => px.
		 */
		public static function fill_floor(): array {
			return array() === self::$stack ? array() : ( self::$stack[ count( self::$stack ) - 1 ]['floor'] ?? array() );
		}

		/**
		 * The box shape the parent container gives the block now rendering (`{ratio,roomy}`), or null when it gives none.
		 * `floor` is the block's fill floor per device (fill_floor()).
		 *
		 * @return array{ratio:float,roomy:bool,width:array<string,float>,floor?:array<string,float>}|null
		 */
		public static function box(): ?array {
			return array() === self::$stack ? null : ( self::$stack[ count( self::$stack ) - 1 ]['box'] ?? null );
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
			self::$stack[] = self::frame( $name, $attrs, array() === self::$stack ? null : self::$stack[ count( self::$stack ) - 1 ], is_array( $parsed_block['innerBlocks'] ?? null ) ? $parsed_block['innerBlocks'] : array() );
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
		 * @param array      $inner  The block's parsed inner blocks.
		 * @return array{name:string,own:array,row:array,cell:array,display:int}
		 */
		public static function frame( string $name, array $attrs, ?array $parent, array $inner = array() ): array {
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
			if ( 'sgs/container' !== $name ) {
				// Any other block's `maxWidth` is its box's CSS max-width (the framework's wrapper convention, one px figure per
				// device; a bare number is px), so everything inside it is held to that width. A container applies its own below.
				$max = sgs_media_device_values( $attrs['maxWidth'] ?? null );
				foreach ( sgs_media_devices() as $device ) {
					$own[ $device ] = self::capped( $own[ $device ], is_numeric( $max[ $device ] ) ? (float) $max[ $device ] : sgs_media_sizes_px( $max[ $device ] ) );
				}
			}
			$display = isset( $attrs['displayLayout']['columns'] ) ? (int) $attrs['displayLayout']['columns'] : (int) ( $parent['display'] ?? 0 );
			if ( 'sgs/container' === $name ) {
				$frame = self::container_frame( $name, $attrs, $own, $inner, $parent );
			} else {
				$frame = array(
					'name' => $name,
					'own'  => $own,
					'row'  => $own,
					'cell' => $own,
				);
				// A layer block (`sgs/decorative-image`) with a px `layerWidth` is that wide at most, so is everything inside it.
				$layer = sgs_media_device_values( $attrs['layerWidth'] ?? null );
				foreach ( sgs_media_devices() as $device ) {
					$px = sgs_media_sizes_px( $layer[ $device ] );
					if ( null !== $px ) {
						$frame['row'][ $device ]  = self::capped( $frame['row'][ $device ], $px );
						$frame['cell'][ $device ] = self::capped( $frame['cell'][ $device ], $px );
					}
				}
				// A product list's items fill a grid whose column count the collection holds (`displayLayout.columns`). Its
				// CSS drops columns on narrow screens, which makes a cell wider than 1 / columns, so only the desktop divides.
				// WooCommerce's own stylesheet puts a 1.25rem gap between the items. The theme's shop layout and product rail set
				// their own gap (a Customiser setting), and a block gap set on the collection overrides it, so the gap is taken
				// as 0 wherever one of those is in play.
				if ( 'woocommerce/product-template' === $name && $display > 1 ) {
					$gap                      = empty( $parent['own_gap'] ) && ! isset( $attrs['style']['spacing']['blockGap'] ) ? self::WC_TEMPLATE_GAP : 0.0;
					$frame['cell']['desktop'] = self::divided( self::shifted( $own['desktop'], -( $display - 1 ) * $gap ), $display );
				}
			}
			$frame['display'] = $display;
			// Whether a block gap may differ from WooCommerce's default here: this block or an ancestor is the theme's shop
			// layout or product rail, or sets a block gap of its own.
			$classes            = is_string( $attrs['className'] ?? null ) ? $attrs['className'] : '';
			$frame['own_gap']   = ! empty( $parent['own_gap'] ) || (bool) preg_match( '/(?:^|\s)sgs-(?:shop-layout|product-rail)(?:\s|$)/', $classes ) || isset( $attrs['style']['spacing']['blockGap'] );
			$frame['box']     = null !== $parent ? ( $parent['child_box'] ?? null ) : null;
			// A container's content height per device for its only child: its px min-height (a narrower device inherits the wider
			// one's) less its top and bottom padding and border, taken at their largest so the figure never overgrows the box. The
			// child's fill floor is its parent's figure: a fill slot is that tall at least, not the 12rem it takes when nothing sets
			// a height. A container with more than one inner block gives none (a sibling shares the height).
			$frame['min_height'] = array();
			$only_child          = 1 === count( array_filter( $inner, static fn( $b ): bool => is_array( $b ) && is_string( $b['blockName'] ?? null ) ) );
			if ( 'sgs/container' === $name && $only_child ) {
				$heights = sgs_media_device_values( $attrs['minHeight'] ?? null );
				$padding = sgs_media_device_values( $attrs['padding'] ?? null );
				$borders = (array) ( $attrs['borderWidth'] ?? array() );
				foreach ( sgs_media_devices() as $device ) {
					$px = sgs_media_sizes_px( $heights[ $device ] );
					if ( null === $px ) {
						continue;
					}
					$box   = is_array( $padding[ $device ] ?? null ) ? $padding[ $device ] : array();
					$inset = 0.0;
					foreach ( array( $box['top'] ?? null, $box['bottom'] ?? null, $borders['top'] ?? null, $borders['bottom'] ?? null ) as $side ) {
						$bounds = self::length_bounds( $side );
						$inset += $bounds[1] ?? $bounds[0];
					}
					if ( $px - $inset > 0 ) {
						$frame['min_height'][ $device ] = $px - $inset;
					}
				}
			}
			$frame['floor'] = null !== $parent ? ( $parent['min_height'] ?? array() ) : array();
			if ( is_array( $frame['box'] ) ) {
				$frame['box']['floor'] = $frame['floor'];
			}
			return $frame;
		}

		/**
		 * The frame of an `sgs/container`: its own max width, then the band cap, the padding and the grid columns.
		 *
		 * @param string $name  Block name.
		 * @param array  $attrs Parsed attributes.
		 * @param array  $own   The box's models before the container's own max width.
		 * @param array  $inner The container's parsed inner blocks.
		 * @param array|null $parent The parent frame; null at the root.
		 * @return array{name:string,own:array,row:array,cell:array,child_box:?array,shrinks:array}
		 */
		private static function container_frame( string $name, array $attrs, array $own, array $inner = array(), ?array $parent = null ): array {
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
			$scrolls = function_exists( 'sgs_resolve_on_tiers' ) ? sgs_resolve_on_tiers( $attrs['scrollSideways'] ?? array(), 'on', 'off' ) : array();
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
				// Padding is taken at its smallest (a token's clamp() minimum): less padding leaves the box wider, an upper bound.
				$model = self::shifted( $model, -( self::length_bounds( $box['left'] ?? null )[0] + self::length_bounds( $box['right'] ?? null )[0] ) );

				$row[ $device ]  = $model;
				$cell[ $device ] = $model;
				if ( in_array( $device, $scrolls, true ) ) {
					// A sideways-scroll row (includes/container-scroll-row-css.php): each item is one flex-basis wide, the px
					// `scrollItemWidth`, a `%` of the row, or 80% of it when none is set. Any other unit leaves the item at the row.
					$item  = function_exists( 'sgs_resolve_tier' ) ? sgs_resolve_tier( $attrs['scrollItemWidth'] ?? array(), $device, '' )['value'] : '';
					$item  = is_string( $item ) ? trim( $item ) : '';
					$fixed = sgs_media_sizes_px( $item );
					if ( null !== $fixed ) {
						$cell[ $device ] = self::capped( $model, $fixed );
					} elseif ( '' === $item || preg_match( '/^(\d+(?:\.\d+)?)%$/', $item, $m ) ) {
						$cell[ $device ] = self::scaled( $model, '' === $item ? 0.8 : min( 1.0, (float) $m[1] / 100 ) );
					}
					continue;
				}
				if ( ! $is_grid || ( is_string( $min_col[ $device ] ) && '' !== $min_col[ $device ] ) ) {
					continue;
				}
				$g = $gap[ $device ];
				$g = is_array( $g ) ? ( $g['column'] ?? $g['x'] ?? null ) : $g;
				// The column gap at its smallest leaves each cell wider, an upper bound; its largest (null when unknown) sets
				// how few columns fit.
				list( $g, $g_max ) = self::length_bounds( $g );
				if ( is_string( $tracks[ $device ] ) && '' !== $tracks[ $device ] ) {
					$auto = self::auto_tracks( $tracks[ $device ] );
					if ( null !== $auto ) {
						// Auto-fill tracks: the column count follows the viewport. A gap of unknown size could fit one column only.
						// Auto-fit collapses empty tracks, so its columns are capped at the item count, known only when every
						// child is an `sgs/` block that sizes itself.
						$max_n = $auto['fit'] ? self::fit_item_cap( $inner ) : 0;
						if ( null !== $g_max && ( ! $auto['fit'] || $max_n > 0 ) ) {
							$cell[ $device ] = self::gridded( $model, $auto['min'], $g, $g_max, $max_n );
						}
						continue;
					}
					// Hand-set tracks: the widest track bounds any cell. All-`fr` tracks share the row, all-px tracks cap at the
					// widest; a mix leaves the cell at the row.
					$frs = self::fr_tracks( $tracks[ $device ] );
					if ( $frs ) {
						$cell[ $device ] = self::scaled( self::shifted( $model, -( count( $frs ) - 1 ) * $g ), max( $frs ) / array_sum( $frs ) );
					} else {
						$widest = self::px_tracks( $tracks[ $device ] );
						if ( null !== $widest ) {
							$cell[ $device ] = self::capped( $model, $widest );
						}
					}
					continue;
				}
				$n = (int) $columns[ $device ];
				if ( $n > 1 ) {
					$cell[ $device ] = self::divided( self::shifted( $model, -( $n - 1 ) * $g ), $n );
				}
			}
			return array(
				'name'      => $name,
				'own'       => $own,
				'row'       => $row,
				'cell'      => $cell,
				'child_box' => self::child_box( $attrs, $padding, $inner, (array) ( $parent['shrinks'] ?? array() ) ),
				'shrinks'   => self::shrinks_children( $attrs ),
			);
		}

		/**
		 * The box shape a container gives its only child: its `boxAspectRatio`, when the child is the only block inside it.
		 *
		 * @param array $attrs   Parsed attributes.
		 * @param array $padding The container's padding per device.
		 * @param array $inner   Parsed inner blocks.
		 * @param array $shrinks The parent's `shrinks` (device => bool): whether it leaves this container's width to its content.
		 * @return array{ratio:float,roomy:bool,width:array<string,float>}|null
		 */
		private static function child_box( array $attrs, array $padding, array $inner, array $shrinks = array() ): ?array {
			$ratio = $attrs['boxAspectRatio'] ?? null;
			if ( count( array_filter( $inner, static fn( $b ): bool => is_array( $b ) && is_string( $b['blockName'] ?? null ) ) ) !== 1 || ! is_string( $ratio )
				|| ! preg_match( '#^\s*(\d+(?:\.\d+)?)\s*(?:/\s*(\d+(?:\.\d+)?)\s*)?$#', $ratio, $m ) || (float) $m[1] <= 0.0 ) {
				return null;
			}
			$h = isset( $m[2] ) && '' !== $m[2] ? (float) $m[2] : 1.0;
			if ( $h <= 0.0 ) {
				return null;
			}
			$roomy = array() === array_filter( (array) ( $attrs['borderWidth'] ?? array() ), static fn( $w ): bool => is_string( $w ) && 0.0 !== (float) $w );
			foreach ( $padding as $box ) {
				foreach ( is_array( $box ) ? $box : array() as $side ) {
					$roomy = $roomy && 0.0 === (float) $side;
				}
			}
			$ratio_w = (float) $m[1] / $h;
			// A box with a px min-height, a ratio and no width of its own, in a column that does not stretch its children, is as wide
			// as the ratio makes its min-height (`min-height x ratio`): its only child, a fill box, adds no width. The child's
			// content box is that less the border and padding, taken at their smallest so the figure stays an upper bound.
			$width      = array();
			$min_height = sgs_media_device_values( $attrs['minHeight'] ?? null );
			$borders    = (array) ( $attrs['borderWidth'] ?? array() );
			$sizing_set = self::child_sizing_set( $attrs );
			foreach ( sgs_media_devices() as $device ) {
				$min_px = sgs_media_sizes_px( $min_height[ $device ] );
				if ( empty( $shrinks[ $device ] ) || $sizing_set || null === $min_px || $min_px <= 0 ) {
					continue;
				}
				$box      = is_array( $padding[ $device ] ?? null ) ? $padding[ $device ] : array();
				$inset    = self::length_bounds( $box['left'] ?? null )[0] + self::length_bounds( $box['right'] ?? null )[0]
					+ self::length_bounds( $borders['left'] ?? null )[0] + self::length_bounds( $borders['right'] ?? null )[0];
				$width[ $device ] = max( 1.0, $min_px * $ratio_w - $inset );
			}
			return array(
				'ratio' => $ratio_w,
				'roomy' => $roomy,
				'width' => $width,
			);
		}

		/**
		 * Whether a stack container leaves its children's width to their content, per device.
		 *
		 * A `stack` is a flex column; its children fill its width unless `alignItems` sets another cross-axis alignment.
		 *
		 * @param array $attrs Parsed attributes.
		 * @return array<string,bool>
		 */
		private static function shrinks_children( array $attrs ): array {
			$out   = array();
			$align = sgs_media_device_values( $attrs['alignItems'] ?? null );
			foreach ( sgs_media_devices() as $device ) {
				$out[ $device ] = 'stack' === ( $attrs['layout'] ?? '' ) && in_array( $align[ $device ], array( 'center', 'flex-start', 'start', 'flex-end', 'end' ), true );
			}
			return $out;
		}

		/**
		 * A CSS length as the smallest and largest px it can be.
		 *
		 * Reads a `px`, `rem` or `em` length (rem and em at 16px), a spacing preset token (`var:preset|spacing|40`,
		 * `var(--wp--preset--spacing--40)`) from the theme's spacing sizes, and `clamp(min, preferred, max)` of lengths.
		 * A caller needing an upper bound on a box takes the smallest figure of a gap or padding, and the largest figure
		 * of a gap that decides how few columns fit.
		 *
		 * @param mixed $value Stored value.
		 * @return array{0:float,1:?float} Smallest px (0 when unknown) and largest px (null when unknown).
		 */
		public static function length_bounds( $value ): array {
			$value = is_string( $value ) || is_numeric( $value ) ? trim( (string) $value ) : '';
			$px    = sgs_media_sizes_px( $value );
			if ( null !== $px ) {
				return array( $px, $px );
			}
			if ( preg_match( '/^var:preset\|spacing\|([\w-]+)$/', $value, $m ) || preg_match( '/^var\(\s*--wp--preset--spacing--([\w-]+)\s*\)$/', $value, $m ) ) {
				$size = self::spacing_sizes()[ $m[1] ] ?? null;
				return null === $size ? array( 0.0, null ) : self::length_bounds( $size );
			}
			if ( preg_match( '/^clamp\(\s*([^,()]+),\s*[^()]+,\s*([^,()]+)\)$/i', $value, $m ) ) {
				$lo = sgs_media_sizes_px( trim( $m[1] ) );
				$hi = sgs_media_sizes_px( trim( $m[2] ) );
				return array( null === $lo ? 0.0 : $lo, null === $hi ? null : max( $hi, (float) $lo ) );
			}
			return array( 0.0, null );
		}

		/**
		 * The theme's spacing preset sizes, slug to CSS value, read once per request.
		 *
		 * `wp_get_global_settings()` returns the sizes by origin (`default`, `theme`, `custom`) or as one list; a later
		 * origin overrides an earlier one.
		 *
		 * @return array<string,string>
		 */
		private static function spacing_sizes(): array {
			if ( null === self::$spacing_sizes ) {
				self::$spacing_sizes = array();
				$sizes               = function_exists( 'wp_get_global_settings' ) ? wp_get_global_settings( array( 'spacing', 'spacingSizes' ) ) : array();
				$sizes               = is_array( $sizes ) ? $sizes : array();
				$lists               = isset( $sizes[0] ) ? array( $sizes ) : array(
					(array) ( $sizes['default'] ?? array() ),
					(array) ( $sizes['theme'] ?? array() ),
					(array) ( $sizes['custom'] ?? array() ),
				);
				foreach ( $lists as $list ) {
					foreach ( $list as $item ) {
						if ( is_array( $item ) && isset( $item['slug'], $item['size'] ) ) {
							self::$spacing_sizes[ (string) $item['slug'] ] = (string) $item['size'];
						}
					}
				}
			}
			return self::$spacing_sizes;
		}

		/**
		 * The track list of a grid of equal auto-fill or auto-fit tracks: `repeat(auto-fill, minmax(170px, 1fr))`, also
		 * with `min(170px, 100%)` as the minimum.
		 *
		 * @param string $template A `grid-template-columns` value.
		 * @return array{min:float,fit:bool}|null Null for any other template.
		 */
		public static function auto_tracks( string $template ): ?array {
			$len = '(\d+(?:\.\d+)?(?:px|rem|em))';
			if ( ! preg_match( '/^\s*repeat\(\s*auto-(fill|fit)\s*,\s*minmax\(\s*(?:min\(\s*' . $len . '\s*,\s*100%\s*\)|' . $len . ')\s*,\s*1fr\s*\)\s*\)\s*$/i', $template, $m ) ) {
				return null;
			}
			$min = sgs_media_sizes_px( '' !== ( $m[2] ?? '' ) ? $m[2] : ( $m[3] ?? '' ) );
			return null === $min || $min <= 0 ? null : array(
				'min' => $min,
				'fit' => 'fit' === strtolower( $m[1] ),
			);
		}

		/**
		 * The most columns an auto-fit grid can show: its item count, known only when every child is an `sgs/` block that sizes itself.
		 *
		 * @param array $inner Parsed inner blocks.
		 * @return int The count; 0 when it is not known.
		 */
		private static function fit_item_cap( array $inner ): int {
			$count = 0;
			foreach ( $inner as $block ) {
				$name = is_array( $block ) && is_string( $block['blockName'] ?? null ) ? $block['blockName'] : '';
				if ( '' === $name ) {
					continue;
				}
				if ( 0 !== strpos( $name, 'sgs/' ) || self::child_sizing_set( (array) ( $block['attrs'] ?? array() ) ) ) {
					return 0;
				}
				++$count;
			}
			return $count;
		}

		/**
		 * A row's model split into auto-fill cells.
		 *
		 * @param array $model   Row model (the grid's content width).
		 * @param float $min     The track minimum in px.
		 * @param float $gap     Column gap at its smallest, used for the cell width.
		 * @param float $gap_max Column gap at its largest, used for the column count.
		 * @param int   $max_n   The most columns (an auto-fit grid's item count); 0 for none.
		 * @return array The model with a `grid` entry.
		 */
		private static function gridded( array $model, float $min, float $gap, float $gap_max, int $max_n ): array {
			$model['grid'] = array(
				'm'     => $min,
				'glo'   => $gap,
				'ghi'   => $gap_max,
				'max_n' => $max_n,
				'k'     => 1.0,
				'koff'  => 0.0,
				'kcap'  => null,
			);
			return $model;
		}

		/**
		 * A grid model as plain models, one per column count, with the viewport width each starts at.
		 *
		 * The row is `min(cap, vw * viewport + off)`; `n` columns fit from the viewport where the row is
		 * `n * (m + gap) - gap` (taken at the largest gap, which fits fewest columns). Each count's cell is
		 * `(row - (n - 1) * gap) / n` at the smallest gap, so a cell is never narrower than the real one, and a
		 * count starts at its viewport width rounded up, so the width just below a change keeps the wider cell of the
		 * count before it.
		 *
		 * @param array $model A model with a `grid` entry.
		 * @return array<int,array{0:?int,1:array}> Widest viewport range first; each `[min viewport px or null, plain model]`.
		 */
		public static function grid_segments( array $model ): array {
			$g    = $model['grid'];
			$base = $model;
			unset( $base['grid'] );
			$limit  = $g['max_n'] > 0 ? min( 8, $g['max_n'] ) : 8;
			$starts = array( 1 => null );
			for ( $n = 2; $n <= $limit && $base['vw'] > 0.0001; $n++ ) {
				$row = $n * ( $g['m'] + $g['ghi'] ) - $g['ghi'];
				if ( null !== $base['cap'] && $row > $base['cap'] + 0.0001 ) {
					break;
				}
				$from = (int) ceil( ( $row - $base['off'] ) / $base['vw'] );
				if ( $from > 0 ) {
					$starts[ $n ] = $from;
				} else {
					// The row is already wide enough at any viewport: every narrower count is out of reach.
					$starts = array( $n => null );
				}
			}
			$out = array();
			foreach ( array_reverse( $starts, true ) as $n => $from ) {
				$cell  = self::scaled( self::shifted( $base, -( $n - 1 ) * $g['glo'] ), 1 / $n );
				$cell  = self::scaled( $cell, $g['k'] );
				$cell  = self::shifted( $cell, $g['koff'] );
				$out[] = array( $from, self::capped( $cell, $g['kcap'] ) );
			}
			return $out;
		}

		/**
		 * A grid model as one plain model that no cell exceeds, for a place that takes a single expression.
		 *
		 * `n` columns fit only when the row is at least `n * (m + gap) - gap`, so a one-column cell is below `2m + gap`
		 * and a cell of two or more columns is narrower still.
		 *
		 * @param array $model A model with a `grid` entry.
		 * @return array A plain model.
		 */
		public static function grid_bound( array $model ): array {
			$g    = $model['grid'];
			$base = $model;
			unset( $base['grid'] );
			$cell = self::capped( $base, 2 * $g['m'] + $g['ghi'] );
			$cell = self::scaled( $cell, $g['k'] );
			$cell = self::shifted( $cell, $g['koff'] );
			return self::capped( $cell, $g['kcap'] );
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
		 * The widest track of a grid template made only of px tracks.
		 *
		 * A `minmax(a, Npx)` track counts as N (its ceiling). Any track that is not px (`fr`, `auto`, `%`, `min-content`)
		 * or any px `minmax` whose ceiling is not a px length gives null, so the cell stays at the row.
		 *
		 * @param string $template A `grid-template-columns` value.
		 * @return float|null The widest px track; null when any track is not px.
		 */
		public static function px_tracks( string $template ): ?float {
			$expanded = (string) preg_replace_callback(
				'/repeat\(\s*(\d+)\s*,\s*(minmax\([^)]*\)|[^\s)]+)\s*\)/i',
				static fn( array $m ): string => implode( ' ', array_fill( 0, min( 24, max( 1, (int) $m[1] ) ), $m[2] ) ),
				trim( $template )
			);
			if ( ! preg_match_all( '/minmax\([^)]*\)|\S+/i', $expanded, $found ) ) {
				return null;
			}
			$widest = 0.0;
			foreach ( $found[0] as $token ) {
				if ( preg_match( '/^minmax\(\s*[^,]+,\s*(\d+(?:\.\d+)?)px\s*\)$/i', $token, $m ) || preg_match( '/^(\d+(?:\.\d+)?)px$/i', $token, $m ) ) {
					$widest = max( $widest, (float) $m[1] );
				} else {
					return null;
				}
			}
			return $widest > 0 ? $widest : null;
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
				if ( isset( $model['grid'] ) ) {
					$model['grid']['kcap'] = null === $model['grid']['kcap'] ? $cap : min( $model['grid']['kcap'], $cap );
					return $model;
				}
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
			if ( isset( $model['grid'] ) ) {
				$model['grid']['koff'] += $px;
				if ( null !== $model['grid']['kcap'] ) {
					$model['grid']['kcap'] = max( 1.0, $model['grid']['kcap'] + $px );
				}
				return $model;
			}
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
			if ( isset( $model['grid'] ) ) {
				$model['grid']['k']    *= $factor;
				$model['grid']['koff'] *= $factor;
				if ( null !== $model['grid']['kcap'] ) {
					$model['grid']['kcap'] *= $factor;
				}
				return $model;
			}
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
		 * @param array $model    Model.
		 * @param bool  $nestable True for one CSS length expression that can sit inside `max()` (a flat capped box is
		 *                        `min(Npx, 100vw)` rather than WordPress's `(max-width: Npx) 100vw, Npx`).
		 * @return string e.g. `100vw`, `(max-width: 1200px) 100vw, 1200px`, `min(588px, calc(50vw - 16px))`; a grid model gives
		 *                a list `(min-width: 1100px) calc(...), (min-width: 900px) calc(...), calc(...)`.
		 */
		public static function to_sizes( array $model, bool $nestable = false ): string {
			if ( isset( $model['grid'] ) ) {
				if ( $nestable ) {
					return self::to_sizes( self::grid_bound( $model ), true );
				}
				// One entry per column count, widest viewport first; the narrowest count has no condition.
				$entries = array();
				foreach ( self::grid_segments( $model ) as list( $from, $cell ) ) {
					$entries[] = ( null === $from ? '' : SGS_Breakpoints::query_width( 'min', $from ) . ' ' ) . self::to_sizes( $cell, true );
				}
				return implode( ', ', $entries );
			}
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
			return $flat && ! $nestable
				? sprintf( '(max-width: %1$s) 100vw, %1$s', $px( $model['cap'] ) )
				: 'min(' . $px( $model['cap'] ) . ', ' . $expr . ')';
		}
	}
}
