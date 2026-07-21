**Invoke `/autopilot` before anything else.** Then read this end-to-end.

> `main` is SHARED with a co-active Track 2 (Spec 36 header/footer/nav). Track 2 owns
> `LEDGER.md`, the D-numbering cadence in `decisions.md`, and
> `next-session-prompt-nav-rework-P2.5.md`. **This file is Track 1's (Spec 35) prompt.**
> Path-scope every commit; re-check `git branch --show-current` in the SAME command as the
> commit; NEVER `git add -A`. The commit gate REJECTS a bare `git commit` — it requires an
> explicit `-- <paths>` pathspec.

## Agent identity

You are continuing Spec 35: making every SGS block's editor sidebar complete and
consistent, so a non-coder client can self-serve and Bean is QC only.

## State recap (plain English)

Every SGS block carries an "element manifest" — a machine-readable description of which
parts it renders and which settings control each part. A linter reads those manifests and
reports OK / GAP / ORPHAN, plus a separate states axis.

The rollout is DONE (67 of 80 blocks). The resting-state defect class is CLOSED.

**Last session built the mechanism that replaces name-guessing with code-derivation — and
then deliberately did NOT ship its data, because a gate proved the data was the wrong
shape.** Read that twice before re-running anything: the code is committed and verified;
`css_property` is intentionally NULL. Your job is to design the key that makes it usable.

## Where things stand (verified 2026-07-21, all pushed to main)

| Commit | What |
|---|---|
| `68906425` | ORPHAN split by DB role + 15 style attrs claimed |
| `3b04d3d1` | handoff — orphan triage |
| **`8a5b6ac4`** | **emission-derived classifier (CODE ONLY — data withheld)** |

**Live baseline (unchanged, and that is correct):**
```
Blocks with a manifest: 67 | skipped: 13
Members checked: 3883 | OK: 1003 | GAP: 2880
ORPHAN: 93 — by design: 42 | style-property defects: 2 | UNCLASSIFIED: 49
STATE_OK: 50 | STATE_GAP: 0 | STATE_WITHOUT_BASE: 0
css_property: 0 | css_layer: 0 | inspector_control_type: 879
DB-as-code gate: 0 NEW findings
```

**WHAT "GOOD" LOOKS LIKE — read before chasing any number down.**
Zero was NEVER the target for ORPHAN or GAP.
- `by design` — whatever it naturally is. **Never chase to zero.**
- `style-property defects` — **0**. Real work.
- `UNCLASSIFIED` — **0**, but most are by-design and mis-bucketed.
- `GAP` — stays high permanently. A queryable catalogue, NOT a backlog.

## First action (<5 min)

```bash
node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js
python plugins/sgs-blocks/scripts/db-consistency/run.py --report
```
The first must match the baseline above. The second must report **0 NEW findings**. If the
second shows findings, someone re-populated `css_property` — read Task 1 before touching
anything.

## Tasks

### Task 1 — Design the (element, state, tier) key for css_property (THE FRONT)

**What:** decide how a derived CSS property is KEYED so it can be routed by, then re-run the
classifier to write keyed data.

**Why this is the front.** The classifier works — 54 disagreements were hand-traced by an
independent rater with ZERO derivation errors. But a bare property string is under-keyed. A
trial population of 532 rows tripped the Spec-31 F5 DB-as-code gate with 106 NEW
routing-determinism findings. All 106 were investigated. **All 106 are false positives with
one shared root cause:**

| Category | Count | Example |
|---|---|---|
| responsive tiers | 37 (35%) | `columnsDesktop`/`columnsMobile`/`columnsTablet` → `grid-template-columns` |
| states | 24 (23%) | `linkColour`/`linkHoverColour` → `color` |
| different elements | 45 (42%) | `nameColour` vs `textColourHover` → `color` |

