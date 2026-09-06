---
doc_type: plan
plan_type: strategic
project: small-giants-wp
title: SGS Mega-Menu Architectural Foundation
spec: 36-SGS-NAVIGATION-SYSTEM.md (FR-36-2/3/4/5/7/8/10/13/17)
date: 2026-07-24
status: EXECUTED-IN-PART, ARCHIVED 2026-08-22 — the re-scoped core build shipped and Gate 3 closed live (D399/D401, 2026-07-28). The declared follow-ons are still pending, but they are tracked in their own right at parking.md `P-MEGA-FOLLOWON-DEFERRALS` (Status: DEFERRED, verified 2026-08-22), so the work is not lost by archiving the plan. This line previously read "this plan is not archived" while the file sat in archive/ — a contradiction, since the follow-ons' home is parking, not this doc.
owner: framework
---

# Strategic Plan — SGS Mega-Menu Architectural Foundation

> ⚠ **RE-SCOPED 2026-07-24 after a 7-persona adversarial council (NO-GO→GO-after-re-scope).** The CONTROLLING
> build scope + the 15 council must-fixes (CF-1..CF-15) + the core build sequence now live in
> **`2026-07-24-mega-menu-BUILD-SPEC.md` §0.5**. The 13-unit / 5-wave structure below is the FULL-VISION
> reference; THIS build ships the smallest core (`general`/`columns`, light-only, caret-only, separate
> disclosure module, recursion guard) and defers the rest to a follow-on — nothing cut, sequenced. Read §0.5 first.

## 0. Goal (one sentence)

Build the standalone, reusable foundation for SGS mega-menus this session: a fresh
`sgs/mega-panel` block with 6 harmonised layout variants + colour-scheme/accent/per-item
controls, three net-new reusable theme effects (staggered reveal, sliding indicator,
cursor-follow spotlight) + magnet/caret, the disclosure wiring onto `store('sgs/nav')`, ≥2
CPT starter patterns so the native picker fires, and a live-a11y QC gate — **a superset of
the two Claude Design drafts, nothing shaved, no shared-container-wrapper reuse.**

**Done looks like:** creating a `sgs_mega_menu` post shows the native "Choose a pattern"
modal with ≥2 mega cards; a chosen starter writes a `sgs/mega-panel` tree to saved
`post_content`; the panel edits in the block editor with all harmonised controls; attaching
that panel to a nav item opens a positioned mega panel on the canary that passes axe on open,
degrades to reachable links with JS off, and honours `prefers-reduced-motion` — verified on
the real page + Bean's eye.

## 1. Scope + constraints

**In scope (this session's foundation):** `sgs/mega-panel` block, the 3 new effects (reusable
extensions), magnet + caret, `store('sgs/nav')` disclosure additions, nav-menu render wiring,
≥2 CPT patterns, editor preview, doc corrections, live-QC.

**Out of scope (later, per Bean 2026-07-24):** the 5 ui-ux Spec-36 layouts
(photo-grid/split-aside-CTA/logo-grid/info-box/link-columns) — next session, faster, dropped
onto this foundation. Block-menu (`wp_navigation`) support (Phase 3). WooCommerce category mega.

**Non-negotiable constraints (bind every unit):**
- **Standalone** — no `sgs/container` / `SGS_Container_Wrapper` reuse (Bean-directed; header/footer
  precedent). REUSE the Spec 35 inspector components + PHP render helpers, NOT the wrapper.
- No inline `style=""` (Spec 32) — scoped `#uid` `<style>`; effects write CSS-var **values** via
  Interactivity, never inline declarations.
- Motion transitions `transform`/`opacity` only (never `box-shadow`/`filter`); `prefers-reduced-motion`
  gate on every effect.
- WCAG 2.1 AA — disclosure semantics (`<button aria-expanded>`/`aria-controls`, NO `role=menu`),
  focus-return, safe-triangle, visible focus, crawlable-without-JS.
- Perf budget `<50KB JS / <100KB CSS`; no CLS.
- DB-first, UK English, no block version bumps / deprecations (D270).
- Composite-mirror deviation (D294): standalone mega-panel MUST reproduce box/width/grid/background
  capability cleanly, not diverge in computed output, require no walker/converter change → recorded
  as a deliberate decision (U13).

