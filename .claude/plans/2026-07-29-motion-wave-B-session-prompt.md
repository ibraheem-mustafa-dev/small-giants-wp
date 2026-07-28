Invoke /autopilot before doing anything else.

> ⚠ THIS FILE IS A POINTER, NOT THE TRUTH. Live status = `.claude/LEDGER.md` — if it contradicts this prompt, the LEDGER wins.
> ⚠ **GATE 1: Spec 38 must read `status: active` (Bean signed the design gate). GATE 2: Wave A must be SHIPPED + live-verified (check the LEDGER) — this wave consumes its registry, provider, and ScrollTrigger module.** If either gate fails, STOP.
> Co-active tracks may share this worktree — path-scope every commit; `git branch --show-current` in the same command as each commit.
> **This session runs in PLAN MODE first** — investigate, present the plan, get approval, then build.
> ⚠ **HIGHEST-RISK WAVE: it touches the Spec 37 header system and theme templates. The FR-37-40 regression gate below is NOT optional.**

# Next session — Motion Wave B: ScrollSmoother + the sticky resolution + page transitions

You are the engineer for the SGS Motion System (Spec 38) site-level wave. Wave A shipped the Tier G foundation. This wave adds the two SITE-level capabilities: GSAP ScrollSmoother (with the D407 header-sticky resolution) and cross-document View Transitions page transitions (Tier V — no GSAP).

## State recap (plain English — no assumed pretext)

