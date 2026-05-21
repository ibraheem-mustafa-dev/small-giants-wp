---
doc_type: phase-plan
project: small-giants-wp
phase: wave-2-wiring-fix
session_tag: small-giants-wp-2026-05-22-wave-2-wiring-fix
generated: 2026-05-22
parent_spec: .claude/specs/16-DETERMINISTIC-CONVERTER-V2.md §15
status: drafted — pending /qc-council Stage 5 empirical validation (Task 2)
---

# Phase plan — Wave 2 wiring fix (G1 + G3 + G5 dissolve as one architectural change)

## Plain-English summary

The mockup-to-WordPress converter (`convert.py`) walks the mockup's HTML, decides which SGS block to emit for each section, and writes the WordPress block markup. The SGS framework has a SQLite database that already knows three things: which CSS property maps to which block attribute suffix (`property_suffixes`, 117 rows), which parent blocks contain which child blocks (`block_compositions`, 37 rows), and what each block's attribute schema looks like (`block_attributes`, 1755 rows).

The converter reads some of this data but not all of it, and not consistently across its branches. Three visible failures (hero CTAs ship empty, brand-strip ships as a `<section>` instead of a `<blockquote>`, visual styling attributes silently dropped) are not three separate bugs — they are the same wiring gap surfacing in three places.

Wave 2 wires the missing reads:

1. **One-line FR1 consistency add** so registered SGS blocks (hero, trust-bar) consume their per-section CSS the same way unregistered containers already do.
2. **New `composition_children_for()` DB reader** that queries `block_compositions` and replaces the hardcoded `INNER_BLOCK_PATTERNS` dict, so every composite block emits InnerBlocks based on the DB's parent-child graph rather than a per-block override list.
3. **Visual-slot extension to the CSS lift** so visual / structural slot types (backgroundImage, overlayColour, minHeight, ctaPrimaryColour, alignment) populate from the mockup CSS via the same `property_suffixes` table that already handles typed text attrs.

When all three land, the three visible symptoms dissolve together because the universal-extraction primitive does the work instead of per-block patches.

---

## Mandatory references

- `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §15 (Wave 2 reshape)
- `.claude/parking.md` — `P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP`, `P-BLOCK-COMPOSITIONS-READ-PATH`, `P-FR1-VARIATION-BUF-CONSISTENCY`
- `.claude/decisions.md` D26 (Wave 2 reshape decision, 2026-05-21)
- `.claude/cloning-pipeline-flow.md` 2026-05-21 section
- Binding methodology rules — blub.db rows 254, 255, 256, 272, 276 (all five fire in this plan)

---

## Named change points

### Change 1 — FR1 fast path appends to `variation_buf`

| Item | Value |
|---|---|
| File | `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` |
| Line | `3678` (immediately after the `_lift_root_supports_to_style(...)` call inside the FR1 branch at `walk()`) |
| Scope | Universal — applies to every registered SGS block (hero, trust-bar, and any future block that hits FR1) |

**Current behaviour:** FR1 fast path lifts the subtree into typed attrs via `lift_subtree_into_block_attrs()`, then emits the WP block markup and returns. It never appends the merged CSS for the section's classes to the per-section `variation_buf`. Result: every block hitting FR1 ships with `variation_css_rules = 0` even when matching CSS rules exist in `_section_css`. This is the bypass that left hero + trust-bar at zero in the Wave 1 G2 measurements while five non-FR1 sections doubled.

**Wiring behaviour:** after line 3678 add:

```python
decls = _collect_css_for_classes(classes, css_rules)
if decls:
    variation_buf.append(decls)
