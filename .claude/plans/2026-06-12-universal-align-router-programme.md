---
doc_type: phase-plan
project: small-giants-wp
thread: cloning-pipeline
title: "Universalisation programme — has_inner_blocks auto-derive (B), trust-bar gap (C), name-free align layer-router (A)"
created: 2026-06-12
status: COMPLETE (2026-06-13). All three workstreams + both follow-ups + IN-F SHIPPED to main. Successor: de-literalisation programme (.claude/plans/2026-06-13-converter-de-literalisation-audit.md). Original council gate (2026-06-12 NO-GO on the rename shape; GO on the layer-router) preserved below as the decision record.
gate: "/adversarial-council 6-persona panel, 2026-06-12. Convergent NO-GO on the original 'rename + wrapper-default-flip + retire-all-overrides' design. Restaged below."
supersedes: the inline 'rename alignItems→verticalAlign' proposal (now demoted to an interim that A-layer-router replaces).
---

# Universalisation programme (A/B/C) — council-gated build plan

Bean directive (2026-06-12): make three cloning fixes PROPERLY universal + long-term, zero regression to live client sites or the 10 verified P5 rows. P5 already shipped (origin/main `9275328c` + `535c3bd9`). This programme is the follow-on.

## Adversarial-council verdict (2026-06-12) — the must-fix register

**Convergent headline:** the original design (rename alignItems→verticalAlign across 8 blocks + flip the shared wrapper default grid→stretch + retire ALL has_inner_blocks overrides + substring-match 'InnerBlocks.Content') is **NO-GO** — it would silently break live client pages three ways, one of which re-creates the D212 testimonial-empty bug.

Grades: Cynic C+ · Spec-Lawyer C+ · Ship-PM C+ (A− if staged) · Regression-red-team **D (NO-GO)** · Universality-purist B− · Support-realist C.

### MUST-FIX register (ranked by convergence)

1. **[5/6 personas] B's heuristic is falsified — re-creates D212.** `'InnerBlocks.Content' in save` mis-derives: option-picker (string in a *comment* → false-pos → broken pills), trust-bar (typed leaf, inline save marker → false-pos → orphan bug), testimonial (agrees with the *stale* value → D212 returns), team-member (save in index.js not save.js → misses the target block). **FIX:** derive `has_inner_blocks=1` iff BOTH (a) save (save.js OR index.js) returns `<InnerBlocks.Content/>` AND (b) render.php consumes `$content`/`$block->inner_blocks` non-trivially (exclude `@var`/comment-only). Scope to `sgs/*` ONLY (never touch core/*). Keep a small `HAS_INNER_BLOCKS_OVERRIDES` (~3 rows) for genuine serialisation≠routing cases, each with a `# why` + D-number. NOT "retire all overrides".
2. **[5/6] Wrapper-default flip (grid→stretch) = silent server-side regression on live pages.** No re-save needed; deprecated.js can't protect it. trust-bar defaults `layout:grid` → every live trust-bar's badges stretch; multi-button (default `center`) flips too. **FIX:** do NOT fork the PHP scalar default at `class-sgs-container-wrapper.php:200`. Keep wrapper default `start`; express grid-stretch via a CSS rule (`[data-layout=grid]{align-items:stretch}`) AND/OR per-block block.json default + a migrate() that PINS existing instances to their old effective value. Existing pages must not move.
3. **[3/6] No render-side dual-key fallback → broken deploy window.** deprecated.js is editor-only; the server reads the new default immediately. **FIX:** render reads `verticalAlign ?? alignItems ?? default` during transition (render-side back-compat, distinct from deprecated.js).
4. **[3/6] A mis-scoped: 6 of 8 blocks are dead-attr** (only feature-grid + multi-button render alignItems). Informs scope; SUPERSEDED by the layer-router decision (A below).
5. **[2/6] C gap may not be byte-identical** (wrapper runs gap through `sgs_container_gap_value()` slug-converter; helper normalisation could change the pixel value). **FIX:** assert emitted gap CSS is byte-identical in the golden re-baseline (only `gridTemplateColumns*` may be added); confirm the helper doesn't strand a dead `verticalAlign` on trust-bar (render.php doesn't read it).

Other council finds: 5 blocks (buybox/cart/collapsible-text/filter-search/product-search) have NO block_composition row (catalogue gap — insert rows). No WP-CLI batch re-save script exists (needed for A live-content migration). Enumerate which of the 11 `sites/` have live trust-bar/multi-button/feature-grid before claiming zero regression. Add a `check-composition-sync.js` gate (DB has_inner_blocks == render-consumes-content).

## Locked decision: A = the name-free layer-router (NOT the rename)

Bean chose the PROPER universal fix (2026-06-12). The carve-out is the *hardcoded attr-name fork* in the converter (`convert.py:4075-4082` picks `verticalAlign` vs `alignItems`), not just two DB names. TARGET: resolve align (and gap, and per-item bg) by **CSS-property → block-attr via a name-free layer router** (`attr_for_layer_property(slug, layer, css-property)`), zero attr-name literals anywhere. align-items → whatever attr the block declares for that property at the OUTER layer; gap/iconCircleBackground → GRID/per-item layer. This is the canonical 3-layer model (Spec 22 FR-22-21 + DEC-3) finally applied to align. It needs its own design + a second adversarial-council on the router mechanism before build. The simple rename is demoted to an interim the router replaces.

