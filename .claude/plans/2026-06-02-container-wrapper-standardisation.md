---
doc_type: strategic-plan
project: small-giants-wp
plan_name: 2026-06-02-container-wrapper-standardisation
generated: 2026-06-02
timebox: "~3 sessions (~6–9 hrs total; WS-1+WS-2+WS-3 concurrent ~2 sessions; WS-4 ~1 session after WS-1 gate). DB substrate (Workstream A: block_composition.container_kind column + sync rewrite + trust-bar/modal containerKind) SHIPPED commit 0d746073."
status: active
progress: "WS-1a (A1 contentWidth attr + guarded __inner render wrapper) + WS-1b (A2 outer max-width→widthMode transfer absent→full/present→custom + fold lifts __inner max-width→contentWidth) SHIPPED 2026-06-03, commit 2f86d9e6 (D159), live-DOM verified @1440. REMAINING WS-1c: A3/A4/A5/A6 (A7 likely MOOT — _lift_core_block_style is dead code; A2 inlined its own max-width→widthMode). WS-4 sharpened (D159.2): remove each composite's drifted wrapper → exact sgs/container mirror → /sgs-update auto-re-mirror on container version bump. Next: page-triage register P-CLONE-PAGE-VISUAL-TRIAGE (#1-#8, none an A1/A2 regression) + WS-4."
authors: Claude Code / Bean
primary_goal: "The cloning pipeline faithfully transfers CSS from any draft section, and every composite block with a built-in wrapper mirrors sgs/container — no per-block divergence, auto-propagated when container gains a capability."
motivation: "Every pixel the pipeline gets wrong is a manual fix after every clone. Right now 4 of the 7 body sections on Mama's Munches render constrained to 1200 px when they should be full-bleed, and their inner content width is dropped entirely. Fixing the container/wrapper system is the one change that closes the structural CSS-transfer deficit for ALL future clients — not just Mama's."
parent_plan: ".claude/plans/2026-05-28-phase-2-hybrid-block-migration.md"
---

# Container & Wrapper Standardisation — Strategic Plan

## 1. Problem

The cloning pipeline's core job is **faithful CSS transfer**: whatever the designer put in the mockup must appear in the live WordPress page. That is failing at the structural level.

**Scope — universal, not section-level.** This fix applies to every wrapper element in the draft HTML at any nesting depth, every `sgs/container` instance at any depth, and every composite block with a built-in `sgs/container` wrapper (all three KINDs: section/layout/content). The four Mama's Munches sections are the measurement gate, not the scope. Faithful transfer also covers a property's absence (no `max-width` → full-width, overriding the theme default).

Every draft body section is two layers: a **full-bleed outer box** (background runs edge-to-edge) wrapping an **`__inner` content box** (`max-width` + `margin:auto`) that caps the readable content. The pipeline collapses these two layers into one and loses both halves:

- **Full-bleed gap (Gap 1):** four slug-None sections (featured-product, ingredients, gift, social-proof) get clamped to the theme `wideSize` (1200 px) instead of filling the viewport. Confirmed by Playwright computed-style baseline at 1440 px — all four measure 1200 px; draft measures ~1425 px.
- **Content-width gap (Gap 2):** the fold (`_fold_layout_into_attrs`, `convert.py:2776`) has no `max-width` entry in `_root_lift_rules()` — the `__inner`'s width cap is **dropped entirely** for all four sections.

On top of this, 28 composite blocks each re-implement their own wrapper CSS independently of `sgs/container`, so when a capability is fixed on `sgs/container` it has to be manually replicated 28 times. There is no propagation mechanism.

**Baseline (2026-06-04 Playwright @1440):** featured-product, ingredients, gift, social-proof all render at 1200 px section width, no inner content cap. Draft: full-bleed + 1040/960/960/960 px inner. Brand section correct at 1000 px; hero correct (alignfull); trust-bar: composite-conflict separate.

---

## 2. Plain-English Summary

**Problem:** The pipeline squashes two-layer draft sections into one, losing the full-bleed background AND the capped inner content width.

**Effect:** Every cloned page looks wrong structurally — content sprawls or is too narrow; clients see a different page from the approved design.

**Solution:** Build the missing capability onto `sgs/container` first, then wire up auto-propagation so every composite wrapper stays in sync. Fix the converter to actually transfer the `__inner`'s max-width into the new capability. Remove hardcoded hacks along the way.

---

## 3. Solution Shape

Five workstreams, three running concurrently:

