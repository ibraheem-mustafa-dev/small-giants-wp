---
doc_type: seed-requirements
title: "Spec 39 (final cloning pipeline) — seed requirements captured from the Spec 35 migration"
spec_ref: will become .claude/specs/39-*.md — NOT YET WRITTEN
date: 2026-08-10
status: SEED — inputs captured while the evidence was fresh. Do NOT treat as a spec.
---

# Spec 39 seed requirements

**What this is.** Spec 39 (the final cloning pipeline) **does not exist yet** — 38 is the highest live
spec (`.claude/specs/` verified 2026-08-10). Bean directed that the pipeline reworks implied by the
Spec 35 flat→object migration be **captured as prioritised points for Spec 39**, not built now.

**The governing ordering rule (Bean, 2026-08-10 — D552):** the **block standard leads, the cloning
pipeline is reworked afterwards** to the universalised norm. The converter's inability to emit the new
shape is **scheduled work, never a precondition**. Recorded here so a future session cannot re-invert it
and block a standard change on converter cost.

⛔ **This file is inputs, not decisions.** Every item below is evidence + a question for Spec 39 to
answer. Nothing here is settled.

---

## R1 — Object-shape tier emission (the load-bearing item)

The converter must eventually emit `{desktop, tablet, mobile}` instead of flat suffixed siblings.

**What it does today, and it is not "nothing":** the converter **does** lift per-device values and
always has — in the **flat** shape. (An earlier claim of "no object emitter anywhere" conflated two
things; the precise statement is that it lacks an *object* emitter.) Every site below builds
`attr + 'Tablet'` / `attr + 'Mobile'`:

| File | Evidence |
|---|---|
| `scripts/converter/services/fold_helpers.py` | `:262` — `bp_decls['Tablet'] -> attr + 'Tablet'`; also `:291`, `:326`, `:352`. ⚠ **LIVE — see the refutation below; its own docstring used to claim otherwise** |
| `scripts/converter/services/extraction.py` | `:652` — `target_attr = f"{base_attr}Mobile" if is_mobile else base_attr` |
| `scripts/converter/resolvers/grid.py` | `:19` — "unsuffixed, Tablet → `*Tablet`, Mobile → `*Mobile`" |
| `scripts/converter/resolvers/grid_area.py` | `:16` |
| `scripts/converter/resolvers/styling_content.py` | `:9-10`, `:84` |
| `scripts/converter/resolvers/typography.py` | `:101` — "Tier-suffixed primary destination" |
| `scripts/converter/resolvers/outer_box.py` | `:386`, and `maxWidth`/`maxWidthTablet`/`maxWidthMobile` handling |
| `scripts/converter/resolvers/content_band.py` | `:250` |
| `scripts/converter/services/border_side.py` | `:28-30` |
| `scripts/converter/services/css_pass.py` | `:149` |
| `scripts/converter/db/db_lookup.py` | the `css_tier` SQL sites (`AND (css_tier IS NULL OR css_tier = 'desktop')`) |

**Question for Spec 39:** does emission become object-only, or dual-shape during a transition window
keyed on whether the target block has migrated that property?

### ⛔ A REFUTED "correction" — do not re-make it

A council rater (2026-08-10) read `fold_helpers.py`'s docstring, which said *"currently UNWIRED in the
new engine"*, and recommended **removing `fold_helpers.py` from this inventory as dead code**. Following
that would have left a **live** flat-tier emitter unmigrated.

**The docstring was stale.** The call graph refutes it: `assembly.py:260` imports
`route_area_css_to_block_attrs` and `:276` calls it (assembly step 3d), and
`tests/test_l4_area_wiring.py` exists to assert that live path — its own header says the L4 extraction
*"was UNWIRED (MF-5)"*, **past tense**. The stale docstring was corrected 2026-08-10 and now carries this
refutation inline; 7 converter tests pass.

⚑ **The transferable rule:** *"unwired" in a comment is a dated claim, not a fact.* Grep the callers
before believing it — including when the comment is in the file you are about to skip. This is the same
class as the project's existing `unwired-is-not-dead-separate-by-mechanism-not-count` and
`a-comment-that-justifies-a-breach-is-a-dated-opinion` rules.

## R2 — The breakpoint vocabulary is already DB-owned, and that is a strength

