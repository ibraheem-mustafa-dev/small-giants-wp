Invoke /autopilot before doing anything else.

> ⚠ THIS FILE IS A POINTER, NOT THE TRUTH. Live status = `.claude/LEDGER.md` — read it first; if it contradicts this prompt, the LEDGER wins.
> ⚠ **GATE: this session may not start until Spec 38's front-matter reads `status: active` (Bean's design-gate sign-off). If it still reads `draft`, STOP and tell Bean the gate is unsigned.**
> Co-active tracks may share this worktree — path-scope every commit; `git branch --show-current` in the same command as each commit.
> **This session runs in PLAN MODE first** — investigate, present the plan, get approval, then build.

# Next session — Motion Wave A: Tier G foundation + scroll core + SplitText

You are the engineer for the SGS Motion System (Spec 38). Bean has signed off the two-tier doctrine (D406) and the wave plan. Wave A builds the ENTIRE shared infrastructure plus the scroll-core effects and SplitText. Everything in this wave is ADDITIVE — no existing Tier V system, shipped block, or template is modified.

## State recap (plain English — no assumed pretext)

SGS's motion today is vanilla-only (Tier V): entrance animations, hovers, parallax, marquees. Spec 38 added a second tier — Tier G, powered by GSAP (now 100% free) — for effects vanilla can't do: sections that pin while a timeline scrubs with scroll, word-by-word text reveals, horizontal-scroll sections. Nothing vanilla migrates; GSAP loads ONLY on pages that use a Tier G effect (zero bytes otherwise). This wave builds the loader, the runtime provider, the attribute grammar, the DB rows, and the first four effects.

## First action (<5 min, zero deps)

```bash
git log -1 --stat && git status && git branch --show-current
grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1   # D-ceiling (≥D409 expected)
grep -m1 "^status" .claude/specs/38-SGS-MOTION-SYSTEM.md          # MUST be: active
```

## Mandatory READING — before any Write/Edit or dispatch

1. `.claude/specs/38-SGS-MOTION-SYSTEM.md` **IN FULL** — the governing spec. Especially §1 (doctrine), §4.3 (entrance×scrub exclusivity), §4.4 (conditional loading, D409), §6 (DB seeding), §11 (fx grammar).
2. Root `CLAUDE.md` IN FULL — 7 rules + root-cause methodology.
3. `.claude/LEDGER.md` — live fronts; confirm no track collision on shared files (`class-sgs-blocks.php`, webpack config).
4. `plugins/sgs-blocks/src/shared/effects/motion-utils.js` + one consumer (`src/blocks/nav-menu/view.js`) — the house contract the gsap provider MUST match (live reduced-motion check, init→cleanup, bfcache).
5. `plugins/sgs-blocks/includes/class-sgs-css-registry.php` — the render_block p99 chokepoint + editor-parity predicate the motion registry mirrors.
6. `plugins/sgs-blocks/scripts/seed-composition-roles.py` — the idempotent-seeder model for `seed-motion-fx-registry.py`.
7. Spec 35 Parts A/B/C/L — every new inspector panel must pass the FAIL-CLOSED `audit-inspector-conformance.js` prebuild gate.

## Why this matters (Rule 7)

This is the single biggest visible-quality jump available to SGS client sites — the premium-motion vocabulary (pinned scroll stories, split-text reveals) that Webflow/Framer sites use to feel expensive, delivered as client-editable block settings. Top USP: zero-cost pages stay zero-cost (conditional loading). Next action: the Phase 0 table below. Impact: unlocks Waves B + C (both depend only on this wave).

## Phase 0 — work breakdown (tier = DETERMINISM routing, not difficulty)

| ID | Item | Tier | Est | QC |
|---|---|---|---|---|
| A1 | `npm i gsap` + webpack externals (`gsap`, `gsap/*` → WP script-module IDs) + per-plugin module registration in PHP (core/ScrollTrigger/SplitText each a registered module) | SONNET | 20m | build green + `wp_script_modules()` lists the modules; NO page enqueues them yet (network check) |
| A2 | `SGS_Motion_Registry` (`includes/class-sgs-motion-registry.php`): render_block p99 sniff of fx attrs/`data-sgs-fx`, effect→plugin map from DB, `wp_enqueue_script_module()`; editor-parity predicate copied from css-registry | SONNET | 45m | zero-fx page = 0 gsap bytes; 1-scrub page = core+ScrollTrigger only; 10 same-effect blocks = 1 enqueue (LIVE, network tab) |
| A3 | `src/shared/effects/gsap/provider.js` — plugin registration, `gsap.defaults`, `gsap.matchMedia('(prefers-reduced-motion: no-preference)')` global gate, bfcache `pageshow`/`persisted` teardown; effect modules export `initX(el)→cleanup()` | SONNET | 45m | no-JS render = content fully visible; OS reduced-motion toggle mid-session kills tweens (LIVE) |
| A4 | fx attribute surface: extension registering `fx`/`fxTrigger`/`fxStart`/`fxEnd`/`fxScrub`/`fxStagger`/`fxDuration`/`fxEase` + save/render emission of `data-sgs-fx-*` (Spec 38 §11.2) | SONNET | 30m | stored attrs round-trip; `data-sgs-fx` present on frontend markup; undeclared-attr gate green |
| A5 | §4.3 exclusivity: render layer omits `data-sgs-animation*` when an `owns_scroll_transform` fx is present; editor Disabled+Notice mirror | SONNET | 30m | stored block carrying BOTH families renders scrub only (LIVE DOM); Notice shows in editor |
| A6 | DB: `fx_effects` table + `seed-motion-fx-registry.py` (idempotent, [ok]/[skip]/[set]) + `db-consistency/check_motion_fx_reseed.py`; `block_attributes` fx rows under `fx:*`; `animation_tokens` reconcile (add `fade-up`, wire `used_by`) | PYTHON | 30m | seeder re-run = 0 changes; full `/sgs-update` rebuild + guard = green |
| A7 | Effects: pin+scrub (FR-38-6), element scrub (FR-38-7), horizontal panel (FR-38-8 — container variation + mobile scroll-snap fallback), SplitText (FR-38-10, a11y mode ON) | SONNET ×2 parallel | 1.5h | each effect fires on a canary page (named observable signal per effect — see ritual Q21) |
| A8 | Inspector "Scroll & effects" ToolsPanel (Spec 38 §7) on container/heading/text/quote/hero | SONNET | 45m | `audit-inspector-conformance.js --check` green (it is FAIL-CLOSED in prebuild) |
| A9 | Canary pages per effect family + bundle-size budget check wired to prebuild (FR-38-24) | PYTHON | 30m | budget check fails on a planted oversize; canaries listed in the report |
| A10 | Live verification sweep + Bean's eye | LIVE + BEAN | 45m | see Task 5 |

