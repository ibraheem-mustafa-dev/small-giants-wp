---
doc_type: spec
spec_id: 36
spec_version: 2.2
status: SIGNED-OFF (v2.2, design-council repairs 2026-09-09 — six repairs applied with no FR renumbering: the late-CSS A/B defined with a procedure + pass condition (§8); the Indus gate-2 TBD restructured to derive N from the draft at gate time (§8); a Bean's-eye pre-check rubric added under R-31-13, which it does NOT weaken (§8); the §1 Site-Info/logo defect RESOLVED as FR-36-22's first MUST (owner option A — Site Info as a middle resolution tier); FR-36-9's inverted hide-on-scroll dependency corrected and closed-by-design; a `Spec maturity: OUTLINE|DISPATCHABLE` field added to the six §4 FRs plus an index (spec readiness, explicitly NOT build status). Plus: every line-form code citation converted to symbol form, eight of them stale; `ResponsiveTriStateControl` mount count corrected 3→4 in three places; and the drawer-modality decision recorded as APPROVED-NOT-BUILT (non-modal `.show()` + z-index, header above panel; `aria-modal="true"` banned), with the consequent accuracy edits to FR-36-10 and FR-36-13. v2.1, Bean sign-off 2026-07-19 — the SINGLE canonical nav home; Phase 6 spec-purge + build-planning now unblocked). Council-driven integration 2026-07-19 — 7-persona adversarial council + fact-check: the former appended "PART TWO / §14–17" is now INTEGRATED into the body (utility pieces → §4 as FR-36-19..23; per-device → beside FR-36-8 as FR-36-24; structured-data-once → §11 as FR-36-25; the §16 fold-in sharpenings merged into the FRs they amend; the §17 build-checklist folded into §8). Applied: phasing of the pieces, honest build-vs-extend labels, the §1↔pieces ownership fix, the FR-36-24 ownership split + lint gate, and the fact-check fixes. Owner rulings applied: FR-36-15 stays HIGH-LEVEL (no converter sub-design, not a Phase-1 blocker); over-engineered failure states removed (kept only mega-`object_id` resolution + the non-deletable drawer close); Nav Health stays Phase 3. Lineage: v2.0 added the utility pieces; v1.3 folded the gap-analysis (3 graders, B ~3.9) + Bean's decisions (classic WP menus PRIMARY / block menus → extras; bottom-tab-bar optional mobile mode; reuse the BUILT Responsive-Visibility extension; labelCollapse is BUILT). Passed QC council + adversarial council + gap-analysis. Bean signed off 2026-07-19; Phase 6 (spec purge) + build-planning next.)
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
**⚠ Defect inherited with it — RESOLVED, see FR-36-22's first MUST.** Site Info does **not** feed
`sgs/responsive-logo`: the block reads WP's native Customiser setting at
`plugins/sgs-blocks/src/blocks/responsive-logo/render.php::$sgs_site_logo_id` (`get_theme_mod( 'custom_logo', 0 )`), so the logo resolves
from a different source than contact/social. The owner's resolution (2026-09-09) is **option A — Site Info
becomes a middle tier in the logo resolution chain**, specified as FR-36-22's first MUST. Do not re-open it
here.

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

### 1b. FR INDEX — read this before scanning the document

**FR numbers record WHEN a requirement was added, not where it sits.** FR-36-27 falls between FR-36-6 and
FR-36-7; FR-36-24 between FR-36-8 and FR-36-9; FR-36-19…26 are grouped in §4. ⛔ **Do NOT renumber to fix
this** — measured 2026-09-09: **1,530 `FR-36-*` citations across 164 files**, including live PHP/JS comments,
where a wrong rewrite would silently mis-document production code. Use this index instead.

⛔ **No status column, deliberately.** Live build status single-sources to **`.claude/LEDGER.md`**. A status
column here would drift — that is exactly what happened to the deleted §6a/§8a (three false claims, one
carrying a fake "verified" badge).