`styling_content.py:84` reads `modifier_suffixes(kind='breakpoint')` — the suffix vocabulary is **not**
hardcoded. So the rework is a DB + code change, not a hunt through string literals.

**Question:** does the object shape need a *new* vocabulary row-set (tier keys), or does it retire
`modifier_suffixes(kind='breakpoint')` for tier purposes entirely?

## R3 — `block_attributes.css_tier`: a per-tier identity stops being a row

Today a tier sibling is its **own row**, distinguished by `css_tier`. An object family collapses three
rows into one with the tiers *inside the value* — so the identity becomes a **path**, not a row. The
converter, every gate and all six surveys read that identity.

⚠ **A half-answered sub-question, carried from D552 §5:** object attrs mostly carry
`css_property = NULL`, **but the object shape is not the cause** — gallery's *object* `maxWidth` retains
`css_property = max-width` while the row blocks' object `maxWidth` is NULL. Likely a fossil, not a rule.
**Spec 39 must not design around the wrong explanation** — the seeding extraction settles it.

**Question:** does Spec 39 keep a **derived per-tier view** so existing DB-first consumers keep working,
or does every consumer migrate to reading the object? The derived view is cheaper and defers the
converter change; it is also a second representation of one truth, which this project generally
distrusts.

## R4 — Seeding is part of the pipeline contract, not an afterthought

`/sgs-update` populates the identity the converter reads. Whatever the Spec 35 migration's **P2**
decides about representation is a **Spec 39 input**, not a local fix.

**Measured 2026-08-10 (do not re-derive):** `/sgs-update --stage 1` seeds `attr_type` correctly for
object attrs. The stale-gallery case was simply nobody re-running it after a schema change, and a reseed
fixed it with no movement in the `inspector-scan` backlog.

## R5 — The BOX axis stays orthogonal to the TIER axis (D549)

`{top,right,bottom,left}` (BOX) and `{desktop,tablet,mobile}` (TIER) are **independent axes**. A
property can have one, both, or neither. Spec 39 must not re-conflate them.

⛔ **A known landmine, still armed:** `ResponsiveBoxControl` uses `base` internally where the PHP
normaliser expects `desktop` — `sgs_responsive_normalise_object()` (`helpers-responsive.php:277-291`)
tests only `desktop`/`tablet`/`mobile`, so a `{base,tablet,mobile}` object emits **nothing**. Contract
§12 field 6 calls this "unarmed, not disarmed" because no live call site crosses the two. Any Spec 39
work that makes a call site cross them arms it.

## R6 — The interim clone gate becomes Spec 39's entry condition

Per Bean's ruling C, during the migration a check FAILS a clone run that emits a flat tier for an
already-migrated property. **That gate's findings are the precise work-list for R1.**

**Where it lives** (found during council review): `sgs-clone-orchestrator.py` — `extract.json` is written
at `:2053`, and the R-31-15 anti-mirror gate already runs in that slot (`PIPELINE_STAGE_GATE_SCRIPT` at
`:70`, invoked ~`:2645-2670`, `--skip-stage-gate` at `:2404`). The new check belongs beside it, reading
the same artefact.

⛔ **"When the gate stops firing, R1 is done" is VACUOUSLY SATISFIABLE and must not be the acceptance
test as written.** If no clone run ever exercises a migrated property, the gate never fires, and zero
findings is indistinguishable from complete. Same shape as this project's
`empty-section-false-pixel-diff-win` rule. **Spec 39 needs a POSITIVE CONTROL:** a fixture clone against
a mockup section mapping to at least one migrated property, proven to trigger the gate before the rework
and go silent after.

## R6a — Two things learnable only by reading the converter now

- **The GRID_AREA object shape may already be half-solved.** `route_area_css_to_block_attrs`'s docstring
  records that its tier mapping "matches the post-D259 cascade semantics", i.e. someone reasoned the
  shape through once already. Read it before re-deriving GRID_AREA object emission from scratch.
- **`css_pass.py:211-255` is the merge-order site** — `native_attrs` → `result.attrs()` →
  `overlay_attrs` → `preset_attrs`, each `.update()`-ing over the last. An object-shaped emission has to
  slot in there without breaking that precedence. Nothing else in R1-R7 names it.

## R7 — Two measurement traps that cost real time this session

Recorded because Spec 39 will be measured, and both traps produce confident wrong numbers:

