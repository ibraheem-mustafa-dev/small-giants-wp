Invoke `/autopilot` before anything else.

# Council the burn-down method, then triage the 945

## Read first

1. `.claude/LEDGER.md` — the colour-golden / tooling section. It is the live status; this
   prompt is a work order derived from it. **If they disagree, the LEDGER wins.**
2. `.claude/THE-MIGRATION-METHOD.md` — **in full.** Its Step 4/5/7b/8/11 sections are the
   subject of this session and are marked `UNGRADED and UNREVIEWED`.
3. `.claude/plans/2026-08-25-road-to-uniform-then-spec-39.md` — the scope register, Section D.
4. `.claude/rubrics/migration-method-grading.md` — binding on any grade you produce.

---

# What we have, and what we do not

State this honestly. Do not soften either column.

## Measured and recorded

| Thing | Figure | How it was derived |
|---|---|---|
| inspector-scan findings | **958** across **81 of 83** blocks | `npm run inspector-scan` |
| — declared-attr-unrendered | 319 | rule 34 |
| — golden-colour-control | 291 | rule 31 |
| — **render-without-control** | **222** | rule 21 |
| — tab-group | 57 | rule 01 |
| — pattern-template-lock | 23 | rule 20 |
| — dense-panel-candidate | 15 | rule 03 |
| — decorative-image-aria | 13 | rule 18 |
| Rules that CANNOT fail | **15 of 22** | the scan's own summary: `advisory findings: 945 (never gate)` |
| Spec 32 open items | 5 | agent survey, gates re-run live |
| Spec 35 open items | 19 (11 mechanical · 6 need Bean · 2 need a live pass) | agent survey against source |
| Tier-migration families still flat | **37** | DB-derived, disk-crosschecked, blind spot fixed D777 |
| Conformance goldens quarantined on Spec 39 | **37** `xfail(strict=True)` | `plugins/sgs-blocks/scripts/tests/fixtures/conformance/quarantine.json` |
| Gates wired | 7 of 27 orphans | `npm run gate:list` |

## Not done, and nobody should pretend otherwise

- ⛔ **ZERO of the 945 findings have been triaged.** Not one is classified REAL / DETECTOR BUG /
  ARTEFACT. The Step 7b that mandates it was written on 2026-08-25 and has never been run.
- ⛔ **The D778 edits are UNGRADED.** Steps 4, 5, 7b, 8 and 11 changed. No council has seen them.
  That is this session's job.
- ⛔ **Rule 21 carries a `SUSPECTED DEFECT, NOT INVESTIGATED` flag on its own ceiling.** Its
  ratchet message reports 211 (FLAGGED + BASELINED) while the backlog it compares against looks
  like a FLAGGED-only number (200). If so, **the ceiling re-trips the moment anything is
  baselined, and the fix is to the comparison, not the number.** Unresolved.
- ⛔ **The 11 "tier-without-base" blocks from `audit-inline-styling.js` are unmeasured.** They may
  share the `<name>Desktop` cause fixed at D777, which would make some false positives.
- ⛔ **Six Spec 35 decisions are unanswered** (register C14-C19). Four block ready-to-run work.
- ⛔ **Spec 39 does not exist as a file** and is the pacing item for cloning (D554-C).

---

# TASK 1 — Council the D778 edits

Run `/adversarial-council` over `THE-MIGRATION-METHOD.md`. **Several loops, not one.** Stop when a
round produces no CONFIRMED finding above B-class.

## What changed, and why it was changed

The doc was written for one job: build a detector for a new repeating change. Asked whether it fits
the inspector-scan work — 945 findings, 22 rules, 81 blocks — the answer was no, and one step did
real damage.

**Step 8 demanded a binary `--check` that must reach 0.** On a backlog that cannot reach 0, the only
compliant move is to make the rule advisory. **That is how 15 rules became permanently unable to
fail.** The document caused the state it was later asked to fix.

Four edits landed, all tagged D778:

- **Step 8** now names three gate shapes — binary, guard, ratcheted ceiling — with the ratchet
  discipline: monotonic downward, composition enumerated rather than inferred, raising permitted
  only as a stated staleness correction, slack means a new violation lands green, never promote on
  the run that introduces a rule.
- **Step 7b (new)** — triage. A finding is not a defect until classified REAL / DETECTOR BUG /
  ARTEFACT.
- **Steps 4 and 5** gain an N/A off-ramp for when the detector already exists.
- **Step 11** gains a sampling note.

## Seats

Carry these three forward — each earned its place:

