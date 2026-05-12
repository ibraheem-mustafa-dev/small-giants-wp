---
doc_type: phase-plan
phase_id: 1
project: small-giants-wp
parent_spec: .claude/specs/14-CLONING-PIPELINE-CATALOGUE.md
title: Phase 1 — Doc Reconciliation + Static-Block Snapshots + FR18 Decisions
plan_label: PLAN sonnet
docscore: B+ (self-assessed; section 7)
session_date: 2026-05-11
authors: Bean + Claude (Opus 4.7)
estimated_minutes: 45
estimated_cost_usd: ~0.20 (mostly Haiku + 2 Sonnet steps + inline)
---

# Phase 1 — Doc Reconciliation + Static-Block Snapshots + FR18 Decisions

**USP:** Truthful base for every subsequent phase. Without this, P2-P10 build on top of ghost claims (4-layer catalogue / 4 missing scripts) and the snapshot capture must happen BEFORE any FR12 mutation otherwise existing posts break on the first attribute auto-application.

**Plan label:** `[PLAN: sonnet]` — implementation-heavy, settled design, no architectural judgement needed mid-execution.

**Docscore:** B+ (self-graded; full plan structure with all required fields, two QA gates, KJCs surfaced).

**Aggregate cost estimate:** ~0.20 USD across 11 steps (9 Haiku-shaped, 1 Sonnet, 1 inline). ~150K tokens total.

## Phase success criteria (done when)

- [ ] `grep -nE "fingerprint-builder/output|heuristic-fallback-builder|computed-style-passport|recursion-guard|shipped 2026-05-08"` returns ZERO matches in `.claude/architecture.md`, `.claude/state.md`, `~/.claude/skills/sgs-clone/SKILL.md`
- [ ] `tests/golden/static-block-snapshots/` exists with 9 JSON files (one per static block), each containing the block's pre-mutation `attributes` schema + compiled `save()` output verbatim
- [ ] `.claude/decisions.md` carries a new section documenting FR18 per-script decisions (build / retire / merge) for `heuristic-fallback-builder.py`, `computed-style-passport.py`, `recursion-guard.py`, `critical-fix-verification.py`
- [ ] `.claude/state.md` `current_phase` advances to `phase-2-schema-migrations`
- [ ] Commit on `main` titled `feat(p1): doc reconciliation + static-block snapshots + FR18 decisions`

## Entry context (read before starting)

- `.claude/specs/14-CLONING-PIPELINE-CATALOGUE.md` Section 2.5 (Build status inventory) + FR17 + FR18 + FR12 deprecation-template-content
- `.claude/cloning-pipeline-flow.md` (one-page flow chart — 60-sec orientation)
- `.claude/architecture.md` L151 (the line being reconciled)
- `.claude/state.md` L52 (the line being reconciled)
- `~/.claude/skills/sgs-clone/SKILL.md` (multiple sections being reconciled — pre-flight check L117, tool bindings L255-260, etc.)
- `tools/recogniser/data/fingerprints.json` (source-of-truth for static-vs-dynamic block_type field per block)

## References

- Spec 14 v2.1 (parent doc) — every FR cited here lives there
- Spec 13 (SGS-BEM convention) — referenced for FR17 reconciliation
- blub.db row 221 (no-agent-fallback) — informs the Bean-confirms-not-agent-confirms acceptance pattern
- Round-2 QC findings (in conversation history) — informed FR12 deprecation template content

## Tooling Index

| Type | Name | Used in |
|---|---|---|
| skill | /diagnostics | Step 11 QA |
| skill | /lint | Step 11 QA |
| cli | grep / git | Step 1, 9, 11 |
| cli | Python json / sqlite3 | Step 3, 4 |
| cli | Node (read build/ output) | Step 4 |
| inline | Edit tool | Step 5, 6, 7, 8 |
| external | none | — |

---

## Step 1 — [SESSION-START] Orient + verify clean working tree

