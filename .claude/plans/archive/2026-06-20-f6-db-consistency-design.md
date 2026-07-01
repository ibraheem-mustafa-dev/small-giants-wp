---
doc_type: design
project: small-giants-wp
thread: cloning-pipeline
phase: F6
generated: 2026-06-20
revised: 2026-06-20 (v2 — post-adversarial-council + fact-check)
status: SHIPPED 2026-06-20 (D237) — commits fdcf70ab (hero fix) + 1293c24f (module); 27 tests, 0 live violations, wired prebuild+prestart, old guard retired
spec: 31-UNIVERSAL-CLONING-PIPELINE §12.4 + §12.7 F6
supersedes: v1 (role-based check #3, NO-GO'd by adversarial council)
---

# F6 — DB-as-code consistency suite (design v2)

## 0. What changed from v1 (and why)

v1 was taken through `/qc-council` (empirical) then `/adversarial-council` (holistic). The
adversarial council + a direct ground-truth fact-check **NO-GO'd v1's two new checks** and
overturned two of the council's own proposed extra-checks. The verified corrections:

- **Check #3 was role-based — WRONG axis.** The collision hazard is "can the universal CSS lift
  spuriously populate this attr?" That is a **lift-surface** question (`property_suffixes` +
  `_ATTR_NAME_OVERRIDES`), NOT a `block_attributes.role` question. Verified: `scalar-media` is
  classified `styling-behaviour` in `roles.classification`, yet `splitImage` (scalar-media) is
  NOT lift-producible — so role mis-classifies it. Re-grounding on the lift surface is correct AND
  **collapses scope**: no role assignments, no `ATTR_CLASSIFICATION_OVERRIDES` work, no orphan-role
  blocker, no roles migration. The ONLY fix needed is the hero block.json discriminator drop.
- **Check #1's `block_selectors.element` disambiguator — WRONG mechanism.** Verified: the resolver
  has ZERO non-comment references to `block_selectors`; it routes on `property_suffixes` rowid
  order. So presence/absence of a `block_selectors` row has no effect on routing. Drop it; reframe
  check #1 as the real forward-looking determinism invariant (below).
- **Hero collision severity corrected.** Verified: the realistic confound `{backgroundImage,
  gridTemplateColumns}` → `None` → defaults to `"standard"` (benign). The REAL bug is a **bare
  hero** (no bg/video/svg) + incidental grid CSS → `{gridTemplateColumns}` → `'split'`. Genuine
  mis-route, narrower than v1 claimed. Fix still worthwhile.
- **Two council "extra checks" were FALSE and are NOT added:** `composition_role='leaf' +
  has_inner_blocks=1` is a *documented, code-handled* state (the IN-F mechanism, D223 — verified at
  convert.py:5084-5108), not a contradiction. `query-descriptor` is in the `roles` table (not an
  orphan). Adding the leaf check would false-positive notice-banner and break the build.

## 1. The three checks (verified, implementable)

### Check #1 — routing determinism (re-grounded; `block_selectors` mechanism DROPPED)
**Rule:** for every `sgs/*` block, no css_property may have ≥2 of the block's own declared attrs
derivable from it in the **same writer_path**, because the resolver (`attr_for_property`,
db_lookup.py:1290) returns the FIRST matching attr by `property_suffixes` rowid order — a silent
arbitrary pick if two compete.
- **Writer_path** = the resolver's own two values: `"typography" | "wrapper_css"` (db_lookup.py:1294).
  `style.*` root-supports is a different destination, never in contest (db_lookup.py:1249-1252) →
  excluded.
- **Implementation (reuse, R-22-1):** for each block, for each css_property in `property_suffixes`,
  enumerate every (suffix→attr) the block declares (via `_ATTR_NAME_OVERRIDES` or suffix-lowercase,
  exactly db_lookup.py:1352-1358) and group by writer_path; flag any (block, css_property,
  writer_path) with ≥2 declared attrs.
- **MEASURE-FIRST (STOP-14):** run report-mode vs live DB first. Verified-likely empty today
  (forward-looking guard). If it surfaces real cases, enumerate + baseline; do NOT false-arm.
