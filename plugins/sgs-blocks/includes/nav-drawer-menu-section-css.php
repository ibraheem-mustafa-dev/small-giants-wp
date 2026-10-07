<?php
/**
 * `sgs/nav-drawer-menu` — the accordion SECTION: row alignment, the open
 * section's box (radius, shadow) and its open/close motion and row stagger.
 *
 * The bar's equivalents are `justifyContent`, `submenuBorderRadius`/`submenuShadow`
 * (`includes/nav-menu-submenu-css.php`) and the panel motion block in
 * `nav-bar-menu/render.php`. The drawer's section is a native `<details>` that
 * flows inline, so it gets its own emitters here. Structure (keyframes, the
 * `::details-content` transitions, the per-row index) lives in
 * `nav-drawer-menu/style.css`, keyed on the root modifier classes and the
 * custom properties this file returns; nothing structural is emitted per instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-hover-state.php';

if ( ! function_exists( 'sgs_nav_drawer_menu_row_layout_css' ) ) {
	/**
	 * `justifyContent` — how a row's content is spread across the row.
	 *
	 * Whitelisted, not merely escaped: the value concatenates straight into a raw
	 * `<style>` block and can arrive from a programmatic writer that bypasses the
	 * editor's `enum`. A centred row also reserves the expander's 56px on the
	 * inline-start side (the split row already reserves it at the end), so the
	 * label sits on the row's true centre.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $uid_sel    This instance's CSS scope selector (`.{uid}`).
	 * @return string CSS fragment, or '' when unset.
	 */
	function sgs_nav_drawer_menu_row_layout_css( array $attributes, string $uid_sel ): string {
		$justify = (string) ( $attributes['justifyContent'] ?? '' );
		if ( ! in_array( $justify, array( 'flex-start', 'center', 'flex-end', 'space-between', 'space-around' ), true ) ) {
			return '';
		}
		$css = $uid_sel . ' .sgs-nav-drawer-menu__link{justify-content:' . $justify . ';}';
		if ( 'center' === $justify ) {
			$css .= $uid_sel . ' .sgs-nav-drawer-menu__accordion-row > .sgs-nav-drawer-menu__link{padding-inline-start:56px;}';
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_nav_drawer_menu_section_box_css' ) ) {
	/**
	 * `submenuBorderRadius` and `submenuShadow`/`submenuShadowColour` on the open section.
	 *
	 * `includes/nav-menu-submenu-link-css.php::sgs_nav_shared_submenu_link_css`
	 * forces `border-radius:0;box-shadow:none` on `.sgs-nav-drawer {uid} .{bem}__submenu`
	 * (an untouched drawer section is square and flat). These rules use the same
	 * selector, so they win on source order, and only when the attribute is set.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $uid_sel    This instance's CSS scope selector (`.{uid}`).
	 * @return string CSS fragment, or '' when neither is set.
	 */
	function sgs_nav_drawer_menu_section_box_css( array $attributes, string $uid_sel ): string {
		$decls  = '';
		$radius = sgs_corner_object_longhands( $attributes['submenuBorderRadius'] ?? null );
		if ( null !== $radius && '' !== $radius ) {
			$decls .= $radius . ';';
		}
		$shadow_shape  = (string) ( $attributes['submenuShadow'] ?? '' );
		$shadow_colour = (string) ( $attributes['submenuShadowColour'] ?? '' );
		$decls        .= implode( ';', sgs_shadow_box_decls( $shadow_shape, $shadow_colour ) );
		if ( '' === $decls ) {
			return '';
		}
		$sel = '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-drawer-menu__submenu';
		// The drawer is an overlay (`supports.sgs.shadowLift` false), so this returns ''
		// unless that declaration changes; the wiring keeps the section on the shared lift rule.
		return $sel . '{' . $decls . '}'
			. sgs_shadow_hover_rules( $sel, $shadow_shape, $shadow_colour, $attributes, 'sgs/nav-drawer-menu' );
	}
}

if ( ! function_exists( 'sgs_nav_drawer_menu_section_motion' ) ) {
	/**
	 * The section's open/close animation and row stagger.
	 *
	 * Accordion mode only: a drill-down section is an overlay that slides in from
	 * the side, and animating its height as well would fight that. Returns the root
	 * modifier classes style.css keys on, plus the custom-property values it reads.
	 * Nothing is returned for an untouched drawer (`submenuAnimation` none, stagger 0).
	 *
	 * `submenuAnimation` values: `none`, `fade` (opacity), `fade-lift` (opacity and
	 * an 8px rise), `height` (the section's height collapses and grows). The bar's
	 * `slide-down` and `grow` are floating-panel shapes with no inline equivalent.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $uid_sel    This instance's CSS scope selector (`.{uid}`).
	 * @param string $model      Resolved submenu model, `accordion` or `drill-down`.
	 * @return array{css:string,classes:string[]}
	 */
	function sgs_nav_drawer_menu_section_motion( array $attributes, string $uid_sel, string $model ): array {
		$out = array(
			'css'     => '',
			'classes' => array(),
		);
		if ( 'accordion' !== $model ) {
			return $out;
		}

		$mode = (string) ( $attributes['submenuAnimation'] ?? 'none' );
		$in   = sgs_motion_ms( $attributes['submenuAnimationDuration'] ?? 180, 180 );
		$ease = sgs_motion_easing_css( (string) ( $attributes['submenuAnimationEasing'] ?? 'ease-out-css' ), (string) ( $attributes['submenuAnimationEasingCustom'] ?? '' ), 'ease-out' );
		$vars = '';
		if ( in_array( $mode, array( 'fade', 'fade-lift', 'height' ), true ) ) {
			$out['classes'][] = 'sgs-nav-drawer-menu--acc-' . $mode;
			$vars            .= '--sgs-ndm-acc-in:' . $in . 'ms;'
				. '--sgs-ndm-acc-out:' . sgs_motion_ms( $attributes['submenuExitDuration'] ?? 150, 150 ) . 'ms;'
				. '--sgs-ndm-acc-ease:' . $ease . ';';
		}

		$step = sgs_motion_ms( $attributes['submenuItemStagger'] ?? 0, 0, 1000 );
		if ( $step > 0 ) {
			$dur              = sgs_motion_ms( $attributes['submenuItemStaggerDuration'] ?? 0, 0 );
			$max              = sgs_motion_ms( $attributes['submenuItemStaggerMax'] ?? 0, 0, 10000 );
			$dist             = is_numeric( $attributes['submenuItemStaggerDistance'] ?? null )
				? max( -400, min( 400, (int) round( (float) $attributes['submenuItemStaggerDistance'] ) ) ) : 8;
			$out['classes'][] = 'sgs-nav-drawer-menu--acc-stagger';
			if ( 'rows' === (string) ( $attributes['submenuItemStaggerScope'] ?? 'columns' ) ) {
				$out['classes'][] = 'sgs-nav-drawer-menu--acc-stagger-rows';
			}
			$vars .= '--sgs-ndm-stag-step:' . $step . 'ms;'
				. '--sgs-ndm-stag-dur:' . ( $dur > 0 ? $dur : $in ) . 'ms;'
				. '--sgs-ndm-stag-dist:' . $dist . 'px;'
				. '--sgs-ndm-stag-ease:' . $ease . ';'
				. ( $max > 0 ? '--sgs-ndm-stag-max:' . $max . 'ms;' : '' );
		}

		if ( '' !== $vars ) {
			$out['css'] = $uid_sel . '{' . $vars . '}';
		}
		return $out;
	}
}
