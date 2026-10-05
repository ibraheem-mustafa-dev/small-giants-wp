<?php
/**
 * Grid-item defaults (Spec 32 FR-32-12) for SGS_Container_Wrapper.
 *
 * A grid container (`layout: grid`) carries six default values for its cells:
 * padding, ground, corner radius, border, shadow and text colour. They travel
 * as `--sgs-gi-*` custom-property VALUES on the grid element; the one
 * zero-specificity consumer in `src/blocks/container/style.css` paints them on
 * every direct cell, whatever block the cell is, at both depths (cells directly
 * under the container and cells under its `.sgs-container__inner` band). The
 * states a custom property cannot express (background/text-colour gradients and
 * hover, the border-gradient ring) are scoped rules emitted here against the
 * same two cell depths, at specificity (0,1,0) so they beat the zero-specificity
 * consumer whatever the stylesheet order, while a cell's own scoped rule (printed
 * later in the document, inside the grid) still wins a tie.
 *
 * A cell is any direct child that is neither the band wrapper nor a decorative
 * layer the wrapper itself renders (background image/video/SVG/overlay/shape
 * divider, all `aria-hidden="true"`, and the Lottie background) nor a <style> or
 * <script> element. The chained `:not()` form (never a selector list) keeps
 * every selector comma-free, so the comma-splitting hover helpers stay correct.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_grid_item_cell_filter' ) ) {
	/**
	 * The `:not()` chain that turns "any direct child" into "a grid cell".
	 *
	 * @param bool $under_inner True for children of the band wrapper (which
	 *                          contains no further band wrapper to exclude).
	 * @return string Compound selector, e.g. `:not(.sgs-container__inner):not(...)`.
	 */
	function sgs_grid_item_cell_filter( bool $under_inner = false ): string {
		return ( $under_inner ? '' : ':not(.sgs-container__inner)' )
			. ':not([aria-hidden="true"]):not(.sgs-container__lottie-bg):not(style):not(script)';
	}
}

if ( ! function_exists( 'sgs_grid_item_cell_selectors' ) ) {
	/**
	 * The two scoped cell selectors of one grid container instance, each at
	 * specificity (0,1,0): `.{uid} > :where(cell)` and
	 * `.{uid} > :where(.sgs-container__inner) > :where(cell)`.
	 *
	 * @param string $uid The grid container's scope class.
	 * @return string[] Two selectors, or none without a uid.
	 */
	function sgs_grid_item_cell_selectors( string $uid ): array {
		if ( '' === $uid ) {
			return array();
		}
		return array(
			'.' . $uid . ' > :where(' . sgs_grid_item_cell_filter() . ')',
			'.' . $uid . ' > :where(.sgs-container__inner) > :where(' . sgs_grid_item_cell_filter( true ) . ')',
		);
	}
}

if ( ! function_exists( 'sgs_grid_item_settings' ) ) {
	/**
	 * Read the flat (scalar) grid-item attributes. A value of the wrong shape
	 * (an array where a string belongs) reads as unset, so a malformed stored
	 * value can never reach a string-typed helper.
	 *
	 * Padding and corner radius are tier-of-box objects; they emit through the
	 * wrapper's responsive tier path, not here.
	 *
	 * @param array $attributes Block attributes.
	 * @return array<string,string> Normalised settings keyed by attribute name.
	 */
	function sgs_grid_item_settings( array $attributes ): array {
		$keys = array(
			'gridItemBackground',
			'gridItemBackgroundHover',
			'gridItemBackgroundGradient',
			'gridItemBackgroundHoverGradient',
			'gridItemBorder',
			'gridItemShadow',
			'gridItemShadowColour',
			'gridItemTextColour',
			'gridItemTextColourHover',
			'gridItemTextColourGradient',
			'gridItemTextColourHoverGradient',
		);
		$out  = array();
		foreach ( $keys as $key ) {
			$value       = $attributes[ $key ] ?? '';
			$out[ $key ] = is_array( $value ) || is_object( $value ) ? '' : (string) $value;
		}
		$out['gridItemBorderGradient']      = sgs_css_gradient_value( (string) ( is_string( $attributes['gridItemBorderGradient'] ?? null ) ? $attributes['gridItemBorderGradient'] : '' ) );
		$out['gridItemBorderGradientHover'] = sgs_css_gradient_value( (string) ( is_string( $attributes['gridItemBorderGradientHover'] ?? null ) ? $attributes['gridItemBorderGradientHover'] : '' ) );
		return $out;
	}
}

if ( ! function_exists( 'sgs_grid_item_border_value' ) ) {
	/**
	 * Resolve a `gridItemBorder` shorthand ("1px solid primary") to a safe CSS
	 * `border` value: width and style as written, the colour through
	 * sgs_colour_value() so a palette slug becomes its preset custom property.
	 *
	 * @param string $raw Stored shorthand.
	 * @return string CSS border value, or '' when nothing usable is set.
	 */
	function sgs_grid_item_border_value( string $raw ): string {
		$safe = trim( (string) preg_replace( '/[^A-Za-z0-9\s%(),.\-#]/', '', $raw ) );
		if ( '' === $safe ) {
			return '';
		}
		$parts  = sgs_grid_border_parts( $safe );
		$colour = '' !== $parts['colour'] ? sgs_colour_value( $parts['colour'] ) : '';
		return trim( implode( ' ', array_filter( array( $parts['width'], $parts['style'], $colour ), 'strlen' ) ) );
	}
}

