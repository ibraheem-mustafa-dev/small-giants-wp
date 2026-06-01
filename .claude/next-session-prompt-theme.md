---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-01-theme-blocks-functionality
generated: 2026-06-01
primary_goal: "SGS-THEME THREAD (separate from the cloning pipeline). Fix + build the theme's blocks, editor UX, and functionality. Mobile-nav full-fix + product-card decisions DONE 2026-06-01. Remaining: product-card BUILD (Task 2, now unblocked — D144 ratified the design), mega-menu panel-pattern library (Task 5), FR-22-6 hybrid migrations (Task 9), sgs/cart block, and the heading/text dormant-variant tweak from Task 7b."
---

# Next Session — SGS THEME thread (blocks, editor UX, functionality)

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — warm start ⚠
> Invoke `/autopilot` first. This is the THEME/BLOCKS thread — NOT the cloning pipeline (sibling `.claude/next-session-prompt.md`). **DO NOT START ANY TASK until you have read ALL items in the MANDATORY READING LIST below, in order — they are prerequisites, not background.** Every block claim here was observed live in the WP block editor — but VERIFY each against the actual block.json/edit.js/render.php before building (**STOP: don't assert block capability from a partial dump — read block.json + edit.js + render.php + `/wp-blocks` first**). **Task 2 (product-card) additionally requires reading Spec 24 §FR-24-11..17 + D144 + D129 + the product-card design report FULLY before starting it** — the 6 decisions are now RESOLVED (D144), so the build is unblocked. The variant-classification context lives in `.claude/scratch/2026-06-02-brain-dump-variant-routing-and-issues.md` — read it.
> **Guardrail (all tasks): after every block build-deploy, open the WP editor on canary 144 and verify the control renders + zero console errors before considering the task done. Bump the block.json `version` on any CSS/JS change (WP keys the asset `?ver=` off it — redeploying without a bump serves stale assets).**

## State recap (plain English)
The SGS framework is a custom WordPress block library (theme + blocks plugin). Phase 1 blocks are built. This thread collects editor-UX + functionality + variant-cleanup work, INDEPENDENT of the cloning-pipeline thread (parallel-safe). Branch `feat/fr22-4-1-universal-wrapper` (shared with the cloning thread; do theme work on it, or branch `feat/theme-blocks-*` if scope grows). Build+deploy: `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only --allow-dirty`. Canary admin: WP user `Claude`; password in `.claude/secrets/sandybrown.env` `WP_PWD_SANDYBROWN` (for the BROWSER editor; the app password only does REST).

## First action (smallest step, ≤5 min, zero deps)
Read the MANDATORY READING LIST (below) in order, then run `python plugins/sgs-blocks/scripts/sgs-db.py block sgs/product-card` to ground-truth the product-card's current attrs before designing the option-picker build (Task 2). That single command + the Spec 24 §FR-24-11..17 read is enough to start.

## Tool bindings
Skills, MCP servers, and agents for this session are tabulated below under **Skills to Invoke**, **MCP / Tools**, and **Agents to Delegate To**. Invoke `/autopilot` first (auto-injected), then `/strategic-plan` to order Tasks 2/5/9, then per-task bindings as noted in each orchestration block.

## ✅ Completed 2026-06-01 session 3 (mobile-nav full-fix + product-card decisions)
- **Mobile-nav DONE** (`1f985c9a`, deployed + live-verified, D143) — full-screen overlay (was 208×158) + flush-to-top (killed WP 16px block-gap) + **populated menu via `core/page-list` expansion** (was 0 items → 13; the renderer didn't handle WP's default nav content) + header-only inserter scope. Closeable (button+ESC), links navigate. v3.0.3. Visual report `reports/visual-diff/mobile-nav-2026-06-01.md`. `/sgs-update` run clean.
- **Product-card 6 decisions RATIFIED** (D144 → Spec 24 §FR-24-11..17) — Task 2 is now UNBLOCKED. Decisions: per-type `display_as` (pills/static-list/hidden) + card "price only" toggle; SKU matrix deferred; filled-in-card/outlined-global pills + 3 states; **emit `sgs/option-picker` directly from the clone** (Bean corrected — build the picker ASAP + battle-ready, then wire into the pipeline; NOT a manual swap); source toggle in toolbar AND inspector; Gutenberg-panel editor. Full text in `.claude/reports/2026-06-01-product-card-option-picker-design.md` (RESOLVED section).

## ✅ Completed earlier (sessions 1-2b) — DONE, do not redo
- **Task 1** (`c40c9a49`) — shared visual IconPicker (`src/components/IconPicker/`), wired into icon + icon-list; reusable by any icon-picking block.
- **Task 3** (`a55f5a71`) — team-member Compact vs Full display modes (`displayMode`).
- **Task 4** (`e8048a18`) — notice-banner 5 variants + per-type default icons + IconPicker.
- **Task 6** (`4b132e2e`) — cta-section rich variation presets (innerBlocks scaffolding).
- **Task 7a** (`4b132e2e`) — product-card `gift` variant deleted.
- **Task 7b** (`88b6bdb0`) — heading/text/label/quote `variantStyle` → WP block-styles. **FLAG:** heading+text variants were dormant (no CSS) → agents added defaults; Bean may want to tweak values or drop heading `hero` (redundant per "h1 default = hero").
- **Task 8** — the 2 flagged bugs (media `imageId`, container validation) fixed by the cloning thread (D141).

## Remaining tasks — orchestration plan

### Task 2 — Product-card BUILD (HIGH — now unblocked)
**What:** Build the `sgs/option-picker` atomic block + product-card variation-sets per the RATIFIED design (Spec 24 §FR-24-11..17 / D144).
**Why:** Gives clients a product card that flexes from "full interactive configurator" → "from £x" → "static flavour showcase" via toggles, with no per-use-case code.
**Estimated time:** ~30–45 min for Phase A (option-picker standalone); the full A→E is multi-session.
**Orchestration:**
- Execution: delegated, **/subagent-driven-development** (implementer + spec-reviewer + quality-reviewer per phase)
- Model: sonnet (multi-file block build) via /delegate
- Dispatch pattern: sequential per phase (A → B → C → D → E); gate each before the next
- **Current state (so the build is unambiguous):** `sgs/option-picker` does NOT exist yet, and the cloning converter has NO emit path for it yet. Task 2 BUILDS both — the block AND (Phase D) the converter emit-path. Nothing is pre-wired.
- Brief: build `sgs/option-picker` (radio-group via visually-hidden `<input type=radio>`+`<label>`+pill `<span>`, CSS `:checked` active + hover/focus "considering" states, bubbling `sgs:option-selected` event, NOT sgs/button) — **make it BATTLE-READY** (robust ARIA/keyboard/no-JS-default/edge cases) because the cloning converter WILL be wired (Phase D) to emit it directly; then `_sgs_variation_sets` CPT meta with `display_as` (pills/static-list/hidden); then card Bound mode + "price only" toggle; source toggle in BOTH toolbar + inspector. **Phase D (clone-emit) is IN-SCOPE within Task 2, NOT split to a later session** (Bean Q4 correction 2026-06-01): build the converter emit-path — update TRUTH-SPEC + slot_synonyms/slots + converter code so a cloned pill group outputs `sgs/option-picker`. (Spec 24 §FR-24 build-order D aligns with this.)
- Context the subagent needs: D144 decisions verbatim; Spec 24 §FR-24-11..17; the design report; `save:()=>InnerBlocks.Content` rule; deprecations-required rule; parking P-PRODUCT-CARD-FULL-DUAL-MODE / D129.
- Depends on: none (decisions resolved). Parallel with: Task 5.
- /qc gate after: yes — /qc multi-rater before each commit (converter/SGS-block rule).
**Acceptance (per phase):** **A** — `sgs/option-picker` works standalone: correct radio ARIA (`role` via real `<input type=radio>`) + keyboard (arrow/Home/End, single tab stop), no-JS default-selected state, 3 visual states (resting/considering/selected), 44px targets, axe-core clean. **B/C** — card Bound mode swaps price on pack-size + image on flavour; `display_as` static-list renders "Available in N flavours: …"; "price only" toggle hides all pickers; source toggle works from BOTH toolbar + inspector. **D** — a fresh `/sgs-clone` of a page with a pill group emits `sgs/option-picker` in the converted markup (verify in extract.json + live editor: no "unexpected content"). All live-verified on canary editor + frontend, WCAG 2.2 AA. **Verify steps:** editor — insert block, confirm controls render + zero console errors; frontend — render card, click a pill, confirm price/image swap + console clean.

### Task 5 — Mega-menu panel-pattern library (MED)
**What:** Generify the 2 existing mega-menu panels (placeholder content + theme tokens) + build ~7 generic panel layouts.
**Why:** Turns the mega-menu from 2 client-specific panels into a reusable library clients pick from + customise.
**Estimated time:** ~20 min research + ~30 min build.
**Orchestration:**
- Execution: delegated. First **/research-buddies + /qc-council** on whether template-part is the best UX (Bean-directed); then **/dispatching-parallel-agents** (one per panel layout) on sonnet.
- Brief: generify `theme/sgs-theme/parts/mega-menu-{brands,sectors}.html` (strip client data → bindings/placeholders); build 7 layouts: simple / full-width-cols / contained-cols / featured-promo / tabbed / card-grid / split.
- Context: mega-menu panel = template part `area='mega-menu'`; clients use the Site-Editor template-part picker; `mega-menu-panels.css`.
- Depends on: none. Parallel with: Task 2. /qc gate after: yes — /qc-inline.
**Acceptance:** 2 existing panels carry zero client-specific strings; 7 new generic layouts register + appear in the Site-Editor picker + render on empty data.

### Task 9 — FR-22-6 hybrid-block migrations (the 61-block roster) (MED)
**What:** Migrate remaining hybrid SGS blocks from scalar-attr render to InnerBlocks `echo $content`.
**Why:** Completes Phase 2; makes every block clone faithfully via the converter's InnerBlocks path.
**Estimated time:** ~5 min per block (mechanical); batch.
**Orchestration:**
- Execution: delegated, **/subagent-driven-development** batched; sonnet.
- Brief: per block — render echoes `$content`; edit.js InnerBlocks template; deprecated.js v(N+1) + `isEligible`; NEVER a server-side legacy scalar fallback (R-22-14).
- Context: roster `.claude/reports/2026-05-27-hybrid-block-roster.md`; done already = hero/cta-section/trust-bar/info-box/testimonial-slider.
- Depends on: none. Parallel with: Task 2/5. /qc gate after: yes — editor-verify no "unexpected content" + converter emits InnerBlocks.
**Acceptance:** each migrated block builds, editor shows no validation error, the cloning converter emits InnerBlocks for it.

### Side tasks
- **sgs/cart block + icon enhancements** — queued by the cloning thread; prompt at `.claude/scratch/2026-06-03-prompt-sgs-cart-and-icon-enhancements.md` (mini-cart on WooCommerce Store API + Interactivity API; leanest v1 = count badge + link).
- **Heading/text dormant-variant tweak** (from 7b) — review the agent-added default CSS values; decide whether to drop heading `hero`. Small, inline.

## Dependency graph
```
Task 2 (delegated, sonnet, sequential phases) ─┐
Task 5 (research → parallel agents)            ├─ all parallel-safe (disjoint files)
Task 9 (batched migrations)                    ─┘
   ↓ /qc multi-rater before each commit
Commit to feat/fr22-4-1-universal-wrapper (shared branch — do NOT merge/delete; cloning thread active)
```

## MANDATORY READING LIST (read FULLY first)
1. This file.
2. `.claude/handoff-theme.md` (2026-06-01).
3. `.claude/scratch/2026-06-02-brain-dump-variant-routing-and-issues.md` — variant classification + full issue register.
4. Root `CLAUDE.md` + `plugins/sgs-blocks/CLAUDE.md` — block customisation standard, deprecation procedure, gotchas (source:html ban, InnerBlocks.Content save, deprecations-required).
5. `.claude/specs/24-QUERY-DRIVEN-CONTENT-CARDS.md` — §FR-24-11..17 (RATIFIED) for Task 2.
6. `.claude/decisions.md` newest — D143 (mobile-nav), D144 (product-card decisions), D129 (product-card/picker design), D134-D136.
7. `.claude/reports/2026-06-01-product-card-option-picker-design.md` — product-card + sgs/option-picker design (Task 2; 6 decisions RESOLVED).
8. `.claude/reports/2026-05-27-hybrid-block-roster.md` — the 61-block FR-22-6 migration roster (Task 9).
9. `plugins/sgs-blocks/includes/lucide-icons.php` + icon-library/emoji assets.
10. The relevant block dirs `plugins/sgs-blocks/src/blocks/<block>/{block.json,edit.js,render.php}` — READ before asserting capability.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | Design the option-picker + per-block solutions before building |
| `/gap-analysis` | Grade each block fix against its acceptance criteria |
| `/lifecycle` | Before any skill/agent change |
| `/research` | Gold-standard for the option-picker UX + WooCommerce product binding (auto-routes tier) |
| `/strategic-plan` | Order the remaining tasks |
| `/sgs-wp-engine` | SGS block dev — block.json, attributes, render, editor controls |
| `/wp-block-development` | Gutenberg block internals (InspectorControls, InnerBlocks, deprecations) |
| `/subagent-driven-development` | Task 2 + Task 9 (implementer + 2 reviewers per task) |
| `/dispatching-parallel-agents` | Task 5 (one agent per panel layout) |
| `/research-buddies` + `/qc-council` | Task 5 UX assessment |
| `/visual-qa` or `/design-review` | Verify editor UX + WCAG 2.2 AA |

## MCP / Tools
| Tool | For |
|------|-----|
| Playwright MCP / superpowers-chrome `use_browser` (CDP) | Open the WP block editor on canary 144, verify controls + errors |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | Block schema before asserting capability |
| `/sgs-db` (read) | Block roster, variations, capabilities |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | ALL heavy block dev (option-picker, migrations, controls) |
| `design-reviewer` | Editor UX + WCAG review of the new pickers/panels |

## Guardrails
- **Read block.json + edit.js + render.php + `/wp-blocks` before asserting any block's capability** — don't infer from a partial dump.
- **Deprecations required** — any change to a static block's save() or an attribute schema needs a `deprecated.js` entry (see plugins/sgs-blocks/CLAUDE.md procedure) or existing posts show "unexpected content".
- **Never `source:html` on a dynamic block**; dynamic blocks with InnerBlocks need `save: () => <InnerBlocks.Content/>`.
- **No client-specific values in base theme/blocks** — client work lives in `sites/<client>/` only.
- **Build + editor-verify after every block change** — `build-deploy.py --blocks-only` + reload editor.
- **Bump block.json `version` on any CSS/JS change** — WP keys the asset `?ver=` off it; without a bump, returning visitors get stale assets (caught live 2026-06-01).
- **CDP top-layer quirk** — synthetic `dispatchMouseEvent` clicks on popover/top-layer elements don't reliably trigger nav/hit-test in headless Chrome; verify popover interactions via programmatic `.click()` or a screenshot, not a CDP click + state check (caught 2026-06-01).
- **WCAG 2.2 AA + 44px touch targets + mobile-first** on all new UI.
- **Shared branch** — `feat/fr22-4-1-universal-wrapper` is shared with the active cloning thread; commit + push to it, do NOT merge-to-main/delete it (would break the other thread).
