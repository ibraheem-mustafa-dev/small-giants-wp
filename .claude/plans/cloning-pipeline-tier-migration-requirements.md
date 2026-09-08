---
doc_type: seed-requirements
title: "Cloning-pipeline tier-migration upgrade — captured requirements from the Spec 35 migration"
spec_ref: .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md — the upgrade lands there
date: 2026-08-10
status: INPUTS — evidence captured while it was fresh. Do NOT treat as a spec or as decisions.
---

# Cloning-pipeline tier-migration upgrade — captured requirements

**What this is.** Captured inputs for a planned **tier-migration upgrade to Spec 31**, the cloning
pipeline's one and only spec. The upgrade is a task, not a future document (D1008): Spec 31 is and
always was THE cloning-pipeline spec, and there is no separate spec number for this work. Bean
directed that the pipeline reworks implied by the Spec 35 flat→object migration be **captured as
prioritised points for that upgrade**, not built now.

**The governing ordering rule (Bean, 2026-08-10 — D552):** the **block standard leads, the cloning
pipeline is reworked afterwards** to the universalised norm. The converter's inability to emit the new
shape is **scheduled work, never a precondition**. Recorded here so a future session cannot re-invert it
and block a standard change on converter cost.

⛔ **This file is inputs, not decisions.** Every item below is evidence + a question for the upgrade
to answer. Nothing here is settled.

---

## R1 — Object-shape tier emission (the load-bearing item)

