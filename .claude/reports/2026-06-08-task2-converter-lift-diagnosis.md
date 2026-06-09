---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Task 2 (converter Method-2 lift) diagnosis — from a FRESH re-clone, current honest fidelity"
created: 2026-06-08
status: DIAGNOSIS — grounded in a fresh live re-clone (run mamas-munches-homepage-2026-06-08-004717). Design-gate pending before any build (Rule 7).
evidence:
  - "FRESH live re-clone run pipeline-state/mamas-munches-homepage-2026-06-08-004717 (deploy page:8 + Playwright 375/768/1440 + parity2)"
  - "parity2-report-1440.json by_node css_dropped/layout_dropped tallies"
  - "property_suffixes + block_attributes (sgs/container) in ~/.claude/skills/sgs-wp-engine/sgs-framework.db"
  - "fresh extract.json (the emit) vs the stale 2026-06-07 captures"
---

# Task 2 diagnosis — converter Method-2 lift (the remaining real fidelity lever)

## 0. The stale-evidence correction (load-bearing)

The next-session-prompt's Task 1/2 framing rested on the **2026-06-07 parity2 captures**, which were captured from a **stale deployed page 8** — NOT the current converter. Re-running the converter locally + a fresh live re-clone showed:

- The 2026-06-07 `sgs-testimonial--Array` class and "brand attribution entirely missing" were **stale deploy artefacts**. The CURRENT converter emits `sgs/testimonial`/`sgs/testimonial-slider`/`sgs/quote` with the quote text present, and the brand headline AND attribution are both in the emit. No `--Array` anywhere in the fresh emit.
- Therefore Task 1 (parity2 containment fallback) was correctly abandoned (D190) — the testimonial/brand 0%s are NOT a gauge mis-pairing, and not the stale failures either.

**Method rule reinforced:** always re-clone to refresh the emit/captures before diagnosing; a parity2 capture file's date ≠ the deploy date of what it captured.

## 1. Current honest fidelity (fresh run, 1440px)

- **content 96.3%** (text reaches the clone — essentially solved)
- **full 45.37%** (content + CSS within tolerance — the gap is CSS/styling transfer, not content)
- Worst sections (all **content 100%** but low layout/css → DROPPED on CSS, not content):
  brand 0% · products 0% · testimonial-slider 0% · button 0% · announcement-bar 0% · gift-section 23% · testimonial 25%

## 2. The single root-cause class: incomplete CSS-transfer RECEIVING SURFACE

The leftover-buckets are dominated by 707 "no value extracted" entries = **unused target slots** (denominator noise, not gaps — per `feedback_fidelity_denominator_is_the_source`). The REAL signal is the parity2 per-node `css_dropped`. In the 0% sections the dropped properties cluster into box-styling families:

| Family | Props dropped (count, 0% sections) |
|---|---|
| Flex/layout alignment | alignItems 25, display 24, justifyContent 17, flexWrap 8, flexDirection 5, gridTemplate{Columns,Rows} 5 |
| Padding | paddingTop/Bottom 22, paddingLeft/Right 20 |
| Border-radius | all 4 corners + borderRadius 22 |
| Border | borderColor 19, borderStyle 15 |
| Box | minHeight 19, backgroundColor 18, marginBottom 10, gap family 10 |

`property_suffixes` HAS a CSS-property→suffix map row for **every** one of these. The gap is the **receiving surface** — the editable attrs these values land on are missing or not rendered, across three node kinds:

1. **`sgs/container` (section-root) missing custom receiving attrs:** `borderRadius`, `borderColor`, `borderStyle` are absent entirely (no native support, no custom attr) → these values have nowhere to land. (padding/background may route via native `supports.spacing`/`supports.color` → verify the lift targets `style.*` and render emits.)
2. **Inner content blocks (Axis 4):** `sgs-brand__content/__headline/__quote/__attribution/__image` drop FLEX/GAP/etc — the inner blocks (text/heading/image) lack the receiving attrs the composite-mirror should give them.
3. **`sgs/button`:** drops FLEX+RADIUS+BORDER+PAD+BG+MINH — a non-container block missing the wrapper-CSS receiving attrs.

Note: `alignItems`/`display`/`justifyContent` drop on inner/button nodes even though `sgs/container` HAS `verticalAlign`/`layout`/`justifyContent` — confirming the gap is the inner/button surface (Axis 4 + button), not the container for those props.

## 3. The fix-shape (HYPOTHESIS — to be design-gated, R-22-7 / Rule 7)

Complete the universal §FR-22-21 receiving surface — NOT per-section hacks, NOT bespoke composites:

- **A. `sgs/container`:** add the 3 missing custom attrs (`borderRadius` incl. per-corner, `borderColor`, `borderStyle`) with inspector controls + render; OR route via native `supports.border` if that's the canonical channel. Verify padding/background lift lands + renders.
- **B. Composite-mirror to inner/composite blocks (Axis 4):** propagate the container's wrapper-CSS receiving attrs to the inner content blocks + buttons per the KIND-scoped mirror (Spec 29 / WS-4 recipe), so `.sgs-X__content` etc. can receive flex/gap/padding/border.
- **C. Verify the lift fires + renders** for the now-present attrs (the value-corruption + universal-lift fixes from 2026-06-07 are in; confirm the new attrs are written by `_lift_wrapper_css_to_container_attrs` and emitted by render).

**Acceptance:** each family's drop count falls in the fresh parity2; brand/products/button/testimonial-slider rise off 0%; verified from the EMIT + live DOM (R-22-11); no section regresses; full% rises.

