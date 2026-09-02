---
doc_type: plan
title: The uniformity sweep — execution plan (main track)
date: 2026-08-30
status: SUPERSEDED for execution 2026-09-02 (part 2) — the plan's own shapes are done or carried; the live front is now the per-detector findings reports. Kept for its reasoning and per-shape history.
owner: client-controls track
note: The media-element rework is a SEPARATE track. This is the original goal.
---

# The uniformity sweep — execution

## ▶ SUPERSEDED 2026-09-02 (part 2) — read the reports index instead

**The live front moved.** A second session that day validated every detector reporting findings
(logic vs decisions/specs/`dev-setup.md`, 10 parallel agents), fixed six defects (`06497afac`),
deleted one detector outright, and wrote **one report per detector** with a "Your call" checklist.

- **Start here:** `.claude/reports/2026-09-02-findings-INDEX.md`
- **Continuation prompt:** `.claude/prompts/2026-09-03-detector-findings-review-and-resolve.md`
- **Full account:** `decisions.md` **D917** (the sweep) + **D918** (the retired detector)

Two items from this plan's own scope were answered rather than executed as written:
`scattered-element-controls.js` (the C14 shape) was **deleted** — a self-declared prototype whose
model contradicted Spec 35's `isWrapper` TIER-2 rule, producing ~600 false positives; and the
`dead-api-calls` allowlist item turned out not to be debt at all (253 real WP/WC functions,
promoted, 253→0). The rule-20 item shipped. Everything else is now tracked per-detector in the
reports above, not per-shape here.

⭐ **An open structural question outranks the remaining backlog:** "baselined" conflates *by design*
with *deferred debt*, with no machine-readable distinction (verified across all 35 baseline files).
Until that is ruled on, "resolve all violations including baselined ones" is not runnable. See the
INDEX's final section.

---

## ▶ STATUS (2026-09-02, part 1) — historical, kept for per-shape detail

**Shipped, on `main`, pushed:** S10, S1 (2 of its 3 items — see below), S6, S3 (partial — see below),
S7 (pilot only), S4 (blockers only — see below), rules 29/33/35, S8, S5 (3 of 280 findings). Full
account, evidence and the two real codemod bugs caught: **D917** in `.claude/decisions.md`.

**Per-shape carry-forward, so the next session doesn't re-discover what this one already found:**

| Shape | What shipped | What's still open |
|---|---|---|
| S1 | Comment-strip fix + rule 18 fix | Rule 21's "4 artefacts" investigated, found NOT simple artefacts — both base+`*Unit` attrs genuinely uncontrolled; deciding add-control vs delete-as-dead is a real architectural call, left open |
| S3 | `ShapeDividersPanel` on site-footer (12 findings) | `LayoutPanel` NOT mounted — site-footer has no `layout` attr declared (schema gap) and hero already writes `gridTemplateColumns` via its own control (collision). Needs a design decision, not a mechanical mount |
| S4 | Both blockers fixed + self-tested | The actual batch migration (15 remaining properties, ~23 block-touches) never run — only feeds the cloning pipeline, not `gate:fast`; each property needs its own edit.js/render.php verification |
| S7 | `team-member` pilot converted | **Needs Bean's review before the other 14 candidates get scripted** |
| S5 | 3 of 280 findings closed | `fix.js`'s own survey: only 25 of 178 non-conformant rows are auto-fixable at all (14%); the other 153 are `REFUSED` with named reasons, overwhelmingly deferred text-gradient work. Two real bugs in `fix.js` hand-fixed, NOT fixed in the codemod itself (see D917) — do not trust its output blind on a future run without re-verifying `gate:fast` |

**⛔ The "out of scope" ruling below (rule 20, the dead-api-calls allowlist, C14 beyond a quick
remainder) is LIFTED as of 2026-09-02 — Bean asked for all three to be worked next session.** Read
that section for context on WHY they were deprioritised first, not as a current constraint.

