# Phantom STOP-N recovery harvest

Phantom list (45 numbers, confirmed by grep against the 9 defined numeric STOPs
16/19/21/44/57/64/66/67/68 in `.claude/STOP-CATALOGUE.md`):
2,3,4,6,8,9,10,11,13,14,15,17,18,22,23,24,25,26,27,28,29,30,31,34,35,37,38,39,40,
41,42,43,45,48,49,51,52,54,58,60,61,62,63,65,69

STOP-29 confirmed already recovered by the orchestrator (decisions.md:2415 — "bind
definition-of-done to the spec's FULL scope; map every deferral to a named §12
STAGE, never 'out of scope'"). Not re-derived here.

Timebox exhausted mid-way through the low-citation tail (13 numbers never reached
real defining prose in the time available — listed at the bottom, zero
fabrication). All git-history checks below are a single representative check, not
exhaustive per-file `-S` runs for every candidate path (time constraint).

---

### STOP-28
- Status: RECONSTRUCTED-FROM-GLOSS
- git history: cited densely in `decisions.md` (D243-D276 status blocks) and
  `specs/31-UNIVERSAL-CLONING-PIPELINE.md`; not checked with `git log -S` per-file
  (41 citations, no single origin commit worth isolating in the time available).
- Definition (catalogue-ready): **STOP-28-NEW-ENGINE-STAYS-OPT-IN-UNTIL-ITS-COMPLETION-GATES-CLOSE** — the modular/new converter engine (`SGS_NEW_ENGINE` flag) must remain opt-in with the frozen `convert.py` as the production default until every completion-programme gate (media-map A1, content-ledger A2, etc.) is proven closed; do not flip the prod default early.
- Source: `.claude/decisions.md:2368,2406,2407,2417`; `.claude/memory/handoff-archive-2026-07.md:237,283,330,427`; `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md:470` ("STOP-28 satisfied by construction" once the frozen tree was deleted D276).
- Note: superseded by construction as of D276 (frozen engine deleted) — historical defence, but the underlying principle ("don't flip a shared production default before its gates close") still generalises.

### STOP-43
- Status: DUPLICATE-OF-NAMED-SLUG
- git history: not checked per-file (dense citation across decisions.md + handoff-archive + plans).
- Definition: "prove the premise/diagnosis on the REAL rendered node before proposing or shipping a fix" — see verbatim gloss "Prove the premise on the real node (STOP-43) paid off AGAIN — the written diagnosis was wrong twice this session" (`memory/handoff-archive-2026-07.md:110`).
- Source: `.claude/memory/handoff-archive-2026-07.md:76,110,563`; `.claude/plans/2026-07-09-no-inline-styling-design-gate.md:152` (a narrower usage — "the STOP-43 consumed-partition keys off per-property names", i.e. also used loosely to mean "the thing STOP-43 governs", not a second definition).
- Duplicate target: **STOP-PROVE-CAUSE-BEFORE-FIX** (already in the catalogue) — same content: don't ship a fix without proving the cause/premise against real ground truth first.

### STOP-39
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-39-SOLO-CODING-SUBAGENT-ONLY** — dispatch mechanical build work to ONE coding subagent at a time, foreground, named files, "do the work yourself, spawn no agents"; NEVER 2+ concurrent writers on shared files; read-only reviewers/tracers/research agents may still run in parallel. Coding subagents "cascade-fail" on this pipeline when used in the banned 2+-writer shape — build INLINE instead.
- Source: verbatim origin — `.claude/plans/archive/2026-07-04-converter-completion-EXECUTION.md:16`: "mechanical steps dispatch to a SOLO Sonnet coding subagent (Bean-corrected STOP-39: ONE implementer at a time, foreground, named files, 'do the work yourself, spawn no agents'; NEVER 2+ concurrent writers; read-only reviewers/tracers may run parallel)." Reinforced `.claude/memory/handoff-archive-2026-07.md:263,550,602`; `.claude/plans/archive/2026-07-10-no-inline-parallel-rollout.md:43,105`.

### STOP-6
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-6-A-GATE-MUST-BE-WIRED-TO-SOMETHING-THAT-RUNS** — a gate that exists, is baselined, and is tested but is never invoked by any real trigger (pre-commit hook, CI, pipeline stage) protects nothing; prove every gate's failure path AND its run-trigger before claiming it's enforced.
- Source: verbatim — `.claude/plans/archive/2026-06-29-cc-session-grounding-fix-PROMPT.md:78`: "Prove every gate's failure path before claiming it's enforced (STOP-6: a gate that exists but isn't wired-to-something-that-runs protects nothing)." Also `.claude/hooks/f5-commit-gate.py:4,45`; `.claude/decisions.md:2515,2526,2543,2545`; `.claude/plans/archive/2026-06-23-modular-scaffold-design.md:183-184` (A5 amendment: "EVERY gate... names its RUN-TRIGGER... A gate with no run-trigger is deleted-or-wired, never 'ships'.").
- Note: this is a DIFFERENT (related) defence from STOP-A-GATE-THAT-CANNOT-FAIL-READS-GREEN-FOREVER already in the catalogue — that one is about a gate that can't ever fail; STOP-6 is about a gate that's never invoked at all. Keep as a distinct new entry, not a duplicate.

### STOP-15
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-15-A-COUNCIL-OR-RATER-FINDING-IS-A-HYPOTHESIS** — a multi-rater council or subagent finding is a hypothesis, not a fact; fact-check every load-bearing claim against ground truth (file:line, live DOM, DB) before acting on it, even when raters agree.
- Source: verbatim — `.claude/memory/handoff-archive-2026-07.md:309`: "Bean fact-checked the council hard — several council findings were wrong... STOP-15: a council finding is a hypothesis; verify before acting." Also `.claude/decisions.md:2474,2507`; `.claude/memory/handoff-archive-2026-07.md:601` ("Fact-check every rater/agent claim before acting (STOP-15 extended)"); `.claude/memory/reports-archive/2026-07-05-residuals-fact-first-investigation.md:3`; `.claude/plans/archive/2026-06-28-w3-walker-port-design.md:187`; `.claude/plans/archive/2026-06-28-w3-g1-g5-closure-map.md:152`.
- Note: related to but distinct from the already-catalogued STOP-A-REJECTION-RECORD-IS-A-HYPOTHESIS-TOO and STOP-A-SUBAGENT-ABSENCE-CLAIM-IS-A-HYPOTHESIS — those are narrower (a specific claim shape); STOP-15 is the general "council/rater finding" case. Not a duplicate, keep separate.

### STOP-24
- Status: RECONSTRUCTED-FROM-GLOSS (two related but distinct usages found, both real)
- git history: not checked per-file.
- Definition (catalogue-ready, covers both usages): **STOP-24-CO-ACTIVE-SHARED-PREBUILD-MAY-BE-RED** — (a) on a shared worktree, the prebuild gate may read RED because of a co-active parallel track's unrelated in-flight change (e.g. a DB↔block.json reseed mismatch) — build via `npx wp-scripts build --experimental-modules --webpack-copy-php` directly rather than the shared prebuild, and never "fix" the other track's red state yourself; (b) any new DB-vocabulary addition (e.g. `slots.aliases`) must be wired into the canonical `/sgs-update` reseed path, not just a one-off seeder script, or it will not survive the next reseed.
- Source: `.claude/decisions.md:1194`; `.claude/memory/archived-2026-07-28-next-session-prompt-drawer-track.md:20-21`; `.claude/memory/next-session-prompt-2026-07-28-superseded.md:16-17`; `.claude/memory/decisions-archive.md:925`; `.claude/memory/handoff-archive-2026-07.md:288,293`; `.claude/plans/2026-07-09-no-inline-styling-design-gate.md:133` (a "STOP-24-compliant" DB-change channel — same underlying "route DB changes through the sanctioned reseed-durable channel" idea as usage (b)).

### STOP-52
- Status: RECONSTRUCTED-FROM-GLOSS
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-52-D2-DOCTRINE-NO-SILENT-CSS-DROP** — an unroutable CSS declaration (e.g. `::before`/`::after` pseudo-element rules) must route to a client-editable residual channel (`sgsCustomCss`) or be recorded in `excluded_properties` — never silently dropped. Named "Bean STOP-52 D2 doctrine" at the close of the D279 diagnosis-first fix wave.
- Source: `.claude/decisions.md:2279` ("Bean STOP-52 D2 doctrine set"); `.claude/plans/archive/2026-07-22-spec31-completion-to-100.md:113-114` ("route to the built sgsCustomCss residual channel (client-editable, STOP-52-compliant) OR excluded_properties. No silent drop.").

### STOP-27
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-27-NEW-GUARDS-RAISE-NOT-ASSERT** — every new invariant guard re-homed from a deleted case-fork (or written fresh) in the converter must `raise` on violation, never `assert` (asserts are stripped under `-O` / silently skipped, and are the wrong signal for a data-integrity violation the pipeline must fail loudly on).
- Source: `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md:610`: "every guard re-homed from the deleted case-fork is a `raise`, never `assert` (STOP-27)." Also `.claude/plans/archive/2026-06-29-universal-interior-walker-build.md:78`; `.claude/plans/archive/2026-06-28-w3-g1-g5-closure-map.md:153`.

### STOP-23
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-23-QC-COUNCIL-ON-BUILT-CODE-NOT-DESIGN** — run pre-commit `/qc-council` on the code as actually BUILT (verifying e.g. input-class≠output-class, that render.php actually reads the attr that was written), not merely on the design/plan — a design-time review does not catch build-time drift.
- Source: `.claude/reports/2026-07-01-build-design-layer-extraction-slice.md:34`: "`/qc-council` on the BUILT code (STOP-23: input-class≠output-class; render reads the attr written)." Also `.claude/memory/handoff-archive-2026-07.md:399,416`; `.claude/plans/archive/2026-06-28-w3-walker-port-design.md:40`; `.claude/plans/archive/2026-06-29-universal-interior-walker-build.md:77`; `.claude/plans/archive/2026-06-28-w3-g1-g5-closure-map.md:152`.

### STOP-22
- Status: RECONSTRUCTED-FROM-GLOSS
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-22-PORT-WORKING-LOGIC-DO-NOT-RECREATE-IT** — when moving working converter logic into a new module/engine, re-house the existing, already-proven logic faithfully; do not rebuild it from scratch against the new structure (a recreation drops edge cases the working version already handles).
- Source: `.claude/decisions.md:2400` ("G1–G5 disposition verified against the WORKING `_route_composite_interior` walker (STOP-22 read-to-port)"); `.claude/plans/archive/2026-06-28-w3-walker-port-design.md:54`: "Why (STOP-25 / STOP-22 carve-out): The rules require *re-housing the working logic*, never *recreating it*."

### STOP-3
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-3-LEDGER-INPUT-IS-DRAFT-DERIVED** — a conservation/accounting ledger's input must be derived from the DRAFT (source of truth), never from the converter's own output/DB-derived shorthand decomposition — sourcing a ledger from the same system it's meant to check makes the check circular.
- Source: `.claude/plans/archive/2026-06-18-f2-css-accounting-ledger-design.md:12` ("STOP-3 (ledger input is DRAFT-derived not converter-derived)"), `:104` ("duplicating it violates R-22-1, and sourcing from it violates STOP-3"); `.claude/plans/archive/2026-06-23-modular-scaffold-design.md:188` (a second, narrower usage: "A9 ... Rule 4/STOP-3ᐩ ... 'UNROUTED fails' must be a tested failure-path, not a prose promise" — likely the same "don't fake it, ground in the real source/test" spirit, treated here as the same defence).

### STOP-60
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-60-RENDER-SIDE-RELOCATION-NEEDS-NO-CONFORMANCE-GOLDEN-MOVE** — when a change only relocates WHERE already-generated CSS is emitted (render-side collector/relocation) without touching the converter/walker/pipeline or changing what CSS is generated, no conformance golden fixture needs to move and no block version bump is required.
- Source: `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md:257`: "Not a converter/walker/pipeline change → no conformance golden moves (render-side only, STOP-60); no block version bump."

### STOP-14
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-14-BASELINE-GATES-AGAINST-CURRENT-LEGACY-OUTPUT** — a new gate must be baseline-armed against the system's CURRENT (legacy) output before it can meaningfully flag regressions — arming a gate against an idealised or future output makes every existing case a false positive.
- Source: `.claude/decisions.md:2526`: "All gates exist, are baseline-armed against current legacy output (STOP-14), and are WIRED to something that runs (STOP-6)."

### STOP-11
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-11-SCHEMA-ENUMERATION-NOT-USAGE-ENUMERATION** — "missing X" claims (e.g. "~15 properties have no DB destination") must be measured against the LIVE DB schema at run time, never a stale doc's cached list — a doc's enumeration is a usage/example snapshot, not the schema's ground truth.
- Source: `.claude/plans/archive/2026-06-18-f2-css-accounting-ledger-design.md:12` ("STOP-11 (schema enumeration ≠ usage enumeration)"), `:110,135`: "STALE-PREMISE CORRECTED (STOP-11): the doc/expected.md '~15 no-suffix-row properties' list is partly out of date... F2's baseline is measured against the LIVE DB, never the doc."
- Note: this is the project-specific instance of the global CLAUDE.md rule "R-31-8 / schema enumeration before 'missing X'" — related but the STOP entry is worth keeping as the operational trigger phrase.

### STOP-49
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-49-COMPUTED-PARITY-OVER-COUNTS** — the computed-parity aggregate percentage over-counts false mismatches (font-family stacks, clone-only props not present in the draft, etc.) and legitimately reads BELOW true visible fidelity; never quote it alone as the fidelity number — always pair with Bean's eye / a human-dispositioned ledger.
- Source: `.claude/goals.md:25`: "it over-counts (font-family stacks, clone-only props — STOP-49)"; `.claude/plans/2026-07-09-no-inline-styling-design-gate.md:59` ("NOT the aggregate parity % (over-counts, STOP-49)"); `.claude/specs/20-CLONE-FIDELITY-MEASUREMENT.md:134` ("the STOP-48/49 over-count is broader than font-family").

### STOP-48
- Status: DUPLICATE-OF-NAMED-SLUG (near-duplicate of STOP-49, same over-count defence, no distinct definition found)
- git history: not checked per-file.
- Definition: no separate defining prose found beyond the paired citation "STOP-48/49 over-count" (`specs/20-CLONE-FIDELITY-MEASUREMENT.md:134`).
- Source: `.claude/specs/20-CLONE-FIDELITY-MEASUREMENT.md:134`.
- Duplicate target: treat as the same defence as the new STOP-49 entry above (both cite the same "over-count" phenomenon together) — recommend folding STOP-48 into STOP-49's catalogue entry rather than writing two near-identical rows, OR flag to Bean as ambiguous (two numbers, one phenomenon, no evidence they're actually different).

