---
doc_type: plan
title: Colour capability-grant — implementation plan
date: 2026-08-23
status: U2 CLOSED 2026-08-24 (no_css_property 27 -> 4, the 4 are option-picker's by design). U1 triaged by census, not by hand. U3/U4 unstarted.
design: .claude/plans/archive/2026-08-23-colour-capability-grant-design.md  # ARCHIVED at 51deda006
slot: next session
governing: D542 (triad), D744 (capability moves), D750 (parse attr JSON), D751 (native-colour-ui closed), D752 (THE MANDATE), D294 (wrapper vs block-private). [D753 records a prove-the-cause miss; context only, not load-bearing here]
---

# Colour capability-grant — implementation plan

⛔ **More than 3 blocks/files/call sites? The first deliverable is the
DETECTOR, not the edit — `.claude/THE-MIGRATION-METHOD.md`.** Measured: a census-driven pass moves the corrections out of the tree and into the detector, where one commit fixes hundreds of sites. Figures + derivation live in ONE place — do not copy them here.

## BEAN'S MANDATE (D752) — the north star, not the machinery

> **APPLY HOVER + GRADIENT EVERYWHERE**, across all 58 blocks. His reasoning: hover on
> ordinary elements gives them life when done well, and a control existing does not force
> its use. The counter-argument was put to him and OVERRULED — do not re-open it.

Everything below is the MACHINERY to deliver that. If machinery and mandate ever conflict,
the mandate wins and the machinery changes. A coordinator who finishes every unit but has
not shipped hover + gradient on those blocks has not done the job.

**Goal.** Close rule 31's colour backlog by building the capability-grant pass and
widening the existing triad, so no colour control ships without a working paint path.

**Verify these numbers before building — they WILL be stale:**

    node plugins/sgs-blocks/scripts/colour-codemod/survey.js        # verdict counts
    node plugins/sgs-blocks/scripts/inspector-scan/run.js --json    # rule 31, run TWICE

Quoted here as of 2026-08-23: 292 findings / 58 blocks / 181 pairs; survey = 32 autofixable,
79 no-paint-path, 34 custom-property, 27 no-css_property, 15 unresolvable-attr, 77 conformant.

⛔ **292 IS STILL A FLOOR — BUT THE REASON GIVEN IN THE FIRST DRAFT WAS WRONG.**

The first draft said "rule 31 reads per-block `edit.js` only and cannot see shared panels".
**That is stale.** Verified 2026-08-23: rule 31 ALREADY carries the shared reach walk —
`resolveComponentFiles` / `reachedComponents` / `getSharedOwnerScan`, with `emitSharedRow`
wired at three call sites, reaching **136 components**. The claim came from
`survey-golden-conformance.js`'s docblock, which predates the 2026-08-20 widening that added
it. **Shared panels are IN scope and already covered — that carve-out is deleted.**

Today's zero shared findings is not blindness: the shared panels were genuinely fixed
(`GradientOverlayControl` at D738, `ShadowControl` + `GridItemDefaultsPanel` at Steps
5a/5b). Confirmed by checking the resolver still returns 136 entries rather than trusting
the zero — `zeroIsAClaim`.

**What genuinely keeps 292 a floor, measured:**
1. **Extension-owned rows** — see U11 below. `fx.js` alone mounts **5 standalone
   `<DesignTokenPicker>` elements, none with a `states=` prop**, invisible to the scanner
   and inherited by the **15 blocks** that declare the `fx` extension. U11 closes this.
2. **The `linkColour` element work** — needs a new `link` ELEMENT in the manifest, not
   another mapping. Still out of scope.

The 34 custom-property rows are **no longer out of scope** — every one of the four
consumption shapes has a deterministic transform, and none needs a fourth layer (see the
`/qc-council` section below).

---

## What the risk pass changed — read before executing

A cold Opus pre-mortem read the code and found six things. **Each was re-verified by the
coordinator against source before acceptance** — verification commands are inline so an
inheritor can re-run them rather than trust this paragraph. Two further cold reviewers (a
fresh-executor persona and an inheriting-coordinator persona) then read the plan itself;
their findings are folded in below and marked COLD-REVIEW FINDING. Nothing here is quoted
from an agent without a check.

### 1. U9 is DELETED — it contradicted the design's own out-of-scope clause
The design excludes "the 8 `linkColour*` attributes, which need a new `link` ELEMENT" and
then listed a unit to give `breadcrumbs`/`table-of-contents` `linkColour` a hover sibling.
Those are the same attributes. U9 would either do the excluded work or ship two attributes
with no `css_property` — deliberately reproducing the defect D751 recorded as OWED.
**Folded into U2**, which already owns manifest correctness.

### 2. ⛔ THE STATES-FLOOR LANDMINE — the sharpest edge in the programme
`requiredStatesFor()` (`core/golden.js:749`) matches by **ELEMENT, not attribute**:
```js
const declared = el.states ? Object.keys( el.states ) : [];
return Math.max( 2, 1 + declared.length );
```
So writing `states.hover` onto an element that already declares a DIFFERENT state raises
the required-states floor for **every attribute in that element's `attrMap`** — turning
conformant rows in untouched blocks into findings in a single write. Measured, the exact
landmines:

| Block | Element | Existing states | Attrs on it | Floor |
|---|---|---|---|---|
| `sgs/site-header` | `wrapper` | `["scrolled"]` | **18** | 2 → 3 |
| `sgs/option-picker` | `pill` | `["current"]` | 2 | 2 → 3 |
| `sgs/table-of-contents` | `link` | `["current"]` | 1 | 2 → 3 |
| `sgs/tabs` | `tab` | `["current","hover"]` | 5 | 3 → 4 |

The ratchet has **zero slack**, so the build fails — but the failures land in blocks
nobody touched, which is the worst diagnostic shape. **`sgs/table-of-contents.link` is
exactly what deleted-U9 would have touched.**
⚠ Today's manifest change (`4e73f28f`) was safe only because those five elements had no
prior states, or already had `hover`. That was luck, not design.

### 3. U2 MUST PRECEDE U1 — the survey's verdict cascade is ordered
`unresolvable-attr` → `no-css_property` → `gradient-not-extensible`. A row refused at
`no-css_property` **never reaches** the gradient test. Seeding those 27 mappings drops
them through, and some will land in `no-gradient-capable-paint-path-found`. Triaging the
79 first triages a population U2 is about to change.

### 4. U1's stated method described machinery that does not exist
`survey.js` has **no PHP AST** — `gradientExtensibility()` is two regexes over
`render.php` as a raw string, and `[^)]*` cannot cross a `)`. So
`sgs_background_paint_decl( sgs_colour_value( $attributes['x'] ), … )` is a **guaranteed**
false absence, as is any `$var = …` bind spanning a newline. That is a named, cheap,
falsifiable hypothesis for a chunk of the 79 — and it is U1's first action, ahead of any
hand-reading.

### 5. `grant.js` needs two refusals the design did not list
`sgs_block_background_layer_css()` claims `::after` **and** `isolation:isolate` on the
block root, unconditionally. **11 blocks' `style.css` already declare an `::after`** — two
owners for one pseudo-element is the exact defect this programme bans — and
`isolation:isolate` creates a stacking context that traps any absolutely-positioned
descendant currently escaping the root (drawer, dropdown, sticky). Silent, visual, zero
gate coverage. Add `refuse:root-pseudo-element-occupied` and
`refuse:root-has-positioned-escapee`.

### 6. Rule 31 is the WRONG INSTRUMENT for U3/U4
Rule 31 is a pure editor-side JS scanner with zero `.php` references (D744a). A grant
batch moves it only by whatever its `block.json`/manifest writes move — **the render
normalisation, the entire point of the unit, contributes nothing to that number.**
Verifying a grant batch by rule-31 delta means a grant that added the attributes and
botched the render reads as complete success.

### COLD-REVIEW FINDING (critical): element resolution was a RESULT, not a PROCEDURE
"Resolve which element text paints on, and which background paints on" is the most
load-bearing sentence in the programme, and it named an outcome with no method. Three
competent executors would diverge — DB `css_element`, a parse of `render.php`, or the
`block.json` element manifest — and they disagree exactly when the manifest is stale
against render.php, which this repo documents happening repeatedly.

**RULING — resolve in this priority order, and REFUSE when they disagree:**
1. **`render.php` itself** (tokeniser, not regex) — what the code actually paints is ground
   truth. Metadata never decides what is inside the file it describes.
2. **The `block.json` element manifest** — used to CONFIRM (1), never to override it.
3. **DB `css_element` / `css_property`** — confirmation only; it is derived from (2).

(1) and (2) disagreeing gives `refuse:manifest-disagrees-with-render`, naming both answers.
That disagreement is a real defect worth surfacing, not a tie to break silently.

### COLD-REVIEW FINDING (critical): the states-floor mitigation CONTRADICTED Gate 1
The mitigation said "assert the floor does not rise, OR enumerate and accept it" — a check,
not a decision. Three actions were all consistent with it, and one of them (skip the seed)
makes Gate 1's "no-css_property = 0" unreachable.

**RULING — seed it AND give every other attribute on that element its hover sibling in the
same commit.** Under D752 those attributes need hover anyway, so this is scope ALIGNMENT,
not scope creep. It is finite and enumerable: **26 attributes across the four known
elements** (`site-header.wrapper` 18, `tabs.tab` 5, `option-picker.pill` 2,
`table-of-contents.link` 1). Enumerate them in the commit message.

### COLD-REVIEW FINDING: "shared element" had no literal test
**RULING:** shared = the CSS selector string the background emitter targets and the one the
text emitter targets are **identical after whitespace normalisation**, compared as strings.
Not "same BEM block", not "looks like the root" — this repo has already been bitten by
wrapper-class-keying misclassifying exactly this. Anything else is
`refuse:ambiguous-paint-target`.

### COLD-REVIEW FINDING: "delete the superseded paint" must branch on `container_kind`
D294 is load-bearing and the design never cited it. A section/layout-KIND composite routes
colour through `SGS_Container_Wrapper`, which legitimately still reads it; a content-KIND
composite renders block-private. "Delete the old paint" means different things.
**RULING — CORRECTED BY /qc-council, 2026-08-23. The first version was FALSIFIED against
a measured baseline before anything was built.**

The original ruling said: read `block_composition.container_kind`, and refuse when unset.
Measured: `container_kind` is **NULL for 175 of 211 rows**, and **27 of the 58 target
blocks** — so that ruling would have refused **47% of the programme** on day one.

Worse, the obvious repair ("NULL means block-private") is also wrong. Measured on the 58:

| | calls `SGS_Container_Wrapper` | does not |
|---|---|---|
| `container_kind` populated | 30 | **1** |
| `container_kind` NULL | **13** | 14 |

The DB column disagrees with the code in **14 of 58** cases. So neither the column nor its
absence is a safe signal.

**CORRECTED RULING — identical in shape to the element-resolution ruling above, which is
the point: one priority order, applied everywhere.**
1. **`render.php` is ground truth** — does the block actually call `SGS_Container_Wrapper`?
2. **`container_kind` CONFIRMS only.** It never overrides the code.
3. They disagree → `refuse:container-kind-disagrees-with-render`, naming both.

⚠ The single `populated + no wrapper` block is a real data defect. Name it in the residual.

### Gap found by the plan-quality grade: the 15 `unresolvable-attr` rows are homeless
They appear in the survey's verdict table and then in neither the unit list nor the
out-of-scope list. Silence is not a decision. **Ruling: they join U1's triage** — an
attribute the survey cannot resolve is the same class of problem as a paint path it
cannot see, and the same tokeniser pass answers both. If any remain unresolvable after
that, they are named in the residual, not left implicit.

### Also found, by the tooling check
**U10 — none of `survey.js` / `fix.js` / `adopt.js` accepts a `--block` filter.** U4
cannot batch without one. Previously parked as an `adopt.js`-only gap; it is all three.

### Also found, and it is latent not live
The delta key `block+kind+rowKey` **collides**: 3 colliding pairs measured
(`sgs/hero|below-min-states|border-colour`, `sgs/trust-bar|below-min-states|label-colour`,
`sgs/trust-bar|missing-gradient|label-colour`). A fix and a regression in the same bucket
cancel silently. Separately, **0 rowKeys are line-derived today**, so the line-number
hazard is latent rather than live.

---

## ✅ U2 CLOSED — 2026-08-24

`REFUSED:no-css_property` **27 → 4**. Survey total held at 264 at every step, so nothing
leaked. Rule 31 held at 291-292 across agreeing double-runs throughout — **which is the
point of §6, now proven: rule 31 is a JS-only scanner and cannot see a manifest or render
change.** Verifying this class of work by rule-31 delta would have read as zero progress.

**The 4 remaining are NOT this plan's to fix.** product-card's `pickerLabelColour` /
`pickerPillBgColour` / `pickerPillTextColour` / `pickerPillBorderColour` are forwarded to
`sgs/option-picker` via `render_block()` (render.php:1121-1145, :1542-1558). product-card
emits no CSS for any of them; option-picker's own `pill` and `label` elements already own
them, including a `selected` state. Mapping them here would create a second writer for one
painted node.

**What actually closed them — three causes under one verdict name.** `survey.js:318` fires
`no-css_property` on `! mechanism`, i.e. "no resolvable MECHANISM", so it also catches rows
whose `css_property` is populated and correct:

| Cause | Fix | Rows |
|---|---|---|
| No manifest mapping | `css:` entry in the element `attrMap` | 17 |
| Mechanism vocabulary gap | added `fill` to `MECHANISM_BY_CSS_PROPERTY` | 1 |
| Role misclassified `image-object` | 2 entries in `attr-classification-overrides.json` | 2 |
| Consumer in a PHP-built CSS string, not style.css | new `sublink` element | 1 |
| No member available (2nd `css:fill` on one element) | new `star-empty` element | 1 |

**A parser extension, not a new tool (`f10f52da`).** `extract-signatures.py` already
followed custom-property wiring into style.css; its shape A was DIRECTIONAL, matching only
`'attrName' => '--sgs-foo'`. product-search and nav-menu write the inverse. Adding the
inverse shape resolved 6 attributes with no new file.

⚠ **F6 check #8 caught a real defect the extension created.** `inputBorderColour` resolved
to `border-color` with `css_element` NULL — it fell to the ROOT routing domain and would
have MISROUTED ON A CLONE. A `css_property` resolved without an element is not a win.

**Elements added:** testimonial `summary`, nav-menu `sublink`, product-search `input`,
star-rating `star-empty`. Two use `prefix: ""` — findOrphans' documented opt-out — because
neither shares a name prefix with its attribute.

---

## MEASURED 2026-08-23 — U1 triage answered by an EXISTING tool, not by hand

⛔ **Do not re-derive these by reading render.php.** `census-colour-paint-route.py`
already answers "how does each block route its colour paint", with a committed,
arguable method in its own docstring. It existed before this plan was written and
was not cited by it. Joining its `--json` output to `survey.js --json` triages the
refused rows in one pass:

| Block paint route | Refused rows | Reading |
|---|---|---|
| `direct` | **46** | Block DOES call a paint helper, yet the survey found no gradient-capable path for this attribute — the §4 nested-call regex blindness, with a population attached |
| `wrapper` | **27** | Routes via `SGS_Container_Wrapper`; a per-block render.php scan structurally cannot see it |
| `neither` | **28** | No paint helper, no wrapper call — the genuine-absence candidates |

**73 of 101 have a NAMED structural reason the detector missed them. At most 28
need investigation for genuine absence** — against a plan that budgeted hand-reading
79. The census's own docstring predicted half of it: it states that WRAPPER+NEITHER
is "the population a PER-BLOCK resolver cannot see".

⚠ **CANDIDATE LIST, NOT A VERDICT LIST.** This joins a per-BLOCK signal to per-ROW
refusals. A block calling a paint helper somewhere does not prove THIS attribute has
a gradient-capable path. `direct` means "worth opening", never "already fine".

⚠ The 79 in this plan is stale — the population is 101 after U2 dropped rows through
the verdict cascade. Re-derive before use; do not quote either number as fixed.

Concentration of the 46: nav-menu 10, pricing-table 6, process-steps 5,
testimonial 5, mega-panel 4, card-grid 3, tabs 3.

---

## Work units

| Unit | Produces | Depends on | PERT | Critical path |
|---|---|---|---|---|
| **U2** MANIFEST-SEED (+ ex-U9) | `no-css_property` 27 → 0; manifest correctness | — | 27 min | no |
| **U1** TRIAGE-79 | Each of 79 classified, with the regex-blindness probe first | **U2** | 37 min | informs sizing |
| **U6** IDENTITY | `resolveIdentity()` — ATTRIBUTE-NAME identity only (extract, find siblings, never rename). ⚠ Does NOT cover element/paint-site resolution — that is U3's, per the ruling below. The two were conflated until cold review | — | 45 min | **yes** |
| **U8** CHECK-LEG | Per-unit instruments + collision assert | — | 22 min | **yes** |
| **U10** BLOCK-FILTER | `--block` across survey/fix/adopt/grant | — | 18 min (O10/R15/P40) | **yes** |
| **U3** GRANT-CORE | `grant.js` + named refusals + mutation-proven self-test | U6 **+ the element-resolution ruling below** | 98 min ⚠ | **yes** |
| **U4** GRANT-RUN | Batched execution, deploy + live-verify per batch | U1,U2,U3,U8,U10 | ~180 min | **yes** |
| **U5** FIX-WIDEN | `fix.js` gains the gradient dimension | U6, U4 | 37 min | no |
| **U7** SHAPE-REGISTRY | Dispatch table incl. legacy `DesignTokenPicker` | U6, U8 | 38 min | no |
| **U11** EXTENSION-ATTRIBUTION | Rule 31 attributes extension-owned rows via `supports.sgs.enabledExtensions` (a reach MAP, not a reach WALK) | — | ~35 min | no |

⛔ **U3 IS A FEASIBILITY RISK, NOT ONLY AN ESTIMATION RISK — and the plan's own
de-risking mechanism does not address it.** Gate 2 collapses U3's *estimate* by timing
U6 first, but U6 is ATTRIBUTE RESOLUTION; it derisks none of the render rewriting. The
unproven premise is different and larger: six blocks were normalised BY HAND, with human
judgement at every ambiguous point. That is not evidence that the same transformation can
be *automated* across 58 blocks of unknown shape. **Add a spike to Gate 2: point a
throwaway `grant.js` at ONE already-migrated block and require it to reproduce the
hand-written result.** If it cannot reproduce a known-good answer, the automation premise
is false and the programme re-scopes to assisted-manual before U3 is built, not after.

⚠ **U3's 98 min is also the one UNCALIBRATED estimate** — nothing in the repo records how long
building a comparable codemod took (`fix.js` is 2,098 lines with no time record).
**Collapse it cheaply: build U6 first, time it precisely, re-estimate U3 from that
actual.** U6 is a genuine subset of U3's problem with the same failure modes.

**Parallel opportunity:** U2, U6, U8, U10 are mutually independent → ~102 min saved
against running them serially. U1 now waits on U2.

**Critical path:** U6 → U3 → U4 ≈ **5.4 hours**, with U4 costed as ~2.2 min/block × 58
plus batch overhead amortised across ~6 batches (deploy 72s + build ~3 min + probe ~5 min
per BATCH, not per block — that amortisation is what makes 58 blocks tractable).

**First action, ≤5 min, zero dependencies:** U2 on ONE block — add the four `css:`
mappings to a single element manifest whose element declares no prior state. Proven method
(today's six blocks); the state-check is the only new part.

---

## Per-unit failure modes and mitigations

| Unit | Most likely failure | Silent? | Verifiable mitigation |
|---|---|---|---|
| **U2** | Writes `states.hover` onto an element declaring a different state, raising the floor for its whole `attrMap` (18 attrs on `site-header.wrapper`) | Detectable late; **cause silent** — failures land in untouched blocks | Before writing, assert per element that `declared ∪ {hover}` does not raise the floor, OR enumerate every attr on it and accept the rise explicitly. Post-condition: every seeded attr resolves to a non-null `css_property` — seeding a row is not seeding a mapping |
| **U1** | Triages the pre-U2 population; "detector-blind" judged by the same regex that caused the false absence | **Silent** | U2 first. Resolve by PHP **tokeniser**, not regex. Every "genuinely-absent" verdict must name the line it opened. Positive control: three synthetic nested-call snippets the current regex misses — all three must classify detector-blind |
| **U6** | Binds to the wrong sibling by name similarity (`boxShadowColour`/`cardShadowColour`/`tileShadowColour` coexist), or writes the attr and skips the manifest half | **Silent** — WP accepts it; it just paints the wrong element | Bind on the element manifest's `attrMap` (same element + `css_property`), never on name. Make the `block.json` write and the manifest write ONE atomic function with a post-condition assert |
| **U8** | One instrument used for units it cannot measure; colliding normalised keys cancel a fix against a regression | **Silent both ways** | Per-unit instruments (below). Add a **collision assert**: refuse to run if any `(block,kind,rowKey)` appears more than once |
| **U10** | A filter that silently matches nothing, so a batch run reports success having touched zero files | **Silent** | Assert the filter matched ≥1 block and that the touched-file set is a subset of the named blocks |
| **U3** | Installs `::after` on a root that already owns it, or traps a positioned descendant via `isolation:isolate`. Subtly wrong page, no error | **Silent, and the cheap check cannot see it** — CSS is lifted to `uploads/sgs-css/<hash>.css` | The two new refusals. Verification is **computed style on the painted element**, before and after, on a live probe page — never a page-HTML grep. Negative-control instance must show zero paint |
| **U4** | Coordinator trusts per-batch green | **Silent** — D750 recorded two agents shipping a defect while honestly reporting green | Coordinator re-runs the **full prebuild chain** after every batch plus `git diff --stat` scoped to the batch's files. One batch = one path-scoped commit, branch re-checked in the same command |
| **U5** | Widening drops the all-or-none rule and half-fixes: a partially-fixed row still verdicts AUTOFIXABLE, so it looks untouched forever | **Silent by construction** (`fix.js`'s own header names this) | Keep all-or-none; widen the DIMENSION SET, not the rule. Self-test asserts **zero** rows remain AUTOFIXABLE in touched blocks. Exact TOTAL-count assertion |
| **U7** | The `DesignTokenPicker` transform changes key derivation (`slugify(label)` vs literal `key:`), so all 15 rows read as one closed + one net-new | Detectable, easily rationalised as churn | Emit `key:` as the existing label slug verbatim. Round-trip self-test: `describeRow()` on the output returns the same `rowKey`/`statesCount`/`hasGradient` as the input — copy `adopt.js`'s existing control |

**What a refusal means for a batch (COLD-REVIEW FINDING).** A block `grant.js` refuses is
a **legitimate residual, not a batch failure** — the batch still passes. The refusal, its
named reason and the block go into the progress log and the final residual. The ONE
refusal that STOPS a batch is `refuse:manifest-disagrees-with-render`, because that says
the repo's own metadata is wrong and every later automated pass inherits the error.

**Integration risk — two writers, one hazard.** `grant.js` and `fix.js` both write
`block.json`, so D750's splice hazard exists twice while the rule is stated once. **Make
attribute-JSON writing a single shared module** both import, with the `"padding":{}` case
as its self-test fixture. Two implementations of one rule is how one of them drifts.

**Sequencing is not enforced.** `grant → survey → fix → adopt` is correct but nothing
makes it happen. Add a cheap guard: `fix.js` refuses to run if the survey output is older
than the newest `render.php` mtime.

---

## U11 — extension attribution, and why "just add the folder" does not work

**Bean asked (2026-08-23): can't rule 31 pick up the shared helper / extension folders the
way the other scanners do?** For shared components it already does — see the corrected floor
framing above. For EXTENSIONS it cannot, and the reason is the attach mechanism, not a
missing wire.

Extensions hook in via `addFilter( 'blocks.registerBlockType', … )` — higher-order
components. **There is no literal JSX mount anywhere for a reach WALK to follow.** Pointing
`resolveComponentFiles` at the folder finds fx.js's exported CONSTANTS (`FX_OPTION_LABELS`,
`FX_EASE_OPTIONS`, …) and no mountable component, which is exactly what it returns today.

**The fix is a reach MAP, not a reach walk.** `block.json` already declares
`supports.sgs.enabledExtensions`, so the extension's rows are attributed to every block that
opts in — a declarative lookup against data that already exists, instead of following mounts
that are never written.

**Measured population:**

| | |
|---|---|
| Standalone `<DesignTokenPicker>` mounts in `fx.js` | **5** |
| How many carry a `states=` prop | **0** — all single-state, all would flag |
| Blocks declaring the `fx` extension | **15** |
| `hover-effects.js` colour rows | 0 |

⚠ **THIS WILL RAISE THE COUNT WHEN FIRST WIRED, AND THAT IS THE DETECTOR GETTING HONEST —
NOT A REGRESSION.** Exactly as the 2026-08-20 shared-owner widening moved 409 → 420. Say so
in the ratchet reason BEFORE running it, or the next reader will misread the rise. The
ratchet has zero slack, so plan the raise deliberately rather than discovering it mid-build.

⭐ **High leverage, same argument the shared-owner widening made:** five rows, one edit in
`fx.js`, landing for 15 blocks.

## Instruments — per unit, because one number cannot cover them all

| Unit | Instrument |
|---|---|
| U3 / U4 | **`survey.js` verdict migration** + a computed-style live probe. NOT rule-31 delta — rule 31 cannot see `render.php` |
| U2 | `css_property` non-null for every seeded attr + the states-floor assert |
| U5 / U7 | Rule-31 delta on the collision-asserted normalised key |
| Every batch | Full prebuild chain, exit 0 |

---

## Gates

**GATE 1 — SIZED.** After U2 + U1.
PASS: `no-css_property` = 0; the regex-blindness probe run FIRST (three synthetic
nested-call snippets the current regex misses — all three must classify detector-blind);
every "genuinely-absent" verdict naming the line it opened; survey re-run recorded.
⚠ **U1 triages whatever `no-gradient-capable-paint-path-found` rows exist in the survey run
AFTER U2 — re-derive the list, do NOT reuse the pre-U2 79.** U2 drops rows through the
verdict cascade, so the population changes underneath it.
DECISION: is the render work bigger than the design assumes? If genuinely-absent ≫
expected, re-scope before building `grant.js`.

**GATE 2 — IDENTITY PROVEN + U3 RE-ESTIMATED.** After U6.
PASS: atomic write proven (attr + manifest, or neither); binds on manifest not name;
U6's actual wall-clock recorded and U3's PERT recomputed from it.
This gate exists to collapse the programme's one uncalibrated estimate.

**GATE 3 — GRANT BUILT, BEFORE IT WRITES AT SCALE.** After U3.
PASS: every named refusal has a fixture that reproduces it; `prove-selftest-can-fail.py`
turns the suite RED **with the break confirmed landed**; exact TOTAL-count assertion
present; the two new refusals implemented.
FAIL: any refusal without a fixture. A refusal nobody proved can fire is a refusal that
will not fire.

**GATE 4 — FIRST BATCH LIVE. ⭐ THE GO/NO-GO.** After the first U4 batch (pilot: 2–3
mid-complexity blocks, NOT the heavy ones).
PASS: survey verdicts migrated as predicted; computed-style probe green **with its
negative control clean**; zero genuinely-new rows on the collision-asserted key; full
prebuild exit 0; Bean's eye on the rendered result (R-31-13).
FAIL: stop. A silent render defect fanned across 58 blocks is the programme's worst
outcome and this is the last cheap place to catch it.

**GATE 5 — SWEEP COMPLETE.** After U4. All batches deployed and verified; residual named.

**GATE 6 — FINAL RATCHET.** After U5 + U7. Ratchet lowered to the measured floor with
zero slack, proven to bite by reading the exit code (not by grepping output).

---

## Batching — measured, heaviest-first after the pilot

⚠ **The pilot is a SUBSET, not an extra group** — 9 + 15 + 13 + 21 = 58 exactly. Pilot
blocks are drawn FROM Medium and then not repeated.

| Group | Blocks | Findings |
|---|---|---|
| *(pilot: 2–3 drawn from Medium)* | *subset* | *~10* |
| Heavy (10+ each) | 9 | ~120 |
| Medium (5–9) | 15 | ~100 |
| Light (3–4) | 13 | ~45 |
| Trivial (1–2) | 21 | ~28 |

The 10 heaviest carry **129 of 292**. Heaviest-first maximises early signal — but only
AFTER the pilot has proven the mechanism, because the heavy blocks are the worst place to
discover a systemic fault.

---

## Progress recording — because "the coordinator will remember" is not a mechanism

⛔ This plan's weakest point on the system-effect check: nothing owned the record of what
had actually been done. That is the documented failure mode — Bean will not remember, and
a fresh session cannot tell a claim from a verification.

**Every batch appends one row to `reports/colour-grant-progress.md`**, written as part of
the batch commit, never afterwards from memory:

| Batch | Blocks (enumerated) | Commit | Survey verdicts before → after | Probe | Gate |
|---|---|---|---|---|---|

Rules that make it trustworthy rather than decorative:
- **Blocks are enumerated, never "the heavy batch"** — a range is not a record.
- **The survey figures are pasted from the run**, not recalled.
- **"Probe" records the negative control's result too.** A probe row without its negative
  control is not evidence.
- **A gate row is written only when the gate actually passed**, with the command that
  proved it. An intention is never recorded in the same column as a result.

## Rollback

One batch = one path-scoped commit, so one batch = one `git revert`. State in each batch
commit which blocks it covers, so a later revert does not have to be reconstructed by
reading diffs. **Do not batch across a deploy boundary** — a batch whose blocks were
deployed together can be reverted and redeployed together.

## /qc-council finding — the "impossible" carve-out is a MISSING FOURTH LAYER

Bean's goal is **the full set via deterministic multi-shaped enforcement**, which put the
34 `paints-via-colour-valued-custom-property` rows back on the table. Measured, they are
not impossible — the design's three-layer model (`block.json` / `edit.js` / `render.php`)
simply never included **`style.css`, where the consumer lives**.

A gradient CAN live in a custom property. It fails only when the CONSUMER puts it in a
colour-only slot. Measured across every block — 103 colour-var consumption sites:

| Consumption slot | Sites | Gradient-capable | Deterministic transform |
|---|---|---|---|
| `background` / `background-image` | 25 | **already yes** | none needed |
| `background-color` | 30 | no | **`sgs_block_background_layer_css()` on `::after` — no wrapper needed.** `BackgroundPanel` is the optional upgrade for media/parallax. ⛔ Rewriting to the `background:` shorthand is SUPERSEDED — do not build it |
| `color` | 38 | no | `sgs_text_colour_gradient_fallback_rule()` — **already built** |
| `border-color` (+ `-bottom`/`-right`) | 9 | no | `sgs_border_gradient_css()` masked ring — **already built** |
| `stroke` | 1 | no | `sgs_svg_stroke_gradient()` — **already built** |

**Every transform already exists as a shared helper.** This is the multi-shaped enforcement
in its literal form: the SHAPE is the CSS slot, and each shape has exactly one transform.

### ⭐ BEAN'S ANSWER TO THE RISKY SHAPE (2026-08-23) — adopt `BackgroundPanel`

The `background-color:` → `background:` rewrite was the ONLY one of the four shapes with no
existing helper and a real silent-breakage mode: the shorthand RESETS `background-image`,
`-position`, `-repeat`, `-size` and `-clip`, so any block leaning on those alongside its
colour changes appearance with no error. **Bean's proposal removes that transform entirely.**

`src/blocks/container/components/BackgroundPanel.js` (617 lines, its own docblock calls it a
"shared wrapper panel", re-exported to ~30 call sites) already owns the whole background
stack — and the container wrapper renders it as **`background-image:` on a `::before`
layer**. `background-image` is gradient-capable BY CONSTRUCTION, because a gradient *is* a
background image. So there is nothing to rewrite and no shorthand to reset.

**It also ADDS capability rather than merely enabling a gradient** — verified present in the
panel: background video, SVG, overlay colour, overlay opacity, blend modes, parallax. Nine
rows that today have a flat colour and nothing else would gain all of it. That is D744
running forwards instead of defensively.

**Measured scope of the swap — the 34 custom-property rows by what they actually paint:**

| Paints | Rows | Route |
|---|---|---|
| **Background** | **9** | **`BackgroundPanel`** (Bean's route) |
| Text | 21 | `sgs_text_colour_gradient_fallback_rule()` — exists |
| Border / divider | 2 | `sgs_border_gradient_css()` — exists |
| Icon / shape | 2 | `sgs_svg_stroke_gradient()` — exists |

### ⛔ CORRECTION (Bean, 2026-08-23) — background COLOUR and background MEDIA are TWO
### SEPARATE CONCERNS, and the colour one needs NO wrapper

An earlier version of this section said four of the nine background rows "need the wrapper
first". **That was wrong.** Bean's correction: a block needing a background COLOUR gets it
from the fill helper, separately from the media stack — and that helper is standalone.

**Verified:** `sgs_block_background_layer_css()` is called today by `buybox`, `label` and
`text`, none of which call `SGS_Container_Wrapper`. It needs no wrapper, on any block.

**The two concerns, and why they compose rather than compete — verified in code:**

| Concern | Control | Emitter | Layer | Needs the wrapper? |
|---|---|---|---|---|
| Background **COLOUR** (flat / gradient / hover) | `fillRow` in `SgsColourPanel` | `sgs_fill_decls()` + `sgs_block_background_layer_css()` | **`::after`** | **No** |
| Background **MEDIA** (image / video / SVG / overlay / blend / parallax) | `BackgroundPanel` | container wrapper | **`::before`** | Yes |

They use DIFFERENT pseudo-elements, so one block can carry both — `sgs/info-box` does today.
The fill helper's own docblock states the reason at `helpers-tokens.php:849`: *"Two
pseudo-elements cannot share one selector"*, which is why the split exists at all.

**What this changes for the 34 rows:**
- **All 9 background rows take the fill helper. Zero wrapper work.** The gradient problem is
  solved for every one of them by the route already proven on six blocks at D751.
- **`BackgroundPanel` is an OPTIONAL CAPABILITY UPGRADE, not a prerequisite** — the route you
  take when a block should also offer image, video, SVG, overlay or parallax. Bean's framing:
  the parallax controls are there *if you choose to make it a gradient* and want it to move.
  Decoupled from this programme; a separate, additive decision per block.

⚠ **The real collision risk survives and is unchanged:** the fill layer claims `::after`, and
**11 blocks' `style.css` already declare an `::after`**. That is what
`refuse:root-pseudo-element-occupied` is for. It is a fill-layer problem, not a wrapper
problem.

⚠ **Do NOT read "adopt BackgroundPanel" as "mount the panel and done".** The panel is the
CONTROL; the `::before` layer is the RENDER. A block gaining the control without the
wrapper's layer gets a dead control — the defect this whole programme exists to remove.
Adoption means both halves, verified by computed style on the live page.

⚠ **The 21 text rows are the biggest single group and are NOT covered by this.** They keep
the `background-clip:text` route, which brings its own constraint: a text gradient clips the
element's whole background area, so any element taking one cannot also paint its own
background on the same node — the `::after` split from D751 applies again.

**Scope decision is Bean's** — see the LEDGER. Adding the fourth layer brings the 34 rows
(16 blocks) in and is the difference between "a floor" and "the full set".

## Standing constraints

- **Shared worktree.** Path-scoped commits, filenames enumerated, never a glob. Re-check
  the branch in the same command as the commit.
- **`/sgs-update` writes the SHARED DB** — run it alone, announced, never while a sibling
  session is mid-write.
- **Never `phpcbf`** — realign by hand; every touched file returns to its HEAD phpcs baseline.
- **Never reimplement row resolution** — `describeRow()` is the one resolver.
- **Attribute names are the caller's** — never renamed (D338: WP silently discards
  undeclared attrs, so a missed authoring is invisible until a client's colour vanishes).
- **Per-agent green is not evidence** — the coordinator re-runs the full gate set.
