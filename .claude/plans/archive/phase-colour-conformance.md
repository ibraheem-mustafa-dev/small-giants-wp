---
doc_type: plan
plan_id: colour-conformance-2026-08-22
phase_name: Colour control conformance
project: small-giants-wp
governing_spec: 35-BLOCK-INSPECTOR-UX-STANDARD.md (Part O — colour controls)
date: 2026-08-22
docscore_grade: pending
status: IN PROGRESS — detector + 5 helpers built and MERGED TO MAIN (2026-08-22, merge 8803ea96). R2-R6 remain: adoption, hover shape, 29 rows, QA Gate C, ratchet. See PROGRESS below.
---

# Phase — Colour control conformance

## STATUS UPDATE — 2026-09-06 (read this before PROGRESS below)

**The day-to-day adoption mechanism has moved on from R2/Steps 2-6 below,
without a decision recorded here that it superseded them — flagging for
Bean's confirmation, not declaring it unilaterally.** Since 2026-09-03, the
live adoption vehicle has been a paint-surface shape census
(`plugins/sgs-blocks/scripts/colour-codemod/classify-end-shape.js`) plus one
codemod per shape-key in that same directory
(`migrate-fill-custom-property-gradient.js` and siblings), driven by the
carried-forward session prompt at
`.claude/prompts/2026-09-06-colour-conformance-paint-target-grouping.md`
(the current day-to-day worklist pointer — read that, not this file, for
what's open right now, the same way `LEDGER.md` is the pointer for live
project status elsewhere in this repo). That census/codemod approach is
NOT the rule-31 DB-mechanism-resolver + `GridItemDefaultsPanel`/
`ShadowControl` adoption path this plan's Steps 2/2b/3/5a/5b/6a-6d describe
— whether it formally supersedes R2-R6 below, or is a parallel track that
still needs those steps run separately, is undecided here.

