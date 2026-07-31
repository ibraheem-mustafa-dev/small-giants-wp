---
doc_type: report
project: small-giants-wp
date: 2026-07-31
track: Track 1 — Task 1 (oracle attribution + probe target)
spec: .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md §5 / §7b
status: code shipped; measured offline + live; NOT yet Bean-eyed
---

# Oracle attribution + probe target — measurement record

## Plain English

The tool that judges how faithfully a cloned page matches its draft was only
looking at the *outermost box* of each section. Any styling written on something
inside a section — a heading, a card, an icon — was invisible to it: **393 of 499
declared rules were never measured at all.**

Counting those rules in is only half the job, and doing only that half would have
made the tool *lie in our favour*. If you read a heading's font size off the
section box instead of off the heading, inherited properties frequently match by
coincidence, and the cell scores a PASS that was never tested. So each rule now
also carries **the specific element it must be read on**, and where the clone has
no such element the rule is recorded as *unverified* rather than quietly passed.

The point of the change is not a nicer number. It is that **11 real transfer
failures that no previous run could see are now named, with values** (below).

## What changed

| File | Change |
|---|---|
| `scripts/oracle/element_probe.py` | NEW. Resolves a draft selector → the clone element to measure. DB-first (`block_attributes.derived_selector` + `css_element`); no hardcoded element vocabulary. |
| `scripts/oracle/batch_runner.py` | `attribute_cells_to_sections` now resolves selectors against the draft DOM and attributes to the NEAREST ancestor section. Section nodes resolve uniquely (the `select_one` collision hazard). The live probe measures each cell on its own element, grouped one read per distinct element, with pseudo-element support. |
| `scripts/oracle/models.py` | `CellInput` gains `probe_selector` + `probe_pseudo`. |
| `scripts/oracle/decompose_unattributed.py` | Now CALLS the real attributor instead of re-implementing its reject branches (see "The diagnostic was lying" below). |
| `scripts/oracle/tests/test_batch_runner.py` | +14 tests: real fixture-driven `discover_sections` coverage (it had none), nested BEM, probe-target resolution, the coincidental-value false win, section-node collision. |

`discover_sections()` top-level scoping is **unchanged** — it deliberately
mirrors the walker. Only the attribution walk gained descendant support.

## Acceptance — against controls, not against its own output

**1. Ground truth: 73 mismatches → 0.** `attribution_ground_truth.py --check`
compares the live attributor to `attribution-ground-truth.json`, which was
generated and committed *before* this fix and was **deliberately not
regenerated**. Passing it is evidence, not circularity.

**2. Rollback criterion (set before any code moved): LANDED must not fall below
31.** Live batch over 36 fixtures / 31 live-probed:

| Verdict | BEFORE | AFTER |
|---|---:|---:|
| LANDED | 31 | **55** |
| WRITTEN-not-LANDED | 0 | **11** |
| UNVERIFIED | 33 | 221 |
| GUARD-FAIL | 33 | 160 |
| NOT-RENDERED | 8 | 45 |
| unattributed | 393 | 2 |

Pre-image: `scripts/tests/fixtures/phase-f/_render-oracle/batch-report.BEFORE-2026-07-31.json`.
No deploy was performed — this change touches measurement only, so the batch ran
against the existing canary pages and the co-active motion track's canary was not
disturbed.

**3. Negative control.** A planted break (make an unresolvable descendant fall
back to the section root) fails `test_unregistered_element_token_is_attributed_
but_unmeasurable`. Restored and confirmed byte-identical by md5 before continuing.

## The 11 newly-visible transfer failures

Real defects, invisible to every previous run. Not yet triaged.

| Fixture | Property | Draft | Clone |
|---|---|---|---|
| sgs-card-grid | border-radius | 12px | 18px |
| sgs-card-grid | padding | 24px | 0px |
| sgs-pricing-table | color | #2d5016 | rgb(58, 46, 38) |
| sgs-product-card | aspect-ratio | 1/1 | auto |
| sgs-product-card | margin-top | 12px | 0px |
| sgs-team-member | width | 80px | 150px |
| sgs-team-member | height | 80px | 150px |
| sgs-team-member | object-fit | cover | fill |
| sgs-team-member | font-size | 18px | 20px |
| sgs-team-member | font-weight | 600 | 700 |
| sgs-team-member | margin-top | 4px | 0px |

