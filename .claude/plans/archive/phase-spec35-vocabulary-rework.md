---
doc_type: plan
spec_id: 35
title: Phase — Spec 35 cluster + element vocabulary rework
date: 2026-07-20
status: READY TO EXECUTE
design: .claude/plans/2026-07-20-spec-35-cluster-vocabulary-rework-design.md
---

# Phase — Spec 35 cluster + element vocabulary rework

**USP:** Makes the conformance score mean something. Right now a composite is
penalised for exposing capability the vocabulary can't name, so the number can't be
trusted — and an untrustworthy score is worse than no score. After this phase the
section/layout rollout (hero, feature-grid, post-grid, gallery) unblocks.

**Plan label:** `[PLAN: sonnet]` — design is settled, work is implementation-shaped.
**Aggregate estimate:** ~35 min across 6 steps + 2 QA gates. Mostly delegated.

## Key finding that shaped this plan

`check-element-manifest-conformance.js` is **fully data-driven** — it iterates
`clusterSets.order` and `clusterSets.clusters[key]` with no hardcoded cluster names
(line 140, with an explicit comment that inventing clusters is not its job).

**Therefore FR-35-2 — the largest-sounding requirement — is a pure data edit with zero
linter code change.** This is why the phase is 35 minutes and not a day.

## Phase success criteria (done when)

- [ ] `cluster-member-sets.json` has 6 clusters; every `css:*` registry row maps to
      exactly one member, or is reclassified off the `css:` axis
- [ ] `node check-element-manifest-conformance.js` runs clean and re-scores all 8
      manifested blocks against the new vocabulary
- [ ] A registry validator fails when any `css:*` row is unclustered (FR-35-3)
- [ ] The linter reports ORPHAN attributes — `sgs/button`'s `iconColour` appears (FR-35-4)
- [ ] `container` + `cta-section` manifests declare canonical `layer` values (FR-35-1)
- [ ] All prebuild gates still pass; nothing deployed (no runtime change in this phase)

## Entry context (read before starting)

- `.claude/plans/2026-07-20-spec-35-cluster-vocabulary-rework-design.md` — the approved
  design; FR-35-1..4 are specified there and are NOT to be re-litigated
- `plugins/sgs-blocks/scripts/consistency/cluster-member-sets.json` — the file Step 1 edits
- `plugins/sgs-blocks/scripts/check-element-manifest-conformance.js` — read the header
  comment block; it is the resolution contract
- `plugins/sgs-blocks/scripts/consistency/setting-registry.json` — the 82-row golden master

## Deliberate omissions (lean, not incomplete)

- **No Hidden Decisions peer-review pass.** Two cold reviewers on a 6-step plan whose
  design was adjudicated question-by-question this session is structural theatre. The
  ambiguity this pass exists to catch was already removed at design time.
- **No deploy.** Nothing in this phase changes runtime output — it edits linter data and
  linter code. Deploy is not applicable, so no canary step exists.
- **No block version bumps, no deprecations** (D293 / pre-production rule).

---

## Step 1 — Rewrite cluster-member-sets.json to 6 clusters

  Model:       haiku
  Action:      Rewrite `cluster-member-sets.json` per design FR-35-2: add `flow` (12),
               `position` (3), `motion` (2); add `font-family` to `text`; add the 6
               background/object members to `fill`; add `aspect-ratio` to `layout`.
               Update `order` to `["text","fill","layout","flow","position","motion"]`.
  Files:       plugins/sgs-blocks/scripts/consistency/cluster-member-sets.json
  Inputs:      Design doc FR-35-2 (member lists + suffixes are specified verbatim there)
  Outcome:     File parses; `order` has 6 entries; every member key is a real `css:*`
               setting_key present in setting-registry.json
  Exec:        SEQUENTIAL
  Marker:      SESSION-START
  Time:        8 min
  Tooling:     Read/Edit
  On-Fail:     `git checkout -- cluster-member-sets.json`
  Cold-Entry:  The design doc + the existing cluster-member-sets.json
  Test:
    Happy:       `python -c "import json;d=json.load(open(...));print(len(d['clusters']))"` → 6
    Edge:        Every member `key` exists in setting-registry.json rows → no typos
    Fail:        Malformed JSON → parse error surfaces immediately, revert
    Integration: `node check-element-manifest-conformance.js` still runs (data-driven, so
                 it should pick up all 6 clusters with no code change — this is the
                 load-bearing assumption of the whole phase; if it fails here, STOP)

