<?php
/**
 * SGS Nav Bar Menu / Nav Drawer Menu — scoped CSS, part 1b: item border (+ the
 * separators call) and featured-item styling.
 *
 * Holds the two sections that are fully self-contained — no shared derived
 * state with the rest of `sgs_nav_shared_item_state_css()` beyond `$attributes`,
 * `$link_sel`, `$uid_sel` and the resolved `$t_border` treatment. The FR-41-13
 * hover-persistence rescue block lives in `nav-menu-css.php` because it reads
 * several OTHER modules' already-computed locals (`$item_text_sweep`,
 * `$item_colour_hover`, `$item_bg_hover_decl`) that this module never touches.
 *
 * ⚠ LOAD ORDER: NOT bootstrap-loaded — `require_once`'d per-instance from
 * render.php, immediately after `nav-menu-css.php` (matching that file's own
 * load-order note). Its functions are only in scope after a nav block's own
 * render.php has run at least once on that page load.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-border-style.php';
require_once __DIR__ . '/nav-menu-separators.php';

if ( ! function_exists( 'sgs_nav_shared_item_border_css' ) ) {
	/**
	 * Build the item BORDER (three states + directional Sweep band) CSS, then the
	 * lines between items (the shared Separators setting).
	 *
	 * @param array  $attributes Block attributes (verbatim render.php param).
	 * @param string $link_sel   `.{bem}__link` selector for this instance.
	 * @param string $uid_sel    This instance's CSS scope selector (`.{uid}`).
	 * @param string $t_border   RESOLVED border hover treatment ('swap'/'none'/'sweep')
	 *                           from `sgs_nav_shared_resolved_treatments()`.
	 * @return string CSS fragment (no wrapping <style> tag).
	 */
	function sgs_nav_shared_item_border_css( array $attributes, string $link_sel, string $uid_sel, string $t_border, string $bem_root ): string {
		$css = '';

		/*
		 * ── ITEM BORDER — three states + the directional Sweep band (FR-41-7/8). ─
		 *
		 * Terminology: on the horizontal bar the bottom-only
		 * default reads as the item's own UNDERLINE (a text-indicator sitting
		 * under one item's own label, not between two items); the identical
		 * bottom edge on a vertical list (this same instance rendered inside a
		 * nav-drawer, or a submenu-root stacked in-drawer) is geometrically a ROW
		 * SEPARATOR between two adjacent rows. Both read the SAME attribute
		 * family (see below).
		 *
		 * ONE border control, per-side by construction: a bottom border is the
		 * drawer-style row separator, a right border is a vertical divider on the
		 * flat bar, all four is a boxed item. ⛔ There is no separate
		 * "Item Divider" TOGGLE competing with this width/style/colour family —
		 * two mechanisms answering the SAME question (which edge does
		 * itemBorderWidth paint, and what colour) produce a double line.
		 *
		 * ⚠ The line BETWEEN item N and item N+1 is a different question from this one
		 * (style item N's own edge): it is the shared Separators setting (`separators`,
		 * includes/nav-menu-separators.php, called at the end of this function), so it
		 * never competes with this family for the same edge.
		 *
		 * Width is BASE-ONLY by the control's own design: there is no per-device
		 * border width.
		 */
		$item_border_box   = is_array( $attributes['itemBorderWidth'] ?? null ) ? $attributes['itemBorderWidth'] : array();
		$item_border_width = $item_border_box ? sgs_box_object_shorthand( $item_border_box ) : null;
		$item_border_style = sgs_border_style_keyword( $attributes['itemBorderStyle'] ?? '' );
		if ( null !== $item_border_width && '' !== $item_border_width ) {
			// A width with no style paints nothing at all, so `solid` is the shape
			// the control's own storage implies rather than a design default — an
			// operator who wants no border clears the WIDTH (or picks style `none`).
			$css .= $link_sel . '{border-width:' . $item_border_width . ';border-style:'
				. $item_border_style . ';}';
		}
		/*
		 * A border style with no width is deliberately NOT emitted on its own:
		 * `border-style:solid` with NO border-width is not "no border" — CSS falls
		 * back to the UA default `medium` width (~3px), painting a border the
		 * operator never asked for, contradicting the comment above ("clears the
		 * WIDTH" should mean no border). Style only means anything paired with a
		 * width.
		 */

		/*
		 * ⛔ Under `sweep` the band OWNS every non-resting colour on the bottom edge.
		 * Without the suppression the shared painter repaints a real border on the
		 * BORDER box directly beneath the band on the PADDING box — two visible
		 * horizontal lines, one un-asked-for. That is prevented by the shared
		 * helper's `suppress_edges` parameter, called ONCE and
		 * normally. ⛔ No block-private `border-bottom-color` override sits alongside
		 * it: two overlapping fixes are unfalsifiable, so neither could ever be
		 * safely removed.
		 *
		 * ⛔ When the treatment is NOT `sweep`, NO `suppress_edges` key is passed at
		 * all — not an empty array, not all-false. The absent key is what keeps the
		 * emission identical to the non-sweep case (the helper emits the flat
		 * `border-color` shorthand, not per-edge longhands).
		 */
		$item_border_map = array(
			'base'    => 'itemBorderColour',
			'hover'   => 'itemBorderColourHover',
			'current' => 'itemBorderColourCurrent',
		);
		if ( 'none' === $t_border ) {
			unset( $item_border_map['hover'] );
		}
		if ( 'sweep' === $t_border ) {
			$item_border_map['suppress_edges'] = array( 'bottom' => true );
		}
		$css .= sgs_border_states_css( $link_sel, $attributes, $item_border_map );

		if ( 'sweep' === $t_border ) {
			$sweep_edge   = isset( $item_border_box['bottom'] ) ? sgs_css_length_value( (string) $item_border_box['bottom'] ) : '';
			$sweep_hover  = sgs_colour_value( (string) ( $attributes['itemBorderColourHover'] ?? '' ) );
			$sweep_normal = sgs_colour_value( (string) ( $attributes['itemBorderColour'] ?? '' ) );
			if ( '' === $sweep_normal ) {
				$sweep_normal = 'currentColor';
			}
			/*
			 * ⚠ A sweep with no bottom border width emits NOTHING — there is no line
			 * to sweep. Same for a sweep with no Hover colour: Sweep reuses the row's
			 * own Hover swatch (§0's colour-reuse rule) and has no second colour of
			 * its own, so an empty swatch means there is genuinely nothing to travel
			 * to. ⛔ No colour is invented here — that would be a hardcoded render
			 * default the operator could not clear.
			 */
			if ( '' !== $sweep_edge && '' !== $sweep_hover ) {
				/*
				 * `bottom:0` on an absolutely-positioned child resolves against the
				 * containing block's PADDING box while a real border-bottom paints on
				 * the BORDER box, so the band is offset outward by exactly the border
				 * width to land on the strip the transparent border vacates. That, plus
				 * `border-bottom-color:transparent`, is what makes ONE painted line
				 * provably occupy where the border would have been.
				 *
				 * `position:relative` is emitted here too: the item-background branch
				 * above only fires when a fill is set, so a sweep with no background
				 * would otherwise have no positioned ancestor. When both fire the two
				 * rules sit on the same selector with compatible declarations —
				 * harmless duplication, not a conflict.
				 */
				$css .= $link_sel . '{position:relative;border-bottom-color:transparent;}';

				/*
				 * Directional sweep (FR-41-37) — `sgs_directional_sweep_css()`
				 * (includes/sweep-css.php), an angle-driven primitive. `sweepAngle` is
				 * standard CSS gradient-angle degrees (AnglePickerControl
				 * convention); 90deg is left-to-right and 270deg right-to-left (see
				 * the helper's own docblock).
				 *
				 * ⚠ `borderHoverAnimationDirection` is not a declared attribute, so
				 * the framework never emits it as a client-settable value. This line
				 * reads it DEFENSIVELY off the raw $attributes array only — WordPress
				 * does not strip an undeclared key from an already-serialised block's
				 * parsed attrs before render.php runs — so a post saved with it still
				 * renders its chosen direction rather than resetting to the
				 * sweepAngle default. `sweepAngle` carries its block.json default (90)
				 * on such a post; only when the value is explicitly `right-to-left`
				 * do we derive 270 instead.
				 */
				$sweep_angle = isset( $attributes['sweepAngle'] ) ? (float) $attributes['sweepAngle'] : 90.0;
				if ( ! isset( $attributes['sweepAngle'] ) && 'right-to-left' === (string) ( $attributes['borderHoverAnimationDirection'] ?? 'left-to-right' ) ) {
					$sweep_angle = 270.0;
				}
				$sweep = sgs_directional_sweep_css( $sweep_angle, $sweep_normal, $sweep_hover );

				$css .= $link_sel . '::after{content:"";position:absolute;inset-inline:0;'
					. 'bottom:calc(-1 * ' . $sweep_edge . ');height:' . $sweep_edge . ';'
					. 'background-image:' . $sweep['gradient'] . ';'
					. 'background-size:' . $sweep['background_size'] . ';background-position:' . $sweep['rest_position'] . ';background-repeat:no-repeat;'
					. 'transition:background-position 300ms ease;pointer-events:none;}';
				$css .= sgs_hover_state_rules( $link_sel, 'background-position:' . $sweep['hover_position'], ':focus-visible', '::after' );
				// MANDATORY companion: keep both end states, drop only the travel.
				$css .= '@media (prefers-reduced-motion:reduce){' . $link_sel . '::after{transition:none;}}';
			}
		}

		// The lines between items (top-level items and submenu rows) are the shared
		// Separators setting: includes/nav-menu-separators.php.
		$css .= sgs_nav_menu_separators_css( $attributes, $uid_sel, $bem_root );

		return $css;
	}
}

