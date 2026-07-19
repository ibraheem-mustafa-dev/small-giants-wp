---
doc_type: spec
spec_id: 36
spec_version: 1.3
status: DRAFT — v1.3 folds the gap-analysis (3 expert graders, B ~3.9, fact-checked) + Bean's decisions (classic WP menus PRIMARY / block menus → extras; bottom-tab-bar as an optional mobile mode; reuse the built Responsive-Visibility extension; labelCollapse is BUILT). Passed QC council + adversarial council + gap-analysis. Pending Bean final sign-off; Phase 6 (spec purge) + build-planning next.
owner: framework
date: 2026-07-19
companions:
  - 17-HEADER-FOOTER-ARCHITECTURE.md (the header the nav plugs INTO; nav → header dependency only; FR-S9-8 labelCollapse/per-tier visibility is BUILT)
  - .claude/plans/2026-07-18-P2-builder-ux-design-gate.md (LOCKED header/footer builder; ResponsiveTriStateControl is DESIGNED-not-built there)
  - 32 (no-inline) · 35 (Part L controls + Part G native mechanisms incl. templateLock:contentOnly + the Responsive-Visibility extension) · 31 §13 + 33 Part 2 (converter)
  - seo-schema / seo-technical skills own schema JSON-LD emission
supersedes:
  - 34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md (DELETED at Phase 6) · 17 §S9 nav FRs (fold here; Spec 17 keeps a pointer)
derived_from:
  - .claude/plans/2026-07-18-P2.5-{nav-requirements-tooling-inventory,phase3-nav-block-architecture}.md
  - .claude/reports/2026-07-18-P2.5-{phase1-*,qc-*,adv-*,adversarial-council-synthesis,grade-*}.md
---

# Spec 36 — SGS Navigation System

## 0. One-liner + plain English

A rebuilt, from-scratch set of blocks + a CPT that render a WordPress menu as a best-in-class navigation —
a desktop bar with dropdowns + rich mega-menus, and a mobile off-canvas drawer — meeting AND exceeding top
WP-theme competitors + general web/UX, fully accessible + crawlable, decoupled inside the header (Spec 17),
and a faithful cloning-pipeline emit target.

**Plain English.** The menu is a block you drop on the header. On desktop it's a bar; some items open a
small dropdown, some a rich "mega" panel. You build a mega panel in its own findable screen (drag any blocks
in) and **attach it the way you already know — add it to your menu in Appearance → Menus, like adding a
page.** On a phone the bar collapses (your choice: burger→drawer, a "More" overflow, or a bottom tab bar).
Every link is real + visible to Google + AI search. Nothing is tied to the old, messy nav blocks.

## 1. Scope, ownership, non-goals

**OWNS:** the nav blocks + the mega CPT, their rendering/behaviour + editor controls, the menu-data contract,
and the nav's accessibility, discoverability, and converter-emit contracts. The **single canonical home**
for navigation (Phase 6 consolidates all scattered nav content here — §1a lists the pointers to repoint).

**Does NOT own (Spec 17 / header-footer builder):** the header/footer container blocks + row model, header
behaviours (sticky/transparent/shrink, FR-S9-9), the CPT editing home + `Sgs_Header_Rules` binding +
starter-picker, the Site-Info store, the **cart element** (`sgs/cart` — an existing WooCommerce mini-cart
block), and header/nav **search**. The nav adapts to these. Schema JSON-LD → `seo-schema` (FR-36-17).

**Superseded/replaced (REFERENCE-ONLY):** `sgs/adaptive-nav`, old `sgs/nav-menu`, `sgs/mega-menu`,
`sgs/mobile-nav`. New `sgs/nav-menu` is a from-scratch rebuild under the same slug; old-shape posts are
re-cloned, not migrated (D270). Spec 34 DELETED in Phase 6. **Footer menus use the native WP core menu.**