**Also never actioned, carried forward from Wave A's enumeration (§"THE FULL RANGE" below, and the
Wave A tables referenced there):** 82 detector-shaped scripts with zero gate reach; a real ungated
failure in `check-enum-control-shape.py` (6 new violations, no repair script); two real un-enumerated
client-facing gaps (`survey-wrapper-capability.js` 76 orphaned-capability findings,
`survey-colour-coverage.py` 41 uncontrolled-colour findings); 1 broken script + 6 unreferenced
scripts from `audit-script-cull-candidates.py`/`audit-script-reachability.py`; S9 (C14 splits,
12 candidates to confirm against Bean's colour-panel exception).

---

## Bean's brief, restated

> *"Run all our survey / audit / enforcement / consistency scripts, categorise the differences,
> identify false positives, then fix with our existing migration/repair scripts — and where no
> script exists, recognise the shape and create one. The goal is NOT perfection: it's no clear
> blockers to the pipeline or the client's experience in the editor, canvas, or on live pages.
> Clear out large chunks of the error items, including baselined ones, using scripts that do the
> FULL BLOCK migration across the different files in a block folder."*

### ⛔ Two constraints that change the method

1. **NO CANARY MIGRATION LOOP.** Bean's ruling: the canary holds inconsequential scratch content
   created only to test functionality. Scanning, deploying, migrating and verifying every block
   instance there costs time and tokens and proves nothing about a client site. **So this track is
   static-gate-driven: no deploy, no content migration, no visual-diff on scratch content.**
   ⚠ Honest cost, accepted knowingly: a change that breaks *live rendering* would not be caught by
   static gates. Mitigation is that we only run fix shapes that are code-level and script-verified,
   and real verification arrives with the first real client build.
2. **Low tokens, deadline.** Order by findings-cleared-per-token, not by rule number.

---

## The method: group by FIX SHAPE, not by rule

A rule is a detector. A **shape** is one repeatable repair. One shape = one script = many findings
across many blocks. This is the only ordering that gets large chunks cleared cheaply.

For each shape: **does a script exist?** → run it. **No?** → fingerprint it, build the triad
(`--survey` / `--fix` / `--check` + `--self-test`), then run it.

---

## Ground truth already measured this session (do NOT re-run these surveys)

⛔ **STALE as of 2026-09-02 — this table is the 2026-08-30 snapshot, kept for its reasoning, not its
numbers.** A fresh Wave A re-enumeration the same day already found real drift on several rows below
(28 `inspector-scan` rules not 24, 321 dead-api-calls entries not 305, 32 migratable tier properties
not 27) — see D917 in `.claude/decisions.md` and the STATUS section at the top of this file. Re-run
every row before trusting it for new work; this table earns its keep only as a record of what
"measured, not assumed" looked like on the day it was written.

| Source | Reading |
|---|---|
| `21-render-without-control` | **82 flagged** — 78 REAL, 4 artefacts |
| `31-golden-colour-control` | **280 flagged**, ceiling **291** → 11 slack, a new violation lands green |
| `18-decorative-image-aria` | **12** — 5 real, 2 decorative-by-construction, 5 artefacts |
| `03-dense-panel-candidate` | **15**, all real, 13 blocks |
| `34-declared-attr-unrendered` | **1** |
| `01-tab-group` | **57**, at ceiling |
| `08-raw-url-link` | **2**, line-key fragility (11 commits of re-anchoring) |
| Baselines project-wide | **511 entries / 48 files** — 305 in `dead-api-calls` alone |
| Tier migration | **27 properties / 37 touches** — 16 C19-exempt, 21 real targets |
| C14 tab splits | 15 candidates, **3 confirmed** |
| Gate roster | **82 gates**; `gate:fast` 73/73 PASS |

Per-item evidence: `.claude/reports/2026-08-30-triage-T1..T7-*.md`.

---

## The shapes, ordered by findings-cleared per token

### ⭐ S1 — Detector fixes (clears false positives; ZERO block edits)

**Cheapest possible wins, and they must go first** — every later count is dishonest until they land.

| Fix | Clears | Script? |
|---|---|---|
| `core/sources.js` strips `/* */` but not `//` line comments | 3 baselined + unknown live | **new, tiny** |
| Variable-tail key resolution (`before-after/edit.js:241-245`) | 8 baselined | **new** |
| Prose collision — matches an English word in `aria-label` | 1 baselined | **new** |
| Rule 18's exemption regex falsely clears blocks whose `ariaLabel` labels a LINK | 3 real, +1 moot | **new** |
| Rule 21's 4 artefacts (`reviewsAverage`, 3 legacy `*Unit`) | 4 | reclassify |

⛔ Each needs a **negative control** proving the exemption does not overmatch (e.g. `sgs/media`
keeps matching `/decorative/i` correctly).

### ⭐ S2 — `dead-api-calls` allowlist (up to 305 baseline entries, ONE change)

The script's own header calls its 305 entries *"real-but-uncurated WP/WC calls this JSON hasn't
caught up with yet"* — a detector limitation, not debt. Extending
`dead-api-checker/wp-wc-function-allowlist.json` clears the largest single block of suppression debt
in the repo. ⛔ **Needs a spot-check against real WP/WC function names first** — an allowlist that
overmatches hides real dead calls.

### S3 — Missing panel mounts (22 of rule 21's 78, ~3 file edits)

- `sgs/site-footer` declares **12** `shapeDivider*` attributes and renders through the wrapper that
  paints them, but its `edit.js` imports only `WidthPanel`/`BackgroundPanel` → mount
  `ShapeDividersPanel` = **12 findings**.
- `LayoutPanel` on hero + site-footer = **10 more**.

**No script needed** (2 blocks), but add a detector so it cannot recur.

### S4 — Tier-object migration (21 real targets) — SCRIPT EXISTS, two blockers first

`migrate-tier-object.py` is the full-block-migration shape Bean wants (block.json + edit.js +
render.php in one pass). **Two things must land before `--fix` runs:**

1. ⛔ **Unhandled `KeyError`** — `apply_block_json` subscripts the bare attribute name at
   `:1025/1034/1036`; the three `<prop>Desktop`-base families don't declare it. Writes nothing, but
   **aborts the whole batch**.
2. ⛔ **C19 is NOT enforced.** The tool's `ASSET` kind is a SHAPE test (base + all siblings are
   objects), not a semantic one — so 15 art-directed media touches (`imageId`, `imageUrl`,
   `logoId`, `videoUrl`, `svgContent`…) classify as FLAT and **would be folded into responsive
   objects, which Bean's C19 ruling forbids.** Encode the exemption in `classify()` as a
   *file-reference* test, with a negative control proving it still migrates
   `backgroundOverlayOpacity`, `columns` and `textAlign`.

