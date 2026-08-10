---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-10
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**Where 2026-08-10 (session 3) left things:**

- **A real styling bug was painting on a live page, and it's fixed.** A block that should sit in a
  centred 1200-pixel column was shoved to the left with a 47-pixel gap on one side only. Cause: telling
  a browser "at most 1200 wide" doesn't centre anything — you also have to say "split the leftover
  space evenly", and the newer of our two ways of storing per-device settings was only saying the first
  half. Found by measuring the live page, fixed, re-measured: **23.73 pixels each side**.
- **The same bug would have hit all 160 settings we're about to migrate.** Fixing it now cost minutes.
  Finding it halfway through the migration would have meant redoing that work.
- **Yesterday's "everything now works per device" was an overclaim, and I corrected the record.** The
  shared container *can* now do it. But **no block is wired to use it yet** — only 3 of 83 blocks opt
  in, and none of them declares the 8 newest settings in the shape the new code reads. The capability
  shipped; the wiring is the migration. That's not a blocker, it's the second half.
- **A comment in the code was promising protection that doesn't exist.** It claimed certain safety
  checks were "further down the file". There are none — the sentence was the only mention. Anyone
  reading it would have assumed cover they didn't have. Now accurate.
- **I broke the build and then found the real reason, which is worth more than the fix.** A
  *comment-only* change turned a build check from "all clear" to "73 problems", blocking the build. The
  cause: our checker strips comments in the wrong order, so a file path with a `*` in it written inside
  a comment silently deleted a chunk of real code from what the checker examines. It then blamed the
  code instead of itself. Fixed with your approval, plus a test proving it can catch this — and that
  test caught **its own** blind spot first (it passed while the bug was deliberately switched back on).
- **Two other places in the codebase had the same trap**, harmless only by luck. Now neutralised.
- **A database staleness bug fixed**: the gallery block's settings had changed shape months ago but the
  database still described the old shape, so every tool reading it was working from a dead model.

**Earlier narrative:** newest snapshot on disk is `memory/session-2026-08-08.md`. Sessions 2-3 were not
rotated, so their record is the commit messages + `decisions.md` D546-D555. ⚠ Pointers to
`session-2026-08-09*`/`-10*` were DANGLING — globs escape the preflight's link check.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (State Snapshot) — never cache it.** Latest: **D555**.

### Shipped 2026-08-10 session 3

| What | Commit |
|---|---|
| **Object-shaped width bands never centred** — flat path's missing `margin-inline:auto` twin | `1979c419` |
| Wrapper `:128` comment promised `! $object_model` gates that do not exist | `a6e0f390` |
| Centring guard requires a REAL tier value (`[]` is UNSET, not a value) + my build regression | `9b4722a9` |
| **`check-dead-controls` stripper: line comments BEFORE block comments** (+ Test G, proven able to fail) | `f11b122a` |
| D552 + D553; 2026-08-08 plan §4/Phase 4 marked SUPERSEDED | `c4befadf` |
| **Retired Stage 3 DELETED — `/sgs-update` renumbered to a contiguous 1-13** (D555) | `accd5fbc` |
| Migration design gate CLOSED (D554) + Spec 39 seed captured; my inspector-scan count error corrected | `c0af4188` |
| `/qc-council` outcome: P1 re-keyed to `block.json` type; one rater finding REFUTED; 6 gaps closed | `6e5cd36a` |

### ⭐ Track 1b (Spec 35) — inspector control standardisation

**Phase 1 is CLOSED.** 1.1/1.2/1.3 shipped in session 1; 1.4a/1.4b/1.4c/1.4d in session 2.

#### Shipped 2026-08-10 session 2

Session-2 commit table moved to `memory/session-2026-08-10*.md` (17 rows). Headlines that still matter:
wrapper Stage 1+2 made 14 properties tier-capable (`2056af6a`, `dc1f0023`) — **capability only, nothing
wired, see D552 §2**; `sgs/gallery` → FR-37-16 object model (`0e6209e6`); `survey:responsive-shape` +
`survey:dead-css` censuses built; STOP catalogue 189 → 197.