### STOP-42
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-42-COMPUTED-CSS-DIFF-KEYED-BY-CONTENT-NOT-CLASS** — clone-fidelity measurement must compare getComputedStyle values on the LIVE clone vs the SOURCE draft, matched by normalised TEXT CONTENT (not BEM class or source-declaration diff) — this is CLAUDE.md root-cause rule 4a's project-level name.
- Source: `.claude/memory/archived-2026-07-28-cloning-pipeline-stages.md:621`: "(computed) CSS values on the LIVE clone vs the SOURCE draft, matched by CONTENT (not class/declaration) — CLAUDE.md rule 4a / STOP-42."; `.claude/specs/20-CLONE-FIDELITY-MEASUREMENT.md:18,76`; `.claude/memory/handoff-archive-2026-07.md:174` ("Prove the premise on the real node (STOP-42 extension)").
- Note: this is effectively the STOP-catalogue-worthy name for the CLAUDE.md rule-4a mechanism already described in the root project CLAUDE.md — likely intentional duplication across two doc types (spec-level rule vs STOP catalogue), not a bug.

### STOP-4
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-4-WRITTEN-NOT-LANDED** — an attribute the converter WRITES/emits is a progress signal only, never proof of fidelity; only a live computed-style read on the rendered page (LANDED) that matches the draft counts as done. Catches wrong-layer transfer that an emit-only check misses.
- Source: `.claude/decisions.md:3211`: "proves a CSS value the converter WROTE actually LANDED on the rendered SGS block (catches WRITTEN-not-LANDED / wrong-layer transfer in the oracle, not Bean's eye — STOP-4)"; `.claude/plans/2026-07-09-no-inline-styling-design-gate.md:50` ("Every check = live-DOM/computed-style, never emit/markup (STOP-4/21/44)"); `.claude/plans/archive/2026-06-18-f3-render-oracle-design.md:13` ("STOP-4 (WRITTEN≠LANDED)").
- Note: STOP-4 and STOP-44 (already catalogued, presumably "emit ≠ LANDED") look like the same defence under two numbers — `.claude/plans/archive/2026-07-10-no-inline-parallel-rollout.md:104` cites both close together: "emit ≠ LANDED (STOP-44); prove the premise on the real node (STOP-43)". Recommend checking STOP-44's current catalogue wording against this reconstruction — likely near-duplicates; flagging rather than silently merging.