Routing note: nothing here is OPUS-shaped (the architecture is already specified); dispatch A7 as two parallel Sonnet agents (scroll effects / SplitText) per `/subagent-prompt`, each confined to its own files (FR-31-6.1 discipline: agents never edit shared files — the registry/provider are main-thread work).

## Tasks

### Task 1 — Foundation (A1–A3). **Commit 1** (R-31-5: phases never ship as single commits).
### Task 2 — Grammar + exclusivity + DB (A4–A6). **Commit 2.**
### Task 3 — Effects (A7). **Commit 3.**
### Task 4 — Inspector + canaries + budget gate (A8–A9). **Commit 4.**
### Task 5 — Live verification + Bean's eye (R-31-13). NO commit until green.
**What:** Deploy to sandybrown (`build-deploy.py --target sandybrown` — NEVER hand-roll tar/scp, D336). For every effect: two independent evidence sources — (a) emitted markup / network trace, (b) live Playwright DOM measurement of the named observable signal (e.g. pinned section: `getBoundingClientRect().top === 0` across a scroll range; SplitText: child span count > 1 during reveal, aria-label preserved). Reduced-motion arm checked via OS emulation where the harness allows; flag reasoned-only arms honestly. Then Bean's eye on the canary pages — numbers alone do not close.
**Acceptance:** every check has a recorded result. "Cannot tell" is a FAIL — extend the measurement.

## Stop-and-snapshot (STOP #19)

If a fix to a SHARED surface (registry, provider, webpack config) regresses twice: STOP, `git stash` / commit the WIP to a branch, snapshot findings into the LEDGER, and end the session with the evidence baked into the next prompt — do not iterate a failing sensitive fix inline under context pressure.

## Dependency graph

```
A1 → A2 → A3 → A4 → A5 → A7 → A8 → A9 → Task 5 (live + Bean) → push (verify git log -1)
          A6 ─────────↗
```

## Pre-flight self-attestation ritual (answer inline before first Write/Edit)

1. Is Spec 38 `status: active`? (If not — STOP.)
2. Have I read Spec 38 IN FULL this session?
3. Q21 — have I named the OBSERVABLE SIGNAL for every effect before checking it? (A green build is zero evidence an effect fires — 3 inert bugs passed every gate on 2026-07-27.)
4. Q25 — for anything position/pin-related, did I MEASURE the rendered box and identify the actual containing block?
5. Q26 — do all fx attr shapes match block.json declarations? (A shape mismatch silently drops the whole value; WP discards undeclared attrs.)
6. Q27 — are irrelevant fx panels hidden via `hideExtensions` deliberately, and did I check the panel's attrs are actually registered?
7. Am I about to enqueue anything unconditionally? (That is the named anti-pattern — §4.4.)
8. Branch check: `git branch --show-current` = main, in the same command as each commit?

## Methodology guardrails (do not skip)

- Root-cause before fix (`/systematic-debugging`); prove the cause, never "not A therefore B".
- `/qc-council` before commit on the registry (shared, high-blast) per blub.db 255.
- Verify BOTH surfaces: frontend AND editor canvas (deploy, open editor, read console).
- `git log -1` after every commit — a "succeeded" commit can be silently gate-blocked.
- Time estimates default LOW; if a step finishes 3× faster, revise the rest downward.

## Known-open, NOT blockers

- P-ROW-COLLAPSE-RESIDUALS (Spec 37 reduced-motion arm unproven) — dependency context only.
- Tier V assets still enqueue unconditionally — Wave C stretch, not this wave.

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | FIRST |
| `/sgs-wp-engine` | All block/extension work |
| `/qc-council` | Before the registry commit |
| `/qc-inline` | Per-task checks |
| `/verify-loop` | Two-attestation on load-bearing claims |
| `/handoff` | Session close |

## Tool bindings (exact commands)

| Operation | Command |
|---|---|
| Build | `cd plugins/sgs-blocks && npm run build` (PowerShell — nvm shim broken in Git Bash) |
| Deploy | `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` |
| DB query | `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."` |
| DB update | `/sgs-update` after block.json changes |
| Live DOM | Playwright MCP (own isolated browser if another track is active) |

## Guardrails

Path-scoped commits only. No `--allow-dirty`, no `--skip-verify` on deploy. No deprecated.js (D270). No CDN references ever. UK English. Session closes with `/handoff`.