if ( ! function_exists( 'sgs_grid_item_vars' ) ) {
	/**
	 * The resting `--sgs-gi-*` declarations from the flat settings (ground,
	 * border, shadow, text colour). The background gradient, when valid, is the
	 * ground value itself: the consumer's `background` shorthand takes either.
	 *
	 * @param array<string,string> $s Settings from sgs_grid_item_settings().
	 * @return string[] Declarations without trailing semicolons.
	 */
	function sgs_grid_item_vars( array $s ): array {
		$gi     = array();
		$ground = sgs_css_gradient_value( $s['gridItemBackgroundGradient'] );
		if ( '' === $ground && '' !== $s['gridItemBackground'] ) {
			$ground = sgs_colour_value( $s['gridItemBackground'] );
		}
		if ( '' !== $ground ) {
			$gi[] = '--sgs-gi-bg:' . esc_attr( $ground );
		}
		$border = sgs_grid_item_border_value( $s['gridItemBorder'] );
		if ( '' !== $border ) {
			$gi[] = '--sgs-gi-border:' . esc_attr( $border );
		}
		if ( '' !== $s['gridItemShadow'] ) {
			$shadow = sgs_shadow_value_composed( $s['gridItemShadow'], $s['gridItemShadowColour'] );
			if ( '' !== $shadow ) {
				$gi[] = '--sgs-gi-shadow:' . $shadow;
			}
		}
		if ( '' !== $s['gridItemTextColour'] ) {
			$gi[] = '--sgs-gi-color:' . esc_attr( sgs_colour_value( $s['gridItemTextColour'] ) );
		}
		return $gi;
	}
}

if ( ! function_exists( 'sgs_grid_item_needs_scoped_css' ) ) {
	/**
	 * Does any grid-item state need a scoped rule (and so a uid)?
	 *
	 * @param array<string,string> $s Settings from sgs_grid_item_settings().
	 * @return bool
	 */
	function sgs_grid_item_needs_scoped_css( array $s ): bool {
		foreach ( array( 'gridItemBorderGradient', 'gridItemBackgroundHover', 'gridItemBackgroundHoverGradient', 'gridItemTextColourHover', 'gridItemTextColourGradient', 'gridItemTextColourHoverGradient', 'gridItemShadow' ) as $key ) {
			if ( '' !== $s[ $key ] ) {
				return true;
			}
		}
		return false;
	}
}

if ( ! function_exists( 'sgs_grid_item_state_css' ) ) {
	/**
	 * The scoped grid-item state rules at both cell depths: background hover,
	 * text-colour gradient and hover, the border-gradient ring, and the shadow's
	 * automatic lift on hover (sgs_shadow_hover_rules(): on unless the block's
	 * `shadowLiftOnHover` switch is off or a hover shadow preset replaces it).
	 *
	 * @param array<string,string> $s          Settings from sgs_grid_item_settings().
	 * @param string               $uid        The grid container's scope class.
	 * @param array                $attributes Block attributes, read for the lift switch.
	 * @param string               $block_name Registered block name, read for `supports.sgs.shadowLift`.
	 * @return string CSS, '' when nothing is set.
	 */
	function sgs_grid_item_state_css( array $s, string $uid, array $attributes = array(), string $block_name = '' ): string {
		$css = '';
		foreach ( sgs_grid_item_cell_selectors( $uid ) as $cell ) {
			if ( '' !== $s['gridItemShadow'] ) {
				$css .= sgs_shadow_hover_rules( $cell, $s['gridItemShadow'], $s['gridItemShadowColour'], $attributes, $block_name );
			}

			if ( '' !== $s['gridItemBorderGradient'] ) {
				$width = sgs_grid_border_parts( $s['gridItemBorder'] )['width'];
				$css  .= sgs_border_gradient_css(
					$cell,
					$s['gridItemBorderGradient'],
					'' !== $s['gridItemBorderGradientHover'] ? $s['gridItemBorderGradientHover'] : null,
					'' !== $width ? $width : '2px'
				);
			}

			$bg_hover = sgs_background_paint_decl( $s['gridItemBackgroundHover'], $s['gridItemBackgroundHoverGradient'] );
			if ( '' !== $bg_hover ) {
				$css .= sgs_hover_state_rules( $cell, $bg_hover . ';', ':focus-within' );
			}

			$text_resting = sgs_resolve_text_colour_or_gradient( $s['gridItemTextColour'], $s['gridItemTextColourGradient'] );
			if ( '' !== $s['gridItemTextColourGradient'] && '' !== $text_resting ) {
				$decl = sgs_text_colour_decl( $text_resting );
				if ( '' !== $decl ) {
					$css .= $cell . '{' . $decl . ';}';
					$css .= sgs_text_colour_gradient_fallback_rule( $cell, $text_resting );
				}
			}

			$text_hover = sgs_resolve_text_colour_or_gradient( $s['gridItemTextColourHover'], $s['gridItemTextColourHoverGradient'] );
			if ( '' !== $text_hover ) {
				$decl = sgs_text_colour_decl( $text_hover );
				if ( '' !== $decl ) {
					$css .= sgs_hover_state_rules( $cell, $decl . ';', ':focus-within' );
					$css .= sgs_hover_media_wrap( sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $cell . ':hover', $text_hover ) );
				}
			}
		}
		return $css;
	}
}
