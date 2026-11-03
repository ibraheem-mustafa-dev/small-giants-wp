<?php
/**
 * The sgs/gallery grid layout's own grid settings, painted on the gallery's image grid.
 *
 * The gallery's images sit in `.sgs-gallery__grid`, a child of the block root. The Layout panel's
 * grid settings (custom column template, row template, auto rows, align items, justify items,
 * align content) belong to that grid, so they are printed here against it. The block root is
 * handed to SGS_Container_Wrapper without `layout` or `columns`, so the wrapper never makes the
 * root a grid of its own (that turned the image grid into the first cell of a second grid).
 * JS twin for the editor canvas: src/blocks/gallery/edit.js (applyGridLayoutPreview on the grid).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-container.php';

if ( ! function_exists( 'sgs_gallery_wrapper_attributes' ) ) {
	/**
	 * The gallery's attributes as SGS_Container_Wrapper should see them.
	 *
	 * `layout` (a per-device grid / masonry / scroll / carousel), `columns` and the grid settings describe the image
	 * grid, not the wrapper's own layout mode, and `separators` are drawn on the image grid by the
	 * block.
	 *
	 * @param array $attributes Block attributes.
	 * @return array The attributes without the keys the wrapper would misread.
	 */
	function sgs_gallery_wrapper_attributes( array $attributes ): array {
		foreach ( sgs_gallery_grid_owned_keys() as $key ) {
			unset( $attributes[ $key ] );
		}
		return $attributes;
	}
}

if ( ! function_exists( 'sgs_gallery_grid_owned_keys' ) ) {
	/**
	 * The attributes that belong to the image grid, never to the wrapper.
	 *
	 * @return string[] Attribute names.
	 */
	function sgs_gallery_grid_owned_keys(): array {
		return array( 'layout', 'columns', 'separators', 'gridTemplateColumns', 'gridTemplateRows', 'gridAutoRows', 'alignItems', 'justifyItems', 'alignContent' );
	}
}

