---
doc_type: spec
spec_id: 36
spec_version: 3.1
title: SGS Navigation System
project: small-giants-wp
status: active
owner: framework
last_verified: 2026-10-09
references:
  - .claude/specs/37-HEADER-FOOTER-BUILDER.md
  - .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md
  - .claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md
  - .claude/plans/archive/2026-07-18-P2-builder-ux-design-gate.md
---

# Spec 36 — SGS Navigation System

## 0. One-liner + plain English

A set of blocks + a CPT that render a WordPress menu as a best-in-class navigation — a desktop bar with
dropdowns + rich mega-menus, and an off-canvas drawer — meeting AND exceeding top WP-theme competitors +
general web/UX, fully accessible + crawlable, decoupled inside the header (Spec 37), and writable by Spec 47's computed route
through its block attributes. Spec 36 is the SINGLE canonical home for the whole header/nav element set:
the nav blocks AND the utility pieces the nav composes with (cart / search / social / logo / business-info
— §4).

**Plain English.** The menu is a block you drop on the header. On desktop it's a bar; some items open a
small dropdown, some a rich "mega" panel. You build a mega panel in its own findable screen (drag any blocks
in) and **attach it the way you already know — add it to your menu in Appearance → Menus, like adding a
page.** On a phone the bar collapses to a burger that opens a drawer (FR-36-8). Every link is real + visible to Google + AI search.

**The real differentiator (a Phase-3 build): AI builds your whole navigation from a sitemap.** The emit path
already writes every nav primitive, so generating a complete best-practice menu + mega panels from a site's
page structure is the one capability competitors' bespoke bindings can't copy — foregrounded here, built in
Phase 3 (§7 Opp 1).

## 1. Scope, ownership, non-goals

`P1` and `P2` in this spec are the archived design gates `.claude/plans/archive/2026-07-18-P1-architecture-decision-header-footer-nav.md` and `.claude/plans/archive/2026-07-18-P2-builder-ux-design-gate.md`; `DP<n>` and `P2 §<n>` cite their decision points and sections.

