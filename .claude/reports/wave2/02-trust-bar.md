---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Wave 2 — Trust Bar root cause + proposed solution (TB-A / TB-B / TB-C)"
created: 2026-06-08
status: WAVE 2 (root cause + solution). Grounded in wave1/02-trust-bar.md. Issue-independent; NO merging (Wave 3). Solutions framed long-term/holistic/systemic per Bean 2026-06-08.
sources: wave1/02-trust-bar.md · class-sgs-container-wrapper.php · convert.py · icon_resolver.py · lucide-icons.php · Spec 22 §FR-22-21 · Spec 29
---

# Wave 2 — Trust Bar

Mindset (Bean-locked 2026-06-08): every fix below is expressed as a **capability of the universal mechanism** (container wrapper / converter / draft convention), never a trust-bar carve-out. Cross-attestation noted as Wave-3 input only.

---

## TB-A — content-width not transferred; 4 badges spread across the full screen

> "The content width hasn't passed onto the clone so the 4 badges are spread out across the screen width rather than what it should be."

### (A) Root cause — BOTH layers drop the cap: the trust-bar atomic handler never lifts `__inner`'s max-width, AND render-side `$do_wrap` would suppress it anyway

> **Re-verified against source 2026-06-09 — this corrects BOTH my original draft AND the adversarial council.** My original ("the converter's grid-merge excludes the cap-lift") was the wrong mechanism. The council's correction ("the converter already sets contentWidth; fix is render-side only; don't touch the converter") is ALSO wrong. I read the actual code path; the verified truth is below.

The draft's `.sgs-trust-bar__inner` is a **single element that is BOTH a content cap AND the grid** — `max-width:1100px; margin:0 auto` (cap) plus `display:grid; grid-template-columns; gap` (layout), `index.html:322-328`. The clone got the **grid** (from trust-bar's DB-default `columns=4`) but lost the **cap**. **TWO independent code paths each drop it:**

1. **CONVERTER — the trust-bar atomic handler never lifts the cap (`convert.py:2236-2345`).** Trust-bar is handled *atomically*: `_atomic_attrs_for` extracts the badges into an `items` array + sets `badgeStyle` + `columns = len(items)` (`:2341`), then returns (`:2345`). Because the badges become an attr (not InnerBlocks), the walker never descends into `_process_container_children` for trust-bar, so the generic fold (`_fold_layout_into_attrs` — which *does* lift `max-width → contentWidth` correctly at `:3828-3831`) is **never called** on `__inner`. Result: `contentWidth` is genuinely **absent** from the converter's emitted attrs (Wave-1 confirmed). **This is a universal gap:** any composite with an explicit `_atomic_attrs_for` handler that consumes its wrapper's children as `items` extracts *content* but drops the wrapper's *layout* (max-width / padding / gap).
2. **RENDER — even if `contentWidth` were set, `$do_wrap` would suppress it (`class-sgs-container-wrapper.php:978`).** The gate is `'' !== $content_width && '' === $layout` — it emits the content-cap inner wrapper **only when there is NO layout**. For a grid (`layout` non-empty) it is FALSE, so the capped inner is never rendered. The container can express a *capped stack* OR a *full-bleed grid* — but **not a capped grid**.

**The fact-check, plainly:** `_fold_layout_into_attrs` (`:3822` grid-merge + `:3828-3831` cap-lift) runs both lifts sequentially and unconditionally — so my "grid excludes cap" was false (council right on that narrow point). BUT the fold is **never invoked for trust-bar** because the atomic handler short-circuits it (`:2345` return) — so the council's "render-side only, don't touch the converter" was also false. **BOTH layers need fixing.** (No live trace needed — the source read settles it.)

**Layer: IMPLEMENTATION gap (×2), not a missing capability.** FR-22-21 step 3 already canonicalises the capped grid (*"inner is ALSO the grid → contentWidth + grid both on the constrained content"*). The converter (atomic-handler layout-drop) and the render (`$do_wrap`) are the two implementations that fail to satisfy it.

### (B) Proposed solution — capped-grid as an OPT-IN third render state (render-side), fenced against the library

This IS the genuinely-required canary fix (full-width badges is a real visible defect). But it touches the shared wrapper used by ~28 blocks, so it ships fenced, not as a flip.