1. **WS-1 — Build the missing capabilities on `sgs/container`** (the canonical wrapper). Gaps A1–A6 (content-width, outer max-width, custom-width, raw-px gap, min-height, per-grid-item). WS-4 cannot start until A1+A2 ship.
2. **WS-2 — Fix the converter/router** so it actually writes the capabilities instead of degrading to scoped CSS or dropping values. Gaps B1–B4.
3. **WS-3 — Remove hardcoded hacks (R-22-1 de-cheat)**. Move eight hardcoded lists/lookups into the DB. Gaps C1–C8.
4. **WS-4 — Standardise all 28 composite blocks** to mirror `sgs/container`, and build the auto-propagation path so a future container capability propagates via the `block_composition` table. Gaps D1–D3.
5. **WS-5 — Docs** — embed the 6-step wrapper-conversion procedure in Spec 22; update decisions/parking/state throughout.

**Scope — universal, not section-level.** This fix applies to every wrapper element in the draft HTML at any nesting depth, every `sgs/container` instance at any depth, and every composite block with a built-in `sgs/container` wrapper (all three KINDs: section/layout/content). The four Mama's Munches sections are the measurement gate, not the scope. Faithful transfer also covers a property's absence (no `max-width` → full-width, overriding the theme default).

**Acceptance for the programme:** The four target sections (featured-product, ingredients, gift, social-proof) render full-bleed background + capped centred content matching the draft's `__inner` max-width. Every SECTION-KIND composite (cta-section, hero, modal, trust-bar) mirrors `sgs/container`'s full attr surface. A new container capability added via `block.json` + `/sgs-update` auto-propagates to all 28 composites via `sync-container-wrapping-blocks.py`. All live-DOM verified (R-22-11) + Bean sign-off (R-22-13).

---

## 4. Out of Scope

- **Hero gradient (Gap 3):** the clone paints `linear-gradient(135deg,#C56A7A…)` over the draft's solid pink. Separate diagnosis — not structural CSS transfer.
- **Trust-bar composite-conflict grid (P-TRUSTBAR-BOUND-GRID):** the bound-mode `__inner` renders 584 px / uneven because the block's own `style.css` grid rules compete with the converter's emitted container CSS. Requires a composite-block CSS architecture fix — out of scope here.
- **Phase 2 hybrid block migration (FR-22-6 InnerBlocks):** the 61-block save-migration is tracked in the Phase 2 plan. This plan does not advance that roster.
- **WooCommerce / product-card (Theme thread):** entirely separate.
- **Mobile nav, mega-menu, option-picker:** not container-system work.
- **Pixel-diff ≤1% per section target (Phase 2.5):** structural correctness first; sub-1% pixel-diff is Phase 2.5.

---

## 5. Phase Overview

| Phase | Name | Timebox | Deliverable | Depends on | Gate |
|-------|------|---------|-------------|------------|------|
| WS-1a | `contentWidth` attr on sgs/container | ✅ SHIPPED 2026-06-03 commit 2f86d9e6 (D159) | A1 shipped: new attr + render.php `__inner` div + editor control | none | Live-DOM verified @1440 |
| WS-1b | Outer max-width transfer + de-cheat C1 | ✅ SHIPPED 2026-06-03 commit 2f86d9e6 (D159) | A2 shipped: widthMode-from-own-max-width transfer; fold lifts `__inner`→contentWidth | WS-1a | Live-DOM verified @1440. Note: A7 MOOT — `_lift_core_block_style` is dead code; A2 inlined its own max-width→widthMode logic |
| WS-1c | Custom-width + raw-px gap + min-height + grid-item (A3–A6) | ~45 min | Four smaller gaps closed; converter writes gridItem attrs | WS-1a ✅ | Per-gap: GAP-5 custom-width lifts a brand-1000 correctly |
| WS-2 | Converter/router truth — B1–B4 | ~60 min | D1 typed-attr layer revived or replaced; `__inner` max-width routes to attr in multi-child grids; grid-template-columns typed; D3 dual-write removed | WS-1a | leftover-buckets.json: maxWidth/widthMode no longer extraction_failed on the 4 target sections |
| WS-3 | De-cheat R-22-1 — C2–C8 | ~60 min | Eight hardcoded structures moved to DB or documented; unified breakpoint table; css_router._infer_role() queries DB | none (can start alongside WS-1) | No grep-match for the retired constant names in production scripts |
| WS-4a | DB propagation writer (Workstream A DB substrate SHIPPED; writer still needed) | ~45 min | KIND→attr-scope diff writer + /sgs-update wired; KIND assignments verified in dry-run | WS-1a must ship contentWidth before the KIND-scoped diff is meaningful | Bean sign-off on final 28-block roster + KIND assignments in dry-run output |
| WS-4b | PHP shared-helper + composite block.json/render.php updates | ~90 min | Shared container render helper extracted; all 28 composites call it; divergent re-implementations (trust-bar grid, hero split, cta-section layout) routed through the mechanism | WS-4a | Live-editor validation: each composite still renders correctly after switching to shared helper |
| WS-5 | Docs | throughout | Spec 22 §FR-22-3 updated with 6-step procedure; decisions/parking/state current | each phase closes | /handoff Gate 4.5 walks docs-registry.yaml clean |