**OWNS:** the nav blocks (`sgs/nav-bar-menu`, `sgs/nav-drawer-menu`, `sgs/nav-drawer`) + the mega CPT, their
rendering/behaviour + editor controls, the menu-data contract, and the nav's accessibility, discoverability,
and block-attribute write contract. **Also the header/nav PRESENTATION of the utility pieces it composes with** —
cart, search, social, logo, business-info (FR-36-19..23): their nav/header rendering, behaviour + editor
controls. (The underlying WooCommerce cart / Store-API logic remains WooCommerce's.) The nav menu colour, state and control mechanism (§14, FR-41-*). The **single canonical
home** for navigation.

**This spec owns the Site-Info data store:** the `sgs_site_info` option store, the `sgs/site-info`
block-bindings source (including its context-gated empty-value hints — operators see a hint, public visitors
see an empty string), and the Site Info admin page with its server-side validation and reserved-key
denylist. **Rationale:** the data is site-wide — an address belongs on a contact page as much as in a
footer — it is delivered as a block, and all five blocks that consume it (FR-36-19…23) live here. Splitting
a store from its only consumers serves nobody.

**Site Info feeds `sgs/responsive-logo` as the middle tier of the logo resolution chain** (FR-36-22's first
MUST): the `logo` key is resolved by `plugins/sgs-blocks/includes/class-sgs-site-info-logo.php::resolve_id`,
so the logo resolves from the same store as contact and social.

**Does NOT own (→ Spec 37, header/footer builder):** the header/footer container blocks + row model, header
behaviours (sticky/transparent/shrink/hide-on-scroll), and the CPT editing home + `Sgs_Header_Rules`
binding + starter-picker. The nav adapts to these. Schema JSON-LD → `seo-schema` (FR-36-17).

**Footer menus cannot use the native WP core menu** — `core/navigation` is a banned core block
(`plugins/sgs-blocks/scripts/data/block-replacements.json` maps `sgs/nav-bar-menu` as its replacement).
**Footer menus are served by FR-36-26.**

**Non-goals — DEFERRED to Phase 3 (§7):** the **block-based `wp_navigation` menu system** (classic menus
are the primary/MVP path; block-menu support is a follow-on extra); WooCommerce category/nav integration
(category mega — note `core/navigation` hooks the WC mini-cart, a cutover concern; the cart PIECE itself is
FR-36-19); multilingual (WPML/Polylang — the PHP `intl` extension does locale *formatting*, NOT
translation, so real work); conditional/role-based/scheduled items; Opps 1–3 (§7). The header's own row
model/behaviours (Spec 37).

### 1a. FR INDEX — read this before scanning the document

**FR numbers are stable identifiers, not a reading order.** FR-36-27 falls between FR-36-6 and FR-36-7;
FR-36-24 between FR-36-8 and FR-36-9; FR-36-19…26 are grouped in §4. They are cited from live PHP/JS
comments and other specs, so ⛔ **do NOT renumber**. Use this index instead.

⛔ **Status lives on each FR, not in this index.** Every FR in this spec carries a one-line `Status:` (BUILT /
PARTLY BUILT: what is missing / NOT BUILT) with its evidence in `path::symbol` form, directly under its heading
(Part 14's FRs: §14.0a). `.claude/LEDGER.md` holds only short notes on work in progress. Do not cache a step
count or percentage; re-verify the evidence before relying on a `Status:` line.

| FR | § | Topic |
|---|---|---|
| FR-36-1 | 2 | Menu data = native WP menus (classic primary) |
| FR-36-2 | 2 | Block + CPT + plumbing roster |
| FR-36-3 | 2 | CPT model consistent with P2 |
| FR-36-4 | 3 | Desktop disclosure — dropdown + mega, hover-intent + close-grace |
| FR-36-5 | 3 | The mega CPT + native-menu association |
| **FR-36-6** | 3 | **The drawer — chrome top row + one InnerBlocks body; the `sgs_drawer` CPT** |
| FR-36-27 | 3 | Burger trigger presentation |
| FR-36-7 | 3 | Shared nav plumbing utility |
| FR-36-8 | 3 | Responsive collapse — burger→drawer, per-device visibility |
| FR-36-24 | 3 | Per-device content + settings (ownership split with FR-36-8) |
| FR-36-9 | 3 | Nav → header decoupling (one-directional) |
| FR-36-9a | 3 | Referential integrity + orphan lifecycle |
| FR-36-19 | 4 | Cart (`sgs/cart`) |
| FR-36-20 | 4 | Search — predictive combobox |
| FR-36-21 | 4 | Social icons |
| FR-36-22 | 4 | Logo (`sgs/responsive-logo`) |
| FR-36-23 | 4 | Business-info — Site-Info source of truth |
| FR-36-26 | 4 | Link lists — typed or menu-bound |
| FR-36-10 | 5 | Disclosure vs dialog |
| FR-36-11 | 5 | WCAG 2.1 AA + 2.2 wins |
| FR-36-12 | 5 | Operator a11y feedback — informational only |
| FR-36-13 | 6 | No inline styling (Spec 32) |
| FR-36-14 | 6 | Control-completeness (Spec 35A Part L) |
| FR-36-16 | 8 | Acceptance — reproduce both menus + regression gate |
| FR-36-18 | 8 | Live production instances render from CPTs |
| FR-36-15 | 9 | Converter-emittability |
| FR-36-17 | 11 | Crawlable, schema-friendly, fast |
| FR-36-25 | 11 | Structured-data-once |
| FR-36-28 | 6 | Nav colour-state + control system → **§14** (satisfies FR-36-4's hover/focus half + FR-36-11's colour floor; the ARIA active-trail is NOT satisfied — FR-41-20) |
| FR-41-1 to FR-41-41 | 14 | Nav menu colour, state and control system: three states, hover treatments, item border, submenu split, Menu Button panel, inspector layout (IDs stable; not renumbered) |
| FR-36-29 | 3 | Drawer row ornament, per-item media, sibling dim and label roll (`sgs/nav-drawer-menu`) |

## 2. Architecture

### FR-36-1 — Menu data = native WP menus (CLASSIC primary; block-menu support = Phase 3)
**Status:** BUILT: `plugins/sgs-blocks/includes/class-sgs-nav-menu-source.php::get_menu_blocks` resolves an explicit `ref`, then the header nav, a classic theme location, the newest `wp_navigation` post, the newest classic menu and a page-list, and both menu blocks call it. `::blocks_from_ref` already resolves `wp_navigation` posts, ahead of the Phase 3 label above.
The nav renders from a **native WordPress menu the operator picks** — **primary/MVP = classic menus**
(*Appearance → Menus*, `nav_menu` terms rendered via `wp_get_nav_menu_items()`), which reliably supports the
mega-attach (FR-36-5). **Block-based `wp_navigation` support is a Phase-3 extra** (§7). `sgs/nav-bar-menu`
and `sgs/nav-drawer-menu` each walk the chosen menu in their own render.php to emit their OWN scoped SGS
markup — never a bespoke store.

**Menu picker + default.** Each instance picks a menu through its numeric `ref` attribute (a classic
`nav_menu` term id, resolved classic-first, then a `wp_navigation` post id). With `ref` = 0 both blocks
resolve through the shared chain in `plugins/sgs-blocks/includes/class-sgs-nav-menu-source.php::get_menu_blocks`:
the active header nav's `ref`, then a `core/navigation` block in the header, then a registered classic theme
menu location, then the most recent published `wp_navigation` post, then the most recent classic menu, then
a page-list. The bar and the drawer therefore resolve the SAME menu by default — no drift, faithful clone.
A different drawer menu is an explicit `ref` on the drawer's `sgs/nav-drawer-menu` (the per-device override —
FR-36-24). Neither instance reads the other's state.

### FR-36-2 — Block + CPT + plumbing roster
**Status:** BUILT: every roster row exists (`plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json`, `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json`, `plugins/sgs-blocks/src/blocks/nav-drawer/block.json`, `plugins/sgs-blocks/src/blocks/mega-panel/block.json`, `plugins/sgs-blocks/src/blocks/cart/block.json`, `plugins/sgs-blocks/src/blocks/product-search/block.json`, `plugins/sgs-blocks/src/blocks/social-icons/block.json`, `plugins/sgs-blocks/src/blocks/responsive-logo/block.json`, `plugins/sgs-blocks/src/blocks/business-info/block.json`); `sgs_mega_menu` is registered in `plugins/sgs-blocks/includes/class-sgs-mega-menu-cpt.php` and `sgs_drawer` in `plugins/sgs-blocks/includes/class-sgs-block-cpts.php`. Not built: the optional pre-set flavours of `sgs/nav-bar-menu` (no `registerBlockVariation` in its folder).
| Part | Type | Responsibility |
|---|---|---|
| `sgs/nav-bar-menu` | block (dynamic), `"ancestor": ["sgs/site-header-row"]` | The menu on a header row: a horizontal **bar** with dropdown/mega triggers (desktop); **below its collapse point it renders a burger that opens the drawer** (FR-36-8) — NOT an inline list. Split layout (`splitAfterItemId` / `splitSide` / `showBurger`), a menu-item-description badge (e.g. "SOON"), and the menu-button presentation (`triggerMode` / `triggerIcon` / `triggerLabel`, FR-36-27) are built. Block-private root (no `SGS_Container_Wrapper`) — see FR-36-13. May ship pre-set flavours via `registerBlockVariation`. |
| `sgs/nav-drawer-menu` | block (dynamic), `"ancestor": ["sgs/nav-drawer"]` | The menu inside a drawer: a vertical **accordion/drill-down list**, chosen via the `submenuModel` context published by `sgs/nav-drawer`. Structurally cannot be inserted anywhere else (editor-enforced by its `ancestor` constraint). Two-tier lists (`listColumns`, `splitAfterItemId` / `splitSide`) are built. |
| `sgs_mega_menu` | **CPT** (block-based, container-like) | A rich mega panel = a per-client editable, block-based post (`sgs/mega-panel` with `sgs/mega-group` / `sgs/mega-aside` columns and any SGS blocks), edited in its own findable admin screen. **Attached to a menu item the normal WP way** (add it to the menu in Appearance → Menus like a page — FR-36-5). Rendered at the item's real position; inside the drawer the same panel renders in the item's accordion by default (FR-36-6). KIND = section/layout (keeps `SGS_Container_Wrapper`). |
| `sgs_drawer` | **CPT** ("Menu drawer"), revisions, template-locked | The off-canvas panel a burger opens, edited on its own screen. Registered in `plugins/sgs-blocks/includes/class-sgs-block-cpts.php`; Active model in `plugins/sgs-blocks/includes/class-sgs-active-layout.php` (`Sgs_Active_Layout::AREA_DRAWER`); printed on `wp_footer` by `plugins/sgs-blocks/includes/class-sgs-drawer-render.php`. Owned by Spec 37 FR-37-43; drawer BEHAVIOUR is FR-36-6. |
| `sgs/nav-drawer` | block (dynamic) | The off-canvas **container** the burger opens — the content of an `sgs_drawer` post. A fixed × close (chrome) above ONE InnerBlocks body seeded with `sgs/nav-drawer-menu`. A native `<dialog>` (default `showModal()`, top-layer → survives a transformed header ancestor; `.show()` opt-in). No child blocks; no header-row import (FR-36-6). |
| Shared nav plumbing | `viewScriptModule` + a `@wordpress/interactivity` `store('sgs/nav')` (PUBLIC API — the established SGS pattern; NOT a block, NOT core-nav internals) | Open/close/focus/`inert`/intent-timing plumbing: `store('sgs/nav')` for the dialog surfaces (drawer, search overlay) and the separate `store('sgs/mega')` (`mega-disclosure.js`) for the disclosure surfaces (dropdown + mega). Framework-reusable. |
| `sgs/cart` (extend) | block (dynamic) | Header cart — count badge + mini-cart (`displayMode` link / flyout / drawer). FR-36-19. |
| `sgs/product-search` / `filter-search` (extend) | block (dynamic) | Predictive search combobox with four display modes. FR-36-20. |
| `sgs/social-icons` (rebuilt) | block | Social and contact row: a wrapper of `sgs/icon` children bound to Site Info, one source rendered in header + footer + drawer. FR-36-21. |
| `sgs/responsive-logo` (extend) | block | The logo OBJECT (per-device image, link-home, colour treatment). Lockup, favicon-sync and variants are planned. FR-36-22. |
| `sgs/business-info` (extend) | block | The Site-Info source of truth (name/phone/email/address/hours → header + footer + contact + schema). FR-36-23. |

### FR-36-3 — CPT model consistent with P2 (precise reuse)
**Status:** BUILT: `plugins/sgs-blocks/includes/class-sgs-mega-menu-cpt.php` references neither `Sgs_Header_Rules` nor `sgs_active_header_cpt_id`; the mega starters are the `mega-*.php` files in `theme/sgs-theme/patterns/`; `plugins/sgs-blocks/src/blocks/mega-panel/edit.js` sets no `templateLock` on the panel.
`sgs_mega_menu` mirrors P2's "per-client editable structural content = a CPT" (`sgs_header`). Reuses: the
CPT editing home + native block editor; the **starter-template picker** (P2 §2.5 — the mega starters are
git-versioned theme patterns, FR-36-5). Does NOT use `Sgs_Header_Rules` / `sgs_active_header_cpt_id`. The panel's `templateLock` is `false`,
never `contentOnly` (FR-36-5). **Why a CPT:** chosen over InnerBlocks / synced-patterns / template-parts on
findability + header-consistency + zero bespoke admin UX.

## 3. Behaviour

### FR-36-4 — Desktop disclosure (dropdown + mega)
**Status:** PARTLY BUILT: hover-intent, open mode, hover bridge, safe triangle, outside-click and Escape dismiss, placement and the item hover controls are built (`plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js::isHeadingIntoOpenPanel`, `::repositionPanel`, `::onDocumentEscape`; `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::attributes.submenuIntentDelay` default 80, `::attributes.submenuCloseGrace` default 170, `::attributes.submenuOpenOn`; drawer parity `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::attributes.itemHoverScope`; `plugins/sgs-blocks/includes/nav-menu-css.php::sgs_nav_shared_item_state_css`). Not built: the ARIA active-trail (FR-41-20); only the CSS ancestor-Current styling exists.
Top-level items are real links; an item with a submenu renders a **disclosure** (`<button aria-expanded>`,
§5), NOT `role="menu"`. **Which kind:** mega iff the menu item links to a `sgs_mega_menu` post (FR-36-5);
else its submenu is a simple dropdown. Dropdowns/mega exist only on `sgs/nav-bar-menu`;
`sgs/nav-drawer-menu` has no hover-close mechanism to gate.

**Parent-only items.** A parent-only item has no destination: its URL is empty or a bare `#` (after trimming). It renders as a `<button aria-expanded>` disclosure trigger, never a link. A URL such as `#contact` is a real in-page anchor and renders as a link. One predicate decides this for the bar, the drawer and menu-bound icon lists: `plugins/sgs-blocks/includes/class-sgs-nav-menu-source.php::SGS_Nav_Menu_Source::is_destination_url`.

**Interaction precision:** dropdowns/mega open on **hover on non-touch (default) / tap on touch / keyboard
throughout** (avoids the sticky-hover mobile bug). Mechanics:
- **Hover-intent.** Hover opens after an intent delay AND click/Enter/Space opens. The delay is the operator
  attribute `submenuIntentDelay` (`plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::attributes.submenuIntentDelay`,
  default 80 ms, range 0 to 400), read into the renderer's `intent_delay` and carried in both the dropdown
  and mega interactivity contexts as `intentDelay`; `plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js::enterBridge`
  applies it with no clamp of its own. The delay gates the chevron flip and the panel's `display` together,
  because both key off the same `aria-expanded` value.
- **Open mode.** `submenuOpenOn` (`hover` default | `click`, the JSON enum mirrored by the PHP allow-list in
  `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php`), carried as `openOn` in both contexts. `click`
  makes the trigger's click (`toggle`) the only pointer open path: hover neither opens nor, once open,
  closes the panel, so a click-opened panel stays open until it is clicked again, dismissed with Escape, or a
  click lands outside it. Keyboard and touch are the same in both modes. Escape closes an open panel from
  anywhere on the page, including one opened by hover, where keyboard focus stays on the page body: a
  page-level keydown listener attached only while a panel is open
  (`plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js::onDocumentEscape`); presses inside a
  disclosure stay with its own handlers, which also return focus.
- **Hover BRIDGE + close-grace.** Close-grace default **170 ms**, operator attribute `submenuCloseGrace`
  (`plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::attributes.submenuCloseGrace`, read into the
  renderer's `close_grace` in `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php`); it reaches both the
  dropdown and the mega panel context. With `submenuIntentDelay` it is one of the two operator-set hover
  timings.
- **Safe-triangle geometry SHIPS, layered in front of the close-grace bridge.**
  `plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js::isHeadingIntoOpenPanel` tests the pointer against the open panel's top-left and
  top-right corners via `::pointInTriangle` / `::triangleSign`, and `::scheduleIntentOpen` defers the open
  while that test holds, re-polling every `TRIANGLE_RECHECK_MS`; when the geometry is unavailable it falls
  through to the 170 ms bridge, the deterministic fallback. Verify:
  `git grep -n "pointInTriangle\|isHeadingIntoOpenPanel\|scheduleIntentOpen" -- plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js`.
- **Outside-click dismiss.** A click outside an open mega/dropdown closes it
  (`mega-disclosure.js` document-level `outsideClickHandler`).
- **Panel placement.** One vocabulary for both kinds: `start`, `center`, `end` (the item's left edge, centred
  under it, its right edge), `page-centred` (centred on the page, or on a floating pill) and `full-width` (the
  page's, or the pill's, whole width). The dropdown kind reads `submenuAlign` (default `start`); the mega kind
  reads `megaAlign` (a tier object, default `page-centred`), both on
  `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json`. `plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js::repositionPanel` places the
  panel on each open; a dropdown keeps its own width, a mega panel takes the band. Collision clamping is always on.
  Under `full-width` the wrap spans the box and paints the mega panel block's fill, bottom edge and shadow across it
  (`plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js::publishWrapFill` publishes them as custom properties, `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css` reads them,
  `data-sgs-mm-bleed` silences the block's own shadow); the block itself stays at its `maxWidth`, centred.
- **Gap below the header.** `submenuTopOffset` (FR-41-11, §14.5) is the gap between the header's bottom edge
  and the top of either kind of panel. `repositionPanel` publishes the header's bottom (`.sgs-site-header`,
  else the bar's header row, else nothing and the stylesheet's `100%` holds) as `--sgs-mm-panel-top`; a
  floating pill publishes its own bottom.
- **Item hover paint (M-21).** On `sgs/nav-bar-menu` and `sgs/nav-drawer-menu`: `itemOpacity` /
  `itemOpacityHover` set the resting/hover opacity of the top-level item link and its caret (unset emits no
  opacity rule); `submenuOpacity` / `submenuOpacityHover` are the SAME pair for the dropdown/mega/accordion
  submenu link, scoped separately because a reference's submenu opacity can move in the opposite direction
  from its top-level item; `itemPaddingShiftHover` grows an item's inline-start padding on hover/focus by a
  length, applied to both the top-level item link and the submenu link, each adding to its own resting padding
  (the top-level link's is `itemPadding`'s left side where set, else 12px; the submenu link's is 16px).
  `itemPadding` is the top-level link's padding and `submenuLinkPadding` the submenu link's (dropdown, mega
  fallback list, drawer accordion), each a per-device box of top, right, bottom and left, on BOTH
  `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` (every item-level control
  exists on both blocks unless it is meaningless in one form). Unset sides keep the defaults (top-level 8px 12px,
  submenu 16px inline-start). All four hover pairs are touch-guarded via `sgs_hover_state_rules()`.
  Both are emitted by `plugins/sgs-blocks/includes/nav-menu-item-padding-css.php::sgs_nav_item_padding_css` for
  either block; the sublink default is `--sgs-nav-sublink-pad-start` (16px), which `itemPaddingShiftHover` adds to.
  `itemMotionDuration`/`itemMotionEasing` time the item's own colour and background transition
  (`plugins/sgs-blocks/includes/nav-menu-item-transition-css.php::sgs_nav_item_transition_css`; unset keeps the fast token) as well
  as the label roll.
- **Item hover scope and caret (U-18).** `itemHoverScope` `all` | `with-submenu` on `sgs/nav-bar-menu` and
  `sgs/nav-drawer-menu` (the drawer's rows that open a section are its `--has-submenu` and `--mega` items;
  its caret is the accordion expander, see "Drawer item-level parity" below): with
  `with-submenu` every hover paint channel (text, ground, opacity, border swap/sweep, highlight weight) applies
  only to items that open a dropdown or mega panel (`plugins/sgs-blocks/includes/nav-menu-item-hover-scope-css.php`). The caret takes
  `submenuCaretSize`, `submenuCaretGap`, `submenuCaretOpacity`/`submenuCaretOpacityHover` and its open turn
  `submenuCaretTurnDuration` + `submenuCaretTurnEasing`(`Custom`) (`plugins/sgs-blocks/includes/nav-menu-caret-css.php::sgs_nav_menu_caret_css`,
  called by both blocks). The bar's
  scrim fades over `scrimFadeDuration`, mirroring `sgs/nav-drawer`, on `scrimFadeEasing` (shared motion list plus `scrimFadeEasingCustom`; empty follows the panel's easing). `submenuItemStaggerScope` `columns` | `rows`
  staggers either a panel's columns or every link row and card inside them. With `triggerSurface` on, plain
  non-interactive content in the trigger row passes its tap to the menu trigger; links, buttons and inputs keep
  their own (`plugins/sgs-blocks/includes/nav-trigger-surface-css.php`).
- **Drawer item-level parity.** `sgs/nav-drawer-menu` offers the same item-level customisation as
  `sgs/nav-bar-menu`, on its own markup. Every attribute below is declared in
  `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json`, empty or `none` emits nothing, and every rule sits in
  the block's scoped `<style>` (Spec 32). Not offered because they are bar-only by nature: `burger*`, `trigger*`,
  `showBurger`, `collapsePoint`, `drawerRef`, `scrim*` (owned by `sgs/nav-drawer`), `megaAlign`, `submenuAlign`,
  `submenuMinWidth`, `submenuTopOffset`, `submenuOpenOn`, `submenuIntentDelay`, `submenuCloseGrace`.
  - **Row separators.** `separators` (the top-level rows) and `submenuSeparators` (the rows of a nested section) are
    the shared Separators setting (FR-41-37, §14.2, `plugins/sgs-blocks/includes/nav-menu-separators.php`): a horizontal line centred in
    the gap between stacked rows, drawn by the rows themselves, with `edges` `end` for a line under the last row. They
    are independent of the row's own border (`itemBorderWidth`/`itemBorderColour*`), so both can run in different
    colours. Hovering or focusing either row a line sits between repaints it, through the row's own link, expander or
    whole-row toggle (not the open section beneath it). Sweep needs a solid line. With `listColumns` on, the list is a
    column-major grid, so its lines take the grid path (native gap decorations, with the runtime overlay in
    `src/shared/separators/` elsewhere).
  - **Hover scope, magnet, alignment.** `itemHoverScope` is read by the shared item emitters
    (`plugins/sgs-blocks/includes/nav-menu-css.php::sgs_nav_shared_item_state_css`). `itemMagnetStrength` (0.02 to 0.5, shown with
    `itemMagnetEnabled`) rides as `data-magnet-strength` on the list and is read by
    `plugins/sgs-blocks/src/blocks/nav-drawer-menu/view.js::initBarEffects`; the row label carries `__magnet-target` only while the
    magnet is on (`plugins/sgs-blocks/includes/nav-drawer-menu-items.php::sgs_nav_drawer_menu_label_inner`). It is pointer-fine only: touch
    input and reduced motion switch it off inside `magnet.js`. `justifyContent` sets `justify-content` on
    `.sgs-nav-drawer-menu__link` (`plugins/sgs-blocks/includes/nav-drawer-menu-section-css.php::sgs_nav_drawer_menu_row_layout_css`); `center`
    also reserves the expander's 56px at the row start so the label sits on the row's true centre.
  - **Expander caret.** `submenuCaretSize`, `submenuCaretOpacity` and `submenuCaretTurnDuration`/`Easing`(`Custom`)
    style `.sgs-nav-drawer-menu__caret`, alongside `itemExpanderIcon` and `itemExpanderRotate`, through
    `plugins/sgs-blocks/includes/nav-menu-caret-css.php::sgs_nav_menu_caret_css` with the drawer's selectors. `submenuCaretGap` sets `gap`
    on a whole-row toggle (`.sgs-nav-drawer-menu__accordion-summary--row`), the only row where label and expander share a
    box; a split row keeps its expander pinned to the row end as its own 44px target. `submenuCaretOpacityHover` follows
    the row's head (link, expander or whole-row toggle).
  - **Section motion.** `submenuAnimation` takes `none` (default, the instant native toggle), `fade`, `fade-lift`
    (an 8px rise) or `height`; `submenuAnimationDuration`, `submenuExitDuration`, `submenuAnimationEasing`(`Custom`) time
    it. The bar's `slide-down` and `grow` are floating-panel shapes with no inline equivalent and are not offered.
    Built on the `<details>` element's `::details-content` slot with `interpolate-size` and a discrete
    `content-visibility` transition, so a browser without them opens and closes whole; the closed rule carries the exit
    timing and the `[open]` rule the entry timing. `height` clips only while moving, then releases the clip so a section
    shadow or focus ring is never trimmed at rest. Accordion mode only: a drill-down section is an overlay that slides
    in and keeps its own motion, and nothing is emitted for it
    (`plugins/sgs-blocks/includes/nav-drawer-menu-section-css.php::sgs_nav_drawer_menu_section_motion` returns the root modifier classes
    `sgs-nav-drawer-menu--acc-fade`, `--acc-fade-lift`, `--acc-height`, and the `--sgs-ndm-acc-*` values;
    the structure is at the end of `nav-drawer-menu/style.css`). All of it sits inside `prefers-reduced-motion: no-preference`.
  - **Row stagger.** `submenuItemStagger` (ms between rows, 0 is off), `submenuItemStaggerDistance`,
    `submenuItemStaggerDuration` (0 uses the opening time), `submenuItemStaggerMax` (0 is no cap) and
    `submenuItemStaggerScope`. `columns` staggers a plain section's rows and a mega section's direct column children;
    `rows` staggers each link row or card inside every `sgs/mega-group` column instead, and the column stops moving.
    Rows animate each time their `<details>` opens, on their own index (`--sgs-ndm-si`) so they never inherit the
    top-level item stagger's `--sgs-i`. Accordion mode only.
  - **Section box.** `submenuBorderRadius` and `submenuShadow`/`submenuShadowColour` paint the open section's `<ul>`
    (`plugins/sgs-blocks/includes/nav-drawer-menu-section-css.php::sgs_nav_drawer_menu_section_box_css`); an untouched drawer section stays
    square and flat.
  Inspector: Layout (justify, hover scope, split), "Row separators" and "Submenu row separators" (thickness, colour and style, hover
  treatment and angle, outer lines), "Row extras" (expander caret), "Submenu — Container" (radius, shadow), "Section motion" (animation, timing,
  stagger) and "Effects" (magnet and its strength).
- **Drawer row states and extras (U-18).** `sgs/nav-drawer-menu::itemColourOpen` paints a row's label while its own
  accordion section is open (distinct from Current, which is page identity). A top-level item with children and
  no destination of its own (empty URL, `#`, or an object whose post type is not publicly queryable, such as
  `sgs_mega_menu`) renders its whole row as the `<summary>` toggle; an item that is a real page keeps label = link,
  caret = toggle (`plugins/sgs-blocks/includes/nav-drawer-menu-items.php::sgs_nav_drawer_menu_has_real_destination`).
  `itemOrnamentRevealMode` (tier: `static` | `hover-draw`) hides the ornament at rest and draws its SVG strokes in
  sequence on hover or focus, and `itemOrnamentReserveSpace` keeps its space at rest
  (`plugins/sgs-blocks/includes/nav-drawer-menu-ornament-reveal-css.php`). `ornamentHiddenItemIds` (item ids, `id:<menu item>`) turns
  the ornament off per item; with reserved space on, that row keeps an invisible placeholder so its label lines up.
  `itemOrnamentFrames` (an ordered list of up to 8 custom-SVG frames, icon ornaments only) flashes alternate glyphs on
  row hover or keyboard focus before the ornament settles on `itemOrnamentIcon`/`itemOrnamentIconHover`;
  `itemOrnamentFrameDuration` (per tier, ms per frame, default 60) and `itemOrnamentFramePlay` (per tier, `on` | `off`)
  tune it. It is pure CSS: each frame is an `aria-hidden` stacked span that runs a one-slot animation delayed by its
  index, while the settled glyph is held transparent for the whole run; the per-tier values reach the static rules as
  custom properties, and every animation rule sits inside `prefers-reduced-motion: no-preference`, so reduced motion
  shows only the final glyph. An empty list renders exactly as before
  (`plugins/sgs-blocks/includes/nav-drawer-menu-ornament-frames.php::sgs_nav_drawer_menu_ornament_frames_css`,
  `plugins/sgs-blocks/src/blocks/nav-drawer-menu/style.css::.sgs-nav-drawer-menu__ornament--frames`). A whole-row-toggle `<summary>` also
  carries `.sgs-nav-drawer-menu__link`, so every item rule (typography, colour, hover, padding, ornament) paints it
  like a link row (`plugins/sgs-blocks/includes/nav-drawer-menu-items.php::sgs_nav_drawer_menu_accordion_html`). `itemTrailingIcons` (per-item map), `itemTrailingIconColour`
  and `itemTrailingIconSize` put a trailing glyph on any row; the shared IconPicker takes a pasted custom SVG,
  re-sanitised server-side with `sgs_svg_kses_allowed_tags()`. The drawer also takes the bar's badge colours and
  `disabledItemIds`/`itemDisabledColour`.
- **Item type scale (U-4).** A menu item's font size (`itemFontSize`/`itemFontSizeUnit`, `submenuFontSize`/
  `submenuFontSizeUnit` on both menu blocks) and `sgs/business-info`'s own text sizes take `vw`/`vh` alongside
  `px`/`em`/`rem`, through the shared unit list (`plugins/sgs-blocks/src/components/TypographyControls.js::FONT_SIZE_UNIT_SLUGS`),
  so a menu label or a footer contact line can scale with the viewport instead of stepping at a breakpoint.
  Per-device menu line height is not offered (`itemLineHeight` is a plain number, §14.8.4a). Formula-based scaling is not offered: `vw`/`vh` units cover it (Bean ruling).
  On `sgs/mega-panel`: `panelCardLift`
  (default `3px`) sets the `cards` style's group-tile hover/focus-within lift distance
  (`translateY(calc(-1 * <value>))`; empty or `0` means no lift); the same block's `itemPaddingShiftHover` grows a group item's own
  inline-start padding on hover, independently of the bar/drawer attribute of the same name. The `brands` variant's
  eyebrow ("Our Brands") takes `brandsEyebrow*` typography (via `sgs_typography_css_rule()`), `brandsEyebrowColour` and
  per-device `brandsEyebrowPadding`, defaulting to the mono 11px/500 uppercase muted look. `sliding pill`
  (`itemBgHoverTreatment`), tint swap, colour, weight, underline and border stay owned by Part 14 (§14).
- The timing constants apply to the hover path only; WCAG 1.4.13 (Dismissible/Hoverable/Persistent) on the
  hover panel; caret on expandable items only; distinct hover+focus states; active-trail
  (`aria-current="page"` + a visible style) — NOT BUILT, see below; a per-item **"featured"** flag;
  content-sized overlay with a max-width bound; optional backdrop blur; height-animated;
  `prefers-reduced-motion`-gated.

**The featured flag renders in two forms.** `featuredColour` alone gives the LABEL form (a coloured label).
Setting `featuredBg` gives the PILL form (a filled pill on the base link's radius) — which is how a draft
typically authors a featured nav item, and the form the Mama's draft uses (`.sgs-header__nav-featured` =
`background:var(--primary)` + `color:var(--text)` + weight 600). `featuredBg` defaults to `''` so the label
form is the default. **The pill's foreground is contrast-checked against the resolved fill** by the shared
`sgs_wcag_preferred_text_colour_for_bg()` helper — the operator's colour wins when it clears AA, else the
guaranteed-safe binary fallback — so no client palette can render a featured item below AA. Both forms are
operator-set from the block inspector (Featured panel). **Why this is spec-level, not an implementation
detail:** a featured style a draft can author MUST have somewhere in the data model to land — otherwise Solve (Spec 47) has no attribute to write the draft's featured fill into and the text renders accent-on-surface below AA.

**"Distinct hover+focus states" has a named mechanism — Part 14 of this spec
(FR-36-28). The ARIA "active-trail" does NOT, and is NOT BUILT; ancestor-item Current styling is built in CSS (FR-41-20).** Part 14 supplies the concrete state model: exactly
THREE states — Normal / Hover / **current** — on every stateful colour, `current` keyed on the
`aria-current="page"` that `plugins/sgs-blocks/src/blocks/nav-bar-menu/view.js::markCurrentPage` (identical
in `plugins/sgs-blocks/src/blocks/nav-drawer-menu/view.js::markCurrentPage`) stamps client-side (FR-36-11's
cache-safe mechanism, reused not re-derived; `current` is the framework's own state vocabulary per
`plugins/sgs-blocks/scripts/consistency/golden-controls.json::_meta.stateVocabulary.real`). Hover and current
stay VISUALLY DISTINCT and Hover out-ranks current by source order, so a visitor can tell where they ARE from
what they are POINTING AT.

⛔ The ARIA active-trail is not built (FR-41-20, §14.10).

⛔ The `featured` item-flag mechanism above is OUT of Part 14's scope. Part 14 also carries nav behaviours
that are correctness fixes with no operator control: a parent item stays in its Hover state while its own
open dropdown is hovered, and the hover-highlight background is painted from the item Background row's Hover
swatch when `itemBgHoverTreatment === 'highlight'`.

### FR-36-5 — The mega CPT + the native-menu association
**Status:** PARTLY BUILT: built are the CPT (`plugins/sgs-blocks/includes/class-sgs-mega-menu-cpt.php::force_publish`, `show_in_nav_menus`), resolution by `object_id` (`plugins/sgs-blocks/includes/class-sgs-mega-menu-cpt.php::resolve_panel_for_menu_item`), the eight starter patterns (`theme/sgs-theme/patterns/mega-brands-1.php`, `mega-general-1col.php`, `mega-general-2col.php`, `mega-general-2col-aside.php`, `mega-media-cards-1.php`, `mega-links-with-tiles.php`, `mega-compact-links.php`, `mega-compact-links-numbered.php`) and the aside and surface controls (`plugins/sgs-blocks/src/blocks/mega-aside/block.json::attributes.asideGap`, `plugins/sgs-blocks/src/blocks/mega-panel/block.json::attributes.surfaceBlur`). Not built: the inline authoring affordance (no `sgs_mega_menu` match under `plugins/sgs-blocks/src/blocks/nav-bar-menu`); `plugins/sgs-blocks/src/blocks/mega-panel/block.json::attributes.borderRadius` is still a plain string (default `20px`), awaiting Bean's ruling.

⛔ **Panel locking contract — `templateLock:false` + `allowedBlocks`, NEVER `contentOnly`.** `contentOnly`
hides child settings, so a client could not edit the icon-list link lists. The panel
(`plugins/sgs-blocks/src/blocks/mega-panel/edit.js`) lets the client add / remove / reorder one or more
`sgs/mega-group` / `sgs/mega-aside` columns. Each child block locks its own internal template with
`templateLock:'insert'` — never `'all'` or `'contentOnly'`, both of which re-run WordPress's template sync on
every editor mount and silently drop stored content that no longer lines up with the template by position.
An operator cannot break a column's shape but can freely select and edit any nested block's own settings.

**Aside column.** `sgs/mega-panel`'s `asideSeparator` (`style` line | none, `colour`, `width`) paints only the
divider: the rule carries no padding, so the gap between the divider and the content is `sgs/mega-aside`'s own
`asidePadding` (default 24px on every side), which a client can change. `style: none` adds
`sgs-mega-panel--aside-sep-none` on the frontend (`plugins/sgs-blocks/src/blocks/mega-panel/render.php`) as well as in the editor, and
`plugins/sgs-blocks/src/blocks/mega-panel/style.css::.wp-block-sgs-mega-panel:not( .sgs-mega-panel--aside-sep-none ) .sgs-mega-aside` paints the divider
only when it is absent. `sgs/mega-aside` also owns `asideGap` (tier length, the gap between its stacked
children; unset keeps `style.css`'s 16px) and `asideJustify` (tier: `flex-start` | `center` | `flex-end` |
`space-between`, its content's alignment along the column; unset keeps the start). Both are emitted by
`mega-aside/render.php` through `sgs_emit_responsive_css()`.

**Competitive positioning (Spec 02 §23):** the mega system is the block-native alternative to Max Mega Menu,
JetMenu (Crocoblock), and Kadence Pro mega menu — ARIA-compliant, semantic HTML, **zero external
dependencies**. Elementor's mega menu needs Elementor Pro ($59–399/yr) and generates heavy DOM; Max Mega Menu
(the most popular free alternative) has documented WCAG failures + mobile-toggle issues. Panels use
DISCLOSURE semantics, never `role="menu"` (FR-36-10), and are block-based CPT posts, never template parts.
- A mega panel is a **block-based CPT post** edited in its findable admin screen; the mega starters are
  git-versioned theme patterns (`git ls-files theme/sgs-theme/patterns | grep mega-`) registered for the `sgs_mega_menu` post type:
  `sgs/mega-brands-1` (logo-tile grid with a side call-to-action panel), `sgs/mega-general-1col`,
  `sgs/mega-general-2col`, `sgs/mega-general-2col-aside` (two columns + side CTA) and
  `sgs/mega-media-cards-1` (4-column media cards) — under `theme/sgs-theme/patterns/`. They embody the mega
  content-IA best practice (grouping, headings, one-item-per-group, vertical scan, "view all",
  descriptions — research B1/B3/B4/B8/B11).
- **A panel post takes any blocks.** `sgs/mega-panel` is one preset inside it (link groups plus one side card).
  Layouts outside that preset are built with structure, never as loose single blocks: `sgs/container` grids
  set the columns and nested containers hold each group or tile. They ship as starter patterns too:
  `sgs/mega-links-with-tiles` (link columns beside a row of image tiles, each a container of image, text and
  button), `sgs/mega-compact-links` (a 620px link list for a narrow, page-centred panel) and
  `sgs/mega-compact-links-numbered` (the same panel with numbered rows, `01` style, each link carrying a
  description line: `sgs/icon-list` `markerType` numbered plus its per-item `description`).
- **Group headings (informational-only):** every mega panel gets group headings; the
  heading/grouping/one-item-per-group best practice is EMBODIED in the starter layouts but is NOT an
  enforced content contract — a heading-less multi-column panel raises an editor INFORMATIONAL notice
  (never a gate — FR-36-12; NN/g's #1 mega anti-pattern).
- **Association = native:** the operator adds the mega CPT post to their menu **in Appearance → Menus**
  (the CPT is `show_in_nav_menus`, so it appears in the "add items" panel). A menu item targeting a
  `sgs_mega_menu` post carries that post's **real WP post ID** — **no bespoke map, no minted ID.** The block
  editor path (Phase 3) needs a spike: does the block Nav editor surface the CPT in link search (Open
  Questions).
- **Click-target resolution:** the mega is resolved by the menu item's **`object_id` via `get_post()`**,
  NEVER `$item->url`; `sgs_mega_menu` posts are **force-published on save**
  (`plugins/sgs-blocks/includes/class-sgs-mega-menu-cpt.php`) so a menu item never targets a
  draft/auto-draft. The top-level trigger link (e.g. "Brands") resolves to the mega post's own permalink
  (or `#` when the panel is purely a container — operator choice).
- **Inline authoring affordance (the non-coder gap) — NOT BUILT.** Selecting a mega-linked menu item inside
  the `sgs/nav-bar-menu` editor should edit its referenced `sgs_mega_menu` panel IN PLACE, and "create new
  panel" should spawn the CPT record transparently and back-reference it, so the client never sees the CPT
  directly. No `sgs_mega_menu` reference exists in the block's editor files
  (`git grep -il sgs_mega_menu -- plugins/sgs-blocks/src/blocks/nav-bar-menu` returns nothing).
- **Whole-card link:** a mega panel's featured cards may use a whole-card clickable-link overlay (the Spec 35A
  Part I gap) — budget it in the layout spec.
- **Real-position render:** renders at the menu item's real position, never last.
- **Mobile:** inside the drawer the same panel renders in the item's accordion (or drill-down sub-panel)
  by default, with no floating shell — see FR-36-6 "Mega items in the drawer".
- Panel content = SGS blocks only (no banned core blocks); scoped `<style>` (FR-36-13); links AND rich
  content crawlable server-rendered, **no lazy-load** (FR-36-17).
- **Surface (M-13).** `sgs/mega-panel` carries the same surface-ground trio as the header and the drawer —
  `surfaceBlur` (a CSS length), `surfaceSaturate` (a whole-number percentage) and `surfaceOpacity` (0 to 1,
  applied to the panel's own fill) — through `plugins/sgs-blocks/includes/helpers-surface-ground.php`, plus its own
  `shadow`/`shadowColour` writer (`shadow` default `floating`, one of the theme shadow presets, or a raw
  layer stack composed with `shadowColour`; empty means no shadow). The panel's `borderRadius` stays a plain
  string today; migrating it to a `{desktop,tablet,mobile}` tier object, matching the header and container,
  awaits Bean's ruling.

### FR-36-6 — The drawer (`sgs/nav-drawer`) — native `<dialog>` container in the `sgs_drawer` CPT
**Status:** BUILT: `plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$sgs_nd_geometry_for_anchor`, `plugins/sgs-blocks/src/shared/nav-interactivity/store.js::whenAnimationsSettle`, `plugins/sgs-blocks/src/shared/nav-interactivity/store.js::publishHeaderBox`, `plugins/sgs-blocks/includes/nav-drawer-chrome.php::sgs_nav_drawer_chrome`, `plugins/sgs-blocks/includes/class-sgs-drawer-render.php::render_active_drawer`, `plugins/sgs-blocks/includes/helpers-mega-render.php::sgs_mega_render_item_panel`; the `sgs_drawer` CPT template-locks one `sgs/nav-drawer` (`plugins/sgs-blocks/includes/class-sgs-block-cpts.php`); `variantPreset` appears nowhere under `plugins/sgs-blocks/src`. Not built, by design: a keyboard hotkey and history-back as closers; the `auto` z-index value awaits Bean.
**ONE block, ONE InnerBlocks region, NO child blocks.** The drawer is `sgs/nav-drawer` and nothing else. It
LIVES INSIDE the `sgs_drawer` CPT as that post's content (the CPT's template is a single locked
`sgs/nav-drawer` block); there is no CPT-native "no block" model.

**Structure = a CHROME TOP ROW + one editable body.**

**Frontend layout.** The dialog is a column flex container **only while open** (`.wp-block-sgs-nav-drawer[open]{display:flex;flex-direction:column}`), and the body is a flex child that grows into whatever the chrome row leaves (`flex:1 0 auto`, no `min-height`). The `[open]` scoping is load-bearing: any `display` on the base rule beats the UA `dialog:not([open]){display:none}` and the drawer never closes, which is why `style.css` carries a STOP gate against it. `flex-shrink` is 0 so a menu taller than the screen keeps its content height and the dialog scrolls, instead of the body shrinking and its content spilling past its own bottom padding.

**1. The chrome top row** — rendered by render.php OUTSIDE the editable InnerBlocks. It is the *close
button's* band; everything else in it is optional. Attribute-driven (NOT blocks, NOT InnerBlocks).

*BUILT — the × close* (U-11).
Rendered as fixed dialog chrome (see "Close is CHROME" below). **The × is omitted at a tier only when ALL
THREE hold at that tier:** (1) `modality` is `non-modal`; (2) `closeStyle` at that tier is `trigger` ("the
menu button closes it"); (3) the opener is LIVE, meaning its centre point hit-tests to itself
(`document.elementsFromPoint`) and it has client rects, so a burger painted under the drawer, hidden or
off-screen does not count. `render.php` emits the eligibility rule for (1) and (2), scoped to
`[data-sgs-nav-opener-live]`; `store.js` sets that flag after `show()` and before focus, re-checks it on
resize, and clears it once the dialog has closed (never before the exit animation, which would bring the × back mid-close). In every other combination the × shows (under `trigger` it
wears the `separate-x` glyph); no operator setting removes the last live close control. This is DEC-15 (b)'s
own wording ("required only when no other visible, keyboard-reachable close control is live").
Attributes: `closeStyle`, a per-device tier object `{desktop,tablet,mobile}` of `separate-x` | `text-swap` |
`burger-morph` | `icon-and-text` | `trigger` (cascade desktop → tablet → mobile; a flat string stored where a tier object is declared is coerced to the default by WordPress before render, so tier-scalar attributes are converted with `plugins/sgs-blocks/scripts/migrate-stored-tier-scalars.py`; the PHP twin
`plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$sgs_nd_allowed_close_styles` must equal the editor's
option list); `closePlacement` tier object (`top-row-end` default | `top-row-start` | `same-slot`, the × centred
on the opener's centre, measured by `store.js`; `same-slot` needs `modal` and resolves to `top-row-end` under
`non-modal`, where the header paints above the drawer); `closeOffset` tier object `{x,y}` px (x on the inline
axis); `closeRadius` tier object; `closeLabel`, `closeIcon` (an
icon-picker object `{source,name}` or `{source:'custom',svg}`, default `{lucide, x}`, resolved by
`plugins/sgs-blocks/includes/nav-menu-treatments.php::sgs_nav_shared_icon_markup`, which re-sanitises a custom SVG with
`sgs_svg_kses_allowed_tags()`; the same resolver draws every nav icon picker: ornament, expander, sublink marker), `closeSize` (the hit box
never goes below 44px), the close-label typography set, and the `toggleCloseColour*` colour/hover/gradient
set. Gradient is routed per icon source by `sgs_icon_gradient_css()`; never restrict the icon source enum.

- **Canvas/frontend icon parity.** The editor canvas resolves the same picker-driven `closeIcon` as the frontend (the `closeIcon` mirror in `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js`); keep them on one source.

**The chrome row (built, U-18).** `plugins/sgs-blocks/includes/nav-drawer-chrome.php::sgs_nav_drawer_chrome`
prints `.sgs-nav-drawer__chrome`, a flex row outside InnerBlocks; its CSS is
`plugins/sgs-blocks/includes/nav-drawer-chrome-css.php::sgs_nav_drawer_chrome_css`. The × stays first in the DOM (focus lands on it)
and `order` places it (`top-row-end` 1 with an auto inline-start margin, `top-row-start` -1, `same-slot`
absolute within the row). The row takes `chromeRowHeight`, `chromeRowGap`, `chromeRowPadding` (tier objects;
defaults 64px / 12px / 0 12px inside `:where()`) and `chromeRowBg`/`chromeRowBgGradient`, and replaces the body's
reserved 64px: `.sgs-nav-drawer__body` padding-top is `var(--sgs-nd-close-room, 0px)`.
- **Logo:** `chromeLogoId`/`chromeLogoUrl` plus `…Tablet`/`…Mobile` art direction (the `sgs/responsive-logo`
  per-tier scalar pattern) in a `<picture>`, `chromeLogoAlt`, `chromeLogoLink` (home; named "<site name> home"
  without alt text), `chromeLogoWidth` and `chromeLogoShow` (tier objects).
- **One free slot:** `chromeSlotType` heading | label | text | button, `chromeSlotText`, `chromeSlotHeadingLevel`
  (h2 | h3 | h4 | p), `chromeSlotPlacement` after-logo | center | end, `chromeSlotShow`, the `chromeSlot`
  typography set and `chromeSlotColour`/`…Gradient`. The button type is a link (`chromeSlotUrl`,
  `chromeSlotNewTab`, edited in one `LinkPopoverField`) styled by `sgs_button_element_style_css()` with the `chromeButton` prefix and its
  background on a layer, so the button text takes a gradient (`chromeButtonColourTextGradient`, `chromeButtonColourTextHoverGradient`).
- **Google rating:** its own item, beside the free slot (a wordmark heading and the rating share the row).
  `chromeRating` (on/off), `chromeRatingPlacement` end (beside the ×) | center, `chromeRatingShow` (tier object),
  `chromeRatingShowCount` and `chromeRatingColour`. `plugins/sgs-blocks/includes/nav-drawer-chrome.php::sgs_nav_drawer_chrome_rating_html`
  renders `sgs/google-rating-badge` (pill, no frame, never compact) through `render_block()`; its figures and link
  come from Site Info or live Google data, and with no rating it renders nothing (the row can still be
  `--close-only`). An end rating takes the auto margin and the × gives its up; a tier that hides the rating hands
  the margin back unless an end slot already carries it.
- **Close box:** `closeBorderWidth` (one box for every device, the border-control rule), `closeBorderStyle`,
  `closeBorderColour` (style written only with a width) and `closeIconSize` (tier); the hit area never drops
  below 44px (`::after`). `closePadding` (tier box; unset keeps `style.css`'s `padding:0`, or `0 12px` under
  `text-swap`/`icon-and-text`) is emitted by `plugins/sgs-blocks/includes/nav-drawer-chrome-css.php::sgs_nav_drawer_chrome_css` at a
  higher specificity than those style rules. `closeHoverOpacity` (0 to 1, default 0.75) is the × hover fade,
  written as `--sgs-nd-close-hover-opacity` and read by `plugins/sgs-blocks/src/blocks/nav-drawer/style.css::.sgs-nav-drawer__close:hover` (1 switches
  the fade off). `closeLineHeight` (tier, with `closeLineHeightUnit`, unitless by default) is the close label's
  line-height, emitted on `.sgs-nav-drawer__close-text` by `sgs_typography_css_rule()` with the rest of the
  `close` typography set.
- A row holding only the × carries `--close-only`; under the `trigger` close style the row goes with the × and
  the body gets its padding back (`--sgs-nd-close-room`), so an empty row costs no space.
- `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js::TEMPLATE` seeds `sgs/nav-drawer-menu` ONLY; the logo and
  slot are chrome, never blocks, so a drawer never carries two logos or two CTAs.

**Drawer motion (U-18).** `entryAnimation` `grow-from-anchor`: the box's own height grows from its anchor's
height (the header's for `header-box`, else 0) to full with the top fixed, and shrinks back on close; never a
clip. `plugins/sgs-blocks/src/blocks/nav-drawer/grow-from-anchor.js` measures `--sgs-nd-grow-from/-to` in the
dialog's own pixels and keeps `-to` current while open. Item entrance shape: `itemStaggerAxis` (tier: vertical |
start | end, mirrored right-to-left) and `itemStaggerReveal` (translate | clip: `inset(0 0 100% 0)` to
`inset(0)` with the travel, no fade), emitted by
`plugins/sgs-blocks/includes/helpers-nav-drawer-stagger-shape.php::sgs_nav_drawer_stagger_shape`. With the `header-box` anchor the
panel takes `zoom: var(--sgs-header-fluid-scale, 1)` and divides each measured box length by it, so it scales
with a fluid header (`sgs/site-header::fluidScale`).

**2. The body** — the single InnerBlocks region, `templateLock:false`. Seeds `sgs/nav-drawer-menu` with the
primary menu preselected on every new drawer. Everything beyond that is ordinary blocks — `sgs/container`
rows exactly as on a normal page. There is NO `allowedBlocks` restriction and none is to be added.

**Native `<dialog>`:** focus contained; background `inert`; mandatory Escape; rely on native `<dialog>`
semantics — ⛔ never add `role="dialog"` (implicit) or `aria-modal` (see Modality below, where the
prohibition on `aria-modal="true"` is binding). The default `modal` mode opens with `showModal()`, giving
top-layer promotion (which survives a transformed header ancestor); its dimming layer is the shared scrim (see the scrim paragraph below), never the native `::backdrop`, which stays transparent; `non-modal`
opens with `.show()` (see Modality).

⛔ **Close is CHROME, not content.** The × is rendered by render.php as fixed dialog chrome OUTSIDE the
editable InnerBlocks, so an operator editing the drawer's content can never delete the last close affordance
through the block editor. This matters because on a full-screen modal on TOUCH there is no ESC key and no
tap-outside-the-panel (the panel fills the screen), so the × is the only reliable close — it renders in every
case except the single predicate above, where the visible burger is the close control. **What "by construction" does and does not mean:** because the × is a raw PHP string that never
enters the parsed block tree, there is nothing in `post_content` to delete — this is strictly stronger than a
`templateLock`/`lock:{remove}` flag, which WordPress enforces in the editor JS ONLY and which a Code-Editor
or REST write bypasses entirely. **Any design that moves the × inside a block — including a child block of
the drawer — downgrades this to "cannot be removed via the toolbar or List View" and MUST restate this
guarantee.** The `sgs_drawer` post itself is template-locked to one `sgs/nav-drawer` block (`template` +
`template_lock:'all'` in `class-sgs-block-cpts.php`); like any block lock, that is editor-enforced.

**Menu source:** the drawer's `sgs/nav-drawer-menu` has its own `ref` picker (FR-36-1; `ref` 0 resolves
through the same shared chain as the bar); the inspector shows *which menu is bound* (bar vs drawer).
**Geometry:** per-device `anchor` (`full-screen` | `header` | `side-start` | `side-end` | `container` |
`trigger` | `centred` | `header-box`) + `panelSize` + `anchorOffset`, emitted per tier by
`plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$sgs_nd_geometry_for_anchor`.
- `side-start` / `side-end`: a full-height edge panel on the inline-start or inline-end side, `panelSize` wide
  (default 400px, never wider than the viewport). Non-modal, it starts at the burger's own header row and paints
  above the header, the non-modal full-screen rule.
- `container`: a panel whose left and right edges line up with the header's content box and whose top is the
  header's bottom (modal) or the burger's row bottom (non-modal), plus `anchorOffset`.
  `plugins/sgs-blocks/src/shared/nav-interactivity/store.js` measures the box at open and on every viewport
  change: the burger's `.sgs-site-header-row`, its `.sgs-container__inner` band when the row renders one, else the
  row itself, minus the element's inline padding, published as `--sgs-drawer-container-left/-right`. Outside a
  header row the fallbacks are 16px each side.
- `trigger`: the panel hangs below the burger by `anchorOffset` (per tier, default 8px); `container` defaults to 0.
- `header-box` ("Grows out of the header"): the panel lays over the opener header's own border box (same top,
  left and width), one layer below the header, its content starting below the header row; `store.js`
  (`publishHeaderBox`) publishes `--sgs-drawer-hb-*` on open and resize and marks the header
  `data-sgs-drawer-grown`, which drops the header's fill, blur and shadow (`site-header/style.css`) so the two read
  as one card, and pauses hide-on-scroll. Any tier on `header-box` forces the drawer non-modal (a modal dialog is
  top-layer and would cover the burger). The pill grows into its menu card.
- **Item pitch.** The menu item `gap` (`sgs/nav-bar-menu` and `sgs/nav-drawer-menu`; `gap` in `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::attributes` and `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::attributes`) is a
  per-device tier object on both menu blocks, so a reference's tight pitch (a 0 gap on 44px rows) is reachable
  without changing padding. A stored flat value fails the schema and renders the
  default.
- Every value is consulted by the U-5 motion `auto` map (`side-*` slide from their own edge, `container` expands
  down) and by the default edge (side panels take a shadow and a 1px primary line on their open edge; `container`,
  `trigger` and `centred` are cards).

**Submenu.** `sgs/nav-drawer` publishes its `submenuModel` attribute to descendants via block.json
`providesContext` (`sgs/navDrawerSubmenuModel`), which `sgs/nav-drawer-menu` declares via `usesContext` and
reads in its own render.php (`$block->context['sgs/navDrawerSubmenuModel']`) to choose between its two
submenu markup shapes — `accordion` or `drill-down` — via
`plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_drawer_menu_render_items`. `sgs/nav-bar-menu`'s own
dropdown/mega markup (`SGS_Nav_Menu_Bar_Renderer` in its render.php) has no context dependency at all. Both
`accordion` and `drill-down` share IDENTICAL server markup: a real nested
`<details name="sgs-nav-drawer-menu-accordion-{uid}">` **exclusive accordion** per item with children
(Chrome/Edge/Firefox/Safari 17+ honour `<details name>` exclusivity; it degrades to independent,
still-functional `<details>` on older engines, never to a broken menu), with the parent link separate from the
expander (a real `<a>` beside the `<summary>` toggle when the parent has its own URL; a plain label when it
does not). `drill-down` layers a JS-only progressive enhancement
(`plugins/sgs-blocks/src/shared/effects/nav-drilldown.js`, wired from `plugins/sgs-blocks/src/blocks/nav-drawer-menu/view.js`'s
`initBarEffects()`) that intercepts the `<summary>` click, slides the tapped submenu in as a full-size
sub-panel over the top-level list (CSS `transform`, `plugins/sgs-blocks/src/blocks/nav-drawer-menu/style.css`), injects a Back button (its
label read from a `data-sgs-nav-back-label` attribute render.php has already translated server-side — the JS
module carries no hardcoded English), and returns focus to the `<summary>` on Back. With NO JS,
`drill-down`'s fallback IS the accordion.

**Mega items in the drawer.** `sgs/nav-drawer-menu` `megaDrawerMode` (`panel` default | `link`). Under
`panel` a mega item renders its own mega panel post inside its accordion row: the panel is server-rendered
block content, so no JS is needed; the body is `ul.sgs-nav-drawer-menu__submenu > li.sgs-nav-drawer-menu__mega-body`,
which `nav-drilldown.js` already handles. The body's padding is `megaBodyPadding` (per device, Styles tab
"Mega panel padding"; unset keeps `0 12px 12px`), since the mega panel sits inside it and cannot remove it. Both menu forks render a panel through one helper,
`plugins/sgs-blocks/includes/helpers-mega-render.php::sgs_mega_render_item_panel`; the render context (`''` or `drawer`) rides a
push/pop stack read by `sgs_mega_render_context()`, and in the drawer `sgs/mega-panel` hashes its own class
and draws no floating shell (fill, border, radius, shadow, backdrop, width cap, padding, the `cards` hover
glow, the tone class) while keeping `container-type` for its narrow stack; its text follows the drawer. The
drawer's `sublinkMarkerColour` also colours an embedded panel's list markers (`--sgs-list-marker-colour`).
`sgs/mega-panel` carries an "In the drawer" inspector panel (`edit.js`) whose `drawer*` attributes
(`plugins/sgs-blocks/src/blocks/mega-panel/block.json::attributes`, elements `drawer`, `drawerLinks`, `drawerLinkNumber`, `drawerLinkLabel`,
`drawerLinkDesc`, `drawerCard*`) paint the drawer copy only, through the panel's scoped CSS
(`mega-panel/render.php`, the `$sgs_mm_in_drawer` block after the stack rules; every rule is rooted on the
instance uid so it out-specifies the child blocks' own scoped colours, no inline style, and an empty
attribute emits nothing). `drawerBg` is the panel ground (transparent when empty, so the drawer's fill
shows). Link rows are the direct-child `sgs/container`s of `.sgs-mega-group`: `drawerLinkNumColour`/`Size`
(the row's direct-child `sgs/text`), `drawerLinkLabelColour`/`Size` (the row's `sgs/heading`),
`drawerLinkDescColour`/`Size` (the `sgs/text` in the row's nested container), `drawerLinkDivider` (row
hairline colour), `drawerLinkMinHeight` (border-box) and `drawerLinkPaddingY`. `drawerAsideOrder`
(`first`|`last`, default `last`) places the aside above or below the groups through CSS `order` on the
content row. `drawerCardCompact` turns the aside into a horizontal card by its five-slot order (media frame,
tag, title, description, link): the frame becomes a square thumbnail (`drawerCardThumbSize`, default 64px)
spanning the tag, title and link rows, the description is hidden, and `drawerCardBg`,
`drawerCardBorderColour`, `drawerCardRadius`, `drawerCardPadding`, `drawerCardGap` (default 14px),
`drawerCardTagSize`/`drawerCardTagPadding`/`drawerCardTagMargin` (unset `0 0 6px`), `drawerCardTitleSize`/`drawerCardTitleLineHeight` (unset `normal`), `drawerCardLinkSize` and
`drawerCardSpacing` (below the card when first, above when last) size it. The Indus About panel's values
are set in `plugins/sgs-blocks/scripts/nav-qa/gate3c/indus-mega-about.tree.json`.
Every drawer colour takes a gradient sibling (`drawerBgGradient`, `drawerLinkNumColourGradient`, `drawerLinkLabelColourGradient`, `drawerLinkDescColourGradient`, `drawerLinkDividerGradient`, `drawerCardBgGradient`, `drawerCardBorderColourGradient`; a gradient wins over its flat colour) and reaches the page through the shared helpers: the two grounds through `sgs_custom_property_gradient_decls()` (`--sgs-mm-drawer-bg`, `--sgs-mm-drawer-card-bg`), the three link text colours through `sgs_resolve_text_colour_or_gradient()` / `sgs_text_colour_decl()` / `sgs_text_colour_gradient_fallback_rule()`, the hairline and the card border through `sgs_border_states_css()`. The inspector's "Preview in the editor as" toggle (Desktop / Drawer, editor state only, never saved) makes the canvas paint the drawer copy: `mega-panel/edit.js` adds `sgs-mega-panel--in-drawer`, paints the ground on the wrapper, and renders `mega-panel/drawer-preview.js::drawerPreviewCss()`, the editor twin of the `$sgs_mm_in_drawer` rules (a gradient border previews as a `border-image`, not the front end's masked ring).
`link` (or a panel that resolves to nothing) gives a plain link. `megaDrawerFallbackIds` takes precedence
for an item authored as a `core/navigation-submenu` with real nested child links: those render as an
ordinary accordion instead. A panel holding a form should stay `link` (a panel renders twice on a page, so
any fixed `id` inside it would repeat).
**Authoring rule for mega panel posts.** A panel rooted in an `sgs/container` (the starter patterns) is not
touched by the drawer context, so its paint (padding, width cap, fill) is set on the desktop tier only,
never an explicit text colour, with columns set per tier including mobile. Then the same post reads as a
floating panel on the bar and as flat content in the drawer.

**Dialog a11y:** focus INTO on open (the first VISIBLE focusable, `plugins/sgs-blocks/src/shared/nav-interactivity/store.js::getFocusable`); Tab contained;
Escape closes; focus returns to the burger if it is live, else to the first live focusable in the header
region, never to `<body>`; body-scroll-lock (incl. iOS fix); swipe-close is enhancement-over-the-×; animation
reduced-motion-gated.

**Close routes beyond the ×** (U-9): Escape, backdrop and scrim click, the live trigger. **Resize
(DEC-09):** while open, a burger carrying `data-sgs-nav-collapse` (its bar's `collapsePoint`) arms a
`matchMedia('(min-width:Npx)')` watcher; on a change the drawer closes only if the opener is no longer live,
so an always-burger bar never closes on a resize and a drawer otherwise reflows. **Close on scroll (DEC-02's
one carve-out):** `closeOnScrollDistance` (px, 0 = off, the default) drops the scroll lock and closes after
that much user-driven pointer scrolling (wheel or drag within 150ms before the scroll); keyboard, anchoring
and programmatic scrolls never close it, and it is skipped on touch input. **Accordion:** `accordionExclusive`
(default `true`, context `sgs/navDrawerAccordionExclusive`) — false drops the `<details name>` so rows open
independently. Not built, for a stated reason (plan §2): a keyboard hotkey and history-back as a closer.
Drill-down focus management is layered on top: opening a sub-panel moves focus to its Back button; closing
it (via Back) returns focus to the `<summary>` that opened it; the top-level list is marked `inert` while a
panel is open (Tab cannot land on an invisible link) — the shared `store.js` `getFocusable()` excludes
`[inert]` so the drawer's Tab-trap skips anything `inert` covers. Escape/× close the WHOLE drawer via the
`store('sgs/nav')` dialog-level behaviour; no Escape handling exists inside the drill-down module. **Port
these existing mechanisms, do not re-derive them:** the drawer's body-reparent so it escapes a
transformed/filtered ancestor, and scrollbar-bounce compensation.

**One drawer per request.** `sgs/nav-drawer` calls `Sgs_Active_Layout::mark_served( AREA_DRAWER )` after
emitting its `<dialog>`, so a page carrying a drawer block AND an Active `sgs_drawer` prints one
`<dialog id="sgs-nav-drawer">`, never a duplicate id. `sgs/nav-bar-menu` records which drawer its burger
controls (`Sgs_Drawer_Render::note_burger()`), so the Active drawer renders only on pages that actually have
a burger; a page with no burger keeps byte-identical output.

#### Modality — `modal` (default) or `non-modal`. BUILT.

The `modality` attribute on `sgs/nav-drawer` chooses. `modal` (default) opens with `showModal()`.
`non-modal` opens with **`.show()` plus an explicit z-index scale that keeps the burger row live above or
beside the drawer**, with author-managed background inertness (the `inert` attribute, focus containment, Escape and
focus-return all kept exactly as `modal` has them). The `.show()` path lives in
`plugins/sgs-blocks/src/shared/nav-interactivity/store.js` (`git grep -n "drawer.show()" -- plugins/sgs-blocks/src/shared/nav-interactivity/store.js`).

**Stacking order (M-09).** `sgs/site-header` carries a per-tier `zIndex` object
(`{desktop,tablet,mobile}`, each a whole number 0 to 99998 or empty to inherit the wider tier; framework
default 100), written only by `plugins/sgs-blocks/includes/sgs-header-z-index.php` and published as `--sgs-header-z`. Per
anchor tier (`plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$sgs_nd_geometry_for_anchor`): a
`trigger` or `centred` panel, and a NON-MODAL `full-screen` drawer, paint one above the header
(`--sgs-header-z` + 1), so no lower header row can overlap them; the non-modal full-screen drawer starts at
the bottom of the burger's own `.sgs-site-header-row` (store.js writes `--sgs-drawer-opener-row-bottom` on
open), so that row stays visible and live while every lower row is covered, the same rule the trigger
panel follows. The `header` anchor and a modal full-screen drawer keep the under-header value (a
`showModal()` dialog is in the top layer and ignores z-index anyway). The scrim stays below the header. Residual: one reference needs an `auto` z-index value
rather than a number, which the attribute does not yet express and which awaits Bean's acceptance.

**Why non-modal exists — measured.** Live DOM measurement of 15 top-tier reference sites:

| Finding | Count |
|---|---|
| Keep the nav trigger VISIBLE and TOPMOST while the drawer is open | **14 of 15** |
| Use the SAME element to open and to close | 12 of 15 |
| Of the 7 primary references, cover the full viewport | 5 of 7 |
| Of the 7 primary references, lift the header above the panel BY Z-INDEX — i.e. none is a top-layer dialog | **7 of 7** |

The single exception that hides its trigger is also the only reference forced to build a separate in-drawer
close control.

**Why `showModal()` structurally blocks it.** A `showModal()` dialog is promoted to the browser's top layer,
and **nothing can be painted above a top-layer element by z-index** — the manoeuvre all seven references use
is unavailable for as long as `showModal()` is in the code path. This is a property of the top layer, not a
styling preference.

⛔ **`aria-modal="true"` must NOT be added — binding, not advisory.** It instructs assistive technology to
ignore everything outside the dialog. Under `non-modal` the burger is *deliberately* left live and reachable,
so `aria-modal="true"` would hide from screen-reader users the exact affordance the mode exists to create.
The drawer's root stays a native `<dialog>` and keeps its implicit `role="dialog"`; inertness is managed by
the author, on the background, not declared on the dialog.

Header rows are NOT imported into the drawer in any form (there is no "show header" toggle).

#### Desktop variants — BUILT; the design-gate record is `.claude/plans/archive/2026-07-28-nav-drawer-variants-design-gate.md`

Built: the per-device `anchor` object (`full-screen` default / `header` derives width + edges from the
header / `trigger` / `centred`) + `panelSize` (responsive) + the surface-ground trio (`surfaceBlur`,
`surfaceSaturate`, `surfaceOpacity`, through `plugins/sgs-blocks/includes/helpers-surface-ground.php`, the same emitter the
header and the mega panel use) + a `shadow`/`shadowColour`
writer (M-13, same vocabulary as the mega panel's) + a background-image media layer
(`backgroundImage*`, `backgroundImageDecorative` — painted as a CSS layer, never a frontend `<img>`) + `closeStyle` + `sgs/nav-drawer-menu` `listColumns` (in-drawer
only) + **the drawer looks as patterns** (`theme/sgs-theme/patterns/drawer-*.php`, keyword `featured`; the block
declares no variant attribute and registers no block variations) +
**backdrop-click-to-close in `store('sgs/nav')`** (a `::backdrop` click closes a partial-width panel;
full-screen is unaffected by construction).

**Default edge.** A drawer that paints above the header gets a visible edge by default so it separates
from a header of the same colour: the `trigger` and `centred` cards take the theme `floating` shadow, a
1px solid primary border and 20px corners; a non-modal full-screen drawer takes the shadow and a 1px
primary line along its top only; a modal full-screen drawer takes none. Emitted per anchor tier before the
operator's border and radius rules, so any operator border, radius or shadow wins. Where the × hides
(FR-36-6 `trigger` predicate), its reserved 64px top row is released too (`--sgs-nd-close-room`), and the
opener-live flag clears only once the dialog has closed, so the × never reappears during the exit
animation.

**The scrim (U-2, M-14, D1148).** The drawer and the menu bar (`sgs/nav-bar-menu`, for every dropdown and mega panel it opens) carry the shared scrim: `supports.sgs.scrim` plus `scrimColour`, `scrimColourGradient` and per-device `scrimOpacity` and `scrimBlur`, rendered by `plugins/sgs-blocks/includes/helpers-scrim.php::sgs_scrim_render` (tint on `::before`, blur on the element, open state from CSS `:root:has(<open selector>)`, printed at `wp_footer`). Defaults: the drawer is black at 0.55; the bar has none unless set. A click on the scrim closes the surface and is absorbed, so a dismiss never follows a link underneath (click-through to a link underneath is an accepted divergence). The same helper serves `sgs/modal`, the `sgs/cart` drawer, the `sgs/gallery` lightbox and `sgs/product-search`; `scripts/scrim/check-scrim.py` fails the build on any dimming block that paints its own. The earlier "NO scrim element, 8/8 references have none" held for the eight drawer-variant references only; M-14's six references show part-width drawers and panels with one. 

**Motion: how the drawer and the panels arrive and leave (U-5, M-31, M-32).** One vocabulary across
the drawer and every dropdown and mega panel: a shape, an opening and a closing time, a speed curve and an item
stagger. The speed curves are one shared list, `plugins/sgs-blocks/includes/helpers-motion-easing.php::sgs_motion_easing_css`
(editor `src/components/MotionEasingControl.js`), also read by the burger morph.
- **Drawer.** `entryAnimation` is a tier object: `auto` (follows the anchor at that tier: header expands down,
  trigger scales from its corner, centred scales up, full-screen drops 8px), `none`, `fade`, `slide-start`,
  `slide-end`, `slide-up`, `slide-down`, `wipe-down`, `wipe-down-skew`, `reveal-from-bar` (clips open from the
  opener's header row), `curtain` (a `curtainColour` or `curtainColourGradient` layer sweeps across while the
  content fades in) and `scale`. The close plays the shape in reverse. `entryDuration` (250ms) and
  `exitDuration` (200ms), `entryEasing` (ease-out), `entryFade` (slides and wipes also fade). Rendered as
  custom-property values by `plugins/sgs-blocks/includes/helpers-nav-drawer-motion.php::sgs_nav_drawer_motion`;
  the keyframes live in `nav-drawer/style.css` and use `translate`, so a drawer positioned by `transform`
  keeps its place.
- **Drawer item stagger.** `itemStagger` (ms between items; 0 is off), `itemStaggerDistance` (tier object, px,
  negative drops items from above), `itemStaggerDuration`, `itemStaggerMax` (0 means no cap) and
  `itemStaggerOnClose` (last item leaves first). An item is a top-level drawer menu item only, so a nested
  accordion never restarts the count; a logo or button beside the menu arrives with the last item. The item
  rules live in `nav-drawer-menu/style.css`, keyed on values the drawer writes.
- **Panels.** `sgs/nav-bar-menu` owns them, as it owns the scrim: `submenuAnimation` (`none`, `fade`,
  `fade-lift`, `slide-down`, `grow`) reaches the dropdown and the mega fork alike through the shared
  `.sgs-nav-bar-menu__panel-motion` class; `submenuAnimationDuration` (180ms), `submenuExitDuration` (150ms;
  0 closes instantly), `submenuAnimationEasing`, and `submenuItemStagger` with its duration, cap and distance.
  Entry and exit run through `@starting-style` and `transition-behavior: allow-discrete` on `display`; while a
  panel closes it takes no pointer hits and leaves the Tab order, so moving from one trigger to the next never
  re-opens the old panel. A browser without the exit part closes instantly. The bar's scrim fades with the
  panels; the drawer's scrim fades with the drawer unless `scrimFadeDuration` is set. `sgs/nav-drawer-menu` reads the
  same `submenuAnimation*`, `submenuExitDuration` and `submenuItemStagger*` attributes for its accordion sections, with
  its own values and rules (see "Drawer item-level parity").
- **Close and focus.** The drawer closes only after every animation inside it has finished (the dialog's own,
  a curtain's `::before`, a reversed item stagger): `plugins/sgs-blocks/src/shared/nav-interactivity/store.js::whenAnimationsSettle`, with a fail-safe timer.
  When the entry is longer than 500ms, focus holds on the dialog until the entry ends, so the first link's
  focus ring is never drawn under a wipe that still clips it.
- **Reduced motion.** Every shape, transition and stagger sits inside `prefers-reduced-motion:
  no-preference`; under `reduce` the drawer and the panels open and close whole.
- **Design rules (binding):** (1) **the look axis is the LOOK** — a complete-clone preset of internal
  make-up (type scale 16–160px across references, columns, alignment, secondary-block roster) that sets
  DEFAULTS and hardcodes NOTHING; anchoring/geometry are plain per-device ATTRIBUTES (the "what the panel
  attaches to" axis survives only as the `anchor` attribute's values). (2) There is no "full-screen below
  collapse point" toggle — incoherent under Burger Menu = Always; per-device `anchor` covers that case
  generically (`trigger` desktop + `full-screen` tablet).
- **A FLAT look holds** (`.claude/reports/2026-07-28-drawer-code-extraction/`): 6 of 7 confirmed
  sites keep one character at every width; one card is fluid-capped BY DERIVING the header's width (measured
  at 400px: 368×436 = `min(438px, 100vw−32px)`); only one reference swaps compact→takeover below desktop,
  handled by the per-device `anchor`. `side-panel` is not an `anchor` value — zero reference evidence at any
  width.
- **Fidelity status.** The drawer looks reproduce structure and copy, not design: styling, borders,
  symbols, button treatment, cycling background imagery and its motion, and animated secondary media are
  absent. They must not be presented as faithful clones without rework; the Bean's-eye rubric (§8) lists
  the grounds that review checks. Record: `.claude/reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md`.
- **POC content rule:** POC fixtures are EXACT clones INCLUDING content (per-fixture classic menus with the
  references' real labels + copy) so differences attribute to the block; genericising the content is a named
  pre-production step.
- **Design rationale (measured, ~30 sites — `.claude/reports/2026-07-28-nav-drawer-desktop-variant-research.md`):**
  - **ONE block with VARIANTS, not two blocks.** Every production system checked does this (WP core
    Navigation `overlayMenu`; Bricks; Webflow; GOV.UK; Elementor). The documented failure mode is one block
    whose two modes cannot diverge (Gutenberg #39142); the drawer is immune because it holds its OWN
    `sgs/nav-drawer-menu` instance with its own uid + inspector.
  - **`header` anchor must DERIVE its width from the header, never hardcode a number.** Measured on one
    reference: panel **438×436 @ left:501/right:939**, header pill **438×50 @ left:501/right:939** —
    identical width and edges. Deriving it means one rule works for a 438px pill or a 1200px bar and
    degrades correctly on mobile with no extra work.
  - **Full-screen is the DEFAULT and the norm** — 6 of 8 measured sites. Each compact cluster is **n=1**, so
    its numbers are design anchors, not medians.
  - **Each variant declares its own A11Y CONTRACT, not just CSS.** The two compact references are
    mechanically different (no-backdrop + background-interactive + explicit-close, vs backdrop-present +
    click-through + light-dismiss) and **neither is a real modal**; a native `<dialog>` is spec-supported at
    ANY size/position and is more accessible than both. ⛔ Beware STOP-DIALOG-DISPLAY-GATE when adding
    per-device geometry.
  - **Naming rule (binding): descriptive names, never studio names.** This ships to a restaurant, a law
    firm and a charity. Provenance belongs in the block.json `_note`.
  - **A shared dialog-geometry primitive** would also serve the cart flyout and search overlay
    (FR-36-19/-20) and must carry a modal/non-modal flag or it conflicts with `sgs/mega-panel`'s DISCLOSURE
    contract (FR-36-10). See Open Questions.

#### The drawer as a CPT — outcomes in force
Full record: `.claude/plans/archive/2026-07-29-spec36-37-merged-architecture-and-drawer-cpt-gate.md`.
1. **The drawer is the `sgs_drawer` CPT — admin name "Menu drawer".** Registration, Active/preview model and
   admin shape are owned by **Spec 37 FR-37-43**; this spec keeps drawer BEHAVIOUR (modal a11y, focus,
   motion, close model). The block markup is the CPT's content; `sgs/nav-drawer` is the render vehicle.
   Scope: **site-wide Active default + per-burger override** via the picker. **BUILT:** the CPT, its Active
   model, template lock, and the `wp_footer` render path
   (`plugins/sgs-blocks/includes/class-sgs-drawer-render.php::render_active_drawer`);
   header starter patterns embed no `sgs/nav-drawer` (only the drawer starter patterns do:
   `theme/sgs-theme/patterns/drawer-scratch.php`, `framework-drawer-default.php` and the `drawer-*.php` looks).
2. **The drawer looks as "Menu drawer" starter patterns — BUILT.** Each look is a pattern
   (`theme/sgs-theme/patterns/drawer-*.php`, keyword `featured`) carrying the drawer's own attributes and
   a starting block roster; every value stays editable and nothing locks. They are offered by the
   starter-look control and seeded as Menu drawer posts (Spec 37 FR-37-43, FR-37-47, FR-37-48).
   `sgs/nav-drawer` declares no `variantPreset` attribute and registers no block variations
   (`git grep -n variantPreset -- plugins/sgs-blocks/src` returns nothing).
3. **`drawerRef` — BUILT on the burger, string on the drawer.** `sgs/nav-bar-menu` `drawerRef` is
   `type: number` — a `sgs_drawer` post id, 0 = use the Active drawer (`Sgs_Active_Layout::AREA_DRAWER`),
   resolved by `Sgs_Drawer_Render::drawer_ref_for()`. The picker is a `SelectControl` over `sgs_drawer`
   posts in `plugins/sgs-blocks/src/blocks/nav-bar-menu/DropdownSettingsPanel.js`, with a dangling-post
   Notice (FR-36-9a). `sgs/nav-drawer` `drawerRef` remains a string element id (default `sgs-nav-drawer`).
   **Inline creation, built:** the picker offers "Create a new menu panel" (`plugins/sgs-blocks/src/blocks/nav-bar-menu/useCreateDrawer.js::useCreateDrawer`, mounted by `CreateDrawerControl.js`); it is the only add path.
4. **The nav-menu blocks stay BLOCKS** (`sgs/nav-bar-menu` and `sgs/nav-drawer-menu`) — their content home is
   the classic menu, their edit surface is the header CPT; a nav-menu CPT would triple-indirect. Trigger
   presentation: FR-36-27.
5. **Controllability contract:** every reference-derived property has exactly one home — CPT content/attrs,
   inspector attrs (Spec 35-manifested), or theme tokens. A value with no home is a build defect.
6. **Cloning is the FINAL PROOF GATE, not the next task:** fixture wave → capability wave (CPT + FR-36-27 +
   FR-37-42 + harness fixes) → polish → cloning real references through Spec 47 (the acceptance proof is FR-37-23).

**Drawer settings surface — BUILT** (a "Drawer" inspector panel, per-device via the shared
`ResponsiveControl`, never a new switcher; all emission through the shared responsive helpers into the
scoped `<style>`, zero inline):
| Setting | Attr | Shape | Default | Notes |
|---|---|---|---|---|
| Background | `drawerBg` | string slug | `surface` | fg computed (WCAG resolver — contrast holds with zero config) |
| Close icon colour | `toggleCloseColour` | string slug | `""` = computed from header context | × colour when open; burger colour untouched (owned by header styling) |
| Content alignment | `drawerAlign` | enum `start`/`center`/`end`/`stretch` (logical, so it flips in a right-to-left language; `center` is US spelling as the CSS keyword) | `start` | maps to align-items on the drawer body; children may override. `stretch` ("Full width") is the only value that makes a child span the drawer: align-items can move a shrunk-to-content box but never widen it, so a container or a row of buttons needs it (U-18 G7) |
| Inner element spacing | `drawerGap` | object `{desktop,tablet,mobile}` | `{desktop:"20px"}` | gap between child rows |
| Popup padding | `drawerPadding` | object `{desktop:{top,right,bottom,left},…}` | `{}` | emitted via `sgs_emit_responsive_css` |

**Editor-canvas preview is collapsed by default, never opened by `isSelected`.** `edit.js` cannot render the
real `<dialog>` — a closed `<dialog>` cannot host an editable InnerBlocks region and `<ServerSideRender>`
cannot host one at all — so it renders a `<div>` preview shell instead. `style.css`'s real-dialog
`width:100vw` / `height:100dvh` also land on the shell inside the editor canvas, because WP enqueues a
block's `style` there too and `useBlockProps` puts `wp-block-sgs-nav-drawer` on the shell alongside
`sgs-nav-drawer__editor`; with no opposing height/width in `editor.css` the shell would fill the whole canvas
fold (100dvh), and `min-height` cannot fix that because it loses to an explicit `height`. The design mirrors
what `core/navigation` does for its own overlay (collapsed in BOTH `style.scss` and `editor.scss`, opened by
an explicit control, deliberately NOT by `isSelected`, which would reflow the canvas every time the operator
selects a different block):

- **Collapsed (default)** — a summary strip carrying the "Mobile drawer (preview)" label. The body is hidden
  with CSS, never unmounted, so the drawer's children cannot be dropped and stay reachable in List View.
- **Expanded** — an InspectorControls `ToggleControl` labelled **"Preview drawer open"**; the shell is
  bounded to 420px with its own scroll, plus the height/width neutralisers that cancel `style.css`'s
  viewport sizing.

**The toggle is component state (`useState`), not a block attribute — it must never serialise into saved
content; an editor preview is not a property of the page.** `editor.css` compiles to `index.css`
(`editorStyle`) and never reaches the frontend, and no `display` is added to the dialog's base rule, so
STOP-DIALOG-DISPLAY-GATE stays intact. This is an editor-UX rule inside FR-36-6's scope, not a separate
capability.

### FR-36-29 — Drawer row ornament, per-item media, sibling dim and label roll (`sgs/nav-drawer-menu`)
**Status:** BUILT: `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::attributes.itemOrnament`, `::attributes.itemExpanderRotate`, `::attributes.itemMedia`, `::attributes.siblingDimColour` and `::attributes.labelRoll` are declared, and `plugins/sgs-blocks/includes/helpers-item-effects.php::sgs_sibling_dim_css` emits the dim. Not on the bar, by Bean's ruling.
U-6 and U-7 provide four item-level mechanisms to the drawer's own accordion list, each a genuinely
different element from the bar's own item paint (FR-36-4):
- **Row ornament (M-22).** `itemOrnament` (a per-tier `{desktop,tablet,mobile}` object: `none` | `index` | `icon`)
  leads each primary row with either a decorative two-digit counter (`01`, `02`, …) or a glyph
  (`itemOrnamentIcon`, an icon-picker object, with an optional `itemOrnamentIconHover` crossfade).
  `itemOrnamentColour`/`itemOrnamentColourHover` and `itemOrnamentSize`/`itemOrnamentGap` style it
  (`plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::attributes.itemOrnament`).
- **Accordion expander.** `itemExpanderIcon` (icon-picker, default `chevron-down`) is the `<summary>` glyph;
  `itemExpanderRotate` (degrees, default 180, range -360 to 360) is the turn it takes while its accordion is
  open — 45 degrees turns a plus into a cross (`plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::attributes.itemExpanderRotate`). Its size, gap, opacity and
  turn timing are the `submenuCaret*` attributes (Spec 36 "Drawer item-level parity").
- **Per-item media (M-15).** `itemMedia` (`''` | `featured-image`) shows the linked page's own featured image
  beside its label; a GIF or WebP is served full size so it keeps animating. `itemMediaReveal` (per tier:
  `none` | `always` | `hover`, growing from zero width on hover or keyboard focus), `itemMediaWidth` (unset
  160px) and `itemMediaHeight` (unset 112px), both per tier, and `itemMediaRadius` size and shape it. It is a
  decorative slot, not an operator-placed image, so `supports.sgs.imageControls` is `false`
  (`plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::attributes.itemMedia`).
- **Sibling dim (M-24).** `siblingDimColour` (+ `siblingDimColourGradient`) and `siblingDimOpacity` recolour
  every OTHER item in the list while one is hovered or keyboard-focused (a list-scoped `:has()` rule,
  `plugins/sgs-blocks/includes/helpers-item-effects.php::sgs_sibling_dim_css`); `''`/unset is off. Drawer and icon-list only — not
  built on the bar (Bean).
- **Label roll (M-25).** `labelRoll` (`''` | `up` | `up-scale`) rolls an item's label up to a second copy of
  itself on hover or keyboard focus, honouring reduced motion; `itemMotionDuration`/`itemMotionEasing` is the
  one shared item-motion timing pair for sibling dim, label roll and the ornament crossfade
  (`plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::attributes.labelRoll`). Distinct from `triggerHoverLabel`/`triggerOpenLabel` (FR-36-27), which
  roll the BURGER TRIGGER's own word, not a list item's.
- **Row separators.** Two independent mechanisms. The `itemBorderWidth`/`itemBorderColour*` family paints the
  bottom edge of a vertical row (on the horizontal bar the same attribute paints the item underline instead —
  `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::attributes.itemBorderWidth`). The `separators` setting draws the line between stacked rows, with its
  own colours and hover treatment ("Drawer item-level parity", FR-41-37).
- **Numbered link lists.** `sgs/icon-list`'s `markerType: 'numbered'` plus its per-item `description` (FR-36-26)
  serves the numbered starter pattern (`sgs/mega-compact-links-numbered`) that pairs with this unit.

### FR-36-27 — Burger trigger presentation — PARTIAL
**Status:** PARTLY BUILT: `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::attributes.triggerMode`, `::attributes.triggerLabel`, `::attributes.burgerMorph`, `::attributes.triggerDetach` and `::attributes.triggerOpenLabel` are declared and emitted by `plugins/sgs-blocks/includes/nav-menu-trigger-css.php::sgs_nav_bar_menu_trigger_css`. Not built: `triggerStyle`, `triggerSymbol` and `triggerOpenStyle` (absent from that `block.json` and from `block_attributes` for `sgs/nav-bar-menu`; `triggerStyle` exists only on `sgs/cart` and `sgs/modal`).
The references make the trigger a designed element (one renders the word "MENU", one a symbol, one a morphing
glyph). **BUILT** on `sgs/nav-bar-menu` (burger is bar-only), all inspector-manifested: `triggerMode`
(`icon` | `text` | `icon-and-text`, per device: a tier object), `triggerIconPosition` (icon before or after the
label), `triggerIcon` (an `IconPicker` object), `triggerLabel` (default
"Menu"), and the magnet-hover attributes (`triggerMagnetEnabled` / `Radius` / `Strength`), specified in
FR-41-30/31 (§14.7). The burger↔X morph is built but auto-gated to the default glyph
(`plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_bar_menu_burger_toggle_markup`, `$is_default_icon`).
**Its pose and timing are operator choices (U-11):** `burgerMorph` (`x` default | `x-rotate`, an X
plus a 180 degree turn | `line`, the bars collapse onto one line | `none`), `burgerMorphDuration` (ms,
default 200) and `burgerMorphEasing` (named curves from the theme easing tokens plus a validated custom
`cubic-bezier()`), delivered as custom properties; reduced motion still wins. `burgerBarCount` (3 default, or
2) sets how many bars the default glyph draws; two bars sit 6.5px apart centre to centre and have their own pose
under every `burgerMorph` value (the two bars cross into an X). `burgerSize` is the button's height
and `burgerWidth` (per tier, empty = square) its width; a button under 44px keeps a 44x44 tap area on its
`::after`. The bar-stack BOX is `burgerIconWidth` (bar length) and `burgerIconHeight` (bar stack height), both
per tier and both empty by default, which keeps the box at 24x18 (U-18; a reference's bars are 16px in a 12px
stack). They write `--sgs-nbm-icon-w` and `--sgs-nbm-icon-h` rather than bare `width`/`height`, because every
`burgerMorph` pose derives its open travel from `--sgs-nbm-icon-h` through `calc()`, so one property reaches
every pose. `burgerBarGap` (per tier, empty by default) is the space between the bars: it writes
`--sgs-nbm-icon-h` as `calc(bars x 2px + (bars - 1) x gap)` from `plugins/sgs-blocks/includes/nav-menu-trigger-css.php::sgs_nav_bar_menu_trigger_css`,
after the `burgerIconHeight` rule, so a set gap wins over it. The button's own box takes `burgerPadding` (tier
box; unset keeps `padding:0`), `burgerBorderRadius` (tier length; unset keeps the zero-specificity
`:where(.sgs-nav-bar-menu__burger)` medium-radius default, 8px, in `style.css`; 0 gives square corners) and
`burgerBorderWidth` (box, one value for every device) / `burgerBorderStyle` / `burgerBorderColour` (the style
is written only alongside a width, and a 0 width still writes it). Bar THICKNESS (2px) still has no setting; no reference has needed one. The bar items' label magnet
takes `itemMagnetStrength` (the pull factor; unset keeps the built-in 0.15 capped at 8px). The burger button
carries `data-sgs-nav-collapse` (its `collapsePoint`) for FR-36-6's resize rule.
**Reach, built (U-14):** `triggerSurface` (tier on/off, "Whole row opens the menu", M-39, DEC-14 as
amended to a separate attribute): below the collapse point the burger's `::after` stretches over its
`.sgs-site-header-row`, so a click anywhere on the row is a click on the button (no JS); the magnet's transform
moves to the button's children at those tiers, and other row blocks sit above the overlay
(`plugins/sgs-blocks/includes/nav-trigger-surface-css.php`). The detaching chip (M-08): `triggerDetach` (tier on/off),
`triggerDetachAfter` (tier px), `triggerDetachSize` (tier px, never below 44), `triggerDetachOffset` (tier
`{x,y}`, x from the inline end), `triggerDetachRadius`, `triggerDetachBackground`(`Hover`; empty paints the opaque surface token, so the chip is
filled once it detaches), `triggerDetachZIndex` (110). Once the header's burger is off screen and the page has scrolled past the tier's
threshold, a second copy of the burger (the same markup call, wrapper `__detach-wrap`, printed on `wp_footer` by
`plugins/sgs-blocks/includes/nav-detach-chip.php` because a row's transform would trap a fixed child) shows fixed in the top
inline-end corner, below the admin bar; `plugins/sgs-blocks/src/shared/nav-interactivity/detach-chip.js` sets `is-detached`. Every
opener of one drawer reads one open state (`plugins/sgs-blocks/src/shared/nav-interactivity/store.js::state.openByRef`), so `aria-expanded` agrees on both.

**Swap-label, built (U-6):** `triggerOpenLabel` (the word while the drawer is open, '' none) and
`triggerHoverLabel` (the word on hover), animated by `labelRoll` (`up` | `up-scale`) and the shared
`itemMotionDuration`/`itemMotionEasing`. The copies bind `aria-hidden` to `state.isOpen`, so the button's
accessible name is the visible word (WCAG 2.5.3); open wins over hover.
**NOT BUILT:** the original shape's `triggerStyle` (`burger` | `word` | `word-burger` | `symbol`),
`triggerSymbol`, and a separate `triggerOpenStyle` switch (the `morph-x` pose is `burgerMorph`, `swap-label`
is setting `triggerOpenLabel`). The drawer's own `closeStyle` stays on the drawer: trigger =
the bar's, close chrome = the Menu drawer's.
**Done when:** the NOT BUILT attrs render + round-trip in the editor, the open-state morph/swap is
live-verified with focus-return intact, and each attr appears in the Spec 35 manifest.

### FR-36-7 — Shared nav plumbing utility (framework-reusable)
**Status:** PARTLY BUILT: the shared plumbing is built as two Interactivity stores, not one: the dialog engine is `store('sgs/nav')` in `plugins/sgs-blocks/src/shared/nav-interactivity/store.js` (drawer, search overlay) and the desktop dropdown and mega disclosure is a separate `store('sgs/mega')` in `plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js`, kept apart so the modal engine is not coupled to a positioned disclosure. The body-reparent and scrollbar compensation live in `plugins/sgs-blocks/src/shared/nav-interactivity/store.js::reparentToBody`.
`viewScriptModule` Interactivity stores (public API — the established SGS pattern; NOT core-nav's private
store): `store('sgs/nav')` for the dialog surfaces and a separate `store('sgs/mega')` for the disclosure
surfaces, kept apart so the modal engine is never coupled to a positioned disclosure. They carry
open/close/focus/`inert`/intent-timing. A UTILITY
not a component (prove by the three call-sites). It carries the drawer's body-reparent (transform-ancestor
escape) and scrollbar-bounce compensation as existing mechanisms, not re-derived. **No-JS honesty:** the
menu's **links + top-level items are navigable + crawlable without JS**; the **dropdown/mega/drawer
*panels* are progressive enhancement** (the drawer degrades to `<details>`; a bar dropdown's links are still
reachable on the target page). "Crawlable without JS" ≠ "every panel opens without JS."

### FR-36-8 — Responsive collapse + THREE operator-chosen modes + per-device visibility
**Status:** BUILT: `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::attributes.collapsePoint` (default 768), `plugins/sgs-blocks/src/shared/nav-menu-panels/utils.js::BURGER_SCOPE_PX` (`always` stores 99999), `plugins/sgs-blocks/src/shared/nav-menu-panels/utils.js::LINK_COUNT_THRESHOLD` for the informational link-count notice in `plugins/sgs-blocks/src/blocks/nav-bar-menu/NavMenuNotices.js`, `drawerRef` resolved by `plugins/sgs-blocks/includes/class-sgs-drawer-render.php::drawer_ref_for`, `sgsCollapseVisibility` in `plugins/sgs-blocks/includes/device-visibility.php`, and `labelCollapse` in `plugins/sgs-blocks/src/blocks/button/edit.js` and `plugins/sgs-blocks/src/blocks/business-info/edit.js`.
- **One collapsed layout.** The **collapse point N** is a visual breakpoint (operator attribute
  `collapsePoint`, default 768) — distinct from the 768/1024 device-tier *style* system (Spec 35 D2). §8
  sweeps a non-default N.
- **Operator surface = the "Burger Menu" panel, NOT a raw pixel box.** Four named options — **Always /
  Tablet / Mobile (default) / Custom** — where `Custom` reveals the px box. **`Always` = a burger at every
  width including desktop**, which is increasingly common on large sites and is what WordPress core's
  Navigation block ships as `overlayMenu: "always"`. The STORED attribute is the numeric `collapsePoint`
  (`always` stores 99999), so render.php and every emitted `@media` rule key off one number — the panel is
  purely the operator-facing surface. **No bare px values in the UI**, and bare px presets make
  burger-on-every-device reachable only by knowing to type a large number.
- **Device-neutral language is binding.** Burger menus run on tablet and desktop, not just phones. Anything
  operator-facing says "menu panel" / "Below the collapse size…", never "mobile menu" / "on a phone" /
  "mobile drawer" — phone-framing mis-describes `Always` and `Tablet`.
- **One collapse mode: burger → drawer — BUILT.** A reference's own mobile design is cloned through the
  drawer's variants and settings, not through further collapse modes.
- **Burger→drawer association:** `sgs/nav-bar-menu` carries `drawerRef`, a `number` — the id of the
  `sgs_drawer` post its burger opens (0 = the site's Active drawer), resolved to the drawer's element id
  (→ `aria-controls`) by `Sgs_Drawer_Render::drawer_ref_for()`. A picked post that is missing, unpublished
  or deleted → editor Notice + burger no-op-with-warning (FR-36-9a).
- **Link-count / column-count notice:** a link-count / column-count editor INFORMATIONAL notice past a
  directional threshold (Baymard ~50-link abandonment cliff — validate on our sites, do NOT hard-code a DB
  default; never a gate — FR-36-12).
- **Per-device visibility:** **reuse the BUILT Responsive-Visibility extension** (device show/hide, Spec 35 /
  sgs-blocks) + `ResponsiveControl` for tiered values + the BUILT **`labelCollapse`** (Spec 37 §3.8, live on
  button/business-info — collapse an item's label to icon-only per tier). **`labelCollapse` is an operator
  TOGGLE, not an automatic behaviour** (`plugins/sgs-blocks/src/blocks/button/edit.js::labelCollapse`,
  `plugins/sgs-blocks/src/blocks/business-info/edit.js::labelCollapse`; reasoning in Spec 37 §3.8). The
  per-device cascade (Spec 35's `resolveTier()`) is BUILT; a feature that consumes it to hide equivalent
  elements per device is not built — revisit `labelCollapse` against it whenever that feature ships. The two
  mechanisms are not interchangeable: the cascade HIDES an element at a tier, `labelCollapse` KEEPS the
  element and its link while collapsing its label to icon-only. The `ResponsiveTriStateControl`
  (on/off/inherit tri-state, P2 §4.1) is **BUILT** — adopt it, never invent a parallel control (R-31-9).
  Full per-device model + ownership split: FR-36-24.
- **Moving a header block into the drawer (U-10, M-19) — BUILT by composition.** A copy of the block
  goes in the drawer body and the header copy is hidden: by tier with `sgsHideOnMobile/Tablet/Desktop`, or
  exactly while this menu shows its burger with `sgsCollapseVisibility` (`hide` | `only`), whose rules the
  header writes at this block's `collapsePoint` (Spec 37 FR-37-24, "At the collapse point, not a tier").
  Blocks reading Site Info carry no duplicate data.

### FR-36-24 — Per-device content + settings (beside FR-36-8; Spectra-standard)
**Status:** BUILT: `plugins/sgs-blocks/src/blocks/extensions/responsive-visibility.js` with `plugins/sgs-blocks/includes/device-visibility.php` (`sgsHideOnMobile`), `ResponsiveTriStateControl` mounted in `plugins/sgs-blocks/src/blocks/site-header/edit.js::Edit`, and the R-31-9 guard `plugins/sgs-blocks/scripts/lint-responsive-controls.py`.
Every header/footer/nav CONTAINER piece (rows + the pieces in §4) supports, per device tier
(desktop/tablet/mobile), a **different set of blocks** AND **different SETTINGS** on those blocks. This is the
central builder feature (Spectra parity). **Two ownership lines — do NOT conflate:**
- **(a) Whole-piece show/hide per device = Spec 37 / row-level.** The nav pieces need ZERO extra code here —
  they honour the BUILT universal Responsive-Visibility extension (`plugins/sgs-blocks/src/blocks/extensions/responsive-visibility.js`
  + `plugins/sgs-blocks/includes/device-visibility.php`; `sgsHideOnMobile/Tablet/Desktop`).
- **(b) Per-tier SETTINGS on a piece's own attributes = that block's own job**, via the shared
  `ResponsiveControl` (+ the BUILT `labelCollapse`). **No piece invents a parallel per-device control** — a
  structural guard (`plugins/sgs-blocks/scripts/lint-responsive-controls.py`) enforces R-31-9: every
  responsive-worthy attr routes through `ResponsiveControl`, never a bespoke per-tier control.

**Named upgrade — BUILT:** the `ResponsiveTriStateControl` (on/off/inherit per tier, P2 §4.1) is exported
from `src/components` and mounted several times inside
`plugins/sgs-blocks/src/blocks/site-header/edit.js::Edit`; the gate script
`plugins/sgs-blocks/scripts/inspector-scan/rules/25-no-own-device-switcher.js` references it. Verify:
`git grep -c "<ResponsiveTriStateControl" -- plugins/sgs-blocks/src/blocks/site-header/edit.js`. It is the
richer form of (a)/(b). Adopt this control; never invent a parallel per-tier switcher (R-31-9).

**Menu case (the one-menu-source default):** the bar and the drawer DEFAULT to ONE shared menu (both resolve
`ref` 0 through the same chain — FR-36-1 — no drift, faithful clone), with a deliberate per-device override
available (a different `ref` on the drawer's `sgs/nav-drawer-menu`). This per-device-content capability IS
the override, so FR-36-1's "may use different menus" is an explicit opt-in, not the default.

### FR-36-9 — Nav → header decoupling (one-directional)
**Status:** PARTLY BUILT: the published surface and hide-on-scroll are built (`plugins/sgs-blocks/src/header-behaviours/view.js::publishHeight`, `::initScrollBehaviours`, `::initRowBehaviours`; `plugins/sgs-blocks/src/blocks/site-header/block.json::attributes.headerHideOnScroll`) and no `data-sgs-header-state` attribute exists. Not built: a document-level hidden-state signal for a partial-width drawer (`is-row-hidden` lands on rows only), tracked in the table below and in section 12.
The header knows nothing about the nav; coupling is nav → header only, via the header's **real published
surface:** `--sgs-header-height` (a `:root`/`body` CSS var from a ResizeObserver,
`plugins/sgs-blocks/src/header-behaviours/view.js::publishHeight`) + the state classes
**`is-header-scrolled` / `is-header-shrunk`** (toggled in
`plugins/sgs-blocks/src/header-behaviours/view.js::initScrollBehaviours`; there is NO
`data-sgs-header-state` attribute — a richer signal would be new Spec 37 work). A partial-width drawer binds
`top`/`max-height` to `--sgs-header-height`.

**Tracked dependency — "header hidden on scroll → drawer full height".**

| Field | Value |
|---|---|
| **Status** | Not needed for the default (full-viewport) drawer · `OPEN (blocked on a published signal)` for a partial-width drawer |
| **Depends on** | A *hidden*-state signal published from the header to the nav |
| **Blocking?** | No. Nothing in Phase 1 or Phase 2 waits on it |

**Hide-on-scroll itself is BUILT.** It is wired end to end:
`plugins/sgs-blocks/src/blocks/site-header/block.json::attributes.headerHideOnScroll` →
`plugins/sgs-blocks/src/blocks/site-header/render.php::$sh_hide` → per-tier resolution and the row-state
toggle in `plugins/sgs-blocks/src/header-behaviours/view.js::initRowBehaviours` / `::setRowCollapsed` → the
state rule
`plugins/sgs-blocks/assets/css/header-behaviours.css::.sgs-row-behaviour[data-sgs-row-hide-on-scroll].is-row-hidden`.
Verify: `git grep -n "headerHideOnScroll\|is-row-hidden" -- plugins/sgs-blocks/src/blocks/site-header plugins/sgs-blocks/src/header-behaviours plugins/sgs-blocks/assets/css/header-behaviours.css`.

**The residual, stated precisely.** What the header publishes is a HEIGHT (`--sgs-header-height`) plus the
scroll-state classes `is-header-scrolled` / `is-header-shrunk`. It publishes no *hidden*-state signal the nav
can read — `is-row-hidden` lands on the individual ROW element, not on a document-level surface a `<dialog>`
in the top layer could key off. So a drawer cannot currently know the header is hidden and reclaim its space.

**This is moot for the default drawer.** The default drawer is full-viewport (FR-36-6), so it already
occupies the header's space whether the header is hidden or not — there is nothing to reclaim and no signal
is needed. The residual applies ONLY to a partial-width drawer anchored below the header (the `header`
anchor). If that combination is built against a hide-on-scroll header, a published hidden-state signal is
owed from Spec 37 first; do not work around it on the nav side by reading the header's DOM.

### FR-36-9a — Referential integrity + orphan lifecycle
**Status:** PARTLY BUILT: built are clause (1), a trashed or unpublished mega target renders a plain link (`plugins/sgs-blocks/includes/class-sgs-mega-menu-cpt.php::resolve_panel_for_menu_item` returns null), clause (2), the burger-without-drawer notices (`plugins/sgs-blocks/src/blocks/nav-bar-menu/useDrawerNotice.js`, `plugins/sgs-blocks/src/blocks/nav-bar-menu/NavMenuNotices.js`, `plugins/sgs-blocks/src/blocks/nav-bar-menu/DropdownSettingsPanel.js`), and clause (4) by design (the panel is an independent CPT post). Not built: clause (3), the admin notice listing the items that reference a trashed mega (none under `plugins/sgs-blocks/includes`), and clause (5), the section 8 integrity sweep (none under `plugins/sgs-blocks/scripts/nav-qa`). The editor notice offers no one-click insert of a drawer block; it points to the 'Panel this burger opens' picker, where `plugins/sgs-blocks/src/blocks/nav-bar-menu/useCreateDrawer.js::useCreateDrawer` creates a new `sgs_drawer` post.
No reference silently breaks: (1) a menu item whose mega target is trashed/missing renders as a **plain
link**; (2) a burger whose drawer cannot be found → editor Notice + burger no-op-with-warning; (3) a trashed
mega surfaces an admin Notice listing referencing items; (4) deleting a menu item leaves no orphan (the panel
post is an independent, reusable CPT); (5) §8 includes an integrity sweep. These are **error states**,
distinct from FR-36-12's informational a11y notices.

**Clause (2) — BUILT.** The `drawerRef` control lives on `sgs/nav-bar-menu`
(`plugins/sgs-blocks/src/blocks/nav-bar-menu/DropdownSettingsPanel.js`; the notice logic in
`plugins/sgs-blocks/src/blocks/nav-bar-menu/useDrawerNotice.js` and `NavMenuNotices.js`). It covers three
cases:
- **A picked drawer post** (`drawerRef` > 0) that is missing, unpublished or deleted → the picker's own
  dangling-reference Notice ("This burger will open nothing until a valid one is chosen"). While a post is
  picked, the sibling-block checks below stay silent so the two mechanisms never contradict each other.
- **No drawer at all** (`drawerRef` = 0, no Active drawer answers, no `sgs/nav-drawer` on the page). Header
  STARTER patterns embed no drawer (the Active `sgs_drawer` answers), but a header assembled by inserting
  the blocks by hand may have none, so the burger opens nothing — silently, with nothing for a non-coder to
  diagnose. The Notice says so in plain English and points at the "Panel this burger opens" picker, where
  "Create a new menu panel" (`useCreateDrawer`) saves a new `sgs_drawer` post and writes its id to `drawerRef`;
  the drawer lives in its own post, so no block is inserted into the header or the page. A mismatch notice
  (a drawer block on the page whose id differs) points at the same picker.
- **The site-wide Active drawer answers** (an ordinary page holding no `sgs/nav-drawer` block is the CORRECT
  state). The Notice shows where to edit the panel ("Edit the menu panel") and declares that the editor
  canvas cannot preview it (`wp_footer` never fires there). It matches on the Active drawer's own
  `drawerRef` (a burger opens by element id, so an Active drawer with a different ref genuinely opens
  nothing).

**Binding details, mirrored from the render path:** with no specific pick, a blank `drawerRef` resolves to
`sgs-nav-drawer` on BOTH sides (`Sgs_Drawer_Render::drawer_ref_for()` and
`plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$drawer_ref`), so the editor compares *effective*
refs — a blank-vs-default pair is a MATCH. **The notice only fires on `sgs/nav-bar-menu` instances** —
`sgs/nav-drawer-menu` has no `drawerRef` attribute. The creation action is shown only to a user who can
edit theme options (`useCreateDrawer` probes `canUser`). **The drawer cannot be seeded from
`sgs/site-header`'s TEMPLATE** — its root is a `<dialog>` that promotes to the top layer, it must be a
sibling, and the container is `templateLock:'all'` around exactly three rows. A notice on the nav block is
the only mechanism that reaches a header assembled by inserting blocks by hand. **Informational, never a gate** (Spec 37 FR-37-19 /
P1 DP2a): an operator can always save a header with no drawer — a client blocked from saving with no trail is
the failure that policy exists to prevent.

## 4. Utility pieces (best-version; EXTEND existing blocks)

> The nav composes with five utility pieces. Each EXTENDS an existing block — with an HONEST built-vs-to-build
> note and a phase line so a solo builder knows the sequence. The ONE a11y decision gate for every interactive
> piece is FR-36-10's: does the open panel leave the page usable (**DISCLOSURE**) or dim/block it (**DIALOG**)?
> — reuse that contract, never a second one. All bind the §10 constraints (no-inline, Spec 35A Part L controls,
> attribute-writable by Spec 47, WCAG, perf, UK).

### Spec maturity index — read this before dispatching any §4 FR

The FRs in this section sit at uneven maturity. FR-36-26 is a dispatchable sub-spec (frozen attribute table,
definition of done, authoring contract); the others are one page of intent each, or built. A reader who
assumes they are peers will hand an OUTLINE FR to a builder and get several different implementations.

`Spec maturity` answers exactly one question: **"can this FR be handed to a builder AS WRITTEN, without a
design pass first?"** That is a property of *this document's own text*; it changes when the spec is edited,
never when code ships. Build status is each FR's own `Status:` line (§1a). Do not merge the two.

| FR | Piece | Spec maturity | Owed before it can be dispatched |
|---|---|---|---|
| FR-36-19 | Cart | `OUTLINE` (core built) | A frozen attribute table for the mini-cart panel beyond `plugins/sgs-blocks/src/blocks/cart/block.json`; which of the remaining SHOULD/NICE items are in scope for a dispatch |
| FR-36-20 | Search | `OUTLINE` (core built) | A frozen attribute table for the four `displayMode` values; the debounce/cap values as attributes not prose; the result-source wiring (Store API vs post query) and how the display modes share ONE combobox instance |
| FR-36-21 | Social icons | `OUTLINE` (core built) | The platform set as data (DB-first, R-31-1) not a hardcoded list; the accessible-name generation rule as a named helper |
| FR-36-22 | Logo | `OUTLINE` | The resolution chain is frozen and dispatchable on its own; the lockup / favicon-sync / variant attrs need a frozen table before that half can be dispatched |
| FR-36-23 | Business info | `OUTLINE` | The `sgs_site_info` field roster + its sanitisers as a frozen table; the open/closed-state computation rule; the `labelCollapse` reuse points named per element |
| FR-36-26 | Link lists | `DISPATCHABLE` (built) | Nothing — FR-36-26c freezes the attribute table and states the definition of done and the live verification |

**Rule when adding a §4 FR:** it starts at `OUTLINE` and carries its own "owed before dispatch" row. It moves
to `DISPATCHABLE` only when a frozen attribute table, a named dispatch shape and a definition of done all
exist in its own text.

### FR-36-19 — Cart (`sgs/cart`, extend) — full WooCommerce header cart
**Status:** PARTLY BUILT: the MUST and SHOULD items are built (`plugins/sgs-blocks/src/blocks/cart/block.json::attributes.displayMode`, `::attributes.autoOpenOnAdd`, `::attributes.hideOnCartCheckoutPages`, `::attributes.freeDeliveryMessage`; `plugins/sgs-blocks/src/blocks/cart/store-api.js` over `wc/store`; the `role="status"` badge in `plugins/sgs-blocks/src/blocks/cart/render.php`). Not built (NICE): the cross-sell slot, the empty-state recommendations slot and a sticky mobile 'view cart' bar (no match in the cart folder).
**Spec maturity: `OUTLINE`** — see the §4 index.

**Built behaviour.** `sgs/cart` renders a count badge and a mini-cart: `displayMode`
(`plugins/sgs-blocks/src/blocks/cart/block.json::attributes.displayMode`: `link` | `flyout` | `drawer`), with
the panel hydrated client-side from the WooCommerce Store API
(`plugins/sgs-blocks/src/blocks/cart/view.js::updateCartWidgets`). The badge node carries
`role="status" aria-live="polite" aria-atomic="true"` on the `.sgs-cart__badge` span emitted by
`plugins/sgs-blocks/src/blocks/cart/render.php` (`git grep -n 'role="status"' -- plugins/sgs-blocks/src/blocks/cart/render.php`), so it
announces the whole "N items" string (WCAG 4.1.3). The MUST/SHOULD/NICE lists below are the requirement set;
the attribute contract is `plugins/sgs-blocks/src/blocks/cart/block.json`.
- **MUST:** live item-count badge; AJAX add-to-cart via the **Store API** (NOT legacy cart-fragments —
  cache-safe by construction, WooCommerce's own guidance); mini-cart preview
  (thumbnail/name/qty/line-price); inline qty-edit + remove (no redirect); "View Cart" + "Checkout" CTAs;
  subtotal + shipping/tax transparency; a distinct, actionable empty-cart state (not a blank panel); keyboard +
  focus-managed + ESC.
- **SHOULD:** `displayMode` (link | flyout | drawer) as ONE attribute that AUTO-SWAPS the ARIA pattern
  (flyout→disclosure, drawer→dialog) per FR-36-10 — the differentiator; dismissible auto-open-on-add; subtotal
  on the trigger; theme-able icon/badge; hide the mini-cart on cart/checkout pages; empty-state
  recommendations slot.
- **NICE:** free-shipping progress bar; cross-sell slot; sticky mobile "view cart" bar.
- **Cart-in-drawer live-region coherence:** when the badge is duplicated into the drawer, ONE canonical node
  announces (drawer copy while open; suppress the frozen original) — no double-announce.

### FR-36-20 — Search (`sgs/product-search` / `filter-search`, extend) — predictive combobox
**Status:** PARTLY BUILT: the four display modes and the combobox are built (`plugins/sgs-blocks/src/blocks/product-search/block.json::attributes.displayMode`, `plugins/sgs-blocks/src/blocks/product-search/render.php` for `role="combobox"`, Ctrl/Cmd+K in `plugins/sgs-blocks/src/blocks/product-search/view.js`, `plugins/sgs-blocks/src/blocks/product-search/block.json::attributes.matchHighlightColour`). Results come from the plugin's own `sgs/v1/product-search` route (`plugins/sgs-blocks/includes/class-product-search-rest.php`), one `WP_Query` over `product` only: not the Store API and not post content. Not built: recent searches, popular or trending when empty, and voice input (no match in the block folder).
**Spec maturity: `OUTLINE`** — see the §4 index.

**Built behaviour, four display modes.** A genuine EXTEND — the full WAI-ARIA **combobox** pattern is shipped in
`sgs/product-search` (`role="combobox"` + `aria-expanded`/`aria-controls`/`aria-activedescendant` +
`role="listbox"`/`option` in render.php). `displayMode` (a plain string, default `inline-bar`, validated in
render.php) takes `inline-bar` | `icon-expand` | `full-screen-overlay` | `command-palette`; the overlay and
command-palette modes are a native `<dialog>` DIALOG on the shared `store('sgs/nav')` plumbing, and
`command-palette` also opens on Ctrl/Cmd+K.
- **MUST:** predictive live suggestions as-you-type (Baymard: the single highest-leverage search feature);
  debounced + capped (≤10 desktop / 4–8 mobile); `<form role="search">` no-JS fallback returning real results;
  the FULL WAI-ARIA combobox pattern (arrow/Enter/Esc; focus stays on the input); highlight the MATCHED (not
  typed) portion; product result previews (thumbnail + price); default UNSCOPED, scope as an option (NN/g).
- **SHOULD:** `displayMode` inline-bar | icon-expand | full-screen-overlay | command-palette (the overlay and
  palette = a DIALOG wrapping the combobox; the icon-expand reveal = a disclosure); labelled recent-searches
  on focus; dimmed background while open.
- **NICE:** popular/trending when empty; voice input.
- **Differentiator:** ONE shared combobox implementation reused across all display modes; today its results
  come from the plugin's own product-only REST route, and Store-API and post (content) wiring is not built — competitors bolt this on via premium/third-party (FiboSearch).
  Result count / no-results = a live region (WCAG 4.1.3), same as the cart.

### FR-36-21 — Social and contact row (`sgs/social-icons`, a wrapper of `sgs/icon` children)
**Status:** BUILT: `plugins/sgs-blocks/src/blocks/social-icons/block.json::attributes.hiddenLinks`, `sgs/icon` children bound to Site Info (the block allows only `sgs/icon`), brand glyphs from `plugins/sgs-blocks/includes/data/brand-registry.json`, and `rel` set on external links by `plugins/sgs-blocks/src/blocks/icon/render.php`. A bound child shows the Site Info link first and its own typed link as the fallback, hides only when neither gives a link, and `linkSource: "custom"` makes the typed link win (`icon/render.php`, `includes/helpers-icon.php::sgs_icon_resolve_bound_link`). The clone route builds the row from one skeleton node (Spec 47 FR-47-9). Not built (NICE): explicit Follow-versus-Share components and optional `rel="me"`.
**Spec maturity: `OUTLINE`** — see the §4 index.

**Built in** icon plan Phase B (`.claude/plans/archive/2026-10-08-icon-unification-and-spacing-control.md`).
`sgs/social-icons` is a thin wrapper (`allowedBlocks: ["sgs/icon"]`) whose children are real `sgs/icon` blocks,
each with `metadata.bindings.linkUrl = { source: "sgs/site-info", args: { key } }` and the brand registry glyph
(`includes/data/brand-registry.json`). The bindings name Site Info keys, never a client's URL, so the same row
works for every client: a key left empty falls back to the icon's own typed link and hides its icon for visitors only when
it has none, and the editor shows a hidden icon dimmed with a notice. A new row starts with one bound icon per filled Site Info key, in registry order (phone, email, address,
WhatsApp, Facebook, Instagram, X, LinkedIn, YouTube, TikTok, Google). The inspector's Links checklist lists every
key with its filled or empty state: unticking hides a child without deleting it (`hiddenLinks`), ticking adds a
missing key at the end, a filled key with no icon is flagged; List View drag reorders.
- **MUST:** registry platform set plus any glyph per child (Lucide, WordPress icons, emoji, pasted SVG);
  **accessible name per icon**: `sgs/icon`'s `ariaLabel`, else the registry label for the bound key
  ("Follow us on Instagram", visually hidden text), " (opens in new tab)" for `_blank`; the row is a
  `role="list"` named by `ariaLabel` (blank: "Social media and contact") and each child a `role="listitem"`;
  external new-tab links carry `rel="noopener noreferrer"` automatically; group defaults set once on the row
  (`childIcon*`: glyph size, shape, background, shape size, border, glyph / background / border colours with
  hover and gradients, colour mode) print as the `--sgs-si-*` custom properties `sgs/icon`'s stylesheet reads
  after the icon's own value, so an icon's own setting always wins; the row's colour mode reaches icons left on
  Automatic through block context; brand colours (D5) apply unless the row or icon says theme, and every group
  colour beats a brand colour; 44px targets with a visible focus ring (never hover-only reveal); the row renders
  nothing when every child is hidden.
- **SHOULD:** ONE site-wide list rendered in header+footer+drawer, independently styled per placement (the
  structured-data-once differentiator, FR-36-25); drag-to-reorder.
- **NICE:** explicit Follow-vs-Share as distinct components; reduced-motion-gated hover micro-interaction;
  optional `rel="me"`.

### FR-36-22 — Logo (`sgs/responsive-logo`, extend) — the logo OBJECT
**Status:** PARTLY BUILT: built are the three-tier chain (`plugins/sgs-blocks/includes/class-sgs-site-info-logo.php::resolve_id`), per-device images, `plugins/sgs-blocks/src/blocks/responsive-logo/block.json::attributes.colourTreatment`, `::attributes.darkLogoId`, the Lottie substrate (`::attributes.lottieId`) and the shrink width (`::attributes.shrinkWidth`; the sticky-header compact-mark swap is only that width shrink). Not built: the logo-plus-site-title lockup toggle and favicon sync (no `lockup` or `favicon` match in the block folder) and a separate transparent-header variant.
**Spec maturity: `OUTLINE`** — the resolution chain below is frozen and dispatchable on its own; the
lockup / favicon / variant half needs a frozen attribute table first (§4 index).

**Phasing: basics = Phase 1** (left default placement, link-to-home, per-device image, functional alt).
**lockup + favicon-sync + transparent/dark variants = Phase 3.** **Extend** `sgs/responsive-logo`.
- **MUST — the logo resolution chain — BUILT.** The logo resolves through THREE tiers,
  first non-empty wins, evaluated per device tier:

  | Order | Source | Where it lives |
  |---|---|---|
  | 1 | The block's own per-device art-direction attrs | `plugins/sgs-blocks/src/blocks/responsive-logo/block.json::attributes.logoId` / `.logoUrl` (+ `…Tablet` / `…Mobile`) |
  | 2 | **Site Info** — the `logo` key in the `sgs_site_info` option store (a media-library attachment ID) | `plugins/sgs-blocks/includes/class-sgs-site-info-logo.php::get_id` |
  | 3 | WP's Customiser site logo (`get_theme_mod( 'custom_logo', 0 )`) | `plugins/sgs-blocks/includes/class-sgs-site-info-logo.php::resolve_id` |
  | 4 | Nothing — render no logo element at all | — |

  Tiers 2 and 3 are resolved together by `resolve_id`; the block's own images (tier 1) are decided in
  `plugins/sgs-blocks/src/blocks/responsive-logo/render.php`. A site that has never set a Site Info logo
  resolves from the Customiser as before. The `logo` key is validated on every read: an attachment that was
  deleted or is not an image yields no logo and the chain falls through. The Site Info admin's Identity
  section (`plugins/sgs-blocks/includes/class-sgs-site-info-admin-logo.php`) holds the media picker
  (Choose / Replace / Remove); the editor canvas renders the resolved logo through the server and the
  inspector says which tier is showing. Alt text: the block's alt, then the attachment's alt (site-level
  tiers only), then "[Business] home". **Done when:** setting a Site Info logo with no block-level `logoId`
  renders that logo, and clearing it falls through to the Customiser logo, both live-verified, not asserted.
  The Organization JSON-LD logo (`plugins/sgs-blocks/includes/class-org-website-schema.php::resolve_logo_url`)
  follows the same chain, and saving Site Info purges the page cache
  (`plugins/sgs-blocks/includes/class-sgs-site-info-cache-purge.php::purge`), so a new logo reaches every
  placement at once.
- **MUST (basics, Phase 1):** left is the default placement (NN/g: 6× better home-return) and the block emits no
  alignment margin: its parent places it (start alignment in a flex or grid row, text-align in block flow), so a row
  that spreads or centres its children keeps control of the free space; link-to-home on by default;
  **separate desktop/tablet/mobile IMAGE upload** (swap the file, not resize-only); SVG upload; **functional
  alt** ("[Business] home", inline authoring hint, never "logo"); max-width/height per breakpoint;
  sticky-header compact-mark swap. **BUILT:** `colourTreatment` (`''` | `white` | `auto`): `white` forces the
  logo IMAGE to pure white via a CSS filter, for a full-colour logo on a dark surface such as `sgs/site-footer`;
  `auto` whitens it only on a dark ground (U-13; the ground signals are in the next bullet).
- **SHOULD (Phase 3):** shrink-on-scroll (row+logo dimension animate); logo+site-title lockup toggle;
  **sync-as-favicon** (WP core `shouldSyncIcon`). **BUILT (U-17, U-13):** "Logo for dark backgrounds"
  (`darkLogoId`), shown in the site's dark theme and on any dark ground: inside `sgs-on-dark`, or in a header
  whose section ink reads dark (`is-header-on-dark`, which outranks a static section class; Spec 37 FR-37-50),
  with the normal logo on a light ground even in dark mode; and a Lottie substrate (`animationSubstrate`
  `svg-draw` | `lottie`, with `lottieId`, `lottieTrigger`, `lottieLoop`, `lottieSpeed`; the logo picture is the poster).
- **NICE:** reduced-motion SVG entrance/hover; auto-2x raster.
- **Differentiator:** ONE logo *object* attribute (desktop/mobile/sticky/transparent/dark with a fallback
  chain) in one inspector panel with live preview — beats the competitors' split-across-panels UX. A11y/SEO:
  visible focus (first tab-stop); `<img>` in `<a href="/">` near DOM top.

### FR-36-23 — Business-info / contact (`sgs/business-info`, extend) — the Site-Info source of truth
**Status:** PARTLY BUILT: click-to-call, click-to-email, click-to-map and `labelCollapse` are built (`plugins/sgs-blocks/src/blocks/business-info/render.php`, `plugins/sgs-blocks/src/blocks/business-info/block.json::attributes.labelCollapse`, `::attributes.addressLink`) over the single Site Info store, and `plugins/sgs-blocks/includes/class-org-website-schema.php` upgrades to `LocalBusiness` from the same fields. Not built: the live open/closed state from opening hours and the multi-location repeat (no match in the block folder).
**Spec maturity: `OUTLINE`** — needs the `sgs_site_info` field roster + sanitisers as a frozen table before
dispatch (§4 index).

**Phasing (Phase 2). Extend** `sgs/business-info` — the Site-Info source of truth.
- **MUST:** click-to-call (`tel:` E.164); click-to-email (`mailto:` descriptive text, not a raw address);
  click-to-map (Google Maps URL/Place ID); the **single Site-Info source of truth**
  (name/phone/email/address/hours edited ONCE → header utility bar + footer + contact page + schema); schema.org
  `LocalBusiness` JSON-LD driven by the SAME fields (owned by `seo-schema`, FR-36-17 — blocks never emit schema
  themselves); responsive collapse to icon-only on mobile keeping the link + 44px target (reuse `labelCollapse`,
  BUILT).
- **SHOULD:** live open/closed state from opening hours ("Open now — closes in 2h"); a utility bar as a distinct
  zone above the nav row (header-builder territory, Spec 37); multi-location repeat-per-branch, schema-tagged.
- **NICE:** auto phone normalisation; pre-filled `mailto:` subject.
- **Differentiator:** ONE Site-Info source powering utility bar + footer + contact + schema simultaneously +
  native live open/closed without a plugin.

### FR-36-26 — Link lists (footer + anywhere): typed or menu-bound, in ONE block
**Status:** BUILT: `plugins/sgs-blocks/src/blocks/icon-list/block.json::attributes.source`, `::attributes.menuRef`, `::attributes.markerType` and `::attributes.renderLandmark` are declared; menu resolution goes through `plugins/sgs-blocks/includes/class-sgs-nav-menu-source.php::blocks_from_ref` and the flatten helper is `plugins/sgs-blocks/includes/helpers-list-markers.php::sgs_icon_list_flatten_menu_blocks`.
**Spec maturity: `DISPATCHABLE`** — FR-36-26c freezes the attribute table, the definition of done and the
live verification (§4 index). **Built:** Presentation (heading + markers + typography) and
data+semantics (source toggle + menu binding + the FR-36-26a contract) both ship. This is the footer-menu
answer to the `core/navigation` ban (§1).

**The need.** A footer needs a titled list of links — sometimes typed by the operator, sometimes bound to a
real WP menu so it stays in step with the site. Both render "a heading plus a list of links"; they differ
only in where the links come from and whether the result is a landmark.

#### The shape: extend `sgs/icon-list`. No new block, no compound.
`sgs/icon-list` carries a **heading**, a **marker set**, the shared **`TypographyControls`** family, and a
**`source` toggle** (`typed` | `menu`). `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` keep the site navigation
role (bar + drawer respectively).

**Why a `source` attribute and NOT a compound block swapping child blocks:** swapping InnerBlocks on a toggle
is fragile in Gutenberg AND destroys whatever the operator typed the moment they try menu mode. A `source`
attribute keeps both datasets intact — typed `items[]` stay stored while menu mode renders — so flipping back
is lossless. This is the `sourceMode` pattern already used legitimately on `sgs/product-card`
(`wc-product`/`sgs-cpt`).

**Why `icon-list` and not the nav blocks own this.** Menu→markup must exist in ONE place; that is satisfied
by CALLING the shared resolver: `SGS_Nav_Menu_Source` is a static utility class with public methods
(`get_menu_blocks`, `blocks_from_classic_menu`, `blocks_from_ref`…) consumed by `nav-bar-menu`,
`nav-drawer-menu`, `icon-list` (with `plugins/sgs-blocks/includes/helpers-list-markers.php`) and `class-sgs-active-layout.php`.
Calling it is REUSE, not duplication. The cost asymmetry decides it: the nav blocks would have to absorb
markers + typography + heading + dividers — icon-list's entire presentation surface — whereas icon-list needs
one resolver call plus a conditional landmark wrapper.

**No collision with the `core/navigation` redirect.** That mapping fires only on an actual core menu block. A
draft heading is not part of one, and a typed link list has nothing to redirect.

**Heading behaviour:** blank by default when `source: typed`; defaults to the MENU'S NAME when
`source: menu`; an operator-entered title takes precedence over both and is **sticky** — a later menu rename
must never silently replace it.

**Marker set:** `icon` | `emoji` | `bullet` | `numbered` | `none`. **`numbered` requires a real `<ol>`** —
when order is meaningful the ELEMENT must say so; CSS counters reach neither assistive tech nor crawlers. The
marker renderer is ONE shared PHP helper (shared presentation, each consumer keeps its own data and
semantics).

#### FR-36-26a — Discoverability contract: a11y / SEO / AI-crawl / schema, per type
**Status:** BUILT: the three-type contract is implemented in `plugins/sgs-blocks/src/blocks/icon-list/render.php` (`aria-labelledby` to the heading, `wp_unique_id`, `<nav>` only when `renderLandmark` and a heading are set, `<ol>` for numbered); `aria-current` is client-side (`plugins/sgs-blocks/src/blocks/nav-bar-menu/view.js::markCurrentPage`). `SiteNavigationElement` JSON-LD is not emitted (FR-36-17).
The correct output genuinely DIFFERS by type. This table is the contract:

| Type | Element | Accessible name | `aria-current` | Schema |
|---|---|---|---|---|
| `source: menu` (navigation) | `<nav>` + real `<ul><li><a>` | `aria-labelledby` → the visible heading | client-side | `SiteNavigationElement`-consumable markup |
| `source: typed`, items HAVE urls | `<nav>` **opt-in** (default off), else plain `<ul>` | `aria-labelledby` → heading, when `<nav>` | client-side | plain semantic links |
| `source: typed`, items have NO urls | `<ul>` / `<ol>` — **never `<nav>`** | n/a | n/a | none |

Three rules that make this optimal rather than box-ticking:

1. **`aria-labelledby` points at the VISIBLE heading.** The heading becomes the landmark's accessible
   name, so unique landmark names hold **by construction** and `landmark-unique` cannot regress —
   with no duplicated label to drift out of sync.
2. **`aria-current="page"` is computed CLIENT-SIDE — reuse it, never re-derive it.**
   `plugins/sgs-blocks/src/blocks/nav-bar-menu/view.js::markCurrentPage` (identical in
   `plugins/sgs-blocks/src/blocks/nav-drawer-menu/view.js::markCurrentPage`) already does this: LiteSpeed
   (this stack's confirmed cache layer) would otherwise cache one page's answer and serve it on every page
   (FR-36-11).
3. **`<nav>` is OPT-IN, never automatic.** A four-column footer where every column is a landmark
   yields four nav landmarks; landmark bloat is itself an accessibility defect. Menu-bound defaults
   ON, typed defaults OFF.

**Schema boundary (FR-36-17, binding):** the block ships schema-FRIENDLY MARKUP only. **JSON-LD
emission is owned by `seo-schema` — no schema in blocks** — and the block must not block it. Honest
note: `SiteNavigationElement` has weak real-world support and Google has never documented consuming
it; the semantic HTML is what actually earns the SEO and AI-crawl benefit. Keep it; do not oversell it.

Inherited free from FR-36-17, NOT restated as new work: server-rendered, no AJAX, no lazy-load,
descriptive anchor text.

##### Nav-block landmark contract
- **One `<nav>` per instance, one label.** `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` each build their own
  `<nav %1$s>` root directly via `get_block_wrapper_attributes()` and a plain
  `printf( '<nav %1$s>%2$s</nav>', ... )` — neither uses `SGS_Container_Wrapper`. A second nested `<nav>` is a
  defect.
- **`navLabel` defaults to `''`** in block.json so the menu-name-derived label path is reachable: two navs
  bound to different menus are named apart automatically (FR-36-11). A menu named "T1 Verify Menu" yields the
  label "T1 Verify" (trailing "Menu" stripped).
- **The framework-wide axe `region` / `landmark-unique` violations do not come from the nav blocks.** Their
  cause is two unnamed `<main>` elements in the theme (`landmark-no-duplicate-main` +
  `landmark-main-is-top-level` fire alongside); a page rendering no nav block reports the identical set.

##### Landmark naming for a bar + drawer on the SAME menu
Primary sources say no differentiation is required:

- The **ACT rule** behind axe's `landmark-unique` applies only to landmarks **included in the accessibility
  tree**. `display:none` prunes an element from that tree, and a **closed `<dialog>` is spec'd to be removed
  from it** (MDN). Our bar is `display:none` below the collapse point; our drawer is a closed `<dialog>`
  otherwise — so the two are **never simultaneously exposed** and never form the "set of two" the rule
  evaluates.
- **axe-core confirms it behaviourally:** `excludeHidden` defaults to `true`, and Deque state plainly that
  axe "does not test hidden regions, such as inactive menus or modal windows". A hidden duplicate landmark
  does not trigger `landmark-unique`.
- **Adrian Roselli ("Maybe Don't Name That Landmark", 2024):** a `<nav>` needs no accessible name at all
  until two share the same scope, and naming past ~5–6 landmarks becomes noise rather than help.

**Two rules that follow:**
1. **Never end a landmark label with "menu"/"navigation"/"nav".** The role is already announced, so "Main
   Menu" would be read as *"Main Menu navigation"*. Operators name menus exactly that way, so the derived
   label is normalised (`Main Menu` → `Main`, `Primary Navigation` → `Primary`), with a guard so a menu named
   just "Menu" keeps its name rather than becoming empty. An explicit operator `navLabel` is passed through
   untouched.
2. **Prefer `aria-labelledby` → visible text over `aria-label`** where a heading exists (Roselli:
   `aria-label` carries localisation risk). That is the FR-36-26a rule for link lists; a nav block has no
   visible heading, so `aria-label` is correct there.

**The genuinely-duplicated case still matters** — a header nav and a footer link-list nav CAN be visible
simultaneously (FR-36-26a's opt-in `<nav>`). There, distinct names ARE required, and `aria-labelledby`
pointing at the visible heading is the preferred technique (WCAG ARIA11's own worked example). FR-36-26a
specifies exactly that.

##### Mega menus and landmarks (binds FR-36-4/36-5)
**A mega-menu panel is NOT its own landmark.** It stays inside the parent `<nav>`. The W3C ARIA APG's
Disclosure Navigation example wraps the top-level links AND their disclosure panels in ONE navigation
landmark, and does not nest a second `nav`/`region` inside. Panels are exposed purely through the
disclosure button's `aria-expanded` plus normal link semantics — the same DISCLOSURE contract FR-36-10
mandates (and the same reason `role="menu"`/`menubar` is banned there). Over-landmarking makes landmark
navigation noisier, not richer. So the naming work above applies to the nav as a WHOLE, once — not per panel,
and not per column inside a panel.

#### FR-36-26c — Build scope and contract (BUILT)
**Status:** BUILT: every attribute in the table below is declared in `plugins/sgs-blocks/src/blocks/icon-list/block.json::attributes` (`heading`, `headingLevel`, `source`, `menuRef`, `markerType`, `numberFormat`, `renderLandmark`); the live three-type render was verified on 2026-10-09: a menu-bound list and a typed list with links each render a `<nav>` named by their heading, and a typed list without links renders a bare numbered `<ol>` with no `<nav>`. Not re-run: `aria-current` across two pages and axe on that page.
**Authoring contract.** Never `core/list` or `core/navigation` (both banned); `markerType` comes from the rendered marker (`icon`/`emoji`/`bullet`/`numbered`/`none`), with `numbered` forcing `<ol>`; the heading is the block's own `heading` ATTRIBUTE, never a sibling `sgs/heading` block (a sibling would break the `aria-labelledby` contract in FR-36-26a); the `<nav>` landmark defaults OFF for typed lists (FR-36-26a rule 3); binding a typed list to a real menu is an OPERATOR decision.

**Data model — attributes on `sgs/icon-list`.** Shapes are frozen: declare the SHAPE, not just the value,
or WP coerces to the default.

| Attr | Type | Default | Notes |
|---|---|---|---|
| `heading` | string | `''` | The list title. Blank = render no heading element at all |
| `headingLevel` | string | `'h3'` | `h2`–`h6` or `p`. **No JSON `enum`** — validate in PHP (`blockjson-enum-coerces-invalid-to-default`: an out-of-enum stored value is silently coerced) |
| `source` | string | `'typed'` | `typed` \| `menu`. Never a JSON enum, same reason |
| `menuRef` | integer | `0` | The `nav_menu` term id when `source: menu`. `0` = unset |
| `markerType` | string | `'icon'` | `icon` \| `emoji` \| `bullet` \| `numbered` \| `none` |
| `numberFormat` | string | `'decimal'` | `decimal` \| `decimal-leading-zero` (01, 02 …) for a `numbered` list; with `numberColour`, `numberFontSize`, `numberFontWeight` it paints the `<ol>`'s `::marker`. A drawer's `sublinkMarkerColour` wins inside an embedded mega panel (`--sgs-list-marker-colour`). U-7 |
| `siblingDimColour` (+`Gradient`), `siblingDimOpacity`, `labelRoll`, `itemMotionDuration`/`Easing` | — | — | Sibling dim and the two-copy label roll on the list's items (FR-41-39, FR-41-40, §14.7b), e.g. a footer menu list |
| `renderLandmark` | boolean | `false` | Emits the `<nav>` wrapper. Set `true` by default ONLY when `source: menu` (FR-36-26a rule 3) |
| `heading*` typography family | per `plugins/sgs-blocks/CLAUDE.md` "Block Customisation Standard" item 2 (D209) | — | `headingFontSize`/`Unit`/`Tablet`/`Mobile`, `headingFontWeight`, `headingFontStyle`, `headingLineHeight`/`Unit` |
| `item*` typography family | per `plugins/sgs-blocks/CLAUDE.md` "Block Customisation Standard" item 2 (D209) | — | Same suffix set, prefix `item` |

**Typography is NOT hand-rolled.** Use the shared `TypographyControls` component + the
`sgs_typography_css_rule( $attributes, $prefix, $selector )` helper (`plugins/sgs-blocks/CLAUDE.md` "Block Customisation Standard" item 2, D209). Do not write a bespoke
font-size control — that is the exact divergence the rule exists to stop, and `check-control-ux` flags a
responsive family that bypasses `ResponsiveControl`.

**Build rules that hold for any change to this block:**
- **Menu resolution uses `SGS_Nav_Menu_Source::blocks_from_ref($menuRef)`, NOT `get_menu_blocks()`.**
  `get_menu_blocks()` is the "find ANY menu" resolver — on a stale/invalid ref it falls through to the site
  header nav / theme-location chain, so a footer list would silently render the SITE NAV (especially likely
  on a cloned site where source menu ids don't match). `blocks_from_ref()` resolves the ref alone and returns
  `[]` — the fail-soft contract (an invalid ref renders an empty list, not the site nav).
- **A nameless `<nav>` is unreachable:** `$render_landmark` is gated on a non-empty heading in BOTH source
  branches; renderLandmark-on + no-heading degrades to a plain list.
- **The flatten helper `sgs_icon_list_flatten_menu_blocks()` lives in `plugins/sgs-blocks/includes/helpers-list-markers.php`,
  NEVER in render.php** — render.php is re-included per block instance, so a top-level function there fatals
  with "Cannot redeclare" on the 2nd icon-list on a page. Multi-instance live render is the only check that
  catches it.
- The marker renderer goes in ONE shared PHP helper under `includes/` (aggregated by `render-helpers.php`),
  never inside the block folder, because `--webpack-copy-php` only copies paths named in `block.json` and a
  sibling file would 500 in production.
- **Heading id is `wp_unique_id()`, not derived from the md5-of-attrs uid** (two identical-attr blocks would
  otherwise share a DOM id + ambiguous `aria-labelledby`).
- `source` + `markerType` use `ToggleGroupControl` (2–5 short options), not a `Select` — matching
  hero/nav-drawer/StateToggleControl (Spec 35 Part B).

**Definition of done for any change.**
- `php -l` + `phpcs --standard=WordPress` clean; `npx eslint` no NEW errors.
- Prebuild gates pass: `check-dead-controls` (every attr consumed), `check-dead-pattern-attrs`
  (nothing WP would silently discard), `check-control-ux` (no bespoke per-tier control),
  `audit-inline-styling` (Spec 32 — zero inline `style=""`).
- Every attribute has an inspector control. A client edits blocks only; a setting that needs code is not done.
- UK English. No version bump, no `deprecated.js` pre-production.

**Live verification contract.** Render one instance of EACH of the three FR-36-26a types on a real page and
confirm: `numbered` emits `<ol>`; the `<nav>` landmark appears ONLY for the menu-bound case; the landmark's
accessible name equals the visible heading text; and `aria-current` lands on the right item on more than one
page (proving it is client-side, not baked). Then `plugins/sgs-blocks/scripts/nav-qa/axe-run.mjs` clean on that page.

**Out of scope here:** any change to `sgs/nav-bar-menu` / `sgs/nav-drawer-menu`, which keep each block's own role.

## 5. Accessibility (governing; primary-source-grounded)

### FR-36-10 — Disclosure vs dialog
**Status:** BUILT: no `role="menu"`, `menubar` or `aria-haspopup` appears in `plugins/sgs-blocks/includes/nav-menu-markup.php` or in the `nav-bar-menu` and `nav-drawer-menu` folders, and `plugins/sgs-blocks/src/blocks/nav-drawer/render.php` emits no `aria-modal`; the drawer is a native `<dialog>` opened by `plugins/sgs-blocks/src/shared/nav-interactivity/store.js` with `showModal()` or `.show()`.
Dropdowns AND mega = **DISCLOSURE** (`<nav aria-label>` + `<button aria-expanded>`; `aria-controls` SHOULD;
OMIT `aria-haspopup`; Tab through, NO trap; Escape closes + returns focus; arrow keys optional). NEVER
`role="menu"/"menubar"`. Drawer = **DIALOG** — a native `<dialog>`, modal-in-BEHAVIOUR via either
`showModal()` or `.show()` + author-managed inertness. **The contract is the disclosure-vs-dialog binary, not
the API call.** A `.show()` drawer that inerts the background, moves focus in, closes on Escape and returns
focus to its trigger is fully on the DIALOG side of this gate; `showModal()` is one implementation of that
contract (the `modal` default), `.show()` the other (`non-modal`, FR-36-6). ⛔ Do not add `aria-modal="true"`
under either — see FR-36-6. Mega = a bigger disclosure sharing `sgs/nav-bar-menu`'s dropdown contract
(dropdowns/mega are bar-only). **This is the ONE a11y gate every §4 interactive piece reuses** (cart/search
`displayMode` auto-swaps between the two patterns) — never a second contract.

### FR-36-11 — WCAG (2.1 AA + 2.2 wins)
**Status:** PARTLY BUILT: `aria-current` is stamped client-side (`plugins/sgs-blocks/src/blocks/nav-bar-menu/view.js::markCurrentPage`, the same in `plugins/sgs-blocks/src/blocks/nav-drawer-menu/view.js::markCurrentPage`); `forced-colors` rules sit in `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css` and `plugins/sgs-blocks/src/blocks/nav-drawer/style.css`, and the `prefers-contrast` baseline in `plugins/sgs-blocks/assets/css/contrast.css`; the skip link is WordPress core's `#wp-skip-link`, styled in `theme/sgs-theme/assets/css/utilities.css`. Measured live on 2026-10-09 with forced colours active: the drawer dialog has a solid 1px border, links take LinkText and the focus ring is a 2px Highlight outline; the mega panel has a solid 1px border on a white ground and a 2px Highlight link focus. The `nav-drawer-menu` and `mega-panel` stylesheets carry no `forced-colors` rule of their own, so this relies on the browser's mapping. Not confirmed: the `aria-current` (active item) state under forced colours, and contrast and target sizes on a live page.
`aria-current="page"` — **computed CLIENT-SIDE** (compare `location.pathname` at mount), NOT server-baked,
because LiteSpeed (this stack's confirmed active cache layer) would otherwise serve a stale page's answer;
unique labels on multiple `<nav>`s + descriptive anchor text; accessible names on icon buttons (burger, ×) +
live `aria-expanded`; `:focus-visible` ≥3:1 (SC 1.4.11); SC 2.4.11 Focus Not Obscured; SC 2.5.8 24 px (SGS
keeps 44 px); skip-link visible-on-focus; `prefers-reduced-motion`; `forced-colors`/HCM (no shadow-only
boundaries — borders/focus rings must not vanish in Windows High Contrast) + `prefers-contrast`; no
colour/motion-only state.

**The colour half of this FR has a named mechanism: Part 14 of this spec (§14)**
(FR-36-28). Its `aria-current="page"` clause above is the SAME client-side mechanism Part 14 consumes —
`plugins/sgs-blocks/src/blocks/nav-bar-menu/view.js::markCurrentPage` (identical in
`plugins/sgs-blocks/src/blocks/nav-drawer-menu/view.js::markCurrentPage`), reused verbatim, never re-derived
server-side (LiteSpeed would serve one page's answer everywhere). Part 14's contrast posture is deliberately
conservative and weakens nothing here: the live luminance check in
`plugins/sgs-blocks/src/components/GradientCapableColourControl.js` stays **warn-only** — it never blocks or
silently alters an operator's colour (FR-41-17) — and an opt-in "Auto-adjust for readability" nudge
is carried as FR-41-18, explicitly non-blocking. The automatic WCAG foreground resolution via
`sgs_wcag_preferred_text_colour_for_bg()` is Part 14's `itemSmartContrast` toggle (FR-41-5), **default off**
so an operator's explicit colour renders exactly as authored. **This FR's "no colour/motion-only state"
clause is carried by FR-41-6**: two explicit, operator-reachable non-colour defaults — an underline
on Hover and a weight change on current.

### FR-36-12 — Operator a11y feedback INFORMATIONAL ONLY (P2 DP2a)
**Status:** PARTLY BUILT: informational Notices are built (`plugins/sgs-blocks/src/blocks/nav-bar-menu/NavMenuNotices.js`: drawer pairing and link count) and none blocks a save. Not built: the 'Nav Health' panel (section 7 Opp 3; no match under `plugins/sgs-blocks/src`).
Editor/admin a11y feedback = a passive Notice, never a gate. (The *operator-facing* a11y warnings are the
"Nav Health" surface — §7 Opp 3, Phase 3.) Distinct from FR-36-9a *error* states.

## 6. Rendered output + editor controls

### FR-36-13 — No inline styling (Spec 32)
**Status:** BUILT: `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 (run 2026-10-09); `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php` and `plugins/sgs-blocks/src/blocks/nav-drawer-menu/render.php` print their own `<nav>` root through `get_block_wrapper_attributes`, and `plugins/sgs-blocks/src/blocks/nav-drawer/render.php` prints the `<dialog>`.
Nothing renders as inline `style="…"`: native supports flip to scoped serialisation
(`__experimentalSkipSerialization` + `wp_style_engine_get_styles(...,['selector'=>"#uid"])` into the scoped
`<style>`); box-object attrs; responsive tiers + `:hover` in stylesheet rules; custom bps → `sgsCustomCss`.

`sgs/nav-bar-menu` and `sgs/nav-drawer-menu` have a BLOCK-PRIVATE root (their own `<nav %1$s>` printed
directly via `get_block_wrapper_attributes()`), matching every other content-KIND composite: a composite that
uses only box+width never used the wrapper's grid/section/background machinery, so it does not call
`SGS_Container_Wrapper`. No-inline-styling compliance holds — zero inline `style=""`.

**`<dialog>` exception — `sgs/nav-drawer` is content-KIND BLOCK-PRIVATE, not a wrapper composite.** The
drawer's root element must BE the `<dialog>`. Two properties of `<dialog>` justify it, and both are
modality-independent:

1. **The UA open/close mechanism.** `<dialog>` is the element that carries the `open` state, the `.show()` /
   `.close()` API, the `close`/`cancel` events, and the UA's own `dialog:not([open]){display:none}` rule. No
   other element provides this without hand-rolled JS.
2. **The implicit `role="dialog"`.** The semantics come from the element, with no ARIA to keep in sync.

Both hold identically under `showModal()` and `.show()`. `SGS_Container_Wrapper` emits its own `<div>` as the
block root, so hosting the drawer in it would either bury the `<dialog>` one level down (losing the
wrapper's box/width controls over the actual modal surface) or put a `display` value on the `<dialog>` base
rule, which defeats the UA's `dialog:not([open]){display:none}` and leaves the drawer permanently visible
(STOP-DIALOG-DISPLAY-GATE). The drawer therefore renders block-private with its own scoped `<style>`. Zero
routing impact (CSS routes off `block_attributes` keyed on `block_slug`, never
`wraps_block`/`container_kind`). The no-inline contract is fully met.

### FR-36-14 — Control-completeness (Spec 35A Part L)
**Status:** BUILT for the `hideExtensions` mandate: `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::supports.sgs.hideExtensions` and `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::supports.sgs.hideExtensions` declare `[ "clickEffects", "parallax", "spacing" ]`, and `plugins/sgs-blocks/src/blocks/nav-drawer/block.json::supports.sgs.hideExtensions` declares `[ "clickEffects", "parallax" ]`. The rest of the control-completeness contract is enforced by the inspector-scan gates (`plugins/sgs-blocks/scripts/inspector-scan/rules/25-no-own-device-switcher.js`) and was not re-run in this pass.
Settings/Styles/Advanced via `group`; ≤3-default `PanelBody` + `ToolsPanel` (P2 §5); `LinkControl` per
item/CTA; `StateToggleControl` (hover); the shared **`TypographyControls` + `sgs_typography_css_rule`** (`plugins/sgs-blocks/CLAUDE.md` "Block Customisation Standard" item 2, D209,
never bespoke font controls); `ResponsiveControl` (tiers) + the **BUILT Responsive-Visibility extension** +
BUILT `labelCollapse` (per-device show/hide + label-collapse — FR-36-8/-24); `DesignTokenPicker` (enableAlpha +
clearable); box-object attrs; `hideExtensions`; `MediaGalleryPicker`/icon + `supports.sgs.imageControls:true`
on any `<img>` block; reduced-motion gate; **editor preview via `<ServerSideRender>`** (else a drifting
static snapshot — the `ssr-fixes-hand-built-preview-drift` lesson; interactive behaviour previews front-end);
keyboard + contrast + `aria-describedby`; a client pattern's `templateLock` follows FR-36-5 (never
`contentOnly` where it would hide child settings). Custom/preset UI welcome where it improves UX (P2 §2.6).

**`hideExtensions` is MANDATORY on every nav block.** Universal extensions reach `sgs/*` blocks through two
mechanisms (`plugins/sgs-blocks/src/blocks/extensions/hide-extensions.js`): a DENYLIST — every extension
attaches unless the block opts out through `supports.sgs.hideExtensions` (slugs `clickEffects`, `parallax`,
`spacing`, `animation`) — and an ALLOWLIST — `hover` and `blockLink` attach only to a block that opts in
through `supports.sgs.enabledExtensions`. Without a `hideExtensions` declaration a client is offered extra
inspector panels on a navigation menu — *Element parallax* on a sticky bar, *Click Effects*, a generic
spacing panel — that duplicate or fight the block's own per-element controls.
`plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::supports.sgs.hideExtensions` and
`plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::supports.sgs.hideExtensions` declare
`[ "clickEffects", "parallax", "spacing" ]`;
`plugins/sgs-blocks/src/blocks/nav-drawer/block.json::supports.sgs.hideExtensions` declares
`[ "clickEffects", "parallax" ]`. A negative control (a block that declares nothing, such as
`sgs/card-grid`, still shows the denylist panels) proves the shared mechanism is untouched.

**An extension panel RENDERING is not evidence its attributes are registered.** An extension whose fields
write attributes the block never registers discards every value a client sets on save; check that the
attributes exist on the block, not just that the panel shows.

**Rule for any NEW nav block: declare `hideExtensions` deliberately. Inheriting all four is a decision, not
a default.** Open framework-wide gaps (`conditional-visibility.js` has no `hideExtensions` slug; the bespoke
Custom CSS field in the Advanced tab is a Spec 35A Part F anti-pattern) are in Open Questions.

### FR-36-28 — Nav colour-state system → Part 14 (§14)
**Status:** PARTLY BUILT: the mechanism is Part 14 and is BUILT except the items in section 14.0a.3 (FR-41-18 not built; FR-41-20 and FR-41-36 partial); the ARIA active-trail is not built.

**The `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` colour, state and control system (shared) is specified in §14 of this spec.** It is the concrete mechanism satisfying FR-36-4's "distinct hover+focus states" and the colour half of FR-36-11, and it sits under FR-36-14's control-completeness contract rather than beside it. ⛔ It does **not** satisfy FR-36-4's "active-trail" clause (FR-41-20).

**Why a separate Part.** This document's FR numbers are cited from code and cannot be renumbered, and the control-surface design is a cleanly separable concern: §1 to §13 keep the requirement; §14 owns the mechanism. Read together.

⛔ **Out of Part 14's scope, deliberately:** mega-menu colours and controls (FR-36-5); the `featured` item-flag mechanism (FR-36-4, untouched); sticky/scrolled colour duplication (the header owns scroll state per Spec 37); a device-visibility panel (covered by the universal `responsive-visibility.js` / `conditional-visibility.js` extensions, which neither nav block opts out of — see FR-36-14: both list only `clickEffects`, `parallax`, `spacing`).

## 6a. Build order

⛔ **Each FR records its own build status.** The `Status:` line under every FR heading names what is built
and what is not, with the evidence as `path::symbol`; a status that cannot cite evidence is not written. A
status line is a dated claim (this version was verified 2026-10-09): re-run its evidence before relying on
it, and update the line in the same change that changes the code. `.claude/LEDGER.md` carries only short notes
on work in progress.

**Specs 36+37 complete first; Spec 47's route then writes headers, footers and drawers through their block attributes.** FR-36-15 is blocked by nothing; FR-36-25 depends on FR-36-21/22/23; only the *branded* Indus header sliver of FR-36-18 waits for Spec 47. See Spec 37 §6.

## 7. Phasing — MVP first, prove before the plumbing

Each phase ships something demoable + has a pre-registered exit gate (Bean's eye + §8) before the next. The
utility pieces (§4) + cross-cutting FRs are phased INTO this plan so a solo builder knows the sequence.
- **Phase 1 (MVP) — Mama's end-to-end (classic menu):** flat bar + burger (`sgs/nav-bar-menu`) →
  `sgs/nav-drawer` full-screen modal accordion (`sgs/nav-drawer-menu` inside it) + the shared utility +
  block-attribute emit of those + FR-36-17 crawlability; **plus the cart badge (`role="status"`, FR-36-19) + logo
  basics (FR-36-22).** NO mega CPT, NO safe-triangle (a flat bar has no submenus),
  NO mini-cart drawer. **Gate-1** (Mama's live + drawer a11y + crawl + Bean's eye) is the pre-registered
  exit.
- **Phase 2 — Indus + rich desktop + mobile modes + the pieces:** the `sgs_mega_menu` CPT + native (classic)
  attach + real-position render + mobile-in-drawer (the panel inside the drawer accordion by default, `megaDrawerMode` `link` available — FR-36-6);
  safe-triangle + hover-intent; the collapse mode (burger→drawer, built — FR-36-8); **the utility pieces — search, social, business-info, and the cart mini-cart
  (FR-36-19..23).** **Gate-2** = the full §8 incl. the Indus mega. **After Gate-2 passes, before Phase 3:**
- **Phase 3 (follow-on extras) — competitive breadth + the moves:** **block-based `wp_navigation` menu
  support** (+ its spike); WooCommerce category/nav integration; multilingual (+ hreflang);
  conditional/role-based/scheduled items; `<details>`-animation polish; **logo lockup + favicon-sync +
  transparent/dark variants (FR-36-22 SHOULD); structured-data-once made fully explicit across all placements
  (FR-36-25);** **Opp 1 — "AI builds your whole nav from a sitemap"** (the emit path already writes every
  primitive — the real un-copyable differentiator, §0); **Opp 2 — portability/clone moat** (native-menu
  attach survives WP export/import, unlike competitors' bespoke bindings — low priority); **Opp 3 —
  in-editor "Nav Health" panel** (surfaces the §8 checks + the operator a11y warnings live, turning the
  invisible moat into demo proof + housing the informational a11y notices).

## 8. Acceptance — the concrete live-QC gate

### FR-36-16 — Reproduce both menus + the regression gate + Bean's eye (R-31-13)
**Status:** PARTLY BUILT: the sweeps exist (`plugins/sgs-blocks/scripts/nav-qa/axe-run.mjs`, `plugins/sgs-blocks/scripts/nav-qa/elementfrompoint-sweep.mjs`, `plugins/sgs-blocks/scripts/nav-qa/crawl-assert.mjs`, `plugins/sgs-blocks/scripts/nav-qa/probes.mamas.json`) and the CPT-drawer parity gate passed on 2026-09-20 (`.claude/reports/2026-09-20-w2-gate2-rerun.md`; visual fidelity not claimed). The late-CSS A/B runs as `plugins/sgs-blocks/scripts/nav-qa/late-css-ab.mjs`; it keeps the collected block CSS under `/uploads/sgs-css/` (the blocks' own scoped rules, delivered as one head link when `sgs_css_output_mode` is `file`) and blocks every other stylesheet. Not built: no Indus mega-region gate report was found under `.claude/reports`; the owner's eye remains the closing check. Run on the canary header drawer on 2026-10-09 after `nav-drawer/render.php` began always emitting the drawer's geometry in its scoped rules: the dialog keeps its full-screen box (0, 0, 375 by 900 becomes 0, 0, 413 by 938, a 38px browser-default padding and border), Escape and focus return pass, but the close control and first link still move (close 319, 10 becomes 19, 19) because their placement comes from `nav-drawer/style.css`. The A/B stays FAIL until that placement is also emitted in the scoped rules.
- **Mama's (gate-1):** flat 5-item classic-menu bar + a **featured** item + a **cart badge** (`sgs/cart` with
  the `role="status"` badge); mobile → burger → drawer (accordion) + CTA + logo basics.
- **Indus (gate-2):** a 7-item bar of plain links + **3 dropdowns + at least one mega ("Brands"), rendered at
  its real menu position** (not last). The framework ships mega starter patterns (`git ls-files theme/sgs-theme/patterns | grep mega-`).

  ⛔ **The mega COUNT is derived at gate time, never pre-known.** A criterion that names a number the spec
  does not know can be neither passed nor failed, so the criterion does not depend on a number:

  | Step | Action |
  |---|---|
  | 1 | Derive **N** — the count of mega-shaped nav regions — from the draft at `sites/indus-foods/mockups/Indus Foods Ltd Homepage.html`, at gate time. |
  | 2 | Record **N, the deriving command, and the per-region list** in the gate report. ⛔ Never in this spec — a number written here drifts the moment the draft changes. |
  | 3 | Build one mega for each of the N regions. |

  **PASS =** every one of the N derived regions is covered by a mega that renders at its real menu position,
  **and** any divergence from the draft (a region built as a plain dropdown, a layout substituted, a region
  merged) is RECORDED WITH ITS REASON in the same gate report. **FAIL =** a region silently absent, or a
  divergence with no reason beside it. N being 1 and N being 5 both pass on this criterion; what fails is an
  unaccounted-for region. Two-row header = the header builder's rows.
- **The live gate (one pass, cache-clear FIRST):** 375/768/1440 + **a non-default collapse-N** sweep; **axe = 0
  on the OPEN drawer AND an OPEN desktop mega**; the **`elementFromPoint` occlusion sweep** (methodology below);
  ESC/focus-return/Tab-containment; scroll-lock frame sweep; drawer geometry; **the late-CSS A/B (defined
  below)**; real desktop scrollbar; **a `prefers-reduced-motion` + `forced-colors` emulated-media sweep**
  (borders/focus rings survive; motion suppressed); **the `<details>` no-JS drawer + no-JS bar links**
  assertion; **the crawl assertion** (every bar+dropdown+mega link AND mega content in the pre-JS HTML);
  **mega renders at real position N, not last**; **the integrity sweep** (FR-36-9a); **`wp-perf-gate`**
  (no-CLS + budget; JS <50 KB / CSS <100 KB); RTL/logical properties; + Bean's cropped screenshot pair.

**The late-CSS A/B — what it is, how to run it, what passes.**

**What it asserts.** The open drawer's GEOMETRY comes from the block's own scoped `<style>`, not from an
external stylesheet that may arrive late, be deferred, be combined, or be optimised away by LiteSpeed. A
drawer whose width or position depends on a late-arriving sheet renders at the wrong size for the interval
before that sheet lands — the "random widths" defect class this check exists to catch.

**Procedure — one page, two runs, drawer OPEN in both, at 375 / 768 / 1440.**

| Run | Setup |
|---|---|
| **A — normal load** | The page as a visitor gets it. Open the drawer. Measure. |
| **B — all external CSS blocked** | Block every external stylesheet request before navigation (Playwright: route-abort every `stylesheet` resource type). The block's own inline scoped `<style>` is emitted by render.php inside the document and is NOT an external request, so it survives. Open the drawer. Measure. |

**Measured in both runs, at each of the three widths:** `getBoundingClientRect()` on (1) the `<dialog>`
itself, (2) the close control (`plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$close_html` →
`.sgs-nav-drawer__close`), and (3) the first nav link inside the drawer.

**PASS =** every measured rect matches between A and B within **±1px** on all four edges, at all three
widths, **AND** the drawer is still dismissible in run B (× click closes it; Escape closes it; focus returns
to the burger).

⚠ **Colour, typography, spacing-from-theme-tokens and background differences between A and B are EXPECTED
and are NOT a failure.** Run B deliberately strips the theme and global stylesheets, so run B will look
wrong. This check asserts **geometry and dismissibility only** — nothing else. Do not report a B-run visual
diff as a defect of this gate.

**`elementFromPoint` occlusion sweep — methodology:** with the drawer OPEN, at 375 + 768 + 1440:
`document.elementFromPoint()` at each probe returns the expected top-layer node — the **header row's probe
returns the toggle/close control** (not BODY or the scrim); **every drawer link probed at its own centre
returns itself**; **everything below the header is unreachable** (probe a hero link → returns the scrim /
`inert` layer, never the underlying link). PASS = every probe returns its expected node (record the probe count in the gate report). Geometry: a partial drawer's `getBoundingClientRect().top` === header bottom ±1px at
all three widths; the frame sweep during open shows width/anchor CONSTANT (the scrollbar-bounce test — run on
a **real desktop width with a classic scrollbar**; device emulation cannot reproduce the scrollbar-vanish
bounce, so the check is otherwise vacuous). Cache: clear the CDN/LiteSpeed cache FIRST
(`hosting_clearWebsiteCacheV1` + `wp litespeed-purge all`) or you measure the stale `?ver`.

### The Bean's-eye pre-check rubric (R-31-13 — makes the veto PREDICTABLE, never weaker)

R-31-13 stands: the owner's visual sign-off is co-authoritative, the numbers alone never close a gate, and
the eye may reject on any ground it likes. **The problem this rubric solves is not authority, it is
predictability:** a mechanical sweep can pass every cell while the eye rejects on grounds the sweep never
measured. Presenting without having answered those grounds spends the veto on things the builder could have
checked first.

**Self-check before presenting. Answer every row with evidence, not intent.** Grounds 1–5 are the fidelity
grounds the owner's eye checks on drawer clones (`.claude/reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md`
§D3); 6–7 are standing checks for two defects that shipped on the drawer variants (§D1, §D2).

| # | Ground | Answer it with |
|---|---|---|
| 1 | **Text styling** — family, weight, size, case, tracking, leading | A side-by-side of the draft's computed values against the clone's, on the same painted element |
| 2 | **Surface + borders** — panel background, border lines, dividers, radii, shadow | Computed values, both sides |
| 3 | **Symbols + iconography** — the actual glyphs, not "an icon is present" | The rendered symbols, both sides |
| 4 | **Control treatment** — button fill, shape, size, hover/focus appearance | Computed values in both resting and hover state |
| 5 | **Imagery AND its motion** — every image, and whether it cycles / animates / floats as the reference does. A still image where the reference cycles is a MISS, not a near-miss | A capture of the motion, not a single frame |
| 6 | **Every text element's contrast against its REAL painted background** — not a sample | See false-pass A below |
| 7 | **Does an alignment setting do what its NAME says?** `drawerAlign: 'center'` must visibly centre the menu, not just its sibling boxes | A measured x-position of the nav links, not the presence of the attribute |

**Two named false-pass modes. Both have shipped a green report on a broken page:**

- **A — a sampled contrast check reports the sample, not the page.** A sweep that measured
  `.sgs-nav-menu__link-text` alone reported a healthy 13.14:1 for a drawer that rendered **6 text elements
  at 1:1 — literally invisible** across 2 variants. **Sweep EVERY text node in the surface under test, each
  against its own real painted background.** A check scoped to one selector reports that selector's health
  and nothing else.
- **B — a capture that never asserted "open" proves nothing.** A screenshot script that clicks a trigger and
  captures without asserting a panel opened can report a homepage with no menu open as a captured
  reference. **Assert the open state, then capture.** This is the same vacuous-check class as a negative
  control that never landed.

**Rules of use, so this stays a floor and not a ceiling:**
1. **Presenting with unanswered rows wastes the veto.** The eye is expensive and single-threaded; spending it
   on a ground the builder could have measured is the failure this rubric prevents.
2. **Any NEW ground the eye names is ADDED to this table, never argued with.** The table is a record of what
   has rejected before, not a list of what is allowed to reject. It only ever grows.
3. **A clean rubric is not a pass.** All seven rows answered means the work is ready to be LOOKED AT. R-31-13
   is unchanged: only the eye closes.

### FR-36-18 — Live production instances render from CPTs
**Status:** BUILT: verified over SSH on 2026-10-09 (`wp option get sgs_active_header_cpt_id` and `sgs_active_footer_cpt_id`, then `wp post get`): the canary and the Indus test site each have a published `sgs_header` and `sgs_footer` as the active pair. The branded Indus header waits for Spec 47 and was not checked.
Every live site (the sandybrown canary and the Indus test site, `lavender-dinosaur-183533`, deploy target
`indus-test`) renders its header and footer from CPTs (`sgs_header` / `sgs_footer`) built on the current nav
blocks; both render generic proof headers; a branded header is produced through Spec 47's header surface. Any
re-authoring of a live header is done **via the editor** (never WP-CLI `post_content`), **canary-first**,
with a before/after computed check that both menus render + collapse.

## 9. Emittable by construction

### FR-36-15 — Emittable by construction (DP6)
**Status:** PARTLY BUILT: the nav blocks take every setting as attributes (the computed route calibrates `sgs/nav-drawer`, `sgs/mega-panel` and `sgs/mega-aside` in `scripts/computed-route/calibration-fixtures.json`) and the mega self-reference guard is built (`plugins/sgs-blocks/includes/helpers-mega-render.php::sgs_mega_render_item_panel`). Not built: any emitter that writes a classic `nav_menu`, its `nav_menu_item` rows or per-client `sgs_mega_menu` posts from a draft (no such code under `scripts/computed-route` or `scripts/wp-build-page.js`; the only `nav_menu_item` writers are QA fixtures and migrations under `plugins/sgs-blocks/scripts`).
Write a **classic `nav_menu`** (the primary path — `wp_update_nav_menu_item()`; add a `nav_menu_item`
targeting each `sgs_mega_menu` post — the native association, no map); write `sgs/nav-bar-menu` with
mode/style/`drawerRef` attrs for the header placement, and `sgs/nav-drawer-menu` for the drawer placement;
write one `sgs_mega_menu` CPT post per rich panel (block tree; template by draft layout) + render at real
position; write `sgs/nav-drawer`. **Per-client scoping:** emitted `sgs_mega_menu` posts + starter packs carry
a per-client title/slug prefix (no collisions). **Degradation:** an un-mappable draft nav construct is
logged skipped-with-reason (Rule 4). All native SGS blocks; no inline styles; no banned core blocks;
crawlable `<a href>`.

A mega panel that references its own menu is stopped by a `do_blocks` recursion guard.

## 10. Constraints
Spec 32 no-inline · Spec 35A Part L + the Responsive-Visibility ext · block attributes writable by Spec 47 · Spec 37
decoupling + published state surface · WCAG 2.1 AA (+2.2; 44 px; forced-colors survival) ·
crawlable/no-AJAX/schema-friendly (FR-36-17) · `viewScriptModule` vanilla JS + honest no-JS scope, no jQuery
· works in the header · transform-ancestor survival · perf budget (<100 KB CSS / <50 KB JS; no CLS;
links-never-lazy, distinct from below-fold `<img loading=lazy>`) · UK English · the mega starters are
git-versioned theme patterns (FR-36-5) · no block deprecations pre-production ·
**`blocks-must-shrink-to-fit-container`** — every nav piece is intrinsically responsive (min-content ≤
container at every breakpoint), not clamp-forced.

## 11. Discoverability — SEO / AI-search / schema / performance

### FR-36-17 — Crawlable, schema-friendly, fast
**Status:** PARTLY BUILT: semantic `<nav>` roots with computed labels (`plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php`, `plugins/sgs-blocks/src/blocks/nav-drawer-menu/render.php`) and `BreadcrumbList` JSON-LD (`plugins/sgs-blocks/src/blocks/breadcrumbs/render.php`) are built. Not built: `SiteNavigationElement` JSON-LD and the AI-built navigation from a sitemap (Phase 3, no code). Server-rendered mega content, no AJAX and the performance budget: the server HTML of a mega header page carries the mega content with no AJAX (checked 2026-10-09). Measured cold on the canary the page exceeds the budget: the mega header fixture transfers 154 KB CSS in 24 files and 68 KB JS in 22 files, and the homepage 174 KB CSS and 77 KB JS (CLS 0.09 at 1440 and 0.82 at 375 on the homepage, cause not traced).
- **Crawlable, server-rendered, NO AJAX:** every bar/dropdown/mega link AND all mega-panel **content**
  (headings/text, not just links) is in the initial server HTML — no lazy-load — so crawlers + AI search see
  the whole structure + the rich content. **Scope the moat honestly:** plain crawlable links are table-stakes;
  the differentiator is server-rendered *rich mega content* (no AJAX) + **AI-auto-generation of the whole nav
  from a sitemap** (the un-copyable weapon — §0; Phase 3, Opp 1).
- **Semantic + descriptive — BUILT:** `<nav>` landmarks + unique labels; real `<ul>/<li>/<a>`; descriptive
  anchor text. Both blocks' roots ARE `<nav>` elements with a computed `aria-label`
  (`plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php`,
  `plugins/sgs-blocks/src/blocks/nav-drawer-menu/render.php`).
- **Schema — split by status, do not conflate:**
  - **`BreadcrumbList` JSON-LD — BUILT.** Emitted by `plugins/sgs-blocks/src/blocks/breadcrumbs/render.php`
    (the `'@type' => 'BreadcrumbList'` emission).
  - **`SiteNavigationElement` JSON-LD — NOT BUILT.** `git grep -n "SiteNavigationElement" -- plugins theme`
    returns nothing. The block ships schema-FRIENDLY MARKUP only (the semantic `<nav>` above); JSON-LD
    emission — when it is built — is owned by `seo-schema` (no schema in blocks); the block must not block it.
- **hreflang forward-note:** when multilingual lands (Phase 3), emit per-language `hreflang` on the switcher
  (cheap to plan now, expensive to retrofit).
- **Parity, no cloaking:** bar/drawer may use different menus but every link in either is crawlable.
- **Performance / no-CLS:** no layout shift; within budget; not render-blocking; `wp-perf-gate` in §8.

### FR-36-25 — Structured-data-once (single source rendered everywhere) — the category-level differentiator
**Status:** PARTLY BUILT: the three sources already read one store (`sgs/social-icons` children bound to `sgs/site-info`; the logo through `plugins/sgs-blocks/includes/class-sgs-site-info-logo.php::resolve_id`; `LocalBusiness` in `plugins/sgs-blocks/includes/class-org-website-schema.php`). Not built: the explicit across-all-placements guarantee (Phase 3; no check was found that asserts header, footer and drawer read the same entry) and the live open/closed state (FR-36-23).
The biggest meet-and-exceed lever across the pieces: structured data entered ONCE, rendered contextually. The
**Site-Info source** (FR-36-23), the **single social list** (FR-36-21), and the **logo object** (FR-36-22) are
each edited once and rendered in header + footer + drawer + (for Site-Info) `LocalBusiness` schema — no
competitor (Kadence/Blocksy/Spectra) does this cleanly; all re-enter per placement. SGS part-has it today
(`sgs/social-icons`, whose `sgs/icon` children are bound to Site Info keys); it becomes the explicit, spec-level differentiator across all
placements in Phase 3 (§7).

**Honest scope of "entered ONCE" for the LOGO.** The logo joins this claim only through FR-36-22's
resolution chain, and only at that chain's tier 2. A logo set in Site Info is entered once and
rendered everywhere; a logo set on an individual `sgs/responsive-logo` instance (tier 1, per-device art
direction) is a deliberate per-placement override and is NOT covered by this claim — that override is the
feature, not a leak. A site that has set neither still resolves from the Customiser (tier 3), which is WP's
store, not this one. So the claim is: **one Site-Info entry is the default source for every placement**, not
"the logo can only ever be entered once".

## 12. Open Questions

| Question | Owner | Due |
|---|---|---|
| **Dialog-engine duplication.** `sgs/modal` hand-rolls its own `showModal()` while the drawer delegates to `store('sgs/nav')` — two `<dialog>` engines. Should a shared dialog-geometry primitive (carrying a modal/non-modal flag, serving drawer, modal, cart flyout, search overlay) unify them? | Framework | Unscheduled |
| **`conditional-visibility.js` has no `hideExtensions` slug**, so no block can opt out of it (`git grep -n -i hideExtensions -- plugins/sgs-blocks/src/blocks/extensions/conditional-visibility.js` returns nothing). Kept on nav blocks deliberately (member-only / promo-window navs are legitimate); needs a slug for whoever wants it hideable. | Framework | Unscheduled |
| **Custom CSS field gap.** The bespoke Custom CSS field in the Advanced tab is a Spec 35A Part F anti-pattern present on every `sgs/*` block. | Framework | Unscheduled |
| **FR-36-27 shape.** Keep it open for the `triggerStyle` / `triggerSymbol` / `triggerOpenStyle` / cross-block morph-sync shape, or close it as satisfied by Part 14's narrower `triggerMode` / `triggerIcon` build? | Bean | Unscheduled |
| **`listColumns` reading order.** Rows-of-2 vs column-wise reading is undecided — the reference capture for that variant failed, so there is no ground truth. | Bean | Unscheduled |
| **Block-editor `sgs_mega_menu` link search (Phase 3 spike).** Does the block Nav editor surface the CPT in link search? | Framework | Phase 3 |
| **Partial-width drawer under a hide-on-scroll header.** Needs a published hidden-state signal from Spec 37 (FR-36-9). | Spec 37 owner | Before that combination is built |

## 13. Sources
Live-code checks:
`plugins/sgs-blocks/includes/class-sgs-nav-menu-source.php::get_nav_block_names`,
`plugins/sgs-blocks/src/header-behaviours/view.js::publishHeight`, `labelCollapse`
(`plugins/sgs-blocks/src/blocks/button/edit.js::labelCollapse` /
`plugins/sgs-blocks/src/blocks/business-info/edit.js::labelCollapse`), `ResponsiveTriStateControl`
(`plugins/sgs-blocks/src/blocks/site-header/edit.js::Edit`), `plugins/sgs-blocks/src/blocks/extensions/responsive-visibility.js` +
`plugins/sgs-blocks/includes/device-visibility.php`, `plugins/sgs-blocks/src/blocks/cart/render.php` (the `role="status"` badge)
+ `plugins/sgs-blocks/src/blocks/cart/view.js::updateCartWidgets`. Primary a11y: W3C APG, WCAG 2.1/2.2,
MDN, Adrian Roselli. UX: NN/g, Baymard, Smashing, IxDF, LogRocket, Algolia. Platform: MDN/Chrome (Popover,
`<dialog>`, `<details name>` — re-verify at build), WP/Woo (Store API, Mini-Cart block, `core/search`,
`core/site-logo` `shouldSyncIcon`, `site-title`, `social-links`), `LocalBusiness` schema. Competitor:
Kadence/Blocksy/Spectra/Bricks header builders. Internal: Spec 37, 32, 35, 47, the P2 builder
design gate; seo-schema/seo-technical.

## 14. Nav menu colour, state and control system

⛔ **FR IDs and section numbers in this Part are stable citations.** Every `FR-41-N` ID is cited from code, the framework DB and other specs and is never renumbered; new requirements take the next free number, and gaps are intentional. Code cites the sections below as `Spec 36 §14.x` (`§14.9.6` is the Colour panel layout, `§14.1.3` the three states). Spec 36 keeps the nav requirements (FR-36-4's "distinct hover+focus states", FR-36-11's WCAG floor); this Part owns the mechanism (FR-36-28 is the pointer here). Attribute names, types and defaults live in the two `block.json` files and the framework DB; this Part records the decisions a manifest cannot.

Companions: Spec 35 (PART O control-type contract), Spec 35A (Part L control completeness), Spec 32 (no inline `style=` property declarations; scoped `<style>` only).

### 14.0 One-liner and plain English

`sgs/nav-bar-menu` and `sgs/nav-drawer-menu` carry **three colour states (Normal, Hover, Current) on every colour that has states**, side by side in ONE Colour panel (border colour included), each Hover swatch paired with a **hover-treatment selector** that changes *how* that colour is applied; a **3-state per-side item border**; a **submenu split** (the floating panel and its links are separately controllable); **submenu open animation and top offset**; a **menu button** (icon, text or both, operator-chosen icon, optional magnetic pull); and three correctness fixes that need no control. There is no hover "style" chooser, and no control on any other block changes.

⛔ **THE COLOUR-REUSE RULE (owner-locked, binding on every row).** One colour picker per element property. The hover-treatment selector NEVER introduces a second colour value: `Swap` applies the Hover swatch instantly, `Sweep` travels it across the element, `Highlight` paints it into the shared sliding pill. A treatment with its own colour attribute would be a second control for one property, the pattern FR-41-7 and FR-41-23 prevent.

### 14.0a Build status

Requirement-level status is BUILT unless named in §14.0a.3. Do not cache a step count or percentage here; each FR's status is recorded in this section (§14.0a.2 and §14.0a.3) and on the FR's own `Status:` line, and `.claude/LEDGER.md` holds only short notes on work in progress.

#### 14.0a.1 The CSS is emitted by a set of PHP files, not by `render.php` alone

Roster: `git ls-files plugins/sgs-blocks/includes | grep nav-menu`. Both blocks `require_once` the shared `plugins/sgs-blocks/includes/nav-menu-*.php` files PER INSTANCE from their own `render.php` (not bootstrap-loaded); a future cross-block caller must require the file itself.

| File | Owns |
|---|---|
| `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php` | entry, `SGS_Nav_Menu_Bar_Renderer`, treatment-resolution call, indicator/magnet `data-` flags, `<style>` assembly, `sgs_nav_shared_typography_hover_rule()` (FR-41-21; declared identically in `plugins/sgs-blocks/src/blocks/nav-drawer-menu/render.php`) |
| `plugins/sgs-blocks/src/blocks/nav-drawer-menu/render.php` | entry, `SGS_Nav_Drawer_Menu_Flattener`, the same typography helper |
| `plugins/sgs-blocks/includes/class-sgs-nav-menu-source.php` | `SGS_Nav_Menu_Source`: resolves the site's menu for both blocks |
| `plugins/sgs-blocks/includes/nav-menu-markup.php` | `sgs_nav_bar_menu_render_items()`, `sgs_nav_drawer_menu_render_items()`, `sgs_nav_bar_menu_burger_toggle_markup()`, `sgs_nav_shared_badge_html()` |
| `plugins/sgs-blocks/includes/nav-menu-css.php` | `sgs_nav_shared_item_state_css()`: item typography, nav-container colour, the item text/background three-state emission with paired treatments, the FR-41-13 persistence rules |
| `plugins/sgs-blocks/includes/nav-menu-item-border-featured-css.php` | `sgs_nav_shared_item_border_css()` (item border states, the border-sweep band, then the lines between items); `sgs_nav_shared_featured_css()` |
| `plugins/sgs-blocks/includes/nav-menu-separators.php` | `sgs_nav_menu_separators_css()`, `sgs_nav_menu_separators_root()` (FR-41-37) |
| `plugins/sgs-blocks/includes/nav-menu-treatments.php` | `sgs_nav_shared_sweep_eligible()`, `sgs_nav_shared_resolved_treatments()`, `sgs_nav_shared_text_sweep_css()`, `sgs_nav_shared_icon_markup()` |
| `plugins/sgs-blocks/includes/nav-menu-trigger-css.php` | `sgs_nav_bar_menu_trigger_css()`: the Menu Button's colour, glyph sweep, background and size rule (bar-only) |
| `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` | `sgs_nav_shared_submenu_css()`: collapse-point switch, dropdown/mega positioning and the FR-41-11 bridge, the submenu link's base typography/text states, custom CSS |
| `plugins/sgs-blocks/includes/nav-menu-submenu-link-css.php` | `sgs_nav_shared_submenu_link_css()`: the submenu link's hoverable background/border/typography-hover, the drawer overrides, `listColumns` grid, the sliding indicator, the root box |
| `plugins/sgs-blocks/includes/sweep-css.php` | `sgs_directional_sweep_css()`: the angle-driven sweep primitive (FR-41-38) |

Shared inspector panels live in `plugins/sgs-blocks/src/shared/nav-menu-panels/`; bar-only panels (`BurgerPanel.js`, `BarColourRowExtras.js`) in `plugins/sgs-blocks/src/blocks/nav-bar-menu/`. ⛔ `colourRows` STAYS in each block's `edit.js`: `plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js` resolves a row's state count only from a shape it can see in that file or in `plugins/sgs-blocks/src/components/`.

#### 14.0a.2 BUILT pointers

Every requirement in this Part is built except those in §14.0a.3; each FR names the code that carries it.

#### 14.0a.3 NOT BUILT or PARTIAL

| Status | Requirement | Proof |
|---|---|---|
| NOT BUILT | **FR-41-18**: auto-adjust for readability (explicitly non-blocking) | `git grep -n -i "auto-adjust\|autoAdjust" -- plugins/sgs-blocks/src/blocks/nav-bar-menu plugins/sgs-blocks/src/blocks/nav-drawer-menu` returns nothing |
| PARTIAL | **FR-41-20**: active-trail. The visual ancestor Current styling is built in CSS; the ARIA/semantic trail is not built (out of scope by design) | `git grep -n "data-sgs-nav-has-current" -- plugins/sgs-blocks/includes plugins/sgs-blocks/src` shows the CSS ancestor rule and its bar fallback |
| PARTIAL | **FR-41-36**: default colour scheme. Item-border, submenu-row, drawer-panel and Current-weight defaults are declared; the item Hover/Current background defaults are unset, and the item Hover text default-closes in PHP | the defaults FR-41-36's table lists are in the two `block.json` files (`itemBorderColour`, `submenuLinkBg`, `submenuLinkBgHover`, `itemFontWeightCurrent`) |

### 14.1 Scope

#### 14.1.1 In scope

The two menu blocks' inspectors, `block.json` manifests and rendered CSS; three additive shared extensions, each byte-identical for every existing caller by default (§14.11 G1): `SgsColourPanel` row keys (FR-41-16), `SgsBorderControl`'s `showColour` prop (FR-41-33), and an optional third state on `sgs_emit_state_colour_css()` / `sgs_fill_decls()` / `sgs_text_decls()` (FR-41-3); the `--sgs-magnet-transition` exposure in `plugins/sgs-blocks/assets/css/fx-magnet.css` (FR-41-31); and one companion on `sgs/nav-drawer` (FR-41-12).

#### 14.1.2 Out of scope (named so nobody re-opens them)

| Not in scope | Why |
|---|---|
| The **featured item-flag** mechanism (`featuredColour`, `featuredBg`, their Hover and gradient siblings) | A separate per-item flag with its own contrast resolution (FR-36-4). The item-border Sweep band (FR-41-8) renders on featured items too. |
| **Mega menu** | Owned by the mega-menu builder (FR-36-5). |
| **Sticky / scrolled** colour states | Owner-rejected: the header (Spec 37) owns its own `scrolled` state. |
| A **device-visibility** panel | The universal `responsive-visibility.js` / `conditional-visibility.js` extensions already attach to every `sgs/*` block. |
| A **fourth colour state** | Exactly three everywhere: Normal, Hover, Current. |
| **ARIA active-trail** | Not built (FR-41-20); the visual ancestor Current styling is. |
| A **hover trio on the CURRENT state** | `TypographyControls` models resting + hover only; Current carries `itemFontWeightCurrent` (FR-41-6). |
| **`itemBorderColourGradient`** | Pseudo-element budget: the gradient ring needs `::before`, which the item link uses for its background (FR-41-7). The submenu PANEL keeps `submenuBorderColourGradient`. |
| **Cursor-reactive field** (and the other `motionSurface` effects) | Eligible, deliberately not offered (FR-41-32). |

#### 14.1.3 The three states: definition and vocabulary

| State | Means | Selector | Set by |
|---|---|---|---|
| **Normal** | Resting | the base selector | none |
| **Hover** | Pointer over it, or keyboard-focused | `:hover` (touch-guarded) + `:focus-visible` (never guarded) | pointer / keyboard |
| **Current** | This is the page you are on | `[aria-current="page"]` | `markCurrentPage`, an independent copy in each of `plugins/sgs-blocks/src/blocks/nav-bar-menu/view.js` and `plugins/sgs-blocks/src/blocks/nav-drawer-menu/view.js` |

⛔ The third state is named `current`, the framework's vocabulary (`plugins/sgs-blocks/scripts/consistency/golden-controls.json::_meta.stateVocabulary.real`), never `Active` or `selected`, in every attribute, row-descriptor key, PHP variable and `css_state` value.

⛔ REUSE the existing `aria-current` mechanism. `markCurrentPage` normalises `window.location.pathname`, stamps `aria-current="page"` on the item link and the sublink (`[data-sgs-nav-path]`), and re-runs on bfcache `pageshow`. It is client-side because LiteSpeed would otherwise serve one page's answer everywhere (FR-36-11).

#### 14.1.4 Colour-architecture research

`~/.claude/memory/research/2026-09-10-nav-drawer-colour-architecture-industry-standard.md` recommends an MD3-style derived state layer; this Part instead gives three explicit authorable colours per row plus the warn-only contrast check (FR-41-17).

### 14.2 The shared-mechanism strategy

#### FR-41-1 — Every stateful control targets the LINK. Nothing targets the `<li>`.

`markCurrentPage` stamps `aria-current="page"` on the anchors, never on the `<li>` or a drawer ancestor, so **text colour, background, border and the hover animation all apply to the link element**. Consequences: no `:has()` for Current; `:focus-visible` binds by construction; all three states share one specificity, so the source-order rule (FR-41-3) is one rule.

DOM shape (each block calls its own emitter in `plugins/sgs-blocks/includes/nav-menu-markup.php`):

| Block | Emitted by | Structure |
|---|---|---|
| `sgs/nav-bar-menu` | `sgs_nav_bar_menu_render_items` | `li.sgs-nav-bar-menu__item--has-submenu` › `div.sgs-nav-bar-menu__submenu-root` › **`.sgs-nav-bar-menu__link`** (an `<a>` with a sibling `button.sgs-nav-bar-menu__subtoggle`, or a `<button>` carrying both classes) + `div.sgs-nav-bar-menu__submenu-wrap` › `ul.sgs-nav-bar-menu__submenu` › `li.sgs-nav-bar-menu__subitem` › `a.sgs-nav-bar-menu__sublink` |
| `sgs/nav-drawer-menu` | `sgs_nav_drawer_menu_render_items` | `li.sgs-nav-drawer-menu__item--has-submenu` › `div.sgs-nav-drawer-menu__accordion-row` › **`.sgs-nav-drawer-menu__link`** (an `<a>`, or `<span class="...__link ...__link--label">` when the parent has no URL) + `details.sgs-nav-drawer-menu__accordion` › `summary.sgs-nav-drawer-menu__accordion-summary` + `ul.sgs-nav-drawer-menu__submenu[data-sgs-drill-panel]` › `a.sgs-nav-drawer-menu__sublink` |

The link is never a direct child of the `<li>` on a submenu-bearing item; `.sgs-nav-bar-menu__submenu-wrap` is bar-only; `ul.sgs-nav-*-menu__submenu` is the one class in both forks, so every "inside the open panel" rule keys on it.

#### FR-41-36 — Default colour scheme for item/submenu/drawer states

**Status: PARTIAL** (§14.0a.3). Owner-approved; uses the `theme.json` tokens `primary`, `primary-dark`, `accent`, `accent-light`, `accent-text`, `surface`, `surface-alt`, `text`, `text-muted`, `border-light`. The `itemBorder*` family is the item's own edge (the **Underline** on bar items, a box when all four sides are set); a line BETWEEN items is the Separators setting (FR-41-37).

| Context | Normal | Hover | Current |
|---|---|---|---|
| **Top bar item** | text and background unset; Underline `border-light`, drawn only once an `itemBorderWidth` is set | text default-closes in PHP to `primary` (skipped when the resolved text treatment is `none`); background unset; Underline `accent` | text and background unset; Underline `accent`; `itemFontWeightCurrent` `"600"` |
| **Desktop submenu** rows | row background `surface` (when neither `submenuBg` nor `submenuBgGradient` is set); text `text`; separator 1px solid `border-light` | row background `primary`; text default-closes to `text`; separator `accent` | row background `surface-alt`; text `text` |
| **Drawer top-level** | as the top bar; panel background is `nav-drawer`'s `drawerBg`, default `surface` | as the top bar | as the top bar |
| **Drawer nested submenu** | the same `submenuLinkBg*` / `submenuColour*` family as the desktop submenu | as the desktop submenu | as the desktop submenu |

Sources: the two `block.json` files (each default carries its contrast justification), `plugins/sgs-blocks/src/blocks/nav-drawer/block.json` `drawerBg`, `plugins/sgs-blocks/includes/nav-menu-css.php::sgs_nav_shared_item_state_css` (`$default_item_colour_hover`, both callers pass `'primary'`) and `plugins/sgs-blocks/includes/nav-menu-submenu-css.php::sgs_nav_shared_submenu_css` (the `submenuColourHover` default-close to `'text'`). The item Hover text default-closes to a token because core's ambient `:root :where(a:hover)` stops matching once the pointer leaves the `<a>` for its open dropdown, leaving FR-41-13 nothing to hold. ⛔ The drawer panel never defaults to a brand fill.

**Not built:** an item Hover background tint (`accent-light`) and a Current-row tint on the top bar and drawer top-level; an untouched item paints no Hover or Current fill.

#### FR-41-37 — The lines between items (Separators)

A line between two items is its own setting, not a border on one of them: the shared Separators setting (`plugins/sgs-blocks/includes/helpers-separators.php`, editor control `SgsSeparatorControl`).

| Attribute | Block | Draws between | Axis | Offers |
|---|---|---|---|---|
| `separators` | `sgs/nav-bar-menu` | top-level bar items | `column` (vertical); not drawn in the bar's drawer copy | hover colour, swap / sweep |
| `separators` | `sgs/nav-drawer-menu` | top-level rows | `row` (horizontal) | hover colour, swap / sweep, `edges` (between / all / end) |
| `submenuSeparators` | both | the rows of an open submenu | `row` | hover colour, swap |

**Shape:** `{ row?: axis, column?: axis, edges, hoverTreatment, sweepAngle }`, an axis being `{ style, width: {desktop,tablet,mobile}, colour, colourHover }`; an axis with no width draws nothing; a sweep is offered for a solid line only. **Geometry:** each item except the first draws the line on an empty pseudo-element centred in the gap (`plugins/sgs-blocks/includes/helpers-separators-line-css.php`), using the `--sgs-nm-gap` each tier writes; a `listColumns` drawer list takes the flow path (`column-rule` / `row-rule`, else the runtime overlay in `plugins/sgs-blocks/src/shared/separators/`). Hovering or focusing EITHER neighbour repaints the line; there is no Current state. The colour lives in the `SgsSeparatorControl` composite, not the Colour panel.

**Emitter:** `plugins/sgs-blocks/includes/nav-menu-separators.php::sgs_nav_menu_separators_css`, called at the end of `plugins/sgs-blocks/includes/nav-menu-item-border-featured-css.php::sgs_nav_shared_item_border_css`. Gate: `plugins/sgs-blocks/scripts/check-separators-through-helper.py` fails a between-item line drawn outside the helper.

#### FR-41-38 — The hover Sweep is angle-driven

Every band Sweep (item border band, separator band) uses `plugins/sgs-blocks/includes/sweep-css.php::sgs_directional_sweep_css`: a 50/50 `linear-gradient(<angle>deg, ...)` at `background-size:200% 200%` with both `background-position` endpoints computed from the angle. `sweepAngle` (`number`, default `90` = left to right) is edited with an `AnglePickerControl` plus presets. `borderHoverAnimationDirection` is not declared; the emitter reads it off the raw `$attributes` only when `sweepAngle` is absent, so older saved content keeps its direction. The text/glyph Sweep (FR-41-26) is a fixed left-to-right gradient and does not use this primitive. The separator band lives on the item's own `::before`, leaving the link's pseudo-elements to the item background and border band.

#### FR-41-2 — No new shared JS component is built. None is needed.

**(a) No `fillRow3`/`textRow3`.** `plugins/sgs-blocks/src/components/colour-variants/fillRow.js::fillRow` and `plugins/sgs-blocks/src/components/colour-variants/textRow.js::textRow` accept an optional `current` / `currentGradient` key (the JS mirror of FR-41-3), appended only when `hover` is also supplied. Two rows stay hand-written literals, deliberately:

| Row | Why it cannot use the helper |
|---|---|
| **Item background** (`item-bg`) | FR-41-14 omits Current per-STATE under `Highlight`; a conditional attribute name passed to the helper is not statically countable, so `describeRow()` would go blind. A spread-of-ternary inside a literal `states` array stays countable. |
| **Item border colour** (`item-border`) | No gradient attribute (§14.1.2), so the row is not `gradientCapable` and renders `DesignTokenPicker`, which has no contrast check: its `contrastAgainst` / `contrastLargeText` pair is declared but INERT. |

**(b) `SgsBorderControl` needs no fork (FR-41-2b).** Border colour lives in the Colour panel (FR-41-33), so these blocks never pass `colourStates`; `plugins/sgs-blocks/src/components/SgsBorderControl.js::SgsBorderControl` owns width, style and radius under `showColour={ false }`, rendering the shared `plugins/sgs-blocks/src/components/BorderStyleControl.js::BorderStyleControl` as a sibling so border style survives. ⛔ No fresh `SelectControl` for border style.

**Detector rules** (`31-golden-colour-control.js`, which counts `statesArray.elements.length` on a literal `ArrayExpression`): ⛔ state entries are LITERAL, never `.map()`/`.filter()`-generated, with conditionality at array level; ⛔ `linked: true` on every state, so a brand token survives a re-skin; ⛔ state labels translated at the row (`__( 'Current', 'sgs-blocks' )`).

#### FR-41-3 — The PHP emitters take an optional third state. No `_3` family exists.

⛔ There is no `sgs_*_states_css_3` or `sgs_emit_state_colour_css_3`. The third state arrives as optional parameters on the existing functions; every existing caller is byte-identical (§14.11 G1).

**(a)** `plugins/sgs-blocks/includes/helpers-tokens.php::sgs_emit_state_colour_css( string $selector, array $decls_normal, array $decls_hover, array $extra_states = array() ): string`. `$extra_states` maps `state_key => [ 'suffix', 'decls', 'guarded' ]`; Current passes `'suffix' => '[aria-current="page"]'`, `'guarded' => false`. ⛔ `$extra_states` is emitted BEFORE the hover rules inside the function.

**(b)** `sgs_fill_decls()` / `sgs_text_decls()` read an optional `$map['current']` (and `current_gradient`) and their `*_states_css()` wrappers forward it into `$extra_states`.

**(c)** `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_border_states_css`: the third state is FLAT-PATH ONLY. The flat path (no gradient) adds one `{sel}[aria-current="page"]{border-color:Z}` rule before the hover pair; the ring path (`sgs_border_gradient_css()`, a masked `::before` composing two paints) has no Current. The ITEM border never reaches the ring path; the submenu PANEL border may, because it is Normal-only (FR-41-9).

**Three binding emitter rules:**
1. ⛔ Every hover rule routes through `plugins/sgs-blocks/includes/helpers-hover-state.php` (`sgs_hover_state_rules()` for a base selector, `sgs_hover_guarded_rule()` for a built `:hover` selector), never a bare `{sel}:hover`. `SGS_HOVER_MEDIA` fixes phones and pure-touch tablets, `SGS_HOVER_NOT_TOUCH` fixes hybrids.
2. `:focus-visible` stays OUTSIDE both guards.
3. ⛔ The Current rule is emitted BEFORE the Hover rule and is never guarded.

Every state pair shares one base selector and differs by one equal-specificity suffix, so source order decides: hover wins when you point at the current page's item.

#### FR-41-16 — `SgsColourPanel` takes optional row keys (additive, zero blast radius)

`plugins/sgs-blocks/src/components/SgsColourPanel.js::SgsColourPanel` renders ONE "Colour" `PanelBody` in `group="styles"`. A row descriptor may carry three optional keys:

| Key | Rendered | Exists for |
|---|---|---|
| `heading` (string) | a `BaseControl.VisualLabel` BEFORE the row | the §14.9.6 Menu / Submenu / Menu-button groupings |
| `after` (React node) | AFTER the row's control, inside the row wrapper | FR-41-23/24's treatment selector and the `ⓘ` notes |
| `contrastLargeText` (boolean) | forwarded with `contrastAgainst`/`contrastLabel` | border rows (WCAG 1.4.11's 3:1, not 4.5:1) |

A row without a key renders byte-identically. ⛔ `after` is the ONLY sanctioned mount point for the treatment selector. Live mounts: `plugins/sgs-blocks/src/shared/nav-menu-panels/ColourRowExtras.js` (item and submenu treatments) and `plugins/sgs-blocks/src/blocks/nav-bar-menu/BarColourRowExtras.js` (burger treatments).

### 14.3 Accessibility signals: smart contrast and the non-colour state signal

#### FR-41-5 — Smart contrast: an opt-in toggle

`itemSmartContrast` (boolean, default `false`, both blocks) is a `ToggleControl` "Keep text readable automatically" in the General tab **Accessibility** panel (FR-41-27, §14.9.5); the Item text and Item background rows in §14.9.6 each carry a one-line cross-reference to it. When on and a Hover or Current **background** is set, `sgs_nav_shared_item_state_css` resolves the foreground through the existing helpers: empty text colour → `sgs_wcag_text_colour_for_bg( $bg_hex )`; set → `sgs_wcag_preferred_text_colour_for_bg( $bg_hex, $preferred )`, which keeps the operator's colour when it clears AA. The always-on advisory `Notice` under the Item text row stays unconditional; only the automatic SWAP is gated. Client-visible strings never say "WCAG", "contrast ratio" or "AA". Sweep defeats the toggle, so the two are never offered together (FR-41-26). Acceptance: §14.11 G16.

#### FR-41-6 — The non-colour state signal (WCAG 1.4.1)

Hover and Current must never be colour-only signals. ⛔ **The PRIMARY Hover signal is the item border row's own hover treatment (Swap or Sweep, FR-41-8/23); the hover typography trio is an OPTIONAL SECONDARY decoration and is never "the divider".** Neither may be restated as the other in spec, help text or label.

| State | Signal | Attribute | Default |
|---|---|---|---|
| **Hover** | the item border's Hover treatment | `itemBorderColourHover` + `itemBorderHoverTreatment` | `"swap"` (visible only once a border width is set; FR-41-17a(a)) |
| **Current** | `font-weight` | `itemFontWeightCurrent` | `"600"` |

The trio (`itemTextDecorationHover`, `itemTextTransformHover`, `itemFontWeightHover` and the `submenu` siblings) defaults to unset and paints nothing until chosen; `itemTextDecorationCurrent` is NOT declared. The hover-weight reflow caution belongs in help text (§14.9.10). The base `itemTextDecoration` enum carries `overline`, matching `SGS_TEXT_DECORATION_OPTIONS`. ⛔ The distinction is RENDERED as two reciprocal `ⓘ` notes (§14.9.6, §14.9.10), both or neither (§14.11 G19(e)).

⛔ `itemFontWeightCurrent` is string-typed like `itemFontWeight` and renders as a `SelectControl` fed `SGS_FONT_WEIGHT_OPTIONS` (FR-41-29), never a number input. **Never-lighter rule:** the Current weight rule emits only when `(int) itemFontWeightCurrent` exceeds `(int) itemFontWeight`.

### 14.4 Border and sweep

#### FR-41-7 — ONE item border control. There is no separate "Item Divider".

⛔ No `itemDivider`, standalone divider colour or `itemBorderSweep` (two mechanisms for one question cause double lines). The item border is one `SgsBorderControl` mount with per-side width: bottom for a row separator, right/left for a vertical separator, all four for a boxed item (a line styled independently of the item is FR-41-37). ⛔ Width and radius are BASE-ONLY (`showResponsive={ false }`, `showRadiusResponsive={ false }`); do not propose tier siblings. Defaults: `itemBorderWidth` `{}` (nothing paints until set), `itemBorderStyle` `"solid"`, colours `"border-light"` / `"accent"` / `"accent"`, `itemBorderRadius` `8px` per corner; `border-width` and `border-style` emit only when a width is set. ⛔ No `itemBorderColourGradient` (§14.1.2). ⛔ The colours are authored in the Colour panel (FR-41-33); a second writer is banned (`check-duplicate-controls.js`). Bar and drawer are separate blocks, so a border on one never leaks to the other.

#### FR-41-8 — The item border's hover treatment: None / Swap / Sweep

This FR owns the MECHANISM; FR-41-23 owns the control placement. **`itemBorderHoverTreatment`**, string, default `"swap"`, values `none` | `swap` | `sweep`, a `ToggleGroupControl` from `plugins/sgs-blocks/src/components/primitives`. ⛔ A plain `"type": "string"` validated in PHP, never a JSON `enum` (an off-enum value silently coerces to the default, which bites programmatic writers such as Spec 47's route). It animates the BOTTOM edge only; other edges swap. The direction is `sweepAngle` (FR-41-38).

| `itemBorderHoverTreatment` | What `sgs_border_states_css()` receives |
|---|---|
| `swap` (default) | the full `$map`: Normal, Hover and Current on every edge |
| `none` | `hover` unset on every edge; Current still emits |
| `sweep` | `hover` and `current` unset on the BOTTOM edge only (`'suppress_edges' => array( 'bottom' => true )`) |

⛔ **Under `sweep` the band owns every non-resting colour on the swept edge.** `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_border_states_css` takes an optional `$map['suppress_edges']`: the non-resting rules then emit per-edge `border-<edge>-color` longhands for the unsuppressed edges only (none at all when every edge is suppressed); the resting rule is unaffected; the gradient ring path ignores it. ⛔ Absent the key every other caller emits byte-identical CSS including the flat shorthand (§14.11 G1(c)). The Hover and Current swatches stay visible and stored; switching back to `Swap` loses nothing.

**One painted line, not two.** Under `sweep` the emitter (`plugins/sgs-blocks/includes/nav-menu-item-border-featured-css.php::sgs_nav_shared_item_border_css`) writes `{link}{position:relative}`, `{link}{border-bottom-color:transparent}` (an absolute band sits on the padding box while a real border paints on the border box) and the band on the link's `::after` (height = the bottom width, `sgs_directional_sweep_css( sweepAngle, NORMAL, HOVER )`, hover moves `background-position` through `sgs_hover_state_rules()`), with a mandatory `prefers-reduced-motion: reduce` rule dropping only the travel. A sweep with no bottom width or no Hover colour emits nothing; the help text says so. Proof: §14.11 G6.

### 14.5 The submenu

#### FR-41-9 — The submenu split: the PANEL and the LINKS are different things

**The PANEL** (`.sgs-nav-bar-menu__submenu` / `.sgs-nav-drawer-menu__submenu`) is **Normal-only for every property**: background, border colour and shadow. ⛔ No `submenuBg`, `submenuBorderColour` or shadow Hover/Current siblings. ⛔ The panel shadow is a `filter:drop-shadow()`, because the `.{bem_root}__submenu-wrap` carries `overflow-y:auto`, which clips a `box-shadow`. ⛔ `supports.sgs.colourExemptions`'s `submenu-bg` entry (and the `indicator` and panel-border entries) stay in both `block.json` files.

**The LINK** (`.sgs-nav-bar-menu__sublink` / `.sgs-nav-drawer-menu__sublink`) carries a genuine 3-state background under distinct names: `submenuLinkBg` / `submenuLinkBgHover` / `submenuLinkBgCurrent` (+ `submenuLinkBgGradient`, Normal), defaults per FR-41-36; its text Current state is `submenuColourCurrent`. ⛔ Never reuse `submenuBg*` names for the link, and the `sublink` element keeps `"prefix": ""` (a `submenu` prefix would claim the panel's `submenuAlign/Caret/CloseGrace/MinWidth/Radius/Padding`).

#### FR-41-10 — Submenu open animation

**Bar-only.** **`submenuAnimation`**, string, default `"fade"`; `none` | `fade` | `fade-lift` | `slide-down` | `grow`; no JSON enum, validated in `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php` (an unknown value degrades to `none`). Control: a five-option `SelectControl` in `plugins/sgs-blocks/src/shared/nav-menu-panels/DropdownStylePanel.js`; timing, easing and stagger in `plugins/sgs-blocks/src/blocks/nav-bar-menu/PanelMotionPanel.js`. `plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_bar_menu_render_items` puts `sgs-nav-bar-menu__panel-motion--{animation}` on the dropdown and mega wraps; `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css::.sgs-nav-bar-menu__panel-motion` transitions them from `@starting-style` with `transition-behavior: allow-discrete`. A closing panel takes no pointer hits and leaves the Tab order. ⛔ Every panel rule sits inside `prefers-reduced-motion: no-preference`, so under `reduce` the panel opens whole. The drawer's `<details>` accordion has no panel animation (Spec 36 "Motion").

#### FR-41-11 — Submenu top offset, and the hover-bridge it requires

Both panel kinds (`.sgs-nav-bar-menu__submenu-wrap`, `.sgs-nav-bar-menu__mega-panel-wrap`) sit at `top: calc(var(--sgs-mm-panel-top, 100%) + <offset>)`; `plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js::repositionPanel` publishes `--sgs-mm-panel-top` (FR-36-4 "Gap below the header"). **`submenuTopOffset`**, string, default `""`, `SgsLengthControl` with `presets={ false }`.

⛔ A non-zero offset creates a hover dead strip, so it MUST ship with the bridge. `submenuCloseGrace` does NOT cover this (in `mega-disclosure.js::leaveBridge` it defers openness, never CSS `:hover`). The bridge:

```
{uid} .sgs-nav-bar-menu__submenu-root:has([data-sgs-mega-trigger][aria-expanded="true"])::after,
{uid} .sgs-nav-bar-menu__mega:has([data-sgs-mega-trigger][aria-expanded="true"])::after {
  content: ""; position: absolute; left: 0; right: 0;
  top: 100%; height: var(--sgs-mm-bridge-h, 0px); pointer-events: auto;
}
```

`repositionPanel` publishes `--sgs-mm-bridge-h` on the root. The bridge hangs from the root, never the panel wrap (both wraps scroll and would clip it), exists only while the panel is open, and fixes the parent's paint only. Bar-only.

### 14.6 The menu trigger

#### FR-41-12 — The burger has a mode + label. The close side is a `sgs/nav-drawer` companion.

⛔ The panel is labelled **"Menu Button"**, with the help text "Controls the button that opens the mobile menu (the 'burger')." The label only: `triggerMode`, `triggerLabel`, `triggerIcon`, `triggerMagnet*` and the `burger*` family keep their names (a rename's blast radius includes Spec 47's route).

**OPEN side (`sgs/nav-bar-menu`),** built by `plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_bar_menu_burger_toggle_markup`:
- `triggerMode`: per-device tier object (`icon` | `text` | `icon-and-text`, default `{"desktop":"icon"}`), validated against `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php::$sgs_nm_allowed_trigger_modes` (no JSON enum); a flat string folds to `{desktop}`. The button renders the icon and label if any tier shows them; `plugins/sgs-blocks/includes/nav-menu-trigger-css.php` hides each per tier.
- `triggerIconPosition` (`before` | `after`), `triggerLabel` (`"Menu"`, a native `TextControl`), `triggerIcon` (FR-41-30a).
- Accessible name: `aria-label` "Open menu" only when no tier shows the word (an empty `aria-label` is never emitted); otherwise the visible word is the name (SC 2.5.3). The icon is `aria-hidden="true"` beside text. In non-icon modes `plugins/sgs-blocks/includes/nav-menu-trigger-css.php::sgs_nav_bar_menu_trigger_css` writes `min-width: <burgerSize>; width: auto`, keeping the height floor so the 44px target survives.

**CLOSE side** lives in `sgs/nav-drawer` (its own `render.php`, `closeStyle` default `"separate-x"`): `closeLabel` (`"Close"`; ⛔ when empty the `aria-label` "Close menu" must survive) and `closeIcon` (`{"source":"lucide","name":"x"}`, the same resolver as `sgs/icon`). `closeStyle` values are `separate-x`, `text-swap`, `burger-morph` (a CSS-drawn glyph), `icon-and-text` and, per tier (FR-36-6), `trigger`; no JSON enum, the allowed list is `plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$sgs_nd_allowed_close_styles` and `plugins/sgs-blocks/tests/php/run-close-control-standalone.php` asserts it matches the editor list. ⛔ The `icon-and-text` option is LABELLED "Both" (Spec 35 Part O's 12-character bound) while the stored value stays `icon-and-text`, one vocabulary for open and close. ⛔ The magnetic pull (FR-41-31) is not mirrored onto the close button. `closeIcon` / `closeLabel` route no CSS property (§14.8.6(e)).

### 14.7 Three behaviours that are fixes, not controls

#### FR-41-13 — A parent item stays in its Hover state while its own dropdown is hovered

Without this, a parent snaps back to resting the moment the pointer moves into its open dropdown, breaking FR-36-4's "you are inside this branch" cue. **FOUR rules, a mouse half and a keyboard half PER FORK.** The mouse half needs no `:has()` (`:hover` matches every ancestor of the hovered element):

```
/* BAR, {bem_root} = sgs-nav-bar-menu */
{uid} .{bem_root}__submenu-root:hover > .{bem_root}__link
/* DRAWER, {bem_root} = sgs-nav-drawer-menu */
{uid} .{bem_root}__accordion-row:hover > .{bem_root}__link
```

The keyboard half needs `:has()`, keyed on the class present in both forks:

```
/* BAR */    {uid} .{bem_root}__submenu-root:has( .{bem_root}__submenu :focus-visible ) > .{bem_root}__link
/* DRAWER */ {uid} .{bem_root}__accordion-row:has( .{bem_root}__submenu :focus-visible ) > .{bem_root}__link
```

⛔ The `>` combinator is load-bearing (only the PARENT keeps its look). ⛔ Never key the `:has()` on `.{bem_root}__submenu-wrap` (bar-only; silently dead in the drawer). Route each `:hover` variant through `sgs_hover_guarded_rule()` and each `:focus-visible` variant separately, unguarded. The declarations are literally the same emitter call's Hover declarations (text colour, `swap` border colour, item background on `::before`; on the bar also the caret), never a hand copy and never different declarations; a text or border Sweep is excluded. An older Firefox without `:has()` loses only the keyboard half.

#### FR-41-14 — The Highlight treatment suppresses per-item Hover/Current BACKGROUND

`Highlight` on the item Background row (FR-41-25) renders the shared sliding indicator (`.sgs-nav-bar-menu__indicator` / `.sgs-nav-drawer-menu__indicator`) painted in that row's OWN Hover swatch (`itemBgHover` / `itemBgHoverGradient`). When `itemBgHoverTreatment === 'highlight'`: the row renders with its **Current** state OMITTED (Normal and Hover stay); `plugins/sgs-blocks/includes/nav-menu-css.php::sgs_nav_shared_item_state_css` skips the per-item hover and current background; text, border, radius and menu button are unaffected; the stored `itemBgCurrent` is kept, so switching back restores it.

⛔ Per-STATE, never per-ROW, and OMIT, never disable: `states: [ normalBg, hoverBg, ...( 'highlight' !== itemBgHoverTreatment ? [ currentBg ] : [] ) ]` (reference: `plugins/sgs-blocks/src/blocks/icon-list/edit.js::Edit`). Help text: "Highlight paints one shape that slides between items, using the Hover colour you picked above. It replaces each item's own current-page background, so that swatch is hidden while it's selected."

#### FR-41-15 — No hardcoded, ungated state/paint rule stands beside an operator control

Every `background` or `border` declaration in these blocks' CSS is (a) gated on an operator attribute, (b) an attribute-driven `var()` whose writer exists, or (c) structurally incapable of the defect (a reset to `none`/`0`, a `forced-colors` rule, a zero-specificity `:where()` default). A hardcoded rule beside an operator attribute is a silent override.

⛔ **The `background` SHORTHAND is the defect on any selector a Sweep can paint.** The text Sweep (FR-41-26) paints `background-image` and sets `-webkit-text-fill-color: transparent`; an ungated hover `background:` shorthand resets `background-image` to `none`, leaving transparent glyphs (near-invisible text, invisible to `getComputedStyle( el ).color`). Use `background-color:` longhands.

**Standing consequences:** the line between items is only the Separators setting (FR-41-37); the current-page state has no hardcoded tint (Current paint is the operator's `*Current` attributes; the submenu link reads `--sgs-nm-submenu-current-colour` from `submenuColourCurrent`); featured sub-item paint emits only when its custom properties are written, as `background-color:`; the submenu panel is attribute-driven throughout (`--sgs-nm-submenu-bg*`, `submenuMinWidth`, per-corner `--sgs-nm-submenu-radius-*`, the border via `sgs_border_states_css()`, the shadow via `--sgs-nm-submenu-filter`). Named, kept exceptions: the drawer's resting sub-item indent (`border-left`), button resets (`background:none;border:0`, including `plugins/sgs-blocks/src/blocks/nav-drawer-menu/style.css::.sgs-nav-drawer-menu__drill-back-btn`), the `@supports not (background-color: color-mix(...))` burger hover rescue (FR-41-17a(c)), the `forced-colors` burger border, and the drill-down sub-panel's opaque `var(--sgs-nm-submenu-bg, inherit)`. Each returns to the census if a stateful colour row ever targets its element.

**Enforcement is `plugins/sgs-blocks/scripts/check-ungated-paint-rules.py` (FR-41-35)**, which scans both surfaces (every PHP emitter and each `style.css`) and classifies each hit GATED / DISMISSED / CENSUSED; the script is the enforcement, not this prose.

### 14.7a The universal hover-treatment pairing

#### FR-41-23 — Every stateful colour row gets ONE paired hover-treatment selector, not a separate mechanism

"How should this property look when hovered?" is one question for every property, so it has one control: a three-option `ToggleGroupControl` directly beneath each qualifying row's Hover swatch (block-private, FR-41-24). **None** = no change on hover (the Hover swatch stays stored); **Swap** (the default on every row) = a plain colour change; **Sweep** (text, border) or **Highlight** (background only) = the animated mechanism below.

| Row | Attribute | Third option | Third-option mechanism |
|---|---|---|---|
| Item text | `itemColourHoverTreatment` | **Sweep** | glyph colour-sweep (FR-41-26), eligibility-gated |
| Item background | `itemBgHoverTreatment` | **Highlight** | the shared sliding pill (FR-41-14/25), painted in the row's OWN Hover swatch |
| Item border | `itemBorderHoverTreatment` | **Sweep** | the directional band (FR-41-8) |
| Submenu link text | `submenuColourHoverTreatment` | **Sweep** | glyph sweep on the sublink; eligibility-gated (omitted whenever any sublink fill or text gradient is set) |
| Submenu link background | `submenuLinkBgHoverTreatment` | **None only** (`none`/`swap`) | no siblings to slide between, no band precedent on a vertical list |
| Menu button icon colour | `burgerColourHoverTreatment` | **Sweep** | glyph sweep on `.sgs-nav-bar-menu__burger` (bar-only); eligibility-gated |
| Menu button background | `burgerBgHoverTreatment` | **None only** (two options) | a single button: no pill, no band |

**Rows with NO selector:** `navBg*` / `navColour*` (a 2-state static wrapper); every Current swatch (not pointer-driven); the submenu panel background and border (Normal-only, FR-41-9); shadow colour. ⛔ A 2-option row drops the unavailable option, never renders it disabled; no bespoke per-row enum.

⛔ **THE ITEM BACKGROUND ROW PAINTS ALL THREE STATES ON `{link}::before`** (`z-index: -1`, `border-radius: inherit`), never on the link itself, emitted by `sgs_nav_shared_item_state_css` with `{link}{position:relative;isolation:isolate;}` whenever any fill is set. This is what keeps FR-41-26's condition 1 true for the item text row: a fill on the link would be clipped to the letter shapes by a text Sweep. The border band owns `::after`.

#### FR-41-24 — Component shape: block-private, not a new shared component

No other block offers a hover-treatment sub-control, so it is not exported from `plugins/sgs-blocks/src/components/` (an abstraction from a sample of one). Each selector is a plain `ToggleGroupControl` mounted through FR-41-16's `after` slot: `ItemTextTreatment`, `ItemBgTreatment`, `ItemBorderTreatment`, `SubmenuTextTreatment`, `SubmenuLinkBgTreatment` in `plugins/sgs-blocks/src/shared/nav-menu-panels/ColourRowExtras.js`; `BurgerIconTreatment`, `BurgerBgTreatment` in `plugins/sgs-blocks/src/blocks/nav-bar-menu/BarColourRowExtras.js`. Promote to a `primitives` export when a SECOND block asks (§14.12). **Storage:** one `"type": "string"` per row, PHP-validated, no JSON `enum`, default `"swap"`.

#### FR-41-25 — The Highlight treatment IS the sliding pill

`Highlight` on the item Background row (`'highlight' === itemBgHoverTreatment`) is the shared sliding pill; FR-41-14's per-state omission applies. ⛔ There is no indicator attribute, `indicatorColour` or Indicator panel: the pill paints in `itemBgHover` / `itemBgHoverGradient` (the colour-reuse rule).

Conditional JS rows: omit a STATE with a spread of a TERNARY (`...( cond ? [ row ] : [] )`; a spread of `cond && {...}` throws in an array literal); omit a whole ROW with `cond && row` (`SgsColourPanel` runs `rows.filter(Boolean)`).

#### FR-41-26 — The Sweep treatment on TEXT: the shipped precedent, adopted directly

The glyph colour sweep follows the shipped `sgs/business-info` attribution link (`plugins/sgs-blocks/src/blocks/business-info/style.css::.sgs-business-attribution .sgs-business-info__link`) and is emitted by `plugins/sgs-blocks/includes/nav-menu-treatments.php::sgs_nav_shared_text_sweep_css`: a fixed left-to-right `linear-gradient( to right, HOVER 50%, NORMAL 50% )` clipped to the text (`background-clip: text`, `-webkit-text-fill-color: transparent`), whose `background-position` travels on hover and keyboard focus through `sgs_hover_state_rules()`. Required companions: no transition under `prefers-reduced-motion: reduce`; a `forced-colors` / `print` rescue; and ⛔ the MANDATORY no-`background-clip:text` fallback (`plugins/sgs-blocks/includes/helpers-tokens.php::sgs_text_colour_gradient_fallback_rule`, never hand-rolled), which seeds the NORMAL colour on the base and the HOVER colour on its own rule (`.claude/rules/colour-emission.md`). The text sweep uses ZERO pseudo-elements and is colour travel only.

##### Sweep eligibility: one predicate, applied to every text/icon row

`Sweep` is offered on a text/icon row only when ALL hold; otherwise the segment is OMITTED (a two-option None/Swap control):
1. **The element paints no background of its own, from any source, in ANY state**, flat or gradient (`background-clip: text` would clip it to the glyphs).
2. **The row carries no Normal-state text gradient.**
3. **The element has glyphs.**

| Row | Condition 1 (blocking backgrounds) | Condition 2 | Condition 3 | Net |
|---|---|---|---|---|
| **Item text** `.{bem_root}__link` | none: all item fills paint on `{link}::before` (FR-41-23) | `itemColourGradient` empty | always | offered unless `itemColourGradient` is set |
| **Submenu link text** `.{bem_root}__sublink` | `submenuLinkBg`, `submenuLinkBgHover`, `submenuLinkBgCurrent`, `submenuLinkBgGradient` all empty (these default to tokens, FR-41-36) | `submenuColourGradient` empty | always | offered only on a sublink with no background in any state |
| **Menu button icon** `.sgs-nav-bar-menu__burger` | `burgerBg`, `burgerBgGradient`, `burgerHoverColour` all empty | `burgerColourGradient` empty | `triggerMode !== 'icon'` | offered only on a text-bearing button with no background |
| **Item border** (band on `::after`) | none | none | `glyphGuard` on `itemBorderStyle`: solid only | offered for a solid style |
| **Separators** (band on `::before`) | none | none | solid line only | decided by `SgsSeparatorControl` and `sgs_separators_line_css()` |

⚠ Featured sub-items paint their own background, so the emitter scopes the sublink sweep to `.{bem_root}__subitem:not(.{bem_root}__subitem--featured) .{bem_root}__sublink`; ⛔ without that scope, `featuredBg` and `featuredBgGradient` must join condition 1. ⚠ `burgerColourHover` is the colour the sweep travels TO, never a blocking input (§14.8.1). The static `@supports not (background-color: color-mix(...))` burger fallback is a named exception (FR-41-17a(c)); ⛔ do not delete it.

##### The predicate is evaluated twice: in the UI AND in the emitter

⛔ The predicate is the EMISSION rule; the inspector reflects it. The emitter re-evaluates it before honouring a stored `'sweep'` and resolves to `'swap'` when it fails, because the blocking inputs are other attributes the operator can set later (a new `submenuLinkBg`, `burgerBg`, or `triggerMode` back to `'icon'`). The stored `'sweep'` is KEPT, so clearing the blocking attribute restores the sweep.

##### One declared source, two evaluators: the predicate is DATA, not a function

Each block declares the predicate once in `supports.sgs.sweepEligibility` (`plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json`, `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json`): the bar four rows (item text, submenu text, burger, item border), the drawer three. Each row has exactly `blockingBackgroundAttrs` (condition 1), `blockingGradientAttrs` (condition 2) and `glyphGuard` (`null`, or `{ attr, disallowedValues }`, condition 3). `edit.js` omits the segment from it; the PHP reader `plugins/sgs-blocks/includes/nav-menu-treatments.php::sgs_nav_shared_resolved_treatments` reads the registered block type's `supports['sgs']['sweepEligibility']`, merging registered attribute defaults under the stored ones first. ⛔ No second JSON file or constant. ⛔ `itemColourHoverTreatment`'s empty `blockingBackgroundAttrs` is a declared fact that holds only while every item fill stays on `::before`. A newly found blocking input is added to the declared row (one edit, both surfaces). Every downstream rule keys on the RESOLVED treatment. Acceptance: §14.11 G14 (f) and (g).

##### When there is no hover colour to swap to

If the fallback to `'swap'` meets an empty Hover swatch, nothing is emitted for that hover state. ⛔ The emitter never substitutes a colour of its own (an un-clearable hardcoded default). Residual: FR-41-17a(d).

##### Sweep + a hover text-decoration: the underline must travel too

`text-decoration-color` ignores `-webkit-text-fill-color`, so when a row's RESOLVED treatment is `'sweep'` and its hover text-decoration is a permitted non-`none` value, the block-private emitter (FR-41-21) also sets `text-decoration-color` to the row's Hover swatch in the same `sgs_hover_state_rules()` call, with no transition. Item-text and submenu-link-text rows only. Gated: §14.11 G14(e).

#### FR-41-27 — `itemSmartContrast` sits in the General-tab Accessibility panel

The toggle, default and two-case resolution are FR-41-5's. Its inspector home is §14.9.5 "Accessibility", beside `navLabel` (both are "does the menu behave safely" controls).

#### FR-41-28 — One border/divider mechanism for BOTH blocks

The bar and the drawer are two separate blocks, each with its own uid and inspector, rendering the identical `itemBorderWidth` / `itemBorderColour*` / `itemBorderHoverTreatment` mechanism onto the same class name (FR-41-1). There is no bar-specific or drawer-specific border path: one `SgsBorderControl` mount and one `sgs_border_states_css()` call apply to both.

#### FR-41-29 — "Current-page weight" as a block-private field inside the Typography panel

A `SGS_FONT_WEIGHT_OPTIONS`-fed `SelectControl` writing `itemFontWeightCurrent`, at the bottom of the Typography panel's **Menu** target (FR-41-22, §14.9.10). It is not built into the shared `TypographyControls`, which has no Current branch and stays so (FR-41-21). ⛔ It is the ONLY Current-state typography field (FR-41-6).

#### FR-41-30 — Icon Picker drives two icons: the menu button and the sublink marker

Both use `plugins/sgs-blocks/src/components/IconPicker/IconPicker.js` (Lucide, Emoji, WordPress, Dashicons), following the `plugins/sgs-blocks/src/blocks/icon/edit.js` adopter.

**FR-41-30a — the burger trigger icon.** `triggerIcon` (default `{"source":"lucide","name":"menu"}`) in the "Menu Button" panel (§14.9.3), shown when `triggerMode` includes an icon, resolved by `plugins/sgs-blocks/includes/nav-menu-treatments.php::sgs_nav_shared_icon_markup` (the `sgs/icon` resolver, never a bespoke lookup). Its colour is the `burgerColour` / `burgerColourHover` row.

**FR-41-30b — the submenu marker (drawer-only).** `sublinkMarkerIcon` (default `{"source":"lucide","name":"chevron-right"}`) in the **Submenu — Items** panel, plus the `sublinkMarkerColour` / `Hover` / `Current` family and `*Gradient` counterparts. By default the marker inherits the sublink text colour and no colour row shows. ⛔ The row is revealed only when `sublinkMarkerIcon` is non-default (`sublinkMarkerIconIsCustom && textRow( ... )` in `plugins/sgs-blocks/src/blocks/nav-drawer-menu/edit.js::Edit`), omitted not disabled; once shown it matches `sgs/button`'s icon-colour control (`sgs_icon_gradient_css()`). The marker is `aria-hidden="true"`.

### 14.7b Motion and placement

#### FR-41-31 — The menu button has an optional magnetic pull

Block-private, reusing the shared `fx-magnet` runtime (Spec 38 FR-38-30) at the CSS/JS layer only: no new module, DB row or fx-panel registration (both nav blocks are excluded from the fx-panel roster, and the button is a descendant the generic injector cannot reach). Attributes `triggerMagnetEnabled` (`false`), `triggerMagnetRadius` (`120`, `RangeControl` 20-400) and `triggerMagnetStrength` (`24`, 2-80); ⛔ the bounds match `fx-magnet.js`'s own clamp; no axis control. Help text: "Makes the menu button lean toward the visitor's cursor as they approach it. Off automatically on touch devices and when reduced motion is requested."

**Render:** when enabled, the `<button class="sgs-nav-bar-menu__burger">` carries `data-sgs-fx="magnet"` plus `absint()`-ed radius and strength attributes; when disabled, none (the motion registry's enqueue is markup-sniffed, so nothing else loads). ⛔ The companion rule `.sgs-nav-bar-menu__burger[data-sgs-fx="magnet"]` in `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css` combines the hover-background transition with `var(--sgs-magnet-transition, transform 180ms ease-out)`, the value `plugins/sgs-blocks/assets/css/fx-magnet.css` exposes, never a retyped literal (equal-specificity transitions would otherwise kill one another by enqueue order). ⚠ Under reduced motion the pre-existing `!important` `.sgs-nav-bar-menu__burger` rule in the same stylesheet is what kills the companion's transition; ⛔ the companion gets no `!important` and no second reduced-motion wrapper. Acceptance: §14.11 G9 and G17.

#### FR-41-39 — Sibling dim: the OTHER items change while one is hovered

**Status: BUILT** (U-6, M-24). `sgs/nav-drawer-menu` and `sgs/icon-list` carry `siblingDimColour` (+`Gradient`) and `siblingDimOpacity`; while one item of a list is hovered or keyboard-focused, every OTHER item of that list takes the dim values (each list on its own). Built by `plugins/sgs-blocks/includes/helpers-item-effects.php::sgs_sibling_dim_css`: one hand-built `:has()` rule wrapped with `sgs_hover_media_wrap()` (never `sgs_hover_guarded_rule()`, which splits its selector on every comma) plus a separate keyboard rule keyed on `:focus-visible` (never `:focus-within`, which a tap on an accordion `<summary>` would hold), written `list:has(> item :focus-visible)` with ONE level of `:has()` (nested `:has()` is invalid; `plugins/sgs-blocks/tests/php/run-u6-u7-item-markup-standalone.php` asserts no nesting). Not on `sgs/nav-bar-menu` (no reference dims bar items; Bean). The colour row carries a `states` exemption (a pointer-driven state); a dimmed colour below 4.5:1 is transient, reported by the contrast warning, never clamped.

#### FR-41-40 — Two-copy label roll, and the trigger's hover and open words

**Status: BUILT** (U-6, M-25). `labelRoll` (`''` | `up` | `up-scale`) on `sgs/nav-bar-menu` (items and trigger word), `sgs/nav-drawer-menu` and `sgs/icon-list`. Off emits no extra markup; on, the label gains an `aria-hidden` copy and rolls to it on hover or keyboard focus inside an `overflow:clip` inline grid, with no transform under reduced motion. One timing pair per block (`itemMotionDuration`, `itemMotionEasing` + `Custom`) times every item effect. The trigger adds `triggerHoverLabel` and `triggerOpenLabel` (FR-36-27's swap-label): the copies bind `aria-hidden` to `state.isOpen`, so the accessible name is the visible word (WCAG 2.5.3) and open beats hover.

#### FR-41-41 — Drawer row extras: ornament, expander glyph, per-item media

**Status: BUILT** (U-7, M-22 and M-15). `sgs/nav-drawer-menu` only. `itemOrnament` per tier (`none` | `index` | `icon`): a decorative two-digit counter (`content: counter() / ""`) or `itemOrnamentIcon` with an optional crossfading `itemOrnamentIconHover`, plus `itemOrnamentSize`, `itemOrnamentColour` (+`Hover`) and `itemOrnamentGap`; the colour row carries a `gradient` exemption (one span holds a counter or an SVG glyph; no single gradient paints both). `itemExpanderIcon` and `itemExpanderRotate` replace the hardcoded chevron and its 180 degree turn. `itemMedia: featured-image` shows each linked page's featured image beside its label (custom links show none; a GIF or WebP is served at `full` so it keeps animating), revealed per tier by `itemMediaReveal` (`none` | `always` | `hover`, growing from width 0 on hover or keyboard focus) and sized by `itemMediaWidth` / `itemMediaHeight` per tier and `itemMediaRadius`. The image is decorative (`alt=""`).

#### FR-41-32 — Cursor-reactive field: eligible, deliberately NOT offered

`sgs/nav-bar-menu` qualifies structurally (`containerKind: "layout"`), but the only route is `supports.sgs.fx.motionSurface: true`, which opens a nine-effect panel at once, and the panel-bloat containment rule (`plugins/sgs-blocks/scripts/generate-fx-qualifying-blocks.py`) keeps functional blocks off the effects panel. Revisit when per-block, per-effect motion selection exists. ⛔ No controls, attributes or bespoke wiring around the containment rule.

#### FR-41-33 — Border COLOUR joins the global Colour panel; width, style and radius stay with the element

Owner-locked, a considered block-scoped exception to `SgsColourPanel`'s documented border-colour exemption: the redesign compares every element's colours across three states side by side, and border colour must coordinate with the fill and text beside it.

| Property | Home | Control |
|---|---|---|
| Border **width**, **style**, **radius** | the element's own panel: "Menu item" (§14.9.7), "Submenu — Container" (§14.9.9) | `SgsBorderControl` with `showColour={ false }` |
| Border **colour**, all states | the global Colour panel (§14.9.6) | `SgsColourPanel` row: 3 states on the item, Normal-only on the panel |

1. ⛔ The additive **`showColour`** prop (default `true`) removes the `.sgs-border-control__colour` `FlexItem`; every other mount is byte-identical (§14.11 G1). Under `showColour={ false }` ten colour/contrast props are INERT (documented on the component's docblock), including `contrastAgainst` / `contrastLabel` / `contrastLargeText`; the border rows carry those in the Colour panel instead.
2. ⚠ `borderStyle` rides inside the colour popover, so under `showColour={ false }` the component renders the shared `BorderStyleControl` as a sibling, only when `typeof onStyleChange === 'function'` (matching `GradientCapableColourControl`). ⛔ No hand-rolled style `SelectControl`.

⛔ Exactly ONE live control writes each attribute (`check-duplicate-controls.js`). Acceptance: §14.11 G18.

### 14.8 Attribute reconciliation

Existing names WIN; new attributes extend the existing convention (`itemColourHover` → `itemColourCurrent`). ⛔ Zero renames in this Part: every attribute is additive (a rename's blast radius includes Spec 47's route). Names, types and defaults live in `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::attributes` and `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::attributes` (query: `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT attr_name, css_property FROM block_attributes WHERE block_slug IN ('sgs/nav-bar-menu','sgs/nav-drawer-menu')"`); the bar / drawer / both split is in `.claude/reports/2026-09-14-nav-menu-split-attribute-classification.md`.

#### 14.8.1 Colour-row attributes

3-state rows: `itemColour*`, `itemBg*` (`itemBgHover` is also the Highlight pill's fill), `submenuColour*`, `submenuLinkBg*`, `itemBorderColour*`. 2-state: `navBg*`, `navColour*` and the Menu Button family (`burgerColour*`, `burgerBg*`, `burgerHoverColour`). Normal-only: `submenuBg` (FR-41-9). `itemTextDecoration` is Normal state with a Hover sibling and no Current one.

⛔ **`burgerColourHover` and `burgerHoverColour` are two different attributes:**

| Attribute | Governs | Emission |
|---|---|---|
| `burgerColourHover` | the ICON/TEXT colour on hover | `color:` via `sgs_hover_state_rules()`; manifest `burger.states.hover.attrMap."css:color"`; the **Icon colour** row |
| `burgerHoverColour` | the BUTTON BACKGROUND on hover | `background-color:`; manifest `burger.states.hover.attrMap."css:background-color"`; the **Button background** row (Normal half `burgerBg`) |

Neither is renamed; their rows carry different treatment attributes (`burgerColourHoverTreatment` 3-option, `burgerBgHoverTreatment` 2-option).

#### 14.8.2 Other existing attributes

No control in this Part touches `padding`, `margin`, `ref`, `collapsePoint`, `drawerRef`, `featuredItemIds`, `navLabel`, `gap`, `listColumns`, the `item*` typography families, `featured*`, `itemMagnetEnabled`, `sgsCustomCss`, `submenuAlign`, `submenuCaret`, `submenuCloseGrace`, `submenuMinWidth` or `submenuPadding`. ⚠ `itemMagnetEnabled` (§14.9.11) and FR-41-31's `triggerMagnetEnabled` are unrelated.

#### 14.8.4 Attributes declared by this Part

The decisions a manifest does not show:
- `itemBgHoverGradient` and `itemBgCurrentGradient` complete the item background's three-state gradient set; `submenuBgGradient` is the panel's Normal-only gradient (required by `sgs_custom_property_gradient_decls()`).
- `submenuShadowColour`'s name is forced by `plugins/sgs-blocks/src/components/ShadowControl.js::shadowAttrKeys` (`colour = <base>Colour`).
- `sweepAngle` shows only when `itemBorderHoverTreatment === 'sweep'` (FR-41-38).
- ⛔ **`itemBorderRadius` defaults to `8px` on all four corners as a FLAT corner object**, not a tier envelope (a tier envelope would find no corner keys and silently vanish), read by `plugins/sgs-blocks/includes/helpers-box.php::sgs_corner_object_longhands`. `submenuBorderRadius` keeps `{}` (the panel has a token fallback).
- ⛔ **Every `showHover` trio attribute defaults to `""`**, never `"underline"` (that would make the underline the shipped signal FR-41-6 rules out and impose it on every install); all six are plain strings with no JSON `enum`, validated against FR-41-21's allowlists. The base `itemTextDecoration` keeps its JSON `enum` (an existing attribute is not restructured).

#### 14.8.4a Responsive font-size tiers: no flat tier attributes

`itemFontSize` and `itemLetterSpacing` (and the `submenu` twins) are `{desktop,tablet,mobile}` tier objects: `plugins/sgs-blocks/src/components/TypographyControls.js::TypographyControls` renders `<ResponsiveOverride>` for them and `sgs_typography_css_rule()` emits per-tier `@media` CSS (`tests/js/typography-tier-shape.test.js`). ⛔ Never declare `itemFontSizeTablet` / `...Mobile` (attributes with zero writers or readers). `itemLineHeight` is a plain number, so per-device line height is not offered; ⛔ no `...LineHeightTablet`; the route is `plugins/sgs-blocks/scripts/migrate-tier-object.py --property lineHeight` across every block. Formula-based scaling is not offered: vw/vh units cover it (Bean ruling). Acceptance: §14.11 G20.

#### 14.8.5 Three deliberate boundaries: do not "complete the set"

1. **The item TEXT row's gradient is Normal plus Hover, never Current.** A gradient has no single hex to contrast-test, so `itemColourHoverGradient` is offered only while `itemSmartContrast` is off and ignored by the emitter while the swap is active. The item BACKGROUND row keeps all three gradients.
2. **The submenu PANEL background has a Normal-state gradient only** (`submenuBgGradient`); FR-41-9 rules out states.
3. **No gradient on the ITEM border; the submenu PANEL border keeps one** (the pseudo-element budget, FR-41-3c).

#### 14.8.6 Required `block.json` manifest shape

**(a) `supports.sgs.elements.item`**: `clusters: ["text","fill","layout","border"]` (`"border"` is required or the border routes are never visited), `prefix: "item"`, states `hover` and `current`. ⛔ Each state maps DISTINCT attribute names and every typography member (base and hover `css:text-decoration` / `css:text-transform` / `css:font-weight`, and current `css:font-weight` → `itemFontWeightCurrent`) is an explicit `attrMap` entry: the classifier's `_record()` is last-write-wins, so an implicit or repeated mapping collides on one `(property, element, state)` slot and retags attributes. ⛔ The base `css:font-weight` → `itemFontWeight` must survive (a state with no base is STATE_WITHOUT_BASE, Spec 35 FR-35-5). Verification: §14.11 G4.

**(b) `sublink`**: clusters `["text","fill","border"]`, ⛔ `"prefix": ""` (FR-41-9), `submenuLinkBg*` across base and both states, `submenuColourCurrent` on `current`, the explicit typography entries of FR-41-22c, and on the drawer the marker colour family (`css:fill` / `css:fill-gradient` → `sublinkMarkerColour*`). Each hover member's base counterpart is declared in the same change.

**(c) `submenu-panel`** (`.{bem_root}__submenu`): `submenuBg*`, the `submenuBorder*` family, and on the bar `submenuBorderRadius`, `submenuShadow`, `submenuShadowColour`; clusters `["fill","border","layout"]`, `"prefix": ""`, ⛔ no `states` key.

**(d) The between-item line has no element** (FR-41-37 draws it through the helper).

**(e) The `burger` element carries nothing for `triggerMode` / `triggerLabel` / `triggerIcon` / `triggerMagnet*`** (not CSS properties; they would create phantom routing slots).

**(f) No `underline` element exists** (§14.11 G11).

**(g) `supports.sgs.sweepEligibility`** (FR-41-26) is not an `elements` entry and routes nothing; JS reads it via `plugins/sgs-blocks/src/blocks/nav-bar-menu/index.js::metadata` and `plugins/sgs-blocks/src/blocks/nav-drawer-menu/index.js::metadata`. ⛔ Every attribute it names must exist in that block's own `attributes` (a typo reads as permanently empty and silently deletes the rule; §14.11 G12).

### 14.9 The inspector: two tabs, exact layout

⛔ This section is the authoritative control-by-control layout: if an FR's prose disagrees, the FR is the one to fix; `block.json` wins on any default VALUE. Panel order within a tab is the order below. `SgsColourPanel` renders **before** any other same-group `<InspectorControls>`. ⛔ Every control names its component: 2-3 options is `ToggleGroupControl`, 4+ is `SelectControl` (`SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED` is `3`; both from `plugins/sgs-blocks/src/components/primitives`).

#### TAB 1: General

**14.9.1 Panel "Menu"**: `SelectControl` (WP menu picker) → `ref`.

**14.9.2 Panels "Burger Menu" (bar) and "List layout" (Design tab):** Show the burger (bar-only): `ToggleGroupControl` Always | Tablet | Mobile | Custom → `collapsePoint`; Item gap → `gap`; Columns (drawer only) → `listColumns`; Padding → `padding`.

**14.9.3 Panel "Menu Button"** (bar-only; `plugins/sgs-blocks/src/blocks/nav-bar-menu/BurgerPanel.js`): Icon (`IconPicker`, FR-41-30a) → `triggerIcon`; Show as (`ResponsiveOverride` + `ToggleGroupControl` **Icon | Text | Both**) → `triggerMode`; Icon position → `triggerIconPosition`; Label (`TextControl`) → `triggerLabel`; Size → `burgerSize`; Magnetic pull and its distance / strength (FR-41-31) → `triggerMagnet*`. ⛔ The third option is LABELLED "Both" and STORED as `icon-and-text` (FR-41-12), identically in `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js`.

**14.9.4 Submenu behaviour** (bar-only, in "Menu panel"): Panel this burger opens → `drawerRef`; Open from → `submenuAlign`; Show expand arrow → `submenuCaret`; Close delay → `submenuCloseGrace`.

**14.9.5 Panel "Accessibility"** (both blocks; FR-41-27): Navigation label → `navLabel`; Keep text readable automatically → `itemSmartContrast` (FR-41-5). **14.9.5a Device visibility** comes from the universal extension (§14.1.2).

#### TAB 2: Design

**14.9.6 Panel "Colour"**: ONE `SgsColourPanel` per block (`plugins/sgs-blocks/src/blocks/nav-bar-menu/edit.js::Edit` `colourRows`; `plugins/sgs-blocks/src/blocks/nav-drawer-menu/edit.js::Edit`'s trimmed `colourRows`), grouped by FR-41-16 headings, each treatment selector directly beneath its Hover swatch.

| Grouping | Row | States | Attributes | Hover treatment |
|---|---|---|---|---|
| **Menu** | Nav background | Normal, Hover | `navBg` / `navBgHover` (+ `navBgGradient`) | none |
| | Nav text | Normal, Hover | `navColour` / `navColourHover` (+ `navColourGradient`) | none |
| | Item text | Normal, Hover, **Current** | `itemColour*` (+ `itemColourGradient`; `itemColourHoverGradient` while `itemSmartContrast` is off) | None / Swap / **Sweep** (`itemColourHoverTreatment`) |
| | Item background | Normal, Hover, **Current** (Current omitted under Highlight) | `itemBg*` (+ the three gradients) | None / Swap / **Highlight** (`itemBgHoverTreatment`) |
| | Item border colour ("Item underline colour" on the bar) | Normal, Hover, **Current** | `itemBorderColour*` | None / Swap / **Sweep** (`itemBorderHoverTreatment`) |
| | Sweep angle (only under Sweep) | n/a | `sweepAngle` | n/a |
| **Submenu** | Panel background | Normal only | `submenuBg` (+ `submenuBgGradient`) | none |
| | Panel border colour | Normal only | `submenuBorderColour` (+ `submenuBorderColourGradient`) | none |
| | Link text | Normal, Hover, **Current** | `submenuColour*` (+ `submenuColourGradient`) | None / Swap / **Sweep** (`submenuColourHoverTreatment`) |
| | Link background | Normal, Hover, **Current** | `submenuLinkBg*` (+ `submenuLinkBgGradient`) | None / **Swap only** |
| | Sublink marker colour (drawer-only) | Normal, Hover, **Current** (once `sublinkMarkerIcon` is non-default) | `sublinkMarkerColour*` (+ 3 gradients) | none |
| **Menu button** (bar-only) | Icon colour | Normal, Hover | `burgerColour` / `burgerColourHover` (+ `burgerColourGradient`) | None / Swap / **Sweep** (`burgerColourHoverTreatment`) |
| | Button background | Normal, Hover | `burgerBg` / `burgerHoverColour` (+ `burgerBgGradient`) | None / **Swap only** |

Sweep segments follow FR-41-26 eligibility. Both border-colour rows carry `contrastAgainst` with `contrastLargeText: true` (WCAG 1.4.11, 3:1). There is no Indicator panel (FR-41-25); Featured and Mega Menu colours are not in this panel.

ⓘ **Note beneath the Item text and Item background rows (FR-41-5 / FR-41-27):** "Automatic readable-text checking for these colours is switched on under General → Accessibility." Gated: §14.11 G16.

ⓘ **Note beneath the Item border colour row's treatment selector (FR-41-6), twin of the §14.9.10 note:** "This changes the line around the item. To underline the menu word itself instead, use Decoration (hover) under Typography — they're separate settings and don't do the same thing." Gated: §14.11 G19(e).

**14.9.7 Panel "Menu item"**: the labelled **Border** control, `SgsBorderControl` with `showColour={ false }` (FR-41-33): per-side width (base only), style (the shared `BorderStyleControl` sibling, FR-41-2b) and radius (`showRadiusResponsive={ false }`) → `itemBorderWidth` / `itemBorderStyle` / `itemBorderRadius`. Identical in bar and drawer (FR-41-28).

**14.9.7a Panels "Item separators" (bar), "Row separators" (drawer), "Submenu row separators" (both)** (FR-41-37): one `SgsSeparatorControl` each (`plugins/sgs-blocks/src/shared/nav-menu-panels/SeparatorsPanel.js`) → `separators` / `submenuSeparators`: per-device Thickness, one Line colour and style swatch (Normal / Hover tabs, Solid / Dashed / Dotted), **Outer lines** on the drawer's top-level panel, **Line on hover** (None / Swap / Sweep) on the top-level panels.

**14.9.8 Panel "Submenu — Items"** (drawer-only): the links inside the drawer's submenu. Marker icon (FR-41-30b) → `sublinkMarkerIcon`; typography is the Typography panel's "Submenu" target; link padding → `submenuLinkPadding` (`submenuPadding` belongs to the panel).

**14.9.9 Panel "Submenu — Container"** (a `ToolsPanel`; bar-only rows marked): Open animation (bar, FR-41-10) → `submenuAnimation`; Distance below the bar (bar) → `submenuTopOffset`; Minimum width (bar) → `submenuMinWidth`; Inner spacing → `submenuPadding`; Border (`SgsBorderControl` with `showColour={ false }`, width + style, + radius on the bar) → `submenuBorderWidth` / `submenuBorderStyle` / `submenuBorderRadius`; Box shadow (bar; `ShadowControl` with `attrNames={ shadowAttrKeys( 'submenuShadow' ) }`, PHP twin `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_shadow_attr_map`) → `submenuShadow` + `submenuShadowColour`. The panel is single-state throughout (FR-41-9). ⚠ Shadow colour stays inside `ShadowControl`, not the Colour panel (nothing to compare against). Shadow is gradient-exempt by mechanism.

**14.9.10 Panel "Typography"**: the Menu / Submenu `targets` switcher (FR-41-22); on the bar a third **Menu button** target (font family, transform, letter spacing) appears when `triggerMode` is not `icon`. Each target carries `TypographyControls`' standard set (font size and letter spacing as tier objects, §14.8.4a) plus, with `showHover: true`, the **Decoration (hover) / Transform (hover) / Weight (hover)** trio in one `<Flex>` row → `{prefix}TextDecorationHover` / `...TextTransformHover` / `...FontWeightHover` (⛔ never hand-rolled). `showTextIndent` is `false`. The trio is an **optional secondary decoration**, never the non-colour hover signal or the divider (FR-41-6).

ⓘ **Note beneath the hover trio row (FR-41-6), twin of the §14.9.6 note:** "These change how the menu word itself looks on hover. For a line across the whole item, use the item border's hover setting in the Colour panel instead."

Binding help text (adjust rhythm, never the distinction; never names WCAG, "contrast ratio", "AA", "signal" or "divider"):

| Control | Help text (verbatim) |
|---|---|
| **Decoration (hover)** | "Underlines the menu word itself on hover — not a full-width line. For a line under the whole item, use the border's hover setting in the Colour panel instead." |
| **Weight (hover)** | "Makes the word bolder when you point at it. Bolder text is a little wider, so the items to its right will shift across slightly as you move along the menu." |

Menu target only, at the bottom: **Current-page weight** (FR-41-29) → `itemFontWeightCurrent`, help text saying it keeps the menu usable for someone who cannot tell two colours apart.

**14.9.11 Panel "Effects"**: `itemMagnetEnabled` ("Magnetic hover pull"). **14.9.12 Panel "Featured"** and **14.9.13 Panel "Mega menu (drawer)"**: out of scope (§14.1.2).

### 14.10 WCAG contrast, follow-ups and comment hygiene

#### FR-41-17 — The warn-only contrast check applies to every row

`contrastAgainst` / `contrastLabel` feed the live check in `plugins/sgs-blocks/src/components/GradientCapableColourControl.js`: it warns, never blocks or alters a colour, and does not run on a non-`gradientCapable` row. Item text contrasts against `itemBg` / `itemBgHover` / `itemBgCurrent`; submenu link text against `submenuLinkBg`, else `submenuBg`. The border-colour rows set `contrastLargeText: true` explicitly on the descriptor (WCAG 1.4.11, 3:1). ⛔ It checks a foreground against its background, never two states against each other (FR-41-17a).

#### FR-41-17a — Residual, accepted risk: colour-only state signals

Four accepted, named cases:
- **(a) No border, no Hover signal.** `itemBorderWidth` defaults to `{}`, so an untouched block ships no non-colour Hover signal (Current keeps its `"600"` weight). An unrequested underline on every install is an owner-rejected imposition. `itemTextDecorationHover` does NOT close this case.
- **(b) Switched off.** Similar Hover and Current colours, no border width and a cleared `itemFontWeightCurrent` leave the states colour-only, with no inspector warning.
- **(c) A `color-mix`-less browser under burger Sweep.** The static `@supports not (background-color: color-mix(...))` fallback in `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css` is clipped to the glyphs during a Sweep (cosmetic). ⛔ Do not delete the fallback.
- **(d) The Sweep fallback with an empty Hover swatch** (FR-41-26): no hover change on that property; closed by one swatch entry.

The fix, if ever taken, is a new warn-only state-vs-state similarity check, not FR-41-17 with a wider input. ⛔ Never close these by removing the operator's ability to switch signals off or by re-defaulting `itemBorderWidth`.

#### FR-41-18 — "Auto-adjust for readability": a SEPARATE, EXPLICITLY NON-BLOCKING follow-up

**Status: NOT BUILT** (§14.0a.3). ⛔ Blocks no other requirement. An optional per-row toggle `{attrName}AutoAdjust` (boolean, `false`), only on rows that supply `contrastAgainst`, placed inside the row's popover, nudging the pick toward the nearest AA-safe value and never past it; the original pick is stored and adjusted at render so the toggle is reversible. Help text: "Automatically brightens or darkens your chosen colour just enough to stay easy to read against the background behind it. Your original colour is kept — switch this off to go back to it."

#### FR-41-19 — Code comments state what the code does

The `supports.sgs.elements.item._note` and `...sublink._note` in the two nav `block.json` files state the current-page mechanism; the `sublink._note` states that `"prefix": ""` stands and that `submenu`-prefixed typography reaches the element through explicit `attrMap` entries (§14.8.6b / FR-41-22). The citation there is `FR-35-5`. ⛔ No retirement narration in active comments.

#### FR-41-20 — Ancestor Current styling is built in CSS; there is no ARIA active-trail

**Built.** When a descendant submenu link is the current page, its top-level ancestor renders the item's own Current declarations, emitted by `sgs_nav_shared_item_state_css`: `.{bem_root}__submenu-root:is(:has(ul.{bem_root}__submenu a[aria-current="page"]), [data-sgs-nav-has-current]) > .{bem_root}__link:not(:hover):not(:focus-visible)` on the bar and the `.{bem_root}__accordion-row:has(...)` equivalent on the drawer. The trailing `:not(:hover):not(:focus-visible)` lets hover win. The bar-only `[data-sgs-nav-has-current]` fallback exists because `plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js` moves an open panel to `<body>`, breaking the `:has()` descent.

**Not built: the ARIA active-trail.** `markCurrentPage` marks only an exact path match, so assistive technology gets no ancestor signal. Building it would need a per-item ancestor-path list at render time plus a client-side prefix match stamping a distinct signal (not `aria-current="page"`). Out of scope here.

### 14.10a Typography

#### FR-41-21 — The `showHover` trio has no shared PHP emitter, so these blocks emit it themselves

**BUILT, block-private.** `TypographyControls` renders the trio when `showHover` is true, but `sgs_typography_css_rule()` (`plugins/sgs-blocks/includes/helpers-typography.php`) has no hover branch, and only these two blocks use `showHover`. ⛔ Do not extend the shared helper for this (§14.12). Without the emit, the six attributes are dead controls (`check-dead-controls.js`).

**The emit:** one `sgs_hover_state_rules()` call per prefix composing whichever of the three are set. ⛔ Each value is validated against the same allowlists the base path applies: `text-decoration` in `none / underline / line-through / overline`; `text-transform` in `none / uppercase / lowercase / capitalize`; `font-weight` stripped to `[a-z0-9]`. If the base allowlists change, this changes in the same commit. ⛔ A set but disallowed value emits NOTHING (never the base value).

**Where it lives:** `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php::sgs_nav_shared_typography_hover_rule` and identically `plugins/sgs-blocks/src/blocks/nav-drawer-menu/render.php::sgs_nav_shared_typography_hover_rule`, each inside a `function_exists()` guard, signature `( array $attributes, string $prefix, string $selector, string $sweep_hover_colour = '' )` (the fourth parameter carries FR-41-26's travelling underline). Its callers are `plugins/sgs-blocks/includes/nav-menu-css.php` (prefix `item`) and `plugins/sgs-blocks/includes/nav-menu-submenu-link-css.php` (prefix `submenu`), which call it at render time after `render.php` declared it. ⛔ Do not move the definition into either module.

#### FR-41-22 — Submenu typography: the Items panel is a Menu / Submenu switcher

Dropdown links get their own typography through `TypographyControls`' `targets` prop (pattern: `plugins/sgs-blocks/src/blocks/card-grid/edit.js::Edit`): targets `item` ("Menu") and `submenu` ("Submenu"), plus the bar's **Menu button** target when `triggerMode` is not `icon`. ⛔ In `targets` mode every field flag (including **`showHover: true`** and `showTextIndent: false`) lives on each target entry: `TypographyTargetSwitcher` discards outer `singleProps`, so an outer flag silently deletes the controls while every gate stays green.

**(a)** The full `submenu*` family is declared to match `typographyAttrKeys( 'submenu' )`, mirroring the item family's shapes exactly (`submenuFontSize` / `submenuLetterSpacing` as tier objects, `submenuLineHeight` a plain number like `itemLineHeight`), plus the three `submenu*Hover` companions (`""`). ⛔ Flag, attributes and render emit always land together.

**(b)** Render: `sgs_typography_css_rule( $attributes, 'submenu', $sublink_sel )` in `plugins/sgs-blocks/includes/nav-menu-submenu-link-css.php` beside the `item` call in `plugins/sgs-blocks/includes/nav-menu-css.php`, plus the block-private hover emit per prefix (FR-41-21).

**(c) FR-41-22c: an explicit `attrMap` entry on `sublink` per typography property** (it has `"prefix": ""`, so the `{prefix}Suffix` convention resolves nothing): base `css:font-family`, `css:font-size`, `css:font-weight`, `css:font-style`, `css:line-height`, `css:text-decoration`, `css:text-transform`, `css:letter-spacing`, `css:text-align` → the matching `submenu*` attribute, plus the three `states.hover` entries → `submenu*Hover` (§14.8.6(a)). ⛔ Never give `sublink` a `submenu` prefix instead.

### 14.10b The ungated-paint detector

#### FR-41-35 — The ungated-paint detector, built framework-wide

**Status: BUILT.** The enforcement for FR-41-15, scoped FRAMEWORK-WIDE (the method has nothing nav-specific).

**(a)** `plugins/sgs-blocks/scripts/check-ungated-paint-rules.py` asks "declaration exists → does a governing attribute exist?", the inverse of `check-hardcoded-render-defaults.js`, which it does not extend.

**(b) `--survey`** emits all three buckets (CENSUSED / GATED with the `if` named / DISMISSED with reason and return condition) for one block (`--block sgs/x`) or every block.

**(c) FR-41-35c: `--check`** exits non-zero on an ungated `background` or `border` declaration with no corresponding operator attribute, on both surfaces, failing closed only for `HARD_FAIL_BLOCKS` (`["sgs/nav-bar-menu", "sgs/nav-drawer-menu"]`); other blocks' findings print and pass. ⚠ Statement-aware, NOT variable-aware (`$sgs_nm_featured_vars` in `plugins/sgs-blocks/includes/nav-menu-item-border-featured-css.php` is a live instance); `--survey` prints this limit.

**(d) Exemptions** are GENERIC rules keyed on selector shape or `supports.sgs`, never a block name: resets, `:where()` defaults, forced-colors / `@supports` rules, wrapper-delegated blocks, and an attribute-driven `var()` whose writer is verified to exist in `src/`.

**(e) `--self-test`** runs the fixtures under `plugins/sgs-blocks/scripts/fixtures/ungated-paint/`: each `*-dirty` must fail, each `*-clean` report zero, and a `*-legit` / `*-trap` pair per exemption proves none over-matches.

**(f) Wiring:** `plugins/sgs-blocks/scripts/gates.json` id `check-ungated-paint-rules` (run by `run-gates.py`), alias `check:ungated-paint-rules`; prove reachability with `npm run gate:list`. **(g) Gate:** §14.11 G20c.

### 14.11 Acceptance

Live roster commands replace cached counts throughout.

| Gate | Condition |
|---|---|
| **G1: zero blast radius** | (a) Every other `SgsColourPanel` mount renders byte-identical inspector output (FR-41-16; diff at least three; roster `git grep -l "<SgsColourPanel" -- 'plugins/sgs-blocks/src/blocks/*/edit.js'`). (b) Every other `sgs_emit_state_colour_css()` call emits byte-identical CSS. (c) `sgs_fill_states_css()` / `sgs_text_states_css()` / `sgs_border_states_css()` are byte-identical for every caller without a `current` or `suppress_edges` key, ⛔ still emitting the flat `border-color` shorthand. (d) Every other `SgsBorderControl` mount is byte-identical with `showColour` defaulting `true` (`sgs/media` mounts it through the media-atom chain, so an `edit.js` grep under-counts). (e) Every `data-sgs-fx="magnet"` element keeps a byte-identical COMPUTED `transition` (⛔ assert the computed value, not the file text). |
| **G2: no bare `:hover`** | `plugins/sgs-blocks/scripts/hover-guard/check.js` passes. |
| **G3: no inline styling** | `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 (Spec 32 / FR-36-13). |
| **G4: DB state routing** | `/sgs-db` shows the Hover attributes at `css_state='hover'` and the Current ones at `css_state='current'`, and the twelve typography base/hover attributes (six per prefix) occupy twelve distinct `(css_property, css_element, css_state)` triples, `itemFontWeight`'s base row included. |
| **G5: no dead controls** | `npm run check:dead-controls`, `npm run check:empty-inspector-containers` and `python plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py` pass; every declared attribute has a writer and a reader. `git grep -nE "hoverStyle\|underlineColour\|underlineThickness\|underlineOffset\|itemRadius\|submenuRadius\|indicatorStyle\|indicatorColour\|borderHoverAnimation[^D]" -- plugins/sgs-blocks/src plugins/sgs-blocks/includes theme` returns only comment prose. |
| **G6: one line, not two** | Live: with a bottom border colour AND Sweep set, exactly one horizontal line paints and `getComputedStyle( link ).borderBottomColor` is `rgba(0, 0, 0, 0)` while the `::after` band paints (FR-41-8). |
| **G7: live verification (R-31-11, R-31-13)** | Playwright, both blocks: the parent keeps its hover paint while the pointer moves into its dropdown (bar and drawer) and while focus is inside it; with a non-zero `submenuTopOffset` the paint never drops across the gap; Current paints; bar and drawer borders are independent. Plus Bean's eye. |
| **G8: touch** | Under touch emulation a tapped item is not stuck in its hover colour and no sweep strands half-finished. |
| **G9: reduced motion** | Under `reduce` the sweep and submenu animation land on their end state with no travel and the submenu still opens. Magnet on: `transitionDuration` is the killed value, `transform` is `none`, the winning `transition-duration` is the `!important` burger rule in `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css`, and the FR-41-31 companion carries no `!important`. |
| **G10: non-colour signal renders** | (a) With a bottom `itemBorderWidth` and only `itemBorderColourHover` set, hovering changes the computed `border-bottom-color` (never assert on a border-less menu). (b) The current item renders at the declared weight, proven by a rendered difference (width delta or `document.fonts.check`), not `getComputedStyle` alone. |
| **G11: no `underline` element** | After `/sgs-update`, zero `css_element='underline'` rows for either nav block (§14.8.6f). |
| **G12: manifest conformance** | `npm run audit:element-manifest` passes; `python plugins/sgs-blocks/scripts/placement-reach.py --block sgs/nav-bar-menu` (and the drawer) reports no new CONTESTED attributes; every attribute named in `supports.sgs.sweepEligibility` resolves in that block's `attributes` and every row key is a declared `...HoverTreatment` (§14.8.6g). |
| **G13: hover-treatment defaults** | Every `{row}HoverTreatment` defaults to `"swap"`; Highlight paints the pill in `itemBgHover`; with `itemBg` set and the radius untouched the computed `borderRadius` is `8px` per corner, and an item with no background emits no `border-radius` rule. |
| **G14: sweep interactions** | Live: text Sweep + item background + border Sweep together paint three non-fighting layers (glyphs, `::before`, `::after`). Eligibility negative controls: `submenuLinkBg`, `burgerBg`, `triggerMode='icon'` and `itemColourGradient` each leave two segments. **(e)** Sweep + `itemTextDecorationHover='underline'`: on hover `textDecorationColor` equals the Hover colour (item and sublink), and does not fire when the treatment resolves to `'swap'`. **(f) The emitter re-checks the predicate:** store a Sweep, then set a blocking attribute (`submenuLinkBg`, `submenuLinkBgHover`, `burgerBg`, `burgerHoverColour`, `triggerMode` back to `'icon'`) without touching the treatment; the rendered CSS carries no `background-clip` / `-webkit-text-fill-color` and the stored value is still `'sweep'`. **(g) The two surfaces agree:** on one stored state straddling the boundary, the editor shows two segments AND the CSS carries no clip declarations; then the converse. |
| **G15: icon defaults** | With `triggerIcon` / `sublinkMarkerIcon` unset, the rendered SVG is Lucide `menu` / `chevron-right` (FR-41-30). |
| **G16: the readability toggle works** | Live: it renders in General → Accessibility, writes only `itemSmartContrast`, OFF→ON changes the rendered text colour on an item with a Hover background, and the §14.9.6 note renders. |
| **G17: magnet default costs zero bytes** | Off: no `data-sgs-fx` attribute and no magnet asset enqueued. On: attribute present, module enqueued, the companion `transition` wins. |
| **G18: one writer per border-colour attribute** | `node plugins/sgs-blocks/scripts/check-duplicate-controls.js` passes, and in the live editor `SgsBorderControl` under `showColour={ false }` renders no swatch on either mount. Border style renders on both mounts, Dashed writes `"dashed"` to `itemBorderStyle` / `submenuBorderStyle` only (deselect writes `""`), and the rendered CSS and `getComputedStyle` carry `border-style:dashed`. |
| **G19: the hover trio** | (a) six controls render, each writing only its own attribute; (b) `itemTextDecorationHover: "underline"` underlines on hover only (repeat on a sublink with `submenuFontWeightHover`); (c) all unset emits no hover typography declaration; (d) an off-allowlist `itemTextTransformHover` emits nothing; (e) both cross-reference notes render, each naming the other, with no "WCAG", "contrast", "AA", "signal" or "divider". |
| **G20: font-size tiers persist and render** | Per prefix: a Tablet then Mobile size survives an editor reload stored INSIDE the tier object (no `itemFontSizeTablet` on the post); the CSS carries per-breakpoint `font-size` and the computed size differs across widths; with all tiers unset no `@media` font-size rule emits. |
| **G20c: the ungated-paint detector is real** | FR-41-35: `--check` exits 0 on the tree; `--self-test` passes with dirty fixtures failing and clean ones passing; `npm run gate:list` shows the gate; `--survey` covers every block and the script holds no nav-block string literal outside fixtures; `--survey` prints its variable-awareness limit; a planted ungated rule fails in a nav block and only prints in any other block. |

### 14.12 Open questions

Recorded, not resolved:

1. **`sgs_typography_css_rule()` has no hover branch.** Extend it to own the trio the day a SECOND block wants `showHover` (FR-41-21).
2. **The hover-treatment selector (FR-41-23/24) is block-private.** Promote it to a `plugins/sgs-blocks/src/components/primitives` export when a SECOND block wants it.
3. **`SgsColourPanel.js`'s border-colour exemption has one block-scoped exception** (FR-41-33). A second taker re-opens the exemption list.
4. **The default Hover signal needs a border width** (FR-41-17a(a)). If border-less menus with similar state colours become common, add a warn-only notice (an owner call).
5. **Active-trail semantics** (FR-41-20): not built.
