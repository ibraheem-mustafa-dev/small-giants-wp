---
doc_type: next-session-prompt
project: small-giants-wp
thread: Track 1 — Spec 35 block-inspector-UX. Cluster/element VOCABULARY REWORK shipped 2026-07-20/21 (3 clusters → 5, element-primary axis, coverage validator, orphan detection) + rollout wave 1 (20 blocks, 28/67 manifested). Next = build FR-35-5 (states axis) + FR-35-6 (animation cluster), then rollout waves 2-3, then the card-grid resting-state defect.
generated: 2026-07-21
---

# Spec 35 — Track 1 (block-inspector-UX) — next session

**Invoke `/autopilot` before doing anything else.** Then read this file end-to-end.

> **Spec-35-scoped handoff.** `main` is SHARED with a co-active Track 2 (Spec 36 header/
> footer/nav). Track 2 owns `LEDGER.md`, the D-numbering cadence in `decisions.md`, and
> `next-session-prompt-nav-rework-P2.5.md`. Path-scope every commit; re-check
> `git branch --show-current` in the SAME command as the commit; NEVER `git add -A`.

## Why this matters (motivation — Rule 7)

Spec 35 makes every SGS block's editor sidebar complete and consistent so a non-coder client
can self-serve and Bean is QC only. **Top USP:** the inspector reads the same on every block,
so intervention drops over time. As of this session the vocabulary describing it is honest —
a conformance score finally means something rather than penalising blocks for capability the
schema couldn't name.

## Where things stand

**Shipped 2026-07-20/21:** brand-strip caption 9/9 (live-verified on the canary); cluster
vocabulary rebuilt 3 → 5; two mis-keyed registry rows reclassified; a coverage validator;
orphan detection; the element-axis (`layer`) gate; rollout wave 1 (20 blocks).

**Live baseline: 28 blocks manifested | OK 432 | GAP 1101 | ORPHAN 62.** 67 blocks in scope
(not 72 — see the exclusion in Task 3).

**Two designs are APPROVED but NOT BUILT — they are the front:**

- **FR-35-5 `states` axis** — 113 state-variant attrs across 27 blocks can currently only
  surface as orphans.
- **FR-35-6 `animation` cluster** — JS scroll/reveal motion (`sgsAnimation*` on 10 blocks,
  parallax, stagger, pathDraw) has no cluster home and is invisible to every check.

Both are specified end-to-end in
`.claude/plans/2026-07-20-spec-35-cluster-vocabulary-rework-design.md`. **Read FR-35-5 and
FR-35-6 in full before building — do not re-derive them.**

## First action (smallest, <5 min — Rule 2)

Run `node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js` and read the
summary line. That is the live baseline every task below moves. Zero risk, zero deploy.

## Tasks

### Task 1 — Build FR-35-5, the `states` axis

**What:** let a manifest element declare state variants (hover/focus/selected/pressed/
disabled) so state attributes resolve instead of surfacing as orphans.
**Why:** removes a large slice of orphan noise AND surfaces a real client-facing defect class.
**Estimated time:** 25 min.

**Orchestration**
- Execution: **delegated**, Model **sonnet** via `/delegate` (shared linter + schema judgement)
- Dispatch: single agent, then main-thread verification
- Brief: implement `states` on the element per FR-35-5 — both resolution forms (`attrMap`
  explicit, and `suffix` + `members`), the 5-state vocabulary with its CSS realisations, the
  separate `total_state_ok`/`total_state_gap` counters, and the new `STATE_WITHOUT_BASE`
  status. Then declare `states` on `sgs/tabs` (6 known state orphans) as the exemplar.
- Context the subagent won't have: **`tabActiveTextColour` renders as
  `[aria-selected="true"]`, NOT CSS `:active`** (`tabs/render.php:232`, `style.css:110`).
  That is why states are declared, never parsed. Also `pauseOnHover` / `effectHover` /
  `imageZoomHover` / `grayscaleHover` contain "Hover" and are NOT style properties.
- Depends on: none. Parallel with: Task 2.
- `/qc` gate after: yes — `/qc-inline` plus a main-thread re-run of the linter.

**Acceptance:** tabs' 6 state orphans resolve; base `total_ok`/`total_gap` UNCHANGED (states
are a separate axis); `card-grid` reports `STATE_WITHOUT_BASE` for its hover-only background;
script still exits 0.

### Task 2 — Build FR-35-6, the `animation` cluster

**What:** add a 6th cluster for JS-driven motion, keyed `anim:*` (not `css:*`).
**Why:** `sgsAnimation*` spans 10 blocks and is invisible to both the forward check and
orphan detection.
**Estimated time:** 15 min.

