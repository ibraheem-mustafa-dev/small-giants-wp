<?php
/**
 * SGS Nav Menu (sgs/nav-menu) — scoped CSS, part 1: item/state colour, border,
 * treatments + featured sweep.
 *
 * Split out of render.php (Spec 41 step 8) — item typography, nav container
 * colour, the item text / background / border THREE-STATE emission (Normal,
 * Hover, Current) with its paired hover treatments (None / Swap / Sweep /
 * Highlight, Spec 41 FR-41-23), and the featured-item styling.
 *
 * ⚠ The Sweep eligibility predicate, the treatment resolution and the shared
 * glyph-sweep emitter are NOT here — they live in
 * `includes/nav-menu-treatments.php`, because the trigger and submenu modules
 * consume them too. This module reads the RESOLVED treatment it is handed and
 * never re-derives it.
 *
 * ⚠ LOAD ORDER: NOT bootstrap-loaded — `require_once`'d per-instance from
 * render.php, matching product-card's pattern. Its function is only in scope
 * after nav-menu's own render.php has run at least once on that page load.
 * Fine today; a future cross-block call needs this file required first.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_menu_item_state_css' ) ) {
	/**
	 * Build the item/state-colour half of nav-menu's scoped <style>.
	 *
	 * @param array  $attributes Block attributes (verbatim render.php param).
	 * @param string $uid_sel    This instance's CSS scope selector (`.{uid}`).
	 * @param array  $treatments RESOLVED hover treatments from
	 *                           `sgs_nav_menu_resolved_treatments()` — ⛔ never the
	 *                           stored attribute, which can say 'sweep' on a row
	 *                           whose eligibility predicate is false.
	 * @return string CSS fragment (no wrapping <style> tag).
	 */
	function sgs_nav_menu_item_state_css( array $attributes, string $uid_sel, array $treatments = array() ): string {
	$css      = '';
	$link_sel = $uid_sel . ' .sgs-nav-menu__link';

	// ⛔ The RESOLVED treatment, never the stored attribute. render.php resolves
	// it once (sgs_nav_menu_resolved_treatments()) immediately after the
	// eligibility evaluation; every rule below reads THAT value.
	$t_text   = (string) ( $treatments['itemColourHoverTreatment'] ?? 'swap' );
	$t_bg     = (string) ( $treatments['itemBgHoverTreatment'] ?? 'swap' );
	$t_border = (string) ( $treatments['itemBorderHoverTreatment'] ?? 'swap' );

	// 4a. Item typography — flat scalar model, shared helper (matches
	// TypographyControls' attribute contract: {prefix}FontSize/Unit/Tablet/Mobile).
	$css .= sgs_typography_css_rule( $attributes, 'item', $link_sel );

	/*
	 * 4a-ii. Nav CONTAINER appearance.
	 *
	 * Every value is emitted ONLY when the operator has set it, so an untouched
	 * nav is byte-identical to before. `$uid_sel` targets the <nav> root itself
	 * (SGS_Container_Wrapper renders it with 'tag' => 'nav').
	 *
	 * This is also what makes drawer styling self-serve: the drawer holds its
	 * OWN sgs/nav-menu instance with its own uid, so setting a background here
	 * on the drawer's copy styles ONLY the drawer — no per-context plumbing.
	 */
	$nav_bg       = isset( $attributes['navBg'] ) ? (string) $attributes['navBg'] : '';
	$nav_bg_gradient = sgs_css_gradient_value( $attributes['navBgGradient'] ?? '' );
	$nav_colour   = isset( $attributes['navColour'] ) ? (string) $attributes['navColour'] : '';
	// D956 -- sibling gradient wins when set+valid. Safe unconditionally: navBg
	// already lives on a SEPARATE `::after` layer below, never $uid_sel itself.
	$nav_colour_gradient  = isset( $attributes['navColourGradient'] ) ? (string) $attributes['navColourGradient'] : '';
	$nav_colour_effective = sgs_resolve_text_colour_or_gradient( $nav_colour, $nav_colour_gradient );
	$nav_bg_hover = isset( $attributes['navBgHover'] ) ? (string) $attributes['navBgHover'] : '';
	
	// bg_layer=true equivalent (D940 batch): background moves onto a `::after`
	// layer so `navColour` is free of a same-selector background for a future
	// navColourGradient sibling. $uid_sel is not positioned in style.css, so the
	// full helper (position:relative + isolation:isolate) is safe here.
	$nav_bg_decl       = sgs_background_paint_decl( $nav_bg, $nav_bg_gradient );
	$nav_bg_hover_decl = '' !== $nav_bg_hover ? 'background-color:' . sgs_colour_value( $nav_bg_hover ) : '';
	if ( '' !== $nav_bg_decl || '' !== $nav_bg_hover_decl ) {
		$css .= sgs_block_background_layer_css( $uid_sel, $nav_bg_decl, $nav_bg_hover_decl );
	}
	if ( '' !== $nav_colour_effective ) {
		$nav_colour_decl = sgs_text_colour_decl( $nav_colour_effective );
		if ( '' !== $nav_colour_decl ) {
			$css .= $uid_sel . '{' . $nav_colour_decl . ';}';
		}
		$css .= sgs_text_colour_gradient_fallback_rule( $uid_sel, $nav_colour_effective );
	}
	if ( '' !== ( $attributes['navColourHover'] ?? '' ) ) {
		$css .= sgs_hover_state_rules( "{$uid_sel}", "color:" . sgs_colour_value( $attributes['navColourHover'] ), ':focus-visible' );
	}
	
	// 4b. Item colours (resting). Base is `inherit` in style.css; an unset slug
	// leaves the surrounding context's colour untouched (header/footer agnostic).
	// Text and background are SEPARATE properties, each with its own Normal/Hover
	// state (Spec 35 element-first): the pre-2026-07-20 model paired resting TEXT
	// against hover BACKGROUND in one toggle, so an operator could never set a
	// hover text colour at all — it was auto-computed and unreachable.
	// Resolves EITHER a palette slug OR a raw CSS colour (hex/rgb/hsl/…) to an
	// actual computable hex. Used ONLY for WCAG smart-contrast maths below —
	// never for the paint declaration itself (see $item_bg_hex vs $item_bg_raw
	// split further down): `sgs_resolve_palette_hex()` alone silently returns
	// '' for a raw hex (it is a slug-only lookup), which is why a client-chosen
	// custom colour (not a theme swatch) made `itemSmartContrast` a no-op —
	// $bg_hex/$preferred_hex both resolved empty and `$smart_fg()` returned the
	// input unchanged (G16(c)).
	$sgs_nm_hex = static function ( $raw ): string {
		$raw = (string) $raw;
		if ( '' === $raw ) {
			return '';
		}
		if ( sgs_is_css_colour( $raw ) ) {
			return sgs_functional_colour_to_hex( $raw );
		}
		return (string) sgs_resolve_palette_hex( sanitize_html_class( $raw ), '' );
	};
	$item_colour = isset( $attributes['itemColour'] ) ? (string) $attributes['itemColour'] : '';
	// D956 -- sibling gradient wins when set+valid. Safe unconditionally: itemBg
	// (below) paints on a `::before` layer, never $link_sel itself (D942 recipe
	// item 1's own comment at the itemBg block explains why ::after was unusable
	// here). The Hover text colour is NOT wired to a gradient sibling:
	// `itemSmartContrast` resolves it for WCAG contrast against the Hover fill,
	// which a client-chosen gradient cannot meaningfully replace -- and it is
	// also condition 2's blocking input for the text Sweep (FR-41-26).
	$item_colour_gradient  = isset( $attributes['itemColourGradient'] ) ? (string) $attributes['itemColourGradient'] : '';
	$item_colour_effective = sgs_resolve_text_colour_or_gradient( $item_colour, $item_colour_gradient );
	// RAW attribute value, never resolved to a literal hex — a slug flows
	// through sgs_background_paint_decl() -> sgs_colour_value() as a live
	// var(--wp--preset--color--{slug}) reference, so a later theme recolour
	// picks it up. Resolving to hex here would bake today's swatch in
	// permanently (the "tokens not literals" rule this file's own docblock
	// states at the top of the SHAPE section above).
	$item_bg_raw      = isset( $attributes['itemBg'] ) ? (string) $attributes['itemBg'] : '';
	$item_bg_gradient = sgs_css_gradient_value( $attributes['itemBgGradient'] ?? '' );

	/*
	 * Shape + motion come from ATTRIBUTES and theme TOKENS, never literals. The
	 * pre-2026-07-20 code hardcoded `border-radius:8px` on both pills, `font-weight:600`
	 * on the featured item and `.15s ease` on every transition — each of which bypasses
	 * a token theme.json already ships (--wp--custom--border-radius--medium,
	 * --wp--custom--transition--fast), so a client changing their theme's radius or
	 * motion scale saw the nav ignore it. Literal fallbacks are kept inside var() so
	 * the block still renders correctly on a non-SGS theme (the standalone-framework rule).
	 */
	$transition_fast = 'var(--wp--custom--transition--fast, 150ms ease)';
	
	/*
	 * ── Item SHAPE — `itemBorderRadius` (FR-41-7 / FR-41-33). ────────────────
	 *
	 * A CORNER-keyed box object ({topLeft,topRight,bottomRight,bottomLeft}),
	 * read through `sgs_corner_object_shorthand()` — NOT the side-keyed helper.
	 * It replaces the retired flat `itemRadius`/`itemRadiusHover` scalars: radius
	 * rides `SgsBorderControl`'s own radius pair, and there is no hover radius
	 * (the control has no state axis for shape).
	 *
	 * ⛔ NOT emitted here — the pre-0.4.6 behaviour (§8.4, G13 scenario 4) only
	 * ever rounded corners "in the one case where the radius is visible": when
	 * the item has a background to clip. An item with no background renders no
	 * `border-radius` rule at all, default-8px or not. The shorthand is computed
	 * here (so it is available before the background branch needs it) but
	 * EMITTED further down, gated on the same background-presence condition the
	 * `::before` fill branch already checks — see `$item_radius_shorthand` use
	 * below.
	 */
	$item_radius_shorthand = sgs_corner_object_shorthand( $attributes['itemBorderRadius'] ?? null );

	/*
	 * ── ITEM TEXT — three states (FR-41-3 / FR-41-23). ───────────────────────
	 *
	 * `itemSmartContrast` (FR-41-5) is the pill branch's one genuinely unique
	 * behaviour, preserved as a toggle rather than a hardcoded side effect. When
	 * ON and the operator has set a Hover or Current BACKGROUND, the matching
	 * foreground resolves through the EXISTING shared WCAG helpers — the same two
	 * the retired pill branch called, and the same two the featured pill and
	 * sgs/nav-drawer already use. ⛔ No new contrast function is built.
	 *
	 * ⚠ Case two means an explicit colour does not always win: the operator's
	 * choice is kept whenever it clears AA against the resolved fill, and falls
	 * back to the guaranteed-safe binary only when it does not. That is the
	 * shipped behaviour being preserved. An operator who wants their unreadable
	 * colour rendered as-is switches the toggle off; that is what it is for.
	 */
	// RAW values feed the paint declaration (see $item_bg_raw's comment above);
	// the _hex siblings are resolved ONLY for the WCAG maths below — luminance
	// cannot be computed against a var() reference.
	$item_bg_hover_raw        = isset( $attributes['itemBgHover'] ) ? (string) $attributes['itemBgHover'] : '';
	$item_bg_current_raw      = isset( $attributes['itemBgCurrent'] ) ? (string) $attributes['itemBgCurrent'] : '';
	$item_bg_hover_hex        = $sgs_nm_hex( $item_bg_hover_raw );
	$item_bg_current_hex      = $sgs_nm_hex( $item_bg_current_raw );
	$item_bg_hover_gradient   = sgs_css_gradient_value( $attributes['itemBgHoverGradient'] ?? '' );
	$item_bg_current_gradient = sgs_css_gradient_value( $attributes['itemBgCurrentGradient'] ?? '' );

	$item_colour_hover   = isset( $attributes['itemColourHover'] ) ? (string) $attributes['itemColourHover'] : '';
	$item_colour_current = isset( $attributes['itemColourCurrent'] ) ? (string) $attributes['itemColourCurrent'] : '';

	$smart_contrast = ! isset( $attributes['itemSmartContrast'] ) || (bool) $attributes['itemSmartContrast'];
	if ( $smart_contrast ) {
		// $sgs_nm_hex handles a slug OR a raw CSS colour for $preferred too —
		// the same G16(c) gap applied here: a client-chosen custom hex text
		// colour previously fell straight to the "unresolved" branch below and
		// was silently discarded even when it cleared AA.
		$smart_fg = static function ( string $bg_hex, string $preferred ) use ( $sgs_nm_hex ): string {
			if ( '' === $bg_hex ) {
				return $preferred;
			}
			$preferred_hex = $sgs_nm_hex( $preferred );
			return '' !== $preferred_hex
				? (string) sgs_wcag_preferred_text_colour_for_bg( $bg_hex, $preferred_hex )
				: (string) sgs_wcag_text_colour_for_bg( $bg_hex );
		};
		$item_colour_hover   = $smart_fg( $item_bg_hover_hex, $item_colour_hover );
		$item_colour_current = $smart_fg( $item_bg_current_hex, $item_colour_current );
	}

	// Passed to the block-private typography-hover emitter so a hover
	// text-decoration travels WITH the swept glyphs (FR-41-26) — '' on every
	// non-sweep row, because on a resolved 'swap' `text-decoration-color`
	// already follows the instant colour change for free through currentColor.
	$item_sweep_hover = '';

	$item_text_sweep = array(
		'base'  => '',
		'hover' => '',
	);
	if ( 'sweep' === $t_text && '' !== $item_colour_hover ) {
		$item_sweep_hover = sgs_colour_value( $item_colour_hover );
		$item_text_sweep  = sgs_nav_menu_text_sweep_css(
			$link_sel,
			'' !== $item_colour ? sgs_colour_value( $item_colour ) : '',
			$item_sweep_hover
		);
	}

	if ( '' !== $item_text_sweep['base'] ) {
		$css .= $item_text_sweep['base'];
	} elseif ( '' !== $item_colour_effective ) {
		$item_colour_decl = sgs_text_colour_decl( $item_colour_effective );
		if ( '' !== $item_colour_decl ) {
			$css .= $link_sel . '{' . $item_colour_decl . ';}';
		}
		$css .= sgs_text_colour_gradient_fallback_rule( $link_sel, $item_colour_effective );
	}

	// ⛔ Current BEFORE Hover, and never guarded — it is not pointer-dependent.
	// Both states differ from the base by one single-specificity suffix, so the
	// pair always ties and source order is the only tie-breaker: hover wins when
	// you point at the item for the page you are already on.
	if ( '' !== $item_colour_current ) {
		$css .= $link_sel . '[aria-current="page"]{color:' . sgs_colour_value( $item_colour_current ) . ';}';
	}

	if ( '' !== $item_text_sweep['hover'] ) {
		$css .= $item_text_sweep['hover'];
	} elseif ( 'none' !== $t_text && '' !== $item_colour_hover ) {
		$css .= sgs_hover_state_rules( $link_sel, 'color:' . sgs_colour_value( $item_colour_hover ), ':focus-visible' );
	}

	// FR-41-6 — the Current-state weight, under the NEVER-LIGHTER rule. An
	// operator who bolds the whole menu would otherwise see the current page
	// render LIGHTER than every other item: a signal pointing the wrong way. An
	// empty itemFontWeight (the shipped default) casts to 0, so the default
	// "600" always emits and today's output is preserved byte-for-byte.
	$item_weight_current = (int) ( $attributes['itemFontWeightCurrent'] ?? 0 );
	if ( $item_weight_current > (int) ( $attributes['itemFontWeight'] ?? 0 ) ) {
		$css .= $uid_sel . ' .sgs-nav-menu__link[aria-current="page"],'
			. $uid_sel . ' .sgs-nav-menu__sublink[aria-current="page"]{font-weight:' . $item_weight_current . ';}';
	}

	$css .= sgs_nav_menu_typography_hover_rule( $attributes, 'item', $link_sel, $item_sweep_hover );

	/*
	 * ── ITEM BACKGROUND — ALL THREE fills on `{link}::before` (FR-41-23). ────
	 *
	 * ⛔ No state's fill is emitted onto `.sgs-nav-menu__link` itself. If any of
	 * them landed there, the item TEXT row's
	 * Sweep would clip the operator's hover fill to the shape of the letters —
	 * the exact defect class FR-41-26's eligibility section exists to prevent,
	 * arriving through the front door. `{link}::before` is contested by nothing:
	 * the border-sweep band owns `::after`, and the text sweep claims no
	 * pseudo-element at all.
	 *
	 * ⚠ `position:relative;isolation:isolate` is emitted whenever ANY of the
	 * three fills is set, not only the resting one — a Hover-only fill would
	 * otherwise get a `::before` with no positioned ancestor and no stacking
	 * context.
	 *
	 * FR-41-14/FR-41-25: under `highlight` the shared sliding pill is the ONE
	 * background shape for both non-resting states, so the per-item hover and
	 * current fills are skipped. Per-STATE, never per-row — the Normal fill (the
	 * pill does not replace it) and the Hover swatch (the pill is PAINTED in it)
	 * both survive. The stored `itemBgCurrent` is not cleared.
	 */
	$item_bg_normal_decl  = sgs_background_paint_decl( $item_bg_raw, $item_bg_gradient );
	$item_bg_hover_decl   = ( 'highlight' === $t_bg || 'none' === $t_bg )
		? ''
		: sgs_background_paint_decl( $item_bg_hover_raw, $item_bg_hover_gradient );
	$item_bg_current_decl = 'highlight' === $t_bg
		? ''
		: sgs_background_paint_decl( $item_bg_current_raw, $item_bg_current_gradient );

	if ( '' !== $item_bg_normal_decl || '' !== $item_bg_hover_decl || '' !== $item_bg_current_decl ) {
		// Radius only ever rounds a VISIBLE fill (G13 scenario 4) — emitted here,
		// alongside the background branch it exists for, not unconditionally.
		if ( null !== $item_radius_shorthand && '' !== $item_radius_shorthand ) {
			$css .= $link_sel . '{border-radius:' . $item_radius_shorthand . ';}';
		}
		/*
		 * D942 recipe item 1 (`itemColour`): `itemColour`'s `color:` and
		 * `itemBg`'s `background-color:` used to paint the SAME selector
		 * ($link_sel) — a same-selector text/background collision that would
		 * block a future `itemColourGradient` sibling from using
		 * `background-clip:text` (it clips the element's whole background
		 * paint area, not just this declaration). The usual fix is
		 * `sgs_block_background_layer_css()`, which moves the paint onto a
		 * `::after` layer, but `::after` was taken at the time. `::before` was
		 * free, so the background moved there instead (same shape,
		 * hand-composed for the free slot). ⚠ `::after` is free again now that
		 * the underline bar is retired — the background deliberately STAYS on
		 * `::before` (moving it would be churn with no benefit), and the border
		 * sweep band claims `::after` instead.
		 */
		$css .= $link_sel . '{position:relative;isolation:isolate;}';
		$css .= $link_sel . '::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;'
			. $item_bg_normal_decl . ';}';
		// Current before Hover, same tie-breaker rule as the text row above.
		if ( '' !== $item_bg_current_decl ) {
			$css .= $link_sel . '[aria-current="page"]::before{' . $item_bg_current_decl . ';}';
		}
		if ( '' !== $item_bg_hover_decl ) {
			$css .= sgs_hover_state_rules( $link_sel, $item_bg_hover_decl, ':focus-visible', '::before' );
		}
	}
	
	/*
	 * ── ITEM BORDER — three states + the directional Sweep band (FR-41-7/8). ─
	 *
	 * ONE border control, per-side by construction: a bottom border is the
	 * drawer-style row separator, a right border is the flat bar's vertical
	 * divider, all four is a boxed item. ⛔ There is no separate "Item Divider"
	 * mechanism — two mechanisms answering one question is how the pre-existing
	 * double-line bug happened.
	 *
	 * Width is BASE-ONLY by the control's own design: per-device border width was
	 * cancelled framework-wide (Bean, 2026-08-29), not deferred.
	 */
	$item_border_box   = is_array( $attributes['itemBorderWidth'] ?? null ) ? $attributes['itemBorderWidth'] : array();
	$item_border_width = $item_border_box ? sgs_box_object_shorthand( $item_border_box ) : null;
	$item_border_style = sgs_css_keyword_sanitise( $attributes['itemBorderStyle'] ?? '' );
	if ( null !== $item_border_width && '' !== $item_border_width ) {
		// A width with no style paints nothing at all, so `solid` is the shape
		// the control's own storage implies rather than a design default — an
		// operator who wants no border clears the WIDTH (or picks style `none`).
		$css .= $link_sel . '{border-width:' . $item_border_width . ';border-style:'
			. ( '' !== $item_border_style ? $item_border_style : 'solid' ) . ';}';
	} elseif ( '' !== $item_border_style ) {
		$css .= $link_sel . '{border-style:' . $item_border_style . ';}';
	}

	/*
	 * ⛔ Under `sweep` the band OWNS every non-resting colour on the bottom edge.
	 * Without the suppression the shared painter repaints a real border on the
	 * BORDER box directly beneath the band on the PADDING box — two visible
	 * horizontal lines, one un-asked-for. That is discharged by step 6a's
	 * additive `suppress_edges` parameter on the shared helper, called ONCE and
	 * normally. ⛔ No block-private `border-bottom-color` override sits alongside
	 * it: two overlapping fixes are unfalsifiable, so neither could ever be
	 * safely removed.
	 *
	 * ⛔ When the treatment is NOT `sweep`, NO `suppress_edges` key is passed at
	 * all — not an empty array, not all-false. The absent key is what keeps the
	 * emission byte-identical to the non-sweep case (the helper emits the flat
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

			$rtl        = 'right-to-left' === (string) ( $attributes['borderHoverAnimationDirection'] ?? 'left-to-right' );
			$first_stop = $rtl ? $sweep_normal : $sweep_hover;
			$last_stop  = $rtl ? $sweep_hover : $sweep_normal;
			$rest_pos   = $rtl ? '0 0' : '100% 0';
			$hover_pos  = $rtl ? '100% 0' : '0 0';

			$css .= $link_sel . '::after{content:"";position:absolute;inset-inline:0;'
				. 'bottom:calc(-1 * ' . $sweep_edge . ');height:' . $sweep_edge . ';'
				. 'background-image:linear-gradient(to right,' . $first_stop . ' 50%,' . $last_stop . ' 50%);'
				. 'background-size:200% 100%;background-position:' . $rest_pos . ';background-repeat:no-repeat;'
				. 'transition:background-position 300ms ease;pointer-events:none;}';
			$css .= sgs_hover_state_rules( $link_sel, 'background-position:' . $hover_pos, ':focus-visible', '::after' );
			// MANDATORY companion: keep both end states, drop only the travel.
			$css .= '@media (prefers-reduced-motion:reduce){' . $link_sel . '::after{transition:none;}}';
		}
	}

	/*
	 * 4d. Featured items (FR-36-4). Two forms, both operator-set:
	 *
	 * LABEL form (featuredBg unset) — the accent-coloured label. Kept as the
	 * default so no existing site changes shape.
	 *
	 * PILL form (featuredBg set) — a filled pill, which is what a draft typically
	 * authors a "featured" nav item as (Mama's draft `.sgs-header__nav-featured` =
	 * `background:var(--primary)` + `color:var(--text)` + weight 600 on the base
	 * link's 8px radius). Without a background attribute the converter had nowhere
	 * to put the draft's fill and silently dropped it, leaving accent-on-surface
	 * text — 1.35:1 on Mama's, measured live 2026-07-20.
	 *
	 * The pill's foreground is contrast-checked against the resolved fill by the
	 * same shared helper the hover pill uses (4c): the operator's chosen colour
	 * wins when it clears AA, else the guaranteed-safe binary fallback. Mama's
	 * text #3a2e26 on primary #e68a95 = 5.28:1 PASS, so the draft's own pairing is
	 * adopted verbatim — the fidelity fix and the a11y fix are the same fix.
	 */
	$featured_sel      = $uid_sel . ' .sgs-nav-menu__item--featured .sgs-nav-menu__link';
	$featured_colour   = isset( $attributes['featuredColour'] ) && '' !== $attributes['featuredColour']
		? (string) $attributes['featuredColour']
		: 'accent';
	// featuredColourGradient is the gradient sibling (mirrors burgerColourGradient,
	// D956 rollout) -- resting LABEL form only (no featured_bg). Gradient wins when
	// set+valid.
	$featured_colour_gradient  = isset( $attributes['featuredColourGradient'] ) ? (string) $attributes['featuredColourGradient'] : '';
	$featured_colour_effective = sgs_resolve_text_colour_or_gradient( $featured_colour, $featured_colour_gradient );
	$featured_bg_slug  = isset( $attributes['featuredBg'] ) ? sanitize_html_class( $attributes['featuredBg'] ) : '';
	$featured_bg_hex   = '' !== $featured_bg_slug ? sgs_resolve_palette_hex( $featured_bg_slug, '' ) : '';
	// D958 -- Bean-directed preset-to-gradient upgrade. Gradient wins over the
	// resolved slug/hex when set+valid; the slug mechanism above is untouched
	// when this is unset, so an existing site renders byte-identical.
	$featured_bg_gradient = sgs_css_gradient_value( $attributes['featuredBgGradient'] ?? '' );
	$featured_bg_active   = ( '' !== $featured_bg_hex ) || ( '' !== $featured_bg_gradient );
	
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
		$featured_bg_paint = sgs_background_paint_decl( $featured_bg_hex, $featured_bg_gradient );
		if ( '' !== $featured_bg_gradient ) {
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
			$preferred_fg = sgs_resolve_palette_hex( $featured_colour, '' );
			$featured_fg  = sgs_wcag_preferred_text_colour_for_bg( $featured_bg_hex, $preferred_fg );
		}
		$css .= $featured_sel . '{' . $featured_bg_paint
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
	 * SUBMENU item inherits exactly what the featured bar item uses (Bean,
	 * 2026-07-31 — the "Send to ward" priority item must look like itself wherever
	 * it appears, bar or burger drawer).
	 *
	 * Deliberately reuses the values computed ABOVE rather than re-reading the
	 * attributes: `$featured_fg` comes from sgs_wcag_preferred_text_colour_for_bg(),
	 * which picks a foreground that actually passes contrast against the chosen
	 * background. Re-deriving it here would risk a second, less accessible answer
	 * for the same setting.
	 */
	$sgs_nm_featured_vars = '--sgs-nm-featured-weight:' . (int) $featured_weight . ';';
	if ( '' !== $featured_bg_hex ) {
		// PILL form — carry the WCAG-resolved foreground computed above, verbatim.
		$sgs_nm_featured_vars .= '--sgs-nm-featured-bg:' . $featured_bg_hex . ';'
			. '--sgs-nm-featured-colour:' . $featured_fg . ';'
			. '--sgs-nm-featured-radius:' . (float) $featured_radius . 'px;';
	} elseif ( '' !== $featured_colour ) {
		// LABEL form — no background was chosen, so the submenu row stays
		// transparent rather than inventing a pill the bar itself does not have.
		//
		// Deliberately flat-only (featuredColourGradient is NOT read here). The
		// consumer of --sgs-nm-featured-colour, render.php's
		// `.sgs-nav-menu__subitem--featured .sgs-nav-menu__sublink` rule, paints
		// BOTH `color:var(--sgs-nm-featured-colour,…)` AND
		// `background:var(--sgs-nm-featured-bg,…)` on the SAME selector, so
		// background-clip:text would clip that background paint too --
		// textSharesElementWithBackground() precondition failure (see
		// CLAUDE.md "Colour EMISSION helpers" + submenuColourGradient's block.json
		// note for the identical precedent on this same file's sublink element).
		// Fixing this needs the submenu featured background moved onto its own
		// ::after layer (sgs_block_background_layer_css()) first -- out of scope
		// for this pass.
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
	$featured_hover_sel    = implode(
		',',
		array(
			$featured_sel . ':hover',
			$featured_sel . ':focus-visible',
		)
	);
	$featured_bg_hover     = isset( $attributes['featuredBgHover'] ) ? sanitize_html_class( $attributes['featuredBgHover'] ) : '';
	$featured_bg_hover_hex = '' !== $featured_bg_hover ? sgs_resolve_palette_hex( $featured_bg_hover, '' ) : '';
	$featured_fg_hover     = isset( $attributes['featuredColourHover'] ) ? (string) $attributes['featuredColourHover'] : '';
	// D958 -- gradient sibling, mirrors featuredBgGradient above. Gradient wins
	// over the resolved featuredBgHover slug/hex when set+valid.
	$featured_bg_hover_gradient = sgs_css_gradient_value( $attributes['featuredBgHoverGradient'] ?? '' );
	$featured_bg_hover_active   = ( '' !== $featured_bg_hover_hex ) || ( '' !== $featured_bg_hover_gradient );
	
	if ( $featured_bg_hover_active ) {
		$featured_bg_hover_paint = sgs_background_paint_decl( $featured_bg_hover_hex, $featured_bg_hover_gradient );
		if ( '' !== $featured_bg_hover_gradient ) {
			// Same WCAG-skip rationale as the resting pill above -- a gradient
			// has no single hex to contrast-check. Use the operator's own flat
			// featuredColourHover choice, falling back to the resting flat
			// featuredColour, rather than computing WCAG contrast against a
			// gradient.
			$featured_fg_h = sgs_colour_value( '' !== $featured_fg_hover ? $featured_fg_hover : $featured_colour );
		} else {
			$preferred_hover = '' !== $featured_fg_hover ? sgs_resolve_palette_hex( $featured_fg_hover, '' ) : '';
			$featured_fg_h   = '' !== $preferred_hover
				? sgs_wcag_preferred_text_colour_for_bg( $featured_bg_hover_hex, $preferred_hover )
				: sgs_wcag_text_colour_for_bg( $featured_bg_hover_hex );
		}
		$css .= sgs_hover_state_rules(
			$featured_sel,
			$featured_bg_hover_paint . ( '' !== $featured_fg_h ? ';color:' . esc_attr( $featured_fg_h ) : '' ) . ';transition:background-color ' . $transition_fast . ',color ' . $transition_fast,
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
	 * ⛔ DELETED (FR-41-4 item 7). This emitted `{featured_sel}::after{content:none;}`
	 * unconditionally, to stop the retired underline bar doubling up with the
	 * featured treatment. That bar no longer exists, so it had nothing left to
	 * suppress — and `$featured_sel` weighs (0,3,1) against the border sweep's
	 * band at (0,2,1), so it WON and the sweep silently did not render on a
	 * featured item. ⛔ Not kept "just in case": a kept suppression rule is
	 * exactly the silent override `check-hardcoded-render-defaults.js` F3b exists
	 * to catch, and deleting it makes the sweep apply to featured items too —
	 * which is the universal answer (project rule 3, no carve-outs).
	 */

	/*
	 * ── FR-41-13 — Parent item keeps Hover state while submenu is hovered ─────
	 *
	 * When the pointer enters the open dropdown, the parent link loses its `:hover`
	 * because `:hover` does not match an ancestor whose visual box does not contain
	 * the target. This rule restores it by keying on the wrapper's `:hover` state,
	 * which DOES persist for ancestors in the DOM tree.
	 *
	 * FOUR rules: mouse variant (bar + drawer) + keyboard variant (bar + drawer).
	 * Mouse needs no `:has()` (hover bubbles); keyboard needs `:has()` (focus does
	 * not bubble). Always key keyboard on `ul.sgs-nav-menu__submenu` — the ONE
	 * class present in both forks. `.sgs-nav-menu__submenu-wrap` exists bar-only.
	 *
	 * ⚠ Declarations are the SAME as the existing item hover rules — reuse their
	 * output, never hand-copy a duplicate that can drift.
	 */

	// Collect the exact hover declarations the item already uses.
	$item_hover_decls = array();

	// Text colour hover — only emit simple colour hover, not sweep.
	// Sweep is too complex to apply to the parent selector.
	if ( '' === $item_text_sweep['hover'] && 'none' !== $t_text && '' !== $item_colour_hover ) {
		$item_hover_decls['text'] = 'color:' . sgs_colour_value( $item_colour_hover );
	}

	// Background hover.
	if ( '' !== $item_bg_hover_decl ) {
		$item_hover_decls['bg'] = $item_bg_hover_decl;
	}

	// Border hover — re-derive the hover declaration from the border state.
	// ⛔ 'sweep' is deliberately EXCLUDED: its hover mechanism is an animated
	// band with a permanent `border-bottom-color:transparent` on the base
	// state (not a plain colour swap). Emitting `border-color:X` here would
	// out-specify that transparent declaration via this rule's `:has()`
	// selector and reintroduce a solid bottom border exactly while the
	// submenu is hovered/focused — a technique mismatch, not a fix. Only
	// 'swap' uses a plain border-colour hover this rule can faithfully copy.
	// ⛔ Gated on the BORDER'S OWN hover colour, not $item_colour_hover (a
	// leftover from copy-pasting the text branch above) — an item with a
	// border-only hover (no text hover colour at all, G7's exact live-caught
	// case) previously never reached this branch, so the rescue rule never
	// computed for it in the first place.
	if ( 'swap' === $t_border ) {
		$item_border_hover_colour = sgs_colour_value( (string) ( $attributes['itemBorderColourHover'] ?? '' ) );
		if ( '' !== $item_border_hover_colour ) {
			$item_hover_decls['border'] = 'border-color:' . $item_border_hover_colour;
		}
	}

	// Only emit FR-41-13 rules if there are hover declarations to paint.
	//
	// ⛔ 'text' and 'border' both paint the LINK element itself and are
	// combined into ONE declaration string; 'bg' paints the `::before` layer
	// (FR-41-23's item-background mechanism) and stays separate. A prior
	// version of this block checked only 'text'/'bg' in its if/elseif chain,
	// so a border-only hover (G7's exact live-caught case — `itemBorderColourHover`
	// set with no text hover colour) computed a 'border' entry above that was
	// silently never read here: none of the four branches matched
	// text-absent/bg-absent/border-present, so nothing emitted at all.
	if ( ! empty( $item_hover_decls ) ) {
		$link_decls = array_filter(
			array( $item_hover_decls['text'] ?? '', $item_hover_decls['border'] ?? '' )
		);
		$link_decl_str = implode( ';', $link_decls );
		$bg_decl_str   = $item_hover_decls['bg'] ?? '';

		// Mouse half — bar fork.
		$bar_mouse_sel = $uid_sel . ' .sgs-nav-menu__submenu-root:hover > .sgs-nav-menu__link';
		if ( '' !== $link_decl_str ) {
			$css .= sgs_hover_guarded_rule( $bar_mouse_sel, $link_decl_str );
		}
		if ( '' !== $bg_decl_str ) {
			$css .= sgs_hover_guarded_rule( $bar_mouse_sel . '::before', $bg_decl_str );
		}

		// Mouse half — drawer fork.
		$drawer_mouse_sel = $uid_sel . ' .sgs-nav-menu__accordion-row:hover > .sgs-nav-menu__link';
		if ( '' !== $link_decl_str ) {
			$css .= sgs_hover_guarded_rule( $drawer_mouse_sel, $link_decl_str );
		}
		if ( '' !== $bg_decl_str ) {
			$css .= sgs_hover_guarded_rule( $drawer_mouse_sel . '::before', $bg_decl_str );
		}

		// Keyboard half — bar fork.
		$bar_keyboard_sel = $uid_sel . ' .sgs-nav-menu__submenu-root:has( ul.sgs-nav-menu__submenu :focus-visible ) > .sgs-nav-menu__link';
		if ( '' !== $link_decl_str ) {
			$css .= $bar_keyboard_sel . '{' . $link_decl_str . ';}';
		}
		if ( '' !== $bg_decl_str ) {
			$css .= $bar_keyboard_sel . '::before{' . $bg_decl_str . ';}';
		}

		// Keyboard half — drawer fork.
		$drawer_keyboard_sel = $uid_sel . ' .sgs-nav-menu__accordion-row:has( ul.sgs-nav-menu__submenu :focus-visible ) > .sgs-nav-menu__link';
		if ( '' !== $link_decl_str ) {
			$css .= $drawer_keyboard_sel . '{' . $link_decl_str . ';}';
		}
		if ( '' !== $bg_decl_str ) {
			$css .= $drawer_keyboard_sel . '::before{' . $bg_decl_str . ';}';
		}
	}

		return $css;
	}
}