Three attributes legitimately drive the same CSS property — at different breakpoints, states
or elements. **The gate's suggested fix ("rename or remove one") would DESTROY the
device-tier responsive system CLAUDE.md documents as core architecture. Do not apply it. Do
not baseline these findings** — the gate explicitly warns against blind baselining, and doing
so buries 106 real signals.

**Two further defects in the trial data, same root cause:**
1. **Shorthand vs longhand.** 64 of 532 rows recorded a CSS *shorthand* (`background`,
   `border`, `outline`) where manifest cluster members expect the longhand
   (`background-color`). Inconsistent because it faithfully records whatever each stylesheet
   author wrote: 57 rows say `background-color`, 10 say `background`.
2. **Value type is not the delivery property.** `tabs tabIndicatorColour` resolves to
   `box-shadow`. That is TRUE and UNUSABLE. `render.php:84` places it in `$colour_props` and
   applies `sgs_colour_value()` — it is a **colour**, delivered via an inset box-shadow
   underline. Fed to Task 2 it maps a colour picker onto a shadow member.
   (Caught by Bean. Neither reviewing rater caught it — they asked "is it accurate?", Bean
   asked "is it usable?".)

**The materials already exist — check before inventing.** `block_attributes` already carries
`is_responsive`, `derived_selector` (element) and `css_layer`. The manifest cluster system
already keys members by element + cluster + member + state. **Query the schema before
proposing a new column** (R-31-8 / STOP-SCHEMA-ENUMERATION-FIRST).

**Estimated time:** 30 min design gate + 30 min build.

**Orchestration**
- Execution: **DESIGN GATE FIRST — `/brainstorming`, inline, with Bean.** Do NOT build before
  he signs off. The open question is his: does the key REUSE the manifest's existing
  (element, cluster, member, state) vocabulary, or introduce a parallel scheme? Reusing is
  strongly preferable — a parallel scheme is how `role` came to conflate two axes.
- Then: **delegated** build, Model **sonnet** via `/delegate`, single agent.
- Brief: extend the Task A writer in `extract-signatures.py` so each resolved property is
  written with its element / state / tier discriminators, and normalise shorthands to the
  longhand the consuming declaration actually sets.
- Context the subagent will not have: the DB is SHARED with the cloning converter. The script
  has FOUR write statements (`:492` output_signature, `:1051` css_property, `:1057`
  css_layer, `:1321` inspector_control_type) and NO path writing `role`, `canonical_slot` or
  `derived_selector` — keep it that way.
- `/qc` gate after: yes — `/qc-council`.

**Acceptance:** the DB-as-code gate reports **0 NEW findings with `css_property` POPULATED**.
That is the falsifiable signal — it is exactly what failed last session. Plus:
`tabIndicatorColour` carries a value type of colour, and the 64 shorthand rows resolve to
longhands.

### Task 2 — Auto-generate attrMap entries (BLOCKED on Task 1)

**What:** use the keyed CSS property to GENERATE manifest `attrMap` entries.
**Why:** of 17 style-role orphans fixed previously, 13 were declaration gaps where the member
already existed and nobody had written the mapping.
**DO NOT START BEFORE TASK 1'S GATE IS GREEN.** Run against a bare property string and it
generates silently-wrong entries — and the counter FALLS, looking like progress.
**Estimated time:** 30 min.

**Orchestration**
- Execution: **delegated**, sonnet. Depends on Task 1.
- Brief: generate CANDIDATE entries to a report. Do NOT auto-apply to block.json.
- `/qc` gate after: yes — spot-check against render code before applying any.

**Acceptance:** a candidate list reviewable in 10 minutes; 10 verified correct against code
before anything is written to a manifest.

### Task 3 — Re-evaluate the 49 UNCLASSIFIED (BLOCKED on Task 1)

**What:** reclassify with the keyed source available.
**Why:** most are genuinely by-design (`helpText` x6, `emptyMessage`, `excerptLength`,
`featuredItemIds`, `headingRole`, `attributionEnabled`, `connectorStyle`, `captionTag`).
**Measured last session:** 37 of 49 sit in blocks that emit `--sgs-*` custom properties; the
other 12 do not — and those 12 are exactly the by-design content attributes. Absence of
custom-property emission is itself evidence.
**Estimated time:** 15 min. Depends on Task 1.

