---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Wave 2 — Hero root cause + proposed solution (H-A / H-B / H-C)"
created: 2026-06-08
status: WAVE 2 (root cause + solution). Grounded in the Wave-1 facts at .claude/reports/wave1/01-hero.md. Issue-independent; NO merging (that is Wave 3).
sources: wave1/01-hero.md · hero/render.php · hero/style.css · class-sgs-container-wrapper.php · convert.py · db_lookup.py
---

# Wave 2 — Hero

Each issue below carries: **(A) Root cause** (the single mechanism that produces the symptom, cited to file:line proven in Wave 1) and **(B) Proposed solution** (the fix-shape + the layer it belongs in). No clustering across issues — cross-attestation notes are flagged only as Wave-3 input, not merged here.

---

## H-A — split variant recognised but image column takes the majority, content squashed

> "Content doesn't stack over image, it still has the split variant recognised so they are 2 separate columns however the image column does take up the majority of the width, leaving the content column squashed on the left side."

### (A) Root cause — TWO independent code paths both own the grid, and the converter lifted the WRONG breakpoint's value

There are two distinct defects stacking on top of each other. Both are proven from Wave-1 facts.

**Defect 1 — double grid ownership (architectural).** The same `<section>` gets `display:grid; grid-template-columns:` written into its inline style **twice**, by two code paths that don't know about each other:

1. Hero's own split path — `hero/render.php:293-294` pushes `display:grid` + `grid-template-columns:{$safe_ratio}` (default `1fr 1fr`) into `$styles[]`.
2. The container wrapper grid path — `class-sgs-container-wrapper.php:394-398` appends *another* `display:grid` + `grid-template-columns:` when it treats the section as a grid container.

Wave-1 captured the result verbatim in the clone section inline style (`current-clone-page-source.html:784`):
`…display:grid;grid-template-columns:1fr 1fr;gap:0px;display:grid;grid-template-columns:1fr;align-items:start`.

Two `grid-template-columns` declarations in one inline style → the browser's cascade keeps the **last** one → `grid-template-columns:1fr` wins on desktop. Hero is simultaneously a composite *with its own grid engine* AND routed through the container wrapper's grid engine. Neither yields. That collision is the architectural root cause.

**Defect 2 — wrong breakpoint lifted.** The winning value is `1fr` — a **single** track. That value is the draft's *mobile base* rule `grid-template-columns:1fr` (`index.html:253`), NOT the draft's *desktop* rule `grid-template-columns:1fr 1fr` (`index.html:282`, `@media min-width:768px`). The converter lifted the base/mobile grid value into the desktop-level `gridTemplateColumns` attr, and the `1fr 1fr` only survives in the container's responsive block `@media (max-width:1023px){.sgs-container-f4e2d526{grid-template-columns:1fr 1fr}}` (clone `:784`) — which (a) is scoped to *tablet-and-below*, the wrong direction, and (b) loses to the inline style anyway (inline > external). So the desktop draft value never reaches the desktop render.

**Why the visual is "2 columns, image majority" and not "single stacked column":** hero's `style.css:59-61` sets `.sgs-hero--split { display:grid; grid-template-columns:1fr 1fr }` as an external base rule. Inline `grid-template-columns:1fr` beats it, leaving one explicit `1fr` track; the two grid children (`__content`, `__media`) then auto-place with the image sizing to its intrinsic/`width:100%` width and the content squeezed into the remaining space — exactly the reported "image majority, content squashed". **Caveat (honesty gate, R-22-11):** the precise live track sizing should be confirmed with one `/browsing` computed-style read of `grid-template-columns` on the section at ≥1024px before Wave-3 implementation closes — static source resolves to a broken single-track grid, and the saved capture has misled before. The *fix* is invariant to that confirmation.

### (B) Proposed solution — UNIFY the grid: the container is the sole grid engine; variant templates configure it (Bean HA1, 2026-06-08)

The holistic fix is not "gate one path off" — it is to **make the variant templates drive the container's grid, so there is only ever one grid engine.** This is the composite-mirror rule (D152/D166/D167, WS-4) applied to layout: every composite already mirrors `sgs/container`'s wrapper capabilities; the grid must flow through that mirror, not around it.

