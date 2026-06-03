---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-03-theme-session8
generated: 2026-06-03
primary_goal: "SGS-THEME THREAD. Bean-decision on universal WCAG auto-contrast; build FR-26-D2 (extend push-theme-snapshot.py to write the live wp_global_styles post); migrate the product-page mockup to SGS-BEM then emit option-pickers there (Phase D product-page); per-option data model (SKU matrix) to activate the dormant pill swap; FR-22-6 Wave-2A real migration (label/heading/text). NOTE: the global-CSS/global-styles question is now RESOLVED AS DESIGN → Spec 26 (D158); the whole build is DEFERRED until the cloning phase closes EXCEPT FR-26-D2 (= Task B, the one urgent low-risk item). FR-26-D1 is RESOLVED/MOOT — do NOT clear canary post 7."
---

# Next Session — SGS THEME thread (blocks, editor UX, WooCommerce layer)

> ## ⚠ READ THIS BEFORE ANYTHING ELSE — warm start ⚠
> Invoke `/autopilot` first. This is the THEME/BLOCKS thread — NOT the cloning pipeline (sibling `.claude/next-session-prompt.md`). **DO NOT START ANY TASK until you have read the MANDATORY READING LIST below, in order.**
> **STOP — don't assert block capability from a partial dump:** read block.json + edit.js + render.php + `/wp-blocks` before building.
> **STOP — triage before fixing:** verify a reported bug still reproduces against ground truth (REST render / edit.js / editor repro) BEFORE dispatching a fix. (Past sessions: multiple reported "bugs" were stale/false.)
> **STOP — verify against git, not the handoff:** a prior session's opening handoffs were STALE on merge-status AND parallel-session-active. Run `git log --oneline -8` + `git branch` first; trust the repo over prose.
> **STOP — canary live styles come from the `wp_global_styles` DB post (ID 7), NOT theme.json on disk.** Editing theme.json / running `push-theme-snapshot.py` alone has NO live effect — you MUST also POST `/wp-json/wp/v2/global-styles/7`. `theme/sgs-theme/styles/mamas-munches.css` is an ORPHAN (not enqueued). (Memory `canary-live-styles-come-from-wp-global-styles-post`.)
> **STOP — the global-styles architecture is now SPEC'd: read `.claude/specs/26-SGS-GLOBAL-STYLES-AND-THEMING.md` (D158) BEFORE any theme.json / global-styles / per-client-theming change.** The whole build is DEFERRED until the cloning phase closes EXCEPT FR-26-D2 (Task B). **FR-26-D1 is RESOLVED/MOOT — do NOT clear canary post 7** (theme.json + post 7 already mirror Mama's palette + WCAG CSS; clearing is unnecessary AND risky on the shared canary). The corrected model: WP 7.0 global styles is a DATA-LAYER MERGE (`wp_global_styles` post = live source of truth, theme.json = factory seed), NOT a CSS override — this supersedes the old D156 "override precedence" framing.
> **STOP — block style controls must accept RAW CSS values + defaults stay overridable:** every default colour/spacing is `var(--sgs-x, <default>)` with an editor control that accepts raw hex/px (theme.json `color.custom`/`customSpacingSize` true), never a token-preset-only cap (the recurring "gap rejected raw px" bug). (Memory `block-style-controls-accept-raw-css-and-overridable`.)
> **Guardrail (all tasks):** after every block build-deploy, open the WP editor on canary 144/514 and verify the control renders + zero console errors before considering the task done. Bump block.json `version` on any block CSS/JS change AND the theme `style.css` `Version:` on any THEME-CSS change.

## State recap (plain English)
The SGS framework is a custom WordPress block library (theme + blocks plugin) whose product/WooCommerce layer is now substantial. Last session (session 6) shipped: product-card Bound mode (wrapper+bridge over WooCommerce, D151), the `sgs/content-collection` query block (Phase E, D154), the converter emitting `sgs/option-picker` for draft pill groups (Phase D, D153), removed the redundant `hero` heading style (D155), a full QC-council pass with all fixes applied, WCAG global colour/spacing defaults + raw-value enablement (D156), the Mama's-canary contrast fix (now 5.28:1), and a theme skip-link fix (D157). The authoritative spec for the whole WooCommerce layer is **Spec 25 — SGS WooCommerce Experience Layer**. Work from `main` (the cloning thread's session is closed); commit by explicit path.

