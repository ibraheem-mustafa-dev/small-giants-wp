<?php
/**
 * SGS Nav Bar Menu — the MENU BUTTON's scoped CSS.
 *
 * Its own module because it is its own element with its own inspector panel
 * ("Menu Button", §9.3): icon/text colour with its glyph-Sweep treatment, the resting
 * and hover background, and the size rule that must stop being a fixed square
 * the moment the button carries a word.
 *
 * ⚠ LOAD ORDER: NOT bootstrap-loaded — `require_once`'d per-instance from
 * render.php, matching its sibling CSS modules.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_bar_menu_trigger_css' ) ) {
	/**
	 * Build the menu-button half of the nav bar menu's scoped <style>.
	 *
	 * @param array  $attributes          Block attributes.
	 * @param string $uid_sel             This instance's CSS scope selector (`.{uid}`).
	 * @param array  $treatments          RESOLVED hover treatments — ⛔ never the stored attribute.
	 * @param string $trigger_mode        Resolved DESKTOP `triggerMode` tier (icon|text|icon-and-text).
	 * @param string $trigger_mode_tablet Resolved TABLET tier. '' defaults to $trigger_mode (old 4-arg
	 *                                     call sites, or a caller with nothing tablet-specific to say).
	 * @param string $trigger_mode_mobile Resolved MOBILE tier. '' defaults to $trigger_mode_tablet.
	 * @return string CSS fragment (no wrapping <style> tag).
	 */
	function sgs_nav_bar_menu_trigger_css( array $attributes, string $uid_sel, array $treatments = array(), string $trigger_mode = 'icon', string $trigger_mode_tablet = '', string $trigger_mode_mobile = '' ): string {
		if ( '' === $trigger_mode_tablet ) {
			$trigger_mode_tablet = $trigger_mode;
		}
		if ( '' === $trigger_mode_mobile ) {
			$trigger_mode_mobile = $trigger_mode_tablet;
		}
		$css         = '';
		$burger_sel  = $uid_sel . ' .sgs-nav-bar-menu__burger';
		$t_burger    = (string) ( $treatments['burgerColourHoverTreatment'] ?? 'swap' );
		$t_burger_bg = (string) ( $treatments['burgerBgHoverTreatment'] ?? 'swap' );

		// 4e. Burger colour / resting background / hover / size.
		// burgerColourGradient is the gradient sibling; the gradient wins when
		// set+valid.
		$burger_colour           = isset( $attributes['burgerColour'] ) ? (string) $attributes['burgerColour'] : '';
		$burger_colour_gradient  = isset( $attributes['burgerColourGradient'] ) ? (string) $attributes['burgerColourGradient'] : '';
		$burger_colour_effective = sgs_resolve_text_colour_or_gradient( $burger_colour, $burger_colour_gradient );
		/*
		 * Menu-button icon/text colour. Its Sweep (FR-41-23/26) is the SAME glyph
		 * sweep the item and sublink rows use — eligibility-gated on three
		 * declared conditions (no own background in EITHER state, no icon
		 * gradient, and `triggerMode !== 'icon'` because a pure-icon SVG has no
		 * glyphs for `background-clip:text` to grip). `render.php` has already
		 * applied that predicate; this reads the RESOLVED value only.
		 */
		$burger_colour_hover = (string) ( $attributes['burgerColourHover'] ?? '' );
		$burger_sweep        = array(
			'base'  => '',
			'hover' => '',
		);
		if ( 'sweep' === $t_burger && '' !== $burger_colour_hover ) {
			$burger_sweep = sgs_nav_shared_text_sweep_css(
				$burger_sel,
				'' !== $burger_colour ? sgs_colour_value( $burger_colour ) : '',
				sgs_colour_value( $burger_colour_hover )
			);
		}

		if ( '' !== $burger_sweep['base'] ) {
			$css .= $burger_sweep['base'];
		} elseif ( '' !== $burger_colour_effective ) {
			$burger_colour_decl = sgs_text_colour_decl( $burger_colour_effective );
			if ( '' !== $burger_colour_decl ) {
				$css .= $burger_sel . '{' . $burger_colour_decl . ';}';
			}
			$css .= sgs_text_colour_gradient_fallback_rule( $burger_sel, $burger_colour_effective );
		}

		if ( '' !== $burger_sweep['hover'] ) {
			$css .= $burger_sweep['hover'];
		} elseif ( 'none' !== $t_burger && '' !== $burger_colour_hover ) {
			$css .= sgs_hover_state_rules( $burger_sel, 'color:' . sgs_colour_value( $burger_colour_hover ), ':focus-visible' );
		}

		/*
		 * RESTING background — the base for burgerHoverColour's hover state (Spec 35
		 * FR-35-5 STATE_WITHOUT_BASE). Without a resting fill, a client could style
		 * the hover fill but never the button's own resting fill. style.css's
		 * `background:none` is the default when this is left unset.
		 */
		$burger_bg          = isset( $attributes['burgerBg'] ) ? (string) $attributes['burgerBg'] : '';
		$burger_bg_gradient = sgs_css_gradient_value( $attributes['burgerBgGradient'] ?? '' );
		if ( '' !== $burger_bg ) {
			$css .= $uid_sel . ' .sgs-nav-bar-menu__burger{' . sgs_background_paint_decl( $burger_bg, $burger_bg_gradient ) . ';}';
		}
		// `burgerBgHoverTreatment` is a TWO-option row (none|swap): a single button
		// is neither a repeated item row for the shared pill to slide between nor a
		// text baseline for a sweep band, so there is no third option to honour.
		$burger_hover_slug = isset( $attributes['burgerHoverColour'] ) ? (string) $attributes['burgerHoverColour'] : '';
		if ( '' !== $burger_hover_slug && 'none' !== $t_burger_bg ) {
			$css .= sgs_hover_state_rules( $burger_sel, 'background-color:' . sgs_colour_value( $burger_hover_slug ), ':focus-visible' );
		}

		/*
		 * ⚠ The button cannot stay a fixed square once it carries a word
		 * (FR-41-12). Under `text` / `icon-and-text` the fixed `width` becomes
		 * `min-width` + `width:auto`; `height` and `min-height` are KEPT so the
		 * 44px touch-target floor survives. Under `icon` the rule is unchanged.
		 *
		 * `triggerMode` is a TIER OBJECT, so "text-bearing" is
		 * resolved per tier and the desktop rule stays UNCONDITIONAL (mirrors
		 * sgs/nav-drawer's own `closeSize` per-tier block); tablet/mobile only get
		 * an `@media` override when that tier's text-bearing-ness actually differs
		 * from the tier above — one mode everywhere emits no redundant per-tier
		 * override at all.
		 */
		$burger_size = sgs_css_length_value( $attributes['burgerSize'] ?? '44px' );
		if ( '' !== $burger_size ) {
			$sgs_nm_text_bearing = static function ( $mode ) {
				return in_array( $mode, array( 'text', 'icon-and-text' ), true );
			};

			$burger_desktop_text_bearing = $sgs_nm_text_bearing( $trigger_mode );
			$css                        .= $burger_sel . '{'
				. ( $burger_desktop_text_bearing ? 'width:auto;' : 'width:' . $burger_size . ';' )
				. 'height:' . $burger_size . ';min-width:' . $burger_size . ';min-height:' . $burger_size . ';}';

			$sgs_nm_size_prev_bearing = $burger_desktop_text_bearing;
			foreach ( array(
				'tablet' => array( $trigger_mode_tablet, SGS_Breakpoints::TABLET_MAX ),
				'mobile' => array( $trigger_mode_mobile, SGS_Breakpoints::MOBILE_MAX ),
			) as $sgs_nm_size_tier ) {
				list( $sgs_nm_size_tier_mode, $sgs_nm_size_tier_bp ) = $sgs_nm_size_tier;
				$sgs_nm_size_tier_text_bearing                       = $sgs_nm_text_bearing( $sgs_nm_size_tier_mode );
				if ( $sgs_nm_size_tier_text_bearing === $sgs_nm_size_prev_bearing ) {
					$sgs_nm_size_prev_bearing = $sgs_nm_size_tier_text_bearing;
					continue;
				}
				$css .= '@media (max-width:' . $sgs_nm_size_tier_bp . 'px){' . $burger_sel . '{'
					. ( $sgs_nm_size_tier_text_bearing ? 'width:auto;' : 'width:' . $burger_size . ';' )
					. 'height:' . $burger_size . ';min-width:' . $burger_size . ';min-height:' . $burger_size . ';}}';

				$sgs_nm_size_prev_bearing = $sgs_nm_size_tier_text_bearing;
			}
		}

		/*
		 * Menu-button LABEL typography. Scoped to the TEXT SPAN
		 * (`.sgs-nav-bar-menu__burger-text`), never the button itself ($burger_sel), so
		 * `icon-and-text` mode never accidentally resizes the icon SVG. Both the
		 * font-family AND font-size inherit-when-blank escape hatches are opted in:
		 * the burger label renders as a UA `<button>` (UA defaults ~13.3px/Arial),
		 * not a heading tag governed by theme.json's own presets, so an unset value
		 * must actively contest the UA default rather than stay silent.
		 */
		$burger_text_sel = $uid_sel . ' .sgs-nav-bar-menu__burger-text';
		$css            .= sgs_typography_css_rule( $attributes, 'burger', $burger_text_sel, '', true, true );

		/*
		 * Per-tier icon/text VISIBILITY. render.php renders BOTH
		 * the icon markup and the label span the moment ANY tier needs either one
		 * (so a desktop `icon-and-text` + mobile `icon` button carries both
		 * elements in the DOM at every width); this is the ONE place that then
		 * hides whichever element a given tier doesn't want. Both properties are
		 * declared EXPLICITLY at every tier that differs from the tier above
		 * (never just the one being hidden) so a later tier can also UN-hide an
		 * element a narrower rule doesn't touch — e.g. desktop `text` + tablet
		 * `icon-and-text` needs the icon shown again at tablet, not merely "not
		 * hidden". Tier-diffed exactly like the size block above: identical mode
		 * across tiers emits nothing, and three identical tiers emit no CSS at
		 * all (no icon/text split to express).
		 */
		if ( sgs_nav_bar_menu_trigger_needs_icon_text_split( $trigger_mode, $trigger_mode_tablet, $trigger_mode_mobile ) ) {
			$icon_sel  = $uid_sel . ' .sgs-nav-bar-menu__burger-icon';
			$text_sel  = $uid_sel . ' .sgs-nav-bar-menu__burger-text';
			$decls_for = static function ( $mode ) use ( $icon_sel, $text_sel ) {
				$show_icon = in_array( $mode, array( 'icon', 'icon-and-text' ), true );
				$show_text = in_array( $mode, array( 'text', 'icon-and-text' ), true );
				return $icon_sel . '{display:' . ( $show_icon ? 'flex' : 'none' ) . ';}'
					. $text_sel . '{display:' . ( $show_text ? 'flex' : 'none' ) . ';}';
			};

			if ( 'icon-and-text' !== $trigger_mode ) {
				$css .= $decls_for( $trigger_mode );
			}

			$sgs_nm_split_prev_mode = $trigger_mode;
			foreach ( array(
				'tablet' => array( $trigger_mode_tablet, SGS_Breakpoints::TABLET_MAX ),
				'mobile' => array( $trigger_mode_mobile, SGS_Breakpoints::MOBILE_MAX ),
			) as $sgs_nm_split_tier ) {
				list( $sgs_nm_split_tier_mode, $sgs_nm_split_tier_bp ) = $sgs_nm_split_tier;
				if ( $sgs_nm_split_tier_mode === $sgs_nm_split_prev_mode ) {
					$sgs_nm_split_prev_mode = $sgs_nm_split_tier_mode;
					continue;
				}
				$css .= '@media (max-width:' . $sgs_nm_split_tier_bp . 'px){' . $decls_for( $sgs_nm_split_tier_mode ) . '}';

				$sgs_nm_split_prev_mode = $sgs_nm_split_tier_mode;
			}
		}

		return $css;
	}
}