**Acceptance:** UNCLASSIFIED contains only attributes the analysis genuinely cannot resolve,
each named with a reason.

### Task 4 — Consolidate the duplicate var-resolver (independent, low priority)

`_build_php_var_attr_map` (`extract-signatures.py:686-750`, 65 lines) duplicates the 6-line
`_build_var_map` (`:167-172`). Both answer "which attribute does this PHP variable hold?".
The new one handles `isset`/ternary/cast wrapping and multi-hop that the original misses, so
**the fix is to EXTEND the original, not delete the new one** — deleting it breaks
`separator contentIconSize`. Consolidating changes the `output_signature` path (1,298 rows),
so it needs its own before/after measurement. **Estimated time:** 20 min. Independent.

## Dependency graph

```
Task 1 DESIGN GATE (/brainstorming, inline, Bean signs off the key)
        ↓
Task 1 BUILD (sonnet) → /qc-council → DB-as-code gate MUST be 0 NEW with data populated
        ↓
Task 2 (attrMap candidates)  ‖  Task 3 (reclassify the 49)  ‖  Task 4 (independent)
        ↓
regenerate attr-role-map.json, re-run linter, commit path-scoped with -- <paths>
```

## Commit gates that apply to THIS track

Tasks 1-4 are Python + DB + `block.json` metadata. **None of them should touch `style.css`,
`render.php` or `edit.js`** — if you find yourself editing one, stop and re-read the task.