## First action (smallest step, ≤5 min, zero deps)
Read the MANDATORY READING LIST. Then bring Bean the **universal auto-contrast decision** (Task A) — a one-question design fork that gates how all future client palettes get WCAG-safe button/pill text; everything else can proceed once it's answered or explicitly deferred.

## MANDATORY READING LIST (read FULLY first)
1. This file.
2. `.claude/handoff-theme.md` (2026-06-03, session 7 = Spec 26 global-styles design; session 6 below it = Phase D/E/WCAG/skip-link) — what shipped + the outcome assessment.
3. `.claude/specs/26-SGS-GLOBAL-STYLES-AND-THEMING.md` — the global-styles + per-client theming spec (D158; supersedes Spec 01 §D156 framing). Build DEFERRED except FR-26-D2. Read BEFORE any theme.json / global-styles change.
4. `.claude/specs/25-SGS-WOOCOMMERCE-EXPERIENCE-LAYER.md` — the authoritative WC-layer spec (feature map, statuses, files).
5. `.claude/decisions.md` newest — D158 (global-styles architecture → Spec 26; FR-26-D1 RESOLVED/MOOT) · D157 (skip-link) · D156 (WCAG colour defaults + universal-auto-contrast deferral) · D155 (hero removed) · D154 (content-collection) · D153 (Phase D emit) · D151/D149 (product-card dual-source).
6. `.claude/specs/24-QUERY-DRIVEN-CONTENT-CARDS.md` — card/collection FRs (status active).
7. Root `CLAUDE.md` + `plugins/sgs-blocks/CLAUDE.md` — block customisation standard, deprecation procedure, gotchas, block-status table.
8. `.claude/parking.md` — P-AUTO-CONTRAST-LIGHT-PRIMARIES, P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES, P-PRODUCT-PAGE-MOCKUP-NOT-SGS-BEM, P-PRODUCT-CARD-PILL-SWAP-DORMANT.
9. The product files before extending: `plugins/sgs-blocks/src/blocks/{product-card,content-collection,option-picker}/` + `includes/class-product-bindings.php` + `includes/content-types/class-product-cpt.php`.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | ALWAYS — design the auto-contrast approach + the SKU-matrix data model before building |
| `/research` (auto-routes) | ALWAYS — gold-standard for CSS `contrast-color()` browser support (2026) + WC variation/SKU patterns |
| `/gap-analysis` | ALWAYS — grade each build against acceptance |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/strategic-plan` | ALWAYS — order the tasks |
| `/qc-council` | MANDATORY before every converter/SGS-block commit (blub.db 255) — multi-rater, cross-model |
| `/dispatching-parallel-agents` | parallel disjoint work (worked well last session) |
| `/subagent-driven-development` | design-bearing builds (implementer + reviewers) |
| `/sgs-wp-engine` + `/wp-block-development` | block dev — block.json, attrs, render, deprecations, Block Bindings |
| `/wp-rest-api` | CPT meta / REST / Block Bindings / the wp_global_styles POST |
| `/systematic-debugging` | any bug — root-cause before fixing |
| `/visual-qa` or `/design-review` | editor UX + WCAG 2.2 AA verification |

## MCP / Tools
| Tool | For |
|------|-----|
| Playwright MCP | live editor + frontend verify on canary; computed-style contrast checks; dismiss beforeunload via `browser_handle_dialog` |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs / capabilities / slots |
| REST block-renderer (`/wp/v2/block-renderer/<block>?context=edit`, app-pwd Basic auth) | fast server-render verification |
| REST global-styles (`/wp/v2/global-styles/7`) | the LIVE canary styles (supersedes theme.json) |
| WooCommerce Store/REST API (`/wc/store/v1`, `/wc/v3`) | product + cart state |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | heavy block / converter / theme builds |
| `design-reviewer` | editor UX + WCAG review |

---

## Task A — Bean decision: universal WCAG auto-contrast
**What:** Decide how the framework gives WCAG-safe button/pill TEXT on ANY client primary out-of-the-box. Options: (1) CSS `contrast-color()`/`light-dark()` when support is safe; (2) build-time/PHP luminance step picking text colour per palette; (3) keep framework-default-white + mandate a per-client dark-text override for light primaries (current).
**Why:** Today's default (white-on-primary) fails WCAG for light-pastel primaries (e.g. Mama's pink) unless overridden. "WCAG out of the box on the majority" needs a real mechanism.
**Orchestration:** inline (Opus). `/research` `contrast-color()` support FIRST (Rule 16), then a ranked menu to Bean. Depends on: none. /qc gate: n/a.
**Acceptance:** Bean picks; if a build follows, WCAG-verified live on both a dark-primary and a light-primary palette.

## Task B — Build FR-26-D2: extend `push-theme-snapshot.py` to update the live `wp_global_styles` post
**What:** Extend the deploy script so a snapshot push ALSO updates the canary's `wp_global_styles` post (not just theme.json on disk). This is **Spec 26 FR-26-D2** — the one urgent, low-risk, build-now slice of the otherwise-deferred Spec 26 (use the WP-native `POST /wp/v2/global-styles/{id}`; no new endpoint/ability needed per D158). Read Spec 26 §FR-26-A3 + §FR-26-D2 first.
**Why:** Live styles come from that post; the script silently misses them (this session's Mama's fix needed a manual REST POST). Without this, the canary's theme.json + post 7 re-diverge on the next disk-only push. Parking P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES; Spec 26 FR-26-D2.
**Orchestration:** delegated, single sonnet via /delegate. Context: post ID 7 on sandybrown; app-password auth; script at `plugins/sgs-blocks/scripts/push-theme-snapshot.py`. Depends on: none. Parallel with: Task C. /qc gate: /qc-inline (deploy a token change, confirm it lands live).
**Acceptance:** a snapshot push changes a live-visible style with no manual REST step.

## Task C — Phase D product-page emit (gated on mockup migration)
**What:** Migrate `sites/mamas-munches/mockups/product/index.html` from bare `pill`/`pill-group` to SGS-BEM (`sgs-product-card__pill-group`/`__pill`), then run the converter so it emits `sgs/option-picker` on the product page.
**Why:** Phase D works on the homepage mockup; the product-page mockup is Stage-0-rejected (not SGS-BEM). Parking P-PRODUCT-PAGE-MOCKUP-NOT-SGS-BEM.
**Orchestration:** delegated, sonnet. Context: the homepage pill-group is the SGS-BEM template; the converter slot row already exists. Depends on: none. Parallel with: Task B. /qc gate: assert emitted `sgs/option-picker` + live editor render.
**Acceptance:** product-page clone emits `sgs/option-picker`; live-verified.

## Task D — Per-option data model (SKU matrix) — activate the dormant pill swap
**What:** Design + build per-option price/image data (Spec 24 FR-24-14, `_sgs_variation_sets` per-option values / `_sgs_sku_matrix`) so selecting a pill visibly changes price/image.
**Why:** Phase C wired the swap but it's dormant (no per-option data). Parking P-PRODUCT-CARD-PILL-SWAP-DORMANT.
**Orchestration:** DESIGN GATE FIRST (/brainstorming) — extend the variation-sets data model + editor panel + the card's Interactivity map. Then /subagent-driven-development (sonnet). Depends on: none. /qc gate: /qc multi-rater (SGS-block rule).
**Acceptance:** a pack-size pill swaps price, a flavour pill swaps image; live-verified; no-JS default correct.

## Task E — FR-22-6 Wave-2A real migration (label / heading / text)
**What:** Migrate `sgs/label`, `sgs/heading`, `sgs/text` to InnerBlocks `echo $content` (notice-banner template) — the REAL roster (report `reports/2026-06-02-fr22-6-wave2-roster-rederived.md`).
**Why:** Continues Phase 2; these are the most-used blocks → HIGH blast radius; deliberate, gated.
**Orchestration:** delegated, /dispatching-parallel-agents (one per block) on sonnet. **BLOCKED** until the null-save→InnerBlocks finding is judged (NB: P-FR226 is DEFERRED/moot until a production SGS site with old posts exists; info-box + notice-banner already shipped the pattern without resolving it). Each needs `deprecated.js` + R-22-14 (no scalar fallback). Depends on: P-FR226 disposition. /qc gate: editor-verify no "unexpected content" + converter emits InnerBlocks.
**Acceptance:** each migrated block builds, editor shows no validation error, converter emits InnerBlocks.

## Dependency graph
```
Task A (inline, Opus — Bean decision; /research first) ── gates future colour work
Task B (sonnet) ─┐
Task C (sonnet)  ├─ parallel-safe (disjoint)
Task D (design-gate → /subagent-driven-development, sonnet) ─┘
Task E (parallel agents — BLOCKED on P-FR226 disposition; HIGH blast radius)
   ↓ /qc multi-rater before each commit