**Non-goals — DEFERRED to Phase 3 (§7):** the **block-based `wp_navigation` menu system** (classic menus
are the primary/MVP path; block-menu support is a follow-on extra — Bean 2026-07-18, "not essential, not
totally clear to implement yet"); WooCommerce nav (mini-cart flyout, category mega — note `core/navigation`
hooks the WC mini-cart, a cutover concern); multilingual (WPML/Polylang — the PHP `intl` extension does
locale *formatting*, NOT translation, so real work); conditional/role-based/scheduled items; command-palette;
Opps 1–3 (§7). The header's own row model/behaviours/search (Spec 17). Building the cloning WALKER (31/33).

### 1a. Phase-6 consolidation — pointers to repoint
Spec 17 FR-S9-4/5 (fold→here) · FR-S9-8 (`sgs/mobile-nav`) · FR-S9-11 (clone slot-mapping) · FR-S9-2 (typed
palette lists `adaptive-nav`) · Spec 33 Part 2 (emit target) · P2 §5.4/§14 · `block-migration-DONE-checklist.md`.

## 2. Architecture

### FR-36-1 — Menu data = native WP menus (CLASSIC primary; block-menu support = Phase 3)
The nav renders from a **native WordPress menu the operator picks** — **primary/MVP = classic menus**
(*Appearance → Menus*, `nav_menu` terms rendered via `wp_get_nav_menu_items()`), which Bean uses and which
reliably supports the mega-attach (FR-36-5). **Block-based `wp_navigation` support is a Phase-3 extra**
(§7). `sgs/nav-menu` walks the chosen menu in render.php to emit its OWN scoped SGS markup — never a bespoke
store. **Menu picker + default:** each `sgs/nav-menu` instance picks a menu; the resolution default is a
**registered theme menu location** (classic `register_nav_menus`), else the site's first/most-recent menu —
NOT `get_nav_menu_locations()` misused on a block menu (a v1.2 error). Bar and drawer may use the **same**
menu (default) or **different** menus (a deliberate mobile choice) — neither reads the other.

### FR-36-2 — Block + CPT + plumbing roster
| Part | Type | Responsibility |
|---|---|---|
| `sgs/nav-menu` | block (dynamic) | The menu. On a header row: a horizontal **bar** with dropdown/mega triggers (desktop); **below its collapse point it renders the operator's chosen collapse mode** — burger→drawer, "More" overflow, or bottom-tab-bar (FR-36-8) — NOT an inline list. Inside a drawer: a vertical **accordion/drill-down list**. May ship pre-set flavours via `registerBlockVariation`. |
| `sgs_mega_menu` | **CPT** (block-based, container-like) | A rich mega panel = a per-client editable, block-based post (any SGS blocks + container settings), edited in its own findable admin screen. **Attached to a menu item the normal WP way** (add it to the menu in Appearance → Menus like a page — FR-36-5). Rendered at the item's real position; also inside the drawer on mobile. KIND = section/layout (keeps `SGS_Container_Wrapper`). |
| `sgs/nav-drawer` | block (dynamic) | The mobile off-canvas **container** the burger opens — InnerBlocks (default: logo/close row, menu, CTA). A full-screen **modal** `<dialog showModal>` (top-layer → survives a transformed header ancestor). Optional "Show header" toggle (FR-36-6). |
| Shared nav plumbing | `viewScriptModule` + a `@wordpress/interactivity` `store('sgs/nav')` (PUBLIC API — the established SGS pattern; NOT a block, NOT core-nav internals) | One open/close/focus/`inert`/intent-timing utility for the disclosure (dropdown + mega) + dialog (drawer) surfaces. Framework-reusable. |

### FR-36-3 — CPT model consistent with P2 (precise reuse)
`sgs_mega_menu` mirrors P2's "per-client editable structural content = a CPT" (`sgs_header`). Reuses: the CPT
editing home + native block editor; the **starter-template picker** (P2 §2.5 — the 5 mega layouts are
git-versioned starter patterns; client patterns use `templateLock:"contentOnly"`, Spec 35 Part G); the
converter **pack factory** (P2 §9 — *unbuilt, a build-order dep*). Does NOT use `Sgs_Header_Rules` /
`sgs_active_header_cpt_id`. **Why a CPT (earned Phase 3):** chosen over InnerBlocks / synced-patterns /
template-parts on findability + header-consistency + zero bespoke admin UX.

