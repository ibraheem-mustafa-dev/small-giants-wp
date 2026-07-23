---
doc_type: next-session-prompt
project: small-giants-wp
thread: "Track 1 — Spec 31 LANDED leg ARMED + the oracle's guards corrected (2026-07-23, 6 commits). The instrument was lying in BOTH directions; it now reports 2 genuine findings instead of 87 phantom ones. Next = settle the 2 open questions on the per-area CSS routing rework and build it — Bean believes it is the LAST task before Spec 31 = 100%, then Spec 35."
generated: 2026-07-23
track: 1-converter
note: "Track 1's prompt lives HERE, not .claude/next-session-prompt.md — that canonical path is contended by Track 2 (Spec 36/37). See the top warning."
---

# Track 1 — Next Session Prompt (2026-07-23)

**Invoke `/autopilot` before anything else.** Then read this end-to-end.

> ⚠ `main` is SHARED with a co-active **Track 2** (Spec 36/37 header/footer/nav). Track 2 owns
> `LEDGER.md`, `parking.md`, `decisions.md`, `STOP-CATALOGUE.md`, `.claude/next-session-prompt.md`,
> and the D-numbering cadence. **THIS is Track 1's prompt**
> (`next-session-prompt-track1-converter.md`).
> Path-scope every commit; re-check `git branch --show-current` in the SAME command as the commit;
> NEVER `git add -A`.
> **VERIFY every commit landed via `git log -1`, NOT the hash the commit reported** — Track 2 was
> committing live during the 2026-07-23 session (`a6040287` landed between two Track 1 commits),
> and this discipline held across 6 commits with zero collisions.

## Plain-English state (where we are)

**Spec 31's LANDED leg is now armed and measuring for the first time.** Last session closed the
gating dependency (`P-ORACLE-CHECKLANDED-NEEDS-CANARY-FIXTURES`) and then spent most of its time
discovering that the *instrument* was lying in both directions — inventing failures AND hiding real
ones. It now reports 2 genuine findings instead of 87 phantom ones.

Shipped last session (6 commits, all pushed, all gates green):

| Commit | What landed |
|---|---|
| `b4859b71` | 35/36 fixture canary pages deployed + `check_landed()` ARMED (opt-in `--with-landed`) |
| `96bfeb66` | First real corpus-wide LANDED measurement recorded; stale "DEFERRED" text removed |
| `f6bacb46` | Guards 1+4 judge against the **golden**, not two false assumptions |
| `1669a785` | Composition gate + draft-hidden gate + real `expected_default` |
| `a0a7d6aa` | **The fold gap channels wired — they were built but never connected** |
| `b46bcfc2` | `body` → `sgs/text` alias removed; area-routing rework design-gated |

**Current state:** 997 tests pass; coverage gate **0 UNACCOUNTED**; `no_slug_literal` + `db-consistency`
clean; oracle corpus = LANDED 37 / UNVERIFIED 36 / **WRITTEN-not-LANDED 2** / GUARD-FAIL 23 /
COMPOSITION-INVALID 4.

**The one open task — and Bean thinks it may be the LAST for Spec 31 = 100%:** the per-area CSS
routing rework, fully designed and **design-gate pending** at
`.claude/plans/2026-07-23-area-css-routing-declarative-design.md`. Read that doc first; it carries
the measured evidence, two OPEN QUESTIONS Bean raised, and two explicitly REJECTED approaches.

## What last session proved (do not re-derive)

- **`attr_for_area_property` name-builds `area + suffix` and never consults the slots table.** A
  336-combination differential vs a declarative lookup: declarative finds **206 routes the
  name-build misses**; the 13 "name-build only" wins are **WRONG routes** (all option-picker pill
  attrs seeded `css_state='hover'`, so a RESTING declaration lands on a HOVER attr — the name-build
  is blind to `css_state`/`css_tier`); 3 conflicts pick a different attr than the one declared.