Commit to main (commit by explicit path; cloning thread idle)
```

## Guardrails (carried forward + extended)
- **Read block.json + edit.js + render.php + `/wp-blocks` before asserting any block's capability** — never infer from a partial dump.
- **Triage before fixing** — verify a reported bug still reproduces against ground truth BEFORE dispatching.
- **Deprecations required** — any change to a static block's save() or attribute schema needs a `deprecated.js`, or existing posts show "unexpected content".
- **Never `source:html` on a dynamic block**; dynamic InnerBlocks blocks need `save:()=><InnerBlocks.Content/>`.
- **CPT meta needs `custom-fields` support** for REST `meta` exposure.
- **Cache-bust:** block.json `version` on block CSS/JS; theme `style.css` `Version:` on theme CSS.
- **Deploy + OPcache reset before measure** — `build-deploy.py` (+ opcache_reset webroot trick for PHP) before any browser/REST test, or you measure stale output.
- **Canary live styles = `wp_global_styles` post (ID 7)**, not theme.json on disk — edit both + POST the post.
- **Block style controls accept RAW CSS values + defaults overridable** (`var(--sgs-x, default)` + theme.json custom values).
- **No client-specific values in base theme/blocks** — client work lives in `sites/<client>/` + the snapshot/global-styles post.
- **CDP top-layer quirk** — synthetic `dispatchMouseEvent` clicks on popover/top-layer elements don't reliably trigger nav in headless Chrome; use `.click()` or a screenshot.
- **WCAG 2.2 AA + 44px touch targets + mobile-first** on all new UI.
- **Work on `main`** (cloning thread idle); commit ONLY your files by explicit path (never `git add .`/`-A`; `lucide-icons.php` stays uncommitted); `git status` before committing; verify `git log -1 --stat` after.

## Methodology guardrails (do not skip)
- **Root cause before instance fix** — find the class of failure before patching the instance.
- **Verify rendered output, not internal metrics (R-22-11)** — live REST render / editor / frontend is canonical; lint/build green ≠ correct (this session: `php -l` passed code that still had a runtime SSR-wipe bug + a CSS-injection regex).
- **Outcome vs completion** — code shipped ≠ outcome achieved; if the live test isn't run, the task isn't done.
- **/qc multi-rater BEFORE every commit** touching converter / pipeline / SGS-block logic (blub.db 255). Last session's 3-rater cross-model QC caught a real converter side-effect (G3-attrs text-fallback) + a security regex + WCAG fails that lint/build missed.
- **Dispatched agents have NO commit/deploy authority** — they return uncommitted; main thread reviews + builds + deploys + commits.
- **Prefer single Sonnet subagent over Opus-inline; parallelise disjoint work** (Bean-locked) — last session's parallel orchestration worked well across ~15 dispatches.
