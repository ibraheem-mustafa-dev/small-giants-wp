---
doc_type: reference
project: small-giants-wp
title: "Container 4-layer fix programme — SDD execution prompt"
created: 2026-06-11
status: PROGRAMME COMPLETE 2026-06-11 (all 8 steps — 1, 7a, 2, 3, 4, 5, 6, 7b — shipped + live-verified on the canary; commits 12eccaeb, 61d95f41, cdc24a19, f4ac6432, 5dba7e88, bb926b07, 65a3536a, 2c4a8d0d on feat/spec30-wc-chassis). control-ux baseline EMPTY (zero tolerance). OUTSTANDING — (a) /sgs-update DB registration after merge to main; (b) R-22-13 Bean eye on the new 4-layer inspector; (c) converter re-clone to exploit the new layers (cloning thread Task 3).
inputs: full container audit (opus agent, 2026-06-11) + independent fact-check (sonnet agent — 9/10 confirmed, 1 correction). Both verbatim below in §Evidence.
---

# Container 4-layer fix programme (Bean-directed 2026-06-11)

> Invoke `/autopilot` + `/sgs-wp-engine`. Execute via `/subagent-driven-development`: ONE implementer subagent per step; after each step the MAIN thread runs `/qc-inline` (static verify + build + dead-control guard) and does NOT dispatch the next step until the current one passes. Rule 7 applies — this is the shared wrapper (29-block blast radius). Commit per step by explicit path (threads co-active). Build cmd: `cd plugins/sgs-blocks && npm run build` (prebuild runs `check-dead-controls.js`). Final acceptance = editor verification on the canary (sandybrown, creds `.claude/secrets/sandybrown.env`) + R-22-13 Bean eye.

## Why (the converter is blocked on this)

The converter's 4-layer routing (Bean's standard: L1 outer / L2 inner band / grid check / L4 grid items split uniform + per-area) has nowhere to land values because the container block + the shared wrapper-inserter have incomplete/inconsistent layer attributes and broken/missing editor controls. Audit confirmed all four of Bean's observations with file:line evidence (§Evidence).

## The steps

**EXECUTION ORDER (Bean re-cut 2026-06-11 — standard before construction):**
`Step 1 ✅ → Step 7a ✅ (commit 61d95f41, 2026-06-11 — TypographyControls on ResponsiveControl+UnitControl, attr shape unchanged; check-control-ux.js prebuild guard wired, 118 violations baselined across ~20 blocks, prove-it-fails passed both directions; canary editor verified: Font size renders structurally identical to Gap [switcher+unit, no range]; functional round-trip 22 → labelFontSize:22 + Unit:'px' confirmed live) → Step 2 → Step 3 → Step 4 → Step 5 → Step 6 → Step 7b (legacy burn-down: sweep the ~20 baselined blocks)`.
Rationale: Steps 2/3 ADD new controls — landing the canonical pattern + guard FIRST means they are built to the standard from day one and machine-validated, instead of built old-style and reworked. 7b (the legacy sweep) comes last so it never delays the converter-unblocking steps; the guard's baseline file holds the debt visibly until then.

### ✅ STEP 1 — freeInput on gridItemPadding (DONE this session, commit pending build)
`freeInput` added to the two `SpacingControl` call sites: `container/edit.js` (~655) + `container/components/ContainerWrapperControls.js` (~995). Kills the 'None/XXS-only' dropdown (root cause: preset mode builds options from truncated theme `spacing.spacingSizes`; freeInput renders number+unit like the gap control). Verify: build green + the control renders a UnitControl in the editor.