#### ⛔ Do NOT start these

- **Re-deriving the canonical control set** — `plans/spec-35-control-type-contract.md` is AUTHORITATIVE.
- **Stripping native `color`/`__experimentalBorder` supports** (D542). ⚠ `spacing` was removed from
  `sgs/gallery` ONLY (D548) — a documented per-block reversal, NOT a general licence.
- **Re-adding any per-control device switcher** — rule 25 flags it.
- **Restoring `localStorage` on the toggle** — its absence is deliberate (D546).
- **Rebuilding the rejected inspector census** (D543).

### ⭐ NEXT SESSION — ORCHESTRATION PLAN (6 tasks, 2 parallel pairs)

**All 7 steps of `go-track-1b-mossy-babbage.md` are DONE and the design gate is CLOSED** (D554:
property-by-property · trash-not-migrate · gate-the-clone). `/qc-council` ran; its findings are applied.

**Read first, in this order:** `plans/spec-35-flat-to-object-migration-design.md` (signed off — the
sequencing + P1/P2) · `plans/spec-39-seed-requirements.md` · `decisions.md` D552-D555.

#### State recap, plain English

We are collapsing 160 three-attribute per-device trios (`gap`/`gapTablet`/`gapMobile`) into single
object-shaped settings, across 41 blocks, one PROPERTY at a time. The shared container already reads the
new shape; almost nothing is stored in it, which is why yesterday's per-device work reaches nothing yet.
Two prerequisites must be green before any block is edited: a gate that can tell migrated from
un-migrated (**P1**) and correct database seeding for the new shape (**P2**). Old canary pages holding
the old shape get binned, not converted.

#### Task 1 — Settle the `css_property = NULL` question (P2's deciding read)

**What:** determine whether a NULL `css_property` on an object-typed attr is a FOSSIL (Stage 1 updates
`attr_type` without clearing it) or a RULE (routing dropped on shape change).
**Why:** P2's whole representation design turns on this. If routing is genuinely dropped, the migration
would silently strip `css_property`/`css_tier` from 160 families — load-bearing for Spec 31 §3.A/§4.
**Estimated time:** 20 min.
**Orchestration:** delegated · **Sonnet** via `/delegate` · single agent.
**Brief:** read `sgs-update-v2.py`'s Stage 1 attribute extraction and say which code path writes
`css_property`, and why gallery's *object* `maxWidth` retains `max-width` while both row blocks' object
`maxWidth` is NULL. Report only; do not reseed.
**Context it needs:** the asymmetry is already measured (query in D552 §5); the DB is at
`~/.agents/skills/sgs-wp-engine/sgs-framework.db` (`~/.claude/...` is a junction to the same file).
**Depends on:** none. **Parallel with:** Task 2. **/qc gate after:** no — it is a read, its output is an answer.
**Acceptance:** a sentence naming the writing code path with file:line, and a FOSSIL-or-RULE verdict.

#### Task 2 — The pre-pass-1 census (the last unmeasured survivors)

**What:** do `wp_block` (reusable blocks), `wp_global_styles`, or autosaves hold tier-sibling values? And
does `check-dead-pattern-attrs.py` catch the *declared-object-but-stored-flat* case or only the
wholly-undeclared one?
**Why:** ruling B bins the pages, but these four surfaces survive a page deletion. Both are open
UNPROVEN items from the council.
**Estimated time:** 20 min.
**Orchestration:** delegated · **Sonnet** via `/delegate` · single agent · **output is a script**, so the
census is re-runnable per pass rather than hand-repeated.
**Brief:** SQL the canary for tier-sibling names inside `wp_block`/`wp_global_styles`/autosave rows, with
a positive control; then read `check-dead-pattern-attrs.py` and state which of the two coercion classes
it detects.
**Context it needs:** credentials at `.claude/secrets/sandybrown.env` (always available); SSH alias
`ssh hd`; ⚠ a grep pattern starting `--` is eaten as a flag, use `-e`.
**Depends on:** none. **Parallel with:** Task 1. **/qc gate after:** no. **Acceptance:** a committed
census script + a number per surface, each with a positive control.