if ( ! function_exists( 'sgs_gallery_grid_layout_css' ) ) {
	/**
	 * Scoped CSS for the grid layout's grid settings, on the image grid.
	 *
	 * @param string $grid_sel   The image grid's scoped selector.
	 * @param array  $attributes Block attributes.
	 * @return string CSS, or '' when the desktop layout is not grid or nothing is set.
	 */
	function sgs_gallery_grid_layout_css( string $grid_sel, array $attributes ): string {
		// The grid settings belong to the grid layout: they print when the desktop tier is a grid. A tier that
		// resolves to another layout takes that layout's own full declarations (`sgs_gallery_layout_css`), which
		// are printed after these and so win at that tier.
		if ( 'grid' !== sgs_gallery_layout_tiers( $attributes )['desktop'] ) {
			return '';
		}

		$track = static function ( $raw ) {
			return sgs_sanitize_grid_template( (string) $raw );
		};
		$specs = array();
		foreach ( array(
			'gridTemplateColumns' => 'grid-template-columns',
			'gridTemplateRows'    => 'grid-template-rows',
		) as $attr => $prop ) {
			if ( isset( $attributes[ $attr ] ) && is_array( $attributes[ $attr ] ) ) {
				$specs[] = array(
					'value'     => $attributes[ $attr ],
					'css'       => $prop,
					'transform' => $track,
				);
			}
		}
		// Cross-axis alignment is a `{desktop, tablet, mobile}` object.
		if ( is_array( $attributes['alignItems'] ?? null ) ) {
			$specs[] = array(
				'value'     => $attributes['alignItems'],
				'css'       => 'align-items',
				'transform' => static function ( $raw ) {
					return is_string( $raw ) ? (string) preg_replace( '/[^a-z-]/', '', strtolower( $raw ) ) : '';
				},
			);
		}
		$css = $specs ? sgs_emit_responsive_css( $grid_sel, $specs ) : '';

		$decls     = array();
		$auto_rows = sgs_sanitize_grid_template( (string) ( $attributes['gridAutoRows'] ?? '' ) );
		if ( '' !== $auto_rows ) {
			$decls[] = 'grid-auto-rows:' . $auto_rows;
		}
		foreach ( array(
			'justifyItems' => 'justify-items',
			'alignContent' => 'align-content',
		) as $attr => $prop ) {
			$value = (string) preg_replace( '/[^a-z-]/', '', strtolower( (string) ( $attributes[ $attr ] ?? '' ) ) );
			// `stretch` is the grid's own default for justify-items and align-content.
			if ( '' !== $value && 'stretch' !== $value ) {
				$decls[] = $prop . ':' . $value;
			}
		}
		if ( $decls ) {
			$css = $grid_sel . '{' . implode( ';', $decls ) . '}' . $css;
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_gallery_layout_tiers' ) ) {
	/**
	 * The gallery's layout at each device tier, after the carousel rewrite.
	 *
	 * `layout` is a `{desktop, tablet, mobile}` object; an empty tier inherits the tier above and an empty object is a
	 * grid (`sgs_resolve_tier`). A stored value that is not one of the four layouts is a grid. A carousel is one
	 * piece of markup and script for the whole block (arrows, dots, autoplay, `view.js` binds once at load), so it is
	 * honoured only when all three tiers resolve to it; otherwise every carousel tier is a swipe row (`scroll`).
	 * Everything downstream reads this rewritten set. A scalar `layout` (the shape before this was per device) is not
	 * read: the saved content is re-saved by `scripts/migrate-gallery-layout.php` (live content) and `scripts/find-scalar-tier-attrs.py` (saved files), never read back here (FP-14).
	 *
	 * @param array $attributes Block attributes.
	 * @return array{desktop:string,tablet:string,mobile:string,carousel:bool,rewritten:bool,scroll:bool}
	 */
	function sgs_gallery_layout_tiers( array $attributes ): array {
		$stored = is_array( $attributes['layout'] ?? null ) ? $attributes['layout'] : array();
		$tiers  = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$value           = sgs_resolve_tier( $stored, $tier, 'grid' )['value'];
			$tiers[ $tier ] = is_string( $value ) && in_array( $value, array( 'grid', 'masonry', 'scroll', 'carousel' ), true ) ? $value : 'grid';
		}
		$carousel_tiers = count( array_keys( $tiers, 'carousel', true ) );
		$uniform        = 3 === $carousel_tiers;
		$rewritten      = $carousel_tiers > 0 && ! $uniform;
		if ( $rewritten ) {
			foreach ( $tiers as $tier => $value ) {
				if ( 'carousel' === $value ) {
					$tiers[ $tier ] = 'scroll';
				}
			}
		}
		return $tiers + array(
			'carousel'  => $uniform,
			'rewritten' => $rewritten,
			'scroll'    => in_array( 'scroll', array( $tiers['desktop'], $tiers['tablet'], $tiers['mobile'] ), true ),
		);
	}
}

if ( ! function_exists( 'sgs_gallery_layout_declarations' ) ) {
	/**
	 * The full declarations that make the image grid one layout at one device tier, resetting every property the other
	 * layouts set, so a narrower tier can switch from any layout to any other (the static stylesheet paints only the
	 * desktop layout). The column count is the tier's own custom property (`--sgs-columns-tablet`, `--sgs-columns-mobile`):
	 * the stylesheet reads those per tier, `--sgs-columns` is the desktop count only.
	 *
	 * @param string $tier `tablet` or `mobile`.
	 * @return array<string,string> Layout => declarations for `.sgs-gallery__grid`.
	 */
	function sgs_gallery_layout_declarations( string $tier ): array {
		$cols   = 'tablet' === $tier ? 'var(--sgs-columns-tablet,2)' : 'var(--sgs-columns-mobile,1)';
		$column = 'calc((100% - (' . $cols . ' - 1) * var(--sgs-gap)) / ' . $cols . ')';
		$reset  = 'column-count:auto;column-gap:var(--sgs-gap);scrollbar-width:auto;';
		return array(
			'grid'    => 'display:grid;grid-template-columns:repeat(' . $cols . ',1fr);grid-auto-flow:row;grid-auto-columns:auto;overflow-x:visible;scroll-snap-type:none;' . $reset,
			'masonry' => 'display:block;column-count:' . $cols . ';column-gap:var(--sgs-gap);grid-template-columns:none;grid-auto-flow:row;grid-auto-columns:auto;overflow-x:visible;scroll-snap-type:none;scrollbar-width:auto;',
			'scroll'  => 'display:grid;grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:var(--sgs-scroll-item-width,' . $column . ');overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;column-count:auto;column-gap:var(--sgs-gap);',
		);
	}
}

if ( ! function_exists( 'sgs_gallery_layout_css' ) ) {
	/**
	 * The per-device layout override rules, on the image grid and its items.
	 *
	 * Only a tier that differs from the one above prints (a uniform layout prints nothing: the stylesheet's static rules
	 * paint the desktop layout). Each tier follows the screen (`@media`); the Mobile tier also prints as `@container` under
	 * 480px, so a gallery in a column narrower than that takes its mobile layout on any screen (the gallery root is the
	 * query container). A carousel is never overridden: it
	 * is only honoured when uniform.
	 *
	 * @param string $grid_sel   The image grid's scoped selector.
	 * @param array  $attributes Block attributes.
	 * @return string CSS, or '' when the layout is the same at every tier.
	 */
	function sgs_gallery_layout_css( string $grid_sel, array $attributes ): string {
		$tiers = sgs_gallery_layout_tiers( $attributes );
		if ( $tiers['carousel'] || ( $tiers['desktop'] === $tiers['tablet'] && $tiers['tablet'] === $tiers['mobile'] ) ) {
			return '';
		}
		// `base` is the desktop layout (painted by the stylesheet). A tier that equals the desktop layout with no
		// deviation above it stays `base`; one that returns to it after a different tier names it (`<layout>:<tier>`),
		// to reset it with that tier's own column count.
		$value           = array(
			'desktop' => 'base',
			'tablet'  => $tiers['tablet'] === $tiers['desktop'] ? 'base' : $tiers['tablet'] . ':tablet',
		);
		$value['mobile'] = ( $tiers['mobile'] === $tiers['desktop'] && 'base' === $value['tablet'] ) ? 'base' : $tiers['mobile'] . ':mobile';

		$grid_css = array( 'base' => '' );
		$item_css = array( 'base' => '' );
		foreach ( array( 'tablet', 'mobile' ) as $tier ) {
			foreach ( sgs_gallery_layout_declarations( $tier ) as $layout => $decls ) {
				$grid_css[ $layout . ':' . $tier ] = $decls;
				$item_css[ $layout . ':' . $tier ] = 'masonry' === $layout ? 'break-inside:avoid;margin-bottom:var(--sgs-gap);' : 'break-inside:auto;margin-bottom:0;';
			}
		}
		$opts = array( 'container' => true );
		return sgs_emit_tier_rules_map( $grid_sel, $value, $grid_css, '', 'base', $opts )
			. sgs_emit_tier_rules_map( $grid_sel . ' .sgs-gallery__item', $value, $item_css, '', 'base', $opts );
	}
}

if ( ! function_exists( 'sgs_gallery_scroll_css' ) ) {
	/**
	 * The swipe row's own settings on the image grid: the width of a card (`scrollItemWidth`, printed as
	 * `--sgs-scroll-item-width`, which only a swipe row reads) and the edge padding that lets cards run to the screen edge
	 * while the first card lines up with the page (`scrollInset`, as `padding-inline` and `scroll-padding-inline`), per
	 * device, through the container-aware responsive emitter.
	 *
	 * The inset belongs to the swipe row alone: a tier that resolves to a grid or masonry gets an explicit zero where the
	 * inherited value would otherwise reach it (so a desktop swipe row with a tablet grid keeps the tablet grid flush).
	 *
	 * @param string $grid_sel   The image grid's scoped selector.
	 * @param array  $attributes Block attributes.
	 * @return string CSS, or '' when the swipe row is not used at any tier or nothing is set.
	 */
	function sgs_gallery_scroll_css( string $grid_sel, array $attributes ): string {
		$tiers = sgs_gallery_layout_tiers( $attributes );
		if ( ! $tiers['scroll'] ) {
			return '';
		}
		$specs = array();
		if ( isset( $attributes['scrollItemWidth'] ) && is_array( $attributes['scrollItemWidth'] ) ) {
			$specs[] = array(
				'value'     => $attributes['scrollItemWidth'],
				'css'       => '--sgs-scroll-item-width',
				'transform' => 'sgs_css_length_value',
			);
		}
		if ( isset( $attributes['scrollInset'] ) && is_array( $attributes['scrollInset'] ) ) {
			$inset  = sgs_responsive_normalise_object( $attributes['scrollInset'] );
			$masked = array();
			$above  = '';
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
				$own = is_scalar( $inset[ $tier ] ?? null ) ? (string) $inset[ $tier ] : '';
				if ( '' !== $own ) {
					$above = $own;
				}
				// A swipe-row tier keeps its inherited value; any other tier is flush wherever a value would reach it.
				$masked[ $tier ] = 'scroll' === $tiers[ $tier ] ? $above : ( '' !== $above ? '0px' : '' );
			}
			foreach ( array( 'padding-inline', 'scroll-padding-inline' ) as $prop ) {
				$specs[] = array(
					'value'     => $masked,
					'css'       => $prop,
					'transform' => 'sgs_css_length_value',
				);
			}
		}
		return $specs ? sgs_emit_responsive_css( $grid_sel, $specs, array( 'container' => true ) ) : '';
	}
}
