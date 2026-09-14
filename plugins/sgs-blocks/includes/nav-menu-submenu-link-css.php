<?php
/**
 * SGS Nav Menu (sgs/nav-menu) — scoped CSS, part 2b: submenu-link background/
 * border/typography-hover, in-drawer overrides, listColumns grid, sliding
 * indicator override, root box.
 *
 * Split out of `nav-menu-submenu-css.php` (file-size maintenance pass,
 * 2026-09-14) — that file had grown to ~340 code lines against the
 * 300-code-line PHP cap (`~/.claude/rules/code-quality.md`; comment-heavy, so
 * measured on CODE LINES ONLY per the Ruling 7 addendum precedent, D722).
 * This module holds everything from the submenu LINK's hoverable background
 * onward; `nav-menu-submenu-css.php` keeps the panel positioning + the
 * sublink's base typography/text-colour states.
 *
 * Pure extraction — every line below is byte-identical to its prior location
 * in `nav-menu-submenu-css.php`, only re-wrapped as a standalone function.
 * Three cheap, side-effect-free locals ($sublink_sel, $t_sub_bg,
 * $sgs_nm_submenu_border_box) are RECOMPUTED here rather than threaded as
 * parameters — same inputs, same deterministic output, zero behaviour
 * change. `$submenu_sweep_hover` is NOT cheaply recomputable (it depends on
 * the stateful submenuColourHover default-close branch in the sibling file)
 * and is threaded as an explicit parameter instead.
 *
 * ⚠ LOAD ORDER: NOT bootstrap-loaded — `require_once`'d per-instance from
 * render.php, immediately after `nav-menu-submenu-css.php`. Its function is
 * only in scope after nav-menu's own render.php has run at least once on
 * that page load.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_menu_submenu_link_css' ) ) {
	/**
	 * Build the submenu LINK background/border/typography-hover, in-drawer
	 * overrides, listColumns grid, sliding-indicator override and root-box CSS.
	 *
	 * @param array  $attributes                Block attributes (verbatim render.php param).
	 * @param string $uid_sel                   This instance's CSS scope selector (`.{uid}`).
	 * @param string $indicator_style           Resolved indicatorStyle ('none'|'pill').
	 * @param string $indicator_colour          Resolved indicatorColour attribute.
	 * @param string $indicator_colour_gradient Resolved indicatorColourGradient CSS value.
	 * @param array  $sgs_tor_padding_tiers     Normalised padding tier object (desktop/tablet/mobile).
	 * @param array  $sgs_tor_padding_desktop   Desktop-tier padding sides array.
	 * @param array  $sgs_tor_margin_desktop    Desktop-tier margin sides array.
	 * @param array  $treatments                RESOLVED hover treatments from
	 *                                           `sgs_nav_menu_resolved_treatments()` —
	 *                                           ⛔ never the stored attribute.
	 * @param int    $item_count                Top-level item count — used ONLY by the
	 *                                           `listColumns` in-drawer grid, to derive
	 *                                           an explicit row count.
	 * @param string $submenu_sweep_hover       The sublink text-sweep hover colour,
	 *                                           computed by `sgs_nav_menu_submenu_css()`
	 *                                           alongside the sublink text-colour states
	 *                                           — needed here for the typography-hover
	 *                                           emitter.
	 * @return string CSS fragment (no wrapping <style> tag).
	 */
	function sgs_nav_menu_submenu_link_css(
		array $attributes,
		string $uid_sel,
		string $indicator_style,
		string $indicator_colour,
		string $indicator_colour_gradient,
		array $sgs_tor_padding_tiers,
		array $sgs_tor_padding_desktop,
		array $sgs_tor_margin_desktop,
		array $treatments,
		int $item_count,
		string $submenu_sweep_hover
	): string {
		$css         = '';
		$sublink_sel = $uid_sel . ' .sgs-nav-menu__sublink';
		$t_sub_bg    = (string) ( $treatments['submenuLinkBgHoverTreatment'] ?? 'swap' );
		// Read once, same as the sibling file's own copy of this line — census #9
		// gates the panel's own border on it, and census #1 gates the drawer's
		// `border:0` SUPPRESSION on the same value.
		$sgs_nm_submenu_border_box = is_array( $attributes['submenuBorderWidth'] ?? null ) ? $attributes['submenuBorderWidth'] : array();

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

		/*
		 * FR-41-36 (C1, 2026-09-12) — submenu-row SEPARATOR (renamed from
		 * "item divider" 2026-09-13 — this is a genuine between-row line, so
		 * the terminology pass keeps it as-is, just spelled consistently with
		 * the rest of the component's new vocabulary: UNDERLINE for the bar's
		 * own text-indicator, SEPARATOR for anything geometrically between two
		 * rows/items). This SAME family paints BOTH the bar's dropdown panel
		 * rows and a drawer's nested/accordion-expanded submenu rows — one
		 * mechanism, one selector ($sublink_sel is not bar/drawer-forked),
		 * confirmed identical for both contexts (2026-09-13 review). Genuinely
		 * NEW attribute surface: `submenuBorderColour` etc. above are the
		 * PANEL's own OUTER border (Normal-only, wraps the whole dropdown) —
		 * reusing that prefix for a per-ROW separator would repeat the exact
		 * "two elements, one attribute prefix" conflation the I1 fix above
		 * already avoids for background. Named `submenuLinkBorder*` to match
		 * the established row-vs-panel split (`submenuLinkBg*` = row,
		 * `submenuBg*` = panel). Mirrors `itemBorderColour`'s own emission
		 * shape in nav-menu-css.php: a width with no style implies solid. No
		 * Current colour — the spec's separator table gives this row only
		 * Normal/Hover language.
		 */
		$sublink_border_box          = is_array( $attributes['submenuLinkBorderWidth'] ?? null ) ? $attributes['submenuLinkBorderWidth'] : array();
		$sublink_border_width        = $sublink_border_box ? sgs_box_object_shorthand( $sublink_border_box ) : null;
		$sublink_border_style        = sgs_css_keyword_sanitise( $attributes['submenuLinkBorderStyle'] ?? '' );
		$sublink_border_colour       = (string) ( $attributes['submenuLinkBorderColour'] ?? '' );
		$sublink_border_colour_hover = (string) ( $attributes['submenuLinkBorderColourHover'] ?? '' );

		if ( null !== $sublink_border_width && '' !== $sublink_border_width ) {
			$css .= $sublink_sel . '{border-width:' . $sublink_border_width . ';border-style:'
				. ( '' !== $sublink_border_style ? $sublink_border_style : 'solid' ) . ';}';
		}
		if ( '' !== $sublink_border_colour ) {
			$css .= $sublink_sel . '{border-color:' . sgs_colour_value( $sublink_border_colour ) . ';}';
		}
		if ( '' !== $sublink_border_colour_hover ) {
			$css .= sgs_hover_state_rules(
				$sublink_sel,
				'border-color:' . sgs_colour_value( $sublink_border_colour_hover ),
				':focus-visible'
			);
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
		// anywhere in the tree. The `font-weight:600` half moved out
		// with the bar's own current-page weight rule — it is now
		// `itemFontWeightCurrent` under FR-41-6's never-lighter guard.
		//
		// ⛔ MOVED (Wave-2 nav-review fix 2, 2026-09-12): the actual rule now
		// emits earlier, immediately after the `--sgs-nm-submenu-current-colour`
		// custom-property write above (Current BEFORE Hover, FR-41-3) — see that
		// comment for why. Nothing left to emit here.
		//
		// Fallback token softened (fix 4b, 2026-09-12): `primary-dark` →
		// `primary`. Not FR-41-36-locked (FR-41-36's Desktop-submenu row states
		// "no separate Current row colour specified beyond the shared
		// item-divider language" — this fallback predates and sits outside that
		// table), so it is free to revisit. `primary-dark` reads noticeably
		// heavier/bolder than the row's own Normal-state `primary` token; once
		// fix 4 propagates a descendant's current-page state up to its ANCESTOR
		// row too, this fallback now paints in more places than before (every
		// ancestor of a current page, not just the current link itself), so a
		// darker-than-normal default reads louder across the whole component.
		// `primary` is already the row's own resting-state token (line ~474
		// above) — reusing it keeps Current legible via the `[aria-current]`
		// selector's real distinguishing signal (still applied) while no longer
		// stacking a second, heavier colour on top for the ancestor-propagation
		// case. Before: `var(--wp--preset--color--primary-dark, currentColor)`.
		// After: `var(--wp--preset--color--primary, currentColor)`.

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
		// M6 precondition (2026-09-12): `font:inherit` added so `1em` on the caret
		// SVG below resolves against the inherited item font-size rather than the
		// browser's UA button-reset default — matching the `.mega-trigger` reset
		// two rules above, which already carries it.
		$css .= $uid_sel . ' .sgs-nav-menu__subtoggle{display:inline-flex;align-items:center;justify-content:center;'
			. 'min-width:44px;min-height:44px;background:none;border:0;padding:0;cursor:pointer;color:inherit;font:inherit;}';
		$css .= $uid_sel . ' .sgs-nav-menu__subtoggle:focus-visible{outline:2px solid currentColor;outline-offset:-2px;}';
		// M6 fix (2026-09-12) — the caret SVG was the raw Lucide chevron-down at a
		// static 24x24px with nothing tying its size to itemFontSize. `1em` rides
		// the cascade: it resolves against whatever font-size the caret's own
		// ancestor chain carries, so it tracks the responsive item tier for free
		// once that tier's font-size reaches a shared ancestor (nav-menu-css.php's
		// half of this fix). No PHP attribute read needed for the caret itself.
		$css .= $uid_sel . ' .sgs-nav-menu__caret svg{width:1em;height:1em;}';

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
		 * its own operator-value precedence untouched. The `border:0` half was a
		 * hardcoded SUPPRESSION: it may keep zeroing the bar's own panel border
		 * inside the drawer, but it must NOT survive once `submenuBorderWidth` is
		 * set, or an operator's drawer panel border silently renders nothing. It
		 * is now emitted only while that attribute is empty.
		 *
		 * Fallback token fixed (fix 3b, nav-review E1, 2026-09-12): the
		 * `color-mix(in srgb, currentColor 6% transparent)` tint predates FR-41-36
		 * (locked 2026-09-11) and was never revisited against it. FR-41-36's own
		 * table names a real token for this exact surface — "Drawer nested
		 * submenu … bg=`surface`" — deliberately a plain neutral, one step
		 * lighter than the drawer's own top-level `surface-alt` (the "governing
		 * principle" pairing: top bar + drawer-nested-submenu share the plain
		 * tier). `--wp--preset--color--surface` is now the primary fallback, with
		 * the old `color-mix` tint kept as the LAST-resort net for a theme that
		 * defines no palette at all (this file's own "never a literal" rule,
		 * ~line 331) — an untouched SGS-theme install now shows the token
		 * background instead of an ad-hoc currentColor tint; a non-SGS theme with
		 * no `surface` token renders exactly as before.
		 *
		 * D1060 (2026-09-14): `background-color` + `background-image` replace the
		 * `background:` shorthand, which reset `background-image` to `none` and so
		 * cancelled `submenuBgGradient` in the drawer. `padding:0` is no longer
		 * forced here: at (0,3,0) it beat `submenuPadding`'s (0,2,0) rule, and the
		 * base panel rule in nav-menu-submenu-css.php already defaults padding to 0.
		 */
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__submenu{box-shadow:none;min-width:0;'
			. ( $sgs_nm_submenu_border_box ? '' : 'border:0;' )
			. 'background-color:var(--sgs-nm-submenu-bg, var(--wp--preset--color--surface, color-mix(in srgb, currentColor 6%, transparent)));'
			. 'background-image:var(--sgs-nm-submenu-bg-gradient, none);border-radius:0;margin:0;}';
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
		// M4/M2 drawer parity (2026-09-12) — widened to a paired selector list
		// (subtoggle + link + caret svg) so the caret genuinely matches whatever
		// colour the link/subtoggle resolve to inside the drawer, rather than
		// relying on inheritance alone reaching the SVG unchanged. Mirrors the
		// bar's own paired-selector fix in nav-menu-css.php's colour emission.
		//
		// D1060 (2026-09-14): wrapped in :where() — a DEFAULT, not an override. At
		// (0,3,0) it beat itemColour's own (0,2,0) rule, so a client's item colour
		// never reached the drawer. The caret still matches the link: when
		// itemColour is set, nav-menu-css.php writes the link and the caret svg in
		// the same declaration; when unset, this zero-specificity inherit applies.
		$css .= ':where(.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__subtoggle,'
			. '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__link,'
			. '.sgs-nav-drawer ' . $uid_sel . ' .sgs-nav-menu__caret svg){color:inherit;}';
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
			$drawer_bar_sel         = '.sgs-nav-drawer ' . $uid_sel . '.wp-block-sgs-nav-menu .sgs-nav-menu__bar';
			$sgs_nm_list_item_count = max( 0, $item_count );
			$css                   .= sgs_emit_responsive_css(
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
					/*
					 * READING ORDER FIX (P-NAV-MENU-LISTCOLUMNS-READING-ORDER,
					 * 2026-09-14) — the reference site's real DOM order confirmed a
					 * sequential column-major split (read column 1 fully, e.g.
					 * items 1-4, THEN column 2, e.g. items 5-7 — "4+3"), not the
					 * row-major interleaving `grid-auto-flow: row` (the implicit
					 * default) produces. `grid-auto-flow: column` alone is not
					 * sufficient: without an explicit row count it falls back to
					 * AUTO row-sizing, which the CSS Grid spec defines as filling
					 * ONE column indefinitely (never wrapping) unless a
					 * `grid-template-rows` track count bounds it — so the row
					 * count below is what actually makes the wrap happen, not
					 * just the flow direction. Rows = ceil(itemCount / columns),
					 * so the FIRST column absorbs the remainder and later columns
					 * are equal or shorter — exactly the "4+3" shape for 7 items
					 * across 2 columns.
					 */
					array(
						'value'     => $attributes['listColumns'],
						'css'       => 'grid-auto-flow',
						'transform' => static function () {
							return 'column';
						},
					),
					array(
						'value'     => $attributes['listColumns'],
						'css'       => 'grid-template-rows',
						'transform' => static function ( $raw ) use ( $sgs_nm_list_item_count ) {
							$cols = max( 1, absint( $raw ) );
							$rows = $sgs_nm_list_item_count > 0 ? (int) ceil( $sgs_nm_list_item_count / $cols ) : 1;
							$rows = max( 1, $rows );
							return 'repeat(' . $rows . ', minmax(0, auto))';
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
		// D956 -- sibling gradient wins when the solid swatch is empty (same
		// pattern as item_colour_gradient at nav-menu-css.php:112). An operator
		// who sets Highlight + a gradient-only fill (no solid itemBgHover) was
		// getting a completely invisible pill: this guard checked ONLY the solid
		// colour, so sgs_background_paint_decl() — which DOES resolve the
		// gradient on its own — never even ran (G13 scenario 2).
		if ( 'pill' === $indicator_style && ( '' !== $indicator_colour || '' !== $indicator_colour_gradient ) ) {
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
			$tier_box                       = is_array( $tier_box_raw ) ? $tier_box_raw : array();
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
