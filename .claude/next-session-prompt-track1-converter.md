---
doc_type: next-session-prompt
project: small-giants-wp
thread: "Track 1 — Spec 31 completion wave DONE + pushed (2026-07-22, 11 commits). Next = close Spec 31 to 100% (deploy fixtures → wire check_landed → UNACCOUNTED→0 → live verify), THEN conformance-audit Spec 35 and take it to 100% the same way."
generated: 2026-07-22
track: 1-converter
note: "Track 1's prompt lives HERE, not .claude/next-session-prompt.md — that canonical path is contended by Track 2 (Spec 36/37). See the top warning."
---

# Track 1 — Next Session Prompt (2026-07-22)

**Invoke `/autopilot` before anything else.** Then read this end-to-end.

> ⚠ `main` is SHARED with a co-active **Track 2** (Spec 36/37 header/footer/nav) and **Track 1b**
> (Spec 35 inspector-UX). Track 2 owns `LEDGER.md`, `parking.md`, `decisions.md`,
> `STOP-CATALOGUE.md`, `.claude/next-session-prompt.md`, and the D-numbering cadence.
> **THIS is Track 1's prompt** (`next-session-prompt-track1-converter.md`).
> Path-scope every commit; re-check `git branch --show-current` in the SAME command as the commit;
> NEVER `git add -A`.
> **VERIFY every commit landed via `git log -1`, NOT the hash the commit reported** — on this
> shared checkout a co-active commit can race in and the reported HEAD may be theirs.
> Last session this discipline held across 11 commits with zero collisions, and Track 2's session
> close (`a20a234d`) did NOT clobber Track 1's parking/STOP entries (verified by grep afterwards —
> do that check again next time rather than assuming).

## Plain-English state (where we are)

**Spec 31 (the cloning pipeline) is much closer to done than its own text implies.** A live-code
grounding pass on 2026-07-22 found most of §12.6's "what's left" list was ALREADY BUILT — the spec
just lagged the code. Last session shipped the genuinely-open remainder except the closing gate.

Shipped last session (11 commits, all pushed, all gates green):

| Unit | What landed |
|---|---|
| Conformity audit | Spec 31 §3.A/§4 reconciled to Front-1's declarative routing columns; MF-4 marked CLOSED; 6 stale hardcoded counts removed from `CLAUDE.md:207`; parking reframed honestly; 6 earned STOP tokens landed (D101 receipt 61→67) |
| A1–A6 | property seed/exclude audit; `check_variants` fail-loud on missing/malformed enum; `object-position` proven to LAND; exclude-with-reason migration; spec residuals refreshed |
| **B1** (`5a7466cc`) | `::before`/`::after` pseudo-element overlay lift — was a SILENT production drop (the DOM matcher's `':' not in last_part` guard excluded `::` too) |
| **B3** (`f8a4388e`) | **transform/filter/top/left un-excluded + hover-lift** — `scaleHover` (11 blocks), `imageZoomHover` (4), `grayscaleHover` (4), `positionY`/`positionX`. Every draft hover scale/zoom/grayscale effect had been silently dropped |
| **C1a** (`51629e37`) | F3 LANDED runtime + multi-fixture batch runner with the §7b false-win guards |
| **C1b** (`321293a6`) | **UNACCOUNTED leg CLOSED, 14 → 0.** The 14 were NOT converter drops — three ACCOUNTING bugs (see below). Baseline regenerated 14 → 0 through the sign-off gate |

**Current test/gate state:** 764 converter+ledger tests pass, 200 oracle tests pass, 66 css_router
tests pass; coverage gate **0 UNACCOUNTED (baseline now empty)**; `no_slug_literal` +
`db-consistency` clean.

**What C1b found — read this before touching the ledger.** The 14 baselined UNACCOUNTED rows were
**accounting losses, not converter drops**. Proof: the converter demonstrably transfers them —
`sgs-hero`'s padding is present in `tests/fixtures/conformance/sgs-hero.golden.json` as
`style.spacing.padding`. Three bugs, all in the D1 bucketing/join:
1. **D1 clobber (6 rows)** — the D1 entry key was `f"{block}.{prop}"` with NO tier axis, so a
   breakpoint rule OVERWROTE the base rule and the base declaration vanished. This made §12.2.1's
   conservation invariant structurally unsatisfiable for EVERY responsive pair.
2. **Media format (6 rows)** — D1/D3 store `@media (cond)`; `declare_input` and the D2 re-parse use
   `(cond)`. The join compared literally.
3. **Selector list (2 rows)** — css_router keeps `.a, .b { }` as ONE selector string; declare_input
   splits it, so a list-scoped rule could never match.

⚠ **Bug 1 was a HALF-FINISHED repair** — the join's own docstring says *"FIX 1 (tier/media-blind
join bug)"*: someone made the JOIN media-aware but never fixed the D1 SOURCE, which still could not
hold two entries per (block, property). The unfinished half silently ate 6 declarations. **Treat any
"FIX N" comment as a claim to verify end-to-end, not a completed job.**