> ⚠ **LARGELY SHIPPED — measure before building.** The converter emits tier OBJECTS today: a live
> clone run produced `sgs/heading.fontSize = {"desktop":52,"mobile":34}`, and calling
> `typography.resolve()` directly returns the object shape, never the flat one (D996, 2026-09-07,
> which governs over D554's "stays flat" ruling). A converter test marker citing D554 does not
> describe the converter — check emitted output, never the marker.
>
> ⛔ **Do not re-derive or re-design R1 without first measuring what the converter actually
> emits.** The genuinely open scope in this document is **R8–R10 (motion cloning from raw CSS)**,
> which is real and unaddressed.
>
> The quarantined conformance goldens gated on this work are real; **count them in the file**
> (`scripts/tests/fixtures/conformance/quarantine.json`, `quarantined_golden_ids`) rather than
> quoting any figure from prose.

The converter must eventually emit `{desktop, tablet, mobile}` instead of flat suffixed siblings.

**What it does today:** the converter lifts per-device values in the **flat** shape; what it lacks
is an *object* emitter. Every site below builds `attr + 'Tablet'` / `attr + 'Mobile'`. ⚠ **Line
numbers below drift — grep the construction, do not trust the citation.**

| File | Evidence |
|---|---|
| `scripts/converter/services/fold_helpers.py` | `:416` — `dest = f"{attr_base}{tier_suffix}"`, inside the loop over `tier_values`. LIVE: `assembly.py` imports and calls `route_area_css_to_block_attrs` (assembly step 3d), and `tests/test_l4_area_wiring.py` asserts that path. This file is also R1's real grid-per-area work surface. |
| `scripts/converter/services/extraction.py` | `:652` — `target_attr = f"{base_attr}Mobile" if is_mobile else base_attr` |
| `scripts/converter/resolvers/grid.py` | `:19` — "unsuffixed, Tablet → `*Tablet`, Mobile → `*Mobile`" |
| `scripts/converter/resolvers/styling_content.py` | `:9-10`, `:84` |
| `scripts/converter/resolvers/typography.py` | `:101` — "Tier-suffixed primary destination" |
| `scripts/converter/resolvers/outer_box.py` | `:386`, and `maxWidth`/`maxWidthTablet`/`maxWidthMobile` handling |
| `scripts/converter/resolvers/content_band.py` | `:250` |
| `scripts/converter/services/border_side.py` | `:28-30` |
| `scripts/converter/services/css_pass.py` | `:149` |
| `scripts/converter/db/db_lookup.py` | the `css_tier` SQL sites (`AND (css_tier IS NULL OR css_tier = 'desktop')`) |

**Question for the upgrade:** does emission become object-only, or dual-shape during a transition window
keyed on whether the target block has migrated that property?

⚑ **Rule for reading this inventory:** *"unwired" or "deferred" in a comment is a dated claim, not a
fact.* Grep the callers before believing it — including when the comment is in the file you are about
to skip. Same class as the project's `unwired-is-not-dead-separate-by-mechanism-not-count` and
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
**The upgrade must not design around the wrong explanation** — the seeding extraction settles it.

**Question:** does the upgrade keep a **derived per-tier view** so existing DB-first consumers keep working,
or does every consumer migrate to reading the object? The derived view is cheaper and defers the
converter change; it is also a second representation of one truth, which this project generally
distrusts.

## R4 — Seeding is part of the pipeline contract, not an afterthought

`/sgs-update` populates the identity the converter reads. Whatever the Spec 35 migration's **P2**
decides about representation is an **input to the upgrade**, not a local fix.

**Measured 2026-08-10 (do not re-derive):** `/sgs-update --stage 1` seeds `attr_type` correctly for
object attrs. The stale-gallery case was simply nobody re-running it after a schema change, and a reseed
fixed it with no movement in the `inspector-scan` backlog.

## R5 — The BOX axis stays orthogonal to the TIER axis (D549)

`{top,right,bottom,left}` (BOX) and `{desktop,tablet,mobile}` (TIER) are **independent axes**. A
property can have one, both, or neither. The upgrade must not re-conflate them.

⛔ **A known landmine, still armed:** `ResponsiveBoxControl` uses `base` internally where the PHP
normaliser expects `desktop` — `sgs_responsive_normalise_object()` (`helpers-responsive.php:277-291`)
tests only `desktop`/`tablet`/`mobile`, so a `{base,tablet,mobile}` object emits **nothing**. Contract
§12 field 6 calls this "unarmed, not disarmed" because no live call site crosses the two. Any upgrade
work that makes a call site cross them arms it.

## R6 — The interim clone gate becomes the upgrade's entry condition

Per Bean's ruling C, during the migration a check FAILS a clone run that emits a flat tier for an
already-migrated property. **That gate's findings are the precise work-list for R1.**

**Where it lives** (found during council review): `sgs-clone-orchestrator.py` — `extract.json` is written
at `:2053`, and the R-31-15 anti-mirror gate already runs in that slot (`PIPELINE_STAGE_GATE_SCRIPT` at
`:70`, invoked ~`:2645-2670`, `--skip-stage-gate` at `:2404`). The new check belongs beside it, reading
the same artefact.

⛔ **"When the gate stops firing, R1 is done" is VACUOUSLY SATISFIABLE and must not be the acceptance
test as written.** If no clone run ever exercises a migrated property, the gate never fires, and zero
findings is indistinguishable from complete. Same shape as this project's
`empty-section-false-pixel-diff-win` rule. **The upgrade needs a POSITIVE CONTROL:** a fixture clone against
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

Recorded because the upgrade will be measured, and both traps produce confident wrong numbers:

1. **A stray `/*` inside a `//` comment corrupted two gates' corpora at once** — inventing 73 findings
   in one and *hiding* 35 real ones in another, in **opposite directions**. Fixed at `f11b122a`
   (`stripComments` now strips line comments first, with Test G proven able to fail). Any new scanner
   built for the upgrade that strips comments must order the rules the same way and ship the same control.
2. **A count from a cached column is not a measurement.** `rules.json`'s `openBacklog` has produced a
   wrong figure before (a "363" that was a column sum, not a scan). Live-scan, always.

---

## What the upgrade must NOT inherit

- **The 43 correct-as-is families** — 36 `asset_like` (a per-tier ASSET is a different resource per
  device; `sgs/media`'s tiers are a deliberate runtime swap, D521) and 7 `flag_like` (conjunctive
  per-device flags). These are not migration targets and must not become converter targets either.
- **Any cached count.** The block count, family count and stage counts in this project have each
  drifted. The upgrade states methods and file:line sources, never figures in prose.

---

## 2026-08-11 groundwork notes — recording the current setup, not deciding anything

**What this section is.** Spec 35 (the flat→object storage-shape migration) is still open. This
section records what the survey + the converter code actually show TODAY, so that whenever the upgrade
starts it can begin from a checked picture instead of re-deriving one. **Nothing below is a design
decision** — no call is made here on object-only vs dual-shape, on fixing the tier vocabulary, or on
whether a derived per-tier view should exist. Those remain the upgrade's calls.

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

This list is a **live-scan snapshot dated 2026-08-11** — re-run the survey command when the upgrade starts
rather than copying these names forward, per R7.2's rule about cached counts.

### G2 — The uniform choke point R1's table doesn't name

R1's table lists per-file evidence of flat-suffix construction, but every one of those sites funnels
through a single shared function. Verified by reading the file and counting callers:

- **`scripts/converter/services/tier_suffix.py:46`** — `return f"{base_attr}{tier}"` inside
  `tier_suffix()`. This is the ONE place the flat `{attr}{Tier}` string is built.
- **`scripts/converter/services/tier_suffix.py:65`** — `tier_state_suffix()` (which then appends an
  interaction-state suffix) calls `tier_suffix()` internally, so it also funnels through the same line.
- **Enumerate the call sites live, never from a cached list here (R7.2):**
  `grep -rn "tier_suffix(\|tier_state_suffix(" --include=*.py scripts/converter | grep -v "/tests/" | grep -v "def tier_suffix\|def tier_state_suffix" | grep -v "services/tier_suffix.py"`
  then discard import lines and docstring mentions. Files carrying real calls span
  `resolvers/grid.py`, `resolvers/content_band.py`, `resolvers/outer_box.py`,
  `resolvers/typography.py` (calls `tier_suffix()` directly rather than `tier_state_suffix()`),
  `services/border_side.py` and `services/box_side.py`.

**Why this matters for the upgrade, without deciding anything:** an object-shape rework that changes what
`tier_suffix()` (or its call inside `tier_state_suffix()`) returns touches every call site at once —
this is the leverage point R1's scattered per-resolver table doesn't surface. Whether the fix belongs
at that one function or has to unwind at each call site is an upgrade design question, not answered here.

### G3 — Two emission facts R1's table doesn't surface

⚠ Line numbers here drift with every refactor — grep the quoted code, don't trust the number.

1. **A second flat-suffix path, independent of `tier_suffix()` (G2).**
   `scripts/converter/services/root_supports.py:606` — `flat_probe = f"{camel_base}{bp_suffix}"` (the
   per-property native `style.*` lift); `:647` —
   `flat_probe = f"{shorthand}{side.capitalize()}{bp_suffix}"` (the padding/margin shorthand native
   lift). A rework that only changes `tier_suffix()` will miss both.

2. **The shallow-merge risk in `css_pass.py`.** The merge chain is
   `scripts/converter/services/css_pass.py:211` (`merged: dict = dict(native_attrs)`), then `:214`
   (`merged.update(result.attrs())`), `:230` (`merged.update(overlay_attrs)`), `:256`
   (`merged.update(preset_attrs)`). Each `.update()` replaces a whole dict key's value — so if two of
   these four sources each produced a tier OBJECT for the same attr name, the later `.update()` would
   overwrite the entire object (losing whichever tiers only the earlier source set), not merge tiers
   together. Same site R6a names.

### G4 — Box axis vs tier axis: carry the orthogonality rule forward

R5 already states this and documents the one armed-but-inert landmine. Restating only the operational
takeaway so the upgrade doesn't have to re-read R5 to get it: **BOX `{top,right,bottom,left}` and TIER
`{desktop,tablet,mobile}` are two independent axes that combine (a property can have neither, one, or
both) — never collapse them into one axis or key one off the other's vocabulary.** The two prior
storage-shape gate rule-attempts that got this wrong are the reason it's called out again here; no new
file:line evidence was gathered for this item beyond what R5 already cites.

## 2026-08-12 — QC-council findings that CONSTRAIN R1's design (three of these were paid for by being wrong first)

**Provenance.** A `/qc-council` (3 raters + structural pre-gates) ran against a proposed R1-shaped fix
on 2026-08-12 and **falsified it twice over**. The fix was NOT built (D554 ruling C forbids the shim);
what survives is the evidence below. Full record: `.claude/plans/archive/2026-08-12-converter-db-drift.md`,
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

⚑ **A property can have TWO reads in one file — finding a flat read does not establish there is no
tier read.** `sgs/container.gridItemPadding` is Shape 2, not Shape 3:
`class-sgs-container-wrapper.php:2279-2296` feeds it into `$obj_inner_props[]` (the tier-OBJECT
emission path), while the same file ALSO carries a flat `sgs_serialise_box_sides(...)` read of it
elsewhere. Classify by the full set of reads, never the first one found.

- Testing `attr_type == 'object'` conflates all three.
- Testing "does `{base}{Tier}` exist as its own row" separates 1 from {2,3} — **but NOT 2 from 3.**
- `box_family_for()` also conflates them.

**A rule that folds shape 3 is a REGRESSION on a currently-working path**, not a fix. The upgrade must
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

⚠ **The call sites are NOT uniform: a subset never calls `validate()` at all** — they gate solely on
`box_family_for()`. That subset is `resolvers/grid.py`'s padding / border-radius / longhand-radius box
forks, `resolvers/content_band.py`'s band-mirror path, and `services/border_side.py`.
(`resolvers/outer_box.py`'s two sites also gate on `box_family_for()` but still call `validate()`
afterwards, so they are not in this subset.) So "make `tier_suffix()` return the base name so
`validate()` passes" does not even apply there — and that is precisely the path that produces the
shape-3 regression in G5. Re-derive the split by reading each call site's function body; never by
subtracting on paper.

*(`services/state_value_lift.py` only MENTIONS `tier_state_suffix` in its docstring — it resolves via
`db_lookup.attr_for_state_property` instead. Do not count it as a call site.)*

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

### G9a — R6's gate EXISTS and is live

The D554 clone-output gate is `scripts/orchestrator/check_flat_tier_regression.py`, wired into BOTH
`scripts/orchestrator/pipeline-stage-gate.py` and `sgs-clone-orchestrator.py`, with a fixture suite.
⛔ **Confirm it by opening those paths** — a search for `"flat tier"` (space) will not find a file
named `flat_tier` (underscore), and a search under `.claude/hooks/` will not find a script that lives
under `scripts/orchestrator/`. Project rule `a-greps-blind-spot-is-the-shape-of-the-grep`.

Two signals the gate must NOT use, because neither separates G5's shapes:
1. "object-typed with no Tablet/Mobile siblings" — cannot separate Shape 2 from Shape 3.
2. A rule that doesn't exclude per-tier SIBLING attrs — `marginTablet`/`paddingMobile` are real attrs
   with no base `margin`/`padding` and no sibling of their own, so a naive rule self-promotes them to
   "migrated" on nearly every block. Exclude any candidate whose own name ends in a DB-derived
   breakpoint suffix (`modifier_suffixes('breakpoint')`, R-31-1).

**The discriminator the gate uses — this is G5's answer, and the upgrade should reuse it rather than
re-derive:** a property counts as migrated only when its value **demonstrably reaches** one of
`sgs_responsive_normalise_object()`, `sgs_emit_responsive_css()`, `sgs_typography_css_rule()` or
`sgs_resolve_on_tiers()`, scanned across the block's own `render.php` **and** the shared
`class-sgs-container-wrapper.php`, covering three indirection patterns (collected prop-map entries,
dynamic-key dispatch loops, intermediate-variable assignment). i.e. **PHP-consumer evidence, not
`attr_type` and not `box_family`** — both of which were confirmed identical for Shape 2 and Shape 3.

### G9 — ⭐ R6's POSITIVE CONTROL: the D554 `xfail(strict=True)` tests

R6 correctly warns that *"when the gate stops firing, R1 is done"* is vacuously satisfiable. The
strict-xfail converter tests are a concrete, non-vacuous acceptance signal that does not depend on any
clone run happening.

**Enumerate them live — do not read a count from this file:**
`grep -rn "D554 ruling C" --include=*.py plugins/sgs-blocks/scripts/converter/tests`. They assert the
pre-migration flat shape for properties that are now tier objects; because `strict=True` they **FAIL
THE BUILD the moment the converter emits tier objects for those properties** — they cannot silently
pass. They live in `test_css_resolvers.py`, `test_outer_box_step12_properties.py` and
`test_css_pass_partition.py`.

- **They are R1's work-list, enumerated and executable.**
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
  alpha now rides inside the `rgba()` colour. Any overlay work in the upgrade reads the colour's alpha, never a
  separate opacity attr.

### UNVERIFIED — carried from the 2026-08-11 groundwork (G1–G4), plus 2026-08-12 additions

**From the 2026-08-11 groundwork (G1–G4):**

- **Whether `columns` and `gridTemplateRows` behave identically to `gridTemplateColumns` once
  migrated** (i.e. whether Spec 35 pass 3a's approach transfers directly) — not checked here; this is
  upgrade design work, out of scope for a groundwork note.
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
  what replaced it. Worth settling before the upgrade designs colour routing for them. ⚠ Not a regression
  claim — an unanswered question.

---

# 2026-09-07 — Bean's quality bar for the rework, and what the seed is missing against it

**Status of this section: INPUTS, like the rest of the file.** Nothing here is settled. But the
measurements are live, re-runnable, and were taken this session.

## Bean's bar, recorded verbatim so it cannot be softened

The pipeline should match **modern AI-design standards and Awwwards-level output** — motion
effects and the other high-craft touches that were never in it before — and it should use **at
least the full potential of the theme's existing functionality**, which today it does not.
Concretely: clone **motion/animation**, not just colour and typography; and lean on the block
standards and the upgraded DB to produce a **cleaner, better routing setup**.

## Verdict: R1-R7 do not reach that bar, and cannot be stretched to

R1-R7 are entirely about **attribute SHAPE** — flat tier siblings becoming `{desktop, tablet,
mobile}` objects, and the DB identity that follows. That is a correctness and uniformity
programme. It is worth doing, and it is orthogonal to whether the output is any good.

R1–R7 say nothing about motion at all. A pipeline built to those items alone would clone a faithful,
well-shaped, completely static page. R8–R10 below are the part of this seed that addresses Bean's bar.

## R8 — Motion cloning EXISTS, but only for SGS-authored drafts

⚑ **Measure the converter's motion coverage with a grep you have verified returns non-empty on a
known hit.** A malformed `git grep -licE` (combining the mutually exclusive `-l` and `-c`) returns
nothing and looks exactly like a clean result — enough to conclude "no motion support anywhere" and
re-implement what already exists.

**What exists.** FR-38-22 (D949/D951/D952, 2026-09-04) built an fx-attribute lift:
`converter/services/assembly.py` step 3a1 calls `db_lookup.lift_behavioural_attrs()`, which lifts
a draft's explicit `data-sgs-fx-*` markers into the emitted block's attributes. It carries a
roster of ~78 fx attrs, coerces booleans/numbers to real JSON types (D952), and handles
irregularly-named attrs via a reverse lookup rather than a kebab-to-camel guess.
`tests/test_fx_attribute_lift.py` guards it through the REAL entry point
(`converter.entry.convert_section`) precisely because a unit test once passed while the walker
silently dropped every fx attribute (D951).

**The REAL gap, stated narrowly.** The lift is keyed on the draft ALREADY CARRYING SGS fx
data-attributes — i.e. a draft authored for SGS. The converter does not infer motion from CSS:

| Measured 2026-09-07 (re-run these; the DB moves) | Figure |
|---|---|
| `attr_name LIKE 'fx%'` | **2,880** attrs across **32** blocks; **832** carry a `css_property` |
| Broader motion set (fx + animation + transition + parallax + scroll) | **3,033** across **44** blocks; **925** carry a `css_property` |
| `keyframes` references anywhere in `scripts/converter/` | **0** |
| Raw-CSS motion inference (draft `animation:`/`transition:` → an fx attr) | **none** — `converter/resolvers/preset_absence.py:72` reads `transform` ONLY as a preset-absence signal, never to route motion |

```
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql   "SELECT COUNT(*), COUNT(DISTINCT block_slug) FROM block_attributes WHERE attr_name LIKE 'fx%'"
git grep -c keyframes -- plugins/sgs-blocks/scripts/converter/
```

**So the question for the upgrade is not "build motion cloning" — it is "extend it beyond
SGS-authored drafts".** Cloning an arbitrary reference site to an Awwwards standard means reading
`@keyframes`, `animation` and `transition` shorthand out of real CSS and RECOGNISING intent (a
reveal, a parallax, a stagger) well enough to map onto the framework's named fx presets. That
recognition layer does not exist in any form today, and it is a genuinely harder problem than the
attribute-shape work in R1–R7.

**Questions for the upgrade:**
1. Does motion extraction map raw CSS to the existing ~78-attr fx roster, or does it need a new
   intermediate vocabulary? The roster is the emit target either way.
2. Spec 38's four-tier doctrine (V vanilla / G GSAP / H helper / W WebGL) governs motion. Which
   tiers may a CLONE emit? A cloned page that silently pulls the GSAP or WebGL bundle changes the
   page's performance budget without anyone choosing it.
3. `prefers-reduced-motion` must be a property of the emitter, not a per-block afterthought — a
   cloned page has to honour it by construction.

## R9 — "Full potential of the theme" is measurable, and motion is only the first axis

Before the upgrade is designed, run the same converter-coverage measurement for **every** capability
family the framework declares, not just motion. The R8 method generalises: count the attributes a
family declares, then count the converter's writes to them. Any family with a high declaration
count and zero converter writes is capability the pipeline is leaving on the floor. Motion is the
one that has been measured; it is unlikely to be the only one.

⛔ **Do not let this become a percentage.** Goal B's history is explicit that an aggregate score
was measuring a deleted instrument, and R-31-4 forbids an aggregate as a closing gate. This is a
per-family coverage inventory, not a number to engineer upward.

## R10 — The routing precondition R8 inherits

R8 depends on DB routing being trustworthy, and it is not yet fully so. Rule 31's own resolver
reports **389 of 1,286 colour attributes UNRESOLVED** (~30%) when mapping attribute to paint
mechanism. That same resolution layer is what motion routing would rely on. The unresolved split
is currently unmeasured and unowned; it is a precondition for R8, not a parallel nicety.