## Build sequence (locked)

- **C (next) — trust-bar gap via universal helper.** Replace the hand-read at `convert.py:3304-3314` with `_merge_grid_attrs_into_container(_inner_classes, css_rules, trust_result)`. Keep the hand-read as a fallback backstop if the helper yields nothing. Assert gap byte-identical (16px 12px); only `gridTemplateColumns*` may be added to the 2 trust-bar goldens. Confirm trust-bar render.php doesn't read a stranded verticalAlign (else scope the helper to gap+columns). iconCircleBackground STAYS typed. Re-clone + live-verify TB-A/B unchanged (gap + white circle). Smallest bounded win.
- **B (after C) — has_inner_blocks auto-derive, REDESIGNED per must-fix #1.** New `_populate_has_inner_blocks()` in `sgs-update-v2.py` Stage 1 (sibling of `_populate_allowed_blocks` ~726). Rule = save-marker AND render-consumes-$content, sgs/* only. Keep ~3-row override. Dry-run mode printing per-row would-change. Retire the 3 manual dicts EXCEPT the small override. Fixes the real team-member 0→1 stale bug. Insert the 5 missing block_composition rows. Add the `check-composition-sync.js` gate.
- **A (own session) — layer-router.** Needs its own design-gate + adversarial-council on the router mechanism. Build the name-free `attr_for_layer_property` resolution; remove the attr-name fork; route gap + iconCircleBackground through the GRID layer; THEN (if still needed) reconcile the 8 blocks' attr names via migrate() + render-side dual-key fallback + per-block default pinning + a WP-CLI batch re-save + per-block live verify. A2's 6 dead-attr blocks fold in as naming hygiene.

## Verification (every workstream)
- Converter golden conformance (Gate A) green; re-baseline cited with reason.
- Live page-8 / canary DOM probe per affected row (R-22-11); NOT emit-only (R-22-6).
- Per-block deprecated.js regression-locked in `tests/php/BlockDeprecationsTest.php`.
- /qc-council before each converter/SGS-block commit (blub.db 255). Commit by explicit path; merge to main via temp-worktree cherry-pick.


## BUILT 2026-06-12 (C + B + A-dual-key shipped to main)

- **WS-C** `6d8ebcd4` — trust-bar gap via universal detector. DONE.
- **WS-B** `0507973a` — has_inner_blocks auto-derive + override (mobile-nav=1, team-member=0) + check-composition-sync gate + 5 catalogue rows. DONE. Gate green across 74 blocks; conformance 43/43.
- **WS-A** `1f107711` — wrapper dual-key fallback (`verticalAlign ?? alignItems ?? start`). **IN-C CLOSED** (live: feature-grid align-items:stretch). NO default flip, NO rename, NO client re-save.

### Remaining (gated / flagged follow-ups) — ALL DONE 2026-06-13

- ~~**Full name-free layer-router (A)**~~ **DONE 2026-06-13 (D222, commits `1b03b8c7` + `c5ecb4eb`)** — `property_suffixes` row `align-items → AlignItems` added via dated migration; fork at `convert.py:4092-4101` removed; `_merge_grid_attrs_into_container` now receives `slug` + resolves via `attr_for_layer_property(slug, "OUTER", "align-items")`; last `verticalAlign` literal (slug-None fallback) removed in `c5ecb4eb` — router unification CLOSED. 31-block parity = 0 mismatches. Design + council verdict: `.claude/plans/2026-06-13-A-layer-router-design.md`. Render-side dual-key (`verticalAlign ?? alignItems ?? start`) retained permanently as the regression floor (council must-fix #6).
- ~~**mobile-nav block bug**~~ **DONE 2026-06-13 (D221, commit `e20f0bd5`)** — `save:()=>null` → `<InnerBlocks.Content/>` + vNull deprecation + version 3.1.1 + deprecation-test entry; mobile-nav `has_inner_blocks` override removed.
- ~~**team-member**~~ **DONE 2026-06-13 (D221, commit `e20f0bd5`)** — root cause was NOT missing plumbing (Bean's correction): `equivalent_block_for(name)` mis-returned `sgs/heading`. Fixed via the new durable `ATTR_CLASSIFICATION_OVERRIDES` layer (`team-member.name role=NULL` → scalar, matching render.php); team-member `has_inner_blocks` override removed. Both override dicts now empty.
- ~~**IN-F notice-banner content**~~ **DONE 2026-06-13 (D222, commit `1b03b8c7`)** — a node resolving to a `has_inner_blocks` composite with direct rich-text but zero child blocks now lifts that text into one `sgs/text` child (DB-gated, no per-slug branch). Ingredients disclaimer text live-verified on canary page 8.

### Successor
The only remaining converter-literalisation work is the **de-literalisation programme**: 13 per-block literals + line numbers scoped in `.claude/plans/2026-06-13-converter-de-literalisation-audit.md` (docs commit `ac17af9b`).