| FR | § | Topic |
|---|---|---|
| FR-36-1 | 2 | Menu data = native WP menus (classic primary) |
| FR-36-2 | 2 | Block + CPT + plumbing roster |
| FR-36-3 | 2 | CPT model consistent with P2 |
| FR-36-4 | 3 | Desktop disclosure — dropdown + mega, hover-intent + close-grace |
| FR-36-5 | 3 | The mega CPT + native-menu association |
| **FR-36-6** | 3 | **The drawer — chrome top row + one InnerBlocks body (D1009)** |
| FR-36-27 | 3 | Burger trigger presentation |
| FR-36-7 | 3 | Shared nav plumbing utility |
| FR-36-8 | 3 | Responsive collapse — three modes + per-device visibility |
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
| FR-36-14 | 6 | Control-completeness (Spec 35 Part L) |
| FR-36-16 | 8 | Acceptance — reproduce both menus + regression gate |
| FR-36-18 | 8 | Cutover for live production instances |
| FR-36-15 | 9 | Converter-emittability |
| FR-36-17 | 11 | Crawlable, schema-friendly, fast |
| FR-36-25 | 11 | Structured-data-once |

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
| `sgs/nav-drawer` | block (dynamic) | The off-canvas **container** the burger opens. A chrome top row (× close, optional logo, optional heading/label/text/button slot) above ONE InnerBlocks body seeded with `sgs/nav-menu`. A full-screen **modal** `<dialog showModal>` (top-layer → survives a transformed header ancestor). No child blocks; no header-row import (FR-36-6, D1009). |
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
click/Enter/Space; a hover BRIDGE with a close-grace delay (**default 170 ms**, operator attribute
`submenuCloseGrace` — `plugins/sgs-blocks/src/blocks/nav-menu/render.php::submenuCloseGrace`, read into the
renderer's `close_grace` default). ⚠ **Safe-triangle
geometry SHIPS, layered in front of the close-grace bridge — corrected 2026-09-09.** Both mechanisms are
built: `plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js::isHeadingIntoOpenPanel` tests the pointer against the open panel's top-left and
top-right corners via `::pointInTriangle`/`::triangleSign`, and `::scheduleIntentOpen` defers the open while
that test holds, re-polling every `TRIANGLE_RECHECK_MS`; when the geometry is unavailable it falls through to
the 170 ms bridge, which is the deterministic fallback. Verify rather than trusting this line:
`grep -n "pointInTriangle\|isHeadingIntoOpenPanel\|scheduleIntentOpen" plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js`
(5 symbols). ⛔ **This paragraph previously asserted the opposite** — "true safe-triangle geometry is DEFERRED
(STOP-29) … do not restate 'safe-triangle ships' anywhere" — introduced by `4533682c1` on 2026-09-09 in a
commit titled "correct false claims". It was a confident negative written with no command beside it, which is
exactly what the CITE-SYMBOL rule bans; a builder following it would have rebuilt the triangle or deleted the
working one. The timing constants apply to the hover path only; WCAG 1.4.13
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

⛔ **Panel locking contract — `templateLock:false` + `allowedBlocks`, NEVER `contentOnly` (D379).** Relocated
here 2026-09-09 from the deleted §8a, where a live client-facing contract was filed as a "build note".
`contentOnly` HID child settings, so a client could not edit the icon-list link lists — a blocking defect
caught by a QC council. The panel lets the client add / remove / reorder 1-3 `mega-group`/`mega-aside`
columns; each child block is internally `templateLock:'all'` (fixed shape, editable settings). See D379.

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
**ONE block, ONE InnerBlocks region, NO child blocks — design-gate closed 2026-09-08 (D1009).** The drawer is
`sgs/nav-drawer` and nothing else. Rationale + the 5-seat council that produced it: D1009.

⛔ **Terminology, because two similar phrases mean opposite things.** The gate rejected a **"CPT-NATIVE
no-wrapper" model** — deleting the `sgs/nav-drawer` block entirely and making the drawer post's content a bare
list of top-level blocks with settings in post meta. It did **NOT** reject, and does not affect, the SHIPPED
design in which **the drawer block LIVES INSIDE the `sgs_drawer` CPT as that post's content** (2026-07-29 gate,
built W2-a — see below at "THE ARCHITECTURE DECISION IS MADE", which remains fully in force). "CPT-native" =
no block. "In a CPT" = block intact, hosted. Do not read one as the other.

**Structure = a CHROME TOP ROW + one editable body.**

**1. The chrome top row** — rendered by render.php OUTSIDE the editable InnerBlocks. It is the *close button's*
band; everything else in it is optional. Three elements, all attribute-driven (NOT blocks, NOT InnerBlocks):
- **The × close** — always rendered. Position top-**right** default, switchable top-left. Icon selectable from
  ALL FOUR IconPicker sources (`lucide` / `wp-icon` / `dashicon` / `emoji`), the picker seeded to close-related
  names; gradient routed per-source by `sgs_icon_gradient_css()` (never restrict the source enum — see D1009).
  Own size control. Colour/hover/gradient via the existing `toggleCloseColour*` set.
  ⚠ **`closeStyle` MUST MIGRATE from string to a per-device tier object** `{desktop,tablet,mobile}` —
  studionamma swaps text→icon at 400px and a flat string cannot express it. **It ships today as a flat
  `"type": "string"` enum** (`plugins/sgs-blocks/src/blocks/nav-drawer/block.json::attributes.closeStyle`, driven by the flat
  `ToggleGroupControl` bound to `closeStyle` in `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js::Edit`), so
  this is a MIGRATION with a coercion hazard, not a new attribute: an object-typed attr receiving a stored flat
  string coerces to the schema default silently (see the `object-typed-attr-coerces-flat-to-default` and
  `blockjson-enum-coerces-invalid-to-default` lessons). Ship the migration and the fallthrough check together.
  ⚠ **A FIFTH icon source exists and is undeclared:** `edit.js` imports `close` from `@wordpress/icons` for the
  canvas preview, while `plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$sgs_nd_close_inner` hardcodes `sgs_get_lucide_icon( 'x' )`
  in its `else` branch. Neither is picker-driven today.
  Resolve both to the same picker-driven source, or the canvas and the frontend show different icons.
- **An optional logo** — show/hide, responsive per device.
  ⚠ **Precedent, corrected 2026-09-09:** use the per-tier scalar pattern `sgs/responsive-logo` actually uses
  (`plugins/sgs-blocks/src/blocks/responsive-logo/block.json::attributes.logoId` / `.logoUrl`, plus their `…Tablet` / `…Mobile` siblings).
  Its own block.json states
  the reason: `supports.sgs.imageControls` (the universal image extension) "was removed 2026-08-11 (Spec 35
  capability-routing doctrine) **as dead** — the block's own per-device `logoId*`/`logoUrl*` art-direction
  tiers are its real media mechanism" (`plugins/sgs-blocks/src/blocks/responsive-logo/block.json::supports.sgs.elements.wrapper._note`).
  A logo is art-direction per device,
  not one image with controls, which is why the generic path did not fit it.
  **The media-atoms family is real and shared** — `src/components/media/atoms/registry.js` is imported by
  `blocks/extensions/media-elements.js` and `blocks/media/edit.js`, with PHP twins under
  `includes/media/atoms/` used by `sgs/hero` and `sgs/brand-strip`. It is simply not the LOGO pattern. Two
  earlier revisions of this FR were wrong here: the first pointed at the atoms folder as the logo precedent;
  the second claimed "only `sgs/media` imports it", which is false.
- **An optional free slot** — ONE of heading / label / text / button. Button styling via the shared
  `sgs_button_element_style_css()` with its own prefix (precedent: `sgs/modal`, `sgs/product-card`); heading
  level switchable per `product-card`'s `headingLevel` (`css_property: tag`). This exists because two
  references put a non-logo item in the close row — lamalama's "YOU MADE IT" label and studionamma's
  "LET'S TALK!" CTA. Verified against the extraction data: 4 of the 7 close-bearing references are logo+close
  only, so the slot is genuinely optional, not a layout system.
