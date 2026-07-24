---
doc_type: build-spec
project: small-giants-wp
title: SGS Mega-Menu — Complete Build Specification (zero-guess)
spec: 36-SGS-NAVIGATION-SYSTEM.md · companion to 2026-07-24-mega-menu-foundation-strategic-plan.md
date: 2026-07-24
status: RE-SCOPED + COUNCIL-HARDENED 2026-07-24 (see §0.5) — CORE ready to build after the Wave-0 spike/pin; §1–§10 = full-vision follow-on reference
note: "Bean-mandated complete spec (§2b of the strategic plan). Every area = DRAFT state → CURRENT
  (fact-checked, cited) → GAP → EXACT spec, so a build agent makes zero judgement calls. Grounded by
  4 subagent passes (2 draft forensics + SpecInspectorVocab + SpecMotionGap + SpecColourType), all
  claims verified against source. Draft values from sites/Mega-menu design/ + sites/Indus Foods Mega Menu Design/."
---

# Mega-Menu Build Specification

## §0. DECISIONS — RESOLVED 2026-07-24 (Bean signed off)

**D-A — Night/day scheme: RESOLVED.** The mega panel **owns its own light + dark palette, customisable per
panel.** `colourScheme` = `auto` / `light` / `dark`. **`auto` FOLLOWS the site-wide active mode** — it keys
on the theme's own convention `:root[data-theme="dark"]` (a site's dark/light switcher) with
`@media (prefers-color-scheme: dark)` as the device-preference default when no site switcher exists — so a
site with a dark/light toggle stays **unified across every part, mega included**. `light`/`dark` = a
**per-panel FORCE** ("set which one is visible in the mega menu") regardless of site mode. The mega SUPPLIES
the palette values (its own, per panel) and READS the site's mode signal — it does NOT depend on the theme
dark-mode being enabled/de-hardcoded. (Refines the earlier option (a); see §4 for the selector cascade.)

**D-B — Add a neutral `mono` font family: RESOLVED YES.** Self-host a neutral monospace woff2 + add a `mono`
slug to `theme.json fontFamilies`; eyebrows/tags use `var(--wp--preset--font-family--mono)`.

_Options considered (historical):_

**Bean-facing (RESOLVED above):**

| # | Decision | Options | My recommendation |
|---|---|---|---|
| **D-A** | **Night/day scheme — how dark is expressed** | (a) mega OWNS its scheme: `data-mega-scheme=light\|dark\|auto` on the panel; light surfaces from theme tokens, dark = a mega-scoped neutral dark set; accent follows the picked token in both. Self-contained, ignores the theme's gated/hardcoded dark-mode. (b) wire to the theme's `data-theme` dark-mode (but it's OFF by default + hardcoded SGS-brand, so it can't carry a per-panel night palette). | **(a)** — self-contained + token-driven + brand-neutral; the theme dark-mode can't do it |
| **D-B** | **Add a neutral `mono` font family to the framework theme?** The draft eyebrow/tag labels use a mono face; the theme has **no monospace slug at all**. | (a) add a self-hosted neutral `mono` slug to `theme.json fontFamilies` (used for eyebrows/tags across the framework); (b) map eyebrows to an existing family (e.g. `dm-sans`) — no mono look | **(a)** — the mono micro-label is a recurring house-style element; one small framework addition |