### S5 — Colour hover/gradient rows (280 findings) — ALREADY RULED, D752

Batch codemod applying hover + gradient everywhere the rule wants them. ⛔ **No per-block approval
gate — D752 says the caveat was raised and overruled deliberately; do not re-litigate.** Drive the
worklist from the **scanner's own findings**, never a curated name list.
**Also lower the ratchet 291 → 280** in the same commit, closing the 11-finding slack.

### S6 — `borderRow` deletion (dead code)

`SgsBorderControl` has 45 adopters; `borderRow` has 0 and is superseded. Tree-wide search found no
live consumer. Delete the file + the export at `src/components/index.js:19`.

### S7 — ToolsPanel conversion (15 findings) — needs ONE pilot first

`team-member` "Card Settings" (`edit.js:423`, ~7 controls) — flat, not colour, not duplicated in a
sibling. ⛔ D618/D621 already rejected one placement; the pilot avoids a second rejection at scale.
Script the other 14 after Bean sees one.

### S8 — Decorative toggle (5 real) — settle the NAME once

Two names exist: `media::imageIsDecorative` and `timeline::milestoneMediaDecorative`. Settle on
**`{element}Decorative`** (no "Is"), then script. ⛔ The `"decorative"` key in 5 blocks'
`supports.sgs.elements` is an unrelated manifest label — do not conflate.

### S9 — C14 element/tab splits (3 confirmed, 12 to confirm)

`hero`, `option-picker`, `product-card` confirmed splitting one element across Settings/Styles.
⛔ `SgsColourPanel`'s hardcoded `group="styles"` (65 blocks) is Bean's **sanctioned exception**, not
a violation. The other 12 need per-block confirmation that the SAME element also has Settings
controls before anyone scopes work from the number.

### S10 — Rule 08 line-keyed baseline (2 entries, recurring)

The baseline key ends in a line number, so unrelated edits above it turn documented exceptions into
build-failing findings — **11 commits of re-anchoring**. De-line-key the match; encode the two
genuine exceptions in the RULE, not the baseline.

---

## ⛔ THE FULL RANGE — I under-reported it, Bean challenged it, here it is

I reported **7 rules**. There are **24**, totalling **487 advisory findings**. The eight I missed:

