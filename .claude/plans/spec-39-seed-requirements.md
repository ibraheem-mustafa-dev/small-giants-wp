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
| `scripts/converter/services/fold_helpers.py` | `:262` — `bp_decls['Tablet'] -> attr + 'Tablet'`; also `:291`, `:326`, `:352` |
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
already-migrated property. **That gate's findings are the precise work-list for R1** — when it stops
firing, R1 is complete. Spec 39 should adopt it as its own acceptance signal rather than inventing one.

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