- **`css_layer` is unusable** — 6 of 511 seeded. `css_element` is the real disambiguator (421/511).
- **NULL `css_element` means ROOT, not "unseeded"** (`scaleHover`, `columns`, `fontSizeTablet`) —
  Spec 31 §4 already treats `css_element IN ('','root','self')` as the base domain. An AREA resolver
  only serves NAMED sub-areas, so there is no population the name-build uniquely serves.
- **The Mama's product-card `__body` padding is dropped**, and it LOOKED faithful only because the
  block's own hardcoded fallback (`style.css:81`, 20px) equals the draft. `innerPadding` appears
  ZERO times in page 8's stored content.
- **`sgs/product-card` has TWO renderers.** `render.php` emits `product-card-body`;
  `includes/product-card-builtin-render.php:125` emits `sgs-product-card__body` — the latter is what
  runs. Reading the wrong one cost half a session.
- **Six leads triaged to zero converter defects**: 1 capability gap (product-card root padding —
  `spacing.padding:false` is deliberate, the image is edge-to-edge), 1 invalid fixture
  (parent-constrained accordion-item), 4 semantic mismatches (modal trigger vs overlay).

## First action (≤5 min, zero dependencies)

**Read the design doc** `.claude/plans/2026-07-23-area-css-routing-declarative-design.md` end to end
— it is the whole task. Then confirm the inherited state is genuinely green before changing anything:
`cd plugins/sgs-blocks/scripts && python -m pytest converter/ ledger/ oracle/ -q && python ledger/coverage_check.py --check`
(expect 997 pass + `0 UNACCOUNTED`). If either differs, STOP and reconcile — inherited state is a
claim, not a fact.

## Mandatory READING (gate — before any converter edit)
1. `/autopilot` (first).
2. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — **IN FULL** (Bean-locked, ~674 lines).
3. `.claude/STOP-CATALOGUE.md` — the pre-flight ritual + STOP entries (Track 2's file; read, don't rewrite mid-race).
4. `.claude/plans/2026-07-23-area-css-routing-declarative-design.md` — **the live task.**
5. `.claude/plans/2026-07-22-spec31-completion-to-100.md` — the parent plan + its AUDIT CORRECTION section.
6. For Spec 35 work only: `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` — **IN FULL** first.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | Design gates before any converter/spec change |
| `/gap-analysis` | Grade audit output before acting on it |
| `/lifecycle` | Before any skill/agent/pipeline change |
| `/research` | Auto-routes research tier when a decision is unclear |
| `/strategic-plan` + `/phase-planner` | Plan + break down the Spec 35 completion order |
| `/systematic-debugging` | Root-cause gate — proven cause, never inferred |
| `/qc-council` | Multi-rater before ANY converter/pipeline/SGS-block commit (blub.db 255) |
| `/dispatching-parallel-agents` | Fan out file-independent audit tasks |
| `/sgs-db` + `/wp-blocks` | DB authoritative — never hardcode a count |

## Tool bindings — MCP Servers & Tools
| Tool | For |
|------|-----|
| `/sgs-db` (sgs-db.py) | Block schema/attrs/columns — the authoritative source |
| `python ~/.claude/hooks/wp-blocks.py` | Block schema/markup before any "missing X" claim |
| Playwright MCP | Live-page verification, the oracle's live leg |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | Any converter/block build (constrain: no deploy/commit unless told) |
| `Explore` / `general-purpose` | Parallel DB survey + spot-checks (docs vs live code/DB) |
| `feature-dev:code-reviewer` | Cross-check reviewer before every converter commit |

---

## Task 1 — Settle the two OPEN QUESTIONS, then build the declarative area resolver
**What:** Replace the fuzzy name-building in `attr_for_area_property` with purely declarative
routing (`css_property` + `css_element`, base domain, fail loud on tie), deleting the name-build.
**Why:** Recovers 206 lost routes and removes a wrong-routing class. Bean believes this is the last
thing between here and Spec 31 = 100%.
**Estimated time:** DB survey ~30 min (parallel); build ~30 min; live verify ~30 min.

