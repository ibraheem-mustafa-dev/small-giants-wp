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

if ( ! function_exists( 'sgs_nav_shared_item_state_css' ) ) {
	/**
	 * Build the item/state-colour half of nav-menu's scoped <style>.
	 *
	 * @param array  $attributes Block attributes (verbatim render.php param).
	 * @param string $uid_sel    This instance's CSS scope selector (`.{uid}`).
	 * @param array  $treatments RESOLVED hover treatments from
	 *                           `sgs_nav_shared_resolved_treatments()` — ⛔ never the
	 *                           stored attribute, which can say 'sweep' on a row
	 *                           whose eligibility predicate is false.
	 * @param string $default_item_colour_hover Token used when the operator has
	 *                           never set `itemColourHover` (Wave 2 E1 / FR-41-36
	 *                           locked default). The BAR and the DRAWER are
	 *                           genuinely different surfaces (D1059 split) with
	 *                           different resting/hover contexts, so each caller
	 *                           names its own default explicitly rather than the
	 *                           shared function guessing from `$bem_root` —
	 *                           `sgs/nav-bar-menu` passes 'accent' (unchanged),
	 *                           `sgs/nav-drawer-menu` passes 'primary' (2026-09-18,
	 *                           Bean-reported live on Mama's Munches).
	 * @return string CSS fragment (no wrapping <style> tag).
	 */
	function sgs_nav_shared_item_state_css( array $attributes, string $uid_sel, string $bem_root, array $treatments = array(), string $default_item_colour_hover = 'accent' ): string {
	$css      = '';
	$link_sel = $uid_sel . ' .' . $bem_root . '__link';

	/*
	 * Wave 2 cluster 3 (M4/M2/M6, 2026-09-12) — `.{bem}__link` (the <a>)
	 * and `.{bem}__subtoggle` (the <button> containing
	 * `.{bem}__caret > svg`) are DOM SIBLINGS under one shared parent
	 * (`.{bem}__submenu-root`), never an ancestor/descendant pair — CSS
	 * cannot select a sibling's sibling by value. `$caret_svg_sel` is the
	 * companion selector every item TEXT-colour rule below pairs alongside
	 * `$link_sel` so the caret's `stroke="currentColor"` glyph tracks the
	 * item's own colour instead of the ambient/theme default.
	 */
	$caret_svg_sel = $uid_sel . ' .' . $bem_root . '__caret svg';

	// ⛔ The RESOLVED treatment, never the stored attribute. render.php resolves
	// it once (sgs_nav_shared_resolved_treatments()) immediately after the
	// eligibility evaluation; every rule below reads THAT value.
	$t_text   = (string) ( $treatments['itemColourHoverTreatment'] ?? 'swap' );
	$t_bg     = (string) ( $treatments['itemBgHoverTreatment'] ?? 'swap' );
	$t_border = (string) ( $treatments['itemBorderHoverTreatment'] ?? 'swap' );

	// 4a. Item typography — flat scalar model, shared helper (matches
	// TypographyControls' attribute contract: {prefix}FontSize/Unit/Tablet/Mobile).
	$css .= sgs_typography_css_rule( $attributes, 'item', $link_sel );

	/*
	 * Wave 2 M6 (2026-09-12) — caret oversize. `.{bem}__caret svg` has no
	 * font-size of its own to run `width:1em;height:1em` against (the sibling
	 * rule nav-menu-submenu-css.php emits) — it falls back to the browser's UA
	 * button-reset default. nav-menu-submenu-css.php's own `.{bem}__
	 * subtoggle` rule already carries `font:inherit` FOR THIS EXACT PURPOSE (its
	 * own "M6 precondition" comment), which means the resolved size must live on
	 * an ANCESTOR the button can inherit from — `.{bem}__submenu-root`,
	 * confirmed live: an explicit `font-size` on `.subtoggle` itself is a
	 * same-specificity sibling to that `font:inherit` shorthand and LOSES to it
	 * by source order (nav-menu-submenu-css.php concatenates after this file).
	 *
	 * Deliberately font-size ONLY — the low-level responsive emitters, not the
	 * full `sgs_typography_css_rule()` wrapper. `.submenu-root` is also the
	 * parent of the mega/dropdown PANEL (`[data-sgs-mega-panel]`), so cascading
	 * the FULL typography set (font-family/weight/line-height/text-align) there
	 * would restyle rich panel content that was never in scope for a caret-sizing
	 * fix. Font-size alone is safe: `.{bem}__sublink` already carries its
	 * own explicit `submenuFontSize` rule (nav-menu-submenu-css.php) which wins
	 * over this inherited value for the one thing panel content actually reads
	 * font-size for.
	 */
	$submenu_root_sel      = $uid_sel . ' .' . $bem_root . '__submenu-root';
	$item_size_attr        = $attributes['itemFontSize'] ?? null;
	if ( is_array( $item_size_attr ) ) {
		$item_size_unit_set = isset( $attributes['itemFontSizeUnit'] ) && '' !== $attributes['itemFontSizeUnit'];
		$item_size_unit     = $item_size_unit_set ? sgs_responsive_sanitise_unit( $attributes['itemFontSizeUnit'] ) : 'px';
		$css               .= sgs_emit_responsive_css(
			$submenu_root_sel,
			array(
				array(
					'value'        => $item_size_attr,
					'css'          => 'font-size',
					'unit_default' => $item_size_unit,
					'transform'    => function ( $raw ) use ( $item_size_unit ) {
						if ( is_numeric( $raw ) ) {
							return (string) floatval( $raw ) . $item_size_unit;
						}
						return sgs_font_size_value( (string) $raw );
					},
				),
			)
		);
	} elseif ( isset( $attributes['itemFontSize'] ) && '' !== $attributes['itemFontSize'] && is_numeric( $attributes['itemFontSize'] ) ) {
		$css .= sgs_responsive_css_rule(
			$attributes,
			array(
				array(
					'attr'         => 'itemFontSize',
					'css'          => 'font-size',
					'unit_attr'    => isset( $attributes['itemFontSizeUnit'] ) && '' !== $attributes['itemFontSizeUnit'] ? 'itemFontSizeUnit' : '',
					'unit_default' => 'px',
					'tablet_attr'  => 'itemFontSizeTablet',
					'mobile_attr'  => 'itemFontSizeMobile',
				),
			),
			$submenu_root_sel
		);
	}

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
	// here).
	$item_colour_gradient  = isset( $attributes['itemColourGradient'] ) ? (string) $attributes['itemColourGradient'] : '';
	$item_colour_effective = sgs_resolve_text_colour_or_gradient( $item_colour, $item_colour_gradient );
	// itemColourHoverGradient (2026-09-13, Bean-directed) -- read here, resolved
	// further down AFTER the itemSmartContrast branch runs, because the swap
	// must win over any stored gradient (see $item_colour_hover_effective below).
	$item_colour_hover_gradient = isset( $attributes['itemColourHoverGradient'] ) ? (string) $attributes['itemColourHoverGradient'] : '';
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
	 * behaviour, preserved as an OPT-IN toggle rather than a hardcoded side
	 * effect. Default changed to OFF 2026-09-13 (Bean-directed): a silent
	 * colour swap surprised an operator whose explicit `itemColourHover` looked
	 * "not applied" — it had been quietly overridden by this exact branch. The
	 * swap logic below is UNCHANGED and stays available as an explicit opt-in;
	 * only the DEFAULT flipped. The readability CHECK itself (same WCAG maths)
	 * now lives unconditionally in edit.js as an advisory inspector Notice —
	 * it always warns on a failing combination, regardless of this attribute's
	 * value; only the automatic SWAP below is gated on it.
	 *
	 * When ON and the operator has set a Hover or Current BACKGROUND, the
	 * matching foreground resolves through the EXISTING shared WCAG helpers —
	 * the same two the retired pill branch called, and the same two the
	 * featured pill and sgs/nav-drawer already use. ⛔ No new contrast function
	 * is built.
	 *
	 * ⚠ Case two means an explicit colour does not always win: with the toggle
	 * ON, the operator's choice is kept whenever it clears AA against the
	 * resolved fill, and falls back to the guaranteed-safe binary only when it
	 * does not. With the toggle OFF (the default), the operator's choice is
	 * ALWAYS kept as-authored — the swap never runs.
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

	// Wave 2 E1 (2026-09-12) / FR-41-36 locked default ("Top bar | Hover |
	// text=accent"). An operator who never touches itemColourHover previously
	// relied on WordPress core's own ambient `:root :where(a:hover)` rule —
	// ZERO specificity, and it stops matching the instant the pointer leaves
	// the literal <a> even while still inside the item's own open dropdown, so
	// FR-41-13's rescue block below (which only re-emits an EXPLICITLY-set
	// hover declaration) has nothing to hold onto. Defaulting here closes the
	// gap by construction: every branch below that already gates on
	// `'' !== $item_colour_hover` (the Hover-emission branch + the FR-41-13
	// rescue block) now fires for every untouched item too, with zero further
	// code change. Skipped only when the resolved text-hover TREATMENT is
	// 'none' — an operator who explicitly chose no text-hover signal keeps it.
	if ( '' === $item_colour_hover && 'none' !== $t_text ) {
		$item_colour_hover = $default_item_colour_hover;
	}

	// Default OFF (2026-09-13, Bean-directed) — was default-ON. Unset or
	// explicitly false = the operator's itemColourHover renders exactly
	// as-authored, no swap. Only an explicit `true` opts into the swap below.
	$smart_contrast = isset( $attributes['itemSmartContrast'] ) && (bool) $attributes['itemSmartContrast'];
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

	// itemColourHoverGradient (2026-09-13) -- the swap above ALWAYS wins when
	// itemSmartContrast is ON: $item_colour_hover is already the auto-computed
	// safe solid at this point, and a stored gradient value is deliberately
	// ignored here rather than resolved, so a stale gradient set while the
	// swap was OFF never silently reappears once it's switched back ON. When
	// the swap is OFF the sibling resolves exactly like the Normal state does.
	$item_colour_hover_effective = $smart_contrast
		? $item_colour_hover
		: sgs_resolve_text_colour_or_gradient( $item_colour_hover, $item_colour_hover_gradient );

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
		$item_text_sweep  = sgs_nav_shared_text_sweep_css(
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
			// Wave 2 M4 (2026-09-12): paired with $caret_svg_sel — same value,
			// same rule, reaches the caret's `stroke="currentColor"` glyph too
			// (a DOM sibling `$link_sel` alone cannot select).
			$css .= $link_sel . ',' . $caret_svg_sel . '{' . $item_colour_decl . ';}';
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
	} elseif ( 'none' !== $t_text && '' !== $item_colour_hover_effective ) {
		// Wave 2 M4 (2026-09-12): $caret_svg_sel paired in the same call — a
		// direct :hover/:focus-visible on the caret's own svg fires when the
		// pointer/focus is on the caret itself (e.g. the has_url fork's
		// separate `.{bem}__subtoggle` button).
		// itemColourHoverGradient (2026-09-13): sgs_text_colour_decl() detects a
		// gradient function on its own and swaps in the background-clip:text
		// declaration set; a flat colour resolves exactly as before via
		// `color:`. Guarded on a non-empty decl (an invalid stored value
		// resolves to '', matching every other colour branch in this file).
		$item_colour_hover_decl = sgs_text_colour_decl( $item_colour_hover_effective );
		if ( '' !== $item_colour_hover_decl ) {
			$css .= sgs_hover_state_rules( $link_sel . ',' . $caret_svg_sel, $item_colour_hover_decl, ':focus-visible' );
			$css .= sgs_text_colour_gradient_fallback_rule(
				$link_sel . ':hover,' . $caret_svg_sel . ':hover,' . $link_sel . ':focus-visible,' . $caret_svg_sel . ':focus-visible',
				$item_colour_hover_effective
			);
		}
	}

	// FR-41-6 — the Current-state weight, under the NEVER-LIGHTER rule. An
	// operator who bolds the whole menu would otherwise see the current page
	// render LIGHTER than every other item: a signal pointing the wrong way. An
	// empty itemFontWeight (the shipped default) casts to 0, so the default
	// "600" always emits and today's output is preserved byte-for-byte.
	$item_weight_current = (int) ( $attributes['itemFontWeightCurrent'] ?? 0 );
	if ( $item_weight_current > (int) ( $attributes['itemFontWeight'] ?? 0 ) ) {
		$css .= $uid_sel . ' .' . $bem_root . '__link[aria-current="page"],'
			. $uid_sel . ' .' . $bem_root . '__sublink[aria-current="page"]{font-weight:' . $item_weight_current . ';}';
	}

	$css .= sgs_nav_shared_typography_hover_rule( $attributes, 'item', $link_sel, $item_sweep_hover );

	/*
	 * ── ITEM BACKGROUND — ALL THREE fills on `{link}::before` (FR-41-23). ────
	 *
	 * ⛔ No state's fill is emitted onto `.{bem}__link` itself. If any of
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

	// Wave 2 A1/A2 (2026-09-12): under `highlight` the per-item hover FILL is
	// unconditionally suppressed above (FR-41-14/FR-41-25 — the shared sliding
	// pill is the ONE background shape for non-resting states). That is
	// correct when the pill's colour visibly differs from the resting fill —
	// it becomes illegible only when an operator sets `itemBg`/`itemBgHover`
	// to the SAME token (background never visibly moves; the only signal left
	// is the text-colour flip, which can itself be near-identical to the
	// resting text). A font-weight bump is a SECOND signal that is discernible
	// unconditionally, regardless of which colour pair an operator picks —
	// same "never lighter" technique this file already ships for the
	// Current-state weight rule (`itemFontWeightCurrent`, above). Emitted
	// UNCONDITIONALLY under `highlight` (not gated on any colour comparison):
	// it costs nothing when the colours already differ.
	if ( 'highlight' === $t_bg ) {
		$highlight_hover_weight = max( 700, (int) ( $attributes['itemFontWeight'] ?? 400 ) + 200 );
		$css .= sgs_hover_state_rules( $link_sel, 'font-weight:' . $highlight_hover_weight, ':focus-visible' );
	}

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
	 * ── FR-41-13-adjacent — ANCESTOR shows Current styling when a descendant
	 * submenu item IS the current page (nav-review fix 4, 2026-09-12). ─────────
	 *
	 * Bean explicitly rejected a THIRD visual language (a diluted/tinted
	 * treatment) for this — the ancestor reuses the LITERAL existing Current
	 * declarations verbatim, the same values `$item_colour_current` /
	 * `$item_bg_current_decl` / `itemBorderColourCurrent` / `$item_weight_current`
	 * already computed above for the item's OWN current-page rule. No new
	 * custom property, no new colour.
	 *
	 * Selector shape extends the SAME `:has()` pattern the FR-41-13 rescue block
	 * below already uses (there keyed on `[aria-expanded="true"]` /
	 * `:focus-visible`), here keyed on `a[aria-current="page"]` instead, for
	 * both forks (bar `.submenu-root` / drawer `.accordion-row`). `:has()` needs
	 * no browser-support gate — FR-41-13 already ships it unconditionally.
	 *
	 * `:not(:hover):not(:focus-visible)` on the trailing `.{bem}__link`
	 * is what guarantees hover always wins over a propagated-current ancestor —
	 * NOT specificity. Measured: the `:has(ul.{bem}__submenu
	 * a[aria-current="page"])` selector's own specificity (0,5,2) already
	 * OUTRANKS the item's plain `:hover` rule (0,3,0), so relying on source
	 * order or specificity here would have been backwards — a directly-hovered
	 * parent would have kept showing the propagated Current paint underneath.
	 * The `:not()` pair sidesteps the arithmetic entirely: while the link is
	 * itself hovered or focus-visible, this rule simply does not match.
	 *
	 * ⚠ BAR FORK ONLY — `[data-sgs-nav-has-current]` `:has()` rescue
	 * (2026-09-14, sticky-header reparent regression). `mega-disclosure.js`'s
	 * `reparentPanelIfNeeded()` moves the bar's `[data-sgs-mega-panel]`
	 * (containing `ul.{bem}__submenu`) to `<body>` while a page-embedded
	 * dropdown is open, which breaks `:has()` above for exactly that long — the
	 * `<ul>` is no longer a DOM descendant of `.submenu-root` to check. JS
	 * mirrors the same fact onto `.submenu-root` itself (which never moves) as
	 * `data-sgs-nav-has-current`, set/cleared for the duration of the reparent
	 * only — see `attachAncestorFlagWatcher()`/`detachAncestorFlagWatcher()` in
	 * `mega-disclosure.js`. The DRAWER fork never reparents (its submenu `<ul>`
	 * carries `data-sgs-drill-panel`, not `[data-sgs-mega-panel]` —
	 * `reparentPanelIfNeeded()`'s `root.querySelector('[data-sgs-mega-panel]')`
	 * finds nothing for it), so `$sgs_nm_ancestor_drawer_sel` below needs no
	 * equivalent fallback.
	 */
	$sgs_nm_ancestor_current_decls = array();
	if ( '' !== $item_colour_current ) {
		$sgs_nm_ancestor_current_decls[] = 'color:' . sgs_colour_value( $item_colour_current );
	}
	$sgs_nm_item_border_colour_current = (string) ( $attributes['itemBorderColourCurrent'] ?? '' );
	if ( '' !== $sgs_nm_item_border_colour_current ) {
		$sgs_nm_ancestor_current_decls[] = 'border-color:' . sgs_colour_value( $sgs_nm_item_border_colour_current );
	}
	if ( $item_weight_current > (int) ( $attributes['itemFontWeight'] ?? 0 ) ) {
		$sgs_nm_ancestor_current_decls[] = 'font-weight:' . $item_weight_current;
	}
	$sgs_nm_ancestor_current_decl_str = implode( ';', $sgs_nm_ancestor_current_decls );

	/*
	 * `:is( :has(…), [data-sgs-nav-has-current] )` — a single compound
	 * selector, NOT a comma-joined pair, deliberately: `$sgs_nm_ancestor_bar_sel`
	 * gets `::before` appended directly below (`$sgs_nm_ancestor_bar_sel .
	 * '::before'`), and appending a pseudo-element to a top-level comma list
	 * only attaches it to the LAST selector in the string — the exact trap
	 * already recorded for this file. `:is()` keeps the OR internal so
	 * `::before` still applies to both the `:has()` match and the reparent
	 * fallback.
	 */
	$sgs_nm_submenu_has_current = 'ul.' . $bem_root . '__submenu a[aria-current="page"]';
	$sgs_nm_ancestor_bar_sel    = $uid_sel . ' .' . $bem_root . '__submenu-root:is(:has(' . $sgs_nm_submenu_has_current . '), [data-sgs-nav-has-current]) > .' . $bem_root . '__link:not(:hover):not(:focus-visible)';
	$sgs_nm_ancestor_drawer_sel = $uid_sel . ' .' . $bem_root . '__accordion-row:has(' . $sgs_nm_submenu_has_current . ') > .' . $bem_root . '__link:not(:hover):not(:focus-visible)';

	if ( '' !== $sgs_nm_ancestor_current_decl_str ) {
		$css .= $sgs_nm_ancestor_bar_sel . ',' . $sgs_nm_ancestor_drawer_sel . '{' . $sgs_nm_ancestor_current_decl_str . ';}';
	}
	if ( '' !== $item_bg_current_decl ) {
		$css .= $sgs_nm_ancestor_bar_sel . '::before,' . $sgs_nm_ancestor_drawer_sel . '::before{' . $item_bg_current_decl . ';}';
	}

	// Item BORDER (three states + Sweep band) and item SEPARATOR — extracted to
	// includes/nav-menu-item-border-featured-css.php (file-size maintenance
	// pass, 2026-09-14): fully self-contained, no shared state beyond
	// $attributes/$link_sel/$uid_sel/$t_border.
	$css .= sgs_nav_shared_item_border_css( $attributes, $link_sel, $uid_sel, $t_border, $bem_root );

	// Featured items (LABEL/PILL forms + republished custom properties + Hover
	// state) — extracted to the same module, same rationale.
	$css .= sgs_nav_shared_featured_css( $attributes, $uid_sel, $bem_root );

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
	 * not bubble). Always key keyboard on `ul.{bem}__submenu` — the ONE
	 * class present in both forks. `.{bem}__submenu-wrap` exists bar-only.
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
		//
		// Wave 2 M2 (2026-09-12): $bar_mouse_caret_sel pairs alongside
		// $bar_mouse_sel for the LINK declaration only (never `::before`, which
		// is the link's own background-fill pseudo-element and has no
		// caret-svg equivalent) — closes the caret's own hover-persistence gap
		// as a side effect of the SAME selector shape M4 already pairs above,
		// no separate mechanism. Bar-only: the drawer fork's caret pairing is
		// a different mechanism owned by nav-menu-submenu-css.php.
		$bar_mouse_sel       = $uid_sel . ' .' . $bem_root . '__submenu-root:hover > .' . $bem_root . '__link';
		$bar_mouse_caret_sel = $uid_sel . ' .' . $bem_root . '__submenu-root:hover .' . $bem_root . '__caret svg';
		if ( '' !== $link_decl_str ) {
			$css .= sgs_hover_guarded_rule( $bar_mouse_sel . ',' . $bar_mouse_caret_sel, $link_decl_str );
		}
		if ( '' !== $bg_decl_str ) {
			$css .= sgs_hover_guarded_rule( $bar_mouse_sel . '::before', $bg_decl_str );
		}

		// Mouse half — drawer fork.
		$drawer_mouse_sel = $uid_sel . ' .' . $bem_root . '__accordion-row:hover > .' . $bem_root . '__link';
		if ( '' !== $link_decl_str ) {
			$css .= sgs_hover_guarded_rule( $drawer_mouse_sel, $link_decl_str );
		}
		if ( '' !== $bg_decl_str ) {
			$css .= sgs_hover_guarded_rule( $drawer_mouse_sel . '::before', $bg_decl_str );
		}

		// Keyboard half — bar fork.
		//
		// Wave 2 M2 (2026-09-12): same caret pairing as the mouse half above.
		//
		// ⚠ `:is( :has(…), [data-sgs-nav-has-focus] )` is the same reparent-safe
		// `:has()` rescue as the current-page ancestor rule above (2026-09-14)
		// — while `reparentPanelIfNeeded()` has moved the bar's panel to
		// `<body>`, `:has( ul.{bem}__submenu :focus-visible )` can no
		// longer see the focus-visible descendant, so `mega-disclosure.js`
		// mirrors that LIVE fact onto `.submenu-root` itself (via a
		// `focusin`/`focusout` listener on the moved panel, kept in sync for
		// as long as the reparent lasts) as `data-sgs-nav-has-focus`. `:is()`,
		// not a comma-joined pair, because `$bar_keyboard_sel` gets `::before`
		// appended directly below — a pseudo-element appended to a top-level
		// comma list only attaches to the LAST selector, the exact trap
		// already recorded for this file. Drawer fork needs no equivalent —
		// its submenu never reparents (see the note above the current-page
		// rule).
		$bar_keyboard_sel       = $uid_sel . ' .' . $bem_root . '__submenu-root:is( :has( ul.' . $bem_root . '__submenu :focus-visible ), [data-sgs-nav-has-focus] ) > .' . $bem_root . '__link';
		$bar_keyboard_caret_sel = $uid_sel . ' .' . $bem_root . '__submenu-root:is( :has( ul.' . $bem_root . '__submenu :focus-visible ), [data-sgs-nav-has-focus] ) .' . $bem_root . '__caret svg';
		if ( '' !== $link_decl_str ) {
			$css .= $bar_keyboard_sel . ',' . $bar_keyboard_caret_sel . '{' . $link_decl_str . ';}';
		}
		if ( '' !== $bg_decl_str ) {
			$css .= $bar_keyboard_sel . '::before{' . $bg_decl_str . ';}';
		}

		// Keyboard half — drawer fork.
		$drawer_keyboard_sel = $uid_sel . ' .' . $bem_root . '__accordion-row:has( ul.' . $bem_root . '__submenu :focus-visible ) > .' . $bem_root . '__link';
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
