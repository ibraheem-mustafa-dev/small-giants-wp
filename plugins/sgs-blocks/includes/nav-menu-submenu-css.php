<?php
/**
 * SGS Nav Menu (sgs/nav-menu) — scoped CSS, part 2: submenu/dropdown, drawer
 * fork, sliding indicator, root box.
 *
 * Split out of render.php (Spec 41 step 8) — the bar/burger collapse-point
 * switch, mega-menu + dropdown disclosure positioning, the submenu LINK's own
 * three-state colour/fill family and its typography, drawer-specific
 * submenu/sublink/current-page overrides, listColumns in-drawer grid, the
 * sliding-indicator colour override, the root box (native spacing + responsive
 * padding tiers), and the free-text custom-CSS escape hatch.
 *
 * ⚠ The MENU BUTTON's own CSS is NOT here — it moved to
 * `includes/nav-menu-trigger-css.php` at step 15, because it is a separate
 * element with its own inspector panel.
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
	 * @param array  $treatments             RESOLVED hover treatments from
	 *                                        `sgs_nav_menu_resolved_treatments()` —
	 *                                        ⛔ never the stored attribute.
	 * @param string $trigger_mode           Resolved `triggerMode` (icon|text|icon-and-text).
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
		array $sgs_tor_margin_desktop,
		array $treatments = array(),
		string $trigger_mode = 'icon'
	): string {
		$css         = '';
		$sublink_sel = $uid_sel . ' .sgs-nav-menu__sublink';
		$t_sub_text  = (string) ( $treatments['submenuColourHoverTreatment'] ?? 'swap' );
		$t_sub_bg    = (string) ( $treatments['submenuLinkBgHoverTreatment'] ?? 'swap' );
		// Read once: census #9 gates the panel's own border on it, and census #1
		// gates the drawer's `border:0` SUPPRESSION on the same value.
		$sgs_nm_submenu_border_box = is_array( $attributes['submenuBorderWidth'] ?? null ) ? $attributes['submenuBorderWidth'] : array();

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
		/*
		 * submenuBg/submenuBgGradient (2026-09-11, classify-end-shape closeout):
		 * sgs_custom_property_gradient_decls() emits `--sgs-nm-submenu-bg` and,
		 * only when set, a sibling `--sgs-nm-submenu-bg-gradient` — matching the
		 * shared "fill-custom-property-gradient" end shape every other
		 * background/border custom-property row in this codebase already uses.
		 * No hover pair: submenu-bg is Normal-only by design (colourExemptions,
		 * block.json — the panel is structurally unhoverable once open).
		 */
		$sgs_nm_submenu_bg_decls = sgs_custom_property_gradient_decls(
			'sgs-nm-submenu-bg',
			(string) ( $attributes['submenuBg'] ?? '' ),
			(string) ( $attributes['submenuBgGradient'] ?? '' )
		);

		$sgs_nm_submenu_vars = '';
		if ( ! empty( $sgs_nm_submenu_bg_decls ) ) {
			$sgs_nm_submenu_vars .= implode( ';', $sgs_nm_submenu_bg_decls ) . ';';
		}
		foreach (
			array(
				'--sgs-nm-submenu-min-width' => sgs_css_length_value( $attributes['submenuMinWidth'] ?? '' ),
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
		/*
		 * `submenuTopOffset` (FR-41-11) — emitted as `calc(100% + <offset>)` so the
		 * `100%` anchor is preserved and only the GAP is operator-owned. Empty
		 * renders today's output exactly.
		 */
		$submenu_top_offset = sgs_css_length_value( $attributes['submenuTopOffset'] ?? '' );
		$submenu_wrap_top   = '' !== $submenu_top_offset ? 'calc(100% + ' . $submenu_top_offset . ')' : '100%';

		$css .= $uid_sel . ' .sgs-nav-menu__submenu-wrap{position:absolute;top:' . $submenu_wrap_top . ';left:var(--sgs-mm-overflow-left, 0);max-height:var(--sgs-mm-panel-max-h, calc(100dvh - var(--sgs-header-height, 80px) - 16px));overflow-y:auto;overscroll-behavior:contain;z-index:100;display:none;}';

		/*
		 * ⛔ A non-zero offset creates a hover DEAD STRIP, and that reintroduces the
		 * exact bug FR-41-13 exists to fix: the gap belongs to neither element, so
		 * as the pointer crosses it neither is hovered and the parent flickers back
		 * to its resting paint mid-journey. The bridge is MANDATORY and ships in
		 * the same change.
		 *
		 * ⛔ `submenuCloseGrace` does NOT cover this — it is a `setTimeout` on the
		 * bridge element's `mouseleave` that defers `ctx.isOpen = false`. It governs
		 * OPENNESS and never touches CSS `:hover`. The panel correctly stays open
		 * across the gap today; the parent's PAINT does not.
		 *
		 * Safe by construction: `.sgs-nav-menu__submenu-wrap::before` is claimed by
		 * nothing; the wrap is already `position:absolute`, so it is its own
		 * containing block; and a `display:none` element has no pseudo-elements, so
		 * the bridge exists only while the panel is open and can never sit
		 * invisibly over the bar.
		 */
		if ( '' !== $submenu_top_offset ) {
			$css .= $uid_sel . ' .sgs-nav-menu__submenu-wrap::before{content:"";position:absolute;left:0;right:0;bottom:100%;height:' . $submenu_top_offset . ';pointer-events:auto;}';
		}

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
		/*
		 * CENSUS #9 — per-declaration, none handled "somewhere else":
		 *
		 *   background-color / background-image  NO CHANGE — `--sgs-nm-submenu-bg`
		 *     has a real writer (`submenuBg`), emitted inside an empty-guard so an
		 *     unset attribute writes no property at all and the chained
		 *     surface-alt -> surface -> #fff fallback applies.
		 *   min-width                            NO CHANGE — attribute-driven from
		 *     `submenuMinWidth` through the same guarded block.
		 *   border-radius                        NO CHANGE — see the ⚠ below.
		 *   border                               CONVERT — the only `border`
		 *     declaration on the rule with no attribute behind it. It now reads
		 *     `submenuBorderWidth` / `submenuBorderStyle` through custom properties
		 *     whose UNSET fallback is the previous literal, and its COLOUR through
		 *     the shared `sgs_border_states_css()` (Normal-only, FR-41-9: a panel
		 *     that cannot be hovered for one property cannot be hovered for another)
		 *     appended after this rule, so a set colour wins on source order and an
		 *     unset one leaves the token fallback below in place.
		 *   box-shadow                           CONVERT — reads `submenuShadow` /
		 *     `submenuShadowColour` via the shared `sgs_shadow_value_composed()`,
		 *     same unset-fallback discipline.
		 *
		 * `--sgs-nm-submenu-radius` was CONVERTED here (found dead-but-firing after
		 * step 10's manifest rewrite deleted `submenuRadius` in favour of the
		 * object-typed `submenuBorderRadius` — FR-41-15's per-declaration table still
		 * said "NO CHANGE" against the pre-rewrite attribute name, which had gone
		 * stale; found and fixed during step 16, same CONVERT shape as census #7 and
		 * the submenu current-colour row: keep the `var()`, rewire the writer to the
		 * real attribute, keep the unset fallback so an untouched nav is unchanged).
		 * `submenuBorderRadius` is a FLAT corner object, read through
		 * `sgs_corner_object_shorthand()` — NOT the side-keyed box helper — matching
		 * `itemBorderRadius`'s own precedent above in nav-menu-css.php. Its declared
		 * default is `{}` (empty), so an untouched panel writes no property at all and
		 * the chained token fallback below applies exactly as before.
		 */
		$sgs_nm_submenu_border_style  = sgs_css_keyword_sanitise( $attributes['submenuBorderStyle'] ?? '' );
		$sgs_nm_submenu_border_w      = $sgs_nm_submenu_border_box ? sgs_box_object_shorthand( $sgs_nm_submenu_border_box ) : null;
		$sgs_nm_submenu_radius_shorthand = sgs_corner_object_shorthand( $attributes['submenuBorderRadius'] ?? null );
		$sgs_nm_submenu_shadow        = sgs_shadow_value_composed(
			(string) ( $attributes['submenuShadow'] ?? '' ),
			(string) ( $attributes['submenuShadowColour'] ?? '' )
		);

		$sgs_nm_panel_vars = '';
		if ( null !== $sgs_nm_submenu_border_w && '' !== $sgs_nm_submenu_border_w ) {
			$sgs_nm_panel_vars .= '--sgs-nm-submenu-border-width:' . $sgs_nm_submenu_border_w . ';';
		}
		if ( '' !== $sgs_nm_submenu_border_style ) {
			$sgs_nm_panel_vars .= '--sgs-nm-submenu-border-style:' . $sgs_nm_submenu_border_style . ';';
		}
		if ( null !== $sgs_nm_submenu_radius_shorthand && '' !== $sgs_nm_submenu_radius_shorthand ) {
			$sgs_nm_panel_vars .= '--sgs-nm-submenu-radius:' . $sgs_nm_submenu_radius_shorthand . ';';
		}
		if ( '' !== $sgs_nm_submenu_shadow ) {
			$sgs_nm_panel_vars .= '--sgs-nm-submenu-shadow:' . $sgs_nm_submenu_shadow . ';';
		}
		if ( '' !== $sgs_nm_panel_vars ) {
			$css .= $uid_sel . '{' . $sgs_nm_panel_vars . '}';
		}

		$css .= $uid_sel . ' .sgs-nav-menu__submenu{list-style:none;margin:0;padding:8px 0;'
			. 'min-width:var(--sgs-nm-submenu-min-width, 200px);'
			. 'background-color:var(--sgs-nm-submenu-bg, var(--wp--preset--color--surface-alt, var(--wp--preset--color--surface, #fff)));'
			. 'background-image:var(--sgs-nm-submenu-bg-gradient, none);'
			. 'border-width:var(--sgs-nm-submenu-border-width, 1px);'
			. 'border-style:var(--sgs-nm-submenu-border-style, solid);'
			. 'border-color:var(--wp--preset--color--border, transparent);'
			. 'border-radius:var(--sgs-nm-submenu-radius, var(--wp--custom--border-radius--medium, 8px));'
			. 'box-shadow:var(--sgs-nm-submenu-shadow, var(--wp--preset--shadow--raised, 0 4px 12px rgba(0,0,0,.1)));}';

		// Normal-only, by FR-41-9: no `hover`, no `current`, and no `suppress_edges`
		// key at all. Emits nothing when neither colour attribute is set, so the
		// token fallback in the rule above survives untouched.
		$css .= sgs_border_states_css(
			$uid_sel . ' .sgs-nav-menu__submenu',
			$attributes,
			array(
				'base'     => 'submenuBorderColour',
				'gradient' => 'submenuBorderColourGradient',
				'width'    => ( null !== $sgs_nm_submenu_border_w && '' !== $sgs_nm_submenu_border_w ) ? $sgs_nm_submenu_border_w : '1px',
			)
		);
		
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
		$submenu_colour          = (string) ( $attributes['submenuColour'] ?? '' );
		$submenu_colour_hover    = (string) ( $attributes['submenuColourHover'] ?? '' );
		$submenu_colour_current  = (string) ( $attributes['submenuColourCurrent'] ?? '' );
		$submenu_colour_effective = sgs_resolve_text_colour_or_gradient(
			$submenu_colour,
			(string) ( $attributes['submenuColourGradient'] ?? '' )
		);

		/*
		 * ⚠ The sublink Sweep selector EXCLUDES featured sub-items. A featured
		 * sub-item paints a real background directly on `.sgs-nav-menu__sublink`
		 * (from `featuredBg`, republished as `--sgs-nm-featured-bg`), which
		 * `background-clip:text` would clip to the glyph shapes. The predicate is
		 * per-ROW and "featured" is a per-ITEM distinction, so adding `featuredBg`
		 * to condition 1 would withdraw Sweep from EVERY sub-item whenever a
		 * featured pill exists anywhere — punishing the ordinary rows for the
		 * featured one. Scoping the selector is the narrow fix, and it matches how
		 * the featured item is already treated as owning its own treatment.
		 * ⛔ If this scoping is ever removed, `featuredBg` AND `featuredBgGradient`
		 * MUST join the row's declared `blockingBackgroundAttrs` and Sweep must be
		 * withdrawn from the whole row — those are the only two compliant outcomes.
		 */
		$sublink_sweep_sel = $uid_sel . ' .sgs-nav-menu__subitem:not(.sgs-nav-menu__subitem--featured) .sgs-nav-menu__sublink';
		$sublink_sweep     = array(
			'base'  => '',
			'hover' => '',
		);
		$submenu_sweep_hover = '';
		if ( 'sweep' === $t_sub_text && '' !== $submenu_colour_hover ) {
			$submenu_sweep_hover = sgs_colour_value( $submenu_colour_hover );
			$sublink_sweep       = sgs_nav_menu_text_sweep_css(
				$sublink_sweep_sel,
				'' !== $submenu_colour ? sgs_colour_value( $submenu_colour ) : '',
				$submenu_sweep_hover
			);
		}

		if ( '' !== $sublink_sweep['base'] ) {
			$css .= $sublink_sweep['base'];
		} elseif ( '' !== $submenu_colour_effective ) {
			$submenu_colour_decl = sgs_text_colour_decl( $submenu_colour_effective );
			if ( '' !== $submenu_colour_decl ) {
				$css .= $sublink_sel . '{' . $submenu_colour_decl . ';}';
			}
			$css .= sgs_text_colour_gradient_fallback_rule( $sublink_sel, $submenu_colour_effective );
		}

		/*
		 * Current BEFORE Hover, and never guarded (FR-41-3 binding rule 3).
		 *
		 * FR-41-15 CONVERT: the Current colour is written as the custom property
		 * the existing `[aria-current="page"]` rule below ALREADY consumes,
		 * rather than as a second competing rule. `--sgs-nm-submenu-current-colour`
		 * was dead-but-firing — declared in that rule's `var()` and written
		 * NOWHERE in the tree, so it could only ever render its own hardcoded
		 * fallback. Writing it from `submenuColourCurrent` makes the rule
		 * attribute-driven and keeps `var(--wp--preset--color--primary-dark,
		 * currentColor)` as the unset fallback, so an untouched nav renders
		 * identically.
		 */
		if ( '' !== $submenu_colour_current ) {
			$css .= $uid_sel . '{--sgs-nm-submenu-current-colour:' . sgs_colour_value( $submenu_colour_current ) . ';}';
		}

		if ( '' !== $sublink_sweep['hover'] ) {
			$css .= $sublink_sweep['hover'];
		} elseif ( 'none' !== $t_sub_text && '' !== $submenu_colour_hover ) {
			$css .= sgs_hover_state_rules( $sublink_sel, 'color:' . sgs_colour_value( $submenu_colour_hover ), ':focus-visible' );
		}

		/*
		 * ── SUBMENU LINK BACKGROUND — the genuinely hoverable surface (FR-41-9).
		 *
		 * The PANEL is Normal-only (it is never itself the hovered surface); the
		 * LINK carries the full three-state fill family under its own attribute
		 * names. ⛔ `submenuBg*` names are NOT reused here — two elements sharing
		 * one attribute prefix is exactly the element-conflation this split ends.
		 *
		 * `submenuLinkBgHoverTreatment` is a TWO-option row (none|swap): the shared
		 * sliding pill is an ITEM-row mechanism and a per-link sweep band on a
		 * strictly vertical list has no precedent.
		 */
		$sublink_bg_normal  = sgs_background_paint_decl(
			(string) ( $attributes['submenuLinkBg'] ?? '' ),
			sgs_css_gradient_value( $attributes['submenuLinkBgGradient'] ?? '' )
		);
		$sublink_bg_hover   = 'none' === $t_sub_bg
			? ''
			: sgs_background_paint_decl( (string) ( $attributes['submenuLinkBgHover'] ?? '' ), '' );
		$sublink_bg_current = sgs_background_paint_decl( (string) ( $attributes['submenuLinkBgCurrent'] ?? '' ), '' );

		if ( '' !== $sublink_bg_normal ) {
			$css .= $sublink_sel . '{' . $sublink_bg_normal . ';}';
		}
		if ( '' !== $sublink_bg_current ) {
			$css .= $sublink_sel . '[aria-current="page"]{' . $sublink_bg_current . ';}';
		}
		if ( '' !== $sublink_bg_hover ) {
			$css .= sgs_hover_state_rules( $sublink_sel, $sublink_bg_hover, ':focus-visible' );
		}

		// FR-41-22(b) — submenu typography. ⛔ Without this line every one of the
		// `submenu*` typography attributes is a dead control and the build fails
		// `check-dead-controls.js`. The hover trio has no branch in the shared
		// helper at all, hence the block-private companion emitter beside it.
		$css .= sgs_typography_css_rule( $attributes, 'submenu', $sublink_sel );
		$css .= sgs_nav_menu_typography_hover_rule( $attributes, 'submenu', $sublink_sel, $submenu_sweep_hover );

		/*
		 * ⛔ FR-41-15 census #6 — DELETED. It emitted an unconditional
		 * `background:var(--wp--preset--color--surface, …)` tint on
		 * `.sgs-nav-menu__sublink:hover`, ungated on any attribute, through
		 * `sgs_hover_guarded_rule()` (which is why two literal-string scans missed
		 * it), scoped to `$uid_sel` so it fired on the bar's dropdown AND inside the
		 * drawer. Three independent reasons, any one sufficient: (a) it painted a
		 * tint the operator never asked for IN ADDITION to the `submenuLinkBgHover`
		 * they did — the F3b silent-override class; (b) it is the `background`
		 * SHORTHAND, so it reset `background-image` to `none` and DESTROYED the
		 * sublink text Sweep in both forks while `-webkit-text-fill-color:transparent`
		 * still applied, rendering the hovered word at ~4% opacity; (c) its own
		 * comment recorded it as a 2026-07-31 design fix for a stray underline — a
		 * problem the operator's own three-state fill now answers directly.
		 * ⚠ An untouched sublink now shows no hover tint. Same accepted
		 * default-reduction as census #4 and #8, closed the same way: one
		 * `submenuLinkBgHover` entry.
		 */

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
		// CONVERTED (census row 1 of the fate table): the colour now reads the
		// `--sgs-nm-submenu-current-colour` this file WRITES from
		// `submenuColourCurrent` (above) instead of a property with no writer
		// anywhere in the tree; the token fallback is kept verbatim so an
		// untouched nav renders identically. The `font-weight:600` half moved out
		// with the bar's own current-page weight rule — it is now
		// `itemFontWeightCurrent` under FR-41-6's never-lighter guard.
		$css .= $uid_sel . ' .sgs-nav-menu__sublink[aria-current="page"]{'
			. 'color:var(--sgs-nm-submenu-current-colour, var(--wp--preset--color--primary-dark, currentColor));}';

		/*
		 * CENSUS #7 — CONVERTED, not deleted. Unlike #4/#6/#8 the `var()` half here
		 * is genuinely attribute-driven: `featuredBg` / `featuredColour` /
		 * `featuredRadius` / `featuredFontWeight` are real attributes whose RESOLVED
		 * values `nav-menu-css.php` republishes as `--sgs-nm-featured-*` on
		 * `$uid_sel`, deliberately, so a featured SUB-item mirrors the featured BAR
		 * item.
		 *
		 * ⛔ What went is the FALLBACK. The custom-property writer is conditional, so
		 * with no featured colours set `--sgs-nm-featured-bg` was never written and
		 * this rule fell through to `var(--wp--preset--color--primary, transparent)`
		 * — painting every featured sub-item as a `primary` pill with inverse text
		 * that nobody asked for. It is now emitted ONLY when that property is
		 * actually written (the same gate that writes it), and `background:` became
		 * `background-color:` so the shorthand can never reset a sweep's
		 * `background-image` on this selector.
		 */
		$sgs_nm_featured_bg_written = '' !== (string) ( $attributes['featuredBg'] ?? '' )
			|| '' !== (string) ( $attributes['featuredBgGradient'] ?? '' )
			|| '' !== (string) ( $attributes['featuredColour'] ?? '' );
		if ( $sgs_nm_featured_bg_written ) {
			$css .= $uid_sel . ' .sgs-nav-menu__subitem--featured .sgs-nav-menu__sublink{'
				. 'color:var(--sgs-nm-featured-colour, var(--wp--preset--color--text-inverse, currentColor));'
				. 'background-color:var(--sgs-nm-featured-bg);'
				. 'font-weight:var(--sgs-nm-featured-weight, 600);'
				. 'border-radius:var(--sgs-nm-featured-radius, 4px);'
				. 'margin:4px 8px;}';
		}

		/*
		 * ⛔ FR-41-15 census #8 — DELETED. The third instance of one defect shape,
		 * identical to #4 and #6 on every axis: unconditional, ungated, `background`
		 * SHORTHAND, `:hover` state, emitted through `sgs_hover_guarded_rule()`,
		 * `$uid_sel`-scoped so it fired in BOTH forks, destroying the sublink Sweep
		 * by the same mechanism. ⚠ AND BOTH of its custom properties were DEAD:
		 * `--sgs-nm-featured-bg-hover` and `--sgs-nm-featured-colour-hover` have no
		 * writer anywhere in the tree, so the rule could only ever paint its own
		 * hardcoded `primary-dark` fallback, on every render, in every install.
		 * Superseded outright by the submenu link's own three-state fill.
		 */
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
		/*
		 * CENSUS #1 — CONVERTED. The `background` half was already attribute-driven
		 * (`--sgs-nm-submenu-bg` HAS a real writer, from `submenuBg`), so it keeps
		 * its `color-mix` fallback untouched. The `border:0` half was a hardcoded
		 * SUPPRESSION: it may keep zeroing the bar's own panel border inside the
		 * drawer, but it must NOT survive once `submenuBorderWidth` is set, or an
		 * operator's drawer panel border silently renders nothing. It is now emitted
		 * only while that attribute is empty.
		 */
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__submenu{box-shadow:none;min-width:0;'
			. ( $sgs_nm_submenu_border_box ? '' : 'border:0;' )
			. 'background:var(--sgs-nm-submenu-bg, color-mix(in srgb, currentColor 6%, transparent));border-radius:0;padding:0;margin:0;}';
		// CENSUS #2 — KEPT. This is the drawer's resting sub-item INDENT, not a
		// stateful rule: the marker icon's 12px padding + 14px icon + 8px gap is
		// measured against the 32px indent this border occupies (see the note
		// directly below). Structural, so FR-41-7's one-border rule does not claim
		// it and the double-line bug that condemns #3/#10 cannot occur here.
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__sublink{padding:0 16px 0 12px;gap:8px;'
			. 'border-left:2px solid color-mix(in srgb, currentColor 25%, transparent);}';
		// D1011-adjacent (Bean, 2026-09-10): the marker icon lives INSIDE the same
		// 32px indent the border-left always occupied -- 12px padding + 14px icon +
		// 8px gap keeps the visual indent unchanged from before this icon existed.
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__sublink-marker{display:inline-flex;flex-shrink:0;opacity:0.6;}';
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__sublink-marker svg{width:14px;height:14px;}';
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__subtoggle{color:inherit;}';
		/*
		 * ⛔ FR-41-15 census #3 — DELETED, and its STATIC TWIN in `style.css`
		 * (`.sgs-nav-menu__item--drawer + .sgs-nav-menu__item--drawer`, census #10)
		 * with it. This was the drawer's hardcoded item separator, and FR-41-7 is
		 * explicit that the item border is the ONE separator mechanism. Leaving it
		 * meant an operator setting a bottom `itemBorderWidth` got TWO horizontal
		 * lines between drawer rows — their own on the link's border box, this one
		 * on the next `<li>`'s top edge — the double-line bug class this redesign
		 * exists to remove, invisible to specificity reasoning because the two rules
		 * sit on different elements and never compete; they simply both paint.
		 * ⚠ Deleting ONE of the pair would have left the bug fully intact through a
		 * fix that read as complete: the selectors differ, the painted edge does not.
		 * ⚠ An untouched drawer now ships no separator — the accepted
		 * default-reduction FR-41-17a(a) records, closed by one `itemBorderWidth`.
		 *
		 * ⛔ FR-41-15 census #4 — DELETED. The drawer's unconditional
		 * `background:color-mix(…12%…)` hover tint on link AND sublink. Superseded by
		 * `itemBgHover` / `submenuLinkBgHover`; and as the `background` SHORTHAND at
		 * four classes plus `:hover` it out-ranked the Sweep's own base rule and reset
		 * `background-image` to `none` while `-webkit-text-fill-color:transparent`
		 * still applied — rendering the hovered word at ~12% opacity on every drawer
		 * using Sweep, silently in both directions (a `getComputedStyle(el).color`
		 * check still returns the operator's colour).
		 *
		 * ⛔ FR-41-15 census #5 — DELETED, both declarations. The `border-left:3px`
		 * is superseded by the item border's own Current state (FR-41-7) and the
		 * `background` tint by `itemBgCurrent` / `submenuLinkBgCurrent`. Leaving
		 * either would paint IN ADDITION to the operator's choice — a tint they never
		 * asked for on top of the colour they did.
		 *
		 * The bar's own `[aria-current="page"]{font-weight:600}` pair is CONVERTED,
		 * not deleted: `nav-menu-css.php` now emits the same two selectors from
		 * `itemFontWeightCurrent` under FR-41-6's never-lighter guard, which renders
		 * byte-identically while `itemFontWeight` is unset (its shipped default).
		 */

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
