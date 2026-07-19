Invoke /autopilot before doing anything else.

You are the SGS WordPress framework developer. This is **TRACK 2 — Spec 36 Phase 1 Wave 2**: build the two navigation blocks (the desktop bar + the mobile drawer), which build in PARALLEL against the shared engine Wave 0 already published.

## State recap (plain English, re-grounded)
Small Giants sites need a proper navigation menu. The rulebook is **Spec 36** (SIGNED-OFF v2.1). The build plan is `plans/2026-07-19-spec36-phase1-mvp-nav-plan.md` (QC-clean 92/100). **Wave 0 is DONE and on `main`** (`eaa4310e`+`f9c381f2`, npm build green): the cart `role=status` fix, logo basics, the menu-source fix, a drawer skeleton, the **shared `store('sgs/nav')` engine** (the two hard drawer bug-fixes D323/D340 ported verbatim + one merged focus-trap), and the QA test tooling (`scripts/nav-qa/`). Wave 2 builds the two blocks that consume that engine. Nothing is deployed/live yet — deploy + editor cutover of Mama's is Wave 3; full visual QC is Wave 4 (Gate-1 + Bean's eye).

## MANDATORY READING (before any build)
1. `specs/36-SGS-NAVIGATION-SYSTEM.md` — the governing spec, **read END TO END** (Bean-locked full-read gate). Phase-1 FRs: 1,2,4(flat),6,7,8,9,9a,10,11,12,13,14,17.
2. `plans/2026-07-19-spec36-phase1-mvp-nav-plan.md` — Steps 6 + 7 + the "Pre-emptive decisions (peer review)" block (the pinned contracts).
3. `reports/2026-07-19-P2.5-phase6.5-salvage-audit.md` — what's salvaged.
4. `plugins/sgs-blocks/src/shared/nav-interactivity/store.js` — **read the API-contract comment block at the top** (both blocks bind to it).
5. `.claude/plans/block-migration-DONE-checklist.md` + `.claude/plans/2026-07-09-per-block-no-inline-migration-contract.md` — the 11-item DONE-checklist + no-inline contract.
6. **`specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (Parts A/B/D) + the plan's "Spec 35 inspector-UX binding" section** — the MANDATORY control-design standard both blocks + the mega CPT follow (Bean-directed 2026-07-19). Also read the two signed-off reference artefacts (fetch via WebFetch): the panel-shape (element-first, 2 tabs, Text→Fill→Layout clusters, Normal/Hover=one toggle) `https://claude.ai/code/artifact/0884087a-a4b8-440f-a005-f409f2198228` + the control archetypes (UnitControl+preset+device, BoxControl, DesignTokenPicker+alpha, choice-by-count, FormTokenField, LinkControl, shadow/border builders) `https://claude.ai/code/artifact/a35048a9-1c06-4e41-b03f-4c5b48ce0090`.
7. `.claude/STOP-CATALOGUE.md` — the uncapped STOP catalogue + pre-flight ritual (structural defences — read before acting).

## The store contract (Wave 0 published — both blocks bind to THIS)
```
store('sgs/nav') — actions.openDrawer / closeDrawer / toggleDrawer ; state.isOpen
Burger:  <div data-wp-context='{"isOpen":false,"drawerRef":"sgs-nav-drawer-1"}'>
           <button data-wp-on--click="actions.toggleDrawer"
                   data-wp-bind--aria-expanded="state.isOpen" aria-controls="sgs-nav-drawer-1">
Drawer:  <dialog id="{drawerRef}" data-sgs-nav-drawer> … </dialog>
Close ×: element INSIDE the drawer carrying data-sgs-nav-close (chrome, undeletable)
```