### ✅ STEP 2 — Wire the 16 dead responsive padding/margin controls [DONE 2026-06-11, commit cdc24a19 — shared `ResponsiveSpacingPanel` in all 3 KIND panels + edit.js; live-verified on canary: tablet 77px @768 + mobile 33px @≤599 computed; desktop tier = Dimensions help note (no duplicate); visual-diff report reports/visual-diff/container-2026-06-11.md]
**Facts:** `container/block.json:374-437` declares `padding{Top,Right,Bottom,Left}{Tablet,Mobile}` + `margin{...}{Tablet,Mobile}` (16 attrs, full 4-side). `class-sgs-container-wrapper.php:218-240` extracts + `:700-776` renders them (@media max-width:1023 / max-width:599). **NO editor control exists for any of them** (verified twice).
**Build:** add a "Responsive spacing" panel to `ContainerWrapperControls.js` — per-tier (Tablet/Mobile) 4-side padding + margin controls using `SpacingControl freeInput` per side (or a compact 4-side group), wrapped in the existing `ResponsiveControl` tier-switcher pattern (copy the gap control's mechanism). Then make `container/edit.js` render that shared panel too (do NOT duplicate it inline). Base padding/margin stay WP-native supports (untouched).
**Gate:** build green (dead-control guard now sees consumers — these attrs were always rendered, so no guard change needed); qc-inline: every one of the 16 attrs reachable in the editor; set a Tablet padding on the canary container and verify the @media rule paints at 768.

### ✅ STEP 3 — Layer-2 content band [DONE 2026-06-11, commit f4ac6432 — 17 attrs + __inner render + shared ContentBandPanel; live-verified 3 viewports (40/24/12px band padding; 800→600px width cap; bg). BONUS universal fix shipped in the same commit: inline-base-beats-@media cascade bug — esc_html() was breaking the band '>' selector; gap/grid-template/band bases now defer to the uid stylesheet when tiers exist; root padding/margin tiers now !important over WP-native inline base (probe-proven: 50px inline base vs 21px tablet tier — tier now wins). Every previously-silent responsive-tier loss in the wrapper is fixed.]
**Facts:** the `__inner` band (`class-sgs-container-wrapper.php:976-982`) emits ONLY `max-width` + `margin-inline:auto`. No band padding (0 sides), no band background, no responsive cap. ⚠ HC2 precedent (`ContainerWrapperControls.js:1106-1111`): a band-padding control was REMOVED in HC2 because nothing consumed it — so this step must land the WRAPPER RENDER + ATTRS + CONTROL together, never the control alone.
**Build:** new attrs `contentBandPadding{Top,Right,Bottom,Left}` (+`Tablet`,`Mobile` tiers, number) + `contentBandPaddingUnit` + `contentBandBackground` (+ optional `contentWidthTablet/Mobile` for the responsive cap); wrapper renders them on the `__inner` element (inline base + @media tiers, same mechanism as :700-776); shared panel in ContainerWrapperControls (gated to kinds that wrap the band); register via `/sgs-update` after merge.
**Gate:** qc-inline + canary: set band padding + bg, verify `.sgs-container__inner` computed styles at 3 viewports; dead-control guard green.

### ✅ STEP 4 — container/edit.js consumes the shared ContainerWrapperControls [DONE 2026-06-11, commit 5dba7e88 — edit.js 1375→276 lines; shared LayoutPanel/WidthPanel/BackgroundPanel/ShapeDividersPanel/GridItemDefaultsPanel exports; live inspector inventory verified on canary incl. grid-conditional controls; container-specific panels (min-height/HTML tag/Template mode/Shadow body) stay inline]
**Facts:** `container/edit.js` imports NOTHING from ContainerWrapperControls (verified) — it duplicates Layout/grid-item/width panels inline (~1358 lines). Two drifting copies of the same control logic.
**Build:** refactor container/edit.js to render the shared panels (LayoutPanel, GridItemDefaultsPanel, the new responsive-spacing + band panels) and delete the inline duplicates. Behaviour-identical refactor — diff the rendered inspector before/after.
**Gate:** qc-inline; editor screenshot diff of the container inspector (same controls present, none lost); build green.

### ✅ STEP 5 — Wire-or-remove the 3 dead flex attrs [DONE 2026-06-11, commit bb926b07 — 3 SelectControls in shared LayoutPanel (flex-gated); wrapper allowlists + block.json enums widened to the full CSS set (the old allowlist silently dropped row-reverse — caught live); computed row-reverse/space-between/nowrap verified on canary]
**Facts:** `flexWrap`/`flexDirection`/`justifyContent` exist (block.json:350-364), wrapper renders them (:297-312, :408-416 — flexWrap defaults to 'wrap' when empty), NO control anywhere.
**Build:** ADD controls (the consumer exists, so wiring is correct per the one-control-per-setting standard): a flex-options group in the shared LayoutPanel, visible when layout=flex.
**Gate:** qc-inline; set flexDirection=row-reverse on canary, verify computed style.

### ✅ STEP 6 — Layer-4-per-area standard [DONE 2026-06-11, commit 65a3536a — Spec 22 §FR-22-21.3 written; shared GridAreaPanel (generic <area>+Suffix, number+shared Unit) + gridAreas prop + 4-layer panel order; hero: gridAreas declared, contentBackground/mediaBackground, splitColumnRatio retired→gridTemplateColumns (deprecated.js v7), duplicate mediaBackgroundColour + bespoke contentPadding controls removed. THREE defects caught at the gate: hero TDZ (v7 spread V6_ATTRIBUTES before declaration → hero silently unregistered, core/missing), GridAreaPanel unit discard, render.php ''-default miss. Live-verified: editor 0 missing/invalid, per-area panels render in standard order, write round-trip number+unit; frontend hero intact (72px content padding paints). /sgs-update DB registration deferred to post-merge per this prompt. R-22-13 Bean eye on the new inspector still owed.]
**Facts:** no standardised per-area mechanism exists; hero's ad-hoc `contentPadding*`/`mediaPadding*` (full 4-side × 3-tier) + `splitColumnRatio*`/`splitGap*`/`mediaBackgroundColour` + a FULL image-area border/radius family (`imageBorderRadius*` ×24 — fact-check correction: media border EXISTS; the gap is the CONTENT column's background/border). The converter's GRID-PER-AREA router (`db.attr_for_area_property`, shipped c6337eac on feat/stage1-converter-core) already routes `<areaName>+<suffix>` universally.
**BEAN'S DECISIONS (locked 2026-06-11 — do not re-litigate):**
1. **Schema = flat `<areaName>+<Suffix>` attr families.** The shipped converter router targets them today; hero's padding families already conform (zero migration for those); number+Unit companion convention carries over. NO object/array attrs.
2. **Standard property set per named area = padding (4-side × 3-tier + Unit) + background.** Border/radius/shadow are OPT-IN per block, added only where a real need exists, same naming rule. (Hero's content column gains `contentBackground`; its media border family already exists as `image*` — leave, note the prefix drift in the DB.)
3. **`splitColumnRatio*` MIGRATES to `gridTemplateColumns*`** (full responsive tiers) with a `deprecated.js` shim mapping old content; `splitColumnRatio` retired. One name per capability — the converter's generic grid routing then just works.
4. **Area declaration = `supports.sgs.gridAreas: ["content","media"]` in block.json**; `/sgs-update` registers areas; the converter cross-checks draft `grid-template-areas` names against the declared list.
5. **Inspector UX (governs Step 4's refactor too): the 4-LAYER PANEL layout** — one collapsed plain-English panel per layer, in the standard's order: **Section (outer)** → **Inner band** → **Layout** (stack/flex/grid + grid controls) → **Grid items** (ALL-items uniform sub-section + one per-area sub-section per declared area). EVERY responsive control uses the gap-style device switcher; EVERY spacing input is freeInput number+unit. One shared component (ContainerWrapperControls) renders it for the container AND all 29 composites — no inline duplicates anywhere.
**Build:** spec the FR-22-21 per-area layer (the flat convention + gridAreas declaration) + implement on container + align hero (contentBackground; splitColumnRatio migration + deprecation; wire its per-area panel). Register everything via `/sgs-update`. Live-verify in the canary editor per the layout above + R-22-13 Bean eye on the new inspector.

### ✅ STEP 7 — Control-UX sweep [7a DONE commit 61d95f41; 7b DONE 2026-06-11 commit 2c4a8d0d — 100 baselined violations fixed across 16 blocks; control-ux-baseline.json now EMPTY (zero tolerance); guard hardened twice (shared-file exemption for ContainerWrapperControls; compliant attrMap-idiom exemption) with prove-it-fails re-passed after each change; editor smoke on canary: all reworked blocks registered, 0 core/missing, 0 invalid, sgs/text font-size renders switcher+integrated-unit. NOTE: two of the three sweep subagents overflowed mid-task ("Prompt is too long") leaving partial work — recovered by empirical re-baseline (guard with emptied baseline) + one tight wrap-only agent + 2 manual fixes, never by re-running blind.]
**The two anti-patterns (Bean observed in the editor):** (A) responsive values as ~3 stacked separate inputs (or attrs with NO responsive UI) instead of the gap-style device-icon switcher; (B) the unit as a separate bulky SelectControl beside the input (overlapping/cluttered) instead of the gap-style integrated unit-inside-the-input (WP `UnitControl` — unit label on the input's right edge, click to reveal).
**High-leverage facts (scanned 2026-06-11):** (B)'s main source is the SHARED `src/components/TypographyControls.js` — its own docstring says "responsive RangeControl + unit dropdown" (separate `SelectControl`, line ~133). Refactoring THAT ONE component to `UnitControl` + the device-icon switcher fixes text/heading/button/label/quote + counter/whatsapp-cta/mobile-nav/option-picker/trust-bar/product-card at once (every consumer of the shared component). Hero has at least one bespoke separate-unit dropdown too. (A): 20 blocks have `*Tablet` attrs in block.json with NO `ResponsiveControl` import in edit.js (accordion, accordion-item, button, content-collection, counter, cta-section, feature-grid, form, form-step, form-field-tiles, google-reviews, heading, info-box, label, media, mobile-nav, multi-button, notice-banner, option-picker, pricing-table — re-derive the list at build time, it drifts).
**Build:** (1) refactor `TypographyControls.js`: `UnitControl` for size/line-height (integrated unit) + the device-icon tier switcher — visual parity with the gap control; consumers unchanged (same attr shape). (2) Write `scripts/check-control-ux.js` — a prebuild guard sibling of `check-dead-controls.js` that FAILS the build on (a) a block.json responsive attr family whose edit.js lacks a tier-switcher-wrapped control, and (b) a `*Unit` attr set via `SelectControl` instead of `UnitControl`/an integrated control. Baseline file for accepted exceptions, zero-tolerance default — run it through prove-it-fails + qc-council before trusting (the HC2 static-guard lesson: new checkers have blind spots). (3) Sweep the flagged blocks per the guard's output. **Note:** `/wp-blocks` (the DB) can list candidate ATTR families (`*Tablet`/`*Unit` companions) but CANNOT see editor UI — the detector must scan edit.js component usage; use the DB dump only to seed the candidate list.
**Gate:** qc-inline per sub-step; canary editor check that a typography control now matches the gap control's look; the guard wired into prebuild + proven to fail on a seeded violation.

## Evidence (carry verbatim — do not re-derive)

### Audit highlights (opus agent, all file:line verified by the fact-checker)
- 16 responsive spacing attrs = DEAD TIERS (attrs + render exist, zero UI).
- Layer-2 band = max-width only (no padding/bg at any tier).
- `SpacingControl` preset mode ← `useSettings('spacing.spacingSizes')` = the None/XXS dropdown; `freeInput` = the fix.
- No responsive tier exists at all for: contentWidth, border, gridItem*.
- ContainerWrapperControls `content`-kind = WidthPanel only (HC2 removal, deliberate).
- container/edit.js duplicates panels inline (no shared-component use).
- 3 dead flex attrs (rendered, no control).
- Wrapper PHP is render-consistent with container (both via get_block_wrapper_attributes for base supports; helper renders everything container declares).

### Fact-check corrections (sonnet, independent)
- Hero DOES have media/image-area border+radius (24 attrs incl. responsive) — only the CONTENT column lacks background/border. Scope step 6 accordingly.
- flexWrap renders a 'wrap' DEFAULT even unset (wrapper:408) — wiring the control changes operator capability, not default behaviour.
- render.php delegates to the wrapper class (no direct get_block_wrapper_attributes call) — immaterial.

## Cross-links
- Converter side (already shipped, waiting on these blocks): GRID-PER-AREA router `c6337eac` + fold gate `d1e30996` on `feat/stage1-converter-core`; H-B VERIFIED live (hero contentPadding 28/56/72 at 3 viewports).
- The ledger: `.claude/plans/2026-06-09-clone-fix-sign-off-ledger.md` (H-B flipped; FP-E/FP-H flipped to D204).
- Bean's 4-layer standard + the `<areaName>+<suffix>` convention: `.claude/next-session-prompt.md` Task 3 steers.