**⛔ Do NOT arm `--with-landed` on the back of this.**
`_LANDED_HARD_FAIL_VERDICTS = {"WRITTEN-not-LANDED"}` (`coverage_check.py:383`)
read 0 only *because* those cells were unattributed. This task manufactured the
verdict. Arming is a separate decision in a separate commit, after triage.
Verified still disarmed: `grep -c with-landed package.json` → 0.

## Honest reading of the headline numbers

**Do not quote "21.2% → 99.6%" as an improvement of that size — it is not the
same measurement.** Attribution and measurability are different things, and the
second is the one that matters:

| | count | of 499 |
|---|---:|---:|
| declared cells | 499 | 100% |
| attributed | 497 | 99.6% |
| **measurable** (have a resolvable clone element) | **231** | **46.3%** |
| attributed but NOT measurable | 266 | 53.3% |
| unattributed (attribute-qualified selectors) | 2 | 0.4% |

The 277 are draft element tokens the DB has no record of the block rendering —
`__inner`, `__item`, `__icon`, `__text` and similar. They resolve UNVERIFIED and
can never be LANDED. **Each is a Spec 31 §5 GAP candidate**, and this is the real
newly-visible finding: over half the corpus's declared styling targets elements
the framework does not record.

**The banked prediction was `393 → ~74` unattributed / `21.2% → ~85%`.** Neither
figure matches, because the prediction assumed a different split: it expected
unresolvable-element cells to stay *unattributed*, whereas this design attributes
them and marks them *unmeasurable*. Pseudo-element and combinator selectors,
predicted "permanently unattributable by shape", both resolve to a real base node
and attribute fine. Recorded as a divergence, not retro-fitted into a pass.

**GUARD-FAIL 33 → 160 is a denominator effect, not 127 new defects.** The same 11
sections fail their guards as before (`empty=False` — the section renders no text
on the canary), plus 2 @Mobile tier observations that did not previously exist
because those sections had zero Mobile-tier cells attributed. **Zero newly-failing
sections** (`fb - fa` = ∅ both ways bar those 2). Each failing section now carries
many more measured cells, so one guard failure taints more cells.

## The diagnostic was lying by construction

`decompose_unattributed.py` re-implemented `attribute_cells_to_sections`'s reject
branches rather than calling it. So it described a **copy** of the algorithm: after
this fix it still printed `393 unattributed, attribution rate 21.2%`, which reads
as *the fix did nothing*. The brief's instruction to "re-run it and compare
against the prediction" would have produced a confidently wrong conclusion.

Now derives every figure from the attributor itself. Generalised lesson: a
diagnostic that re-implements the thing it measures reports on its own copy, and
goes stale silently — there is no failing test, because nothing disagrees.

## A gap in my own first cut

Drafts write block-level variant classes (`.sgs-hero--video__heading`,
`.sgs-cta-section--bg__inner`) where the DB registers the base form
(`.sgs-hero__heading`). Without normalising that, **every element of every draft
variant read as unmeasurable** — 31 cells on `sgs/hero` alone. Found by checking
the residue instead of accepting the first number. `strip_block_modifier()` only
strips a `--modifier` occurring BEFORE the `__` separator, so an element modifier
(`.sgs-hero__title--large`) is left alone; pinned by test.

## Pre-commit council round (3 raters, 2026-07-31)

Run per blub.db 255 before any converter/pipeline commit. **Five findings acted
on; two were live false-LANDED paths.** The live batch was re-run after the
fixes: totals identical (LANDED 55, WRITTEN-not-LANDED 11), so the two guards
closed paths that were *reachable* but not currently exercised into a false pass
— protective, not retroactively load-bearing.