**What Spec 31 = 100% still needs — and its hard prerequisite.** The F3 LANDED instrument now
EXISTS but can prove nothing, because no per-fixture canary pages are deployed.
`ledger/coverage_check.py::check_landed()` is DELIBERATELY still unwired: wiring it with no live
URLs returns `NOT-RENDERED` for all 36 fixtures and would **fail the F5 gate for every session,
including Track 2's**. That deploy is Task 1's first move.

**Then Spec 35** (`.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` — the block-inspector-UX
standard, i.e. what a non-coder client actually sees in the editor sidebar). Bean wants it taken to
100% the SAME way Spec 31 was: conformance-audit it against live code + the DB FIRST, then plan,
then execute. **Do NOT trust any cached Spec 35 figures — derive them.** The LEDGER Track 1b line
still reads "28 of 67 | OK 432 | GAP 1101 | ORPHAN 62", which was already stale before this session:
wave 2 (`42a34700`) took the roster 28 → 45, and a live run on 2026-07-23 measured **OK 998 /
GAP 2832 / ORPHAN 0**. Re-derive at session start with:
`cd plugins/sgs-blocks/scripts && node check-element-manifest-conformance.js`
(count `[OK]` / `[GAP]` / `[ORPHAN]`). FR-35-5 (`states` axis) + FR-35-6 (`animation` cluster) are
APPROVED but NOT BUILT. Also correct the LEDGER's stale line when Track 1b/2 are idle.

## First action (≤5 min, zero dependencies)

**Read Spec 31 in full** (item 2 of the reading gate below) — it is the Bean-locked gate before any
converter edit and it primes everything in Task 1. Then run the suites to confirm the inherited
state is genuinely green before changing anything:
`cd plugins/sgs-blocks/scripts && python -m pytest converter/ ledger/ -q && python ledger/coverage_check.py --check`
(expect 761 pass + `0 NEW UNACCOUNTED`). If either differs from that, STOP and reconcile before
building — the inherited state is a claim, not a fact.

## Mandatory READING (gate — before any converter edit)
1. `/autopilot` (first).
2. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — **IN FULL** (Bean-locked, ~672 lines).
3. `.claude/STOP-CATALOGUE.md` — the pre-flight ritual + STOP entries (Track 2's file; read, don't rewrite mid-race).
4. `.claude/plans/2026-07-22-spec31-completion-to-100.md` — the live plan + its AUDIT CORRECTION section.
5. For Task 2 only: `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` — **IN FULL** before any Spec 35 work.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | Design gates before any converter/spec change |
| `/gap-analysis` | Grade the conformance-audit output before acting on it |
| `/lifecycle` | Before any skill/agent/pipeline change |
| `/research` | Auto-routes research tier when a decision is unclear |
| `/strategic-plan` + `/phase-planner` | Plan + break down the Spec 35 completion order |
| `/dispatching-parallel-agents` | Fan out file-independent audit + build tasks |
| `/subagent-driven-development` | Implementer + reviewer loop per converter task |
| `/delegate` | Route every dispatch (Haiku mechanical / Sonnet architectural) |
| `/qc-council` | Multi-rater before ANY converter/pipeline/SGS-block commit (blub.db 255) |
| `/sgs-db` + `/wp-blocks` | DB authoritative — never hardcode a count |
| `/wp-sgs-deploy` | The deploy ceremony for Task 1's canary fixture pages |

## Tool bindings — MCP Servers & Tools
| Tool | For |
|------|-----|
| `/sgs-db` (sgs-db.py) | Block schema/attrs/variants/counts — the authoritative source |
| `python ~/.claude/hooks/wp-blocks.py` | Block schema/markup/variations before any "missing X" claim |
| Playwright MCP | Live-page verification (C2), editor probes, the oracle's live leg |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | Any converter/block build (constrain: no deploy/commit unless told) |
| `Explore` / `general-purpose` | Parallel conformance-audit spot-checks (docs vs live code/DB) |
| `feature-dev:code-reviewer` | Cross-check reviewer in the council loop before every converter commit |

