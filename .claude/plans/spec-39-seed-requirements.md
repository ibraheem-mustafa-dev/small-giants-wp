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

## 2026-08-12 — QC-council findings that CONSTRAIN R1's design (three of these were paid for by being wrong first)

**Provenance.** A `/qc-council` (3 raters + structural pre-gates) ran against a proposed R1-shaped fix
on 2026-08-12 and **falsified it twice over**. The fix was NOT built (D554 ruling C forbids the shim);
what survives is the evidence below. Full record: `.claude/plans/2026-08-12-converter-db-drift.md`,
`decisions.md` D590. **These are inputs, not decisions** — same status as the rest of this file.

### G5 — ⛔ THREE shapes hide under `attr_type='object'`, and NOTHING in the schema separates them

This is the single hardest constraint on R1 and it is **not** the same statement as R5/G4's
BOX-vs-TIER orthogonality. Even once you know the two axes are independent, you still cannot tell
these apart from the data:

| # | Shape | Example | `{base}Tablet` declared? | PHP consumer | Correct emission |
|---|---|---|---|---|---|
| 1 | flat-sibling trio | `sgs/hero.imagePadding` (+`Tablet`/`Mobile`) | **YES** | three separate array reads | **flat — already correct today** |
| 2 | migrated tier-object | `contentBandPadding`, `gap`, `maxWidth`, `columns`, `fontSize`, `sgs/media.order`, `decorative-image.positionX/Y` | no | `sgs_responsive_normalise_object(...)` → `.desktop/.tablet/.mobile` | **object — R1's actual target** |
| 3 | base-only box, **NO tier support** | `sgs/text.borderWidth` | no | its `render.php:141` reads `is_array($attributes['borderWidth'] ?? null) ? … : array()`, then decomposes it into `['top']`/`['right']`/`['bottom']`/`['left']` — a **BOX, never tiers**. ⚠ Be precise when re-checking: that file DOES contain 4 tier calls (`:58` `fontSize`, `:62` `lineHeight`, `:67` `letterSpacing`, `:329` the emit) — **none carries `borderWidth`**. A bare `grep sgs_responsive_normalise_object` on this file returns 4 hits and would wrongly look like a refutation | **flat — folding it renders NOTHING** |

⛔ **CORRECTION 2026-08-12 (same day): `sgs/container.gridItemPadding` was cited here as the canonical
Shape 3 example and that is WRONG — it is Shape 2.** `class-sgs-container-wrapper.php:2279-2296` feeds
it into `$obj_inner_props[]`, i.e. the tier-OBJECT emission path. The block ALSO has a flat
`sgs_serialise_box_sides(...)` read elsewhere in the same file, and citing only that one produced the
misclassification. ⚑ **Transferable:** a property can have TWO reads in one file — finding a flat read
does not establish there is no tier read. The `//` comment just above `:2279` calling this plumbing
"deferred" is itself stale and is contradicted by the code beneath it. The three-shape CONSTRAINT
stands unchanged; only the example was wrong.

- Testing `attr_type == 'object'` conflates all three.
- Testing "does `{base}{Tier}` exist as its own row" separates 1 from {2,3} — **but NOT 2 from 3.**
- `box_family_for()` also conflates them.

**A rule that folds shape 3 is a REGRESSION on a currently-working path**, not a fix. Spec 39 must
find a genuine signal for 2-vs-3 (leads, each UNVERIFIED: the `default_value` carrying a `"desktop"`
key; whether the PHP consumer calls `sgs_responsive_normalise_object` for that attr) — or scope R1 to
an explicit DB-derived allow-list of known-migrated properties. **An honest narrow rule beats a wrong
broad one.**

### G6 — G2's open question is ANSWERED: the fix cannot be a post-hoc pass over emitted writes

G2 asks *"whether the fix belongs at that one function or has to unwind at each call site."* Partly
settled, by reading the control flow rather than the string-building:

**The resolvers GAP OUT before any `Write` exists.** The shape at the call sites is
`attr = tier_state_suffix(base, decl, conn)` → `if not validate(ctx, attr, value): return gap_writer(...)`.
For a migrated property the suffixed name (`gapMobile`) is undeclared, so `validate()` fails and the
resolver returns a GAP — **no `Write` is ever produced**. Any design that normalises *collected writes*
therefore has nothing to normalise. R1 must act at or before the attr-resolution/validate seam.

