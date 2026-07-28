Invoke /autopilot before doing anything else.

> ⚠ THIS FILE IS A POINTER, NOT THE TRUTH. Live status = `.claude/LEDGER.md` — if it contradicts this prompt, the LEDGER wins.
> ⚠ **GATE 1: Spec 38 must read `status: active`. GATE 2: Wave A shipped + live-verified (this wave consumes its registry/provider/grammar). Wave B is NOT a dependency — C runs before, after, or parallel to B.** If a gate fails, STOP.
> Co-active tracks may share this worktree — path-scope every commit; `git branch --show-current` in the same command as each commit.
> **This session runs in PLAN MODE first** — investigate, present the plan, get approval, then build.
> Size note: if the session sprawls, split along the pairing seam (Spec 38 §8): **C1** = Flip + Draggable + before-after; **C2** = SVG + text toys + image sequence. Each half closes independently.

# Next session — Motion Wave C: interaction + SVG + text toys + image sequence

You are the engineer for the SGS Motion System (Spec 38) per-block wave. Wave A shipped the Tier G foundation. This wave lands the interaction capabilities (Flip pairing, Draggable roster incl. the NET-NEW before-after block), the SVG family (DrawSVG + the Vivus retirement D408, MorphSVG, scrubbed MotionPath), ScrambleText, and the image-sequence block with its asset-pipeline tooling.

## State recap (plain English — no assumed pretext)

These are the per-block premium effects: filtered grids that fluidly re-arrange (Flip), draggable carousels with momentum (Draggable+Inertia), a drag-the-divider before/after image comparison (a brand-new block — DB-verified no such block exists), SVG logos that draw themselves (replacing the old Vivus library with GSAP DrawSVG — one dependency out), shape-morphing icons, text that scrambles in. Only two SHIPPED blocks get edited (filter-search + card-grid for the pairing; responsive-logo for the runtime swap) — everything else is new blocks or new modules.

## First action (<5 min, zero deps)

```bash
git log -1 --stat && git status && git branch --show-current
grep -m1 "^status" .claude/specs/38-SGS-MOTION-SYSTEM.md          # MUST be: active
grep -n "Wave A" .claude/LEDGER.md                                 # MUST show shipped/verified
```

## Mandatory READING — before any Write/Edit or dispatch

1. `.claude/specs/38-SGS-MOTION-SYSTEM.md` **IN FULL** — especially §3.3 (pairing contract + roster opt-in), §3.4 (SVG family, asset gating, Vivus retirement), FR-38-9 (image-sequence sub-scope), §9/§10 per-effect rows.
2. Root `CLAUDE.md` IN FULL. `plugins/sgs-blocks/CLAUDE.md` — **D270: NO deprecated.js, ever** (binds the responsive-logo swap).
3. `plugins/sgs-blocks/src/blocks/responsive-logo/view.js` + `block.json` + `render.php` — the Vivus consumer being re-backed (attr surface must stay byte-identical).
4. `src/blocks/filter-search/` + `src/blocks/card-grid/` — the filter event + re-render path the Flip contract hooks.
5. `.claude/parking.md` P-10 (revived here) + P-TIMELINE-ADVANCED-VISUAL-EFFECTS (do NOT build it this wave; note it as the first FR-38-7 client consumer).
6. `.claude/LEDGER.md` — track collisions.

## Why this matters (Rule 7)

This wave is the visible toy-box — the effects clients point at on award sites and ask for by name. Top USP: before-after + draggable galleries + logo draw are sales-demo material for every client pitch. Impact: completes the Spec 38 roster; P-10 finally closes after months deferred.

## Phase 0 — work breakdown (tier = DETERMINISM routing)

| ID | Item | Tier | Est | QC |
|---|---|---|---|---|
| C1 | Flip pairing contract (FR-38-12): `supports.sgs.fx.flip` on card-grid, pair toggle on both blocks, `Flip.from()` around the re-filter, stagger + interrupt; instant-relayout fallback | SONNET | 1h | filter on canary → items animate to new positions; rapid re-filter never locks UI; no-GSAP page = instant relayout (LIVE) |
| C2 | Draggable roster (FR-38-13): `supports.sgs.fx.draggable` mechanism + gallery/testimonial-slider upgrade (drag-to-scroll + inertia; scroll-snap default untouched; touch-action + keyboard arrows) | SONNET | 1h | drag works desktop; native touch scroll NOT hijacked; arrows still work; opt-out block unchanged |
| C3 | **NET-NEW `sgs/before-after`**: two images + Draggable divider (+ keyboard/click fallback = works with zero JS via CSS resize/range fallback pattern); full Spec 35 Part L inspector; composition seed row (`seed-composition-roles.py` — new-block F6 gate) | SONNET | 1.5h | block inserts, drags, keyboard-operates; no-JS shows both images accessibly; conformance gate green |
| C4 | DrawSVG + Vivus retirement (FR-38-15/D408): re-back `animationStyle` enum onto DrawSVG; remove `vivus` from package.json; reduced-motion arm → house live-check | SONNET | 45m | all 3 enum values fire on canary; `grep -ri vivus plugins/sgs-blocks/package.json src/` = 0; stored logo instance renders identically (before/after screenshot) |
| C5 | MorphSVG (FR-38-16, revives P-10): asset-gated control (Disabled until both path assets present) + authoring guidance doc | SONNET | 45m | morph fires with prepared pair; control correctly disabled without assets |
| C6 | MotionPath scrubbed mode (FR-38-17) on decorative-image; confirm the Tier V `offset-path` variant (may already ship separately) | SONNET | 30m | scrubbed travel follows path with scroll (LIVE) |
| C7 | ScrambleText (FR-38-11): headings, default OFF, reduced-motion suppress | HAIKU | 20m | fires when enabled; plain text under reduced motion |
| C8 | `sgs/image-sequence` (FR-38-9): canvas scrub block + **the asset-pipeline tooling task** (`scripts/image-sequence-prep.py`: video→frames, compression, resolution ladder, chunked lazy fetch) + poster-frame editor story | SONNET + PYTHON | 1.5h | 60-frame canary scrubs smoothly; tooling produces usable frames from a sample video; poster shows in editor |
| C9 | Stretch (only if C1–C8 land): migrate Tier V motion assets onto the conditional registry (FR-38-24) | SONNET | 45m | zero-motion page drops the 6 unconditional assets; every existing canary still green |
| C10 | Live verification + Bean's eye | LIVE + BEAN | 45m | see Task 5 |

