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

### (A) Root cause — the container cannot express a "capped grid": its content-cap and its grid layout are mutually exclusive

The draft's `.sgs-trust-bar__inner` is a **single element that is BOTH a content cap AND the grid** — `max-width:1100px; margin:0 auto` (cap) plus `display:grid; grid-template-columns; gap` (layout), `index.html:322-328`. The correct render is a 1100px-wide, centred, 4-column grid.

The clone got the **grid** but lost the **cap**. Two facts combine, and together they are the architectural root:

1. **The converter doesn't lift the cap when the folded wrapper is also a grid.** `_fold_layout_into_attrs` (`convert.py:3808-3831`) lifts `max-width → contentWidth`, but its own docstring says it "only fires for the sole-shell fold path … grid/flex item wrappers are NOT … reached." `__inner` is the sole element child of the section, yet because it is *also* a grid, the cap-lift branch is bypassed — the grid-merge path (`_merge_grid_attrs_into_container`, `:3548-3578`) takes the layout and never carries the `max-width`. Clone result: `contentWidth` absent (Wave-1 confirmed — no `max-width:1100px` anywhere in the emitted output).
2. **Even if `contentWidth` were set, render.php would refuse to apply it.** The `$do_wrap` gate at `class-sgs-container-wrapper.php:978` is `'' !== $content_width && '' === $layout` — it emits the content-cap inner wrapper **only when there is NO layout**. For a grid (`layout` non-empty), `$do_wrap` is FALSE, so the capped inner is never rendered. The container can express a *capped stack* (contentWidth, no layout) OR a *full-bleed grid* (layout, no contentWidth) — but **not a capped grid**, which is precisely what the draft needs.

So the container's 3-layer model (Spec 22 §FR-22-21: OUTER / CONTENT-WIDTH / PER-GRID-ITEM) is incomplete: the **grid is only ever attachable to the OUTER (full-bleed) layer, never to the CONTENT-WIDTH layer.** That is a missing capability, and it will bite every section whose `__inner` is a capped grid (an extremely common mockup pattern), not just trust-bar.

### (B) Proposed solution — make "capped grid" a first-class container capability (systemic)

1. **Container renders the grid on the content-width layer when both are present (architectural; design-gate, Rule 7).** Replace the XOR `$do_wrap` gate (`class-sgs-container-wrapper.php:978`) with: emit the inner content-width wrapper whenever `contentWidth` is set, and when `layout=grid` *also* present, apply the grid (`display:grid` + columns + gap) to **that inner wrapper** rather than the outer section. Result: a full-bleed background section containing a 1100px-capped, centred, N-column grid — the draft's exact structure. This completes the 3-layer model so the CONTENT-WIDTH layer can itself be the grid host.
2. **Converter lifts the cap even when the wrapper is a grid (HB-style per-layer separation).** `_fold_layout_into_attrs` must lift `max-width → contentWidth` from a folded `__inner` *regardless* of whether that `__inner` is also a grid — the cap and the layout are independent layers and both must transfer. The grid-merge and the cap-lift should run on the same folded wrapper, not be mutually exclusive code paths.
3. **Faithful transfer includes the section's *absence* of max-width (success Rule 4).** `.sgs-trust-bar` (section root) has no `max-width` → the OUTER layer stays full-bleed (`alignfull`), which the clone already does correctly. Keep that; the cap belongs only on the inner.

**Wave-3 cross-attestation (do NOT merge here):** the "content-cap lost / `__inner` fold incomplete" pattern is the same 4-layer transfer Bean defined and the same capped-grid gap that recurs wherever a section's inner is a constrained grid. Sits with the responsive-grid cluster (H-A, BR-A, IN-C) and the per-grid-item cluster (H-B). Candidate for the universal container 3-layer completion in Wave 3.

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

### (B) Proposed solution — one responsive channel for every layout value; preserve multi-value properties; transfer per-element responsive CSS