### STOP-34
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-34-REPRODUCE-ON-THE-REAL-NODE-NOT-A-SYNTHETIC-ONE** — root-cause a converter bug against the REAL draft/page node, not a synthetic/handwritten test fixture — a synthetic test can mask the actual failure path (e.g. a synthetic multi-button test used a named-root-class path that a real full-homepage run didn't).
- Source: `.claude/decisions.md:2073`: "Root cause proven on the REAL node (STOP-34)"; `.claude/memory/handoff-archive-2026-07.md:464`: "Now derives from the DB. **Found by the FULL-HOMEPAGE run** — a synthetic multi-button test used the named-root-class path and masked it (STOP-34)."

### STOP-25
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-25-ONE-LEDGER-NEVER-A-PARALLEL-TRACKER** — a new tracking need (e.g. content-conservation) extends the ONE existing ledger mechanism; never spin up a second parallel tracker/ledger for the same concern.
- Source: `.claude/plans/archive/2026-07-04-converter-completion-EXECUTION.md:102`: "capture CONTENT routing units so a dropped content node is UNACCOUNTED — the ONE ledger, never a parallel tracker (STOP-25; §12.2.1)."; also co-cited with STOP-22 in `.claude/plans/archive/2026-06-28-w3-walker-port-design.md:54` (title "STOP-25 / STOP-22 carve-out") — that second citation's body text describes the STOP-22 content (re-house not recreate), so STOP-25's own definition is drawn from the EXECUTION.md instance, which is the clearer one.

### STOP-18
- Status: RECONSTRUCTED-FROM-GLOSS
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-18-DISPOSITION-EVERY-ITEM-AS-DONE-BY-PORT-OR-CLOSE-OR-DEFER-WITH-BLOCKER** — when auditing a checklist of legacy items being ported/rebuilt (e.g. the G1-G5 disposition), every item must be explicitly classified as DONE-BY-PORT / CLOSE-IN-<phase> / DEFER-with-a-named-blocker — no silent "not mentioned" gaps.
- Source: `.claude/plans/archive/2026-06-30-phase-W3-interior-walker-css-content-unification.md:146`: "as DONE-BY-PORT / CLOSE-IN-W3 / DEFER-with-blocker (STOP-18)."

### STOP-10
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-10-EMPTY-SECTION-FALSE-WIN** — an empty cloned section is usually a soft-fail, not a pass; a render-oracle match must require BOTH the guard (e.g. `el.innerText.length > 0` and element present) AND the value comparison — a guard failure is always a FAIL, never counted as a match. Same phenomenon as the already-catalogued memory `empty-section-false-pixel-diff-win`.
- Source: `.claude/plans/archive/2026-06-18-f3-render-oracle-design.md:13,38`: "A match counts only after ALL pass; a guard failure is a FAIL, never a match (STOP-10)"; `.claude/plans/archive/2026-06-23-stage2-recognition-design.md:151`: "STOP-10 empty cloned section = usually a cv2 soft-fail — read extract.json status first."
- Note: near-duplicate of the CLAUDE.md-level "empty-section-false-pixel-diff-win" memory already referenced elsewhere in this project's docs (not itself a STOP-catalogue slug, but the same underlying lesson) — recommend cross-linking rather than treating as wholly new.

### STOP-41
- Status: RECONSTRUCTED-FROM-GLOSS
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-41-NO-SLUG-LITERAL-GATE-COVERS-SHARED-EXTRACTORS-TOO** — the `no_slug_literal` gate (R-31-1 DB-first enforcement) must also cover per-slot/per-role literal carve-outs moved into shared/un-gated helper files (e.g. `field_extractors`), not just the originally-scanned files — a carve-out relocated to an ungated file silently escapes the gate.
- Source: `.claude/memory/handoff-archive-2026-07.md:277`: "F5 `no_slug_literal` gate caught 3 per-slot/role literal carve-outs (`slot=='icon'`, `slot=='link'`, `role=='identity'`, `role in tuple`) — all refactored to DB-derived or moved to the un-gated shared `field_extractors` (→ STOP-41)."

### STOP-2
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-2-ONE-ORCHESTRATOR-FOR-ALL-SHARED-FILE-WRITES** — when using `/subagent-driven-development` with multiple implementer subagents, one main-session orchestrator owns ALL writes to shared files; subagents implement their OWN assigned files only and RETURN data rather than touching the shared tree directly.
- Source: `.claude/plans/archive/2026-06-23-modular-scaffold-design.md:167`: "Opus orchestrates all shared-file writes (STOP-2)"; `.claude/plans/archive/2026-06-28-w3-walker-port-design.md:189`: "subagents implement assigned files only, RETURN data, never touch the shared tree (STOP-2)."
- Note: this is the shared-file-write-conflict-avoidance sibling of STOP-39 (solo coding subagent) — related but distinct: STOP-39 is about not running 2+ writers; STOP-2 is about who owns the shared-file merge when using multi-agent dispatch at all. Keep as separate entries.

### STOP-9
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-9-VARIANT-GRIDS-ARE-DB-DEFINED** — a composite block's variant grid/structure is defined in the `variant_slots` DB table (queried via frozen `detect_variant`), never hardcoded as an `if slug==...` branch in converter code.
- Source: `.claude/plans/archive/2026-06-23-stage2-recognition-design.md:150`: "STOP-9 variant grids are DB-defined — §2 reuses frozen detect_variant on variant_slots, never an `if slug==`."
- Note: this is the STOP-catalogue name for the CLAUDE.md rule already described under "When a composite VARIANT's grid/structure looks ambiguous, STOP — query the DB" / memory `feedback_ground_in_variant_db_for_variant_block_setups` — likely intentional cross-reference, not a fresh defence.

### STOP-35
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-35-DEFAULT-IS-CONTAINER-DEVIATION** — the new engine's recognition step must default an unrecognised (slug-None) section to `sgs/container` + recurse (FR-31-4), never fail loud — failing loud on the default case blocks the majority of real homepage sections from converting at all.
- Source: `.claude/memory/handoff-archive-2026-07.md:466`: "Found the DEFAULT-IS-CONTAINER deviation (STOP-35): the new engine's recognition 4th branch FAILS LOUD for a slug-None section instead of defaulting to `sgs/container`+recurse (FR-31-4)"; `:478` (repeated, "the #1 remaining engine fix").

### STOP-31
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-31-WIDEN-AND-PLANT-TEST-A-NARROWED-GATE** — when widening a gate's scanned-file scope (e.g. `no_slug_literal.py` `_SCAN_FILES`) to cover new modules, the widening itself must be plant-tested (plant a violation, confirm the gate now fires) — not just assumed to work because the file list grew.
- Source: `.claude/plans/archive/2026-07-04-converter-completion-EXECUTION.md:64`: "Gates: widen `no_slug_literal.py` `_SCAN_FILES` to `dispatch_table.py` + `orchestrator.py` + `walk.py`... + plant-test the widening (STOP-31)."; `.claude/memory/parking-archive.md:2020`: "Fix = route via accessors + a small raw-sqlite3 gate check (plant-tested per STOP-31)."

### STOP-17
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-17-KEY-BY-FULL-IDENTITY-NOT-A-TIER-BLIND-JOIN** — a resolver/gap-baseline lookup must key on the FULL identity tuple (e.g. `(block, layer, property)` or `(block, attr/slot, fixture)`), never a narrower join (e.g. `(css_property, writer_path)` alone, or by source line) — a narrow key collides across tiers/fixtures and produces false matches or false gate-fires.
- Source: `.claude/plans/archive/2026-06-23-modular-scaffold-design.md:122`: "keyed on the full (block, layer, property) identity, NOT `(css_property, writer_path)` alone (cheat SHOULD-FIX, avoids the STOP-17 tier-blind join)"; `.claude/plans/archive/2026-06-26-stage3-child-shape-fork-design.md:165`: "capture today's `ContentGap` set as `content-gap-baseline.json` (key by `(block, attr/slot, fixture)` identity, not line — STOP-17)."

### STOP-40
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-40-VERIFY-AGAINST-THE-DRAFTS-ACTUAL-LAYOUT-NOT-A-GLANCE** — don't declare a converted section "fixed" just because it now renders as *a* grid with the right item count; check it against the DRAFT's ACTUAL desktop layout (e.g. a 2×2 grid is not "fixed" if the draft wants 4-in-a-row) — a superficial visual glance can pass a wrong layout.
- Source: verbatim origin, `.claude/decisions.md:2357`: "New STOP: STOP-40 — don't declare a section 'fixed' from seeing a grid + N items; check against the DRAFT's ACTUAL desktop layout."

### STOP-30
- Status: VERBATIM
- git history: not checked per-file.
- Definition (catalogue-ready): **STOP-30-REVERIFY-EVERY-LOAD-BEARING-CLAIM-AT-FILE-LINE-AND-DB** — when fact-checking a prior session's "confident-but-unverified" claims (e.g. "covers N routes"), re-verify EVERY load-bearing claim yourself at file:line + DB — do not accept a prior summary's numbers, even if plausible-sounding.
- Source: `.claude/memory/decisions-archive.md:956`: "Every load-bearing claim re-verified by me at file:line + DB (STOP-30); two cross-model cheat/route subagents corroborated."

### STOP-29 (confirmation only — already recovered, not re-derived)
- Confirmed present and NOT to be re-derived per orchestrator instruction.
- Definition already banked: "never 'out of scope' on a spec'd surface; map every deferral to a named spec stage." Matches `.claude/decisions.md:2415` and `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md:38`.

---

## UNRESOLVED — not reached in the timebox (zero fabrication)

The following phantom numbers were in-scope but not reached with real defining
prose before the 30-minute timebox closed: **STOP-8, STOP-13, STOP-26 (own
definition — only "extends STOP-26" glosses were found, pointing at a scope/
carve-out discipline, but the actual STOP-26 text itself was not located),
STOP-37, STOP-38, STOP-45, STOP-51, STOP-54, STOP-58, STOP-61, STOP-62, STOP-63,
STOP-65, STOP-69 (context seen only as "the STOP-69 `*/`-in-JS-comment trap" —
a real gloss exists but wasn't independently confirmed/expanded before time ran
out)**.

Recommended next step: re-run targeted `grep -rn "STOP-N\b" .claude/ -C3` for each
of the above individually (no batching) — several (STOP-26, STOP-69) clearly have
real definitions sitting one hop away (their citing sentences were visible but
got cut off by the batched grep's line-omission truncation in this pass).
