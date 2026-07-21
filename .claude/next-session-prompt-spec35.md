# Spec 35 — next session

**Invoke `/autopilot` before anything else.** Then read this end-to-end.

> `main` is SHARED with a co-active Track 2 (Spec 36 header/footer/nav). Track 2 owns
> `LEDGER.md`, the D-numbering cadence in `decisions.md`, and
> `next-session-prompt-nav-rework-P2.5.md`. **This file is Track 1's (Spec 35) prompt.**
> Path-scope every commit; re-check `git branch --show-current` in the SAME command as the
> commit; NEVER `git add -A`.

## Agent identity

You are continuing Spec 35: making every SGS block's editor sidebar complete and
consistent, so a non-coder client can self-serve and Bean is QC only.

## State recap (plain English)

Every SGS block carries an "element manifest" — a machine-readable description of which
parts it renders and which settings control each part. A linter reads those manifests and
reports OK / GAP / ORPHAN, plus a separate states axis.

**The rollout is DONE** (67 of 80 blocks; the other 13 are accounted for). **The
resting-state defect class is CLOSED** (STATE_WITHOUT_BASE 0). The orphan list has now been
triaged for the first time and split into honest categories.

**The remaining work is no longer manifesting blocks — it is fixing the classification
layer underneath**, which is name-derived and fails silently. That is Task 1.

## Where things stand (verified 2026-07-21, all pushed to main)

| Commit | What |
|---|---|
| `a72a3c2d` | FR-35-5 states axis + FR-35-6 animation cluster |
| `42a34700` / `aee121be` | Rollout waves 2 + 3 — 36 blocks |
| `6ea12136` / `726da506` / `efec9359` | Resting-state fixes: card-grid, tabs, team-member, nav trio |
| `03096e97` | hero dead-CTA purge, mega-menu badge wired, tabs cluster gap |
| `2f409b30` | 12 blocks de-clientised, residual hero CTA CSS purged |
| `68906425` | ORPHAN split by DB role; 15 style attrs claimed; staleness counter |

**Live baseline:**
```
Blocks with a manifest: 67 | skipped: 13
Members checked: 3883 | OK: 1003 | GAP: 2880
ORPHAN: 93 — by design: 42 | style-property defects: 2 | UNCLASSIFIED: 49
  (+ orphan_role_map_stale: 0)
STATE_OK: 50 | STATE_GAP: 0 | STATE_WITHOUT_BASE: 0
```

**WHAT "GOOD" LOOKS LIKE — read this before chasing any number down.**
Zero was NEVER the target for ORPHAN or GAP, and a previous session failed to say so, which
sent Bean chasing both to zero. Correct targets:
- `by design` — whatever it naturally is. **Never chase to zero.** Most block settings are
  content and variant choices (`helpText`, `cardStyle`, `iconSource`), not CSS.
- `style-property defects` — **0**. Real work.
- `UNCLASSIFIED` — **0**, but see Task 1: most of these are by-design and mis-bucketed.
- `role map stale` — **0**. One command fixes it.
- `GAP` — stays high permanently. No block should implement all 54 style properties. It is
  a queryable catalogue ("which blocks can't do X?"), NOT a backlog to burn down.

## First action (<5 min)

`node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js`

Read the summary line. That is the baseline every task below moves.

## Tasks

### Task 1 — Emission-derived attribute classification (THE FRONT — Bean-directed)

**What:** teach the behavioural analyser to follow an attribute all the way to the CSS
property it actually drives, and make that the canonical source for classification.

**Why this is the front, in Bean's words:** attribute names are arbitrary custom names, but
something in the code wires each one to the exact setting it impacts — and *that* is what
tells us what applies. He is right, and it is the bottleneck behind most of this project.

**The chain, using a real verified example:**
```
block.json  "tabIndicatorColour"                          <- arbitrary name, tells you nothing
render.php  'tabIndicatorColour' => '--sgs-tab-indicator' <- THE WIRING (tabs/render.php:89)
style.css   box-shadow: inset 0 -2px 0 var(--sgs-tab-indicator, transparent)
                                                          <- the REAL property (style.css:120)
```

**The current mechanism and why it fails.** `block_attributes.role` is produced by
`scripts/behavioural-analyser/assign-canonical.py`, which **peels a suffix off the attribute
NAME** and looks it up in `property_suffixes` (see its docstring step 4). That is
name-parsing — the exact thing this project banned at the manifest layer after `tabActive*`
fooled it (STOP-DECLARE-DONT-PARSE-NAMES). It fails **silently toward NULL**, so these all
land in the same bucket as `helpText`, which genuinely is not a style:
  `ctaPaddingX` (padding) · `contentIconColour` (a colour) · `contentIconSize` (a size) ·
  `formFocusRingColour` / `Width` / `Offset` / `Opacity` (real focus-ring CSS)