| Rule | Findings | Serves which goal? |
|---|---|---|
| `20-pattern-template-lock` | 23 | neither directly |
| `29-duplicate-visible-label` | **8** | ⭐ **CLIENT — duplicate labels in the editor** |
| `33-ineffective-typography-selector` | **3** | ⭐ **CLIENT — a control that does nothing** |
| `26-responsive-duplicate` | 2 | client (minor) |
| `35-pinned-panel-position` | **1** | ⭐ **CLIENT — this is the C14 pinned-panel rule, i.e. Bean's own screenshot bug** |
| `07-preset-only-shadow` · `22-placement-rule-surfaces` · `23-content-width-needs-inner-band` | 1 each | minor |

⚠ **And 487 is still only ONE scanner.** The roster has **82 gates**. `check-dead-controls`,
`check-duplicate-controls`, `check-inert-controls`, `audit-block-uniformity` and others carry their
own findings that **have never been enumerated**. `gate:fast` is 73/73 green, so none of them is
*failing* — but green means "at or under ceiling", not "no debt".

**Do not treat any count here as the population until the remaining gates are enumerated.** That
enumeration is Phase 1 below and costs one command each.

---

## ⭐ Which shapes actually serve Bean's stated goals

Goals, verbatim: *"no clear blockers from this aspect to the pipeline or my client's experience with
the editor, canvas, or the blocks doing what they should on the live pages."*

**Sorting by goal value gives a DIFFERENT order than sorting by finding count** — and the biggest
number turns out to be the lowest value:

| Shape | Findings | Pipeline? | Client? | Verdict |
|---|---|---|---|---|
| **S10** line-keyed baseline | 2 | — | — | ⭐ **DO FIRST — it breaks EVERYONE's build, recurring** |
| **S4** tier migration | 21 | ⭐ **YES** — flat tiers are gated against cloning (D554-C) | — | **HIGH** |
| **S3** panel mounts | 22 | — | ⭐ **YES** — 12 painted attrs no client can control | **HIGH** |
| **S5** colour hover/gradient | 280 | — | ⭐ YES | **HIGH (volume + value)** |
| **NEW** rules 29 / 33 / 35 | 12 | — | ⭐ **YES** — duplicate labels, dead controls, the panel-order bug Bean SAW | **HIGH, and I missed them** |
| **S8** decorative toggle | 5 | — | ⭐ a11y | MEDIUM |
| **S7** ToolsPanel | 15 | — | density only | MEDIUM |
| **S9** C14 tab splits | 3 conf. | — | finding controls | MEDIUM |
| **S1** detector fixes | ~16 | — | — | **enabling only** — makes other counts honest |
| **S6** `borderRow` delete | 0 | — | — | LOW (tidiness) |
| **S2** `dead-api` allowlist | **305** | — | — | ⛔ **LOWEST VALUE despite the biggest number** — pure baseline tidiness, unblocks nothing |

⛔ **S2 is the trap.** 305 entries is the most impressive number available and it serves neither
goal. Do it only if tokens remain after everything above.

---

## ⛔ THE POPULATION — under-reported FOUR times this session. Measured:

| Layer | Count | What I reported |
|---|---|---|
| `inspector-scan` rules | **24** | 7 |
| Gates in the roster | **82** | 6 measured |
| Detector/repair-shaped scripts (`check-`/`audit-`/`survey-`/`migrate-`/`lint-`/`scan-`/`probe-`) | **~180** | — |
| **Scripts total** | **809** (776 in `plugins/sgs-blocks/scripts`) | — |

**The pattern in my own errors:** I measure the layer I am looking at and report it as the
population. It happened with baselines (14 → 146 → 171 → **511**), with rules (7 → **24**), and with
scripts (→ **809**). ⛔ **Every count in this plan is a floor, not a total, until Wave A completes.**

---

## Execution — WAVES of parallel agents, main thread orchestrates. ONE convergence.

Bean's shape, verbatim: *"do all of the different groups with parallel subagents in waves and then
have the main agent orchestrate, direct and fact-check the subagents working on each — and then we
can do all at once."*

⛔ **This replaces the sequential phase plan above.** Sequential phases meant Bean waiting between
each; waves mean everything lands together with one build at the end.

### WAVE A — ENUMERATE (parallel, READ-ONLY, ~6 agents)

Nobody fixes anything. Each agent owns a disjoint slice of the ~180 detector scripts and returns a
uniform table: `script | what it detects | current findings | exit code | repair script exists?`

