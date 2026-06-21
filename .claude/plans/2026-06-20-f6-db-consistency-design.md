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

### Check #3 — variant discriminator collision (NEW) — REVISED post-council (2026-06-20)
**Rule (REVISED, fail-closed):** every `variant_slots.unique_slot` discriminator MUST have a
**content/media role** in `block_attributes.role`. Any other role (or NULL) → flagged as a
collision risk. (Original "matches a property_suffixes-derived lift attr" derivation was
**falsified by the council** — the live join returns ZERO rows because `gridTemplateColumns` is
lifted via the `_SUFFIX_ATTR_OVERRIDES` constant, not a plain `property_suffixes` row, and
`splitGap` is a block-specific name — so it would have MISSED the very collision it exists to
catch. Bean-chosen replacement: a fail-closed content/media-role allowlist.)

**Operational definition (DB-driven, R-22-1) — FINAL (Bean-locked 2026-06-20):**
- The hazard is specifically attrs the **universal CSS lift can spuriously populate** → those
  spuriously raise `detect_variant`'s score. So the UNSAFE (CSS-liftable) role set =
  `{layout, typography, color, colour-gradient, number-css-px, number-css-percent, visual, motion}`
  (final set locked in the build's report-mode run vs the live lift surface).
- A discriminator is SAFE iff `block_attributes.role` is present AND NOT in the CSS-liftable set
  (so enum/rating/media/content/identity/boolean discriminators pass — they're only populated when
  the content genuinely exists). FLAGGED iff role ∈ CSS-liftable set OR role IS NULL (fail-closed:
  an unclassified attr can't be *proven* non-liftable, so it flags + forces classification).

**UNIVERSAL (Rule 3 / R-22-9):** the check + its tests run across EVERY variant-bearing block
(`blocks.variant_attr` populated) — today `sgs/hero` + `sgs/testimonial`, plus any future block,
with zero per-block branching. Tests assert correct verdicts on both blocks' real discriminators.

**Current violations measured against the live DB (council Stage-5 enumeration):**
- `sgs/hero split` → `gridTemplateColumns` (role NULL) + `splitGap` (role `layout`) — REAL
  collision. **Empirically confirmed:** `detect_variant('sgs/hero', {backgroundImage, gridTemplateColumns,
  splitGap})` returns `'split'` (a standard hero with generic grid CSS mis-routes to split).
- `sgs/hero svg-animated` → `svgContent` (role NULL) — a FALSE collision (genuine SVG content,
  not lifted CSS); the fix is to give `svgContent` the `content` role, not to weaken the check.

**The fixes (universal, DB-driven; disposition = FIX ALL NOW, zero baseline — Bean 2026-06-20):**
1. Edit `src/blocks/hero/block.json` `supports.sgs.variants.split` → `["splitImage",
   "splitImageMobile"]` (drop the two structural slots). They remain valid hero attrs the lift can
   populate; they just stop *discriminating*. **Post-fix simulation confirmed:** the confound case
   → `'standard'` (fixed); a genuine split (splitImage only) → `'split'` (preserved).
2. Classify the role-`None` discriminators that REMAIN discriminators, via the canonical reseed
   path, so they pass legitimately (none are CSS-liftable — they're media/content):
   - hero: `svgContent` → `content`
   - testimonial: `avatarMedia`/`workMedia` → `scalar-media`; `orgLogo` → `image-object`;
     `summaryPhrase` → `content`; `sourcePlatform` → `identity`; `verified` → `boolean-visibility`
   (final role per attr confirmed against the block.json attr definition in the build.)
   `ratingScale` (`select-from-enum`), `ratingStars` (`rating`), `reviewDate` (`text-content`)
   already pass — no change.
3. **Role-source grounding is the build's first task:** confirm HOW `block_attributes.role` is
   populated (`/sgs-update` derivation step vs an override channel) so the assignments flow through
   the reproducible reseed path, NOT a manual DB edit (`db-changes-reproducible-via-migration`).
4. Re-seed `variant_slots` + roles via a dated migration + a full `/sgs-update`.

After the fixes, check #3 goes green across BOTH variant-bearing blocks with an EMPTY baseline.

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
   planted ambiguous `(block, property)` with no disambiguator; a planted CSS-liftable-role
   discriminator. Check #3 + its tests run UNIVERSALLY over every `variant_attr` block (hero +
   testimonial), asserting correct verdicts on both blocks' real discriminators (Rule 3).
3. The hero collision is FIXED + all role-gaps classified: `block.json` updated, dated migration +
   `/sgs-update` reseed, `variant_slots` for `sgs/hero split` no longer lists
   `gridTemplateColumns`/`splitGap`, and every remaining discriminator on hero+testimonial has a
   non-NULL non-CSS-liftable role; a clone of a split hero still detects `split` (live-verify on
   canary if a split fixture exists, else converter conformance test).
4. `check-composition-sync.py` deleted; prebuild/prestart entry replaced; Gate A + foundation tests
   (ledger/oracle/baseline) still green.
5. `convert.py` UNTOUCHED (D-MODULAR). DB change via dated migration, not manual.

## 8. Risks / open questions — COUNCIL VERDICTS (2026-06-20, /qc-council)

- **R1 — Check #1 definition fidelity.** Verdict: **MEASURE-FIRST.** Definition plausible but
  unverified against the live resolver inline. The build's FIRST step runs check #1 in report mode
  against the live DB (STOP-14 precondition), confirms it does not false-positive the documented
  dual-write case (`color`→`textColour`+`style.color.text`, different write-paths), and brings the
  enumeration back BEFORE arming. If it surfaces real ambiguities they are enumerated + baselined.
- **R2 — "Liftable structural attr" set.** Verdict: **FALSIFIED → REVISED.** The property_suffixes
  join returns ZERO rows on the live DB (misses gridTemplateColumns/splitGap). Replaced by the
  fail-closed content/media-role allowlist (see revised check #3).
- **R3 — Hero fix blast radius.** Verdict: **VALIDATED — no regression.** Measured: confound
  → `standard`, genuine split → `split`. splitImage is present only on a real split hero.
- **R4 — Reseed determinism.** Confirm in build: `/sgs-update` regenerates `variant_slots` purely
  from `block.json supports.sgs.variants` (set-difference). Migration must be reproducible.
- **R5 — G-B reason field.** Decision: `supports.sgs.hasInnerBlocksReason` string in block.json
  (single-source with the override, no separate baseline channel).

## 9. Council record (/qc-council, 2026-06-20 — empirical Stage-5 gate)

Cross-model Gemini rater tool-blocked on the Windows harness (STOP-13) → stood in with direct
empirical measurement (the decisive evidence for fix-shapes) + structured branch trace.

| Fix-shape | Verdict | Empirical evidence |
|-----------|---------|--------------------|
| #3 hero discriminator fix | **VALIDATED-SHIPPABLE** | `detect_variant` confound `split`→`standard` post-fix; genuine split preserved |
| #3 check derivation | **FALSIFIED→REVISED** | property_suffixes join = 0 rows; replaced with content/media-role allowlist |
| #1 ambiguity check | **MEASURE-FIRST** | run report-mode vs live DB as build step 1 before arming |
| #2 absorb+upgrade | **VALIDATED** | AND-rule sound; override path real; no current false-negatives/orphans |

Status: design council-cleared, **AWAITING BEAN APPROVAL** to build.
