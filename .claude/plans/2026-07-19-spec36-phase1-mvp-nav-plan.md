---
doc_type: plan
project: small-giants-wp
phase: "Spec 36 Phase 1 — MVP nav (Mama's end-to-end)"
spec: specs/36-SGS-NAVIGATION-SYSTEM.md §7 Phase 1 + §8 Gate-1 + §12
date: 2026-07-19
status: DRAFT — pending Bean approval
---

# Phase 1 — MVP Navigation (Mama's end-to-end, classic menu)

**USP:** The first *demoable* SGS nav — a real menu bar + accessible mobile drawer live on Mama's, proving the Spec 36 architecture end-to-end before a single line of the mega/pipeline plumbing is built. Everything after this phase extends a working, gated foundation instead of a spec.

**Plan label:** `[PLAN: opus]` (novel a11y-critical drawer + shared-store shape; the rest delegates down)
**Docscore:** (self-reviewed; formal /docscore available on request)
**Aggregate effort estimate:** ~2.5–4 hrs wall-time if the parallel waves are dispatched (the drawer + store are the only Opus-heavy pieces; salvage collapses ~40% of the naive build).

**Model tiering key (Bean's scheme):** **T0** = Python script · **T1** = Haiku · **T2** = Sonnet · **T3** = Opus. Mixes shown as `T3→T2` (shape at the higher tier, finish/delegate at the lower).

---

## Phase success criteria (Gate-1 — done when)
- [ ] Mama's live: flat **5-item classic-menu** bar + a **featured** item + a **cart badge** (`role="status"`).
- [ ] Mobile → burger → **full-screen modal drawer** (accordion) + CTA + **logo basics**.
- [ ] `axe` = **0 violations** on the OPEN drawer.
- [ ] `elementFromPoint` occlusion sweep = **10/10 Mama's** (every drawer link returns itself; everything below the header unreachable).
- [ ] **Crawl assertion**: every bar link present in the pre-JS server HTML (no AJAX).
- [ ] `wp-perf-gate`: JS < 50 KB / CSS < 100 KB per page; no CLS.
- [ ] `forced-colors` + `prefers-reduced-motion` sweep passes; no-JS `<details>` drawer fallback works.
- [ ] **Zero inline `style=` property declarations** on either new block (Spec 32 lint = 0).
- [ ] **Bean's eye** (R-31-13): cropped before/after screenshot pair approved.

**EXCLUDED (Phase 2/3 — do NOT build here):** mega CPT, safe-triangle/hover-intent, priority+/bottom-tab-bar collapse modes, mini-cart drawer, the specialised header/footer **converter pipeline** (FR-36-15 — built *after* the nav passes Gate-1).

---

## Entry context (read before starting)
- `specs/36-SGS-NAVIGATION-SYSTEM.md` — the governing spec, **read END TO END** (Bean-locked full-read gate). Phase-1 FRs: 1,2,6,7,8,9,9a,10,11,12,13,14,17,18,19,22 + §8a build notes.
- `reports/2026-07-19-P2.5-phase6.5-salvage-audit.md` — **what to PORT vs BUILD** (the load-bearing input; cited per step).
- `plugins/sgs-blocks/src/blocks/adaptive-nav/view.js` — **salvage source** (D323 reparent L108-117; D340 lockScroll L285-305/unlockScroll L312-324; freeze L208-261; open/close skeleton L119-192). RETIRED block — read-only source.
- `plugins/sgs-blocks/src/blocks/mega-menu/view.js` — 2nd focus-trap impl (merge, don't copy).
- `plugins/sgs-blocks/includes/class-sgs-nav-menu-source.php` — the menu resolver (`NAV_BLOCK_NAMES` L44 hardcode → DB-first).
- `.claude/plans/block-migration-DONE-checklist.md` — the 11 end-conditions every block must meet.
- `.claude/plans/2026-07-09-per-block-no-inline-migration-contract.md` — the no-inline contract (Spec 32).
- `CLAUDE.md` deploy section + `.claude/dev-setup.md` — `build-deploy.py --target sandybrown` (THE deploy path).

**References:**
- Spec 32 (no-inline) · Spec 35 Part L (control-completeness) + Part G (Responsive-Visibility, templateLock) · Spec 17 (`--sgs-header-height` + `is-header-scrolled/shrunk` body classes — the header's published surface) · WCAG 2.1 AA (+2.2; 44px; forced-colors survival).
- D323/D340 (drawer fixes) · D270 (same-slug rebuild, no migration) · D293 (no version bumps pre-production) · D338 (WP silently discards undeclared attrs) · memory `ssr-fixes-hand-built-preview-drift` (ServerSideRender preview).

**Tooling Index:**
| Type | Name | Used in |
|---|---|---|
| skill | /delegate | model pick per dispatched step |
| skill | /sgs-wp-engine + /wp-blocks + /sgs-db | block build + schema ground truth |
| skill | /sgs-update | Step 9 (register new block, prune stale rows) |
| skill | /qc-council | Gate-2 (converter/pipeline/SGS-block multi-rater) |
| cli/script | build-deploy.py --target sandybrown | Step 8 deploy |
| script | scaffold-block.py (T0) | Step 4 skeleton |
| script | check-no-inline / axe / elementFromPoint / wp-perf-gate | QA gates + Gate-1 |
| mcp | Playwright | Step 10 editor cutover + Gate-1 live DOM |
| agent | wp-sgs-developer | Steps 2,3,5,6,7,10 |

---

## FR → Step traceability (every Phase-1 FR is delivered by ≥1 step)
| FR | Requirement (Phase-1 slice) | Delivered by | Verified by |
|---|---|---|---|
| FR-36-1 | Classic-menu data + picker + default + bar↔drawer inherit | Step 3, 6 | Gate-2, Step 11 |
| FR-36-2 | Phase-1 block roster (bar + drawer + store) | Steps 5, 6, 7 | Gate-2 |
| FR-36-6 | Drawer full-screen modal + close-as-chrome + D323/D340 + FR-34-5 settings + dialog a11y | Step 7 | Gate-2, Step 11 (axe/elementFromPoint) |
| FR-36-7 | Shared `store('sgs/nav')` utility (merged focus-trap) | Step 5 | Gate-2 (3 call-sites) |
| FR-36-8 | burger→drawer collapse mode + collapse-point N | Step 6 | Step 11 (non-default-N sweep) |
| FR-36-9/9a | nav→header decoupling; drawerRef integrity | Step 6, 7 | Gate-2, Step 11 |
| FR-36-10 | Drawer = DIALOG (native `<dialog showModal>`) | Step 7 | Step 11 (axe) |
| FR-36-11 | WCAG (client-side aria-current, labels, 44px, focus-visible, forced-colors) | Steps 6, 7 | Step 11 |
| FR-36-12 | Operator a11y notices INFORMATIONAL only | Steps 6, 7 | Gate-2 |
| FR-36-13 | No inline styling (Spec 32) | Steps 6, 7 | Gate-2 (lint=0) |
| FR-36-14 | Control-completeness (Part L) + ServerSideRender preview | Steps 6, 7 | Gate-2 (DONE-checklist) |
| FR-36-17 | Crawlable, server-rendered, no-AJAX | Steps 6, 7 | Step 11 (crawl assertion) |
| FR-36-18 | Cutover: re-author Mama's via EDITOR + light rollback | Step 10 | Step 11 |
| FR-36-19 | Cart Phase-1 = `role="status"` only | Step 1 | Gate-1 checklist |
| FR-36-22 | Logo basics (left-align, link-home, per-device image, functional alt) | Step 2 | Step 11, Bean's eye |
| §8a | `NAV_BLOCK_NAMES` → DB-first; prune stale `block_composition` rows | Step 3, 9 | Gate-2, /sgs-db |

---

## Parallelisation map (Bean's rule: same time only if different files + not interdependent + no forward dep)

```
WAVE 0  (all PARALLEL — 6 disjoint files, zero cross-dependency)
  Step 1  cart/render.php              [T1]   role="status"
  Step 2  responsive-logo/*            [T2]   logo basics
  Step 3  class-sgs-nav-menu-source.php[T2]   DB-first source
  Step 4  nav-drawer/ (scaffold)       [T0]   empty skeleton
  Step 5  src/shared/nav-interactivity [T3]   the store SHAPE  ← foundational (publishes the API contract)
  Step 5b scripts/nav-qa/              [T2]   QA gate scripts (axe/elementFromPoint/crawl/logical-lint)
        └─ QA Gate 1 (build + lint green)
WAVE 2  (PARALLEL — 2 disjoint blocks, both dep on Step 5 only, NOT on each other)
  Step 6  nav-menu/*                   [T2]   flat bar + burger (dep: 3,5)
  Step 7  nav-drawer/*                 [T3→T2] drawer build   (dep: 4,5)
        └─ QA Gate 2 (blocks build + controls + no-inline + isolated axe)
WAVE 3  (SEQUENTIAL — shared live state)
  Step 8  deploy canary               [T0]   (dep: 1,2,6,7)
  Step 9  /sgs-update                 [T0]   register + prune (dep: 8)
  Step 10 editor cutover Mama's       [T2]   Playwright (dep: 8,9)
        └─ QA Gate 3 (live smoke)
WAVE 4  (SEQUENTIAL — the exit gate)
  Step 11 Gate-1 full QC              [T0+T2]  axe/elementFromPoint/crawl/perf (dep:10)
  Step 12 Bean's eye                  [T3]   cropped pair — HANDOFF (dep:11)
```
**File-overlap check:** Steps 1/2/3/4/5/5b touch 6 disjoint paths (cart · responsive-logo · class-sgs-nav-menu-source.php · nav-drawer skeleton · src/shared/nav-interactivity · scripts/nav-qa) ✓. Steps 6/7 touch `nav-menu/` vs `nav-drawer/` — disjoint ✓ (Step 6 *references* the drawer's ID at runtime via `drawerRef`, no shared file). No step depends on a later step ✓.

---

## Steps

### WAVE 0 — Independent foundations (PARALLEL)

**Step 1 — Cart live-region: add `role="status"`**
- Tier/Model: **T1 (Haiku)**
- Action: Add `role="status"` to the badge `<span>` at `cart/render.php:203` (already has `aria-live="polite" aria-atomic="true"`). One attribute, no other change.
- Files: `plugins/sgs-blocks/src/blocks/cart/render.php`
- Inputs: salvage audit §Cart (verified gap); FR-36-19.
- Outcome: the badge announces the whole "N items" string (WCAG 4.1.3).
- Exec: PARALLEL with 2,3,4,5 · Deps: none · Marker: **SESSION-START** (smallest first, <5 min) · Time: 3 min
- Tooling: Edit
- On-Fail: revert the one-line edit (`git checkout -- cart/render.php`).
- Test — Happy: grep confirms `role="status"` on the badge node. Edge: node still renders when `hideWhenEmpty` true (attr present, hidden). Fail: no other `role=` introduced. Integration: with a live cart, screen-reader announces count on add-to-cart.

**Step 2 — Logo basics (extend `sgs/responsive-logo`)**
- Tier/Model: **T2 (Sonnet)** via `wp-sgs-developer`
- Action: Extend the block: (a) explicit **left-align default**; (b) **functional alt** default template `"[Business] home"` (never "logo") AND drive the wrapping `<a>`'s `aria-label` *distinctly* from `<img alt>`; (c) keep the already-built per-device image upload + SVG-sanitise; (d) add per-tier `maxWidth`/`maxHeight` box attrs; (e) `imageControls: true` present. No inline styles; ServerSideRender preview.
- Files: `plugins/sgs-blocks/src/blocks/responsive-logo/{render.php,edit.js,block.json,style.scss}`
- Inputs: salvage audit §Logo (per-device image BUILT; gaps: max-per-tier, alt-home, left-align); FR-36-22 MUST list.
- Outcome: logo renders left-aligned, links home, functional alt, per-tier max box — all via scoped `<style>`.
- Exec: PARALLEL with 1,3,4,5 · Deps: none · Marker: (none) · Time: 25 min
- Tooling: /sgs-wp-engine, /wp-blocks, Edit
- On-Fail: revert the block dir; the pre-Phase-1 logo still works.
- Prompt: (dispatch via /subagent-prompt at execution — embed: salvage §Logo verbatim + FR-36-22 + no-inline contract + "per-device image is ALREADY built, do NOT rebuild it; ADD max-per-tier + alt-home + left-align default").
- Test — Happy: 375/768/1440 renders correct file + max box per tier; `<a aria-label="Mama's Munches home">`. Edge: no logo set → renders site-title fallback, not broken `<img>`. Fail: SVG upload strips scripts (`wp_kses`). Integration: appears in Mama's header + the drawer default template.

**Step 3 — Menu source: DB-first (`SGS_Nav_Menu_Source`)**
- Tier/Model: **T2 (Sonnet)** via `wp-sgs-developer`
- Action: Replace the hardcoded `NAV_BLOCK_NAMES = ['sgs/adaptive-nav','core/navigation']` const (L44) with a **DB/registry-driven** resolver (R-31-1); add `sgs/nav-menu` as the recognised block; keep the classic `register_nav_menus` → first/most-recent-menu default resolution (NOT `get_nav_menu_locations()` on a block menu — the v1.2 error).
- Files: `plugins/sgs-blocks/includes/class-sgs-nav-menu-source.php`
- Inputs: salvage audit §Nav-core Claim B; FR-36-1; §8a fact-check.
- Outcome: menu resolution finds the chosen classic menu with no hardcoded block-name list.
- Exec: PARALLEL with 1,2,4,5 · Deps: none · Marker: (none) · Time: 25 min
- Tooling: /sgs-db, /wp-blocks, Edit
- On-Fail: revert; resolver falls back to prior behaviour (no live block uses the new name yet).
- Prompt: (dispatch via /subagent-prompt — embed salvage §Nav-core Claim B + R-31-1 + "route off DB/registry, not a PHP const").
- Test — Happy: a classic 5-item menu resolves via the new path. Edge: no registered location → first/most-recent menu. Fail: no menu at all → page-list fallback, no fatal. Integration: `sgs/nav-menu` render.php (Step 6) reads through this.

**Step 4 — Scaffold `sgs/nav-drawer` skeleton**
- Tier/Model: **T0 (Python script)**
- Action: Generate a new block skeleton at `src/blocks/nav-drawer/` (block.json stub with slug/`apiVersion`/`supports.sgs` flags incl. `containerKind:section`, empty render.php/edit.js/save.js/view.js/style.scss) from the standard SGS block template. Enables Step 7 to build without scaffolding churn and keeps the dir disjoint from every Wave-0 file.
- Files: `plugins/sgs-blocks/src/blocks/nav-drawer/*` (new dir)
- Inputs: existing block template; Spec 36 FR-36-2 (drawer = section/layout KIND, keeps `SGS_Container_Wrapper`).
- Outcome: an empty but registrable `sgs/nav-drawer` skeleton; `npm run build` succeeds.
- Exec: PARALLEL with 1,2,3,5 · Deps: none · Marker: (none) · Time: 5 min
- Tooling: wp-scaffold script (or /wp-scaffold)
- On-Fail: delete the new dir.
- Test — Happy: block registers, appears in inserter (empty). Edge: build passes with the stub. Fail: n/a. Integration: Step 7 fills it in.

**Step 5 — Shared `store('sgs/nav')` utility (the SHAPE)**
- Tier/Model: **T3 (Opus)** via `wp-sgs-developer` (a11y-critical, expensive-to-undo, MERGE not copy)
- Action: Create a **new shared viewScriptModule** `src/shared/nav-interactivity/store.js` registering `store('sgs/nav', …)` with ONE open/close/focus/`inert`/intent-timing API for the dialog surface. **PORT VERBATIM** from `adaptive-nav/view.js`: `reparentToBody` (D323, L108-117), `lockScroll`/`unlockScroll` (D340, L285-305/312-324), `freezeBackground`/`unfreezeBackground` (L208-261), open/close skeleton (L119-192). **MERGE** the focus-trap/keyboard layer from adaptive-nav + mega-menu into ONE `FOCUSABLE_SELECTOR` + Tab-handling (they currently disagree — salvage Claim D). Add the build-config entry so both blocks import it. Prove it's a UTILITY (documented call-sites: drawer open, drawer close, burger toggle).
- Files: `plugins/sgs-blocks/src/shared/nav-interactivity/store.js` (new) + `webpack.config.js` (ONLY if a shared script-handle proves necessary — default path is relative ES import, no webpack edit). **Publishes the frozen store API contract** (`actions.openDrawer/closeDrawer/toggleDrawer`, `state.isOpen`, directive names) that Steps 6+7 code against.
- Inputs: salvage audit §Nav-core Claim A + Claim D (the merge instruction); FR-36-7.
- Outcome: a single importable store; the D323/D340 fixes preserved byte-faithful; one focus-trap impl.
- Exec: PARALLEL with 1,2,3,4 · Deps: none · Marker: (none) · Time: 40 min
- Tooling: /sgs-wp-engine, Read (adaptive-nav+mega-menu view.js), Write
- On-Fail: revert — zero live impact ONLY pre-Wave-2. Once Steps 6/7 land they hard-depend on the export shape; a post-Wave-2 revert breaks the build, so revert 6/7 together with 5.
- Prompt: (dispatch via /subagent-prompt — embed salvage Claim A code quotes + Claim D "merge don't copy" + "PORT D323/D340 verbatim, do NOT re-derive" + "PUBLISH the exact action/state names first — Steps 6/7 build against them in parallel").
- Test — Happy: unit-invoke open→focus-into→ESC→close→focus-return in a jsdom/Playwright harness. Edge: transformed ancestor → drawer still escapes (D323). Fail: overlay-scrollbar platform → lockScroll no-op branch (D340). Integration: imported by Steps 6 + 7.

**Step 5b — QA tooling prep (build the gate scripts)**
- Tier/Model: **T2 (Sonnet)** (authoring) — mechanical parts T0
- Action: Build the Gate-1 tooling into a new `plugins/sgs-blocks/scripts/nav-qa/` dir (disjoint from every block; buildable before the blocks exist): (a) `axe-run.mjs` — Playwright injects `axe-core` via `addScriptTag` + runs `axe.run()` on a target URL/selector, exits non-zero on violations; (b) `elementfrompoint-sweep.mjs` — the Spec 36 §8 occlusion methodology (probe the header row → toggle/close; each drawer link at its centre → itself; below-header probes → scrim/inert), asserts N/N; (c) `crawl-assert.mjs` — fetch pre-JS HTML, assert every bar link present; (d) `logical-props-lint.py` — grep the two blocks' CSS for physical props that should be logical (`margin-left/right`, `left/right`) → warn. `wp-perf-gate` is the existing global skill (no build). Author these from the Spec 36 §8 spec text; do NOT wait for the blocks.
- Files: `plugins/sgs-blocks/scripts/nav-qa/*` (new dir)
- Inputs: Spec 36 §8 / FR-36-16 gate methodology; the elementFromPoint baseline (10/10 Mama's).
- Outcome: runnable QA scripts ready so Step 11 RUNS not BUILDS them (fixes the load-bearing gap the peer review found).
- Exec: PARALLEL with 1,2,3,4,5 · Deps: none · Marker: (none) · Time: 40 min
- Tooling: Playwright, axe-core (npm add as devDep), Python
- On-Fail: delete the dir; Step 11 falls back to manual checks (slower, not blocked).
- Test — Happy: each script runs against a known page and returns a sane pass/fail. Edge: axe-run on a deliberately-broken fixture returns non-zero. Fail: missing target URL → clear error, not a crash. Integration: Step 11 + Gate-2 call these.

**QA Gate 1 — Wave-0 build + lint green**
- Model: **T0** · Exec: SEQUENTIAL · Deps: 1–5b
- Check: `cd plugins/sgs-blocks && npm run build` (exit 0) **AND** `python scripts/.../check-no-core-blocks.py` clean **AND** `git -C <worktree> diff --name-only` shows only the 6 expected disjoint paths.
- Pass: build exits 0; no new inline-style violations introduced by Steps 1–5b; file set disjoint (parallel-correctness proof).
- Fail: fix the offending step before Wave 2. · Marker: QA

### WAVE 2 — The two blocks (PARALLEL)

**Step 6 — Rebuild `sgs/nav-menu` (flat bar + burger)**
- Tier/Model: **T2 (Sonnet)** via `wp-sgs-developer` (rebuild with strong prior art)
- Action: Same-slug rebuild (D270 — read the existing 617-line render.php for structure, then rebuild fresh; no deprecation). Render the resolved classic menu as: **desktop horizontal bar** of real `<a href>` (flat — NO submenus this phase); **below collapse-point N** a **burger** (`<button aria-expanded aria-controls>` → `drawerRef`). Controls: menu picker (`ref`), collapse-point N (visual bp, default 768 — DISTINCT from device tiers), **`featuredItemIds`** array attr + inspector checklist of the resolved menu's items (operator ticks featured items; render.php maps IDs → featured style — KJC resolved B), `labelCollapse` reuse. Client-side `aria-current="page"` (LiteSpeed-safe). No inline styles; scoped `<style>` via `SGS_Container_Wrapper`; ServerSideRender editor preview. Import `store('sgs/nav')` for the burger→drawer open.
- Files: `plugins/sgs-blocks/src/blocks/nav-menu/{render.php,edit.js,block.json,view.js,style.scss}`
- Inputs: Step 3 (source), Step 5 (store); salvage §Nav-core (nav-menu is a rebuild, already Spec-32-clean); FR-36-1,2,8,11,13,14,17.
- Outcome: a flat classic-menu bar that collapses to a burger opening the drawer; crawlable; zero inline.
- Exec: PARALLEL with 7 · Deps: 3, 5 · Marker: (none) · Time: 45 min
- Tooling: /sgs-wp-engine, /wp-blocks, /sgs-db, Playwright (editor preview check)
- On-Fail: revert nav-menu dir; the pre-Phase-1 nav-menu still registers (dormant).
- Prompt: (dispatch via /subagent-prompt — embed FR-36-1/8/11/17 + no-inline contract + DONE-checklist + "flat bar ONLY, no dropdowns/mega; burger opens drawerRef via store('sgs/nav')" + "aria-current computed CLIENT-side, LiteSpeed cache").
- Test — Happy: 5-item menu renders as a bar ≥768, burger <768; burger opens the drawer. Edge: dangling `drawerRef` → editor Notice + burger no-op-with-warning (FR-36-9a). Fail: no menu → page-list fallback, crawlable. Integration: reads Step 3 source; opens Step 7 drawer.

**Step 7 — Build `sgs/nav-drawer` (full-screen modal)**
- Tier/Model: **T3→T2 (Opus shape → Sonnet finish)** via `wp-sgs-developer`
- Action: Build the new dynamic block into the Step-4 skeleton: **full-screen `<dialog showModal>` modal** (Bean default); InnerBlocks content default template `[['sgs/nav-menu'],['sgs/responsive-logo'],['sgs/button']]` (CTA=`sgs/button`; "optional"=deletable), `templateLock:false`; **× close is CHROME** — `save.js` returns `<InnerBlocks.Content/>` only, render.php emits the fixed `×` as a sibling of `$content` INSIDE `<dialog>` but OUTSIDE the editable zone (undeletable by construction); `edge:full-screen` only this phase (partial `left/right/top`+`width` declared, default full, not gate-tested); consume `store('sgs/nav')` (Step 5) for open/close/focus/inert/scroll-lock; **drawer-settings surface (FR-34-5 carried)** — `drawerBg`/`toggleCloseColour`/`drawerAlign`/`drawerGap`/`drawerPadding` via `ResponsiveControl`, all scoped `<style>`; accordion submenu model (mostly inert for flat Phase-1 menu but wired); no-JS `<details name>` fallback; dialog a11y (focus-into, Tab contained, ESC, focus-return-to-burger, body-scroll-lock incl. iOS, `::backdrop`, `forced-colors` survival); ServerSideRender preview. No inline styles; keeps `SGS_Container_Wrapper`.
- Files: `plugins/sgs-blocks/src/blocks/nav-drawer/{render.php,edit.js,block.json,view.js,style.scss}`
- Inputs: Step 4 (skeleton), Step 5 (store); salvage §Nav-core (drawer=build-new; PORT via the store); FR-36-6,10,11,13,14 + FR-34-5.
- Outcome: an accessible full-screen modal drawer, close-as-chrome, drawer-settings controls, zero inline.
- Exec: PARALLEL with 6 · Deps: 4, 5 · Marker: (none) · Time: 60 min
- Tooling: /sgs-wp-engine, /wp-blocks, Playwright (open-drawer axe smoke)
- On-Fail: revert nav-drawer dir + its /sgs-update registration.
- Prompt: (dispatch via /subagent-prompt — embed FR-36-6 verbatim + FR-34-5 table + "× is CHROME outside InnerBlocks, undeletable" + "consume store('sgs/nav'), do NOT re-implement focus-trap/scroll-lock" + no-inline contract + DONE-checklist).
- Test — Happy: burger opens full-screen modal; ESC closes + focus returns; Tab contained. Edge: transformed header ancestor → drawer still on top (D323 via store). Fail: JS off → `<details>` accordion still navigable; links crawlable. Integration: holds the Step-6 nav-menu + Step-2 logo.

**QA Gate 2 — Blocks build, controls complete, no-inline, isolated a11y**
- Model: **T2 (Sonnet)** + `/qc-council` (SGS-block multi-rater, per blub.db 255) · Exec: SEQUENTIAL · Deps: 6, 7
- Check: `npm run build` exit 0 · `check-no-inline` = **0** on both blocks · every block-migration-DONE-checklist item ✓ (all 11) · `ServerSideRender` preview renders in the editor (not a static snapshot) · axe on the **isolated** drawer (test page) = 0 · schema round-trip (block.json ↔ emitted attrs, D328/D338) · no undeclared attrs emitted.
- Pass: all green; /qc-council returns no must-fix on the two blocks.
- Fail: return to Step 6 or 7 with the specific finding. · Marker: QA

### WAVE 3 — Integrate + deploy + cutover (SEQUENTIAL)

**Step 8 — Build + deploy to canary**
- Tier/Model: **T0 (Python script)**
- Action: `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` (THE one path; carries dirty-tree gate + fail-closed verify + OPcache reset). Commit the built blocks to `main` via the isolated worktree first (shared-worktree rule).
- Files: build artefacts + deploy (no src changes)
- Inputs: Steps 1,2,6,7 committed.
- Outcome: new blocks live on sandybrown (Mama's canary).
- Exec: SEQUENTIAL · Deps: 1,2,6,7 · Marker: **SESSION-START** (clean re-entry after build) · Time: 10 min
- Cold-Entry: this plan + salvage audit + Spec 36 §7/§8.
- Tooling: build-deploy.py
- On-Fail: `.bak` rollback rotation (built into build-deploy.py); never hand-roll tar/scp (D336).
- Test — Happy: blocks appear in the canary editor inserter. Edge: WooCommerce absent → cart renders nothing (D338 gate). Fail: verify step catches a broken deploy → auto-rollback. Integration: Step 10 uses the live editor.

**Step 9 — Register + prune DB (`/sgs-update`)**
- Tier/Model: **T0 (Python script)**
- Action: Run `/sgs-update` to register `sgs/nav-drawer`, refresh the block reference, and **prune the stale `block_composition` rows** (`sgs/mobile-nav`, `sgs/mobile-nav-toggle`) + the banned `core/navigation` in `site-header-row`'s allowed-list (§8a).
- Files: `sgs-framework.db` (DB), `specs/02-SGS-BLOCKS-REFERENCE.md` (auto-regen)
- Inputs: Step 8 (blocks live); §8a DB-drift list.
- Outcome: DB roster reflects the new block; stale nav rows gone.
- Exec: SEQUENTIAL · Deps: 8 · Marker: (none) · Time: 5 min
- Tooling: /sgs-update, /sgs-db
- On-Fail: `/sgs-update` is idempotent; re-run.
- Test — Happy: `/sgs-db block sgs/nav-drawer` returns the block. Edge: `sgs/mobile-nav` row absent after prune. Fail: n/a (read-mostly). Integration: converter/roster consumers see the new block.

**Step 10 — Cutover Mama's header via EDITOR (not WP-CLI)**
- Tier/Model: **T2 (Sonnet)** via `wp-sgs-developer` + Playwright
- Action: In the sandybrown block editor (Playwright, app-password login), re-author Mama's header: place `sgs/nav-menu` (bound to a classic 5-item menu + one **featured** item) + burger → `sgs/nav-drawer` (accordion + CTA + logo basics). **Never** WP-CLI `post_content` (D270). **Light rollback:** leave the `sgs/adaptive-nav` registration DORMANT (fast revert path) — do NOT delete it this phase.
- Files: (live) Mama's header template part / `sgs_header` — via editor, no repo file
- Inputs: Steps 8,9; FR-36-18; canary creds `.claude/secrets/sandybrown.env`.
- Outcome: Mama's header runs on the new blocks; old block still registered (dormant) for rollback.
- Exec: SEQUENTIAL · Deps: 8, 9 · Marker: (none) · Time: 30 min
- Tooling: Playwright MCP, /sgs-db
- On-Fail: revert the header to `sgs/adaptive-nav` in the editor (dormant registration makes this instant).
- Prompt: (dispatch via /subagent-prompt — embed sandybrown creds path + "editor ONLY, never WP-CLI post_content, D270" + "keep adaptive-nav registered dormant").
- Test — Happy: Mama's homepage shows the new bar + drawer. Edge: a menu item with no URL → renders safely. Fail: block error → revert to adaptive-nav. Integration: Gate-1 (Step 11) measures this live page.

**QA Gate 3 — Live smoke**
- Model: **T0** · Exec: SEQUENTIAL · Deps: 10
- Check: `curl -s <mamas-url>` (cache-cleared) shows the 5 bar links in raw HTML; Playwright confirms burger opens the drawer.
- Pass: bar links in pre-JS HTML; drawer opens. Fail: return to Step 6/7/10. · Marker: QA

### WAVE 4 — Gate-1 acceptance (the exit gate)

**Step 11 — Gate-1 full QC sweep**
- Tier/Model: **T0 (scripts) + T2 (Sonnet) synthesis** (the elementFromPoint/axe/crawl/perf scripts run T0; a Sonnet reviewer synthesises pass/fail)
- Action: **RUN the Step-5b nav-qa scripts** (already built) — cache-clear FIRST (`hosting_clearWebsiteCacheV1` + `wp litespeed-purge all`): `axe-run.mjs`=0 on OPEN drawer; `elementfrompoint-sweep.mjs` = **10/10 Mama's**; `crawl-assert.mjs` (all bar links in pre-JS HTML); `logical-props-lint.py` (RTL readiness — Phase-1 = logical-props present, NOT a visual RTL sweep); `wp-perf-gate` skill (JS<50KB/CSS<100KB, no CLS); **ESC-close + focus-return-to-burger + Tab-containment** assertion; **scroll-lock frame sweep** (viewport position unchanged after close); **drawer geometry** (full-screen fills viewport at 375/768/1440); **late-CSS A/B** (a late-loaded stylesheet can't break the open drawer); 375/768/1440 + a **non-default collapse-N** sweep; `forced-colors` + `prefers-reduced-motion` emulated-media sweep; no-JS `<details>` drawer + no-JS bar links; the FR-36-9a integrity sweep (dangling drawerRef). **The D340 scrollbar-bounce test is MANUAL** — a real windowed desktop browser with a classic scrollbar (device emulation can't reproduce it); run separately, don't skip it in the headless pass.
- Files: (live) + `reports/visual-diff/` (repo-root, STOP-67)
- Inputs: Step 10; Spec 36 §8 / FR-36-16 gate list.
- Outcome: every Gate-1 criterion has a green machine result.
- Exec: SEQUENTIAL · Deps: 10 · Marker: QA · Time: 30 min
- Tooling: Playwright, axe, wp-perf-gate, elementFromPoint script, Hostinger MCP (cache clear)
- On-Fail: file the specific failure; return to the owning step. Do NOT close on a partial gate.
- Test — Happy: all criteria pass. Edge: non-default N still collapses correctly. Fail: any red → named remediation. Integration: this IS the integration gate.

**Step 12 — Bean's eye (R-31-13) — HANDOFF**
- Tier/Model: **T3 (Opus, inline)** — present, don't dispatch
- Action: Produce the cropped before/after screenshot pair (desktop bar + open mobile drawer) and present to Bean for visual sign-off. On approval: update LEDGER (Phase 1 CLOSED, Phase 2 next), `/handoff`.
- Files: `reports/visual-diff/spec36-phase1-*` + LEDGER
- Inputs: Step 11 green.
- Outcome: Bean approves the look → Phase 1 closed.
- Exec: SEQUENTIAL · Deps: 11 · Marker: **HANDOFF** · Time: 10 min
- Cold-Entry: this plan + Step 11 gate results.
- Tooling: Playwright screenshots, /handoff
- On-Fail: capture Bean's specific visual notes as Phase-1 punch-list items.
- Test — Happy: Bean signs off. Edge/Fail/Integration: any "not quite" → tracked punch-list, re-loop the owning step.

---

## Key Judgement Calls

### Primary decisions (surfaced during planning)

- **Decision: Converter-emit of the two blocks — in Phase 1 or deferred?** ✅ **RESOLVED (Bean, 2026-07-19): DEFERRED — clone is NOT a priority at all; the clone/converter work happens only AFTER the whole header + footer + nav is complete.** Phase 1 (and Phase 2) build + test the blocks via the **editor**; no converter-emit task exists in this plan. §7's literal "converter-emit of those two" is superseded by Bean's ruling + FR-36-15.

- **Decision: Where does `store('sgs/nav')` live?**
  - Options: (A) new shared module `src/shared/nav-interactivity/`; (B) owned by nav-drawer, imported by nav-menu.
  - Recommendation: **(A).** FR-36-7 calls it "a UTILITY not a component (prove by three call-sites)" and it must be framework-reusable; a shared module keeps Steps 6/7 file-disjoint (parallel-safe). Cost of wrong choice: medium (B couples the two blocks' build order, killing the Wave-2 parallelism).
  - Who decides: architect (recommend A).

- **Decision: How is a "featured" menu item flagged on a CLASSIC WP menu?** ✅ **RESOLVED (Bean, 2026-07-19): (B) a `sgs/nav-menu` BLOCK ATTRIBUTE listing featured menu-item IDs.** Step 6 adds a `featuredItemIds` array attr + an inspector control (a checklist of the resolved menu's items) so the operator ticks which items are featured; render.php maps IDs → the featured style. The flag lives with the block, not the classic menu (so it survives a menu swap intent per the block's own config). Step 6 gains a small editor control for this.

### Pre-emptive decisions (Hidden-Decisions PEER REVIEW — Sonnet cold-executor + Haiku spec-lawyer, 2026-07-19)

- **[BLOCKER-FIX] QA tooling doesn't exist yet — build it FIRST.** The cold-executor confirmed `axe-core` is not a repo dependency, and no `elementFromPoint` sweep script exists; `wp-perf-gate` exists only as a global skill, not a repo CLI. Step 11's 30-min budget silently assumed a mature QA layer. **Fix: NEW Step 5b (Wave 0, parallel) builds the QA tooling** (axe-core via Playwright `addScriptTag` + `axe.run()`; the `elementFromPoint` sweep script authored from Spec 36 §8 methodology; the crawl-assertion + logical-properties-lint scripts) into a new `plugins/sgs-blocks/scripts/nav-qa/` dir — disjoint from every other file, buildable before the blocks exist. Step 11 then RUNS prepped tools, not builds them.
- **[PIN] Store API contract must be published by Step 5 BEFORE Wave 2 dispatches.** Steps 6 + 7 both consume `store('sgs/nav')` in parallel — they need its exact surface. Step 5 pins + documents: `actions.openDrawer / closeDrawer / toggleDrawer`, `state.isOpen`, and the `data-wp-on--click="actions.toggleDrawer"` / `data-wp-bind--aria-expanded="state.isOpen"` directive names. Wave 2 codes against this frozen contract (it's why Step 5 is Wave 0 and Steps 6/7 depend on it).
- **[PIN] Store consumed via relative ES import — no `webpack.config.js` collision.** `wp-scripts` auto-discovers `src/blocks/*` only, NOT `src/shared/*`. Both blocks import the store via a plain relative path (`../../shared/nav-interactivity/store`); wp-scripts bundles it into each block's own `view.js` and the Interactivity runtime dedupes by the `sgs/nav` namespace. **Only Step 5 touches `webpack.config.js`** (added to its Files) *if* a shared handle proves necessary — Steps 6/7 never edit it, so Wave-2 parallelism holds.
- **[PIN] `drawerRef` contract.** `drawerRef` = a string ID; `sgs/nav-drawer` renders `id="{drawerRef}"` on the `<dialog>`; unset `drawerRef` resolves to the single drawer on the page (FR-36-9a). Steps 6 + 7 code to this shape so integration (Gate-2) doesn't surface a mismatch.
- **[PIN] Drawer InnerBlocks template + "optional".** WP `template` is a fixed default, not conditional. Default template = `[['sgs/nav-menu'],['sgs/responsive-logo'],['sgs/button']]` (CTA = `sgs/button`), `templateLock:false` so the operator may delete the logo/CTA. "(optional)" = "present by default, deletable", not a conditional template.
- **[PIN] `×` close render contract.** `save.js` returns `<InnerBlocks.Content />` only; render.php emits the fixed `×` chrome as a sibling of `$content` INSIDE the `<dialog>` but OUTSIDE the editable InnerBlocks zone (matches the existing composite precedent) — so it's undeletable by construction.
- **[PIN] `featuredItemIds` shape + visual.** Attr default `[]`; inspector = a `CheckboxControl` list of the resolved menu's items. Featured visual (Phase 1) = accent-colour label (FR-36-4 "featured" flag); richer treatment (badge) deferred.
- **[SCOPE] Accordion built-but-untested this phase.** FR-36-6 lists the accordion as Phase-1, so Step 7 WIRES it; but Gate-1's flat menu has no submenus, so submenu-expansion is not exercised until Phase 2. Legitimate (spec-lawyer confirmed) — noted so no one treats the untested accordion as a Gate-1 failure.
- **[SCOPE] `edge`/`width` drawer geometry = full-screen only in Phase 1.** Step 7 ships `edge:full-screen` (Bean default); the partial `left/right/top` + `width` attrs are declared but default to full-screen and are not gate-tested this phase (partial-width is the FR-36-9 `--sgs-header-height` path, Phase 2+).
- **[FIX] RTL = logical-properties LINT in Phase 1, not a visual RTL sweep.** Spec §8 lists "RTL/logical properties"; Mama's is LTR so a visual RTL render isn't meaningful yet. Phase-1 requirement = the blocks' CSS uses logical properties (`margin-inline`, `inset`, etc.) — a grep/lint check in Step 11. A full visual RTL sweep is Phase-2 (first RTL client). Step 11 gains the logical-props lint.
- **[FIX] D340 bounce test is MANUAL (real windowed browser + classic scrollbar).** Device emulation can't reproduce the scrollbar-vanish bounce (Spec §8). Step 11 runs the headless sweep; the D340 bounce check is a separate manual observation (Bean or a real browser session), flagged so it isn't silently skipped in a headless run.
- **[FIX] Step 5 On-Fail corrected:** "no live impact" holds ONLY pre-Wave-2; once Steps 6/7 land they hard-depend on the store's export shape, so a post-Wave-2 revert breaks the build — revert Steps 6/7 together with Step 5.

### Pre-emptive decisions (Hidden-Decisions self-pass — pause-points caught at plan time)

- **Collapse-point N vs device tiers.** N is a *visual* breakpoint (default 768, operator attr) — it must NOT be wired to the 768/1024 *device-tier style* system (Spec 35 D2). Step 6 keeps them separate; the Step-11 sweep uses a *non-default* N precisely to prove they're decoupled. (Would otherwise pause mid-Step-6.)
- **`sgs/nav` is a store namespace, NOT a block name (§8a).** Never register a block called `sgs/nav`; the block slug is `sgs/nav-menu`, the store namespace is `sgs/nav`. Step 5 + Step 3 both hold this line.
- **ServerSideRender, not a hand-built preview.** Both blocks' editor preview MUST use `<ServerSideRender>` (render via render.php) — the `ssr-fixes-hand-built-preview-drift` lesson. Interactive behaviour (drawer open animation) previews front-end only, not in the static SSR canvas. (Would otherwise cause a "why doesn't the canvas match" stall.)
- **No block version bumps / deprecations (D293/D270).** The nav-menu rebuild is same-slug, no deprecation.js; old-shape posts are re-cloned, not migrated. Don't add a deprecation.
- **Commit path-scoped to `main` via isolated worktree (shared worktree).** Every commit re-checks branch in the same command; never `git add -A`; the brand-strip feat-branch code stays off main.
- **`aria-current` client-side.** LiteSpeed is the confirmed active cache — a server-baked `aria-current` serves a stale page's answer. Compute it in JS at mount (FR-36-11). (Would otherwise ship a subtly-wrong active-state.)
- **Cache-clear FIRST at Gate-1.** Or you measure the stale `?ver` (Spec 36 §8). Step 11 clears CDN/LiteSpeed before any measurement.

---

## Execution options (Stage 9)
1. **Start Step 1 inline** (the 3-min cart fix — smallest first action).
2. **Dispatch the parallel waves** via `/subagent-driven-development` (recommended — Wave 0 has 5 disjoint tasks, Wave 2 has 2; keeps Opus free, dispatches T1/T2 workers, T3 for Steps 5/7).
3. **Formal Hidden-Decisions peer review** (2 cold reviewers, Sonnet + Haiku) before executing — available on request.
4. Refine a specific step / KJC.
5. `/handoff` — park for a fresh session.