- The row itself carries background / padding / height controls.
  ⚠ **The row is NET-NEW markup.** No row node exists today — the × is a bare sibling `<button>` inside the
  `<dialog>` (built as `plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$close_html`, printed as the second argument of the final
  `<dialog>` `printf`), absolutely positioned by `plugins/sgs-blocks/src/blocks/nav-drawer/style.css::.sgs-nav-drawer__close`. A row element
  must be BUILT before it can be styled, and the hardcoded `padding-top:64px` in
  `plugins/sgs-blocks/src/blocks/nav-drawer/style.css::.sgs-nav-drawer__body` (which reserves space for the
  floating ×) is DELETED as part of that work — the row occupies that space legitimately instead.

⛔ **THE CHROME ROW REPLACES THE SEEDED BLOCKS — it does not sit above them.** `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js::TEMPLATE`
currently seeds
`TEMPLATE = [ sgs/nav-menu, sgs/responsive-logo, sgs/button ]`. When the chrome row lands, **`sgs/responsive-logo`
and `sgs/button` are REMOVED from that template** — their roles become the row's logo element and free slot.
Leaving them produces a drawer with two logos and two CTAs, one of each in chrome and one still droppable in
the body. **Done-check (a build passing every other gate can still fail this one):** after the change,
`edit.js`'s `TEMPLATE` contains `sgs/nav-menu` ONLY, and the logo / free-slot markup appears in `render.php`'s
printed chrome, never inside `useInnerBlocksProps` output. Assert both; no existing gate covers this.

**2. The body** — the single InnerBlocks region, `templateLock:false` (client patterns may use `contentOnly`).
Ships `sgs/nav-menu` with the primary menu preselected on every new drawer. Everything beyond that is ordinary
blocks — `sgs/container` rows exactly as on a normal page (Bean's standing position (A)). There is NO
`allowedBlocks` restriction and none is to be added.

**Full-screen native `<dialog>`** (Bean default): focus contained; background `inert`; mandatory Escape;
rely on native `<dialog>` semantics — ⛔ never add `role="dialog"` (implicit) or `aria-modal` (see the
Modality section below, where the prohibition on `aria-modal="true"` is binding). **As built today** it opens
with `showModal()`, giving top-layer promotion (which survives a transformed header ancestor) and a
`::backdrop` scrim. **That is the current implementation, not the contract** — see Modality below for the
approved move to `.show()`, under which neither the top layer nor `::backdrop` is available and the
transform-ancestor escape is carried by D323's body-reparent instead.

⛔ **Close is CHROME, not content — and the guarantee is stated HONESTLY here (amended 2026-09-08, D1009).**
The × is rendered by render.php as fixed dialog chrome OUTSIDE the editable InnerBlocks, so an operator editing
the drawer's content can never delete the last close affordance through the block editor. This matters because
on a full-screen modal on TOUCH there is no ESC key and no tap-outside-the-panel (the panel fills the screen),
so the × is the only reliable close — it must always render. **What "by construction" does and does not mean:**
because the × is a raw PHP string that never enters the parsed block tree, there is nothing in `post_content`
to delete — this is strictly stronger than a `templateLock`/`lock:{remove}` flag, which WordPress enforces in
the editor JS ONLY and which a Code-Editor or REST write bypasses entirely. **Any future design that moves the ×
inside a block — including a child block of the drawer — downgrades this to "cannot be removed via the toolbar
or List View" and MUST amend this clause rather than inherit its wording.** Structure beyond the × (the body's
required `sgs/nav-menu` seed) is enforced at the CPT layer server-side (`save_post`/`wp_insert_post_data`
re-injection), not by a block lock, for the same reason.

**Menu source:** its own picker (FR-36-1; defaults to
inherit-from-bar); the inspector shows *which menu is bound* (bar vs drawer). **Geometry:** per-device `anchor`
(`full-screen` | `header` | `trigger` | `centred`) + `panelSize` — ⚠ these SUPERSEDED the retired `edge`/`width`
scalars in the 2026-07-28 desktop-variant migration; the old names are gone from block.json and must not be
cited.

#### Modality — MOVE TO NON-MODAL. Approved 2026-09-09, NOT YET BUILT.

**Status:** `APPROVED — NOT BUILT`. Owner-approved direction, ~3h of work, not scheduled here. Live build
status single-sources to `.claude/LEDGER.md`.

**The direction.** The drawer moves from `showModal()` to **`.show()` plus an explicit z-index scale that
puts the header ABOVE the drawer panel**, with author-managed background inertness (the `inert` attribute,
focus containment, Escape and focus-return all kept exactly as they are today). The `.show()` code path
already exists as a browser-support fallback in `src/shared/nav-interactivity/store.js` (search
`grep -n "drawer.show()" plugins/sgs-blocks/src/shared/nav-interactivity/store.js`); this promotes it from a
fallback to the primary path and exposes the choice as an operator control.

**Why — measured, not preferred.** Live DOM measurement of 15 top-tier reference sites:

| Finding | Count |
|---|---|
| Keep the nav trigger VISIBLE and TOPMOST while the drawer is open | **14 of 15** |
| Use the SAME element to open and to close | 12 of 15 |
| Of the 7 primary references, cover the full viewport | 5 of 7 |
| Of the 7 primary references, lift the header above the panel BY Z-INDEX — i.e. none is a top-layer dialog | **7 of 7** |

The single exception that hides its trigger (basicagency) is also the only reference forced to build a
separate in-drawer close control — **which is exactly the cost this framework pays today.**

**Why `showModal()` structurally blocks it.** A `showModal()` dialog is promoted to the browser's top layer,
and **nothing can be painted above a top-layer element by z-index** — the manoeuvre all seven references use
is unavailable for as long as `showModal()` is in the code path. This is not a styling preference that could
be worked around; it is a property of the top layer.