⚠ **And the 15 call sites are not uniform: 6 of them never call `validate()` at all** — they gate
solely on `box_family_for()` (the box/border forks in `grid.py`, `content_band.py`, `grid_area.py`,
`services/border_side.py`). So "make `tier_suffix()` return the base name so `validate()` passes" does
not even apply to those six — and they are precisely the path that produces the shape-3 regression in
G5. G2's count of 15 is right; its implied uniformity is not.

*(Also: G2 lists `services/state_value_lift.py` among the callers. It only MENTIONS `tier_state_suffix`
in a docstring — it resolves via `db_lookup.attr_for_state_property` instead. 15 real call sites stands,
but that file is not one of them.)*

### G7 — Two positive findings R1 can rely on

- **`Write.tier` is reliably populated** at every construction site (`Base`/`Tablet`/`Mobile`/`Desktop`).
  Every site gates on `decl.is_device_tier` first, filtering `Other:<cond>` out before a Write is built;
  the one hardcoded case (the synthetic `align_finalise` write) sets `Base` explicitly. So a tier key is
  always available at emission time without re-deriving it.
- **Collapsing `Desktop` into the same bucket as `Base` has precedent** — `content_attr_for_element`
  already does it, with test coverage. A `{Base,Desktop} → desktop` mapping is consistent, not novel.

### G8 — One live landmine R1 must not widen: `sgs/button.boxShadowHover`

The ONLY block declaring `{base}Hover` where the base is `attr_type='object'`. `boxShadow` there is a
**fixed-schema descriptor** (`{colour,hOffset,vOffset,blur,spread,inset}`) — neither a box-of-sides nor
a tier object — and its PHP consumer `array_merge`s it expecting those keys. The box-shadow resolver
writes a **preset-slug string**, so base-tier box-shadow on that block is *already* broken (string into
a rich-descriptor object). **An object-collapse rule that doesn't condition on tier would widen that
existing bug from Base-only to Tablet/Mobile+Hover.** Zero `%TabletHover`/`%MobileHover` rows exist
anywhere, so the correct behaviour is to keep gapping.

### G9a — ⛔ R6's gate was ALREADY BUILT; it was BROKEN, and is now fixed (2026-08-12)

**Correcting this file's own R6 and a 2026-08-12 claim of mine that it was "never built".** The D554
clone-output gate has existed since **2026-08-11** (`fa638cea`) as
`scripts/orchestrator/check_flat_tier_regression.py`, wired into BOTH
`scripts/orchestrator/pipeline-stage-gate.py` and `sgs-clone-orchestrator.py`, with a fixture suite.

⚑ **Why it was reported missing — a method warning worth more than the fact:** the search used
`grep "flat tier"` (space) against a file named `flat_tier` (underscore), and looked in
`.claude/hooks/pipeline-stage-gate.py` when the live file is at
`scripts/orchestrator/pipeline-stage-gate.py`. **Two independent wrong-shape errors in one check**,
each sufficient to produce a confident false "does not exist". Project rule
`a-greps-blind-spot-is-the-shape-of-the-grep`.

**But it was genuinely broken in two ways, both now fixed (`4ec6ed83`):**
1. **Shape-2-vs-3 confusion** — it used the naive "object-typed with no Tablet/Mobile siblings" signal
   that G5 above proves cannot separate them.
2. **⚠ Worse, and not anticipated: per-tier SIBLING attrs were self-promoting into "migrated" status.**
   `marginTablet`/`paddingMobile` are real attrs with no base `margin`/`padding`, and each has no
   sibling *of its own*, so the naive rule classified them as migrated on nearly every block —
   **259 false positives.** Fixed by excluding any candidate whose own name ends in a DB-derived
   breakpoint suffix (`modifier_suffixes('breakpoint')`, R-31-1).

**The discriminator it now uses — this is G5's answer, and Spec 39 should reuse it rather than
re-derive:** a property counts as migrated only when its value **demonstrably reaches** one of
`sgs_responsive_normalise_object()`, `sgs_emit_responsive_css()`, `sgs_typography_css_rule()` or
`sgs_resolve_on_tiers()`, scanned across the block's own `render.php` **and** the shared
`class-sgs-container-wrapper.php`, covering three indirection patterns (collected prop-map entries,
dynamic-key dispatch loops, intermediate-variable assignment). i.e. **PHP-consumer evidence, not
`attr_type` and not `box_family`** — both of which were confirmed identical for Shape 2 and Shape 3.