## 2. Success criteria (measurable)

1. `npx wp-scripts build` green; all prebuild gates pass (dead-controls, dead-pattern-attrs,
   control-ux, audit-inline-styling).
2. All 6 layouts render correctly in an isolated test render; Cards↔List toggles live on the
   same content.
3. Native pattern modal fires for a new `sgs_mega_menu` post with ≥2 cards; a choice writes
   real blocks to saved `post_content` (DB-verified, not editor state).
4. On the canary: a nav item bound to a mega panel opens a positioned panel on hover/tap/keyboard;
   `axe` = 0 block-defect on open; links present in pre-JS HTML; `prefers-reduced-motion` suppresses
   motion; existing drawer still works (no regression).
5. Bean's eye on the rendered panel (R-31-13).

## 2a. Verified ground truth (fact-checked 2026-07-24 — corrects subagent claims)

The reuse-inventory subagent made three overclaims, caught by reading the DB + actual files
(Bean-directed). Corrected facts the build binds to:

- **SGS uses THREE variant/style mechanisms, all real:** (1) **converter-variant** — `variant`/
  `variantStyle`/`badgeStyle` enum attr + `supports.sgs.variants` map + DB `blocks.variant_attr`
  + `variant_slots` (verified: `sgs/hero`, `product-card`, `testimonial`, `trust-bar`; hero `variant`
  enum `[standard,split,video,svg-animated]`); (2) **WP-native `variations`** in block.json —
  `sgs/button` (`[primary,secondary,outline]`→`inheritStyle`), `business-info`; (3) **WP-native
  `styles`** — `business-info`, `star-rating`. (`team-member` declares NONE — it uses hover effects.)
- **Hover Effects extension is ALLOW-LISTED, not universal** — `hover-effects.js`
  `SCALE_SHADOW_DEFAULT_BLOCKS` set. The standalone mega-panel owns its OWN scoped-CSS hover
  (cleaner + matches the standalone directive), not the extension.
- **Component name is `ResponsiveBoxControls`** (plural) in the barrel; `store('sgs/nav')` API
  confirmed exactly `openDrawer/closeDrawer/toggleDrawer` + `state.isOpen` + context `{isOpen,drawerRef}`,
  drawer-only (no hover-intent, no positioned panel — U8 additions are genuinely new).

**RECOVERED PRIOR ART (git `23a3cf63^`, extracted to scratch `old-mega-menu/`):** the deleted
`sgs/mega-menu` block — `view.js` (333, has hover/click toggle + focus mgmt + ESC + single-open +
`repositionPanel()` edge-overflow/right-align/full-width), `render.php` (344), `block.json` (183),
`edit.js` (347), `style.css` (1373 — layout CSS). **REUSE its mechanics; REBUILD its semantics** —
the old block used `role="menu"` + template-part panels, both BANNED (FR-36-10 disclosure only).

## 2b. COMPLETE-SPEC GATE (Bean-mandated 2026-07-24) — build blocked until this passes

**No build unit starts until EVERY area below has a complete, researched spec** (draft state → what
we already have → the gap → the exact resolution: exact values + exact mechanism), so a build agent
makes ZERO judgement calls, never pauses, never guesses. Deliverable = the build-spec doc
`.claude/plans/2026-07-24-mega-menu-BUILD-SPEC.md` (one section per area). Areas + grounding source:

| Area | Draft state | Current state + gap | Status |
|---|---|---|---|
| Layout (grids/widths/breakpoints per variation × style + aside column) | both analyses (have) | derive | pending write |
| Colour + scheme (light/dark token sets, accent, per-item bg) | analyses (have) | `SpecColourType` | pending grounding |
| Typography (per element family/size/weight/spacing → TypographyControls) | analyses (have) | `SpecColourType` | pending grounding |
| Motion (stagger/indicator/spotlight/magnet/caret + entrance + hover) | analyses (have) | `SpecMotionGap` | pending grounding |
| States (hover/focus/active/current) | analyses (have) | derive | pending write |
| Aside component (3 formats, separator, mobile-horizontal) | analyses (have) | derive | pending write |
| Inspector (element sections × Spec 35 clusters + manifest) | n/a | `SpecInspectorVocab` | pending grounding |
| Mobile/responsive (container-query stack per variation) | analyses (partial) | derive | pending write |
| Disclosure behaviour (hover-intent/safe-triangle/positioned/a11y) | analyses + recovered view.js | §2a + U8 | pending write |

