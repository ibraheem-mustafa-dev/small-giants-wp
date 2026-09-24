<?php
/**
 * SGS Nav Bar Menu / Nav Drawer Menu — scoped CSS, part 2b: submenu-link
 * background/border/typography-hover, in-drawer overrides, listColumns grid,
 * sliding indicator override, root box.
 *
 * Holds everything from the submenu LINK's hoverable background onward;
 * `nav-menu-submenu-css.php` keeps the panel positioning + the sublink's base
 * typography/text-colour states. Three cheap, side-effect-free locals
 * ($sublink_sel, $t_sub_bg, $sgs_nm_submenu_border_box) are RECOMPUTED here
 * rather than threaded as parameters — same inputs, same deterministic
 * output. `$submenu_sweep_hover` is NOT cheaply recomputable (it depends on
 * the stateful submenuColourHover default-close branch in the sibling file)
 * and is threaded as an explicit parameter instead.
 *
 * ⚠ LOAD ORDER: NOT bootstrap-loaded — `require_once`'d per-instance from
 * render.php, immediately after `nav-menu-submenu-css.php`. Its function is
 * only in scope after a nav block's own render.php has run at least once on
 * that page load.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_shared_submenu_link_css' ) ) {
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
	 *                                           `sgs_nav_shared_resolved_treatments()` —
	 *                                           ⛔ never the stored attribute.
	 * @param int    $item_count                Top-level item count — used ONLY by the
	 *                                           `listColumns` in-drawer grid, to derive
	 *                                           an explicit row count.
	 * @param string $submenu_sweep_hover       The sublink text-sweep hover colour,
	 *                                           computed by `sgs_nav_shared_submenu_css()`
	 *                                           alongside the sublink text-colour states
	 *                                           — needed here for the typography-hover
	 *                                           emitter.
	 * @return string CSS fragment (no wrapping <style> tag).
	 */
	function sgs_nav_shared_submenu_link_css(
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
		string $submenu_sweep_hover,
		string $bem_root
	): string {
		$css         = '';
		$sublink_sel = $uid_sel . ' .' . $bem_root . '__sublink';
		$t_sub_bg    = (string) ( $treatments['submenuLinkBgHoverTreatment'] ?? 'swap' );
		// Read once, same as the sibling file's own copy of this line — it gates
		// the panel's own border and the drawer's `border:0` SUPPRESSION.
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
		 * FR-41-36 — submenu-row SEPARATOR: a genuine between-row line (UNDERLINE is
		 * the bar's own text-indicator, SEPARATOR is anything geometrically between
		 * two rows/items). This SAME family paints BOTH the bar's dropdown panel
		 * rows and a drawer's nested/accordion-expanded submenu rows — one
		 * mechanism, one selector ($sublink_sel is not bar/drawer-forked).
		 * `submenuBorderColour` etc. above are the PANEL's own OUTER border
		 * (Normal-only, wraps the whole dropdown) — reusing that prefix for a
		 * per-ROW separator would repeat the "two elements, one attribute prefix"
		 * conflation the submenu background split above already avoids. Named
		 * `submenuLinkBorder*` to match the established row-vs-panel split
		 * (`submenuLinkBg*` = row, `submenuBg*` = panel). Mirrors
		 * `itemBorderColour`'s own emission shape in nav-menu-css.php: a width with
		 * no style implies solid. No Current colour — the spec's separator table
		 * gives this row only Normal/Hover language.
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
		$css .= sgs_nav_shared_typography_hover_rule( $attributes, 'submenu', $sublink_sel, $submenu_sweep_hover );

		/*
		 * No unconditional hover tint is emitted on `.{bem}__sublink:hover`:
		 * `submenuLinkBgHover` (the operator's own three-state fill) is the ONE
		 * hover fill. A `background` SHORTHAND tint (for example through
		 * `sgs_hover_guarded_rule()`, which literal-string scans miss) scoped to
		 * `$uid_sel` would fire on the bar's dropdown AND inside the drawer, and
		 * would (a) paint a tint the operator never asked for IN ADDITION to the
		 * `submenuLinkBgHover` they did — the F3b silent-override class — and
		 * (b) reset `background-image` to `none` and DESTROY the sublink text
		 * Sweep in both forks while `-webkit-text-fill-color:transparent` still
		 * applied, rendering the hovered word at ~4% opacity. An untouched
		 * sublink shows no hover tint.
		 * ⚠ An untouched sublink now shows no hover tint. Same accepted
		 * default-reduction as census #4 and #8, closed the same way: one
		 * `submenuLinkBgHover` entry.
		 */

		/*
		 * CURRENT-PAGE and FEATURED states for submenu items.
		 *
		 * Both reuse the SAME signals the top-level bar already uses — `aria-current`
		 * (set client-side by markCurrentPage, because the page cache would serve a
		 * stale server-baked value) and the `featuredItemIds` roster — rather than
		 * inventing a submenu-only mechanism. Both default from PALETTE TOKENS, and
		 * both fall back to the operator's own top-level choice when they have set one,
		 * so a submenu inherits the look of the bar it belongs to instead of drifting.
		 *
		 * Everything here is scoped to the block uid, NOT to the bar, so it applies
		 * identically to the drawer's own nav-drawer-menu instance — the burger menu
		 * holds a second instance and must not need its own rules.
		 */
		//The Current colour reads the
		// `--sgs-nm-submenu-current-colour` written from `submenuColourCurrent` in
		// nav-menu-submenu-css.php, where the `[aria-current="page"]` rule itself is
		// emitted (Current BEFORE Hover, FR-41-3). The bar's own current-page weight
		// is `itemFontWeightCurrent` under FR-41-6's never-lighter guard. Nothing is
		// emitted here.

		/*
		 * The featured sub-item rule's `var()` half is attribute-driven:
		 * `featuredBg` / `featuredColour` / `featuredRadius` /
		 * `featuredFontWeight` are real attributes whose RESOLVED values
		 * `nav-menu-item-border-featured-css.php` republishes as
		 * `--sgs-nm-featured-*` on `$uid_sel`, deliberately, so a featured SUB-item
		 * mirrors the featured BAR item.
		 *
		 * ⛔ There is no fallback. The custom-property writer is conditional, so
		 * with no featured colours set `--sgs-nm-featured-bg` is never written, and a
		 * fallback would paint every featured sub-item as a `primary` pill with
		 * inverse text that nobody asked for. The rule is emitted ONLY when that
		 * property is actually written (the same gate that writes it), and it uses
		 * `background-color:` rather than the `background:` shorthand so it can never
		 * reset a sweep's `background-image` on this selector.
		 */
		$sgs_nm_featured_bg_written = '' !== (string) ( $attributes['featuredBg'] ?? '' )
			|| '' !== (string) ( $attributes['featuredBgGradient'] ?? '' )
			|| '' !== (string) ( $attributes['featuredColour'] ?? '' );
		if ( $sgs_nm_featured_bg_written ) {
			$css .= $uid_sel . ' .' . $bem_root . '__subitem--featured .' . $bem_root . '__sublink{'
				. 'color:var(--sgs-nm-featured-colour, var(--wp--preset--color--text-inverse, currentColor));'
				. 'background-color:var(--sgs-nm-featured-bg);'
				. 'font-weight:var(--sgs-nm-featured-weight, 600);'
				. 'border-radius:var(--sgs-nm-featured-radius, 4px);'
				. 'margin:4px 8px;}';
		}

		/*
		 * No `:hover` rule for featured sub-items is emitted here: it would be the
		 * same defect shape as an unconditional sublink hover tint (ungated,
		 * `background` SHORTHAND, `sgs_hover_guarded_rule()`, `$uid_sel`-scoped so
		 * it fires in BOTH forks, destroying the sublink Sweep), and its
		 * `--sgs-nm-featured-bg-hover` / `--sgs-nm-featured-colour-hover`
		 * properties have no writer, so it could only ever paint a hardcoded
		 * fallback. The submenu link's own three-state fill covers the hover
		 * state.
		 */
		$css .= $uid_sel . ' .' . $bem_root . '__sublink:focus-visible{outline:2px solid var(--wp--preset--color--primary, currentColor);outline-offset:-2px;}';

		/*
		 * The toggle is a real button next to a real link when the parent has its own
		 * URL, so it needs its own hit area rather than inheriting the link's.
		 */
		// `font:inherit` so `1em` on the caret
		// SVG below resolves against the inherited item font-size rather than the
		// browser's UA button-reset default — matching the `.mega-trigger` reset
		// in nav-menu-submenu-css.php, which already carries it.
		$css .= $uid_sel . ' .' . $bem_root . '__subtoggle{display:inline-flex;align-items:center;justify-content:center;'
			. 'min-width:44px;min-height:44px;background:none;border:0;padding:0;cursor:pointer;color:inherit;font:inherit;}';
		$css .= $uid_sel . ' .' . $bem_root . '__subtoggle:focus-visible{outline:2px solid currentColor;outline-offset:-2px;}';
		// The caret SVG is `1em`, so its size is tied to itemFontSize. `1em` rides
		// the cascade: it resolves against whatever font-size the caret's own
		// ancestor chain carries, so it tracks the responsive item tier for free
		// once that tier's font-size reaches a shared ancestor (nav-menu-css.php's
		// half of this). No PHP attribute read needed for the caret itself.
		$css .= $uid_sel . ' .' . $bem_root . '__caret svg{width:1em;height:1em;}';

		/*
		 * In-drawer: the dropdown becomes an inline accordion, exactly as the mega
		 * panel does below — an absolutely-positioned panel inside the drawer overlays
		 * the items beneath it instead of pushing them down.
		 */

		/*
		 * IN-DRAWER SUBMENU — real nested accordion/drill-down markup.
		 *
		 * `.{bem}__submenu-root` / `-wrap` do not render inside a drawer at
		 * all — `sgs_nav_drawer_menu_render_items()` emits `.{bem}__accordion(-row)`
		 * / `-summary` instead (a real `<details name>` exclusive accordion, per
		 * FR-36-6). The structural accordion/drill-down rules live in
		 * nav-drawer-menu/style.css (they are NOT attribute-driven, so they don't
		 * belong in this per-instance scoped block); `nav-drilldown.js` layers the
		 * drill-down slide-to-sub-panel behaviour on top as progressive
		 * enhancement over the identical no-JS accordion markup.
		 *
		 * Everything below derives from `currentColor` so it works on ANY
		 * drawer background — light, dark or brand — instead of assuming one; these
		 * three rules apply because `.{bem}__submenu` / `-sublink` /
		 * `-subtoggle` are the SAME class names the accordion markup reuses for
		 * its own nested `<ul>`/`<a>` (the subtoggle rule is inert for a drawer
		 * instance specifically — the bar's subtoggle split has no drawer
		 * equivalent — but still serves the flat bar's own dropdowns).
		 */

		/*
		 * Background default: an operator's own `submenuBg` choice (the SAME
		 * custom property the flat bar's dropdown honours, set on `$uid_sel` above
		 * as `--sgs-nm-submenu-bg` whenever `submenuBg` is non-empty) applies inside
		 * the drawer too. Referencing it here costs nothing (no specificity
		 * fight -- a custom property resolves via inheritance of the VALUE, not rule
		 * priority) and the adaptive `color-mix` tint is the fallback for an unset
		 * operator value, so an untouched drawer still adapts to whatever
		 * `drawerBg` colour the operator picked.
		 *
		 * Text colour is handled separately, near the base `.sublink` rule in
		 * nav-menu-submenu-css.php -- see the comment there.
		 */
		/*
		 * The `background` half is attribute-driven (`--sgs-nm-submenu-bg` has a
		 * real writer, from `submenuBg`), so it keeps its own operator-value
		 * precedence. The `border:0` half is a SUPPRESSION: it zeroes the bar's own
		 * panel border inside the drawer, but must NOT apply once
		 * `submenuBorderWidth` is set, or an operator's drawer panel border silently
		 * renders nothing. It is emitted only while that attribute is empty.
		 *
		 * Fallback token: FR-41-36's own table names a real token for this exact
		 * surface — "Drawer nested submenu … bg=`surface`" — deliberately a plain
		 * neutral, one step lighter than the drawer's own top-level `surface-alt`
		 * (the "governing principle" pairing: top bar + drawer-nested-submenu share
		 * the plain tier). `--wp--preset--color--surface` is the primary fallback,
		 * with the `color-mix` tint as the LAST-resort net for a theme that defines
		 * no palette at all (this file's own "never a literal" rule) — an SGS-theme
		 * install shows the token background; a non-SGS theme with no `surface`
		 * token gets the currentColor tint.
		 *
		 * `background-color` + `background-image` rather than the `background:`
		 * shorthand, which would reset `background-image` to `none` and so cancel
		 * `submenuBgGradient` in the drawer. `padding:0` is not forced here: at
		 * (0,3,0) it would beat `submenuPadding`'s (0,2,0) rule, and the base panel
		 * rule in nav-menu-submenu-css.php already defaults padding to 0.
		 */
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .' . $bem_root . '__submenu{box-shadow:none;min-width:0;'
			. ( $sgs_nm_submenu_border_box ? '' : 'border:0;' )
			. 'background-color:var(--sgs-nm-submenu-bg, var(--wp--preset--color--surface, color-mix(in srgb, currentColor 6%, transparent)));'
			. 'background-image:var(--sgs-nm-submenu-bg-gradient, none);border-radius:0;margin:0;}';
		// The drawer's resting sub-item INDENT, not a
		// stateful rule: the marker icon's 12px padding + 14px icon + 8px gap is
		// measured against the 32px indent this border occupies (see the note
		// directly below). Structural, so FR-41-7's one-border rule does not claim
		// it and a double line cannot occur here.
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .' . $bem_root . '__sublink{padding:0 16px 0 12px;gap:8px;'
			. 'border-left:2px solid color-mix(in srgb, currentColor 25%, transparent);}';
		// The marker icon lives INSIDE the same
		// 32px indent the border-left occupies -- 12px padding + 14px icon +
		// 8px gap.
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .' . $bem_root . '__sublink-marker{display:inline-flex;flex-shrink:0;opacity:0.6;}';
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .' . $bem_root . '__sublink-marker svg{width:14px;height:14px;}';
		// A paired selector list
		// (subtoggle + link + caret svg) so the caret matches whatever colour the
		// link/subtoggle resolve to inside the drawer, rather than relying on
		// inheritance alone reaching the SVG unchanged. Mirrors the bar's own
		// paired-selector emission in nav-menu-css.php's colour rules.
		//
		// Wrapped in :where() — a DEFAULT, not an override. At (0,3,0) it would
		// beat itemColour's own (0,2,0) rule, so a client's item colour would never
		// reach the drawer. The caret still matches the link: when
		// itemColour is set, nav-menu-css.php writes the link and the caret svg in
		// the same declaration; when unset, this zero-specificity inherit applies.
		$css .= ':where(.sgs-nav-drawer ' . $uid_sel . ' .' . $bem_root . '__subtoggle,'
			. '.sgs-nav-drawer ' . $uid_sel . ' .' . $bem_root . '__link,'
			. '.sgs-nav-drawer ' . $uid_sel . ' .' . $bem_root . '__caret svg){color:inherit;}';
		/*
		 * No drawer item separator, hover tint or current-page tint is hardcoded
		 * here or in `style.css`.
		 *
		 * Separator: FR-41-7 makes the item border the ONE separator mechanism. A
		 * second rule (for example `.{bem}__item--drawer + .{bem}__item--drawer` on
		 * the next `<li>`'s top edge) would give an operator who sets a bottom
		 * `itemBorderWidth` TWO horizontal lines between drawer rows — invisible to
		 * specificity reasoning because the two rules sit on different elements and
		 * never compete; they simply both paint. An untouched drawer ships no
		 * separator (FR-41-17a(a)); one `itemBorderWidth` adds it.
		 *
		 * Hover: `itemBgHover` / `submenuLinkBgHover` are the hover fills. An
		 * unconditional `background:color-mix(…)` hover tint on link AND sublink
		 * would, as the `background` SHORTHAND at four classes plus `:hover`,
		 * out-rank the Sweep's own base rule and reset `background-image` to `none`
		 * while `-webkit-text-fill-color:transparent` still applied — rendering the
		 * hovered word at ~12% opacity on every drawer using Sweep, silently in both
		 * directions (a `getComputedStyle(el).color` check still returns the
		 * operator's colour).
		 *
		 * Current: the item border's own Current state (FR-41-7) and
		 * `itemBgCurrent` / `submenuLinkBgCurrent` are the current-page paint; a
		 * hardcoded `border-left:3px` or tint would paint IN ADDITION to the
		 * operator's choice.
		 *
		 * The bar's own `[aria-current="page"]{font-weight:600}` pair is emitted by
		 * `nav-menu-css.php` from `itemFontWeightCurrent` under FR-41-6's
		 * never-lighter guard, so the default 600 always emits.
		 */

		/*
		 * A mega-menu item degrades to a plain link inside the drawer
		 * (`sgs_nav_drawer_menu_render_items()`, see its docblock) rather than
		 * rendering the mega panel — so `.{bem}__mega-panel-wrap` never appears
		 * inside a drawer's OWN nav-drawer-menu instance and needs no in-drawer
		 * override here. (FR-36-5's "the same panel renders inside the drawer"
		 * mega-in-drawer capability is a declared future item, not built.)
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
		 * Both fall back to stretch / start outside a drawer or when the drawer does
		 * not publish them.
		 */
		$css .= '.sgs-nav-drawer ' . $uid_sel . '{width:100%;}';
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .' . $bem_root . '__bar'
			. '{width:100%;align-items:var(--sgs-drawer-align, stretch);}';
		$css .= '.sgs-nav-drawer ' . $uid_sel . ' .' . $bem_root . '__link,'
			. '.sgs-nav-drawer ' . $uid_sel . ' .' . $bem_root . '__sublink'
			. '{text-align:var(--sgs-drawer-text-align, start);}';

		/*
		 * listColumns — in-drawer vertical list layout ONLY
		 * (nav-drawer/style.css already suppresses this bar's horizontal/burger
		 * mode and stacks it vertically whenever a nav menu sits inside a drawer; the
		 * HORIZONTAL bar mode is untouched by this attribute entirely). 1 column (the
		 * default, an empty/unset object) leaves the existing flex-column stack from
		 * nav-drawer/style.css unchanged. >=2 columns switches the
		 * bar to a CSS grid (2-column desktop -> 1-column mobile merge).
		 * The extra `.wp-block-{block-slug}` qualifier gives this rule certain
		 * precedence over nav-drawer/style.css's `display:flex` rule at any tier
		 * this attribute is actually set (both are 3-selector-part rules; source
		 * order alone should not be relied on across two different stylesheets).
		 */
		if ( function_exists( 'sgs_emit_responsive_css' ) && is_array( $attributes['listColumns'] ?? null ) && ! empty( $attributes['listColumns'] ) ) {
			$drawer_bar_sel         = '.sgs-nav-drawer ' . $uid_sel . '.' . 'wp-block-' . $bem_root . ' .' . $bem_root . '__bar';
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
					 * READING ORDER — a sequential column-major split (read column 1 fully,
					 * e.g.
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
		 * Stacking escape for an IN-CONTENT nav. The
		 * page-content container (`.entry-content`) and the site-footer rows each
		 * carry `z-index:1`; at equal z the LATER context paints on top, so an open
		 * panel belonging to a nav placed inside page content was painted over by
		 * the footer — hit-testing then reached the footer, fired mouseleave on the
		 * hover bridge, and closed the panel 170ms later ("unhoverable"). While
		 * THIS instance's panel is open, lift its entry-content context above its
		 * sibling contexts. Fires only for an in-content nav (a header nav has no
		 * `.entry-content` ancestor — the header carries its own base z-index, see
		 * site-header/style.css), only while open, and is scoped by uid.
		 */
		$css .= '.entry-content:has(' . $uid_sel . ' .' . $bem_root . '__mega-trigger[aria-expanded="true"]){z-index:2;}';
		// The "View all X" fallback now renders INSIDE the panel (sgs/mega-panel's
		// footer slot), so it is styled as a panel footer row rather than a bare
		// line: separated from the content above, aligned with the panel's own
		// padding box, and never sitting under the trigger's hover underline.
		$css .= $uid_sel . ' .' . $bem_root . '__mega-viewall{display:inline-block;margin-top:16px;font-size:14px;font-weight:600;text-decoration:underline;text-underline-offset:3px;}';

		/*
		 * 4h-i. Sliding indicator colour override (Mega-Menu Build Spec §6 row 2).
		 * The pill's shape/motion (position/transform/opacity/transition) is
		 * STRUCTURAL and lives in style.css — only the operator-chosen fill (or its
		 * token default) is attribute-driven, so it belongs in the scoped <style>.
		 */
		// The sibling gradient wins when the solid swatch is empty (same
		// pattern as item_colour_gradient in nav-menu-css.php): an operator who sets
		// Highlight + a gradient-only fill (no solid itemBgHover) needs the guard to
		// check the gradient too, because sgs_background_paint_decl() resolves the
		// gradient on its own.
		if ( 'pill' === $indicator_style && ( '' !== $indicator_colour || '' !== $indicator_colour_gradient ) ) {
			$css .= $uid_sel . ' .' . $bem_root . '__indicator{' . sgs_background_paint_decl( $indicator_colour, $indicator_colour_gradient ) . ';}';
		}

		// 4g-bis. ROOT BOX — native spacing + responsive padding tiers.
		//
		// This block does not render through SGS_Container_Wrapper, so it emits its
		// own root box. The wrapper vocabulary it carries is TWO keys: the padding
		// tiers (`gap` is its own control).
		//
		// ⛔ Native `spacing` is declared with __experimentalSkipSerialization, so
		// WordPress does NOT inline padding/margin — whoever renders the root MUST emit
		// it scoped or both controls are silently dead.
		// ⛔ No `max-width` here, deliberately. This block is ALWAYS a child — of a
		// site-header-row or of sgs/nav-drawer — and the PARENT owns width.
		// The nav's own width is intrinsic to its items, and collapsed to a burger it
		// wraps its content. A max-width on this element would be a second, competing
		// place to control the same thing. Do not add it — add it to the PARENT row
		// instead.
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

		// Device-tier padding. 767/1023 is the locked 768/1024 device standard (the
		// same breakpoints SGS_Container_Wrapper uses for these attributes), NOT an
		// arbitrary visual breakpoint.
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

		// `gap` — the "Item gap" control, a tier object. Each tier's value is
		// written as `--sgs-nm-gap` on the root (the item separator's centring
		// reads the same variable), and the BAR (the <ul> whose flex children ARE
		// the item links) takes it, not the root: the root's flex children are
		// the bar and the toggle, and §4f swaps those by display:none at the
		// collapse point, so exactly ONE flex child exists at any width — and a
		// flex gap between one item paints nothing.
		$nav_gap_raw = $attributes['gap'] ?? null;
		if ( is_array( $nav_gap_raw ) && ! empty( $nav_gap_raw ) ) {
			$root_box_css .= sgs_emit_responsive_css(
				$uid_sel,
				array(
					array(
						'value'     => $nav_gap_raw,
						'css'       => '--sgs-nm-gap',
						'transform' => static function ( $raw ) {
							return sgs_css_length_value( (string) $raw );
						},
					),
				)
			);
			$root_box_css .= $uid_sel . ' .' . $bem_root . '__bar{gap:var(--sgs-nm-gap, 8px);}';
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