**Coverage today — measured, not estimated:**
| Column | Source | Populated |
|---|---|---|
| `role` | attribute NAME suffix | 979 / 2817 (35%) |
| `output_signature` | render.php / save.js | 1219 / 2817 (43%) |
| `emit_shape` | render analysis | 122 / 2817 |

**Of the 49 UNCLASSIFIED orphans — the breakdown matters, because the two failure modes need
DIFFERENT fixes** (an earlier draft of this doc collapsed them and would have pointed you at
the wrong half; caught by QC 2026-07-21):

| Situation | Count | What it means | Fix |
|---|---|---|---|
| signature EXISTS, `is_content_or_design` is NULL | **28** | the extractor RAN and could not decide | improve the extractor's REASONING — extending its reach does nothing here |
| no signature row at all | **15** | the extractor never covered this attribute | extend its COVERAGE |
| classified `design` | 4 | it decided | — |
| classified `content` | 2 | it decided | — |

Reproduce with: join the orphan list to `block_attributes`, then
`json_extract(output_signature,'$.is_content_or_design')` — distinguish a NULL column from a
NULL field INSIDE the JSON. They look identical if you only test the column.

**The one hop that is missing.** `extract-signatures.py` already reads render.php and
records HOW an attribute is emitted (`php-render`, `esc_attr`, `output_role`,
`is_content_or_design`) and WHICH selector it lands on (`derived_selector`). It does NOT
follow the `--sgs-*` custom property into `style.css` to learn WHICH CSS PROPERTY it drives.
That final hop is the whole game — `--sgs-tab-indicator` is meaningless until you find
`box-shadow: … var(--sgs-tab-indicator)`.

**Estimated time:** 45 min (a static-analysis pass over ~80 blocks + a new DB column).

**Orchestration**
- Execution: **DESIGN GATE FIRST — `/brainstorming`, inline, with Bean.** Do NOT build
  before he signs off. Two open decisions are his, not yours:
  1. **Precedence.** Recommendation from the previous session: emission-derived becomes
     canonical for "what CSS property does this drive", and name-derived `role` DEFERS to it
     on disagreement. But `role` must NOT be ripped out — `assign-canonical.py` uses the same
     suffix-peel to produce `canonical_slot` and `derived_selector`, which the **cloning
     converter (Spec 31)** depends on. This spans two specs.
  2. **Disagreement handling.** Where name says one thing and emission says another, that is
     a bug worth surfacing. Propose a disagreement report; `ctaPaddingX` would light up first.
- Then: **delegated** build, Model **sonnet** via `/delegate`, single agent.
- Brief: extend `plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py` with
  a custom-property resolution pass — for each attribute, find the `--sgs-*` property it
  emits, then find which CSS declarations consume that property in the block's `style.css`,
  and write the resulting CSS property to a NEW column (do not overwrite `role`).
- Context the subagent will not have: the analyser writes to the SHARED `sgs-framework.db`
  that the cloning converter also reads. Additive column only. Run
  `python plugins/sgs-blocks/scripts/generate-attr-role-map.py` afterwards or the linter's
  static snapshot goes stale (it now reports `orphan_role_map_stale` if so).
- `/qc` gate after: yes — `/qc-council`, because this changes a shared DB-writing script.

**Acceptance:** for a sample of ≥10 attributes spanning ≥5 blocks, the derived CSS property
matches what a human reading render.php + style.css concludes. `ctaPaddingX` resolves to
padding. `contentIconColour` resolves to a colour. The 2 remaining style-property defects and
the 49 UNCLASSIFIED are re-evaluated against the new source, and the counter moves for a
REASON you can name per attribute.

### Task 2 — Auto-generate attrMap entries from Task 1's output

**What:** use the emission-derived CSS property to GENERATE manifest `attrMap` entries
instead of hand-writing them.
**Why:** this is the payoff. Of 17 style-role orphans fixed last session, only **2** needed
new vocabulary — **13 were declaration gaps** where the member already existed and nobody had
written the mapping. Manifesting 67 blocks took three waves and ~12 agents, and the expensive
part was never judgement, it was tracing attribute→property by grep, repeatedly, with agents
getting it subtly wrong and needing verification.
**Estimated time:** 30 min.