```

This is the same pattern the `pass_through`, `top_level_container`, and `sgs/container` essence-match branches already use (visible at lines 4082–4084, 4097–4099, 4110–4112). Three branches share the pattern, FR1 is the outlier — the fix makes FR1 consistent.

**Why one line, not a refactor:** `_collect_css_for_classes()` is already defined (line 4121); `variation_buf` is already in scope inside `walk()`; `classes` and `css_rules` are already bound at this point in the function. No new helper, no new state, no signature change. Pure consistency.

---

### Change 2 — Extend `INNER_BLOCK_PATTERNS` for composite blocks (REDESIGNED 2026-05-22 post-council)

| Item | Value |
|---|---|
| File | `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` |
| Site | `INNER_BLOCK_PATTERNS` dict at line 1303 |
| Caller (unchanged) | Lines 3684, 3756, 3811 — three FR1 / parent / standalone branches already read this dict |
| Scope | Add entries for hero (primary target — G1), plus card-grid and testimonial-slider |

**Why this replaces the original `block_compositions` design:** Stage 5 council found that `block_compositions` is a recognition-side pattern blueprint catalogue (37 rows of `composition_name` + `block_slugs` JSON arrays for known compositions like "About — Image Left", "Footer — Indus Foods"). It is NOT a parent-child runtime emit graph. The Spec 16 §15 conjecture that cv2 should read `block_compositions` for parent-child relations was wrong about the table's role.

The actual runtime emit source for inner blocks is `INNER_BLOCK_PATTERNS` — a hardcoded dict in convert.py with exactly ONE entry today (`sgs/feature-grid` → `sgs/info-box`). When hero ships self-closing (G1's visible symptom — empty CTAs on the live page), it's because hero has no entry in this dict. The fix is to add the entry, not to wire a new DB read.

**Wiring behaviour:** add an entry like:

```python
INNER_BLOCK_PATTERNS["sgs/hero"] = {
    "child_class": "sgs-hero__cta",
    "inner_block_slug": "sgs/button",
    "lift_fields": {
        "label": "a, button",
        "url":   "a[href]@href",
    },
    # Optional: lift modifier class to variant attribute
    "modifier_to_attr": {"primary": "variantStyle=primary", "secondary": "variantStyle=secondary"},
}
```

Similar entries land for `sgs/card-grid` (children = `.sgs-card` → `sgs/card`) and `sgs/testimonial-slider` (children = `.sgs-testimonial` → `sgs/testimonial`). Implementer reads the existing `_lift_inner_blocks` function (line 1351) to confirm the dict shape it accepts, plus the existing `sgs/feature-grid` entry as the canonical template.

**Future architecture (parked, NOT Wave 2):** lifting these hardcoded entries into block.json-derived data + populating uimax `patterns.equivalent_implementations` so the dict becomes generated rather than hand-maintained is a separate structural unlock. Tracked as a new parking item to write at session close.

**Why no DB read in Wave 2:** the recognition-side data (sgs-framework `patterns.blocks_used`, uimax `patterns.equivalent_implementations`) lists block sets per pattern but doesn't encode the slot-binding semantics (`which child class → which inner block → which attr lift selectors`) that `_lift_inner_blocks` needs. Authoring this semantic layer in code is honest; authoring it as DB rows would require a new write surface that doesn't exist yet.

---

### Change 3 — Visual-slot extraction via `property_suffixes`

| Item | Value |
|---|---|
| Primary site | `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` — `lift_subtree_into_block_attrs()` (line 3216) and `_collect_css_decls_for_element()` (line 2772) |
| Secondary site | Stage 3 slot scaffold in `sgs-clone-orchestrator.py:stage_3_slot_list()` (line 1080) — no code change, but the slots it emits must be readable downstream |
| Scope | Visual / structural slot roles only — `text-content` slots already work |

**Current behaviour:** `_collect_css_decls_for_element()` (line 2772) collects every CSS declaration matching a node's classes, then `lift_subtree_into_block_attrs()` reads those declarations and writes typed attrs. It correctly handles text-content roles (`headline`, `subheading`, `bodyText`) and number-CSS roles (`paddingTop`, `marginBottom`, `borderRadius`). The gap surfaces on attribute roles `visual`, `layout`, `motion`, and `spacing` where the CSS property is something like `background-image`, `min-height`, `align-items`, or `transform` — `property_suffixes` has rows for these but the lift path's `_kind_for()` filter (db_lookup.py:398–414) returns a kind for them only when the role is explicitly in the lifted set. The result is that visual slots tagged in the Stage 3 scaffold come back empty in `extract.extracted_attributes`, surfacing in `leftover-buckets.json` as `extraction_failed` with `source: "stage_3_slot_list"`.

**Wiring behaviour — two sub-steps:**

**3a.** In `db_lookup.py:_kind_for()` (line 398), add `visual`, `motion`, and `spacing` roles to the lifted set. Specifically, the existing branch already covers `layout`, `typography`, `visual`, `spacing`, `shadow`, `motion`, `number-css-px` for the `number_px` kind — but per the audit there are visual-role rows in `property_suffixes` returning kind=None because the role column is something else (e.g. `image`, `position`). Implementer must enumerate the actual roles in `property_suffixes` via `python ~/.claude/hooks/wp-blocks.py dump` and extend `_kind_for()` for any role currently returning None whose suffix names a visual/structural concept.

**3b.** In `lift_subtree_into_block_attrs()` (around line 3216), ensure that for every entry `_kind_for()` returns a non-None kind, the lift path tries to populate the corresponding suffix on the target block — gated by `db.block_supports(target, suffix)` so an attribute is only lifted if the target block actually declares it.

**Schema enumeration step (binding rule blub.db 272):** before any code change, implementer runs the schema dump and identifies (a) every role value present in `property_suffixes` that currently returns `None` from `_kind_for()`, (b) every such row whose suffix corresponds to a visual / structural property, (c) the target block's `block_supports` for the relevant suffix. The result is a small inclusion table (probably 4–8 new role→kind mappings) — the actual code change is small even though the data discovery is rigorous.

---

### Change 4 — Preserve mockup class names on emitted blocks

| Item | Value |
|---|---|
| Site | `convert.py` — every emit branch that already lifts wrapper attrs |
| Mechanism | `wrapper_attrs["additionalClasses"]` (or `className` where the block declares native classes support) |

**Current behaviour:** when the walker emits `wp:sgs/hero` from a `<section class="sgs-hero sgs-hero--featured">`, the modifier class (`sgs-hero--featured`) is dropped. The variation CSS (when scoped to `.page-id-N .sgs-hero--featured`) then matches nothing on the rendered page because the rendered block doesn't carry the modifier class.

**Wiring behaviour:** every emit branch that constructs `wrapper_attrs` (lift_attrs_for_block at line 881 is the canonical entry) should preserve modifier classes — those starting with the block's BEM root (e.g. `sgs-hero--*`) plus any auxiliary `sgs-*` classes that aren't recognised as separate blocks. The implementer must extend `lift_attrs_for_block` to populate `additionalClasses` from the source `classes` list, filtered to exclude (a) the primary BEM class already encoded in the block target, (b) `sgs-*` classes that resolve to separate registered blocks (those become nested children, not modifiers).

This change is the structural complement to Change 1: Change 1 makes the CSS visible; Change 4 ensures the CSS selectors still match the emitted markup.

---

## Baseline measurement plan (Stage 5 prep for /qc-council)

**Mandatory pre-fix evidence to gather BEFORE any subagent dispatch (binding rules blub.db 254 + 256 + 272):**

1. **Schema dump** — `python ~/.claude/hooks/wp-blocks.py dump > pipeline-state/wave-2-baseline/schema-2026-05-22.txt`. Quote the actual column names for `block_compositions` and the actual role values in `property_suffixes`. Any "missing column / missing table" claim made in the implementer brief MUST cite a line in this file.

2. **Latest leftover-buckets snapshot** — read `pipeline-state/<latest>/leftover-buckets.json` and record the four metrics that define success:
   - `hero` section: count of `extraction_failed` items with `source = "stage_3_slot_list"` (current baseline: 142)
   - `hero` section: `variation_css_rules` count from the per-section results (current baseline: 0)
   - `brand` section: pixel-diff percentage at 1440px (current baseline: 43.7%)
   - **Coverage check** (Spec 16 goal-shaped post-condition): pick three random CSS declarations from the mockup's hero section; for each, document whether it currently lands as (a) a theme.json token via cascade, (b) a block attribute on the emitted markup, (c) an inline style, or (d) silently dropped. The post-fix expectation is that every declaration falls in (a)–(c), with (d) at zero.

3. **Per-section cropped pixel-diff** — `python scripts/pixel-diff.py --selector .sgs-hero` and `--selector .sgs-brand` and `--selector .sgs-trust-bar` at 375 / 768 / 1440. Record current values for all three sections × three viewports as the baseline matrix.

4. **WP_DEBUG_DISPLAY check** — confirm `wp-config.php` has `WP_DEBUG_DISPLAY = false` on the staging surface so debug notices don't contaminate the pixel-diff (binding rule + 2026-05-18 lesson).

5. **Run the latest pipeline with `--converter-v2`** (REQUIRED flag — binding rule from 2026-05-18 lesson) to ensure the baseline reflects the cv2 path, not the legacy extract.

All baseline values save to `pipeline-state/wave-2-baseline/` so Task 2 (`/qc-council` Stage 5) has the empirical pre-state to compare against the predicted post-state.

---

## Predicted post-fix values

| Metric | Baseline | Predicted | Confidence | Rationale |
|---|---|---|---|---|
| Hero `stage_3_slot_list` failures | 142 | **< 30** | high | Most hero slot failures are visual/structural roles (backgroundImage, overlayColour, minHeight, ctaPrimaryColour). Change 3 wires these to `property_suffixes`; Change 2 ensures CTAs emit as InnerBlocks so their slot values flow. The remaining < 30 is real attribute gaps (D3 candidates) that need new block.json attrs, not wiring. |
| Hero `variation_css_rules` | 0 | **≥ 8** | high | Change 1 (one-line FR1 append) makes the FR1 fast path append CSS to `variation_buf` like every other branch. The hero section's CSS in `_section_css` has 8+ rules targeting `.sgs-hero*` classes (verified during Wave 1 measurement). Direct, mechanical change. |
| Brand pixel-diff at 1440 | 43.7% | **< 20%** | medium | Brand's dominant gap is `<blockquote>` vs `<section>` (Change 4 territory — preserve mockup tag/class info) + visual styling (Change 3). The < 20% prediction assumes Change 4 fixes the tag mismatch (~15pp gain) and Change 3 lifts the missing visual attrs (~10pp). Medium confidence because the brand section has more bespoke styling than hero. |
| Coverage check | "3 of 3 mockup decls land somewhere" | **3 of 3 land** (with attribution breakdown) | medium | Spec 16 goal-shaped post-condition. Every CSS declaration in the mockup either matches a theme.json token (correct elision via cascade) OR lands as a block attribute / inline style. Medium confidence because some declarations may need NEW block attrs (D3 candidates) rather than mapping to existing ones — those legitimately stay as D3, not failures. |

**Falsification criterion (Task 2 Stage 5 gate):** if the baseline measurement in step 1 above already shows hero variation_css_rules ≥ 8 OR hero stage_3 failures < 30 without the fix applied, the diagnosis is wrong and Task 1 returns to design. Task 3 implementer dispatch is blocked until Task 2 confirms the predicted delta is real.

---

## Dependencies + ordering

- **Change 1** is independent — can ship first as a one-line follow-up to Wave 1 (already parked as `P-FR1-VARIATION-BUF-CONSISTENCY`). Lands the hero `variation_css_rules` ≥ 8 metric on its own.
- **Change 2** depends on the schema-enumeration dump completing. The new DB function lands before the caller-side wiring switch.
- **Change 3** depends on the schema dump (same dump satisfies both 2 and 3).
- **Change 4** is independent of 2 and 3; can land alongside 1.
- All four together produce the joint metric movement. Splitting them gives partial movement and risks misattribution of which change moved which metric.

**Recommendation:** ship all four in one commit OR a tight sequence of commits on a single branch, with `/qc-inline` + per-section pixel-diff between each commit so attribution stays clean. The `/qc-council` Stage 5 gate (Task 2) validates the design BEFORE the implementer dispatches; Stage 7 + Stage 8 (in Task 3) validate post-fix.

---

## Methodology guardrails (do not skip — re-violation = recurring correction)

1. Schema dump precedes ANY "missing column / missing table" claim (blub.db 272).
2. Read `leftover-buckets.json` BEFORE conjecturing about converter quality (blub.db 254).
3. Multi-model `/qc` panel BEFORE every commit touching converter / pipeline (blub.db 255).
4. Per-section cropped pixel-diff via `--selector .sgs-{section}`, not full-page (blub.db 256).
5. `/qc-council` empirical pre/post measurement gate BEFORE subagent dispatch (blub.db 276).
6. Token-snap strict exact-match only (blub.db row 207, 2026-05-20 lesson 1).
7. `--converter-v2` flag REQUIRED on production orchestrator runs.
8. WP_DEBUG_DISPLAY must stay false on staging.
9. No `git stash` / `reset --hard` / `restore` / `checkout --` / `clean -f` in subagents.
10. No `Co-Authored-By:` in commits.
11. OUTCOME vs COMPLETION — code shipped is not the same as outcome achieved. If the pixel-diff metric doesn't move, do NOT redefine "done"; re-plan or escalate.

---

## What this plan does NOT cover

- **F5 D1 media-field flow** (responsive variants → `*Mobile` / `*Tablet` / `*Desktop` attrs) — separate, runs as Task 4 after Wave 2 wiring lands. Hero 375 mobile +13.3pt regression traces here.
- **Per-block legacy patches** — explicitly out. Spec 16 §15 + binding rule "universal-extraction-no-per-block-legacy" forbid resurrecting per-block override paths. Every fix in this plan is universal.
- **Promotion path** — operator-promotion (`P2.ii`) closes the last 5–10% of pixel-diff after structural fixes land. Not Wave 2 territory.
- **Docs update** — `cloning-pipeline-flow.md` line 354 still says `block_compositions` is read as a fallback. That doc correction is a follow-up to Change 2 landing (parked as `P-CLONING-PIPELINE-FLOW-DOC-DRIFT`).

---

## Handoff to Task 2 (/qc-council Stage 5)

This plan is the proposal set for `/qc-council`. Stage 1 ground-truth load reads (a) this file, (b) `pipeline-state/<latest>/leftover-buckets.json`, (c) `pipeline-state/<latest>/extract.json`, (d) `pipeline-state/<latest>/trace.jsonl`. Stage 5 runs the baseline measurement plan above and validates that the predicted delta is real BEFORE Task 3 (Sonnet implementer) is dispatched. Council verdict expected: `validated-shipped` OR `falsified` (returns to this plan with disproof).