---
doc_type: spec
spec_id: 36
spec_version: 2.1
status: SIGNED-OFF (v2.1, Bean sign-off 2026-07-19 — the SINGLE canonical nav home; Phase 6 spec-purge + build-planning now unblocked). Council-driven integration 2026-07-19 — 7-persona adversarial council + fact-check: the former appended "PART TWO / §14–17" is now INTEGRATED into the body (utility pieces → §4 as FR-36-19..23; per-device → beside FR-36-8 as FR-36-24; structured-data-once → §11 as FR-36-25; the §16 fold-in sharpenings merged into the FRs they amend; the §17 build-checklist folded into §8). Applied: phasing of the pieces, honest build-vs-extend labels, the §1↔pieces ownership fix, the FR-36-24 ownership split + lint gate, and the fact-check fixes. Owner rulings applied: FR-36-15 stays HIGH-LEVEL (no converter sub-design, not a Phase-1 blocker); over-engineered failure states removed (kept only mega-`object_id` resolution + the non-deletable drawer close); Nav Health stays Phase 3. Lineage: v2.0 added the utility pieces; v1.3 folded the gap-analysis (3 graders, B ~3.9) + Bean's decisions (classic WP menus PRIMARY / block menus → extras; bottom-tab-bar optional mobile mode; reuse the BUILT Responsive-Visibility extension; labelCollapse is BUILT). Passed QC council + adversarial council + gap-analysis. Bean signed off 2026-07-19; Phase 6 (spec purge) + build-planning next.)
owner: framework
date: 2026-07-19
companions:
  - 37-HEADER-FOOTER-BUILDER.md (the header the nav plugs INTO; nav → header dependency only; FR-S9-8 (Spec 37 §3.8) labelCollapse/per-tier visibility is BUILT; formerly 17-HEADER-FOOTER-ARCHITECTURE.md)
  - .claude/plans/archive/2026-07-18-P2-builder-ux-design-gate.md (LOCKED header/footer builder; ResponsiveTriStateControl is DESIGNED-not-built there)
  - 32 (no-inline) · 35 (Part L controls + Part G native mechanisms incl. templateLock:contentOnly + the Responsive-Visibility extension) · 31 §13 + 33 Part 2 (converter — built AFTER the nav passes its test gate; see FR-36-15)
  - seo-schema / seo-technical skills own schema JSON-LD emission
supersedes:
  - 34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md (DELETED at Phase 6 — its elementFromPoint baseline methodology is carried verbatim into §8, D101) · 17 §S9 nav FRs (fold here; Spec 17 has since been DELETED — see Spec 37 for the header-side FRs it also owned)
derived_from:
  - .claude/plans/2026-07-18-P2.5-{nav-requirements-tooling-inventory,phase3-nav-block-architecture}.md
  - .claude/reports/2026-07-18-P2.5-{phase1-*,qc-*,adv-*,adversarial-council-synthesis,grade-*}.md
  - .claude/reports/2026-07-19-P2.5-spec36-v2-adversarial-council.md (the fix list this v2.1 integrates)
---

# Spec 36 — SGS Navigation System

## 0. One-liner + plain English

A rebuilt, from-scratch set of blocks + a CPT that render a WordPress menu as a best-in-class navigation —
a desktop bar with dropdowns + rich mega-menus, and a mobile off-canvas drawer — meeting AND exceeding top
WP-theme competitors + general web/UX, fully accessible + crawlable, decoupled inside the header (Spec 37),
and a faithful cloning-pipeline emit target. Spec 36 is the SINGLE canonical home for the whole header/nav
element set: the nav blocks AND the utility pieces the nav composes with (cart / search / social / logo /
business-info — §4).

**Plain English.** The menu is a block you drop on the header. On desktop it's a bar; some items open a
small dropdown, some a rich "mega" panel. You build a mega panel in its own findable screen (drag any blocks
in) and **attach it the way you already know — add it to your menu in Appearance → Menus, like adding a
page.** On a phone the bar collapses (your choice: burger→drawer, a "More" overflow, or a bottom tab bar).
Every link is real + visible to Google + AI search. Nothing is tied to the old, messy nav blocks.

**The real differentiator (a Phase-3 build): AI builds your whole navigation from a sitemap.** The emit path
already writes every nav primitive, so generating a complete best-practice menu + mega panels from a site's
page structure is the one capability competitors' bespoke bindings can't copy — foregrounded here, built in
Phase 3 (§7 Opp 1).

## 1. Scope, ownership, non-goals

**OWNS:** the nav blocks + the mega CPT, their rendering/behaviour + editor controls, the menu-data contract,
and the nav's accessibility, discoverability, and converter-emit contracts. **Also the header/nav
PRESENTATION of the utility pieces it composes with** — cart, search, social, logo, business-info
(FR-36-19..23): their nav/header rendering, behaviour + editor controls. (The underlying WooCommerce cart /
Store-API logic remains WooCommerce's.) The **single canonical home** for navigation
(Phase 6 consolidates all scattered nav content here — §1a lists the pointers to repoint).

**This spec owns the Site-Info data store** (moved from the deleted Spec 17, 2026-07-21).
**Now owned here:** the `sgs_site_info` option store, the `sgs/site-info` block-bindings source (including
its context-gated empty-value hints — operators see a hint, public visitors see an empty string), and the
Site Info admin page with its server-side validation and reserved-key denylist (ex-Spec 17 FR-S4-1/2/3).
**Bean's reasoning (2026-07-21):** the data is site-wide — an address belongs on a contact page as much as
in a footer — it is delivered as a block, and all five blocks that consume it (FR-36-19…23) already live
here. Splitting a store from its only consumers serves nobody.
**⚠ Open defect inherited with it:** Site Info does **not** feed `sgs/responsive-logo` —
`responsive-logo/render.php:66` reads `get_theme_mod('custom_logo')`, WP's native Customiser setting. So
the logo resolves from a different source than contact/social. FR-36-22 should resolve this deliberately
rather than inherit it silently.

**Does NOT own (→ Spec 37, header/footer builder):** the header/footer container blocks + row model, header
behaviours (sticky/transparent/shrink/hide-on-scroll), and the CPT editing home + `Sgs_Header_Rules`
binding + starter-picker. The nav adapts to these. Schema JSON-LD → `seo-schema` (FR-36-17).

**Superseded/replaced (REFERENCE-ONLY):** `sgs/adaptive-nav`, old `sgs/nav-menu`, `sgs/mega-menu`,
`sgs/mobile-nav`. New `sgs/nav-menu` is a from-scratch rebuild under the same slug; old-shape posts are
re-cloned, not migrated (D270). Spec 34 DELETED in Phase 6.

**Footer menus cannot use the native WP core menu** — `core/navigation` is on the banned-core-block
list (`sgs/nav-menu` declares it in `block-replacements.json`, restored 2026-07-23 after a gap
opened when `sgs/adaptive-nav` was deleted at D362). **Footer menus are served by FR-36-26.**

**Non-goals — DEFERRED to Phase 3 (§7):** the **block-based `wp_navigation` menu system** (classic menus
are the primary/MVP path; block-menu support is a follow-on extra — Bean 2026-07-18, "not essential, not
totally clear to implement yet"); WooCommerce category/nav integration (category mega — note `core/navigation`
hooks the WC mini-cart, a cutover concern; the cart PIECE itself is FR-36-19, phased); multilingual
(WPML/Polylang — the PHP `intl` extension does locale *formatting*, NOT translation, so real work);
conditional/role-based/scheduled items; command-palette; Opps 1–3 (§7). The header's own row
model/behaviours (Spec 37). Building the cloning WALKER (31/33).

### 1a. Phase-6 consolidation — pointers to repoint
Spec 17 FR-S9-4/5 (fold→here, Spec 36) · FR-S9-8 → Spec 37 §3.8 (`sgs/mobile-nav`) · FR-S9-11 → Spec 37 FR-37-1 + FR-37-22 (clone slot-mapping) · FR-S9-2 → Spec 37 FR-37-9 (typed
palette lists `adaptive-nav`) · Spec 33 Part 2 (emit target) · P2 §5.4/§14 · `block-migration-DONE-checklist.md`.

## 2. Architecture

### FR-36-1 — Menu data = native WP menus (CLASSIC primary; block-menu support = Phase 3)
The nav renders from a **native WordPress menu the operator picks** — **primary/MVP = classic menus**
(*Appearance → Menus*, `nav_menu` terms rendered via `wp_get_nav_menu_items()`), which Bean uses and which
reliably supports the mega-attach (FR-36-5). **Block-based `wp_navigation` support is a Phase-3 extra**
(§7). `sgs/nav-menu` walks the chosen menu in render.php to emit its OWN scoped SGS markup — never a bespoke
store. **Menu picker + default:** each `sgs/nav-menu` instance picks a menu; the resolution default is a
**registered theme menu location** (classic `register_nav_menus`), else the site's first/most-recent menu —
NOT `get_nav_menu_locations()` misused on a block menu (a v1.2 error). **Bar↔drawer menu source:** the
drawer's `sgs/nav-menu` instance DEFAULTS to inherit-from-bar (`menu:"inherit-from-bar"` → both render the
same menu, no drift, faithful clone); a **different mobile menu is the explicit per-device override**
(`menu:<id>`). Neither instance reads the other's state (see FR-36-24 for the ownership of this override).

### FR-36-2 — Block + CPT + plumbing roster
| Part | Type | Responsibility |
|---|---|---|
| `sgs/nav-menu` | block (dynamic) | The menu. On a header row: a horizontal **bar** with dropdown/mega triggers (desktop); **below its collapse point it renders the operator's chosen collapse mode** — burger→drawer, "More" overflow, or bottom-tab-bar (FR-36-8) — NOT an inline list. Inside a drawer: a vertical **accordion/drill-down list**. May ship pre-set flavours via `registerBlockVariation`. |
| `sgs_mega_menu` | **CPT** (block-based, container-like) | A rich mega panel = a per-client editable, block-based post (any SGS blocks + container settings), edited in its own findable admin screen. **Attached to a menu item the normal WP way** (add it to the menu in Appearance → Menus like a page — FR-36-5). Rendered at the item's real position; also inside the drawer on mobile. KIND = section/layout (keeps `SGS_Container_Wrapper`). |
| `sgs/nav-drawer` | block (dynamic) | The mobile off-canvas **container** the burger opens — InnerBlocks (default: logo/close row, menu, CTA). A full-screen **modal** `<dialog showModal>` (top-layer → survives a transformed header ancestor). Optional "Show header" toggle (FR-36-6). |
| Shared nav plumbing | `viewScriptModule` + a `@wordpress/interactivity` `store('sgs/nav')` (PUBLIC API — the established SGS pattern; NOT a block, NOT core-nav internals) | One open/close/focus/`inert`/intent-timing utility for the disclosure (dropdown + mega) + dialog (drawer) surfaces. Framework-reusable. |
| `sgs/cart` (extend) | block (dynamic) | Header cart — count badge (Phase-1 fix) + mini-cart preview/flyout/drawer (Phase-2 build). FR-36-19. |
| `sgs/product-search` / `filter-search` (extend) | block (dynamic) | Predictive search combobox — the ARIA combobox is ALREADY shipped (a genuine extend). FR-36-20. Phase 2. |
| the SGS social block (extend) | block | Site-wide social icon list, one source rendered in header + footer + drawer. FR-36-21. Phase 2. |
| `sgs/responsive-logo` (extend) | block | The logo OBJECT (per-device image, link-home, sticky/transparent/dark variant, favicon-sync). FR-36-22. Basics Phase 1; lockup + favicon + variants Phase 3. |
| `sgs/business-info` (extend) | block | The Site-Info source of truth (name/phone/email/address/hours → header + footer + contact + schema). FR-36-23. Phase 2. |

### FR-36-3 — CPT model consistent with P2 (precise reuse)
`sgs_mega_menu` mirrors P2's "per-client editable structural content = a CPT" (`sgs_header`). Reuses: the CPT
editing home + native block editor; the **starter-template picker** (P2 §2.5 — the 5 mega layouts are
git-versioned starter patterns; client patterns use `templateLock:"contentOnly"`, Spec 35 Part G — **flagged:
a FIRST APPLICATION in SGS (0 hits in `src/` today; not a proven reuse — same honesty flag as
`ResponsiveTriStateControl`)**); the converter **pack factory** (P2 §9 — *unbuilt, a build-order dep*). Does
NOT use `Sgs_Header_Rules` / `sgs_active_header_cpt_id`. **Why a CPT (earned Phase 3):** chosen over
InnerBlocks / synced-patterns / template-parts on findability + header-consistency + zero bespoke admin UX.

## 3. Behaviour

### FR-36-4 — Desktop disclosure (dropdown + mega)
Top-level items are real links; an item with a submenu renders a **disclosure** (`<button aria-expanded>`,
§5), NOT `role="menu"`. **Which kind:** mega iff the menu item links to a `sgs_mega_menu` post (FR-36-5);
else its submenu is a simple dropdown. **Interaction precision:** dropdowns/mega open on **hover on
non-touch (default) / tap on touch / keyboard throughout** (avoids the sticky-hover mobile bug). Mechanics
(research S1): hover-opens with a hover-intent delay (**default 300 ms; attribute 100–500 ms**) AND
click/Enter/Space; **safe-triangle** hover path when the panel is offset + a close-grace delay (default
500 ms); the safe-triangle + these timing constants apply to the hover path only; WCAG 1.4.13
(Dismissible/Hoverable/Persistent) on the hover panel; caret on expandable items only; distinct hover+focus
states; active-trail (`aria-current="page"` + a visible style); a per-item **"featured"** flag; content-sized
overlay with a max-width bound; optional backdrop blur; height-animated; `prefers-reduced-motion`-gated.