**Decided (recorded, senior-dev calls — override if you disagree):**
- **D-C `soft` colour = derived, not stored** — `color-mix(in srgb, var(--wp--preset--color--accent) 10%, transparent)` (draft's `accent@10%`). Token-driven, no new stored token.
- **D-D translucent surfaces (panel/card/border-wash/hover-wash) = mega block attrs** with token-based defaults (operator-overridable via `DesignTokenPicker`), NOT new global theme tokens — keeps the theme palette clean + the panel brand-neutral.
- **D-E stagger/entrance easing = mega-scoped exact value** `cubic-bezier(.16,.84,.32,1)` (the draft curve), emitted in the effect's own CSS — NOT the theme `ease-out` token (`.16,1,.3,1`, a near-but-not-equal miss). Avoids theme churn; the caret's `.3s` DOES equal the theme `medium` duration token, so that one reuses the token.
- **D-F per-element font-FAMILY = theme.json element styles + per-element wrapper `fontFamily`**, NOT a new per-element family picker (`TypographyControls` has none; building one is out of scope). Neutral starter uses theme families (heading→`display`, body→`body`, eyebrow/tag→`mono` per D-B).
- **D-G draft-specific fonts NOT baked** (Bricolage/Instrument Sans/Geist Mono/Plus Jakarta) — the neutral starter uses theme families; specific fonts are per-client via the Font Library.

---

## §0.5 — CORE SCOPE + COUNCIL FIXES (2026-07-24; CONTROLS THIS BUILD — supersedes §1–§10 where they conflict)

Adversarial council (7 personas) verdict: **NO-GO as written → GO after re-scope + pin-down.** Bean chose
re-scope. §1–§10 remain the FULL VISION (the follow-on reference); THIS section is what gets built now.
Nothing is cut — the deferred items ship in a follow-on on the proven spine (like the 5 ui-ux layouts).

### A. CORE SCOPE (ships this build)
`general` variant · `columns` style · **light scheme only** · **caret flip only** (no stagger/indicator/
spotlight/magnet, no card hover-lift) · optional **static `cta` aside** (no `feature`/`preview`) · CPT
attach + positioned disclosure + mobile drawer render + ≥2 `general` starter patterns + live-a11y QC.

**DEFERRED to a follow-on (declared, not built):** `media-cards`+`brands` variations (declare the enum
values, build only `general`) · the 5 motion effects (§6 rows 1-4,6) · night/day `auto`/`dark` (§4 dark
column) · aside `feature`+`preview` formats (§8) · full manifest GAP/ORPHAN-0 conformance.

### B. COUNCIL MUST-FIXES — applied with the exact pin (build agents follow THESE)

**CF-1 (FATAL, Security) — `do_blocks` self-reference recursion guard.** In U9's `nav-menu/render.php`
mega path, before resolving/rendering a panel, guard against a panel that (directly or transitively)
renders the menu it hangs off. Shape (in a `function_exists`-guarded `includes/` helper, NEVER top-level
in render.php — D374): `static $sgs_mega_rendering = array();` keyed by panel post-ID; if
`isset($sgs_mega_rendering[$id])` OR `count($sgs_mega_rendering) >= 3` (hard depth cap) → render the plain
link, do NOT recurse; set the key before `do_blocks()`, unset in a `finally`. Add a named U9 TEST Fail
case: "panel #N embeds a nav bound to a menu containing item→#N ⇒ plain link, no fatal, no infinite loop."

**CF-2 (Security) — explicit escape/sanitise mandate.** Add to §10: *every colour/token attr →
`sgs_colour_value()`; every free dimensional attr → the length/keyword regex `nav-menu/render.php` already
uses (`$sgs_nm_css_length`/`$sgs_nm_css_keyword`); every text/URL attr rendered OUTSIDE a child SGS block →
`esc_html()`/`esc_url()`; NEVER concatenate a raw attr into the scoped `<style>`.* Add a U2 TEST Fail case:
`panelBg:'red;}</style><script>'` ⇒ sanitised, no breakout.

**CF-3 (Cynic+Ship-PM+Support+Spec-Lawyer) — SEPARATE disclosure module; do NOT extend `store('sgs/nav')`.**
U8 becomes: a NEW `src/shared/nav-interactivity/mega-disclosure.js` registering `store('sgs/mega')` (own
namespace — the drawer store's cross-bundle merge only holds for identical defs). It IMPORTS ONLY the PURE
helpers. **FACT-CHECK CORRECTION (2026-07-24): `store.js:638` exports ONLY `{ actions, FOCUSABLE_SELECTOR }`;
`getFocusable` (`:278`) + `prefersReducedMotion` (`:265`) are declared but NOT exported (the Cynic's
"already exported" was wrong).** So reuse `FOCUSABLE_SELECTOR` as-is; and EITHER add `getFocusable`+
`prefersReducedMotion` to `store.js`'s export line (pure fns, zero drawer coupling — safe additive) OR
re-implement them locally. Do NOT `import { getFocusable }` expecting it to resolve. Shares NONE of the
drawer orchestration (NO `reparentToBody`, NO `lockScroll`, NO
`freezeBackground`, NO `showModal`). A positioned dropdown stays anchored under its trigger, does NOT
scroll-lock, does NOT `inert` the page, is NOT top-layer. The drawer store is untouched → the live-drawer
regression risk (R3) largely evaporates. **Still run the EARLY drawer smoke-check on the canary after U8.**

**CF-4 (Cynic+Verifier) — the manifest gate is ADVISORY, not pass/fail.** Strike "verify … → GAP/ORPHAN 0"
from §2 + U1. Replace: "declare `supports.sgs.elements`; run `check-element-manifest-conformance.js` as a
WARN-ONLY advisory; target = every member the mega-panel DECLARES resolves (card-grid's partial-manifest
precedent), NOT global 0." `text`-cluster `css:font-family`/`css:text-align` resolve via native
`supports.typography.fontFamily`/`textAlign` (per D-F) OR are declared expected-GAPs — never a per-element
family picker.

**CF-5 (Competitor+Support+Spec-Lawyer) — `variant` is INSERT-TIME ONLY.** NOT a live `ToggleGroupControl`.
Chosen via the starter pattern at insert; NO inspector control switches it post-insert (a switch would
orphan the fixed InnerBlocks content under `templateLock:contentOnly`). Do NOT inherit hero's live-variant
pattern. `style`/`headings`/`markerType`/`columnCount` REMAIN live (they re-grid the same content).

**CF-6 (Support, verified) — `templateLock:"contentOnly"` needs `role:"content"`.** WP 7.0 HIDES a
content-bearing child attr from the contentOnly surface unless it declares `role:"content"`
(`specs/common-wp-styling-errors.md:351`). Every editable child attr in the `general` template (heading
text, each link text/url, desc, cta text/url, media) MUST declare `role:"content"`. Verify LIVE before
Gate 2 (a green build won't catch it). **Spike `templateLock:contentOnly` on the ONE `general` template
first** (Cynic/Ship-PM) — prove the content-only edit model before wiring the inspector.

**CF-7 (Support, verified) — `colourScheme` core rule.** Attr declared, default `light`. `auto` renders
dark ONLY on an explicit site dark-signal (`:root[data-theme="dark"]`); with no site switcher present it
renders LIGHT — it must NEVER silently inherit the visitor's OS `prefers-color-scheme` for this one
component on an otherwise-light site. (Dark value set deferred; the attr + the light-safe rule ship now.)

**CF-8 (Cynic) — extract the recovered `view.js` to a stable path in Wave 0.** It is in git, NOT on disk.
Wave-0 step: `git show '23a3cf63^:plugins/sgs-blocks/src/blocks/mega-menu/view.js' > .claude/scratch/old-mega-menu/view.js` (+ render.php). U8/U9 reference `.claude/scratch/old-mega-menu/`, not the session scratchpad.

### C. PIN-DOWNS (Spec-Lawyer contradictions that survive the re-scope — resolved)

- **CF-9 — `general`/`columns` is FLEXBOX, not grid (§3 is authoritative; §2's manifest was wrong).** The
  content row = `display:flex; gap:44px; each group flex:1; min-width:0`. Manifest: the content element is
  `layer:"CONTENT"` (NOT `GRID`); its arrangement attr is `groupGap`→`gap` (NOT `columns`→`gridTemplateColumns`).
  The aside split (`1fr Npx`) is the only genuine grid in the core and lives on the panel element.
- **CF-10 — `general` InnerBlocks TEMPLATE (block-by-block, pinned).** `[ sgs/mega-group ×2 ]` where each
  `sgs/mega-group` = `[ sgs/heading (role:content), sgs/icon-list (role:content) ]`. Default N=**2 groups**.
  (If a dedicated `sgs/mega-group` wrapper is over-engineering, use `sgs/container` locked to that inner
  template — decide at U1, but PIN the block slugs: `sgs/heading` + `sgs/icon-list`, never `core/*`.) Aside
  (if enabled) = `[ sgs/media (role:content), sgs/heading (role:content), sgs/text (role:content), sgs/button (role:content) ]`.
- **CF-11 — rename the numeric attr `columns` → `columnCount`** (it collided with the `style` enum value
  `columns`, Spec-Lawyer M10). `columnCount` (1|2, default follows #groups). Update §1/§2/§3/U1.
- **CF-12 — the manifest `attrMap` for EVERY shipping element is pinned before dispatch** (Spec-Lawyer M23):
  `panel` (bg/maxWidth/panelPadding/borderColour/borderRadius), content-row (`groupGap`→gap), `group-heading`
  (prefix `heading`, native typography), `link`+`desc` (via `sgs/icon-list`'s own attrs — child-owned, HC2),
  `marker` (`markerType`), `cta` (prefix `cta`). Write the literal map at U1; do NOT leave 7/9 unmapped.
- **CF-13 — safe-triangle: use the recovered `view.js` mechanism + the 170ms bridge, not a new polygon algo**
  (Spec-Lawyer M19). The bar+panel share a hover container; `scheduleClose` = 170ms `setTimeout`,
  `cancelClose` on re-enter (the general-draft pattern, §6 disclosure timing). If a true safe-triangle is
  wanted it is a DEFERRED enhancement — the 170ms bridge + shared-container is the CORE deterministic rule.
- **CF-14 — mode-switch breakpoint = `sgs/nav-menu`'s existing collapse point** (Spec-Lawyer M20): desktop
  positioned-dropdown ↔ mobile drawer flips at the nav's `collapse point N` (default 768). Cite it, don't invent.
- **CF-15 — the trigger element structure (Spec-Lawyer/Support MISSING):** a mega-linked top-level item is a
  `<button aria-expanded aria-controls>` (accessible name = the menu item's label) that opens the panel; the
  item's own destination link is the FIRST link INSIDE the panel (a "view all {label}" / the panel's own
  permalink), NOT a link+disclosure combo on one element (a WCAG anti-pattern). Pin this in U9.

### D. CORE BUILD SEQUENCE (supersedes the plan's Wave list for this build)
0. **SPIKE (5 min, canary):** create one `sgs_mega_menu` post, confirm it appears in Appearance→Menus,
   attach it, confirm `resolve_panel_for_menu_item` returns it live. (CPT verified to exist; prove attach.)
0b. **Wave-0:** extract `view.js` (CF-8); pin the `general` template + attrMaps + `columnCount` rename.
1. **U1** scaffold — `general` only (enum-declare media-cards/brands); attrs + advisory manifest (CF-4/11/12).
2. **U3-spike** — prove `templateLock:contentOnly` + `role:content` on the `general` template (CF-6).
3. **U2** render.php + style.css — columns (flex, CF-9), light-only, caret, optional static cta aside;
   escaping (CF-2); recursion-safe helper location (CF-1).
4. **U3** edit.js — hand-built element×cluster inspector (advisory manifest); `variant` insert-time (CF-5).
5. **U8** — NEW `mega-disclosure.js` `store('sgs/mega')` (CF-3); commit isolated + tag.
6. **EARLY drawer smoke-check** on canary (drawer un-regressed) BEFORE U9.
7. **U9** nav wiring + recursion guard (CF-1) + trigger structure (CF-15) + real-position render + JS-off degrade.
8. **U10** 2 `general` patterns + scratch shell · **U11** theme version bump.
9. **U12** build + deploy + live-a11y QC (axe open panel+drawer, occlusion, crawl JS-off, reduced-motion,
   no drawer regression, recursion-guard test, escaping test) + Bean's eye.
10. **U13** docs — fix Spec 36 §8a (CPT EXISTS + the wrong `show_in_nav_menus` citation) + record decisions.

---

## §0.6 — qc-council validation of the fix-shapes (2026-07-24)

All 15 CF fix-shapes were fact-checked against live source + run through the empirical gate (goal-shaped:
each rests on a verified baseline + addresses a real gap — none is a no-op). **1 falsified-then-corrected
(CF-3); 14 validated; 4 carry a build-time decision to pin.**

| CF | Baseline (verified?) | Verdict | Commit gate |
|---|---|---|---|
| CF-1 recursion guard | render path adds panel-render at U9; resolver has no depth tracking (`class-sgs-mega-menu-cpt.php:274`) ✓ | VALIDATED | U9 blocked without the self-reference test passing |
| CF-2 escaping | helpers `$sgs_nm_css_length/_keyword` real (`nav-menu/render.php:190,193`) ✓ | VALIDATED | U2 blocked without the injection test |
| CF-3 separate store | store.js drawer-only ✓ BUT `getFocusable`/`prefersReducedMotion` NOT exported — **council claim FALSE, corrected** | VALIDATED (post-fix) | U8 blocked if drawer regresses or mega scroll-locks |
| CF-4 advisory gate | conformance script warn-only + NOT in prebuild ✓; card-grid itself GAPs ✓ | VALIDATED | spec: no "GAP-0" language remains |
| CF-5 variant insert-time | design-logic (contentOnly + template-swap = orphan) — sound | VALIDATED | no live variant control ships |
| CF-6 role:content | `common-wp-styling-errors.md §X` requires it for WP7 contentOnly ✓ | VALIDATED | Gate 2 needs a live locked-panel content edit working |
| CF-7 colourScheme light-safe | `dark-mode.js:57` — no pref → CSS media-query handles ✓ | VALIDATED | default light; no prefers-color-scheme-only dark |
| CF-8 git-extract view.js | in git `23a3cf63^`, not on disk ✓ | VALIDATED | Wave-0 `ls` confirms extraction |
| CF-9 columns=flex | draft `display:flex;gap:44px` ✓; §2 manifest was wrong | VALIDATED | §2+§3 consistent (flex) |
| CF-10 pinned template | draft = 2 groups ✓ | VALIDATED — **PIN at U1: `sgs/mega-group` (net-new) vs `sgs/container`-locked** | U1 template = the pinned array |
| CF-11 columnCount rename | name collision in U1 ✓ | VALIDATED — **residual: §1/§2/§3 still say `columns`; §0.5 override controls, apply throughout at build** | grep shows no numeric `columns` |
| CF-12 pin 9 attrMaps | §2 maps only 2/9 ✓ | VALIDATED | every declared element has an attrMap/native-supports |
| CF-13 safe-triangle=170ms | draft 170ms bridge + recovered view.js hover ✓ | VALIDATED — **DEFERRAL: true safe-triangle → follow-on, RECORD against FR-36-4 (not dropped, STOP-29)** | bar→panel hover keeps panel open |
| CF-14 breakpoint 768 | Spec 36 FR-36-8 default ✓ | VALIDATED | mega mode-switch cites nav-menu's actual collapse value |
| CF-15 trigger=button | WCAG (link+disclosure = anti-pattern); FR-36-4 ✓ | VALIDATED — **note: top-level item becomes a button; its destination = the "view all" link inside the panel** | axe on open panel: no combo |

**Saved: catching CF-3 pre-dispatch (a build agent would have `import`ed an undefined helper) + the 4 pinned
decisions prevents a wave of mid-build stalls.** Build-time decisions to settle at their unit: CF-10 (block
choice at U1), CF-11 (apply rename throughout), CF-13 (record the safe-triangle deferral against FR-36-4),
CF-15 (the trigger-as-button UX).

## §1. Content model + variations

**SPEC.** `sgs/mega-panel` = a dynamic block (`render.php`, `save`→`<InnerBlocks.Content/>`). `variant` enum
`general | media-cards | brands` (PHP-validated, default `general`) drives the structure; each variation
ships a **fixed InnerBlocks template** under `templateLock:"contentOnly"` (client edits content + settings
only, never structure — §editor). WP-native block.json `variations` (mirror `sgs/button`) make each an
inserter/transform entry; `supports.sgs.variants` (mirror `sgs/hero`) declares each variation's
discriminating slots for converter emittability (seeded to `blocks.variant_attr`/`variant_slots` by
`/sgs-update`).

| variant | InnerBlocks template (our setup) | discriminating slots |
|---|---|---|
| `general` | N × group{ `sgs/heading`(optional) + `sgs/icon-list` } + optional aside{ `sgs/media`+heading+text+button } | `style`, `headings`, group blocks |
| `media-cards` | `sgs/card-grid` of coloured media cards ( `sgs/media`+title+desc+cta each ) | `itemBg`, card grid |
| `brands` | logo-tile grid ( `sgs/media` tiles ) + aside{ pill+text+button } | logo grid, aside |

`general` content = **GROUPS** (a heading + a link list each); the `style` toggle reshapes the same groups
(§3). `sectorsStyle` cards/list is DROPPED (Bean: nonsensical). Media = one `sgs/media` block (image/video/
audio) — never a separate axis.

---

## §2. Inspector (element sections × Spec 35 clusters)

**CURRENT (cited).** Spec 35 `supports.sgs.elements` is a **conformance CONTRACT a linter checks
(`scripts/check-element-manifest-conformance.js`), NOT a UI renderer** — no JS reads it. The inspector is
**hand-built per block in edit.js**. 6 live clusters (`scripts/consistency/cluster-member-sets.json:23`):
`text, fill, layout, position, motion, animation` + a states axis (`hover/focus/selected/pressed/disabled`).
`layer` field (OUTER/CONTENT/GRID/GRID_AREA) unlocks the 12 arrangement members — a grid element WITHOUT a
`layer` leaves `display/flex-*/grid-*` unchecked.

**SPEC.** Build BOTH, and they must agree (verify `node scripts/check-element-manifest-conformance.js` →
GAP/ORPHAN 0):
1. **Hand-built `edit.js`** — `InspectorControls` with **element-first panels** (one `PanelBody`/`ToolsPanel`
   per element, ordered), cluster subheadings inside each (layout/colour/typography/…). Mirror
   `sgs/card-grid/edit.js`.
2. **`supports.sgs.elements` manifest** in block.json. Elements + clusters + layer:

| element | label | clusters | layer | notes |
|---|---|---|---|---|
| `panel` | Panel | fill, layout | OUTER | root; `attrMap` for `bg`/`bgBlur`/`maxWidth`/`panelPadding`/`borderColour`/`borderRadius`; `isWrapper` |
| `grid` | Content grid | layout | GRID | `attrMap` for `columns`→`gridTemplateColumns`, `panelGap`→`gap` (camelCase ⇒ explicit attrMap or GAP) |
| `group-heading` | Group heading | text | — | `prefix:"heading"` (TypographyControls) |
| `link` | Link item | text, fill, layout | — | `prefix:"label"`+`desc`; `states.hover` (hover-wash bg) |
| `marker` | Marker | fill, text | — | icon/number/bullet |
| `card` | Card | fill, layout, text | — | media-cards; `itemBg`; `states.hover` (lift) |
| `aside` | Side panel | fill, layout, text | CONTENT | separator + format |
| `eyebrow` | Eyebrow/tag | text | — | `prefix:"tag"` (mono, D-B) |
| `cta` | CTA | text, fill, layout | — | `prefix:"cta"` |

Every declared cluster member MUST resolve to a real attr (explicit `attrMap` for camelCase) or the linter
scores GAP. Controls reuse: `ToggleGroupControl` (variant/style/headings/markerType/columns/colourScheme),
`DesignTokenPicker` (accent/colours, linked mode), `ResponsiveControl`+`ResponsiveBoxControls`, `TypographyControls`
(per element), `StateToggleControl` (hover), `MediaPicker`/`IconPicker`. `<ServerSideRender>` preview.

---

## §3. Layout (grids per variation × style — exact draft values)

Panel shell: `max-width` responsive (default 1120px; media-cards/brands 1080px), `border-radius` 20px
(general) — an attr; `border:1px solid var(--panel-border)`; shadow `0 30px 80px -30px rgba(0,0,0,.28), 0 2px
8px -2px rgba(0,0,0,.08)`; optional `backdrop-filter: saturate(1.5) blur(24px)` gated by `bgBlur`.

**general — reshaped by `style` (same groups):**
- `columns`: content `display:flex; gap:44px`; each group `flex:1; min-width:0`; **group heading shown**
  (eyebrow, mono 11px `.14em` uppercase muted, margin-bottom 16px); link row `display:flex;
  align-items:flex-start; gap:13px; padding:11px 12px; border-radius:13px`; marker chip 34px radius 10px;
  label 600 14.5px `-.01em`; desc 13px muted 1.4. Column count = #groups (or forced by `columns` 1/2).
- `cards`: content `display:grid; grid-template-columns:1fr 1fr; gap:12px; align-content:start`; **headings
  off**; card `padding:17px; border-radius:15px; border:1px solid var(--panel-border); background:var(--card)`;
  marker chip 36px radius 10px; label 600 15px; desc 13px muted.
- `minimal`: content `display:flex; flex-direction:column; gap:2px`; **headings off**; row `display:flex;
  align-items:center; justify-content:space-between; padding:15px 14px; border-radius:14px`; label big
  (heading family) 20px `-.02em`; desc 13.5px; trailing accent arrow.
- Aside (when `aside` on): `grid-template-columns: 1fr {asideW}` (340px; minimal 400px). See §7.

**media-cards:** `display:grid; grid-template-columns:repeat(4,1fr); gap:14px`; card `border-radius:18px;
padding:18px; min-height:270px; background:var(--item-bg)`; media `border-radius:12px; height:110px`;
title 17px 700; desc 13px 1.4; cta 13.5px 700.

**brands:** left `flex:1`: eyebrow + `grid-template-columns:repeat(4,1fr); gap:10px` logo tiles (`height:64px;
border-radius:12px; border:1px solid var(--panel-border); background:var(--card)`); aside `width:300px;
border-left:3px solid var(--accent)` (separator) + pill + desc + CTA.

**Breakpoints:** device tiers **768/1024** (viewport) + **container queries** on the panel for the in-drawer
narrow context (§8). All responsive VALUES in block attrs / `@media` / `@container` — never inline (Spec 32).

---

## §4. Colour + scheme

**Tokens (cited `theme.json`):** 16 palette slugs incl. `accent #F59E0B`, `primary #1F7A7A`, `text #1A202C`,
`text-muted #606D80`, `surface #FAF9F6`. CSS var `var(--wp--preset--color--{slug})`. `DesignTokenPicker`
`linked` mode stores slug-or-hex; `sgs_colour_value()` resolves + hex8-normalises (safecss strips rgba).

**SPEC — element colour roles → source:**

| role | light | dark (D-A option a) | source |
|---|---|---|---|
| text | `text` | `#f3f2ee` (mega dark set) | token / mega dark attr |
| muted | `text-muted` | `#9a9992` | token / mega dark attr |
| accent | picked (`DesignTokenPicker linked`, default `accent`) | same picked | reuse verbatim |
| soft | `color-mix(in srgb, var(--…accent) 10%, transparent)` | `…16%` | derived (D-C) |
| panel bg | mega attr, default token-based translucent surface | `rgba(20,20,25,.82)` | mega block attr (D-D) |
| card | mega attr, default `rgba(255,255,255,.6)` | `rgba(255,255,255,.04)` | mega block attr (D-D) |
| panel-border | mega attr, default token-based | `rgba(255,255,255,.11)` | mega block attr (D-D) |
| hover-wash | `color-mix(text 5%, transparent)` | `rgba(255,255,255,.07)` | derived |
| item-bg (cards) | `itemBg` per card (`DesignTokenPicker`) | same | reuse |

**Scheme (D-A RESOLVED):** `colourScheme` attr `auto|light|dark`. The panel root carries
`data-mega-scheme="{value}"`. The mega defines its own light custom-prop set (defaults) + a dark set. Selector
cascade (matches the theme's own dark-mode convention so a site switcher unifies everything):
```
.wp-block-sgs-mega-panel { /* LIGHT custom props — defaults */ }
/* forced dark (per-panel "set which is visible") */
.wp-block-sgs-mega-panel[data-mega-scheme="dark"] { /* DARK props */ }
/* auto → follow a SITE switcher */
:root[data-theme="dark"] .wp-block-sgs-mega-panel[data-mega-scheme="auto"] { /* DARK props */ }
/* auto → device default when no site switcher */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]):not([data-theme="dark"]) .wp-block-sgs-mega-panel[data-mega-scheme="auto"] { /* DARK props */ }
}
```
Forced `light` = the default light props (no dark selector matches). The mega SUPPLIES all values; it only
READS `[data-theme]`/`prefers-color-scheme`, so it works whether or not the theme dark-mode is enabled.
Contrast: every text-on-surface pairing run through
`sgs_wcag_preferred_text_colour_for_bg()` where the surface is operator-set (the accent-as-ground rule —
never accent-as-text). Indus: gold = `accent`, fixed brand blue = `primary` (both exact snapshot matches).

---

## §5. Typography

**CURRENT:** `TypographyControls` covers size/weight/style/line-height/decoration/transform/letter-spacing —
**NO font-family**. `sgs_typography_css_rule($attrs,$prefix,$selector)` emits scoped responsive CSS
(base + `max-width:1023px` + `max-width:767px`). Theme families: `body`(Inter), `heading`(Inter),
`display`(DM Serif Display), `dm-sans` — **no mono**.

**SPEC — per element (TypographyControls, prefix; family per D-F/D-B):**

| element | prefix | family (D-F) | default size/weight (draft) |
|---|---|---|---|
| group heading / eyebrow | `heading`/`eyebrow` | `mono` (D-B) for eyebrow; `heading` for big headings | 11px 500 `.14em` uppercase / 15–19px 600 |
| link label | `label` | body | 14.5px 600 `-.01em` |
| link desc | `desc` | body | 13px 400 1.4 |
| card title | `cardTitle` | heading | 17px 700 |
| card desc | `cardDesc` | body | 13px 1.4 |
| tag/pill | `tag` | `mono` (D-B) | 10–11px 700 `.04em` uppercase |
| cta | `cta` | body | 14px 700 |
| minimal label | `label` | `display` | 20px 500 `-.02em` |

Font sizes are ATTR defaults (null → theme wins per the responsive helper contract), never hardcoded in a way
that flattens a theme scale (F3b gate). Family set via theme.json element styles OR a wrapper `fontFamily`
(D-F). Add the `mono` slug per D-B (self-hosted woff2 in `theme/sgs-theme/assets/fonts/`).

---

## §6. Motion (5 net-new effects + entrance + hover)

**CURRENT (cited):** all 5 net-new; `src/shared/effects/` does not exist. Animation extension has 16 types +
IntersectionObserver (threshold 0.15) but its stagger is load/scroll-triggered (wrong trigger) and its
`--sgs-stagger` control is inert on a fresh block. Hover-effects extension transitions `box-shadow` (violates
our rule — do NOT reuse its transition list). Reduced-motion handled in both JS + CSS layers (reuse the gate
pattern). Every effect below: view-module JS writes CSS-var VALUES via `element.style.setProperty` (permitted,
NOT `style=""`), `transform`/`opacity` only, `prefers-reduced-motion` gate + static/JS-off fallback.

| effect | block | file | exact spec |
|---|---|---|---|
| **staggered reveal** (U4) | mega-panel (panel effect) | `src/shared/effects/stagger.js` + CSS | on panel-OPEN, children `opacity 0→1 + translateY(14px→0)`, 460ms, delay `min(i*28,320)ms`, `cubic-bezier(.16,.84,.32,1)` (D-E), `fill:backwards`; panel container `opacity 0→1 + translateY(-8px)scale(.99)→0/1`, 340ms. Opt-in `data-stagger`. Mobile items `translateX(24px→0)`, 420ms, delay `i*55ms` |
| **sliding indicator** (U5) | nav-menu (bar effect) | `src/shared/effects/nav-indicator.js` + CSS | one absolute pill, `transform:translateX({x}px) + width:{w}px` from active-trigger rect, transition `.38s cubic-bezier(.16,.84,.32,1) + opacity .25s`, `pointer-events:none`; reduced-motion → snap; static (o:0) until first open. NOT the existing per-link `scaleX` underline |
| **cursor spotlight** (U6) | mega-panel (aside) | `src/shared/effects/spotlight.js` + CSS | rAF-throttled mousemove → `setProperty('--mx',%)/('--my',%)`; CSS `radial-gradient(260px circle at var(--mx,50%) var(--my,30%), var(--soft), transparent 70%)` opacity .9; static default; reduced-motion/JS-off → static. Contrast-check text over the lifted zone (rule `an-effect-recomputes-every-contrast-above-it`) |
| **magnet label** (U7) | nav-menu (bar) | `src/shared/effects/magnet.js` + CSS | rAF mousemove → `--magnet-x = clamp(-8px, (clientX-centre)*0.15, 8px)`; CSS `transform:translateX(var(--magnet-x))`; label transition `transform .2s ease-out`; reduced-motion → off; opt-in `data-magnet` |
| **caret flip** | nav-menu (bar) | scoped `#uid` CSS on nav-menu | `transform:rotate(0→180deg)` on `[aria-expanded="true"]`, `transition:transform .3s var(--wp--custom--easing--... )` — 300ms = theme `medium` token exactly (reuse); reduced-motion → snap |
| **card hover-lift** | mega-panel | scoped CSS (NOT the hover-effects ext, §current) | `transform:translateY(-3px)` + border-color→accent + a **pre-rendered shadow on `::after` faded via `opacity`** (never `box-shadow` transition); transition `transform .2s, opacity .3s` |

**Disclosure timing (feeds §9):** hover-intent open default **300ms** (attr 100–500), close-grace **170ms**,
cancel-on-enter, bar+panel hover bridge.

---

## §7. States (Spec 35 states axis)

`hover → :hover`, `focus → :focus-visible` (≥3:1 ring, SC 1.4.11), `selected/current →
[aria-current="page"],.is-active`, `pressed → :active`, `disabled → :disabled`. Declared PER ELEMENT in the
manifest `states` block (never name-parsed). Active-trail: `aria-current="page"` computed **client-side**
(LiteSpeed caches server value — FR-36-11). Featured item (FR-36-4): `featuredColour` (label form) /
`featuredBg` (pill form), pill fg contrast-checked via `sgs_wcag_preferred_text_colour_for_bg()`. No
colour/motion-only state; forced-colors survival (borders/rings don't vanish).

---

## §8. Aside component + mobile-in-drawer

**Aside (§3 side column):** `aside` toggle; `asideFormat` = `feature` (media+tag+title+desc+cta, cursor
spotlight §6) / `preview` (hover-reactive: shows the hovered link's title/desc) / `cta` (pill+desc+cta, the
brands style); `asideSeparator` object (none/line + colour + width — the `border-left` divider). Content =
`sgs/media` + heading + text + button in the aside slot.

**Mobile-in-drawer (content-preserving, container-query driven — `@container` on the panel; the drawer is
narrower than the viewport, `STOP-CONTAINER-TIER-IS-NOT-VIEWPORT`; viewport 768/1024 fallback):**
- `general`: groups → single stacked column, **headings + descriptions KEPT** (never the drafts' flatten-to-
  links).
- `media-cards`: single column of **squarer** cards (aspect tuned to content, not strict 1:1 — D). 
- `brands`: fewer logo columns (2–3) + CTA aside below.
- **aside → stacks HORIZONTALLY** (media beside text, compact row) below the content; a media-heavy `feature`
  aside MAY go full-width-media on the narrowest tier.
- Drawer render mechanism: **auto drill-down for a tall/rich panel, inline-accordion for a short one.**
  Nothing hidden (`degrade-to-more-content-never-less`).

---

## §9. Disclosure behaviour (net-new-additive on `store('sgs/nav')`)

**CURRENT (cited):** `store('sgs/nav')` is drawer-only (`openDrawer/closeDrawer/toggleDrawer` + `state.isOpen`
+ context `{isOpen,drawerRef}`); has focus-trap/scroll-lock(D340)/body-reparent(D323)/exit-animation/ESC(cancel)/
reduced-motion — REUSE all unchanged. Recovered old `mega-menu/view.js` (git `23a3cf63^`, scratch) has
`repositionPanel()` (edge-overflow / right-align / full-width top-align via CSS var) + hover-toggle +
single-open + focus mgmt — adapt as the starting point; REBUILD its `role=menu` → disclosure.

**SPEC (add to the store):** hover-intent (open-on-hover non-touch / tap-on-touch / keyboard-throughout;
300ms intent, 170ms close-grace, cancel-on-enter, bar+panel bridge); a **positioned dropdown/mega** mode
(anchored under the trigger, content-sized, `max-width` bound, edge-overflow reposition from the recovered
`repositionPanel`) DISTINCT from the full-screen drawer; `<button aria-expanded>`/`aria-controls` (NEVER
`role=menu`, FR-36-10); a **safe-triangle** hover path (not just the flat delay); ESC + focus-return; WCAG
1.4.13 (dismissible/hoverable/persistent). nav-menu render.php resolves a mega item via
`Sgs_Mega_Menu_CPT::resolve_panel_for_menu_item($item)` (`object_id`) → `do_blocks()` the panel at the item's
REAL position (not last) → degrade to plain link on null (FR-36-9a). No top-level fn in render.php (D374).
Crawlable server HTML, no AJAX/lazy-load (FR-36-17).

---

## §10. Cross-cutting (bind every unit)
Standalone (no `SGS_Container_Wrapper`, D294 deviation recorded) · no inline `style=""` (Spec 32; effects
write CSS-var VALUES) · `transform`/`opacity` motion only · `prefers-reduced-motion` on every effect · WCAG
2.1 AA (+2.2; 44px; forced-colors) · crawlable/no-AJAX · `<50KB JS / <100KB CSS`, no CLS · UK English · no
version bump / deprecation (D270) · DB-first · every attr has an inspector control (a setting needing code is
not done). **SECURITY (CF-2, binding): every colour/token attr → `sgs_colour_value()`; every free dimensional
attr → the `$sgs_nm_css_length`/`$sgs_nm_css_keyword` regex `nav-menu/render.php` already uses; every text/URL
attr rendered OUTSIDE a child SGS block → `esc_html()`/`esc_url()`; NEVER concatenate a raw attribute into the
scoped `<style>`; no `.innerHTML` of panel-derived content in view.js. Recursion guard on the render path (CF-1).**