**Orchestration**
- Execution: **delegated**, sonnet. Depends on Task 1 — do not start before it lands.
- Brief: generate CANDIDATE attrMap entries, write them to a report for review. Do NOT
  auto-apply to block.json in the first pass.
- `/qc` gate after: yes — spot-check candidates against render code before applying any.

**Acceptance:** a candidate list a human can review in 10 minutes; a sample of 10 verified
correct against the code before anything is written to a manifest.

### Task 3 — Re-evaluate the 49 UNCLASSIFIED

**What:** with Task 1's source available, reclassify them.
**Why:** most are genuinely by-design (`helpText` ×6, `emptyMessage`, `excerptLength`,
`featuredItemIds`, `headingRole`, `attributionEnabled`, `connectorStyle`, `captionTag`) and
are sitting in a bucket that reads as "someone needs to do work here". A handful are real
style attributes the name-parser missed. Splitting those apart makes the counter honest.
**Estimated time:** 15 min. Depends on Task 1.

**Acceptance:** UNCLASSIFIED contains only attributes the emission analysis genuinely cannot
resolve, each named with a reason.

## Dependency graph

```
Task 1 DESIGN GATE (/brainstorming, inline, Bean signs off precedence)
        ↓
Task 1 BUILD (sonnet) → /qc-council (shared DB-writing script)
        ↓
Task 2 (attrMap candidates)  ‖  Task 3 (reclassify the 49)
        ↓
regenerate attr-role-map.json, re-run linter, commit path-scoped
```

## Pattern for every resting-state fix (Bean-locked: OPTION A, TOKEN FALLBACK)

An empty control means inherit the theme token exactly as today. Hardcoded values become
custom-property FALLBACKS: `var(--sgs-x, <existing token>)`. NEVER ship a pre-filled explicit
default — it bakes a value into every instance and stops it tracking `theme-snapshot.json`
(Spec 33). Bean chose this explicitly on 2026-07-21.

## The visual-diff gate + deploy/verify loop

A commit touching `style.css` / `render.php` / `edit.js` is BLOCKED until
`reports/visual-diff/<block>-YYYY-MM-DD.md` exists with `verdict: PASS` AND
`first_paint_capture_passed: true`. Metadata-only `block.json` changes are N/A — the gate's
own message documents `--no-verify` for those, and that is legitimate (verify the diff really
is metadata-only first, and say so in the commit). Using it for a RENDERING change is not.

**The gate keys on block+date, so a second change to the same block on the same day passes on
the FIRST change's report — a stale pass.** When that happens, append an ADDENDUM to the
existing report describing the second change (done twice on 2026-07-21 for hero and
mega-menu).

The gate reads the WORKING TREE, not just the staged set: an unrelated dirty file for a gated
block blocks the commit. `git stash push -- <path>` and commit the rest.

Deploy/verify loop (commit needs report, report needs deploy, deploy needs commit):
1. `git worktree add -b scratch/<name> /c/tmp/<dir> HEAD` — never switch the shared checkout
2. copy WIP src files in, commit there with `--no-verify` (scratch never merges)
3. **copy `build/` in — do NOT junction `node_modules`** (STOP-JUNCTION-TEARDOWN), then
   `build-deploy.py --target sandybrown --blocks-only --skip-build`
4. **md5sum the built file local vs server** — the `[verify] HTTP 200` leg passes on ANY
   working SGS page including one running old code
5. verify with a NEGATIVE CONTROL: two instances, identical content, differing only in the
   new attrs. Best form: ONE page carrying both an untouched and a client-set instance
6. write the report, commit to main, delete test pages + remove worktree

**The oldshape gate is separate and checks STORED CONTENT.** Deleting an attribute WP no
longer declares means the next editor save deletes it from `post_content`. It blocked a
deploy on 2026-07-21; Bean confirmed the affected content is pre-live scratch, so two
findings were baselined in `scripts/oldshape-audit-baseline.json` with full justification per
D270. Rendering-dead is NOT the same as storage-safe — different question, different gate.

## Structural defences (carry forward, never subtract)

- **STOP-COUNTS-FROM-THE-TOOL-NOT-THE-AGENT** — re-derive every number from `--json`.
- **STOP-VERIFY-SUBAGENT-FACTS** — across 2026-07-21, ~20 agents ran and at least 5 invented
  specifics: a concurrency incident that never happened, a double-resolution complete with a
  written defence of it, a 10-block list naming 2 blocks that do not carry the attribute, a
  "fix" that added an unused variable and a duplicate CSS rule while reporting success. Code
  was usually correct; narratives often were not. Zero inventions survived tool verification.