**Orchestration**
- Execution: **delegated**, Model **haiku** via `/delegate` (mostly data)
- Brief: add the 6 members per FR-35-6 to `cluster-member-sets.json`; add matching `anim:*`
  rows to `setting-registry.json`; extend `check-cluster-coverage.py` to require `anim:*`
  rows be clustered too.
- Context: keys are `anim:*` NOT `css:*` — filing JS controls under `css:` repeats the
  mis-keying that put `css:stroke` and `css:percentage` in the registry.
- Depends on: none. Parallel with: Task 1.
- `/qc` gate after: yes — `check-cluster-coverage.py` must still exit 0.

**Acceptance:** coverage validator passes over both `css:*` and `anim:*`; blocks carrying
`sgsAnimation*` show resolved animation members.

### Task 3 — Rollout waves 2 and 3 (39 blocks)

**What:** manifest the remaining 39 in-scope blocks.
**Why:** the roster is the deliverable; the vocabulary is now stable enough to carry it.
**Estimated time:** 25 min per wave of ~20.

**Orchestration**
- Execution: **delegated**, Model **sonnet** via `/delegate`, dispatch via
  `/dispatching-parallel-agents` — 4 agents per wave, ~5 blocks each, **ALL DISPATCHED IN ONE
  RESPONSE** (separate responses run sequentially, not in parallel)
- Brief: reuse the wave-1 prompt shape verbatim — it produced 8/8 exactly-correct count sets.
  Group by KIND (grid composites / flex composites / content / siblings), never at random.
- **EXCLUDE:** `site-header`, `site-footer`, `site-header-row`, `site-footer-row`,
  `adaptive-nav` — Track 2 owns these (`setting-registry _meta.cross_track`). 67 in scope.
- Depends on: Task 1 — states must exist first, or every wave adds state orphans needing
  retro-fit.
- `/qc` gate after: yes — main-thread verification of every agent's counts against the
  linter JSON.

**Acceptance:** 67/67 in-scope blocks manifested; every agent's counts verified against the
linter, NOT accepted from the report.

### Task 4 — Close the card-grid resting-state defect

**What:** `card-grid` cards have hover background/border/shadow attrs but NO static
equivalents; the resting state is hardcoded at `style.css:29-31` to theme tokens.
**Why:** a client cannot give a card a resting background colour. Real and client-facing.
**Estimated time:** 20 min.

**Orchestration**
- Execution: **delegated** build (Model **sonnet**), main-thread LIVE verification
- Brief: add static `cardBackground` / `cardBorder*` / `cardRadius` attrs + inspector
  controls + scoped CSS under the Spec 32 no-inline contract; the hardcoded `style.css`
  values become `var(--sgs-…, <token>)` fallbacks.
- Context: the F3 prebuild gate WILL fire if the hardcoded default isn't converted to a
  custom-property fallback — that is correct behaviour, not an obstacle to route around.
- Depends on: Task 1 (so `STATE_WITHOUT_BASE` confirms the fix landed).
- `/qc` gate after: yes — **deploy to the canary and verify in the real editor.**

**Acceptance:** `STATE_WITHOUT_BASE` clears for card-grid; a client can set a resting card
background in the editor, verified live.

## Dependency graph

```
Task 1 (states, sonnet)  ‖  Task 2 (animation, haiku)
        ↓ /qc-inline + linter re-run
Task 3 (rollout waves 2+3 — 4 sonnet agents per wave, ONE response per wave)
        ↓ main-thread count verification
Task 4 (card-grid defect, sonnet build + LIVE verify)
        ↓
Commit path-scoped + push main
```

## Structural defences (STOP catalogue — carry forward, never subtract)

- **STOP-LIVE-VERIFY-SHARED-COMPONENTS** — a subagent's build-green + unit-pass report is NOT
  proof a shared editor component renders. Live-verify in the real editor (insert the block,
  open EVERY tab that renders it, watch the error boundary + console). ShadowControl compiled
  and passed 180 tests, then crashed on first live render.
- **STOP-VERIFY-SUBAGENT-FACTS** — fact-check subagent-invented specifics (paths, versions,
  counts) against ground truth. STRUCTURE can be faithful while FACTS are wrong.
- **STOP-BLIND-REGEX-CODEMOD** — a blind `*Hover` regex broke live `textAlign` before. Drive
  any codemod off a KNOWN per-block attr list; `/verify-loop` per block.
- **STOP-DEPLOY-FROM-SHARED-WORKTREE** — always deploy from an isolated worktree at a
  committed SHA (`git worktree add --detach C:/tmp/sgs-deploy <sha>` + junction node_modules).
- **STOP-NO-VERSION-BUMPS / NO-DEPRECATIONS** (D270/D293) — pre-production; additive metadata
  and re-clone, never a `deprecated.js`.