if ( ! function_exists( 'sgs_nav_bar_menu_trigger_needs_icon_text_split' ) ) {
	/**
	 * Does this instance need ANY icon/text visibility CSS at all?
	 *
	 * False in TWO distinct negative cases: (1) only one of the two markup
	 * elements exists across every tier (e.g. all three tiers are `icon` — no
	 * text span was ever rendered, so there is nothing to hide), and (2) both
	 * elements exist but every tier is `icon-and-text` — they show everywhere,
	 * so there is still nothing to hide anywhere. Either way an untouched
	 * (single-mode) button emits byte-identical CSS to before this attribute
	 * was tiered.
	 *
	 * @param string $desktop Resolved desktop tier.
	 * @param string $tablet  Resolved tablet tier.
	 * @param string $mobile  Resolved mobile tier.
	 * @return bool True only when BOTH elements exist somewhere AND at least
	 *              one tier hides one of them.
	 */
	function sgs_nav_bar_menu_trigger_needs_icon_text_split( string $desktop, string $tablet, string $mobile ): bool {
		$tiers    = array( $desktop, $tablet, $mobile );
		$any_icon = in_array( 'icon', $tiers, true ) || in_array( 'icon-and-text', $tiers, true );
		$any_text = in_array( 'text', $tiers, true ) || in_array( 'icon-and-text', $tiers, true );
		if ( ! $any_icon || ! $any_text ) {
			return false;
		}
		foreach ( $tiers as $mode ) {
			if ( 'icon-and-text' !== $mode ) {
				return true;
			}
		}
		return false;
	}
}