⛔ **`aria-modal="true"` must NOT be added — this is binding, not advisory.** It instructs assistive
technology to ignore everything outside the dialog. Under the non-modal design the burger is *deliberately*
left live and reachable, so `aria-modal="true"` would hide from screen-reader users the exact affordance the
change exists to create — destroying the benefit while looking like a correctness fix. The drawer's root
stays a native `<dialog>` and keeps its implicit `role="dialog"`; inertness is managed by the author, on the
background, not declared on the dialog.

**Two accuracy consequences elsewhere in this spec, already applied:** FR-36-10's dialog side no longer names
`showModal()` as the contract, and FR-36-13's `<dialog>` exception no longer rests its justification on
top-layer promotion or `::backdrop`. See both.

⛔ **The "Show header" toggle described in earlier revisions of this FR was NEVER BUILT and is now WITHDRAWN**
(2026-09-08). No `showHeader`/`headerRows` attribute or markup has ever existed in block.json, edit.js or
render.php. It was the likely source of the long-standing "the drawer has no top row" confusion — the spec
described a feature that would have produced that look, and nobody had checked it was absent. The chrome top
row above replaces it. Header rows are NOT imported into the drawer in any form. **Submenu — BUILT** (this
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
fallback IS the accordion — proven, not just declared.
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


> **Relocated 2026-09-09.** The block below sat under FR-36-27 (burger trigger) but is drawer content —
> its own closing line said so ("an editor-UX correction inside FR-36-6's existing scope"). Moved here
> intact; no FR-ID changed, so no external citation breaks.

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
  `plugins/sgs-blocks/src/blocks/button/edit.js::labelCollapse`, `plugins/sgs-blocks/src/blocks/business-info/edit.js::labelCollapse`). Full reasoning: Spec 37 §3.8. The per-device cascade this
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

**Named upgrade:** the `ResponsiveTriStateControl` (on/off/inherit per tier, P2 §4.1) is **BUILT** —
exported from `src/components` and mounted **FOUR** times inside `plugins/sgs-blocks/src/blocks/site-header/edit.js::Edit`. Verify with
`grep -n "<ResponsiveTriStateControl" plugins/sgs-blocks/src/blocks/site-header/edit.js` — it returns FIVE
hits, of which four are JSX mounts and the fifth is the name appearing in prose inside a code comment (that
comment itself says "its four siblings", corroborating the count). ⚠ **An earlier revision of this line said
"mounted three times", undercounting by one.** Five gate
scripts reference it (incl. `scripts/inspector-scan/rules/25-no-own-device-switcher.js`). It is the richer
form of (a)/(b). ⚠ **Corrected 2026-09-09** — this line previously read "DESIGNED-NOT-BUILT (verified: 0 in
`src/`)", a false claim carrying a fake verification badge, while FR-36-8 fifteen lines above already said
BUILT. Adopt this control; never invent a parallel per-tier switcher (R-31-9).

**Menu case (the one-menu-source default):** the bar and the drawer DEFAULT to ONE shared menu (the drawer's
`sgs/nav-menu` inherits-from-bar — no drift, faithful clone), with a deliberate per-device override available
(a different mobile menu). This per-device-content capability IS the override, so FR-36-1's "may use different
menus" is an explicit opt-in, not the default.

### FR-36-9 — Nav → header decoupling (one-directional)
The header knows nothing about the nav; coupling is nav → header only, via the header's **real published
surface (verified in live code):** `--sgs-header-height` (a `:root`/`body` CSS var from a ResizeObserver,
`plugins/sgs-blocks/src/header-behaviours/view.js::publishHeight`) + the state classes **`is-header-scrolled` / `is-header-shrunk`**
(toggled in `plugins/sgs-blocks/src/header-behaviours/view.js::initScrollBehaviours`; there is NO `data-sgs-header-state` attribute —
a richer signal would be NEW Spec 37 work). A partial-width drawer binds `top`/`max-height` to
`--sgs-header-height`.

**Tracked dependency — "header hidden on scroll → drawer full height".**

| Field | Value |
|---|---|
| **Status** | `CLOSED BY DESIGN` for the default drawer · `OPEN (blocked on a published signal)` for a partial-width drawer |
| **Depends on** | A *hidden*-state signal published from the header to the nav |
| **Blocking?** | No. Nothing in Phase 1 or Phase 2 waits on it |

⛔ **Hide-on-scroll itself is BUILT — the earlier wording ("needs the unbuilt hide-on-scroll feature") was
INVERTED.** It is wired end to end: `plugins/sgs-blocks/src/blocks/site-header/block.json::attributes.headerHideOnScroll` →
`plugins/sgs-blocks/src/blocks/site-header/render.php::$sh_hide` → per-tier resolution and the row-state toggle in
`plugins/sgs-blocks/src/header-behaviours/view.js::initRowBehaviours` / `::setRowCollapsed` → the state rule
`plugins/sgs-blocks/assets/css/header-behaviours.css::.sgs-row-behaviour[data-sgs-row-hide-on-scroll].is-row-hidden`. Verify
rather than trusting this line:
`grep -rn "headerHideOnScroll\|is-row-hidden" plugins/sgs-blocks/src/blocks/site-header plugins/sgs-blocks/src/header-behaviours plugins/sgs-blocks/assets/css/header-behaviours.css`.
The deleted §8a had already retracted the "unbuilt" claim; FR-36-9 was simply never updated to match, which
is how a false dependency survived ~570 lines below its own retraction.

**The genuine residual, stated precisely.** What the header publishes is a HEIGHT
(`--sgs-header-height`) plus the scroll-state classes `is-header-scrolled` / `is-header-shrunk`. It publishes
no *hidden*-state signal the nav can read — `is-row-hidden` lands on the individual ROW element, not on a
document-level surface a `<dialog>` in the top layer could key off. So a drawer cannot currently know the
header is hidden and reclaim its space.

