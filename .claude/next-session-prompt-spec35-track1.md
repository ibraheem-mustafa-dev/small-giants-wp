---
doc_type: next-session-prompt
project: small-giants-wp
thread: "Track 1 — Spec 35 block-inspector-UX. Spec 31 (cloning C2 LANDED gate) CLOSED 2026-07-25 (D380, 9babcfd5). This is the ONLY Track-1 prompt (converter + duplicate spec35 prompts collapsed here). Front = AUDIT Spec 35 conformity → decompose → triage by execution tier → Opus-design-first → automate → qc-inline."
generated: 2026-07-25 (post Spec 31 C2 close; consolidated from 3 Track-1 prompts)
---

# Spec 35 — Track 1 (block-inspector-UX) — next session

**Invoke `/autopilot` before anything else.** Then read this file end-to-end.

> ⚠ `main` is SHARED with a co-active **Track 2** (Spec 36/37 header/footer/nav). Track 2 owns
> `LEDGER.md`, `parking.md`, `decisions.md`, `STOP-CATALOGUE.md`, `.claude/next-session-prompt.md`,
> the D-numbering cadence, and `src/blocks/site-*` + `mega-*` + `adaptive-nav`. **Path-scope every
> commit; re-check `git branch --show-current` in the SAME command as the commit; NEVER `git add -A`.
> VERIFY every commit landed via `git log -1` (Track 2 commits between yours — the reported hash can
> be theirs). The path-scoped-commit hook fires on a bare `git commit` — always pass `-- <paths>`.**
> Track 2 was committing concurrently on 2026-07-25 (mega CORE) — expect races.

## Why this matters (motivation — Rule 7)

Spec 35 makes every SGS block's editor sidebar complete + consistent so a non-coder client
self-serves and Bean is QC only. **Top USP:** the inspector reads the same on every block, so
intervention drops over time. **Spec 31 (the cloning pipeline) is now CLOSED** (C2 LANDED gate MET,
0 WRITTEN-not-LANDED live) — Spec 35 is the sole remaining Track-1 front.

## The approach Bean chose (audit-first, tiered, Opus-design-early)

Do NOT jump straight into the task list below — it predates this session and may be stale. The
ordering Bean locked:

1. **AUDIT Spec 35 for completion/conformity FIRST** (Task 0) — subagents sweep + inline fact-check.
2. **Decompose the REMAINING work** into concrete tasks/features from the audit.
3. **Triage each task by the CHEAPEST capable execution tier**, in this order:
   (a) can a **python script** do it deterministically? → do that;
   (b) else is it a **Haiku** subagent job (mechanical, well-scoped)?
   (c) else **Sonnet** (reasoning/schema judgement)?
   (d) else **Opus inline** (design decisions, novel architecture, adversarial reasoning).