Dispatch C1–C8 as parallel Sonnet agents where files are disjoint (`/dispatching-parallel-agents`, FR-31-6.1: no agent touches shared files; registry/DB rows are main-thread).

## Tasks

### Task 1 — Interaction contracts (C1–C2). **Commit 1** (R-31-5).
### Task 2 — before-after block (C3). **Commit 2.**
### Task 3 — SVG family + ScrambleText (C4–C7). **Commit 3.** (C4's dep removal = its own commit if diff is large.)
### Task 4 — Image sequence + tooling (C8). **Commit 4.**
### Task 5 — Live verification + Bean's eye (R-31-13). C9 stretch only after this is green.
**What:** Deploy to sandybrown. Two evidence sources per effect: (a) markup/network, (b) live Playwright measurement of the named observable signal (Flip: item `getBoundingClientRect()` interpolates between layouts; Draggable: `transform` follows pointer with momentum decay; DrawSVG: `stroke-dashoffset` animates; before-after: divider position tracks drag AND arrow keys). The responsive-logo swap gets a before/after screenshot pair (stored instance must render identically). Bean's eye closes each effect.
**Acceptance:** every effect recorded; "cannot tell" = FAIL — extend the measurement.

## Stop-and-snapshot (STOP #19)

A shipped-block edit (filter-search/card-grid/responsive-logo) that regresses twice: STOP, revert path-scoped, snapshot to LEDGER, end session. New blocks/modules may iterate freely — they regress nothing.

## Dependency graph

```
C1 ┐
C2 → C3 ┐
C4 → C5 ├→ Task 5 (live + Bean) → C9 (stretch) → push (verify git log -1)
C6, C7  │
C8 ─────┘
```

## Pre-flight self-attestation ritual (answer inline before first Write/Edit)

1. Spec 38 `status: active`? Wave A shipped? (Else STOP.)
2. Have I read Spec 38 §3.3/§3.4 + the responsive-logo consumer code in full?
3. Q21 — named observable signal per effect?
4. Q26 — every new attr declared in block.json (WP silently discards undeclared attrs); before-after seeded in `seed-composition-roles.py` (F6 gate)?
5. D270 check — am I about to write a deprecated.js? (NEVER. The logo swap keeps the attr surface identical instead.)
6. Roster discipline — is the Draggable roster read from `block_capabilities` (DB), not a hardcoded list (R-31-1)?
7. Branch check in the same command as each commit?

## Methodology guardrails (do not skip)

- `/qc-council` before the filter-search/card-grid pairing commit (shipped-block edits).
- Verify BOTH surfaces (editor canvas + frontend) for every new block — deploy, open the real editor, read the console.
- A page with 2+ instances of any new block is a mandatory live-verify case (per-render PHP fatal class).
- `git log -1` after every commit. Time estimates default LOW.

## Known-open, NOT blockers

- P-TIMELINE-ADVANCED-VISUAL-EFFECTS — first client consumer of FR-38-7; build in its own session, not here.
- Wave B independent — do not touch header/templates in this wave.

## Skills / tools

| Skill | When |
|---|---|
| `/autopilot` | FIRST |
| `/sgs-wp-engine` | All block work |
| `/dispatching-parallel-agents` | C1–C8 fan-out |
| `/qc-council` | Shipped-block pairing commit |
| `/verify-loop` | Two-attestation |
| `/handoff` | Session close |

| Operation | Command |
|---|---|
| Build | `cd plugins/sgs-blocks && npm run build` (PowerShell) |
| Deploy | `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` |
| DB query/update | `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."` / `/sgs-update` |
| Live DOM | Playwright MCP (isolated browser if another track is active) |

## Guardrails

Path-scoped commits. No hand-rolled tar/scp (D336). No deprecated.js (D270). No CDN. Roster/capability lookups DB-first (R-31-1). UK English. `/handoff` at close; archive P-10 to `memory/parking-archive.md` when MorphSVG ships.