**The featured flag renders in two forms (D351, 2026-07-20).** `featuredColour` alone gives the LABEL form
(a coloured label). Setting `featuredBg` gives the PILL form (a filled pill on the base link's radius) —
which is how a draft typically authors a featured nav item, and the form the Mama's draft uses
(`.sgs-header__nav-featured` = `background:var(--primary)` + `color:var(--text)` + weight 600). `featuredBg`
defaults to `''` so the label form stays the default and no existing site changes shape. **The pill's
foreground is contrast-checked against the resolved fill** by the shared
`sgs_wcag_preferred_text_colour_for_bg()` helper — the operator's colour wins when it clears AA, else the
guaranteed-safe binary fallback — so no client palette can render a featured item below AA. Both forms are
operator-set from the block inspector (Featured panel). **Why this is a spec-level note, not an
implementation detail:** the block originally had NO background attribute, so the converter had nowhere to
put a draft's featured fill and silently dropped it, producing accent-on-surface text at 1.35:1 on Mama's.
A featured style a draft can author MUST have somewhere in the data model to land — see D351.

### FR-36-5 — The mega CPT + the native-menu association
**Competitive positioning (carried from Spec 02 §23):** the mega system **replaces Max Mega Menu, JetMenu (Crocoblock), and Kadence Pro mega menu** — a block-native, ARIA-compliant mega menu with semantic HTML and **zero external dependencies**. Elementor's mega menu needs Elementor Pro ($59–399/yr) and generates heavy DOM; Max Mega Menu (the most popular free alternative) has documented WCAG failures + mobile-toggle issues. (The old Spec 02 §23 `sgs/mega-menu` block that carried this line used `role="menu"` + template-part panels — both BANNED here, FR-36-10/-5 — so the block is superseded; only its positioning survives.)
- A mega panel is a **block-based CPT post** edited in its findable admin screen; the 5 layouts (photo-grid /
  split-with-aside-CTA / logo-grid / info-box / link-columns) are **DB-registry-defined starter templates**
  embodying the mega content-IA best practice (grouping, headings, one-item-per-group, vertical scan,
  "view all", descriptions — research B1/B3/B4/B8/B11).
- **Group headings (sharpened, informational-only):** every mega panel gets group headings; the
  heading/grouping/one-item-per-group best practice is EMBODIED in the 5 starter layouts but is NOT an enforced
  content contract — a heading-less multi-column panel raises an editor INFORMATIONAL notice (never a gate —
  FR-36-12; NN/g's #1 mega anti-pattern).
- **Association = native (Bean's restored early decision):** the operator adds the mega CPT post to their
  menu **in Appearance → Menus** (the CPT is `show_in_nav_menus` so it appears in the "add items" panel). A
  menu item targeting a `sgs_mega_menu` post carries that post's **real WP post ID** — **no bespoke map, no
  minted ID.** *(Classic menus reliably add CPTs; the classic path is proven at build by a spike — see §8
  build notes. The block-editor path, Phase 3, carries the ⚠spike "does the block Nav editor surface the CPT
  in link search".)*
- **Click-target resolution (a real build detail):** the mega is resolved by the menu item's **`object_id`
  via `get_post()`**, NEVER `$item->url`; `sgs_mega_menu` posts are **force-published on save** so a menu item
  never targets a draft/auto-draft. The top-level trigger link (e.g. "Brands") resolves to the mega post's own
  permalink (or `#` when the panel is purely a container — operator choice).
- **Inline authoring affordance (the non-coder gap):** selecting a mega-linked menu item inside the
  `sgs/nav-menu` editor edits its referenced `sgs_mega_menu` panel IN PLACE via `<ServerSideRender>`; "create
  new panel" spawns the CPT record transparently and back-references it. The CPT stays the storage layer the
  client **never sees directly** (resolves the "findable admin screen" 3-screen friction). `templateLock:
  "contentOnly"` on the panel.
- **Whole-card link:** a mega panel's featured cards may use a whole-card clickable-link overlay (the Spec 35
  Part I gap) — budget it in the layout spec.
- **Real-position render (fatal-bug fix):** renders at the menu item's real position — the old "mega renders
  LAST" bug is structurally impossible.
- **Mobile:** the same panel renders inside the drawer, following the drawer's submenu model (FR-36-6):
  inline-expanded (accordion) or a fullscreen sub-panel (drill-down).
- Panel content = SGS blocks only (no banned core blocks); scoped `<style>` (FR-36-13); links AND rich
  content crawlable server-rendered, **no lazy-load** (FR-36-17).

### FR-36-6 — The drawer (`sgs/nav-drawer`) — full-screen modal container
One InnerBlocks container for the drawer's editable CONTENT (absorbs Spec 34 FR-34-3), default template
`[ nav-menu, (optional) logo, (optional) cta ]`, `templateLock:false` (client patterns may use `contentOnly`).
**The × close is NOT an InnerBlock** — it is fixed dialog CHROME the block always renders (render.php, outside
the editable InnerBlocks), exactly like the burger toggle, so it is undeletable by construction (see below). **Full-screen `<dialog showModal>` modal** (Bean default): top-layer → survives a transformed
header ancestor; focus contained; background `inert`; mandatory Escape; `::backdrop` scrim; rely on native
`<dialog>` semantics (no `role="dialog"`/`aria-modal`). **Close is CHROME, not content — undeletable by
construction (Bean 2026-07-19, resolving the mechanism the earlier "deletable × + hard-guarantee" wording left
open):** the × is rendered by render.php as fixed dialog chrome OUTSIDE the editable InnerBlocks, so an operator
editing the drawer's content can NEVER delete the last close affordance. This matters because on a full-screen
modal on TOUCH there is no ESC key and no tap-outside-the-panel (the panel fills the screen), so the × is the
only reliable close — it must always render. (The burger↔× in the header is the same close at runtime; both
persist by construction, not by a per-block lock.) **"Show header"
toggle:** PER-ROW (a checkbox per header row, not a single all-or-nothing toggle — finer, closer to FR-S9-8's (Spec 37 §3.8)
per-element intent); inserts the chosen header rows as blocks at the top, burger becomes the × (the
header-at-top look, no non-modal complexity). **Menu source:** its own picker (FR-36-1; defaults to
inherit-from-bar); the inspector shows *which menu is bound* (bar vs drawer). **Geometry:** `edge`
(`full-screen` default | `left`/`right`/`top` partial, still modal) + `width`. **Submenu — BUILT** (this
session, superseding the "wired but Phase-1-inert" note that stood here previously): `sgs/nav-drawer`
publishes its `submenuModel` attribute to descendants via block.json `providesContext`
(`sgs/navDrawerSubmenuModel`), which `sgs/nav-menu` declares via `usesContext` and reads in render.php to
select a SECOND renderer (`SGS_Nav_Menu_Bar_Renderer::render_items_drawer()`) distinct from the flat bar's
`render_items()` — the header/footer bar's existing dropdown/mega markup is completely untouched. Both
`accordion` and `drill-down` share IDENTICAL server markup: a real nested `<details name="sgs-nav-menu-
accordion-{uid}">` **exclusive accordion** per item with children (✅VERIFIED — Chrome/Edge/Firefox/Safari 17+
all honour `<details name>` exclusivity; degrades to independent, still-functional `<details>` on older
engines, never to a broken menu), split parent-link from expander (a real `<a>` beside the `<summary>` toggle
when the parent has its own URL; a plain label when it does not). `drill-down` layers a JS-only progressive
enhancement (`src/shared/effects/nav-drilldown.js`, wired from `nav-menu/view.js`'s existing
`initBarEffects()`) that intercepts the `<summary>` click, slides the tapped submenu in as a full-size
sub-panel over the top-level list (CSS `transform`, `nav-menu/style.css`), injects a Back button (its label
read from a `data-sgs-nav-back-label` attribute render.php already translated server-side — the JS module
carries no hardcoded English), and returns focus to the `<summary>` on Back. With NO JS, `drill-down`'s
fallback IS the accordion, exactly as this line originally specified — now proven, not just declared.
**Residual gap, declared not silently dropped:** a mega-menu item inside the drawer degrades to a plain link
(its own URL, else `#`) rather than rendering the mega CPT panel inline — FR-36-5's "the same panel renders
inside the drawer" mega-in-drawer capability is NOT built by this session; the desktop hover-disclosure
markup the bar uses for a mega trigger has no touch equivalent and would need its own JS-driven build.
**Dialog a11y (absorbs FR-S9-5):** focus INTO on open; Tab contained; Escape closes; focus returns to the
burger; body-scroll-lock (incl. iOS fix); swipe-close is enhancement-over-the-×; animation reduced-motion-
gated. **This session's drill-down focus management is layered on top, not a replacement:** opening a
sub-panel moves focus to its Back button; closing it (via Back) returns focus to the `<summary>` that opened
it; the top-level list is marked `inert` while a panel is open (Tab cannot land on an invisible link) — a
small, additive fix in the shared `store.js`'s `getFocusable()` (`![inert]` exclusion) makes the drawer's
EXISTING Tab-trap correctly skip anything `inert` covers, which the drill-down's own `inert` use depends on.
Escape/× still close the WHOLE drawer via the pre-existing `store('sgs/nav')` dialog-level behaviour —
untouched by this build, deliberately: no Escape handling was added inside the drill-down module. **PORT (do
not re-derive): D323** — the drawer's body-reparent so it escapes a transformed/filtered ancestor — and
**D340** — scrollbar-bounce compensation — are EXISTING fixes carried forward verbatim.

**⭐ DESKTOP VARIANTS — BUILT + council-fixed + canary-deployed 2026-07-28 session 2 (D403 design
gate approved by Bean, D404 ship record; commits `faa14924`/`cab1b916`/`69dfbaf9`). The canonical
shape is `.claude/plans/archive/2026-07-28-nav-drawer-variants-design-gate.md` — read THAT, not the
research summary below.** What shipped: per-device `anchor` object (`full-screen` default /
`header` derives width+edges from the header / `trigger` / `centred` — Bean's pause-menu addition,
no reference among the 8) + `panelSize` (responsive) + surface opacity/blur (NO scrim element —
8/8 references have none) + `closeStyle` (`separate-x`/`text-swap`/`burger-morph`) +
`variantPreset` discriminator (`supports.sgs.variantAttr`, `isActive`) + nav-menu `listColumns`
(in-drawer only) + **7 `registerBlockVariation`s** (complete-clone presets; resn = WebGL,
reference-only) + **backdrop-click-to-close in `store('sgs/nav')`** (a `::backdrop` click closes a
partial-width panel; full-screen unaffected by construction). `edge`+`width` RETIRED (zero stored
instances); `animateFrom` reduced to `auto|fade` with per-anchor motion defaults.
- **Bean's two binding design corrections (do not regress):** (1) **the variant axis is the LOOK**
  — a complete-clone preset of internal make-up (type scale 16–160px across references, columns,
  alignment, secondary-block roster) that sets DEFAULTS and hardcodes NOTHING; anchoring/geometry
  are plain per-device ATTRIBUTES, so the earlier "attaches-to" 4-variant taxonomy below is
  SUPERSEDED as a variant axis (it survives as the `anchor` attribute's values). (2) No
  "full-screen below collapse point" toggle — incoherent under Burger Menu=Always; per-device
  `anchor` covers the lusion case (`trigger` desktop + `full-screen` tablet) generically.
- **The 2026-07-28 open question is ANSWERED (Task-1 append + 15-cell code extraction,
  `.claude/reports/2026-07-28-drawer-code-extraction/`):** a FLAT variant value holds — 6 of 7
  confirmed sites keep one character at every width; lamalama's card is fluid-capped BY DERIVING
  the header's width (verified at 400px: 368×436 = `min(438px, 100vw−32px)`); only lusion swaps
  compact→takeover below desktop, handled by the per-device `anchor`. **`side-panel` is DROPPED**
  — zero reference evidence at any width (the half-built `edge:left/right` CSS retired with the
  attr).
- **POC content rule (Bean, design doc §6):** POC fixtures are EXACT clones INCLUDING content
  (per-fixture classic menus with the references' real labels + copy) so differences attribute to
  the block; genericise = named pre-production step (`P-DRAWER-VARIANT-CONTENT-GENERICISE`).
- **DB registration (FR-31-20):** seeded via `/sgs-update` stage 1 — `blocks.variant_attr =
  'variantPreset'`. ⚠ Honest limitation: `variant_slots` set-difference fingerprinting yields
  only 1 discriminating row across the 7, because these variants differ by attribute VALUES +
  child rosters, not attribute presence. Authored content carries `variantPreset` directly;
  DRAFT-side variant detection needs value/roster matching and belongs to Spec 33 Part 2.
- **⛔ Task 5 RAN 2026-07-29 AND WAS REJECTED ON BEAN'S EYE (D411).** The mechanical half passed
  (21/21 sweep cells: openness-guarded axe · focus containment · ESC/focus-return · reduced-motion ·
  JS-off crawl; plus D374 multi-instance, `header` anchor deriving from the real header in a pinned
  state, `centred` anchor centred, and **`listColumns` CONFIRMED visible in the editor canvas** —
  that last open question is now answered by measurement). **The fidelity half failed:** Bean's
  verdict was *"night and day"*, *"all of these clone attempts need huge fixes"*. R-31-13 holds —
  the eye is co-authoritative and it said no. **The variants reproduce structure and copy, not
  design** (styling, borders, symbols, button treatment, cycling background imagery and its motion,
  and the animated secondary media are all absent). Do NOT re-present without real rework.
  Record: `.claude/reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md` (its CORRECTION box
  first) + D411.
- **Two defects proven live, both OPEN:** `P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER` (icon-list text
  `rgb(58,46,38)` on a `rgb(58,46,38)` drawer = contrast 1:1, invisible; 6 elements across the 2
  dark-`footer-bg` variants) and `P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU` (the drawer emits no
  align class; `drawerAlign` centres direct children as boxes while the nav-menu stretches full
  width with `text-align:start`, so `centred-statement` renders left-aligned).
- **⭐ THE ARCHITECTURE DECISION IS MADE — gate SIGNED (Bean, 2026-07-29):**
  `plans/archive/2026-07-29-spec36-37-merged-architecture-and-drawer-cpt-gate.md`. Binding outcomes:
  1. **The drawer moves to a CPT — admin name "Menu drawer"** (Bean's naming; "Menu Panels" rejected
     as vague/mega-adjacent). Registration, Active/preview model and admin shape are owned by
     **Spec 37 FR-37-43** (the CPT family is 37's); this spec keeps drawer BEHAVIOUR (modal a11y,
     focus, motion, close model — FR-36-6/14/16 unchanged). The block markup survives unchanged as
     the CPT's content; `sgs/nav-drawer` becomes the render vehicle. Scope: **site-wide Active
     default + per-burger override** via the picker.

     > **AMENDED 2026-07-30 (W2-a, D419) — the additive half is BUILT; amended here in the same
     > commit as Spec 37 FR-37-43 per §1.2's both-specs rule.** Full record of what shipped lives in
     > FR-37-43 (registration, Active model, `wp_footer` render path, starters). **What this spec
     > owns and what changed on ITS side:**
     >
     > - **`sgs/nav-drawer`'s render path gained a one-per-request landmark mark.** It now calls
     >   `Sgs_Active_Layout::mark_served( AREA_DRAWER )` after emitting its `<dialog>`. This is a
     >   Spec 36 file change with a Spec 37 mechanism, and it is what makes both paths safe to
     >   coexist: until W2-d strips the drawer from the 8 header patterns, a page can carry a
     >   pattern-embedded drawer AND an Active CPT drawer. Both default their `drawerRef` to the
     >   same string, so without this mark two `<dialog id="sgs-nav-drawer">` elements would ship —
     >   a duplicate id, silently. The block behaviour (modal, focus, motion, close) is otherwise
     >   **byte-identical**; nothing in FR-36-6/14/16 changed.
     > - **`sgs/nav-menu` records which drawer id its burger controls** into a per-request registry,
     >   so the Active drawer renders only on pages that actually have a burger. A page with no
     >   burger keeps byte-identical output.
     > - **FR-36-9a's warning was taught about the Active drawer.** Once the panel is site-wide, an
     >   ordinary page holding no `sgs/nav-drawer` block is the CORRECT state — the unamended notice
     >   would have told every operator their working burger opens nothing. It now matches on the
     >   Active drawer's own `drawerRef` (a burger opens by element id, so an Active drawer with a
     >   different ref genuinely opens nothing) and otherwise shows where to edit the panel, plus
     >   the declared fact that the editor canvas cannot preview it (`wp_footer` never fires there).
     >
     > **NOT yet done, each mapped to a named stage:** `drawerRef` re-typing (clause 3 below) =
     > **W2-b** · the 7 starter looks (clause 2) = **W2-c** · patterns dropping the embedded drawer
     > + `variantPreset` retirement = **W2-d**. Clause 2's `variantPreset` is still live and still
     > emitted; nothing was retired this session.
  2. **`variantPreset` is RETIRED** (with `supports.sgs.variantAttr` seeding). The 7 looks become
     **"Menu drawer" starter patterns** served by the same native FR-37-7 picker headers use — a
     preset stops baking defaults and becomes an editable starting document. This resolves
     `P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS` by dissolution and moots the `variant_slots`
     fingerprinting limitation noted above (draft-side detection stays Spec 33 Part 2).
  3. **`drawerRef` re-types from DOM-id string to a drawer-post reference** with a picker ("Which
     menu panel does this burger open?" + inline create). FR-36-9a's dangling-ref warning survives,
     now firing on a deleted/draft post instead of a typo'd string.
  4. **nav-menu stays a BLOCK** — its content home is the classic menu, its edit surface is the
     header CPT; a nav-menu CPT would triple-indirect. Its trigger presentation upgrades: FR-36-27.
  5. **Controllability contract:** every reference-derived property has exactly one home — CPT
     content/attrs, inspector attrs (Spec 35-manifested), or theme tokens. A value with no home is a
     build defect (gate DP5).
  6. **Cloning is the FINAL PROOF GATE, not the next task** (Bean 2026-07-29, matching his
     2026-07-28 decision in `reports/2026-07-28-spec36-37-remaining-work-inventory.md`): fixture
     wave → capability wave (CPT + FR-36-27 + FR-37-42 + harness fixes) → polish → the 12-reference
     clone, studionamma first, each accepted clone yielding its B3 presets.
  Spec 36+37 execution is MERGED into one track (specs stay separate documents; §1.2 same-commit
  rule unchanged). **Do not rebuild fixtures on the block path** — the container is changing.

### FR-36-27 — Burger trigger presentation (added 2026-07-29, gate DP4 — NOT-BUILT)

The trigger the operator gets today is burger-glyph-only with colour/bg/hover/size attrs; the
references make the trigger a designed element (studionamma renders the word "MENU", fantasy a
symbol, lamalama a morphing glyph). New `sgs/nav-menu` attrs, all inspector-manifested:
`triggerStyle` (`burger`|`word`|`word-burger`|`symbol`) · `triggerLabel` (default "Menu") ·
`triggerSymbol` (shared `IconPicker`) · `triggerOpenStyle` (`morph-x`|`swap-label`|`unchanged`) ·
`triggerOpenLabel` (default "Close"). Open-state sync is cross-block state in `store('sgs/nav')` —
this PROMOTES `P-DRAWER-BURGER-MORPH-SYNC` from parked follow-on to a named build item (Bean's
client-controllability rule makes it core). The drawer's own `closeStyle` stays on the drawer:
trigger = nav-menu's, close chrome = the Menu drawer's.
**Status:** `NOT-BUILT` — capability wave of the merged track.
**Done when:** all five attrs render + round-trip in the editor, the open-state morph/swap is
live-verified with focus-return intact, and each attr appears in the Spec 35 manifest.
- Follow-ons parked: `P-DRAWER-BURGER-MORPH-SYNC` (true cross-block morph = store state-wiring,
  NOT a GSAP effect), `P-DRAWER-TRIGGER-ANCHOR-JS` (measure the burger's real rect at open — the
  `--sgs-drawer-header-offset` pattern), `P-DRAWER-POC-FIXTURES-NOT-EXACT-CLONES`,
  `P-NAV-MENU-LISTCOLUMNS-READING-ORDER` (⚠ downgraded to UNDECIDED — the "reading order is wrong"
  claim assumed column-wise reading; Bean's counter that rows-of-2 reads correctly across rows
  stands, and the reference capture for that variant failed, so there is no ground truth yet).

**Historical research summary (2026-07-28 session 1 — measurements stand; the taxonomy framing is
superseded per the corrections above). Do not re-derive.**
Full measured write-up: `.claude/reports/2026-07-28-nav-drawer-desktop-variant-research.md` (3 rounds,
~30 sites, every geometry measured live on an OPEN panel — nothing inferred from CSS).
- **ONE block with VARIANTS, not two blocks.** Every production system checked does this (WP core
  Navigation `overlayMenu`; Bricks *"contains both your desktop & mobile menu"*; Webflow, GOV.UK,
  Elementor). The documented failure mode is not one-vs-two but **one block whose two modes cannot
  diverge** (Gutenberg #39142). We are already immune: the drawer holds its OWN `sgs/nav-menu`
  instance with its own uid + inspector, so the two modes diverge cleanly.
- **The variant axis is WHAT THE PANEL ATTACHES TO** — not its size:
  `full-screen` (viewport) · `header-attached` (the header) · `trigger-anchored` (the burger button) ·
  `side-panel` (a viewport edge, already half-built as `edge: left/right`).
- **`header-attached` must DERIVE its width from the header, never hardcode a number.** Measured on
  lamalama.com: panel **438×436 @ left:501/right:939**, header pill **438×50 @ left:501/right:939** —
  identical width and edges. The header *becomes* the menu. Deriving it means one rule works for a
  438px pill or a 1200px full-width bar, and degrades correctly on mobile with no extra work.
- **Full-screen is the DEFAULT and the norm** — 6 of 8 measured sites. The compact variants are the
  differentiator, not the common case. Each compact cluster is **n=1**, so its numbers are design
  anchors, not medians.
- **Each variant declares its own A11Y CONTRACT, not just CSS.** The two compact references are
  mechanically different (no-backdrop + background-interactive + explicit-close, vs backdrop-present
  + click-through + light-dismiss), and **neither is a real modal** — no native `<dialog>`, zero
  `[inert]`, no focus trap. Our `showModal()` is spec-supported at ANY size/position (web.dev; MDN)
  and would be MORE accessible than both. Owed on our side: backdrop-click-to-close in
  `store('sgs/nav')`. ⛔ Beware STOP-DIALOG-DISPLAY-GATE (D338) when adding per-device geometry.
- **Naming rule (binding): descriptive names, never studio names.** This ships to a restaurant, a law
  firm and a charity. Provenance belongs in the block.json `_note`.
- **ANSWERED 2026-07-28 session 2 (see the shipped block above): flat value holds; lamalama
  derives the header's width so mobile is free; lusion = per-device `anchor`.** Measured across
  all eight sites — `reports/2026-07-28-drawer-code-extraction/`.
- `side-panel` is DROPPED (2026-07-28) — zero of the 8 references uses an edge-anchored
  partial-width slide-in at any width; the half-built `edge:left/right` CSS was retired with
  the `edge` attr (D404).
- **Lateral (STILL unresolved after the 2026-07-28 build):** `sgs/modal` hand-rolls its own
  `showModal()` while the drawer delegates to `store('sgs/nav')` — two `<dialog>` engines remain.
  The variants build MIRRORED the modal's centred-card geometry model (the `centred` anchor:
  width + `max-width:calc(100vw−2rem)`) and its backdrop-click idiom, but did NOT unify the
  engines (the deferred Task 6). A shared dialog-geometry primitive would also serve the cart
  flyout and search overlay (FR-36-19/-20) and must carry a modal/non-modal flag or it conflicts
  with `sgs/mega-panel`'s DISCLOSURE contract (FR-36-10).

**Drawer settings surface (carried verbatim from Spec 34 FR-34-5 — the ONLY itemised drawer-styling control list; NOT-BUILT, folds into this build's controls per FR-36-14):** a "Drawer" inspector panel, per-device via the shared `ResponsiveControl` (never a new switcher), all emission through the shared responsive helpers into the scoped `<style>` (zero inline):
| Setting | Attr | Shape | Default | Notes |
|---|---|---|---|---|
| Background | `drawerBg` | string slug | `primary` | fg computed (D339 WCAG resolver — contrast holds with zero config) |
| Close icon colour | `toggleCloseColour` | string slug | `""` = computed from header context | × colour when open; burger colour untouched (owned by header styling) |
| Content alignment | `drawerAlign` | enum `left`/`center`/`right` (CSS keyword — US spelling is the syntax, UK-rule exempt) | `left` | maps to align-items on the drawer body; children may override |
| Inner element spacing | `drawerGap` | object `{desktop,tablet,mobile}` | `{desktop:"20px"}` | gap between child rows |
| Popup padding | `drawerPadding` | object `{desktop:{top,right,bottom,left},…}` | `{}` | replaces any hardcoded padding; emitted via `sgs_emit_responsive_css` |

**Editor-canvas preview is collapsed by default, never opened by `isSelected` (2026-08-22, `fa2fb79d` + `6425f728`).**
`edit.js` cannot render the real `<dialog>` — a closed `<dialog>` cannot host an editable InnerBlocks region and
`<ServerSideRender>` cannot host one at all — so it renders a `<div>` preview shell instead. That is deliberate and
unchanged. What changed is the shell's SIZE. `style.css`'s real-dialog `width:100vw` / `height:100dvh` also land on
the shell inside the editor canvas, because WP enqueues a block's `style` there too and `useBlockProps` puts
`wp-block-sgs-nav-drawer` on the shell alongside `sgs-nav-drawer__editor`. With no opposing height/width in
`editor.css`, the shell filled the entire canvas fold — measured 771px against a 771px viewport, i.e. exactly 100dvh.
`min-height` cannot fix this; it loses to an explicit `height`.

The fix mirrors what `core/navigation` does for its own overlay (collapsed in BOTH `style.scss` and `editor.scss`,
opened by an explicit control and deliberately NOT by `isSelected`, which would reflow the canvas every time the
operator selects a different block):

- **Collapsed (default)** — a summary strip carrying the existing "Mobile drawer (preview)" label. The body is
  hidden with CSS, never unmounted, so the drawer's children cannot be dropped and stay reachable in List View.
- **Expanded** — an InspectorControls `ToggleControl` labelled **"Preview drawer open"**; the shell is bounded to
  420px with its own scroll, plus the height/width neutralisers that cancel `style.css`'s viewport sizing.

**The toggle is component state (`useState`), not a block attribute — it must never serialise into saved content;
an editor preview is not a property of the page.** `editor.css` compiles to `index.css` (`editorStyle`) and never
reaches the frontend, and no `display` is added to the dialog's base rule, so STOP-DIALOG-DISPLAY-GATE stays intact.

Deliberately NOT given its own FR-ID: this is an editor-UX correction inside FR-36-6's existing scope (the drawer
block's own behaviour), not a new capability.

### FR-36-7 — Shared nav plumbing utility (framework-reusable)
One `viewScriptModule` + `store('sgs/nav', …)` (public API — the established SGS pattern; NOT core-nav's
private store) for open/close/focus/`inert`/intent-timing across the disclosure + dialog surfaces. A UTILITY
not a component (prove by the three call-sites). It **ports D323** (body-reparent / transform-ancestor escape)
+ **D340** (scrollbar-bounce compensation) as existing fixes, not re-derived. **No-JS honesty:** the menu's
**links + top-level items are navigable + crawlable without JS**; the **dropdown/mega/drawer *panels* are
progressive enhancement** (the drawer degrades to `<details>`; a bar dropdown's links are still reachable on
the target page). "Crawlable without JS" ≠ "every panel opens without JS."

### FR-36-8 — Responsive collapse + THREE operator-chosen modes + per-device visibility
- **One collapsed layout.** The **collapse point N** is a visual breakpoint (operator attribute, default
  768) — distinct from the 768/1024 device-tier *style* system (Spec 35 D2). §8 sweeps a non-default N.
- **Operator surface = the "Burger Menu" panel, NOT a raw pixel box (Bean-locked 2026-07-28, D401).**
  The panel was called "Collapse point" and offered bare px presets (640/768/1024), which (a) broke the
  per-element clustering convention and (b) made burger-on-every-device reachable only by knowing to type
  a large number. It is now **Burger Menu** with four named options — **Always / Tablet / Mobile
  (default) / Custom** — where `Custom` reveals the px box. **`Always` = a burger at every width including
  desktop**, which is increasingly common on large sites and is what WordPress core's own Navigation block
  ships as `overlayMenu: "always"`. The STORED attribute is unchanged (numeric `collapsePoint`; `always`
  stores 99999), so render.php and every emitted `@media` rule are untouched — this is purely the
  operator-facing surface. **No bare px values in the UI.**
- **Device-neutral language is binding here (Bean 2026-07-28).** Burger menus run on tablet and desktop,
  not just phones. Anything operator-facing that said "mobile menu" / "on a phone" / "mobile drawer" was
  reworded ("Menu panel", "Below the collapse size…"). Do not reintroduce phone-framing — it mis-describes
  `Always` and `Tablet` outright.
- **Three operator-chosen mobile modes (all user-friendly):** (a) **burger → drawer**; (b) **priority+
  "More" overflow** — items that don't fit fold into a "More ▾" disclosure (per-item priority attribute;
  the overflow is measured client-side via `ResizeObserver`; **with no JS all items simply show/wrap**);
  (c) **bottom-tab-bar** — a fixed mobile bar of 3–5 icon+label items in the thumb zone (safe-area-inset for
  notched phones), active-state highlighted. The operator picks per site.
- **Burger→drawer association:** `sgs/nav-menu` carries `drawerRef` (target drawer anchor/ID → `aria-controls`);
  unset → the single drawer; multiple → explicit pick; a dangling `drawerRef` → editor Notice + burger
  no-op-with-warning (FR-36-9a). **⚠ AMENDED 2026-07-29 (gate, signed): `drawerRef` re-types to a
  "Menu drawer" POST reference with a picker control once FR-37-43 lands** — the DOM-id string form
  above is the pre-CPT shape; the Notice semantics carry over (fires on deleted/draft post).
- **Link-count / column-count notice:** a link-count / column-count editor INFORMATIONAL notice past a
  directional threshold (Baymard ~50-link abandonment cliff — validate on our sites, do NOT hard-code a DB
  default; never a gate — FR-36-12).
- **Per-device visibility:** **reuse the BUILT Responsive-Visibility extension** (device show/hide, Spec 35 /
  sgs-blocks) + `ResponsiveControl` for tiered values + the BUILT **`labelCollapse`** (Spec 37 §3.8 / FR-S9-8, live
  on button/business-info — collapse an item's label to icon-only per tier). **`labelCollapse` is RETAINED**
  (Bean's rule: keep an operator TOGGLE, bin an AUTOMATIC behaviour; code confirms it is a toggle —
  `button/edit.js:347`, `business-info/edit.js:88`). Full reasoning: Spec 37 §3.8. The per-device cascade this
  would have deferred to (Spec 35's `resolveTier()`) is BUILT; the feature that would consume it to hide
  equivalent elements per device is not — revisit `labelCollapse` against it whenever that feature ships.
  Note the two mechanisms are not interchangeable: the cascade HIDES an element at a tier,
  `labelCollapse` KEEPS the element and its link while collapsing its label to icon-only. The
  `ResponsiveTriStateControl` (on/off/inherit tri-state, P2 §4.1) is **BUILT (2026-07-28, `ac0c30eb`)** — adopt it,
  never invent a parallel control (R-31-9). Full per-device model + ownership split: FR-36-24.

### FR-36-24 — Per-device content + settings (beside FR-36-8; Spectra-standard)
Every header/footer/nav CONTAINER piece (rows + the pieces in §4) supports, per device tier
(desktop/tablet/mobile), a **different set of blocks** AND **different SETTINGS** on those blocks. This is the
confirmed central builder feature (Spectra parity). **Two ownership lines — do NOT conflate:**
- **(a) Whole-piece show/hide per device = Spec 37 / row-level.** The nav pieces need ZERO extra code here —
  they simply honour the BUILT universal Responsive-Visibility extension (`extensions/responsive-visibility.js`
  + `includes/device-visibility.php`; `sgsHideOnMobile/Tablet/Desktop`).
- **(b) Per-tier SETTINGS on a piece's own attributes = that block's own job**, via the shared
  `ResponsiveControl` (+ the BUILT `labelCollapse`). **No piece invents a parallel per-device control** — a
  structural guard (a `lint-responsive-controls.py`-style gate) enforces R-31-9: every responsive-worthy attr
  routes through `ResponsiveControl`, never a bespoke per-tier control.

**Named upgrade (optional, not a blocker):** the `ResponsiveTriStateControl` (on/off/inherit per tier,
P2 §4.1) is DESIGNED-NOT-BUILT (verified: 0 in `src/`) — the richer form of (a)/(b); until then, show/hide +
`ResponsiveControl` deliver it.

**Menu case (the one-menu-source default):** the bar and the drawer DEFAULT to ONE shared menu (the drawer's
`sgs/nav-menu` inherits-from-bar — no drift, faithful clone), with a deliberate per-device override available
(a different mobile menu). This per-device-content capability IS the override, so FR-36-1's "may use different
menus" is an explicit opt-in, not the default.

### FR-36-9 — Nav → header decoupling (one-directional)
The header knows nothing about the nav; coupling is nav → header only, via the header's **real published
surface (verified in live code):** `--sgs-header-height` (a `:root`/`body` CSS var from a ResizeObserver,
`header-behaviours/view.js`) + the body classes **`is-header-scrolled` / `is-header-shrunk`** (there is NO
`data-sgs-header-state` attribute — a richer signal would be NEW Spec-17 work). A partial-width drawer binds
`top`/`max-height` to `--sgs-header-height`. **Forward dep:** "header hidden on scroll → drawer full height"
needs the unbuilt hide-on-scroll feature (a Spec-17 header task, not new nav work — §8 build notes); the
full-screen modal drawer (default) needs none of this.

### FR-36-9a — Referential integrity + orphan lifecycle
No reference silently breaks: (1) a menu item whose mega target is trashed/missing renders as a **plain
link**; (2) a dangling `drawerRef` → editor Notice + burger no-op-with-warning; (3) a trashed mega surfaces
an admin Notice listing referencing items; (4) deleting a menu item leaves no orphan (the panel post is an
independent, reusable CPT); (5) §8 includes an integrity sweep. These are **error states**, distinct from
FR-36-12's informational a11y notices.

**Clause (2) — `✅ BUILT 2026-07-27` (`sgs/nav-menu` edit.js), and WIDENED past what this clause named.**
Cross-spec change: Spec 37 FR-37-26 amended in the SAME commit per Spec 37 §1.2's both-specs-same-commit
boundary rule (the drawer is this spec's; the header CPT the notice fires inside is Spec 37's).
The clause anticipated only a *dangling* ref — a `drawerRef` pointing at a drawer that does not exist. The
live gap found by the FR-37-26 operator-simplicity test was the **NO-drawer-at-all** case: every header
STARTER pattern ships an `sgs/nav-drawer` as a sibling of `sgs/site-header`, but a header assembled by
inserting the blocks by hand has none, so the burger opens nothing — silently, with nothing for a non-coder
to diagnose (parking `P-HEADER-SIMPLICITY-FINDINGS` finding 1). Both cases now warn, with different
plain-English copy and different one-click fixes: **no drawer** → *"Add the mobile menu"* inserts an
`sgs/nav-drawer` seeded with a `sgs/nav-menu` on the same menu, **as a root-level SIBLING** of whatever
top-level block the menu sits in, and selects it so the operator lands on its content; **dangling ref** →
*"Open “X” instead"* re-points `drawerRef` at the drawer that does exist.
**Binding details, all mirrored from the render path rather than assumed:** a blank `drawerRef` resolves to
`sgs-nav-drawer` on BOTH sides (`nav-menu/render.php:295-297`, `nav-drawer/render.php:61-65`), so the editor
compares *effective* refs — a blank-vs-default pair is a MATCH, not a mismatch. A `sgs/nav-menu` **inside** a
drawer renders a vertical list, not a burger, and is suppressed from the notice entirely. The fix action is
gated on `sgs/nav-drawer` being registered (`createBlock` throws on an unregistered slug).
**The drawer cannot instead be seeded from `sgs/site-header`'s TEMPLATE** — its root is a `<dialog>` that
promotes to the top layer, it must be a sibling, and the container is `templateLock:'all'` around exactly
three rows (D393). A notice on the nav block is the only mechanism that reaches the raw-insert path.
**Informational, never a gate** (Spec 37 FR-37-19 / P1 DP2a): an operator can always save a header with no
drawer. A hard save-gate was considered and REJECTED — a client blocked from saving with no trail is the
failure that policy exists to prevent.

## 4. Utility pieces (best-version; EXTEND existing blocks)

> The nav composes with five utility pieces. Each EXTENDS an existing block — with an HONEST built-vs-to-build
> note and a phase line so a solo builder knows the sequence. The ONE a11y decision gate for every interactive
> piece is FR-36-10's: does the open panel leave the page usable (**DISCLOSURE**) or dim/block it (**DIALOG**)?
> — reuse that contract, never a second one. All bind the §10 constraints (no-inline, Part L controls,
> converter-emittable, WCAG, perf, UK).

### FR-36-19 — Cart (`sgs/cart`, extend) — full WooCommerce header cart
**Honest status + phasing:** the current `sgs/cart` render.php is a **badge + link only** — the mini-cart
preview/flyout/drawer is **UNBUILT** (its own block.json marks it "Phase 2"). So this is a **substantial BUILD
on the existing badge shell**, NOT "~90% ready". **v1 (Phase 1) = the badge fix only:** add `role="status"` to
the existing persistent `aria-live="polite" aria-atomic="true"` badge node (`cart/render.php:203` HAS the live
region + atomic but NOT `role="status"` — the one verified gap) so it announces the whole "N items" string
(WCAG 4.1.3). **The mini-cart itself = Phase 2 build.**
- **MUST (Phase 2 build):** live item-count badge; AJAX add-to-cart via the **Store API** (NOT legacy
  cart-fragments — cache-safe by construction, WooCommerce's own guidance); mini-cart preview
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
**Honest status + phasing (Phase 2):** a **genuine EXTEND** — the full WAI-ARIA **combobox** pattern is
ALREADY SHIPPED LIVE in `sgs/product-search` (`role="combobox"` + `aria-expanded`/`aria-controls`/
`aria-activedescendant` + `role="listbox"`/`option` in render.php). Extend it with product-preview + display
modes; NOT a rebuild.
- **MUST:** predictive live suggestions as-you-type (Baymard: the single highest-leverage search feature);
  debounced + capped (≤10 desktop / 4–8 mobile); `<form role="search">` no-JS fallback returning real results;
  the FULL WAI-ARIA combobox pattern (arrow/Enter/Esc; focus stays on the input); highlight the MATCHED (not
  typed) portion; product result previews (thumbnail + price); default UNSCOPED, scope as an option (NN/g).
- **SHOULD:** `displayMode` inline-bar | icon-expand | full-screen-overlay (the overlay = a DIALOG wrapping the
  combobox; the icon-expand reveal = a disclosure); labelled recent-searches on focus; dimmed background while
  open.
- **NICE:** popular/trending when empty; voice input.
- **Differentiator:** ONE shared combobox implementation reused across all three display modes; native
  Store-API (products) + post (content) wiring — competitors bolt this on via premium/third-party
  (FiboSearch). Result count / no-results = a live region (WCAG 4.1.3), same as the cart.

### FR-36-21 — Social icons (extend the SGS social block)
**Phasing (Phase 2). Extend** the social block (add accessible-name generation + `rel` + one-source rendering).
- **MUST:** curated platform set + first-class custom-SVG upload; **accessible name per icon auto-generated +
  editable** (verb+platform, "Follow us on Instagram"; glyph `aria-hidden` — WP core omits `aria-label` by
  default, a citable competitor gap); `rel="noopener noreferrer"` (+optional `nofollow`) auto on external
  links; open-in-new-tab default-on; size/shape/spacing controls; brand vs monochrome/theme colour + hover
  colour; keyboard-reachable + visible focus (never hover-only reveal).
- **SHOULD:** ONE site-wide list rendered in header+footer+drawer, independently styled per placement (the
  structured-data-once differentiator, FR-36-25); drag-to-reorder.
- **NICE:** explicit Follow-vs-Share as distinct components; reduced-motion-gated hover micro-interaction;
  optional `rel="me"`.

### FR-36-22 — Logo (`sgs/responsive-logo`, extend) — the logo OBJECT
**Phasing: basics = Phase 1** (left-aligned default, link-to-home, per-device image, functional alt — the logo
appears in Mama's header + the drawer default template). **lockup + favicon-sync + transparent/dark variants =
Phase 3.** **Extend** `sgs/responsive-logo`.
- **MUST (basics, Phase 1):** left-aligned default (NN/g: 6× better home-return); link-to-home on by default;
  **separate desktop/tablet/mobile IMAGE upload** (swap the file, not resize-only); SVG upload; **functional
  alt** ("[Business] home", inline authoring hint, never "logo"); max-width/height per breakpoint;
  sticky-header compact-mark swap.
- **SHOULD (Phase 3):** transparent-header light/dark variant; shrink-on-scroll (row+logo dimension animate);
  dark-mode variant; logo+site-title lockup toggle; **sync-as-favicon** (WP core `shouldSyncIcon`).
- **NICE:** reduced-motion SVG entrance/hover; auto-2x raster.
- **Differentiator:** ONE logo *object* attribute (desktop/mobile/sticky/transparent/dark with a fallback
  chain) in one inspector panel with live preview — beats the competitors' split-across-panels UX. A11y/SEO:
  visible focus (first tab-stop); `<img>` in `<a href="/">` near DOM top.

### FR-36-23 — Business-info / contact (`sgs/business-info`, extend) — the Site-Info source of truth
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
**Added 2026-07-23 (Bean-directed). REVISED the same day — an earlier draft proposed a compound
wrapper switching between two child blocks; that is SUPERSEDED by the simpler shape below.
Status: `BUILT + LIVE-VERIFIED 2026-07-23` (D374, commits `bf312016` + `d08d3149`).** Both
dispatches shipped: presentation (heading + markers + typography) and data+semantics (source
toggle + menu binding + the FR-36-26a contract). Multi-rater pre-commit review found 2 HIGH
defects (fixed pre-ship — see FR-36-26c). Live-verified on the sandybrown canary (page 1720, five
instances): all three FR-36-26a types render exactly per the table below; `numbered` → real `<ol>`;
`<nav>` only for menu-bound + typed-with-urls-and-heading; `aria-labelledby` = the visible heading;
`aria-current` client-side (page 1721 proof). axe: zero block-defect violations (the one
`color-contrast` hit is the Mama's brand-primary token `#e68a95` on cream — an inherited palette
issue, not a block defect; the block sets no inline colour). Replaces §1's "footer menus use the
native WP core menu", which the 2026-07-23 `core/navigation` ban made unbuildable.

**The need.** A footer needs a titled list of links — sometimes typed by the operator, sometimes
bound to a real WP menu so it stays in step with the site. Both render "a heading plus a list of
links"; they differ only in where the links come from and whether the result is a landmark.

#### The shape: extend `sgs/icon-list`. No new block, no compound.
`sgs/icon-list` gains a **heading**, a **marker set**, the shared **`TypographyControls`** family,
and a **`source` toggle** (`typed` | `menu`). `sgs/nav-menu` is UNCHANGED and keeps the site
navigation role (bar + drawer).

**Why a `source` attribute and NOT a compound block swapping child blocks (decided — do not
re-litigate):** swapping InnerBlocks on a toggle is fragile in Gutenberg AND destroys whatever the
operator typed the moment they try menu mode. A `source` attribute keeps both datasets intact —
typed `items[]` stay stored while menu mode renders — so flipping back is lossless. This is the
`sourceMode` pattern already used legitimately on `sgs/product-card` (`wc-product`/`sgs-cpt`).

**Why `icon-list` and not `nav-menu` owns this (corrected reasoning, recorded so it is not redone).**
An earlier draft argued nav-menu must own anything menu-bound because "menu→markup must exist in ONE
place". That is satisfied by CALLING the shared resolver: `SGS_Nav_Menu_Source` is a static utility
class with public methods (`get_menu_blocks`, `blocks_from_classic_menu`, `blocks_from_ref`…)
**already consumed by two files** (`nav-menu/render.php`, `class-sgs-header-behaviours.php`).
Calling it is REUSE, not duplication. The cost asymmetry then decides it: nav-menu would have to
absorb markers + typography + heading + dividers — icon-list's entire presentation surface — whereas
icon-list needs one resolver call plus a conditional landmark wrapper.

**No collision with the `core/navigation` redirect.** That mapping fires only on an actual core menu
block. A draft heading is not part of one, and a typed link list has nothing to redirect.

**Heading behaviour:** blank by default when `source: typed`; defaults to the MENU'S NAME when
`source: menu`; an operator-entered title overrides both and is **sticky** — a later menu rename
must never silently replace it.

**Marker set:** `icon` | `emoji` | `bullet` | `numbered` | `none`. **`numbered` requires a real
`<ol>`** — when order is meaningful the ELEMENT must say so; CSS counters reach neither assistive
tech nor crawlers. The marker renderer is ONE shared PHP helper (same seam as the 2026-07-23
`DeviceTabs` extraction: shared presentation, each consumer keeps its own data and semantics).

**Honest baseline (verified 2026-07-23 — do NOT assume richer).** `sgs/icon-list` today has
`items/icon/defaultIconSource/iconColour/iconSize/dividers/textColour` plus spacing/border, renders
`<ul>` ONLY, has an emoji path, and has **no** marker-type attr, **no** `<ol>`, **no** heading and
**no** `TypographyControls` family. Bullets, numbering, none, the heading and the typography surface
are all NEW BUILD, not configuration.

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
   `nav-menu/view.js:48` already does this and documents why: LiteSpeed (this stack's confirmed
   cache layer) would otherwise cache one page's answer and serve it on every page (FR-36-11).
3. **`<nav>` is OPT-IN, never automatic.** A four-column footer where every column is a landmark
   yields four nav landmarks; landmark bloat is itself an accessibility defect. Menu-bound defaults
   ON, typed defaults OFF.

**Schema boundary (FR-36-17, binding):** the block ships schema-FRIENDLY MARKUP only. **JSON-LD
emission is owned by `seo-schema` — no schema in blocks** — and the block must not block it. Honest
note: `SiteNavigationElement` has weak real-world support and Google has never documented consuming
it; the semantic HTML is what actually earns the SEO and AI-crawl benefit. Keep it; do not oversell it.

Inherited free from FR-36-17, NOT restated as new work: server-rendered, no AJAX, no lazy-load,
descriptive anchor text.

> `sgs/nav-menu`'s root has always been a `<nav>` with `navLabel` on it
> (`SGS_Container_Wrapper::render(..., array('tag' => 'nav', ...))`). One `<nav>` per instance,
> one label — verified live on `/t1-nav/` (`navCount: 2`, `nested: false` on both). A 2026-07-23
> same-day fix that added a second nested `<nav>` was a REGRESSION and has been reverted — do
> not re-apply it. That fix was built on a false diagnosis reached via
> `grep -c "<nav" nav-menu/render.php` returning 0 — the `<nav>` tag is emitted from
> `class-sgs-container-wrapper.php`, a file the grep never read
> (`STOP-A-GREP-PATTERN-THAT-CANNOT-MATCH-PROVES-NOTHING`).
>
> **The one REAL bug in this area — found by the same live test, now fixed.** `navLabel` defaulted to
> `'Primary'` in `block.json`, so `$nav_label` was never empty and the `wp_get_nav_menu_object()`
> menu-name branch was **unreachable dead code**. FR-36-11's promise that two navs bound to different
> menus are named apart automatically could not hold — every instance was "Primary". The default is
> now `''`. Live-verified: a bar with an explicit label and a drawer without now render `"Primary"`
> and `"T1 Verify"` (derived from menu "T1 Verify Menu", trailing "Menu" stripped), and both are
> simultaneously exposed when the drawer is open — the case that needs distinct names.
>
> **Also corrected: the axe attribution.** This note claimed the framework-wide `region` /
> `landmark-unique` violations were caused by the missing nav landmark. They are not. Negative
> control 2026-07-23: the canary HOMEPAGE, which renders no `sgs/nav-menu` at all, reports the
> **identical five violations**. Their real cause is two unnamed `<main>` elements
> (`landmark-no-duplicate-main` + `landmark-main-is-top-level` fire alongside). `sgs/nav-menu`
> contributes zero axe violations. The theme-level duplicate `<main>` is a separate, still-open
> defect — see `parking.md`.
>
> ⚠ **Still owed:** `axe` on the OPEN drawer. The `nav-qa/axe-run.mjs --open` run timed out on
> `locator.click` (harness actionability, not a page defect — the burger opens correctly under a
> direct click). Reported INCONCLUSIVE, not banked.

##### Landmark naming for a bar + drawer on the SAME menu — RESOLVED by research (2026-07-23)
An earlier note here claimed this was "unresolved by construction — the operator must set distinct
`navLabel`s". **That was wrong.** Primary sources say no differentiation is required:

- The **ACT rule** behind axe's `landmark-unique` has an applicability clause: it applies only to
  landmarks that **are included in the accessibility tree**. `display:none` prunes an element from
  that tree, and a **closed `<dialog>` is spec'd to be removed from it** (MDN). Our bar is
  `display:none` below the collapse point; our drawer is a closed `<dialog>` otherwise — so the two
  are **never simultaneously exposed** and never form the "set of two" the rule evaluates.
- **axe-core confirms it behaviourally**, not just in theory: `excludeHidden` defaults to `true`, and
  Deque state plainly that axe "does not test hidden regions, such as inactive menus or modal
  windows". A hidden duplicate landmark does not trigger `landmark-unique`.
- **Adrian Roselli ("Maybe Don't Name That Landmark", 2024):** a `<nav>` needs no accessible name at
  all until two share the same scope, and naming past ~5–6 landmarks becomes noise rather than help.

**Two rules this DID change in our implementation:**
1. **Never end a landmark label with "menu"/"navigation"/"nav".** The role is already announced, so
   "Main Menu" would be read as *"Main Menu navigation"*. Operators name menus exactly that way, so
   the derived label is now normalised (`Main Menu` → `Main`, `Primary Navigation` → `Primary`), with
   a guard so a menu named just "Menu" keeps its name rather than becoming empty. An explicit
   operator `navLabel` is passed through untouched — their choice, not ours to rewrite.
2. **Prefer `aria-labelledby` → visible text over `aria-label`** where a heading exists (Roselli:
   `aria-label` carries localisation risk). That is already the FR-36-26a rule for link lists; this
   block has no visible heading, so `aria-label` remains correct here.

**The genuinely-duplicated case still matters** — a header nav and a footer link-list nav CAN be
visible simultaneously (FR-36-26a's opt-in `<nav>`). There, distinct names ARE required, and
`aria-labelledby` pointing at the visible heading is the preferred technique (WCAG ARIA11's own
worked example). FR-36-26a already specifies exactly that.

##### Mega menus and landmarks (answered 2026-07-23; binds FR-36-4/36-5)
**A mega-menu panel is NOT its own landmark.** It stays inside the parent `<nav>`. The W3C ARIA APG's
Disclosure Navigation example wraps the top-level links AND their disclosure panels in ONE navigation
landmark, and does not nest a second `nav`/`region` inside. Panels are exposed purely through the
disclosure button's `aria-expanded` plus normal link semantics — which is the same DISCLOSURE
contract FR-36-10 already mandates (and the same reason `role="menu"`/`menubar` is banned there).
Over-landmarking makes landmark navigation noisier, not richer. So the naming work above applies to
the nav as a WHOLE, once — not per panel, and not per column inside a panel.

#### FR-36-26b — Converter routing target (declared NOW; recognition deferred to Part 2)
**Bean-directed 2026-07-23.** The specialised header/footer converter ("Spec 33 Part 2") is not built
and is deliberately not designed here. But its EMIT TARGET for this content type is stable and
knowable today, so it is declared now — cheap now, expensive to retrofit. When Part 2 is built it
INHERITS the mapping below and only has to solve RECOGNITION (identifying the region in a draft) plus
the conversion mechanics.

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

**Explicitly NOT decided here:** how Part 2 RECOGNISES a footer link-list region in an arbitrary
draft. That is Part 2's design problem. This entry exists so the MAPPING is not re-litigated then.

#### FR-36-26c — BUILD SCOPE (fully scoped 2026-07-23; dispatchable as-is)
Everything below is decided. A future session dispatches it without re-designing.

**Data model — new attributes on `sgs/icon-list`.** Shapes are frozen (STOP-D328): declare the
SHAPE, not just the value, or WP coerces to the default.

| Attr | Type | Default | Notes |
|---|---|---|---|
| `heading` | string | `''` | The list title. Blank = render no heading element at all |
| `headingLevel` | string | `'h3'` | `h2`–`h6` or `p`. **No JSON `enum`** — validate in PHP (`blockjson-enum-coerces-invalid-to-default`: an out-of-enum stored value is silently coerced) |
| `source` | string | `'typed'` | `typed` \| `menu`. Never a JSON enum, same reason |
| `menuRef` | integer | `0` | The `nav_menu` term id when `source: menu`. `0` = unset |
| `markerType` | string | `'icon'` | `icon` \| `emoji` \| `bullet` \| `numbered` \| `none` |
| `renderLandmark` | boolean | `false` | Emits the `<nav>` wrapper. Set `true` by default ONLY when `source: menu` (FR-36-26a rule 3) |
| `heading*` typography family | per R-22-13 | — | `headingFontSize`/`Unit`/`Tablet`/`Mobile`, `headingFontWeight`, `headingFontStyle`, `headingLineHeight`/`Unit` |
| `item*` typography family | per R-22-13 | — | Same suffix set, prefix `item` |

**Typography is NOT hand-rolled.** Use the shared `TypographyControls` component + the
`sgs_typography_css_rule( $attributes, $prefix, $selector )` helper (R-22-13). Do not write a
bespoke font-size control — that is the exact divergence the rule exists to stop, and
`check-control-ux` will flag a responsive family that bypasses `ResponsiveControl`.

**Two dispatches. Sequential — they touch the same three files, so they are NOT parallel-safe.**

**Dispatch A — presentation layer (SONNET).**
Marker system + heading. Adds `markerType` and the `<ol>` path (`numbered` MUST change the ELEMENT,
not just CSS — counters reach neither assistive tech nor crawlers), `heading` + `headingLevel`, and
both typography families with their inspector controls. The marker renderer goes in ONE shared PHP
helper under `includes/` (e.g. `helpers-list-markers.php`, aggregated by `render-helpers.php`) —
never inside the block folder, because `--webpack-copy-php` only copies paths named in `block.json`
and a sibling file would 500 in production (learned on the mini-cart, 2026-07-23).
*Files:* `icon-list/{block.json,render.php,edit.js,style.css}` + one new `includes/helpers-*.php`.

**Dispatch B — data + semantics layer (SONNET). Depends on A.**
`source` toggle, menu binding, and the FR-36-26a contract. Menu resolution CALLS the existing
`SGS_Nav_Menu_Source` static class (`get_menu_blocks`, `blocks_from_classic_menu`) — reuse, never a
second resolver (R-31-9). Heading default resolves from the menu's own name via
`wp_get_nav_menu_object( $menuRef )->name`, with an operator-entered `heading` overriding it
**stickily** — a later menu rename must never silently replace it. Then the per-type table in
FR-36-26a: conditional `<nav>`, `aria-labelledby` pointing at the rendered heading's id, and
`aria-current` computed CLIENT-SIDE in `view.js` (reuse `nav-menu/view.js`'s approach — LiteSpeed
would cache one page's answer for every page, FR-36-11).
*Files:* the same three, plus a `view.js`.

**Definition of done (each dispatch).**
- `php -l` + `phpcs --standard=WordPress` clean; `npx eslint` no NEW errors.
- Prebuild gates pass: `check-dead-controls` (every attr consumed), `check-dead-pattern-attrs`
  (nothing WP would silently discard), `check-control-ux` (no bespoke per-tier control),
  `audit-inline-styling` (Spec 32 — zero inline `style=""`).
- Every new attribute has an inspector control. A client edits blocks only; a setting that needs
  code is not done.
- UK English. No version bump, no `deprecated.js` (D270/D293).

**Live verification owed (cannot be closed by a build).** Render one instance of EACH of the three
FR-36-26a types on a real page and confirm: `numbered` emits `<ol>`; the `<nav>` landmark appears
ONLY for the menu-bound case; the landmark's accessible name equals the visible heading text; and
`aria-current` lands on the right item on more than one page (proving it is client-side, not baked).
Then `nav-qa/axe-run.mjs` clean on that page.

**Out of scope for these two dispatches, recorded so it is not silently absorbed:** the FR-36-26b
converter recognition step (Part 2's problem — only the ROUTING is declared, not the detection), and
any change to `sgs/nav-menu`, which keeps the bar/drawer role untouched.

**BUILT + LIVE-VERIFIED 2026-07-23 (D374).** Both dispatches shipped as spec'd (`bf312016` +
`d08d3149`). Notes for future readers:
- **Spec 35 Part B consistency:** `source` + `markerType` use `ToggleGroupControl` (2–5 short
  options), not a `Select` — matching hero/nav-drawer/StateToggleControl.
- **Menu resolution uses `SGS_Nav_Menu_Source::blocks_from_ref($menuRef)`, NOT `get_menu_blocks()`.**
  A HIGH review finding: `get_menu_blocks()` is the "find ANY menu" resolver — on a stale/invalid
  ref it falls through to the site header nav / theme-location chain, so a footer list would silently
  render the SITE NAV (especially likely on a cloned site where source menu ids don't match).
  `blocks_from_ref()` resolves the ref alone and returns `[]` — the fail-soft contract. Live-proven
  (invalid ref 999999 → empty list, not the site nav).
- **A nameless `<nav>` is unreachable:** `$render_landmark` is gated on a non-empty heading in BOTH
  source branches (a second HIGH finding). renderLandmark-on + no-heading degrades to a plain list.
  Live-proven.
- **The flatten helper `sgs_icon_list_flatten_menu_blocks()` lives in `includes/helpers-list-markers.php`,
  NEVER in render.php** — render.php is re-included per block instance, so a top-level function there
  fatals with "Cannot redeclare" on the 2nd icon-list on a page. Caught only by a **multi-instance live
  render** (a 5-instance page 500'd) — every build gate AND both code reviewers passed it. Lesson.
- **Heading id is `wp_unique_id()`, not derived from the md5-of-attrs uid** (two identical-attr blocks
  would otherwise share a DOM id + ambiguous `aria-labelledby`).
- Reusable canary fixtures: pages **1720** (5 cases) + **1721** (aria-current self-link proof).

## 5. Accessibility (governing; primary-source-grounded)

### FR-36-10 — Disclosure vs dialog
Dropdowns AND mega = **DISCLOSURE** (`<nav aria-label>` + `<button aria-expanded>`; `aria-controls` SHOULD;
OMIT `aria-haspopup`; Tab through, NO trap; Escape closes + returns focus; arrow keys optional). NEVER
`role="menu"/"menubar"`. Drawer = **DIALOG (modal)** (native `<dialog showModal>`). Mega = a bigger
disclosure sharing `sgs/nav-menu`'s contract. **This is the ONE a11y gate every §4 interactive piece reuses**
(cart/search `displayMode` auto-swaps between the two patterns) — never a second contract.

### FR-36-11 — WCAG (2.1 AA + 2.2 wins)
`aria-current="page"` — **computed CLIENT-SIDE** (compare `location.pathname` at mount), NOT server-baked,
because LiteSpeed (this stack's confirmed active cache layer) would otherwise serve a stale page's answer;
unique labels on multiple `<nav>`s + descriptive anchor text; accessible names on icon buttons (burger, ×) +
live `aria-expanded`; `:focus-visible` ≥3:1 (SC 1.4.11); SC 2.4.11 Focus Not Obscured; SC 2.5.8 24 px (SGS
keeps 44 px); skip-link visible-on-focus; `prefers-reduced-motion`; `forced-colors`/HCM (no shadow-only
boundaries — borders/focus rings must not vanish in Windows High Contrast) + `prefers-contrast`; no
colour/motion-only state.

### FR-36-12 — Operator a11y feedback INFORMATIONAL ONLY (P2 DP2a)
Editor/admin a11y feedback = a passive Notice, never a gate. (The *operator-facing* a11y warnings are the
"Nav Health" surface — §7 Opp 3, Phase 3.) Distinct from FR-36-9a *error* states.

## 6. Rendered output + editor controls

### FR-36-13 — No inline styling (Spec 32)
Nothing renders as inline `style="…"`: native supports flip to scoped serialisation
(`__experimentalSkipSerialization` + `wp_style_engine_get_styles(...,['selector'=>"#uid"])` into the scoped
`<style>`); box-object attrs; responsive tiers + `:hover` in stylesheet rules; custom bps → `sgsCustomCss`.
`sgs/nav-menu` (bar) keeps the scoped `SGS_Container_Wrapper`.

**`<dialog>` exception — `sgs/nav-drawer` is content-KIND BLOCK-PRIVATE, not a wrapper composite** (D294,
Bean-approved; built + live 2026-07-20). The drawer's root element must BE the `<dialog>` — that is what makes
`showModal()`, the top-layer promotion, the `::backdrop`, and the native ESC/`cancel` behaviour available at
all. `SGS_Container_Wrapper` emits its own `<div>` as the block root, so hosting the drawer in it would either
bury the `<dialog>` one level down (losing the wrapper's box/width controls over the actual modal surface) or
put a `display` value on the `<dialog>` base rule, which defeats the UA's `dialog:not([open]){display:none}`
and leaves the drawer permanently visible (STOP-DIALOG-DISPLAY-GATE, D338). The drawer therefore renders
block-private with its own scoped `<style>` — which is the D294 rule as written, not an exception to it: a
content-KIND composite using only box+width may render block-private, since it never used the wrapper's
grid/section/background machinery. Zero converter impact (CSS routes off `block_attributes` keyed on
`block_slug`, never `wraps_block`/`container_kind`). The no-inline contract is unchanged and fully met.

### FR-36-14 — Control-completeness (Spec 35 Part L)
Settings/Styles/Advanced via `group`; ≤3-default `PanelBody` + `ToolsPanel` (P2 §5); `LinkControl` per
item/CTA; `StateToggleControl` (hover); the shared **`TypographyControls` + `sgs_typography_css_rule`** (R-22-13,
never bespoke font controls); `ResponsiveControl` (tiers) + the **BUILT Responsive-Visibility extension** +
BUILT `labelCollapse` (per-device show/hide + label-collapse — FR-36-8/-24); `DesignTokenPicker` (enableAlpha +
clearable); box-object attrs; `hideExtensions`; `MediaGalleryPicker`/icon + `supports.sgs.imageControls:true`
on any `<img>` block; reduced-motion gate; **editor preview via `<ServerSideRender>`** (else a drifting
static snapshot — the `ssr-fixes-hand-built-preview-drift` lesson; interactive behaviour previews front-end);
keyboard + contrast + `aria-describedby`; **`templateLock:"contentOnly"` on client patterns** (first
application in SGS — see FR-36-3). Custom/preset UI welcome where it improves UX (P2 §2.6).

**`hideExtensions` is MANDATORY on every nav block (Bean-directed 2026-07-28, D401 — `43d3e2d2`).**
The four universal extensions (`hover-effects`, `parallax`, `custom-spacing`, `animation`) attach to
EVERY `sgs/*` block unconditionally; the opt-out `supports.sgs.hideExtensions` already exists and was
already used by `sgs/brand-strip`. `sgs/nav-menu` and `sgs/nav-drawer` never declared it, so a client
was offered **13 inspector panels on a navigation menu** — including *Block Link* (wrap the whole nav
in one `<a>`), *Element parallax* on a sticky bar, *Click Effects*, and a generic *Hover Effects*
panel duplicating the block's own per-element hover controls. Both now declare
`"hideExtensions": [ "hover", "blockLink", "clickEffects", "parallax", "spacing" ]` → **nav-menu 8
panels, nav-drawer 4**, live-verified with a negative control (`sgs/card-grid`, which declares
nothing, still shows all four — the shared mechanism is untouched).

**Two findings worth carrying:** (1) the *Spacing* panel was not merely a duplicate — it was
**silently DEAD on nav-menu**: its four fields write `sgsMarginTop/Bottom/PaddingTop/Bottom`, which
`custom-spacing.js` never registers when a block declares native spacing, so every value a client set
was discarded on save. **An extension panel RENDERING is not evidence its attributes are registered.**
(2) `conditional-visibility.js` has NO `hideExtensions` slug wired at all — it cannot currently be
opted out of by any block. Kept here deliberately (member-only / promo-window navs are legitimate),
but noted for whoever needs it hideable.

**Rule for any NEW nav block: declare `hideExtensions` deliberately. Inheriting all four is a
decision, not a default.** ⚠ Still open framework-wide, NOT fixed here: the bespoke Custom CSS field
in the Advanced tab is a Spec 35 Part F anti-pattern present on all 81 blocks — a separate task.

## 6a. Progress — verified status (updated 2026-07-28 — GATE 3 CLOSED, D401)

> Per-FR evidence: `.claude/reports/2026-07-22-spec36-completion-audit.md`. Three tiers, never
> conflated: `LIVE-VERIFIED` (observed running on the canary) / `DEPLOYED (unexercised)` (shipped +
> checksum-verified but no page or setting currently renders it) / `BUILT (code)`.

| FR | State | Evidence / what remains |
|---|---|---|
| 36-1, 36-2, 36-7, 36-13 | `DONE` | Phase-1 close, D352 |
| **36-12** operator notices | `DEPLOYED (unexercised)` | Link-count `Notice` on `sgs/nav-menu`, threshold a named constant (directional per FR-36-8, deliberately not a DB default). Verified in code to carry NO save/publish gate (P1 DP2a). Editor-surface — needs an editor session. **Deferred, not dropped:** the heading-less mega-panel notice needs the `sgs_mega_menu` CPT editor (Phase 2) |
| **36-19** mini-cart | `DEPLOYED (unexercised)` | Store API (never cart-fragments), qty-edit/remove, empty state, `displayMode` link/flyout/drawer auto-swapping DISCLOSURE↔DIALOG per FR-36-10 via the SHARED `store('sgs/nav')`. **No cart block on any canary page yet** |
| **36-20** search extends | `DEPLOYED (unexercised)` | Genuine EXTEND — the shipped ARIA combobox is reused unmodified across all 3 display modes. **NOT DONE:** product prices; the search REST controller fixes its response shape and states "no price data — ever", so it needs its own dispatch. `filter-search` deliberately untouched (verified: no combobox, different mechanism) |
| **36-21** social one-source | `DEPLOYED (unexercised)` | Auto-generated + editable accessible names (verb+platform), custom SVG, `rel` handling, brand-vs-theme colour. ⚠ `colourMode:'brand'` is opt-in and NOT contrast-swept per client — Snapchat yellow on filled/pill could fail SC 1.4.11 |
| **36-24** responsive-control gate | `GATE BUILT` | `lint-responsive-controls.py` — DB-first, self-discovers sanctioned wrappers, proven by negative control (fails on a bespoke switcher fixture). 0 findings across 78 blocks. Not wired into prebuild (separate decision) |
| 36-22 logo | `PARTIAL + open defect` | Still reads `get_theme_mod('custom_logo')`, so the logo resolves from a DIFFERENT source than contact/social. §1 flags it; FR-36-22 must resolve it deliberately |
| **36-26** link lists | `BUILT + LIVE-VERIFIED` 2026-07-23 (D374) | Both dispatches shipped `bf312016`+`d08d3149`; multi-rater-reviewed (2 HIGH fixed); canary pages 1720/1721 — see §4 |
| **36-3** CPT model + starter picker | `LIVE-VERIFIED 2026-07-25 (D379)` | `sgs_mega_menu` CPT + `resolve_panel_for_menu_item` built + registered (`class-sgs-mega-menu-cpt.php`). SPIKE proved LIVE on sandybrown: a panel attaches in Appearance→Menus + the resolver returns it (`item#1746 → POST#1745`). **Native "Choose a pattern" picker LIVE-VERIFIED** — fires for a new `sgs_mega_menu` post with 3 starters (`mega-general-{1col,2col,2col-aside}.php`; theme 1.5.44 busts the pattern cache). ⚠ **CF-6 CORRECTED:** the pinned `templateLock:contentOnly` HID child settings (client couldn't edit link lists) → now `templateLock:false` + `allowedBlocks:['sgs/mega-group','sgs/mega-aside']` (client adds/removes/reorders 1-3 columns; children internally `templateLock:'all'`). Class is namespaced `\SGS\Blocks\Sgs_Mega_Menu_CPT` (call FQN) |
| **36-4** desktop disclosure | `DEPLOYED (partially live-verified)` | A mega-linked menu item renders a `<button aria-expanded>` disclosure (NOT `role=menu`) + `do_blocks` the panel at its REAL menu position — probe-verified on the canary (nav render emits interactive/trigger/panel/button-aria-expanded, no role=menu). Hover-intent (300ms) + 170ms close-grace bridge (CF-13; true safe-triangle deferred, STOP-29) + keyboard live in `store('sgs/mega')`. **NOT yet exercised:** open-on-hover/tap/keyboard on a real page (needs a populated panel + nav on a page). **⚠ PLAIN (non-mega) DROPDOWNS ARE NOT BUILT (recorded 2026-07-28, live-proven on canary page 1842):** FR-36-4 says "an item with a submenu renders a disclosure … else its submenu is a simple dropdown", but `nav-menu/render.php:103-109` deliberately FLATTENS `core/navigation-submenu` to the parent's own link ("no children this phase") — so a classic menu item with plain children (canary menu 100: "Recipes" → "Our Story"/"Sourcing") renders as a bare link and its children are silently ABSENT from the bar (children DO reach the resolver — `SGS_Nav_Menu_Source::classic_items_to_blocks` emits them as innerBlocks — the drop is in the nav-menu walk). Only the MEGA disclosure exists. Deferred-not-dropped, mapped to the FR-36-4 dropdown scope (STOP-29); the drawer accordion is likewise mega-only today |
| **36-5** mega CPT + native attach + real-position | `LIVE-VERIFIED 2026-07-25` | Seam = `attrs['type']==='sgs_mega_menu'` + `attrs['id']` (from `blocks_from_classic_menu`), reuses the verified resolver. Renders at real position (structurally impossible to render last). **CF-1 recursion guard** (`includes/helpers-mega-render.php`, static-set + depth-cap 3 + `finally`) — multi-instance no-fatal PROVEN on canary (D374 class). **CF-2 escaping** — injection (`panelBg:'red;}</style><script>'`) neutralised on a REAL render. Instance-scoped panel DOM ids (no duplicate-id) |
| **36-10** disclosure-not-menu | `LIVE-VERIFIED 2026-07-25` | Probe on canary: `<button aria-expanded>`, `[data-sgs-mega-trigger]`/`[data-sgs-mega-panel]`, NO `role=menu`. `store('sgs/mega')` is a disclosure not a modal (no scroll-lock/inert/showModal/reparent, CF-3 — drawer store untouched); Tab-off closes (no trap), ESC returns focus |
| **36-13** no-inline (mega) | `DONE` | `audit-inline-styling.js` = 0 INLINE-via-render across the mega blocks; scoped per-uid `<style>`, content-addressed uid (STOP-NO-KSORT) |
| **mega-panel presets** (parent-paints-child) | `FIXED + LIVE-VERIFIED 2026-07-25 (D382, `b5f2ee02`)` | render.php emits distinct Columns/Cards/Minimal layouts per `data-mega-style`. Two real causes broke BOTH the frontend and the editor canvas: **(1) self-nested selectors** — render.php prepended `$root_sel` to `$content_sel`/`$group_sel`, which already began with `$root_sel`, producing an impossible selector that matched nothing; **(2) broken style-handle filename** — block.json named the source files (`file:./style.css`/`file:./editor.css`) while the build emits `style-index.css`/`index.css`, so WP silently enqueued nothing on either surface. The same block.json bug was swept from 4 other blocks in the same commit. An earlier "WP 7.0's iframed editor canvas ignores this block's editor.css" diagnosis for this bug is FALSE — do not cite it; full retraction in CC memory `feedback_wp_iframe_canvas_ignores_editorstyle_use_style_css.md`. |
| **mega starter patterns** | `LIVE-VERIFIED 2026-07-25` | Inserting a starter was initially broken ("Block contains unexpected or invalid content" — mega-group/aside were STATIC with a save/pattern mismatch); FIXED by making them DYNAMIC (render.php wrapper + `save→InnerBlocks.Content`); re-verified: pattern inserts real editable columns + aside. Aside media capped (170px) so an empty/large image doesn't dominate |
| 36-8, 36-17, 36-9a (mega) | **`LIVE-VERIFIED 2026-07-28 (D401)`** | **GATE 3 CLOSED.** Fixture: canary panel **1745** populated, menu **100** (mega at position 2), page **1842** `/gate3-mega-nav/`. Every owed item discharged: **axe 0 on the OPEN mega AND the OPEN drawer** · crawl assertion (all 7 panel links + 3 headings + aside copy in the pre-JS HTML) · **live recursion test** (a panel embedding a nav on its own menu → plain link, HTTP 200, no nested panel; fixture restored) · drawer no-regression · keyboard no-trap + ESC/focus-return · reduced-motion full end state at 120ms · **Bean's R-31-13 eye sign-off GIVEN** on the geometry pass. 36-8's collapse control is now the **Burger Menu** preset (see FR-36-8) |
| **36-6** drawer desktop variants | `BUILT + probe-verified 2026-07-28 (D403/D404)` | Per-device `anchor`/`panelSize`/surface/`closeStyle`/`variantPreset` + 7 variations + nav-menu `listColumns` + backdrop-click-to-close (`store('sgs/nav')`), commits `faa14924`/`69dfbaf9`. Council-fixed (9 findings pre-commit); defaults render property-identical (page 1648); centred/full-screen anchors + backdrop-close verified live; variation insert + `isActive` verified in the real editor. DB seeded (`variant_attr='variantPreset'`; `variant_slots` weak by construction — value-differentiated variants, see FR-36-6 note). **⛔ Task 5 RAN 2026-07-29 AND WAS REJECTED (D411).** Mechanical half PASSED (21/21 cells + D374 multi-instance + both hand-set anchors + `listColumns` canvas visibility CONFIRMED). Fidelity half FAILED on Bean's eye — *"night and day"*; the variants reproduce structure + copy, not design. Two defects OPEN: `P-ICON-LIST-INVISIBLE-ON-DARK-DRAWER` (1:1 contrast, 6 elements, 2 variants) · `P-NAV-DRAWER-ALIGN-DOES-NOT-CENTRE-MENU`. **Next = block-vs-CPT design gate (Bean, separate session); no block-path rework before it.** Deliberate simplifications recorded: burger-morph static icon; trigger anchor CSS approximation |
| **36-10, 36-11** landmark | `LIVE-VERIFIED 2026-07-23` | One `<nav>` per instance, one label, on `/t1-nav/` (canary, classic menu 98). Distinct names derived per menu — "Primary" / "T1 Verify" — verified with BOTH exposed (drawer open), which is the case FR-36-11 governs. The 2026-07-23 "zero `<nav>`" finding was FALSE and its fix was reverted; the real bug was the unreachable menu-name fallback (`navLabel` default `'Primary'` → `''`). See the retraction note in §4. `sgs/nav-menu` contributes **zero** axe violations — negative control: the nav-free homepage reports the identical 5 |
| 36-11, 36-16 | **`GATE — drawer axe CLOSED 2026-07-28`** | The 2026-07-23 INCONCLUSIVE is resolved: **axe 0 on the OPEN drawer** (guard: height 0→780, 14 focusables). ⚠ **METHOD CORRECTION, binding on every future run:** a scoped axe run on a CLOSED surface passes VACUOUSLY — `nav-qa/axe-run.mjs --scope .sgs-nav-drawer` returns "0 violations" with or without `--open`, because axe's `excludeHidden` defaults true. **Any earlier drawer-axe claim made with that harness proves nothing.** Every axe run on a disclosure/dialog surface MUST first assert the surface is open (open/`aria-expanded`, height > 0, focusable count > 0) and report VACUOUS, never PASS, when the guard fails. `axe-run.mjs` still needs that guard wired in — until then, use a guarded harness |

**⚠ Build-order correction (2026-07-23, Bean-caught).** A progress summary claimed FR-36-15, 36-18
and 36-25 were "gated on Spec 33 Part 2". **Two of the three were wrong.** The specs say the
opposite: this spec's own frontmatter has *"33 Part 2 (converter — built AFTER the nav passes its
test gate)"*, and §7 repeats it. **Specs 36+37 complete first; Part 2 consumes them.** FR-36-15
FEEDS Part 2 (its job is documenting the architecture) and is blocked by nothing; FR-36-25 depends
on FR-36-21/22/23, not Part 2; only the *branded* Indus header sliver of FR-36-18 genuinely waits.
See Spec 37 §6 for the full note — including that "Spec 33 Part 2" is currently **ownerless**, which
must be fixed before any Part 2 work is scheduled.

## 7. Phasing — MVP first, prove before the plumbing

Each phase ships something demoable + has a pre-registered exit gate (Bean's eye + §8) before the next. The
utility pieces (§4) + cross-cutting FRs are phased INTO this plan so a solo builder knows the sequence.
- **Phase 1 (MVP) — Mama's end-to-end (classic menu):** `sgs/nav-menu` flat bar + burger → `sgs/nav-drawer`
  full-screen modal accordion + the shared utility + converter-emit of those two + FR-36-17 crawlability;
  **plus the cart badge fix (`role="status"`, FR-36-19) + logo basics (FR-36-22).** NO mega CPT, NO
  safe-triangle (flat bar has no submenus), NO priority+/bottom-tab, NO mini-cart drawer. **Gate-1** (Mama's
  live + drawer a11y + crawl + Bean's eye) is the pre-registered exit.
- **Phase 2 — Indus + rich desktop + mobile modes + the pieces:** the `sgs_mega_menu` CPT + native (classic)
  attach + real-position render + mobile-in-drawer; safe-triangle + hover-intent; the three collapse modes
  (burger, priority+, **bottom-tab-bar**); the "show header" per-row toggle; **the utility pieces — search
  (extend), social, business-info, and the cart mini-cart build (FR-36-19..23).** **Gate-2** = the full §8
  incl. the Indus mega. **After Gate-2 passes, before Phase 3:** update **Spec 33 Part 2** with the true
  header/footer setup (the clone pipeline comes after the nav is built + tested — FR-36-15).
- **Phase 3 (follow-on extras) — competitive breadth + the moves:** **block-based `wp_navigation` menu
  support** (+ its ⚠spike); WooCommerce category/nav integration; multilingual (+ hreflang);
  conditional/role-based/scheduled items; command-palette; `<details>`-animation polish; partial-width
  drawer; the `ResponsiveTriStateControl` upgrade; **logo lockup + favicon-sync + transparent/dark variants
  (FR-36-22 SHOULD); structured-data-once made fully explicit across all placements (FR-36-25);** **Opp 1 —
  "AI builds your whole nav from a sitemap"** (the emit path already writes every primitive — the real
  un-copyable differentiator, §0); **Opp 2 — portability/clone moat** (native-menu attach survives WP
  export/import, unlike competitors' bespoke bindings — low priority); **Opp 3 — in-editor "Nav Health" panel**
  (surfaces the §8 checks + the operator a11y warnings live, turning the invisible moat into demo proof +
  housing the informational a11y notices).

## 8. Acceptance — the concrete live-QC gate (absorbs Spec 34 FR-34-7)

### FR-36-16 — Reproduce both menus + the regression gate + Bean's eye (R-31-13)
- **Mama's (gate-1):** flat 5-item classic-menu bar + a **featured** item + a **cart badge** (`sgs/cart` with
  the `role="status"` fix); mobile → burger → drawer (accordion) + CTA + logo basics.
- **Indus (gate-2):** a 7-item bar of plain links + **3 dropdowns + at least one mega ("Brands"), rendered at
  its real menu position** (not last). The framework supports **5 mega layout templates**; the **exact live
  Indus mega count + layouts is TBD via the named arbitration step and RECORDED here before gate-2 passes** —
  the sources don't resolve 1-vs-5, so no confident count is asserted. Two-row header = the header builder's
  rows.
- **The live gate (one pass, cache-clear FIRST):** 375/768/1440 + **a non-default collapse-N** sweep; **axe = 0
  on the OPEN drawer AND an OPEN desktop mega**; the **`elementFromPoint` occlusion sweep** (methodology below);
  ESC/focus-return/Tab-containment; scroll-lock frame sweep; drawer geometry; late-CSS A/B; real desktop
  scrollbar; **a `prefers-reduced-motion` + `forced-colors` emulated-media sweep** (borders/focus rings survive;
  motion suppressed); **the `<details>` no-JS drawer + no-JS bar links** assertion; **the crawl assertion**
  (every bar+dropdown+mega link AND mega content in the pre-JS HTML); **mega renders at real position N, not
  last**; **the integrity sweep** (FR-36-9a); **`wp-perf-gate`** (no-CLS + budget; JS <50 KB / CSS <100 KB);
  RTL/logical properties; + Bean's cropped screenshot pair.

**`elementFromPoint` occlusion sweep — methodology carried verbatim from Spec 34 FR-S9-5 / FR-34-7 (D101,
reproducible from Spec 36 alone since Spec 34 is deleted):** with the drawer OPEN, at 375 + 768 + 1440:
`document.elementFromPoint()` at each probe returns the expected top-layer node — the **header row's probe
returns the toggle/close control** (not BODY or the scrim); **every drawer link probed at its own centre
returns itself**; **everything below the header is unreachable** (probe a hero link → returns the scrim /
`inert` layer, never the underlying link). PASS = every probe returns its expected node: **baseline 10/10
Mama's, 18/18 Indus**. Geometry: a partial drawer's `getBoundingClientRect().top` === header bottom ±1px at
all three widths; the frame sweep during open shows width/anchor CONSTANT (the **D340 bounce test** — run on a
**real desktop width with a classic scrollbar**; device emulation cannot reproduce the scrollbar-vanish bounce,
so the check is otherwise vacuous). Cache: clear the CDN/LiteSpeed cache FIRST (`hosting_clearWebsiteCacheV1` +
`wp litespeed-purge all`) or you measure the stale `?ver`.

### FR-36-18 — Cutover for the LIVE production instances (mirror P2 §6c) + light rollback
**Historical — the pre-deletion checklist.** At the time, `sgs/adaptive-nav` was live on both client sites. It was DELETED at Phase-1 close (2026-07-20); `sgs/nav-menu` + `sgs/nav-drawer` replace it. The checks that were run before deleting:
re-author both live headers onto the new blocks **via the editor** (never WP-CLI `post_content` — D270),
**canary-first**, before/after computed check both menus render + collapse. **Light rollback (do not
over-engineer):** keep the retired block registrations **DORMANT briefly post-cutover** (a fast revert path if
the new nav regresses) before **measuring zero live stored instances** of the retired blocks' attrs and then
removing the registrations.

**Status (2026-07-22, D361):** `MECHANISM PROVEN — real branded cutover deferred.` Canary (Mama's)
re-authored `b41352fc`. **Indus (palestine-lives) proven live** with a GENERIC proof header (`sgs_header`
#360 on `sgs/nav-menu` ref:3 + `sgs/nav-drawer`, set active via the admin action): renders from CPT
(marker once, core wrapper replaced, no legacy adaptive-nav in output) · desktop 7-link menu · mobile
burger→drawer axe 0 · no-overflow 375/768/1440 · no-JS crawl. This demonstrates the cutover MECHANISM
end-to-end; the faithful branded Indus header is deferred to the Spec 33 Part 2 header/footer cloning
pipeline.

> **⚠ The "retirement stays gated" clause that stood here is SUPERSEDED (D362, 2026-07-22, Bean-directed.)**
> It said: *do NOT run FR-37-21 on the proof alone — retiring adaptive-nav before the REAL Indus header is
> cutover would strand Indus on a generic header.* Bean overruled it: FR-37-21's only gate is FR-36-18
> green (met), and the "real branded header" is a **cloning** concern (Spec 33 Part 2), not a retirement
> gate. **FR-37-21 is DONE** — `sgs/adaptive-nav` + `sgs/mega-menu`, the 7 `mega-menu-*` parts, the 7
> `mega-menu-*` patterns and their `theme.json` entries were DELETED (`f1f86ea0` + `23a3cf63`), verified on
> repo + canary + production. **The rollback path is now git history only** (the blocks are no longer
> registered). Both sites currently render generic proof headers until cloning delivers the branded ones.

### 8a. Verified build notes (live-code items — cite at build; fact-check-corrected)
- **Menu-source detection (fact-check):** `SGS_Nav_Menu_Source::NAV_BLOCK_NAMES`
  (`class-sgs-nav-menu-source.php:44`) hardcodes `['sgs/adaptive-nav', 'core/navigation']`. When the rebuild
  lands, the new block's canonical slug is **`sgs/nav-menu`** — `sgs/nav` is ONLY the Interactivity store
  namespace, NEVER a block name (do NOT "add block name `sgs/nav`"). **Route the menu-source detection off the
  DB/registry, not a hardcoded PHP const** (R-31-1 DB-first), else the fallback resolution breaks and drifts.
- **`show_in_nav_menus` — PROVEN 2026-07-25 (D379), no longer a spike-owed.** `Sgs_Mega_Menu_CPT::register_post_type`
  (`class-sgs-mega-menu-cpt.php:138`) sets `show_in_nav_menus => true`; the D379 SPIKE confirmed LIVE on sandybrown
  that a `sgs_mega_menu` post attaches in Appearance → Menus and `resolve_panel_for_menu_item` returns it
  (`item#1746 → POST#1745 publish`). The old `class-product-templates-cpt.php:70` (FALSE) citation is retired.
- **`templateLock` — CORRECTED 2026-07-25 (D379): the panel uses `templateLock:false` + `allowedBlocks`, NOT
  `contentOnly`.** contentOnly HID child settings (a client could not edit the icon-list link lists — a blocking
  defect caught by a QC council). The panel now lets the client add/remove/reorder 1-3 mega-group/mega-aside
  columns; each child block is internally `templateLock:'all'` (fixed shape, editable settings). See D379 / FR-36-3.
- **`sgs/cart` badge → add `role="status"`** (FR-36-19).
- **Hide-on-scroll engine is BUILT-but-dormant** (`header-behaviours.css:118` + `view.js`; NO
  `headerHideOnScroll` attr) — wiring it (one attr + one resolver flag in
  `class-sgs-header-behaviours.php:196` + one toggle) is a **Spec-17 header task**, NOT a new state machine.
  Cross-reference; don't rebuild.
- **Existing nav blocks:** `sgs/adaptive-nav` + `sgs/mega-menu` (RETIRED, deleted — reference via git only);
  `sgs/nav-menu` + `sgs/nav-drawer` BUILT (Phase 1). **`sgs_mega_menu` CPT BUILT** (`class-sgs-mega-menu-cpt.php`,
  registered + `show_in_nav_menus`) and **the mega CORE — `sgs/mega-panel`/`mega-group`/`mega-aside` +
  `store('sgs/mega')` + the nav wiring — BUILT + DEPLOYED (D379, commit `19bafc9e`, 2026-07-25).** This "do NOT
  exist yet" line is retired.
- **DB drift to clean via `/sgs-update` at build:** the stale `block_composition` rows (`sgs/mobile-nav`,
  `sgs/mobile-nav-toggle`) + banned `core/navigation` in `site-header-row`'s allowed-list.
- **⚠ LEDGER correction:** the LEDGER's P2.5 line says "wp_navigation menu data locked" — STALE vs §12(f)
  (classic primary). Correct the LEDGER when consolidating.

## 9. Converter-emittability (Spec 31 §13 + Spec 33 Part 2)

### FR-36-15 — Emittable by construction (DP6); the clone pipeline is built AFTER the nav, not before
Write a **classic `nav_menu`** (the primary path — `wp_update_nav_menu_item()`; add a `nav_menu_item`
targeting each `sgs_mega_menu` post — the native association, no map); write `sgs/nav-menu` with
mode/style/`drawerRef` attrs; write one `sgs_mega_menu` CPT post per rich panel (block tree; template by draft
layout) + render at real position; write `sgs/nav-drawer`. **Per-client scoping:** emitted `sgs_mega_menu`
posts + starter packs carry a per-client title/slug prefix (no collisions). **Degradation:** an un-mappable
draft nav construct is logged skipped-with-reason (Rule 4). All native SGS blocks; no inline styles; no banned
core blocks; crawlable `<a href>`.

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
`get_posts` by referenced IDs) + transient-cache the rendered panel HTML keyed by panel-modified. Documented now
so the later pipeline is easy. *(wp_navigation-block emit + the "pack factory" are Phase-3/build-order deps.)*

## 10. Constraints
Spec 32 no-inline · Spec 35 Part L + Part G (templateLock:contentOnly, Responsive-Visibility ext) · Spec 31/33
emittable · Spec 37 decoupling + published state surface · WCAG 2.1 AA (+2.2; 44 px; forced-colors survival)
· crawlable/no-AJAX/schema-friendly (FR-36-17) · `viewScriptModule` vanilla JS + honest no-JS scope, no jQuery
· works in the header · transform-ancestor survival · perf budget (<100 KB CSS / <50 KB JS; no CLS;
links-never-lazy split from below-fold `<img loading=lazy>`) · UK English · DB-first (5 mega layouts
registry-defined) · D270 no-deprecations · **`blocks-must-shrink-to-fit-container` (Bean-locked)** — every nav
piece is intrinsically responsive (min-content ≤ container at every breakpoint), not clamp-forced.

## 11. Discoverability — SEO / AI-search / schema / performance

### FR-36-17 — Crawlable, schema-friendly, fast
- **Crawlable, server-rendered, NO AJAX (D334):** every bar/dropdown/mega link AND all mega-panel **content**
  (headings/text, not just links) is in the initial server HTML — no lazy-load — so crawlers + AI search see
  the whole structure + the rich content. **Scope the moat honestly:** plain crawlable links are table-stakes;
  the differentiator is server-rendered *rich mega content* (no AJAX) + **AI-auto-generation of the whole nav
  from a sitemap** (the un-copyable weapon — §0; Phase 3, Opp 1).
- **Semantic + descriptive:** `<nav>` landmarks + unique labels; real `<ul>/<li>/<a>`; descriptive anchor text.
- **Schema:** ships schema-friendly markup for `SiteNavigationElement` (+ `BreadcrumbList`); JSON-LD emission
  owned by `seo-schema` (no schema in blocks); must not block it.
- **hreflang forward-note:** when multilingual lands (Phase 3), emit per-language `hreflang` on the switcher
  (cheap to plan now, expensive to retrofit).
- **Parity, no cloaking:** bar/drawer may use different menus but every link in either is crawlable.
- **Performance / no-CLS:** no layout shift; within budget; not render-blocking; `wp-perf-gate` in §8.

### FR-36-25 — Structured-data-once (single source rendered everywhere) — the category-level differentiator
The biggest meet-and-exceed lever across the pieces: structured data entered ONCE, rendered contextually. The
**Site-Info source** (FR-36-23), the **single social list** (FR-36-21), and the **logo object** (FR-36-22) are each
edited once and rendered in header + footer + drawer + (for Site-Info) `LocalBusiness` schema — no competitor
(Kadence/Blocksy/Spectra) does this cleanly; all re-enter per placement. SGS already part-has it (`source:
site-info` toggle on social/business-info) — v2 makes it the explicit, spec-level differentiator, not an
implicit one. Made fully explicit across all placements in Phase 3 (§7).

## 12. Open sub-decisions — RESOLVED (Bean's veto at sign-off)
| # | Question | Resolution |
|---|---|---|
| a | Burger home | On `sgs/nav-menu` (collapsed), opens the drawer via `drawerRef` |
| b | Drawer content / menu | Full modal container; own menu picker (inherit-from-bar default); default template incl. logo+close |
| c | Collapse modes | Three operator-chosen: burger→drawer, priority+, **bottom-tab-bar**; safe-triangle ships |
| d | Mega association | **Native menu (Appearance → Menus)** — add the CPT like a page; item carries the post ID (no map/ID); resolved by `object_id`/`get_post()` |
| e | Drawer modality | **Modal-only** (`<dialog showModal>`) + "Show header" per-row toggle |
| f | Menu system | **Classic menus PRIMARY**; block `wp_navigation` → Phase 3 extra (Bean) |
| g | Per-device visibility | Reuse the BUILT Responsive-Visibility ext + `labelCollapse`; tri-state = optional upgrade (FR-36-24) |
| h | Extra competitive features + Opps 1–3 | Phase 3 (follow-on) |

## 13. Sources
Phase-1 research + QC council + adversarial council + gap-analysis (3 graders, B ~3.9)
(`.claude/reports/2026-07-18-P2.5-*`). Live-code checks: `class-sgs-nav-menu-source.php`, `adaptive-nav/render.php`,
`header-behaviours/view.js`, `labelCollapse` (button/business-info — BUILT), `ResponsiveTriStateControl`
(docs-only — unbuilt), sgs-blocks CLAUDE.md (`sgs/cart`, D270, TypographyControls R-22-13, Responsive-Visibility
ext). Primary a11y: W3C APG, WCAG 2.1/2.2, MDN, Adrian Roselli. UX: NN/g, Baymard, Smashing, IxDF, LogRocket.
Platform: MDN/Chrome (Popover, `<dialog>`, `<details name>` — ⚠ re-verify at build). Internal: Spec 37, 32, 35,
31 §13, 33 Part 2, P2 builder design-gate; D270, D323, D334, D340; seo-schema/seo-technical.
**v2 sources (added 2026-07-19):** the parallel 07-19 P2.5 pieces research + reconciliation + qc-council —
`.claude/reports/2026-07-19-P2.5-pieces-research-cart-search.md`, `-logo-social-businessinfo.md`,
`-phase1-web-ux-nav-research.md`, `-phase5-gate-register.md`, `-phase6-spec-audit-register.md`, and the v2.1
integration driver `-spec36-v2-adversarial-council.md`. WP/Woo: Store API, Mini-Cart block, `core/search`,
`core/site-logo`(`shouldSyncIcon`)/`site-title`/`social-links`, `LocalBusiness` schema. Competitor:
Kadence/Blocksy/Spectra/Bricks header builders. UX: NN/g, Baymard, Algolia. Live-code verified (qc-council
2026-07-19): `class-sgs-nav-menu-source.php:44`, `button`/`business-info` `labelCollapse`,
`extensions/responsive-visibility.js` + `includes/device-visibility.php`, `cart/render.php:203` + `view.js:113`,
`header-behaviours/view.js:70` + `css:118`. **Fact-check correction:** `class-product-templates-cpt.php:70` sets
`show_in_nav_menus` to FALSE — it is NOT proof the mechanism works; `show_in_nav_menus:true` is to be proven by
spike (§8 build notes), not this citation.
