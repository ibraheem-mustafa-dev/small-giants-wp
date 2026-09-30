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

require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-box.php';

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

			/*
			 * `burgerWidth` lets the button be non-square (e.g. 30px wide x
			 * 36px tall, lamalama.com) — WIDTH only; `height`/`min-height`
			 * stay tied to `burgerSize`. A tier's own (sanitised) value wins,
			 * an unset tier climbs to the tier above (sgs_resolve_tier()), and
			 * desktop falls back to `$burger_size`. `min-width` follows the
			 * resolved width so a width under 44px takes effect; the 44px
			 * touch target is the burger's `::after` in style.css.
			 *
			 * An empty `burgerWidth` (`{}`) resolves every tier to
			 * `$burger_size`, so the burger stays square.
			 */
			$sgs_nm_bw_tiers = sgs_responsive_normalise_object( $attributes['burgerWidth'] ?? array(), false );
			$sgs_nm_bw_clean = array();
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $sgs_nm_bw_tier_key ) {
				$sgs_nm_bw_raw                          = $sgs_nm_bw_tiers[ $sgs_nm_bw_tier_key ] ?? null;
				$sgs_nm_bw_safe                         = ( null !== $sgs_nm_bw_raw && '' !== $sgs_nm_bw_raw ) ? sgs_css_length_value( (string) $sgs_nm_bw_raw ) : '';
				$sgs_nm_bw_clean[ $sgs_nm_bw_tier_key ] = '' !== $sgs_nm_bw_safe ? $sgs_nm_bw_safe : null;
			}
			$sgs_nm_resolve_width = static function ( $tier ) use ( $sgs_nm_bw_clean, $burger_size ) {
				return sgs_resolve_tier( $sgs_nm_bw_clean, $tier, $burger_size )['value'];
			};

			$sgs_nm_size_decl_for = static function ( $mode, $width ) use ( $sgs_nm_text_bearing, $burger_size ) {
				return ( $sgs_nm_text_bearing( $mode ) ? 'width:auto;' : 'width:' . $width . ';' )
					. 'height:' . $burger_size . ';min-width:' . $width . ';min-height:' . $burger_size . ';';
			};

			$burger_desktop_width = $sgs_nm_resolve_width( 'desktop' );
			$burger_desktop_decl  = $sgs_nm_size_decl_for( $trigger_mode, $burger_desktop_width );
			$css                 .= $burger_sel . '{' . $burger_desktop_decl . '}';

			$sgs_nm_size_prev_decl = $burger_desktop_decl;
			foreach ( array(
				'tablet' => array( $trigger_mode_tablet, SGS_Breakpoints::TABLET_MAX, 'tablet' ),
				'mobile' => array( $trigger_mode_mobile, SGS_Breakpoints::MOBILE_MAX, 'mobile' ),
			) as $sgs_nm_size_tier ) {
				list( $sgs_nm_size_tier_mode, $sgs_nm_size_tier_bp, $sgs_nm_size_tier_key ) = $sgs_nm_size_tier;
				$sgs_nm_size_tier_width = $sgs_nm_resolve_width( $sgs_nm_size_tier_key );
				$sgs_nm_size_tier_decl  = $sgs_nm_size_decl_for( $sgs_nm_size_tier_mode, $sgs_nm_size_tier_width );
				if ( $sgs_nm_size_tier_decl === $sgs_nm_size_prev_decl ) {
					$sgs_nm_size_prev_decl = $sgs_nm_size_tier_decl;
					continue;
				}
				$css .= '@media (max-width:' . $sgs_nm_size_tier_bp . 'px){' . $burger_sel . '{' . $sgs_nm_size_tier_decl . '}}';

				$sgs_nm_size_prev_decl = $sgs_nm_size_tier_decl;
			}
		}

		/*
		 * U-18 G6 — the default glyph's bar-STACK BOX (`.sgs-nav-bar-menu__burger-icon`),
		 * distinct from the BUTTON handled above ($burger_sel): `burgerWidth`/`burgerSize`
		 * already claim `css:width`/`css:height` on the button, so this pair of per-tier
		 * length objects gets its own element and its own CSS custom properties.
		 *
		 * Height writes `--sgs-nbm-icon-h`, never a bare `height` declaration:
		 * `.sgs-nav-bar-menu__burger-icon--two-bar` already sets that property at full
		 * (0,1,0) specificity in style.css, so this rule targets
		 * `.sgs-nav-bar-menu__burger-icon` scoped under `.{uid}` (specificity 0,2,0) to win
		 * over it — every morph pose (`x`, `x-rotate`, `line`, two-bar) already derives its
		 * travel from that one property via `calc()`, so setting it here reaches every pose
		 * for free. Width writes a NEW `--sgs-nbm-icon-w` property, consumed by a
		 * `width: var(--sgs-nbm-icon-w)` read in style.css's zero-specificity `:where()`
		 * box rule, which declares that property's 24px default.
		 *
		 * Same tier-diff shape as `burgerWidth` above, EXCEPT the resolve fallback is
		 * `null` (not a forced px value) — an unresolved property emits no declaration at
		 * all, so `:where()`'s own 24px/18px (or 8.5px height under `burgerBarCount: 2`)
		 * keeps winning. Nothing is emitted at all when BOTH `burgerIconWidth` and
		 * `burgerIconHeight` are empty objects — byte-identical to before this pair
		 * existed.
		 */
		$sgs_nm_icon_width_raw  = $attributes['burgerIconWidth'] ?? array();
		$sgs_nm_icon_height_raw = $attributes['burgerIconHeight'] ?? array();
		if ( ! empty( $sgs_nm_icon_width_raw ) || ! empty( $sgs_nm_icon_height_raw ) ) {
			$sgs_nm_icon_sel = $uid_sel . ' .sgs-nav-bar-menu__burger-icon';

			$sgs_nm_icon_w_tiers = sgs_responsive_normalise_object( $sgs_nm_icon_width_raw, false );
			$sgs_nm_icon_h_tiers = sgs_responsive_normalise_object( $sgs_nm_icon_height_raw, false );
			$sgs_nm_icon_w_clean = array();
			$sgs_nm_icon_h_clean = array();
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $sgs_nm_icon_tier_key ) {
				$sgs_nm_icon_w_raw                            = $sgs_nm_icon_w_tiers[ $sgs_nm_icon_tier_key ] ?? null;
				$sgs_nm_icon_w_safe                           = ( null !== $sgs_nm_icon_w_raw && '' !== $sgs_nm_icon_w_raw ) ? sgs_css_length_value( (string) $sgs_nm_icon_w_raw ) : '';
				$sgs_nm_icon_w_clean[ $sgs_nm_icon_tier_key ] = '' !== $sgs_nm_icon_w_safe ? $sgs_nm_icon_w_safe : null;

				$sgs_nm_icon_h_raw                            = $sgs_nm_icon_h_tiers[ $sgs_nm_icon_tier_key ] ?? null;
				$sgs_nm_icon_h_safe                           = ( null !== $sgs_nm_icon_h_raw && '' !== $sgs_nm_icon_h_raw ) ? sgs_css_length_value( (string) $sgs_nm_icon_h_raw ) : '';
				$sgs_nm_icon_h_clean[ $sgs_nm_icon_tier_key ] = '' !== $sgs_nm_icon_h_safe ? $sgs_nm_icon_h_safe : null;
			}

			$sgs_nm_resolve_icon_w = static function ( $tier ) use ( $sgs_nm_icon_w_clean ) {
				return sgs_resolve_tier( $sgs_nm_icon_w_clean, $tier, null )['value'];
			};
			$sgs_nm_resolve_icon_h = static function ( $tier ) use ( $sgs_nm_icon_h_clean ) {
				return sgs_resolve_tier( $sgs_nm_icon_h_clean, $tier, null )['value'];
			};
			$sgs_nm_icon_decl_for  = static function ( $tier ) use ( $sgs_nm_resolve_icon_w, $sgs_nm_resolve_icon_h ) {
				$sgs_nm_icon_w    = $sgs_nm_resolve_icon_w( $tier );
				$sgs_nm_icon_h    = $sgs_nm_resolve_icon_h( $tier );
				$sgs_nm_icon_decl = '';
				if ( null !== $sgs_nm_icon_w ) {
					$sgs_nm_icon_decl .= '--sgs-nbm-icon-w:' . $sgs_nm_icon_w . ';';
				}
				if ( null !== $sgs_nm_icon_h ) {
					$sgs_nm_icon_decl .= '--sgs-nbm-icon-h:' . $sgs_nm_icon_h . ';';
				}
				return $sgs_nm_icon_decl;
			};

			$sgs_nm_icon_desktop_decl = $sgs_nm_icon_decl_for( 'desktop' );
			if ( '' !== $sgs_nm_icon_desktop_decl ) {
				$css .= $sgs_nm_icon_sel . '{' . $sgs_nm_icon_desktop_decl . '}';
			}

			$sgs_nm_icon_prev_decl = $sgs_nm_icon_desktop_decl;
			foreach ( array(
				'tablet' => SGS_Breakpoints::TABLET_MAX,
				'mobile' => SGS_Breakpoints::MOBILE_MAX,
			) as $sgs_nm_icon_tier_key => $sgs_nm_icon_tier_bp ) {
				$sgs_nm_icon_tier_decl = $sgs_nm_icon_decl_for( $sgs_nm_icon_tier_key );
				if ( $sgs_nm_icon_tier_decl === $sgs_nm_icon_prev_decl ) {
					$sgs_nm_icon_prev_decl = $sgs_nm_icon_tier_decl;
					continue;
				}
				if ( '' !== $sgs_nm_icon_tier_decl ) {
					$css .= '@media (max-width:' . $sgs_nm_icon_tier_bp . 'px){' . $sgs_nm_icon_sel . '{' . $sgs_nm_icon_tier_decl . '}}';
				}

				$sgs_nm_icon_prev_decl = $sgs_nm_icon_tier_decl;
			}
		}

		/*
		 * Bar gap (burgerBarGap), per device: the space BETWEEN the default glyph's
		 * bars. The bars are 2px each (style.css) spread by space-between across the
		 * stack box, so the stack height is (bars x 2px) + (bars - 1) x gap; that is
		 * written to `--sgs-nbm-icon-h`, which every morph pose already reads. Emitted
		 * after the burgerIconHeight rule above so a set gap wins over it.
		 */
		$sgs_nm_bar_count = 2 === (int) ( $attributes['burgerBarCount'] ?? 3 ) ? 2 : 3;
		$css             .= sgs_emit_responsive_css(
			$uid_sel . ' .sgs-nav-bar-menu__burger-icon',
			array(
				array(
					'value'     => $attributes['burgerBarGap'] ?? array(),
					'css'       => '--sgs-nbm-icon-h',
					'transform' => static function ( $raw ) use ( $sgs_nm_bar_count ) {
						$gap = sgs_css_length_value( is_numeric( $raw ) ? $raw . 'px' : (string) $raw );
						return '' === $gap ? '' : 'calc(' . $sgs_nm_bar_count . ' * var(--sgs-nbm-bar-h, 2px) + ' . ( $sgs_nm_bar_count - 1 ) . ' * ' . $gap . ')';
					},
				),
			)
		);

		/*
		 * Bar thickness (burgerBarThickness) and the space between the icon and
		 * its "Menu" label (burgerTextGap), per device. The thickness is a custom
		 * property the bars, the stack height above and every morph pose read, so
		 * a 1.5px bar still meets in a clean X.
		 */
		$css .= sgs_emit_responsive_css(
			$uid_sel . ' .sgs-nav-bar-menu__burger-icon',
			array(
				array(
					'value'        => $attributes['burgerBarThickness'] ?? array(),
					'css'          => '--sgs-nbm-bar-h',
					'unit_default' => 'px',
				),
			)
		);
		$css .= sgs_emit_responsive_css(
			$burger_sel,
			array(
				array(
					'value'        => $attributes['burgerTextGap'] ?? array(),
					'css'          => 'gap',
					'unit_default' => 'px',
				),
			)
		);

		/*
		 * Menu button box: padding + corner radius per device, and the border (width
		 * box / style / colour). style.css's `.burger` sets padding:0 and border:none
		 * at (0,1,0) and a zero-specificity 8px radius; these rules carry the scope
		 * class (0,2,0) so they win. A border style is only ever written alongside a
		 * width (the G5 rule), and a 0 width still writes it (border: 0 solid).
		 */
		$css .= sgs_emit_responsive_css(
			$burger_sel,
			array(
				array(
					'value'        => $attributes['burgerPadding'] ?? array(),
					'css'          => 'padding',
					'box'          => true,
					'unit_default' => 'px',
				),
				array(
					'value'        => $attributes['burgerBorderRadius'] ?? array(),
					'css'          => 'border-radius',
					'unit_default' => 'px',
				),
			)
		);
		$burger_border_width = is_array( $attributes['burgerBorderWidth'] ?? null ) ? sgs_box_object_shorthand( $attributes['burgerBorderWidth'] ) : null;
		if ( null !== $burger_border_width && '' !== $burger_border_width ) {
			$burger_border_style  = (string) ( $attributes['burgerBorderStyle'] ?? 'solid' );
			$burger_border_style  = in_array( $burger_border_style, array( 'solid', 'dashed', 'dotted', 'double', 'none' ), true ) ? $burger_border_style : 'solid';
			$burger_border_colour = sgs_colour_value( (string) ( $attributes['burgerBorderColour'] ?? '' ) );
			$css                 .= $burger_sel . '{border-style:' . $burger_border_style . ';border-width:' . esc_attr( $burger_border_width ) . ';'
				. ( '' !== $burger_border_colour ? 'border-color:' . $burger_border_colour . ';' : '' ) . '}';
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
