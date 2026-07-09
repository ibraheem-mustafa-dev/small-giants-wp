---
doc_type: design-gate
title: Universal no-inline styling — build design for Rule-7 approval
status: APPROVED (Bean 2026-07-09) — pilot pending
created: 2026-07-09
references:
  - .claude/plans/go-golden-gosling.md
  - .claude/reports/inline-styling-audit-2026-07-09.md
  - .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md
  - .claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md
---

# Design gate — universal "no-inline styling" (Rule 7: approve before build)

## Problem (plain English)
Cloned blocks paint some of their styling as inline `style="…"` on the element. Inline styling can't express `:hover`/`@media`, and a raw (non-token) inline value can't re-skin per client. This is why hover/responsive states break and why some cloned styling is stuck to one client's brand.

## Effect
- ~26 blocks emit inline styling across **131 render.php sites** (measured by the new `audit-inline-styling.js` instrument).
- The base layer of every block that declares a WP styling support inlines by default (WP's `get_block_wrapper_attributes()` serialises supports inline).
- 4 blocks (container, cta-section, hero, trust-bar) can't even *hold* a base spacing value as an attribute (tier-without-base) — their base padding/margin has nowhere to go but inline.

## Solution (the corrected, standard-WP mechanism — research-backed 2026-07-09)
**Keep the native supports (and their friendly editor controls). Change only WHERE they serialise — from inline to a scoped stylesheet rule — using stable WordPress core APIs, inside the SHARED HELPERS.** No wholesale attr-family growth on 50 blocks; no dropping supports.

The moving parts:
1. **Flip supports from auto-inline to scoped**, per block, via `__experimentalSkipSerialization` (per-property where needed), then serialise the block's `style` object to its own `#uid` selector with the stable core `wp_style_engine_get_styles($style, ['selector' => "#{$uid}"])['css']` and append it to the scoped `<style>` SGS **already emits**. This is exactly how WP core outputs `layout` support (a `.wp-container-{id}` rule, not inline). (qc-council: `wp_style_engine_get_styles` is stable since 6.1; `__experimentalSkipSerialization` is experimental-prefixed but accepted LOW risk — SGS is an internal framework on a pinned WP, and core blocks have used it for years. Flagged, not ignored.)
2. **Land it in the shared helpers, not 50 blocks.** The instrument shows **61% of routed attr-declarations flow through the shared helpers** (`SGS_Container_Wrapper`, `sgs_typography_css_rule`, `sgs_button_element_style_css`, `sgs_responsive_css_rule`), 39% block-private render.php. (qc-council note: 61% is a STATIC source count — routed attr-declarations + inline literals — NOT a runtime-weighted "% of what paints on the page"; it correctly shows shared helpers dominate, but don't read it as a live-page measure.) So the base-layer flip is centralised in a handful of files; only the block-private `style="…"` sites (object-fit, overlays, per-item colour, attribution typography, caption) need per-block conversion into the same scoped `<style>`.
3. **The converter needs no base-routing change** — it already routes base CSS to the WP-native `style.*` object; `skipSerialization` only suppresses WP's *auto-inline output*, it does NOT stop the `style` attr being populated, so render.php can still read it and emit scoped CSS. (qc-council: this is a design prediction — nothing uses `skipSerialization` in the codebase yet — so it holds *pending Pilot A1/A2 passing live*; do not quote it standalone as settled.)
4. **Grow a base destination only where genuinely missing** — the 4 tier-without-base blocks (container/cta-section/hero/trust-bar) need base per-side padding/margin attrs so the base has a scoped home; quote needs its declared-but-unrouted base padding/margin wired. This is a *targeted top-up*, not a framework-wide attr build.
5. **Route or honestly-gap the DROP set** — the grid/flex control family that's inert unless `layout=grid/flex` (281 attrs, declared-but-inert), and the genuinely unrouted props (hero overlay-gradient/bgSvg*/backgroundSize; cta overlay/buttonBorder; card-grid overlayStyle). Decide per item: wire it or mark it an explicit gap. (Not all "drop-unrouted" is styling — 1295 total is dominated by content/behaviour attrs; the styling-relevant subset is the target.)

## Reconciliation with the earlier qc-council FS-B rejection (honesty)
The council rejected "FS-B (WP Style Engine)" as "cosmetic / double-emission / doesn't populate attributes." That verdict assumed the goal was *populate typed attributes*. Bean's actual goal is *no un-reskinnable inline + hover/@media work + standard, user-friendly WP* — for which the Style-Engine-scoped path IS the standard answer and is simpler. `skipSerialization` is exactly what prevents the double-emission the council feared. The council under-weighted it against the wrong goal.

## MANDATORY validation before any rollout (STOP-43/44)
Before touching more than one block, PROVE on the real page-8 DOM that `skipSerialization` + `wp_style_engine_get_styles`-scoped output actually PAINTS correctly for a DYNAMIC SGS block on WP 7.0 — dynamic blocks have a known quirk where WP doesn't reliably apply a native support (the D267 `has-text-align` finding, STOP-44). Pilot on the REPRESENTATIVE 2-block set (`sgs/container` for 4-side/wrapper/tier + `sgs/button` for corner-radius/`:hover`/editor-BoxControl — see the rollout section; container alone can't test corner or hover), land both, run the full Pilot Acceptance Test, THEN roll the roster.

## Rollout (Bean-approved 2026-07-09, pilot scope strengthened by qc-council): PILOT a representative SET → prove → then FULL universal
**qc-council correction:** `sgs/container` alone is NOT a sufficient pilot — it has NO corner-radius attrs and NO `:hover` state, so it can't exercise the corner-radius merge (different WP API: `style.border.radius` object) or the `:hover`-scoped path (the CORE motivating defect). The pilot must be REPRESENTATIVE of every distinct mechanism before "go full universal."
1. **PILOT = 2 blocks covering all distinct mechanisms:**
   - **`sgs/container`** — 4-side padding/margin, tier-without-base base-attr top-up, the shared wrapper, skipSerialization on a section wrapper.
   - **`sgs/button`** (or `sgs/quote`) — 4-CORNER border-radius object (different WP API + control), the custom-attr border path, **`:hover`** scoped, and the **editor BoxControl** in the Gutenberg canvas.
   Run the full Pilot Acceptance Test below on BOTH. Do NOT proceed until every assertion passes live.
2. **THEN full universal rollout** (Bean: "go for the universal setup completely" once the pilot is a proven success) — the same proven pattern across the whole roster: shared-helper-routed blocks, block-private render.php `style="…"` conversions (hero/cta/media/quote/card-grid…), the box-object merge on all 10 families, route/gap the DROP set — each block LANDED via the same test.
3. **Gate:** wire `audit-inline-styling.js` (`--check` mode) into prebuild as zero-tolerance once the roster is green; ALSO add a static AST gate that FAILS the build if a per-side/per-corner grouping/migration operation runs without a `box_family` DB check in its call path (makes the collision guard structural, not just convention — qc-council Claim 2 fix).
Deterministic auto-fix is NO-GO — detection → human/agent apply, per-block validated. **No block deprecations (D270): pre-production; reshaped blocks are re-cloned/recovered, NEVER given a `deprecated.js`.**

## Pilot Acceptance Test — the LANDED gate — hardened per qc-council (Claim 5) to not give a false pass/fail
Passes ONLY when ALL hold on the **real, freshly-served** live page 8 (deploy → re-clone → **purge LiteSpeed + OPcache reset** → anonymous Playwright with cache-bust). Every check = live-DOM/computed-style, never emit/markup (STOP-4/21/44).

| # | Assertion | How measured | Guard |
|---|---|---|---|
| A1 | **Zero inline declarations across the FULL block render subtree** (not one element — inline can leak onto nested/inner wrappers) | `getAttribute('style')` on the block root AND every descendant contains NO property declaration for the EXTENDED set: color/background*/padding/margin/border*/font*/box-shadow/**gap/width/min-height/opacity/transform/grid-template***. | FALSE-NEG: a `--sgs-*`/`--wp--*` custom-property VALUE is allowed (value not declaration) |
| A2 | **Styling PAINTS** using the CLAUDE.md-mandated FULL measurement-vs-eye set (not a subset) | `getComputedStyle` for padding/margin/border-width/border-radius + the full background family (`backgroundColor`/`Image`/`Size`/`Position`), `filter`/`mixBlendMode`/`backdropFilter`/`opacity`, `::before`/`::after`, and the parent chain — = DRAFT values matched by content at 375/768/1440 | FALSE-POS: A1-passes-because-unstyled is caught by the value MATCH; measurement-vs-eye set closes the incomplete-property-set trap |
| A3 | **Responsive tiers apply** via the object attr | computed padding at 1440/768/375 each = the draft's per-tier value (`paddingTablet.top` object read works) | confirms the merge lands, not just base |
| A3b | **ASYMMETRIC per-side proves the accumulator** (THE #1 risk) | a draft element with 4 DISTINCT side values (e.g. `padding:10px 20px 30px 40px`) → all 4 computed sides distinct and correct | closes the accumulator-collapses-to-one-value false-pass a symmetric draft would hide |
| A4 | **Re-skin works** — tested on a TOKEN-REFERENCED property, not a literal | change a theme COLOUR token → container's computed colour changes. (Spacing is faithfully-transferred LITERAL px, so a spacing-preset change legitimately does nothing — do NOT test re-skin on literal spacing or it false-fails) | resolves the preset-vs-literal ambiguity |
| A5 | **No regression** via the RELIABLE method | **direct page-source-vs-draft comparison** (per memory `landed-verification-direct-page-source-compare`) + `audit-inline-styling.js` re-run — NOT the flagged-unreliable `mockup-parity-validator.js`/`screenshot-diff-helper.js`, NOT the aggregate parity % (over-counts, STOP-49) | names the trustworthy instrument |
| A6 | **Collision guard proven** | DB: container/button box attrs carry `box_family`; the 10 scalar families still `box_family IS NULL` + untouched; the new AST gate rejects a planted name-based merge | proves guard is real + structural |
| A7 | **`:hover` works** (button — the core defect) | computed bg/colour/border of a preset button DIFFERS on `:hover` vs rest, live | proves the Style-Engine-scoped `:hover` path (container can't test this) |
| A8 | **Editor-canvas parity** | the shared BoxControl renders in the Gutenberg editor, writes the object attr, and the editor preview matches the frontend (CLAUDE.md: every property must have an inspector control) | closes the frontend-only blind spot |
| A9 | **4-CORNER radius** (button/hero image) | the 4 corners render correctly incl. an asymmetric case (`10px 0 10px 0`) via the `style.border.radius` object path | proves the corner API (distinct from the 4-side BoxControl) |

Freshness is itself a guard: LiteSpeed + OPcache + anonymous + cache-bust (the stale-cache false-pass hit the D291 session). Any failure = problem found on 2 blocks, not fifty — roll back, diagnose, re-gate.

## Model routing for the build (Bean: use Haiku/Sonnet where beneficial)
Main session = Opus (design judgement, pilot verification, qc-council synthesis, Bean interaction). Subagents (STOP-39: solo coding subagent for shared-file changes, foreground, main-session re-verifies; read-only analysis may run parallel):
| Task | Model | Why |
|---|---|---|
| Seed `box_family`/`box_side` `ATTR_CLASSIFICATION_OVERRIDES` rows (enumeration is done; write the per-attr entries) | **Haiku** | mechanical, well-scoped from the finished family list |
| Per-block render.php `style="…"` → scoped conversions AFTER the pattern is proven | **Haiku** (one solo agent at a time) | repetitive, pattern-following |
| Run `audit-inline-styling.js` + per-section visual diffs | **Haiku** | mechanical execution + reporting |
| Converter cross-declaration accumulator (4 side-Decls → 1 object write) — the hard seam | **Sonnet** (solo) | architectural, correctness-critical |
| Shared-helper Style-Engine flip (`SGS_Container_Wrapper` + typography/responsive helpers) | **Sonnet** (solo) | shared-mechanism, high blast radius |
| Shared responsive **BoxControl** editor component + render.php/helper object reads | **Sonnet** (solo) | coupled JS+PHP, editor-parity critical |
| Spec 31/32 edits + the pilot build & live verification | **Sonnet** (solo) / Opus (verify) | load-bearing docs + LANDED judgement |
| Spec/quality review of each build (per `/subagent-driven-development`) | **Sonnet** | independent review |

## Box-object schema merge (Bean, 2026-07-09 — bundled into the same schema change)

> **Scope note (Bean reminder 2026-07-09):** this box-object merge is a SUBSET of the overall job. The primary deliverable remains **no inline styling across ALL 5 WP styling-support groups** (`color`, `spacing`, `__experimentalBorder`, `typography`, `shadow`) PLUS the block-private render.php `style="…"` sites — handled by the Style-Engine-scoped mechanism above. The box-object merge only reshapes the per-side/per-corner spacing+border attrs within `spacing`+`border`; colour, typography, shadow, and the non-box props (max-width, min-height, gap, background, etc.) are covered by the main mechanism, not this merge. Do not let the box-family sub-thread narrow the plan.

**Decision:** merge every genuine 4-side per-side attr family into a single **named object** `{top,right,bottom,left}` (WP's `BoxControlValue` shape, verified in Gutenberg docs), driven by WP's native **`BoxControl`** editor component (linked/unlinked, per-side units, native spacing-preset support). NOT a positional array + index-map DB table — WP uses named keys, so no mapping table is needed. This is the standard, user-friendly shape and it lands in the same central places as the no-inline fix (shared BoxControl control + `helpers-responsive.php` + the converter tier emission).

Universal scan of ALL 74 blocks (`scratchpad` enumeration) classifies every per-side/per-corner family:

### MERGE to a `{top,right,bottom,left}` object (8 families — all genuine 4-side box props)
| Family | Blocks | Destination shape |
|---|---|---|
| `padding{side}` (root) | 9 | **base → WP-native `style.spacing.padding` object** (already the converter's output; Style-Engine-scoped). Tiers → SGS `paddingTablet`/`paddingMobile` objects. |
| `margin{side}` (root) | 8 | same as padding (`style.spacing.margin` base + tier objects) |
| `borderWidth{side}` (root) | 4 (button/heading/quote/text) | SGS object `borderWidth:{...}` (colour/style stay single — no per-side colour/style family exists). Optionally WP-native `style.border.{side}.width` split-border. |
| `contentBandPadding{side}` | 4 | SGS custom object `{...}` + tiers (per-band, not root → SGS attr, not `style.spacing`) + BoxControl |
| `contentPadding{side}` | 1 (hero) | SGS custom object + tiers + BoxControl |
| `mediaPadding{side}` | 1 (hero) | SGS custom object + tiers + BoxControl |
| `imagePadding{side}` | 1 (hero) | SGS custom object + tiers + BoxControl |
| `imageBorderWidth{side}` | 1 (hero) | SGS custom object + BoxControl |

Two destination classes: **root padding/margin → WP-native `style.spacing.*` object** (fully standard, editor gets the native spacing panel); **per-area/per-element families → SGS custom `{top,right,bottom,left}` attr** using the same WP `BoxControl` component (identical UI, stored as an SGS attr because they're not the block root's spacing). Both serialise scoped via the no-inline mechanism.

### ALSO merge — 4-CORNER border-radius families (2 families, 6 blocks — corrected 2026-07-09; the earlier "no corner families" was WRONG, missed because these use abbreviated corner tokens `TL/TR/BL/BR`)
| Family | Blocks | Destination shape |
|---|---|---|
| `borderRadius{TL,TR,BL,BR}` (root) | 5 (button, heading, media, quote, text) | **WP-native `style.border.radius` object** `{topLeft,topRight,bottomLeft,bottomRight}` (base) + tier objects; WP `__experimentalBorderRadiusControl` / BoxControl corner mode |
| `imageBorderRadius{TL,TR,BL,BR}` | 1 (hero) | SGS custom corner object `{topLeft,…}` + corner control |
Note: `sgs/button` and `sgs/heading`/`text`/`quote` do their **border via CUSTOM attrs** (`supports.__experimentalBorder` is NULL on button) — a DIFFERENT routing path than container's WP border support. This is exactly why the collision guard is keyed on the DB `box_family` value (+ the AST gate) rather than any routing-path argument (see the Collision verdict below).

### KEEP scalar — cannot/should-not be objects (10 families, with reasons)
| Family | Blocks | Why NOT an object |
|---|---|---|
| `attributionMarginTop` | quote | Single side only — a 4-side BoxControl would show 3 dead controls. |
| `headlineMarginBottom` | hero | Single side (below headline). Same reason. |
| `subHeadlineMarginBottom` | hero | Single side. Same reason. |
| `labelMarginBottom` | option-picker | Single side. Same reason. |
| `quoteMarginBottom` | testimonial | Single side. Same reason. |
| `shapeDivider{Top,Bottom}` + `…Colour/Flip/Height/Invert` | container/cta-section/hero/trust-bar | **Not a box property.** Top and bottom dividers are two independent decorative SVG slots, each with its own sub-settings. `{top,right,bottom,left}` is semantically wrong (no left/right divider; each divider has multiple properties). Keep the named-slot structure. |

**Migration touch-points (central, not per-block):** one shared responsive BoxControl editor component (reused everywhere), `helpers-responsive.php` reads `paddingTablet.top` instead of `paddingTopTablet` (one helper), the converter tier emission builds the object instead of 8 flat names (one site), DB reseed. No-deprecations policy (D270) → existing clones re-cloned. Collapses ~8 flat tier attrs per family → 2 object attrs.

## Pipeline routing + DB + spec change plan (verified against the live scripts, 2026-07-09)

### Alignment check first (Bean's "confirm the scripts align before assuming")
- **Spec says declarative, scripts actually name-build (from a CLOSED vocabulary).** Spec 31 §3.A step 2 claims routing is *"NOT prefix string-concat"*, but the live engine DOES build the attr name by concatenation — `root_supports.py:423-428/459-500` builds `paddingTopTablet` from `(prop, side, bp)`; `db_lookup.attr_for_layer_property` (:2970-3010) concatenates a **closed 3-prefix vocabulary** (`''` OUTER / `content` / `gridItem`) + a `property_suffixes.suffix`, then only DB-*existence*-checks the result. So "declarative" is aspirational — the `css_property`/`css_layer` declarative columns are **100% NULL** (never seeded). The spec overstates; reconcile it.
- **Good news for the base layer:** the base tier already writes WP's object shape `style.spacing.padding.{top,right,bottom,left}` (`_root_lift_rules` → `_set_in`). So base is already where we want it — only the responsive TIERS are flat per-side names.

### Collision verdict (your key concern): the guard is the DB `box_family` column + a STRUCTURAL AST gate (qc-council-corrected: "by construction" was overstated — it's convention MADE structural by a build gate)
- **The safety** is: the object-merge/migration fires ONLY on attrs that carry a DB `box_family` value; the 10 scalar families get no `box_family` → excluded. **Honest caveat (qc-council Claim 2): a DB column is not self-enforcing** — it only holds if every merge/migration code site actually queries `box_family`. So the guard is made STRUCTURAL by a static AST gate (same shape as the existing cheat-gate scanner) that FAILS the build if any per-side/per-corner grouping or migration operation runs without a `box_family` check in its call path, PLUS a plant-test (assert the 10 scalars are untouched). Without that gate it would be mere convention. **Do not rely on the routing-path argument below as the safety** — it only covers the paths we traced.
- (Observation, path-specific, NOT the guarantee) The two traced box paths happen to be safe already: the layer resolver uses a closed 3-prefix vocab (`''`/`content`/`gridItem`) that can't build element-prefixed names; and the 10 scalar families are currently UNROUTED (the 5 element-margins are `role='layout'`, excluded by both element-lift resolvers; shapeDivider has zero converter references). But **button/heading/quote/text route their border via CUSTOM attrs on a different path** — so the closed-vocab argument does NOT cover every block. The `box_family` guard does.
- **Biggest concrete risk = the one-off migration/seed script** doing a blanket `.*Top$|.*Bottom$|.*TL$` rename across all blocks. It MUST filter on `box_family` (seed-then-migrate), never a name regex. Plant-test: assert the 5 element-margins + shapeDivider + any non-`box_family` attr are untouched.

### DB change — the categorisation guard (Option A, via the sanctioned channel)
- Add two columns to `block_attributes` via `ATTR_CLASSIFICATION_OVERRIDES` in `sgs-update-v2.py` (cited-reason, per-`(block,attr)`, final-writer, reseed-durable, auto-`ALTER TABLE`, STOP-24-compliant — no manual SQL):
  - **`box_family`** (TEXT) — the object family this attr merges into. 4-side: `padding`, `margin`, `borderWidth`, `contentPadding`, `mediaPadding`, `contentBandPadding`, `imagePadding`, `imageBorderWidth`. 4-corner: `borderRadius`, `imageBorderRadius`. **NULL = not a box family**.
  - **`box_side`** (TEXT) — `top|right|bottom|left` for side families; `topLeft|topRight|bottomRight|bottomLeft` for corner families.
- **Seed ONLY the 10 box families' side/corner attrs** (8 four-side + 2 four-corner, across the blocks enumerated). The 10 scalar families get **no row → `box_family` NULL → excluded from the merge BY CONSTRUCTION.** That is the guard, DB-driven not name-parsed (satisfies D258).
- Merged object attrs become `attr_type='object'` — disambiguate from the existing 45 media/background objects via `box_family`/`role`, never `attr_type` alone.

### Spec adaptations (exact targets)
- **Spec 31 §2.9 Axis-1 table (L1/L4 rows, ~171-205):** add a "box-property shape" note — padding/margin/border-width → named object; max-width/min-height/background/radius → scalar.
- **Spec 31 §4 DB-column map (~266-288):** document the new `box_family`/`box_side` columns as the box-merge categorisation source.
- **Spec 31 §3.A (~243-262):** add step **3b — object-shape routing** (accumulate the 4 side-Decls of a `box_family` into ONE object write) + the **migration-safety discriminator** (a merge candidate MUST round-trip through `attr_for_layer_property`'s closed-vocab generator; exclude `role='layout'`+element-selector and shapeDivider). Also correct the "NOT string-concat" overstatement.
- **Spec 31 §13.4:** add the FR for box-object routing + the reseed-durable categorisation.
- **Spec 32:** add **§6.1 Geometry token families** + **FR-32-10** (per-side object extraction from the draft `padding:12px 18px` → `{top,right,bottom,left}`; BoxControl consumption; per-instance override via a scoped CSS-var value).

### Converter/editor change sites (8, all verified — the engineering seam is the accumulator)
1-2. `root_supports.py:423-428` + `:459-500` — emit `paddingTablet:{...}` object instead of flat `paddingTopTablet`, gated on `box_family`.
3. `root_supports.py:145-166` (`_set_in`) — already object-shaped; reuse for the tier object.
4. `db_lookup.py:2970-3010` (`attr_for_layer_property`) — add an object-attr branch.
5-6. `resolvers/outer_box.py:172-286` + `content_band.py:71-146` — **THE key change**: `Decl`/`Write` are strictly per-declaration (1 side → 1 write); an object destination needs a **cross-declaration accumulator** (4 side-Decls → 1 object write) or a post-pass merge.
7. `services/fold_helpers.py:138-185` (`_expand_box_shorthand`) — the shorthand-expansion seam that must re-aggregate for an object destination.
8. `services/css_pass.py:130-159` — the STOP-43 consumed-partition keys off per-property names; the object path must still mark all 4 sides consumed per tier.
Plus the block side: one shared responsive **BoxControl** editor component; `helpers-responsive.php` reads `paddingTablet.top` from the object; render.php reads the object; no-deprecations (D270) → existing clones re-cloned.

## Decisions — ALL APPROVED by Bean 2026-07-09
1. ✅ **Mechanism** — Style-Engine-scoped in shared helpers, keep supports.
2. ✅ **Box-object schema merge** — named object + WP BoxControl for the 10 four-side/four-corner families; the 10 scalar/shapeDivider families stay scalar.
3. ✅ **DB categorisation guard** — `box_family`/`box_side` via `ATTR_CLASSIFICATION_OVERRIDES`; absence = scalar; migration filters on `box_family`, never a name-regex.
4. ✅ **Rollout** — pilot container first; once it's a proven success (Pilot Acceptance Test passes), go FULL universal rollout completely (Bean's directive), not incremental.
Build status: NOT started — next session executes the pilot. No deprecations (D270).
3. Then I reconcile the specs/docs (Spec 31 §2/§13.4, Spec 32, CLAUDE.md, architecture.md, sgs-wp-engine skill) to the approved design, and we scope the first build session.