- **STOP-FACT-CHECK-YOUR-OWN-OUTPUT** — the MAIN THREAD made **eight** measurement errors in
  one day, all the same shape (real tool output, wrong assumption about what it described):
  read `style.css:63-72` and missed line 84; JSON validator without `encoding='utf-8'`;
  `ls node_modules` without checking `pwd`; grepped the lifted CSS when the rule lives in
  `style-index.css`; measured the SELECTED tab when testing a RESTING fix; declared
  `priceLarge` dead by grepping ONE of the TWO files that render the block; generalised from
  a single cloned hero that lacked a class the template applies; classified 108 orphans by
  name-regex and over-counted the style bucket by 70%. **Before stating any diagnostic value,
  confirm WHICH file/element/directory/creation-path it describes. When a result reads as a
  FAILURE, suspect the measurement before the code.**
- **STOP-VERIFY-WIDER-THAN-THE-AGENT-DID** — re-running an agent's own method on its own scope
  is not verification. `priceLarge` was confirmed "dead" twice by the same too-narrow grep.
  Ask what the measurement could have MISSED: is this the only file that renders this block?
  the only creation path? the only consumer?
- **STOP-NEGATIVE-CONTROL** — "would this still pass if the feature were absent?" The
  animation cluster shipped INERT while its coverage validator passed. An acceptance criterion
  of `grep -c X >= 1` passed while the bug it was meant to catch survived untouched.
- **STOP-JUNCTION-TEARDOWN** — do NOT `mklink /J` `node_modules` into a scratch worktree.
  `git worktree remove --force` traverses the junction and guts the real dependency tree; the
  build broke mid-session and two running agents hit it. Copy `build/` and use `--skip-build`.
- **STOP-CLUSTER-WITHOUT-PREFIX-OR-ATTRMAP** — a cluster declared on an element with neither
  a prefix nor an attrMap resolves ZERO members and makes the score WORSE (+36 GAP measured).
  **Inverse also bites:** an `attrMap` entry for a member whose CLUSTER is not declared on
  that element is never consulted — it looks correct and silently does nothing (`tabs`
  `tabIndicatorColour`, fixed 03096e97).
- **STOP-FALSY-EMPTY-STRING** — an explicit empty-string prefix is legitimate; test
  `!== undefined`, never truthiness.
- **STOP-DECLARE-DONT-PARSE-NAMES** — `tabActive*` means `[aria-selected="true"]`, NOT CSS
  `:active`. `pauseOnHover` / `effectHover` / `imageZoomHover` / `grayscaleHover` are BOOLEANS.
  **This applies to the DB too** — `block_attributes.role` is itself name-derived (Task 1).
- **STOP-OWNERSHIP-BOUNDARY** — a block may only declare/de-hardcode styles for markup it
  actually EMITS. `content-collection` and `testimonial-slider` delegate to child blocks via
  `render_block()` / `$inner_block->render()`; `card-grid` does the same in `wc-product` mode.
  Record the boundary in an `_ownership_note`.
- **STOP-CHECK-PATTERNS-AND-TEMPLATES-BEFORE-DELETING-ATTRS** *(new)* — deleting a block
  attribute is not finished when render code stops using it. Theme PATTERNS
  (`theme/sgs-theme/patterns/*.php`) and the block's own InnerBlocks TEMPLATE in `edit.js`
  also write attributes. Both wrote hero attrs that WP then silently discarded (D338). The
  oldshape gate scans stored post content, NOT pattern source or editor templates — it cannot
  catch this.
- **STOP-DEPLOY-FROM-SHARED-WORKTREE** — isolated worktree at a committed SHA, always.
- **STOP-NO-VERSION-BUMPS / NO-DEPRECATIONS** (D270/D293) — pre-production.
- **STOP-29 / SPEC-SCOPE-BINDING** — definition-of-done is the spec's FULL scope. Map every
  deferral to a named spec STAGE; never "out of scope".
- Bash tool is POSIX sh: PowerShell here-strings are taken LITERALLY and corrupt commit
  messages. Use a real heredoc or `-F <file>`. Nested heredocs in one command break parsing.

## Pre-flight ritual (answer before the first Write/Edit)

1. Am I on `main`, and is my next commit path-scoped away from Track 2's files
   (`LEDGER.md`, `next-session-prompt-nav-rework-P2.5.md`, `src/blocks/site-*`,
   `adaptive-nav`, `includes/class-sgs-mega-menu-cpt.php`)?
2. Am I about to touch a shared component or shared mechanism? → design-gate it and plan to
   live-verify. (Task 1 writes to the DB the cloning converter reads — this fires.)