**This is moot in the common case and is recorded as closed-by-design there.** The default drawer is
full-viewport (FR-36-6), so it already occupies the header's space whether the header is hidden or not — there
is nothing to reclaim and no signal is needed. The residual applies ONLY to a partial-width drawer anchored
below the header (the `header` anchor). If and when that combination is built against a hide-on-scroll header,
a published hidden-state signal is owed from Spec 37 first; do not work around it on the nav side by reading
the header's DOM.

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
`sgs-nav-drawer` on BOTH sides (`plugins/sgs-blocks/src/blocks/nav-menu/render.php::$drawer_ref`, `plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$drawer_ref`), so the editor
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

#### Spec maturity index — read this before dispatching any §4 FR

The six FRs in this section sit at **wildly uneven maturity** and nothing else in the document signals it.
FR-36-26 is a dispatchable sub-spec (frozen attribute table, named sequential dispatches, definition of done,
converter contract); the other five are one page of intent each. A reader who assumes they are peers will
hand an OUTLINE FR to a builder and get five different implementations.

⛔ **`Spec maturity` is NOT build status, and this index is NOT the deleted §6a/§8a returning.** It answers
exactly one question: **"can this FR be handed to a builder AS WRITTEN, without a design pass first?"** That
is a property of *this document's own text*, which is why it belongs here — it changes when the spec is
edited, never when code ships. Live build status single-sources to **`.claude/LEDGER.md`** (§1b). Do not merge
the two, and do not delete this field as a status column.

| FR | Piece | Spec maturity | Owed before it can be dispatched |
|---|---|---|---|
| FR-36-19 | Cart | `OUTLINE` | A frozen attribute table for `displayMode` and the mini-cart panel; the Store-API call surface (endpoints, error + empty states); which of MUST/SHOULD/NICE is in scope for the dispatch |
| FR-36-20 | Search | `OUTLINE` | A frozen attribute table for `displayMode`; the debounce/cap values as attributes not prose; the result-source wiring (Store API vs post query) and how the three display modes share ONE combobox instance |
| FR-36-21 | Social icons | `OUTLINE` | The platform set as data (DB-first, R-31-1) not a hardcoded list; the accessible-name generation rule as a named helper; the custom-SVG upload + sanitisation path |
| FR-36-22 | Logo | `OUTLINE` | The resolution chain above is frozen and dispatchable on its own; the REST of the FR is not — the lockup / favicon-sync / variant attrs need a frozen table before the Phase-3 half can be dispatched |
| FR-36-23 | Business info | `OUTLINE` | The `sgs_site_info` field roster + its sanitisers as a frozen table; the open/closed-state computation rule; the `labelCollapse` reuse points named per element |
| FR-36-26 | Link lists | `DISPATCHABLE` | Nothing — FR-36-26c freezes the attribute table, names two sequential dispatches with their file lists, and states a definition of done and the live verification owed |

**Rule when adding a §4 FR:** it starts at `OUTLINE` and carries its own "owed before dispatch" row. It moves
to `DISPATCHABLE` only when a frozen attribute table, a named dispatch shape and a definition of done all
exist in its own text. Promoting it on confidence rather than on those three artefacts is what this index is
here to prevent.

### FR-36-19 — Cart (`sgs/cart`, extend) — full WooCommerce header cart
**Spec maturity: `OUTLINE`** — needs a frozen attribute table + the Store-API call surface before dispatch (§4 index).

**Honest status + phasing:** the current `sgs/cart` render.php is a **badge + link only** — the mini-cart
preview/flyout/drawer is **UNBUILT** (its own block.json marks it "Phase 2"). So this is a **substantial BUILD
on the existing badge shell**, NOT "~90% ready". **The Phase-1 badge fix is DONE** — the badge node carries
`role="status" aria-live="polite" aria-atomic="true"` on the `.sgs-cart__badge` span emitted by
`cart/render.php` (`grep -n 'role="status"' plugins/sgs-blocks/src/blocks/cart/render.php`), so it announces
the whole "N items" string (WCAG 4.1.3). ⚠ **Corrected 2026-09-09** — this line previously described the
missing `role="status"` as "the one verified gap" at a line number; both the gap and the line number were
stale. **The mini-cart itself remains the Phase 2 build.**
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
**Spec maturity: `OUTLINE`** — needs a frozen `displayMode` table + the result-source wiring before dispatch (§4 index).

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
**Spec maturity: `OUTLINE`** — needs the platform set as DB data + the name-generation helper named before dispatch (§4 index).

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
**Spec maturity: `OUTLINE`** — the resolution chain below is frozen and dispatchable on its own; the Phase-3
lockup / favicon / variant half needs a frozen attribute table first (§4 index).