#### Task 3 — Build P1, the storage-shape gate

**What:** a gate asserting each tier family is fully flat or fully object, never blended — keyed on the
attribute's declared `type` in `block.json` and **nothing else**.
**Why:** without it the migration has no enforcement, and 160 edits become unverifiable.
**Estimated time:** 1 hour.
**Orchestration:** **inline (main thread)** — gates are judgement, and this project's gates have failed
three distinct ways this month.
⛔ **Do NOT key on `'responsive_model' => 'object'`** — it is block-level and already false-as-a-label for
4 of gallery's 8 families (council BLOCKER, measured). Not the DB either: `block.json` is what WP
enforces, needs no reseed, and is the file the codemod edits.
**Depends on:** none. **Parallel with:** Task 6. **/qc gate after:** yes — `/qc-inline`.
**Acceptance:** the gate FLAGS an injected blended family, naming block + attr; revert restores green;
confirmed on disk. Ships with a `--self-test` carrying a positive AND negative control, and a named
promotion trigger. Same-commit one-line clarification to contract §12 field 1 (*"both components remain
canonical during migration; object storage is the end state"* — it is NOT a factual error, see council).

#### Task 4 — Build P2, the seeding rework

**What:** `/sgs-update` seeds object-shaped attrs and their per-tier identity correctly.
**Why:** the converter, every gate and all six surveys read that identity from the DB.
**Estimated time:** 1 hour (depends on Task 1's verdict).
**Orchestration:** **inline** — schema representation is a design call.
**Depends on:** Task 1. **Parallel with:** nothing. **/qc gate after:** yes — `/qc-inline`.
**Acceptance:** reseed one already-object block; DB rows match its `block.json`; `inspector-scan` backlog
diffed before/after (rule 21 = **133**, tree-wide **250** at HEAD — safe to cite); DB snapshotted with a
named rollback first.

#### Task 5 — Migration pass 1: `gap`

**What:** collapse `gap`/`gapTablet`/`gapMobile` to one object attr everywhere it is a cascading value.
**Why:** first real pass; `gap` is already object on both row blocks, so the mechanism is proven live.
**Estimated time:** 2 hours including the codemod.
**Orchestration:** **the codemod IS the delegation** — build it inline (propose-only, per
`migrate-core-blocks`: lint → judge → apply, `README.md:24`), then **delegate its per-block application
to Sonnet behind P1's gate**. That is where the repetition goes; do not hand-edit 41 blocks.
**Depends on:** Tasks 3 + 4 both green. **Parallel with:** Task 6. **/qc gate after:** yes — `/qc-council`
if the codemod refuses any block.
**Acceptance:** `npm run survey:responsive-shape` shows `gap`'s `flat_tiers` at 0 for every block it
applies to; per-pass DoD in the design doc satisfied **including the legacy-scalar-read `is_array()`
check** (this class already fired: `grid-auto-rows:Array` on every render).

#### Task 6 — The clone-output gate

**What:** fail a clone run that emits a flat tier for an already-migrated property.
**Why:** ruling C — the interim divergence must be loud, not silent.
**Estimated time:** 45 min.
**Orchestration:** delegated · **Sonnet** · single agent — **the site is already known**, which is what
makes this safely delegable: `sgs-clone-orchestrator.py` writes `extract.json` at `:2053`, and the
R-31-15 anti-mirror gate already runs in that slot (`:70`, ~`:2645-2670`, `--skip-stage-gate` at `:2404`).
Build beside it with its own skip flag.
**Depends on:** none. **Parallel with:** Tasks 3 and 5 (file-disjoint). **/qc gate after:** yes — `/qc-inline`.
**Acceptance:** ⛔ **needs a POSITIVE CONTROL** — a fixture clone that provably TRIGGERS the gate. "It
stopped firing" is vacuously satisfiable if nothing exercises a migrated property.

#### Dependency graph

```
Task 1 (Sonnet)  ┐                      Task 6 (Sonnet) ── /qc-inline
                 ├── parallel                 │ file-disjoint, runs alongside 3 and 5
Task 2 (Sonnet)  ┘                            │
      ↓ (Task 1 only)                         │
Task 3 — P1 gate (inline) ── /qc-inline       │
      ↓                                       │
Task 4 — P2 seeding (inline) ── /qc-inline    │
      ↓ both green                            │
Task 5 — pass 1 `gap`: codemod inline, application DELEGATED
      ↓ /qc-council if any block refused
commit + push (path-scoped)
```

**Efficiency shape:** 2 measurement tasks run in parallel up front · the clone gate runs beside the whole
chain · the 41-block repetition is absorbed by a codemod rather than hand-edits · the census ships as a
re-runnable script so each later pass costs a command, not a session.

- **Step 6 — sequence the AUTHORISED flat→object migration.** Bean authorised the migration itself and
  set the ordering rule: **the block standard leads, the cloning pipeline is reworked afterwards** to
  the universalised norm, so the converter's missing object emitter is scheduled work and NEVER a
  precondition. Deliverable is a design document for Bean's approval, then `/qc-council`. ⛔ Two hard
  prerequisites are DESIGNED in Step 6 and BUILT next, before any block edit: **P1** the `--check` gate
  proven able to fail (and expressing the PHASE — flat is conforming for an un-migrated block, object
  for a migrated one), **P2** `/sgs-update` seeding reworked so object-shaped attrs and their unique
  identifiers seed correctly. P2's deciding question is the `css_property = NULL` item under *Open*.
- **Step 7 — Spec 39 seed** → DONE: `plans/spec-39-seed-requirements.md`.

**Survey figures, safe to cite** (`npm run survey:responsive-shape`): 83 blocks, 311 tier families —
**160 real migration candidates across 41 blocks** (the script's own `MIGRATION CANDIDATES` list).
⚠ Do NOT quote the `cascading_value` total (173) as the work-list — it also counts 13 `both_shapes`
families already tier-capable, overstating the work by 13. **36 `asset_like`** (per-tier ASSET = a
different resource per device, D521) + **7 `flag_like`** (conjunctive per-device flags) are CORRECT
as-is. The 94 orphans are explained: 79 `padding*`/`margin*` per-side + 11 `borderRadius`, base in
native supports.

**Also queued, not started:** Phase 3.2a `--fix` on the length survey (⚠ its input has a measured
false-positive rate — see the Parked note in `go-track-1b-mossy-babbage.md`) · Phase 2.1 opt-in
inversion (biggest payoff: 59% of live inspector controls come from universal extensions; gated on
deriving the list from real `post_content`, per D545).

### ⭐ Phase 2.1 SCOPE EXPANDED — Bean-directed 2026-08-10 (D551)

**`hover-effects`, `block-link` and the other problematic extensions get DISCONNECTED from blocks
and made OPT-IN.** This is part of Phase 2.1, not a separate errand.

Why they are wrong at the root, not merely untidy: they create **single-state colour pickers**
(contract §6's banned lookalike — canonical is `StateToggleControl`, one toggle per attr GROUP
covering BOTH states), and they **do not apply the effect to the element** — they paint the block
root, the same defect the element-driven inspector work exists to remove.

⛔ **STOP REPAIRING THEM.** Effort spent making a legacy extension correct entrenches a mechanism
being removed. Today's `7908a22f` hover fix is KEPT only because it is already done and measured
harmless (ZERO stored hover attrs on the canary, positive control 1706) — do not extend it.

⚑ **Transferable lesson:** that dead CSS sat inert for months because **nobody uses the feature**.
A defect nobody can trigger is weak evidence the feature is worth having. **Check whether a thing
is USED before investing in making it correct** — the census that answered it took one command.

### Methodology guardrails (earned; do not skip)

- ⭐ **A text count of an identifier discussed in comments is wrong BY CONSTRUCTION.**
  `<ContainerWrapperControls` appears in prose in six files that record having STOPPED using it.
  This contaminated the count **three times in one session** (24 mounts → 16; then a 10/6 split that
  is really 11/5). Naming the trap twice did not stop it. **Use an AST/JSX-element count.**
- ⭐ **Historical baselines: rebuild the tree, don't trust a remembered number.**
  `git archive <sha> -- plugins/sgs-blocks theme | tar -x -C $SNAP`, symlink `node_modules`, run the
  real scanner. ⚠ **Include `theme/`** — omit it and rules 17/20 silently mis-measure. This settled a
  three-way dispute (243/254/245) on the third independent run.
- ⭐ **`inspector-scan --json` has NO top-level `findings` key** — it is `rules[].findings`, filtered
  to `status:"FLAGGED"`. The wrong key returns `[]` and looks exactly like a clean pass.
- **A green build proves almost nothing about editor JS.** `lint:js` is NOT in `prebuild`.
- **`lint:js` raw is useless** — 12,969 pre-existing problems, 12,111 prettier CRLF noise, 66
  pre-existing `no-undef`. Lint the CHANGED FILES and diff the rule-count PROFILE.
- **Match a file's own formatting** — writing tabs into a 2-space `package.json` churned 66 lines
  for a 3-line change.
- **A gate firing is evidence about your data.** Deleting dead code moved rule 21 129→135; the +6
  were REAL findings the dead code had been MASKING (a metric counting name-presence rather than
  reachability rewards keeping dead code).
- **Fact-check every rater finding.** This session: one was overstated 6× (1 of 6 properties truly
  exposed), one framing challenge was refuted in code, and one rater was right where I was wrong.
- **Full STOP catalogue + pre-flight ritual: `.claude/STOP-CATALOGUE.md`** (uncapped, D101).

### Other tracks — stable

- **Track 1** — routing audit + tier axis COMPLETE (D480); Phase 4 PARTIAL, 5 OPEN.
- **Track 1c** (Spec 31 converter) — build shipped; open item is PROOF not build.
- **Tracks 2+2b** (nav/header/footer) — Wave 1 CLOSED, Wave 2 in progress.
- **Track 3** — CLOSED (D479). ⛔ GSAP is NOT MIT · LYGIA is Prosperity-licensed.

---

## State Snapshot

- **Branch:** `main`. ⛔ **Do not trust this line for tree state — run `git status`.** Commit by
  EXACT PATH (a pre-commit gate requires a pathspec; the visual-diff gate requires a `source_sha`
  in the report, and REJECTS a report still carrying a previous change's sha — that is the
  stale-report defence working, not a bug).
- **Untracked, deliberate:** `.claude/Border Example HTML.html` (Bean's reference markup).
  `plugins/sgs-blocks/err_tmp.txt` is a 0-byte pre-existing stray, safe to delete.
- **Baselines, re-derived 2026-08-10 and safe to cite:** `inspector-scan` rule 21 = **129** at
  `cb209dc1`, **133** now (+6 unmasked by the dead-panel deletion, −2 unattributed — no
  pre-dispatch snapshot was taken; **snapshot `rules[].findings` before any concurrent dispatch**).
  Tree-wide at `cb209dc1` = **245 FLAGGED / 259 raw** (the earlier 243/257 and 254 are BOTH wrong).
  Rule 26 = **3**. Denominator **83**.
- **Build:** `npm run build` exit 0, all gates green. `survey:selftest` 47 assertions across six
  detectors. `inspector-scan --self-test` green incl. the harness meta-check.
- **Canary:** sandybrown-nightingale-600381.hostingersite.com — **the only site**.
  Credentials `.claude/secrets/sandybrown.env` (gitignored, always available).
- **Verify every session:** `git log -1 --stat` · `git status` · `git branch --show-current` ·
  D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| **The canonical control set (GOVERNING)** | `plans/spec-35-control-type-contract.md` |
| Programme scope + phases (NOT the entry point) | `C:\Users\Bean\.claude\plans\go-track-1b-playful-hamster.md` |
| **The live migration design** | `plans/spec-35-flat-to-object-migration-design.md` + `spec-39-seed-requirements.md` |
| Decisions (D-numbered) | `decisions.md` — D552-D555 are today |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Blockers

**NONE.**

## Open — carried, not ours to close

- ✅ **CLOSED 2026-08-10 s3 — `sgs/gallery` page 1591 migration.** It had **already been run** in a
  prior session; this item was stale. The script is idempotent and correctly reported 0 posts. Stored
  content verified `contentWidth:{"desktop":"1200px"}` + `padding:{"desktop":{48/24/48/24}}`, no
  `style.spacing` remaining, and the live page now renders a **centred** 1200px band (23.73px each
  side, measured at a viewport where 1200px actually constrains).
- ✅ **CLOSED 2026-08-10 s3 — wrapper Stage 2 live-editor verification, with the honest scope.**
  Verified in BOTH surfaces, 0 console errors: post editor renders the object-model panel *"Spacing &
  width (per device)"*; `core/editor.getDeviceType()` resolves in the **site** editor too. ⚠ The
  honest result is that **Stage 2's 14 properties are CAPABILITY-ONLY — zero reachable instances**
  (only 3 of 83 blocks opt in, none declares them object-typed). Reachable: `gap` ×2,
  `gridTemplateColumns` ×1, `contentWidth`/`maxWidth`/`padding`/`margin` ×3. See D552 §2.
- ✅ **RESOLVED 2026-08-10 s3 — the `inspector-scan` count. THIS DOC WAS RIGHT.** Live at HEAD: rule 21
  = **133** FLAGGED (145 findings, 12 BASELINED), tree-wide **250**. My 98/215 reading was a real
  measurement of a tree corrupted by the stray-sequence bug (see D552 §4) — **proven by re-injection**:
  putting the sequence back reproduces 98/215, removing it restores 133/250. ⭐ The same bug moved TWO
  gates in OPPOSITE directions: +73 false in `check-dead-controls`, −35 hidden in rule 21. Safe to cite
  133/250 at HEAD and 129/245 at `cb209dc1`. **Still re-measure rather than trusting this line.**
- ✅ **RESOLVED 2026-08-10 s3 — `/sgs-update` stage count.** **14 numbered slots, 13 implemented**
  (Stage 3 `[RETIRED — merged into Stage 2]`, no `def stage_3_`). Source of truth is the script's own
  docstring `sgs-update-v2.py:1-63` + `choices=range(1, 15)` at `:6398`. Root `CLAUDE.md` corrected to a
  pointer after drifting three times. Do not cache the number here either.
- ⛔ **OPEN, and it decides P2's design — `css_property = NULL` on object attrs is NOT caused by the
  shape.** Refuted 2026-08-10 s3: gallery's *object* `maxWidth` retains `css_property = max-width`
  while the row blocks' object `maxWidth` is NULL. Most likely a fossil (Stage 1 updates `attr_type`
  without clearing `css_property`). **Read the seeder before designing P2.**
- **The lost at-a-glance affordance** — deleted per-control strips showed which OTHER tiers had a
  value. Needs its own design; ⛔ must NOT be solved by re-adding a per-control switcher.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **`sgs/hero` split-image bleed** — latent only, 0 live instances. Parked.
- **physics-canvas `ALLOWED_BLOCKS`** — Bean approved opening it via a physics-participation
  toggle; needs its own design gate. Not started.
- **blub :5050 is DOWN** (HTTP 000, diagnosed). Re-POST pending lessons to `/api/learning`.
- **`MEMORY.md` at ~24,420 of 24,576 bytes** — a real compaction (archiving, not trimming) is owed
  and blocks new entries.