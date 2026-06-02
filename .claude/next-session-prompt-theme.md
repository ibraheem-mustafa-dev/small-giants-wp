---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-02-theme-session4
generated: 2026-06-02
primary_goal: "SGS-THEME THREAD (separate from the cloning pipeline). Close the product-card + cart feature loop: seed a WooCommerce product to verify the cart badge-increment + enable Phase C testing; then build product-card Phase C (DUAL-SOURCE binding — WC-native when present, custom CPT meta otherwise, per D149). Then remaining theme tasks: FR-22-6 Wave-2A migrations (gated on P-FR226), heading/text dormant-variant tweak, cart drawer (Phase 2), cta-section/notice-banner polish."
---

# Next Session — SGS THEME thread (blocks, editor UX, functionality)

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — warm start ⚠
> Invoke `/autopilot` first. This is the THEME/BLOCKS thread — NOT the cloning pipeline (sibling `.claude/next-session-prompt.md`). **DO NOT START ANY TASK until you have read the MANDATORY READING LIST below, in order.** Every block claim must be VERIFIED against the actual block.json/edit.js/render.php before building (**STOP: don't assert block capability from a partial dump — read block.json + edit.js + render.php + `/wp-blocks` first**). **STOP: triage before fixing — verify a reported bug still reproduces against ground truth (REST render / edit.js / editor repro) BEFORE dispatching a fix.** Last session 3 of 4 reported editor "bugs" were already fixed/false.
> **Guardrail (all tasks): after every block build-deploy, open the WP editor on canary 144 (or the relevant page) and verify the control renders + zero console errors before considering the task done. Bump the block.json `version` on any block CSS/JS change AND bump the theme `style.css` `Version:` header on any THEME-CSS change (WP keys `?ver=` off block.json for plugin assets, off the theme version for theme CSS — caught live 2026-06-02; the contrast fix didn't apply until the theme version bumped).**

## State recap (plain English)
The SGS framework is a custom WordPress block library (theme + blocks plugin). Last session (waves 1–3) shipped: `sgs/option-picker`, notice-banner FR-22-6 migration, the mega-menu layout library, 4 design-critique fixes, `sgs/icon` shape/link/hover enhancements, the duplicate-animation-panel fix, **product-card Phase B** (variation-sets meta + Gutenberg panel + the `custom-fields` CPT fix), and **`sgs/cart`** (WooCommerce count badge v1). 12 commits on `feat/theme-blocks-wave1` (pushed; NOT merged — Bean times the merge with the cloning thread to avoid the commit-race). Work from `main` or a fresh `feat/theme-blocks-*` short-lived branch; commit by explicit path. Build+deploy: `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only --allow-dirty` (add `--theme-only` for theme files). Canary admin: WP user `Claude`; password `WP_PWD_SANDYBROWN` + app password `WP_APP_PWD_SANDYBROWN` in `.claude/secrets/sandybrown.env`. OPcache reset after PHP changes: write `<?php opcache_reset();` to the webroot, GET it, delete it (full one-liner in dev-setup.md).

## First action (smallest step, ≤5 min, zero deps)
Read the MANDATORY READING LIST, then create ONE WooCommerce product in wp-admin (Products → Add New) matching the Mama's product-draft content (name + price + image + a couple of options). The canary has WooCommerce active but ZERO products — that single product is the test fixture that unblocks BOTH the cart badge-increment E2E AND product-card Phase C testing.

## MANDATORY READING LIST (read FULLY first)
1. This file.
2. `.claude/handoff-theme.md` (2026-06-02, session 4).
3. `.claude/decisions.md` newest — **D149 (product-card Phase C dual-source architecture)** + D148 (wave 1–3 summary) + D144 (product-card 6 decisions).
4. `.claude/specs/24-QUERY-DRIVEN-CONTENT-CARDS.md` — §FR-24-2/3 (dual-mode card), §FR-24-9 (clone compat), §FR-24-11..17, and the "Out of scope" WooCommerce-adapter note (D149 refines it).
5. Root `CLAUDE.md` + `plugins/sgs-blocks/CLAUDE.md` — block customisation standard, deprecation procedure, gotchas (source:html ban, InnerBlocks.Content save, deprecations-required, `custom-fields` for CPT meta REST).
6. `.claude/parking.md` — P-FR226-NULL-SAVE-MIGRATION (gates Wave-2A migrations) + P-PRODUCT-CARD-FULL-DUAL-MODE.
7. The product-card files: `plugins/sgs-blocks/src/blocks/product-card/` + `plugins/sgs-blocks/includes/content-types/class-product-cpt.php` + `plugins/sgs-blocks/src/plugins/product-variation-sets/index.js` — READ before extending.
8. `.claude/reports/2026-06-01-fr22-6-migration-classification.md` — the migration wave ordering (Task C).

## Skills to Invoke
| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS — design Phase C dual-source binding before building (D149) |
| `/research` (auto-routes) | ALWAYS — gold-standard for WooCommerce Block Bindings + binding a card to WC product data |
| `/gap-analysis` | ALWAYS — grade each build against acceptance |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/strategic-plan` | ALWAYS — order Phase C/D/E + the remaining tasks |
| `/sgs-wp-engine` + `/wp-block-development` | SGS block dev — block.json, attrs, render, deprecations, Block Bindings |
| `/wp-rest-api` | When touching CPT meta / REST schema / Block Bindings sources |
| `/subagent-driven-development` | Phase C (design-bearing — implementer + 2 reviewers) |
| `/dispatching-parallel-agents` | Wave-2A migrations (disjoint blocks) once P-FR226 is resolved |
| `/systematic-debugging` | Any bug — root-cause before fixing (triage-before-fix rule) |
| `/visual-qa` or `/design-review` | Editor UX + WCAG 2.2 AA verification |

## MCP / Tools
| Tool | For |
|------|-----|
| Playwright MCP | Open the WP editor + frontend on canary; verify controls + console + add-to-cart flow. (Dismiss any leftover "unsaved changes" beforeunload dialog with `browser_handle_dialog`.) |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | Block schema before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | Block roster / attrs / capabilities |
| REST block-renderer (`/wp/v2/block-renderer/<block>?context=edit`, app-password Basic auth) | Fast server-render verification without the editor |
| WooCommerce Store API (`/wc/store/v1/cart`, `/wc/store/v1/products`) | Cart state + product checks |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | ALL heavy block dev (Phase C card binding, migrations) |
| `design-reviewer` | Editor UX + WCAG review of the card/panel |

---

## Task A — Seed a WooCommerce product + close the cart badge-increment E2E
**What:** Create one WC product (matching Mama's product-draft content) in wp-admin, then verify the `sgs/cart` badge increments on add-to-cart.
**Why:** The canary has 0 WC products, so the cart's core claim (live count update) is the one piece untested. This fixture also unblocks Phase C testing.
**Estimated time:** ~10 min.
**Orchestration:** Execution: inline (main thread, Opus). Dispatch: none. Context: cart block at `src/blocks/cart/`; `wc-blocks_added_to_cart` is the event it listens for; canary WC is active (`wc/store/v1` live). Depends on: none. Parallel with: none. /qc gate after: yes — `/qc-inline`.
**Acceptance:** put `sgs/cart` on a page → add the product to cart on its product page → badge increments WITHOUT a full reload + NO `?wc-ajax=get_refreshed_fragments` request in Network. Live-verified via Playwright.

## Task B — Product-card Phase C: dual-source Bound-mode rendering (D149)
**What:** Build the card's Bound mode so it renders product data — **dual-source: WooCommerce-native when WC is present, custom `sgs_product` CPT meta otherwise** (D149). Wire the option-picker + variation-sets into the card render.
**Why:** Turns the Phase-A picker + Phase-B data model into the actual working configurable card — the feature the whole option-picker build was for.
**Estimated time:** ~15 min design (brainstorm/research) + multi-step build.
**Orchestration:**
- Execution: delegated, **/subagent-driven-development** (design-bearing → implementer + spec-reviewer + quality-reviewer).
- Model: sonnet (multi-file block build) via /delegate.
- **DESIGN GATE FIRST (Bean-directed, D149):** run `/brainstorming` + `/research` on the WooCommerce Block-Bindings pattern (binding a card to WC product price/image/stock; whether SGS variation-sets should map onto WC native variable-product attributes when present) BEFORE building. Amend Spec 24 with the dual-source decision.
- Context the subagent needs: D149 (dual-source: WC-native when present, custom CPT meta otherwise; `custom-fields` is a REST-exposure flag not storage); Spec 24 §FR-24-2/3/9; the option-picker `sgs:option-selected` event contract; `_sgs_variation_sets` content_impact map drives rendering (R-22-9, card reads what the product declares — no hardcoded slot logic); `save:()=>InnerBlocks.Content`.
- Depends on: Task A (a real product to bind to). Parallel with: Task C.
- /qc gate after: yes — /qc multi-rater before commit (SGS-block rule).
**Acceptance:** a card in Bound mode bound to the WC product shows live WC price/image; on a non-WC site falls back to CPT meta; selecting a pack-size pill swaps price, a flavour pill swaps image (per content_impact); no-JS default state renders; WCAG 2.2 AA. Live-verified editor + frontend.

## Task C — FR-22-6 hybrid migrations, Wave 2A (GATED)
**What:** ⚠ ROSTER WAS A CATEGORY ERROR (corrected 2026-06-02): social-proof / featured-product / gift-section / footer / header are mockup-draft SECTION classes, NOT SGS blocks — there is no block.json for any of them (verified: all five appear only as section classes in the Mama's mockup HTML). There is nothing to FR-22-6-migrate there. The REAL Wave-2 single-`text` targets must be re-derived from the BLOCK ROSTER (SGS blocks whose render.php reads a scalar `text`/`heading` attr instead of echoing `$content`), per the notice-banner precedent — never from mockup section names. RE-DERIVE before running this task.
**Why:** Continues Phase 2; lets the converter clone these faithfully.
**Estimated time:** ~5 min/block.
**Orchestration:** Execution: delegated, **/dispatching-parallel-agents** (one per block, disjoint) on sonnet. **BLOCKED until** the null-save→InnerBlocks auto-migrate finding (parking P-FR226) is resolved framework-wide first — NB P-FR226 is itself a DEFERRED/moot risk (only bites a production site with old-shape posts; info-box + notice-banner already shipped the migration without resolving it), so the real gate is just doing the migration carefully (deprecated.js + isEligible when a production site exists) — see the classification report's recommendation. Context: the notice-banner migration is the template; deprecated.js null-save pattern; R-22-14 (no scalar fallback). Depends on: P-FR226 resolution. Parallel with: Task B. /qc gate after: editor-verify no "unexpected content" + converter emits InnerBlocks.
**Acceptance:** each migrated block builds, editor shows no validation error, converter emits InnerBlocks; existing-post migration handled (or the P-FR226 fix applied).

## Task D — Heading/text dormant-variant tweak (small, Bean decision)
**What:** Review the agent-added default CSS for heading/text/label/quote `variantStyle`; decide whether to drop heading `hero` as redundant ("h1 default = hero").
**Orchestration:** inline (Opus). Surface the drop-`hero` choice to Bean. Depends on: none. /qc gate: /qc-inline.
**Acceptance:** Bean confirms the variant set; CSS tidied; no editor regressions.

## Later (note, not this session's focus)
- **Cart Phase 2** — slide-in drawer (gated behind the `displayMode` attr; v1 is count+link).
- **Product-card Phase D** (clone-emit — converter outputs option-pickers) + **Phase E** (collection/query block).
- **Polish:** cta-section → rich template-patterns (stats/social-proof filler); notice-banner → per-type icon+CSS bundles.

## Dependency graph
```
Task A (inline, Opus) ── seeds the WC product fixture
   ↓
Task B (Phase C — design-gate brainstorm/research FIRST, then /subagent-driven-development, sonnet)  ─┐
Task C (Wave-2A migrations — BLOCKED on P-FR226 resolution; parallel agents)                          ├─ parallel-safe (disjoint)
Task D (heading/text tweak — inline, Bean decision)                                                   ─┘
   ↓ /qc multi-rater before each commit
Commit to feat/theme-blocks-* (commit by explicit path; merge to main = Bean's call, cloning thread idle)
```

## Guardrails (carried forward + extended this session)
- **Read block.json + edit.js + render.php + `/wp-blocks` before asserting any block's capability** — never infer from a partial dump.
- **Triage before fixing** — verify a reported bug still reproduces against ground truth (REST render / edit.js read / editor repro) BEFORE dispatching a fix. (3 of 4 reported bugs were stale last session.)
- **Deprecations required** — any change to a static block's save() or an attribute schema needs a `deprecated.js` entry, or existing posts show "unexpected content".
- **Never `source:html` on a dynamic block**; dynamic blocks with InnerBlocks need `save:()=><InnerBlocks.Content/>`.
- **CPT meta needs `custom-fields` support** — a CPT must declare `supports => 'custom-fields'` for `register_meta`+`show_in_rest` to expose `meta` in REST (caught 2026-06-02 — without it zero meta round-trips).
- **Cache-bust:** bump block.json `version` on block CSS/JS changes; bump theme `style.css` `Version:` on theme-CSS changes (theme CSS keys `?ver=` off the theme version — caught live 2026-06-02).
- **Deploy + OPcache reset before measure** — `build-deploy.py` + (for PHP changes) the opcache_reset webroot trick before any browser/REST test, or you measure stale output.
- **No client-specific values in base theme/blocks** — client work lives in `sites/<client>/` only.
- **CDP top-layer quirk** — synthetic `dispatchMouseEvent` clicks on popover/top-layer elements don't reliably trigger nav in headless Chrome; use programmatic `.click()` or a screenshot, not a CDP click + state check.
- **WCAG 2.2 AA + 44px touch targets + mobile-first** on all new UI.
- **Work on `main` or a fresh `feat/theme-blocks-*` short-lived branch** — commit ONLY your files by explicit path (never `git add .`/`-A`); before committing, `git status` to check the cloning thread hasn't staged/dirty files; if your commit reports "nothing staged", the other thread likely swept your files — verify `git log -1 --stat`. Do NOT recreate a long-lived shared branch (it caused the concurrent-commit race). Merge to main = Bean's call when both threads are clean.

## Methodology guardrails (do not skip)
- **Root cause before instance fix** — find the class of failure before patching the instance (the custom-fields fix was 1 line once root-caused; section-by-section guessing is the anti-pattern).
- **Verify rendered output, not internal metrics (R-22-11)** — live REST render / editor / frontend is canonical, not the build log.
- **Outcome vs completion** — code shipped ≠ outcome achieved; if the live test isn't run, the task isn't done (cart increment is the live example).
- **/qc multi-rater BEFORE every commit** touching converter / pipeline / SGS-block logic.
- **Dispatched agents have NO commit/deploy authority** — they return uncommitted; main thread reviews + builds + deploys + commits.