**Phasing: basics = Phase 1** (left-aligned default, link-to-home, per-device image, functional alt — the logo
appears in Mama's header + the drawer default template). **lockup + favicon-sync + transparent/dark variants =
Phase 3.** **Extend** `sgs/responsive-logo`.
- **MUST — the logo resolution chain (owner decision 2026-09-09, option A; closes the §1 defect).** The logo
  resolves through THREE tiers, first non-empty wins, evaluated per device tier:

  | Order | Source | Where it lives |
  |---|---|---|
  | 1 | The block's own per-device art-direction attrs | `plugins/sgs-blocks/src/blocks/responsive-logo/block.json::attributes.logoId` / `.logoUrl` (+ `…Tablet` / `…Mobile`) |
  | 2 | **Site Info** — a NEW `logo` key in the `sgs_site_info` option store | `sgs_site_info` (this spec's store, §1) |
  | 3 | WP's Customiser site logo | `plugins/sgs-blocks/src/blocks/responsive-logo/render.php::$sgs_site_logo_id` (`get_theme_mod( 'custom_logo', 0 )`) |
  | 4 | Nothing — render no logo element at all | — |

  **Backwards-compatible by construction:** tier 2 is inserted BETWEEN two existing tiers, so a site that has
  never set a Site Info logo resolves exactly as it does today. ⚠ **Tier 2 is NET-NEW BUILD, not a read of an
  existing field.** Today the Site Info admin's Identity section only *previews* the Customiser logo and
  deep-links to the Site Editor (`plugins/sgs-blocks/includes/class-sgs-site-info-admin-fields.php::render_identity_section`) — it stores
  nothing. The `logo` key, its media control, its sanitisation and its reserved-key registration are all part
  of this MUST. **Done when:** setting a Site Info logo with no block-level `logoId` renders that logo, and
  clearing it falls through to the Customiser logo — both live-verified, not asserted.
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
**Spec maturity: `OUTLINE`** — needs the `sgs_site_info` field roster + sanitisers as a frozen table before dispatch (§4 index).

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
**Spec maturity: `DISPATCHABLE`** — FR-36-26c freezes the attribute table, the two sequential dispatches with
their file lists, the definition of done and the live verification owed (§4 index).

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
   `plugins/sgs-blocks/src/blocks/nav-menu/view.js::markCurrentPage` already does this and documents why: LiteSpeed (this stack's confirmed
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
`role="menu"/"menubar"`. Drawer = **DIALOG** — a native `<dialog>`, modal-in-BEHAVIOUR via either
`showModal()` or `.show()` + author-managed inertness. **The contract is the disclosure-vs-dialog binary, not
the API call.** A `.show()` drawer that inerts the background, moves focus in, closes on Escape and returns
focus to its trigger is fully on the DIALOG side of this gate; `showModal()` is one implementation of that
contract, and per FR-36-6's approved modality direction it is not the one the drawer is moving to. ⛔ Do not
add `aria-modal="true"` under either — see FR-36-6. Mega = a bigger
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
Bean-approved; built + live 2026-07-20). The drawer's root element must BE the `<dialog>`.

⚠ **The reasoning below was REWRITTEN 2026-09-09 and the exception still holds — do not delete it as
unsupported.** It previously rested on three things `<dialog>` provides: `showModal()`, top-layer promotion,
and the `::backdrop` pseudo-element. Under FR-36-6's approved non-modal direction two of those three no
longer apply (there is no top-layer promotion under `.show()`, and `::backdrop` does not render for a
non-modal dialog). **What survives is sufficient on its own and is modality-independent:**

1. **The UA open/close mechanism.** `<dialog>` is the element that carries the `open` state, the `.show()` /
   `.close()` API, the `close`/`cancel` events, and the UA's own `dialog:not([open]){display:none}` rule. No
   other element provides this without hand-rolled JS.
2. **The implicit `role="dialog"`.** The semantics come from the element, with no ARIA to keep in sync.

Both hold identically under `showModal()` and `.show()`, so the exception is not contingent on the modality
decision. `SGS_Container_Wrapper` emits its own `<div>` as the block root, so hosting the drawer in it would either
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

## 6a. Build-order note

⛔ **Live per-FR build status is NOT tracked here.** It single-sources to **`.claude/LEDGER.md`**.
Per-FR evidence archive: `.claude/reports/2026-07-22-spec36-completion-audit.md`.

⚠ **A status table stood here until 2026-09-09 and was DELETED.** An adversarial council found it
carried false claims — including `ResponsiveTriStateControl` marked "DESIGNED-NOT-BUILT (verified: 0
in `src/`)" while it was imported and mounted FOUR times in `plugins/sgs-blocks/src/blocks/site-header/edit.js::Edit`. A status table
inside a requirements doc drifts against the code and, worse, wears a verification badge that stops
the next reader checking. Do not reinstate one.

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
  its real menu position** (not last). The framework supports **5 mega layout templates**.

  ⛔ **The mega COUNT is derived at gate time, never pre-known.** A criterion that names a number the spec
  does not know can be neither passed nor failed — the previous wording ("TBD via the named arbitration
  step") was exactly that, and no such step is defined anywhere in this repo
  (`grep -rn "arbitration step" .claude --include=*.md` returns this line and two grader reports that credit
  it into existence, nothing more). The criterion is therefore restated so it does not depend on a number:

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
  below)**; real desktop
  scrollbar; **a `prefers-reduced-motion` + `forced-colors` emulated-media sweep** (borders/focus rings survive;
  motion suppressed); **the `<details>` no-JS drawer + no-JS bar links** assertion; **the crawl assertion**
  (every bar+dropdown+mega link AND mega content in the pre-JS HTML); **mega renders at real position N, not
  last**; **the integrity sweep** (FR-36-9a); **`wp-perf-gate`** (no-CLS + budget; JS <50 KB / CSS <100 KB);
  RTL/logical properties; + Bean's cropped screenshot pair.

**The late-CSS A/B — what it is, how to run it, what passes.** *(Defined here 2026-09-09. The phrase had
stood in the bullet above as a bare name since it was absorbed from Spec 34; its intent is recovered from
`.claude/plans/archive/2026-07-15-spec34-build-plan.md` — "the late-CSS A/B (block stylesheet disabled →
restored) produces IDENTICAL open-drawer geometry — the 'random widths' class is dead" — and
`.claude/reports/2026-07-18-P2.5-qc-consistency-upgrades.md` §F3.)*

**What it asserts.** The open drawer's GEOMETRY comes from the block's own scoped `<style>`, not from an
external stylesheet that may arrive late, be deferred, be combined, or be optimised away by LiteSpeed. A
drawer whose width or position depends on a late-arriving sheet renders at the wrong size for the interval
before that sheet lands — the "random widths" defect class this check exists to kill.

**Procedure — one page, two runs, drawer OPEN in both, at 375 / 768 / 1440.**