---

## Task 1 — Spec 31 to 100%
**What:** Close the LANDED gate so Spec 31 can be provably marked complete.
**Why:** Bean's stated exit condition before Spec 35. Spec 31 §5/§12 define done as: across the
multi-shape fixture set, every draft declaration is TRANSFERRED-and-LANDED, EXCLUDED-with-reason,
or a tracked GAP — **zero UNACCOUNTED, zero WRITTEN-not-LANDED, zero CHEAT**.
**Estimated time:** deploy ~20 min; wiring ~10 min; UNACCOUNTED triage ~45 min; live verify ~30 min.

**Sub-steps, in dependency order:**
1. **Deploy the phase-f fixture corpus as canary pages** (`P-ORACLE-CHECKLANDED-NEEDS-CANARY-FIXTURES`).
   Use `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` — **NEVER hand-roll
   tar/scp (D336 took two client sites down ~2.5h)**. Then populate
   `plugins/sgs-blocks/scripts/oracle/fixture-canary-urls.json`.
2. **Wire `check_landed()`** — the exact function body is in the `51629e37` commit message. Only
   after step 1, or it fails the F5 gate for everyone.
3. ~~Drive the 14 baselined UNACCOUNTED to 0~~ — **DONE (C1b, `321293a6`). The UNACCOUNTED leg is
   CLOSED at 0 with an empty baseline. Do NOT re-open it as a task.** If the count is ever non-zero
   again, that is a genuine NEW regression, not inherited debt.
4. **Live verify (C2)** — computed-parity per section on the canary **+ Bean's eye** (R-31-11 /
   R-31-13). Numbers alone do not close; his eye alone does not close.
5. **Then** mark Spec 31 COMPLETE and record the D-number.

**Orchestration:** step 1 inline (deploy is sensitive); step 3 fans out via
`/dispatching-parallel-agents` (the 14 items are file-independent triage); step 4 inline with
Playwright. Depends on: none. /qc gate: `/qc-council` before any converter commit.
**Acceptance:** coverage gate reports **0 UNACCOUNTED + 0 WRITTEN-not-LANDED** across the corpus,
the oracle batch shows real LANDED cells, live verify passes per section, Bean signs off.

## Task 2 — Spec 35 conformance audit, then to 100%
**What:** Run the SAME two-phase treatment on Spec 35 that worked on Spec 31: (a) conformance-audit
the spec against live code + the DB, (b) plan + execute to 100%.
**Why:** Spec 35 is closer to Bean's actual end-goal than the converter — it governs whether a
non-coder client gets a complete, correct editor sidebar for every block.
**Estimated time:** audit ~30 min (parallel); plan ~20 min; build scales with what the audit finds.

**Sub-steps:**
1. **Read Spec 35 IN FULL** before anything else.
2. **Conformance audit** — dispatch parallel `Explore`/`general-purpose` agents to check the spec's
   FR statuses against live code + `/sgs-db`. **Apply last session's hard-won lesson: audit by the
   DECLARED SEMANTIC (`css_property`, `role`, the manifest), never by identifier NAME, and require
   ≥2 signals before recording an "absent/missing" verdict** — a name-keyed audit wrongly excluded
   `transform` because its consumer is called `scaleHover`. Expect the spec to LAG the code.
3. **Grade the audit** with `/gap-analysis`, then `/strategic-plan` → `/phase-planner`, ordering
   tier-0/tier-1 mechanical work FIRST and mapping file-independent tasks to parallel fan-out.
4. **Execute** — known open work: FR-35-5 (`states` axis) + FR-35-6 (`animation` cluster), both
   APPROVED NOT BUILT; rollout waves 2–3 (28 of 67 blocks manifested); the card-grid resting-state
   defect; the ORPHAN 62 / GAP 1101 backlog. Canonical design:
   `plans/2026-07-20-spec-35-cluster-vocabulary-rework-design.md`.
5. Fold in `P-INSPECTOR-CONTROL-TYPE-94-DISAGREEMENTS` — 94 attrs where the derived
   `inspector_control_type` disagrees with the stored value; of 18 hand-traced, **15 showed the
   stored value was WRONG**; 76 unaudited. Bean's standing instruction: **finish the audit before
   overwriting 94 rows on an 18-row sample.** This sits squarely on Spec 35's end-goal.