---

## 6. Dependency Graph

```
WS-3 (de-cheat C2–C8) ───────────────────────────────────────────┐
                                                                    │
WS-1a (contentWidth A1) ─► WS-1b (A2) ─► WS-1c (A3–A6)           │
         │                                                          ▼
         └─► WS-2 (converter B1–B4) ──────────────────► WS-4a (DB propagation writer)
                                                                    │
                                                                    ▼
                                                         WS-4b (composites mirror)
                                                                    │
                                                                    ▼
                                                         Programme acceptance gate
```

| Dependency | Blocks | Owner |
|-----------|--------|-------|
| ~~WS-1a: `contentWidth` attr + render.php~~ | ✅ SATISFIED — A1 SHIPPED commit `2f86d9e6` (D159) | Claude Code |
| ~~WS-1b: outer max-width transfer~~ | ✅ SATISFIED — A2 SHIPPED commit `2f86d9e6` (D159) | Claude Code |
| WS-4a: KIND-scoped diff writer | WS-4b (composites need the diff before apply) | Claude Code |
| WS-2: D1 typed-attr revive decision | Bean review (decision gate) | Bean |
| ~~block_composition table (Workstream A from D150 scratch)~~ | ✅ SATISFIED — `container_kind` column + sync rewrite SHIPPED `0d746073` | Claude Code |

---

## 7. Work Units

### WS-1 — sgs/container capability completion

> **WS-1a (A1) + WS-1b (A2) SHIPPED 2026-06-03, commit `2f86d9e6` (D159), live-DOM verified @1440.**
> A7 MOOT — `_lift_core_block_style` is dead code; A2 inlined its own max-width→widthMode logic.
> **Remaining: WS-1c (A3/A4/A5/A6).** Live triage register + WS-4 build spec now in `.claude/plans/2026-06-03-cloning-fidelity-triage-and-composite-remodel.md`.

**Purpose:** Build the capabilities `sgs/container` currently lacks so composites have something concrete to mirror and the converter has attributes to write into.

**Files:**
- `plugins/sgs-blocks/src/blocks/container/block.json` — add `contentWidth`, `minHeight`, `gridItemColSpan`/`gridItemRowSpan` attrs
- `plugins/sgs-blocks/src/blocks/container/render.php` — emit `sgs-container__inner` div when `contentWidth` set
- `plugins/sgs-blocks/src/blocks/container/edit.js` — "Content width" inspector control
- `plugins/sgs-blocks/assets/css/style.css` — `.sgs-container--constrained-content > :where(:not(.alignfull):not(.alignwide)) { max-width: var(--sgs-content-width); margin-inline: auto; }`
- `plugins/sgs-blocks/scripts/convert.py` — `_root_lift_rules()` (line 498), `_fold_layout_into_attrs` (line 2776), `_emit_section_container`, `_match_theme_width` (line 975)
- `plugins/sgs-blocks/scripts/db_lookup.py` — line 2461 band-aid removal

**Gaps addressed:** ~~A1~~ ✅ ~~A2~~ ✅ ~~A7~~ MOOT | **Remaining: A3, A4, A5, A6**

**Acceptance:**
- A1: Playwright computed-style @1440 — featured-product section-box ~1425, inner content-box = 1040 px centred. Ingredients/gift/social-proof same at 960 px.
- A2: The four slug-None sections carry no `max-width:1200`; they match the viewport width.
- A3: GAP-5 custom-width (brand 1000 px): converter emits `widthMode:custom, customWidth:"1000px"`, brand section renders 1000 px unchanged.
- A4: Raw-px gap value passes through render.php without being wrapped in `var(--wp--preset--spacing--…)`.
- A7: `_lift_core_block_style` max-width→widthMode logic is called from the fold path (not atomic-only); a section container with a `max-width` CSS decl converts to `widthMode` correctly.
- All: Bean visual sign-off on canary page 144 per section (R-22-13).

**VERIFY:** Re-run the 2026-06-04 Playwright baseline script post-deploy; compare section-W + content-W per row. Gate is numerical match to the falsifiable predictions in `.claude/scratch/2026-06-04-css-transfer-gaps-1-2-fix-shape.md`.

**Estimate:** A1+A2 = ~45 min build + ~30 min measure. A3–A6 = ~45 min.

**Risk:** Medium — render.php emitting an `__inner` wrapper div changes the DOM shape; any existing scoped CSS targeting direct children of `.wp-block-sgs-container` may need a `:where()` adjustment.