- **Visual-diff gate** — fires only on `style.css` / `render.php` / `edit.js`. Metadata-only
  `block.json` changes (Task 2's attrMap entries) are N/A; the gate's own message documents
  `--no-verify` for those, and that is legitimate. **Verify the diff really is metadata-only
  first, and say so in the commit.** Using `--no-verify` for a RENDERING change is not.
  Note it reads the WORKING TREE, not just the staged set — an unrelated dirty file for a
  gated block blocks the commit (`git stash push -- <path>` and commit the rest).
- **DB-as-code gate** (`db-consistency/run.py`) — THE gate for this track. It is what caught
  the under-keyed data. Task 1's acceptance is this gate reporting 0 NEW with data populated.
- **Path-scoped commit gate** — requires `-- <paths>`; a failure RESETS the staged index.
- **Oldshape gate** — checks STORED CONTENT. Only fires if you delete an attribute.
  Rendering-dead is NOT the same as storage-safe.

The full deploy / isolated-worktree / md5-verify loop lives in `.claude/STOP-CATALOGUE.md`.
It is not reproduced here because this track's tasks do not deploy. If a task unexpectedly
reaches rendering, read it there first — do NOT improvise a deploy.

## Structural defences (carry forward, never subtract)

- **STOP-COUNTS-FROM-THE-TOOL-NOT-THE-AGENT** — re-derive every number from `--json`.
- **STOP-VERIFY-SUBAGENT-FACTS** — 2026-07-21 (part 2): the building agent reported as a
  "critical finding" that `/sgs-update` WIPES `css_property`. **False** — empirically
  disproved (522 rows before a full reseed, 522 after). Acting on it would have meant
  rewriting `sgs-update-v2.py` for nothing. A *different* claim by the same agent (six
  self-found bugs) checked out — `:586` documents a real `https://schema.org` truncation at
  `audio/render.php:110`. **Test each claim separately; never trust or bin a report wholesale.**
- **STOP-FACT-CHECK-YOUR-OWN-OUTPUT** — the MAIN THREAD made errors of this shape again on
  2026-07-21: reported a missing file that was actually a wrong `cwd`; flagged
  `brand-strip columnsDesktop → height,max-width,width` as an obvious defect when hand-tracing
  proved the code RIGHT (a genuine 2-hop chain via `style.css:16` → `:33`/`:148`). **When a
  result reads as a FAILURE, suspect the measurement before the code.**
- **STOP-VERIFY-WIDER-THAN-THE-AGENT-DID** — re-running an agent's own method on its own scope
  is not verification. A colour-mismatch probe found "only 2 cases" because it detected just
  ONE of three emission shapes (3 of 80 blocks). Widening changed the answer.
- **STOP-NEGATIVE-CONTROL** — "would this still pass if the feature were absent?"
- **STOP-UNDER-KEYED-DATA IS UNUSABLE DATA** *(new, 2026-07-21)* — a derived value can be 100%
  ACCURATE and still be wrong to ship. `tabIndicatorColour → box-shadow` is true and unusable;
  106 gate findings came from property strings that could not express tier / state / element.
  **Before writing a derived value, ask what it must be KEYED BY to be routed by.** Accuracy
  is necessary, not sufficient.
- **STOP-DONT-BASELINE-A-GATE-YOU-HAVENT-EXPLAINED** *(new, 2026-07-21)* — the F5 gate's own
  message says "Do NOT blindly baseline without understanding each finding." All 106 findings
  were false positives, and baselining would have buried the single root cause blocking Task 2.
  A gate firing on NEW findings is evidence about your data, not an obstacle to route around.
- **STOP-CLUSTER-WITHOUT-PREFIX-OR-ATTRMAP** — a cluster declared on an element with neither a
  prefix nor an attrMap resolves ZERO members and makes the score WORSE (+36 GAP measured).
  **Inverse also bites:** an `attrMap` entry for a member whose CLUSTER is not declared on that
  element is never consulted — it looks correct and silently does nothing.
- **STOP-FALSY-EMPTY-STRING** — an explicit empty-string prefix is legitimate; test
  `!== undefined`, never truthiness.
- **STOP-DECLARE-DONT-PARSE-NAMES** — `tabActive*` means `[aria-selected="true"]`, NOT CSS
  `:active`. `pauseOnHover` / `effectHover` / `imageZoomHover` / `grayscaleHover` are BOOLEANS.
  **This applies to the DB too** — `role` is name-derived, and 2026-07-21 proved the cost:
  `option-picker pillBorderRadius` carries `role='typography'` because the parser saw `pill*`
  alongside `pillFontSize`. Border-radius is not typography.
- **STOP-OWNERSHIP-BOUNDARY** — a block may only declare/de-hardcode styles for markup it
  actually EMITS. `content-collection` and `testimonial-slider` delegate to child blocks via
  `render_block()`; `card-grid` does the same in `wc-product` mode. Record the boundary in an
  `_ownership_note`.
- **STOP-CHECK-PATTERNS-AND-TEMPLATES-BEFORE-DELETING-ATTRS** — deleting a block attribute is
  not finished when render code stops using it. Theme PATTERNS (`theme/sgs-theme/patterns/*.php`)
  and the block's own InnerBlocks TEMPLATE in `edit.js` also write attributes. The oldshape gate
  scans stored post content, NOT pattern source or editor templates — it cannot catch this.
- **STOP-SCHEMA-ENUMERATION-FIRST** *(new, 2026-07-21)* — before proposing a new column, query
  what exists. `css_property` and `css_layer` were already in `block_attributes` at 0%
  populated, waiting; `is_responsive` and `derived_selector` already carry two thirds of the key
  Task 1 needs. (R-31-8.)
- **STOP-NO-VERSION-BUMPS / NO-DEPRECATIONS** (D270/D293) — pre-production.
- **STOP-29 / SPEC-SCOPE-BINDING** — definition-of-done is the spec's FULL scope. Map every
  deferral to a named spec STAGE; never "out of scope".
- **STOP-BARE-COMMIT-REJECTED** *(new, 2026-07-21)* — `git commit` without `-- <paths>` is
  REJECTED by the path-scoped-commit gate while two threads share `main`. A failed gate also
  RESETS the staged index — re-`git add` before retrying.
- Bash tool is POSIX sh: PowerShell here-strings are taken LITERALLY and corrupt commit
  messages. Use a real heredoc or `-F <file>`. Nested heredocs in one command break parsing.

## Pre-flight ritual (answer before the first Write/Edit)

1. Am I on `main`, and is my next commit path-scoped away from Track 2's files
   (`LEDGER.md`, `next-session-prompt-nav-rework-P2.5.md`, `src/blocks/site-*`,
   `adaptive-nav`, `includes/class-sgs-mega-menu-cpt.php`) — with an explicit `-- <paths>`?
2. Am I about to touch a shared component or shared mechanism? → design-gate it and plan to
   live-verify. (Anything writing the DB the cloning converter reads fires this.)
3. Am I editing `style.css` / `render.php` / `edit.js`? → this track's tasks should not.
   Stop and re-read the task before continuing.
4. Is anything I am about to report a subagent claim? → re-derive it from the tool first,
   claim by claim, not the report as a whole.
5. Am I about to declare a cluster or a state? → does the element have a `prefix`, an
   `attrMap`, or a `layer` to make it resolve — AND is the member's cluster declared on that
   element — or will it silently do nothing?
6. Am I about to state a diagnostic value? → have I confirmed WHICH file, element, directory
   or creation-path that output describes?
7. Am I about to DELETE an attribute? → have I checked theme patterns and the block's own
   `edit.js` InnerBlocks template, not just render code?
8. *(new)* Am I about to WRITE a derived value to the DB? → what must it be KEYED BY to be
   routed by (element / state / tier)? An accurate but under-keyed value is not shippable.
9. *(new)* Did a gate just fire on NEW findings? → have I explained EVERY finding before
   considering a baseline? A gate firing is evidence about my data, not an obstacle.

## Mandatory READING (tiered)

**Tier 1 — before any edit:**
- `.claude/plans/2026-07-20-spec-35-cluster-vocabulary-rework-design.md` (FR-35-1..6 IN FULL)
- `plugins/sgs-blocks/scripts/consistency/cluster-member-sets.json` `_meta` (all notes)
- `plugins/sgs-blocks/scripts/check-element-manifest-conformance.js` header comment
- `.claude/STOP-CATALOGUE.md`

**Tier 2 — for Task 1 specifically:**
- `plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py` — the script to
  extend. Read `_resolve_var_chain` (`:658-683`) and the Task A writer (`:1015-1060`).
- `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` — the name-derived
  mechanism (read its docstring, especially step 4)
- `plugins/sgs-blocks/scripts/db-consistency/run.py` + `check_css_property_reseed.py` — the
  gate that must return 0 NEW with data populated
- `.claude/reports/emission-derived-classification-2026-07-21.md` + `-raw.json` — last
  session's full machine-readable output
- `plugins/sgs-blocks/scripts/generate-attr-role-map.py` + `consistency/attr-role-map.json`
- `plugins/sgs-blocks/src/blocks/tabs/{render.php,style.css}` — the worked chain
  (`render.php:84-100` `$colour_props` + `sgs_colour_value` → `style.css:120` box-shadow).
  **This is the canonical example of value-type vs delivery-property.**

**Tier 3 — context:**
- Worked exemplars: `container` (4-layer), `card-grid` (states + resting-base fix), `quote`
  (content-KIND), `tabs` (states via attrMap), `content-collection` (`_ownership_note`),
  `nav-menu` (6 elements)
- `reports/visual-diff/*-2026-07-21.md`
- `CLAUDE.md` binding rules R-31-1..15 (especially R-31-8, schema enumeration)
- `.claude/decisions.md` head (Track 2 owns the cadence)

## Tool bindings

| Skill | When |
|---|---|
| `/brainstorming` | Task 1's design gate — MANDATORY before building |
| `/strategic-plan` | if the key design turns out to touch more than `extract-signatures.py` |
| `/qc-council` | Task 1 — it changes a shared DB-writing script |
| `/gap-analysis` | grade Task 2's candidate list before applying any of it |
| `/research` | gold-standard check on keyed static-analysis schemas before designing |
| `/lifecycle` | only if a skill / agent / pipeline changes |
| `/library-docs` | reference docs for any parsing library considered |
| `/sgs-db`, `/wp-blocks` | DB is authoritative — never hardcode a count |
| `/delegate` | route every dispatch |
| `/dispatching-parallel-agents` | Tasks 2 + 3 + 4 once Task 1 lands |
| `/verify-loop` | 2-attestation on any load-bearing claim |

| Agent | When |
|---|---|
| `wp-sgs-developer` | Tasks 1, 2, 3. Constrain: no deploy, no git commit |
| `feature-dev:code-reviewer` | bloat / dead-code review of any large addition |

| MCP / tool | For |
|---|---|
| Playwright MCP | live verification if any task reaches rendering |

Canary creds (always available): `.claude/secrets/sandybrown.env`. NOTE the password contains
shell metacharacters — parse the file in Python, do NOT `source` it. Deploy:
`build-deploy.py --target sandybrown --blocks-only` from an ISOLATED worktree. SSH alias
`ssh hd`.

## Open, unresolved

- **`css_property` needs an (element, state, tier) key** — Task 1. THE blocker.
- **94 `inspector_control_type` disagreements, 18 audited.** Of the 18 hand-traced, **15
  showed the PRE-EXISTING value was wrong** (e.g. `media videoPosterId` stored as `Button`;
  `edit.js:431-435` shows it bound to `<MediaUpload>` with a Button nested inside its render
  prop). 3 are genuinely dual-bound — two components conditionally render the same attr
  (`filter-search attributeId`, `hero gridTemplateColumns`). **76 unaudited.** Bean chose to
  leave all 94 until a full audit — do not overwrite 94 rows on an 18-row sample.
- **`role` is name-derived and 65% NULL. Do NOT "fix" it yet.** The cloning converter queries
  it directly (`converter/db/db_lookup.py:588`, `attr_is_colour_role()` runs
  `WHERE role='color'`). Once `css_property` is keyed, `role='color'` becomes verifiable
  against evidence — fix it then, with proof rather than a second guess.
- **`canonical_slot` / `derived_selector` share `role`'s name-derived provenance** and are read
  by ~25 live converter files (`recognition.py`, `walk.py`, all four resolvers). Replacing them
  is a Spec 31 change with cloning blast radius — worth doing, deliberately, in its own
  session. Not Spec 35 work.
- **`css_layer` populated only 6 rows of 2,817** in the trial (all `CONTENT`). Decide in Task 1
  whether it is part of the key or should be dropped from scope.
- **2 style-property defects remain**, both deliberate one-offs: `mega-menu panelWidth` (a
  variant MODE selector, not a raw value) and `quote attributionMarginUnit` (a companion unit
  picker). Neither should be forced into the vocabulary.
- **Editor-canvas verification is outstanding across the board.** Everything was verified by
  frontend render + REST attribute registration, NEVER by opening the block editor. The
  `sgs/label` template fix especially deserves an eye: insert a hero, confirm the eyebrow label
  seeds with text. `ShadowControl` has crashed on first live render despite passing 180 unit
  tests (R-31-13).
- **`.sgs-hero__ctas` (PLURAL) is live draft-side vocabulary** — the cloning converter
  recognises it in SGS-BEM mockups and maps it to `sgs/multi-button`
  (`converter/recognition.py:83`, with a test). Do not purge it. `.sgs-hero__cta` (SINGULAR)
  was dead and is gone.
- **`product-card` example `priceNote: "8-pack · Free delivery over £35"`** — left as generic
  e-commerce rather than client-specific. Bean's call if he wants it neutralised.