| Run | Setup |
|---|---|
| **A — normal load** | The page as a visitor gets it. Open the drawer. Measure. |
| **B — all external CSS blocked** | Block every external stylesheet request before navigation (Playwright: route-abort every `stylesheet` resource type). The block's own inline scoped `<style>` is emitted by render.php inside the document and is NOT an external request, so it survives. Open the drawer. Measure. |

**Measured in both runs, at each of the three widths:** `getBoundingClientRect()` on (1) the `<dialog>`
itself, (2) the close control (`plugins/sgs-blocks/src/blocks/nav-drawer/render.php::$close_html` → `.sgs-nav-drawer__close`), and (3) the
first nav link inside the drawer.

**PASS =** every measured rect matches between A and B within **±1px** on all four edges, at all three
widths, **AND** the drawer is still dismissible in run B (× click closes it; Escape closes it; focus returns
to the burger).

⚠ **Colour, typography, spacing-from-theme-tokens and background differences between A and B are EXPECTED
and are NOT a failure.** Run B deliberately strips the theme and global stylesheets, so run B will look
wrong. This check asserts **geometry and dismissibility only** — nothing else. Do not report a B-run visual
diff as a defect of this gate.

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

### The Bean's-eye pre-check rubric (R-31-13 — makes the veto PREDICTABLE, never weaker)

R-31-13 stands unchanged: the owner's visual sign-off is co-authoritative, the numbers alone never close a
gate, and the eye may reject on any ground it likes. **The problem this rubric solves is not authority, it is
predictability.** At D411 the mechanical half passed 21/21 sweep cells and the eye returned *"night and
day"* / *"all of these clone attempts need huge fixes"* — every ground it rejected on was outside what the
mechanical half measured. Presenting again without having answered those grounds spends the veto on things
the builder could have checked first.

**Self-check before presenting. Answer every row with evidence, not intent.** Grounds 1–5 are the exact
grounds D411 rejected on (`.claude/reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md` §D3); 6–7 are
the two defects the same report proved live (§D1, §D2).

| # | Ground | Answer it with |
|---|---|---|
| 1 | **Text styling** — family, weight, size, case, tracking, leading | A side-by-side of the draft's computed values against the clone's, on the same painted element |
| 2 | **Surface + borders** — panel background, border lines, dividers, radii, shadow | Computed values, both sides |
| 3 | **Symbols + iconography** — the actual glyphs, not "an icon is present" | The rendered symbols, both sides |
| 4 | **Control treatment** — button fill, shape, size, hover/focus appearance | Computed values in both resting and hover state |
| 5 | **Imagery AND its motion** — every image, and whether it cycles / animates / floats as the reference does. A still image where the reference cycles is a MISS, not a near-miss | A capture of the motion, not a single frame |
| 6 | **Every text element's contrast against its REAL painted background** — not a sample | See false-pass A below |
| 7 | **Does an alignment setting do what its NAME says?** `drawerAlign: 'center'` must visibly centre the menu, not just its sibling boxes | A measured x-position of the nav links, not the presence of the attribute |

**Two named false-pass modes. Both have already shipped a green report on a broken page:**

- **A — a sampled contrast check reports the sample, not the page.** The D411 sweep measured
  `.sgs-nav-menu__link-text` alone and reported a healthy 13.14:1 for `centred-statement`, while that same
  drawer rendered **6 text elements at 1:1 — literally invisible** across 2 variants. **Sweep EVERY text
  node in the surface under test, each against its own real painted background.** A check scoped to one
  selector reports that selector's health and nothing else.
- **B — a capture that never asserted "open" proves nothing.** `shoot-drawer-pairs.mjs` clicked a trigger and
  screenshotted without asserting a panel had opened, so a "6/7 references captured" figure was false — one
  "reference" was a homepage with no menu open. **Assert the open state, then capture.** This is the same
  vacuous-check class as a negative control that never landed.

**Rules of use, so this stays a floor and not a ceiling:**
1. **Presenting with unanswered rows wastes the veto.** The eye is expensive and single-threaded; spending it
   on a ground the builder could have measured is the failure this rubric prevents.
2. **Any NEW ground the eye names is ADDED to this table, never argued with.** The table is a record of what
   has rejected before, not a list of what is allowed to reject. It only ever grows.
3. **A clean rubric is not a pass.** All seven rows answered means the work is ready to be LOOKED AT. R-31-13
   is unchanged: only the eye closes.

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

### 8a. Retired

⚠ **This section held "verified build notes" and was DELETED 2026-09-09** after an adversarial council
found that two of its eight bullets were not merely stale but INVERTED — they told a future builder to
construct things that already existed:

- It described `SGS_Nav_Menu_Source::NAV_BLOCK_NAMES` as a hardcoded const needing a DB-first refactor.
  It is already a filtered method pruned against the live block registry
  (`plugins/sgs-blocks/includes/class-sgs-nav-menu-source.php::get_nav_block_names`), and the method's own docblock records that it was fixed for
  exactly this reason.
- It said no `headerHideOnScroll` attribute existed and wiring it was a future task. It exists
  (`plugins/sgs-blocks/src/blocks/site-header/block.json::attributes.headerHideOnScroll`), is read
  (`plugins/sgs-blocks/src/blocks/site-header/render.php::$sh_hide`) and is wired end-to-end in
  `plugins/sgs-blocks/src/header-behaviours/view.js::initRowBehaviours` / `::setRowCollapsed`, with the state rule at
  `plugins/sgs-blocks/assets/css/header-behaviours.css::.sgs-row-behaviour[data-sgs-row-hide-on-scroll].is-row-hidden`.
  **FR-36-9 carried the same inverted claim ~570 lines above and has now been corrected too** — a retraction
  filed in one section does not repair the section that stated the error.

The section was badged "fact-check-corrected", which made it worse: a reader is told not to re-check.
Its one live contract (mega-panel `templateLock`) moved to **FR-36-5**. Everything else was status
(**`.claude/LEDGER.md`**) or history (**`decisions.md`**). Do not reinstate a build-notes section.

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