```
Step 1 — Orient + verify clean working tree
  Model:       inline
  Action:      Re-read spec 14 Section 2.5 + this plan. Run `git status --porcelain`. Confirm no uncommitted changes touching `theme/sgs-theme/`, `plugins/sgs-blocks/src/blocks/`, or `.claude/specs/`, `.claude/architecture.md`, `.claude/state.md`.
  Files:       (reads only)
  Inputs:      .claude/specs/14-CLONING-PIPELINE-CATALOGUE.md, this plan, current git state
  Outcome:     Working tree clean for the files this phase will mutate. Operator (Bean) confirms phase scope before any mutation step runs.
  Exec:        SEQUENTIAL
  Deps:        none
  Marker:      SESSION-START
  Time:        3 min
  Tooling:     git, Read tool
  On-Fail:     Stash unrelated changes (`git stash push -m "p1-pre-flight"`). Do NOT delete or overwrite.
  Cold-Entry:  Read `.claude/specs/14-CLONING-PIPELINE-CATALOGUE.md` (whole spec; especially Section 2.5 + FR17/18). Read this plan top-to-bottom. Then `git status --porcelain`.
  Test:
    Happy:       `git status --porcelain` returns no lines OR returns lines untouched by P1 scope → proceed to Step 2.
    Edge:        Uncommitted change to `.claude/state.md` (likely from prior session) → stash with named ref before proceeding.
    Fail:        Working tree has uncommitted changes to the exact files P1 will mutate → halt; ask operator to commit or stash first.
    Integration: standalone (pre-flight only).
```

## Step 2 — Discover static blocks via v1 fingerprints `block_type`

```
Step 2 — Discover static blocks
  Model:       haiku
  Action:      Read `tools/recogniser/data/fingerprints.json`. Filter rows where `block_type == "static"` AND block_name starts with `sgs/`. Verify count matches the in-source discovery (9 expected: certification-bar, counter, feature-grid, heritage-strip, mobile-nav, multi-button, notice-banner, process-steps, trust-bar). Write the list to `tests/golden/static-block-snapshots/_manifest.json`.
  Files:       tests/golden/static-block-snapshots/_manifest.json (created)
  Inputs:      tools/recogniser/data/fingerprints.json
  Outcome:     `_manifest.json` exists at the snapshot directory with 9 SGS static blocks listed. Manifest matches the 9 blocks discovered from `save.js` analysis in this session.
  Exec:        SEQUENTIAL
  Deps:        Step 1
  Marker:      (none)
  Time:        3 min
  Tooling:     Python json module
  On-Fail:     If v1 fingerprints disagrees with in-source discovery, halt + flag the divergence (could mean a block was misclassified or the v1 data is stale). DO NOT proceed to Step 3.
  Test:
    Happy:       Manifest contains the 9 expected slugs.
    Edge:        v1 fingerprints lists 10 static blocks (one extra) → investigate whether the extra block actually has a non-null save.js before adding to snapshot batch.
    Fail:        v1 fingerprints data file missing → fall back to in-source discovery; report the v1 file gap to FR17 as an additional reconciliation target.
    Integration: Subsequent FR12 mutations key off this manifest — wrong list = wrong scope of deprecation work.
  Prompt: |
    You are running as a cold subagent. Read `tools/recogniser/data/fingerprints.json` (in repo at c:/Users/Bean/Projects/small-giants-wp). Parse it as JSON. Filter for entries where (a) the key starts with `sgs/` AND (b) the value's `block_type` field equals `"static"`. Output a JSON file at `tests/golden/static-block-snapshots/_manifest.json` with shape:
    {
      "generated_at": "<ISO timestamp>",
      "source": "tools/recogniser/data/fingerprints.json",
      "static_blocks": ["sgs/certification-bar", "sgs/counter", ...]
    }
    Create the directory if missing. Validate by re-reading the written file and confirming the array length equals the input filter result. Output the array length and the file path; nothing else.
```

## Step 3 — Capture pre-mutation snapshots per static block (1 of 9)