**Steps (A1+A2 = steps 1–7 SHIPPED 2026-06-03 commit `2f86d9e6`; steps 8–9 pending):**
1. ✅ Add `contentWidth` (string, default "") to container/block.json attrs.
2. ✅ render.php: emit `<div class="sgs-container__inner" style="--sgs-content-width:<?= esc_attr($contentWidth) ?>">…</div>` when `!empty($contentWidth)`.
3. ✅ style.css: add the constrained-content rule (`.sgs-container--constrained-content > :where(…)`).
4. ✅ edit.js: add a "Content width" TextControl under the Dimensions panel.
5. ✅ convert.py `_fold_layout_into_attrs` (line 2776): when the folded `__inner` has a `max-width` CSS decl, write `container_attrs.setdefault("contentWidth", <value>)`.
6. ✅ `_emit_section_container`: for slug-None sections, transfer widthMode-from-own-max-width (absent→full / present→custom). A7 MOOT — `_lift_core_block_style` is dead code; A2 inlined its own logic directly.
7. ✅ Remove the `{"widthMode":"full"}` hardcode at db_lookup.py:2461 (C1 de-cheat).
8. Build + deploy canary; run Playwright baseline re-measure; compare to falsifiable predictions.
9. Bean sign-off.

---

### WS-2 — Converter/router truth

**Purpose:** Ensure the capabilities built in WS-1 are actually written by the converter rather than degrading to scoped CSS or being dropped.

**Files:**
- `plugins/sgs-blocks/scripts/convert.py` — `seed_d1_sidecar` (line 167), `_fold_layout_into_attrs` (line 2830), gap `grid-template-columns` root-lift path
- `plugins/sgs-blocks/scripts/css_router.py` — line 531 D3 dual-write

**Gaps addressed:** B1, B2, B3, B4, B5

**Key decision — B1:** The D1 typed-attr layer (`seed_d1_sidecar` is a no-op stub; ~43 assignments written to `css-d1-assignments.json` but never consumed). Two options: (a) revive the consume-path (write the typed attr into the block attrs); (b) replace with a simpler DB-driven lookup. **Bean must decide after seeing options.** Present before building.

**Acceptance:**
- B1: `leftover-buckets.json` for the 4 target sections: `maxWidth`/`widthMode` no longer listed as `extraction_failed severity:medium`.
- B2: multi-child `__inner` max-width lifts to `contentWidth` attr (not scoped CSS).
- B3: `grid-template-columns` on a recognised section emits a typed attr.
- B4: `css_router.py:531` dual-write to production CSS removed; D3 gap-candidates go only to the gap register.
- B5: `css_router.py:433–437` verbatim-CSS-fallback removed or replaced with a logged-and-skipped path; no unscoped CSS leaks to the page on import failure.

**Estimate:** ~60 min (B1 decision may add a /brainstorming session).

**Risk:** High on B1 — the D1 layer is dead code; reviving it could surface edge cases. Spike on one section before generalising.

---

### WS-3 — De-cheat (R-22-1 DB-first)

**Purpose:** Move hardcoded constants to the DB or document them as permitted exceptions so the pipeline stays maintainable as blocks evolve.

