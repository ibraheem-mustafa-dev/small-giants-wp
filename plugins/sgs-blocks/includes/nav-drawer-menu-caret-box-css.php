<?php
/**
 * The drawer menu's caret box (`caretBox*`): a ringed circle around the
 * accordion expander (`.sgs-nav-drawer-menu__caret`), with its own fill and
 * border colour at rest and while the row is open, and, with
 * `caretBoxOnTrailingIcon`, the same circle around every row's trailing icon
 * (`.sgs-nav-drawer-menu__trailing-icon`), so a row with no submenu (Home,
 * Contact) draws a matching ringed arrow.
 *
 * The box is on when a size, a fill or a border width is set; it is a circle
 * (`border-radius:50%`), 40px across unless `caretBoxSize` sets a size per
 * device, with the glyph centred and keeping its own size (the caret's svg
 * is sized by `submenuCaretSize`, the trailing icon's by `itemTrailingIconSize`
 * through `font-size`). The border runs through the shared border helper
 * (`sgs_border_element_decls()`, prefix `caretBox`), the fills through
 * `sgs_fill_decls()`. The circle's shadow (`caretBoxShadow*`, the shared
 * ShadowControl family) is drawn at rest and swaps to the hover shape and colour
 * while the row is hovered, tapped or keyboard-focused: a glow ring is a hover
 * shape with a 0 0 0 spread. Turn timing is motion (Spec 38A) and is not set here.
 * Nothing set: nothing emitted.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-colour-variants.php';
require_once __DIR__ . '/helpers-border-style.php';
require_once __DIR__ . '/helpers-hover-state.php';
require_once __DIR__ . '/helpers-motion-easing.php';

if ( ! function_exists( 'sgs_nav_drawer_menu_caret_box_css' ) ) {
	/**
	 * Build the caret box CSS.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $uid_sel    The menu's scoped selector.
	 * @return string CSS text (no `<style>` wrapper); '' when the box is off.
	 */
	function sgs_nav_drawer_menu_caret_box_css( array $attributes, string $uid_sel ): string {
		$caret  = $uid_sel . ' .sgs-nav-drawer-menu__caret';
		$open   = $uid_sel . ' .sgs-nav-drawer-menu__accordion[open] > .sgs-nav-drawer-menu__accordion-summary .sgs-nav-drawer-menu__caret';
		$trail  = $uid_sel . ' .sgs-nav-drawer-menu__trailing-icon';
		$border = sgs_border_element_decls(
			$attributes,
			'caretBox',
			$caret,
			array(
				'colour' => array( 'base' => 'caretBoxBorderColour' ),
				'radius' => false,
			)
		);
		$fill      = sgs_fill_decls(
			$attributes,
			array(
				'base'     => 'caretBoxBg',
				'gradient' => 'caretBoxBgGradient',
			)
		);
		$fill_open = sgs_fill_decls(
			$attributes,
			array(
				'base'     => 'caretBoxBgOpen',
				'gradient' => 'caretBoxBgOpenGradient',
			)
		);
		$glyph_open = sgs_colour_value( (string) ( $attributes['caretColourOpen'] ?? '' ) );
		// The item-colour rule paints the caret's svg directly (nav-menu-css.php::$caret_svg_sel), so the open colour must reach the svg too.
		$glyph_css  = '' !== $glyph_open ? $open . ',' . $open . ' svg{color:' . $glyph_open . ';}' : '';
		$size      = is_array( $attributes['caretBoxSize'] ?? null ) ? $attributes['caretBoxSize'] : array();
		$has_size  = '' !== (string) sgs_resolve_tier( $size, 'desktop', '' )['value']
			|| '' !== (string) sgs_resolve_tier( $size, 'tablet', '' )['value']
			|| '' !== (string) sgs_resolve_tier( $size, 'mobile', '' )['value'];
		$boxes  = array( $caret );
		$on_all = ! empty( $attributes['caretBoxOnTrailingIcon'] );
		if ( $on_all ) {
			$boxes[] = $trail;
		}
		$box_sel    = implode( ',', $boxes );
		$shadow_css = sgs_nav_drawer_menu_caret_box_shadow_css( $attributes, $uid_sel, $on_all );
		if ( ! $has_size && ! $fill['normal'] && ! $border['base'] ) {
			return $glyph_css . $shadow_css;
		}

		$decls = array_merge(
			array( 'display:inline-flex', 'align-items:center', 'justify-content:center', 'box-sizing:border-box', 'border-radius:50%', 'flex:none', 'width:40px', 'height:40px' ),
			$fill['normal'],
			$border['base']
		);
		$css    = $box_sel . '{' . implode( ';', $decls ) . ';}';
		$css   .= implode( '', $border['rules'] );
		$css   .= sgs_emit_responsive_css(
			$box_sel,
			array(
				array(
					'value'        => $size,
					'css'          => 'width',
					'unit_default' => 'px',
				),
				array(
					'value'        => $size,
					'css'          => 'height',
					'unit_default' => 'px',
				),
			)
		);
		// A box size the client set overrules the accordion expander's 44px tap floor (ruling 11); the flag follows the size per tier.
		$css .= sgs_emit_responsive_css(
			$uid_sel,
			array(
				array(
					'value'     => $size,
					'css'       => '--sgs-ndm-caret-tap-min',
					'transform' => static fn( $raw ): string => '' === trim( (string) $raw ) ? '' : '0px',
				),
			)
		);
		if ( $border['tablet'] ) {
			$css .= sgs_emit_tier_decls( $box_sel, array( 'tablet' => $border['tablet'] ) );
		}
		if ( $border['mobile'] ) {
			$css .= sgs_emit_tier_decls( $box_sel, array( 'mobile' => $border['mobile'] ) );
		}
		if ( $on_all ) {
			// The trailing icon draws its glyph at 1em of its own font size (itemTrailingIconSize).
			$css .= $trail . ' svg{width:1em;height:1em;}';
		}

		$open_decls  = $fill_open['normal'];
		$open_border = sgs_colour_value( (string) ( $attributes['caretBoxBorderColourOpen'] ?? '' ) );
		if ( '' !== $open_border && $border['base'] ) {
			$open_decls[] = 'border-color:' . $open_border;
		}
		if ( $open_decls ) {
			$css .= $open . '{' . implode( ';', $open_decls ) . ';}';
		}
		return $css . $glyph_css . $shadow_css;
	}
}