```
Step 3 — Capture static-block snapshots
  Model:       sonnet
  Action:      For each block in `_manifest.json`, write `tests/golden/static-block-snapshots/<block-slug>.json` containing: (a) the block.json `attributes` object verbatim, (b) the compiled `save()` output read from `plugins/sgs-blocks/build/<slug>/index.js` (find the static save function output as captured by webpack), (c) one representative serialised block markup example (find from a published post via `wp post get` OR construct from the block.json defaults if no real example exists), (d) the source `save.js` file content verbatim. Each snapshot file is the GOLDEN BASELINE that FR12 reads when generating deprecated.js entries.
  Files:       tests/golden/static-block-snapshots/{certification-bar, counter, feature-grid, heritage-strip, mobile-nav, multi-button, notice-banner, process-steps, trust-bar}.json (9 created)
  Inputs:      tests/golden/static-block-snapshots/_manifest.json (from Step 2), plugins/sgs-blocks/src/blocks/<slug>/{block.json, save.js}, plugins/sgs-blocks/build/<slug>/index.js
  Outcome:     9 JSON files exist; each one is byte-stable readable JSON; each contains all 4 required fields (attributes, compiled_save, example_markup, source_save).
  Exec:        SEQUENTIAL with itself (9 sub-steps; could parallelise but Sonnet handles all 9 inline efficiently as one dispatch)
  Deps:        Step 2
  Marker:      (none)
  Time:        10 min
  Tooling:     Read tool, Write tool, Python json
  On-Fail:     If a block's `build/` output is missing (build hasn't run), run `cd plugins/sgs-blocks && npm run build` first; if a block has no published post AND defaults don't produce a complete markup example, use `wp.blocks.serialize()` via a Playwright probe against a fresh editor instance.
  Test:
    Happy:       9 JSON files exist; each parses; each has all 4 required fields populated.
    Edge:        A static block uses an `InnerBlocks` slot in save.js (e.g. `process-steps` may) → `compiled_save` captures the `<InnerBlocks.Content />` reference correctly; example_markup includes one nested child.
    Fail:        `multi-button` save.js references a JSX fragment that webpack hasn't compiled (dev build only) → halt; re-run `npm run build --production`.
    Integration: FR12 in P6 reads these JSON files when staging block.json mutations — wrong content breaks every existing post using a mutated static block.
  Prompt: |
    You are a cold subagent. Working directory: c:/Users/Bean/Projects/small-giants-wp. Read `tests/golden/static-block-snapshots/_manifest.json`. For each block slug in the `static_blocks` array, do the following:

    1. Read `plugins/sgs-blocks/src/blocks/<slug-without-sgs-prefix>/block.json` (the slash after `sgs/` becomes the directory name, e.g. `sgs/counter` → `plugins/sgs-blocks/src/blocks/counter/block.json`).
    2. Extract the `attributes` field verbatim.
    3. Read `plugins/sgs-blocks/src/blocks/<slug>/save.js` verbatim.
    4. Read `plugins/sgs-blocks/build/<slug>/index.js`. Find the `save` function's compiled output. If the file does not exist or the function cannot be located, report it as an error and continue with the next block.
    5. Construct one representative serialised block markup example by combining the block.json defaults into a `<!-- wp:sgs/<slug> {...} -->...<!-- /wp:sgs/<slug> -->` wrapper. Use the default values from the attributes schema.
    6. Write `tests/golden/static-block-snapshots/<slug>.json` with this shape:
       {
         "block_slug": "sgs/<slug>",
         "captured_at": "<ISO timestamp>",
         "attributes": { ... attributes object verbatim ... },
         "source_save": "... save.js content verbatim ...",
         "compiled_save_reference": "build/<slug>/index.js : save function (offset N)",
         "example_markup": "<!-- wp:sgs/<slug> {...} -->...<!-- /wp:sgs/<slug> -->"
       }

    After all 9 are written, verify each file parses as valid JSON. Report total count + any failures. Do nothing else.
```

## QA Gate — Snapshots are valid + complete

```
QA Gate — Snapshot integrity
  Model:       haiku
  Exec:        SEQUENTIAL
  Deps:        Step 3
  Check:       `python -c "import json, os; [json.load(open(f'tests/golden/static-block-snapshots/{b}.json')) for b in ['certification-bar','counter','feature-grid','heritage-strip','mobile-nav','multi-button','notice-banner','process-steps','trust-bar']]; print('PASS: 9 snapshots parse')"`
  Pass:        Stdout `PASS: 9 snapshots parse` AND exit code 0.
  Fail:        JSON parse error OR missing file → return to Step 3, regenerate the failing block's snapshot. Do not proceed past gate.
  Marker:      QA
```

## Step 4 — Reconcile architecture.md L151 (largest false claim)

