<?php
/**
 * SGS Nav Menu (sgs/nav-menu) — scoped CSS, part 2: submenu/dropdown, burger +
 * magnet, drawer fork, sliding indicator, root box.
 *
 * Split out of render.php (Spec 41 step 8, pure refactor) — burger icon/
 * background/hover/size, the bar/burger collapse-point switch, mega-menu +
 * dropdown disclosure positioning, drawer-specific submenu/sublink/current-page
 * overrides, listColumns in-drawer grid, the sliding-indicator colour override,
 * the root box (native spacing + responsive padding tiers), and the free-text
 * custom-CSS escape hatch. Extracted verbatim: the function body below is a
 * byte-for-byte copy of render.php's own "4e." through "4h." CSS-assembly
 * sections, unwrapped from render.php's local scope into explicit parameters.
 *
 * ⚠ LOAD ORDER: NOT bootstrap-loaded — `require_once`'d per-instance from
 * render.php, matching product-card's pattern and this file's own sibling
 * `nav-menu-css.php`. Its function is only in scope after nav-menu's own
 * render.php has run at least once on that page load. Fine today; a future
 * cross-block call needs this file required first.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_menu_submenu_css' ) ) {
	/**
	 * Build the submenu/dropdown/burger/indicator/root-box half of nav-menu's
	 * scoped <style>.
	 *
	 * @param array  $attributes             Block attributes (verbatim render.php param).
	 * @param string $uid_sel                This instance's CSS scope selector (`.{uid}`).
	 * @param string $indicator_style        Resolved indicatorStyle ('none'|'pill').
	 * @param string $indicator_colour       Resolved indicatorColour attribute.
	 * @param string $indicator_colour_gradient Resolved indicatorColourGradient CSS value.
	 * @param array  $sgs_tor_padding_tiers  Normalised padding tier object (desktop/tablet/mobile).
	 * @param array  $sgs_tor_padding_desktop Desktop-tier padding sides array.
	 * @param array  $sgs_tor_margin_desktop  Desktop-tier margin sides array.
	 * @return string CSS fragment (no wrapping <style> tag).
	 */
	function sgs_nav_menu_submenu_css(
		array $attributes,
		string $uid_sel,
		string $indicator_style,
		string $indicator_colour,
		string $indicator_colour_gradient,
		array $sgs_tor_padding_tiers,
		array $sgs_tor_padding_desktop,
		array $sgs_tor_margin_desktop
	): string {
		$css = '';

		// 4e. Burger colour / resting background / hover / size.
		// D956 — burgerColourGradient is the gradient sibling (778879732 rollout,
		// Phase 3); gradient wins when set+valid.
		$burger_colour           = isset( $attributes['burgerColour'] ) ? (string) $attributes['burgerColour'] : '';
		$burger_colour_gradient  = isset( $attributes['burgerColourGradient'] ) ? (string) $attributes['burgerColourGradient'] : '';
		$burger_colour_effective = sgs_resolve_text_colour_or_gradient( $burger_colour, $burger_colour_gradient );
		if ( '' !== $burger_colour_effective ) {
			$burger_colour_decl = sgs_text_colour_decl( $burger_colour_effective );
			if ( '' !== $burger_colour_decl ) {
				$css .= $uid_sel . ' .sgs-nav-menu__burger{' . $burger_colour_decl . ';}';
			}
			$css .= sgs_text_colour_gradient_fallback_rule( $uid_sel . ' .sgs-nav-menu__burger', $burger_colour_effective );
		}
		if ( '' !== ( $attributes['burgerColourHover'] ?? '' ) ) {
			$css .= sgs_hover_state_rules( "{$uid_sel} .sgs-nav-menu__burger", "color:" . sgs_colour_value( $attributes['burgerColourHover'] ), ':focus-visible' );
		}
		
		/*
		 * RESTING background — the base for burgerHoverColour's hover state (Spec 35
		 * FR-35-5 STATE_WITHOUT_BASE). Before this, the burger's hover background had
		 * no resting counterpart: a client could style the hover fill but never the
		 * button's own resting fill. style.css's `background:none` stays the
		 * byte-identical default when this is left unset.
		 */
		$burger_bg = isset( $attributes['burgerBg'] ) ? (string) $attributes['burgerBg'] : '';
		$burger_bg_gradient = sgs_css_gradient_value( $attributes['burgerBgGradient'] ?? '' );
		if ( '' !== $burger_bg ) {
			$css .= $uid_sel . ' .sgs-nav-menu__burger{' . sgs_background_paint_decl( $burger_bg, $burger_bg_gradient ) . ';}';
		}
		$burger_hover_slug = isset( $attributes['burgerHoverColour'] ) ? (string) $attributes['burgerHoverColour'] : '';
		if ( '' !== $burger_hover_slug ) {
			$css .= sgs_hover_state_rules( $uid_sel . ' .sgs-nav-menu__burger', 'background-color:' . sgs_colour_value( $burger_hover_slug ), ':focus-visible' );
		}
		$burger_size = sgs_css_length_value( $attributes['burgerSize'] ?? '44px' );
		if ( '' !== $burger_size ) {
			$css .= $uid_sel . ' .sgs-nav-menu__burger{width:' . $burger_size . ';height:' . $burger_size . ';min-width:' . $burger_size . ';min-height:' . $burger_size . ';}';
		}
		
		// 4f. Bar ↔ burger collapse-point switch. A LEGITIMATE non-device-tier
		// breakpoint (the visual bar/burger swap) — deliberately NOT part of the
		// 768/1024 device system (see the block build brief §"Responsive breakpoint
		// discipline"). Only the switch point itself lives here; any OTHER custom
		// breakpoint goes through sgsCustomCss below.
		$collapse_point = isset( $attributes['collapsePoint'] ) ? max( 1, absint( $attributes['collapsePoint'] ) ) : 768;
		// Hide the <nav> LANDMARK below the collapse point, not just the <ul> inside it.
		// Hiding only `__bar` would leave an EMPTY exposed navigation landmark on mobile
		// — worse than no landmark, because a screen-reader user lands in a "Primary"
		// navigation region containing nothing. `display:none` removes the whole subtree
		// from the accessibility tree, which is what makes the bar/drawer pair safe (see
		// the naming note in FR-36-11).
		// Below the collapse point the LIST is hidden and the burger takes over. The
		// hide targets the <ul>, NOT the block root — the root is the <nav> landmark
		// (see the wrapper call) and it must stay exposed, because the burger inside it
		// is the control that opens the navigation. A named landmark containing the
		// disclosure button is the W3C APG disclosure-navigation shape; hiding the root
		// would remove the burger from the accessibility tree along with the list.
		$css .= '@media (max-width:' . ( $collapse_point - 1 ) . 'px){' . $uid_sel . ' .sgs-nav-menu__bar{display:none;}' . $uid_sel . ' .sgs-nav-menu__toggle-wrap{display:flex;}}';
		$css .= '@media (min-width:' . $collapse_point . 'px){' . $uid_sel . ' .sgs-nav-menu__toggle-wrap{display:none;}}';
		
		// 4g. Mega-menu disclosure — caret rotation + panel positioning (U9). The
		// trigger is a <button>, not an <a>, so it needs a minimal reset to inherit
		// the bar link's look rather than the browser's default button chrome.
		$css .= $uid_sel . ' .sgs-nav-menu__mega-trigger{background:none;border:0;font:inherit;cursor:pointer;}';
		
		/*
		 * Caret flips when the disclosure opens. Bean, 2026-09-10: the flip used to
		 * animate over 300ms while EVERY consumer of this shared `.caret` class opens
		 * its own panel INSTANTLY -- the mega dropdown toggles `display:none/block`
		 * (no transition possible on `display` directly) and the drawer's native
		 * `<details>` has no animation of its own either. An animated caret paired
		 * with an instant panel always reads as lagging behind, in both places that
		 * share this rule, not just the one currently in view -- so this is instant
		 * everywhere rather than a per-consumer carve-out. Since there's no
		 * transition, no reduced-motion override is needed either.
		 */
		$css .= $uid_sel . ' .sgs-nav-menu__caret{display:inline-flex;}';
		$css .= $uid_sel . ' .sgs-nav-menu__mega-trigger[aria-expanded="true"] .sgs-nav-menu__caret{transform:rotate(180deg);}';
		
		/*
		 * Panel anchoring (Bean design-gated — Gate-3 finding). The wrap anchors to
		 * the BAR (`.sgs-nav-menu__bar` is already position:relative in style.css
		 * for the indicator pill), not to the <li>-level hover bridge, so the panel
		 * can exceed a single menu item's width. The draft designs (sites/Mega-menu
		 * design + Indus Foods Mega Menu Design, both at
		 * "position:absolute;top:100%;left:0;right:0" on the header container with
		 * an 1120px-capped centred panel) anchor a wide centred band, so the wrap
		 * centres on the bar and may exceed the bar's width up to the draft's
		 * 1120px cap with the draft's 28px side gutters. MEGA-ONLY by construction:
		 * plain (non-mega) dropdowns, when built, must anchor left-aligned under
		 * their own item — Bean explicitly rejected centring them (the Indus draft
		 * centres its "More" dropdown and it reads badly).
		 *
		 * Hover safety holds because the wrap stays a DOM child of the
		 * `.sgs-nav-menu__mega` bridge — mouseleave fires on DOM containment, not
		 * geometry — and the panel (>= bar width) always extends beneath its own
		 * trigger. Edge overflow: mega-disclosure.js repositionPanel() measures the
		 * centred rect and pins to the bar's right/left edge via the CSS vars below
		 * (--sgs-mm-tx neutralises the centring translate when pinned).
		 *
		 * Hidden-until-open via display:none keeps it out of the a11y tree while
		 * the links remain in the server HTML for crawlers (FR-36-17). No-JS: stays
		 * closed (progressive enhancement, FR-36-7).
		 */
		
		/*
		 * VERTICAL BOUND (2026-09-09). Horizontal overflow was already handled (the
		 * width:min() above + the JS edge-collision vars); the block axis had NO bound
		 * at all, so a long panel rendered past the viewport bottom with no way to
		 * reach it — the panel closes on pointer-leave, so there was nothing to scroll.
		 *
		 * The bound is the panel's OWN top edge measured against the viewport, published
		 * by mega-disclosure.js::repositionPanel as --sgs-mm-panel-max-h (a custom-
		 * property VALUE, which Spec 32 permits; a direct style.maxHeight write would
		 * not be). Measuring is the only cause-agnostic answer here: it is correct
		 * whatever the header is doing — sticky, static, tall, short, absent, or a
		 * non-SGS theme's header entirely — because it asks the panel where it actually
		 * is rather than reconstructing that from something else's geometry.
		 *
		 * ⚠ It must NOT be derived from --sgs-header-height (corrected 2026-09-10; the
		 * first version of this rule did exactly that). That variable is a SCROLL-
		 * PADDING token, not header geometry: header-behaviours/view.js::publishHeight
		 * is called as `publishHeight( isHeaderPinned( header ) ? measuredHeight : 0 )`
		 * and writes the result INLINE on documentElement/body, which outranks the
		 * theme's static :root value. sgs/site-header's `headerSticky` defaults to `{}`
		 * — a NON-sticky header is the framework default — so on a default header the
		 * token resolves to `0px`, the bound collapses to `calc(100dvh - 16px)`, and
		 * the panel overflows the viewport bottom by a full header height. It only ever
		 * looked right because the canary's header happens to be sticky.
		 *
		 * The old expression is kept as the var()'s FALLBACK, so it remains the no-JS /
		 * pre-first-open floor: too generous on a static header, but never zero.
		 * 16px is the spacing-scale step, kept as breathing room above the viewport edge.
		 *
		 * overscroll-behavior:contain stops a scroll that reaches the panel's end from
		 * chaining to the page behind it — the same choice the drawer already makes. It
		 * is NOT what makes the panel wheel-scrollable at all; that is the
		 * `data-lenis-prevent` on the emitted wrap (see the markup note above).
		 */
		$css .= $uid_sel . ' .sgs-nav-menu__mega-panel-wrap{position:absolute;top:100%;left:var(--sgs-mm-overflow-left, 50%);right:var(--sgs-mm-overflow-right, auto);transform:translateX(var(--sgs-mm-tx, -50%));width:min(1120px, calc(100vw - 56px));max-height:var(--sgs-mm-panel-max-h, calc(100dvh - var(--sgs-header-height, 80px) - 16px));overflow-y:auto;overscroll-behavior:contain;z-index:100;display:none;}';
		$css .= $uid_sel . ' .sgs-nav-menu__mega-trigger[aria-expanded="true"] ~ .sgs-nav-menu__mega-panel-wrap{display:block;}';
		
		/*
		 * ── DROPDOWN SUBMENU ────────────────────────────────────────────────────────
		 *
		 * Deliberately mirrors the mega panel's mechanism above rather than inventing a
		 * parallel one: same display:none-until-open (keeps it out of the a11y tree
		 * while the links stay in the server HTML for crawlers, FR-36-17), same
		 * sibling-of-an-expanded-trigger selector, same no-JS-stays-closed progressive
		 * enhancement (FR-36-7). Only the GEOMETRY differs — a dropdown aligns to its
		 * trigger, a mega panel centres on the viewport.
		 *
		 * `left` defaults to 0 (start-aligned under the trigger) and is overridden by
		 * mega-disclosure.js writing --sgs-mm-overflow-left as a custom-property VALUE.
		 * Spec 32: a custom-property value is permitted; a direct style.left write is
		 * not.
		 */
		
		/*
		 * Operator values arrive as custom-property VALUES on the block's own scope, so
		 * the rules below stay static and every override is one declaration deep
		 * (Spec 32: overrides are custom-property values, never inline declarations).
		 * Each is emitted ONLY when the operator actually set it — an unset control
		 * writes no property at all, so the rule's own fallback applies rather than a
		 * hardcoded value overriding it.
		 */
		$sgs_nm_submenu_vars = '';
		foreach (
			array(
				'--sgs-nm-submenu-bg'        => '' !== (string) ( $attributes['submenuBg'] ?? '' )
					? sgs_colour_value( (string) $attributes['submenuBg'] )
					: '',
				'--sgs-nm-submenu-min-width' => sgs_css_length_value( $attributes['submenuMinWidth'] ?? '' ),
				'--sgs-nm-submenu-radius'    => sgs_css_length_value( $attributes['submenuRadius'] ?? '' ),
			) as $sgs_nm_var => $sgs_nm_val
		) {
			if ( '' !== $sgs_nm_val ) {
				$sgs_nm_submenu_vars .= $sgs_nm_var . ':' . $sgs_nm_val . ';';
			}
		}
		if ( '' !== $sgs_nm_submenu_vars ) {
			$css .= $uid_sel . '{' . $sgs_nm_submenu_vars . '}';
		}
		
		$css .= $uid_sel . ' .sgs-nav-menu__submenu-root{position:relative;display:flex;align-items:center;}';
		// Same vertical bound as the mega panel above, and for the same reason — see
		// the VERTICAL BOUND note there. A dropdown is the likelier of the two to run
		// long, since it has no width:min() forcing a wide multi-column layout.
		$css .= $uid_sel . ' .sgs-nav-menu__submenu-wrap{position:absolute;top:100%;left:var(--sgs-mm-overflow-left, 0);max-height:var(--sgs-mm-panel-max-h, calc(100dvh - var(--sgs-header-height, 80px) - 16px));overflow-y:auto;overscroll-behavior:contain;z-index:100;display:none;}';
		
		/*
		 * LIFT THE WHOLE ITEM while its submenu is open (Bean, 2026-07-31 — live-caught:
		 * the site logo painted OVER the open dropdown; hit-testing the panel's centre
		 * returned `sgs-responsive-logo__image--desktop`, not the panel).
		 *
		 * `z-index:100` on the panel alone is not enough. The panel sits inside
		 * stacking contexts its own ancestors create — `.sgs-nav-menu__item{z-index:1}`,
		 * `.sgs-nav-menu__bar{z-index:1}`, `.entry-content{z-index:1}` — so its 100 only
		 * ranks it against its SIBLINGS, never against a later block that forms its own
		 * context. Raising the ancestor that actually competes is the fix. Scoped with
		 * `:has()` to the OPEN state so a closed menu leaves the page's stacking order
		 * exactly as it was. A mega panel never hit this because it lives in the sticky
		 * header, which already outranks page content.
		 */
		$css .= $uid_sel . ' .sgs-nav-menu__item--has-submenu:has([data-sgs-mega-trigger][aria-expanded="true"]){z-index:101;}';
		
		/*
		 * Lift every level we own, not just the item: `.sgs-nav-menu__bar{z-index:1}`
		 * and the block root sit between the item and the page, so a 101 on the item
		 * alone only ordered it against its own siblings.
		 *
		 * WHAT THIS DOES AND DOES NOT FIX (measured 2026-07-31, five sample points):
		 *   HEADER placement — the normal one — is fully correct: the open panel is the
		 *   topmost element at every sampled point, because the header template part is
		 *   `position:sticky; z-index:100` and therefore outranks page content.
		 *   A nav placed inside PAGE CONTENT is NOT fully fixed and cannot be from here:
		 *   the theme's `.entry-content{position:relative;z-index:1}` creates a stacking
		 *   context the block cannot escape, so the sticky header (z-index 100) and the
		 *   footer's own positioned rows (z-index 1, later in document order) still
		 *   paint over the panel. Raising `.entry-content` would put ALL page content
		 *   above the sticky header, which is worse. Tracked as
		 *   P-NAV-DROPDOWN-STACKING-IN-PAGE-CONTENT.
		 * These lifts are still correct and worth keeping: they order the open panel
		 * above rivals WITHIN the same content flow, and they revert the moment it closes.
		 *
		 * Each is keyed on `[data-sgs-mega-trigger][aria-expanded="true"]`, NOT on a bare
		 * `[aria-expanded="true"]`. The burger button binds `aria-expanded` too
		 * (render.php ~607, `data-wp-bind--aria-expanded="state.isOpen"`), so the bare
		 * form also matched whenever the mobile DRAWER opened and lifted the whole nav
		 * for a reason that had nothing to do with a dropdown. Council-caught.
		 */
		$css .= $uid_sel . ':has([data-sgs-mega-trigger][aria-expanded="true"]){position:relative;z-index:101;}';
		$css .= $uid_sel . ' .sgs-nav-menu__bar:has([data-sgs-mega-trigger][aria-expanded="true"]){z-index:101;}';
		$css .= $uid_sel . ' [data-sgs-mega-trigger][aria-expanded="true"] ~ .sgs-nav-menu__submenu-wrap{display:block;}';
		
		/*
		 * EVERY default here is a THEME TOKEN, never a literal (Bean, 2026-07-31 —
		 * live-caught: the first cut hardcoded `#fff` and `rgba(0,0,0,.12)`, so the
		 * panel painted white on a client whose surface token is `#fbf3dc` and ignored
		 * the palette completely, in every style variation). A literal cannot follow a
		 * per-client snapshot or a light/dark variation; a token does, for free. The
		 * short literal after each token is a last-resort safety net for a theme that
		 * defines no palette at all, NOT a design value.
		 */
		$css .= $uid_sel . ' .sgs-nav-menu__submenu{list-style:none;margin:0;padding:8px 0;'
			. 'min-width:var(--sgs-nm-submenu-min-width, 200px);'
			. 'background:var(--sgs-nm-submenu-bg, var(--wp--preset--color--surface-alt, var(--wp--preset--color--surface, #fff)));'
			. 'border:1px solid var(--wp--preset--color--border, transparent);'
			. 'border-radius:var(--sgs-nm-submenu-radius, var(--wp--custom--border-radius--medium, 8px));'
			. 'box-shadow:var(--wp--preset--shadow--raised, 0 4px 12px rgba(0,0,0,.1));}';
		
		/*
		 * submenuPadding — object box model {desktop:{top,right,bottom,left},
		 * tablet:{…}, mobile:{…}}, migrated 2026-08-19 from a flat box object to
		 * match nav-drawer's drawerPadding shape. Emitted as a tier-aware override
		 * of the base rule above via the shared responsive-object helper (same
		 * selector, same specificity, later in source order — so an unset tier
		 * leaves the `8px 0` fallback in place rather than a custom property that
		 * silently drops the value when read as the wrong shape).
		 */
		if ( function_exists( 'sgs_emit_responsive_css' ) && is_array( $attributes['submenuPadding'] ?? null ) ) {
			$css .= sgs_emit_responsive_css(
				$uid_sel . ' .sgs-nav-menu__submenu',
				array(
					array(
						'value'        => $attributes['submenuPadding'],
						'css'          => 'padding',
						'box'          => true,
						'unit_default' => 'px',
					),
				)
			);
		}
		
		$css .= $uid_sel . ' .sgs-nav-menu__subitem{margin:0;}';
		
		/*
		 * 44px min touch target (SGS baseline — beats WCAG 2.2's 24px) and a visible
		 * focus ring. Never remove the outline without replacing it.
		 */
		
		/*
		 * Submenu text defaults to the palette's LINK token (Bean-ruled, 2026-07-31).
		 *
		 * History, because this moved twice and the reasoning matters:
		 *   1. `color:...,inherit` (the first cut) — out-specified the theme's global
		 *      link rule and forced inherited body text, so the palette never applied
		 *      at all. A straight bug; this is what Bean saw.
		 *   2. the TEXT token — palette-driven and high-contrast, chosen because link
		 *      pink `#e68a95` on surface `#fbf3dc` measures 2.25:1 against WCAG AA's
		 *      4.5:1 floor.
		 *   3. the LINK token — BEAN'S RULING, and what ships. He judged the pink-on-
		 *      cream pairing easily legible and aesthetically intended, and ruled the
		 *      AA floor not applicable to it. That is the owner's call on his own brand
		 *      palette: a contrast ratio measures luminance distance, not whether text
		 *      is discernible, and the framework should honour the palette the client
		 *      chose rather than quietly substituting a different colour.
		 * Practical upshot: submenu rows now inherit whatever the theme sets for links,
		 * so they follow the palette AND every style variation for free. The related
		 * `P-MAMAS-PRIMARY-CONTRAST` entry stands on its own merits and is unaffected.
		 * The operator's own colour still overrides, below.
		 */
		$css .= $uid_sel . ' .sgs-nav-menu__sublink{display:flex;align-items:center;min-height:44px;padding:0 16px;'
			. 'text-decoration:none;white-space:nowrap;'
			. 'color:var(--wp--preset--color--primary, currentColor);}';
		
		/*
		 * …EXCEPT in the drawer, where `nowrap` has nothing to wrap into (2026-09-10).
		 *
		 * Exactly the defect style.css already fixes for `.sgs-nav-menu__link`, one
		 * level down: the drawer reuses this same sublink class for a VERTICAL stacked
		 * list, so a long label has no second row to move to and can only push
		 * sideways. Measured on the canary at 375px, the top-level `__link` overflowed
		 * 0px (its fix landed) while the drawer `__sublink` overflowed 222.76px, taking
		 * the drawer to scrollWidth 561 against clientWidth 360 — the horizontal
		 * scrollbar the drawer should never have.
		 *
		 * It has to be emitted HERE rather than in style.css because the `nowrap` it
		 * overrides is emitted here too, at `$uid_sel .sgs-nav-menu__sublink` (0,2,0);
		 * style.css's floor rule for the same selector sits at 0,1,0 and would lose to
		 * it. `:where()` contributes nothing, so this stays at 0,2,0 — identical to the
		 * base rule directly above and winning on source order alone, which keeps it
		 * below any higher-specificity operator override rather than outranking one.
		 */
		$css .= $uid_sel . ' :where(.sgs-nav-menu__bar--drawer) .sgs-nav-menu__sublink{white-space:normal;overflow-wrap:break-word;}';
		
		/*
		 * …and in the drawer specifically, text defaults to the drawer's OWN
		 * WCAG-computed foreground (`color:inherit`, matching every other drawer
		 * text element) rather than the flat bar's link-token default directly
		 * above (Bean, 2026-09-10). Same (0,2,0) technique as the `nowrap` fix
		 * immediately above -- `:where()` costs nothing, `$uid_sel` + `.sublink`
		 * keeps real specificity, positioned AFTER the base rule (wins over it in
		 * the drawer) but BEFORE the operator's `submenuColour` block below (loses
		 * to it when the operator has actually set one).
		 *
		 * The drawer's background is entirely operator-chosen per instance (any
		 * palette colour), which is exactly why the drawer computes its own
		 * foreground in the first place (block.json's `drawerFgHex` note) -- the
		 * flat bar's link-token default has no such per-instance background to
		 * stay safe against, so it can afford to be a fixed brand colour. Applying
		 * that same fixed colour inside the drawer breaks the safety the computed
		 * foreground exists for: on THIS canary instance, the link token and the
		 * chosen `drawerBg` resolve to the identical colour, so a first attempt at
		 * this fix (routing straight to a real global default via `:where()` on
		 * the OLD override instead of adding this one) rendered sub-item text
		 * invisible against its own background — caught live before shipping.
		 */
		$css .= $uid_sel . ' :where(.sgs-nav-menu__bar--drawer) .sgs-nav-menu__sublink{color:inherit;}';
		// D956 — submenuColourGradient is the gradient sibling (778879732 rollout,
		// Phase 3); routed as a direct decl (not the custom-property chain above)
		// because a `var(--x, …)` fed into a fixed `color:` declaration cannot
		// switch to `background-image` for a gradient.
		$submenu_colour_effective = sgs_resolve_text_colour_or_gradient(
			(string) ( $attributes['submenuColour'] ?? '' ),
			(string) ( $attributes['submenuColourGradient'] ?? '' )
		);
		if ( '' !== $submenu_colour_effective ) {
			$submenu_colour_decl = sgs_text_colour_decl( $submenu_colour_effective );
			if ( '' !== $submenu_colour_decl ) {
				$css .= $uid_sel . ' .sgs-nav-menu__sublink{' . $submenu_colour_decl . ';}';
			}
			$css .= sgs_text_colour_gradient_fallback_rule( $uid_sel . ' .sgs-nav-menu__sublink', $submenu_colour_effective );
		}
		if ( '' !== ( $attributes['submenuColourHover'] ?? '' ) ) {
			$css .= sgs_hover_state_rules( "{$uid_sel} .sgs-nav-menu__sublink", "color:" . sgs_colour_value( $attributes['submenuColourHover'] ), ':focus-visible' );
		}
		
		/*
		 * Hover/focus read as DESIGN, not as a stray underline: a tinted row plus a
		 * brand-coloured ring. `currentColor` was wrong here — it resolves to the near
		 * black of body text, which is what Bean saw as a "black underline".
		 */
		$css .= sgs_hover_guarded_rule( $uid_sel . ' .sgs-nav-menu__sublink:hover', 'background:var(--wp--preset--color--surface, rgba(0,0,0,.04))' );
		
		/*
		 * CURRENT-PAGE and FEATURED states for submenu items (Bean, 2026-07-31).
		 *
		 * Both reuse the SAME signals the top-level bar already uses — `aria-current`
		 * (set client-side by markCurrentPage, because the page cache would serve a
		 * stale server-baked value) and the `featuredItemIds` roster — rather than
		 * inventing a submenu-only mechanism. Both default from PALETTE TOKENS, and
		 * both fall back to the operator's own top-level choice when they have set one,
		 * so a submenu inherits the look of the bar it belongs to instead of drifting.
		 *
		 * Everything here is scoped to the block uid, NOT to the bar, so it applies
		 * identically to the drawer's own nav-menu instance — the burger menu holds a
		 * second instance and must not need its own rules.
		 */
		$css .= $uid_sel . ' .sgs-nav-menu__sublink[aria-current="page"]{'
			. 'color:var(--sgs-nm-submenu-current-colour, var(--wp--preset--color--primary-dark, currentColor));'
			. 'font-weight:600;}';
		$css .= $uid_sel . ' .sgs-nav-menu__subitem--featured .sgs-nav-menu__sublink{'
			// Falls back to the operator's TOP-LEVEL featured colours before the token,
			// so a featured child matches the featured bar item by default.
			. 'color:var(--sgs-nm-featured-colour, var(--wp--preset--color--text-inverse, currentColor));'
			. 'background:var(--sgs-nm-featured-bg, var(--wp--preset--color--primary, transparent));'
			. 'font-weight:var(--sgs-nm-featured-weight, 600);'
			. 'border-radius:var(--sgs-nm-featured-radius, 4px);'
			. 'margin:4px 8px;}';
		$css .= sgs_hover_guarded_rule(
			$uid_sel . ' .sgs-nav-menu__subitem--featured .sgs-nav-menu__sublink:hover',
			'color:var(--sgs-nm-featured-colour-hover, var(--sgs-nm-featured-colour, var(--wp--preset--color--text-inverse, currentColor)));'
			. 'background:var(--sgs-nm-featured-bg-hover, var(--wp--preset--color--primary-dark, transparent))'
		);
		$css .= $uid_sel . ' .sgs-nav-menu__sublink:focus-visible{outline:2px solid var(--wp--preset--color--primary, currentColor);outline-offset:-2px;}';
		
		/*
		 * The toggle is a real button next to a real link when the parent has its own
		 * URL, so it needs its own hit area rather than inheriting the link's.
		 */
		$css .= $uid_sel . ' .sgs-nav-menu__subtoggle{display:inline-flex;align-items:center;justify-content:center;'
			. 'min-width:44px;min-height:44px;background:none;border:0;padding:0;cursor:pointer;color:inherit;}';
		$css .= $uid_sel . ' .sgs-nav-menu__subtoggle:focus-visible{outline:2px solid currentColor;outline-offset:-2px;}';
		
		/*
		 * In-drawer: the dropdown becomes an inline accordion, exactly as the mega
		 * panel does below — an absolutely-positioned panel inside the drawer overlays
		 * the items beneath it instead of pushing them down.
		 */
		
		/*
		 * IN-DRAWER SUBMENU — real nested accordion/drill-down markup.
		 *
		 * `.sgs-nav-menu__submenu-root` / `-wrap` no longer render inside a drawer at
		 * all — `render_items_drawer()` above emits `.sgs-nav-menu__accordion(-row)`
		 * / `-summary` instead (a real `<details name>` exclusive accordion, per
		 * FR-36-6), so the CSS that used to reflow those hover-disclosure classes for
		 * the drawer context is gone with them. The structural accordion/drill-down
		 * rules now live in nav-menu/style.css (they are NOT attribute-driven, so
		 * they don't belong in this per-instance scoped block); `nav-drilldown.js`
		 * layers the drill-down slide-to-sub-panel behaviour on top as progressive
		 * enhancement over the identical no-JS accordion markup.
		 *
		 * Everything below still derives from `currentColor` so it works on ANY
		 * drawer background — light, dark or brand — instead of assuming one; these
		 * three rules survive because `.sgs-nav-menu__submenu` / `-sublink` /
		 * `-subtoggle` are the SAME class names the new accordion markup reuses for
		 * its own nested `<ul>`/`<a>` (the subtoggle rule is inert for a drawer
		 * instance specifically — the bar's subtoggle split has no drawer
		 * equivalent — but still serves the flat bar's own dropdowns, so it stays).
		 */
		
		/*
		 * Background default (Bean, 2026-09-10): this used to be an UNCONDITIONAL
		 * literal -- an operator's own `submenuBg` choice (the SAME custom property
		 * the flat bar's dropdown already honours, set on `$uid_sel` above as
		 * `--sgs-nm-submenu-bg` whenever `submenuBg` is non-empty) had zero effect
		 * inside the drawer. Referencing it here costs nothing (no specificity
		 * fight -- a custom property resolves via inheritance of the VALUE, not rule
		 * priority) and the adaptive `color-mix` tint survives as the fallback for an
		 * unset operator value, so an untouched drawer still adapts to whatever
		 * `drawerBg` colour the operator picked, exactly as before.
		 *
		 * Text colour is handled separately, near the base `.sublink` rule above --
		 * see the comment there. It is NOT fixed the same way this background is:
		 * a first attempt did drop the drawer's `color:inherit` all the way down via
		 * `:where()`, and DID let the operator's real `submenuColour` win when set --
		 * but it ALSO fell below the flat bar's unconditional link-token default,
		 * which happened to equal THIS canary instance's own `drawerBg` and rendered
		 * sub-item text in the exact same colour as its own background (measured
		 * live: both `rgb(230, 138, 149)` -- 1:1 contrast, invisible). Caught before
		 * committing, not guessed at.
		 */
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__submenu{box-shadow:none;border:0;min-width:0;'
			. 'background:var(--sgs-nm-submenu-bg, color-mix(in srgb, currentColor 6%, transparent));border-radius:0;padding:0;margin:0;}';
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__sublink{padding:0 16px 0 12px;gap:8px;'
			. 'border-left:2px solid color-mix(in srgb, currentColor 25%, transparent);}';
		// D1011-adjacent (Bean, 2026-09-10): the marker icon lives INSIDE the same
		// 32px indent the border-left always occupied -- 12px padding + 14px icon +
		// 8px gap keeps the visual indent unchanged from before this icon existed.
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__sublink-marker{display:inline-flex;flex-shrink:0;opacity:0.6;}';
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__sublink-marker svg{width:14px;height:14px;}';
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__subtoggle{color:inherit;}';
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__item + .sgs-nav-menu__item,'
			. '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__subitem'
			. '{border-top:1px solid color-mix(in srgb, currentColor 15%, transparent);}';
		$css .= sgs_hover_guarded_rule(
			'.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__link:hover,.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__sublink:hover',
			'background:color-mix(in srgb, currentColor 12%, transparent)'
		);
		
		/*
		 * CURRENT-PAGE gets its OWN persistent treatment, distinct from hover — see the
		 * $hover_targets note above. Weight plus a solid left rule reads as "you are
		 * here" whether or not the pointer is near it.
		 */
		$css .= $uid_sel . ' .sgs-nav-menu__link[aria-current="page"],'
			. $uid_sel . ' .sgs-nav-menu__sublink[aria-current="page"]{font-weight:600;}';
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__link[aria-current="page"],'
			. '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__sublink[aria-current="page"]'
			. '{border-left:3px solid currentColor;background:color-mix(in srgb, currentColor 8%, transparent);}';
		
		/*
		 * A mega-menu item degrades to a plain link inside the drawer
		 * (render_items_drawer(), see its docblock) rather than rendering the mega
		 * panel — so `.sgs-nav-menu__mega-panel-wrap` never appears inside a drawer's
		 * OWN nav-menu instance and needs no in-drawer override here. (FR-36-5's
		 * "the same panel renders inside the drawer" mega-in-drawer capability
		 * remains a declared future item, not yet built.)
		 */
		
		/*
		 * In-drawer width discipline: a vertical drawer menu must FILL the space
		 * available, never shrink-wrap to its longest label. The full width exists
		 * to stop child content — mega panels above all — being cut off, and to
		 * give items proper touch-target size. That is the whole of its rationale.
		 *
		 * It says NOTHING about where the LABEL should sit. Where labels sit depends
		 * on the drawer's design and how much of the screen it covers, so it is the
		 * OPERATOR's pick, made once on the drawer (nav-drawer's "Content alignment"
		 * control) and inherited here. Because the box stays full-width by design,
		 * align-items can move nothing — only text-align moves the label, which is
		 * why the drawer publishes --sgs-drawer-text-align alongside the flex value.
		 * Both fall back to the previous behaviour (stretch / start) outside a drawer
		 * or if the drawer is an older render.
		 */
		$css .= '.sgs-nav-drawer ' . $uid_sel . '{width:100%;}';
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__bar'
			. '{width:100%;align-items:var(--sgs-drawer-align, stretch);}';
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__link,'
			. '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__sublink'
			. '{text-align:var(--sgs-drawer-text-align, start);}';
		
		/*
		 * listColumns (design gate 2026-07-28) — in-drawer vertical list layout ONLY
		 * (nav-drawer/style.css:52-53 already suppresses this bar's horizontal/burger
		 * mode and stacks it vertically whenever a nav-menu sits inside a drawer; the
		 * HORIZONTAL bar mode is untouched by this attribute entirely). 1 column (the
		 * default, an empty/unset object) leaves the existing flex-column stack from
		 * nav-drawer/style.css unchanged — byte-identical. >=2 columns switches the
		 * bar to a CSS grid (studionamma's 2-column desktop -> 1-column mobile merge).
		 * The extra `.wp-block-sgs-nav-menu` qualifier gives this rule certain
		 * precedence over nav-drawer/style.css's `display:flex` rule at any tier
		 * this attribute is actually set (both are 3-selector-part rules; source
		 * order alone should not be relied on across two different stylesheets).
		 */
		if ( function_exists( 'sgs_emit_responsive_css' ) && is_array( $attributes['listColumns'] ?? null ) && ! empty( $attributes['listColumns'] ) ) {
			$drawer_bar_sel = '.sgs-nav-drawer ' . $uid_sel . '.wp-block-sgs-nav-menu .sgs-nav-menu__bar';
			$css           .= sgs_emit_responsive_css(
				$drawer_bar_sel,
				array(
					array(
						'value'     => $attributes['listColumns'],
						'css'       => 'display',
						'transform' => static function () {
							return 'grid';
						},
					),
					array(
						'value'     => $attributes['listColumns'],
						'css'       => 'grid-template-columns',
						'transform' => static function ( $raw ) {
							$n = max( 1, absint( $raw ) );
							return 'repeat(' . $n . ', minmax(0, 1fr))';
						},
					),
				)
			);
		}
		
		/*
		 * Stacking escape for an IN-CONTENT nav (2026-07-28, Gate-3 finding). The
		 * page-content container (`.entry-content`) and the site-footer rows each
		 * carry `z-index:1`; at equal z the LATER context paints on top, so an open
		 * panel belonging to a nav placed inside page content was painted over by
		 * the footer — hit-testing then reached the footer, fired mouseleave on the
		 * hover bridge, and closed the panel 170ms later ("unhoverable"). While
		 * THIS instance's panel is open, lift its entry-content context above its
		 * sibling contexts. Fires only for an in-content nav (a header nav has no
		 * `.entry-content` ancestor — the header carries its own base z-index, see
		 * site-header/style.css), only while open, and is scoped by uid. Verified
		 * live by injection: 400ms diagonal hover survives with it, closes without.
		 */
		$css .= '.entry-content:has(' . $uid_sel . ' .sgs-nav-menu__mega-trigger[aria-expanded="true"]){z-index:2;}';
		// The "View all X" fallback now renders INSIDE the panel (sgs/mega-panel's
		// footer slot), so it is styled as a panel footer row rather than a bare
		// line: separated from the content above, aligned with the panel's own
		// padding box, and never sitting under the trigger's hover underline.
		$css .= $uid_sel . ' .sgs-nav-menu__mega-viewall{display:inline-block;margin-top:16px;font-size:14px;font-weight:600;text-decoration:underline;text-underline-offset:3px;}';
		
		/*
		 * 4h-i. Sliding indicator colour override (Mega-Menu Build Spec §6 row 2).
		 * The pill's shape/motion (position/transform/opacity/transition) is
		 * STRUCTURAL and lives in style.css — only the operator-chosen fill (or its
		 * token default) is attribute-driven, so it belongs in the scoped <style>.
		 */
		if ( 'pill' === $indicator_style && '' !== $indicator_colour ) {
			$css .= $uid_sel . ' .sgs-nav-menu__indicator{' . sgs_background_paint_decl( $indicator_colour, $indicator_colour_gradient ) . ';}';
		}
		
		// 4g-bis. ROOT BOX — max-width + native spacing + responsive padding tiers.
		//
		// These were SGS_Container_Wrapper's job until this block exited it (D539).
		// Measured before the exit: nav-menu declared 24 of the wrapper's ~107
		// attribute keys and only THREE were reachable by a client — maxWidth and the
		// two padding tiers. The other 21 had no control anywhere and were frozen at
		// their block.json defaults forever. They were deleted, not reproduced.
		//
		// maxWidth then went too (D540) — the parent owns this block's width, see the
		// note at the removed emission below. So the wrapper vocabulary this block still
		// carries is TWO keys: the padding tiers. `gap` survives as its own control but
		// was never part of the reachable-wrapper count above.
		//
		// ⛔ Native `spacing` is declared with __experimentalSkipSerialization, so
		// WordPress does NOT inline padding/margin — whoever renders the root MUST emit
		// it scoped or both controls are silently dead. The wrapper used to do this.
		// ⛔ No `max-width` here, deliberately (D540, Bean). This block is ALWAYS a
		// child — of a site-header-row or of sgs/nav-drawer — and the PARENT owns width.
		// The nav's own width is intrinsic to its items, and collapsed to a burger it
		// wraps its content. A max-width on this element was a second, competing place
		// to control the same thing; the row's own width controls were wired at D539.
		// Evidence at removal: no theme pattern set it, and the live canary computed
		// `max-width: none`. Do not reintroduce it — add it to the PARENT row instead.
		$root_box_css = '';
		
		$nav_base_spacing = array();
		foreach ( array(
			'padding' => $sgs_tor_padding_desktop,
			'margin'  => $sgs_tor_margin_desktop,
		) as $spacing_prop => $raw_sides ) {
			if ( ! is_array( $raw_sides ) ) {
				continue;
			}
			$sides = array();
			foreach ( $raw_sides as $side => $value ) {
				if ( is_string( $value ) && '' !== $value ) {
					$sides[ $side ] = $value;
				}
			}
			if ( $sides ) {
				$nav_base_spacing[ $spacing_prop ] = $sides;
			}
		}
		if ( $nav_base_spacing ) {
			// The style engine resolves preset tokens (var:preset|spacing|40) that a raw
			// string concat would emit verbatim and the browser would drop.
			$nav_spacing_styles = wp_style_engine_get_styles( array( 'spacing' => $nav_base_spacing ) );
			if ( ! empty( $nav_spacing_styles['css'] ) ) {
				$root_box_css .= $uid_sel . '{' . $nav_spacing_styles['css'] . '}';
			}
		}
		
		// Device-tier padding. 767/1023 mirrors what the wrapper emitted for these exact
		// attributes (verified against class-sgs-container-wrapper.php before the exit),
		// so the rendered breakpoints do not move — this is the locked 768/1024 device
		// standard, NOT an arbitrary visual breakpoint.
		foreach ( array(
			array( $sgs_tor_padding_tiers['tablet'] ?? null, '(max-width:1023px)' ),
			array( $sgs_tor_padding_tiers['mobile'] ?? null, '(max-width:767px)' ),
		) as $nav_tier ) {
			list( $tier_box_raw, $tier_mq ) = $nav_tier;
			$tier_box = is_array( $tier_box_raw ) ? $tier_box_raw : array();
			if ( ! $tier_box ) {
				continue;
			}
			$tier_shorthand = sgs_box_object_shorthand( $tier_box );
			if ( null !== $tier_shorthand && '' !== $tier_shorthand ) {
				$root_box_css .= '@media ' . $tier_mq . '{' . $uid_sel . '{padding:' . $tier_shorthand . ';}}';
			}
		}
		
		// `gap` — the "Item gap" control. Emitted on the BAR (the <ul> whose flex
		// children ARE the item links), not on the root.
		//
		// ⚠ THIS IS A BUG FIX, not a like-for-like port. SGS_Container_Wrapper emitted
		// gap at $grid_sel, which for this block resolved to the ROOT
		// (class-sgs-container-wrapper.php:1192 — contentWidth 'full' meant no band, so
		// no __inner). The root's flex children are the bar and the toggle, and §4f
		// swaps those by display:none at the collapse point, so exactly ONE flex child
		// exists at any width — and a flex gap between one item paints nothing. The
		// control has therefore been inert for its whole life while looking wired: it
		// had a label, a value and a reset, and changed the page not at all.
		$nav_gap = isset( $attributes['gap'] ) ? sgs_css_length_value( (string) $attributes['gap'] ) : '';
		if ( '' !== $nav_gap ) {
			$root_box_css .= $uid_sel . ' .sgs-nav-menu__bar{gap:' . $nav_gap . ';}';
		}
		
		if ( '' !== $root_box_css ) {
			$css .= $root_box_css;
		}
		
		// 4h. Free-text custom CSS escape hatch — sanitised (letters/digits/basic CSS
		// punctuation only) and stripped of any </style> breakout below with the rest.
		if ( ! empty( $attributes['sgsCustomCss'] ) ) {
			$css .= preg_replace( '/<\/?script/i', '', (string) $attributes['sgsCustomCss'] );
		}

		return $css;
	}
}