## Step 2 — Reclassify the 2 mis-keyed registry rows

  Model:       haiku
  Action:      In `setting-registry.json`: re-key `css:stroke` off the css axis to a
               behaviour/decoration family (sgs/counter `accentStroke` — a toggle, not a
               paint). Fold `css:percentage` into `css:max-width` and delete the generic
               row (it is sgs/decorative-image `maxWidthPercent`, a max-width in %).
  Files:       plugins/sgs-blocks/scripts/consistency/setting-registry.json
  Inputs:      Design doc FR-35-2 "Reclassifications"
  Outcome:     Neither `css:stroke` nor `css:percentage` remains as a `css:*` row
  Exec:        PARALLEL with Step 1 (different file, no shared state)
  Time:        4 min
  Tooling:     Read/Edit
  On-Fail:     `git checkout -- setting-registry.json`
  Test:
    Happy:       Neither key returns from a `css:*` filter over rows
    Edge:        Row count drops by exactly 2 css rows; total rows accounted for
    Fail:        A downstream script keys on `css:stroke` → grep first; if any consumer
                 exists, update it in the same commit
    Integration: `python scripts/db-consistency/run.py --check` still passes

## QA Gate — vocabulary is complete and consistent

  Model:   haiku
  Exec:    SEQUENTIAL
  Deps:    Steps 1–2 complete
  Check:   Script asserting every `css:*` row in setting-registry.json appears in exactly
           one cluster member in cluster-member-sets.json; prints any unclustered key.
  Pass:    Zero unclustered keys printed; exit 0
  Fail:    Print the offending keys and return to Step 1 to place them
  Marker:  QA

## Step 3 — Promote that check into the FR-35-3 validator

  Model:       haiku
  Action:      Turn the QA-gate check into a permanent script
               `scripts/consistency/check-cluster-coverage.py` that exits non-zero on any
               unclustered `css:*` row. This is FR-35-3 — unclustered becomes an error.
  Files:       plugins/sgs-blocks/scripts/consistency/check-cluster-coverage.py (new)
  Inputs:      The QA-gate check logic
  Outcome:     Script exits 0 now; exits 1 if a css row is added without a cluster
  Exec:        SEQUENTIAL
  Deps:        QA gate passed
  Time:        5 min
  Tooling:     Write, python
  On-Fail:     Delete the new file
  Test:
    Happy:       Run → exit 0, "all N css rows clustered"
    Edge:        Temporarily add a fake unclustered row → exit 1 naming it → remove
    Fail:        Missing/corrupt input file → clear error, non-zero exit, no traceback dump
    Integration: Runs standalone; wiring into prebuild is deliberately deferred (see
                 Step 6 note — linters stay WARN-only until Spec 35 close)

## Step 4 — FR-35-4 orphan-attribute detection

  Model:       sonnet
  Action:      Extend `check-element-manifest-conformance.js`: after resolving declared
               members, scan the block's attributes for any matching a declared element's
               `prefix` that no declared member claims, and emit it as an ORPHAN finding
               (new status alongside ok/gap). WARN-only; still always exits 0.
  Files:       plugins/sgs-blocks/scripts/check-element-manifest-conformance.js
  Inputs:      Design doc FR-35-4
  Outcome:     `sgs/button`'s `iconColour` is reported as an ORPHAN
  Exec:        SEQUENTIAL
  Deps:        Step 1 (needs the 6-cluster vocabulary to avoid false orphans)
  Time:        10 min
  Tooling:     Read/Edit, node
  On-Fail:     `git checkout --` the script; orphan detection is additive and can ship later
  Test:
    Happy:       Run → button reports ORPHAN iconColour
    Edge:        A block with NO manifest is still skipped, not flagged as all-orphan
    Fail:        An element with no `prefix` must not crash — skip orphan scan for it
    Integration: `--json` output still parses; existing ok/gap findings unchanged in shape