1. **All responsive layout values emit through the per-instance `<style>` block, never inline (Rule 6, systemic).** The container wrapper should render *every* breakpoint of grid/gap/padding as scoped `@media` rules in the one `<style id="sgs-container-{uid}">` block (base value as the unconditioned rule, overrides as `@media`), with the breakpoint-direction mapping done once and correctly (mobile-first draft `min-width` → the wrapper's chosen model). This removes the inline/`@media` split and the "mix-up" risk Bean names — one channel, one direction, consistently applied to every value. (Same universal as H-A2.)
2. **Preserve multi-value properties (no lossy token-snap on asymmetric values).** A two-value `gap: 16px 12px` (row/column) must transfer as a two-value gap, not be snapped to a single spacing token. The converter's token-mapping must keep row/column (and any 2-/4-value shorthand) distinct. This is a general fidelity rule: a property with independent sub-values keeps them.
3. **Transfer per-element responsive CSS via the per-grid-item layer (ties to HB).** The `__text` font-size `@media(min-width:1024px)` bump must reach the badge text. Under the universal per-grid-item distribution (HB), a responsive rule on a sub-element (`__text`) routes to that element's responsive attr group — so per-element responsive typography is no longer dropped.

**Wave-3 cross-attestation (do NOT merge here):** "responsive value written inline / wrong channel / dropped at one breakpoint" is the same mechanism as **H-A2** and the responsive-grid cluster (BR-A, IN-C, TB-A). The two-value-gap-lossy-snap is a new sub-finding to fold into the converter token-mapping fix. Candidate for the universal responsive-emit fix in Wave 3.

---

## TB-C — icons differ (house, check, truck, star)

> "The house icon is different, the star icon from the draft is a flat colour but on the clone it has got a pink outline with a white/transparent inside. The delivery truck icon is different too but the clone icon is actually much better … in this exception I'd update the draft to match the truck icon."

### (A) Root cause — TWO independent issues: (1) the draft and the framework use DIFFERENT Lucide vintages, and (2) icon FILL STYLE is detected but never rendered

The resolver works correctly at the identity level: it maps each draft SVG to the right slug — `home`, `check`, `truck`, `star` (`icon_resolver.py` heuristics + fingerprint, `convert.py:2291-2323`), and `items` stores those slugs (DB fact). render.php then outputs the **framework's current Lucide glyph** for each slug via `sgs_get_lucide_icon()` (`lucide-icons.php`). The mismatches come from two separate places:

1. **Glyph-vintage drift (house, truck).** The draft was hand-authored with *older* Lucide glyphs — old peaked-roof `home` (2 paths starting `m3 12`), old `<rect>`-body `truck`. The framework ships the *current redesigned* Lucide `home`/`truck`. Same slug, different drawing → visible difference. This is not a resolver bug; it is **two different sources of truth for what "the home icon" looks like** (the draft's frozen-in-time copy vs the framework's live library).
2. **Fill-style is lost (star).** The draft star is a deliberately **flat-filled** polygon (`fill: var(--primary-dark); stroke:none`, `index.html:815-817`); Lucide's `star` is an **outline** glyph (`fill:none; stroke:currentColor`). The resolver detects the filled polygon and returns slug `star` — but the *fill intent* (solid vs outline) is **discarded**: render.php only emits the outline version. So a solid star becomes a hollow outlined one. (The "pink outline" Bean sees is the stroke/circle-bg colour interaction — Wave-1 flagged it as needing one live computed-style read to name the exact pink source; the fill fix makes it moot.)

### (B) Proposed solution — single-source-of-truth icon set + icon fill-style as a captured, rendered capability

1. **One icon source of truth shared by draft authoring and framework render (kills vintage drift — house & truck; same principle as HC1).** Draft authoring must pull icons from the **framework's current Lucide set** (the same source `lucide-icons.php` renders), so a draft icon and its clone are identical *by construction* — no resolver round-trip can drift. Add this to the draft-authoring convention (Spec 13). Consequence: the **truck "draft is worse, update it" request resolves automatically** — rebuilding the draft from the framework set adopts the current (better) truck with no special-case. (Keep the resolver's structural heuristics only as the legacy-draft safety net, exactly like the HC1 text-align net.)
2. **Icon fill-style is a style dimension, captured and rendered (fixes the star — generalises to every icon/block).** The resolver must capture not just the slug but the **fill mode** (filled vs outline) when the source SVG is filled; render.php (and the icon/trust-bar render path) must honour it — emit `fill:currentColor` for a filled icon rather than always outline. This makes "solid star" expressible from the `star` slug, and applies to any icon anywhere (icon block, info-box, etc.) — not a trust-bar hack.
3. **House:** under #1 the draft adopts the framework's current `home` and the difference disappears. If instead Bean prefers the draft's older peaked-roof home as the *brand* choice, that becomes an explicit framework icon variant — but the default systemic path is single-source convergence.

**Wave-3 cross-attestation (do NOT merge here):** the "single source of truth / self-describing draft" principle is shared with **HC1** (text-align draft convention). The icon fill-style capability is a new, isolated capability addition (icon render layer). The truck draft-fix is the deferred **TB-C draft-fix** item — resolved by solution #1.

---

## Coverage checklist

| Issue | Root cause | Solution (holistic) | Live-confirm flagged |
|---|---|---|---|
| TB-A — full-width badges | ✅ container can't express a capped grid (cap XOR layout); converter drops cap when wrapper is a grid | ✅ make "capped grid" first-class: grid on the content-width layer + cap-lift independent of grid | — |
| TB-B — responsive emission | ✅ two inconsistent channels (inline base + @media) + lossy gap snap + dropped per-element responsive type | ✅ one responsive channel for all layout values + preserve multi-value props + per-element responsive via HB | — |
| TB-C — icons | ✅ draft vs framework use different Lucide vintages (house/truck) + fill-style discarded (star) | ✅ single-source icon set for draft authoring + icon fill-style as captured/rendered capability | ⚠ one live read to name the exact "pink" source on the star (fill fix makes it moot) |
| TB-C draft-fix | truck: clone better than draft | ✅ auto-resolved by single-source icon authoring | — |