**Honest scope of "entered ONCE" for the LOGO.** The logo joins this claim only through FR-36-22's
resolution chain, and only at that chain's tier 2. A logo set in Site Info is entered once and rendered
everywhere; a logo set on an individual `sgs/responsive-logo` instance (tier 1, per-device art direction) is a
deliberate per-placement override and is NOT covered by this claim — that override is the feature, not a leak.
A site that has set neither still resolves from the Customiser (tier 3), which is WP's store, not this one. So
the claim is: **one Site-Info entry is the default source for every placement**, not "the logo can only ever be
entered once".

## 12. Open sub-decisions — RESOLVED (Bean's veto at sign-off)
| # | Question | Resolution |
|---|---|---|
| a | Burger home | On `sgs/nav-menu` (collapsed), opens the drawer via `drawerRef` |
| b | Drawer content / menu | Full modal container; own menu picker (inherit-from-bar default). ⚠ **Amended D1009** — the × close and the optional logo/free-slot are CHROME (attributes), never template blocks; the body seeds `sgs/nav-menu` only. See FR-36-6 |
| c | Collapse modes | Three operator-chosen: burger→drawer, priority+, **bottom-tab-bar**. ⚠ **Re-corrected 2026-09-09** — an earlier same-day edit claimed safe-triangle does not ship. It does: the geometric triangle is layered in front of the 170 ms close-grace bridge, which is the fallback. Both are built. See FR-36-4 for the proving command |
| d | Mega association | **Native menu (Appearance → Menus)** — add the CPT like a page; item carries the post ID (no map/ID); resolved by `object_id`/`get_post()` |
| e | Drawer modality | **Moving to NON-MODAL** — `.show()` + an explicit z-index scale with the header ABOVE the drawer panel, background inertness author-managed. **Status: `APPROVED 2026-09-09 — NOT BUILT`** (~3h). Grounded in live DOM measurement of 15 references: 14/15 keep the trigger visible and topmost, and 7/7 of the full-viewport primaries lift the header by z-index — which `showModal()`'s top-layer promotion makes structurally impossible. ⛔ `aria-modal="true"` must NOT be added; it would hide the deliberately-live burger from assistive tech. ⚠ Also corrected 2026-09-09 — the "Show header" per-row toggle was NEVER BUILT and is WITHDRAWN; header rows are not imported into the drawer in any form. Full record + the measurement table: FR-36-6 |
| f | Menu system | **Classic menus PRIMARY**; block `wp_navigation` → Phase 3 extra (Bean) |
| g | Per-device visibility | Reuse the BUILT Responsive-Visibility ext + `labelCollapse`; tri-state = optional upgrade (FR-36-24) |
| h | Extra competitive features + Opps 1–3 | Phase 3 (follow-on) |

## 13. Sources
Phase-1 research + QC council + adversarial council + gap-analysis (3 graders, B ~3.9)
(`.claude/reports/2026-07-18-P2.5-*`). Live-code checks: `class-sgs-nav-menu-source.php`, `adaptive-nav/render.php`,
`header-behaviours/view.js`, `labelCollapse` (button/business-info — BUILT), `ResponsiveTriStateControl`
(⚠ **corrected 2026-09-09 — this said "docs-only — unbuilt"; it is BUILT and mounted four times, see
FR-36-24.** It was the third surviving instance of the same false claim in this one document), sgs-blocks
CLAUDE.md (`sgs/cart`, D270, TypographyControls R-22-13, Responsive-Visibility
ext). Primary a11y: W3C APG, WCAG 2.1/2.2, MDN, Adrian Roselli. UX: NN/g, Baymard, Smashing, IxDF, LogRocket.
Platform: MDN/Chrome (Popover, `<dialog>`, `<details name>` — ⚠ re-verify at build). Internal: Spec 37, 32, 35,
31 §13, 33 Part 2, P2 builder design-gate; D270, D323, D334, D340; seo-schema/seo-technical.
**v2 sources (added 2026-07-19):** the parallel 07-19 P2.5 pieces research + reconciliation + qc-council —
`.claude/reports/2026-07-19-P2.5-pieces-research-cart-search.md`, `-logo-social-businessinfo.md`,
`-phase1-web-ux-nav-research.md`, `-phase5-gate-register.md`, `-phase6-spec-audit-register.md`, and the v2.1
integration driver `-spec36-v2-adversarial-council.md`. WP/Woo: Store API, Mini-Cart block, `core/search`,
`core/site-logo`(`shouldSyncIcon`)/`site-title`/`social-links`, `LocalBusiness` schema. Competitor:
Kadence/Blocksy/Spectra/Bricks header builders. UX: NN/g, Baymard, Algolia. Live-code verified (qc-council
2026-07-19): `plugins/sgs-blocks/includes/class-sgs-nav-menu-source.php::get_nav_block_names`,
`plugins/sgs-blocks/src/blocks/button/edit.js::labelCollapse` / `plugins/sgs-blocks/src/blocks/business-info/edit.js::labelCollapse`,
`extensions/responsive-visibility.js` + `includes/device-visibility.php`,
`cart/render.php` (the `role="status"` badge) + `plugins/sgs-blocks/src/blocks/cart/view.js::updateCartWidgets`,
`plugins/sgs-blocks/src/header-behaviours/view.js::publishHeight` + `assets/css/header-behaviours.css`.
⚠ **All five citations in this line were re-resolved to symbols 2026-09-09 and four of the old line numbers
were STALE.** The worst paired a `header-behaviours/view.js` line number with a bare "css" line number that
named no file at all — unresolvable as written, yet sitting inside a list headed "Live-code verified".
**Fact-check correction:** `plugins/sgs-blocks/includes/class-product-templates-cpt.php::register_post_type` sets
`show_in_nav_menus` to FALSE — it is NOT proof the mechanism works; `show_in_nav_menus:true` is to be proven by
spike (§8 build notes), not this citation.