| Agent | Slice |
|---|---|
| A1 | `inspector-scan` — 24 rules (numbers already measured; hand them over, do NOT re-run) |
| A2 | `check-*` (99 scripts) |
| A3 | `audit-*` + `consistency/*` (~15) |
| A4 | `survey-*` + `scan-*` + `probe-*` (~41) |
| A5 | `migrate-*` (19) — which exist, what shape, which are runnable, which are stale |
| A6 | Gate roster reconciliation — which of the 82 gates map to which script; find the unenumerated |

⛔ **Read-only.** No `--fix`, no `--apply`, no deploy, no git writes. Each declares its expected
population before its first count and pairs every zero with a positive control.

### MAIN THREAD — orchestrate, fact-check, categorise (not delegated)

This is the step that cannot be dispatched, and this session proved why: fact-checking subagents
caught a truncated grep that nearly produced a false correction, a council seat's false
CSS-injection claim, and an agent's "zero callers" framing that was wrong in the direction that
flattered a rebuild.

1. **Fact-check every Wave A count** — spot-check the load-bearing ones against source.
2. **Categorise into FIX SHAPES**, not rules — one shape = one script = many findings.
3. **Kill false positives** — a false positive is a DETECTOR BUG, never baseline fodder.
4. **Map each shape to Bean's two goals** — pipeline blocker, client-experience blocker, or neither.
   ⛔ Anything in "neither" is deprioritised regardless of how big its number is (see: the 305-entry
   allowlist, the biggest number available and the lowest value).
5. **Compose Wave B** so every agent owns disjoint files.

### WAVE B — FIX (parallel, one agent per shape, disjoint files)

Composed from Wave A's output, so it cannot be fully pre-specified. Known shapes so far: S10 line-key
· S1 detector fixes · S4 tier migration (after its two blockers) · S3 panel mounts · S5 colour ·
rules 29/33/35 · S6 `borderRow` · S7/S8/S9 per Bean's answers.

Rules for every Wave B agent:
- **One directory each** — parallel agents sharing a directory have destroyed each other's work here.
- **Its finding list is IN THE PROMPT** — never re-run a scan to discover its own work (token waste).
- **`--survey` → `--fix` → `--check` → `--self-test`**, gate proven RED before `--apply`.
- **Hand back, do not improvise**, if `--survey` reports `unrecognised > 0`, if counts moved since
  its dry run (another agent moved its targets), or if a per-file special case is needed.
- **Path-scoped commits, one shape per commit.** Five tracks share `main`.

### MAIN THREAD — fact-check Wave B

`git diff --stat` after every agent — this session's own record is that subagents destroy work four
ways and that one command catches all four. Verify each claimed fix against source, not against the
agent's prose.

### CONVERGENCE — once, at the end

One `npm run build`, one `gate:fast`, ratchets lowered to the new real counts **with composition
enumerated**, commits pushed.

⛔ **No canary deploy, no content migration, no visual-diff** — Bean's ruling: the canary is
scratch content and verifying it proves nothing about a client site.

### What still needs Bean, and it is FIVE questions in one sitting

1. Decorative attribute name — confirm `{element}Decorative`.
2. ToolsPanel pilot — approve `team-member` "Card Settings".
3. C14 splits — cap at the 3 proven, or confirm the 12 candidates.
4. Rule 20 (23 findings) — serves neither goal. In or out?
5. The 305-entry allowlist — worth the tokens, or park?

⛔ **Nothing else needs him.** Answer these and both waves run unattended.


## Order of execution (SUPERSEDED by the phases above — kept for the S-numbers)

1. **S1** detector fixes — makes every other number honest
2. **S2** allowlist — biggest single clear
3. **S6** borderRow — trivial, removes a distraction
4. **S3** panel mounts — 22 findings, high client value
5. **S4** tier migration — after its two blockers
6. **S5** colour codemod + ratchet
7. **S10** line-key fix
8. **S8 / S7** — need a name decision and a pilot respectively
9. **S9** — needs per-block confirmation

**S1-S6 require no decisions from Bean.** S7-S9 do.

---

## Definition of done (Bean's, not perfection)

- No **clear blocker** to the cloning pipeline.
- No **clear blocker** to the client's experience in the editor, canvas, or on live pages.
- Large chunks of detector findings and baselined entries cleared.
- `gate:fast` still green; ratchets lowered to the new real counts with composition enumerated.

⛔ **Not in scope:** canary deploy, content migration, visual-diff on scratch content, and any
attempt to reach 0 on every rule.

