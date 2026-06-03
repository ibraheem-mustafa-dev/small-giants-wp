---
doc_type: next-session-prompt
project: small-giants-wp
thread: sgs-theme
session_tag: small-giants-wp-2026-06-03-theme-session9
generated: 2026-06-03
primary_goal: "SGS-THEME THREAD. FIRST: the deferred shared-doc bookkeeping (retire Spec 24/25, record Spec-27 decision, registry + CLAUDE.md, auto-contrast + divergence) once the tree is clear. THEN: deploy the product-meta security fix to canary; Bean S-grade sign-off for adversarial-council; and the remaining theme/WooCommerce work. The variable-product configurator (Spec 27) BUILD is deferred until the cloning phase closes (it re-baselines pixel-diff). Spec 27 is now the single MASTER for the product + WooCommerce layer (absorbed Spec 24 + 25)."
---

# Next Session — SGS THEME thread (blocks, editor UX, WooCommerce layer)

> ## WARNING: READ THIS BEFORE ANYTHING ELSE - warm start
> Invoke `/autopilot` first. This is the THEME/BLOCKS thread, NOT the cloning pipeline (sibling `.claude/next-session-prompt.md`). DO NOT START ANY TASK until you have read the MANDATORY READING LIST below, in order.
> **STOP - shared-doc bookkeeping was DEFERRED last session** (a parallel cloning session held the docs). Do it FIRST (Task 1), and only once `git status` shows the cloning session's files (`testimonial-slider/*`, `theme-snapshot.json`) are gone/committed. Commit by EXPLICIT PATH only (never `git add .`); a parallel session may still be live.
> **STOP - Spec 27 is now the single MASTER** for the product + WooCommerce layer (it absorbed Spec 24 + Spec 25 in v4). Spec 24/25 are SUPERSEDED but not yet formally retired (that is Task 1). Read Spec 27 before any product-card / option-picker / cart / content-collection / configurator change.
> **STOP - don't assert block capability from a partial dump:** read block.json + edit.js + render.php + `/wp-blocks` before building.
> **STOP - triage before fixing:** verify a reported bug still reproduces against ground truth (REST render / edit.js / editor repro) BEFORE dispatching a fix. (Past sessions: multiple reported "bugs" were stale/false - e.g. this session's hero "both buttons primary" was a STALE clone, not a converter bug.)
> **STOP - verify against git, not the handoff:** run `git log --oneline -8` + `git branch` first; trust the repo over prose.
> **STOP - canary live styles come from the `wp_global_styles` DB post (ID 7), NOT theme.json on disk.** FR-26-D2 (shipped) now writes that post via `push-theme-snapshot.py`, but a disk-only edit still re-diverges. `theme/sgs-theme/styles/mamas-munches.css` is an ORPHAN (not enqueued). (Memory `canary-live-styles-come-from-wp-global-styles-post`.)
> **STOP - global-styles architecture is SPEC'd: read `.claude/specs/26-SGS-GLOBAL-STYLES-AND-THEMING.md` (D158) BEFORE any theme.json / global-styles / per-client-theming change.** Build deferred except FR-26-D2 (shipped). FR-26-D1 RESOLVED/MOOT - do NOT clear canary post 7.
> **STOP - block style controls must accept RAW CSS values + defaults stay overridable:** every default colour/spacing is `var(--sgs-x, <default>)` with an editor control accepting raw hex/px (theme.json `color.custom`/`customSpacingSize` true). (Memory `block-style-controls-accept-raw-css-and-overridable`.)
> **STOP - auto-contrast direction is DECIDED: build-time luminance** (compute WCAG luminance of the brand colour at deploy, pick black/white text), with CSS `contrast-color()` as a later progressive-enhancement layer. Record this in Spec 26 / parking when you do Task 1.
> **STOP - run `/adversarial-council` (the new skill) on any spec/plan/design BEFORE building it.** It is the bottled "pain-in-the-butt council" (parallel committed adversaries + convergence -> must-fix register + GO/NO-GO). For high stakes, polite-then-brutal = two rounds.
> **Guardrail (all tasks):** after every block build-deploy, open the WP editor on canary 144/514 and verify the control renders + zero console errors before considering the task done. Bump block.json `version` on any block CSS/JS change AND theme `style.css` `Version:` on any THEME-CSS change.

## State recap (plain English)
The SGS framework is a custom WordPress block library (theme + blocks plugin) whose product/WooCommerce layer is now substantial. Last session (session 8): shipped Task A (auto-contrast decision = build-time luminance) + Task B (FR-26-D2 push-theme-snapshot REST-write); re-cloned Mama's homepage page 144 to fix the hero secondary button (stale-clone root cause); wrote + consolidated the **Spec 27 SGS Product & WooCommerce Layer master** (research + 2 qc-council rounds + re-scoped MVP-first + grade-A; absorbed Spec 24 + 25); fixed a live product-meta IDOR security bug; and built the new `/adversarial-council` skill. Three deferred follow-ups (Task 1, 2, 3 below) plus the Spec 27 MVP build remain. Work from `main`; commit by explicit path.

## First action (smallest step, <=5 min, zero deps)
Read the MANDATORY READING LIST. Then run `git status` - if the cloning session's files are gone/committed (clean tree apart from `lucide-icons.php`), start Task 1 (the deferred bookkeeping). If the tree still shows a live parallel session, do Task 2 (deploy the security fix - it touches only the plugin, collision-safe) first.

## MANDATORY READING LIST (read FULLY first)
1. This file.
2. `.claude/handoff-theme.md` (session 8 at top = this work; sessions 7/6 below = Spec 26 + Phase D/E/WCAG history).
3. `.claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md` - the NEW master (product card + option-picker + cart + content-collection + variable-product configurator). Read before any product-layer change.
4. `.claude/specs/26-SGS-GLOBAL-STYLES-AND-THEMING.md` - global styles + per-client theming (D158). Read before any theme.json/global-styles change.
5. `.claude/decisions.md` newest - D158 (global-styles -> Spec 26) and (once Task 1 lands) the Spec-27 decision.
6. Root `CLAUDE.md` + `plugins/sgs-blocks/CLAUDE.md` - block customisation standard, deprecation procedure, gotchas, block-status table.
7. `.claude/parking.md` - P-AUTO-CONTRAST-LIGHT-PRIMARIES, P-PUSH-SNAPSHOT-SKIPS-GLOBAL-STYLES, P-PRODUCT-PAGE-MOCKUP-NOT-SGS-BEM, P-PRODUCT-CARD-PILL-SWAP-DORMANT.
8. The product files before extending: `plugins/sgs-blocks/src/blocks/{product-card,content-collection,option-picker}/` + `includes/class-product-bindings.php` + `includes/content-types/class-product-cpt.php`.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | ALWAYS - design before build |
| `/research` (auto-routes) | ALWAYS - gold-standard before non-trivial implementations |
| `/gap-analysis` | ALWAYS - grade each build against acceptance |
| `/lifecycle` | ALWAYS - before any skill/agent/pipeline change |
| `/strategic-plan` | ALWAYS - order the tasks |
| `/adversarial-council` | NEW - brutal pre-build pre-mortem on any spec/plan before building |
| `/qc-council` | MANDATORY before every converter/SGS-block commit (blub.db 255) - multi-rater, cross-model |
| `/handoff` | session close |
| `/sgs-wp-engine` + `/wp-block-development` | block dev - block.json, attrs, render, deprecations, Block Bindings |
| `/wp-rest-api` | CPT meta / REST / Block Bindings / the wp_global_styles POST |
| `/systematic-debugging` | any bug - root-cause before fixing |
| `/visual-qa` or `/design-review` | editor UX + WCAG 2.2 AA verification |

## MCP / Tools
| Tool | For |
|------|-----|
| Playwright MCP | live editor + frontend verify on canary; computed-style contrast checks |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema before asserting capability |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | block roster / attrs / capabilities / slots |
| REST global-styles (`/wp/v2/global-styles/7`) | the LIVE canary styles (supersedes theme.json) |
| WooCommerce Store/REST API (`/wc/store/v1`, `/wc/v3`) | product + cart state |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | heavy block / converter / theme builds |
| `design-reviewer` | editor UX + WCAG review |

---

## Task 1 - Deferred shared-doc bookkeeping (do FIRST, once tree clear)
**What:** complete the consolidation paperwork that was deferred last session because a parallel cloning session held the shared docs. Retire Spec 24 + Spec 25 (frontmatter `absorbed_by: specs/27-...`, `status: superseded`, move both to `.claude/specs/archive/`); record the Spec-27 decision (next D-number, D159+) in `decisions.md`; update `docs-registry.yaml` (27 = master, 24/25 retired) + the CLAUDE.md spec list; record the auto-contrast decision (build-time luminance) into Spec 26 / parking `P-AUTO-CONTRAST-LIGHT-PRIMARIES`; record the snapshot<->live post-7 divergence note (page-29 rules = throwaway WC-extension test CSS per Bean, disposable).
**Why:** Spec 27 is committed as the master but 24/25 still read "active"; the decision + registry are unrecorded. Living-docs hygiene (D150 archive-on-resolve).
**Orchestration:** inline (Opus). Depends on: a clean tree (`git status` shows no parallel-session files). Commit by explicit path. /qc gate: docscore on each edited doc (>=A-).
**Acceptance:** Spec 24/25 archived + `absorbed_by` set; decisions.md carries the Spec-27 D; registry + CLAUDE.md updated; auto-contrast + divergence recorded; docscore >=90% on each.

## Task 2 - Deploy the product-meta security fix to the canary
**What:** deploy `class-product-cpt.php` (the per-object `edit_post` auth fix, commit d07a7e05) to the sandybrown canary + OPcache reset.
**Why:** the IDOR fix is committed but not live; the canary still runs the vulnerable version.
**Orchestration:** delegated, single sonnet via /delegate. Context: `build-deploy.py` + the opcache reset webroot trick; collision-safe (touches only the plugin). Depends on: none. Parallel with: Task 1. /qc gate: /qc-inline (confirm a non-editor cannot write `sgs_price` via REST on the canary).
**Acceptance:** the fix is live; a REST write of product meta by a non-edit_post user is rejected.

## Task 3 - S-grade sign-off for adversarial-council (Bean decision)
**What:** present the S-grade case (AI-native adversarial pre-mortem council; showpiece) to Bean; on yes, record the S-grade in the skill's evaluation + capture it.
**Why:** flagged as a genuine showpiece candidate; needs explicit human sign-off.
**Orchestration:** inline (Opus, Bean decision). Depends on: none. /qc gate: n/a.
**Acceptance:** Bean confirms or declines; recorded either way.

## Task 4 - Spec 27 Phase 1 MVP build (DEFERRED until cloning phase closes)
**What:** build the read-through variable-product configurator MVP (Spec 27 Phase 1: A1/A2/A3/A5, B1, C1, G1/G2/G3/G6, H1/H2/H3, I-MVP) - live WC price/image/stock swap, secure no-oversell add-to-cart, accessible card, cross-attribute availability past the 30-variation cliff.
**Why:** makes Mama's sell with real variant pricing; the smallest shippable real configurator.
**Orchestration:** DESIGN GATE (/strategic-plan -> /phase-planner per Spec 27 Phase 1) then /subagent-driven-development (sonnet). **Run `/adversarial-council` on the phase plan before building.** Depends on: the cloning phase closing (it re-baselines the pixel-diff - do NOT build mid-cloning-phase). /qc gate: /qc multi-rater per configurator commit + Bean visual sign-off.
**Acceptance:** per Spec 27 Phase-1 acceptance criteria (lab INP <=200ms, axe-core 0, tampered add-to-cart rejected, 48-SKU availability both directions).

## Dependency graph
```
Task 1 (inline, Opus - deferred bookkeeping; needs clean tree) ─┐
Task 2 (sonnet - deploy security fix; collision-safe)          ├─ parallel-safe
Task 3 (inline, Opus - Bean S-grade decision)                  ─┘
Task 4 (Spec 27 MVP - DEFERRED until cloning phase closes; /adversarial-council the plan first)
   ↓ /qc multi-rater + Bean sign-off per commit
Commit to main (explicit path; cloning thread may be live)
```

## Guardrails (carried forward + extended)
- **Read block.json + edit.js + render.php + `/wp-blocks` before asserting any block's capability** - never infer from a partial dump.
- **Triage before fixing** - verify a reported bug still reproduces against ground truth BEFORE dispatching (this session: hero "both primary" was a STALE clone, not a bug).
- **Deprecations required** - any change to a static block's save() or attribute schema needs a `deprecated.js`.
- **Never `source:html` on a dynamic block**; dynamic InnerBlocks blocks need `save:()=><InnerBlocks.Content/>`.
- **CPT meta needs `custom-fields` support** for REST `meta` exposure; meta `auth_callback` must be per-object `edit_post` (IDOR - fixed this session).
- **Cache-bust:** block.json `version` on block CSS/JS; theme `style.css` `Version:` on theme CSS.
- **Deploy + OPcache reset before measure** - `build-deploy.py` (+ opcache_reset webroot trick) before any browser/REST test, or you measure stale output.
- **Canary live styles = `wp_global_styles` post (ID 7)**, not theme.json on disk - FR-26-D2 now writes it, but disk-only edits re-diverge.
- **Block style controls accept RAW CSS values + defaults overridable** (`var(--sgs-x, default)` + theme.json custom values).
- **No client-specific values in base theme/blocks** - client work lives in `sites/<client>/` + the snapshot/global-styles post.
- **WCAG 2.2 AA + 44px touch targets + mobile-first** on all new UI.
- **Work on `main`** (cloning thread may be live); commit ONLY your files by explicit path (never `git add .`/`-A`; `lucide-icons.php` stays uncommitted); `git status` before committing; verify `git log -1 --stat` after.
- **Spec 27 = single master** for the product + WC layer; 24/25 superseded (retired in Task 1).

## Methodology guardrails (do not skip)
- **Run `/adversarial-council` on any spec/plan/design before building** - the bottled pain-in-the-butt council; it found Spec 27's structural over-scope the polite round missed. Polite-then-brutal (two rounds) for high stakes.
- **Root cause before instance fix** - find the class of failure before patching the instance (this session: the stale-clone root cause for the button, not a per-button patch).
- **Verify rendered output, not internal metrics (R-22-11)** - live REST render / editor / frontend is canonical; lint/build green != correct.
- **Outcome vs completion** - code shipped != outcome achieved; if the live test isn't run, the task isn't done.
- **/qc multi-rater BEFORE every commit** touching converter / pipeline / SGS-block logic (blub.db 255).
- **Dispatched agents have NO commit/deploy authority** - they return uncommitted; main thread reviews + builds + deploys + commits.
- **Prefer single Sonnet subagent over Opus-inline; parallelise disjoint work** (Bean-locked); /qc after every considerable change.