**Orchestration:** step 2 delegated + parallel; step 3 inline; step 4 via
`/subagent-driven-development`. Depends on: Task 1 closing first (Bean's sequence).
**Acceptance:** a drift findings list with each item mapped to a fix; a phase plan whose tasks name
model tier + parallel/sequential + file scope + acceptance; then Spec 35's own completion criteria
met and verified live.

---

## Dependency graph
```
Task 1.1 deploy fixtures (inline)
   ↓
Task 1.2 wire check_landed (inline)
   ↓
Task 1.3 UNACCOUNTED triage (PARALLEL fan-out — 14 independent items)
   ↓ /qc-council gate
Task 1.4 live verify + Bean's eye  →  SPEC 31 = 100%
   ↓
Task 2.1 read Spec 35 in full (inline)
   ↓
Task 2.2 conformance audit (PARALLEL agents)
   ↓ /gap-analysis
Task 2.3 plan (inline)  →  Task 2.4 execute (subagent-driven)  →  SPEC 35 = 100%
```

## Structural defences — STOP catalogue (carry forward, never subtract — D101)
The 6 STOP tokens this track owed were **LANDED into `.claude/STOP-CATALOGUE.md` last session**
(count 61→67, receipt recorded in that file): `STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT`,
`STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC`, `STOP-RESIDUE-DECLARED-IRREDUCIBLE-USUALLY-ISNT`,
`STOP-VERIFY-THE-DELIVERABLE-EXISTS`, `STOP-PRE-EXISTING-CLAIM-CHECK-SESSION-START`,
`STOP-CHECK-BOTH-HOOK-LAYERS-BEFORE-COMMIT`. **Justification for their removal from this prompt's
"to carry" list: ABSORBED into the canonical catalogue, not dropped.** The four most load-bearing
for this track, restated because they will bite again:

- **STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT** — the hash a `git commit` REPORTS can be the
  other session's racing commit. Verify via `git log -1` + `git status`, never the reported hash.
- **STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC** — the pre-commit visual-diff gate blocks any touch
  of a block's render.php/block.json/edit.js; its own message sanctions `--no-verify` for
  non-visual (logic/attr/meta) changes. Use that; never fabricate a PASS report.
- **STOP-NEGATIVE-CONTROL-OR-THE-TEST-IS-VACUOUS** — before banking a PASS ask "would this still
  pass if the feature were absent?" Last session the ordering guard was only trusted after proving
  it FAILS under the old ordering. Do that, don't reason about it.
- **STOP-A-DISPATCHED-AGENT-MUST-EXECUTE-NOT-DELEGATE** (Track 2, D362) — put "EXECUTE YOURSELF
  with your OWN tools; do NOT use the Agent/Task tool to delegate" in every implementer dispatch.

**NEW — ADD to STOP-CATALOGUE.md when Track 2 is idle (2 tokens; re-derive `previous` with the
canonical command in that file's §D receipt — do NOT carry a figure forward from a prior read):**
- **STOP-A-HALF-FINISHED-FIX-IS-WORSE-THAN-NONE** — a repair applied to ONE side of a two-sided
  mechanism looks done and silently keeps failing. The coverage join carried a `FIX 1
  (tier/media-blind join bug)` comment: the JOIN was made media-aware, but the D1 SOURCE was never
  given a tier axis, so it still could not hold two entries per (block, property). The unfinished
  half silently ate 6 declarations and the `FIX 1` comment made it look handled. **Treat any
  "FIX N"/"fixed" comment as a CLAIM to verify end-to-end across BOTH sides of the mechanism.**
  Sibling of STOP-NEGATIVE-CONTROL (a fix with no failing-first test is unverified). (2026-07-23.)
- **STOP-READ-AN-INSTRUMENT'S-SEMANTICS-BEFORE-CALLING-ITS-OUTPUT-A-BUG** — I read a golden emit,
  saw the value transferred, and declared the ledger's UNACCOUNTED a "false positive". The module's
  own docstring says plainly that "bucketed" means *css_router dispositioned it*, NOT *the converter
  emitted it* — so the report was correct in its own terms and my diagnosis was wrong. **Read what a
  measurement CLAIMS to measure before calling its output wrong**; and when proposing to suppress a
  finding, check the suppression mechanism's KEY first (`excluded_properties` is keyed on
  `css_property` alone, so "exclude just these selectors" was impossible and would have globally
  disabled `display`/`padding`/`font-size` transfer). (2026-07-23, Bean-caught via "what does
  excluding them do to the pipeline?".)
- **STOP-AUDIT-BY-DECLARED-SEMANTIC-NOT-IDENTIFIER-NAME** — asking "does anything consume X?" by
  searching identifier NAMES misses semantically-named consumers (`scaleHover` consumes
  `transform`; `grayscaleHover` consumes `filter`). It wrongly excluded 2 CSS properties and
  silently dropped every hover scale/zoom/grayscale effect across 15+ blocks. Query the DECLARED
  semantic (`css_property` / `role` / the manifest) **plus** a semantic sweep, and require ≥2
  signals before recording an "absent" verdict — `css_property` alone was only partly seeded, so a
  single-signal audit fails in BOTH directions. An exclusion is a load-bearing claim that silently
  deletes fidelity. (Bean-caught, 2026-07-22.)

## Pre-flight ritual (answer before first Write/Edit)
1. On `main`? Next commit path-scoped away from Track 2 (`LEDGER.md`, `parking.md`, `decisions.md`,
   `STOP-CATALOGUE.md`, `.claude/next-session-prompt.md`, `site-*`, `mega-menu`, spec 36/37,
   `header-*` patterns)?
2. Touching the converter? → Spec 31 read IN FULL, design-gated, `/qc-council` before commit.
3. About to accept a subagent "done / clean / irreducible / pre-existing" claim? → re-derive it from
   the tool; check the deliverable EXISTS; ask what the number SHOULD be. Last session a "clean"
   review rested on a DB claim that was false — the query took 30 seconds and found a real bug.
4. After committing → does `git log -1` show MY message at HEAD + `git status` clean?
5. Banking a PASS? → would it still pass if the feature were absent? If yes, the check is vacuous.
6. Recording something as "absent / missing / excluded"? → did I check ≥2 signals, including the
   declared semantic, not just the identifier name?

## Guardrails
- **Deploy: `build-deploy.py --target sandybrown` ONLY.** Never hand-roll tar/scp/`rm -rf` (D336).
  Don't reach for `--allow-dirty` or `--skip-verify`. `md5sum` local↔server BEFORE measuring.
- Converter changes: `/qc-council` multi-rater before commit (blub.db 255); verify on the REAL draft
  + the live code path, not synthetic unit-green.
- DB authoritative — never hardcode a count (`/sgs-db`, `/wp-blocks`).
- Every deferral maps to a named spec STAGE, never "out of scope" (STOP-29).
- Time estimates default LOW; smallest first action < 5 min.
- Suites before AND after, from `plugins/sgs-blocks/scripts`:
  `python -m pytest converter/ ledger/ -q` · `python -m pytest oracle/ -q` ·
  `python ledger/coverage_check.py --check` · `python converter/gates/no_slug_literal.py` ·
  `python db-consistency/run.py`.

## Open residuals (parked, not blockers)
The previous prompt's "Deferred shared-doc reconciliation" section is **DONE** — all items were
reconciled and committed last session (`e8f57958`, `10b154c1`). Current parked residuals:

- `P-ORACLE-CHECKLANDED-NEEDS-CANARY-FIXTURES` — Task 1.1; THE gating dependency for Spec 31 100%.
- `P-CLONE-TEAM-MEMBER-ITEM-HEIGHT-DIVERGENCE` — real fidelity gap the new height guard exposed
  (244px vs 327px; items clone to `sgs/info-box`, which brings its own box model). Was invisible
  because the old artefact had `draft_height_px=null` → the guard was SKIPPED, not passed.
- `P-NAVMENU-UNDERLINEOFFSET-CSSPROP-MISSEED` — `underlineOffset` seeded as `css_property='position'`.
- `P-POSTGRID-SCALEHOVER-OUT-OF-B3-SCOPE` — per-item + multi-property, outside the root-domain state
  lookup B3 built; its hover scale still drops.
- `P-CONTAINER-CUSTOM-BAND-WIDTH-BROKEN` — an EDITOR control-state bug, **not** fixed by the 800px
  seed (the previous prompt conflated the two). Still needs a live Playwright repro.
- `P-INSPECTOR-CONTROL-TYPE-94-DISAGREEMENTS` — Task 2.5.
