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
  without changing padding. Stored flat values were folded into the tier shape by
  `plugins/sgs-blocks/scripts/migrate-nav-gap-tier.php`, which every site runs before it takes the deploy.
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
**Status:** BUILT: `plugins/sgs-blocks/src/blocks/social-icons/block.json::attributes.hiddenLinks`, `sgs/icon` children bound to Site Info (the block allows only `sgs/icon`), brand glyphs from `plugins/sgs-blocks/includes/data/brand-registry.json`, and `rel` set on external links by `plugins/sgs-blocks/src/blocks/icon/render.php`. Not built (NICE): explicit Follow-versus-Share components and optional `rel="me"`.
**Spec maturity: `OUTLINE`** — see the §4 index.

**Built in** icon plan Phase B (`.claude/plans/2026-10-08-icon-unification-and-spacing-control.md`).
`sgs/social-icons` is a thin wrapper (`allowedBlocks: ["sgs/icon"]`) whose children are real `sgs/icon` blocks,
each with `metadata.bindings.linkUrl = { source: "sgs/site-info", args: { key } }` and the brand registry glyph
(`includes/data/brand-registry.json`). The bindings name Site Info keys, never a client's URL, so the same row
works for every client: a key left empty hides its icon for visitors, and the editor shows it dimmed with a
notice. A new row starts with one bound icon per filled Site Info key, in registry order (phone, email, address,
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
**Status:** BUILT: every attribute in the table below is declared in `plugins/sgs-blocks/src/blocks/icon-list/block.json::attributes` (`heading`, `headingLevel`, `source`, `menuRef`, `markerType`, `numberFormat`, `renderLandmark`); the live three-type render verification was not re-run in this pass.
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
**Status:** PARTLY BUILT: `aria-current` is stamped client-side (`plugins/sgs-blocks/src/blocks/nav-bar-menu/view.js::markCurrentPage`, the same in `plugins/sgs-blocks/src/blocks/nav-drawer-menu/view.js::markCurrentPage`); `forced-colors` rules sit in `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css` and `plugins/sgs-blocks/src/blocks/nav-drawer/style.css`, and the `prefers-contrast` baseline in `plugins/sgs-blocks/assets/css/contrast.css`; the skip link is WordPress core's `#wp-skip-link`, styled in `theme/sgs-theme/assets/css/utilities.css`. Not confirmed: the `nav-drawer-menu` and `mega-panel` stylesheets carry no `forced-colors` rule of their own, and contrast, focus and target sizes were not re-measured on a live page in this pass.
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
**Status:** PARTLY BUILT: the sweeps exist (`plugins/sgs-blocks/scripts/nav-qa/axe-run.mjs`, `plugins/sgs-blocks/scripts/nav-qa/elementfrompoint-sweep.mjs`, `plugins/sgs-blocks/scripts/nav-qa/crawl-assert.mjs`, `plugins/sgs-blocks/scripts/nav-qa/probes.mamas.json`) and the CPT-drawer parity gate passed on 2026-09-20 (`.claude/reports/2026-09-20-w2-gate2-rerun.md`; visual fidelity not claimed). Not built: a script for the late-CSS A/B (no stylesheet-blocking run under `plugins/sgs-blocks/scripts/nav-qa`); no Indus mega-region gate report was found under `.claude/reports`; the owner's eye remains the closing check.
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
**Status:** PARTLY BUILT: semantic `<nav>` roots with computed labels (`plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php`, `plugins/sgs-blocks/src/blocks/nav-drawer-menu/render.php`) and `BreadcrumbList` JSON-LD (`plugins/sgs-blocks/src/blocks/breadcrumbs/render.php`) are built. Not built: `SiteNavigationElement` JSON-LD and the AI-built navigation from a sitemap (Phase 3, no code). Server-rendered mega content, no AJAX and the performance budget were not re-measured in this pass.
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

⛔ **FR IDs and section numbers in this Part are stable citations.** Every `FR-41-N` ID is cited from code, the framework DB and other specs and is never renumbered; new requirements take the next free number, and gaps are intentional. Code cites the sections below as `Spec 36 §14.x` (the numbering inside this Part mirrors the nav colour-state system's own outline: `§14.9.6` is the Colour panel layout, `§14.1.3` the three states). Spec 36 keeps the nav requirements (FR-36-4's "distinct hover+focus states", FR-36-11's WCAG floor); this Part owns the mechanism (FR-36-28 is the pointer here).

Companions: Spec 35 (PART O control-type contract), Spec 35A (Part L control completeness), Spec 32 (no inline `style=` property declarations; scoped `<style>` only).

### 14.0 One-liner and plain English

`sgs/nav-bar-menu` and `sgs/nav-drawer-menu` carry a complete, client-editable control surface: **three colour states (Normal, Hover, Current) on every colour that has states**, all side by side in ONE Colour panel (border colour included), each Hover swatch paired with a **hover-treatment selector** that changes *how* that one colour is applied rather than adding a second colour; a **3-state per-side item border**; a **submenu split** (the floating panel and the links inside it are separately controllable, in colour and in typography); **submenu open animation and top offset**; a **menu button** that can be an icon, text or both, with an operator-chosen icon and an optional magnetic pull; and three correctness fixes that need no control. There is no hover "style" chooser: every hover look is a direct control. None of it changes a control on any other block, because it needs no new shared component.

⛔ **THE COLOUR-REUSE RULE (owner-locked, binding on every row).** One colour picker per element property. The hover-treatment selector NEVER introduces a second colour value; it changes HOW the existing Hover swatch's value is applied. `Swap` applies it instantly, `Sweep` travels it across the element, `Highlight` paints it into the shared sliding pill. All three read the SAME swatch. A treatment that needed its own colour attribute would be a second control for one property, the exact pattern FR-41-7 and FR-41-23 prevent.

### 14.0a Build status

Requirement-level status is BUILT unless named in §14.0a.3. Do not cache a step count or percentage here; each FR's status is recorded in this section (§14.0a.2 and §14.0a.3) and on the FR's own `Status:` line, and `.claude/LEDGER.md` holds only short notes on work in progress.

#### 14.0a.1 The CSS is emitted by a set of PHP files, not by `render.php` alone

Verify the roster live: `git ls-files plugins/sgs-blocks/includes | grep nav-menu`. Both blocks `require_once` the shared `plugins/sgs-blocks/includes/nav-menu-*.php` files PER INSTANCE from their own `render.php` (not bootstrap-loaded; the `sgs/product-card` `plugins/sgs-blocks/includes/product-card-builtin-render.php` precedent). A future cross-block caller must require the file itself.

| File | Owns |
|---|---|
| `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php` | entry, `SGS_Nav_Menu_Bar_Renderer`, treatment-resolution call, indicator/magnet `data-` flags, `<style>` assembly, `sgs_nav_shared_typography_hover_rule()` (FR-41-21; declared identically in `plugins/sgs-blocks/src/blocks/nav-drawer-menu/render.php`) |
| `plugins/sgs-blocks/src/blocks/nav-drawer-menu/render.php` | entry, `SGS_Nav_Drawer_Menu_Flattener` (the drawer's own copy of the flatten methods), the same typography helper |
| `plugins/sgs-blocks/includes/class-sgs-nav-menu-source.php` | `SGS_Nav_Menu_Source`: resolves the site's menu for both blocks |
| `plugins/sgs-blocks/includes/nav-menu-markup.php` | `sgs_nav_bar_menu_render_items()`, `sgs_nav_drawer_menu_render_items()`, `sgs_nav_bar_menu_burger_toggle_markup()`, `sgs_nav_shared_badge_html()` |
| `plugins/sgs-blocks/includes/nav-menu-css.php` | `sgs_nav_shared_item_state_css()`: item typography, nav-container colour, the item text/background three-state emission with paired treatments, the FR-41-13 persistence rules |
| `plugins/sgs-blocks/includes/nav-menu-item-border-featured-css.php` | `sgs_nav_shared_item_border_css()` (item border states and the directional border-sweep band, then the lines between items); `sgs_nav_shared_featured_css()` |
| `plugins/sgs-blocks/includes/nav-menu-separators.php` | `sgs_nav_menu_separators_css()`, `sgs_nav_menu_separators_root()` (FR-41-37) |
| `plugins/sgs-blocks/includes/nav-menu-treatments.php` | `sgs_nav_shared_sweep_eligible()`, `sgs_nav_shared_resolved_treatments()`, `sgs_nav_shared_text_sweep_css()`, `sgs_nav_shared_icon_markup()` |
| `plugins/sgs-blocks/includes/nav-menu-trigger-css.php` | `sgs_nav_bar_menu_trigger_css()`: the Menu Button's colour, glyph sweep, background and size rule (bar-only) |
| `plugins/sgs-blocks/includes/nav-menu-submenu-css.php` | `sgs_nav_shared_submenu_css()`: collapse-point switch, dropdown/mega positioning and the FR-41-11 bridge, the submenu link's base typography/text states, custom CSS |
| `plugins/sgs-blocks/includes/nav-menu-submenu-link-css.php` | `sgs_nav_shared_submenu_link_css()`: the submenu link's hoverable background/border/typography-hover, the drawer overrides, `listColumns` grid, the sliding indicator, the root box |
| `plugins/sgs-blocks/includes/sweep-css.php` | `sgs_directional_sweep_css()`: the angle-driven sweep primitive (FR-41-38) |

The inspector is split the same way. Panels shared by both blocks live in `plugins/sgs-blocks/src/shared/nav-menu-panels/` (`ItemsPanel.js`, `SubmenuItemsPanel.js`, `TypographyPanel.js`, `DropdownStylePanel.js`, `ColourRowExtras.js`, `ColourTreatment.js`, `EffectsPanel.js`, `FeaturedPanel.js`, `ListLayoutPanel.js`, `MegaDrawerPanel.js`, `SeparatorsPanel.js`); bar-only panels sit in `plugins/sgs-blocks/src/blocks/nav-bar-menu/` (`BurgerPanel.js`, `BarColourRowExtras.js`). ⛔ `colourRows` STAYS in each block's `edit.js`: `plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js` resolves a row's state count only from a shape it can see in that file or in `plugins/sgs-blocks/src/components/`.

#### 14.0a.2 BUILT pointers

Every requirement in this Part is built except those in §14.0a.3. Pointers:

- FR-41-8's additive `suppress_edges` is live at `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_border_states_css`.
- `itemSmartContrast` is declared in both blocks and mounted in each block's General-tab **Accessibility** panel (`plugins/sgs-blocks/src/blocks/nav-bar-menu/DropdownSettingsPanel.js`, `plugins/sgs-blocks/src/blocks/nav-drawer-menu/DropdownSettingsPanel.js`): FR-41-5 / FR-41-27.
- FR-41-12 is built on both sides: the Menu Button and the `sgs/nav-drawer` close mirror.
- FR-41-26's declarative source is `supports.sgs.sweepEligibility` in `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json` and `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json`, with mechanical readers.
- FR-41-13 is four rules (mouse and keyboard halves, bar and drawer) in `plugins/sgs-blocks/includes/nav-menu-css.php::sgs_nav_shared_item_state_css`.
- FR-41-15's no-ungated-paint rule holds and FR-41-35's detector runs in hard-fail mode: `HARD_FAIL_BLOCKS` in `plugins/sgs-blocks/scripts/check-ungated-paint-rules.py` lists `["sgs/nav-bar-menu", "sgs/nav-drawer-menu"]`.
- The **sublink marker colour row** (FR-41-30b) is built end to end and is DRAWER-only: `sublinkMarkerColour`, `sublinkMarkerColourHover`, `sublinkMarkerColourCurrent` and their `*Gradient` counterparts are declared, wired to `css:fill` / `css:fill-gradient` under the `sublinkMarkerIcon`-keyed conditional, mapped in the colour-row config and read in `plugins/sgs-blocks/src/blocks/nav-drawer-menu/render.php`.

#### 14.0a.3 NOT BUILT or PARTIAL

| Status | Requirement | Proof |
|---|---|---|
| NOT BUILT | **FR-41-18**: auto-adjust for readability (explicitly non-blocking) | `git grep -n -i "auto-adjust\|autoAdjust" -- plugins/sgs-blocks/src/blocks/nav-bar-menu plugins/sgs-blocks/src/blocks/nav-drawer-menu` returns nothing |
| PARTIAL | **FR-41-20**: active-trail. The visual ancestor Current styling is built in CSS; the ARIA/semantic trail is not built (out of scope by design) | `git grep -n "data-sgs-nav-has-current" -- plugins/sgs-blocks/includes plugins/sgs-blocks/src` shows the CSS ancestor rule and its bar fallback |
| PARTIAL | **FR-41-36**: default colour scheme. Item-border, submenu-row, drawer-panel and Current-weight defaults are declared; the item Hover/Current background defaults are unset, and the item Hover text default-closes in PHP | the defaults FR-41-36's table lists are in the two `block.json` files (`itemBorderColour`, `submenuLinkBg`, `submenuLinkBgHover`, `itemFontWeightCurrent`) |

### 14.1 Scope

#### 14.1.1 In scope

The `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` inspectors, `block.json` manifests and rendered CSS; **three** additive backwards-compatible shared extensions (`SgsColourPanel` row sub-headings, FR-41-16; `SgsBorderControl`'s `showColour` prop, FR-41-33; an optional third state on `sgs_emit_state_colour_css()` / `sgs_fill_decls()` / `sgs_text_decls()`, FR-41-3); one CSS rule and one trio of `data-` attributes reusing the existing `fx-magnet` runtime plus a two-line value-preserving addition to `plugins/sgs-blocks/assets/css/fx-magnet.css` exposing `--sgs-magnet-transition` (FR-41-31). One cross-block companion lands on `sgs/nav-drawer` (FR-41-12). All three shared extensions and the shared-stylesheet addition are design-gated and each is the minimum shape that does the job: every existing caller renders byte-identically by default (§14.11 G1).

#### 14.1.2 Out of scope (named so nobody re-opens them)

| Not in scope | Why |
|---|---|
| The **featured item-flag** mechanism (`featuredColour`, `featuredBg`, `featuredColourHover`, `featuredBgHover` and gradient siblings) | A separate working per-item flag with its own WCAG-contrast resolution (FR-36-4). The featured link's `::after` is not suppressed, so the item-border Sweep band (FR-41-8) renders on featured items too. |
| **Mega menu** | Owned by the mega-menu builder (FR-36-5). |
| **Sticky / scrolled** colour states | Owner-rejected: it doubles the control count for a state the header (Spec 37) already owns via its own `scrolled` state. |
| A **device-visibility** panel | `blocks/extensions/responsive-visibility.js` and `conditional-visibility.js` attach to every `sgs/*` block; both nav blocks list only `clickEffects`, `parallax`, `spacing` in `supports.sgs.hideExtensions`. No second visibility surface. |
| A **fourth colour state** | Exactly three everywhere: Normal, Hover, Current. |
| **ARIA active-trail** | Not built (FR-41-20); the visual ancestor Current styling is. |
| A **hover trio on the CURRENT state** (`itemTextDecorationCurrent`, any `...TransformCurrent` / `...WeightCurrent` beyond `itemFontWeightCurrent`) | Not offered: `TypographyControls` models resting + hover only, and Current already carries its own non-colour signal (`itemFontWeightCurrent`, FR-41-6). |
| **`itemBorderColourGradient`** (gradient ring on the ITEM border) | Cut on a pseudo-element budget: `sgs_border_states_css()`'s ring path needs `::before`, which the item link already uses for the item background (FR-41-7). The submenu PANEL border keeps `submenuBorderColourGradient` because nothing competes for the panel's own `::before`. |
| **Cursor-reactive field** (and the other eight `motionSurface` effects) | Eligible, deliberately not offered (FR-41-32). |

#### 14.1.3 The three states: definition and vocabulary

| State | Means | Selector | Set by |
|---|---|---|---|
| **Normal** | Resting | the base selector | none |
| **Hover** | Pointer over it, or keyboard-focused | `:hover` (touch-guarded) + `:focus-visible` (never guarded) | pointer / keyboard |
| **Current** | This is the page you are on | `[aria-current="page"]` | `markCurrentPage`, an independent copy in each of `plugins/sgs-blocks/src/blocks/nav-bar-menu/view.js` and `plugins/sgs-blocks/src/blocks/nav-drawer-menu/view.js` |

⛔ The third state is named `current`, the framework's own vocabulary: `plugins/sgs-blocks/scripts/consistency/golden-controls.json::_meta.stateVocabulary.real` declares three real states (`hover`, `current`, `scrolled`), and its `current` entry (`[aria-selected="true"], [aria-current], .is-active`) unifies tabs and nav. Every attribute, row-descriptor state key, PHP variable, `css_state` value and sentence uses `current`, never `Active` or `selected`.

⛔ REUSE the existing `aria-current` mechanism. `markCurrentPage` in each `view.js` is wired only to its own block's root, normalises `window.location.pathname`, stamps `aria-current="page"` on both the item link and the sublink (`.sgs-nav-bar-menu__link[data-sgs-nav-path]` / `__sublink[data-sgs-nav-path]`; the drawer equivalents), and re-runs on bfcache `pageshow`. It is client-side because LiteSpeed would otherwise serve one page's answer everywhere (FR-36-11).

#### 14.1.4 Colour-architecture research

The research file `~/.claude/memory/research/2026-09-10-nav-drawer-colour-architecture-industry-standard.md` recommends an MD3-style derived state layer (hover = content colour at 8% over the background). This Part does not adopt it: the operator gets three explicit authorable colours per row plus the warn-only contrast check (FR-41-17), the shadcn-style "paired tokens authored together" shape. Its other findings (the `<details>` roving-nav gap; the 1.4.11 hover-background exemption not rescuing text-colour failures) remain live reading.

### 14.2 The shared-mechanism strategy

#### FR-41-1 — Every stateful control targets the LINK. Nothing targets the `<li>`.

The single load-bearing architectural decision. `markCurrentPage` stamps `aria-current="page"` on the item link and sublink (the anchors), never on the `<li>` and never on a drawer ancestor, so a Current rule keyed on the `<li>` matches nothing. **Text colour, background, border and the hover animation all apply to the link element**, the padded, full-height, focusable target in both the bar and the drawer's vertical list. Consequences: `:has()` is needed nowhere for the Current state; `:focus-visible` binds correctly by construction; specificity is uniform across all three states, which makes the source-order rule (FR-41-3) one rule. A border spanning the `<li>`'s margin box beyond the link is not wanted.

DOM shape (two separate blocks, each calling its own emitter in `plugins/sgs-blocks/includes/nav-menu-markup.php`):

| Block | Emitted by | Structure |
|---|---|---|
| `sgs/nav-bar-menu` | `sgs_nav_bar_menu_render_items` | `li.sgs-nav-bar-menu__item--has-submenu` › `div.sgs-nav-bar-menu__submenu-root` › **`.sgs-nav-bar-menu__link`** (an `<a>` with a sibling `button.sgs-nav-bar-menu__subtoggle`, or a `<button>` carrying both classes) + `div.sgs-nav-bar-menu__submenu-wrap` › `ul.sgs-nav-bar-menu__submenu` › `li.sgs-nav-bar-menu__subitem` › `a.sgs-nav-bar-menu__sublink` |
| `sgs/nav-drawer-menu` | `sgs_nav_drawer_menu_render_items` | `li.sgs-nav-drawer-menu__item--has-submenu` › `div.sgs-nav-drawer-menu__accordion-row` › **`.sgs-nav-drawer-menu__link`** (an `<a>`, or `<span class="...__link ...__link--label">` when the parent has no URL) + `details.sgs-nav-drawer-menu__accordion` › `summary.sgs-nav-drawer-menu__accordion-summary` + `ul.sgs-nav-drawer-menu__submenu[data-sgs-drill-panel]` › `a.sgs-nav-drawer-menu__sublink` |

The link is never a direct child of the `<li>` on a submenu-bearing item (`li > .sgs-nav-*-menu__link` matches nothing there); `.sgs-nav-bar-menu__submenu-wrap` is bar-only; `ul.sgs-nav-*-menu__submenu` is the one class present in both forks, so every "inside the open panel" rule keys on it.

#### FR-41-36 — Default colour scheme for item/submenu/drawer states

**Status: PARTIAL** (§14.0a.3). Researched and owner-approved. Uses the real `theme.json` tokens `primary`, `primary-dark`, `accent`, `accent-light`, `accent-text`, `surface`, `surface-alt`, `text`, `text-muted`, `border-light`.

Terminology: the shared bottom-edge family (`itemBorderWidth` / `Colour` / `ColourHover` / `ColourCurrent`) is the item's own edge: the **Underline** on the bar's top-level items, or a boxed item when all four sides are set. A line BETWEEN two items or rows is not part of that family: it is the shared Separators setting (FR-41-37).

| Context | Normal | Hover | Current |
|---|---|---|---|
| **Top bar item** | text and background unset (inherited); Underline `border-light`, drawn only once an `itemBorderWidth` is set | text default-closes in PHP to `primary` (skipped when the resolved text treatment is `none`); background unset; Underline `accent` | text and background unset; Underline `accent` (with no fill on either, the Underline plus `itemFontWeightCurrent` `"600"` mark Current) |
| **Desktop submenu** rows | row background `surface` (painted when neither `submenuBg` nor `submenuBgGradient` is set); text `text` (`primary` text fails 4.5:1 on light-brand palettes, so the brand colour carries the Hover fill); separator 1px solid `border-light` | row background `primary`; text default-closes to `text`; separator `accent` | row background `surface-alt`; text `text` |
| **Drawer top-level** | as the top bar; panel background is `nav-drawer`'s `drawerBg`, default `surface` | as the top bar | as the top bar |
| **Drawer nested submenu** | the same `submenuLinkBg*` / `submenuColour*` family as the desktop submenu | as the desktop submenu | as the desktop submenu |

Sources: the `block.json` defaults of `itemBorderColour*`, `itemFontWeightCurrent`, `submenuLinkBg*`, `submenuColourCurrent`, `submenuSeparators`; `plugins/sgs-blocks/src/blocks/nav-drawer/block.json` `drawerBg`; `plugins/sgs-blocks/includes/nav-menu-css.php::sgs_nav_shared_item_state_css` (its `$default_item_colour_hover` parameter, both callers pass `'primary'`); `plugins/sgs-blocks/includes/nav-menu-submenu-css.php::sgs_nav_shared_submenu_css` (the `submenuColourHover` default-close to `'text'`).

**Why the submenu defaults are what they are.** Each carries its contrast justification in `block.json`: `text` on `surface` 11.86:1, `text` on `primary` 5.28:1, `text` on `surface-alt` 14.31:1; `accent-light` background with `accent` text measured 1.35:1, so the Hover pair is `primary` + `text`. An explicit opaque row background means the drawer's nested submenu never depends on a runtime contrast computation against an arbitrary `drawerBg`.

**Why the item Hover text default-closes to a token.** Left unset, the hover colour comes from core's ambient `:root :where(a:hover)` (zero specificity), which stops matching when the pointer leaves the literal `<a>` while still inside the item's open dropdown, so FR-41-13 would have nothing to hold. Default-closing makes every branch gated on a non-empty hover colour fire for every untouched item. The parameter stays a parameter so a surface with a different background can override it.

**Underline / row-separator rule.** Every context uses one colour language: `border-light` at rest, `accent` on Hover and Current. **The item Underline paints nothing until the operator sets `itemBorderWidth`** (default `{}`); the submenu row separator is 1px by default. ⛔ The drawer does NOT default to a brand-filled whole panel (Kadence, Astra, GeneratePress and Divi default to a neutral background, brand colour for accents only); `drawerBg` defaults to `surface`.

**Not built:** an item Hover background tint (`accent-light`) and a Current-row tint on the top bar and drawer top-level; those background defaults are unset, so an untouched item paints no Hover or Current fill.

#### FR-41-37 — The lines between items (Separators)

A line between two items is its own setting, not a border on one of them. Both nav blocks carry the shared Separators setting (`plugins/sgs-blocks/includes/helpers-separators.php`, editor control `SgsSeparatorControl`):

| Attribute | Block | Draws between | Axis | Offers |
|---|---|---|---|---|
| `separators` | `sgs/nav-bar-menu` | top-level bar items | `column` (vertical); not drawn in the bar's drawer copy | hover colour, swap / sweep |
| `separators` | `sgs/nav-drawer-menu` | top-level rows | `row` (horizontal) | hover colour, swap / sweep, `edges` (between / all / end) |
| `submenuSeparators` | both | the rows of an open submenu | `row` | hover colour, swap |

**Shape:** `{ row?: axis, column?: axis, edges, hoverTreatment, sweepAngle }`, an axis being `{ style, width: {desktop,tablet,mobile}, colour, colourHover }`. An axis with no width draws nothing. Defaults: `separators` style `solid`, colour `text-muted` (about 4.7:1 on a light header), hover `accent`, treatment `swap`, no width; `submenuSeparators` a 1px `border-light` line with an `accent` hover. `sweepAngle` defaults to 180 (vertical line) or 90 (horizontal); a sweep is a gradient band, offered and emitted for a solid line only.

**Geometry.** The items draw the line: an empty pseudo-element on every item except the first, offset half the gap plus half the line outward, so it is centred in the gap at any thickness with no measuring (`plugins/sgs-blocks/includes/helpers-separators-line-css.php`). The gap is the `--sgs-nm-gap` custom property each tier writes (`plugins/sgs-blocks/includes/nav-menu-submenu-link-css.php`); submenu rows touch, so their gap is zero. `edges: 'end'` adds a flush line under the last row, `'all'` also above the first. With `listColumns` on, the drawer's top-level list is a column-major grid whose row starts CSS cannot know, so that list takes the flow path (native `column-rule` / `row-rule`, else the runtime overlay in `plugins/sgs-blocks/src/shared/separators/`).

**Hover reaches from both neighbours.** A line belongs to the item before and after it, so hovering or focusing EITHER repaints it: the own-item rule on the following item plus an adjacent-sibling rule from the preceding one, built from `sgs_hover_guarded_rule()` and an unguarded focus rule. A drawer row counts a hover on its link, split-row link or expander summary. No Current state.

**Controls.** One `SgsSeparatorControl` per list ("Item separators", "Row separators", "Submenu row separators"): a per-device thickness beside one colour swatch whose popover holds the Normal / Hover tabs and the line-style picker. The colour lives in this composite, like a border colour in `SgsBorderControl`, not in the Colour panel.

**Emitter:** `plugins/sgs-blocks/includes/nav-menu-separators.php::sgs_nav_menu_separators_css`, called at the end of `plugins/sgs-blocks/includes/nav-menu-item-border-featured-css.php::sgs_nav_shared_item_border_css`. Gate: `plugins/sgs-blocks/scripts/check-separators-through-helper.py` fails a between-item line drawn outside the helper.

#### FR-41-38 — The hover Sweep is angle-driven

Every band Sweep (the item border band and the separator band) uses `plugins/sgs-blocks/includes/sweep-css.php::sgs_directional_sweep_css`: a `linear-gradient(<angle>deg, <hover> 50%, <rest> 50%)` at `background-size:200% 200%`, both `background-position` endpoints computed from the sine and cosine of the angle. The attribute is `sweepAngle` (`number`, default `90`; `90` left to right, `270` right to left), edited with an `AnglePickerControl` plus a preset dropdown. `borderHoverAnimationDirection` is not declared and no control writes it; the emitter reads it defensively off the raw `$attributes` only when `sweepAngle` is absent so saved content keeps its direction (WordPress does not strip an undeclared key before `render.php`; see `.claude/rules/block-authoring.md`). The text/glyph Sweep (FR-41-26) is a fixed left-to-right gradient and does not use this primitive. The separator hover uses the same mechanism through `separators.hoverTreatment` / `separators.sweepAngle`; its band lives on the item's own `::before` (the resting line's pseudo), leaving the item link's `::before` / `::after` free for the item background and border-bottom sweep.

#### FR-41-2 — No new shared JS component is built. None is needed.

**(a) No `fillRow3`/`textRow3` sibling.** `plugins/sgs-blocks/src/components/colour-variants/fillRow.js::fillRow` and `plugins/sgs-blocks/src/components/colour-variants/textRow.js::textRow` accept an optional `current` / `currentGradient` key, the JS mirror of FR-41-3's optional PHP `current` key. `colourRows` is a single literal `ArrayExpression` whose entries are mostly `fillRow()` / `textRow()` calls, so a third state is one more string in that call's `attrs` object.

⛔ Two rows are hand-written literals, deliberately; do not convert them:

| Row | Why it cannot use the helper |
|---|---|
| **Item background** (`item-bg`) | FR-41-14 omits the Current state per-STATE while `Highlight` is active. A conditional attribute NAME passed to the helper is not a string literal, so `describeRow()` would resolve 2 states while 3 render (the gate goes blind while the code is correct). A spread-of-ternary inside a literal `states` array stays statically countable in both branches. |
| **Item border colour** (`item-border`) | The item border declares no gradient attribute (FR-41-7, §14.1.2), so the row cannot be `gradientCapable`. A non-`gradientCapable` row renders `DesignTokenPicker`, which has no contrast check, so this row's `contrastAgainst` / `contrastLargeText` pair is declared per §14.9.6 and is currently INERT. The submenu panel border row beside it is gradient-capable and its check runs. |

A `current` state is appended only when `hover` is also supplied (both helpers warn on Current-without-Hover: Current is the THIRD state, never a substitute). `linked: true` is set by the helpers on every state they build; the two hand-written rows set it inline. `31-golden-colour-control.js` resolves a `fillRow` / `textRow` CALL natively via `describeRow()`, which is why the CALL SITE must stay in `edit.js` even though the builder lives in `plugins/sgs-blocks/src/components/`.

**(b) `SgsBorderControl` needs no fork (FR-41-2b), and its N-state colour machinery is not used here.** Border COLOUR lives in the global Colour panel as an ordinary 3-state row (FR-41-33), so these blocks never pass `colourStates`. `plugins/sgs-blocks/src/components/SgsBorderControl.js::SgsBorderControl` still owns width, style and radius, mounted with the additive `showColour={ false }` prop (default `true`, every other caller unchanged). The control's `colourStates` prop (forwarded as `states` to `GradientCapableColourControl`, no fixed length) already renders three tabs for a three-element array on its 40-plus other mounts; the one permitted modification is FR-41-33's `showColour` prop. Live multi-state mount to copy: `plugins/sgs-blocks/src/blocks/container/edit.js::Edit`.

`borderStyle` rides the colour popover, so `showColour={ false }` must not take border style with it: `SgsBorderControl` then renders the existing shared `plugins/sgs-blocks/src/components/BorderStyleControl.js::BorderStyleControl` as a sibling in the same row (FR-41-33 item 2). ⛔ Do not build a fresh `SelectControl` for border style.

**Detector rules.** `plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js` resolves a row's state count as `statesArray.elements.length` on a literal `ArrayExpression` (minimum 2, no upper bound).
- ⛔ State entries are LITERAL array entries, never `.map()`/`.filter()`-generated; conditionality happens at array level (`showCurrent ? [ normal, hover, current ] : [ normal, hover ]`).
- ⛔ `linked: true` on every state, so `DesignTokenPicker` stores the palette slug and a brand token survives a re-skin.
- ⛔ State labels are translated at the row: `__( 'Current', 'sgs-blocks' )`.

#### FR-41-3 — The PHP emitters take an optional third state. No `_3` family exists.

⛔ There is no `sgs_fill_states_css_3`, `sgs_text_states_css_3`, `sgs_border_states_css_3` or `sgs_emit_state_colour_css_3`. The third state arrives as optional parameters on the existing functions, defaulting to current behaviour so every existing caller is byte-identical (§14.11 G1).

**(a)** `plugins/sgs-blocks/includes/helpers-tokens.php::sgs_emit_state_colour_css( string $selector, array $decls_normal, array $decls_hover, array $extra_states = array() ): string`. `$extra_states` maps `state_key => [ 'suffix' => string, 'decls' => string[], 'guarded' => bool ]`; each entry emits `{$selector}{$suffix}{...}`, guarded via `sgs_hover_state_rules()` when `guarded`. For Current the caller passes `'current' => [ 'suffix' => '[aria-current="page"]', 'decls' => [...], 'guarded' => false ]`. ⛔ `$extra_states` is emitted BEFORE `$decls_hover` inside the function, so ordering is a property of the emitter. The default `[]` is the acceptance condition: every other call site must produce byte-identical CSS.

**(b)** `sgs_fill_decls()` and `sgs_text_decls()` read an optional `$map['current']` (and `$map['current_gradient']` where the mechanism supports it) and return a `current` bucket populated only when the caller's map carries one. Their `sgs_fill_states_css()` / `sgs_text_states_css()` wrappers forward a non-empty bucket into `$extra_states`, else pass `[]`.

**(c)** `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_border_states_css`: the third state is FLAT-PATH ONLY (a mechanism constraint).

| Path | Condition | Emits | Third state |
|---|---|---|---|
| **Flat** | no `gradient` / `hover_gradient` | `{sel}{border-color:X}` plus a `sgs_hover_state_rules()` pair | Supported: one more `{sel}[aria-current="page"]{border-color:Z}` rule before the hover pair |
| **Ring** | either gradient set | `sgs_border_gradient_css( $sel, $normal_paint, $hover_paint, $width )`: a masked `::before` ring composing both paints, `border-color:transparent` | Not supported: Current is gradient-exempt at the ring level (the primitive takes two paints) |

The ITEM border never reaches the ring path (no item-border gradient is declared; its `::before` belongs to the item background, FR-41-23), so its three states all render. The submenu PANEL border declares `submenuBorderColourGradient` legitimately: nothing competes for the panel's `::before`, and the panel is Normal-only for every property (FR-41-9). The distinction is the pseudo-element budget on one element.

**Three binding emitter rules:**
1. ⛔ Every hover rule routes through `plugins/sgs-blocks/includes/helpers-hover-state.php`, never a bare `{sel}:hover`: `sgs_hover_state_rules( $selector, $decls, $focus, $suffix )` for a base selector, `sgs_hover_guarded_rule( $hover_selector, $decls )` only for a fully built `:hover` selector. A tap engages `:hover` on touch until the user taps elsewhere. `SGS_HOVER_MEDIA` (`@media (hover:hover) and (pointer:fine)`) fixes phones and pure-touch tablets; `SGS_HOVER_NOT_TOUCH` (`:where(:root:not(.sgs-touch-input))`) fixes hybrids; neither covers the other's devices.
2. `:focus-visible` stays OUTSIDE both guards (a keyboard user on a touchscreen laptop needs it).
3. ⛔ The Current rule is emitted BEFORE the Hover rule and is never guarded.

**The specificity rule (write the rule, not the numbers).** Because FR-41-1 puts all three states on the same element, every state-pair shares one base selector and differs by one single-specificity suffix (`[aria-current="page"]` vs `:hover`). A state-pair therefore always ties and source order is the only tie-breaker. (The base `$link_sel` is `.{uid} .{bem_root}__link`, two classes, set in `sgs_nav_shared_item_state_css`.) Emitting Current first means hover wins when you point at the item for the page you are on: where you are and what you are pointing at are different questions. Current is not pointer-dependent, so it takes no touch guard.

#### FR-41-16 — `SgsColourPanel` takes optional row keys (additive, zero blast radius)

`plugins/sgs-blocks/src/components/SgsColourPanel.js::SgsColourPanel` renders ONE `PanelBody` "Colour" in the `group="styles"` slot, one control per row. A row descriptor may carry three optional keys, all default-absent:

| Key | Rendered | Exists for |
|---|---|---|
| `heading` (string) | a non-interactive `BaseControl.VisualLabel` BEFORE the row's control | the §14.9.6 Menu / Submenu / Menu-button groupings inside one Colour panel |
| `after` (React node) | AFTER the row's control, inside the same row wrapper | FR-41-23/24's treatment selector and the `ⓘ` notes. A SLOT, not a component |
| `contrastLargeText` (boolean) | forwarded with `contrastAgainst`/`contrastLabel` on the gradient-capable branch | border rows, so they get WCAG 1.4.11's 3:1 UI-component threshold, not the 4.5:1 text one |

A row without a key renders byte-identically; `contrastLargeText` is spread only when declared. ⛔ `after` is the ONLY sanctioned mount point for the treatment selector: no second panel, sibling `PanelBody` or control outside the row wrapper (the operator meets the control and its consequence in one place). Live mounts: the shared Item/Submenu treatments (`ItemTextTreatment`, `ItemBgTreatment`, `ItemBorderTreatment`, `SubmenuTextTreatment`, `SubmenuLinkBgTreatment`) export from `plugins/sgs-blocks/src/shared/nav-menu-panels/ColourRowExtras.js`; the bar-only Burger treatments (`BurgerIconTreatment`, `BurgerBgTreatment`) from `plugins/sgs-blocks/src/blocks/nav-bar-menu/BarColourRowExtras.js`. This is a design-gated shared-component change; acceptance is byte-identical inspector output for every other `SgsColourPanel` mount (§14.11 G1).

### 14.3 Accessibility signals: smart contrast and the non-colour state signal

#### FR-41-5 — Smart contrast: an opt-in toggle

`itemSmartContrast` (boolean, default `false`, both blocks) is a WCAG safety-net TOGGLE, not a colour, so it sits in the General tab **Accessibility** panel (FR-41-27, §14.9.5). ⛔ It must stay findable from the rows it governs: the Item text and Item background rows in §14.9.6 each carry a one-line cross-reference to §14.9.5. Acceptance: §14.11 G16 (renders, bound to `itemSmartContrast`, changes the rendered colour off versus on, on the live canary). Control: a native `ToggleControl` "Keep text readable automatically".

⚠ Sweep defeats this toggle (`-webkit-text-fill-color: transparent` overrides the resolved foreground), so the two are never offered together (FR-41-26 eligibility).

When on, and the operator has set a Hover or Current **background**, `sgs_nav_shared_item_state_css` resolves the foreground through the EXISTING helpers (do not build a new contrast function): text colour empty → `sgs_wcag_text_colour_for_bg( $bg_hex )`; text colour set → `sgs_wcag_preferred_text_colour_for_bg( $bg_hex, $preferred )`, which keeps the operator's colour when it clears AA and falls back to the safe binary only when it does not.

**Default OFF**: an explicit `itemColourHover` renders as authored unless the operator opts in. The readability CHECK stays unconditional: an always-on advisory `Notice` under the Item text colour row whenever the hover combination fails contrast, pointing to the toggle. Only the automatic SWAP is gated. Help text is plain language ("When you set a background, we can check your text colour stays readable against it and swap in a readable one if it doesn't. Off by default, so your chosen colour always renders exactly as picked."); no "WCAG", "contrast ratio" or "AA" in a client-visible string.

#### FR-41-6 — The non-colour state signal (WCAG 1.4.1)

Hover and Current must never be colour-only signals. ⛔ **The PRIMARY non-colour signal is the border row's own Hover treatment; the hover typography trio is an OPTIONAL SECONDARY decoration and is never "the divider".** Neither half may be restated as the other anywhere (spec, help text, control label).

- **Primary signal.** FR-41-23 pairs a None/Swap/Sweep selector beneath the item border's Hover swatch; Swap changes the border colour instantly, Sweep travels a band along the bottom edge (FR-41-8), both at the border width the operator set. This is the only thing counted as the WCAG 1.4.1 signal for Hover.
- **Optional secondary layer.** `TypographyControls`' `showHover` is on for both blocks and all three controls ship (hover text-decoration, text-transform, font-weight). None is required for compliance or substitutes for the border treatment. `itemTextDecorationHover: "underline"` hugs the baseline and spans only the glyphs, whereas the border treatment spans the item's full width, so they do not compete. There is no full-width animated `::after` underline bar; the link's `::after` belongs to the border Sweep band.

**Consequences:** (1) `itemTextDecorationHover`, `itemTextTransformHover`, `itemFontWeightHover` plus the three `submenu`-prefixed siblings are declared (six attributes; `showHover` is all-or-nothing). (2) `itemTextDecorationCurrent` is NOT declared (no shared control for a Current trio; Current carries `itemFontWeightCurrent`). (3) A hover font-weight change reflows the bar (a heavier face is wider); this caution belongs in the control's help text (§14.9.10 carries the verbatim string) and is not a reason to omit the control. (4) The base `itemTextDecoration` (Normal only) renders through `sgs_typography_css_rule()` unaffected; its `block.json` `enum` carries `overline` as a fifth value, matching `SGS_TEXT_DECORATION_OPTIONS` and the PHP allowlist.

⛔ The distinction is RENDERED in the inspector: two reciprocal `ⓘ` notes, one under the item border row's hover-treatment selector (§14.9.6) and one under the hover trio row (§14.9.10), each naming the other and stating they are not the same thing. Both or neither. The verbatim strings live in §14.9.10. Gated: §14.11 G19(e).

**Default non-colour signal, one per state:**

| State | Signal | Attribute | Default | Why |
|---|---|---|---|---|
| **Hover** | the item border's Hover treatment | `itemBorderColourHover` + `itemBorderHoverTreatment` | `"swap"` | Uses the border the operator already sized; identical in bar and drawer (FR-41-28). Only visible once a border width is set. |
| **Current** | `font-weight` | `itemFontWeightCurrent` | `"600"` | Safe on Current because it does not change on pointer movement. |

⚠ `itemBorderWidth` defaults to `{}`, so an untouched block ships NO border and therefore no default Hover signal. Accepted: an unrequested underline on every item of every install is a design imposition the owner rejected, and the operator has a one-action control. FR-41-17a carries the residual risk; §14.11 G10 asserts the Hover signal renders once a border width IS set.

⛔ `itemFontWeightCurrent` is `"type": "string", "default": "600"` (matching `itemFontWeight`'s `{"type":"string","default":""}`; a number-typed sibling would be a second vocabulary). It renders as a `SelectControl` fed `SGS_FONT_WEIGHT_OPTIONS` (exported from `TypographyControls.js`, re-exported by `plugins/sgs-blocks/src/components/index.js`), never a number input or a hand-typed weight array (the `featuredFontWeight*` hand-rolled 4-option array is the anti-pattern).

**Never-lighter rule.** The emitter writes the Current weight rule only when `(int) itemFontWeightCurrent` is strictly greater than `(int) itemFontWeight` (empty casts to 0: the default `"600"` always emits, an empty Current never does). A floor, not a preference: a deliberately lighter current page cannot be expressed here.

⛔ One DEFAULT signal per state, not two. This constrains what ships, not what an operator may add: the `showHover` trio defaults to unset and paints nothing until chosen. The Current-state control is a standalone `SelectControl` mounted block-privately at the bottom of the Typography panel's Menu target (FR-41-29, §14.9.10). The residual risk when both signals are off is FR-41-17a.

### 14.4 Border and sweep

#### FR-41-7 — ONE item border control. There is no separate "Item Divider".

⛔ No `itemDivider` toggle, no standalone divider `itemBorderColour`, no `itemBorderSweep` (two mechanisms for one question is how a double-line bug arises). The item's border is a normal 3-state `SgsBorderControl` mount with per-side width (`ResponsiveBoxControl` in border-width mode): a **bottom** border for a drawer-style row separator, a **right/left** border for a vertical separator in the flat bar, all four for a boxed item. (A divider styled independently of the item's own underline is FR-41-37.) ⛔ Width is BASE-ONLY by the control's design (`showResponsive={ false }`); do not propose `itemBorderWidthTablet` / `...Mobile`.

**Attributes** (both blocks): `itemBorderWidth` (object, default `{}`; nothing paints until a width is set), `itemBorderStyle` (default `"solid"`), `itemBorderColour` / `itemBorderColourHover` / `itemBorderColourCurrent` (defaults `"border-light"` / `"accent"` / `"accent"`), `itemBorderRadius` (object, default `8px` on every corner). The emitter writes `border-width` and `border-style` only when a width is set (a style with no width would paint the UA `medium` border).

⛔ There is no `itemBorderColourGradient`: a named SCOPE CUT on a pseudo-element budget (the gradient path is a masked `::before` ring, FR-41-3c, and the item link's own `::before` is the item background layer, FR-41-15 / FR-41-23). The submenu PANEL border keeps its gradient.

⛔ The three border COLOUR attributes are NOT authored inside this control: they render as an ordinary 3-state row in the global Colour panel (FR-41-33). `SgsBorderControl` is mounted with `showColour={ false }` and owns width, style and radius only; a second live control writing the same attribute from two panels is banned (`check-duplicate-controls.js`). ⛔ Radius rides `SgsBorderControl`'s own `radiusValues` / `onRadiusChange` pair (mounted with `showRadiusResponsive={ false }`, matching the base-only width); there is no competing flat radius control.

**Borders do NOT leak between the bar and the drawer.** They are two separate blocks, each with its own uid, scoped `<style>` and inspector (`plugins/sgs-blocks/src/blocks/nav-drawer/edit.js::TEMPLATE` seeds its own `sgs/nav-drawer-menu`); a bottom border on one instance is invisible to the other.

#### FR-41-8 — The item border's hover treatment: None / Swap / Sweep

The choice lives on the universal hover-treatment selector (FR-41-23) directly under the item border row's Hover colour; a standalone "hover colour animation" control in the border panel would be a second mechanism on the SAME property. The sweep direction is `sweepAngle` (FR-41-38), shown only when `sweep` is chosen. This FR owns the MECHANISM; FR-41-23 owns the CONTROL PLACEMENT.

**`itemBorderHoverTreatment`**, string, default `"swap"`; values `none` | `swap` | `sweep`. A `ToggleGroupControl` from `plugins/sgs-blocks/src/components/primitives` (three options sit inside `plugins/sgs-blocks/src/components/TypographyControls.js::SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED`, which is `3`). One control, not per-element: not duplicated on the background or text rows and not given a submenu-panel twin (the panel is not a hoverable surface, FR-41-9). ⛔ A plain `"type": "string"` validated in PHP, never a JSON `enum` (an out-of-enum value silently coerces to the default, which bites hardest via programmatic writers such as Spec 47's route and pattern files). It animates the BOTTOM edge only (a sweep needs a horizontal line); other edges swap instantly.

⛔ **When `itemBorderHoverTreatment === 'sweep'`, the Hover AND Current border-colour emissions are OMITTED for the swept edge; the band owns every non-resting colour on it.** Otherwise `sgs_border_states_css()` would repaint a real border beneath the band on hover: two visible lines. The rule is the emitter's own condition: `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_border_states_css( string $selector, array $attributes, array $map )` accepts an additive optional `$map['suppress_edges']`, `array( 'top' => bool, 'right' => bool, 'bottom' => bool, 'left' => bool )` (the box-object vocabulary of `itemBorderWidth`; absent key, empty array or absent edge mean false).
- When any edge is suppressed, the NON-RESTING rules (the hover pair and the `current` state) emit per-edge `border-<edge>-color` longhands for the unsuppressed edges only (top/right/bottom/left order); with none suppressed they emit the flat `border-color` shorthand; with every edge suppressed they emit no non-resting rule at all (not an empty body).
- The RESTING rule is unaffected (it is what the sweep override turns transparent and what the band reads as its resting stop).
- Each block calls the helper ONCE, passing `'suppress_edges' => array( 'bottom' => true )` when the resolved treatment is `'sweep'` and NO `suppress_edges` key otherwise, from `plugins/sgs-blocks/includes/nav-menu-item-border-featured-css.php::sgs_nav_shared_item_border_css`.
- ⛔ The gradient/ring path IGNORES `suppress_edges` silently and by design (two paints, no per-edge concept; the docblock says so).
- ⛔ The absent-key default is the ACCEPTANCE CONDITION: every other caller passes no key and must emit byte-identical CSS including the flat shorthand (§14.11 G1(c); G6 is the live proof). There is no `sgs_border_states_css_per_edge()` and no block-private override rule (a second painter on one selector would be an unfalsifiable overlapping fix).
- The Hover and Current swatches stay VISIBLE and STORED: they govern the other three edges and the band reads the Hover value as its travelling colour. Switching back to `Swap` loses nothing.

**Mechanism: one painted line, not two.** When `sweep` is chosen the emitter writes:
1. ⛔ `{link}{position:relative;}` UNCONDITIONALLY (the band is `position:absolute`; the item-background rule sets `position:relative` only when a fill is set).
2. ⛔ `{link}{border-bottom-color:transparent;}`: `bottom:0` on an absolute child resolves against the PADDING box while a real `border-bottom` paints on the BORDER box, so without this an operator with both would see two lines.
3. The band on the link's `::after`: `content:""; position:absolute; inset-inline:0; bottom:calc(-1 * <itemBorderWidth.bottom>); height:<itemBorderWidth.bottom>; background-image:<sgs_directional_sweep_css( sweepAngle, NORMAL, HOVER )>; background-size:200% 200%; background-repeat:no-repeat; transition:background-position 300ms ease; pointer-events:none`, with `{link}:hover::after` moving `background-position`.

| `itemBorderHoverTreatment` | What `sgs_border_states_css()` receives |
|---|---|
| `swap` (default) | the full `$map`: Normal, Hover and Current all emit on every edge |
| `none` | `hover` unset on every edge; Current still emits (Current is not a hover state) |
| `sweep` | `hover` and `current` unset on the BOTTOM edge only; other edges behave as `swap` |

`swap` and `none` emit no band, no transparent override and no `position:relative`. ⚠ A sweep with no bottom border width or no Hover colour emits nothing (no line, no colour to travel to); say so in the control's help text. The gradient shape follows `plugins/sgs-blocks/src/blocks/business-info/style.css::.sgs-business-attribution .sgs-business-info__link` except its `background-clip:text` glyph sweep (this sweeps a separate band element, so no clip, `@supports`, `forced-colors` or `print` rescue). ⛔ A `prefers-reduced-motion: reduce` rule (`{link}::after{transition:none}`) is MANDATORY: keep both end states, drop only the travel. ⚠ Emit through PHP hover helpers, not `style.css` (the colours are operator attributes): `sgs_hover_state_rules( $link_sel, 'background-position:...', ':focus-visible', '::after' )`; `background-position` is a `MOTION_PROPERTIES` member in `plugins/sgs-blocks/scripts/hover-guard/classify.js`.

### 14.5 The submenu

#### FR-41-9 — The submenu split: the PANEL and the LINKS are different things

**The PANEL** (`.sgs-nav-bar-menu__submenu` / `.sgs-nav-drawer-menu__submenu`) is **Normal-only for every property**: background, border colour and shadow. A bare panel is never the hovered surface nor "the current page". `submenuBg` has no `Hover`/`Current` siblings anywhere. ⛔ This applies to the border as much as the background: no `submenuBorderColourHover`, `submenuBorderColourCurrent` or `submenuBorderHoverAnimation`; its shadow likewise (§14.9.9: a floating panel is either rendered or absent). ⛔ The panel shadow is a `filter:drop-shadow()`, not a `box-shadow`: the wrapper `.{bem_root}__submenu-wrap` carries `overflow-y:auto` (`plugins/sgs-blocks/includes/nav-menu-submenu-css.php`), which clips a `box-shadow`. ⛔ `supports.sgs.colourExemptions`'s `submenu-bg` entry is kept in both nav `block.json` files (its `"rule": "states"` claim is true and it stops a conformance gate demanding a meaningless hover state; its wording names `submenuLinkBg*` as the hoverable surface); the `indicator` entry and a matching panel-border entry stay too.

**The LINK** (`.sgs-nav-bar-menu__sublink` / `.sgs-nav-drawer-menu__sublink`) carries a genuine 3-state background under distinct names: `submenuLinkBg` (string, `"surface"`), `submenuLinkBgHover` (`"primary"`), `submenuLinkBgCurrent` (`"surface-alt"`), `submenuLinkBgGradient` (`""`, the Normal-state gradient sibling); defaults and contrast justification are FR-41-36's. ⛔ Never reuse `submenuBg*` names for the link: the `sublink` element declares `"prefix": ""` because a `submenu` prefix would wrongly claim `submenuAlign/Caret/CloseGrace/MinWidth/Radius/Padding`, which belong to the panel. The link's text Current state is `submenuColourCurrent` (string, `"text"`), sibling of `submenuColour` / `submenuColourHover`.

#### FR-41-10 — Submenu open animation

**Bar-only** (the submenu-wrap exists only on `sgs/nav-bar-menu`). The dropdown shows by a binary `display:none → block` toggle in `plugins/sgs-blocks/includes/nav-menu-submenu-css.php`; the animation is layered on that. **`submenuAnimation`**, string, default `"fade"`; values `none` | `fade` | `fade-lift` | `slide-down` | `grow`; PHP-validated, no JSON enum (FR-41-8's reasoning). `fade` is pure opacity, safe under overflow-flip repositioning. Control: a five-option `SelectControl` (past the segmented threshold) in the "Dropdown (only affects items with sub-items)" `ToolsPanel` (§14.9.9); timing, easing and item stagger live in the bar's "Panel motion" panel.

| Link | Where |
|---|---|
| Control | `plugins/sgs-blocks/src/shared/nav-menu-panels/DropdownStylePanel.js` (`ToolsPanelItem`, gated `showSizingControls`: bar `true`, drawer `false`); timing in `plugins/sgs-blocks/src/blocks/nav-bar-menu/PanelMotionPanel.js` |
| Storage | `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::attributes.submenuAnimation`, string, no JSON `enum` |
| Validation | `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php`: the constructor reduces the value to `$submenu['animation']` via `in_array( ..., array( 'fade', 'fade-lift', 'slide-down', 'grow' ), true ) ? ... : 'none'`, so an out-of-vocabulary value degrades to `none` |
| Markup | `plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_bar_menu_render_items`: the dropdown wrap AND the mega panel wrap carry `sgs-nav-bar-menu__panel-motion sgs-nav-bar-menu__panel-motion--{animation}` |
| Paint | `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css::.sgs-nav-bar-menu__panel-motion`: transitions opacity, translate, scale, clip-path, visibility and `display` (`transition-behavior: allow-discrete`), entered from `@starting-style`; timing from `--sgs-nbm-panel-dur` / `--sgs-nbm-panel-exit-dur` / `--sgs-nbm-panel-ease` written by `render.php` |

`@starting-style` gives the newly displayed wrap a first frame; `allow-discrete` holds `display` until the close transition ends. While closing the panel takes no pointer hits and its `visibility` goes hidden (out of the Tab order and accessibility tree); a browser without the exit part closes instantly. Spec 36 "Motion" (U-5) holds the full vocabulary. ⛔ Every panel rule sits inside `prefers-reduced-motion: no-preference`: under `reduce` the panel opens and closes whole and is never stranded at an invisible start state. The drawer's native `<details>` accordion has no panel animation; its arrival and item stagger are `sgs/nav-drawer` attributes (Spec 36 "Motion").

#### FR-41-11 — Submenu top offset, and the hover-bridge it requires

Both panel kinds (`.sgs-nav-bar-menu__submenu-wrap`, `.sgs-nav-bar-menu__mega-panel-wrap`) sit at `top: calc(var(--sgs-mm-panel-top, 100%) + <offset>)`; `plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js::repositionPanel` publishes `--sgs-mm-panel-top` as the header's bottom edge (FR-36-4 "Gap below the header"). **`submenuTopOffset`**, string, default `""` (no gap), `SgsLengthControl` with `presets={ false }` in the "Dropdown" `ToolsPanel` beside `submenuMinWidth` and the border.

⛔ A non-zero offset creates a hover dead strip (the gap belongs to neither element, so the parent flickers back to its resting paint), the bug FR-41-13 fixes; it MUST ship with the bridge. ⛔ `submenuCloseGrace` does NOT cover this: in `mega-disclosure.js::leaveBridge` it is a `window.setTimeout` on the bridge element's `mouseleave` deferring `ctx.isOpen = false`; it governs openness, never CSS `:hover`.

**The fix:** a CSS hover-bridge pseudo-element on the open item's disclosure root:

```
{uid} .sgs-nav-bar-menu__submenu-root:has([data-sgs-mega-trigger][aria-expanded="true"])::after,
{uid} .sgs-nav-bar-menu__mega:has([data-sgs-mega-trigger][aria-expanded="true"])::after {
  content: ""; position: absolute; left: 0; right: 0;
  top: 100%; height: var(--sgs-mm-bridge-h, 0px); pointer-events: auto;
}
```

`repositionPanel` publishes `--sgs-mm-bridge-h` on the root (the panel's top minus the item's bottom: the header's bottom padding plus the offset, so possibly above zero even with no offset). The bridge hangs from the root, never the panel wrap, because both wraps scroll (`overflow-y:auto`) and a scroll box clips a pseudo-element outside its own edges. It fixes the parent's PAINT only. Safe because: `.sgs-nav-bar-menu__submenu-wrap::before` is unused elsewhere; the wrap is `position:absolute`; a closed (`display:none`) panel has no pseudo-elements, so the bridge exists only while open; both wraps are bar-only (the drawer has no offset or gap).

### 14.6 The menu trigger

#### FR-41-12 — The burger has a mode + label. The close side is a `sgs/nav-drawer` companion.

⛔ The panel is named **"Menu Button"** ("Burger" is jargon; "Menu Trigger" a developer's word), opening with the help text "Controls the button that opens the mobile menu (the 'burger')." ⚠ The heading is a LABEL only: `triggerMode`, `triggerLabel`, `triggerIcon`, `triggerMagnet*` and the `burger*` family keep their names (a rename's blast radius is the whole write path, including Spec 47's route).

**OPEN side (`sgs/nav-bar-menu`; the drawer has no burger).** A `<button class="sgs-nav-bar-menu__burger">` built by `plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_bar_menu_burger_toggle_markup`.

| Attribute | Type | Default | Purpose | Control |
|---|---|---|---|---|
| `triggerMode` | object (tier) | `{"desktop":"icon"}` | Per device `icon` \| `text` \| `icon-and-text` (tablet inherits desktop, mobile tablet). PHP-validated against `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php::$sgs_nm_allowed_trigger_modes`, no JSON enum. The button renders the icon if any tier shows it and the label if any does; `plugins/sgs-blocks/includes/nav-menu-trigger-css.php` hides each per tier. Accessible name: "Open menu" when no tier shows the word, the label when some do, none when all do. A stored flat string folds to `{desktop}`. | `ResponsiveOverride` + three-option `ToggleGroupControl` |
| `triggerIconPosition` | string | `"after"` | `before` \| `after` when a tier shows both (visual reorder only) | `ToggleGroupControl`, shown when a tier is `icon-and-text` |
| `triggerLabel` | string | `"Menu"` | The visible word | native `TextControl` (`__nextHasNoMarginBottom __next40pxDefaultSize`), not `SgsFreeTextField` (no adopters on this block) |
| `triggerIcon` | object | `{"source":"lucide","name":"menu"}` | The glyph (FR-41-30a) | the framework Icon Picker |

`icon` renders the icon alone; `text` replaces the SVG with `<span class="sgs-nav-bar-menu__burger-text">`; `icon-and-text` renders both, icon first, in the flex button.

⚠ The `aria-label` is assembled conditionally (`$aria_attr`): `sprintf( ' aria-label="%s"', esc_attr__( 'Open menu', 'sgs-blocks' ) )` only in `icon` mode; passing `''` into the literal would emit an empty accessible name. Under `text` / `icon-and-text` the visible word IS the name (SC 2.5.3 Label in Name). ⚠ `aria-hidden="true"` on the icon under `icon-and-text` (the same convention as the sublink marker and caret). ⚠ The button is not a fixed square in non-icon modes: `burgerSize` drives `width`, `height`, `min-width`, `min-height` (declared twice in the `burger` element `attrMap`); under `text` / `icon-and-text` `plugins/sgs-blocks/includes/nav-menu-trigger-css.php::sgs_nav_bar_menu_trigger_css` writes `min-width: <burgerSize>` and `width: auto`, keeping `height` and `min-height` so the 44px touch-target floor survives.

**CLOSE side** lives in `sgs/nav-drawer`'s own `block.json` and mirrors the open side (same shared helpers, same control shape). `sgs/nav-drawer` owns the close button and `closeStyle` (default `"separate-x"`), rendered by its `render.php`. The close button's 2-state colour pairing (`toggleCloseColour` / `toggleCloseColourHover` / `toggleCloseColourGradient` on `supports.sgs.elements.close`, via `sgs_text_colour_decl()` + `sgs_hover_state_rules()`) is separate and complete.
1. **`closeLabel`** (string, default `"Close"`), the mirror of `triggerLabel`; `text-swap` renders `<span class="sgs-nav-drawer__close-text">`. ⛔ When it resolves empty the hardcoded `aria-label` `esc_attr__( 'Close menu', 'sgs-blocks' )` must SURVIVE.
2. **`closeIcon`** (object, default `{"source":"lucide","name":"x"}`), resolved through the same source-aware resolver `sgs/icon` uses (FR-41-30a), plus a fourth `closeStyle` value.

`closeStyle` is not `triggerMode`'s twin: `separate-x` and `text-swap` are the icon/text axis, but **`burger-morph` is a GLYPH choice** (a CSS-drawn two-bar `<span class="sgs-nav-drawer__close-bars">` reading as an X, no icon, no text). It keeps its name and three original values and carries a FOURTH, `icon-and-text`, and (U-11, FR-36-6) is a per-device tier object with a fifth value `trigger`, so it has no JSON `enum`; the allowed values live in `plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$sgs_nd_allowed_close_styles` and the editor option list, and `plugins/sgs-blocks/tests/php/run-close-control-standalone.php` asserts the two agree (a value accepted by one side and rejected by the other coerces silently to the default). ⛔ The new option's LABEL is "Both" (the 12-character `ToggleGroupControl` bound, Spec 35 Part O) while the STORED value stays `icon-and-text`; never shorten the value (it gives open and close one vocabulary). The other labels: `× icon` / `“Close” text` / `Morphed icon`. ⛔ The magnetic-pull trio (FR-41-31) is NOT mirrored onto the close button. ⚠ `closeIcon` / `closeLabel` route no CSS property, so they get no `supports.sgs.elements` members (§14.8.6(e)). `sgs/nav-drawer` is outside the §14.11 gate set (scoped to the two menu blocks); its acceptance is enum parity across both lists, a non-empty accessible name when `closeLabel` is empty, and a `closeIcon`-unset byte-identity proof (G15's shape).

The **"Menu Button"** panel carries `triggerIcon`, `triggerMode`, `triggerLabel`, `burgerSize` and the FR-41-31 magnetic-pull trio; its colours sit in the Colour panel's **Menu button** grouping (§14.9.6).

### 14.7 Three behaviours that are fixes, not controls

#### FR-41-13 — A parent item stays in its Hover state while its own dropdown is hovered

**Problem and effect.** The item's hover rule targets only `{$link_sel}:hover` and `{$link_sel}:focus-visible`, so when the pointer leaves the parent link and enters the dropdown it just opened, the parent snaps back to resting while its panel is open: an open panel with no visible parent reads as broken and breaks the "you are inside this branch" affordance of FR-36-4.

**Solution: FOUR rules, a mouse half and a keyboard half, PER FORK** (the wrapper between `<li>` and link differs per fork, FR-41-1's DOM table). The mouse half needs no `:has()`: `:hover` matches every ANCESTOR in the DOM tree of the hovered element, including an absolutely positioned panel's parent wrapper:

```
/* BAR, {bem_root} = sgs-nav-bar-menu */
{uid} .{bem_root}__submenu-root:hover > .{bem_root}__link
/* DRAWER, {bem_root} = sgs-nav-drawer-menu */
{uid} .{bem_root}__accordion-row:hover > .{bem_root}__link
```

⛔ The `>` child combinator is load-bearing: the trigger link is a direct child of the wrapper while every `.{bem_root}__sublink` sits deeper in `ul.{bem_root}__submenu`; a descendant space would start matching the moment a nested structure gains a `.{bem_root}__link`, and the point is that the PARENT keeps its look. ⚠ `.{bem_root}__submenu-root` is dropdown-only and needs no `--has-submenu` qualifier (the mega variant emits `.{bem_root}__mega`).

**The keyboard half genuinely needs `:has()`** (focus does not bubble like hover), keyed on the class present in both forks:

```
/* BAR */    {uid} .{bem_root}__submenu-root:has( .{bem_root}__submenu :focus-visible ) > .{bem_root}__link
/* DRAWER */ {uid} .{bem_root}__accordion-row:has( .{bem_root}__submenu :focus-visible ) > .{bem_root}__link
```

⛔ Never key the `:has()` on `.{bem_root}__submenu-wrap` (bar-only; a rule using it silently does nothing for the drawer, where nested keyboard navigation is most common).

**Binding implementation notes:**
1. "Panel is open" needs no extra condition (a closed bar panel is `display:none`; the drawer `<ul>` lives in a closed `<details>`).
2. Route each `:hover` variant through `sgs_hover_guarded_rule()`, not `sgs_hover_state_rules()` (the `:hover` is already in the built selector); emit each `:focus-visible` variant separately and unguarded.
3. All four rules out-rank the plain hover rule (mouse `(0,4,0)`, keyboard `(0,5,0)` vs `(0,3,0)`) and that is harmless because the declarations are identical. ⛔ Never use it to smuggle in different declarations.
4. The declarations are literally the Hover-state declarations from the same emitter call, not a hand copy. They cover plain text colour, the `swap` border colour and the item background on `::before`; a text Sweep and a border Sweep are excluded (copying `border-color` would reintroduce a solid bottom border under the transparent-border Sweep band). On the bar the mouse rule also covers the caret glyph.

⚠ `:has()` browser floor: Safari 15.4, Chrome/Edge 105, Firefox 121 (Baseline from 2023-12-19; Firefox is the binding constraint). On an older Firefox the keyboard half does not apply; the mouse half works everywhere. Graceful bounded degradation, which is why the halves are split.

#### FR-41-14 — The Highlight treatment suppresses per-item Hover/Current BACKGROUND

The item Background row's `Highlight` treatment (FR-41-25) renders the shared indicator element (`.sgs-nav-bar-menu__indicator` / `.sgs-nav-drawer-menu__indicator`), one background shape that slides between items. Per-item `itemBgHover` / `itemBgCurrent` would paint a second background behind the same item. There is no separate indicator attribute or panel: `Highlight` IS the third option on the item Background row's selector (FR-41-23) and the pill reads that row's OWN Hover swatch (`itemBgHover` / `itemBgHoverGradient`), per the colour-reuse rule (§14.0).

When `itemBgHoverTreatment === 'highlight'`:
- The Background row renders with its **Current** state OMITTED; the row, its Normal state and its **Hover** state always render (the Hover swatch is what the pill is painted in).
- `plugins/sgs-blocks/includes/nav-menu-css.php::sgs_nav_shared_item_state_css` skips the per-ITEM hover and current background declarations; the pill reads `itemBgHover` / `itemBgHoverGradient` as its fill.
- Text colours, the border (all three states), the radius and the menu button are unaffected.
- The stored `itemBgCurrent` is NOT cleared; switching back to `swap` restores it.

⛔ Per-STATE, never per-ROW (the row's Normal control and the Hover swatch the pill reads must stay): `states: [ normalBg, hoverBg, ...( 'highlight' !== itemBgHoverTreatment ? [ currentBg ] : [] ) ]`. ⛔ OMIT, never disable: the caller inlines the condition in the array literal (reference: `plugins/sgs-blocks/src/blocks/icon-list/edit.js::Edit`); a greyed-out control that does nothing is the failure this prevents. The conditionality stays statically resolvable (a spread of a conditional literal array is countable in both branches; a `.filter()` is not, FR-41-2). The treatment control carries plain-language help: "Highlight paints one shape that slides between items, using the Hover colour you picked above. It replaces each item's own current-page background, so that swatch is hidden while it's selected."

#### FR-41-15 — No hardcoded, ungated state/paint rule stands beside an operator control

Every `background` or `border` declaration in these blocks' CSS is either (a) gated on an operator attribute, (b) an attribute-driven `var()` whose writer exists, or (c) structurally incapable of the defect (a reset to `none`/`0`, a `forced-colors` rule, a zero-specificity `:where()` default). A hardcoded rule duplicating or overriding an operator attribute is a silent override (the class `check-hardcoded-render-defaults.js` F3b catches only when a matching attribute exists on the selector).

⛔ **Why the `background` SHORTHAND is the defect.** The text Sweep (FR-41-26) paints its gradient into `background-image` on the link and makes the glyphs transparent with `-webkit-text-fill-color: transparent`. An ungated `background:` shorthand on a hover state resets `background-image` to `none` and out-ranks the sweep's base rule: on hover the gradient is erased, the transparent fill survives and **legible text becomes near-invisible**. Silent both ways (`getComputedStyle( el ).color` still returns the operator's colour; the glyph paint is governed by `-webkit-text-fill-color`). Use `background-color:` longhands on any selector a Sweep can paint.

**Standing consequences (binding):**
- The item border is the item's own edge (FR-41-7); the line BETWEEN items is the Separators setting (FR-41-37). No second hardcoded between-item line may sit beside either (on a different element it never competes by specificity, so both paint). Neither the drawer's item-row `border-top` nor its static `style.css` twin exists.
- The current-page state has no hardcoded tint or left rule: Current colour, weight, background and border are the operator's `itemColourCurrent`, `itemFontWeightCurrent` (never-lighter guard, FR-41-6), `itemBgCurrent` / `submenuLinkBgCurrent`, `itemBorderColourCurrent`; the submenu link's Current colour reads `--sgs-nm-submenu-current-colour`, written from `submenuColourCurrent` (a custom property with a consumer and no writer only ever renders its fallback).
- The drawer's panel override zeroes the bar's panel border only while `submenuBorderWidth` is empty (`plugins/sgs-blocks/includes/nav-menu-submenu-css.php`).
- Featured sub-item paint is emitted only when the featured custom properties are written, with no hardcoded `primary` fallback and `background-color:` not the shorthand; there is no featured sub-item hover rule with a hardcoded background.
- Structural chrome kept and named: the drawer's resting sub-item indent (`border-left`). It returns to the census when the item-border mechanism extends to that element.
- Button resets are not paints (`background:none;border:0` on the mega-trigger and sub-toggle, `border:0` on the drill-down Back button `plugins/sgs-blocks/src/blocks/nav-drawer-menu/style.css::.sgs-nav-drawer-menu__drill-back-btn`). They return to the census when a stateful colour row (FR-41-23) targets that element (the shorthand would destroy a Sweep gradient exactly as above).
- Two accessibility rules stay: the `@supports not (background-color: color-mix(...))` burger hover rescue (longhand, `(0,1,0)`, beaten by every uid-scoped rule, FR-41-17a(c)) and the `@media (forced-colors: active)` burger border.
- The submenu panel's declarations are all attribute-driven with token fallbacks: `--sgs-nm-submenu-bg` / `--sgs-nm-submenu-bg-gradient` (from `submenuBg` / `submenuBgGradient`, empty-guarded, chained `surface-alt → surface → #fff` fallback); `min-width` from `submenuMinWidth`; per-corner `--sgs-nm-submenu-radius-{top-left|top-right|bottom-right|bottom-left}` via `sgs_corner_object_property_list()` (an unset corner keeps the 8px token); `--sgs-nm-submenu-border-width` / `--sgs-nm-submenu-border-style` with the colour from `sgs_border_states_css()` (Normal-only, no `suppress_edges`); the shadow is `filter:drop-shadow()` from `--sgs-nm-submenu-filter` (FR-41-9). The drill-down sub-panel's `background: var(--sgs-nm-submenu-bg, inherit)` is structurally load-bearing (`position:absolute; inset:0`, must be opaque); a submenu-panel GRADIENT attribute on that selector would return it to the census.

**Methodology.** A rule enters the census when it carries a `background` or `border` declaration not gated on an operator attribute, whatever its state, block, or form (literal concatenation or helper call), across BOTH surfaces: the PHP emitters (both `render.php` plus every `git ls-files plugins/sgs-blocks/includes | grep nav-menu` file) and each block's `style.css` (a scan of `render.php` alone reports a clean tree). Every hit is classified in writing: **GATED** (gate named), **DISMISSED** (structurally incapable, with the condition that would return it), **CENSUSED** (deleted or converted). ⚠ The scan is statement-aware, not variable-aware: a declaration built into an intermediate PHP variable and appended later is outside it (`$sgs_nm_featured_vars` is a live instance, harmless only because its declarations are custom-property assignments). **Enforcement is `plugins/sgs-blocks/scripts/check-ungated-paint-rules.py` (FR-41-35)**, a character-boundary parser over both surfaces whose `HARD_FAIL_BLOCKS` lists the two menu blocks; the script is the enforcement, not this prose.

### 14.7a The universal hover-treatment pairing

#### FR-41-23 — Every stateful colour row gets ONE paired hover-treatment selector, not a separate mechanism

"How should this property look when hovered?" is one question asked of every property; three independent mechanisms answering it (the Hover-colour swap, a border-only animation control, a background-only indicator panel) would make an operator learn three places. The selector sits directly beneath the Hover swatch of each qualifying row: a `ToggleGroupControl` with three options (a small reusable pattern, not a new shared component, FR-41-24):

| Option | Meaning | What renders |
|---|---|---|
| **None** | No visual change on hover for this property | The property does not change (the Hover swatch stays stored so switching back restores it) |
| **Swap** (default) | A plain colour change | What a 3-state row renders without a treatment: `sgs_emit_state_colour_css()` / `sgs_border_states_css()` with the Hover colour |
| **Sweep** (text, border) / **Highlight** (background only) | An animated transition | The property-specific mechanism below |

⛔ `Swap` is the DEFAULT for every row: an untouched block renders a plain Hover swap.

| Row | Attribute | Third option | Third-option mechanism |
|---|---|---|---|
| Item text | `itemColourHoverTreatment` | **Sweep** | glyph colour-sweep (FR-41-26); offered only when the row passes the Sweep eligibility test |
| Item background | `itemBgHoverTreatment` | **Highlight** | the shared sliding pill (FR-41-14/25), painted in the row's OWN Hover swatch |
| Item border | `itemBorderHoverTreatment` | **Sweep** | the directional band (FR-41-8); under `sweep` the Hover and Current border emissions are omitted for the swept edge |
| Submenu link text | `submenuColourHoverTreatment` | **Sweep** | the glyph sweep scoped to `.sgs-nav-bar-menu__sublink` / `.sgs-nav-drawer-menu__sublink`; eligibility-gated (the sublink paints its own background, so Sweep is omitted whenever any of its three state fills or its gradient is set) |
| Submenu link background | `submenuLinkBgHoverTreatment` | **None only** (enum `none`/`swap`, two options) | the pill is an ITEM-row mechanism; a sweep band on a vertical list has no precedent |
| Menu button icon colour | `burgerColourHoverTreatment` | **Sweep** | glyph sweep scoped to `.sgs-nav-bar-menu__burger` (bar-only); eligible only when `triggerMode` is not `icon` (a pure SVG has no glyphs to clip), `burgerBg` / `burgerBgGradient` / `burgerHoverColour` are unset (the button paints its own background in both states) and `burgerColourGradient` is unset |
| Menu button background | `burgerBgHoverTreatment` | **None only** (two options) | a single button: no siblings for a pill, no text baseline for a band |

⛔ `Highlight` is genuinely NOT offered outside the item Background row (the pill is defined by having sibling rows to slide between).

**Rows with NO selector, each a real boundary:** the nav bar background/text (`navBg*` / `navColour*`, one static wrapper, a 2-state Swap-only row with no `after` node); the item / submenu-link Current swatches (Current is not pointer-driven and has no hover lifecycle; it stays a plain third colour); the submenu panel background/border colour (Normal-only, FR-41-9); shadow colour (single-state).

⛔ **THE ITEM BACKGROUND ROW PAINTS ALL THREE STATES ON `{link}::before`.** The Normal, Hover AND Current fills are ALL emitted onto `.{uid} .{bem_root}__link::before` (same layer, `z-index: -1`, `border-radius: inherit`); no state's fill is emitted onto the link itself. This holds for `Swap` and `Highlight` (which skips the per-item emission); `None` emits no hover fill. **Why:** a Hover fill painted directly on the link would make FR-41-26's "Condition 1 passes always" false the instant `itemBgHover` is set, and the chosen Sweep would clip the new fill to the letter shapes. Emission is in `sgs_nav_shared_item_state_css`. `::before` is uncontested (the border-sweep band owns `::after`, the text sweep claims no pseudo-element): three states are three declarations on three selectors. ⚠ `{link}{position:relative;isolation:isolate;}` is emitted whenever ANY of the three fills is set (`'' !== $item_bg_normal_decl || '' !== $item_bg_hover_decl || '' !== $item_bg_current_decl`); duplication with FR-41-8's `position:relative` is harmless. Cited by FR-41-26's eligibility table, item-text row, condition 1.

⛔ The selector must choose AMONG the same three fixed options everywhere; no bespoke per-row enum, except the two explicit 2-option rows (which drop the unavailable option rather than rendering it disabled).

#### FR-41-24 — Component shape: block-private, not a new shared component

No other block in the framework offers a hover-treatment sub-control beneath a colour row (`git grep -n -i "hover-treatment\|hoverTreatment" -- plugins/sgs-blocks/src` finds only these blocks, `business-info`'s sweep precedent and unrelated GSAP naming). **Decision:** block-private, not an export from `plugins/sgs-blocks/src/components/` (an abstraction from a sample of one). Each selector is a plain `ToggleGroupControl` + `ToggleGroupControlOption` mounted through FR-41-16's `after` slot, reading its own row's attributes directly: `ItemTextTreatment`, `ItemBgTreatment`, `ItemBorderTreatment`, `SubmenuTextTreatment`, `SubmenuLinkBgTreatment` in `plugins/sgs-blocks/src/shared/nav-menu-panels/ColourRowExtras.js`; `BurgerIconTreatment`, `BurgerBgTreatment` (bar-only) in `plugins/sgs-blocks/src/blocks/nav-bar-menu/BarColourRowExtras.js`. ⛔ None is exported from `plugins/sgs-blocks/src/components/` until a SECOND block asks for the pairing (§14.12); then promote to a `primitives` export. **Storage:** one `"type": "string"` attribute per applicable row, PHP-validated, no JSON `enum` (FR-41-8's reasoning), default `"swap"` for every row including the 2-option ones.

#### FR-41-25 — The Highlight treatment IS the sliding pill

`Highlight` on the item Background row is the shared sliding pill; no separate indicator attribute or Indicator panel. FR-41-14's per-STATE omission applies (stored values preserved, the emitter skips per-item hover/current fills). Trigger: `'highlight' === itemBgHoverTreatment`. ⛔ There is no `indicatorColour` / `indicatorColourGradient`: a separate pill colour pair would break the colour-reuse rule. Highlight paints in `itemBgHover` / `itemBgHoverGradient`, the swatch `Swap` and (on the text row) `Sweep` read. The help text is FR-41-14's.

Conditional rows in JS: write a spread of a TERNARY, never a spread of a boolean-`&&` (`...( cond && {...} )` throws "false is not iterable" in an ARRAY literal): `...( showMarkerColour ? [ markerColourRow ] : [] )`. A whole ROW may be omitted with `cond && row` (`SgsColourPanel` runs `rows.filter(Boolean)`); the spread-of-ternary is for omitting a STATE inside a row.

#### FR-41-26 — The Sweep treatment on TEXT: the shipped precedent, adopted directly

The technique is shipped: `sgs/business-info`'s attribution link hover is a glyph colour sweep (`plugins/sgs-blocks/src/blocks/business-info/style.css::.sgs-business-attribution .sgs-business-info__link`, with the `--sgs-bi-link-hover-text` / `--sgs-bi-link-hover-bg` emission in `plugins/sgs-blocks/src/blocks/business-info/render.php`). This Part adopts the sweep, not its underline-growth accessory. Emitted by `plugins/sgs-blocks/includes/nav-menu-treatments.php::sgs_nav_shared_text_sweep_css`:

```css
{link} { position: relative; color: <normal colour, or inherit>;
  background-image: linear-gradient( to right, <HOVER colour> 50%, <NORMAL colour, or currentColor> 50% );
  background-size: 200% 100%; background-position: 100% 0; background-repeat: no-repeat;
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  transition: background-position 300ms ease; }
{link}:hover, {link}:focus-visible { background-position: 0 0; }
@media (prefers-reduced-motion: reduce) { {link} { transition: none; } }
@media (forced-colors: active), print { {link} { background-image: none; -webkit-text-fill-color: currentColor; } }
@supports not ((background-clip: text) or (-webkit-background-clip: text)) {
  {link} { background-image: none; -webkit-text-fill-color: currentColor; color: <NORMAL>; }
  {link}:hover, {link}:focus-visible { color: <HOVER>; } }
```

⛔ The `@supports` fallback colour is the NORMAL colour, the HOVER colour arriving via its own rule in the same block (seeding the base with Hover renders a permanently hover-coloured menu on exactly the browsers least able to cope). The hover half routes through `sgs_hover_state_rules()` (FR-41-3 rule 1; `hover-guard/check.js`, §14.11 G2, scans the PHP emitters). ⛔ The fallback is MANDATORY, not belt-and-braces (`.claude/rules/colour-emission.md`): without `background-clip:text` support the transparent fill makes the text invisible. Emit it with `plugins/sgs-blocks/includes/helpers-tokens.php::sgs_text_colour_gradient_fallback_rule`, never a hand-rolled rule; it sits beside the `forced-colors`/`print` rescues (a supporting browser in a special mode), not instead of them.

Safe on the item link without the `textSharesElementWithBackground` workaround because the link paints no background itself (the item background paints on `{link}::before`, FR-41-23, freeing `::after` for the border band). ⛔ Text-sweep uses ZERO pseudo-elements and is colour travel only; an animated line as well is the Border row's own Sweep. Its direction is fixed left to right (the angle-driven primitive of FR-41-38 governs the border and separator bands).

##### Sweep eligibility: one predicate, applied to every text/icon row

`Sweep` is offered on a text/icon colour row only when ALL of the following hold:
1. **The element paints no background of its own, from ANY source (attribute-driven OR static/hardcoded CSS), in ANY state.** `background-clip: text` clips the whole background-painting area to the glyph shapes, and a `background` shorthand resets the sweep's `background-image` (`textSharesElementWithBackground`, `.claude/rules/colour-emission.md`). The condition is about what the RENDERED element paints: a hardcoded rule, a helper-emitted rule, a drawer-only rule and a `:hover` rule all count; every state's background, flat AND gradient, is a blocking input (`burgerHoverColour` is a real hover `background-color` on the burger; `submenuLinkBgHover` / `submenuLinkBgCurrent` block the sublink sweep like `submenuLinkBg`). One named exception NOT in the predicate: the static `@supports not (background-color: color-mix(...))` burger hover fallback in `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css` (a longhand, so the failure is a cosmetic clip not invisible text, and no attribute controls it). ⛔ Do not delete that fallback to "fix" Sweep; it is carried as residual FR-41-17a(c).
2. **The row carries no Normal-state gradient** (both write `background-image` on one selector; if the gradient wins, resting text is transparent over nothing).
3. **The element actually has glyphs.**

When any condition fails, the `Sweep` segment is OMITTED and the row renders as a two-option `None`/`Swap` control (omit, don't disable).

| Row | Condition 1 (own background, all states) | Condition 2 | Condition 3 | Net |
|---|---|---|---|---|
| **Item text** `.{bem_root}__link` | passes always: all three item-background fills paint on `{link}::before` (FR-41-23). This rests on that `::before` guarantee, not on the element by nature | `itemColourGradient` empty | always | offered unless `itemColourGradient` is set |
| **Submenu link text** `.{bem_root}__sublink` | `submenuLinkBg` AND `submenuLinkBgHover` AND `submenuLinkBgCurrent` AND `submenuLinkBgGradient` all empty (it paints directly, no `::before`; these default to tokens, FR-41-36, so Sweep is not offered until an operator clears them) | `submenuColourGradient` empty | always | offered only on a sublink with no background in any state and no text gradient |
| **Menu button icon** `.sgs-nav-bar-menu__burger` (bar-only) | `burgerBg` AND `burgerBgGradient` AND `burgerHoverColour` all empty | `burgerColourGradient` empty | `triggerMode !== 'icon'` | offered only on a text-bearing button with no background in either state and no icon gradient |
| **Item border** (band on `::after`) | none (a separate element paint) | none | `glyphGuard` on `itemBorderStyle`: not for `dashed` / `dotted` / `double` / `groove` / `ridge` / `inset` / `outset` | offered for a solid style |
| **Separators** (band on `::before`) | the line paints no background | none | line style `dashed` / `dotted` | offered for a solid line; decided by `SgsSeparatorControl` and `sgs_separators_line_css()`, not a `sweepEligibility` row |

⚠ The FEATURED sub-item paints a background directly on `.{bem_root}__sublink` (`featuredBg` / `featuredBgGradient`, `--sgs-nm-featured-bg`). Resolution: the emitter scopes the sublink sweep selector to exclude featured sub-items (`{uid} .{bem_root}__subitem:not(.{bem_root}__subitem--featured) .{bem_root}__sublink`), so `featuredBg` is NOT in condition 1. ⛔ If the emitter does not scope it, `featuredBg` AND `featuredBgGradient` MUST be added to condition 1 and Sweep removed from the whole row. ⚠ `burgerColourHover` (icon/text COLOUR on hover) is NOT a blocking input and must not be added (§14.8.1 keeps it apart from `burgerHoverColour`). ⛔ Condition 1 is not satisfiable by moving backgrounds onto `::before` (churn on a shipped mechanism, and the burger's `::before` collides with the FR-41-31 magnet).

##### The predicate is evaluated twice: in the UI AND in the emitter

⛔ The predicate is the EMISSION rule; the inspector reflects it. The emitter evaluates the identical predicate before honouring any stored `'sweep'` and, when false, resolves to `'swap'` regardless of the database. Sweep CSS is never emitted while it is false. A UI-only gate fails because the inputs are OTHER attributes the operator can change afterwards: setting `submenuLinkBg` after choosing sublink Sweep would clip the new background to the letter shapes; setting `burgerBg` likewise; switching `triggerMode` back to `'icon'` leaves no glyphs and the transparent fill renders the icon button empty. The stored `'sweep'` is KEPT (clearing would discard a choice that becomes valid again, against the FR-41-14 / FR-41-23 discipline); the EMISSION is gated, and clearing the blocking attribute restores the swept render.

##### One declared source, two evaluators: the predicate is DATA, not a function

The emitter (PHP) and `edit.js` (React) both need it and the inspector cannot call PHP, so: **ONE DECLARATIVE SOURCE, READ BY BOTH SURFACES; neither re-derives the rule.** Each block declares it in its own `supports.sgs.sweepEligibility` (`plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json`, `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json`), the framework's shape for a fact both halves need (PHP already reads `supports.sgs.*`: `plugins/sgs-blocks/includes/helpers-container.php::sgs_block_wants_intrinsic_columns`, `plugins/sgs-blocks/includes/hover-effects/resolve.php`, `plugins/sgs-blocks/includes/image-controls.php`; each block's `index.js` imports its own `block.json`). The PHP reader `plugins/sgs-blocks/includes/nav-menu-treatments.php::sgs_nav_shared_resolved_treatments( array $attributes, string $block_name = 'sgs/nav-bar-menu' )` takes the block slug from each `render.php`. ⛔ No separate JSON file, PHP constant or JS constant (a second artefact to sync). The bar declares four rows (`itemColourHoverTreatment`, `submenuColourHoverTreatment`, `burgerColourHoverTreatment`, `itemBorderHoverTreatment`), the drawer three (item text, submenu text, item border). Three keys per row, nothing else:

```json
"itemColourHoverTreatment":  { "blockingBackgroundAttrs": [], "blockingGradientAttrs": [ "itemColourGradient" ], "glyphGuard": null },
"submenuColourHoverTreatment": { "blockingBackgroundAttrs": [ "submenuLinkBg", "submenuLinkBgHover", "submenuLinkBgCurrent", "submenuLinkBgGradient" ], "blockingGradientAttrs": [ "submenuColourGradient" ], "glyphGuard": null },
"burgerColourHoverTreatment": { "blockingBackgroundAttrs": [ "burgerBg", "burgerBgGradient", "burgerHoverColour" ], "blockingGradientAttrs": [ "burgerColourGradient" ], "glyphGuard": { "attr": "triggerMode", "disallowedValues": [ "icon" ] } }
```

`blockingBackgroundAttrs` (condition 1) and `blockingGradientAttrs` (condition 2): eligible only when every named attribute is empty. `glyphGuard` (condition 3): `null` always passes, else ineligible when `attributes[attr]` is in `disallowedValues`. ⛔ `itemColourHoverTreatment`'s empty array is a DECLARED FACT, true only because of FR-41-23's `::before` rule; write `[]` explicitly, and if any item-background fill ever moves off `::before` the array gains that attribute in the same change. `edit.js` omits the `Sweep` segment when false and writes no logic of its own. The emitter reads the entry via `WP_Block_Type_Registry::get_instance()->get_registered( $block_name )->supports['sgs']['sweepEligibility']`, resolves to `'swap'` when false (no sweep `background-image`, `background-clip`, `-webkit-text-fill-color`, `@supports` fallback or rescue), keeps the stored value, and merges registered attribute defaults underneath the stored attributes first (a programmatic writer omitting `triggerMode` is read at its default `'icon'`, which its own `glyphGuard` disallows). If a new blocking input is found it is added to the DECLARED ROW (one edit, both surfaces). The resolved treatment, not the stored one, is what every downstream rule keys on. Acceptance: §14.11 G14 (f) and (g); (g) proves the two surfaces AGREE on a stored value straddling the boundary.

##### When there is no hover colour to swap to

The fallback to `'swap'` emits the row's Hover swatch; if that is empty, nothing is emitted for that property's hover state and the element keeps its Normal colour. ⛔ The emitter substitutes no colour of its own, falls back to no token and derives none from the background (a hardcoded render default, the `check-hardcoded-render-defaults.js` F3b class, un-clearable by the operator). An honest residual: an operator who picked Sweep and never filled the Hover swatch can lose hover feedback on that property when a blocking attribute is set (the border treatment, FR-41-6, is unaffected). Recorded at FR-41-17a(d).

##### Sweep + a hover text-decoration: the underline must travel too

`text-decoration-color` is NOT governed by `-webkit-text-fill-color`, so with `itemTextDecorationHover` (or the `submenu` sibling) on a swept row the glyphs would change while the line stays at the resting colour. ⛔ The rule keys on the RESOLVED treatment (after the eligibility re-check; read it into a variable once and have every downstream rule read that): when the resolved `...HoverTreatment` is `'sweep'` AND that prefix's hover text-decoration resolves to a permitted non-`none` value, the block-private emitter (FR-41-21) also sets `text-decoration-color` to the row's own Hover swatch in the same `sgs_hover_state_rules()` call. ⚠ No transition on `text-decoration-color` (it swaps at the start of the travel; competing transitions at different rates is the "looked broken" failure `sgs/business-info` fixed). Only item-text and submenu-link-text rows (the burger has no typography trio, the border row sweeps a band). Gated: §14.11 G14(e). ⚠ Condition 2 also protects `itemSmartContrast` (FR-41-5): Sweep's transparent fill overrides the resolved foreground, and the two are mutually exclusive by construction on the item text row; say so in the toggle's help text anyway.

#### FR-41-27 — `itemSmartContrast` sits in the General-tab Accessibility panel

The toggle, default and two-case resolution are FR-41-5's. Its inspector home is §14.9.5 "Accessibility", beside `navLabel` (both are "does the menu behave safely" controls).

#### FR-41-28 — One border/divider mechanism for BOTH blocks

The bar and the drawer are two separate blocks, each with its own uid and inspector, rendering the identical `itemBorderWidth` / `itemBorderColour*` / `itemBorderHoverTreatment` mechanism onto the same class name (FR-41-1). There is no bar-specific or drawer-specific border path: one `SgsBorderControl` mount and one `sgs_border_states_css()` call apply to both.

#### FR-41-29 — "Current-page weight" as a block-private field inside the Typography panel

A `SGS_FONT_WEIGHT_OPTIONS`-fed `SelectControl` writing `itemFontWeightCurrent`, NOT built into the shared `TypographyControls` (which has no Current branch and, per FR-41-21's "do NOT extend the shared helper" ruling, stays so; the Hover trio is adopted because the component already renders it and `typographyAttrKeys()` already names its keys, whereas a Current trio would change the shared component). It sits at the bottom of the Typography panel's **Menu** target (FR-41-22), beneath the shared hover trio row (§14.9.10). ⛔ It is the ONLY Current-state typography field (`itemTextDecorationCurrent` is not declared, FR-41-6): Current gets ONE signal, weight.

#### FR-41-30 — Icon Picker drives two icons: the menu button and the sublink marker

`plugins/sgs-blocks/src/components/IconPicker/IconPicker.js` offers four libraries (Lucide, Emoji, WordPress, Dashicons), search and categories; `plugins/sgs-blocks/src/blocks/icon/edit.js` is the live adopter pairing it with a 2-state gradient-capable colour row, the precedent both wirings copy.

**FR-41-30a — the burger trigger icon.** `triggerIcon` (object, default `{"source":"lucide","name":"menu"}`) via an `IconPicker` in the "Menu Button" panel (§14.9.3), visible when `triggerMode` includes an icon. The emitter resolves the SVG through the same source-aware resolver `sgs/icon` uses (`plugins/sgs-blocks/includes/nav-menu-treatments.php::sgs_nav_shared_icon_markup`), never a bespoke lookup. Its colour is the `burgerColour` / `burgerColourHover` row; `Sweep` follows FR-41-26 eligibility.

**FR-41-30b — the submenu marker (drawer-only).** The sublink marker (`.sgs-nav-drawer-menu__sublink-marker`) is operator-chosen: `sublinkMarkerIcon` (object, default `{"source":"lucide","name":"chevron-right"}`) via `IconPicker`, and the colour family `sublinkMarkerColour` / `sublinkMarkerColourHover` / `sublinkMarkerColourCurrent` plus `*Gradient` counterparts (string, `""`), declared only in `nav-drawer-menu`, in the **Submenu — Items** panel. By default the marker inherits the sublink text colour and no picker shows. ⛔ The picker is revealed only when `sublinkMarkerIcon` is non-default (keyed on the icon, NOT on whether `sublinkMarkerColour` is set, since an empty string is indistinguishable from untouched); omitted, not disabled (`sublinkMarkerIconIsCustom && textRow( ... )` in `plugins/sgs-blocks/src/blocks/nav-drawer-menu/edit.js::Edit`). Once revealed it is a full Normal/Hover/Current + gradient row matching `sgs/button`'s icon-colour control (SVG-stroke gradient for lucide/wp-icon, text gradient for dashicon/emoji, via `sgs_icon_gradient_css()`). The marker is `aria-hidden="true"` decoration, so an unset colour inherits `currentColor` and follows Hover and Current. Conditional inclusion of a whole row needs no new `SgsColourPanel` key (FR-41-16's `rows.filter(Boolean)`).

### 14.7b Motion and placement

#### FR-41-31 — The menu button has an optional magnetic pull

Block-private, Tier V, reusing the shared `fx-magnet` runtime (Spec 38 FR-38-30) at the CSS/JS layer only: no new JS or CSS module, no DB row, no fx-panel or roster registration. One two-line value-preserving, design-gated edit to the existing `plugins/sgs-blocks/assets/css/fx-magnet.css` exposes its transition as `--sgs-magnet-transition` so this block reads it instead of duplicating it (no rendered change for any existing adopter, §14.11 G1(e)). The roster route is wrong on two counts: both nav blocks are deliberately EXCLUDED from the fx-panel roster (a functional nav element gets no effects panel), and the button is a DESCENDANT of the block root while the generic injector reaches only the root.

| Attribute | Type | Default | Control |
|---|---|---|---|
| `triggerMagnetEnabled` | boolean | `false` | `ToggleControl` |
| `triggerMagnetRadius` | number | `120` | `RangeControl` min 20 max 400 |
| `triggerMagnetStrength` | number | `24` | `RangeControl` min 2 max 80 |

⛔ The RangeControl bounds match `fx-magnet.js`'s own clamp (do not widen without changing the clamp first). ⛔ No axis control (a square button falls back to the runtime's `'both'`). Panel: "Menu Button" (§14.9.3), Design tab, after the size control; help text "Makes the menu button lean toward the visitor's cursor as they approach it. Off automatically on touch devices and when reduced motion is requested."

**Render wiring (on the `<button class="sgs-nav-bar-menu__burger">` only; bar-only).** When enabled emit `data-sgs-fx="magnet" data-sgs-fx-magnet-radius="{value}" data-sgs-fx-magnet-strength="{value}"` (each `absint()` then `esc_attr()`); when disabled, no attribute. ⛔ No `view.js` change or enqueue code: the motion registry's enqueue is markup-sniffed (it regexes the rendered HTML for `data-sgs-fx="..."`). ⛔ One companion rule is REQUIRED in the same change, in `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css`, because the magnet's transition and the burger's hover-background transition are equal specificity and the later stylesheet would silently kill one (an intermittent, enqueue-order bug):

```css
.sgs-nav-bar-menu__burger[data-sgs-fx="magnet"] {
  transition: background-color var(--wp--custom--transition--fast, 150ms ease),
              var(--sgs-magnet-transition, transform 180ms ease-out);
}
```

⛔ The magnet half of that declaration is READ from a shared custom property, never retyped. `plugins/sgs-blocks/assets/css/fx-magnet.css` (registered by `plugins/sgs-blocks/includes/class-sgs-motion-registry.php` as `'magnet' => 'assets/css/fx-magnet.css'`) declares `transition: transform 180ms ease-out`; copying the literal makes the number true in two places. The shared file exposes the value it owns: `[data-sgs-fx="magnet"] { --sgs-magnet-transition: transform 180ms ease-out; transition: var( --sgs-magnet-transition ); }`, and the nav rule's `var()` carries the identical literal as its fallback. ⚠ A custom property INHERITS to the element's whole subtree (harmless here); a descendant that needs to know it is inside a magnet keys on the `[data-sgs-fx="magnet"]` ATTRIBUTE, which does not inherit (no `--sgs-magnet-transition: initial` resets). This is a design-gated shared-file touch; acceptance rides G1 as a fifth proof (every existing magnet element renders a byte-identical computed `transition`).

⚠ **Reduced motion.** The companion rule `.sgs-nav-bar-menu__burger[data-sgs-fx="magnet"]` is `(0,2,0)` and would beat the shared kill switch (`[data-sgs-fx="magnet"]` under `prefers-reduced-motion: reduce`, `(0,1,0)`, `transform:none; transition:none`); what rescues it is the pre-existing `!important` rule `.sgs-nav-bar-menu__burger` under `reduce` (`transition-duration: 0.01ms`) in `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css` (the drawer's `style.css` carries its own for its three selectors). The companion declares no `transform`, so the kill switch's `transform: none` is unopposed. ⛔ Do NOT also wrap the companion in `@media not (prefers-reduced-motion: reduce)` (a second mechanism for an outcome an unremovable rule already guarantees) and do NOT give it `!important` (it would beat the rescue). The dependency is asserted at §14.11 G9. **Acceptance: §14.11 G17.** With `triggerMagnetEnabled` false the markup carries no magnet attribute AND no magnet module or stylesheet is enqueued (assert the asset's absence).

#### FR-41-39 — Sibling dim: the OTHER items change while one is hovered

**Status: BUILT** (U-6, M-24). `sgs/nav-drawer-menu` and `sgs/icon-list` carry `siblingDimColour` (+`Gradient`) and `siblingDimOpacity`; while one item of a list is hovered or keyboard-focused, every OTHER item of that list takes the dim values (each list on its own). Built by `plugins/sgs-blocks/includes/helpers-item-effects.php::sgs_sibling_dim_css`: one hand-built `:has()` rule wrapped with `sgs_hover_media_wrap()` (never `sgs_hover_guarded_rule()`, which splits its selector on every comma) plus a separate keyboard rule keyed on `:focus-visible` (never `:focus-within`, which a tap on an accordion `<summary>` would hold), written `list:has(> item :focus-visible)` with ONE level of `:has()` (nested `:has()` is invalid; `plugins/sgs-blocks/tests/php/run-u6-u7-item-markup-standalone.php` asserts no nesting). Not on `sgs/nav-bar-menu` (no reference dims bar items; Bean). The colour row carries a `states` exemption (a pointer-driven state); a dimmed colour below 4.5:1 is transient, reported by the contrast warning, never clamped.

#### FR-41-40 — Two-copy label roll, and the trigger's hover and open words

**Status: BUILT** (U-6, M-25). `labelRoll` (`''` | `up` | `up-scale`) on `sgs/nav-bar-menu` (items and trigger word), `sgs/nav-drawer-menu` and `sgs/icon-list`. Off emits no extra markup; on, the label gains an `aria-hidden` copy and rolls to it on hover or keyboard focus inside an `overflow:clip` inline grid, with no transform under reduced motion. One timing pair per block (`itemMotionDuration`, `itemMotionEasing` + `Custom`) times every item effect. The trigger adds `triggerHoverLabel` and `triggerOpenLabel` (FR-36-27's swap-label): the copies bind `aria-hidden` to `state.isOpen`, so the accessible name is the visible word (WCAG 2.5.3) and open beats hover.

#### FR-41-41 — Drawer row extras: ornament, expander glyph, per-item media

**Status: BUILT** (U-7, M-22 and M-15). `sgs/nav-drawer-menu` only. `itemOrnament` per tier (`none` | `index` | `icon`): a decorative two-digit counter (`content: counter() / ""`) or `itemOrnamentIcon` with an optional crossfading `itemOrnamentIconHover`, plus `itemOrnamentSize`, `itemOrnamentColour` (+`Hover`) and `itemOrnamentGap`; the colour row carries a `gradient` exemption (one span holds a counter or an SVG glyph; no single gradient paints both). `itemExpanderIcon` and `itemExpanderRotate` replace the hardcoded chevron and its 180 degree turn. `itemMedia: featured-image` shows each linked page's featured image beside its label (custom links show none; a GIF or WebP is served at `full` so it keeps animating), revealed per tier by `itemMediaReveal` (`none` | `always` | `hover`, growing from width 0 on hover or keyboard focus) and sized by `itemMediaWidth` / `itemMediaHeight` per tier and `itemMediaRadius`. The image is decorative (`alt=""`).

#### FR-41-32 — Cursor-reactive field: eligible, deliberately NOT offered

A capability someone will expect, named as not built with the reason. (a) `sgs/nav-bar-menu` declares `containerKind: "layout"`, so it qualifies structurally. (b) Not offered because the only route is `supports.sgs.fx.motionSurface: true`, which opens a panel of nine effects at once (cursor-field, generative-background, grid-dots, morph, motion-path, particles, scrub, wave-gradient, plus magnet, which would need subtraction via `providesNatively` to avoid colliding with FR-41-31); the effects system cannot offer ONE effect without its `requires` sibling group, and the panel-bloat containment rule (`plugins/sgs-blocks/scripts/generate-fx-qualifying-blocks.py`) keeps functional blocks (navigation, header, footer) off the effects panel. (c) Revisit when a per-block, per-effect motion selection system exists. ⛔ No controls, attributes or panel placement are designed for this, and no bespoke one-off wiring is built to route around the containment rule.

#### FR-41-33 — Border COLOUR joins the global Colour panel; width, style and radius stay with the element

Owner-locked, decided on merits, knowingly diverging from a generic framework rule.

| Property | Home | Control |
|---|---|---|
| Border **width**, **style**, **radius** | the element's own panel: "Menu item" (§14.9.7), "Submenu — Container" (§14.9.9) | `SgsBorderControl` with `showColour={ false }` |
| Border **colour**, all states | the global Colour panel (§14.9.6) as an ordinary row beside fill and text | `SgsColourPanel` row: 3 states on the item, Normal-only on the panel |

`SgsColourPanel`'s docblock names border colour as one of three documented exemptions (with overlay and shadow colour). This block's redesign is a side-by-side comparison of every element's colours across three states, and border colour must coordinate with the fill and text beside it; width, style and radius need no such comparison. A considered block-scoped exception; the general rule is unchanged and no other block's inspector moves.

**Feasibility, checked:**
1. ⛔ `SgsBorderControl`'s colour picker is suppressed only through the additive **`showColour`** prop (boolean, default `true`) removing the `.sgs-border-control__colour` `FlexItem` (omitting the colour props would render an empty picker). Every other mount is byte-identical (§14.11 G1; the mount roster is a live grep, never a cached count). ⛔ `showColour={ false }` makes TEN props INERT, and that ignore-list is documented on the component's docblock: `colourStates`, `colourValue` / `onColourChange`, `colourGradientValue` / `onColourGradientChange`, `colourLinked`, `colourLabel`, `clearable`, `enableAlpha`, and `contrastAgainst` / `contrastLabel` / `contrastLargeText` (the dangerous one: a caller can wire a WCAG contrast check that then silently never runs). `borderStyle` is NOT on the list (item 2 re-parents it). These blocks' own mounts pass none of the ten; the border colour rows carry `contrastAgainst` / `contrastLargeText: true` in the Colour panel (§14.9.6 / FR-41-17), where the control that reads them renders.
2. ⚠ `borderStyle` rides INSIDE the colour popover (`styleValue`/`onStyleChange` forwarded as `borderStyle`/`onBorderStyleChange`), so under `showColour={ false }` `SgsBorderControl` renders the existing shared `plugins/sgs-blocks/src/components/BorderStyleControl.js::BorderStyleControl` (exported from `plugins/sgs-blocks/src/components/index.js`; already used by `GradientCapableColourControl.js` and `DesignTokenPicker.js`) as a sibling in the same row. ⛔ Reuse it; a hand-rolled `SelectControl` would re-widen the vocabulary beyond WP core's Solid / Dashed / Dotted (the component is a `ToggleGroupControl` with `isDeselectable`, "None" reached by deselecting; props `{ label?, value, onChange }`, `onChange` receives `''` on deselect). ⚠ Gate the sibling exactly as `GradientCapableColourControl` does: only when `typeof onStyleChange === 'function'`, so a caller that never wired border style gets no orphan control (G1(d)).
3. `ShadowControl` is a partial precedent: it externalised its colour OWNERSHIP (the caller owns `{name}Colour`), but still RENDERS the picker inside `ShadowStateBuilder`; `showColour` is behaviour the control did not have.

⛔ The split is exclusive: exactly ONE live control writes each attribute (`check-duplicate-controls.js` bans a duplicate writer). Acceptance: §14.11 G18.

### 14.8 Attribute reconciliation

Existing names WIN; new attributes extend the existing convention (`itemColourHover` exists, so its sibling is `itemColourCurrent`). The attributes live in `plugins/sgs-blocks/src/blocks/nav-bar-menu/block.json::attributes` and `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json::attributes`, which are the source of truth for names, types and defaults (query the framework DB: `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT attr_name, css_property FROM block_attributes WHERE block_slug IN ('sgs/nav-bar-menu','sgs/nav-drawer-menu')"`). The bar / drawer / both split per attribute is recorded in `.claude/reports/2026-09-14-nav-menu-split-attribute-classification.md`.

#### 14.8.1 Colour-row attributes

The 3-state rows are `itemColour*`, `itemBg*` (`itemBgHover` is ALSO the Highlight pill's fill, FR-41-25: one swatch, three treatments), `submenuColour*`, the submenu link background (`submenuLinkBg*`), and the item border colours (`itemBorderColour*`). `submenuBg` (the PANEL) is Normal only (FR-41-9). `navBg*` and `navColour*` are 2-state: the nav bar keeps two states, not three (a bar is never "the current page"). The Menu Button family (`burgerColour`, `burgerColourGradient`, `burgerColourHover`, `burgerBg`, `burgerBgGradient`, `burgerHoverColour`, `burgerSize`) is 2-state, in the "Menu Button" panel plus the Colour panel's **Menu button** grouping. `itemTextDecoration` is Normal state, its `enum` carries `overline` as a fifth value (FR-41-6) and it has an explicit `attrMap` entry (§14.8.6a); its Hover sibling is `itemTextDecorationHover` (FR-41-6 / FR-41-21) and there is no Current sibling.

⛔ **`burgerColourHover` and `burgerHoverColour` are two different attributes governing two different properties; only this table disambiguates them** (both `{"type":"string","default":""}`, names anagram-close):

| Attribute | Governs | Emission |
|---|---|---|
| `burgerColourHover` | the ICON/TEXT colour on hover | `color:` on `.sgs-nav-bar-menu__burger` via `sgs_hover_state_rules()`; manifest `burger.states.hover.attrMap."css:color"`; the Hover half of the **Icon colour** row |
| `burgerHoverColour` | the BUTTON BACKGROUND on hover | `background-color:` on the same element; manifest `burger.states.hover.attrMap."css:background-color"`; the Hover half of the **Button background** row (Normal half `burgerBg`) |

⛔ Neither is renamed (the zero-renames rule, §14.8.4). The two rows carry DIFFERENT treatment attributes for the same reason (`burgerColourHoverTreatment`, 3-option and Sweep eligibility-gated, vs `burgerBgHoverTreatment`, 2-option); crossing the attributes crosses the treatments.

#### 14.8.2 Other existing attributes

No control in this Part touches: `padding`, `margin`, `ref`, `collapsePoint`, `drawerRef`, `featuredItemIds`, `navLabel`, `gap`, `listColumns`, the `item*` typography families (+ `*Unit`), every `featured*`, `itemMagnetEnabled`, `sgsCustomCss`, `submenuAlign`, `submenuCaret`, `submenuCloseGrace`, `submenuMinWidth`, `submenuPadding`. ⚠ `itemMagnetEnabled` (item-level magnet, Effects panel §14.9.11) is a different attribute from FR-41-31's `triggerMagnetEnabled`; neither reads the other.

#### 14.8.4 Attributes declared by this Part

Names, types and defaults are in the two `block.json` files; the grouped list and the decisions that are not obvious from a manifest:
- **Current and gradient completions (both blocks):** `itemColourCurrent`, `itemBgCurrent`, `itemBgCurrentGradient`, `itemBgHoverGradient` (completes the row's three-state gradient set and is what the Highlight pill paints with when a gradient is chosen, FR-41-25), `submenuColourCurrent` (`"text"`), `submenuBgGradient` (the PANEL's Normal-only gradient sibling, required by `sgs_custom_property_gradient_decls()`).
- **Weight and trio:** `itemFontWeightCurrent` (string `"600"`, matching `itemFontWeight`; FR-41-6), and the six `showHover` trio attributes `itemTextDecorationHover`, `itemTextTransformHover`, `itemFontWeightHover`, `submenuTextDecorationHover`, `submenuTextTransformHover`, `submenuFontWeightHover` (strings; the weights are string-typed). `itemSmartContrast` (boolean `false`, FR-41-5).
- **Item border:** `itemBorderWidth` (box object, base-only), `itemBorderStyle`, `itemBorderRadius`, `itemBorderColour` / `Hover` / `Current` (`"border-light"` / `"accent"` / `"accent"`; no gradient sibling; authored in the Colour panel, FR-41-33), `sweepAngle` (number `90`, FR-41-38, shown only when `itemBorderHoverTreatment==='sweep'`).
- **Submenu:** `submenuLinkBg` / `Hover` / `Current` (`"surface"` / `"primary"` / `"surface-alt"`) and `submenuLinkBgGradient`; `submenuAnimation` and `submenuTopOffset` (bar); `submenuBorderWidth`, `submenuBorderStyle`, `submenuBorderRadius` (bar), `submenuBorderColour` + `submenuBorderColourGradient` (panel border, Normal only); `submenuShadow` and `submenuShadowColour` (bar; the colour name is forced by `plugins/sgs-blocks/src/components/ShadowControl.js::shadowAttrKeys`'s rule `colour = <base>Colour`).
- **Trigger (bar):** `triggerMode`, `triggerIconPosition`, `triggerLabel`, `triggerIcon`, `triggerMagnetEnabled` / `Radius` / `Strength` (FR-41-12 / FR-41-30a / FR-41-31).
- **Treatments:** `itemColourHoverTreatment`, `itemBgHoverTreatment`, `itemBorderHoverTreatment`, `submenuColourHoverTreatment` (both), `submenuLinkBgHoverTreatment` (none/swap only), `burgerColourHoverTreatment` (bar), `burgerBgHoverTreatment` (bar, none/swap only); all default `"swap"` (FR-41-23). Sweep is omitted per FR-41-26 (a background in ANY state blocks it; `burgerColourHover` is NOT a blocking input, it is the colour the sweep travels TO).
- **Drawer-only:** `sublinkMarkerIcon` and the `sublinkMarkerColour*` family (FR-41-30b).

⛔ **`itemBorderRadius` defaults to `8px` on all four corners, a FLAT corner object, not a tier envelope.** A background-filled item with hard square corners reads as unfinished; decided on merits, not on any test page. The per-element precedent is `sgs/product-card`'s `ctaBorderRadius` (`{"topLeft":"10px","topRight":"10px","bottomLeft":"10px","bottomRight":"10px"}`, CSS length STRINGS with units), consumed by `plugins/sgs-blocks/includes/helpers-box.php::sgs_corner_object_longhands` (reads exactly `topLeft` / `topRight` / `bottomRight` / `bottomLeft` via `sgs_css_length_value()`, printing only set corners). The root `borderRadius` tier envelope (`{"desktop":{}}`, `sgs_border_radius_tiers`) would find no corner keys and silently vanish. ⚠ `submenuBorderRadius` keeps its `{}` default (the panel reads `--sgs-nm-submenu-radius-{corner}` with a token fallback, FR-41-15). The full submenu typography family is declared under FR-41-22.

⛔ **Every `showHover` trio attribute defaults to `""`; `itemTextDecorationHover` does NOT default to `"underline"`.** A non-empty default would make the underline the block's SHIPPED hover signal (the framing FR-41-6 rules out), would ship an underline to every item of every install (the imposition FR-41-17a(a) refuses: "do not close case (a) by re-defaulting"), and would break the additive-defaults contract (§14.11 G13). All six are plain `"type": "string"` with NO JSON `enum`, PHP-validated against FR-41-21's allowlists (an out-of-enum stored value silently coerces to the `block.json` default).

⛔ **Zero renames in this Part.** Every attribute above is additive (a rename's blast radius is the whole write path, including Spec 47's route, not just the readers). The `itemTextDecoration` base keeps its real JSON `enum` as a disclosed asymmetry with the six enum-less trio attributes: an existing attribute is not restructured, and the zero-renames rule covers the shape as much as the name.

#### 14.8.4a Responsive font-size tiers: no flat tier attributes

`itemFontSize` is `{"type":"object","default":{}}`, a `{desktop,tablet,mobile}` TIER OBJECT, and both surfaces take the tiered path: `plugins/sgs-blocks/src/components/TypographyControls.js::TypographyControls` computes `fontSizeIsTiered = isTieredValue( fontSizeRaw )` (true for any non-null object and for the empty array the `{}` default reaches the editor as; `tests/js/typography-tier-shape.test.js`), renders `<ResponsiveOverride>` and writes the single attribute; `sgs_typography_css_rule()` branches on `$size_is_tiered = is_array( $attributes[ $k_size ] )` and emits per-tier `@media` CSS via `sgs_emit_responsive_css()`, reading `FontSizeTablet` / `FontSizeMobile` only in its flat `else` branch. So tablet and mobile font size persist and render end to end. ⛔ Declaring `itemFontSizeTablet` / `itemFontSizeMobile` would add two attributes with zero writers and readers (dead-attribute debt); `typographyAttrKeys()` returning a key name is not evidence a block uses it (it names keys for both storage shapes). `itemLetterSpacing` is a tier object for the same reason; do not "complete the set". **Requirement:** §14.11 G20 asserts a tablet and a mobile font-size value set through the editor persist and render.

⚠ The one un-tiered member is `itemLineHeight` (`{"type":"number"}`, no default): `lineHeightIsTiered` is false, so `TypographyControls` renders one plain `LineHeightControl` and per-device line height is not offered (a missing capability, never a silent discard). ⛔ Do not declare `itemLineHeightTablet` / `...Mobile`; the settled direction is the tier-object migration via `plugins/sgs-blocks/scripts/migrate-tier-object.py --property lineHeight`, which is that codemod's job across every block. Formula-based scaling is not offered: vw/vh units cover it (Bean ruling).

#### 14.8.5 Three deliberate boundaries: do not "complete the set"

1. **The item TEXT row's gradient is Normal plus Hover, never Current.** `itemColourGradient` (Normal) and `itemColourHoverGradient` (Hover, in `item.states.hover`) exist; there is no `itemColourCurrentGradient`. A gradient has no single hex to contrast-test, so it cannot coexist with the smart-contrast auto-swap (FR-41-5): the Hover gradient is offered only while `itemSmartContrast` is off and hidden the instant it is switched on, and the emitter ignores a stored hover gradient while the swap is active. ⚠ This is a TEXT-row boundary: the item BACKGROUND row has a full three-state gradient set (`itemBgGradient` / `itemBgHoverGradient` / `itemBgCurrentGradient`; a background gradient is what is contrasted against), and `itemBgHoverGradient` is read by Highlight (FR-41-25).
2. **The submenu PANEL background has a Normal-state gradient and nothing else.** `submenuBgGradient` is declared identically in both blocks because the fill is written by `sgs_custom_property_gradient_decls( 'sgs-nm-submenu-bg', ... )`, which emits a `--sgs-nm-submenu-bg-gradient` sibling. ⛔ No `submenuBgGradientHover` / `...Current` (FR-41-9's argument is about STATES, not gradients).
3. **No gradient on the ITEM border in any state, while the submenu PANEL border keeps one** (the pseudo-element budget, FR-41-3c).

#### 14.8.6 Required `block.json` manifest shape

**(a) The `item` element has hover and current states with DISTINCT attribute names per state.** `supports.sgs.elements.item` declares `clusters: ["text","fill","layout","border"]`, `prefix: "item"`, and `states` `hover` and `current`.
- `"border"` in `item.clusters`: without it the forward-resolution pass never visits `css:border-color` / `css:border-width` / `css:border-style` (the same trap the `indicator` element's note records: an attrMap on an element with `clusters: []` is never consulted).
- Base members: `css:border-radius` → `itemBorderRadius` (no hover entry), `css:border-color` → `itemBorderColour`, `css:border-width` → `itemBorderWidth`, `css:border-style` → `itemBorderStyle`, `css:text-decoration` → `itemTextDecoration` (base plus hover with no current entry is correct), `css:text-transform` → `itemTextTransform` (without an explicit base, base and Hover derive to the same `(text-transform, item, state=NULL)` slot and collide), and `css:font-weight` → `itemFontWeight` (⛔ must SURVIVE: dropping it leaves two state entries with no base, the STATE_WITHOUT_BASE shape the manifest gate flags, Spec 35 FR-35-5).
- `states.hover`: `css:color` → `itemColourHover`, `css:color-gradient` → `itemColourHoverGradient`, `css:background-color` → `itemBgHover`, `css:background-image` → `itemBgHoverGradient`, `css:border-color` → `itemBorderColourHover`, and the trio `css:text-decoration` / `css:text-transform` / `css:font-weight` → `itemTextDecorationHover` / `itemTextTransformHover` / `itemFontWeightHover`. ⛔ All three trio entries are explicit, never left to the `{prefix}Suffix` convention.
- `states.current`: `css:color` → `itemColourCurrent`, `css:background-color` → `itemBgCurrent`, `css:background-image` → `itemBgCurrentGradient`, `css:border-color` → `itemBorderColourCurrent`, and explicitly `css:font-weight` → `itemFontWeightCurrent`.

`css:background-image` is claimed at all three states by three DIFFERENT attributes, and `css:font-weight` likewise (`css:text-decoration` at two): the safe shape, each declared explicitly at its own state. ⛔ The explicit current `css:font-weight` entry is not belt-and-braces: the `burger` element's note records `burgerColour` + `burgerColourHover` deriving to `(color, burger, state=NULL)` and colliding on one slot, and the `sublink` note records the same for `submenuColour` + `submenuColourHover`. ⛔ `current` maps DIFFERENT attribute names from `hover`: the classifier's `_record()` is last-write-wins, so a `current` attrMap identical to `hover` would overwrite the correct hover derivation and tag attributes with the wrong `css_state`. Verification (§14.11 G4): assert via `/sgs-db` that `itemColourHover` and `itemBgHover` carry `css_state='hover'` and the Current attributes `css_state='current'`.

**(b) The `sublink` element has hover and current states, `fill` and `border` clusters and explicit typography members.** Clusters `["text","fill","border"]`, `"prefix": ""`. `submenuColourCurrent` on `states.current`; `submenuLinkBg` / `...Hover` / `...Current` across base and both states; `submenuLinkBgGradient` as `css:background-image` at base. `states.hover` carries `css:text-decoration` / `css:text-transform` / `css:font-weight` → `submenuTextDecorationHover` / `submenuTextTransformHover` / `submenuFontWeightHover`. On `nav-drawer-menu` it also routes the marker colour family (`css:fill` / `css:fill-gradient` → `sublinkMarkerColour*`). ⛔ Each hover member needs its BASE counterpart declared in the same change (`submenuTextDecoration`, `submenuTextTransform`, `submenuFontWeight`, itemised in FR-41-22(c)): a hover member with no base is STATE_WITHOUT_BASE, with an implicit base it collides. ⚠ `"prefix": ""` is deliberate and must NOT change (a `submenu` prefix would claim `submenuAlign/Caret/CloseGrace/MinWidth/Radius/Padding`, which belong to the PANEL); FR-41-22's `submenu`-prefixed typography attributes belong to this anchor, resolved by an explicit `attrMap` entry per property, never by giving the element a prefix.

**(c) A `submenu-panel` element claims the panel** (`.{bem_root}__submenu`): `submenuBg` / `submenuBgGradient` (base only), `submenuBorderColour` / `submenuBorderColourGradient` / `submenuBorderWidth` / `submenuBorderStyle`, and on `nav-bar-menu` `submenuBorderRadius`, `submenuShadow`, `submenuShadowColour`. Clusters `["fill","border","layout"]`, `"prefix": ""`. ⛔ No `states` key (no hover or current state for any property).

**(d) The between-item line has no element.** It is the shared Separators setting (FR-41-37): `separators` and `submenuSeparators` are object attributes drawn by the helper, so neither block's `supports.sgs.elements` carries an `item-separator` element and `sublink` claims no border members.

**(e) The `burger` element carries nothing for `triggerMode` / `triggerLabel` / `triggerIcon` / `triggerMagnet*`** (not CSS properties; declaring them creates phantom routing slots). Its `css:width` / `css:height` → `burgerSize` pair is unchanged by non-icon modes (`width:auto` is a render-time branch).

**(f) No `underline` element exists.** Assert via `/sgs-db` that zero rows carry `css_element='underline'` for either block (§14.11 G11).

**(g) `supports.sgs.sweepEligibility` is declared per block (FR-41-26).** Four notes: (1) ⛔ it is NOT an `elements` entry and routes NOTHING (it sits beside `colourExemptions` / `hideExtensions` / `boxFamilies`); (2) both read paths are proven (PHP reads `supports.sgs.*`; JS imports the manifest via `plugins/sgs-blocks/src/blocks/nav-bar-menu/index.js::metadata` and `plugins/sgs-blocks/src/blocks/nav-drawer-menu/index.js::metadata`); (3) nothing constrains which keys `supports.sgs` may carry; (4) ⛔ every attribute NAMED in a row must exist in that block's own `attributes` (the `burgerColourHoverTreatment` row exists only in the bar; a typo in `blockingBackgroundAttrs` reads as permanently empty and the rule silently stops existing); assert name by name (§14.11 G12).

### 14.9 The inspector: two tabs, exact layout

⛔ This section is the control-by-control layout and it is authoritative: if an FR's prose and this section disagree, this is what a builder implements and the FR is the one to fix. `block.json` and the Spec 35 element manifest win on any default VALUE. Panel order within a tab is the order below. `SgsColourPanel` must render **before** any other same-group `<InspectorControls>` in `edit()` (WordPress concatenates same-group Fills in mount order). ⛔ Every control names its actual component; there is no "dropdown": 2-3 options is `ToggleGroupControl`, 4+ is `SelectControl` (`SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED` is `3`; `ToggleGroupControl` / `ToggleGroupControlOption` import from `plugins/sgs-blocks/src/components/primitives`).

#### TAB 1: General

**14.9.1 Panel "Menu"** (menu source): `SelectControl` (WP menu picker) → `ref` (`0`).

**14.9.2 Panels "Burger Menu" (bar) and "List layout" (Design tab):** Show the burger on (bar-only): `ToggleGroupControl` Always | Tablet | Mobile | Custom (Custom reveals a `SgsLengthControl` "Switch to burger below") → `collapsePoint` (`768`). Item gap (`ToolsPanel`): `SgsLengthControl` → `gap` (`"8px"`). Columns (drawer only): `RangeControl` in `ResponsiveControl` → `listColumns`. Padding: `ResponsiveBoxControl` → `padding`.

**14.9.3 Panel "Menu Button"** (bar-only; opens with the help text "Controls the button that opens the mobile menu (the 'burger')."):

| Control | Component | Attribute |
|---|---|---|
| Icon (when `triggerMode` is `icon` or `icon-and-text`) | `IconPicker` (FR-41-30a) | `triggerIcon` |
| Show as (per device) | `ResponsiveOverride` + `ToggleGroupControl` **Icon \| Text \| Both** | `triggerMode` |
| Icon position (when a tier is Both) | `ToggleGroupControl` **Before \| After** | `triggerIconPosition` |
| Label (when any tier is not `icon`) | `TextControl` (`__nextHasNoMarginBottom __next40pxDefaultSize`) | `triggerLabel` |
| Size | `SgsLengthControl` | `burgerSize` (`"44px"`) |
| Magnetic pull | `ToggleControl` (FR-41-31) | `triggerMagnetEnabled` |
| Pull distance / strength (when on) | `RangeControl` 20-400 / 2-80 | `triggerMagnetRadius` / `triggerMagnetStrength` |

⛔ The third option's LABEL is "Both", not "Icon and text", and the STORED value is `icon-and-text`: "Icon and text" is 13 characters, over Spec 35 Part O's 12-character bound for a 2-4-option `ToggleGroupControl`, whose remedy is to shorten the LABEL, never the VALUE (one vocabulary for open and close sides). See `plugins/sgs-blocks/src/blocks/nav-bar-menu/BurgerPanel.js` (`<ToggleGroupControlOption value="icon-and-text" label={ __( 'Both', 'sgs-blocks' ) } />`) and identically `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js`; both carry the shortening on purpose.

**14.9.4 Submenu behaviour** (bar-only, in the bar's "Menu panel" panel): Panel this burger opens (`SelectControl` → `drawerRef`); Open from (`SelectControl` Start / Centre / End → `submenuAlign`); Show expand arrow (`ToggleControl` → `submenuCaret`); Close delay (`RangeControl` ms → `submenuCloseGrace`, `170`).

**14.9.5 Panel "Accessibility"** (both blocks; FR-41-27): Navigation label (`TextControl` → `navLabel`); Keep text readable automatically (`ToggleControl` → `itemSmartContrast`, `false`), plain-language help per FR-41-5. **14.9.5a Device visibility** is present via the universal extension (§14.1.2): build nothing.

#### TAB 2: Design

**14.9.6 Panel "Colour"**: ONE `SgsColourPanel`, sub-groupings via FR-41-16, every stateful row paired with its hover-treatment selector (FR-41-23). Each block mounts exactly one (`plugins/sgs-blocks/src/blocks/nav-bar-menu/edit.js::Edit` `colourRows`; `plugins/sgs-blocks/src/blocks/nav-drawer-menu/edit.js::Edit`'s trimmed `colourRows`). The treatment `ToggleGroupControl` renders directly beneath each Hover swatch.

| Grouping | Row | States | Attributes | Hover treatment |
|---|---|---|---|---|
| **Menu** | Nav background | Normal, Hover | `navBg` / `navBgHover` (+ `navBgGradient`) | none (single static wrapper) |
| | Nav text | Normal, Hover | `navColour` / `navColourHover` (+ `navColourGradient`) | none |
| | Item text | Normal, Hover, **Current** | `itemColour` / `itemColourHover` / `itemColourCurrent` (+ `itemColourGradient`; `itemColourHoverGradient` while `itemSmartContrast` is off) | None / Swap / **Sweep** (`itemColourHoverTreatment`); Sweep omitted when `itemColourGradient` is set |
| | Item background | Normal, Hover, **Current** (Current omitted under Highlight, FR-41-14) | `itemBg` / `itemBgHover` / `itemBgCurrent` (+ the three gradients) | None / Swap / **Highlight** (`itemBgHoverTreatment`), painting in the row's own Hover swatch |
| | Item border colour (labelled "Item underline colour" on the bar) | Normal, Hover, **Current** | `itemBorderColour` / `...Hover` / `...Current` | None / Swap / **Sweep** (`itemBorderHoverTreatment`) |
| | Sweep angle (only when Sweep) | n/a | `sweepAngle` (`AnglePickerControl` + preset dropdown) | n/a |
| **Submenu** | Panel background | Normal only | `submenuBg` (+ `submenuBgGradient`) | none |
| | Panel border colour | Normal only | `submenuBorderColour` (+ `submenuBorderColourGradient`) | none (FR-41-9) |
| | Link text | Normal, Hover, **Current** | `submenuColour` / `...Hover` / `...Current` (+ `submenuColourGradient`) | None / Swap / **Sweep** (`submenuColourHoverTreatment`); omitted when the link paints a background in ANY of its three states or carries a text gradient |
| | Link background | Normal, Hover, **Current** | `submenuLinkBg` / `...Hover` / `...Current` (+ `submenuLinkBgGradient`) | None / **Swap only** (`submenuLinkBgHoverTreatment`) |
| | Sublink marker colour (drawer-only, FR-41-30b) | Normal, Hover, **Current** (revealed once `sublinkMarkerIcon` is non-default) | `sublinkMarkerColour` / `...Hover` / `...Current` (+ 3 gradients) | none |
| **Menu button** (bar-only) | Icon colour | Normal, Hover | `burgerColour` / `burgerColourHover` (+ `burgerColourGradient`) | None / Swap / **Sweep** (`burgerColourHoverTreatment`); omitted under `triggerMode:'icon'`, when the button paints a background in EITHER state (`burgerBg` or `burgerHoverColour`) or carries an icon gradient |
| | Button background | Normal, Hover | `burgerBg` / `burgerHoverColour` (+ `burgerBgGradient`) | None / **Swap only** (`burgerBgHoverTreatment`) |
| **Featured** | out of scope (§14.1.2) | | | |

ⓘ **Cross-reference note beneath the Item text and Item background rows (FR-41-5 / FR-41-27):** "Automatic readable-text checking for these colours is switched on under General → Accessibility." Without it the toggle governs two rows from another tab and reads as a dropped control. Gated: §14.11 G16.

ⓘ **Cross-reference note beneath the Item border colour row's hover-treatment selector (FR-41-6):** "This changes the line around the item. To underline the menu word itself instead, use Decoration (hover) under Typography — they're separate settings and don't do the same thing." ⛔ RENDERED in the inspector, not merely stated here (an operator meets the controls in the editor); the twin of the §14.9.10 note and neither ships without the other. Gated: §14.11 G19(e).

⛔ There is no "Indicator" panel or indicator-colour row (FR-41-25): Highlight paints in `itemBgHover` / `itemBgHoverGradient`, per the colour-reuse rule. Both border-colour rows are ordinary `SgsColourPanel` rows (FR-41-33), not duplicates, because `SgsBorderControl` is mounted with `showColour={ false }` in §14.9.7 / §14.9.9; each carries `contrastAgainst` with `contrastLargeText: true` (WCAG 1.4.11, 3:1). ⛔ Mega Menu colours are NOT in this panel.

**14.9.7 Panel "Menu item"** (border SHAPE here; border COLOUR in the Colour panel, FR-41-33). Width, style and radius sit as a labelled **Border** control rendered by `SgsBorderControl` with `showColour={ false }`: per-side width (base only) + style (the shared `BorderStyleControl` sibling, FR-41-2b / FR-41-33 item 2) + radius via `radiusValues` / `onRadiusChange` with `showRadiusResponsive={ false }`, bound to `itemBorderWidth` / `itemBorderStyle` / `itemBorderRadius`. This is a considered block-scoped EXCEPTION to the framework rule that border colour lives in the composite (rationale: FR-41-33). ⛔ The split is EXCLUSIVE: exactly one control writes each attribute (`check-duplicate-controls.js`). The mechanism is identical in bar and drawer (FR-41-28); no per-layout branching.

**14.9.7a Panels "Item separators" (bar), "Row separators" (drawer), "Submenu row separators" (both)** (FR-41-37). Each is one `PanelBody` holding one `SgsSeparatorControl` (`plugins/sgs-blocks/src/shared/nav-menu-panels/SeparatorsPanel.js`) bound to `separators` or `submenuSeparators`: a per-device **Thickness** (`ResponsiveLengthControl`, empty draws no line) beside one **Line colour and style** swatch whose popover carries the Normal / Hover tabs and the Solid / Dashed / Dotted picker. The drawer's top-level panel also offers **Outer lines** (Between items only / Between items and at both ends / Between items and after the last); the top-level panels also offer **Line on hover** (None / Swap / Sweep, with direction and angle under Sweep). The line colours are NOT rows in §14.9.6.

**14.9.8 Panel "Submenu — Items"** (drawer-only): the LINKS inside the drawer's submenu, distinct from the container (§14.9.9). Colour rows live in §14.9.6 (cross-referenced, not duplicated). Marker icon: `IconPicker` (FR-41-30b) → `sublinkMarkerIcon`. Typography: the Typography panel's "Submenu" target (§14.9.10 / FR-41-22). Spacing: submenu link padding, a per-device box → `submenuLinkPadding`, unset keeps the stylesheet default (the control is in the shared ItemsPanel); `submenuPadding` belongs to the PANEL (§14.9.9).

**14.9.9 Panel "Submenu — Container"** (a `ToolsPanel`, each row a `ToolsPanelItem` with `hasValue` / `onDeselect`; bar-only rows marked):

| Control | Component | Attribute |
|---|---|---|
| Open animation (bar-only) | five-option `SelectControl` None \| Fade \| Fade and lift \| Slide down \| Grow (FR-41-10) | `submenuAnimation` (`"fade"`) |
| Distance below the bar (bar-only) | `SgsLengthControl` with `presets={ false }` | `submenuTopOffset` |
| Minimum width (bar-only) | `SgsLengthControl` with `presets={ false }` | `submenuMinWidth` |
| Inner spacing | `ResponsiveBoxControl` | `submenuPadding` |
| Border | `SgsBorderControl` with `showColour={ false }`: width + style (+ radius on the bar) only, matching §14.9.7; its colour is a Normal-only row in §14.9.6's Submenu grouping (FR-41-33) | `submenuBorderWidth` / `submenuBorderStyle` / `submenuBorderRadius` (bar) |
| Box shadow (bar-only) | `ShadowControl` with `attrNames={ shadowAttrKeys( 'submenuShadow' ) }` | `submenuShadow` + `submenuShadowColour` |

Radius rides the border control's radius half (no flat `submenuRadius` control). The panel is single-state throughout (FR-41-9): a floating panel is either rendered or absent. ⛔ Do not give the panel's border-colour row a Hover or Current state. ⚠ Shadow colour stays with `ShadowControl` and is NOT moved into `SgsColourPanel` by FR-41-33 (the border exception rests on the comparison argument; a Normal-only shadow colour has nothing to compare against and moving it would break `ShadowControl`'s preset behaviour). `ShadowControl` renders its colour picker itself inside `ShadowStateBuilder`; only the ATTRIBUTE is caller-owned. Reuse `plugins/sgs-blocks/src/components/ShadowControl.js::ShadowControl` and `plugins/sgs-blocks/includes/helpers-tokens.php::sgs_shadow_value_composed`; `shadowAttrKeys( 'submenuShadow' )` with no options returns exactly `{ base: 'submenuShadow', colour: 'submenuShadowColour' }` (reference mount `plugins/sgs-blocks/src/blocks/info-box/edit.js::Edit`); its PHP twin `plugins/sgs-blocks/includes/helpers-colour-variants.php::sgs_shadow_attr_map( 'submenuShadow' )` takes the same call (both sides carry the same opt-in or JS binds a key the block never declares and the editor silently discards writes). ⛔ Shadow is gradient-exempt by mechanism (`inspector-scan` rule 31 encodes it centrally; declare nothing per block).

**14.9.10 Panel "Typography"** (directly under the Colour and List-layout panels): the Menu / Submenu `targets` switcher (FR-41-22 has the attribute family and `TypographyTargetSwitcher` mechanics).

| Control | Component | Applies to |
|---|---|---|
| Target | `ToggleGroupControl` Menu \| Submenu; on the bar a third **Menu button** target (font family, transform, letter spacing) appears when `triggerMode` is not `icon` | selects the attribute family |
| Font family | `TypographyControls` font-family picker | `{prefix}FontFamily` |
| Font size (+ tiers) | `ResponsiveControl` wrapping `UnitControl` | `{prefix}FontSize` (tier object, §14.8.4a) |
| Weight / Style | native `SelectControl`s | `{prefix}FontWeight` / `{prefix}FontStyle` |
| Line height | `UnitControl` | `{prefix}LineHeight` |
| Decoration / Transform / Letter spacing / Text align / Text wrap / Text columns / Writing mode | native controls per `TypographyControls`' standard set (Normal state) | `{prefix}TextDecoration` etc. |
| **Decoration (hover) / Transform (hover) / Weight (hover)** | the three `SelectControl`s `TypographyControls` renders in ONE `<Flex>` row when `showHover: true` (`SGS_TEXT_DECORATION_OPTIONS` / `SGS_TEXT_TRANSFORM_OPTIONS` / `SGS_FONT_WEIGHT_OPTIONS`); ⛔ not three hand-rolled controls | `{prefix}TextDecorationHover` / `...TextTransformHover` / `...FontWeightHover`, all `""` |

`showTextIndent` is `false` on both targets. The hover trio row is present on BOTH targets (`showHover: true` per `targets` entry; FR-41-6 / FR-41-21 / FR-41-22). ⛔ It is described, in help text and every future edit, as an **optional secondary decoration**: not the block's non-colour hover signal (that is the item border row's treatment selector in the Colour panel, §14.9.6) and not an alternative way to author the divider (a hover underline is a baseline-hugging glyph-width decoration; the divider is a full-width edge treatment).

ⓘ **Cross-reference note beneath the hover trio row (FR-41-6), the twin of the §14.9.6 note, neither shipping without the other:** "These change how the menu word itself looks on hover. For a line across the whole item, use the item border's hover setting in the Colour panel instead."

The help strings below are the BINDING wording (a wording requirement without wording is unbuildable); adjust sentence rhythm, never the distinction:

| Control | Help text (verbatim) |
|---|---|
| **Decoration (hover)** | "Underlines the menu word itself on hover — not a full-width line. For a line under the whole item, use the border's hover setting in the Colour panel instead." |
| **Weight (hover)** | "Makes the word bolder when you point at it. Bolder text is a little wider, so the items to its right will shift across slightly as you move along the menu." |

⛔ Neither string names WCAG, "contrast ratio", "AA", "signal" or "divider", and the Decoration string is never softened into "another way to underline". ⚠ The Weight caution is operator guidance, not a blocker (it does not disable the control or gate the value).

Block-private field, Menu target ONLY, at the bottom of that target's set (FR-41-29, a plain block-owned `SelectControl`, not part of `TypographyControls`): **Current-page weight**, `SelectControl` fed `SGS_FONT_WEIGHT_OPTIONS` → `itemFontWeightCurrent` (`"600"`); its plain-language help says it keeps the menu usable for someone who cannot tell two colours apart and that its hover counterpart is the item border's hover treatment in the Colour panel. Every state-signal control has a named home (the hover trio row, the Current-page weight field below it, `itemSmartContrast` in §14.9.5); only `itemTextDecorationCurrent` has no control (FR-41-6).

**14.9.11 Panel "Effects"**: `itemMagnetEnabled` ("Magnetic hover pull"). **14.9.12 Panel "Featured"**: out of scope (§14.1.2). **14.9.13 Panel "Mega menu (drawer)"** (drawer-only): out of scope (§14.1.2).

### 14.10 WCAG contrast, follow-ups and comment hygiene

#### FR-41-17 — The warn-only contrast check applies to every row

`contrastAgainst` / `contrastLabel` feed the live luminance-ratio check in `plugins/sgs-blocks/src/components/GradientCapableColourControl.js`. Every 3-state row carries both with identical behaviour: it warns, never blocks and never alters a colour, and is ignored on a row that is not `gradientCapable` (a plain `DesignTokenPicker` has no check). The caller works out which background is behind the text: item text contrasts against `itemBg` (resting), `itemBgHover` (hover) and `itemBgCurrent` (current); submenu link text against `submenuLinkBg` and, where unset, `submenuBg`. ⚠ The two border-colour rows carry `contrastLargeText: true` set explicitly on the row descriptor (a border is a WCAG 1.4.11 UI-component case at 3:1; the row lives in `SgsColourPanel`, so the obligation sits on the descriptor and must not inherit `GradientCapableColourControl`'s `false` default). It does not overlap FR-41-5 (the emitter changes the colour; this only warns in the editor). ⛔ It checks a foreground against its BACKGROUND, never two foreground states against each other (FR-41-17a).

#### FR-41-17a — Residual, accepted risk: colour-only state signals

Four accepted, named cases ((a) and (b) the colour-only pair; (c) and (d) Sweep-specific, ending in a state with no visible signal):
- **(a) Default case: no border, no Hover signal.** `itemBorderWidth` defaults to `{}`, so an untouched block ships no non-colour Hover signal (Current still ships its `"600"` weight). Accepted: an unrequested underline on every item of every install is a design imposition the owner rejected, and one border-width entry supplies the signal. ⚠ `itemTextDecorationHover` does NOT close this case and must not be recorded as closing it (it defaults to unset).
- **(b) The switched-off case.** An operator can set `itemColourHover` and `itemColourCurrent` to two similar colours AND leave the border width empty AND clear `itemFontWeightCurrent`; Hover and Current are then distinguished by colour alone, an SC 1.4.1 failure the inspector never warns about.
- **(c) The `color-mix`-less browser under Sweep on the menu button.** The static `@supports not (background-color: color-mix(...))` fallback in `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css` paints `background-color: rgba(128,128,128,0.12)` on `.sgs-nav-bar-menu__burger:hover` / `:focus-visible`; on browsers supporting `background-clip: text` but not `color-mix` that fill is clipped to the glyph shapes during a Sweep. Not gated by FR-41-26 condition 1 (a longhand, so cosmetic; no attribute controls it). ⛔ Do not close it by deleting the fallback.
- **(d) The Sweep fallback with an empty Hover swatch.** When the predicate turns false the treatment resolves to `'swap'`; with an empty Hover swatch nothing is emitted and the property has no hover change (FR-41-26). Accepted: substituting a colour would be an un-clearable hardcoded render default, and refusing the fallback would leave the clip defect. Narrower than (a) and (b): the item border treatment is unaffected, so it bites only on a border-less menu. Closed by one swatch entry.

All four are accepted residual risks, not covered work. The fix, if ever taken, is distinct work: extend the warn-only contrast UI to flag perceptual similarity between two state colours on the same element when every non-colour signal for those states is off (a state-vs-state comparison, a new trigger and string; not FR-41-17 with a wider input). ⛔ Do not close this by removing the operator's ability to switch signals off, and do not close case (a) by re-defaulting `itemBorderWidth` to a non-empty value.

#### FR-41-18 — "Auto-adjust for readability": a SEPARATE, EXPLICITLY NON-BLOCKING follow-up

**Status: NOT BUILT** (§14.0a.3). ⛔ Blocks no other requirement. An optional per-colour-row toggle that nudges the operator's pick toward the nearest AA-safe value against the resolved background; off by default. Attribute `{attrName}AutoAdjust` (boolean, `false`, one per row that offers it); placement inside the row's own popover beneath the states; only rows that already supply `contrastAgainst`; nudge toward AA and never past it; store the operator's original pick and adjust at render (overwriting would make the toggle irreversible). Help text: "Automatically brightens or darkens your chosen colour just enough to stay easy to read against the background behind it. Your original colour is kept — switch this off to go back to it."

#### FR-41-19 — Code comments state what the code does

The `supports.sgs.elements.item._note` and `...sublink._note` in the two nav `block.json` files state the current-page mechanism and name `itemColourCurrent` / `itemBgCurrent` / `itemFontWeightCurrent`; the `sublink._note` states that `"prefix": ""` stands and that `submenu`-prefixed typography attributes reach the element through explicit `attrMap` entries (§14.8.6b / FR-41-22). The citation in these comments is `FR-35-5`, not `FR-36-5`. ⛔ No retirement narration in active comments; each note states what the code does now.

#### FR-41-20 — Ancestor Current styling is built in CSS; there is no ARIA active-trail

**Built.** When a descendant submenu link is the current page, its ancestor top-level item renders the item's own Current declarations (colour, background on `::before`, border colour, weight), re-using the literal Current declarations, never a diluted third look. Selectors: `.{bem_root}__submenu-root:is(:has(ul.{bem_root}__submenu a[aria-current="page"]), [data-sgs-nav-has-current]) > .{bem_root}__link:not(:hover):not(:focus-visible)` on the bar and `.{bem_root}__accordion-row:has(ul.{bem_root}__submenu a[aria-current="page"]) > .{bem_root}__link:not(:hover):not(:focus-visible)` on the drawer, emitted by `sgs_nav_shared_item_state_css`. The trailing `:not(:hover):not(:focus-visible)` is what makes hover win over a propagated-Current ancestor (the `:has()` selector's own specificity outranks the plain hover rule). The bar-only `[data-sgs-nav-has-current]` fallback exists because `plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js` moves the panel to `<body>` while a page-embedded dropdown is open, breaking the `:has()` descent; it mirrors the fact onto the never-moving `.submenu-root` for that duration (the drawer never reparents).

**Not built: the ARIA active-trail.** `markCurrentPage` in both `view.js` files marks a link only on EXACT path equality, so a parent whose child page is current gets no `aria-current` marking and assistive technology gets no ancestor signal; there is no ancestor-path data from which one could be derived without a second mechanism. FR-36-4 names both the visual and semantic trail; the visual half has a mechanism here, the semantic half has no owner. Building it would need an ancestor-path list emitted per item at render time (the menu tree is known server-side) plus a client-side prefix match in `markCurrentPage` stamping a distinct signal, not `aria-current="page"` (single-valued per page, belonging to the exact link). Coherent, self-contained, and not in scope here.

### 14.10a Typography

#### FR-41-21 — The `showHover` trio has no shared PHP emitter, so these blocks emit it themselves

The `showHover` flag is on for both targets of both blocks (FR-41-6), so the trio must be emitted and the shared helper cannot do it. **The block-private emit is BUILT.** ⛔ Do not extend `sgs_typography_css_rule()` for this (a design-gated shared helper with callers across most of the block library).

Facts: `plugins/sgs-blocks/src/components/TypographyControls.js::TypographyControls` accepts `showHover = false` and, when true, renders three `SelectControl`s in one `<Flex>` row (Decoration / Transform / Weight, hover), writing `k.textDecorationHover` / `k.textTransformHover` / `k.fontWeightHover`, opt-in only "for a block that DECLARES + renders the `{prop}Hover` companions, else the dead-control gate flags it". `sgs_typography_css_rule()` in `plugins/sgs-blocks/includes/helpers-typography.php` has no hover branch (its only `:hover` emission is `sgs_link_colour_css()`). `showHover: true` is adopted only by these two blocks. `typographyAttrKeys( prefix )` returns all three hover key names, so the NAMES are the shared contract and only rendering is block-private. Switching `showHover` on without emitting creates six dead controls and fails `check-dead-controls.js`; the emitter is what makes the six declared attributes legal.

**The emit:** one `sgs_hover_state_rules()` call per prefix composing whichever of the three declarations are set (`sgs_hover_state_rules( $link_sel, '<decls>', ':focus-visible' )`, and the same for `$sublink_sel` with the `submenu` prefix). ⛔ Each value is validated against the SAME allowlist the base path applies (inline arrays in `sgs_typography_css_rule()`, no exported constant, so the emitter reproduces the checks literally): `text-decoration` in `none / underline / line-through / overline`; `text-transform` in `none / uppercase / lowercase / capitalize`; `font-weight` through `preg_replace( '/[^a-z0-9]/i', '', (string) $v )`. If the base allowlists change, this emitter changes in the same commit. ⛔ A hover value that is set but not permitted emits NOTHING (never falls back to the base value, which would repaint the resting declaration inside `:hover`). ⚠ Emit through `sgs_hover_state_rules()`, never a bare `{sel}:hover` (a stuck hover weight on touch reflows the bar until the visitor taps elsewhere).

**Where it lives:** `plugins/sgs-blocks/src/blocks/nav-bar-menu/render.php::sgs_nav_shared_typography_hover_rule` and identically `plugins/sgs-blocks/src/blocks/nav-drawer-menu/render.php::sgs_nav_shared_typography_hover_rule`, each inside its own `function_exists()` guard (a top-level declaration in a per-instance include fatals on the second instance). Signature `( array $attributes, string $prefix, string $selector, string $sweep_hover_colour = '' )`; the fourth parameter is how FR-41-26's "the underline must travel too" rule reaches it. Its two CALLERS live in other files: `plugins/sgs-blocks/includes/nav-menu-css.php` (prefix `item`, on `$link_sel`) and `plugins/sgs-blocks/includes/nav-menu-submenu-link-css.php` (prefix `submenu`, on `$sublink_sel`). That is safe only because those modules merely DEFINE functions at include time and call this one at render time, after `render.php`'s top level declared it. ⛔ Do not relocate the definition into one of the modules (the other does not `require_once` its sibling).

#### FR-41-22 — Submenu typography: the Items panel is a Menu / Submenu switcher

The sublink (`.{bem_root}__sublink`) has its own typography controls so dropdown links can be a step smaller than the bar. The switcher is not new component work: `TypographyControls`' `targets` prop is adopted by `card-grid`, `icon-list`, `option-picker`, `pricing-table`, `product-card`, `team-member`, `testimonial`, `trust-bar`; copy `plugins/sgs-blocks/src/blocks/card-grid/edit.js::Edit`'s two-target switcher (a `ToggleGroupControl` at two targets; threshold `SGS_TYPOGRAPHY_SWITCHER_MAX_SEGMENTED = 3`).

⛔ In `targets` mode, per-field flags MUST live on each target entry, not the outer element: with `targets.length > 1` `TypographyControls` renders `TypographyTargetSwitcher` and DISCARDS `singleProps`, forwarding only each target's `...fieldProps`; flags on the outer element silently delete the working controls, and each target carries its own `prefix`. The mount has two targets, `item` ("Menu") and `submenu` ("Submenu"), each with `fontSizePresets`, `showFontFamily`, `showDecoration`, `showTransform`, `showLetterSpacing`, `showTextAlign`, `showTextWrap`, `showTextColumns`, `showWritingMode`, `showTextIndent: false` (never emitted for nav links; the attribute is kept) and **`showHover: true`** (FR-41-6 / FR-41-21). A `showHover` left on the outer element renders no trio while every gate stays green (the inverse shape `check-dead-controls.js` looks for). The bar adds a third **Menu button** target when `triggerMode` is not `icon`.

**(a) Declare the full `submenu*` family in `block.json`**, matching `typographyAttrKeys( 'submenu' )` exactly: `submenuFontFamily`, `submenuFontSize`, `submenuFontSizeUnit`, `submenuFontWeight`, `submenuFontStyle`, `submenuLineHeight`, `submenuLineHeightUnit`, `submenuTextDecoration`, `submenuTextTransform`, `submenuLetterSpacing`, `submenuLetterSpacingUnit`, `submenuTextAlign`, `submenuTextWrap`, `submenuTextColumns`, `submenuTextIndent`, `submenuWritingMode`. ⛔ `submenuFontSize` and `submenuLetterSpacing` are `{"type":"object","default":{}}` (the tier-object shape, no `...Tablet` / `...Mobile` siblings, §14.8.4a); mirror the item family's shapes exactly (a new flat family would be born migration debt). ⚠ `submenuLineHeight` mirrors `itemLineHeight` as `{"type":"number"}` (un-migrated on both prefixes, deliberately symmetrical; an asymmetry between the two targets of one switcher is visible to the operator; both migrate together via the codemod). Plus the three companions `submenuTextDecorationHover`, `submenuTextTransformHover`, `submenuFontWeightHover` (`"type": "string"`, default `""`). ⛔ "Flag set", "attributes declared" and "render emit present" go together; never one or two of the three.

**(b) The render calls.** Base: `sgs_typography_css_rule( $attributes, 'submenu', $sublink_sel )` in `plugins/sgs-blocks/includes/nav-menu-submenu-link-css.php`, beside `sgs_typography_css_rule( $attributes, 'item', $link_sel )` in `plugins/sgs-blocks/includes/nav-menu-css.php` (without them every attribute is a dead control). Plus the companion hover emit per prefix: `sgs_nav_shared_typography_hover_rule( $attributes, 'item', $link_sel, $item_sweep_hover )` and the `submenu` twin; selectors are built from `$bem_root`. ⛔ The helper is BLOCK-PRIVATE to the two nav blocks, not an addition to a shared helper file (promoting it is the §14.12 follow-up).

**(c) FR-41-22c: an explicit `attrMap` entry on `sublink` per typography property** (it declares `"prefix": ""`, so the `{prefix}Suffix` convention resolves nothing). Base: `css:font-family`, `css:font-size`, `css:font-weight`, `css:font-style`, `css:line-height`, `css:text-decoration`, `css:text-transform`, `css:letter-spacing`, `css:text-align` → the matching `submenu*` attribute. Plus three on `states.hover` (`css:text-decoration`, `css:text-transform`, `css:font-weight` → `submenu*Hover`), each explicit for the collision reason in §14.8.6(a). ⛔ Never resolve this by giving `sublink` a `submenu` prefix (it re-claims `submenuAlign` / `Caret` / `CloseGrace` / `MinWidth` / `Padding` and the whole border family, which belong to the PANEL).

### 14.10b The ungated-paint detector

#### FR-41-35 — The ungated-paint detector, built framework-wide

**Status: BUILT.** FR-41-15's census was found incomplete on three consecutive reviews; a method in prose is not enforcement, so this is the enforcement. **Scope: FRAMEWORK-WIDE.** FR-41-15's methodology contains nothing nav-menu-specific (join each `$css .=` / hover-helper statement to its terminating `;`, test the buffer for a `background`/`border` declaration, read the block's stylesheet for the same shape; the classification input comes from the block's own declared `attributes`). The block-agnosticity risk is the exemption set, see (d).

**(a)** `plugins/sgs-blocks/scripts/check-ungated-paint-rules.py`. `check-*` because it is gate-first; Python because the load-bearing half is PHP statement structure (every PHP-semantics detector in this tree is Python). ⛔ It does NOT extend `check-hardcoded-render-defaults.js`, which runs the INVERSE direction (attribute exists → is its property also hardcoded?); this asks declaration exists → does a governing attribute exist?

**(b) `--survey`** emits the census in FR-41-15's three buckets for one block (`--block sgs/x`) or every block: per hit the source file, selector, verbatim declaration and bucket (CENSUSED / GATED with the `if` named / DISMISSED with the reason AND the condition that would return it). ⛔ All three buckets are emitted, never just the findings.

**(c) FR-41-35c: `--check`** exits non-zero when a `background` or `border` declaration is emitted or authored ungated on a selector with no corresponding operator attribute, on both surfaces in one run, failing closed for `HARD_FAIL_BLOCKS` (`["sgs/nav-bar-menu", "sgs/nav-drawer-menu"]`); every other block's findings print and pass. ⛔ The scan logic is FR-41-15's methodology (a character-boundary parser joining to the terminating `;`). ⚠ It is statement-aware, NOT variable-aware (the `$sgs_nm_featured_vars` assembly in `plugins/sgs-blocks/includes/nav-menu-item-border-featured-css.php` is a live instance); the script PRINTS this limit in `--survey` output.

**(d) Exemptions**, each a GENERIC rule keyed on selector shape or `supports.sgs`, never a block name: resets (a declaration to `none` / `0` / `transparent` with no competing operator value); `:where()` defaults; forced-colors / `@supports` a11y rules; wrapper-delegated blocks (a `supports.sgs` container kind whose paint belongs to `SGS_Container_Wrapper`); an attribute-driven `var()` with a live writer (⛔ it must verify the writer EXISTS in `src/`, since a `var()` with no writer only paints its hardcoded fallback). ⛔ Writing `.sgs-nav-bar-menu__` or `.sgs-nav-drawer-menu__` into an exemption means writing a nav-menu lint, not a gate.

**(e) `--self-test`**: negative controls are fixtures under `plugins/sgs-blocks/scripts/fixtures/ungated-paint/` (real diagnosed instances: unconditional, ungated `background` shorthand, `:hover`, via `sgs_hover_guarded_rule()`, `$uid_sel`-scoped). ⛔ Each `*-dirty` fixture must FAIL the check and the `*-clean` copy report zero; one `*-legit` and one `*-trap` fixture per exemption prove none over-matches.

**(f) Wiring:** the entry is in `plugins/sgs-blocks/scripts/gates.json` (consumed by `run-gates.py`), id `check-ungated-paint-rules`, plus the `package.json` alias `check:ungated-paint-rules`. ⛔ A `package.json` alias alone does NOT wire a gate; prove reachability with `npm run gate:list`, not a grep. **(g) Gate:** §14.11 G20c.

### 14.11 Acceptance

Live roster commands replace cached counts throughout.

| Gate | Condition |
|---|---|
| **G1: zero blast radius** | Five proofs, all required. (a) Every block mounting `SgsColourPanel` renders byte-identical inspector output despite the FR-41-16 row keys (diff at least three callers; roster `git grep -l "<SgsColourPanel" -- 'plugins/sgs-blocks/src/blocks/*/edit.js'`). (b) Every existing `sgs_emit_state_colour_css()` call site emits byte-identical CSS with the 4th parameter defaulted (`git grep -c "sgs_emit_state_colour_css(" -- '*.php'`). (c) `sgs_fill_states_css()` / `sgs_text_states_css()` / `sgs_border_states_css()` emit byte-identical CSS for every caller whose `$map` has neither a `current` nor a `suppress_edges` key; ⛔ assert specifically that such a caller still receives the flat `border-color` SHORTHAND, not per-edge longhands (`git grep -n "sgs_border_states_css(" -- '*.php'`). (d) Every existing `SgsBorderControl` mount renders byte-identical output with `showColour` defaulting `true` (diff at least three callers; `git grep -l "<SgsBorderControl" -- 'plugins/sgs-blocks/src/blocks/*/edit.js'` under-counts, `sgs/media` mounts it through the media-atom chain); `GradientCapableColourControl` is NOT edited, but assert the `BorderStyleControl` child's other adopters (`DesignTokenPicker.js`, `GradientCapableColourControl.js`) are unaffected. (e) Every `data-sgs-fx="magnet"` element renders a byte-identical COMPUTED `transition` with `fx-magnet.css` exposing `--sgs-magnet-transition` (⛔ assert the computed value on a live magnet element, not that the file still contains `180ms`: a mistyped property name would leave the text intact and silently strip every other magnet's transition). |
| **G2: no bare `:hover`** | `plugins/sgs-blocks/scripts/hover-guard/check.js` passes; every hover rule traces to `sgs_hover_state_rules()` or `sgs_hover_guarded_rule()`. |
| **G3: no inline styling** | `node plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 (Spec 32 / FR-36-13). |
| **G4: DB state routing** | `/sgs-db` shows `itemColourHover` / `itemBgHover` at `css_state='hover'` and every Current attribute at `css_state='current'` (§14.8.6a negative control; it must be RUN). The typography trio is IN this gate: for each property on each prefix assert the BASE (`itemTextDecoration` / `itemTextTransform` / `itemFontWeight` at `css_state IS NULL`) and HOVER (`css_state='hover'`) attributes occupy SEPARATE slots, the same six for `submenu`: twelve rows, twelve distinct `(css_property, css_element, css_state)` triples (assert distinctness; last-write-wins retags one attribute with the other's state and both rows survive). Assert `itemFontWeight`'s base row specifically. |
| **G5: no dead controls, no readers of undeclared attributes** | `npm run check:dead-controls` and `npm run check:empty-inspector-containers` pass. Every declared attribute is both written by a control and read by the emitter, including the whole submenu typography family and the three `triggerMagnet*`; the six `showHover` attributes are IN this check (control renders with `showHover: true` on that target AND the block-private rule emits). No code reads an attribute not declared here: `git grep -nE "hoverStyle\|underlineColour\|underlineThickness\|underlineOffset\|itemRadius\|submenuRadius\|indicatorStyle\|indicatorColour\|borderHoverAnimation[^D]" -- plugins/sgs-blocks/src plugins/sgs-blocks/includes theme` returns only comment prose (the `[^D]` guard exempts `borderHoverAnimationDirection`, FR-41-38). Also `python plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py`. |
| **G6: one line, not two** | On the live canary, with a bottom border colour AND a Sweep set, the item row renders exactly one painted horizontal line and `getComputedStyle( link ).borderBottomColor` is `rgba(0, 0, 0, 0)` while the `::after` band paints (FR-41-8 mechanism items 2 + 3). |
| **G7: live verification on the real page (R-31-11, R-31-13)** | Playwright on the real page, both blocks: hover a parent with a dropdown in the BAR, move into the dropdown, confirm via `getComputedStyle` the parent's hover declarations still apply; repeat in the DRAWER's accordion; Tab into each panel and confirm the `:has()` half. With a non-zero `submenuTopOffset`, move slowly across the gap and confirm the parent's paint never drops (FR-41-11). Confirm Current paints on the current page and the drawer and bar instances carry independent borders. Plus Bean's eye: a number alone does not close this. |
| **G8: touch** | On touch emulation, tapping an item does not leave it stuck in its hover colour and the colour sweep does not strand half-finished. |
| **G9: reduced motion** | Under `reduce` the colour sweep and the submenu open animation land on their END state with no travel and the submenu still opens; assert both FIRE without the media query too. Magnet: with `triggerMagnetEnabled` on and `reduce` emulated, (a) `getComputedStyle( burger ).transitionDuration` resolves to the killed value, not `180ms`, (b) `transform` is `none`, and (c) ⛔ the CAUSE: the winning `transition-duration` is the `!important` one from the `prefers-reduced-motion: reduce` rule in `plugins/sgs-blocks/src/blocks/nav-bar-menu/style.css` (naming `.sgs-nav-bar-menu__burger`, `__link`, `__indicator` and `[data-magnet] .sgs-nav-bar-menu__magnet-target`), the ONLY thing killing the transition because FR-41-31's companion `(0,2,0)` out-ranks the shared `(0,1,0)` kill switch. ⚠ Assert the companion carries NO `!important`. |
| **G10: non-colour signal RENDERS, not just computes** | (a) Hover: with a bottom `itemBorderWidth` set and every colour unset except `itemBorderColourHover`, hovering visibly changes the border (computed `border-bottom-color` differs). ⚠ Do NOT assert a signal on a border-less menu (FR-41-17a(a)). (b) Current: with every colour unset the current item renders at the declared weight. ⛔ `getComputedStyle` alone does not close the weight half (`theme/sgs-theme/theme.json` registers `display` with a single 400 face and `dm-sans` with `400 700`): also assert a rendered difference (a `getBoundingClientRect().width` delta on a fixed string, or `document.fonts.check( '600 16px <family>' )`). |
| **G11: no `underline` element in the DB** | After `/sgs-update`, `/sgs-db` returns zero rows with `css_element='underline'` for either nav block (§14.8.6f). |
| **G12: manifest conformance** | `npm run audit:element-manifest` passes, and `python plugins/sgs-blocks/scripts/placement-reach.py --block sgs/nav-bar-menu` (and `sgs/nav-drawer-menu`) reports no new CONTESTED attributes (the border family is claimable by both `item` and `submenu-panel`, so each needs its explicit `attrMap` entry, §14.8.6a/c). ⚠ Assert `supports.sgs.sweepEligibility` name by name per block: every attribute in `blockingBackgroundAttrs` / `blockingGradientAttrs` / `glyphGuard.attr` resolves in that block's `attributes`, and every row KEY is a declared `...HoverTreatment` attribute (§14.8.6g). ⛔ A misspelt name reads as permanently empty, so the eligibility rule silently ceases to exist (a dead-detector shape; this is the only gate positioned to see it). |
| **G13: hover-treatment defaults** | Every `{row}HoverTreatment` defaults to `"swap"`; an untouched block renders a plain Hover swap on each row. `itemBgHoverTreatment='highlight'` with `itemBgHover = X` renders the pill in X, the gradient pair likewise. Radius default: with an `itemBg` set and `itemBorderRadius` untouched, the COMPUTED `borderRadius` is `8px` on all four corners (via `sgs_corner_object_shorthand()`); and an item with NO background renders no `border-radius` rule. |
| **G14: text-sweep does not collide with background/border layers** | Live DOM: with `itemColourHoverTreatment='sweep'` AND `itemBgHoverTreatment` set AND `itemBorderHoverTreatment='sweep'`, the item renders three non-fighting effects (glyph sweep with no pseudo-element, background on `::before`, band on `::after`), each pseudo carrying its own expected declarations. Negative control for eligibility: set `submenuLinkBg` and assert the submenu link-text row offers exactly two segments; repeat with `burgerBg`, with `triggerMode='icon'`, and with `itemColourGradient`. This is the block's cross-mechanism-interaction gate. **(e)** Sweep x hover text-decoration: with `itemColourHoverTreatment='sweep'` AND `itemTextDecorationHover='underline'`, hover and assert `textDecorationColor` equals the resolved HOVER colour (⛔ asserting `textDecorationLine` alone is the trap); repeat on a sublink; plus the RESOLVED-value negative control (set `submenuLinkBgHover` so the treatment resolves to `'swap'` while stored stays `'sweep'`; the decoration-colour rule must not fire). **(f) THE EMITTER RE-CHECKS THE PREDICATE** (the load-bearing assertion): store `submenuColourHoverTreatment='sweep'` with `submenuLinkBg` empty (clear `submenuLinkBg`, `...Hover`, `...Current` explicitly, as they default to tokens), then set `submenuLinkBg` WITHOUT touching the treatment; the emitted sublink CSS contains no `background-clip`, `-webkit-background-clip` or `-webkit-text-fill-color` and the sublink background paints normally. Repeat: `burgerColourHoverTreatment='sweep'` then `burgerBg`; then switch `triggerMode` back to `'icon'`; `submenuColourHoverTreatment='sweep'` then `submenuLinkBgHover` (leaving `submenuLinkBg` empty); `burgerColourHoverTreatment='sweep'` then `burgerHoverColour` (⛔ assert the hover fill paints as a filled button, not coloured letter shapes). Assert the ABSENCE of the clip declarations in rendered CSS (the control disappears while emission continues, which the editor cannot see) and that the stored value is still `'sweep'`. **(g) THE TWO SURFACES AGREE** (the direct proof of one-declared-source): for each text/icon row pick a stored value straddling the boundary (`'sweep'` plus exactly one blocking attribute) and on the SAME post in the SAME state assert both (i) the editor row renders exactly two segments and (ii) the rendered CSS carries no clip declarations; then the converse on an unblocked fixture. ⛔ Both halves in one check on one stored state; run at least one path per row including the `submenuLinkBgHover` and `burgerHoverColour` straddles. |
| **G15: icon pickers default to the standard glyphs** | With `triggerIcon` / `sublinkMarkerIcon` unset, the rendered SVG is the Lucide `menu` / `chevron-right` glyph (FR-41-30). |
| **G16: the readability toggle works** | On the live canary: (a) the toggle renders in General → Accessibility; (b) flipping it writes `itemSmartContrast` and no other attribute; (c) ⛔ switching it OFF then ON changes the RENDERED text colour on an item with a Hover background (computed `color` differs); and the §14.9.6 cross-reference note renders beneath the Item text and Item background rows. |
| **G17: magnet default costs zero bytes** | With `triggerMagnetEnabled` false, the burger markup carries no `data-sgs-fx` attribute AND no magnet module or stylesheet is enqueued (assert the asset's absence; the enqueue is markup-sniffed). Switched on: attribute present, module enqueued, and the companion `transition` rule from the nav stylesheet is the winning declaration on the button. |
| **G18: exactly one writer per border-colour attribute** | `node plugins/sgs-blocks/scripts/check-duplicate-controls.js` passes AND, because its CHECK 2 is blind to a duplicate writer inside a row object literal, verify in the live editor that `SgsBorderControl` under `showColour={ false }` renders no colour swatch on either mount and that the Colour-panel rows are the only place the three `itemBorderColour*` attributes can be set. Border STYLE: (a) RENDERS on both `showColour={ false }` mounts (§14.9.7, §14.9.9); (b) WRITES: Dashed stores `"dashed"` in `itemBorderStyle` / `submenuBorderStyle` respectively and no other attribute, deselecting stores `""`; (c) EMITS: with a width set, the rendered CSS carries `border-style:dashed` on the item link (and the submenu panel) and `getComputedStyle` agrees. Run (b) and (c) as a matched pair on the SAME value. |
| **G19: the hover typography trio renders, emits, and is NOT the default signal** | (a) all six controls render (three per target) and each writes only its own attribute; (b) with `itemTextDecorationHover: "underline"` and every colour unset, hovering gives `textDecorationLine === 'underline'` while the resting value is not (repeat on a sublink with `submenuFontWeightHover`); (c) additive default: with all six unset assert the ABSENCE of any hover `text-decoration` / `text-transform` / `font-weight` declaration in the rendered CSS; (d) negative control: an `itemTextTransformHover` outside `none/uppercase/lowercase/capitalize` emits NOTHING (FR-41-21); (e) BOTH cross-reference notes render, each pointing at the other (one-way is a failure), and neither string contains "WCAG", "contrast", "AA", "signal" or "divider". Cross-mechanism combinations are G14(e), not here. |
| **G20: the responsive font-size tiers PERSIST and RENDER** | For both prefixes: (a) PERSISTS: set a Tablet font size, reload the editor, assert it survives, then Mobile; ⛔ assert the value is stored INSIDE the tier object (`itemFontSize.tablet`) and that no `itemFontSizeTablet` attribute exists on the post (proves the tiered path). (b) RENDERS: the emitted CSS carries `@media` `font-size` rules at the tablet and mobile breakpoints and the computed `fontSize` differs across the three widths. (c) NEGATIVE CONTROL: with all tiers unset, no `font-size` `@media` rule is emitted for that prefix. |
| **G20c: the ungated-paint detector exists, is REACHABLE and can still fail** | FR-41-35. (a) `python plugins/sgs-blocks/scripts/check-ungated-paint-rules.py --check` exits 0 on the tree. (b) `--self-test` passes and each `*-dirty` fixture makes `--check` exit non-zero while the `*-clean` copy exits 0 (both directions, or the self-test is vacuous). (c) `npm run gate:list` shows the gate (not a `package.json` grep). (d) FRAMEWORK-WIDE: `--survey` with no `--block` enumerates every block and the source contains no `sgs-nav-bar-menu` or `sgs-nav-drawer-menu` string literal outside fixtures. (e) `--survey` PRINTS its variable-awareness limit. (f) ENFORCEMENT SCOPE in both directions: a planted ungated rule in either nav block exits non-zero; the same rule in any other block exits 0 with the finding printed (a scope that hard-fails everything is a standing-red gate for every concurrent session). |

### 14.12 Open questions

Recorded, not resolved; each needs an owner call if it matters.

1. **`sgs_typography_css_rule()` has no hover branch.** The two nav blocks are the `showHover` flag's only adopters, paying that cost block-privately (FR-41-21), which duplicates three of the helper's allowlists. Extending the helper to own the trio is the better long-term answer, taken the day a SECOND block wants `showHover`.
2. **The hover-treatment selector (FR-41-23/24) is deliberately block-private.** Promote it to a shared `plugins/sgs-blocks/src/components/primitives` export the day a SECOND block wants the pairing, not before.
3. **`SgsColourPanel.js`'s three documented exemptions have a named block-scoped exception** (FR-41-33: border colour joins the panel for the two nav blocks only). If a second block takes the same exception, re-litigate the exemption list rather than accumulating one-offs.
4. **The default non-colour Hover signal is conditional on the operator setting a border width** (FR-41-17a(a), accepted). If clients routinely ship border-less menus with two similar state colours, the honest fix is a warn-only inspector notice, not a re-defaulted border (an owner call).
5. **Active-trail semantics.** The visual ancestor Current styling is built; an ancestor-path list plus a client-side prefix match stamping a distinct (non-`aria-current`) signal is not (FR-41-20).