- **Cutter (delete-only).** Round 4 found what nine additive reviewers missed. Every prior council
  was structurally additive: nine personas, nine must-fix lists, nobody asked to subtract, and the
  doc grew 222 → 670 lines. ⚠ **The doc has now grown again, 581 → 710.** Ask whether the new
  sections earn it, and whether Steps 7b and 8 now overlap.
- **Cold applier.** Would a fresh agent, holding only this doc, correctly burn down a backlog?
  Walk it against a real one: rule 21's 222.
- **Grader.** Apply `migration-method-grading.md` literally — `CONFIRMED / PEDANTIC / WRONG` counts,
  the worst CONFIRMED finding and the tier predicate it triggers, and rules 4 and 5 stated
  explicitly.

Add a fourth for the new material:

- **Ratchet auditor.** Compare the doc's Step 8 against what `inspector-scan/rules.json` actually
  does. That file holds **~12,000 words** of ratchet discipline across 20 `advisoryReason` fields —
  **1.7× this document** — and no spec references it. The edits claim to extract it. **Did they
  extract it faithfully, or paraphrase it into something weaker?** Rule 31's field is the reference.

## Rules for every round

- ⛔ **A panel is not evidence.** Fact-check each finding against source before it counts. A
  code-grounded `file:line` from a persona has been wrong here before.
- ⛔ **Grade the doc as EXERCISED, not as written.** The only question that matters: does a cold
  agent following it succeed on its first attempt without Bean intervening?
- Record `CONFIRMED / PEDANTIC / WRONG` per round. A finding that DISPROVES a complaint is worth
  more than one confirming it — it means the document was better than reported.

**Acceptance:** `status:` updated from the final grade, every CONFIRMED finding either fixed or
recorded with a reason, and the round-by-round counts written down.

---

# TASK 2 — Triage rule 21's 222, using Step 7b

The council validates the method. **This proves it.** Do not close TASK 1 without starting this —
the last two times this doc was reviewed without being run, it was reviewed fifteen times and
never once applied.

Rule 21 is `render-without-control`: **the block renders something the client cannot change.**
It is the most client-facing of the three big rules, and it contradicts CLAUDE.md directly —
*"no block feature is complete until it has full block-editor UI controls"* and *"clients are
tech-illiterate — they use the block editor exclusively."*

Classify every one of the 222 as REAL, DETECTOR BUG, or ARTEFACT.

⛔ **The dominant family is already documented on the rule and it is NOT a simple defect:** a block
passing its whole attributes array to `SGS_Container_Wrapper::render()` inherits the wrapper's
entire attribute vocabulary as rendered, so every container/grid/background attr it declares
without a control is frozen at its `block.json` default forever. Read rule 21's own
`advisoryReason` before classifying anything — it names three baselined classes and its component
resolution precedence rule, and it will save you re-deriving them.

⛔ **A false positive is a detector bug, never baseline fodder.** If the rule is wrong, fix the
rule.

⛔ **Settle the ceiling-comparison defect first** (the FLAGGED vs FLAGGED+BASELINED mismatch above).
Triaging against a ceiling that miscounts wastes the pass.

**Deliverable:** a classified worklist — counts per verdict, and for the REAL ones the blocks and
attributes, ordered by client impact. **Not** a fix. The fixes need Step 3 (settle the shape with
Bean) because each REAL finding means a new client-facing control.

---

# Guardrails

- **Enumerate, never recall.** Every figure above came from a command. Three different counts of
  the tier migration were in circulation before one was derived by listing; only that one was right.
- **Never quote a D-date or a commit date as an elapsed cost.** Both record when work landed.
- **Grep the roster before believing a gate runs** — `npm run gate:list`, never `package.json`.
- **Count only what the gate counts.** `inspector-scan --json` serialises BASELINED findings
  alongside FLAGGED while the exit code filters to FLAGGED. A raw array length over-counts.
- **Five tracks share `main`.** Path-scoped commits, branch re-checked in the same command. Never
  `git add -A`, never a bare `git checkout .`.
- **`decisions.md` size is self-healing** — a Stop hook sweeps it. Do not investigate it.

# Not this session

- The other 723 findings (rules 34, 31, 01, 20, 03, 18). Rule 21 first; the method is proved or
  broken on one rule before it is spent on seven.
- Spec 39. It follows the standard, per D552.
- Client and revenue work. Bean's framing, recorded 2026-08-25: uniform blocks are the
  prerequisite for a universal pipeline, and that is the profit goal. **The revenue-minded action
  is this work, done in the order that reaches ready fastest with no corners cut.**