## Skills to Invoke
| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS — design/architecture decisions |
| `/gap-analysis` | ALWAYS — grade outputs before delivery |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` | ALWAYS — auto-routes research tier |
| `/strategic-plan` | ALWAYS — plan order before coding |
| `/sgs-wp-engine` + `/wp-blocks` + `/sgs-db` | SGS block build + schema ground truth |
| `/qc-council` | Gate-2 (multi-rater on the 2 new blocks, blub.db 255) |
| `/dispatching-parallel-agents` | run Steps 6 + 7 in parallel |

## MCP Servers & Tools
| Tool | What to use it for |
|------|-------------------|
| Playwright | editor ServerSideRender preview check + isolated-drawer axe smoke |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | both block builds (Steps 6 + 7) |

---

## Task 1 — Build `sgs/nav-menu` (flat bar + burger)  [Step 6]
**What:** rebuild `sgs/nav-menu`: desktop horizontal bar of real `<a href>` (flat, NO submenus) that collapses below the collapse-point to a burger opening the drawer.
**Why:** the visible menu; half the Gate-1 deliverable.  **Estimated time:** 45 min.
**Orchestration:** delegated — **sonnet** (T2) via `/delegate`; single `wp-sgs-developer`; PARALLEL with Task 2.
- Brief: same-slug rebuild (D270 — read the existing 617-line render.php then rebuild fresh, NO deprecation). Menu picker (`ref`) + collapse-point N (visual bp default 768, DISTINCT from the 768/1024 device tiers) + `featuredItemIds` array attr + inspector checklist (Bean's ruling) + `labelCollapse` reuse. Client-side `aria-current="page"` (LiteSpeed-safe). Import `store('sgs/nav')` for the burger. No inline styles (scoped `<style>` via `SGS_Container_Wrapper`). ServerSideRender editor preview.
- Context: the store contract above; menu resolution reads `class-sgs-nav-menu-source.php` (Wave 0 made it registry-driven); `sgs/nav` is a store namespace NOT a block name.
- Depends on: Wave 0 (done). Parallel with: Task 2. /qc gate after: yes — Gate 2.
**Acceptance:** 5-item classic menu → bar ≥768, burger <768 opening the drawer via `drawerRef`; crawlable; zero inline `style=`; DONE-checklist 11/11.

## Task 2 — Build `sgs/nav-drawer` (full-screen modal)  [Step 7]
**What:** build the drawer into the Wave-0 skeleton: full-screen `<dialog showModal>` modal, InnerBlocks `[nav-menu, responsive-logo, button]` (templateLock:false), × close as undeletable chrome, drawer-settings surface (FR-34-5), consuming the store.
**Why:** the accessible mobile menu; the a11y-critical half.  **Estimated time:** 60 min.
**Orchestration:** delegated — **opus** (T3, shape the a11y) → finish **sonnet** (T2) via `/delegate`; single `wp-sgs-developer`; PARALLEL with Task 1.
- Brief: consume `store('sgs/nav')` (do NOT re-implement focus-trap/scroll-lock — the store owns it). `save.js` returns `<InnerBlocks.Content/>` only; render.php emits the × as a sibling of `$content` INSIDE `<dialog>`, OUTSIDE the editable zone. Drawer settings `drawerBg/toggleCloseColour/drawerAlign/drawerGap/drawerPadding` via `ResponsiveControl`, all scoped `<style>`. `edge:full-screen` only. Accordion submenu WIRED but untested (flat menu). no-JS `<details>` fallback. ServerSideRender preview.
- Context: the store contract; the drawer's `<dialog>` `id` MUST equal the `drawerRef` Task 1 emits; keeps `SGS_Container_Wrapper` (section-KIND).
- Depends on: Wave 0 (done). Parallel with: Task 1. /qc gate after: yes — Gate 2.
**Acceptance:** burger opens full-screen modal; ESC closes + focus returns to burger; Tab contained; zero inline; DONE-checklist 11/11; isolated-drawer axe = 0.

## Gate 2 — QC the two blocks (after Tasks 1 + 2)
`npm run build` green (F3/F6/product-search/ghost pass); `check-no-inline` = 0 on both; DONE-checklist 11/11; ServerSideRender preview renders (not a static snapshot); isolated-drawer axe = 0; schema round-trip (no undeclared attrs, D338); then `/qc-council` multi-rater on the 2 blocks. Fix findings before Wave 3.

## Dependency graph
```
Wave 0 (DONE, on main)
  ↓