## Step 5 — Add `layer` to the 2 composite manifests + advisory check

  Model:       sonnet
  Action:      Add `layer` (OUTER/CONTENT/GRID/GRID_AREA) to the `container` and
               `cta-section` element manifests per FR-35-1. Add the advisory linter check
               that WARNS when a `container_kind` block's structural element uses a
               non-canonical name. No converter change.
  Files:       src/blocks/container/block.json, src/blocks/cta-section/block.json,
               scripts/check-element-manifest-conformance.js
  Inputs:      Design doc FR-35-1; `layer_detect.py` for the canonical four values
  Outcome:     Both manifests declare layers; linter warns on non-canonical structural names
  Exec:        SEQUENTIAL
  Deps:        Step 4 (same script file — avoid a merge conflict)
  Time:        6 min
  Tooling:     Read/Edit, node
  On-Fail:     Revert the three files; FR-35-1 is independent of FR-35-2/3/4
  Test:
    Happy:       Linter runs clean; both blocks show their layers
    Edge:        A block with NO layer field must not warn (layer is optional)
    Fail:        An invalid layer value (e.g. "MIDDLE") → warns, does not crash
    Integration: WP still registers both blocks — `layer` is a custom key inside
                 supports.sgs, proven tolerated live on 2026-07-20

## QA Gate — full re-score + no regressions

  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Steps 1–5 complete
  Check:   `npm run build` (all prebuild gates) AND
           `node scripts/check-element-manifest-conformance.js --json`
  Pass:    Build exits 0 with no NET-NEW violations; all 8 blocks re-score; container and
           cta-section resolve their previously-unnameable grid members; button reports
           ORPHAN iconColour
  Fail:    Identify which step regressed; revert that step only
  Marker:  QA

## Step 6 — Commit + record

  Model:       inline
  Action:      Commit path-scoped. Append the D-number for the vocabulary rework to
               `.claude/decisions.md`. Note in the design doc that the phase shipped.
  Files:       .claude/decisions.md, the design doc
  Inputs:      QA gate output (the before/after score table)
  Outcome:     Committed and pushed on `main`; decisions.md records the change
  Exec:        SEQUENTIAL
  Marker:      HANDOFF
  Time:        4 min
  Tooling:     git
  On-Fail:     n/a — commit is the terminal action
  Test:
    Happy:       `git log --oneline -1` shows the commit; `git status` clean for these paths
    Edge:        Verify branch in the SAME command as the commit (shared-repo rule)
    Fail:        Wrong branch → stash, switch, pop
    Integration: `git branch -r --contains HEAD` confirms it reached origin/main

  NOTE: wiring `check-cluster-coverage.py` into prebuild is deliberately NOT in this
  phase. Spec 35 linters stay WARN-only until spec close; promotion is a later step.

---

## Key Judgement Calls

- **Decision:** Does `check-cluster-coverage.py` (FR-35-3) go into prebuild now?
  - **Options:** [A] standalone script only / [B] wire into prebuild WARN-only /
    [C] wire in as a hard gate
  - **Recommendation:** [A] for this phase
  - **Why:** Spec 35's linters are all WARN-only until spec close. Wiring a HARD gate now
    would fail the build the moment anyone adds a css row, before the roster is migrated.
  - **Cost of wrong choice:** Low and reversible — wiring it in later is a one-line change.
  - **Who decides:** Bean (already leaning A per the WARN-only posture)

- **Decision:** What happens to the 8 existing manifests when scores move?
  - **Options:** [A] accept the new numbers as the honest baseline / [B] adjust manifests
    to preserve the old scores
  - **Recommendation:** [A]
  - **Why:** The old denominators were wrong. `brand-strip`'s caption drops 9/9 → 9/10
    when `font-family` joins `text` — that is the score becoming correct, not a regression.
  - **Cost of wrong choice:** [B] would re-introduce exactly the dishonest-score problem
    this phase exists to fix.
  - **Who decides:** Bean

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Linter is not as data-driven as it looks and 6 clusters break it | Low | High | Step 1's Integration test catches it immediately; STOP instruction is explicit |
| A downstream consumer keys on `css:stroke` | Low | Medium | Step 2 greps for consumers before deleting |
| Orphan detection produces a flood of false positives | Medium | Low | WARN-only; if noisy, tune the prefix match before promoting |
| Track 2 / Track C touch the same files concurrently | Low | Medium | Path-scoped commits; re-check branch in the same command |