4. **Opus-design-early ordering** (Bean's chosen sequence): the audit runs first (delegated); then
   make ALL the Opus inline **design decisions up front** so the delegated/automated work has zero
   ambiguity + zero rework; THEN fan out the automatable/delegated batches; finish with qc-inline.
   Design decisions are the upstream dependency — a Haiku/Sonnet agent applying a control across N
   blocks needs the attr shape + UX pattern already decided, or it guesses and you get rework.

## First action (smallest, <5 min — Rule 2)

Run `node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js` and read the summary
line — the live baseline every task moves. Zero risk, zero deploy. (Baseline as of 2026-07-21:
28 blocks manifested | OK 432 | GAP 1101 | ORPHAN 62; 67 blocks in scope. Re-run for today's figure —
never quote a cached count.)

## Task 0 — AUDIT Spec 35 conformity (delegated sweep + inline fact-check) — DO FIRST

**What:** determine, per FR, what Spec 35 actually has vs the spec — is FR-35-5 (states) / FR-35-6
(animation) built? how many blocks manifested? what's the true GAP/ORPHAN? which of the tasks below
are still real vs already done?
**Why:** the task list is stale; a fresh conformity map is what the decomposition + triage run on.
**Estimated time:** ~15 min.

**Orchestration**
- Execution: **delegated sweep** (2–3 `general-purpose`/`wp-sgs-developer` agents, one per FR
  cluster) reading the Spec 35 design doc + the live linter JSON + the registry, returning a
  per-FR "built / partial / not-built + evidence (file:line)" map. Then **fact-check every claim
  INLINE** against the tool (`--json`) + `/sgs-db` before trusting it (STOP-COUNTS-FROM-THE-TOOL).
- `/qc` gate after: inline re-derivation of every count from the linter JSON.

**Acceptance:** a decomposed, tier-tagged task list (python / haiku / sonnet / opus-inline) covering
every open Spec-35 FR, each line citing the tool/DB evidence it rests on. Present it to Bean with the
Opus-design-first plan BEFORE executing.

## Known work (the audit CONFIRMS or replaces these — do not assume they're still open)

- **FR-35-5 `states` axis** — 113 state-variant attrs across 27 blocks surface only as orphans until
  an element can declare state variants (hover/focus/selected/pressed/disabled). Design APPROVED,
  build status = confirm in Task 0. Sonnet. Exemplar: `sgs/tabs` (6 state orphans; `tabActive*`
  renders `[aria-selected="true"]`, NOT `:active` — `tabs/render.php:232`, `style.css:110`).
- **FR-35-6 `animation` cluster** — a 6th cluster keyed `anim:*` (NOT `css:*`) for JS motion
  (`sgsAnimation*` on 10 blocks). Design APPROVED. Haiku (mostly data). Filing JS controls under
  `css:` repeats the `css:stroke`/`css:percentage` mis-keying.
- **Rollout waves 2+3** — manifest the remaining in-scope blocks (67 in scope; EXCLUDE Track 2's
  `site-header/footer`, `site-*-row`, `adaptive-nav`, `mega-*`). Sonnet, 4 agents/wave via
  `/dispatching-parallel-agents`, ALL DISPATCHED IN ONE RESPONSE. Depends on FR-35-5.
- **card-grid resting-state defect** — cards have hover bg/border/shadow attrs but NO static
  equivalents; resting state hardcoded `style.css:29-31`. Add static `cardBackground`/`cardBorder*`/
  `cardRadius` + controls + scoped CSS (Spec 32 no-inline; hardcoded → `var(--…, token)` fallbacks).
  Sonnet build + LIVE editor verify. Both designs specified in
  `.claude/plans/2026-07-20-spec-35-cluster-vocabulary-rework-design.md` — READ FR-35-5/6 IN FULL.

Full per-task orchestration blocks (brief / context / deps / acceptance) for these four are preserved
in git history at `next-session-prompt-spec35-track1.md`@`88e7e606^` if the audit confirms them intact.

## Structural defences (STOP catalogue — carry forward, never subtract — D101)

Spec-35 defences (carried from the prior prompt):
- **STOP-LIVE-VERIFY-SHARED-COMPONENTS** — a subagent's build-green + unit-pass is NOT proof a shared
  editor component renders. Live-verify in the real editor (ShadowControl passed 180 tests, crashed
  on first live render).
- **STOP-VERIFY-SUBAGENT-FACTS** — fact-check subagent specifics (paths/versions/counts) vs ground
  truth. STRUCTURE faithful ≠ FACTS right.
- **STOP-BLIND-REGEX-CODEMOD** — a blind `*Hover` regex broke live `textAlign`. Drive codemods off a
  KNOWN per-block attr list; `/verify-loop` per block.
- **STOP-DEPLOY-FROM-SHARED-WORKTREE** — deploy from an ISOLATED worktree at a committed SHA; COPY
  `build/` in, never junction node_modules into the worktree (guts the real dep tree on removal).
- **STOP-NO-VERSION-BUMPS / NO-DEPRECATIONS** (D270/D293) — pre-production; additive metadata + re-clone.
- **STOP-COUNTS-FROM-THE-TOOL-NOT-THE-AGENT** — re-derive every number from the tool's `--json`.
- **STOP-FALSY-EMPTY-STRING** — `element.prefix || fallback` mis-handles an explicit `""`; test `!== undefined`.
- **STOP-CLUSTER-WITHOUT-PREFIX-OR-ATTRMAP** — declaring a cluster with neither resolves ZERO members + scores WORSE.
- **STOP-DECLARE-DONT-PARSE-NAMES** — `tabActive*` = `[aria-selected]` not `:active`; `*Hover` booleans aren't styles.

NEW from the 2026-07-25 Spec-31 close (carry forward):
- **STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT** — the hash a `git commit` REPORTS can be Track 2's
  racing commit; verify via `git log -1` + `git status`, never the reported hash. (Hit 3× this session.)
- **STOP-RESEED-PICKS-UP-TRACK2-UNTRACKED-BLOCKS** — a `/sgs-update` reseed on the shared tree seeds
  Track 2's untracked/new blocks into shared derived artefacts (`css-property-classifications.json`,
  `seed-composition-roles.py`). Before committing derived files, confirm they carry ONLY your track's
  rows (or reseed with Track 2's blocks present so the state is consistent). A cross-track pre-commit
  hook failure (e.g. a Track-2 block failing the uniformity audit) can block YOUR commit — fix at the
  audit/exempt layer, never `--no-verify`.
- **STOP-VERIFY-THE-FIX-EMITS-NOT-JUST-THAT-CODE-EXISTS** — a converter/render fix's code can be
  correct and still not paint (STOP-44). A cross-model adversarial refuter caught a latent text-align
  regression on 4 blocks that the tests + local emit-check both missed. Live-verify emission.
- **STOP-AUDIT-BY-SEMANTIC-NOT-SUBSTRING** — the block-uniformity audit's `"colour" in name` heuristic
  false-positived `colourScheme`/`borderColour` (a scheme + a border colour, not wrapper bg/text).
  Fix false positives at the audit, don't misconfigure the block.

## Pre-flight ritual (answer before the first Write/Edit)

1. On `main`? Next commit path-scoped away from Track 2's files (`LEDGER`/`parking`/`decisions`/
   `STOP-CATALOGUE`/`next-session-prompt.md`/`src/blocks/site-*`/`mega-*`/`adaptive-nav`)?