```
Step 4 — Reconcile architecture.md L151
  Model:       sonnet
  Action:      Edit `.claude/architecture.md` line 151 (the "Foundation toolkit (shipped 2026-05-08)" paragraph). Replace the false claim of shipped 4-layer catalogue + 8 recogniser scripts with a truthful description that references spec 14's build status inventory. New text: "Foundation toolkit (spec 14 build target): 4-layer fingerprint catalogue planned at `plugins/sgs-blocks/scripts/fingerprint-builder/output/` (built by spec 14 FR1-FR4 + FR26). 4 recogniser scripts shipped 2026-05-11 (per-section-convention-voter, confidence-matrix, leftover-bucket-router, simple_html_review_report); 4 additional scripts deferred or retired per spec 14 FR18. uimax `recognition_log` table + `uimax-write-validator.py` shipped 2026-05-08 enforcing no-licensing (blub.db row 211) + Rosetta Stone discipline (blub.db row 213) gates."
  Files:       .claude/architecture.md
  Inputs:      Current architecture.md L151; spec 14 Section 2.5 inventory
  Outcome:     L151 contains no claim of shipped infrastructure that doesn't exist on disk. Cross-references spec 14 for the build plan.
  Exec:        SEQUENTIAL
  Deps:        Step 3 complete (so snapshots exist before reconciliation; ordering safety not strict but cleaner audit trail)
  Marker:      (none)
  Time:        5 min
  Tooling:     Edit tool, Read tool
  On-Fail:     If L151 has shifted (someone edited architecture.md between this session and the snapshot date), re-locate the false-claim paragraph by grep and apply the same edit. Do not skip.
  Test:
    Happy:       `grep -n "shipped 2026-05-08" .claude/architecture.md` returns no matches.
    Edge:        The paragraph wraps differently after the edit (line numbers shift) → that's fine; the grep check is on text content, not line number.
    Fail:        Edit refuses because `old_string` does not match (architecture.md drifted) → re-read the file at L151 region; apply with the new exact text.
    Integration: FR17 in spec 14 lists this reconciliation as required; passing this step closes one of the three docs FR17 names.
```

## Step 5 — Reconcile state.md (single false reference)

```
Step 5 — Reconcile state.md
  Model:       haiku
  Action:      Edit `.claude/state.md` line 52 ("Run critical-fix-verification.py gate (must PASS 5/5)"). Replace with: "Run critical-fix-verification.py gate (must PASS 5/5) — script does not yet exist; spec 14 FR18 decides whether to build it as acceptance harness or retire it."
  Files:       .claude/state.md
  Inputs:      Current state.md
  Outcome:     Line 52 acknowledges the script doesn't exist; references FR18 for resolution.
  Exec:        PARALLEL with Step 4
  Deps:        Step 3 complete (audit trail ordering only)
  Marker:      (none)
  Time:        2 min
  Tooling:     Edit tool
  On-Fail:     If the line has shifted, re-locate by grep on "critical-fix-verification.py".
  Test:
    Happy:       `grep -c "script does not yet exist" .claude/state.md` returns ≥ 1.
    Edge:        Another false-claim instance also lives in state.md → handled at QA gate in Step 11.
    Fail:        State.md is being rewritten by /handoff during this run (unlikely but possible) → halt, retry after handoff completes.
    Integration: FR17 reconciliation target.
```

## Step 6 — Reconcile /sgs-clone SKILL.md (11 false-claim references)

