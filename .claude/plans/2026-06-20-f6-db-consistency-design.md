---
doc_type: design
project: small-giants-wp
thread: cloning-pipeline
phase: F6
generated: 2026-06-20
status: AWAITING-COUNCIL-THEN-BEAN-APPROVAL
spec: 31-UNIVERSAL-CONTAINER-CSS-TRANSFER §12.4 + §12.7 F6
---

# F6 — DB-as-code consistency suite (design)

## 0. One-paragraph summary

A fresh `plugins/sgs-blocks/scripts/db-consistency/` module (sibling of `ledger/` F2 and
`oracle/` F3) that proves the routing DATA is safe for name-free routing. Three checks, one
shared runner, one baseline file, plain-English failures (MF-5), wired into `prebuild` (and
`prestart`). It **absorbs and upgrades** the existing `check-composition-sync.py` (check #2) —
which is then retired — and adds two genuinely new checks (#1 routing ambiguity, #3 variant
collision). Per Bean (2026-06-20) the one real current violation it surfaces — the `sgs/hero`
`split` variant discriminated by liftable structural attrs — is **fixed now**, not baselined.

## 1. Why F6 exists (the failure class it makes structural)

Name-free routing (the whole converter architecture, FR-22-3) is only safe if the routing DATA
is internally consistent. Three silent-inconsistency classes mis-route a clone:

1. **Routing ambiguity** — a `(block, layer, property)` that resolves to ≥2 competing flat attrs
   with no disambiguator → the resolver picks arbitrarily.
2. **Stale `has_inner_blocks`** — the D212/D221 testimonial-empty bug: a cached flag disagreeing
   with the block's real save.js/render → empty cloned slides.
3. **Variant discriminator collision** — a `variant_slots` discriminator that is also a liftable
   structural attr → the CSS lift writes the very attr that decides the variant → mis-detection.

F6 turns all three into **build-time failures** instead of live-clone surprises.

## 2. Ground truth established (reading gate, 2026-06-20)

- DB schema confirmed live: `block_composition(has_inner_blocks, container_kind, …)`,
  `block_selectors(block_slug, element, selector)` (the disambiguator), `variant_slots(block_slug,
  variant_value, unique_slot)`, `blocks.variant_attr`.
- `block_selectors` = 72 rows; `variant_slots` = 17 rows.
- The converter **does** read `has_inner_blocks` live (`db_lookup.py:566`) — so the column is
  consumed, the guard is real. §12.3's "derive at convert-time, don't cache" fix is NOT yet
  implemented — F6 is the interim consistency net.
- Resolver model: `db_lookup._resolve_one` (line 1187) — most css_props map to exactly one
  `property_suffixes` row; ambiguous typography/colour props pick a canonical suffix; `color` on
  `sgs/heading` writes BOTH `textColour` AND `style.color.text` (legitimate **dual-destination**,
  different write-paths — NOT an ambiguity).
- `detect_variant` (`db_lookup.py:1892`) scores each variant by how many of its discriminating
  slots were **populated/lifted this run**, highest wins, tie→None.
- Hero `split` discriminators (`block.json supports.sgs.variants.split`) =
  `[splitImage, splitImageMobile, gridTemplateColumns, splitGap]`. The last two are liftable
  structural CSS → the collision. Testimonial discriminators are all content (no collision).
- `check-composition-sync.py` already exists, wired into prebuild+prestart; AND-rule derivation
  (save-marker AND render-consumes) + a `block.json supports.sgs.hasInnerBlocks` override; no
  current false-negatives, no coverage gaps **today**.

## 3. The three checks (exact semantics + queries)

### Check #1 — routing ambiguity (NEW)
**Rule:** for each `sgs/*` block, no css_property may resolve to ≥2 **competing flat attrs in the
same write-path** without a `block_selectors.element` disambiguator.

**Operational definition (to be locked with the council):**
- Enumerate, per block, each css_property's candidate flat-attr destinations using the SAME
  resolution data `db_lookup` uses (`property_suffixes` rows joined to the block's
  `block_attributes`).
- A property is **ambiguous** when ≥2 candidate flat attrs share the same write-path (both
  wrapper-css, or both typography) for that block.
- **Excluded (not ambiguity):** dual-destination across DIFFERENT write-paths (typography flat
  attr + `style.*` root-supports — the documented `color`→`textColour`+`style.color.text` case);
  the canonical-suffix-selected typography/colour props (`_TYPO_CSS_SUFFIX_SELECTION`), which are
  already deterministically disambiguated in code.
- **Pass condition:** an ambiguous property is OK iff the block has a `block_selectors.element`
  row that pins which element/selector the property targets (the disambiguator).
- **Fail:** ambiguous property + no disambiguator row.

> The council MUST pressure-test this definition against the live resolver so the check matches
> how routing actually decides, not a guessed model (R-22-7: council shapes are hypotheses).

### Check #2 — `has_inner_blocks` ↔ save.js (ABSORBED + UPGRADED)
Port the existing AND-rule derivation + block.json override verbatim, then add:
- **G-A (fail-CLOSED on orphans):** a block present in `src/blocks/` but absent from
  `block_composition` is a violation (today: none — clean baseline). The old `continue`-on-missing
  is a fail-open the spec forbids (§12.3 fail-CLOSED on every DB path).
- **G-B (override can't mask a stale marker):** when a `block.json hasInnerBlocks` override
  **contradicts** the AND-rule derivation, **hard-fail** unless the block.json carries a documented
  reason (e.g. `supports.sgs.hasInnerBlocksReason`). (Bean 2026-06-20: hard-fail + justification.)
- **G-C:** participates in the shared F6 baseline (its own baseline is empty today).
- **G-D:** lives in the F6 module with shared runner + report; `check-composition-sync.py` retired,
  its prebuild/prestart entry replaced by the F6 module.

### Check #3 — variant discriminator collision (NEW)
**Rule:** no `variant_slots.unique_slot` discriminator may be a **liftable structural attr** (an
attr the converter populates from draft CSS via the `property_suffixes`-derived lift).

**Operational definition:**
- "Liftable structural attr" = a `unique_slot` whose name corresponds to a css-lift target
  (grid/gap/layout structural properties the lift writes). Media/content slots (`splitImage`,
  `backgroundVideo`, `avatarMedia`, …) are NOT liftable → safe.
- **Current violation (to FIX, per Bean):** `sgs/hero split` → `gridTemplateColumns`, `splitGap`.

**The fix (universal, DB-driven):** edit `src/blocks/hero/block.json`
`supports.sgs.variants.split` to drop the liftable structural slots, leaving the content signal:
`split: ["splitImage", "splitImageMobile"]`. `gridTemplateColumns`/`splitGap` remain valid hero
attrs the lift can populate — they simply stop *discriminating* the variant. Re-seed `variant_slots`
via a dated migration + a full `/sgs-update` (the reproducible path — never a manual DB edit;
`db-changes-reproducible-via-migration`). After reseed, `split` is discriminated by `splitImage`
(present only on a genuine split hero), robust against generic grid CSS. Check #3 then goes green
with an EMPTY baseline.

## 4. Arming / baseline model (STOP-14)

- One `db-consistency-baseline.json` with stable keys per check (mirrors check_no_mirror's pattern):
  `#1 → "amb:{block}:{property}"`, `#2 → "ihb:{block}"`, `#3 → "vc:{block}:{slot}"`.
- `--report` (default, exit 0), `--check`/`--enforce` (exit 1 on any NEW key not in baseline),
  `--update-baseline` (the only sanctioned way to change it).
- **Per Bean:** check #3's hero violation is FIXED, so its baseline is EMPTY. Check #1's current
  violations (if any) are enumerated; if real-and-deferrable they are baselined with a documented
  reason, if spurious the definition is tightened — council decides per finding.
- Run the suite against the CURRENT DB FIRST to establish the precondition before arming.

## 5. Wiring (STOP-6 — wired to something that runs)

- `prebuild` AND `prestart` in `package.json`: replace the `check-composition-sync.py` entry with
  `python scripts/db-consistency/run.py --check`.
- This is a DB-only static check (no clone run_dir needed) → prebuild is the correct home (unlike
  check_no_mirror, which needs a clone run and lives in pipeline-stage-gate.py).
- Plain-English failure messages naming the block, the inconsistency, and the fix command (MF-5).

## 6. Module shape

```
scripts/db-consistency/
  __init__.py
  models.py            # CheckResult / Violation dataclasses, stable-key helpers
  check_routing.py     # check #1
  check_composition.py # check #2 (ported + G-A/G-B upgrades)
  check_variants.py    # check #3
  run.py               # shared runner: --report / --check / --update-baseline; plain-English report
  db-consistency-baseline.json
  tests/               # per-check unit tests + planted-violation tests (the acceptance gate)
```

## 7. Acceptance (measurable — NOT "suite written")

1. Suite runs in `prebuild` + `prestart`, exits 0 on the current (post-hero-fix) DB.
2. Each check proven to **reject a planted violation**: a planted stale `has_inner_blocks`; a
   planted ambiguous `(block, property)` with no disambiguator; a planted liftable discriminator.
3. The hero collision is FIXED: `block.json` updated, dated migration + `/sgs-update` reseed,
   `variant_slots` for `sgs/hero split` no longer lists `gridTemplateColumns`/`splitGap`;
   a clone of a split hero still detects `split` (live-verify on canary if a split fixture exists,
   else converter conformance test).
4. `check-composition-sync.py` deleted; prebuild/prestart entry replaced; Gate A + foundation tests
   (ledger/oracle/baseline) still green.
5. `convert.py` UNTOUCHED (D-MODULAR). DB change via dated migration, not manual.

## 8. Risks / open questions for the council (Rule 7 red-team)

- **R1 — Check #1 definition fidelity.** Does "competing flat attrs in same write-path" match the
  live resolver's actual ambiguity surface? Could it false-positive the dual-write case or
  false-negative a real ambiguity the resolver silently resolves by row-order?
- **R2 — "Liftable structural attr" set.** How is the liftable-set derived without a hardcoded list
  (R-22-1)? Candidate: `property_suffixes` rows whose derived attr name matches a `unique_slot`.
  Council must confirm this captures grid/gap and excludes media/content correctly.
- **R3 — Hero fix blast radius.** Does dropping the two discriminators regress detection of any
  genuine split hero, or any live homepage hero? (detect_variant on splitImage alone.)
- **R4 — Reseed determinism.** Confirm `/sgs-update` regenerates `variant_slots` purely from
  `block.json supports.sgs.variants` (set-difference) so the migration is reproducible.
- **R5 — G-B reason field.** Is `supports.sgs.hasInnerBlocksReason` the right justification channel,
  or should it be a baseline-with-reason entry instead?
