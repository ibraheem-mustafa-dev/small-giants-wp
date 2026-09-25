---
doc_type: spec
spec_id: 36
spec_version: 2.7
title: SGS Navigation System
project: small-giants-wp
status: active
owner: framework
last_verified: 2026-09-23
references:
  - .claude/specs/37-HEADER-FOOTER-BUILDER.md
  - .claude/specs/41-NAV-MENU-COLOUR-STATE-SYSTEM.md
  - .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md
  - .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md
  - .claude/plans/archive/2026-07-18-P2-builder-ux-design-gate.md
---

# Spec 36 — SGS Navigation System

## 0. One-liner + plain English

A set of blocks + a CPT that render a WordPress menu as a best-in-class navigation — a desktop bar with
dropdowns + rich mega-menus, and an off-canvas drawer — meeting AND exceeding top WP-theme competitors +
general web/UX, fully accessible + crawlable, decoupled inside the header (Spec 37), and a faithful
cloning-pipeline emit target. Spec 36 is the SINGLE canonical home for the whole header/nav element set:
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

**OWNS:** the nav blocks (`sgs/nav-bar-menu`, `sgs/nav-drawer-menu`, `sgs/nav-drawer`) + the mega CPT, their
rendering/behaviour + editor controls, the menu-data contract, and the nav's accessibility, discoverability,
and converter-emit contracts. **Also the header/nav PRESENTATION of the utility pieces it composes with** —
cart, search, social, logo, business-info (FR-36-19..23): their nav/header rendering, behaviour + editor
controls. (The underlying WooCommerce cart / Store-API logic remains WooCommerce's.) The **single canonical
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
model/behaviours (Spec 37). Building the cloning WALKER (31/33).

### 1a. FR INDEX — read this before scanning the document

**FR numbers are stable identifiers, not a reading order.** FR-36-27 falls between FR-36-6 and FR-36-7;
FR-36-24 between FR-36-8 and FR-36-9; FR-36-19…26 are grouped in §4. They are cited from live PHP/JS
comments and other specs, so ⛔ **do NOT renumber**. Use this index instead.

⛔ **No status column, deliberately.** Live build status single-sources to **`.claude/LEDGER.md`**; a status
column here would drift against the code.

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
| FR-36-28 | 6 | Nav colour-state + control system → **Spec 41** (satisfies FR-36-4's hover/focus half + FR-36-11's colour floor; the ARIA active-trail is NOT satisfied — Spec 41 FR-41-20) |

## 2. Architecture

### FR-36-1 — Menu data = native WP menus (CLASSIC primary; block-menu support = Phase 3)
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
| Part | Type | Responsibility |
|---|---|---|
| `sgs/nav-bar-menu` | block (dynamic), `"ancestor": ["sgs/site-header-row"]` | The menu on a header row: a horizontal **bar** with dropdown/mega triggers (desktop); **below its collapse point it renders a burger that opens the drawer** (FR-36-8) — NOT an inline list. Split layout (`splitAfterItemId` / `splitSide` / `showBurger`), a menu-item-description badge (e.g. "SOON"), and the menu-button presentation (`triggerMode` / `triggerIcon` / `triggerLabel`, FR-36-27) are built. Block-private root (no `SGS_Container_Wrapper`) — see FR-36-13. May ship pre-set flavours via `registerBlockVariation`. |
| `sgs/nav-drawer-menu` | block (dynamic), `"ancestor": ["sgs/nav-drawer"]` | The menu inside a drawer: a vertical **accordion/drill-down list**, chosen via the `submenuModel` context published by `sgs/nav-drawer`. Structurally cannot be inserted anywhere else (editor-enforced by its `ancestor` constraint). Two-tier lists (`listColumns`, `splitAfterItemId` / `splitSide`) are built. |
| `sgs_mega_menu` | **CPT** (block-based, container-like) | A rich mega panel = a per-client editable, block-based post (`sgs/mega-panel` with `sgs/mega-group` / `sgs/mega-aside` columns and any SGS blocks), edited in its own findable admin screen. **Attached to a menu item the normal WP way** (add it to the menu in Appearance → Menus like a page — FR-36-5). Rendered at the item's real position; inside the drawer the same panel renders in the item's accordion by default (FR-36-6). KIND = section/layout (keeps `SGS_Container_Wrapper`). |
| `sgs_drawer` | **CPT** ("Menu drawer"), revisions, template-locked | The off-canvas panel a burger opens, edited on its own screen. Registered in `plugins/sgs-blocks/includes/class-sgs-block-cpts.php`; Active model in `plugins/sgs-blocks/includes/class-sgs-active-layout.php` (`Sgs_Active_Layout::AREA_DRAWER`); printed on `wp_footer` by `plugins/sgs-blocks/includes/class-sgs-drawer-render.php`. Owned by Spec 37 FR-37-43; drawer BEHAVIOUR is FR-36-6. |
| `sgs/nav-drawer` | block (dynamic) | The off-canvas **container** the burger opens — the content of an `sgs_drawer` post. A fixed × close (chrome) above ONE InnerBlocks body seeded with `sgs/nav-drawer-menu`. A native `<dialog>` (default `showModal()`, top-layer → survives a transformed header ancestor; `.show()` opt-in). No child blocks; no header-row import (FR-36-6). |
| Shared nav plumbing | `viewScriptModule` + a `@wordpress/interactivity` `store('sgs/nav')` (PUBLIC API — the established SGS pattern; NOT a block, NOT core-nav internals) | One open/close/focus/`inert`/intent-timing utility for the disclosure (dropdown + mega) + dialog (drawer) surfaces. Framework-reusable. |
| `sgs/cart` (extend) | block (dynamic) | Header cart — count badge + mini-cart (`displayMode` link / flyout / drawer). FR-36-19. |
| `sgs/product-search` / `filter-search` (extend) | block (dynamic) | Predictive search combobox with four display modes. FR-36-20. |
| `sgs/social-icons` (extend) | block | Site-wide social icon list, one source rendered in header + footer + drawer. FR-36-21. |
| `sgs/responsive-logo` (extend) | block | The logo OBJECT (per-device image, link-home, colour treatment). Lockup, favicon-sync and variants are planned. FR-36-22. |
| `sgs/business-info` (extend) | block | The Site-Info source of truth (name/phone/email/address/hours → header + footer + contact + schema). FR-36-23. |

### FR-36-3 — CPT model consistent with P2 (precise reuse)
`sgs_mega_menu` mirrors P2's "per-client editable structural content = a CPT" (`sgs_header`). Reuses: the
CPT editing home + native block editor; the **starter-template picker** (P2 §2.5 — the 5 mega layouts are
git-versioned theme patterns, FR-36-5); the converter **pack factory** (P2 §9 — *unbuilt, a build-order
dep*). Does NOT use `Sgs_Header_Rules` / `sgs_active_header_cpt_id`. The panel's `templateLock` is `false`,
never `contentOnly` (FR-36-5). **Why a CPT:** chosen over InnerBlocks / synced-patterns / template-parts on
findability + header-consistency + zero bespoke admin UX.

## 3. Behaviour

### FR-36-4 — Desktop disclosure (dropdown + mega)
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
- **Gap below the header.** `submenuTopOffset` (Spec 41 FR-41-11) is the gap between the header's bottom edge
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
  `itemPadding` (`sgs/nav-bar-menu` only) is the top-level link's padding, a per-device box of top, right, bottom
  and left ("Link padding" in the List layout panel); unset sides keep the default 8px 12px. All four are touch-guarded via `sgs_hover_state_rules()`. On `sgs/mega-panel`: `panelCardLift`
  (default `3px`) sets the `cards` style's group-tile hover/focus-within lift distance
  (`translateY(calc(-1 * <value>))`); the same block's `itemPaddingShiftHover` grows a group item's own
  inline-start padding on hover, independently of the bar/drawer attribute of the same name. `sliding pill`
  (`itemBgHoverTreatment`), tint swap, colour, weight, underline and border stay owned by Spec 41.
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
detail:** a featured style a draft can author MUST have somewhere in the data model to land — otherwise the
converter silently drops the draft's featured fill and the text renders accent-on-surface below AA.

**"Distinct hover+focus states" has a named mechanism — [Spec 41](41-NAV-MENU-COLOUR-STATE-SYSTEM.md)
(FR-36-28). The ARIA "active-trail" does NOT, and is NOT BUILT; ancestor-item Current styling is built in CSS (Spec 41 FR-41-20).** Spec 41 supplies the concrete state model: exactly
THREE states — Normal / Hover / **current** — on every stateful colour, `current` keyed on the
`aria-current="page"` that `plugins/sgs-blocks/src/blocks/nav-bar-menu/view.js::markCurrentPage` (identical
in `plugins/sgs-blocks/src/blocks/nav-drawer-menu/view.js::markCurrentPage`) stamps client-side (FR-36-11's
cache-safe mechanism, reused not re-derived; `current` is the framework's own state vocabulary per
`plugins/sgs-blocks/scripts/consistency/golden-controls.json::_meta.stateVocabulary.real`). Hover and current
stay VISUALLY DISTINCT and Hover out-ranks current by source order, so a visitor can tell where they ARE from
what they are POINTING AT.

⛔ **The ARIA active-trail half of this clause is NOT satisfied by Spec 41 and must not be read as satisfied.**
`markCurrentPage` matches by EXACT path equality (`path !== '' && path === current`), so a parent menu item
whose CHILD page is the current page receives no `aria-current` marking, so assistive technology gets no ancestor signal (the item's visual Current styling is applied by CSS — Spec 41 FR-41-20). Spec 41
implements "this exact link is the current page" and states the boundary as its own FR-41-20. The ARIA active-trail
needs an ancestor-path list emitted per item at render time plus a prefix match in `markCurrentPage`
stamping a signal that is NOT `aria-current="page"` (which is single-valued per page and belongs to the
exact link). It has no owner.

⛔ The `featured` item-flag mechanism above is OUT of Spec 41's scope. Spec 41 also carries nav behaviours
that are correctness fixes with no operator control: a parent item stays in its Hover state while its own
open dropdown is hovered, and the hover-highlight background is painted from the item Background row's Hover
swatch when `itemBgHoverTreatment === 'highlight'`.

### FR-36-5 — The mega CPT + the native-menu association

⛔ **Panel locking contract — `templateLock:false` + `allowedBlocks`, NEVER `contentOnly`.** `contentOnly`
hides child settings, so a client could not edit the icon-list link lists. The panel
(`plugins/sgs-blocks/src/blocks/mega-panel/edit.js`) lets the client add / remove / reorder one or more
`sgs/mega-group` / `sgs/mega-aside` columns. Each child block locks its own internal template with
`templateLock:'insert'` — never `'all'` or `'contentOnly'`, both of which re-run WordPress's template sync on
every editor mount and silently drop stored content that no longer lines up with the template by position.
An operator cannot break a column's shape but can freely select and edit any nested block's own settings.

**Competitive positioning (Spec 02 §23):** the mega system is the block-native alternative to Max Mega Menu,
JetMenu (Crocoblock), and Kadence Pro mega menu — ARIA-compliant, semantic HTML, **zero external
dependencies**. Elementor's mega menu needs Elementor Pro ($59–399/yr) and generates heavy DOM; Max Mega Menu
(the most popular free alternative) has documented WCAG failures + mobile-toggle issues. Panels use
DISCLOSURE semantics, never `role="menu"` (FR-36-10), and are block-based CPT posts, never template parts.
- A mega panel is a **block-based CPT post** edited in its findable admin screen; the 5 layouts are
  git-versioned starter theme patterns registered for the `sgs_mega_menu` post type:
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
  applied to the panel's own fill) — through `includes/helpers-surface-ground.php`, plus its own
  `shadow`/`shadowColour` writer (`shadow` default `floating`, one of the theme shadow presets, or a raw
  layer stack composed with `shadowColour`; empty means no shadow). The panel's `borderRadius` stays a plain
  string today; migrating it to a `{desktop,tablet,mobile}` tier object, matching the header and container,
  awaits Bean's ruling.

### FR-36-6 — The drawer (`sgs/nav-drawer`) — native `<dialog>` container in the `sgs_drawer` CPT
**ONE block, ONE InnerBlocks region, NO child blocks.** The drawer is `sgs/nav-drawer` and nothing else. It
LIVES INSIDE the `sgs_drawer` CPT as that post's content (the CPT's template is a single locked
`sgs/nav-drawer` block); there is no CPT-native "no block" model.

**Structure = a CHROME TOP ROW + one editable body.**

**1. The chrome top row** — rendered by render.php OUTSIDE the editable InnerBlocks. It is the *close
button's* band; everything else in it is optional. Attribute-driven (NOT blocks, NOT InnerBlocks).

*BUILT — the × close* (Wave 3C U-11, D-entry and design `.claude/reports/2026-09-24-u9-u11-design.md`).
Rendered as fixed dialog chrome (see "Close is CHROME" below). **The × is omitted at a tier only when ALL
THREE hold at that tier:** (1) `modality` is `non-modal`; (2) `closeStyle` at that tier is `trigger` ("the
menu button closes it"); (3) the opener is LIVE, meaning its centre point hit-tests to itself
(`document.elementsFromPoint`) and it has client rects, so a burger painted under the drawer, hidden or
off-screen does not count. `render.php` emits the eligibility rule for (1) and (2), scoped to
`[data-sgs-nav-opener-live]`; `store.js` sets that flag after `show()` and before focus, re-checks it on
resize, and clears it once the dialog has closed (never before the exit animation, which would bring the × back mid-close). In every other combination the × shows (under `trigger` it
wears the `separate-x` glyph); no operator setting removes the last live close control. This is DEC-15 (b)'s
own wording ("required only when no other visible, keyboard-reachable close control is live"); the earlier
text keyed it on `burger-morph`, which missed the references whose trigger swaps its LABEL.
Attributes: `closeStyle`, a per-device tier object `{desktop,tablet,mobile}` of `separate-x` | `text-swap` |
`burger-morph` | `icon-and-text` | `trigger` (cascade desktop → tablet → mobile; stored flat strings were
migrated by `scripts/migrate-stored-tier-scalars.py`, because WordPress coerces a schema-invalid stored value
to the default before render; the PHP twin
`plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$sgs_nd_allowed_close_styles` must equal the editor's
option list); `closePlacement` tier object (`top-row-end` default | `top-row-start` | `same-slot`, the × centred
on the opener's centre, measured by `store.js`; `same-slot` needs `modal` and resolves to `top-row-end` under
`non-modal`, where the header paints above the drawer); `closeOffset` tier object `{x,y}` px (x on the inline
axis); `closeRadius` tier object; `closeLabel`, `closeIcon` (an
icon-picker object `{source,name}`, default `{lucide, x}`, resolved by
`plugins/sgs-blocks/includes/nav-menu-treatments.php::sgs_nav_shared_icon_markup`), `closeSize` (the hit box
never goes below 44px), the close-label typography set, and the `toggleCloseColour*` colour/hover/gradient
set. Gradient is routed per icon source by `sgs_icon_gradient_css()`; never restrict the icon source enum.

*NOT BUILT — the rest of the chrome row:*
- **Canvas/frontend icon parity.** The frontend renders the picker-driven `closeIcon`; the editor canvas
  preview (`plugins/sgs-blocks/src/blocks/nav-drawer/edit.js`) renders the `close` glyph imported from
  `@wordpress/icons` for `separate-x` and `icon-and-text`. Both MUST resolve to the same picker-driven source,
  or the canvas and the frontend show different icons.
- **An optional logo** — show/hide, responsive per device. Use the per-tier scalar pattern
  `sgs/responsive-logo` uses (`plugins/sgs-blocks/src/blocks/responsive-logo/block.json::attributes.logoId` /
  `.logoUrl`, plus their `…Tablet` / `…Mobile` siblings): a logo is art-direction per device, not one image
  with controls, so the generic image-controls path does not fit it. The shared media-atoms family
  (`plugins/sgs-blocks/src/components/media/atoms/registry.js`, PHP twins under
  `plugins/sgs-blocks/includes/media/atoms/`) is real but is not the logo pattern.
- **An optional free slot** — ONE of heading / label / text / button. Button styling via the shared
  `sgs_button_element_style_css()` with its own prefix (precedent: `sgs/modal`, `sgs/product-card`); heading
  level switchable per `product-card`'s `headingLevel` (`css_property: tag`). This exists because two
  references put a non-logo item in the close row — a "YOU MADE IT" label and a "LET'S TALK!" CTA — while 4
  of the 7 close-bearing references are logo+close only, so the slot is optional, not a layout system.
- **The row itself** carries background / padding / height controls. **The row is NET-NEW markup:** the × is
  a bare sibling `<button>` inside the `<dialog>` (built as
  `plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$close_html`, printed as the second argument of the
  final `<dialog>` `printf`), so a row element must be BUILT before it can be styled, and the hardcoded
  `padding-top:64px` in `plugins/sgs-blocks/src/blocks/nav-drawer/style.css::.sgs-nav-drawer__body` (which
  reserves space for the floating ×) goes away as part of that work — the row occupies that space instead.

⛔ **THE CHROME ROW REPLACES THE SEEDED BLOCKS — it does not sit above them.**
`plugins/sgs-blocks/src/blocks/nav-drawer/edit.js::TEMPLATE` seeds `[ sgs/nav-drawer-menu,
sgs/responsive-logo, sgs/button ]` today. When the chrome row lands, **`sgs/responsive-logo` and
`sgs/button` leave that template** — their roles become the row's logo element and free slot. Leaving them
produces a drawer with two logos and two CTAs, one of each in chrome and one still droppable in the body.
**Done-check (a build passing every other gate can still fail this one):** `edit.js`'s `TEMPLATE` contains
`sgs/nav-drawer-menu` ONLY, and the logo / free-slot markup appears in `render.php`'s printed chrome, never
inside `useInnerBlocksProps` output. Assert both; no existing gate covers this.

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
`trigger` | `centred`) + `panelSize` + `anchorOffset`, emitted per tier by
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
which `nav-drilldown.js` already handles. Both menu forks render a panel through one helper,
`plugins/sgs-blocks/includes/helpers-mega-render.php::sgs_mega_render_item_panel`; the render context (`''` or `drawer`) rides a
push/pop stack read by `sgs_mega_render_context()`, and in the drawer `sgs/mega-panel` hashes its own class
and draws no floating shell (fill, border, radius, shadow, backdrop, width cap, padding, the `cards` hover
glow, the tone class) while keeping `container-type` for its narrow stack; its text follows the drawer. The
drawer's `sublinkMarkerColour` also colours an embedded panel's list markers (`--sgs-list-marker-colour`).
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

**Close routes beyond the ×** (Wave 3C U-9): Escape, backdrop and scrim click, the live trigger. **Resize
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
default 100), written only by `includes/sgs-header-z-index.php` and published as `--sgs-header-z`. Per
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
`surfaceSaturate`, `surfaceOpacity`, through `includes/helpers-surface-ground.php`, the same emitter the
header and the mega panel use) + a `shadow`/`shadowColour`
writer (M-13, same vocabulary as the mega panel's) + a background-image media layer
(`backgroundImage*`, `backgroundImageDecorative` — painted as a CSS layer, never a frontend `<img>`) + `closeStyle` + `sgs/nav-drawer-menu` `listColumns` (in-drawer
only) + **seven drawer looks as patterns** (`theme/sgs-theme/patterns/drawer-*.php`, keyword `featured`; the block
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

**The scrim (Wave 3C U-2, M-14, D1148).** The drawer and the menu bar (`sgs/nav-bar-menu`, for every dropdown and mega panel it opens) carry the shared scrim: `supports.sgs.scrim` plus `scrimColour`, `scrimColourGradient` and per-device `scrimOpacity` and `scrimBlur`, rendered by `includes/helpers-scrim.php::sgs_scrim_render` (tint on `::before`, blur on the element, open state from CSS `:root:has(<open selector>)`, printed at `wp_footer`). Defaults: the drawer is black at 0.55; the bar has none unless set. A click on the scrim closes the surface and is absorbed, so a dismiss never follows a link underneath (lamalama's click-through is an accepted divergence). The same helper serves `sgs/modal`, the `sgs/cart` drawer, the `sgs/gallery` lightbox and `sgs/product-search`; `scripts/scrim/check-scrim.py` fails the build on any dimming block that paints its own. The earlier "NO scrim element, 8/8 references have none" held for the eight drawer-variant references only; M-14's six references show part-width drawers and panels with one. 

**Motion: how the drawer and the panels arrive and leave (Wave 3C U-5, M-31, M-32).** One vocabulary across
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
  panels; the drawer's scrim fades with the drawer unless `scrimFadeDuration` is set.
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
- **Fidelity status.** The seven looks reproduce structure and copy, not design: styling, borders,
  symbols, button treatment, cycling background imagery and its motion, and animated secondary media are
  absent. They must not be presented as faithful clones without rework; the Bean's-eye rubric (§8) lists
  the grounds that review checks. Record: `.claude/reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md`.
- **POC content rule:** POC fixtures are EXACT clones INCLUDING content (per-fixture classic menus with the
  references' real labels + copy) so differences attribute to the block; genericising the content is a named
  pre-production step (`P-DRAWER-VARIANT-CONTENT-GENERICISE`). Fixtures that are not exact clones:
  `P-DRAWER-POC-FIXTURES-NOT-EXACT-CLONES`.
- **Draft-side look detection** needs value/roster matching and belongs to Spec 33 Part 2.
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
   header starter patterns embed no `sgs/nav-drawer` (only the nine drawer starters do:
   `theme/sgs-theme/patterns/drawer-scratch.php`, `framework-drawer-default.php` and the seven `drawer-*.php` looks).
2. **The seven looks as "Menu drawer" starter patterns — BUILT.** Each look is a pattern
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
   **NOT BUILT:** inline "create a drawer" from the picker.
4. **The nav-menu blocks stay BLOCKS** (`sgs/nav-bar-menu` and `sgs/nav-drawer-menu`) — their content home is
   the classic menu, their edit surface is the header CPT; a nav-menu CPT would triple-indirect. Trigger
   presentation: FR-36-27.
5. **Controllability contract:** every reference-derived property has exactly one home — CPT content/attrs,
   inspector attrs (Spec 35-manifested), or theme tokens. A value with no home is a build defect.
6. **Cloning is the FINAL PROOF GATE, not the next task:** fixture wave → capability wave (CPT + FR-36-27 +
   FR-37-42 + harness fixes) → polish → the 12-reference clone, studionamma first, each accepted clone
   yielding its starter presets.

**Drawer settings surface — BUILT** (a "Drawer" inspector panel, per-device via the shared
`ResponsiveControl`, never a new switcher; all emission through the shared responsive helpers into the
scoped `<style>`, zero inline):
| Setting | Attr | Shape | Default | Notes |
|---|---|---|---|---|
| Background | `drawerBg` | string slug | `surface` | fg computed (WCAG resolver — contrast holds with zero config) |
| Close icon colour | `toggleCloseColour` | string slug | `""` = computed from header context | × colour when open; burger colour untouched (owned by header styling) |
| Content alignment | `drawerAlign` | enum `left`/`center`/`right` (CSS keyword — US spelling is the syntax, UK-rule exempt) | `left` | maps to align-items on the drawer body; children may override |
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

### FR-36-27 — Burger trigger presentation — PARTIAL
The references make the trigger a designed element (one renders the word "MENU", one a symbol, one a morphing
glyph). **BUILT** on `sgs/nav-bar-menu` (burger is bar-only), all inspector-manifested: `triggerMode`
(`icon` | `text` | `icon-and-text`, per device: a tier object), `triggerIconPosition` (icon before or after the
label), `triggerIcon` (an `IconPicker` object), `triggerLabel` (default
"Menu"), and the magnet-hover attributes (`triggerMagnetEnabled` / `Radius` / `Strength`), specified in Spec
41 FR-41-30/31. The burger↔X morph is built but auto-gated to the default glyph
(`plugins/sgs-blocks/includes/nav-menu-markup.php::sgs_nav_bar_menu_burger_toggle_markup`, `$is_default_icon`).
**Its pose and timing are operator choices (Wave 3C U-11):** `burgerMorph` (`x` default | `x-rotate`, an X
plus a 180 degree turn | `line`, the bars collapse onto one line | `none`), `burgerMorphDuration` (ms,
default 200) and `burgerMorphEasing` (named curves from the theme easing tokens plus a validated custom
`cubic-bezier()`), delivered as custom properties; reduced motion still wins. `burgerBarCount` (3 default, or
2) sets how many bars the default glyph draws; two bars sit 6.5px apart centre to centre and have their own pose
under every `burgerMorph` value (wearecollins' two bars cross into an X). Bar thickness (2px) and width (24px)
are structural, a recorded divergence from the references' 1.5px bars 16 to 18px wide. The bar items' label magnet
takes `itemMagnetStrength` (the pull factor; unset keeps the built-in 0.15 capped at 8px). The burger button
carries `data-sgs-nav-collapse` (its `collapsePoint`) for FR-36-6's resize rule.
**Reach, built (Wave 3C U-14):** `triggerSurface` (tier on/off, "Whole row opens the menu", M-39, DEC-14 as
amended to a separate attribute): below the collapse point the burger's `::after` stretches over its
`.sgs-site-header-row`, so a click anywhere on the row is a click on the button (no JS); the magnet's transform
moves to the button's children at those tiers, and other row blocks sit above the overlay
(`plugins/sgs-blocks/includes/nav-trigger-surface-css.php`). The detaching chip (M-08, buck): `triggerDetach` (tier on/off),
`triggerDetachAfter` (tier px), `triggerDetachSize` (tier px, never below 44), `triggerDetachOffset` (tier
`{x,y}`, x from the inline end), `triggerDetachRadius`, `triggerDetachBackground`(`Hover`; empty paints the opaque surface token, as buck's chip is
filled once it detaches), `triggerDetachZIndex` (110). Once the header's burger is off screen and the page has scrolled past the tier's
threshold, a second copy of the burger (the same markup call, wrapper `__detach-wrap`, printed on `wp_footer` by
`plugins/sgs-blocks/includes/nav-detach-chip.php` because a row's transform would trap a fixed child) shows fixed in the top
inline-end corner, below the admin bar; `plugins/sgs-blocks/src/shared/nav-interactivity/detach-chip.js` sets `is-detached`. Every
opener of one drawer reads one open state (`plugins/sgs-blocks/src/shared/nav-interactivity/store.js::state.openByRef`), so `aria-expanded` agrees on both.

**Swap-label, built (Wave 3C U-6):** `triggerOpenLabel` (the word while the drawer is open, '' none) and
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
One `viewScriptModule` + `store('sgs/nav', …)` (public API — the established SGS pattern; NOT core-nav's
private store) for open/close/focus/`inert`/intent-timing across the disclosure + dialog surfaces. A UTILITY
not a component (prove by the three call-sites). It carries the drawer's body-reparent (transform-ancestor
escape) and scrollbar-bounce compensation as existing mechanisms, not re-derived. **No-JS honesty:** the
menu's **links + top-level items are navigable + crawlable without JS**; the **dropdown/mega/drawer
*panels* are progressive enhancement** (the drawer degrades to `<details>`; a bar dropdown's links are still
reachable on the target page). "Crawlable without JS" ≠ "every panel opens without JS."

### FR-36-8 — Responsive collapse + THREE operator-chosen modes + per-device visibility
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
- **Moving a header block into the drawer (Wave 3C U-10, M-19) — BUILT by composition.** A copy of the block
  goes in the drawer body and the header copy is hidden: by tier with `sgsHideOnMobile/Tablet/Desktop`, or
  exactly while this menu shows its burger with `sgsCollapseVisibility` (`hide` | `only`), whose rules the
  header writes at this block's `collapsePoint` (Spec 37 FR-37-24, "At the collapse point, not a tier").
  Blocks reading Site Info carry no duplicate data.

### FR-36-24 — Per-device content + settings (beside FR-36-8; Spectra-standard)
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
  diagnose (`P-HEADER-SIMPLICITY-FINDINGS` finding 1). The Notice says so in plain English and offers
  **"Add the menu panel"**, which inserts an `sgs/nav-drawer` (seeded with a `sgs/nav-drawer-menu` on the
  same menu) as a **root-level SIBLING** of whatever top-level block the header's `sgs/nav-bar-menu` sits
  in, and selects it so the operator lands on its content. There is no one-click re-point to a different
  drawer: a mismatch notice points at the "Panel this burger opens" picker.
- **The site-wide Active drawer answers** (an ordinary page holding no `sgs/nav-drawer` block is the CORRECT
  state). The Notice shows where to edit the panel ("Edit the menu panel") and declares that the editor
  canvas cannot preview it (`wp_footer` never fires there). It matches on the Active drawer's own
  `drawerRef` (a burger opens by element id, so an Active drawer with a different ref genuinely opens
  nothing).

**Binding details, mirrored from the render path:** with no specific pick, a blank `drawerRef` resolves to
`sgs-nav-drawer` on BOTH sides (`Sgs_Drawer_Render::drawer_ref_for()` and
`plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$drawer_ref`), so the editor compares *effective*
refs — a blank-vs-default pair is a MATCH. **The notice only fires on `sgs/nav-bar-menu` instances** —
`sgs/nav-drawer-menu` has no `drawerRef` attribute. The fix action is gated on `sgs/nav-drawer` and `sgs/nav-drawer-menu` being
registered (`createBlock` does not check the slug: an unregistered one inserts a dead `core/missing` placeholder). **The drawer cannot be seeded from
`sgs/site-header`'s TEMPLATE** — its root is a `<dialog>` that promotes to the top layer, it must be a
sibling, and the container is `templateLock:'all'` around exactly three rows. A notice on the nav block is
the only mechanism that reaches the raw-insert path. **Informational, never a gate** (Spec 37 FR-37-19 /
P1 DP2a): an operator can always save a header with no drawer — a client blocked from saving with no trail is
the failure that policy exists to prevent.

## 4. Utility pieces (best-version; EXTEND existing blocks)

> The nav composes with five utility pieces. Each EXTENDS an existing block — with an HONEST built-vs-to-build
> note and a phase line so a solo builder knows the sequence. The ONE a11y decision gate for every interactive
> piece is FR-36-10's: does the open panel leave the page usable (**DISCLOSURE**) or dim/block it (**DIALOG**)?
> — reuse that contract, never a second one. All bind the §10 constraints (no-inline, Spec 35A Part L controls,
> converter-emittable, WCAG, perf, UK).

### Spec maturity index — read this before dispatching any §4 FR

The FRs in this section sit at uneven maturity. FR-36-26 is a dispatchable sub-spec (frozen attribute table,
definition of done, converter contract); the others are one page of intent each, or built. A reader who
assumes they are peers will hand an OUTLINE FR to a builder and get several different implementations.

`Spec maturity` answers exactly one question: **"can this FR be handed to a builder AS WRITTEN, without a
design pass first?"** That is a property of *this document's own text*; it changes when the spec is edited,
never when code ships. Live build status single-sources to **`.claude/LEDGER.md`** (§1a). Do not merge the
two.

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
**Spec maturity: `OUTLINE`** — see the §4 index.

**Status: BUILT.** `sgs/cart` renders a count badge and a mini-cart: `displayMode`
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
**Spec maturity: `OUTLINE`** — see the §4 index.

**Status: BUILT, four display modes.** A genuine EXTEND — the full WAI-ARIA **combobox** pattern is shipped in
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
- **Differentiator:** ONE shared combobox implementation reused across all display modes; native Store-API
  (products) + post (content) wiring — competitors bolt this on via premium/third-party (FiboSearch).
  Result count / no-results = a live region (WCAG 4.1.3), same as the cart.

### FR-36-21 — Social icons (`sgs/social-icons`, extend)
**Spec maturity: `OUTLINE`** — see the §4 index.

**Status: BUILT** for accessible names, custom-SVG upload and the Site-Info source. Accessible names are
generated per icon in `plugins/sgs-blocks/src/blocks/social-icons/render.php` ("Follow us on %s", editable
per item, glyph `aria-hidden`); `source` is `manual` | `site-info`.
- **MUST:** curated platform set + first-class custom-SVG upload; **accessible name per icon auto-generated +
  editable** (verb+platform, "Follow us on Instagram"; glyph `aria-hidden` — WP core omits `aria-label` by
  default, a citable competitor gap); external new-tab links carry `rel="noopener"` automatically
  (`plugins/sgs-blocks/includes/helpers-link.php::sgs_link_attributes`) with `nofollow` / `sponsored` / `ugc`
  / `noreferrer` as per-item operator `rel` tokens; open-in-new-tab default-on; size/shape/spacing controls;
  brand vs monochrome/theme colour + hover colour; keyboard-reachable + visible focus (never hover-only
  reveal).
- **SHOULD:** ONE site-wide list rendered in header+footer+drawer, independently styled per placement (the
  structured-data-once differentiator, FR-36-25); drag-to-reorder.
- **NICE:** explicit Follow-vs-Share as distinct components; reduced-motion-gated hover micro-interaction;
  optional `rel="me"`.

### FR-36-22 — Logo (`sgs/responsive-logo`, extend) — the logo OBJECT
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
  sticky-header compact-mark swap. **BUILT:** `colourTreatment` (`''` | `white`) forces the logo IMAGE to
  pure white via a CSS filter, for a full-colour logo on a dark surface such as `sgs/site-footer`.
- **SHOULD (Phase 3):** transparent-header light/dark variant; shrink-on-scroll (row+logo dimension animate);
  dark-mode variant; logo+site-title lockup toggle; **sync-as-favicon** (WP core `shouldSyncIcon`).
- **NICE:** reduced-motion SVG entrance/hover; auto-2x raster.
- **Differentiator:** ONE logo *object* attribute (desktop/mobile/sticky/transparent/dark with a fallback
  chain) in one inspector panel with live preview — beats the competitors' split-across-panels UX. A11y/SEO:
  visible focus (first tab-stop); `<img>` in `<a href="/">` near DOM top.

### FR-36-23 — Business-info / contact (`sgs/business-info`, extend) — the Site-Info source of truth
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
**Spec maturity: `DISPATCHABLE`** — FR-36-26c freezes the attribute table, the definition of done and the
live verification (§4 index). **Status: BUILT.** Presentation (heading + markers + typography) and
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

#### FR-36-26b — Converter routing target (declared now; recognition is Spec 33 Part 2's)
The specialised header/footer converter ("Spec 33 Part 2") is not built and is deliberately not designed
here. But its EMIT TARGET for this content type is stable, so it is declared now. Part 2 INHERITS the mapping
below and only has to solve RECOGNITION (identifying the region in a draft) plus the conversion mechanics.

**Declared routing — a draft footer "heading + list of links" region maps to:**

| Draft signal | Emit |
|---|---|
| Heading + list whose items link to site pages | ONE `sgs/icon-list`, `source: "typed"`, heading = the draft's heading text, one `items[]` entry per link (`text` + `url`) |
| The same, where the draft list appears to mirror a site menu | STILL `source: "typed"` on a first pass — binding to a real menu is an OPERATOR decision, not something the converter should infer |
| Heading + list with NO links | ONE `sgs/icon-list`, `source: "typed"`, `markerType` per the draft's visual marker, `<nav>` OFF |

**Binding constraints on that emit:** never `core/list` or `core/navigation` (both banned);
`markerType` derived from the draft's RENDERED marker (`icon`/`emoji`/`bullet`/`numbered`/`none`),
with `numbered` forcing `<ol>`; the heading is the block's own `heading` ATTRIBUTE, never a sibling
`sgs/heading` block — a sibling would break the `aria-labelledby` contract in FR-36-26a; and the
`<nav>` landmark defaults OFF for converted typed lists, per rule 3 above.

**Out of scope here:** how Part 2 RECOGNISES a footer link-list region in an arbitrary draft. That is Part
2's design problem; this entry exists so the MAPPING is not re-decided then.

#### FR-36-26c — Build scope and contract (BUILT)
**Data model — attributes on `sgs/icon-list`.** Shapes are frozen: declare the SHAPE, not just the value,
or WP coerces to the default.

| Attr | Type | Default | Notes |
|---|---|---|---|
| `heading` | string | `''` | The list title. Blank = render no heading element at all |
| `headingLevel` | string | `'h3'` | `h2`–`h6` or `p`. **No JSON `enum`** — validate in PHP (`blockjson-enum-coerces-invalid-to-default`: an out-of-enum stored value is silently coerced) |
| `source` | string | `'typed'` | `typed` \| `menu`. Never a JSON enum, same reason |
| `menuRef` | integer | `0` | The `nav_menu` term id when `source: menu`. `0` = unset |
| `markerType` | string | `'icon'` | `icon` \| `emoji` \| `bullet` \| `numbered` \| `none` |
| `numberFormat` | string | `'decimal'` | `decimal` \| `decimal-leading-zero` (01, 02 …) for a `numbered` list; with `numberColour`, `numberFontSize`, `numberFontWeight` it paints the `<ol>`'s `::marker`. A drawer's `sublinkMarkerColour` wins inside an embedded mega panel (`--sgs-list-marker-colour`). Wave 3C U-7 |
| `siblingDimColour` (+`Gradient`), `siblingDimOpacity`, `labelRoll`, `itemMotionDuration`/`Easing` | — | — | Sibling dim and the two-copy label roll on the list's items (Spec 41 FR-41-39, FR-41-40), e.g. a footer menu list |
| `renderLandmark` | boolean | `false` | Emits the `<nav>` wrapper. Set `true` by default ONLY when `source: menu` (FR-36-26a rule 3) |
| `heading*` typography family | per R-22-13 | — | `headingFontSize`/`Unit`/`Tablet`/`Mobile`, `headingFontWeight`, `headingFontStyle`, `headingLineHeight`/`Unit` |
| `item*` typography family | per R-22-13 | — | Same suffix set, prefix `item` |

**Typography is NOT hand-rolled.** Use the shared `TypographyControls` component + the
`sgs_typography_css_rule( $attributes, $prefix, $selector )` helper (R-22-13). Do not write a bespoke
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

**Out of scope here:** the FR-36-26b converter recognition step (Part 2's problem — only the ROUTING is
declared), and any change to `sgs/nav-bar-menu` / `sgs/nav-drawer-menu`, which keep each block's own role.

## 5. Accessibility (governing; primary-source-grounded)

### FR-36-10 — Disclosure vs dialog
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
`aria-current="page"` — **computed CLIENT-SIDE** (compare `location.pathname` at mount), NOT server-baked,
because LiteSpeed (this stack's confirmed active cache layer) would otherwise serve a stale page's answer;
unique labels on multiple `<nav>`s + descriptive anchor text; accessible names on icon buttons (burger, ×) +
live `aria-expanded`; `:focus-visible` ≥3:1 (SC 1.4.11); SC 2.4.11 Focus Not Obscured; SC 2.5.8 24 px (SGS
keeps 44 px); skip-link visible-on-focus; `prefers-reduced-motion`; `forced-colors`/HCM (no shadow-only
boundaries — borders/focus rings must not vanish in Windows High Contrast) + `prefers-contrast`; no
colour/motion-only state.

**The colour half of this FR has a named mechanism: [Spec 41](41-NAV-MENU-COLOUR-STATE-SYSTEM.md)**
(FR-36-28). Its `aria-current="page"` clause above is the SAME client-side mechanism Spec 41 consumes —
`plugins/sgs-blocks/src/blocks/nav-bar-menu/view.js::markCurrentPage` (identical in
`plugins/sgs-blocks/src/blocks/nav-drawer-menu/view.js::markCurrentPage`), reused verbatim, never re-derived
server-side (LiteSpeed would serve one page's answer everywhere). Spec 41's contrast posture is deliberately
conservative and weakens nothing here: the live luminance check in
`plugins/sgs-blocks/src/components/GradientCapableColourControl.js` stays **warn-only** — it never blocks or
silently alters an operator's colour (Spec 41 FR-41-17) — and an opt-in "Auto-adjust for readability" nudge
is carried as Spec 41 FR-41-18, explicitly non-blocking. The automatic WCAG foreground resolution via
`sgs_wcag_preferred_text_colour_for_bg()` is Spec 41's `itemSmartContrast` toggle (FR-41-5), **default off**
so an operator's explicit colour renders exactly as authored. **This FR's "no colour/motion-only state"
clause is carried by Spec 41 FR-41-6**: two explicit, operator-reachable non-colour defaults — an underline
on Hover and a weight change on current.

### FR-36-12 — Operator a11y feedback INFORMATIONAL ONLY (P2 DP2a)
Editor/admin a11y feedback = a passive Notice, never a gate. (The *operator-facing* a11y warnings are the
"Nav Health" surface — §7 Opp 3, Phase 3.) Distinct from FR-36-9a *error* states.

## 6. Rendered output + editor controls

### FR-36-13 — No inline styling (Spec 32)
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
converter impact (CSS routes off `block_attributes` keyed on `block_slug`, never
`wraps_block`/`container_kind`). The no-inline contract is fully met.

### FR-36-14 — Control-completeness (Spec 35A Part L)
Settings/Styles/Advanced via `group`; ≤3-default `PanelBody` + `ToolsPanel` (P2 §5); `LinkControl` per
item/CTA; `StateToggleControl` (hover); the shared **`TypographyControls` + `sgs_typography_css_rule`** (R-22-13,
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

### FR-36-28 — Nav colour-state system → Spec 41

**The `sgs/nav-bar-menu` and `sgs/nav-drawer-menu` colour, state and control system (shared) is specified in
[`41-NAV-MENU-COLOUR-STATE-SYSTEM.md`](41-NAV-MENU-COLOUR-STATE-SYSTEM.md).** That spec is the concrete
mechanism satisfying FR-36-4's "distinct hover+focus states" and the colour half of FR-36-11, and it sits
under FR-36-14's control-completeness contract rather than beside it. ⛔ It does **not** satisfy FR-36-4's
"active-trail" clause — see FR-36-4 and Spec 41 FR-41-20.

**Why a separate spec.** This document's FR numbers are cited from code and cannot be renumbered, and a full
control-surface design folded in would push the single canonical nav doc past readability for a cleanly
separable concern. **Spec 36 keeps the requirement; Spec 41 owns the mechanism. Read together.**

**What Spec 41 covers** (its own FR list is authoritative — read it, do not copy it here):
- Every stateful control targets the LINK, never the `<li>`; three states (Normal / Hover / current) with
  the current-before-Hover source-order rule; the 3-state PHP emitters.
- `itemSmartContrast` — the auto-readable foreground as an opt-in toggle (default off); the non-colour
  state signal (WCAG 1.4.1: hover underline + current weight); the warn-only contrast check and the opt-in,
  non-blocking "Auto-adjust for readability".
- One 3-state per-side item border (no separate "Item Divider"); "Hover colour animation" (border panel
  only, mandatory reduced-motion companion); the hover treatment selector (`itemBgHoverTreatment`,
  including `highlight`).
- The submenu split (panel background Normal-only, LINK background 3-state); submenu open animation
  (`none` / `fade` / `slide-down`); submenu top offset; parent-stays-hovered.
- The menu button's icon/text/both mode + label and magnetic pull; the close-side companions on
  `sgs/nav-drawer`; `SgsColourPanel` row sub-headings.
- ⛔ The ARIA active-trail is NOT implemented — an explicit non-scope boundary (FR-41-20); ancestor Current styling is built in CSS.

⛔ **Out of Spec 41's scope, deliberately:** mega-menu colours and controls (owned by the mega-menu builder);
the `featured` item-flag mechanism (FR-36-4 — untouched); sticky/scrolled colour duplication (the header
owns scroll state per Spec 37); a device-visibility panel (already covered by the universal
`responsive-visibility.js` / `conditional-visibility.js` extensions, which neither `sgs/nav-bar-menu` nor
`sgs/nav-drawer-menu` opts out of — see FR-36-14: both list only `clickEffects`, `parallax`, `spacing`).

## 6a. Build order

⛔ **Live per-FR build status is NOT tracked here.** It single-sources to **`.claude/LEDGER.md`**. A status
table inside a requirements doc drifts against the code and, worse, wears a verification badge that stops the
next reader checking.

**Specs 36+37 complete first; the cloning header/footer pipeline (Spec 33 Part 2) consumes them.** FR-36-15
FEEDS Part 2 (its job is documenting the architecture) and is blocked by nothing; FR-36-25 depends on
FR-36-21/22/23, not Part 2; only the *branded* Indus header sliver of FR-36-18 waits for Part 2. See Spec 37
§6.

## 7. Phasing — MVP first, prove before the plumbing

Each phase ships something demoable + has a pre-registered exit gate (Bean's eye + §8) before the next. The
utility pieces (§4) + cross-cutting FRs are phased INTO this plan so a solo builder knows the sequence.
- **Phase 1 (MVP) — Mama's end-to-end (classic menu):** flat bar + burger (`sgs/nav-bar-menu`) →
  `sgs/nav-drawer` full-screen modal accordion (`sgs/nav-drawer-menu` inside it) + the shared utility +
  converter-emit of those + FR-36-17 crawlability; **plus the cart badge (`role="status"`, FR-36-19) + logo
  basics (FR-36-22).** NO mega CPT, NO safe-triangle (a flat bar has no submenus),
  NO mini-cart drawer. **Gate-1** (Mama's live + drawer a11y + crawl + Bean's eye) is the pre-registered
  exit.
- **Phase 2 — Indus + rich desktop + mobile modes + the pieces:** the `sgs_mega_menu` CPT + native (classic)
  attach + real-position render + mobile-in-drawer (the panel inside the drawer accordion by default, `megaDrawerMode` `link` available — FR-36-6);
  safe-triangle + hover-intent; the collapse mode (burger→drawer, built — FR-36-8); **the utility pieces — search, social, business-info, and the cart mini-cart
  (FR-36-19..23).** **Gate-2** = the full §8 incl. the Indus mega. **After Gate-2 passes, before Phase 3:**
  update **Spec 33 Part 2** with the true header/footer setup (the clone pipeline comes after the nav is
  built + tested — FR-36-15).
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
- **Mama's (gate-1):** flat 5-item classic-menu bar + a **featured** item + a **cart badge** (`sgs/cart` with
  the `role="status"` badge); mobile → burger → drawer (accordion) + CTA + logo basics.
- **Indus (gate-2):** a 7-item bar of plain links + **3 dropdowns + at least one mega ("Brands"), rendered at
  its real menu position** (not last). The framework supports **5 mega layout templates**.

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
`inert` layer, never the underlying link). PASS = every probe returns its expected node: **baseline 10/10
Mama's, 18/18 Indus**. Geometry: a partial drawer's `getBoundingClientRect().top` === header bottom ±1px at
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
§D3); 6–7 are two defects proven live on the drawer variants (§D1, §D2).

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
Every live site (the sandybrown canary and the Indus test site, `lavender-dinosaur-183533`, deploy target
`indus-test`) renders its header and footer from CPTs (`sgs_header` / `sgs_footer`) built on the current nav
blocks; both currently render generic proof headers, and the faithful branded Indus header is delivered by
the Spec 33 Part 2 header/footer cloning pipeline — a cloning concern, not a gate on anything here. Any
re-authoring of a live header is done **via the editor** (never WP-CLI `post_content`), **canary-first**,
with a before/after computed check that both menus render + collapse.

## 9. Converter-emittability (Spec 31 §13 + Spec 33 Part 2)

### FR-36-15 — Emittable by construction (DP6); the clone pipeline is built AFTER the nav, not before
Write a **classic `nav_menu`** (the primary path — `wp_update_nav_menu_item()`; add a `nav_menu_item`
targeting each `sgs_mega_menu` post — the native association, no map); write `sgs/nav-bar-menu` with
mode/style/`drawerRef` attrs for the header placement, and `sgs/nav-drawer-menu` for the drawer placement;
write one `sgs_mega_menu` CPT post per rich panel (block tree; template by draft layout) + render at real
position; write `sgs/nav-drawer`. **Per-client scoping:** emitted `sgs_mega_menu` posts + starter packs carry
a per-client title/slug prefix (no collisions). **Degradation:** an un-mappable draft nav construct is
logged skipped-with-reason (Rule 4). All native SGS blocks; no inline styles; no banned core blocks;
crawlable `<a href>`.

**The specialised header/footer clone pipeline is built AFTER this nav is built + tested — it is NOT a
Phase-1 blocker.** The universal pipeline already passes 100% on the homepage; a targeted header/footer one is
EASIER. The spec's job HERE is to **DOCUMENT the architecture clearly + hold to universal WP coding standards**
so that the later pipeline is easy. **Spec 33 Part 2 is updated with the true header/footer setup AFTER the
nav build passes its test gate, before the extras phase** (§7) — not a hidden pre-Phase-1 blocker. FR-36-15
stays HIGH-LEVEL: no converter sub-design is owed here.

**Idempotency (a light note to honour at build, NOT a blocker):** the create-then-reference emit should use a
`_sgs_clone_source_id` postmeta idempotency key (NOT bare `post_name`, which WP auto-suffixes → re-clone
duplicates), UPDATE-in-place on match (not skip), an orphan-sweep for panels removed in a later re-clone, and a
`do_blocks` recursion guard for a panel that references its own menu; batch the N mega-panel resolves (one
`get_posts` by referenced IDs) + transient-cache the rendered panel HTML keyed by panel-modified. Documented
so the later pipeline is easy. *(wp_navigation-block emit + the "pack factory" are Phase-3/build-order
deps.)*

## 10. Constraints
Spec 32 no-inline · Spec 35A Part L + the Responsive-Visibility ext · Spec 31/33 emittable · Spec 37
decoupling + published state surface · WCAG 2.1 AA (+2.2; 44 px; forced-colors survival) ·
crawlable/no-AJAX/schema-friendly (FR-36-17) · `viewScriptModule` vanilla JS + honest no-JS scope, no jQuery
· works in the header · transform-ancestor survival · perf budget (<100 KB CSS / <50 KB JS; no CLS;
links-never-lazy, distinct from below-fold `<img loading=lazy>`) · UK English · the 5 mega layouts are
git-versioned theme patterns (FR-36-5) · no block deprecations pre-production ·
**`blocks-must-shrink-to-fit-container`** — every nav piece is intrinsically responsive (min-content ≤
container at every breakpoint), not clamp-forced.

## 11. Discoverability — SEO / AI-search / schema / performance

### FR-36-17 — Crawlable, schema-friendly, fast
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
The biggest meet-and-exceed lever across the pieces: structured data entered ONCE, rendered contextually. The
**Site-Info source** (FR-36-23), the **single social list** (FR-36-21), and the **logo object** (FR-36-22) are
each edited once and rendered in header + footer + drawer + (for Site-Info) `LocalBusiness` schema — no
competitor (Kadence/Blocksy/Spectra) does this cleanly; all re-enter per placement. SGS part-has it today
(`sgs/social-icons` `source: 'site-info'`); it becomes the explicit, spec-level differentiator across all
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
| **FR-36-27 shape.** Keep it open for the `triggerStyle` / `triggerSymbol` / `triggerOpenStyle` / cross-block morph-sync shape, or close it as satisfied by Spec 41's narrower `triggerMode` / `triggerIcon` build? | Bean | Unscheduled |
| **`listColumns` reading order.** Rows-of-2 vs column-wise reading is undecided — the reference capture for that variant failed, so there is no ground truth. | Bean | Unscheduled |
| **Block-editor `sgs_mega_menu` link search (Phase 3 spike).** Does the block Nav editor surface the CPT in link search? | Framework | Phase 3 |
| **Partial-width drawer under a hide-on-scroll header.** Needs a published hidden-state signal from Spec 37 (FR-36-9). | Spec 37 owner | Before that combination is built |
| **Drawer defects proven live:** icon-list text is invisible on the two dark-`footer-bg` drawer variants (`P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER`); `drawerAlign: 'center'` does not centre the menu list (`P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU`). | Framework | Before the drawer variants are re-presented |

## 13. Sources
Research: `.claude/reports/2026-07-18-P2.5-*` (phase-1 research + QC), `.claude/reports/2026-07-19-P2.5-*`
(cart/search and logo/social/business-info pieces research). Live-code checks:
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
Kadence/Blocksy/Spectra/Bricks header builders. Internal: Spec 37, 32, 35, 31 §13, 33 Part 2, the P2 builder
design gate; seo-schema/seo-technical.