| # | Finding | Severity | Resolution |
|---|---|---|---|
| 1 | `getComputedStyle(el, '::before')` on an element with NO `::before` returns a full declaration of inherited/initial values — never null, never throws. A draft rule whose value coincided with an initial value scored LANDED for a box the clone never rendered. | HIGH — false LANDED | Generated-content guard: the probe reads computed `content` first and reports the element absent when it is `none`/`normal`/empty. |
| 2 | An empty draft value vs an empty computed value (`getComputedStyle` returns `''` for an unset custom property) compared equal → LANDED for a transfer never expressed. F2 deliberately captures empty values rather than dropping them. | HIGH — false LANDED | Empty draft value ⇒ `written=False` at attribution. Fixed there rather than patching the frozen §6 verdict contract. |
| 3 | The ground-truth control recorded `probe_targets` but `cmd_check` never read them. The probe half — the mechanism that actually closes the §7b false win — shipped with **zero** ground-truth coverage; "73→0" only ever covered section ownership. | HIGH — unverified half | Control records `probe_is_root`; `cmd_check` asserts a root rule is measured on the root and a descendant rule is NOT. Now 96/96 probe-checked, and **fails closed** if the control lacks the field. |
| 4 | `cmd_check` joined on `(property, tier, draft_value)`, omitting the selector. Under design-token reuse that collides, so an unattributed cell could read PASS because a *different* cell with identical values landed in the expected section. | HIGH — false PASS | `CellInput.source_selector` added (provenance only); the join is now exact. |
| 5 | `derived_selector` can hold a comma-separated chain (`.sgs-hero__headline, h1, h2`). Compared as a raw string, so a draft rule on the plain `.sgs-hero__headline` never matched — every hero/cta headline typography rule forced UNVERIFIED. Two sibling consumers already split this column. | MEDIUM — coverage loss (safe direction) | Split on comma, keeping class-led fragments only (the bare `h1, h2` fallbacks are not this block's element identity). **Measurable 220 → 231.** |
| 6 | The control's docstring still claimed "deliberately different methods — control by selector resolution, attributor by class-set membership". No longer true: the attributor now resolves selectors too. | MEDIUM — doc drift (triangulated by 2 raters) | Rewritten to state what is actually independent (separate re-implementation, different collision policy, frozen expectations) **and what is no longer falsifiable** (a flaw in the shared nearest-ancestor concept). Recorded rather than papered over. |
| 7 | `decompose_unattributed` classified by selector SHAPE before ownership, so a combinator rejected for spanning two sections would be filed as "NON-SIMPLE-SELECTOR / combinator" — the bucket lying about the cause while the total stayed right. | MEDIUM | Ownership checked first. Also fixed a `13300%` output artefact: buckets now report as a share of DECLARED cells, since `ATTRIBUTED-NO-PROBE-TARGET` is not part of the unattributed total. |
| 8 | `test_unmeasurable_descendant_never_lands_even_when_values_coincide` hand-built its `CellInput` with `written=False` supplied — it tested the verdict engine's contract, not the attribution/probe path its name and placement claimed. | MEDIUM — vacuous w.r.t. the fix | Renamed to `test_verdict_engine_contract_written_false_never_lands`; a companion added that drives the REAL `attribute_cells_to_sections` → `resolve_probe` path, plus one for the empty-value guard. |

**Control regeneration honesty check.** Finding 3 required adding a field to the
committed control, which risks moving the goalposts. Proven not to have:
all 98 pre-existing rows compared field-by-field (`selector`, `property`, `tier`,
`verdict`, `owning_section`, `probe_targets`, `match_count`) — **0 changed**, 98
gained `probe_is_root`, verdict totals identical. Before-image taken from
`git show HEAD:…`, not from the working tree.

**Negative control on the new probe check.** Planted the exact false win (make an
unresolvable descendant fall back to the section root) → `--check` exits 1 with
`[probe] … measured on the SECTION ROOT (a §7b false-win path)`. Restored and
confirmed byte-identical by md5.

## Known limits

- `derived_selector` holds some non-element synthetic keys (`.sgs-hero__gap`,
  `.sgs-hero__variant`), so a probe selector can name an element that does not
  exist on the clone. That fails **closed** — `_measure_cell_props` returns None →
  UNVERIFIED — never a false LANDED. Worth a tidy-up, not a correctness risk.
- `AMBIGUOUS SELECTOR` warnings persist on `rt-centred-maxwidth` (6 matches) and
  `sgs-card-grid` (4) — pre-existing, unchanged by this work.
- **Bean's eye (R-31-13) has not been given.** Numbers alone do not close this.