3. Will this change render live? → deploy from an isolated worktree, then verify with a
   negative control (never build-green alone).
4. Is anything I am about to report a subagent claim? → re-derive it from the tool first.
5. Am I about to declare a cluster or a state? → does the element have a `prefix`, an
   `attrMap`, or a `layer` to make it resolve — AND is the member's cluster declared on that
   element — or will it silently do nothing?
6. Am I about to state a diagnostic value? → have I confirmed WHICH file, element, directory
   or creation-path that output describes? Eight errors of exactly this shape in one day.
7. *(new)* Am I about to DELETE an attribute? → have I checked theme patterns and the block's
   own `edit.js` InnerBlocks template, not just render code?

## Mandatory READING (tiered)

**Tier 1 — before any edit:**
- `.claude/plans/2026-07-20-spec-35-cluster-vocabulary-rework-design.md` (FR-35-1..6 IN FULL)
- `plugins/sgs-blocks/scripts/consistency/cluster-member-sets.json` `_meta` (all notes)
- `plugins/sgs-blocks/scripts/check-element-manifest-conformance.js` header comment
- `.claude/STOP-CATALOGUE.md`

**Tier 2 — for Task 1 specifically:**
- `plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py` (the script to extend)
- `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` (the name-derived
  mechanism — read its docstring, especially step 4)
- `plugins/sgs-blocks/scripts/generate-attr-role-map.py` + `consistency/attr-role-map.json`
- `plugins/sgs-blocks/src/blocks/tabs/{render.php,style.css}` — the worked example chain
  (render.php:89 → style.css:120)

**Tier 3 — context:**
- Worked exemplars: `container` (4-layer), `card-grid` (states + resting-base fix), `quote`
  (content-KIND), `tabs` (states via attrMap), `content-collection` (`_ownership_note`),
  `nav-menu` (6 elements)
- `reports/visual-diff/*-2026-07-21.md` (7 reports, 2 with addenda)
- `CLAUDE.md` binding rules R-31-1..15
- `.claude/decisions.md` head (D-ceiling D355; Track 2 owns the cadence)

## Tool bindings

| Skill | When |
|---|---|
| `/brainstorming` | Task 1's design gate — MANDATORY before building |
| `/qc-council` | Task 1 — it changes a shared DB-writing script |
| `/library-docs` | gold-standard check on static-analysis approaches before designing |
| `/sgs-db`, `/wp-blocks` | DB is authoritative — never hardcode a count |
| `/delegate` | route every dispatch |
| `/dispatching-parallel-agents` | Tasks 2 + 3 once Task 1 lands |
| `/verify-loop` | 2-attestation on any load-bearing claim |
| `/gap-analysis` | grade Task 2's candidate list before applying any of it |

| Agent | When |
|---|---|
| `wp-sgs-developer` | Tasks 1, 2, 3. Constrain: no deploy, no git commit |

| MCP / tool | For |
|---|---|
| Playwright MCP | live verification if any task reaches rendering |

Canary creds (always available): `.claude/secrets/sandybrown.env`. NOTE the password contains
shell metacharacters — parse the file in Python, do NOT `source` it. Deploy:
`build-deploy.py --target sandybrown --blocks-only` from an ISOLATED worktree. SSH alias
`ssh hd`.

## Open, unresolved

- **`role` is name-derived and 65% NULL** — Task 1. Not necessarily a data gap: NULL may
  correctly mean "name has no CSS property suffix". Establish whether `role` is SUPPOSED to be
  fully populated before treating 1,838 NULLs as work.
- **2 style-property defects remain**, both deliberate one-offs: `mega-menu panelWidth` (a
  variant MODE selector, not a raw value) and `quote attributionMarginUnit` (a companion unit
  picker). Neither should be forced into the vocabulary.
- **Editor-canvas verification is outstanding across the board.** Everything was verified by
  frontend render + REST attribute registration, NEVER by opening the block editor. The
  `sgs/label` template fix especially deserves an eye: insert a hero, confirm the eyebrow
  label seeds with text. `ShadowControl` has crashed on first live render before despite
  passing 180 unit tests (R-31-13).
- **`.sgs-hero__ctas` (PLURAL) is live draft-side vocabulary** — the cloning converter
  recognises it in SGS-BEM mockups and maps it to `sgs/multi-button`
  (`converter/recognition.py:83`, with a test). Do not purge it. `.sgs-hero__cta` (SINGULAR)
  was dead and is gone.
- **`product-card` example `priceNote: "8-pack · Free delivery over £35"`** — left as generic
  e-commerce rather than client-specific. Bean's call if he wants it neutralised.