**Sub-steps, in dependency order:**
1. **OPEN QUESTION 1 — what does `css_element='box'` mean?** Bean's hypothesis: it is a CLUSTERING
   term for the CSS that shapes the containing box, not a DOM element. If so it may be a wildcard /
   auto-match signal meaning *"both sides are invisible structural layers"* (a draft wrapper with no
   block identity meeting a block attr whose element is a non-DOM cluster), rather than a match
   target. **Settle this before building** — it decides whether `box` is a match target, a wildcard,
   or its own dispatch arm.
2. **OPEN QUESTION 2 — full DB survey.** Enumerate EVERY column that could differentiate CSS attrs
   and decide what `css_element` is legitimately matched against. Known: `css_property` (511),
   `css_element` (421), `css_state`, `css_tier`, `css_layer` (6 — unusable), `role`, `box_family`.
   Fan out via `/dispatching-parallel-agents`.
3. **Check the 3 CONFLICT cases individually** (`sgs/cart.badge` colour, `sgs/hero.overlay` opacity,
   `sgs/trust-bar.label` colour) — read each block's own CSS. Do NOT assume the declared value is right.
4. **Build** per the design doc §"The proposed shape". `/qc-council` before commit.
5. **Live verify** — re-run `oracle/batch_runner.py` + computed-parity on the canary **+ Bean's eye**
   (R-31-11 / R-31-13). Numbers alone do not close.

**Orchestration:** steps 1-2 delegated + parallel (Sonnet); steps 3-5 inline. Depends on: none.
**/qc gate after:** yes — `/qc-council` before the converter commit.
**Acceptance:** the 2 remaining WRITTEN-not-LANDED resolve or are explained; no route regresses
(re-run the 336-combination differential); ledger stays 0 UNACCOUNTED; Bean signs off.

## Task 2 — Spec 35 conformance audit, then to 100%
**What:** Same two-phase treatment that worked on Spec 31: conformance-audit the spec against live
code + the DB, then plan + execute.
**Why:** Spec 35 governs whether a non-coder client gets a complete editor sidebar per block.
**Estimated time:** audit ~30 min (parallel); plan ~20 min; build scales with findings.

