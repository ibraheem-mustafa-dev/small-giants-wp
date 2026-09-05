---
doc_type: plan
title: Colour-conformance — shape-batched remediation via a unified survey+fix triad
created: 2026-09-05
governs: plugins/sgs-blocks/scripts/colour-codemod/{survey,fix}.js
supersedes: .claude/prompts/2026-09-04-colour-conformance-remaining-8-hard-rows.md (deleted — already declared "consumed/historical" in LEDGER.md, but was still lingering on disk)
---

# Context

**Problem:** this session opened from a copy of the "8 genuinely hard rows" dispatch prompt. Two read-only investigation agents verified every file:line citation in it before any code was touched (per this project's "prove the cause before fix" rule). Result: the prompt was stale, not wrong when written — `LEDGER.md` (lines 136-138) already recorded this exact prompt as "FULLY CLOSED — D964 ... consumed/historical, do not re-dispatch from it", but the file `.claude/prompts/2026-09-04-colour-conformance-remaining-8-hard-rows.md` itself had never actually been deleted, so it was still available to hand to a fresh session. Deleted in this session (git-tracked, clean removal).

**Effect:** of the prompt's 8 "hard" rows, only 2 are still genuinely open — matching what `LEDGER.md`'s own "Still open" list (lines 306-317) already said: `option-picker.pillBgColour`/`pillBgColourHover`, plus the `mega-panel`/`social-icons`/`form.progressBarColour`/`product-card` title-desc-price/`tabs`/`post-grid` loop rows it names as never covered by the 7-row closure.

**What Bean asked for (2026-09-05), and why each matters:**
1. **Reuse `sgs/button`'s pattern for `option-picker`'s pill background** — verified: button's `colourBackgroundGradient` mechanism was already generalised into a shared helper, `sgs_custom_property_gradient_decls()` (`includes/helpers-tokens.php:953`), already proven on 6 other blocks (brand-strip, post-grid, social-icons, form, gallery, before-after). This is a genuine drop-in, not new design — `option-picker`'s `pillBgColour`/`pillBgColourHover` already emit the exact `--sgs-op-bg`/`--sgs-op-bg-hover` custom-property shape the helper expects (verified live at `option-picker/render.php:305,311`).
2. **Flag the staleness back into the living docs** — done (this doc + the deletion above).
3. **Proceed.**
4. **Re-run the scanner for full scope, batch by shape, not block-by-block** — the project's own standing rule (`CLAUDE.md`: "MORE THAN 3 BLOCKS? BUILD THE DETECTOR FIRST"; the survey→fix→check triad, D542). `survey.js` re-run: **265 colour rows, 129 CONFORMANT, 135 non-conformant.** `fix.js --fix` (its current Tier-A, hover-only sub-scope) also run: **1 auto-fixable, 52 refused — every refusal carries a named, specific reason.** Grouping those 52 named reasons by shape (not by block) surfaces real batching opportunities the per-block framing hides. **Bean then directed inserting a task to make `survey.js` itself do `fix.js`'s job too** (find + categorise + fix as one tool), rather than hand-editing each bucket as a one-off — that is Phase 1 below.

# Shape buckets (from the live `fix.js --fix` run, 52 refused rows — a partial sample; Phase 1 widens this to all 135)

| Bucket | Count | Shape | Verdict |
|---|---:|---|---|
| A — `no-explicit-normal-state` | 13 | Hover-only colour row, no sibling normal-state attr — "likely paired with native WP colour support; synthesising a normal state would misrepresent the design" | **Not a bug.** Correct refusal. Reclassify as a permanent EXEMPT verdict so it stops appearing as non-conformant every census run. |
| B — `standalone-DesignTokenPicker-row-shape-not-supported` | 5 | `modal.triggerColour/triggerBackground/modalBackground`, `post-grid.excerptColour/readMoreColour` — a raw `<DesignTokenPicker>` row, not routed through `SgsColourPanel`/`fillRow`/`textRow` | Real gap in the **codemod's row-shape support**, not per-block. One parser extension unlocks all 5. |
| C — `no-sgs_resolve_text_colour_or_gradient-call-for-attr` | 7 | `post-grid.titleColour/metaColour/categoryBadgeColour`, `product-card.titleColour/descColour/priceColour/priceNoteColour` | **Mechanical batch.** Same shape as `post-grid.textColourHover`'s own already-working sibling (`render.php:695-716`). Wire the standard resolve → decl → fallback trio per row. |
| D — `gradient-no-attribute-assignment-found` | 5 | `nav-menu.submenuBg`, `post-grid.categoryBadgeBgColour`, `product-card.tagBackgroundColour/ctaColourBackground`, `tabs.tabBgColour/panelBgColour` | **Investigate 1 instance first** — could be a real gap or a codemod parser miss on indirect assignment. Don't batch-fix blind. |
| E — `fill-gradient-value-not-directly-embedded-in-a-background-color-declaration` | 4 | `mega-panel.panelBg/iconBackground/accentBackgroundImage`, `option-picker.pillBgColour` | **Split.** `option-picker.pillBgColour` is the confirmed drop-in for `sgs_custom_property_gradient_decls()` — do this one now. `mega-panel`'s 3 rows use a different slug-derivation shape (`render.php:85-230`) — read before touching, do not assume the same helper applies. |
| F — `gradient-path-deferred` (text mechanism) | 2 | `product-card.pickerLabelColour/pickerPillTextColour` — background-clip:text is a structurally different helper pair | Already named in code as its own future scope — leave alone this pass. |
| Not yet detail-surveyed | ~83 | 42 `AUTOFIXABLE:wire-state-emitter` rows (a tier `fix.js` doesn't attempt yet) + ~30 rows in `helper-at-existing-selector`/`REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found` outside today's hover-only sub-scope run | `fix.js`'s own header says "TIER A ONLY". Phase 1 widens classification to cover every row before more code is written. |

# Plan

### Phase 0 — Fix the staleness that caused this session to start from dead information (done)
- Deleted `.claude/prompts/2026-09-04-colour-conformance-remaining-8-hard-rows.md` — `LEDGER.md` already declared it consumed/historical; it just hadn't actually been removed.
- This doc is the pointer `LEDGER.md`'s COLOUR TRACK section should carry forward for the new shape-batch work (LEDGER's own "Still open" list at lines 306-317 already matches this plan's buckets — no correction needed there, only a forward pointer).

### Phase 1 — Make `survey.js` do the FULL triad itself: find + categorise + fix (Bean-directed insert)
Today the census (`survey.js`) and the fixer (`fix.js`) are two separate tools, and `fix.js` only ever attempted a narrow "Tier A, hover-only" slice — which is why a "60% autofixable" census produced 1 real fix and 52 named refusals when actually run. Rather than hand-editing each bucket as a one-off, extend `survey.js` itself into the single tool that finds every row, classifies it by shape (widened to cover all 135 rows, not just the hover-only sub-scope), and — for any shape with a PROVEN mechanical fix — applies it in the same run.

- Widen the row loop to cover all 135 non-conformant rows (removes the "TIER A ONLY" early-exit that today hides ~83 rows from any shape classification at all).
- Fold `fix.js`'s existing apply-logic in as `survey.js --fix [--apply]` (absorb, don't duplicate — `fix.js` becomes a thin deprecated wrapper or is retired once parity is confirmed).
- Register one fixer function per PROVEN shape, gated the same "refuse rather than guess" way `fix.js` already refuses:
  - **Bucket C shape** → apply `sgs_resolve_text_colour_or_gradient()` → `sgs_text_colour_decl()` → `sgs_text_colour_gradient_fallback_rule()`, copying the live pattern at `post-grid/render.php:695-716`. Covers post-grid ×3 + product-card ×4 in one pass.
  - **Bucket E shape, custom-property variant** (a row already emitting a bare `--sgs-x-*` custom property via `sgs_colour_value()`, no gradient sibling) → apply `sgs_custom_property_gradient_decls()`, add the matching `background-image:var(--x-gradient,none)` stylesheet line. Covers `option-picker.pillBgColour`/`pillBgColourHover` now; any other row the widened census finds with the identical shape gets it for free.
  - **Bucket A shape** → reclassify as `EXEMPT:hover-only-native-paired` — a categorisation fix, not a code fix, but lives in the same pass so the backlog count is honest before anything else runs.
- Anything that does NOT match a registered shape stays REFUSED with its named reason (Bucket B, Bucket D pending root-cause, Bucket F, mega-panel's 3 non-matching rows) — refuse rather than guess still applies.
- Run order: `--survey` (full 135-row classification) → `--fix` (dry run, review diff) → `--fix --apply` (write) → `--survey` again (conformant count must rise by exactly the rows fixed).

### Phase 2 — Investigate before extending (Bucket D)
Root-cause ONE row (`tabs.tabBgColour`, smallest block) — real gap or codemod parser miss on indirect assignment? Only register it as a Phase-1-style shape once confirmed across its other 4 rows.

### Phase 3 — Extend row-shape recognition (Bucket B)
Add DesignTokenPicker-row recognition to the unified parser so `modal`'s 3 rows + `post-grid`'s 2 rows become classifiable and fixable in the same pass.

### Phase 4 — `mega-panel`'s 3 Bucket-E rows (read first)
Uses a slug-derivation shape (`accent-image`/`soft-image`, `render.php:85-230`), not the bare-custom-property shape Phase 1 targets. Read the mechanism before deciding whether it earns its own registered shape or stays a manual one-off.

### Left alone this pass
- Bucket F — named as its own future scope in existing code comments.
- The remainder of the ~83 rows Phase 1's widened classification surfaces but that don't match a registered shape — stay REFUSED with a named reason.

# Verification
- After every phase: `node survey.js` — conformant count must only go up, never down.
- After Phase 1/3/4 code changes: `npm run gate:fast` (89 gates) + `node scripts/check-text-gradient-companion.js --check` (0 findings) + `node scripts/check-element-manifest-conformance.js --check`.
- Path-scoped commits only, branch re-checked immediately before each commit.
- Deploy only after coordinating via `ListAgents` — this tree runs concurrent sessions.