if ( ! function_exists( 'sgs_nav_drawer_menu_caret_box_shadow_css' ) ) {
	/**
	 * The circle's shadow at rest and on the hovered, tapped or keyboard-focused row.
	 *
	 * The hover reaches the circle from its row: the accordion row or summary for the expander,
	 * the row's link for a trailing icon. Mouse hover is skipped on touch devices; a tap
	 * (`:active`) and keyboard focus (`:focus-visible`) always apply.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $uid_sel    The menu's scoped selector.
	 * @param bool   $on_all     Whether the trailing icons wear the circle too.
	 * @return string CSS text; '' when no shadow is set.
	 */
	function sgs_nav_drawer_menu_caret_box_shadow_css( array $attributes, string $uid_sel, bool $on_all ): string {
		$shadow = sgs_shadow_decls(
			$attributes,
			array(
				'base'         => 'caretBoxShadow',
				'colour'       => 'caretBoxShadowColour',
				'hover'        => 'caretBoxShadowHover',
				'hover_colour' => 'caretBoxShadowColourHover',
			),
			'sgs/nav-drawer-menu'
		);
		if ( ! $shadow['normal'] && ! $shadow['hover'] ) {
			return '';
		}
		$bem   = $uid_sel . ' .sgs-nav-drawer-menu__';
		$boxes = $bem . 'caret' . ( $on_all ? ',' . $bem . 'trailing-icon' : '' );
		$glow  = 'box-shadow var(--wp--custom--transition--medium, 300ms ease)';
		// The caret also turns when its row opens; its transform timing is kept beside the shadow's.
		$turn_ms     = $attributes['submenuCaretTurnDuration'] ?? null;
		$turn_key    = (string) ( $attributes['submenuCaretTurnEasing'] ?? '' );
		$turn        = is_numeric( $turn_ms ) || '' !== $turn_key
			? 'transform ' . sgs_flat_duration_ms( $turn_ms, 300 ) . 'ms ' . sgs_motion_easing_css( $turn_key, (string) ( $attributes['submenuCaretTurnEasingCustom'] ?? '' ), 'ease' )
			: 'transform var(--sgs-ndm-motion, 200ms ease)';
		$normal      = $shadow['normal'] ? implode( ';', $shadow['normal'] ) . ';' : '';
		$css         = $bem . 'caret{' . $normal . 'transition:' . $turn . ',' . $glow . ';}';
		if ( $on_all ) {
			$css .= $bem . 'trailing-icon{' . $normal . 'transition:' . $glow . ';}';
		}
		if ( $shadow['hover'] ) {
			$body  = '{' . implode( ';', $shadow['hover'] ) . ';}';
			$pairs = array(
				array( $bem . 'accordion-row:has(> .sgs-nav-drawer-menu__link:%s) .sgs-nav-drawer-menu__caret' ),
				array( $bem . 'accordion-summary:%s .sgs-nav-drawer-menu__caret' ),
			);
			if ( $on_all ) {
				$pairs[] = array( $bem . 'link:%s .sgs-nav-drawer-menu__trailing-icon' );
			}
			$hover = array();
			$other = array();
			foreach ( $pairs as $pair ) {
				$hover[] = SGS_HOVER_NOT_TOUCH . ' ' . sprintf( $pair[0], 'hover' );
				$other[] = sprintf( $pair[0], 'active' );
				if ( ! sgs_focus_rests_active() ) {
					$other[] = sprintf( $pair[0], 'focus-visible' );
				}
			}
			$css .= sgs_hover_media_wrap( implode( ',', $hover ) . $body );
			$css .= implode( ',', $other ) . $body;
		}
		$css .= '@media (prefers-reduced-motion: reduce){' . $boxes . '{transition:none;}}';
		return $css;
	}
}