One piece of this plan's own design has already proven correct under the
newer tooling: Step 2's mechanism table (below) already names `stroke ->
SVG STROKE` as a fifth mechanism alongside fill/text/border/shadow. The
2026-09-06 session's ICON/SVG surface work (`sgs_icon_gradient_css()`,
built 2026-09-05 as a `sgs/icon` proof-of-concept, now being rolled out to
`icon-list`/`notice-banner` and others) is executing exactly that mechanism
— just via the shape-census/codemod tooling, not the rule-31 resolver
Step 2 originally specified.

⛔ **More than 3 blocks/files/call sites? The first deliverable is the
DETECTOR, not the edit — `.claude/THE-MIGRATION-METHOD.md`.** Measured: a census-driven pass moves the corrections out of the tree and into the detector, where one commit fixes hundreds of sites. Figures + derivation live in ONE place — do not copy them here.

**USP:** Every colour control in the framework becomes complete and provably so. A client can set a
colour, a hover, and a gradient on any element that paints one — and the build fails if a new
control ships incomplete. This is the last big gap between "SGS has colour controls" and "SGS's
colour controls are trustworthy".

**Plan label:** `[PLAN: sonnet]` — downgraded from opus 2026-08-22. Wave 1 WAS a cross-language
detector rewrite; it is now a DB lookup against a column that already exists, which removed the
architectural judgement that justified opus. Waves 2-3 were already mechanical and delegated.

**Docscore:** pending (Stage 7)

## PROGRESS — 2026-08-22 (read this before the criteria below)

⛔ **THE PLAN'S ORIGINAL SHAPE WAS WRONG AND WAS REPLACED MID-EXECUTION.** Steps 1-7 below
assumed per-block migration of colour rows. Bean stopped that twice: first because
per-block agent dispatch violates D542 (>3 blocks -> build the detector, not the edit),
then because a CODEMOD that patches 64 bespoke implementations still leaves 64 bespoke
implementations. The agreed shape is **five variant HELPERS that blocks adopt**. Steps 1-4
(detector) still stand as written; Steps 5-6 (per-block migration) are SUPERSEDED by
adoption.

### Built and committed — branch `feat/colour-states-codemod`, pushed, all gates green

| Piece | State |
|---|---|
| rule 31 mechanism-aware, `kind` field, ratchet 413 -> 378 | done |
| `survey.js` census + honest extensibility verdicts | done |
| `scan-undeclared-setattributes.js` (NEW gate) | done — caught 3 real defects, one shipped by me |
| `fix.js` (survey/fix/check/self-test, 15 assertions) | done — 6 rows conformant |
| 5 colour-variant helpers, all installable via an attr-name map | done |
| `describeRow()` — gate can SEE helper calls | done |
| `statesProvidedByParent` marker | done |
| ShadowControl: one state axis, single-state picker inside | done (Bean's ruling) |
| 22/22 ShadowControl mounts on the `attrNames` map | done |
| `migrate-shadow-mounts.js` (survey/apply/check) | done |

### Measured reality that changed the plan

- **AUTOFIXABLE is 29 of 208 (14%), not the 161 (75%) first reported.** The census asked
  "does the block emit colour?" not "can that emission carry a GRADIENT?". 132 rows paint
  through a colour-valued CSS custom property, which cannot hold a gradient.
- **That ceiling is a CONSEQUENCE of hand-rolled paint, not a fact about the blocks.** A
  shared emitter owns the paint, so adoption dissolves it. This is why adoption, not
  patching, is the route.
- **3,951 lines of inline colour-row JSX across 64 blocks** is what adoption deletes.
- `GridItemDefaultsPanel` "defect" — **CLOSED, not a defect.** `KIND_PANELS.layout` does
  not include it; all candidate blocks pass `kind="layout"` and correctly declare no
  `gridItem*` attrs. A fix was built on a bad probe and fully reverted.

---

## EXACT REMAINING STEPS TO CLOSE

### R1 — Merge the branch to `main` — ✅ DONE 2026-08-22 (merge `8803ea96`)

Merged on Bean's instruction. The earlier "blocked" call was over-cautious: the co-active
session's dirty files were re-checked IMMEDIATELY BEFORE merging and had **zero overlap**
with the 48 this branch touches, so their uncommitted work could not be disturbed. All
seven of their dirty files were still present and untouched afterwards, verified.

All six gates re-run ON MAIN after the merge: inspector-scan 0, check-dead-controls 0,
check-duplicate-controls 0, undeclared-attr scan CLEAN, migrate-shadow-mounts --check
CLEAN, rule 31 self-test PASS at 378.

⭐ **The reusable check, not the outcome:** "another session is active" is not by itself a
reason to block a merge. `comm -12` on their dirty paths against the branch's changed paths
answers it in one command. Re-run it immediately before merging, never once at the start —
their tree moves.

### R2 — Adopt `fillRow` / `textRow` / `borderRow` across the roster
The main remaining work and the one that pays for the helpers.
- Drive it with a codemod mode, NOT per-block agents (D542).
- `describeRow()` already keeps rule 31 and the survey sighted through helper calls —
  verified both directions, so adoption cannot blind the gate.
- ⛔ **Verify reachability per site BEFORE editing.** The GridItemDefaultsPanel reversal
  came from a probe that counted comments and named-export imports as real mounts.
- ⛔ **Diff the OUTPUT, not just the dry run.** A dry run reported a perfect attribute map
  while silently dropping every `label=`; only `git diff` caught it.
- **Exit:** inline colour-row JSX materially reduced from 3,951 lines; rule 31 not risen;
  undeclared-attr scan CLEAN.

### R3 — Hover SHAPE attributes for full shadow symmetry
`ShadowControl` SUPPORTS `valueHover`/`onValueHoverChange`; no block passes them yet, so no
block has a hover shape in practice — only a hover colour.
- Add a hover-shape attribute per mounting block + the `hover` key in its `attrNames` map.
- `sgs_shadow_decls()` already reads it and falls back to the resting shape when absent, so
  this is additive and cannot regress the 8 blocks that recolour-only on hover.
- **Exit:** a hover shadow can lift/grow/soften, not merely recolour.

### R4 — The 29 genuinely autofixable rows
16 `helper-at-existing-selector`, 12 `wire-state-emitter`, 1 `wrapper-emits`.
⚠ 5 of the 16 are keyed as hover (`shadowHover`, `hover-border`) — they ARE the hover state
and need a **normal** state added, not a second hover. Determine direction from render.php
evidence, never from the row key's spelling.

### R5 — Build, deploy, QA Gate C (unchanged from the original plan)
`npm run build` -> `build-deploy.py --target sandybrown --blocks-only` -> Playwright editor
login sampling **one row per mechanism** (fill, text, border, overlay, shadow), each: pick a
palette colour, save, RELOAD, assert the stored value is the SLUG not a hex, and confirm a
hover repaints under a real pointer.
⛔ Nothing in this phase has been verified live yet. Every visual-diff gate skip taken so
far was logged as "additive, no live screenshot, NOT claiming a PASS" — this is where that
debt is settled.

### R6 — Ratchet down + docs (original Step 7)
Lower rule 31's `openBacklog` to the measured floor with a stated reason, write the D-entry,
update the LEDGER, write the visual-diff evidence report, run `handoff-preflight.py --check`.
⚠ In a fresh worktree that gate reports one dangling link
(`specs/README.md -> 02-SGS-BLOCKS-REFERENCE.md`) — a GITIGNORED generated file, absent from
any worktree, present on main where the same gate passes 0 failures. Not a defect; do not
"fix" it.

---

## Phase success criteria (done when)

- [ ] Rule 31 resolves each colour row's PAINT MECHANISM from `block_attributes.css_property`
      (DB, declarative) and asserts the row's gradient path matches it — both directions
      (false-PASS and false-FAIL).
- [ ] Shadow rows no longer demand a gradient. `post-grid`'s per-block shadow exemption is removed
      as a second owner of that fact.
- [ ] The two shared-component rows (`GridItemDefaultsPanel`, `ShadowControl`) are conformant —
      they reach 20 and 29 blocks respectively.
- [ ] Rule 31's ratchet is lowered to the new measured floor and still passes `--check`.
- [ ] `npm run build` green; canary deployed; **one row per mechanism** (fill, text, border,
      overlay, shadow) live-verified in the editor — not one row overall.

## Measured starting state (2026-08-22, re-measure before trusting)

    node plugins/sgs-blocks/scripts/inspector-scan/run.js --check --json

| Figure | Value |
|---|---|
| Rule 31 total (ratcheted) | 413 |
| `below-min-states` | 197 |
| `missing-gradient` | 194 |
| `native-colour-ui` | 22 |
| Blocks with findings | 63 |
| Shared rows (high leverage) | `GridItemDefaultsPanel.js` 6 (reaches 20 blocks) · `ShadowControl.js` 2 (reaches 29) |

⛔ **Do not quote these numbers later in the phase.** Re-run the command. Every cached count in this
project has drifted.

## Entry context (read before starting)

- `.claude/plans/2026-08-22-colour-control-bundles-BRIEF.md` — the governing brief, revision 2. Read
  IN FULL. Revision 1's premise was falsified by a council; the brief explains why.
- `plugins/sgs-blocks/scripts/consistency/golden-controls.json` — `controls.colour` is the contract.
- `.claude/decisions.md` D717, D736, D737, D738, D739 — the overlay work this builds on.
- `plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js` — its header
  documents 12 existing blind spots. Read them before touching it.

## Settled decisions — DO NOT RE-LITIGATE

| # | Decision | Source |
|---|---|---|
| S-1 | Overlay is a **SIBLING control**, not an `SgsColourPanel` row. Its extras stay on the sibling control; the shared row contract does NOT change; no Rule 7 design gate. | Bean 2026-08-22 |
| S-2 | Overlay opacity is a **slider alone** with `allowReset`. No boolean. A boolean means two attributes owning one state. | Bean 2026-08-22 |
| S-3 | Shadow is gradient-exempt **BY MECHANISM**, taught to the detector once — never per-block exemptions. `post-grid`'s existing one is REMOVED. | Bean 2026-08-22 |
| S-4 | The border reference block is **`sgs/button`** (verified conformant: 2 states, gradient per state, renders via `sgs_border_gradient_css` at `render.php:894`). NOT `sgs/heading`, whose border rows are themselves 2 of the findings. | Bean 2026-08-22 |
| S-5 | Detector FIRST, migration second (D542 triad). Without mechanism-awareness we cannot prove the rollout worked. | brief |
| S-6 | No agent runs git, deploys, or `npm run build`. The coordinator integrates and builds once per wave. | this session's incident |
| S-7 | **The COORDINATOR's own integration commit is EXACT-PATH-SCOPED — never a glob, never `git add -A`, never `--amend`.** Enumerate the literal filenames. | `87d904a6` + STOP-PATH-SCOPED-COMMIT |
| S-8 | **Wave 3's four parallel coding agents are PERMITTED.** Bean ruled 2026-08-22 that STOP-39 binds ONE WRITER PER FILE, not one agent at a time — disjoint file sets are fine. A council rater had escalated the entry's headline as a possible blanket ban; the entry now states its own scope. 2+ writers on one file remains banned, and the orchestrator counts as a writer. | Bean 2026-08-22 + STOP-39 |

## Reference blocks (verified, not assumed)

| Recipe | Reference | Evidence |
|---|---|---|
| Fill / background | `sgs/container` | 0 rule-31 findings |
| Text | `sgs/heading` text row (`edit.js:293-316`) | 0 findings on that row |
| Border | **`sgs/button`** (`edit.js` border row) | 0 findings; renders `sgs_border_gradient_css` `render.php:894` |
| Shadow | `ShadowControl.js` | colour-only by design |
| Overlay | `BackgroundPanel.js` + `GradientOverlayControl.js` | post-D739; 0 findings |

---

## Step 1 — Pin the recipe contract as machine-readable data

    Model:       inline
    Action:      Add a `recipes` block to golden-controls.json controls.colour: for each of the five
                 members, record { paintHelper, rowShape, requiredSiblings, livesAs }. This is the
                 single source both the detector and every migration agent read, so two agents
                 cannot interpret the recipe differently.
    Files:       plugins/sgs-blocks/scripts/consistency/golden-controls.json
    Inputs:      The brief's family table; S-1..S-4
    Outcome:     `python -c "import json;d=json.load(open(...));print(len(d['controls']['colour']['recipes']))"` prints 5
    Exec:        SEQUENTIAL
    Deps:        none
    Marker:      SESSION-START
    Time:        10 min
    Tooling:     Bash, python
    On-Fail:     `git checkout -- golden-controls.json`
    Cold-Entry:  The brief (in full) + golden-controls.json controls.colour
    Test:
      Happy:       JSON parses; 5 recipes present, each naming a real PHP function
      Edge:        A recipe naming a helper that does not exist -> grep helpers-tokens.php proves each
      Fail:        Invalid JSON -> the file is the contract; a broken contract fails every gate
      Integration: `node scripts/inspector-scan/run.js --check` still exits 0

## Step 2 — Resolve each row's mechanism from the DB, NOT from scanning render.php

    Model:       sonnet
    Action:      Rule 31 reads each colour row's PAINT MECHANISM from `block_attributes.css_property`
                 — the declarative routing column that already exists — and maps it to a mechanism:
                   color | color-gradient                                   -> TEXT
                   background-color | background-image | *-gradient          -> FILL
                   border-color | border-color-gradient | outline-color      -> BORDER
                   box-shadow-color                                          -> SHADOW (no gradient)
                   stroke                                                    -> SVG STROKE
                 An attribute with an EMPTY css_property is UNRESOLVED — reported, never guessed.
    Files:       plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js
    Inputs:      Step 1's recipes; the `block_attributes` table via
                 `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`
    Outcome:     Every colour row carries a resolved mechanism or an explicit UNRESOLVED, sourced
                 from the DB
    Exec:        SEQUENTIAL
    Deps:        Step 1
    Marker:      (none)
    Time:        25 min
    Tooling:     Bash, node, sgs-db.py
    On-Fail:     Revert the rule file; the ratchet must stay green
    Prompt:      `.claude/prompts/step-2-mechanism-resolver.md` (⚠ REWRITE IT FIRST — it still
                 describes the render.php scan this step replaced)
    Test:
      Happy:       sgs/heading's three rows resolve TEXT / FILL / BORDER from their css_property
      Edge:        An attr with empty css_property -> UNRESOLVED, never inferred from its NAME
      Fail:        DB unreachable -> the rule fails closed, never silently resolves nothing
      Integration: Total finding count UNCHANGED (this step only makes mechanism VISIBLE)

⭐ **THIS REPLACES A RENDER.PHP SCAN, ON BEAN'S STEER, AND THE COUNCIL HAD ALREADY KILLED THE OLD
SHAPE.** The previous Step 2 proposed a cross-file, cross-language regex resolver over `render.php`.
A council tracer measured it and returned *"not sound enough to build on as currently scoped"*:
the shared wrapper contains **ZERO** calls to `sgs_background_paint_decl` or `sgs_text_colour_decl`
across its 3,243 lines, so wrapper-routed blocks could never resolve their fill or text rows; and
the 4-helper vocabulary could not see the dominant real pattern — a bare `sgs_colour_value()`
hand-embedded in a CSS string (`team-member/render.php:544`, `label:138`, `separator:147`).

**The DB already answers the question the scan was trying to ask.** MEASURED:
`block_attributes.css_property` is populated for **320 of 439** colour attributes (73%), and its
values map cleanly onto the five mechanisms — including `stroke` (13), which is exactly the
"unnamed helper family" the tracer flagged on `sgs/business-info`.

It is also what R-31-1 requires: **DB-first, no hardcoded dicts.** A regex vocabulary of helper
names hand-maintained inside a lint rule is precisely the hardcoded lookup that rule bans. The
render.php scan was off-pattern as well as insufficient.

⛔ **The remaining gap is DATA, not CODE — and it is CENSUS-INFORMED, not a manual pile**
(Bean's steer, 2026-08-22).

**Denominator, corrected by enumeration after FOUR instrument bugs in one sitting:**

| Scope | Gap attrs | Blocks | In scope? |
|---|---|---|---|
| `sgs/*` | **88** | 21 | YES |
| `core/*` | 46 | 12 | **NO** — WordPress core blocks; SGS never classified them and should not |
| Total the raw query returns | 134 | 33 | — |

⚠ Quote **88**, not 134 and not 119. The 134 includes `core/*`; the 119 came from a narrower role
predicate that dropped 15 `role='colour-gradient'` rows, which ARE colour rows (the gradient
siblings). Re-derive with the query, never from this table.

**Split the 88 by what the census already knows about each block's paint route** — the census
records WHICH helpers each block calls, not merely a bucket:

| Census route | Gap attrs | Blocks | What it buys the seeder |
|---|---|---|---|
| `direct` | **49** | 12 | The block's helper calls are known, so the mechanism is CONSTRAINED — often to a single candidate. Derive, then confirm. |
| `wrapper` | 30 | 6 | Overlay + grid-item-border resolvable from the wrapper; fill/text NOT (the wrapper calls neither helper). |
| `neither` | 9 | 3 | No helper evidence anywhere. The only genuinely hand-inspected set. |

Regenerate with `python plugins/sgs-blocks/scripts/census-colour-paint-route.py --json`.

⛔ **AGREEMENT BETWEEN THE TWO IS NOT INDEPENDENT CONFIRMATION.** Both the DB classifier
(`extract-signatures.py`, whose docstring line 4 says it "Reads every SGS block's render.php") and
the census read the SAME source. They are two ALGORITHMS over one source, not two instruments. So:
- where they agree, that is one source read twice — useful, not proof;
- where they DISAGREE, one algorithm is wrong and it is worth a finding;
- the only genuinely independent check on a mechanism remains **the live editor test at QA Gate C.**

⭐ **Why this matters more than the arithmetic.** A first draft of this step read the mechanism from
the DB alone. That makes the detector trust the very declaration it exists to check — and the
headline defect this phase was built to catch (a row wired to the WRONG mechanism) is *precisely* a
case where the declaration and the render disagree. Resolving mechanism from the declaration would
define that bug out of existence.

## Step 2b — Seed the missing `css_property` values FROM THE CENSUS, not by hand

    Model:       sonnet
    Action:      Fill the empty `block_attributes.css_property` cells using the colour-golden
                 census as the evidence source. It already scanned the real render surface and
                 recorded, per finding: `property`, `element_guess`, `selector`, `state`, `file`,
                 `line`. That is exactly the field the DB is missing, derived from the code rather
                 than assigned by judgement.
    Files:       `.claude/reports/2026-08-20-colour-golden-raw/colour-coverage.json` (READ),
                 the DB via `sgs-db.py`, and a new seeding script under
                 `plugins/sgs-blocks/scripts/`
    Inputs:      Step 2's UNRESOLVED list
    Outcome:     Every fillable gap carries a css_property traceable to a census file:line; every
                 remaining gap is NAMED with why it could not be filled
    Exec:        SEQUENTIAL
    Deps:        Step 2
    Marker:      (none)
    Time:        30 min
    Tooling:     Bash, python, sgs-db.py
    On-Fail:     The DB is shared across tracks — never reseed without `/sgs-update` first
    Prompt:      ⛔ NOT PRE-WRITTEN — its worklist is Step 2's UNRESOLVED output.
    Test:
      Happy:       A seeded attr resolves to the same mechanism the census observed at that file:line
      Edge:        A census `property` string that is DESCRIPTIVE, not a CSS property -> normalise
                   or refuse; never write prose into the column
      Fail:        NEGATIVE CONTROL: seed a deliberately wrong property, confirm rule 31 resolves
                   that row to the WRONG mechanism and flags it. Restore.
      Integration: `python scripts/dbschema/check_schema_drift.py --check` still passes

⭐ **Bean's steer: "the colour golden census should be able to provide that info." It can — MEASURED.**
The census holds **189 records across 33 blocks**, each carrying a CSS `property` and an
`element_guess`. Cross-referenced against the DB gaps:

| | Count |
|---|---|
| Colour attrs with EMPTY `css_property` | **88** across 21 blocks |
| ...of which sit in blocks the census ALREADY scanned | **49** in 10 blocks — fillable from evidence |
| ...in blocks where the census found no colour paint | **39** — investigate; some may be legitimately empty |

Highest-yield: `cta-section` 10 · `product-card` 9 · `container` 8 · `hero` 6 · `post-grid` 5 ·
`product-search` 5.

⛔ **RE-RUN BOTH QUERIES; DO NOT CITE THESE NUMBERS.** An earlier pass of this same question
returned **119**, this one **88** — because the two queries define "a colour attribute"
differently (`role='colour'` vs `role LIKE '%colo%r%'` vs an `attr_name` match). Neither is wrong;
they answer different questions. **State the predicate with the number, every time,** or the next
reader inherits a figure whose meaning they cannot recover. This is the same class as the census
that had no committed method.

⚠ **The census's `property` values are DESCRIPTIVE, not raw CSS**: `"box-shadow (colour component)"`,
`"background (gradient stop)"`. They must be normalised to the DB's vocabulary before seeding.
Writing the descriptive string into `css_property` would make every downstream mechanism lookup
miss — a silent, self-inflicted version of the exact blind spot this step exists to close.

## Step 2a — Give every rule-31 finding a machine-readable `kind`

    Model:       inline (trivial + additive; delegating costs more than doing it)
    Action:      Add a `kind` string field to every rule-31 finding object, naming its axis:
                 below-min-states | missing-gradient | native-colour-ui | banned-lookalike |
                 roster-surface-unknown. Purely additive — no assertion changes.
    Files:       plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js
    Inputs:      none
    Outcome:     Every finding in --json carries a `kind`; classification stops being a substring
                 grep on free-text `detail`
    Exec:        SEQUENTIAL
    Deps:        none (can run before or alongside Step 2)
    Marker:      (none)
    Time:        10 min
    Tooling:     Bash, node, python
    On-Fail:     Revert; no assertion depended on it
    Test:
      Happy:       `--json` findings all have a non-null `kind`
      Edge:        A finding whose axis is ambiguous -> named explicitly, never defaulted silently
      Fail:        Total finding count MUST be unchanged; if it moved, an assertion was touched
      Integration: `run.js --check` exits 0

⛔ **Why this is its own step.** There is NO `kind` field today — verified: finding objects carry
`{rule, checklistItem, block, file, line, severity, detail, fix, key, status}`. The kinds this plan
names exist only as free text inside `detail`. Without this step, QA Gate B's "classify by kind"
means "grep a substring you invent yourself", and two agents will draw the boundaries differently.

## QA Gate A — the resolver is honest before any assertion depends on it

    Model:   inline
    Exec:    SEQUENTIAL
    Deps:    Step 2
    Check:   node scripts/inspector-scan/run.js --check ; echo "exit=$?"   AND   the run reports an
             explicit UNRESOLVED count
    Pass:    exit 0, total findings unchanged from the Step-0 measurement, UNRESOLVED count stated
    Fail:    If total moved, the resolver changed an assertion it should not have — revert Step 2
    Marker:  QA

## Step 3 — Make the assertion mechanism-aware, BOTH directions

    Model:       sonnet
    Action:      Replace the binary `row-missing-gradient` check. A row PASSES when its gradient path
                 matches its resolved mechanism. A shadow-mechanism row is EXEMPT (no gradient
                 possible). An UNRESOLVED row is reported as unresolved, never as a pass.
    Files:       plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js
    Inputs:      Step 2's resolver; S-3
    Outcome:     Shadow rows stop being flagged for a missing gradient; a row wired to the WRONG
                 mechanism starts being flagged
    Exec:        SEQUENTIAL
    Deps:        QA Gate A
    Marker:      (none)
    Time:        45 min
    Tooling:     Bash, node
    On-Fail:     Revert; re-measure to confirm the count returns to its pre-step value
    Prompt:      `.claude/prompts/step-3-mechanism-assertion.md` (WRITTEN)
    Test:
      Happy:       A shadow row is no longer flagged missing-gradient
      Edge:        A text row wired to the BACKGROUND mechanism is newly flagged (the false-PASS case)
      Fail:        NEGATIVE CONTROL, must be OBSERVED both ways: inject a wrongly-wired row -> gate RED; restore -> GREEN
      Integration: `npm run build` exits 0 with the ratchet re-baselined

## Step 3b — Fix the rows Step 3 newly reveals as MISWIRED

    Model:       sonnet
    Action:      Step 3 teaches the detector to SEE a row wired to the wrong paint mechanism. This
                 step REPAIRS them. Enumerate every newly-flagged miswired row, then for each,
                 rewire the row to the mechanism its render.php actually uses.
    Files:       Enumerated from Step 3's run — REPORT the list before editing. Unknown until then.
    Inputs:      Step 3's finding delta, grouped by the `kind` field
    Outcome:     Zero rows remain flagged as mechanism-mismatched
    Exec:        SEQUENTIAL
    Deps:        Step 3
    Marker:      (none)
    Time:        ⛔ NOT ESTIMATED — size it from Step 3's actual output. Enumerated, never guessed.
    Tooling:     Bash, node
    On-Fail:     Revert per row; each is independent
    Prompt:      ⛔ NOT PRE-WRITTEN, deliberately. This step's scope IS Step 3's output — the
                 list of newly-flagged miswired rows does not exist until Step 3 runs. Writing a
                 cold prompt now would state a scope nobody has measured. Write it at dispatch
                 time via /subagent-prompt, using Step 3's actual enumeration.
    Test:
      Happy:       A text row that was painting through the background mechanism now routes to
                   sgs_text_colour_decl and renders visibly
      Edge:        A row whose mechanism is UNRESOLVED is NOT a miswired row — leave it, report it
      Fail:        NEGATIVE CONTROL: re-wire one row back to the wrong mechanism -> the rule must go
                   RED. Observe it, both directions.
      Integration: build green

⛔ **Why this step exists.** The plan originally taught the detector to find miswired rows and then
assigned nobody to fix them. If Step 3 finds five, that work had no owner and no budget. A finding
with no repair step is a backlog entry pretending to be a fix.

## Step 4 — Remove post-grid's shadow exemption

    Model:       inline (deletes ONE json entry; a cold prompt costs more than the edit)
    Action:      Delete the `colourExemptions.shadow` entry from post-grid/block.json. It is now a
                 second owner of a fact the detector states.
    Files:       plugins/sgs-blocks/src/blocks/post-grid/block.json
    Inputs:      S-3; Step 3 must be live first
    Outcome:     post-grid's shadow row is still unflagged — because the MECHANISM exempts it, not
                 the declaration
    Exec:        SEQUENTIAL
    Deps:        Step 3
    Marker:      (none)
    Time:        5 min
    Tooling:     Bash, python
    On-Fail:     Restore the entry
    Test:
      Happy:       Rule 31 finding count unchanged after removal
      Edge:        JSON still parses
      Fail:        If a finding APPEARS, Step 3's exemption is not working — revert and fix Step 3
      Integration: build green

## QA Gate B — detector complete and re-ratcheted

    Model:   inline
    Exec:    SEQUENTIAL
    Deps:    Steps 3-4
    Check:   node scripts/inspector-scan/run.js --check --json > reports/qa-gate-b-worklist.json
             then group by the `kind` FIELD added in Step 2a (NOT by grepping the free-text
             `detail` string — that is an invented substring boundary and two agents will draw it
             differently); then set rules.json openBacklog to the measured total and re-run --check
    Pass:    exit 0; shadow rows contribute 0 missing-gradient; ratchet equals the measured total
    Fail:    Re-measure by ENUMERATION, never by subtracting totals across tree states
    Marker:  QA

## Step 5a — GridItemDefaultsPanel (highest leverage, well-scoped)

    Model:       sonnet
    Action:      Bring the colour rows in GridItemDefaultsPanel to the recipe. 6 findings; the panel
                 is reached by 20 blocks, so one edit clears all of them. Every mounting block must
                 already declare the sibling attributes the new states write to, or WordPress
                 discards them from the editor schema in silence.
    Files:       plugins/sgs-blocks/src/blocks/container/components/GridItemDefaultsPanel.js
                 (VERIFIED PATH — NOT src/components/. resolveComponentFiles() scans both
                 directories with no de-duplication, so a file created at the wrong path silently
                 FORKS a component reaching 20 blocks: one copy live, one stale.)
                 plus the block.json files the agent enumerates and REPORTS BEFORE EDITING
    Inputs:      Step 1 recipes; S-4 reference blocks
    Outcome:     GridItemDefaultsPanel's 6 findings clear; rule 31 drops by the enumerated amount
    Exec:        SEQUENTIAL
    Deps:        QA Gate B
    Marker:      SESSION-START
    Time:        45 min
    Tooling:     Bash, node
    On-Fail:     Revert the component; the ratchet catches any rise
    Cold-Entry:  This plan + the brief + golden-controls.json recipes + reports/qa-gate-b-worklist.json
    Prompt:      `.claude/prompts/step-5a-grid-item-panel.md` (WRITTEN)
    Test:
      Happy:       The 6 findings clear
      Edge:        A mounting block missing a sibling attr -> enumerated + declared, never skipped
      Fail:        A control writing to an undeclared attr -> value lost on reload; caught at Gate C
      Integration: build green; ratchet lowered

## Step 5b — ShadowControl hover state (RE-SIZE BEFORE RUNNING)

    Model:       sonnet
    Action:      Give ShadowControl's colour row a `states[]` array with normal + hover. This is a
                 COMPONENT API CHANGE, not a prop tweak: it needs a second colour prop pair, a new
                 sibling attribute in EVERY mounting block's block.json, AND a real `:hover` CSS
                 rule in each block's render.php — without the render half the control is dead under
                 HC2 and `check-dead-controls.js` fails the build.
    Files:       plugins/sgs-blocks/src/components/ShadowControl.js + the 15 mounting blocks'
                 edit.js, block.json AND render.php (enumerate first — measured 16 JSX mounts across
                 15 blocks: before-after, brand-strip, button, card-grid, container, cta-section,
                 hero, info-box, media, physics-canvas, post-grid, quote, team-member, testimonial,
                 trust-bar)
    Inputs:      Step 5a's completion report
    Outcome:     ShadowControl's 2 findings clear AND no block gains a dead control
    Exec:        SEQUENTIAL
    Deps:        Step 5a
    Marker:      SESSION-START
    Time:        ⛔ NOT ESTIMATED — size it after enumerating the render.php work. The original
                 45-minute budget covered this and GridItemDefaultsPanel TOGETHER and was wrong by
                 roughly an order of magnitude. Do not start this inside another step's budget.
    Tooling:     Bash, node
    On-Fail:     Revert component + all touched blocks; this is the largest blast radius in the phase
    Cold-Entry:  This plan + Step 5a's report + golden-controls.json recipes
    Prompt:      ⛔ NOT PRE-WRITTEN, deliberately — same reason as 3b. This step is marked NOT
                 ESTIMATED; its file list is whatever the enumeration of ShadowControl's mounting
                 blocks returns, including which need a `:hover` rule in render.php. Write the
                 prompt after that enumeration, never before.
    Test:
      Happy:       Shadow hover repaints on a real pointer hover, live
      Edge:        A block whose shadow renders via a preset slug (self-contained, no colour) — must
                   not gain a meaningless hover colour
      Fail:        NEGATIVE CONTROL — must be a LIVE check, not check-dead-controls (see the
                   Action note: CHECK 5 is advisory and cannot go red). Declare a hover attr, wire
                   the control, do NOT add the `:hover` rule, deploy, and confirm on the canary
                   that hovering changes NOTHING. Then add the rule and confirm it repaints.
      Integration: build green; ratchet lowered

    ✅ ALREADY DONE (D740, this session): ShadowControl's picker was missing `linked`, so it stored a
    raw colour on EVERY pick and never a palette slug — the client's brand token unlinked across all
    15 blocks the moment they chose a shadow colour. Same defect D717 fixed on the overlay. Fixed;
    safe because `sgs_shadow_value_composed()` resolves the colour through `sgs_colour_value()`
    (`helpers-tokens.php:717`). ⚠ `enableAlpha` DELIBERATELY STAYS ON here, unlike the overlay: a
    shadow legitimately wants alpha and there is no separate shadow-opacity attribute to carry it,
    so removing it would delete a capability rather than relocate it. Consequence stated, not
    hidden: lowering alpha still stores a raw colour. **Bean may want to revisit that trade.**

## Step 6a-6d — Per-block migration, PARALLEL, disjoint file sets

    Model:       sonnet (x4)
    Action:      Four agents, each owning a disjoint set of blocks from the enumerated worklist,
                 bringing every colour row to its recipe. Split by block, never by file type.
                 Suggested split by finding volume: (a) product-card + nav-menu; (b) post-grid +
                 testimonial + pricing-table; (c) trust-bar + before-after + mega-panel;
                 (d) multi-button + process-steps + product-search + business-info.
    Files:       Each agent: only its own blocks' edit.js + block.json. NO shared components (Step 5
                 owns those). NO render.php unless the recipe requires a new paint call.
    Inputs:      Step 1 recipes; the enumerated per-block worklist from QA Gate B
    Outcome:     Each agent's blocks reach 0 rule-31 findings.
                 ⛔ "AT ITS RECIPE" MEANS EXACTLY THIS: 0 rule-31 findings for that row. Nothing
                 else. A recipe also records `rowShape` and `livesAs`, but NO rule asserts those —
                 they are migration GUIDANCE, not gates. Do not spend time trying to make them
                 checkable.
                 ⛔ WHEN "WHY NOT" IS ACCEPTABLE: only for a `missing-gradient` finding, and only as
                 a new `supports.sgs.colourExemptions` entry carrying a real, BLOCK-SPECIFIC,
                 non-boilerplate reason. Every OTHER finding kind has no exemption mechanism in the
                 schema at all — a "why not" there is an UNFIXED DEFECT and must be escalated to the
                 coordinator, never closed as a report.
    Exec:        PARALLEL with each other
    Deps:        Step 5
    Marker:      (none)
    Time:        40 min (wall clock, all four)
    Tooling:     Bash, node, Agent
    On-Fail:     Revert that agent's blocks only; the others are independent
    Cold-Entry:  This plan + `golden-controls.json` recipes + `reports/qa-gate-b-worklist.json`
                 (QA Gate B WRITES that file; each agent filters it to its own block list — do not
                 hand-paste a worklist into the prompt, it is not reproducible)
                 + Step 5a's touched-blocks report: any shadow row listed there is PRE-CLEARED —
                 VERIFY ONLY, do not re-touch it, or two agents will "fix" the same row differently.
    Prompt:      `.claude/prompts/step-6-block-migration.md` (WRITTEN — parameterise per agent
                 with that agent's own block list; everything else is identical)
    Test:
      Happy:       Named blocks drop to 0 findings
      Edge:        A row whose mechanism is UNRESOLVED -> reported, not guessed at
      Fail:        A new sibling attr not declared in block.json -> WP discards it; the agent must
                   declare before wiring
      Integration: build green after the coordinator merges all four

## QA Gate C — migration verified live, not just statically

    Model:   inline
    Exec:    SEQUENTIAL
    Deps:    Steps 6a-6d
    Check:   npm run build (exit 0) THEN build-deploy.py --target sandybrown --blocks-only THEN a
             Playwright editor login sampling ONE ROW PER MECHANISM — fill, text, border, overlay,
             shadow (5 rows, NOT 1) — with at least one from a Step-6 agent's own block and one
             from a Step-5a shared row, so the per-block and shared-component paths are each proven
             live. For each: pick a palette colour, save, RELOAD, assert the stored attribute is the
             SLUG, and confirm a hover repaints under a real pointer.
             ⛔ One sample proves one mechanism round-trips and says nothing about the other four.
             The dominant risk here is a sibling attribute left undeclared, which WP discards
             silently — a single spot-check cannot see it across independently-edited block sets.
    Pass:    Build exit 0; stored value is a slug not a hex; hover repaints under a real pointer
    Fail:    A value lost on reload means an undeclared sibling attribute — find it, do not baseline
    Marker:  QA

## Step 7 — Ratchet down + docs

    Model:       inline
    Action:      Lower rule 31's openBacklog to the new measured floor with a stated reason. Write
                 the D-entry. Update the LEDGER. Write the visual-diff evidence report.
                 ⛔ COMMIT SCOPING (S-7): list every filename literally on the `git commit -- …`
                 line. A GLOB over a shared directory is `git add -A` wearing a pathspec — that is
                 exactly how `87d904a6` swept a co-active track's half-done edit and left `main`
                 fatal for ~5 minutes. `--amend` is also banned here: it flushes the WHOLE index,
                 ignoring the original pathspec (STOP-GIT-COMMIT-AMEND-IGNORES-THE-ORIGINAL-PATHSPEC).
                 Re-check `git branch --show-current` IN THE SAME COMMAND as the commit.
    Files:       scripts/inspector-scan/rules.json, .claude/decisions.md, .claude/LEDGER.md,
                 reports/visual-diff/
    Inputs:      QA Gate C results
    Outcome:     `handoff-preflight.py --check` passes all 10; ratchet at the measured floor
    Exec:        SEQUENTIAL
    Deps:        QA Gate C
    Marker:      HANDOFF
    Time:        20 min
    Tooling:     Bash, python
    On-Fail:     Do not lower the ratchet below a measured value
    Test:
      Happy:       preflight 10/10; ratchet --check exits 0
      Edge:        Ratchet one below live -> exits 1 (prove it still bites)
      Fail:        A stale count in any doc -> the doc names the command instead
      Integration: pushed to origin/main

---

## Key Judgement Calls

### Primary decisions

- **Decision:** Does Wave 2 (per-block migration) run in worktrees or on the shared tree?
  - **Options:** [A] shared tree, disjoint file sets, no agent touches git · [B] one git worktree per agent
  - **Recommendation:** **[A]**
  - **Why:** Worktrees cost node_modules per agent and this session proved disjoint-file-set discipline works across 6 agents. The failure today came from a GLOB commit, not from shared files.
  - **Cost of wrong choice:** Two agents editing one file — caught by the coordinator's `git diff --stat` before commit.
  - **Who decides:** architect (taken)

- **Decision:** What if Step 3's mechanism-aware assertion RAISES the total?
  - **Options:** [A] treat as regression, revert · [B] accept, re-baseline with a stated reason
  - **Recommendation:** **[B], with the composition ENUMERATED**
  - **Why:** Finding wrongly-wired rows is the point. A rise means the detector started seeing real defects it was blind to. But the rise must be enumerated finding-by-finding, never inferred from a total.
  - **Cost of wrong choice:** Reverting a working detector because its number went up — the exact mistake this project made and corrected on 2026-08-20.
  - **Who decides:** Bean

## Pre-emptive decisions (Hidden Decisions pass — 2 cold reviewers, 2026-08-22)

⛔ **VERDICT: the plan is NOT executable as first drafted.** The literal reviewer found 8 ambiguous
instructions; the senior reviewer could execute only **2 of 7 steps** without stopping to ask. Both
independently found the same wrong file path. Every item below is pre-answered so execution never
pauses on it.

### P-1 [BLOCKER, both reviewers] The GridItemDefaultsPanel path was WRONG — FIXED in Step 5

Real path: `src/blocks/container/components/GridItemDefaultsPanel.js`. The plan said
`src/components/`. **The consequence was not a stall but a silent fork:** `resolveComponentFiles()`
scans BOTH directories with no de-duplication, so an agent creating the file at the wrong path
would produce two copies of a component reaching 20 blocks — one live, one stale.

### P-2 [BLOCKER, measured by the coordinator] Step 2's resolver is blind to MOST of the tree

The plan assumed a per-block `render.php` text scan resolves each row's paint mechanism. Measured
across all 83 blocks:

| render.php pattern | Blocks |
|---|---|
| Calls a colour helper DIRECTLY | **25** |
| Routes via `SGS_Container_Wrapper::render()` | **18** — the helper call lives in a shared file the per-block scan never reads |
| Neither | **40** — no recognisable colour paint call at all |

⭐ **All three reference blocks (`container`, `heading`, `button`) are in the resolvable 25.** The plan
generalised from a sample drawn entirely from the resolvable end.

⛔ **PRE-ANSWER SUPERSEDED 2026-08-22 — the measurement above still stands, the prescription does
not.** This originally said "Step 2 MUST gain a PHP shared-owner resolver", mirroring
`reachedComponents()` for shared JSX. Bean steered to declarative routing instead, and it dissolves
the blocker rather than engineering around it.

**Step 2 now reads `block_attributes.css_property` — a DB column that already exists and already
answers the question the scan was trying to ask.** MEASURED: populated for **320 of 439** colour
attributes (73%), mapping cleanly onto the five mechanisms — including `stroke` (13), the "unnamed
helper family" a tracer flagged on `sgs/business-info`.

Three reasons the scan was the wrong shape, not merely an insufficient one:
1. **It could not have worked.** The wrapper contains ZERO calls to `sgs_background_paint_decl` or
   `sgs_text_colour_decl`, so wrapper-routed blocks could never resolve fill or text.
2. **It missed the dominant pattern.** Most of the 40 "neither" blocks paint via a bare
   `sgs_colour_value()` hand-embedded in a CSS string (`team-member:544`, `label:138`).
3. **It was off-pattern.** R-31-1 requires DB-first, no hardcoded dicts. A hand-maintained regex
   vocabulary of helper names inside a lint rule is exactly the lookup that rule bans.

**The residue is DATA, not code: 119 colour attributes have an empty `css_property`.** That is a
seeding worklist with an enumerable size, which the scan's blind spots never were.

### P-3 [BLOCKER, senior reviewer] Step 5's ShadowControl half is mis-sized by an order of magnitude

`ShadowControl.js:212-217` renders a bare single-value `DesignTokenPicker` — no `states` array, and
`enableAlpha` is ON (the same token-corruption path D717 closed for the overlay). Reaching the
2-state floor means: a new colour-prop pair on the component (an API change), a new sibling
attribute declared in EVERY mounting block's `block.json`, AND a real `:hover` CSS rule in each
block's `render.php` — or the control is dead under HC2 and `check-dead-controls.js` fails the
build. `render.php` was never in Step 5's Files list.

**Pre-answer: SPLIT.** Step 5a = `GridItemDefaultsPanel` (3 direct mounts, ~45 min, as planned).
Step 5b = `ShadowControl` hover — its own step, `render.php` explicitly in scope, sized only AFTER
enumerating its direct call sites. **Do not run 5b inside this phase's time budget without
re-sizing it first.**

### P-4 [MAJOR, senior reviewer] Nobody fixes a newly-discovered miswired row

Step 3 teaches the detector to SEE rows wired to the wrong mechanism. No step repairs them.
**Pre-answer:** insert **Step 3b — triage and fix newly-flagged miswired rows**, sized after Step 3
actually runs. Enumerated, never estimated.

### P-5 [MAJOR, literal reviewer] "Classify by kind" was not runnable — FIXED by new Step 2a

Verified: rule-31 findings carry `{rule, checklistItem, block, file, line, severity, detail, fix,
key, status}` — **no `kind` field**. "Classify by kind" meant "grep a substring you invent", and two
agents would draw the boundaries differently. Step 2a now adds the field before QA Gate B needs it.

### P-6 [MAJOR, literal reviewer] "At its recipe" was undefined against the gate

A recipe records `{paintHelper, rowShape, requiredSiblings, livesAs}`, but rule 31 asserts only
state-count, gradient presence, native-UI and roster-surface. **`rowShape` and `livesAs` are NOT
enforced by any rule.**
**Pre-answer:** the checkable definition of "at recipe" is **0 rule-31 findings for that row**.
`rowShape`/`livesAs` are migration GUIDANCE, not gates. Agents must not burn time trying to make
them checkable.

### P-7 [MAJOR, literal reviewer] "Report per-row why not" had no acceptance boundary

**Pre-answer:** a `missing-gradient` "why not" is acceptable ONLY as a new `colourExemptions` entry
with a real, block-specific, non-boilerplate reason. **Any other finding kind has no exemption
mechanism in the schema at all** — a "why not" there is an unfixed defect and MUST escalate to the
coordinator, never close as a report.

### P-8 [MAJOR, both reviewers] QA Gate C's single sample repeats a known failure mode

One live row proves one mechanism round-trips. The family has five.
**Pre-answer:** QA Gate C samples **one row per mechanism** (fill, text, border, overlay, shadow) —
at least one from a Step-6 agent's block and one from a Step-5 shared row, so the per-block and
shared-component paths are each proven live. This project's own memory carries
`a-weak-assertion-converts-untested-into-tested-and-green`; a single spot-check here would repeat it.

### P-9 [MINOR, senior reviewer] Step 5 / Step 6 ownership boundary

`post-grid`, `testimonial`, `trust-bar`, `before-after` mount `ShadowControl` directly and are split
across Step-6 groups b and c, while Step 5 also touches their `block.json`.
**Pre-answer:** Step 5's completion report must LIST every block it touched, and the Step-6 prompts
must say "shadow row pre-cleared for X, Y, Z — verify only, do not re-touch."

### P-10 [MINOR, literal reviewer] Step 6's worklist had no artefact path

**Pre-answer:** QA Gate B writes `reports/qa-gate-b-worklist.json`; each Step-6 agent's Cold-Entry
names that path and filters to its own blocks.