Net effect: 260 properties re-classified across 83 blocks, **0 additions** — the fix only narrows.

### G9 — ⭐ R6's missing POSITIVE CONTROL now EXISTS: 12 `xfail(strict=True)` tests

R6 correctly warns that *"when the gate stops firing, R1 is done"* is vacuously satisfiable. As of
2026-08-12 there is a concrete, non-vacuous acceptance signal that does not depend on any clone run
happening:

**12 converter tests are marked `@pytest.mark.xfail(strict=True)` citing D554.** They assert the
pre-migration flat shape for properties that are now tier objects. Because `strict=True`, they **FAIL
THE BUILD the moment the converter starts emitting tier objects** — they cannot silently pass.

- **They are R1's work-list, enumerated and executable**: `test_css_resolvers.py` (6),
  `test_outer_box_step12_properties.py` (3), `test_css_pass_partition.py` (1), `test_l4_area_wiring.py`
  (1), `test_state_value_lift.py` (1).
- **The R1 completion ritual:** flip each from `xfail` to a normal test asserting the OBJECT shape, in
  the same commit as the resolver change that makes it pass. A test that goes from xfail to xpass
  without being rewritten means the emission changed **without** anyone updating the contract — the
  strict marker turns that into a build failure rather than a silent green.
- ⛔ **Do not delete or unmark these to "clean up" before R1 lands.** They are the only thing currently
  making the flat/object divergence loud in CI.

### G10 — Two native-lift inputs changed under R1's feet (2026-08-11/12)

Both alter what the converter can natively consume, so R1's baseline is not what R1's table describes:

- **`supports.color` background/gradients REMOVED from `container`/`hero`/`cta-section`/`trust-bar`**
  (D581 — it was "live and silently winning a conflict with" the redesigned Background panel). So
  `root_supports`' `background-color → style.color.background` route no longer applies to those four
  blocks, and a `background-color` on them now gaps. ⛔ Do NOT restore the support to make a test pass.
- **`backgroundOverlayOpacity` RETIRED** (D581) and the converter's write of it removed 2026-08-12. The
  alpha now rides inside the `rgba()` colour. Any Spec 39 overlay work reads the colour's alpha, never a
  separate opacity attr.

### UNVERIFIED — carried from the 2026-08-11 groundwork (G1–G4), plus 2026-08-12 additions

⚠ Heading scope: the two bullets immediately below belong to the **2026-08-11** groundwork section
above; the 2026-08-12 council items are listed after them.

- **Whether `columns` and `gridTemplateRows` behave identically to `gridTemplateColumns` once
  migrated** (i.e. whether Spec 35 pass 3a's approach transfers directly) — not checked here; this is
  Spec 39 design work, out of scope for a groundwork note.
- **Total count of `.update()`-style shallow-merge sites elsewhere in the converter** beyond
  `css_pass.py`'s four — only the one file named in the task was checked; a full sweep wasn't run
  (would risk exactly the "cached count" trap R7.2 warns against).

**From the 2026-08-12 council (G5–G10):**

- **The 2-vs-3 discriminating signal (G5) — genuinely unsolved.** Both leads (`default_value` carrying
  a `"desktop"` key; whether the PHP consumer calls `sgs_responsive_normalise_object`) were identified
  but NEITHER was verified across the full corpus. This is R1's first design task, not a detail.
- **Whether the 6 `box_family_for`-only call sites (G6) need a different fix shape from the 9
  `validate()`-gated ones** — the split is confirmed; the consequence for R1's design is not worked out.
- **Whether any block other than `sgs/button` will grow a state suffix on an object-typed base (G8)** —
  true today (1 case, 0 `%TabletHover` rows anywhere), but nothing prevents a new one; no gate guards it.
- **What SHOULD paint a plain background colour on the 4 blocks that lost `supports.color.background`
  (G10)** — `BackgroundPanel` provides image/video/SVG but **no colour picker**, and those blocks declare
  no plain `backgroundColour` attr. D581 records the removal as fixing a conflict; it does not record
  what replaced it. Worth settling before Spec 39 designs colour routing for them. ⚠ Not a regression
  claim — an unanswered question.