ScrollSmoother gives the whole site buttery, slightly-lagged scrolling — but it works by putting the page content inside a wrapper it moves with `transform`, and a CSS sticky header inside a transformed wrapper silently stops sticking (Spec 37's own `findStickyBreakingAncestor()` guard already detects exactly this). Bean approved resolution D407: **the header lives OUTSIDE the smoothed wrapper** (scroll stays native, so the shipped header system — sticky, shrink, hide-on-scroll, transparent, row collapse — keeps working untouched), and the existing guard becomes a tripwire that disables the SMOOTHER (never sticky) if a custom template traps the header inside. Page transitions are pure CSS (`@view-transition`) — no GSAP, no router; unsupported browsers just navigate normally.

## First action (<5 min, zero deps)

```bash
git log -1 --stat && git status && git branch --show-current
grep -m1 "^status" .claude/specs/38-SGS-MOTION-SYSTEM.md          # MUST be: active
grep -n "Wave A" .claude/LEDGER.md                                 # MUST show shipped/verified
```

## Mandatory READING — before any Write/Edit or dispatch

1. `.claude/specs/38-SGS-MOTION-SYSTEM.md` **IN FULL** — especially §3.5 (FR-38-18/19 conditions), §4.2 (D407 resolution incl. the edge rule), §9/§10 rows for both features.
2. Root `CLAUDE.md` IN FULL.
3. `.claude/specs/37-HEADER-FOOTER-BUILDER.md` **FR-37-40 IN FULL** (sticky model, measured pinned-gate, `findStickyBreakingAncestor()`, row collapse) + FR-37-14 (tri-state emission) — you are about to move this system's element in the template tree; you must know every behaviour you could break.
4. The shipped header-behaviour code: `theme/sgs-theme` header templates/parts + the pinned-gate/observer JS (locate via `grep -rn "findStickyBreakingAncestor\|sgs-header-height" theme/ plugins/`).
5. `.claude/LEDGER.md` — track collisions on theme templates.
6. Wave A's registry/provider (as shipped — read the code, not the plan).

## Why this matters (Rule 7)

ScrollSmoother + page transitions are the two most site-wide "feels expensive" signals a client site can send. Top USP: they compose with the shipped header system instead of breaking it (the thing every naive GSAP integration gets wrong). Impact: closes the site-level half of Spec 38; Wave C is independent.

## Phase 0 — work breakdown (tier = DETERMINISM routing)

| ID | Item | Tier | Est | QC |
|---|---|---|---|---|
| B1 | Template restructure: smoothed wrapper (`#smooth-wrapper`/`#smooth-content`) wraps main content + footer; header stays a SIBLING outside; conditional — markup only changes when the site setting is ON | SONNET | 45m | setting OFF = byte-identical templates (diff); setting ON = header outside wrapper (DOM check) |
| B2 | ScrollSmoother site setting (theme settings surface, default OFF) + registry enqueue (smoother module only when ON) + strength control | SONNET | 30m | OFF page = zero smoother bytes; ON = enqueued once |
| B3 | FR-38-18 conditions: disabled in editor/wp-admin; reduced-motion live-kill; anchor/`:target`/skip-link offsets honour `--sgs-header-height`; keyboard/find-in-page scroll correctness | SONNET | 45m | each condition = one named observable check (see ritual Q21) |
| B4 | D407 tripwire: `findStickyBreakingAncestor()` outcome wired to DISABLE the smoother + console warn when a sticky header is trapped inside the wrapper; edge rule — non-sticky header stays INSIDE `#smooth-content` | SONNET | 30m | plant a trapped-header fixture → smoother off + warning fires; sticky never sacrificed |
| B5 | Page transitions (FR-38-19): `@view-transition` CSS + site setting + per-template style (fade/slide/none) + reduced-motion suppress | SONNET | 45m | transition fires on supported browser; unsupported = normal nav; reduced-motion = instant |
| B6 | **FR-37-40 REGRESSION GATE:** re-run the full Spec 37 live verification (pinned gate, shrink, hide-on-scroll, transparent, row collapse, scroll-padding) with smoother OFF **and** ON | LIVE | 45m | every behaviour green in BOTH states; any regression = STOP #19 |
| B7 | Live verification + Bean's eye | LIVE + BEAN | 30m | see Task 4 |

## Tasks

### Task 1 — Template restructure + setting (B1–B2). **Commit 1** (R-31-5).
### Task 2 — Conditions + tripwire (B3–B4). **Commit 2.**
### Task 3 — Page transitions (B5). **Commit 3.**
### Task 4 — Regression gate + live verification + Bean's eye (B6–B7, R-31-13). NO further commit until green.
**What:** Deploy to sandybrown. Two evidence sources per claim: (a) DOM/network measurement, (b) computed behaviour on the live page (e.g. smoother ON: `#smooth-content` carries a changing `transform` while `getComputedStyle(header).position === 'sticky'` AND the header's `getBoundingClientRect().top === 0` mid-scroll — the pinned gate stays truthful). Bean scrolls the canary personally — smoothness is an eye judgment (R-31-13).
**Acceptance:** every FR-38-18 condition + every FR-37-40 behaviour has a recorded result in both smoother states.

## Stop-and-snapshot (STOP #19)

Any FR-37-40 regression that survives one fix attempt: STOP, revert the wave's template commits (`git revert`, path-scoped), snapshot the evidence to the LEDGER, end the session. The header system is BUILT + LIVE-VERIFIED property of Spec 37 — Wave B adapts around it, never degrades it.

## Dependency graph

```
B1 → B2 → B3 → B4 → B6 ┐
        B5 ─────────────┴→ Task 4 (live + Bean) → push (verify git log -1)
```

## Pre-flight self-attestation ritual (answer inline before first Write/Edit)

1. Spec 38 `status: active`? Wave A shipped? (Both gates — else STOP.)
2. Have I read Spec 38 §4.2 AND Spec 37 FR-37-40 in full this session?
3. Q21 — named observable signal per condition (smoother lag, pin, anchor offset, transition)?
4. Q25 — for the sticky header, did I MEASURE the rendered box and confirm which ancestor is the containing block in BOTH smoother states? (This is the exact Q25 case.)
5. Did I diff the OFF-state templates for byte-identity before touching anything else?
6. Is every new setting surfaced where Spec 38 §7 says (settings surface, NOT block inspectors)?
7. Branch check in the same command as each commit?

## Methodology guardrails (do not skip)

- `/qc-council` before the template-restructure commit (shared wrapper = design-gated surface class; R-31-12).
- Measure the STATE, don't read the flag that requests it (the pinned gate measures computed position — keep it that way).
- Verify BOTH surfaces: the editor must be completely unaffected (smoother disabled there by construction — prove it, don't assume it).
- `git log -1` after every commit.

## Known-open, NOT blockers

- P-TRANSPARENT-HEADER-SCROLLED-BG-NOT-FLIPPING (cosmetic, pre-existing) — do not fold its fix into this wave; note interaction if observed.
- P-ROW-COLLAPSE-RESIDUALS reduced-motion arm — pre-existing honesty flag.

## Skills / tools

| Skill | When |
|---|---|
| `/autopilot` | FIRST |
| `/sgs-wp-engine` | Theme/template work |
| `/qc-council` | Before template-restructure commit |
| `/verify-loop` | Two-attestation on the regression gate |
| `/handoff` | Session close |

| Operation | Command |
|---|---|
| Build | `cd plugins/sgs-blocks && npm run build` (PowerShell) |
| Deploy | `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` (add `--theme-only`/full as needed) |
| Live DOM | Playwright MCP (own isolated browser if another track is active) |

## Guardrails

Path-scoped commits. No hand-rolled tar/scp (D336). No deprecated.js (D270). No CDN. UK English. `/handoff` at close.