1. **CONVERTER FIX — atomic composite handlers must lift the consumed wrapper's container CSS (universal).** When an `_atomic_attrs_for` handler consumes a wrapper's children as `items` (trust-bar badges — and the same pattern in any other atomic composite), it must ALSO lift that wrapper's container-level CSS onto the composite's container attrs — at minimum `max-width → contentWidth`, plus padding/gap. Cleanest: call the already-tested `_fold_layout_into_attrs` (or just its cap-lift) on the consumed `__inner` from inside the handler, reusing the one verified lift rather than adding a parallel path. This fixes trust-bar AND every other atomic composite that today silently drops its inner wrapper's width/layout. (Source-confirmed 2026-06-09: `contentWidth` IS absent from the converter output — no live trace needed.)
2. **Capped-grid = an OPT-IN third state, NOT a flip of the XOR gate (Rule 7 design-gate; council C3).** Keep `$do_wrap` (`class-sgs-container-wrapper.php:978`) **byte-identical** for the 26 consumers with empty `contentWidth`. Add a new branch: when `contentWidth` set AND `layout='grid'` AND an explicit opt-in (a converter-set flag for a *detected* capped-grid) → emit the `__inner` wrapper AND move the grid (`display:grid` + columns + gap + align-items) onto `__inner`; the outer keeps ONLY padding/background/min-height and must **not** also emit `display:grid` (or H-A's double-engine returns one level down). Universal by *capability*, opt-in by *flag* — existing full-bleed-grid sections render unchanged.
3. **CRITICAL — fix the grid-item-default CSS cascade when the grid host moves (council M1).** The `--sgs-gi-*` grid-item defaults are applied via `container/style.css` `.sgs-container--grid > .sgs-container { … }` — a **direct-child** selector. Moving the grid onto the injected `__inner` makes the badges children of `__inner`, so `> .sgs-container` stops matching and **every grid block silently loses its item defaults** (padding/bg/radius/border/shadow/text-colour). The `__inner` must itself carry `.sgs-container--grid` AND the selector must be generalised (e.g. `.sgs-container--grid > .sgs-container, .sgs-container__inner.sgs-container--grid > .sgs-container`). This is a shared-CSS change — part of the same design-gate.
4. **Acceptance criteria (Playwright, on the real homepage — Rule 5).** `.sgs-container__inner` exists inside the trust-bar; its computed `max-width` = `1100px`; `margin-inline:auto` applied; the grid is on the inner, not the outer; the 4 badges are direct children of `__inner`; the outer section's computed `display` is NOT `grid`; AND for ≥3 control blocks with empty `contentWidth` (e.g. card-grid, feature-grid, gallery) the rendered DOM depth + grid-item defaults are unchanged.
5. **Regression fence + rollback (council C8).** Capture a `do_blocks()` render snapshot of all 28 wrapper consumers + the 3 live clients' homepages pre/post; commit only if the 26 non-opt-in consumers are byte-identical (or intentionally diffed). Rollback = flip the opt-in flag off.
6. **Faithful transfer includes the section's *absence* of max-width (success Rule 4).** `.sgs-trust-bar` (root) has no `max-width` → the OUTER stays full-bleed (`alignfull`), which the clone already does. The cap belongs only on the inner.

**Wave-3 cross-attestation (do NOT merge here):** the capped-grid render-side fix sits with the container 3-layer completion (H-A) and per-grid-item cluster (H-B). The shared-wrapper blast radius (all 28 consumers) means this is one fenced shared change, gated once.

---

## TB-B — every one of these values is responsive: no inline, no single-device, no mix-ups

> "All of these rules/settings are responsive so there is no excuse for writing inline or only writing to one device type or getting them mixed up."

### (A) Root cause — the container emits responsive values through TWO inconsistent channels (inline for the base, `@media` for the rest), and drops some responsive values entirely

Wave-1 showed the trust-bar's responsive properties are split across mechanisms (`current-clone-page-source.html:801`):
- `grid-template-columns:repeat(4,1fr)` (base/desktop) → **inline `style=`**.
- tablet/mobile columns → `@media (max-width:1023px / 599px)` in the per-instance `<style>` block.
- `gap` → **inline**, and the draft's *two-value* gap `16px 12px` (row 16 / column 12) was collapsed to a single token `gap:var(--wp--preset--spacing--20)` — the row/column distinction was lost (`index.html:325`).
- `padding` → **inline**.
- the draft's `__text` font-size responsive bump (`@media (min-width:1024px) → 14px`, `index.html:363-365`) → **not transferred at all**.

Three distinct failure modes, all instances of the same root: **there is no single, consistent responsive-emit channel.** The base value goes inline (Rule 6 risk — inline beats `@media`, so any future override at a larger breakpoint can't win), the overrides go to a style block, asymmetric values get lossily compressed to one token, and per-element responsive typography is dropped because it lives on a child selector the wrapper doesn't process.

### (B) Proposed solution — DE-SCOPED after the council: two genuine fidelity bugs now; the "one channel" re-architecture is a deferred hardening

> **Revised after the council (Ship-PM + Spec-Lawyer + Regression).** "All responsive values through one channel, never inline" was over-stated as required. On *this* page the inline base value is harmless (nothing overrides the desktop grid at a *larger* breakpoint), and forcing every container to grow a `uid`+`<style>` tag would change the serialised output of already-shipped flat sections. So the channel-unification is downgraded to a post-canary Rule-6 hardening. Two real bugs remain that ARE required:

1. **Preserve the two-value gap (no lossy token-snap) — required.** The draft `gap: 16px 12px` (row 16 / col 12) was collapsed to a single token `var(--wp--preset--spacing--20)`, losing the row/column distinction. WP-native `style.spacing.gap` only holds a *single* value, so a two-value gap must be emitted via a **custom path** (a CSS var / explicit two-value `gap` string through the container gap helper), not `style.spacing.gap`. General fidelity rule: a property with independent sub-values keeps them. This is the existing pending **FR-22-21 gap-A4** converter token-mapping workstream — cite it, don't re-discover it.
2. **Transfer the per-element responsive font-size — required, but there is NO child to put it on (corrected 2026-06-09).** The draft's `__text` font-size bump (`@media(min-width:1024px) → 14px`) is dropped. My earlier "lands on the CHILD (D192)" was **wrong**: trust-bar badge labels are **array items** (the atomic handler stores them as `items`), not child blocks — D192's "child owns typography" can't apply because there is no child block here. The font-size has **no typed destination** today, and **no mechanism captures it**: trust-bar is atomic, so it never reaches `_route_composite_interior`, and the per-slot CSS router that would carry it was deprecated (`_lift_styling_attrs`). So this is the SAME missing mechanism as TB-A — it needs **universal per-slot CSS routing for array items** (font-size → a per-item typography field on `items`, or a block-level typography attr), not a child-block route.
3. **DEFERRED (not canary-required) — the single-channel re-architecture.** Routing *every* base value through the `<style>` block is a Rule-6 hardening for later: keep the base value **inline when there is no responsive variant** (preserves byte-identical output of shipped flat sections, exactly as the existing min-height code already does); only route through `<style>` when a responsive override exists. Full unification ships after the canary is signed off.

**Wave-3 cross-attestation (do NOT merge here):** the two-value-gap fix folds into FR-22-21 gap-A4; the per-element responsive typography folds into the HB per-grid-item→child-attr routing (reinforced by D192). The single-channel hardening is its own deferred Rule-6 pass.

---

## TB-C — icons differ (house, check, truck, star)

> "The house icon is different, the star icon from the draft is a flat colour but on the clone it has got a pink outline with a white/transparent inside. The delivery truck icon is different too but the clone icon is actually much better … in this exception I'd update the draft to match the truck icon."

### (A) Root cause — TWO independent issues: (1) the draft and the framework use DIFFERENT Lucide vintages, and (2) icon FILL STYLE is detected but never rendered

The resolver works correctly at the identity level: it maps each draft SVG to the right slug — `home`, `check`, `truck`, `star` (`icon_resolver.py` heuristics + fingerprint, `convert.py:2291-2323`), and `items` stores those slugs (DB fact). render.php then outputs the **framework's current Lucide glyph** for each slug via `sgs_get_lucide_icon()` (`lucide-icons.php`). The mismatches come from two separate places:

1. **Glyph-vintage drift (house, truck).** The draft was hand-authored with *older* Lucide glyphs — old peaked-roof `home` (2 paths starting `m3 12`), old `<rect>`-body `truck`. The framework ships the *current redesigned* Lucide `home`/`truck`. Same slug, different drawing → visible difference. This is not a resolver bug; it is **two different sources of truth for what "the home icon" looks like** (the draft's frozen-in-time copy vs the framework's live library).
2. **Fill-style is lost (star).** The draft star is a deliberately **flat-filled** polygon (`fill: var(--primary-dark); stroke:none`, `index.html:815-817`); Lucide's `star` is an **outline** glyph (`fill:none; stroke:currentColor`). The resolver detects the filled polygon and returns slug `star` — but the *fill intent* (solid vs outline) is **discarded**: render.php only emits the outline version. So a solid star becomes a hollow outlined one. (The "pink outline" Bean sees is the stroke/circle-bg colour interaction — Wave-1 flagged it as needing one live computed-style read to name the exact pink source; the fill fix makes it moot.)

### (B) Proposed solution — DE-SCOPED after the council: draft edits + one scoped fill flag now; the universal conventions deferred

> **Revised after the council (Ship-PM + Regression + Architecture).** TB-C does NOT need framework-wide engine changes for the canary. Bean literally asked to *update the draft* for the truck — that's the cheapest, lowest-risk path for the vintage drift, and the star needs only a small scoped flag.

1. **House + truck — fix the DRAFT (minutes, zero engine risk).** Rebuild the draft's house/truck (and star) SVGs from the **framework's current Lucide set** so draft and clone match by construction. This is a `sites/mamas-munches/mockups/homepage/index.html` edit — exactly what Bean requested for the truck, and it removes the vintage drift for house too. No converter/resolver change.
2. **Star solid-vs-outline — a SCOPED, gated per-item flag (not a framework-wide capability).** Add an `iconFill` attr on the trust-bar items, values `outline` (default) | `solid`; render emits `fill:currentColor` only when `solid`. Data shape: `{"icon":"star","iconFill":"solid", …}`. Default `outline` keeps the 3 OTHER `sgs_get_lucide_icon()` consumers (icon, info-box, icon-list) rendering **unchanged** (council S3). Build-gate-safe: the new control DOES render, so `check-dead-controls.js` passes. The resolver captures fill-mode from the filled source SVG and sets the attr.
3. **DEFERRED (not canary-required) — the universal conventions.** (a) "Draft authoring pulls icons from the framework Lucide set" → a **Spec 13 amendment + design-gate** (same self-describing-draft principle as HC1), for the draft-convention workstream. (b) "Icon fill-style as a universal capability across every icon/block" → a **new FR** in the icon render layer. Both are real long-term primitives but neither gates this homepage.
4. **House brand option:** if Bean prefers the draft's older peaked-roof home as a *brand* choice rather than converging to current Lucide, that becomes an explicit framework icon variant — his call later.
5. **Live-read still flagged (R-22-11):** name the exact "pink" source on the star before close; the fill fix likely makes it moot.

**Wave-3 cross-attestation (do NOT merge here):** the deferred draft-icon-source convention shares the self-describing-draft principle with **HC1**; the deferred universal fill-style is a new icon-layer FR. The canary-required parts (draft edits + scoped `iconFill`) are isolated and low-risk.

---

## Coverage checklist (revised post-council 2026-06-09)

| Issue | Root cause (corrected) | Solution (canary-required) | Deferred | Live-confirm |
|---|---|---|---|---|
| TB-A — full-width badges | ✅ TWO layers (source-verified): converter trust-bar atomic handler never lifts `__inner` max-width→contentWidth (`:2236-2345`) + render-side `$do_wrap` XOR (`:978`) would suppress it. Both impl-gaps vs FR-22-21 step 3 | ✅ converter: atomic handlers lift consumed wrapper's container CSS (universal) + render: capped-grid OPT-IN third state (not a flip) + fix `--sgs-gi-*` cascade + regression fence | — | ⚠ Playwright acceptance criteria (no trace needed — code-confirmed) |
| TB-B — responsive | ✅ lossy two-value gap snap + dropped per-element responsive font-size. (Inline base = harmless here) | ✅ preserve two-value gap (custom emit, FR-22-21 gap-A4) + responsive font-size → CHILD attr (D192) | single-channel re-architecture (Rule-6 hardening) | — |
| TB-C — icons | ✅ Lucide vintage drift (house/truck) + fill-style discarded (star) | ✅ rebuild draft SVGs from framework Lucide (Bean's truck ask) + scoped `iconFill` attr (default outline) | universal draft-icon convention (Spec 13) + universal fill-style FR | ⚠ one live read to name the "pink" source |
| TB-C draft-fix | truck: clone better | ✅ direct draft edit (solution #1) | — | — |

## What changed — fact-checked against source 2026-06-09 (the honest delta)

- **TB-A: BOTH my original AND the council were wrong; the source settles it.** Original ("`_fold_layout_into_attrs` excludes the cap-lift on grids") = wrong mechanism. Council ("converter already sets contentWidth → render-side only, don't touch the converter") = also wrong. Verified truth: `_fold_layout_into_attrs` *does* lift both, but it is **never called for trust-bar** because the atomic handler (`:2236-2345`) consumes the badges as `items` and returns before the fold. So `contentWidth` is genuinely absent → **the converter DOES need a fix** (atomic handlers must lift the consumed wrapper's container CSS — universal), **AND** render-side `$do_wrap` must allow a capped grid. Two layers, not one.
- **TB-A: the `$do_wrap` change is opt-in + fenced**, not a global flip — a flip would break the `--sgs-gi-*` grid-item-default cascade (`container/style.css:8`, direct-child selector, source-confirmed) on every grid block. Added the CSS-selector fix + a 28-consumer regression fence.
- **TB-B: de-scoped + corrected.** "One channel, never inline" downgraded to a deferred hardening. And "responsive font-size → child attr" was **wrong** — badge labels are array items, no child block exists; it needs the same per-slot CSS routing as TB-A.
- **TB-C: de-scoped.** House/truck = draft edits (what Bean asked); star = a scoped `iconFill` flag defaulting to outline (not a framework-wide capability). The universal conventions are deferred to spec amendments + design-gates.

---

## ⭐ Wave-3 CONSOLIDATION — TB-A, TB-B, H-B, per-grid-item = ONE missing mechanism (source-verified 2026-06-09)

These are **not** separate per-section bugs. They share one root: **the pipeline routes per-element CSS to typed block attributes ONLY for nodes walked as child blocks. Any slot represented as an array item, or as a folded-away interior wrapper, loses its CSS.**

The evidence — three carve-outs/abandonments sitting where a universal "per-slot CSS router" should be:
1. **Deprecated `_lift_styling_attrs` + `_slot_attr_prefix`** (`convert.py:1687`/`:1666`, dead code) — this WAS the universal element-CSS → parent-slot-attr router. FR-22-2 deprecated it and only partly replaced it (replacement routes CSS to a child block when walked, or into a CSS-string variation via `collect_css_for_classes:385` — never to a parent composite's per-slot attr).
2. **`_route_composite_interior`** (def `:2404`, FR-22-19) — a **per-composite carve-out** gated by `db.has_scalar_media_attrs(slug)` (`:2940`; the `is_class_section_block` at `:2415` is a STALE docstring — the live gate was corrected to `has_scalar_media_attrs` on 2026-06-01, D128). Plus a sibling carve-out `_is_container_mirror_block` (`:2950`, def `:908`) → `_process_container_children` (`:3834`). Routes content/scalar-media for gated composites but **drops the interior wrapper's CSS**. A passing-grade shortcut for specific composites, not the universal rule (Rule 2 / Rule 3).
3. **The trust-bar atomic handler** (`:2236-2345`) — hard-coded badge extraction (R-22-1 violation); captures content, drops `__inner` fold + per-badge CSS.

**The honest fix (one workstream, not four):** restore a **universal per-slot CSS router** — driven by the `canonical_slot` matching that already works for *content* (`attr_name_for_slot_or_alias`, active), extended to *CSS*, applied to **every** composite interior AND **array-item slots**, replacing the three carve-outs. This single build resolves TB-A (`__inner` + badge CSS), TB-B (badge font-size), H-B (content padding), and the per-grid-item cluster. **Design-gate before build (Rule 7) — it touches the converter's core routing.**