- **STOP-COUNTS-FROM-THE-TOOL-NOT-THE-AGENT** *(new 2026-07-21)* — nearly every agent that
  reported a hand-counted total this session got at least one wrong while describing the
  STRUCTURE correctly. Re-derive every number from the tool's own `--json`. Never quote an
  agent's tally.
- **STOP-FALSY-EMPTY-STRING** *(new 2026-07-21)* — `element.prefix || fallback` and
  `if (element.prefix)` both silently mis-handle an explicit `""`. This shipped TWICE in one
  file and was found by agents, not by review. When a config value can legitimately be empty,
  test `!== undefined`, never truthiness.
- **STOP-CLUSTER-WITHOUT-PREFIX-OR-ATTRMAP** *(new 2026-07-21)* — declaring a cluster on an
  element with neither a `prefix` nor an `attrMap` resolves ZERO members and makes the score
  WORSE. Measured: +36 GAP, zero resolutions.
- **STOP-DECLARE-DONT-PARSE-NAMES** *(new 2026-07-21)* — attribute names NEARLY encode
  semantics, and "nearly" is the trap. `tabActive*` means `[aria-selected]`, not CSS
  `:active`; four `*Hover` attrs are booleans, not styles. Declare mappings; let names be a
  hint a human confirms.

## Pre-flight ritual (answer before the first Write/Edit)

1. Am I on `main`, and is my next commit path-scoped away from Track 2's files
   (`LEDGER.md`, `next-session-prompt-nav-rework-P2.5.md`, `src/blocks/site-*`,
   `adaptive-nav`)?
2. Am I about to touch a shared component or shared mechanism? → design-gate it and plan to
   live-verify.
3. Will this change render live? → deploy from an isolated worktree, then verify in the real
   editor (never build-green alone).
4. Is anything I am about to report a subagent claim? → re-derive it from the tool before
   stating it.
5. *(new)* Am I about to declare a cluster or a state? → does the element have a `prefix`, an
   `attrMap`, or a `layer` to make it resolve — or will it silently score worse?

## Mandatory READING (tiered)

**Tier 1 — before any edit:**
- `.claude/plans/2026-07-20-spec-35-cluster-vocabulary-rework-design.md` (FR-35-1..6 — READ
  IN FULL; FR-35-5 and FR-35-6 are the build spec)
- `plugins/sgs-blocks/scripts/consistency/cluster-member-sets.json` `_meta` (all 5 notes)
- `plugins/sgs-blocks/scripts/check-element-manifest-conformance.js` header comment
- `.claude/STOP-CATALOGUE.md`

**Tier 2 — before touching the roster:**
- `.claude/plans/phase-spec35-vocabulary-rework.md` (the executed phase plan)
- Worked exemplars: `container` (4-layer composite), `card-grid` (root IS the grid),
  `quote` (content-KIND), `brand-strip` (multi-element with prefixes), `hero` (variant-heavy)
- `plugins/sgs-blocks/scripts/consistency/check-cluster-coverage.py`

**Tier 3 — context:**
- `CLAUDE.md` binding rules R-31-1..15
- `.claude/decisions.md` head (D-ceiling; Track 2 owns the cadence)
- `plugins/sgs-blocks/scripts/converter/services/layer_detect.py` (the L1–L4 vocabulary)

## Tool bindings — Skills / Agents / MCP

| Skill | When |
|---|---|
| `/brainstorming` | any design gate before building a shared mechanism |
| `/gap-analysis` | grade the rollout output before declaring the roster done |
| `/lifecycle` | if editing any skill/agent/linter-as-tooling |
| `/research` | any gold-standard check before a design menu |
| `/strategic-plan` | if Task 3 grows beyond two waves |
| `/dispatching-parallel-agents` | Task 3 — 4 agents per wave, ONE response per wave |
| `/delegate` | route every dispatch |
| `/verify-loop` | 2-attestation on any load-bearing claim |
| `/sgs-db`, `/wp-blocks` | DB is authoritative — never hardcode a count |
| `/qc-council` | multi-rater before any converter/pipeline/shared-block commit |

| Agent | When |
|---|---|
| `wp-sgs-developer` | Tasks 1, 3, 4. Constrain: no deploy, no git commit — the main thread commits path-scoped and live-verifies |
| `design-reviewer` | visual + a11y QC of the card-grid resting-state controls (Task 4) |

| MCP / tool | For |
|---|---|
| Playwright MCP | live editor verification (Tasks 1, 4) |
| Chrome DevTools CLI | fallback if Track 2 holds the shared browser profile |

Canary creds (always available): `.claude/secrets/sandybrown.env`. Deploy: the ONE path
`build-deploy.py --target sandybrown --blocks-only` from an ISOLATED worktree. SSH alias
`ssh hd`.