```
Step 6 — Reconcile /sgs-clone SKILL.md
  Model:       sonnet
  Action:      Edit `~/.claude/skills/sgs-clone/SKILL.md` in 5 places: (1) Hard Rule 4 (L74) — replace `critical-fix-verification.py` cross-check claim with reference to FR18 decision; (2) Pre-flight check item 1 (L117) — reframe 4-layer catalogue as a spec 14 BUILD target, not an existing artefact; (3) Pre-flight halt message (L122) — point operator to spec 14 rather than `/sgs-update`; (4) Tool Bindings (L255-260) — mark the 4 missing scripts with a `[FR18 — pending decision]` annotation; (5) Common Mistakes (L247) — soften "foundation must be in place" to "foundation built per spec 14 P3". Each edit preserves the surrounding text exactly; only the affected sentence is reworded.
  Files:       ~/.claude/skills/sgs-clone/SKILL.md
  Inputs:      Current /sgs-clone SKILL.md; spec 14 FR17/FR18 directives
  Outcome:     5 sections in the skill body reflect disk reality. The skill still describes the canonical pipeline shape (no architecture loss); only the false-readiness claims are corrected.
  Exec:        SEQUENTIAL with Steps 4-5 (touches a different file but shares the FR17 conceptual scope; serialise for cleaner commit history)
  Deps:        Step 3 complete; ideally Step 4 + Step 5 complete (audit trail)
  Marker:      (none)
  Time:        10 min
  Tooling:     Edit tool (5 individual edits), Read tool
  On-Fail:     If any one edit fails to match `old_string`, re-read the surrounding context, locate the exact current text, retry. Do not skip — each missed edit means a future session reads a false claim.
  Test:
    Happy:       `grep -nE "critical-fix-verification|heuristic-fallback-builder|computed-style-passport|recursion-guard" ~/.claude/skills/sgs-clone/SKILL.md | grep -v "FR18" | grep -v "pending"` returns no matches OUTSIDE of FR18-annotated lines.
    Edge:        A reference legitimately stands as a planned-future invocation (e.g. Tool Bindings section listing what WILL exist) → annotate, don't delete.
    Fail:        Edit makes the skill self-inconsistent (e.g. pre-flight halts but no message tells the operator what to do) → roll back the affected edit; re-author with explicit redirect to spec 14.
    Integration: FR17 reconciliation target #3. Passing this closes the FR17 trio.
```

## Step 7 — FR18 per-script decisions document

```
Step 7 — FR18 decisions
  Model:       inline
  Action:      Append a new section to `.claude/decisions.md` titled "2026-05-11 — Spec 14 FR18 missing-recogniser-script decisions" with one paragraph per script. Decisions: (a) `heuristic-fallback-builder.py` → RETIRE; the rule-of-thumb fallback role is absorbed by the Layer 2 role-templates per-attribute strategies; (b) `computed-style-passport.py` → RETIRE; replaced by Playwright runtime probe documented in FR3 PHP-analysis fallback; (c) `recursion-guard.py` → BUILD as ~50-LOC standalone module in P2 (revised after Bean challenge — earlier "RETIRE / handled inline" was a fabrication; grep confirmed no max_depth code exists anywhere; standalone file matches /sgs-clone original design + keeps determinism legible); (d) `critical-fix-verification.py` → BUILD as P10 lightweight acceptance harness (~45 min, per KJC2) — 5 git-diff + filesystem checks covering the canonical-mutation boundary (no root theme.json mutation; no canonical-block files mutated outside FR21 commit; no licensing strings in uimax writes; idempotency re-run produces no new gap rows; staging dir empty post-success). Scope decision based on evidence audit: original "broader scope" framing was unsupported by docs; the 5 selected checks cover the failure modes other gates don't catch. Each decision states: status, rationale, follow-up FR if any.
  Files:       .claude/decisions.md (append)
  Inputs:      Spec 14 FR18 recommendation text, this session's reasoning
  Outcome:     decisions.md gains a section dated 2026-05-11 with explicit per-script verdicts. FR18 acceptance criterion "documented decision for each script" closes.
  Exec:        PARALLEL with Step 6
  Deps:        Step 3 complete
  Marker:      (none)
  Time:        5 min
  Tooling:     Edit tool / Write tool
  On-Fail:     If decisions.md is locked / being edited, retry after a 30-sec wait. If still failing, write to `.claude/decisions-pending-merge.md` and flag for manual merge.
  Test:
    Happy:       `grep -c "2026-05-11 — Spec 14 FR18" .claude/decisions.md` returns 1.
    Edge:        decisions.md already has an entry for these scripts (some earlier session noted them) → APPEND under that section, don't duplicate.
    Fail:        Section markdown breaks subsequent reads → preview the rendered output before commit.
    Integration: FR18 acceptance closes; future FR17 doc-grep includes the FR18 references as legitimate (not false-claim) — `sgs-clone` SKILL.md annotations point here.
```

## QA Gate — Zero residual false-claim references

```
QA Gate — Doc reconciliation closure
  Model:       haiku
  Exec:        SEQUENTIAL
  Deps:        Steps 4, 5, 6, 7 complete
  Check:       `grep -nE "shipped 2026-05-08|fingerprint-builder/output\b(?! is planned)|^Layer [1-4]:.*entries.*shipped" .claude/architecture.md .claude/state.md ~/.claude/skills/sgs-clone/SKILL.md 2>&1 | grep -v "FR18\|pending\|planned\|spec 14\|build target" | tee /tmp/p1-residual-claims.txt; test ! -s /tmp/p1-residual-claims.txt && echo "PASS: zero residual false claims"`
  Pass:        Stdout ends with `PASS: zero residual false claims` AND `/tmp/p1-residual-claims.txt` is empty.
  Fail:        File contains lines → those are residual false claims; return to Step 4/5/6 to handle each remaining instance.
  Marker:      QA
```