1. **A stray `/*` inside a `//` comment corrupted two gates' corpora at once** — inventing 73 findings
   in one and *hiding* 35 real ones in another, in **opposite directions**. Fixed at `f11b122a`
   (`stripComments` now strips line comments first, with Test G proven able to fail). Any new Spec 39
   scanner that strips comments must order the rules the same way and ship the same control.
2. **A count from a cached column is not a measurement.** `rules.json`'s `openBacklog` has produced a
   wrong figure before (a "363" that was a column sum, not a scan). Live-scan, always.

---

## What Spec 39 must NOT inherit

- **The 43 correct-as-is families** — 36 `asset_like` (a per-tier ASSET is a different resource per
  device; `sgs/media`'s tiers are a deliberate runtime swap, D521) and 7 `flag_like` (conjunctive
  per-device flags). These are not migration targets and must not become converter targets either.
- **Any cached count.** The block count, family count and stage counts in this project have each
  drifted. Spec 39 states methods and file:line sources, never figures in prose.

---

## 2026-08-11 groundwork notes — recording the current setup, not deciding anything

**What this section is.** Spec 35 (the flat→object storage-shape migration) is still open. This
section records what the survey + the converter code actually show TODAY, so that whenever Spec 39
starts it can begin from a checked picture instead of re-deriving one. **Nothing below is a design
decision** — no call is made here on object-only vs dual-shape, on fixing the tier vocabulary, or on
whether a derived per-tier view should exist. Those remain Spec 39's calls.

### G1 — What has and hasn't migrated (live survey, 2026-08-11)

Ran `cd plugins/sgs-blocks && npm run survey:responsive-shape`. Output: **83 blocks scanned, 251 tier
families found** — `flat_tiers` 128, `both_shapes` 29, `orphan_tier` 94; by triage hint,
`cascading_value` 115, `asset_like` 34, `flag_like` 7, `box_family` 1, `orphan` 94. The migration
work-list (flat cascading values only) is **41 blocks, 105 families**.

Confirms the CLAUDE.md pointer's account (`gap`, `maxWidth`/`contentWidth`, `gridTemplateColumns` done)
and gives the concrete state of what is explicitly named as NOT yet done:
- `gridTemplateRows` — still flat on every block that has it (e.g. `sgs/hero`, `sgs/container`,
  `sgs/cta-section`, `sgs/accordion`, `sgs/feature-grid`, `sgs/form`, and 11 more in the survey output).
- `columns` — still flat (`sgs/hero`, `sgs/multi-button`, `sgs/trust-bar`, `sgs/container`, `sgs/
  site-footer`, `sgs/site-header`, and more).
- The font-size families — still flat, e.g. `sgs/button` (`fontSize`), `sgs/product-card`
  (`descFontSize`, `pillFontSize`, `priceFontSize`, `priceFromLabelFontSize`, `priceNoteFontSize`,
  `tagFontSize`), `sgs/text` (`fontSize`), `sgs/heading` (`fontSize`), `sgs/label` (`fontSize`),
  `sgs/icon-list` (`headingFontSize`, `itemFontSize`).

This list is a **live-scan snapshot dated 2026-08-11** — re-run the survey command at Spec 39 start
rather than copying these names forward, per R7.2's rule about cached counts.

### G2 — The uniform choke point R1's table doesn't name

R1's table lists per-file evidence of flat-suffix construction, but every one of those sites funnels
through a single shared function. Verified by reading the file and counting callers:

- **`scripts/converter/services/tier_suffix.py:46`** — `return f"{base_attr}{tier}"` inside
  `tier_suffix()`. This is the ONE place the flat `{attr}{Tier}` string is built.
- **`scripts/converter/services/tier_suffix.py:65`** — `tier_state_suffix()` (which then appends an
  interaction-state suffix) calls `tier_suffix()` internally, so it also funnels through the same line.
- Grepped every call site of `tier_suffix(` / `tier_state_suffix(` under `scripts/converter/` (excluding
  the definitions and test files): **15 call sites across 6 resolver/service files** —
  `resolvers/grid.py` (7: lines 140, 156, 174, 203, 237, 270, 295), `resolvers/content_band.py` (2:
  lines 106, 188), `resolvers/grid_area.py` (2: lines 89, 151), `resolvers/outer_box.py` (2: lines 215,
  285), `services/border_side.py` (1: line 76), `resolvers/typography.py` (1: line 105, calls
  `tier_suffix()` directly rather than `tier_state_suffix()`).

