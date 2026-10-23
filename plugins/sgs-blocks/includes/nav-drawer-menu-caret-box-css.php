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
 * `sgs_fill_decls()`. Hover glow and turn timing are motion (Spec 38A) and
 * are not set here. Nothing set: nothing emitted.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-colour-variants.php';
require_once __DIR__ . '/helpers-border-style.php';

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
		$size      = is_array( $attributes['caretBoxSize'] ?? null ) ? $attributes['caretBoxSize'] : array();
		$has_size  = '' !== (string) sgs_resolve_tier( $size, 'desktop', '' )['value']
			|| '' !== (string) sgs_resolve_tier( $size, 'tablet', '' )['value']
			|| '' !== (string) sgs_resolve_tier( $size, 'mobile', '' )['value'];
		if ( ! $has_size && ! $fill['normal'] && ! $border['base'] ) {
			return '';
		}

		$boxes  = array( $caret );
		$on_all = ! empty( $attributes['caretBoxOnTrailingIcon'] );
		if ( $on_all ) {
			$boxes[] = $trail;
		}
		$box_sel = implode( ',', $boxes );

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
			$css .= '@media (max-width:' . SGS_Breakpoints::TABLET_MAX . 'px){' . $box_sel . '{' . implode( ';', $border['tablet'] ) . ';}}';
		}
		if ( $border['mobile'] ) {
			$css .= '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px){' . $box_sel . '{' . implode( ';', $border['mobile'] ) . ';}}';
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
		return $css;
	}
}