## Step 8 — Update state.md current_phase + handoff prep

```
Step 8 — Advance state.md current_phase
  Model:       haiku
  Action:      Edit `.claude/state.md` frontmatter `current_phase` field. Set to `phase-2-schema-migrations`. Update `current_step` to reflect P1 closure. Update `last_updated` to today.
  Files:       .claude/state.md
  Inputs:      P1 completion state; spec 14 phase ordering
  Outcome:     state.md frontmatter reflects phase boundary advance. Future session reading state.md knows P1 is done.
  Exec:        SEQUENTIAL
  Deps:        Step 5 (state.md was touched there; ensure no race) and QA gate above
  Marker:      (none)
  Time:        2 min
  Tooling:     Edit tool
  On-Fail:     Race against another /handoff invocation rewriting state.md → halt, retry after handoff session closes.
  Test:
    Happy:       state.md frontmatter `current_phase: phase-2-schema-migrations`.
    Edge:        state.md frontmatter is YAML-malformed after edit → roll back and re-author with `Read` first.
    Fail:        Edit collides with concurrent /handoff write → wait + retry once.
    Integration: /live-project-status reads `current_phase` from this frontmatter.
```

## Step 9 — Update parking.md with deferred items (FR18 retired scripts)

```
Step 9 — Park retired-script references
  Model:       haiku
  Action:      Append to `.claude/parking.md` a "Retired (spec 14 FR18)" section noting the 3 retired scripts (heuristic-fallback-builder, computed-style-passport, recursion-guard) so a future session searching for them gets a redirect to decisions.md.
  Files:       .claude/parking.md
  Inputs:      Step 7 output
  Outcome:     parking.md has a referenced trail from search → retired-script note → decisions.md verdict.
  Exec:        PARALLEL with Step 8
  Deps:        Step 7
  Marker:      (none)
  Time:        2 min
  Tooling:     Edit tool
  On-Fail:     Same as Step 7 fail mode.
  Test:
    Happy:       parking.md contains "Retired (spec 14 FR18)" string.
    Edge:        parking.md is heavily nested → choose top-level section, not deep nesting.
    Fail:        same as Step 7.
    Integration: Navigation aid; no downstream FR depends on it.
```

## Step 10 — Run /diagnostics + /lint on changed docs

```
Step 10 — Pre-commit verification
  Model:       inline
  Action:      Run `/diagnostics` on the workspace (catches any markdown / YAML / JSON syntax errors introduced by the edits). Run `/lint` on `tests/golden/static-block-snapshots/` (catches malformed JSON). No-op if both pass.
  Files:       (reads only)
  Inputs:      All P1 outputs
  Outcome:     Both checks exit clean. No diagnostics warnings on the touched files.
  Exec:        SEQUENTIAL
  Deps:        Steps 4-9 complete
  Marker:      (none)
  Time:        2 min
  Tooling:     /diagnostics, /lint
  On-Fail:     Address any reported issue inline before commit. Do not bypass.
  Test:
    Happy:       Both /diagnostics + /lint return clean (exit 0, no errors).
    Edge:        /diagnostics MCP not connected → fall back to CLI linters as documented in /diagnostics skill.
    Fail:        A snapshot file fails JSON parse → re-run Step 3 for the failing block.
    Integration: This is the P1-local mirror of FR32 pre-commit gate chain (which lands in P9). Catches problems before commit reaches main.
```

## Step 11 — [HANDOFF] Commit P1 + handoff