Grounding runs 3 parallel passes (`SpecInspectorVocab`, `SpecMotionGap`, `SpecColourType`); on return,
synthesise + VALIDATE each into the build-spec doc (fact-check discipline — subagent claims are
hypotheses). THEN Wave 1 fans out against a complete spec.

## 3. Work units (every item specced)

> Legend: **CP** = on critical path. Effort = optimistic wall-clock (ADHD-tax ×2 in parens).

### Wave 0 — contracts (inline) — DECIDED 2026-07-24 (Bean-refined v2: variations ≠ toggles; aside is a component)
**Draft column/row logic (fact-checked, general `Mega Menu.dc.html`):** content is stored as GROUPS
`{title, links[]}`; the style toggle reshapes the SAME groups — `columns`=equal flex columns WITH
headings (count = #groups); `cards`=flatten to a 2-col card grid, headings off; `minimal`=flatten to a
single big list. The aside is a fixed grid column (`1fr 340px`, minimal `1fr 400px`). Only `columns`
shows headings → headings is its own toggle. **The Indus `sectorsStyle` cards/list toggle is DROPPED
(Bean: nonsensical — "list" = General minus the aside).**

**(a) Structural VARIATIONS (mirror `sgs/hero`):** `variant` enum `general | media-cards | brands` +
WP-native block.json `variations` (each an inserter/transform entry, own InnerBlocks template) +
`supports.sgs.variants` discriminating slots.
| Variation | Unifies | Structure |
|---|---|---|
| `general` | general Halcyon + Indus simple/links | GROUPS of links (heading + link list each) + optional aside |
| `media-cards` | Indus sectors | grid of coloured media cards (image+title+desc+CTA) |
| `brands` | Indus brands | logo-tile grid + CTA aside |

**(b) Content-preserving TOGGLES on `general` (never restructure):** `style`(columns/cards/minimal),
`headings`(on/off, default on for columns), `markerType`(icon/number/bullet/none — icon-vs-number diff;
reuse `sgs/icon-list` marker concept), `columns`(follows #groups, or forced 1/2). Content = GROUPS
(InnerBlocks: a heading + an `sgs/icon-list` per group).

**(a2) EDITOR MODEL — the client sets up NOTHING structural (Bean 2026-07-24).** Each variation ships
as a FIXED InnerBlocks TEMPLATE (our setup) under `templateLock:"contentOnly"` — the client only edits
CONTENT (link text/urls, images, headings) + flips the toggles; they never add/remove/rearrange the
structure. **Inspector = ELEMENT sections × Spec 35 CLUSTERS** (controls grouped by element, cluster
subheadings layout/colour/typography/… inside each) — reuse the Spec 35 manifest/vocabulary, do NOT
invent an inspector layout. (Grounding: `SpecInspectorVocab` pass.)

**(c) The ASIDE = a proper component (Bean: not image+CTA):** `aside`(toggle show/hide),
`asideSeparator`(styleable divider — none/line + colour/width), `asideFormat` preset
(`feature`=media+tag+title+desc+CTA / `preview`=hover-reactive / `cta`=pill+desc+CTA, the Brands style);
content via `sgs/media` + heading + text + button in the aside slot (media = image/video/audio, one block).
**Mobile (in-drawer): the aside stacks HORIZONTALLY** (media beside text, a compact row) below the stacked
content — not the desktop vertical side column; a media-heavy `feature` aside MAY go full-width-media on the
narrowest tier (my recommendation, so a feature video isn't undersold as a thumbnail).

**(d) Shared toggles (all variations):** `colourScheme`(auto/light/dark night-day), `accent`(token),
`itemBg`(per-item bg where cards/tiles apply). Media is NOT an axis — it is `sgs/media`. Style/headings
live-toggle on the same groups = the R1 check at Gate 1.

**(e) Mobile-in-drawer — CONTENT-PRESERVING responsive stack (Bean 2026-07-24; NOT the drafts' flatten-to-links,
which breaks `degrade-to-more-content-never-less`).** Same panel markup reflows: `general` groups → single
stacked column (headings + descriptions KEPT); `media-cards` → single column of SQUARER cards (aspect tuned to
content, not strict 1:1 — my rec); `brands` → fewer logo columns + CTA below; aside → horizontal row (per (c)).
Drive stacking by **container queries** (panel responds to its own width — the drawer is narrower than the
viewport, `STOP-CONTAINER-TIER-IS-NOT-VIEWPORT`), viewport tiers 768/1024 as fallback. Drawer render mechanism:
**auto drill-down for a tall/rich panel, inline-accordion for a short one** (my rec — inline-stacking a rich
general panel gets excessively tall). Nothing is ever hidden.

**(f) Effect contract — effects split across TWO blocks (refined):**
- **Panel effects → `sgs/mega-panel` attrs:** `stagger`(bool, default true, hook `data-stagger`),
  `spotlight`(bool, default false, hook `data-spotlight` on the aside; CSS vars `--sgs-mm-mx/--sgs-mm-my`).
- **Bar effects → `sgs/nav-menu` attrs (U9):** `indicator`(bool; the sliding pill), `magnet`(bool,
  hook `data-magnet`, CSS var `--sgs-mm-magnet-x`), `caret`(always; scoped CSS). U5 indicator + U7
  magnet therefore integrate at U9, not U2.
This unblocks U1 + U4–U7 in parallel.

### U1 — mega-panel block scaffold  · CP · 15 min (30)
- **Purpose:** the block exists + registered with its full attribute + supports surface.
- **Files:** `plugins/sgs-blocks/src/blocks/mega-panel/{block.json,index.js}`, register in
  `plugins/sgs-blocks/sgs-blocks.php`.
- **Spec:** attrs — `variant`(string, PHP-validated enum `general|media-cards|brands`, default
  `general` — the STRUCTURAL axis). CONTENT-PRESERVING toggles (general): `style`(`columns|cards|minimal`),
  `headings`(bool, default true), `markerType`(`icon|number|bullet|none`), `columns`(follows #groups or
  1/2). ASIDE component: `aside`(bool), `asideFormat`(`feature|preview|cta`), `asideSeparator`(object:
  none/line + colour/width). SHARED: `colourScheme`(`auto|light|dark`), `accent`(token slug), `itemBg`
  (per-item, cards/brands). Box/type/effect: `maxWidth`(responsive), `panelPadding`/`panelGap`(box
  objects), `bg`/`bgBlur`/`borderColour`/`borderRadius`(own, standalone), `stagger`/`spotlight`(panel
  effects — indicator/magnet/caret live on nav-menu, U9), typography families (`heading*`,`label*`,`desc*`).
  **Variant mechanism (verified §2a):** MIRROR `sgs/hero` — the `variant` enum + `supports.sgs.variants`
  map (each variation's discriminating slots, FR-31-20; seeded to `blocks.variant_attr`/`variant_slots`
  by `/sgs-update` at U13) + WP-native block.json `variations` (MIRROR `sgs/button`) so each of
  general/media-cards/brands is an inserter entry + transform with its own InnerBlocks template.
  `supports.sgs.imageControls:true`.
  NO `default:null` on non-string attrs (SSR-400 gotcha). Dynamic block (`save`→`<InnerBlocks.Content/>`).
- **Reuses:** none of the wrapper; the recovered old `block.json` (§2a scratch) as an attr reference
  (strip banned bits); declares the effect attrs from Wave 0. **ALSO declare `supports.sgs.elements`**
  (the Spec 35 manifest — element→cluster→control map; `layer:"GRID"`/`"OUTER"` on the grid element or the
  12 arrangement members go unchecked; explicit `attrMap` for camelCase attrs like `gridTemplateColumns`
  or the linter scores them GAP). Mirror `sgs/card-grid`'s manifest. Verify `node scripts/check-element-manifest-conformance.js` → GAP/ORPHAN 0.
- **INPUTS:** Wave 0 contracts. **OUTPUTS:** attr contract → U2, U3; block slug → U9, U10.
- **TEST (CP):** Happy — block registers (`wp block list`-equiv / editor inserts it). Edge —
  invalid `variant` value coerces to `general` in PHP. Fail — missing effect attr doesn't fatal.
  Integration — appears in the `sgs_mega_menu` editor.

### U2 — mega-panel render.php + style.css  · CP · 45 min (90)
- **Purpose:** standalone server render of the 3 variations + effect hooks, zero inline style.
- **Files:** `.../mega-panel/{render.php,style.css}` + one `includes/helpers-mega-*.php` if a shared
  fn is needed (NEVER a top-level fn in render.php — D374 redeclare fatal).
- **Spec:** uid-scoped `<style>` block for the 3 VARIATION structures driven by `variant`:
  `general`=GROUPS (heading + link list each) reshaped by `style` (columns=equal flex cols WITH headings /
  cards=flatten to 2-col grid, headings off / minimal=flatten to single big list) + `headings` toggle +
  `markerType` (icon/number/bullet) + `columns` (follows #groups) + the ASIDE (fixed grid column `1fr Npx`,
  `asideFormat` feature/preview/cta, styleable `asideSeparator`); `media-cards`=coloured media-card grid;
  `brands`=logo-tile grid + CTA aside. `colourScheme` light/dark = token rule sets. **Mobile-in-drawer =
  the Wave 0 (e) content-preserving container-query stack** (groups→single column, squarer media-cards,
  horizontal aside; nothing hidden). Emit box/width/bg/blur/border/radius from attrs via the
  reused PHP helpers (`sgs_emit_responsive_css`, `sgs_colour_value`, `sgs_label_box_css_rule`). Emit
  effect hooks: `data-wp-interactive`/context for spotlight+magnet (CSS-var writers), `data-stagger`
  for reveal, indicator markup. Colour-scheme = token-driven light/dark rule set. WCAG: real
  `<a>`/headings, `__eyebrow`/`__title`/`__description`/`__cta`/`__image`/`__tag` element classes,
  scrim on image slots, `prefers-reduced-motion` block. Reduced-motion + forced-colors survival.
  **Card hover-lift = OWN scoped CSS** (transform+opacity, pseudo-element shadow-fade), NOT the
  `hover-effects.js` allow-list extension (§2a). Reference the recovered old `style.css` (§2a) for
  layout/grid CSS; strip the banned `role=menu`/template-part structure.
- **INPUTS:** U1 attrs; U4–U7 effect hooks/CSS. **OUTPUTS:** rendered panel → U9, U10, U12.
- **TEST (CP):** Happy — each variation × `style` renders the expected grid. Edge — empty InnerBlocks
  renders nothing broken; aside off in general/brands degrades gracefully. Fail — no inline
  `style=` in output (audit-inline-styling gate). Integration — `style`/`headings` toggles re-grid the
  same groups live; the mobile container-query stack fires in a narrow container.

### U3 — mega-panel edit.js + save.js + editor.css  · 30 min (60)
- **Purpose:** the element×cluster inspector; client edits CONTENT + SETTINGS only, never structure.
- **Files:** `.../mega-panel/{edit.js,save.js,editor.css}`.
- **Spec:** **Inspector = ELEMENT sections × Spec 35 CLUSTERS** (per Wave 0 (a2) + `SpecInspectorVocab`):
  controls grouped by element, cluster subheadings (layout/colour/typography/…) inside each; NO bespoke
  inspector layout. **The inspector is HAND-BUILT in edit.js** — the `supports.sgs.elements` manifest is
  a CONFORMANCE contract a linter checks, NOT a UI renderer (verified `SpecInspectorVocab`): build the
  element-first panels by hand AND declare the manifest; they must agree. 6 live clusters =
  text/fill/layout/position/motion/animation + a states axis (hover/focus/selected/pressed/disabled);
  mirror `sgs/card-grid`. Controls reuse Spec 35 components: `variant`/`style`/`headings`/`markerType`/`columns`
  + `colourScheme` (`ToggleGroupControl`), `accent`+colours (`DesignTokenPicker`), max-width/padding/gap
  (`ResponsiveControl`+`ResponsiveBoxControls`), typography (`TypographyControls`, per element, never
  bespoke), hover (`StateToggleControl`), images (`MediaPicker`/`IconPicker`), aside (toggle+format+
  separator). `<ServerSideRender block="sgs/mega-panel">` preview (drift guard). `save` →
  `<InnerBlocks.Content/>`. **`templateLock:"contentOnly"` on each variation template — client edits
  content + settings ONLY, never adds/removes/rearranges structure** (first SGS application — flag).
- **Reuses:** all Spec 35 components (barrel `../../components`).
- **INPUTS:** U1 attrs. **OUTPUTS:** editable block. **TEST:** standalone — every attr has a
  control; SSR preview matches frontend; no dead controls (gate).

### U4 — Staggered-reveal effect (reusable)  · 15 min (30)
- **Purpose:** first-class stagger for children on panel open — reusable theme effect.
- **Files:** `plugins/sgs-blocks/src/blocks/extensions/stagger.js` (+ CSS in `extensions.css`) or a
  shared `src/shared/effects/stagger.js` consumed by view modules.
- **Spec:** IntersectionObserver/`animationstart`-driven; composes existing fade-up/scale primitives
  with an index-based delay cap (draft: 460ms, delay `min(i*28,320)`, `cubic-bezier(.16,.84,.32,1)`,
  `fill:backwards`). `transform`+`opacity` only. Reduced-motion → instant. Opt-in `data-stagger`.
- **INPUTS:** none. **OUTPUTS:** consumed by U2/U9. **TEST:** standalone — children reveal
  staggered; reduced-motion = no animation.

### U5 — Sliding active-indicator (reusable nav effect)  · 20 min (40)
- **Purpose:** the moving pill/underline under the active nav trigger.
- **Files:** `src/shared/effects/nav-indicator.js` + CSS; consumed by `nav-menu/view.js`.
- **Spec:** measures active trigger rect vs bar; drives an absolutely-positioned pill via
  `transform: translateX()` + `width` (NO box-shadow/filter). `pointer-events:none`. Reduced-motion
  → snap. Static default (no indicator until first open).
- **INPUTS:** none. **OUTPUTS:** consumed by U9. **TEST:** standalone — pill slides on trigger change.

### U6 — Cursor-follow spotlight (reusable)  · 20 min (40)
- **Purpose:** the feature-card radial spotlight, architecture-compliant.
- **Files:** `src/shared/effects/spotlight.js` + CSS.
- **Spec:** rAF-throttled `mousemove` writes `--mx`/`--my` **CSS-var values** via
  `element.style.setProperty` (values, NOT a `style="…"` declaration — permitted by Spec 32); CSS
  `radial-gradient(... at var(--mx) var(--my) ...)` consumes them. Static default centre. Reduced-motion
  → static. Opt-in `data-spotlight`.
- **INPUTS:** none. **OUTPUTS:** consumed by U2. **TEST:** standalone — gradient tracks cursor; static
  fallback with JS off + reduced-motion.

### U7 — Magnet label (reusable)  · 10 min (20)
- **Purpose:** the subtle label-follows-cursor micro-interaction (optional toggle).
- **Files:** `src/shared/effects/magnet.js` + CSS.
- **Spec:** rAF `mousemove` writes a `--magnet-x` CSS-var value (×0.14–0.16 of offset); CSS
  `transform: translateX(var(--magnet-x))`. Reduced-motion → off. Opt-in `data-magnet`.
- **INPUTS:** none. **OUTPUTS:** consumed by U2/U9. **TEST:** standalone — label shifts with cursor.

### U8 — `store('sgs/nav')` disclosure additions  · CP · 30 min (60)
- **Purpose:** the mega disclosure engine, added onto the existing drawer store.
- **Files:** `plugins/sgs-blocks/src/shared/nav-interactivity/store.js` (additive).
- **Spec:** ADD hover-intent (`openOnHover` w/ intent delay 100–500ms default 300, close-grace 170ms,
  cancel-on-enter, bar+panel bridge), a **positioned dropdown/mega** mode (anchored under a trigger,
  content-sized, max-width bound — distinct from the full-screen drawer), `aria-expanded`/`aria-controls`
  binding, ESC/focus-return, a **safe-triangle** hover path (not just a flat delay), WCAG 1.4.13
  (dismissible/hoverable/persistent). REUSE unchanged: focus-trap, scroll-lock, body-reparent (D323),
  exit-animation, reduced-motion. Tap-on-touch / keyboard-throughout. **RECOVER** the old
  `mega-menu/view.js` (§2a scratch) `repositionPanel()` (edge-overflow / right-align / full-width
  top-align via CSS var) + hover-toggle + single-open + focus mgmt as the starting point — adapt into
  the store; REBUILD `role=menu` → `<button aria-expanded>` disclosure (banned, FR-36-10).
- **INPUTS:** none hard. **OUTPUTS:** actions/state → U9. **TEST (CP):** Happy — hover opens, keyboard
  opens, ESC closes + returns focus. Edge — panel-less item = link only. Fail — no regression to the
  drawer (still opens/closes/traps). Integration — safe-triangle keeps panel open on diagonal path.

### U9 — nav-menu render + view wiring  · CP · 30 min (60)
- **Purpose:** detect a mega-linked item, render its panel at the real position, wire the disclosure.
- **Files:** `plugins/sgs-blocks/src/blocks/nav-menu/{render.php,view.js,edit.js}`.
- **Spec:** in render.php, for each top-level item call
  `Sgs_Mega_Menu_CPT::resolve_panel_for_menu_item($item)` (via `object_id`); on a panel, emit the
  `<button aria-expanded>` disclosure + `do_blocks()` of the panel post at the item's real position
  (NOT last), caret; else a simple dropdown / plain link (FR-36-9a degrade). Mobile: render the SAME panel
  inside the drawer per Wave 0 (e) — content-preserving container-query stack (auto drill-down for a tall
  panel, inline-accordion for a short one), never the drafts' flatten-to-links. view.js binds the U8 store
  actions + U5 indicator. Idempotent,
  no top-level fns in render.php (D374). Crawlable server HTML, no AJAX/lazy-load. Reference the old
  `mega-menu/render.php` (§2a) for panel-at-position rendering; strip banned `role=menu`.
- **INPUTS:** U2 (panel renders), U8 (store), U1 (slug). **OUTPUTS:** live mega → U12.
- **TEST (CP):** Happy — bound item opens its panel at position. Edge — trashed/missing panel → plain
  link (resolver returns null). Fail — a page with 2 nav-menus / 2 mega items doesn't fatal (D374
  multi-instance). Integration — mobile renders panel in drawer.

### U10 — CPT starter patterns (≥2)  · CP · 20 min (40)
- **Purpose:** fire the native "Choose a pattern" picker for `sgs_mega_menu`.
- **Files:** `theme/sgs-theme/patterns/mega-*.php` (≥2, e.g. `mega-columns.php`, `mega-cards.php`,
  + a `mega-scratch.php` "Start from scratch" shell).
- **Spec:** each header carries `Block Types: core/post-content` + `Post Types: sgs_mega_menu`
  (D377 mechanism, mirror `header-full.php`); body = a `sgs/mega-panel` preset to a layout + sample
  token-driven neutral content. NO registration `template` seed on the CPT (already none). No banned
  core blocks.
- **INPUTS:** U1/U2. **OUTPUTS:** picker fires → U12. **TEST (CP):** modal shows ≥2 cards; a choice
  writes the block tree to saved `post_content`.

### U11 — theme version bump  · CP · 2 min (4)
- **Files:** `theme/sgs-theme/style.css` `Version:` 1.5.43 → 1.5.44.
- **Spec:** busts the theme-version-keyed pattern cache (D377 gotcha) so U10 registers.
- **INPUTS:** U10. **TEST:** patterns appear in `getBlockPatterns()`.

### U12 — build + deploy canary + live-a11y QC gate  · CP · 30 min (60)
- **Purpose:** the real-page proof (FR-36-16 subset).
- **Steps:** `npx wp-scripts build --experimental-modules --webpack-copy-php`; deploy via an
  **isolated worktree** (`--blocks-only --theme-only`, `--skip-build`), `md5sum` local↔server; clear
  CDN/LiteSpeed; create a `sgs_mega_menu` from a starter, attach to menu 98/99, open it. Run: axe on
  open panel (0 block-defect), `elementFromPoint` occlusion, crawl assertion (links pre-JS), reduced-
  motion + forced-colors sweep, drawer no-regression, real-desktop scrollbar. Bean's eye.
- **INPUTS:** all. **TEST (CP):** the success criteria §2.4/2.5.

### U13 — doc corrections + decision record  · 10 min (20)
- **Files:** `specs/36-SGS-NAVIGATION-SYSTEM.md` (§8a: CPT EXISTS + resolver built — correct the stale
  "do not exist yet"), `plugins/sgs-blocks/CLAUDE.md` (Mega Menu row: block deleted → mega-panel
  rebuilt), `.claude/decisions.md` (new D: mega-panel standalone deviation from D294 + rationale +
  clone-safety conditions), LEDGER.
- **INPUTS:** respective builds. Parallel-safe. **TEST:** standalone.

## 4. Dependency graph + waves

```
Wave 0  contracts (inline)
        │
Wave 1  ├─ U1 scaffold ────────┐         (parallel with:)
        ├─ U4 stagger           │  U5 indicator  U6 spotlight  U7 magnet   U8 store
        │                       │  (all independent, self-contained modules)
Wave 2  ├─ U2 render  (U1 + U4/U6/U7) ── U3 edit (U1)
        │
Wave 3  ├─ U9 nav wiring (U2 + U8 + U5) ── U10 patterns (U1/U2)
        │
Wave 4  ├─ U11 version bump (U10)
        └─ U12 QC gate (ALL) ‖ U13 docs (parallel)
```

**Critical path:** Wave 0 → U1 → U2 → U9 → U12  (U8 parallel to U1/U2, joins at U9).
**Parallel opportunities:** Wave 1 fans out 6 units (U1 + U4–U8). Wave 2 U2‖U3. Wave 3 U9‖U10.
**Min wall-clock (fan-out):** ~2–2.5h. Raw sum ~4.7h.

## 5. Milestone gates

**GATE 1 — block works (after Wave 2).** PASS: build green + all 6 layouts render in an isolated
test + Cards↔List toggles live. FAIL: any layout broken or inline style emitted. TYPE: auto-gate.
Readiness target ≥85. *Demoable: the block renders.*

**GATE 2 — picker + editing (after Wave 3, U10/U11).** PASS: native modal fires with ≥2 cards; a
choice writes real blocks to saved `post_content`; block edits with all controls. FAIL: no modal
(check version bump / pattern headers). TYPE: review-gate (Bean can look). *Demoable: a client can
pick + edit a mega style — this is the Task-1-equivalent win, bankable even if Gate 3 slips.*

**GATE 3 — full live (after U12).** PASS: mega opens under a nav item on the canary; axe 0 on open;
crawl pre-JS; reduced-motion honoured; drawer no-regression; Bean's eye. FAIL: axe defect / occlusion
fail / drawer regression → STOP-19 roll back, refine next session. TYPE: go/no-go (Bean).

## 6. Risks (top, with mitigation)

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | Content model: live Cards↔List toggle on the same InnerBlocks children | **High** | Single-InnerBlocks + layout-grid model; test the toggle at Gate 1 before building more layouts |
| R2 | D294 deviation (standalone, no wrapper) → clone-fidelity drift | Med | Reproduce box/width/grid/bg capability cleanly; no walker change; record decision (U13); QC computed-output |
| R3 | `store('sgs/nav')` positioned-panel additions regress the live drawer | Med | Additive-only edits; Gate-3 drawer no-regression check (it's live on the canary) |
| R4 | Perf budget `<50KB JS` with 3 new effects | Med | Effects are small vanilla JS; measure in U12 `wp-perf-gate` |
| R5 | Pattern cache stale after adding patterns | Low | U11 version bump (known D377 gotcha) |
| R6 | Multi-instance render fatal (2 mega items / 2 nav-menus) | Med | No top-level fns in render.php (D374); Gate-3 multi-instance test |

## 7. Execution model

Fan out with `/subagent-driven-development` (implementer + per-unit review) + `/dispatching-parallel-agents`
for Wave 1. Every implementer dispatch: "EXECUTE YOURSELF, do NOT delegate" (D362). `/qc-council`
before the U12 commit (blub.db 255). Path-scoped commits, branch re-checked in the same command,
`--no-verify` only for logic-predominant changes (visual-diff gate's own sanction). Deploy from an
isolated worktree (never junction node_modules).

## 8. First action (<5 min, zero deps)

Write Wave 0: finalise the effect-attr contract + the mega-panel content model as a 1-screen note,
then scaffold `src/blocks/mega-panel/block.json` attribute skeleton.