## Guardrails carried forward

- **Enumerate, never recall.** Every number above came from a command; re-run before acting on one.
- **A false positive is a DETECTOR BUG, never baseline fodder.**
- **Every exemption needs a negative control** proving it doesn't overmatch.
- **A grep returning 0 is a hypothesis** — pair it with a positive control from the same file.
- **Five tracks share `main`** — path-scoped commits, branch re-checked in the same command.
- **>3 files? The detector is the first deliverable** (THE-MIGRATION-METHOD).

---

## ✅ BEAN'S RULINGS — 2026-08-30. All five settled; both waves can now run unattended.

⛔ **Rulings 2 and 3 below (rule 20, the dead-api-calls allowlist) were REVERSED 2026-09-02 — Bean
asked for both back in scope next session, alongside C14 in full.** Kept verbatim below as the
historical reasoning for why they were deprioritised FIRST (still valid — they serve neither goal
directly), not as a current constraint. Do not re-park them without asking again.

| # | Question | Ruling |
|---|---|---|
| 1 | **C14 tab-splits** | **Conditional: do it if quick, otherwise not essential** (2026-08-30). **REVERSED 2026-09-02 — full scope, no longer conditional on being quick.** See the nuance below — it still narrows the list even at full scope. |
| 2 | **Rule 20** (23 findings) | ⛔ ~~OUT OF SCOPE this round~~ (2026-08-30). **IN SCOPE 2026-09-02.** |
| 3 | **`dead-api-calls` allowlist** (321 as of 2026-09-02, was 305) | ⛔ ~~PARKED~~ (2026-08-30). **IN SCOPE 2026-09-02** — spot-check against real WP/WC function names before extending it (per S2's original caveat below). |
| 4 | **ToolsPanel pilot** | ✅ **`team-member` "Card Settings"** (`edit.js:423`). Shipped 2026-09-02 — **awaiting Bean's review before scripting the other 14.** |
| 5 | **Decorative attribute name** | ✅ **`{element}Decorative`** (no "Is") — settled, shipped 2026-09-02 (`sgs/media`; `sgs/timeline` already matched). |

### ⭐ Bean's C14 nuance — this SHRINKS the candidate list, do not skip it

> *"I think the one exception to this rule is the global colour panel. Only a few panels/controls
> have their own colour like borders and bg overlay. If it's a quick thing to migrate then let's do
> it, otherwise it's not essential."*

Two things follow, and the second was not previously captured:

1. **The global colour panel is THE exception** — already recorded; `SgsColourPanel`'s hardcoded
   `group="styles"` across 65 blocks is sanctioned, not a violation.
2. ⭐ **A control that owns its OWN colour is not a split either.** Border and background-overlay
   carry their own colour controls, so a "Border" panel sitting in the Styles tab and containing
   border colour is **one element's controls in one place** — correct, not a C14 breach.

⛔ **Therefore several of the 15 candidates are probably not violations at all.** `table-of-contents`
"Border", `site-footer` "Border", `site-header` "Shadow, Border", `physics-canvas` "Border",
`info-box` "Border" are all single-purpose style panels that own their colour — exactly the shape
Bean just exempted. **Re-triage against this rule BEFORE fixing anything**, then apply the
"quick or not essential" test to whatever genuinely remains.

**Execution rule:** timebox it. If the genuine remainder is a fast mechanical move, do it in Wave B.
If it needs design or per-block judgement, **drop it** — Bean has said it is not essential.

### Net scope after the rulings (2026-08-30 original; see the STATUS section at the top for what actually shipped)

**IN (goal-serving):** S10 line-key · S1 detector fixes · S4 tier migration (after its two blockers)
· S3 panel mounts · S5 colour + ratchet · rules 29/33/35 · S6 `borderRow` · S8 decorative ·
S7 ToolsPanel pilot only.

**OUT (2026-08-30 only — REVERSED 2026-09-02, all three now in scope):** rule 20 (23) · the
dead-api-calls allowlist · C14 beyond the quick remainder.

**Still unenumerated and therefore unscoped:** everything Wave A surfaces from the 611 runnable
scripts. ⛔ Read the GENERATED tooling catalogue in `.claude/dev-setup.md` (§"Tooling catalogue",
line ~686) FIRST — it lists every gate in real execution order with each script's own stated
purpose, so Wave A is mostly a READ, not a discovery exercise.