```
Step 11 — Commit + handoff
  Model:       inline
  Action:      Stage the specific paths touched: `.claude/architecture.md`, `.claude/state.md`, `.claude/decisions.md`, `.claude/parking.md`, `tests/golden/static-block-snapshots/`, `~/.claude/skills/sgs-clone/SKILL.md` (note: this last path is OUTSIDE the project repo — handle separately). Commit project files with message: `feat(p1): doc reconciliation + static-block snapshots + FR18 decisions\n\nSpec 14 Phase 1 closure. Reconciles architecture.md L151 + state.md L52 + decisions.md with disk reality. Captures golden snapshots for 9 static blocks (FR12 deprecation template source-of-truth). FR18 verdicts: retire 3 scripts (heuristic-fallback-builder, computed-style-passport, recursion-guard); build critical-fix-verification.py as P10 lightweight acceptance harness (~45 min, 5 canonical-mutation-boundary checks per KJC2 evidence audit).`. Push to main. The `~/.claude/skills/sgs-clone/SKILL.md` edit is operator's home-directory skill; commit separately or leave for next session per Bean's preference. Run `/handoff` to write the session summary.
  Files:       git commit on main; ~/.claude/skills/sgs-clone/SKILL.md handled per Bean's preference
  Inputs:      All prior P1 outputs
  Outcome:     P1 ships. Commit visible on `main`. `/handoff` produces `.claude/handoff.md` for next session.
  Exec:        SEQUENTIAL
  Deps:        Step 10 PASS
  Marker:      HANDOFF
  Time:        3 min
  Tooling:     git, /handoff skill
  On-Fail:     Pre-commit hook fails (wp-perf-gate or similar) → diagnose the flag; if false-positive on doc changes, document and proceed; if real issue, return to relevant step.
  Cold-Entry:  N/A — phase ends here.
  Test:
    Happy:       `git log -1 --format=%s` returns the expected subject line. `/handoff` output exists.
    Edge:        Pre-commit hook rejects (e.g. /wp-perf-gate flags an unrelated change inadvertently staged) → unstage the extraneous file with `git restore --staged <file>` and re-commit.
    Fail:        Push to main rejected (branch protection, conflict) → resolve per branch-discipline rule in CLAUDE.md; never force-push.
    Integration: P2 (schema migrations) reads `state.md current_phase` to confirm P1 closed; FR12 in P6 reads snapshots produced here.
```

---

## Key Judgement Calls

### Primary decisions (surfaced during planning)

- **Decision:** Snapshot format — JSON-only vs JSON + binary compiled bundle
  - **Options:** A) JSON with `source_save` + `compiled_save_reference` (path to build artefact) | B) JSON with `source_save` + inlined compiled JS string | C) JSON + separate `.js.bundle` file per block
  - **Recommendation:** A
  - **Why:** Compiled bundles change every build; inlining them creates instant snapshot staleness. Path reference + git history is the safer audit trail. FR12 reads source_save anyway; the compiled-save reference is for cross-check, not the actual deprecation source.
  - **Cost of wrong choice:** Wrong choice on B = snapshot files balloon to MB-size + churn every build. Wrong choice on C = extra files to manage. Choice A keeps the snapshot under 10KB per block.
  - **Who decides:** joint — surfaced for Bean confirmation before Step 3 runs

- **Decision:** FR18 critical-fix-verification.py — what should it actually check?
  - **Honest evidence base (re-checked 2026-05-11 after Bean challenged the original recommendation):** The script has been a moving placeholder across 6 docs without anyone ever committing to a scope. Only `/sgs-clone` SKILL.md L74 defines what it checks (slot-list-vs-block.json cross-reference). `state.md` L52 names "5/5 PASS" but never enumerates the 5. `phase-8-validation-and-deploy.md` L5+L57 (written today) explicitly classifies it as "proposed-future, not required for the pipeline to ship, parked as Phase 9+ candidate". The original 2026-05-07 design synthesis doesn't mention it at all. **There is no documented original "broader scope" to trim from.**
  - **Options:**
    - A) Full acceptance harness (~2-3 hr) — 8-10 mechanical checks: zero silent CSS loss, no root theme.json mutation, no canonical files outside FR21 commit, uimax-write-validator log check, idempotency re-run diff, staging-dir cleanup, all gap-candidate status correct, hero golden file bit-exact
    - B) Lightweight assertions (~45 min) — 5 critical-only checks: git diff says no root theme.json mutation; no canonical-block files mutated outside FR21 commit; no licensing strings in uimax writes; idempotency spot-check (re-run produces no new gap rows); staging dir empty post-success
    - C) Skip the script entirely — rely on FR32 pre-commit chain + visual-qa + Bean spot-check; produce `.claude/specs/14-VERIFICATION-CHECKLIST.md` as manual review aid (~10 min)
    - D) The original "trim from broader scope" framing — **rejected** (fabricated justification; no broader scope to trim from)
  - **Recommendation:** B
  - **Why:** Spec 14 has 15 hard constraints; 10 are already enforced by other gates (uimax-write-validator for Rosetta Stone + no-licensing; argparse for `--resume`; editor convention for em-dashes; FR20 mutex for builds; etc.). The 5 that aren't covered by other gates are exactly the canonical-mutation-boundary checks — and a slip on the canonical-mutation boundary is the single highest-consequence failure mode in the whole pipeline (50-client framework poisoning risk that Gemini Pro flagged as the original NO-GO). Worth ~45 min of script for guaranteed enforcement vs hoping no one accidentally bypasses.
  - **Cost of wrong choice:** A wastes ~75 min building duplicate enforcement of constraints other gates already catch. C leaves the canonical-mutation boundary as a "we should remember to check" — exactly the kind of human-remembering this framework's hard rules try to externalise. D would be the worst — recommending against evidence.
  - **Who decides:** Bean confirmed B (2026-05-11). P10 estimate revised to ~45 min, not ~2 hr.