Task 1 (sonnet)  +  Task 2 (opus→sonnet)     ← PARALLEL, both dep on the store contract only
  ↓ Gate 2 (/qc-council + build + no-inline + isolated axe)
Wave 3 (deploy → /sgs-update → editor cutover Mama's)   ← next session after this
  ↓ Gate-1 (Wave 4: axe/elementFromPoint/crawl/perf via scripts/nav-qa/ + Bean's eye)
```

## Methodology guardrails (do not skip)
- **SHARED BRANCH `feat/brand-strip-inspector-rebuild` + Track 1 (Spec 35) co-active (LOAD-BEARING).** Path-scope EVERY commit with an explicit `-- <paths>` pathspec; re-check `git branch --show-current` IN THE SAME command as the commit; NEVER `git add -A`, NEVER `git checkout`/branch-switch in this worktree. Merge to main ONLY via an isolated `git worktree add /c/tmp/<x> main` (a REAL merge — main carries both tracks). Do NOT delete the shared branch. Do NOT wholesale-rewrite `LEDGER.md`/`decisions.md` (Track 1 edits them too) — replace only the nav section. **Do NOT overwrite `next-session-prompt.md` — that's Track 1's; THIS file is Track 2's.**
- **New block → seed its `block_composition` row.** A brand-new block fails the F6 build gate until it has a row — add it to `plugins/sgs-blocks/scripts/seed-composition-roles.py` INSERTS + run the script (Wave-0 lesson; `sgs/nav-drawer` already seeded).
- **Build via PowerShell** (`npm run build`) — the Git-Bash node shim misfires on Windows. Do NOT pipe `git commit` through `Select-String -First` (silently aborts — use `Select-Object -Last`).
- **Verify live + verify wiring, not the emit** — a control isn't done until the LIVE computed value is correct (D291/D302/D328 silent coercions). ServerSideRender preview, not hand-built (the `ssr-fixes-hand-built-preview-drift` lesson) — interactive drawer-open previews front-end only.
- **NO block version bumps / no `deprecated.js`** (D293/D270). No inline styling (Spec 32 — scoped `<style>`). Complete code only, no stubs.
- **SPEC 35 INSPECTOR-UX IS MANDATORY (Bean-directed 2026-07-19).** Both blocks + the mega CPT follow the plan's "Spec 35 inspector-UX binding" section: two native tabs via `group` (Settings+Styles, Advanced inside Settings — never a 3rd tab); **element-first panels** (by nav PART); Text→Fill→Layout cluster order; Normal/Hover = ONE `StateToggleControl`; `ResponsiveControl` 768/1024 on tiered attrs; `ToolsPanel` progressive disclosure past ~6 controls. Controls per Part B: `UnitControl`+preset (sizes/gaps), `BoxControl` (drawerPadding), `DesignTokenPicker`+`enableAlpha`+clearable (colours; gradient only on backgrounds), choice-by-count (≤5 `ToggleGroupControl`/6-10 `SelectControl`/>10 `ComboboxControl`, always +Custom), `FormTokenField`/checklist (`featuredItemIds`), `LinkControl` (never raw URL), shared `TypographyControls`. Reset on every changed control; keyboard-operable; screen-reader labels. The Spec-35 `inspector-conformance` audit + `/qc-council` verify it.
- **Visual-diff commit gate:** Wave 2's blocks still aren't deployed/live, so `--no-verify` with a stated reason is honest (visual QC = Gate-1). Once Wave 3 deploys + cutover, real visual-diff reports + Bean's eye are the gate (R-31-13) — never close a visual task on a number alone.
- **/qc-council BEFORE the Gate-2 commit** (converter/pipeline/SGS-block rule, blub.db 255).
- **DB is authoritative** — query `/sgs-db`/`/wp-blocks`; never hardcode counts.
- **STOP-29 / definition-of-done** — Spec 36 is a spec'd subsystem: done = the spec's FULL Phase-1 scope; map every deferral to a named phase, never "out of scope". Converter/clone is DEPRIORITISED until the whole header+footer+nav is done (Bean-ruled).
- **Fact-check subagent output** (invented paths/dates/counts) against ground truth before acting.