## 3. Behaviour

### FR-36-4 — Desktop disclosure (dropdown + mega)
Top-level items are real links; an item with a submenu renders a **disclosure** (`<button aria-expanded>`,
§5), NOT `role="menu"`. **Which kind:** mega iff the menu item links to a `sgs_mega_menu` post (FR-36-5);
else its submenu is a simple dropdown. Mechanics (research S1): hover-opens with a hover-intent delay
(**default 300 ms; attribute 100–500 ms**) AND click/Enter/Space; **safe-triangle** hover path when the
panel is offset + a close-grace delay (default 500 ms); WCAG 1.4.13 (Dismissible/Hoverable/Persistent);
caret on expandable items only; distinct hover+focus states; active-trail (`aria-current="page"` + a visible
style); a per-item **"featured"** flag; content-sized overlay with a max-width bound; optional backdrop blur;
height-animated; `prefers-reduced-motion`-gated. *(The cart badge = the header's `sgs/cart` block.)*

### FR-36-5 — The mega CPT + the native-menu association
- A mega panel is a **block-based CPT post** edited in its findable admin screen; the 5 layouts (photo-grid /
  split-with-aside-CTA / logo-grid / info-box / link-columns) are **DB-registry-defined starter templates**
  embodying the mega content-IA best practice (grouping, headings, one-item-per-group, vertical scan,
  "view all", descriptions — research B1/B3/B4/B8/B11).
- **Association = native (Bean's restored early decision):** the operator adds the mega CPT post to their
  menu **in Appearance → Menus** (the CPT is `show_in_nav_menus` so it appears in the "add items" panel). A
  menu item targeting a `sgs_mega_menu` post carries that post's **real WP post ID** — **no bespoke map, no
  minted ID.** *(Classic menus reliably add CPTs, so the classic path needs NO spike; the block-editor path,
  Phase 3, carries the ⚠spike "does the block Nav editor surface the CPT in link search".)*
- **Real-position render (fatal-bug fix):** renders at the menu item's real position — the old "mega renders
  LAST" bug is structurally impossible.
- **Mobile:** the same panel renders inside the drawer, following the drawer's submenu model (FR-36-6):
  inline-expanded (accordion) or a fullscreen sub-panel (drill-down).
- Panel content = SGS blocks only (no banned core blocks); scoped `<style>` (FR-36-13); links AND rich
  content crawlable server-rendered, **no lazy-load** (FR-36-17).

### FR-36-6 — The drawer (`sgs/nav-drawer`) — full-screen modal container
One InnerBlocks container (absorbs Spec 34 FR-34-3), default template `[ logo/close row, nav-menu, cta ]`
(**a11y-complete: includes the × close** — not a blank box), `templateLock:false` (client patterns may use
`contentOnly`). **Full-screen `<dialog showModal>` modal** (Bean default): top-layer → survives a transformed
header ancestor; focus contained; background `inert`; mandatory Escape; `::backdrop` scrim; rely on native
`<dialog>` semantics (no `role="dialog"`/`aria-modal`). **"Show header" toggle:** inserts the header as blocks
at the top, burger becomes the × (the header-at-top look, no non-modal complexity — the removed below-header
mode). **Menu source:** its own picker (FR-36-1); the inspector shows *which menu is bound* (bar vs drawer).
**Geometry:** `edge` (`full-screen` default | `left`/`right`/`top` partial, still modal) + `width`.
**Submenu:** accordion (default) or drill-down (Back + Close + breadcrumb); split parent-link from expander;
no-JS fallback = a `<details name>` exclusive accordion (⚠VERIFY; degrades to non-exclusive `<details>`).
**Dialog a11y (absorbs FR-S9-5):** focus INTO on open; Tab contained; Escape closes; focus returns to the
burger; body-scroll-lock (incl. iOS fix); swipe-close is enhancement-over-the-×; animation reduced-motion-gated.

### FR-36-7 — Shared nav plumbing utility (framework-reusable)
One `viewScriptModule` + `store('sgs/nav', …)` (public API — the established SGS pattern; NOT core-nav's
private store) for open/close/focus/`inert`/intent-timing across the disclosure + dialog surfaces. A UTILITY
not a component (prove by the three call-sites). **No-JS honesty:** the menu's **links + top-level items are
navigable + crawlable without JS**; the **dropdown/mega/drawer *panels* are progressive enhancement** (the
drawer degrades to `<details>`; a bar dropdown's links are still reachable on the target page). "Crawlable
without JS" ≠ "every panel opens without JS."

### FR-36-8 — Responsive collapse + THREE operator-chosen modes + per-device visibility
- **One collapsed layout.** The **collapse point N** is a visual breakpoint (operator attribute, default
  768) — distinct from the 768/1024 device-tier *style* system (Spec 35 D2). §8 sweeps a non-default N.
- **Three operator-chosen mobile modes (all user-friendly):** (a) **burger → drawer**; (b) **priority+
  "More" overflow** — items that don't fit fold into a "More ▾" disclosure (per-item priority attribute;
  the overflow is measured client-side via `ResizeObserver`; **with no JS all items simply show/wrap**);
  (c) **bottom-tab-bar** — a fixed mobile bar of 3–5 icon+label items in the thumb zone (safe-area-inset for
  notched phones), active-state highlighted. The operator picks per site.
- **Burger→drawer association:** `sgs/nav-menu` carries `drawerRef` (target drawer anchor/ID → `aria-controls`);
  unset → the single drawer; multiple → explicit pick; a dangling `drawerRef` → editor Notice + burger
  no-op-with-warning (FR-36-9a).
- **Per-device visibility:** **reuse the BUILT Responsive-Visibility extension** (device show/hide, Spec 35 /
  sgs-blocks) + `ResponsiveControl` for tiered values + the BUILT **`labelCollapse`** (Spec 17 FR-S9-8, live
  on button/business-info — collapse an item's label to icon-only per tier). The `ResponsiveTriStateControl`
  (on/off/inherit tri-state, P2 §4.1) is **DESIGNED-not-built** — an *optional upgrade*, NOT a blocker;
  never invent a parallel control (R-31-9).

### FR-36-9 — Nav → header decoupling (one-directional)
The header knows nothing about the nav; coupling is nav → header only, via the header's **real published
surface (verified in live code):** `--sgs-header-height` (a `:root`/`body` CSS var from a ResizeObserver,
`header-behaviours/view.js`) + the body classes **`is-header-scrolled` / `is-header-shrunk`** (there is NO
`data-sgs-header-state` attribute — a richer signal would be NEW Spec-17 work). A partial-width drawer binds
`top`/`max-height` to `--sgs-header-height`. **Forward dep:** "header hidden on scroll → drawer full height"
needs the unbuilt hide-on-scroll feature; the full-screen modal drawer (default) needs none of this.

### FR-36-9a — Referential integrity + orphan lifecycle
No reference silently breaks: (1) a menu item whose mega target is trashed/missing renders as a **plain
link**; (2) a dangling `drawerRef` → editor Notice + burger no-op-with-warning; (3) a trashed mega surfaces
an admin Notice listing referencing items; (4) deleting a menu item leaves no orphan (the panel post is an
independent, reusable CPT); (5) §8 includes an integrity sweep. These are **error states**, distinct from
FR-36-12's informational a11y notices.

## 5. Accessibility (governing; primary-source-grounded)

### FR-36-10 — Disclosure vs dialog
Dropdowns AND mega = **DISCLOSURE** (`<nav aria-label>` + `<button aria-expanded>`; `aria-controls` SHOULD;
OMIT `aria-haspopup`; Tab through, NO trap; Escape closes + returns focus; arrow keys optional). NEVER
`role="menu"/"menubar"`. Drawer = **DIALOG (modal)** (native `<dialog showModal>`). Mega = a bigger
disclosure sharing `sgs/nav-menu`'s contract.

### FR-36-11 — WCAG (2.1 AA + 2.2 wins)
`aria-current="page"`; unique labels on multiple `<nav>`s + descriptive anchor text; accessible names on
icon buttons (burger, ×) + live `aria-expanded`; `:focus-visible` ≥3:1 (SC 1.4.11); SC 2.4.11 Focus Not
Obscured; SC 2.5.8 24 px (SGS keeps 44 px); skip-link visible-on-focus; `prefers-reduced-motion`;
`forced-colors`/HCM (no shadow-only boundaries — borders/focus rings must not vanish in Windows High
Contrast) + `prefers-contrast`; no colour/motion-only state.

### FR-36-12 — Operator a11y feedback INFORMATIONAL ONLY (P2 DP2a)
Editor/admin a11y feedback = a passive Notice, never a gate. (The *operator-facing* a11y warnings are the
"Nav Health" surface — §7 Opp 3.) Distinct from FR-36-9a *error* states.

## 6. Rendered output + editor controls

### FR-36-13 — No inline styling (Spec 32)
Nothing renders as inline `style="…"`: native supports flip to scoped serialisation
(`__experimentalSkipSerialization` + `wp_style_engine_get_styles(...,['selector'=>"#uid"])` into the scoped
`<style>`); box-object attrs; responsive tiers + `:hover` in stylesheet rules; custom bps → `sgsCustomCss`.
`sgs/nav-menu` (bar) + `sgs/nav-drawer` keep the scoped `SGS_Container_Wrapper`.

### FR-36-14 — Control-completeness (Spec 35 Part L)
Settings/Styles/Advanced via `group`; ≤3-default `PanelBody` + `ToolsPanel` (P2 §5); `LinkControl` per
item/CTA; `StateToggleControl` (hover); the shared **`TypographyControls` + `sgs_typography_css_rule`** (R-22-13,
never bespoke font controls); `ResponsiveControl` (tiers) + the **BUILT Responsive-Visibility extension** +
BUILT `labelCollapse` (per-device show/hide + label-collapse — FR-36-8); `DesignTokenPicker` (enableAlpha +
clearable); box-object attrs; `hideExtensions`; `MediaGalleryPicker`/icon + `supports.sgs.imageControls:true`
on any `<img>` block; reduced-motion gate; **editor preview via `<ServerSideRender>`** (else a drifting
static snapshot — the `ssr-fixes-hand-built-preview-drift` lesson; interactive behaviour previews front-end);
keyboard + contrast + `aria-describedby`; **`templateLock:"contentOnly"` on client patterns**. Custom/preset
UI welcome where it improves UX (P2 §2.6).

## 7. Phasing — MVP first, prove before the plumbing

Each phase ships something demoable + has a pre-registered exit gate (Bean's eye + §8) before the next.
- **Phase 1 (MVP) — Mama's end-to-end (classic menu):** `sgs/nav-menu` flat bar + burger → `sgs/nav-drawer`
  full-screen modal accordion + the shared utility + converter-emit of those two + FR-36-17 crawlability. NO
  mega CPT, NO safe-triangle (flat bar has no submenus), NO priority+/bottom-tab. **Gate-1** (Mama's live +
  drawer a11y + crawl + Bean's eye) is the pre-registered exit.
- **Phase 2 — Indus + rich desktop + mobile modes:** the `sgs_mega_menu` CPT + native (classic) attach +
  real-position render + mobile-in-drawer; safe-triangle + hover-intent; the three collapse modes (burger,
  priority+, **bottom-tab-bar**); the "show header" toggle. **Gate-2** = the full §8 incl. the Indus mega at
  position 4.
- **Phase 3 (follow-on extras) — competitive breadth + the moves:** **block-based `wp_navigation` menu
  support** (+ its ⚠spike); WooCommerce nav (mini-cart flyout, category mega); multilingual (+ hreflang);
  conditional/role-based/scheduled items; command-palette; `<details>`-animation polish; partial-width
  drawer; the `ResponsiveTriStateControl` upgrade; **Opp 1 — "AI builds your whole nav from a sitemap"**
  (the emit path already writes every primitive — a genuine showpiece); **Opp 2 — portability/clone moat**
  (native-menu attach survives WP export/import, unlike competitors' bespoke bindings — low priority);
  **Opp 3 — in-editor "Nav Health" panel** (surfaces the §8 checks + the operator a11y warnings live, turning
  the invisible moat into demo proof + housing the informational a11y notices).

## 8. Acceptance — the concrete live-QC gate (absorbs Spec 34 FR-34-7)

### FR-36-16 — Reproduce both menus + the regression gate + Bean's eye (R-31-13)
- **Mama's (gate-1):** flat 5-item classic-menu bar + a **featured** item + a **cart badge** (`sgs/cart`);
  mobile → burger → drawer (accordion) + CTA.
- **Indus (gate-2):** a 7-item bar of plain links + **3 dropdowns + 1 mega ("Brands") at position 4**
  (rendered at position 4). The framework supports **5 mega layout templates**; **the exact live Indus mega
  count + layouts is VERIFIED against the Indus mockup at build and RECORDED here before gate-2 passes** (the
  sources don't resolve 1-vs-5 — arbitration is a named step). Two-row header = the header builder's rows.
- **The live gate (one pass, cache-clear FIRST):** 375/768/1440 + **a non-default collapse-N** sweep; **axe = 0
  on the OPEN drawer AND an OPEN desktop mega**; **`elementFromPoint` ≥ the Spec-34 baselines** (10/10 Mama's,
  18/18 Indus); ESC/focus-return/Tab-containment; scroll-lock frame sweep; drawer geometry; late-CSS A/B; real
  desktop scrollbar; **a `prefers-reduced-motion` + `forced-colors` emulated-media sweep** (borders/focus rings
  survive; motion suppressed); **the `<details>` no-JS drawer + no-JS bar links** assertion; **the crawl
  assertion** (every bar+dropdown+mega link AND mega content in the pre-JS HTML); **mega renders at real
  position N, not last**; **the integrity sweep** (FR-36-9a); **`wp-perf-gate`** (no-CLS + budget); RTL/logical
  properties; + Bean's cropped screenshot pair.

### FR-36-18 — Cutover for the LIVE production instances (mirror P2 §6c)
`sgs/adaptive-nav` is live on Mama's (sandybrown) + Indus (palestine-lives). Before deleting the old blocks:
re-author both live headers onto the new blocks **via the editor** (never WP-CLI `post_content` — D270),
**canary-first**, before/after computed check both menus render + collapse; **measure zero live stored
instances** of the retired blocks' attrs before removing the registrations.

## 9. Converter-emittability (Spec 31 §13 + Spec 33 Part 2)

### FR-36-15 — Emittable by construction (DP6), proven by schema conformance before build
Write a **classic `nav_menu`** (the primary path — `wp_update_nav_menu_item()`; add a `nav_menu_item`
targeting each `sgs_mega_menu` post — the native association, no map); write `sgs/nav-menu` with
mode/style/`drawerRef` attrs; write one `sgs_mega_menu` CPT post per rich panel (block tree; template by draft
layout) + render at real position; write `sgs/nav-drawer`. **Per-client scoping:** emitted `sgs_mega_menu`
posts + starter packs carry a per-client title/slug prefix (no collisions). **Degradation:** an un-mappable
draft nav construct is logged skipped-with-reason (Rule 4). All native SGS blocks; no inline styles; no banned
core blocks; crawlable `<a href>`. **Spec 33 Part 2's emit target repoints** to `sgs/nav-menu` + `sgs_mega_menu`
+ `sgs/nav-drawer`. *(wp_navigation-block emit + the "pack factory" are Phase-3/build-order deps.)*

## 10. Constraints
Spec 32 no-inline · Spec 35 Part L + Part G (templateLock:contentOnly, Responsive-Visibility ext) · Spec 31/33
emittable · Spec 17 decoupling + published state surface · WCAG 2.1 AA (+2.2; 44 px; forced-colors survival)
· crawlable/no-AJAX/schema-friendly (FR-36-17) · `viewScriptModule` vanilla JS + honest no-JS scope, no jQuery
· works in the header · transform-ancestor survival · perf budget (<100 KB CSS / <50 KB JS; no CLS;
links-never-lazy split from below-fold `<img loading=lazy>`) · UK English · DB-first (5 mega layouts
registry-defined) · D270 no-deprecations.

## 11. Discoverability — SEO / AI-search / schema / performance

### FR-36-17 — Crawlable, schema-friendly, fast
- **Crawlable, server-rendered, NO AJAX (D334):** every bar/dropdown/mega link AND all mega-panel **content**
  (headings/text, not just links) is in the initial server HTML — no lazy-load — so crawlers + AI search see
  the whole structure + the rich content. **Scope the moat honestly:** plain crawlable links are table-stakes;
  the differentiator is server-rendered *rich mega content* (no AJAX) + AI-auto-generation of the whole nav.
- **Semantic + descriptive:** `<nav>` landmarks + unique labels; real `<ul>/<li>/<a>`; descriptive anchor text.
- **Schema:** ships schema-friendly markup for `SiteNavigationElement` (+ `BreadcrumbList`); JSON-LD emission
  owned by `seo-schema` (no schema in blocks); must not block it.
- **hreflang forward-note:** when multilingual lands (Phase 3), emit per-language `hreflang` on the switcher
  (cheap to plan now, expensive to retrofit).
- **Parity, no cloaking:** bar/drawer may use different menus but every link in either is crawlable.
- **Performance / no-CLS:** no layout shift; within budget; not render-blocking; `wp-perf-gate` in §8.

## 12. Open sub-decisions — RESOLVED (Bean's veto at sign-off)
| # | Question | Resolution |
|---|---|---|
| a | Burger home | On `sgs/nav-menu` (collapsed), opens the drawer via `drawerRef` |
| b | Drawer content / menu | Full modal container; own menu picker; default template incl. logo+close |
| c | Collapse modes | Three operator-chosen: burger→drawer, priority+, **bottom-tab-bar**; safe-triangle ships |
| d | Mega association | **Native menu (Appearance → Menus)** — add the CPT like a page; item carries the post ID (no map/ID) |
| e | Drawer modality | **Modal-only** (`<dialog showModal>`) + "Show header" toggle |
| f | Menu system | **Classic menus PRIMARY**; block `wp_navigation` → Phase 3 extra (Bean) |
| g | Per-device visibility | Reuse the BUILT Responsive-Visibility ext + `labelCollapse`; tri-state = optional upgrade |
| h | Extra competitive features + Opps 1–3 | Phase 3 (follow-on) |

## 13. Sources
Phase-1 research + QC council + adversarial council + gap-analysis (3 graders, B ~3.9)
(`.claude/reports/2026-07-18-P2.5-*`). Live-code checks: `class-sgs-nav-menu-source.php`, `adaptive-nav/render.php`,
`header-behaviours/view.js`, `labelCollapse` (button/business-info — BUILT), `ResponsiveTriStateControl`
(docs-only — unbuilt), sgs-blocks CLAUDE.md (`sgs/cart`, D270, TypographyControls R-22-13, Responsive-Visibility
ext). Primary a11y: W3C APG, WCAG 2.1/2.2, MDN, Adrian Roselli. UX: NN/g, Baymard, Smashing, IxDF, LogRocket.
Platform: MDN/Chrome (Popover, `<dialog>`, `<details name>` — ⚠ re-verify at build). Internal: Spec 17, 32, 35,
31 §13, 33 Part 2, P2 builder design-gate; D334; seo-schema/seo-technical.
</content>
