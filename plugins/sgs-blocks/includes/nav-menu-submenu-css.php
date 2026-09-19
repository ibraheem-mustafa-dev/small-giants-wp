<?php
/**
 * SGS Nav Bar Menu / Nav Drawer Menu — scoped CSS, part 2: submenu/dropdown,
 * drawer fork, sliding indicator, root box.
 *
 * Emits the bar/burger collapse-point
 * switch, mega-menu + dropdown disclosure positioning, the submenu LINK's own
 * three-state colour/fill family and its typography, drawer-specific
 * submenu/sublink/current-page overrides, listColumns in-drawer grid, the
 * sliding-indicator colour override, the root box (native spacing + responsive
 * padding tiers), and the free-text custom-CSS escape hatch.
 *
 * ⚠ The MENU BUTTON's own CSS is NOT here — it lives in
 * `includes/nav-menu-trigger-css.php`, because it is a separate
 * element with its own inspector panel.
 *
 * ⚠ LOAD ORDER: NOT bootstrap-loaded — `require_once`'d per-instance from
 * render.php, matching product-card's pattern and this file's own sibling
 * `nav-menu-css.php`. Its function is only in scope after a nav block's own
 * render.php has run at least once on that page load. A
 * cross-block call needs this file required first.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_shared_submenu_css' ) ) {
	/**
	 * Build the submenu/dropdown/burger/indicator/root-box half of the nav blocks'
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
	 *                                        `sgs_nav_shared_resolved_treatments()` —
	 *                                        ⛔ never the stored attribute.
	 * @param string $trigger_mode           Resolved `triggerMode` (icon|text|icon-and-text).
	 * @param string $drawer_bg_slug        The parent nav-drawer's `drawerBg` palette
	 *                                        slug, reached via block Context
	 *                                        (`sgs/navDrawerBg`) — empty when this
	 *                                        instance is not nested inside a real
	 *                                        nav-drawer.
	 * @param int    $item_count            Top-level item count (count($flat_items)
	 *                                        in render.php) — used ONLY by the
	 *                                        `listColumns` in-drawer grid below, to
	 *                                        derive an explicit row count so
	 *                                        `grid-auto-flow:column` splits the list
	 *                                        sequentially (column-major, "4+3") rather
	 *                                        than relying on `column` flow's own
	 *                                        auto-wrap, which needs an explicit
	 *                                        row/column count to behave predictably).
	 * @return string CSS fragment (no wrapping <style> tag).
	 */
	function sgs_nav_shared_submenu_css(
		array $attributes,
		string $uid_sel,
		string $indicator_style,
		string $indicator_colour,
		string $indicator_colour_gradient,
		array $sgs_tor_padding_tiers,
		array $sgs_tor_padding_desktop,
		array $sgs_tor_margin_desktop,
		string $bem_root,
		array $treatments = array(),
		string $trigger_mode = 'icon',
		string $drawer_bg_slug = '',
		int $item_count = 0
	): string {
		$css         = '';
		$sublink_sel = $uid_sel . ' .' . $bem_root . '__sublink';
		$t_sub_text  = (string) ( $treatments['submenuColourHoverTreatment'] ?? 'swap' );
		$t_sub_bg    = (string) ( $treatments['submenuLinkBgHoverTreatment'] ?? 'swap' );
		// Read once: it gates the panel's own border and the drawer's `border:0`
		// SUPPRESSION on the same value.
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
		$css .= '@media (max-width:' . ( $collapse_point - 1 ) . 'px){' . $uid_sel . ' .' . $bem_root . '__bar{display:none;}' . $uid_sel . ' .' . $bem_root . '__toggle-wrap{display:flex;}}';
		$css .= '@media (min-width:' . $collapse_point . 'px){' . $uid_sel . ' .' . $bem_root . '__toggle-wrap{display:none;}}';
		
		// 4g. Mega-menu disclosure — caret rotation + panel positioning (U9). The
		// trigger is a <button>, not an <a>, so it needs a minimal reset to inherit
		// the bar link's look rather than the browser's default button chrome.
		//
		// Wrapped in :where(). The trigger also carries
		// .{bem}__link, and this reset is written AFTER the item rules at the
		// same (0,2,0) specificity — so its `background:none`, `border:0` and
		// `font:inherit` shorthands would wipe the client's item background (and
		// gradient), item border and item typography on every mega item. As a zero-specificity
		// default it still beats the browser's own button styles.
		$css .= ':where(' . $uid_sel . ' .' . $bem_root . '__mega-trigger){background:none;border:0;font:inherit;cursor:pointer;}';
		
		/*
		 * Caret flips when the disclosure opens, with no transition: EVERY consumer of
		 * this shared `.caret` class opens its own panel INSTANTLY -- the mega
		 * dropdown toggles `display:none/block` (no transition possible on `display`
		 * directly) and the drawer's native `<details>` has no animation of its own
		 * either. An animated caret paired with an instant panel always reads as
		 * lagging behind, in both places that share this rule -- so it is instant
		 * everywhere rather than a per-consumer carve-out. Since there's no
		 * transition, no reduced-motion override is needed either.
		 */
		$css .= $uid_sel . ' .' . $bem_root . '__caret{display:inline-flex;}';
		// A selector list covering BOTH trigger classes. `.{bem}__mega-trigger`
		// is the mega-menu item's own trigger class; the plain dropdown's trigger
		// carries `.{bem}__subtoggle` instead. One rule keeps both triggers' flip
		// behaviour identical by construction.
		$css .= $uid_sel . ' .' . $bem_root . '__mega-trigger[aria-expanded="true"] .' . $bem_root . '__caret,'
			. $uid_sel . ' .' . $bem_root . '__subtoggle[aria-expanded="true"] .' . $bem_root . '__caret{transform:rotate(180deg);}';
		
		/*
		 * Panel anchoring. The wrap anchors to
		 * the BAR (`.{bem}__bar` is already position:relative in style.css
		 * for the indicator pill), not to the <li>-level hover bridge, so the panel
		 * can exceed a single menu item's width. The draft designs (sites/Mega-menu
		 * design + Indus Foods Mega Menu Design, both at
		 * "position:absolute;top:100%;left:0;right:0" on the header container with
		 * an 1120px-capped centred panel) anchor a wide centred band, so the wrap
		 * centres on the bar and may exceed the bar's width up to the draft's
		 * 1120px cap with the draft's 28px side gutters. MEGA-ONLY by construction:
		 * plain (non-mega) dropdowns, when built, must anchor left-aligned under
		 * their own item — centring them reads badly.
		 *
		 * Hover safety holds because the wrap stays a DOM child of the
		 * `.{bem}__mega` bridge — mouseleave fires on DOM containment, not
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
		 * VERTICAL BOUND. Horizontal overflow is handled by the width:min() above +
		 * the JS edge-collision vars; the block axis needs its own bound, or a long
		 * panel renders past the viewport bottom with no way to reach it — the panel
		 * closes on pointer-leave, so there is nothing to scroll.
		 *
		 * The bound is the panel's OWN top edge measured against the viewport, published
		 * by mega-disclosure.js::repositionPanel as --sgs-mm-panel-max-h (a custom-
		 * property VALUE, which Spec 32 permits; a direct style.maxHeight write would
		 * not be). Measuring is the only cause-agnostic answer here: it is correct
		 * whatever the header is doing — sticky, static, tall, short, absent, or a
		 * non-SGS theme's header entirely — because it asks the panel where it actually
		 * is rather than reconstructing that from something else's geometry.
		 *
		 * ⚠ It must NOT be derived from --sgs-header-height. That variable is a SCROLL-
		 * PADDING token, not header geometry: header-behaviours/view.js::publishHeight
		 * is called as `publishHeight( isHeaderPinned( header ) ? measuredHeight : 0 )`
		 * and writes the result INLINE on documentElement/body, which outranks the
		 * theme's static :root value. sgs/site-header's `headerSticky` defaults to `{}`
		 * — a NON-sticky header is the framework default — so on a default header the
		 * token resolves to `0px`, the bound collapses to `calc(100dvh - 16px)`, and
		 * the panel would overflow the viewport bottom by a full header height.
		 *
		 * The --sgs-header-height expression is the var()'s FALLBACK, so it is the no-JS /
		 * pre-first-open floor: too generous on a static header, but never zero.
		 * 16px is the spacing-scale step, kept as breathing room above the viewport edge.
		 *
		 * overscroll-behavior:contain stops a scroll that reaches the panel's end from
		 * chaining to the page behind it — the same choice the drawer already makes. It
		 * is NOT what makes the panel wheel-scrollable at all; that is the
		 * `data-lenis-prevent` on the emitted wrap (see the markup note above).
		 */
		$css .= $uid_sel . ' .' . $bem_root . '__mega-panel-wrap{position:absolute;top:100%;left:var(--sgs-mm-overflow-left, 50%);right:var(--sgs-mm-overflow-right, auto);transform:translateX(var(--sgs-mm-tx, -50%));width:min(1120px, calc(100vw - 56px));max-height:var(--sgs-mm-panel-max-h, calc(100dvh - var(--sgs-header-height, 80px) - 16px));overflow-y:auto;overscroll-behavior:contain;z-index:100;display:none;}';
		$css .= $uid_sel . ' .' . $bem_root . '__mega-trigger[aria-expanded="true"] ~ .' . $bem_root . '__mega-panel-wrap{display:block;}';
		
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
		 * submenuBg/submenuBgGradient:
		 * sgs_custom_property_gradient_decls() emits `--sgs-nm-submenu-bg` and,
		 * only when set, a sibling `--sgs-nm-submenu-bg-gradient` — matching the
		 * shared "fill-custom-property-gradient" end shape every other
		 * background/border custom-property row in this codebase already uses.
		 * No hover pair: submenu-bg is Normal-only by design (colourExemptions,
		 * block.json — the panel is structurally unhoverable once open).
		 */
		$sgs_nm_submenu_bg_source          = (string) ( $attributes['submenuBg'] ?? '' );
		$sgs_nm_submenu_bg_source_gradient = (string) ( $attributes['submenuBgGradient'] ?? '' );

		// The panel is Normal-only by design (FR-41-9) and must
		// stay that way, but an operator who set the ROW colour (submenuLinkBg) and
		// never touched the separate PANEL colour (submenuBg) almost certainly wants
		// the panel's own padding band to match the rows, not fall through to the
		// independent surface-alt/surface/#fff token chain (a "white lip").
		// Only engages when submenuBg itself is untouched — an explicit submenuBg
		// always wins.
		//
		// submenuBgGradient must be untouched too. submenuLinkBg
		// defaults to 'surface', so without this check the fallback would fire in the
		// DEFAULT state and replace an explicit panel gradient with
		// submenuLinkBgGradient (default ''). A gradient is ignored only
		// when auto contrast adaptation is on.
		if ( '' === $sgs_nm_submenu_bg_source && '' === $sgs_nm_submenu_bg_source_gradient
			&& '' !== (string) ( $attributes['submenuLinkBg'] ?? '' ) ) {
			$sgs_nm_submenu_bg_source          = (string) $attributes['submenuLinkBg'];
			$sgs_nm_submenu_bg_source_gradient = (string) ( $attributes['submenuLinkBgGradient'] ?? '' );
		}

		$sgs_nm_submenu_bg_decls = sgs_custom_property_gradient_decls(
			'sgs-nm-submenu-bg',
			$sgs_nm_submenu_bg_source,
			$sgs_nm_submenu_bg_source_gradient
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
		
		$css .= $uid_sel . ' .' . $bem_root . '__submenu-root{position:relative;display:flex;align-items:center;}';
		// Same vertical bound as the mega panel above, and for the same reason — see
		// the VERTICAL BOUND note there. A dropdown is the likelier of the two to run
		// long, since it has no width:min() forcing a wide multi-column layout.
		/*
		 * `submenuTopOffset` (FR-41-11) — emitted as `calc(100% + <offset>)` so the
		 * `100%` anchor is preserved and only the GAP is operator-owned. Empty
		 * leaves the plain `100%` anchor.
		 */
		$submenu_top_offset = sgs_css_length_value( $attributes['submenuTopOffset'] ?? '' );
		$submenu_wrap_top   = '' !== $submenu_top_offset ? 'calc(100% + ' . $submenu_top_offset . ')' : '100%';

		/*
		 * SHADOW — the panel's shadow is `filter:drop-shadow()`, not `box-shadow`.
		 * Per CSS's overflow-clip behaviour an element clips its OWN box-shadow
		 * the moment its `overflow` is anything but `visible`, and this rule carries
		 * `overflow-y:auto` (the element's own scroll for a tall panel), so a
		 * `box-shadow` here would show a flat, shadow-less edge against the header.
		 * A filter effect paints on the element's rendered bitmap BEFORE the
		 * overflow clip is applied, so it is never clipped by the same element's
		 * own overflow.
		 *
		 * Default is a bare `none`, not a theme shadow preset: an untouched nav must
		 * render no shadow. `--sgs-nm-submenu-filter` is written below ONLY when
		 * `submenuShadow` is non-empty, so a fresh install ships no shadow until an
		 * operator opts in.
		 */
		$css .= $uid_sel . ' .' . $bem_root . '__submenu-wrap{position:absolute;top:' . $submenu_wrap_top . ';left:var(--sgs-mm-overflow-left, 0);max-height:var(--sgs-mm-panel-max-h, calc(100dvh - var(--sgs-header-height, 80px) - 16px));overflow-y:auto;overscroll-behavior:contain;z-index:100;display:none;border-radius:var(--sgs-nm-submenu-radius, var(--wp--custom--border-radius--medium, 8px));filter:var(--sgs-nm-submenu-filter, none);}';


		/*
		 * ⛔ A non-zero offset creates a hover DEAD STRIP, and that reintroduces the
		 * exact bug FR-41-13 exists to fix: the gap belongs to neither element, so
		 * as the pointer crosses it neither is hovered and the parent flickers back
		 * to its resting paint mid-journey. The bridge is MANDATORY.
		 *
		 * ⛔ `submenuCloseGrace` does NOT cover this — it is a `setTimeout` on the
		 * bridge element's `mouseleave` that defers `ctx.isOpen = false`. It governs
		 * OPENNESS and never touches CSS `:hover`. The panel stays open
		 * across the gap; the parent's PAINT does not.
		 *
		 * Safe by construction: `.{bem}__submenu-wrap::before` is claimed by
		 * nothing; the wrap is already `position:absolute`, so it is its own
		 * containing block; and a `display:none` element has no pseudo-elements, so
		 * the bridge exists only while the panel is open and can never sit
		 * invisibly over the bar.
		 */
		if ( '' !== $submenu_top_offset ) {
			$css .= $uid_sel . ' .' . $bem_root . '__submenu-wrap::before{content:"";position:absolute;left:0;right:0;bottom:100%;height:' . $submenu_top_offset . ';pointer-events:auto;}';
		}

		/*
		 * LIFT THE WHOLE ITEM while its submenu is open (otherwise a later block such
		 * as the site logo paints OVER the open dropdown).
		 *
		 * `z-index:100` on the panel alone is not enough. The panel sits inside
		 * stacking contexts its own ancestors create — `.{bem}__item{z-index:1}`,
		 * `.{bem}__bar{z-index:1}`, `.entry-content{z-index:1}` — so its 100 only
		 * ranks it against its SIBLINGS, never against a later block that forms its own
		 * context. Raising the ancestor that actually competes is the fix. Scoped with
		 * `:has()` to the OPEN state so a closed menu leaves the page's stacking order
		 * exactly as it was. A mega panel never hit this because it lives in the sticky
		 * header, which already outranks page content.
		 */
		$css .= $uid_sel . ' .' . $bem_root . '__item--has-submenu:has([data-sgs-mega-trigger][aria-expanded="true"]){z-index:101;}';
		
		/*
		 * Lift every level we own, not just the item: `.{bem}__bar{z-index:1}`
		 * and the block root sit between the item and the page, so a 101 on the item
		 * alone only ordered it against its own siblings.
		 *
		 * WHAT THIS DOES AND DOES NOT FIX:
		 *   HEADER placement — the normal one — is fully correct: the open panel is the
		 *   topmost element at every sampled point, because the header template part is
		 *   `position:sticky; z-index:100` and therefore outranks page content.
		 *   A nav placed inside PAGE CONTENT is NOT fully fixed and cannot be from here:
		 *   the theme's `.entry-content{position:relative;z-index:1}` creates a stacking
		 *   context the block cannot escape, so the sticky header (z-index 100) and the
		 *   footer's own positioned rows (z-index 1, later in document order) still
		 *   paint over the panel. Raising `.entry-content` would put ALL page content
		 *   above the sticky header, which is worse.
		 * These lifts are still correct and worth keeping: they order the open panel
		 * above rivals WITHIN the same content flow, and they revert the moment it closes.
		 *
		 * Each is keyed on `[data-sgs-mega-trigger][aria-expanded="true"]`, NOT on a bare
		 * `[aria-expanded="true"]`. The burger button binds `aria-expanded` too
		 * (render.php, `data-wp-bind--aria-expanded="state.isOpen"`), so the bare
		 * form would also match whenever the mobile DRAWER opened and lift the whole
		 * nav for a reason that has nothing to do with a dropdown.
		 */
		$css .= $uid_sel . ':has([data-sgs-mega-trigger][aria-expanded="true"]){position:relative;z-index:101;}';
		$css .= $uid_sel . ' .' . $bem_root . '__bar:has([data-sgs-mega-trigger][aria-expanded="true"]){z-index:101;}';
		$css .= $uid_sel . ' [data-sgs-mega-trigger][aria-expanded="true"] ~ .' . $bem_root . '__submenu-wrap{display:block;}';
		
		/*
		 * EVERY default here is a THEME TOKEN, never a literal (a hardcoded `#fff`
		 * would paint the panel white on a client whose surface token differs and
		 * ignore the palette completely, in every style variation). A literal cannot follow a
		 * per-client snapshot or a light/dark variation; a token does, for free. The
		 * short literal after each token is a last-resort safety net for a theme that
		 * defines no palette at all, NOT a design value.
		 */
		/*
		 * Per-declaration source of each panel value:
		 *
		 *   background-color / background-image  `--sgs-nm-submenu-bg`
		 *     has a real writer (`submenuBg`), emitted inside an empty-guard so an
		 *     unset attribute writes no property at all and the chained
		 *     surface-alt -> surface -> #fff fallback applies.
		 *   min-width                            attribute-driven from
		 *     `submenuMinWidth` through the same guarded block.
		 *   border-radius                        see the ⚠ below.
		 *   border                               reads
		 *     `submenuBorderWidth` / `submenuBorderStyle` through custom properties
		 *     whose UNSET fallback is a literal, and its COLOUR through
		 *     the shared `sgs_border_states_css()` (Normal-only, FR-41-9: a panel
		 *     that cannot be hovered for one property cannot be hovered for another)
		 *     appended after this rule, so a set colour wins on source order and an
		 *     unset one leaves the token fallback below in place.
		 *   box-shadow                           reads `submenuShadow` /
		 *     `submenuShadowColour` via the shared `sgs_shadow_value_composed()`,
		 *     same unset-fallback discipline.
		 *
		 * `--sgs-nm-submenu-radius` reads the object-typed `submenuBorderRadius`:
		 * the `var()` is kept, the writer is wired to the real attribute, and the
		 * unset fallback keeps an untouched nav unchanged.
		 * `submenuBorderRadius` is a FLAT corner object, read through
		 * `sgs_corner_object_shorthand()` — NOT the side-keyed box helper — matching
		 * `itemBorderRadius`'s own precedent above in nav-menu-css.php. Its declared
		 * default is `{}` (empty), so an untouched panel writes no property at all and
		 * the chained token fallback below applies.
		 */
		$sgs_nm_submenu_border_style  = sgs_css_keyword_sanitise( $attributes['submenuBorderStyle'] ?? '' );
		$sgs_nm_submenu_border_w      = $sgs_nm_submenu_border_box ? sgs_box_object_shorthand( $sgs_nm_submenu_border_box ) : null;
		$sgs_nm_submenu_radius_shorthand = sgs_corner_object_shorthand( $attributes['submenuBorderRadius'] ?? null );
		$sgs_nm_submenu_shadow        = sgs_shadow_value_composed(
			(string) ( $attributes['submenuShadow'] ?? '' ),
			(string) ( $attributes['submenuShadowColour'] ?? '' )
		);
		// `filter:drop-shadow()`, not `box-shadow` — see the SHADOW comment
		// on the `.submenu-wrap` rule above. Written ONLY when submenuShadow is
		// non-empty, so the rule's own `var(--sgs-nm-submenu-filter, none)`
		// fallback is what an untouched nav actually renders.
		$sgs_nm_submenu_filter = '' !== $sgs_nm_submenu_shadow
			? 'drop-shadow(' . sgs_shadow_value_to_drop_shadow( $sgs_nm_submenu_shadow ) . ')'
			: '';

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
		if ( '' !== $sgs_nm_submenu_filter ) {
			$sgs_nm_panel_vars .= '--sgs-nm-submenu-filter:' . $sgs_nm_submenu_filter . ';';
		}
		if ( '' !== $sgs_nm_panel_vars ) {
			$css .= $uid_sel . '{' . $sgs_nm_panel_vars . '}';
		}

		/*
		 * The panel's padding is 0 and `overflow:hidden` clips the list to the
		 * panel's own `border-radius`. Coalescing `--sgs-nm-submenu-bg` to
		 * `submenuLinkBg` above only coalesces the Normal-state colour; it cannot
		 * touch a "lip": a `padding:8px 0` band on THIS rule would be painted by the
		 * PANEL's own background-color and could never be painted by any ROW state —
		 * including `submenuLinkBgHover` — because no row geometry extends into it.
		 * Zeroing the padding removes the one place the panel's own fill could be
		 * exposed next to a row, and `overflow:hidden` crops a square-cornered
		 * first/last row to the panel's rounded corners rather than leaving a square
		 * tab poking past them — the standard rounded-container technique
		 * (`.submenu-wrap` gets the same radius for its shadow). The panel is a
		 * genuinely floating element (`position:absolute`) over arbitrary page
		 * content, so it keeps SOME fill to read as a card, which is why
		 * `submenuBg`/`submenuBorder*`/`submenuShadow` exist as real attributes
		 * above. The Normal-state coalesce above still closes the sub-pixel residual
		 * at the four rounded corners for the common case (no explicit `submenuBg`).
		 *
		 * Net effect: at every point along the panel's edges the visible colour is
		 * ALWAYS a row's own state (Normal/Hover/Current), for every operator
		 * configuration, with no attribute-dependent edge case — there is no
		 * geometry left for the panel's own fill to show through against a row.
		 */
		$css .= $uid_sel . ' .' . $bem_root . '__submenu{list-style:none;margin:0;padding:0;overflow:hidden;'
			. 'min-width:var(--sgs-nm-submenu-min-width, 200px);'
			. 'background-color:var(--sgs-nm-submenu-bg, var(--wp--preset--color--surface-alt, var(--wp--preset--color--surface, #fff)));'
			. 'background-image:var(--sgs-nm-submenu-bg-gradient, none);'
			. 'border-width:var(--sgs-nm-submenu-border-width, 1px);'
			. 'border-style:var(--sgs-nm-submenu-border-style, solid);'
			. 'border-color:var(--wp--preset--color--border, transparent);'
			. 'border-radius:var(--sgs-nm-submenu-radius, var(--wp--custom--border-radius--medium, 8px));}';

		/*
		 * The drill-down mode's full-panel-overlay background — uid-scoped to match
		 * every other rule in this function. Specificity is
		 * `{uid} .bar--drawer[data-drill-enhanced] .accordion .submenu` =
		 * (0,5,0), comfortably above the accordion-mode drawer rule
		 * below (`.sgs-nav-drawer {uid} .{bem}__submenu`, (0,3,0)) and
		 * the base rule above ((0,2,0)) — so drill-enhanced mode resolves THIS chain
		 * (surface-alt -> surface -> #fff), matching the flat bar's own dropdown
		 * rather than the accordion-mode drawer's different chain
		 * (surface -> color-mix). Do not merge these two chains without
		 * re-verifying both modes' resting colour live — see the drill-down panel
		 * rule in `nav-drawer-menu/style.css`.
		 */
		// Longhands, not the `background:` shorthand — the shorthand would reset
		// background-image to none and cancel submenuBgGradient.
		$css .= $uid_sel . ' .' . $bem_root . '__bar--drawer[data-drill-enhanced] .' . $bem_root . '__accordion .' . $bem_root . '__submenu{'
			. 'background-color:var(--sgs-nm-submenu-bg, var(--wp--preset--color--surface-alt, var(--wp--preset--color--surface, #fff)));'
			. 'background-image:var(--sgs-nm-submenu-bg-gradient, none);}';

		// Normal-only, by FR-41-9: no `hover`, no `current`, and no `suppress_edges`
		// key at all. Emits nothing when neither colour attribute is set, so the
		// token fallback in the rule above survives untouched.
		$css .= sgs_border_states_css(
			$uid_sel . ' .' . $bem_root . '__submenu',
			$attributes,
			array(
				'base'     => 'submenuBorderColour',
				'gradient' => 'submenuBorderColourGradient',
				'width'    => ( null !== $sgs_nm_submenu_border_w && '' !== $sgs_nm_submenu_border_w ) ? $sgs_nm_submenu_border_w : '1px',
			)
		);
		
		/*
		 * submenuPadding — object box model {desktop:{top,right,bottom,left},
		 * tablet:{…}, mobile:{…}}, matching nav-drawer's drawerPadding shape.
		 * Emitted as a tier-aware override
		 * of the base rule above via the shared responsive-object helper (same
		 * selector, same specificity, later in source order — so an unset tier
		 * leaves the `8px 0` fallback in place rather than a custom property that
		 * silently drops the value when read as the wrong shape).
		 */
		if ( function_exists( 'sgs_emit_responsive_css' ) && is_array( $attributes['submenuPadding'] ?? null ) ) {
			$css .= sgs_emit_responsive_css(
				$uid_sel . ' .' . $bem_root . '__submenu',
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
		
		$css .= $uid_sel . ' .' . $bem_root . '__subitem{margin:0;}';
		
		/*
		 * 44px min touch target (SGS baseline — beats WCAG 2.2's 24px) and a visible
		 * focus ring. Never remove the outline without replacing it.
		 */
		
		/*
		 * Submenu text defaults to the palette's `primary` token, so rows follow the
		 * palette AND every style variation for free; the operator's own colour still
		 * overrides, below. It must not be `color:...,inherit`, which out-specifies the
		 * theme's global link rule and forces inherited body text so the palette never
		 * applies. The framework honours the palette the client chose rather than
		 * quietly substituting a different colour.
		 */
		$css .= $uid_sel . ' .' . $bem_root . '__sublink{display:flex;align-items:center;min-height:44px;padding:0 16px;'
			. 'text-decoration:none;white-space:nowrap;'
			. 'color:var(--wp--preset--color--primary, currentColor);}';
		
		/*
		 * …EXCEPT in the drawer, where `nowrap` has nothing to wrap into.
		 *
		 * The same fix style.css applies to `.{bem}__link`, one
		 * level down: the drawer reuses this same sublink class for a VERTICAL stacked
		 * list, so a long label has no second row to move to and can only push
		 * sideways, giving the drawer a horizontal scrollbar it should never have.
		 *
		 * It has to be emitted HERE rather than in style.css because the `nowrap` it
		 * overrides is emitted here too, at `$uid_sel .{bem}__sublink` (0,2,0);
		 * style.css's floor rule for the same selector sits at 0,1,0 and would lose to
		 * it. `:where()` contributes nothing, so this stays at 0,2,0 — identical to the
		 * base rule directly above and winning on source order alone, which keeps it
		 * below any higher-specificity operator override rather than outranking one.
		 */
		$css .= $uid_sel . ' :where(.' . $bem_root . '__bar--drawer) .' . $bem_root . '__sublink{white-space:normal;overflow-wrap:break-word;}';
		
		/*
		 * …and in the drawer specifically, sublink text defaults to the palette's
		 * `text` token (falling back to `inherit`), not the flat bar's `primary`
		 * default directly above. The drawer's nested submenu row always paints a
		 * real, deterministic surface: `submenuLinkBg` (block.json) defaults to
		 * 'surface' (cream) and the drill-down panel rule's fallback matches the
		 * accordion-mode chain (see style.css), regardless of the `drawerBg` the
		 * operator picked. With a fixed backdrop the text colour needs no
		 * per-instance contrast computation — it can be a plain default token, like
		 * every other drawer text element.
		 *
		 * Same (0,2,0) technique as the `nowrap` fix
		 * immediately above -- `:where()` costs nothing, `$uid_sel` + `.sublink`
		 * keeps real specificity, positioned AFTER the base rule (wins over it in
		 * the drawer) but BEFORE the operator's `submenuColour` block below (loses
		 * to it when the operator has actually set one). `text` (dark) on `surface`
		 * (cream) is a high-contrast pairing (see wcag-contrast.js).
		 */
		$css .= $uid_sel . ' :where(.' . $bem_root . '__bar--drawer) .' . $bem_root . '__sublink{color:var(--wp--preset--color--text, inherit);}';
		// submenuColourGradient is the gradient sibling; routed as a direct decl
		// (not the custom-property chain above)
		// because a `var(--x, …)` fed into a fixed `color:` declaration cannot
		// switch to `background-image` for a gradient.
		$submenu_colour          = (string) ( $attributes['submenuColour'] ?? '' );
		$submenu_colour_hover    = (string) ( $attributes['submenuColourHover'] ?? '' );

		/*
		 * FR-41-36 — desktop submenu hover is not
		 * bg-tint-only; an unset `submenuColourHover` default-closes to a real
		 * text colour alongside the row's hover background tint, same reasoning
		 * as `nav-menu-css.php`'s own `$item_colour_hover` default-closing
		 * pattern (an unset hover colour under WordPress core's zero-specificity
		 * ambient `a:hover` rule is not "no change", it is invisible/unreliable).
		 *
		 * The close-token must pair with whatever `submenuLinkBgHover` actually
		 * resolves to (default `'primary'`, see block.json): an `accent`-family text
		 * on an `accent`-family fill is a same-hue near-invisible combination.
		 * `text` (dark) on the `primary` fill is a fixed default pairing, not a
		 * runtime contrast computation.
		 */
		if ( '' === $submenu_colour_hover && 'none' !== $t_sub_text ) {
			$submenu_colour_hover = 'text';
		}

		$submenu_colour_current  = (string) ( $attributes['submenuColourCurrent'] ?? '' );
		$submenu_colour_effective = sgs_resolve_text_colour_or_gradient(
			$submenu_colour,
			(string) ( $attributes['submenuColourGradient'] ?? '' )
		);

		/*
		 * ⚠ The sublink Sweep selector EXCLUDES featured sub-items. A featured
		 * sub-item paints a real background directly on `.{bem}__sublink`
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
		$sublink_sweep_sel = $uid_sel . ' .' . $bem_root . '__subitem:not(.' . $bem_root . '__subitem--featured) .' . $bem_root . '__sublink';
		$sublink_sweep     = array(
			'base'  => '',
			'hover' => '',
		);
		$submenu_sweep_hover = '';
		if ( 'sweep' === $t_sub_text && '' !== $submenu_colour_hover ) {
			$submenu_sweep_hover = sgs_colour_value( $submenu_colour_hover );
			$sublink_sweep       = sgs_nav_shared_text_sweep_css(
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
		 * FR-41-15: the Current colour is written as the custom property
		 * the `[aria-current="page"]` rule below consumes, rather than as a second
		 * competing rule, so the rule is attribute-driven. The unset-fallback token
		 * in that rule is `text`; `submenuColourCurrent` defaults to `text` in
		 * block.json, so this branch fires unconditionally in practice and the
		 * fallback remains as the safety floor for an explicitly-cleared value.
		 */
		if ( '' !== $submenu_colour_current ) {
			$css .= $uid_sel . '{--sgs-nm-submenu-current-colour:' . sgs_colour_value( $submenu_colour_current ) . ';}';
		}

		/*
		 * FR-41-3 tie-break — the `[aria-current="page"]` colour rule emits HERE,
		 * before the Hover rule below, mirroring nav-menu-css.php's own documented
		 * pattern ("Current BEFORE Hover, and never guarded — both states differ
		 * from the base by one single-specificity suffix, so the pair always ties
		 * and source order is the only tie-breaker: hover wins when you point at
		 * the item for the page you are already on"). Both rules are (0,3,0), so
		 * emitting Current after Hover would let Current win the tie — backwards
		 * from the item family's own precedent.
		 */
		$css .= $uid_sel . ' .' . $bem_root . '__sublink[aria-current="page"]{'
			. 'color:var(--sgs-nm-submenu-current-colour, var(--wp--preset--color--text, currentColor));}';

		if ( '' !== $sublink_sweep['hover'] ) {
			$css .= $sublink_sweep['hover'];
		} elseif ( 'none' !== $t_sub_text && '' !== $submenu_colour_hover ) {
			$css .= sgs_hover_state_rules( $sublink_sel, 'color:' . sgs_colour_value( $submenu_colour_hover ), ':focus-visible' );
		}

		// Submenu LINK background/border/typography-hover, in-drawer overrides,
		// listColumns grid, sliding-indicator override and root box — emitted by
		// includes/nav-menu-submenu-link-css.php. $submenu_sweep_hover threads
		// through explicitly (it depends
		// on the submenuColourHover default-close branch above); the other locals
		// that module needs are cheap, deterministic recomputes from $attributes.
		$css .= sgs_nav_shared_submenu_link_css(
			$attributes,
			$uid_sel,
			$indicator_style,
			$indicator_colour,
			$indicator_colour_gradient,
			$sgs_tor_padding_tiers,
			$sgs_tor_padding_desktop,
			$sgs_tor_margin_desktop,
			$treatments,
			$item_count,
			$submenu_sweep_hover,
			$bem_root
		);

		return $css;
	}
}