## 3b. CORRECTION (deeper trace + Bean's steer + live-DOM check) — the 0%s are largely GAUGE MIS-PAIRS, not converter gaps

Bean corrected §2/§3 (rightly): `sgs/container` ALREADY has the full native receiving surface via `supports.border`/`supports.spacing`/`supports.color` (DB stores it as `__experimentalBorder` — matches `_root_lift_rules`). My "missing 3 attrs / composite-mirror to inner blocks" framing was the R-22-8 trap + a wrong model (the `sgs-brand__*` classes are STANDALONE blocks inside an `sgs/container`, not composite inner-blocks: `__headline`→sgs/heading, `__image`→sgs/media, `__quote`→sgs/quote(array of sgs/text), `__content`→the container's inner layer).

Tracing where the CSS drops (systematic-debugging on the artefacts) then showed:

1. **The brand `sgs/container` emit is CORRECT.** `extract.json` brand markup carries `style.spacing.padding {64,20,64,20}`, `style.spacing.margin`, `style.color.background surface-alt`, `layout:grid`, `gridTemplateColumns`, `gap`, `verticalAlign`, responsive `*Tablet`. The `_lift_root_supports_to_style` native lift worked. The `no_matching_container_attr` traces for padding/margin/background are **redundant noise** from the custom-attr lift (`_lift_wrapper_css_to_container_attrs`) running AFTER the native lift already handled them.
2. **parity2 mis-pairs the 0%-section nodes to wrong clone elements** (fresh live capture, 1440, `clone_match` + computed CSS):
   - `sgs-brand` (section root) → `...>a[0]` (a CTA **link**); measured CSS = button styling (display inline-flex, padding 14px, minHeight 48px) — NOT the brand container's real 64px/cream/grid.
   - `sgs-button` (×5) → `...>span[0]` (the **text span inside the button**) — so button padding/border/radius/background compare against a bare span → all drop.
   - `sgs-brand__image` → `...>section[0]` (whole section); `__headline/__quote/__attribution` → wrong `div[0]`s.
   - Mechanism: the LCA/anchor collapses onto the single anchored descendant (e.g. the button's label text lives in a `<span>`; the brand container's only clean anchored descendant is the CTA link), so the block/container node maps to that leaf/link.

**Conclusion (trust the emit, fix the instrument):** the converter output for these sections is substantially correct; their 0% scores are a **parity2 node-pairing defect for block/container nodes** (button→inner-span, brand→link/section). This is a BROADER gauge problem than Task 1's narrow leaf-text containment (which was correctly abandoned) — it's the anchor/LCA/fallback pairing for resolved BLOCK nodes. Until the ruler pairs block nodes to their real clone element, the per-section fidelity numbers cannot prioritise converter work — several "0%" sections are already correctly converted.

**Genuinely real gaps that remain** (separate from the gauge — verified from the emit, NOT parity2):

- **R1 (CONFIRMED, gauge-independent) — variant-kind modifiers vanish when the block has no `variant_attr`.** The draft buttons style via scoped variant classes (`.sgs-button--primary { background; border-radius; ... }`). In `convert.py`'s modifier-carry path (~line 3083) `modifier_kind('primary')`/`('secondary')` = `variant`, so they are SKIPPED ("handled elsewhere" = the variant_attr path). But `variant_attr_for('sgs/button')` is **None** (and sgs/button has no variant CSS, no `supports.border`, no `supports.sgs.variants`). So the modifier is dropped, the emit has `variant=NONE className=NONE`, and the harvested `.sgs-button--primary {…}` rule is orphaned → buttons render with NO fill/border/radius. Verified: the button emit carries padding/font/minHeight/text-colour but no `style.color.background` and no `style.border.radius`. (`ghost` = `modifier_kind` None, a separate carry path.)
  - **Fix-shape (universal, R-22-9, HYPOTHESIS → design-gate per Rule 7):** when a modifier is variant-kind BUT the resolved block has no `variant_attr`, fall back to carrying it on `className` (so the harvested scoped draft CSS matches) instead of skipping it. Small, single-branch converter change in the modifier-carry path. Verify from the emit (button className carries `sgs-button--primary`) + live DOM (button shows fill/radius) — NOT parity2 (it mis-pairs the button to its inner span).
- **R2 (NOT a real gap — verified redundant)** — the Desktop-responsive "drops" (`gap 60px`, `align-items center`, grid `1fr 1fr` at Desktop) are HARMLESS: the draft's Desktop values EQUAL its Tablet values, which ARE emitted (`gapTablet 60px`, `gridTemplateColumnsTablet 1fr 1fr`, base `verticalAlign center`); in the mobile-first min-width cascade the Tablet rule applies at Desktop. No `*Desktop` attr is needed. Dropping a redundant override changes nothing visually.
- **R3 (gauge-entangled)** — array-content blocks (testimonial) emit no clean text leaf; entangled with the parity2 pairing defect (§3b). Defer with the gauge.

**Net:** the one clean, real, gauge-independent converter gap is **R1 (button variant-modifier drop)**. R2 is a non-issue; R3 waits on the gauge.

## 4. Next step (REVISED)

Design-gate this fix-shape (`/adversarial-council` or `/qc-council` + Bean approval) BEFORE building (Rule 7 — converter is high-blast-radius). Then build via `/subagent-driven-development` on the UNIVERSAL mechanism, re-clone, verify pre/post on the fresh parity2.

Fresh run dir for all artefacts: `pipeline-state/mamas-munches-homepage-2026-06-08-004717/` (extract.json, trace.jsonl, convert-trace-b*.jsonl, parity2-report-{375,768,1440}.json, leftover-buckets.json).