**Why this matters for Spec 39, without deciding anything:** an object-shape rework that changes what
`tier_suffix()` (or its call inside `tier_state_suffix()`) returns touches all 15 call sites at once —
this is the leverage point R1's scattered per-resolver table doesn't surface. Whether the fix belongs
at that one function or has to unwind at each call site is a Spec 39 design question, not answered here.

### G3 — Three R1 items re-verified, two confirmed correct, one had drifted line numbers (now fixed)

Re-checked each of the three items flagged as worth re-verifying:

1. **A second path R1's table omits — confirmed present, unchanged.** `scripts/converter/services/
   root_supports.py:596` — `flat_probe = f"{camel_base}{bp_suffix}"` (the per-property native `style.*`
   lift). `root_supports.py:637` — `flat_probe = f"{shorthand}{side.capitalize()}{bp_suffix}"` (the
   padding/margin shorthand native lift). Both build the flat suffixed name independently of
   `tier_suffix()` (G2) — this is a genuinely separate emission path R1 doesn't list, confirmed still
   live at these exact lines.

2. **The shallow-merge risk in `css_pass.py` — confirmed present, line number corrected.** The merge
   chain is `scripts/converter/services/css_pass.py:211` (`merged: dict = dict(native_attrs)`), then
   `:214` (`merged.update(result.attrs())`), `:229` (`merged.update(overlay_attrs)`), `:255`
   (`merged.update(preset_attrs)`). Each `.update()` call replaces a whole dict key's value — so if two
   of these four sources each produced a tier OBJECT for the same attr name, the later `.update()` would
   overwrite the entire object (losing whichever tiers only the earlier source set), not merge tiers
   together. This matches what R6a already names at `css_pass.py:211-255`; recorded here as re-verified,
   not as new information.

3. **`fold_helpers.py` line numbers — CONFIRMED DRIFTED, corrected:**
   - R1 cites `:262` for `bp_decls['Tablet'] -> attr + 'Tablet'`. The comment is now at **`:265`**
     (`bp_decls['Tablet']      -> attr + 'Tablet'`, with `:266` for the Mobile line) — a 3-line drift.
   - R1 cites `:291`, `:326`, `:352` as further evidence sites. Re-read: **all three now point at
     unrelated code.** `:291` is `for prop in ("padding", "margin"):` (box-shorthand expansion, no tier
     string-building). `:326` is inside a `trace("cross_node_gap_candidate", ...)` call (a diagnostic
     log call, not construction). `:352` is a comment about a legacy name-convention fallback for
     per-area padding routing — not tier-suffix construction either.
   - **The real flat-tier construction site in this file is `fold_helpers.py:416`** —
     `dest = f"{attr_base}{tier_suffix}" if tier_suffix else attr_base` — inside the loop over
     `tier_values` (built at `:405-409` from `draft_mob`/`draft_tab`/`draft_base`). This is the line R1
     should have pointed to; `:262`/`:291`/`:326`/`:352` no longer serve as evidence for it.

### G4 — Box axis vs tier axis: carry the orthogonality rule forward

R5 already states this and documents the one armed-but-inert landmine. Restating only the operational
takeaway so Spec 39 doesn't have to re-read R5 to get it: **BOX `{top,right,bottom,left}` and TIER
`{desktop,tablet,mobile}` are two independent axes that combine (a property can have neither, one, or
both) — never collapse them into one axis or key one off the other's vocabulary.** The two prior
storage-shape gate rule-attempts that got this wrong are the reason it's called out again here; no new
file:line evidence was gathered for this item beyond what R5 already cites.

### UNVERIFIED

- **Whether `columns` and `gridTemplateRows` behave identically to `gridTemplateColumns` once
  migrated** (i.e. whether Spec 35 pass 3a's approach transfers directly) — not checked here; this is
  Spec 39 design work, out of scope for a groundwork note.
- **Total count of `.update()`-style shallow-merge sites elsewhere in the converter** beyond
  `css_pass.py`'s four — only the one file named in the task was checked; a full sweep wasn't run
  (would risk exactly the "cached count" trap R7.2 warns against).