**Sub-steps:** read Spec 35 IN FULL → parallel conformance audit (**audit by the DECLARED SEMANTIC —
`css_property`/`role`/the manifest — never by identifier NAME; require ≥2 signals before recording an
"absent" verdict**) → `/gap-analysis` → `/strategic-plan` → execute.
**Known open:** FR-35-5 (`states` axis) + FR-35-6 (`animation` cluster), both APPROVED NOT BUILT;
rollout waves 2-3; the card-grid resting-state defect; `P-INSPECTOR-CONTROL-TYPE-94-DISAGREEMENTS`
(94 attrs where derived ≠ stored; of 18 hand-traced, **15 stored values were WRONG**; 76 unaudited —
Bean's standing instruction: finish the audit before overwriting 94 rows on an 18-row sample).
**Do NOT trust cached Spec 35 figures — derive them:**
`cd plugins/sgs-blocks/scripts && node check-element-manifest-conformance.js` (count `[OK]`/`[GAP]`/`[ORPHAN]`).
**Orchestration:** audit delegated + parallel; plan inline; build via `/subagent-driven-development`.
**Depends on:** Task 1 closing first (Bean's sequence).

---

## Dependency graph
```
Task 1.1 + 1.2  (PARALLEL — box semantics + DB survey)
   ↓
Task 1.3 conflicts (inline)  →  Task 1.4 build (/qc-council gate)
   ↓
Task 1.5 live verify + Bean's eye  →  SPEC 31 = 100%
   ↓
Task 2 (Spec 35: read → parallel audit → plan → execute)
```

## Structural defences — STOP catalogue (carry forward, never subtract — D101)
The 6 tokens Track 1 owed were LANDED into `.claude/STOP-CATALOGUE.md` in a prior session
(`STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT`, `STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC`,
`STOP-RESIDUE-DECLARED-IRREDUCIBLE-USUALLY-ISNT`, `STOP-VERIFY-THE-DELIVERABLE-EXISTS`,
`STOP-PRE-EXISTING-CLAIM-CHECK-SESSION-START`, `STOP-CHECK-BOTH-HOOK-LAYERS-BEFORE-COMMIT`).
The most load-bearing for this track, restated because they bit again:

- **STOP-VERIFY-COMMIT-LANDED-ON-SHARED-CHECKOUT** — the hash a `git commit` REPORTS can be the other
  session's racing commit. Verify via `git log -1` + `git status`, never the reported hash.
- **STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC** — the pre-commit visual-diff gate blocks any touch of
  a block's render.php/block.json/edit.js; its own message sanctions `--no-verify` for non-visual
  changes. Use that; never fabricate a PASS report.
- **STOP-NEGATIVE-CONTROL-OR-THE-TEST-IS-VACUOUS** — before banking a PASS ask "would this still pass
  if the feature were absent?" Every guard shipped this session has a paired negative control.
- **STOP-AUDIT-BY-DECLARED-SEMANTIC-NOT-IDENTIFIER-NAME** — asking "does anything consume X?" by
  searching NAMES misses semantically-named consumers (`scaleHover` consumes `transform`). Require
  ≥2 signals before recording an "absent" verdict.
- **STOP-A-DISPATCHED-AGENT-MUST-EXECUTE-NOT-DELEGATE** (Track 2, D362) — put "EXECUTE YOURSELF with
  your OWN tools; do NOT use the Agent/Task tool to delegate" in every implementer dispatch.
- **STOP-A-HALF-FINISHED-FIX-IS-WORSE-THAN-NONE** — a repair on ONE side of a two-sided mechanism
  looks done and keeps failing. Treat any "FIX N"/"fixed" comment as a CLAIM to verify end-to-end.
- **STOP-READ-AN-INSTRUMENT'S-SEMANTICS-BEFORE-CALLING-ITS-OUTPUT-A-BUG** — read what a measurement
  CLAIMS to measure before calling its output wrong; check a suppression mechanism's KEY before
  proposing to use it.
- **STOP-RESIDUE-DECLARED-IRREDUCIBLE-USUALLY-ISNT** · **STOP-VERIFY-THE-DELIVERABLE-EXISTS** ·
  **STOP-PRE-EXISTING-CLAIM-CHECK-SESSION-START** · **STOP-CHECK-BOTH-HOOK-LAYERS-BEFORE-COMMIT** —
  carried forward verbatim; full text in `STOP-CATALOGUE.md`.

**NEW — ADD to STOP-CATALOGUE.md when Track 2 is idle (4 tokens; re-derive `previous` with the
canonical command in that file's §D receipt — never carry a figure forward from a prior read):**
- **STOP-A-CHANNEL-THAT-EXISTS-IS-NOT-A-CHANNEL-THAT-IS-WIRED** — `fold_helpers` BUILT its gap
  findings (`cross_node_gap_candidate`) and both `assembly.py` call sites omitted `trace=`, so every
  finding went to `_noop_trace` and vanished. A repo-wide grep for `trace=`/`record_gap=` returned
  ZERO call sites. The code comment claimed the miss was "gap-tracked" — aspirational, not true.
  **Grep for the CALL SITES of an injectable callback, not just its definition.** (2026-07-23.)
- **STOP-READ-THE-RENDERER-THAT-ACTUALLY-RUNS** — `sgs/product-card` has TWO renderers; `render.php`
  emits `product-card-body` while `includes/product-card-builtin-render.php` emits
  `sgs-product-card__body`. Half a session was spent concluding "the block doesn't emit this" from
  the wrong file. **Confirm WHICH file produces the live markup (grep the live HTML string against
  every candidate) before reasoning about it.** (2026-07-23, Bean-caught.)
- **STOP-A-COINCIDENTAL-DEFAULT-LOOKS-LIKE-FIDELITY** — the Mama's product-card body renders 20px
  matching the draft's 20px, while transferring NOTHING (`innerPadding` absent; the block fallback
  supplies it). Guard 3 exists for exactly this and could not fire because `expected_default` was
  never sourced. **A value that matches the block's own default proves nothing about routing.**
  (2026-07-23.)
- **STOP-YOUR-FRAMING-BECOMES-THE-COUNCIL'S-BLIND-SPOT** — a `/qc-council` was asked to choose among
  3 pre-formed proposals and sized the fix at ~40 files. Both raters reasoned rigorously INSIDE that
  frame; neither asked "is there already a mechanism for this?" Bean did, and the box-object
  mechanism (FR-31-22, `borderWidth` on 8 blocks) made it ~2 functions. **Ask the council what you
  might be missing, not only to choose among your options.** (2026-07-23, Bean-caught.)

## Pre-flight ritual (answer before first Write/Edit)
1. On `main`? Next commit path-scoped away from Track 2 (`LEDGER.md`, `parking.md`, `decisions.md`,
   `STOP-CATALOGUE.md`, `.claude/next-session-prompt.md`, `site-*`, spec 36/37, `header-*`)?
2. Touching the converter? → Spec 31 read IN FULL, design-gated, `/qc-council` before commit.
3. About to accept a subagent claim? → re-derive it from the tool. Last session BOTH raters needed
   correcting (one cited "0 `<hr>`" when there are 8; one cited a stale spec saying 4 blocks vs 8).
4. After committing → does `git log -1` show MY message at HEAD + `git status` clean?
5. Banking a PASS? → would it still pass if the feature were absent?
6. Recording something as "absent / missing / excluded"? → ≥2 signals, including the declared
   semantic, not just the identifier name?
7. Diagnosing from a file? → is it the file that ACTUALLY runs (build vs src vs a second renderer)?

## Guardrails
- **Deploy: `build-deploy.py --target sandybrown` ONLY.** Never hand-roll tar/scp/`rm -rf` (D336).
  `md5sum` local↔server BEFORE measuring. Canary plugin was verified in sync 2026-07-23.
- Converter changes: `/qc-council` before commit; verify on the REAL draft + the live code path.
- DB authoritative — never hardcode a count (`/sgs-db`, `/wp-blocks`).
- Manual DB edits BANNED — dated migration + `/sgs-update` reseed (see
  `migrations/2026-07-23-remove-body-from-text-slot-aliases.py` for the pattern).
- Every deferral maps to a named spec STAGE, never "out of scope" (STOP-29).
- Time estimates default LOW; smallest first action < 5 min.
- Suites before AND after, from `plugins/sgs-blocks/scripts`:
  `python -m pytest converter/ ledger/ oracle/ -q` · `python ledger/coverage_check.py --check` ·
  `python ledger/coverage_check.py --report --with-landed` (the LANDED leg) ·
  `python converter/gates/no_slug_literal.py` · `python db-consistency/run.py`

## Open residuals (parked, not blockers)
- **`P-AREA-ROUTING-NAME-BUILD-IS-FUZZY`** — Task 1; the design doc holds the evidence.
- `P-CLONE-TEAM-MEMBER-ITEM-HEIGHT-DIVERGENCE` — the height guard is now `measured=False` for
  fixture-canary runs (non-comparable environments), so this needs a same-environment render to judge.
- `P-NAVMENU-UNDERLINEOFFSET-CSSPROP-MISSEED` — `underlineOffset` seeded `css_property='position'`.
  Same class as product-card's `css_element='box'` question.
- `P-POSTGRID-SCALEHOVER-OUT-OF-B3-SCOPE` — per-item + multi-property; hover scale still drops.
- `P-CONTAINER-CUSTOM-BAND-WIDTH-BROKEN` — an EDITOR control-state bug; needs a live Playwright repro.
- `P-INSPECTOR-CONTROL-TYPE-94-DISAGREEMENTS` — Task 2.
- **Per-side border transfer** — real gap, NOT built. Rides the existing box-object mechanism
  (`borderWidth` is a 4-side family on 8 blocks), so ~2 converter functions, not 40 render.php files.
  Needs Bean's design gate.
- **Doc drift found, not fixed:** `sgs-draft-vocabulary.md:142` maps the `separator` slot to the
  RETIRED `sgs/divider` (now `sgs/separator`); `Spec 32:153` says 4 blocks carry `borderWidth`, DB says 8.