2. About to touch a shared component/mechanism? → design-gate + plan to live-verify.
3. Will it render live? → deploy from an isolated worktree, verify in the real editor (never build-green alone).
4. About to accept a subagent claim OR a count? → re-derive from the tool before stating it.
5. Declaring a cluster/state? → does the element have a `prefix`/`attrMap`/`layer` to resolve, or will it score WORSE?
6. After committing → does `git log -1` show MY message at HEAD + `git status` clean of MY work?
7. About to reseed / commit a derived artefact? → is it free of Track 2's untracked-block contamination?

## Mandatory READING (tiered)

**Tier 1 — before any edit:** `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` (governing spec —
read IN FULL each cloning-adjacent session) · `.claude/plans/2026-07-20-spec-35-cluster-vocabulary-rework-design.md`
(FR-35-1..6 — FR-35-5/6 are the build spec, read in full) · `cluster-member-sets.json` `_meta` (all 5 notes) ·
`check-element-manifest-conformance.js` header · `.claude/STOP-CATALOGUE.md`.
**Tier 2 — before touching the roster:** `.claude/plans/phase-spec35-vocabulary-rework.md` · worked
exemplars (`container` 4-layer, `card-grid` root-IS-grid, `quote` content-KIND, `brand-strip`
multi-element, `hero` variant-heavy) · `check-cluster-coverage.py`.
**Tier 3 — context:** `CLAUDE.md` binding rules R-31-1..15 · `.claude/decisions.md` head (D-ceiling
D380; Track 2 owns the cadence) · `converter/services/layer_detect.py` (L1–L4 vocabulary).

## Tool bindings — Skills / Agents / MCP

| Skill | When |
|---|---|
| `/brainstorming` | ALWAYS — any design gate before a shared mechanism (Opus-design-early phase) |
| `/gap-analysis` | ALWAYS — grade rollout output before declaring the roster done |
| `/lifecycle` | ALWAYS — editing any skill/agent/linter-as-tooling |
| `/research` | ALWAYS — gold-standard check before a design menu |
| `/strategic-plan` | ALWAYS — sequence the decomposed task list before executing |
| `/dispatching-parallel-agents` | rollout waves — 4 agents/wave, ONE response per wave |
| `/delegate` | route every dispatch (python/haiku/sonnet/opus triage) |
| `/qc-council` | multi-rater before any converter/pipeline/shared-block commit (blub.db 255) |
| `/verify-loop` | 2-attestation on any load-bearing claim |
| `/sgs-db`, `/wp-blocks` | DB authoritative — never hardcode a count |

| Agent | When |
|---|---|
| `wp-sgs-developer` | Task-0 sweep + build tasks. Constrain: EXECUTE yourself, no deploy/commit unless told — main thread commits path-scoped + live-verifies |
| `general-purpose` (Sonnet) | Task-0 audit sweep + a cross-model adversarial refuter on any shared-mechanism change |
| `design-reviewer` | visual + a11y QC of card-grid resting-state controls |

| MCP / tool | For |
|---|---|
| Playwright MCP | live editor verification |
| Chrome DevTools CLI | fallback if Track 2 holds the shared browser profile |

Canary creds (always available): `.claude/secrets/sandybrown.env`. Deploy: the ONE path
`build-deploy.py --target sandybrown --blocks-only` from an ISOLATED worktree. SSH alias `ssh hd`.