if ( ! function_exists( 'sgs_nav_shared_featured_css' ) ) {
	/**
	 * Build the featured-item (FR-36-4) styling: LABEL or PILL resting form,
	 * the republished `--sgs-nm-featured-*` custom properties a featured
	 * submenu row inherits, and the featured Hover state.
	 *
	 * @param array  $attributes Block attributes (verbatim render.php param).
	 * @param string $uid_sel    This instance's CSS scope selector (`.{uid}`).
	 * @return string CSS fragment (no wrapping <style> tag).
	 */
	function sgs_nav_shared_featured_css( array $attributes, string $uid_sel, string $bem_root ): string {
		$css = '';

		/*
		 * Shape + motion come from ATTRIBUTES and theme TOKENS, never literals —
		 * same rationale as `nav-menu-css.php`'s own `$transition_fast` (the pill
		 * hover transition below reuses that identical token/fallback pair).
		 */
		$transition_fast = 'var(--wp--custom--transition--fast, 150ms ease)';

		/*
		 * 4d. Featured items (FR-36-4). Two forms, both operator-set:
		 *
		 * LABEL form (featuredBg unset) — the accent-coloured label, the default.
		 *
		 * PILL form (featuredBg set) — a filled pill, which is what a draft typically
		 * authors a "featured" nav item as (`background:var(--primary)` +
		 * `color:var(--text)` + weight 600 on the base link's 8px radius). Without a
		 * background attribute the draft's fill would be dropped, leaving
		 * accent-on-surface text at low contrast.
		 *
		 * The pill's foreground is contrast-checked against the resolved fill by the
		 * same shared helper the hover pill uses (4c): the operator's chosen colour
		 * wins when it clears AA, else the guaranteed-safe binary fallback, so a
		 * draft's own pairing is adopted verbatim when it passes.
		 */
		$featured_sel    = $uid_sel . ' .' . $bem_root . '__item--featured .' . $bem_root . '__link';
		$featured_colour = isset( $attributes['featuredColour'] ) && '' !== $attributes['featuredColour']
			? (string) $attributes['featuredColour']
			: 'accent';
		// featuredColourGradient is the gradient sibling (mirrors burgerColourGradient)
		// -- resting LABEL form only (no featured_bg). Gradient wins when
		// set+valid.
		$featured_colour_gradient  = isset( $attributes['featuredColourGradient'] ) ? (string) $attributes['featuredColourGradient'] : '';
		$featured_colour_effective = sgs_resolve_text_colour_or_gradient( $featured_colour, $featured_colour_gradient );
		// featuredBg is a palette slug or any CSS colour: painted through
		// sgs_colour_value() (a slug stays a live palette var), resolved to a hex
		// only for the contrast maths.
		$featured_bg_raw   = isset( $attributes['featuredBg'] ) ? trim( (string) $attributes['featuredBg'] ) : '';
		$featured_bg_paint = sgs_colour_value( $featured_bg_raw );
		$featured_bg_hex   = sgs_colour_hex_for_contrast( $featured_bg_raw );
		// Gradient wins over the flat colour when set+valid.
		$featured_bg_gradient = sgs_css_gradient_value( $attributes['featuredBgGradient'] ?? '' );
		$featured_bg_active   = ( '' !== $featured_bg_paint ) || ( '' !== $featured_bg_gradient );

		$featured_radius       = isset( $attributes['featuredRadius'] ) ? (float) $attributes['featuredRadius'] : 8;
		$featured_radius_hover = isset( $attributes['featuredRadiusHover'] ) && null !== $attributes['featuredRadiusHover']
			? (float) $attributes['featuredRadiusHover']
			: $featured_radius;
		$featured_weight       = isset( $attributes['featuredFontWeight'] ) ? (int) $attributes['featuredFontWeight'] : 600;
		$featured_weight_hover = isset( $attributes['featuredFontWeightHover'] ) && null !== $attributes['featuredFontWeightHover']
			? (int) $attributes['featuredFontWeightHover']
			: $featured_weight;

		$featured_fg = '';
		if ( $featured_bg_active ) {
			$featured_bg_decl = sgs_background_paint_decl( $featured_bg_raw, $featured_bg_gradient );
			// No single hex (a gradient, or a colour with no hex form): no contrast maths.
			if ( '' !== $featured_bg_gradient || '' === $featured_bg_hex ) {
				// A gradient has no single colour to run WCAG contrast maths against
				// (sgs_wcag_preferred_text_colour_for_bg() takes ONE background hex)
				// -- skip the computation and use the operator's own FLAT
				// featuredColour choice instead. Deliberately NOT
				// $featured_colour_effective (the gradient-capable resolve): a text
				// gradient paints via background-image+background-clip:text on this
				// SAME selector, which would collide with the pill's own
				// background-image gradient set here -- the identical precondition
				// failure already documented for the flat-hex pill form
				// (featuredColourGradient's block.json note, textSharesElementWithBackground()).
				$featured_fg = sgs_colour_value( $featured_colour );
			} else {
				$preferred_fg = sgs_colour_hex_for_contrast( $featured_colour );
				$featured_fg  = sgs_wcag_preferred_text_colour_for_bg( $featured_bg_hex, $preferred_fg );
			}
			$css .= $featured_sel . '{' . $featured_bg_decl
				. ( '' !== $featured_fg ? ';color:' . esc_attr( $featured_fg ) : '' )
				. ';font-weight:' . esc_attr( (string) $featured_weight )
				. ';border-radius:' . esc_attr( (string) $featured_radius ) . 'px;}';
		} else {
			$featured_colour_decl = sgs_text_colour_decl( $featured_colour_effective );
			if ( '' !== $featured_colour_decl ) {
				$css .= $featured_sel . '{' . $featured_colour_decl . ';font-weight:' . esc_attr( (string) $featured_weight ) . ';}';
			}
			$css .= sgs_text_colour_gradient_fallback_rule( $featured_sel, $featured_colour_effective );
		}

		/*
		 * Republish the RESOLVED featured values as custom properties so a featured
		 * SUBMENU item inherits exactly what the featured bar item uses (a priority
		 * item must look like itself wherever it appears, bar or burger drawer).
		 *
		 * Deliberately reuses the values computed ABOVE rather than re-reading the
		 * attributes: `$featured_fg` comes from sgs_wcag_preferred_text_colour_for_bg(),
		 * which picks a foreground that actually passes contrast against the chosen
		 * background. Re-deriving it here would risk a second, less accessible answer
		 * for the same setting.
		 */
		$sgs_nm_featured_vars = '--sgs-nm-featured-weight:' . (int) $featured_weight . ';';
		if ( '' !== $featured_bg_paint ) {
			// PILL form — carry the WCAG-resolved foreground computed above, verbatim.
			$sgs_nm_featured_vars .= '--sgs-nm-featured-bg:' . $featured_bg_paint . ';'
				. '--sgs-nm-featured-colour:' . $featured_fg . ';'
				. '--sgs-nm-featured-radius:' . (float) $featured_radius . 'px;';
		} elseif ( '' !== $featured_colour ) {
			// LABEL form — no background was chosen, so the submenu row stays
			// transparent rather than inventing a pill the bar itself does not have.
			//
			// Deliberately flat-only (featuredColourGradient is NOT read here). The
			// consumer of --sgs-nm-featured-colour, render.php's
			// `.{bem}__subitem--featured .{bem}__sublink` rule, paints
			// BOTH `color:var(--sgs-nm-featured-colour,…)` AND
			// `background:var(--sgs-nm-featured-bg,…)` on the SAME selector, so
			// background-clip:text would clip that background paint too --
			// textSharesElementWithBackground() precondition failure (see
			// .claude/rules/colour-emission.md "Colour EMISSION helpers" + submenuColourGradient's block.json
			// note for the identical precedent on this same file's sublink element).
			// Supporting it needs the submenu featured background moved onto its own
			// ::after layer (sgs_block_background_layer_css()) first.
			$sgs_nm_featured_vars .= '--sgs-nm-featured-colour:' . sgs_colour_value( $featured_colour ) . ';'
				. '--sgs-nm-featured-bg:transparent;';
		}
		$css .= $uid_sel . '{' . $sgs_nm_featured_vars . '}';

		/*
		 * 4d-ii. Featured HOVER state. The featured item is the one nav item an
		 * operator most wants to stand out (it is usually the "Order now" / "Book"
		 * call to action). It carries its own Normal|Hover pair for both text and
		 * background, resolved by the same contrast helper as the resting state so
		 * the operator's colour wins whenever it is readable.
		 */
		$featured_bg_hover       = isset( $attributes['featuredBgHover'] ) ? trim( (string) $attributes['featuredBgHover'] ) : '';
		$featured_bg_hover_paint = sgs_colour_value( $featured_bg_hover );
		$featured_bg_hover_hex   = sgs_colour_hex_for_contrast( $featured_bg_hover );
		$featured_fg_hover     = isset( $attributes['featuredColourHover'] ) ? (string) $attributes['featuredColourHover'] : '';
		// Gradient sibling, mirrors featuredBgGradient above. Gradient wins
		// over the flat featuredBgHover colour when set+valid.
		$featured_bg_hover_gradient = sgs_css_gradient_value( $attributes['featuredBgHoverGradient'] ?? '' );
		$featured_bg_hover_active   = ( '' !== $featured_bg_hover_paint ) || ( '' !== $featured_bg_hover_gradient );

		if ( $featured_bg_hover_active ) {
			$featured_bg_hover_decl = sgs_background_paint_decl( $featured_bg_hover, $featured_bg_hover_gradient );
			if ( '' !== $featured_bg_hover_gradient || '' === $featured_bg_hover_hex ) {
				// Same WCAG-skip rationale as the resting pill above -- a gradient
				// has no single hex to contrast-check. Use the operator's own flat
				// featuredColourHover choice, falling back to the resting flat
				// featuredColour, rather than computing WCAG contrast against a
				// gradient.
				$featured_fg_h = sgs_colour_value( '' !== $featured_fg_hover ? $featured_fg_hover : $featured_colour );
			} else {
				$preferred_hover = sgs_colour_hex_for_contrast( $featured_fg_hover );
				$featured_fg_h   = '' !== $preferred_hover
					? sgs_wcag_preferred_text_colour_for_bg( $featured_bg_hover_hex, $preferred_hover )
					: sgs_wcag_text_colour_for_bg( $featured_bg_hover_hex );
			}
			$css .= sgs_hover_state_rules(
				$featured_sel,
				$featured_bg_hover_decl . ( '' !== $featured_fg_h ? ';color:' . esc_attr( $featured_fg_h ) : '' ) . ';transition:background-color ' . $transition_fast . ',color ' . $transition_fast,
				':focus-visible'
			);
		} elseif ( '' !== $featured_fg_hover ) {
			$css .= sgs_hover_state_rules( $featured_sel, 'color:' . sgs_colour_value( $featured_fg_hover ) . ';transition:color ' . $transition_fast, ':focus-visible' );
		}

		// Featured pill SHAPE on hover — emitted only when it differs from the resting
		// shape, so an unset hover control adds no rule at all rather than a no-op one.
		if ( $featured_radius_hover !== $featured_radius ) {
			$css .= sgs_hover_state_rules( $featured_sel, 'border-radius:' . esc_attr( (string) $featured_radius_hover ) . 'px;transition:border-radius ' . $transition_fast, ':focus-visible' );
		}
		if ( $featured_weight_hover !== $featured_weight ) {
			$css .= sgs_hover_state_rules( $featured_sel, 'font-weight:' . esc_attr( (string) $featured_weight_hover ), ':focus-visible' );
		}

		/*
		 * ⛔ The featured item's `::after` is deliberately left alone: a
		 * `{featured_sel}::after{content:none;}` suppression rule weighs (0,3,1)
		 * against the border sweep's band at (0,2,1), so it would WIN and the sweep
		 * would silently not render on a featured item. A suppression rule is
		 * exactly the silent override `check-hardcoded-render-defaults.js` F3b exists
		 * to catch; featured items take the sweep like every other item (project
		 * rule 3, no carve-outs).
		 */

		return $css;
	}
}