1. **Single grid engine = the container wrapper (architectural; design-gate, Rule 7).** Hero's `split` variant (and any future variant tied to a layout template) must **set the container's grid attributes** — `gridTemplateColumns` + `gridTemplateColumnsTablet/Mobile`, `gap` — and then **emit no `display:grid` of its own**. Delete the parallel grid emission at `hero/render.php:293-294`; let `class-sgs-container-wrapper.php:394-398` render the grid once from those attributes. The variant becomes a *preset that populates container attrs* (e.g. `split` → `gridTemplateColumns:'1fr 1fr'`, content-then-media order), not a second renderer. This generalises to every variant on every composite — no hero special-case — and structurally removes the duplicate-declaration class of bug (it can't happen if only one path writes the grid).
2. **Lift the correct per-breakpoint grid value (HA2 fix).** The converter must map the draft's *desktop* `grid-template-columns:1fr 1fr` (`index.html:282`, a `min-width` rule) → the desktop attr (`gridTemplateColumns`), and the *base/mobile* `1fr` (`index.html:253`) → the mobile attr (`gridTemplateColumnsMobile`). Currently inverted — see HA2 below for the mechanism.
3. **Responsive values in attributes, never the losing inline path (Rule 6).** With the container as sole engine, the desktop value lands on `gridTemplateColumns` and the wrapper renders it into a `min-width` rule — no tablet-scoped container rule that inline beats.

**HA2 — output bug CONFIRMED, converter cause NOT pinned (corrected 2026-06-09 after source read).** Two parts. (a) The *duplicate within one inline style* (`1fr 1fr` then `1fr`) is purely the two-engines problem; solution step 1 deletes it at source — confirmed. (b) The *mobile value sits in the desktop attr*: the clone has `gridTemplateColumns='1fr'` (the draft's base/mobile value) and the `min-width:768px` value `1fr 1fr` mis-scoped to the tablet attr (`@media(max-width:1023px)`). **This is a real output bug — but my earlier "the pipeline maps mobile-first the wrong way round" mechanism is WRONG.** The converter actually HAS correct inversion logic: `_collect_responsive_grid_from_css` (`convert.py:3333`, docstring `:3338-3343`) maps highest `min-width` → desktop, base → mobile, and traced by hand would give hero the *right* values. So the bug is that the correct logic **did not produce the correct result for hero** — either it didn't fire (responsive collector returned empty → base value lifted as desktop via the fallback at `:3528-3534`), or hero's `768px` breakpoint misbucketed against the hard-coded thresholds `_GRID_DESKTOP_BP=1024` / `_GRID_TABLET_BP=600` (a `768` `min-width` the author intends to cover desktop gets confined to the tablet bucket). **Pinning the exact cause needs a trace of hero's `css_rules` — do NOT assert the mechanism before that trace.** (The fixed `1024/600` thresholds vs the draft's `768` are themselves a hard-coded-assumption smell, R-22-1.)

**Wave-3 cross-attestation (do NOT merge here):** the "missing `*Desktop` slot + inline-beats-`@media` + wrong responsive direction + double grid ownership" mechanism was independently found in **BR-A, IN-C, TB-A**. Candidate for one universal responsive-grid + single-engine fix in Wave 3.

---

## H-B — image has padding on top/bottom/sides when it should have none

> "Also, the image still has padding on the top, bottom and sides when it should have none."

### (A) Root cause — content-column padding was lifted onto the OUTER section, so it pads the whole grid including the image column

The draft puts padding **only** on `.sgs-hero__content` — `28px 20px 40px` at base (`index.html:257`), `56px 48px` at tablet/desktop (`index.html:293-297`), `72px 64px` at large desktop (`index.html:310`). There is **no** padding on `.sgs-hero__media` or `.sgs-hero__split-image` at any breakpoint (`index.html:256`, `:260`).

The converter took that content-column padding and wrote it onto the **outer `<section>`'s native padding** instead. Clone section inline style (`current-clone-page-source.html:784`): `padding-top:28px;padding-right:20px;padding-bottom:40px;padding-left:20px`, and the responsive block `@media (max-width:1023px){.sgs-container-f4e2d526{padding…48px}}`. Those are the draft's *content* values, applied to the whole section. Because the section is the grid container, padding on it insets **both** columns — so the image column gets the same top/bottom/side padding the content was supposed to get alone.

**Why it lands there (verified against source 2026-06-09):** hero is a class-section composite, so its interior is routed by `_route_composite_interior` (`convert.py:2404`, FR-22-19). For the content column it **folds the `.sgs-hero__content` wrapper away and walks its children as InnerBlocks** (`:2427-2431`) — and **drops the content wrapper's OWN CSS** (the `28px 20px 40px` padding). Nothing routes that padding to hero's `contentPadding*` slot attrs. So this is NOT merely "the converter doesn't recognise the selector" (my earlier framing) — **the routing path from an interior element's CSS to a parent composite's per-slot attr does not exist.** The mechanism that used to do it (`_lift_styling_attrs` + `_slot_attr_prefix`) was **deprecated by FR-22-2** (`:1687`/`:1666`, now dead code) and only partly replaced: the replacement routes CSS to a child block (when walked) or into a CSS-string variation (`collect_css_for_classes:385`), never to a parent composite's per-slot attr. Hero already exposes the correct destination — `contentPadding*` (read by `hero/render.php:193-206`) + `mediaPadding*` — but no code targets them. The padding ends up on the outer section instead (via `convert.py:494-497` → native `style.spacing.padding`).

### (B) Proposed solution — universal per-grid-item CSS distribution for ANY grid/row/column wrapper (Bean HB, 2026-06-08)

Not a hero fix. The procedure must work for **any wrapper with a grid/row/column layout** — hero, feature-grid, card-grid, gallery, the container itself. This is Spec 22 §FR-22-21's "per-grid-item" layer done properly. The algorithm (Bean's):

1. **Enumerate the grid items** inside the wrapper (the direct children that occupy grid/flex slots).
2. **Collect each item's CSS rules** (padding, margin, alignment, background, etc.) from the draft, keyed to that item's content/role.
3. **Factor out the common set:** any rule that is *identical across all items* → set once as the wrapper's **default grid-item rule** (e.g. a shared `gap`, or a uniform item padding).
4. **Specialise the differences:** any rule that *differs between items* → set as a **per-item override** on that specific slot, matching both the CSS **and the content** to the correct grid item (the image's rules go to the image slot, the content's rules to the content slot — never cross-assigned).
5. **Result for H-B specifically:** the draft has padding on `__content` but none on `__media` → step 4 puts padding on the content slot only (`contentPadding*`), leaves the media slot at zero (`mediaPadding*` unset), and crucially **stops promoting any of it to the outer wrapper** — so the image is no longer padded. The destination attrs already exist and render (`hero/render.php:193-206`, `:435-467`); the converter just needs the per-item routing.

This requires the converter to recognise element-scoped selectors (`.sgs-<block>__<element>`) and map each to its grid slot's attr group, replacing the current behaviour (`convert.py:494-497` padding→native-spacing map; the wrapper-CSS lift is `_lift_wrapper_css_to_container_attrs` at `convert.py:981`) that collapses everything onto the outer block's native `style.spacing.padding`.

**Wave-3 cross-attestation (do NOT merge here):** "scoped margin/padding lands on the wrong attr surface" was independently found in **FP-C, IN-B, GF-C, GF-G, SP-B, SP-D**. Same class. This per-grid-item distribution algorithm is the universal fix for the whole cluster in Wave 3.

---

## H-C — heading is centre-aligned; the block's text-align is "inherit" and ignores the draft

> "I think the heading still is centre-aligned. In the block settings under layout, the text align settings are set to inherit and don't actually take the settings from the draft."

### (A) Root cause — the draft's left alignment is the *browser default* (no `text-align` to lift), so nothing overrides the heading block's built-in `center` default; and hero's own text-align attrs are dead controls

Two facts combine:

1. **The draft never declares `text-align` on the hero heading at any breakpoint** — `index.html:264-270` (base), `:299-305` (tablet/desktop), `:311` (large). The draft is left-aligned purely by the browser's LTR default (the *absence* of a `text-align` rule). So the converter has no `text-align` value to detect or lift — `convert.py:2083-2084`'s `sgs/heading` atomic handler returns only `content` + `level`, and `db_lookup.py:1143` (`text-align → textAlign`) never fires because there is no source property.
2. **The `sgs/heading` block defaults to centre.** With no explicit `textAlign` emitted (clone heading has no `text-align` inline, `current-clone-page-source.html:786-790`), the heading falls to its block CSS default `text-align:center` (the cross-attested heading-default-centre fact, Loop-1 RC-6 — `:where(.wp-block-sgs-heading__text){text-align:center}`). Result: centred clone vs left draft.

Separately, the **hero `textAlignDesktop/Mobile/Tablet` attrs are inert** — declared in `block.json` and present in the DB (default `""`), but **never read in `hero/render.php`** (Wave-1 grep: zero matches). That is why the editor's "Text alignment" control shows *inherit* and changing it does nothing — it is a dead control surface, which is the second half of the user's report ("set to inherit and don't actually take the settings").

### (B) Proposed solution

**HC1 — this is a forward DRAFT-AUTHORING RULE, not just a converter salvage (Bean, 2026-06-08).** The point is setup-for-the-future: a rule I follow when *building* drafts, so the converter always has an explicit value to lift and never has to guess. Two layers:

1. **Draft-authoring convention (primary — goes into the draft spec).** Text-related draft classes MUST carry an explicit `text-align` (even `text-align:left`) — never rely on the browser default. Add this to the SGS-BEM draft convention (Spec 13) and naming spec (Spec 00): any class that styles text (`__title`, `__heading`, `__body`, `__content h1`, etc.) declares its alignment explicitly. Then the converter's existing `text-align → textAlign` lift (`db_lookup.py:1143`) fires correctly with no special-casing. This is the long-term fix — it makes future drafts self-describing.
2. **Converter safety net (secondary — for legacy drafts authored before the rule).** When a heading's resolved draft alignment is left/start *including the implicit browser default when no `text-align` is declared*, the converter emits explicit `textAlign:left` so it beats the heading block's `center` CSS default. Do NOT change the block's global `center` default (higher blast radius — flips every heading; RC-6 prefers explicit-emit).

**HC2 — RESOLVED + SHIPPED (D192, commit `6922e541`, 2026-06-09).** The inert-hero-controls finding spawned a library-wide audit; the cleanup ran in a parallel session and is now closed. Outcome: hero's `textAlignDesktop/Mobile/Tablet` were **wired** (parent IS the natural home for alignment — they now emit scoped `@media` `text-align` on `.sgs-hero__content`, `render.php:514-527`), and hero's ~22 duplicate **typography** attrs were **removed** (the child `sgs/heading`/`sgs/text` owns font-size/colour). Across the library ~73 controls were handled (~60 removed, ~13 wired/confirmed-live), behind a build-time guard `check-dead-controls.js` (fails `npm run build` on any new control-without-render). **Locked governing rule (D192):** *a parent composite owns STRUCTURE (layout/wrapper/background/gap); child text blocks own CONTENT + TYPOGRAPHY across all breakpoints — a parent typography control duplicating a child capability is dead by CSS specificity (`.{uid} .sgs-x__y` (0,2,0) loses to the child's inline (1,0,0,0)).* **This DIRECTLY reinforces the cloning direction below:** the converter must lift styling onto CHILD attrs, not parent ones (verified converter-safe against the 2026-06-08 trace). My HC2 audit doc + fresh-session prompt are now superseded — see `.claude/reports/wave2/HC2-COMPLETION-2026-06-09.md`.

> **⚠ Wave-3 build-gate consequence:** any future cloning/converter work that adds an editor control whose attr nothing renders will FAIL `npm run build`. If H-C1's converter safety-net or any Wave-3 fix touches block controls, it must emit the effect (or the guard's `collectControlledAttrs`/`isConsumed` must be broadened — never silence it via the baseline).

**Wave-3 cross-attestation (do NOT merge here):** "text-align not transferred → heading block centre default wins" was independently found in **H-C, FP-A, IN-A, IN-E, GF-A, GF-E**. Candidate for one universal text-align fix (draft convention + converter net) in Wave 3.

---

## Coverage checklist

| Issue | Root cause | Solution (upgraded per Bean 2026-06-08) | Live-confirm flagged |
|---|---|---|---|
| H-A — split image-majority | ✅ double grid ownership + wrong breakpoint lifted | ✅ UNIFY — variant templates configure container grid; container = sole engine (no hero grid emit) | ⚠ one computed-style read at ≥1024px before Wave-3 close |
| H-A2 — responsive overwrite | ✅ duplicate inline (two engines) confirmed; ⚠ wrong-breakpoint OUTPUT confirmed but converter CAUSE not pinned (inversion logic exists & looks correct — needs a trace) | ✅ HA1 step 1 deletes the duplicate; breakpoint cause TBD by trace | ⚠ trace hero `css_rules` before asserting the breakpoint mechanism |
| H-B — image padding | ✅ content wrapper CSS dropped by `_route_composite_interior` (FR-22-19 carve-out) — interior-CSS→parent-slot routing absent | ✅ part of the **single per-slot CSS routing mechanism** (see consolidation note) | — |
| H-C1 — heading centre | ✅ left=browser-default (nothing to lift) + heading center default | ✅ DRAFT-AUTHORING RULE: text classes carry explicit text-align (Spec 13/00) + converter safety net | — |
| H-C2 — inert controls | ✅ library-wide: 34 dead controls / 8 blocks (FR-22-6 debt) | ✅ SHIPPED — HC2/D192 (wire-or-remove + build guard) | — |

> **⭐ Wave-3 consolidation (see `02-trust-bar.md` for the full note):** H-B joins TB-A / TB-B / per-grid-item as **ONE missing mechanism** — universal per-slot CSS routing for composite interiors + array items, replacing three carve-outs (`_route_composite_interior` FR-22-19, the trust-bar atomic handler, and the deprecated `_lift_styling_attrs`). Source-verified 2026-06-09. Not four section patches — one converter-core build (design-gate first).