**Files:**
- `plugins/sgs-blocks/scripts/db_lookup.py` — lines 660–701 (`_CAPABILITY_PRIORITY`), 1046–1052 (breakpoints)
- `plugins/sgs-blocks/scripts/convert.py` — line 2322–2323 (second breakpoint system)
- `plugins/sgs-blocks/scripts/css_router.py` — lines 54–71 (`_GLOBAL_BARE_TAGS`/`_CHROME_TOP_ELEMENTS`), 573–588 (`_infer_role()`)
- `plugins/sgs-blocks/scripts/upload_and_patch.py` — lines 36, 86 (hardcoded Mama's page 144)
- `plugins/sgs-blocks/src/blocks/trust-bar/style.css` — lines 43–101 (static grid class + data-columns selectors not attr-driven)
- Block.json files for cta-section and hero — `layout` attr enum collision + `overlayColour` naming drift

**Gaps addressed:** C2, C3, C4, C5, C6, C7, C8 (C1 handled in WS-1b)

**Acceptance:**
- C3: `_CAPABILITY_PRIORITY` list replaced by a DB column; grep returns 0 matches for the constant name in production scripts.
- C4: one breakpoint table in the DB; both hardcoded lists removed.
- C5: `_infer_role()` queries `property_suffixes.kind_override`; substring-match fallback commented out or removed.
- C7: `upload_and_patch.py` accepts `--page` and `--client` args; no hardcoded `144`.
- C8: `layout` attr enum aligned; `overlayColour` drift documented in block.json `description`.

**Estimate:** ~60 min (largely mechanical DB inserts + find-replace; C8 needs a /brainstorming session on enum alignment).

**Risk:** Low-Medium — C5 changes recognition logic; test on a full `/sgs-clone --debug-trace` run on Mama's before committing.

---

### WS-4 — Composite standardisation + auto-propagation

> **Scope sharpened (D160):** ALL ~28 composites KIND-scoped (not just 4 SECTION blocks). Remove each composite's drifted wrapper → exact sgs/container mirror → /sgs-update auto-re-mirror on container version bump. Live triage + WS-4 build spec in `.claude/plans/2026-06-03-cloning-fidelity-triage-and-composite-remodel.md`.

**Purpose:** Every composite block with a wrapper mirrors `sgs/container`. When container gains a new capability, one `/sgs-update` run propagates the capability diff to all 28 composites.

**Files:**
- `plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py` — full rewrite from report-only to writer
- `plugins/sgs-blocks/scripts/create-db.py` — `container_kind` column migration
- `plugins/sgs-blocks/scripts/seed-composition-roles.py` — fix post-grid/gallery/card-grid `leaf`→`content-block`
- `plugins/sgs-blocks/scripts/update-sgs-framework.py` (the /sgs-update entry) — wire Stage N to run sync after block_composition reconciliation
- `plugins/sgs-blocks/src/blocks/*/block.json` — trust-bar + modal: add `supports.sgs.containerKind:"section"`
- A new shared PHP helper file (e.g. `includes/class-container-render-helper.php`) — extract the container's constrained-content render logic so composites call it, not re-implement it

**Gaps addressed:** D1, D2, D3

**Sub-steps (from `.claude/scratch/2026-06-02-container-roster-db-table-handoff.md` Workstream A spec):**
1. ✅ Add `container_kind` TEXT column to `block_composition`. **SHIPPED `0d746073`.**
2. ✅ Rewrite `sync-container-wrapping-blocks.py` — detect via `has_inner_blocks` + attr names + `accepts_allowed_blocks`; derive and write `wraps_block` + `container_kind`. **SHIPPED `0d746073` (report-only; no block.json/render.php propagation writer yet).**
3. ✅ Add `supports.sgs.containerKind:"section"` to trust-bar + modal block.json; wire /sgs-update Stage 1 to read it. **SHIPPED `0d746073`.**
4. Build KIND→attr-scope map (section=full surface; layout=grid/flex/width/contentWidth; content=width/contentWidth/spacing).
5. Fix composition_role `leaf`→`content-block` for post-grid, gallery, card-grid.
6. Dry-run — Bean reviews the 28-block roster + KIND assignments — then `--apply`.
7. Extract shared PHP render helper; update all 28 composites to call it.
8. Live-editor validation per composite (old posts via deprecated.js; new posts persist correctly).

**Acceptance:**
- D1: `sync-container-wrapping-blocks.py --apply` writes `wraps_block=1` + correct `container_kind` for all 28 blocks.
- D2: After a container capability addition (e.g. A1 `contentWidth`), running `sync-container-wrapping-blocks.py --apply` adds the attr to the 28 composites' block.json within the KIND-scoped surface.
- D3: Proof-of-propagation test: add a dummy attr to container block.json; run /sgs-update; confirm all 28 block.json files gained the attr (or the KIND-scoped subset). Bean sign-off.

**Estimate:** WS-4a (DB + sync writer) ~45 min. WS-4b (PHP helper + 28 block updates) ~90 min.

**Risk:** High — touching 28 block.json + render.php files; build with `/dispatching-parallel-agents` + a pre-/qc-council on the sync writer before `--apply`. Live-editor validation is mandatory (R-22-13, R-22-11).

---

### WS-5 — Documentation

**Purpose:** Keep Spec 22, the cloning-pipeline flow/stages, decisions.md and parking.md current with every change shipped. Running throughout all workstreams.

**Deliverables:**
- Spec 22 §FR-22-3: the 6-step wrapper-conversion procedure (outer full-bleed → `widthMode:full`; inner content cap → `contentWidth`; fold; etc.)
- `cloning-pipeline-flow.md` + `cloning-pipeline-stages.md`: content-width transfer documented in the fold stage
- `decisions.md`: one D-number per workstream close
- `parking.md`: resolved items moved to `memory/parking-archive.md`
- This plan: updated to `status: active`, then `status: shipped` at programme close

---

## 8. Gates

### Gate WS-1a — contentWidth blocks WS-2 and WS-4

**Pass:** Playwright @1440 confirms the 4 target sections render full-bleed + inner content-box matches draft widths (featured-product 1040, ingredients/gift/social-proof 960). Brand stays 1000. Bean sign-off.

**Fail:** Any target section still at 1200; inner content-box still dropped; or brand forced to full-bleed.

**Decision:** If trust-bar `__inner` grid breaks under B2 (composite conflict) — carved out to P-TRUSTBAR-BOUND-GRID; do not block the gate.

### Gate WS-3 — de-cheat clean

**Pass:** `grep -r "_CAPABILITY_PRIORITY\|BREAKPOINTS\|infer_role.*substring\|MOCKUP_ROOT" plugins/sgs-blocks/scripts/` returns 0 production-script matches.

**Fail:** Any match remains.

### Gate WS-4a — propagation writer verified

**Pass:** Bean reviews dry-run output; 28-block roster + KIND match the D150 validated list; `--apply` succeeds with no orphaned rows.

**Fail:** Any KIND mismatch from the validated list without a recorded justification.

### Gate WS-4b — composites validated

**Pass:** Live-editor: load an existing post with each of the 28 composite blocks; no deprecation warnings (or deprecation path resolves correctly via deprecated.js). Create new post; blocks save and load correctly.

**Fail:** Any composite block loses content on re-save.

### Programme acceptance gate

**Pass:** All WS-1–4 gates cleared. The 4 target sections + brand render faithfully at 1440/768/375 px. A new dummy attr on `sgs/container` propagates to all 28 composites via a single `/sgs-update` run. Bean visual sign-off on canary page 144. R-22-11 (live-DOM) + R-22-13 (Bean's eye) both satisfied.

---

## 9. Risk Register

| Risk | Phase | Likelihood | Impact | Status | Mitigation / Owner |
|------|-------|-----------|--------|--------|--------------------|
| `__inner` wrapper div breaks scoped CSS rules targeting direct `.wp-block-sgs-container` children | WS-1a | M | M | Mitigated | Audit `style.css` for `> *` selectors before shipping; update to `:where(:not(.sgs-container__inner)) > *` if found. Owner: Claude Code |
| D1 typed-attr revive (B1) opens unknown edge cases across the ~43 assignment types | WS-2 | M | H | Owned | Spike on one section only before generalising; Bean reviews B1 decision options first. Owner: Bean (decision) + Claude Code (spike) |
| 28-block block.json + render.php changes introduce regressions across composite blocks | WS-4b | M | H | Mitigated | `/dispatching-parallel-agents` (one agent per block family); /qc-council before `--apply`; live-editor validation per block. Owner: Claude Code |
| `composition_role` flip (post-grid/gallery/card-grid `leaf`→`content-block`) triggers walker leaf-guard regression on a future mockup that uses these blocks | WS-4a | L | M | Accepted | Only safe while these blocks are not on the Mama's canary mockup (confirmed D150). Document the risk in parking.md for any future client using these blocks. Owner: Claude Code |
| Trust-bar composite-conflict (P-TRUSTBAR-BOUND-GRID) mis-scoped into WS-4b | WS-4b | M | M | Mitigated | Explicit out-of-scope guard in WS-4b checklist; trust-bar carved out to its own parking entry before WS-4b starts. Owner: Claude Code |
| Gap-1 theme-CSS-by-position rule triggers an unexpected double-cap interaction with widthMode on some composite sections | WS-1b | L | M | Owned | /qc-council to settle empirically via Playwright `:where()` computed-style check before shipping gap-1 CSS. Owner: Claude Code |
| Concurrent commits from theme thread and cloning thread bundle wrong files (feedback_concurrent_commit_race_shared_tree) | All | M | M | Mitigated | One thread commits at a time; verify `git log -1 --stat` after every commit. Use explicit path commits. Owner: Bean + Claude Code |

---

## 10. Effort Summary

| Workstream | Steps | Optimistic estimate | Cumulative |
|-----------|-------|--------------------:|------------|
| WS-1a (A1+A2) | 9 steps | 45 min | 45 min |
| WS-1b+c (A3–A6) | 4 gaps | 45 min | 90 min |
| WS-2 (B1–B4) | incl. decision | 60 min | 150 min |
| WS-3 (C2–C8) | largely mechanical | 60 min | 210 min |
| WS-4a (DB + sync writer) | 6 sub-steps | 45 min | 255 min |
| WS-4b (PHP helper + 28 blocks) | parallel agents | 90 min | 345 min |
| WS-5 (docs) | throughout | 30 min | 375 min |
| **Total** | | **~6 hrs 15 min** | **~3 sessions** |

WS-1, WS-2, WS-3 can run concurrently in Session 1 (WS-3 alongside WS-1 from the start; WS-2 starts after WS-1a). WS-4 is Session 2+. WS-5 is continuous.

---

## 11. Session Plan

| Session | Units | Gate at close |
|---------|-------|---------------|
| 1 | WS-1a → WS-1b → WS-1c (in sequence) + WS-3 in parallel (C3/C4/C5/C7 are standalone DB/script work) | Gate WS-1a clears WS-2 + WS-4a dependency |
| 2 | WS-2 (needs Gate WS-1a) + WS-4a (DB + sync writer) | Gate WS-3 clean + Gate WS-4a dry-run Bean sign-off |
| 3 | WS-4b (28 composites — parallel agents) + WS-5 close | Programme acceptance gate |

---

## 12. Per-Phase Handoffs

### WS-1 → /phase-planner

**Trigger:** Starting Session 1.

**Entry context:**
- Fix-shape doc: `.claude/scratch/2026-06-04-css-transfer-gaps-1-2-fix-shape.md` (Option B chosen, Bean-locked; baseline table already measured)
- Measured baseline at `.claude/scratch/2026-06-04-css-transfer-gaps-1-2-fix-shape.md §MEASURED BASELINE`
- Falsifiable predictions in same doc §Falsifiable post-fix prediction
- R-22 compliance checklist in same doc §R-22 compliance

**Plan-Level Label:** `WS-1-container-capability` — 9-step sequence, pixel-diff gate at step 8.

### WS-2 → /phase-planner

**Trigger:** After Gate WS-1a clears.

**Entry context:**
- B1 decision: present two options (revive D1 consume-path vs DB-driven replacement) to Bean before building.
- `leftover-buckets.json` from the last pipeline run as the before-state.

**Plan-Level Label:** `WS-2-converter-truth` — B1 decision gate first, then B2/B3/B4 in sequence.

### WS-3 → /phase-planner

**Trigger:** Any point in Session 1 (independent of WS-1).

**Entry context:**
- Each C-gap is self-contained; order by file (db_lookup.py → css_router.py → convert.py → upload_and_patch.py → block.json files).
- C5 (`_infer_role()`) needs a post-change `/sgs-clone --debug-trace` run to confirm no recognition regression.

**Plan-Level Label:** `WS-3-de-cheat` — mechanical DB inserts + find-replace; C8 needs /brainstorming first.

### WS-4 → /phase-planner

**Trigger:** After Gate WS-1a (contentWidth must exist) + Gate WS-4a dry-run Bean sign-off.

**Entry context:**
- Workstream A spec: `.claude/scratch/2026-06-02-container-roster-db-table-handoff.md` (6 build steps, validated 28-block roster, safety notes)
- Classifier script: `/tmp/d6_classify2.py` (the working 28-block classifier from D150)
- WS-4b uses `/dispatching-parallel-agents` — 4 agent batches by block family (SECTION/LAYOUT/CONTENT × sub-groups)

**Plan-Level Label:** `WS-4-composite-standardisation` — WS-4a (DB write) gating WS-4b (block updates).

---

## 13. Open Questions

1. **B1 decision:** Revive the D1 typed-attr consume-path, or replace `seed_d1_sidecar` with a simpler DB-driven approach? (Bean decision; present options at start of WS-2.)
2. **Gap-1 route:** theme-CSS-by-position (`:where(.content-root) > .wp-block-sgs-container { max-width:none }`) vs generalise `widthMode:'full'` in `_emit_section_container`? (qc-council to settle empirically — `/qc-council` before shipping.)
3. **Trust-bar `__inner` fold:** when `__inner` is itself the grid (not a child), does B2 keep the grid + cap together in the constrained-content model, or does it need `__inner` preserved as a nested container (Option-A fallback)? (Decide in the WS-1a spike before committing the fold change.)
4. **C8 enum alignment:** `layout` attr on cta-section (`centred`/`left-split`) vs hero (`grid`/`flex`) — unify into a shared enum or document the intentional difference? (Needs /brainstorming on the editor-UX impact before changing.)

---

## Appendix A — The 3-Layer Model

Every SGS draft section has (up to) three CSS layers:

| Layer | Draft HTML | CSS role | sgs/container capability |
|-------|-----------|----------|------------------------|
| Outer box | `.sgs-{block}` (section element) | Full-bleed background, padding, border, shape divider | `widthMode`, `padding`, `backgroundColour`, etc. (existing) |
| Content-width | `.__inner` / `.__card-inner` (div child) | Caps and centres content to a max-width | **`contentWidth`** (WS-1a — new) |
| Per-grid-item | Grid children | Column/row span inside the grid | `gridItemColSpan` / `gridItemRowSpan` (A6 — new) |

The pipeline currently transfers Layer 1 (partially) and **drops Layers 2 and 3 entirely**.

---

## Appendix B — Gap Register

| Gap | Description | File : line | Severity |
|-----|-------------|------------|----------|
| ~~A1~~ | ✅ DONE 2026-06-03 commit `2f86d9e6` — `contentWidth` attr + render.php `__inner` div + fold lift | `container/block.json`, `render.php`, `convert.py:2776` | ~~High~~ |
| ~~A2~~ | ✅ DONE 2026-06-03 commit `2f86d9e6` — widthMode-from-own-max-width transfer; `db_lookup.py:2461` band-aid removed (C1 paired) | `convert.py:2031–2039`, `db_lookup.py:2461` | ~~High~~ |
| A3 | `_match_theme_width` never emits `widthMode:custom + customWidth` | `convert.py:975–989` | Medium |
| A4 | render.php wraps raw-px gap values in `var(--wp--preset--spacing--…)` | `render.php:150` | Medium |
| A5 | `min-height` not in `_root_lift_rules` | `convert.py:498` | Low |
| A6 | `gridItem*` attrs never written by converter | `convert.py` (zero `gridItem` refs) | Medium |
| B1 | `seed_d1_sidecar` is a no-op stub; ~43 typed-attr assignments written to JSON but never consumed | `convert.py:167` | High |
| B2 | `_fold_eligible` sole-child gate (`convert.py:2830`) drops ALL fold attrs (max-width, gap, padding, etc.) for multi-child sections, not just max-width; `__inner` content-width cap lost entirely | `convert.py:2830` | Medium |
| B3 | `grid-template-columns` on recognised section → scoped CSS, not typed attr | `convert.py:498` (missing entry) | Medium |
| B4 | D3 gap-candidates dual-write to production CSS | `css_router.py:531` | Low |
| ~~C1~~ | ✅ DONE 2026-06-03 commit `2f86d9e6` — band-aid removed (paired with A2) | `db_lookup.py:2461` | ~~High~~ |
| C2 | trust-bar grid: static CSS classes + `data-columns` selectors, not attr-driven render | `trust-bar/style.css:43–101` | Medium |
| C3 | `_CAPABILITY_PRIORITY` hardcoded list | `db_lookup.py:660–701` | Medium |
| C4 | Two independent breakpoint systems | `db_lookup.py:1046–1052`, `convert.py:2322–2323` | Medium |
| C5 | `_infer_role()` uses substring-match not `property_suffixes.kind_override` | `css_router.py:573–588` | Medium |
| C6 | `_GLOBAL_BARE_TAGS` + `_CHROME_TOP_ELEMENTS` frozensets are hardcoded vocabulary — an R-22-1 violation; must move to DB or be documented as a permitted constant exception (like `SKIP_TOP_LEVEL_TAGS`) with a justification comment | `css_router.py:54–71` → WS-3 | Medium |
| C7 | `MOCKUP_ROOT` + page 144 hardcoded to Mama's in a universal script | `upload_and_patch.py:36, 86` | Medium |
| C8 | cta-section `layout` enum collision + hero `splitColumnRatio` + `overlayColour` naming drift | `cta-section/block.json`, `hero/block.json` | Medium |
| D1 | `sync-container-wrapping-blocks.py` is report-only; `--apply` writes DB metadata only, no block.json/render.php propagation | `sync-container-wrapping-blocks.py` | High |
| D2 | Every composite has large attr gaps vs sgs/container (SECTION ~7–14 of 69 attrs; LAYOUT ~6–9; CONTENT 0 of 4 width attrs) | All 28 composite block.json files | High |
| D3 | Composites (especially SECTION-KIND) get confidence 1.0 via class-section tier; the 4 sgs/container sections get confidence 0.0 deferred-no-match | `convert.py` tier logic | Medium |
| ~~A7~~ | MOOT — `_lift_core_block_style` is dead code; A2 inlined its own max-width→widthMode logic directly. No action required. | `convert.py:1034–1040` | ~~Medium~~ |
| B5 | `css_router.py:433–437` verbatim-CSS-fallback dumps unscoped page-wide CSS on import failure — operator-invisible anti-pattern that can leak global styles into the page | `css_router.py:433–437` → WS-2 | Medium |

---

## Appendix C — Dependency note: WS-1 before WS-4

WS-4 (composite standardisation) requires `sgs/container` to already have `contentWidth` (A1) so the KIND-scoped diff has a real attr to propagate. Without A1, WS-4b would propagate an empty diff for the content-width axis — producing no observable improvement and making the proof-of-propagation test unmeasurable. **Always run WS-1a to Gate before opening a WS-4 session.**

---

## Appendix D — Programme acceptance definition

**Scope — universal, not section-level.** This fix applies to every wrapper element in the draft HTML at any nesting depth, every `sgs/container` instance at any depth, and every composite block with a built-in `sgs/container` wrapper (all three KINDs: section/layout/content). The four Mama's Munches sections are the measurement gate, not the scope. Faithful transfer also covers a property's absence (no `max-width` → full-width, overriding the theme default).

The programme is CLOSED when ALL of these are true, live-DOM verified (R-22-11) + Bean sign-off (R-22-13):

1. **Structural faithfulness:** featured-product, ingredients, gift, social-proof sections render full-bleed background + capped centred content (widths = 1040/960/960/960 px) at 1440/768/375 px. Brand stays 1000 px. Hero unchanged.
2. **Composite mirror:** all SECTION-KIND composites (cta-section, hero, modal, trust-bar) carry the full `sgs/container` attr surface within their KIND scope.
3. **Auto-propagation proved:** a new attr added to `sgs/container/block.json` + a `/sgs-update` run causes `sync-container-wrapping-blocks.py` to write that attr into all 28 composites' block.json files (KIND-scoped subset). Zero manual edits required per composite.
4. **No regressions:** all existing Mama's Munches canary sections + the 28 composites pass live-editor validation (load + re-save → no deprecation errors, content preserved).