### Pre-emptive decisions (Hidden Decisions pass)

- **Decision:** What about `mobile-nav` and `multi-button` — their save.js use `InnerBlocks.Content`. Are they truly static for deprecation purposes?
  - **Flagged by:** inline analysis (parallel-dispatch peer review skipped this round given session length)
  - **Recommendation:** Treat as static (their save outputs serialised HTML even though it includes an InnerBlocks marker). The deprecated.js for these MUST preserve the InnerBlocks marker exactly — block validation cares.
  - **Why:** A static block returning `<InnerBlocks.Content />` still produces serialised post_content that WP validates against. Different from a fully-dynamic block returning null.

- **Decision:** What if a static block's compiled `build/<slug>/index.js` doesn't exist because the last build was incremental and didn't touch that block?
  - **Flagged by:** inline analysis
  - **Recommendation:** Step 3's `On-Fail` handler runs `npm run build` once before retrying. Document this in the deliverable so future P1 runs don't surprise the operator.

- **Decision:** Should `~/.claude/skills/sgs-clone/SKILL.md` reconciliation commit to a separate location?
  - **Flagged by:** inline analysis
  - **Recommendation:** Edit it in-place during this session; let Bean handle the skill-file commit out-of-band per the lifecycle-gate convention (skills aren't typically committed in the project repo). Step 11 makes the boundary explicit.

---

## Section 7 — Self-assessed docscore (B+)

- ✅ All steps have Model/Action/Files/Inputs/Outcome/Exec/Deps/Time/Tooling/On-Fail
- ✅ All steps have all 4 test layers (Happy/Edge/Fail/Integration) populated, no TBD
- ✅ SESSION-START step (Step 1) has Cold-Entry populated
- ✅ Non-inline dispatched steps (2, 3) have pre-written Prompt fields
- ✅ Two QA gates inserted (after snapshot capture + after doc reconciliation)
- ✅ KJC section with 2 primary + 3 pre-emptive decisions
- ✅ Phase Header carries USP, plan label, cost estimate, success criteria, entry context, references, tooling index
- ◐ Hidden Decisions pass via parallel-dispatch peer review was skipped this round (session length + 2 prior QC rounds already informed the design); reduced from formal A-grade to B+ for this gap

## Section 8 — Living docs update (this plan's effect)

- **state.md current_phase:** to be advanced by Step 8 (`phase-1-doc-recon-and-snapshots` → `phase-2-schema-migrations`)
- **decisions.md:** Step 7 appends the FR18 decisions
- **parking.md:** Step 9 records the retired scripts trail
- **handoff.md:** Step 11 regenerates via /handoff

## Section 9 — Handoff offers

Options when P1 closes:

1. **Continue inline → start P2 (schema migrations, ~30 min)** — natural follow-on; P2 is small and Bean's still warm on context
2. **Stop here; pick up tomorrow with P2 fresh** — `/handoff` writes the next-session prompt
3. **Plan P2 first** (run `/phase-planner` for Phase 2) before executing — adds one more planning layer if Bean wants the same level of step-by-step for P2

Recommended: option 2 — fresh-eyes pass on P1 work tomorrow + clean entry to P2.