- **Universal:** iterate ALL `slug LIKE 'sgs/%'` blocks from `blocks`; a block with no competing
  attrs trivially passes. (Closes the universality red-team's MF-4.)

### Check #2 — has_inner_blocks ↔ save.js (ABSORB + UPGRADE; A-grade, kept)
Port `check-composition-sync.py`'s AND-rule (save-marker AND render-consumes) + `block.json
hasInnerBlocks` override verbatim, then add:
- **G-A (fail-CLOSED on orphans):** a `sgs/*` block in `src/blocks/` absent from `block_composition`
  is a violation (today: 0). Replaces the old `continue`-on-missing fail-open.
- **G-B (override can't mask a stale marker):** when a `block.json hasInnerBlocks` override
  contradicts the AND-rule derivation, hard-fail unless block.json carries
  `supports.sgs.hasInnerBlocksReason`. block.json read from `src/blocks/<slug>/block.json`; absent
  file = fail-CLOSED (spec-lawyer M4).
- **PARITY GATE before deletion (maintenance Landmine 3):** run old + new check #2 side-by-side on
  the current DB, assert identical verdict on every block, THEN delete `check-composition-sync.py`.
- **NOT added:** the `composition_role='leaf' + has_inner_blocks=1` check (verified FALSE — IN-F).

### Check #3 — variant discriminator collision (RE-GROUNDED on the lift surface)
**Rule:** no `variant_slots.unique_slot` discriminator may be **lift-producible** for its block — i.e.
no css_property resolves (via `attr_for_property`) to that discriminator's attr name. A lift-producible
discriminator gets spuriously populated by generic draft CSS → mis-scores `detect_variant`.
- **Implementation (reuse, R-22-1):** compute each block's lift-producible attr set by running the
  REAL resolver `attr_for_property(block, css_property)` over every css_property in
  `property_suffixes` ∪ `_ATTR_NAME_OVERRIDES` keys; a discriminator in that set is FLAGGED. NO role
  dependency. (Verified: catches `gridTemplateColumns` via its `_ATTR_NAME_OVERRIDES` entry;
  correctly passes `splitImage`/`splitGap` — not lift-producible.)
- **Universal:** iterate every `blocks.variant_attr`-populated block (hero + testimonial today; any
  future block auto-included) — zero per-block code.
- **Current violation (verified):** `sgs/hero split` → `gridTemplateColumns`. Verified live:
  bare hero `{gridTemplateColumns}` → `detect_variant` = `'split'` (mis-route). `splitGap` is NOT
  lift-producible (verified — only a comment) so it was never a problem.

## 2. The fix (verified-minimal)

ONE change: `src/blocks/hero/block.json` `supports.sgs.variants.split` →
`["splitImage", "splitImageMobile"]` (drop `gridTemplateColumns` + `splitGap`). They remain valid
hero attrs the lift can populate; they stop *discriminating*. Reseed `variant_slots` via a dated
migration-trigger + full `/sgs-update` (set-difference reseed; reproducible, not manual).
**Verified post-fix (simulated):** confound → `'standard'`/safe; genuine split (splitImage) →
`'split'` (preserved). No role assignments. No `excluded_properties`/roles migration.

## 3. Arming / baseline (STOP-14)

`db-consistency-baseline.json`, stable keys per check (`amb:{block}:{prop}:{path}` /
`ihb:{block}` / `vc:{block}:{slot}`). `--report` (exit 0) / `--check` (exit 1 on NEW key) /
`--update-baseline`. After the hero fix, check #3 baseline is EMPTY. Check #1 baseline =
report-mode result (likely empty). Check #2 baseline empty (current DB in sync).

## 4. Wiring (STOP-6)

`prebuild` AND `prestart`: replace the `check-composition-sync.py` entry with
`python scripts/db-consistency/run.py --check`. DB-only static check, no clone run_dir → prebuild
is correct. Plain-English failures naming block + problem + the EXACT fix command (maintenance MF
LANDMINE 4 — e.g. for check #3: name the block.json `supports.sgs.variants` edit + reseed command).

## 5. Module shape

```
scripts/db-consistency/
  __init__.py
  models.py            # Violation dataclass + stable-key helpers
  resolver_bridge.py   # imports db_lookup.attr_for_property; computes per-block lift-producible set (R-22-1 reuse)
  check_routing.py     # check #1
  check_composition.py # check #2 (ported AND-rule + G-A + G-B)
  check_variants.py    # check #3 (lift-surface)
  run.py               # shared runner: --report/--check/--update-baseline; plain-English report
  db-consistency-baseline.json
  tests/               # per-check unit + planted-violation tests, universal over both variant blocks
```

## 6. Acceptance (measurable)

1. Suite runs in prebuild + prestart; exits 0 on the post-hero-fix DB.
2. Each check REJECTS a planted violation: planted stale `has_inner_blocks`; planted same-writer_path
   ≥2-attr ambiguity; planted lift-producible discriminator. Check #3 tests run UNIVERSALLY over
   hero + testimonial, asserting correct verdicts on both blocks' real discriminators.
3. Hero fix applied via block.json + dated reseed; `variant_slots` for `sgs/hero split` no longer
   lists `gridTemplateColumns`; bare-hero `{gridTemplateColumns}` no longer detects `split`
   (verified via `detect_variant`).
4. check #2 parity test passes, THEN `check-composition-sync.py` deleted + prebuild/prestart entry
   replaced. Gate A + foundation tests (ledger/oracle/baseline, 358) stay green.
5. `convert.py` UNTOUCHED (D-MODULAR). Reseed via dated path, not manual.

## 7. Follow-up checks — SHIPPED 2026-06-20 (Bean: "do all the F6 follow-up checks") — commit `502f849e`
All 4 audit-surfaced follow-ups built as checks #4–#7 in the same module (each a genuine invariant
holding on the live DB today + a planted-violation reject test; suite now 7 checks, 51 tests, 0
violations):
- **#4 override drift** — `_SUFFIX_ATTR_OVERRIDES` (convert.py, AST-extracted, no import) ==
  `_ATTR_NAME_OVERRIDES` (db_lookup.py).
- **#5 variant_slots ↔ block.json determinism** (keystone) — recompute set-difference from block.json,
  assert == DB `variant_slots`; catches a stale reseed. Universal.
- **#6 orphan-role integrity** — every `block_attributes.role` ∈ `roles`. Fixed the one orphan
  (`rating` → content-bearing) via dated migration `2026-06-21-register-rating-role.py` (commit `b533690e`).
- **#7 tier ↔ composition_role** — `tier='class-section'` ⇒ `composition_role ∈ {section-root,
  content-block}` AND `container_kind NOT NULL`. **Safe form** (allows `content-block` — trust-bar
  NOT false-flagged; the "unproven invariant" concern resolved by grounding: all 3 class-section
  blocks pass today).

## 8. Council/fact-check provenance
v1 → `/qc-council` (empirical, validated hero fix on a since-corrected synthetic input) →
`/adversarial-council` (5 personas: spec-lawyer B−, system-fit C+, db-util C+, universality D,
maintenance C+ → NO-GO) → direct ground-truth fact-check (this v2). Every v2 element verified
against db_lookup.py / convert.py / the live DB. Council agent IDs + full register in the session
transcript.
